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
 * `applyProps` override must wrap `Staged`.
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

import Good from "../../lib/stuff/Good";
import { ThermalMixin } from "../../lib/thermal/Thermal";
import { OrganismMixin } from "../../lib/species/Organism";
import { Reserve, ReservedMixin } from "../../lib/reserve";
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from "../../lib/husbandry/Soil";
import { Quantity } from "../../lib/quantity";
import { GrowingMixin, type GrowthStage } from "../../lib/husbandry/Growing";
import { SlottableMixin } from "../../lib/slot/Slottable";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { LabelledMixin } from "../../lib/description/Labelled";
import { SampledMixin } from "../../lib/instrument/Sampled";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { PersistableApi } from "../../api/persistable";
import { SecurityApi } from "../../api/security";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { Containable } from "../../lib/spatial/Containable";
import type { Slotted } from "../../lib/slot/Slotted";
import type { Difficulty } from "../../lib/advancement/ActSignature";
import type { FieldMeta } from "../../lib/mixin";
import type { CommandContributions } from "../../api/command";

/** Game-seconds in a game day — the root zone walks its window a day at a time. */
const SECONDS_PER_GAME_DAY = 86_400;

/** The most day-steps one root-zone reconcile walks (a long absence lumps). */
const ROOT_ZONE_MAX_STEPS = 180;

/**
 * ⭐ Litres of water a labeled plant's root zone holds per litre of root
 * demand (field population D6) — roughly a loam's available water, so a
 * mature wheat's zone (3 L of roots) holds about a litre: a can tips most
 * of itself onto the ground around it, and a day's drink is a real share.
 */
const ROOT_ZONE_WATER_L_PER_L_SOIL = 0.35;

/**
 * ⭐ Game-days for a root zone's water to run halfway-and-more (one e-fold)
 * toward the ground around it — water in a wet pocket runs into the dry
 * soil beside it in a couple of days, which is why a can must come DAILY.
 */
const ROOT_ZONE_EQUILIBRATION_DAYS = 2;

/** The same for its nitrogen — a fed pocket holds its feed far longer. */
const ROOT_ZONE_NITROGEN_EQUILIBRATION_DAYS = 10;

/**
 * Room below this (a centilitre, or a hundredth of a point) is a FULL
 * zone. A zone holds about a litre and drinks every second, so a second
 * can a moment after the first found a sliver of room and tipped "0 L"
 * into it (found staging W4 live): that is "already wet through".
 */
const ROOT_ZONE_FULL_WITHIN = 0.01;

// PersistableMixin OUTERMOST — the documented host rule. ⭐ Labelled and
// Sampled (field population D6/D7): every plant may carry a player's
// name and a provenance stamp — a pot lily as much as a stem pulled from
// a field. Both are inert fields.
const PlantBase = PersistableMixin(
  SampledMixin(
    LabelledMixin(
      SlottableMixin( GrowingMixin( ReservedMixin(OrganismMixin(ThermalMixin(Good))), ), ),
    ),
  ),
);

export default class Plant extends PlantBase {
  /**
   * ⭐ A plant affords its OWN harvest, wherever it stands. A bed or pot
   * affords it too (`CultivableMixin`, so `pick the bed` works), but a
   * plant needs no host to be cut: cane standing in a field, a herb in a
   * walled physic garden. Medicine shipped this as a pack class
   * (`PhysicPlant`, clinical-medicine D10); sugar's field cane was the
   * second pack to need it, so it moved here and that class retired
   * (sugar build, 2026-10-19).
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ["platform/cmd/inventory/harvest.yaml"],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    seedTemplatePath: { persistent: true, authorable: true },
    standardMaterialPath: { persistent: true, authorable: true },
    // ⭐ The root zone's own clock (field population D6). `0` = no zone.
    _rootZoneStamp: { persistent: true, runtimeState: true },
  };

  /**
   * The `/trade/farming/thing/seed/…` template a flowering episode mints. Null for a
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
   * The wood a FELLED one of these is made of — `/stuff/idea/material/wood/…`
   * — when no stand answers for it (a standard planted in a panel whose
   * room is not a wood). Null for anything that is not a standard: a
   * carrot is harvested, never felled. Read by the forestry trade's
   * `fell`; the plant's own `_materialPath` stays the living tissue.
   */
  public standardMaterialPath: string | null = null;

  public getStandardMaterialPath(): string | null {
    return this.standardMaterialPath;
  }

  public setStandardMaterialPath(value: string | null): void {
    this.standardMaterialPath = value;
  }

