/**
 * ForumSubscriptionRegistry — a forum-specific **document-change
 * observer**, its own thing.
 *
 * It listens on the in-process `EventApi` bus for `ForumEventFired`
 * (fired by `ForumsLogic.record` after the durable `forum_events` row
 * lands — persist-then-fire), routes the event through a dependency index
 * (board / thread), `setImmediate`-batches the dirty subscriptions, and
 * **re-resolves the current-state `Board`/`Entry` Documents** for each
 * subscription's scope → diff → delta. It does NOT tail Mongo; the
 * `forum_events` log is the durable twin, read only for history/audit.
 *
 * **Independent of MQL-subscription.** This is informed by
 * `MqlSubscriptionRegistry`'s observer *pattern* (registry + dirty-batch
 * + diff) but shares **no code** with it — MQL-sub observes the Stuff
 * world-tree by re-resolving a query; this observes Documents by
 * re-reading them. `MqlSubscriptionRegistry` is **not touched**, so its
 * no-regression constraint is trivially met (two independent observers
 * over different data; the only overlap is the pattern itself).
 *
 * A generic "watch a collection for changes" abstraction is latent and
 * deliberately deferred (no second consumer yet to shape the seam) — this
 * instance is kept clean so it *can* seed it later.
 *
 * Not persisted; seed YAML is `{ class: /obj/ForumSubscriptionRegistry,
 * data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { EventApi } from '../api/event';
import { MessageApi } from '../api/message';
import { MixinApi } from '../api/mixin';
import { ForumsApi } from '../api/forums';
import { ForumEventFired } from '../lib/forum/ForumEvent';
import type Interactive from './Interactive';
import type { Subscription } from '../api/event';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type {
  ForumSubscriptionScope,
  ForumEntryRecord,
  ForumChange,
  ForumSubscriptionResultEnvelope,
  ForumSubscriptionDeltaEnvelope,
  ForumSubscriptionErrorEnvelope,
  ForumSubscriptionErrorReason,
} from '@saxonberg/types';

const ForumSubscriptionApiCallers = SecurityPolicies.FromModule(
  'mud/api/forum-subscription#ForumSubscriptionApi',
);

/** A live forum subscription's server-side state. */
interface ForumSubState {
  interactive: Interactive;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
  lastResult: Map<string, ForumEntryRecord>;
}

/** The subscribe request the Api forwards in. */
export interface ForumSubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
}

export default class ForumSubscriptionRegistry extends Idea {
  private registry: Map<Interactive, Map<string, ForumSubState>> = new Map();
  private byBoard: Map<string, Set<ForumSubState>> = new Map();
  private byThread: Map<string, Set<ForumSubState>> = new Map();

  private listener: Subscription<unknown> | null = null;
  private listenerRefcount = 0;

  private dirty: Set<ForumSubState> = new Set();
  private scheduled = false;

  /* ─── public surface (gated) ─── */

  /** See {@link ForumSubscriptionApi.handleSubscribe}. */
  @CallSecurity(ForumSubscriptionApiCallers)
  public async handleSubscribe(req: ForumSubscribeRequest): Promise<void> {
    const { interactive, subscriptionId, scope } = req;
    const perInteractive = this.registry.get(interactive);
    if (perInteractive && perInteractive.has(subscriptionId)) {
      this.emitError(interactive, subscriptionId, 'parse', 'duplicate subscriptionId');
      return;
    }
    if (!scope || (scope.kind !== 'board' && scope.kind !== 'thread') || !scope.id) {
      this.emitError(interactive, subscriptionId, 'parse', 'scope required');
      return;
    }
    const viewer = this.viewerOf(interactive);
    if (!viewer) {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'subscription holder must compose Sensor',
      );
      return;
    }

    // Normalize a board scope's `id`, which may be a board `_id` OR a
    // flat subject-title handle (the GUI knows handles), to the canonical
    // board `_id` so the dependency index keys match the event payloads.
    const canonical = await this.normalizeScope(scope);
    if (!canonical) {
      this.emitError(interactive, subscriptionId, 'resolve', 'no such board/thread');
      return;
    }

    let records: ForumEntryRecord[];
    try {
      records = await this.projectScope(canonical);
    } catch (err) {
      this.emitError(
        interactive,
        subscriptionId,
        'resolve',
        err instanceof Error ? err.message : String(err),
      );
      return;
    }
    if (records === null) {
      this.emitError(interactive, subscriptionId, 'resolve', 'no such board/thread');
      return;
    }

