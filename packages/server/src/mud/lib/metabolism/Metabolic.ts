/**
 * MetabolicMixin — the body's intake-and-chemistry driver: the
 * consumer the `Reserve` substrate was built for and the first thing in
 * the engine to *drive* vitals conditions.
 *
 * It owns the **digestion buffer** (per-tag pools + two verb-determined
 * sub-volumes), the **lazy in-session reconcile** (basal drain, coupled
 * recovery, digestion absorption, toxin clearance), and the
 * **cascade-to-conditions** (a floored biological reserve instantiates
 * its `floorEffect`-named condition and clears it on recovery). It owns
 * the `ingest` seam that makes intake real.
 *
 * **Composition.** Composes on a `Creature`-shaped host: OUTER of
 * `Vitals` / `Reserved` / `Posed` (it drives all three) and INNER of
 * `LoadBearing` (the encumbrance gauge keeps reading the reserve
 * surface metabolism populates). It overrides `getReserve` /
 * `getReserves` to reconcile-on-read, so every reserve read — the
 * cockpit poll, the condition cascade, even `LoadBearing`'s `endurance`
 * read — sees a freshly-reconciled value. The reconcile is a cheap
 * no-op when too little game-time has elapsed (or no world clock runs).
 *
 * **What this is NOT.** Not a connection-policy actor — it only *reads*
 * presence (linkdead → freeze the clock); logout state rides the
 * existing Avatar save/restore. Not a general condition scheduler — it
 * drives only its own cascade + (Wave 2) toxicity conditions. Not an
 * Api — the clock now-source is the existing `WorldClockApi.getNow()`
 * and the tag-router is a private method (one caller).
 *
 * Operational reference (graduated at sweep):
 * `docs/subsystems/metabolism.md`.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { Quantity } from "../quantity";
import type { Reserved } from "../reserve";
import { Reserve } from "../reserve";
import type { Vitals } from "../vitals/Vitals";
import type { Organism } from "../species/Organism";
import type { Posed } from "../character/Posed";
import type { Tangible } from "../material/Tangible";
import type { AfflictionRecord } from "../vitals/Condition";
import type Condition from "../vitals/Condition";
import type Material from "../material/Material";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { WorldClockApi } from "../../api/worldclock";
import { TemplatePaths, TemplatePathPrefixes } from "../paths";

/* ─────────────────────────── toxin model (types) ─────────────────────────── */
//
// The toxin-burden system's shapes live here on the owning mixin module
// (not a standalone file): `Toxin` is not an instantiable class, just the
// type vocabulary + the Widmark helper. Which toxins exist and how they
// behave is authored CONTENT — a toxin's per-body rate params live on its
// `Condition` seed's `toxinBehavior` block; a food declares only the
// per-consumable dose `amount`.

/** A per-consumable toxin dose authored on `Material.toxicity`. */
export interface ToxinTag {
  /** Toxin type — also the key of its `Condition` (e.g. `'alcohol'`). */
  type: string;
  /** Dose per serving (mg for solids / derived for liquids). */
  amount: number;
}

/** One severity rung of a toxin's banded condition. */
export interface ToxinBand {
  /** Burden (or BAC, for alcohol) at/above which this rung applies. */
  threshold: number;
  /** Severity index for the rung (ascending). */
  severity: number;
}

/**
 * Per-body rate params for a toxin — authored on its `Condition` seed
 * (`Condition.toxinBehavior`), NOT in a code table and NOT on the food.
 */
export interface ToxinBehavior {
  /** Joins to the food's `ToxinTag.type` (v1 keys condition === type). */
  toxinType: string;
  /** Pool → burden drain rate (dose-units per game-minute). */
  absorptionRate: number;
  /** Burden clearance rate (burden-units per game-minute; zero-order). */
  clearanceRate: number;
  /** `dose × potency / bodyMass` accumulation multiplier. */
  potency: number;
  /** Severity ladder the condition reads live off the burden / BAC. */
  bands: ToxinBand[];
  /**
   * Store-raw exception (alcohol): accumulate the absorbed dose into the
   * burden as-is (ethanol grams), with no `potency` / `bodyMass` factor —
   * the body normalization happens at the `getBAC()` read (Widmark).
   * Implies the condition's severity bands are read against the derived
   * **BAC** (`g/dL`), not the raw burden. Default `false`.
   */
  storeRaw?: boolean;
}

/**
 * Widmark `r` factor by biological sex (volume-of-distribution ratio).
 * Read by `getBAC()` off `SexedMixin.getSex()`; a neutral default
 * backstops unset / other values.
 */
const WIDMARK_R_BY_SEX: Record<string, number> = {
  male: 0.68,
  female: 0.55,
};

/** Neutral Widmark factor when sex is unset or unrecognized. */
const WIDMARK_R_DEFAULT = 0.6;

/** Resolve the Widmark `r` for a (possibly null) sex string. */
function widmarkR(sex: string | null): number {
  if (sex && sex in WIDMARK_R_BY_SEX) return WIDMARK_R_BY_SEX[sex]!;
  return WIDMARK_R_DEFAULT;
}

