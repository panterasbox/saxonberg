/**
 * SoilMixin — **soil that keeps its own time**: a moisture reserve and a
 * nutrient reserve, integrated over elapsed game-time against the weather
 * that fell on it.
 *
 * This is the half of cultivation that is about the GROUND rather than
 * about the plants standing in it. It was written self-contained inside
 * {@link CultivableMixin} — two checkpoints of its own, no reach into the
 * plant slot except through one summed number — precisely so that it could
 * travel the day something other than a pot or a bed had soil. A field is
 * that day.
 *
 * ## Two checkpoints, and why they are two
 *
 * - **the soil window** ({@link Soil.reconcileSoil}) — drains moisture by
 *   whatever is drinking, scaled by warmth, over its own elapsed window.
 * - **the sky edge** ({@link Soil.restampWatershed}) — credits rain, on a
 *   stamp of its **own**, because resolving *which locality covers this
 *   ground* is asynchronous while the reconcile that wants the answer is
 *   synchronous. ⚠⚠ Unresolved must never read as zero; see
 *   {@link SoilMixin.rainClockStamp}.
 *
 * They are separate stamps rather than one, so a ground whose soil window
 * is empty may still have a month of rain to credit.
 *
 * ## The two hooks — everything host-specific, and nothing else
 *
 * The lift needed exactly two seams, which is the measure of how
 * self-contained this already was:
 *
 * - {@link Soil.soilWaterDemandPerGameDay} — *who is drinking?* A bed
 *   answers with the summed demand of its occupants; bare ground with the
 *   sward standing on it; a host with neither answers `0` and its soil
 *   only ever gains.
 * - {@link Soil.soilCatchmentAreaM2} — *how much sky does this catch?*
 *   `mm × m² = litres`, and the m² is the host's business. A pot answers
 *   `0` and is watered by hand, which is correct: a houseplant is
 *   furniture, not production.
 *
 * Host constraint is `Stuff & Reserved` and nothing more — no Container,
 * no Slotted, no Bulkable — so a **Location** can compose it. That is the
 * whole point of the lift.
 *
 * ⚠ Note what is NOT here: **the seeded half of soil** — texture,
 * drainage, aspect, depth, native pH. Those have exactly one consumer (a
 * field) and live in the farming pack. The derived half has three
 * (`PlantPot`, `GardenBed`, `Field`), which is why it is kernel.
 *
 * See [docs/subsystems/husbandry.md] and [docs/subsystems/soil.md].
 */

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
import type { Reserved } from "../reserve";
import type { Stuff } from "../stuff/Stuff";
import type { Container } from "../spatial/Container";
import type Locality from "../../platform/idea/Locality";

const SECONDS_PER_GAME_DAY = 86_400;

/** The soil's water reserve key (theme `cultivation`). */
export const SOIL_MOISTURE_RESERVE_KEY = "moisture";
/** The soil's nutrient reserve key — nitrogen, the limiting nutrient. */
export const SOIL_NITROGEN_RESERVE_KEY = "nitrogen";

/** The theme every soil reserve carries. */
export const SOIL_RESERVE_THEME = "cultivation";

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

/** The public surface soil offers — the ground's own state. */
export interface Soil {
  // ---------- the soil window ----------

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
  /** Feed the soil. Returns the fraction actually absorbed. */
  feedSoil(fraction: number): number;
  /** Draw nutrient out — what a harvested crop exports. */
  drawNutrient(fraction: number): number;

  // ---------- the sky edge ----------

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
  /**
   * Settle both checkpoints and (re-)resolve where this ground is — what
   * a host calls the moment it is placed, or restored into a place.
   */
  settleSoilPlacement(): void;

  // ---------- the two host hooks ----------

  /**
   * @hook Summed water demand of everything drawing on this soil, in the
   * reserve's own units per **game day**. Default `0` — soil nobody
   * drinks from only ever gains.
   *
   * ⚠ It must be a PURE read of authored profiles and must never
   * reconcile anything: reading an occupant's own moisture here would
   * re-enter that occupant's reconcile, which reads this soil. The
   * reentry guard braces it; this contract is the belt.
   */
  soilWaterDemandPerGameDay(): number;
  /**
   * @hook Square metres of sky this ground catches rain from. Default
   * `0` — ground the sky cannot find is watered by hand.
   */
  soilCatchmentAreaM2(): number;
}

/**
 * Requires a base that already composes `Reserved` — composed at the CALL
 * SITE, the `FixtureMixin(… Containable)` precedent, because nesting it
 * inside this factory would collapse TypeScript's inference through the
 * returned class and strip the `Stuff` baseline from every consumer.
 */