    const lastResult = new Map<string, ForumEntryRecord>();
    for (const r of records) lastResult.set(r.id, r);
    const state: ForumSubState = {
      interactive,
      subscriptionId,
      scope: canonical,
      lastResult,
    };

    let bucket = this.registry.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.registry.set(interactive, bucket);
    }
    bucket.set(subscriptionId, state);
    this.indexAdd(state);
    this.ensureListener();

    const template: Omit<ForumSubscriptionResultEnvelope, 'frameId'> = {
      type: 'forum-subscription-result',
      subscriptionId,
      scope: canonical,
      records,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  /**
   * Resolve a scope's `id` to its canonical Document `_id`. A board
   * scope's `id` may be a board `_id` or a flat board-title handle; a
   * thread scope's `id` is a thread-root entry `_id`. Returns null when
   * the target doesn't exist.
   */
  private async normalizeScope(
    scope: ForumSubscriptionScope,
  ): Promise<ForumSubscriptionScope | null> {
    if (scope.kind === 'thread') {
      // `findById` THROWS a BSONError on a non-ObjectId string rather than
      // returning null — swallow it so a malformed id resolves to null,
      // not an unhandled rejection.
      const root = await safeFind(() => ForumsApi.getEntry(scope.id));
      return root ? scope : null;
    }
    // A board scope's `id` may be a board `_id` OR a flat title handle (the
    // GUI knows handles). Try as an `_id` first (guarded against the
    // BSONError), then fall back to the title-handle resolve.
    const board = await safeFind(() => ForumsApi.getBoard(scope.id));
    if (board) return scope;
    const view = await ForumsApi.resolveBoardByHandle(scope.id);
    return view ? { kind: 'board', id: view.board._id! } : null;
  }

  /** See {@link ForumSubscriptionApi.handleUnsubscribe}. */
  @CallSecurity(ForumSubscriptionApiCallers)
  public handleUnsubscribe(interactive: Interactive, subscriptionId: string): void {
    const bucket = this.registry.get(interactive);
    const state = bucket?.get(subscriptionId);
    if (!state || !bucket) return;
    this.teardown(state);
    bucket.delete(subscriptionId);
    if (bucket.size === 0) this.registry.delete(interactive);
  }

  /** See {@link ForumSubscriptionApi.cancelAllForInteractive}. */
  @CallSecurity(ForumSubscriptionApiCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    const bucket = this.registry.get(interactive);
    if (!bucket) return;
    for (const state of bucket.values()) this.teardown(state);
    this.registry.delete(interactive);
  }

  /* ─── private: projection ─── */

  private viewerOf(interactive: Interactive): (Stuff & Sensor) | null {
    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isSensor(holder)) return null;
    return holder as Stuff & Sensor;
  }

  /** Re-read the scope's current-state docs and project them. */
  private async projectScope(
    scope: ForumSubscriptionScope,
  ): Promise<ForumEntryRecord[]> {
    if (scope.kind === 'board') {
      const board = await ForumsApi.getBoard(scope.id);
      if (!board) return null as unknown as ForumEntryRecord[];
      const threads = await ForumsApi.readBoard(board, 'new');
      return Promise.all(threads.map((e) => this.projectEntry(e)));
    }
    const root = await ForumsApi.getEntry(scope.id);
    if (!root) return null as unknown as ForumEntryRecord[];
    const { posts } = await ForumsApi.readThread(root, 'new');
    return Promise.all([root, ...posts].map((e) => this.projectEntry(e)));
  }

  private async projectEntry(
    entry: import('../lib/forum/Entry').default,
  ): Promise<ForumEntryRecord> {
    const displayScore = await ForumsApi.displayScoreFor(entry);
    return {
      id: entry._id ?? '',
      parent: entry.getParent(),
      board: entry.getBoard(),
      author: entry.getAuthor(),
      title: entry.getTitle(),
      body: entry.getBody(),
      up: entry.up,
      down: entry.down,
      score: entry.getScore(),
      displayScore,
      state: entry.getState(),
      subject: entry.getSubject(),
      createdAt: entry.createdAt.getTime(),
    };
  }

  /* ─── private: dependency index + listener ─── */

  private indexAdd(state: ForumSubState): void {
    const map = state.scope.kind === 'board' ? this.byBoard : this.byThread;
    let set = map.get(state.scope.id);
    if (!set) {
      set = new Set();
      map.set(state.scope.id, set);
    }
    set.add(state);
  }

  private indexRemove(state: ForumSubState): void {
    const map = state.scope.kind === 'board' ? this.byBoard : this.byThread;
    const set = map.get(state.scope.id);
    if (!set) return;
    set.delete(state);
    if (set.size === 0) map.delete(state.scope.id);
  }

  private ensureListener(): void {
    this.listenerRefcount += 1;
    if (this.listener) return;
    this.listener = EventApi.on<unknown>(ForumEventFired.KIND, (payload) => {
      this.routeFire(payload);
    });
  }

  private releaseListener(): void {
    this.listenerRefcount -= 1;
    if (this.listenerRefcount <= 0 && this.listener) {
      this.listener.unsubscribe();
      this.listener = null;
      this.listenerRefcount = 0;
    }
  }

  private routeFire(payload: unknown): void {
    if (payload == null || typeof payload !== 'object') return;
    const p = payload as { board?: string; thread?: string };
    if (p.board) {
      for (const s of this.byBoard.get(p.board) ?? []) this.markDirty(s);
    }
    if (p.thread) {
      for (const s of this.byThread.get(p.thread) ?? []) this.markDirty(s);
    }
  }

  private markDirty(state: ForumSubState): void {
    this.dirty.add(state);
    if (!this.scheduled) {
      this.scheduled = true;
      setImmediate(() => {
        void this.drainDirty();
      });
    }
  }

  private async drainDirty(): Promise<void> {
    this.scheduled = false;
    const states = [...this.dirty];
    this.dirty.clear();
    for (const state of states) {
      await this.reresolveAndEmit(state);
    }
  }

  private async reresolveAndEmit(state: ForumSubState): Promise<void> {
    const bucket = this.registry.get(state.interactive);
    if (!bucket || bucket.get(state.subscriptionId) !== state) return;
    const viewer = this.viewerOf(state.interactive);
    if (!viewer) {
      this.teardown(state);
      bucket.delete(state.subscriptionId);
      if (bucket.size === 0) this.registry.delete(state.interactive);
      return;
    }

    let records: ForumEntryRecord[];
    try {
      records = await this.projectScope(state.scope);
    } catch {
      return;
    }
    if (records === null) return;

    const newMap = new Map<string, ForumEntryRecord>();
    for (const r of records) newMap.set(r.id, r);
    const changes = diffRecords(state.lastResult, newMap);
    state.lastResult = newMap;
    if (changes.length === 0) return;

    const template: Omit<ForumSubscriptionDeltaEnvelope, 'frameId'> = {
      type: 'forum-subscription-delta',
      subscriptionId: state.subscriptionId,
      changes,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  private teardown(state: ForumSubState): void {
    this.indexRemove(state);
    this.releaseListener();
  }

  private emitError(
    interactive: Interactive,
    subscriptionId: string,
    reason: ForumSubscriptionErrorReason,
    detail?: string,
  ): void {
    const viewer = this.viewerOf(interactive);
    if (!viewer) return;
    const template: Omit<ForumSubscriptionErrorEnvelope, 'frameId'> = {
      type: 'forum-subscription-error',
      subscriptionId,
      reason,
      ...(detail ? { detail } : {}),
    };
    MessageApi.sendEnvelope(viewer, template);
  }
}

/**
 * Keyed-set diff: `(old, new) → ops`. A generic pure function — NOT
 * "MQL's diff" (it shares no code); it just falls out of keying records
 * by id. Replace fires when a record's projected fields change.
 */
function diffRecords(
  oldMap: Map<string, ForumEntryRecord>,
  newMap: Map<string, ForumEntryRecord>,
): ForumChange[] {
  const changes: ForumChange[] = [];
  for (const [key, rec] of newMap) {
    const prev = oldMap.get(key);
    if (!prev) {
      changes.push({ op: 'add', key, fields: rec });
    } else if (!recordsEqual(prev, rec)) {
      changes.push({ op: 'replace', key, fields: rec });
    }
  }
  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) changes.push({ op: 'remove', key });
  }
  return changes;
}

/**
 * Run a `findById`-style lookup, returning null on the BSONError that
 * Mongo throws when an id string isn't a valid ObjectId (e.g. a board
 * title handle reaching `getBoard`). Without this the rejection would
 * propagate out of the async subscribe handler as an unhandled rejection.
 */
async function safeFind<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function recordsEqual(a: ForumEntryRecord, b: ForumEntryRecord): boolean {
  return (
    a.up === b.up &&
    a.down === b.down &&
    a.score === b.score &&
    a.displayScore === b.displayScore &&
    a.title === b.title &&
    a.body === b.body &&
    a.state === b.state &&
    a.subject === b.subject
  );
}
