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

  /** Whether a value is a recognized band name. */
  public static isBand(value: unknown): value is CompetenceBandName {
    return (
      typeof value === "string" &&
      COMPETENCE_BANDS.includes(value as CompetenceBandName)
    );
  }
}
