/**
 * MountableMixin — host-side conveyance: "this Stuff has a mount slot
 * a rider can occupy."
 *
 * Composes on `Stuff & Slotted`. Mountable's slot is created via the
 * Slotted substrate (added to `staticSlots` at composition time, or
 * made available via the body-plan slot for organic mounts).
 *
 * Persistent: `mountSlot: string` — slot name. Defaults to `'mount:1'`.
 * A horse may use `'back:1'` resolved from its bodyPlan.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';
import type { Slottable } from './Slottable';
import type { Slotted } from './Slotted';

export interface Mountable extends Slotted {
  getMountSlot(): string;
  setMountSlot(value: string): void;
  isMounted(): boolean;
  getMountOccupant(): (Stuff & Slottable) | null;
}

export function MountableMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class MountableMixin extends Base {
    static _mixinName = 'MountableMixin';

    /*
     * ⭐⭐ **`mount` and `ride` were afforded by NOTHING** — the same
     * finding as `hitch` on the cart side, found in the same drive
     * minute. View, controller and arg gate all shipped; nothing named
     * the files, so `mount horse` answered *"I don't understand
     * 'mount'."* for every player since conveyance shipped.
     *
     * `peers`: a horse stands beside you, not around you.
     */
    static commandContributions: CommandContributions = {
      peers: [
        'platform/cmd/movement/mount.yaml',
        'platform/cmd/movement/ride.yaml',
      ],
    };
    static fieldMeta: FieldMeta = {
      mountSlot: { persistent: true, authorable: true },
    };

    public mountSlot: string = 'mount:1';

    public getMountSlot(): string {
      return this.mountSlot;
    }

    public setMountSlot(value: string): void {
      this.mountSlot = value;
    }

    public isMounted(this: Stuff & Slotted & Mountable): boolean {
      return this.isSlotOccupied(this.getMountSlot());
    }

    public getMountOccupant(
      this: Stuff & Slotted & Mountable
    ): (Stuff & Slottable) | null {
      return this.getOccupant(this.getMountSlot());
    }
  };
}
