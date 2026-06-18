/**
 * ForumSubscriptionRegistry — the forum document-change observer (Wave 3).
 *
 * Covers: a subscription receives an initial snapshot; a forum mutation
 * fires `ForumEventFired` on `EventApi` (NOT a Mongo tail) which drives a
 * live delta after re-resolving the current-state docs; persist-then-fire
 * (the durable row lands before the fire); unsubscribe stops deltas.
 *
 * The bus is simulated by capturing the registry's `EventApi.on` handler
 * and routing `EventApi.fire` straight to it — so the real
 * `ForumsLogic.record` dual-write drives the observer end-to-end without a
 * live WebSocket / Avatar. `MqlSubscriptionRegistry` is never imported
 * (its no-regression constraint is trivially met).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForumSubscriptionApi } from '../../api/forum-subscription';
import { ForumsApi } from '../../api/forums';
import ForumSubscriptionRegistry from '../ForumSubscriptionRegistry';
import SubjectCatalogue from '../SubjectCatalogue';
import { Idea } from '../../lib/stuff/Idea';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { PersistenceManager, Collections } from '../../../backend/PersistenceManager';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { EventApi } from '../../api/event';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { ForumEventFired } from '../../lib/forum/ForumEvent';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Interactive from '../Interactive';

let store: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;
let busHandler: ((payload: unknown) => void) | null;
let envelopes: Array<{ type: string; [k: string]: unknown }>;
let rowsAtFire: number[];

function col(name: string): Map<string, Record<string, unknown>> {
  let c = store.get(name);
  if (!c) {
    c = new Map();
    store.set(name, c);
  }
  return c;
}

class Actor extends Idea {}
function makeActor(): Stuff {
  return makeStuff(() => new Actor());
}

/** A fake Interactive whose holder is a (mock-Sensor) viewer. */
function fakeInteractive(): Interactive {
  const holder = makeStuff(() => new Actor());
  return { getHolder: () => holder } as unknown as Interactive;
}

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  busHandler = null;
  envelopes = [];
  rowsAtFire = [];

  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'save').mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    }
  );
  vi.spyOn(pm, 'find').mockImplementation(
    async (c: string, query: Record<string, unknown>) =>
      [...col(c).values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, 'findById').mockImplementation(
    async (c: string, id: string) => (col(c).get(id) ?? null) as never
  );
  vi.spyOn(pm, 'delete').mockImplementation(async (c: string, id: string) => {
    col(c).delete(id);
  });

  vi.spyOn(PlayerApi, 'isAvatarStuff').mockReturnValue(false as never);
  vi.spyOn(MixinApi, 'isSensor').mockReturnValue(true as never);
  vi.spyOn(MessageApi, 'sendEnvelope').mockImplementation((_viewer, tpl) => {
    envelopes.push(tpl as unknown as { type: string });
  });
  // Capture the registry's single EventApi.on handler...
  vi.spyOn(EventApi, 'on').mockImplementation(((_kind: string, handler: unknown) => {
    busHandler = handler as (payload: unknown) => void;
    return { unsubscribe: vi.fn() } as never;
  }) as never);
  // ...and route ForumEventFired straight to it (the simulated bus).
  vi.spyOn(EventApi, 'fire').mockImplementation((event: unknown) => {
    const e = event as { kind?: string; payload?: unknown };
    if (e.kind === ForumEventFired.KIND) {
      rowsAtFire.push(col(Collections.ForumEvents).size);
      busHandler?.(e.payload);
    }
  });

  makeStuffAtPath(() => new SubjectCatalogue(), '/obj/SubjectCatalogue');
  makeStuffAtPath(
    () => new ForumSubscriptionRegistry(),
    '/obj/ForumSubscriptionRegistry'
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** Flush the setImmediate-batched dirty drain + its async reresolve. */
async function flush(): Promise<void> {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

describe('ForumSubscriptionRegistry', () => {
  it('delivers an initial snapshot then a live delta on a vote', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', { open: true });
    const thread = await ForumsApi.postThread(creator, board, 'Best soup?', 'body');

    const interactive = fakeInteractive();
    await ForumSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'b1',
      scope: { kind: 'board', id: board._id! },
    });

    const snapshot = envelopes.find((e) => e.type === 'forum-subscription-result');
    expect(snapshot).toBeDefined();
    const records = (snapshot as unknown as { records: Array<{ id: string; score: number }> })
      .records;
    expect(records).toHaveLength(1);
    expect(records[0]!.id).toBe(thread._id);
    expect(records[0]!.score).toBe(1); // author auto-upvote.

    envelopes.length = 0;
    // A vote fires ForumEventFired (persist-then-fire) → drives a delta.
    const voter = makeActor();
    await ForumsApi.castVote(voter, thread, 'up');
    await flush();

    const delta = envelopes.find((e) => e.type === 'forum-subscription-delta');
    expect(delta).toBeDefined();
    const changes = (delta as unknown as {
      changes: Array<{ op: string; key: string; fields?: { score: number } }>;
    }).changes;
    expect(changes).toHaveLength(1);
    expect(changes[0]!.op).toBe('replace');
    expect(changes[0]!.key).toBe(thread._id);
    expect(changes[0]!.fields!.score).toBe(2); // author + voter.

    // Persist-then-fire: every fire saw its durable row already in the log.
    expect(rowsAtFire.every((n) => n >= 1)).toBe(true);
  });

  it('a new thread surfaces as an add delta on a board subscription', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', { open: true });
    const interactive = fakeInteractive();
    await ForumSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'b1',
      scope: { kind: 'board', id: board._id! },
    });
    envelopes.length = 0;

    const t = await ForumsApi.postThread(creator, board, 'New', 'body');
    await flush();

    const delta = envelopes.find((e) => e.type === 'forum-subscription-delta');
    const changes = (delta as unknown as { changes: Array<{ op: string; key: string }> }).changes;
    expect(changes.some((c) => c.op === 'add' && c.key === t._id)).toBe(true);
  });

  it('stops delivering deltas after unsubscribe', async () => {
    const creator = makeActor();
    const { board } = await ForumsApi.makeForum(creator, 'Gossip', { open: true });
    const thread = await ForumsApi.postThread(creator, board, 'T', 'body');
    const interactive = fakeInteractive();
    await ForumSubscriptionApi.handleSubscribe({
      interactive,
      subscriptionId: 'b1',
      scope: { kind: 'board', id: board._id! },
    });
    ForumSubscriptionApi.handleUnsubscribe(interactive, 'b1');
    envelopes.length = 0;

    await ForumsApi.castVote(makeActor(), thread, 'up');
    await flush();
    expect(envelopes.find((e) => e.type === 'forum-subscription-delta')).toBeUndefined();
  });
});
