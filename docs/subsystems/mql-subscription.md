# MQL subscription substrate

Server-side substrate routing **live MQL queries**: a client sends an
`mql-subscribe` message naming a query + the fields it wants
projected; the substrate registers the subscription under a
per-Interactive id, ships the initial result, and re-projects on every
relevant state change until the client unsubscribes or disconnects.

The substrate is the second wire channel sitting alongside the
prose / dispatch-response pipeline. Inbound dispatch lives in
`Application.processUserMessage`; outbound envelopes ride the same
`MessageApi.sendEnvelope` path the dispatch-response framework uses,
so shadow filters and audit observers see subscription traffic the
same way they see prose.

See:

- `docs/subsystems/mql.md` — the underlying query language.
- `docs/subsystems/response-envelope.md` — the wire envelope framing
  this substrate plugs into.
- `docs/requirements/mql-subscription-substrate-requirements.md` —
  the closed-scope requirements that drove this implementation.

## File layout

| File | Role |
|---|---|
| `packages/server/src/mud/api/mql-subscription.ts` | `MqlSubscriptionApi`, descriptor types, projection helpers, substrate-synthetic table |
| `packages/server/src/mud/lib/events/StuffEvent.ts` | Class-per-event base |
| `packages/server/src/mud/lib/events/FieldChangedEvent.ts` | Fact-mixin field-change event + `fireFieldChange` helper |
| `packages/server/src/mud/lib/events/PropertyChangedEvent.ts` | Property-bag change event |
| `packages/server/src/mud/lib/events/ShadowChangedEvent.ts` | Shadow lifecycle event (declared; firing wires up in a later subsystem) |
| `packages/server/src/mud/lib/events/GenericEvent.ts` | Escape-hatch class-shaped event |
| `packages/types/src/index.ts` | Inbound + outbound wire types (`MqlSubscribeMessage`, `Mql*Envelope`, `StuffRefRecord`, `WireDetailEntry`, `MaterialSummary`, `StuffDetailFocusRecord`, `Change`) |

## Surface

### `MqlSubscriptionApi`

```ts
handleSubscribe(req: SubscribeRequest): void
handleUnsubscribe(interactive: Interactive, subscriptionId: string): void
cancelAllForInteractive(interactive: Interactive): void
```

`SubscribeRequest`:

```ts
interface SubscribeRequest {
  interactive: Interactive;
  subscriptionId: string;
  query: string;
  cardinality: 'one' | 'many';
  fields?: string[] | 'ref' | 'detail';
  detailKey?: string;     // focus-mode opt-in (requires cardinality 'one')
}
```

Substrate behavior:

- Duplicate `subscriptionId` per Interactive → emit
  `MqlSubscriptionErrorEnvelope { reason: 'parse', detail: 'duplicate subscriptionId' }`,
  no registration.
- `detailKey` with `cardinality: 'many'` → `reason: 'parse'`, no
  registration.
- Holder missing `CommandGiver` or `Sensor` composition →
  `reason: 'permission'`.
- MQL parse / resolve throw at subscribe time → `reason: 'parse'` or
  `'resolve'` (substrate distinguishes parse vs MQL-permission via the
  `MqlPermissionError` type — the latter becomes `'permission'`).
- Mid-stream resolve throws → emit `reason` matching the throw type,
  auto-cancel the subscription.
- Holder vanishes mid-stream (no `Sensor` / no `CommandGiver`) →
  silent auto-cancel.

### Descriptor mechanism

Mixins declare a `static subscribableFields: SubscribableFieldDescriptor[]`
array; the substrate's `collectSubscribableFields(stuff)` walks the
prototype chain (via `MixinApi.getAllSubscribableFields`) and overlays
the substrate-synthetic table.

```ts
interface SubscribableFieldDescriptor {
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

interface ChangeSource {
  on: { readonly KIND: string };  // EventClass (any class with static KIND)
  by: string;                     // payload-attribute name
}
```

Each descriptor describes one wire field:

- **`read`** — flat projection. Invoked when the subscription is in
  flat mode AND `name` is in the requested field-set. Returning
  `undefined` omits the field from the record.
- **`perDetailRead`** — focused-detail projection. Invoked once per
  focus-mode subscription. Returns a partial record carrying this
  mixin's slice for the focus key, or `null` to contribute nothing.
