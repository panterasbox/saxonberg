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
  Change,
  MqlSubscriptionErrorReason,
  MqlSubscriptionResultEnvelope,
  MqlSubscriptionDeltaEnvelope,
  MqlSubscriptionErrorEnvelope,
  MqlQueryResultEnvelope,
  MqlQueryErrorEnvelope,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Sensor } from '../lib/message/Sensor';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Interactive } from '../obj/Interactive';
import type { Subscription } from './event';
import { SecurityApi } from './security';
import { DescribeApi } from './describe';
import { MixinApi } from './mixin';
import { MqlApi } from './mql';
import { MqlPermissionError } from './mql/types';
import { EventApi } from './event';
import { MessageApi } from './message';
import { ShellApi } from './shell';
import { FieldChangedEvent, type FieldChangedPayload } from '../lib/events/FieldChangedEvent';
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
 * Per-field projection descriptor declared on a class's static
 * `subscribableFields` array. Mixin layers declare their state-bearing
 * fields; `Stuff` itself declares universal cross-cutting renders
 * (e.g., `displayName`).
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
 *   - `dependsOnFields` — the **source field names** whose
 *     `FieldChangedEvent` fires should mark this descriptor dirty.
 *     For a primitive descriptor, the convention is "descriptor
 *     name matches the setter's `field` discriminator," so leaving
 *     this unset defaults to `[descriptor.name]`. For derived /
 *     cross-cutting renders (`displayName` from `name` +
 *     `shortDescription`), declare the leaf source field names
 *     explicitly. Authors handle the closure manually in v1: if
 *     `articleName` depends on `displayName` which depends on
 *     `name`, declare `articleName`'s deps as `['name', ...]`.
 *   - `changes` — escape hatch for non-`FieldChangedEvent`
 *     dependencies. Common case: `ShadowChangedEvent` (a shadow
 *     attaching can change a computed value without firing a field
 *     change). Substrate installs these entries in addition to the
 *     field-event entries from `dependsOnFields`.
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
  /**
   * Source field names this descriptor's value derives from. Defaults
   * to `[descriptor.name]` when omitted (the primitive case).
   * Substrate installs one `(FieldChangedEvent.KIND, 'field', dep)`
   * dependency-index entry per dep.
   */
  dependsOnFields?: string[];
  changes?: ChangeSource[];
  static?: true;
}

/* ─────────────────────── Field-set aliases ─────────────────────── */

export type FieldAlias = 'ref' | 'detail';
export type FieldSet = readonly string[];

/**
 * Default field set for the `'ref'` alias — what a `StuffRefRecord`
 * carries on the wire. Fields:
 *
 *   - `displayName` (always present; baked-in `'something'` default).
 *   - `quantity` (Globbable hosts only; substrate omits when the
 *     descriptor returns `undefined`).
 *   - `primaryKeyword` (Perceptible hosts only; substrate omits when
 *     the descriptor returns `undefined`). Carried on every ref
 *     record so client renderers can route `<item>`/`<name>` clicks
 *     to `look <primaryKeyword>` rather than the surface label.
 */
export const REF_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
];

/**
 * Default field set for the `'detail'` alias — what a
 * `StuffDetailRecord` carries on the wire. Adds Visible's two
 * description fields, Detailed's `details` enumeration, Tangible's
 * `bulkMaterial` + `mass`, and Container's `contents` (a per-viewer-
 * filtered list of `StuffRefRecord`-shape children) on top of the
 * ref surface.
 */