  /**
   * ⭐ **A stand answers to the name of the part it stands in** (field
   * population D13): a crop rooted in a field's top end also answers to
   * *top end* and *top-end*, so `look top end wheat` binds that stand and
   * no other. Derived from the part it is bound to (the part's own name
   * and key — the kernel's parts protocol), never authored: a renamed
   * part renames the words, and a plant bound to nothing keeps its own.
   */
  public override getKeywords(): string[] {
    const own = super.getKeywords();
    const key = this.getGroundPart();
    // ⭐ Only a STAND answers to its patch's name. A labeled individual
    // standing in the same patch answers to its label (field population
    // W4) — giving it the patch's words too would make `look top end
    // wheat` ask which of two things the player meant.
    if (!key || !this.isAreaCrop()) return own;
    const part = this.getBed();
    if (!part || part.soilPartKey() !== key) return own;
    const stem = part.presentationPhrase().bare().toLowerCase();
    return [...new Set([...own, stem, key])];
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
    // ⭐ Only a pot or a bed has a root CEILING. Ground the plant stands
    // in (a field — cover build D1) roots it without one: `null`, the
    // shipped meaning of "not a root constraint".
    const bed = this.getBed();
    return bed && MixinApi.isCultivable(bed) ? bed.rootRoomPerPlant() : null;
  }

  // ---------- ⭐ the root zone (field population D6) ----------

  /**
   * Game-seconds stamp of the root zone's last reconcile; `0` = this plant
   * has no root zone of its own (every plant but a labeled one).
   */
  public _rootZoneStamp = 0;

  /**
   * The mean moisture fraction across the window the last zone reconcile
   * closed; `-1` = no window yet. A runtime cache, as the soil's is.
   */
  private _rootZoneMeanMoisture = -1;

  /** Reentry guard — the zone reconcile must never recurse. */
  private _reconcilingRootZone = false;

  /**
   * Whether this plant keeps a root zone of its own — the pocket of ground
   * a player waters and feeds by hand around ONE plant in a field.
   */
  public hasRootZone(): boolean {
    return this._rootZoneStamp > 0 && this.hasReserve(SOIL_MOISTURE_RESERVE_KEY);
  }

  /**
   * ⭐ Give this plant a root zone of its own (field population D6): a
   * water reserve sized to its roots (`rootDemand[stage] ×`
   * {@link ROOT_ZONE_WATER_L_PER_L_SOIL} L) and a nitrogen reserve, both
   * seeded at the ground's fractions, on the plant's OWN `Reserved`.
   * Idempotent. From here the plant drinks from its zone, and the zone
   * runs toward the ground around it — so care aimed at THIS plant keeps
   * it above its patch only while the care keeps coming.
   */
  public installRootZone(): void {
    if (this.hasRootZone()) return;
    const bed = this.getBed();
    const water = bed?.soilMoistureFraction() ?? null;
    const nitrogen = bed?.nutrientFraction() ?? null;
    const capacity = this.rootZoneCapacityL();
    this.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(capacity, "L"),
        Quantity.of(capacity * (water ?? 0.5), "L"),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
    // A pot authors no nitrogen, and neither does a zone over ground that
    // has none — `nutrientLevel` then reads the ground's `null`.
    if (nitrogen !== null) {
      this.setReserve(
        new Reserve(
          SOIL_NITROGEN_RESERVE_KEY,
          Quantity.of(100, "%"),
          Quantity.of(100 * nitrogen, "%"),
          SOIL_RESERVE_THEME,
          null,
        ),
      );
    }
    const nowS = this.growthNowSeconds();
    this._rootZoneStamp = nowS !== null && nowS > 0 ? nowS : 1;
    this._rootZoneMeanMoisture = -1;
  }

