/**
 * check-identity's pure decisions — the rung vocabulary, and rule 6.
 *
 * Rule 6 is the one this build adds, and it exists because the build
 * itself creates the failure it guards: until `NamedMixin` leaves the
 * creature base, every creature has a `name` slot and an author can fill
 * one in on anything; afterwards the same row is discarded by the
 * Hydrator without a word. The gate turns that silence into a build
 * error naming the file.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFINITE,
  INDEFINITE,
  NAMED_KEYS,
  isOrganismRow,
  type Row,
} from '../check-identity';
import { extendsExpressions } from '../pack-roots';

const row = (data: Record<string, unknown>): Row => ({
  path: '/x/agent/y',
  file: 'x/y.yaml',
  raw: { class: '/platform/agent/Extra', data },
  data,
});

describe('the article, which is the signal a player reads', () => {
  it('reads "the collier" as an individual', () => {
    expect(DEFINITE.test('the collier')).toBe(true);
    expect(DEFINITE.test('a hewer on tutwork')).toBe(false);
  });

  it('reads "a sentry" as a role', () => {
    expect(INDEFINITE.test('a sentry')).toBe(true);
    expect(INDEFINITE.test('an ox in harness')).toBe(true);
    expect(INDEFINITE.test('the smelterman')).toBe(false);
  });
});

describe('rule 6 — the keys NamedMixin declares', () => {
  it('lists exactly the five fields on Named.fieldMeta', () => {
    expect([...NAMED_KEYS]).toEqual([
      'name',
      'honorific',
      'surname',
      'nameSuffix',
      'alternateNames',
    ]);
  });

  it('an organism is a row with a species or a brain', () => {
    expect(isOrganismRow(row({ _speciesPath: '/stuff/idea/species/x' }))).toBe(true);
    expect(isOrganismRow(row({ behaviors: [] }))).toBe(true);
    expect(isOrganismRow(row({ shortDescription: 'a chair' }))).toBe(false);
  });

  it('⭐ a corpse or a head of stock counts, brain or no brain', () => {
    // The rule runs its own pass rather than riding the character loop,
    // which filters on `behaviors:` — a corpse has none and can still be
    // authored a name by mistake.
    expect(isOrganismRow(row({ _speciesPath: '/stuff/idea/species/bos' }))).toBe(true);
  });
});

describe('⚠ composesMixin sees through a const base stack', () => {
  const stack = `
    const CreatureBase = ChattelMixin(VisibleMixin(NamedMixin(Agent)));
    class Creature extends CreatureBase {}
  `;

  it('inlines a same-file const binding', () => {
    const exprs = extendsExpressions(stack);
    expect(exprs.some((e) => /NamedMixin/.test(e))).toBe(true);
  });

  it('still reads a directly-composed extends expression', () => {
    const exprs = extendsExpressions('class Cast extends CastMixin(NPC) {}');
    expect(exprs.some((e) => /CastMixin/.test(e))).toBe(true);
  });

  it('follows a base built from another base', () => {
    const exprs = extendsExpressions(`
      const Inner = NamedMixin(Agent);
      const Outer = VisibleMixin(Inner);
      class X extends Outer {}
    `);
    expect(exprs.some((e) => /NamedMixin/.test(e))).toBe(true);
  });

  it('terminates on a cycle rather than recurring forever', () => {
    const exprs = extendsExpressions(`
      const A = B(1);
      const B = A(1);
      class X extends A {}
    `);
    expect(exprs.length).toBeGreaterThan(0);
  });

  it('answers nothing for a file with no class', () => {
    expect(extendsExpressions('export const x = 1;')).toEqual([]);
  });
});
