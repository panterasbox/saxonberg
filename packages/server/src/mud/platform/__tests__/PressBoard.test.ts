/**
 * PressBoard — the singleton that warms the news-ticker window from the
 * **document tree** and owns the server-side window semantics.
 *
 * ⚠ The store moved (a `bulletins` collection → `kind: 'release'` documents
 * under each publisher's feed branch) and the window semantics did not.
 * Every assertion below is unchanged from the collection-backed suite;
 * only the fixture that puts a row in front of the board differs, because
 * that is the only thing the move touched. Covers:
 * pins-first then recency ordering; the pin cap (`press.maxPins`); expiry
 * exclusion; soft-retract (the row is kept in the cache but excluded from the
 * window); the window-length cap (`press.tickerWindow`).
 *
 * Mongo is faked with an in-memory collection; AppSettings is warmed with
 * small caps so the ordering/limit math is deterministic.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PressBoard from '../idea/PressBoard';
import {
  Release,
  RELEASE_DOCUMENT_KIND,
  type ReleaseData,
} from '../../lib/press/Release';
import OrganizationEntity from '../idea/Organization';
import { AppSettings } from '../../lib/config/AppSettings';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

// Small caps so ordering/limit assertions are deterministic.
const SETTINGS: Record<string, string> = {
  'press.tickerWindow': '3',
  'press.maxPins': '2',
};

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

const PUBLISHER = '/compact/press';
const FEED = '/compact/press/feed';

/** A full release payload with the fixture's overrides applied. */
function payload(fields: Partial<ReleaseData>): ReleaseData {
  return {
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
}

/** Seed a release DOCUMENT straight into the fake `documents` collection. */
function seed(fields: Partial<ReleaseData>): void {
  const data = payload(fields);
  const id = `id-${idCounter++}`;
  store.set(id, {
    path: `${FEED}/${data.releaseId}`,
    owner: PUBLISHER,
    kind: RELEASE_DOCUMENT_KIND,
    data,
    _id: id,
  });
}

/** A live release value object, for the upsert path. */
function release(fields: Partial<ReleaseData>): Release {
  const data = payload(fields);
  return Release.of(`${FEED}/${data.releaseId}`, PUBLISHER, data);
}

/** The live publisher the fixture releases belong to. A release document
 *  whose owner is not a standing publisher is not a release — see
 *  `Release.publishedByOwner`. */
function installPublisher(): void {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
  org.feedPath = FEED;
}

async function warmBoard(): Promise<PressBoard> {
  const board = makeStuffAtPath(
    () => new PressBoard(),
    '/platform/idea/PressBoard'
  );
  await board.postRegister();
  return board;
}

beforeEach(async () => {
  store = new Map();
  idCounter = 0;
  StuffApi.clearAll();
  installPublisher();
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

describe('PressBoard', () => {
  it('warms the window from the release documents in the tree', async () => {
    seed({ releaseId: 'a', headline: 'a', publishedAt: 10 });
    seed({ releaseId: 'b', headline: 'b', publishedAt: 20 });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getReleaseId()).sort()).toEqual([
      'a',
      'b',
    ]);
  });

  it('orders pins first, then the rest by recency', async () => {
    seed({ releaseId: 'old', headline: 'old', publishedAt: 10 });
    seed({ releaseId: 'new', headline: 'new', publishedAt: 30 });
    seed({ releaseId: 'pin', headline: 'pin', publishedAt: 20, pinned: true });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getReleaseId())).toEqual([
      'pin', // pinned first despite being older than `new`
      'new',
      'old',
    ]);
  });

  it('caps the pin block at press.maxPins', async () => {
    seed({ releaseId: 'p1', headline: 'p1', publishedAt: 10, pinned: true });
    seed({ releaseId: 'p2', headline: 'p2', publishedAt: 20, pinned: true });
    seed({ releaseId: 'p3', headline: 'p3', publishedAt: 30, pinned: true });
    const board = await warmBoard();
    const ids = board.recentWindow().map((x) => x.getReleaseId());
    // maxPins = 2: only the two most-recent pins survive; p1 is dropped.
    expect(ids).toEqual(['p3', 'p2']);
    expect(ids).not.toContain('p1');
  });

  it('excludes expired releases from the window', async () => {
    seed({ releaseId: 'live', headline: 'live', publishedAt: 10 });
    seed({
      releaseId: 'gone',
      headline: 'gone',
      publishedAt: 20,
      expiresAt: 1, // expired long ago
    });
    const board = await warmBoard();
    expect(board.recentWindow().map((x) => x.getReleaseId())).toEqual([
      'live',
    ]);
  });

  it('soft-retract: the row stays cached but leaves the window', async () => {
    seed({ releaseId: 'r', headline: 'r', publishedAt: 10, retracted: true });
    seed({ releaseId: 'k', headline: 'k', publishedAt: 20 });
    const board = await warmBoard();
    // Excluded from the window...
    expect(board.recentWindow().map((x) => x.getReleaseId())).toEqual(['k']);
    // ...but still present in the cache (not hard-deleted).
    expect(board.getRelease('r')?.isRetracted()).toBe(true);
  });

  it('caps the whole window at press.tickerWindow', async () => {
    for (let i = 0; i < 5; i++) {
      seed({ releaseId: `n${i}`, headline: `n${i}`, publishedAt: i * 10 });
    }
    const board = await warmBoard();
    const ids = board.recentWindow().map((x) => x.getReleaseId());
    // tickerWindow = 3: the three most-recent survive.
    expect(ids).toEqual(['n4', 'n3', 'n2']);
  });

  it('upsert inserts and replaces by id', async () => {
    const board = await warmBoard();
    board.upsert(
      release({ releaseId: 'u', headline: 'first', publishedAt: 10 }),
    );
    expect(board.getRelease('u')?.getHeadline()).toBe('first');

    board.upsert(
      release({ releaseId: 'u', headline: 'second', publishedAt: 20 }),
    );
    expect(board.getRelease('u')?.getHeadline()).toBe('second');
    expect(board.recentWindow()).toHaveLength(1);
  });
});