export const DETAIL_FIELDS: FieldSet = [
  'displayName',
  'quantity',
  'primaryKeyword',
  'shortDescription',
  'longDescription',
  'details',
  'bulkMaterial',
  'mass',
  'contents',
  'exits',
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

/* ──────────────────── Prototype-chain walk ──────────────────── */

/**
 * Collect every subscribable-field descriptor a `stuff` exposes,
 * keyed by descriptor `name`. Walks the prototype chain via
 * `MixinApi.getAllSubscribableFields`, which `hasOwnProperty`-checks
 * `static subscribableFields` at every level — including `Stuff`
 * itself, where universal cross-cutting renders (`displayName`) live.
 *
 * No substrate-synthetic overlay: there's only one mechanism. A
 * cross-cutting render that doesn't fit any mixin (because it
 * applies to every Stuff) lands on `Stuff.subscribableFields`. A
 * cross-cutting render gated by a specific mixin lands on that
 * mixin's `subscribableFields`. Descriptor authoring is uniform.
 *
 * Last-wins on name collision (the walk pushes leaf-first, so a
 * subclass override naturally beats the parent). Identical descriptor
 * names across unrelated mixins are a content / design bug.
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

/* ───────────────────── Subscription core ─────────────────────── */

export type SubscriptionCardinality = 'one' | 'many';

/**
 * Caller-facing subscribe payload — what `Application.processUserMessage`
 * forwards from the inbound `MqlSubscribeMessage`. The substrate's
 * direct API consumers (Wave 5 inbound dispatcher, future programmatic
 * use) share this shape.
 *
 * The query string can reference shell variables (`$focus`, etc.);
 * the substrate runs `ShellApi.expandVariables` against the holder
 * before each (re-)resolve so the variable expands fresh every tick.
 * This is what makes a `$focus` subscription re-resolve correctly
 * when `setFocus` fires.
 */
export interface SubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields?: FieldSet | FieldAlias;
  /**
   * When present, projection runs in focused-detail mode. Requires
   * `cardinality === 'one'`; a `'many'` subscribe with a `detailKey`
   * is rejected with `reason: 'parse'`. The `fields` parameter is
   * ignored in focus mode.
   */
  detailKey?: string;
  /**
   * When true, the substrate installs an additional
   * `(FieldChangedEvent.KIND, 'field', 'focus')` dependency entry
   * against the *subscription holder* at subscribe time — in
   * addition to the per-result-Stuff descriptor walk.
   *
   * Rationale: for a query like `$focus`, the result set is whatever
   * the focus fragment resolves to — NOT the FocusedMixin host. The
   * natural descriptor walk would miss the focus dependency entirely.
   * This explicit opt-in lets such subscriptions wake on the holder's
   * `setFocus` / `clearFocus` field-change fires.
   *
   * Off by default; opt in per subscription.
   */
  focusDependent?: boolean;
  /**
   * Parallel to `focusDependent`. Installs a dependency on the
   * holder's `container` field so the subscription wakes on
   * `Containable.setContainer` fires — used by client subscriptions
   * that track the player's physical position independently of what
   * they're focused on (e.g., a `here` query for the current room).
   * Off by default.
   */
  locationDependent?: boolean;
}

/**
 * Caller-facing one-shot query payload — what
 * `Application.processUserMessage` forwards from the inbound
 * `MqlQueryMessage`. The substrate reuses ONLY the parse + resolve +
 * project pipeline: no registration, no dependency-index entries, no
 * listener installation.
 *
 * `focusDependent` / `locationDependent` are meaningless for one-shot
 * reads (no subscription state to wake) and are not carried.
 */
export interface QueryRequest {
  interactive: Interactive;
  queryId: string;
  query: string;
  cardinality: SubscriptionCardinality;
  fields?: FieldSet | FieldAlias;
  /**
   * When present, projection runs in focused-detail mode. Requires
   * `cardinality === 'one'`; a `'many'` query with a `detailKey` is
   * rejected with `reason: 'parse'`.
   */
  detailKey?: string;
}

/**
 * Internal per-subscription state held in the registry. The
 * `dependencyHandles` array records every entry the subscription
 * installed into the meta-bus index so cancellation is a single
 * pass. `lastResult` lets the diff stage compute deltas against
 * the previously emitted records.
 */
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
}

type RecordValue =
  | (StuffRefRecord & Record<string, unknown>)
  | (StuffDetailRecord & Record<string, unknown>)
  | (StuffDetailFocusRecord & Record<string, unknown>);

interface DependencyHandle {
  kind: string;       // EventClass.KIND
  by: string;         // payload-attribute name
  value: unknown;     // payload-attribute value to match
}

