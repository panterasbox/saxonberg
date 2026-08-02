/**
 * ThermalRegulationMixin — the living body's Option-C thermoregulation:
 * the Phase-2 layer that finally **drives** `coreTemperature`. It
 * composes over `ThermalMixin`'s passive substrate (the body holds a
 * stamped temperature it drifts to when regulation fails) and over
 * `MetabolicMixin` (it spends metabolism's reserves to defend a
 * setpoint).
 *
 * **Mirrors MetabolicMixin.** Reconcile-on-read by overriding
 * `getVitalSign` for `coreTemperature` (the `getReserve` analogue) — and
 * it stays SYNC: the reconcile reads a **cached effective ambient**
 * (refreshed only at re-stamp events, never a live async biome call on
 * the read path), so `getVitalSign` keeps its sync signature and the
 * whole vitals read surface — `getConditionBand`, the cockpit poll, the
 * MQL re-resolve — is unaffected. The reconcile sub-steps elapsed
 * game-time like metabolism's, with the same first-touch / linkdead /
 * far-past guards.
 *
 * **Option C (the thermoneutral dead-band).** Effective ambient inside
 * `[setpoint ± band]` pins the core at setpoint for free. Below the band
 * (cold stress) the body spends **satiation** to hold the setpoint and
 * shivers; above it (heat stress) it spends **hydration** to sweat,
 * capped by the wet-bulb evaporative ceiling. When a reserve is
 * exhausted (or past the wet-bulb), regulation fails and the core drifts
 * — the "starving = cold" cliff. An **ectotherm** never defends a
 * setpoint: its core floats to the effective ambient (cold → torpor, hot
 * → death). A robot / construct / no-spendable-reserves body is the same
 * passive drifter, no special-case.
 *
 * Operational reference (graduated at sweep): `docs/subsystems/thermal.md`.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Containable } from "../spatial/Containable";
import type { Reserved } from "../reserve";
import type { Vitals, VitalSign } from "../vitals/Vitals";
import type { Organism } from "../species/Organism";
import type { Thermal } from "./Thermal";
import type { AfflictionRecord } from "../vitals/Condition";
import { Quantity } from "../quantity";
import type { Unit } from "../quantity";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { BiomeApi } from "../../api/biome";
import { WorldClockApi } from "../../api/worldclock";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../config/AppSettings";
import { TemplatePaths } from "../paths";
import { THERMAL_DEFAULTS } from "./Thermal";

/** Numeric AppSetting read with a seeded-literal fallback (test/pre-warm safe). */
function readDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The inner-host surface the regulation layer composes over — Thermal
 * (passive drift + cached ambient), Vitals (the driven `coreTemperature`
 * + conditions + death seam), Reserved (the fuel/water it spends),
 * Organism (species → bodyplan strategy), Containable (the scope whose
 * ambient it resolves). The `MetabolicHost` intersection-cast idiom.
 */
type RegulationHost = Stuff &
  Thermal &
  Vitals &
  Reserved &
  Organism &
  Containable;

export interface ThermalRegulation {
  /** Setpoint (K) the body defends — the movable fever/magic seam. */
  setpointK: number;
  /** Cached effective ambient (raw K) — biome + warmth + clo + transforms. */
  effectiveAmbientK: number;
  /** Cached resolved humidity (%) for the wet-bulb read. */
  cachedHumidity: number;
  /** Game-time (seconds) of the last regulation reconcile; 0 = unseeded. */
  thermalRegStamp: number;

  setSetpointK(value: number): void;
  setEffectiveAmbientK(value: number): void;
  setCachedHumidity(value: number): void;
  setThermalRegStamp(value: number): void;
  getSetpoint(): Quantity<"K">;
  setSetpoint(value: Quantity<"K">): void;

  /** Lazy reconcile — drive coreTemperature over elapsed game-time. */
  reconcileThermalRegulation(): void;
}

