/**
 * MqlSubscriptionRegistry — singleton Idea holding the MQL
 * subscription substrate's runtime state.
 *
 * Lives at `/platform/idea/MqlSubscriptionRegistry`. The thin `MqlSubscriptionApi`
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
} from '@saxonberg/types';
import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Sensor } from '../../lib/message/Sensor';
import type { CommandGiver } from '../../lib/command/CommandGiver';
import type Interactive from './Interactive';
import type { Subscription } from '../../api/event';
import { MixinApi } from '../../api/mixin';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../api/execution-context';
import { MqlApi, MqlPermissionError } from '../../api/mql';
import { MqlSubscriptionApi } from '../../api/mql-subscription';
import { StuffApi } from '../../api/stuff';
import { ScheduleApi } from '../../api/schedule';
import { PerceptionApi } from '../../api/perception';
import { EventApi } from '../../api/event';
import { ShellApi } from '../../api/shell';
import { FieldChangedEvent } from '../../lib/events/FieldChangedEvent';
import type { BoundaryRole } from '../../lib/security/BoundaryRole';
import {
  collectSubscribableFields,
  projectFocus,
  resolveFieldSet,
  type FieldSet,
  type SubscriptionCardinality,
  type SubscribeRequest,
  type QueryRequest,
} from '../../api/mql-subscription';

/**
 * See WorldClockRegistry — same gate shape, same rationale. Admits the
 * Api facade, the `MqlSubscriptionLogic` singleton (caller template path
 * `/platform/idea/api/mql-subscription`, which actually forwards every
 * registry-backed call), and internal `this.foo()` self-calls.
 */
const MqlSubscriptionApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/mql-subscription#MqlSubscriptionApi'),
  SecurityPolicies.FromTemplate('/platform/idea/api/mql-subscription'),
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

/**
 * ⭐ The synthetic kind a belief change pokes (crowded-rooms D2): keyed
 * `<viewerId>|<subjectId>`, so a viewer who learns who someone is
 * re-projects THAT viewer's rows of THAT person, and nobody else's.
 */
const VIEWER_BELIEF_KIND = '__viewer-belief';

/**
 * Which fields of a target admit a fire: a set of field names, or `null` —
 * any field (crowded-rooms D1).
 */
type FieldFilter = ReadonlySet<string> | null;

/** Union two filters; `null` (any) absorbs. */
function unionFilter(a: FieldFilter | undefined, b: FieldFilter): FieldFilter {
  if (a === undefined) return b;
  if (a === null || b === null) return null;
  return new Set([...a, ...b]);
}

interface SubscriptionState {
  interactive: Interactive;
  subscriptionId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields: FieldSet;
  detailKey?: string;
  focusDependent: boolean;
  locationDependent: boolean;
  /**
   * ⭐ Bound to ONE Stuff by id, instead of to a query. See
   * `SubscribeRequest.subjectId`: every query form is relative and
   * re-answers against the asker, which is wrong for a card about a
   * particular thing.
   */
  subjectId?: string;
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
  // ⭐ A live card's projection is the room's own reading: it holds the
  // world still (crowded-rooms D9).
  const release = ExecutionContextApi.holdWorldStill('card projection');
  try {
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
  } finally {
    release();
  }
}

/**
 * Resolve an ordinary subscription's MQL.
 *
 * Module-private free functions rather than methods: they touch no
 * registry state, and an intra-singleton `this.x()` would have to
 * satisfy the external gate for no benefit (the `DiagnosticLogic`
 * shape).
 */
/**
 * Resolve a subject-bound subscription — the SAME Stuff every time,
 * **behind the perception gate**.
 *
 * ⚠⚠ The gate is re-applied on every re-resolve, not just at mint. A
 * stuffId is not a capability: resolving one straight through
 * `findById` is the ungated `#<stuffId>` seed by another route, and a
 * card built on it would keep answering for a room you have left, or
 * for something that has been hidden from you since. An unperceivable
 * subject resolves to nothing, and the diff turns that into a `remove`
 * the subscriber can act on.
 */
