/**
 * LazyFloorExit — a thin `Exit` subclass that materializes a dorm floor's
 * corridor on demand (the lobby's `up`, and each corridor's `up`).
 *
 * The elastic dorm building keeps NO runtime graph across restart: only the
 * durable slot set (the provisioned unit parcels) survives. A LazyFloorExit
 * is the reconstitution seam — its `resolveDestination()` asks the
 * `DormWarren` to `ensureFloor(targetFloor)`, cloning the corridor + its
 * unit doors lazily on the first `up` traversal (or after a reap).
 *
 * The base `Exit` resolves a fixed destination; this one computes it. The
 * live corridor is cached (a within-session live ref — corridors share a
 * template path, so path resolution would be ambiguous), and re-resolved
 * when it has been reaped. Impassability (a floor with no provisioned units)
 * is a **sync** decision in `canTraverse` (the real move path checks it
 * before `resolveDestination`), read off the warren's sync
 * `floorReachable(n)`.
 */

import Exit, { type TraversalGuard } from '../../../lib/boundary/Exit';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import DormWarren from './DormWarren';

export default class LazyFloorExit extends Exit {
  /** The floor this exit climbs TO (lobby's up → 1; corridor n's up → n+1). */
  private targetFloor: number;

  /** Cached live corridor (Pattern B live ref); re-resolved after a reap. */
  private live: (Stuff & Container) | null = null;

  constructor(source: Stuff & Container, targetFloor: number) {
    // The base requires a destination or destinationPath; hand it the
    // (singleton) warren path as a harmless placeholder — every real
    // resolution overrides through `resolveDestination` / the sync getter.
    super({
      direction: 'up',
      source,
      destinationPath: DormWarren.WARREN_PATH,
    });
    this.targetFloor = targetFloor;
  }

  /**
   * Materialize (or re-materialize) the target floor's corridor and return
   * it. `ensureFloor` returns null when the floor has no provisioned units;
   * that path is guarded off by `canTraverse` before the move ever calls
   * here, so a null is an internal error worth surfacing.
   */
  public override async resolveDestination(): Promise<Stuff & Container> {
    if (this.live && !this.live.isDestroyed()) return this.live;
    const warren = await DormWarren.resolve();
    const corridor = await warren.ensureFloor(this.targetFloor);
    if (!corridor) {
      throw new Error(
        `LazyFloorExit: floor ${this.targetFloor} has no provisioned units`,
      );
    }
    this.live = corridor;
    return corridor;
  }

  /** Sync destination — the cached live corridor, else fail loudly. */
  public override getDestination(): Stuff & Container {
    if (this.live && !this.live.isDestroyed()) return this.live;
    throw new Error(
      'LazyFloorExit: destination not materialized; await resolveDestination()',
    );
  }

  /**
   * A floor with no provisioned units is impassable — you can't climb to a
   * floor that doesn't exist. Read the warren's sync reachability cache
   * (maintained at warm + on provision), so the standard sync `canTraverse`
   * gate (which fires before `resolveDestination`) rejects cleanly.
   */
  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (!base.ok) return base;
    const warren = DormWarren.peek();
    if (warren && !warren.floorReachable(this.targetFloor)) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The stairwell goes no higher.',
      };
    }
    return base;
  }
}