  /**
   * Walk the root zone's window a game day at a time: the plant drinks
   * (`litresPerGameDay × warmth` on that day), then the zone relaxes
   * toward the ground around it — water with
   * {@link ROOT_ZONE_EQUILIBRATION_DAYS}, nitrogen with
   * {@link ROOT_ZONE_NITROGEN_EQUILIBRATION_DAYS}. **The plant never moves
   * the ground's reserve**: the ground keeps its own checkpoint, and the
   * zone only reads it (the two-checkpoint rule). A plant with no zone
   * does nothing here.
   */
  public reconcileRootZone(): void {
    if (this._reconcilingRootZone || !this.hasRootZone()) return;
    const nowS = this.growthNowSeconds();
    if (nowS === null) return;
    const from = this._rootZoneStamp;
    const elapsed = nowS - from;
    if (elapsed <= 0) return;
    this._reconcilingRootZone = true;
    try {
      this.resizeRootZone();
      const bed = this.getBed();
      // The ground's mean over the window — what a plant integrating the
      // same window reads; the ground reconciles itself on its own stamp.
      const groundWater = bed?.meanSoilMoistureFraction() ?? null;
      const groundNitrogen = bed?.nutrientFraction() ?? null;
      const demand = this.waterDemandPerGameDay();
      const steps = Math.min(
        ROOT_ZONE_MAX_STEPS,
        Math.max(1, Math.ceil(elapsed / SECONDS_PER_GAME_DAY)),
      );
      let at = from;
      let meanSum = 0;
      for (let i = 1; i <= steps; i++) {
        const to = i === steps ? nowS : from + (elapsed * i) / steps;
        const days = (to - at) / SECONDS_PER_GAME_DAY;
        const water = this.getReserve(SOIL_MOISTURE_RESERVE_KEY)!;
        const capacity = water.capacity.rawValue();
        const start = water.current.rawValue();
        // The day's drink, at that day's warmth — a draw INSIDE the walk.
        const draw = demand * days * this.transpirationWarmthAt((at + to) / 2);
        let level = Math.max(0, start - draw);
        if (groundWater !== null && capacity > 0) {
          const k = 1 - Math.exp(-days / ROOT_ZONE_EQUILIBRATION_DAYS);
          level += (groundWater * capacity - level) * k;
        }
        this.adjustReserve(
          SOIL_MOISTURE_RESERVE_KEY,
          Quantity.of(level - start, "L"),
        );
        meanSum += capacity > 0 ? (start + level) / 2 / capacity : 0;
        const n = this.getReserve(SOIL_NITROGEN_RESERVE_KEY);
        if (n && groundNitrogen !== null) {
          const k = 1 - Math.exp(-days / ROOT_ZONE_NITROGEN_EQUILIBRATION_DAYS);
          const cur = n.current.rawValue();
          this.adjustReserve(
            SOIL_NITROGEN_RESERVE_KEY,
            Quantity.of((groundNitrogen * 100 - cur) * k, "%"),
          );
        }
        at = to;
      }
      this._rootZoneMeanMoisture = Math.min(1, Math.max(0, meanSum / steps));
      this._rootZoneStamp = nowS;
    } finally {
      this._reconcilingRootZone = false;
    }
  }

  /** The zone's water capacity at this plant's CURRENT stage, litres. */
  private rootZoneCapacityL(): number {
    const demand =
      this.getProfile()?.rootDemand[this.growthStage as GrowthStage] ?? 0;
    return Math.max(0.05, (Number.isFinite(demand) ? demand : 0) * ROOT_ZONE_WATER_L_PER_L_SOIL);
  }

  /**
   * Roots grow with the stage, and the pocket they drink from with them:
   * a stage advance re-sizes the zone at the SAME fraction, so a young
   * plant's wet pocket is not a mature one's half-empty one.
   */
  private resizeRootZone(): void {
    const water = this.getReserve(SOIL_MOISTURE_RESERVE_KEY);
    if (!water) return;
    const capacity = this.rootZoneCapacityL();
    const was = water.capacity.rawValue();
    if (Math.abs(capacity - was) < 1e-9) return;
    const fraction = was > 0 ? water.current.rawValue() / was : 0;
    this.setReserve(
      new Reserve(
        SOIL_MOISTURE_RESERVE_KEY,
        Quantity.of(capacity, "L"),
        Quantity.of(capacity * fraction, "L"),
        SOIL_RESERVE_THEME,
        null,
      ),
    );
  }

  /** A zone reserve's fraction, reconciled; `null` when the zone has none. */
  private rootZoneFraction(key: string): number | null {
    this.reconcileRootZone();
    const r = this.getReserve(key);
    if (!r) return null;
    const capacity = r.capacity.rawValue();
    return capacity > 0 ? Math.min(1, Math.max(0, r.current.rawValue() / capacity)) : null;
  }

