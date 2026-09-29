/**
 * The sky's illuminance curve (envelope D1/D2) — the one number that
 * makes `look` on a street at noon and at midnight two different
 * sentences.
 *
 * ⭐ These are the anchors the curve was designed against, so they are
 * the places it is allowed to be argued with. Each asserts what a PERSON
 * would see, via the band the lux lands in on a 9 m² Terminus cell at
 * the shipped 80-lux noon dial — because "0.41" is not a claim anybody
 * can check and "a winter noon is `lit`, not `bright`" is.
 *
 * Pure geometry: no clock, no world, no singleton state.
 */

import { describe, it, expect } from 'vitest';
import { EARTH_LIKE } from '../CelestialProfile';
import { CelestialApi } from '../../../api/celestial';

const D = EARTH_LIKE.dayLengthSeconds; // 86_400
const Y = EARTH_LIKE.yearLengthDays; // 360
const LAT = 42;
const SYNODIC = EARTH_LIKE.moons[0]?.synodicPeriodDays ?? 30;

/** Noon on day `d`. Day 0 is the vernal equinox. */
const noonOf = (d: number): number => d * D + D / 2;
/** Midnight opening day `d`. */
const midnightOf = (d: number): number => d * D;

const factor = (t: number): number =>
  CelestialApi.skyIlluminanceFactor(EARTH_LIKE, LAT, t);

/**
 * The lux a 3 m Terminus cell reads at time `t`, at the shipped noon
 * dial: `noonLux × area × factor ÷ area` — the area cancels, which is
 * exactly why an unauthored room is lit correctly for its size.
 */
const luxAt = (t: number): number => 80 * factor(t);

describe('the sun', () => {
  it('is near its full value at an equinox noon and falls to the twilight tail at midnight', () => {
    expect(factor(noonOf(0))).toBeGreaterThan(0.6);
    expect(factor(midnightOf(0))).toBeLessThan(0.01);
  });

  it('makes a winter noon dimmer than a summer noon — the same street, six months apart', () => {
    const summer = factor(noonOf(Y / 4));
    const winter = factor(noonOf((3 * Y) / 4));
    expect(summer).toBeGreaterThan(winter);
    // Summer noon at 42°N: sun at 71.5°, sin = 0.95 → ~76 lux, `bright`.
    expect(luxAt(noonOf(Y / 4))).toBeGreaterThan(60);
    // Winter noon: sun at 24.5°, sin = 0.41 → ~33 lux — `lit`, not
    // `bright`. Short days are DIMMER days, and that falls out of the
    // declination rather than being asserted anywhere.
    expect(luxAt(noonOf((3 * Y) / 4))).toBeGreaterThan(20);
    expect(luxAt(noonOf((3 * Y) / 4))).toBeLessThan(60);
  });

  it('falls through dusk rather than off a cliff at sunset', () => {
    const sunset = CelestialApi.sunsetSecOfDay(EARTH_LIKE, LAT, 0) as number;
    const at = (offsetS: number): number => factor(sunset + offsetS);
    // Monotone down through the hour after sunset, and still readable
    // at the horizon.
    expect(at(0)).toBeGreaterThan(at(600));
    expect(at(600)).toBeGreaterThan(at(1800));
    expect(at(1800)).toBeGreaterThan(at(3600));
    // Each 3° of depression is a factor of ten: the twilight decade.
    expect(at(0)).toBeCloseTo(0.1, 2);
  });
});

