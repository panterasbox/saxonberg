/**
 * The mine's two halves (metal chain M2), and ⭐⭐ **the split IS the
 * test**: every read is exercised through {@link Working} without a
 * warren in sight, then the mutations are exercised through
 * {@link MineWarren}.
 *
 * If a read here needed the warren, a bespoke hand-authored mine would
 * have no ground refusal and no foul air — half of what makes a mine a
 * mine — and the exemplar claim *a second mining town needs zero pack
 * code* would be false.
 *
 * Synthetic rows against an in-memory store (the `HoldingWarren` harness
 * shape), so the numbers Rejection tunes never break this suite.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MineWarren from '../MineWarren';
import Deposit from '../Deposit';
import MineRoom from '../../location/MineRoom';
import type { Working } from '../../lib/Working';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import Prop from '@saxonberg/server/mud/platform/thing/Prop';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Cell } from '../../lib/Working';

interface Doc extends Record<string, unknown> { _id?: string }

const PH = PersistentHydrator.templatePath;
const ZONE = '/world/fx-mine/mine';
const DEPOSIT = '/world/fx-mine/idea/deposit/fx';
const WARREN = '/world/fx-mine/idea/fx-warren';
const ADIT = '/world/fx-mine/location/adit';
const WORKING_CLASS = '/trade/mining/location/MineRoom';
const TYPE_ROWS = {
  face: '/world/fx-mine/location/face',
  junction: '/world/fx-mine/location/junction',
  stope: '/world/fx-mine/location/stope',
  fall: '/world/fx-mine/location/fall',
};
const SLATE = '/stuff/idea/material/rock/slate';
const GRANITE = '/stuff/idea/material/rock/granite';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const QUARTZ = '/stuff/idea/material/mineral/quartz';
const EXTENT = '/world/fx-mine/claims/1';

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) { arr = []; store.set(name, arr); }
  return arr;
}

function seedContent(): void {
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, hydratorClass: PH, data });
  content.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  for (const [kind, path] of Object.entries(TYPE_ROWS)) {
    add(path, WORKING_CLASS, {
      shortDescription: `a ${kind}`,
      backPhrases: [`the back is ${kind}-ish`],
      seamPhrases: ['green staining runs along the seam'],
    });
  }
  add('/world/fx-mine/thing/glowcap-jar', '/platform/thing/Prop', {
    shortDescription: 'a jar of glowcap',
  });
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedContent();
  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc }; else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (c: string, q: Record<string, unknown>) => {
    const arr = col(c);
    const keys = Object.keys(q);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) => keys.every((k) => {
      const stored = d[k];
      if (Array.isArray(stored)) return stored.includes(q[k]);
      return stored === q[k];
    }));
  });
  const findById = vi.fn(async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null);
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save, find, findById, delete: del, isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(() => undefined, async () => undefined);
}

function seedMaterials(): void {
  for (const [path, mpa] of [[SLATE, 90], [GRANITE, 200], [MALACHITE, 200], [QUARTZ, 1100]] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
  }
}

function seedDeposit(): Deposit {
  const d = makeStuffAtPath(() => new Deposit(), DEPOSIT);
  d.setName('fx');
  // ⚠ METRES, not cells: the fixture zone's cells are 10 m, so cell
  // z = -1 is ten metres down and the slate band covers it.
  d.setStratigraphy([{ toZ: -20, host: SLATE }, { toZ: -4000, host: GRANITE }]);
  d.setWaterTable(-450);
  d.setLode({
    through: [0, 0, -10], strike: 90, dip: 90,
    thickness: 6, strikeExtent: 2000, dipExtent: 2000, gangue: QUARTZ,
  });
  d.setZones([{ toZ: -4000, mineral: MALACHITE, meanGrade: 0.08, spread: 0.04 }]);
  d.setDepletion([]);
  d.setFeatures({});
  return d;
}

/**
 * ⭐ The seed comes from the covering Locality's ADDRESS, and the fixture
 * has no Locality — so the derived seed is `seedFor('')` for every room
 * here. That is the honest degenerate case, and asserting against it
 * keeps the fixture from quietly depending on a Locality it never built.
 */
const SEED = Deposit.seedFor('');