function resolveSubjectBound(
  subjectId: string,
  viewer: Stuff & Sensor,
): Stuff[] {
  const found = StuffApi.findById(subjectId);
  if (!found) return [];
  return PerceptionApi.perceives(viewer, found) ? [found] : [];
}

function resolveByQuery(
  query: string,
  cardinality: SubscriptionCardinality,
  giver: Stuff & CommandGiver,
): Stuff[] {
  const expanded = ShellApi.expandVariables(query, giver);
  // ⭐ Tracked (crowded-rooms N2): what the resolve READ comes back beside
  // what it matched, and each becomes a dependency.
  const ctx = { commandGiver: giver, scope: expanded, trackTouched: true };
  // ⭐ An unperceived id never reaches the wire (D23): MQL names, the
  // subscriber perceives — before the projection and before the diff.
  const named = MqlApi.resolveMany(expanded, ctx);
  touchedByLastResolve = named.touched ?? [];
  const seen = PerceptionApi.perceived(giver, named.stuff, named.ordinal);
  return cardinality === 'one' ? seen.slice(0, 1) : seen;
}

/**
 * What the last {@link resolveByQuery} read. Module state, read at once by
 * the (synchronous) caller that just resolved — the registry's projection
 * is one synchronous unit.
 */
let touchedByLastResolve: Stuff[] = [];

/**
 * Resolve and project one subscription's rows as one synchronous unit, and
 * report what it read: the Stuff its query touched, and every Stuff any
 * projection (top-level or nested inside a descriptor) projected, with the
 * fields it projected.
 */
function resolveAndProject(
  sub: { subjectId?: string; query: string; cardinality: SubscriptionCardinality; fields: FieldSet; detailKey?: string },
  giver: Stuff & CommandGiver,
  viewer: Stuff & Sensor,
): {
  stuffList: Stuff[];
  rows: Map<string, RecordValue>;
  touched: Stuff[];
  projected: Map<Stuff, Set<string>>;
  readByDescriptors: Map<Stuff, FieldFilter>;
} {
  touchedByLastResolve = [];
  const stuffList = sub.subjectId
    ? resolveSubjectBound(sub.subjectId, viewer)
    : resolveByQuery(sub.query, sub.cardinality, giver);
  const touched = touchedByLastResolve;
  touchedByLastResolve = [];
  const rows = new Map<string, RecordValue>();
  const projected = new Map<Stuff, Set<string>>();
  const readByDescriptors = new Map<Stuff, FieldFilter>();
  // ⭐ One light walk per place for the whole projection (a vision gate per
  // row) — see `PerceptionApi.holdLightSteady`.
  const release = PerceptionApi.holdLightSteady();
  try {
    MqlSubscriptionApi.collectProjections(
      () => {
        for (const stuff of stuffList) {
          rows.set(stuff.stuffId, projectStuffInto(stuff, sub.fields, viewer, sub.detailKey));
        }
      },
      (stuff, fields, read) => {
        if (read === true) {
          // A descriptor's own resolve: raw field names (or any), installed
          // as they are — they are not descriptor names.
          const had = readByDescriptors.get(stuff);
          readByDescriptors.set(stuff, fields === null ? null : unionFilter(had, new Set(fields)));
          return;
        }
        let set = projected.get(stuff);
        if (!set) projected.set(stuff, (set = new Set()));
        for (const f of fields ?? []) set.add(f);
      },
    );
  } finally {
    release();
  }
  return { stuffList, rows, touched, projected, readByDescriptors };
}

/** How long one drain may run before it gives the loop back. */
const DRAIN_SLICE_MS = 20;
/** How long a backlogged drain rests, as a multiple of the slice it just ran. */
const DRAIN_REST_FACTOR = 2;

