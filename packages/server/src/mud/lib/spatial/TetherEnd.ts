/**
 * TetherEndMixin — ⭐ **the end of a line in somebody's hand** (river W16):
 * a painter, a lifeline, a heaving line. Held, it says what its far end is
 * made fast to — the boat a walker leads along the bank (lining), the
 * diver below — so the water can follow a boat on a line without
 * importing the mod that makes the line (the diving mod's).
 *
 * The line as a whole is cordage's to model (a rope with two ends); this is
 * only the question a holder's place asks of what is in their hand.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface TetherEnd {
  /** What the other end of the line is made fast to, or `null`. */
  tetheredTo(): Stuff | null;
}

export function TetherEndMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TetherEndMixin extends Base implements TetherEnd {
    static _mixinName: string = 'TetherEndMixin';

    /** @hook The line's far end. Default: made fast to nothing. */
    public tetheredTo(): Stuff | null {
      return null;
    }
  };
}