/**
 * The inner-mixin surface a Metabolic body composes over. The
 * call-security proxy means a mixin extending a generic base can't see
 * its base members through `this` at compile time; methods cast `this`
 * to this intersection for the inner reads/writes (the
 * `LoadBearing`/`Vitals` cast idiom). Proxy dispatch routes each call
 * to the right (un-overridden) inner implementation at runtime.
 */
type MetabolicHost = Stuff &
  Reserved &
  Vitals &
  Organism &
  Posed &
  Tangible;

/**
 * Per-nutrient-tag routing — the static dispatch the digestion buffer
 * fans intake through. Each entry says which reserve the tag refills,
 * how fast its pool absorbs (`%`-points per game-minute), and how much
 * `%`-fill a litre of it yields. The vocabulary is a curated handful,
 * extended in code as tags wire (NOT a handler registry). Wave 2 adds
 * `protein` (the inert healing seam) and the toxin path.
 */
interface NutrientRoute {
  /**
   * The reserve the tag refills, or `null` for a **tracked-but-inert**
   * tag (protein → the tissue-repair seam): its pool still drains over
   * time (so it doesn't accumulate forever), but the absorbed amount
   * goes nowhere — it lights up when vitals healing is driven.
   */
  reserve: "satiation" | "hydration" | null;
  /** Pool drain rate toward the reserve, in `%`-points per game-minute. */
  absorbPerMin: number;
  /** `%`-fill contributed to the pool per litre ingested. */
  yieldPerLitre: number;
}

/**
 * Every metabolic dial as a module const-object (the
 * `LOAD_BEARING_DEFAULTS` precedent). All magnitudes are defensible
 * defaults tuned for "gentle by default" — normal play never thinks
 * about hunger; the structure is the deliverable, the rates are
 * playtest. Times are GAME-seconds / game-minutes.
 */
export const METABOLIC_DEFAULTS = {
  /** Integration slice (game-seconds). One game-minute. */
  STEP_SEC: 60,
  /** Max fixed slices before collapsing the remainder into one step. */
  MAX_STEPS: 720,
  /**
   * Gaps longer than this (game-seconds) are treated as absence (a
   * logged-out body, a paused server) and integrate NOTHING — the
   * fairness override: real-life absence never starves you. ~4
   * game-hours; a continuously-observed session (the cockpit polls
   * reserves) never approaches it, so only logout/relog and
   * long-unobserved bodies trip it.
   */
  MAX_REASONABLE_GAP_SEC: 4 * 3600,

  /** Digestion buffer sub-capacities (litres), verb-determined. */
  SOLID_CAP_LITRES: 1.5,
  LIQUID_CAP_LITRES: 2.0,
  /** Default solid-food portion per discrete edible item (litres). */
  EAT_PORTION_LITRES: 0.4,

  /** Basal drain (`%`-points per game-minute at the reference mass). */
  BASAL_SATIATION_PER_MIN: 0.02,
  BASAL_HYDRATION_PER_MIN: 0.03,
  /** Reference body mass (kg) — basal scales linearly off this. */
  REFERENCE_MASS_KG: 70,

  /** Coupled recovery (endurance `%`-points/game-min, before scaling). */
  MAX_RECOVERY_PER_MIN: 2.0,
  /** Posture base multipliers — lying > sitting > standing. */
  POSTURE_BASE: {
    lie: 1.0,
    sit: 0.6,
    kneel: 0.5,
    stand: 0.2,
    mounted: 0.3,
  } as Record<string, number>,
  /** Fuel cost of recovery: satiation + hydration spent per `%` endurance. */
  RECOVERY_SATIATION_COST: 0.5,
  /** Hydration is the tighter leash — a larger draw than satiation. */
  RECOVERY_HYDRATION_COST: 0.7,
  /**
   * Recovery throttles linearly once hydration falls below this `%`
   * (the tighter leash gates harder as the body dries out).
   */
  RECOVERY_HYDRATION_THROTTLE_PCT: 30,

  /** Cascade hysteresis: spawn at/below floor, clear at/above this `%`. */
  CONDITION_CLEAR_PCT: 15,
  /** Endurance above this `%` clears `collapse` (acute, reversible). */
  COLLAPSE_CLEAR_PCT: 10,

  /** Lethal accrual (game-seconds floored) before the death seam fires. */
  STARVATION_LETHAL_SEC: 24 * 3600,
  /** Dehydration kills faster than starvation. */
  DEHYDRATION_LETHAL_SEC: 8 * 3600,

  /**
   * Fraction of a toxin burden an antidote removes in one shot (the
   * accelerated-clearance crash) — far faster than natural clearance.
   */
  ANTIDOTE_CRASH_FRACTION: 0.9,

  /**
   * Q10 temperature coefficient for basal metabolic rate — the factor
   * by which the rate changes per 10 K of core-temperature shift. ~2.5
   * is the typical biological range (2–3). Consumed by
   * `thermalMultiplier`; the dial lives here (metabolism owns its
   * rates) even though the thermal build lights it up.
   */
  Q10_COEFFICIENT: 2.5,
  /** Reference core temperature (K) at which the Q10 multiplier is 1. */
  Q10_REFERENCE_TEMP_K: 310,
} as const;

