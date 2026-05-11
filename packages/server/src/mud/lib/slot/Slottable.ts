/**
 * SlottableMixin — marker mixin for "this Stuff can occupy slots."
 *
 * Bare marker. Specialized capabilities (`Wearable`, `Wieldable`)
 * compose `Slottable` and add their own claim shape; sitter / rider
 * Stuff (avatars) compose `Slottable` directly so they can be slotted
 * into a `sit:1` / `mount:1` / `ground:1`.
 *
 * Lifecycle: `onDestruct` walks every host the candidate is currently
 * slotted into and vacates from each slot, before chaining to super.
 * Guarantees no host holds a stale reference to a destructed Stuff.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from './Slotted';
import { SlotApi } from '../../api/slot';

/**
 * Public shape provided by SlottableMixin.
 */
export interface Slottable {
  /**
   * Inverse lookup convenience: "what host am I currently in a slot
   * of?" Returns the single host or null. Throws if the Slottable is
   * in slots on multiple hosts simultaneously (which only matters for
   * Wearable's multi-claim case — a gauntlet on each hand of the
   * same wearer is one host; cross-host is the violation).
   */
  getOccupiedHost(): (Stuff & Slotted) | null;
}

export function SlottableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class SlottableMixin extends Base {
    static _mixinName = 'SlottableMixin';

    public getOccupiedHost(): (Stuff & Slotted) | null {
      return SlotApi.findOccupiedHost(this as unknown as Stuff & Slottable);
    }

    onDestruct(): void {
      const occupied = SlotApi.findOccupiedSlots(
        this as unknown as Stuff & Slottable
      );
      for (const [host, slotNames] of occupied.entries()) {
        for (const slotName of slotNames) {
          host.vacate(slotName, this as unknown as Stuff & Slottable);
        }
      }
      super.onDestruct();
    }
  };
}