- **`changes`** — dependency declarations. Each `(EventClass, by)`
  pair installs a meta-bus index entry so the dispatcher marks
  subscriptions dirty on the firing of that event with a matching
  payload attribute.

A descriptor without `read` is flat-mode-skipped. A descriptor without
`perDetailRead` is focus-mode-skipped. `static: true` opts out of
dependency-index installation (no re-resolution).

### Field-set aliases

```ts
export const REF_FIELDS = ['displayName', 'quantity'];
export const DETAIL_FIELDS = [
  'displayName', 'quantity',
  'shortDescription', 'longDescription',
  'details', 'bulkMaterial', 'mass',
];
resolveFieldSet(undefined | 'ref') === REF_FIELDS;
resolveFieldSet('detail') === DETAIL_FIELDS;
resolveFieldSet(array) === array;
```

## Two projection layers

The substrate ships both:

**Flat per-mixin (default).** Each contributing mixin's subscribable
surface lands as a separate field on `StuffRefRecord` /
`StuffDetailRecord`. Faithful to the engine's actual data layout —
DetailedMixin's `details` and TangibleMixin's per-key material
overrides are separately stored, share a key vocabulary but not data,
lifecycle, or events. The wire reflects this. Clients that want a
unified per-detail view join by the shared path-key string.

**Focused-detail (drill-in).** When the client subscribes with
`detailKey?: string` in `MqlSubscribeMessage`, the substrate composes
a per-key view across every mixin that contributes per-detail state.
Each descriptor's `perDetailRead` returns a partial; substrate
merges via `Object.assign` into a `StuffDetailFocusRecord`. The shape
is open (`[key: string]: unknown`) — mixins own their slice's field
names; the substrate keeps no central knowledge of detail shape.

A descriptor whose `perDetailRead` returns `null` contributes
nothing to the merge. Subscriptions with `cardinality: 'many'` AND a
`detailKey` are rejected with `reason: 'parse'`.

## Mixin contributions in v1

| Mixin | Flat fields (`read`) | Focus fields (`perDetailRead`) | Events declared |
|---|---|---|---|
| NamedMixin | `name` | — | FieldChangedEvent, ShadowChangedEvent |
| VisibleMixin | `shortDescription`, `longDescription` | — | FieldChangedEvent, ShadowChangedEvent |
| DetailedMixin | `details` (alias-grouped) | `{ ids, description, hasChildren }` | FieldChangedEvent, ShadowChangedEvent |
| TangibleMixin | `bulkMaterial`, `mass` | `{ material }` (prefix-walk resolves at focus key) | FieldChangedEvent, ShadowChangedEvent (mass: FieldChangedEvent only) |
| GlobbableMixin | `quantity` | — | FieldChangedEvent |
| Substrate-synthetic | `displayName` (routes `DescribeApi.getDisplayName`) | — | FieldChangedEvent, ShadowChangedEvent |

`DetailedMixin.getDetailEntries(parent?)` returns alias-grouped
top-level entries (a single Detail object addressed by multiple keys
becomes one entry whose `ids` is every alias). `getDetailEntry(key)`
returns the single alias-grouped entry whose Detail covers `key`, or
`null`. Both back the descriptor's `read` and `perDetailRead`.

The substrate-synthetic `displayName` descriptor calls
`DescribeApi.getDisplayName(stuff, viewer)` directly. The post-Wave-3
reshape guarantees `getDisplayName` returns a string — `'something'`
is the baked-in default for hosts without Named / Visible state, so
the wire shape's non-nullable `displayName: string` is honored
without any substrate-side coercion.

Quantity lives on `GlobbableMixin`, not on the substrate-synthetic
table. Mixin-owned state with a mixin-owned setter and event-firing
site stays with the mixin. The synthetic table is reserved for
cross-cutting renders that no single mixin owns (v1: just
`displayName`).

## Event-class pattern

A small class-per-event vocabulary sits on top of the existing
`EventApi.emit(name, payload)` / `on(name, listener)` surface:

