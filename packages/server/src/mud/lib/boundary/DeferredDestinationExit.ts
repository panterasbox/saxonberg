/**
 * DeferredDestinationExit — an `Exit` whose *destination Stuff* is faulted in
 * on first traversal, while the exit itself stays **eager**: its direction and
 * its destination **template path** are known and describable up front, with no
 * materialization.
 *
 * The reconstitution seam for content that doesn't exist until you walk toward
 * it — an elastic building's floors/rooms, a procedurally-generated level, a
 * per-player instanced space. Two live consumers today: `DormDoor` (a unit's
 * room) and `LazyFloorExit` (a floor's corridor).
 *
 * The split it enforces (and why the name says *destination*, not *lazy exit*):
 *
 *   - **Eager exit.** The Exit object lives in its source room's exit map, so
 *     `look` / a future map read `getDirection()` + `getDestinationTemplatePath()`
 *     and render the edge — the current room's exits are all present the moment
 *     you're in it — WITHOUT conjuring the far side. Describing an exit never
 *     materializes anything.
 *   - **Deferred destination.** The live `Stuff` behind the exit is faulted in
 *     only on `resolveDestination()` (traversal), cached as a within-session
 *     live ref (Pattern B), and re-materialized after a reap.
 *
 * `destinationTemplatePath` is the destination's **class** template — accurate
 * and eager (a real path, never a placeholder), so a map can label the edge
 * ("→ a dorm room"). For **multi-instance** destinations (many rooms share one
 * `DormRoom` template) that path identifies the class, not the specific clone —
 * so resolution CANNOT go through path lookup and instead runs the subclass's
 * {@link computeDestination} hook (`admit(unitKey)` / `ensureFloor(n)`). The
 * unique per-instance identity a global/explored map would need is held by the
 * subclass (the unit extent / floor) and can be surfaced when that feature
 * lands; only the live Location is ever lazy.
 *
 * The base owns the fault-in lifecycle (compute → cache → re-resolve + the sync
 * getter); the two genuine points of variation stay on the subclass:
 * {@link computeDestination} (what to materialize) and `canTraverse`
 * (passability — a key check vs. a reachability check have nothing in common).
 */

import Exit from './Exit';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';

export interface DeferredDestinationOptions {
  direction: string;
  source: Stuff & Container;
  /**
   * The destination's template path — eager + accurate. Stored on the base so
   * `getDestinationTemplatePath()` returns it (display / mapping) without
   * materializing. For multi-instance destinations it is the shared class
   * template; the specific clone is reached via {@link computeDestination}, so
   * the base never resolves the destination *through* this path.
   */
  destinationTemplatePath: string;
}

export default abstract class DeferredDestinationExit extends Exit {
  /** Cached live destination (Pattern B live ref); re-resolved after a reap. */
  private live: (Stuff & Container) | null = null;

  constructor(opts: DeferredDestinationOptions) {
    // The accurate destination template path lands in the base's
    // `_destinationPath` slot — read only by `getDestinationTemplatePath()`.
    // Resolution is overridden below to go through `computeDestination`, so the
    // base's path-resolution (ambiguous for a shared multi-instance template)
    // is never reached.
    super({
      direction: opts.direction,
      source: opts.source,
      destinationPath: opts.destinationTemplatePath,
    });
  }

  /**
   * Fault in (or re-materialize) the live destination `Stuff`. The single
   * point of variation between deferred exits — e.g. `warren.admit(unitKey)`
   * or `warren.ensureFloor(n)`. Called only from `resolveDestination`, on the
   * cold path (no cached live ref).
   */
  protected abstract computeDestination(): Promise<Stuff & Container>;

  /** Materialize on demand, caching the live ref; re-resolve after a reap. */
  public override async resolveDestination(): Promise<Stuff & Container> {
    if (this.live && !this.live.isDestroyed()) return this.live;
    this.live = await this.computeDestination();
    return this.live;
  }

  /** Sync destination — the cached live ref, else fail loudly (the caller must
   *  `await resolveDestination()` first). Deliberately does NOT fall through to
   *  the base path-resolution, which would be ambiguous for a shared template. */
  public override getDestination(): Stuff & Container {
    if (this.live && !this.live.isDestroyed()) return this.live;
    throw new Error(
      'DeferredDestinationExit: destination not materialized; ' +
        'await resolveDestination() first.',
    );
  }
}
