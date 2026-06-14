/**
 * Belief persistence (Wave 8) — the lazily-hydrated, per-record working
 * set. Covers: hydrate → render → write-through → evict → re-hydrate
 * roundtrip; a new encounter is a single-record upsert; a null-`knownAs`
 * stranger is NOT written through; the naming path does no Mongo read.
 *
 * Mongo is faked with an in-memory collection (no mongodb-memory-server),
 * mirroring the Document-test mocking style.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BeliefStoreApi } from '../../../api/belief';
import {
  BeliefStoreMixin,
  RECOGNITION,
  type BeliefRecord,
} from '../BeliefStore';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

class Viewer extends BeliefStoreMixin(Idea) {}

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
function makeViewerAt(): InstanceType<typeof Viewer> {
  return makeStuffAtPath(() => new Viewer(), `/obj/Avatar/p${counter++}`);
}
function registerReferent(path: string): void {
  makeStuffAtPath(() => new Idea(), path);
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

describe('BeliefStoreApi persistence', () => {
  it('writeRecord persists a learned record as a single upsert', async () => {
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
    await BeliefStoreApi.writeRecord(viewer, record);
    expect(store.size).toBe(1);
    const doc = [...store.values()][0]!;
    expect(doc.knownAs).toBe('Mara');
    expect(doc.viewerId).toBe(viewer.getTemplatePath());
  });

  it('does NOT write through a null-knownAs stranger record', async () => {
    const viewer = makeViewerAt();
    registerReferent('/obj/npc/stranger');
    await BeliefStoreApi.writeRecord(viewer, {
      realm: RECOGNITION,
      referent: '/obj/npc/stranger',
      knownAs: null,
      firstSeen: 1,
      lastSeen: 1,
      payload: {},
    });
    expect(store.size).toBe(0);
  });

  it('hydrate → render → write-through → evict → re-hydrate roundtrip', async () => {
    registerReferent('/obj/npc/mara');

    // Session 1: learn Mara, which writes through.
    const path = '/obj/Avatar/roundtrip';
    const s1 = makeStuffAtPath(() => new Viewer(), path);
    s1.know(RECOGNITION, '/obj/npc/mara', { knownAs: 'Mara' });
    await flush(); // let the fire-and-forget write settle
    expect(store.size).toBe(1);

    // Evict clears the in-memory map (final flush is idempotent).
    await BeliefStoreApi.evictAndFlush(s1);
    expect(s1.allBeliefs()).toHaveLength(0);
    StuffApi.unregister(s1);

    // Session 2: a fresh viewer at the same durable key re-hydrates.
    const s2 = makeStuffAtPath(() => new Viewer(), path);
    await BeliefStoreApi.hydrate(s2);
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
