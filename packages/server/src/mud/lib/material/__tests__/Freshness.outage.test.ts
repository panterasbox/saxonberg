/**
 * ⭐⭐ The B payoff (cold-storage W2): spoilage is integrated along the
 * temperature trajectory, not sampled at the endpoint.
 *
 * The fridge's signature failure: a unit that warmed during a power cut
 * and re-cooled reads *nothing happened* if the clock samples its (cold
 * again) endpoint, and *insta-spoiled* if it samples a mid-outage peak.
 * These pin that `FreshnessMixin` now folds its logistic over the host's
 * published `temperatureTrajectory` — so the reading is correct however
 * you observe the gap.
 *
 * The host publishes a CONTROLLED trajectory (a subclass override) so the
 * test owns the curve; the integral under test is `advanceFreshnessOverHost`
 * reached through the ordinary `getMicrobialLoad()` reconcile.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Provision from '../../../platform/thing/Provision';
import Material from '../Material';
import { Freshness } from '../Freshness';
import { Piecewise } from '../../Trajectory';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

let matSeq = 0;
function material(ea = 80_000, aw = 0.98): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`outage-mat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(ea, 'J/mol'));
    m.setWaterActivity(aw);
    return m;
  }, `/stuff/idea/material/_outage/mat-${matSeq}`) as unknown as Material;
}

/** A Provision whose temperature curve the test controls outright. */
class OutageFood extends Provision {
  public pw: Piecewise | null = null;
  temperatureTrajectory(fromS: number, toS: number): Piecewise {
    return (
      this.pw ??
      new Piecewise([
        { fromS, toS, startValue: 277, target: 277, tau: 0 },
      ])
    );
  }
}

function food(mat: Material): OutageFood {
  return makeStuff(() => {
    const p = new OutageFood();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(mat);
    p.setStampedTemperatureK(277);
    p.setLastAmbientK(277);
    return p;
  });
}

describe('Freshness — the outage integral (B)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000); // 1 ms provider tick ≈ 1 game-second
  });
  afterEach(() => {
    // ⚠ No clearAll — it wipes the WorldClockRegistry singleton, and the
    // next test's re-anchor then inherits a stale game-time, making its
    // gap non-positive (the clock harness Freshness.test.ts shares).
    WorldClockApi._resetForTesting();
  });

  it('a unit kept cold the whole week stays fresh; a warm counter spoils', () => {
    const mat = material();
    const cold = food(mat);
    const warm = food(mat);
    // The warm counter publishes a flat 293 K curve.
    warm.pw = new Piecewise([
      { fromS: now, toS: now + 7 * DAY, startValue: 293, target: 293, tau: 0 },
    ]);
    // Seed both gauges.
    void cold.getMicrobialLoad();
    void warm.getMicrobialLoad();
    setNow(7 * DAY);
    // Keep the published windows current to `now`.
    cold.pw = new Piecewise([
      { fromS: BASE, toS: now, startValue: 277, target: 277, tau: 0 },
    ]);
    warm.pw = new Piecewise([
      { fromS: BASE, toS: now, startValue: 293, target: 293, tau: 0 },
    ]);
    expect(cold.getFreshnessBand()).toBe('fresh');
    expect(warm.getMicrobialLoad()).toBeGreaterThan(cold.getMicrobialLoad() * 5);
  });

  it('warm-then-cool reads ABOVE the cold-endpoint sample and matches a fold', () => {
    const mat = material();
    const unit = food(mat);
    void unit.getMicrobialLoad();

    // Cold, then a 12-hour outage to 293 K mid-gap, then cold again — the
    // fridge that lost power and re-cooled.
    const t0 = BASE;
    const warmFrom = t0 + 1 * DAY;
    const warmTo = warmFrom + 12 * HOUR;
    const end = t0 + 3 * DAY;
    unit.pw = new Piecewise([
      { fromS: t0, toS: warmFrom, startValue: 277, target: 277, tau: 0 },
      { fromS: warmFrom, toS: warmTo, startValue: 293, target: 293, tau: 0 },
      { fromS: warmTo, toS: end, startValue: 277, target: 277, tau: 0 },
    ]);
    setNow(3 * DAY);
    const got = unit.getMicrobialLoad();

    // The cold-endpoint sample (what the OLD clock would have billed): the
    // whole 3 days at 277 K.
    const coldSample = Freshness.advance(0, 3 * DAY, mat, 277, null);
    // The true fold over the published curve (the mixin passes null water
    // for a non-WaterActive Provision — match it).
    let fold = 0;
    for (const s of unit.temperatureTrajectory(t0, end).samples(8)) {
      fold = Freshness.advance(fold, s.durationS, mat, s.value, null);
    }
    // Integrated spoilage is well ABOVE the cold-endpoint figure (the
    // 12 warm hours counted), and matches the independent fold.
    expect(got).toBeGreaterThan(coldSample * 1.5);
    expect(Math.abs(got - fold) / Math.max(fold, 1e-9)).toBeLessThan(0.01);
  });
});
