/**
 * HandWorkedMixin — ⭐ **a vessel whose CONTENTS are worked by hand, not a
 * build** (dairy D5), declared as what the thing IS: a butter churn is not
 * assembling a recipe from banked ingredients — it holds a charge of cream
 * as bulk, and working it changes what that cream IS. `stir`
 * reach a build vessel through its build buffer, and this vessel through
 * {@link HandWorked.workByHand}: the outcome is what the working came to,
 * in facts the controller words, or `null` when there was nothing in it to
 * work (the default).
 *
 * ⚠ Why not a build vessel: a `pour` into a build vessel BANKS the matter
 * as a recipe contribution and drains the source — cream poured into a
 * build-vessel churn would vanish into the buffer instead of filling it.
 *
 * The vessel affords `stir`.
 */

import type { NestingConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome } from './ActPlan';
import { AgitatedMixin, type AgitatePlan, type AgitateRefusal, type AgitateRequest } from './Agitated';

/** Working a charge by hand — a churn takes a while to come, ms. */
const CHURN_MS = 8000;
/** What working a charge by hand costs, W. */
const CHURN_EFFORT_W = 150;

const WORKING = ['platform/cmd/crafting/stir.yaml'];

/**
 * ⭐ What working a charge by hand came to — facts, never words
 * (controllers-are-io D4); the `stir` controller words each.
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

/** A vessel whose contents are worked by hand. */
export interface HandWorked {
  workByHand(): ActOutcome<HandWorkFacts> | null;
}

export function HandWorkedMixin<TBase extends NestingConstructor<Stuff>>(Base: TBase) {
  // ⭐ `stir` asks the vessel's plan (`AgitatedMixin`, controller-liquidity
  // W7c); this vessel's working is the charge worked by hand.
  return class HandWorkedMixin extends AgitatedMixin(Base) implements HandWorked {
    static _mixinName = 'HandWorkedMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook `stir`: the charge worked by hand, and what came of it. */
    public override async agitatePlanFor(_req: AgitateRequest): Promise<AgitatePlan | AgitateRefusal | null> {
      return {
        ok: true,
        durationMs: CHURN_MS,
        effortW: CHURN_EFFORT_W,
        facts: { kind: 'hand' },
        onComplete: () => ({ ok: true, facts: { kind: 'hand-worked', result: this.workByHand()?.facts ?? null } }),
      };
    }

    static commandContributions: CommandContributions = {
      environment: WORKING,
      peers: WORKING,
    };

    /** @hook What working the charge came to — `null` when there was nothing to work. */
    public workByHand(): ActOutcome<HandWorkFacts> | null {
      return null;
    }
  };
}
