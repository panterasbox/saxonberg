/**
 * DormWarren tests — the elastic two-tier dorm manager over REAL cloned
 * content (DormRoom / Corridor / fixtures), against a multi-collection
 * in-memory store (domain clone + holder_snapshots D1 + parcels lease).
 *
 * Covers: D1 on real content (two rooms, one template, distinct
 * parcel-keyed records, fixtures restored), room dormancy reap +
 * re-materialize, floor reconstitution (ensureFloor builds the corridor +
 * unit door), sync floor reachability, and the DormDoor lease-gate.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DormWarren from '../idea/DormWarren';
import DormRoom from '../location/DormRoom';
import Corridor from '../location/Corridor';
import Bed from '../thing/Bed';
import Desk from '../thing/Desk';
import Footlocker from '../thing/Footlocker';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { CredentialApi } from '@saxonberg/server/mud/api/credential';
import { Lock } from '@saxonberg/server/mud/lib/lock/Lock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { HasInteractiveMixin } from '@saxonberg/server/mud/lib/connection/HasInteractive';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import PersistentHydrator from '@saxonberg/server/mud/platform/idea/persistence/PersistentHydrator';
import { Document } from '@saxonberg/server/mud/lib/persistence/Document';
import ParcelRegistry from '@saxonberg/server/mud/platform/idea/ParcelRegistry';
import GroupRegistry from '@saxonberg/server/mud/platform/idea/GroupRegistry';
import Avatar from '@saxonberg/server/mud/platform/agent/Avatar';
import { PersistenceManager } from '@saxonberg/server/mud/lib/persistence/__tests__/backend-store';
import {
  makeStuffAtPath,
  withRootContext,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

const PH = PersistentHydrator.templatePath;
const DORMS = DormWarren.DORMS_EXTENT;

// The born-with fixtures a DormRoom seeds, declared as `props:` data (the
// same list the real dormroom.yaml carries) — no longer a class const.
const FIXTURES = [
  '/world/eternal/duncan-hall/thing/bed',
  '/world/eternal/duncan-hall/thing/desk',
  '/world/eternal/duncan-hall/thing/footlocker',
];

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

/** Seed the domain templates the clone pipeline resolves. */
function seedDomain(): void {
  const domain = col('content');
  const add = (path: string, cls: string, data: Record<string, unknown> = {}) =>
    domain.push({ _id: `d-${++idCounter}`, path, class: cls, hydratorClass: PH, data });
  domain.push({ _id: `d-${++idCounter}`, path: PH, class: PH, data: {} });
  add(DormWarren.WARREN_PATH, '/world/eternal/duncan-hall/idea/DormWarren');
  // D16 step 2: the unit's degenerate one-room programme row.
  add(DormWarren.PROGRAMME_PATH, '/residence/idea/HoldingWarren', {
    floorplan: [{ room: DormRoom.SCOPE, entry: true }],
    upkeepTerm: 'institution-all',
  });
  add(DormRoom.SCOPE, '/world/eternal/duncan-hall/location/DormRoom', {
    shortDescription: 'a dorm room',
    // Fixtures as data — the spine's seedBornWith lays these down once.
    props: FIXTURES,
  });
  add(DormWarren.CORRIDOR_TEMPLATE, '/world/eternal/duncan-hall/location/Corridor', {
    shortDescription: 'a dorm corridor',
  });
  // The lobby stand-in — a Corridor-class exitable container (the real lobby
  // is a CartesianLocation needing its zone; the stair wiring only needs an
  // Exitable container here).
  add(DormWarren.LOBBY_PATH, '/world/eternal/duncan-hall/location/Corridor', {
    shortDescription: 'the lobby',
  });
  add(FIXTURES[0]!, '/world/eternal/duncan-hall/thing/Bed', {
    shortDescription: 'a narrow bed',
  });
  add(FIXTURES[1]!, '/world/eternal/duncan-hall/thing/Desk', {
    shortDescription: 'a plain desk',
  });
  add(FIXTURES[2]!, '/world/eternal/duncan-hall/thing/Footlocker', {
    shortDescription: 'a footlocker',
  });
  add('/stuff/thing/Key', '/platform/thing/Key', { shortDescription: 'a key' });
}

