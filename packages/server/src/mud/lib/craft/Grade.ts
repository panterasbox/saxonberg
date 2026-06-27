/**
 * Grade — the ordinal quality band value-object.
 *
 * Crafting's "quality is a verdict, not a property" spine resolves, at the
 * substrate, into an **ordinal band** — never a 0–100 slider. A `Grade` is
 * one of five ascending bands (*poor → fair → fine → exceptional →
 * masterful*), borrowed almost verbatim from Dwarf Fortress's quality model.
 * It is the **first quality band**: a stocked input (a graded bottle) carries
 * one, and a craft's output derives one from its inputs.
 *
 * The band is the legible headline a renderer turns into a band-word
 * ("a *fine* martini"); the descriptive *why* is composed separately by the
 * consumer (see {@link CraftedMixin}). A `Grade` never renders a number.
 *
 * Plain immutable value-object: an ordinal 0..4 behind a small surface.
 * Persisted (by hosts that carry one) as the band-word string — stable +
 * human-readable in seeds — and reconstructed via {@link Grade.of}.
 */

/**
 * The five quality bands, ascending. Index === ordinal. The vocabulary is
 * fixed (unlike Material's open tag set) — quality is a closed ordinal scale,
 * not a free classification.
 */
export const GRADE_BANDS = [
  'poor',
  'fair',
  'fine',
  'exceptional',
  'masterful',
] as const;

/** A quality band word — one of {@link GRADE_BANDS}. */
export type GradeBand = (typeof GRADE_BANDS)[number];

export class Grade {
  /** The band vocabulary, ascending — re-exported for callers. */
  public static readonly BANDS: readonly GradeBand[] = GRADE_BANDS;

  /** 0..4; index into {@link GRADE_BANDS}. */
  private readonly _ordinal: number;

  private constructor(ordinal: number) {
    this._ordinal = ordinal;
  }

  /** Narrowing predicate for a string against the band vocabulary. */
  public static isBand(s: string): s is GradeBand {
    return (GRADE_BANDS as readonly string[]).includes(s);
  }

  /** Construct from a band word. Throws on an unknown band. */
  public static of(band: string): Grade {
    const idx = (GRADE_BANDS as readonly string[]).indexOf(band);
    if (idx < 0) {
      throw new RangeError(
        `Grade.of: unknown band '${band}' (expected one of ${GRADE_BANDS.join(', ')})`,
      );
    }
    return new Grade(idx);
  }

  /** Construct from an ordinal, clamped into 0..4. */
  public static fromOrdinal(n: number): Grade {
    const clamped = Math.max(0, Math.min(GRADE_BANDS.length - 1, Math.trunc(n)));
    return new Grade(clamped);
  }

  /** The ordinal (0 = poor … 4 = masterful). */
  public getOrdinal(): number {
    return this._ordinal;
  }

  /** The band word. */
  public getBand(): GradeBand {
    return GRADE_BANDS[this._ordinal]!;
  }

  /** Negative / zero / positive comparator by ordinal. */
  public compareTo(other: Grade): number {
    return this._ordinal - other._ordinal;
  }

  /** The lower of two grades. */
  public min(other: Grade): Grade {
    return this._ordinal <= other._ordinal ? this : other;
  }

  /** The higher of two grades. */
  public max(other: Grade): Grade {
    return this._ordinal >= other._ordinal ? this : other;
  }

  /** Ordinal equality. */
  public equals(other: Grade): boolean {
    return this._ordinal === other._ordinal;
  }

  /** The legible headline word (e.g. `'fine'`). */
  public renderBandWord(): string {
    return this.getBand();
  }

  /**
   * Derive an output grade from input grades at a **fixed control level**
   * (the v1 skill seam). The rule is **weakest-link**: a craft is only as
   * good as its poorest input — `min` across the inputs. The `_control`
   * parameter is the deferred skill seam (a master would let the *best* input
   * dominate and reach the material's extremes); v1 ignores it, keeping the
   * signature stable for the advancement layer to light up.
   *
   * With no inputs, falls back to `fair` (a neutral middle), so a craft with
   * no graded matter still yields a verdict.
   */
  public static deriveAtFixedControl(
    inputGrades: readonly Grade[],
    _control?: number,
  ): Grade {
    if (inputGrades.length === 0) return Grade.of('fair');
    return inputGrades.reduce((acc, g) => acc.min(g));
  }
}
