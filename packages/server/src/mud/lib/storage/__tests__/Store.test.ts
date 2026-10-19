/**
 * ⭐⭐ The store (storage-and-ice W2, D1–D7): a holder whose contents are a
 * ledger.
 *
 *  1. **The face** — through the REAL movement primitive: a block moved in
 *     becomes a line's face; a second of the same grade is absorbed; a lump
 *     and a block of one grade share a line; taking the face out debits the
 *     line and re-faces; a face that is destructed is not debited twice.
 *  2. **The veto** — a full house and a good that does not pool are
 *     refused in the store's own words.
 *  3. **The physics** — the icehouse arithmetic's three inequalities: a
 *     small house loses a larger SHARE than a large one, thin packing melts
 *     faster than thick, a soaked packing faster than dry; and the room
 *     with ice in it reads colder than the same room empty.
 *  4. **Persistence** — the ledger round-trips through `materialize`.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Location from '../../location/Location';
import CartesianZone from '../../../platform/idea/location/CartesianZone';
import Material from '../../material/Material';
import Good from '../../../platform/thing/Good';
import Holder from '../../stuff/Holder';
import Stockpile from '../../../platform/thing/Stockpile';
import IceBlock from '../../../platform/thing/IceBlock';
import { StackableMixin } from '../../stuff/Stackable';
import { PoolableMixin } from '../Poolable';
import type { PoolRole } from '../StoreLine';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import { ParcelApi } from '../../../api/parcel';
import { WorldClockApi } from '../../../api/worldclock';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { Document } from '../../persistence/Document';
import { TemplatePaths } from '../../paths';
import { Quantity } from '../../quantity';
import type { Stuff } from '../../stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const ICE = '/stuff/idea/material/bulk/ice';
const DUST = '/stuff/idea/material/wood/sawdust';
const BLOCK = '/stuff/thing/ice-block';
const LUMP = '/stuff/thing/ice-lump';
const PACK = '/stuff/thing/_test/packing';
const INDOOR = '/stuff/idea/biome/_store/indoor';

/** The test's packing: a sawdust-shaped heap, a kilogram a unit. */
class Packing extends PoolableMixin(StackableMixin(Good)) {
  public override poolKey(): string {
    const self = this as unknown as Stuff;
    return `sawdust|${MixinApi.isWet(self) ? self.getWetnessBand() : 'dry'}`;
  }
  public override poolState(): Record<string, number> {
    const self = this as unknown as Stuff;
    return { saturation: MixinApi.isWet(self) ? self.getWetness() : 0 };
  }
  public override applyPoolState(state: Record<string, number>): void {
    const self = this as unknown as Stuff;
    if (MixinApi.isWet(self)) self.wet((state.saturation ?? 0) - self.getWetness());
  }
  public override poolRole(): PoolRole {
    return 'packing';
  }
}

let real = 0;
const advanceDays = (d: number): void => {
  real += ((d * 86400) / 12) * 1000;
};

function material(path: string, f: (m: Material) => void): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    f(m);
    return m;
  }, path) as unknown as Material;
}

function iceMaterial(): Material {
  return material(ICE, (m) => {
    m.setDensity(Quantity.of(917, 'kg/m³'));
    m.setThermalConductivity(Quantity.of(2.2, 'W/(m·K)'));
    m.setSpecificHeat(Quantity.of(2100, 'J/(kg·K)'));
    (m as unknown as { meltingPoint: Quantity<'K'> }).meltingPoint = Quantity.of(273.15, 'K');
    (m as unknown as { latentHeatOfFusion: Quantity<'J/kg'> }).latentHeatOfFusion =
      Quantity.of(334_000, 'J/kg');
  });
}

function dustMaterial(): Material {
  return material(DUST, (m) => {
    m.setDensity(Quantity.of(200, 'kg/m³'));
    m.setThermalConductivity(Quantity.of(0.06, 'W/(m·K)'));
    m.setSpecificHeat(Quantity.of(2000, 'J/(kg·K)'));
    m.setWaterAbsorptionCapacity(Quantity.of(100, '%'));
  });
}

