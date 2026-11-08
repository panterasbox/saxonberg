/**
 * WaterPoweredMixin — ⭐ *a thing that turns a reach's flow into watts*
 * (controllers-are-io D7a): the race and wheel at a weir.
 *
 * A protocol because its readers cannot import its host: the grist mill and
 * the sawmill (their own packs) look for a room sibling that makes the power,
 * and the water pack's `analyze power` reads it. It lives in the kernel for
 * the `Powered` reason — composers and readers have no common pack ancestor.
 *
 * IS: a generator — today the water pack's `ControlStructure`. IS NOT: a thing
 * that merely SITS on a reach. ⚠ A `Conduit` has a `getReachRef` and no
 * generation, and must not compose this: a mill walking its room for a power
 * take would pick the conduit and read 0 W beside a turning wheel. Nor is it
 * the driven side (`PoweredMixin`, which the mill composes).
 *
 * ⚠ The defaults REFUSE: no reach, no head, no watts.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface WaterPowered {
  /** The reach whose flow drives it; `''` when it stands on none. */
  getReachRef(): string;
  /** The head it works over (m). */
  getHeadM(): number;
  /** The watts `flowM3S` makes here. */
  generationW(flowM3S: number): number;
}

export function WaterPoweredMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class WaterPoweredMixin extends Base implements WaterPowered {
    static _mixinName: string = 'WaterPoweredMixin';

    /** @hook */
    public getReachRef(): string {
      return '';
    }

    /** @hook */
    public getHeadM(): number {
      return 0;
    }

    /** @hook */
    public generationW(_flowM3S: number): number {
      return 0;
    }
  };
}
