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

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome } from './ActPlan';

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

export function HandWorkedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HandWorkedMixin extends Base implements HandWorked {
    static _mixinName = 'HandWorkedMixin';
    static _mixinKind = 'protocol' as const;

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
