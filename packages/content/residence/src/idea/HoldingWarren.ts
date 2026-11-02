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
 * (`class: /system/residence/idea/HoldingWarren`), each holding gets a
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
import type Exit from '@saxonberg/server/mud/lib/boundary/Exit';
// A holding's members are ROOMS, so it is a `RoomWarren` — the tier
// whose occupancy is who is standing in a member. Its institution (a
// dorm, a building, a plat) is a `CirculationWarren`, whose members are
// holdings like this and which owns the corridors and lanes between them. `Warren` declares `occupantsOf` abstract so the
// tier is chosen explicitly, by which base you extend.
import { RoomWarren } from '@saxonberg/server/mud/lib/location/RoomWarren';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Durable } from '@saxonberg/server/mud/lib/material/Durable';
import type { Faced } from '@saxonberg/server/mud/lib/material/Faced';
import HoldingStructure, { HOLDING_STRUCTURE_ROW } from './HoldingStructure';
import type StructureBase from '@saxonberg/server/mud/lib/structure/Structure';
import type { MirrorAxis } from '@saxonberg/server/mud/lib/location/PlatPlan';

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
  /**
   * ⭐ For open ground (a farm's tract): its share of the holding's OPEN
   * ground — what the buildings leave (tracts build D27). A copy of the
   * layout on a bigger parcel has bigger tracts, in proportion.
   */
  share?: number;
  /**
   * The ground a room's building stands on that no tract covers, in m²
   * (the barn, the yard) — subtracted from the parcel's workable area to
   * give the open ground the shares divide.
   */
  footprintM2?: number;
  /**
   * ⭐ Which BUILDING an enclosed room is part of (paint review): rooms
   * with no key are the main building; a farmstead's barn names `barn`
   * and is a building of its own, with its own coat and condition. Open
   * ground is no building's, whatever it says.
   */
  building?: string;
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

const ProgrammeBase = PersistableMixin(
  WarrenMemberMixin(
    ContainerMixin(RoomWarren),
  ),
);

export default class HoldingWarren extends ProgrammeBase {
  static fieldMeta: FieldMeta = {
    floorplan: { persistent: true, authorable: true },
    upkeepTerm: { persistent: true, authorable: true },
    addressBase: { persistent: true, authorable: true },
    mirrorAxis: { persistent: true },
  };

  /**
   * ⭐ Which way this copy of the layout is MIRRORED, `''` for none
   * (tracts build D31) — set by the institution from the side of the road
   * the lot is on, before the holding wakes. Every floorplan direction is
   * read through it, so a farm on the far side of the lane faces the lane
   * too.
   */
  public mirrorAxis: '' | MirrorAxis = '';

  public getMirrorAxis(): '' | MirrorAxis {
    return this.mirrorAxis;
  }

  public setMirrorAxis(value: '' | MirrorAxis | null): void {
    this.mirrorAxis = value === 'east-west' || value === 'north-south' ? value : '';
  }

  /** The authored floorplan — the INITIAL mint (D16). */
  public floorplan: Array<Record<string, unknown>> = [];

  /** Who owes the shell (D5): `institution-all` / `landlord-shell` /
   *  `owner-all` — a validated string vocabulary, open to future
   *  values (`hoa-shell`) without mechanism. */
  public upkeepTerm: string = 'owner-all';

  /** The address stem rooms stamp (`<addressBase>/<leaf>`); empty
   *  derives from the holding key's tail. */
  public addressBase: string = '';

