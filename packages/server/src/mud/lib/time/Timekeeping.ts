/**
 * TimekeepingMixin — the capability of *displaying* game-time. Anything
 * that can be looked at to read a clock face composes it: a pocket
 * watch, a clock tower, a wristwatch, a sundial.
 *
 * The surface is a single read contract — `currentReading(): Time | null`
 * (null = the face is unreadable right now, e.g. a shut hunter lid). The
 * mixin deliberately grants **no verbs**: `wind`/`set` and friends are
 * object-carried (`commandContributions`), lit up only where a real
 * windable/settable object is present. This is the rejected-Timepiece
 * lesson — the capability marks "reads time", not "operates a mechanism".
 *
 * The base implementation returns null; every real timepiece overrides
 * `currentReading()` with its own physics (a `Watch` drifts off a
 * mainspring `Reserve`; a `ClockTower` reads `WorldClockApi` straight).
 */

import type { MixinConstructor } from '../mixin';
import type { Time } from './Time';

/**
 * Public shape added by TimekeepingMixin. The inter-Stuff contract is
 * the one read method; a null reading means "no legible time right now".
 */
export interface Timekeeping {
  currentReading(): Time | null;
}

export function TimekeepingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TimekeepingMixin extends Base implements Timekeeping {
    static _mixinName = 'TimekeepingMixin';

    /**
     * Default: no legible reading. Real timepieces override this with
     * their own read physics.
     */
    currentReading(): Time | null {
      return null;
    }
  };
}
