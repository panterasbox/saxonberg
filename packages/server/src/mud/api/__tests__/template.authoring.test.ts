/**
 * TemplateApi.saveTemplate → authorship ledger (commit 4). Covers:
 *   - a save WITH an author appends exactly one AuthoringEvent for the path,
 *     attributed to the passed (authenticated) author;
 *   - the author is NOT spoofable from the `data` blob — a `data.author`
 *     field is ignored; the ledger records the threaded param only;
 *   - a save WITHOUT an author records nothing (programmatic / system saves);
 *   - `authorOf(path)` then derives that author.
 *
 * Mongo is faked with a COLLECTION-AWARE store so the domain +
 * authoring_events writes don't bleed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateApi } from '../template';
import { ProvenanceApi } from '../provenance';
import { WorldClockApi } from '../worldclock';
import { StuffApi } from '../stuff';
import {
  Collections,
  PersistenceManager,
} from '../../../backend/PersistenceManager';

let stores: Map<string, Record<string, unknown>[]>;
let nextId = 1;

function col(name: string): Record<string, unknown>[] {
  let a = stores.get(name);
  if (!a) {
    a = [];
    stores.set(name, a);
  }
  return a;
}

const LEAF = '/lib/location/CartesianLocation';
const PATH = '/domain/gallery/mural';
const ALICE = '/obj/Avatar/alice';

beforeEach(() => {
  stores = new Map();
  nextId = 1;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      col(c).filter((d) =>
        Object.entries(q).every(([k, v]) =>
          typeof v === 'string' ? d[k] === v : true
        )
      ) as never
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? String(nextId++);
      const arr = col(c);
      const idx = arr.findIndex((d) => d._id === id);
      const copy = { ...doc, _id: id };
      if (idx >= 0) arr[idx] = copy;
      else arr.push(copy);
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

describe('TemplateApi.saveTemplate authorship ledger', () => {
  it('appends one AuthoringEvent attributed to the authenticated author', async () => {
    await TemplateApi.saveTemplate(PATH, LEAF, {}, undefined, ALICE);

    const ledger = col(Collections.AuthoringEvents);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]!.path).toBe(PATH);
    expect(ledger[0]!.author).toBe(ALICE);
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE);
  });

  it('does NOT read the author from the client-controlled data blob', async () => {
    // A malicious payload tries to claim a different author via `data`.
    await TemplateApi.saveTemplate(
      PATH,
      LEAF,
      { author: '/obj/Avatar/impostor', createdByPlayerId: 'evil' },
      undefined,
      ALICE
    );
    expect(await ProvenanceApi.authorOf(PATH)).toBe(ALICE); // threaded param wins
  });

  it('records nothing when no author is supplied (programmatic save)', async () => {
    await TemplateApi.saveTemplate(PATH, LEAF, {});
    expect(col(Collections.AuthoringEvents)).toHaveLength(0);
    expect(await ProvenanceApi.authorOf(PATH)).toBeNull();
  });
});