  /** The holding's minted house, when it has one of its own (paint D6). */
  /** The holding's buildings by name (`''` the main one) — minted at its wake. */
  private _houses: Map<string, HoldingStructure> = new Map();

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
      share: typeof r.share === 'number' ? r.share : undefined,
      footprintM2: typeof r.footprintM2 === 'number' ? r.footprintM2 : undefined,
      building: typeof r.building === 'string' && r.building !== '' ? r.building : undefined,
    }));
  }

  /** A floorplan leaf's share of the open ground, or `null` (not open ground). */
  public shareOf(leaf: string): number | null {
    const spec = this.getFloorplan().find((r) => r.leaf === leaf);
    return spec && typeof spec.share === 'number' && spec.share > 0 ? spec.share : null;
  }

  /**
   * ⭐ **The holding's open ground**, m² (tracts build D27): the parcel's
   * workable area less every floorplan room's footprint — what the tracts'
   * shares divide. `0` on an unmeasured parcel (nobody can say what a
   * third of it is).
   */
  public async openGroundM2(): Promise<number> {
    const extent = this.holdingKey();
    if (!extent) return 0;
    const workable = await ParcelApi.workableAreaOf(extent);
    if (!(workable > 0)) return 0;
    const built = this.getFloorplan().reduce((n, r) => n + (r.footprintM2 ?? 0), 0);
    return Math.max(0, workable - built);
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
        // ⭐ Read through the mirror (D31): a reflected copy's every
        // direction is flipped across the road's axis.
        out.push({
          from: typeof r.leaf === 'string' ? (r.leaf as string) : '',
          to: String(o.to ?? ''),
          direction: mirrored(String(o.direction ?? ''), this.mirrorAxis),
          opposite:
            typeof o.opposite === 'string'
              ? mirrored(o.opposite as string, this.mirrorAxis)
              : undefined,
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
  private static async floorplanLeafsOf(
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
    this.layOut();
    await this.wakeHouses();
  }

  /** ⭐ A holding is a frame of its own — see {@link layOut}. */
  public override laysOutOwnFrame(): boolean {
    return true;
  }

  /**
   * ⭐⭐ **Every place has coordinates — a holding's rooms in the
   * HOLDING's frame** (the place taxonomy, cleanliness B53).
   *
   * The entry room is the origin, and the floorplan's cardinal exits lay
   * the rest out from it: the Hinkley house's yard (0,0,0), its hall one
   * north at (0,1,0), the kitchen east of the hall at (1,1,0). Nothing is
   * authored that was not already: the exits always said where each room
   * was. Not the street's grid — every house of a plat would share one
   * set of cells, and a generic room row resolves no zone at all.
   *
   * A room the cardinal plan does not reach (a field plotted off the yard
   * by NAME, `field-1`) sits in a row beyond the house, in floorplan
   * order. A cell two edges disagree about keeps its first room; the
   * second is laid out with the unreached. Re-run on every wake and every
   * admitted plot — it is derived, never stored on the floorplan.
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
        const cell: [number, number, number] = [at[0] + off[0], at[1] + off[1], at[2] + off[2]];
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
      if (room && MixinApi.isCartesianCoordinates(room)) room.setCoordinates(cell);
    }
  }

  private async wakeRoom(spec: FloorplanRoom): Promise<MemberStuff | null> {
    const key = this.roomKeyOf(spec.leaf);
    if (!key || !spec.room) return null;
    const cached = this._roomsByKey.get(key);
    if (cached && !cached.isDestroyed()) return cached;
    // ⭐ The room stands in the zone its HOLDING does (the Hinkley lots,
    // the dorm's hall), resolved from its key rather than its row: a
    // room's size is its zone's cell, and a generic `/stuff/location/
    // room/*` row resolves no zone of its own (B54). Its identity stays
    // the row — the `(scope, key)` record's scope.
    const room = await StuffApi.clone<MemberStuff>(spec.room, undefined, {
      zoneFrom: key,
    });
    this.addMember(room);
    // ⭐ Only a room that keeps state of its own has a record to restore
    // (persistence is the exception — tracts build review). A plain room
    // — a farmyard — comes up from its row each wake, its `props:` laid
    // down at clone, and keeps nothing.
    if (MixinApi.isPersistable(room)) await PersistableApi.restoreOrSeed(room, key);
    this._roomsByKey.set(key, room);
    // The room's address: `<addressBase or derived>/<leaf>` — the
    // Locality address is the human per-place identity (D16).
    if (MixinApi.isAddressable(room)) {
      const base = this.addressBase || this.derivedAddressBase();
      if (base) room.setAddress(spec.leaf ? `${base}/${spec.leaf}` : base);
    }
    // ⭐ Stood up and restored: a member may now finish itself against
    // its holding — a tract sizes itself from the open ground (D28).
    if (MixinApi.isWarrenMember(room)) await room.onWarrenWake();
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
    const { default: KeyedDoorExitClass } = await import('./KeyedDoorExit');
    void KeyedDoorExitClass; // the class the kind row names
    if (edge.locked) {
      // The locked edge — keyway-gated INWARD (the dorm-door model);
      // the way back OUT is free (a guest let in is never trapped, and
      // leaving your own house needs no key).
      // ⭐ The ROOM installs, from a kind ROW.
      await from.installExit<
        Exit & { configureKeyedDoor(p: HoldingWarren): void }
      >(
        '/system/residence/idea/exits/keyed-door',
        {
          direction: edge.direction,
          source: from,
          destination: to,
          keepLiveDestination: true,
          oneWay: true,
        },
        (e) => e.configureKeyedDoor(this),
      );
      const back = edge.opposite ?? 'out';
      if (!to.getExit(back)) {
        await to.installExit('/platform/idea/exits/passage', {
          direction: back,
          source: to,
          destination: from as never,
          keepLiveDestination: true,
          oneWay: true,
        });
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
    if (extent) {
      for (const [name, house] of this._houses) {
        if (house.isDestroyed()) continue;
        await PersistableApi.capture(house as unknown as Stuff, this.houseKeyOf(extent, name));
      }
    }
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
    const houses = [...this._houses.values()];
    this._houses.clear();
    for (const house of houses) {
      if (house.isDestroyed()) continue;
      for (const at of this.attachPointsOf(house)) NavigationApi.detachStructure(at, house);
      if (revert) (house as unknown as Persistable).markForRevert();
      house.setHolding(null);
      StuffApi.destruct(house as unknown as Stuff);
    }
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
      for (const [key, room] of [...this._roomsByKey]) {
        // The records a room owns (a tract's fields) go with it, each by
        // its own key — the room says what they are, the holding does not.
        if (MixinApi.isPersistable(room)) {
          for (const dependent of room.dependentPersistables()) {
            const owned = dependent.getPersistenceKey();
            if (owned) await PersistableApi.deleteAllFor(owned);
          }
        }
        await PersistableApi.deleteAllFor(key);
      }
      for (const name of this._houses.keys()) {
        if (name !== '') await PersistableApi.deleteAllFor(this.houseKeyOf(extent, name));
      }
      await PersistableApi.deleteAllFor(extent);
    }
    this.teardown();
  }

  // ── the buildings: the fabric is the building's (paint D6/D13) ──

  /**
   * ⭐⭐ This holding's MAIN building — the one its shell belongs to, and
   * the one "the home you hold" reads. A holding stands its buildings up
   * at its wake: the Structure ROW that already covers its extent (Seznick
   * House, Duncan Hall — one building, many units), else a
   * {@link HoldingStructure} per building of its own (a farmstead's house
   * and barn are two — the floorplan's `building:` key), registered with
   * the location graph room by room. Who OWES the upkeep stays here
   * (`upkeepTerm`).
   */
  public house(): (StructureBase & Faced & Durable) | null {
    const own = this._houses.get('') ?? [...this._houses.values()][0];
    if (own !== undefined && !own.isDestroyed()) return own;
    const extent = this.holdingKey();
    if (!extent) return null;
    const s = NavigationApi.structureAtNow(extent);
    return s !== null && MixinApi.isFaced(s) && MixinApi.isDurable(s)
      ? (s as StructureBase & Faced & Durable)
      : null;
  }

  /** Every building this holding minted, the main one first. */
  public buildings(): (StructureBase & Faced & Durable)[] {
    const out = [...this._houses.values()].filter((h) => !h.isDestroyed());
    if (out.length > 0) return out;
    const covering = this.house();
    return covering === null ? [] : [covering];
  }

  /** The building `roomKey` is part of — `null` for open ground. */
  public buildingOf(roomKey: string): (StructureBase & Faced & Durable) | null {
    for (const h of this._houses.values()) {
      if (!h.isDestroyed() && h.getRoomKeys().includes(roomKey)) return h;
    }
    const s = NavigationApi.structureAtNow(roomKey);
    return s !== null && MixinApi.isFaced(s) && MixinApi.isDurable(s)
      ? (s as StructureBase & Faced & Durable)
      : null;
  }

  /** The record key a building persists under: the main one the holding's own extent. */
  private houseKeyOf(extent: string, name: string): string {
    return name === '' ? extent : `${extent}@${name}`;
  }

  /** Where a building is registered with the location graph: each of its rooms, and the main one at the extent. */
  private attachPointsOf(house: HoldingStructure): string[] {
    const at = house.getRoomKeys();
    return house.isMain() ? [...at, house.getExtent()] : at;
  }

  /**
   * Stand this holding's buildings up — unless a covering row already is
   * its building. A building is the ENCLOSED rooms (they hold their own
   * air) grouped by `building:`; open ground is no building's.
   */
  private async wakeHouses(): Promise<void> {
    const extent = this.holdingKey();
    if (!extent) return;
    const covering = await NavigationApi.structureAt(extent);
    if (covering !== null && !(covering instanceof HoldingStructure)) return;
    const groups = new Map<string, string[]>();
    for (const spec of this.getFloorplan()) {
      const key = this.roomKeyOf(spec.leaf);
      const room = key === null ? undefined : this._roomsByKey.get(key);
      if (key === null || room === undefined || room.isDestroyed()) continue;
      if (!MixinApi.isAtmospheric(room) || !room.exposure().holdsAir()) continue;
      const name = spec.building ?? '';
      groups.set(name, [...(groups.get(name) ?? []), key]);
    }
    // The main building is the unnamed rooms', else the first named.
    const names = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
    for (const [i, name] of names.entries()) {
      const keys = groups.get(name)!;
      const live = this._houses.get(name);
      if (live !== undefined && !live.isDestroyed()) {
        live.setRooms(keys, i === 0);
        continue;
      }
      const house = await StuffApi.clone<HoldingStructure>(HOLDING_STRUCTURE_ROW);
      house.setExtent(extent);
      house.setEntrance(keys[0] ?? null);
      house.setRooms(keys, i === 0);
      house.setHolding(this);
      // A building of its own goes by its name — the barn — and the main
      // one by its row's (the house).
      if (name !== '') {
        house.setShortDescription(name);
        house.setKeywords([name, 'building']);
      }
      await PersistableApi.restoreOrSeed(house as unknown as Stuff, this.houseKeyOf(extent, name));
      for (const at of this.attachPointsOf(house)) NavigationApi.attachStructure(at, house);
      this._houses.set(name, house);
    }
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

/** The eight planar directions' reflections, per mirror axis (D31). */
const MIRRORS: Readonly<Record<MirrorAxis, Readonly<Record<string, string>>>> = {
  'east-west': {
    east: 'west', west: 'east',
    northeast: 'northwest', northwest: 'northeast',
    southeast: 'southwest', southwest: 'southeast',
  },
  'north-south': {
    north: 'south', south: 'north',
    northeast: 'southeast', southeast: 'northeast',
    northwest: 'southwest', southwest: 'northwest',
  },
};

/** `direction` reflected across `axis`; `up`, `down` and the axis itself stay. */
function mirrored(direction: string, axis: '' | MirrorAxis): string {
  if (!axis) return direction;
  return MIRRORS[axis][direction] ?? direction;
}
