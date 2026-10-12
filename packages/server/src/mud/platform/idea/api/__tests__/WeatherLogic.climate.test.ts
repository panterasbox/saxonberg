/**
 * The climate expression (climate build W0) — one temperature from four
 * levers, pinned as ARITHMETIC at literal sites and literal times.
 *
 * These are the calibration pins: they are the authority over the
 * starting dial values (`climate.poleMeanK` / `climate.equatorMeanK` …),
 * not the other way round. A dial change that moves the default realm's
 * winter, the lag, the damping ratio or the lethality floor fails here.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WeatherApi } from '../../../../api/weather';
import { Quantity } from '../../../../lib/quantity';
import {
  DEFAULT_CLIMATE_SITE,
  type ClimateSite,
} from '../../../../lib/weather/WeatherType';

const DAY = 86_400;
const YEAR = 360;
/** Day 0 is the northern vernal equinox; the winter solstice is day 270. */
const WINTER_SOLSTICE = 270;

const site = (
  latitudeDeg: number,
  continentality = 0.5,
  elevationM = 0,
  offsetK = 0,
): ClimateSite => ({ latitudeDeg, continentality, elevationM, offsetK });

const at = (s: ClimateSite, t: number): number =>
  WeatherApi.temperatureAt(s, null, Quantity.of(t, 's')).rawValue();

/** A day's mean: four samples six hours apart cancel the diurnal cosine. */
const dayMean = (s: ClimateSite, day: number): number =>
  (at(s, day * DAY) +
    at(s, day * DAY + 6 * 3600) +
    at(s, day * DAY + 12 * 3600) +
    at(s, day * DAY + 18 * 3600)) /
  4;

const year = (s: ClimateSite): number[] =>
  Array.from({ length: YEAR }, (_, d) => dayMean(s, d));

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The centre day of the coldest 30-day window, wrapping the year. */
function coldestWindowCentre(days: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  let centre = 0;
  for (let i = 0; i < YEAR; i++) {
    let sum = 0;
    for (let k = 0; k < 30; k++) sum += days[(i + k) % YEAR]!;
    if (sum < best) {
      best = sum;
      centre = (i + 15) % YEAR;
    }
  }
  return centre;
}

const range = (days: number[]): number => Math.max(...days) - Math.min(...days);