/**
 * Floor-effect string → the authored `Condition` Idea templatePath
 * (sourced from the central `TemplatePaths` index — paths are data, not
 * per-file literals).
 */
const CONDITION_PATHS: Record<string, string> = {
  starvation: TemplatePaths.metabolismStarvation,
  dehydration: TemplatePaths.metabolismDehydration,
  collapse: TemplatePaths.metabolismCollapse,
};

/** Lethal accrual per floor-effect (game-seconds); absent = non-lethal. */
const LETHAL_SEC: Record<string, number> = {
  starvation: METABOLIC_DEFAULTS.STARVATION_LETHAL_SEC,
  dehydration: METABOLIC_DEFAULTS.DEHYDRATION_LETHAL_SEC,
};

/** The Wave-1 energy-tag routing table (Wave 2 extends in code). */
const NUTRIENT_ROUTING: Record<string, NutrientRoute> = {
  water: { reserve: "hydration", absorbPerMin: 2.0, yieldPerLitre: 120 },
  carb: { reserve: "satiation", absorbPerMin: 1.0, yieldPerLitre: 60 },
  sugar: { reserve: "satiation", absorbPerMin: 1.5, yieldPerLitre: 60 },
  fat: { reserve: "satiation", absorbPerMin: 0.3, yieldPerLitre: 90 },
  // Protein → the tissue-repair seam: tracked-but-inert. It absorbs out
  // of the pool over time but delivers nowhere until vitals healing is
  // driven (a later wave).
  protein: { reserve: null, absorbPerMin: 0.5, yieldPerLitre: 70 },
};

/** The phase a unit of intake fills — the verb decides, not the Material. */
export type IngestPhase = "solid" | "liquid";

export interface Metabolic {
  /** The digestion-buffer per-tag pools (`%`-fill to deliver per tag). */
  digestionPools: Record<string, number>;
  /** Solid sub-volume (litres) — filled by `eat`. */
  solidVolume: number;
  /** Liquid sub-volume (litres) — filled by `drink` / `sip`. */
  liquidVolume: number;
  /** Sparse per-toxin body burdens (Wave 2; created on first exposure). */
  toxinBurdens: Record<string, number>;
  /** Game-time (seconds) of the last reconcile; 0 = unseeded. */
  metabolicClockStamp: number;
  /** Last-eaten material name — for vomit prose only (no accounting). */
  lastMealLabel: string | null;

  setDigestionPools(value: Record<string, number>): void;
  setSolidVolume(value: number): void;
  setLiquidVolume(value: number): void;
  setToxinBurdens(value: Record<string, number>): void;
  addToxinBurden(type: string, amount: number): void;
  setMetabolicClockStamp(value: number): void;
  setLastMealLabel(value: string | null): void;

  /** Make intake real — route consumed material into the buffer. */
  ingest(material: Material, amount: Quantity<"L">, phase?: IngestPhase): number;
  /** Lazy reconcile — integrate elapsed in-session game-time. */
  reconcileMetabolism(): void;
  /** Derived blood-alcohol concentration (Widmark) from the ethanol burden. */
  getBAC(): Quantity<"g/dL">;
  /** Last-eaten material name — for vomit prose (read surface). */
  getLastMealLabel(): string | null;
  /** Flush the un-absorbed digestion pools (vomit) — absorbed state stays. */
  vomit(): void;
  /** Accelerated clearance — crash a toxin burden (the antidote seam). */
  applyAntidote(toxinType: string): void;
  /**
   * Inject a toxin dose **directly into the body burden**, past digestion
   * — the bloodstream seam a poisoned dart / needle uses (a hazard's
   * `delivery.toxin`, {@link HazardMixin.resolveTraversal}). Unlike
   * `ingest`, there is no digestion pool + absorption curve: the resolved
   * dose lands on the burden immediately. The banded `Condition` then
   * reads live off the burden (reconcile-on-read), exactly as an eaten
   * toxin's does — this is *how the dose arrives*, not a new toxin model.
   */
  introduceToxin(type: string, amount: number): void;
}

