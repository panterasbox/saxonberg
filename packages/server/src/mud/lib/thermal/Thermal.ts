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
import type { Coolbox } from "./Coolbox";
import type { Atmospheric } from "../biome/Atmospheric";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { BiomeApi } from "../../api/biome";
import { WorldClockApi } from "../../api/worldclock";
import { TemplatePaths } from "../paths";
import { Decay } from "../Decay";
import {
  Piecewise,
  TrajectoryLog,
  type Breakpoint,
} from "../Trajectory";

// ⭐ The latent-heat accumulator for a freezing bulk pool, declared from the
// folder that owns the phase engine (the five-extender pattern — `ThermalDose`
// adds `dose`, `Freshness` adds `freshness`). A pool at/below its melting
// point banks the heat removed here and does not solidify until it equals
// `mass × latentHeatOfFusion` — the plateau the melt path already honours,
// now mirrored for the freeze.
declare module "../bulk/Bulkable" {
  interface BulkPayload {
    latentRemovedJ?: number;
  }
}

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
  /**
   * Cold-side fuel spend (satiation %-points per game-min per K of gap).
   *
   * ⚠⚠ **Retuned 2026-09-24 (envelope W1), from `0.05`, by measurement.**
   * The shipped value burned 21 %/h on a NAKED body at 294 K — the
   * shipped indoor decree, a comfortable room — and 47 %/h on a
   * *dressed* one at 8 °C. Every one of the cold bench's sixteen rows,
   * at every temperature and every insulation level, was **dead inside
   * twelve game hours**: a body in a wool coat in a 21 °C room starved
   * to death. Nobody saw it because every interior in the realm was
   * 21 °C by decree and nothing kept a cast member anywhere for long;
   * the envelope build removes the decree, so the dial had to be true
   * before rooms were allowed to get cold.
   *
   * Calibrated against {@link COLD_SPEND_MAX_BASAL_MULT}: the product
   * `cap / this` is the temperature gap shivering can actually cover,
   * and it is set so that gap is **20 K**. That is not arbitrary — a
   * naked body's comfort floor is 302 K, so 20 K of coverage puts its
   * drift target at 282 K ≈ the `survivableMin` of 301 K, which says:
   * *a naked human outdoors on an 8 °C night is exactly on the
   * hypothermia line*. Which is true.
   */
  COLD_SPEND_PER_DEGREE: 0.005,
  /**
   * ⭐⭐ **The ceiling on shivering, as a multiple of basal metabolism.**
   *
   * Shivering thermogenesis peaks at roughly five times resting
   * metabolic rate; a body cannot spend its way out of an arbitrarily
   * cold room, and the shipped model let it try — the cold branch was
   * linear in the gap and **uncapped**, so a cold enough room simply
   * drained the tank at whatever rate the arithmetic asked for and the
   * body starved to death in a snowdrift.
   *
   * ⚠ That is the wrong death. Cold kills by COOLING you, and
   * hypothermia is rescuable — somebody can carry you inside, and the
   * `warm` verb exists for exactly that. Starvation is not rescuable on
   * that timescale and reads as a bug. So past the gap this cap can
   * cover, the body stops trying to hold the setpoint and **drifts
   * toward the warmest temperature its shivering CAN defend**
   * (`ambient + coveredGap`) — see `integrateThermalSlice`.
   *
   * Named against metabolism's own basal drain rather than written as a
   * bare rate, so the two cannot drift apart: if resting metabolism is
   * ever retuned, the ceiling on shivering follows it.
   */
  COLD_SPEND_MAX_BASAL_MULT: 5,
  /** Hot-side water spend (hydration %-points per game-min per K of gap). */
  HEAT_SPEND_PER_DEGREE: 0.06,
  /**
   * ⭐⭐ **How fast a body can shed an internal heat load**, in watts.
   *
   * A working human dumps roughly this much through sweat and radiation
   * at a sustainable rate. It is what makes over-casting a **pace**
   * problem rather than a total one: a caster who spaces their frost
   * spells sheds between them and never warms; one who chains them
   * accumulates faster than 400 W can carry away, and the core climbs.
   *
   * ⚠ Zero past the wet-bulb ceiling, and zero with no hydration —
   * shedding is sweating, and sweating into saturated air does nothing.
   * That is the honest failure: you cannot cool yourself in a sauna.
   */
  HEAT_SHED_W: 400,
  /**
   * ⭐⭐ **Clothing slows shedding.** The body's own resistance to heat
   * loss — tissue plus the boundary layer of air on bare skin — in clo,
   * so that worn insulation scales the shed rate as
   * `HEAT_SHED_W · REF / (REF + clo)`: a business suit (1 clo) halves it,
   * arctic kit (3 clo) quarters it.
   *
   * Without this a caster in a parka shed heat exactly like a naked one,
   * which is backwards twice over — insulation impedes heat loss in
   * BOTH directions, and the parka that keeps you warm standing still is
   * precisely what cooks you when you work hard in it. One resistance in
   * series with another; the arithmetic is nothing more than that.
   *
   * ⚠ Steady-state LOSS only. The covering fold reads the same garment
   * `clo` but scores a thermal BLOW as a pulse (`1 − exp(−clo/ref)`, its
   * own `response.heat.referenceClo`) — one insulation number per
   * garment, two formulas each honest to its own physics.
   */
  SHED_BODY_CLO: 1.0,
  /**
   * ⭐⭐ **Where hyperthermia actually starts** — above the setpoint, not
   * at `survivableMax`.
   *
   * The row used to spawn at `survivableMax` (315 K, +5 K), and 315 K is
   * **heat STROKE**. Clinical hyperthermia is a core above ~38.3 °C, so
   * the shipped constant named the condition at the wrong temperature —
   * a player who knows physiology would have been surprised *wrongly*.
   *
   * ⭐ Keying it to the setpoint also separates two facts an author
   * should be able to write independently: "when does this species get
   * sick" and "when does it die". Keyed to `survivableMax`, tuning
   * survivability silently moved a different condition's onset.
   * The lethal dwell still reads `survivableMax`.
   */
  HYPERTHERMIA_ONSET_K: 2.5,
  /**
   * Each worn `clo` widens the comfort band downward by this many K.
   *
   * ⭐ **Retuned 2026-09-24 (envelope W1) from `2.5`, to the number the
   * unit is DEFINED by.** One clo is the insulation at which a seated
   * person is comfortable at 21 °C — that is what the unit means. A
   * naked body's comfort floor here is `SETPOINT_K − BAND_HALF_WIDTH_K`
   * = 302 K (29 °C, which is the real thermoneutral zone for an
   * unclothed human), so one clo must carry it from 302 K down to
   * 294 K: **8 K per clo, by definition rather than by taste.**
   *
   * At 2.5 a wool coat was worth 5 K against a 21 K gap and clothing
   * barely registered — the bench's first table showed a naked body and
   * a coated one dying within minutes of each other.
   */
  CLO_TO_KELVIN: 8,
  /** Wet-bulb temperature (K) above which sweat can't shed heat (~35 °C). */
  WET_BULB_CEILING_K: 308,
  /** Wind-chill: each m/s of wind cools effective ambient this many K. */
  WIND_CHILL_PER_MS: 0.6,
  /**
   * How much of the wind chill a fully close-woven, dry OUTER layer
   * removes (`0..1`). Not the whole of it: a coat is not a wall, and a
   * hard enough wind still finds you.
   */
  WINDPROOF_WEIGHT: 0.9,
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
  /**
   * ⭐ Heat capacity `C = m·c` (J/K) — how much energy this thing takes to
   * move one kelvin. The public read of the protected
   * `thermalCapacity()`, added so a caller that needs to know *"what will
   * removing Q joules do to this?"* can ask rather than guess.
   *
   * First consumer: the heat-pump cost model, which prices a cooling
   * working by the temperature LIFT it works across — and cannot know
   * the lift without knowing where the target ends up.
   */
  thermalCapacityJPerK(): number;
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
  /**
   * ⭐ **This body's temperature over `[fromS, toS]`, as a trajectory** —
   * reconstructed from the body's breakpoint ring (a {@link TemperatureTrajectory}
   * publisher). A gauge on this body (freshness, dose, contamination)
   * integrates over this instead of sampling the endpoint, so a body that
   * warmed and re-cooled during an unobserved gap is spoiled correctly.
   * Brings the body current first (records a breakpoint at `now`).
   */
  temperatureTrajectory(fromS: number, toS: number): Piecewise;
}

