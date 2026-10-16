/**
 * ⭐⭐ Moulds (dairy D9): the set site asks the CONTAINER first.
 *
 * A pool that sets in a mould takes the mould's shape and stays in it; the
 * same pool in a plain vessel falls back to the material's own cast and
 * drops beside the vessel (today's behaviour, pinned). Two set processes:
 * freezing (the thermal reconcile) and draining (`Material.drainSetting`,
 * faster and drier under a weight placed ON the mould).
 *
 * The clone pipeline needs template rows, so `StuffApi.clone` is stubbed to
 * hand back a fresh food-shaped cast and record which template was asked.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Provision from '../../../platform/thing/Provision';
import Material from '../../material/Material';
import { MouldMixin } from '../Mould';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { PlacingMixin } from '../../spatial/Placing';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestMould extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'TestMould';
}
class TestHoop extends PlacingMixin(
  MouldMixin(
    DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
  ),
) {
  static _mixinName = 'TestHoop';
}
class TestPail extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'TestMouldPail';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestMouldRoom';
}
/** A cast that remembers what it was made from — the wheel's duck. */
class TestCast extends Provision {
  public madeFrom = '';
  setMadeFrom(path: string): void {
    this.madeFrom = path;
  }
}

const DAY = 86_400;
let now = 1_000_000;
const setNow = (s: number): void => {
  now = 1_000_000 + s;
};

const BLOCK = '/stuff/thing/_test/block';
const LUMP = '/stuff/thing/_test/lump';
const WHEEL = '/stuff/thing/_test/wheel';
const WATER = '/stuff/idea/material/_mould/water';
const CURD = '/stuff/idea/material/_mould/curd';
const CHEESE = '/stuff/idea/material/_mould/cheese';
const MILK = '/stuff/idea/material/_mould/milk';

let cloned: string[] = [];

function material(path: string, setup: (m: Material) => void): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    setup(m);
    return m;
  }, path) as unknown as Material;
}

function water(): Material {
  return material(WATER, (m) => {
    (m as unknown as { meltingPoint: Quantity<'K'> }).meltingPoint = Quantity.of(273, 'K');
    (m as unknown as { latentHeatOfFusion: Quantity<'J/kg'> }).latentHeatOfFusion =
      Quantity.of(334_000, 'J/kg');
    m.castTemplate = LUMP;
  });
}
function cheese(): Material {
  return material(CHEESE, () => {});
}
function curd(): Material {
  cheese();
  return material(CURD, (m) => {
    m.setNutrientAmounts({ fat: 60000, protein: 60000, water: 800000 });
    m.setDrainSetting({
      days: 0.5,
      becomes: CHEESE,
      moisture: { unloaded: 0.8, loaded: 0.55 },
      loadRef: 2,
    });
  });
}

function room(): TestRoom {
  return makeStuff(() => new TestRoom());
}

function fillVessel<T extends Stuff>(v: T, mat: Material, litres: number, tempK: number): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(10, 'L'));
  b.setBulkMaterial('interior', mat);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  b.setStampedTemperatureK(tempK);
  b.setLastAmbientK(tempK);
  return v;
}

function mould(castTemplate: string): TestMould {
  const m = makeStuff(() => new TestMould());
  m.setCastTemplate(castTemplate);
  return m;
}

/** Let the cast's async clone + move settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

/**
 * The moisture the set WROTE. ⚠ Read raw: `getWaterState()` reconciles
 * against the room's biome humidity, which a bare unit room has none of —
 * what is under test is the write at the set, not the air afterwards.
 */
function storedMoisture(c: TestCast): number {
  return (c as unknown as { _moisture: number })._moisture;
}

function contentsOf(c: Stuff): Stuff[] {
  return [...(c as unknown as { getContents(): readonly Stuff[] }).getContents()];
}

