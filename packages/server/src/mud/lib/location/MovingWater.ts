/**
 * MovingWaterMixin — ⭐ **water that moves** (river review, W14): a river's
 * reaches, a tidal race, the open sea's set. Still water — a pool, a mere,
 * a cistern, a tidal basin that only rises and falls — composes NOTHING of
 * this; it is not water with a current of zero, it is water that has no
 * current at all.
 *
 * So an author chooses it — in the class the water's template names — and
 * a player meets it: you are carried, you are swept off, the current is
 * read by the log; in a pool the log says the water is still.
 *
 * What moving water does that still water does not:
 * - **a current** where you are (`currentFor`, m/s, + downstream) and how
 *   **broken** it is (`roughnessFor`, 0–1) — what the body pays to hold
 *   against it, and what a floater reads;
 * - **it carries you out** (`sweep`) when you do not hold against it;
 * - **you do not find your feet on arrival** (`standsOnArrival`): swum
 *   into its shallows you are still swimming — standing is your own act,
 *   `stand` (the drive: a swimmer carried into a fast riffle was stood up
 *   and their foot jammed — the engine's choice, not theirs).
 *
 * Its defaults read the water's own read — the source's current (a
 * river's, a sea's set) or a tide's stream — so a moving water with no
 * line of its own still moves. A river's places refine them from the line
 * (`RiverWaterMixin`, the water pack).
 *
 * Needs `WaterPlaceMixin` (and `ShoreMixin`) beneath it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { WaterPlace } from './WaterPlace';
import type { Shore } from './Shore';
import type { MovingWaterRead, WaterRead } from './WaterSource';

export interface MovingWater {
  /** The current where `occupant` is, m/s (+ downstream). */
  currentFor(occupant: Stuff): number;
  /** How broken the water is where `occupant` is, 0–1. */
  roughnessFor(occupant: Stuff): number;
  /** The current carries a body that is not holding out of this water. */
  sweep(body: Stuff): Promise<boolean>;
  /** Whether somebody who SWIMS in where the floor would bear them finds their feet at once. */
  standsOnArrival(mover: Stuff): boolean;
}

export function MovingWaterMixin<TBase extends MixinConstructor<Stuff & WaterPlace & Shore>>(Base: TBase) {
  return class MovingWaterMixin extends Base implements MovingWater {
    static _mixinName: string = 'MovingWaterMixin';

    /** The water's own read now, if it moves. */
    private movingRead(): MovingWaterRead | WaterRead | null {
      // `ShoreMixin` beneath supplies these; a mixin cannot see a generic base's members.
      const shore = this as unknown as Shore;
      const pick = shore.waterFor();
      return 'key' in pick ? shore.peekWaterRead(pick.key) : null;
    }

    /**
     * @hook Override on a water that knows its current where you are (a
     *   river's places, from the line). Default: the read's current, or
     *   its tide's stream.
     */
    public currentFor(occupant: Stuff): number {
      void occupant;
      const read = this.movingRead();
      if (read !== null && 'currentMps' in read && typeof read.currentMps === 'number' && read.currentMps !== 0) {
        return read.currentMps;
      }
      return read?.tide?.streamMps ?? 0;
    }

    /** @hook Override on a water with white water. Default: the read's, or glassy. */
    public roughnessFor(occupant: Stuff): number {
      void occupant;
      const read = this.movingRead();
      return read !== null && 'roughness' in read && typeof read.roughness === 'number' ? read.roughness : 0;
    }

    /**
     * @hook Override on a water with somewhere to carry you — a river's
     *   places hand the body to the line at their downstream end. Default:
     *   nowhere yet (`false`).
     */
    public async sweep(body: Stuff): Promise<boolean> {
      void body;
      return false;
    }

    /** @hook Override where moving water has a shallows you stand up in. Default: you do not. */
    public standsOnArrival(mover: Stuff): boolean {
      void mover;
      return false;
    }
  };
}