function block(kg = 4, path = BLOCK, quality: 'black' | 'cloudy' = 'cloudy', tempK = 270): IceBlock {
  const b = makeStuff(() => new IceBlock());
  stampTemplatePathForTest(b, path);
  b.setMaterial(StuffApi.findByTemplatePath<Material>(ICE) as Material);
  b.setMass(Quantity.of(kg, 'kg'));
  b.setIceQuality(quality);
  b.setStampedTemperatureK(tempK);
  b.setLastAmbientK(tempK);
  return b;
}

function dust(kg: number): Packing {
  const d = makeStuff(() => new Packing());
  stampTemplatePathForTest(d, PACK);
  d.setMaterial(StuffApi.findByTemplatePath<Material>(DUST) as Material);
  d.setMass(Quantity.of(1, 'kg'));
  d.setQuantity(kg);
  return d;
}

/** A shed of `volumeM3` with 0.4 m sawdust walls, outside at `outsideK`. */
function shed(volumeM3: number, outsideK = 293): Location {
  const zone = makeStuff(() => new CartesianZone());
  zone.setCellSize(Math.cbrt(volumeM3));
  const r = makeStuff(() => new Location());
  zone.addLocation(r, 0, 0, 0);
  (r as unknown as Record<string, unknown>)._biomePath = INDOOR;
  (r as unknown as { setEnclosure(f: unknown): void }).setEnclosure({
    material: DUST,
    thicknessM: 0.4,
  });
  (r as unknown as { envelopeOutsideK: number }).envelopeOutsideK = outsideK;
  (r as unknown as { envelopeTemperatureK: number }).envelopeTemperatureK = outsideK;
  return r;
}

function stack(room: Location, capacityKg = 0): Stockpile {
  const s = makeStuff(() => new Stockpile());
  s.capacityKg = capacityKg;
  ContainmentApi.move(s, room);
  return s;
}

/** A store seeded with lines, in its own shed. */
async function seeded(
  volumeM3: number,
  iceKg: number,
  dustKg: number,
  dustSaturation = 0,
): Promise<{ room: Location; store: Stockpile }> {
  const room = shed(volumeM3);
  const store = stack(room);
  store.initialLines = [
    { goodPath: BLOCK, amountKg: iceKg, grade: 'black', state: { temperatureK: 273.15 } },
    ...(dustKg > 0
      ? [{ goodPath: PACK, amountKg: dustKg, state: { saturation: dustSaturation } }]
      : []),
  ];
  await store.seedFromRow();
  return { room, store };
}

const iceKg = (s: Stockpile): number =>
  s.getLines().filter((l) => l.role === 'stock').reduce((n, l) => n + l.amountKg, 0);

