/**
 * MqlSubscriptionApi — thin facade over the MQL subscription substrate,
 * plus the stateless projection helpers consumed by the substrate.
 *
 * The registry-backed orchestration + registry resolution live in the
 * hot-reloadable {@link MqlSubscriptionLogic} singleton at
 * `/platform/idea/api/mql-subscription`, reached synchronously via
 * `StuffApi.singletonSync`; the Logic resolves the
 * `MqlSubscriptionRegistry` singleton (at `/platform/idea/MqlSubscriptionRegistry`)
 * where all subscription state (per-Interactive registry, meta-bus
 * dependency index, listener refcount table, dirty queue) actually
 * lives. `dest /platform/idea/api/mql-subscription` reloads the Logic; the
 * Registry's state is unaffected.
 *
 * The Registry's public methods carry a gate that admits this module
 * AND the logic singleton (`FromTemplate('/platform/idea/api/mql-subscription')`),
 * so this Api remains the only legitimate path to mutate or query that
 * state.
 *
 * The stateless projection helpers (`fireFieldChange`, `projectFields`,
 * and the module-level `SubscribableFieldDescriptor` shape,
 * `collectSubscribableFields`, `projectFocus`, `REF_FIELDS` /
 * `DETAIL_FIELDS`, `resolveFieldSet` free functions) stay on this
 * module — they're pure projection primitives consumed by both Api
 * callers and the Registry's internal dispatch pipeline, with no state
 * to host on a Stuff, so they don't move into the Logic.
 */

import type {
  StuffRefRecord,
  StuffDetailRecord,
  StuffDetailFocusRecord,
  MqlSubscriptionErrorReason as _MqlSubscriptionErrorReason,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type Interactive from '../platform/idea/Interactive';
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MixinApi } from './mixin';
import { EventApi } from './event';
import {
  FieldChangedEvent,
  type FieldChangedPayload,
} from '../lib/events/FieldChangedEvent';
import { MqlSubscriptionLogic } from '../platform/idea/api/MqlSubscriptionLogic';
import { fileURLToPath } from 'url';
import { ExecutionContextApi } from './execution-context';

// DI seam: re-exported so `MqlSubscriptionRegistry` registers its class
// through this facade rather than importing the logic singleton directly
// (the no-import-from-*Logic rule). The load-time mechanism lives in
// `MqlSubscriptionLogic`; this is a pure pass-through re-export.
export { registerMqlSubscriptionRegistryClass } from '../platform/idea/api/MqlSubscriptionLogic';

/** Declaration-shaped keep for the wire-error vocabulary import above —
 * the reason strings ride envelopes typed in `@saxonberg/types`; this
 * alias pins the import so the vocabulary stays navigable from here. */
type MqlSubscriptionErrorReason = _MqlSubscriptionErrorReason;
export type { MqlSubscriptionErrorReason };

/* ───────────────────── Public descriptor surface ────────────────── */

export interface ChangeSource {
  on: { readonly KIND: string };
  by: string;
}

export interface SubscribableFieldDescriptor {
  name: string;
  read?: (stuff: Stuff, viewer: Stuff & Sensor) => unknown;
  perDetailRead?: (
    stuff: Stuff,
    detailKey: string,
    viewer: Stuff & Sensor,
  ) => Partial<StuffDetailFocusRecord> | null;
  dependsOnFields?: string[];
  changes?: ChangeSource[];
  static?: true;
  /**
   * ⭐ **Re-resolve me when this durable subject is poked.**
   *
   * The bus indexes on live `stuffId`s. Ledger-derived figures key on a
   * durable `templatePath` instead (`/platform/agent/Avatar/<playerId>`), which no
   * `ChangeSource` can match — a descriptor that tried got silently
   * indexed under `null` and never fired at all.
   *
   * So a descriptor whose value comes from a durable-keyed ledger
   * returns that key here, and its producer calls
   * {@link MqlSubscriptionApi.notifyDurableSubject} after the write.
   * **No event, no bus, no broadcast** — a direct poke from the one
   * producer to the one consumer, matched exactly on the subject that
   * actually changed.
   *
   * Returns `undefined` when this host has no durable identity (a
   * guest), in which case nothing is indexed.
   */
  durableKey?: (stuff: Stuff) => string | undefined;
}

