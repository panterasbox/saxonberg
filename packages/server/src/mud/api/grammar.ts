/**
 * GrammarApi — small library of English grammar helpers for prose
 * templating. Registered as Liquid filters by `ProseApi` (`cap`,
 * `pronoun`, `article`, `possessive`) and callable directly from TS.
 *
 * Pronoun selection reads `GenderedMixin.pronouns` (the canonical
 * `Pronouns` enum) and maps it to a four-form set
 * (subject / object / possessive / reflexive). Stuff that doesn't
 * compose `GenderedMixin` falls back to neuter (`it / it / its / itself`).
 *
 * The article heuristic is vowel-onset only — `an honest` / `a unicorn`
 * exceptions need per-stuff overrides (a future article-form field on
 * the Stuff or a registered helper). Good enough for v1.
 */

import { Pronouns } from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import { MixinApi } from './mixin';
import { SecurityApi } from './security';

export type PronounKind = 'subj' | 'obj' | 'poss' | 'reflex';

export interface PronounSet {
  subj: string;
  obj: string;
  poss: string;
  reflex: string;
}

const SETS: Record<Pronouns, PronounSet> = {
  [Pronouns.He]: {
    subj: 'he',
    obj: 'him',
    poss: 'his',
    reflex: 'himself',
  },
  [Pronouns.She]: {
    subj: 'she',
    obj: 'her',
    poss: 'her',
    reflex: 'herself',
  },
  [Pronouns.They]: {
    subj: 'they',
    obj: 'them',
    poss: 'their',
    reflex: 'themselves',
  },
  [Pronouns.It]: {
    subj: 'it',
    obj: 'it',
    poss: 'its',
    reflex: 'itself',
  },
};

const NEUTRAL: PronounSet = SETS[Pronouns.It];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * Articles stripped during MQL desugar (req §9.1). Lowercase. Used
 * by `MqlApi` to clean up natural English before formal parsing —
 * `look at the rose` → `look at rose`.
 */
const ARTICLES: ReadonlySet<string> = new Set(['the', 'a', 'an']);

/**
 * Word-form ordinal markers (req §9.2). The value is the 1-indexed
 * position the marker resolves to; `last` is `-1` per the negative-
 * index convention. Used by MQL desugar to translate
 * `second rose` → `rose:[2]`.
 */
const ORDINAL_WORDS: ReadonlyMap<string, number> = new Map([
  ['first', 1],
  ['second', 2],
  ['third', 3],
  ['fourth', 4],
  ['fifth', 5],
  ['sixth', 6],
  ['seventh', 7],
  ['eighth', 8],
  ['ninth', 9],
  ['tenth', 10],
  ['last', -1],
]);

/**
 * Numeric-suffix ordinal pattern (req §9.2): `1st`, `2nd`, `3rd`,
 * `4th`, … Captures the integer in group 1.
 */
const ORDINAL_NUMERIC: RegExp = /^(\d+)(st|nd|rd|th)$/;

export class GrammarApi {
  /**
   * Articles stripped from the head of a query during MQL desugar.
   * Lowercase entries; comparisons are case-insensitive and done by
   * the consumer.
   */
  public static readonly ARTICLES: ReadonlySet<string> = ARTICLES;

  /**
   * Word-form ordinal markers ({@link ORDINAL_WORDS}). Maps
   * `first` → 1, `second` → 2, … `last` → -1 (per the negative-index
   * convention from req §6).
   */
  public static readonly ORDINAL_WORDS: ReadonlyMap<string, number> =
    ORDINAL_WORDS;

  /**
   * Numeric-suffix ordinal pattern. Matches `1st`, `2nd`, `3rd`,
   * `4th`, … Group 1 is the integer.
   */
  public static readonly ORDINAL_NUMERIC: RegExp = ORDINAL_NUMERIC;

  /**
   * Capitalize the first character. Operates on raw strings only —
   * passing a markup fragment will cap the leading `<`, which is
   * almost certainly not what the author wants. The common
   * sentence-leading uses (`pronoun`, `article`, `possessive`) all
   * return raw strings, so this composes cleanly there.
   */
  static cap(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Return one of the four pronouns for the given Stuff. Reads the
   * `GenderedMixin.pronouns` enum when present; falls back to neuter
   * (`it / it / its / itself`) otherwise.
   */
  static pronoun(stuff: Stuff, kind: PronounKind = 'subj'): string {
    const set = MixinApi.isGendered(stuff) ? SETS[stuff.getPronouns()] : NEUTRAL;
    return set[kind];
  }

  /** Convenience: `pronoun(stuff, 'poss')`. */
  static possessive(stuff: Stuff): string {
    return GrammarApi.pronoun(stuff, 'poss');
  }

  /**
   * Return the indefinite article (`'a'` / `'an'`) for a Stuff's
   * presentation string. Vowel-onset heuristic; not phonetic.
   */
  static article(stuff: Stuff): string {
    return this.articleFor(stuff.getPresentation());
  }

  /**
   * Indefinite article (`'a'` / `'an'`) for a raw word or phrase by
   * vowel onset — the string-level core of {@link article}. Not
   * phonetic (`a unicorn` / `an honest` need per-stuff overrides).
   */
  static articleFor(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return 'a';
    return VOWELS.has(trimmed.charAt(0).toLowerCase()) ? 'an' : 'a';
  }

  /**
   * Split text into lowercase word atoms — on runs of non-alphanumerics,
   * dropping articles (`a` / `an` / `the`) and single characters.
   * `"a tall stranger"` → `['tall', 'stranger']`; `"Bob"` → `['bob']`.
   * Used for keyword derivation from a rendered/perceived name.
   */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1 && !ARTICLES.has(t));
  }

  /**
   * Plural form of `singular`.
   *
   * Defers to the host's `getPluralForm()` method when present so
   * irregulars (`mouse` → `mice`, `child` → `children`) can override
   * the rule. Falls back to the naive `singular + 's'` — good enough
   * for English-content v1. Real morphology (`-y → -ies`, `-s/-x/-z
   * /-ch/-sh → -es`, etc.) lands when a Locale or richer
   * pluralization rule arrives.
   *
   * The host-side opt-in shape is a single `getPluralForm(): string`
   * method on the Stuff. Empty / non-string returns fall through to
   * the naive rule so a misbehaving override doesn't crash the
   * caller.
   */
  static pluralize(stuff: Stuff, singular: string): string {
    const override = (stuff as unknown as { getPluralForm?: () => string })
      .getPluralForm;
    if (typeof override === 'function') {
      try {
        const plural = override.call(stuff);
        if (typeof plural === 'string' && plural.length > 0) return plural;
      } catch {
        // Fall through to naive.
      }
    }
    return `${singular}s`;
  }

  /**
   * Render a list of strings in English serial-comma form:
   *   []                    → ''
   *   ['a']                 → 'a'
   *   ['a', 'b']            → 'a and b'
   *   ['a', 'b', 'c']       → 'a, b, and c'
   *   ['a', 'b', 'c', 'd']  → 'a, b, c, and d'
   *
   * Oxford-comma style — consistent with the rest of the project's
   * authored prose. For non-list joining (CSV, tags) callers should
   * use `Array.join` directly; this method exists for natural-prose
   * sentences ("Added Iffy, Bobalu, and Jane to your friends list.").
   */
  static joinList(items: readonly string[]): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0]!;
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
  }
}

SecurityApi.decorateApiClass(GrammarApi);
