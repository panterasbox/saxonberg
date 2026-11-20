/**
 * Escape battery — DURABLE WRITE: the PM policy seam, one probe per
 * verb. STAMP rows are visible in-circle, invisible to field reads,
 * and discardable; REFUSE throws from circle context; PASS persists
 * wire-marked; SHADOW(skip) no-ops while field caches stay untouched.
 * Fails without the `COLLECTION_POLICIES` enforcement in
 * `dispatchSave`/`find`/`deleteMany`.
 *
 * Runs against an in-memory collection fake honoring the filter
 * shapes; the scope rides the REAL resolver seam (the same closure
 * `installFrameworkWiring` installs), driven by test-planted roots.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PersistenceManager,
  Collections,
  SandboxWriteRefusedError,
} from '../../../../../backend/PersistenceManager';
import {


  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../../../api/execution-context';

/*
 * ⚠ **20 s, not vitest's 5 s default.** Every sandbox test stands up a
 * circle and runs at least one session ceremony, which costs seconds —
 * so on a loaded full-suite run they time out in ones and twos while
 * passing in isolation, which reads as a flake and is really a budget.
 * The measurement and the argument for raising it per FILE rather than
 * globally live in `escape/round-trip.test.ts`.
 */
vi.setConfig({ testTimeout: 20_000 });


const SCOPE = '/home/escape-tester';

interface FakeRow {
  circleScope?: string;
  [k: string]: unknown;
}

function installFakeStore(pm: PersistenceManager): Map<string, FakeRow[]> {
  const store = new Map<string, FakeRow[]>();
  const rowsFor = (name: string): FakeRow[] => {
    let rows = store.get(name);
    if (!rows) {
      rows = [];
      store.set(name, rows);
    }
    return rows;
  };
  const matchesLeaf = (
    row: FakeRow,
    filter: Record<string, unknown>
  ): boolean => {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '$or') {
        const branches = v as Record<string, unknown>[];
        if (!branches.some((b) => matchesLeaf(row, b))) return false;
        continue;
      }
      if (v !== null && typeof v === 'object' && '$exists' in (v as object)) {
        if ((k in row) !== (v as { $exists: boolean }).$exists) return false;
        continue;
      }
      if (row[k] !== v) return false;
    }
    return true;
  };
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'getCollection').mockImplementation((name: string) => {
    const fake = {
      insertOne: async (doc: FakeRow) => {
        rowsFor(name).push(doc);
        return { insertedId: { toString: () => 'id' } };
      },
      updateOne: async () => ({}),
      // A batched write (db-performance `saveMany`), in memory: inserts,
      // and keyed upserts merged into the matching row.
      bulkWrite: async (
        ops: Array<{
          insertOne?: { document: FakeRow };
          updateOne?: {
            filter: Record<string, unknown>;
            update: { $set?: FakeRow; $setOnInsert?: FakeRow };
            upsert?: boolean;
          };
        }>,
      ) => {
        let inserted = 0;
        let touched = 0;
        for (const op of ops) {
          if (op.insertOne) {
            rowsFor(name).push(op.insertOne.document);
            inserted++;
            continue;
          }
          if (!op.updateOne) continue;
          const { filter, update, upsert } = op.updateOne;
          const hit = rowsFor(name).find((r) =>
            Object.entries(filter).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
          );
          if (hit) Object.assign(hit, update.$set);
          else if (upsert) rowsFor(name).push({ ...filter, ...update.$set, ...(update.$setOnInsert ?? {}) });
          touched++;
        }
        return { insertedCount: inserted, matchedCount: touched, upsertedCount: 0 };
      },
      deleteMany: async (filter: Record<string, unknown>) => {
        const rows = rowsFor(name);
        const keep = rows.filter((r) => !matchesLeaf(r, filter));
        store.set(name, keep);
        return { deletedCount: rows.length - keep.length };
      },
      find: (filter: Record<string, unknown>) => {
        const result = rowsFor(name).filter((r) => matchesLeaf(r, filter));
        const cursor = {
          sort: () => cursor,
          limit: () => cursor,
          toArray: async () =>
            result.map((r) => ({ ...r, _id: { toString: () => 'id' } })),
        };
        return cursor;
      },
    };
    return fake as unknown as ReturnType<PersistenceManager['getCollection']>;
  });
  return store;
}

