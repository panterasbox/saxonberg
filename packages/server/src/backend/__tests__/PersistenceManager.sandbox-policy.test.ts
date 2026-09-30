/**
 * The sandbox write-policy seam (Wave 1) — unit tests against a fake
 * collection adapter (the PersistenceManager.hooks.test.ts pattern; no
 * live Mongo). Scope is stubbed via `setScopeResolver`, exactly the
 * seam `BootstrapManager.installFrameworkWiring` installs.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PersistenceManager,
  Collections,
  COLLECTION_POLICIES,
  SandboxWriteRefusedError,
  SandboxOverlayUnimplementedError,
} from '../PersistenceManager';

const SCOPE = '/home/test-player';

interface FakeState {
  inserts: Record<string, unknown>[];
  upserts: Array<{ filter: unknown; update: unknown }>;
  deletes: unknown[];
  bulkDeletes: unknown[];
  findFilters: unknown[];
  findOneFilters: unknown[];
}

function installFakeCollection(pm: PersistenceManager): FakeState {
  const state: FakeState = {
    inserts: [],
    upserts: [],
    deletes: [],
    bulkDeletes: [],
    findFilters: [],
    findOneFilters: [],
  };
  const fakeCollection = {
    insertOne: vi.fn(async (doc: Record<string, unknown>) => {
      state.inserts.push(doc);
      return { insertedId: { toString: () => 'inserted-id' } };
    }),
    updateOne: vi.fn(async (filter: unknown, update: unknown) => {
      state.upserts.push({ filter, update });
      return {};
    }),
    deleteOne: vi.fn(async (filter: unknown) => {
      state.deletes.push(filter);
      return {};
    }),
    deleteMany: vi.fn(async (filter: unknown) => {
      state.bulkDeletes.push(filter);
      return { deletedCount: 2 };
    }),
    find: vi.fn((filter: unknown) => {
      state.findFilters.push(filter);
      const cursor = {
        sort: () => cursor,
        limit: () => cursor,
        toArray: async () => [],
      };
      return cursor;
    }),
    findOne: vi.fn(async (filter: unknown) => {
      state.findOneFilters.push(filter);
      return null;
    }),
  };
  vi.spyOn(pm, 'getCollection').mockReturnValue(
    fakeCollection as unknown as ReturnType<PersistenceManager['getCollection']>
  );
  return state;
}

describe('PersistenceManager sandbox policy seam', () => {
  let pm: PersistenceManager;

  beforeEach(() => {
    pm = PersistenceManager.get();
    pm.clearHooks();
  });

  afterEach(() => {
    pm.setScopeResolver(() => null);
    vi.restoreAllMocks();
  });

  describe('policy totality', () => {
    it('every Collections enum member has a policy row', () => {
      for (const collection of Object.values(Collections)) {
        expect(
          COLLECTION_POLICIES[collection],
          `missing policy for '${collection}'`
        ).toBeDefined();
      }
    });

    it('the STAMP set is exactly the five material ledgers', () => {
      const stamps = Object.values(Collections).filter(
        (c) => COLLECTION_POLICIES[c].verb === 'stamp'
      );
      expect(stamps.sort()).toEqual(
        [
          Collections.BankLedger,
          Collections.Transcripts,
          Collections.RenownEvents,
          Collections.ParticipationEvents,
          Collections.DispositionEvents,
        ].sort()
      );
    });
  });

  describe('inertness (no scope established)', () => {
    it('saves are byte-identical on every verb class', async () => {
      const state = installFakeCollection(pm);
      const doc = { foo: 'bar' };
      await pm.save(Collections.BankLedger, { ...doc });
      await pm.save(Collections.Chronicles, { ...doc });
      await pm.save(Collections.Content, { ...doc });
      await pm.save(Collections.Parcels, { ...doc });
      await pm.save(Collections.BankAccounts, { ...doc });
      expect(state.inserts).toEqual([doc, doc, doc, doc, doc]);
    });

    it('PASS reads get zero filter injection', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.Content, { path: '/x' });
      await pm.find(Collections.Documents, {});
      expect(state.findFilters).toEqual([{ path: '/x' }, {}]);
    });

    it('STAMP reads get only the residual field-side predicate', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.BankLedger, { kind: 'mint' });
      expect(state.findFilters).toEqual([
        { kind: 'mint', circleScope: { $exists: false } },
      ]);
    });

    it('SHADOW reads get the residual field-side predicate', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.Renown, { subject: 's' });
      expect(state.findFilters).toEqual([
        { subject: 's', circleScope: { $exists: false } },
      ]);
    });
  });

  describe('scoped writes', () => {
    beforeEach(() => {
      pm.setScopeResolver(() => SCOPE);
    });

    it('STAMP: the row is written with circleScope stamped', async () => {
      const state = installFakeCollection(pm);
      await pm.save(Collections.Transcripts, { owner: 'x' });
      expect(state.inserts).toEqual([{ owner: 'x', circleScope: SCOPE }]);
    });

    it('PASS(mark): persists with the wire mark', async () => {
      const state = installFakeCollection(pm);
      await pm.save(Collections.Chronicles, { owner: 'x' });
      expect(state.inserts).toEqual([{ owner: 'x', circleScope: SCOPE }]);
    });

    it('PASS(unmarked): persists untouched', async () => {
      const state = installFakeCollection(pm);
      await pm.save(Collections.Content, { path: '/home/x/room' });
      expect(state.inserts).toEqual([{ path: '/home/x/room' }]);
    });

    it('REFUSE: throws SandboxWriteRefusedError', async () => {
      installFakeCollection(pm);
      await expect(
        pm.save(Collections.Chattel, { chattelId: 'c1' })
      ).rejects.toThrow(SandboxWriteRefusedError);
      await expect(
        pm.save(Collections.Parcels, { extent: '/x' })
      ).rejects.toThrow(SandboxWriteRefusedError);
    });

    it('SHADOW(skip): no-ops the terminal write, returns a receipt id', async () => {
      const state = installFakeCollection(pm);
      const id = await pm.save(Collections.BankAccounts, {
        accountId: 'a1',
      });
      expect(id).toBeTruthy();
      expect(state.inserts).toEqual([]);
      expect(state.upserts).toEqual([]);
    });

    it('an unclassified collection fails closed', async () => {
      installFakeCollection(pm);
      await expect(pm.save('mystery_rows', { x: 1 })).rejects.toThrow(
        SandboxWriteRefusedError
      );
    });
  });

  describe('scoped reads', () => {
    beforeEach(() => {
      pm.setScopeResolver(() => SCOPE);
    });

    it('STAMP reads compose global ∪ own-scope', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.BankLedger, { kind: 'transfer' });
      expect(state.findFilters).toEqual([
        {
          kind: 'transfer',
          $or: [
            { circleScope: { $exists: false } },
            { circleScope: SCOPE },
          ],
        },
      ]);
    });

    it('SHADOW reads stay field-side (caches are field truth)', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.BankAccounts, { accountId: 'a' });
      expect(state.findFilters).toEqual([
        { accountId: 'a', circleScope: { $exists: false } },
      ]);
    });

    it('PASS reads still get zero injection', async () => {
      const state = installFakeCollection(pm);
      await pm.find(Collections.Beliefs, { viewerId: 'v' });
      expect(state.findFilters).toEqual([{ viewerId: 'v' }]);
    });

    it('findById composes the same predicate', async () => {
      const state = installFakeCollection(pm);
      await pm.findById(Collections.Transcripts, '0'.repeat(24));
      expect(state.findOneFilters).toHaveLength(1);
      const filter = state.findOneFilters[0] as Record<string, unknown>;
      expect(filter.$or).toEqual([
        { circleScope: { $exists: false } },
        { circleScope: SCOPE },
      ]);
    });
  });

  describe('scoped deletes', () => {
    it('per-id delete on STAMP composes the own-scope guard', async () => {
      pm.setScopeResolver(() => SCOPE);
      const state = installFakeCollection(pm);
      await pm.delete(Collections.RenownEvents, '0'.repeat(24));
      expect(state.deletes).toHaveLength(1);
      expect(
        (state.deletes[0] as Record<string, unknown>).circleScope
      ).toBe(SCOPE);
    });

    it('REFUSE delete throws; SHADOW delete no-ops', async () => {
      pm.setScopeResolver(() => SCOPE);
      const state = installFakeCollection(pm);
      await expect(
        pm.delete(Collections.Parcels, '0'.repeat(24))
      ).rejects.toThrow(SandboxWriteRefusedError);
      await pm.delete(Collections.Renown, '0'.repeat(24));
      expect(state.deletes).toEqual([]);
    });

    it('scoped deleteMany on STAMP composes its own scope', async () => {
      pm.setScopeResolver(() => SCOPE);
      const state = installFakeCollection(pm);
      await pm.deleteMany(Collections.Transcripts, { owner: 'x' });
      expect(state.bulkDeletes).toEqual([
        { owner: 'x', circleScope: SCOPE },
      ]);
    });

    it('field-context discard passes its explicit scope filter through', async () => {
      const state = installFakeCollection(pm);
      const n = await pm.deleteMany(Collections.BankLedger, {
        circleScope: SCOPE,
      });
      expect(n).toBe(2);
      expect(state.bulkDeletes).toEqual([{ circleScope: SCOPE }]);
    });
  });

/*
 * ⚠⚠ The declared-but-unbuilt mode. No collection selects
 * `{ verb: 'shadow', mode: 'overlay' }`, so the only way to pin the
 * refusal is to select it — which is the point: the defect was that
 * nothing could ever have noticed. Until 2026-09-30 every one of these
 * three assertions would have found a REAL WRITE instead of a throw.
 *
 * ⭐ This is the test that outlives the fix. When overlay is built the
 * throws go, and this block is what tells whoever removes them exactly
 * which three call sites have to start doing something instead.
 */
