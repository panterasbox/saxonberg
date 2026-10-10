import { describe, it, expect } from 'vitest';
import { BandExtent } from '../BandExtent';
import { GeoPosition } from '../GeoPosition';

const corridor = new BandExtent({
  kind: 'corridor',
  from: { latDeg: 50, lonDeg: -5 },
  to: { latDeg: 50, lonDeg: -4 },
  widthNm: 4,
});
const belt = new BandExtent({ kind: 'belt', latMinDeg: 49.9, latMaxDeg: 50.1 });

describe('BandExtent', () => {
  it('refuses a kind outside the vocabulary', () => {
    expect(() => new BandExtent({ kind: 'blob' } as never)).toThrow(/corridor, belt/);
  });

  it('a corridor contains what lies along it and within half its width', () => {
    expect(corridor.contains(new GeoPosition(50, -4.5))).toBe(true);
    expect(corridor.contains(new GeoPosition(50.02, -4.5))).toBe(true); // 1.2 nm off
    expect(corridor.contains(new GeoPosition(50.05, -4.5))).toBe(false); // 3 nm off
    expect(corridor.contains(new GeoPosition(50, -3.9))).toBe(false); // past the end
  });

  it('a belt with no longitude runs round the world', () => {
    expect(belt.contains(new GeoPosition(50, 170))).toBe(true);
    expect(belt.contains(new GeoPosition(50.2, 0))).toBe(false);
  });

  it('a segment crossing the belt reports entry then exit, in order', () => {
    const a = new GeoPosition(49.8, -4.5);
    const b = new GeoPosition(50.2, -4.5);
    const x = belt.crossings(a, b);
    expect(x.map((c) => c.entering)).toEqual([true, false]);
    expect(x[0]!.t).toBeCloseTo(0.25, 6);
    expect(x[1]!.t).toBeCloseTo(0.75, 6);
  });

  it('a segment wholly inside or wholly outside crosses nothing', () => {
    expect(belt.crossings(new GeoPosition(50, 0), new GeoPosition(50.05, 1))).toEqual([]);
    expect(belt.crossings(new GeoPosition(48, 0), new GeoPosition(48, 1))).toEqual([]);
  });

  it('a track leaving a corridor across its side reports only the exit', () => {
    const x = corridor.crossings(new GeoPosition(50, -4.5), new GeoPosition(50.2, -4.5));
    expect(x).toHaveLength(1);
    expect(x[0]!.entering).toBe(false);
  });

  it('⭐ area orders a narrow corridor under a wide belt', () => {
    expect(corridor.area()).toBeLessThan(belt.area());
  });
});
