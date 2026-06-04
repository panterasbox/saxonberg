/**
 * MqlSubscriptionApi — server-side substrate for live MQL queries.
 *
 * Wave 3 ships the field-projection mechanism:
 *
 *   - `SubscribableFieldDescriptor` shape (with both flat `read` and
 *     focused-detail `perDetailRead` slots),
 *   - `collectSubscribableFields(stuff)` — walk the prototype chain
 *     unioning each mixin's `static subscribableFields` declarations
 *     and overlay the substrate-synthetic table,
 *   - `projectFields(stuff, fieldNames, viewer)` — flat per-mixin
 *     projection,
 *   - `projectFocus(stuff, detailKey, viewer)` — focused-detail merge
 *     across every mixin's `perDetailRead` partial,
 *   - field-set aliases (`'ref'` / `'detail'`),
 *   - the substrate-synthetic field table (v1: just `displayName`).
 *
 * Waves 4–6 grow the file:
 *   - Wave 4 lands the registry, meta-bus dependency index,
 *     `setImmediate`-batched dirty scheduler, diff algorithm,
 *     `handleSubscribe` / `handleUnsubscribe` / `cancelAllForInteractive`,
 *     and the error envelopes.
 *   - Wave 5 wires `Application.processUserMessage` routing.
 *   - Wave 6 lights up the end-to-end integration test.
 *
 * The substrate stays viewer-aware end-to-end: every descriptor
 * accepts a `viewer: Stuff & Sensor` and threads it to the leaf,
 * even though several v1 readers ignore it. The recognition / shadow
 * pipeline plugs in here without further reshaping.
 *
 * See `docs/requirements/mql-subscription-substrate-requirements.md`
 * and `docs/plans/mql-subscription-substrate-plan.md` for context.
 */

import type {
  StuffRefRecord,
  StuffDetailRecord,
  StuffDetailFocusRecord,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import { SecurityApi } from './security';
import { DescribeApi } from './describe';
import { MixinApi } from './mixin';
import { FieldChangedEvent } from '../lib/events/FieldChangedEvent';
import { ShadowChangedEvent } from '../lib/events/ShadowChangedEvent';

/* ───────────────────── Public descriptor surface ────────────────── */

/**
 * A `ChangeSource` identifies an event class + payload-attribute that
 * the meta-bus dispatcher should index by. When a matching event
 * fires, every subscription whose descriptor declared this source
 * gets marked dirty.
 *
 * `on` is the event-class constructor (must have a static `KIND`).
 * `by` is the payload attribute name the dispatcher reads to select
 * subscribers. Common values:
 *
 *   - `'target'` — index by the affected `stuffId` (re-resolve all
 *     subscriptions that mention this Stuff in their result set).
 *   - `'field'` — index by the mixin-declared field name (a finer
 *     grain that fires only for descriptors covering that exact
 *     field). v1 dispatcher uses both dimensions; Wave 4 wires it.
 */
export interface ChangeSource {
  on: { readonly KIND: string };
  by: string;
}

/**
 * Per-field projection descriptor declared on a mixin's static
 * `subscribableFields` array (or in the substrate-synthetic table).
 *
 * Each descriptor describes a single wire field:
 *
 *   - `name` — the key the field surfaces on `StuffRefRecord` /
 *     `StuffDetailRecord` / `StuffDetailFocusRecord`. The substrate
 *     keys descriptors by this name.
 *   - `read` — flat projection (no focused detail). Invoked when the
 *     subscription is in flat mode AND `name` is in the requested
 *     field-set. Return `undefined` to omit the field from the
 *     record (e.g., when the mixin's data isn't populated). The
 *     `viewer` parameter is reserved for recognition; v1 readers
 *     may ignore it.
 *   - `perDetailRead` — focused-detail projection. Invoked once per
 *     focus-mode subscription. Return a partial record carrying
 *     this mixin's slice for the focus key, or `null` to contribute
 *     nothing. Substrate merges every contributing slice via
 *     `Object.assign` into a `StuffDetailFocusRecord`. A descriptor
 *     without `perDetailRead` is skipped in focus mode.
 *   - `changes` — dependency declarations. Each entry tells the
 *     meta-bus dispatcher which (EventClass, attribute) pair should
 *     mark this field's subscriptions dirty.
 *   - `static` — optional. `true` means the field never changes
 *     after initial projection; the dependency index skips it.
 */
export interface SubscribableFieldDescriptor {
  name: string;
  read?: (stuff: Stuff, viewer: Stuff & Sensor) => unknown;
  perDetailRead?: (
    stuff: Stuff,
    detailKey: string,
    viewer: Stuff & Sensor,
  ) => Partial<StuffDetailFocusRecord> | null;
  changes: ChangeSource[];
  static?: true;
}

/* ─────────────────────── Field-set aliases ─────────────────────── */

export type FieldAlias = 'ref' | 'detail';
export type FieldSet = readonly string[];

/**
 * Default field set for the `'ref'` alias — what a `StuffRefRecord`
 * carries on the wire. Two fields: `displayName` (always present;
 * baked-in `'something'` default) and `quantity` (Globbable hosts
 * only; substrate omits when the descriptor returns `undefined`).
 */
export const REF_FIELDS: FieldSet = ['displayName', 'quantity'];

/**
 * Default field set for the `'detail'` alias — what a
 * `StuffDetailRecord` carries on the wire. Adds Visible's two
 * description fields, Detailed's `details` enumeration, and
 * Tangible's `bulkMaterial` + `mass` on top of the ref surface.
 */
export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'shortDescription',
  'longDescription',
  'details',
  'bulkMaterial',
  'mass',
];

/**
 * Resolve a caller's field-set spec to the concrete `FieldSet` the
 * projection iterates. `undefined` defaults to `'ref'` (the wire-
 * thin default for live result sets). An explicit array passes
 * through unchanged.
 */
