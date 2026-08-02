/**
 * Plant — a cultivated growing thing: the `Slottable` occupant of a pot's
 * one plant slot, and **its own persistence host**.
 *
 * **Growing ⇒ cultivated ⇒ durable.** A `Plant` owns its own persistence
 * record, keyed per instance, and carries its own location — so it keeps
 * growing wherever you take it, and nothing about its durability is wired
 * to dorm code. Decorative greenery in a lobby is *scenery* — an ordinary
 * `Thing` with a description — and needs none of this. A cultivated plant
 * left loose in a **transient** room is abandoned with it, the same rule
 * chattel.md already applies to owned goods.
 *
 * `PersistableMixin` composes **outermost** (the host rule): its
 * `cleanupOnDestruct` must fire before any inner evacuation, and its
 * `applyPopulates` override must wrap `Populates`.
 *
 * Everything about *how* it grows lives in `GrowingMixin`; this class is
 * only the three host seams the mixin declares plus the bed relationship:
 *
 *   - `rootRoom()` — the soil litres its pot offers (the third limiting
 *     factor), or `null` when unpotted;
 *   - `fitsSlot()` — the candidate-side acceptance test, so a plant whose
 *     stage has outgrown a pot refuses to be repotted into it;
 *   - `onMoved()` — closes the integrated light window at the moment of a
 *     move (the light model has no history to integrate);
 *   - `onFloweringLatched()` — mints one seed per flowering episode.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import { ThermalMixin } from "../lib/thermal/Thermal";
import { OrganismMixin } from "../lib/species/Organism";
import { ReservedMixin } from "../lib/reserve";
import { GrowingMixin } from "../lib/husbandry/Growing";
import { SlottableMixin } from "../lib/slot/Slottable";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { PersistableMixin } from "../lib/persistence/Persistable";
import { MixinApi } from "../api/mixin";
import { StuffApi } from "../api/stuff";
import { ContainmentApi } from "../api/containment";
import { PersistableApi } from "../api/persistable";
import { SecurityApi } from "../api/security";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type { Containable } from "../lib/spatial/Containable";
import type { Slotted } from "../lib/slot/Slotted";
import type { Bulkable } from "../lib/bulk/Bulkable";
import type { Difficulty } from "../lib/advancement/ActSignature";
import type { Cultivable } from "../lib/husbandry/Cultivable";
import type { FieldMeta } from "../lib/mixin";

// PersistableMixin OUTERMOST — the documented host rule.
const PlantBase = PersistableMixin(
  PostRegistrationMixin(
    SlottableMixin(
      GrowingMixin(
        ReservedMixin(OrganismMixin(ThermalMixin(DetailedMixin(Thing)))),
      ),
    ),
  ),
);

export default class Plant extends PlantBase {
  static fieldMeta: FieldMeta = {
    seedTemplatePath: { persistent: true, authorable: true },
    harvestTemplatePath: { persistent: true, authorable: true },
    nutrientDraw: { persistent: true, authorable: true },
  };

  /**
   * The `/obj/seed/…` template a flowering episode mints. Null for a
   * species that sets no seed in v1.
   */
  public seedTemplatePath: string | null = null;

  public getSeedTemplatePath(): string | null {
    return this.seedTemplatePath;
  }

  public setSeedTemplatePath(value: string | null): void {
    this.seedTemplatePath = value;
  }

  /**
   * The `/obj/crop/…` template a harvest mints, mirroring
   * {@link Plant.seedTemplatePath} exactly (the same
   * instantiate-don't-resolve identity-ref variant). Null for an ornamental
   * that yields nothing — a houseplant is not harvestable, and saying so
   * costs one null.
   */
  public harvestTemplatePath: string | null = null;

  public getHarvestTemplatePath(): string | null {
    return this.harvestTemplatePath;
  }

  public setHarvestTemplatePath(value: string | null): void {
    this.harvestTemplatePath = value;
  }

  /**
   * Percentage points of nitrogen this crop takes out of the bed when it
   * is harvested — the export that makes an unfed bed yield worse each
   * time. Authored per species; 0 for a plant that draws nothing.
   */
  public nutrientDraw: number = 0;

  public getNutrientDraw(): number {
    return this.nutrientDraw;
  }

  public setNutrientDraw(value: number): void {
    this.nutrientDraw = Math.max(0, value);
  }

  /**
   * Whether this plant can be harvested right now: it must yield
   * something, be mature, and be alive. Reconciles on read (through
   * `getGrowthStage`), so an absence that ripened it counts.
   */
  public isHarvestable(): boolean {
    if (!this.harvestTemplatePath) return false;
    if (this.getGrowthStage() !== "mature") return false;
    return this.getConditionBand() !== "dead";
  }

  /**
   * The ground this plant is rooted in — a pot or a garden bed — or null
   * when unrooted. Speaks the {@link Cultivable} interface rather than a
   * concrete class: *a pot is a bed with one slot*, and the plant has no
   * business knowing which it is sitting in.
   */
  public getBed():
    | (Stuff & Cultivable & Container & Bulkable & Slotted)
    | null {
    const host = this.getOccupiedHost();
    if (!host) return null;
    return MixinApi.isCultivable(host) ? host : null;
  }

  /**
   * How hard it is to bring this plant's water back right now — the
   * `horticulture` difficulty the `water` verb credits.
   *
   * **A world-measurement, not a tag** (the advancement rule): it reads the
   * plant's own condition, so topping up a thriving plant is trivial and
   * pulling a failing one back is a rescue. The `water` verb only credits
   * anything at all when the soil had headroom, so a routine top-up is
   * genuinely the easy end rather than a grind — and the estimator makes a
   * trivial success barely move the estimate, which is what stops the easy
   * end from being a levelling-mill.
   */
  public careDifficulty(): Difficulty {
    switch (this.getConditionBand()) {
      case "thriving":
        return "trivial";
      case "healthy":
        return "easy";
      case "stressed":
        return "standard";
      default:
        // `failing` — a rescue. (`dead` never reaches here: `waterPlant`
        // absorbs nothing, so the verb credits nothing.)
        return "hard";
    }
  }

  /**
   * How hard it is to move this plant to another pot — the `horticulture`
   * difficulty the `repot` verb credits. Root disturbance scales with what
   * there is to disturb, so a seedling is trivial and a grown plant is not.
   */
  public transplantDifficulty(): Difficulty {
    switch (this.getGrowthStage()) {
      case "seedling":
        return "trivial";
      case "young":
        return "easy";
      case "established":
        return "standard";
      default:
        return "hard"; // `mature`
    }
  }

  /**
   * The soil litres available to THIS plant's roots — the bed's soil
   * shared across its occupied slots.
   *
   * **At N = 1 that is exactly the bed's whole volume**, so every shipped
   * pot behaves as it did in phase 1. Above N = 1 the shared soil makes
   * density a real trade-off through the unchanged `satRoot` curve: a
   * crowded bed root-limits its plants exactly as a too-small pot does.
   *
   * `null` when unrooted: not being in a pot is not a *root* constraint
   * (an unrooted plant is already in trouble via water, since nothing can
   * hold moisture for it, and modelling it twice would double-punish).
   */
  protected override rootRoom(): number | null {
    return this.getBed()?.rootRoomPerPlant() ?? null;
  }

  /**
   * The moisture of the soil this plant is rooted in — phase 2 moved the
   * water out of the plant and into the ground, so this is a pure read of
   * the bed's own reconciled state. **The plant never mutates the bed
   * during its own reconcile**; that is what keeps the two checkpoints
   * self-contained.
   *
   * `null` when unrooted, which makes `satWater` 0 — the literal form of
   * husbandry.md's "nothing can hold moisture for it".
   */
  protected override soilMoisture(): number | null {
    return this.getBed()?.soilMoistureFraction() ?? null;
  }

  /** The window-mean the reconcile loop integrates against. */
  protected override meanSoilMoisture(): number | null {
    return this.getBed()?.meanSoilMoistureFraction() ?? null;
  }

  /**
   * The nutrient level of the ground. A pot authors no nitrogen reserve,
   * so this reads `null` there and a houseplant is never nutrient-limited
   * — the pot's behaviour is unchanged by the fourth factor's arrival.
   */
  protected override nutrientLevel(): number | null {
    return this.getBed()?.nutrientFraction() ?? null;
  }

  /** Watering a plant waters its ground; every occupant shares it. */
  protected override waterTheSoil(litres: number): number {
    return this.getBed()?.waterSoil(litres) ?? 0;
  }

  /**
   * The candidate-side slot test (`Slotted.canOccupy` consults it after
   * its own mixin check): this plant fits a pot iff the pot's soil volume
   * carries its **current stage's** root demand. A mature plant therefore
   * refuses a thimble at `repot` time, with no new `SlotSpec` field.
   *
   * **A plant already inside the pot always fits it.** The sizing rule is a
   * *placement* policy — "may an actor put this plant in that pot" — and
   * both verbs consult it before they move anything. Re-seating a plant
   * that is already in the pot's contents is not a placement: it is the
   * persistence restore re-establishing an arrangement that already
   * existed. Refusing it would make a **root-bound plant unrestorable**,
   * and root-bound is a designed, ordinary state — the one the whole
   * transplanting lesson depends on.
   */
  public override fitsSlot(host: Stuff & Slotted, slot: string): boolean {
    if (!MixinApi.isCultivable(host)) return false;
    void slot;
    if (
      MixinApi.isContainable(this) &&
      (this.getContainer() as Stuff | null) === (host as Stuff)
    ) {
      return true;
    }
    const profile = this.getProfile();
    if (!profile) return true;
    const demand = profile.rootDemand[this.getGrowthStage()];
    if (!Number.isFinite(demand) || demand <= 0) return true;
    // Measured against the room this plant would ACTUALLY get once seated
    // (hence the prospective +1), so a fourth plant is refused entry to a
    // bed sized for three for the same reason a mature plant refuses a
    // thimble — one rule, both scales.
    return host.rootRoomPerPlant(1) >= demand;
  }

  /**
   * Close the integrated light window at the moment of the move. The
   * growth model has no light *history* — it integrates one window at the
   * level in `_lastLux` — so a move must reconcile first (crediting the
   * window that just ended at its true level) and only then re-sample.
   * Carrying a plant into a footlocker stops crediting it lit hours from
   * that instant, exactly as watering closes the dry window.
   */
  public onMoved(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null,
  ): void {
    void from;
    void to;
    this.noteEnvironmentChanged();
  }

  /**
   * Every cultivated plant is one of many instances of its template, so
   * its record is keyed **per instance** — and the key is minted lazily,
   * on first demand, never in `postRegister`: a keyed restore stamps the
   * real key *after* register, so minting at register would race it.
   *
   * The override sits on the getter because the capture path is the only
   * caller that asks — both directly (`capture` resolving the record
   * owner) and through an ancestor's `{ref, key}` entry. A mint writes
   * transient state only; no record exists until a capture writes one.
   */
  public override getPersistenceKey(): string | null {
    return this.ensureCultivationKey();
  }

  /** Mint-if-absent, then return, this plant's per-instance record key. */
  private ensureCultivationKey(): string {
    if (this._persistenceKey) return this._persistenceKey;
    const key = SecurityApi.uuid();
    this.setPersistenceKey(key);
    return key;
  }

  /**
   * One seed per flowering episode: clone the species' seed template into
   * the **pot's** contents — a plant is not a container — falling back to
   * whatever contains the plant when it is unpotted. Fire-and-forget: the
   * reconcile that latched the flowering is synchronous, and a failed
   * seed must never abort a growth read.
   */
  protected override onFloweringLatched(): void {
    const path = this.seedTemplatePath;
    if (!path) return;
    const bed = this.getBed();
    const target: Stuff | null =
      bed ?? (MixinApi.isContainable(this) ? this.getContainer() : null);
    if (!target || !MixinApi.isContainer(target)) return;
    void (async () => {
      try {
        const seed = await StuffApi.clone<Stuff>(path);
        if (MixinApi.isContainable(seed)) {
          ContainmentApi.move(
            seed as Stuff & Containable,
            target as Stuff & Container,
          );
        }
        await PersistableApi.captureHostOf(this);
      } catch (err) {
        console.warn(
          `Plant.onFloweringLatched: could not set a seed from '${path}':`,
          err,
        );
      }
    })();
  }
}