function inScope<T>(fn: () => Promise<T>): Promise<T | undefined> {
  return ExecutionContextApi.runRootGuarded(null, 'escape', fn, 'rethrow', {
    circleScope: SCOPE,
  });
}

describe('sandbox-escape: durable-write', () => {
  let pm: PersistenceManager;
  let store: Map<string, FakeRow[]>;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
    store = installFakeStore(pm);
    // The REAL resolver seam (what installFrameworkWiring installs).
    pm.setScopeResolver(() => {
      const s = ExecutionContextApi.getCircleScope();
      return s === OMNI_SCOPE ? null : s;
    });
  });

  afterEach(() => {
    pm.setScopeResolver(() => null);
    ExecutionContextApi._clearForTesting();
    vi.restoreAllMocks();
  });

  it('STAMP: in-circle visible, field-invisible, gone after discard', async () => {
    await inScope(() =>
      pm.save(Collections.BankLedger, { kind: 'transfer', amount: 5 })
    );
    // in-circle read sees it (global ∪ own-scope)
    const inside = await inScope(() =>
      pm.find(Collections.BankLedger, { kind: 'transfer' })
    );
    expect(inside).toHaveLength(1);
    // field read excludes it
    const outside = await pm.find(Collections.BankLedger, {
      kind: 'transfer',
    });
    expect(outside).toHaveLength(0);
    // discard (field/system context names the scope explicitly)
    const n = await pm.deleteMany(Collections.BankLedger, {
      circleScope: SCOPE,
    });
    expect(n).toBe(1);
    expect(store.get(Collections.BankLedger)).toEqual([]);
  });

  it('REFUSE: a chattel stamp / conviction write throws from circle context', async () => {
    await expect(
      inScope(() => pm.save(Collections.Chattel, { chattelId: 'c1' }))
    ).rejects.toThrow(SandboxWriteRefusedError);
    await expect(
      inScope(() => pm.save(Collections.Positions, { subject: 's' }))
    ).rejects.toThrow(SandboxWriteRefusedError);
    expect(store.get(Collections.Chattel) ?? []).toEqual([]);
  });

  it('PASS: an epistemic row persists wire-marked and survives field reads', async () => {
    await inScope(() =>
      pm.save(Collections.Chronicles, { owner: '/platform/agent/Avatar/p1', deed: 'x' })
    );
    const rows = await pm.find(Collections.Chronicles, {
      owner: '/platform/agent/Avatar/p1',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.circleScope).toBe(SCOPE);
  });

  it('SHADOW(skip): the cache write no-ops; field cache rows stay untouched', async () => {
    store.set(Collections.BankAccounts, [{ accountId: 'a1', balance: 100 }]);
    await inScope(() =>
      pm.save(Collections.BankAccounts, { accountId: 'a1', balance: 999 })
    );
    expect(store.get(Collections.BankAccounts)).toEqual([
      { accountId: 'a1', balance: 100 },
    ]);
  });

  it('a circle cannot delete another circle\'s stamped rows', async () => {
    store.set(Collections.Transcripts, [
      { owner: 'x', circleScope: '/home/other' },
    ]);
    await inScope(async () => {
      await pm.deleteMany(Collections.Transcripts, { owner: 'x' });
    });
    // the scoped deleteMany composed circleScope=SCOPE — other's row survives
    expect(store.get(Collections.Transcripts)).toEqual([
      { owner: 'x', circleScope: '/home/other' },
    ]);
  });
});
