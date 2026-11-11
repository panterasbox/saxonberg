/**
 * FloorplanWarren — **a set of rooms authored as one plan, stood up and
 * put to sleep whole** (the lift holding.md promised when the
 * second consumer arrived).
 *
 * The residence ladder's `HoldingWarren` was the first body of this: a
 * keyed instance of ONE programme row per holding, whose members are the
 * holding's rooms. A ship is the second — her deck, cabin and hold are a
 * plan exactly as a house's hall and kitchen are, and she sleeps whole
 * exactly as a house does (the owner: *"whatever the rule, it works the
 * same way as residences"*). So what both need lives here, and what only
 * a house needs stays in the residence pack:
 *
 *  - **here** — the copy: every room of the warren's PLAN minted
 *    keyed `(scope = the room row, key = <key>/<leaf>)`, its ways wired,
 *    its layout read (and mirrored), the whole-warren capture (its rooms
 *    that keep a record are its `dependentPersistables`, so capturing the
 *    warren captures them) / `teardown` / `revert`;
 *  - **the subclass** — what the key MEANS (a parcel extent, a ship's
 *    serial), who is told when the population changes (`reconcile`), and
 *    the address a woken room is stamped with (`addressFor`). A house's
 *    keyed doors are hung by the house itself after the wake
 *    (`HoldingWarren.hangKeyedDoors`). A room that must finish itself against its
 *    warren does so in its own `WarrenMember.onWarrenWake` — the ONE wake
 *    hook.
 *
 * ⭐⭐ **The plan is ordinary authored content, on its OWNER** (harbors
 * review 3; 2026-11-03). The plan is an `extent` holding the kind's rooms
 * as ordinary rows with ordinary `exits:` — the authored Hesper's shape —
 * and an `entrance`, the way in ({@link Floorplan}). Whoever owns the plan
 * authors it: a holding's programme row carries `extent`, `entrance`,
 * `footprintM2` and `buildings:` on THIS class's fields; a ship of a kind
 * hands her warren her own row's ({@link planOf}). ⛔ No blueprint row —
 * a `Structure` is only ever a thing standing in the world. There is no
 * second schema: the retired `floorplan:` list re-stated every room's
 * exits, its entry and its layout outside the rooms. Copy N clones every room row and applies ONE
 * rewrite: a way whose destination is inside the extent leads to the same
 * room of copy N; a way out stays as authored. Mirroring is a property of
 * the COPY, applied in the same pass: every copied direction is reflected
 * across the copy's axis, and the layout read from those ways with it.
 *
 * Identity is the keyed model (D17): every member's `templatePath`
 * resolves to a real row; per-instance uniqueness rides the persistence
 * spine's `(scope, key)` record. Nothing here mints a row.
 *
 * ⭐ **The fabric is not here** (paint review, merged into harbors). What
 * weathers is a STRUCTURE's outside — a building's coat and its `Durable`
 * condition (`lib/structure/Building`), a ship's hull (`Ship`) — never a
 * set of rooms by being one plan: *a field has no paint either*.
 */

import { type Attachment } from './Warren';
import { RoomWarren } from './RoomWarren';
import { Floorplan, type FloorplanBuilding, type LoadedFloorplan, type FloorplanRoom } from './Floorplan';
import { PersistableMixin } from '../persistence/Persistable';
import { WarrenMemberMixin } from './WarrenMember';
import { ContainerMixin } from '../spatial/Container';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import { NavigationApi } from '../../api/navigation';
import { TemplatePaths } from '../paths';
import type Exit from '../boundary/Exit';
import type { ExitInstruction } from '../boundary/Exitable';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Persistable } from '../persistence/Persistable';
import type { FieldMeta } from '../mixin';
import type { MirrorAxis } from './PlatPlan';

type MemberStuff = Stuff & Container;

const FloorplanBase = PersistableMixin(
  WarrenMemberMixin(ContainerMixin(RoomWarren)),
);

export abstract class FloorplanWarren extends FloorplanBase {
  static fieldMeta: FieldMeta = {
    extent: { persistent: true, authorable: true },
    entrance: { persistent: true, authorable: true },
    footprintM2: { persistent: true, authorable: true },
    buildings: { persistent: true, authorable: true },
    mirrorAxis: { persistent: true },
  };

  /**
   * ⭐ The PLAN, when this warren's own row owns it (a holding's
   * programme): the template-path prefix whose rows are the kind's rooms
   * — '' for a warren whose plan is somebody else's (a ship of a kind
   * hands hers over) or that mints nothing (a mine, an authored ship).
   */
  public extent: string = '';

