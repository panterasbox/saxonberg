# MQL subscription substrate (working doc)

Working slate for the **client-driven live-state substrate** —
how the client knows what's happening in the world without the
server pushing a hardcoded taxonomy of delta types.

The client declares what it cares about as an MQL query plus a
result-shape declaration; the server resolves it, sends the
initial result, watches `EventApi` for changes that could affect
the result, and pushes diffs as deltas. Read-only in v1;
mutation stays on the command-bus channel.

**Status.** Design surface. **Supersedes** the prior
`state-sync-slate.md` (kept untracked as the historical record
of the rejected fixed-delta-taxonomy model). Why the pivot:
fixed-delta models grow a wire-schema entry per consumer
widget, which compounds quadratically as the client matures.
The MQL-subscription model has linear growth — one mechanism,
many uses — because the widget's needs are expressed in the
query, not in the wire.

See also:

- [docs/subsystems/mql.md](../subsystems/mql.md) — MQL grammar,
  resolution pipeline, per-viewer scoping. The substrate this
  slate reuses end-to-end.
- `packages/server/src/mud/api/event.ts` — `EventApi` global
  pub/sub bus. Change-detection's source of truth.
- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — wire envelope family. Subscription messages extend this
  pattern.
- [docs/slates/client-cockpit-slate.md](./client-cockpit-slate.md)
  — every right-sidebar widget is a subscription consumer.
- [docs/slates/inspection-pane-slate.md](./inspection-pane-slate.md)
  — focus-pane body is a subscription on the focused thing's
  detail.
- [docs/slates/prompt-stack-slate.md](./prompt-stack-slate.md)
  — token-format base prompts (future Wave 8) become a
  subscription on the relevant me-and-here fields.

---

## Principle

**Client declares; server notifies.** The client says "tell me
about X, here are the fields I want." The server runs MQL once
for the initial result, then watches for the events that could
make the answer different and ships a diff each time it does.

Three corollaries:

1. **Wire schema is small and stable.** Message types in the
   single digits. The wire doesn't grow per widget; what each
   widget cares about lives in its query string + field-set.
2. **MQL is the lingua franca.** Players type MQL in the prompt.
   Authors write MQL in NPC behavior / quest gates / validators.
   The client's widgets subscribe via MQL. One language across
   the whole engine.
3. **Read-only.** Subscriptions deliver state; mutation goes
   through the command bus. No "PATCH me.hp" via subscription.
   This keeps the security model clean and avoids re-implementing
   the verb / validator stack on a second channel.

---

## Two channels, distinct concerns

The server↔client wire has two protocol families that **share a
connection but are separate channels** with separate dispatchers:

```
Command bus                   MQL channel
─────────────                 ───────────────
• command                     • mql-query              (one-shot)
                              • mql-subscribe          (live)
                              • mql-subscribe-update   (re-bind / refresh)
                              • mql-unsubscribe
                              • mql-query-result
                              • mql-subscription-result
                              • mql-subscription-delta
                              • mql-subscription-error
                              • heartbeat              (bidirectional)
```

The mental model:

- **Command bus** answers *"the player wants the world to do
  something."* Verbs, side effects, validators, controllers, prose,
  envelope notes. Player intent.
- **MQL channel** answers *"the client wants to know about the
  world (now, or whenever it changes)."* Pure reads. No side
  effects on the world. No prose output. No verb dispatch. No
  validators.

The MQL channel also accommodates **client-initiated traffic that
isn't a player command** — gap-detected resyncs, hover-tooltip
detail fetches, paranoid post-reconnect refreshes, liveness
probes. These are the client doing housekeeping on its own behalf;
they shouldn't ride the command bus because they're not intents and
shouldn't generate prose / events / echoes. They ride the MQL
channel because they're reads.

Crucially: the MQL channel's message types all share the same
underlying mechanism (parser, projector, per-viewer scoping,
permission gates). A `mql-query` is just a single-resolve without
listener registration; a `mql-subscribe` is the same resolve plus
listener registration + delta loop. The mechanism doesn't
duplicate.

---

## Why MQL fits

The substrate exists, fully formed. We're not building a query
language — we're wiring an existing one to a subscription
mechanism.

- **Resolution pipeline** — MQL already parses, resolves, and
  walks the scope tree per-viewer. Subscriptions reuse it.
- **Per-viewer scoping** — every MQL query runs in a viewer's
  perception scope. Subscriptions inherit this: a player only
  sees subscription results their viewer would have seen via a
  one-shot query.
- **Permission gates** — admin-tier predicates already exist in
  MQL. Subscriptions inherit them; admin subscriptions resolve
  fields non-admin subscriptions can't see.
- **Authoring symmetry** — content authors writing
  `target=mql:'all sleeping things in here'` on a content
  validator are writing the same shape the client widget uses
  for `subscribe: 'all sleeping things in here'`.
- **Composability** — MQL chains, filters, pronouns. Widgets
  can be precise without server-side cooperation.
- **Change source** — `EventApi` fires on every meaningful state
  change. Subscriptions hook here for re-resolution triggers.

What's missing on MQL today:

- **Result-shape declaration.** MQL today returns matched Stuff;
  it doesn't say "give me these fields." Subscriptions need a
  declarative field-set so the wire doesn't ship every property
  of every match.
- **Subscription / change-detection layer.** Single-shot today;
  subscriptions need re-evaluation + diff + emit.

Both are additive. The grammar gets a `select { ... }` clause
(or similar); a new `MqlSubscriptionApi` owns the lifecycle.

---

## Wire shape

All MQL-channel messages ride the same connection; the
dispatcher routes by `type`. Mix of outbound (client → server)
and inbound (server → client) shapes below.

### Outbound (client → server)

```ts
interface MqlQueryMessage {
  type: 'mql-query';
  queryId: string;                 // client-generated; correlates response
  query: string;                   // MQL source text
  fields?: FieldSet | FieldAlias;  // result shape; defaults to 'ref'
}

interface MqlSubscribeMessage {
  type: 'mql-subscribe';
  subscriptionId: string;          // client-generated; client tracks
  query: string;                   // MQL source text
  fields?: FieldSet | FieldAlias;  // result shape; defaults to 'ref'
  options?: SubscriptionOptions;   // throttle, etc.
}

interface MqlUnsubscribeMessage {
  type: 'mql-unsubscribe';
  subscriptionId: string;
}

interface MqlSubscribeUpdateMessage {
  type: 'mql-subscribe-update';
  subscriptionId: string;
  query?: string;                  // re-bind query
  fields?: FieldSet | FieldAlias;  // re-bind field-set
  refresh?: boolean;               // force a fresh full result (resync)
}

interface HeartbeatMessage {
  type: 'heartbeat';
  lastSeenFrameId?: number;        // last server frameId the client processed
}
```

