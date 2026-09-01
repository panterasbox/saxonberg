/**
 * DormWarren — the elastic, two-tier room-collection manager for Duncan
 * Hall's dorms wing. A singleton content `Warren` subclass (the
 * `LoungeWarren` precedent), NOT a subsystem. It supplies the dorm *policy*
 * over the base Warren mechanism, in two tiers:
 *
 *   - **Rooms** are keyed Warren members (`_unitsByKey`, keyed by unit
 *     parcel extent), added via `addMember`, persisted via D1. `admit`
 *     materializes one (restore-or-seed) on entry.
 *   - **Floors** are runtime `Corridor` clones (`_corridorsByFloor`), OUTSIDE
 *     `_members`. `ensureFloor(n)` builds one lazily; corridors reap top-down
 *     when empty (`reconcile`).
 *
 * The building starts as JUST the lobby and provisions nothing in advance;
 * it grows on provisioning and reconstitutes from the durable slot set (the
 * child parcels of `dorms`). `_hostMember` stays **null forever** — the
 * Warren never uses the placement kernel (`getHost`); entry is driven by
 * `admit`, and vertical travel by `FloorStairExit`s. See
 * `docs/subsystems/residence.md`.
 */

import { Warren, type Attachment } from '../../../lib/location/Warren';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import { PostRegistrationMixin } from '../../../lib/stuff/PostRegistration';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { ParcelRecord } from '../../../lib/parcel/ParcelRecord';
import type { LockType } from '../../../lib/lock/Lock';
import Exit from '../../../lib/boundary/Exit';
import FloorStairExit from './FloorStairExit';
import DormDoor from './DormDoor';
import DormRoom from './DormRoom';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Exitable } from '../../../lib/boundary/Exitable';
import type { Persistable } from '../../../lib/persistence/Persistable';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

const DormWarrenBase = SingletonMixin(PostRegistrationMixin(Warren));

export default class DormWarren extends DormWarrenBase {
  /** Seeded Warren-definition path (the singleton). */
  static readonly WARREN_PATH = '/world/eternal/duncan-hall/dorm-warren';
  /** The one dorm-room template every unit clones from (the D1 scope). */
  static readonly DORMROOM_TEMPLATE = DormRoom.SCOPE;
  /** The one corridor template every floor clones from. */
  static readonly CORRIDOR_TEMPLATE = '/world/eternal/duncan-hall/corridor';
  /** The building's ground-floor landing (the fixed seed room). */
  static readonly LOBBY_PATH = '/world/eternal/duncan-hall/lobby';
  /** The parent parcel the unit parcels subdivide under. */
  static readonly DORMS_EXTENT = '/world/eternal/duncan-hall/dorms';
  /** Units per floor before provisioning buds the next floor (a static knob;
   *  an AppSetting is a deferred tuning seam). */
  static readonly ROOMS_PER_FLOOR = 12;
  /** The lock technology dorm doors use — a brass pin-tumbler (a keycard/
   *  electronic tech is a downtown/corporate thing, deferred). */
  static readonly DORM_LOCK_TECH: LockType = 'pin-tumbler';

  /** Live rooms, keyed by unit parcel extent (the true Warren members). */
  private _unitsByKey: Map<string, MemberStuff> = new Map();
  /** Live floor corridors, keyed by floor number (outside `_members`). */
  private _corridorsByFloor: Map<number, MemberStuff> = new Map();
  /** Live unit doors, keyed by unit extent (Exits on their floor corridor). */
  private _doorsByKey: Map<string, DormDoor> = new Map();
  /** Floors that have (or sit below) a provisioned unit — sync reachability. */
  private _provisionedFloors: Set<number> = new Set();
  /** unitKey → the unit's lock keyway — the door's SYNC lock identity (the
   *  door checks whether the mover presents a matching KEY, not who they are).
   *  Refreshed from the durable parcel keyway whenever provisioning changes. */
  private _keywayByUnit: Map<string, string> = new Map();

  /** Resolve the singleton (async — clones on first access). */
  static async resolve(): Promise<DormWarren> {
    return StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
  }

  /** Peek at the live singleton without forcing a clone (sync). */
  static peek(): DormWarren | null {
    return StuffApi.findByTemplatePath<DormWarren>(DormWarren.WARREN_PATH) ?? null;
  }

