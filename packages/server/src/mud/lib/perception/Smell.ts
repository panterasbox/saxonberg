/**
 * Smell — immutable value object: the olfactory signal at a place, per word,
 * in odor units.
 *
 * An odor unit (OU, the EN 13725 unit) is a source's strength as a multiple
 * of its aroma word's detection threshold: 1 OU is just detectable by an
 * ordinary nose. `notes` carries one entry per word, strongest first, so the
 * dominant smell is the one furthest past its own threshold, whatever the
 * mass behind it. `sources` says which thing gave what from how many hops
 * away; only a nose decides what a reader is told of them. {@link Scent} is
 * what a nose made of one, kept apart because a `Smell`'s OU is physics and a
 * `Scent`'s has been through a species, adaptation and training.
 *
 * Same shape as `Light`: factory-constructed, immutable, runtime-only.
 */

import { Quantity } from '../quantity';

/** One aroma (a path) in a signal and how far past its threshold it stands. */
export interface SmellNote {
  readonly aroma: string;
  readonly ou: number;
}

/** One thing's contribution of one aroma (a path), and how many hops it came. */
export interface SmellSourceRef {
  readonly stuffId: string;
  readonly aroma: string;
  readonly ou: number;
  readonly hops: number;
  /** Something the giver holds rather than the giver's own body and clothes. */
  readonly carried?: boolean;
  /** The discipline of whoever made it, when it was made. */
  readonly maker?: string;
}

export class Smell {
  /** The zero-smell singleton. */
  public static readonly ZERO: Smell = new Smell([], []);

  /** Build from contributions; notes are summed per aroma, strongest first. */
  public static of(sources: readonly SmellSourceRef[]): Smell {
    const kept = sources.filter((s) => s.ou > 0);
    if (kept.length === 0) return Smell.ZERO;
    const totals = new Map<string, number>();
    for (const s of kept) totals.set(s.aroma, (totals.get(s.aroma) ?? 0) + s.ou);
    const notes = [...totals.entries()]
      .map(([aroma, ou]) => ({ aroma, ou }))
      .sort((a, b) => b.ou - a.ou);
    return new Smell(notes, kept);
  }

  public readonly notes: readonly SmellNote[];
  public readonly sources: readonly SmellSourceRef[];

  protected constructor(
    notes: readonly SmellNote[],
    sources: readonly SmellSourceRef[],
  ) {
    this.notes = notes;
    this.sources = sources;
  }

  /** The strongest note's strength; the figure an instrument leads with. */
  public get strength(): Quantity<'OU'> {
    return Quantity.of(this.notes[0]?.ou ?? 0, 'OU');
  }

  /** The aroma (a path) furthest past its threshold, or `''`. */
  public get dominantAroma(): string {
    return this.notes[0]?.aroma ?? '';
  }

  public isEmpty(): boolean {
    return this.notes.length === 0;
  }

  /** Both signals at one place. */
  public add(other: Smell): Smell {
    if (other.isEmpty()) return this;
    if (this.isEmpty()) return other;
    return Smell.of([...this.sources, ...other.sources]);
  }

  /** Everything scaled by a 0..1 factor; a hop further when `hops` is given. */
  public attenuate(factor: number, hops: number = 0): Smell {
    if (!Number.isFinite(factor) || factor <= 0) return Smell.ZERO;
    if (factor >= 1 && hops === 0) return this;
    return Smell.of(
      this.sources.map((s) => ({
        ...s,
        ou: s.ou * Math.min(1, factor),
        hops: s.hops + hops,
      })),
    );
  }

  public toJSON(): {
    notes: SmellNote[];
    sources: SmellSourceRef[];
  } {
    return {
      notes: this.notes.map((n) => ({ ...n })),
      sources: this.sources.map((s) => ({ ...s })),
    };
  }
}

/**
 * The intensity words, by multiple of the detection threshold.
 *
 * WARNING: **The steps are LOGARITHMIC.** Odor detection thresholds are
 * measured in parts per *billion* while the compounds a drink carries are
 * measured in parts per *million*, so real concentrations sit three to four
 * orders of magnitude above threshold; on a linear 1/3/10 ladder every whisky
 * reads "strongly of smoke". Human intensity perception really is compressive
 * (Stevens' law, with an exponent well under 1 for odor), so a log ladder is
 * the honest shape. The case that set the top two steps: a peated malt vatted
 * with grain spirit must read fainter than the malt alone.
 */
const INTENSITIES: readonly { readonly atMultiple: number; readonly word: string }[] = [
  { atMultiple: 8000, word: 'overpoweringly' },
  { atMultiple: 2000, word: 'strongly' },
  { atMultiple: 300, word: 'clearly' },
  { atMultiple: 30, word: 'faintly' },
  { atMultiple: 1, word: 'barely' },
];

/** One smell as a nose read it. */
export interface ScentNote {
  /** The aroma (a path) in the tree the reader could name. */
  readonly aroma: string;
  /** Its word as it reads in a sentence. */
  readonly name: string;
  /** Strength after the nose: below 1 it would not be here. */
  readonly ou: number;
  /** The nearest this smell came from. */
  readonly hops: number;
  /** The one visible thing carrying it, or `null`: the nose tells you what. */
  readonly sourceName: string | null;
  /** The aroma as authored (a path), before the reader's depth. */
  readonly leaf: string;
}

/**
 * What a nose made of a {@link Smell}: only what this reader detected and could
 * name, strongest first. It carries no sentence and no digit is ever worded
 * from it; `phrases` is intensity words.
 */
export class Scent {
  public static readonly EMPTY: Scent = new Scent([]);

  public readonly notes: readonly ScentNote[];

  public constructor(notes: readonly ScentNote[]) {
    this.notes = notes;
  }

  public isEmpty(): boolean {
    return this.notes.length === 0;
  }

  public get dominant(): ScentNote | null {
    return this.notes[0] ?? null;
  }

  /** `clearly of peat smoke`, one per note. */
  public phrases(): string[] {
    return this.notes.map((n) => `${this.intensityOf(n.ou)} of ${n.name}`);
  }

  private intensityOf(ou: number): string {
    for (const step of INTENSITIES) {
      if (ou >= step.atMultiple) return step.word;
    }
    return 'barely';
  }
}
