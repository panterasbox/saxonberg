/**
 * CultivableMixin — **ground that holds plants**: a bulk interior of soil
 * plus a plant slot with room for N. The pot and the garden bed are the
 * same surface with different numbers.
 *
 * The farming slate specifies a bed as *"a `Slotted` fixture with N slots;
 * each plant is a `Slottable`"*, and phase 1 built a pot as exactly that at
 * **N = 1**. This mixin is that shared surface, lifted off `PlantPot`
 * unchanged so the two stay one thing:
 *
 *   - **`PlantPot`** composes it over `Thing` — a pot you can pick up.
 *   - **`GardenBed`** composes exactly the same stack, and you cannot pick
 *     one up **because it is heavy**, not because of its class.
 *
 * That second point is the shipped doctrine, from `Vessel.ts`: *"carry /
 * drag / ride / can't-budge is emergent from mass vs. a bearer's capacity,
 * never a type flag."* `GetController` enforces it through
 * `LoadBearing.wouldExceedCeiling`. A bed also HAS to stay `Containable`:
 * containment is how a thing is in a room, so a non-Containable bed could
 * not be placed in a yard at all — and the land-use gate would then have no
 * placement to gate.
 *
 * ## The soil is SHARED across the occupants
 *
 * `rootRoomPerPlant()` is the soil volume divided by the number of
 * **occupied** slots. At N = 1 that is exactly phase 1's expression, which
 * is how we know the generalization is right — every shipped pot behaves
 * identically. Above N = 1 the shipped `satRoot` curve then does new work
 * for free: more plants in one bed means less root room each, so **density
 * is a genuine trade-off** and a crowded bed stalls exactly the way a
 * pot-bound plant does. No new rule, no new curve.
 *
 * Dividing by *occupied* rather than *capacity* is deliberate: an
 * under-planted bed genuinely gives each plant more, so thinning is a real
 * choice and crowding is a real cost.
 *
 * ## Why Container as well as Slotted
 *
 * A slotted plant must live in the host's **contents** as well as its slot
 * (the wear/equip pattern): the `Slotted` capture slice names its occupants
 * by index into the container slice, so a non-content occupant resolves to
 * `-1` and is silently dropped on restore.
 *
 * See [docs/subsystems/husbandry.md].
 */

import type { PopulateSpec, Populates } from "../stuff/Populates";
import { Mixins, type MixinConstructor } from "../mixin";
import { MixinApi } from "../../api/mixin";
import type { Slotted } from "../slot/Slotted";
import type { Slottable } from "../slot/Slottable";
import type { Bulkable } from "../bulk/Bulkable";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";

/**
 * The canonical name of a cultivable's plant slot. Verbs and a plant's own
 * `fitsSlot` speak it; the template authors ONE matching `staticSlots`
 * entry whose `capacity` is how many plants fit — 1 for a pot, N for a
 * bed. One slot with a number, not N slots.
 */
export const PLANT_SLOT = "plant";

/** The public surface a `Plant` and the cultivation verbs speak. */
export interface Cultivable {
  /** Litres of soil in the interior — the root ceiling, before sharing. */
  getSoilVolume(): number;
  /** Whether there is any soil at all (the planting prerequisite). */
  hasSoil(): boolean;
  /** How many plants this ground has room for (the slot's capacity). */
  plantSlotCount(): number;
  /** How many of them are currently occupied. */
  occupiedSlotCount(): number;
  /**
   * The soil each occupant may draw on — the shared-soil division.
   * `additionalOccupants` asks prospectively: pass `1` to get the share a
   * plant WOULD receive if it were seated now (what `fitsSlot` needs).
   */
  rootRoomPerPlant(additionalOccupants?: number): number;
  /** The first plant in the ground, or null. */
  getPlant(): (Stuff & Slottable) | null;
  /** Every plant in the ground. */
  getPlants(): Array<Stuff & Slottable>;
  /** Whether there is still room for another plant. */
  hasFreePlantSlot(): boolean;
}

/**
 * Requires a base that already composes `Container` + `Bulkable` +
 * `Slotted` + `Populates` — composed at the CALL SITE, the
 * `FixtureMixin(… Containable)` precedent. Nesting the four inside this
 * factory would collapse TypeScript's inference through the returned
 * class and strip the `Stuff` baseline from every consumer.
 */
export function CultivableMixin<
  TBase extends MixinConstructor<
    Stuff & Container & Bulkable & Slotted & Populates
  >,