`mql-query` is the **one-shot** form. Same parser, same projector,
same per-viewer scoping as `mql-subscribe`; no listener registers,
no `lastResult` stored on the server, no delta loop. Server runs
the query once and responds. Used for hover tooltips, paginated
detail fetches, MQL-tab snapshots — anywhere the client wants
data once with no obligation to track it.

`mql-subscribe-update` with `refresh: true` is the **explicit
resync** form. Server re-resolves the subscription's current
binding (no re-binding required) and ships a fresh
`mql-subscription-result` (NOT a delta). Client treats the result
as authoritative — full replace of cached state for this
subscription. Used after gap detection, after reconnect /
visibility-restore, and for the silent ↻ refresh button.

`heartbeat` is **bidirectional** — either side can send. Carries
the sender's view of the last frameId it processed from the
other side. Provides:
- Liveness signal (the other side is alive)
- Optional frameId reconciliation (if `lastSeenFrameId` lags the
  server's current counter by more than expected, server can
  push a fresh subscription-result on key subscriptions
  proactively)

v1 ships a simple heartbeat cadence (server every ~30s, client
on visibility-restore) without server-driven proactive resync;
reconciliation lands when needed.

### Inbound (server → client)

```ts
interface MqlQueryResultEnvelope {
  type: 'mql-query-result';
  frameId: number;
  queryId: string;
  records: Record[];               // full result per fields
  cardinality: 'single' | 'collection';
}

interface MqlQueryErrorEnvelope {
  type: 'mql-query-error';
  frameId: number;
  queryId: string;
  reason: 'parse' | 'resolve' | 'permission';
  message: string;
}

interface MqlSubscriptionResultEnvelope {
  type: 'mql-subscription-result';
  frameId: number;
  subscriptionId: string;
  items: Record[];                 // initial result — full shape per `fields`
  cardinality: 'single' | 'collection';
  reason?: 'initial' | 'refresh';  // distinguishes first-result from resync
}

interface MqlSubscriptionDeltaEnvelope {
  type: 'mql-subscription-delta';
  frameId: number;
  subscriptionId: string;
  changes: Change[];               // ops applied to the client's local result
}

interface MqlSubscriptionErrorEnvelope {
  type: 'mql-subscription-error';
  frameId: number;
  subscriptionId: string;
  reason: 'parse' | 'resolve' | 'permission' | 'closed';
  message: string;
}
```

`subscription-result` carries an optional `reason` so the client
can distinguish an initial-result (cache empty, populate it) from
a refresh-result (cache held something stale, replace it). Both
shapes are full-result; reason changes only the client's
intention when applying.

`heartbeat` arrives as the same shape outbound and inbound; the
client processes server heartbeats the same way the server
processes client ones.

### Change ops

```ts
type Change =
  | { op: 'add';    record: Record }              // new item joined the result
  | { op: 'remove'; key: string }                 // item left the result
  | { op: 'update'; key: string; fields: Partial<Record> }  // field-level patch
  | { op: 'replace'; record: Record }             // single-cardinality re-evaluation
```

`key` is the stuffId for Stuff-shaped records; for non-Stuff
records (e.g., `here.atmosphere`) it's a synthetic key derived
from the query path.

### Field sets

A client either names a pre-canned field alias OR declares
explicit fields:

```ts
type FieldAlias = 'ref' | 'detail' | 'minimal';

interface FieldSet {
  include: string[];               // e.g., ['displayName', 'iconKind', 'capabilities']
  // Future: nested field shapes for contents, slots, etc.
}
```

Pre-canned aliases keep the common case ergonomic; explicit
field-sets let widgets ask for exactly what they need.

---

## Result records

Two canonical record shapes plus a structured fallback. The
`fields` declaration selects which fields appear in the record.

### Reference record (`'ref'` alias)

For collection-shaped queries returning multiple Stuff items.
Light, list-friendly.

```ts
interface StuffRefRecord {
  stuffId: string;
  displayName: string;             // per-viewer-rendered
  iconKind?: 'item' | 'npc' | 'player' | 'container' | 'door' | 'feature' | 'fixture';
  quantity?: number;               // globbable stacks
  capabilities?: string[];         // verbs this actor can issue against this target
}
```

### Detail record (`'detail'` alias)

For single-cardinality queries returning one focused Stuff. The
inspection pane's primary food source.

```ts
interface StuffDetailRecord extends StuffRefRecord {
  shortDescription?: string;
  longDescription?: string;        // MML
  properties?: Record<string, PropertyValue>;
  slots?: SlotSummary[];
  contents?: StuffRefRecord[];     // refs, not nested details
  material?: MaterialSummary;
  lighting?: LightingSummary;
  atmosphere?: AtmosphereSummary;
  admin?: AdminMetadata;           // role-gated
}
```

### Structured / path records

For queries that resolve to non-Stuff values — atmosphere
readings, vitals scalars, time values. The record's shape is
the resolved structure, with a synthetic `key` for diff
addressing.

```ts
interface PathRecord {
  key: string;                     // query path or synthetic id
  value: unknown;                  // the resolved value
}
```

Example: `here.atmosphere.temperature` resolves to a single
PathRecord with `key: 'here.atmosphere.temperature'` and
`value: <Quantity instance serialized>`.

---

## Field projection — mixin-declared surface

Records get populated by walking the resolved Stuff's mixin
composition and collecting **subscribable field descriptors**.
There is no central catalogue, no `FIELD_HANDLERS` table to
maintain alongside the mixins, no schema registry. Each mixin
declares the wire projection of its own state. The substrate
is generic over the descriptors.

This is the same pattern the codebase already uses for
`static persistentFields`, `static defaultAliases`,
`static commandContributions`, and `static fieldMarshallers`:
mixin-owned, collected via composition walk at the consumption
site.

### The descriptor shape

```ts
type SubscribableFieldDescriptor =
  | { name: string; getter: string; on: EventClass; by: string }   // dynamic
  | { name: string; getter: string; static: true };                // intrinsic
```

Three things the descriptor binds together that the mixin
already knows:

1. **What to read** — `getter` names the method (`getHp`,
   `getIconKind`, `getDisplayName`). The substrate calls
   `stuff[getter]()` at projection time.
2. **What to listen for (dynamic only)** — `on` names the
   event class whose fires could change this field's value
   (`PropertyChangedEvent`, `NameChangedEvent`,
   `ContainmentChangedEvent`, …).
3. **How to filter the event (dynamic only)** — `by` names the
   event attribute that should match this descriptor's `name`.
   For `PropertyChangedEvent` it's `'property'`; the meta-bus
   binds events where `event.property === descriptor.name` to
   this descriptor's subscriptions.

`static: true` says "compute once on subscribe, no listener,
never emit a delta for this field." Used for intrinsic-to-class
data: `iconKind`, `templatePath`, the mixin composition list.

### Fact-mixin vs behavior-mixin

State-owning ("fact") mixins are named for what they HAVE; they
own the subscribable surface for that state. Behavior-owning
("behavior") mixins are named for what the host CAN DO; they
expose affordances but don't generally own ad-hoc state of their
own.

