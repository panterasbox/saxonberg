/**
 * GrammarApi.nameAmong — the one entry for naming what is not Stuff (naming
 * overhaul D-C2): article, case, word start, the mid-word refusal, plural,
 * ordinal, quoted phrase, tie, and none-with-offered. And `rank`'s tier cut.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { GrammarApi, type NameEntry } from '../grammar';

const e = (value: string, keywords: string[], title = value): NameEntry<string> => ({ value, keywords, title });

const QUAYS = [
  e('east', ['east quay', 'quay'], 'the East Quay'),
  e('west', ['west quay', 'quay'], 'the West Quay'),
  e('dock', ['dry dock', 'dock'], 'the dry dock'),
];

describe('GrammarApi.nameAmong', () => {
  it('⚠ the class keeps its own `name` — a static `name` shadowed Function.prototype.name and broke `eval`\'s Api binding', () => {
    expect(GrammarApi.name).toBe('GrammarApi');
  });

  it('names one by its whole keyword, case and a leading article aside', () => {
    expect(GrammarApi.nameAmong('The East Quay', QUAYS)).toEqual({ kind: 'one', one: 'east' });
    expect(GrammarApi.nameAmong('dock', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
  });

  it('a word that begins a keyword word names it', () => {
    expect(GrammarApi.nameAmong('dr', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
  });

  it('⚠ never matches mid-word — `plant` never finds `implant`', () => {
    const got = GrammarApi.nameAmong('plant', [e('implant', ['implant', 'aether implant'])]);
    expect(got).toEqual({ kind: 'none', offered: ['implant'] });
  });

  it('an entry answers to the plural of its keywords', () => {
    expect(GrammarApi.nameAmong('docks', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
    expect(GrammarApi.nameAmong('berries', [e('b', ['berry'])])).toEqual({ kind: 'one', one: 'b' });
    expect(GrammarApi.nameAmong('loaves', [e('l', ['loaf'])])).toEqual({ kind: 'one', one: 'l' });
    expect(GrammarApi.nameAmong('knives', [e('k', ['knife'])])).toEqual({ kind: 'one', one: 'k' });
  });

  it('a tie keeps entry order and carries the titles', () => {
    expect(GrammarApi.nameAmong('quay', QUAYS)).toEqual({
      kind: 'tie',
      tie: ['east', 'west'],
      titles: ['the East Quay', 'the West Quay'],
    });
  });

  it('a leading ordinal picks from the tie (word and numeric forms, and last)', () => {
    expect(GrammarApi.nameAmong('second quay', QUAYS)).toEqual({ kind: 'one', one: 'west' });
    expect(GrammarApi.nameAmong('1st quay', QUAYS)).toEqual({ kind: 'one', one: 'east' });
    expect(GrammarApi.nameAmong('last quay', QUAYS)).toEqual({ kind: 'one', one: 'west' });
    expect(GrammarApi.nameAmong('third quay', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('a quoted phrase is phrase-tier only', () => {
    expect(GrammarApi.nameAmong('"dry dock"', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
    expect(GrammarApi.nameAmong('"dry"', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('none says what could have been named', () => {
    expect(GrammarApi.nameAmong('harbor', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
    expect(GrammarApi.nameAmong('   ', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('⭐ a partial names nothing — every word must begin a keyword word', () => {
    const got = GrammarApi.nameAmong('long red pole', [e('a', ['long rod']), e('b', ['long red rod'])]);
    expect(got).toEqual({ kind: 'none', offered: ['a', 'b'] });
    expect(GrammarApi.nameAmong('long red', [e('a', ['long rod']), e('b', ['long red rod'])])).toEqual({ kind: 'one', one: 'b' });
  });
});

describe('GrammarApi.rank and scoreAll', () => {
  it('the highest tier present cuts every tier below it', () => {
    const ranked = GrammarApi.rank(
      [{ value: 'pit', keywords: ['clay pit'] }, { value: 'lumps', keywords: ['clay'] }],
      ['clay'],
    );
    expect(ranked).toEqual([{ value: 'lumps', score: GrammarApi.TIER_PHRASE }]);
  });

  it('scoreAll scores a pool in one call', () => {
    expect(GrammarApi.scoreAll([['net'], ['keepnet'], ['drift net']], ['net'])).toEqual([
      GrammarApi.TIER_PHRASE,
      0,
      GrammarApi.TIER_WORDS,
    ]);
  });
});
