/**
 * FloorplanWarren — **a set of rooms authored as one plan, stood up and
 * put to sleep whole** (harbors P1, the lift holding.md promised when the
 * second consumer arrived).
 *
 * The residence ladder's `HoldingWarren` was the first body of this: a
 * keyed instance of ONE floorplan row per holding, whose members are the
 * holding's rooms. A ship is the second — her deck, cabin and hold are a
 * floorplan exactly as a house's hall and kitchen are, she sleeps whole
 * exactly as a house does (the owner: *"whatever the rule, it works the
 * same way as residences"*). So what both need lives here, and what only
 * a house needs stays in the residence pack:
 *
 *  - **here** — the floorplan (the INITIAL mint, never the closed set),
 *    keyed rooms `(scope = the room row, key = <key>/<leaf>)`, wiring the
 *    intra-plan edges, `layOut` (the plan's own frame), the whole-warren
 *    capture (its rooms that keep a record are its
 *    `dependentPersistables`, so capturing the warren captures them) /
 *    `teardown` / `revert`;
 *  - **the subclass** — what the key MEANS (a parcel extent, a ship's
 *    durable key), who is told when the population changes
 *    (`reconcile`), how a LOCKED edge is gated (`wireLockedEdge`), the
 *    address a woken room is stamped with (`addressFor`). A room that must finish
 *    itself against its warren does so in its own
 *    `WarrenMember.onWarrenWake` — the ONE wake hook (harbors review 2).
 *
 * Identity is the keyed model (D17): every member's `templatePath`
 * resolves to a real row; per-instance uniqueness rides the persistence
 * spine's `(scope, key)` record. Nothing here mints a row.
 *
 * ⭐ **The shell clock is not here** (harbors review 3). A fabric that
 * weathers composes `WeatheringMixin` (`lib/location/Weathering.ts`) — a
 * house's `HoldingWarren` and a ship's `ShipWarren` do — and a floorplan
 * that does not weather (a mine's workings: *a field has no paint
 * either*) does not.
 */

import { type Attachment } from './Warren';
import { RoomWarren } from './RoomWarren';
import { PersistableMixin } from '../persistence/Persistable';
import { WarrenMemberMixin } from './WarrenMember';
import { ContainerMixin } from '../spatial/Container';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { NavigationApi } from '../../api/navigation';
import { PersistableApi } from '../../api/persistable';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Persistable } from '../persistence/Persistable';
import type { FieldMeta } from '../mixin';
import type { MirrorAxis } from './PlatPlan';

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

const FloorplanBase = PersistableMixin(
  WarrenMemberMixin(ContainerMixin(RoomWarren)),
);

export abstract class FloorplanWarren extends FloorplanBase {
  static fieldMeta: FieldMeta = {
    floorplan: { persistent: true, authorable: true },
    mirrorAxis: { persistent: true },
  };

  /**
   * ⭐ Which way this copy of the layout is MIRRORED, `''` for none
   * (tracts build D31) — set by whoever places the copy (a plat, from the
   * side of the road the lot is on) before the warren wakes. Every
   * floorplan direction is read through it, so a farm on the far side of
   * the lane faces the lane too.
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

  /** Live rooms by full key (`<key>` or `<key>/<leaf>`). */
  private _roomsByKey: Map<string, MemberStuff> = new Map();

  // ── authored-field surface ──────────────────────────────────────

  public getFloorplan(): FloorplanRoom[] {
    return (this.floorplan ?? []).map((r) => ({
      leaf: typeof r.leaf === 'string' ? r.leaf : undefined,
      room: String(r.room ?? ''),
      entry: r.entry === true,
      share: typeof r.share === 'number' ? r.share : undefined,
      footprintM2: typeof r.footprintM2 === 'number' ? r.footprintM2 : undefined,
    }));
  }

