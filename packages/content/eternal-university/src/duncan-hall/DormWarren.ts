/**
 * DormWarren — the elastic, two-tier room-collection manager for Duncan
 * Hall's dorms wing. A singleton content subclass of the shared
 * {@link HoldingWarren} base (residences D12/D16 — the two-tier
 * holdings + circulation machinery was lifted there; this class keeps
 * the dorm *policy*): rooms are keyed holdings (unit parcel extents),
 * floors are linear-plan circulation nodes (`main:<floor>`), doors are
 * entry edges. The public surface (`admit`, `ensureFloor`,
 * `ensureUnitDoor`, `keywayOf`, `dropUnit`, `roomFor`,
 * `corridorForUnit`, `floorReachable`) is unchanged — the existing
 * suite pins it.
 *
 * The building starts as JUST the lobby and provisions nothing in
 * advance; it grows on provisioning and reconstitutes from the durable
 * slot set. `_hostMember` stays **null forever** — entry is driven by
 * `admit`, vertical travel by `FloorStairExit`s. See
 * `docs/subsystems/residence.md`.
 */

import { HoldingWarren } from '@saxonberg/server/mud/lib/location/HoldingWarren';
import type { Attachment } from '@saxonberg/server/mud/lib/location/Warren';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { ParcelRecord } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import type { LockType } from '@saxonberg/server/mud/lib/lock/Lock';
import Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import FloorStairExit from './FloorStairExit';
import DormDoor from './DormDoor';
import DormRoom from './DormRoom';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';

type MemberStuff = Stuff & Container;
type ExitableContainer = Stuff & Container & Exitable;

