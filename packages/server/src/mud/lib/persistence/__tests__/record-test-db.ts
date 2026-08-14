/**
 * An in-memory `PersistenceManager` stand-in for the record-layer
 * suites.
 *
 * Richer than `wiki-test-db` because the record layer issues queries the
 * wiki never does: `$lte` range deletes (the window trim), `sort` +
 * `skip` + `limit` (the window edge lookup and the backfill read), and
 * `$text` (the `recall` fast path). Implementing them honestly is the
 * only way a test can prove *the window bounds the store* rather than
 * *the trim method was called*.
 *
 * ⚠ `$text` here is a **substring** match, not Mongo's stemmed one. The
 * production code treats `$text` as a fast path with a loose fallback
 * precisely because the two differ, and a fake that pretended to stem
 * would be testing a fiction.
 *
 * Test-only. Lives under `__tests__/`, which the export-discipline lint
 * excludes by path.
 */

import { vi } from 'vitest';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

export interface RecordTestDb {
  rows: Map<string, Array<Record<string, unknown>>>;
  reset(): void;
  all(collection: string): Array<Record<string, unknown>>;
  seed(collection: string, docs: Array<Record<string, unknown>>): void;
}

let nextId = 1;

function matchOperators(have: unknown, want: Record<string, unknown>): boolean {
  for (const [op, v] of Object.entries(want)) {
    const n = Number(have);
    switch (op) {
      case '$lte':
        if (!(n <= Number(v))) return false;
        break;
      case '$lt':
        if (!(n < Number(v))) return false;
        break;
      case '$gte':
        if (!(n >= Number(v))) return false;
        break;
      case '$gt':
        if (!(n > Number(v))) return false;
        break;
      case '$ne':
        if (have === v) return false;
        break;
      case '$in':
        if (!Array.isArray(v) || !v.includes(have)) return false;
        break;
      case '$exists':
        if ((have !== undefined) !== Boolean(v)) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

/** The searchable text of a row — every string field, concatenated. */
function textOf(row: Record<string, unknown>): string {
  return Object.values(row)
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
}

function matches(
  row: Record<string, unknown>,
  query: Record<string, unknown>,
): boolean {
  for (const [key, want] of Object.entries(query)) {
    if (key === '$text') {
      const search = String(
        (want as { $search?: unknown }).$search ?? '',
      ).toLowerCase();
      const hay = textOf(row);
      if (!search.split(/\s+/).every((t) => !t || hay.includes(t))) return false;
      continue;
    }
    const have = key.includes('.')
      ? key.split('.').reduce<unknown>(
          (acc, part) =>
            typeof acc === 'object' && acc !== null
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          row,
        )
      : row[key];
    if (want !== null && typeof want === 'object' && !Array.isArray(want)) {
      if (!matchOperators(have, want as Record<string, unknown>)) return false;
      continue;
    }
    if (Array.isArray(have)) {
      if (!have.includes(want)) return false;
      continue;
    }
    if (have !== want) return false;
  }
  return true;
}

export function installRecordTestDb(): RecordTestDb {
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

  vi.spyOn(pm, 'findById').mockImplementation(
    async (collection, id) => bucket(collection).find((r) => r._id === id) ?? null,
  );

  vi.spyOn(pm, 'find').mockImplementation(async (collection, query, options) => {
    let out = bucket(collection).filter((r) =>
      matches(r, (query ?? {}) as Record<string, unknown>),
    );
    const sort = options?.sort;
    if (sort) {
      const entries = Object.entries(sort);
      out = [...out].sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = a[field];
          const bv = b[field];
          if (av === bv) continue;
          const less = (av as number) < (bv as number);
          return (less ? -1 : 1) * (dir as number);
        }
        return 0;
      });
    }
    if (options?.skip != null) out = out.slice(options.skip);
    if (options?.limit != null) out = out.slice(0, options.limit);
    return out;
  });

  vi.spyOn(pm, 'delete').mockImplementation(async (collection, id) => {
    const b = bucket(collection);
    const idx = b.findIndex((r) => r._id === id);
    if (idx >= 0) b.splice(idx, 1);
  });

  vi.spyOn(pm, 'deleteMany').mockImplementation(async (collection, filter) => {
    const b = bucket(collection);
    const keep = b.filter(
      (r) => !matches(r, (filter ?? {}) as Record<string, unknown>),
    );
    const removed = b.length - keep.length;
    b.length = 0;
    b.push(...keep);
    return removed;
  });

  vi.spyOn(pm, 'isConnected').mockReturnValue(true);

  return {
    rows,
    reset: () => rows.clear(),
    all: (collection: string) => bucket(collection),
    seed: (collection, docs) => {
      for (const d of docs) bucket(collection).push({ _id: `id-${nextId++}`, ...d });
    },
  };
}
