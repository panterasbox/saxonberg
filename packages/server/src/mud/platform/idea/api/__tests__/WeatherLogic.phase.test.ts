/**
 * Precipitation phase and amount (climate build W3, D5).
 *
 *  - With a site, a segment's phase is the TEMPERATURE's: a `snow`
 *    segment over a warm site is liquid, a `rain` segment over a cold one
 *    is frozen, and one segment splits by elevation.
 *  - A Locality's authored intensity multiplies the integral; unauthored,
 *    the latitude default thins it toward the pole.
 *  - With no site, nothing changes (the descriptor decides, factor 1).
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../../../../api/weather';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import Locality from '../../Locality';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  DEFAULT_CLIMATE_SITE,
  WEATHER_DEFAULTS,
  type ClimateSite,
} from '../../../../lib/weather/WeatherType';

const DAY = 86_400;
const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
const s = (n: number): Quantity<'s'> => Quantity.of(n, 's');
const site = (latitudeDeg: number, elevationM = 0, continentality = 0.5): ClimateSite => ({
  latitudeDeg,
  elevationM,
  continentality,
  offsetK: 0,
});

/** One whole segment's integral starting at `t`. */
const oneSegment = (t: number, loc: Locality | null, where: ClimateSite | null) =>
  WeatherApi.precipitationBetween(s(t), s(t + SEG), loc, where);

afterEach(() => {
  WeatherApi._resetForTesting();
  StuffApi.clearAll();
});

describe('phase is the temperature\'s, given a site', () => {
  it('a snow segment over a warm site falls as rain', () => {
    WeatherApi._forceTypeForTesting('snow');
    const fell = oneSegment(100 * DAY, null, site(0)); // the equator in any season
    expect(fell.frozen.rawValue()).toBe(0);
    expect(fell.liquid.rawValue()).toBeGreaterThan(0);
  });

  it('a rain segment over a cold site falls as snow', () => {
    WeatherApi._forceTypeForTesting('rain');
    const fell = oneSegment(0, null, site(89, 0, 1)); // the pole at the end of its night
    expect(fell.liquid.rawValue()).toBe(0);
    expect(fell.frozen.rawValue()).toBeGreaterThan(0);
  });

  it('one segment snows on the peak and rains in the valley', () => {
    WeatherApi._forceTypeForTesting('storm');
    const t = 100 * DAY;
    const valley = oneSegment(t, null, site(42, 0));
    const peak = oneSegment(t, null, site(42, 3000));
    expect(valley.frozen.rawValue()).toBe(0);
    expect(peak.liquid.rawValue()).toBe(0);
    // The same water either way — only where it goes differs.
    expect(peak.frozen.rawValue()).toBeCloseTo(valley.liquid.rawValue(), 9);
  });

  it('segments carry their phase, and it is a property of the segment', () => {
    WeatherApi._forceTypeForTesting('rain');
    const cold = site(89, 0, 1);
    const whole = WeatherApi.segmentsBetween(s(0), s(SEG), null, undefined, cold);
    const part = WeatherApi.segmentsBetween(s(SEG / 3), s(SEG / 2), null, undefined, cold);
    expect(whole[0]!.phase).toBe('snow');
    expect(part[0]!.phase).toBe('snow');
  });

  it('with no site, the descriptor decides exactly as before', () => {
    WeatherApi._forceTypeForTesting('snow');
    const fell = oneSegment(100 * DAY, null, null);
    expect(fell.liquid.rawValue()).toBe(0);
    expect(fell.frozen.rawValue()).toBeGreaterThan(0);
    const seg = WeatherApi.segmentsBetween(s(0), s(SEG), null)[0]!;
    expect(seg.phase).toBe('snow');
  });
});

describe('amount is the place\'s', () => {
  const total = (loc: Locality | null, where: ClimateSite | null): number => {
    const f = oneSegment(100 * DAY, loc, where);
    return f.liquid.rawValue() + f.frozen.rawValue();
  };

  it('a Locality\'s intensity 2 doubles the integral', () => {
    WeatherApi._forceTypeForTesting('rain');
    const wet = makeStuff(() => new Locality());
    wet.setPrecipitationIntensity(2);
    const plain = makeStuff(() => new Locality());
    expect(total(wet, DEFAULT_CLIMATE_SITE)).toBeCloseTo(2 * total(plain, DEFAULT_CLIMATE_SITE), 9);
    // …with or without a site: the authored number is the Locality's.
    expect(total(wet, null)).toBeCloseTo(2 * total(plain, null), 9);
  });

  it('unauthored, the high latitudes are thinner — 0.4 at 80°, 1 up to 55°', () => {
    WeatherApi._forceTypeForTesting('rain');
    const at42 = total(null, site(42));
    expect(total(null, site(55))).toBeCloseTo(at42, 9);
    expect(total(null, site(80))).toBeCloseTo(0.4 * at42, 9);
    expect(total(null, site(-80))).toBeCloseTo(0.4 * at42, 9);
    expect(total(null, site(67.5))).toBeCloseTo(0.7 * at42, 9);
  });

  it('an authored intensity beats the latitude default', () => {
    WeatherApi._forceTypeForTesting('rain');
    const polarWet = makeStuff(() => new Locality());
    polarWet.setPrecipitationIntensity(1.5);
    expect(total(polarWet, site(80))).toBeCloseTo(1.5 * total(null, site(42)), 9);
  });
});

describe('the default site keeps the realm\'s annual climate', () => {
  it('a game year at the default site totals a wet-temperate rainfall, some of it snow', () => {
    const yearS = 360 * DAY;
    const step = 30 * DAY;
    let liquid = 0;
    let frozen = 0;
    for (let t = 0; t < yearS; t += step) {
      const f = WeatherApi.precipitationBetween(
        s(t),
        s(Math.min(t + step, yearS)),
        null,
        DEFAULT_CLIMATE_SITE,
      );
      liquid += f.liquid.rawValue();
      frozen += f.frozen.rawValue();
    }
    expect(liquid + frozen).toBeGreaterThan(400);
    expect(liquid + frozen).toBeLessThan(2500);
    // The winter is real now: some of the year falls as snow at sea level
    // at 42°, and most of it does not.
    expect(frozen).toBeGreaterThan(0);
    expect(frozen).toBeLessThan(liquid);
  });
});