>(Base: TBase) {
  return class CultivableMixin extends Base implements Cultivable {
    static _mixinName = Mixins.Cultivable;

    /**
     * The prerequisite surface, narrowed. TypeScript does not carry a
     * mixin's base *constraint* into `this` inside the returned class
     * body, so the composed Container/Bulkable/Slotted methods are
     * reached through this cast — the `LoadBearing` idiom.
     */
    private get ground(): Stuff & Container & Bulkable & Slotted {
      return this as unknown as Stuff & Container & Bulkable & Slotted;
    }

    /**
     * The litres of soil — the root ceiling the growth model divides each
     * stage's root demand by. Reads the bulk interior, so pouring soil in
     * raises it through the shipped `pour` path.
     */
    public getSoilVolume(): number {
      return this.ground.getBulkAmount("interior").rawValue();
    }

    /** Whether this ground holds any soil at all. */
    public hasSoil(): boolean {
      return this.getSoilVolume() > 0;
    }

    /**
     * How many plants this ground has room for — the authored `capacity`
     * of its one `plant` slot. A pot ships `capacity: 1`, a bed ships N,
     * so **the pot seeds need no change at all**: the generalization is a
     * number in existing data, not a new field or a new slot.
     */
    public plantSlotCount(): number {
      return this.ground.getSlotSpec(PLANT_SLOT)?.capacity ?? 0;
    }

    /** How many of those places are taken. */
    public occupiedSlotCount(): number {
      return this.ground.getOccupantCount(PLANT_SLOT);
    }

    /**
     * The soil one occupant may draw on: total soil ÷ occupied slots.
     *
     * **At N = 1 this is exactly `getSoilVolume()`**, so every shipped pot
     * and every phase-1 test is unaffected. The `max(1, …)` floor makes an
     * empty bed answer its full volume rather than dividing by zero.
     *
     * `additionalOccupants` asks the prospective question — *how much would
     * a plant get if it joined?* — which is what a candidate's `fitsSlot`
     * must measure against. Asking it non-prospectively would let a fourth
     * plant into a bed sized for three, because the divisor would not yet
     * count the arrival.
     */
    public rootRoomPerPlant(additionalOccupants = 0): number {
      const occupants = this.occupiedSlotCount() + additionalOccupants;
      return this.getSoilVolume() / Math.max(1, occupants);
    }

    /**
     * The first plant in the ground, or null. Uses `getOccupants` rather
     * than `getOccupant`, which throws once a slot holds more than one.
     */
    public getPlant(): (Stuff & Slottable) | null {
      return this.getPlants()[0] ?? null;
    }

    /** Every plant in the ground. */
    public getPlants(): Array<Stuff & Slottable> {
      return [...this.ground.getOccupants(PLANT_SLOT)];
    }

    /** Whether there is still room for another plant. */
    public hasFreePlantSlot(): boolean {
      return !this.ground.isSlotFull(PLANT_SLOT);
    }

    /**
     * Populate, then **claim the slots**.
     *
     * `PopulatesMixin` places by containment only, so a starter pot's
     * declared plant would otherwise land in the contents *outside* its
     * slot — exactly the trap that makes the Slotted capture slice record
     * index `-1` and silently drop the occupant on restore. So the applier
     * super-chains and then seats whatever `Slottable`s arrived, leaving
     * `populates:` author-editable data.
     *
     * Idempotent: already-claimed slots are left alone, and a candidate
     * the slot refuses (`canOccupy`, which consults the plant's own
     * `fitsSlot`) stays in the contents rather than throwing — ground
     * authored too small for its own starter plant is a content bug, not a
     * crash.
     */
    public async applyPopulates(specs: PopulateSpec[]): Promise<void> {
      await super.applyPopulates(specs);
      this.adoptArrivals();
    }

    /**
     * A pot carries its plants, so the host's own moves are their moves —
     * and a plant cannot see them: `Containable.onMoved` fires on the thing
     * that moved, and that is the host. Without this forward, carrying a
     * pot into a footlocker would leave the plant integrating the whole
     * dark window at the level it last sampled in the lit room.
     *
     * This is also what gets the FIRST sample right: during the clone
     * cascade a starter pot is planted before it is placed, so the plant's
     * own first touch samples the interior (dark) — the pot landing in the
     * room is what corrects it.
     *
     * Harmless on a fixture bed, which never moves.
     */
    public onMoved(
      from: (Stuff & Container) | null,
      to: (Stuff & Container) | null
    ): void {
      void from;
      void to;
      for (const plant of this.getPlants()) {
        if (MixinApi.isGrowing(plant)) plant.noteEnvironmentChanged();
      }
    }

    /** Seat eligible arrivals from contents into free plant slots. */
    private adoptArrivals(): void {
      for (const item of this.ground.getContents()) {
        if (!this.hasFreePlantSlot()) return;
        if (!MixinApi.isSlottable(item)) continue;
        if (item.getOccupiedHost()) continue;
        if (!this.ground.canOccupy(item, PLANT_SLOT)) continue;
        this.ground.occupy(item, PLANT_SLOT);
      }
    }
  };
}
