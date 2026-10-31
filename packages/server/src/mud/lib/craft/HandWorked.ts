/**
 * HandWorkedMixin — ⭐ **a vessel whose CONTENTS are worked by hand, not a
 * build** (dairy D5), declared as what the thing IS: a butter churn is not
 * assembling a recipe from banked ingredients — it holds a charge of cream
 * as bulk, and working it changes what that cream IS. `stir`/`shake`/`churn`
 * reach a build vessel through its build buffer, and this vessel through
 * {@link HandWorked.workByHand}: the outcome is the line the working ends
 * on, in the vessel's own words, or `null` when there was nothing in it to
 * work (the default).
 *
 * ⚠ Why not a build vessel: a `pour` into a build vessel BANKS the matter
 * as a recipe contribution and drains the source — cream poured into a
 * build-vessel churn would vanish into the buffer instead of filling it.
 *
 * The vessel affords `stir` (and so `churn`, the same view).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome } from './ActPlan';
import type { BuildMethod } from './ManualBuild';

const WORKING = ['platform/cmd/crafting/stir.yaml'];

/** A vessel whose contents are worked by hand. */
export interface HandWorked {
  workByHand(method: BuildMethod): ActOutcome | null;
}

export function HandWorkedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HandWorkedMixin extends Base implements HandWorked {
    static _mixinName = 'HandWorkedMixin';

    static commandContributions: CommandContributions = {
      environment: WORKING,
      peers: WORKING,
    };

    /** @hook What working the charge came to — `null` when there was nothing to work. */
    public workByHand(_method: BuildMethod): ActOutcome | null {
      return null;
    }
  };
}
