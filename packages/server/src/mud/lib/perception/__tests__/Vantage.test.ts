import { describe, it, expect, vi, afterEach } from 'vitest';
import { Vantage } from '../Vantage';
import { GeoPosition, M_PER_NM } from '../../expanse/GeoPosition';
import { BiomeApi } from '../../../api/biome';

const KM_PER_NM = M_PER_NM / 1000;

describe('Vantage — the sight core', () => {
  afterEach(() => vi.restoreAllMocks());

  it('an eye at standing height sees a low target at about four and a half kilometres', () => {
    const v = new Vantage(new GeoPosition(42, -8.5), 1.7);
    expect(v.reachNm(0) * KM_PER_NM).toBeCloseTo(4.9, 0);
  });

  it('a hundred metres up sees the sea-level horizon at about thirty-five kilometres', () => {
    const v = new Vantage(new GeoPosition(42, -8.5), 100);
    expect(v.reachNm(0) * KM_PER_NM).toBeGreaterThan(35);
    expect(v.reachNm(0) * KM_PER_NM).toBeLessThan(42);
  });

  it('two hundred-foot heights see each other at about twenty-three miles (the sea\'s figure)', () => {
    expect(new Vantage(new GeoPosition(0, 0), 30.48).reachNm(30.48)).toBeCloseTo(23.4, 1);
  });

  it('a smaller world has a nearer horizon, by √(R / R_earth)', () => {
    const earth = new Vantage(new GeoPosition(0, 0), 10).reachNm(10);
    vi.spyOn(BiomeApi, 'planetRadiusM').mockReturnValue(6_371_000 / 4);
    expect(new Vantage(new GeoPosition(0, 0), 10).reachNm(10)).toBeCloseTo(earth / 2, 6);
  });

  it('bearing and range agree with the chart', () => {
    const here = new GeoPosition(42, -8.5);
    const there = here.destination(58, 18.7);
    const line = new Vantage(here, 2).lineTo(there, 30);
    expect(line.bearingDeg).toBeCloseTo(58, 0);
    expect(line.rangeNm).toBeCloseTo(18.7, 1);
  });

  it('sight is null past reach, and the weather shortens it', () => {
    const here = new GeoPosition(42, -8.5);
    const v = new Vantage(here, 2);
    const reach = v.reachNm(30);
    const near = here.destination(90, reach * 0.8);
    const far = here.destination(90, reach * 1.1);
    expect(v.sight(near, 30)).not.toBeNull();
    expect(v.sight(far, 30)).toBeNull();
    expect(v.sight(near, 30, 0.5)).toBeNull();
  });

  it('refuses a non-finite eye', () => {
    expect(() => new Vantage(new GeoPosition(0, 0), Number.NaN)).toThrow(RangeError);
  });
});
