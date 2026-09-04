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
 * ## The soil is not here; it is composed
 *
 * ⭐ Everything about the ground's own state — the moisture and nutrient
 * reserves, the reconcile window, the sky edge that credits rain — lives in
 * {@link SoilMixin}, which this composes. **A field has soil and no plant
 * slot**, so the two halves separated the day something other than a pot or
 * a bed had ground: soil's host constraint is `Stuff & Reserved`, which a
 * Location can satisfy, and this one's is not.
 *
 * What is left here is the part that is genuinely about *plants standing in
 * ground*: the slot, the shared-soil division, and the two hooks soil asks
 * of its host — *who is drinking* and *how much sky do you catch*.
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
import type { CommandContributions } from "../../api/command";
import { Mixins, type MixinConstructor, type FieldMeta } from "../mixin";
import { MixinApi } from "../../api/mixin";
import type { Soil } from "./Soil";
import type { Reserved } from "../reserve";
import type { Slotted } from "../slot/Slotted";
import type { Slottable } from "../slot/Slottable";
import type { Bulkable } from "../bulk/Bulkable";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";

// The soil surface is re-exported here because it was born here: every
// shipped importer (the `water` verb, the `feed` verb, their tests) names
// this module, and the lift is a refactor rather than a rename.
export {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from "./Soil";

/**
 * The canonical name of a cultivable's plant slot. Verbs and a plant's own
 * `fitsSlot` speak it; the template authors ONE matching `staticSlots`
 * entry whose `capacity` is how many plants fit — 1 for a pot, N for a
 * bed. One slot with a number, not N slots.
 */
export const PLANT_SLOT = "plant";

/**
 * The public surface a `Plant` and the cultivation verbs speak.
 *
 * It deliberately does NOT extend {@link Soil}: soil is composed beside
 * this at the call site, so the two surfaces are siblings on the host
 * rather than one nested in the other, and `MixinApi.isCultivable`
 * narrows to both at once.
 */
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
  /**
   * Whether this is GROUND — soil in the earth, subject to what the
   * parcel says may be done there — rather than a container of soil you
   * carry about. A garden bed is; a pot is not.
   */
  isFixedGround(): boolean;
  /** Square metres of land this draws from the parcel it stands on. */
  getLandRequirementM2(): number;
}

/**
 * Requires a base that already composes `Container` + `Bulkable` +
 * `Slotted` + `Populates` + `Reserved` + **`Soil`** — composed at the CALL
 * SITE, the `FixtureMixin(… Containable)` precedent. Nesting them inside
 * this factory would collapse TypeScript's inference through the returned
 * class and strip the `Stuff` baseline from every consumer, which is
 * exactly what happened when the soil lift first tried it.
 *
 * ⭐ `Soil` joining that list is the whole shape of the W1 refactor: a
 * cultivable is ground **plus** a plant slot, so a composer writes
 * `CultivableMixin(SoilMixin(…))` and the two halves stay separable for
 * the host — a field — that wants only the first.
 */
export function CultivableMixin<
  TBase extends MixinConstructor<
    Stuff & Container & Bulkable & Slotted & Populates & Reserved & Soil
  >,
