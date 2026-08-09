/**
 * MqlSubscriptionRegistry — singleton Idea holding the MQL
 * subscription substrate's runtime state.
 *
 * Lives at `/obj/MqlSubscriptionRegistry`. The thin `MqlSubscriptionApi`
 * facade at `api/mql-subscription.ts` is the only legitimate caller —
 * every public method on this class carries
 * `@CallSecurity(FromModule('/api/mql-subscription#MqlSubscriptionApi'))`
 * so external code that grabs the Stuff via `StuffApi.findByTemplatePath`
 * cannot poke its state.
 *
 * State held here:
 *   - `registry` — per-Interactive map of subscriptionId → state.
 *   - `index` — three-level meta-bus dependency dispatch index
 *     `KIND → by → value → Set<SubscriptionState>`.
 *   - `listeners` — `(KIND, by)` → installed EventApi subscription
 *     handle + refcount, so we install one listener per pair total.
 *   - `dirty` / `scheduled` — `setImmediate`-batched re-resolve queue.
 *
 * HMR-aware: reload of `api/mql-subscription.ts` invalidates only the
 * cached pointer in the Api; subscription state survives. Reload of
 * THIS file re-clones the Stuff (state resets, listeners would need to
 * re-register from scratch).
 */

import type {
  StuffRefRecord,
  StuffDetailRecord,
  StuffDetailFocusRecord,
  Change,
  MqlSubscriptionErrorReason,
  MqlSubscriptionResultEnvelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionErrorEnvelope,
  MqlQueryResultEnvelope,
  MqlQueryErrorEnvelope,
  MqlSubscriptionReleasedEnvelope,
  PaneHold,
  PaneReleaseReason,
} from '@saxonberg/types';
import { PromptApi } from '../api/prompt';
import { Idea } from '../lib/stuff/Idea';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type Interactive from './Interactive';
import type { Subscription } from '../api/event';
import { MixinApi } from '../api/mixin';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../api/execution-context';
import { MqlApi, MqlPermissionError } from '../api/mql';
import { EventApi } from '../api/event';
import { MessageApi } from '../api/message';
import { ShellApi } from '../api/shell';
import { FieldChangedEvent } from '../lib/events/FieldChangedEvent';
import {
  collectSubscribableFields,
  projectFocus,
  resolveFieldSet,
  type FieldSet,
  type SubscriptionCardinality,
  type SubscribeRequest,
  type QueryRequest,
} from '../api/mql-subscription';

/**
 * See WorldClockRegistry — same gate shape, same rationale. Admits the
 * Api facade, the `MqlSubscriptionLogic` singleton (caller template path
 * `/obj/api/mql-subscription`, which actually forwards every
 * registry-backed call), and internal `this.foo()` self-calls.
 */
const MqlSubscriptionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/mql-subscription#MqlSubscriptionApi'),
  SecurityPolicies.FromTemplate('/obj/api/mql-subscription'),
  SecurityPolicies.SelfOnly,
);

/**
 * ⭐ The synthetic dependency kind for durable-subject watches.
 *
 * It reuses the whole index / refcount / teardown machinery, but
 * deliberately has **no bus listener** — nothing ever fires it through
 * `EventApi`. `notifyDurableSubject` routes into the index directly.
 */
const DURABLE_SUBJECT_KIND = '__durable-subject';

interface SubscriptionState {
  interactive: Interactive;
  subscriptionId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields: FieldSet;
  detailKey?: string;
  focusDependent: boolean;
  locationDependent: boolean;
  lastResult: Map<string, RecordValue>;
  dependencyHandles: DependencyHandle[];
  /**
   * Circle scope captured at registration (sandbox build): the batched
   * re-resolve re-plants this on its per-subscription root, so a
   * circle-born subscription resolves under circle containment and a
   * field-born one stays field-pure no matter whose mutation marked it
   * dirty. `null` for field/omni registrants.
   */
  birthScope: string | null;
  /**
   * Lifetime rule. A subscription carrying one is a **pane**: it lives
   * until its condition lapses, then is released with a reason on the
   * wire. `undefined` = the classic shape, lives until unsubscribed.
   */
  hold?: PaneHold;
  /** The pending prompt id an `unanswered` pane waits on. */
  holdSubject?: string;
  /**
   * For `hold: 'here'` — the container the viewer occupied when the
   * pane opened. "Here" is only meaningful relative to a where, and
   * the pane's own subject is not it.
   */
  holdAnchor?: string;
  /**
   * Manual override on the hold, in BOTH directions. `true` keeps a
   * pane whose condition has lapsed; `false` drops one whose condition
   * still holds; `null` means the condition decides.
   *
   * ⚠ Not a sixth hold condition — an override on the other five. A
   * pin that were merely another condition could not dismiss.
   */
  pinned: boolean | null;
}