Existing fact-mixins: `NamedMixin` (has a name), `VisibleMixin`
(has short/long descriptions), `PropertiedMixin` (has the bag),
`TangibleMixin` (has weight, material).

Existing behavior-mixins: `Containable`, `Container`, `Mobile`,
`Posed`, `Wieldable`, `Slotted`.

When subscribable state has no natural home on an existing
behavior-mixin, the right move is a new fact-mixin named for
the state. iconKind → `HasIcon`; vitals (`hp` / `mv`) → a
`Vitals` mixin; sound emission state → `EmitsSound`; etc.
These mixins own the storage, the getter/setter, the event
emission, AND the `subscribableFields` declaration end-to-end.

### Worked example: dynamic scalar (Vitals)

```ts
class Vitals {
  static persistentFields = ['hp', 'mv', 'maxhp', 'maxmv'];

  static subscribableFields = [
    { name: 'hp',    getter: 'getHp',    on: PropertyChangedEvent, by: 'property' },
    { name: 'mv',    getter: 'getMv',    on: PropertyChangedEvent, by: 'property' },
    { name: 'maxhp', getter: 'getMaxhp', on: PropertyChangedEvent, by: 'property' },
    { name: 'maxmv', getter: 'getMaxmv', on: PropertyChangedEvent, by: 'property' },
  ];

  protected hp = 0;
  protected mv = 0;
  // ...

  getHp(): number { return this.hp; }
  setHp(value: number): void {
    if (value === this.hp) return;
    const old = this.hp;
    this.hp = value;
    EventApi.fire(new PropertyChangedEvent({
      target: this, property: 'hp', oldValue: old, newValue: value,
    }));
  }
}
```

A subscription with `fields: ['hp']`:

- Reads via `stuff.getHp()` at resolve time
- Derives dependency `PropertyChangedEvent` filtered to
  `target == stuffId && property == 'hp'`
- Registers in the meta-bus index, awaits fires, diffs, ships
  deltas

Adding `hp` to a different mixin (say `RechargeableBattery`'s
`charge` field) needs zero substrate changes — the new mixin
declares its own `subscribableFields`, the substrate picks it
up via the composition walk.

### Worked example: intrinsic-to-class field (HasIcon)

iconKind is per-instance (content can override the cursed-sword
to render with a special icon) but doesn't change at runtime
in the common case, so it's a fact-mixin with `static: true`
descriptors:

```ts
class HasIcon {
  static persistentFields = ['iconKind'];

  static subscribableFields = [
    { name: 'iconKind', getter: 'getIconKind', static: true },
  ];

  protected iconKind: IconKind = 'item';   // safe default

  getIconKind(): IconKind { return this.iconKind; }
  setIconKind(kind: IconKind): void { this.iconKind = kind; }
}
```

Authored content sets the icon at template time via the
standard data field:

```yaml
class: /lib/whatever/Sword
data:
  iconKind: cursed-weapon
```

Most templates leave it implicit and inherit the mixin default;
special instances override.

### Optional: hints from other mixins

When content gets tedious ("do I really have to set iconKind
on every NPC template?"), behavior-mixins can declare
`static iconHint?: IconKind` and HasIcon's getter walks the
composition chain at first read to pick the most-specific hint
when no explicit value was set:

```ts
class ContainableMixin { static iconHint: IconKind = 'item'; }
class CharacterMixin   { static iconHint: IconKind = 'npc'; }
class AvatarMixin      { static iconHint: IconKind = 'player'; }
class DoorBearingMixin { static iconHint: IconKind = 'door'; }
```

HasIcon resolves: explicit override > most-specific hint >
intrinsic default. Same precedence model as
`LocomotionApi.defaultModeFor` (setting → bodyplan default →
universe default).

The hint chain ships when authors push for it. v1 ships HasIcon
with explicit storage + intrinsic default only.

### The composition walk + dependency derivation

```ts
function collectSubscribableFields(stuff: Stuff)
  : Map<string, SubscribableFieldDescriptor>
{
  const out = new Map();
  for (const cls of MixinApi.walkComposition(stuff.constructor)) {
    const fields = (cls as any).subscribableFields;
    if (!fields) continue;
    for (const d of fields) out.set(d.name, d);
  }
  return out;
}

function projectFields(
  stuff: Stuff,
  fieldNames: string[],
  viewer: Sensor,
): Record<string, unknown> {
  const descriptors = collectSubscribableFields(stuff);
  const out: Record<string, unknown> = { stuffId: stuff.stuffId };
  for (const name of fieldNames) {
    const d = descriptors.get(name);
    if (!d) continue;
    out[name] = (stuff as any)[d.getter]();
  }
  return out;
}

function deriveDependencies(
  stuff: Stuff,
  fieldNames: string[],
): DependencyFilter[] {
  const descriptors = collectSubscribableFields(stuff);
  return fieldNames
    .map(n => descriptors.get(n))
    .filter((d): d is Extract<SubscribableFieldDescriptor, { on: EventClass }> =>
      !!d && 'on' in d
    )
    .map(d => ({
      event: d.on,
      filter: { target: stuff.stuffId, [d.by]: d.name },
    }));
}
```

Three small functions. No central registry. Adding a new
subscribable field anywhere in the engine = one entry on the
mixin's `subscribableFields`. Nothing else changes.

### The (one) substrate-side synthetic field

`capabilities` is the exception — the only truly synthetic field
projected by the substrate rather than by any single mixin. It
exists because the verbs an actor can issue against a target
depend on BOTH the actor's state (mixins, skills, possessions,
posture) AND the target's state (mixins, properties). No single
mixin owns the answer; it's a cross-mixin computation.

The substrate provides the projector for `capabilities` directly.
The verb-provisioning slate's machinery feeds into it (which
verbs apply to this composition, given this actor's
affordances). Coarse category bits on `ref` records, full verb
list on `detail` records, per the earlier capability discussion.

Adding ANY other cross-mixin synthetic field in the future would
follow the same pattern: substrate-side projector + integration
with whatever mechanisms feed into it. But these should be rare
and explicit — the strong default is fact-mixin-owned state.

---

## Subscription lifecycle (server-side)

```ts
class MqlSubscriptionApi {
  // Per-Interactive registry
  static #subscriptions = new Map<Interactive, Map<string, SubscriptionState>>();
}

interface SubscriptionState {
  query: string;
  ast: MqlAst;                     // parsed once, reused
  fields: FieldSet;
  cardinality: 'single' | 'collection';
  lastResult: Record[];            // for diff against next eval
  dependencies: EventDependencySet; // which EventApi kinds + filters
  throttle?: ThrottleState;
}
```

### Subscribe lifecycle

1. Inbound `mql-subscribe`.
2. Parse the query (cached AST). On parse failure, send
   `mql-subscription-error` with `reason: 'parse'`.
3. Resolve once, in the viewer's perception scope. On resolve
   failure, send error.
