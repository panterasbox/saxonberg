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
| `packages/server/src/mud/api/mql-subscription.ts` | `MqlSubscriptionApi`, descriptor types, projection helpers |
| `packages/server/src/mud/lib/events/FieldChangedEvent.ts` | Fact-mixin field-change event (DTO) |
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

Classes declare a `static subscribableFields: SubscribableFieldDescriptor[]`
array. Mixin layers declare their state-bearing fields; `Stuff` itself
declares universal cross-cutting renders (`displayName`, future
`articleName`, etc.). The substrate's `collectSubscribableFields(stuff)`
walks the prototype chain via `MixinApi.getAllSubscribableFields` —
`hasOwnProperty`-checking `subscribableFields` at every level, including
`Stuff`. No substrate-private synthetic table; one mechanism, uniformly
declared.

```ts
interface SubscribableFieldDescriptor {
  name: string;
  read?: (stuff: Stuff, viewer: Stuff & Sensor) => unknown;
  perDetailRead?: (
    stuff: Stuff,
    detailKey: string,
    viewer: Stuff & Sensor,
  ) => Partial<StuffDetailFocusRecord> | null;
  dependsOnFields?: string[];   // defaults to [descriptor.name]
  changes?: ChangeSource[];     // non-FieldChangedEvent dependencies
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
- **`dependsOnFields`** — leaf source field names whose
  `FieldChangedEvent` fires should mark this descriptor dirty.
  Defaults to `[descriptor.name]` (the primitive case: descriptor
  name === setter's `field` discriminator). Derived fields like
  `displayName` declare explicit deps (`['name', 'shortDescription']`).
  When a derived field depends on another derived field, the
  descriptor author declares the **leaf source fields** (the
  closure of leaves) — v1 has no automatic closure walk; do it by
  hand until chain depth makes that annoying.
- **`changes`** — escape hatch for non-`FieldChangedEvent`
  dependencies. Common case: `ShadowChangedEvent` (a shadow
  attaching can change a computed value without firing a field
  change). Substrate installs these entries in addition to the
  field-event entries derived from `dependsOnFields`.

A descriptor without `read` is flat-mode-skipped. A descriptor without
`perDetailRead` is focus-mode-skipped. `static: true` opts out of
dependency-index installation (no re-resolution).

#### Cascade through dependsOnFields

A client subscribing to `['displayName']` only — `setName('Bob')` fires
`FieldChangedEvent { field: 'name' }`. The substrate's index has an
entry at `(stuff.fieldChanged, 'field', 'name')` installed from the
`displayName` descriptor's `dependsOnFields`. The match marks the
subscription dirty; re-resolve recomputes `displayName` → 'Bob'; diff
emits one delta `{ displayName: 'Bob' }`.

A client subscribing to `['name', 'displayName']` — same fire matches
both descriptors' dependency entries. Re-resolve recomputes both;
diff emits one delta `{ name: 'Bob', displayName: 'Bob' }`. The
cascade is explicit on the server, automatic on the wire.

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

## Where descriptors live (v1)

| Layer | Flat fields (`read`) | Focus fields (`perDetailRead`) | Dependencies |
|---|---|---|---|
| `Stuff` (universal) | `displayName` (routes `DescribeApi.getDisplayName`) | — | `dependsOnFields: ['name', 'shortDescription']`; ShadowChangedEvent in `changes` |
| NamedMixin | `name` | — | default `dependsOnFields: ['name']`; ShadowChangedEvent |
| VisibleMixin | `shortDescription`, `longDescription` | — | defaults; ShadowChangedEvent |
| DetailedMixin | `details` (alias-grouped) | `{ ids, description, hasChildren }` | default `dependsOnFields: ['details']`; ShadowChangedEvent |
| TangibleMixin | `bulkMaterial`, `mass` | `{ material }` (prefix-walk at focus key) | defaults for `bulkMaterial` / `mass`; **explicit** `dependsOnFields: ['detailMaterials']` for `detailMaterial` because the descriptor name doesn't match the setter's field discriminator. ShadowChangedEvent on the shadow-aware ones. |
| GlobbableMixin | `quantity` | — | default `dependsOnFields: ['quantity']` |

`DetailedMixin.getDetailEntries(parent?)` returns alias-grouped
top-level entries (a single Detail object addressed by multiple keys
becomes one entry whose `ids` is every alias). `getDetailEntry(key)`
returns the single alias-grouped entry whose Detail covers `key`, or
`null`. Both back the descriptor's `read` and `perDetailRead`.

### Why `displayName` lives on Stuff

`displayName` isn't a mixin's state — it's a render that pulls from
Named's `name` OR Visible's `shortDescription` OR a baked-in
`'something'` default. It applies to every Stuff regardless of mixin
composition. Three observations:

- The concept is **universal**: every Stuff has a renderable identity.
- There's no "what if this Stuff has no displayable identity?" edge.
- `DescribeApi.getDisplayName` already encodes the fallback chain
  authoritatively.

So the descriptor lives on `Stuff.subscribableFields` directly. The
prototype-chain walk picks it up via `hasOwnProperty` like any
mixin's descriptor; no synthetic table, no overlay step.

Universal cross-cutting renders → `Stuff.subscribableFields`. Mixin-
gated cross-cutting renders → the mixin that owns the gate.

## Event-class pattern

A small class-per-event vocabulary sits on top of the existing
`EventApi.emit(name, payload)` / `on(name, listener)` surface.
Concrete event classes don't share a base — they satisfy the
structural `BusEvent<P>` contract (declared in `api/event.ts`) by
exposing `kind: string` and `payload: P` directly:

| Class | KIND | Discriminator | Firing site |
|---|---|---|---|
| `FieldChangedEvent` | `'stuff.fieldChanged'` | `field` (mixin-declared field name) | Fact-mixin setters via `MqlSubscriptionApi.fireFieldChange` or inline |
| `PropertyChangedEvent` | `'stuff.propertyChanged'` | `property` (property-bag key) | `PropertiedMixin.setProp` |
| `ShadowChangedEvent` | `'stuff.shadowChanged'` | `cause`, `shadow` | **Declared but unfired.** Wires up with the shadow lifecycle in a later subsystem. |
| `GenericEvent<P>` | per-instance | — | Escape hatch when no specific class fits. Has no static `KIND`; routes via string-keyed `EventApi.on(name, …)` only. |

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

### `MqlSubscriptionApi.fireFieldChange` helper

```ts
setName(value: string): void {
  this.name = MqlSubscriptionApi.fireFieldChange(
    this, 'name', this.name, value,
  );
}
```

Strict-equals (`Object.is`) compares old vs new. On equal, skip
emission and return `oldValue`. On change, fire the event and return
`newValue`. Setter is a single line.

The helper lives on `MqlSubscriptionApi`, not on `FieldChangedEvent`,
so the substrate owns its own helpers and the event class stays a
pure DTO.

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

Field-event dependencies come from `descriptor.dependsOnFields` (or
its `[descriptor.name]` default). The substrate translates each
dep to a `('stuff.fieldChanged', 'field', <dep>)` index entry.
Non-field dependencies (the `changes` escape hatch) install their
own entries — most commonly `('stuff.shadowChanged', 'target',
<stuffId>)` so a shadow attaching to the host re-projects derived
fields without firing a synthetic field event.

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

- **Field-keyed firing is global, not per-target.** A descriptor
  whose `dependsOnFields` includes `'name'` marks every subscription
  on a name-dependent field, regardless of which Stuff actually
  fired the change. The diff pass filters out fireworks that don't
  change a subscription's actual result; the index pre-filter just
  avoids obvious mismatches.
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
DetailedMixin, TangibleMixin's `bulkMaterial` / `detailMaterial`, and
the universal `displayName` on `Stuff`) reference it in their
`changes` array so the meta-bus index is wired end-to-end; until the
firing site exists, the listener is silent.

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
