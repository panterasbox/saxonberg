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
import type Interactive from '../platform/idea/Interactive';
import { SecurityApi } from './security';
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
}

SecurityApi.decorateApiClass(SubscriptionApi);
