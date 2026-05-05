/**
 * GrammarApi — small library of English grammar helpers for prose
 * templating. Registered as Liquid filters by `ProseApi` (`cap`,
 * `pronoun`, `article`, `possessive`) and callable directly from TS.
 *
 * Pronouns default to neuter (`it / it / its / itself`). Game content
 * that needs gendered creatures attaches a `pronouns: PronounSet`
 * property on the Stuff; future work may upgrade this to a typed mixin
 * once it's clear what the right surface looks like (avatars, NPCs,
 * familiar pronouns vs. distant pronouns, etc.).
 *
 * The article heuristic is vowel-onset only — `an honest` / `a unicorn`
 * exceptions need per-stuff overrides (a future article-form field on
 * the Stuff or a registered helper). Good enough for v1.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { DescribeApi } from './describe';
import { SecurityApi } from './security';

export type PronounKind = 'subj' | 'obj' | 'poss' | 'reflex';

export interface PronounSet {
  subj: string;
  obj: string;
  poss: string;
  reflex: string;
}

const NEUTRAL: PronounSet = {
  subj: 'it',
  obj: 'it',
  poss: 'its',
  reflex: 'itself',
};

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
   * Return one of the four pronouns for the given Stuff. Falls back
   * to neuter (`it / it / its / itself`) when the Stuff has no
   * `pronouns` override.
   */
  static pronoun(stuff: Stuff, kind: PronounKind = 'subj'): string {
    return pronounSetOf(stuff)[kind];
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

function pronounSetOf(stuff: Stuff): PronounSet {
  const candidate = (stuff as { pronouns?: unknown }).pronouns;
  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as PronounSet).subj === 'string' &&
    typeof (candidate as PronounSet).obj === 'string' &&
    typeof (candidate as PronounSet).poss === 'string' &&
    typeof (candidate as PronounSet).reflex === 'string'
  ) {
    return candidate as PronounSet;
  }
  return NEUTRAL;
}

SecurityApi.decorateApiClass(GrammarApi);
