/**
 * CompetenceBand — the capability-flavored band vocabulary advancement
 * surfaces *instead of* a number.
 *
 * The honesty firewall is "no quantity without a referent." The estimator
 * holds an internal scalar (`theta` = P(mastery) in [0, 1], the referent
 * being competence *in a Discipline*), but the **player surface is bands
 * and revealed performance only** — never "Mixology 47/100." This module
 * owns the band names, their order, the theta→band cutoffs, and the
 * at-or-above comparison the conferral seam uses to decide whether a
 * Discipline's band-gated verbs are unlocked.
 *
 * Distinct from `lib/standing/Band` (influence-flavored: `dormant…pillar`,
 * thresholds from `influence.bandThresholds`). Competence keeps its own
 * vocabulary — the requirements' deliberate divergence from renown.
 *
 * The cutoffs are fixed constants this increment; numeric tuning
 * (calibration against real evidence) is deferred to a running game.
 */

import { DIFFICULTIES, type Difficulty } from "./ActSignature";

export type CompetenceBandName =
  | "untrained"
  | "novice"
  | "competent"
  | "proficient"
  | "expert";

/** Ascending order — index is the band rank. */
export const COMPETENCE_BANDS: readonly CompetenceBandName[] = [
  "untrained",
  "novice",
  "competent",
  "proficient",
  "expert",
];

/**
 * Lower theta bound (inclusive) for each band, ascending. A theta at or
 * above a band's bound but below the next belongs to that band.
 */
const BAND_FLOORS: ReadonlyArray<{ band: CompetenceBandName; floor: number }> =
  [
    { band: "untrained", floor: 0 },
    { band: "novice", floor: 0.2 },
    { band: "competent", floor: 0.45 },
    { band: "proficient", floor: 0.7 },
    { band: "expert", floor: 0.9 },
  ];

/**
 * Band vocabulary + the theta→band mapping and rank comparison. A
 * static-method value-object (no instances) — the band IS its name.
 */
export class CompetenceBand {
  /** The lowest band — the cold-start / no-evidence floor. */
  public static readonly FLOOR: CompetenceBandName = "untrained";

  /** Map an internal theta in [0, 1] to its band. */
  public static forTheta(theta: number): CompetenceBandName {
    let result: CompetenceBandName = CompetenceBand.FLOOR;
    for (const { band, floor } of BAND_FLOORS) {
      if (theta >= floor) result = band;
    }
    return result;
  }

  /** The ascending rank of a band (0 = untrained). */
  public static rank(band: CompetenceBandName): number {
    return COMPETENCE_BANDS.indexOf(band);
  }

  /** Whether `current` is at least as high as `threshold`. */
  public static atOrAbove(
    current: CompetenceBandName,
    threshold: CompetenceBandName
  ): boolean {
    return CompetenceBand.rank(current) >= CompetenceBand.rank(threshold);
  }

  /**
   * `n` bands below `band`, floored at `untrained`. Band arithmetic
   * lives beside the band vocabulary because both are pure.
   *
   * Two consumers, deliberately different in kind: the estimator's
   * **floor** (one band below best-ever — a veteran who loses is rusty,
   * not reset) and the body's **suppression** (a temporary global
   * lowering after death, applied at the read and never written down).
   */
  public static lowered(
    band: CompetenceBandName,
    n: number,
  ): CompetenceBandName {
    if (n <= 0) return band;
    const at = Math.max(0, CompetenceBand.rank(band) - Math.floor(n));
    return COMPETENCE_BANDS[at] ?? CompetenceBand.FLOOR;
  }

  /** One band below `band`, floored at `untrained`. */
  public static oneBelow(band: CompetenceBandName): CompetenceBandName {
    return CompetenceBand.lowered(band, 1);
  }

  /** The higher of two bands. */
  public static higher(
    a: CompetenceBandName,
    b: CompetenceBandName,
  ): CompetenceBandName {
    return CompetenceBand.rank(a) >= CompetenceBand.rank(b) ? a : b;
  }

  /**
   * ⭐ **How hard a contest against `theirs` is, for someone at `mine`.**
   *
   * The band ladder and the difficulty ladder are the same five rungs, so
   * the rank gap maps straight across: an equal opponent is `standard`,
   * each rung they hold above you is one step harder, each rung below one
   * step easier, clamped at the ends. Beating somebody two bands above
   * you is `formidable` and teaches you a great deal; losing to them is
   * unsurprising and (by {@link Competence.derive}'s above-band rule)
   * costs you nothing at all.
   *
   * ⚠ The referent is a **contest**, not a task — which is why it lives
   * here rather than on any one subsystem. A fight uses it; so could a
   * negotiation or a race.
   */
  public static difficultyAgainst(
    mine: CompetenceBandName,
    theirs: CompetenceBandName,
  ): Difficulty {
    const gap = CompetenceBand.rank(theirs) - CompetenceBand.rank(mine);
    const mid = DIFFICULTIES.indexOf("standard");
    const at = Math.max(0, Math.min(DIFFICULTIES.length - 1, mid + gap));
    return DIFFICULTIES[at] ?? "standard";
  }

  /**
   * ⭐ The band a check of this difficulty is *expected* to be met by —
   * the identity map between the two five-rung ladders.
   *
   * `trivial↔untrained … formidable↔expert`. Read by the estimator's
   * above-band rule: a failure at a difficulty above your band is not
   * evidence about you, because nobody at your band was expected to pass
   * it.
   */
  public static bandFor(difficulty: Difficulty): CompetenceBandName {
    const at = DIFFICULTIES.indexOf(difficulty);
    return COMPETENCE_BANDS[at < 0 ? 0 : at] ?? CompetenceBand.FLOOR;
  }

  /** Whether a value is a recognized band name. */
  public static isBand(value: unknown): value is CompetenceBandName {
    return (
      typeof value === "string" &&
      COMPETENCE_BANDS.includes(value as CompetenceBandName)
    );
  }
}