  /** Credit a zone reserve up to its headroom; returns what it took. */
  private creditRootZone(key: string, amount: number, unit: "L" | "%"): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    this.reconcileRootZone();
    const r = this.getReserve(key);
    if (!r) return 0;
    const applied = Math.min(
      amount,
      Math.max(0, r.capacity.rawValue() - r.current.rawValue()),
    );
    if (applied <= 0) return 0;
    this.adjustReserve(key, Quantity.of(applied, unit));
    return applied;
  }

  /** A zone reserve's room left, reconciled; `0` when the zone has none. */
  private rootZoneHeadroom(key: string): number {
    this.reconcileRootZone();
    const r = this.getReserve(key);
    if (!r) return 0;
    const room = r.capacity.rawValue() - r.current.rawValue();
    return room < ROOT_ZONE_FULL_WITHIN ? 0 : room;
  }

  /**
   * The moisture of the soil this plant is rooted in — phase 2 moved the
   * water out of the plant and into the ground, so this is a pure read of
   * the bed's own reconciled state. **The plant never mutates the bed
   * during its own reconcile**; that is what keeps the two checkpoints
   * self-contained. ⭐ A plant with a root zone reads its zone (D6).
   *
   * `null` when unrooted, which makes `satWater` 0 — the literal form of
   * husbandry.md's "nothing can hold moisture for it".
   */
  protected override soilMoisture(): number | null {
    if (this.hasRootZone()) {
      return this.rootZoneFraction(SOIL_MOISTURE_RESERVE_KEY);
    }
    return this.getBed()?.soilMoistureFraction() ?? null;
  }

  /** The window-mean the reconcile loop integrates against. */
  protected override meanSoilMoisture(): number | null {
    if (this.hasRootZone()) {
      const current = this.rootZoneFraction(SOIL_MOISTURE_RESERVE_KEY);
      if (current === null) return null;
      return this._rootZoneMeanMoisture < 0 ? current : this._rootZoneMeanMoisture;
    }
    return this.getBed()?.meanSoilMoistureFraction() ?? null;
  }

  /**
   * The nutrient level of the ground. A pot authors no nitrogen reserve,
   * so this reads `null` there and a houseplant is never nutrient-limited
   * — the pot's behaviour is unchanged by the fourth factor's arrival.
   * A root zone with nitrogen reads its own.
   */
  protected override nutrientLevel(): number | null {
    if (this.hasRootZone() && this.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      return this.rootZoneFraction(SOIL_NITROGEN_RESERVE_KEY);
    }
    return this.getBed()?.nutrientFraction() ?? null;
  }

  /**
   * Watering a plant waters its ground; every occupant shares it. ⭐ A
   * plant with a root zone takes the water into its zone ALONE — the can
   * was aimed at this plant, and the patch's reserve does not move.
   */
  protected override waterTheSoil(litres: number): number {
    if (this.hasRootZone()) {
      return this.creditRootZone(SOIL_MOISTURE_RESERVE_KEY, litres, "L");
    }
    return this.getBed()?.waterSoil(litres) ?? 0;
  }

  /** Feed this plant — its root zone when it has one, else its ground. */
  public override feedPlant(points: number): number {
    if (this.hasRootZone() && this.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      return this.creditRootZone(SOIL_NITROGEN_RESERVE_KEY, points, "%");
    }
    return super.feedPlant(points);
  }

  /** Litres this plant's soil can still take — its zone's, when it has one. */
  public override waterHeadroomL(): number {
    if (this.hasRootZone()) return this.rootZoneHeadroom(SOIL_MOISTURE_RESERVE_KEY);
    return super.waterHeadroomL();
  }

  /** Points of nitrogen this plant's soil can still take — likewise. */
  public override nutrientHeadroom(): number {
    if (this.hasRootZone() && this.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      return this.rootZoneHeadroom(SOIL_NITROGEN_RESERVE_KEY);
    }
    return super.nutrientHeadroom();
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
   * on first demand, never in `onCreate`: a keyed restore stamps the
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
    // ⭐ An area crop's seed IS its harvest — a field of wheat does not
    // drop a sack of seed wheat at its feet every time it flowers.
    if (this.isAreaCrop()) return;
    const bed = this.getBed();
    const target: Stuff | null =
      bed ?? (MixinApi.isContainable(this) ? this.getContainer() : null);
    if (!target || !MixinApi.isContainer(target)) return;
    void (async () => {
      try {
        const seed = await StuffApi.clone<Stuff>(path, undefined, {
          madeFrom: this as unknown as Stuff,
        });
        // ⭐ The move places it and captures its host in one call. A seed
        // a flowering set has no actor, so it carries no title.
        if (MixinApi.isContainable(seed)) {
          ContainmentApi.move(seed as Stuff & Containable, target as Stuff & Container);
        } else {
          await PersistableApi.captureHostOf(this);
        }
      } catch (err) {
        console.warn(
          `Plant.onFloweringLatched: could not set a seed from '${path}':`,
          err,
        );
      }
    })();
  }
}
