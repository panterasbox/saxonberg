/**
 * check-menu-staff — the ratchet's invariant, and the two pure pieces of
 * the derivation: what a seeded band licenses, and which seats fulfil a
 * specialized Discipline.
 *
 * ⭐⭐ **The test asserts the INVARIANT, never the number** — and ⚠ the
 * ceiling here is deliberately NOT a burn-down to zero: the residue is
 * the realm's standing vacancies (Dave's Bar offers a mojito nobody on
 * the rail can mix), and the gate's job is to keep saying so.
 */

import '../../src/test-bootstrap';
import { describe, it, expect } from 'vitest';
import {
  MENU_STAFF_SHORTFALL_CEILING,
  MENU_STAFF_HIGH_WATER,
  licenses,
  ancestryOf,
} from '../check-menu-staff';

describe('the ratchet', () => {
  it('⭐ holds a ceiling that may fall and may never rise', () => {
    expect(MENU_STAFF_SHORTFALL_CEILING).toBeLessThanOrEqual(
      MENU_STAFF_HIGH_WATER,
    );
    expect(MENU_STAFF_SHORTFALL_CEILING).toBeGreaterThanOrEqual(0);
  });

  it('⚠ and the high-water mark is a fact about the past — never edit it down', () => {
    expect(MENU_STAFF_HIGH_WATER).toBe(11);
  });
});

describe('licenses — the shipped band→difficulty rule', () => {
  it('⭐ a seeded history is made of work at one difficulty and licenses nothing harder', () => {
    // The seeder's own ladder: competent is six EASY runs, proficient is
    // four STANDARD, expert four HARD.
    expect(licenses('competent', 'easy')).toBe(true);
    expect(licenses('competent', 'standard')).toBe(false);
    expect(licenses('proficient', 'standard')).toBe(true);
    expect(licenses('proficient', 'hard')).toBe(false);
    expect(licenses('expert', 'hard')).toBe(true);
  });

  it('⚠⚠ a POSITIVE finding: untrained licenses NOTHING, because its run is empty', () => {
    // `seedRunFor('untrained')` is `{easy, 0}` — no evidence at all. A
    // zero-count run that still licensed `easy` would make every
    // dossier-less person a competent maker, silently.
    expect(licenses('untrained', 'easy')).toBe(false);
    expect(licenses('untrained', 'trivial')).toBe(false);
  });

  it('⚠ nothing a dossier can assert reaches formidable — it is hand-only', () => {
    for (const band of ['novice', 'competent', 'proficient', 'expert']) {
      expect(licenses(band, 'formidable')).toBe(false);
    }
  });

  it('refuses a band outside the vocabulary rather than guessing', () => {
    expect(licenses('', 'easy')).toBe(false);
    expect(licenses('moderate', 'easy')).toBe(false);
  });
});

describe('ancestryOf — a seat listing the parent fulfils the child', () => {
  const parents = new Map<string, readonly string[]>([
    ['mixology', ['bartending']],
    ['bartending', []],
  ]);

  it('⭐ a bartending seat fulfils a mixology recipe', () => {
    expect([...ancestryOf('mixology', parents)].sort()).toEqual([
      'bartending',
      'mixology',
    ]);
  });

  it('⚠ but a mixology seat does NOT fulfil a bartending recipe — specialization is one way', () => {
    expect(ancestryOf('bartending', parents).has('mixology')).toBe(false);
  });

  it('terminates on a cycle rather than hanging the gate', () => {
    const cyclic = new Map<string, readonly string[]>([
      ['a', ['b']],
      ['b', ['a']],
    ]);
    expect([...ancestryOf('a', cyclic)].sort()).toEqual(['a', 'b']);
  });
});
