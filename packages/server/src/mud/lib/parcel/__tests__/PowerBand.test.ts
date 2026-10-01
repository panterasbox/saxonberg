/**
 * PowerBand — the closed electric-posture vocabulary (energy build). Data only
 * (const + type + summaries); validation is inlined at its consumers, so this
 * proves the shape rather than a method surface.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { POWER_BANDS, POWER_BAND_SUMMARIES } from '../PowerBand';
import { ParcelRecord } from '../ParcelRecord';

describe('POWER_BANDS', () => {
  it('is the closed four-band vocabulary', () => {
    expect([...POWER_BANDS]).toEqual([
      'off-grid',
      'domestic',
      'commercial',
      'industrial',
    ]);
  });

  it('has a player-facing summary for every band', () => {
    for (const b of POWER_BANDS) {
      expect(POWER_BAND_SUMMARIES[b].length).toBeGreaterThan(0);
    }
  });
});

describe('ParcelRecord.setPowerBand — the inline validator', () => {
  it('accepts a valid band and null (inherit)', () => {
    const r = new ParcelRecord();
    r.setPowerBand('domestic');
    expect(r.getPowerBand()).toBe('domestic');
    r.setPowerBand(null);
    expect(r.getPowerBand()).toBeNull();
  });

  it('⭐ off-grid is a first-class value, not the null default', () => {
    const r = new ParcelRecord();
    r.setPowerBand('off-grid');
    expect(r.getPowerBand()).toBe('off-grid');
  });

  it('throws naming the vocabulary on an unknown band', () => {
    const r = new ParcelRecord();
    expect(() => r.setPowerBand('nuclear')).toThrow(/unknown power band/i);
  });
});
