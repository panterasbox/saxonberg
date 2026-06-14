/**
 * MqlSubscriptionApi — thin facade over the MQL subscription substrate,
 * plus the stateless projection helpers consumed by the substrate.
 *
 * The registry-backed orchestration + registry resolution live in the
 * hot-reloadable {@link MqlSubscriptionLogic} singleton at
 * `/obj/api/mql-subscription`, reached synchronously via
 * `StuffApi.singletonSync`; the Logic resolves the
 * `MqlSubscriptionRegistry` singleton (at `/obj/MqlSubscriptionRegistry`)
 * where all subscription state (per-Interactive registry, meta-bus
 * dependency index, listener refcount table, dirty queue) actually
 * lives. `dest /obj/api/mql-subscription` reloads the Logic; the
 * Registry's state is unaffected.
 *
 * The Registry's public methods carry a gate that admits this module
 * AND the logic singleton (`FromTemplate('/obj/api/mql-subscription')`),
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
  StuffDetailFocusRecord,
  MqlSubscriptionErrorReason as _MqlSubscriptionErrorReason,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type Interactive from '../obj/Interactive';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { MixinApi } from './mixin';
import { EventApi } from './event';
import { RecognitionApi } from './recognition';
import {
  FieldChangedEvent,
  type FieldChangedPayload,
} from '../lib/events/FieldChangedEvent';
import { MqlSubscriptionLogic } from '../obj/api/MqlSubscriptionLogic';
import { fileURLToPath } from 'url';

void (undefined as unknown as _MqlSubscriptionErrorReason);

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
}

/* ─────────────────────── Field-set aliases ─────────────────────── */

export type FieldAlias = 'ref' | 'detail';
export type FieldSet = readonly string[];

export const REF_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
];

export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  'shortDescription',
  'longDescription',
  'illustration',
  'details',
  'bulkMaterial',
  'mass',
  'contents',
  'exits',
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

export interface SubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields?: FieldSet | FieldAlias;
  detailKey?: string;
  focusDependent?: boolean;
  locationDependent?: boolean;
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

const LOGIC_PATH = '/obj/api/mql-subscription';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/MqlSubscriptionLogic', import.meta.url)
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
      // `RecognitionApi.describe` routine the prose path uses, so the
      // pane and the scrollback can't show different names.
      const value =
        name === 'displayName'
          ? RecognitionApi.describe(viewer, stuff)
          : d.read(stuff, viewer);
      if (value === undefined) continue;
      out[name] = value;
    }
    return out;
  }

  public static handleSubscribe(req: SubscribeRequest): void {
    logic().handleSubscribe(req);
  }

  public static handleQuery(
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>,
  ): void {
    logic().handleQuery(req);
  }

  public static handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string,
  ): void {
    logic().handleUnsubscribe(interactive, subscriptionId);
  }

  public static cancelAllForInteractive(interactive: Interactive): void {
    logic().cancelAllForInteractive(interactive);
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
}

SecurityApi.decorateApiClass(MqlSubscriptionApi);
