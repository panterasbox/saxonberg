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

import { Final, Unshadowable } from '../security/decorators';
import type Material from '../material/Material';
import type { BulkAffordance } from '../bulk/Bulkable';
import type { Meltable } from './Meltable';
import { ContainmentApi } from '../../api/containment';
import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import type { Tangible } from "../material/Tangible";
import type { Containable } from "../spatial/Containable";
import type { Container } from "../spatial/Container";
import type { Bulkable } from "../bulk/Bulkable";
import { Quantity } from "../quantity";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { BiomeApi } from "../../api/biome";
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

  // ── Phase-2 thermoregulation (the living body) ──
  /** Integration slice (game-seconds) for the regulation reconcile. */
  REG_STEP_SEC: 60,
  /** Max fixed slices before collapsing the remainder. */
  REG_MAX_STEPS: 720,
  /** Default setpoint (K) the body defends (the movable fever seam). */
  SETPOINT_K: 310,
  /**
   * Thermoneutral dead-band half-width (K) around the setpoint. Effective
   * ambient inside `[setpoint ± this]` costs nothing (Option C).
   */
  BAND_HALF_WIDTH_K: 8,
  /** Cold-side fuel spend (satiation %-points per game-min per K of gap). */
  COLD_SPEND_PER_DEGREE: 0.05,
  /** Hot-side water spend (hydration %-points per game-min per K of gap). */
  HEAT_SPEND_PER_DEGREE: 0.06,
  /** Each worn `clo` warms effective ambient this many K toward setpoint. */
  CLO_TO_KELVIN: 2.5,
  /** Wet-bulb temperature (K) above which sweat can't shed heat (~35 °C). */
  WET_BULB_CEILING_K: 308,
  /** Wind-chill: each m/s of wind cools effective ambient this many K. */
  WIND_CHILL_PER_MS: 0.6,
  /** Lethal dwell (game-seconds) before hypo/hyperthermia kills. */
  THERMAL_LETHAL_SEC: 3 * 3600,
  /** Hysteresis: clear a thermal condition once core re-enters this margin (K). */
  CONDITION_CLEAR_MARGIN_K: 2,

  /**
   * Dying window (game-seconds) for hypo/hyperthermia. The longest of the
   * driver windows on purpose: a body lost to cold is the classic case
   * where someone can still reach you.
   */
  DYING_WINDOW_SEC: 300,
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
  reconcilePhase(): void;
  reachableHeatK(): number;
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
  /** Deposit `joules` of heat, raising temperature by ΔT = Q / C + re-anchor. */
  depositHeat(joules: number): void;
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
  // Declared-then-returned (the Meltable shape) so method decorators are
  // legal — a class EXPRESSION cannot carry them.
  class ThermalMixin extends Base implements Thermal {
    static _mixinName = "ThermalMixin";

    static fieldMeta: FieldMeta = {
      stampedTemperatureK: { persistent: true, runtimeState: true },
      thermalClockStamp: { persistent: true, runtimeState: true },
      lastAmbientK: { persistent: true, runtimeState: true },
      barrier: { persistent: true, authorable: true },
    };

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

    /**
     * This host, typed for the sibling-mixin members the call-security
     * proxy resolves at runtime. The cast is **load-bearing, not
     * cosmetic**: siblings like `Containable` are composed *outer* of
     * this mixin on some stacks (the `Creature` body wraps `Container`/
     * `Containable` around `Thermal`), so they are not in the static
     * `Base` type — only the runtime proxy unifies them. Centralised here
     * so the assertion lives in exactly one place instead of per method.
     */
    private get thermalHost(): ThermalHost {
      return this as unknown as ThermalHost;
    }

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
      // `isBulkable` narrows the host in place for the contents path.
      const self = this.thermalHost;
      if (MixinApi.isBulkable(self) && self.hasInteriorBulk()) {
        const c = this.contentsCapacity(self);
        if (c > 0) return c;
        // empty vessel → fall through to the wall's own heat capacity
      }
      const massKg = self.getMass().rawValue();
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
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
     * Deposit `joules` of heat into the object, raising its temperature by
     * `ΔT = Q / C` (C = heat capacity, `mass × specificHeat`) and re-anchoring
     * the drift clock — the single heat-DELIVERY primitive the sync model
     * lacked (the shipped reconcile only cools *toward* ambient; nothing
     * *added* heat). **Thermal inertia gates it**: the same joules barely move
     * a heavy, high-`C` log but shove a match's flame temperature up sharply,
     * so ignition ("did the delivered heat cross autoignition?") becomes a
     * real, derivable energy balance. Reconciles the pending drift first, then
     * bumps the stamped temperature — the read stays SYNC. A negative `joules`
     * removes heat (a douse); the temperature floors at absolute zero. A host
     * with no heat capacity (massless / material-less) re-equilibrates to
     * ambient instantly, so a deposit is a no-op there.
     */
    @Final
    @Unshadowable
    public depositHeat(joules: number): void {
      if (typeof joules !== "number" || !Number.isFinite(joules)) {
        throw new RangeError(
          `ThermalMixin.depositHeat: expected a finite number, got ${String(joules)}`,
        );
      }
      if (!this._thermalReconciling) this.reconcileThermal();
      const capacity = this.thermalCapacity(); // J/K
      if (capacity > 0) {
        const deltaT = joules / capacity;
        this.stampedTemperatureK = Math.max(0, this.stampedTemperatureK + deltaT);
      }
      const nowS = this.thermalNowSeconds();
      if (nowS !== null) this.thermalClockStamp = nowS;
    }

    /**
     * Reconcile this object's phase (was the host's `reconcilePhase` —
     * the OO sweep): the solid→liquid latent-heat plateau and the
     * vessel freeze/boil transitions, keyed on real Material
     * properties. Sealed — owns the phase/temperature invariants.
     * Ungated: the callers are physics drivers (Furnace, magic heat,
     * casting) — a trusted physical relationship.
     */
    @Final
    @Unshadowable
    public reconcilePhase(): void {
      reconcilePhaseImpl(this as unknown as Stuff);
    }

    /**
     * The maximum sustained temperature (K) reachable from where this
     * body stands — the hottest lit `Furnace` in its scope (the
     * crafting emergent-reachability principle applied to heat: a
     * smith's control gate is "what's the hottest thing I can
     * reach?"). 0 when nothing hot is in reach. Ungated read.
     * (Homed HERE, not on MakerMixin as first sketched: MakerMixin is
     * augment-gated and players boiling a pot are not Makers — but
     * every embodied creature is Thermal.)
     */
    public reachableHeatK(): number {
      return reachableHeatForImpl(this as unknown as Stuff);
    }

    /**
     * The dominant series conductivity (`W/(m·K)`): the barrier medium
     * when sealed (a `Sealable` host that is closed → `vacuum`), else
     * the `barrier` override, else `air` (the default surrounding
     * medium for a bare Phase-1 object; the body lifts this to its
     * resolved immersion medium in Phase 2).
     */
    protected mediumConductivity(): number {
      const self = this.thermalHost;
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
      const self = this.thermalHost;
      const kMedium = this.mediumConductivity();
      const mat = MixinApi.isTangible(self) ? self.getMaterial() : null;
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
      const self = this.thermalHost;
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
      // Freeze current T under the OLD ambient first (drift up to now).
      this.reconcileThermal();

      // Resolve the new scope's ambient. The host is `Containable`, and
      // `getContainer()` already returns `(Stuff & Container) | null`.
      let ambientK = this.lastAmbientK;
      const container = this.thermalHost.getContainer();
      if (container !== null) {
        try {
          ambientK = (
            await BiomeApi.resolveTemperatureFor(container)
          ).rawValue();
        } catch {
          // keep the cached ambient on any resolution failure
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
  }
  return ThermalMixin;
}


/* ────────────── the phase-change engine (module-private) ──────────────
 * Moved in whole from the retired ThermalLogic (the Api OO sweep): heat
 * drives phase change; the SHAPE (the latent-heat plateau, the
 * mass↔volume flow) is code; the magnitudes are all real `Material`
 * properties. Reached only through the mixin's `reconcilePhase()` /
 * `reachableHeatK()` methods below — nothing else may call in.
 */

/**
 * The maximum sustained temperature (K) reachable from `position` — the hottest
 * lit `Furnace` in its scope (the crafting emergent-reachability principle
 * applied to heat: a smith's control gate is "what's the hottest thing I can
 * reach?"). Returns 0 when nothing hot is in reach. Consumed by
 * `CraftingLogic`'s heat gate (`recipe.requiresHeatK`) — the smithing/cooking
 * temperature-control read.
 */
function reachableHeatForImpl(position: Stuff): number {
  const scope = (position as unknown as { getContainer(): Stuff | null })
    .getContainer();
  if (scope === null || !MixinApi.isContainer(scope)) return 0;
  let hottest = 0;
  for (const occ of (scope as Stuff & Container).getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed() || !MixinApi.isFurnace(s)) continue;
    if (!s.isLit() || s.fuelRemaining() <= 0) continue;
    const t = s.getHeldTemperatureK();
    if (t > hottest) hottest = t;
  }
  return hottest;
}

// ---------- phase-change internals (module-private free functions) ----------
//
// Heat drives phase change; this is the bidirectional transition engine. The
// SHAPE (the latent-heat plateau, the mass↔volume flow) is code; the
// magnitudes are all real `Material` properties (meltingPoint / boilingPoint /
// latentHeatOfFusion). Off-class so there are no intra-singleton self-calls.

/** Heat capacity `C = mass × specificHeat` (J/K) — mirrors the mixin's own read. */
function thermalCapacityOf(stuff: Stuff, mat: Material | null): number {
  const massKg = (stuff as unknown as { getMass(): Quantity<'kg'> })
    .getMass()
    .rawValue();
  let c = mat ? mat.getSpecificHeat().rawValue() : 0;
  if (c <= 0) c = THERMAL_DEFAULTS.DEFAULT_SPECIFIC_HEAT;
  return massKg * c;
}

/** Litres of liquid `massKg` of `mat` becomes (`volume = mass / density`). */
function massToLitres(massKg: number, mat: Material): number {
  const density = mat.getDensity().rawValue();
  if (density <= 0) return 0;
  return (massKg / density) * 1000; // m³ → L
}

function reconcilePhaseImpl(stuff: Stuff): void {
  // A solid object melting: the latent-heat plateau, then the flow to bulk.
  if (MixinApi.isMeltable(stuff) && MixinApi.isThermal(stuff)) {
    reconcileMelt(stuff as Stuff & Meltable & Thermal);
    return;
  }
  // A liquid-holding vessel: freeze below its material's melting point (a
  // casting) or boil above its boiling point (steam).
  if (MixinApi.isBulkable(stuff) && MixinApi.isThermal(stuff)) {
    reconcileBulkPhase(stuff as Stuff & Bulkable & Thermal);
  }
}

/**
 * The solid → liquid transition with a latent-heat plateau. While the object
 * sits at/above its melting point, the overshoot heat is absorbed into the
 * latent accumulator and the temperature is clamped back to the melting point
 * (the plateau); once `mass × latentHeatOfFusion` has been absorbed the solid
 * melts — it destructs and its mass flows to a `Bulkable` liquid pool in the
 * scope's `Floor`.
 */
function reconcileMelt(m: Stuff & Meltable & Thermal): void {
  const mp = m.getMeltingPointK();
  if (mp <= 0) return; // does not melt in the modelled range
  const temp = m.getTemperature().rawValue();
  if (temp < mp) return; // below the melting point — no transition yet

  const mat = MixinApi.isTangible(m) ? m.getMaterial() : null;
  const overshootJ = (temp - mp) * thermalCapacityOf(m as unknown as Stuff, mat);
  if (overshootJ > 0) {
    m._absorbLatent(overshootJ);
    m.setContentsTemperature(mp); // clamp — the plateau
  }
  const need = m.getLatentHeatToMeltJ();
  if (need > 0 && m.getLatentAbsorbedJ() >= need) {
    doMelt(m, mat);
  }
}

/** The melt completion: destruct the solid and flow its mass into the scope's
 * Floor as a molten liquid pool. */
function doMelt(m: Stuff & Meltable, mat: Material | null): void {
  if (!mat) return;
  const massKg = (m as unknown as { getMass(): Quantity<'kg'> })
    .getMass()
    .rawValue();
  const litres = massToLitres(massKg, mat);
  const scope = (m as unknown as { getContainer(): Stuff | null }).getContainer();
  StuffApi.destruct(m as unknown as Stuff);
  if (scope === null || !MixinApi.isContainer(scope)) return;
  const floor = findScopeFloor(scope as Stuff & Container);
  if (floor === null || litres <= 0) return;
  // Merge into the pool (same material) or seed a fresh molten pool.
  const cur = floor.getBulkAmount('surface').rawValue();
  if (cur <= 0 || floor.getBulkMaterial('surface') === null) {
    floor.setBulkMaterial('surface', mat);
  }
  floor.setBulkAmount('surface', Quantity.of(cur + litres, 'L'));
}

/**
 * A liquid-holding vessel's onward transitions, keyed on its held bulk's
 * material + the vessel's own temperature: boil to gas above the boiling point
 * (steam — the bulk shrinks away), or solidify below the melting point (a cast
 * solid `Thing` drops into the vessel's scope). The reverse of the melt above,
 * driven by the same heat read — so ice → water → steam falls out for free.
 */
function reconcileBulkPhase(v: Stuff & Bulkable & Thermal): void {
  const aff: BulkAffordance = v.hasInteriorBulk() ? 'interior' : 'surface';
  const amount = v.getBulkAmount(aff).rawValue();
  if (amount <= 0) return;
  const mat = v.getBulkMaterial(aff);
  if (!mat) return;
  const temp = v.getTemperature().rawValue();

  const bp = mat.getBoilingPoint().rawValue();
  if (bp > 0 && temp >= bp) {
    // Boil — the liquid flashes to gas (steam); the pool shrinks away.
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    return;
  }

  const mp = mat.getMeltingPoint().rawValue();
  if (mp > 0 && temp <= mp) {
    // Freeze — the liquid solidifies into a cast solid of the same material,
    // mass derived back from the pooled volume. The casting is a **clone of the
    // `/stuff/thing/Casting` template** (a re-meltable content object), not a raw
    // construction — its material / mass / prose are stamped per freeze.
    const massKg = (amount / 1000) * mat.getDensity().rawValue();
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    const scope = (v as unknown as { getContainer(): Stuff | null })
      .getContainer();
    void StuffApi.clone(CASTING_TEMPLATE_PATH).then((cast) => {
      const c = cast as unknown as Stuff & {
        setShortDescription(s: string): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
      };
      c.setShortDescription(`a cast lump of ${mat.getName()}`);
      c.setMaterial(mat);
      c.setMass(Quantity.of(massKg, 'kg'));
      if (scope && MixinApi.isContainer(scope)) {
        void ContainmentApi.move(
          cast as unknown as Stuff & Containable,
          scope as Stuff & Container,
        );
      }
    });
  }
}

/** The template a frozen molten pool clones into (a re-meltable cast lump). */
const CASTING_TEMPLATE_PATH = '/stuff/thing/Casting';

/** The scope's puddle-bearing `Floor` — a surface-bulk fixture / content (the
 * WeatherLogic.findRoomFloor precedent). */
function findScopeFloor(scope: Stuff & Container): (Stuff & Bulkable) | null {
  const s = scope as unknown as Stuff;
  if (MixinApi.isAdornable(s)) {
    for (const fx of s.getFixtures()) {
      const f = fx as unknown as Stuff;
      if (MixinApi.isBulkable(f) && f.hasSurfaceBulk()) {
        return f as Stuff & Bulkable;
      }
    }
  }
  for (const c of scope.getContents()) {
    const co = c as unknown as Stuff;
    if (MixinApi.isBulkable(co) && co.hasSurfaceBulk()) {
      return co as Stuff & Bulkable;
    }
  }
  return null;
}