async function mine(): Promise<{ warren: MineWarren; zone: CartesianZone; deposit: Deposit }> {
  const zone = makeStuffAtPath(() => new CartesianZone(), ZONE);
  zone.setCellSize(10);
  // The zone carries the deposit — the field every read resolves through.
  (zone as unknown as { deposit: string }).deposit = DEPOSIT;
  const deposit = seedDeposit();
  const warren = makeStuffAtPath(() => new MineWarren(), WARREN);
  warren.setTypeRows(TYPE_ROWS);
  warren.setZonePath(ZONE);
  warren.setMineExtent('/world/fx-mine');
  warren.setClaimBlocks([{ parcelExtent: EXTENT, from: [-5, 0, -30], to: [5, 20, 0] }]);
  return { warren, zone, deposit };
}

/**
 * A hand-authored working — ⭐ NO warren, and every read still answers.
 *
 * ⚠ The world's authored galleries take {@link AuthoredWorking} (the
 * SINGLETON face: one row IS one place); the fixture uses the minted one
 * because it stands up a dozen of them. Both compose `WorkingMixin`, and
 * that is the point — nothing in the reads knows which.
 */
function staticWorking(zone: CartesianZone, cell: Cell): MineRoom {
  const room = makeStuff(() => new MineRoom());
  zone.addLocation(room as unknown as never, cell[0], cell[1], cell[2]);
  return room;
}