export default class MqlSubscriptionRegistry extends Idea {
  /**
   * engine bookkeeping that happens to be Stuff-shaped: a registry holds the framework's own index, not world state anybody stands in.
   *
   * ⭐ Declared, not enumerated. This was one of twenty-seven
   * template-path strings in `api/security.ts`, listed there
   * *"because each is a singleton rather than a class of many"* —
   * which a static on the class makes irrelevant. See
   * `lib/security/BoundaryRole.ts`.
   */
  static boundaryRole: BoundaryRole = 'infrastructure';


  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private registry: Map<Interactive, Map<string, SubscriptionState>> =
    new Map();

  /**
   * ⭐ kind → by → value → (subscription → the fields that wake it). A
   * dependency on a Stuff is `(FieldChanged, 'target', stuffId)` with a
   * field filter (crowded-rooms D1): the Stuff that was read, with the
   * fields that were read. The name-only `('field', name)` entries — which
   * woke every subscription in the world on any `container` fire — are
   * retired.
   */
  private index: Map<
    string,
    Map<string, Map<unknown, Map<SubscriptionState, FieldFilter>>>
  > = new Map();

  private listeners: Map<
    string,
    Map<string, { sub: Subscription<unknown>; refcount: number }>
  > = new Map();

  private dirty: Set<SubscriptionState> = new Set();
  private scheduled = false;

  /* ─── public surface ─── */

