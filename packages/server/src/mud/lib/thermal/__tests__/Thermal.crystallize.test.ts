/**
 * ⭐⭐ Crystallizing (ceramics S17, D32) — the third arm of the bulk phase
 * pass. A solution holding more than its material dissolves at its
 * temperature sets the EXCESS: kept in a mould's shape (one crop that grows),
 * or a lump beside any other vessel. The saturated liquor left either STAYS
 * (the vessel is still concentrating it — a pan the sun is working) or is
 * SPENT: its material swaps to `crystallizesTo.residue` and, in a mould, it
 * runs off by the one drip — into the vessel it stands on, else to the
 * ground (matter-model-overlaps D10).
 *
 * The clone pipeline needs template rows, so `StuffApi.clone` is stubbed to
 * hand back a fresh tangible and record which template was asked (the
 * Mould test's precedent).
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { standSolvent } from '../../material/__tests__/materials';
import Good from '../../stuff/Good';
import Provision from '../../../platform/thing/Provision';
import Place from '../../stuff/Place';
import Floor from '../../../platform/thing/Floor';
import { DetachedError } from '../../errors';
import Material from '../../material/Material';
import Water from '../../../platform/idea/material/Water';
import Salt from '../../../platform/idea/material/Salt';
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
import { Placements } from '../../spatial/Placement';
import { Grade } from '../../craft/Grade';
import { TemplatePaths } from '../../paths';

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
class TestRoom extends Place {}
/** A room with a floor that takes a puddle. */
function floored(): { room: TestRoom; floor: Floor } {
  const room = makeStuff(() => new TestRoom());
  const floor = makeStuff(() => new Floor());
  floor.surfaceBulk = true;
  floor.setSurfaceCapacity(Quantity.of(100, 'L'));
  room.addFixture(floor);
  return { room, floor };
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
/**
 * The world clock's registry, held before any `clearAll` wipes the path
 * index — a drain's stamps read game-time only while it stands by its path.
 */
let clockRegistry: Stuff | null = null;
beforeAll(() => {
  WorldClockApi._resetForTesting();
  clockRegistry = StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry) ?? null;
});

function material<K extends Material>(
  make: () => K,
  path: string,
  setup: (m: K) => void,
): K {
  const found = StuffApi.findByTemplatePath<K>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = make();
    m.setName(path.split('/').pop()!);
    m.setDensity(Quantity.of(1000, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(4186, 'J/(kg·K)'));
    setup(m);
    return m;
  }, path) as unknown as K;
}

function salt(): Salt {
  return material(() => new Salt(), SALT, (m) => {
    m.setDensity(Quantity.of(2160, 'kg/m³'));
    m.castTemplate = LUMP;
  });
}
function bittern(): Water {
  return material(() => new Water(), BITTERN, (m) => m.setDensity(Quantity.of(1250, 'kg/m³')));
}
function brine(): Water {
  salt();
  bittern();
  return material(() => new Water(), BRINE, (m) => {
    m.setDensity(Quantity.of(1025, 'kg/m³'));
    m.setSolidsKgPerL(0.035);
    m.setSolubility([[273, 0.316], [293, 0.317], [373, 0.329]]);
    m.setCrystallizesTo({ product: SALT, residue: BITTERN });
  });
}
function alumLiquor(): Water {
  material(() => new Salt(), ALUM, (m) => {
    m.setDensity(Quantity.of(1750, 'kg/m³'));
    m.castTemplate = LUMP;
  });
  return material(() => new Water(), ALUM_LIQUOR, (m) => {
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
    const m = makeStuff(() => new Salt());
    expect(() => m.setSolubility([[373, 0.3], [273, 0.2]])).toThrow(/ascending/);
    expect(() => m.setCrystallizesTo({ product: SALT, residue: '' })).toThrow(/residue/);
  });
});

