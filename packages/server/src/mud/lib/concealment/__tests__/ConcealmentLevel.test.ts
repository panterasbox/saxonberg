import { describe, it, expect } from 'vitest';
import {
  CONCEALMENT_LEVELS,
  ConcealmentLevels,
} from '../ConcealmentLevel';
import type { ConcealmentLevel } from '../ConcealmentLevel';

describe('ConcealmentLevel vocabulary', () => {
  it('is the five ordered bands, obvious first', () => {
    expect(CONCEALMENT_LEVELS).toEqual([
      'obvious',
      'subtle',
      'hidden',
      'deep',
      'buried',
    ]);
    expect(ConcealmentLevels.ALL).toBe(CONCEALMENT_LEVELS);
  });

  it('narrows a string against the vocabulary', () => {
    expect(ConcealmentLevels.isLevel('hidden')).toBe(true);
    expect(ConcealmentLevels.isLevel('obvious')).toBe(true);
    expect(ConcealmentLevels.isLevel('nonsense')).toBe(false);
    expect(ConcealmentLevels.isLevel(4)).toBe(false);
    expect(ConcealmentLevels.isLevel(undefined)).toBe(false);
  });

  it('isConcealed is true for every band except obvious', () => {
    expect(ConcealmentLevels.isConcealed('obvious')).toBe(false);
    for (const level of CONCEALMENT_LEVELS.filter((l) => l !== 'obvious')) {
      expect(ConcealmentLevels.isConcealed(level)).toBe(true);
    }
  });

  it('rankOf is the monotone ordinal (0 = obvious … 4 = buried)', () => {
    expect(ConcealmentLevels.rankOf('obvious')).toBe(0);
    expect(ConcealmentLevels.rankOf('subtle')).toBe(1);
    expect(ConcealmentLevels.rankOf('buried')).toBe(4);
  });
});

describe('ConcealmentLevels.requirementFor projection', () => {
  it('obvious requires zero perception', () => {
    expect(ConcealmentLevels.requirementFor('obvious')).toBe(0);
  });

  it('is strictly monotone increasing across the ladder', () => {
    // Read from the dial fallbacks (AppSettings is not warmed in this unit
    // test — the read falls back to the seeded literals deterministically).
    const reqs = CONCEALMENT_LEVELS.map((l: ConcealmentLevel) =>
      ConcealmentLevels.requirementFor(l),
    );
    for (let i = 1; i < reqs.length; i++) {
      expect(reqs[i]!).toBeGreaterThan(reqs[i - 1]!);
    }
  });

  it('is deterministic — same band, same requirement across reads', () => {
    expect(ConcealmentLevels.requirementFor('deep')).toBe(
      ConcealmentLevels.requirementFor('deep'),
    );
  });
});

describe('ConcealmentLevels.hiddenDefault', () => {
  it('is a concealed band (never obvious), defaulting to hidden', () => {
    const level = ConcealmentLevels.hiddenDefault();
    expect(ConcealmentLevels.isLevel(level)).toBe(true);
    expect(ConcealmentLevels.isConcealed(level)).toBe(true);
    // Unwarmed → the seeded literal default.
    expect(level).toBe('hidden');
  });
});
