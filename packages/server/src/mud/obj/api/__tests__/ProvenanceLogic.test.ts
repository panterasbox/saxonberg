/**
 * ProvenanceLogic — the authorship ledger. Covers: a recorded act appends
 * one row; `authorOf` derives the EARLIEST author (the original); a later
 * save by a different player does NOT change `authorOf` (append-only,
 * original-author derivation); a disconnected store is a no-op.
 *
 * Mongo is faked with the single-collection harness; the game-clock pinned.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProvenanceApi } from '../../../api/provenance';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
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
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

const PATH = '/domain/lounge/painting';
const ALICE = '/obj/Avatar/alice';
const BOB = '/obj/Avatar/bob';

describe('ProvenanceLogic authorship ledger', () => {
  it('records one row per authoring act and derives the author', async () => {
    await ProvenanceApi.recordAuthoring({
      path: PATH,
      author: ALICE,
      realAt: 1000,
    });
    expect(await ProvenanceApi.eventsFor(PATH)).toHaveLength(1);
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('derives the EARLIEST author — a later save by another player does not change it', async () => {
    await ProvenanceApi.recordAuthoring({
      path: PATH,
      author: ALICE,
      realAt: 1000,
    });
    await ProvenanceApi.recordAuthoring({
      path: PATH,
      author: BOB,
      realAt: 2000,
    });
    // Both rows retained (append-only); the original author wins.
    expect(await ProvenanceApi.eventsFor(PATH)).toHaveLength(2);
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('is order-independent — earliest is by realAt, not insertion order', async () => {
    await ProvenanceApi.recordAuthoring({
      path: PATH,
      author: BOB,
      realAt: 2000,
    });
    await ProvenanceApi.recordAuthoring({
      path: PATH,
      author: ALICE,
      realAt: 1000,
    }); // earlier wall-clock, inserted second
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('returns null for an unauthored path', async () => {
    expect(await ProvenanceApi.authorOf('/obj/Engine/thing')).toBeNull();
  });

  it('is a no-op when the store is disconnected', async () => {
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(false);
    await ProvenanceApi.recordAuthoring({ path: PATH, author: ALICE });
    expect(await ProvenanceApi.authorOf(PATH)).toBeNull();
  });
});