| Class | KIND | Discriminator | Firing site |
|---|---|---|---|
| `FieldChangedEvent` | `'stuff.fieldChanged'` | `field` (mixin-declared field name) | Fact-mixin setters via `fireFieldChange` helper or inline |
| `PropertyChangedEvent` | `'stuff.propertyChanged'` | `property` (property-bag key) | `PropertiedMixin.setProp` |
| `ShadowChangedEvent` | `'stuff.shadowChanged'` | `cause`, `shadow` | **Declared but unfired.** Wires up with the shadow lifecycle in a later subsystem. |
| `GenericEvent<P>` | per-instance | — | Escape hatch when no specific class fits. |

The class-based call site is sugar over the string-keyed bus:

```ts
EventApi.fire(new FieldChangedEvent({ target, field, oldValue, newValue }));
EventApi.on(FieldChangedEvent, (event, ctx) => { /* event.payload typed */ });
```

The class-based `on` routes via the class's static `KIND` string and
delivers a `{ kind, payload }` event-like object to the listener (not
the reconstructed class instance — listeners pattern-match on payload
fields). String-keyed listeners see class-fires; class-keyed listeners
see string-emits to the same KIND. One unified pub/sub bus.

The two namespaces stay separate. A fact-mixin field named `'name'`
and a property-bag key named `'name'` do not cross-trigger — the
meta-bus index discriminates by `(EventClass.KIND, attribute, value)`,
and `FieldChangedEvent` carries `field` while `PropertyChangedEvent`
carries `property`.

### `fireFieldChange` helper

```ts
setName(value: string): void {
  this.name = fireFieldChange(this, 'name', this.name, value);
}
```

Strict-equals (`Object.is`) compares old vs new. On equal, skip
emission and return `oldValue`. On change, fire the event and return
`newValue`. Setter is a single line.

Used by `NamedMixin.setName`, `VisibleMixin.setShortDescription` /
`setLongDescription`, `GlobbableMixin.setQuantity`. `DetailedMixin`
(setDetail / removeDetail), `TangibleMixin` (setMaterial / setMass),
and `PropertiedMixin` (setProp) inline the fire because their
mutation shape doesn't fit the helper cleanly (Map mutations,
multiple-field changes, marshaller boundary).

## Meta-bus dependency index + scheduler

The substrate maintains a 3-level Map keyed by `(EventClass.KIND,
attribute-name, attribute-value)`:

```
#index: Map<string, Map<string, Map<unknown, Set<SubscriptionState>>>>
```

When a descriptor declares `{ on: FieldChangedEvent, by: 'target' }`,
the substrate installs an entry at `('stuff.fieldChanged', 'target',
<stuffId>)` for every Stuff in the subscription's result set. When
the descriptor declares `{ on: FieldChangedEvent, by: 'field' }`, the
entry indexes at `('stuff.fieldChanged', 'field', <fieldName>)`.

One `EventApi.on(KIND, …)` listener is installed per distinct
`(KIND, by)` pair, refcounted across subscriptions. The handler reads
`payload[by]`, looks up the value bucket, walks every subscription in
the set, and calls `markDirty(sub)`.

```ts
#dirty = new Set<SubscriptionState>();
#scheduled = false;
markDirty(sub): void {
  this.#dirty.add(sub);
  if (!this.#scheduled) {
    this.#scheduled = true;
    setImmediate(() => this.#drainDirty());
  }
}
```

`setImmediate` batches: N events for the same target in one tick
produce ONE re-resolve per affected subscription. The drain runs the
dirty set in insertion order, re-resolves each query via
`MqlApi.resolveOne` / `resolveMany`, diffs against `lastResult`, and
emits a single `MqlSubscriptionDeltaEnvelope` per subscription whose
diff is non-empty. Subscriptions cancelled between dirty mark and
drain are dropped silently.

## Diff algorithm

`Change.op` is one of `'replace' | 'update' | 'add' | 'remove'`.

**Single-cardinality:**

- old null + new top → `op: 'replace'` with full record
- old top + new null → `op: 'remove'`, no `fields`
- different top stuffIds → `op: 'replace'` with full record
- same top stuffId, fields differ → `op: 'update'` with diffed fields

**Collection cardinality:**

- key in new only → `op: 'add'` with full record
- key in old only → `op: 'remove'`, no `fields`
- key in both, fields differ → `op: 'update'` with diffed fields

Equal-record updates (every field deep-equal) skip the change; empty
change lists emit no envelope (silent no-op).

## Disconnect cleanup

