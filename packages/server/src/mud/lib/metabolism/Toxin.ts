/**
 * Toxin — the **types** for the metabolism toxin-burden system, plus the
 * Widmark factor map. No data const: which toxins exist and how they
 * behave is authored CONTENT (a toxin's per-body rate params live on its
 * `Condition` seed's `toxinBehavior` block; a food declares only the
 * per-consumable dose `amount`). This module is shapes only.
 *
 * The model (see `docs/subsystems/metabolism.md`):
 *   - A food's `Material.toxicity` is a list of `ToxinTag` — `{type,
 *     amount}` — the per-serving dose, mirroring the amount-vs-rate split
 *     the nutrients use.
 *   - On ingest a toxin tag enters the digestion pool like any tag; the
 *     reconcile's absorption step drains the pool into a sparse per-toxin
 *     `toxinBurden` at the seed's `absorptionRate`; clearance removes
 *     burden at `clearanceRate`. A burden is NOT a `Reserve` — it
 *     accumulates unbounded above a threshold (dose-response), where a
 *     Reserve clamps and fires one floor event.
 *   - Each toxin maps its burden to ONE banded `Condition` whose severity
 *     reads the burden (or, for alcohol, the derived BAC) live.
 */

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
export const WIDMARK_R_BY_SEX: Record<string, number> = {
  male: 0.68,
  female: 0.55,
};

/** Neutral Widmark factor when sex is unset or unrecognized. */
export const WIDMARK_R_DEFAULT = 0.6;

/** Resolve the Widmark `r` for a (possibly null) sex string. */
export function widmarkR(sex: string | null): number {
  if (sex && sex in WIDMARK_R_BY_SEX) return WIDMARK_R_BY_SEX[sex]!;
  return WIDMARK_R_DEFAULT;
}
