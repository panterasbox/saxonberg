/**
 * ⭐ A mould's drainings are a TRANSFER through the set (re-plan R1-D8).
 *
 * The whey a curd gives up in a hoop runs into the vessel the hoop stands
 * on by `BulkableApi.transfer(…, { through: 'set', arrivesAs })` — the one
 * move. The population goes with the liquid (a spoiled curd's whey cannot
 * come out clean, and a crock of whey is a living starter because it
 * carries the culture), the dissolved goes with it, the maker goes with
 * it; the curd's IDENTITY does not, and the drainings arrive as whey at
 * whey's own strength. The pool is debited by the move, and the set solid
 * is what is left of the ORIGINAL charge.
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
import { Freshness } from '../../material/Freshness';
import { Contamination } from '../../material/Contaminable';
import { Quantity } from '../../quantity';
import { Grade } from '../../craft/Grade';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { BulkableApi } from '../../../api/bulk';
import { WorldClockApi } from '../../../api/worldclock';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestHoop extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'TestDrainHoop';
}
/** The pail the hoop stands on. */
class TestPail extends PlacingMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good)))) {
  static _mixinName = 'TestDrainPail';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestDrainRoom';
}

const DAY = 86_400;
let now = 1_000_000;
const setNow = (s: number): void => {
  now = 1_000_000 + s;
};

const WHEEL = '/stuff/thing/_drain/wheel';
const CURD = '/stuff/idea/material/_drain/curd';
const CHEESE = '/stuff/idea/material/_drain/cheese';
const WHEY = '/stuff/idea/material/_drain/whey';
const MILKER = '/platform/agent/Avatar/milker';

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

function whey(): Material {
  return material(WHEY, (m) => {
    m.setDensity(Quantity.of(1030, 'kg/m³'));
    m.setSolidsKgPerL(0.05);
  });
}
function curd(): Material {
  material(CHEESE, () => {});
  whey();
  return material(CURD, (m) => {
    m.setNutrientAmounts({ fat: 60000, protein: 60000, water: 800000 });
    m.setDrainSetting({
      days: 0.5,
      becomes: CHEESE,
      drains: WHEY,
      moisture: { unloaded: 0.8, loaded: 0.55 },
      loadRef: 2,
    });
  });
}

function fill<T extends Stuff>(v: T, mat: Material | null, litres: number): T {
  const b = v as unknown as {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material | null): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(10, 'L'));
  b.setBulkMaterial('interior', mat);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  b.setStampedTemperatureK(290);
  b.setLastAmbientK(290);
  return v;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

/** A spoiled, inoculated, made curd in a hoop standing on an empty pail. */
function hoopOnPail(): { hoop: TestHoop; pail: TestPail } {
  const r = makeStuff(() => new TestRoom());
  const pail = fill(makeStuff(() => new TestPail()), null, 0);
  ContainmentApi.move(pail, r);
  const hoop = fill(makeStuff(() => new TestHoop()), curd(), 2);
  hoop.setCastTemplate(WHEEL);
  if (MixinApi.isGraded(hoop)) hoop.setGrade(Grade.of('fine'));
  hoop.setBulkPayload('interior', {
    maker: MILKER,
    recipeId: 'cheddar',
    appearance: 'golden and close',
    keywords: ['cheddar'],
    maturedDays: 3,
    makeup: [{ materialPath: CURD, fraction: 1 }],
    pathogens: { 'e-coli': 0.2 },
    freshness: { load: 0.03, stamp: 0 },
    dissolvedSolidsKgPerL: 0.4,
  });
  ContainmentApi.move(hoop, pail, 'on');
  return { hoop, pail };
}

