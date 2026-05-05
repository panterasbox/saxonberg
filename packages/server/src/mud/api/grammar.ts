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
import { DescribeApi } from './describe';
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
  [Pronouns.Ze]: {
    subj: 'ze',
    obj: 'zir',
    poss: 'zir',
    reflex: 'zirself',
  },
};

const NEUTRAL: PronounSet = SETS[Pronouns.It];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export class GrammarApi {
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
    const set = MixinApi.isGendered(stuff) ? SETS[stuff.pronouns] : NEUTRAL;
    return set[kind];
  }

  /** Convenience: `pronoun(stuff, 'poss')`. */
  static possessive(stuff: Stuff): string {
    return GrammarApi.pronoun(stuff, 'poss');
  }

  /**
   * Return the indefinite article (`'a'` / `'an'`) for a Stuff's
   * display name. Vowel-onset heuristic; not phonetic.
   */
  static article(stuff: Stuff): string {
    const display = DescribeApi.getDisplayName(stuff, '').trim();
    if (!display) return 'a';
    const first = display.charAt(0).toLowerCase();
    return VOWELS.has(first) ? 'an' : 'a';
  }
}

SecurityApi.decorateApiClass(GrammarApi);
