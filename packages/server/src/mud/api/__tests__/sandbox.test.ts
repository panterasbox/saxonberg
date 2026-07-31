/**
 * SandboxApi skeleton (Wave 1): session registry lifecycle, scoped-row
 * discard (only its own scope), and the orphan sweeper. PM is faked at
 * the collection layer (the PersistenceManager.hooks.test.ts pattern).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SandboxApi } from '../sandbox';
import { StuffApi } from '../stuff';
import {
  PersistenceManager,
  Collections,
} from '../../../backend/PersistenceManager';

const SCOPE_A = '/home/player-a';
const SCOPE_B = '/home/player-b';

interface FakeRow {
  circleScope?: string;
  [k: string]: unknown;
}

/** A tiny in-memory store honoring the filters the sandbox paths use. */
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
  const matches = (row: FakeRow, filter: Record<string, unknown>): boolean => {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '$or') continue;
      if (v !== null && typeof v === 'object' && '$exists' in (v as object)) {
        const wants = (v as { $exists: boolean }).$exists;
        if ((k in row) !== wants) return false;
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
      deleteMany: async (filter: Record<string, unknown>) => {
        const rows = rowsFor(name);
        const keep = rows.filter((r) => !matches(r, filter));
        const deleted = rows.length - keep.length;
        store.set(name, keep);
        return { deletedCount: deleted };
      },
      find: (filter: Record<string, unknown>) => {
        const result = rowsFor(name).filter((r) => matches(r, filter));
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

describe('SandboxApi (Wave 1 skeleton)', () => {
  let pm: PersistenceManager;
  let store: Map<string, FakeRow[]>;

  beforeEach(() => {
    StuffApi.clearAll();
    pm = PersistenceManager.get();
    store = installFakeStore(pm);
  });

  afterEach(async () => {
    // Close any sessions the test opened so state never leaks across tests.
    for (const scope of [SCOPE_A, SCOPE_B]) {
      await SandboxApi.closeSession(scope);
    }
    vi.restoreAllMocks();
  });

  describe('session registry', () => {
    it('opens idempotently per scope, with a minted session id', () => {
      const s1 = SandboxApi.openSession(SCOPE_A, SCOPE_A, 'player-a');
      const s2 = SandboxApi.openSession(SCOPE_A, SCOPE_A, 'player-a');
      expect(s1.id).toBeTruthy();
      expect(s2).toBe(s1);
      expect(SandboxApi.sessionForScope(SCOPE_A)).toBe(s1);
      const other = SandboxApi.openSession(SCOPE_B, SCOPE_B, 'player-b');
      expect(other.id).not.toBe(s1.id);
    });

    it('closeSession discards and drops the registry entry', async () => {
      SandboxApi.openSession(SCOPE_A, SCOPE_A, 'player-a');
      await SandboxApi.closeSession(SCOPE_A);
      expect(SandboxApi.sessionForScope(SCOPE_A)).toBeNull();
    });
  });

  describe('discardScope', () => {
    it('deletes only its own scope, on every STAMP collection', async () => {
      store.set(Collections.BankLedger, [
        { kind: 'transfer' },
        { kind: 'transfer', circleScope: SCOPE_A },
        { kind: 'transfer', circleScope: SCOPE_B },
      ]);
      store.set(Collections.Transcripts, [
        { owner: 'x', circleScope: SCOPE_A },
      ]);

      await SandboxApi.discardScope(SCOPE_A);

      expect(store.get(Collections.BankLedger)).toEqual([
        { kind: 'transfer' },
        { kind: 'transfer', circleScope: SCOPE_B },
      ]);
      expect(store.get(Collections.Transcripts)).toEqual([]);
    });
  });

  describe('the orphan sweeper', () => {
    it('discards scoped rows for scopes with no live session', async () => {
      store.set(Collections.RenownEvents, [
        { subject: 's' },
        { subject: 's', circleScope: SCOPE_A },
        { subject: 's', circleScope: SCOPE_B },
      ]);
      // B has a live session; A is an orphan (crashed prior session).
      SandboxApi.openSession(SCOPE_B, SCOPE_B, 'player-b');

      const swept = await SandboxApi.sweepNow();

      expect(swept).toEqual([SCOPE_A]);
      expect(store.get(Collections.RenownEvents)).toEqual([
        { subject: 's' },
        { subject: 's', circleScope: SCOPE_B },
      ]);
    });

    it('with no sessions, every scoped row is an orphan', async () => {
      store.set(Collections.DispositionEvents, [
        { owner: 'x', circleScope: SCOPE_A },
      ]);
      const swept = await SandboxApi.sweepNow();
      expect(swept).toEqual([SCOPE_A]);
      expect(store.get(Collections.DispositionEvents)).toEqual([]);
    });
  });
});
