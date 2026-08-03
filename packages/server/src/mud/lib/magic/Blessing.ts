/**
 * Blessing — the blessed / uncursed / cursed axis, as an ordinal band.
 *
 * ## What BUC actually is here
 *
 * Not a hidden alignment tag, and not a second stat. **BUC is a potency
 * level on the item's own effect axis** (requirements D11) — the same
 * quantity the item was already graded on, moved one notch up or down.
 * A cursed wand of firebolt is a *weaker* wand of firebolt; a blessed
 * one is a stronger one. That is why it lives in `lib/magic/`: our own
 * reform defines it in terms of an **effect axis**, and an effect axis
 * is magic's. A cursed *mundane* blade, if ever wanted, is a different
 * mechanic (a curse condition on an item), not this.
 *
 * Modelled as a direct copy of {@link Grade}: an ascending band tuple, a
 * private ordinal, `of()` / `isBand()`, persisted as the band word. Not
 * a coincidence — quality and blessing are the same *shape* of fact (an
 * ordinal verdict, never a slider), and reusing the shape means the two
 * compose without anyone having to think about it.
 *
 * ## The two things it is for
 *
 * **Hidden until identified.** BUC is the paradigm hidden-state axis, so
 * it is also the paradigm leak risk: it must not escape through merge
 * behaviour, through an affordance list, or through anything else nobody
 * thought of as a channel. Wave 5's `globIdentityFields` uses the
 * **bucket**, never the true band, for exactly this reason.
 *
 * **Cursed sticks.** A cursed item will not come off — and for a charged
 * item, D11 sharpens that: not merely *the slot will not release* but
 * **stuck on you and discharging into you.**
 *
 * `scale` and `pick` are statics here rather than a third module: they
 * are how a potency level becomes a magnitude, which is this object's
 * whole job.
 */

/**
 * The three states, ascending. Index === ordinal. Deliberately three and
 * not five: this is a *displacement* from the ordinary, and an ordinary
 * item is the overwhelming default.
 */
export const BLESSING_BANDS = ['cursed', 'uncursed', 'blessed'] as const;

/** A BUC band word — one of {@link BLESSING_BANDS}. */
export type BlessingBand = (typeof BLESSING_BANDS)[number];

/**
 * What a viewer who has not identified an item knows about its BUC.
 * `unknown` is the honest answer, and it is what stack identity keys on
 * — two unknown items merge regardless of their true state, so merge
 * behaviour leaks nothing.
 */
export type BlessingBucket = 'unknown' | BlessingBand;

export class Blessing {
  /** The band vocabulary, ascending — re-exported for callers. */
  public static readonly BANDS: readonly BlessingBand[] = BLESSING_BANDS;

  /** 0..2; index into {@link BLESSING_BANDS}. */
  private readonly _ordinal: number;

  private constructor(ordinal: number) {
    this._ordinal = ordinal;
  }

  /** Narrowing predicate for a string against the band vocabulary. */
  public static isBand(s: string): s is BlessingBand {
    return (BLESSING_BANDS as readonly string[]).includes(s);
  }

  /** Construct from a band word. Throws on an unknown band. */
  public static of(band: string): Blessing {
    const idx = (BLESSING_BANDS as readonly string[]).indexOf(band);
    if (idx < 0) {
      throw new RangeError(
        `Blessing.of: unknown band '${band}' (expected one of ${BLESSING_BANDS.join(', ')})`,
      );
    }
    return new Blessing(idx);
  }

  /** The ordinary default — what an item is unless something made it otherwise. */
  public static uncursed(): Blessing {
    return Blessing.of('uncursed');
  }

  /** Construct from an ordinal, clamped into 0..2. */
  public static fromOrdinal(n: number): Blessing {
    const clamped = Math.max(
      0,
      Math.min(BLESSING_BANDS.length - 1, Math.trunc(n)),
    );
    return new Blessing(clamped);
  }

  /** The ordinal (0 = cursed, 1 = uncursed, 2 = blessed). */
  public getOrdinal(): number {
    return this._ordinal;
  }

  /** The band word. */
  public getBand(): BlessingBand {
    return BLESSING_BANDS[this._ordinal]!;
  }

  /** Is this the sticking, discharging kind? */
  public isCursed(): boolean {
    return this._ordinal === 0;
  }

  /** Is this the better-than-ordinary kind? */
  public isBlessed(): boolean {
    return this._ordinal === BLESSING_BANDS.length - 1;
  }

  /** Negative / zero / positive comparator by ordinal. */
  public compareTo(other: Blessing): number {
    return this._ordinal - other._ordinal;
  }

  /** Ordinal equality. */
  public equals(other: Blessing): boolean {
    return this._ordinal === other._ordinal;
  }

  /** The legible headline word (e.g. `'blessed'`). */
  public renderBandWord(): string {
    return this.getBand();
  }

  /**
   * **`scale`** — a potency level as a position on a continuous range.
   * `cursed` sits at `lo`, `blessed` at `hi`, `uncursed` in the middle.
   *
   * The engine owns this ordering so content authors cannot get it
   * backwards: an author supplies the two ends of a range and the band
   * picks the point, which makes "cursed is worse" a property of the
   * substrate rather than a convention every author has to remember.
   */
  public static scale(blessing: Blessing, lo: number, hi: number): number {
    const span = BLESSING_BANDS.length - 1;
    const t = span > 0 ? blessing.getOrdinal() / span : 0;
    return lo + (hi - lo) * t;
  }

  /**
   * **`pick`** — a potency level as a choice from an ordered list. The
   * discrete twin of {@link scale}, for outcomes that do not interpolate
   * (which condition to inflict, which prose to use).
   *
   * A list shorter than the band count clamps rather than throwing: an
   * author supplying two options gets a sensible answer for all three
   * bands, which is more useful than a crash.
   */
  public static pick<T>(blessing: Blessing, steps: readonly T[]): T | null {
    if (steps.length === 0) return null;
    const span = BLESSING_BANDS.length - 1;
    const t = span > 0 ? blessing.getOrdinal() / span : 0;
    const idx = Math.min(steps.length - 1, Math.round(t * (steps.length - 1)));
    return steps[idx]!;
  }
}
