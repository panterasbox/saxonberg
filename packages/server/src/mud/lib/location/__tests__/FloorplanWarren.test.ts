/**
 * FloorplanWarren — the floorplan and the keyed rooms lifted to the
 * kernel (harbors P1), over SYNTHETIC fixtures under `/test/**`
 * (lint:test-content: kernel tests never name /world/).
 *
 * What a house and a ship share: the whole-warren wake over
 * `(scope = row, key = <key>/<leaf>)` records, the intra-plan wiring,
 * the plan's own frame, the whole-warren capture that a re-wake
 * restores (born-with props land once), revert, and the hooks a subclass
 * speaks through. (The fabric is a STRUCTURE's — a building's or a
 * ship's `Durable` condition under its coat — never a floorplan's.)
 */

import '../../../../test-bootstrap';
import { KERNEL_CONTENT_ROWS } from '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Blueprint } from '../Blueprint';
import { FloorplanWarren } from '../FloorplanWarren';
import PersistentLocation from '../../../platform/location/PersistentLocation';
import Thing from '../../../platform/thing/Thing';
import TemplateApplier from '../../../platform/idea/TemplateApplier';
import { Document } from '../../persistence/Document';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { PersistableApi } from '../../../api/persistable';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Exitable } from '../../boundary/Exitable';
import { PersistenceManager } from '../../persistence/__tests__/backend-store';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

type MemberStuff = Stuff & Container;

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PLAN = '/test/fp-warren';
const BLUEPRINT = '/test/fp-blueprint';
const DECK = '/test/fp/deck';
const HOLD = '/test/fp/hold';
const CLEAT = '/test/fp/cleat';
const KEY = '/test/fp/vessel-1';

/** A ship-shaped consumer. */
class TestFloorplan extends FloorplanWarren {
  static _mixinName = 'FPTestWarren';
  public reconciled = 0;
  protected async reconcile(): Promise<void> {
    this.reconciled += 1;
  }
}

