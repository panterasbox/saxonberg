/**
 * ExitableVessel — an enterable, portable-by-shape container.
 *
 * Composition:
 *   `DoorBearingMixin(ExitableMixin(AdornableMixin(Vessel)))`.
 * `Vessel` already carries the describable-physical baseline
 * (`Visible`/`Perceptible`/`Tangible`) + Container + Containable, so nothing
 * is re-added here beyond the enterable-container machinery.
 *
 * The result is a container-object that is both Containable (so it can live
 * inside a Location or another ExitableVessel) and Container + Exitable +
 * DoorBearing (so players can enter it, look/act inside it, and so it
 * can carry a defining Door — wardrobe, refrigerator, car).
 *
 * Containment constraint (enforced by `ContainmentApi.move`): an
 * ExitableVessel may only live inside another Exitable. This is the
 * "carry a chest with someone in it" exploit-closer — vessels cannot land
 * in an Avatar's inventory, even empty.
 *
 * Exit semantics: the explicit exit map is always consultable. In
 * addition the vessel holds its own `out` and `in` pair — ⭐ CLONES of
 * `/platform/idea/exits/vessel-out` and `…/vessel-in`, minted once at
 * `postRegister` and REBOUND whenever the vessel's environment or door
 * changes. `getExit('out')` and `getEntryExit()` (used by `go
 * <vessel-keyword>`) return them, rebinding first if they are stale.
 *
 * ⭐ They used to be `new Exit(...)` built on demand, which is why they
 * could not say anything an author had written: there was no row. Now
 * the prose is content, with the vessel's name interpolated per site.
 *
 * Door wiring: when the vessel composes a non-null `door`, every
 * synthesized exit picks it up (so `canTraverse` blocks until the door
 * opens). Synthesized exits register themselves in `door.attachedTo`
 * the same way explicit exits do via `addExit`, so `Door.detach()`
 * walks back and clears refs symmetrically.
 *
 * **`Adornable` is declared here, not on the `Vessel` base.** The Door →
 * `BoundaryAnchor` retrofit needs `getFixtures()` so the vessel's defining
 * Door can surface as a fixture on the vessel side of the (vessel,
 * environment) Boundary pair (`installVesselDoorBoundary`). That is an
 * `ExitableVessel`-only need, so the fixture machinery lives here rather
 * than burdening every bare Vessel (a bag, a cart) with it.
 */

import { Vessel } from '../stuff/Vessel';
import { ExitableMixin } from './Exitable';
import { AdornableMixin } from './Adornable';
import { DoorBearingMixin } from './DoorBearing';
import Exit from './Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type Door from '../../platform/thing/Door';
import { StuffApi } from '../../api/stuff';
import { BoundaryApi } from '../../api/boundary';
import { PerceptionApi } from '../../api/perception';
import { MixinApi } from '../../api/mixin';
import { PostRegistrationMixin } from '../stuff/PostRegistration';
import { TemplatePaths } from '../paths';

/**
 * ⭐ `PostRegistrationMixin` is composed for ONE reason: a vessel's `in`
 * and `out` exits are CLONES OF ROWS now, and a clone is async. They are
 * minted once, here, and then REBOUND as the vessel moves — because a
 * vessel is a room that goes places, so the same two exits join a
 * different pair of rooms at every stop. That is the whole reason
 * `Exit.rebind` exists.
 *
 * ⚠ Consequence: `StuffApi.createSync(() => new SomeVessel())` now
 * throws. No production site does it (`lint:create-sites` names one if
 * it ever appears).
 */
const ExitableVesselBase = PostRegistrationMixin(
  DoorBearingMixin(ExitableMixin(AdornableMixin(Vessel)))
);

export default class ExitableVessel extends ExitableVesselBase {
  /**
   * The vessel's own two exits — clones of
   * `/platform/idea/exits/vessel-out` and `…/vessel-in`, minted once at
   * `postRegister` and rebound whenever the vessel moves or its door
   * changes. `null` only before `postRegister` has run.
   */
  private outCache: Exit | null = null;
  private outCacheEnvId: string | null = null;
  private entryCache: Exit | null = null;
  private entryCacheEnvId: string | null = null;

