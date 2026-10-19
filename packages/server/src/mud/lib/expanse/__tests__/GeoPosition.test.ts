import { describe, it, expect, vi, afterEach } from 'vitest';
import { GeoPosition } from '../GeoPosition';
import { BiomeApi } from '../../../api/biome';

describe('GeoPosition', () => {
  it('a degree of latitude is sixty miles', () => {
    const a = new GeoPosition(50, -4);
    const b = new GeoPosition(51, -4);
    expect(a.distanceNm(b)).toBeCloseTo(60, 6);
    expect(a.bearingTo(b)).toBeCloseTo(0, 6);
  });

  it('a degree of longitude shrinks by cos(latitude)', () => {
    const eq = new GeoPosition(0, 0).distanceNm(new GeoPosition(0, 1));
    const sixty = new GeoPosition(60, 0).distanceNm(new GeoPosition(60, 1));
    expect(eq).toBeCloseTo(60, 6);
    expect(sixty).toBeCloseTo(30, 3);
  });

  it('destination and bearing/distance round-trip', () => {
    const from = new GeoPosition(50.2, -4.1);
    for (const bearing of [0, 45, 90, 135, 200, 315]) {
      const to = from.destination(bearing, 37);
      expect(from.distanceNm(to)).toBeCloseTo(37, 1);
      expect(from.bearingTo(to)).toBeCloseTo(bearing, 0);
    }
  });

  it('wraps longitude across the antimeridian the short way', () => {
    const a = new GeoPosition(0, 179.5);
    const b = new GeoPosition(0, -179.5);
    expect(a.distanceNm(b)).toBeCloseTo(60, 6);
    expect(a.bearingTo(b)).toBeCloseTo(90, 6);
  });

  it('round-trips its record and keeps depth at zero by default', () => {
    const p = new GeoPosition(10, 20);
    expect(p.depthM).toBe(0);
    expect(new GeoPosition(p.toJSON()).equals(p)).toBe(true);
  });

  it('writes itself as a navigator would', () => {
    expect(new GeoPosition(50.2, -4.0583).toString()).toBe("50°12.0'N 4°03.5'W");
  });

  describe('⭐ the chart follows the planet (sugar D12)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('on a world a third of Earth\'s, a degree is twenty miles — and the metres do not move', () => {
      vi.spyOn(BiomeApi, 'planetRadiusM').mockReturnValue(2_124_000);
      const a = new GeoPosition(30, 0);
      expect(a.distanceNm(new GeoPosition(31, 0))).toBeCloseTo((2 * Math.PI * 2_124_000) / 360 / 1852, 6);
      // 240 nm due south (Waponi Woo's focus) is about twelve degrees here.
      expect(a.latDeg - a.destination(180, 240).latDeg).toBeCloseTo(11.99, 1);
    });
  });
});
