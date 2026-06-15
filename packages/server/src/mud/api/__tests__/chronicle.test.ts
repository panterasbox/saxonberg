/**
 * ChronicleApi — the gated mint/read surface over the append-only
 * ledger. Covers: plain `record` always appends; `recordOnce` is
 * category-first idempotent (and owner-scoped); `recordDeed` renders
 * `text` via ProseApi and stamps `when` from the game-clock; `tags`/`who`
 * round-trip via the owner-scoped `entriesFor`; disconnected / keyless
 * owners no-op.
 *
 * Mongo is faked with an in-memory collection (the belief-store harness):
 * we stub PM's friendly surface (find / save / delete) — the same wrapper
 * methods `ChronicleEntry` uses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChronicleApi } from '../chronicle';
import { Idea } from '../../lib/stuff/Idea';
import { WorldClockApi } from '../worldclock';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

function makeOwnerAt(): Idea {
  return makeStuffAtPath(() => new Idea(), `/obj/Avatar/p${counter++}`);
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

describe('ChronicleApi mint + read', () => {
  it('record always appends — twice yields two entries', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.record(owner, { kind: 'deed', text: 'one' });
    await ChronicleApi.record(owner, { kind: 'deed', text: 'two' });
    const entries = await ChronicleApi.entriesFor(owner);
    expect(entries).toHaveLength(2);
  });

  it('recordOnce is category-first idempotent per owner', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.recordOnce(owner, 'k', { kind: 'deed', text: 'first' });
    await ChronicleApi.recordOnce(owner, 'k', { kind: 'deed', text: 'second' });
    const entries = await ChronicleApi.entriesFor(owner);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.text).toBe('first');
    expect(entries[0]!.key).toBe('k');
  });

  it('recordOnce is owner-scoped — same key, different owner, two entries', async () => {
    const a = makeOwnerAt();
    const b = makeOwnerAt();
    await ChronicleApi.recordOnce(a, 'shared', { kind: 'deed', text: 'a' });
    await ChronicleApi.recordOnce(b, 'shared', { kind: 'deed', text: 'b' });
    expect(await ChronicleApi.entriesFor(a)).toHaveLength(1);
    expect(await ChronicleApi.entriesFor(b)).toHaveLength(1);
  });

  it('recordDeed renders text via ProseApi and stamps when from the clock', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.recordDeed(owner, {
      template: 'Arrived in {{ place }}.',
      vars: { place: 'the lounge' },
      tags: ['arrival'],
    });
    const [entry] = await ChronicleApi.entriesFor(owner);
    expect(entry!.kind).toBe('deed');
    expect(entry!.text).toContain('Arrived in the lounge.');
    expect(entry!.when).toBe(WorldClockApi.getNow().rawValue());
    expect(typeof entry!.when).toBe('number');
  });

  it('recordDeed honors an explicit when over the clock default', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.recordDeed(owner, { text: 'fixed', when: 500 });
    const [entry] = await ChronicleApi.entriesFor(owner);
    expect(entry!.when).toBe(500);
  });

  it('persists tags/who and retrieves them owner-scoped', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.record(owner, {
      kind: 'deed',
      text: 'met someone',
      tags: ['social'],
      who: ['/obj/npc/mara'],
    });
    const [entry] = await ChronicleApi.entriesFor(owner);
    expect(entry!.tags).toEqual(['social']);
    expect(entry!.who).toEqual(['/obj/npc/mara']);
  });

  it('seedClaims mints kind=claim entries with order and null when', async () => {
    const owner = makeOwnerAt();
    await ChronicleApi.seedClaims(owner, [
      { text: 'born somewhere', order: 1 },
      { text: 'came here', order: 2 },
    ]);
    const entries = await ChronicleApi.entriesFor(owner);
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.kind).toBe('claim');
      expect(e.when).toBeNull();
      expect(typeof e.order).toBe('number');
    }
  });

  it('no-ops without a durable owner key', async () => {
    // An owner with no templatePath (registered, but never path-stamped).
    const keyless = makeStuff(() => new Idea());
    await ChronicleApi.record(keyless, { kind: 'deed', text: 'lost' });
    expect(store.size).toBe(0);
    expect(await ChronicleApi.entriesFor(keyless)).toEqual([]);
  });

  it('no-ops when disconnected', async () => {
    const owner = makeOwnerAt();
    vi.spyOn(PersistenceManager.get(), 'isConnected').mockReturnValue(false);
    await ChronicleApi.record(owner, { kind: 'deed', text: 'offline' });
    expect(store.size).toBe(0);
    expect(await ChronicleApi.entriesFor(owner)).toEqual([]);
  });
});
