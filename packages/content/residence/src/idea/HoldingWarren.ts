/**
 * HoldingWarren — **what ONE person holds**, and the holding as a warren
 * one level down
 * (residences D16): a keyed instance of ONE programme row per holding,
 * whose members are the holding's rooms and which owns every
 * holding-level concern — the floorplan mint, intra-holding wiring +
 * the locked front-door edge, dormancy AS A UNIT (the holding sleeps
 * and wakes whole, never room-by-room), the shell condition +
 * weathering clock (D4/P10), the tenure term (D5), the archetype
 * aggregation point (D15), and lease revert.
 *
 * Identity is the keyed model: the programme row is authored content
 * (`class: /residence/idea/HoldingWarren`), each holding gets a
 * keyed instance `(scope = the row, key = the holding's parcel
 * extent)`; each room is a keyed instance of a REAL room row
 * `(scope = the room row, key = <extent>/<leaf>)` — `templatePath`
 * always resolves to a row (D17), per-holding uniqueness carried by
 * the persistence spine's unique-key guard.
 *
 * The member contract stays **open to runtime-added members** (the
 * cross-build interface with farming's break-ground act): the
 * floorplan is the *initial* mint, never the closed set — `wake()`
 * stands up the floorplan rooms AND re-admits any extra keyed rooms
 * whose records already ride the holding's extent.
 */

import { type Attachment } from '@saxonberg/server/mud/lib/location/Warren';
// A holding's members are ROOMS, so it is an INNER warren — the tier
// whose occupancy is who is standing in a member. Its institution (a
// dorm, a building, a plat) is the OUTER one, whose members are
// holdings like this. `Warren` declares `occupantsOf` abstract so the
// tier is chosen explicitly, by which base you extend.
import { InnerWarren } from '@saxonberg/server/mud/lib/location/InnerWarren';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

type MemberStuff = Stuff & Container;

/** One floorplan room spec (authored on the programme row). */
export interface FloorplanRoom {
  /** The room's leaf under the holding extent; ABSENT for the
   *  degenerate one-room holding (the dorm) — its key IS the extent. */
  leaf?: string;
  /** The room ROW the keyed instance clones from (D17: a real row). */
  room: string;
  /** The mover lands here (the FrontDoorExit's destination). */
  entry?: boolean;
}

/** One intra-holding edge (authored on the programme row). */
export interface FloorplanExit {
  /** Room leafs ('' / absent leaf rooms use the empty string). */
  from: string;
  to: string;
  direction: string;
  /** The far side's direction back (else the compass inverse). */
  opposite?: string;
  /** A LOCKED edge — traversal presents a key against the holding's
   *  keyway (the dorm-door model; the hall behind the yard). */
  locked?: boolean;
}

/** The closed-today, open-by-construction upkeep-term vocabulary (D5). */
export const UPKEEP_TERMS = [
  'institution-all',
  'landlord-shell',
  'owner-all',
] as const;

/** The five condition bands — banded prose, no gauge (P10). */
const CONDITION_BANDS: Array<[number, string]> = [
  [0.9, 'sound'],
  [0.7, 'weathered'],
  [0.5, 'worn'],
  [0.25, 'shabby'],
  [0, 'dilapidated'],
];

const GAME_DAY_SECONDS = 86_400;

const ProgrammeBase = PersistableMixin(
  WarrenMemberMixin(
    PostRegistrationMixin(ContainerMixin(InnerWarren)),
  ),
);

export default class HoldingWarren extends ProgrammeBase {
  static fieldMeta: FieldMeta = {
    floorplan: { persistent: true, authorable: true },
    upkeepTerm: { persistent: true, authorable: true },
    addressBase: { persistent: true, authorable: true },
    shellCondition: { persistent: true },
    shellStamp: { persistent: true },
  };

  /** The authored floorplan — the INITIAL mint (D16). */
  public floorplan: Array<Record<string, unknown>> = [];

  /** Who owes the shell (D5): `institution-all` / `landlord-shell` /
   *  `owner-all` — a validated string vocabulary, open to future
   *  values (`hoa-shell`) without mechanism. */
  public upkeepTerm: string = 'owner-all';

  /** The address stem rooms stamp (`<addressBase>/<leaf>`); empty
   *  derives from the holding key's tail. */
  public addressBase: string = '';

  /** Shell condition, 0..1 (D4) — persistent, reconciled on read. */
  public shellCondition: number = 1;

  /** Game-time stamp (seconds) of the last shell reconcile. */
  public shellStamp: number = 0;

