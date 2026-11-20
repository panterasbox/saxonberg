/**
 * `saveMany` — a keyed batch write at the chokepoint (db-performance D7),
 * against a fake collection (the hooks/sandbox-policy tests' pattern; no
 * live Mongo). One `bulkWrite` per call, three write forms chosen by each
 * write's own fields, and the same refusals `save` has: a hooked
 * collection is refused before anything is sent, the sandbox policy is
 * the same sentence, re-entry throws.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PersistenceManager,
  Collections,
  BatchOnHookedCollectionError,
  SandboxWriteRefusedError,
  type AroundSaveFn,
} from '../PersistenceManager';

type Op = Record<string, { filter?: Record<string, unknown>; update?: Record<string, unknown>; upsert?: boolean; document?: Record<string, unknown> }>;

function installFake(pm: PersistenceManager): { calls: Op[][]; options: unknown[] } {
  const calls: Op[][] = [];
  const options: unknown[] = [];
  const fake = {
    bulkWrite: vi.fn(async (ops: Op[], opts: unknown) => {
      calls.push(ops);
      options.push(opts);
      return { insertedCount: ops.filter((o) => o.insertOne).length, matchedCount: 0, upsertedCount: ops.filter((o) => o.updateOne).length };
    }),
    insertOne: vi.fn(async () => ({ insertedId: { toString: () => 'id' } })),
    updateOne: vi.fn(async () => ({})),
  };
  vi.spyOn(pm, 'getCollection').mockReturnValue(
    fake as unknown as ReturnType<PersistenceManager['getCollection']>
  );
  return { calls, options };
}

describe('PersistenceManager.saveMany', () => {
  let pm: PersistenceManager;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
  });

  afterEach(() => {
    pm.setScopeResolver(() => null);
    vi.restoreAllMocks();
  });

  it('one bulkWrite, unordered, for the three write forms', async () => {
    const { calls, options } = installFake(pm);
    const created = new Date(1);
    const n = await pm.saveMany('probe', [
      { doc: { subject: 's', scope: '*', value: 2, createdAt: created }, key: ['subject', 'scope'] },
      { doc: { _id: '0123456789abcdef01234567', value: 3 } },
      { doc: { value: 4 } },
    ]);
    expect(calls).toHaveLength(1);
    expect(options[0]).toEqual({ ordered: false });
    const [keyed, byId, ins] = calls[0]!;
    expect(keyed!.updateOne!.filter).toEqual({ subject: 's', scope: '*' });
    expect(keyed!.updateOne!.upsert).toBe(true);
    // createdAt only on insert; never in $set.
    expect(keyed!.updateOne!.update).toEqual({
      $set: { subject: 's', scope: '*', value: 2 },
      $setOnInsert: { createdAt: created },
    });
    expect(String(byId!.updateOne!.filter!._id)).toBe('0123456789abcdef01234567');
    expect(byId!.updateOne!.update).toEqual({ $set: { value: 3 } });
    expect(byId!.updateOne!.upsert).toBeUndefined();
    expect(ins!.insertOne!.document).toEqual({ value: 4 });
    expect(n).toBe(3);
  });

  it('a keyed write with `insert: false` never upserts (a miss writes nothing)', async () => {
    const { calls } = installFake(pm);
    await pm.saveMany('probe', [{ doc: { chattelId: 'c1', place: '/p' }, key: ['chattelId'], insert: false }]);
    expect(calls[0]![0]!.updateOne!.upsert).toBe(false);
    expect(calls[0]![0]!.updateOne!.update).toEqual({ $set: { chattelId: 'c1', place: '/p' } });
  });

  it('an empty batch sends nothing', async () => {
    const { calls } = installFake(pm);
    expect(await pm.saveMany('probe', [])).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('⚠ a hooked collection is refused before anything is sent', async () => {
    const { calls } = installFake(pm);
    const hook: AroundSaveFn = async (_c, doc, next) => next(doc);
    pm.registerHook('hooked', 'save', hook);
    await expect(pm.saveMany('hooked', [{ doc: { a: 1 } }])).rejects.toBeInstanceOf(BatchOnHookedCollectionError);
    expect(calls).toHaveLength(0);
  });

  it('a hook that batches its own collection is refused, not re-entered', async () => {
    const { calls } = installFake(pm);
    const hook: AroundSaveFn = async (_c, doc, next) => {
      await pm.saveMany('reenter', [{ doc: { b: 1 } }]);
      return next(doc);
    };
    pm.registerHook('reenter', 'save', hook);
    await expect(pm.save('reenter', { a: 1 })).rejects.toBeInstanceOf(BatchOnHookedCollectionError);
    expect(calls).toHaveLength(0);
  });

  describe('the sandbox policy is save’s sentence', () => {
    const SCOPE = '/home/test-player';

    it('refuse throws; nothing sent', async () => {
      const { calls } = installFake(pm);
      pm.setScopeResolver(() => SCOPE);
      await expect(pm.saveMany(Collections.AppSettings, [{ doc: { a: 1 } }])).rejects.toBeInstanceOf(SandboxWriteRefusedError);
      expect(calls).toHaveLength(0);
    });

    it('stamp marks every doc AND confines a keyed filter to the circle', async () => {
      const { calls } = installFake(pm);
      pm.setScopeResolver(() => SCOPE);
      await pm.saveMany(Collections.BankLedger, [{ doc: { k: 1, v: 2 }, key: ['k'] }, { doc: { v: 3 } }]);
      const [keyed, ins] = calls[0]!;
      expect(keyed!.updateOne!.filter).toEqual({ k: 1, circleScope: SCOPE });
      expect((keyed!.updateOne!.update!.$set as Record<string, unknown>).circleScope).toBe(SCOPE);
      expect(ins!.insertOne!.document!.circleScope).toBe(SCOPE);
    });

    it('pass + mark marks the doc, filter untouched', async () => {
      const { calls } = installFake(pm);
      pm.setScopeResolver(() => SCOPE);
      await pm.saveMany(Collections.AccountabilityEvents, [{ doc: { k: 1 }, key: ['k'] }]);
      expect(calls[0]![0]!.updateOne!.filter).toEqual({ k: 1 });
      expect((calls[0]![0]!.updateOne!.update!.$set as Record<string, unknown>).circleScope).toBe(SCOPE);
    });

    it('shadow/skip writes nothing and returns 0', async () => {
      const { calls } = installFake(pm);
      pm.setScopeResolver(() => SCOPE);
      expect(await pm.saveMany(Collections.BankAccounts, [{ doc: { a: 1 } }])).toBe(0);
      expect(calls).toHaveLength(0);
    });

    it('an unclassified collection from a circle fails closed', async () => {
      installFake(pm);
      pm.setScopeResolver(() => SCOPE);
      await expect(pm.saveMany('not_a_collection', [{ doc: { a: 1 } }])).rejects.toBeInstanceOf(SandboxWriteRefusedError);
    });
  });

  it('the counters record ONE saveMany op per batch', async () => {
    installFake(pm);
    const before = pm.stats().byOp['saveMany probe2']?.n ?? 0;
    await pm.saveMany('probe2', [{ doc: { a: 1 } }, { doc: { a: 2 } }, { doc: { a: 3 } }]);
    expect((pm.stats().byOp['saveMany probe2']?.n ?? 0) - before).toBe(1);
  });
});
