/**
 * PressLogic Phase 3 — the inline news-ticker frame fan-out.
 *
 * Covers the presence-PUBLIC press-ticker fan that fires inline at the
 * tail of the mutators (NO event tap — the trigger originates inside the
 * logic), delivered as changes on every session's press-feed subscription
 * (navigation-server D1):
 *   - `publish` fans an `upsert` frame (carrying the projected row) to every
 *     online viewer;
 *   - `retract` fans a `remove` frame (carrying only the releaseId);
 *   - a viewer with no session and one whose session closed hear nothing,
 *     and a healthy viewer still receives.
 *
 * Viewers are in-memory Sensor hosts, each with a real session subscribed
 * to the press feed (its envelopes captured); Mongo is
 * faked with an in-memory collection (the Phase-1 harness); `PlayerApi`'s
 * roster is stubbed to the in-test avatar list.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PressApi } from '../../../../api/press';
import { Release } from '../../../../lib/press/Release';
import PressBoard from '../../PressBoard';
import OrganizationEntity from '../../Organization';

const PUBLISHER = '/compact/press';
const FEED = '/compact/press/feed';
import { Idea } from '../../../../lib/stuff/Idea';
import { Stuff } from '../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../api/stuff';
import { PlayerApi } from '../../../../api/player';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import { makeStuff, makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { ReleaseFeedFrame, ReleaseRow, SubscriptionDeltaEnvelope } from '@saxonberg/types';
import { SESSION_SUBSCRIPTIONS, SUBSCRIPTION_SOURCES } from '@saxonberg/types';
import Interactive from '../../Interactive';
import PressFeedSource from '../../PressFeedSource';

/** The acting author (the giver) whose templatePath is stamped onto rows. */
class TestAuthor extends Idea {
  static _mixinName = 'TestAuthor';
}

/**
 * An Avatar-shaped viewer: a Sensor capturing the press-feed changes
 * its session receives (`withSession = false`: linkdead, no session).
 */
class Viewer extends SensorMixin(Idea) {
  public received: ReleaseFeedFrame[] = [];
  public session: Interactive | null = null;
  constructor(private pid: string) {
    super();
  }
  getPlayerId(): string {
    return this.pid;
  }
}

/** Translate a press-feed delta back to the frames the assertions read. */
function framesOf(env: SubscriptionDeltaEnvelope): ReleaseFeedFrame[] {
  return env.changes.map((c) =>
    c.op === 'remove'
      ? { kind: 'release', action: 'remove', releaseId: c.key }
      : { kind: 'release', action: 'upsert', row: c.fields as ReleaseRow },
  );
}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let avatars: Stuff[];

