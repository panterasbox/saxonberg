/**
 * SubscriptionApi — THE subscription Api (navigation-server D1). One
 * protocol for every state push, and one facade for it:
 *
 * - **a body's poke** ({@link SubscriptionApi.poke}) — tell a source that
 *   a holder's answer may have changed. Every producer speaks it: the
 *   body's walk to where-you-are, a ledger's write to the MQL source
 *   (`{ durableSubject }`), a claim to the map copy.
 * - **the subscribable-field substrate** — the descriptors a mixin
 *   declares (`SubscribableFieldDescriptor`), `fireFieldChange` at a
 *   setter, `projectFields` / `projectAspect` at a read. Any source
 *   projects through them; the MQL source is the first.
 * - **the one-shot query** (`handleQuery`) the MQL source answers, and
 *   the sandbox reap (`cancelAllForScope`).
 *
 * A session's own subscriptions are verbs on the session —
 * `interactive.subscribe`, `cancelSubscription`, `cancelAllSubscriptions`,
 * `hasSubscription`. The client's `subscribe` names a source by template
 * path; the {@link SubscriptionRegistry} loads it on use, checks it
 * composes `SubscriptionSourceMixin`, stamps `rev`, and sends
 * `subscription-result` / `-delta` / `-error`. No source builds an
 * envelope.
 *
 * Everything with state forwards to the HMR-able {@link SubscriptionLogic}
 * at `/platform/idea/api/subscription`. Read-only by construction: nothing
 * here writes anything a client asks it to (`backend/inbound/README.md`).
 *
 * See `docs/subsystems/subscription.md`.
 */

import type {
  StuffRefRecord,
  StuffDetailRecord,
  StuffDetailFocusRecord,
  MqlSubscriptionErrorReason as _MqlSubscriptionErrorReason,
  MqlSubscriptionParams,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { SenseChannel } from '../lib/description/Perceiver';
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
import { SubscriptionLogic } from '../platform/idea/api/SubscriptionLogic';
import { fileURLToPath } from 'url';
import { ExecutionContextApi } from './execution-context';

// DI seam: re-exported so `MqlSubscriptionRegistry` registers its class
// through this facade rather than importing the logic singleton directly
// (the no-import-from-*Logic rule). The load-time mechanism lives in
// `SubscriptionLogic`; this is a pure pass-through re-export.
export { registerMqlSubscriptionRegistryClass } from '../platform/idea/api/SubscriptionLogic';

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
  /**
   * ⭐ `'way'`: this field is also a FACT of a way it stands in
   * (navigation-server D9) — a boundary's state, its bolt, whether your
   * key fits — projected into the ways section by composition, so a pack's
   * boundary mixin appears with no kernel edit.
   */
  aspect?: 'way';
  /**
   * ⭐ The sense that tells this field (tooltips D3). A one-shot describe
   * drops a `'vision'` field when the viewer's place is too dark to see by,
   * and says so once on the envelope (`dark`). Undeclared = told by no
   * particular sense = never dropped. Declared by the mixin that owns the
   * field (`Visible`), never inferred from its name.
   */
  sense?: SenseChannel;
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
   * returns that key here, and its producer pokes the MQL source with it
   * after the write: `SubscriptionApi.poke(SUBSCRIPTION_SOURCES.mql, null,
   * { durableSubject })`.
   * **No event, no bus, no broadcast** — a direct poke from the one
   * producer to the one consumer, matched exactly on the subject that
   * actually changed.
   *
   * Returns `undefined` when this host has no durable identity (a
   * guest), in which case nothing is indexed.
   */
  durableKey?: (stuff: Stuff) => string | undefined;
}

/**
 * What a live subscription's projection is told while it runs (crowded-rooms
 * D1, D3) — see `SubscriptionApi.collectProjections`. `enter` may return
 * a memoized record (a row none of whose reads has fired since), which
 * `projectFields` returns as is; otherwise the row is projected and `leave`
 * is told what it came to. `read` is a descriptor's own resolve's record.
 *
 * @internal the registry's
 */
export interface ProjectionCollector {
  enter(stuff: Stuff, fields: FieldSet): Record<string, unknown> | undefined;
  leave(stuff: Stuff, fields: FieldSet, record: Record<string, unknown>): void;
  read(stuffs: readonly Stuff[], fields: FieldSet | null): void;
  /** A descriptor's perception filter, memoized per child (crowded-rooms W8). */
  perceives(stuff: Stuff, compute: () => boolean): boolean;
  /**
   * A viewer-INDEPENDENT read shared across every subscription re-resolved
   * until the next field fire anywhere (crowded-rooms W8): thirty room cards
   * resolving one place's membership on one arrival resolve it once.
   */
  shared<T>(key: string, compute: () => T): T;
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
  // ⭐ What it is, really — the template path, always a spoiler (tooltips
  // D6), so a card's head and a tooltip's show the same block.
  'path',
  // ⭐ Who is here, live — a place's "Here" line (navigation-server review).
  'present',
];

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through SubscriptionApi
export function resolveFieldSet(
  spec: FieldSet | FieldAlias | undefined,
): FieldSet {
  if (spec === undefined) return REF_FIELDS;
  if (spec === 'ref') return REF_FIELDS;
  if (spec === 'detail') return DETAIL_FIELDS;
  return spec;
}

/* ──────────────────── Prototype-chain walk ──────────────────── */

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through SubscriptionApi
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

// eslint-disable-next-line no-restricted-syntax -- test-only export (white-box unit test); production callers go through SubscriptionApi
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

/**
 * ⭐ What the MQL source is opened with (navigation-server D1): the wire's
 * {@link MqlSubscriptionParams}, plus `subjectId` — which only a
 * server-side opener (a live card) supplies.
 */