/** A plain floorplan — a mine's shape. */
class PlainFloorplan extends FloorplanWarren {
  static _mixinName = 'FPPlainWarren';
  protected async reconcile(): Promise<void> {}
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(name: string): Doc[] {
  let arr = store.get(name);
  if (!arr) {
    arr = [];
    store.set(name, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const content = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    content.push({ _id: `d-${++idCounter}`, path, class: cls, data });
  add(TemplateApplier.templatePath, TemplateApplier.templatePath);
  for (const row of KERNEL_CONTENT_ROWS) {
    content.push({ _id: `d-${++idCounter}`, ...row });
  }
  // ⭐ The blueprint (harbors review 3): a Structure over ordinary rows.
  add(BLUEPRINT, '/platform/idea/Structure', { extent: '/test/fp', entrance: DECK });
  // The zone a copy's rooms stand in (resolved from their keys).
  add('/test/fp', '/platform/idea/location/CartesianZone', { name: 'test vessels' });
  add(DECK, '/platform/location/PersistentLocation', {
    shortDescription: 'the deck',
    props: [CLEAT],
    exits: { down: { destination: HOLD } },
  });
  add(HOLD, '/platform/location/PersistentLocation', {
    shortDescription: 'the hold',
    exits: { up: { destination: DECK } },
  });
  add(CLEAT, '/platform/thing/Thing', { shortDescription: 'a cleat' });

  const save = vi.fn(async (c: string, doc: Doc) => {
    const arr = col(c);
    if (doc._id) {
      const i = arr.findIndex((d) => d._id === doc._id);
      if (i >= 0) arr[i] = { ...doc };
      else arr.push({ ...doc });
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
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        const want = q[k];
        if (want !== null && typeof want === 'object' && '$regex' in (want as object)) {
          return typeof stored === 'string' && new RegExp(String((want as { $regex: string }).$regex)).test(stored);
        }
        if (Array.isArray(stored)) return stored.includes(want);
        return stored === want;
      }),
    );
  });
  const findById = vi.fn(
    async (c: string, id: string) => col(c).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (c: string, id: string) => {
    const arr = col(c);
    const i = arr.findIndex((d) => d._id === id);
    if (i >= 0) arr.splice(i, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

function reset(): void {
  vi.restoreAllMocks();
  StuffApi.clearAll();
}

/** Mint a warren at the plan path, keyed, floorplan set, awake. */
async function standUp<T extends FloorplanWarren = TestFloorplan>(
  make: () => T = () => new TestFloorplan() as unknown as T,
  blueprint: string = BLUEPRINT,
): Promise<T> {
  const w = makeStuffAtPath(make, PLAN);
  w.setBlueprint(blueprint);
  await PersistableApi.restoreOrSeed(w as unknown as Stuff, KEY);
  await w.wake();
  return w;
}

describe('FloorplanWarren (harbors P1)', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('⭐ wakes whole: keyed rooms from real rows, wired, entry first', async () => {
    const w = await standUp();
    const deck = w.entryRoom()!;
    expect(deck).toBeInstanceOf(PersistentLocation);
    expect(deck.getTemplatePath()).toBe(DECK);
    expect(
      (deck as unknown as { getPersistenceKey(): string }).getPersistenceKey(),
    ).toBe(`${KEY}/deck`);
    const hold = w.roomForLeaf('hold')!;
    expect(hold.getTemplatePath()).toBe(HOLD);
    expect(w.roomForKey(`${KEY}/hold`)).toBe(hold);
    expect(w.roomKeyOf(undefined)).toBe(KEY);
    expect((deck as unknown as Exitable).getExit('down')).toBeDefined();
    expect((hold as unknown as Exitable).getExit('up')).toBeDefined();
    expect(w.getMembers()).toHaveLength(2);

    // Idempotent: a second wake reuses the live rooms.
    await w.wake();
    expect(w.roomForLeaf('hold')).toBe(hold);
    expect(w.getMembers()).toHaveLength(2);
  });

  it('⭐ lays its rooms out in its OWN frame', async () => {
    const w = await standUp();
    const cell = (r: unknown) =>
      (r as { getCoordinates(): [number, number, number] }).getCoordinates();
    expect(cell(w.entryRoom())).toEqual([0, 0, 0]);
    expect(cell(w.roomForLeaf('hold'))).toEqual([0, 0, -1]);
    expect(w.laysOutOwnFrame()).toBe(true);
  });

  it('⭐⭐ one capture of the warren (its rooms are its dependents) then a re-wake: the born-with prop lands ONCE', async () => {
    const w = await standUp();
    const cleats = (room: MemberStuff | null) =>
      room!.getContents().filter((c) => c instanceof Thing).length;
    expect(cleats(w.entryRoom())).toBe(1);

    await PersistableApi.capture(w as unknown as Stuff);
    expect(col('holder_snapshots').length).toBeGreaterThanOrEqual(3);
    const deck = w.entryRoom()!;
    await StuffApi.destruct(w as unknown as Stuff);
    // The rooms followed the warren down — whole, never room-by-room.
    expect(deck.isDestroyed()).toBe(true);

    const again = await standUp();
    expect(cleats(again.entryRoom())).toBe(1);
  });

  it('revert deletes every record under the key', async () => {
    const w = await standUp();
    await PersistableApi.capture(w as unknown as Stuff);
    expect(col('holder_snapshots').length).toBeGreaterThan(0);
    const deck = w.entryRoom()!;
    await w.revert();
    expect(deck.isDestroyed()).toBe(true);
    expect(w.entryRoom()).toBeNull();
    await StuffApi.destruct(w as unknown as Stuff);
    const fresh = await standUp();
    expect(fresh.entryRoom()).not.toBeNull();
  });

  it('⭐ a way into the extent that names no room of it throws (review 3)', async () => {
    col('content').push({
      _id: 'bad-1', path: '/test/fp-bad', class: '/platform/idea/Structure',
      data: { extent: '/test/fpbad', entrance: '/test/fpbad/deck' },
    });
    col('content').push({
      _id: 'bad-2', path: '/test/fpbad/deck', class: '/platform/location/PersistentLocation',
      data: { shortDescription: 'a deck', exits: { down: { destination: '/test/fpbad/nowhere' } } },
    });
    col('content').push({
      _id: 'bad-3', path: '/test/fpbad/nowhere', class: '/platform/thing/Thing', data: {},
    });
    const w = makeStuffAtPath(() => new PlainFloorplan(), PLAN);
    w.setBlueprint('/test/fp-bad');
    await PersistableApi.restoreOrSeed(w as unknown as Stuff, KEY);
    await expect(w.wake()).rejects.toThrow(/no room of it/);
  });

  it('⭐ a mirrored copy reflects its ways and its cells; up stays up (review 3)', async () => {
    const row = (path: string, data: Record<string, unknown>, cls = '/platform/location/PersistentLocation') =>
      col('content').push({ _id: `m-${path}`, path, class: cls, data });
    row('/test/fp2-blueprint', { extent: '/test/fp2', entrance: '/test/fp2/yard' }, '/platform/idea/Structure');
    row('/test/fp2', { name: 'farms' }, '/platform/idea/location/CartesianZone');
    row('/test/fp2/yard', {
      exits: { east: { destination: '/test/fp2/meadow' }, up: { destination: '/test/fp2/bench' } },
    });
    row('/test/fp2/meadow', { exits: { west: { destination: '/test/fp2/yard' } } });
    row('/test/fp2/bench', { exits: { down: { destination: '/test/fp2/yard' } } });
    const w = makeStuffAtPath(() => new TestFloorplan(), PLAN);
    w.setBlueprint('/test/fp2-blueprint');
    w.setMirrorAxis('east-west');
    await PersistableApi.restoreOrSeed(w as unknown as Stuff, '/test/fp2/farm-1');
    await w.wake();
    const yard = w.entryRoom() as unknown as Exitable;
    const meadow = w.roomForLeaf('meadow')!;
    const cell = (r: unknown) => (r as { getCoordinates(): number[] }).getCoordinates();
    expect(yard.getExit('east')).toBeUndefined();
    expect(yard.getExit('west')!.getDestination()).toBe(meadow);
    expect(yard.getExit('up')!.getDestination()).toBe(w.roomForLeaf('bench'));
    expect((meadow as unknown as Exitable).getExit('east')!.getDestination()).toBe(w.entryRoom());
    expect(cell(meadow)).toEqual([-1, 0, 0]);
    expect(cell(w.roomForLeaf('bench'))).toEqual([0, 0, 1]);
  });

  it('⭐⭐ a blueprint\'s buildings are AUTHORED: each one\'s rooms are the rooms under its extent, never how they connect (harbors review, 2026-11-03)', async () => {
    const row = (path: string, data: Record<string, unknown>, cls = '/platform/location/PersistentLocation') =>
      col('content').push({ _id: `b-${path}`, path, class: cls, data });
    const plan = (buildings: string[]) =>
      row(`/test/fp3-blueprint-${buildings.length}`, {
        extent: '/test/fp3', entrance: '/test/fp3/yard', buildings,
      }, '/platform/idea/Structure');
    row('/test/fp3/yard', {
      exits: { north: { destination: '/test/fp3/home/hall' }, east: { destination: '/test/fp3/shed' } },
    });
    // A way joins the hall to the shed — and they are still two buildings.
    row('/test/fp3/home/hall', {
      exits: { south: { destination: '/test/fp3/yard' }, up: { destination: '/test/fp3/home/loft' }, east: { destination: '/test/fp3/shed' } },
    });
    row('/test/fp3/home/loft', { exits: { down: { destination: '/test/fp3/home/hall' } } });
    row('/test/fp3/shed', { exits: { west: { destination: '/test/fp3/yard' } } });
    row('/test/fp3-house', { extent: '/test/fp3/home', entrance: '/test/fp3/home/hall' }, '/platform/idea/Structure');
    row('/test/fp3-shed', { extent: '/test/fp3/shed', entrance: '/test/fp3/shed' }, '/platform/idea/Structure');
    plan(['/test/fp3-house', '/test/fp3-shed']);
    const loaded = await new Blueprint('/test/fp3-blueprint-2').load();
    expect(loaded.buildings).toEqual([
      { row: '/test/fp3-house', leaf: 'fp3-house', rooms: ['/test/fp3/home/hall', '/test/fp3/home/loft'] },
      { row: '/test/fp3-shed', leaf: 'fp3-shed', rooms: ['/test/fp3/shed'] },
    ]);
    // The yard lies under neither: open ground. A blueprint naming none has none.
    row('/test/fp3-none', { extent: '/test/fp3', entrance: '/test/fp3/yard' }, '/platform/idea/Structure');
    expect((await new Blueprint('/test/fp3-none').load()).buildings).toEqual([]);
    // Loud on a content error: a room in two buildings, an entrance not its own.
    row('/test/fp3-all', { extent: '/test/fp3', entrance: '/test/fp3/yard' }, '/platform/idea/Structure');
    row('/test/fp3-twice', { extent: '/test/fp3', entrance: '/test/fp3/yard', buildings: ['/test/fp3-all', '/test/fp3-shed'] }, '/platform/idea/Structure');
    await expect(new Blueprint('/test/fp3-twice').load()).rejects.toThrow(/in two buildings/);
    row('/test/fp3-wrongdoor', { extent: '/test/fp3/home', entrance: '/test/fp3/shed' }, '/platform/idea/Structure');
    row('/test/fp3-bad', { extent: '/test/fp3', entrance: '/test/fp3/yard', buildings: ['/test/fp3-wrongdoor'] }, '/platform/idea/Structure');
    await expect(new Blueprint('/test/fp3-bad').load()).rejects.toThrow(/none of its rooms/);
  });

  it('names no upkeep term of its own and never buds — a holding answers its term', async () => {
    const w = await standUp();
    expect(w.getUpkeepTerm()).toBeNull();
    expect(MixinApi.isPersistable(w)).toBe(true);
    await expect((w as unknown as { createMember(): Promise<unknown> }).createMember()).rejects.toThrow(/never buds/);
  });
});
