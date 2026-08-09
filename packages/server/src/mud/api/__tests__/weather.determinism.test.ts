/**
 * Weather determinism — `WeatherApi.weatherAt(timeS, locality)` is a pure
 * function of its inputs (Acceptance: Determinism / forecast). Same
 * inputs ⇒ same output; a future segment's type is computable now; the
 * deviation read matches the sample. No clock needed — `weatherAt` takes
 * `timeS` explicitly.
 */

import "../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../weather';
import { StuffApi } from '../stuff';
import { Quantity } from '../../lib/quantity';
import {
  WEATHER_DEFAULTS,
  WEATHER_FIELDS,
} from '../../lib/weather/WeatherType';

const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;

function at(seconds: number): Quantity<'s'> {
  return Quantity.of(seconds, 's');
}

describe('WeatherApi.weatherAt — determinism', () => {
  afterEach(() => {
    WeatherApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('identical inputs yield byte-identical samples', () => {
    const t = at(3.5 * SEG + 1234);
    const a = WeatherApi.weatherAt(t, null);
    // Fresh Quantity instance, same value — pure function must agree.
    const b = WeatherApi.weatherAt(at(3.5 * SEG + 1234), null);

    expect(b.type).toBe(a.type);
    expect(b.segmentIndex).toBe(a.segmentIndex);
    expect(b.season).toBe(a.season);
    for (const f of WEATHER_FIELDS) {
      expect(b.deviation[f].rawValue()).toBe(a.deviation[f].rawValue());
    }
  });

  it('the type is piecewise-constant within a segment', () => {
    const seg = 42;
    const early = WeatherApi.weatherAt(at(seg * SEG + 0.3 * SEG), null);
    const late = WeatherApi.weatherAt(at(seg * SEG + 0.9 * SEG), null);
    expect(early.segmentIndex).toBe(seg);
    expect(late.segmentIndex).toBe(seg);
    expect(late.type).toBe(early.type);
  });

  it('reports the integer segment index floor(time / SEGMENT_LENGTH)', () => {
    expect(WeatherApi.weatherAt(at(0), null).segmentIndex).toBe(0);
    expect(WeatherApi.weatherAt(at(SEG - 1), null).segmentIndex).toBe(0);
    expect(WeatherApi.weatherAt(at(SEG), null).segmentIndex).toBe(1);
    expect(WeatherApi.weatherAt(at(7 * SEG + 5), null).segmentIndex).toBe(7);
  });

  it('a future segment is computable now and stable (forecast property)', () => {
    // Compute a deep-future segment's type "now"...
    const futureSeg = 100;
    const future = at(futureSeg * SEG + 10);
    const computedNow = WeatherApi.weatherAt(future, null).type;
    // ...and again "after advancing" (a second pure call): must agree.
    const computedLater = WeatherApi.weatherAt(future, null).type;
    expect(computedLater).toBe(computedNow);
  });

  it('deviationFor matches the sample deviation field-for-field', () => {
    const t = at(5 * SEG + 0.5 * SEG);
    const sample = WeatherApi.weatherAt(t, null);
    for (const f of WEATHER_FIELDS) {
      const d = WeatherApi.deviationFor(null, f, t);
      expect(d.unit).toBe(sample.deviation[f].unit);
      expect(d.rawValue()).toBe(sample.deviation[f].rawValue());
    }
  });

  it('the interpolation band keeps the deviation continuous across a boundary', () => {
    // Just before a boundary the deviation is the prior segment's target;
    // just after, the lead-in band ramps from it — so the values straddle
    // the boundary without a discontinuous jump.
    const boundary = 8 * SEG; // a warmup anchor too — still continuous
    const justBefore = WeatherApi.weatherAt(at(boundary - 1), null);
    const atBoundary = WeatherApi.weatherAt(at(boundary), null);
    const dBefore = justBefore.deviation.temperature.rawValue();
    const dAt = atBoundary.deviation.temperature.rawValue();
    // At frac=0 the deviation equals the previous segment's target, which
    // is exactly the value the prior segment held at its end.
    expect(Math.abs(dAt - dBefore)).toBeLessThan(7); // within one profile step
  });
});
