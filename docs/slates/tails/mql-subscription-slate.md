# MQL subscription substrate (working doc)

> **Status: PARTIAL** — the server substrate shipped →
> [mql-subscription.md](../../subsystems/mql-subscription.md); the client
> half shipped as the server-pushed card feed, not as widget-owned
> subscriptions → [card-surface.md](../../subsystems/card-surface.md) (the client opens exactly
> one subscription, `chrome: 'self'`)
> **Left:** `mql-subscribe-update` (re-bind + `refresh: true`, the
> `reason: 'initial' | 'refresh'` result) · the frameId heartbeat +
> the `'closed'` envelope · frameId gap detection + the client resync
> policy · the silent ↻ beside *look again* · hover detail on chips ·
> the `ShadowChangedEvent` firing site (shadow-aware projection) · the
> client-side shadow model (normalizer + freshness + topology; the
> mini-map) + the selector seam · `iconKind` (HasIcon + the hint
> chain) · `options.coarse` + `debounce` / `throttle` · composite
> queries · the per-Interactive cap + the initial-result performance
> contract · permission churn mid-session · field-set `extend` ·
> subscription introspection · throttling on the initial result ·
> the `activity.md` state-sync wording
> **Size:** a wave
> **Compacted 2026-09-19.** Everything that shipped — the channel
> split, the wire shapes, field projection, the lifecycle, the
> dependency index + micro-batch, the diff, per-viewer projection —
> is in [mql-subscription.md](../../subsystems/mql-subscription.md); the client half in
> [card-surface.md](../../subsystems/card-surface.md). Ledger:
> `docs/plans/slate-compaction/mql-subscription.md`.

Working slate for the **client-driven live-state substrate** —
how the client knows what's happening in the world without the
server pushing a hardcoded taxonomy of delta types.

The client declares what it cares about as an MQL query plus a
result-shape declaration; the server resolves it, sends the
initial result, watches `EventApi` for changes that could affect
the result, and pushes diffs as deltas. Read-only in v1;
mutation stays on the command-bus channel.

**Supersedes** the prior `state-sync-slate.md` (since retired; this
slate is the historical record of the rejected fixed-delta-taxonomy
model). Why the pivot: fixed-delta models grow a wire-schema
entry per consumer widget, which compounds quadratically as the
client matures. The MQL-subscription model has linear growth —
one mechanism, many uses — because the widget's needs are
expressed in the query, not in the wire.

See also:

- [docs/subsystems/mql.md](../../subsystems/mql.md) — MQL grammar,
  resolution pipeline, per-viewer scoping. The substrate this
  slate reuses end-to-end.
- `packages/server/src/mud/api/event.ts` — `EventApi` global
  pub/sub bus. Change-detection's source of truth.
- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — wire envelope family. Subscription messages extend this
  pattern.
- [docs/slates/client-cockpit-slate.md](../tails/client-cockpit-slate.md)
  — every right-sidebar widget is a subscription consumer.
- [docs/subsystems/card-surface.md](../../subsystems/card-surface.md)
  — focus-card body is a subscription on the focused thing's
  detail.
- [docs/slates/prompt-stack-slate.md](../tails/prompt-stack-slate.md)
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

Shipped → [mql-subscription.md](../../subsystems/mql-subscription.md) (intro) —
`packages/server/src/backend/inbound/index.ts` routes `mql-subscribe` /
`mql-unsubscribe` / `mql-query` beside `command` and `ping`. Of the
designed messages, `mql-subscribe-update` and `heartbeat` did not
ship — see *Wire shape* below.

The MQL channel also accommodates **client-initiated traffic that
isn't a player command** — gap-detected resyncs, hover-tooltip
detail fetches, paranoid post-reconnect refreshes, liveness
probes. These are the client doing housekeeping on its own behalf;
they shouldn't ride the command bus because they're not intents and
shouldn't generate prose / events / echoes. They ride the MQL
channel because they're reads.

---

## Why MQL fits

Shipped → [mql-subscription.md](../../subsystems/mql-subscription.md) (both
additions landed: the field-set is a separate `fields` parameter, not
a grammar clause; `MqlSubscriptionApi` + `MqlSubscriptionRegistry` own
the lifecycle).