/**
 * ⭐ A thing whose temperature has a reconstructible past. Both a body
 * ({@link ThermalMixin}) and a scope's air (`AtmosphericMixin`) implement
 * it; a dependent gauge asks its publisher for the window and integrates.
 */
export interface TemperatureTrajectory {
  temperatureTrajectory(fromS: number, toS: number): Piecewise;
}

/**
 * ⭐ **What HOLDS this body** — one step, and only one.
 *
 * The body's enclosing placement host when it sits under a member that
 * encloses (a compartment with its own air), otherwise its container.
 * A body that is not `Containable` at all has no scope.
 *
 * ⚠⚠ **This is a different question from {@link airScopeOf}, and the
 * paragraph between them is the whole of the distinction:**
 *
 *  - *what holds you* — the immediate holder, used by
 *    {@link enclosingCoolbox}, because what you are IN outranks the room
 *    and an icebox two hops away is not holding you;
 *  - *what air reaches you* — the nearest scope outward that has any,
 *    used by both ambient paths, because a loaf in a bag is in the room's
 *    air and a bag has none.
 *
 * They were one function until the base-class narrowing build, when they
 * had to stop being: before it a bag WAS atmospheric (every `Vessel`
 * was), so one step always landed on something with air — it just had no
 * envelope, which is why a bagged loaf's ambient never moved. After it a
 * bag is honestly transparent, and the walk is what finds the air.
 */