let snapshots: Record<string, unknown>[];

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  WorldClockApi.setScale(12);
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    makeStuffAtPath(() => new WorldClockRegistry(), TemplatePaths.worldClockRegistry);
  }
  makeStuffAtPath(() => new TemplateApplier(), TemplateApplier.templatePath);
  iceMaterial();
  dustMaterial();

  snapshots = [];
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    isConnected: () => true,
    save: vi.fn(async (col: string, doc: Record<string, unknown>) => {
      if (col !== 'holder_snapshots') return 'id';
      const i = snapshots.findIndex((d) => d.scope === doc.scope && d.owner === doc.owner);
      if (i >= 0) snapshots[i] = { ...doc, _id: snapshots[i]!._id };
      else snapshots.push({ ...doc, _id: String(snapshots.length + 1) });
      return 'id';
    }),
    find: vi.fn(async (col: string, query: Record<string, unknown>) =>
      col !== 'holder_snapshots'
        ? []
        : snapshots.filter((d) => Object.entries(query).every(([k, v]) => d[k] === v)),
    ),
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({ kind: 'group', name: 'test' });
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
    if (path === BLOCK || path === LUMP) return block(1, path);
    if (path === PACK) return dust(1);
    throw new Error(`unexpected clone ${path}`);
  }) as unknown as typeof StuffApi.clone);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the face — a store holds counts and shows the top of each line', () => {
  it('⭐ a block moved in becomes the face; a second of its grade is absorbed', async () => {
    const room = shed(48);
    const store = stack(room);
    const a = block(4);
    ContainmentApi.move(a, store);
    await store.whenSettled();
    expect(store.getLines().map((l) => [l.poolKey, l.amountKg])).toEqual([['ice|cloudy', 4]]);
    expect(store.faceFor('ice|cloudy')).toBe(a);

    const b = block(4);
    ContainmentApi.move(b, store);
    await store.whenSettled();
    expect(store.getLine('ice|cloudy')!.amountKg).toBe(8);
    expect(b.isDestroyed()).toBe(true);
    expect(store.getContents()).toEqual([a]);
  });

  it('⭐ a lump and a block of one grade land on ONE line (D2)', async () => {
    const store = stack(shed(48));
    ContainmentApi.move(block(4, BLOCK), store);
    ContainmentApi.move(block(1, LUMP), store);
    await store.whenSettled();
    const lines = store.getLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amountKg).toBe(5);
    expect(lines[0]!.goodPath).toBe(BLOCK);
  });

  it('grades do not mix: black ice is its own line', async () => {
    const store = stack(shed(48));
    ContainmentApi.move(block(4, BLOCK, 'black'), store);
    ContainmentApi.move(block(4, BLOCK, 'cloudy'), store);
    await store.whenSettled();
    expect(store.getLines().map((l) => l.poolKey).sort()).toEqual(['ice|black', 'ice|cloudy']);
  });

  it('⭐ taking the face out debits the line (off the books) and re-faces', async () => {
    const room = shed(48);
    const store = stack(room);
    ContainmentApi.move(block(4), store);
    ContainmentApi.move(block(4), store);
    await store.whenSettled();
    const face = store.faceFor('ice|cloudy')!;
    const taker = makeStuff(() => new Holder());
    ContainmentApi.move(taker, room);
    ContainmentApi.move(face as Stuff & never, taker);
    await store.whenSettled();
    expect(store.getLine('ice|cloudy')!.amountKg).toBe(4);
    const next = store.faceFor('ice|cloudy');
    expect(next).not.toBeNull();
    expect(next).not.toBe(face);
    expect((next as unknown as IceBlock).getIceQuality()).toBe('cloudy');
  });

  it('⚠ a face that is DESTRUCTED is not debited again — the line keeps its stock', async () => {
    const store = stack(shed(48));
    ContainmentApi.move(block(4), store);
    ContainmentApi.move(block(4), store);
    await store.whenSettled();
    const face = store.faceFor('ice|cloudy')!;
    await StuffApi.destruct(face);
    await store.whenSettled();
    expect(store.getLine('ice|cloudy')!.amountKg).toBe(8);
    expect(store.faceFor('ice|cloudy')).not.toBeNull();
  });

  it('taking the last unit empties the line and leaves no face', async () => {
    const room = shed(48);
    const store = stack(room);
    ContainmentApi.move(block(4), store);
    await store.whenSettled();
    const taker = makeStuff(() => new Holder());
    ContainmentApi.move(taker, room);
    ContainmentApi.move(store.faceFor('ice|cloudy') as Stuff & never, taker);
    await store.whenSettled();
    expect(store.getLines()).toEqual([]);
    expect(store.getContents()).toEqual([]);
  });

  it('a packing heap is absorbed by the kilogram, wet dust on its own line', async () => {
    const store = stack(shed(48));
    ContainmentApi.move(dust(10), store);
    await store.whenSettled();
    ContainmentApi.move(dust(5), store);
    const wet = dust(3);
    wet.wet(0.9);
    ContainmentApi.move(wet, store);
    await store.whenSettled();
    expect(store.getLine('sawdust|dry')!.amountKg).toBe(15);
    expect(store.getLine('sawdust|soaked')!.amountKg).toBe(3);
    // The face is one unit, whatever the stack substrate merged into it.
    const face = store.faceFor('sawdust|dry') as unknown as Packing;
    expect(face.getQuantity()).toBe(1);
  });
});

