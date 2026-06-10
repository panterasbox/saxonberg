/**
 * ExitableVessel — an enterable, portable-by-shape container.
 *
 * Composition:
 *   `DoorBearingMixin(ExitableMixin(VisibleMixin(Vessel)))`
 *   where `Vessel = ContainerMixin(Thing)` and `Thing = ContainableMixin(Stuff)`.
 *
 * The result is a Thing that is both Containable (so it can live inside
 * a Location or another ExitableVessel) and Container + Exitable +
 * DoorBearing (so players can enter it, look/act inside it, and so it
 * can carry a defining Door — wardrobe, refrigerator, car).
 *
 * Containment constraint (enforced by `ContainmentApi.move`): an
 * ExitableVessel may only live inside another Exitable. This is the
 * "carry a chest with someone in it" exploit-closer — vessels cannot land
 * in an Avatar's inventory, even empty.
 *
 * Exit semantics: the explicit exit map is always consultable. In addition,
 * `getExit('out')` synthesizes a one-way exit from this vessel to its
 * current environment, and `getEntryExit()` synthesizes the matching
 * one-way exit from the current environment into this vessel — used by
 * `go <vessel-keyword>`. Both are cached and invalidated when the vessel's
 * environment changes or when the vessel's `door` is reassigned.
 *
 * Door wiring: when the vessel composes a non-null `door`, every
 * synthesized exit picks it up (so `canTraverse` blocks until the door
 * opens). Synthesized exits register themselves in `door.attachedTo`
 * the same way explicit exits do via `addExit`, so `Door.detach()`
 * walks back and clears refs symmetrically.
 */

import { Vessel } from '../stuff/Vessel';
import { ExitableMixin } from './Exitable';
import { VisibleMixin } from '../description/Visible';
import { DoorBearingMixin } from './DoorBearing';
import Exit from './Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type Door from './Door';
import type { Adornable } from './Adornable';
import { StuffApi } from '../../api/stuff';
import { DescribeApi } from '../../api/describe';
import { BoundaryApi } from '../../api/boundary';
import { MixinApi } from '../../api/mixin';

const ExitableVesselBase = DoorBearingMixin(ExitableMixin(VisibleMixin(Vessel)));

export default class ExitableVessel extends ExitableVesselBase {
  /**
   * Cached synthesized `'out'` exit. Keyed implicitly by the current
   * environment; invalidated via `outCacheEnvId` when it changes.
   */
  private outCache: Exit | null = null;
  private outCacheEnvId: string | null = null;

  /**
   * Cached synthesized entry exit (env → vessel). Same keying/invalidation
   * pattern as the `'out'` cache.
   */
  private entryCache: Exit | null = null;
  private entryCacheEnvId: string | null = null;

  public override getExit(direction: string): Exit | undefined {
    const explicit = this.getExits().get(direction);
    if (explicit) return explicit;

    if (direction === 'out') return this.getOrSynthesizeOutExit();

    return super.getExit(direction);
  }

  public override getObviousExits(): Exit[] {
    const base = super.getObviousExits();
    const out = this.getOrSynthesizeOutExit();
    if (out && !out.isHidden()) base.push(out);
    return base;
  }

  /**
   * Invalidate the synthesized exit caches AND migrate the door's
   * BoundaryAnchor pair from (vessel, oldEnv) to (vessel, newEnv).
   * Fires once per `ContainmentApi.move` transition.
   *
   * The (vessel, env) anchor-pair is the runtime install on the
   * vessel side of the door's Boundary representation: a closed
   * vessel-door blocks light flowing between vessel interior and
   * its current environment. As the vessel relocates, the boundary
   * follows.
   */
  public onMoved(
    _from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    this.invalidateSynthesizedExits();
    const door = this.getDoor();
    if (door) {
      // Destruct any existing (vessel, oldEnv) anchor pair via the
      // Boundary subclass-bypass seam — we don't want Door.detach's
      // `attachedTo` cleanup, just the anchor migration.
      door._detachAndDestructAnchors();
      this.installVesselDoorBoundary(door, to);
    }
  }

