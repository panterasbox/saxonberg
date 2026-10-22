/**
 * ⭐⭐ Crystallizing (ceramics S17, D32) — the third arm of the bulk phase
 * pass. A solution holding more than its material dissolves at its
 * temperature sets the EXCESS: kept in a mould's shape (one crop that grows),
 * or a lump beside any other vessel. The saturated liquor left either STAYS
 * (the vessel is still concentrating it — a pan the sun is working) or is
 * SPENT: its material swaps to `crystallizesTo.residue` and, in a mould
 * standing on a vessel, it drains into that vessel (`Mould.drainsInto()`).
 *
 * The clone pipeline needs template rows, so `StuffApi.clone` is stubbed to
 * hand back a fresh tangible and record which template was asked (the
 * Mould test's precedent).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Good from '../../stuff/Good';
import Provision from '../../../platform/thing/Provision';
import Material from '../../material/Material';
import { MouldMixin } from '../../mould/Mould';
import { DurableMixin } from '../../material/Durable';
import { CraftedMixin } from '../../craft/Crafted';
import { ThermalMixin } from '../Thermal';
import { BulkableMixin } from '../../bulk/Bulkable';
import { ContainerMixin } from '../../spatial/Container';
import { PlacingMixin } from '../../spatial/Placing';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestPan extends MouldMixin(
  DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))),
) {
  static _mixinName = 'TestCrystalPan';
}
class TestTub extends PlacingMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good)))) {
  static _mixinName = 'TestCrystalTub';
}
class TestPot extends ThermalMixin(BulkableMixin(Good)) {
  static _mixinName = 'TestCrystalPot';
}
class TestRoom extends ContainerMixin(Good) {
  static _mixinName = 'TestCrystalRoom';
}
class TestCrystals extends Provision {}

const CRYSTALS = '/stuff/thing/_crystal/salt-crystals';
const LUMP = '/stuff/thing/_crystal/lump';
const SALT = '/stuff/idea/material/_crystal/salt';
const BRINE = '/stuff/idea/material/_crystal/brine';
const BITTERN = '/stuff/idea/material/_crystal/bittern';
const ALUM = '/stuff/idea/material/_crystal/alum';
const ALUM_LIQUOR = '/stuff/idea/material/_crystal/alum-liquor';

let cloned: string[] = [];
const now = 1_000_000;

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

function salt(): Material {
  return material(SALT, (m) => {
    m.setDensity(Quantity.of(2160, 'kg/m³'));
    m.castTemplate = LUMP;
  });
}
function bittern(): Material {
  return material(BITTERN, (m) => m.setDensity(Quantity.of(1250, 'kg/m³')));
}
function brine(): Material {
  salt();
  bittern();
  return material(BRINE, (m) => {
    m.setDensity(Quantity.of(1025, 'kg/m³'));
    m.setSolidsKgPerL(0.035);
    m.setSolubility([[273, 0.316], [293, 0.317], [373, 0.329]]);
    m.setCrystallizesTo({ product: SALT, residue: BITTERN });
  });
}
function alumLiquor(): Material {
  material(ALUM, (m) => {
    m.setDensity(Quantity.of(1750, 'kg/m³'));
    m.castTemplate = LUMP;
  });
  return material(ALUM_LIQUOR, (m) => {
    m.setDensity(Quantity.of(1300, 'kg/m³'));
    m.setSolidsKgPerL(0.6);
    m.setSolubility([[273, 0.055], [293, 0.12], [333, 0.45], [373, 0.95]]);
    m.setCrystallizesTo({ product: ALUM, residue: ALUM_LIQUOR });
  });
}

function fill<T extends Stuff>(v: T, mat: Material, litres: number, tempK: number, solids?: number): T {
  const b = v as unknown as Stuff & {
    interiorBulk: boolean;
    setInteriorCapacity(q: Quantity<'L'>): void;
    setBulkMaterial(a: 'interior', m: Material): void;
    setBulkAmount(a: 'interior', q: Quantity<'L'>): void;
    setBulkPayload(a: 'interior', p: Record<string, unknown> | null): void;
    setStampedTemperatureK(k: number): void;
    setLastAmbientK(k: number): void;
  };
  b.interiorBulk = true;
  b.setInteriorCapacity(Quantity.of(40, 'L'));
  b.setBulkMaterial('interior', mat);
  b.setBulkAmount('interior', Quantity.of(litres, 'L'));
  if (solids !== undefined) b.setBulkPayload('interior', { dissolvedSolidsKgPerL: solids });
  b.setStampedTemperatureK(tempK);
  b.setLastAmbientK(tempK);
  return v;
}

function pan(): TestPan {
  const p = makeStuff(() => new TestPan());
  p.setCastTemplate(CRYSTALS);
  return p;
}
function tub(): TestTub {
  const t = makeStuff(() => new TestTub());
  (t as unknown as { interiorBulk: boolean }).interiorBulk = true;
  t.setInteriorCapacity(Quantity.of(40, 'L'));
  t.setStampedTemperatureK(293);
  t.setLastAmbientK(293);
  return t;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function contentsOf(c: Stuff): Stuff[] {
  return [...(c as unknown as { getContents(): readonly Stuff[] }).getContents()];
}
function massOf(s: Stuff): number {
  return (s as unknown as { getMass(): Quantity<'kg'> }).getMass().rawValue();
}

describe('Material.solubilityAt — the curve', () => {
  beforeEach(() => StuffApi.clearAll());

  it('reads piecewise-linearly and holds flat past either end; unauthored is null', () => {
    const b = brine();
    expect(b.solubilityAt(283)).toBeCloseTo(0.3165, 6);
    expect(b.solubilityAt(200)).toBe(0.316);
    expect(b.solubilityAt(500)).toBe(0.329);
    expect(salt().solubilityAt(293)).toBeNull();
  });

  it('refuses a curve that is not ascending in K', () => {
    const m = makeStuff(() => new Material());
    expect(() => m.setSolubility([[373, 0.3], [273, 0.2]])).toThrow(/ascending/);
    expect(() => m.setCrystallizesTo({ product: SALT, residue: '' })).toThrow(/residue/);
  });
});

describe('⭐⭐ the crystallize arm', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    cloned = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      cloned.push(path);
      const c = makeStuff(() => new TestCrystals());
      stampTemplatePathForTest(c, path);
      return c;
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  it('⭐ brine past saturation in the pan: salt crystals IN the pan, bittern drained into the tub beneath', async () => {
    const r = makeStuff(() => new TestRoom());
    const t = tub();
    ContainmentApi.move(t, r);
    const p = fill(pan(), brine(), 2, 293, 1.0);
    ContainmentApi.move(p, t, 'on');
    expect(p.drainsInto()).toBe(t);

    p.reconcilePhase();
    await settle();

    // The excess set: (1.0 − 0.317) kg/L × 2 L, in the pan's own shape.
    expect(cloned).toEqual([CRYSTALS]);
    const crop = contentsOf(p).find((c) => c.getTemplatePath() === CRYSTALS)!;
    expect(crop).toBeDefined();
    expect(massOf(crop)).toBeCloseTo((1.0 - 0.317) * 2, 6);
    expect(MixinApi.isTangible(crop) && crop.getMaterial()?.getTemplatePath()).toBe(SALT);

    // The spent liquor is bittern now, and it is in the tub — the pan is dry.
    expect(p.getBulkAmount('interior').rawValue()).toBe(0);
    expect(t.getBulkMaterial('interior')?.getTemplatePath()).toBe(BITTERN);
    // The liquor keeps its volume — the solute's share of it is small.
    expect(t.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    expect(t.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBeCloseTo(0.317, 6);
  });

  it('⭐⭐ BOILED, brine concentrates — the steam is water, the salt stays — and sets a crop', async () => {
    // The ceramics drive: a pan of brine on the hearth held twelve-hour fires
    // and set no salt, because the boil took the solids away with the volume.
    const boiling = material(`${BRINE}-boiling`, (m) => {
      m.setDensity(Quantity.of(1025, 'kg/m³'));
      m.setSolidsKgPerL(0.035);
      m.setSolubility([[273, 0.316], [293, 0.317], [373, 0.329]]);
      m.setCrystallizesTo({ product: SALT, residue: BITTERN });
      m.setBoilingPoint(Quantity.of(373, 'K'));
      m.setLatentHeatOfVaporization(Quantity.of(2_260_000, 'J/kg'));
    });
    salt();
    bittern();
    const r = makeStuff(() => new TestRoom());
    const pot = fill(makeStuff(() => new TestPot()), boiling, 10, 293, 0.28);
    ContainmentApi.move(pot, r);
    let before = 0.28;
    for (let i = 0; i < 40 && cloned.length === 0; i++) {
      pot.setContentsTemperature(450); // the fire under it
      pot.reconcilePhase();
      await settle();
      const now = pot.getBulkPayload('interior')?.dissolvedSolidsKgPerL ?? 0;
      if (cloned.length === 0) expect(now).toBeGreaterThanOrEqual(before);
      before = now;
    }
    expect(cloned.length, 'a crop set').toBeGreaterThan(0);
  });

  it('under saturation nothing sets — sea water at its own 35 g a litre is just sea water', async () => {
    const p = fill(pan(), brine(), 2, 293);
    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([]);
    expect(p.getBulkAmount('interior').rawValue()).toBe(2);
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(BRINE);
  });

  it('⭐ while the pan is still CONCENTRATING it, the liquor stays — brine, saturated — and the crop GROWS', async () => {
    const p = fill(pan(), brine(), 2, 293, 0.5);
    // The pan's evaporative batch is still active (the sun is working it).
    (p as unknown as { getMaturationPhase(): string }).getMaturationPhase = () => 'active';
    const isMaturing = MixinApi.isMaturing.bind(MixinApi);
    vi.spyOn(MixinApi, 'isMaturing').mockImplementation(((s: Stuff) =>
      s === (p as unknown as Stuff) ? true : isMaturing(s)) as typeof MixinApi.isMaturing);

    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([CRYSTALS]);
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(BRINE);
    expect(p.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBeCloseTo(0.317, 6);
    const first = contentsOf(p).find((c) => c.getTemplatePath() === CRYSTALS)!;
    const firstKg = massOf(first);
    expect(firstKg).toBeCloseTo((0.5 - 0.317) * 2, 6);

    // More water leaves: the same crop grows; no second one mints.
    const left = p.getBulkAmount('interior').rawValue();
    p.setBulkAmount('interior', Quantity.of(left / 2, 'L'));
    p.setBulkPayload('interior', { dissolvedSolidsKgPerL: 0.634 });
    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([CRYSTALS]);
    expect(massOf(first)).toBeCloseTo(firstKg + (0.634 - 0.317) * (left / 2), 6);
  });

  it('in a plain pot, the crystals drop BESIDE it and the spent liquor stays in the pot as the residue', async () => {
    const r = makeStuff(() => new TestRoom());
    const pot = fill(makeStuff(() => new TestPot()), brine(), 1, 293, 0.8);
    ContainmentApi.move(pot, r);
    pot.reconcilePhase();
    await settle();
    expect(cloned).toEqual([LUMP]);
    const lump = contentsOf(r).find((c) => c.getTemplatePath() === LUMP)!;
    expect(massOf(lump)).toBeCloseTo((0.8 - 0.317) * 1, 6);
    expect(pot.getBulkMaterial('interior')?.getTemplatePath()).toBe(BITTERN);
    expect(pot.getBulkAmount('interior').rawValue()).toBeGreaterThan(0);
  });

  it('⭐ by COOLING: a hot alum liquor holds its alum, and the same liquor cold sets a crop', async () => {
    const r = makeStuff(() => new TestRoom());
    const hot = fill(makeStuff(() => new TestPot()), alumLiquor(), 1, 373);
    ContainmentApi.move(hot, r);
    hot.reconcilePhase();
    await settle();
    expect(cloned).toEqual([]); // 0.6 kg/L is under the 0.95 a boiling litre holds

    const cold = fill(makeStuff(() => new TestPot()), alumLiquor(), 1, 293);
    ContainmentApi.move(cold, r);
    cold.reconcilePhase();
    await settle();
    expect(cloned).toEqual([LUMP]);
    const crop = contentsOf(r).find((c) => c.getTemplatePath() === LUMP)!;
    expect(massOf(crop)).toBeCloseTo(0.6 - 0.12, 6);
    // The mother liquor is the liquor itself, saturated, kept for the next boil.
    expect(cold.getBulkMaterial('interior')?.getTemplatePath()).toBe(ALUM_LIQUOR);
    expect(cold.getBulkPayload('interior')?.dissolvedSolidsKgPerL).toBeCloseTo(0.12, 6);
  });
});