describe('the veto — capacity is mass, refused in the house\'s own words (D7)', () => {
  it('a full house refuses, and a good that does not pool is refused', async () => {
    const store = stack(shed(48), 6);
    ContainmentApi.move(block(4), store);
    await store.whenSettled();
    expect(store.canAddContainable(block(4) as Stuff & never)).toEqual({
      ok: false,
      reason: 'The house is full.',
    });
    const stone = makeStuff(() => new Good());
    expect(store.canAddContainable(stone as Stuff & never).ok).toBe(false);
    expect(() => ContainmentApi.move(block(4), store)).toThrow();
  });
});

describe('the icehouse arithmetic (D4) — the three inequalities, derived', () => {
  const dayLoss = async (vol: number, ice: number, dustKg: number, sat = 0): Promise<number> => {
    const { store } = await seeded(vol, ice, dustKg, sat);
    await store.reconcile();
    advanceDays(1);
    await store.reconcile();
    return ice - iceKg(store);
  };

  it('⭐ a large house loses tens of kg a day in summer; a small one loses a larger SHARE', async () => {
    const large = await dayLoss(48, 20_000, 2_000);
    const small = await dayLoss(8, 2_000, 200);
    expect(large).toBeGreaterThan(10);
    expect(large).toBeLessThan(60);
    expect(small).toBeGreaterThan(3);
    expect(small / 2_000).toBeGreaterThan((large / 20_000) * 3);
  });

  it('thin packing melts faster than thick, and soaked faster than dry', async () => {
    const thick = await dayLoss(48, 20_000, 2_000);
    const thin = await dayLoss(48, 20_000, 500);
    const soaked = await dayLoss(48, 20_000, 2_000, 1);
    expect(thin).toBeGreaterThan(thick * 1.5);
    // ⚠ Less than the packing's own 10× conductivity suggests: the soaked
    // house pulls its own room colder, which narrows the gap it melts by.
    expect(soaked).toBeGreaterThan(thick * 1.5);
  });

  it('⭐ the meltwater soaks the packing — the spiral', async () => {
    const { store } = await seeded(48, 20_000, 2_000);
    await store.reconcile();
    advanceDays(30);
    await store.reconcile();
    const sat = store.getLine('sawdust|dry')?.state.saturation ?? store.getLines().find((l) => l.role === 'packing')!.state.saturation!;
    expect(sat).toBeGreaterThan(0.05);
  });

  it('⭐ the house with ice in it reads colder than the same shed empty (D5)', async () => {
    const { room } = await seeded(48, 20_000, 2_000);
    const empty = shed(48);
    const withIce = (room as unknown as { envelopeSteadyStateK(o: number, t: number): number }).envelopeSteadyStateK(293, 0);
    const without = (empty as unknown as { envelopeSteadyStateK(o: number, t: number): number }).envelopeSteadyStateK(293, 0);
    expect(without).toBeCloseTo(293, 6);
    expect(withIce).toBeLessThan(290);
    expect(withIce).toBeGreaterThan(273.15);
  });

  it('a cold winter shed melts nothing', async () => {
    const room = shed(48, 260);
    const store = stack(room);
    store.initialLines = [{ goodPath: BLOCK, amountKg: 20_000, state: { temperatureK: 270 } }];
    await store.seedFromRow();
    await store.reconcile();
    advanceDays(5);
    await store.reconcile();
    expect(iceKg(store)).toBeCloseTo(20_000, 6);
    expect(store.getLines()[0]!.state.temperatureK!).toBeLessThan(270);
  });
});

