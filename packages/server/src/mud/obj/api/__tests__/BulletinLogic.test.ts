/**
 * BulletinApi / BulletinLogic — the gated write/read surface over the
 * `bulletins` collection + the warm {@link BulletinBoard} window. Covers:
 * `publish` derives the author from the execution context (never
 * caller-supplied) and fails closed when there is no acting author;
 * `archive` filters by realm/kind, pages by `before`/`limit`, and excludes
 * retracted rows in recency-desc order.
 *
 * Mongo is faked with an in-memory collection (the chronicle/renown harness),
 * with `$lt` support for the archive `before` cursor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BulletinApi } from '../../../api/bulletin';
import { Bulletin } from '../../../lib/bulletin/Bulletin';
import BulletinBoard from '../../BulletinBoard';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ExecutionContextApi } from '../../../api/execution-context';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import {
  makeStuffAtPath,
} from '../../../lib/security/__tests__/test-setup';

class TestAuthor extends Idea {
  static _mixinName = 'TestAuthor';
}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

/** Equality + `$lt` query matcher mirroring the Mongo subset archive uses. */
function matches(
  doc: Record<string, unknown>,
  query: Record<string, unknown>
): boolean {
  return Object.entries(query).every(([k, v]) => {
    if (v && typeof v === 'object' && '$lt' in (v as object)) {
      return (doc[k] as number) < (v as { $lt: number }).$lt;
    }
    return doc[k] === v;
  });
}

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

/** Run `fn` with `principal` stamped as the acting author (the giver). */
async function publishAs<T>(
  principal: unknown | null,
  fn: () => Promise<T>
): Promise<T> {
  return ExecutionContextApi.runRoot(null, 'test', () => {
    if (principal) ExecutionContextApi.tagActingAuthor(principal);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  StuffApi.clearAll();
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'app_settings') return [] as never;
      return [...store.values()].filter((d) => matches(d, query)) as never;
    }
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  // A warm (empty) board so publish's upsert + recent resolve.
  void makeStuffAtPath(() => new BulletinBoard(), '/obj/BulletinBoard');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BulletinApi.publish (actor from context)', () => {
  it('derives the author from the execution context, not the request', async () => {
    const author = makeStuffAtPath(
      () => new TestAuthor(),
      '/obj/Avatar/p1'
    );
    const b = await publishAs(author, () =>
      BulletinApi.publish({
        headline: 'Server up',
        body: 'patch notes',
        realm: 'ooc',
        kind: 'changelog',
      })
    );
    // Author is the context principal's durable templatePath.
    expect(b.getAuthor()).toBe('/obj/Avatar/p1');
    expect(b.getRealm()).toBe('ooc');
    expect(b.getKind()).toBe('changelog');
    expect(b.getHeadline()).toBe('Server up');
    expect(b.getBulletinId().length).toBeGreaterThan(0);
    expect(typeof b.getPublishedAt()).toBe('number');

    // Persisted under its id; and the warm window now carries it.
    const found = await Bulletin.find<Bulletin>({
      bulletinId: b.getBulletinId(),
    });
    expect(found).toHaveLength(1);
    expect(found[0]!.getAuthor()).toBe('/obj/Avatar/p1');
    expect(BulletinApi.recent().map((x) => x.getBulletinId())).toContain(
      b.getBulletinId()
    );
  });

  it('defaults realm/kind when omitted', async () => {
    const author = makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/p2');
    const b = await publishAs(author, () =>
      BulletinApi.publish({ headline: 'hi' })
    );
    expect(b.getRealm()).toBe('ooc');
    expect(b.getKind()).toBe('notice');
  });

  it('fails closed when there is no acting author', async () => {
    await expect(
      BulletinApi.publish({ headline: 'orphan' })
    ).rejects.toThrow(/no acting author/i);
    // Nothing persisted.
    expect(store.size).toBe(0);
  });
});

describe('BulletinApi.archive (filter + page)', () => {
  beforeEach(() => {
    seed({ bulletinId: 'a', realm: 'ooc', kind: 'notice', publishedAt: 10 });
    seed({ bulletinId: 'b', realm: 'world', kind: 'event', publishedAt: 20 });
    seed({ bulletinId: 'c', realm: 'ooc', kind: 'changelog', publishedAt: 30 });
    seed({ bulletinId: 'd', realm: 'world', kind: 'event', publishedAt: 40 });
    // A retracted row must never surface.
    seed({
      bulletinId: 'gone',
      realm: 'world',
      kind: 'event',
      publishedAt: 50,
      retracted: true,
    });
  });

  it('orders recency-desc and excludes retracted rows', async () => {
    const rows = await BulletinApi.archive({});
    expect(rows.map((r) => r.getBulletinId())).toEqual(['d', 'c', 'b', 'a']);
  });

  it('filters by realm', async () => {
    const rows = await BulletinApi.archive({ realm: 'world' });
    expect(rows.map((r) => r.getBulletinId())).toEqual(['d', 'b']);
  });

  it('filters by kind', async () => {
    const rows = await BulletinApi.archive({ kind: 'event' });
    expect(rows.map((r) => r.getBulletinId())).toEqual(['d', 'b']);
  });

  it('pages by the before cursor', async () => {
    const rows = await BulletinApi.archive({ before: 30 });
    expect(rows.map((r) => r.getBulletinId())).toEqual(['b', 'a']);
  });

  it('pages by limit', async () => {
    const rows = await BulletinApi.archive({ limit: 2 });
    expect(rows.map((r) => r.getBulletinId())).toEqual(['d', 'c']);
  });
});