  /** The plan's room you come in by. */
  public entrance: string = '';

  /**
   * The ground the plan's buildings stand on that no tract covers, m² —
   * what a copy subtracts from its parcel to leave the open ground its
   * tracts share (the retired floorplan's per-room `footprintM2`, summed).
   */
  public footprintM2: number = 0;

  /**
   * ⭐ The plan's buildings, the main one first: each a Building row whose
   * own `extent` (inside the plan's) holds that building's rooms and whose
   * `entrance` is its way in. AUTHORED, never
   * derived from how the rooms connect — ground no building's extent
   * covers (a yard, a tract) is nobody's building.
   */
  public buildings: string[] = [];

  /**
   * ⭐ Which way this copy of the layout is MIRRORED, `''` for none
   * (tracts build D31) — set by whoever places the copy (a plat, from the
   * side of the road the lot is on) before the warren wakes. Every copied
   * direction and cell is reflected across it, so a farm on the far side
   * of the lane faces the lane too.
   */
  public mirrorAxis: '' | MirrorAxis = '';

  /** Runtime: the plan as read off its rows, once per warren. */
  private _plan: LoadedFloorplan | null = null;

  /** Live rooms by full key (`<key>` or `<key>/<leaf>`). */
  private _roomsByKey: Map<string, MemberStuff> = new Map();

  // ── authored-field surface ──────────────────────────────────────

  public getExtent(): string {
    return this.extent;
  }

  public setExtent(value: string | null): void {
    this.extent = typeof value === 'string' ? value.replace(/\/+$/, '') : '';
    this._plan = null;
  }

  public getEntrance(): string {
    return this.entrance;
  }

  public setEntrance(value: string | null): void {
    this.entrance = typeof value === 'string' ? value : '';
    this._plan = null;
  }

  /** The ground the plan's buildings cover, m² (its owner's `footprintM2`). */
  public getFootprintM2(): number {
    return this.footprintM2;
  }

  public setFootprintM2(value: number | null): void {
    const n = Number(value);
    this.footprintM2 = Number.isFinite(n) && n > 0 ? n : 0;
  }

  public getBuildings(): readonly string[] {
    return this.buildings;
  }