/** Seed a unit parcel row directly (a provisioned unit). */
function seedUnit(floor: number, pos: number): string {
  const extent = `${DORMS}/f${floor}-r${pos}`;
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent,
    zonePath: extent,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: DORMS,
    grants: [],
    allowance: null,
  });
  return extent;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  seedDomain();
  // The dorms parent parcel.
  col('parcels').push({
    _id: `p-${++idCounter}`,
    extent: DORMS,
    zonePath: DORMS,
    owner: { kind: 'group', name: 'duncan-hall' },
    parentParcel: null,
    grants: [],
    allowance: null,
  });

  const save = vi.fn(async (collection: string, doc: Doc) => {
    const arr = col(collection);
    if (doc._id) {
      const idx = arr.findIndex((d) => d._id === doc._id);
      if (idx >= 0) arr[idx] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    const arr = col(collection);
    const keys = Object.keys(query);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) =>
      keys.every((k) => {
        const stored = d[k];
        const wanted = query[k];
        if (Array.isArray(stored)) return stored.includes(wanted);
        return stored === wanted;
      }),
    );
  });
  const findById = vi.fn(
    async (collection: string, id: string) =>
      col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
  // Thing-based fixtures carry marshalled Quantity fields (mass, …) — seed
  // the marshaller singletons + a no-op preload resolver.
  installV1QuantityMarshallers();
  Document.setMarshallerResolver(
    () => undefined,
    async () => undefined,
  );
}

async function bootRegistries(): Promise<void> {
  const groups = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await groups.postRegister();
  const parcels = makeStuffAtPath(() => new ParcelRegistry(), '/platform/idea/ParcelRegistry');
  await parcels.postRegister();
}

async function warren(): Promise<DormWarren> {
  const w = await StuffApi.singleton<DormWarren>(DormWarren.WARREN_PATH);
  return w;
}

/** A countable occupant (HasInteractive + Containable). */
class Occupant extends HasInteractiveMixin(ContainableMixin(Idea)) {
  protected handleMessage(): void {}
  protected handleEnvelope(): void {}
}
function occupant(): Occupant {
  return makeStuffAtPath(() => new Occupant(), `/obj/occ-${++idCounter}`);
}

function reset(): void {
  vi.restoreAllMocks();
  ParcelApi._resetRegistryRefForReload();
  StuffApi.clearAll();
}

const snapshots = () => col('holder_snapshots');
const fixtureLabels = (room: Stuff & Container) =>
  room
    .getContents()
    .map((c) => (c as unknown as { getShortDescription?: () => string }).getShortDescription?.())
    .filter(Boolean)
    .sort();

describe('DormWarren — D1 on real content', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('two rooms, one template, distinct parcel-keyed records + restored fixtures', async () => {
    const k1 = seedUnit(1, 1);
    const k2 = seedUnit(1, 2);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();

    const a = await w.admit(k1);
    const b = await w.admit(k2);
    expect(a).not.toBe(b);
    expect(a).toBeInstanceOf(DormRoom);

    // Fixtures seeded imperatively on the no-record branch.
    expect(fixtureLabels(a)).toEqual(['a footlocker', 'a narrow bed', 'a plain desk']);

    // Two distinct D1 records, one scope, distinct owners (the unit keys).
    const recs = snapshots().filter((s) => s.scope === DormRoom.SCOPE);
    expect(recs).toHaveLength(2);
    expect(recs.map((s) => s.owner).sort()).toEqual([k1, k2].sort());

    // Evict both; re-admit k1 → materializes the same three fixtures.
    await w.dropUnit(k1);
    await w.dropUnit(k2);
    const reborn = await w.admit(k1);
    expect(reborn).not.toBe(a);
    expect(fixtureLabels(reborn)).toEqual([
      'a footlocker',
      'a narrow bed',
      'a plain desk',
    ]);
    // Drift guard: the fixtures are the real classes.
    const kinds = reborn.getContents().map((c) => c.constructor);
    expect(kinds).toContain(Bed);
    expect(kinds).toContain(Desk);
    expect(kinds).toContain(Footlocker);
  });
});

