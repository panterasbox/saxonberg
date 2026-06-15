/**
 * ThermalMixin — the generic heat-exchange capability: a lazy
 * Newton's-cooling-on-read drift toward a cached ambient. The
 * substrate that finally makes object temperature real — algor mortis
 * on a corpse, a thermos that holds coffee hot, a campfire that cools
 * to embers — and the passive term the Phase-2 body regulation layer
 * drifts to when regulation fails.
 *
 * **Mirrors `MetabolicMixin`.** Same lazy reconcile-on-read shape: a
 * stamped value + a game-time stamp, a `WorldClockApi.getNow()`
 * now-source that returns `null` (idle) when no clock is bootstrapped,
 * a first-touch seed, a linkdead freeze, a far-past absence guard, and
 * a `_thermalReconciling` reentry guard. The one genuine divergence is
 * the **cached ambient**: metabolism is purely lazy and subscribes to
 * nothing, whereas thermal caches the resolved ambient (`lastAmbientK`)
 * so the read stays SYNC, refreshing it only at the discrete re-stamp
 * events (Step 1.6). That keeps `getTemperature()` — and, on the body,
 * the whole `getVitalSign` read surface it backs — synchronous.
 *
 * **τ = R·C.** `C = mass × specificHeat` (the host's `Tangible` mass ×
 * its `Material` specific heat); `R` is the series heat-exchange
 * resistance set by the surrounding medium's conductivity (dominant)
 * plus the wall material's (minute). A sealed vessel switches its
 * barrier medium to `vacuum` (τ in hours); opening collapses R to the
 * air term (τ in minutes). A massless / heat-capacity-less host reads
 * ambient immediately (τ → 0); a host with no resolvable ambient reads
 * its stamped value unchanged. No throws on the read path.
 *
 * **NOT an Api.** Thermal is mixin-shaped per the surface-architecture
 * conventions; the read surface (`getTemperature` /
 * `getSurfaceTemperature` / `getContentsTemperature`) lives here on the
 * host. Operational reference (graduated at sweep):
 * `docs/subsystems/thermal.md`.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Tangible } from "../material/Tangible";
import type { Containable } from "../spatial/Containable";
import type { Container } from "../spatial/Container";
import type { Bulkable } from "../bulk/Bulkable";
import { Quantity } from "../quantity";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { BiomeApi } from "../../api/biome";
import { MaterialApi } from "../../api/material";
import { WorldClockApi } from "../../api/worldclock";
import { TemplatePaths } from "../paths";

/**
 * Every thermal dial as a module const-object (the `METABOLIC_DEFAULTS`
 * / `LOAD_BEARING_DEFAULTS` precedent). Magnitudes are defensible
 * defaults tuned for the demo cases (a sealed thermos holds coffee hot
 * for hours, an open mug cools in minutes); **rates are playtest-tuned,
 * not plan decisions.** Times are GAME-seconds.
 */
export const THERMAL_DEFAULTS = {
  /** Far-past absence guard (game-seconds) — reuse metabolism's. */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,

  /** Stamped temperature a fresh host starts at (room, ~22 °C). */
  DEFAULT_TEMPERATURE_K: 295,

  /**
   * Specific-heat fallback (`J/(kg·K)`) when a host's `Material`
   * authors none — water-dominant, since the v1 cases (coffee, water,
   * body) are mostly water.
   */
  DEFAULT_SPECIFIC_HEAT: 4186,

  /** Wall-conductivity fallback (`W/(m·K)`) when a Material authors none. */
  DEFAULT_WALL_CONDUCTIVITY: 1.0,

  /**
   * Lumped geometry factors (the `L/A` characteristic length÷area of
   * the series resistance, m⁻¹-ish). `R = R_GEOMETRY / k`; the medium
   * term dominates (its `k` is smallest), the wall term is minute (a
   * metal wall's `k` is huge). Tuned so an open vessel's τ lands in
   * minutes and the ~260× air/vacuum conductivity ratio pushes a
   * sealed one into hours.
   */
  R_GEOMETRY_MEDIUM: 0.0075,
  R_GEOMETRY_WALL: 0.0075,

  /**
   * Surface-exposure half-constant (`W/(m·K)`). `getSurfaceTemperature`
   * blends core↔ambient by `exposure = k_medium / (k_medium + this)`:
   * an air-exposed bare object reads its own heat; a sealed (vacuum-
   * barrier) vessel's exterior reads ~ambient (the insulation hides the
   * scalding contents — the Step 1.9 sensory gate).
   */
  SURFACE_EXPOSURE_K: 0.01,

  /**
   * Lumped effective resistivities by vessel type — the **documented
   * fallback** when an object authors a vessel-type tag rather than a
   * computable medium/wall conductivity. v1 computes from conductivities
   * (the honest model) and never consults this; it is kept as the dial
   * the geometry-free path would read. (Decision in the plan: compute
   * when present, fall back to the table.)
   */
  R_BY_VESSEL_TYPE: { thermos: 8.0, mug: 0.3, open: 0.1 } as Record<
    string,
    number
  >,
} as const;

