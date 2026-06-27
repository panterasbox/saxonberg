/**
 * ActSignature — the unit of credit assignment, and the one cross-lane
 * seam of the advancement build.
 *
 * One messy in-world act (a deal, a fight, a synthesis) exercises several
 * Disciplines at once, at different difficulties, with localized outcomes.
 * Rather than infer that decomposition after the fact, the action is
 * *authored* as a composition of Discipline-tagged sub-checks — an
 * authored Q-matrix. The engine already runs those sub-checks to resolve
 * the action; the Transcript records each {@link Subcheck} as its own
 * per-Discipline row.
 *
 * **One signature, two outputs.** The same authored signature that carries
 * the skill-Discipline sub-checks also carries a *disposition-valence*
 * channel (a lie is +Deceitful/−Honest; a generous tip +Generous/−Greedy)
 * — because traits are "competence for dispositions": the identical
 * derive-from-a-behavior-ledger architecture applied to character instead
 * of skill. **Lane 3 (this build) populates and consumes only the
 * `discipline` channel.** The {@link ActSignature.dispositionValence} field
 * is declared-but-unpopulated — lane 1's trait build grafts onto it
 * without reshaping the type. See npc-behavior-slate § *Traits are
 * competence for dispositions*.
 */

/**
 * The world-grounded hardness of a single sub-check. Difficulty is a
 * *measurement*, not a tag — the logistics difficulty IS the route, the
 * appraisal difficulty IS the lot's ambiguity. The estimator reads it to
 * weight the evidence: a trivial success and a formidable failure are both
 * unsurprising, so they barely move the estimate (desirable difficulty
 * enforced by the math, not a rule).
 */
export type Difficulty =
  | "trivial"
  | "easy"
  | "standard"
  | "hard"
  | "formidable";

export const DIFFICULTIES: readonly Difficulty[] = [
  "trivial",
  "easy",
  "standard",
  "hard",
  "formidable",
];

/** The resolved result of a single sub-check. */
export type Outcome = "failure" | "partial" | "success" | "critical";

export const OUTCOMES: readonly Outcome[] = [
  "failure",
  "partial",
  "success",
  "critical",
];

/**
 * One Discipline-tagged component of an act: "at this Discipline, against
 * this difficulty, you got this outcome." `discipline` is the durable
 * Discipline `key` (e.g. `'mixology'`), not its templatePath — so the
 * Catalog can be re-pathed without invalidating recorded evidence.
 */
export interface Subcheck {
  discipline: string;
  difficulty: Difficulty;
  outcome: Outcome;
}

/**
 * One disposition-valenced component of an act — the lane-1 trait channel.
 * **Defined but unused by lane 3.** Present so the signature shape is
 * stable across lanes; the trait build fills it in.
 */
export interface DispositionSubcheck {
  /** The opposed-pair axis key (e.g. `'honesty'`, `'generosity'`). */
  disposition: string;
  /** Signed magnitude toward one pole of the pair. */
  valence: number;
}

/**
 * An authored act decomposed into its component sub-checks. `discipline`
 * is a *list* (one act, several Disciplines at several difficulties);
 * `dispositionValence` is the optional, lane-1-owned trait channel.
 */
export interface ActSignature {
  discipline: Subcheck[];
  dispositionValence?: DispositionSubcheck[];
}
