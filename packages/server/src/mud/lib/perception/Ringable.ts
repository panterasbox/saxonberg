/**
 * RingableMixin — ⭐ **a bell, a gong, a signal you strike** (river W16): it
 * remembers when it was last rung, so whoever listens for it — a ferryman
 * across the water, a tender above a diver — can answer it without
 * importing the mod that made the bell (the diving mod's signal bell).
 *
 * ⭐ It is STRUCK by the platform's `ring` — the one verb for tapping a thing
 * and listening (ceramics M5): how it sounds is the thing's own
 * `ringSound()`, and that it rang is remembered here.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { WorldClockApi } from '../../api/worldclock';

export interface Ringable {
  /** When it was last rung, game-seconds; `-Infinity` when never. */
  getLastRungAtS(): number;
  /** It was struck, now — the platform `ring` tells it. */
  struck(): void;
}

export function RingableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class RingableMixin extends Base implements Ringable {
    static _mixinName: string = 'RingableMixin';

    /** When it was last struck, game seconds (runtime: who rang is heard, not kept). */
    private _lastRungAtS = Number.NEGATIVE_INFINITY;

    /** @hook The signal's own memory. Default: when it was last struck. */
    public getLastRungAtS(): number {
      return this._lastRungAtS;
    }

    /** @hook Struck now. Default: remember it (no clock — a unit world — remembers nothing). */
    public struck(): void {
      try {
        this._lastRungAtS = WorldClockApi.getNow().rawValue();
      } catch {
        /* no clock: the ring is heard and not remembered */
      }
    }
  };
}