`Application.handleUserDisconnect`:

1. Resolves the `Interactive` from the socket id.
2. Calls `MqlSubscriptionApi.cancelAllForInteractive(interactive)`
   **before** `ConnectionManager.removeInteractive(socketId)`. Each
   subscription's dependency-index entries deregister, listener
   refcounts decrement (and `unsubscribe()` when zero), and the
   registry slot drops.
3. Then `ConnectionManager.removeInteractive` runs.

The ordering keeps the Interactive live for any final substrate-side
envelope delivery during cancellation (silent in v1, but
`reason: 'closed'` envelopes may ship in a later subsystem).

## Conservative-coarse dispatch policy

The v1 dispatcher errs toward more re-resolves rather than missed
updates. Specific shapes:

- **Field-keyed firing is global, not per-target.** A descriptor with
  `{ on: FieldChangedEvent, by: 'field' }` marks every subscription
  whose descriptor names the same field, regardless of which Stuff
  fired. The diff pass filters out fireworks that don't change a
  subscription's actual result; the index pre-filter just avoids
  obvious mismatches.
- **Focus subscriptions re-resolve on any matching
  `FieldChangedEvent`, including changes to other detail keys.**
  `TangibleMixin.setMaterial(_, 'tail')` fires
  `FieldChangedEvent { field: 'detailMaterials' }`, which is
  index-matched by any focus subscription on `head.edge`'s
  `detailMaterial` descriptor; the re-projection finds no actual
  change in `material` and emits nothing. Adaptive per-key
  refinement is deferred until profiling demands it.
- **`mass` / `bulkMaterial` are independent.** Each fires its own
  `FieldChangedEvent { field: 'mass' | 'bulkMaterial' }`; the diff
  ensures only the actually-changed field appears in the update.

These over-fire patterns are the right v1 trade. The cost is a few
extra re-resolves on a quiet codepath; the benefit is no risk of a
descriptor missing a notification because the index missed a
discriminator.

## `DescribeApi.getDisplayName` reshape

Old:

```ts
static getDisplayName(obj: Stuff, fallback: string = ''): string
```

New:

```ts
static getDisplayName(obj: Stuff, viewer?: Sensor): string
```

Three changes bundled with the subscription substrate:

- **Drop `fallback`.** Presentation policy lives in the function, not
  in 25+ caller-supplied strings (`'that'`, `'door'`, `'somewhere'`,
  `'instrument'`).
- **Add `viewer?: Sensor`.** Reserved for the recognition / DescribeApi
  v2 pipeline. v1 body ignores it, but the substrate threads it
  end-to-end so the per-viewer design is wired without a future
  rename.
- **Bake in `DEFAULT_DISPLAY_NAME = 'something'`.** The return type
  stays `string` (never null); the substrate's
  `StuffRefRecord.displayName` is non-optional and honored without
  coercion.

Side-effect: error messages that read "you aren't wielding that"
now read "you aren't wielding something" for unnamed targets. The
common case (named targets) is unaffected.

`formatName` follows the same reshape — `(obj: Stuff, viewer?: Sensor)
=> string`. All three internal callers (`DropController`,
`GetController`, the `formatRestingSuffix` internal call) drop their
fallback arg.

## What ships unfired

`ShadowChangedEvent` ships **declared but unfired**. Descriptors that
participate in shadowed projection (NamedMixin, VisibleMixin,
DetailedMixin, TangibleMixin's `bulkMaterial` / `detailMaterial`, the
substrate-synthetic `displayName`) reference it in their `changes`
array so the meta-bus index is wired end-to-end; until the firing
site exists, the listener is silent.

When a shadow lifecycle subsystem lands, firing `ShadowChangedEvent`
from attach / detach / mutate sites automatically lights up the
substrate's re-projection without any descriptor changes.

## What doesn't ship at all (v1)

- `mql-subscribe-update` — change a subscription's query without
  un/re-subscribing.
- `mql-query` — one-shot read (no live updates).
- Heartbeat / explicit `'closed'` envelope.
- Canonical-kinds projection (`mixins[]`, `capabilities[]`).
- Per-detail-key dependency-index refinement.
- Programmatic / non-client substrate consumers (e.g., server-side
  rules listening for live state).

These land in follow-up scope when concrete consumers demand them.
