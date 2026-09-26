/**
 * UpstairsExit — the generic stairwell edge of a holdings institution
 * (residences D12): a `DeferredDestinationExit` that materializes the
 * NEXT circulation node on demand (`ensureNode`), gated synchronously
 * on the plan's reachability — a floor with no provisioned holding on
 * it or above is impassable ("the stairs go no higher"), the dorm's
 * `FloorStairExit` rule generalized over the {@link OuterWarren}
 * base.
 */

import DeferredDestinationExit from '@saxonberg/server/mud/lib/boundary/DeferredDestinationExit';
import { type TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

export default class UpstairsExit extends DeferredDestinationExit {
  private warrenPath = '';
  private targetNode = '';

  /**
   * ⭐ What the constructor used to take, as a set-once step. The exit
   * is a clone of `/system/residence/idea/exits/upstairs` now, so
   * `direction`, `source` and the destination row arrive through
   * `Exitable.installExit`'s `bind`; only the two facts a ROW cannot
   * know — which warren, which node — arrive here.
   */
  public configureUpstairs(warren: OuterWarren, targetNode: string): void {
    this.warrenPath = warren.getTemplatePath() ?? '';
    this.targetNode = targetNode;
  }

  private warren(): OuterWarren | null {
    return StuffApi.findByTemplatePath<OuterWarren>(this.warrenPath) ?? null;
  }

  protected override async computeDestination(): Promise<Stuff & Container> {
    const warren = this.warren();
    const room = warren ? await warren.ensureNode(this.targetNode) : null;
    if (!room) {
      throw new Error(
        `UpstairsExit: node ${this.targetNode} has no provisioned holdings`,
      );
    }
    return room;
  }

  public override canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (!base.ok) return base;
    const warren = this.warren();
    if (warren && !warren.nodeReachable(this.targetNode)) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The stairs go no higher.',
      };
    }
    return base;
  }
}
