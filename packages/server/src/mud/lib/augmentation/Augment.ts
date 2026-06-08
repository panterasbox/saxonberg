/**
 * AugmentMixin — composed by augment Stuff (cybernetic implants,
 * prosthetics, sensor packages, …).
 *
 * Wave 1 surface is intentionally narrow: a single method,
 * `confers()`, returns the mixin names this augment activates when
 * installed. The augment names mixins; the mixins describe their own
 * grants (`_grantsModalities`, future `_grantsLanguages`, etc.).
 * Decentralized declarations beat coupled lists.
 *
 * Subclasses override `confers()` to declare what they activate.
 * The default returns an empty array — an augment that confers
 * nothing is a no-op but legal.
 *
 * The active-mixin substrate (`MixinApi.getActiveMixins` /
 * `MixinApi.isActive`) walks installed augments via slot occupancy.
 * The implant doesn't actively "register" itself; the framework
 * finds it via the cranial slot's occupant when computing the active
 * set.
 */

import type { MixinConstructor } from '../mixin';

export interface Augment {
  /**
   * Mixin names this augment activates when installed. The
   * mixin-name strings match `_mixinName` markers (e.g.
   * `'AetherMixin'`). Empty array = inert augment.
   */
  confers(): readonly string[];
}

export function AugmentMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AugmentMixin extends Base implements Augment {
    static _mixinName = 'AugmentMixin';

    /** Default — subclasses override to declare grants. */
    confers(): readonly string[] {
      return [];
    }
  };
}
