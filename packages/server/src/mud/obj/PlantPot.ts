/**
 * PlantPot — **cultivable ground you can carry**: soil plus one plant slot,
 * over a `Thing`.
 *
 * Everything about holding a plant lives in {@link CultivableMixin}, which
 * `GardenBed` composes too. This class is the *portable* half of the pair
 * and nothing else: composing over `Thing` makes it `Containable`, so a pot
 * can be picked up, carried and put on a desk. A bed cannot. That is the
 * one real structural difference between them.
 *
 * A pot is a bed at **N = 1** — the farming slate's bed is *"a `Slotted`
 * fixture with N slots; each plant is a `Slottable`"*, and this is that with
 * one slot. A fused pot-and-plant object would have been thrown away at
 * phase 2.
 *
 * Deliberately **not** a persistence host: the pot's Slotted/Bulkable state
 * nests inside whatever holds it, and the plant it holds is a `{ref, key}`
 * entry that persists itself. So a pot in a dorm room restores as room →
 * pot (nested state) → plant (its own record); a pot in a transient room is
 * culled with it and the plant is abandoned, the documented rule uniformly
 * applied.
 *
 * The slot and the soil capacity are authored template DATA
 * (`staticSlots` / `interiorBulk` / `interiorCapacity`) — the shipped sizes
 * differ only in their numbers, not their class.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { BulkableMixin } from "../lib/bulk/Bulkable";
import { SlottedMixin } from "../lib/slot/Slotted";
import { ContainerMixin } from "../lib/spatial/Container";
import { PopulatesMixin } from "../lib/stuff/Populates";
import { CultivableMixin } from "../lib/husbandry/Cultivable";

export { PLANT_SLOT } from "../lib/husbandry/Cultivable";

// Container as well as Slotted + Bulkable: a slotted plant must live in
// the pot's CONTENTS as well as its slot, because the Slotted capture
// slice names its occupants by index into the container slice.
const PlantPotBase = CultivableMixin(
  PopulatesMixin(
    SlottedMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing)))),
  ),
);

export default class PlantPot extends PlantPotBase {
  static persistentFields: string[] = [];
}