  /**
   * Register a live subscription and return its first resolve.
   *
   * ⭐ **The card catalogue left this method.** A subscription used to
   * be able to name a card, and the server described it from
   * `Cards.ts`. Cards are now their own substrate with their own birth
   * path, so what remains here is the plain shape: a caller-supplied
   * query, cardinality and field set.
   *
   * ⚠ Returns the initial records rather than only emitting them, and
   * skips the initial envelope entirely when `silent`. A LIVE card owns
   * its subscription handle and carries the first resolve on its own
   * `card-opened`; emitting a second envelope for one open is how a
   * card ends up briefly showing nothing. Returns `null` when the
   * subscribe failed (the error envelope has already gone out).
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public handleSubscribe(req: SubscribeRequest): RecordValue[] | null {
    const { interactive, subscriptionId } = req;

    const perInteractive = this.registry.get(interactive);
    if (perInteractive && perInteractive.has(subscriptionId)) {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'duplicate subscriptionId',
      );
      return null;
    }

    const rawQuery = req.query;
    const rawCardinality = req.cardinality;
    if (typeof rawQuery !== 'string') {
      this.emitError(interactive, subscriptionId, 'parse', 'query required');
      return null;
    }
    if (rawCardinality !== 'one' && rawCardinality !== 'many') {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'cardinality required',
      );
      return null;
    }
    const query = rawQuery;
    const cardinality = rawCardinality;
    const fields = resolveFieldSet(req.fields);
    const detailKey = req.detailKey;
    // ⭐ Accepted and unused (crowded-rooms D1): the holder entry every
    // query-bound subscription installs subsumes both flags. Their removal
    // from the wire type is navigation-server's `params` to do.
    const focusDependent = req.focusDependent === true;
    const locationDependent = req.locationDependent === true;

    if (detailKey !== undefined && cardinality !== 'one') {
      this.emitError(
        interactive,
        subscriptionId,
        'parse',
        'detailKey requires cardinality one',
      );
      return null;
    }

    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      this.emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose CommandGiver',
      );
      return null;
    }
    if (!MixinApi.isSensor(holder)) {
      this.emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose Sensor',
      );
      return null;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    const subjectId = req.subjectId;
    let resolved: ReturnType<typeof resolveAndProject>;
    try {
      resolved = resolveAndProject(
        { query, cardinality, fields, detailKey, ...(subjectId !== undefined ? { subjectId } : {}) },
        giver,
        viewer,
      );
    } catch (err) {
      const reason: MqlSubscriptionErrorReason =
        err instanceof MqlPermissionError ? 'permission' : 'parse';
      this.emitError(
        interactive,
        subscriptionId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }

    const lastResult = resolved.rows;

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
      ...(subjectId !== undefined ? { subjectId } : {}),
      lastResult,
      dependencyHandles: [],
      birthScope: registrantScope === OMNI_SCOPE ? null : registrantScope,
    };

    this.deriveAndInstallDependencies(sub, resolved, viewer);

    let bucket = this.registry.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.registry.set(interactive, bucket);
    }
    bucket.set(subscriptionId, sub);

    const result = [...lastResult.values()];
    if (req.silent !== true) {
      const template: Omit<MqlSubscriptionResultEnvelope, 'frameId'> = {
        type: 'mql-subscription-result',
        subscriptionId,
        result,
      };
      viewer.onEnvelope(template);
    }
    return result;
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
        // ⭐ What the viewer perceives, then the head ordinal (D23).
        const many = MqlApi.resolveMany(expandedQuery, ctx);
        const seen = PerceptionApi.perceived(giver, many.stuff, many.ordinal);
        stuffList = cardinality === 'one' ? seen.slice(0, 1) : seen;
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
    const release = PerceptionApi.holdLightSteady();
      try {
      for (const stuff of stuffList) {
        const rec = projectStuffInto(stuff, fields, viewer, detailKey);
        result.push(rec);
      }
    } finally {
      release();
    }

    const template: Omit<MqlQueryResultEnvelope, 'frameId'> = {
      type: 'mql-query-result',
      queryId,
      result,
    };
    viewer.onEnvelope(template);
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
   * moves a socket to a wire body (or back), its cards would otherwise
   * keep rendering the room the player already left (found live: the
   * location card still read "the wire alcove" from inside the circle).
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
   * {@link MqlSubscriptionApi.notifyBelief} (crowded-rooms D2): a viewer's
   * belief about a subject changed — re-project that viewer's rows of that
   * subject, and nobody else's.
   */
  @CallSecurity(MqlSubscriptionApiCallers)
  public notifyBelief(viewerId: string, subjectId: string): void {
    this.routeFire(VIEWER_BELIEF_KIND, 'key', { key: `${viewerId}|${subjectId}` });
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

  /**
   * ⭐⭐ A dependency is the Stuff that was read, with the fields that were
   * read (crowded-rooms D1):
   *
   * - each Stuff projected — top-level or nested inside a descriptor — with
   *   the union of its projected fields' `dependsOnFields`;
   * - each Stuff the query's resolve TOUCHED (`MqlContext.trackTouched`):
   *   any field — a newcomer fires `contents` on the place it was
   *   enumerated from;
   * - the holder, for a query-bound subscription: any field (every
   *   relative seed and every shell variable answers from the asker);
   * - the holder and the subject of a subject-bound one: `container` (the
   *   two facts its perception gate re-reads);
   * - each row showing a `displayName`: the viewer's belief about it.
   *
   * `durableKey` and a descriptor's `changes` sources are unchanged.
   */
  private deriveAndInstallDependencies(
    sub: SubscriptionState,
    read: {
      stuffList: Stuff[];
      touched: Stuff[];
      projected: Map<Stuff, Set<string>>;
      readByDescriptors: Map<Stuff, FieldFilter>;
    },
    viewer: Stuff,
  ): void {
    const seenTuples = new Set<string>();
    const installTuple = (kind: string, by: string, value: unknown, filter: FieldFilter = null): void => {
      const tupleKey = `${kind}|${by}|${describeValue(value)}`;
      if (seenTuples.has(tupleKey)) return;
      seenTuples.add(tupleKey);
      this.indexAdd(kind, by, value, sub, filter);
      sub.dependencyHandles.push({ kind, by, value });
      // The synthetic kinds have no bus behind them — they are poked
      // directly (`notifyDurableSubject`, `notifyBelief`).
      if (kind !== DURABLE_SUBJECT_KIND && kind !== VIEWER_BELIEF_KIND) this.ensureListener(kind, by);
    };

    const targets = new Map<string, FieldFilter>();
    const addTarget = (stuffId: string, filter: FieldFilter): void => {
      targets.set(stuffId, unionFilter(targets.get(stuffId), filter));
    };
    const believed = new Set<string>();

    // Rows: the top-level projection and every nested one, by the fields
    // each projected.
    const rowFields = new Map<Stuff, Set<string>>();
    for (const stuff of read.stuffList) {
      rowFields.set(stuff, new Set(sub.detailKey !== undefined ? [] : sub.fields));
    }
    for (const [stuff, fields] of read.projected) {
      const had = rowFields.get(stuff);
      rowFields.set(stuff, had ? new Set([...had, ...fields]) : new Set(fields));
    }
    const topLevel = new Set(read.stuffList);

    for (const [stuff, fields] of rowFields) {
      const descriptors = collectSubscribableFields(stuff);
      const deps = new Set<string>();
      for (const [name, d] of descriptors) {
        if (topLevel.has(stuff) && sub.detailKey !== undefined) {
          if (!d.perDetailRead) continue;
        } else {
          if (!d.read) continue;
          if (!fields.has(name)) continue;
        }
        if (d.static === true) continue;
        for (const dep of d.dependsOnFields ?? [name]) deps.add(dep);
        if (name === 'displayName') believed.add(stuff.stuffId);

        if (!topLevel.has(stuff)) continue;
        // ⭐ Durable-subject watch — indexed on the ledger's own key, not on
        // a live stuffId, so the poke matches exactly the subject that
        // changed rather than fanning out to everyone.
        if (d.durableKey) {
          const key = d.durableKey(stuff);
          if (key !== undefined) installTuple(DURABLE_SUBJECT_KIND, 'subject', key);
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
      if (deps.size > 0) addTarget(stuff.stuffId, deps);
    }

    for (const t of read.touched) addTarget(t.stuffId, null);
    for (const [t, filter] of read.readByDescriptors) addTarget(t.stuffId, filter);
    const holder = sub.interactive.getHolder() as Stuff | null;
    if (sub.subjectId !== undefined) {
      if (holder) addTarget(holder.stuffId, new Set(['container']));
      addTarget(sub.subjectId, new Set(['container']));
    } else if (holder) {
      addTarget(holder.stuffId, null);
    }

    for (const [stuffId, filter] of targets) {
      installTuple(FieldChangedEvent.KIND, 'target', stuffId, filter);
    }
    for (const subjectId of believed) {
      installTuple(VIEWER_BELIEF_KIND, 'key', `${viewer.stuffId}|${subjectId}`);
    }
  }

  private indexAdd(
    kind: string,
    by: string,
    value: unknown,
    sub: SubscriptionState,
    filter: FieldFilter = null,
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
    let subs = valueMap.get(value);
    if (!subs) {
      subs = new Map();
      valueMap.set(value, subs);
    }
    subs.set(sub, unionFilter(subs.get(sub), filter));
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
    const subs = valueMap.get(value);
    if (!subs) return;
    subs.delete(sub);
    if (subs.size === 0) {
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
    const subs = valueMap.get(value);
    if (!subs || subs.size === 0) return;
    const field = (payload as Record<string, unknown>)['field'];
    for (const [sub, filter] of subs) {
      // ⭐ The field filter (crowded-rooms D1): a card wakes when a Stuff it
      // read fires a field it read.
      if (filter !== null && (typeof field !== 'string' || !filter.has(field))) continue;
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

  /**
   * ⭐⭐ Time-sliced (controllers-are-io D27): a slice of re-resolves, then back
   * to the loop, so thirty cards over one room make a card lag and never a
   * person wait. What is dirtied meanwhile joins the set and coalesces with what
   * has not run yet, so a room that keeps churning does one re-resolve per
   * subscription per pass. One light walk per place per slice: a body's walk-in
   * dirties every card in the room, and each card asks the same light.
   */
  private drainDirty(): void {
    const started = Date.now();
    const deadline = started + DRAIN_SLICE_MS;
    const slice: SubscriptionState[] = [];
    const release = PerceptionApi.holdLightSteady();
    try {
      for (const sub of this.dirty) {
        this.dirty.delete(sub);
        slice.length = 0;
        slice.push(sub);
        this.reresolveAll(slice);
        if (Date.now() >= deadline) break;
      }
    } finally {
      release();
    }
    if (this.dirty.size > 0) {
      // A backlog waits twice what the slice took: cards get a third of the
      // loop at most, and everybody typing gets the rest.
      ScheduleApi.schedule(
        (Date.now() - started) * DRAIN_REST_FACTOR,
        () => this.drainDirty(),
        { propagateAttribution: false },
      );
    } else {
      this.scheduled = false;
    }
  }

  private reresolveAll(subs: SubscriptionState[]): void {
    for (const sub of subs) {
      // Per-subscription root carrying the subscription's effective
      // scope (sandbox): the drain runs on whatever context marked
      // things dirty, so each re-resolve must run as ITS OWN
      // subscription, never the mutator.
      //
      // The effective scope is the CURRENT HOLDER's — a card renders
      // what the body behind it sees, and a socket that follows its
      // player into a circle takes its cards along. Birth scope is the
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

    let resolved: ReturnType<typeof resolveAndProject>;
    try {
        resolved = resolveAndProject(sub, giver, viewer);
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

    // ⭐ The re-resolve that pinned the server over a shop counter: one
    // light walk per place, not one per row (silk's browser walk) — held in
    // `resolveAndProject`.
    const newResult = resolved.rows;

    const changes = this.diff(sub.lastResult, newResult, sub.cardinality);
    sub.lastResult = newResult;

    for (const handle of sub.dependencyHandles) {
      this.indexRemove(handle.kind, handle.by, handle.value, sub);
      if (handle.kind !== DURABLE_SUBJECT_KIND) {
        this.releaseListener(handle.kind, handle.by);
      }
    }
    sub.dependencyHandles = [];
    this.deriveAndInstallDependencies(sub, resolved, viewer);

    if (changes.length === 0) return;

    const template: Omit<MqlSubscriptionDeltaEnvelope, 'frameId'> = {
      type: 'mql-subscription-delta',
      subscriptionId: sub.subscriptionId,
      changes,
    };
    viewer.onEnvelope(template);
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
      /*
       * ⭐⭐ **The answer moved to a different SUBJECT, so it is a
       * removal and an arrival — two changes, not one.**
       *
       * A lone `replace` under a key the consumer has never seen is
       * unapplicable: every consumer finds its record by `stuffId`,
       * misses, and **appends**, so the old subject survives at index 0
       * and the new one lands behind it. The card then renders the room
       * you left, forever, while looking exactly like a card that
       * updates. Found by DRIVING the one live card: walk out of the
       * lounge and the `place` card still says *the lounge*.
       *
       * ⚠ **Two consumers had already worked around this privately**
       * (the shelf's `self` handler says so at length; the retired
       * inspection pane's location handler was the other), which is
       * exactly why it survived — the generic path everything else uses
       * still carried the defect, and each bypass made the next reader
       * likelier to write a third. The fix belongs HERE, once: emit the
       * `remove` the consumer needs, and no consumer needs a bypass.
       */
      if (oldKey !== newKey) {
        changes.push({ op: 'remove', key: oldKey! });
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
      (holder as Stuff & Sensor).onEnvelope(template);
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
      (holder as Stuff & Sensor).onEnvelope(template);
    } else {
      console.warn(
        `MqlSubscriptionApi: cannot deliver query-error envelope (no Sensor holder); ` +
          `queryId=${queryId} reason=${reason}`,
      );
    }
  }
}