function matches(
  doc: Record<string, unknown>,
  query: Record<string, unknown>
): boolean {
  return Object.entries(query).every(([k, v]) => doc[k] === v);
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

function makeViewer(pid: string, withSession = true): Viewer {
  const v = makeStuffAtPath(() => new Viewer(pid), `/platform/agent/Avatar/${pid}`);
  avatars.push(v);
  if (!withSession) return v;
  const session = makeStuff(
    () => new Interactive(`sock-${pid}`, 'sess', { _id: pid } as never),
  ) as unknown as Interactive;
  vi.spyOn(session, 'getHolder').mockReturnValue(v as never);
  vi.spyOn(session, 'sendEnvelope').mockImplementation((tpl: unknown) => {
    const env = tpl as SubscriptionDeltaEnvelope;
    if (env.type === 'subscription-delta') v.received.push(...framesOf(env));
  });
  session.subscribe(SESSION_SUBSCRIPTIONS.pressFeed, SUBSCRIPTION_SOURCES.pressFeed, undefined, {
    silent: true,
  });
  v.session = session;
  return v;
}

/** A couple of microtask ticks so any async send delivery settles. */
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  store = new Map();
  idCounter = 0;
  avatars = [];
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
  vi.spyOn(PlayerApi, 'getAllAvatars').mockImplementation(
    () => avatars as never
  );
  // A warm (empty) board so publish's upsert + recent resolve.
  void makeStuffAtPath(() => new PressBoard(), '/platform/idea/PressBoard');
  void makeStuffAtPath(() => new PressFeedSource(), SUBSCRIPTION_SOURCES.pressFeed);
  const org = makeStuffAtPath(() => new OrganizationEntity(), PUBLISHER);
  org.feedPath = FEED;
  org.positions = [
    { key: 'communications-director', label: 'speaking', wageRate: 0 },
  ];
  // ⚠ The publish path now checks `mayPublishAs` BEFORE minting anything,
  // so the acting author has to actually hold a publishing position. The
  // authored roster is the cheapest way to say so.
  org.rosterSlots = [
    { positionKey: 'communications-director', assignee: '/platform/agent/Avatar/a', schedule: [] },
  ];

});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('PressLogic fan-out (inline, presence-public)', () => {
  it('publish fans an upsert frame carrying the row to online viewers', async () => {
    const v1 = makeViewer('v1');
    const v2 = makeViewer('v2');
    const author = makeStuffAtPath(() => new TestAuthor(), '/platform/agent/Avatar/a');

    const b = await publishAs(author, () =>
      PressApi.publish({
        publisher: PUBLISHER,
        headline: 'Server up',
        body: 'patch notes',
        kind: 'changelog',
        pinned: true,
      })
    );
    await flush();

    for (const v of [v1, v2]) {
      expect(v.received).toHaveLength(1);
      const frame = v.received[0]!;
      expect(frame.kind).toBe('release');
      expect(frame.action).toBe('upsert');
      if (frame.action !== 'upsert') throw new Error('expected upsert');
      expect(frame.row.releaseId).toBe(b.getReleaseId());
      expect(frame.row.headline).toBe('Server up');
      expect(frame.row.realm).toBe('ooc');
      expect(frame.row.kind).toBe('changelog');
      expect(frame.row.pinned).toBe(true);
      expect(frame.row.author).toBe('/platform/agent/Avatar/a');
    }
  });

  it('retract fans a remove frame carrying only the releaseId', async () => {
    const v1 = makeViewer('v1');
    const author = makeStuffAtPath(() => new TestAuthor(), '/platform/agent/Avatar/a');

    const b = await publishAs(author, () =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'gone soon' })
    );
    await flush();
    v1.received = []; // drop the publish upsert; assert only the retract

    await PressApi.retract(b.getReleaseId());
    await flush();

    expect(v1.received).toHaveLength(1);
    const frame = v1.received[0]!;
    expect(frame.kind).toBe('release');
    expect(frame.action).toBe('remove');
    if (frame.action !== 'remove') throw new Error('expected remove');
    expect(frame.releaseId).toBe(b.getReleaseId());
  });

  it('edit fans an upsert while the row stays live', async () => {
    const v1 = makeViewer('v1');
    const author = makeStuffAtPath(() => new TestAuthor(), '/platform/agent/Avatar/a');

    const b = await publishAs(author, () =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'first' })
    );
    await flush();
    v1.received = [];

    await PressApi.edit(b.getReleaseId(), { headline: 'revised' });
    await flush();

    expect(v1.received).toHaveLength(1);
    const frame = v1.received[0]!;
    expect(frame.action).toBe('upsert');
    if (frame.action !== 'upsert') throw new Error('expected upsert');
    expect(frame.row.headline).toBe('revised');
  });

  it('edit into an expired state fans a remove (left the live window)', async () => {
    const v1 = makeViewer('v1');
    const author = makeStuffAtPath(() => new TestAuthor(), '/platform/agent/Avatar/a');

    const b = await publishAs(author, () =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'expiring' })
    );
    await flush();
    v1.received = [];

    // Set expiry to the past — the row drops out of the window, so clients
    // (which don't filter on expiry) must be told to remove it.
    await PressApi.edit(b.getReleaseId(), { expiresAt: 1 });
    await flush();

    expect(v1.received).toHaveLength(1);
    const frame = v1.received[0]!;
    expect(frame.action).toBe('remove');
    if (frame.action !== 'remove') throw new Error('expected remove');
    expect(frame.releaseId).toBe(b.getReleaseId());
  });

  it('a viewer with no session, or whose session closed, hears nothing', async () => {
    const linkdead = makeViewer('dead', false); // no live session to push to

    const doomed = makeViewer('doomed');
    doomed.session!.teardownSubstrateState(); // its session went away

    const healthy = makeViewer('healthy'); // later in the scan order

    const author = makeStuffAtPath(() => new TestAuthor(), '/platform/agent/Avatar/a');
    await publishAs(author, () =>
      PressApi.publish({ publisher: PUBLISHER, headline: 'reaches the living' })
    );
    await flush();

    expect(linkdead.received).toHaveLength(0);
    expect(doomed.received).toHaveLength(0);
    // The bad recipients earlier in the list never aborted the fan.
    expect(healthy.received).toHaveLength(1);
    expect(healthy.received[0]!.action).toBe('upsert');
  });
});
