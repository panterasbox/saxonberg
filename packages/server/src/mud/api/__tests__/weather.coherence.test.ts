/**
 * Weather coherence — segment-to-segment transitions are plausible (the
 * grammar forbids `clear → storm` without an intervening step), warmup
 * anchors are always calm, and the season bias makes snow winter-leaning
 * and summer-absent (Acceptance: Coherence / season-bias). Observed
 * through `WeatherApi.weatherAt`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../weather';
import { StuffApi } from '../stuff';
import { Quantity } from '../../lib/quantity';
import {
  WEATHER_DEFAULTS,
  TRANSITIONS,
  ANCHOR_CANDIDATES,
  type WeatherType,
} from '../../lib/weather/WeatherType';

const SEG = WEATHER_DEFAULTS.SEGMENT_LENGTH_S;
const WARMUP = WEATHER_DEFAULTS.GRAMMAR_WARMUP;

/** The type at a segment (sampled mid-segment so frac is well inside). */
function typeAt(seg: number): WeatherType {
  return WeatherApi.weatherAt(Quantity.of(seg * SEG + 0.5 * SEG, 's'), null)
    .type;
}

const ANCHOR_TYPES = new Set(ANCHOR_CANDIDATES.map((c) => c.type));

describe('WeatherApi.weatherAt — coherence', () => {
  afterEach(() => {
    WeatherApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('every within-window transition is allowed by the grammar', () => {
    let prev = typeAt(0);
    for (let seg = 1; seg < 600; seg++) {
      const cur = typeAt(seg);
      if (seg % WARMUP === 0) {
        // A fresh warmup anchor — must be a calm type, not a transition.
        expect(ANCHOR_TYPES.has(cur)).toBe(true);
      } else {
        const allowed = new Set(TRANSITIONS[prev].map((t) => t.type));
        expect(
          allowed.has(cur),
          `illegal transition ${prev} → ${cur} at segment ${seg}`,
        ).toBe(true);
      }
      prev = cur;
    }
  });

  it('clear never jumps straight to storm', () => {
    let prev = typeAt(0);
    for (let seg = 1; seg < 800; seg++) {
      const cur = typeAt(seg);
      if (seg % WARMUP !== 0) {
        expect(prev === 'clear' && cur === 'storm').toBe(false);
      }
      prev = cur;
    }
  });

  it('warmup anchors are always calm (never rain/storm/snow)', () => {
    for (let k = 0; k < 80; k++) {
      const anchorSeg = k * WARMUP;
      const t = typeAt(anchorSeg);
      expect(['rain', 'storm', 'snow']).not.toContain(t);
    }
  });

  it('snow leans winter and is absent in summer', () => {
    // 360-day year, 4 segments/day. Winter = days [270,360); summer =
    // days [90,180). Count snow occurrences across each quarter.
    const segPerDay = 86_400 / SEG;
    const winterStart = 270 * segPerDay;
    const summerStart = 90 * segPerDay;
    const span = 90 * segPerDay; // a full quarter

    let winterSnow = 0;
    let summerSnow = 0;
    for (let i = 0; i < span; i++) {
      if (typeAt(winterStart + i) === 'snow') winterSnow++;
      if (typeAt(summerStart + i) === 'snow') summerSnow++;
    }

    expect(summerSnow).toBe(0); // SEASON_BIAS zeroes snow in summer
    expect(winterSnow).toBeGreaterThan(0); // snow-leaning in winter
  });
});