function ambientScopeOf(host: Stuff): Stuff | null {
  if (!MixinApi.isContainable(host)) return null;
  return host.getEnclosingScope();
}

/**
 * ⚠⚠ Matches the `CONTAINMENT_DEPTH_CAP` the biome chain
 * (`BiomeLogic`), the address walk (`AddressLogic`) and the zone walk
 * (`ZoneLogic`) each declare privately at 32. Declared here for the same
 * reason they do: nothing is exported across those tiers, and a shared
 * constant would be an import that crosses one.
 */
const AIR_SCOPE_DEPTH_CAP = 32;

/**
 * ⭐⭐ **What AIR reaches this body** — the nearest enclosing scope
 * outward that has any.
 *
 * A perishable in a bag was frozen at whatever ambient it was stamped
 * with when it went in: a bag has no envelope, so the pull side returned
 * without updating and the push side asked the bag for a temperature it
 * could only answer from the raw biome. Carry a loaf from a cold street
 * into a warm bakery and it stayed street-cold indefinitely, and nothing
 * in the game said so.
 *
 * ⚠⚠ **One step outward would not have fixed it.** A worn bag's
 * container is the WEARER — a `Creature` is a `Container` — so
 * bag → carrier → room is two hops, and the carrier has no air either.
 * The case the repair exists for is a bag on somebody's back.
 *
 * So this walks, under the same depth cap and the same discipline the
 * biome chain already uses for every other atmospheric value: step
 * outward through `getEnclosingScope()` until something is
 * `Atmospheric`, or until there is nothing left to step to. It is not a
 * new mechanism; it is the chain's existing walk applied to the
 * envelope.
 *
 * Both ambient paths call it — the pull side
 * (`refreshAmbientFromEnvelope`) and the push side (`restamp`) — because
 * the day they disagree is the day a box keeps its cold in one path and
 * not the other.
 *
 * ⭐ A documented limit: **the holder read stays immediate**. A loaf in a
 * bag inside a shut icebox reads the ROOM, not the cold, because
 * {@link enclosingCoolbox} asks what holds you and a bag is what holds
 * it. Asserted in the tests so the limit is visible rather than hidden.
 */
function airScopeOf(host: Stuff): (Stuff & Atmospheric) | null {
  let cursor = ambientScopeOf(host);
  for (let depth = 0; cursor !== null && depth < AIR_SCOPE_DEPTH_CAP; depth++) {
    if (MixinApi.isAtmospheric(cursor)) return cursor;
    if (!MixinApi.isContainable(cursor)) return null;
    cursor = cursor.getEnclosingScope();
  }
  return null;
}