4. Project the result through the field-set into records.
5. Register `EventApi` listeners for the dependency set (see
   below). Cache the AST and last-result on the subscription
   state.
6. Send `mql-subscription-result` with initial records.

### Change lifecycle

1. `EventApi` fires (e.g., `ContainmentChangedEvent`).
2. Subscription registry routes the event to listeners.
3. For each affected subscription:
   - Check dependency match (was the event in scope for this
     query?). If no, skip.
   - Re-resolve the AST.
   - Project to records.
   - Diff against `lastResult`. Compute `Change[]`.
   - Update `lastResult`.
   - Send `mql-subscription-delta` with the changes.
4. Throttling (see below) may coalesce multiple events in a
   tick before re-resolution.

### Unsubscribe / disconnect

- Explicit unsubscribe: remove the state, unregister listeners.
- Disconnect: `cancelAll(interactive)` removes every subscription
  for that interactive in one pass.

---

## Change detection — dependency tracking

The naive implementation re-resolves every subscription on
every event. That's `O(events × subscriptions)` per tick and is
not viable past a handful of either.

The mechanism: a **meta-bus** layered on `EventApi` that indexes
subscriptions by their declared dependencies, looks up matching
subscriptions per event in `O(matched)`, and coalesces all
re-resolves for a tick into one pass per subscription.

### The meta-bus and the dependency index

`EventApi` itself stays simple — typed events, subscribe with
a handler. The subscription substrate adds an index on top:

```ts
// Two-level map: event kind → filter-value → subscriptions
type DependencyIndex = Map<
  EventKind,
  Map<string /* filter key */, Set<SubscriptionId>>
>;
```

When an event fires, the meta-bus:

1. Looks up `EventKind` in the outer map.
2. For each filter attribute on the event (`target.stuffId`,
   `property`, `from`, `to`, etc.), looks up the matching
   subscription set in the inner map.
3. Unions the matched sets, marks each `dirty`, schedules the
   tick's re-resolve pass if not already scheduled.

Per-event work is bounded by the actual number of interested
subscriptions, not by total count. A single event fires only
into the subscriptions that asked for it.

### The re-resolve pass (micro-batch)

The pass runs once per Node event-loop tick via `setImmediate`:

1. Walk the dirty set.
2. For each dirty subscription: re-resolve its AST in the
   viewer's scope, project through the field-set, diff against
   `lastResult`, emit one delta.
3. Clear dirty flags.

The key invariant: events that happen in the same synchronous
chain of mutations (a `drop all` firing 10 `ContainmentChanged`
events) generate one re-resolve per affected subscription, not
ten. The micro-batch boundary aligns with the engine's
existing event-fire-after-mutation discipline.

### Coarse dependencies (v1)

Each MQL query AST is walked at parse time to derive a coarse
dependency set:

- `all things in here` → depends on `ContainmentChangedEvent`
  with `to == viewer.location` OR `from == viewer.location`,
  AND `ContainmentChangedEvent` with `subject == viewer`
  (because "here" itself re-resolves if the viewer moves).
- `me.hp` → depends on `PropertyChangedEvent` with
  `target == viewer` AND `property == 'hp'`.
- `all sleeping things in here` → depends on the above
  containment change AND `LifecycleStateChangedEvent` on the
  in-scope set (see "Dynamic dependency sets" below).
- `$focus` (detail) → depends on changes to whatever the focus
  points at AND `FocusChangedEvent` for the viewer.

This is conservative — sometimes re-evaluates when not strictly
necessary — but cheap and correct. The dependency-set is a
small interpreter walk over the AST; well-understood.

### Dynamic dependency sets

The hard case: a query whose dependency set depends on its own
results. `all sleeping things in here` needs lifecycle-change
notifications on **whatever is currently in the room**, which
changes as things enter and leave.

Two strategies:

- **Conservative coarse** (v1): subscribe to
  `LifecycleStateChanged` on ANY stuffId. Re-resolve naturally
  filters in-query. Wasteful but correct, simple to implement.
- **Adaptive** (Tier 2): after each resolve, derive the
  "currently interested" stuffId set and update the meta-bus
  listeners (subscribe to new, unsubscribe from old). Bounded
  but adds bookkeeping; the AST walker also needs to emit
  "interest sets" alongside the static dependency set.

v1 ships conservative. The architectural seam (the AST walker
can produce both static and dynamic dependency sets, the
meta-bus accepts mid-life listener updates) is shaped so
adaptive lands without a rewrite.

### Race conditions and ordering

`EventApi` fires synchronously after the state change (existing
witness-pattern discipline). Re-resolution therefore sees
consistent post-change state — no read-your-write hazards.

Cross-subscription ordering, however, is **not contracted.**
Two subscriptions affected by the same event (e.g.,
`me.inventory` and `here.contents` both seeing a pickup) emit
deltas in the same tick but in arbitrary order. Clients
applying each independently are fine; widgets that need a
joined snapshot subscribe to a single composite query
(`{ inventory: me.inventory, here: here.contents }`) and get
one delta carrying both. Composite-query support is Tier 2; v1
ships independent subscriptions only.

### Capability fields and their dependencies

