/**
 * DrainSetting — the drain set's law is the MATTER's (B104): its rate under
 * a load, the moisture a pressing leaves, and what drains off. The mould
 * only integrates it.
 */
import { describe, it, expect } from 'vitest';
import { DrainSetting } from '../DrainSetting';

const CURD = { days: 2, moisture: { unloaded: 0.6, loaded: 0.4 }, loadRef: 1 };

describe('DrainSetting', () => {
  it('a load can at most double the pace, a stone or a screw press alike', () => {
    const d = new DrainSetting(CURD);
    expect(d.ratePerDay(0, 0)).toBeCloseTo(0.5, 9);
    expect(d.ratePerDay(1, 0)).toBeCloseTo(1, 9);
    expect(d.ratePerDay(5, 0)).toBeCloseTo(1, 9);
  });

  it('⭐ the load ratio is uncapped: a press drives it past the reference', () => {
    const d = new DrainSetting(CURD);
    expect(d.loadRatio(10 * 9.81, 10)).toBeCloseTo(1, 9);
    expect(d.loadRatio(40 * 9.81, 10)).toBeCloseTo(4, 9);
  });

  it('moisture runs unloaded → loaded to the reference, then keeps firming by a power law', () => {
    const d = new DrainSetting(CURD);
    expect(d.moistureAt(0, 0.15)).toBeCloseTo(0.6, 9);
    expect(d.moistureAt(1, 0.15)).toBeCloseTo(0.4, 9);
    expect(d.moistureAt(4, 0.15)).toBeLessThan(0.4);
  });

  it('⭐ an absorbed drain ignores the load and slows as the mould wets', () => {
    const d = new DrainSetting({ ...CURD, absorbedByMould: true });
    expect(d.loadRatio(1000, 10)).toBe(0);
    expect(d.ratePerDay(0, 0)).toBeCloseTo(0.5, 9);
    expect(d.ratePerDay(0, 0.5)).toBeCloseTo(0.25, 9);
  });

  it('drains water down to what the pressing keeps', () => {
    const d = new DrainSetting(CURD);
    // 10 kg, half water, pressed to the reference: keeps 0.4 of the water.
    expect(d.drainedKg(10, 0.5, 1, 0.15)).toBeCloseTo(10 * 0.6 * 0.5, 9);
  });

  it('names what it sets as — `becomes`, else nothing (the pool\'s own)', () => {
    expect(new DrainSetting({ ...CURD, becomes: '/m/cheese' }).getBecomes()).toBe('/m/cheese');
    expect(new DrainSetting(CURD).getBecomes()).toBe('');
  });

  it('⭐ a sugar loaf\'s shape keys and per-band extra are gone (matter-model-overlaps D12)', () => {
    // The strike crystallizes now — `crystallizesTo.productAs` names the
    // crop's material by shape — so a drain set refuses the retired keys.
    expect(new DrainSetting({ ...CURD, becomesAs: { '/t': '/m' } } as never).toSpec()).not.toHaveProperty('becomesAs');
    expect(new DrainSetting({ ...CURD, drainPerBand: 0.05 } as never).toSpec()).not.toHaveProperty('drainPerBand');
  });

  it('refuses a spec it cannot evaluate, and round-trips the one it can', () => {
    expect(() => new DrainSetting({ ...CURD, days: 0 })).toThrow(RangeError);
    expect(new DrainSetting(CURD).toSpec()).toEqual(CURD);
  });
});