/* ─────────────────────── MqlSubscriptionApi ─────────────────── */

/**
 * MqlSubscriptionApi — server-side substrate routing `mql-subscribe`
 * / `mql-unsubscribe` traffic. See file-top comment for the wave
 * decomposition.
 *
 * Wave 4 surface:
 *
 *   - `handleSubscribe(req)` — register a subscription, project the
 *     initial result, install meta-bus listeners, emit the result
 *     envelope (or the error envelope on failure).
 *   - `handleUnsubscribe(interactive, subscriptionId)` — silent no-op
 *     on unknown id; otherwise deregister listeners + dependency
 *     entries and drop the registry slot.
 *   - `cancelAllForInteractive(interactive)` — teardown all
 *     subscriptions held by the Interactive. Called from
 *     `Application.handleUserDisconnect` (Wave 5).
 *
 * Test seams (under `SecurityApi.assertTestOnly`):
 *
 *   - `_getRegistrySizeForTesting()` — total per-Interactive
 *     subscriptions across the registry.
 *   - `_getDependencyIndexEntryCountForTesting()` — sum of every
 *     subscription-membership across the 3-level index. Zero after
 *     a clean teardown.
 *   - `_drainScheduledForTesting()` — flush the setImmediate-batched
 *     dirty pass synchronously for tests.
 *   - `_clearAllForTesting()` — wipe registry + index + listeners.
 */
export class MqlSubscriptionApi {
  // Per-Interactive registry. Each Interactive's slot holds a
  // sub-map keyed by subscriptionId.
  static #registry = new Map<Interactive, Map<string, SubscriptionState>>();

  // Meta-bus dependency index. Three-level Map: KIND → by → value
  // → Set<SubscriptionState>. The dispatcher reads
  // payload[by] and looks up that bucket.
  static #index = new Map<
    string,
    Map<string, Map<unknown, Set<SubscriptionState>>>
  >();

  // Installed-listener side table. Keyed by (KIND, by) — one
  // EventApi.on listener per pair, refcounted across the
  // subscriptions that need it. The substrate calls
  // `subscription.unsubscribe()` only when refcount reaches zero.
  static #listeners = new Map<
    string,
    Map<string, { sub: Subscription<unknown>; refcount: number }>
  >();

  // Dirty set + scheduled-flag for the setImmediate-batched
  // re-resolve pass.
  static #dirty = new Set<SubscriptionState>();
  static #scheduled = false;

  /**
   * Compress the noop-check + capture + assign + fire boilerplate at
   * every fact-mixin setter into one call.
   *
   * Caller pattern:
   *
   *   setName(value: string): void {
   *     this.name = MqlSubscriptionApi.fireFieldChange(
   *       this, 'name', this.name, value,
   *     );
   *   }
   *
   * Strict-equals (`Object.is`) compares old vs new. On equal, skip
   * emission and return `oldValue`. On change, fire
   * `FieldChangedEvent` and return `newValue`. Either way the caller
   * assigns the return value, so the setter body stays one line.
   *
   * Opt-in: a setter with side-effects beyond the assign (Detailed's
   * Map mutations, Tangible's bulk-vs-detail discrimination,
   * Propertied's marshaller boundary) inlines the fire instead.
   *
   * Lives on `MqlSubscriptionApi` rather than next to
   * `FieldChangedEvent` so the substrate owns its own helpers — the
   * event class stays a pure DTO.
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
   * Register a subscription. See class docstring for behavior.
   */
  public static handleSubscribe(req: SubscribeRequest): void {
    const { interactive, subscriptionId } = req;

    // Duplicate-id check (defense-in-depth — Wave 5 dispatcher also
    // validates, but direct callers reach here too).
    const perInteractive = this.#registry.get(interactive);
    if (perInteractive && perInteractive.has(subscriptionId)) {
      this.#emitError(
        interactive,
        subscriptionId,
        'parse',
        'duplicate subscriptionId',
      );
      return;
    }