  /** Live rooms by full key (`<extent>` or `<extent>/<leaf>`). */
  private _roomsByKey: Map<string, MemberStuff> = new Map();
  /** The holding's keyway (sync lock identity), refreshed at wake. */
  private _keyway: string = '';

  // ── authored-field surface ──────────────────────────────────────

  public getUpkeepTerm(): string {
    return this.upkeepTerm;
  }

  public setUpkeepTerm(value: string): void {
    if (typeof value !== 'string' || !/^[a-z][a-z-]*$/.test(value)) {
      throw new Error(
        `HoldingWarren: upkeepTerm '${String(value)}' is not a ` +
          `kebab-case term (shipped: ${UPKEEP_TERMS.join(', ')})`,
      );
    }
    this.upkeepTerm = value;
  }

  public getFloorplan(): FloorplanRoom[] {
    return (this.floorplan ?? []).map((r) => ({
      leaf: typeof r.leaf === 'string' ? r.leaf : undefined,
      room: String(r.room ?? ''),
      entry: r.entry === true,
    }));
  }

  public setFloorplan(value: Array<Record<string, unknown>>): void {
    this.floorplan = Array.isArray(value) ? value : [];
  }

  /** The authored intra-holding edges (parsed off the raw specs). */
  public getFloorplanExits(): FloorplanExit[] {
    const out: FloorplanExit[] = [];
    for (const r of this.floorplan ?? []) {
      const exits = (r as Record<string, unknown>).exits;
      if (!Array.isArray(exits)) continue;
      for (const e of exits) {
        const o = e as Record<string, unknown>;
        out.push({
          from: typeof r.leaf === 'string' ? (r.leaf as string) : '',
          to: String(o.to ?? ''),
          direction: String(o.direction ?? ''),
          opposite:
            typeof o.opposite === 'string' ? (o.opposite as string) : undefined,
          locked: o.locked === true,
        });
      }
    }
    return out;
  }

  public getAddressBase(): string {
    return this.addressBase;
  }

  public setAddressBase(value: string): void {
    this.addressBase = value;
  }