/* ─────────────────────── Field-set aliases ─────────────────────── */

export type FieldAlias = 'ref' | 'detail';
export type FieldSet = readonly string[];

export const REF_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  // ⭐ Rung 1 of the containment read: a ref record now carries HOW it
  // sits in its host (`placement`) and WHETHER it is itself a holder
  // (`holds`), so a container's `contents` projection renders what's on
  // the lid vs in the box and marks the compartments — without a
  // drill-in. Both are omitted when they don't apply (a loose, leaf
  // item carries neither).
  'placement',
  'holds',
];

export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  'shortDescription',
  'longDescription',
  'illustration',
  'illustrationShape',
  'details',
  'bulkMaterial',
  'mass',
  'contents',
  'worn',
  'exits',
  // ⭐ Rung 1: a Placing host's detail card carries the items placed on
  // it, grouped by member with the member's own heading.
  'placed',
  'placement',
  'holds',
];

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through MqlSubscriptionApi
export function resolveFieldSet(
  spec: FieldSet | FieldAlias | undefined,
): FieldSet {
  if (spec === undefined) return REF_FIELDS;
  if (spec === 'ref') return REF_FIELDS;
  if (spec === 'detail') return DETAIL_FIELDS;
  return spec;
}

/* ──────────────────── Prototype-chain walk ──────────────────── */

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through MqlSubscriptionApi
export function collectSubscribableFields(
  stuff: Stuff,
): ReadonlyMap<string, SubscribableFieldDescriptor> {
  const ctor = (stuff as { constructor: unknown })
    .constructor as Parameters<typeof MixinApi.getAllSubscribableFields>[0];
  const mixinDescriptors = MixinApi.getAllSubscribableFields(
    ctor,
  ) as unknown as SubscribableFieldDescriptor[];
  const out = new Map<string, SubscribableFieldDescriptor>();
  for (const d of mixinDescriptors) {
    out.set(d.name, d);
  }
  return out;
}

/* ─────────────────── Focused-detail projection ──────────────── */

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through MqlSubscriptionApi
export function projectFocus(
  stuff: Stuff,
  detailKey: string,
  viewer: Stuff & Sensor,
): StuffDetailFocusRecord {
  const descriptors = collectSubscribableFields(stuff);
  const out: StuffDetailFocusRecord = {
    stuffId: stuff.stuffId,
    detailKey,
  };
  for (const d of descriptors.values()) {
    if (!d.perDetailRead) continue;
    const slice = d.perDetailRead(stuff, detailKey, viewer);
    if (slice == null) continue;
    Object.assign(out, slice);
  }
  return out;
}

/* ───────────────────── Subscription core ─────────────────────── */

export type SubscriptionCardinality = 'one' | 'many';

/** One resolved record, whichever projection produced it. */
export type SubscriptionRecord =
  | (StuffRefRecord & Record<string, unknown>)
  | (StuffDetailRecord & Record<string, unknown>)
  | (StuffDetailFocusRecord & Record<string, unknown>);

export interface SubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  query?: string;
  cardinality?: SubscriptionCardinality;
  fields?: FieldSet | FieldAlias;
  detailKey?: string;
  focusDependent?: boolean;
  locationDependent?: boolean;
  /**
   * ⭐⭐ **Bind this subscription to ONE Stuff, by id, instead of a
   * query.**
   *
   * Every other form is RELATIVE — `here`, `$subject`, `person` all
   * re-answer against whoever is asking, on every wake. That is right
   * for a widget that tracks *your* situation and wrong for a card
   * about a particular thing: a room card subscribed to `here` walks
   * out of the room with you and silently becomes a different room's
   * card, because leaving changes the room's contents, which wakes it,
   * which re-answers `here`.
   *
   * A subject-bound subscription re-resolves the SAME Stuff every time,
   * so it tracks that thing and nothing else.
   *
   * ⚠⚠ **Perception-gated on every re-resolve, not just at mint.** The
   * id is not a capability. Resolving it through `StuffApi.findById`
   * alone would be the ungated `#<stuffId>` seed by another route — a
   * peep-hole into any room whose id you had ever seen on a frame. A
   * subject that stops being perceivable resolves to nothing, and the
   * subscriber is told it went.
   */
  subjectId?: string;
  /**
   * ⭐ Register and resolve, but do NOT emit the initial result
   * envelope — return the records to the caller instead.
   *
   * A LIVE card owns its subscription handle (`instanceId ===
   * subscriptionId`) and carries the first resolve on its own
   * `card-opened`; emitting a second envelope for one open is how a card
   * ends up briefly showing nothing while the client reconciles two
   * shapes for the same content.
   */
  silent?: true;
}