/**
 * ⭐ **A body relaxing toward a MOVING ambient** — the closed-form the
 * trajectory primitive needs where `Decay.toward` (constant target) no
 * longer suffices. Over one ambient stretch the ambient itself is a single
 * exponential `A(s) = A∞ + (A0 − A∞)e^{−s/τa}`, and the body's response to
 * it is the two-exponential solution of `dT/dt = (A(t) − T)/τb`:
 *
 *   T(t) = A∞ + (T0 − A∞)e^{−t/τb}
 *             + (A0 − A∞)·[τa/(τa − τb)]·(e^{−t/τa} − e^{−t/τb})
 *
 * Exact per stretch. Degenerate cases: a massless body (`τb ≤ 0`) lands on
 * the ambient's end value; a constant ambient (`τa ≤ 0`) is plain
 * `Decay.toward`; and the `τa ≈ τb` resonance takes the limit form
 * `(A0 − A∞)·(t/τb)·e^{−t/τb}`.
 */
function driftTowardMoving(
  t0: number,
  a0: number,
  aInf: number,
  tauA: number,
  tauB: number,
  dt: number,
): number {
  if (!(dt > 0)) return t0;
  if (!(tauB > 0)) {
    // Massless — lands on the ambient's own end value.
    return tauA > 0 ? Decay.toward(a0, aInf, dt, tauA) : aInf;
  }
  if (!(tauA > 0)) {
    // Constant ambient at aInf.
    return Decay.toward(t0, aInf, dt, tauB);
  }
  const eB = Math.exp(-dt / tauB);
  const settled = aInf + (t0 - aInf) * eB;
  if (Math.abs(tauA - tauB) < 1e-9) {
    // Resonance limit τa → τb.
    return settled + (a0 - aInf) * (dt / tauB) * eB;
  }
  const eA = Math.exp(-dt / tauA);
  return settled + (a0 - aInf) * (tauA / (tauA - tauB)) * (eA - eB);
}

/**
 * The shut `Coolbox` holding this body, or null.
 *
 * ⚠⚠ Called from `effectiveR`, which runs on every reconcile of every
 * Thermal body in the game, so it must fail fast: the `isCoolbox` test
 * on the scope is the first real work, and for a body standing in a
 * room it is one mixin lookup that answers no.
 */