  /**
   * On warm: rebuild the sync reachability cache from the durable slot set
   * and install the lobby's `up` `FloorStairExit` (→ `ensureFloor(1)`), so the
   * building reconstitutes from just the parcel rows.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister?.(context);
    await this.refreshProvisioned();
    await this.installLobbyUpExit();
  }

  // ───────────────────── tier 1: rooms ─────────────────────

  /**
   * The live room for `unitKey`, materialized if needed. Cached → clone the
   * `DormRoom` shell → `PersistableApi.restoreOrSeed` (the keyed-holder
   * ground pattern: key it, then restore its record or lay down the declared
   * `props:` fixtures and capture them) → wire the return leg to its
   * floor corridor → cache.
   *
   * The restore-or-seed decision itself is NOT dorm-specific and no longer
   * lives here; the Warren membership, the hub-exit wiring and the cache
   * are what actually make this a dorm.
   */
  public async admit(unitKey: string): Promise<MemberStuff> {
    const cached = this._unitsByKey.get(unitKey);
    if (cached && !cached.isDestroyed()) return cached;

    const room = await this.createMemberSerialized();
    this.addMember(room);
    await PersistableApi.restoreOrSeed(room, unitKey);

    await this.wireHubExit(room);
    this._unitsByKey.set(unitKey, room);
    return room;
  }

  // ───────────────────── tier 2: floors ─────────────────────

  /**
   * The live corridor for floor `n`, built if needed. Returns null when the
   * floor is unreachable (no provisioned unit on it or above). Clones the
   * corridor → wires its `down` to the floor below (lobby for n=1, else
   * `ensureFloor(n-1)`) + its `up` `FloorStairExit` → clones the `DormDoor`s
   * for the units whose slot is on floor n → caches.
   */
  public async ensureFloor(n: number): Promise<MemberStuff | null> {
    const cached = this._corridorsByFloor.get(n);
    if (cached && !cached.isDestroyed()) return cached;
    if (!this.floorReachable(n)) return null;

    const corridor = await StuffApi.clone<MemberStuff>(
      DormWarren.CORRIDOR_TEMPLATE,
    );
    this._corridorsByFloor.set(n, corridor);
    const corrEx = this.requireExitable(corridor);

    // Wire `down` to the floor below (one-way; the below-side `up` is that
    // floor's own FloorStairExit / the lobby's).
    const below =
      n === 1 ? await this.lobby() : await this.ensureFloor(n - 1);
    if (below && MixinApi.isExitable(below)) {
      const down = StuffApi.createSync(
        () =>
          new Exit({
            direction: 'down',
            source: corridor,
            destination: below as ExitableContainer,
            keepLiveDestination: true,
            oneWay: true,
          }),
      );
      await corrEx.addExit(down);
    }

    // Install this floor's `up` FloorStairExit → ensureFloor(n+1).
    if (!corrEx.getExit('up')) {
      const up = StuffApi.createSync(() => new FloorStairExit(corridor, n + 1));
      await corrEx.addExit(up);
    }

    // Clone the DormDoors for the units whose slot is on this floor.
    for (const child of await ParcelApi.childParcelsOf(DormWarren.DORMS_EXTENT)) {
      const slot = ParcelRecord.slotOfExtent(child.getExtent());
      if (slot?.floor === n) await this.ensureUnitDoor(child.getExtent());
    }

    return corridor;
  }

  /**
   * Ensure the `DormDoor` for `unitKey` is present on its floor's (live)
   * corridor. Called by `ensureFloor` for every unit on the floor, and by
   * provisioning so a unit added to an already-live floor gets its door
   * immediately. No-op when the floor isn't live yet (it's cloned when the
   * floor next materializes).
   */
  public async ensureUnitDoor(unitKey: string): Promise<void> {
    const existing = this._doorsByKey.get(unitKey);
    if (existing) return;
    const slot = ParcelRecord.slotOfExtent(unitKey);
    if (!slot) return;
    const corridor = this._corridorsByFloor.get(slot.floor);
    if (!corridor || corridor.isDestroyed()) return;
    const corrEx = this.requireExitable(corridor);
    const dir = `unit-${slot.pos}`;
    if (corrEx.getExit(dir)) return;
    const door = StuffApi.createSync(
      () => new DormDoor(corridor, unitKey, dir),
    );
    await corrEx.addExit(door);
    this._doorsByKey.set(unitKey, door as unknown as DormDoor);
  }

  /** The `DormDoor` for a unit (for the `unlock`/lease-gate seam), or null. */
  public doorFor(unitKey: string): DormDoor | null {
    const door = this._doorsByKey.get(unitKey);
    return door && !door.isDestroyed() ? door : null;
  }