describe('SHADOW(overlay) — declared, unbuilt, and refused at all three write paths', () => {
  // A cache collection whose real policy is shadow/skip; we flip the
  // mode for the duration and put it back.
  const VICTIM = Collections.BankAccounts;
  let original: unknown;

  beforeEach(() => {
    pm.setScopeResolver(() => SCOPE);
    const table = COLLECTION_POLICIES as unknown as Record<string, unknown>;
    original = table[VICTIM];
    table[VICTIM] = { verb: 'shadow', mode: 'overlay' };
  });

  afterEach(() => {
    const table = COLLECTION_POLICIES as unknown as Record<string, unknown>;
    table[VICTIM] = original;
  });

  it('save refuses instead of writing an unstamped field row', async () => {
    const state = installFakeCollection(pm);
    await expect(pm.save(VICTIM, { accountId: 'a1' })).rejects.toThrow(
      SandboxOverlayUnimplementedError
    );
    expect(state.inserts).toEqual([]);
    expect(state.upserts).toEqual([]);
  });

  it('delete refuses instead of deleting a real row', async () => {
    const state = installFakeCollection(pm);
    await expect(pm.delete(VICTIM, '0'.repeat(24))).rejects.toThrow(
      SandboxOverlayUnimplementedError
    );
    expect(state.deletes).toEqual([]);
  });

  it("deleteMany refuses instead of bulk-deleting on the caller's unscoped filter", async () => {
    const state = installFakeCollection(pm);
    await expect(pm.deleteMany(VICTIM, { accountId: 'a1' })).rejects.toThrow(
      SandboxOverlayUnimplementedError
    );
    expect(state.bulkDeletes).toEqual([]);
  });

  it('and it is NOT a SandboxWriteRefusedError — the engine is at fault, not the collection', async () => {
    installFakeCollection(pm);
    await expect(pm.save(VICTIM, { accountId: 'a1' })).rejects.not.toThrow(
      SandboxWriteRefusedError
    );
  });

  it('a FIELD context is untouched — the refusal is circle-scoped only', async () => {
    pm.setScopeResolver(() => null);
    const state = installFakeCollection(pm);
    await pm.save(VICTIM, { accountId: 'a1' });
    expect(state.inserts).toEqual([{ accountId: 'a1' }]);
  });
});
});
