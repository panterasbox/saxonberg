/**
 * PressApi / PressLogic — the gated write/read surface over the **document
 * tree** + the warm {@link PressBoard} window. Covers: `publish` derives
 * the author from the execution context (never caller-supplied) and fails
 * closed when there is no acting author; `archive` filters by realm/kind,
 * pages by `before`/`limit`, and excludes retracted rows in recency-desc
 * order.
 *
 * ⚠ The store moved out of a `bulletins` collection and into
 * `kind: 'release'` documents under the publisher's feed branch; the
 * assertions below are unchanged, because the semantics are. What changed
 * is the fixture, and that `publish` now names a publisher (the document
 * has to have an owner and a place, and the engine does not guess which).
 *
 * Mongo is faked with an in-memory collection (the chronicle/renown harness).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PressApi } from '../../../api/press';
import {
  Release,
  RELEASE_DOCUMENT_KIND,
  type ReleaseData,
} from '../../../lib/press/Release';
import { DocumentApi } from '../../../api/document';
import PressBoard from '../../PressBoard';
import OrganizationEntity from '../../Organization';
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

const PUBLISHER = '/compact/press';
const FEED = '/compact/press/feed';

/** Plain equality matching — the archive filters in JS over the tree now. */
function matches(
  doc: Record<string, unknown>,
  query: Record<string, unknown>
): boolean {
  return Object.entries(query).every(([k, v]) => doc[k] === v);
}

/** Seed a release DOCUMENT straight into the fake `documents` collection. */
function seed(fields: Partial<ReleaseData>): void {
  const data: ReleaseData = {
    releaseId: '',
    realm: 'ooc',
    kind: 'notice',
    headline: '',
    body: '',
    author: '',
    publishedAt: 0,
    expiresAt: 0,
    pinned: false,
    retracted: false,
    ...fields,
  };
  const id = `id-${idCounter++}`;
  store.set(id, {
    path: `${FEED}/${data.releaseId}`,
    owner: PUBLISHER,
    kind: RELEASE_DOCUMENT_KIND,
    data,
    _id: id,
  });
}

/** The publisher every fixture release goes out under. */
function installPublisher(): void {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
  org.realm = 'ooc';
  org.visibility = 'public';
  org.feedPath = FEED;
  org.publishingPositions = [];
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
  void makeStuffAtPath(() => new PressBoard(), '/obj/PressBoard');
  installPublisher();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PressApi.publish (actor from context)', () => {
  it('derives the author from the execution context, not the request', async () => {
    const author = makeStuffAtPath(
      () => new TestAuthor(),
      '/obj/Avatar/p1'
    );
    const b = await publishAs(author, () =>
      PressApi.publish({
        publisher: PUBLISHER,
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
    expect(b.getReleaseId().length).toBeGreaterThan(0);
    expect(typeof b.getPublishedAt()).toBe('number');

    // Persisted as a release document under the publisher's feed, OWNED
    // BY THE PUBLISHER rather than by the person who wrote it; and the
    // warm window now carries it.
    const docs = await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND);
    const found = docs
      .map((d) => Release.fromDocument(d))
      .filter((r) => r.getReleaseId() === b.getReleaseId());
    expect(found).toHaveLength(1);
    expect(found[0]!.getAuthor()).toBe('/obj/Avatar/p1');
    expect(found[0]!.getOwner()).toBe(PUBLISHER);
    expect(found[0]!.getPath()).toBe(`${FEED}/${b.getReleaseId()}`);
    expect(PressApi.recent().map((x) => x.getReleaseId())).toContain(
      b.getReleaseId()
    );
  });

  it('defaults realm/kind when omitted', async () => {
    const author = makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/p2');
    const b = await publishAs(author, () =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'hi' })
    );
    expect(b.getRealm()).toBe('ooc');
    expect(b.getKind()).toBe('notice');
  });

  it('fails closed when there is no acting author', async () => {
    await expect(
      PressApi.publish({ publisher: PUBLISHER, headline: 'orphan' })
    ).rejects.toThrow(/no acting author/i);
    // Nothing persisted.
    expect(store.size).toBe(0);
  });
});

describe('PressApi.archive (filter + page)', () => {
  beforeEach(() => {
    seed({ releaseId: 'a', realm: 'ooc', kind: 'notice', publishedAt: 10 });
    seed({ releaseId: 'b', realm: 'world', kind: 'event', publishedAt: 20 });
    seed({ releaseId: 'c', realm: 'ooc', kind: 'changelog', publishedAt: 30 });
    seed({ releaseId: 'd', realm: 'world', kind: 'event', publishedAt: 40 });
    // A retracted row must never surface.
    seed({
      releaseId: 'gone',
      realm: 'world',
      kind: 'event',
      publishedAt: 50,
      retracted: true,
    });
  });

  it('orders recency-desc and excludes retracted rows', async () => {
    const rows = await PressApi.archive({});
    expect(rows.map((r) => r.getReleaseId())).toEqual(['d', 'c', 'b', 'a']);
  });

  it('filters by realm', async () => {
    const rows = await PressApi.archive({ realm: 'world' });
    expect(rows.map((r) => r.getReleaseId())).toEqual(['d', 'b']);
  });

  it('filters by kind', async () => {
    const rows = await PressApi.archive({ kind: 'event' });
    expect(rows.map((r) => r.getReleaseId())).toEqual(['d', 'b']);
  });

  it('pages by the before cursor', async () => {
    const rows = await PressApi.archive({ before: 30 });
    expect(rows.map((r) => r.getReleaseId())).toEqual(['b', 'a']);
  });

  it('pages by limit', async () => {
    const rows = await PressApi.archive({ limit: 2 });
    expect(rows.map((r) => r.getReleaseId())).toEqual(['d', 'c']);
  });
});
