/**
 * Band — the stock-agnostic scalar → qualitative-tier mapping. Covers the
 * boundary behaviour of `fromScalar`, the built-in fallback, and that a
 * band carries no stock knowledge (the same value maps the same regardless
 * of which stock produced the scalar).
 */

import { describe, it, expect } from 'vitest';
import { Band, DEFAULT_BAND_THRESHOLDS } from '../Band';
import type { BandThreshold } from '../Band';

describe('Band.fromScalar', () => {
  it('maps to the highest tier whose min the value meets', () => {
    expect(Band.fromScalar(0).name).toBe('dormant');
    expect(Band.fromScalar(0.5).name).toBe('dormant');
    expect(Band.fromScalar(1).name).toBe('nascent');
    expect(Band.fromScalar(4.9).name).toBe('nascent');
    expect(Band.fromScalar(5).name).toBe('familiar');
    expect(Band.fromScalar(20).name).toBe('established');
    expect(Band.fromScalar(1000).name).toBe('pillar');
  });

  it('never goes below the lowest tier (negative → dormant)', () => {
    expect(Band.fromScalar(-100).name).toBe('dormant');
  });

  it('honours custom (unsorted) thresholds', () => {
    const custom: BandThreshold[] = [
      { name: 'pillar', min: 10 },
      { name: 'dormant', min: 0 },
      { name: 'familiar', min: 5 },
    ];
    expect(Band.fromScalar(7, custom).name).toBe('familiar');
    expect(Band.fromScalar(11, custom).name).toBe('pillar');
  });

  it('falls back to the built-in tiers when none supplied', () => {
    expect(DEFAULT_BAND_THRESHOLDS.length).toBeGreaterThan(0);
    expect(Band.fromScalar(50, []).name).toBe('dormant'); // empty → lowest
  });

  it('is value-equal by name (stock-agnostic — no stock state)', () => {
    expect(Band.of('familiar').equals(Band.fromScalar(5))).toBe(true);
    expect(Band.of('familiar').toString()).toBe('familiar');
  });
});