export interface SubscribeRequest extends Omit<MqlSubscriptionParams, 'fields'> {
  fields?: FieldSet | FieldAlias;
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

const LOGIC_PATH = '/platform/idea/api/subscription';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/SubscriptionLogic', import.meta.url)
);

/** Resolve the HMR-able SubscriptionLogic singleton (sync). */
function logic(): SubscriptionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SubscriptionLogic'
      ) as typeof SubscriptionLogic | null) ?? SubscriptionLogic)()
  );
}

/* ─────────────────────── SubscriptionApi ─────────────────── */

export class SubscriptionApi {
  private constructor() {}

  /**
   * ⭐ A body's own poke: the source at `source` is told `holder`'s
   * answer may have changed (`null`: everyone's). `hint` is the source's
   * own vocabulary — the sections that may have changed (where you are),
   * the durable subject a ledger just wrote (`{ durableSubject }`, the MQL
   * source). A source nobody subscribed to is not standing and is not
   * stood up to be told.
   */
  public static poke(source: string, holder: Stuff | null, hint?: unknown): void {
    logic().poke(source, holder, hint);
  }

  /**
   * Compress the noop-check + capture + assign + fire boilerplate at
   * every fact-mixin setter into one call.
   *
   * Lives on `SubscriptionApi` rather than next to `FieldChangedEvent`
   * so the substrate owns its own helpers — the event class stays a
   * pure DTO. Stateless: `SubscriptionApi.fireFieldChange` does not
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
    // ⭐ A live subscription's projection is collecting (crowded-rooms D1,
    // D3): a nested row is a dependency like a top-level one, and a row
    // whose reads have not fired since it was last projected is reused.
    const projector = SubscriptionApi.#projector;
    if (projector !== null) {
      const hit = projector.enter(stuff, fieldNames);
      if (hit !== undefined) return hit;
    }
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
    if (projector !== null) projector.leave(stuff, fieldNames, out);
    return out;
  }

  /**
   * ⭐ Every field `stuff` declares under `aspect` (navigation-server D9),
   * read for `viewer` — a keyed record of words and numbers and booleans,
   * no fixed shape. A read that answers `undefined` is absent.
   */
  public static projectAspect(
    stuff: Stuff,
    aspect: 'way',
    viewer: Stuff & Sensor,
  ): Record<string, string | number | boolean> {
    const out: Record<string, string | number | boolean> = {};
    for (const d of collectSubscribableFields(stuff).values()) {
      if (d.aspect !== aspect || !d.read) continue;
      const v = d.read(stuff, viewer);
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[d.name] = v;
    }
    return out;
  }

  /** A one-shot MQL query (the `query` wire), answered once. */
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

  /** Every open subscription on the protocol, counted. */
  public static _countForTesting(): number {
    SecurityApi.assertTestOnly('_countForTesting');
    return logic()._count();
  }

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

  /** The live projection's collector — see {@link collectProjections}. */
  static #projector: ProjectionCollector | null = null;

  /**
   * True while a live subscription's projection is collecting
   * ({@link collectProjections}) — a descriptor that resolves MQL asks it
   * to track what it read only then. An accessor: unwrapped, free.
   */
  static get collecting(): boolean {
    return SubscriptionApi.#projector !== null;
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
      SecurityPolicies.FromModule('/api/subscription#SubscriptionApi'),
      SecurityPolicies.FromModule('/platform/idea/MqlSubscriptionRegistry'),
    ),
  )
  public static noteRead(stuffs: readonly Stuff[], fields?: FieldSet): void {
    const projector = SubscriptionApi.#projector;
    if (projector === null) return;
    projector.read(stuffs, fields ?? null);
  }

  /**
   * ⭐ A descriptor's perception filter over children, memoized per child
   * inside a live subscription's projection (crowded-rooms W8): a child that
   * has not fired keeps its last answer, so one arrival into a room of
   * thirty asks one new question, not thirty-one. `perceives` is the
   * caller's own gate (the viewer is the subscription's, fixed); outside a
   * projection it is applied plainly.
   *
   * @internal the descriptors' — gated as {@link noteRead}
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('/api/subscription#SubscriptionApi'),
      SecurityPolicies.FromModule('/platform/idea/MqlSubscriptionRegistry'),
    ),
  )
  public static perceivedAmong(list: readonly Stuff[], perceives: (s: Stuff) => boolean): Stuff[] {
    const projector = SubscriptionApi.#projector;
    if (projector === null) return list.filter(perceives);
    return list.filter((s) => projector.perceives(s, () => perceives(s)));
  }

  /**
   * ⭐ A viewer-independent read, shared by every live projection until the
   * next field fire anywhere (crowded-rooms W8) — a place's membership, which
   * all thirty room cards ask on one arrival. Outside a projection it is
   * computed plainly. The key must name everything the read depends on that
   * is not the world's state (its holder, its query).
   *
   * @internal the descriptors' — gated as {@link noteRead}
   */
  @CallSecurity(
    SecurityPolicies.AnyOf(
      SecurityPolicies.FromModule('/api/subscription#SubscriptionApi'),
      SecurityPolicies.FromModule('/platform/idea/MqlSubscriptionRegistry'),
    ),
  )
  public static sharedRead<T>(key: string, compute: () => T): T {
    const projector = SubscriptionApi.#projector;
    return projector === null ? compute() : projector.shared(key, compute);
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
  public static collectProjections<T>(run: () => T, projector: ProjectionCollector): T {
    const prev = SubscriptionApi.#projector;
    SubscriptionApi.#projector = projector;
    try {
      return run();
    } finally {
      SubscriptionApi.#projector = prev;
    }
  }
}

SecurityApi.decorateApiClass(SubscriptionApi);
