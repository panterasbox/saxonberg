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
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { EventApi } from '../api/event';
import { MessageApi } from '../api/message';
import { MixinApi } from '../api/mixin';
import { ForumsApi } from '../api/forums';
import { PlayerApi } from '../api/player';
import { Template } from '../lib/stuff/Template';
import { TemplatePathPrefixes } from '../lib/paths';
import { ForumEventFired } from '../lib/forum/ForumEvent';
import type { ArgumentLensNode } from '../api/forums';
import type Interactive from './Interactive';
import type { Subscription } from '../api/event';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import { SubjectApi } from '../api/subject';
import type {
  ForumSubscriptionScope,
  ForumEntryRecord,
  ForumSubjectRecord,
  SubjectAudience,
  SubjectSurfaceName,
  ForumChange,
  ForumSubscriptionResultEnvelope,
  ForumSubscriptionDeltaEnvelope,
  ForumSubscriptionErrorEnvelope,
  ForumSubscriptionErrorReason,
} from '@saxonberg/types';

const ForumSubscriptionApiCallers = SecurityPolicies.FromModule('/api/forums#ForumsApi',
);

/**
 * What a scope projects to. Discriminated by the scope's own `kind`, not
 * by a tag on the record — a `subjects` scope yields subject records and
 * every other scope yields entry records.
 */
type ForumProjectedRecord = ForumEntryRecord | ForumSubjectRecord;

/** A live forum subscription's server-side state. */
interface ForumSubState {
  interactive: Interactive;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
  lastResult: Map<string, ForumProjectedRecord>;
}

/** The subscribe request the Api forwards in. */
export interface ForumSubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  scope: ForumSubscriptionScope;
}

