/**
 * Band — an immutable qualitative tier of standing, the player-facing
 * representation of an influence scalar.
 *
 * **Stock-agnostic by design.** A band is a band regardless of which stock
 * produced the scalar (consumer / capital / producer), so the capital and
 * producer stocks reuse this vocabulary untouched — the three-stock
 * contract's representation half (register D6: standing is shown as bands,
 * never a grindable number; the exact scalar is reserved for the eventual
 * ballot).
 *
 * Construction goes through `Band.fromScalar` (map a scalar to its tier)
 * or `Band.of` (a named tier); the value is immutable. Thresholds are
 * supplied by the caller (read from AppSettings — `influence.bandThresholds`)
 * so the band cutoffs are a tunable dial, not a code constant; a built-in
 * default ordering is the pre-boot / test fallback.
 */

/** The ordered band vocabulary, lowest to highest. */
export type BandName =
  | 'dormant'
  | 'nascent'
  | 'familiar'
  | 'established'
  | 'pillar';

/** A single tier cutoff: the band a scalar `≥ min` (and `< the next min`) lands in. */
export interface BandThreshold {
  name: BandName;
  min: number;
}

/**
 * The built-in fallback cutoffs (pre-boot / tests). Ascending by `min`.
 * Real cutoffs come from AppSettings; these only guarantee `fromScalar`
 * never throws before settings warm.
 */
export const DEFAULT_BAND_THRESHOLDS: readonly BandThreshold[] = [
  { name: 'dormant', min: 0 },
  { name: 'nascent', min: 1 },
  { name: 'familiar', min: 5 },
  { name: 'established', min: 20 },
  { name: 'pillar', min: 100 },
];

export class Band {
  private constructor(public readonly name: BandName) {}

  /** A band by name. */
  static of(name: BandName): Band {
    return new Band(name);
  }

  /**
   * The band a scalar lands in: the highest tier whose `min` the value
   * meets. Thresholds need not be pre-sorted. With no tier met (or none
   * supplied) the lowest built-in tier (`dormant`) is returned — a scalar
   * is never bandless.
   */
  static fromScalar(
    value: number,
    thresholds: readonly BandThreshold[] = DEFAULT_BAND_THRESHOLDS
  ): Band {
    const sorted = [...thresholds].sort((a, b) => a.min - b.min);
    let chosen: BandName = sorted[0]?.name ?? 'dormant';
    for (const t of sorted) {
      if (value >= t.min) chosen = t.name;
      else break;
    }
    return new Band(chosen);
  }

  toString(): string {
    return this.name;
  }

  equals(other: Band): boolean {
    return this.name === other.name;
  }
}