function assertFiniteNonNeg(value: number, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${what}: expected a finite number >= 0, got ${String(value)}`,
    );
  }
}

export function ThermalRegulationMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class ThermalRegulationMixin extends Base implements ThermalRegulation {
    static _mixinName = "ThermalRegulationMixin";

    static fieldMeta: FieldMeta = {
      setpointK: { persistent: true, authorable: true },
      effectiveAmbientK: { persistent: true, runtimeState: true },
      cachedHumidity: { persistent: true, runtimeState: true },
      thermalRegStamp: { persistent: true, runtimeState: true },
    };

    public setpointK: number = THERMAL_DEFAULTS.SETPOINT_K;
    public effectiveAmbientK: number = THERMAL_DEFAULTS.SETPOINT_K;
    public cachedHumidity = 50;
    public thermalRegStamp = 0;

    /** Reentry guard (TypeScript `private` per the proxy constraint). */
    private _thermalRegReconciling = false;
    /** Debounce flags so the reconcile doesn't spam cues per slice. */
    private _shiverNoted = false;
    private _sweatNoted = false;

    /**
     * This host, typed for the sibling-mixin members the call-security
     * proxy resolves at runtime. The cast is **load-bearing, not
     * cosmetic**: the body composes `ThermalRegulation` over
     * `Thermal`/`Metabolic`/`Vitals`/`Reserved` (inner) while `Container`/
     * `Containable` wrap it from *outside*, so no single static `Base`
     * type captures the full intersection — only the runtime proxy
     * unifies it. Centralised here so the assertion lives in one place.
     */
    private get regHost(): RegulationHost {
      return this as unknown as RegulationHost;
    }

    // ---------- setters ----------

    public setSetpointK(value: number): void {
      assertFiniteNonNeg(value, "ThermalRegulationMixin.setSetpointK");
      this.setpointK = value;
    }
    public setEffectiveAmbientK(value: number): void {
      assertFiniteNonNeg(value, "ThermalRegulationMixin.setEffectiveAmbientK");
      this.effectiveAmbientK = value;
    }
    public setCachedHumidity(value: number): void {
      assertFiniteNonNeg(value, "ThermalRegulationMixin.setCachedHumidity");
      this.cachedHumidity = value;
    }
    public setThermalRegStamp(value: number): void {
      assertFiniteNonNeg(value, "ThermalRegulationMixin.setThermalRegStamp");
      this.thermalRegStamp = value;
    }
    public getSetpoint(): Quantity<"K"> {
      return Quantity.of(this.setpointK, "K");
    }
    public setSetpoint(value: Quantity<"K">): void {
      if (!(value instanceof Quantity) || value.unit !== "K") {
        throw new TypeError(
          "ThermalRegulationMixin.setSetpoint: expected Quantity<'K'>",
        );
      }
      this.setpointK = value.rawValue();
    }

    // ---------- reconcile-on-read (drives coreTemperature) ----------

    /**
     * The seam that makes thermal *drive* `coreTemperature`. For that one
     * sign, reconcile first (guarded), then return the freshly-driven
     * value from inner Vitals storage. Stays SYNC — reads the cached
     * effective ambient, never a live biome call. Other signs pass
     * straight through.
     */
    public getVitalSign(sign: VitalSign): Quantity<Unit> {
      if (sign === "coreTemperature" && !this._thermalRegReconciling) {
        this.reconcileThermalRegulation();
      }
      return this.innerVitalSign(sign);
    }

    /**
     * Read a vital straight from the inner `VitalsMixin` storage,
     * bypassing this override (so the cascade / core helpers don't
     * re-trigger the reconcile). The `super.getVitalSign` cast is the
     * mixin-super idiom — `Base` is generic, so the inherited method
     * isn't visible to the type system; it resolves to `VitalsMixin`'s
     * implementation at runtime. Centralised here so it lives in exactly
     * one place.
     */
    private innerVitalSign(sign: VitalSign): Quantity<Unit> {
      return (super.getVitalSign as (s: VitalSign) => Quantity<Unit>).call(
        this,
        sign,
      );
    }

    public reconcileThermalRegulation(): void {
      if (this._thermalRegReconciling) return;
      const D = THERMAL_DEFAULTS;

      const nowS = this.regNowSeconds();
      if (nowS === null) return; // no world clock — idle

      if (this.thermalRegStamp === 0) {
        this.thermalRegStamp = nowS;
        return;
      }

      const self = this.regHost;
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.thermalRegStamp = nowS;
        return;
      }

      const elapsed = nowS - this.thermalRegStamp;
      if (elapsed <= 0) {
        this.thermalRegStamp = nowS;
        return;
      }
      if (elapsed > D.MAX_REASONABLE_GAP_SEC) {
        this.thermalRegStamp = nowS;
        return;
      }

      this._thermalRegReconciling = true;
      try {
        let remaining = elapsed;
        let steps = 0;
        while (remaining > 0 && steps < D.REG_MAX_STEPS) {
          const slice = Math.min(D.REG_STEP_SEC, remaining);
          this.integrateThermalSlice(slice);
          remaining -= slice;
          steps++;
        }
        if (remaining > 0) this.integrateThermalSlice(remaining);
        this.reconcileThermalCascade(elapsed);
        this.thermalRegStamp = nowS;
      } finally {
        this._thermalRegReconciling = false;
      }
    }

    /**
     * One integration slice (game-seconds). Resolves the effective
     * ambient (cached), the setpoint, and the clo-widened band, then
     * branches on strategy: an ectotherm / dead / no-fuel body drifts;
     * an endotherm spends to hold the setpoint within the affordable
     * regimes.
     */
    protected integrateThermalSlice(sliceSec: number): void {
      const host = this.regHost;
      const D = THERMAL_DEFAULTS;
      const ambient = this.effectiveAmbientK;
      const setpoint = this.setpointK;
      const cloK = this.wornInsulationKelvin();
      // Insulation widens the comfort band downward (a parka shrinks the
      // cold-side gap).
      const lowBand = setpoint - D.BAND_HALF_WIDTH_K - cloK;
      const highBand = setpoint + D.BAND_HALF_WIDTH_K;

      const core = this.readCore();
      // "Does this body run living processes?" — `isLivingBody()`, which is
      // neither `!isDead()` (a shade is undead, and must not burn fuel to
      // stay warm) nor `isAlive()` (an unhydrated body carries the empty
      // default and has always regulated).
      const notLiving = !host.isLivingBody();
      const endotherm = this.strategy() === "endotherm" && !notLiving;

      if (!endotherm) {
        this.driftCore(core, ambient, sliceSec);
        return;
      }

      if (ambient >= lowBand && ambient <= highBand) {
        // Within band — pin at setpoint, zero cost.
        this.setCore(setpoint);
        this._shiverNoted = false;
        this._sweatNoted = false;
        return;
      }

      if (ambient < lowBand) {
        // Cold stress — spend satiation to hold the setpoint.
        const gap = lowBand - ambient;
        const spend = D.COLD_SPEND_PER_DEGREE * gap * (sliceSec / 60);
        if (this.reserveCurrent("satiation") >= spend && spend > 0) {
          host.adjustReserve("satiation", Quantity.of(-spend, "%"));
          this.setCore(setpoint);
          this.noteShiver();
        } else {
          this.driftCore(core, ambient, sliceSec); // out of fuel → cold
        }
        return;
      }

      // Heat stress — spend hydration to sweat, capped by wet-bulb.
      const wetBulb = this.wetBulbK(ambient, this.cachedHumidity);
      if (wetBulb > D.WET_BULB_CEILING_K) {
        this.driftCore(core, ambient, sliceSec); // sweat can't shed heat
        return;
      }
      const gap = ambient - highBand;
      const spend = D.HEAT_SPEND_PER_DEGREE * gap * (sliceSec / 60);
      if (this.reserveCurrent("hydration") >= spend && spend > 0) {
        host.adjustReserve("hydration", Quantity.of(-spend, "%"));
        this.setCore(setpoint);
        this.noteSweat();
      } else {
        this.driftCore(core, ambient, sliceSec); // out of water → hot
      }
    }

    /** Passive Newton's drift of the core toward the effective ambient. */
    protected driftCore(coreK: number, ambientK: number, sliceSec: number): void {
      const tau = this.bodyTau();
      const next =
        tau <= 0 ? ambientK : ambientK + (coreK - ambientK) * Math.exp(-sliceSec / tau);
      this.setCore(next);
    }

    // ---------- effective ambient (re-stamp-time resolver) ----------

    /**
     * Resolve the body's effective ambient — biome ambient + occupied
     * warming-slot `warmth` + the wind-chill (cold side) / heat-index
     * (hot side) transforms, read through the surrounding medium's
     * conductivity (immersion). `async` and run only at re-stamp events
     * (placement/move, ambient shift, don/doff); the per-slice reconcile
     * reads the cache `effectiveAmbientK` synchronously. (Worn `clo` is
     * applied as a band-widening in `integrateThermalSlice`, not here.)
     */
    protected async effectiveAmbient(): Promise<Quantity<"K">> {
      const host = this.regHost;
      // `getContainer()` already returns `(Stuff & Container) | null`, so
      // the resolved scope needs no narrowing cast.
      const scope = host.getContainer();
      let ambientK = this.setpointK;
      let humidity = 50;
      let windMs = 0;
      let mediumTag = "air";
      if (scope !== null) {
        try {
          ambientK = (await BiomeApi.resolveTemperatureFor(scope)).rawValue();
        } catch {
          /* keep default */
        }
        try {
          humidity = (await BiomeApi.resolveHumidityFor(scope)).rawValue();
        } catch {
          /* keep default */
        }
        try {
          windMs = (await BiomeApi.resolveWindFor(scope)).rawValue();
        } catch {
          /* keep default */
        }
        try {
          mediumTag = await BiomeApi.resolveAtmosphereFor(scope);
        } catch {
          /* keep default */
        }
      }
      this.cachedHumidity = humidity;

      // Occupied warming-slot warmth (a campfire log-seat). Read like
      // metabolism reads restQuality — `isSlottable` narrows in place.
      let warmth = 0;
      const self = this.regHost;
      if (MixinApi.isSlottable(self)) {
        const seat = self.getOccupiedHost();
        if (seat && MixinApi.isPostured(seat)) warmth = seat.getWarmth();
      }
      ambientK += warmth;

      // Cold-side wind chill (heat-loss-rate effect): pull effective
      // ambient down, amplified when immersed (water conducts far faster
      // than air). Hot side uses the heat index (humidity makes it feel
      // hotter).
      const D = THERMAL_DEFAULTS;
      const immersion =
        BiomeApi.conductivityOf(mediumTag).rawValue() /
        BiomeApi.conductivityOf("air").rawValue();
      if (ambientK < this.setpointK) {
        ambientK -= D.WIND_CHILL_PER_MS * windMs * Math.sqrt(immersion);
        // Immersion in a cold dense medium drives effective ambient toward
        // the medium temperature far faster — fold a fraction of the gap.
        if (immersion > 2) {
          ambientK -= (this.setpointK - ambientK) * 0.5;
        }
        // Wet body loses heat faster (weather Wave 2 — the wet-collapse
        // coupling). Independent of wind (evaporative + conductive), so a
        // soaked body chills faster even in still cold air: fold an extra
        // fraction of the core→ambient gap, scaled by the stored saturation.
        // Sync gauge read at re-stamp only. `1` = dry / no gauge (no-op).
        const wetAmp = this.wetHeatLossAmplifier();
        if (wetAmp > 0) {
          ambientK -= (this.setpointK - ambientK) * Math.min(0.9, wetAmp);
        }
      } else if (ambientK > this.setpointK && humidity > 50) {
        ambientK += (humidity - 50) * 0.05; // crude heat-index bump
      }

      return Quantity.of(Math.max(0, ambientK), "K");
    }

    /**
     * The wet heat-loss amplifier (weather Wave 2): `saturation *
     * thermal.wetHeatLossFactor`, or `0` when the body is dry / carries no
     * wetness gauge. Read synchronously off the stored gauge at re-stamp.
     */
    private wetHeatLossAmplifier(): number {
      const self = this.regHost as unknown as Stuff;
      if (!MixinApi.isWet(self)) return 0;
      const sat = self.getWetness();
      if (sat <= 0) return 0;
      const factor = readDial(AppSettingKeys.thermalWetHeatLossFactor, 1.5);
      return sat * factor;
    }

    /**
     * Re-stamp the regulation cache: freeze the driven core to now under
     * the OLD effective ambient, resolve the new effective ambient, and
     * re-anchor. Chains the passive `ThermalMixin.restamp` (the corpse-
     * drift substrate) first.
     */
    public async restamp(): Promise<void> {
      const sup = (Base.prototype as { restamp?: () => Promise<void> }).restamp;
      if (typeof sup === "function") await sup.call(this);
      // Freeze the regulated core to now under the current cache.
      this.reconcileThermalRegulation();
      const eff = await this.effectiveAmbient();
      // The host can be destructed *during* the awaits above — a guest is
      // reaped the instant it goes linkdead, which can race an in-flight
      // re-stamp. A destroyed Stuff is inert: every method (here
      // `effectiveAmbient`, and the mixin's own host accessors) returns
      // `undefined`. The re-stamp is moot for a gone object, so bail on
      // the first `undefined` rather than read `.rawValue()` off nothing.
      if (eff === undefined) return;
      this.effectiveAmbientK = eff.rawValue();
      const nowS = this.regNowSeconds();
      if (nowS !== null) this.thermalRegStamp = nowS;
    }

    // ---------- the cascade → conditions ----------

    /**
     * After the slices, spawn / clear the thermal conditions off the
     * driven core (hypothermia / torpor below `survivableMin`,
     * hyperthermia above `survivableMax`), accrue dwell, and fire the
     * death seam on lethal accrual. Mirrors metabolism's cascade.
     */
    protected reconcileThermalCascade(elapsedSec: number): void {
      const host = this.regHost;
      const D = THERMAL_DEFAULTS;
      const band = host.getVitalBand("coreTemperature");
      const core = this.readCore();
      const ecto = this.strategy() === "ectotherm";

      // Cold edge.
      if (core < band.survivableMin) {
        const coldPath = ecto
          ? TemplatePaths.thermalTorpor
          : TemplatePaths.thermalHypothermia;
        const rec = this.ensureAffliction(coldPath);
        rec.elapsed += elapsedSec;
        // Ectotherm cold → torpor (immobilize, NOT lethal); endotherm cold
        // → hypothermia (lethal dwell).
        if (!ecto && rec.elapsed >= D.THERMAL_LETHAL_SEC) {
          host.beginDying("hypothermia", THERMAL_DEFAULTS.DYING_WINDOW_SEC);
          return;
        }
      } else {
        this.clearAffliction(TemplatePaths.thermalHypothermia, core, band.survivableMin);
        this.clearAffliction(TemplatePaths.thermalTorpor, core, band.survivableMin);
      }

      // Hot edge (lethal for both strategies — the critical-thermal-max).
      if (core > band.survivableMax) {
        const rec = this.ensureAffliction(TemplatePaths.thermalHyperthermia);
        rec.elapsed += elapsedSec;
        if (rec.elapsed >= D.THERMAL_LETHAL_SEC) {
          host.beginDying("hyperthermia", THERMAL_DEFAULTS.DYING_WINDOW_SEC);
          return;
        }
      } else {
        this.clearAffliction(
          TemplatePaths.thermalHyperthermia,
          band.survivableMax,
          core,
        );
      }
    }

    protected ensureAffliction(path: string): AfflictionRecord {
      const host = this.regHost;
      const existing = this.findAffliction(path);
      if (existing) return existing;
      const rec: AfflictionRecord = {
        kind: "affliction",
        templatePath: path,
        stage: 0,
        elapsed: 0,
      };
      host.afflict(rec);
      return rec;
    }

    /** Clear `path` once `value` re-enters `threshold` by the hysteresis margin. */
    protected clearAffliction(path: string, value: number, threshold: number): void {
      const host = this.regHost;
      const existing = this.findAffliction(path);
      if (existing && value >= threshold + THERMAL_DEFAULTS.CONDITION_CLEAR_MARGIN_K) {
        host.relieve(existing);
      }
    }

    protected findAffliction(path: string): AfflictionRecord | null {
      const host = this.regHost;
      for (const c of host.getConditions()) {
        if (c.kind === "affliction" && c.templatePath === path) return c;
      }
      return null;
    }


    // ---------- helpers ----------

    protected readCore(): number {
      return this.innerVitalSign("coreTemperature").rawValue();
    }
    protected setCore(k: number): void {
      const host = this.regHost;
      host.setVitalSign("coreTemperature", Quantity.of(Math.max(0, k), "K"));
    }

    protected reserveCurrent(key: string): number {
      return this.regHost.reserves[key]?.currentValue ?? 0;
    }

    protected strategy(): "endotherm" | "ectotherm" {
      const host = this.regHost;
      return (
        host.getSpecies()?.getBodyPlan()?.getThermalStrategy() ?? "endotherm"
      );
    }

    /** Worn-slot `clo` sum, expressed as a Kelvin band-widening. */
    protected wornInsulationKelvin(): number {
      const self = this.regHost;
      if (!MixinApi.isSlotted(self)) return 0;
      let clo = 0;
      // `getAllOccupants()` yields `Stuff & Slottable`; `isWearable`
      // narrows each occupant in place, so `getClo()` is a typed call.
      for (const occupants of self.getAllOccupants().values()) {
        for (const occ of occupants) {
          if (MixinApi.isWearable(occ)) clo += occ.getClo().rawValue();
        }
      }
      return clo * THERMAL_DEFAULTS.CLO_TO_KELVIN;
    }

    /**
     * Passive-drift time constant (R·C) for the body — the rate the core
     * floats toward effective ambient when regulation is off. Reuses
     * `ThermalMixin.getTau` (the body's mass × material × medium/wall
     * resistance); a heavier body drifts slower.
     */
    protected bodyTau(): number {
      return this.regHost.getTau().rawValue();
    }

    /** Wet-bulb temperature (K) — the simplified Stull approximation. */
    protected wetBulbK(ambientK: number, humidityPct: number): number {
      const tC = ambientK - 273.15;
      const rh = Math.max(1, Math.min(100, humidityPct));
      const tw =
        tC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
        Math.atan(tC + rh) -
        Math.atan(rh - 1.676331) +
        0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
        4.686035;
      return tw + 273.15;
    }

    protected noteShiver(): void {
      if (this._shiverNoted) return;
      this._shiverNoted = true;
      this.emitCue("You're shivering.");
    }
    protected noteSweat(): void {
      if (this._sweatNoted) return;
      this._sweatNoted = true;
      this.emitCue("You're sweating.");
    }
    protected emitCue(text: string): void {
      const host = this.regHost;
      try {
        MessageApi.scene(host)
          .topic("world.sensation.interoception")
          .toSelf(Mml.compose`${text}`)
          .send();
      } catch {
        // A bare body (no Sensor / not interactive) has no cue surface —
        // the reconcile still drives the core; the cue is best-effort.
      }
    }

    protected regNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
