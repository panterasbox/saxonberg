/**
 * TraitBand — the form→define→entrench lifecycle band a disposition axis
 * sits in, surfaced *instead of* a raw evidence mass.
 *
 * A character starts **unformed** (near-neutral, little evidence); as
 * disposition-valenced acts accumulate an axis becomes **defined** (a
 * pronounced, recognizable trait); a heavy aggregate is **entrenched**
 * ("set in their ways"). The band is a function of the **accumulated
 * evidence mass** (the decayed Σ of |valence|), NOT the signed position —
 * a strongly Generous and a strongly Greedy character are both
 * *entrenched* on `generosity`, just at opposite poles.
 *
 * Entrenchment-resists-drift is emergent, not enforced here: position is a
 * clamped decayed sum (see `TraitPosition`), so an entrenched axis already
 * pinned at the rail barely moves under more same-direction evidence,
 * while an unformed axis moves freely. This band is the readable label for
 * that lifecycle stage.
 *
 * A static-method value-object (no instances) — the band IS its name. The
 * mass cutoffs are passed in (AppSettings-driven via the Logic layer);
 * the defaults here serve only the unwarmed unit-test path.
 */

export type TraitBandName = "unformed" | "defined" | "entrenched";

/** Ascending order — index is the band rank. */
export const TRAIT_BANDS: readonly TraitBandName[] = [
  "unformed",
  "defined",
  "entrenched",
];

/** Mass cutoffs the band reads. Defaults serve the unwarmed test path. */
export interface TraitBandCutoffs {
  /** Mass at or above which an axis is `defined`. */
  definedThreshold: number;
  /** Mass at or above which an axis is `entrenched`. */
  entrenchedThreshold: number;
}

/** Fallback cutoffs for the no-AppSettings (unit-test / pre-boot) path. */
export const DEFAULT_BAND_CUTOFFS: TraitBandCutoffs = {
  definedThreshold: 20,
  entrenchedThreshold: 60,
};

export class TraitBand {
  /** The lowest band — the cold-start / no-evidence floor. */
  public static readonly FLOOR: TraitBandName = "unformed";

  /** Map an accumulated evidence mass to its lifecycle band. */
  public static forMass(
    mass: number,
    cutoffs: TraitBandCutoffs = DEFAULT_BAND_CUTOFFS
  ): TraitBandName {
    if (mass >= cutoffs.entrenchedThreshold) return "entrenched";
    if (mass >= cutoffs.definedThreshold) return "defined";
    return TraitBand.FLOOR;
  }

  /** The ascending rank of a band (0 = unformed). */
  public static rank(band: TraitBandName): number {
    return TRAIT_BANDS.indexOf(band);
  }

  /** Whether `current` is at least as high as `threshold`. */
  public static atOrAbove(
    current: TraitBandName,
    threshold: TraitBandName
  ): boolean {
    return TraitBand.rank(current) >= TraitBand.rank(threshold);
  }

  /** Whether a value is a recognized band name. */
  public static isBand(value: unknown): value is TraitBandName {
    return (
      typeof value === "string" &&
      TRAIT_BANDS.includes(value as TraitBandName)
    );
  }
}
