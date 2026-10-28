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
import type { Burner } from '../fire/Burner';
import type Material from '../material/Material';
import type { BulkAffordance, BulkPayload } from '../bulk/Bulkable';
import type { ConcentrationArrow } from '../material/Material';
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
import { BulkableApi } from '../../api/bulk';
import { BiomeApi } from "../../api/biome";
import { WorldClockApi } from "../../api/worldclock";
import { TemplatePaths } from "../paths";
import { Decay } from "../Decay";
import { AppApi } from "../../api/app";
import { AppSettingKeys } from "../config/AppSettings";
import type {
  HeatTransition,
  HeatWorkConversion,
  HeatWorkRecord,
} from "../material/HeatTransition";
import type { Atmospheric as AtmosphericScope } from "../biome/Atmospheric";
import type { Mould } from "../mould/Mould";
import type { Composition } from "../material/Composition";
import { Grade } from "../craft/Grade";
import { Evaporation } from "../material/Evaporation";
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
    /**
     * ⭐ Seconds these contents have spent AT the boil (the purification
     * clock — `Material.purifiedByBoiling` swaps once it reaches
     * `PURIFY_HOLD_S`), and the game-second it was last integrated to.
     * Cleared with the payload when the slot empties, and on the swap.
     */
    boilHeldS?: number;
    boilCheckedS?: number;
    /**
     * ⭐ Dissolved solids, kg per litre of these contents (sugar D1) —
     * what boiling concentrates. Absent: the material's own
     * `solidsKgPerL` (a fresh fill). The plateau rewrites it each time it
     * boils water off; a pour folds it by volume.
     */
    dissolvedSolidsKgPerL?: number;
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

  /**
   * ⭐ How long contents must be HELD at their boiling point before a
   * material's `purifiedByBoiling` arrow fires (game-seconds) — "a
   * rolling boil for a minute", the standing public-health instruction.
   * Boiling is a temperature, not a verb: anything that holds the pot at
   * the boil (a fire, a stove, a spell) purifies it.
   */
  PURIFY_HOLD_S: 60,

  /**
   * How far back the purification clock looks on its FIRST read of a
   * boiling pot (game-seconds) — the trajectory already knows how long it
   * has been at the boil, so a pot nobody read while it boiled is still
   * credited for it.
   */
  PURIFY_LOOKBACK_S: 600,

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
  /** The hottest lit burner in reach, or `null` — the fire, not its heat. */
  reachableHeatSource(): (Stuff & Burner) | null;
  /** The lit furnace this body is in or on, or `null` (sugar D2). */
  heatSource(): (Stuff & Burner) | null;
  /**
   * ⭐ This body's heat history (ceramics M1), or `null` when it has none —
   * a body whose material declares no `heatTransitions` never keeps one.
   */
  getHeatWork(): Readonly<HeatWorkRecord> | null;
  /** `fire` stamps who held the firing — an unwatched rung credits them. */
  stampFiredBy(identity: string): void;
  /** The Disciplines this body's rungs have earned, handed over once. */
  drainHeatWorkCredits(): string[];
  /**
   * ⭐ How far evaporation pulls this body below its air, K (ceramics M8):
   * `wetness × (T_air − T_wetbulb) × thermal.evaporation.efficiency`. Air
   * only — `0` immersed, in a fire, in a cold box, or dry.
   */
  evaporativeDepressionK(airK: number): number;
  /** A cast continues the heat history of the piece it was poured from. */
  adoptHeatWork(record: Readonly<HeatWorkRecord>): void;
  /**
   * Resolves when every cast a rung handed a mould has been minted — so a
   * firing's end can say what came out of it.
   */
  settleTransitions(): Promise<void>;
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

/**
 * ⭐ **The bath holding this body**, or null — the second holder rung
 * (silk W4): a solid IMMERSED in a vessel's bulk is at the bulk's
 * temperature, not the room's air. A bolt of raw silk in a copper of
 * simmering water is at the water's temperature; so is a wheel in brine
 * and a fish in a keepnet. Before this rung every one of them read the
 * room, which made boiling anything in a liquid unrepresentable.
 *
 * ⚠ Immediate holder only (the {@link enclosingCoolbox} discipline), and
 * any interior bulk counts: a body buried in a sack of grain is at the
 * grain's temperature too. Fails fast for a body in a room — one
 * `isBulkable` lookup that answers no.
 */
