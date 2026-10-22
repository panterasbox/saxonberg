/**
 * The grate's ash, sized and strengthened by the wood (potash D1, D4).
 *
 * ⭐ Every kilogram burnt leaves its material's `ashFraction` in the
 * grate, and that ash's alkali by the same material's `alkaliShare` — so
 * a raked heap's strength is the mass-weighted mix of what burned, and a
 * tonne of beech is seventeen heaps you can count.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { CompositionMixin } from '../../material/Composition';
import { ThermalMixin } from '../../thermal/Thermal';
import { BurnerMixin } from '../Burner';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';

const POTASH = '/stuff/idea/material/mineral/potash';

class TestGrate extends BurnerMixin(ThermalMixin(Good)) {
  static _mixinName = 'TestGrate';
  public override burnTemperatureK = 900;
  public override maxBurnPowerW = 300000;
}

class TestHeap extends CompositionMixin(Good) {
  static _mixinName = 'TestHeap';
}

let seq = 0;
function wood(ashFraction: number, alkaliShare: number): string {
  seq += 1;
  const path = `/stuff/idea/material/_test/ashwood-${seq}`;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`ashwood-${seq}`);
    m.setDensity(Quantity.of(700, 'kg/m³'));
    m.setHeatOfCombustion(Quantity.of(17, 'MJ/kg'));
    m.setAshFraction(ashFraction);
    m.setAlkaliShare(alkaliShare);
    return m;
  }, path);
  return path;
}

function grate(bed: Record<string, number>): TestGrate {
  const g = makeStuff(() => new TestGrate());
  (g as unknown as { fuelBed: Record<string, number> }).fuelBed = { ...bed };
  g.setFuelCapacityKg(4000);
  return g;
}

describe('the grate leaves ash of a strength', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    vi.spyOn(StuffApi, 'clone').mockImplementation(async () => makeStuff(() => new TestHeap()) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⭐ a tonne of beech leaves 10 kg of ash, 18% of it alkali', () => {
    const g = grate({ [wood(0.01, 0.18)]: 1000 });
    g.consumeFuel(1000);
    expect(g.getAshKg()).toBeCloseTo(10, 6);
    expect(g.getAshAlkaliKg()).toBeCloseTo(1.8, 6);
  });

  it('⭐ a mixed bed is the mass-weighted mix', () => {
    const g = grate({ [wood(0.01, 0.18)]: 500, [wood(0.005, 0.08)]: 500 });
    g.consumeFuel(1000);
    expect(g.getAshKg()).toBeCloseTo(7.5, 6);
    expect(g.getAshAlkaliKg() / g.getAshKg()).toBeCloseTo((5 * 0.18 + 2.5 * 0.08) / 7.5, 6);
  });

  it('⭐⭐ the ash comes out in countable heaps, each carrying the strength', async () => {
    const g = grate({ [wood(0.01, 0.18)]: 1000 });
    g.consumeFuel(1000);
    const raker = makeStuff(() => new Good());
    const { kg, ash } = await g.rakeGrate(raker as unknown as Stuff);
    expect(kg).toBeCloseTo(10, 6);
    // 10 kg in 0.6 kg heaps: sixteen whole and a remainder.
    expect(ash).toHaveLength(17);
    const masses = ash.map((h) => (h as unknown as TestHeap).getMass().rawValue());
    expect(masses.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 6);
    for (const h of ash) expect((h as unknown as TestHeap).fractionOf(POTASH)).toBeCloseTo(0.18, 6);
    expect(g.getAshKg()).toBe(0);
    expect(g.getAshAlkaliKg()).toBe(0);
  });

  it('a fuel with no ash fraction leaves nothing to rake', async () => {
    const g = grate({ [wood(0, 0)]: 50 });
    g.consumeFuel(50);
    const { ash } = await g.rakeGrate(makeStuff(() => new Good()) as unknown as Stuff);
    expect(ash).toEqual([]);
  });
});
