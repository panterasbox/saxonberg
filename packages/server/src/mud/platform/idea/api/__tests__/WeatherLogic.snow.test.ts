/**
 * Snow on the ground, from the weather it has had (climate build W4,
 * D6 + D15) — `WeatherApi.snowCoverAt`, the one function the floor and
 * the catchment share.
 *
 *  - Exact: it equals an independent forward integration started bare
 *    before the last melt-out.
 *  - It GROWS at a site whose cold is days old (the walk-back defect the
 *    review found: a fixed window under a permanent pin slid, constant).
 *  - It never slides at a site that never melts: perennial, at the cap.
 *  - Warm places hold none.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../../../../api/weather';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';
import {
  PRECIPITATION_RATES_MM_PER_HOUR,
  WEATHER_PROFILES,
  type ClimateSite,
  type WeatherType,
} from '../../../../lib/weather/WeatherType';

const DAY = 86_400;
const s = (n: number): Quantity<'s'> => Quantity.of(n, 's');
const site = (
  latitudeDeg: number,
  continentality = 0.5,
  elevationM = 0,
  offsetK = 0,
): ClimateSite => ({ latitudeDeg, continentality, elevationM, offsetK });

afterEach(() => {
  WeatherApi._resetForTesting();
  StuffApi.clearAll();
});

/**
 * The reference: integrate forward from BARE ground `days` before `now`,
 * segment by segment, with nothing but the public surface — the segments
 * (phase included) and the climate. Started before a melt-out, it is the
 * truth, and `snowCoverAt` must agree with it.
 */
function referencePackMm(where: ClimateSite, now: number, days: number): number {
  const segs = WeatherApi.segmentsBetween(
    s(now - days * DAY),
    s(now),
    null,
    days * 4 + 2,
    where,
  );
  // The unauthored latitude default: 1 up to 55°, falling to 0.4 at 80°.
  const lat = Math.abs(where.latitudeDeg);
  const intensity = lat <= 55 ? 1 : 1 - 0.6 * Math.min(1, (lat - 55) / 25);
  let pack = 0;
  for (const seg of segs) {
    const mid = seg.startsAtS + 3 * 3600;
    const airK =
      WeatherApi.climateAt(where, s(mid)).rawValue() +
      WEATHER_PROFILES[seg.type as WeatherType].deviation.temperature.rawValue();
    if (seg.phase === 'snow') {
      pack += PRECIPITATION_RATES_MM_PER_HOUR[seg.type] * intensity * (seg.overlapS / 3600);
    }
    if (airK > 273.15 && pack > 0) {
      pack -= Math.min(pack, 4 * (airK - 273.15) * (seg.overlapS / DAY));
    }
  }
  return pack;
}

describe('snowCoverAt — the walk back to the last melt-out', () => {
  it('is exact: it equals a bare-ground integration started before the melt-out', () => {
    WeatherApi._forceTypeForTesting('snow');
    // The north station on the equinox: snow since the autumn, a summer
    // melt-out before that — the second window's case.
    const north = site(71, 0.7, 50);
    const now = 720 * DAY;
    const cover = WeatherApi.snowCoverAt(north, null, s(now));
    expect(cover.perennial).toBe(false);
    expect(cover.packMm).toBeGreaterThan(0);
    expect(cover.packMm).toBeCloseTo(referencePackMm(north, now, 700), 6);
  });

  it('GROWS day on day where the cold is days old (the Circle)', () => {
    WeatherApi._forceTypeForTesting('snow');
    const circle = site(-66, 1, 900, -7);
    const base = 720 * DAY;
    const d0 = WeatherApi.snowCoverAt(circle, null, s(base)).packMm;
    const d1 = WeatherApi.snowCoverAt(circle, null, s(base + DAY)).packMm;
    const d2 = WeatherApi.snowCoverAt(circle, null, s(base + 2 * DAY)).packMm;
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
    // ≈ 6 mm water-equivalent a day at intensity 1 → several cm of depth.
    expect((d2 - d0) * 10 / 1000).toBeGreaterThan(0.05);
  });

  it('never slides where nothing ever melts: perennial, at the cap', () => {
    WeatherApi._forceTypeForTesting('snow');
    const icecap = site(89, 1, 4000, -20);
    const a = WeatherApi.snowCoverAt(icecap, null, s(720 * DAY));
    const b = WeatherApi.snowCoverAt(icecap, null, s(900 * DAY));
    expect(a.perennial).toBe(true);
    expect(a.packMm).toBe(1500);
    expect(b.packMm).toBe(1500);
    expect(a.depthM).toBeCloseTo(15, 9);
  });

  it('a warm place holds none, whatever the sky is called', () => {
    WeatherApi._forceTypeForTesting('snow');
    const cover = WeatherApi.snowCoverAt(site(0), null, s(720 * DAY));
    expect(cover.packMm).toBe(0);
    expect(cover.depthM).toBe(0);
    expect(cover.perennial).toBe(false);
  });

  it('reports what melted off over its window, and the steps of its exact walk', () => {
    WeatherApi._forceTypeForTesting('snow');
    const steps: number[] = [];
    // The 1400 m headwaters at the end of the southern… no — of the
    // northern spring: a pack that is coming off.
    const head = site(42, 0.5, 1400);
    const cover = WeatherApi.snowCoverAt(head, null, s((720 + 60) * DAY), {
      onStep: (st) => steps.push(st.packMm),
    });
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[steps.length - 1]).toBeCloseTo(cover.packMm, 9);
    expect(cover.meltMm).toBeGreaterThanOrEqual(0);
  });
});
