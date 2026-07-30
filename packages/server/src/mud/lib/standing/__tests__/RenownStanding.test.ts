/**
 * RenownStanding — the materialized aggregate Document + its warmed read
 * cache. Covers: a cold cache reads the neutral 0 (never throws); `warm`
 * loads saved rows keyed by `{subject, scope}`; persisted fields
 * round-trip.
 *
 * Mongo is faked with an in-memory collection (the renown harness).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RenownStanding, { COMPACT_WIDE } from '../RenownStanding';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  RenownStanding._resetForTesting();
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
  RenownStanding._resetForTesting();
});

describe('RenownStanding', () => {
  it('reads the neutral 0 from a cold cache (never throws)', () => {
    expect(
      RenownStanding.cached().get(RenownStanding.key('/p', COMPACT_WIDE))
    ).toBeUndefined();
  });

  it('warm loads saved rows into the cache, keyed by {subject, scope}', async () => {
    const a = new RenownStanding();
    a.subject = '/p1';
    a.scope = COMPACT_WIDE;
    a.value = 5;
    a.recomputedAt = 100;
    await a.save();
    const b = new RenownStanding();
    b.subject = '/p1';
    b.scope = 'managed:guild';
    b.value = -2;
    await b.save();

    await RenownStanding.warm();
    const cache = RenownStanding.cached();
    expect(cache.get(RenownStanding.key('/p1', COMPACT_WIDE))).toBe(5);
    expect(cache.get(RenownStanding.key('/p1', 'managed:guild'))).toBe(-2);
    expect(cache.get(RenownStanding.key('/p1', 'managed:none'))).toBeUndefined();
  });
});
