/**
 * `withSaveMany(fake)` — give a hand-built `PersistenceManager.get()` fake
 * a faithful `saveMany` (db-performance W2) on top of its own `find` and
 * `save`, so the dozens of tests that fake the manager by hand keep their
 * in-memory semantics when production code batches its writes: a keyed
 * write finds the row by its key and saves over it (or inserts; a miss
 * with `insert: false` writes nothing), an unkeyed one saves as-is.
 */

import { vi } from 'vitest';
import { PersistApi, type BatchWrite } from '../../../api/persist';
import type { PersistenceManager } from '../../../../backend/PersistenceManager';

type Row = Record<string, unknown>;
interface Fake {
  find?: (c: string, q: Row) => Promise<Row[] | undefined> | Row[] | undefined;
  save?: (c: string, d: Row) => Promise<unknown> | unknown;
}

export function withSaveMany<T extends object>(fake: T): T {
  const f = fake as unknown as Fake;
  return Object.assign(fake, {
    saveMany: async (c: string, writes: readonly BatchWrite[]): Promise<number> => {
      let n = 0;
      for (const w of writes) {
        if (w.key && w.key.length > 0) {
          const filter = Object.fromEntries(w.key.map((k) => [k, w.doc[k]]));
          const found = (await f.find?.(c, filter)) ?? [];
          const hit = Array.isArray(found) ? found[0] : undefined;
          if (!hit && w.insert === false) continue;
          const { createdAt: _createdAt, ...rest } = w.doc;
          await f.save?.(c, hit ? { ...hit, ...rest, _id: hit._id } : { ...w.doc });
        } else {
          await f.save?.(c, { ...w.doc });
        }
        n++;
      }
      return n;
    },
  });
}

/**
 * `spySaveMany(pm)` — for a test that spies the live manager's methods one
 * by one (`vi.spyOn(pm, 'save')`): route `saveMany` through the same spied
 * `find` and `save`, so a batched write lands where the test's fake keeps
 * its rows.
 */
export function spySaveMany(pm: PersistenceManager): void {
  const via = withSaveMany({
    find: (c: string, q: Row) => pm.find(c, q),
    save: (c: string, d: Row) => pm.save(c, d),
  }) as unknown as { saveMany: PersistenceManager['saveMany'] };
  vi.spyOn(pm, 'saveMany').mockImplementation((c, writes) => via.saveMany(c, writes));
}

/**
 * `spyPersistSaveMany()` — the same for a test that spies the FACADE
 * (`vi.spyOn(PersistApi, 'save')`): `PersistApi.saveMany` routes through
 * the spied `PersistApi.find` and `PersistApi.save`.
 */
export function spyPersistSaveMany(): void {
  const via = withSaveMany({
    find: (c: string, q: Row) => PersistApi.find(c, q),
    save: (c: string, d: Row) => PersistApi.save(c, d),
  }) as unknown as { saveMany: typeof PersistApi.saveMany };
  vi.spyOn(PersistApi, 'saveMany').mockImplementation((c, writes) => via.saveMany(c, writes));
}