  /** A floorplan leaf's share of the open ground, or `null` (not open ground). */
  public shareOf(leaf: string): number | null {
    const spec = this.getFloorplan().find((r) => r.leaf === leaf);
    return spec && typeof spec.share === 'number' && spec.share > 0 ? spec.share : null;
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
        // ⭐ Read through the mirror (D31): a reflected copy's every
        // direction is flipped across the axis.
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
      zoneFrom: this.zoneFromFor(spec, key),
    });
    this.addMember(room);
    // ⭐ Only a room that keeps state of its own has a record to restore
    // (persistence is the exception — tracts build review). A plain room
    // — a farmyard — comes up from its row each wake, its `props:` laid
    // down at clone, and keeps nothing.
    if (MixinApi.isPersistable(room)) await PersistableApi.restoreOrSeed(room, key);
    this._roomsByKey.set(key, room);
    // The room's address — before the room finishes itself, which may
    // read it (a tract seeds its ground from its locality).
    const address = this.addressFor(spec);
    if (address !== null && MixinApi.isAddressable(room)) room.setAddress(address);
    // ⭐ Stood up and restored: a member may now finish itself against
    // its warren — a tract sizes itself from the open ground (D28).
    if (MixinApi.isWarrenMember(room)) await room.onWarrenWake();
    return room;
  }

  /**
   * The path a woken room's ZONE is resolved from. A holding's key is a
   * path under its lot (`…/lots/lot-7`), so the key itself names the zone
   * its rooms stand in. A warren whose key is not a path (a ship's serial)
   * says where its rooms stand instead.
   *
   * @hook Default: the room's full key.
   */
  protected zoneFromFor(_spec: FloorplanRoom, key: string): string {
    return key;
  }

  /**
   * The address a woken room is stamped with — what the warren's key
   * means for it (a house: its street address), or `null` for none. A
   * READ the warren answers, not a wake hook: anything a room must do on
   * waking is its own `WarrenMember.onWarrenWake` (harbors review 2), but
   * a plain room (a farmyard) composes no `WarrenMember` and still has an
   * address.
   *
   * @hook Default: none.
   */
  protected addressFor(_spec: FloorplanRoom): string | null {
    return null;
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

  /** The key a live room was stood up under, or null (see {@link Warren.mintedKeyOf}). */
  public override mintedKeyOf(member: Stuff): string | null {
    for (const [key, room] of this._roomsByKey) {
      if (room === member && !room.isDestroyed()) return key;
    }
    return null;
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
   * ⭐ The records this warren owns: every room it stood up that keeps a
   * record of its own (harbors review 2). So ONE capture of the warren
   * writes its own record and then each room's, each under the key it
   * was restored with; `markForRevert` marks them all; `revert` deletes
   * them. The partial-reap alternative is structurally impossible —
   * rooms only ever tear down through `teardown()`.
   *
   * A room is listed only once it has been restored (`wakeRoom` keeps it
   * after `restoreOrSeed`), so a capture racing a wake never writes a
   * room that has not got its record back yet.
   *
   * @hook
   */
  public override dependentPersistables(): (Stuff & Persistable)[] {
    const out: (Stuff & Persistable)[] = [];
    for (const room of this._roomsByKey.values()) {
      if (!room.isDestroyed() && MixinApi.isPersistable(room)) out.push(room);
    }
    return out;
  }

  /**
   * Teardown: the rooms follow the warren (whole, D16). When the warren
   * is marked for revert its rooms were marked with it (they are its
   * dependents), so they skip their destruct-time capture backstop.
   */
  public override teardown(): void {
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
      for (const [roomKey, room] of [...this._roomsByKey]) {
        // The records a room owns (a tract's fields) go with it, each by
        // its own key — the room says what they are, the warren does not.
        if (MixinApi.isPersistable(room)) {
          for (const dependent of room.dependentPersistables()) {
            const owned = dependent.getPersistenceKey();
            if (owned) await PersistableApi.deleteAllFor(owned);
          }
        }
        await PersistableApi.deleteAllFor(roomKey);
      }
      await PersistableApi.deleteAllFor(key);
    }
    this.teardown();
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