    if (typeof req.query !== 'string') {
      this.#emitError(
        interactive,
        subscriptionId,
        'parse',
        'query required',
      );
      return;
    }
    if (req.cardinality !== 'one' && req.cardinality !== 'many') {
      this.#emitError(
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
    const locationDependent = req.locationDependent === true;

    // Focus + cardinality cross-check.
    if (detailKey !== undefined && cardinality !== 'one') {
      this.#emitError(
        interactive,
        subscriptionId,
        'parse',
        'detailKey requires cardinality one',
      );
      return;
    }

    // Holder resolution. v1 demands holder composes both
    // CommandGiver (for MQL ctx) AND Sensor (for descriptor projection
    // / envelope delivery via `MessageApi.sendEnvelope`).
    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      this.#emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose CommandGiver',
      );
      return;
    }
    if (!MixinApi.isSensor(holder)) {
      this.#emitError(
        interactive,
        subscriptionId,
        'permission',
        'subscription holder must compose Sensor',
      );
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    // Initial resolve. The query string can reference shell
    // variables (`$focus`, etc.); expand against the holder before
    // each (re-)resolve so the variable expands fresh every tick.
    // Same pattern the dispatcher uses for `scope:` declarations
    // in command YAML.
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
      this.#emitError(
        interactive,
        subscriptionId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }

    // Build initial lastResult records.
    const lastResult = new Map<string, RecordValue>();
    for (const stuff of stuffList) {
      const rec = this.#projectStuff(stuff, fields, viewer, detailKey);
      lastResult.set(stuff.stuffId, rec);
    }

    // Build subscription state. Store the raw (unexpanded) query so
    // re-resolve runs ShellApi.expandVariables fresh on each tick.
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
    };

    // Derive dependency handles from the descriptors driving this
    // mode's projection.
    this.#deriveAndInstallDependencies(sub, stuffList);

    // Register.
    let bucket = this.#registry.get(interactive);
    if (!bucket) {
      bucket = new Map();
      this.#registry.set(interactive, bucket);
    }
    bucket.set(subscriptionId, sub);

    // Emit initial result envelope.
    const result = [...lastResult.values()];
    const template: Omit<MqlSubscriptionResultEnvelope, 'frameId'> = {
      type: 'mql-subscription-result',
      subscriptionId,
      result,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  /**
   * One-shot read. Reuses ONLY the substrate's parse + resolve +
   * project pipeline — NO registration in `#registry`, NO
   * dependency-index entries, NO listener installation. Emits one
   * {@link MqlQueryResultEnvelope} (success) or one
   * {@link MqlQueryErrorEnvelope} (failure) per call.
   *
   * Holder / cardinality / canonical-kind checks mirror
   * {@link handleSubscribe} so a client's error-handling code can
   * branch by `reason` uniformly across subscribes and queries. The
   * `focusDependent` flag on a registered kind is meaningless for a
   * one-shot read and is ignored.
   *
   * The "share the pipeline, skip the state" pattern: programmatic
   * one-shot reads inside the server should call
   * `MqlApi.resolveOne` / `resolveMany` + `projectFields` directly;
   * this surface is the wire-facing channel.
   */
  public static handleQuery(
    // This is the wire-facing entry, so `query` / `cardinality` arrive
    // unvalidated and are checked below — the param type reflects that
    // rather than claiming a fully-formed QueryRequest.
    req: Omit<QueryRequest, 'query' | 'cardinality'> &
      Partial<Pick<QueryRequest, 'query' | 'cardinality'>>
  ): void {
    const { interactive, queryId } = req;

    if (typeof req.query !== 'string') {
      this.#emitQueryError(
        interactive,
        queryId,
        'parse',
        'query required',
      );
      return;
    }
    if (req.cardinality !== 'one' && req.cardinality !== 'many') {
      this.#emitQueryError(
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

    // Focus + cardinality cross-check (mirrors handleSubscribe).
    if (detailKey !== undefined && cardinality !== 'one') {
      this.#emitQueryError(
        interactive,
        queryId,
        'parse',
        'detailKey requires cardinality one',
      );
      return;
    }

    // Holder resolution (mirrors handleSubscribe).
    const holder = interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder)) {
      this.#emitQueryError(
        interactive,
        queryId,
        'permission',
        'query holder must compose CommandGiver',
      );
      return;
    }
    if (!MixinApi.isSensor(holder)) {
      this.#emitQueryError(
        interactive,
        queryId,
        'permission',
        'query holder must compose Sensor',
      );
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    // Parse + resolve. Expand shell variables (`$focus`, etc.)
    // against the holder so var-bearing queries resolve correctly.
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
      this.#emitQueryError(
        interactive,
        queryId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      return;
    }

    // Project each Stuff into a wire record (flat or focus per the
    // request's mode). No registry insertion, no dependency-index
    // walk — just the projection.
    const result: RecordValue[] = [];
    for (const stuff of stuffList) {
      const rec = this.#projectStuff(stuff, fields, viewer, detailKey);
      result.push(rec);
    }

    const template: Omit<MqlQueryResultEnvelope, 'frameId'> = {
      type: 'mql-query-result',
      queryId,
      result,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  /**
   * Tear down a single subscription. Silent no-op when the id is
   * unknown (the requirements don't require an error envelope for
   * this case).
   */
  public static handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string,
  ): void {
    const bucket = this.#registry.get(interactive);
    if (!bucket) return;
    const sub = bucket.get(subscriptionId);
    if (!sub) return;
    this.#teardownSubscription(sub);
    bucket.delete(subscriptionId);
    if (bucket.size === 0) this.#registry.delete(interactive);
  }

  /**
   * Tear down every subscription held by `interactive`. Called from
   * `Application.handleUserDisconnect` so the substrate releases its
   * state before the Interactive itself goes away.
   */
  public static cancelAllForInteractive(interactive: Interactive): void {
    const bucket = this.#registry.get(interactive);
    if (!bucket) return;
    for (const sub of bucket.values()) {
      this.#teardownSubscription(sub);
    }
    this.#registry.delete(interactive);
  }

  /* ───────────── internal helpers ─────────────── */

  /**
   * Project a single Stuff to its wire record under the
   * subscription's mode (flat / focus).
   */
  static #projectStuff(
    stuff: Stuff,
    fields: FieldSet,
    viewer: Stuff & Sensor,
    detailKey: string | undefined,
  ): RecordValue {
    if (detailKey !== undefined) {
      return projectFocus(stuff, detailKey, viewer) as RecordValue;
    }
    const rec = projectFields(stuff, fields, viewer) as RecordValue;
    return rec;
  }

  /**
   * Walk every descriptor that drives the subscription's mode, and
   * register dependency-index entries. Two channels:
   *
   *   1. Field dependencies — `descriptor.dependsOnFields` (or
   *      defaulted to `[descriptor.name]`). Substrate installs one
   *      `(FieldChangedEvent.KIND, 'field', <dep>)` entry per dep.
   *      For a primitive descriptor (descriptor name === setter's
   *      `field` discriminator) the default Just Works; for a
   *      derived render (e.g., `displayName`), the descriptor
   *      author lists the leaf source fields.
   *
   *   2. Non-field dependencies — `descriptor.changes`. Common
   *      use: `ShadowChangedEvent` (shadow attach/detach changes a
   *      computed value without firing a field change). Each
   *      `ChangeSource` produces a `(KIND, by, value)` entry per
   *      the existing discriminator rules.
   */
  static #deriveAndInstallDependencies(
    sub: SubscriptionState,
    stuffList: Stuff[],
  ): void {
    const seenTuples = new Set<string>();
    const installTuple = (kind: string, by: string, value: unknown) => {
      const tupleKey = `${kind}|${by}|${describeValue(value)}`;
      if (seenTuples.has(tupleKey)) return;
      seenTuples.add(tupleKey);
      this.#indexAdd(kind, by, value, sub);
      sub.dependencyHandles.push({ kind, by, value });
      this.#ensureListener(kind, by);
    };

    // Holder-level dependency: subscriptions flagged `focusDependent`
    // (the canonical-kind spec opts in; raw subscribes don't) install
    // an entry against the holder's focus field, in addition to the
    // per-result-Stuff descriptor walk below.
    //
    // For a query like `$focus`, the result set is whatever the focus
    // fragment resolves to — NOT the FocusedMixin host. The natural
    // walk would miss the focus dependency entirely. This explicit
    // install lets the subscription wake on the holder's setFocus /
    // clearFocus fires. The conservative-coarse dispatch policy
    // means *any* focus-field change wakes *any* such subscription
    // globally; the diff stage filters out non-changes.
    if (sub.focusDependent) {
      installTuple(FieldChangedEvent.KIND, 'field', 'focus');
    }
    // Same shape, different field: `locationDependent` installs an
    // entry on the holder's `container` field so the subscription
    // wakes when the player moves to a new room / vessel.
    // `Avatar.setContainer` fires `FieldChangedEvent { field:
    // 'container' }` via Containable's setter, which matches this
    // index tuple regardless of which container the avatar landed
    // in.
    if (sub.locationDependent) {
      installTuple(FieldChangedEvent.KIND, 'field', 'container');
    }

    for (const stuff of stuffList) {
      const descriptors = collectSubscribableFields(stuff);
      for (const [name, d] of descriptors) {
        // Skip descriptors that aren't relevant to the current mode:
        // focus mode requires perDetailRead; flat mode requires read.
        if (sub.detailKey !== undefined) {
          if (!d.perDetailRead) continue;
        } else {
          if (!d.read) continue;
          // Flat mode honors the requested field set.
          if (!sub.fields.includes(name)) continue;
        }
        if (d.static === true) continue;

        // Channel 1: field dependencies (default: own descriptor name).
        const fieldDeps = d.dependsOnFields ?? [name];
        for (const dep of fieldDeps) {
          installTuple(FieldChangedEvent.KIND, 'field', dep);
        }

        // Channel 2: non-field dependencies via `changes` escape hatch.
        for (const cs of d.changes ?? []) {
          if (cs.by === 'target') {
            installTuple(cs.on.KIND, 'target', stuff.stuffId);
          } else if (cs.by === 'field') {
            installTuple(cs.on.KIND, 'field', name);
          } else {
            // Unknown discriminator — index by a sentinel so the
            // listener still installs; dispatch will skip lookups
            // it can't resolve.
            installTuple(cs.on.KIND, cs.by, null);
          }
        }
      }
    }
  }

  static #indexAdd(
    kind: string,
    by: string,
    value: unknown,
    sub: SubscriptionState,
  ): void {
    let byMap = this.#index.get(kind);
    if (!byMap) {
      byMap = new Map();
      this.#index.set(kind, byMap);
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

  static #indexRemove(
    kind: string,
    by: string,
    value: unknown,
    sub: SubscriptionState,
  ): void {
    const byMap = this.#index.get(kind);
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
        if (byMap.size === 0) this.#index.delete(kind);
      }
    }
  }

  /**
   * Install one `EventApi.on(KIND, …)` listener per `(KIND, by)`
   * pair on first need; refcount across subscriptions. The listener
   * reads `payload[by]`, looks up the matching value bucket, and
   * marks every subscription dirty.
   */
  static #ensureListener(kind: string, by: string): void {
    let byMap = this.#listeners.get(kind);
    if (!byMap) {
      byMap = new Map();
      this.#listeners.set(kind, byMap);
    }
    const existing = byMap.get(by);
    if (existing) {
      existing.refcount += 1;
      return;
    }
    const handler = (payload: unknown) => {
      this.#routeFire(kind, by, payload);
    };
    const sub = EventApi.on<unknown>(kind, handler);
    byMap.set(by, { sub, refcount: 1 });
  }

  static #releaseListener(kind: string, by: string): void {
    const byMap = this.#listeners.get(kind);
    if (!byMap) return;
    const entry = byMap.get(by);
    if (!entry) return;
    entry.refcount -= 1;
    if (entry.refcount <= 0) {
      entry.sub.unsubscribe();
      byMap.delete(by);
      if (byMap.size === 0) this.#listeners.delete(kind);
    }
  }

  static #routeFire(kind: string, by: string, payload: unknown): void {
    if (payload == null || typeof payload !== 'object') return;
    const value = (payload as Record<string, unknown>)[by];
    const byMap = this.#index.get(kind);
    if (!byMap) return;
    const valueMap = byMap.get(by);
    if (!valueMap) return;
    const set = valueMap.get(value);
    if (!set || set.size === 0) return;
    for (const sub of set) {
      this.#markDirty(sub);
    }
  }

  static #markDirty(sub: SubscriptionState): void {
    this.#dirty.add(sub);
    if (!this.#scheduled) {
      this.#scheduled = true;
      setImmediate(() => this.#drainDirty());
    }
  }

  static #drainDirty(): void {
    this.#scheduled = false;
    const subs = [...this.#dirty];
    this.#dirty.clear();
    for (const sub of subs) {
      this.#reresolveAndEmit(sub);
    }
  }

  static #reresolveAndEmit(sub: SubscriptionState): void {
    // Subscription may have been cancelled between dirty mark and
    // drain (disconnect race). Drop silently.
    const bucket = this.#registry.get(sub.interactive);
    if (!bucket || bucket.get(sub.subscriptionId) !== sub) return;

    const holder = sub.interactive.getHolder();
    if (!holder || !MixinApi.isCommandGiver(holder) || !MixinApi.isSensor(holder)) {
      // Holder vanished mid-stream — auto-cancel.
      this.#teardownSubscription(sub);
      bucket.delete(sub.subscriptionId);
      if (bucket.size === 0) this.#registry.delete(sub.interactive);
      return;
    }
    const giver = holder as Stuff & CommandGiver;
    const viewer = holder as Stuff & Sensor;

    // Expand shell variables (`$focus`, etc.) fresh on every
    // re-resolve — `$focus`-bearing subscriptions rely on the
    // variable re-expanding to the holder's current focus fragment
    // each tick, so a `setFocus`-driven dirty mark naturally
    // produces a new result set.
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
      this.#emitError(
        sub.interactive,
        sub.subscriptionId,
        reason,
        err instanceof Error ? err.message : String(err),
      );
      this.#teardownSubscription(sub);
      bucket.delete(sub.subscriptionId);
      if (bucket.size === 0) this.#registry.delete(sub.interactive);
      return;
    }

    // Project new records.
    const newResult = new Map<string, RecordValue>();
    for (const stuff of stuffList) {
      const rec = this.#projectStuff(stuff, sub.fields, viewer, sub.detailKey);
      newResult.set(stuff.stuffId, rec);
    }

    // Compute diff. Single-cardinality treats the new top as the
    // sole record; collection cardinality walks union of keys.
    const changes = this.#diff(sub.lastResult, newResult, sub.cardinality);
    sub.lastResult = newResult;

    // Re-derive dependency handles for the new result set (targets
    // may have moved). Cheap: drop everything, install fresh.
    for (const handle of sub.dependencyHandles) {
      this.#indexRemove(handle.kind, handle.by, handle.value, sub);
      this.#releaseListener(handle.kind, handle.by);
    }
    sub.dependencyHandles = [];
    this.#deriveAndInstallDependencies(sub, stuffList);

    if (changes.length === 0) return;

    const template: Omit<MqlSubscriptionDeltaEnvelope, 'frameId'> = {
      type: 'mql-subscription-delta',
      subscriptionId: sub.subscriptionId,
      changes,
    };
    MessageApi.sendEnvelope(viewer, template);
  }

  static #diff(
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
        changes.push({ op: 'replace', key: newKey, fields: newMap.get(newKey)! });
        return changes;
      }
      if (oldKey !== null && newKey === null) {
        changes.push({ op: 'remove', key: oldKey });
        return changes;
      }
      if (oldKey !== newKey) {
        changes.push({ op: 'replace', key: newKey!, fields: newMap.get(newKey!)! });
        return changes;
      }
      const fieldDiff = this.#fieldDiff(oldMap.get(oldKey!)!, newMap.get(newKey!)!);
      if (fieldDiff && Object.keys(fieldDiff).length > 0) {
        changes.push({ op: 'update', key: oldKey!, fields: fieldDiff });
      }
      return changes;
    }
    // 'many'
    const allKeys = new Set<string>([...oldMap.keys(), ...newMap.keys()]);
    for (const key of allKeys) {
      const oldRec = oldMap.get(key);
      const newRec = newMap.get(key);
      if (!oldRec && newRec) {
        changes.push({ op: 'add', key, fields: newRec });
      } else if (oldRec && !newRec) {
        changes.push({ op: 'remove', key });
      } else if (oldRec && newRec) {
        const fieldDiff = this.#fieldDiff(oldRec, newRec);
        if (fieldDiff && Object.keys(fieldDiff).length > 0) {
          changes.push({ op: 'update', key, fields: fieldDiff });
        }
      }
    }
    return changes;
  }

  static #fieldDiff(
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

  static #teardownSubscription(sub: SubscriptionState): void {
    for (const handle of sub.dependencyHandles) {
      this.#indexRemove(handle.kind, handle.by, handle.value, sub);
      this.#releaseListener(handle.kind, handle.by);
    }
    sub.dependencyHandles = [];
    this.#dirty.delete(sub);
  }

  static #emitError(
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
    }
    // No-Sensor holder: the substrate has no delivery path. Log
    // so a misconfigured Interactive doesn't fail silently in tests.
    else {
      console.warn(
        `MqlSubscriptionApi: cannot deliver error envelope (no Sensor holder); ` +
          `subscriptionId=${subscriptionId} reason=${reason}`,
      );
    }
  }

  /**
   * Emit a one-shot query error envelope. Mirrors {@link #emitError}
   * but carries `queryId` instead of `subscriptionId` and rides the
   * `'mql-query-error'` envelope type so client-side handlers can
   * branch by envelope type before correlating ids.
   */
  static #emitQueryError(
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

  /* ───────────── test seams ─────────────── */

  public static _getRegistrySizeForTesting(): number {
    SecurityApi.assertTestOnly('_getRegistrySizeForTesting');
    let count = 0;
    for (const bucket of this.#registry.values()) count += bucket.size;
    return count;
  }

  /**
   * Sum of subscription-pointer memberships across every innermost
   * Set in the 3-level index. Zero after `cancelAllForInteractive`
   * means no leak.
   */
  public static _getDependencyIndexEntryCountForTesting(): number {
    SecurityApi.assertTestOnly('_getDependencyIndexEntryCountForTesting');
    let count = 0;
    for (const byMap of this.#index.values()) {
      for (const valueMap of byMap.values()) {
        for (const set of valueMap.values()) {
          count += set.size;
        }
      }
    }
    return count;
  }

  public static async _drainScheduledForTesting(): Promise<void> {
    SecurityApi.assertTestOnly('_drainScheduledForTesting');
    // Flush microtasks (EventApi.emit fans out listeners on
    // queueMicrotask) so our listener can call markDirty before we
    // wait on setImmediate.
    await Promise.resolve();
    await Promise.resolve();
    // Now drain the setImmediate-batched dirty pass.
    await new Promise<void>((resolve) => setImmediate(resolve));
    // After drainDirty re-resolves and (if needed) reinstalls
    // dependencies, another setImmediate batch may have been
    // scheduled by a follow-up dirty mark; flush one more round.
    await Promise.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    // Unsubscribe all listeners.
    for (const byMap of this.#listeners.values()) {
      for (const entry of byMap.values()) {
        entry.sub.unsubscribe();
      }
    }
    this.#listeners.clear();
    this.#index.clear();
    this.#registry.clear();
    this.#dirty.clear();
    this.#scheduled = false;
  }
}

/* ─────────── module-local helpers (no security gate) ───────── */

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

SecurityApi.decorateApiClass(MqlSubscriptionApi);
