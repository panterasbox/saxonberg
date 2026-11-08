/**
 * StrikingDieMixin — ⭐ the protocol behind `hammer <blank> on <die>`
 * (ceramics S16, D14): a hard block cut with a device that a blank laid on
 * it and struck takes the shape of, declared as what the thing IS.
 *
 * The smith's `hammer` asks the anvil it was given whether it is a striking
 * die, and a die answers what the blow did — the blow's energy against the
 * blank's stiffness decides whether the device comes up. ⚠ A strike is not
 * an impression (`ImpressibleMixin`): it needs the hammer's blow energy,
 * which `impress` does not carry.
 *
 * Kernel, because the verb is smithing's and the die is smelting's, and the
 * dependency runs smelting → smithing: the smith's controller cannot name
 * the founder's class, so the two meet over this mixin. The composer
 * implements {@link StrikingDie.strikeWith}; the default says nothing comes
 * of it. The verb's affordance stays with the composer (the view is a
 * pack's, and a kernel class never names a pack's view).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from './ActPlan';

/**
 * ⭐ Every reason a strike comes to nothing — the `hammer` controller words
 * each (controllers-are-io D4); the blank and the die are its own args.
 */
export type StrikeRefusal =
  | ActRefusal<'not-a-blank'>
  | ActRefusal<'not-metal'>
  /** The blow was too weak for the blank's stiffness. */
  | ActRefusal<'too-hard'>;

/** A strike that bit: the token it struck. */
export type StrikeOutcome = ActOutcome<{ token: Stuff }>;

/** A die a blank is struck on. */
export interface StrikingDie {
  /** Strike `blank` on this with a blow of `blowJ` joules. */
  strikeWith(blank: Stuff, blowJ: number, by: Stuff): Promise<StrikeOutcome | StrikeRefusal>;
}

export function StrikingDieMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class StrikingDieMixin extends Base implements StrikingDie {
    static _mixinName = 'StrikingDieMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook What striking `blank` on this die came to. */
    public async strikeWith(_blank: Stuff, _blowJ: number, _by: Stuff): Promise<StrikeOutcome | StrikeRefusal> {
      return { ok: false, reason: 'not-a-blank' };
    }
  };
}
