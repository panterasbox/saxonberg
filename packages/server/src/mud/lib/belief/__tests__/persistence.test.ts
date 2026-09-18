/**
 * Belief persistence (Wave 8) — the lazily-hydrated, per-record working
 * set. Covers: hydrate → render → write-through → evict → re-hydrate
 * roundtrip; a new encounter is a single-record upsert; a null-`knownAs`
 * stranger is NOT written through; the naming path does no Mongo read.
 *
 * Mongo is faked with an in-memory collection (no mongodb-memory-server),
 * mirroring the Document-test mocking style.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BeliefStoreMixin,
  RECOGNITION,
  REGARD,
  type BeliefRecord,
} from '../BeliefStore';
import BeliefDocument from '../BeliefDocument';
import { Idea } from '../../stuff/Idea';
import { SingletonMixin } from '../../stuff/Singleton';
import { PersistableMixin } from '../../persistence/Persistable';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
  withRootContext,
} from '../../security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(Idea) {}
/** A `Cast`-shaped viewer: one live instance per row, so the row path IS unique. */
class SingletonViewer extends SingletonMixin(BeliefStoreMixin(Idea)) {}

// In-memory fake of the `beliefs` collection, keyed by `_id`. We stub PM's
// friendly surface (find / save / delete) — the same wrapper methods
// `BeliefDocument` uses — rather than any raw Mongo interface.
let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
// Minimal structural type — we only clear them and pass them to expect().
let saveSpy: { mockClear: () => void };
let findSpy: { mockClear: () => void };

const flush = () => new Promise((r) => setTimeout(r, 0));

let counter = 0;
/**
 * An **Avatar-shaped** viewer: the shared `/platform/agent/Avatar` row as
 * its lineage plus a minted per-instance identity — the D17 split, and
 * the thing a player actually is.
 *
 * ⚠ This used to register at `/platform/agent/Avatar/pN` as its TEMPLATE
 * path with no minted identity, which looks like an Avatar and is
 * structurally a generic clone. That was invisible while the belief
 * viewer key was `getIdentityPath()` unconditionally; it stopped being
 * invisible when the key had to be durable-UNIQUE, because a fixture
 * whose identity is its lineage is exactly the case that may not persist.
 */