  /** The live room for a unit (if materialized), or null. */
  public roomFor(unitKey: string): MemberStuff | null {
    const room = this._unitsByKey.get(unitKey);
    return room && !room.isDestroyed() ? room : null;
  }

  /** The live corridor for a unit's floor (if materialized), or null. */
  public corridorForUnit(unitKey: string): MemberStuff | null {
    const slot = ParcelRecord.slotOfExtent(unitKey);
    if (!slot) return null;
    const corridor = this._corridorsByFloor.get(slot.floor);
    return corridor && !corridor.isDestroyed() ? corridor : null;
  }

  // ───────────────────── provisioning support ─────────────────────

  /** Rebuild the sync reachability + keyway caches from the durable slot set
   *  (called at warm and whenever provisioning changes). */
  public async refreshProvisioned(): Promise<void> {
    const floors = new Set<number>();
    const keyways = new Map<string, string>();
    for (const child of await ParcelApi.childParcelsOf(DormWarren.DORMS_EXTENT)) {
      const extent = child.getExtent();
      const slot = ParcelRecord.slotOfExtent(extent);
      if (slot) floors.add(slot.floor);
      const keyway = child.getKeyway();
      if (keyway) keyways.set(extent, keyway);
    }
    this._provisionedFloors = floors;
    this._keywayByUnit = keyways;
  }

  /**
   * The unit's lock keyway, or null — the `DormDoor`'s synchronous lock
   * identity. The door opens for whoever presents a KEY matching this keyway
   * (bearer possession), not for a fixed identity; an empty/absent keyway is
   * an unprovisioned/re-keyed unit no key opens.
   */
  public keywayOf(unitKey: string): string | null {
    return this._keywayByUnit.get(unitKey) ?? null;
  }

  /**
   * Whether floor `n` can be climbed to — true when any provisioned unit
   * sits on floor n OR above (so the stairwell stays contiguous from the
   * lobby up to the highest occupied floor, even across an empty middle).
   */
  public floorReachable(n: number): boolean {
    for (const f of this._provisionedFloors) if (f >= n) return true;
    return false;
  }

  /**
   * Tear a unit down (end-lease, DECISION B). `revert` marks the live room
   * so its `shouldPersist()` goes false (no recapture races the record
   * delete). No-op when the unit isn't live. Pokes `reconcile` so a
   * now-empty floor can reap.
   */
  public async dropUnit(
    unitKey: string,
    opts: { revert?: boolean } = {},
  ): Promise<void> {
    this.removeUnitDoor(unitKey);
    const room = this._unitsByKey.get(unitKey);
    if (room && !room.isDestroyed()) {
      if (opts.revert) (room as unknown as Persistable).markForRevert();
      this.teardownRoom(unitKey, room);
    } else {
      this._unitsByKey.delete(unitKey);
    }
    await this.reconcile();
  }

  // ───────────────────── Warren policy hooks ─────────────────────

  /** Clone one fresh `DormRoom` (it self-registers nothing; `admit` drives). */
  protected async createMember(): Promise<MemberStuff> {
    return StuffApi.clone<MemberStuff>(DormWarren.DORMROOM_TEMPLATE);
  }

  /** Dorms don't population-bud — arrivals never re-seat. */
  public async admitArrival(): Promise<void> {
    /* no-op */
  }

  /** Unused (entry is `admit`, not the placement kernel); a stable label. */
  protected attachmentFor(): Attachment {
    return { direction: 'out' };
  }

  /** No host-only fixtures (the lobby is a fixed seed, not a host). */
  protected async wireHostFixtures(): Promise<void> {
    /* no-op */
  }

  protected async unwireHostFixtures(): Promise<void> {
    /* no-op */
  }

  /**
   * Wire a room's one-way return leg to ITS floor corridor (not a host).
   * Reads the room's floor from its stashed key; ensures the corridor;
   * installs `out` (room → corridor) as a live-ref one-way exit. The
   * corridor → room direction is the unit's `DormDoor` (`ensureUnitDoor`),
   * so the two never duplicate.
   */
  protected override async wireHubExit(room: MemberStuff): Promise<void> {
    const key = (room as unknown as Persistable).getPersistenceKey();
    const slot = key ? ParcelRecord.slotOfExtent(key) : null;
    if (!slot) return;
    const corridor = await this.ensureFloor(slot.floor);
    if (!corridor) return;
    const roomEx = this.requireExitable(room);
    if (roomEx.getExit('out')) return;
    const out = StuffApi.createSync(
      () =>
        new Exit({
          direction: 'out',
          source: room,
          destination: corridor as ExitableContainer,
          keepLiveDestination: true,
          oneWay: true,
        }),
    );
    await roomEx.addExit(out);
  }

