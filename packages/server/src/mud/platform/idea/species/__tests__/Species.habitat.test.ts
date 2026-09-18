/**
 * ⭐ Species.habitat and `fitIn` — **the one law every RGO shares**
 * (fishing D4/D22): each authored tolerance is a factor in `0..1`, and
 * the fit is the MINIMUM of them, which is what lets the read NAME the
 * limiter. The tests pin the law, not any species: a product would
 * compound stresses, a mean would hide the limiter, and either would
 * silently change what *too warm for trout this month* means.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Species, { WATER_PARAMETERS, type WaterState } from '../Species';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

/** A neutral water — every parameter at a value no tolerance below cares about. */
function water(over: Partial<WaterState> = {}): WaterState {
  const base = Object.fromEntries(WATER_PARAMETERS.map((p) => [p, 0])) as WaterState;
  return { ...base, temperatureK: 283, oxygenMgL: 9, currentMps: 0.5, pH: 7, ...over };
}

function trout(): Species {
  const s = makeStuff(() => new Species());
  s.setHabitat({
    tolerances: {
      temperatureK: { min: 275, max: 288, margin: 4 },
      oxygenMgL: { min: 7, margin: 2 },
      currentMps: { min: 0.3, margin: 0.2 },
    },
    role: 'predator',
    abundance: 40,
    fightRating: 0.5,
  });
  return s;
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('setHabitat', () => {
  it('round-trips, clamping the fight rating and the abundance', () => {
    const s = makeStuff(() => new Species());
    s.setHabitat({ tolerances: {}, role: 'bait', abundance: -3, fightRating: 4 });
    expect(s.getHabitat()).toEqual({ tolerances: {}, role: 'bait', abundance: 0, fightRating: 1 });
    s.setHabitat(null);
    expect(s.getHabitat()).toBeNull();
  });

  it('⚠ refuses an unknown parameter word rather than dropping it', () => {
    const s = makeStuff(() => new Species());
    expect(() =>
      s.setHabitat({
        tolerances: { temprature: { max: 1 } } as never,
        role: 'forage',
        abundance: 1,
        fightRating: 0,
      }),
    ).toThrow(/not a water parameter/);
  });

  it('⚠ refuses an unknown role', () => {
    const s = makeStuff(() => new Species());
    expect(() =>
      s.setHabitat({ tolerances: {}, role: 'king' as never, abundance: 1, fightRating: 0 }),
    ).toThrow(/not a habitat role/);
  });
});

describe('fitIn — Liebig\'s minimum', () => {
  it('a null habitat is fit 0: not in any water', () => {
    const s = makeStuff(() => new Species());
    expect(s.fitIn(water())).toEqual({ fit: 0, limiting: null });
  });

  it('inside every band the fit is 1 and nothing limits', () => {
    expect(trout().fitIn(water())).toEqual({ fit: 1, limiting: null });
  });

  it('⭐ the fit is the MINIMUM factor, and the limiter is named', () => {
    // 2 K over the max on a 4 K margin → 0.5; oxygen 1 under on a 2 margin → 0.5;
    // the current 0.15 under on a 0.2 margin → 0.25. Min wins; a product would be 0.0625.
    const fit = trout().fitIn(water({ temperatureK: 290, oxygenMgL: 6, currentMps: 0.15 }));
    expect(fit.fit).toBeCloseTo(0.25, 6);
    expect(fit.limiting).toBe('currentMps');
  });

  it('stacked mild stresses do not compound', () => {
    // Two factors at 0.75: the minimum is 0.75; a product would be 0.5625.
    const fit = trout().fitIn(water({ temperatureK: 289, oxygenMgL: 6.5 }));
    expect(fit.fit).toBeCloseTo(0.75, 6);
    expect(fit.limiting).toBe('temperatureK');
  });

  it('beyond the margin the factor is 0; with no margin the bound is a cliff', () => {
    expect(trout().fitIn(water({ temperatureK: 300 })).fit).toBe(0);
    const s = makeStuff(() => new Species());
    s.setHabitat({ tolerances: { salinityPpt: { max: 2 } }, role: 'forage', abundance: 1, fightRating: 0 });
    expect(s.fitIn(water({ salinityPpt: 2 })).fit).toBe(1);
    expect(s.fitIn(water({ salinityPpt: 2.01 }))).toEqual({ fit: 0, limiting: 'salinityPpt' });
  });

  it('⭐ an unauthored parameter is factor 1 — unmodelled is not zero', () => {
    // The trout authors nothing about pH, nitrate or contamination.
    const fit = trout().fitIn(water({ pH: 3, nitrateMgL: 500, contamination: 9 }));
    expect(fit).toEqual({ fit: 1, limiting: null });
  });

  it('a season out of the authored window is 0, and says so', () => {
    const s = makeStuff(() => new Species());
    s.setHabitat({ tolerances: {}, seasons: ['spring', 'summer'], role: 'apex', abundance: 2, fightRating: 1 });
    expect(s.fitIn(water(), 'winter')).toEqual({ fit: 0, limiting: 'season' });
    expect(s.fitIn(water(), 'summer')).toEqual({ fit: 1, limiting: null });
    // No season given: the season is not checked.
    expect(s.fitIn(water())).toEqual({ fit: 1, limiting: null });
  });

  it('a toxin is a max with a margin — a dose response, no second shape', () => {
    const s = makeStuff(() => new Species());
    s.setHabitat({ tolerances: { ammoniaMgL: { max: 0.02, margin: 0.5 } }, role: 'forage', abundance: 1, fightRating: 0 });
    expect(s.fitIn(water({ ammoniaMgL: 0.27 })).fit).toBeCloseTo(0.5, 6);
  });
});
