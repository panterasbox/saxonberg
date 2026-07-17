/**
 * FloorStairExit — a `DeferredDestinationExit` that materializes a dorm floor's
 * corridor on demand (the lobby's `up`, and each corridor's `up`).
 *
 * The elastic dorm building keeps NO runtime graph across restart: only the
 * durable slot set (the provisioned unit parcels) survives. This exit is the
 * reconstitution seam — eager on its face (direction `up`, destination template
 * `CORRIDOR_TEMPLATE`, so `look`/a map describe it without conjuring the floor)
 * with a deferred destination: `computeDestination` asks the `DormWarren` to
 * `ensureFloor(targetFloor)`, cloning the corridor + its unit doors lazily on
 * the first `up` traversal (or after a reap). The live corridor is cached by
 * the base (corridors share a template path, so path resolution would be
 * ambiguous — the base routes through the hook, never the path).
 *
 * Impassability (a floor with no provisioned units) is a **sync** decision in
 * `canTraverse` (the real move path checks it before `resolveDestination`),
 * read off the warren's sync `floorReachable(n)`.
 */

import DeferredDestinationExit from '../../../lib/boundary/DeferredDestinationExit';
import { type TraversalGuard } from '../../../lib/boundary/Exit';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';
import DormWarren from './DormWarren';

export default class FloorStairExit extends DeferredDestinationExit {
  /** The floor this exit climbs TO (lobby's up → 1; corridor n's up → n+1). */
  private targetFloor: number;

  constructor(source: Stuff & Container, targetFloor: number) {
    super({
      direction: 'up',
      source,
      // The destination's class template (accurate + eager); the specific
      // floor's corridor is faulted in via `computeDestination`.
      destinationTemplatePath: DormWarren.CORRIDOR_TEMPLATE,
    });
    this.targetFloor = targetFloor;
  }

  /**
   * Materialize (or re-materialize) the target floor's corridor. `ensureFloor`
   * returns null when the floor has no provisioned units; that path is guarded
   * off by `canTraverse` before the move ever calls here, so a null is an
   * internal error worth surfacing.
   */
  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = await DormWarren.resolve();
    const corridor = await warren.ensureFloor(this.targetFloor);
    if (!corridor) {
      throw new Error(
        `FloorStairExit: floor ${this.targetFloor} has no provisioned units`,
      );
    }
    return corridor;
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
