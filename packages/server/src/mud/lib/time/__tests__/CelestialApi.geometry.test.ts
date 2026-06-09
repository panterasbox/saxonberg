/**
 * CelestialApi geometry tests — pure geometry checked against textbook values
 * (acceptance AC7). The whole point of the celestial substrate is
 * that an astronomy student gets a real match, so these assert the
 * closed-form relations directly: equinox/solstice declination,
 * 12-hour equinox day at 42°N, noon altitude = 90 − |lat − δ|, due-
 * south noon azimuth, season quarters, moon phase, and the polar
 * guards.
 */

import { describe, it, expect } from 'vitest';
import { EARTH_LIKE } from '../CelestialProfile';
import { Quantity } from '../../quantity';
import { CelestialApi } from '../../../api/celestial';

const D = EARTH_LIKE.dayLengthSeconds; // 86_400
const Y = EARTH_LIKE.yearLengthDays; // 360
const LAT = 42;
const noonOf = (dayIndex: number): number => dayIndex * D + D / 2;

describe('solar declination', () => {
  it('is ~0 at the equinoxes (day 0 and Y/2)', () => {
    expect(CelestialApi.declinationDeg(EARTH_LIKE, 0)).toBeCloseTo(0, 6);
    expect(CelestialApi.declinationDeg(EARTH_LIKE, noonOf(Y / 2))).toBeCloseTo(0, 6);
  });

  it('is +tilt at the summer solstice (Y/4), −tilt at the winter solstice (3Y/4)', () => {
    expect(CelestialApi.declinationDeg(EARTH_LIKE, noonOf(Y / 4))).toBeCloseTo(23.5, 6);
    expect(CelestialApi.declinationDeg(EARTH_LIKE, noonOf((3 * Y) / 4))).toBeCloseTo(
      -23.5,
      6
    );
  });
});

describe('day length', () => {
  it('is ~12 hours at the equinox at 42°N', () => {
    const sunrise = CelestialApi.sunriseSecOfDay(EARTH_LIKE, LAT, 0);
    const sunset = CelestialApi.sunsetSecOfDay(EARTH_LIKE, LAT, 0);
    expect(sunrise).toBeCloseTo(D / 4, 3); // 06:00
    expect(sunset).toBeCloseTo((3 * D) / 4, 3); // 18:00
    expect((sunset as number) - (sunrise as number)).toBeCloseTo(D / 2, 3);
  });

  it('is longer than 12h at the summer solstice, shorter at the winter solstice', () => {
    const summer = noonOf(Y / 4);
    const winter = noonOf((3 * Y) / 4);
    const summerLen =
      (CelestialApi.sunsetSecOfDay(EARTH_LIKE, LAT, summer) as number) -
      (CelestialApi.sunriseSecOfDay(EARTH_LIKE, LAT, summer) as number);
    const winterLen =
      (CelestialApi.sunsetSecOfDay(EARTH_LIKE, LAT, winter) as number) -
      (CelestialApi.sunriseSecOfDay(EARTH_LIKE, LAT, winter) as number);
    expect(summerLen).toBeGreaterThan(D / 2);
    expect(winterLen).toBeLessThan(D / 2);
  });
});

describe('solar altitude', () => {
  it('matches 90 − |lat − δ| at local noon across a full year', () => {
    for (let day = 0; day < Y; day++) {
      const t = noonOf(day);
      const dec = CelestialApi.declinationDeg(EARTH_LIKE, t);
      const expected = 90 - Math.abs(LAT - dec);
      const alt = CelestialApi.solarAltitudeDeg(EARTH_LIKE, LAT, t);
      expect(alt).toBeCloseTo(expected, 1); // within ~0.5°
    }
  });

  it('is negative at local midnight (night)', () => {
    expect(CelestialApi.solarAltitudeDeg(EARTH_LIKE, LAT, 0)).toBeLessThan(0);
    expect(CelestialApi.isDay(EARTH_LIKE, LAT, 0)).toBe(false);
    expect(CelestialApi.isDay(EARTH_LIKE, LAT, D / 2)).toBe(true);
  });
});

describe('solar azimuth', () => {
  it('is ~due south (180°) at noon at 42°N on the equinox', () => {
    expect(CelestialApi.solarAzimuthDeg(EARTH_LIKE, LAT, D / 2)).toBeCloseTo(180, 1);
  });

  it('is in the eastern half in the morning, western half in the afternoon', () => {
    const morning = CelestialApi.solarAzimuthDeg(EARTH_LIKE, LAT, D / 3); // before noon
    const afternoon = CelestialApi.solarAzimuthDeg(EARTH_LIKE, LAT, (2 * D) / 3);
    expect(morning).toBeLessThan(180);
    expect(afternoon).toBeGreaterThan(180);
  });
});

describe('season', () => {
  it('quarters the year, spring at the vernal equinox', () => {
    expect(CelestialApi.seasonFor(EARTH_LIKE, noonOf(0))).toBe('spring');
    expect(CelestialApi.seasonFor(EARTH_LIKE, noonOf(100))).toBe('summer');
    expect(CelestialApi.seasonFor(EARTH_LIKE, noonOf(200))).toBe('fall');
    expect(CelestialApi.seasonFor(EARTH_LIKE, noonOf(300))).toBe('winter');
  });
});

describe('moon', () => {
  it('is new at t=0 and full at half the synodic period', () => {
    expect(CelestialApi.moonPhaseFor(EARTH_LIKE, 30, 0)).toBeCloseTo(0, 6);
    expect(CelestialApi.moonPhaseFor(EARTH_LIKE, 30, 15 * D)).toBeCloseTo(0.5, 6);
  });

  it('nextFullMoon returns the first full moon strictly after t', () => {
    expect(CelestialApi.nextFullMoonFor(EARTH_LIKE, 30, 0)).toBe(15 * D);
    // Just after a full moon, the next is one synodic period later.
    expect(CelestialApi.nextFullMoonFor(EARTH_LIKE, 30, 15 * D)).toBe(45 * D);
  });
});

describe('polar guards', () => {
  it('reports polar day at the summer solstice inside the arctic circle', () => {
    const summer = noonOf(Y / 4);
    expect(CelestialApi.sunriseHourAngleDeg(EARTH_LIKE, 80, summer)).toBe('polar-day');
    expect(CelestialApi.sunriseSecOfDay(EARTH_LIKE, 80, summer)).toBeNull();
  });

  it('reports polar night at the winter solstice inside the arctic circle', () => {
    const winter = noonOf((3 * Y) / 4);
    expect(CelestialApi.sunriseHourAngleDeg(EARTH_LIKE, 80, winter)).toBe(
      'polar-night'
    );
  });

  it('42°N never goes polar', () => {
    for (let day = 0; day < Y; day++) {
      expect(typeof CelestialApi.sunriseHourAngleDeg(EARTH_LIKE, LAT, noonOf(day))).toBe(
        'number'
      );
    }
  });

  it('axial tilt carries the degrees unit', () => {
    expect(EARTH_LIKE.axialTiltDegrees).toBeInstanceOf(Quantity);
    expect(EARTH_LIKE.axialTiltDegrees.rawValue()).toBe(23.5);
  });
});