export interface QueryRequest {
  interactive: Interactive;
  queryId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields?: FieldSet | FieldAlias;
  detailKey?: string;
}

/* ─────────────────────── logic resolution ─────────────────── */

const LOGIC_PATH = '/platform/idea/api/mql-subscription';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/MqlSubscriptionLogic', import.meta.url)
);

/** Resolve the HMR-able MqlSubscriptionLogic singleton (sync). */
function logic(): MqlSubscriptionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'MqlSubscriptionLogic'
      ) as typeof MqlSubscriptionLogic | null) ?? MqlSubscriptionLogic)()
  );
}

/* ─────────────────────── MqlSubscriptionApi ─────────────────── */

export class MqlSubscriptionApi {
  private constructor() {}

  /**
   * Compress the noop-check + capture + assign + fire boilerplate at
   * every fact-mixin setter into one call.
   *
   * Lives on `MqlSubscriptionApi` rather than next to `FieldChangedEvent`
   * so the substrate owns its own helpers — the event class stays a
   * pure DTO. Stateless: `MqlSubscriptionApi.fireFieldChange` does not
   * touch any Registry state.
   */
  public static fireFieldChange<T>(
    target: object,
    field: string,
    oldValue: T,
    newValue: T,
  ): T {
    if (Object.is(oldValue, newValue)) {
      return oldValue;
    }
    const stuffId = (target as { stuffId: string }).stuffId;
    ExecutionContextApi.wouldWrite(`${field} fired on ${stuffId}`);
    const payload: FieldChangedPayload = {
      target: stuffId,
      field,
      oldValue,
      newValue,
    };
    EventApi.fire(new FieldChangedEvent(payload));
    return newValue;
  }

  /**
   * Project the named field-set into a flat record. Iterates
   * `fieldNames` in order, looks up each name in the stuff's
   * subscribable-field descriptors, invokes `read(stuff, viewer)`,
   * and omits fields whose descriptor is missing OR whose `read`
   * returns `undefined`. Stateless.
   */
  public static projectFields(
    stuff: Stuff,
    fieldNames: FieldSet,
    viewer: Stuff & Sensor,
  ): Record<string, unknown> {
    // A live subscription's projection is collecting what it projects
    // (crowded-rooms D1): a nested row is a dependency like a top-level one.
    const sink = MqlSubscriptionApi.#projectionSink;
    if (sink !== null) sink(stuff, fieldNames);
    const descriptors = collectSubscribableFields(stuff);
    const out: Record<string, unknown> = { stuffId: stuff.stuffId };
    for (const name of fieldNames) {
      const d = descriptors.get(name);
      if (!d || !d.read) continue;
      // `displayName` is the universal identity field. Render it
      // viewer-aware (recognition / identification / disguise) here, at
      // the client-data projection seam — its descriptor `read` stays
      // viewer-blind so the perception/belief dependency never enters
      // the root `Stuff` module (cycle avoidance). Same
      // `describeFor` routine the prose path uses, so the
      // card and the scrollback can't show different *names*. The
      // activity-status affix is a presence decoration (not identity), so
      // it rides `describeWithStatus` in the prose occupant-listing only,
      // never this general identity field.
      const value =
        name === 'displayName'
          ? stuff.describeFor(viewer)
          : d.read(stuff, viewer);
      if (value === undefined) continue;
      out[name] = value;
    }
    return out;
  }

  /**
   * Register a live subscription; returns its first resolve, or `null`
   * when the subscribe failed (the error envelope has already gone
   * out). See {@link SubscribeRequest.silent}.
   */
  public static handleSubscribe(
    req: SubscribeRequest,
  ): SubscriptionRecord[] | null {
    return logic().handleSubscribe(req);
  }

  public static handleQuery(
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>,
  ): void {
    logic().handleQuery(req);
  }

