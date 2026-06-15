/**
 * ChronicleEntry persistence — a plain `Document` (one row per entry) in
 * the `chronicles` collection, indexed/queried on `owner`. Covers: a
 * saved entry round-trips its fields; `find({ owner })` returns it;
 * `tags`/`who` (arrays) survive; `owner` is the query key (a different
 * owner's rows are excluded).
 *
 * Mongo is faked with an in-memory collection (the belief-store harness).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChronicleEntry from '../ChronicleEntry';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChronicleEntry', () => {
  it('round-trips its fields and finds by owner', async () => {
    const entry = new ChronicleEntry();
    entry.owner = '/obj/Avatar/p1';
    entry.kind = 'deed';
    entry.when = 1234;
    entry.where = '/domain/lounge';
    entry.who = ['/obj/npc/mara'];
    entry.text = 'A witnessed moment.';
    entry.tags = ['arrival', 'social'];
    entry.key = 'first-arrival';
    await entry.save();

    const found = await ChronicleEntry.find({ owner: '/obj/Avatar/p1' });
    expect(found).toHaveLength(1);
    const f = found[0]!;
    expect(f.kind).toBe('deed');
    expect(f.when).toBe(1234);
    expect(f.where).toBe('/domain/lounge');
    expect(f.who).toEqual(['/obj/npc/mara']);
    expect(f.text).toBe('A witnessed moment.');
    expect(f.tags).toEqual(['arrival', 'social']);
    expect(f.key).toBe('first-arrival');
  });

  it('owner is the query key — other owners are excluded', async () => {
    const a = new ChronicleEntry();
    a.owner = '/obj/Avatar/a';
    a.text = 'a';
    await a.save();
    const b = new ChronicleEntry();
    b.owner = '/obj/Avatar/b';
    b.text = 'b';
    await b.save();

    const found = await ChronicleEntry.find({ owner: '/obj/Avatar/a' });
    expect(found).toHaveLength(1);
    expect(found[0]!.text).toBe('a');
  });

  it('persists a claim with order and null when', async () => {
    const claim = new ChronicleEntry();
    claim.owner = '/obj/Avatar/p2';
    claim.kind = 'claim';
    claim.order = 1;
    claim.when = null;
    claim.text = 'A prologue line.';
    await claim.save();

    const [f] = await ChronicleEntry.find({ owner: '/obj/Avatar/p2' });
    expect(f!.kind).toBe('claim');
    expect(f!.order).toBe(1);
    expect(f!.when).toBeNull();
  });
});
