import { describe, it, expect } from 'vitest';
import { GeoPosition } from '../GeoPosition';

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
});
