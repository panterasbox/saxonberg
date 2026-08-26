/**
 * ⚠⚠ **The release write transport is an ownership bypass by
 * construction**, and this file is the argument that it is a safe one.
 *
 * `DocumentApi.save` gates on self-home / covering zone / slice-walk,
 * which admits the *parcel owner* — not the comms director, and making
 * every comms director a landowner is obviously wrong. So the press path
 * writes through `saveRelease`, which stamps an owner that gate would
 * never admit. If it is loose, the whole document-store ownership story is
 * broken — not just for releases.
 *
 * Four things keep it narrow, and each has a test here:
 *
 *   1. It is callable from **one module** (`PressLogic`). A direct call
 *      from anywhere else throws (**AC 14**).
 *   2. It takes **no caller-supplied owner** — the owner is derived from
 *      the publisher it was handed, so there is no parameter to lie in.
 *   3. It refuses a path **outside that publisher's own feed branch**.
 *   4. It **pins the `kind`**, so it cannot be used to write anything but
 *      a release.
 *
 * And the complement (**AC 15 / risk 3**): a release must not become
 * writable through the ordinary `DocumentApi.save` path by a player who
 * happens to own the covering branch — the publishing check has to be the
 * only way in.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentApi } from '../document';
import { PressApi } from '../press';
import { StuffApi } from '../stuff';
import { ExecutionContextApi } from '../execution-context';
import OrganizationEntity from '../../obj/Organization';
import PressBoard from '../../obj/PressBoard';
import { Idea } from '../../lib/stuff/Idea';
import { RELEASE_DOCUMENT_KIND } from '../../lib/press/Release';
import { SecurityError } from '../../lib/security/errors';
import { PersistenceManager } from '../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { AccessApi } from '../../api/access';

class TestAuthor extends Idea {
  static _mixinName = 'TestAuthor';
}

const PUBLISHER = '/compact/press';
const FEED = '/compact/press/feed';

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockImplementation(
    async (col: string, query: Record<string, unknown>) => {
      if (col === 'app_settings') return [] as never;
      return [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never;
    },
  );
  vi.spyOn(pm, 'save').mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
}

function installPublisher(): OrganizationEntity {
  const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
  org.realm = 'ooc';
  org.visibility = 'public';
  org.feedPath = FEED;
  org.positions = [
    { key: 'communications-director', label: 'speaking', wageRate: 0, confers: [] },
  ];
  // ⚠ The publish path now checks `mayPublishAs` BEFORE minting anything,
  // so the acting author has to actually hold a publishing position. The
  // authored roster is the cheapest way to say so.
  org.rosterSlots = [
    { positionKey: 'communications-director', assignee: '/obj/Avatar/staff', schedule: [] },
  ];
  return org;
}

/** One author per test — a second at the same path is not a singleton. */
function author(): TestAuthor {
  return (
    StuffApi.findByTemplatePath<TestAuthor>('/obj/Avatar/staff') ??
    makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/staff')
  );
}

async function asAuthor<T>(fn: () => Promise<T>): Promise<T> {
  const acting = author();
  return ExecutionContextApi.runRoot(null, 'test', () => {
    ExecutionContextApi.tagActingAuthor(acting);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  StuffApi.clearAll();
  installStore();
    /*
   * ⚠ Stubbed because this file is not about authorization. The
   * permission answer used to be assumed: the access predicates
   * returned true whenever no `AccessRegistry` was registered, which
   * is every test here. That fail-open is gone — a missing authority
   * is not a grant — so the dependency is declared where a reader
   * can see it.
   */
  vi.spyOn(AccessApi, "can").mockResolvedValue(true);
  vi.spyOn(AccessApi, "canAtPath").mockResolvedValue(true);
  vi.spyOn(AccessApi, "isWizard").mockResolvedValue(true);

  void makeStuffAtPath(() => new PressBoard(), '/obj/PressBoard');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the release write transport', () => {
  it('⚠⚠ AC 14 — a direct call from outside PressLogic throws', async () => {
    const org = installPublisher();
    // The Api-static gate refuses before the call is even entered, so
    // this throws synchronously rather than rejecting.
    expect(() =>
      DocumentApi.saveRelease(org, `${FEED}/forged`, { releaseId: 'forged' }),
    ).toThrow(SecurityError);
    // ...and nothing was written.
    expect(
      await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND),
    ).toHaveLength(0);
  });

  it('admits the press path — so the refusal above is not vacuous', async () => {
    installPublisher();
    const release = await asAuthor(() =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'hello' }),
    );
    const docs = await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND);
    expect(docs).toHaveLength(1);
    expect(docs[0]!.getPath()).toBe(`${FEED}/${release.getReleaseId()}`);
  });

  it('stamps the PUBLISHER as owner, not the person who wrote it', async () => {
    installPublisher();
    await asAuthor(() =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'hello' }),
    );
    const doc = (await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND))[0]!;
    // The acting author is recorded in the payload — a person wrote it —
    // but the DOCUMENT belongs to the organization.
    expect(doc.getOwner()).toBe(PUBLISHER);
    expect(doc.getData().author).toBe('/obj/Avatar/staff');
    expect(doc.getKind()).toBe(RELEASE_DOCUMENT_KIND);
  });

  it('refuses a publisher that authors no feed branch', async () => {
    const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
    await expect(
      asAuthor(() =>
        PressApi.publish({ publisher: PUBLISHER, headline: 'hello' }),
      ),
    ).rejects.toThrow(/feedPath/);
    expect(org.getFeedPath()).toBe('');
  });

  it('refuses an organization that is not a publisher at all', async () => {
    await expect(
      asAuthor(() =>
        PressApi.publish({ publisher: '/compact/nowhere', headline: 'x' }),
      ),
    ).rejects.toThrow(/not a publisher/);
  });

  it('⚠ AC 15 / risk 3 — a release forged through the ordinary save path never reaches the window', async () => {
    installPublisher();
    // Whoever owns the covering branch CAN write a `kind: 'release'`
    // document through `save` — the store is kind-agnostic by design. What
    // they cannot do is make it a release: `save` stamps the acting author
    // as owner, and the board only counts a release its owner actually
    // publishes, under that owner's own feed branch.
    await asAuthor(() =>
      DocumentApi.save(`${FEED}/sneaky`, RELEASE_DOCUMENT_KIND, {
        releaseId: 'sneaky',
        headline: 'not through here',
        publishedAt: Date.now(),
      }),
    );
    const docs = await DocumentApi.listOfKind(RELEASE_DOCUMENT_KIND);
    expect(docs).toHaveLength(1);
    expect(docs[0]!.getOwner()).toBe('/obj/Avatar/staff');

    const board = StuffApi.findByTemplatePath<PressBoard>('/obj/PressBoard')!;
    await board.warm();
    expect(board.recentWindow()).toHaveLength(0);
    expect(board.getRelease('sneaky')).toBeNull();

    // The admit case, so the exclusion above is not vacuous.
    const real = await asAuthor(() =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'through here' }),
    );
    await board.warm();
    expect(board.recentWindow().map((r) => r.getReleaseId())).toEqual([
      real.getReleaseId(),
    ]);
  });
});
