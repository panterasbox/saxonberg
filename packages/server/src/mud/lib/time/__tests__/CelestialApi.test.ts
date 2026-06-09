/**
 * CelestialApi tests — profile resolution, instantaneous queries
 * across the year, event times, and the astronomical scheduling
 * shortcuts driven through the Wave-1 `_advanceForTesting` seam
 * (acceptance AC7). A bare location stub (`getZone → null`) exercises
 * the `EARTH_LIKE` fallback; no zone authoring needed for v1.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CelestialApi } from '../../../api/celestial';
import { WorldClockApi } from '../../../api/worldclock';
import { EARTH_LIKE } from '../CelestialProfile';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';

const D = EARTH_LIKE.dayLengthSeconds;
const loc = { getZone: () => null } as unknown as Stuff;
const at = (s: number): Quantity<'s'> => Quantity.of(s, 's');

describe('CelestialApi', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  describe('profileFor', () => {
    it('falls back to EARTH_LIKE when no zone defines a profile', async () => {
      expect(await CelestialApi.profileFor(loc)).toBe(EARTH_LIKE);
    });
  });

  describe('instantaneous queries', () => {
    it('isDayAt is true at noon and false at midnight', async () => {
      expect(await CelestialApi.isDayAt(loc, at(D / 2))).toBe(true);
      expect(await CelestialApi.isDayAt(loc, at(0))).toBe(false);
    });

    it('sunAltitude / sunAzimuth return degrees Quantities', async () => {
      const alt = await CelestialApi.sunAltitude(loc, at(D / 2));
      const az = await CelestialApi.sunAzimuth(loc, at(D / 2));
      expect(alt.rawValue()).toBeCloseTo(48, 1); // 90 − |42 − 0|
      expect(az.rawValue()).toBeCloseTo(180, 1); // due south
    });

    it('currentSeason walks the quarters of the year', async () => {
      expect(await CelestialApi.currentSeason(loc, at(0))).toBe('spring');
      expect(await CelestialApi.currentSeason(loc, at(100 * D))).toBe('summer');
      expect(await CelestialApi.currentSeason(loc, at(200 * D))).toBe('fall');
      expect(await CelestialApi.currentSeason(loc, at(300 * D))).toBe('winter');
    });
  });

  describe('event times', () => {
    it('nextSunrise / nextSunset land at the equinox 06:00 / 18:00', async () => {
      const sunrise = await CelestialApi.nextSunrise(loc, at(0));
      const sunset = await CelestialApi.nextSunset(loc, at(0));
      expect(sunrise.rawValue()).toBeCloseTo(D / 4, 0);
      expect(sunset.rawValue()).toBeCloseTo((3 * D) / 4, 0);
    });

    it('nextFullMoon returns a future game-time', () => {
      const full = CelestialApi.nextFullMoon(at(0));
      expect(full.rawValue()).toBe(15 * D);
    });
  });

  describe('astronomical scheduling shortcuts', () => {
    it('atNextSunrise fires at sunrise (driven via the world-clock seam)', async () => {
      let fired = 0;
      await CelestialApi.atNextSunrise(loc, () => fired++);
      const sunriseMs = (D / 4) * 1000; // scale 1 → game-seconds = ms/1000
      WorldClockApi._advanceForTesting(sunriseMs - 1000);
      expect(fired).toBe(0);
      WorldClockApi._advanceForTesting(1000);
      expect(fired).toBe(1);
    });

    it('atNextFullMoon fires at the full moon', () => {
      let fired = 0;
      CelestialApi.atNextFullMoon(() => fired++);
      WorldClockApi._advanceForTesting(15 * D * 1000);
      expect(fired).toBe(1);
    });
  });
});