  public setBuildings(value: readonly string[] | null): void {
    if (value === null || value === undefined) {
      this.buildings = [];
    } else if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v === '')) {
      throw new Error(`${this.constructor.name}: buildings must be a list of row paths, got ${JSON.stringify(value)}`);
    } else {
      this.buildings = [...value];
    }
    this._plan = null;
  }

  public getMirrorAxis(): '' | MirrorAxis {
    return this.mirrorAxis;
  }

  public setMirrorAxis(value: '' | MirrorAxis | null): void {
    this.mirrorAxis = value === 'east-west' || value === 'north-south' ? value : '';
  }

  /**
   * ⭐ Whose plan this warren copies, and its fields — the row that owns
   * it (named in every error) and what it authors. `null` for a warren
   * that copies none (a mine carves; an authored ship adopts).
   *
   * @hook Default: this warren's own row, when it authors an `extent` (a
   *   holding's programme). A ship's warren answers her KIND's row.
   */
  protected planOf(): { owner: string; data: Record<string, unknown> } | null {
    if (this.extent === '') return null;
    return {
      owner: this.getTemplatePath() ?? this.constructor.name,
      data: {
        extent: this.extent,
        entrance: this.entrance,
        footprintM2: this.footprintM2,
        buildings: this.buildings,
      },
    };
  }

  /**
   * The plan, read off its rows (cached for the warren's life). `null`
   * when the warren copies none.
   */
  public async loadPlan(): Promise<LoadedFloorplan | null> {
    if (this._plan !== null) return this._plan;
    const of = this.planOf();
    if (of === null) return null;
    this._plan = await new Floorplan(of.owner, of.data).load();
    return this._plan;
  }

  /** The plan's rooms as last read — `[]` before the first wake. */
  public planRooms(): readonly FloorplanRoom[] {
    return this._plan?.rooms ?? [];
  }

  /** The plan's authored buildings, the main one first — `[]` before the first wake or for none. */
  public planBuildings(): readonly FloorplanBuilding[] {
    return this._plan?.buildings ?? [];
  }

  // ── identity ────────────────────────────────────────────────────

  /** The warren's persistence key — every room key is under it. */
  public warrenKey(): string | null {
    return (this as unknown as Persistable).getPersistenceKey();
  }

  /** The full room key for a leaf (absent = the key itself). */
  public roomKeyOf(leaf: string | undefined): string | null {
    const key = this.warrenKey();
    if (!key) return null;
    return leaf ? `${key}/${leaf}` : key;
  }

  // ── wake / membership ───────────────────────────────────────────

  /**
   * Stand the whole copy up: every plan room keyed
   * `(roomRow, <key>[/leaf])` via the spine's restore-or-seed, its ways
   * wired (the rewrite rule), the rooms laid out. Idempotent per room
   * (live rooms are reused, wired ways stand).
   */
  public async wake(): Promise<void> {
    const plan = await this.loadPlan();
    if (plan === null) return;
    for (const spec of plan.rooms) await this.wakeRoom(spec);
    for (const spec of plan.rooms) await this.wireWays(plan, spec);
    this.layOut();
  }

  /** ⭐ A copy is a frame of its own — see {@link layOut}. */
  public override laysOutOwnFrame(): boolean {
    return true;
  }

  /**
   * ⭐⭐ **Every place has coordinates — a copy's rooms in the WARREN's
   * frame** (the place taxonomy, cleanliness B53). The entrance is the
   * origin, and the copy's own cardinal ways lay the rest out from it —
   * the Hinkley yard (0,0,0), its hall one north at (0,1,0), the kitchen
   * east of the hall at (1,1,0). Read through the mirror, so a reflected
   * copy is laid out reflected. A room the cardinal ways do not reach sits
   * in a row beyond, in plan order; a cell two ways disagree about
   * keeps its first room.
   *
   * ⚠ A plan's room row authors NO `coords:`: a row's
   * cell registers on its ZONE's grid, and every copy of a row stands in
   * one zone — every Hinkley yard would claim one square of the lots'
   * grid. The ways already say where each room is. Derived, never stored.
   */
  public layOut(): void {
    const plan = this._plan;
    if (plan === null || plan.rooms.length === 0) return;
    const leafOf = (r: FloorplanRoom): string => r.leaf ?? '';
    const byRow = new Map(plan.rooms.map((r) => [r.row, leafOf(r)] as const));
    const edges: Array<{ from: string; to: string; dir: string }> = [];
    for (const r of plan.rooms) {
      for (const [dir, way] of Object.entries(r.exits)) {
        const to = byRow.get(way.destination);
        if (to !== undefined) edges.push({ from: leafOf(r), to, dir: mirrored(dir, this.mirrorAxis) });
      }
    }
    const keyOf = (c: readonly number[]): string => c.join(',');
    const cells = new Map<string, [number, number, number]>();
    const taken = new Set<string>();
    const place = (leaf: string, cell: [number, number, number]): void => {
      cells.set(leaf, cell);
      taken.add(keyOf(cell));
    };
    const entry = plan.rooms.find((r) => r.entry) ?? plan.rooms[0]!;
    place(leafOf(entry), [0, 0, 0]);
    const queue = [leafOf(entry)];
    while (queue.length > 0) {
      const from = queue.shift()!;
      const at = cells.get(from)!;
      for (const e of edges) {
        if (e.from !== from || cells.has(e.to)) continue;
        const off = NavigationApi.directionOffset(e.dir);
        if (!off) continue;
        const cell: [number, number, number] = [at[0] + off[0], at[1] + off[1], at[2] + off[2]];
        if (taken.has(keyOf(cell))) continue;
        place(e.to, cell);
        queue.push(e.to);
      }
    }
    const beyond = Math.max(...[...cells.values()].map((c) => c[1])) + 1;
    let x = 0;
    for (const r of plan.rooms) {
      if (cells.has(leafOf(r))) continue;
      while (taken.has(keyOf([x, beyond, 0]))) x += 1;
      place(leafOf(r), [x, beyond, 0]);
    }
    for (const [leaf, cell] of cells) {
      const room = this.roomForLeaf(leaf || undefined);
      if (room && MixinApi.isCartesianCoordinates(room)) room.setCoordinates(cell);
    }
  }

  /** Stand one plan room up (reused when live). */
  protected async wakeRoom(spec: FloorplanRoom): Promise<MemberStuff | null> {
    const key = this.roomKeyOf(spec.leaf);
    if (!key) return null;
    const cached = this.roomForKey(key);
    if (cached !== null) return cached;
    // ⭐ The room stands in the zone its WARREN does, resolved from its
    // key rather than its row: a room's size is its zone's cell (B54).
    // Its identity stays the row — the record's scope. ⭐ Its ways are
    // NOT applied by the clone (`exits: {}`): a way into the plan
    // would stand the plan's own room up. They are copied below.
    const room = await this.mintKeyed(spec.row, key, {
      zoneFrom: this.zoneFromFor(spec, key),
      withholdExits: Object.keys(spec.exits).length > 0,
    });
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
   * ⭐ Mint ONE keyed member: clone `row`, make it a member, let the
   * caller place it (`beforeRestore` — a mine puts a carved cell on its
   * grid, since its coordinate IS its identity), restore-or-seed it under
   * `key` when it keeps a record, and file it by key. The one keyed mint
   * every floorplan shares — a plan's copy and a mine's carve alike
   *. Persistence is the exception: a plain room comes
   * up from its row and keeps nothing.
   */
  protected async mintKeyed(
    row: string,
    key: string,
    opts: {
      zoneFrom?: string;
      withholdExits?: boolean;
      beforeRestore?: (room: MemberStuff) => void;
    } = {},
  ): Promise<MemberStuff> {
    const room = await StuffApi.clone<MemberStuff>(row, undefined, {
      ...(opts.zoneFrom !== undefined ? { zoneFrom: opts.zoneFrom } : {}),
      ...(opts.withholdExits ? { dataOverlay: { exits: {} } } : {}),
    });
    this.addMember(room);
    opts.beforeRestore?.(room);
    if (MixinApi.isPersistable(room)) await PersistableApi.restoreOrSeed(room, key);
    this._roomsByKey.set(key, room);
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
   * READ the warren answers, not a wake hook.
   *
   * @hook Default: none.
   */
  protected addressFor(_spec: FloorplanRoom): string | null {
    return null;
  }

  /**
   * ⭐ Copy one room's authored ways (the ONE rewrite rule): a way whose
   * destination is inside the plan's extent leads to the same room
   * of THIS copy; a way out stays as authored. Every direction is read
   * through the copy's mirror. Idempotent — a wired direction stands.
   */
  protected async wireWays(plan: LoadedFloorplan, spec: FloorplanRoom): Promise<void> {
    const from = this.roomForLeaf(spec.leaf);
    if (from === null || !MixinApi.isExitable(from)) return;
    for (const [authored, way] of Object.entries(spec.exits)) {
      const direction = mirrored(authored, this.mirrorAxis);
      if (from.getExit(direction)) continue;
      const inside =
        way.destination === plan.extent || way.destination.startsWith(`${plan.extent}/`);
      if (!inside) {
        await from.applyExits({ [direction]: way });
        continue;
      }
      const target = plan.rooms.find((r) => r.row === way.destination);
      if (target === undefined) {
        throw new Error(
          `${this.constructor.name}: the plan of '${plan.path}' — '${spec.row}' ` +
            `${authored} leads to '${way.destination}', inside the extent and no room of it`,
        );
      }
      const to = this.roomForLeaf(target.leaf);
      if (to === null) continue;
      await from.installExit<Exit>(
        way.kind ?? TemplatePaths.defaultExitKind,
        {
          direction,
          source: from,
          destination: to as never,
          keepLiveDestination: true,
          oneWay: way.oneWay ?? true,
          hidden: way.hidden,
          concealment: way.concealment,
          concealmentHint: way.hint,
          blocked: way.blocked,
          muffled: way.muffled,
          noFollow: way.noFollow,
          messageIn: way.messageIn,
          messageOut: way.messageOut,
          media: way.media,
          wheelPassable: way.wheelPassable,
          edgeMinutes: way.edgeMinutes,
        },
      );
    }
  }

  /** The live room for a leaf, or null. */
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

  /** Let go of a member filed by key (a mine's abandoned cell). */
  protected forgetKey(key: string): void {
    this._roomsByKey.delete(key);
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

  /** The mover's landing room — the plan's entrance, or null. */
  public entryRoom(): MemberStuff | null {
    const entry = this.planRooms().find((r) => r.entry);
    return entry ? this.roomForLeaf(entry.leaf) : null;
  }

  // ── dormancy as a unit (D16) ────────────────────────────────────

  /**
   * ⭐ The records this warren owns: every room it stood up that keeps a
   * record of its own. So ONE capture of the warren
   * writes its own record and then each room's; `markForRevert` marks
   * them all; `revert` deletes them.
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
      `${this.constructor.name} mints rooms from its plan, never buds`,
    );
  }

  public async admitArrival(): Promise<void> {
    /* a floorplan doesn't population-bud */
  }

  protected attachmentFor(): Attachment {
    return { direction: 'out' };
  }

  protected async wireHostFixtures(): Promise<void> {
    /* the entry room is the plan's, not a host's */
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
