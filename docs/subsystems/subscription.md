# The subscription protocol — one wire for every state push

**Built by:** navigation-server (2026-11). **Owner's rule:** *"if we need a
new push mechanism then do we still need the old one? … why not make one
mechanism that works for everything."*

A **subscription** keeps a copy of some state current on a client. Every
state push the server makes rides it: live MQL queries (the shelf, live
cards), forum boards, your client state, the press ticker, your map, and
where you are. **Events stay events** — a dispatch outcome, a prompt, an
engagement's progress, a reaction flush, a card being born or closed happen
once and have no copy to repair.

## The wire

```ts
// client → server
{ type: 'subscribe';   subscriptionId; source: string; params?: unknown }
{ type: 'unsubscribe'; subscriptionId }
// server → client
{ type: 'subscription-result'; subscriptionId; rev: 0;        snapshot }
{ type: 'subscription-delta';  subscriptionId; rev: number;   changes: SubscriptionChange[] }
{ type: 'subscription-error';  subscriptionId; reason: string; detail? }

interface SubscriptionChange { op: 'add' | 'replace' | 'update' | 'remove'; key: string; fields? }
```

- **`source` is a template path** (`SUBSCRIPTION_SOURCES` in
  `@saxonberg/types` names the engine's own). There is no list of sources
  anywhere: the registry loads one on use.
- **`rev`**: the snapshot is `0`, each delta `rev + 1`, per subscription. A
  socket neither drops nor reorders inside a connection and nothing here
  drops, so a break is a defect. **Repair is always the same act:
  subscribe again** — after a gap, a reconnect, a restart. A second session
  is simply its own subscriptions.
- Per-source shapes are typed in `SubscriptionSources` (params, snapshot,
  change fields), so the client and the harness narrow on what they asked.
- **Read-only.** The protocol never writes what a client asks it to
  (`backend/inbound/README.md`); `client-state-write` stays a request.

## The server

- **`SubscriptionRegistry`** (`platform/idea/`) holds, once, what each
  registry used to hold a copy of: the per-session id table, `rev`, the
  three emits, the disconnect sweep. Delivery is **per session**
  (`interactive.sendEnvelope`), never every session of a body.
- **The session's verbs are on `Interactive`**: `subscribe(id, source,
  params, { silent })`, `cancelSubscription`, `cancelAllSubscriptions`,
  `hasSubscription` (`lint:object-verbs`).
- ⭐⭐ **One Api: `SubscriptionApi`** (`api/subscription.ts`), over one
  logic singleton (`SubscriptionLogic`, `/platform/idea/api/subscription`).
  Its producer verb is `poke(source, holder | null, hint)` — a body, a
  ledger or a session telling a source its answer may have changed, the
  hint in the source's own words: the sections (where you are), a
  `{ durableSubject }` a ledger just wrote, a holder whose session changed
  bodies, a viewer's `{ belief }` about a subject (the MQL source). It also carries the subscribable-field
  substrate any source projects through (`SubscribableFieldDescriptor`,
  `fireFieldChange`, `projectFields`, `projectAspect`), the MQL source's
  one-shot `handleQuery`, and the sandbox reap (`cancelAllForScope`).
  ⚠ There was a second, `MqlSubscriptionApi`, with its own logic
  singleton and two bespoke pokes (`notifyDurableSubject`,
  `refreshForInteractive`); it was folded in at review (MR !595) — a
  source is a source, and it does not get a facade of its own.
- **Finding a source.** A standing instance at the path is asked whether it
  is a source; otherwise the row's CLASS is read (`StuffApi.classForRef` —
  loads the module, instantiates nothing) and refused (`source`) unless it
  composes `SubscriptionSourceMixin`; only then is the singleton stood up.
  A client cannot make the server stand up an arbitrary singleton.
- **`SubscriptionSourceMixin`** (`lib/subscription/`): `openSubscription(sub,
  params)` answers the snapshot (synchronously when it can — a live card's
  open must have its answer in hand) or refuses in a word;
  `closeSubscription(sub)`; `pokeSubscriptions(holder, hint)`;
  `pauseSubscription(sub)` / `resumeSubscription(sub)`. A source
  holds a `Subscription` handle — `push(changes)`, `fail(reason)`, `end()`,
  `state` — and never builds an envelope or keeps an id table.
- ⭐ **Pause and resume** (crowded-rooms D4/D5, ported onto the protocol at
  the merge). `subscription-pause {subscriptionId}` says a subscription is
  NOT ON SCREEN — a card scrolled away, minimized, behind a `full` card, the
  tab hidden; the client says it, the server never infers it. The registry
  drops everything pushed while paused and tells the source
  (`pauseSubscription(sub)`), which may also stop computing (the MQL source
  drops its dependencies and memo). `subscription-resume` asks the source
  for a fresh snapshot (`resumeSubscription(sub)`; the default closes and
  reopens with the params it was opened with) and sends ONE
  `subscription-result` at `rev` 0 — a reset the client replaces its copy
  with — then deltas from `rev` 1. Session verbs: `pauseSubscription`,
  `resumeSubscription`, `isSubscriptionPaused` (a card's rebind keeps a
  pause). Unknown ids are skipped.
- **Silent opens.** A live card (`CardRegistry`) and the two session
  subscriptions open silently: the snapshot rides their own envelope
  (`card-opened`; `connection-established.clientState` / `.releaseWindow`),
  and changes ride `subscription-delta`.

## The sources

| source | params | snapshot | change key | who pokes |
|---|---|---|---|---|
| `MqlSubscriptionRegistry` | the query (`chrome: 'self'` for the shelf) | records | the record | wakes itself (its dependency index) |
| `ForumSubscriptionRegistry` | `{ scope }` | `{ scope, records }` | the entry | wakes itself (the forum ledger) |
| `ClientStateSource` | — | the holder's client state | the key | `pushClientStateUpdate` |
| `PressFeedSource` | — | the live window | the releaseId | the press's mutators (`null` holder) |
| `MapCopySource` | `{ locality? }` | your map, claims tagged | `<locality>\|<claim key>` | `NavigationApi.recordPlace`, by owner key |
| `WhereaboutsSource` | — | `{ sections }` | the section's name | `SaxonbergClient.refreshNavigation(names?)` |

A new kind of state is a new SOURCE — a class composing the mixin, and a
row — never a new message type and never a kernel list edit.

## Where you are and your map (navigation-server)

- **`WhereaboutsSource`** keeps one flush per beat per holder: a poke marks
  sections dirty and arms one `ScheduleApi.schedule(0, …)`; the flush calls
  `Perceiver.navigation(names)` once and sends each subscription only the
  sections that differ from what IT was last sent, each section stamped `v`
  + 1. A failed read is absent and sends nothing. Triggers: arrival (all),
  your own command (`you`, `ways`, `place`), a way you see changing state
  (`Exit.wayChanged` → `ways`), a moving place moving and a voyage's watch
  (`localities`, `zone`, `place`). The horizon is sent on arrival and in a
  snapshot only.
- **`MapCopySource`** is always the map of whoever the session drives (its
  `mapOwnerKey()` — a shade reads its person's); nobody else's can be asked
  for. Every path on the wire is a `TaggedPath` (`{ path, spoiler: 1 }`);
  a Locality's address travels bare.
- The client opens both at session start and replays them (unsubscribe,
  then subscribe) on every connection; the `map` card is a client body over
  the sections (`client/src/store/navSlice.ts`).

## History

- **navigation-server (2026-11)** — the protocol replaced
  `mql-subscribe`/`-result`/`-delta`/`-error` and their five forum twins,
  `client-state-update` (and its boot-time DI seam), the press ticker's
  `publication.press` frames and the navigator card's payload push
  (`refreshNavigator`).
