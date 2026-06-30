/**
 * BulletinBoard — the singleton that warms the news-ticker window from the
 * `bulletins` collection and owns the server-side window semantics. Covers:
 * pins-first then recency ordering; the pin cap (`bulletin.maxPins`); expiry
 * exclusion; soft-retract (the row is kept in the cache but excluded from the
 * window); the window-length cap (`bulletin.tickerWindow`).
 *
 * Mongo is faked with an in-memory collection; AppSettings is warmed with
 * small caps so the ordering/limit math is deterministic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BulletinBoard from '../BulletinBoard';
import { Bulletin } from '../../lib/bulletin/Bulletin';
import { AppSettings } from '../../lib/config/AppSettings';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

// Small caps so ordering/limit assertions are deterministic.
const SETTINGS: Record<string, string> = {
  'bulletin.tickerWindow': '3',
  'bulletin.maxPins': '2',
};

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/** Seed a bulletin row straight into the fake collection. */
function seed(fields: Partial<Bulletin>): void {
  const b = new Bulletin();
  Object.assign(b, fields);
  const id = `id-${idCounter++}`;
  store.set(id, {
    bulletinId: b.bulletinId,
    realm: b.realm,
    kind: b.kind,
    headline: b.headline,
    body: b.body,
    author: b.author,
    publishedAt: b.publishedAt,
    expiresAt: b.expiresAt,
    pinned: b.pinned,
    retracted: b.retracted,
    _id: id,
  });
}

async function warmBoard(): Promise<BulletinBoard> {
  const board = makeStuffAtPath(
    () => new BulletinBoard(),
    '/obj/BulletinBoard'
  );
  await board.postRegister();
  return board;
}

beforeEach(async () => {
  store = new Map();
  idCounter = 0;
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'app_settings') {
        return [{ values: SETTINGS }] as never;
      }
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never;
    }
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  await AppSettings.warm();
});

afterEach(() => {
  AppSettings._resetForTesting();
  vi.restoreAllMocks();
});

describe('BulletinBoard', () => {
  it('warms the window from the bulletins collection', async () => {
    seed({ bulletinId: 'a', headline: 'a', publishedAt: 10 });
    seed({ bulletinId: 'b', headline: 'b', publishedAt: 20 });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getBulletinId()).sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('orders pins first, then the rest by recency', async () => {
    seed({ bulletinId: 'old', headline: 'old', publishedAt: 10 });
    seed({ bulletinId: 'new', headline: 'new', publishedAt: 30 });
    seed({ bulletinId: 'pin', headline: 'pin', publishedAt: 20, pinned: true });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getBulletinId())).toEqual([
      'pin', // pinned first despite being older than `new`
      'new',
      'old',
    ]);
  });

  it('caps the pin block at bulletin.maxPins', async () => {
    seed({ bulletinId: 'p1', headline: 'p1', publishedAt: 10, pinned: true });
    seed({ bulletinId: 'p2', headline: 'p2', publishedAt: 20, pinned: true });
    seed({ bulletinId: 'p3', headline: 'p3', publishedAt: 30, pinned: true });
    const board = await warmBoard();
    const ids = board.recentWindow().map((x) => x.getBulletinId());
    // maxPins = 2: only the two most-recent pins survive; p1 is dropped.
    expect(ids).toEqual(['p3', 'p2']);
    expect(ids).not.toContain('p1');
  });

  it('excludes expired bulletins from the window', async () => {
    seed({ bulletinId: 'live', headline: 'live', publishedAt: 10 });
    seed({
      bulletinId: 'gone',
      headline: 'gone',
      publishedAt: 20,
      expiresAt: 1, // expired long ago
    });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getBulletinId())).toEqual([
      'live',
    ]);
  });

  it('soft-retract: the row stays cached but leaves the window', async () => {
    seed({ bulletinId: 'r', headline: 'r', publishedAt: 10, retracted: true });
    seed({ bulletinId: 'k', headline: 'k', publishedAt: 20 });
    const board = await warmBoard();
    // Excluded from the window...
    expect(board.recentWindow().map((x) => x.getBulletinId())).toEqual(['k']);
    // ...but still present in the cache (not hard-deleted).
    expect(board.getBulletin('r')?.isRetracted()).toBe(true);
  });

  it('caps the whole window at bulletin.tickerWindow', async () => {
    for (let i = 0; i < 5; i++) {
      seed({ bulletinId: `n${i}`, headline: `n${i}`, publishedAt: i * 10 });
    }
    const board = await warmBoard();
    const ids = board.recentWindow().map((x) => x.getBulletinId());
    // tickerWindow = 3: the three most-recent survive.
    expect(ids).toEqual(['n4', 'n3', 'n2']);
  });

  it('upsert inserts and replaces by id', async () => {
    const board = await warmBoard();
    const a1 = new Bulletin();
    a1.bulletinId = 'u';
    a1.headline = 'first';
    a1.publishedAt = 10;
    board.upsert(a1);
    expect(board.getBulletin('u')?.getHeadline()).toBe('first');

    const a2 = new Bulletin();
    a2.bulletinId = 'u';
    a2.headline = 'second';
    a2.publishedAt = 20;
    board.upsert(a2);
    expect(board.getBulletin('u')?.getHeadline()).toBe('second');
    expect(board.recentWindow()).toHaveLength(1);
  });
});
