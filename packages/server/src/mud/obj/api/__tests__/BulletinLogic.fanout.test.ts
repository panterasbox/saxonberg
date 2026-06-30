/**
 * BulletinLogic Phase 3 — the inline news-ticker frame fan-out.
 *
 * Covers the presence-PUBLIC `world.bulletin.feed` fan that fires inline at
 * the tail of the mutators (NO event tap — the trigger originates inside the
 * logic):
 *   - `publish` fans an `upsert` frame (carrying the projected row) to every
 *     online viewer;
 *   - `retract` fans a `remove` frame (carrying only the bulletinId);
 *   - a linkdead viewer and a destroyed viewer are skipped, and a healthy
 *     viewer later in the scan still receives — one bad recipient never
 *     aborts the fan.
 *
 * Viewers are in-memory Sensor hosts (so `scene.toSelf` delivers); Mongo is
 * faked with an in-memory collection (the Phase-1 harness); `PlayerApi`'s
 * roster is stubbed to the in-test avatar list.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BulletinApi } from '../../../api/bulletin';
import { Bulletin } from '../../../lib/bulletin/Bulletin';
import BulletinBoard from '../../BulletinBoard';
import { Idea } from '../../../lib/stuff/Idea';
import { Stuff } from '../../../lib/stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { PlayerApi } from '../../../api/player';
import { ExecutionContextApi } from '../../../api/execution-context';
import { SensorMixin } from '../../../lib/message/Sensor';
import { PersistenceManager } from '../../../../backend/PersistenceManager';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';
import type { BulletinFeedFrame, MessageFrame } from '@saxonberg/types';

/** The acting author (the giver) whose templatePath is stamped onto rows. */
class TestAuthor extends Idea {
  static _mixinName = 'TestAuthor';
}

/**
 * An Avatar-shaped viewer: a Sensor (so `scene(viewer).toSelf` delivers)
 * capturing the `world.bulletin.feed` frames it receives. `connected`
 * stands in for `HasInteractiveMixin.isConnected()` — the fan scans online
 * viewers only, so a linkdead viewer (`connected = false`) is skipped.
 */
class Viewer extends SensorMixin(Idea) {
  public received: BulletinFeedFrame[] = [];
  public connected = true;
  constructor(private pid: string) {
    super();
  }
  getPlayerId(): string {
    return this.pid;
  }
  isConnected(): boolean {
    return this.connected;
  }
  protected override handleMessage(frame: unknown): void {
    const f = frame as MessageFrame;
    if (f.topic === 'world.bulletin.feed') {
      this.received.push(f.payload as BulletinFeedFrame);
    }
  }
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

function makeViewer(pid: string): Viewer {
  const v = makeStuffAtPath(() => new Viewer(pid), `/obj/Avatar/${pid}`);
  avatars.push(v);
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
  void makeStuffAtPath(() => new BulletinBoard(), '/obj/BulletinBoard');
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('BulletinLogic fan-out (inline, presence-public)', () => {
  it('publish fans an upsert frame carrying the row to online viewers', async () => {
    const v1 = makeViewer('v1');
    const v2 = makeViewer('v2');
    const author = makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/a');

    const b = await publishAs(author, () =>
      BulletinApi.publish({
        headline: 'Server up',
        body: 'patch notes',
        realm: 'ooc',
        kind: 'changelog',
        pinned: true,
      })
    );
    await flush();

    for (const v of [v1, v2]) {
      expect(v.received).toHaveLength(1);
      const frame = v.received[0]!;
      expect(frame.kind).toBe('bulletin');
      expect(frame.action).toBe('upsert');
      if (frame.action !== 'upsert') throw new Error('expected upsert');
      expect(frame.row.bulletinId).toBe(b.getBulletinId());
      expect(frame.row.headline).toBe('Server up');
      expect(frame.row.realm).toBe('ooc');
      expect(frame.row.kind).toBe('changelog');
      expect(frame.row.pinned).toBe(true);
      expect(frame.row.author).toBe('/obj/Avatar/a');
    }
  });

  it('retract fans a remove frame carrying only the bulletinId', async () => {
    const v1 = makeViewer('v1');
    const author = makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/a');

    const b = await publishAs(author, () =>
      BulletinApi.publish({ headline: 'gone soon' })
    );
    await flush();
    v1.received = []; // drop the publish upsert; assert only the retract

    await BulletinApi.retract(b.getBulletinId());
    await flush();

    expect(v1.received).toHaveLength(1);
    const frame = v1.received[0]!;
    expect(frame.kind).toBe('bulletin');
    expect(frame.action).toBe('remove');
    if (frame.action !== 'remove') throw new Error('expected remove');
    expect(frame.bulletinId).toBe(b.getBulletinId());
  });

  it('skips linkdead + destroyed viewers without aborting the scan', async () => {
    const linkdead = makeViewer('dead');
    linkdead.connected = false; // no live Interactive to push to

    const doomed = makeViewer('doomed');
    await StuffApi.destruct(doomed); // isDestroyed() → true, still in roster

    const healthy = makeViewer('healthy'); // later in the scan order

    const author = makeStuffAtPath(() => new TestAuthor(), '/obj/Avatar/a');
    await publishAs(author, () =>
      BulletinApi.publish({ headline: 'reaches the living' })
    );
    await flush();

    expect(linkdead.received).toHaveLength(0);
    expect(doomed.received).toHaveLength(0);
    // The bad recipients earlier in the list never aborted the fan.
    expect(healthy.received).toHaveLength(1);
    expect(healthy.received[0]!.action).toBe('upsert');
  });
});
