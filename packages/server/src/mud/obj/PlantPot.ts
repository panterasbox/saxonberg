/**
 * PlantPot — a `Slotted` fixture with one plant slot and a bulk interior
 * holding soil. **Its soil volume is the root ceiling.**
 *
 * This is the density dial at its smallest setting, not a special case:
 * the farming slate specifies a garden bed as *"a `Slotted` fixture with N
 * slots; each plant is a `Slottable`"* — **a pot is that at N = 1** — so
 * phase 2's bed is this shape with a bigger N. A fused pot-and-plant
 * object would have been thrown away at phase 2.
 *
 * Deliberately **not** a persistence host: the pot's Slotted/Bulkable
 * state nests inside whatever holds it, and the plant it holds is a
 * `{ref, key}` entry that persists itself. So a pot in a dorm room
 * restores as room → pot (nested state) → plant (its own record); a pot in
 * a transient room is culled with it and the plant is abandoned, the
 * documented rule uniformly applied.
 *
 * The slot and the soil capacity are authored template DATA
 * (`staticSlots` / `interiorBulk` / `interiorCapacity`) — the two shipped
 * sizes differ only in their numbers, not their class.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { BulkableMixin } from "../lib/bulk/Bulkable";
import { SlottedMixin } from "../lib/slot/Slotted";
import { ContainerMixin } from "../lib/spatial/Container";
import type { Slottable } from "../lib/slot/Slottable";
import type { Stuff } from "../lib/stuff/Stuff";

/**
 * The canonical name of a pot's single plant slot. Verbs and the plant's
 * own `fitsSlot` speak it; the template authors the matching `staticSlots`
 * entry.
 */
export const PLANT_SLOT = "plant";

// Container as well as Slotted + Bulkable: the slotted plant must live in
// the pot's CONTENTS as well as its slot (the wear/equip pattern), because
// the Slotted capture slice names its occupants by index into the
// container slice — a non-content occupant resolves to -1 and is silently
// dropped on restore.
const PlantPotBase = SlottedMixin(
  BulkableMixin(ContainerMixin(DetailedMixin(Thing))),
);

export default class PlantPot extends PlantPotBase {
  static persistentFields: string[] = [];

  /**
   * The litres of soil in the pot — the root ceiling the growth model
   * divides each stage's root demand by. Reads the bulk interior, so
   * pouring soil in raises it through the shipped `pour` path.
   */
  public getSoilVolume(): number {
    return this.getInteriorAmount().rawValue();
  }

  /** Whether the pot holds any soil at all (the planting prerequisite). */
  public hasSoil(): boolean {
    return this.getSoilVolume() > 0;
  }

  /** The plant currently in the pot's slot, or null. */
  public getPlant(): (Stuff & Slottable) | null {
    return this.getOccupant(PLANT_SLOT);
  }
}