---

## Wire shape

All MQL-channel messages ride the same connection; the
dispatcher routes by `type`. Mix of outbound (client → server)
and inbound (server → client) shapes below.

### Outbound (client → server)

⚠ Shipped shapes differ: `MqlQueryMessage` / `MqlSubscribeMessage` /
`MqlUnsubscribeMessage` landed with `cardinality: 'one' | 'many'`
required, `fields?: string[] | 'ref' | 'detail'`, `detailKey?`, the
`focusDependent` / `locationDependent` flags and `chrome?: 'self'`, and
no `options` — [mql-subscription.md § Surface](../../subsystems/mql-subscription.md).
`MqlSubscribeUpdateMessage` and `HeartbeatMessage` did not ship; the
block is kept whole for them.

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

⚠ Shipped shapes differ: the result envelopes carry `result` (no
`cardinality`, no `reason`), the error envelope carries `detail?` (not
`message`), and `'closed'` is in the `reason` union though nothing
emits it yet — [mql-subscription.md § Surface](../../subsystems/mql-subscription.md),
`packages/types/src/index.ts`. The block is kept whole for the
unshipped `reason?` field.

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

Shipped → [mql-subscription.md § Diff algorithm](../../subsystems/mql-subscription.md) —
`Change` is `{ op, key, fields? }` (`add` / `replace` carry the full
record in `fields`; an identity change is `remove` **and** `replace`).
The synthetic key for non-Stuff records is superseded: MQL speaks only
Stuff (§ *The two structural findings*).

### Field sets

Superseded by the code — `fields?: string[] | 'ref' | 'detail'`; no
`'minimal'`, no `{ include }` object
([mql-subscription.md § Field-set aliases](../../subsystems/mql-subscription.md)).

---

## Result records

Superseded by the code — `StuffRefRecord` is `{ stuffId, displayName,
quantity?, primaryKeyword? }` (no `iconKind`, no `capabilities`);
`StuffDetailRecord` adds `shortDescription`, `longDescription`,
`illustration`, `details`, `bulkMaterial`, `mass`, `contents`, `worn`,
`exits` (no `properties` / `slots` / `lighting` / `atmosphere` /
`admin`); there is no `PathRecord` — MQL speaks only Stuff
([mql-subscription.md § Field-set aliases, § Where descriptors live](../../subsystems/mql-subscription.md)).
The missing readings are a per-mixin descriptor to-do (§ *The two
structural findings*); the admin projection is listed unbuilt in
[card-surface.md § What ships unbuilt](../../subsystems/card-surface.md).

---

## Field projection — mixin-declared surface

Shipped → [mql-subscription.md § Descriptor mechanism](../../subsystems/mql-subscription.md)
(*no substrate-private synthetic table; one mechanism, uniformly
declared*).

### The descriptor shape

Superseded by the code — the shipped descriptor is `{ name, read?,
perDetailRead?, dependsOnFields?, changes?, static?, durableKey? }`:
`getter` strings became `read` closures, field wakes ride
`FieldChangedEvent` via `dependsOnFields`, and ledger-keyed figures use
`durableKey` because a `ChangeSource` cannot match a durable key
([mql-subscription.md § Descriptor mechanism, § `durableKey`](../../subsystems/mql-subscription.md)).

### Fact-mixin vs behavior-mixin

Superseded by the code — the placement rule shipped as *a descriptor
lives on the mixin that owns the gate; universal renders on `Stuff`*,
and the *mint a new fact-mixin for homeless state* prescription was
declined for the standing figures (*a `StandingMixin` for five fields
on one class would be per-feature minting*) —
[mql-subscription.md § Where descriptors live, § Ledger-derived fields](../../subsystems/mql-subscription.md).

### Worked example: dynamic scalar (Vitals)

Superseded by the code — the descriptor shape and the event differ
(above), and `lib/vitals/Vitals.ts` declares no `subscribableFields`;
every undeclared reading is one descriptor on the mixin that owns it
([mql-subscription.md § The two structural findings](../../subsystems/mql-subscription.md)).

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

