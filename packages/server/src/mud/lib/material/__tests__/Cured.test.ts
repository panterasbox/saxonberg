/**
 * CuredMixin — the per-instance water state, and the acts that change it.
 *
 * Four things this pins, and the first is the one the whole build rests
 * on: **`moisture: 1, solute: 0` derives the Material's tabulated `a_w`
 * exactly**, so nothing already in the world behaves differently. Then:
 * the hurdles stack multiplicatively, partial treatment earns partial
 * benefit, and the asymmetry — drying reverses in damp air, curing never
 * does. See docs/subsystems/spoilage.md.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Thing from '../../stuff/Thing';
import Provision from '../../../platform/thing/Provision';
import Material from '../Material';
import { Freshness } from '../Freshness';
import { Cure } from '../Cured';
import { MixinApi } from '../../../api/mixin';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

const HOUR = 3600;
const DAY = 24 * HOUR;
const BASE = 1_000_000;

let now = BASE;
function setNow(s: number): void {
  now = BASE + s;
}

let matSeq = 0;
function material(ea: number, aw = 0.98): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`cure-test-mat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setSpoilActivationEnergy(Quantity.of(ea, 'J/mol'));
    m.setWaterActivity(aw);
    return m;
  }, `/stuff/idea/material/_test/cure-${matSeq}`) as unknown as Material;
}

function food(mat: Material, tempK = 293): Provision {
  return makeStuff(() => {
    const p = new Provision();
    p.setMass(Quantity.of(1, 'kg'));
    p.setMaterial(mat);
    p.setStampedTemperatureK(tempK);
    p.setLastAmbientK(tempK);
    return p;
  });
}

const MEAT_EA = 80_000;

describe('CuredMixin — the water state a treatment changes', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
  });

  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  // ---- requirement 19: the day-one identity ----

  it('⭐⭐ untreated matter derives the Material\'s tabulated a_w EXACTLY', () => {
    // The single most load-bearing assertion in the build. If this drifts,
    // every row in the Hearthworks pantry, the general store and Dave's
    // Bar changes behaviour on day one.
    for (const aw of [0.15, 0.6, 0.85, 0.97, 0.99]) {
      const mat = material(MEAT_EA, aw);
      expect(Freshness.waterActivityOf(mat, null)).toBe(aw);
      expect(Freshness.waterActivityOf(mat, Cure.untreated())).toBe(aw);
    }
  });

  it('…and an untreated Provision reads the same growth rate as no cure at all', () => {
    const mat = material(MEAT_EA, 0.99);
    const p = food(mat);
    expect(p.getMoisture()).toBe(1);
    expect(p.getSolute()).toBe(0);
    expect(Freshness.growthRate(mat, 293, p.getCureState())).toBeCloseTo(
      Freshness.growthRate(mat, 293, null),
      12,
    );
  });

  it('⚠ an untreated instance writes NOTHING on a read — the sparse default holds', () => {
    // The `FreshnessMixin` lesson one mixin over: the first `look` at an
    // untreated cut must not stamp a clock for a state that cannot change.
    const p = food(material(MEAT_EA));
    setNow(30 * DAY);
    expect(p.getMoisture()).toBe(1);
    expect(p.cureClockStamp).toBe(0);
  });

  // ---- criterion 1 + 2: treatment works, and hurdles stack ----

  it('drying lowers the effective water activity', () => {
    const mat = material(MEAT_EA, 0.98);
    const dried = { moisture: 0.5, solute: 0 };
    expect(Freshness.waterActivityOf(mat, dried)).toBeCloseTo(0.49, 10);
  });

  it('salting lowers it too — the same lever seen twice', () => {
    const mat = material(MEAT_EA, 0.98);
    const salted = { moisture: 1, solute: 0.5 };
    expect(Freshness.waterActivityOf(mat, salted)).toBeCloseTo(0.49, 10);
  });

  it('⭐ doing BOTH beats doing either — the hurdles multiply', () => {
    const mat = material(MEAT_EA, 0.98);
    const dried = Freshness.waterActivityOf(mat, { moisture: 0.5, solute: 0 });
    const salted = Freshness.waterActivityOf(mat, { moisture: 1, solute: 0.5 });
    const both = Freshness.waterActivityOf(mat, { moisture: 0.5, solute: 0.5 });
    expect(both).toBeLessThan(dried);
    expect(both).toBeLessThan(salted);
    expect(both).toBeCloseTo(0.245, 10);
  });

  it('partial treatment earns partial benefit — nothing is a step', () => {
    const mat = material(MEAT_EA, 0.98);
    const light = Freshness.waterActivityOf(mat, { moisture: 0.9, solute: 0 });
    const heavy = Freshness.waterActivityOf(mat, { moisture: 0.4, solute: 0 });
    const none = Freshness.waterActivityOf(mat, null);
    expect(light).toBeLessThan(none);
    expect(heavy).toBeLessThan(light);
  });

  it('⭐ a treated cut keeps visibly longer than an untreated one in the same place', () => {
    const mat = material(MEAT_EA, 0.99);
    const fresh = food(mat, 293);
    const cured = food(mat, 293);
    cured.treat({ solute: 0.5 });
    // Seed both clocks at t=0 (the first read stamps and integrates nothing).
    fresh.getMicrobialLoad();
    cured.getMicrobialLoad();
    setNow(5 * DAY);
    expect(cured.getMicrobialLoad()).toBeLessThan(fresh.getMicrobialLoad());
    expect(fresh.getFreshnessBand()).not.toBe('fresh');
  });

  it('a treatment past the a_w floor stops growth outright — salt cod keeps', () => {
    const mat = material(MEAT_EA, 0.99);
    const saltCod = food(mat, 293);
    saltCod.treat({ moisture: 0.4, solute: 0.4 }); // a_w ≈ 0.24, under 0.60
    saltCod.getMicrobialLoad();
    setNow(120 * DAY);
    expect(saltCod.getMicrobialLoad()).toBe(0);
    expect(saltCod.getFreshnessBand()).toBe('fresh');
  });

  // ---- criterion 3: the asymmetry ----

  it('⭐⭐ a second, weaker treatment never UNDOES a stronger one', () => {
    const p = food(material(MEAT_EA));
    p.treat({ moisture: 0.3, solute: 0.5 });
    p.treat({ moisture: 0.9, solute: 0.1 });
    expect(p.getMoisture()).toBe(0.3);
    expect(p.getSolute()).toBe(0.5);
  });

  it('a dried thing softens back toward the ambient equilibrium', () => {
    // No containing scope → the ambient dial (60% RH ⇒ equilibrium 0.6).
    const p = food(material(MEAT_EA));
    p.treat({ moisture: 0.2 });
    p.getMoisture();
    setNow(200 * HOUR);
    const after = p.getMoisture();
    expect(after).toBeGreaterThan(0.2);
    expect(after).toBeLessThanOrEqual(0.6);
  });

  it('…but a salted thing never un-salts, however long it sits', () => {
    const p = food(material(MEAT_EA));
    p.treat({ solute: 0.6 });
    setNow(400 * DAY);
    expect(p.getSolute()).toBe(0.6);
  });

  it('⚠ nothing dries on its own — the passive arm is ONE-WAY', () => {
    // A gauge that lowered moisture passively would quietly preserve
    // every ration in the pantry, and drying would stop being an act.
    expect(Cure.advanceMoisture(1, 1000 * HOUR, 20)).toBe(1);
    expect(Cure.advanceMoisture(0.5, 1000 * HOUR, 20)).toBe(0.5);
    expect(Cure.advanceMoisture(0.2, 1000 * HOUR, 90)).toBeGreaterThan(0.2);
  });

  it('a dry store holds it and damp air gives it back — the equilibrium is the humidity', () => {
    expect(Cure.equilibriumMoisture(25)).toBeCloseTo(0.25, 10);
    expect(Cure.equilibriumMoisture(95)).toBeCloseTo(0.95, 10);
    const inDryStore = Cure.advanceMoisture(0.3, 500 * HOUR, 25);
    const inSteam = Cure.advanceMoisture(0.3, 500 * HOUR, 95);
    expect(inDryStore).toBe(0.3);
    expect(inSteam).toBeGreaterThan(0.5);
  });

  // ---- criterion 4: legible as treated, without a number ----

  it('an untreated thing says nothing at all — it does not say "fresh"', () => {
    expect(Cure.phraseFor(Cure.untreated())).toBeNull();
    expect(Cure.phraseFor(null)).toBeNull();
  });

  it('a treated thing reads in band words, never a number', () => {
    const salted = Cure.phraseFor({ moisture: 1, solute: 0.5 })!;
    const dried = Cure.phraseFor({ moisture: 0.3, solute: 0 })!;
    const both = Cure.phraseFor({ moisture: 0.3, solute: 0.5 })!;
    expect(salted).toBe('It has been heavily salted.');
    expect(dried).toBe('It has been thoroughly dried.');
    expect(both).toBe('It has been thoroughly dried and heavily salted.');
    for (const line of [salted, dried, both]) {
      expect(line).not.toMatch(/[0-9]/);
    }
  });

  it('lighter treatments read lighter', () => {
    expect(Cure.phraseFor({ moisture: 0.7, solute: 0.15 })).toBe(
      'It has been partly dried and lightly salted.',
    );
  });

  // ---- the boundary ----

  it('⚠ a bare `Thing` carries no water state — a plank is not food (yet)', () => {
    const plank = makeStuff(() => {
      const t = new Thing();
      t.setMaterial(material(0));
      return t;
    });
    expect(MixinApi.isCured(plank)).toBe(false);
  });

  it('…and `Provision` carries BOTH gauges, which are different facts', () => {
    const p = food(material(MEAT_EA));
    expect(MixinApi.isCured(p)).toBe(true);
    expect(MixinApi.isFresh(p)).toBe(true);
  });

  // ---- the pour rule ----

  it('blending water states is mass-weighted, like the load', () => {
    const brine = { moisture: 1, solute: 0.8 };
    const stock = { moisture: 1, solute: 0 };
    const half = Cure.blend(brine, 1, stock, 1);
    expect(half.solute).toBeCloseTo(0.4, 10);
    const splash = Cure.blend(brine, 0.1, stock, 0.9);
    expect(splash.solute).toBeCloseTo(0.08, 10);
  });
});
