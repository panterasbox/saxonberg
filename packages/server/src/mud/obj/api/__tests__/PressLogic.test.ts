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
// ⚠ A release's realm now DERIVES from its publisher, so a realm filter
// is a question about which masthead something went out under. The
// archive fixtures therefore need two publishers rather than a per-row
// realm field — which is the point: nobody can claim to speak in-fiction
// on an operator's feed.
const WORLD_PUBLISHER = '/compact/executive';
const WORLD_FEED = '/compact/executive/feed';

/** Plain equality matching — the archive filters in JS over the tree now. */
function matches(
  doc: Record<string, unknown>,
  query: Record<string, unknown>
): boolean {
  return Object.entries(query).every(([k, v]) => doc[k] === v);
}

/**
 * Seed a release DOCUMENT straight into the fake `documents` collection,
 * under the `ooc` publisher by default or the `world` one when asked.
 */
function seed(
  fields: Partial<ReleaseData>,
  realm: 'ooc' | 'world' = 'ooc',
): void {
  const data: ReleaseData = {
    releaseId: '',
    kind: 'notice',
    headline: '',
    body: '',
    author: '',
    publishedAt: 0,
    expiresAt: 0,
    pinned: false,
    retracted: false,
    visibility: null,
    source: '',
    ...fields,
  };
  const [owner, feed] =
    realm === 'world' ? [WORLD_PUBLISHER, WORLD_FEED] : [PUBLISHER, FEED];
  const id = `id-${idCounter++}`;
  store.set(id, {
    path: `${feed}/${data.releaseId}`,
    owner,
    kind: RELEASE_DOCUMENT_KIND,
    data,
    _id: id,
  });
}

/** The two publishers the fixture releases go out under. */
function installPublisher(): void {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
  org.realm = 'ooc';
  org.visibility = 'public';
  org.feedPath = FEED;
  org.publishingPositions = [];
  org.positions = [
    { key: 'communications-director', label: 'speaking', wageRate: 0, confers: [] },
  ];
  // ⚠ The publish path now checks `mayPublishAs` BEFORE minting anything,
  // so the acting author has to actually hold a publishing position. The
  // authored roster is the cheapest way to say so.
  org.rosterSlots = [
    { positionKey: 'communications-director', assignee: '/obj/Avatar/p1', schedule: [] },
    { positionKey: 'communications-director', assignee: '/obj/Avatar/p2', schedule: [] },
  ];

  const world = makeStuffAtPath(
    () => new OrganizationEntity(),
    WORLD_PUBLISHER,
  );
  world.realm = 'world';
  world.visibility = 'members';
  world.feedPath = WORLD_FEED;
  world.publishingPositions = [];
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
    seed({ releaseId: 'a', kind: 'notice', publishedAt: 10 }, 'ooc');
    seed({ releaseId: 'b', kind: 'event', publishedAt: 20 }, 'world');
    seed({ releaseId: 'c', kind: 'changelog', publishedAt: 30 }, 'ooc');
    seed({ releaseId: 'd', kind: 'event', publishedAt: 40 }, 'world');
    // A retracted row must never surface.
    seed(
      { releaseId: 'gone', kind: 'event', publishedAt: 50, retracted: true },
      'world',
    );
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