function enclosingBath(host: Stuff): (Stuff & Thermal) | null {
  const scope = ambientScopeOf(host);
  if (scope === null) return null;
  if (!MixinApi.isBulkable(scope) || !MixinApi.isThermal(scope)) return null;
  if (!MixinApi.isContainer(scope)) return null;
  if (!scope.hasInteriorBulk()) return null;
  if (!(scope.getBulkAmount("interior").rawValue() > 0)) return null;
  return scope;
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
      // ⭐ The heat history (ceramics M1): what this body has been through
      // in the fire, banked as heat-work. `null` until its material
      // declares a transition — a plate on a shelf never keeps one.
      heatWork: { persistent: true, runtimeState: true },
      coatsCheckedS: { persistent: true, runtimeState: true },
      shockCheckedS: { persistent: true, runtimeState: true },
    };

    /** See {@link Thermal.getHeatWork}. */
    public heatWork: HeatWorkRecord | null = null;

    /** Game-second the coats were last looked at for a fuse (runtime). */
    public coatsCheckedS = 0;

    /** Game-second the heating was last judged for a shock (runtime). */
    public shockCheckedS = 0;

    /**
     * Reentry guard for the heat-work pass (the phase pass's precedent):
     * applying a rung reads the body, which reconciles it. TypeScript
     * `private` for the proxy reason above. Transient.
     */
    private _heatWorkReconciling = false;

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
    /** The drift the last reconcile integrated, until a phase pass consumes it (transient). */
    private _lastDrift: { seconds: number; tauS: number } | null = null;

    /**
     * Reentry guard for the PHASE pass that ends a reconcile. ⚠ The phase
     * pass reads the temperature (`getTemperature` → `reconcileThermal`)
     * after `_thermalReconciling` has been released, and on a scaled
     * real-time clock a few game-milliseconds pass between the outer read
     * and the inner one — so without this every nested read integrated
     * again and called the phase pass again, recursing until the stack
     * blew (the climate drive, under load, on a blood unit in a cold
     * camp). Same constraint as above: TypeScript `private`. Transient.
     */
    private _phaseReconciling = false;
    /**
     * When the phase pass last looked (game seconds) — where a pot that is
     * found boiling starts its boil clock (sugar D2). Transient: after a
     * restart it is seeded from the persisted thermal stamp on the first
     * reconcile, which is the last moment anything knew the body's state.
     */
    private _phaseCheckedS: number | null = null;

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
      // ⭐ A step is a shock (ceramics D9): boiling water poured into a
      // cold glazed mug. The plateau's own clamps are a few kelvin.
      const step = Math.abs(k - this.stampedTemperatureK);
      if (step > 5) this.shockBody(step, 0);
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
      // ⚠ Reentry-guarded HERE, for every caller: the boil arm reads the
      // body's trajectory (the purification clock), which reconciles the
      // body, which would otherwise run the phase pass again inside this
      // one against stale amounts.
      if (this._phaseReconciling) return;
      this._phaseReconciling = true;
      try {
        // The drift is CONSUMED by the phase pass that reads it — whichever
        // path that pass came by — so it is never banked twice.
        const drift = this._lastDrift;
        this._lastDrift = null;
        const nowS = this.thermalNowSeconds();
        reconcilePhaseImpl(this as unknown as Stuff, {
          nowS,
          horizonS: this.thermalRing().horizonS(),
          drift,
          lastS: this._phaseCheckedS,
        });
        if (nowS !== null) this._phaseCheckedS = nowS;
      } finally {
        this._phaseReconciling = false;
      }
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
     * ⭐ **The fire itself, not just its temperature.** The hottest lit
     * burner in reach, or `null`.
     *
     * `reachableHeatK` answers a number, which was all a recipe needed
     * while a fire was a number. A fire knows what it is BURNING now, so
     * the thing worked over it can be peated by the peat — and the fuel
     * stops being anonymous the moment anything wants to ask.
     */
    public reachableHeatSource(): (Stuff & Burner) | null {
      return reachableHeatSourceImpl(this as unknown as Stuff);
    }

    /**
     * The dominant series conductivity (`W/(m·K)`): the barrier medium
     * when sealed (a `Sealable` host that is closed → `vacuum`), else
     * the `barrier` override, else `air` (the default surrounding
     * medium for a bare Phase-1 object; the body lifts this to its
     * resolved immersion medium in Phase 2).
     */
    /** What this body was immersed in at the last restamp, or null (air). */
    private immersedTag: string | null = null;

    protected mediumConductivity(): number {
      const self = this.thermalHost;
      let tag: string;
      if (MixinApi.isSealable(self) && !self.isOpen()) {
        tag = "vacuum";
      } else if (this.barrier !== null) {
        tag = this.barrier;
      } else if (this.immersedTag !== null) {
        // In the water: the water's conductivity, cached at the restamp.
        tag = this.immersedTag;
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
      const r = rMedium + rWall + this.lentInsulationR();
      // ⭐⭐ **A fire has power, not just a temperature** (sugar D2).
      const fireR = this.fireCouplingR();
      if (fireR <= 0) return r;
      // A pot SET ON a fire is in the flame: the flame, not still air, is
      // the medium, so the heat crosses the wall at the fire's delivered
      // watts. A 30 L copper on a hearth warms at the hearth's power.
      const placedOn = this.thermalHost.getPlacement()?.host as unknown as Stuff | undefined;
      if (placedOn !== undefined && placedOn === this.heatSource()) {
        return rWall + this.lentInsulationR() + fireR;
      }
      // A loaf IN an oven sits in the oven's hot air: the slower of the
      // two couplings limits — its own surface, or what the fire delivers.
      return Math.max(r, fireR);
    }

    /**
     * The resistance (K/W) a lit fire's power sets on whatever it heats:
     * `(T_fire − T_room) / P_delivered`, so a cold body takes the fire's
     * delivered watts and no more. `0` with no fire. A constant of the
     * fire, never of the body's own temperature — so the curve is one
     * exponential, and a watched pot heats exactly as an unwatched one.
     */
    private fireCouplingR(): number {
      const source = this.heatSource();
      if (source === null) return 0;
      const powerW = source.deliveredPowerW();
      const spanK =
        source.getHeldTemperatureK() - THERMAL_DEFAULTS.DEFAULT_TEMPERATURE_K;
      if (!(powerW > 0) || !(spanK > 0)) return 0;
      return spanK / powerW;
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
      // ⭐ A wet body in AIR sits below the air by what evaporation carries
      // off (ceramics M8) — the weeping jar, cooler than its room.
      const pw = scope.temperatureTrajectory(fromS, toS);
      const d = this.evaporativeDepressionK(pw.at(toS));
      if (!(d > 0)) return pw;
      return new Piecewise(
        pw.stretches.map((st) => ({ ...st, startValue: st.startValue - d, target: st.target - d })),
      );
    }


    public evaporativeDepressionK(airK: number): number {
      const self = this.thermalHost;
      if (!MixinApi.isWet(self as unknown as Stuff)) return 0;
      // Air only: what holds you outranks the room, and water evaporates
      // nothing off a thing that is in it.
      if (this.heatSource() !== null || this.holderK() !== null) return 0;
      const scope = airScopeOf(self);
      if (scope === null) return 0;
      let wetness = (self as unknown as { getWetness(): number }).getWetness();
      // ⭐ A vessel WEEPING through its body keeps its outside wet for as
      // long as it weeps — the surface is the film, whatever the body's
      // average saturation (the weeping jar).
      const body = self as unknown as Stuff;
      if (wetness < 1 && MixinApi.isFaced(body) && body.weeps()) wetness = 1;
      if (!(wetness > 0.01)) return 0;
      const air = scope.getAir();
      const wb = new Evaporation(air.humidityPct, air.windMs, airK).wetBulbK();
      const gap = airK - wb;
      if (!(gap > 0)) return 0;
      return gap * wetness * heatWorkDial(AppSettingKeys.thermalEvaporationEfficiency, 0.8);
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

      if (this._phaseCheckedS === null) this._phaseCheckedS = this.thermalClockStamp;
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
        this._lastDrift = { seconds: nowS - this.thermalClockStamp, tauS: tau };
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
      // belongs immediately after it, on the same lazy read.
      //
      // ⭐⭐ **And a pool freezes because it is COLD** (the climate build,
      // D7). The `Bulkable` freeze rung had no ambient driver either —
      // only a cooler's contents pass and two spells — so a jug of water
      // left in a winter street never froze. It is the melt's exact
      // mirror: a plateau at the melting point while the latent heat is
      // banked, then the material's cast. Widening is safe twice over: a
      // second pass at `T == mp` banks nothing (the undershoot is zero),
      // and the slot is emptied before the cast mints, so it cannot mint
      // twice. (`CraftVessel` never called `reconcilePhase` — it drives
      // `absorbIntoIce` — so there is nothing here to double-run.)
      //
      // Outside the `try`, so the plateau's own `setContentsTemperature`
      // is not swallowed by the reentry guard.
      if (
        MixinApi.isMeltable(self) ||
        (MixinApi.isBulkable(self) && MixinApi.isThermal(self))
      ) {
        this.reconcilePhase();
      }

      // ⭐⭐ **And a body that has been hot carries what the heat did to
      // it** (ceramics M1). After the phase pass, on the same lazy read,
      // outside the reentry guard — so a brick in a clamp, a pot in a house
      // fire and a crucible in a furnace are ONE rule. One lookup that
      // answers no for every material that declares nothing.
      this.reconcileHeatWork();
      // ⭐ …and a wet coat on it fuses when the body reaches its heat
      // (ceramics M6) — a glaze laid on bisque, glost-fired.
      this.reconcileCoats();
      // ⭐ …and a brittle body heated or cooled too fast cracks (M5).
      this.reconcileShock();
    }

    /**
     * ⭐ The temperature step a brittle body stands, K (ceramics D9):
     * `impact.shockStrain ÷ α`, raised by porosity and grog (the cooking
     * pot), lowered by a glaze. `Infinity` for anything not brittle or with
     * no authored expansion.
     */
    private shockToleranceK(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return Number.POSITIVE_INFINITY;
      const mat = self.getMaterial();
      if (mat === null || !mat.hasTag("brittle")) return Number.POSITIVE_INFINITY;
      const alpha = mat.getThermalExpansion();
      if (!(alpha > 0)) return Number.POSITIVE_INFINITY;
      const porosity = MixinApi.isFaced(self) ? self.porosity() : 0;
      // ⭐ A REFRACTORY body is grog-opened by definition — that is what
      // makes it a crucible or a firebrick rather than a pot (the ceramics
      // drive: a refractory crucible cracked under its first bronze melt
      // because the row records no composition to credit).
      let grog = mat.hasTag("refractory") ? 0.4 : 0;
      if (MixinApi.isComposition(self)) {
        for (const e of self.getMakeup()) {
          const m = StuffApi.findByTemplatePath<Material>(e.materialPath);
          if (m?.hasTag("grog")) grog += e.fraction;
        }
      }
      const glazed =
        MixinApi.isFaced(self) &&
        [...self.getCoats("outside"), ...self.getCoats("inside")].some((c) => c.state === "set");
      const strain = heatWorkDial(AppSettingKeys.impactShockStrain, 0.0003);
      return (
        (strain / alpha) *
        (1 + 10 * porosity) /
        Math.max(0.2, 1 - 2 * Math.min(0.4, grog)) *
        (glazed ? 0.7 : 1)
      );
    }

    /**
     * A step or a rate too fast for the body: a DUNT, hidden unless a glaze
     * shows its craze line; twice too fast, a CRACK anyone can see.
     */
    private shockBody(stepK: number, rateKPerS: number): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return;
      const tol = this.shockToleranceK();
      if (!Number.isFinite(tol)) return;
      const wallS = heatWorkDial(AppSettingKeys.impactShockWallS, 60);
      const severity = Math.max(stepK / tol, (rateKPerS * wallS) / tol);
      if (!(severity > 1)) return;
      if (severity > 2) {
        self.addFlaw("crack", true);
        return;
      }
      const glazedOutside =
        MixinApi.isFaced(self) && self.getCoats("outside").some((c) => c.state === "set");
      self.addFlaw("dunt", glazedOutside);
    }

    /** Judge the heating since the last look, off this body's own curve. */
    private reconcileShock(): void {
      const tol = this.shockToleranceK();
      if (!Number.isFinite(tol)) return;
      const nowS = this.thermalNowSeconds();
      if (nowS === null) return;
      const fromS = this.shockCheckedS > 0 ? this.shockCheckedS : nowS;
      this.shockCheckedS = nowS;
      if (!(nowS > fromS)) return;
      let rate = 0;
      for (const st of this.thermalRing().window(fromS, nowS, this.stampedTemperatureK).stretches) {
        if (st.tau > 0 && st.toS > st.fromS) {
          rate = Math.max(rate, Math.abs(st.target - st.startValue) / st.tau);
        }
      }
      this.shockBody(0, rate);
    }

    /**
     * Fuse the wet coats on a `Faced` body by the peak since the last look.
     * The window's peak, never the lifetime's: a bisque that was fired hot
     * once does not fuse the glaze laid on it afterwards without a firing.
     */
    private reconcileCoats(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isFaced(self) || !self.hasWetCoats()) return;
      const nowS = this.thermalNowSeconds();
      if (nowS === null) return;
      const fromS = this.coatsCheckedS > 0 ? this.coatsCheckedS : nowS;
      let peak = this.stampedTemperatureK;
      if (nowS > fromS) {
        for (const smp of this.thermalRing().window(fromS, nowS, this.stampedTemperatureK).samples(8)) {
          if (smp.value > peak) peak = smp.value;
        }
      }
      this.coatsCheckedS = nowS;
      self.fuseCoats(peak);
    }

    // ---------- the heat history (ceramics M1) ----------

    public getHeatWork(): Readonly<HeatWorkRecord> | null {
      return this.heatWork;
    }

    public stampFiredBy(identity: string): void {
      if (typeof identity !== "string" || identity === "") return;
      const rec = this.heatWork ?? freshHeatWork();
      rec.firedBy = identity;
      this.heatWork = rec;
    }

    public drainHeatWorkCredits(): string[] {
      const rec = this.heatWork;
      if (rec === null || rec.uncredited.length === 0) return [];
      const out = [...rec.uncredited];
      this.heatWork = { ...rec, uncredited: [] };
      return out;
    }

    public adoptHeatWork(record: Readonly<HeatWorkRecord>): void {
      this.heatWork = cloneHeatWork(record);
    }

    public async settleTransitions(): Promise<void> {
      while (PENDING_CASTS.size > 0) {
        await Promise.allSettled([...PENDING_CASTS]);
      }
    }

    /**
     * ⭐ Bank the heat-work since the last read and apply any rung reached.
     *
     * The dose is integrated off this body's OWN temperature trajectory
     * (`Piecewise.integrate(T ↦ 10^((T − ref)/z))`, the thermal-dose shape),
     * so a brick nobody read for three days is credited for three days.
     * The transitions read are the ORIGIN material's — the clay's, not the
     * terracotta's it has already become — so a piece keeps climbing its
     * ladder through every rung.
     */
    private reconcileHeatWork(): void {
      if (this._heatWorkReconciling) return;
      const self = this.thermalHost;
      if (!MixinApi.isTangible(self)) return;
      const current = self.getMaterial();
      if (current === null) return;
      this._heatWorkReconciling = true;
      try {
        // A material that becomes vapor in a lit chamber (salt at peak
        // heat) leaves the piece and enters the chamber's air (ruling B).
        if (this.vaporizeIfHot(current)) return;
        // ⭐ Green ware reads its weather BEFORE the heat converts it (R2):
        // a wet piece in a kiln bursts as steam, and a rung would end the
        // green state before the burst was seen.
        const piece = this as unknown as Stuff;
        if (MixinApi.isGreenware(piece)) piece.reconcileGreen();
        const rec = this.heatWork;
        const source =
          rec !== null && rec.origin !== null && rec.origin !== current.getTemplatePath()
            ? StuffApi.findByTemplatePath<Material>(rec.origin) ?? current
            : current;
        const transitions = source.getHeatTransitions();
        if (transitions.length === 0) return;
        const nowS = this.thermalNowSeconds();
        if (nowS === null) return;
        this.integrateHeatWork(source, transitions, nowS);
      } finally {
        this._heatWorkReconciling = false;
      }
    }

    /** Vaporize into the chamber holding this body, if hot enough there. */
    private vaporizeIfHot(mat: Material): boolean {
      const above = mat.getVaporizesAboveK();
      if (!(above > 0) || !(this.stampedTemperatureK >= above)) return false;
      const self = this.thermalHost;
      const holder = self.getContainer() as unknown as Stuff | null;
      if (holder === null || !MixinApi.isBurner(holder) || !holder.isLit()) return false;
      holder.addChamberVapor(mat.getTemplatePath() ?? "", self.getMass().rawValue());
      void StuffApi.destruct(self as unknown as Stuff);
      return true;
    }

    private integrateHeatWork(
      source: Material,
      transitions: readonly HeatTransition[],
      nowS: number,
    ): void {
      const self = this.thermalHost;
      const ring = this.thermalRing();
      const prior = this.heatWork;
      const fromS = prior?.checkedS ?? ring.horizonS() ?? nowS;
      if (!(nowS > fromS)) return;
      const pw = ring.window(fromS, nowS, this.stampedTemperatureK);
      let peak = 0;
      for (const sample of pw.samples(8)) {
        if (sample.value > peak) peak = sample.value;
      }
      peak = Math.max(peak, this.stampedTemperatureK);
      const floor = Math.min(...transitions.map((t) => t.floorK()));
      if (peak < floor) {
        // Cold: nothing accrues. A body with no record keeps none.
        if (prior !== null) this.heatWork = { ...prior, checkedS: nowS };
        return;
      }
      const rec = prior !== null ? cloneHeatWork(prior) : freshHeatWork();
      if (rec.origin === null) rec.origin = source.getTemplatePath();
      if (rec.originMassKg === null) rec.originMassKg = self.getMass().rawValue();
      rec.peakK = Math.max(rec.peakK, peak);
      for (const st of pw.stretches) {
        if (st.tau > 0 && st.toS > st.fromS) {
          const rate = Math.abs(st.target - st.startValue) / st.tau;
          if (rate > rec.maxRateKPerS) rec.maxRateKPerS = rate;
        }
      }

      // ⭐ What holds the body decides whether a flame could burn here: a
      // body shut in a burner below the flaming dial is in STARVED air.
      const holder = self.getContainer() as unknown as Stuff | null;
      const chamber = holder !== null && MixinApi.isBurner(holder) ? holder : null;
      const completeness = chamber !== null ? chamber.completeness() : 1;
      const starved =
        chamber !== null &&
        completeness < heatWorkDial(AppSettingKeys.fireAirFlamingCompleteness, 0.6);
      const burning = MixinApi.isCombustible(self) && self.isBurning();

      const reached: { t: HeatTransition; conv: HeatWorkConversion }[] = [];
      for (const t of transitions) {
        const key = t.getKey();
        const conv: HeatWorkConversion = rec.conversions[key] ?? {
          dose: 0,
          degree: 0,
          rung: t.rungIndexFor(0),
        };
        // ⚠ A burning body is burning, not converting; and pyrolysis
        // happens only where a flame could not.
        if (burning) continue;
        if (t.requiresStarvedAir() && !starved) continue;
        const dDose = pw.integrate((k) => t.rateAt(k), 8);
        if (!(dDose > 0)) continue;
        const before = conv.degree;
        conv.dose += dDose;
        const agentFraction = this.agentFractionFor(t);
        if (t.getAgent() !== null) conv.agentFraction = agentFraction;
        conv.degree = Math.max(before, t.degreeFor(conv.dose, agentFraction));
        const w = rec.atmosphere.weight;
        rec.atmosphere.completeness =
          (rec.atmosphere.completeness * w + completeness * dDose) / (w + dDose);
        rec.atmosphere.weight = w + dDose;
        for (const sample of pw.samples(8)) {
          if (sample.value >= t.floorK()) rec.aboveS += sample.durationS / transitions.length;
        }
        // The third product: what leaves the piece as it converts.
        const dDegree = conv.degree - before;
        if (dDegree > 0) {
          for (const v of t.getVolatiles()) {
            routeVolatile(self as unknown as Stuff, v.material,
              v.litresPerKg * (rec.originMassKg ?? 0) * dDegree);
          }
        }
        rec.conversions[key] = conv;
        const idx = t.rungIndexFor(conv.degree);
        if (idx > conv.rung) {
          conv.rung = idx;
          reached.push({ t, conv });
        }
      }
      rec.checkedS = nowS;
      this.heatWork = rec;
      this.rescaleConvertedMass(transitions);
      this.regradeCure(transitions);
      for (const { t, conv } of reached) {
        if (this.applyRung(t, conv, nowS) === "cast") return;
      }
    }

    /** The piece's own share of an agent (ruling B) — never its neighbours'. */
    private agentFractionFor(t: HeatTransition): number {
      const agent = t.getAgent();
      if (agent === null) return 0;
      const self = this.thermalHost as unknown as Stuff;
      if (MixinApi.isComposition(self)) {
        return (self as Stuff & Composition).fractionOf(agent.material);
      }
      // ⭐ A cast carries no composition of its own; the record remembers
      // what the piece it was poured from carried.
      return this.heatWork?.conversions[t.getKey()]?.agentFraction ?? 0;
    }

    /**
     * ⭐ Part-conversion is mass: `raw × Π(1 − degree × (1 − retained))` —
     * a half-burnt limestone has lost half its CO₂, and weighs it.
     */
    private rescaleConvertedMass(transitions: readonly HeatTransition[]): void {
      const rec = this.heatWork;
      if (rec === null || rec.originMassKg === null) return;
      let factor = 1;
      for (const t of transitions) {
        const c = rec.conversions[t.getKey()];
        if (!c) continue;
        factor *= 1 - c.degree * (1 - t.getMassRetained());
      }
      const kg = rec.originMassKg * factor;
      const self = this.thermalHost;
      const was = self.getMass().rawValue();
      if (Math.abs(was - kg) > 1e-9) {
        self.setMass(Quantity.of(kg, "kg"));
        // ⭐ (potash D12a) What STAYS concentrates: the water and the gas
        // leave, the constituents do not — black salts calcined to pearl ash
        // keep their potash in less cake. Capped at the whole.
        const piece = self as unknown as Stuff;
        if (kg > 0 && MixinApi.isComposition(piece)) {
          const alloying = piece.getMakeup();
          if (alloying.length > 0) {
            piece.setMakeup(
              alloying.map((e) => ({ ...e, fraction: Math.min(1, (e.fraction * was) / kg) })),
            );
          }
        }
      }
    }

    /**
     * ⭐ A cure with an agent grades the piece by how far it went — the
     * weaker of the piece's own grade before the cure and the cure's, re-read
     * as the degree rises. A kiln fault (scorched) is always poor.
     */
    private regradeCure(transitions: readonly HeatTransition[]): void {
      const rec = this.heatWork;
      const self = this.thermalHost as unknown as Stuff;
      if (rec === null || !MixinApi.isGraded(self)) return;
      for (const t of transitions) {
        const c = rec.conversions[t.getKey()];
        if (!c || c.rung < 0 || t.getAgent() === null) continue;
        if (c.rung < t.getLadder().length - 1) continue;
        if (rec.gradeCap === null) rec.gradeCap = self.getGrade().getBand();
        const out = t.outcomeAt(c.rung, {
          peakK: rec.peakK,
          agentFraction: this.agentFractionFor(t),
          reducing: false,
        });
        const cure = t.gradeOf(c.degree, this.agentFractionFor(t), out?.kind ?? "rung");
        self.setGrade(Grade.of(rec.gradeCap as never).min(cure));
      }
    }

    /**
     * ⭐ A rung: the piece BECOMES the rung's material — or, standing in a
     * mould that is not its own cast, hands the mould a pool and the mould
     * mints the shape (the rubber charge becomes boots). Identity is kept
     * otherwise: the same jug comes out of the kiln it went in.
     */
    private applyRung(
      t: HeatTransition,
      conv: HeatWorkConversion,
      nowS: number,
    ): "swap" | "cast" | "none" {
      const rec = this.heatWork;
      if (rec === null) return "none";
      const self = this.thermalHost;
      const reducing =
        rec.atmosphere.weight > 0 &&
        rec.atmosphere.completeness <
          heatWorkDial(AppSettingKeys.thermalHeatWorkReducingBelow, 0.6);
      const out = t.outcomeAt(conv.rung, {
        peakK: rec.peakK,
        agentFraction: this.agentFractionFor(t),
        reducing,
      });
      if (out === null) return "none";
      const mat = StuffApi.findByTemplatePath<Material>(out.materialPath);
      if (!mat) {
        console.error(`Thermal: heat transition '${t.getKey()}' names '${out.materialPath}', which does not resolve`);
        return "none";
      }
      rec.lastTransitionAtS = nowS;
      const discipline = t.getDiscipline();
      if (discipline !== "") rec.uncredited.push(discipline);
      if (out.kind === "scorched" && MixinApi.isGraded(self as unknown as Stuff)) {
        (self as unknown as Stuff & { setGrade(g: Grade): void }).setGrade(Grade.of("poor"));
      }

      // ⭐⭐ The mould seam (moulding-slate § 5): the shape is the mould's.
      const holder = self.getContainer() as unknown as Stuff | null;
      if (
        holder !== null &&
        MixinApi.isMould(holder) &&
        (holder as Stuff & Mould).castTemplateFor(mat) !== (self as unknown as Stuff).getTemplatePath()
      ) {
        const mould = holder as Stuff & Mould;
        const massKg = self.getMass().rawValue();
        const record = cloneHeatWork(rec);
        const maker = MixinApi.isCrafted(self as unknown as Stuff)
          ? (self as unknown as { getMaker(): string }).getMaker()
          : "";
        const grade = MixinApi.isGraded(self as unknown as Stuff)
          ? (self as unknown as { getGrade(): Grade }).getGrade()
          : null;
        // ⭐ An agent's cure grades the cast as it is minted — the weaker of
        // what the mould gives it and how far the cure went — and the record
        // keeps the cap, so the grade re-reads as the cure goes on.
        const cure =
          t.getAgent() !== null
            ? t.gradeOf(conv.degree, this.agentFractionFor(t), out.kind)
            : null;
        const minting: Promise<unknown> = mould
          .castInto({ material: mat, massKg, payload: null, stampMaterial: true })
          .then((cast) => {
            if (cast === null) return;
            if (MixinApi.isCrafted(cast) && maker !== "" && cast.getMaker() === "") {
              cast.setMaker(maker);
            }
            if (grade !== null && MixinApi.isGraded(cast)) {
              cast.setGrade(cast.getGrade().min(grade));
            }
            if (cure !== null && MixinApi.isGraded(cast)) {
              record.gradeCap = cast.getGrade().getBand();
              cast.setGrade(cast.getGrade().min(cure));
            }
            if (MixinApi.isThermal(cast)) cast.adoptHeatWork(record);
            if (out.kind !== "rung") describeOffRung(cast, mat);
          })
          .finally(() => PENDING_CASTS.delete(minting));
        PENDING_CASTS.add(minting);
        void StuffApi.destruct(self as unknown as Stuff);
        return "cast";
      }
      const was = MixinApi.isTangible(self as unknown as Stuff) ? self.getMaterial() : null;
      (self as unknown as { setMaterial(m: Material): void }).setMaterial(mat);
      const rung = t.getLadder()[conv.rung];
      restampProse(self as unknown as Stuff, rec, was, mat, rung?.describes ?? "");
      // ⭐ A vapor in the chamber's air at the rung lays a fused coat on the
      // outside (ruling B): salt thrown into a kiln at peak heat glazes the
      // stoneware in it. The coat's material is the transition's to name.
      const chamber = holder !== null && MixinApi.isBurner(holder) ? holder : null;
      const piece = self as unknown as Stuff;
      if (chamber !== null && MixinApi.isFaced(piece)) {
        const vapors = chamber.getChamberVapors();
        for (const [vapor, coat] of Object.entries(t.getVapor())) {
          if (!((vapors[vapor] ?? 0) > 0)) continue;
          piece.layCoat("outside", coat, 0);
          piece.fuseCoats(rec.peakK);
          rec.atmosphere.vapors = [...new Set([...rec.atmosphere.vapors, vapor])];
        }
      }
      return "swap";
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
      // ⭐ The fire's heat FOR THIS BODY (ceramics D3): a clamp is hotter
      // in its fire channels than at its skin.
      return this.heatSource()?.heldTemperatureKFor(this as unknown as Stuff) ?? null;
    }

    /**
     * ⭐ The lit, fuelled furnace heating this body — the one it is IN (a
     * loaf in an oven) or ON (a pot on a campfire) — or `null`. The fire
     * itself, so a reader can ask its power as well as its temperature
     * (sugar D2). Distinct from {@link reachableHeatSource}, which is
     * what a recipe can reach from the room.
     */
    public heatSource(): (Stuff & Burner) | null {
      const self = this.thermalHost;
      // `isBurner` narrows the one cast to the container type.
      const lit = (candidate: Stuff | null): (Stuff & Burner) | null => {
        if (candidate === null || !MixinApi.isBurner(candidate)) return null;
        if (!candidate.isLit() || candidate.fuelRemaining() <= 0) return null;
        return candidate;
      };
      const holder = self.getContainer() as unknown as Stuff | null;
      return (
        lit(holder) ??
        lit((self.getPlacement()?.host ?? null) as unknown as Stuff | null) ??
        // ⭐ One hop through a MOULD (the mould seam, ceramics W0): a charge
        // standing in a boot mould in a lit oven is in the oven's heat. Only
        // a mould — a bag in a fire is somebody else's problem.
        (holder !== null && MixinApi.isMould(holder) && MixinApi.isContainable(holder)
          ? lit(holder.getContainer() as unknown as Stuff | null)
          : null)
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
      if (holder === null) {
        // ⭐ Rung two: immersed in a bath, a body is at the bath's
        // temperature (see `enclosingBath`). Read in the same position
        // on the pull and the push side as the coolbox, for the same
        // reason.
        const bath = enclosingBath(self);
        return bath === null ? null : bath.getContentsTemperature().rawValue();
      }
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
      const water = BiomeApi.mediumFor(this.thermalHost);
      this.immersedTag = water.immersed ? water.tag : null;
      const immersedK = water.immersed ? water.temperatureK : null;
      if (sourceK !== null) {
        ambientK = sourceK;
      } else if (holderCold !== null) {
        // ⭐ Seam 1, the push side — same position as `heatSourceK`.
        ambientK = holderCold;
      } else if (immersedK !== null) {
        // ⭐ In the water (underwater D29 seam 3): a thing on the bed or
        // carried down is at the water's temperature, and the water draws
        // heat ~25× faster than air (the conductivity below).
        ambientK = immersedK;
      } else {
        // Resolve the new scope's ambient. ⭐ The scope is the nearest
        // thing outward with air in it — an enclosing placement host
        // that has its own, else the first container up the chain that
        // is `Atmospheric`. A bag, a crate and a carrier are stepped
        // through, because none of them is weather.
        // ⭐ Any Atmospheric scope answers — since the `Atmospheric`
        // widening that includes a `Chamber`, which holds its occupants
        // by placement and is no Container.
        const scope = airScopeOf(this.thermalHost);
        if (scope !== null) {
          try {
            ambientK = (
              await BiomeApi.resolveTemperatureFor(scope)
            ).rawValue();
          } catch {
            // keep the cached ambient on any resolution failure
          }
          // ⭐ The push side reads evaporation too (the Coolbox lesson:
          // the day the two sides disagree, a wet jar is cool in one and
          // not the other).
          ambientK -= this.evaporativeDepressionK(ambientK);
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


/* ────────────── the heat history (module-private) ────────────── */

/**
 * Casts a rung has handed a mould and not yet minted (`castInto` clones a
 * row, which is async; the reconcile that reached the rung is sync). A
 * firing's end awaits them so it can say what came out.
 */
const PENDING_CASTS = new Set<Promise<unknown>>();
/** The crop each vessel is minting, by stuff id (see `setCrystals`). */
const CROPS_MINTING = new Map<string, { kg: number }>();

function freshHeatWork(): HeatWorkRecord {
  return {
    peakK: 0,
    aboveS: 0,
    atmosphere: { completeness: 1, weight: 0, vapors: [] },
    checkedS: null,
    conversions: {},
    lastTransitionAtS: null,
    origin: null,
    originMassKg: null,
    prose: { prefix: "", sentence: "" },
    firedBy: null,
    maxRateKPerS: 0,
    uncredited: [],
    gradeCap: null,
  };
}

/** A deep copy — the record is persisted, and a copy must not alias it. */
function cloneHeatWork(r: Readonly<HeatWorkRecord>): HeatWorkRecord {
  const conversions: Record<string, HeatWorkConversion> = {};
  for (const [k, c] of Object.entries(r.conversions ?? {})) conversions[k] = { ...c };
  return {
    ...freshHeatWork(),
    ...r,
    atmosphere: {
      completeness: r.atmosphere?.completeness ?? 1,
      weight: r.atmosphere?.weight ?? 0,
      vapors: [...(r.atmosphere?.vapors ?? [])],
    },
    conversions,
    uncredited: [...(r.uncredited ?? [])],
    prose: { prefix: r.prose?.prefix ?? "", sentence: r.prose?.sentence ?? "" },
  };
}

/**
 * ⭐ A piece that kept its identity through a rung says what it is NOW —
 * without being re-classed (ruling C). Where its description names its old
 * material (*lump of limestone*), the name is swapped; where it does not
 * (*length of cordwood*), the rung's `describes` word is put in front. The
 * long description gains one sentence of the new material's appearance,
 * REPLACING the last rung's, so a clay climbing three rungs reads once.
 */
function restampProse(
  piece: Stuff,
  rec: HeatWorkRecord,
  from: Material | null,
  to: Material,
  describes: string,
): void {
  const v = piece as Stuff & {
    getShortDescription?(): string;
    setShortDescription?(s: string): void;
    getLongDescription?(): string;
    setLongDescription?(s: string): void;
    getKeywords?(): readonly string[];
    setKeywords?(k: string[]): void;
  };
  const toName = to.getName();
  const fromName = from?.getName() ?? "";
  let short = v.getShortDescription?.() ?? "";
  if (rec.prose.prefix !== "" && short.startsWith(`${rec.prose.prefix} `)) {
    short = short.slice(rec.prose.prefix.length + 1);
  }
  let prefix = "";
  const named = fromName !== "" && new RegExp(`\\b${escapeRe(fromName)}\\b`, "i").test(short);
  if (named) {
    short = short.replace(new RegExp(`\\b${escapeRe(fromName)}\\b`, "i"), toName);
  } else if (describes !== "") {
    prefix = describes;
    short = `${describes} ${short}`;
  }
  if (short !== "") v.setShortDescription?.(short);
  if (typeof v.setKeywords === "function") {
    const kw = new Set(v.getKeywords?.() ?? []);
    for (const w of toName.split(/\s+/)) if (w) kw.add(w.toLowerCase());
    if (prefix) kw.add(prefix.toLowerCase());
    v.setKeywords([...kw]);
  }
  const looks = to.getAppearance();
  if (typeof v.setLongDescription === "function") {
    let long = (v.getLongDescription?.() ?? "").trimEnd();
    if (rec.prose.sentence !== "" && long.endsWith(rec.prose.sentence)) {
      long = long.slice(0, long.length - rec.prose.sentence.length).trimEnd();
    }
    const sentence = looks ? `It is ${looks} now.` : "";
    v.setLongDescription(sentence ? (long ? `${long}\n\n${sentence}` : sentence) : long);
    rec.prose = { prefix, sentence };
  } else {
    rec.prose = { prefix, sentence: "" };
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One numeric dial read, falling back to the literal when unseeded. */
function heatWorkDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw == null || raw === "") return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * ⭐⭐ **The volatiles — the third product of a firing.** What leaves a
 * converting piece goes to whatever HOLDS it: a chamber that knows what to
 * do with vapor takes it (a retort hands its tar to the condenser on its
 * head — a structural probe, because the kernel cannot name a trade's
 * receiver), and one that does not lets it into the air of the place it
 * stands in, which is why a retort with no condenser makes the room smell
 * of tar. Moved here from `FireController` (ceramics W0): the transition,
 * not the verb, makes the tar.
 */
function routeVolatile(from: Stuff, materialPath: string, litres: number): void {
  if (!(litres > 0)) return;
  const holder = MixinApi.isContainable(from)
    ? (from.getContainer() as unknown as Stuff | null)
    : null;
  const receiver = holder as unknown as {
    receiveVolatiles?: (materialPath: string, litres: number) => void;
  } | null;
  if (receiver !== null && typeof receiver.receiveVolatiles === "function") {
    receiver.receiveVolatiles(materialPath, litres);
    return;
  }
  let at: Stuff | null = holder ?? from;
  let depth = AIR_SCOPE_DEPTH_CAP;
  while (at !== null && depth-- > 0) {
    if (MixinApi.isAtmospheric(at) && MixinApi.isContainer(at)) {
      const air = at as unknown as AtmosphericScope;
      if (air.getVolume() !== null) {
        air.addAtmosphereContent(materialPath, litres);
        return;
      }
    }
    at = MixinApi.isContainable(at) ? (at.getContainer() as unknown as Stuff | null) : null;
  }
}

/**
 * A shape row is authored for the GOOD outcome (boots are rubber boots); a
 * piece that came out as something else says so in its own material's
 * words — found by the rubber drive: an under-cured boot read like a good one.
 */
function describeOffRung(cast: Stuff, mat: Material): void {
  const v = cast as Stuff & { getLongDescription?(): string; setLongDescription?(s: string): void };
  const looks = mat.getAppearance() || mat.getName();
  if (typeof v.setLongDescription === "function" && looks) {
    const was = v.getLongDescription?.() ?? "";
    v.setLongDescription(`${was.trimEnd()}\n\nIt is ${looks}.`);
  }
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
function reachableHeatSourceImpl(position: Stuff): (Stuff & Burner) | null {
  const scope = (position as unknown as { getContainer(): Stuff | null })
    .getContainer();
  if (scope === null || !MixinApi.isContainer(scope)) return null;
  let best: (Stuff & Burner) | null = null;
  let hottest = 0;
  for (const occ of (scope as Stuff & Container).getContents()) {
    const s = occ as unknown as Stuff;
    if (s.isDestroyed() || !MixinApi.isBurner(s)) continue;
    if (!s.isLit() || s.fuelRemaining() <= 0) continue;
    const t = s.getHeldTemperatureK();
    if (t > hottest) {
      hottest = t;
      best = s as unknown as Stuff & Burner;
    }
  }
  return best;
}

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

/**
 * What the phase pass knows about time: now, and how far back the body's
 * own temperature record reaches (a purification clock may not credit
 * history the body never had).
 */
interface PhaseClock {
  nowS: number | null;
  horizonS: number | null;
  /**
   * The drift the reconcile just integrated (its seconds and the body's
   * τ), when the phase pass follows one — `null` from any other caller.
   */
  drift?: { seconds: number; tauS: number } | null;
  /** When the phase pass last looked, if known. */
  lastS?: number | null;
}

function reconcilePhaseImpl(stuff: Stuff, clock: PhaseClock): void {
  // A solid object melting: the latent-heat plateau, then the flow to bulk.
  // ⚠ A meltable VESSEL (a glass bottle — ceramics W0) melts only at its
  // own melting point; below it, it is a vessel, and its contents still
  // freeze and boil by the arm below.
  if (MixinApi.isMeltable(stuff) && MixinApi.isThermal(stuff)) {
    const asVessel = MixinApi.isBulkable(stuff) && stuff.hasInteriorBulk();
    const mp = (stuff as Stuff & Meltable).getMeltingPointK();
    if (!asVessel || (mp > 0 && stuff.getTemperature().rawValue() >= mp)) {
      reconcileMelt(stuff as Stuff & Meltable & Thermal);
      return;
    }
  }
  // A liquid-holding vessel: freeze below its material's melting point (a
  // casting) or boil above its boiling point (steam).
  if (MixinApi.isBulkable(stuff) && MixinApi.isThermal(stuff)) {
    reconcileBulkPhase(stuff as Stuff & Bulkable & Thermal, clock);
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
  // ⭐ What was dissolved in the piece goes with it into the pool.
  const dissolved = MixinApi.isComposition(m as unknown as Stuff)
    ? [...(m as unknown as Composition).getMakeup()]
    : [];
  StuffApi.destruct(m as unknown as Stuff);
  if (scope === null || !MixinApi.isContainer(scope)) return;
  // ⭐⭐ A pot standing in the same chamber catches the melt before the
  // floor does (ceramics ruling C) — a bottle in a kiln pools into the
  // glasshouse's pot, never into a floorless chamber's void.
  const pot = poolVesselIn(scope as Stuff & Container, mat, m as unknown as Stuff);
  if (pot !== null && litres > 0) {
    const cur = pot.getBulkAmount('interior').rawValue();
    const payload = pot.getBulkPayload('interior');
    if (cur <= 0 || pot.getBulkMaterial('interior') === null) pot.setBulkMaterial('interior', mat);
    pot.setBulkAmount('interior', Quantity.of(cur + litres, 'L'));
    const folded = BulkableApi.blendPayloads(
      dissolved.length > 0 ? { makeup: dissolved } : null,
      litres,
      payload,
      cur,
    );
    pot.setBulkPayload('interior', Object.keys(folded).length > 0 ? folded : null);
    return;
  }
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
 * ⭐ The boil clock: seconds the contents have spent at their boiling
 * point, integrated off the vessel's OWN temperature trajectory since the
 * last read (the cocoon's stifle idiom), banked on the payload. `heldS`
 * is the running total (the purification hold reads it); `sinceS` is
 * this read's share (the fire's power is spent over it, sugar D2). It
 * runs for every material on the plateau. `null` without a world clock (a
 * unit test, a spell with no clock): the hold cannot be timed, so it
 * never completes, and the boil falls back to the overshoot.
 */
function boilHeldSeconds(
  v: Stuff & Bulkable & Thermal,
  aff: BulkAffordance,
  bp: number,
  clock: PhaseClock,
): { heldS: number; sinceS: number } | null {
  const { nowS, horizonS } = clock;
  if (nowS === null) return null;
  const payload = v.getBulkPayload(aff) ?? {};
  const before = payload.boilHeldS ?? 0;
  let held = before;
  // ⚠ Never before the body's own record begins: the trajectory HOLDS its
  // oldest value backwards, which would credit a pot that arrived at the
  // boil with ten minutes of boiling it never did.
  // A pot found boiling for the first time starts its clock where the
  // phase pass last looked — before that nobody saw it boil, and after it
  // the trajectory says exactly when it reached the boil.
  const fromS =
    payload.boilCheckedS ??
    Math.max(
      clock.lastS ?? nowS - THERMAL_DEFAULTS.PURIFY_LOOKBACK_S,
      horizonS ?? nowS,
    );
  if (nowS > fromS) {
    // ⚠ Half a kelvin of slack: the plateau clamps the contents AT the
    // boiling point, and a curve that sits exactly on it is boiling.
    held += v.temperatureTrajectory(fromS, nowS).secondsAtOrAbove(bp - 0.5);
  }
  v.setBulkPayload(aff, { ...payload, boilHeldS: held, boilCheckedS: nowS });
  return { heldS: held, sinceS: held - before };
}

/**
 * ⭐⭐ The heat spent on steam this read (sugar D2). Over a lit fire it is
 * the fire's delivered power at the boil — `(T_fire − bp) · C / τ`, the
 * same coupling that warmed the pot — times the seconds spent there. An
 * unread pot boils off what the fire actually gave it, not one
 * capacity's worth per gap, and a watched pot boils no faster for being
 * watched. With no fire, or no clock, the overshoot above the boil is
 * what there is (a pot taken off the fire boils on a moment, then
 * stops).
 */
function boilJoules(
  v: Stuff & Bulkable & Thermal,
  temp: number,
  bp: number,
  held: { heldS: number; sinceS: number } | null,
): number {
  const overshootJ = (temp - bp) * v.thermalCapacityJPerK();
  const source = v.heatSource();
  if (source === null || held === null) return overshootJ;
  const tau = v.getTau().rawValue();
  const spanK = source.getHeldTemperatureK() - bp;
  if (!(tau > 0) || !(spanK > 0)) return overshootJ;
  return ((spanK * v.thermalCapacityJPerK()) / tau) * held.sinceS;
}

/**
 * The thickest a boiling solution gets, kg of solids per litre — sugar
 * with the last of its water gone. A pan never boils past it.
 */
const SOLIDS_CEILING_KG_PER_L = 1.58;

/**
 * ⭐ The boil-down's stages (sugar D1): once the liquor's mass fraction
 * has reached an arrow's `fromW`, the highest such arrow fires — the
 * material swaps and the payload carries (minus the boil clock), the
 * `purifyIfHeld` shape. An arrow with `minBand` reads the VESSEL's grade
 * (the tempering and skimming write it) and below the band fires
 * `elseBecomes` instead: what will not grain is blackstrap. An arrow that
 * names the material already in the pan, or a row nothing resolves, leaves
 * it alone.
 */
function concentrateIfReached(
  v: Stuff & Bulkable & Thermal,
  aff: BulkAffordance,
  mat: Material,
): void {
  const arrows = mat.getConcentratesTo();
  if (arrows.length === 0) return;
  const payload = v.getBulkPayload(aff) ?? {};
  const w = mat.solidsMassFraction(
    payload.dissolvedSolidsKgPerL ?? mat.getSolidsKgPerL(),
  );
  let arrow: ConcentrationArrow | null = null;
  for (const a of arrows) if (a.fromW <= w) arrow = a;
  if (arrow === null) return;
  let into = arrow.becomes;
  if (arrow.minBand && arrow.elseBecomes) {
    const band = MixinApi.isGraded(v) ? v.getGrade() : null;
    if (band === null || band.compareTo(Grade.of(arrow.minBand)) < 0) {
      into = arrow.elseBecomes;
    }
  }
  if (into === mat.getTemplatePath()) return;
  const next = StuffApi.findByTemplatePath<Material>(into);
  if (!next) return;
  const { boilHeldS: _h, boilCheckedS: _c, ...rest } = payload;
  v.setBulkMaterial(aff, next);
  v.setBulkPayload(aff, Object.keys(rest).length > 0 ? rest : null);
}

/**
 * Held at the boil long enough: the contents become what their material
 * says boiling makes of them (fouled water → water, tar → pitch). An arrow
 * that resolves to nothing leaves them alone — you boiled it, and it is
 * unchanged, only hotter.
 */
function purifyIfHeld(
  v: Stuff & Bulkable & Thermal,
  aff: BulkAffordance,
  mat: Material,
  heldS: number | null,
): void {
  if (mat.getPurifiedByBoiling() === '') return;
  if (heldS === null || heldS < THERMAL_DEFAULTS.PURIFY_HOLD_S) return;
  const into = StuffApi.findByTemplatePath<Material>(
    mat.getPurifiedByBoiling(),
  );
  if (!into) return;
  const payload = v.getBulkPayload(aff) ?? {};
  const { boilHeldS: _h, boilCheckedS: _c, ...rest } = payload;
  v.setBulkMaterial(aff, into);
  v.setBulkPayload(aff, Object.keys(rest).length > 0 ? rest : null);
}

/**
 * A liquid-holding vessel's onward transitions, keyed on its held bulk's
 * material + the vessel's own temperature: boil to gas above the boiling point
 * (steam — the bulk shrinks away), or solidify below the melting point (a cast
 * solid `Thing` drops into the vessel's scope). The reverse of the melt above,
 * driven by the same heat read — so ice → water → steam falls out for free.
 */
/**
 * ⭐ The heat a freezing pool gave up since it last sat at `mp` — by TIME,
 * not by how often anybody looked. On the plateau a pool loses
 * `C·(mp − amb)/τ` a second; the reconcile has meanwhile drifted it, as if
 * nothing were freezing, to `T = amb + (mp − amb)·e^(−t/τ)`, so the time it
 * spent there is `τ·ln((mp − amb)/(T − amb))` and the heat is
 * `C·(mp − amb)·ln((mp − amb)/(T − amb))`. Short gaps reduce to the old
 * `(mp − T)·C`; a pool that drifted from above `mp` is credited only the
 * time after it reached it. ⚠ The old figure capped one read at
 * `(mp − amb)·C`, so a damp-blown flask left three hours and read once
 * never set (the ceramics drive, run 24). A pool that has reached ambient
 * has given up everything it ever will: `Infinity`, which the caller caps.
 */
function plateauHeatJ(
  mp: number,
  temp: number,
  ambientK: number,
  capacityJ: number,
  drift: { seconds: number; tauS: number } | null,
): number {
  const gap = mp - ambientK;
  if (!(gap > 0)) return (mp - temp) * capacityJ;
  if (temp >= mp) return 0;
  const above = temp - ambientK;
  if (above <= 1e-9) {
    // ⚠ AT (or below) the air the drift cannot say how long the pool sat
    // there: below it, the air warmed over the gap — a sunrise, or a damp
    // mould's evaporative chill easing as it dried (run 29: a damp-blown
    // flask read once after three hours stayed liquid on the old figure).
    // So by the time the drift actually covered: on the plateau a pool loses
    // C·(mp − amb)/τ a second. No drift on record: the old figure.
    if (drift && drift.tauS > 0) return capacityJ * gap * (drift.seconds / drift.tauS);
    return (mp - temp) * capacityJ;
  }
  return capacityJ * gap * Math.log(gap / above);
}

function reconcileBulkPhase(
  v: Stuff & Bulkable & Thermal,
  clock: PhaseClock,
): void {
  const aff: BulkAffordance = v.hasInteriorBulk() ? 'interior' : 'surface';
  const amount = v.getBulkAmount(aff).rawValue();
  if (amount <= 0) return;
  const mat = v.getBulkMaterial(aff);
  if (!mat) return;
  const temp = v.getTemperature().rawValue();

  // ⭐⭐ **Crystallizing** (ceramics S17), the third arm — and the one that
  // fires at ANY temperature: a solution sets crystals when it holds more
  // than its material dissolves at its heat, whether the water left
  // (a salt pan in the sun) or the heat did (alum liquor cooling).
  if (crystallizeIfOver(v, aff, mat, temp)) return;

  // ⭐ The boil climbs as the solution thickens (sugar D1): the boiling
  // point is the material's at the liquor's own concentration. Water and
  // every other material that authors no elevation boil where they did.
  const solids =
    v.getBulkPayload(aff)?.dissolvedSolidsKgPerL ?? mat.getSolidsKgPerL();
  const bp = mat.boilingPointAt(mat.solidsMassFraction(solids));
  if (bp > 0 && temp >= bp) {
    // ⭐⭐ **A gas does not boil away** — it is ALREADY above its boiling
    // point everywhere anybody stands, which is what makes it a gas, and
    // whether it stays put is CLOSURE's job and not temperature's.
    //
    // ⚠ Without this arm a lamp filled with coal gas would be destroyed
    // by its own flame on the first tick, and a gasometer standing in
    // the sun would empty itself. The derivation is the same comparison
    // `requiredClosureFor` makes, so there is one definition of "gas"
    // and it lives on the material.
    if (BulkableApi.requiredClosureFor(mat) === 'sealed') return;
    // ⭐⭐ **The latent-heat plateau** (silk W4) — the boil twin of
    // `reconcileMelt`, and what `Material.latentHeatOfVaporization` always
    // said it was for: the heat above the boiling point is spent turning
    // liquid to steam, and the liquid HOLDS at the boil while it lasts.
    // Before this the whole interior flashed to steam the instant it
    // reached the boiling point, so every pot on every fire in the game
    // boiled dry at 100 °C and nothing could be held at a simmer — which
    // made boiling cloth (and anything else) unrepresentable. A material
    // with no latent heat still flashes, as the doc promises (`0` = an
    // instantaneous transition).
    const latent = mat.getLatentHeatOfVaporization().rawValue();
    // What leaves is WATER: a solution loses a litre of it per kilogram,
    // and keeps every gram of what was dissolved in it.
    const kgPerL = solids > 0 ? 1 : mat.getDensity().rawValue() / 1000;
    if (latent > 0 && kgPerL > 0) {
      const held = boilHeldSeconds(v, aff, bp, clock);
      const boiledL = boilJoules(v, temp, bp, held) / latent / kgPerL;
      const left = amount - boiledL;
      // ⭐⭐ The STEAM is water: what was dissolved stays behind, so a boil
      // CONCENTRATES (the ceramics drive's salt pan held twelve-hour fires
      // and set no salt while the solids left with the volume). A solution
      // cannot boil past its own solids: it thickens toward them instead
      // (the arrows end it long before).
      const floorL = solids > 0 ? (amount * solids) / SOLIDS_CEILING_KG_PER_L : 0;
      if (left > floorL || solids > 0) {
        // A solution at its ceiling holds there, all solids and no water
        // left to give: it never boils away (its `burnt` arrow, if it
        // authors one, is what ends it).
        const keptL = Math.max(left, floorL);
        v.setBulkAmount(aff, Quantity.of(keptL, 'L'));
        if (solids > 0) {
          v.setBulkPayload(aff, {
            ...(v.getBulkPayload(aff) ?? {}),
            dissolvedSolidsKgPerL: (solids * amount) / keptL,
          });
        }
        v.setContentsTemperature(bp); // the plateau
        purifyIfHeld(v, aff, mat, held?.heldS ?? null);
        concentrateIfReached(v, aff, mat);
        return;
      }
    }
    // Boiled dry (or no plateau to hold) — the liquid is gone to steam.
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
    const undershootJ = plateauHeatJ(mp, temp, v.lastAmbientK, capacityJ, clock.drift ?? null);
    const payload = v.getBulkPayload(aff);
    const need = massKg * mat.getLatentHeatOfFusion().rawValue();
    let removed = payload?.latentRemovedJ ?? 0;
    if (undershootJ > 0) {
      // Capped at what the freeze needs: nothing banks past the whole.
      removed = need > 0 ? Math.min(need, removed + undershootJ) : removed + undershootJ;
      if (!Number.isFinite(removed)) removed = 0;
      v.setBulkPayload(aff, { ...(payload ?? {}), latentRemovedJ: removed });
      v.setContentsTemperature(mp); // clamp — the plateau
    }
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

    // Solidify — the liquid becomes a cast solid of the same material.
    // ⭐⭐ **The set site asks the CONTAINER first** (dairy D9): a mould
    // keeps what set in it, in its own shape (an ice pan → a block; an
    // ingot mould → an ingot); any other vessel falls back to the
    // material's `castTemplate` (water → a lump of ice; a metal → the
    // generic `/stuff/thing/Casting`) dropped beside it, today's behaviour.
    const setPayload = v.getBulkPayload(aff);
    v.setBulkAmount(aff, Quantity.of(0, 'L'));
    v.setBulkMaterial(aff, null);
    v.setBulkPayload(aff, null);
    if (MixinApi.isMould(v)) {
      // ⭐ A metal is the same material molten or set, so the pool stamps
      // the mould's shape row (one ingot row for copper, tin and iron); a
      // `liquid`-tagged pool (water) has its own solid row (ice), which the
      // shape row authors and keeps.
      void v.castInto({
        material: mat,
        massKg,
        payload: setPayload,
        stampMaterial: !mat.hasTag('liquid'),
        // ⭐ (ceramics D22) The pool sets at its melting point; what heat
        // it was POURED with is the mould's record (`receivedPour`).
        temperatureK: mp,
      });
      return;
    }
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
      // ⭐ The pool's composition sets into the lump (ceramics ruling C).
      const dissolved = setPayload?.makeup;
      if (dissolved && dissolved.length > 0 && MixinApi.isComposition(cast as Stuff)) {
        (cast as Stuff & Composition).setMakeup(dissolved);
      }
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

/**
 * ⭐⭐ **The crystallize arm** (ceramics S17, D32). A bulk whose material
 * authors `solubility` and `crystallizesTo`, holding more dissolved solids
 * (`payload.dissolvedSolidsKgPerL`, else the material's own
 * `solidsKgPerL`) than `solubilityAt(T)`, sets the EXCESS:
 *
 *  - in a mold, kept in the mold's shape (`castInto`) — and a crop
 *    already setting there GROWS rather than a second one minting;
 *  - in any other vessel, a lump of crystals beside it (the product's own
 *    `castTemplate`), grown the same way.
 *
 * The liquor left is SATURATED, and what becomes of it is the one choice:
 *
 *  - ⭐ while the vessel is still concentrating it (a maturing host with an
 *    active batch — the pan the sun is working) it STAYS, its own
 *    material, so the crop keeps growing as the water keeps leaving and
 *    the total set is the same however often anybody looks;
 *  - otherwise the liquor is SPENT: its material swaps to
 *    `crystallizesTo.residue` (brine's bittern) and, in a mold standing
 *    on a vessel that takes drainings (`Mould.drainsInto()`), it runs
 *    down into that vessel.
 *
 * Returns true when it changed the slot (the caller stops for this read).
 */
function crystallizeIfOver(
  v: Stuff & Bulkable & Thermal,
  aff: BulkAffordance,
  mat: Material,
  tempK: number,
): boolean {
  const solubility = mat.solubilityAt(tempK);
  const into = mat.getCrystallizesTo();
  if (solubility === null || into === null) return false;
  const litres = v.getBulkAmount(aff).rawValue();
  if (!(litres > 0)) return false;
  const payload: BulkPayload = v.getBulkPayload(aff) ?? {};
  const held = payload.dissolvedSolidsKgPerL ?? mat.getSolidsKgPerL();
  if (!(held > solubility + 1e-9)) return false;
  const product = StuffApi.findByTemplatePath<Material>(into.product);
  if (!product) return false;

  const excessKg = (held - solubility) * litres;
  // ⚠ The liquor keeps its volume: a solute's share of a solution's volume
  // is small, and the volume is what the water does (the evaporative window
  // moves it) — subtracting the crystals' volume made a pan whose window
  // had run ahead of its reads lose its whole liquor to the crop.
  const liquorL = litres;
  const host = v as unknown as Stuff;
  const concentrating = MixinApi.isMaturing(host) && host.getMaturationPhase() === 'active';

  const liquorPayload: BulkPayload = { ...payload, dissolvedSolidsKgPerL: solubility };
  v.setBulkAmount(aff, Quantity.of(liquorL, 'L'));
  v.setBulkPayload(aff, liquorPayload);
  if (!concentrating) {
    const residue = StuffApi.findByTemplatePath<Material>(into.residue);
    if (residue && liquorL > 0) v.setBulkMaterial(aff, residue);
    if (MixinApi.isMould(v) && liquorL > 0) {
      const below = v.drainsInto();
      if (below !== null && below !== (v as unknown as Stuff)) {
        drainLiquorInto(v, aff, below, liquorL);
      }
    }
    if (liquorL <= 0) {
      v.setBulkMaterial(aff, null);
      v.setBulkPayload(aff, null);
    }
  }
  void setCrystals(v, product, excessKg);
  return true;
}

/**
 * The spent liquor runs down into the vessel the mold stands on — a
 * TRANSFER, the one primitive, so it carries what the liquor carries and
 * the receiver is asked whether it survives it. What the vessel below has
 * no room for stays in the mould; a different liquor already below is not
 * mixed into (the transfer declines the mismatch).
 */
function drainLiquorInto(
  v: Stuff & Bulkable,
  aff: BulkAffordance,
  below: Stuff & Bulkable,
  litres: number,
): void {
  BulkableApi.transfer(v.getBulk(aff), below.getBulk('interior'), {
    kind: 'measure',
    litres,
    mode: 'lenient',
  });
}

/**
 * Lay `kg` of `product` crystals where the vessel keeps them: a crop
 * already there (in the mold, or beside a plain vessel) of the same
 * material grows; otherwise one is set — `castInto` in a mold, the
 * product's own cast row beside anything else.
 */
async function setCrystals(
  v: Stuff & Bulkable & Thermal,
  product: Material,
  kg: number,
): Promise<void> {
  if (!(kg > 0)) return;
  const self = v as unknown as Stuff;
  // ⭐ One crop in the making per vessel: while its cast is minting (async),
  // a later read's crystals join it rather than starting another. A boil
  // read a hundred times in one clock advance started a hundred casts, each
  // a full containment move, and the world stopped answering (the ceramics
  // drive D, run 30 — a live CPU profile, 87 % in `castInto`).
  const minting = CROPS_MINTING.get(self.stuffId);
  if (minting) {
    minting.kg += kg;
    return;
  }
  const mould = MixinApi.isMould(self) ? (self as Stuff & Mould) : null;
  const scope = mould
    ? (self as unknown as Stuff & Container)
    : ((self as unknown as { getContainer(): Stuff | null }).getContainer() as
        | (Stuff & Container)
        | null);
  if (scope === null || !MixinApi.isContainer(scope as Stuff)) return;
  const shape = mould ? mould.castTemplateFor(product) : product.getCastTemplate();
  for (const c of scope.getContents()) {
    const s = c as unknown as Stuff;
    if (s === self || s.isDestroyed() || !MixinApi.isTangible(s)) continue;
    if (s.getTemplatePath() !== shape) continue;
    if (s.getMaterial()?.getTemplatePath() !== product.getTemplatePath()) continue;
    s.setMass(Quantity.of(s.getMass().rawValue() + kg, 'kg'));
    return;
  }
  const crop = { kg };
  CROPS_MINTING.set(self.stuffId, crop);
  try {
    let cast: Stuff | null;
    if (mould) {
      cast = await mould.castInto({ material: product, massKg: kg, payload: null, stampMaterial: true });
    } else {
      try {
        cast = await StuffApi.clone(shape);
      } catch {
        return; // an unresolvable shape must not crash a reconcile
      }
      if (MixinApi.isTangible(cast) && cast.getMaterial() === null) {
        cast.setMaterial(product);
        const c = cast as unknown as { setShortDescription?(s: string): void; setKeywords?(k: string[]): void };
        c.setShortDescription?.(`${product.getName()} crystals`);
        c.setKeywords?.(['crystals', 'crystal', ...product.getName().split(/\s+/)]);
      }
      if (MixinApi.isContainable(cast)) {
        ContainmentApi.move(cast as Stuff & Containable, scope);
      }
    }
    // Whatever joined the crop while it was minting is in it now.
    if (cast !== null && MixinApi.isTangible(cast)) cast.setMass(Quantity.of(crop.kg, 'kg'));
  } finally {
    CROPS_MINTING.delete(self.stuffId);
  }
}

/** Game-seconds for a freeze-ruin freshness stamp, or 0 before boot. */
function freezeNowSeconds(): number {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return 0;
  return WorldClockApi.getNow().rawValue();
}

/**
 * ⭐ A vessel in `scope` that a melt of `mat` can pool into: `Bulkable &
 * Thermal`, not a mould, with an interior that is empty or already holds
 * this material — the smelt's `crucibleIn` rule, here because a melt is
 * the phase engine's.
 */
function poolVesselIn(
  scope: Stuff & Container,
  mat: Material,
  melting: Stuff,
): (Stuff & Bulkable & Thermal) | null {
  for (const c of scope.getContents()) {
    const v = c as unknown as Stuff;
    if (v === melting || v.isDestroyed()) continue;
    if (!MixinApi.isBulkable(v) || !MixinApi.isThermal(v) || MixinApi.isMould(v)) continue;
    if (!v.hasInteriorBulk()) continue;
    const held = v.getBulkMaterial('interior');
    const amount = v.getBulkAmount('interior').rawValue();
    if (amount > 0 && held !== null && held.getTemplatePath() !== mat.getTemplatePath()) continue;
    return v as Stuff & Bulkable & Thermal;
  }
  return null;
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