describe('persistence — the ledger round-trips through materialize', () => {
  it('a captured store restores its lines onto a fresh shell', async () => {
    const { store } = await seeded(48, 20_000, 2_000);
    stampTemplatePathForTest(store, '/stuff/thing/_test/stack');
    await PersistableApi.capture(store);
    const want = store.getLines().map((l) => [l.poolKey, l.amountKg]).sort();
    await StuffApi.destruct(store);
    const fresh = makeStuff(() => new Stockpile());
    stampTemplatePathForTest(fresh, '/stuff/thing/_test/stack');
    await PersistableApi.materialize(fresh);
    expect(fresh.getLines().map((l) => [l.poolKey, l.amountKg]).sort()).toEqual(want);
    expect(want.length).toBe(2);
  });
});

describe('⭐ the seed is laid down by the hydration source (a fresh house)', () => {
  it('a stack with no record seeds its row; a second hydration does not seed again', async () => {
    const room = shed(48);
    const store = stack(room);
    // ⚠ Through the APPLIER, as a row's clone runs it (the drive, run 1:
    // an authorable-only field reached the instance as nothing, and a test
    // that assigned the field directly could not see it).
    const applier = StuffApi.findByTemplatePath<TemplateApplier>(TemplateApplier.templatePath)!;
    await applier.apply(
      store,
      {
        initialLines: [
          { goodPath: BLOCK, amountKg: 20_000, grade: 'black', state: { temperatureK: 272 } },
          { goodPath: PACK, amountKg: 2_000, state: { saturation: 0 } },
        ],
      },
      { mode: 'mint' },
    );
    const out = await Stockpile.hydrateFromSource(store);
    expect(out.status).toBe('hydrated');
    expect(iceKg(store)).toBeCloseTo(20_000, 0);
    await Stockpile.hydrateFromSource(store);
    expect(iceKg(store)).toBeCloseTo(20_000, 0);
  });
});

describe('⭐ what a building is for, and what its house can sell (the storage-and-ice review)', () => {
  it('an acceptance list names a whole pool KIND — `ice` takes every grade, and refuses the rest', async () => {
    const room = shed(48);
    const store = stack(room);
    store.acceptsPoolKeys = ['ice'];
    expect(store.canAddContainable(block(4, BLOCK, 'black')).ok).toBe(true);
    expect(store.canAddContainable(block(4, BLOCK, 'cloudy')).ok).toBe(true);
    const refused = store.canAddContainable(dust(5));
    expect(refused.ok).toBe(false);
    expect(refused.ok ? '' : refused.reason).toMatch(/does not take/);
  });

  it('⭐ the house\'s days of supply: its claim, its share of the melt, its OWN draws', async () => {
    const { store } = await seeded(48, 20_000, 0);
    // The ledger itself (getLines() hands out copies).
    const line = (store as unknown as { lines: Array<Record<string, number | string>> }).lines[0]! as unknown as {
      poolKey: string; lossKgPerDay: number; drawKgPerDay: number; houseDrawKgPerDay?: number;
    };
    line.lossKgPerDay = 20;
    line.drawKgPerDay = 0;
    line.houseDrawKgPerDay = 0;
    // No claims read yet: the stock is the house's — the whole stack.
    expect(store.houseDaysOfSupply(BLOCK)).toBeCloseTo(1000, 6);
    // A depositor holds a quarter: the house holds 15 t and bears 3/4 of the melt.
    const house = (store as unknown as { businessPath: string }).businessPath || '/house';
    (store as unknown as { businessPath: string }).businessPath = house;
    (store as unknown as { _claimsCache: unknown[] })._claimsCache = [
      { depositor: house, poolKey: line.poolKey, unit: 'kg', amountKg: 15_000, terms: {} },
      { depositor: '/someone', poolKey: line.poolKey, unit: 'kg', amountKg: 5_000, terms: {} },
    ];
    expect(store.houseDaysOfSupply(BLOCK)).toBeCloseTo(15_000 / 15, 6);
    // ⚠ A depositor taking their own ice home is not the house selling: the
    // draw that counts is the house's alone.
    line.drawKgPerDay = 100;
    expect(store.houseDaysOfSupply(BLOCK)).toBeCloseTo(15_000 / 15, 6);
    line.houseDrawKgPerDay = 35;
    expect(store.houseDaysOfSupply(BLOCK)).toBeCloseTo(15_000 / 50, 6);
  });
});