/** Atmosphere medium tags a `barrier` override may carry. */
const KNOWN_MEDIA = new Set(["air", "water", "vacuum"]);

/**
 * The inner-host surface a Thermal object composes over — mass (the
 * `C` term) + containment (resolving the surrounding scope's ambient).
 * The `MetabolicHost` intersection-cast idiom: proxy dispatch routes
 * each call to the right inner implementation at runtime.
 */
type ThermalHost = Stuff & Tangible & Containable;

export interface Thermal {
  /** Stamped temperature T0 (raw K) — the decomposed scalar. */
  stampedTemperatureK: number;
  /** Game-time (seconds) of the last reconcile / re-stamp; 0 = unseeded. */
  thermalClockStamp: number;
  /** Cached resolved ambient (raw K) the object is drifting toward. */
  lastAmbientK: number;
  /** Medium-tag override (`'air'`/`'water'`/`'vacuum'`); null = default. */
  barrier: string | null;

  setStampedTemperatureK(value: number): void;
  setThermalClockStamp(value: number): void;
  setLastAmbientK(value: number): void;
  setBarrier(value: string | null): void;
  getBarrier(): string | null;

  /** The lazy temperature read (SYNC) — reconcile-on-read against game-time. */
  getTemperature(): Quantity<"K">;
  /** Exterior temperature — ≈ ambient for an insulated object, ≈ core for a bare one. */
  getSurfaceTemperature(): Quantity<"K">;
  /** Held-fluid temperature (vessels) — the object's own temperature in v1. */
  getContentsTemperature(): Quantity<"K">;
  /** Set the fluid temperature directly + re-anchor (bulk coupling). */
  setContentsTemperature(k: number): void;
  /** Time constant τ = R·C. */
  getTau(): Quantity<"s">;
  /** Lazy reconcile — drift the stamped temperature over elapsed game-time. */
  reconcileThermal(): void;
  /** Resolve fresh ambient, freeze current T under the old ambient, re-stamp. */
  restamp(): Promise<void>;
}

