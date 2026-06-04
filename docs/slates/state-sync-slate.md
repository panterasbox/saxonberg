# State-sync slate (working doc)

Working slate for the **state-sync channel** — the structured stream
of world deltas that flows from the server to each client alongside,
but distinct from, the response envelope. Where the envelope answers
*"what happened on this message?"*, state-sync answers *"how is the
world different now?"*

**Status**: design surface staked out, implementation deferred to a
dedicated working session. The response-envelope build settled on
state-sync *not* riding inside the envelope; this slate captures
why and what the parallel channel looks like.

See also:

- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — the per-message annotation channel. State-sync is its sibling,
  not a subset.
- [docs/subsystems/messaging.md](../subsystems/messaging.md) — MML
  prose channel; orthogonal to state-sync.
- `packages/server/src/mud/api/event.ts` (`EventApi`) — server-side
  pub/sub bus. State-sync wire frames are sourced from event
  subscribers that filter to a client's perception scope.

---

## Principle

State changes in the world flow to interested clients as **structured
deltas** on a dedicated wire channel. The deltas are produced by
mutations going through the existing `EventApi` pub/sub bus, filtered
per-client by perception scope, and forwarded as `state-delta`
websocket frames.

```
state mutation (e.g. ContainmentApi.move)
        │
        ▼
   EventApi.fire(LocationChangedEvent, …)
        │
        ▼  (subscribed witnesses)
   ┌─────────────────────────────────────┐
   │ PerClientStateSyncSubscriber        │
   │   - filters by perception scope     │
   │   - shapes event → state-delta wire │
   └─────────────┬───────────────────────┘
                 ▼
       websocket: { type: 'state-delta', … }
```

The crucial property: **the same event fires for the actor and for
witnesses.** When Bob walks north, a `location-changed` event fires
with `subject = Bob, from = roomA, to = roomB`. Bob's own client
subscriber sees it (and updates his current-room widget); the
occupants of roomB also see it (and update their "who's in here"
widget); the occupants of roomA see it (and update theirs). One
event, one code path, three rendering effects on three different
clients. No special case for "this changed because of *my* command."

---

## What flows through this channel

The categories below are reference, not exhaustive. The actual delta
vocabulary grows with content; the channel is open-ended.

### Containment deltas

Inventory, room contents, container contents — anything that goes
through `ContainmentApi.move()`. Payload identifies subject, source,
destination, optional quantity (for globbable splits).

```
{ kind: 'containment-changed', subject: StuffId, from: StuffId, to: StuffId }
```

### Slot occupancy deltas

Wearing, wielding, sitting, mounted. Anything that flips
`SlotApi.occupy()` / `release()`. Payload identifies the slotted
host, the slot key, the occupant or null.

```
{ kind: 'slot-changed', host: StuffId, slot: SlotKey, occupant: StuffId | null }
```

### Property deltas

`PropertiedMixin` value changes: gold count, HP, hunger, learned
skill levels. Payload identifies the host, property key, new value,
optional old value.

```
{ kind: 'property-changed', host: StuffId, key: string, value: unknown }
```

Property events are the bread-and-butter delta — most numeric world
state lives on properties. Rich clients render bars, badges, and
animations off this kind.

### Lifecycle deltas

Stuff was created, destructed, hot-reloaded. Payload identifies the
Stuff and the lifecycle phase.

```
{ kind: 'stuff-created', stuff: StuffId, template?: string }
{ kind: 'stuff-destructed', stuff: StuffId }
```

### Perception deltas

Recognition state changed (you recognized a stranger, lost
recognition through disguise); a Stuff became newly visible or fell
out of view. Couples to the recognition slate.

```
{ kind: 'perception-changed', subject: StuffId, recognition: 'stranger' | 'acquaintance' | 'known' }
```

### Transaction wrapper

Some user actions produce multiple causally-linked deltas (`buy
potion` = currency-down + inventory-up). Rather than emitting
independent deltas, the channel can wrap a set into a single
transactional frame so the client animates them atomically.

```
{ kind: 'transaction', cause: 'trade' | 'craft' | ..., deltas: Delta[] }
```

Open: should every command's resulting deltas be implicitly wrapped
in a transaction tagged with the dispatch id? Or are transactions
content-authored explicitly? Lean: dispatcher-tagged transactional
grouping for free, content authors override only when they want
atypical grouping. Defer.

---

## Why not the response envelope

The response envelope is per-message and request-scoped. State-sync
is continuous and source-agnostic. Folding state into the envelope
would force two awkward choices:

