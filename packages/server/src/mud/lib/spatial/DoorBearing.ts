/**
 * DoorBearingMixin — host of a single defining `Door` whose attachment
 * point is a synthesized exit (vessel `'out'`/`'in'`) rather than an
 * explicit entry in the `exits` map.
 *
 * `ExitableMixin.addExit` is the canonical place where door-Exit
 * back-references get wired (see `Exitable.ts`); for hosts whose exits
 * are synthesized lazily (`ExitableVessel.getOrSynthesizeOutExit` etc.),
 * there is no `addExit` to hook into. This mixin provides the field and
 * the override seam — the host's synthesizer reads `this.door` at
 * creation time and is responsible for keeping `door.attachedTo`
 * consistent.
 *
 * Constraint: bound to `Stuff & Exitable`. A door without an exit doesn't
 * make sense; constraining the base avoids accidentally composing this
 * onto a Location whose exits are all explicit (those should pass the
 * door directly to `addBidirectionalExit`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Exitable } from './Exitable';
import type { Door } from './Door';

/**
 * Public shape added by DoorBearingMixin.
 */
export interface DoorBearing {
  setDoor(door: Door | null): void;
  getDoor(): Door | null;
}

export function DoorBearingMixin<TBase extends MixinConstructor<Stuff & Exitable>>(
  Base: TBase
) {
  return class DoorBearingMixin extends Base {
    static _mixinName = 'DoorBearingMixin';
    static persistentFields = ['door'];

    /**
     * The defining door for this bearer's synthesized exits. `null`
     * means no door — synthesized exits will pass freely.
     */
    protected door: Door | null = null;

    getDoor(): Door | null {
      return this.door;
    }

    /**
     * Default setter. Subclasses with cached synthesized exits MUST
     * override to invalidate those caches and update any door-side
     * back-references (`Door.attachedTo`).
     */
    setDoor(door: Door | null): void {
      this.door = door;
    }
  };
}