  /**
   * The entry room's ROW for a programme row — the eager face a
   * FrontDoorExit / LotGateExit carries (D17: a real row). Shared by
   * every institution that hangs doors on this programme.
   */
  public static async entryRowOf(programmePath: string): Promise<string> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const floorplan = (
      row?.data as { floorplan?: Array<Record<string, unknown>> }
    )?.floorplan;
    const entry = floorplan?.find((r) => r.entry === true) ?? floorplan?.[0];
    return String(entry?.room ?? programmePath);
  }

  /** The floorplan LEAFS of a programme row (for revert bookkeeping
   *  without waking the holding). */
  public static async floorplanLeafsOf(
    programmePath: string,
  ): Promise<Array<string | undefined>> {
    const { Template } = await import(
      '@saxonberg/server/mud/lib/stuff/Template'
    );
    const row = await Template.findByPath(programmePath);
    const floorplan = (
      row?.data as { floorplan?: Array<Record<string, unknown>> }
    )?.floorplan;
    return (floorplan ?? []).map((r) =>
      typeof r.leaf === 'string' ? (r.leaf as string) : undefined,
    );
  }

  // ── identity ────────────────────────────────────────────────────

  /** The holding's parcel extent — the programme's persistence key. */
  public holdingKey(): string | null {
    return (this as unknown as Persistable).getPersistenceKey();
  }

  /** The full room key for a floorplan leaf ('' = the extent itself). */
  public roomKeyOf(leaf: string | undefined): string | null {
    const extent = this.holdingKey();
    if (!extent) return null;
    return leaf ? `${extent}/${leaf}` : extent;
  }

  // ── wake / membership ───────────────────────────────────────────

  /**
   * Stand the whole holding up: every floorplan room keyed
   * `(roomRow, <extent>[/leaf])` via the spine's restore-or-seed,
   * intra-holding exits wired, per-room addresses stamped, the keyway
   * cache refreshed. Idempotent per room (live rooms are reused).
   */
  public async wake(): Promise<void> {
    await this.refreshKeyway();
    const rooms = this.getFloorplan();
    for (const spec of rooms) {
      await this.wakeRoom(spec);
    }
    for (const edge of this.getFloorplanExits()) {
      await this.wireEdge(edge);
    }
  }

  private async wakeRoom(spec: FloorplanRoom): Promise<MemberStuff | null> {
    const key = this.roomKeyOf(spec.leaf);
    if (!key || !spec.room) return null;
    const cached = this._roomsByKey.get(key);
    if (cached && !cached.isDestroyed()) return cached;
    const room = await StuffApi.clone<MemberStuff>(spec.room);
    this.addMember(room);
    await PersistableApi.restoreOrSeed(room, key);
    this._roomsByKey.set(key, room);
    // The room's address: `<addressBase or derived>/<leaf>` — the
    // Locality address is the human per-place identity (D16).
    if (MixinApi.isAddressable(room)) {
      const base = this.addressBase || this.derivedAddressBase();
      if (base) room.setAddress(spec.leaf ? `${base}/${spec.leaf}` : base);
    }
    return room;
  }

  private derivedAddressBase(): string {
    const extent = this.holdingKey();
    if (!extent) return '';
    // `/world/terminus/hinkley-hills/lots/lot-7` → `terminus/hinkley-hills/lot-7`
    const parts = extent.split('/').filter(Boolean);
    if (parts[0] === 'world') parts.shift();
    return parts.filter((p) => p !== 'lots' && p !== 'units').join('/');
  }

  private async wireEdge(edge: FloorplanExit): Promise<void> {
    const from = this.roomForLeaf(edge.from);
    const to = this.roomForLeaf(edge.to);
    if (!from || !to || !edge.direction) return;
    if (!MixinApi.isExitable(from) || !MixinApi.isExitable(to)) return;
    if (from.getExit(edge.direction)) return;
    const { default: KeyedDoorExit } = await import('./KeyedDoorExit');
    if (edge.locked) {
      // The locked edge — keyway-gated INWARD (the dorm-door model);
      // the way back OUT is free (a guest let in is never trapped, and
      // leaving your own house needs no key).
      const doorIn = StuffApi.createSync(
        () =>
          new KeyedDoorExit(from, to, edge.direction, this, {
            oneWay: true,
          }),
      );
      await from.addExit(doorIn);
      const back = edge.opposite ?? 'out';
      if (!to.getExit(back)) {
        const { default: Exit } = await import(
          '@saxonberg/server/mud/lib/boundary/Exit'
        );
        const doorOut = StuffApi.createSync(
          () =>
            new Exit({
              direction: back,
              source: to,
              destination: from as never,
              keepLiveDestination: true,
              oneWay: true,
            }),
        );
        await to.addExit(doorOut);
      }
      return;
    }
    await from.addBidirectionalExit(to, edge.direction, {
      opposite: edge.opposite,
      keepLiveDestination: true,
    });
  }

  /** The live room for a floorplan leaf, or null. */
  public roomForLeaf(leaf: string | undefined): MemberStuff | null {
    const key = this.roomKeyOf(leaf || undefined);
    return key ? this.roomForKey(key) : null;
  }

  /** The live room for a full key, or null. */
  public roomForKey(key: string): MemberStuff | null {
    const room = this._roomsByKey.get(key);
    if (!room) return null;
    if (room.isDestroyed()) {
      this._roomsByKey.delete(key);
      return null;
    }
    return room;
  }

  /** The mover's landing room — the floorplan `entry`, else the first
   *  room, else null. The FrontDoorExit + the institution's `admit`
   *  land here. */
  public entryRoom(): MemberStuff | null {
    const rooms = this.getFloorplan();
    const entry = rooms.find((r) => r.entry) ?? rooms[0];
    if (!entry) return null;
    return this.roomForLeaf(entry.leaf);
  }

  // ── the keyway (the front door's sync lock identity) ────────────

  public async refreshKeyway(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    const record = await ParcelApi.coveringParcelOf(extent);
    this._keyway =
      record && record.getExtent() === extent ? record.getKeyway() : '';
  }

  /** The holding's keyway ('' = no key opens; the institution's own
   *  cache is the other reader). */
  public keyway(): string {
    return this._keyway;
  }

  // ── dormancy as a unit (D16) ────────────────────────────────────

  /**
   * The whole-holding capture: every live room's record (keyed), then
   * the programme's own (shell state). The partial-reap alternative is
   * structurally impossible — rooms only ever tear down through
   * `teardown()`, which the institution reaches by destructing the
   * programme whole.
   */
  public async captureAll(): Promise<void> {
    for (const [key, room] of this._roomsByKey) {
      if (room.isDestroyed()) continue;
      if (MixinApi.isPersistable(room)) {
        await PersistableApi.capture(room, key);
      }
    }
    const extent = this.holdingKey();
    if (extent) await PersistableApi.capture(this as unknown as Stuff, extent);
  }

  /**
   * Population-reactive reconcile: the programme NEVER reaps a room on
   * its own — the holding sleeps whole or not at all. All it does is
   * relay the aggregate population change to the owning institution,
   * whose reconcile captures-whole + tears the holding down.
   */
  protected async reconcile(): Promise<void> {
    const institution = this.getWarren() as unknown as {
      notifyPopulationChange(room: MemberStuff): void;
    } | null;
    if (institution) {
      institution.notifyPopulationChange(this as unknown as MemberStuff);
    }
  }

  /**
   * Teardown: the rooms follow the programme (whole-holding, D16).
   * When the programme is marked for revert (end-lease) or has been
   * captured for dormancy, the rooms skip their destruct-time capture
   * backstop.
   */
  public override teardown(): void {
    const revert = !(this as unknown as Persistable).shouldPersist();
    for (const room of this._roomsByKey.values()) {
      if (room.isDestroyed()) continue;
      if (revert && MixinApi.isPersistable(room)) {
        (room as unknown as Persistable).markForRevert();
      }
    }
    super.teardown(); // destructs every member room
    this._roomsByKey.clear();
  }

  /**
   * Destruct witness: the rooms follow the programme whatever path
   * destructs it (the institution's teardownHolding calls `teardown()`
   * explicitly first — this is the belt for every other path; a second
   * call walks empty maps).
   *
   * @hook
   */
  public override onDestruct(): void {
    this.teardown();
    super.onDestruct();
  }

  /**
   * End-lease revert (D16): delete every room record + the programme's
   * own under the extent prefix, mark everything for revert, and tear
   * down. The caller (unlease) evicts owned chattel to storage FIRST.
   */
  public async revert(): Promise<void> {
    (this as unknown as Persistable).markForRevert();
    const extent = this.holdingKey();
    if (extent) {
      for (const key of [...this._roomsByKey.keys()]) {
        await PersistableApi.deleteAllFor(key);
      }
      await PersistableApi.deleteAllFor(extent);
    }
    this.teardown();
  }

  // ── shell condition + the weathering clock (D4/P10) ─────────────

  /**
   * Reconcile the shell's weathering: a linear slope on GAME time,
   * rate from the `residence.weather.daysToWorn` setting (game-days
   * from sound to worn — HALF the condition scale, so full decay takes
   * twice that). Stamp-forward; no scheduler; honest across restarts
   * because the stamp is persistent state.
   */
  public reconcileShell(): number {
    const now = WorldClockApi.getNow().rawValue();
    if (this.shellStamp <= 0) {
      this.shellStamp = now;
      return this.shellCondition;
    }
    const elapsed = now - this.shellStamp;
    if (elapsed <= 0) return this.shellCondition;
    const daysToWorn = this.settingNumber('residence.weather.daysToWorn', 45);
    const perSecond = 0.5 / (daysToWorn * GAME_DAY_SECONDS);
    this.shellCondition = Math.max(
      0,
      this.shellCondition - elapsed * perSecond,
    );
    this.shellStamp = now;
    return this.shellCondition;
  }

  /** The banded, no-gauge read (P10): sound / weathered / worn /
   *  shabby / dilapidated. Reconciles first. */
  public conditionBand(): string {
    const c = this.reconcileShell();
    for (const [floor, band] of CONDITION_BANDS) {
      if (c >= floor) return band;
    }
    return 'dilapidated';
  }

  /** The legible cause line for a declined shell. */
  public conditionCause(): string | null {
    const c = this.shellCondition;
    if (c >= 0.9) return null;
    if (c >= 0.5) {
      return 'The paint is going; weather is starting to find the seams.';
    }
    return 'The paint has gone; rain has gotten into the sills.';
  }

  /** The maintenance act's restore (P10): back to sound, stamped now. */
  public restoreShell(): void {
    this.shellCondition = 1;
    this.shellStamp = WorldClockApi.getNow().rawValue();
  }

  private settingNumber(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* cold cache — fallback */
    }
    return fallback;
  }

  // ── Warren policy hooks ─────────────────────────────────────────

  protected async createMember(): Promise<MemberStuff> {
    throw new Error('HoldingWarren mints rooms via wake(), never buds');
  }

  public async admitArrival(): Promise<void> {
    /* holdings don't population-bud */
  }

  protected attachmentFor(): Attachment {
    return { direction: 'out' };
  }

  protected async wireHostFixtures(): Promise<void> {
    /* the entry room is authored by the floorplan, not a host */
  }

  protected async unwireHostFixtures(): Promise<void> {
    /* no-op */
  }
}