function assertFiniteNonNeg(value: number, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${what}: expected a finite number >= 0, got ${String(value)}`,
    );
  }
}

export function ThermalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ThermalMixin extends Base implements Thermal {
    static _mixinName = "ThermalMixin";

    static persistentFields = [
      "stampedTemperatureK",
      "thermalClockStamp",
      "lastAmbientK",
      "barrier",
    ];

    public stampedTemperatureK: number = THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K;
    public thermalClockStamp = 0;
    public lastAmbientK: number = THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K;
    public barrier: string | null = null;

    /**
     * Reentry guard for the reconcile. Case-1 per the CLAUDE.md hard
     * constraint: a TypeScript `private` flag (the call-security proxy
     * makes `#` unreachable from proxy-dispatched methods). Transient.
     */
    private _thermalReconciling = false;

    // ---------- setters (invariants on the setter) ----------

    public setStampedTemperatureK(value: number): void {
      assertFiniteNonNeg(value, "ThermalMixin.setStampedTemperatureK");
      this.stampedTemperatureK = value;
    }
    public setThermalClockStamp(value: number): void {
      assertFiniteNonNeg(value, "ThermalMixin.setThermalClockStamp");
      this.thermalClockStamp = value;
    }
    public setLastAmbientK(value: number): void {
      assertFiniteNonNeg(value, "ThermalMixin.setLastAmbientK");
      this.lastAmbientK = value;
    }
    public setBarrier(value: string | null): void {
      if (value !== null && !KNOWN_MEDIA.has(value)) {
        throw new RangeError(
          `ThermalMixin.setBarrier: unknown medium '${value}' ` +
            `(known: air, water, vacuum, or null)`,
        );
      }
      this.barrier = value;
    }
    public getBarrier(): string | null {
      return this.barrier;
    }

    // ---------- the lazy reads (SYNC) ----------

    public getTemperature(): Quantity<"K"> {
      if (!this._thermalReconciling) this.reconcileThermal();
      return Quantity.of(this.stampedTemperatureK, "K");
    }

    public getSurfaceTemperature(): Quantity<"K"> {
      const core = this.getTemperature().rawValue();
      const ambient = this.lastAmbientK;
      const k = this.mediumConductivity();
      // Exposure → 1 for a bare air-exposed object, → 0 for a sealed
      // (vacuum-barrier) vessel whose exterior reads ~ambient.
      const exposure = k / (k + THERMAL_DEFAULTS.SURFACE_EXPOSURE_K);
      return Quantity.of(ambient + (core - ambient) * exposure, "K");
    }

    public getContentsTemperature(): Quantity<"K"> {
      // A vessel whose Thermal IS its contents — the held-fluid
      // temperature is the object's own temperature in v1.
      return this.getTemperature();
    }

    // ---------- τ = R·C ----------

    public getTau(): Quantity<"s"> {
      return Quantity.of(this.effectiveR() * this.thermalCapacity(), "s");
    }

    /**
     * Heat capacity `C = mass × specificHeat` (J/K). For a vessel whose
     * Thermal IS its contents (`Bulkable` interior with fluid), `C`
     * derives from the held fluid — more contents → larger `C` → slower
     * cooling, free (a full thermos holds heat longer than a near-empty
     * one). Falls back to the host's own mass × material when empty / not
     * a vessel.
     */
    protected thermalCapacity(): number {
      const self = this as unknown as ThermalHost;
      const stuff = self as unknown as Stuff;
      if (MixinApi.isBulkable(stuff) && stuff.hasInteriorBulk()) {
        const c = this.contentsCapacity(stuff as unknown as Bulkable);
        if (c > 0) return c;
        // empty vessel → fall through to the wall's own heat capacity
      }
      const massKg = self.getMass().rawValue();
      const mat = MaterialApi.materialOf(stuff);
      let c = mat ? mat.getSpecificHeat().rawValue() : 0;
      if (c <= 0) c = THERMAL_DEFAULTS.DEFAULT_SPECIFIC_HEAT;
      return massKg * c;
    }

    /** Heat capacity (J/K) of a vessel's interior fluid, or 0 if empty. */
    protected contentsCapacity(vessel: Bulkable): number {
      const litres = vessel.getBulkAmount("interior").rawValue();
      const mat = vessel.getBulkMaterial("interior");
      if (litres <= 0 || mat === null) return 0;
      const massKg = (litres / 1000) * mat.getDensity().rawValue();
      let c = mat.getSpecificHeat().rawValue();
      if (c <= 0) c = THERMAL_DEFAULTS.DEFAULT_SPECIFIC_HEAT;
      return massKg * c;
    }

    /**
     * Set the fluid temperature directly and re-anchor the drift clock
     * — the bulk-coupling primitive (refill to incoming, calorimetric
     * mix blend, pour-preserve-at-reduced-C). Freezes the current
     * temperature to now under the existing ambient first, then adopts
     * the supplied value and restarts drift from it.
     */
    public setContentsTemperature(k: number): void {
      assertFiniteNonNeg(k, "ThermalMixin.setContentsTemperature");
      if (!this._thermalReconciling) this.reconcileThermal();
      this.stampedTemperatureK = k;
      const nowS = this.thermalNowSeconds();
      if (nowS !== null) this.thermalClockStamp = nowS;
    }

    /**
     * The dominant series conductivity (`W/(m·K)`): the barrier medium
     * when sealed (a `Sealable` host that is closed → `vacuum`), else
     * the `barrier` override, else `air` (the default surrounding
     * medium for a bare Phase-1 object; the body lifts this to its
     * resolved immersion medium in Phase 2).
     */
    protected mediumConductivity(): number {
      const self = this as unknown as Stuff;
      let tag: string;
      if (MixinApi.isSealable(self) && !self.isOpen()) {
        tag = "vacuum";
      } else if (this.barrier !== null) {
        tag = this.barrier;
      } else {
        tag = "air";
      }
      try {
        return BiomeApi.conductivityOf(tag).rawValue();
      } catch {
        return BiomeApi.conductivityOf("air").rawValue();
      }
    }

    /** Series heat-exchange resistance `R` (K/W). */
    protected effectiveR(): number {
      const D = THERMAL_DEFAULTS;
      const self = this as unknown as Stuff;
      const kMedium = this.mediumConductivity();
      const mat = MaterialApi.materialOf(self);
      const kWall =
        (mat && mat.getThermalConductivity().rawValue()) ||
        D.DEFAULT_WALL_CONDUCTIVITY;
      const rMedium = D.R_GEOMETRY_MEDIUM / Math.max(kMedium, 1e-12);
      const rWall = D.R_GEOMETRY_WALL / Math.max(kWall, 1e-12);
      return rMedium + rWall;
    }

    // ---------- reconcile-on-read (lazy time drive) ----------

    public reconcileThermal(): void {
      if (this._thermalReconciling) return;
      const D = THERMAL_DEFAULTS;

      const nowS = this.thermalNowSeconds();
      if (nowS === null) return; // no world clock — idle

      // First touch: seed the stamp so a fresh object doesn't integrate
      // a giant gap from epoch.
      if (this.thermalClockStamp === 0) {
        this.thermalClockStamp = nowS;
        return;
      }

      // Linkdead freeze (only meaningful for an interactive body, but
      // cheap and uniform): re-stamp, integrate nothing.
      const self = this as unknown as Stuff;
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.thermalClockStamp = nowS;
        return;
      }

      const elapsed = nowS - this.thermalClockStamp;
      if (elapsed <= 0) {
        this.thermalClockStamp = nowS;
        return;
      }
      // Far-past absence guard — a gap this long is logout/relog or a
      // paused server; drop it (the body never "cooled" while away).
      if (elapsed > D.MAX_REASONABLE_GAP_SEC) {
        this.thermalClockStamp = nowS;
        return;
      }

      this._thermalReconciling = true;
      try {
        const tau = this.getTau().rawValue();
        const ambient = this.lastAmbientK;
        if (tau <= 0) {
          // Massless / heat-capacity-less marker — instantly ambient.
          this.stampedTemperatureK = ambient;
        } else {
          // Closed-form Newton's cooling — exact for a constant ambient,
          // so no sub-stepping is needed for passive drift.
          const t0 = this.stampedTemperatureK;
          this.stampedTemperatureK =
            ambient + (t0 - ambient) * Math.exp(-elapsed / tau);
        }
        this.thermalClockStamp = nowS;
      } finally {
        this._thermalReconciling = false;
      }
    }

    /**
     * Resolve the current scope's ambient, freeze the current
     * temperature under the *old* cached ambient, then adopt the new
     * ambient and re-stamp. The single async mutation every re-stamp
     * trigger (placement/move, ambient shift, seal toggle, bulk
     * transfer) calls — the one `await` in the model, kept off the read
     * path. Seeds `lastAmbientK` at first placement.
     */
    public async restamp(): Promise<void> {
      const self = this as unknown as Stuff;
      // Freeze current T under the OLD ambient first (drift up to now).
      this.reconcileThermal();

      // Resolve the new scope's ambient.
      let ambientK = this.lastAmbientK;
      if (MixinApi.isContainable(self)) {
        const container = (self as unknown as Containable).getContainer();
        if (container && MixinApi.isContainer(container)) {
          try {
            const t = await BiomeApi.resolveTemperatureFor(
              container as Stuff & Container,
            );
            ambientK = t.rawValue();
          } catch {
            // keep the cached ambient on any resolution failure
          }
        }
      }
      this.lastAmbientK = ambientK;

      // Re-anchor the clock so drift toward the new ambient starts now.
      const nowS = this.thermalNowSeconds();
      if (nowS !== null) this.thermalClockStamp = nowS;
    }

    // ---------- re-stamp triggers ----------

    /**
     * Containment-move witness — the `onMoved` hook `ContainmentApi.move`
     * fires on every mover (carried items, dropped corpses, vessels,
     * bodies). Re-stamps so the object freezes its current temperature
     * under the old scope's ambient and starts drifting toward the new
     * scope's. **Load-bearing under the cached-ambient model** (Step 1.6
     * trigger 1): with a sync read there is no lazy re-resolve, so a
     * move that didn't re-stamp would drift toward a stale ambient
     * forever. This is the one event thermal listens to (the genuine
     * divergence from metabolism's pure-lazy model). Chains any inner
     * `onMoved` witness first.
     */
    public onMoved(
      from: (Stuff & Container) | null,
      to: (Stuff & Container) | null,
    ): void {
      const sup = (Base.prototype as {
        onMoved?: (
          f: (Stuff & Container) | null,
          t: (Stuff & Container) | null,
        ) => void;
      }).onMoved;
      if (typeof sup === "function") sup.call(this, from, to);
      void this.restamp();
    }

    // ---------- internal reads ----------

    /**
     * In-session game-time (seconds), or `null` when no world clock is
     * bootstrapped — thermal stays idle (the metabolism now-source guard
     * verbatim). Production always has a clock; a unit test that hasn't
     * set one up reads `null` and never drifts.
     */
    protected thermalNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }
  };
}