const DormWarrenBase = SingletonMixin(PostRegistrationMixin(HoldingWarren));

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
  /** Units per floor — the AUTHORED default under the operator's
   *  `dorm.roomsPerFloor` dial (D10: the graduated knob). */
  static readonly ROOMS_PER_FLOOR = 12;
  /** The AppSettings key the per-floor dial lives under. */
  static readonly ROOMS_PER_FLOOR_KEY = 'dorm.roomsPerFloor';
  /** The lock technology dorm doors use — a brass pin-tumbler (a keycard/
   *  electronic tech is a downtown/corporate thing, deferred). */
  static readonly DORM_LOCK_TECH: LockType = 'pin-tumbler';

  /** The dorm carries a generous shipped cap (the institution has no
   *  roster; the operator's `dorm.roomCap` dial can lower or raise it). */
  public override defaultCapacity = 240;

  /** Resolve the singleton (async — clones on first access). */
  static async resolve(): Promise<DormWarren> {
    return StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
  }

  /** Peek at the live singleton without forcing a clone (sync). */
  static peek(): DormWarren | null {
    return StuffApi.findByTemplatePath<DormWarren>(DormWarren.WARREN_PATH) ?? null;
  }

  /** The per-floor room count: the operator's dial, else the authored
   *  default (`ROOMS_PER_FLOOR` — the graduated `static readonly`). */
  public roomsPerFloor(): number {
    try {
      const raw = AppApi.setting(DormWarren.ROOMS_PER_FLOOR_KEY);
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* cache not warmed — authored default */
    }
    return DormWarren.ROOMS_PER_FLOOR;
  }

  /** The dorms wing's parent extent is a fact about the building. */
  public override getParentExtent(): string {
    return this.parentExtent || DormWarren.DORMS_EXTENT;
  }

  /** Feed the plan the runtime dial (a linear plan's frontage count). */
  protected override frontagesDial(): number {
    return this.roomsPerFloor();
  }

  /**
   * On warm: rebuild the sync reachability cache from the durable slot
   * set and install the lobby's `up` `FloorStairExit` (→
   * `ensureFloor(1)`), so the building reconstitutes from just the
   * parcel rows.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister?.(context);
    await this.refreshProvisioned();
    await this.installLobbyUpExit();
  }

  // ─────────────── the dorm's floor-shaped surface ────────────────

  /** The live corridor for floor `n`, built if needed (null when the
   *  floor is unreachable). */
  public async ensureFloor(n: number): Promise<MemberStuff | null> {
    return this.ensureNode(`main:${n}`);
  }

  /** Sync floor reachability (any provisioned unit on `n` or above). */
  public floorReachable(n: number): boolean {
    return this.nodeReachable(`main:${n}`);
  }

  /** Ensure the `DormDoor` for `unitKey` hangs on its (live) floor. */
  public async ensureUnitDoor(unitKey: string): Promise<void> {
    return this.ensureEntry(unitKey);
  }

  /** The `DormDoor` for a unit (for the `unlock`/lease-gate seam), or null. */
  public doorFor(unitKey: string): DormDoor | null {
    return (this.entryFor(unitKey) as DormDoor | null) ?? null;
  }

  /** The live room for a unit (if materialized), or null. */
  public roomFor(unitKey: string): MemberStuff | null {
    return this.holdingFor(unitKey);
  }

  /** The live corridor for a unit's floor (if materialized), or null. */
  public corridorForUnit(unitKey: string): MemberStuff | null {
    const slot = ParcelRecord.slotOfExtent(unitKey);
    if (!slot) return null;
    return this.circulationForNode(`main:${slot.floor}`);
  }

  /** Tear a unit down (end-lease). See {@link HoldingWarren.dropHolding}. */
  public async dropUnit(
    unitKey: string,
    opts: { revert?: boolean } = {},
  ): Promise<void> {
    return this.dropHolding(unitKey, opts);
  }

  // ─────────────── HoldingWarren policy hooks ─────────────────────

  /**
   * Stand one unit up, whole: clone the `DormRoom` shell, register it
   * as a member, then `restoreOrSeed` keyed on the unit extent (the
   * keyed-holder ground pattern) — the exact pre-lift order.
   */
  protected async standUpHolding(key: string): Promise<MemberStuff> {
    const room = await this.createMemberSerialized();
    this.addMember(room);
    await PersistableApi.restoreOrSeed(room, key);
    return room;
  }

  /** Every minted floor is a corridor clone. */
  protected circulationTemplateFor(): string | null {
    return DormWarren.CORRIDOR_TEMPLATE;
  }

  /**
   * Wire a fresh floor corridor into the stairwell: `down` to the floor
   * below (the lobby for n=1, else the lower corridor — built
   * recursively), and this floor's `up` `FloorStairExit`.
   */
  protected async wireCirculationNode(
    nodeId: string,
    corridor: MemberStuff,
  ): Promise<void> {
    const n = Number(nodeId.slice(nodeId.lastIndexOf(':') + 1));
    const corrEx = this.requireExitable(corridor);

    // Wire `down` to the floor below (one-way; the below-side `up` is
    // that floor's own FloorStairExit / the lobby's).
    const below = n === 1 ? await this.lobby() : await this.ensureFloor(n - 1);
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
  }

  /** The unit's `DormDoor`, hung on its floor corridor as `unit-<pos>`. */
  protected async entryEdgeFor(
    key: string,
    corridor: ExitableContainer,
  ): Promise<Exit | null> {
    const slot = ParcelRecord.slotOfExtent(key);
    if (!slot) return null;
    const dir = `unit-${slot.pos}`;
    const existing = corridor.getExit(dir);
    if (existing) return existing as unknown as Exit;
    const door = StuffApi.createSync(() => new DormDoor(corridor, key, dir));
    await corridor.addExit(door);
    return door as unknown as Exit;
  }

  // ─────────────── Warren policy hooks ────────────────────────────

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
   * Wire a room's one-way return leg to ITS floor corridor (not a
   * host). Reads the room's floor from its stashed key; ensures the
   * corridor; installs `out` (room → corridor) as a live-ref one-way
   * exit. The corridor → room direction is the unit's `DormDoor`
   * (`ensureUnitDoor`), so the two never duplicate.
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

  // ───────────────────── private helpers ──────────────────────────

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
}
