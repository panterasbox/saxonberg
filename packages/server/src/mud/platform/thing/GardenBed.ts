/**
 * GardenBed — **cultivable ground you cannot carry**: soil plus N plant
 * slots, standing in a yard.
 *
 * Everything about holding plants lives in {@link CultivableMixin}, which
 * `PlantPot` composes too — *a pot is a bed with one slot*. The bed is the
 * same surface with a bigger N, a lot more soil, and a lot more mass.
 *
 * ## Why it is still `Containable`, and how it resists being picked up
 *
 * It composes over `Thing` exactly as the pot does, so it *is* Containable
 * — and it has to be. A bed lives in a room, and containment is how a thing
 * is in a room; a non-Containable bed could not be placed at all, and the
 * land-use gate would have no placement to gate.
 *
 * **You cannot pick one up because it is heavy, not because of its class.**
 * That is the shipped doctrine, stated in `Vessel.ts`: *"carry / drag /
 * ride / can't-budge is emergent from mass vs. a bearer's capacity, never a
 * type flag — you can't pocket a ship is a mass gate, not `instanceof`."*
 * `GetController` already enforces it through
 * `LoadBearing.wouldExceedCeiling`, whose ceiling is roughly the bearer's
 * own body mass; a bed full of soil is several times that, so `get bed`
 * answers *"You strain, but the garden bed doesn't budge."*
 *
 * This is better than an immovability flag on two counts: the refusal is
 * diegetic and already written, and an *empty* bed being draggable by a
 * strong character is a consequence rather than a special case.
 *
 * Authored data (`staticSlots`, `interiorCapacity`, `mass`) is what makes a
 * given bed a bed — the shipped sizes differ only in their numbers.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../../lib/stuff/Thing";
import { DetailedMixin } from "../../lib/description/Detailed";
import { BulkableMixin } from "../../lib/bulk/Bulkable";
import { SlottedMixin } from "../../lib/slot/Slotted";
import { ContainerMixin } from "../../lib/spatial/Container";
import { PopulatesMixin } from "../../lib/stuff/Populates";
import { ReservedMixin } from "../../lib/reserve";
import { CultivableMixin } from "../../lib/husbandry/Cultivable";
import { SoilMixin } from "../../lib/husbandry/Soil";
import type { FieldMeta } from "../../lib/mixin";

// The GROUND half — soil's own two checkpoints — is composed first and
// separately: its host constraint is `Stuff & Reserved` alone, which is
// what lets a FIELD have soil without having a plant slot. Naming the
// intermediate stack is not cosmetic: inference through this many nested
// generic mixin factories in one expression collapses to `never`.
const GardenBedGround = SoilMixin(
  PopulatesMixin(
    SlottedMixin(
      BulkableMixin(ContainerMixin(ReservedMixin(DetailedMixin(Thing)))),
    ),
  ),
);

// The same stack the pot composes — a bed is a pot with a bigger N.
const GardenBedBase = CultivableMixin(GardenBedGround);

export default class GardenBed extends GardenBedBase {
  static fieldMeta: FieldMeta = {};
}