export function SoilMixin<TBase extends MixinConstructor<Stuff & Reserved>>(
  Base: TBase,
) {
  return class SoilMixin extends Base implements Soil {
    /**
     * ⚠ Annotated `string` on purpose, and it is load-bearing.
     *
     * `Mixins` is declared `as const`, so `Mixins.Soil` carries the
     * literal type `"SoilMixin"`. A mixin returning `{ … } & TBase`
     * intersects its statics with the base's, and two **disjoint string
     * literals intersect to `never`** — which reduces the entire composed
     * constructor to `never`, so the composer fails with *"Type 'never' is
     * not a constructor function type"* several files away with nothing
     * pointing back here.
     *
     * The sibling mixins get away with a bare `'SlottedMixin'` because a
     * *fresh* literal widens to `string`; one read off a `const`-asserted
     * object does not. This annotation restores the widening while keeping
     * the registry constant as the single source of truth.
     */
    static _mixinName: string = Mixins.Soil;

    /** The soil's two checkpoints travel with the ground they belong to. */
    static fieldMeta: FieldMeta = {
      soilClockStamp: { persistent: true },
      _soilMeanMoisture: { persistent: true },
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
     * The prerequisite surface, narrowed. TypeScript does not carry a
     * mixin's base *constraint* into `this` inside the returned class
     * body, so the composed `Reserved` methods are reached through this
     * cast — the `LoadBearing` idiom.
     */
    private get soilHost(): Stuff & Reserved {
      return this as unknown as Stuff & Reserved;
    }

    // ---------- the two host hooks ----------

    /** See {@link Soil.soilWaterDemandPerGameDay}. */
    public soilWaterDemandPerGameDay(): number {
      return 0;
    }

    /** See {@link Soil.soilCatchmentAreaM2}. */
    public soilCatchmentAreaM2(): number {
      return 0;
    }

    // ---------- soil state: its OWN checkpoint ----------

    /**
     * Game-seconds stamp of the last soil reconcile; `0` = never touched.
     * The soil has a stamp **of its own** — that is the whole reason
     * moisture can live here without splitting one checkpoint across two
     * objects. The ground re-derives from its own stamp; the plant only
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
     * **summed** demand of whatever is drinking, scaled by warmth.
     *
     * Draining by summed demand rather than letting each drinker debit as
     * it is read is what removes the read-order artifact: whoever touches
     * the ground first triggers the same total drain, so looking at plant
     * A before plant B gives the same world as B before A.
     */
    public reconcileSoil(): void {
      if (this._reconcilingSoil) return;
      const nowS = this.soilNowSeconds();
      if (nowS === null) return;

      const reserved = this.soilHost;
      if (!reserved.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
        this.soilClockStamp = nowS;
        return;
      }

      // The sky pours in BEFORE the window drains, because that is the
      // order it physically happened in: rain fell across the window the
      // plants were drinking through. It runs on its OWN stamp, so it is
      // unaffected by every early return below — ground whose soil window
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
        // Summed demand — more drinkers empty the ground faster, which is
        // water competition emerging from the same source of truth the
        // shared-soil root competition comes from. No new rule.
        const demandPerDay = this.soilWaterDemandPerGameDay();
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
     * lives here rather than in `_rainLocalityPath === null`, because
     * ground in a cellar legitimately resolves NO locality and must be
     * distinguishable from ground that has not looked yet.
     */
    public _rainResolved = false;

    /** Running total of litres of rain absorbed — a legibility figure. */
    public _rainAbsorbedLitres = 0;

    /**
     * The in-flight resolve, or `null`. Holding the **promise** rather
     * than a boolean is what makes a second caller *coalesce* onto the
     * first instead of returning early from a walk that has not finished
     * — `await ground.restampWatershed()` has to mean the ref is resolved
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
     * walk. Triggered on placement ({@link settleSoilPlacement}) and
     * kicked lazily from the reconcile when the ref is still unresolved,
     * so ground restored from a snapshot into a room it never "moved"
     * into heals itself on the next read rather than staying blind
     * forever.
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
        const scope = this.watershedScope();
        if (scope === null) {
          // Not anywhere yet. Leave the ref UNRESOLVED — unplaced ground
          // has no sky, and resolving it to "nothing" here would swallow
          // the rain it catches once it IS put down.
          return;
        }
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

    /**
     * @hook The scope the address walk and the sky-exposure read run
     * against.
     *
     * Ground that is CARRIED — a pot, a bed — asks its **container**: the
     * pot is not a place, the room it stands in is. Ground that IS a place
     * overrides this to answer *itself*, because there is nothing outside
     * it to ask.
     *
     * ⚠ The default deliberately returns `null` rather than falling back
     * to `this` when there is no container. Unplaced ground has no sky,
     * and resolving it to "nothing" here would swallow the rain it
     * catches once it IS put down.
     */
    protected watershedScope(): (Stuff & Container) | null {
      const self = this as unknown as Stuff & {
        getContainer?: () => unknown;
      };
      const container = self.getContainer?.() ?? null;
      if (container === null || !MixinApi.isContainer(container as Stuff)) {
        return null;
      }
      return container as Stuff & Container;
    }

    /** See {@link Soil.isWatershedResolved}. */
    public isWatershedResolved(): boolean {
      return this._rainResolved;
    }

    /** See {@link Soil.rainfallAbsorbedLitres}. */
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
     * the square metres from {@link Soil.soilCatchmentAreaM2}.
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

      // Resolved, but under a roof or with no catchment: the window
      // closes with zero rain, which is an ANSWER rather than an absence.
      if (!this._rainSkyExposed) return;
      const areaM2 = this.soilCatchmentAreaM2();
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
      const reserved = this.soilHost;
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

    /**
     * Settle both checkpoints and re-resolve where this ground is.
     *
     * Called the moment ground is placed — which for a bed is `onMoved`,
     * and for a field is registration. Being put down is the earliest
     * honest moment to open the soil's window: ground nobody looks at
     * until later would otherwise stamp itself then, silently skipping
     * the whole elapsed window and handing its occupants a full reserve
     * they should long since have drunk.
     *
     * The watershed re-resolve is fire-and-forget — the read path never
     * awaits, and until it lands the rain stamp holds.
     */
    public settleSoilPlacement(): void {
      this.reconcileSoil();
      void this.restampWatershed();
    }

    /** A reserve's current level as a fraction, or null when unauthored. */
    private reserveFraction(key: string): number | null {
      const reserve = this.soilHost.getReserve(key);
      if (!reserve) return null;
      const capacity = reserve.capacity.rawValue();
      if (capacity <= 0) return null;
      return clamp01(reserve.current.rawValue() / capacity);
    }

    /** Credit a reserve up to its headroom; returns the amount applied. */
    protected creditReserve(
      key: string,
      amount: number,
      unit: "L" | "%",
    ): number {
      const reserved = this.soilHost;
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
  };
}
