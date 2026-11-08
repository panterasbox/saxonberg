/**
 * Irrigating — ⭐ **a thing that waters the ground it stands on** (water
 * supply, the review: sprinklers are core to farming). The protocol the
 * soil speaks to whatever is set down on it or beside it: *bring what you
 * have let fall on me up to now*. A sprinkler is the first; a moving line
 * or a center pivot is the same protocol with more of it.
 *
 * ⭐⭐ **A sprinkler is rain in a circle.** What the rain reaches, it reaches:
 * a field's ground and a bed beside it (each by the sky it catches), never a
 * pot, which catches no rain because a houseplant is furniture, watered by
 * hand. The irrigator does its own integration on its own clock — the soil
 * only asks — so two grounds reading one sprinkler never count its water
 * twice.
 *
 * Kernel because the soil (kernel) must ask it without importing whoever
 * makes it; no duck typing.
 */

import type { MixinConstructor } from '../mixin';

export interface Irrigating {
  /**
   * @hook Bring the water this has let fall up to `nowS`: integrate what
   *   ran since its last settle and credit the ground it stands on (and the
   *   beds beside it). Idempotent at a given `nowS`. Default: nothing.
   */
  settleIrrigation(nowS: number): Promise<void>;
}

export function IrrigatingMixin<TBase extends MixinConstructor>(Base: TBase) {
  class IrrigatingMixin extends Base implements Irrigating {
    static _mixinName = 'IrrigatingMixin';

    public async settleIrrigation(_nowS: number): Promise<void> {
      // A thing that waters nothing yet.
    }
  }
  return IrrigatingMixin;
}