describe('the climate expression — one temperature from four levers', () => {
  beforeAll(() => {
    // The weather's own deviation is pinned out: these pins are the
    // climate's, and a procgen storm on one sample day is not a fact
    // about the climate.
    WeatherApi._forceTypeForTesting('clear');
  });
  afterAll(() => {
    WeatherApi._resetForTesting();
  });

  describe('the default site (42°, sea level, continentality 0.5)', () => {
    const days = (): number[] => year(DEFAULT_CLIMATE_SITE);

    it('reproduces the honest temperate year', () => {
      const d = days();
      expect(mean(d)).toBeGreaterThanOrEqual(282);
      expect(mean(d)).toBeLessThanOrEqual(286);
      // Winter quarter: days 270–359; summer quarter: days 90–179.
      expect(mean(d.slice(270, 360))).toBeGreaterThanOrEqual(270);
      expect(mean(d.slice(270, 360))).toBeLessThanOrEqual(275);
      expect(mean(d.slice(90, 180))).toBeGreaterThanOrEqual(292);
      expect(mean(d.slice(90, 180))).toBeLessThanOrEqual(298);
    });

    it('lags the sun: the coldest month comes 20–45 days after the solstice', () => {
      const lag = coldestWindowCentre(days()) - WINTER_SOLSTICE;
      expect(lag).toBeGreaterThanOrEqual(20);
      expect(lag).toBeLessThanOrEqual(45);
    });

    it('keeps the coldest clear dawn of the year at or above 268 K (the lethality floor)', () => {
      let coldest = Number.POSITIVE_INFINITY;
      for (let d = 0; d < YEAR; d++) {
        coldest = Math.min(coldest, at(DEFAULT_CLIMATE_SITE, d * DAY + 3 * 3600));
      }
      expect(coldest).toBeGreaterThanOrEqual(268);
    });
  });

  it('a coast lags later than a continent, but not by more than 20 days', () => {
    const inland = coldestWindowCentre(year(site(42, 1)));
    const coast = coldestWindowCentre(year(site(42, 0)));
    expect(coast).toBeGreaterThan(inland);
    expect(coast - inland).toBeLessThanOrEqual(20);
  });

  it('a continent swings at least twice as hard as a coast at 60° (Minneapolis vs Seattle)', () => {
    expect(range(year(site(60, 1)))).toBeGreaterThanOrEqual(
      2 * range(year(site(60, 0))),
    );
  });

  it('the annual mean falls monotonically with |latitude|, in both hemispheres', () => {
    const lats = [0, 20, 40, 60, 80];
    const north = lats.map((l) => mean(year(site(l))));
    const south = lats.map((l) => mean(year(site(-l))));
    for (let i = 1; i < lats.length; i++) {
      expect(north[i]!).toBeLessThan(north[i - 1]!);
      expect(south[i]!).toBeLessThan(south[i - 1]!);
    }
  });

  it('the equator barely has seasons', () => {
    expect(range(year(site(0)))).toBeLessThan(6);
  });

  it('the pole is cold, and its polar night relaxes to the pole figure', () => {
    const pole = year(site(90));
    const coldestQuarter = Math.min(
      ...[0, 90, 180, 270].map((q) => mean(pole.slice(q, q + 90))),
    );
    expect(coldestQuarter).toBeLessThan(262);
    // Day 355 at 89° N, continental (no damping): every day of the
    // land's memory lies in polar night, so the season IS the pole figure.
    expect(dayMean(site(89, 1), 355)).toBeCloseTo(247, 0);
  });

  it('altitude lapses the air: 1000 m is 6.5 K colder', () => {
    const t = 100 * DAY + 5 * 3600;
    expect(at(site(42, 0.5, 0), t) - at(site(42, 0.5, 1000), t)).toBeCloseTo(6.5, 6);
  });

  it('the offset is the anomaly lever: −7 K is exactly 7 K colder', () => {
    const t = 33 * DAY;
    expect(at(site(42), t) - at(site(42, 0.5, 0, -7), t)).toBeCloseTo(7, 6);
  });

  it('is continuous in time, across a day boundary', () => {
    const t = 41 * DAY;
    expect(Math.abs(at(DEFAULT_CLIMATE_SITE, t - 1) - at(DEFAULT_CLIMATE_SITE, t))).toBeLessThan(0.01);
    const circle = site(-66, 1, 900, -7);
    expect(Math.abs(at(circle, t - 1) - at(circle, t))).toBeLessThan(0.01);
  });

  it('the southern hemisphere runs half a year out of step', () => {
    const t = 10 * DAY;
    expect(WeatherApi.seasonAt(site(42), Quantity.of(t, 's'))).toBe('spring');
    expect(WeatherApi.seasonAt(site(-42), Quantity.of(t, 's'))).toBe('fall');
    const july = 120 * DAY;
    expect(WeatherApi.seasonAt(site(-42), Quantity.of(july, 's'))).toBe('winter');
    // …and its cold agrees with its season: southern winter is colder
    // than southern summer.
    const s = year(site(-42));
    expect(mean(s.slice(90, 180))).toBeLessThan(mean(s.slice(270, 360)));
  });

  describe('the drive sites', () => {
    it('the Circle (−66°, continental, 900 m, −7 K) cools day on day through the drive, and had a real summer', () => {
      const circle = site(-66, 1, 900, -7);
      const d = [0, 1, 2, 3, 4, 5].map((day) => dayMean(circle, day));
      for (let i = 1; i < d.length; i++) expect(d[i]!).toBeLessThan(d[i - 1]!);
      expect(d[0]!).toBeLessThan(273.15);
      expect(Math.max(...year(circle))).toBeGreaterThan(285);
    });

    it('the north station (71°, 0.7, 50 m) is genuinely cold on day 0', () => {
      expect(dayMean(site(71, 0.7, 50), 0)).toBeLessThan(262);
    });

    it('a mid-slope sugarbush (42°, 800 m) straddles freezing on day 0; sea level does not', () => {
      const high = WeatherApi.dailyRangeAt(site(42, 0.5, 800), null, Quantity.of(0, 's'));
      expect(high.minK).toBeLessThan(273.15);
      expect(high.maxK).toBeGreaterThan(273.15);
      const low = WeatherApi.dailyRangeAt(DEFAULT_CLIMATE_SITE, null, Quantity.of(0, 's'));
      expect(low.minK).toBeGreaterThan(273.15);
    });

    it('a 1500 m pass at 42° never reads below 255 K under a clear sky', () => {
      let coldest = Number.POSITIVE_INFINITY;
      for (let d = 0; d < YEAR; d++) {
        coldest = Math.min(coldest, at(site(42, 0.5, 1500), d * DAY + 3 * 3600));
      }
      expect(coldest).toBeGreaterThanOrEqual(255);
    });
  });
});
