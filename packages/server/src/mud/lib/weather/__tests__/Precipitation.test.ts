/**
 * The precipitation integral (watershed W1) —
 * `WeatherApi.precipitationBetween(t0, t1, locality)`.
 *
 * The build's spine, tested as a spine: an EXACT segment walk that two
 * consumers share. Weather is a pure function of time, so a window is
 * summed rather than sampled — the tests below pin exactness, replay
 * stability, additivity over a split, the cap, the descriptor split
 * between liquid and snow, and the annual total the authored rates
 * produce. See docs/subsystems/watershed.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../../../api/weather';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import {
  PRECIPITATION_RATES_MM_PER_HOUR,
  WEATHER_DEFAULTS,
  WEATHER_PROFILES,
  WEATHER_TYPES,
} from '../WeatherType';

const L = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
const s = (n: number): Quantity<'s'> => Quantity.of(n, 's');

/** Sum of both halves — total water-equivalent that fell. */
function totalMm(t0: number, t1: number): number {
  const r = WeatherApi.precipitationBetween(s(t0), s(t1), null);
  return r.liquid.rawValue() + r.frozen.rawValue();
}

describe('precipitationBetween — the exact segment walk', () => {
  afterEach(() => {
    WeatherApi._forceTypeForTesting(null);
    StuffApi.clearAll();
  });

  it('a whole rain segment delivers exactly the authored hourly rate × its hours', () => {
    WeatherApi._forceTypeForTesting('rain');
    const r = WeatherApi.precipitationBetween(s(0), s(L), null);
    expect(r.liquid.rawValue()).toBeCloseTo(
      PRECIPITATION_RATES_MM_PER_HOUR.rain * (L / 3600),
      10,
    );
    expect(r.frozen.rawValue()).toBe(0);
    expect(r.coveredS).toBe(L);
  });

  it('a PARTIAL segment is prorated, not rounded to the segment', () => {
    WeatherApi._forceTypeForTesting('rain');
    // One hour inside a six-hour segment.
    const r = WeatherApi.precipitationBetween(s(0), s(3600), null);
    expect(r.liquid.rawValue()).toBeCloseTo(
      PRECIPITATION_RATES_MM_PER_HOUR.rain,
      10,
    );
    expect(r.coveredS).toBe(3600);
  });

  it('a window straddling a boundary sums both segments, each by its own overlap', () => {
    WeatherApi._forceTypeForTesting('storm');
    // The last hour of segment 0 plus the first two of segment 1.
    const r = WeatherApi.precipitationBetween(s(L - 3600), s(L + 7200), null);
    expect(r.liquid.rawValue()).toBeCloseTo(
      PRECIPITATION_RATES_MM_PER_HOUR.storm * 3,
      10,
    );
  });

  it('replaying the same window gives the same answer to the last millimetre', () => {
    const a = totalMm(1_000_000, 1_000_000 + 40 * L);
    const b = totalMm(1_000_000, 1_000_000 + 40 * L);
    expect(a).toBe(b);
  });

  it('is ADDITIVE — splitting a window anywhere sums to integrating it whole', () => {
    const t0 = 5_000_000;
    const t1 = t0 + 37 * L + 1234;
    const mid = t0 + 11 * L + 777;
    expect(totalMm(t0, mid) + totalMm(mid, t1)).toBeCloseTo(
      totalMm(t0, t1),
      9,
    );
  });

  it('a three-day absence integrates exactly, and equals the sum of its days', () => {
    const t0 = 9_000_000;
    const day = 86_400;
    expect(
      totalMm(t0, t0 + day) +
        totalMm(t0 + day, t0 + 2 * day) +
        totalMm(t0 + 2 * day, t0 + 3 * day),
    ).toBeCloseTo(totalMm(t0, t0 + 3 * day), 9);
  });

  it('an inverted or empty window is zero everywhere, and says so with coveredS', () => {
    for (const [a, b] of [[10, 10], [100, 10]] as const) {
      const r = WeatherApi.precipitationBetween(s(a), s(b), null);
      expect(r.liquid.rawValue()).toBe(0);
      expect(r.frozen.rawValue()).toBe(0);
      expect(r.coveredS).toBe(0);
    }
  });

  it('snow banks in `frozen`, never in `liquid` — the pack is not run-off', () => {
    WeatherApi._forceTypeForTesting('snow');
    const r = WeatherApi.precipitationBetween(s(0), s(L), null);
    expect(r.liquid.rawValue()).toBe(0);
    expect(r.frozen.rawValue()).toBeCloseTo(
      PRECIPITATION_RATES_MM_PER_HOUR.snow * (L / 3600),
      10,
    );
  });

  it('a dry type contributes nothing at all', () => {
    for (const dry of ['clear', 'overcast', 'fog'] as const) {
      WeatherApi._forceTypeForTesting(dry);
      const r = WeatherApi.precipitationBetween(s(0), s(10 * L), null);
      expect(r.liquid.rawValue()).toBe(0);
      expect(r.frozen.rawValue()).toBe(0);
    }
  });

  it('the rate table covers every weather type — a new type cannot fall through', () => {
    for (const t of WEATHER_TYPES) {
      expect(PRECIPITATION_RATES_MM_PER_HOUR[t]).toBeTypeOf('number');
      // A type that precipitates must carry a rate, and one that does
      // not must carry zero — the descriptor and the table must agree.
      const wet = WEATHER_PROFILES[t].precipitation !== 'none';
      expect(PRECIPITATION_RATES_MM_PER_HOUR[t] > 0).toBe(wet);
    }
  });
});

