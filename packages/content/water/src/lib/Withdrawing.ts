/**
 * WithdrawingMixin — **anything that takes water out of a reach.**
 *
 * A conduit's intake, a headgate's diversion. The catalogue sums every
 * withdrawal on a reach before it decides what is still flowing, so it
 * has to be able to find them all.
 *
 * ⭐ **Why a mixin now, when this was a shape scan.** It used to walk
 * every live object in the world and duck-type for a `withdrawalM3S`
 * method, and the file said why: *"a capability pack cannot ship a
 * mixin (no `lib/`)"*, and `class.X` matches by class NAME while three
 * unrelated things in this codebase are called `Conduit`. The first
 * half of that is no longer true — a pack has a `lib/` of its own — so
 * the honest mechanism is available and the scan can become an indexed
 * read of the withdrawers.
 *
 * ⚠ **Composing it is what makes you visible to the river.** An
 * implementer that declares `withdrawalM3S` without composing this is
 * silently ignored: the shape scan used to find it and the index will
 * not. That is the trade — a gate a reviewer sees, instead of a walk of
 * the world.
 *
 * Lives in `/system/water/lib/` — the water pack's own substrate,
 * inherited and never instanced. The kernel test does not apply: the
 * only composers are things that sit in a watercourse, which is this
 * pack's own subject.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

/** The registry name — the key `world:[mixin.WithdrawingMixin]` reads. */
export const WITHDRAWING_MIXIN = 'WithdrawingMixin';

/** The surface a withdrawer presents to the catalogue. */
export interface Withdrawing {
  /** The reach it takes from, or `''` when it takes from nowhere. */
  getReachRef(): string;
  /**
   * Cubic metres per second it is taking, given the natural flow
   * arriving at its reach.
   *
   * ⚠ **Natural** flow, deliberately: sizing a withdrawal against the
   * already-drawn flow would make this recursive, and the honest rule is
   * that a headgate is sized by what the river brings it.
   */
  withdrawalM3S(naturalM3S: number): number;
}

export function WithdrawingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class WithdrawingMixin extends Base implements Withdrawing {
    static _mixinName = WITHDRAWING_MIXIN;

    /** Draws from nowhere until a composer says otherwise. */
    public getReachRef(): string {
      return '';
    }

    /** Takes nothing until a composer says otherwise. */
    public withdrawalM3S(_naturalM3S: number): number {
      void _naturalM3S;
      return 0;
    }
  };
}
