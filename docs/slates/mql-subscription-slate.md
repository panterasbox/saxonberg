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

1. **Wire schema is small and stable.** Five message types total
   (subscribe / unsubscribe / result / delta / error). The wire
   doesn't grow per widget; what each widget cares about lives
   in its query string + field-set.
2. **MQL is the lingua franca.** Players type MQL in the prompt.
   Authors write MQL in NPC behavior / quest gates / validators.
   The client's widgets subscribe via MQL. One language across
   the whole engine.
3. **Read-only.** Subscriptions deliver state; mutation goes
   through the command bus. No "PATCH me.hp" via subscription.
   This keeps the security model clean and avoids re-implementing
   the verb / validator stack on a second channel.

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

Five message types, three outbound (client → server), three
inbound (server → client). All ride the existing envelope-style
channel; new `type` discriminator values.

### Outbound (client → server)

```ts
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
}
```

`subscribe-update` lets the client extend or repoint a live
subscription without tearing it down and re-establishing. Useful
for the inspection pane re-pointing as focus shifts.

### Inbound (server → client)

```ts
interface MqlSubscriptionResultEnvelope {
  type: 'mql-subscription-result';
  frameId: number;
  subscriptionId: string;
  items: Record[];                 // initial result — full shape per `fields`
  cardinality: 'single' | 'collection';
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
every event. That's not viable past a handful of subscriptions
under any meaningful event load.

The smart implementation: **subscriptions declare what they
depend on**, and the registry routes events accordingly.

### Coarse dependencies (v1)

Each MQL query AST is walked at parse time to derive a coarse
dependency set:

- `all things in here` → depends on `ContainmentChangedEvent`
  with `to == viewer.location` OR `from == viewer.location`
- `me.hp` → depends on `PropertyChangedEvent` with
  `target == viewer` AND `property == 'hp'`
- `all sleeping things in here` → depends on the above
  containment change AND `LifecycleStateChangedEvent` on the
  in-scope set
- `$focus` (detail) → depends on changes to whatever the focus
  points at AND `FocusChangedEvent` for the viewer

This is conservative — sometimes re-evaluates when not strictly
necessary — but cheap and correct. The dependency-set is a
small interpreter walk over the AST; well-understood.

### Fine dependencies (Tier 2)

For high-frequency queries, the registry could compute fine
dependencies (e.g., which specific stuffIds are in the current
result, only re-eval when one of THEM mutates). Skip for v1;
worth it when content actually pushes the perf envelope.

### Catch-all events

Some events are catch-all (`Anything-changed-in-this-location`).
For widgets that want a "just re-eval whenever ANYTHING happens
in my scope" mode, the dependency set declares it explicitly
(`options.coarse: true` on subscribe). Server emits more often
but the subscription is simpler.

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

1. **Substrate skeleton** — `MqlSubscriptionApi`, the registry,
   subscribe / unsubscribe / single-shot evaluate. No
   change-detection yet; this proves the wire and the
   resolve-and-project loop.
2. **Coarse dependency derivation** — AST walk that produces a
   conservative event dependency set per query.
3. **EventApi integration + re-resolve loop** — register the
   dependencies, listen, re-resolve, diff, emit delta.
4. **Throttling** — micro-batch coalescing as the default.
5. **Canonical subscription kinds (server)** — pre-canned
   query + field-set pairs registered with a friendly name
   (`inventory`, `things-here`, etc.) so client widgets can
   subscribe by name.
6. **Client subscription infrastructure** — Zustand slice that
   manages live subscriptions, handles subscribe / delta
   application / unsubscribe / cleanup-on-disconnect.
7. **First consumer widgets** — inventory chip strip; slot map;
   atmosphere readout. Each is ~50-150 LoC against the slice.
8. **Inspection pane consumer** — re-bind `$focus` subscription
   as focus shifts; render detail records.
9. **Capability-changed events** — wire up the corresponding
   events as the verb-provisioning slate matures.
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
