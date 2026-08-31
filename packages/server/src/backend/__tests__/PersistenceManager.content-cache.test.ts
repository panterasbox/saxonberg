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
  /** Set true to make the NEXT `find` wait; `hold` then releases it. */
  gateNext: boolean;
  hold: (() => void) | null;
}

function installFakeContent(
  pm: PersistenceManager,
  rows: Record<string, unknown>[]
): FakeState {
  const state: FakeState = {
    rows: [...rows],
    findFilters: [],
    gateNext: false,
    hold: null,
  };
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
      // One-shot: only the find that was explicitly armed waits, so a
      // later read (a re-preload, say) is not gated by a lock nobody
      // holds the key to.
      let gate: Promise<void> | null = null;
      if (state.gateNext) {
        state.gateNext = false;
        gate = new Promise<void>((release) => {
          state.hold = release as () => void;
        });
      }
      const cursor = {
        sort: () => cursor,
        skip: () => cursor,
        limit: () => cursor,
        toArray: async () => {
          if (gate) await gate;
          return hits;
        },
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
  { _id: BAR_ID, path: '/test/room/bar', class: '/platform/thing/Prop' },
  { _id: WELL_ID, path: '/test/thing/well', class: '/x/Well' },
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
      path: '/test/room/bar',
    });
    const second = await pm.find(Collections.Content, {
      path: '/test/room/bar',
    });

    expect(first[0]?.class).toBe('/platform/thing/Prop');
    expect(second[0]?.class).toBe('/platform/thing/Prop');
    // One preload, and nothing after it.
    expect(state.findFilters).toEqual([{}]);
  });

  it('answers a MISS without a round trip', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });
    state.findFilters.length = 0;

    // The shape the zone walk makes: every ancestor of the row's own
    // path, none of which exists as a row here.
    expect(await pm.find(Collections.Content, { path: '/test/room' })).toEqual(
      []
    );
    expect(await pm.find(Collections.Content, { path: '/test' })).toEqual([]);
    expect(state.findFilters).toEqual([]);
  });

  it('hands out copies — a caller mutating a row cannot corrupt it', async () => {
    installFakeContent(pm, ROWS);
    const got = await pm.find(Collections.Content, {
      path: '/test/room/bar',
    });
    (got[0] as Record<string, unknown>).class = '/tampered';

    const again = await pm.find(Collections.Content, {
      path: '/test/room/bar',
    });
    expect(again[0]?.class).toBe('/platform/thing/Prop');
  });

  it('a save is written through, so the next read sees it', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });
    state.findFilters.length = 0;

    await pm.save(Collections.Content, {
      _id: BAR_ID,
      path: '/test/room/bar',
      class: '/platform/thing/Chair',
    });

    const got = await pm.find(Collections.Content, {
      path: '/test/room/bar',
    });
    expect(got[0]?.class).toBe('/platform/thing/Chair');
    expect(state.findFilters).toEqual([]);
  });

  it('a save that re-paths a row evicts the path it used to hold', async () => {
    installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });

    // The `mv` shape: same `_id`, new `path`.
    await pm.save(Collections.Content, {
      _id: BAR_ID,
      path: '/test/room/snug',
      class: '/platform/thing/Prop',
    });

    expect(await pm.find(Collections.Content, { path: '/test/room/bar' }))
      .toEqual([]);
    expect(
      (await pm.find(Collections.Content, { path: '/test/room/snug' }))[0]
        ?.class
    ).toBe('/platform/thing/Prop');
  });

  it('a delete evicts the row', async () => {
    installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });

    await pm.delete(Collections.Content, BAR_ID);

    expect(
      await pm.find(Collections.Content, { path: '/test/room/bar' })
    ).toEqual([]);
  });

  it('a bulk delete drops the cache whole and the next read repopulates', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });
    state.findFilters.length = 0;

    await pm.deleteMany(Collections.Content, { sourcePack: 'whatever' });

    await pm.find(Collections.Content, { path: '/test/room/bar' });
    expect(state.findFilters).toEqual([{}]);
  });

  it('passes a non-by-path query through to Mongo', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });
    state.findFilters.length = 0;

    await pm.find(Collections.Content, { class: '/platform/thing/Prop' });
    expect(state.findFilters).toEqual([{ class: '/platform/thing/Prop' }]);
  });

  it('never answers for another collection, even a by-path query', async () => {
    const state = installFakeContent(pm, ROWS);
    await pm.find(Collections.Content, { path: '/test/room/bar' });
    state.findFilters.length = 0;

    await pm.find(Collections.Documents, { path: '/test/room/bar' });
    expect(state.findFilters).toEqual([{ path: '/test/room/bar' }]);
  });

  it('does not lose a save that lands while the preload is in flight', async () => {
    const state = installFakeContent(pm, ROWS);
    state.gateNext = true;

    // The preload's snapshot is taken now and predates the save below.
    const reading = pm.find(Collections.Content, { path: '/test/room/bar' });
    await pm.save(Collections.Content, {
      path: '/test/room/snug',
      class: '/platform/thing/Prop',
    });
    state.hold!(); // the snapshot lands, without the new row in it
    await reading;

    // Without the pending-write buffer this row is invisible for the
    // life of the cache: not in the snapshot, and no map to fold into.
    const got = await pm.find(Collections.Content, {
      path: '/test/room/snug',
    });
    expect(got[0]?.class).toBe('/platform/thing/Prop');
  });

  it('does not resurrect a delete that lands while the preload is in flight', async () => {
    const state = installFakeContent(pm, ROWS);
    state.gateNext = true;

    const reading = pm.find(Collections.Content, { path: '/test/room/bar' });
    await pm.delete(Collections.Content, BAR_ID);
    state.hold!(); // the snapshot lands, still holding the deleted row
    await reading;

    expect(
      await pm.find(Collections.Content, { path: '/test/room/bar' })
    ).toEqual([]);
  });

  it('discards a preload whose snapshot a bulk delete has already invalidated', async () => {
    const state = installFakeContent(pm, ROWS);
    state.gateNext = true;

    const reading = pm.find(Collections.Content, { path: '/test/room/bar' });
    // The bulk filter names no ids to replay, so the in-flight snapshot
    // — which still holds every row — cannot be corrected, only dropped.
    state.rows = state.rows.filter((r) => r.path !== '/test/room/bar');
    await pm.deleteMany(Collections.Content, { sourcePack: 'gone' });
    state.hold!();
    await reading;

    state.findFilters.length = 0;
    expect(
      await pm.find(Collections.Content, { path: '/test/room/bar' })
    ).toEqual([]);
    // It re-read rather than installing the stale snapshot.
    expect(state.findFilters).toEqual([{}]);
  });

  it('reads through when there is no connection', async () => {
    (pm as unknown as { db: unknown }).db = null;
    const state = installFakeContent(pm, ROWS);

    await pm.find(Collections.Content, { path: '/test/room/bar' });
    await pm.find(Collections.Content, { path: '/test/room/bar' });

    expect(state.findFilters).toEqual([
      { path: '/test/room/bar' },
      { path: '/test/room/bar' },
    ]);
  });
});
