/**
 * Bulletin persistence — a plain `Document` (one row per announcement) in
 * the `bulletins` collection, addressed on `bulletinId`. Covers: a saved
 * bulletin round-trips its fields (timestamps are epoch-ms numbers, not
 * Date); `find({ bulletinId })` returns it; the realm/kind vocabularies are
 * exactly the blessed words; the `isExpiredAt` / `isRetracted` predicates.
 *
 * Mongo is faked with an in-memory collection (the chronicle/renown harness).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Bulletin,
  BULLETIN_REALMS,
  BULLETIN_KINDS,
} from '../Bulletin';
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Bulletin', () => {
  it('round-trips its fields with epoch-ms numeric timestamps', async () => {
    const b = new Bulletin();
    b.bulletinId = 'bul-1';
    b.realm = 'world';
    b.kind = 'event';
    b.headline = 'The market opens';
    b.body = 'A long-form MML body.';
    b.author = '/obj/Avatar/p1';
    b.publishedAt = 1_700_000_000_000;
    b.expiresAt = 1_700_000_900_000;
    b.pinned = true;
    b.retracted = false;
    await b.save();

    const found = await Bulletin.find<Bulletin>({ bulletinId: 'bul-1' });
    expect(found).toHaveLength(1);
    const f = found[0]!;
    expect(f.getRealm()).toBe('world');
    expect(f.getKind()).toBe('event');
    expect(f.getHeadline()).toBe('The market opens');
    expect(f.getBody()).toBe('A long-form MML body.');
    expect(f.getAuthor()).toBe('/obj/Avatar/p1');
    expect(typeof f.getPublishedAt()).toBe('number');
    expect(f.getPublishedAt()).toBe(1_700_000_000_000);
    expect(f.getExpiresAt()).toBe(1_700_000_900_000);
    expect(f.isPinned()).toBe(true);
    expect(f.isRetracted()).toBe(false);
  });

  it('bulletinId is the address — other ids are excluded', async () => {
    const a = new Bulletin();
    a.bulletinId = 'a';
    a.headline = 'a';
    await a.save();
    const c = new Bulletin();
    c.bulletinId = 'c';
    c.headline = 'c';
    await c.save();

    const found = await Bulletin.find<Bulletin>({ bulletinId: 'a' });
    expect(found).toHaveLength(1);
    expect(found[0]!.getHeadline()).toBe('a');
  });

  it('defaults a fresh bulletin to ooc / notice / live', () => {
    const b = new Bulletin();
    expect(b.getRealm()).toBe('ooc');
    expect(b.getKind()).toBe('notice');
    expect(b.isPinned()).toBe(false);
    expect(b.isRetracted()).toBe(false);
    expect(b.getPublishedAt()).toBe(0);
    expect(b.getExpiresAt()).toBe(0);
  });

  it('exposes exactly the blessed realm/kind vocabularies', () => {
    expect([...BULLETIN_REALMS]).toEqual(['ooc', 'world']);
    expect([...BULLETIN_KINDS]).toEqual([
      'changelog',
      'decision',
      'event',
      'notice',
    ]);
  });

  it('isExpiredAt honors the 0 = never sentinel', () => {
    const never = new Bulletin();
    never.expiresAt = 0;
    expect(never.isExpiredAt(Date.now())).toBe(false);

    const expiring = new Bulletin();
    expiring.expiresAt = 1000;
    expect(expiring.isExpiredAt(999)).toBe(false);
    expect(expiring.isExpiredAt(1001)).toBe(true);
  });
});
