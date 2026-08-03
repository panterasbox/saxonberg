/**
 * An in-memory `PersistenceManager` stand-in for the wiki suites.
 *
 * Deliberately a working store rather than a set of call-assertions.
 * Most of what these tests need to prove is *behaviour over several
 * writes* — create then edit then roll back; rename and check both
 * names still resolve; delete and check a moderator still sees it —
 * and a mock that records calls proves the registry made some calls,
 * not that the wiki works. The queries the registry actually issues
 * (equality, and array-contains for `aliases`) are small enough to
 * implement honestly.
 *
 * Test-only. Lives under `__tests__/`, which the export-discipline
 * lint excludes by path.
 */

import { vi } from 'vitest';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

/** The handle a suite uses to seed or inspect the store directly. */
export interface WikiTestDb {
  /** Every row, by collection. */
  rows: Map<string, Array<Record<string, unknown>>>;
  /** Drop everything (per-test isolation). */
  reset(): void;
  /** The rows of one collection, as stored. */
  all(collection: string): Array<Record<string, unknown>>;
}

let nextId = 1;

/**
 * Match a stored row against one of the registry's queries.
 *
 * Two shapes are supported, because two are all that are issued:
 *  - **equality** on a scalar field (`{namespace, slug}`);
 *  - **array-contains**, where the query value is a scalar and the
 *    stored value is an array (`{aliases: 'oak'}` — Mongo's implicit
 *    multikey match, which is how alias lookup works).
 *
 * Dotted paths (`'subject.ref'`) walk the object, matching Mongo.
 */
function matches(
  row: Record<string, unknown>,
  query: Record<string, unknown>,
): boolean {
  for (const [key, want] of Object.entries(query)) {
    const have = key.includes('.')
      ? key.split('.').reduce<unknown>(
          (acc, part) =>
            typeof acc === 'object' && acc !== null
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          row,
        )
      : row[key];
    if (Array.isArray(have)) {
      if (!have.includes(want)) return false;
      continue;
    }
    if (have !== want) return false;
  }
  return true;
}

/**
 * Install the fake over the live `PersistenceManager` singleton for the
 * duration of a suite. Call `reset()` in `beforeEach`.
 */
export function installWikiTestDb(): WikiTestDb {
  const rows = new Map<string, Array<Record<string, unknown>>>();
  const pm = PersistenceManager.get();

  const bucket = (collection: string): Array<Record<string, unknown>> => {
    let b = rows.get(collection);
    if (!b) {
      b = [];
      rows.set(collection, b);
    }
    return b;
  };

  vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
    const b = bucket(collection);
    const existingId = doc._id as string | undefined;
    if (existingId) {
      const idx = b.findIndex((r) => r._id === existingId);
      const copy = { ...doc };
      if (idx >= 0) b[idx] = copy;
      else b.push(copy);
      return existingId;
    }
    const id = `id-${nextId++}`;
    b.push({ ...doc, _id: id });
    return id;
  });

  vi.spyOn(pm, 'findById').mockImplementation(async (collection, id) => {
    return bucket(collection).find((r) => r._id === id) ?? null;
  });

  vi.spyOn(pm, 'find').mockImplementation(async (collection, query) => {
    return bucket(collection).filter((r) =>
      matches(r, (query ?? {}) as Record<string, unknown>),
    );
  });

  vi.spyOn(pm, 'delete').mockImplementation(async (collection, id) => {
    const b = bucket(collection);
    const idx = b.findIndex((r) => r._id === id);
    if (idx >= 0) b.splice(idx, 1);
  });

  vi.spyOn(pm, 'isConnected').mockReturnValue(true);

  return {
    rows,
    reset: () => rows.clear(),
    all: (collection: string) => bucket(collection),
  };
}
