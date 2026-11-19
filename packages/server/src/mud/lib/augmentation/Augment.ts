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
 * `MixinApi.isActive`) walks every augment a body BEARS (aether-devices
 * D1): slot occupants (a seated implant, a phone in a hand) and carried
 * ones (a phone in a pocket — found on the body's recency stack, where a
 * carried device's `environment` verbs already sit). Nothing registers
 * itself; the framework finds it.
 *
 * ⭐ An augment can say why it is not working — `conferralRefusal()`
 * (packed, off, dead, not yours). The person's comms asks it to name the
 * fix. Default `null`: nothing is stopping it, which is an honest answer
 * for the implant until the epoch build gives it a power state.
 */

import type { MixinConstructor } from '../mixin';

/** Why an augment confers nothing right now (aether-devices D1). */
export type AugmentRefusal = 'not-borne' | 'packed' | 'off' | 'dead' | 'not-yours';

export interface Augment {
  /**
   * Mixin names this augment activates when installed. The
   * mixin-name strings match `_mixinName` markers (e.g.
   * `'AetherMixin'`). Empty array = inert augment.
   */
  confers(): readonly string[];
  /**
   * Why this augment confers nothing right now, or `null` when nothing is
   * stopping it. A device answers from its own state (D1); the person's
   * comms reads it to name the fix.
   * @hook Default `null`. `Phone` answers from where it is, whether it is
   *   on, its charge and whose it is.
   */
  conferralRefusal(): AugmentRefusal | null;
}

export function AugmentMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class AugmentMixin extends Base implements Augment {
    static _mixinName = 'AugmentMixin';

    /** Default — subclasses override to declare grants. */
    confers(): readonly string[] {
      return [];
    }

    /** @nothing an augment with no conditions of its own always confers. */
    conferralRefusal(): AugmentRefusal | null {
      return null;
    }
  };
}