describe('the mine — reads on the space, mutation on the warren', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore();
    seedMaterials();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  // ─────────────── ⭐⭐ the reads, with NO warren ───────────────

  it('⭐⭐ a hand-authored working with no warren answers every read', async () => {
    const { zone } = await mine();
    const room = staticWorking(zone, [0, 0, -1]);
    expect(room.getWarren()).toBeNull();
    // The tier's honest static answer: authored ground is Spine.
    expect(room.getTier()).toBe('spine');
    expect(await room.getDeposit()).not.toBeNull();
    expect((await room.sampleHere())!.hostPath).toBe(SLATE);
    expect((await room.facesOf()).length).toBe(10);
    expect((await room.stabilityAt()).state).toBeDefined();
    expect(typeof (await room.airAt())).toBe('number');
  });

  it('facesOf reports a SEAM where the neighbour is ore and a carve-face where it is barren', async () => {
    const { zone, deposit } = await mine();
    const room = staticWorking(zone, [0, 0, -1]);
    const faces = await room.facesOf();
    const byDir = new Map(faces.map((f) => [f.direction, f]));
    // The lode is a vertical plane on strike 090 through y = 0: east and
    // west stay in it, north and south step out of it.
    expect(byDir.get('east')!.kind).toBe('seam');
    expect(byDir.get('east')!.grade).toBeGreaterThan(0);
    expect(byDir.get('north')!.kind).toBe('carve-face');
    expect(byDir.get('north')!.grade).toBe(0);
    expect(byDir.get('north')!.remaining).toBeNull();
    // …and each face's figure is exactly the deposit's own.
    expect(byDir.get('east')!.grade).toBe(deposit.sampleAt([10, 0, -10], SEED).grade);
  });

  it('a face works out — the depletion is the ROOM’s state, so a static mine has it too', async () => {
    const { zone } = await mine();
    const room = staticWorking(zone, [0, 0, -1]);
    const before = (await room.facesOf()).find((f) => f.direction === 'east')!;
    expect(before.remaining).toBeGreaterThan(0);
    room.recordWinning('east', before.remaining!);
    expect((await room.facesOf()).find((f) => f.direction === 'east')!.remaining).toBe(0);
  });

  it('stabilityAt is monotone in span and in support, and never consults a random source', async () => {
    const { zone } = await mine();
    const room = staticWorking(zone, [0, 0, -1]);
    const alone = await room.stabilityAt();
    expect(alone.span).toBe(0);

    // Open two neighbours: the span you are holding up grows.
    staticWorking(zone, [1, 0, -1]);
    staticWorking(zone, [-1, 0, -1]);
    const spanned = await room.stabilityAt();
    expect(spanned.span).toBe(2);
    expect(spanned.value).toBeLessThan(alone.value);

    // Set timber: support recovers it, and a DECAYED set is worth less.
    const set = makeStuff(() => new ToolItem());
    set.capabilities = ['timber-set'];
    ContainmentApi.move(set as unknown as Stuff & Containable, room as unknown as Stuff & Container);
    const shored = await room.stabilityAt();
    expect(shored.value).toBeGreaterThan(spanned.value);
    set.setCondition(0.2);
    const decayed = await room.stabilityAt();
    expect(decayed.value).toBeLessThan(shored.value);
    expect(decayed.value).toBeGreaterThan(spanned.value);

    // ⚠ A THRESHOLD, never a roll: a hundred evaluations, one answer.
    const answers = new Set<number>();
    for (let i = 0; i < 100; i++) answers.add((await room.stabilityAt()).value);
    expect(answers.size).toBe(1);
  });

  it('airAt degrades along a dead end and RECOVERS when it is holed through', async () => {
    const { zone } = await mine();
    // The adit: a Spine singleton in its OWN zone, so it breathes.
    const adit = makeStuffAtPath(() => new SingletonCartesianLocation(), ADIT);
    const surface = makeStuffAtPath(() => new CartesianZone(), '/world/fx-mine/pithead');
    surface.addLocation(adit as unknown as never, 0, 0, 0);

    // A chain: adit → (0,1,-1) → … a dead end driven ten cells in.
    const chain: Working[] = [];
    for (let i = 1; i <= 10; i++) chain.push(staticWorking(zone, [0, i, -1]));
    await (chain[0] as unknown as { addBidirectionalExit(o: unknown, d: string, opts: unknown): Promise<void> })
      .addBidirectionalExit(adit, 'south', { opposite: 'north', keepLiveDestination: true });
    for (let i = 1; i < chain.length; i++) {
      await (chain[i] as unknown as { addBidirectionalExit(o: unknown, d: string, opts: unknown): Promise<void> })
        .addBidirectionalExit(chain[i - 1], 'south', { opposite: 'north', keepLiveDestination: true });
    }
    const far = chain[chain.length - 1]!;
    const deadEnd = await far.airAt();
    expect(deadEnd).toBeLessThan(0.3);
    expect(await chain[0]!.airAt()).toBeGreaterThan(deadEnd);

    // Hole it through to a second adit two steps off: the distance drops
    // and the air comes back. ⭐ Planning a connection is a real decision.
    const second = makeStuffAtPath(() => new SingletonCartesianLocation(), '/world/fx-mine/location/adit2');
    surface.addLocation(second as unknown as never, 4, 0, 0);
    await (far as unknown as { addBidirectionalExit(o: unknown, d: string, opts: unknown): Promise<void> })
      .addBidirectionalExit(second, 'east', { opposite: 'west', keepLiveDestination: true });
    expect(await far.airAt()).toBeGreaterThan(deadEnd);
    expect(await far.airAt()).toBe(1);
  });

  // ─────────────────── the mutations, on the warren ───────────────────

  it('a carve mints a keyed member and NO template row', async () => {
    const { warren } = await mine();
    const room = await warren.carve([0, 1, -1], 'face');
    expect(room).not.toBeNull();
    expect(warren.getMembers()).toContain(room!);
    // D17: the instance's identity is (scope, key); the SCOPE is the
    // authored type row and nothing minted a new one.
    expect(room!.getTemplatePath()).toBe(TYPE_ROWS.face);
    expect(StuffApi.findByTemplatePath(`${EXTENT}/0,1,-1`)).toBeUndefined();
    expect(warren.tierOf([0, 1, -1])).toBe('provisional');
  });

  it('two carves of one cell are refused — the (scope, key) singleton invariant', async () => {
    const { warren } = await mine();
    const first = await warren.carve([0, 1, -1], 'face');
    const second = await warren.carve([0, 1, -1], 'stope');
    expect(second).toBe(first);
    expect(warren.getMembers().length).toBe(1);
  });

  it('the key carries the CLAIM — the Stage-B base swap is free', async () => {
    const { warren } = await mine();
    // Inside the declared block…
    expect(warren.memberKeyOf([0, 1, -1])).toBe(`${EXTENT}/0,1,-1`);
    // …and outside it, the mine's own extent.
    expect(warren.memberKeyOf([50, 50, -1])).toBe('/world/fx-mine/50,50,-1');
  });

  it('claimFor finds the declared block and misses outside it', async () => {
    const { warren } = await mine();
    expect(warren.claimFor([0, 1, -1])!.parcelExtent).toBe(EXTENT);
    expect(warren.claimFor([50, 1, -1])).toBeNull();
    expect(warren.claimFor([0, 1, -80])).toBeNull();
  });

  it('⭐ shoring PROMOTES: provisional culls on reconcile, held survives', async () => {
    const { warren } = await mine();
    await warren.carve([0, 1, -1], 'face');
    await warren.carve([0, 2, -1], 'face');
    warren.promote([0, 2, -1], 'iris');

    await (warren as unknown as { reconcile(): Promise<void> }).reconcile();

    // The provisional cell is gone AND left no record of itself.
    expect(warren.isCarved([0, 1, -1])).toBe(false);
    expect(warren.roomAt([0, 1, -1])).toBeNull();
    // The held one is still standing, and still held.
    expect(warren.tierOf([0, 2, -1])).toBe('held');
    expect(warren.roomAt([0, 2, -1])).not.toBeNull();
  });

  it('re-driving a culled provisional cell regenerates the IDENTICAL tunnel from the seed', async () => {
    const { warren, zone, deposit } = await mine();
    const first = await warren.carve([0, 1, -1], 'face');
    const beforeFaces = await (first as unknown as Working).facesOf();
    await warren.abandon([0, 1, -1]);
    expect(warren.isCarved([0, 1, -1])).toBe(false);
    const again = await warren.carve([0, 1, -1], 'face');
    const afterFaces = await (again as unknown as Working).facesOf();
    expect(afterFaces.map((f) => [f.direction, f.grade, f.hardnessMPa]))
      .toEqual(beforeFaces.map((f) => [f.direction, f.grade, f.hardnessMPa]));
    void zone; void deposit;
  });

  it('the carve wires the new cell to its already-cut orthogonal neighbours, not to a hub', async () => {
    const { warren } = await mine();
    const a = await warren.carve([0, 1, -1], 'face');
    const b = await warren.carve([0, 2, -1], 'face');
    // `b` sits north of `a`; the pair wires both ways.
    expect(MixinApi.isExitable(b!) && b!.getExit('south')).toBeTruthy();
    expect(MixinApi.isExitable(a!) && a!.getExit('north')).toBeTruthy();
  });

  it('the ledger round-trips, and NO new collection appears', async () => {
    const { warren } = await mine();
    await warren.carve([0, 1, -1], 'face');
    warren.promote([0, 1, -1], 'iris');
    const { PersistableApi } = await import('@saxonberg/server/mud/api/persistable');
    await PersistableApi.capture(warren);

    const collections = [...store.keys()].sort();
    expect(collections).toContain('holder_snapshots');
    expect(collections.filter((c) => c.includes('mine') || c.includes('carve'))).toEqual([]);

    // A fresh warren over the same record recovers the ledger whole.
    StuffApi.clearAll();
    installV1QuantityMarshallers();
    seedMaterials();
    const revived = makeStuffAtPath(() => new MineWarren(), WARREN);
    await PersistableApi.materialize(revived);
    expect(revived.tierOf([0, 1, -1])).toBe('held');
    expect(revived.getCarved()['0,1,-1']!.holder).toBe('iris');
  });

  it('a Held working survives a capture/materialize round trip WITH its contents', async () => {
    const { warren } = await mine();
    const room = (await warren.carve([0, 1, -1], 'face'))!;
    warren.promote([0, 1, -1], 'iris');
    const lamp = await StuffApi.clone<Stuff>('/world/fx-mine/thing/glowcap-jar');
    ContainmentApi.move(lamp as unknown as Stuff & Containable, room as unknown as Stuff & Container);

    const { PersistableApi } = await import('@saxonberg/server/mud/api/persistable');
    const key = warren.memberKeyOf([0, 1, -1]);
    await PersistableApi.capture(room, key);

    StuffApi.clearAll();
    installV1QuantityMarshallers();
    seedMaterials();
    const zone2 = makeStuffAtPath(() => new CartesianZone(), ZONE);
    zone2.setCellSize(10);
    const revived = makeStuff(() => new MineRoom());
    stampTemplatePathForTest(revived, TYPE_ROWS.face);
    zone2.addLocation(revived as unknown as never, 0, 1, -1);
    await PersistableApi.materialize(revived, key);
    expect(
      (revived as unknown as Stuff & Container)
        .getContents()
        .map((c) => c.getPresentation()),
    ).toContain('a jar of glowcap');
  });

  it('a carved working reports its claim through the duck-typed survey seam', async () => {
    const { warren } = await mine();
    const room = (await warren.carve([0, 1, -1], 'face'))!;
    expect(warren.extentOfMember(room)).toBe(EXTENT);
    expect((room as unknown as Working).getTier()).toBe('provisional');
    warren.promote([0, 1, -1]);
    expect((room as unknown as Working).getTier()).toBe('held');
  });

  it('a carve with no typeRows policy FAILS LOUDLY — the four rows are locality content', async () => {
    const { warren } = await mine();
    warren.setTypeRows(null);
    await expect(warren.carve([0, 1, -1], 'face')).rejects.toThrow(/typeRows/);
  });
});
