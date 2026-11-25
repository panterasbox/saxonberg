/**
 * DaylengthBand — a span of the year told by how long the day is
 * (organism-biology S17).
 *
 * ⭐ **Every seasonal window in the game is one of these.** A breeding
 * season, a tree's sap run, a ewe in milk, a hen laying, a coat thickening
 * for winter: each is a fraction of the day that is light, between two
 * bounds, and sometimes only on the way up (spring) or only on the way
 * down (autumn), because the two halves of the year cross the same
 * daylength. Rows author the three keys they always have —
 * `daylightFrom`, `daylightTo`, `rising` — and this is the one place they
 * are evaluated. (`Species.breedsAtDaylight` and `Producing`'s `inBand`
 * were the same sentence written twice.)
 *
 * ⚠ **It wraps.** `from > to` is a window across the solstice (a
 * short-day breeder's `[0.6, 0.4]`), a real shape, not an error.
 *
 * Pure: a value, never a Stuff, and nothing here reads the clock — the
 * caller reads the daylight at the body's place and asks.
 */

/** The authored keys, exactly as rows already write them. */
export interface DaylengthBandSpec {
  daylightFrom: number;
  daylightTo: number;
  /**
   * `true`: only while days are lengthening (spring); `false`: only while
   * they shorten (autumn); absent: either.
   */
  rising?: boolean;
}

/** Which side of a band a daylength outside it lies on. */
export type DaylengthSide = 'before' | 'after';

export class DaylengthBand {
  public readonly from: number;
  public readonly to: number;
  public readonly rising: boolean | undefined;

  constructor(spec: DaylengthBandSpec) {
    this.from = spec.daylightFrom;
    this.to = spec.daylightTo;
    this.rising = spec.rising;
  }

  /** Is `fraction` inside the band's interval (direction aside)? */
  public contains(fraction: number): boolean {
    return this.from <= this.to
      ? fraction >= this.from && fraction <= this.to
      : fraction >= this.from || fraction <= this.to;
  }

  /**
   * Does the observed direction of the day agree with the band's? An
   * unknown direction (`null`) and a band that does not care both agree.
   */
  public agreesWith(rising: boolean | null): boolean {
    return this.rising === undefined || rising === null || rising === this.rising;
  }

  /** ⭐ The one question: inside the band, going the band's way. */
  public holds(fraction: number, rising: boolean | null = null): boolean {
    return this.contains(fraction) && this.agreesWith(rising);
  }

  /**
   * Outside the band, is the season still to come or already gone? Below
   * the opener is *before*; above it is *after* — the side a player
   * cares about (*not yet* vs *over for the year*).
   */
  public sideOf(fraction: number): DaylengthSide {
    return fraction < this.from ? 'before' : 'after';
  }
}