type RecordValue =
  | (StuffRefRecord & Record<string, unknown>)
  | (StuffDetailRecord & Record<string, unknown>)
  | (StuffDetailFocusRecord & Record<string, unknown>);

/**
 * The stuffId of whatever contains `stuff`, or null. A Sensor is not
 * necessarily Containable (a disembodied Login is not anywhere), so the
 * narrowing is real, not ceremony.
 */
function containerIdOf(stuff: Stuff): string | null {
  if (!MixinApi.isContainable(stuff)) return null;
  return stuff.getContainer()?.stuffId ?? null;
}

interface DependencyHandle {
  kind: string;
  by: string;
  value: unknown;
}

function describeValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return `${typeof v}:${v}`;
  }
  return `${typeof v}`;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    ) {
      return false;
    }
  }
  return true;
}

function projectStuffInto(
  stuff: Stuff,
  fields: FieldSet,
  viewer: Stuff & Sensor,
  detailKey: string | undefined,
): RecordValue {
  if (detailKey !== undefined) {
    return projectFocus(stuff, detailKey, viewer) as RecordValue;
  }
  const descriptors = collectSubscribableFields(stuff);
  const out: Record<string, unknown> = { stuffId: stuff.stuffId };
  for (const name of fields) {
    const d = descriptors.get(name);
    if (!d || !d.read) continue;
    const value = d.read(stuff, viewer);
    if (value === undefined) continue;
    out[name] = value;
  }
  return out as RecordValue;
}

