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
import {
  NounPhrase,
  PRESENTATION_FORMS,
  REGISTERS,
  type PresentationForm,
  type Register,
} from '../lib/description/NounPhrase';
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

/**
 * The keyword tiers — see {@link GrammarApi.TIER_PHRASE}. Module constants
 * so the pure scorer below reads them without a static dispatch.
 */
const TIER_PHRASE = 100;
const TIER_WORDS = 60;
const TIER_PREFIX = 40;
const TIER_PARTIAL = 10;

/**
 * ⭐ THE naming rule, pure: how a query's words meet ONE keyword list.
 * See {@link GrammarApi.TIER_PHRASE} for the tiers and why a word only
 * matches where a keyword word BEGINS.
 */
function scoreKeywords(keywords: readonly string[], queryWords: readonly string[]): number {
  if (keywords.length === 0 || queryWords.length === 0) return 0;
  const phrase = queryWords.join(' ');
  if (keywords.some((kw) => kw === phrase)) return TIER_PHRASE;
  const words = keywords.flatMap((kw) => kw.split(/\s+/)).filter((w) => w.length > 0);
  if (queryWords.every((qw) => words.includes(qw))) return TIER_WORDS;
  const begun = queryWords.filter((qw) => words.some((w) => w.startsWith(qw)));
  if (begun.length === queryWords.length) return TIER_PREFIX;
  return TIER_PARTIAL * begun.length;
}

/** Game seconds per written duration unit (naming overhaul D-C6: game time). */
const DURATION_UNITS: Readonly<Record<string, number>> = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3_600, hr: 3_600, hrs: 3_600, hour: 3_600, hours: 3_600,
  d: 86_400, day: 86_400, days: 86_400,
  w: 604_800, week: 604_800, weeks: 604_800,
  fortnight: 1_209_600, fortnights: 1_209_600,
};

/** The number words a duration may be written with (`a week`, `two days`). */
const DURATION_NUMBER_WORDS: Readonly<Record<string, number>> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14,
  twenty: 20, thirty: 30,
};

