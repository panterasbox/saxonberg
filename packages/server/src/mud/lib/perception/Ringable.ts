/**
 * RingableMixin — ⭐ **a bell, a gong, a signal you strike** (river W16): it
 * remembers when it was last rung, so whoever listens for it — a ferryman
 * across the water, a tender above a diver — can answer it without
 * importing the mod that made the bell (the diving mod's signal bell).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Ringable {
  /** When it was last rung, game-seconds; `-Infinity` when never. */
  getLastRungAtS(): number;
}

export function RingableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class RingableMixin extends Base implements Ringable {
    static _mixinName: string = 'RingableMixin';

    /** @hook The signal's own memory. Default: never rung. */
    public getLastRungAtS(): number {
      return Number.NEGATIVE_INFINITY;
    }
  };
}