describe('the moon — S1, the moonlight floor', () => {
  /**
   * The moon is full at synodic/2 and highest when it is opposite the
   * sun, which for a full moon is local midnight. Sweep the night and
   * take the best moment, so the test does not depend on the exact
   * lunar hour-angle lag.
   */
  const bestNightFactor = (dayIndex: number): number => {
    let best = 0;
    for (let s = 0; s < D; s += 600) {
      const t = dayIndex * D + s;
      if (CelestialApi.solarAltitudeDeg(EARTH_LIKE, LAT, t) > -6) continue;
      best = Math.max(best, factor(t));
    }
    return best;
  };

  const fullMoonDay = Math.round(SYNODIC / 2);

  it('a full moon high in a clear sky is enough to move by, and not enough to read by', () => {
    const lux = 80 * bestNightFactor(fullMoonDay);
    // ⭐ `very-dim` is 1..5 lux: shapes, a door, that somebody is there.
    // NOT `dim` (5+), which is where you could start making things out.
    expect(lux).toBeGreaterThanOrEqual(1);
    expect(lux).toBeLessThan(5);
  });

  it('a new moon leaves only starlight, and that is pitch dark to a human', () => {
    const lux = 80 * bestNightFactor(0);
    // `pitch-black` is below 1 lux. A band-shifted species reads this
    // one band brighter and can move by it — which is the whole of S9.
    expect(lux).toBeLessThan(1);
  });

  it('a half moon is about a TENTH of a full one, not a half — the phase term is squared', () => {
    // ⚠ Comparing "the best moment of a quarter-moon night" to "the best
    // moment of a full-moon night" does NOT test the phase term: the
    // moon's ALTITUDE varies between those nights by more than the phase
    // does, and the first draft of this test failed for that reason
    // rather than for a bug. So normalise the altitude out and compare
    // the phase term alone.
    const peak = (lo: number, hi: number): number => {
      let best = 0;
      for (let s = 0; s < SYNODIC * D; s += 600) {
        // Deep night only, so the sun's twilight tail (< 1e-6 below
        // −18°) cannot contaminate the moon's share.
        // Nautical twilight or darker: the sun's tail is then under 1e-4
        // of the noon value, which is negligible beside a moon term of
        // a few thousandths. ⚠ NOT astronomical twilight (−18°) — a
        // first-quarter moon is highest at sunset and low by then, which
        // is a real fact about the sky and made the bucket empty.
        if (CelestialApi.solarAltitudeDeg(EARTH_LIKE, LAT, s) > -12) continue;
        const beta = CelestialApi.moonAltitudeDeg(EARTH_LIKE, LAT, SYNODIC, s);
        if (beta < 10) continue;
        const phase = CelestialApi.moonPhaseFor(EARTH_LIKE, SYNODIC, s);
        if (phase < lo || phase > hi) continue;
        // factor = moonMax·k·sin β + starlight, so this recovers moonMax·k.
        best = Math.max(best, (factor(s) - 0.002) / Math.sin((beta * Math.PI) / 180));
      }
      return best;
    };
    const half = peak(0.22, 0.28);
    const full = peak(0.47, 0.53);
    expect(full).toBeGreaterThan(0);
    expect(half).toBeGreaterThan(0);
    // k(0.5) = 1 and k(0.25) = 0.25, so a half moon is a quarter of a
    // full one by this term — and once the real moon's opposition surge
    // is in the picture the observed ratio is nearer a tenth. What the
    // curve must not do is make a half moon HALF a full moon.
    expect(half).toBeLessThan(full / 3);
    expect(full).toBeCloseTo(0.03, 3);
  });

  it('never leaves the night at exactly zero — starlight is the floor', () => {
    for (let d = 0; d < SYNODIC; d++) {
      expect(factor(midnightOf(d))).toBeGreaterThan(0);
    }
  });
});

describe('the dials', () => {
  it('a brighter moon dial lifts the night and leaves the day alone', () => {
    const t = fullMoonMidnight();
    const dim = CelestialApi.skyIlluminanceFactor(EARTH_LIKE, LAT, t, {
      moonMax: 0.01,
    });
    const bright = CelestialApi.skyIlluminanceFactor(EARTH_LIKE, LAT, t, {
      moonMax: 0.06,
    });
    expect(bright).toBeGreaterThan(dim);
    const noon = noonOf(0);
    expect(
      CelestialApi.skyIlluminanceFactor(EARTH_LIKE, LAT, noon, { moonMax: 0.06 }),
    ).toBeCloseTo(factor(noon), 3);
  });

  it('never exceeds 1 — the factor is a fraction of a clear noon sun', () => {
    for (let d = 0; d < Y; d += 7) {
      for (let s = 0; s < D; s += 3600) {
        const f = CelestialApi.skyIlluminanceFactor(EARTH_LIKE, LAT, d * D + s, {
          moonMax: 0.5,
          starlight: 0.4,
        });
        expect(f).toBeLessThanOrEqual(1);
        expect(f).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

/** The darkest hour of the fullest moon — where the moon term peaks. */
function fullMoonMidnight(): number {
  return Math.round(SYNODIC / 2) * D;
}
