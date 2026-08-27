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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Exitable } from './Exitable';
import type Door from '../../platform/thing/Door';

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

    // `door` is intentionally NOT in `persistentFields`: a Door is a
    // separate Stuff and the generic PersistentHydrator's `target['door']
    // = data['door']` cannot round-trip a Stuff reference. Composing
    // classes that need door identity to survive restart own that via
    // a custom `persistenceHandler` (mirror of `Containable.environment`).

    /**
     * The defining door for this bearer's synthesized exits. `null`
     * means no door — synthesized exits will pass freely.
     */
    static fieldMeta: FieldMeta = {
      // This mixin has no destruct hook at ALL, so before the
      // declaration a destroyed Door stayed readable here forever.
      // `weak`: the bearer does not own the door (a door is shared
      // between two bearers), it just stops pointing at a dead one.
      door: { ref: 'instance', lifetime: 'weak' },
    };

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
