/**
 * ⭐ The third and fourth set processes (ceramics S17, D24): CURE and the
 * ABSORBED drain.
 *
 *   - plaster slurry poured into a case, with a model pressed into it,
 *     cures in its minutes into a plaster MOULD that keeps the model's
 *     shape as its own cavity;
 *   - slip poured into that plaster mould sets by the MOULD drinking it —
 *     the water goes into the mould's own wetness, and a wet mould drinks
 *     slower; in a mould that does not drink it never sets.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Material from '../../material/Material';
import { MouldMixin } from '../Mould';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../../thermal/Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestMould extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'TestCureMould';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestCureRoom';
}
class TestCup extends Good {
  static _mixinName = 'TestCureCup';
}

const SLURRY = '/stuff/idea/material/_cure/plaster-slurry';
const PLASTER = '/stuff/idea/material/_cure/plaster';
const SLIP = '/stuff/idea/material/_cure/slip';
const CLAY = '/stuff/idea/material/_cure/clay';
const PINE = '/stuff/idea/material/_cure/pine';
const PLASTER_MOULD = '/stuff/thing/_cure/plaster-mould';
const CUP = '/stuff/thing/_cure/cup';

let now = 1_000_000;
const setNow = (s: number): void => {
  now = 1_000_000 + s;
};
let cloned: string[] = [];

function material(path: string, setup: (m: Material) => void): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setSpecificHeat(Quantity.of(1000, 'J/(kg·K)'));
    setup(m);
    return m;
  }, path) as unknown as Material;
}

function mats(): void {
  material(PLASTER, (m) => {
    m.setDensity(Quantity.of(1200, 'kg/m³'));
    m.setWaterAbsorptionCapacity(Quantity.of(40, '%'));
  });
  material(SLURRY, (m) => {
    m.setTags(['liquid']);
    m.setDensity(Quantity.of(1600, 'kg/m³'));
    m.setCureSetting({ minutes: 15, becomes: PLASTER });
  });
  material(CLAY, (m) => m.setDensity(Quantity.of(1800, 'kg/m³')));
  material(SLIP, (m) => {
    m.setTags(['liquid']);
    m.setDensity(Quantity.of(1700, 'kg/m³'));
    m.setComposition([
      { materialPath: CLAY, fraction: 0.55 },
      { materialPath: '/stuff/idea/material/_cure/water', fraction: 0.45 },
    ]);
    m.setDrainSetting({
      days: 0.08,
      becomes: CLAY,
      moisture: { unloaded: 0.7, loaded: 0.7 },
      loadRef: 1,
      absorbedByMould: true,
    });
  });
  material(PINE, (m) => m.setDensity(Quantity.of(510, 'kg/m³')));
}

function mat(path: string): Material {
  return StuffApi.findByTemplatePath<Material>(path)!;
}

function vessel(materialPath: string): TestMould {
  const m = makeStuff(() => new TestMould());
  const b = m as unknown as { interiorBulk: boolean; setInteriorCapacity(q: Quantity<'L'>): void };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(2, 'L'));
  m.setMaterial(mat(materialPath));
  m.setMass(Quantity.of(3, 'kg'));
  return m;
}

function fill(m: TestMould, path: string, litres: number): void {
  const b = m as unknown as {
    setBulkMaterial(a: 'interior', x: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.setBulkMaterial('interior', mat(path));
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  b.setStampedTemperatureK(293);
  b.setLastAmbientK(293);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

describe('cure and the absorbed drain (ceramics S17, D24)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    cloned = [];
    mats();
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      const c = path === PLASTER_MOULD ? makeStuff(() => new TestMould()) : makeStuff(() => new TestCup());
      stampTemplatePathForTest(c, path);
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ plaster slurry in a case, a cup pressed in, cures into a plaster mould with the cup\'s cavity', async () => {
    const r = makeStuff(() => new TestRoom());
    const caseMould = vessel(PINE);
    caseMould.setImpressible(true);
    caseMould.setCastTemplate(PLASTER_MOULD);
    ContainmentApi.move(caseMould, r);
    fill(caseMould, SLURRY, 1);
    // The model is pressed in while the slurry is still soft.
    const cup = makeStuff(() => new TestCup());
    stampTemplatePathForTest(cup, CUP);
    cup.setMaterial(mat(CLAY));
    cup.setMass(Quantity.of(0.3, 'kg'));
    expect((await caseMould.takeImpression(cup, cup)).ok).toBe(true);
    caseMould.reconcileSetting(); // seed
    setNow(10 * 60);
    expect(caseMould.setState()).toBe('setting');
    setNow(16 * 60);
    caseMould.reconcileSetting();
    await settle();
    expect(cloned).toEqual([PLASTER_MOULD]);
    const minted = caseMould.getContents()[0] as unknown as TestMould;
    expect(minted.getMaterial()?.getTemplatePath()).toBe(PLASTER);
    expect(minted.getImpression()?.getKindPath()).toBe(CUP);
    // The case handed its cavity on; it is ready for the next.
    expect(caseMould.getImpression()).toBeNull();
  });

  it('⭐⭐ slip in a plaster mould: the mould drinks it, a cup sets in the cavity, and the mould is wetter', async () => {
    const r = makeStuff(() => new TestRoom());
    const plaster = vessel(PLASTER);
    plaster.setAbsorbent(true);
    plaster.setImpression({
      kindPath: CUP,
      volumeL: 0.17,
      formDescription: 'a cup',
      partsDescription: '',
      takenFromIdentity: '',
      takenAtS: 0,
      carried: {},
    });
    ContainmentApi.move(plaster, r);
    fill(plaster, SLIP, 0.5);
    plaster.reconcileSetting(); // seed
    setNow(0.1 * 86_400);
    plaster.reconcileSetting();
    await settle();
    expect(cloned).toEqual([CUP]);
    const cup = plaster.getContents()[0] as unknown as Good;
    expect(cup.getMaterial()?.getTemplatePath()).toBe(CLAY);
    expect(plaster.getWetness()).toBeGreaterThan(0.05);
  });

  it('slip in a mould that does not drink never sets', async () => {
    const tin = vessel(PINE);
    ContainmentApi.move(tin, makeStuff(() => new TestRoom()));
    fill(tin, SLIP, 0.5);
    tin.reconcileSetting();
    setNow(2 * 86_400);
    tin.reconcileSetting();
    await settle();
    expect(cloned).toEqual([]);
    expect(tin.setState()).toBe('filled');
  });

  it('a wet plaster mould drinks slower', async () => {
    const dry = vessel(PLASTER);
    dry.setAbsorbent(true);
    const wet = vessel(PLASTER);
    wet.setAbsorbent(true);
    wet.wet(0.8);
    for (const m of [dry, wet]) {
      ContainmentApi.move(m, makeStuff(() => new TestRoom()));
      fill(m, SLIP, 0.5);
      m.reconcileSetting();
    }
    setNow(0.05 * 86_400);
    dry.reconcileSetting();
    wet.reconcileSetting();
    expect((dry as unknown as { setProgress: number }).setProgress).toBeGreaterThan(
      (wet as unknown as { setProgress: number }).setProgress,
    );
  });
});