describe('⭐ the drainings are a transfer through the set (R1-D8)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const c = makeStuff(() => new Provision());
      stampTemplatePathForTest(c, path);
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('a spoiled curd’s whey carries its population and its maker — and is whey, not the curd', async () => {
    const { hoop, pail } = hoopOnPail();
    expect(hoop.drainsInto()).toBe(pail);
    hoop.reconcileSetting(); // stamps the start
    setNow(0.5 * DAY + 60);
    hoop.reconcileSetting();
    await settle();

    const slot = pail.getBulk('interior');
    expect(pail.getBulkMaterialPath('interior')).toBe(WHEY);
    // The suspended passes: the load and the pathogens, at the pool's.
    expect(new Freshness(slot).load()).toBeCloseTo(0.03, 2);
    expect(new Contamination(slot).loads()['e-coli'] ?? 0).toBeCloseTo(0.2, 5);
    const payload = pail.getBulkPayload('interior');
    // The maker passes: harm from the whey names the cheesemaker.
    expect(payload?.maker).toBe(MILKER);
    // The identity does not.
    expect(payload?.recipeId).toBeUndefined();
    expect(payload?.makeup).toBeUndefined();
    expect(payload?.appearance).toBeUndefined();
    expect(payload?.keywords).toBeUndefined();
    expect(payload?.maturedDays).toBeUndefined();
    // Its strength is whey's own, not the curd's.
    expect(payload?.dissolvedSolidsKgPerL ?? 0.05).toBeCloseTo(0.05, 9);
    // A band below the curd's.
    expect(MixinApi.isGraded(pail) ? pail.getGrade().getBand() : '').toBe('fair');
    // poolKg 2 × (1 − 0.8) × 0.8 = 0.32 kg of whey went down.
    expect((slot.getAmount().rawValue() / 1000) * 1030).toBeCloseTo(0.32, 6);
  });

  it('the pool is debited as it sets, and the set solid is the ORIGINAL charge less the drainings', async () => {
    const { hoop, pail } = hoopOnPail();
    hoop.reconcileSetting();
    setNow(0.25 * DAY);
    hoop.reconcileSetting();
    const midL = hoop.getBulkAmount('interior').rawValue();
    const caughtL = pail.getBulkAmount('interior').rawValue();
    expect(caughtL).toBeGreaterThan(0);
    expect(midL).toBeCloseTo(2 - caughtL, 9);

    setNow(0.5 * DAY + 60);
    hoop.reconcileSetting();
    await settle();
    const [cast] = [...hoop.getContents()] as unknown as Provision[];
    expect(cast?.getMaterial()?.getTemplatePath()).toBe(CHEESE);
    // 2 × (1 − (1 − 0.8) × 0.8) = 1.68 — unchanged by the debit.
    expect(cast!.getMass().rawValue()).toBeCloseTo(1.68, 6);
    expect(cast!.getMaker()).toBe(MILKER);
    expect(cast!.getPathogenLoad('e-coli')).toBeCloseTo(0.2, 5);
  });

  it('with nothing beneath, the drainings run away and the solid is the same', async () => {
    const r = makeStuff(() => new TestRoom());
    const hoop = fill(makeStuff(() => new TestHoop()), curd(), 2);
    hoop.setCastTemplate(WHEEL);
    ContainmentApi.move(hoop, r);
    expect(hoop.drainsInto()).toBeNull();
    hoop.reconcileSetting();
    setNow(0.25 * DAY);
    hoop.reconcileSetting();
    expect(hoop.getBulkAmount('interior').rawValue()).toBeLessThan(2);
    setNow(0.5 * DAY + 60);
    hoop.reconcileSetting();
    await settle();
    const [cast] = [...hoop.getContents()] as unknown as Provision[];
    expect(cast!.getMass().rawValue()).toBeCloseTo(1.68, 6);
  });

  it('`through: set` on the bare move: the population and the maker pass, the water state and identity do not', () => {
    const r = makeStuff(() => new TestRoom());
    const hoop = fill(makeStuff(() => new TestHoop()), curd(), 2);
    ContainmentApi.move(hoop, r);
    hoop.setBulkPayload('interior', {
      maker: MILKER,
      recipeId: 'cheddar',
      pathogens: { listeria: 0.4 },
      freshness: { load: 0.1, stamp: 0 },
    });
    const pail = fill(makeStuff(() => new TestPail()), null, 0);
    ContainmentApi.move(pail, r);
    const out = BulkableApi.transfer(
      hoop.getBulk('interior'),
      pail.getBulk('interior'),
      { kind: 'measure', litres: 0.5, mode: 'strict' },
      { through: 'set', arrivesAs: whey() },
    );
    expect(out.applied).toBeCloseTo(0.5, 9);
    expect(hoop.getBulkAmount('interior').rawValue()).toBeCloseTo(1.5, 9);
    expect(pail.getBulkMaterialPath('interior')).toBe(WHEY);
    const slot = pail.getBulk('interior');
    expect(new Contamination(slot).loads()['listeria'] ?? 0).toBeCloseTo(0.4, 5);
    expect(new Freshness(slot).load()).toBeCloseTo(0.1, 2);
    expect(pail.getBulkPayload('interior')?.maker).toBe(MILKER);
    expect(pail.getBulkPayload('interior')?.recipeId).toBeUndefined();
    expect(pail.getBulkPayload('interior')?.water).toBeUndefined();
  });
});