function enclosingCoolbox(host: Stuff): (Stuff & Coolbox & Thermal) | null {
  const scope = ambientScopeOf(host);
  if (scope === null) return null;
  if (!MixinApi.isCoolbox(scope)) return null;
  return scope.isHoldingCold() ? scope : null;
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
      // ⭐ **Authorable since the placement build (D24), and the drive is
      // what asked for it.** A SPACE could always author its own
      // temperature (`Atmospheric._temperature` — the 279 K cold store);
      // a BODY could not, so a row that ships a block of ice minted one
      // at room temperature, which is not ice. It read as warm, it
      // satisfied no cold-storage check, and it began melting the
      // instant it existed. Every other route to a cold body is a
      // history the world has to play out (a freeze, a quench), and an
      // authored object has no history.
      //
      // ⚠ Authored, not overriding: this seeds the body's temperature
      // and the reconcile takes it from there — an authored 268 K block
      // in a 293 K room warms exactly as it should. Content that wants
      // a thing to STAY at a temperature authors the space, not this.
      stampedTemperatureK: {
        persistent: true,
        runtimeState: true,
        authorable: true,
      },
      thermalClockStamp: { persistent: true, runtimeState: true },
      lastAmbientK: { persistent: true, runtimeState: true },
      barrier: { persistent: true, authorable: true },
      // ⭐ The body's own temperature breakpoint ring — a bounded history
      // so a gauge reading at its own stamp can reconstruct the body's
      // curve across an unobserved gap. Runtime state like the scalar
      // thermal fields: a reboot loses the history (the plan's F2), which
      // is acceptable — the next read re-seeds a flat segment.
      thermalLog: { persistent: true, runtimeState: true },
    };

    public stampedTemperatureK: number = THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K;
    public thermalClockStamp = 0;
    public lastAmbientK: number = THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K;
    public barrier: string | null = null;
    /** The breakpoint ring backing {@link temperatureTrajectory}. */
    public thermalLog: Breakpoint[] = [];

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
    public thermalCapacityJPerK(): number {
      return this.thermalCapacity();
    }

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
     * Ungated: the callers are physics drivers (Burner, magic heat,
     * casting) — a trusted physical relationship.
     */
    @Final
    @Unshadowable
    public reconcilePhase(): void {
      reconcilePhaseImpl(this as unknown as Stuff);
    }

    /**
     * The maximum sustained temperature (K) reachable from where this
     * body stands — the hottest lit `Burner` in its scope (the
     * crafting emergent-reachability principle applied to heat: a
     * smith's control gate is "what's the hottest thing I can
     * reach?"). 0 when nothing hot is in reach. Ungated read.
     * (Homed HERE, not on a maker marker as first sketched: that was
     * augment-gated and players boiling a pot are not staff — but
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

    /**
     * Series heat-exchange resistance `R` (K/W).
     *
     * ⚠⚠ **This runs on every reconcile of every Thermal body in the
     * game** — it is the hottest read in the model. The Coolbox clause
     * below must short-circuit before any other work, and it does: one
     * `isCoolbox` test on the enclosing scope, which for almost
     * everything is a plain room.
     */
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
      return rMedium + rWall + this.lentInsulationR();
    }

    /**
     * ⭐ **Seam 2 — the box lends its walls to the thing making the
     * cold.** Extra R this body borrows from a shut `Coolbox` holding
     * it, when this body IS its coldest mass; 0 for everything else,
     * which is everything.
     *
     * Without it the ice would read its own temperature as its ambient
     * (seam 1 would hand it back to itself) and never melt — a box that
     * keeps its cold forever, which is the opposite of the object this
     * build is for. With it, the ice warms toward the ROOM, through the
     * walls, at `(T_room − 273) / (R_ice + insulationR)` — and the
     * `Meltable` plateau turns that leak into hours.
     */
    private lentInsulationR(): number {
      const self = this.thermalHost;
      const holder = enclosingCoolbox(self);
      if (holder === null) return 0;
      const coldest = holder.coldestMass() as unknown as Stuff | null;
      if (coldest === null || coldest.stuffId !== (self as Stuff).stuffId) {
        return 0;
      }
      return holder.getInsulationR();
    }

    // ---------- reconcile-on-read (lazy time drive) ----------

    /**
     * ⭐⭐ **A warming room reaches what is standing in it, with no
     * fan-out.**
     *
     * `lastAmbientK` is a cache, stamped at placement, movement and
     * ambient-shift events. A room whose own temperature drifts
     * continuously has no such event — it is simply different every
     * time you look — so a push model would need the room to restamp
     * everything it contains on a clock, for every room, forever.
     *
     * So this is the PULL side, which `weather.md` already recommends
     * (*"prefer the pull side, as wetness does"*): the moment anything
     * asks this object how warm it is, it asks its container. Three
     * lines, no scheduler, and a loaf in a warming kitchen follows the
     * kitchen without anybody telling it to.
     *
     * ⚠ Skipped when a furnace is holding this object — `heatSourceK`
     * wins, because being IN the fire is not being near it, and the
     * room's air has nothing to say about a workpiece in a forge.
     */
    protected refreshAmbientFromEnvelope(): void {
      const self = this.thermalHost;
      if (this.heatSourceK() !== null) return;
      // ⭐ A shut cold holder answers before the chain does, for the
      // same reason a lit furnace does: what holds you outranks the
      // room. Read in the same position on both the pull side and the
      // push side (`restamp`), because the day they disagree is the day
      // a box keeps its cold in one path and not the other.
      const holderCold = this.holderK();
      if (holderCold !== null) {
        this.lastAmbientK = holderCold;
        return;
      }
      const scope = airScopeOf(self);
      if (scope === null) return;
      const envelopeK = scope.envelopeTemperatureLast();
      if (envelopeK !== null) this.lastAmbientK = envelopeK;
    }

    /** The ring wrapper over this body's own breakpoint history. */
    private thermalRing(): TrajectoryLog {
      return new TrajectoryLog(this.thermalLog);
    }

    /**
     * ⭐ **The ambient this body drifts toward, as a trajectory over the
     * gap** — not a single sample. A lit furnace or a shut cold holder is
     * a constant stretch (what holds you outranks the room, as the scalar
     * path always said); otherwise the enclosing `Atmospheric` scope's
     * own published trajectory, so a fridge that warmed during a power cut
     * hands the body the warm-up curve, not just its endpoint.
     */
    private ambientTrajectory(fromS: number, toS: number): Piecewise {
      const self = this.thermalHost;
      const flat = (v: number): Piecewise =>
        new Piecewise([{ fromS, toS, startValue: v, target: v, tau: 0 }]);
      const heat = this.heatSourceK();
      if (heat !== null) return flat(heat);
      const holderCold = this.holderK();
      if (holderCold !== null) return flat(holderCold);
      const scope = airScopeOf(self);
      // ⚠ Only an APPLYING envelope publishes a trajectory the pull side
      // reads — the same split the scalar `refreshAmbientFromEnvelope`
      // kept. A scope with an authored `_temperature` (or no envelope at
      // all) is resolved by the PUSH side (`restamp` → the full biome
      // chain into `lastAmbientK`); pulling its authored temperature here
      // would double-own it and, for a pan pinned hot in a warm room,
      // cool it back down. Fall back to the cached ambient the push side
      // maintains.
      if (scope === null || !scope.envelopeApplies()) {
        return flat(this.lastAmbientK);
      }
      return scope.temperatureTrajectory(fromS, toS);
    }

    public temperatureTrajectory(fromS: number, toS: number): Piecewise {
      if (!this._thermalReconciling) this.reconcileThermal();
      return this.thermalRing().window(fromS, toS, this.stampedTemperatureK);
    }

    public reconcileThermal(): void {
      if (this._thermalReconciling) return;
      const D = THERMAL_DEFAULTS;

      const nowS = this.thermalNowSeconds();
      if (nowS === null) return; // no world clock — idle

      // First touch: seed the stamp AND a flat breakpoint so a fresh
      // object doesn't integrate a giant gap from epoch, and a gauge that
      // reads immediately gets a constant at the current temperature.
      if (this.thermalClockStamp === 0) {
        this.thermalClockStamp = nowS;
        this.thermalRing().record(
          nowS,
          this.stampedTemperatureK,
          this.stampedTemperatureK,
          0,
        );
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
      // ⭐ Far-past absence guard, **narrowed to a living/regulated body**
      // (plan F5). A logout is a body's gap to drop — it never "cooled"
      // while away. Dead matter has no such excuse: a corpse, a loaf, a
      // blood bag integrates its absence, which is exactly what makes a
      // fridge losing power for a week spoil its contents. The old guard
      // fired for every Thermal thing and silently under-aged matter.
      if (
        MixinApi.isThermalRegulation(self) &&
        elapsed > D.MAX_REASONABLE_GAP_SEC
      ) {
        this.thermalClockStamp = nowS;
        return;
      }

      this._thermalReconciling = true;
      try {
        const tau = this.getTau().rawValue();
        const ambientPw = this.ambientTrajectory(this.thermalClockStamp, nowS);
        const ring = this.thermalRing();
        let T = this.stampedTemperatureK;
        // Integrate the body toward a MOVING ambient, stretch by stretch —
        // each is a single ambient decay, so the two-exponential closed
        // form is exact per stretch. Record a body breakpoint at each
        // stretch start so a gauge can reconstruct the body's own curve.
        for (const st of ambientPw.stretches) {
          const dur = st.toS - st.fromS;
          if (!(dur > 0)) continue;
          const aEnd =
            st.tau > 0
              ? Decay.toward(st.startValue, st.target, dur, st.tau)
              : st.target;
          ring.record(st.fromS, T, aEnd, tau);
          T = driftTowardMoving(T, st.startValue, st.target, st.tau, tau, dur);
        }
        this.stampedTemperatureK = T;
        this.lastAmbientK = ambientPw.at(nowS);
        // The forward segment: from now, drift toward the current ambient.
        ring.record(nowS, T, this.lastAmbientK, tau);
        this.thermalClockStamp = nowS;
      } finally {
        this._thermalReconciling = false;
      }

      // ⭐⭐ **A solid melts because it is WARM, not because something
      // is heating it.** (Placement build, D22.)
      //
      // ⚠⚠ Until this line, `reconcilePhase()` had exactly three
      // callers in the whole tree: a lit `Burner`'s heat pass, two
      // spell endpoints, and tests. So nothing in the world melted
      // unless a fire or a wizard was pointed at it — a block of ice
      // left on a warm floor sat at its melting point forever, with
      // the latent accumulator never touched. The phase engine was
      // complete and had no ambient driver.
      //
      // The drift above is what makes a body warm, so the phase check
      // belongs immediately after it, on the same lazy read. It is
      // narrowed to `Meltable` hosts: the `Bulkable` freeze/boil rung
      // has its own callers (a `CraftVessel` drives it from its own
      // reconcile) and widening it here would double-run them.
      //
      // Outside the `try`, so the plateau's own `setContentsTemperature`
      // is not swallowed by the reentry guard.
      if (MixinApi.isMeltable(self)) this.reconcilePhase();
    }

    /**
     * The held temperature (K) of a lit, fuelled `Burner` that is
     * heating this body — the furnace **holding** it (a loaf in an
     * oven) or the furnace it **rests on** (a pot on a campfire) — or
     * `null` when nothing does. Read only by {@link restamp}: the
     * furnace supplies the ambient, and the body's own `tau = R*C`
     * supplies the warm-up. The firebox is hot instantly; what climbs
     * is what is in it.
     */
    private heatSourceK(): number | null {
      const self = this.thermalHost;
      // A lit, fuelled furnace the body is IN or ON — `isBurner` narrows
      // the one cast to the container type, and everything after reads
      // through the narrowing.
      const litBurnerK = (candidate: Stuff | null): number | null => {
        if (candidate === null || !MixinApi.isBurner(candidate)) return null;
        if (!candidate.isLit() || candidate.fuelRemaining() <= 0) return null;
        return candidate.getHeldTemperatureK();
      };
      const inside = litBurnerK(self.getContainer() as unknown as Stuff | null);
      if (inside !== null) return inside;
      return litBurnerK(
        (self.getPlacement()?.host ?? null) as unknown as Stuff | null,
      );
    }

    /**
     * ⭐ **Seam 1 — the cold twin of {@link heatSourceK}.** The interior
     * temperature (K) of a shut `Coolbox` holding this body, or `null`.
     *
     * `heatSourceK` is hot-only by construction — it asks for a lit
     * `Burner` — and the rule underneath it is not about heat at all:
     * *what HOLDS this body outranks the biome chain.* A shut icebox
     * holds its contents exactly as an oven does, and the chain cannot
     * answer for it, because a `Coolbox` is not `Atmospheric` (and must
     * not be: a cold box does not cool the kitchen).
     *
     * ⚠ The coldest mass is excluded. It is the thing MAKING the
     * interior cold, so handing it its own temperature as ambient would
     * be a body in equilibrium with itself: no drift, no melt, no
     * clock. It reads the room instead, through the walls
     * ({@link lentInsulationR}).
     */
    private holderK(): number | null {
      const self = this.thermalHost;
      const holder = enclosingCoolbox(self);
      if (holder === null) return null;
      const coldest = holder.coldestMass() as unknown as Stuff | null;
      if (coldest !== null && coldest.stuffId === (self as Stuff).stuffId) {
        return null;
      }
      return holder.getContentsTemperature().rawValue();
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

      // ⭐ A heat source that HOLDS this body outranks the biome chain:
      // the inside of a lit oven is not the room. `BiomeLogic` walks
      // `Atmospheric` ancestors and a `Burner` is not `Atmospheric`
      // (deliberately — a lit forge must not warm the room it stands
      // in), so the couple is read here, on the body being heated.
      let ambientK = this.lastAmbientK;
      const sourceK = this.heatSourceK();
      const holderCold = sourceK === null ? this.holderK() : null;
      if (sourceK !== null) {
        ambientK = sourceK;
      } else if (holderCold !== null) {
        // ⭐ Seam 1, the push side — same position as `heatSourceK`.
        ambientK = holderCold;
      } else {
        // Resolve the new scope's ambient. ⭐ The scope is the nearest
        // thing outward with air in it — an enclosing placement host
        // that has its own, else the first container up the chain that
        // is `Atmospheric`. A bag, a crate and a carrier are stepped
        // through, because none of them is weather.
        const scope = airScopeOf(this.thermalHost);
        const container =
          scope !== null && MixinApi.isContainer(scope) ? scope : null;
        if (container !== null) {
          try {
            ambientK = (
              await BiomeApi.resolveTemperatureFor(container)
            ).rawValue();
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
 * lit `Burner` in its scope (the crafting emergent-reachability principle
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
    if (s.isDestroyed() || !MixinApi.isBurner(s)) continue;
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
    // ⭐⭐ **Freezing honours its latent heat, the mirror of melting.** A
    // pool below its melting point does not solidify on the instant: it
    // PLATEAUS at `mp` while the undershoot `(mp − T)·C` is banked into the
    // latent accumulator, and only when the bank reaches `mass ×
    // latentHeatOfFusion` does the pool actually solidify. (Boil above was
    // left a flip — no boiling feature rides this build; the asymmetry is
    // noted in thermal.md.)
    const massKg = (amount / 1000) * mat.getDensity().rawValue();
    const specificHeat = mat.getSpecificHeat().rawValue();
    const capacityJ = massKg * specificHeat;
    const undershootJ = (mp - temp) * capacityJ;
    const payload = v.getBulkPayload(aff);
    let removed = payload?.latentRemovedJ ?? 0;
    if (undershootJ > 0) {
      removed += undershootJ;
      v.setBulkPayload(aff, { ...(payload ?? {}), latentRemovedJ: removed });
      v.setContentsTemperature(mp); // clamp — the plateau
    }
    const need = massKg * mat.getLatentHeatOfFusion().rawValue();
    if (!(need > 0) || removed < need) return; // still on the plateau

    // ⭐ The ruin edge: a material freezing ruins (blood hemolyses) mints no
    // cast. The pool stays liquid at `mp`, its freshness load is stamped
    // ruined (reads *rotten*; `transfuse` refuses *spoiled*), and the
    // accumulator clears so a thaw does not re-trigger the ruin.
    if (mat.isRuinedByFreezing()) {
      const cleared = v.getBulkPayload(aff);
      v.setBulkPayload(aff, {
        ...(cleared ?? {}),
        latentRemovedJ: 0,
        freshness: { load: 1, stamp: freezeNowSeconds() },
      });
      return;
    }

    // Solidify — the liquid becomes a cast solid of the same material, a
    // clone of the material's `castTemplate` (water → ice-block; a metal →
    // the generic `/stuff/thing/Casting`), mass derived back from the pool.
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    v.setBulkPayload(aff, null);
    const scope = (v as unknown as { getContainer(): Stuff | null })
      .getContainer();
    void StuffApi.clone(mat.getCastTemplate()).then((cast) => {
      const c = cast as unknown as Stuff & {
        setShortDescription(s: string): void;
        setKeywords(k: string[]): void;
        setMaterial(m: Material): void;
        setMass(q: Quantity<'kg'>): void;
        getMaterial?(): Material | null;
      };
      // Stamp mass always; stamp material/prose/keywords only when the clone
      // authored no material of its own (the generic cast) — ice-block rows
      // ship their own material + prose.
      const authored = typeof c.getMaterial === 'function' ? c.getMaterial() : null;
      if (!authored) {
        c.setShortDescription(`cast lump of ${mat.getName()}`);
        c.setKeywords(['lump', 'cast', ...mat.getName().split(/\s+/)]);
        c.setMaterial(mat);
      }
      c.setMass(Quantity.of(massKg, 'kg'));
      if (scope && MixinApi.isContainer(scope)) {
        void ContainmentApi.move(
          cast as unknown as Stuff & Containable,
          scope as Stuff & Container,
        );
      }
    }).catch(() => {
      // A missing/!resolvable cast template must not crash the reconcile —
      // the pool has already emptied; the cast simply does not appear. In a
      // booted world the template is present (water → ice-block).
    });
  }
}

/** Game-seconds for a freeze-ruin freshness stamp, or 0 before boot. */
function freezeNowSeconds(): number {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
  return WorldClockApi.getNow().rawValue();
}

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
