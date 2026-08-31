/**
 * The resident `content` cache — unit tests against a fake collection
 * adapter (the `PersistenceManager.sandbox-policy.test.ts` pattern; no
 * live Mongo).
 *
 * The cache engages only on a live connection, so these tests stand a
 * `db` up by hand. That is the one seam here: `db` is private because
 * nothing outside PM has business setting it, and a test that wants the
 * connected branch has no other way in.
 *
 * What matters most is what these prove about MISSES. The map holds the
 * whole collection, so an absent path is an answer — and the zone walk
 * asks for ancestor paths that mostly do not exist, which is where the
 * boot's round trips actually went.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistenceManager, Collections } from '../PersistenceManager';

// Valid 24-hex ObjectId strings: PM converts an `_id` to an ObjectId on
// the save and delete paths, so a made-up id would fail there for
// reasons that have nothing to do with the cache.
const BAR_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const WELL_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const MINTED_ID = 'cccccccccccccccccccccccc';

interface FakeState {
  rows: Record<string, unknown>[];
  findFilters: unknown[];
}

function installFakeContent(
  pm: PersistenceManager,
  rows: Record<string, unknown>[]
): FakeState {
  const state: FakeState = { rows: [...rows], findFilters: [] };
  const matches = (
    row: Record<string, unknown>,
    filter: Record<string, unknown>
  ): boolean =>
    Object.entries(filter).every(([k, v]) => {
      if (k === '_id') return String(row._id) === String(v);
      return row[k] === v;
    });
  const fakeCollection = {
    insertOne: vi.fn(async (doc: Record<string, unknown>) => {
      state.rows.push({ ...doc, _id: MINTED_ID });
      return { insertedId: { toString: () => MINTED_ID } };
    }),
    updateOne: vi.fn(async () => ({})),
    deleteOne: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ deletedCount: 1 })),
    find: vi.fn((filter: Record<string, unknown>) => {
      state.findFilters.push(filter);
      const hits = state.rows.filter((r) => matches(r, filter));
      const cursor = {
        sort: () => cursor,
        skip: () => cursor,
        limit: () => cursor,
        toArray: async () => hits,
      };
      return cursor;
    }),
    findOne: vi.fn(async () => null),
  };
  vi.spyOn(pm, 'getCollection').mockReturnValue(
    fakeCollection as unknown as ReturnType<PersistenceManager['getCollection']>
  );
  return state;
}

const ROWS = [
  { _id: BAR_ID, path: '/world/lounge/bar', class: '/platform/thing/Prop' },
  { _id: WELL_ID, path: '/trade/hospitality/thing/well', class: '/x/Well' },
];

describe('PersistenceManager — the resident content cache', () => {
  let pm: PersistenceManager;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
    // The connected branch: the cache is a property of one process
    // owning one database (see `contentCacheEngaged`).
    (pm as unknown as { db: unknown }).db = {};
  });

  afterEach(async () => {
    await pm.disconnect(); // drops the cache; no client, so it no-ops
    (pm as unknown as { db: unknown }).db = null;
    vi.restoreAllMocks();
  });

  it('reads a row by path once and serves the rest from memory', async () => {
    const state = installFakeContent(pm, ROWS);

    const first = await pm.find(Collections.Content, {
      path: '/world/lounge/bar',
    });
    const second = await pm.find(Collections.Content, {
      path: '/world/lounge/bar',
    });

    expect(first[0]?.class).toBe('/platform/thing/Prop');
    expect(second[0]?.class).toBe('/platform/thing/Prop');
    // One preload, and nothing after it.
    expect(state.findFilters).toEqual([{}]);
  });

  it('answers a MISS without a round trip', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    state.findFilters.length = 0;

    // The shape the zone walk makes: ancestors that mostly do not exist.
    expect(await pm.find(Collections.Content, { path: '/world' })).toEqual([]);
    expect(await pm.find(Collections.Content, { path: '/trade' })).toEqual([]);
    expect(state.findFilters).toEqual([]);
  });

  it('hands out copies — a caller mutating a row cannot corrupt it', async () => {
    installFakeContent(pm, ROWS);
    const got = await pm.find(Collections.Content, {
      path: '/world/lounge/bar',
    });
    (got[0] as Record<string, unknown>).class = '/tampered';

    const again = await pm.find(Collections.Content, {
      path: '/world/lounge/bar',
    });
    expect(again[0]?.class).toBe('/platform/thing/Prop');
  });

  it('a save is written through, so the next read sees it', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    state.findFilters.length = 0;

    await pm.save(Collections.Content, {
      _id: BAR_ID,
      path: '/world/lounge/bar',
      class: '/platform/thing/Chair',
    });

    const got = await pm.find(Collections.Content, {
      path: '/world/lounge/bar',
    });
    expect(got[0]?.class).toBe('/platform/thing/Chair');
    expect(state.findFilters).toEqual([]);
  });

  it('a save that re-paths a row evicts the path it used to hold', async () => {
    installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });

    // The `mv` shape: same `_id`, new `path`.
    await pm.save(Collections.Content, {
      _id: BAR_ID,
      path: '/world/lounge/snug',
      class: '/platform/thing/Prop',
    });

    expect(await pm.find(Collections.Content, { path: '/world/lounge/bar' }))
      .toEqual([]);
    expect(
      (await pm.find(Collections.Content, { path: '/world/lounge/snug' }))[0]
        ?.class
    ).toBe('/platform/thing/Prop');
  });

  it('a delete evicts the row', async () => {
    installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });

    await pm.delete(Collections.Content, BAR_ID);

    expect(
      await pm.find(Collections.Content, { path: '/world/lounge/bar' })
    ).toEqual([]);
  });

  it('a bulk delete drops the cache whole and the next read repopulates', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    state.findFilters.length = 0;

    await pm.deleteMany(Collections.Content, { sourcePack: 'whatever' });

    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    expect(state.findFilters).toEqual([{}]);
  });

  it('passes a non-by-path query through to Mongo', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    state.findFilters.length = 0;

    await pm.find(Collections.Content, { class: '/platform/thing/Prop' });
    expect(state.findFilters).toEqual([{ class: '/platform/thing/Prop' }]);
  });

  it('never answers for another collection, even a by-path query', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    state.findFilters.length = 0;

    await pm.find(Collections.Documents, { path: '/world/lounge/bar' });
    expect(state.findFilters).toEqual([{ path: '/world/lounge/bar' }]);
  });

  it('reads through when there is no connection', async () => {
    (pm as unknown as { db: unknown }).db = null;
    const state = installFakeContent(pm, ROWS);

    await pm.find(Collections.Content, { path: '/world/lounge/bar' });
    await pm.find(Collections.Content, { path: '/world/lounge/bar' });

    expect(state.findFilters).toEqual([
      { path: '/world/lounge/bar' },
      { path: '/world/lounge/bar' },
    ]);
  });
});