export default class ForumSubscriptionRegistry extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private registry: Map<Interactive, Map<string, ForumSubState>> = new Map();
  private byBoard: Map<string, Set<ForumSubState>> = new Map();
  private byThread: Map<string, Set<ForumSubState>> = new Map();
  /** Board-index subscriptions — re-resolved on any forum event. */
  private indexSubs: Set<ForumSubState> = new Set();

  private listener: Subscription<unknown> | null = null;
  private listenerRefcount = 0;

  private dirty: Set<ForumSubState> = new Set();
  private scheduled = false;

  /* ─── public surface (gated) ─── */

  /** See {@link ForumsApi.handleSubscribe}. */
  @CallSecurity(ForumSubscriptionApiCallers)
  public async handleSubscribe(req: ForumSubscribeRequest): Promise<void> {
    const { interactive, subscriptionId, scope } = req;
    const perInteractive = this.registry.get(interactive);
    if (perInteractive && perInteractive.has(subscriptionId)) {
      this.emitError(interactive, subscriptionId, 'parse', 'duplicate subscriptionId');
      return;
    }
    const validScope =
      scope &&
      ((scope.kind === 'index' || scope.kind === 'subjects') ||
        ((scope.kind === 'board' || scope.kind === 'thread') && !!scope.id));
    if (!validScope) {
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

    let records: ForumProjectedRecord[] | null;
    try {
      records = await this.projectScope(canonical, viewer);
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

    const lastResult = new Map<string, ForumProjectedRecord>();
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
    if (scope.kind === 'subjects') {
      // No backing doc — the rail watches the whole visible SUBJECT set.
      return { kind: 'subjects', id: '' };
    }
    if (scope.kind === 'index') {
      // No backing doc — the index watches the whole visible board set.
      return { kind: 'index', id: '' };
    }
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

  /** See {@link ForumsApi.handleUnsubscribe}. */
  @CallSecurity(ForumSubscriptionApiCallers)
  public handleUnsubscribe(interactive: Interactive, subscriptionId: string): void {
    const bucket = this.registry.get(interactive);
    const state = bucket?.get(subscriptionId);
    if (!state || !bucket) return;
    this.teardown(state);
    bucket.delete(subscriptionId);
    if (bucket.size === 0) this.registry.delete(interactive);
  }

  /** See {@link ForumsApi.cancelAllForInteractive}. */
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

  /**
   * Re-read the scope's current-state docs and project them. Returns
   * `null` when the scope's backing Document was deleted between
   * normalize and project (board/thread gone) — callers emit a resolve
   * error / skip the flush.
   */
  private async projectScope(
    scope: ForumSubscriptionScope,
    viewer: Stuff & Sensor,
  ): Promise<ForumEntryRecord[] | ForumSubjectRecord[] | null> {
    if (scope.kind === 'subjects') {
      return this.projectSubjects(viewer);
    }
    if (scope.kind === 'index') {
      // The forum landing: the boards this viewer can see, each projected
      // as a record whose `id` is the board's flat title handle (so the
      // client opens it with `forum <handle>`).
      const boards = await ForumsApi.listBoards(viewer);
      return boards.map((v) => projectBoard(v.board, v.subject));
    }
    if (scope.kind === 'board') {
      const board = await ForumsApi.getBoard(scope.id);
      if (!board) return null;
      // Organizer-aware branch — the ONLY place the registry knows about
      // the argument organizer. The scope-kind plumbing, dependency index,
      // dirty-batch and diff are all reused verbatim; only the per-scope
      // projection function changes. (MqlSubscriptionRegistry untouched.)
      if (board.getOrganizer() === 'ordered') {
        const nodes = await ForumsApi.readArgumentLens(board);
        return this.projectArgumentNodes(nodes, viewer);
      }
      const threads = await ForumsApi.readBoard(board, 'new');
      return this.projectEntries(threads);
    }
    const root = await ForumsApi.getEntry(scope.id);
    if (!root) return null;
    const board = await ForumsApi.getBoard(root.getBoard());
    if (board?.getOrganizer() === 'ordered') {
      const nodes = await ForumsApi.readArgumentThread(root);
      return this.projectArgumentNodes(nodes, viewer);
    }
    const { posts } = await ForumsApi.readThread(root, 'new');
    return this.projectEntries([root, ...posts]);
  }

  /**
   * The subject rail: every Subject this viewer's audience membership
   * lets them see, with the surfaces it has lit.
   *
   * ⭐ A subject is ONE record — identity, audience, and its surfaces —
   * which is why switching surfaces changes the rendering and not the
   * room. The client had only ever been given a flat list of BOARDS
   * (`kind: 'index'`), and a board is one surface of a subject; no
   * arrangement of that list can express a subject with two.
   *
   * ⚠ `openObjections` is counted from `readArgumentLens`, the SAME read
   * whose `openObjection` flags the per-row projection uses. The rail
   * badge and the rows it summarises therefore cannot disagree — a
   * second count computed some other way is exactly how they would.
   */
  private async projectSubjects(
    viewer: Stuff & Sensor,
  ): Promise<ForumSubjectRecord[]> {
    const subjects = await SubjectApi.visibleSubjects(viewer);
    const backing = await SubjectApi.getBackingGroupIds();
    const out: ForumSubjectRecord[] = [];
    for (const s of subjects) {
      const argRef = s.manifestationRef('ordered-forum');
      let openObjections = 0;
      if (argRef) {
        const board = await safeFind(() => ForumsApi.getBoard(argRef));
        if (board) {
          const nodes = await ForumsApi.readArgumentLens(board);
          openObjections = nodes.filter((n) => n.openObjection).length;
        }
      }
      out.push({
        id: s._id ?? '',
        title: s.getTitle(),
        grain: s.getGrain(),
        // Both grains address by `title`: a venue's is flat-global, a
        // topic's is already the board-scoped `parent/name` string.
        handle: s.getTitle(),
        parent: s.getParentSubject(),
        audience: describeAudience(s.getGroupRef(), backing),
        surfaces: SURFACE_ORDER.filter((surface) =>
          s.hasManifestation(surface),
        ),
        // The backing doc per lit surface, so a client can address the
        // ARGUMENT board of a subject that also lights a popularity one.
        surfaceRefs: Object.fromEntries(
          s
            .getManifestations()
            .map((m) => [m.surface, m.ref] as const),
        ),
        openObjections,
      });
    }
    return out;
  }

  /**
   * Project argument-lens nodes into `ForumEntryRecord`s: the registry
   * stays the record-assembler (author names batched, the per-viewer
   * circle resolved once for the `inCircle` highlight), while the
   * structural facts (lens order + `openObjection`) come from the logic
   * singleton. Reputation-blind: `up`/`down`/`score` are zeroed and
   * `displayScore` is null — the argument view never reads or shows votes.
   */
  private async projectArgumentNodes(
    nodes: ArgumentLensNode[],
    viewer: Stuff & Sensor,
  ): Promise<ForumEntryRecord[]> {
    const names = await resolveAuthorNames(nodes.map((n) => n.entry.getAuthor()));
    const circle = resolveCircle(viewer);
    return nodes.map((n) => {
      const e = n.entry;
      const author = e.getAuthor();
      const edited = e.getEditedAt();
      return {
        id: e._id ?? '',
        parent: e.getParent(),
        board: e.getBoard(),
        author,
        authorName: names.get(author) ?? '',
        title: e.getTitle(),
        body: e.getBody(),
        up: 0,
        down: 0,
        score: 0,
        displayScore: null,
        state: e.getState(),
        subject: e.getSubject(),
        createdAt: e.createdAt.getTime(),
        editedAt: edited ? edited.getTime() : null,
        organizer: 'ordered',
        relation: e.getRelation(),
        openObjection: n.openObjection,
        inCircle: author !== '' && circle.has(author),
      };
    });
  }

  /**
   * Project a set of entries, resolving each author id → its current
   * display name in ONE batched lookup (live avatar, else the durable
   * Avatar template) rather than per-entry.
   */
  private async projectEntries(
    entries: import('../lib/forum/Entry').default[],
  ): Promise<ForumEntryRecord[]> {
    const names = await resolveAuthorNames(entries.map((e) => e.getAuthor()));
    return Promise.all(entries.map((e) => this.projectEntry(e, names)));
  }

  private async projectEntry(
    entry: import('../lib/forum/Entry').default,
    names: Map<string, string>,
  ): Promise<ForumEntryRecord> {
    const displayScore = await ForumsApi.displayScoreFor(entry);
    return {
      id: entry._id ?? '',
      parent: entry.getParent(),
      board: entry.getBoard(),
      author: entry.getAuthor(),
      authorName: names.get(entry.getAuthor()) ?? '',
      title: entry.getTitle(),
      body: entry.getBody(),
      up: entry.up,
      down: entry.down,
      score: entry.getScore(),
      displayScore,
      state: entry.getState(),
      subject: entry.getSubject(),
      createdAt: entry.createdAt.getTime(),
      editedAt: entry.getEditedAt() ? entry.getEditedAt()!.getTime() : null,
    };
  }

  /* ─── private: dependency index + listener ─── */

  private indexAdd(state: ForumSubState): void {
    // `subjects` and `index` are both whole-set watchers with no backing
    // doc to key on, so they share the broad bucket.
    if (state.scope.kind === 'index' || state.scope.kind === 'subjects') {
      this.indexSubs.add(state);
      return;
    }
    const map = state.scope.kind === 'board' ? this.byBoard : this.byThread;
    let set = map.get(state.scope.id);
    if (!set) {
      set = new Set();
      map.set(state.scope.id, set);
    }
    set.add(state);
  }

  private indexRemove(state: ForumSubState): void {
    if (state.scope.kind === 'index' || state.scope.kind === 'subjects') {
      this.indexSubs.delete(state);
      return;
    }
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
    // Index subscriptions watch the whole board set — any forum event
    // (a new board, a new thread, a vote that changes a board's tallies)
    // can affect the landing list, so re-resolve them all. The board set
    // is small, so this is cheap.
    for (const s of this.indexSubs) this.markDirty(s);
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

    let records: ForumProjectedRecord[] | null;
    try {
      records = await this.projectScope(state.scope, viewer);
    } catch {
      return;
    }
    if (records === null) return;

    const newMap = new Map<string, ForumProjectedRecord>();
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
 * Resolve author player ids → current display names, batched. Tries the
 * live avatar first (its current presentation), then the durable Avatar
 * template (for offline authors). Empty ids (anonymous guests) resolve to
 * '' — the client renders a generic byline. The name is NEVER stored on
 * the entry; the entry links by id and this resolves on read, so renames
 * reflect and the byline can become viewer-aware later (RecognitionApi).
 */
async function resolveAuthorNames(
  ids: readonly string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const offline: string[] = [];
  for (const id of new Set(ids)) {
    if (!id) {
      out.set(id, '');
      continue;
    }
    const live = PlayerApi.findAvatarByPlayerId(id);
    if (live) out.set(id, live.getPresentation());
    else offline.push(id);
  }
  if (offline.length > 0) {
    const prefix = TemplatePathPrefixes.avatar;
    const templates = await Template.findByPaths(offline.map((id) => prefix + id));
    for (const tpl of templates) {
      const id = tpl.path.slice(prefix.length);
      const data = tpl.data as { name?: unknown } | undefined;
      out.set(id, typeof data?.name === 'string' ? data.name : id);
    }
    for (const id of offline) if (!out.has(id)) out.set(id, '');
  }
  return out;
}

/**
 * Vocabulary order for a subject's lit surfaces — deliberation first,
 * then chatter, then the live rooms. The rail and the tab bar both read
 * this, so a subject's surfaces are in the same order everywhere.
 */
const SURFACE_ORDER: readonly SubjectSurfaceName[] = [
  'ordered-forum',
  'open-forum',
  'open-chat',
  'ordered-chat',
];

/**
 * Describe a subject's audience for display.
 *
 * ⭐ The three cases are genuinely different acts, not three labels: an
 * OPEN subject binds nothing, a BOUND one consumes a group that already
 * existed and mints nothing, and a CURATED one had a managed group minted
 * alongside it. `backing` is the catalogue's own record of which managed
 * groups it minted, so the curated case is recognised rather than
 * guessed at from the ref's shape.
 */
function describeAudience(
  groupRef: string,
  backing: ReadonlySet<string>,
): SubjectAudience {
  /*
   * ⚠ The LABEL is "everyone", not "open".
   *
   * The rename made `open` a surface name, and the audience chip sits on
   * the same header as the surface tabs — so a subject would have read
   * `Gossip [open] … [Ordered] [Open]`, with one word meaning two
   * different things a centimetre apart. The `kind` stays `'open'`
   * (a distinct enum, never displayed); only what a reader sees changes,
   * and "everyone" is the plainer word for it anyway.
   */
  if (groupRef === '') return { kind: 'open', label: 'everyone' };
  const managedId = groupRef.startsWith('managed:')
    ? groupRef.slice('managed:'.length)
    : null;
  if (managedId && backing.has(managedId)) {
    return { kind: 'curated', label: 'managed group' };
  }
  return { kind: 'bound', label: groupRef };
}

/**
 * Project a board into the shared `ForumEntryRecord` shape for the
 * landing index. The record's `id` is the subject's flat title handle, so
 * the client opens it with `forum <handle>` / `openForumBoard(id)`;
 * `title` is the board name. Vote/score fields are inert (a board isn't
 * votable) — the client renders index rows as boards, not entries.
 */
function projectBoard(
  board: import('../lib/forum/Board').default,
  subject: import('../lib/forum/Subject').default,
): ForumEntryRecord {
  return {
    id: subject.getTitle(),
    parent: null,
    board: board._id ?? '',
    author: subject.getOwner(),
    authorName: '',
    title: board.getName() || subject.getTitle(),
    body: board.getDescription(),
    up: 0,
    down: 0,
    score: 0,
    displayScore: 0,
    state: 'active',
    subject: subject._id ?? null,
    createdAt: board.createdAt.getTime(),
    // The index row carries the organizer so the client picks its render
    // mode (and can badge argument boards) without inferring.
    organizer: board.getOrganizer(),
  };
}

/**
 * The viewer's circle for the delegated-attention highlight: the
 * playerIds of their avatar contacts (any label), resolved once per
 * projection. A non-reordering overlay — it only sets `inCircle`, never
 * changes order. v1 signal is the already-stored authorship × `contacts`;
 * per-topic circles / regard-as-feeder are deferred.
 */
function resolveCircle(viewer: Stuff & Sensor): Set<string> {
  if (!MixinApi.isContacts(viewer)) return new Set();
  const out = new Set<string>();
  for (const c of viewer.allContacts()) {
    if (c.kind === 'avatar') out.add(c.playerId);
  }
  return out;
}

/**
 * Keyed-set diff: `(old, new) → ops`. A generic pure function — NOT
 * "MQL's diff" (it shares no code); it just falls out of keying records
 * by id. Replace fires when a record's projected fields change.
 */
function diffRecords(
  oldMap: Map<string, ForumProjectedRecord>,
  newMap: Map<string, ForumProjectedRecord>,
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

/** A subject record, told apart from an entry record by its own shape. */
function isSubjectRecord(r: ForumProjectedRecord): r is ForumSubjectRecord {
  return Array.isArray((r as ForumSubjectRecord).surfaces);
}

/**
 * ⚠⚠ **Dispatch, not a widened field list.**
 *
 * The obvious move — leaving this comparing entry fields and letting a
 * subject record fall through it — reads as working and never fires a
 * `replace`: every entry field is `undefined` on both sides, so two
 * different subjects compare equal and the rail freezes at whatever it
 * showed first. Nothing throws, nothing logs. The comparison has to know
 * which kind of record it is holding.
 */
function recordsEqual(
  a: ForumProjectedRecord,
  b: ForumProjectedRecord,
): boolean {
  if (isSubjectRecord(a) || isSubjectRecord(b)) {
    if (!isSubjectRecord(a) || !isSubjectRecord(b)) return false;
    return subjectRecordsEqual(a, b);
  }
  return entryRecordsEqual(a, b);
}

/** The rail's fields: a surface lighting up or an objection being
 *  answered both have to move it. */
function subjectRecordsEqual(
  a: ForumSubjectRecord,
  b: ForumSubjectRecord,
): boolean {
  return (
    a.title === b.title &&
    a.grain === b.grain &&
    a.handle === b.handle &&
    a.parent === b.parent &&
    a.audience.kind === b.audience.kind &&
    a.audience.label === b.audience.label &&
    a.openObjections === b.openObjections &&
    a.surfaces.length === b.surfaces.length &&
    a.surfaces.every((s, i) => s === b.surfaces[i]) &&
    a.surfaces.every((s) => a.surfaceRefs[s] === b.surfaceRefs[s])
  );
}

function entryRecordsEqual(a: ForumEntryRecord, b: ForumEntryRecord): boolean {
  return (
    a.up === b.up &&
    a.down === b.down &&
    a.score === b.score &&
    a.displayScore === b.displayScore &&
    a.title === b.title &&
    a.body === b.body &&
    a.state === b.state &&
    a.subject === b.subject &&
    // Argument-mode fields — so a delta fires when an open-objection
    // clears (a child attaches → the parent flips false), a body is
    // edited, or a per-viewer highlight changes.
    a.editedAt === b.editedAt &&
    a.relation === b.relation &&
    a.openObjection === b.openObjection &&
    a.inCircle === b.inCircle &&
    a.organizer === b.organizer
  );
}
