/**
 * Competence — the derive-on-read estimator: a pure function from a
 * Discipline's Transcript evidence to a current competence estimate.
 *
 * **Never stored.** Unlike renown (which materializes a per-scope
 * aggregate), Competence holds no state and writes nothing — it is
 * recomputed from the raw Transcript on every read. Drop nothing, replay
 * the evidence, get the identical estimate. This is the mechanism behind
 * "felt proficiency, no stat readout": the scalar `theta` (P(mastery) in
 * [0, 1], referent = competence *in this Discipline*) exists internally
 * but the **only surface is the band**.
 *
 * A simple per-Discipline two-state BKT, with two difficulty couplings
 * that give the desirable-difficulty property for free:
 *
 *   1. **Difficulty-modulated observation** — harder checks carry higher
 *      `slip` (a master can fail a formidable task) and lower `guess` (a
 *      novice rarely flukes one). So a *trivial success* (high guess → a
 *      success was expected) and a *formidable failure* (high slip → a
 *      failure was expected) are both unsurprising and barely move the
 *      estimate; the surprising, near-edge evidence dominates.
 *   2. **Difficulty-gated learning (ZPD)** — the BKT transit rate is an
 *      inverted-U over difficulty: ~0 for trivial practice (no learning
 *      from rote-easy reps — grinding does nothing), peaking at hard,
 *      easing for formidable (too-hard frustrates). So *how much you
 *      learn* tracks practicing at the edge of your ability.
 *
 * Each Discipline is estimated **independently** this increment; evidence
 * propagation along `requires` / `synergizes` edges is deferred. The BKT
 * parameters are fixed constants here — numeric calibration against real
 * evidence is deferred to a running game.
 */

import type { Difficulty, Outcome } from "./ActSignature";
import { CompetenceBand, type CompetenceBandName } from "./CompetenceBand";

/**
 * The minimal evidence shape the estimator folds — structurally satisfied
 * by a `TranscriptEntry`. Kept Document-free so the estimator stays a pure
 * value-object.
 */
export interface Evidence {
  difficulty: Difficulty;
  outcome: Outcome;
  /** Game-time seconds; evidence is folded in ascending order. */
  when: number | null;
}

/** The internal estimate. `theta` never surfaces to a player view. */
export interface CompetenceEstimate {
  /** P(mastery) in [0, 1] — internal only (the honesty firewall). */
  theta: number;
  /** The surfaced band. */
  band: CompetenceBandName;
}

/** Prior P(L0): the cold-start mastery before any evidence. */
const PRIOR = 0.1;

/**
 * Per-difficulty slip (master-but-fails) and guess (novice-but-succeeds).
 * The easy end has a *high* guess on purpose: almost anyone passes a
 * trivial check, so a trivial success barely discriminates mastery from
 * non-mastery → it is near-uninformative and the estimate hardly moves
 * (the math, not a rule, kills the leveling-mill). The hard end inverts it.
 */
const DIFFICULTY_PARAMS: Record<
  Difficulty,
  { slip: number; guess: number }
> = {
  trivial: { slip: 0.01, guess: 0.85 },
  easy: { slip: 0.03, guess: 0.6 },
  standard: { slip: 0.1, guess: 0.3 },
  hard: { slip: 0.2, guess: 0.12 },
  formidable: { slip: 0.35, guess: 0.04 },
};

/** Per-difficulty learn rate P(T): an inverted-U peaking at the ZPD edge. */
const DIFFICULTY_TRANSIT: Record<Difficulty, number> = {
  trivial: 0.0,
  easy: 0.04,
  standard: 0.1,
  hard: 0.15,
  formidable: 0.08,
};

/** Soft-evidence correctness weight per outcome, in [0, 1]. */
const OUTCOME_CORRECTNESS: Record<Outcome, number> = {
  failure: 0.0,
  partial: 0.4,
  success: 0.8,
  critical: 1.0,
};

/**
 * The estimator. A static-method value-object (no instances, no state) —
 * the estimate IS the function of the evidence.
 */
export class Competence {
  /**
   * Fold a Discipline's evidence (already filtered to one Discipline) into
   * a current estimate. Empty evidence yields the cold-start prior → the
   * floor band.
   */
  public static derive(evidence: readonly Evidence[]): CompetenceEstimate {
    const sorted = [...evidence].sort(
      (a, b) => (a.when ?? 0) - (b.when ?? 0)
    );
    let pL = PRIOR;
    for (const e of sorted) {
      const { slip, guess } = DIFFICULTY_PARAMS[e.difficulty];
      const correctness = OUTCOME_CORRECTNESS[e.outcome];

      // Bayesian observation update — posterior P(mastery | outcome),
      // blended by the outcome's soft correctness weight.
      const normCorrect = pL * (1 - slip) + (1 - pL) * guess;
      const normIncorrect = pL * slip + (1 - pL) * (1 - guess);
      const postCorrect = normCorrect > 0 ? (pL * (1 - slip)) / normCorrect : pL;
      const postIncorrect =
        normIncorrect > 0 ? (pL * slip) / normIncorrect : pL;
      const post =
        correctness * postCorrect + (1 - correctness) * postIncorrect;

      // Difficulty-gated learning (ZPD): you learn from practicing at the
      // edge, not from rote-easy reps.
      const transit = DIFFICULTY_TRANSIT[e.difficulty];
      pL = post + (1 - post) * transit;
    }
    return { theta: pL, band: CompetenceBand.forTheta(pL) };
  }

  /** The band a Discipline's evidence currently warrants — the only surface. */
  public static bandOf(evidence: readonly Evidence[]): CompetenceBandName {
    return Competence.derive(evidence).band;
  }
}