export function resolveFieldSet(
  spec: FieldSet | FieldAlias | undefined,
): FieldSet {
  if (spec === undefined) return REF_FIELDS;
  if (spec === 'ref') return REF_FIELDS;
  if (spec === 'detail') return DETAIL_FIELDS;
  return spec;
}

/* ─────────────────── Substrate-synthetic fields ────────────────── */

/**
 * v1 contains exactly one entry — `displayName`. Quantity lives on
 * `GlobbableMixin`'s `subscribableFields` (mixin-owned state, mixin-
 * owned setter, mixin-owned event firing). This table is reserved
 * for cross-cutting renders that no single mixin owns; future
 * additions are code edits here.
 *
 * The `displayName` descriptor routes through `DescribeApi.getDisplayName`
 * which is reshape-guaranteed to return a string (`'something'`
 * baked-in default for hosts without Named / Visible state). Viewer
 * is threaded to the leaf even though the v1 body ignores it —
 * recognition / DescribeApi v2 plugs in here without further
 * reshaping. ShadowChangedEvent is listed so re-projection lights
 * up automatically when the shadow lifecycle starts firing.
 */
const SUBSTRATE_SYNTHETIC_FIELDS: ReadonlyMap<string, SubscribableFieldDescriptor> =
  new Map<string, SubscribableFieldDescriptor>([
    [
      'displayName',
      {
        name: 'displayName',
        read: (stuff, viewer) => DescribeApi.getDisplayName(stuff, viewer),
        changes: [
          { on: FieldChangedEvent, by: 'target' },
          { on: ShadowChangedEvent, by: 'target' },
        ],
      },
    ],
  ]);

/* ──────────────────── Mixin composition walk ──────────────────── */

/**
 * Collect every subscribable-field descriptor a `stuff` exposes,
 * keyed by descriptor `name`. Walks the prototype chain via
 * `MixinApi.getAllSubscribableFields` and overlays the substrate-
 * synthetic table for names no mixin owns.
 *
 * Precedence: mixin-declared descriptors win over the substrate-
 * synthetic table on name collision (mixin sovereignty). v1 has no
 * such collisions — the synthetic table is curated to fill gaps,
 * not to compete with mixin state.
 */
export function collectSubscribableFields(
  stuff: Stuff,
): ReadonlyMap<string, SubscribableFieldDescriptor> {
  const ctor = (stuff as { constructor: unknown })
    .constructor as Parameters<typeof MixinApi.getAllSubscribableFields>[0];
  // MixinApi returns a structural shape (it lives below mql-
  // subscription.ts in the layering and can't import the strict
  // descriptor type without a cycle); cast back at the seam.
  const mixinDescriptors = MixinApi.getAllSubscribableFields(
    ctor,
  ) as unknown as SubscribableFieldDescriptor[];
  const out = new Map<string, SubscribableFieldDescriptor>();
  for (const d of mixinDescriptors) {
    out.set(d.name, d);
  }
  for (const [name, d] of SUBSTRATE_SYNTHETIC_FIELDS) {
    if (!out.has(name)) {
      out.set(name, d);
    }
  }
  return out;
}

/* ─────────────────────── Flat projection ─────────────────────── */

/**
 * Project the named field-set into a flat record. Iterates
 * `fieldNames` in order, looks up each name in
 * `collectSubscribableFields(stuff)`, invokes `read(stuff, viewer)`,
 * and omits fields whose descriptor is missing OR whose `read`
 * returns `undefined`.
 *
 * The returned object is plain — callers cast to `StuffRefRecord`
 * or `StuffDetailRecord` at the wire boundary.
 */
export function projectFields(
  stuff: Stuff,
  fieldNames: FieldSet,
  viewer: Stuff & Sensor,
): Record<string, unknown> {
  const descriptors = collectSubscribableFields(stuff);
  const out: Record<string, unknown> = { stuffId: stuff.stuffId };
  for (const name of fieldNames) {
    const d = descriptors.get(name);
    if (!d || !d.read) continue;
    const value = d.read(stuff, viewer);
    if (value === undefined) continue;
    out[name] = value;
  }
  return out;
}

/* ─────────────────── Focused-detail projection ──────────────── */

/**
 * Project the focused-detail view at `detailKey` by merging every
 * descriptor's `perDetailRead` partial via `Object.assign`. Each
 * mixin owns its slice's field names; the substrate keeps no
 * central knowledge of detail shape.
 *
 * `null` slices (a descriptor that returns nothing for this key)
 * are skipped — they contribute no fields to the merged record. A
 * descriptor without `perDetailRead` is skipped entirely (so flat-
 * only fields like NamedMixin's `name` never appear in focus
 * records).
 *
 * The returned record always carries `{ stuffId, detailKey }`;
 * other fields appear when contributing mixins are composed.
 */
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

/* ─────────────────────── MqlSubscriptionApi ─────────────────── */

/**
 * Wave 3 surface: just the substrate-synthetic table accessor for
 * tests. Waves 4–6 grow this class with the registry, meta-bus
 * dispatcher, scheduler, and the subscribe / unsubscribe / cleanup
 * methods.
 */
export class MqlSubscriptionApi {
  /**
   * Test seam — read the substrate-synthetic field table. Sealed
   * via `SecurityApi.assertTestOnly`. @internal
   */
  public static _getSubstrateSyntheticFields(): ReadonlyMap<
    string,
    SubscribableFieldDescriptor
  > {
    SecurityApi.assertTestOnly('_getSubstrateSyntheticFields');
    return SUBSTRATE_SYNTHETIC_FIELDS;
  }
}

SecurityApi.decorateApiClass(MqlSubscriptionApi);
