/**
 * ⭐⭐ AC 9 — finishing in the piece: a raw-silk bolt in a copper of water
 * on a lit range degums in a couple of hours — silk, a quarter lighter —
 * while a cold copper does nothing and a linen bolt has nothing to finish.
 *
 * Real Thermal all the way down: the range heats the copper, the copper
 * holds at the boil (and boils down slowly), and the bolt reads the WATER
 * through the kernel's immersion rung, not the room.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ClothBolt from '../thing/ClothBolt';
import Copper from '../thing/Copper';
import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import MaturationProfile from '@saxonberg/server/mud/platform/idea/maturation/MaturationProfile';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { chargeHot } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const MIN = 60;
const BASE = 10_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const RAW = '/trade/sericulture/idea/material/raw-silk';
const SILK = '/trade/sericulture/idea/material/silk';
const LINEN = '/stuff/idea/material/textile/linen';
const WATER = '/stuff/idea/material/bulk/water';

function fixtures(): void {
  const mat = (path: string, name: string, tags: string[], extra?: (m: Material) => void) => {
    if (StuffApi.findByTemplatePath(path)) return;
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(name);
      m.setTags(tags);
      extra?.(m);
      return m;
    }, path);
  };
  mat(RAW, 'raw silk', ['fibre', 'protein', 'gummed']);
  mat(SILK, 'silk', ['fibre', 'protein']);
  mat(LINEN, 'linen', ['fibre', 'cellulose']);
  mat(WATER, 'water', ['liquid', 'solvent'], (m) => {
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    m.setBoilingPoint(Quantity.of(373, 'K'));
    m.setMeltingPoint(Quantity.of(273, 'K'));
    m.setLatentHeatOfVaporization(Quantity.of(2260000, 'J/kg'));
  });
  if (!StuffApi.findByTemplatePath('/trade/sericulture/idea/maturation/degumming')) {
    makeStuffAtPath(() => {
      const p = new MaturationProfile();
      p.setKey('degumming');
      p.setInputCategory('gummed');
      p.setStallBelowK(343);
      p.setHappyK(363);
      p.setDamageAboveK(383);
      p.setRatePerDay(12);
      p.setProductMaterial(SILK);
      p.setProductFraction(0.75);
      return p;
    }, '/trade/sericulture/idea/maturation/degumming');
  }
}

function bolt(material: string): ClothBolt {
  const b = makeStuff(() => new ClothBolt());
  b.setMaterial(StuffApi.findByTemplatePath<Material>(material)!);
  b.setMass(Quantity.of(2, 'kg'));
  b.setGrade(Grade.of('fine'));
  (b as unknown as { lastAmbientK: number }).lastAmbientK = 293;
  (b as unknown as { stampedTemperatureK: number }).stampedTemperatureK = 293;
  return b;
}

function copper(litres: number): Copper {
  const c = makeStuff(() => new Copper());
  (c as unknown as { interiorBulk: boolean }).interiorBulk = true;
  c.setInteriorCapacity(Quantity.of(12, 'L'));
  c.setMass(Quantity.of(12, 'kg'));
  if (litres > 0) {
    c.setBulkMaterial('interior', StuffApi.findByTemplatePath<Material>(WATER)!);
    c.setBulkAmount('interior', Quantity.of(litres, 'L'));
  }
  (c as unknown as { lastAmbientK: number }).lastAmbientK = 293;
  (c as unknown as { stampedTemperatureK: number }).stampedTemperatureK = 293;
  return c;
}

/** A lit range standing in a kitchen — `on` places into the room. */
function litRange(): Oven {
  const kitchen = makeStuff(() => new Place());
  const o = makeStuff(() => {
    const oven = new Oven();
    oven.setBurnTemperatureK(500);
    chargeHot(oven as unknown as Stuff & Burner, 40);
    return oven;
  });
  ContainmentApi.move(o, kitchen as never);
  return o;
}

/** Read the bolt every few minutes up to `hours`; returns the hour it finished. */
function hoursToFinish(b: ClothBolt, hours: number): number {
  for (let m = 5; m <= hours * 60; m += 5) {
    setNow(m * MIN);
    if (b.getFinishingPhase() === 'finished') return m / 60;
  }
  return Infinity;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  fixtures();
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('finishing in the piece', () => {
  it('⭐ a raw-silk bolt in a copper on a lit range degums: silk, a quarter lighter, soft', () => {
    const c = copper(12);
    ContainmentApi.move(c, litRange(), 'on');
    const b = bolt(RAW);
    ContainmentApi.move(b, c);
    expect(b.getFinishingPhase()).toBe('active');
    expect(b.finishingLine()).toMatch(/stiff in the gum/);
    // ⚠ The kernel's Newton model heats 12 L on a range in about an hour
    // and a half to a simmer; the degumming is ~two hours after that.
    const h = hoursToFinish(b, 8);
    expect(h).toBeLessThanOrEqual(4.5);
    expect(b.getMaterial()?.getName()).toBe('silk');
    expect(b.getMass().rawValue()).toBeCloseTo(1.5, 5);
    expect(b.getShortDescription()).toBe('bolt of silk');
    expect(b.finishingLine()).toMatch(/soft and lustrous/);
    // Held at the boil, never above it: no band lost.
    expect(b.getGradeBand()).toBe('fine');
  });

  it('the water holds at the boil and boils down — it does not flash dry', () => {
    const c = copper(12);
    ContainmentApi.move(c, litRange(), 'on');
    // ⭐ Two hours, not eight: the range has POWER now (sugar D2) — a
    // couple of kilowatts reaching the pan boils off a few litres an hour,
    // so eight hours on the fire would (rightly) boil a 12 L copper dry.
    for (let m = 15; m <= 120; m += 15) {
      setNow(m * MIN);
      c.getTemperature();
    }
    expect(c.getContentsTemperature().rawValue()).toBeLessThanOrEqual(373);
    const left = c.getBulkAmount('interior').rawValue();
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(12);
  });

  it('a cold copper does nothing', () => {
    const c = copper(12);
    const b = bolt(RAW);
    ContainmentApi.move(b, c);
    expect(hoursToFinish(b, 6)).toBe(Infinity);
    expect(b.getMaterial()?.getName()).toBe('raw silk');
  });

  it('a linen bolt has nothing to finish', () => {
    const b = bolt(LINEN);
    expect(b.getFinishingPhase()).toBe('idle');
    expect(b.finishingLine()).toBe('');
  });

  it('a copper is for cloth', () => {
    const c = copper(0);
    expect(c.canAddContainable(bolt(RAW) as never).ok).toBe(true);
    const stone = makeStuff(() => new Material());
    expect(c.canAddContainable(stone as never).ok).toBe(false);
  });
});