  /**
   * Mint the pair from their rows, and bind them if the vessel is
   * already somewhere.
   */
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    this.outCache = await StuffApi.clone<Exit>(TemplatePaths.vesselOutExit);
    this.entryCache = await StuffApi.clone<Exit>(TemplatePaths.vesselInExit);
    this.rebindVesselExits(this.getContainer());
  }

  /**
   * Point the held pair at `env`, or leave them unbound when the vessel
   * is nowhere. Sync — `onMoved` is, and that is the whole reason the
   * exits are pre-minted rather than cloned on demand.
   *
   * The per-site prose keeps the vessel's NAME in it (the row carries a
   * generic fallback for a vessel with no presentation), and `bind` is
   * delta-aware so everything else the row authored survives.
   */
  private rebindVesselExits(env: (Stuff & Container) | null): void {
    const out = this.outCache;
    const entry = this.entryCache;
    if (!out || !entry) return;
    if (!env) {
      this.outCacheEnvId = null;
      this.entryCacheEnvId = null;
      return;
    }
    const vesselName = (this as unknown as Stuff).getPresentation();
    const door = this.getDoor();
    const outOpts = {
      direction: 'out',
      source: this as unknown as Stuff & Container,
      destination: env,
      door,
      messageOut: `{{ mover }} leaves the <thing>${vesselName}</thing>.`,
      messageIn: `{{ mover }} emerges from the <thing>${vesselName}</thing>.`,
    };
    const entryOpts = {
      direction: 'in',
      source: env,
      destination: this as unknown as Stuff & Container,
      door,
      messageOut: `{{ mover }} enters the <thing>${vesselName}</thing>.`,
      messageIn: `{{ mover }} enters from outside.`,
    };
    if (out.isBound()) out.rebind(outOpts);
    else out.bind(outOpts);
    if (entry.isBound()) entry.rebind(entryOpts);
    else entry.bind(entryOpts);
    if (door) {
      door.attachExit(out);
      door.attachExit(entry);
    }
    this.outCacheEnvId = env.stuffId;
    this.entryCacheEnvId = env.stuffId;
  }

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

  public override obviousExitsFor(viewer: Stuff): Exit[] {
    const base = super.obviousExitsFor(viewer);
    const out = this.getOrSynthesizeOutExit();
    // The synthesized `out` rides the same viewer-aware gate as the
    // explicit exits (an un-concealed `out` always perceives-true).
    if (out && PerceptionApi.perceives(viewer, out)) base.push(out);
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
    // ⚠ "already anchored" is now "already INSTALLED": a boundary mints
    // its pair at registration and keeps it across detach, so the
    // presence of anchors says nothing about whether they are on a host.
    if (door.getAnchorA()?.getAdornedTo() || door.getAnchorB()?.getAdornedTo()) {
      return;
    }
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
    if (this.entryCacheEnvId !== env.stuffId) this.rebindVesselExits(env);
    return this.entryCache ?? undefined;
  }

  private getOrSynthesizeOutExit(): Exit | undefined {
    const env = this.getContainer();
    if (!env) return undefined;
    if (this.outCacheEnvId !== env.stuffId) this.rebindVesselExits(env);
    return this.outCache ?? undefined;
  }

  /**
   * Drop both synthesized-exit caches and unhook the cached exits from
   * any door's `attachedTo` set. The next access (if still warranted)
   * will recreate them with the current `door` and re-register.
   */
  /**
   * Unhook the pair from any door and mark them stale. ⚠ The EXITS are
   * kept — they are this vessel's, minted once; only the binding is
   * dropped, and the next access rebinds them against the current
   * environment and door.
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
    this.outCacheEnvId = null;
    this.entryCacheEnvId = null;
  }
}
