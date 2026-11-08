import { describe, it, expect } from 'vitest';
import { aromaPath } from './aroma-fixtures';
import { Scent, Smell } from '../Smell';

const ref = (word: string, ou: number, stuffId = 's') => ({ stuffId, aroma: aromaPath(word), ou, hops: 0 });

describe('Smell', () => {
  it('ZERO is empty', () => {
    expect(Smell.ZERO.isEmpty()).toBe(true);
    expect(Smell.ZERO.strength.rawValue()).toBe(0);
    expect(Smell.of([])).toBe(Smell.ZERO);
  });

  it('sums per word, strongest first, in odor units', () => {
    const smell = Smell.of([ref('tar', 5, 'a'), ref('smoke', 40, 'b'), ref('tar', 10, 'c')]);
    expect(smell.notes).toEqual([
      { aroma: aromaPath('smoke'), ou: 40 },
      { aroma: aromaPath('tar'), ou: 15 },
    ]);
    expect(smell.dominantAroma).toBe(aromaPath('smoke'));
    expect(smell.strength.unit).toBe('OU');
  });

  it('add keeps every source', () => {
    const smell = Smell.of([ref('tar', 5)]).add(Smell.of([ref('tar', 5, 't')]));
    expect(smell.notes).toEqual([{ aroma: aromaPath('tar'), ou: 10 }]);
    expect(smell.sources).toHaveLength(2);
  });

  it('attenuate scales every source and counts the hop', () => {
    const smell = Smell.of([ref('tar', 30)]).attenuate(1 / 30, 1);
    expect(smell.strength.rawValue()).toBeCloseTo(1);
    expect(smell.sources[0]!.hops).toBe(1);
    expect(Smell.of([ref('tar', 30)]).attenuate(0)).toBe(Smell.ZERO);
  });
});

describe('Scent', () => {
  const note = (ou: number) => ({
    aroma: aromaPath('smoke'),
    name: 'smoke',
    ou,
    hops: 0,
    leaf: 'smoke',
    sourceName: null,
  });

  it('words strength on the log ladder, and never a digit', () => {
    const phrases = new Scent([1, 30, 300, 2000, 8000].map(note)).phrases();
    expect(phrases).toEqual([
      'barely of smoke',
      'faintly of smoke',
      'clearly of smoke',
      'strongly of smoke',
      'overpoweringly of smoke',
    ]);
    for (const p of phrases) expect(p).not.toMatch(/\d/);
  });
});
