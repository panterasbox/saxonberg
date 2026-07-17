/**
 * Sharpness — the single "how sharp is this fighter right now" scalar
 * (value-object) that modulates the poker layer: poise recovery and the
 * read-fog both scale by it.
 *
 * It is shaped `f(competence) * g(composure)`:
 *
 *   - `f(competence)` — the live input today. A more skilled fighter reads
 *     the exchange better (thinner fog, harder to bait) and recovers poise
 *     better. Mapped from the competence *band* (never a raw number — the
 *     bands-not-numbers doctrine), from `min` at `untrained` to `max` at
 *     `expert`.
 *   - `g(composure)` — the deferred `traits-stress` seam. A bidirectional
 *     emotional axis (stress ↔ inspiration) that later multiplies sharpness
 *     up or down. It defaults to `1` (absent), so it is **present but
 *     inert** this build — the whole point is that `traits-stress` can fill
 *     it WITHOUT touching the exchange engine.
 *
 * Pure and tunable: the caller (the session, from `combat.*` AppSettings)
 * supplies the `min`/`max` curve; sane literal defaults keep the class
 * unit-testable without booting settings (the `Poise`/`response.*`
 * seeded-literal-fallback precedent).
 */

import {
  CompetenceBand,
  COMPETENCE_BANDS,
  type CompetenceBandName,
} from "../advancement/CompetenceBand";

export interface SharpnessConfig {
  /** Sharpness at `untrained` (band rank 0). */
  min: number;
  /** Sharpness at `expert` (the top band rank). */
  max: number;
}

/**
 * Defaults: an untrained fighter fights foggy and recovers poorly (0.35);
 * an expert sees clearly and recovers fully (1.0). The session overrides
 * from `combat.sharpness.*` AppSettings.
 */
export const DEFAULT_SHARPNESS_CONFIG: SharpnessConfig = {
  min: 0.35,
  max: 1,
};

export interface SharpnessInputs {
  /** The fighter's competence band in this fight's discipline. */
  competenceBand: CompetenceBandName;
  /**
   * The composure multiplier in `(0, 1+]` — the `traits-stress` seam.
   * Absent/`undefined` today, so `g ≡ 1`. When it lands it multiplies the
   * competence base up (inspired) or down (stressed).
   */
  composure?: number;
}

export class Sharpness {
  private constructor() {}

  /**
   * Resolve the sharpness scalar in `(0, 1]`. `f(competence)` interpolates
   * `min`→`max` across the band ranks; `g(composure)` multiplies (≡ 1 when
   * absent).
   */
  static resolve(
    inputs: SharpnessInputs,
    config: SharpnessConfig = DEFAULT_SHARPNESS_CONFIG,
  ): number {
    const rank = CompetenceBand.rank(inputs.competenceBand);
    const span = COMPETENCE_BANDS.length - 1;
    const t = span > 0 ? rank / span : 0;
    const base = config.min + (config.max - config.min) * t;
    const composure = inputs.composure ?? 1;
    return clamp01(base * composure);
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