1. **Witness messages would re-state the world for every witnessed
   event.** If the envelope carried state, an "X arrives" witness
   frame would have to bundle "X's location is now this room" *and*
   every other delta the witness might care about. State-sync as a
   sibling channel decouples the rendering of "what to read" from
   "what changed."
2. **Self-action vs. witness divergence.** Self-actions could carry
   state inline; witnessed actions would also have to carry state
   to keep witnesses' clients in sync. Two code paths producing
   identical structured deltas, just delivered differently. The
   shared-event-bus pattern collapses them to one.

The envelope channel and state-sync channel are siblings: same
websocket transport, different frame types, different schemas,
different lifetimes.

---

## Why not MML

MML is prose. Scraping prose for state is fragile and wastes
information that's already structured at the moment of mutation.
State-sync gives the client the structured form directly; the prose
channel stays free to focus on narration.

---

## Producer side

The server-side pipeline:

1. Game logic calls into an Api method that mutates state
   (`ContainmentApi.move`, `propertyApi.setProp`, `SlotApi.occupy`,
   `StuffApi.create`, …).
2. The Api fires the appropriate event class on `EventApi`.
3. Per-client state-sync subscribers — one per connected interactive
   — receive every fire, filter to their perception scope, shape
   into the wire delta, and enqueue for delivery.
4. The frame is sent over the websocket as
   `{ type: 'state-delta', deltas: [...] }`.

The wire-level batching (one frame per delta vs. many deltas per
frame) is an implementation detail. Sketch: flush at end of
microtask, so a single dispatch's deltas arrive together; transactional
groupings get their own frame regardless of timing.

The subscriber is a thin shim. Most of the work (filtering, scope,
witnessability) is already done by the existing witness pipeline.
State-sync is the witness pipeline aimed at *one* particular client
and reshaped for wire delivery.

---

## Wire shape

```json
{
  "type": "state-delta",
  "frameId": 12345,
  "cause": "dsp_42",
  "deltas": [
    { "kind": "containment-changed", "subject": "stuff_42", "from": "stuff_player", "to": "stuff_room_3" },
    { "kind": "property-changed", "host": "stuff_player", "key": "gold", "value": 90 }
  ]
}
```

- `frameId` — wire-level, monotonic per connection, resets on
  reconnect. The single ordering primitive across all server→client
  traffic (state-sync *and* envelope-shaped frames). Used for gap
  detection and the "state before scene" rendering invariant.
- `cause` — optional semantic id. Matches `dispatchId` on the
  dispatch-response frame that caused these deltas, or `eventId`
  on the witnessed event that caused them. Absent for autonomous
  state changes (scheduled HP regen, NPC AI tick, periodic decay).
  Useful for animation grouping and log correlation.
- `deltas` — array, each is a discriminated-union payload.
- No `scene`, no `outcome` — this frame is data, not prose.

---

## Consumer side

The client subscribes to `state-delta` frames and applies each delta
to its local model. With Zustand (the chosen state lib), each delta
maps to a slice update; React components re-render through normal
subscription.

The client model is **derived state**, not authoritative. The server
is the source of truth; the client's model is a projection
constructed from state-sync frames. On disconnect/reconnect, the
client reconstructs by requesting a snapshot (see below).

---

## Ordering & atomicity

- **Same-frame deltas are atomic.** All deltas in one wire frame
  apply together; the UI renders the post-frame state, not
  intermediate states.
- **Across frames, order is monotonic per connection.** `frameId`
  monotonically increases. If the client detects a gap (received
  frame N+2 without N+1), it requests resync.
- **Envelope and state-sync arrive on the same connection** but in
  separate frames. Convention: state-sync deltas for a dispatch
  arrive *before* that dispatch's envelope frame. Client applies
  state first, then renders the envelope's scene — so prose like
  "You drop 10 coins" never renders before the inventory widget has
  updated.

This is enforceable server-side: the dispatcher emits state events
synchronously during command execution (subscribers enqueue
state-delta frames), then the controller's response is assembled
and sent. Wire order matches emission order.

---

## Bootstrap / reconnect / catch-up

The client needs to construct its initial model on login and
recover after a disconnect. Two surfaces:

- **Snapshot** — on demand, the server can produce a full structured
  snapshot of the client's perception scope: current room, contents,
  inventory, slot occupancy, properties, recognition map. Delivered
  as a `state-snapshot` frame.
- **Replay window** — for short disconnects (sub-N-second), the
  server retains the last K frames per connection and replays them
  on reconnect. Beyond the window, the client requests a snapshot.

Both are deferred design — capture here as known follow-on work,
not blocking v1.

---

## Perception scoping

A client only receives deltas for things it can perceive. The
existing witness machinery already enforces this server-side:
`Sensor`-shaped subscribers register interest in events scoped to
their perception (current room, attended Stuff, etc.).

