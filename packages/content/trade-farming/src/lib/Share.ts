/**
 * Share — **a fraction of a tract, in the words a farmer says it**
 * (tracts build D29): *a third · two-thirds · half · a quarter ·
 * three-quarters · a fifth · all of it · the rest · 40% · 0.4*.
 *
 * A value object, read once from what `mark … as <share>` was given. No
 * share at all means *the rest* — whatever of the tract is still unmarked.
 * ⭐ Constructed, never a static parser: `lib/` statics are ratcheted, and
 * the fraction IS this object's one concept.
 */

const WORD_FRACTIONS: Readonly<Record<string, number>> = {
  'all': 1,
  'whole': 1,
  'half': 1 / 2,
  'third': 1 / 3,
  'quarter': 1 / 4,
  'fourth': 1 / 4,
  'fifth': 1 / 5,
  'sixth': 1 / 6,
  'eighth': 1 / 8,
  'tenth': 1 / 10,
};

const COUNT_WORDS: Readonly<Record<string, number>> = {
  'a': 1,
  'an': 1,
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'seven': 7,
  'nine': 9,
};

export class Share {
  private readonly value: number | null;
  private readonly rest: boolean;

  /** `text` as typed after `as`; empty or absent is *the rest*. */
  constructor(text: string | null | undefined) {
    const words = (text ?? '')
      .toLowerCase()
      .replace(/\bof (it|the tract|the ground|this)\b/g, '')
      .replace(/[-]/g, ' ')
      .trim();
    if (words === '' || /^(the )?rest$/.test(words) || words === 'what is left') {
      this.value = null;
      this.rest = true;
      return;
    }
    this.rest = false;
    this.value = readShare(words);
  }

  /** Whether this means *whatever is still unmarked*. */
  public isRest(): boolean {
    return this.rest;
  }

  /** The fraction `(0, 1]`, or `null` for *the rest* or words it cannot read. */
  public fraction(): number | null {
    return this.value;
  }

  /** Whether the words read as a share at all. */
  public isReadable(): boolean {
    return this.rest || this.value !== null;
  }
}

function readShare(words: string): number | null {
  const pct = /^(\d+(?:\.\d+)?)\s*(%|per ?cent)$/.exec(words);
  if (pct) return bounded(Number(pct[1]) / 100);
  if (/^\d*\.\d+$|^[01]$/.test(words)) return bounded(Number(words));
  const slash = /^(\d+)\s*\/\s*(\d+)$/.exec(words);
  if (slash) return bounded(Number(slash[1]) / Number(slash[2]));
  if (words === 'all' || words === 'all of it' || words === 'the whole') return 1;
  const parts = words.split(/\s+/).filter((w) => w.length > 0);
  if (parts.length === 1) {
    const lone = WORD_FRACTIONS[parts[0]!.replace(/s$/, '')];
    return lone !== undefined ? lone : null;
  }
  if (parts.length === 2) {
    const count = COUNT_WORDS[parts[0]!];
    const each = WORD_FRACTIONS[parts[1]!.replace(/s$/, '')];
    if (count !== undefined && each !== undefined) return bounded(count * each);
  }
  return null;
}

function bounded(v: number): number | null {
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : null;
}
