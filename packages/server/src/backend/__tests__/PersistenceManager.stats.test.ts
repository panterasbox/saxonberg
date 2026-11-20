import '../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersistenceManager } from '../PersistenceManager';

/**
 * `stats()` — the database's numbers `/stats` serves as `db`
 * (db-performance D10). The op counters are always on: every
 * PersistenceManager call counts, per `<op> <collection>`, whatever the
 * query-trace switch says. (The pool figures are fed by the driver's own
 * pool events, registered at `connect()`; the drive's step 5 reads them
 * against a live pool.)
 */
describe('PersistenceManager.stats', () => {
  let pm: PersistenceManager;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
    const fake = {
      insertOne: vi.fn(async () => ({ insertedId: { toString: () => 'id-1' } })),
      updateOne: vi.fn(async () => ({})),
      deleteOne: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ deletedCount: 2 })),
      find: vi.fn(() => ({ toArray: async () => [] })),
      findOne: vi.fn(async () => null),
      distinct: vi.fn(async () => []),
    };
    vi.spyOn(pm, 'getCollection').mockReturnValue(
      fake as unknown as ReturnType<PersistenceManager['getCollection']>
    );
  });

  it('counts each op per `<op> <collection>`, in total, with time', async () => {
    const before = pm.stats();
    await pm.save('stats_probe', { a: 1 });
    await pm.save('stats_probe', { a: 2 });
    await pm.find('stats_probe', { a: 1 });
    await pm.findById('stats_probe', '0123456789abcdef01234567');
    await pm.distinct('stats_probe', 'a');
    await pm.delete('stats_probe', '0123456789abcdef01234567');
    await pm.deleteMany('stats_probe', { a: 1 });
    const after = pm.stats();

    const d = (k: string) => (after.byOp[k]?.n ?? 0) - (before.byOp[k]?.n ?? 0);
    expect(d('save stats_probe')).toBe(2);
    expect(d('find stats_probe')).toBe(1);
    expect(d('findById stats_probe')).toBe(1);
    expect(d('distinct stats_probe')).toBe(1);
    expect(d('delete stats_probe')).toBe(1);
    expect(d('deleteMany stats_probe')).toBe(1);
    expect(after.ops.n - before.ops.n).toBe(7);
    expect(after.ops.ms).toBeGreaterThanOrEqual(before.ops.ms);
  });

  it('reports the pool shape, and no caller table with the trace off', () => {
    const s = pm.stats();
    expect(s.pool.max).toBe(24);
    for (const k of ['inUse', 'waiting', 'waited', 'waitMs', 'peakWaiting'] as const) {
      expect(s.pool[k]).toBeGreaterThanOrEqual(0);
    }
    expect(typeof s.roundTrips).toBe('number');
    expect(s.callers).toBeUndefined();
  });
});