describe('DormWarren — dormancy reap', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('an empty room captures + reaps on reconcile; re-admit re-materializes', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();

    const room = await w.admit(k1);
    // Occupy then leave → the room is empty.
    const occ = occupant();
    ContainmentApi.move(occ, room);
    ContainmentApi.move(occ, room); // idempotent-ish; ensure it's in
    StuffApi.destruct(occ as unknown as Stuff); // leaves → empty

    await (w as unknown as { reconcile(): Promise<void> }).reconcile();
    expect(room.isDestroyed()).toBe(true); // reaped

    const reborn = await w.admit(k1);
    expect(reborn.isDestroyed()).toBe(false);
    expect(fixtureLabels(reborn)).toHaveLength(3);
  });
});

describe('DormWarren — floor reconstitution + reachability', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('ensureFloor builds the corridor + the unit door; reachability is sync', async () => {
    const k1 = seedUnit(1, 3);
    await bootRegistries();
    const w = await warren();
    await w.refreshProvisioned();

    expect(w.floorReachable(1)).toBe(true);
    expect(w.floorReachable(2)).toBe(false);

    const corridor = await w.ensureFloor(1);
    expect(corridor).toBeInstanceOf(Corridor);
    expect(MixinApi.isExitable(corridor!)).toBe(true);
    // The unit's DormDoor is on the corridor (direction unit-<pos>).
    const door = w.doorFor(k1);
    expect(door).not.toBeNull();
    expect((corridor as unknown as { getExit(d: string): unknown }).getExit('unit-3')).toBeDefined();
    // The stairwell: down to the lobby, up is a FloorStairExit.
    expect((corridor as unknown as { getExit(d: string): unknown }).getExit('down')).toBeDefined();
    expect((corridor as unknown as { getExit(d: string): unknown }).getExit('up')).toBeDefined();

    // Floor 2 is unreachable → ensureFloor(2) refuses.
    expect(await w.ensureFloor(2)).toBeNull();
  });
});

describe('DormWarren — the DormDoor key gate', () => {
  beforeEach(() => {
    reset();
    installStore();
  });
  afterEach(reset);

  it('opens for whoever holds a matching key; blocks the keyless; re-key kills the old key', async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();

    const iris = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/iris');
    iris.setPlayerId('iris');
    const bob = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/bob');
    bob.setPlayerId('bob');

    // No keyway yet → the door is locked → nobody passes.
    await w.refreshProvisioned();
    await w.ensureFloor(1);
    const door = w.doorFor(k1)!;
    expect(door).not.toBeNull();
    expect(door.canTraverse(iris as unknown as never).ok).toBe(false);

    // Key the lock + issue iris a (physical) key → she presents it and passes;
    // bob holds no key and is blocked. Possession, not identity.
    await ParcelApi.setKeyway(k1, 'kw-1');
    await w.refreshProvisioned();
    await CredentialApi.issueKey(iris, 'kw-1', 'pin-tumbler');
    expect(w.keywayOf(k1)).toBe('kw-1');
    expect(door.canTraverse(iris as unknown as never).ok).toBe(true);
    expect(door.canTraverse(bob as unknown as never).ok).toBe(false);

    // Re-key (a new keyway) → iris's old key is dead metal until she's re-issued.
    await ParcelApi.setKeyway(k1, 'kw-2');
    await w.refreshProvisioned();
    expect(door.canTraverse(iris as unknown as never).ok).toBe(false);
  });

  it("a master key (the super's ring) opens any dorm door", async () => {
    const k1 = seedUnit(1, 1);
    await bootRegistries();
    const w = await warren();
    await ParcelApi.setKeyway(k1, 'kw-whatever');
    await w.refreshProvisioned();
    await w.ensureFloor(1);
    const door = w.doorFor(k1)!;

    const sam = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/sam');
    sam.setPlayerId('sam');
    // No unit key, but a pin-tumbler master → opens regardless of the keyway.
    await CredentialApi.issueMasterKey(sam, 'pin-tumbler');
    expect(door.canTraverse(sam as unknown as never).ok).toBe(true);
  });
});
