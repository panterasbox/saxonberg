/**
 * FloorplanWarren — **a set of rooms authored as one plan, stood up and
 * put to sleep whole, with one fabric that weathers** (harbors P1, the
 * lift holding.md promised when the second consumer arrived).
 *
 * The residence ladder's `HoldingWarren` was the first body of this: a
 * keyed instance of ONE floorplan row per holding, whose members are the
 * holding's rooms. A ship is the second — her deck, cabin and hold are a
 * floorplan exactly as a house's hall and kitchen are, she sleeps whole
 * exactly as a house does, and her hull weathers on the same clock as a
 * house's shell (the owner: *"whatever the rule, it works the same way
 * as residences"*). So what both need lives here, and what only a house
 * needs stays in the residence pack:
 *
 *  - **here** — the floorplan (the INITIAL mint, never the closed set),
 *    keyed rooms `(scope = the room row, key = <key>/<leaf>)`, wiring the
 *    intra-plan edges, `layOut` (the plan's own frame), the whole-warren
 *    `captureAll` / `teardown` / `revert`, the shell clock, its five
 *    bands, `restoreShell`, and the `upkeepTerm` vocabulary;
 *  - **the subclass** — what the key MEANS (a parcel extent, a ship's
 *    durable key), who is told when the population changes
 *    (`reconcile`), how a LOCKED edge is gated (`wireLockedEdge`), what a
 *    woken room is stamped with (`onRoomWoken`), and the words the
 *    fabric is described in (`upkeepWords`).
 *
 * Identity is the keyed model (D17): every member's `templatePath`
 * resolves to a real row; per-instance uniqueness rides the persistence
 * spine's `(scope, key)` record. Nothing here mints a row.
 *
 * ⚠ The weathering rate reads `residence.weather.daysToWorn` (45 game-days
 * from sound to worn when the setting is absent). The key keeps its
 * residence name because the requirements fix *"the same rate — the
 * residence setting"*; renaming it is a deliberate later sweep.
 */

import { type Attachment } from './Warren';
import { RoomWarren } from './RoomWarren';
import { PersistableMixin } from '../persistence/Persistable';
import { WarrenMemberMixin } from './WarrenMember';
import { ContainerMixin } from '../spatial/Container';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import { PersistableApi } from '../../api/persistable';
import { WorldClockApi } from '../../api/worldclock';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Persistable } from '../persistence/Persistable';
import type { FieldMeta } from '../mixin';

type MemberStuff = Stuff & Container;

/** One floorplan room spec (authored on the floorplan row). */
export interface FloorplanRoom {
  /** The room's leaf under the warren's key; ABSENT for the degenerate
   *  one-room plan (the dorm) — its key IS the warren's key. */
  leaf?: string;
  /** The room ROW the keyed instance clones from (D17: a real row). */
  room: string;
  /** The mover lands here (the way in's destination). */
  entry?: boolean;
}

/** One intra-plan edge (authored on the floorplan row). */
export interface FloorplanExit {
  /** Room leafs ('' / absent leaf rooms use the empty string). */
  from: string;
  to: string;
  direction: string;
  /** The far side's direction back (else the compass inverse). */
  opposite?: string;
  /** A LOCKED edge — the subclass decides what opens it
   *  ({@link FloorplanWarren.wireLockedEdge}). */
  locked?: boolean;
}

/**
 * The words a fabric is described in — a house's paint and sills, a
 * ship's seams and pitch. Every sentence the shell clock and the upkeep
 * act speak comes from here, so one mechanism tells two fictions.
 */
export interface UpkeepWords {
  /** The cause line for a fabric starting to go (weathered / worn). */
  declining: string;
  /** The cause line for a fabric that has gone (shabby / dilapidated). */
  failed: string;
  /** The kit you would need, with its article ("a householder's kit"). */
  kit: string;
  /** The work, second person, before *"It was <band>; it is sound
   *  again."* — "You work the place over — …". */
  work: string;
  /** The witnessed work, after the actor's name — "works over the
   *  fabric of the place with a householder's kit." */
  witnessed: string;
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

/** The shipped weathering default — game-days from sound to worn. */
const DEFAULT_DAYS_TO_WORN = 45;

const FloorplanBase = PersistableMixin(
  WarrenMemberMixin(ContainerMixin(RoomWarren)),
);

export abstract class FloorplanWarren extends FloorplanBase {
  static fieldMeta: FieldMeta = {
    floorplan: { persistent: true, authorable: true },
    upkeepTerm: { persistent: true, authorable: true },
    shellCondition: { persistent: true },
    shellStamp: { persistent: true },
  };

