/**
 * The chronicle owner face ON PersonaMixin (retired ChronicleApi /
 * ChronicleLogic — the Api OO sweep). Covers: recordDeed/recordClaim
 * always append; `recordChronicleOnce` is category-first idempotent
 * (and owner-scoped); `recordDeed` renders `text` via ProseApi and
 * stamps `when` from the game-clock; `tags`/`who` round-trip via the
 * owner-scoped `chronicleEntries`; disconnected / keyless owners
 * no-op. The generic any-kind `record` did NOT survive the sweep —
 * every caller declares claim or deed.
 *
 * Mongo is faked with an in-memory collection (the belief-store harness):
 * we stub PM's friendly surface (find / save / delete) — the same wrapper
 * methods `ChronicleEntry` uses.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { PersonaMixin } from '../Persona';
import { WorldClockApi } from '../../../api/worldclock';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

class StoriedIdea extends PersonaMixin(Idea) {}

function makeOwnerAt(): StoriedIdea {
  return makeStuffAtPath(
    () => new StoriedIdea(),
    `/platform/agent/Avatar/p${counter++}`,
  );
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
  vi.spyOn(pm, 'delete').mockImplementation(async (_col: string, id: string) => {
    store.delete(id);
  });
  // Fixed game-clock so deed `when` stamps are deterministic.
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the chronicle owner face — mint + read', () => {
  it('record always appends — twice yields two entries', async () => {
    const owner = makeOwnerAt();
    await owner.recordDeed({ text: 'one' });
    await owner.recordDeed({ text: 'two' });
    const entries = await owner.chronicleEntries();
    expect(entries).toHaveLength(2);
  });

  it('recordOnce is category-first idempotent per owner', async () => {
    const owner = makeOwnerAt();
    await owner.recordChronicleOnce('k', { kind: 'deed', text: 'first' });
    await owner.recordChronicleOnce('k', { kind: 'deed', text: 'second' });
    const entries = await owner.chronicleEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.text).toBe('first');
    expect(entries[0]!.key).toBe('k');
  });

  it('recordOnce is owner-scoped — same key, different owner, two entries', async () => {
    const a = makeOwnerAt();
    const b = makeOwnerAt();
    await a.recordChronicleOnce('shared', { kind: 'deed', text: 'a' });
    await b.recordChronicleOnce('shared', { kind: 'deed', text: 'b' });
    expect(await a.chronicleEntries()).toHaveLength(1);
    expect(await b.chronicleEntries()).toHaveLength(1);
  });

  it('recordDeed renders text via ProseApi and stamps when from the clock', async () => {
    const owner = makeOwnerAt();
    await owner.recordDeed({
      template: 'Arrived in {{ place }}.',
      vars: { place: 'the lounge' },
      tags: ['arrival'],
    });
    const [entry] = await owner.chronicleEntries();
    expect(entry!.kind).toBe('deed');
    expect(entry!.text).toContain('Arrived in the lounge.');
    expect(entry!.when).toBe(WorldClockApi.getNow().rawValue());
    expect(typeof entry!.when).toBe('number');
  });

  it('recordDeed honors an explicit when over the clock default', async () => {
    const owner = makeOwnerAt();
    await owner.recordDeed({ text: 'fixed', when: 500 });
    const [entry] = await owner.chronicleEntries();
    expect(entry!.when).toBe(500);
  });

  it('persists tags/who and retrieves them owner-scoped', async () => {
    const owner = makeOwnerAt();
    await owner.recordDeed({
      text: 'met someone',
      tags: ['social'],
      who: ['/obj/npc/mara'],
    });
    const [entry] = await owner.chronicleEntries();
    expect(entry!.tags).toEqual(['social']);
    expect(entry!.who).toEqual(['/obj/npc/mara']);
  });

  it('seedClaims mints kind=claim entries with order and null when', async () => {
    const owner = makeOwnerAt();
    await owner.seedChronicleClaims([
      { text: 'born somewhere', order: 1 },
      { text: 'came here', order: 2 },
    ]);
    const entries = await owner.chronicleEntries();
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.kind).toBe('claim');
      expect(e.when).toBeNull();
      expect(typeof e.order).toBe('number');
    }
  });

  it('no-ops without a durable owner key', async () => {
    // An owner with no templatePath (registered, but never path-stamped).
    const keyless = makeStuff(() => new StoriedIdea());
    await keyless.recordDeed({ text: 'lost' });
    expect(store.size).toBe(0);
    expect(await keyless.chronicleEntries()).toEqual([]);
  });

  it('no-ops when disconnected', async () => {
    const owner = makeOwnerAt();
    vi.spyOn(PersistenceManager.get(), 'isConnected').mockReturnValue(false);
    await owner.recordDeed({ text: 'offline' });
    expect(store.size).toBe(0);
    expect(await owner.chronicleEntries()).toEqual([]);
  });
});
