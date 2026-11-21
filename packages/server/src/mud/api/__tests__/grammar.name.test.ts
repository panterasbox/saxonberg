/**
 * GrammarApi.name — the one entry for naming what is not Stuff (naming
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

describe('GrammarApi.name', () => {
  it('names one by its whole keyword, case and a leading article aside', () => {
    expect(GrammarApi.name('The East Quay', QUAYS)).toEqual({ kind: 'one', one: 'east' });
    expect(GrammarApi.name('dock', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
  });

  it('a word that begins a keyword word names it', () => {
    expect(GrammarApi.name('dr', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
  });

  it('⚠ never matches mid-word — `plant` never finds `implant`', () => {
    const got = GrammarApi.name('plant', [e('implant', ['implant', 'aether implant'])]);
    expect(got).toEqual({ kind: 'none', offered: ['implant'] });
  });

  it('an entry answers to the plural of its keywords', () => {
    expect(GrammarApi.name('docks', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
    expect(GrammarApi.name('berries', [e('b', ['berry'])])).toEqual({ kind: 'one', one: 'b' });
  });

  it('a tie keeps entry order and carries the titles', () => {
    expect(GrammarApi.name('quay', QUAYS)).toEqual({
      kind: 'tie',
      tie: ['east', 'west'],
      titles: ['the East Quay', 'the West Quay'],
    });
  });

  it('a leading ordinal picks from the tie (word and numeric forms, and last)', () => {
    expect(GrammarApi.name('second quay', QUAYS)).toEqual({ kind: 'one', one: 'west' });
    expect(GrammarApi.name('1st quay', QUAYS)).toEqual({ kind: 'one', one: 'east' });
    expect(GrammarApi.name('last quay', QUAYS)).toEqual({ kind: 'one', one: 'west' });
    expect(GrammarApi.name('third quay', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('a quoted phrase is phrase-tier only', () => {
    expect(GrammarApi.name('"dry dock"', QUAYS)).toEqual({ kind: 'one', one: 'dock' });
    expect(GrammarApi.name('"dry"', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('none says what could have been named', () => {
    expect(GrammarApi.name('harbor', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
    expect(GrammarApi.name('   ', QUAYS)).toEqual({ kind: 'none', offered: QUAYS.map((q) => q.title) });
  });

  it('⭐ a partial names nothing — every word must begin a keyword word', () => {
    const got = GrammarApi.name('long red pole', [e('a', ['long rod']), e('b', ['long red rod'])]);
    expect(got).toEqual({ kind: 'none', offered: ['a', 'b'] });
    expect(GrammarApi.name('long red', [e('a', ['long rod']), e('b', ['long red rod'])])).toEqual({ kind: 'one', one: 'b' });
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
