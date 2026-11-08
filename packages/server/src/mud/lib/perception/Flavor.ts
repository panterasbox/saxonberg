/**
 * Flavor and Savor — taste, at zero distance.
 *
 * {@link Flavor} is the signal: what is on the tongue, at the strength it is
 * there, and what reaches the nose from the back of the mouth. {@link Savor} is
 * what a mouth made of it: only what this person detected, and how they like
 * it. The two are kept apart for the reason `Smell` and `Scent` are.
 *
 * A taste's strength is its amount as a multiple of that taste's threshold, as
 * a smell's is, but the ladder is its own and much less compressive: taste
 * perception runs close to linear (Stevens exponent near 1), where smell is
 * strongly compressive, so a pinch and a handful are far apart on the tongue.
 */

import type { Scent, Smell } from './Smell';

/** One of the five tastes and how far past its threshold it stands. */
export interface TasteNote {
  readonly type: string;
  readonly ou: number;
}

/** What is in a mouthful, before anybody's tongue. */
export interface Flavor {
  readonly tastes: readonly TasteNote[];
  /** The aromas at zero distance, for the nose at the back of the mouth. */
  readonly aromas: Smell;
}

/** How someone took to a thing: a signed score and its word. No digit renders. */
export interface Liking {
  /** −1 (revolting) to 1 (delicious). */
  readonly score: number;
  readonly word: 'revolting' | 'unpleasant' | 'indifferent' | 'good' | 'delicious';
}

const TASTE_LADDER: readonly { readonly atMultiple: number; readonly word: string }[] = [
  { atMultiple: 100, word: 'overpoweringly' },
  { atMultiple: 30, word: 'strongly' },
  { atMultiple: 10, word: 'clearly' },
  { atMultiple: 3, word: 'faintly' },
  { atMultiple: 1, word: 'barely' },
];

/** What a trained palate can also tell about the making of a thing. */
export interface PalateDetails {
  /** The ingredients a competent palate picks out. */
  readonly parts: readonly string[];
  /** How the making reads to a proficient one, or `null`. */
  readonly gradeBand: string | null;
  /** Game-days in the wood, to a proficient one; `0` when it cannot tell. */
  readonly maturedDays: number;
}

/** What a mouth made of a {@link Flavor}. */
export class Savor {
  public constructor(
    public readonly tastes: readonly TasteNote[],
    public readonly scent: Scent,
    public readonly liking: Liking,
    public readonly details: PalateDetails = { parts: [], gradeBand: null, maturedDays: 0 },
  ) {}

  /** `clearly sweet`, one per taste, strongest first. */
  public tastePhrases(): string[] {
    return this.tastes.map((t) => `${this.intensityOf(t.ou)} ${t.type}`);
  }

  /** The time in the wood as a person says it; never a figure. */
  public ageInWords(): string {
    const days = this.details.maturedDays;
    if (days < 7) return 'a few days';
    if (days < 21) return 'a week or two';
    if (days < 45) return 'a month or so';
    if (days < 100) return 'the better part of a season';
    if (days < 200) return 'a season and more';
    if (days < 400) return 'the better part of a year';
    return 'years';
  }

  private intensityOf(ou: number): string {
    for (const step of TASTE_LADDER) {
      if (ou >= step.atMultiple) return step.word;
    }
    return 'barely';
  }
}
