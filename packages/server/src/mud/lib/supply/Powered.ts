/**
 * PoweredMixin — ⭐⭐ *a thing that draws a supply which can be on or off,
 * and can say when it was* (controllers-are-io D7a).
 *
 * ⭐⭐ **A kernel protocol a pack implements** — the `TravelNode` ↔ `tpa`
 * pattern. The kernel's `ClimateControlMixin` is typed over `Powered` so a
 * fridge can be driven while supplied and drift when cut, and `PumpingMixin`
 * runs off it, but the kernel cannot read the grid: the energy pack's
 * `GridPoweredMixin` *composes* this and answers from the meter, a mill
 * (`ComminutingMixin`, `Sawmill`) answers from its river, and a second supply
 * (a windmill, a mana tap) is a further implementer in its own pack. No import
 * crosses from the kernel to the pack, and no reader probes a method.
 *
 * `poweredTrajectory` is why the cut is read correctly across an unobserved
 * gap: the supply publishes a 0/1 {@link Piecewise} over the window (1 =
 * supplied), so the envelope integrates the warm-up that began at the cut
 * and the pull-down that began at the splice as separate stretches, rather
 * than billing the whole gap at whatever the meter reads on the visit.
 *
 * IS: anything whose work depends on power reaching it now. IS NOT: a
 * generator (`WaterPoweredMixin` — a weir MAKES the watts this reads), nor a
 * thing worked by hand (no supply to be cut); an `Organism`'s `isPowered()`
 * is its lifecycle word and shares only the spelling.
 *
 * ⚠ The defaults REFUSE: no power, never supplied. A host overrides
 * `availablePowerW`; `isPowered` then follows, and a supply with a history
 * overrides `poweredTrajectory`.
 */

import { Piecewise } from '../Trajectory';
import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Powered {
  /** Is it supplied right now? */
  isPowered(): boolean;
  /** Power available to draw right now (W); `0` when cut. */
  availablePowerW(): number;
  /**
   * The supply over `[fromS, toS]` as a 0/1 trajectory (1 = supplied) —
   * constant stretches at the cut / splice boundaries. A supply with no
   * history answers a single constant stretch at its current state (the
   * never-empty rule).
   */
  poweredTrajectory(fromS: number, toS: number): Piecewise;
}

export function PoweredMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PoweredMixin extends Base implements Powered {
    static _mixinName: string = 'PoweredMixin';

    /** @hook The default is no supply at all. */
    public availablePowerW(): number {
      return 0;
    }

    /** @hook Supplied means power is reaching it now. */
    public isPowered(): boolean {
      return this.availablePowerW() > 0;
    }

    /** @hook No history: one constant stretch at the current state. */
    public poweredTrajectory(fromS: number, toS: number): Piecewise {
      const v = this.isPowered() ? 1 : 0;
      return new Piecewise([
        { fromS, toS: toS > fromS ? toS : fromS, startValue: v, target: v, tau: 0 },
      ]);
    }
  };
}