The `capabilities` field on `StuffRef` ("verbs the actor can
currently issue against this target") is per-emission expensive
AND has wide dependency surface: actor mixins, target mixins,
body-plan slots, possessions, skills, posture all feed into it.

Granularity choice:

- **Coarse on `ref`**: category bits like `actionable`,
  `talkable`, `wearable`, `examinable`. Cheap to compute,
  stable, sufficient for right-click menus and chip styling.
- **Full on `detail`**: complete per-target verb list when the
  player focuses. Expensive but rare; the detail fetch is the
  natural place to pay.

This split also limits the dependency blast radius. The coarse
bits depend only on TARGET-side mixin presence (rarely changes
during a session). The full verb list depends on ACTOR state
(equipment, skills, posture) — those changes only force re-
resolve for the focused detail subscription, not for every ref
in every list.

`CapabilityChangedEvent` fires when actor state shifts in ways
that affect what they can do (donning lockpicks → `pick`
appears against doors). Detail subscriptions hooked on this
event re-resolve; ref subscriptions do not (coarse bits are
target-driven, not actor-driven).

### Catch-all events

Some events are catch-all (`Anything-changed-in-this-location`).
For widgets that want a "just re-eval whenever ANYTHING happens
in my scope" mode, the dependency set declares it explicitly
(`options.coarse: true` on subscribe). Server emits more often
but the subscription is simpler. The meta-bus indexes these
under a wildcard key.

### Resolution failures mid-stream

A subscription on `me.locked-thing.contents` — if `locked-thing`
gets destroyed, the resolution path errors. Policy:

1. Emit `mql-subscription-error` with `reason: 'resolve'` and a
   diagnostic message.
2. Auto-cancel the subscription (deregister from the index,
   release `lastResult`).
3. Client may re-subscribe with an updated query.

Tempting alternative — keep the subscription alive and emit an
empty result — leaves the client guessing why. Explicit error
is easier to reason about.

---

## Throttling and batching

Multiple events in the same tick (e.g., a player puts down 10
items in one `drop all` command) shouldn't trigger 10
re-resolutions. Coalesce.

Per-subscription throttle:

- **Default**: micro-batch — coalesce events within one Node
  event-loop tick (`setImmediate` boundary). Re-resolve once per
  tick.
- **`options.debounce: ms`** — debounce changes to once per
  `ms`. Useful for high-churn widgets (atmosphere readings,
  weather) where the player doesn't need sub-second precision.
- **`options.throttle: ms`** — fixed rate cap. Different
  semantic; rarely needed.

Defaults work for nearly every case. Authors opt in to longer
windows where appropriate.

---

## Canonical subscription kinds (v1 catalogue)

These are the patterns content authors and the cockpit widgets
copy. The substrate is general; the canon keeps the common
shapes ergonomic.

| Name | Query | Field-set | Used by |
|---|---|---|---|
| `inventory` | `all things in me` | `ref` | Inventory widget |
| `things-here` | `all things in here` | `ref` | Pre-inspection-pane things-here, NPCs / players in room |
| `exits` | `all exits of here` | `ref` (with `iconKind: 'door'` semantics) | Inspection pane exits row |
| `slots` | `all slots of me` | custom (`occupant`, `slot.name`, `accepts`) | Slot map widget |
| `focus-detail` | `$focus` | `detail` | Inspection pane body |
| `atmosphere-here` | `here.atmosphere` | structured | Atmosphere readout |
| `lighting-here` | `here.lighting` | structured | Lighting band, sources |
| `vitals` | `me.{ hp, maxhp, mv, maxmv }` | structured | Prompt format tokens (future) |
| `engagement` | `me.engagement` | structured | Engagement indicator |
| `posture` | `me.posture` | structured (scalar) | Prompt token (future) |
| `clock` | `world.time` | structured | Status header time |

v1 client widgets reach for these names; the substrate resolves
each to the corresponding (MQL, field-set) pair. New widgets
either use a canonical kind or declare their own (still MQL,
just authored ad-hoc).

---

## Worked example: inventory widget

```
1. Client mounts the inventory widget.
2. Sends:
     { type: 'mql-subscribe',
       subscriptionId: 'inv-1',
       query: 'all things in me',
       fields: 'ref' }
3. Server parses, resolves (returns 3 stuff items for the
   actor's inventory).
4. Server registers listeners on ContainmentChangedEvent with
   filter (to == actor || from == actor).
5. Server sends mql-subscription-result with 3 ref records.
6. Client renders inventory chips.
7. Player issues `drop sword`.
8. ContainmentChangedEvent fires (sword: actor → location).
9. Subscription's dependency check passes.
10. Re-resolves: now 2 items.
11. Diff: { op: 'remove', key: '<sword-stuffId>' }
12. Sends mql-subscription-delta.
13. Client patches its local ref list, re-renders.
14. Player picks up the same sword.
15. ContainmentChangedEvent fires again.
16. Re-resolve, diff: { op: 'add', record: { stuffId, displayName, iconKind, ... } }
17. Client patches + re-renders.
```

---

## Worked example: inspection pane

The pane subscribes to `$focus` with `detail` fields. When focus
changes:

```
1. Player runs `examine thermometer`.
2. FocusController calls setFocus → FocusChangedEvent fires.
3. The pane's subscription on `$focus` is triggered.
4. Re-resolves: now returns the thermometer Stuff.
5. Projects detail fields (long desc, properties, material, ...).
6. Server diffs against the previous focused thing's detail.
7. Sends mql-subscription-delta with `op: 'replace'` (single-
   cardinality semantics).
8. Client renders the new detail in the pane body.

Subsequent mutations on the thermometer (e.g., setProperty)
emit PropertyChangedEvent; the subscription re-resolves;
diffs only the changed properties; ships an `op: 'update'`
with the patched fields.
```

This is exactly the inspection-pane slate's "header/body
decouple" semantics implemented as a subscription: header
follows live focus (because the FocusChangedEvent updates the
subscription's resolved target); body shows the current
detail (because the subscription's result is the detail
projection).

---

## Client cache and lifecycle

The client maintains a flat cache of subscription results:

```ts
Map<SubscriptionId, {
  lastResult: Record[];
  lastFrameId: number;
  kind: 'single' | 'collection';
}>
```

That's it (for v1). No object normalization, no schema layer,
no separate per-Stuff cache. The subscription IS the cache,
scoped to the widget's view of the world.

**Widgets read via selectors, not directly.** Even though the v1
cache is per-subscription, widgets call hooks like
`useThingsHere()`, `useInventory()`, `useFocusedDetail()` — a
selector layer — rather than reaching into subscription state
directly. The selector indirection is essentially free in v1
(one function call) but it's the seam the future shadow-model
layer slots into without touching widgets. See
[Shadow model](#shadow-model-future).

### TTL: none

There is no time-based expiration. The subscription contract
says "I keep telling you when this changes." As long as the
subscription is alive, the data is current by definition.

This is the right model AS LONG AS the wire is reliable and the
server-side bookkeeping is complete. The risk is a missed event
or a broken dependency derivation leaving a subscription silently
stale. Two mechanisms catch this:

### Gap detection via frameId

Every envelope from the server carries `frameId` from a
per-Interactive monotonic counter (the same counter the
response-envelope subsystem stamps). The client tracks the last
seen frameId. If a frame arrives with `frameId > lastSeen + 1`,
there's a gap — something was lost or filtered.

Gaps may be benign (a frame legitimately filtered out for this
viewer; the counter still increments globally). They may also
indicate a real drop. The client doesn't have to assume the
worst — but it CAN trigger a paranoid resync on its key
subscriptions when gaps are observed, particularly clustered
gaps. Threshold + policy are client-tunable.

### Server heartbeats

A periodic server-side heartbeat (every ~30s) carries the
current frameId. The client treats heartbeat absence as a
connectivity hint (transitioning toward "disconnected"
assumptions) and uses the heartbeat's frameId to detect gaps
during quiet periods.

### Resync mechanism

When the client decides a subscription needs verification, it
sends `mql-subscribe-update` with `refresh: true`. Server
re-resolves the binding and ships a fresh
`mql-subscription-result` (reason: `'refresh'`). Client replaces
its cached state with the new result.

Triggers for resync (client-side policy):

| Trigger | Scope |
|---|---|
| Gap detected on a subscription's recent traffic | Targeted to that subscription |
| Reconnect after disconnect | All active subscriptions |
| Tab visibility restored after long backgrounding | All active subscriptions |
| Heartbeat lapse | All active subscriptions |
| Explicit player gesture (silent refresh button) | Specific subscription |
| First mount of a previously-hidden widget | The widget's subscription |

The cost of an unnecessary resync is one full result envelope
plus a re-resolve on the server. Cheap; better than risking
silent stale.

### What the cache is NOT

- **Not normalized.** Two subscriptions on overlapping data
  (e.g., `inventory` and `things-here` after a pickup) both
  carry their own copy of the moved item's ref. No
  deduplication. The bandwidth cost is small for the simpler
  data model.
- **Not cross-subscription consistent.** Deltas from two
  subscriptions arrive in undefined order within a tick. The
  client applies each independently. Composite queries are the
  answer when joined consistency matters (Tier 2).
- **Not derived.** No reactive computed values, no client-side
  joins. What the server projects is what the client renders.
- **Not persisted across reconnect.** The cache lives in
  memory; reconnect re-subscribes and rebuilds from initial
  results. No offline support.

---

## Cascading UI patterns

A few specific design patterns the substrate enables (or
constrains).

### Hover tooltips on chips

A `things-here` chip shows `displayName + iconKind`. Hover
wants short description + maybe weight. Three approaches:

- **Pre-include in the ref field-set** — subscription asks for
  the extra fields up front; refs get fatter; no extra network
  on hover. Best for high-hover surfaces.
- **One-shot fetch on hover** — `mql-query` for the hovered
  stuffId with `detail` fields. Latency on hover (50-200ms).
- **Lazy upgrade to detail subscription on hover** — heavy and
  rarely worth it for transient hovers.

Default to (1) with conservative extra fields. Widgets that
genuinely need detail-on-hover use (2).

### Refresh button on the inspection pane

The button has two reasonable interpretations:

- **"Look again"** — sends `look` through the command bus.
  Fires prose, runs the focus side-effect chain, generates an
  envelope. Player gesture; visible in the terminal.
- **"Refresh my widget"** — sends
  `mql-subscribe-update { refresh: true }` on the MQL channel.
  Silent resync. No prose, no terminal output.

These are different gestures. The inspection-pane slate's
prominent button is **Look again** (the player-visible action);
a smaller ↻ icon next to it is the silent resync. Both real,
neither subsumes the other.

### Widget mount / unmount

Widget mounts → opens a subscription (or re-uses a shared one if
the same query is already live). Widget unmounts → unsubscribes
(or decrements ref-count on the shared subscription, closing
when zero).

No subscription survives the widget being unmounted unless
another widget is referencing the same query. Memory bounded by
visible widgets.

### MQL-query results in a pane tab

User runs `mql 'all sleeping things in here'` and wants results
in a pane tab. Default to **one-shot** (`mql-query`): a snapshot
that's stale immediately but cheap. Tab UI has a "Make live"
toggle that promotes to a subscription on demand. Matches the
player's mental model of a query as a single-shot operation.

### Cascading focus updates

Player examines a thing in the inventory chip strip. The
`inspection` subscription's `$focus` re-resolves to the new
target. The chip strip itself doesn't change (still showing the
same inventory). Pane body shifts. Two subscriptions affected,
no cross-coupling — they're independent.

Same when the player walks: `things-here` re-resolves, but
`inventory` doesn't (no events match its dependency filters).
The independence is what makes this model scale.

---

## Shadow model (future)

The v1 client cache is **disjointed pointers** — each
subscription's `lastResult` lives independently in the cache,
widgets read from whichever subscription they care about, and
the client forgets things the moment they leave scope (a
subscription closes; its data is gone).

That's fine for the cockpit's "what's right here right now"
widgets. It's NOT fine for any UI element that wants to show
**state at a distance** or **history of what you've seen**.
The motivating example: a 3D mini-map that fills out as you
explore. The map should keep showing the lobby's existence
after you walk south to the steps — but `things-here` for the
lobby is no longer subscribed, so the v1 cache has nothing to
render the lobby from.

Other surfaces with the same shape:

- **Recent rooms breadcrumb** in the inspection pane (history
  of visited locations)
- **Long-distance perception** when sound / scent / view-through-
  windows surfaces want state on the far side of a boundary
- **Search results** — `mql find sword` matching items not in
  your immediate scope
- **Author / admin tools** wanting to inspect distant state
- **Quest journals / world state overviews** that aggregate
  across the whole world

All of these need **persistent client-side knowledge** that
outlives the subscription that supplied it.

### The architecture: normalizer + shared store + selectors

The substrate (server-side) doesn't change. The client cache
layer evolves:

```
Subscription delta
        ↓
Normalizer  ← merges by stuffId / locationId into the shared store
        ↓
Shared store  (flat, normalized; survives subscription lifetime)
        ↓
Widget selectors  ← read derived views (with provenance + freshness)
        ↓
Widgets render
```

Widgets don't know which subscription supplied which record.
They ask the store via selectors (`useStuff(stuffId)`,
`useTopology()`, `useLocation(id)`). Subscriptions feed the
store; the store outlives any single subscription.

### Store shape

```ts
interface ShadowStore {
  // Every Stuff the client has any data about. Records may be
  // partial (a ref from a list) or full (detail from focus).
  stuff: Map<StuffId, StuffShadowRecord>;

  // Spatial / topology cache. Built up as the client visits
  // rooms; entries persist across moves.
  locations: Map<StuffId, LocationShadowRecord>;
  exits: Map<StuffId, ExitShadowRecord>;

  // Subscription provenance — which subs are currently feeding
  // which entries.
  provenance: Map<StuffId, ProvenanceInfo>;
}

interface StuffShadowRecord {
  stuffId: string;
  displayName?: string;
  iconKind?: IconKind;
  lastKnownContainer?: StuffId;        // where we last saw it
  detailFields?: Partial<StuffDetail>; // populated if we ever focused
  freshness: 'live' | 'last-known';
  asOfFrameId: number;
}

interface LocationShadowRecord {
  stuffId: string;
  displayName?: string;
  knownExits?: Array<{ direction: string; destinationId: StuffId }>;
  visited: boolean;
  lastKnownContents?: StuffId[];
  freshness: 'live' | 'last-known';
  asOfFrameId: number;
}

interface ProvenanceInfo {
  liveSubs: Set<SubscriptionId>;   // currently feeding this entry
  lastUpdatedFrameId: number;
}
```

Two annotations on every record carry the semantics that
disjointed-cache loses:

- **`freshness`** — `'live'` if at least one subscription is
  currently feeding this entry; `'last-known'` if every
  contributing subscription has closed. Widgets render
  last-known entries with dimming / "as of N minutes ago" /
  whatever signal fits.
- **`asOfFrameId`** — when the entry was last updated. Lets
  selectors compute age, sort by recency, etc.

### Normalizer behavior

On subscription **result** or **delta**:

1. Walk records / change ops.
2. For each record, upsert into the store by id. Merge fields:
   new overwrites old; old fields persist unless explicitly
   cleared.
3. Track contributing subscription in provenance.
4. Mark `freshness: 'live'`.

On subscription **close** (unsubscribe / disconnect):

1. Remove this subscription from each contributed entry's
   `liveSubs`.
2. If an entry's `liveSubs` becomes empty, flip
   `freshness: 'last-known'`. **Do NOT delete the entry.**
3. Data is now historical but still queryable.

On subscription **re-open** (player walks back into the lobby):

1. New result envelope upserts. Stale fields overwritten with
   fresh.
2. Provenance updates; freshness flips back to `'live'`.

The store is **monotonically accumulating**. Eviction is
bounded by either (a) explicit forget (LRU across long sessions)
or (b) restart. Memory usage grows linearly with what you've
explored; game-sized worlds are fine.

### Worked example: the mini-map

```
t=0  Bobalu spawns in lobby.
     things-here + inspection subscriptions open; results land.
     Normalizer upserts:
       store.stuff[*] — contents of lobby (ref records)
       store.locations[lobby] = {
         displayName: 'Duncan Hall Lobby',
         knownExits: [{ south, steps }],
         visited: true, freshness: 'live'
       }
     For the destination steps (named in lobby's exits but not
     yet visited):
       store.locations[steps] = {
         visited: false, freshness: 'last-known',
         lastKnownContents: undefined  // unknown yet
       }
     ← partial node; we know it exists, no detail yet.

t=10  Bobalu walks south.
      things-here, inspection re-resolve in new scope (steps).
      Normalizer upserts:
        store.locations[steps] = {
          displayName: 'Duncan Hall Front Steps', ...,
          knownExits: [{ north, lobby }],
          visited: true, freshness: 'live'
        }
      Lobby's contributing subscriptions all closed; its
      freshness flips to 'last-known'. But lobby ENTRY DOESN'T
      DISAPPEAR — visited stays true, lastKnownContents is
      whatever was there when Bobalu left.

t=15  Bobalu opens the mini-map widget.
      Widget selector: useTopology() → reads from store.locations
      + store.exits, builds a graph.
      Mini-map renders:
        - lobby: solid (visited), dim (last-known)
        - steps: solid (visited), bright (live; current)
        - edge: lobby ↔ steps (north / south)
      No subscription opened for the map. It's reading
      accumulated state.

t=30  Bobalu explores east, then south, then back. Topology
      graph grows. Each new visit adds nodes + edges.
      Unvisited destinations remain as ghost nodes (named in
      exits, never resolved in detail).

t=∞   Bobalu re-enters the lobby.
      Lobby's subscriptions re-open. Fresh result lands.
      Normalizer overwrites stale fields. freshness flips to
      'live'. Mini-map highlights the lobby; lastKnownContents
      replaced by current contents.
```

The mini-map widget itself uses **zero live subscriptions**
beyond what the rest of the cockpit already has. It reads from
accumulated history. That's the property the disjointed-pointer
model can't give us.

### Why this stays a v1 seam, not a v1 build

The cost of the selector indirection in v1 is essentially zero
(one function call per widget read). The store and normalizer
can ship as a v1 pass-through (the "store" is a thin facade over
the per-subscription cache) and evolve into the real shadow
model when the mini-map (or another distance-aware surface)
demands it.

What we get from designing the seam now:

- Widgets in v1 are written against selectors, not against raw
  subscription state.
- When the normalizer arrives, the selector layer is the seam
  it slots into.
- Widget code doesn't change.

What we get from NOT designing the seam:

- v1 widgets read subscription state directly.
- Adding the shadow store later requires rewriting every widget.
- The transition spans the whole client codebase.

The shadow model proper (normalizer, freshness annotations,
eviction policy, possibly localStorage persistence) graduates
to its own dedicated slate when build effort is committed.
Until then, this section captures the design pull and the v1
seam that preserves it.

---

## Per-viewer everything

MQL resolves in the viewer's perception scope already. The
subscription substrate inherits this for free:

- Disguise — `displayName` field varies per viewer; the same
  subscription on `all players in here` returns different
  names to different viewers.
- Identification — `material.identifiedAs` (or whatever the
  recognition slate ships) varies; subscription respects the
  recognition state of each viewer.
- Permission — admin metadata fields only project for admin
  viewers; same query, different field-sets in effect.
- Perception — things outside the viewer's perception don't
  appear in their subscription result.

This means **per-viewer rendering is the substrate's tax** —
every projection happens with the viewer threaded through.
Servers that want shared subscriptions across many clients
need to be careful here; the model assumes per-Interactive
subscriptions, evaluated independently.

---

## Non-goals (v1)

- **Mutation via subscription channel.** No `mql-mutate`
  message. Commands stay on the command bus. Keeps the
  security model clean.
- **Arbitrary client-authored MQL queries.** v1 ships the
  pre-canned subscription kinds only. The mechanism is
  general — a future flag could enable freeform — but
  exposing arbitrary MQL to untrusted clients is a security
  decision worth its own pass.
- **Cross-subscription reactive joins.** Subscriptions are
  independent. No "when subscription A's result updates,
  invalidate subscription B" semantics. Each is its own
  re-resolution boundary.
- **Multi-Interactive subscription sharing.** Two devices for
  one user maintain separate subscriptions. Sharing the
  subscription state across them is an optimization, not a
  v1 requirement.
- **Fine-grained dependency tracking.** Coarse dependency
  sets only; fine-grained per-stuffId tracking is Tier 2.
- **Subscriptions surviving disconnect.** Disconnect cancels
  all subscriptions; reconnect re-subscribes. No mid-session
  state persistence.
- **Optimistic mutation reflection.** When the client sends a
  `take sword` command, the inventory subscription's update
  arrives back via the normal subscription delta path — there's
  no client-side prediction layer that updates the inventory
  before the server confirms.

---

## Open questions

1. **`select { ... }` grammar.** Where does the field-set
   declaration go syntactically? As a clause on the MQL query
   (`all things in me select { displayName, capabilities }`),
   or as a separate parameter on the subscribe message
   (`{ query: '...', fields: { include: [...] } }`)? Lean the
   separate parameter — keeps MQL grammar untouched, easier
   to evolve field-sets without grammar changes.
2. **Permission churn mid-session.** A player gets promoted to
   admin role mid-session. Existing subscriptions don't
   automatically include the now-newly-visible fields. Force
   re-subscribe? Auto-extend? Lean force re-subscribe — explicit
   is simpler than implicit. Document the requirement.
3. **Capability staleness.** A subscription's `capabilities`
   field reflects the actor's affordances at evaluation time.
   When the actor's verb-provisioning changes (puts on
   lockpicks, learns a skill), do all open subscriptions
   re-emit with refreshed capabilities? Probably yes via a
   `CapabilitiesChangedEvent` that triggers re-resolution; the
   verb-provisioning slate owns the event.
4. **Result identity for non-Stuff records.** PathRecords use
   a synthetic key from the query path. Two subscriptions on
   the same path use the same synthetic key — fine, they
   project independently. But complex queries that resolve to
   computed values need a clear key convention. Pin at impl
   time.
5. **Bandwidth ceilings.** A pathological subscription on a
   busy room could emit hundreds of deltas a second. Is there
   a per-subscription rate cap? Per-Interactive cap? Server
   degradation behavior (drop deltas vs. close subscription
   with error)? Lean: micro-batch coalesces most cases, debounce
   handles known-busy; bandwidth ceilings deferred until they
   actually bite.
6. **Field-set composition.** Can a client say "give me the
   `ref` alias PLUS one extra field"? Lean yes —
   `fields: { extend: 'ref', include: ['extraField'] }`. Easy
   addition; defer until first user.
7. **Subscription introspection.** Server-side surface for
   "list my open subscriptions" — useful for admin debugging
   and player UI ("you have N live widgets"). Probably yes,
   gated.
8. **Throttling on initial result.** If a subscription's
   initial resolve is slow (a big query), does the client
   block waiting? Probably emit the result asynchronously
   (Promise on the API), with optional initial-state placeholder
   on the wire ("initial resolving, please wait").

---

## Decisions to pin before build

A few choices that don't surface in the public API but shape
the implementation; named here so they're discussed before a
build cycle starts, not midway.

| Decision | Lean | Notes |
|---|---|---|
| EventApi filter matching | Equality-on-attribute only | Arbitrary predicate matching is a perf trap; equality is indexable in `O(1)` |
| Dependency-index keying | Two-level (eventKind → filter-value → subs) | Cheap, supports the common "all things changed in room X" lookup pattern |
| Dynamic dependency strategy v1 | Conservative coarse | Adaptive when perf bites |
| Capability granularity per ref | Coarse bits in ref, full list in detail | Reduces dependency blast radius from actor state changes |
| Subscription error policy on mid-stream resolution failure | Emit error + auto-cancel | Explicit beats silent empty results |
| Disconnect cleanup | `cancelAll(interactive)` removes index entries + state + listener handles in one pass | Same shape as `PromptApi.cancelAll` |
| Per-Interactive subscription cap | Soft cap (start ~50) with error envelope on excess; tune with telemetry | Avoids a runaway client exhausting server memory |
| Permission churn (admin role granted) | Force client re-subscribe | Explicit is simpler than implicit re-resolve with new field projections |
| Initial-result performance contract | Subscriptions are for hot-loop state, not heavy queries; refuse pathologically expensive ASTs at subscribe time | Document the contract so authors don't put `mql "everything in the universe"` behind a widget |
| Cross-subscription emit ordering | Not contracted | Composite queries are the answer when joined consistency matters; Tier 2 |

---

## Dependencies

- **MQL** ([mql.md](../subsystems/mql.md)) — the substrate
  this slate sits on. v1 ships with current grammar; the
  field-set declaration is a separate parameter, not a
  grammar extension.
- **EventApi** — the change source. Subscriptions register
  listeners; existing event vocabulary covers most needs.
  Some new events will need to be added (e.g.,
  `FocusChangedEvent`, `CapabilitiesChangedEvent`,
  `PropertyChangedEvent` if not already present).
- **Per-viewer rendering / Sensor / Visible** — already
  present; subscriptions inherit.
- **Recognition slate** — once shipped, identification
  state per viewer affects what subscription fields project.
- **Verb-provisioning slate** — capabilities field is the
  client-facing projection of provisioning.

---

## Suggested build order

The first goal isn't "all the canonical kinds" — it's **one end-
to-end live round-trip** against the simplest possible query, to
prove the meta-bus + diff + delta loop works. Everything else
layers on once that's solid.

1. **Substrate skeleton + one query** — `MqlSubscriptionApi`,
   the registry, subscribe / unsubscribe. Target ONE query shape:
   `me.<scalar>` (e.g., `me.hp`). Single-shot resolve, no
   change-detection yet. Proves the wire end-to-end with a stub
   "emit on demand" trigger.
2. **Diff algorithm** — generic per record type. Small (~50 LoC).
   Wire the result + delta envelopes.
3. **Meta-bus + EventApi integration** for the
   `PropertyChangedEvent` case. Subscribe the registry; on fire,
   look up affected subs, mark dirty.
4. **Re-resolve pass + setImmediate batching** — first real
   round-trip. Change `me.hp` server-side, watch the delta land.
   This is the milestone that proves the architecture works.
5. **Coarse dependency derivation — collection-shaped queries**:
   `all things in here`. Adds containment-change dependency
   handling; introduces the dynamic-set-via-conservative-coarse
   strategy.
6. **Canonical subscription kinds (server)** — pre-canned
   query + field-set pairs registered with friendly names
   (`inventory`, `things-here`, `slots`, etc.). Each is just
   a query + field-set tuple; the substrate is already general.
7. **Capability computation** — coarse bits in refs; build the
   per-ref evaluator that checks target mixins for category
   flags.
8. **Client subscription infrastructure** — Zustand slice
   managing live subscriptions, applying deltas, cleaning up on
   disconnect.
9. **First consumer widgets** — inventory chip strip; slot map;
   atmosphere readout. ~50-150 LoC each against the slice.
10. **Inspection pane consumer** — `$focus` subscription
    re-binds as focus shifts; renders detail records.
11. **`CapabilityChangedEvent` + full capabilities in detail
    records** — actor-side capability tracking, dependency
    integration. Lands as verb-provisioning slate matures.
12. **Composite queries / joined snapshots** (Tier 2) — when
    a widget needs cross-result consistency.
13. **Adaptive dependency sets** (Tier 2) — when conservative-
    coarse pushes the perf envelope.

Waves 1-4 are the architectural milestone (one query, end-to-
end, with real change detection). Waves 5-7 are the substrate
generalization. 8-10 are the client. 11+ are polish + future.
10. **Tier 2 polish** — fine-grained dependency tracking, longer
    debounce options, subscription introspection.

Waves 1-4 are the load-bearing build (probably 2-3 sessions).
Waves 5-6 are the canon + client. Waves 7+ ship per widget.

---

## What this changes upstream

- **Cockpit slate's "state-sync consumer" section** rewrites to
  "MQL-subscription consumer" with the same intent.
- **Inspection pane slate's wire shape (`InspectionFrame`)
  goes away** — replaced by a `focus-detail` subscription. The
  panel just subscribes to `$focus` with `detail` fields and
  renders the result. Less protocol, same behavior.
- **Prompt-stack slate's "Future Wave 8: state-sync-driven base
  prompt format"** becomes "Future: prompt-format token
  subscriptions." Same idea, sharper mechanism.
- **The fixed-delta `state-sync-slate.md`** is superseded.
  Suggest deleting it or marking it explicitly as historical.
- **Activity subsystem doc** (`docs/subsystems/activity.md`)
  describes completion mutations as flowing through "the state-
  sync channel." Under the new model, completion side effects
  flow through whatever subscriptions happen to be watching the
  affected state (inventory subscription sees a crafted item
  appear; vitals subscription sees stamina change). The activity
  subsystem doc gets updated when the MQL substrate ships and
  rewires the completion path. Left as-is for now; the conceptual
  intent ("world-deltas flow on a separate channel from envelopes")
  remains correct.
