/**
 * ⭐⭐ Oily rags catch (paint D15): a HEAP of rags soaked in linseed oil
 * heats as the oil oxidizes and, with nowhere for the heat to go, runs away
 * and catches; one rag spread out does not; a heap soaked in water does
 * not heat at all.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Rag from '@saxonberg/server/mud/platform/thing/Rag';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const OIL = '/trade/painting/idea/material/linseed-oil';
const LINEN = '/stuff/idea/material/textile/linen';
const DAY = 86_400;
let now = 0;

function rags(n: number): Rag {
  const r = makeStuff(() => {
    const x = new Rag();
    x.setMaterial(StuffApi.findByTemplatePath<Material>(LINEN)!);
    x.setMass(Quantity.of(0.05, 'kg'));
    x.setQuantity(n);
    x.setReserve(new Reserve('fuel', Quantity.of(100, '%'), Quantity.of(100, '%'), 'combustion', null));
    return x;
  });
  r.layCoat('outside', OIL, 0.0003);
  r.reconcileHeating();
  return r;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  now = WorldClockApi.getNow().rawValue();
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('linseed oil');
    m.setLaysCoat(true);
    m.setKinetics([{ key: 'set', sets: 'oxidation', order: 0, rate: [[293, 0.055]], exothermicJPerKg: 2.5e6 }]);
    return m;
  }, OIL);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('linen');
    m.setDensity(Quantity.of(1500, 'kg/m³'));
    m.setAutoignitionTemperature(Quantity.of(680, 'K'));
    m.setHeatOfCombustion(Quantity.of(16, 'MJ/kg'));
    return m;
  }, LINEN);
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('oily rags', () => {
  it('a heap of them warms, runs away, and catches', () => {
    const heap = rags(6);
    now += 20 * DAY;
    expect(heap.coreTemperatureK()).toBeGreaterThan(heap.runawayK());
    now += 20 * DAY;
    heap.reconcileHeating();
    expect(heap.isBurning()).toBe(true);
  });

  it('one rag spread out sheds its heat and never catches', () => {
    const one = rags(1);
    now += 40 * DAY;
    expect(one.coreTemperatureK()).toBeLessThan(300);
    expect(one.isBurning()).toBe(false);
  });

  it('a heap soaked in water does not heat while it stays wet', () => {
    const heap = rags(6);
    heap.wet(1);
    now += DAY / 8;
    expect(heap.coreTemperatureK()).toBeLessThan(290);
    expect(heap.isBurning()).toBe(false);
  });
});
