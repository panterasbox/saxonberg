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
import type { CommandContributions } from "../../api/command";
import { Mixins, type MixinConstructor, type FieldMeta } from "../mixin";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { WorldClockApi } from "../../api/worldclock";
import { AppApi } from "../../api/app";
import { AddressApi } from "../../api/address";
import { BiomeApi } from "../../api/biome";
import { WeatherApi } from "../../api/weather";
import { AppSettingKeys } from "../config/AppSettings";
import { TemplatePaths } from "../paths";
import { Quantity } from "../quantity";
import { Reserve, type Reserved } from "../reserve";
import type { Slotted } from "../slot/Slotted";
import type { Slottable } from "../slot/Slottable";
import type { Bulkable } from "../bulk/Bulkable";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type Locality from "../../platform/idea/Locality";

const SECONDS_PER_GAME_DAY = 86_400;

/** The soil's water reserve key (theme `cultivation`). */
export const SOIL_MOISTURE_RESERVE_KEY = "moisture";
/** The soil's nutrient reserve key — nitrogen, the limiting nutrient. */
export const SOIL_NITROGEN_RESERVE_KEY = "nitrogen";

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

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
  /**
   * Whether this is GROUND — soil in the earth, subject to what the
   * parcel says may be done there — rather than a container of soil you
   * carry about. A garden bed is; a pot is not.
   */
  isFixedGround(): boolean;
  /** Square metres of land this draws from the parcel it stands on. */
  getLandRequirementM2(): number;

  // ---------- soil state (its own checkpoint) ----------

  /** Reconcile the soil over elapsed game-time. Sync, read-triggered. */
  reconcileSoil(): void;
  /**
   * Root-zone moisture as a fraction `[0, 1]`, reconciled. `null` when
   * this ground authors no moisture reserve at all.
   */
  soilMoistureFraction(): number | null;
  /**
   * The MEAN moisture fraction across the window the last reconcile just
   * closed — what a plant integrating that same window should see. Falls
   * back to the current fraction when no window has closed.
   */
  meanSoilMoistureFraction(): number | null;
  /** Nutrient level as a fraction `[0, 1]`, or `null` when unauthored. */
  nutrientFraction(): number | null;
  /** Pour water in. Returns the litres actually absorbed (headroom-capped). */
  waterSoil(litres: number): number;
  // ---------- the sky edge (its own checkpoint) ----------
  /**
   * Resolve the covering locality + sky exposure this ground integrates
   * rain against. Async, and the ONLY async step in the rain edge.
   */
  restampWatershed(): Promise<void>;
  /**
   * Litres of rain this ground has absorbed since it was placed. `null`
   * while the covering locality is **unresolved** — which is NOT the
   * same statement as "no rain has fallen".
   */
  rainfallAbsorbedLitres(): number | null;
  /** Whether the sky edge has resolved its locality + exposure yet. */
  isWatershedResolved(): boolean;
  /** Feed the soil. Returns the fraction actually absorbed. */
  feedSoil(fraction: number): number;
  /** Draw nutrient out — what a harvested crop exports. */
  drawNutrient(fraction: number): number;
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
    Stuff & Container & Bulkable & Slotted & Populates & Reserved
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

    /** The soil's own checkpoint travels with the ground it belongs to. */
    static fieldMeta: FieldMeta = {
      soilClockStamp: { persistent: true },
      _soilMeanMoisture: { persistent: true },
      fixedGround: { persistent: true, authorable: true },
      landRequirementM2: { persistent: true, authorable: true },
      // The sky edge's own checkpoint + the identity it integrates
      // against. All four persist: an unresolved ref that came back
      // resolved must not forget it across a restart, and the stamp is
      // the thing that makes the back-fill exact.
      rainClockStamp: { persistent: true },
      _rainLocalityPath: { persistent: true, runtimeState: true },
      _rainSkyExposed: { persistent: true, runtimeState: true },
      _rainResolved: { persistent: true, runtimeState: true },
      _rainAbsorbedLitres: { persistent: true },
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

    // ---------- soil state: its OWN checkpoint ----------

    /**
     * Game-seconds stamp of the last soil reconcile; `0` = never touched.
     * The soil has a stamp **of its own** — that is the whole reason
     * moisture can live here without splitting one checkpoint across two
     * objects. The bed re-derives from its own stamp; the plant only
     * reads. Two self-contained checkpoints, not one shared one.
     */
    public soilClockStamp = 0;

    /**
     * Mean moisture fraction across the window the last reconcile closed.
     * `-1` = no window yet (report the instantaneous value instead).
     */
    public _soilMeanMoisture = -1;

    /** Reentry guard — the soil reconcile must never recurse. */
    private _reconcilingSoil = false;

    /**
     * Integrate the soil over elapsed game-time: drain moisture by the
     * **summed** water demand of its occupants, scaled by warmth.
     *
     * ⚠ It reads occupant demand through `waterDemandPerGameDay()`, which
     * is a PURE read of the authored profile and never reconciles. Reading
     * a plant's moisture here instead would re-enter that plant's growth
     * reconcile, which reads this soil — the recursion hazard. The reentry
     * guard is the belt to that braces.
     *
     * Draining by summed demand rather than letting each plant debit as it
     * is read is also what removes the read-order artifact: whoever
     * touches the bed first triggers the same total drain, so looking at
     * plant A before plant B gives the same world as B before A.
     */
    public reconcileSoil(): void {
      if (this._reconcilingSoil) return;
      const nowS = this.soilNowSeconds();
      if (nowS === null) return;

      const reserved = this.ground;
      if (!reserved.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
        this.soilClockStamp = nowS;
        return;
      }

      // The sky pours in BEFORE the window drains, because that is the
      // order it physically happened in: rain fell across the window the
      // plants were drinking through. It runs on its OWN stamp, so it is
      // unaffected by every early return below — a bed whose soil window
      // is empty may still have a month of rain to credit.
      this.integrateRainfall(nowS);

      // First touch: seed the stamp, integrate nothing.
      if (this.soilClockStamp === 0) {
        this.soilClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.soilClockStamp;
      if (elapsed <= 0) {
        this.soilClockStamp = nowS;
        return;
      }

      this._reconcilingSoil = true;
      try {
        const reserve = reserved.getReserve(SOIL_MOISTURE_RESERVE_KEY);
        const capacity = reserve ? reserve.capacity.rawValue() : 0;
        const start = reserve ? reserve.current.rawValue() : 0;
        const warmth = this.soilWarmth();
        // Summed demand — more plants drink the bed dry faster, which is
        // water competition emerging from the same source of truth the
        // shared-soil root competition comes from. No new rule.
        let demandPerDay = 0;
        for (const plant of this.getPlants()) {
          if (MixinApi.isGrowing(plant)) {
            demandPerDay += plant.waterDemandPerGameDay();
          }
        }
        const draw =
          demandPerDay * (elapsed / SECONDS_PER_GAME_DAY) * warmth;

        if (capacity > 0 && draw > 0) {
          const end = Math.max(0, start - draw);
          // The mean over the window. The drain is linear in time, so the
          // mean is the midpoint UNLESS the soil ran dry partway: then it
          // is a triangle over the fraction of the window before empty.
          const startF = clamp01(start / capacity);
          const endF = clamp01(end / capacity);
          this._soilMeanMoisture =
            end > 0
              ? (startF + endF) / 2
              : draw > 0
                ? (startF * (start / draw)) / 2
                : startF;
          reserved.adjustReserve(
            SOIL_MOISTURE_RESERVE_KEY,
            Quantity.of(-(start - end), "L"),
          );
        } else if (capacity > 0) {
          this._soilMeanMoisture = clamp01(start / capacity);
        }
        this.soilClockStamp = nowS;
      } finally {
        this._reconcilingSoil = false;
      }
    }

    // ---------- the sky edge: rain reaches soil ----------

    /**
     * Game-seconds stamp of the last rainfall integration; `0` = never.
     *
     * ⭐⭐ **The rain edge has a checkpoint of its OWN, and that is the
     * whole safety property.** Resolving which locality covers this
     * ground is asynchronous (an address walk); the reconcile that wants
     * the answer is synchronous. So there is a window — sometimes a long
     * one, across a restart — in which the ground genuinely does not
     * know where it is.
     *
     * ⚠⚠ **Unresolved must never read as zero.** The requirements name
     * this the build's highest risk, and this codebase has been bitten
     * three times by a cache nothing warms reading null forever while
     * hand-constructed tests stayed green. So: while
     * {@link _rainResolved} is false this stamp does **not advance**,
     * and the first successful resolve therefore integrates the entire
     * backlog. "Not yet resolved" and "resolved to nothing" are
     * different values, and only the second one credits zero rain.
     */
    public rainClockStamp = 0;

    /**
     * Template path of the covering `Locality`, or `null` for ground
     * that resolves none. The **identity** is cached (async, once); the
     * **state** — how much fell — is derived live from it on every read.
     */
    public _rainLocalityPath: string | null = null;

    /** Whether the resolve found this ground under open sky. */
    public _rainSkyExposed = false;

    /**
     * Whether {@link restampWatershed} has ever completed. The tri-state
     * lives here rather than in `_rainLocalityPath === null`, because a
     * bed in a cellar legitimately resolves NO locality and must be
     * distinguishable from a bed that has not looked yet.
     */
    public _rainResolved = false;

    /** Running total of litres of rain absorbed — a legibility figure. */
    public _rainAbsorbedLitres = 0;

    /**
     * The in-flight resolve, or `null`. Holding the **promise** rather
     * than a boolean is what makes a second caller *coalesce* onto the
     * first instead of returning early from a walk that has not finished
     * — `await bed.restampWatershed()` has to mean the ref is resolved
     * when it returns, whichever call actually did the work.
     */
    private _rainResolvePromise: Promise<void> | null = null;

    /**
     * Resolve the covering locality and sky exposure, then let the next
     * reconcile integrate everything since the last stamp.
     *
     * The one `await` in the rain edge, kept off the read path — the
     * shape `ThermalMixin.restamp` established for `lastAmbientK`, for
     * the same reason: a reconcile-on-read consumer must not await a
     * walk. Triggered on placement ({@link onMoved}) and kicked lazily
     * from the reconcile when the ref is still unresolved, so a bed
     * restored from a snapshot into a room it never "moved" into heals
     * itself on the next read rather than staying blind forever.
     */
    public restampWatershed(): Promise<void> {
      const inFlight = this._rainResolvePromise;
      if (inFlight !== null) return inFlight;
      const started = this.resolveWatershedRef();
      this._rainResolvePromise = started;
      return started;
    }

    /** The walk itself; {@link restampWatershed} owns the coalescing. */
    private async resolveWatershedRef(): Promise<void> {
      try {
        const host = this as unknown as Stuff & {
          getContainer?: () => unknown;
        };
        const container = host.getContainer?.() ?? null;
        if (container === null || !MixinApi.isContainer(container as Stuff)) {
          // Not anywhere yet. Leave the ref UNRESOLVED — an unplaced bed
          // has no sky, and resolving it to "nothing" here would swallow
          // the rain it catches once it IS put down.
          return;
        }
        const scope = container as Stuff & Container;
        const locality = await AddressApi.resolveLocalityFor(scope);
        this._rainLocalityPath = locality?.getTemplatePath() ?? null;
        this._rainSkyExposed = BiomeApi.isSkyExposed(scope);
        this._rainResolved = true;
      } catch {
        // A failed walk leaves the ref UNRESOLVED rather than resolving
        // it to nothing: the stamp stays put and the backlog survives.
      } finally {
        this._rainResolvePromise = null;
      }
    }

    /** See {@link Cultivable.isWatershedResolved}. */
    public isWatershedResolved(): boolean {
      return this._rainResolved;
    }

    /** See {@link Cultivable.rainfallAbsorbedLitres}. */
    public rainfallAbsorbedLitres(): number | null {
      if (!this._rainResolved) return null;
      this.reconcileSoil();
      return this._rainAbsorbedLitres;
    }

    /**
     * Integrate rainfall over this ground's own window and pour it in.
     *
     * `mm × m² = litres`, with no invented field on either side: the
     * millimetres come from {@link WeatherApi.precipitationBetween} and
     * the square metres from the bed's authored
     * {@link getLandRequirementM2}, which is already the footprint land
     * use charges it for.
     *
     * ⭐ **A pot therefore catches nothing, and that is correct.** A pot
     * draws zero land because a houseplant is furniture rather than
     * production — so it is watered by hand, exactly as it ships. Ground
     * that *is* production is ground the sky can find.
     */
    private integrateRainfall(nowS: number): void {
      // First touch: open the window and integrate nothing. This runs
      // BEFORE the resolved check on purpose — the window has to START
      // at the earliest honest moment (the ground exists and the clock
      // is running), or an unresolved ref would have no backlog to
      // back-fill and the whole checkpoint would be decoration.
      if (this.rainClockStamp === 0) {
        this.rainClockStamp = nowS;
        if (!this._rainResolved) void this.restampWatershed();
        return;
      }

      // ⚠⚠ UNRESOLVED: the stamp does **not** advance. The window stays
      // open, the backlog accrues, and the first successful resolve
      // integrates all of it. Reading zero here instead would be the
      // silent failure this build's highest-risk item is named after —
      // it looks exactly like a dry month.
      if (!this._rainResolved) {
        void this.restampWatershed();
        return;
      }

      const from = this.rainClockStamp;
      if (nowS <= from) {
        this.rainClockStamp = nowS;
        return;
      }
      this.rainClockStamp = nowS;

      // Resolved, but under a roof or with no land: the window closes
      // with zero rain, which is an ANSWER rather than an absence.
      if (!this._rainSkyExposed) return;
      const areaM2 = this.getLandRequirementM2();
      if (areaM2 <= 0) return;

      const locality = this._rainLocalityPath === null
        ? null
        : (StuffApi.findByTemplatePath(
            this._rainLocalityPath,
          ) as Locality | null);

      const fell = WeatherApi.precipitationBetween(
        Quantity.of(from, "s"),
        Quantity.of(nowS, "s"),
        locality,
      );
      // Liquid only. Snow banks at altitude and releases on melt — that
      // is the watershed's integral, not the soil's.
      const litres = fell.liquid.rawValue() * areaM2;
      if (litres <= 0) return;
      this._rainAbsorbedLitres += this.creditReserve(
        SOIL_MOISTURE_RESERVE_KEY,
        litres,
        "L",
      );
    }

    /** Root-zone moisture `[0, 1]`, reconciled; null when unauthored. */
    public soilMoistureFraction(): number | null {
      if (!this._reconcilingSoil) this.reconcileSoil();
      return this.reserveFraction(SOIL_MOISTURE_RESERVE_KEY);
    }

    /** The window-mean a plant integrating the same window should read. */
    public meanSoilMoistureFraction(): number | null {
      const current = this.soilMoistureFraction();
      if (current === null) return null;
      return this._soilMeanMoisture < 0 ? current : this._soilMeanMoisture;
    }

    /** Nutrient level `[0, 1]`; null when this ground authors none. */
    public nutrientFraction(): number | null {
      return this.reserveFraction(SOIL_NITROGEN_RESERVE_KEY);
    }

    /**
     * Pour water in — reconcile first (so the window that just ended is
     * credited at its true dryness), then fill up to headroom. Returns the
     * litres actually absorbed, so a verb can say "it is already full".
     */
    public waterSoil(litres: number): number {
      if (!Number.isFinite(litres) || litres <= 0) return 0;
      this.reconcileSoil();
      return this.creditReserve(SOIL_MOISTURE_RESERVE_KEY, litres, "L");
    }

    /** Feed the soil; returns the fraction actually absorbed. */
    public feedSoil(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      return this.creditReserve(SOIL_NITROGEN_RESERVE_KEY, fraction, "%");
    }

    /** Draw nutrient out — what a harvested crop exports. */
    public drawNutrient(fraction: number): number {
      if (!Number.isFinite(fraction) || fraction <= 0) return 0;
      const reserved = this.ground;
      const reserve = reserved.getReserve(SOIL_NITROGEN_RESERVE_KEY);
      if (!reserve) return 0;
      const taken = Math.min(fraction, reserve.current.rawValue());
      if (taken <= 0) return 0;
      reserved.adjustReserve(
        SOIL_NITROGEN_RESERVE_KEY,
        Quantity.of(-taken, reserve.current.unit),
      );
      return taken;
    }

    /** A reserve's current level as a fraction, or null when unauthored. */
    private reserveFraction(key: string): number | null {
      const reserve = this.ground.getReserve(key);
      if (!reserve) return null;
      const capacity = reserve.capacity.rawValue();
      if (capacity <= 0) return null;
      return clamp01(reserve.current.rawValue() / capacity);
    }

    /** Credit a reserve up to its headroom; returns the amount applied. */
    private creditReserve(key: string, amount: number, unit: "L" | "%"): number {
      const reserved = this.ground;
      const reserve = reserved.getReserve(key);
      if (!reserve) return 0;
      const headroom =
        reserve.capacity.rawValue() - reserve.current.rawValue();
      const applied = Math.min(amount, Math.max(0, headroom));
      if (applied <= 0) return 0;
      reserved.adjustReserve(key, Quantity.of(applied, unit));
      return applied;
    }

    /**
     * Warmth multiplier on evaporation — the same shape `GrowingMixin`
     * applies to transpiration, read off this ground's own thermal state
     * when it has one.
     */
    private soilWarmth(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isThermal(self)) return 1;
      try {
        const k = self.lastAmbientK;
        const reference = dial(AppSettingKeys.husbandryWarmthReferenceK, 295);
        const factor = dial(AppSettingKeys.husbandryWarmthFactor, 0.03);
        return Math.max(0.1, 1 + (k - reference) * factor);
      } catch {
        return 1;
      }
    }

    /** Game-seconds now, or null when no world clock (pre-boot / tests). */
    private soilNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
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
      if (slot === PLANT_SLOT && !reseat) this.reconcileSoil();
      super.occupy(candidate, slot);
    }

    /** Symmetric with {@link occupy} — settle before the head count drops. */
    public vacate(
      slot: string,
      candidate: Stuff & Slottable
    ): (Stuff & Slottable) | null {
      if (slot === PLANT_SLOT) this.reconcileSoil();
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
      // placed. The soil seeds its stamp lazily on first read, and being
      // put down is the earliest honest moment — otherwise a bed that
      // nobody looks at until later stamps itself then, silently skipping
      // the whole elapsed window and handing its occupants a full reserve
      // they should long since have drunk. Placement is guaranteed: even a
      // template's `container:` self-placement goes through containment.
      this.reconcileSoil();
      // Being put down is also where the ground learns WHERE it is: the
      // sky edge's covering locality + exposure re-resolve here, exactly
      // as thermal's cached ambient does. Fire-and-forget — the read
      // path never awaits, and until it lands the rain stamp holds.
      void this.restampWatershed();
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