function assertFiniteNonNeg(value: number, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${what}: expected a finite number >= 0, got ${String(value)}`);
  }
}

function assertRecordOfNonNeg(value: Record<string, number>, what: string): void {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`${what}: expected a Record<string, number>`);
  }
  for (const [k, v] of Object.entries(value)) {
    assertFiniteNonNeg(v, `${what}['${k}']`);
  }
}

export function MetabolicMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MetabolicMixin extends Base implements Metabolic {
    static _mixinName = "MetabolicMixin";

    static persistentFields = [
      "digestionPools",
      "solidVolume",
      "liquidVolume",
      "toxinBurdens",
      "metabolicClockStamp",
      "lastMealLabel",
    ];

    /** @runtimeState */
    public digestionPools: Record<string, number> = {};
    /** @runtimeState */
    public solidVolume = 0;
    /** @runtimeState */
    public liquidVolume = 0;
    /** @runtimeState */
    public toxinBurdens: Record<string, number> = {};
    /** @runtimeState */
    public metabolicClockStamp = 0;
    /** @runtimeState */
    public lastMealLabel: string | null = null;

    /**
     * Reentry guard for the reconcile. Case-1 (`#`-private would be
     * ideal — a malicious subclass corrupting state) but the
     * call-security proxy makes `#` unreachable from proxy-dispatched
     * methods, so a TypeScript `private` flag per CLAUDE.md hard
     * constraint 2. Transient — not persisted.
     */
    private _reconciling = false;

    // ---------- per-field setters (invariants on the setter) ----------

    public setDigestionPools(value: Record<string, number>): void {
      assertRecordOfNonNeg(value, "MetabolicMixin.setDigestionPools");
      this.digestionPools = { ...value };
    }
    public setSolidVolume(value: number): void {
      assertFiniteNonNeg(value, "MetabolicMixin.setSolidVolume");
      this.solidVolume = value;
    }
    public setLiquidVolume(value: number): void {
      assertFiniteNonNeg(value, "MetabolicMixin.setLiquidVolume");
      this.liquidVolume = value;
    }
    public setToxinBurdens(value: Record<string, number>): void {
      assertRecordOfNonNeg(value, "MetabolicMixin.setToxinBurdens");
      this.toxinBurdens = { ...value };
    }
    /**
     * Add `amount` (>= 0) to the `type` toxin burden directly — the
     * **inhaled / injected** entry point, bypassing the digestion pool that
     * `ingest` fills (the respiration contaminant read is the first caller: a
     * body breathing a contaminated medium takes on the toxin without eating
     * it). Clearance still runs off the toxin's `Condition` seed.
     */
    public addToxinBurden(type: string, amount: number): void {
      if (!Number.isFinite(amount) || amount <= 0) return;
      this.toxinBurdens[type] = (this.toxinBurdens[type] ?? 0) + amount;
    }
    public setMetabolicClockStamp(value: number): void {
      assertFiniteNonNeg(value, "MetabolicMixin.setMetabolicClockStamp");
      this.metabolicClockStamp = value;
    }
    public setLastMealLabel(value: string | null): void {
      if (value !== null && typeof value !== "string") {
        throw new TypeError("MetabolicMixin.setLastMealLabel: expected string | null");
      }
      this.lastMealLabel = value;
    }

    // ---------- reconcile-on-read (the lazy time drive) ----------
    //
    // These override the inner `ReservedMixin` accessors. Because the
    // proxy dispatches `this.getReserve` to this outermost override,
    // they read the inner decomposed-scalar storage (`reserves`)
    // directly via `Reserve.fromStored` rather than recursing — the same
    // reconstruction `ReservedMixin.getReserve` performs.

    public getReserve(key: string): Reserve | undefined {
      if (!this._reconciling) this.reconcileMetabolism();
      const s = (this as unknown as Reserved).reserves[key];
      return s ? Reserve.fromStored(key, s) : undefined;
    }

    public getReserves(): ReadonlyMap<string, Reserve> {
      if (!this._reconciling) this.reconcileMetabolism();
      const map = new Map<string, Reserve>();
      for (const [key, s] of Object.entries(
        (this as unknown as Reserved).reserves,
      )) {
        map.set(key, Reserve.fromStored(key, s));
      }
      return map;
    }

    /**
     * Integrate elapsed in-session game-time since the last reconcile.
     * Sub-steps the gap into fixed slices so the coupled flows (basal
     * drain, digestion absorption, recovery, burden clearance) stay
     * honest over a long mixed-activity gap. Freezes on absence
     * (linkdead now; logout via the far-past guard) — real-life
     * absence never starves you. Cheap no-op when too little time has
     * passed or the world clock isn't running.
     */
    public reconcileMetabolism(): void {
      if (this._reconciling) return;
      const D = METABOLIC_DEFAULTS;

      // Read the in-session game-time. When no world clock is running
      // (pre-boot, or a unit test that hasn't bootstrapped one),
      // `getNow` throws — metabolism is simply idle, no time source.
      const nowS = this.metabolicNowSeconds();
      if (nowS === null) return;

      // First touch: seed the stamp so a fresh body doesn't integrate a
      // giant gap from epoch.
      if (this.metabolicClockStamp === 0) {
        this.metabolicClockStamp = nowS;
        return;
      }

      // Linkdead freeze: the body lingers in-world but its clock is
      // paused — re-stamp so the away-gap never accumulates. Narrow via
      // the predicate so `isLinkdead` is a typed call, not a duck-type.
      const self = this as unknown as Stuff;
      if (MixinApi.isHasInteractive(self) && self.isLinkdead()) {
        this.metabolicClockStamp = nowS;
        return;
      }

      const elapsed = nowS - this.metabolicClockStamp;
      if (elapsed <= 0) {
        this.metabolicClockStamp = nowS;
        return;
      }
      // Far-past guard: a gap this long means absence (logout/relog, a
      // paused server) — drop it, integrate nothing.
      if (elapsed > D.MAX_REASONABLE_GAP_SEC) {
        this.metabolicClockStamp = nowS;
        return;
      }

      this._reconciling = true;
      try {
        let remaining = elapsed;
        let steps = 0;
        while (remaining > 0 && steps < D.MAX_STEPS) {
          const slice = Math.min(D.STEP_SEC, remaining);
          this.integrateSlice(slice);
          remaining -= slice;
          steps++;
        }
        // Beyond the step cap, collapse the remainder into one step —
        // long gaps are steady-state-dominated so the error is bounded
        // and conservative. (Pre-empted by the far-past guard in
        // practice.)
        if (remaining > 0) this.integrateSlice(remaining);
        this.reconcileCascade(elapsed);
        this.metabolicClockStamp = nowS;
      } finally {
        this._reconciling = false;
      }
    }

    /**
     * One integration slice (game-seconds), flows in fixed order:
     * (1) digestion absorption, (2) basal drain, (3) coupled recovery.
     * (Wave 2 inserts toxin clearance at step 4.) Each slice is small
     * enough that the per-flow linear approximation is honest and the
     * coupling is respected slice-to-slice.
     */
    protected integrateSlice(sliceSec: number): void {
      const stepMin = sliceSec / 60;
      this.absorbDigestion(stepMin);
      this.basalDrain(stepMin);
      this.coupledRecovery(stepMin);
      this.clearBurdens(stepMin);
    }

    /**
     * Step 1 — drain each pooled tag toward its reserve at its own
     * rate, and shrink the sub-volumes proportionally so the stomach
     * empties as it digests (reopening the cap). Wave 2 routes toxin
     * pools into burdens here.
     */
    protected absorbDigestion(stepMin: number): void {
      const self = this as unknown as MetabolicHost;
      const pools = this.digestionPools;
      // Stomach-emptying tracks the NUTRIENT pools only (their %-fill
      // magnitudes); toxin doses are trace and unit-incommensurable, so
      // they don't drive the volume heuristic.
      let nutrientBefore = 0;
      let nutrientDrained = 0;
      for (const tag of Object.keys(pools)) {
        const pool = pools[tag] ?? 0;
        if (pool <= 0) {
          delete pools[tag];
          continue;
        }
        const route = NUTRIENT_ROUTING[tag];
        if (route) {
          nutrientBefore += pool;
          const delta = Math.min(pool, route.absorbPerMin * stepMin);
          pools[tag] = pool - delta;
          nutrientDrained += delta;
          // A null-reserve tag (protein) drains but delivers nowhere —
          // the inert tissue-repair seam.
          if (route.reserve !== null) {
            self.adjustReserve(route.reserve, Quantity.of(delta, "%"));
          }
        } else {
          // A toxin tag: drain the un-absorbed dose into the burden at
          // the seed's absorptionRate. Unknown tags (no route, no toxin
          // behavior) are left untouched (no-op).
          const behavior = this.resolveToxinBehavior(tag);
          if (behavior) this.absorbToxin(tag, behavior, stepMin);
        }
        if ((pools[tag] ?? 0) <= 1e-9) delete pools[tag];
      }
      // Empty the stomach in proportion to how much nutrient pool was
      // absorbed (reopening the cap as digestion proceeds).
      if (nutrientBefore > 1e-9 && nutrientDrained > 0) {
        const keep = Math.max(0, 1 - nutrientDrained / nutrientBefore);
        this.solidVolume = this.solidVolume * keep;
        this.liquidVolume = this.liquidVolume * keep;
      }
    }

    /**
     * Drain a toxin's un-absorbed pool dose into its body burden. Alcohol
     * (storeRaw) accumulates the raw absorbed grams; every other toxin
     * accumulates `absorbed × potency / bodyMass` (dose-response). The
     * burden entry is created on first exposure and never widened.
     */
    protected absorbToxin(
      type: string,
      behavior: ToxinBehavior,
      stepMin: number,
    ): void {
      const self = this as unknown as MetabolicHost;
      const pools = this.digestionPools;
      const pool = pools[type] ?? 0;
      if (pool <= 0) return;
      const absorbed = Math.min(pool, behavior.absorptionRate * stepMin);
      if (absorbed <= 0) return;
      pools[type] = pool - absorbed;
      const massKg =
        self.getMass().rawValue() || METABOLIC_DEFAULTS.REFERENCE_MASS_KG;
      const gain = behavior.storeRaw
        ? absorbed
        : (absorbed * behavior.potency) / massKg;
      this.toxinBurdens[type] = (this.toxinBurdens[type] ?? 0) + gain;
    }

    /**
     * Step 4 — burden clearance. Each live burden falls at its seed's
     * (zero-order) `clearanceRate`; the entry is deleted at zero.
     */
    protected clearBurdens(stepMin: number): void {
      for (const type of Object.keys(this.toxinBurdens)) {
        const behavior = this.resolveToxinBehavior(type);
        if (!behavior) continue;
        const next =
          (this.toxinBurdens[type] ?? 0) - behavior.clearanceRate * stepMin;
        if (next <= 0) delete this.toxinBurdens[type];
        else this.toxinBurdens[type] = next;
      }
    }

    /** Resolve a toxin's authored rate params off its `Condition` seed. */
    protected resolveToxinBehavior(type: string): ToxinBehavior | null {
      const cond = StuffApi.findByTemplatePath<Condition>(
        TemplatePathPrefixes.metabolismCondition + type,
      );
      return cond?.getToxinBehavior() ?? null;
    }

    /**
     * Step 2 — basal metabolic drain on satiation + hydration, scaled
     * by body mass and the (inert v1) thermal-strategy multiplier.
     */
    protected basalDrain(stepMin: number): void {
      const self = this as unknown as MetabolicHost;
      const D = METABOLIC_DEFAULTS;
      const massFactor = self.getMass().rawValue() / D.REFERENCE_MASS_KG || 1;
      const thermal = this.thermalMultiplier();
      const sat = D.BASAL_SATIATION_PER_MIN * stepMin * massFactor * thermal;
      const hyd = D.BASAL_HYDRATION_PER_MIN * stepMin * massFactor * thermal;
      self.adjustReserve("satiation", Quantity.of(-sat, "%"));
      self.adjustReserve("hydration", Quantity.of(-hyd, "%"));
    }

    /**
     * Step 3 — coupled recovery: at rest the body rebuilds `endurance`
     * by spending `satiation` + `hydration` (hydration the tighter
     * leash), rate-limited and scaled by posture × `restQuality` ×
     * spo2-throttle (the last inert in v1). This is the keystone — why
     * recovery lives in metabolism, not encumbrance.
     */
    protected coupledRecovery(stepMin: number): void {
      const self = this as unknown as MetabolicHost;
      const D = METABOLIC_DEFAULTS;
      const base = D.POSTURE_BASE[self.getPosture()] ?? D.POSTURE_BASE.stand!;
      if (base <= 0) return;

      const restQuality = this.currentRestQuality();
      const hydration = this.reserveCurrent("hydration");
      const throttle = Math.max(
        0,
        Math.min(1, hydration / D.RECOVERY_HYDRATION_THROTTLE_PCT),
      );
      const spo2 = this.spo2Throttle();

      let gain =
        D.MAX_RECOVERY_PER_MIN * stepMin * base * restQuality * throttle * spo2;
      if (gain <= 0) return;

      // Don't recover endurance the body can't hold.
      const enduranceRoom = 100 - this.reserveCurrent("endurance");
      gain = Math.min(gain, enduranceRoom);
      if (gain <= 0) return;

      // Fuel-limit the gain to what both tanks can pay for.
      const satiation = this.reserveCurrent("satiation");
      const maxBySat =
        D.RECOVERY_SATIATION_COST > 0
          ? satiation / D.RECOVERY_SATIATION_COST
          : Infinity;
      const maxByHyd =
        D.RECOVERY_HYDRATION_COST > 0
          ? hydration / D.RECOVERY_HYDRATION_COST
          : Infinity;
      gain = Math.min(gain, maxBySat, maxByHyd);
      if (gain <= 0) return;

      self.adjustReserve("endurance", Quantity.of(gain, "%"));
      self.adjustReserve(
        "satiation",
        Quantity.of(-gain * D.RECOVERY_SATIATION_COST, "%"),
      );
      self.adjustReserve(
        "hydration",
        Quantity.of(-gain * D.RECOVERY_HYDRATION_COST, "%"),
      );
    }

    /**
     * The cascade — metabolism is the first condition-driver. After the
     * sub-stepped integration, ensure each floored biological reserve's
     * `floorEffect`-named condition exists, clear it on recovery
     * (hysteresis), and progress the lethal ones toward the death seam.
     */
    protected reconcileCascade(elapsedSec: number): void {
      const self = this as unknown as MetabolicHost;
      const D = METABOLIC_DEFAULTS;
      for (const [key, stored] of Object.entries(
        (this as unknown as Reserved).reserves,
      )) {
        if (stored.theme !== "biological") continue;
        const effect = stored.floorEffect;
        if (!effect) continue;
        const path = CONDITION_PATHS[effect];
        if (!path) continue;
        void key;
        const current = stored.currentValue;
        const existing = this.findAffliction(path);

        if (current <= 0) {
          let record = existing;
          if (!record) {
            record = {
              kind: "affliction",
              templatePath: path,
              stage: 0,
              elapsed: 0,
            };
            self.afflict(record);
          }
          // Accrue dwell-time; progress the lethal ones to the death seam.
          record.elapsed += elapsedSec;
          const lethal = LETHAL_SEC[effect];
          if (lethal !== undefined && record.elapsed >= lethal) {
            this.applyDeath(effect);
            return;
          }
        } else {
          const clearAt =
            effect === "collapse" ? D.COLLAPSE_CLEAR_PCT : D.CONDITION_CLEAR_PCT;
          if (existing && current >= clearAt) {
            self.relieve(existing);
          }
        }
      }
      this.reconcileToxinConditions();
    }

    /**
     * For each live toxin burden, ensure its **one banded condition**
     * exists and recompute its severity live — from the derived BAC for
     * alcohol (storeRaw), or the raw burden otherwise — against the
     * seed-authored `bands`. Cleared when the level falls below the
     * lowest band (no per-band spawn/clear churn; one condition per
     * toxin, severity is a live read on `stage`).
     */
    protected reconcileToxinConditions(): void {
      const self = this as unknown as MetabolicHost;
      for (const type of Object.keys(this.toxinBurdens)) {
        const behavior = this.resolveToxinBehavior(type);
        if (!behavior || behavior.bands.length === 0) continue;
        const path = TemplatePathPrefixes.metabolismCondition + type;
        const level = behavior.storeRaw
          ? this.getBAC().rawValue()
          : (this.toxinBurdens[type] ?? 0);
        const lowest = Math.min(...behavior.bands.map((b) => b.threshold));
        const existing = this.findAffliction(path);

        if (level >= lowest) {
          const severity = behavior.bands.reduce(
            (acc, b) => (level >= b.threshold ? Math.max(acc, b.severity) : acc),
            0,
          );
          if (existing) existing.stage = severity;
          else
            self.afflict({
              kind: "affliction",
              templatePath: path,
              stage: severity,
              elapsed: 0,
            });
          // Involuntary vomit: reaching a toxin's top (acute) band while
          // un-absorbed dose remains dumps the pools — the body purges
          // what it can, capping further absorption. The purge mechanic,
          // fired by the reconcile (no verb, no validators) so it works
          // on an incapacitated body.
          const topSeverity = Math.max(...behavior.bands.map((b) => b.severity));
          if (
            severity >= topSeverity &&
            (this.digestionPools[type] ?? 0) > 0
          ) {
            this.vomit();
          }
        } else if (existing) {
          self.relieve(existing);
        }
      }
      // Clear any toxin condition whose burden has fully cleared (the
      // key was deleted, so the loop above never saw it). Gated on the
      // condition having a `toxinBehavior` seed so the biological
      // cascade conditions (starvation / dehydration / collapse) are
      // never touched here.
      for (const cond of [...self.getConditions()]) {
        if (cond.kind !== "affliction") continue;
        if (!cond.templatePath.startsWith(TemplatePathPrefixes.metabolismCondition)) continue;
        const type = cond.templatePath.slice(TemplatePathPrefixes.metabolismCondition.length);
        if (type in this.toxinBurdens) continue;
        if (this.resolveToxinBehavior(type)) self.relieve(cond);
      }
    }

    /** Flip the death seam: cause-of-death + lifecycle, once. */
    protected applyDeath(cause: string): void {
      const self = this as unknown as MetabolicHost;
      if (self.getLifecycleState() === "dead") return;
      self.setCauseOfDeath(cause);
      self.setLifecycleState("dead");
    }

    protected findAffliction(path: string): AfflictionRecord | null {
      const self = this as unknown as MetabolicHost;
      for (const c of self.getConditions()) {
        if (c.kind === "affliction" && c.templatePath === path) return c;
      }
      return null;
    }

    // ---------- ingestion (the digestion buffer) ----------

    /**
     * Make `ingest` real: route the consumed material into the
     * digestion buffer. Picks the sub-volume by `phase` (the verb
     * decides — `eat` solid, `drink`/`sip` liquid), caps intake at the
     * remaining sub-capacity (the bulk partial-transfer shape — refuse
     * the excess), and fans the material's nutrient tags into per-tag
     * pools scaled by the accepted volume.
     *
     * Returns the litres actually accepted, so a caller can hold to
     * `result.applied`-style semantics (the `eat` verb consumes a
     * discrete item only on full acceptance).
     */
    public ingest(
      material: Material,
      amount: Quantity<"L">,
      phase: IngestPhase = "liquid",
    ): number {
      // Reconcile first so the cap reflects current drained volume.
      this.reconcileMetabolism();
      const D = METABOLIC_DEFAULTS;
      const requested = amount.rawValue();
      if (requested <= 0) return 0;

      const cap = phase === "solid" ? D.SOLID_CAP_LITRES : D.LIQUID_CAP_LITRES;
      const current = phase === "solid" ? this.solidVolume : this.liquidVolume;
      const room = Math.max(0, cap - current);
      const accepted = Math.min(requested, room);
      if (accepted <= 0) return 0; // too full — refuse the excess

      if (phase === "solid") this.solidVolume = current + accepted;
      else this.liquidVolume = current + accepted;

      this.routeIntake(material, accepted);
      this.lastMealLabel = material.getName();
      return accepted;
    }

    /**
     * Fan the accepted intake through the per-tag router into the
     * digestion pools. Wave 1 routes the energy tags; Wave 2 extends
     * `routeTag` to the full macro set + toxins. A static switch over
     * the curated vocabulary, NOT a registry — unknown tags are a
     * no-op so authoring a novel tag never crashes intake.
     */
    protected routeIntake(material: Material, litres: number): void {
      const pools = this.digestionPools;
      // Nutrient tags scale by accepted volume.
      for (const tag of material.getNutrients()) {
        const route = this.routeTag(tag);
        if (!route) continue;
        pools[tag] = (pools[tag] ?? 0) + route.yieldPerLitre * litres;
      }
      // Toxin tags add their per-serving dose to the pool (each ingest
      // is one serving). The dose absorbs into the burden over time — so
      // the un-absorbed dose is what `vomit` can still dump.
      for (const tox of material.getToxicity()) {
        if (tox.amount <= 0) continue;
        pools[tox.type] = (pools[tox.type] ?? 0) + tox.amount;
      }
    }

    /**
     * The static tag dispatch — one caller (the ingest decomposition),
     * so a private method, not a security-gated Api. Maps a known
     * nutrient tag to its routing; unknown tags return null (no-op).
     */
    protected routeTag(tag: string): NutrientRoute | null {
      return NUTRIENT_ROUTING[tag] ?? null;
    }

    // ---------- alcohol exemplar / toxin treatment ----------

    /**
     * Blood-alcohol concentration via Widmark — the `alcohol` burden
     * stores ethanol mass (grams), normalized at the read by body mass
     * and the sex-derived `r`. `BAC (g/L) = grams / (mass_kg × r)`;
     * converted to `g/dL` (the `'bac'` scale unit). Storing mass keeps
     * the read state-dependent (a lighter / dryer body reads higher).
     */
    public getBAC(): Quantity<"g/dL"> {
      const self = this as unknown as MetabolicHost;
      const grams = this.toxinBurdens["alcohol"] ?? 0;
      const massKg =
        self.getMass().rawValue() || METABOLIC_DEFAULTS.REFERENCE_MASS_KG;
      const r = widmarkR(self.getSex());
      const gPerL = grams / (massKg * r);
      return Quantity.of(gPerL / 10, "g/dL");
    }

    /**
     * Vomit — flush the **un-absorbed** digestion pools (those tags
     * never reach their handlers) and empty both sub-volumes. Leaves
     * absorbed state intact: reserves already filled and `toxinBurdens`
     * already accumulated stay. That asymmetry IS the purge mechanic —
     * inducing it early (pools un-absorbed) saves you; late doesn't.
     * Called by the `vomit` verb and by the involuntary cascade trigger.
     */
    public getLastMealLabel(): string | null {
      return this.lastMealLabel;
    }

    public vomit(): void {
      this.digestionPools = {};
      this.solidVolume = 0;
      this.liquidVolume = 0;
    }

    /**
     * Antidote = accelerated clearance. Crashes a toxin burden in one
     * shot (far faster than natural clearance would), so its banded
     * condition clears on the next reconcile. The minimal consumer of
     * the vitals `ResolutionSpec` treatment seam (no treatment verb is
     * required by this build — the callable seam + crash mechanism is).
     */
    public applyAntidote(toxinType: string): void {
      const cur = this.toxinBurdens[toxinType];
      if (cur === undefined) return;
      const next = cur * (1 - METABOLIC_DEFAULTS.ANTIDOTE_CRASH_FRACTION);
      if (next <= 1e-9) delete this.toxinBurdens[toxinType];
      else this.toxinBurdens[toxinType] = next;
    }

    public introduceToxin(type: string, amount: number): void {
      assertFiniteNonNeg(amount, "MetabolicMixin.introduceToxin");
      if (amount === 0) return;
      // Straight to the burden — the injected route skips digestion. The
      // burden entry is created on first exposure (the `absorbToxin` idiom).
      this.toxinBurdens[type] = (this.toxinBurdens[type] ?? 0) + amount;
    }

    // ---------- inert seams (wired, return identity in v1) ----------

    /**
     * Respiration read — low `spo2` would throttle recovery. v1 reads
     * the sign for the seam's presence but returns 1.0 unconditionally;
     * lights up when respiration drives `spo2`.
     */
    protected spo2Throttle(): number {
      void (this as unknown as MetabolicHost).getVitalSign("spo2");
      return 1.0;
    }

    /**
     * Q10 temperature coefficient on basal metabolic rate. Reads the
     * driven `coreTemperature` (the thermal build's `getVitalSign`
     * override drives it) and scales basal drain by
     * `Q10 ^ ((core − reference) / 10)`. For an endotherm pinned at its
     * setpoint this is ≈ 1 (the core sits at the reference); for an
     * ectotherm whose core floats to the weather, basal drain swings —
     * a cold reptile burns far less fuel. The strategy difference falls
     * out of where the core sits, so no branch is needed here. The dials
     * live in `METABOLIC_DEFAULTS` (metabolism owns its rates).
     */
    protected thermalMultiplier(): number {
      const self = this as unknown as MetabolicHost;
      const D = METABOLIC_DEFAULTS;
      const coreK = self.getVitalSign("coreTemperature").rawValue();
      return Math.pow(
        D.Q10_COEFFICIENT,
        (coreK - D.Q10_REFERENCE_TEMP_K) / 10,
      );
    }

    // ---------- internal reads ----------

    /**
     * In-session game-time (seconds), or `null` when no world clock is
     * present in the world. Metabolism ticks only when a `WorldClock`
     * registry is bootstrapped (indexed by templatePath) — production
     * always has one; a unit test that hasn't set one up reads `null`
     * and stays idle (no `getNow` lazy-create with a wall-clock anchor).
     */
    protected metabolicNowSeconds(): number | null {
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return null;
      }
      return WorldClockApi.getNow().rawValue();
    }

    /** Reserve current, read directly off storage (no reconcile). */
    protected reserveCurrent(key: string): number {
      return (this as unknown as Reserved).reserves[key]?.currentValue ?? 0;
    }

    /**
     * The `restQuality` of the host whose posture slot this body
     * occupies, or 1.0 (the floor / standing with no host). Only an
     * actor that can occupy slots (`Slottable`) has a host; a bare
     * Creature reads the default.
     */
    protected currentRestQuality(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isSlottable(self)) return 1.0;
      const host = self.getOccupiedHost();
      if (host && MixinApi.isPostured(host)) return host.getRestQuality();
      return 1.0;
    }
  };
}
