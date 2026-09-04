/**
 * Daylength (farmstead W6 / D11) — **the keystone signal, and it was
 * derivable all along.**
 *
 * `CelestialApi` already computed solar declination from real orbital
 * geometry (`δ = tilt · sin(2π · dayIndex / Y)`), the hour angle, and
 * sunrise/sunset. Daylength is `2·H0/360` of a rotation, and nobody had
 * ever asked for it.
 *
 * ⭐ It drives three systems: crop dormancy and bolting (the signal real
 * plants use), hens going off lay in short days, and the breeding season
 * — so **lambing in spring is a consequence of the calendar** rather than
 * a flavour decision anybody authors.
 *
 * These are pure-arithmetic assertions against the shipped profile, so
 * they check the orbital mechanics rather than a fixture: the summer and
 * winter extremes, the equinoctial twelve hours, and the two polar
 * limits.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CelestialApi } from '../../../api/celestial';
import { EARTH_LIKE } from '../CelestialProfile';

const DAY = EARTH_LIKE.dayLengthSeconds;
const YEAR = EARTH_LIKE.yearLengthDays;
/** The campus latitude the shipped resolution chain uses. */
const LAT = 40;

const hoursAt = (dayIndex: number, lat = LAT): number =>
  CelestialApi.daylightSecondsFor(EARTH_LIKE, lat, dayIndex * DAY) / 3600;

/** The day index of each solstice/equinox under `δ = tilt·sin(2π·d/Y)`. */
const SPRING_EQUINOX = 0;
const SUMMER_SOLSTICE = YEAR / 4;
const AUTUMN_EQUINOX = YEAR / 2;
const WINTER_SOLSTICE = (YEAR * 3) / 4;

describe('daylength', () => {
  it('⭐ is twelve hours at an equinox, at every latitude', () => {
    // Declination is zero, so `cos(H0) = 0` whatever the latitude — the
    // one day of the year the whole world agrees on.
    for (const lat of [0, 20, 40, 60]) {
      expect(hoursAt(SPRING_EQUINOX, lat)).toBeCloseTo(12, 4);
      expect(hoursAt(AUTUMN_EQUINOX, lat)).toBeCloseTo(12, 4);
    }
  });

  it('⭐⭐ the summer solstice is the longest day and the winter one the shortest', () => {
    const summer = hoursAt(SUMMER_SOLSTICE);
    const winter = hoursAt(WINTER_SOLSTICE);
    const equinox = hoursAt(SPRING_EQUINOX);
    expect(summer).toBeGreaterThan(equinox);
    expect(winter).toBeLessThan(equinox);
    // At 40° on a 23.5°-tilt world that is roughly 15 h against 9 h —
    // the real figures for Madrid, Philadelphia or Beijing.
    expect(summer).toBeGreaterThan(14.5);
    expect(summer).toBeLessThan(15.5);
    expect(winter).toBeGreaterThan(8.5);
    expect(winter).toBeLessThan(9.5);
    // And the year is symmetric about the equinoxes.
    expect(summer + winter).toBeCloseTo(24, 3);
  });

  it('the swing is wider the further from the equator — which is WHY winter bites', () => {
    const swing = (lat: number): number =>
      hoursAt(SUMMER_SOLSTICE, lat) - hoursAt(WINTER_SOLSTICE, lat);
    expect(swing(10)).toBeLessThan(swing(40));
    expect(swing(40)).toBeLessThan(swing(60));
  });

  it('⚠ polar day and polar night are the honest limits, not special cases', () => {
    // Above the Arctic circle (90 − 23.5 = 66.5°) both genuinely happen.
    expect(hoursAt(SUMMER_SOLSTICE, 75)).toBeCloseTo(24, 6);
    expect(hoursAt(WINTER_SOLSTICE, 75)).toBeCloseTo(0, 6);
  });

  it('is continuous through the year — no jump anywhere', () => {
    let previous = hoursAt(0);
    for (let d = 1; d <= YEAR; d++) {
      const next = hoursAt(d);
      expect(Math.abs(next - previous)).toBeLessThan(0.2);
      previous = next;
    }
  });
});