State-sync subscribers reuse this. Adding a new delta kind doesn't
require new scoping infrastructure — the event it's sourced from
already routes through the right witness filter.

Special case: deltas about *the player themselves* (their own
inventory, HP, location). The player always perceives themselves;
the subscriber treats `subject === self` as in-scope unconditionally.

---

## Relationship to the response envelope

Worked example (`drop 99 coins` against an inventory of 10):

**Wire sequence on the player's connection** (server→client, in
order):

1.  ```json
    {
      "type": "state-delta",
      "frameId": 1001,
      "cause": "dsp_42",
      "deltas": [
        { "kind": "containment-changed", "subject": "stuff_coins", "from": "stuff_player", "to": "stuff_room" },
        { "kind": "property-changed", "host": "stuff_coins", "key": "quantity", "value": -10 }
      ]
    }
    ```
2.  ```json
    {
      "type": "dispatch-response",
      "frameId": 1002,
      "dispatchId": "dsp_42",
      "scene": "<mml: You drop 10 coins.>",
      "outcome": {
        "status": "partial",
        "notes": [{ "kind": "quantity-clamped", "field": "targets", "requested": 99, "applied": 10 }]
      }
    }
    ```

The client applies (1) — inventory widget shrinks by 10, room
widget gains a coin pile — then renders (2)'s prose into the scene
view. Other clients in the room receive a `witness` envelope and
their own `state-delta` for the coin pile appearing.

---

## Open questions / design surface (deferred)

This slate stakes out the channel. Each of the following needs
real work in the dedicated session:

- **Delta vocabulary v1**: which delta kinds ship first? Lean:
  containment + property + slot occupancy + lifecycle. Recognition
  and perception deltas can land with the recognition family.
- **Transaction grouping**: implicit per-dispatch wrap, explicit
  author-tagged, or both?
- **Snapshot shape**: full re-projection vs. structured tree
  matching client model shape. Probably the latter, but not
  designed yet.
- **Replay window size**: K frames or T seconds? What's the memory
  cost per connection?
- **Privacy / authority on properties**: not all properties are
  client-visible (internal counters, security gates). Each
  property kind needs a "is this visible to this perceiver" check.
  The `Property<T>` substrate may need a visibility tag.
- **Compaction**: a single dispatch might fire dozens of property
  events on a single Stuff (combat tick: HP, stamina, posture,
  position, …). Coalesce to one final-state delta, or keep the
  trail? Lean: coalesce same-key deltas within a frame; document.
- **Frame budget**: an upper bound on deltas per frame (and a
  truncation/spill mechanism) before the wire becomes a chokepoint.
  Same shape as the envelope's note-cap concern.
- **Wire format**: JSON is the default. Worth measuring if a more
  compact format (CBOR, MsgPack) is needed before client lands.
- **Client model architecture**: which Zustand stores, how delta
  application is structured (per-kind reducers? a single
  apply-delta switch?). This is downstream of the React client
  taking shape.
- **LLM/agent clients**: deltas are machine-readable; an LLM agent
  could consume the stream directly. Probably no special schema —
  the same JSON works.

---

## v1 scope vs. follow-on

Suggested v1 (the dedicated session's deliverable):

1. Channel infrastructure: per-connection state-sync subscriber,
   `state-delta` frame, frameId ordering.
2. First three delta kinds: `containment-changed`,
   `property-changed`, `slot-changed`.
3. Wire-format spec + integration test that walks a dispatch and
   asserts the wire frames arrive in the correct order alongside
   the envelope.
4. Lifecycle deltas (`stuff-created`, `stuff-destructed`).

Follow-on:

- Recognition / perception deltas (with the recognition slate).
- Transaction grouping (when a content author demands atomic
  rendering).
- Snapshot + replay (when reconnect resilience matters).
- Frame compaction / coalescing (when measured pressure exists).
- Property visibility filtering (when first private property
  surfaces).

---

## Cross-references

- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — sibling channel for per-message annotations.
- [docs/subsystems/messaging.md](../subsystems/messaging.md) — MML
  prose channel; the third channel on the wire.
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  — dispatch pipeline; where state events fire as part of execution.
- [docs/subsystems/properties.md](../subsystems/properties.md) —
  `PropertiedMixin` is the source of most `property-changed`
  deltas.
- [docs/slates/recognition-slate.md](./recognition-slate.md) —
  consumer of `perception-changed` deltas.
- [docs/subsystems/activity.md](../subsystems/activity.md) —
  activities fire state-sync deltas on completion (location change,
  item produced) the same as immediate verbs do.