function makeViewerAt(): InstanceType<typeof Viewer> {
  return makeStuffAtPath(
    () => new Viewer(),
    '/platform/agent/Avatar',
    `/platform/agent/Avatar/p${counter++}`,
  );
}
function registerReferent(path: string): Idea {
  return makeStuffAtPath(() => new Idea(), path);
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  findSpy = vi
    .spyOn(pm, 'find')
    .mockImplementation(async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
    );
  saveSpy = vi
    .spyOn(pm, 'save')
    .mockImplementation(async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    });
  vi.spyOn(pm, 'delete').mockImplementation(async (_col: string, id: string) => {
    store.delete(id);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('belief persistence (the mixin viewer face)', () => {
  it('the flush persists a learned record as a single upsert', async () => {
    const viewer = makeViewerAt();
    registerReferent('/obj/npc/mara');
    const record: BeliefRecord = {
      realm: RECOGNITION,
      referent: '/obj/npc/mara',
      knownAs: 'Mara',
      firstSeen: 1,
      lastSeen: 2,
      payload: {},
    };
    viewer.loadBelief(record);
    await withRootContext(viewer, 'flush', () =>
      viewer.evictAndFlushBeliefs(),
    );
    expect(store.size).toBe(1);
    const doc = [...store.values()][0]!;
    expect(doc.knownAs).toBe('Mara');
    expect(doc.viewerId).toBe(viewer.getIdentityPath());
  });

  it('does NOT write through a null-knownAs stranger record', async () => {
    const viewer = makeViewerAt();
    registerReferent('/obj/npc/stranger');
    viewer.loadBelief({
      realm: RECOGNITION,
      referent: '/obj/npc/stranger',
      knownAs: null,
      firstSeen: 1,
      lastSeen: 1,
      payload: {},
    });
    await withRootContext(viewer, 'flush', () =>
      viewer.evictAndFlushBeliefs(),
    );
    expect(store.size).toBe(0);
  });

  it('hydrate → render → write-through → evict → re-hydrate roundtrip', async () => {
    registerReferent('/obj/npc/mara');

    // Session 1: learn Mara, which writes through.
    const AVATAR_ROW = '/platform/agent/Avatar';
    const path = '/platform/agent/Avatar/roundtrip';
    const s1 = makeStuffAtPath(() => new Viewer(), AVATAR_ROW, path);
    s1.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    await flush(); // let the fire-and-forget write settle
    expect(store.size).toBe(1);

    // Evict clears the in-memory map (final flush is idempotent).
    await withRootContext(s1, 'evict', () => s1.evictAndFlushBeliefs());
    expect(s1.allBeliefs()).toHaveLength(0);
    StuffApi.unregister(s1);

    // Session 2: a fresh viewer at the same durable key re-hydrates.
    const s2 = makeStuffAtPath(() => new Viewer(), AVATAR_ROW, path);
    await withRootContext(s2, 'hydrate', () => s2.hydrateBeliefs());
    const rec = s2.recall(RECOGNITION, '/obj/npc/mara');
    expect(rec?.knownAs).toBe('Mara');
  });

  it('the naming path (recall) performs no Mongo read', async () => {
    registerReferent('/obj/npc/mara');
    const viewer = makeViewerAt();
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    await flush();

    // Recall is pure in-memory — clear the call history and assert the
    // persistence surfaces stay untouched.
    findSpy.mockClear();
    saveSpy.mockClear();
    const rec = viewer.recall(RECOGNITION, '/obj/npc/mara');
    expect(rec?.knownAs).toBe('Mara');
    expect(findSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('forget deletes the persisted record', async () => {
    registerReferent('/obj/npc/mara');
    const viewer = makeViewerAt();
    viewer.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    await flush();
    expect(store.size).toBe(1);

    viewer.forget(RECOGNITION, '/obj/npc/mara');
    await flush();
    expect(store.size).toBe(0);
  });
});

describe('belief persistence — regard realm', () => {
  it('writes through a BARE regard record (null knownAs survives isLearned)', async () => {
    const viewer = makeViewerAt();
    registerReferent('/obj/npc/bob');
    viewer.loadBelief({
      realm: REGARD,
      referent: '/obj/npc/bob',
      knownAs: null,
      firstSeen: 1,
      lastSeen: 2,
      payload: { regard: 5 },
    });
    await withRootContext(viewer, 'flush', () =>
      viewer.evictAndFlushBeliefs(),
    );
    expect(store.size).toBe(1);
    const doc = [...store.values()][0]!;
    expect((doc.payload as { regard?: number }).regard).toBe(5);
    expect(doc.knownAs).toBeNull();
  });

  it('does NOT write through a neutral (regard: 0) record', async () => {
    const viewer = makeViewerAt();
    registerReferent('/obj/npc/bob');
    viewer.loadBelief({
      realm: REGARD,
      referent: '/obj/npc/bob',
      knownAs: null,
      firstSeen: 1,
      lastSeen: 1,
      payload: { regard: 0 },
    });
    await withRootContext(viewer, 'flush', () =>
      viewer.evictAndFlushBeliefs(),
    );
    expect(store.size).toBe(0);
  });

  it('player (Avatar) holder round-trips regard through evict/re-hydrate', async () => {
    registerReferent('/obj/npc/bob');
    const row = '/platform/agent/Avatar';
    const path = '/platform/agent/Avatar/regard-roundtrip';
    const s1 = makeStuffAtPath(() => new Viewer(), row, path);
    s1.know(REGARD, '/obj/npc/bob', { regard: 12 });
    await flush();
    expect(store.size).toBe(1);

    await withRootContext(s1, 'evict', () => s1.evictAndFlushBeliefs());
    expect(s1.allBeliefs()).toHaveLength(0);
    StuffApi.unregister(s1);

    const s2 = makeStuffAtPath(() => new Viewer(), row, path);
    await withRootContext(s2, 'hydrate', () => s2.hydrateBeliefs());
    expect(s2.recall(REGARD, '/obj/npc/bob')?.payload.regard).toBe(12);
  });

  it('named-NPC holder write-through reaches the collection (no hydrate asserted)', async () => {
    registerReferent('/obj/npc/bob');
    // ⭐ A SINGLETON NPC viewer — the `Cast` rung. One live instance per
    // row, so the row path is a durable-unique key and write-through
    // persists. ⚠ A plain (non-singleton) NPC fixture would NOT persist
    // now, and that is the point of the rule: two of them cloned from one
    // row would otherwise share one record.
    const npc = makeStuffAtPath(() => new SingletonViewer(), '/obj/npc/gus');
    npc.know(REGARD, '/obj/npc/bob', { regard: -8 });
    await flush();
    const rows = await BeliefDocument.find({ viewerId: '/obj/npc/gus' });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload.regard).toBe(-8);
  });

  it('reverse {realm, referent} query returns all viewers regarding a subject', async () => {
    registerReferent('/obj/npc/bob');
    // ⭐ Two players SHARE the Avatar row and differ only by minted
    // identity — the exact shape that makes a durable-unique key
    // necessary. Keying on the row would collapse them into one record.
    const a = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      '/platform/agent/Avatar/alice',
    );
    const c = makeStuffAtPath(
      () => new Viewer(),
      '/platform/agent/Avatar',
      '/platform/agent/Avatar/carol',
    );
    a.know(REGARD, '/obj/npc/bob', { regard: 4 });
    c.know(REGARD, '/obj/npc/bob', { regard: 9 });
    await flush();

    const toward = await BeliefDocument.find({
      realm: REGARD,
      referent: '/obj/npc/bob',
    });
    expect(toward).toHaveLength(2);
    expect(toward.map((d) => d.payload.regard).sort((x, y) => x! - y!)).toEqual([
      4, 9,
    ]);
  });
});

/* ────────────────────────────────────────────────────────────────────
 * The durable-unique viewer key, the role mask, and the keyed slice.
 * ⭐⭐ Together these are one rule: **identity and durability arrive
 * together, or neither** — and a viewer whose identity is not unique by
 * itself gets no durable memory at all.
 * ──────────────────────────────────────────────────────────────────── */

/** An `Extra`-shaped viewer: a role, not a person. */
class RoleViewer extends BeliefStoreMixin(Idea) {
  public override keepsPersonalRegard(): boolean {
    return false;
  }
}

/** A keyed persistable viewer — a named animal's shape. */
class KeyedViewer extends PersistableMixin(BeliefStoreMixin(Idea)) {}

describe('the durable-unique viewer key (D1)', () => {
  it('two role-fillers cloned from ONE row write nothing, and hold nothing', async () => {
    const bob = registerReferent('/obj/npc/bob-roles');
    // ⚠ THE failure this rule exists for: both sentries' identity path
    // IS the shared row, so the old key collapsed them onto one Mongo
    // record and they overwrote each other's opinion of you.
    const s1 = makeStuffAtPath(() => new RoleViewer(), '/platform/agent/Extra');
    const s2 = makeStuffAtPath(() => new RoleViewer(), '/platform/agent/Extra');
    s1.adjustRegard(bob, 20);
    s2.adjustRegard(bob, -20);
    await flush();

    expect(store.size).toBe(0);
    // ⭐ And nothing accumulates even in memory: a role has no opinion to
    // hold, so there is no record to flush, hydrate or diverge.
    expect(s1.allBeliefs()).toHaveLength(0);
    expect(s2.allBeliefs()).toHaveLength(0);
    expect(s1.regardFor(bob)).toBe(0);
  });

  it('a generic clone accumulates regard in MEMORY and writes nothing', async () => {
    const bob = registerReferent('/obj/npc/bob-stray');
    // The unnamed stray. Its regard is what makes winning it over
    // possible; its lack of a record is what "an unnamed animal is free"
    // means. Both halves are asserted here.
    const stray = makeStuffAtPath(() => new Viewer(), '/stuff/agent/cat');
    stray.adjustRegard(bob, 7);
    stray.adjustRegard(bob, 5);
    await flush();

    expect(stray.regardFor(bob)).toBe(12);
    expect(store.size).toBe(0);
  });

  it('a singleton NPC and a minted Avatar both persist', async () => {
    const bob = registerReferent('/obj/npc/bob-both');
    const cast = makeStuffAtPath(() => new SingletonViewer(), '/obj/npc/mara-both');
    const player = makeViewerAt();
    cast.adjustRegard(bob, 3);
    player.adjustRegard(bob, 4);
    await flush();

    expect(store.size).toBe(2);
  });
});

describe('the keyed host carries its own memory (D2)', () => {
  it('a keyed host captures its beliefs and round-trips them', async () => {
    const bob = registerReferent('/obj/npc/bob-keyed');
    const pet = makeStuffAtPath(() => new KeyedViewer(), '/stuff/agent/cat');
    pet.setPersistenceKey('mouse-1');
    pet.adjustRegard(bob, 42);
    await flush();

    // ⭐ It does NOT write to the beliefs collection — it persists itself.
    expect(store.size).toBe(0);

    const slice = KeyedViewer.captureSlice(pet as never, {} as never);
    expect('beliefs' in slice && slice.beliefs).toHaveLength(1);

    const reborn = makeStuffAtPath(() => new KeyedViewer(), '/stuff/agent/cat');
    reborn.setPersistenceKey('mouse-1');
    await KeyedViewer.restoreSlice(reborn as never, slice, {} as never);
    expect(reborn.regardFor(bob)).toBe(42);
  });

  it('a viewer whose memory IS in the collection contributes an empty slice', () => {
    // Byte-identical records for every host that already had one: an
    // Avatar's beliefs are durable by identity, so its slice stays empty
    // and nothing is written twice.
    const player = makeViewerAt();
    const slice = KeyedViewer.captureSlice(player as never, {} as never);
    expect('beliefs' in slice && slice.beliefs).toHaveLength(0);
  });
});
