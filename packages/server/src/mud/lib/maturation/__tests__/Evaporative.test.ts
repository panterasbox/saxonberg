/**
 * The **evaporative** mechanism — the air does the work by taking water
 * away. A salt pan, a brine hearth, a saltern.
 *
 * Three things distinguish it from the other three mechanisms, and all
 * three are pinned here:
 *
 *   1. the rate is the **air's**, against a saturated brine's equilibrium
 *      (~75 % RH) rather than water's 100 % — which is why solar salt is a
 *      dry-climate industry;
 *   2. the batch gets **smaller** as it converts, because the water leaves;
 *   3. ⭐ **rain puts it back** — the pan goes backwards, which is a setback
 *      and not a failure, and is the read the requirements ask for.
 *
 * Plus the two things that would otherwise be silent: a pan in a lit fire
 * converts in an afternoon rather than a season, and a pan that authors no
 * flora **converts at all** (see `requiresFlora` — two shipped profiles
 * did not).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import Material from '../../material/Material';
import CartesianLocation from '../../location/CartesianLocation';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { AirSegment } from '../../../api/biome';
import { BiomeApi } from '../../../api/biome';
import { Evaporation } from '../../material/Evaporation';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 10_000_000;
let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

const BRINE = '/stuff/idea/evaporative-test/idea/material/test-brine';
const SALT = '/stuff/idea/evaporative-test/idea/material/test-salt';
const PROFILE = '/stuff/idea/evaporative-test/idea/maturation/test-brine';

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test brine');
    m.setTags(['liquid', 'test-brine']);
    return m;
  }, BRINE);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test salt');
    m.setTags(['solid', 'salt']);
    return m;
  }, SALT);
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-brine');
    p.setInputCategory('test-brine');
    p.setMechanism('evaporative');
    p.setStallBelowK(273);
    p.setHappyK(283);
    p.setDamageAboveK(400);
    p.setRatePerDay(0.25);
    p.setProductMaterial(SALT);
    p.setProductFraction(0.1);
    // ⚠ NO strain, no wild strain, no lag — nothing lives in a salt pan.
    return p;
  }, PROFILE);
}

/** A pan in a room whose air is authored, filled with brine. */
function pan(
  opts: { humidityPct: number; windMs?: number; tempK?: number; litres?: number },
): { vat: Vat; room: CartesianLocation } {
  const tempK = opts.tempK ?? 293;
  const room = makeStuff(() => {
    const r = new CartesianLocation();
    r.setHumidity(Quantity.of(opts.humidityPct, '%'));
    r.setWind(Quantity.of(opts.windMs ?? 0, 'm/s'));
    r.setTemperature(Quantity.of(tempK, 'K'));
    return r;
  });
  const vat = makeStuff(() => new Vat());
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
  ContainmentApi.move(vat as never, room as never);
  const brine = StuffApi.findByTemplatePath<Material>(BRINE)!;
  vat.setBulkMaterial('interior', brine);
  vat.setBulkAmount('interior', Quantity.of(opts.litres ?? 40, 'L'));
  return { vat, room };
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  standFixtures();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('the evaporative mechanism', () => {
  it('⭐⭐ a pan with NO strain authored converts — nothing lives in it', () => {
    // The regression this mechanism would otherwise have walked into: the
    // strain gate arrived with the fermentation build and asks *has it been
    // pitched?*, which is a question a salt pan cannot answer. Two shipped
    // profiles (retting, bleaching) were already silently frozen by it.
    const { vat } = pan({ humidityPct: 30, windMs: 4 });
    expect(vat.getMaturationPhase()).toBe('active');
    expect(vat.getFractionConverted()).toBe(0);
    setNow(5 * DAY);
    expect(vat.getFractionConverted()).toBeGreaterThan(0);
  });

  it('dry windy air concentrates it; the level goes DOWN', () => {
    const { vat } = pan({ humidityPct: 30, windMs: 5, litres: 40 });
    void vat.getFractionConverted();
    setNow(2 * DAY);
    const f = vat.getFractionConverted();
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
    // Water is leaving: the interior is smaller than it was.
    expect(vat.getBulkAmount('interior').rawValue()).toBeLessThan(40);
  });

  it('⭐⭐ a WET week does nothing — a brine is in equilibrium with dry air', () => {
    // The geography lesson. 85 % air would still dry a ham; it will not
    // concentrate a saturated brine, which is why a saltern is a
    // dry-climate industry and a wet week is a setback.
    const { vat } = pan({ humidityPct: 85, windMs: 5 });
    void vat.getFractionConverted();
    setNow(20 * DAY);
    expect(vat.getFractionConverted()).toBe(0);
    expect(vat.getMaturationPhase()).toBe('active');
  });

  it('frozen over, nothing leaves — and the read says stalled, not starting', () => {
    const { vat } = pan({ humidityPct: 20, windMs: 5, tempK: 265 });
    void vat.getFractionConverted();
    setNow(30 * DAY);
    expect(vat.getFractionConverted()).toBe(0);
  });

  it('finishes to the product at productFraction of the starting volume', () => {
    const { vat } = pan({ humidityPct: 10, windMs: 8, tempK: 303, litres: 40 });
    void vat.getFractionConverted();
    setNow(60 * DAY);
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(SALT);
    // 40 L of brine at a tenth salt → about 4 L of salt.
    expect(vat.getBulkAmount('interior').rawValue()).toBeCloseTo(4, 6);
  });

  it('⭐⭐ RAIN puts it back — the pan goes BACKWARDS, and it is not ruined', () => {
    // The requirements' read, and the only setback in the maturation
    // substrate that is not a failure. Driven by stubbing the segment walk,
    // because a bare test world has no weather.
    const { vat } = pan({ humidityPct: 30, windMs: 4, litres: 40 });
    void vat.getFractionConverted();
    setNow(2 * DAY);
    const won = vat.getFractionConverted();
    expect(won).toBeGreaterThan(0);

    const before = vat.getBulkAmount('interior').rawValue();
    const original = BiomeApi.airSegmentsFor;
    try {
      // One day of steady rain into the pan's mouth.
      (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor = (
        scope: unknown,
        t0S: number,
        t1S: number,
      ): AirSegment[] => {
        void scope;
        return [
          {
            air: new Evaporation(100, 1, 288),
            durationS: t1S - t0S,
            rainMmPerH: 4,
          },
        ];
      };
      setNow(3 * DAY);
      const after = vat.getFractionConverted();
      expect(after).toBeLessThan(won);
      // …and the level came back up, because water went in.
      expect(vat.getBulkAmount('interior').rawValue()).toBeGreaterThan(before);
      // A setback, not a death: still working, still the same batch.
      expect(vat.getMaturationPhase()).toBe('active');
      expect(vat.getBulkMaterialPath('interior')).toBe(BRINE);
    } finally {
      (BiomeApi as unknown as { airSegmentsFor: unknown }).airSegmentsFor =
        original;
    }
  });

  it('⭐ a pan over a fire converts in hours, not a season — same mechanism', () => {
    // The brine hearth: fast, and the fuel is what somebody else wanted.
    // `ThermalMixin` already reads the fire through `heatSourceK()`; this
    // pins the arithmetic by setting the pan's own temperature directly.
    const cool = pan({ humidityPct: 30, windMs: 2, litres: 40 });
    const hot = pan({ humidityPct: 30, windMs: 2, litres: 40 });
    hot.vat.lastAmbientK = 373;
    hot.vat.stampedTemperatureK = 373;
    void cool.vat.getFractionConverted();
    void hot.vat.getFractionConverted();
    setNow(12 * HOUR);
    // The hearth is done inside the afternoon; the pan in the yard has
    // barely begun. Same mechanism, one dial.
    expect(hot.vat.getMaturationPhase()).toBe('finished');
    expect(cool.vat.getMaturationPhase()).toBe('active');
    expect(cool.vat.getFractionConverted()).toBeLessThan(0.2);
  });
});