Shipped → `MixinApi.getAllSubscribableFields` +
`MqlSubscriptionApi.projectFields` +
`MqlSubscriptionRegistry.deriveAndInstallDependencies`
([mql-subscription.md § Descriptor mechanism, § Meta-bus dependency index](../../subsystems/mql-subscription.md)).

### The (one) substrate-side synthetic field

Superseded — `capabilities` shipped as the one-shot `affordance-resolve`
channel (`packages/server/src/backend/inbound/affordance.ts`), not a
subscription field ([mql-subscription.md § What doesn't ship at all](../../subsystems/mql-subscription.md),
[card-surface.md § The card's action row](../../subsystems/card-surface.md)).

---

## Subscription lifecycle (server-side)

Shipped → [mql-subscription.md § Surface, § Meta-bus dependency index](../../subsystems/mql-subscription.md),
§ *Disconnect cleanup* — state lives on the `MqlSubscriptionRegistry`
singleton Idea (HMR-safe), not a static map on the Api.

---

## Change detection — dependency tracking

Shipped → [mql-subscription.md § Meta-bus dependency index + scheduler](../../subsystems/mql-subscription.md)
(the 3-level `(KIND, attribute, value)` index, refcounted listeners,
the `setImmediate` dirty-set drain).

### Coarse dependencies (v1)

Superseded by the code — dependencies are not derived from an AST
walk; they are installed from each result Stuff's descriptors, plus
the holder-level `focusDependent` / `locationDependent` flags, and
field-keyed firing is global
([mql-subscription.md § Holder-level dependency flags, § Conservative-coarse dispatch policy](../../subsystems/mql-subscription.md)).

### Dynamic dependency sets

Superseded by the code — the *adaptive* strategy shipped: the
dependency set is torn down and re-derived from the new result set
after every re-resolve
([mql-subscription.md § Meta-bus dependency index + scheduler](../../subsystems/mql-subscription.md)).

### Race conditions and ordering

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

Superseded — `capabilities` is not a subscription field; the action
row and the radial ask `affordance-resolve` on demand and
`clearAffordances` runs on every command send, which is the staleness
answer ([card-surface.md § The card's action row](../../subsystems/card-surface.md),
`packages/client/src/services/websocket.ts`). No
`CapabilityChangedEvent` exists.

### Catch-all events

Some events are catch-all (`Anything-changed-in-this-location`).
For widgets that want a "just re-eval whenever ANYTHING happens
in my scope" mode, the dependency set declares it explicitly
(`options.coarse: true` on subscribe). Server emits more often
but the subscription is simpler. The meta-bus indexes these
under a wildcard key.

### Resolution failures mid-stream

Shipped → [mql-subscription.md § Surface](../../subsystems/mql-subscription.md) (*mid-stream resolve
throws → emit `reason`, auto-cancel*; a vanished holder cancels
silently).

---

## Throttling and batching

Shipped — the `setImmediate` micro-batch
([mql-subscription.md § Meta-bus dependency index + scheduler](../../subsystems/mql-subscription.md));
the two options below did not.

Per-subscription throttle:

- **`options.debounce: ms`** — debounce changes to once per
  `ms`. Useful for high-churn widgets (atmosphere readings,
  weather) where the player doesn't need sub-second precision.
- **`options.throttle: ms`** — fixed rate cap. Different
  semantic; rarely needed.

Defaults work for nearly every case. Authors opt in to longer
windows where appropriate.

---

## Canonical subscription kinds (v1 catalogue)

Superseded — the named-kind registry shipped in Wave 1 and was retired
during MR review; clients send the raw spec
([mql-subscription.md § Build history](../../subsystems/mql-subscription.md)). Its non-Stuff rows
(`here.atmosphere`, `me.{ hp, … }`, `world.time`) cannot resolve —
MQL speaks only Stuff; the prompt-token rows are
[prompt-stack-slate.md](../tails/prompt-stack-slate.md)'s.

---

## Worked example: inventory widget

Superseded — there is no inventory widget; `contents` / `worn` on the
subject card are the shipped shape, fed by `FieldChangedEvent`
(`contents`, `occupants`) from the containment / slot primitives
([mql-subscription.md § Where descriptors live](../../subsystems/mql-subscription.md),
[card-surface.md § `worn` vs `contents`](../../subsystems/card-surface.md)).

---

## Worked example: inspection card

Shipped → [mql-subscription.md § `focusDependent`](../../subsystems/mql-subscription.md) (the holder-level
`FieldChangedEvent { field: 'focus' }` entry; no `FocusChangedEvent`)
and [card-surface.md § Inspection is ONE row](../../subsystems/card-surface.md).

---

## Client cache and lifecycle

Superseded by the code — the client keeps each card's records on the
feed (`useCardFeed.applyChanges`) plus a normalized `stuffRegistry`
slice ([card-surface.md § Client stuff registry, § Reconnect behavior](../../subsystems/card-surface.md)).

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

### Refresh button on the inspection card

The button has two reasonable interpretations:

- **"Look again"** — sends `look` through the command bus.
  Fires prose, runs the focus side-effect chain, generates an
  envelope. Player gesture; visible in the terminal.
- **"Refresh my widget"** — sends
  `mql-subscribe-update { refresh: true }` on the MQL channel.
  Silent resync. No prose, no terminal output.

These are different gestures. The inspection-card slate's
prominent button is **Look again** (the player-visible action);
a smaller ↻ icon next to it is the silent resync. Both real,
neither subsumes the other.

### Widget mount / unmount

Superseded — cards are server-born and *live* is scoped to attention
(the newest of a kind holds the subscription); there is no
widget-owned open / refcounted share
([card-surface.md § One birth path, § One sweep](../../subsystems/card-surface.md)).

### MQL-query results in a card tab

Superseded — `find` renders to the terminal, and *the client supplies
an identity, never a query*, so a *Make live* toggle is out
([card-surface.md § `find` verb, § What ships unbuilt](../../subsystems/card-surface.md)).

### Cascading focus updates

Shipped → [mql-subscription.md § `focusDependent`, § `locationDependent`](../../subsystems/mql-subscription.md).

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

- **Recent rooms breadcrumb** in the inspection card (history
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

Shipped → [mql-subscription.md § `displayName` routes through `Stuff.getPresentation()`](../../subsystems/mql-subscription.md)
(`projectFields` renders through `describeFor(viewer, stuff)`; every
subscription is per-Interactive) and [belief.md](../../subsystems/belief.md).

---

## Shadow interactions

Saxonberg's `Shadow` mechanism (per `lib/stuff/Shadow.ts`) lets a
Stuff's perceived state diverge from its actual state via method
overrides — disguises, hoods, polymorph effects, buffs / debuffs
that override property reads, recognition modulation. The shadow
intercepts dispatch when a viewer reads through the host; the
underlying Stuff's storage doesn't change.

Subscriptions interact with shadows in a way the
`PropertyChangedEvent` / `ContainmentChangedEvent` family doesn't
naturally cover: a shadow attaching changes **perceived** state
without firing any of the existing state-change events. The
substrate needs its own signal.

### `ShadowChangedEvent`

A new event kind fires whenever any shadow attaches to or
detaches from a target, OR mutates in a way that affects what
the shadow returns:

The class shipped, declared but unfired —
`lib/events/ShadowChangedEvent.ts` (`{ target: string, shadow: string,
cause: 'attach' | 'detach' | 'mutate' }`;
[mql-subscription.md § Event-class pattern, § What ships unfired](../../subsystems/mql-subscription.md)).

Emitted by the shadow lifecycle (whatever owns shadow
attach/detach today; probably a small surface in `ShadowApi`
or the existing framework). Each shadow operation fires the
event with the affected host's stuffId.

### Descriptor evolution: multi-source `changes`

Shipped — the multi-source `changes` array, with `ShadowChangedEvent`
on `Stuff.displayName`, Named, Visible, Detailed and Tangible
([mql-subscription.md § What ships unfired](../../subsystems/mql-subscription.md)).

The substrate registers listeners for both. When EITHER event
fires with `target == subscribedStuffId`, the subscription
dirties; re-resolution runs the getter (which routes through
current shadow state), producing viewer-correct projection.

The pattern generalizes: **any field whose getter is
shadow-routed adds `ShadowChangedEvent` to its `changes`
array.** That includes:

- `displayName`, `shortDescription`, `longDescription`
  (NamedMixin / VisibleMixin — disguises affect these)
- Any property whose value is buff-able (if buffs ship as
  shadows that override `getProp` — open question; if so,
  `PropertiedMixin`'s catch-all gets ShadowChangedEvent)
- `iconKind` if polymorph or visual-replacement effects ship
  as shadows
- Sensory properties (perceived noise, perceived light)

Fields that are emphatically NOT shadow-routed (raw storage
fields with no overrideable getters — admin-only views,
template paths, mixin composition) stay single-source.

### Reverse-index challenge

Superseded by the code — the *v1.5 selective per-result* index
shipped: `by: 'target'` entries are installed under each result
Stuff's id and re-derived after every re-resolve
([mql-subscription.md § Meta-bus dependency index + scheduler](../../subsystems/mql-subscription.md)).

### Worked example: disguise on / off

Setup: Bobalu sees Alice in the lobby. His `things-here`
subscription has Alice in its result with
`displayName: 'Alice'`.

```
1. Alice runs `wear hood`.
2. WearController fires; the hood becomes worn.
3. The hood's shadow framework attaches; ShadowChangedEvent fires:
     { target: alice, shadow: hood, cause: 'attached' }

Meta-bus dispatch (conservative-coarse v1):
  Bobalu's `things-here` matched because:
    - displayName descriptor declares ShadowChangedEvent as a
      change source
    - Alice is in the subscription's current scope
  Mark dirty; schedule re-resolve.

Re-resolve pass (next tick):
  - `things-here` re-resolves in Bobalu's viewer scope.
  - Alice's ref re-projects:
      displayName = getDisplayName(alice, bobalu)
                  → routes through the hood shadow
                  → 'a hooded figure'
  - Diff: Alice's record changed displayName.
  - Emit:
      { op: 'update', key: <alice-id>,
        fields: { displayName: 'a hooded figure' } }

Bobalu's client patches the alice ref. Chip strip re-renders.

(Charlie's `things-here`, if his perception pierces disguises —
recognition slate territory — re-resolves to a different
projection: 'Alice' or 'Alice (in a hood)'. Same event, same
dispatch; per-viewer getter routing produces correct projections
per viewer.)

Later: Alice runs `remove hood`.
  ShadowChangedEvent { target: alice, shadow: hood, cause: 'detached' }
  Same dispatch flow, reverse direction.
  Bobalu's delta: displayName flips back to 'Alice'.
```

### Edge cases

- **Shadow chains** (multiple shadows on one host): each shadow
  attach/detach/mutate fires its own `ShadowChangedEvent`. The
  getter chain resolves through all shadows in priority order
  at projection time; the substrate doesn't need to know how
  many shadows are stacked. Multiple attach events in one
  synchronous chain coalesce via the setImmediate micro-batch
  into one re-resolve per affected subscription.

- **Per-viewer shadows** (shadow affects some viewers, not
  others — e.g., recognition modulation by social-graph
  proximity): event fires globally; per-viewer projection
  produces viewer-correct output naturally. The substrate
  could pre-filter dispatch by an `affectedViewers?: Stuff[]`
  field on the event payload, but that's a perf optimization,
  not a correctness requirement. Lean simpler.

- **Shadows on Stuff outside any subscription's result**: meta-
  bus index has no matching entries; dispatch finds zero
  subscriptions; no work done. The non-interesting case is
  free.

- **Shadow detachment from disconnect / destruction**: when a
  player whose shadow lives on Alice disconnects, or their
  disguise item gets destructed, the shadow detaches via the
  normal lifecycle. `ShadowChangedEvent { cause: 'detached' }`
  fires; subscriptions update. No special handling.

- **Shadows on the subscriber themselves**: Bobalu has a
  disguise on himself. His own subscriptions still resolve
  `me` correctly; the disguise affects how OTHER viewers see
  Bobalu, not how Bobalu sees himself. (Or it might, content-
  side; either way the substrate doesn't care — the shadow
  routing produces viewer-correct output.)

- **First-result includes already-shadowed targets**: subscription
  opens against a scene where shadows are already attached. The
  first-resolve projection routes through current shadow state
  naturally; first-result reflects shadows from the start. No
  special initial-state handling.

### What this requires

A small list of additions to make this work:

1. **`ShadowChangedEvent`** in the engine's event vocabulary.
   Fired by whatever owns shadow lifecycle (`ShadowApi` /
   the framework around `lib/stuff/Shadow.ts`).
2. **Descriptor updates** on shadow-affected fields. `NamedMixin`,
   `VisibleMixin`, possibly `PropertiedMixin` (depending on
   buff implementation), possibly `HasIcon` (depending on
   polymorph implementation) all add `ShadowChangedEvent` to
   their `changes` arrays.
3. **(Tier 2) reverse-index on lastResult contents** when
   conservative-coarse becomes a perf bottleneck.

None of this changes the wire shape. None of it changes the
field projection mechanism. The descriptor's multi-source
`changes` array carries the shadow surface; the substrate's
existing meta-bus index dispatches; existing re-resolve loop
runs; existing delta diff produces field-level updates. Shadows
slot into the model cleanly because the descriptors describe
the right thing — "what makes this field's value change" — and
the answer for shadow-routed fields includes the shadow
mechanism alongside the underlying state.

---

## Non-goals (v1)

- **Mutation via subscription channel.** No `mql-mutate`
  message. Commands stay on the command bus. Keeps the
  security model clean.
- **Arbitrary client-authored MQL queries.** Superseded by the code:
  the named-kind registry was retired and `mql-subscribe` accepts a
  raw `query`, gated by MQL's own per-viewer scoping and
  `MqlPermissionError` ([mql-subscription.md § Surface](../../subsystems/mql-subscription.md)).
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
- **Subscriptions surviving disconnect.** Shipped as designed →
  [mql-subscription.md § Disconnect cleanup](../../subsystems/mql-subscription.md),
  [card-surface.md § Reconnect behavior](../../subsystems/card-surface.md).
- **Optimistic mutation reflection.** When the client sends a
  `take sword` command, the inventory subscription's update
  arrives back via the normal subscription delta path — there's
  no client-side prediction layer that updates the inventory
  before the server confirms.

---

## Open questions

1. Resolved: the field-set is a separate `fields` parameter on the
   message, not a grammar clause — [mql-subscription.md § Surface](../../subsystems/mql-subscription.md).
2. **Permission churn mid-session.** A player gets promoted to
   admin role mid-session. Existing subscriptions don't
   automatically include the now-newly-visible fields. Force
   re-subscribe? Auto-extend? Lean force re-subscribe — explicit
   is simpler than implicit. Document the requirement.
3. Superseded: `capabilities` is not a subscription field; the
   radial / action row ask `affordance-resolve` and `clearAffordances`
   runs on every command send ([card-surface.md § The card's action row](../../subsystems/card-surface.md)).
4. Superseded: there are no non-Stuff records — MQL speaks only Stuff
   ([mql-subscription.md § The two structural findings](../../subsystems/mql-subscription.md)).
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

All shipped or superseded: the field-set is a parameter
([mql-subscription.md § Surface](../../subsystems/mql-subscription.md)); the events are
`FieldChangedEvent` (`field: 'focus'` replaces `FocusChangedEvent`) +
`PropertyChangedEvent` (§ *Event-class pattern*); recognition lands at
projection via `describeFor` ([belief.md](../../subsystems/belief.md)); `capabilities` is the
`affordance-resolve` channel ([card-surface.md](../../subsystems/card-surface.md)). No
`CapabilitiesChangedEvent` exists.

---

## Suggested build order

Waves 1–11 shipped — the substrate as
[mql-subscription.md](../../subsystems/mql-subscription.md), the client as the
server-pushed card feed ([card-surface.md](../../subsystems/card-surface.md)), the capabilities
wave as `affordance-resolve`; wave 13 (adaptive dependency sets)
shipped as the per-re-resolve re-derivation. What remains:

12. **Composite queries / joined snapshots** (Tier 2) — when
    a widget needs cross-result consistency.

---

## What this changes upstream

The cockpit, inspection-card and prompt-stack rewrites happened;
`state-sync-slate.md` is gone. One item is still open:

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
