/**
 * HandWorkedMixin — ⭐ **a vessel whose CONTENTS are worked by hand, not a
 * build** (dairy D5), declared as what the thing IS: a butter churn is not
 * assembling a recipe from banked ingredients — it holds a charge of cream
 * as bulk, and working it changes what that cream IS. `churn` (the
 * dairying pack's verb, controller-liquidity W18) asks this vessel its
 * {@link HandWorked.handWorkPlan}, which ends in
 * {@link HandWorked.workByHand}: the outcome is what the working came to,
 * in facts the controller words, or `null` when there was nothing in it to
 * work (the default).
 *
 * ⚠ Why not a build vessel: a `pour` into a build vessel BANKS the matter
 * as a recipe contribution and drains the source — cream poured into a
 * build-vessel churn would vanish into the buffer instead of filling it.
 *
 * ⚠ The VIEW is the composer's: a kernel mixin does not name a pack's
 * verb, so the churn (`trade-dairying`) affords `churn` on its own class.
 */

import type { NestingConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActPlan } from './ActPlan';

/** Working a charge by hand — a churn takes a while to come, ms. */
const CHURN_MS = 8000;
/** What working a charge by hand costs, W. */
const CHURN_EFFORT_W = 150;

/**
 * ⭐ What working a charge by hand came to — facts, never words
 * (controllers-are-io D4); the `churn` controller words each.
 */
export type HandWorkFacts = {
  result:
    /** It came — the butter is there. */
    | 'came'
    /** It came, soft and greasy: too warm. */
    | 'came-greasy'
    /** Too cold to break. */
    | 'too-cold'
    /** Only cream will churn. */
    | 'not-cream'
    /** It came before; there is butter waiting. */
    | 'already-come';
};

/**
 * A hand-working plan: how long and how hard, and what it came to — the
 * facts, or `null` when there was nothing in the vessel to work.
 */
export type HandWorkPlan = ActPlan<undefined, HandWorkFacts | null>;

/** A vessel whose contents are worked by hand. */
export interface HandWorked {
  /** ⭐ The working, planned by the vessel (a churn takes a while to come). */
  handWorkPlan(): HandWorkPlan;
  workByHand(): ActOutcome<HandWorkFacts> | null;
}

export function HandWorkedMixin<TBase extends NestingConstructor<Stuff>>(Base: TBase) {
  return class HandWorkedMixin extends Base implements HandWorked {
    static _mixinName = 'HandWorkedMixin';
    static _mixinKind = 'protocol' as const;

    /** The charge worked by hand, and what came of it. */
    public handWorkPlan(): HandWorkPlan {
      return {
        ok: true,
        durationMs: CHURN_MS,
        effortW: CHURN_EFFORT_W,
        facts: undefined,
        onComplete: () => ({ ok: true, facts: this.workByHand()?.facts ?? null }),
      };
    }

    /** @hook What working the charge came to — `null` when there was nothing to work. */
    public workByHand(): ActOutcome<HandWorkFacts> | null {
      return null;
    }
  };
}