  /**
   * Cancel every subscription registered from `scope`'s circle context —
   * the sandbox reap seam (a circle's live queries die with its
   * session). Field-born subscriptions are untouched. @internal
   */
  public static cancelAllForScope(scope: string): number {
    return logic().cancelAllForScope(scope);
  }

  /* ─── test seams ─── */

  public static _getRegistrySizeForTesting(): number {
    SecurityApi.assertTestOnly('_getRegistrySizeForTesting');
    return logic()._getRegistrySize();
  }

  public static _getDependencyIndexEntryCountForTesting(): number {
    SecurityApi.assertTestOnly('_getDependencyIndexEntryCountForTesting');
    return logic()._getDependencyIndexEntryCount();
  }

  public static async _drainScheduledForTesting(): Promise<void> {
    SecurityApi.assertTestOnly('_drainScheduledForTesting');
    await logic()._drainScheduled();
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    logic()._clearAll();
  }

  /**
   * ⭐ **The durable-subject witness.** Re-resolve every subscription
   * whose fields declared {@link SubscribableFieldDescriptor.durableKey}
   * equal to `subject`.
   *
   * Called directly by a ledger after it persists a row — no event
   * class, no `EventApi` fire. The bus is for genuinely global
   * broadcast; this is one known producer poking one known consumer,
   * which is a method call.
   */
  public static notifyDurableSubject(subject: string): void {
    logic().notifyDurableSubject(subject);
  }

  /**
   * ⭐ A viewer's belief about a subject changed (crowded-rooms D2) — they
   * learned who someone is, their regard moved, a disguise was seen through.
   * Re-projects that viewer's rows of that subject and nobody else's: the
   * `notifyDurableSubject` shape with a second key kind. Called by the
   * `BeliefStore` mutators.
   */
  public static notifyBelief(viewerId: string, subjectId: string): void {
    logic().notifyBelief(viewerId, subjectId);
  }

  /** The live projection's collector — see {@link collectProjections}. */
  static #projectionSink: ((stuff: Stuff, fields: FieldSet | null, read?: true) => void) | null = null;

  /**
   * True while a live subscription's projection is collecting
   * ({@link collectProjections}) — a descriptor that resolves MQL asks it
   * to track what it read only then. An accessor: unwrapped, free.
   */
  static get collecting(): boolean {
    return MqlSubscriptionApi.#projectionSink !== null;
  }

  /**
   * A descriptor's own resolve READ these (its `touched`): each is a
   * dependency of the subscription projecting it, on `fields` — a
   * descriptor that enumerates a holder's children names the fields that
   * decide MEMBERSHIP (a cup taken off a desk onto the floor is new to the
   * room's loose contents, and the room's resolve had enumerated it); what
   * a child SHOWS is its own projected row's. Omitted `fields` = any.
   * A no-op outside {@link collectProjections} (crowded-rooms D1).
   *
   * @internal the descriptors' — it does anything only inside
   * {@link collectProjections}, whose own frame is the caller a descriptor's
   * plain `read` runs under; gated to that frame (or the registry), never
   * eval.
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('/api/mql-subscription#MqlSubscriptionApi'),
      SecurityPolicies.FromModule('/platform/idea/MqlSubscriptionRegistry'),
    ),
  )
  public static noteRead(stuffs: readonly Stuff[], fields?: FieldSet): void {
    const sink = MqlSubscriptionApi.#projectionSink;
    if (sink === null) return;
    for (const s of stuffs) sink(s, fields ?? null, true);
  }

  /**
   * Run a live subscription's projection, telling `onProject` every Stuff
   * {@link projectFields} projects inside it and with what fields — a
   * descriptor's nested row is a dependency like a top-level one
   * (crowded-rooms D1). Synchronous; nests.
   *
   * @internal the registry's
   */
  @CallSecurity(SecurityPolicies.FromModule('/platform/idea/MqlSubscriptionRegistry'))
  public static collectProjections<T>(
    run: () => T,
    onProject: (stuff: Stuff, fields: FieldSet | null, read?: true) => void,
  ): T {
    const prev = MqlSubscriptionApi.#projectionSink;
    MqlSubscriptionApi.#projectionSink = onProject;
    try {
      return run();
    } finally {
      MqlSubscriptionApi.#projectionSink = prev;
    }
  }
}

SecurityApi.decorateApiClass(MqlSubscriptionApi);
