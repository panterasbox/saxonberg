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
import { PopulatesMixin } from "../lib/stuff/Populates";
import type { PopulateSpec } from "../lib/stuff/Populates";
import { MixinApi } from "../api/mixin";
import type { Slottable } from "../lib/slot/Slottable";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";

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
// PopulatesMixin so a starter pot can ship pre-planted as pure template
// data (the dorm's born-with plant). See `adoptArrivals` for why the
// applier is overridden.
const PlantPotBase = PopulatesMixin(
  SlottedMixin(BulkableMixin(ContainerMixin(DetailedMixin(Thing)))),
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

  /**
   * Populate, then **claim the slot**.
   *
   * `PopulatesMixin` places by containment only, so a starter pot's
   * declared plant would otherwise land in the pot's contents *outside*
   * its slot — which is exactly the trap that makes the Slotted capture
   * slice record index -1 and silently drop the occupant on restore. So
   * the applier super-chains and then occupies with whatever `Slottable`
   * arrived, leaving `populates:` author-editable data.
   *
   * Idempotent: a pot whose slot is already claimed is left alone, and a
   * candidate the slot refuses (`canOccupy`, which consults the plant's
   * own `fitsSlot`) stays in the contents rather than throwing — a pot
   * authored too small for its own starter plant is a content bug, not a
   * crash.
   */
  public override async applyPopulates(specs: PopulateSpec[]): Promise<void> {
    await super.applyPopulates(specs);
    this.adoptArrivals();
  }

  /**
   * A pot carries its plant, so the pot's own moves are the plant's moves —
   * and a plant cannot see them: `Containable.onMoved` fires on the thing
   * that moved, and that is the pot. Without this forward, carrying a pot
   * into a footlocker would leave the plant integrating the whole dark
   * window at the level it last sampled in the lit room.
   *
   * This is also what gets the FIRST sample right: during the clone
   * cascade a starter pot is planted before it is placed, so the plant's
   * own first touch samples the pot's interior (dark) — the pot landing in
   * the room is what corrects it.
   */
  public onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null,
  ): void {
    void from;
    void to;
    const plant = this.getPlant();
    if (plant && MixinApi.isGrowing(plant)) plant.noteEnvironmentChanged();
  }

  /** Claim the plant slot with the first eligible arrival in contents. */
  private adoptArrivals(): void {
    if (this.isSlotFull(PLANT_SLOT)) return;
    for (const item of this.getContents()) {
      if (!MixinApi.isSlottable(item)) continue;
      if (item.getOccupiedHost()) continue;
      if (!this.canOccupy(item, PLANT_SLOT)) continue;
      this.occupy(item, PLANT_SLOT);
      return;
    }
  }
}