>(Base: TBase) {
  return class CultivableMixin extends Base implements Cultivable {
    static _mixinName = Mixins.Cultivable;

    /**
     * **A reachable bed IS a garden.** The working verbs ride the
     * instrument, and for cultivation the instrument is the ground you
     * work — the same relationship a cooking pot has to `cook`/`stir`
     * ("reachable heat + a pot IS a kitchen — no venue flag").
     *
     * `water` is deliberately NOT here: it rides the watering can
     * through the capability table, because there the instrument is the
     * thing carrying the water rather than the thing receiving it. `feed`
     * has no such tool — you work compost in by hand — so it rides the
     * ground like the rest.
     *
     * Collected by the affordance walk (`collectBucketDefs` →
     * `MixinApi.queryMixins`), the `PerceiverMixin` shape.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [
        "platform/cmd/inventory/plant.yaml",
        "platform/cmd/inventory/repot.yaml",
        "platform/cmd/inventory/harvest.yaml",
        "platform/cmd/bulk/feed.yaml",
      ],
      environment: [],
    };

    /** The soil's own checkpoint fields are declared by `SoilMixin`. */
    static fieldMeta: FieldMeta = {
      fixedGround: { persistent: true, authorable: true },
      landRequirementM2: { persistent: true, authorable: true },
    };

    /**
     * Is this ground, or a container of soil?
     *
     * The distinction that decides whether **land use applies**. A garden
     * bed is soil in the earth: what may be grown in it is the parcel's
     * business, and a bed on civic ground is refused. A pot is furniture
     * — you carry it indoors, put it on a windowsill in a rented office,
     * and no zoning ordinance has an opinion, because a houseplant is not
     * agriculture.
     *
     * Authored DATA rather than a class check, so a future planter box
     * that is bolted down needs no new class — and so the rule reads as
     * a property of the thing rather than of its type.
     */
    public fixedGround: boolean = false;

    public isFixedGround(): boolean {
      return this.fixedGround;
    }

    /**
     * Square metres of land this draws from the parcel it stands on —
     * **land's job is to make production scarce, and this is the number
     * that does it.**
     *
     * The draw rides the PRODUCTIVE OBJECT rather than the zone or a
     * per-parcel declaration, for two reasons the development slate
     * settled:
     *
     *   - a **cell count** is not expressive (the only lever is how many
     *     cells, and a barn inside a field zone would draw against
     *     farming);
     *   - a **declared per-zone number** is not honest (an author could
     *     claim a thousand-cell estate draws 1 m² and no player could
     *     tell).
     *
     * An authored constant on the bed is both: compose beds of any size,
     * let a greenhouse draw differently from open ground, and back the
     * total with things a player can walk up to and count. Same shape as
     * `restQuality` on a bed — an authored constant consumed by a system
     * that already exists.
     *
     * **Only productive things draw.** Paths, farmhouses, barns, yards
     * and decoration are free; the distinction was never spatial, it is
     * *does this use produce?* A POT therefore draws 0, which is the
     * default — a houseplant is furniture, not production.
     *
     * ⚠ **Over-draw is permitted and carries NO penalty mechanic.** A
     * hard cap is dishonest (real land does not refuse) and a soft cap is
     * worse (an administered multiplier pretending to be physics).
     * Crowding is competition for light, water and nutrients, so it
     * belongs to the limiting-factor minimum and nowhere else. Resist
     * reimplementing it as a yield penalty here.
     */
    public landRequirementM2: number = 0;

    public getLandRequirementM2(): number {
      return this.landRequirementM2;
    }

    public setLandRequirementM2(value: number): void {
      this.landRequirementM2 = Math.max(0, value);
    }

    public setFixedGround(value: boolean): void {
      this.fixedGround = value;
    }

    // ---------- the two hooks SoilMixin asks of its host ----------

    /**
     * Who is drinking: the summed demand of the plants standing in this
     * ground.
     *
     * ⚠ It reads occupant demand through `waterDemandPerGameDay()`, which
     * is a PURE read of the authored profile and never reconciles.
     * Reading a plant's moisture here instead would re-enter that plant's
     * growth reconcile, which reads this soil — the recursion hazard soil's
     * reentry guard is the belt to.
     */
    public soilWaterDemandPerGameDay(): number {
      let demandPerDay = 0;
      for (const plant of this.getPlants()) {
        if (MixinApi.isGrowing(plant)) {
          demandPerDay += plant.waterDemandPerGameDay();
        }
      }
      return demandPerDay;
    }

    /**
     * How much sky this catches: the footprint land use already charges
     * it for. A pot's is zero, so a pot catches nothing.
     */
    public soilCatchmentAreaM2(): number {
      return this.getLandRequirementM2();
    }

    /**
     * The composed soil surface, narrowed — the same `LoadBearing` cast
     * idiom as {@link ground}, for the same reason.
     */
    private get soil(): Soil {
      return this as unknown as Soil;
    }

    /**
     * The prerequisite surface, narrowed. TypeScript does not carry a
     * mixin's base *constraint* into `this` inside the returned class
     * body, so the composed Container/Bulkable/Slotted methods are
     * reached through this cast — the `LoadBearing` idiom.
     */
    private get ground(): Stuff &
      Container &
      Bulkable &
      Slotted &
      Reserved {
      return this as unknown as Stuff &
        Container &
        Bulkable &
        Slotted &
        Reserved;
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
     * Close the soil's window BEFORE the occupancy changes.
     *
     * The soil drains by the summed demand of whoever is standing in it,
     * over its own elapsed window. If a plant were seated without first
     * settling that window, the bed would drain the whole preceding gap
     * at the NEW head count — a plant transplanted into a bed would make
     * that bed retroactively thirsty for a month it was empty, and a
     * plant lifted out would leave its share undrawn. Settling first
     * makes each window drain at the membership it actually had.
     */
    public occupy(candidate: Stuff & Slottable, slot: string): void {
      // …but a RE-SEAT is not a transplant. A candidate already in this
      // host's contents is the persistence restore re-establishing an
      // arrangement that already existed, so settling here would stamp
      // the soil at `now` and swallow the whole absence the record exists
      // to preserve. Same distinction `fitsSlot` draws, for the same
      // reason (husbandry.md: a sizing rule must not veto a restore).
      const reseat =
        MixinApi.isContainable(candidate) &&
        (candidate.getContainer() as Stuff | null) ===
          (this as unknown as Stuff);
      if (slot === PLANT_SLOT && !reseat) this.soil.reconcileSoil();
      super.occupy(candidate, slot);
    }

    /** Symmetric with {@link occupy} — settle before the head count drops. */
    public vacate(
      slot: string,
      candidate: Stuff & Slottable
    ): (Stuff & Slottable) | null {
      if (slot === PLANT_SLOT) this.soil.reconcileSoil();
      return super.vacate(slot, candidate);
    }

    /**
     * Populate, then **claim the slots**.
     *
     * `PopulatesMixin` places by containment only, so a starter pot's
     * declared plant would otherwise land in the contents *outside* its
     * slot — exactly the trap that makes the Slotted capture slice record
     * index `-1` and silently drop the occupant on restore. So the applier
     * super-chains and then seats whatever `Slottable`s arrived, leaving
     * `props:` author-editable data.
     *
     * Idempotent: already-claimed slots are left alone, and a candidate
     * the slot refuses (`canOccupy`, which consults the plant's own
     * `fitsSlot`) stays in the contents rather than throwing — ground
     * authored too small for its own starter plant is a content bug, not a
     * crash.
     */
    public async applyProps(specs: PopulateSpec[]): Promise<void> {
      await super.applyProps(specs);
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
      // Start (or close) the SOIL's own window at the moment the ground is
      // placed, and let it learn WHERE it is. Placement is guaranteed:
      // even a template's `container:` self-placement goes through
      // containment.
      this.soil.settleSoilPlacement();
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