/** The regular English plural: `watch` → `watches`, `berry` → `berries`. */
function pluralOf(word: string): string {
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

/**
 * One entry a holder offers to be named — anything that is not runtime
 * Stuff in reach (a quay in a book, a reading channel, a list label, an
 * offer not yet made). `keywords` are lowercase; `title` is how a prompt
 * or a refusal lists it.
 */
export interface NameEntry<T> {
  value: T;
  keywords: readonly string[];
  title: string;
}

/**
 * What a player's words named among a holder's entries (naming overhaul
 * D-C2): exactly one, a tie (in entry order — a prompt asks among these),
 * or none, with the titles that could have been named. It never prompts
 * and never refuses — that is I/O (`CommandController.named`).
 */
export type NameAnswer<T> =
  | { kind: 'one'; one: T }
  | { kind: 'tie'; tie: T[]; titles: string[] }
  | { kind: 'none'; offered: string[] };

/** A scored entry, best first (see {@link GrammarApi.rank}). */
export interface RankedEntry<T> {
  value: T;
  score: number;
}

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
   * ⭐⭐ The keyword tiers (one-resolution § 4: *the name is not special*;
   * naming overhaul D-C1 — the rule's one home). The scorer reads ONE
   * list — the candidate's keywords — and ranks how the query's words
   * meet it:
   *
   *   - `TIER_PHRASE` — a keyword IS the phrase. `look clay` at the pit is
   *     the lumps (`clay`), not the pit (`clay pit`).
   *   - `TIER_WORDS` — every query word is a WHOLE word of a keyword: `net`
   *     is a word of `drift net` and begins no word of `keepnet`.
   *   - `TIER_PREFIX` — every query word BEGINS a keyword word.
   *   - partials — `TIER_PARTIAL` × the words that begin one; a fallback
   *     for when nothing answers to every word.
   *
   * ⚠ A query word matches where a WORD of a keyword BEGINS, never in the
   * middle of one: `consign "plant pot"`, with no plant pot in hand, put
   * the player's aether imPLANT up for sale (the ceramics drive C).
   */
  public static readonly TIER_PHRASE: number = TIER_PHRASE;
  /** See {@link GrammarApi.TIER_PHRASE}. */
  public static readonly TIER_WORDS: number = TIER_WORDS;
  /** See {@link GrammarApi.TIER_PHRASE}. */
  public static readonly TIER_PREFIX: number = TIER_PREFIX;
  /** See {@link GrammarApi.TIER_PHRASE}: the per-word step of a partial. */
  public static readonly TIER_PARTIAL: number = TIER_PARTIAL;

  /**
   * The tier a score sits in — what the binder compares ACROSS scope tries
   * (`CommandLogic.walkScopes`): a whole-name hit in a later try beats a
   * partial in an earlier one. Partials are one tier.
   */
  static scoreTier(score: number): number {
    if (score >= TIER_PHRASE) return 3;
    if (score >= TIER_WORDS) return 2;
    if (score >= TIER_PREFIX) return 1;
    return 0;
  }

  /**
   * Score each keyword list against `queryWords` (lowercase words) — the
   * naming rule over a whole pool in ONE call, so a crowded room pays one
   * Api frame, not one per candidate. 0 = no match; higher is better.
   */
  static scoreAll(lists: ReadonlyArray<readonly string[]>, queryWords: readonly string[]): number[] {
    return lists.map((kw) => scoreKeywords(kw, queryWords));
  }

  /**
   * Rank entries by the tiers: the matches, best tier only — the highest
   * tier present cuts every tier below it, and a full-word answer cuts
   * every partial (a partial is a fallback, never a companion). Entry
   * order is the tiebreak.
   */
  static rank<T>(
    entries: ReadonlyArray<{ value: T; keywords: readonly string[] }>,
    queryWords: readonly string[],
  ): RankedEntry<T>[] {
    const out: RankedEntry<T>[] = [];
    for (const e of entries) {
      const score = scoreKeywords(e.keywords, queryWords);
      if (score > 0) out.push({ value: e.value, score });
    }
    for (const floor of [TIER_PHRASE, TIER_WORDS, TIER_PREFIX]) {
      if (out.some((m) => m.score >= floor)) return out.filter((m) => m.score >= floor);
    }
    return out;
  }

  /**
   * ⭐⭐ Name one of a holder's entries from a player's words (naming
   * overhaul D-C2) — the one entry for everything that is not Stuff. It
   * strips a leading article, reads a leading ordinal (`second`, `2nd`), treats a
   * quoted phrase as phrase-tier only, lets an entry answer to the plural
   * of its keywords, and ranks by the tiers. A tie keeps entry order and
   * an ordinal picks from it.
   */
  static name<T>(text: string, entries: ReadonlyArray<NameEntry<T>>): NameAnswer<T> {
    const offered = entries.map((e) => e.title);
    let typed = text.trim().toLowerCase();
    const quoted = /^"(.*)"$/.exec(typed) ?? /^'(.*)'$/.exec(typed);
    if (quoted) typed = quoted[1]!.trim();
    let words = typed.split(/\s+/).filter((w) => w.length > 0);
    if (!quoted && words.length > 1 && ARTICLES.has(words[0]!)) words = words.slice(1);
    let ordinal: number | null = null;
    if (!quoted && words.length > 1) {
      const head = words[0]!;
      const numeric = ORDINAL_NUMERIC.exec(head);
      const n = ORDINAL_WORDS.get(head) ?? (numeric ? Number(numeric[1]) : undefined);
      if (n !== undefined) {
        ordinal = n;
        words = words.slice(1);
      }
    }
    if (words.length === 0) return { kind: 'none', offered };
    const withPlurals = entries.map((e) => ({
      value: e,
      keywords: [...e.keywords, ...e.keywords.map((k) => {
        const parts = k.split(' ');
        parts[parts.length - 1] = pluralOf(parts[parts.length - 1]!);
        return parts.join(' ');
      })],
    }));
    let ranked = GrammarApi.rank(withPlurals, words);
    if (quoted) ranked = ranked.filter((r) => r.score >= TIER_PHRASE);
    if (ranked.length === 0) return { kind: 'none', offered };
    const top = Math.max(...ranked.map((r) => r.score));
    ranked = ranked.filter((r) => r.score === top);
    if (ordinal !== null) {
      const at = ordinal < 0 ? ranked.length + ordinal : ordinal - 1;
      const pick = ranked[at];
      return pick ? { kind: 'one', one: pick.value.value } : { kind: 'none', offered };
    }
    if (ranked.length === 1) return { kind: 'one', one: ranked[0]!.value.value };
    return { kind: 'tie', tie: ranked.map((r) => r.value.value), titles: ranked.map((r) => r.value.title) };
  }

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
   * The article a Stuff's identity takes — `'a'`, `'an'`, `'the'`, or
   * `''` for a proper name.
   *
   * ⚠ **This used to be wrong and nothing noticed**, because it read the
   * article off the *rendered* string: `article(x)` where x presented as
   * `"a heavy door"` answered **`'an'`**, having found a vowel at the
   * front of the article somebody had already typed. It was latent only
   * because no shipped template used the `| article` prose filter. It
   * asks the phrase now, which knows its own register.
   */
  static article(stuff: Stuff): string {
    return stuff.presentationPhrase().article();
  }

  /**
   * ⭐⭐ **Build a {@link NounPhrase}** — a stem, a register and a count,
   * from which the article, the definite form, the possessive and the
   * plural all derive.
   *
   * ⚠ This is where construction lives, and that is the codebase's rule
   * rather than this build's taste: `new SomeStuff()` goes through
   * `StuffApi.create` for the same reason. A static factory on a `lib/`
   * value class is **callable by anyone and visible to nobody** — the
   * author-surface projection admits public Api statics and public
   * instance methods, and a static on a non-Api class is neither.
   */
  static phrase(stem: string, register: Register = 'indefinite'): NounPhrase {
    return new NounPhrase(stem.trim(), register);
  }

  /** A proper name — takes no article, ever. */
  static properPhrase(stem: string): NounPhrase {
    return new NounPhrase(stem.trim(), 'proper');
  }

  /** Whether `value` is one of the three registers. */
  static isRegister(value: unknown): value is Register {
    return (
      typeof value === 'string' && (REGISTERS as readonly string[]).includes(value)
    );
  }

  /** Whether `value` is one of the six presentation forms. */
  static isPresentationForm(value: unknown): value is PresentationForm {
    return (
      typeof value === 'string' &&
      (PRESENTATION_FORMS as readonly string[]).includes(value)
    );
  }

  /**
   * Indefinite article (`'a'` / `'an'`) for a raw word or phrase by
   * vowel onset. Not phonetic (`a unicorn` / `an honest` would need a
   * per-row override).
   */
  static articleFor(text: string): string {
    return new NounPhrase(text, 'indefinite').article();
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
   * the rule. Falls back to the regular English endings (`-y → -ies`,
   * `-s/-x/-z/-ch/-sh → -es`, else `-s`); anything else is the host's
   * override to declare.
   *
   * The host-side opt-in shape is a single `getPluralForm(): string`
   * method on the Stuff. Empty / non-string returns fall through to
   * the regular rule so a misbehaving override doesn't crash the
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
    // ⭐ A partitive names its MEASURE first — `a lump of clay`, `a load of
    // spoil` — and it is the measure that counts: two lumps of clay, never
    // two lump of clays (the ceramics drive read "10 lump of clays").
    const partitive = /^(\S+)( of .+)$/.exec(singular);
    if (partitive) return `${GrammarApi.pluralWord(partitive[1]!)}${partitive[2]}`;
    return GrammarApi.pluralWord(singular);
  }

  /**
   * ⭐⭐ THE duration grammar (naming overhaul D-C6 — one reading, game
   * seconds): `90s` · `15m` · `2h` · `1h30m` · `3d` · `90 seconds` · `2 hours`
   * · `1 hour 30 minutes` · `a week` · `two days` · `a fortnight`. A unit is
   * required — a bare number is not a duration. Null for anything else.
   * The `type: duration` slot, the script `wait`/`every`, the world clock's
   * `after('5 minutes')` and the test harness all read through here.
   */
  static parseDuration(text: string): number | null {
    const t = text
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w !== 'and')
      .map((w) => (DURATION_NUMBER_WORDS[w] !== undefined ? String(DURATION_NUMBER_WORDS[w]) : w))
      .join(' ');
    if (t.length === 0) return null;
    const re = /(\d+(?:\.\d+)?)\s*([a-z]+)\s*/y;
    let total = 0;
    let at = 0;
    while (at < t.length) {
      re.lastIndex = at;
      const m = re.exec(t);
      if (m === null) return null;
      const unit = DURATION_UNITS[m[2]!];
      if (unit === undefined) return null;
      total += Number(m[1]) * unit;
      at = re.lastIndex;
    }
    if (at !== t.length || at === 0) return null;
    return Math.round(total);
  }

  /** Whether a word is a duration unit (`s`, `seconds`, `hour`, `fortnight` …). */
  static isDurationUnit(word: string): boolean {
    return DURATION_UNITS[word.toLowerCase()] !== undefined;
  }

  /**
   * The regular English plural: `watch` → `watches`, `berry` → `berries`.
   * Public (naming overhaul D-C1) so an entry with no Stuff behind it
   * answers to its plurals.
   */
  static pluralWord(word: string): string {
    return pluralOf(word);
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

  /**
   * A whole number in words — `24` → `'twenty-four'`, `360` → `'three
   * hundred and sixty'`. The no-gauge rule for a count a player READS
   * (a stand's trees, a panel's days): prose says *about twenty-four
   * trees' worth*, never `24`. Whole numbers below a million; anything
   * else (a fraction, a negative, a huge count) falls back to the digits,
   * because inventing words for it would be the wrong kind of honest.
   */
  static inWords(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n >= 1_000_000) return String(n);
    if (n < 20) return NUMBER_WORDS_SMALL[n]!;
    if (n < 100) {
      const tens = NUMBER_WORDS_TENS[Math.floor(n / 10)]!;
      return n % 10 === 0 ? tens : `${tens}-${NUMBER_WORDS_SMALL[n % 10]}`;
    }
    if (n < 1000) {
      const head = `${NUMBER_WORDS_SMALL[Math.floor(n / 100)]} hundred`;
      return n % 100 === 0 ? head : `${head} and ${GrammarApi.inWords(n % 100)}`;
    }
    const head = `${GrammarApi.inWords(Math.floor(n / 1000))} thousand`;
    const rest = n % 1000;
    if (rest === 0) return head;
    return rest < 100
      ? `${head} and ${GrammarApi.inWords(rest)}`
      : `${head}, ${GrammarApi.inWords(rest)}`;
  }
}

const NUMBER_WORDS_SMALL = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
] as const;
const NUMBER_WORDS_TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
  'eighty', 'ninety',
] as const;

SecurityApi.decorateApiClass(GrammarApi);