  /**
   * Door change: drop any cached synthesized exits (so the next access
   * recreates them with the new door) and migrate the BoundaryAnchor
   * pair on (vessel, environment) — old door's anchors are torn down,
   * new door's anchors are installed if the vessel is currently
   * placed.
   */
  public override setDoor(door: Door | null): void {
    const old = this.getDoor();
    if (door === old) return;
    this.invalidateSynthesizedExits();
    if (old) {
      old._detachAndDestructAnchors();
    }
    super.setDoor(door);
    if (door) {
      this.installVesselDoorBoundary(door, this.getContainer());
    }
  }

  /**
   * Anchor the vessel's defining door on (vessel, env). No-op when
   * the env is null (vessel hasn't been placed yet) or the door
   * already has anchors (re-install would throw — caller should
   * detach first).
   */
  private installVesselDoorBoundary(
    door: Door,
    env: (Stuff & Container) | null
  ): void {
    if (!env) return;
    if (door.getAnchorA() || door.getAnchorB()) return;
    // Cast both sides to plain `Stuff` (sound — vessel and env are
    // both Stuff) and let `MixinApi.isAdornable` narrow them to
    // `Stuff & Adornable` via its type predicate. The earlier
    // pre-assert-then-verify shape double-cast around the predicate;
    // this lets the predicate's narrowing flow through to the
    // BoundaryApi call site.
    const vesselStuff = this as unknown as Stuff;
    const envStuff = env as unknown as Stuff;
    if (!MixinApi.isAdornable(vesselStuff)) return;
    if (!MixinApi.isAdornable(envStuff)) return;
    BoundaryApi.attachExistingBoundary({
      boundary: door,
      hostA: vesselStuff,
      hostB: envStuff,
    });
  }

  /**
   * Synthesize the entry exit from the vessel's current environment into
   * this vessel. Returns `undefined` when the vessel has no environment
   * (i.e. it isn't placed anywhere). Used by `go <vessel-keyword>` so the
   * command controller doesn't need to hand-build an `Exit`.
   */
  public getEntryExit(): Exit | undefined {
    const env = this.getContainer();
    if (!env) return undefined;

    if (this.entryCache && this.entryCacheEnvId === env.stuffId) {
      return this.entryCache;
    }

    const vesselName = DescribeApi.getDisplayName(this as unknown as Stuff);
    const door = this.getDoor();
    const exit = StuffApi.createSync(() => new Exit({
      direction: 'in',
      source: env,
      destination: this as unknown as Stuff & Container,
      door,
      messageOut: `{{ mover }} enters the <name>${vesselName}</name>.`,
      messageIn: `{{ mover }} enters from outside.`,
    }));
    if (door) door.attachExit(exit);
    this.entryCache = exit;
    this.entryCacheEnvId = env.stuffId;
    return exit;
  }

  private getOrSynthesizeOutExit(): Exit | undefined {
    const env = this.getContainer();
    if (!env) return undefined;

    if (this.outCache && this.outCacheEnvId === env.stuffId) {
      return this.outCache;
    }

    const vesselName = DescribeApi.getDisplayName(this as unknown as Stuff);
    const door = this.getDoor();
    const exit = StuffApi.createSync(() => new Exit({
      direction: 'out',
      source: this as unknown as Stuff & Container,
      destination: env,
      door,
      messageOut: `{{ mover }} leaves the <name>${vesselName}</name>.`,
      messageIn: `{{ mover }} emerges from the <name>${vesselName}</name>.`,
    }));
    if (door) door.attachExit(exit);
    this.outCache = exit;
    this.outCacheEnvId = env.stuffId;
    return exit;
  }

  /**
   * Drop both synthesized-exit caches and unhook the cached exits from
   * any door's `attachedTo` set. The next access (if still warranted)
   * will recreate them with the current `door` and re-register.
   */
  private invalidateSynthesizedExits(): void {
    const outDoor = this.outCache?.getDoor();
    if (this.outCache && outDoor) {
      outDoor.detachExit(this.outCache);
    }
    const entryDoor = this.entryCache?.getDoor();
    if (this.entryCache && entryDoor) {
      entryDoor.detachExit(this.entryCache);
    }
    this.outCache = null;
    this.outCacheEnvId = null;
    this.entryCache = null;
    this.entryCacheEnvId = null;
  }
}