  /** The authored floorplan — the INITIAL mint (D16). */
  public floorplan: Array<Record<string, unknown>> = [];

  /** Who owes the shell (D5): `institution-all` / `landlord-shell` /
   *  `owner-all` — a validated string vocabulary, open to future
   *  values (`hoa-shell`) without mechanism. */
  public upkeepTerm: string = 'owner-all';

  /** Shell condition, 0..1 (D4) — persistent, reconciled on read. */
  public shellCondition: number = 1;

  /** Game-time stamp (seconds) of the last shell reconcile. */
  public shellStamp: number = 0;

  /** Live rooms by full key (`<key>` or `<key>/<leaf>`). */
  private _roomsByKey: Map<string, MemberStuff> = new Map();

  // ── authored-field surface ──────────────────────────────────────

  public getUpkeepTerm(): string {
    return this.upkeepTerm;
  }

  public setUpkeepTerm(value: string): void {
    if (typeof value !== 'string' || !/^[a-z][a-z-]*$/.test(value)) {
      throw new Error(
        `${this.constructor.name}: upkeepTerm '${String(value)}' is not a ` +
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

  /** The authored intra-plan edges (parsed off the raw specs). */
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

  /** The raw floorplan entry for a leaf — authored or admitted. */
  public floorplanEntryOf(leaf: string): Record<string, unknown> | null {
    return (this.floorplan ?? []).find((r) => r.leaf === leaf) ?? null;
  }

  // ── identity ────────────────────────────────────────────────────

  /** The warren's persistence key — every room key is under it. */
  public warrenKey(): string | null {
    return (this as unknown as Persistable).getPersistenceKey();
  }

  /** The full room key for a floorplan leaf ('' = the key itself). */
  public roomKeyOf(leaf: string | undefined): string | null {
    const key = this.warrenKey();
    if (!key) return null;
    return leaf ? `${key}/${leaf}` : key;
  }

  // ── wake / membership ───────────────────────────────────────────

  /**
   * Stand the whole warren up: every floorplan room keyed
   * `(roomRow, <key>[/leaf])` via the spine's restore-or-seed, the
   * intra-plan exits wired, the rooms laid out. Idempotent per room
   * (live rooms are reused).
   */
  public async wake(): Promise<void> {
    for (const spec of this.getFloorplan()) {
      await this.wakeRoom(spec);
    }
    for (const edge of this.getFloorplanExits()) {
      await this.wireEdge(edge);
    }
    this.layOut();
  }

  /** ⭐ A floorplan is a frame of its own — see {@link layOut}. */
  public override laysOutOwnFrame(): boolean {
    return true;
  }

  /**
   * ⭐⭐ **Every place has coordinates — a floorplan's rooms in the
   * WARREN's frame** (the place taxonomy, cleanliness B53).
   *
   * The entry room is the origin, and the floorplan's cardinal exits lay
   * the rest out from it: the Hinkley house's yard (0,0,0), its hall one
   * north at (0,1,0), the kitchen east of the hall at (1,1,0). Nothing is
   * authored that was not already: the exits always said where each room
   * was.
   *
   * A room the cardinal plan does not reach (a field plotted off the yard
   * by NAME, `field-1`) sits in a row beyond, in floorplan order. A cell
   * two edges disagree about keeps its first room; the second is laid
   * out with the unreached. Re-run on every wake and every admitted
   * room — it is derived, never stored on the floorplan.
   */
  public layOut(): void {
    const plan = this.getFloorplan();
    const entry = plan.find((r) => r.entry) ?? plan[0];
    if (!entry) return;
    const leafOf = (l: string | undefined): string => l ?? '';
    const keyOf = (c: readonly number[]): string => c.join(',');
    const cells = new Map<string, [number, number, number]>();
    const taken = new Set<string>();
    const place = (leaf: string, cell: [number, number, number]): void => {
      cells.set(leaf, cell);
      taken.add(keyOf(cell));
    };
    place(leafOf(entry.leaf), [0, 0, 0]);
    const edges = this.getFloorplanExits();
    const queue = [leafOf(entry.leaf)];
    while (queue.length > 0) {
      const from = queue.shift()!;
      const at = cells.get(from)!;
      for (const e of edges) {
        const forward = e.from === from;
        const next = forward ? e.to : e.to === from ? e.from : null;
        const dir = forward ? e.direction : e.opposite;
        if (next === null || cells.has(next) || !dir) continue;
        const off = NavigationApi.directionOffset(dir);
        if (!off) continue;
        const cell: [number, number, number] = [
          at[0] + off[0],
          at[1] + off[1],
          at[2] + off[2],
        ];
        if (taken.has(keyOf(cell))) continue;
        place(next, cell);
        queue.push(next);
      }
    }
    const beyond = Math.max(...[...cells.values()].map((c) => c[1])) + 1;
    let x = 0;
    for (const r of plan) {
      const leaf = leafOf(r.leaf);
      if (cells.has(leaf)) continue;
      while (taken.has(keyOf([x, beyond, 0]))) x += 1;
      place(leaf, [x, beyond, 0]);
    }
    for (const [leaf, cell] of cells) {
      const room = this.roomForLeaf(leaf || undefined);
      if (room && MixinApi.isCartesianCoordinates(room)) {
        room.setCoordinates(cell);
      }
    }
  }

  /** Stand one floorplan room up (reused when live). */
  protected async wakeRoom(spec: FloorplanRoom): Promise<MemberStuff | null> {
    const key = this.roomKeyOf(spec.leaf);
    if (!key || !spec.room) return null;
    const cached = this._roomsByKey.get(key);
    if (cached && !cached.isDestroyed()) return cached;
    // ⭐ The room stands in the zone its WARREN does, resolved from its
    // key rather than its row: a room's size is its zone's cell, and a
    // generic `/stuff/location/room/*` row resolves no zone of its own
    // (B54). Its identity stays the row — the record's scope.
    const room = await StuffApi.clone<MemberStuff>(spec.room, undefined, {
      zoneFrom: key,
    });
    this.addMember(room);
    await PersistableApi.restoreOrSeed(room, key);
    this._roomsByKey.set(key, room);
    this.onRoomWoken(room, spec);
    return room;
  }

  /**
   * A room has just been stood up (restored or seeded). The place to
   * stamp what the warren's key means for it — a house stamps its
   * street address. Default: nothing.
   *
   * @hook
   */
  protected onRoomWoken(_room: MemberStuff, _spec: FloorplanRoom): void {
    /* nothing to stamp */
  }

  /** Wire one intra-plan edge (idempotent — an existing exit stands). */
  protected async wireEdge(edge: FloorplanExit): Promise<void> {
    const from = this.roomForLeaf(edge.from);
    const to = this.roomForLeaf(edge.to);
    if (!from || !to || !edge.direction) return;
    if (!MixinApi.isExitable(from) || !MixinApi.isExitable(to)) return;
    if (from.getExit(edge.direction)) return;
    if (edge.locked) {
      await this.wireLockedEdge(from, to, edge);
      return;
    }
    await from.addBidirectionalExit(to, edge.direction, {
      opposite: edge.opposite,
      keepLiveDestination: true,
    });
  }

  /**
   * Wire a LOCKED edge. What opens it is the subclass's to say — a house
   * gates on its parcel's keyway, a ship on her own. The base has no
   * lock to hang, so a floorplan that authors `locked: true` on a warren
   * that does not answer this is a content error, and it throws rather
   * than wiring an open door.
   *
   * @hook
   */
  protected async wireLockedEdge(
    _from: MemberStuff,
    _to: MemberStuff,
    edge: FloorplanExit,
  ): Promise<void> {
    throw new Error(
      `${this.constructor.name}: the floorplan edge ` +
        `'${edge.from}' → '${edge.to}' (${edge.direction}) is locked, ` +
        `and this warren hangs no lock`,
    );
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
   *  room, else null. */
  public entryRoom(): MemberStuff | null {
    const rooms = this.getFloorplan();
    const entry = rooms.find((r) => r.entry) ?? rooms[0];
    if (!entry) return null;
    return this.roomForLeaf(entry.leaf);
  }

  // ── dormancy as a unit (D16) ────────────────────────────────────

  /**
   * The whole-warren capture: every live room's record (keyed), then the
   * warren's own (shell state). The partial-reap alternative is
   * structurally impossible — rooms only ever tear down through
   * `teardown()`.
   */
  public async captureAll(): Promise<void> {
    for (const [key, room] of this._roomsByKey) {
      if (room.isDestroyed()) continue;
      if (MixinApi.isPersistable(room)) {
        await PersistableApi.capture(room, key);
      }
    }
    const key = this.warrenKey();
    if (key) await PersistableApi.capture(this as unknown as Stuff, key);
  }

  /**
   * Teardown: the rooms follow the warren (whole, D16). When the warren
   * is marked for revert or has been captured for dormancy, the rooms
   * skip their destruct-time capture backstop.
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
   * Destruct witness: the rooms follow the warren whatever path destructs
   * it (a second `teardown()` walks empty maps).
   *
   * @hook
   */
  public override onDestruct(): void {
    this.teardown();
    super.onDestruct();
  }

  /**
   * Revert: delete every room record + the warren's own under its key,
   * mark everything for revert, and tear down. The caller evicts owned
   * chattel FIRST.
   */
  public async revert(): Promise<void> {
    (this as unknown as Persistable).markForRevert();
    const key = this.warrenKey();
    if (key) {
      for (const roomKey of [...this._roomsByKey.keys()]) {
        await PersistableApi.deleteAllFor(roomKey);
      }
      await PersistableApi.deleteAllFor(key);
    }
    this.teardown();
  }

  // ── shell condition + the weathering clock (D4/P10) ─────────────

  /**
   * Reconcile the shell's weathering: a linear slope on GAME time, rate
   * from the `residence.weather.daysToWorn` setting (game-days from
   * sound to worn — HALF the condition scale, so full decay takes twice
   * that). Stamp-forward; no scheduler; honest across restarts because
   * the stamp is persistent state.
   */
  public reconcileShell(): number {
    const now = WorldClockApi.getNow().rawValue();
    if (this.shellStamp <= 0) {
      this.shellStamp = now;
      return this.shellCondition;
    }
    const elapsed = now - this.shellStamp;
    if (elapsed <= 0) return this.shellCondition;
    const daysToWorn = this.settingNumber(
      'residence.weather.daysToWorn',
      DEFAULT_DAYS_TO_WORN,
    );
    const perSecond = 0.5 / (daysToWorn * GAME_DAY_SECONDS);
    this.shellCondition = Math.max(0, this.shellCondition - elapsed * perSecond);
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

  /** The legible cause line for a declined shell, in this warren's
   *  words ({@link upkeepWords}); null while sound. */
  public conditionCause(): string | null {
    const c = this.shellCondition;
    if (c >= 0.9) return null;
    const words = this.upkeepWords();
    return c >= 0.5 ? words.declining : words.failed;
  }

  /** The upkeep act's restore (P10): back to sound, stamped now. */
  public restoreShell(): void {
    this.shellCondition = 1;
    this.shellStamp = WorldClockApi.getNow().rawValue();
  }

  /**
   * The words this fabric is described in. The base speaks plainly of
   * "the fabric"; a house speaks of paint and sills, a ship of seams and
   * pitch.
   *
   * @hook
   */
  public upkeepWords(): UpkeepWords {
    return {
      declining: 'The fabric is starting to go; weather is finding the seams.',
      failed: 'The fabric has gone; the weather is in.',
      kit: 'a kit for the work',
      work: 'You work the fabric over, making good what the weather has been at.',
      witnessed: 'works over the fabric of the place.',
    };
  }

  private settingNumber(key: string, fallback: number): number {
    try {
      const raw = AppApi.setting(key);
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* cold cache or an unregistered key — the shipped default */
    }
    return fallback;
  }

  // ── Warren policy hooks ─────────────────────────────────────────

  protected async createMember(): Promise<MemberStuff> {
    throw new Error(
      `${this.constructor.name} mints rooms from its floorplan, never buds`,
    );
  }

  public async admitArrival(): Promise<void> {
    /* a floorplan doesn't population-bud */
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