describe('⭐⭐ the crystallize arm', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    standSolvent();
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
    ContainmentApi.move(p, t, Placements.ON);
    expect(p.dripSlots()[0]?.getHolder()).toBe(t);

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

  it('⭐ reads while a crop is still minting JOIN it — one cast, not one per read (run 30)', async () => {
    const { room: r } = floored();
    const p = fill(pan(), brine(), 2, 293, 1.0);
    ContainmentApi.move(p, r);
    // The first read sets a crop; before its cast lands, the liquor is made
    // over-saturated again and read again — as a boil read a hundred times
    // in one clock advance did.
    p.reconcilePhase();
    // (The first read spent the liquor to bittern: brine again, over-full.)
    fill(p, brine(), 2, 293, 0.5);
    p.reconcilePhase();
    await settle();
    expect(cloned, 'one cast').toEqual([CRYSTALS]);
    const crops = contentsOf(p).filter((c) => c.getTemplatePath() === CRYSTALS);
    expect(crops).toHaveLength(1);
    // Both reads' salt is in it.
    expect(massOf(crops[0]!)).toBeGreaterThan((1.0 - 0.317) * 2);
  });

  it('⭐ a spent pan with nothing under it: its bittern runs to the ground', async () => {
    const { room: r, floor } = floored();
    const p = fill(pan(), brine(), 2, 293, 1.0);
    ContainmentApi.move(p, r);
    p.reconcilePhase();
    await settle();
    expect(p.getBulkAmount('interior').rawValue()).toBe(0);
    expect(floor.getBulkMaterialPath('surface')).toBe(BITTERN);
    expect(floor.getBulkAmount('surface').rawValue()).toBeCloseTo(2, 6);
  });

  it('a spent pan standing over nothing at all has nowhere for its bittern — it says so', () => {
    const p = fill(pan(), brine(), 2, 293, 1.0);
    expect(() => p.reconcilePhase()).toThrow(DetachedError);
    // Checked before the liquor changed.
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(BRINE);
  });

  it('⭐⭐ BOILED, brine concentrates — the steam is water, the salt stays — and sets a crop', async () => {
    // The ceramics drive: a pan of brine on the hearth held twelve-hour fires
    // and set no salt, because the boil took the solids away with the volume.
    const boiling = material(() => new Water(), `${BRINE}-boiling`, (m) => {
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

/**
 * ⭐⭐ Supersaturation waits (matter-model-overlaps D12–D14). A sugar-like
 * liquor — sucrose's solubility, `metastableRatio` 1.7, a purity — set
 * only once something STARTS it: a seed, a stir, deep cooling, or the
 * drying edge. The crop takes sucrose only, so what is left is less pure by
 * the mass balance, graded off that purity; under `minCrystalPurity` it
 * will not grain at all. In a mould the spent liquor runs out over the
 * row's `drainDays` by the one drip, on one wake.
 */
describe('⭐⭐ supersaturation waits — and the purity mass balance', () => {
  const STRIKE = '/stuff/idea/material/_crystal/strike';
  const MOLASSES = '/stuff/idea/material/_crystal/molasses';
  const LOAF = '/stuff/idea/material/_crystal/loaf-sugar';
  const RAW = '/stuff/idea/material/_crystal/raw-sugar';
  const BLOCK = '/stuff/thing/_crystal/raw-sugar-block';
  const SUCROSE: Array<[number, number]> = [[273, 0.86], [293, 0.89], [323, 0.98], [353, 1.1], [373, 1.2], [395, 1.38]];
  const GRADES: Array<[number, 'poor' | 'fair' | 'fine']> = [[0, 'poor'], [0.88, 'fair'], [0.92, 'fine']];
  const STRUCK = 0.9 / (1 - 0.375 * 0.9); // 1.358 kg/L — a strike, w = 0.9
  const DAY = 86_400;
  let clockNow = 1_000_000;
  const through = (gameS: number): void => {
    WorldClockApi._advanceForTesting(gameS);
    clockNow += gameS;
  };

  function sugared(m: Water): void {
    m.setDensity(Quantity.of(1400, 'kg/m³'));
    m.setSolubility(SUCROSE);
    m.setCrystallizesTo({
      product: LOAF,
      residue: MOLASSES,
      productAs: { [BLOCK]: RAW },
      drainDays: 4,
      metastableRatio: 1.7,
      purity: 0.8,
      minCrystalPurity: 0.86,
      gradeByPurity: GRADES,
    });
    m.setTags(['liquid']);
  }
  function strike(): Water {
    material(() => new Salt(), LOAF, (m) => {
      m.setDensity(Quantity.of(1590, 'kg/m³'));
      m.castTemplate = LUMP;
    });
    material(() => new Salt(), RAW, (m) => m.setDensity(Quantity.of(1500, 'kg/m³')));
    material(() => new Water(), MOLASSES, sugared);
    return material(() => new Water(), STRIKE, (m) => {
      sugared(m);
      m.setSolidsKgPerL(STRUCK);
    });
  }
  function payloadOf(v: Stuff): Record<string, unknown> {
    return ((v as unknown as { getBulkPayload(a: 'interior'): Record<string, unknown> | null }).getBulkPayload('interior') ?? {});
  }
  function withPayload<T extends Stuff>(v: T, p: Record<string, unknown>): T {
    (v as unknown as { setBulkPayload(a: 'interior', p: Record<string, unknown>): void }).setBulkPayload('interior', p);
    return v;
  }
  function gradeOf(s: Stuff): string | null {
    return MixinApi.isGraded(s) ? s.getGrade().getBand() : null;
  }
  /** A fine pan standing on a tub, holding `litres` of strike at 293 K. */
  function struckPan(litres = 2, payload: Record<string, unknown> = { purity: 0.93, grade: 'fine' }): { p: TestPan; t: TestTub } {
    const r = makeStuff(() => new TestRoom());
    const t = tub();
    ContainmentApi.move(t, r);
    const p = withPayload(fill(pan(), strike(), litres, 293), { dissolvedSolidsKgPerL: STRUCK, ...payload });
    if (MixinApi.isGraded(p)) p.setGrade(Grade.of('fine'));
    ContainmentApi.move(p, t, Placements.ON);
    return { p, t };
  }
  function plainPot(purity: number, extra: Record<string, unknown> = {}): TestPot {
    const r = makeStuff(() => new TestRoom());
    const pot = withPayload(fill(makeStuff(() => new TestPot()), strike(), 1, 293), {
      dissolvedSolidsKgPerL: STRUCK,
      purity,
      ...extra,
    });
    ContainmentApi.move(pot, r);
    return pot;
  }

  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    // The clock's registry back on its path (`clearAll` took it): the drain
    // stamps game-time only while it stands there.
    if (clockRegistry === null) throw new Error('test setup: no world clock registry');
    stampTemplatePathForTest(clockRegistry, TemplatePaths.worldClockRegistry);
    clockNow = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => clockNow);
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

  it('⭐ a strike held cold and unseeded sets NOTHING — it holds, and says so', async () => {
    const { p, t } = struckPan();
    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([]);
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(STRIKE);
    expect(t.getBulkAmount('interior').rawValue()).toBe(0);
    const over = p.supersaturation();
    expect(over?.ratio).toBeCloseTo(STRUCK / 0.89, 6);
    expect(over?.started).toBe(false);
  });

  it('⭐⭐ SEEDED it sets — the seed joins the crop — and the molasses runs out over four days, on one wake', async () => {
    const { p, t } = struckPan();
    const seed = makeStuff(() => new TestCrystals());
    seed.setMaterial(StuffApi.findByTemplatePath<Material>(LOAF)!);
    seed.setMass(Quantity.of(0.1, 'kg'));
    ContainmentApi.move(seed, p);
    p.reconcilePhase();
    await settle();

    // The crop: the excess at 20 °C, and the seed in it.
    expect(cloned).toEqual([CRYSTALS]);
    const crop = contentsOf(p).find((c) => c.getTemplatePath() === CRYSTALS)!;
    expect(massOf(crop)).toBeCloseTo((STRUCK - 0.89) * 2 + 0.1, 6);
    expect(seed.isDestroyed()).toBe(true);
    expect(gradeOf(crop)).toBe('fine');

    // The mother liquor is molasses, still in the cone, and less pure.
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(MOLASSES);
    expect(p.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 6);
    const S = STRUCK * 2;
    const x = (STRUCK - 0.89) * 2;
    expect(payloadOf(p).purity as number).toBeCloseTo((S * 0.93 - x) / (S - x), 9);
    expect(payloadOf(p).grade).toBe('fair');
    expect(p.getLiquorWakeAtS()).toBeCloseTo(WorldClockApi.getNow().rawValue() + 4 * DAY, 0);

    // Two days on and read: half of it has run into the tub.
    through(2 * DAY);
    p.reconcilePhase();
    expect(t.getBulkAmount('interior').rawValue()).toBeCloseTo(1, 3);
    expect(t.getBulkMaterial('interior')?.getTemplatePath()).toBe(MOLASSES);
    // The drain's clock is the cone's: it never rides into the tub.
    expect(payloadOf(t).liquorDrainDueS).toBeUndefined();

    // Nobody reads it again: the wake runs the rest out at the fourth day.
    through(2 * DAY + 60);
    expect(t.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 3);
    expect(p.getBulkAmount('interior').rawValue()).toBe(0);
    expect(p.getLiquorWakeAtS()).toBe(0);
    expect(payloadOf(t).grade).toBe('fair');
  });

  it('a restart mid-drain re-arms from the persisted due time', async () => {
    const { p, t } = struckPan();
    withPayload(p, { ...payloadOf(p), nucleated: true });
    p.reconcilePhase();
    await settle();
    const due = p.getLiquorWakeAtS();
    expect(due).toBeGreaterThan(0);
    // The restore door: the applier writes the persisted field back.
    p.setLiquorWakeAtS(due);
    through(4 * DAY + 60);
    expect(t.getBulkAmount('interior').rawValue()).toBeCloseTo(2, 3);
  });

  it('⭐ STIRRED it sets — `noteAgitated` starts a supersaturated liquor; under saturation it starts nothing', async () => {
    const pot = plainPot(0.93);
    expect(pot.noteAgitated()).toBe(true);
    await settle();
    expect(cloned).toEqual([LUMP]);
    expect(pot.getBulkMaterial('interior')?.getTemplatePath()).toBe(MOLASSES);

    const thin = plainPot(0.93, { dissolvedSolidsKgPerL: 0.6 });
    expect(thin.noteAgitated()).toBe(false);
    expect(payloadOf(thin).nucleated).toBeUndefined();
  });

  it('⭐ COOLED PAST its metastable ratio it starts on its own — a coarse mass, a band lower', async () => {
    const deep = 1.7 * 0.89 + 0.01;
    const own = struckPan(2, { dissolvedSolidsKgPerL: deep, purity: 0.95, grade: 'fine' }).p;
    own.reconcilePhase();
    await settle();
    const stirred = struckPan(2, { dissolvedSolidsKgPerL: deep, purity: 0.95, grade: 'fine', nucleated: true }).p;
    stirred.reconcilePhase();
    await settle();
    const cropOf = (v: Stuff): Stuff => contentsOf(v).find((c) => c.getTemplatePath() === CRYSTALS)!;
    expect(gradeOf(cropOf(stirred))).toBe('fine');
    expect(gradeOf(cropOf(own))).toBe('fair');
  });

  it('⭐ on the DRYING EDGE (a pan the sun is working) it starts below its metastable ratio', async () => {
    const { p } = struckPan();
    (p as unknown as { getMaturationPhase(): string }).getMaturationPhase = () => 'active';
    const isMaturing = MixinApi.isMaturing.bind(MixinApi);
    vi.spyOn(MixinApi, 'isMaturing').mockImplementation(((s: Stuff) =>
      s === (p as unknown as Stuff) ? true : isMaturing(s)) as typeof MixinApi.isMaturing);
    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([CRYSTALS]);
    // Still concentrating: the liquor stays itself.
    expect(p.getBulkMaterial('interior')?.getTemplatePath()).toBe(STRIKE);
  });

  it('back under saturation, whatever started it is cleared', () => {
    const pot = plainPot(0.93, { dissolvedSolidsKgPerL: 0.6, nucleated: true });
    pot.reconcilePhase();
    expect(payloadOf(pot).nucleated).toBeUndefined();
  });

  it('⭐ the shape names the crop — a curing hogshead sets raw sugar (`productAs`)', async () => {
    const { p } = struckPan(2, { purity: 0.93, nucleated: true });
    p.setCastTemplate(BLOCK);
    p.reconcilePhase();
    await settle();
    expect(cloned).toEqual([BLOCK]);
    const block = contentsOf(p).find((c) => c.getTemplatePath() === BLOCK)!;
    expect(MixinApi.isTangible(block) && block.getMaterial()?.getTemplatePath()).toBe(RAW);
  });

  it('⭐⭐⭐ each pass is poorer by the mass balance, graded off its purity — and the pass under `minCrystalPurity` will not grain: blackstrap', async () => {
    // The season, by arithmetic: a strike boiled to w = 0.9 and cooled to
    // 20 °C gives up `x` of its `S` solids as crystals, all of it sucrose.
    const S = STRUCK;
    const x = STRUCK - 0.89;
    const next = (p: number): number => (S * p - x) / (S - x);
    const passes: Array<{ purity: number; grade: unknown }> = [];
    let purity = 0.93;
    for (let i = 0; i < 2; i++) {
      const pot = plainPot(purity, { nucleated: true });
      pot.reconcilePhase();
      await settle();
      const left = payloadOf(pot);
      expect(left.purity as number).toBeCloseTo(next(purity), 9);
      expect(left.purity as number).toBeLessThan(purity);
      passes.push({ purity: left.purity as number, grade: left.grade });
      purity = left.purity as number;
    }
    // First molasses is fair; the second is poor — and under 0.86.
    expect(passes.map((p) => p.grade)).toEqual(['fair', 'poor']);
    expect(purity).toBeLessThan(0.86);
    // The third strike: stirred, seeded or cooled, it will not grain.
    cloned = [];
    const black = plainPot(purity, { nucleated: true, dissolvedSolidsKgPerL: 1.7 * 0.89 + 0.05 });
    expect(black.supersaturation()).toBeNull();
    expect(black.noteAgitated()).toBe(false);
    black.reconcilePhase();
    await settle();
    expect(cloned).toEqual([]);
    expect(black.getBulkMaterial('interior')?.getTemplatePath()).toBe(STRIKE);
  });

  it('refuses a malformed purity, ratio or grade table', () => {
    const m = strike();
    const base = { product: LOAF, residue: MOLASSES };
    expect(() => m.setCrystallizesTo({ ...base, metastableRatio: 0.9 })).toThrow(RangeError);
    expect(() => m.setCrystallizesTo({ ...base, purity: 1.2 })).toThrow(RangeError);
    expect(() => m.setCrystallizesTo({ ...base, minCrystalPurity: 1 })).toThrow(RangeError);
    expect(() => m.setCrystallizesTo({ ...base, gradeByPurity: [[0.9, 'fine'], [0.5, 'poor']] })).toThrow(RangeError);
    expect(() => m.setCrystallizesTo({ ...base, drainDays: -1 })).toThrow(TypeError);
    expect(m.getMetastableRatio()).toBe(1.7);
    expect(m.gradeAtPurity(0.5)).toBe('poor');
    expect(m.gradeAtPurity(0.9)).toBe('fair');
    expect(m.productFor(BLOCK)).toBe(RAW);
    expect(m.productFor('/other')).toBe(LOAF);
  });
});