export default class MqlSubscriptionRegistry extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private registry: Map<Interactive, Map<string, SubscriptionState>> =
    new Map();

  private index: Map<
    string,
    Map<string, Map<unknown, Set<SubscriptionState>>>
  > = new Map();

  private listeners: Map<
    string,
    Map<string, { sub: Subscription<unknown>; refcount: number }>
  > = new Map();

  private dirty: Set<SubscriptionState> = new Set();
  private scheduled = false;

  /* ─── public surface ─── */

  @CallSecurity(MqlSubscriptionApiCallers)
  public handleSubscribe(req: SubscribeRequest): void {
    const { interactive, subscriptionId } = req;

    const perInteractive = this.registry.get(interactive);
    if (perInteractive && perInteractive.has(subscriptionId)) {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'duplicate subscriptionId',
      );
      return;
    }

    if (typeof req.query !== 'string') {
      this.emitError(interactive, subscriptionId, 'parse', 'query required');
      return;
    }
    if (req.cardinality !== 'one' && req.cardinality !== 'many') {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'cardinality required',
      );
      return;
    }
    const query = req.query;
    const cardinality = req.cardinality;
    const fields = resolveFieldSet(req.fields);
    const detailKey = req.detailKey;
    const focusDependent = req.focusDependent === true;
    /**
     * ⚠⚠ **A hold must install the dependency that lets it fire.**
     *
     * Every pane hold is a question about *where things are relative to
     * the viewer* — `here` compares the viewer's room to its anchor, and
     * `present` / `inReach` / `carried` compare the subject's container
     * to the viewer. All four are therefore only answerable when the
     * subscription re-resolves, and a subscription only re-resolves when
     * something marks it dirty.
     *
     * Without this, a `here` pane is **immortal**: the viewer walks out,
     * nothing wakes the subscription, the hold is never evaluated, and
     * the pane sits there forever. Found by driving it live — the unit
     * tests all called `refreshForInteractive` by hand and so never
     * exercised the wake path at all.
     *
     * `unanswered` is excluded deliberately: its subject is a pending
     * prompt, not a position, and the prompt's own resolution is what
     * should wake it.
     */
    const holdNeedsLocation =
      req.hold !== undefined && req.hold !== 'unanswered';
    const locationDependent =
      req.locationDependent === true || holdNeedsLocation;

    if (detailKey !== undefined && cardinality !== 'one') {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'detailKey requires cardinality one',
      );
      return;
    }

    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      this.emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose CommandGiver',
      );
      return;
    }
    if (!MixinApi.isSensor(holder)) {
      this.emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose Sensor',
      );
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    const expandedQuery = ShellApi.expandVariables(query, giver);
    let stuffList: Stuff[];
    try {
      const ctx = { commandGiver: giver, scope: expandedQuery };
      if (cardinality === 'one') {
        const one = MqlApi.resolveOne(expandedQuery, ctx);
        stuffList = one.stuff ? [one.stuff] : [];
      } else {
        const many = MqlApi.resolveMany(expandedQuery, ctx);
        stuffList = many.stuff;
      }
    } catch (err) {
      const reason: MqlSubscriptionErrorReason =
        err instanceof MqlPermissionError ? 'permission' : 'parse';
      this.emitError(
        interactive,
        subscriptionId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }

    const lastResult = new Map<string, RecordValue>();
    for (const stuff of stuffList) {
      const rec = projectStuffInto(stuff, fields, viewer, detailKey);
      lastResult.set(stuff.stuffId, rec);
    }

    const registrantScope = ExecutionContextApi.getCircleScope();
    const sub: SubscriptionState = {
      interactive,
      subscriptionId,
      query,
      cardinality,
      fields,
      detailKey,
      focusDependent,
      locationDependent,
      lastResult,
      dependencyHandles: [],
      birthScope: registrantScope === OMNI_SCOPE ? null : registrantScope,
      hold: req.hold,
      holdSubject: req.holdSubject,
      // `here` means "where I was when this opened", so the anchor is
      // captured now — the pane's own subject cannot supply it.
      holdAnchor:
        req.hold === 'here' ? (containerIdOf(viewer) ?? undefined) : undefined,
      pinned: null,
    };

    this.deriveAndInstallDependencies(sub, stuffList);

    let bucket = this.registry.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.registry.set(interactive, bucket);
    }
    bucket.set(subscriptionId, sub);

    const result = [...lastResult.values()];
    const template: Omit<MqlSubscriptionResultEnvelope, 'frameId'> = {
      type: 'mql-subscription-result',
      subscriptionId,
      result,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public handleQuery(
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>,
  ): void {
    const { interactive, queryId } = req;

    if (typeof req.query !== 'string') {
      this.emitQueryError(interactive, queryId, 'parse', 'query required');
      return;
    }
    if (req.cardinality !== 'one' && req.cardinality !== 'many') {
      this.emitQueryError(
        interactive,
        queryId,
        'parse',
        'cardinality required',
      );
      return;
    }
    const query = req.query;
    const cardinality = req.cardinality;
    const fields = resolveFieldSet(req.fields);
    const detailKey = req.detailKey;

    if (detailKey !== undefined && cardinality !== 'one') {
      this.emitQueryError(
        interactive,
        queryId,
        'parse',
        'detailKey requires cardinality one',
      );
      return;
    }

    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      this.emitQueryError(
        interactive,
        queryId,
        'permission',
        'query holder must compose CommandGiver',
      );
      return;
    }
    if (!MixinApi.isSensor(holder)) {
      this.emitQueryError(
        interactive,
        queryId,
        'permission',
        'query holder must compose Sensor',
      );
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    const expandedQuery = ShellApi.expandVariables(query, giver);
    let stuffList: Stuff[];
    try {
      const ctx = { commandGiver: giver, scope: expandedQuery };
      if (cardinality === 'one') {
        const one = MqlApi.resolveOne(expandedQuery, ctx);
        stuffList = one.stuff ? [one.stuff] : [];
      } else {
        const many = MqlApi.resolveMany(expandedQuery, ctx);
        stuffList = many.stuff;
      }
    } catch (err) {
      const reason: MqlSubscriptionErrorReason =
        err instanceof MqlPermissionError ? 'permission' : 'parse';
      this.emitQueryError(
        interactive,
        queryId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }

    const result: RecordValue[] = [];
    for (const stuff of stuffList) {
      const rec = projectStuffInto(stuff, fields, viewer, detailKey);
      result.push(rec);
    }

    const template: Omit<MqlQueryResultEnvelope, 'frameId'> = {
      type: 'mql-query-result',
      queryId,
      result,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string,
  ): void {
    const bucket = this.registry.get(interactive);
    if (!bucket) return;
    const sub = bucket.get(subscriptionId);
    if (!sub) return;
    this.teardownSubscription(sub);
    bucket.delete(subscriptionId);
    if (bucket.size === 0) this.registry.delete(interactive);
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public cancelAllForInteractive(interactive: Interactive): void {
    const bucket = this.registry.get(interactive);
    if (!bucket) return;
    for (const sub of bucket.values()) {
      this.teardownSubscription(sub);
    }
    this.registry.delete(interactive);
  }

  /**
   * Re-resolve every subscription this Interactive holds, right now.
   *
   * Subscriptions re-resolve when a tracked DEPENDENCY changes — but
   * swapping the body behind a socket isn't a dependency of any query,
   * it's a change of who the query is *for*. After the sandbox crossing
   * moves a socket to a wire body (or back), its panes would otherwise
   * keep rendering the room the player already left (found live: the
   * location pane still read "the wire alcove" from inside the circle).
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public refreshForInteractive(interactive: Interactive): void {
    const bucket = this.registry.get(interactive);
    if (!bucket) return;
    for (const sub of bucket.values()) this.markDirty(sub);
  }

  /**
   * ⭐ **The durable-subject witness** — see
   * {@link MqlSubscriptionApi.notifyDurableSubject}.
   *
   * Routes straight into the dependency index under the synthetic
   * {@link DURABLE_SUBJECT_KIND}. No event is constructed and nothing
   * touches `EventApi`: this is one known producer (a standing ledger)
   * poking one known consumer (this registry), which the codebase's
   * rule says is a method call, not a broadcast.
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public notifyDurableSubject(subject: string): void {
    this.routeFire(DURABLE_SUBJECT_KIND, 'subject', { subject });
  }

  /**
   * Cancel every subscription whose birth scope is `scope` — the
   * sandbox reap seam: a circle's live queries die with its session.
   * Field-born subscriptions are untouched (they continue across a
   * crossing — the world-side resolve stays field-pure). Returns the
   * cancel count.
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public cancelAllForScope(scope: string): number {
    let cancelled = 0;
    for (const [interactive, bucket] of [...this.registry.entries()]) {
      for (const [subscriptionId, sub] of [...bucket.entries()]) {
        if (sub.birthScope !== scope) continue;
        this.teardownSubscription(sub);
        bucket.delete(subscriptionId);
        cancelled++;
      }
      if (bucket.size === 0) this.registry.delete(interactive);
    }
    return cancelled;
  }

  /* ─── test seams ─── */

  @CallSecurity(MqlSubscriptionApiCallers)
  public _getRegistrySize(): number {
    let count = 0;
    for (const bucket of this.registry.values()) count += bucket.size;
    return count;
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public _getDependencyIndexEntryCount(): number {
    let count = 0;
    for (const byMap of this.index.values()) {
      for (const valueMap of byMap.values()) {
        for (const set of valueMap.values()) {
          count += set.size;
        }
      }
    }
    return count;
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public async _drainScheduled(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await Promise.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  @CallSecurity(MqlSubscriptionApiCallers)
  public _clearAll(): void {
    for (const byMap of this.listeners.values()) {
      for (const entry of byMap.values()) {
        entry.sub.unsubscribe();
      }
    }
    this.listeners.clear();
    this.index.clear();
    this.registry.clear();
    this.dirty.clear();
    this.scheduled = false;
  }

  /* ─── internal helpers ─── */

  private deriveAndInstallDependencies(
    sub: SubscriptionState,
    stuffList: Stuff[],
  ): void {
    const seenTuples = new Set<string>();
    const installTuple = (kind: string, by: string, value: unknown): void => {
      const tupleKey = `${kind}|${by}|${describeValue(value)}`;
      if (seenTuples.has(tupleKey)) return;
      seenTuples.add(tupleKey);
      this.indexAdd(kind, by, value, sub);
      sub.dependencyHandles.push({ kind, by, value });
      // The durable-subject kind has no bus behind it — it is poked
      // directly by `notifyDurableSubject`.
      if (kind !== DURABLE_SUBJECT_KIND) this.ensureListener(kind, by);
    };

    if (sub.focusDependent) {
      installTuple(FieldChangedEvent.KIND, 'field', 'focus');
    }
    if (sub.locationDependent) {
      installTuple(FieldChangedEvent.KIND, 'field', 'container');
    }

    for (const stuff of stuffList) {
      const descriptors = collectSubscribableFields(stuff);
      for (const [name, d] of descriptors) {
        if (sub.detailKey !== undefined) {
          if (!d.perDetailRead) continue;
        } else {
          if (!d.read) continue;
          if (!sub.fields.includes(name)) continue;
        }
        if (d.static === true) continue;

        const fieldDeps = d.dependsOnFields ?? [name];
        for (const dep of fieldDeps) {
          installTuple(FieldChangedEvent.KIND, 'field', dep);
        }

        // ⭐ Durable-subject watch — indexed on the ledger's own key,
        // not on a live stuffId, so the poke matches exactly the
        // subject that changed rather than fanning out to everyone.
        if (d.durableKey) {
          const key = d.durableKey(stuff);
          if (key !== undefined) {
            installTuple(DURABLE_SUBJECT_KIND, 'subject', key);
          }
        }

        for (const cs of d.changes ?? []) {
          if (cs.by === 'target') {
            installTuple(cs.on.KIND, 'target', stuff.stuffId);
          } else if (cs.by === 'field') {
            installTuple(cs.on.KIND, 'field', name);
          } else {
            installTuple(cs.on.KIND, cs.by, null);
          }
        }
      }
    }
  }

  private indexAdd(
    kind: string,
    by: string,
    value: unknown,
    sub: SubscriptionState,
  ): void {
    let byMap = this.index.get(kind);
    if (!byMap) {
      byMap = new Map();
      this.index.set(kind, byMap);
    }
    let valueMap = byMap.get(by);
    if (!valueMap) {
      valueMap = new Map();
      byMap.set(by, valueMap);
    }
    let set = valueMap.get(value);
    if (!set) {
      set = new Set();
      valueMap.set(value, set);
    }
    set.add(sub);
  }

  private indexRemove(
    kind: string,
    by: string,
    value: unknown,
    sub: SubscriptionState,
  ): void {
    const byMap = this.index.get(kind);
    if (!byMap) return;
    const valueMap = byMap.get(by);
    if (!valueMap) return;
    const set = valueMap.get(value);
    if (!set) return;
    set.delete(sub);
    if (set.size === 0) {
      valueMap.delete(value);
      if (valueMap.size === 0) {
        byMap.delete(by);
        if (byMap.size === 0) this.index.delete(kind);
      }
    }
  }

  private ensureListener(kind: string, by: string): void {
    let byMap = this.listeners.get(kind);
    if (!byMap) {
      byMap = new Map();
      this.listeners.set(kind, byMap);
    }
    const existing = byMap.get(by);
    if (existing) {
      existing.refcount += 1;
      return;
    }
    const handler = (payload: unknown): void => {
      this.routeFire(kind, by, payload);
    };
    const sub = EventApi.on<unknown>(kind, handler);
    byMap.set(by, { sub, refcount: 1 });
  }

  private releaseListener(kind: string, by: string): void {
    const byMap = this.listeners.get(kind);
    if (!byMap) return;
    const entry = byMap.get(by);
    if (!entry) return;
    entry.refcount -= 1;
    if (entry.refcount <= 0) {
      entry.sub.unsubscribe();
      byMap.delete(by);
      if (byMap.size === 0) this.listeners.delete(kind);
    }
  }

  private routeFire(kind: string, by: string, payload: unknown): void {
    if (payload == null || typeof payload !== 'object') return;
    const value = (payload as Record<string, unknown>)[by];
    const byMap = this.index.get(kind);
    if (!byMap) return;
    const valueMap = byMap.get(by);
    if (!valueMap) return;
    const set = valueMap.get(value);
    if (!set || set.size === 0) return;
    for (const sub of set) {
      this.markDirty(sub);
    }
  }

  private markDirty(sub: SubscriptionState): void {
    this.dirty.add(sub);
    if (!this.scheduled) {
      this.scheduled = true;
      setImmediate(() => this.drainDirty());
    }
  }

  private drainDirty(): void {
    this.scheduled = false;
    const subs = [...this.dirty];
    this.dirty.clear();
    for (const sub of subs) {
      // Per-subscription root carrying the subscription's effective
      // scope (sandbox): the drain runs on whatever context marked
      // things dirty, so each re-resolve must run as ITS OWN
      // subscription, never the mutator.
      //
      // The effective scope is the CURRENT HOLDER's — a pane renders
      // what the body behind it sees, and a socket that follows its
      // player into a circle takes its panes along. Birth scope is the
      // fallback for a holderless/detached moment. (A field-born
      // subscription whose holder is now a wire body therefore
      // re-resolves in-circle; when the player walks out and the socket
      // returns to the field avatar, it resolves field-side again.)
      //
      // Guarded 'swallow': a single bad subscription (a stale holder, a
      // query that now denies) must never escape the batched drain — an
      // uncaught throw here would take the process down.
      const holderScope =
        (sub.interactive.getHolder() as { getCircleScope?: () => string | null } | null)
          ?.getCircleScope?.() ?? null;
      const effectiveScope = holderScope ?? sub.birthScope;
      void ExecutionContextApi.runRootGuarded(
        null,
        'mql.reresolve',
        () => this.reresolveAndEmit(sub),
        'swallow',
        effectiveScope !== null
          ? { circleScope: effectiveScope }
          : undefined,
      );
    }
  }

  private reresolveAndEmit(sub: SubscriptionState): void {
    const bucket = this.registry.get(sub.interactive);
    if (!bucket || bucket.get(sub.subscriptionId) !== sub) return;

    const holder = sub.interactive.getHolder();
    if (
      !holder ||
      !MixinApi.isCommandGiver(holder) ||
      !MixinApi.isSensor(holder)
    ) {
      this.teardownSubscription(sub);
      bucket.delete(sub.subscriptionId);
      if (bucket.size === 0) this.registry.delete(sub.interactive);
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    const expandedQuery = ShellApi.expandVariables(sub.query, giver);
    let stuffList: Stuff[];
    try {
      const ctx = { commandGiver: giver, scope: expandedQuery };
      if (sub.cardinality === 'one') {
        const one = MqlApi.resolveOne(expandedQuery, ctx);
        stuffList = one.stuff ? [one.stuff] : [];
      } else {
        const many = MqlApi.resolveMany(expandedQuery, ctx);
        stuffList = many.stuff;
      }
    } catch (err) {
      const reason: MqlSubscriptionErrorReason =
        err instanceof MqlPermissionError ? 'permission' : 'resolve';
      this.emitError(
        sub.interactive,
        sub.subscriptionId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      this.teardownSubscription(sub);
      bucket.delete(sub.subscriptionId);
      if (bucket.size === 0) this.registry.delete(sub.interactive);
      return;
    }

    const newResult = new Map<string, RecordValue>();
    for (const stuff of stuffList) {
      const rec = projectStuffInto(stuff, sub.fields, viewer, sub.detailKey);
      newResult.set(stuff.stuffId, rec);
    }

    // ⚠ Pane lifetime is evaluated HERE — on the batch that was already
    // running — not on a timer of its own. A pane set with its own tick
    // would be a second clock, and two clocks disagree.
    if (sub.hold) {
      const release = this.evaluateHold(sub, stuffList, viewer);
      if (release) {
        this.emitReleased(sub, release);
        this.teardownSubscription(sub);
        bucket.delete(sub.subscriptionId);
        if (bucket.size === 0) this.registry.delete(sub.interactive);
        return;
      }
    }

    const changes = this.diff(sub.lastResult, newResult, sub.cardinality);
    sub.lastResult = newResult;

    for (const handle of sub.dependencyHandles) {
      this.indexRemove(handle.kind, handle.by, handle.value, sub);
      if (handle.kind !== DURABLE_SUBJECT_KIND) {
        this.releaseListener(handle.kind, handle.by);
      }
    }
    sub.dependencyHandles = [];
    this.deriveAndInstallDependencies(sub, stuffList);

    if (changes.length === 0) return;

    const template: Omit<MqlSubscriptionDeltaEnvelope, 'frameId'> = {
      type: 'mql-subscription-delta',
      subscriptionId: sub.subscriptionId,
      changes,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  /**
   * Evaluate a pane's hold. Returns the release reason, or null to keep
   * the pane open.
   *
   * ⚠ A manual pin is consulted FIRST and overrides in both directions:
   * `true` keeps a pane whose condition has lapsed, `false` drops one
   * whose condition still holds. Pinning is an override on the five
   * conditions, not a sixth condition — a sixth condition could only
   * ever keep, never dismiss.
   *
   * The four spatial holds are direct containment predicates against
   * the viewer.
   *
   * ⚠ Answering them by re-resolving the viewer's MQL seeds (`peers` /
   * `reachable` / `inventory`) was tried first and is wrong: those
   * scopes include the room and the viewer themselves, so the scope is
   * never empty and a hold keyed on "is anything still in scope" can
   * never lapse. A pane that can never close is worse than no pane
   * lifetime at all, because the feature reads as working.
   */
  private evaluateHold(
    sub: SubscriptionState,
    stuffList: Stuff[],
    viewer: Stuff & Sensor,
  ): PaneReleaseReason | null {
    if (sub.pinned === true) return null;
    if (sub.pinned === false) return 'dismissed';

    switch (sub.hold) {
      case 'unanswered': {
        // The odd one out: the subject is a pending COMMAND, not a
        // Stuff. Absence from the interactive's bucket IS "answered" —
        // there is no separate flag to go stale.
        if (!sub.holdSubject) return 'answered';
        return PromptApi.isPending(sub.interactive, sub.holdSubject)
          ? null
          : 'answered';
      }
      case 'here': {
        const now = containerIdOf(viewer);
        return now !== null && now === sub.holdAnchor ? null : 'left';
      }
      case 'present':
        return this.anySubject(stuffList, viewer, (s) => {
          const room = containerIdOf(viewer);
          return room !== null && containerIdOf(s) === room;
        })
          ? null
          : 'departed';
      case 'inReach':
        // Same room or in hand. Carried counts as reachable — you can
        // always act on what you are holding.
        return this.anySubject(stuffList, viewer, (s) => {
          const holder = containerIdOf(s);
          if (holder === null) return false;
          return holder === viewer.stuffId || holder === containerIdOf(viewer);
        })
          ? null
          : 'out-of-reach';
      case 'carried':
        return this.anySubject(
          stuffList,
          viewer,
          (s) => containerIdOf(s) === viewer.stuffId,
        )
          ? null
          : 'dropped';
      default:
        return null;
    }
  }

  /**
   * Does any of the pane's subjects satisfy `pred`?
   *
   * An empty subject list releases: a pane about nothing has nothing to
   * hold it open. The viewer never counts as its own subject — a pane
   * about you would otherwise satisfy `carried` and `present` forever.
   */
  private anySubject(
    stuffList: Stuff[],
    viewer: Stuff & Sensor,
    pred: (s: Stuff) => boolean,
  ): boolean {
    const subjects = stuffList.filter((s) => s.stuffId !== viewer.stuffId);
    if (subjects.length === 0) return false;
    return subjects.some(pred);
  }

  /**
   * Tell the client the pane went away, and why. A pane that vanishes
   * without a reason reads as a bug — this is a distinct envelope from
   * the error one precisely because nothing went wrong.
   */
  private emitReleased(
    sub: SubscriptionState,
    reason: PaneReleaseReason,
  ): void {
    const holder = sub.interactive.getHolder();
    if (!holder || !MixinApi.isSensor(holder)) return;
    const template: Omit<MqlSubscriptionReleasedEnvelope, 'frameId'> = {
      type: 'mql-subscription-released',
      subscriptionId: sub.subscriptionId,
      hold: sub.hold!,
      reason,
    };
    MessageApi.sendEnvelope(holder as Stuff & Sensor, template);
  }

  /**
   * Manual pin / dismiss. Marks the pane dirty so the override is
   * applied by the same drain that evaluates every other hold —
   * a dismiss must not tear down inline, or a pane could be released
   * on a path that never emitted its reason.
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public setPanePinned(
    interactive: Interactive,
    subscriptionId: string,
    pinned: boolean | null,
  ): boolean {
    const sub = this.registry.get(interactive)?.get(subscriptionId);
    if (!sub || !sub.hold) return false;
    sub.pinned = pinned;
    this.markDirty(sub);
    return true;
  }

  /** Open panes for one interactive, for the `cockpit pane` report. */
  @CallSecurity(MqlSubscriptionApiCallers)
  public listPanes(
    interactive: Interactive,
  ): { subscriptionId: string; hold: PaneHold; pinned: boolean | null }[] {
    const bucket = this.registry.get(interactive);
    if (!bucket) return [];
    const out: {
      subscriptionId: string;
      hold: PaneHold;
      pinned: boolean | null;
    }[] = [];
    for (const sub of bucket.values()) {
      if (!sub.hold) continue;
      out.push({
        subscriptionId: sub.subscriptionId,
        hold: sub.hold,
        pinned: sub.pinned,
      });
    }
    return out;
  }

  private diff(
    oldMap: Map<string, RecordValue>,
    newMap: Map<string, RecordValue>,
    cardinality: SubscriptionCardinality,
  ): Change[] {
    const changes: Change[] = [];
    if (cardinality === 'one') {
      const oldKey = oldMap.size === 0 ? null : [...oldMap.keys()][0]!;
      const newKey = newMap.size === 0 ? null : [...newMap.keys()][0]!;
      if (oldKey === null && newKey === null) return changes;
      if (oldKey === null && newKey !== null) {
        changes.push({
          op: 'replace',
          key: newKey,
          fields: newMap.get(newKey)!,
        });
        return changes;
      }
      if (oldKey !== null && newKey === null) {
        changes.push({ op: 'remove', key: oldKey });
        return changes;
      }
      if (oldKey !== newKey) {
        changes.push({
          op: 'replace',
          key: newKey!,
          fields: newMap.get(newKey!)!,
        });
        return changes;
      }
      const fieldDiff = this.fieldDiff(
        oldMap.get(oldKey!)!,
        newMap.get(newKey!)!,
      );
      if (fieldDiff && Object.keys(fieldDiff).length > 0) {
        changes.push({ op: 'update', key: oldKey!, fields: fieldDiff });
      }
      return changes;
    }
    const allKeys = new Set<string>([...oldMap.keys(), ...newMap.keys()]);
    for (const key of allKeys) {
      const oldRec = oldMap.get(key);
      const newRec = newMap.get(key);
      if (!oldRec && newRec) {
        changes.push({ op: 'add', key, fields: newRec });
      } else if (oldRec && !newRec) {
        changes.push({ op: 'remove', key });
      } else if (oldRec && newRec) {
        const fieldDiff = this.fieldDiff(oldRec, newRec);
        if (fieldDiff && Object.keys(fieldDiff).length > 0) {
          changes.push({ op: 'update', key, fields: fieldDiff });
        }
      }
    }
    return changes;
  }

  private fieldDiff(
    oldRec: RecordValue,
    newRec: RecordValue,
  ): Record<string, unknown> | null {
    const out: Record<string, unknown> = {};
    const allKeys = new Set<string>([
      ...Object.keys(oldRec),
      ...Object.keys(newRec),
    ]);
    for (const k of allKeys) {
      const a = (oldRec as Record<string, unknown>)[k];
      const b = (newRec as Record<string, unknown>)[k];
      if (!deepEqual(a, b)) {
        out[k] = b;
      }
    }
    return out;
  }

  private teardownSubscription(sub: SubscriptionState): void {
    for (const handle of sub.dependencyHandles) {
      this.indexRemove(handle.kind, handle.by, handle.value, sub);
      this.releaseListener(handle.kind, handle.by);
    }
    sub.dependencyHandles = [];
    this.dirty.delete(sub);
  }

  private emitError(
    interactive: Interactive,
    subscriptionId: string,
    reason: MqlSubscriptionErrorReason,
    detail?: string,
  ): void {
    const holder = interactive.getHolder();
    const template: Omit<MqlSubscriptionErrorEnvelope, 'frameId'> = {
      type: 'mql-subscription-error',
      subscriptionId,
      reason,
      ...(detail !== undefined ? { detail } : {}),
    };
    if (holder && MixinApi.isSensor(holder)) {
      MessageApi.sendEnvelope(holder as Stuff & Sensor, template);
    } else {
      console.warn(
        `MqlSubscriptionApi: cannot deliver error envelope (no Sensor holder); ` +
          `subscriptionId=${subscriptionId} reason=${reason}`,
      );
    }
  }

  private emitQueryError(
    interactive: Interactive,
    queryId: string,
    reason: MqlSubscriptionErrorReason,
    detail?: string,
  ): void {
    const holder = interactive.getHolder();
    const template: Omit<MqlQueryErrorEnvelope, 'frameId'> = {
      type: 'mql-query-error',
      queryId,
      reason,
      ...(detail !== undefined ? { detail } : {}),
    };
    if (holder && MixinApi.isSensor(holder)) {
      MessageApi.sendEnvelope(holder as Stuff & Sensor, template);
    } else {
      console.warn(
        `MqlSubscriptionApi: cannot deliver query-error envelope (no Sensor holder); ` +
          `queryId=${queryId} reason=${reason}`,
      );
    }
  }
}