  /**
   * Population-reactive reconcile (DECISION I): reap empty rooms
   * (capture-then-cull), then reap corridors strictly top-down — a floor's
   * corridor reaps only when it holds no live room AND no live corridor sits
   * above it, keeping `lobby↔c1↔…↔c_top` contiguous.
   */
  protected async reconcile(): Promise<void> {
    // 1. Room dormancy — an empty room captures + reaps.
    for (const [key, room] of [...this._unitsByKey]) {
      if (room.isDestroyed()) {
        this._unitsByKey.delete(key);
        continue;
      }
      if (this.occupantsOf(room).length === 0) {
        await PersistableApi.capture(room, key); // no-op if markForRevert
        this.teardownRoom(key, room);
      }
    }

    // 2. Corridor reap, strictly top-down.
    const floors = [...this._corridorsByFloor.keys()].sort((a, b) => b - a);
    for (const n of floors) {
      const corridor = this._corridorsByFloor.get(n);
      if (!corridor || corridor.isDestroyed()) {
        this._corridorsByFloor.delete(n);
        continue;
      }
      const liveRoomHere = this.hasLiveRoomOnFloor(n);
      const liveCorridorAbove = floors.some(
        (f) =>
          f > n &&
          !!this._corridorsByFloor.get(f) &&
          !this._corridorsByFloor.get(f)!.isDestroyed(),
      );
      if (!liveRoomHere && !liveCorridorAbove) {
        StuffApi.destruct(corridor as unknown as Stuff);
        this._corridorsByFloor.delete(n);
      }
    }
  }

  /**
   * Teardown (HMR / shutdown): destruct every member (base), then the
   * out-of-`_members` corridors + doors, and clear the maps.
   */
  public override teardown(): void {
    super.teardown();
    for (const door of this._doorsByKey.values()) {
      if (!door.isDestroyed()) StuffApi.destruct(door as unknown as Stuff);
    }
    for (const corridor of this._corridorsByFloor.values()) {
      if (!corridor.isDestroyed()) StuffApi.destruct(corridor as unknown as Stuff);
    }
    this._unitsByKey.clear();
    this._corridorsByFloor.clear();
    this._doorsByKey.clear();
    this._provisionedFloors.clear();
    this._keywayByUnit.clear();
  }

  // ───────────────────── private helpers ─────────────────────

  private async lobby(): Promise<ExitableContainer | null> {
    const lobby = await StuffApi.singleton<Stuff>(DormWarren.LOBBY_PATH);
    return MixinApi.isExitable(lobby) && MixinApi.isContainer(lobby)
      ? (lobby as ExitableContainer)
      : null;
  }

  private async installLobbyUpExit(): Promise<void> {
    const lobby = await this.lobby();
    if (!lobby || lobby.getExit('up')) return;
    const up = StuffApi.createSync(() => new FloorStairExit(lobby, 1));
    await lobby.addExit(up);
  }

  private teardownRoom(key: string, room: MemberStuff): void {
    this.removeMember(room); // clears the WarrenMember back-ref
    // The caller has already persisted (reconcile captures first) or is
    // deleting the record (end-lease); mark-for-revert so the destruct
    // capture-on-destruct backstop doesn't redundantly re-capture a room
    // whose contents are mid-evacuation.
    (room as unknown as Persistable).markForRevert();
    StuffApi.destruct(room as unknown as Stuff); // its own exits tear down
    this._unitsByKey.delete(key);
  }

  private removeUnitDoor(unitKey: string): void {
    const door = this._doorsByKey.get(unitKey);
    this._doorsByKey.delete(unitKey);
    if (!door || door.isDestroyed()) return;
    const source = door.getSource();
    if (MixinApi.isExitable(source)) source.removeExit(door.getDirection());
    StuffApi.destruct(door as unknown as Stuff);
  }

  private hasLiveRoomOnFloor(n: number): boolean {
    for (const [key, room] of this._unitsByKey) {
      if (room.isDestroyed()) continue;
      const slot = ParcelRecord.slotOfExtent(key);
      if (slot?.floor === n) return true;
    }
    return false;
  }
}
