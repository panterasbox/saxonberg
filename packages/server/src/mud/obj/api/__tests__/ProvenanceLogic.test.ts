/**
 * ProvenanceLogic — the authorship ledger. Covers the read derivation
 * (`authorOf` = the EARLIEST row; append-only so a later save by another
 * player never changes it) and the **write lockdown**: `recordAuthoring`
 * is gated to the template save chokepoint, so a direct call from anywhere
 * else throws. The write+attribution path (author derived from the
 * execution context) is covered end-to-end in `template.authoring.test.ts`.
 *
 * Rows are seeded DIRECTLY (the reader is ungated); Mongo is faked.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProvenanceApi } from '../../../api/provenance';
import AuthoringEvent from '../../../lib/standing/AuthoringEvent';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { PersistenceManager } from '../../../../backend/PersistenceManager';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/** Seed one authoring row directly (bypassing the gated writer). */
async function seed(path: string, author: string, realAt: number): Promise<void> {
  const ev = new AuthoringEvent();
  ev.path = path;
  ev.author = author;
  ev.at = 1;
  ev.realAt = realAt;
  await ev.save();
}

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

describe('ProvenanceLogic.authorOf (derivation)', () => {
  it('derives the EARLIEST author — a later save by another player does not change it', async () => {
    await seed(PATH, ALICE, 1000);
    await seed(PATH, BOB, 2000);
    expect(await ProvenanceApi.eventsFor(PATH)).toHaveLength(2); // append-only
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('is order-independent — earliest is by realAt, not insertion order', async () => {
    await seed(PATH, BOB, 2000);
    await seed(PATH, ALICE, 1000); // earlier wall-clock, inserted second
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('returns null for an unauthored path', async () => {
    expect(await ProvenanceApi.authorOf('/obj/Engine/thing')).toBeNull();
  });
});

describe('ProvenanceLogic.recordAuthoring (write lockdown)', () => {
  it('refuses a direct call from outside the template save chokepoint', async () => {
    // The test module is not `mud/obj/api/TemplateLogic`, so the FromModule
    // gate denies the write — only the save chokepoint may append provenance.
    let threw = false;
    try {
      await ProvenanceApi.recordAuthoring({ path: PATH });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    // Nothing was written.
    expect(await ProvenanceApi.eventsFor(PATH)).toHaveLength(0);
  });
});
