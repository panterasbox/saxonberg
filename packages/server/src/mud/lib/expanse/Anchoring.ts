/**
 * Anchoring — ⭐ **a craft that answers `anchor`** (controller-liquidity
 * W8, Appendix B). Two kinds of craft let go an anchor and the act is the
 * same: a small boat over goes her killick where she floats (the river's
 * boat — the transport mod's `Boat`), and a ship under way stops where she
 * lies (`Voyaging`, the kernel `Ship`). What affords it differs; the verb
 * asks one question.
 *
 * Before this the controller forked on the two kinds itself — a small
 * craft's `letGoAnchor`, then a ship's helm rule, course and `anchorHere`
 * — so a rewritten `anchor` controller had to copy who may take the helm
 * and whether she is under way.
 *
 * ⭐ The craft answers with a reason and the facts; `AnchorController`
 * writes the words. ⚠ A small boat's killick says its own line (the
 * water's: it holds where the water is slack, drags where it is not) —
 * `line` on the drag refusal and the done facts carries it; wording it
 * from facts is the transport/water lane's.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActPlan, ActRefusal } from '../craft/ActPlan';

/** ⭐ Every reason a craft refuses `anchor` — `AnchorController` words each. */
export type AnchorRefusal =
  | ActRefusal<'not-her-master'>
  | ActRefusal<'not-under-way'>
  /** The killick went over and did not hold: the water's own sentence. */
  | ActRefusal<'anchor-drags', { line: string }>;

/** What the anchoring's done words need. */
export interface AnchorDone {
  /** The water's own line for a killick that held; `null` = a ship stopped. */
  line: string | null;
}

/** An anchoring: instant (`durationMs: 0`); the craft stops at completion. */
export type AnchorPlan = ActPlan<undefined, AnchorDone, AnchorRefusal>;

/** A craft that answers `anchor`. */
export interface Anchoring {
  /**
   * May `actor` let go her anchor, and if so the act — or `null` when she
   * has no anchor to let go (a boat with no killick aboard), so the verb
   * may ask the craft she lies in next.
   */
  anchorPlanFor(actor: Stuff): Promise<AnchorPlan | AnchorRefusal | null>;
}

/**
 * ⭐ **`AnchoringMixin` — the anchor protocol, as a mixin.**
 *
 * IS: a craft that can stop where it floats — a boat with a killick, a ship
 * under way. IS NOT: a raft drifting with nothing to let go, nor a place.
 *
 * ⚠ The default has nothing to let go (`null`); a host overrides.
 */
export function AnchoringMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class AnchoringMixin extends Base implements Anchoring {
    static _mixinName: string = 'AnchoringMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook The craft's anchoring, or a refusal; the default carries no anchor. */
    public async anchorPlanFor(_actor: Stuff): Promise<AnchorPlan | AnchorRefusal | null> {
      return null;
    }
  };
}