describe('moulds — the container decides the shape', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    cloned = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      return makeStuff(() => new TestCast());
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('water freezing in a mould sets in the mould’s shape, INSIDE it, and reads set', async () => {
    const r = room();
    const m = fillVessel(mould(BLOCK), water(), 4, 180);
    ContainmentApi.move(m, r);
    m.reconcilePhase();
    await settle();
    expect(cloned).toEqual([BLOCK]);
    expect(m.getBulkAmount('interior').rawValue()).toBe(0);
    const inside = contentsOf(m);
    expect(inside).toHaveLength(1);
    expect(contentsOf(r)).not.toContain(inside[0]);
    expect(m.setState()).toBe('set');
  });

  it('the same water in a plain vessel casts the material’s own shape BESIDE it', async () => {
    const r = room();
    const pail = fillVessel(makeStuff(() => new TestPail()), water(), 4, 180);
    ContainmentApi.move(pail, r);
    pail.reconcilePhase();
    await settle();
    expect(cloned).toEqual([LUMP]);
    expect(contentsOf(r)).toHaveLength(2); // the pail and the lump
  });

  it('a cracked mould casts a lump; a whole one wears by wearPerCast', async () => {
    const broken = fillVessel(mould(BLOCK), water(), 1, 150);
    broken.setCondition(0);
    broken.reconcilePhase();
    await settle();
    expect(cloned).toEqual([LUMP]);

    cloned = [];
    const whole = fillVessel(mould(BLOCK), water(), 1, 150);
    whole.setWearPerCast(0.05);
    whole.reconcilePhase();
    await settle();
    expect(cloned).toEqual([BLOCK]);
    expect(whole.getCondition()).toBeCloseTo(0.95, 9);
  });

  it('curd drains and sets after `days` unloaded, at the unloaded moisture', async () => {
    const r = room();
    const m = fillVessel(mould(WHEEL), curd(), 2, 290);
    ContainmentApi.move(m, r);
    m.setBulkPayload('interior', {
      maker: '/platform/agent/Avatar/milker',
      madeFrom: MILK,
      pathogens: { 'e-coli': 0.2 },
      freshness: { load: 0.03, stamp: 0 },
    });
    expect(m.setState()).toBe('filled'); // seeds the stamp
    setNow(0.25 * DAY);
    expect(m.setState()).toBe('setting');
    expect(cloned).toEqual([]);
    setNow(0.5 * DAY + 60);
    m.reconcileSetting();
    await settle();
    expect(cloned).toEqual([WHEEL]);
    const [cast] = contentsOf(m) as unknown as TestCast[];
    expect(cast).toBeDefined();
    expect(cast!.getMaterial()?.getTemplatePath()).toBe(CHEESE);
    expect(storedMoisture(cast!)).toBeCloseTo(0.8, 2);
    // poolKg 2 × (1 − (1 − 0.8) × 0.8) = 1.68
    expect(cast!.getMass().rawValue()).toBeCloseTo(1.68, 2);
    expect(cast!.getMaker()).toBe('/platform/agent/Avatar/milker');
    expect(cast!.madeFrom).toBe(MILK);
    expect(cast!.getPathogenLoad('e-coli')).toBeCloseTo(0.2, 5);
    expect(cast!.getMicrobialLoad()).toBeCloseTo(0.03, 2);
    expect(m.setState()).toBe('set');
  });

  it('under a weight of poolKg × loadRef it sets in half the time, drier', async () => {
    const r = room();
    const hoop = makeStuff(() => new TestHoop());
    hoop.setCastTemplate(WHEEL);
    fillVessel(hoop, curd(), 2, 290);
    ContainmentApi.move(hoop, r);
    const stone = makeStuff(() => new Good());
    (stone as unknown as { setMass(q: Quantity<'kg'>): void }).setMass(Quantity.of(4, 'kg'));
    ContainmentApi.move(stone, r);
    ContainmentApi.move(stone, hoop, 'on');
    expect(hoop.loadKg()).toBeCloseTo(4, 9);
    hoop.reconcileSetting(); // seed
    setNow(0.25 * DAY + 60);
    hoop.reconcileSetting();
    await settle();
    expect(cloned).toEqual([WHEEL]);
    const [cast] = contentsOf(hoop) as unknown as TestCast[];
    expect(storedMoisture(cast!)).toBeCloseTo(0.55, 2);
  });
});
