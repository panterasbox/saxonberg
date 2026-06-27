/**
 * TraitPosition — the derive-on-read estimator: a pure function from an
 * axis's disposition evidence to a current signed position + lifecycle
 * band. The trait analogue of advancement's `Competence`, intentionally
 * **simpler** (a game-time-decayed weighted accumulator, not a BKT).
 *
 * **Never stored.** Like Competence, this holds no state and writes
 * nothing — character is recomputed from the raw {@link DispositionEntry}
 * ledger on every read. Re-tuning the dials re-derives who someone is
 * without rewriting a row.
 *
 * For one axis:
 *   - **position** = signed Σ of `valence · decay(now − when)`, clamped to
 *     `[-POSITION_LIMIT, +POSITION_LIMIT]` (the regard range, so
 *     compatibility maps cleanly). The sign picks the pole; the magnitude
 *     is how pronounced.
 *   - **mass** = Σ of `|valence| · decay(...)` — the accumulated evidence
 *     weight; drives the {@link TraitBand} lifecycle.
 *
 * **Entrenchment resists drift, emergently** (the resolved A3 decision):
 * because position is the *raw clamped sum*, an entrenched axis whose
 * consistent evidence has pinned it at the rail barely moves under more
 * same-direction evidence, whereas a near-empty (unformed) axis moves the
 * full amount. No explicit inertia term — the clamp is the inertia. (A
 * normalized/bounded-by-construction position with explicit damping is the
 * deferred richer model.)
 *
 * Decay is **game-time** (the renown clock, not participation's real
 * time): disposition is in-world character formed over a lifetime. Each
 * axis is estimated independently this build; cross-axis propagation is
 * not modeled.
 *
 * A static-method value-object (no instances). Dials are passed in
 * (AppSettings-driven via the Logic layer); the defaults serve the
 * unwarmed unit-test path.
 */

import {
  TraitBand,
  type TraitBandName,
  type TraitBandCutoffs,
  DEFAULT_BAND_CUTOFFS,
} from "./TraitBand";

/** The clamp bound on a signed position (matches regard's `-100..+100`). */
export const POSITION_LIMIT = 100;

/**
 * The minimal evidence shape the estimator folds — structurally satisfied
 * by a `DispositionEntry`. Document-free so the estimator stays pure.
 */
export interface DispositionEvidence {
  disposition: string;
  valence: number;
  /** Game-time seconds; older evidence is decayed more. */
  when: number | null;
}

/** The estimator dials (AppSettings-driven; defaults for the test path). */
export interface TraitDials extends TraitBandCutoffs {
  /** Evidence-weight half-life in GAME seconds. */
  halfLifeSeconds: number;
  /** |position| at or above which an axis counts as "defining". */
  pronouncedThreshold: number;
}

/** Fallback dials for the no-AppSettings (unit-test / pre-boot) path. */
export const DEFAULT_TRAIT_DIALS: TraitDials = {
  ...DEFAULT_BAND_CUTOFFS,
  // 180 game-days — disposition forms over a long arc.
  halfLifeSeconds: 180 * 86_400,
  pronouncedThreshold: 25,
};

/** One axis's derived state. `position`/`mass` are internal scalars. */
export interface AxisEstimate {
  disposition: string;
  /** Signed, clamped position toward the positive pole. */
  position: number;
  /** Accumulated decayed evidence mass. */
  mass: number;
  /** The lifecycle band (from `mass`). */
  band: TraitBandName;
}

/** Exponential decay of an evidence weight over a game-time gap. */
function decayFactor(ageSeconds: number, halfLifeSeconds: number): number {
  if (!(halfLifeSeconds > 0) || !Number.isFinite(halfLifeSeconds)) return 1;
  if (ageSeconds <= 0) return 1;
  return Math.pow(2, -ageSeconds / halfLifeSeconds);
}

export class TraitPosition {
  /**
   * Fold one axis's evidence (already filtered to a single axis) into a
   * current estimate. Empty evidence yields the neutral floor.
   */
  public static deriveAxis(
    disposition: string,
    evidence: readonly DispositionEvidence[],
    now: number,
    dials: TraitDials = DEFAULT_TRAIT_DIALS
  ): AxisEstimate {
    let sum = 0;
    let mass = 0;
    for (const e of evidence) {
      const age = now - (e.when ?? now);
      const w = decayFactor(age, dials.halfLifeSeconds);
      sum += e.valence * w;
      mass += Math.abs(e.valence) * w;
    }
    const position = Math.max(-POSITION_LIMIT, Math.min(POSITION_LIMIT, sum));
    return { disposition, position, mass, band: TraitBand.forMass(mass, dials) };
  }

  /**
   * Derive every axis the evidence touches, sorted by axis key. Axes with
   * no evidence are absent — the neutral/unformed floor is implicit.
   */
  public static derive(
    evidence: readonly DispositionEvidence[],
    now: number,
    dials: TraitDials = DEFAULT_TRAIT_DIALS
  ): AxisEstimate[] {
    const byAxis = new Map<string, DispositionEvidence[]>();
    for (const e of evidence) {
      const bucket = byAxis.get(e.disposition) ?? [];
      bucket.push(e);
      byAxis.set(e.disposition, bucket);
    }
    return [...byAxis.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([disposition, rows]) =>
        TraitPosition.deriveAxis(disposition, rows, now, dials)
      );
  }

  /**
   * The defining axes — those an observer would name. An axis qualifies
   * if its |position| meets `pronouncedThreshold` OR its band is at least
   * `defined`. Sorted by descending magnitude (most pronounced first).
   */
  public static pronounced(
    estimates: readonly AxisEstimate[],
    dials: TraitDials = DEFAULT_TRAIT_DIALS
  ): AxisEstimate[] {
    return estimates
      .filter(
        (e) =>
          Math.abs(e.position) >= dials.pronouncedThreshold ||
          TraitBand.atOrAbove(e.band, "defined")
      )
      .sort((a, b) => Math.abs(b.position) - Math.abs(a.position));
  }
}
