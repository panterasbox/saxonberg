/**
 * KineticRecord — one good's history under its material's kinetics, and
 * the arithmetic over it (B105): the mass a part-conversion leaves, the
 * grade a `grade` table brings it to, the firing's dose-weighted
 * atmosphere. Thermal drives it; this is what it computes.
 */
import { describe, it, expect } from 'vitest';
import { KineticChange, type KineticSpec } from '../Kinetics';
import { KineticRecord } from '../KineticRecord';

const LIME = new KineticChange({
  key: 'calcine',
  rate: { referenceK: 1170, zK: 60, fullDoseS: 3600 },
  massRetained: 0.56,
  ladder: [{ atDegree: 1, becomes: '/stuff/idea/material/caustic/quicklime' }],
} as KineticSpec);
const TURNS = new KineticChange({
  key: 'turning',
  order: 1,
  rate: [
    [280, 0.01],
    [300, 0.05],
  ],
  grade: [
    [0.25, 1],
    [0.5, 2],
  ],
} as KineticSpec);

describe('KineticRecord', () => {
  it('a fresh record is inert, and a copy never aliases what it copied', () => {
    const r = new KineticRecord();
    expect(r.data.peakK).toBe(0);
    expect(r.progressOf(LIME, 'calcine')).toEqual({ extent: 0, rung: -1, dose: 0 });
    r.data.changes['calcine'] = { extent: 0.5, rung: -1 };
    const copy = new KineticRecord(r.toData());
    copy.data.changes['calcine']!.extent = 1;
    expect(r.extentOf('calcine')).toBe(0.5);
  });

  it('⭐ part-conversion is mass: half-burnt limestone has lost half its CO₂', () => {
    const r = new KineticRecord();
    r.data.changes['calcine'] = { extent: 0.5, rung: -1 };
    expect(r.massFactor([LIME])).toBeCloseTo(1 - 0.5 * 0.44, 9);
  });

  it('a grade table lowers from where the clock started', () => {
    const r = new KineticRecord();
    r.captureStartBand([TURNS], 'fine');
    r.captureStartBand([TURNS], 'poor'); // taken once
    r.data.changes['turning'] = { extent: 0.25, rung: -1 }; // one band
    expect(r.gradeAfterLoss([TURNS])?.getBand()).toBe('fair');
    r.data.changes['turning'] = { extent: 0.5, rung: -1 }; // two
    expect(r.gradeAfterLoss([TURNS])?.getBand()).toBe('poor');
    expect(new KineticRecord().gradeAfterLoss([TURNS])).toBeNull();
  });

  it('the atmosphere is weighted by dose; a starved one is reducing', () => {
    const r = new KineticRecord();
    r.weighAtmosphere(1, 1);
    r.weighAtmosphere(0.2, 3);
    expect(r.data.atmosphere.completeness).toBeCloseTo((1 + 0.6) / 4, 9);
    expect(r.isReducing(0.6)).toBe(true);
    expect(new KineticRecord().isReducing(0.6)).toBe(false);
  });

  it('credits drain once', () => {
    const r = new KineticRecord({ ...new KineticRecord().data, uncredited: ['pottery'] });
    expect(r.drainCredits()).toEqual(['pottery']);
    expect(r.drainCredits()).toEqual([]);
  });
});