describe('precipitationBetween — the cap', () => {
  afterEach(() => {
    WeatherApi._forceTypeForTesting(null);
    StuffApi.clearAll();
  });

  it('caps at PRECIPITATION_MAX_SEGMENTS and reports the shortfall in coveredS', () => {
    WeatherApi._forceTypeForTesting('rain');
    const cap = WEATHER_DEFAULTS.PRECIPITATION_MAX_SEGMENTS;
    const span = (cap + 500) * L;
    const r = WeatherApi.precipitationBetween(s(0), s(span), null);
    expect(r.coveredS).toBe(cap * L);
    expect(r.liquid.rawValue()).toBeCloseTo(
      PRECIPITATION_RATES_MM_PER_HOUR.rain * ((cap * L) / 3600),
      6,
    );
  });

  it('keeps the TAIL of the window, not the head — you come back to recent weather', () => {
    const cap = WEATHER_DEFAULTS.PRECIPITATION_MAX_SEGMENTS;
    const end = 20_000_000;
    const long = WeatherApi.precipitationBetween(s(0), s(end), null);
    const tail = WeatherApi.precipitationBetween(
      s(end - cap * L),
      s(end),
      null,
    );
    // The capped walk is exactly the last `cap` segments' walk. (The end
    // is segment-aligned so the tail window has no partial head.)
    expect(long.liquid.rawValue()).toBeCloseTo(tail.liquid.rawValue(), 9);
    expect(long.frozen.rawValue()).toBeCloseTo(tail.frozen.rawValue(), 9);
  });

  it('an uncapped window reports its full length', () => {
    const r = WeatherApi.precipitationBetween(s(0), s(3 * L), null);
    expect(r.coveredS).toBe(3 * L);
  });
});

describe('precipitationBetween — the authored rates produce a plausible climate', () => {
  afterEach(() => StuffApi.clearAll());

  it('a game year of procgen weather totals a wet-temperate annual rainfall', () => {
    // The cap is a per-CALL bound, so a year is walked a month at a time
    // — which also re-proves additivity at scale.
    const yearS = 365 * 86_400;
    const step = 30 * 86_400;
    let mm = 0;
    for (let t = 0; t < yearS; t += step) {
      mm += totalMm(t, Math.min(t + step, yearS));
    }
    // Not a dial assertion — a CLIMATE assertion. Anything outside this
    // band means the realm has quietly become a desert or a rainforest.
    expect(mm).toBeGreaterThan(400);
    expect(mm).toBeLessThan(2500);
  });

  it('some of that year fell as snow — the pack the spring rise comes from', () => {
    const yearS = 365 * 86_400;
    const step = 30 * 86_400;
    let frozen = 0;
    for (let t = 0; t < yearS; t += step) {
      frozen += WeatherApi.precipitationBetween(
        s(t),
        s(Math.min(t + step, yearS)),
        null,
      ).frozen.rawValue();
    }
    expect(frozen).toBeGreaterThan(0);
  });
});
