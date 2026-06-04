# Client foundation readiness — server-side build manifest

A planning document, not a slate. Lists the **server-side work
that must land before client cockpit builds switch into high
gear**, with sequencing, dependencies, and acceptance criteria
for each chunk. Each item below decomposes into its own
requirements doc (via the workflow's `/requirements` skill) when
queued for a build cycle.

This isn't part of the slate → requirements → plan workflow as a
single artifact; it's a roadmap-shaped doc that names the chunks
the planner will work from. It exists to keep the build phase
honest about what's a server prerequisite vs. what's tandem-with-
client vs. what's client-pull-when-server-stable.

See also:

- [docs/workflow.md](../workflow.md) — the broader phase taxonomy
  this doc supplements.
- [docs/slates/mql-subscription-slate.md](../slates/mql-subscription-slate.md)
- [docs/slates/prompt-stack-slate.md](../slates/prompt-stack-slate.md)
- [docs/slates/inspection-pane-slate.md](../slates/inspection-pane-slate.md)
- [docs/slates/console-filtering-slate.md](../slates/console-filtering-slate.md)
- [docs/slates/client-cockpit-slate.md](../slates/client-cockpit-slate.md)

---

## The three categories

Per the planning conversation, server work splits three ways:

- **Server-first (build alone, no client guesses)** — pure
  mechanism. Wire shape is known; correctness proves out via
  integration tests against synthetic clients.
- **Tandem (build with a client slice alongside)** — API
  surface that needs a real consumer to validate. Build the
  smallest possible server-side + matching client widget
  together as a vertical slice.
- **Client-pull (server stable, client iterates)** — design
  dominates on the client. Server already has what it needs.

This document covers the **server-first** category in detail
(that's the upcoming build phase), names the **tandem** slices
that follow (where client work begins), and treats the
**client-pull** stage as the destination.

---

## Phase 2 — server-first plumbing build

Five chunks. Each chunk is one or more requirements docs + plans
ultimately. Sequenced by dependency.

### Chunk 2.1 — MQL subscription substrate (innards)

**What it builds.** The `MqlSubscriptionApi` class:

- Per-Interactive subscription registry
  (`Map<Interactive, Map<subId, SubscriptionState>>`)
- Parse the inbound MQL query string into a cached AST
- Resolve the AST in the viewer's perception scope (existing MQL
  pipeline)
- Project the result via the field-set declaration into wire
  records (new field-projection mechanism — see below)
- Derive the dependency set from the AST + descriptors
- Register dependencies in the meta-bus index
- Initial result envelope
- On event fires that match dependencies: mark dirty, schedule
  setImmediate re-resolve
- Re-resolve pass: per-subscription, diff vs lastResult, emit
  delta envelope
- Unsubscribe + disconnect cleanup
- Error envelopes (parse, resolve, permission)

**Acceptance criteria.**

- Unit tests prove parse + resolve + projection cycle for at
  least one canonical kind (`me.<scalar>` is the simplest).
- Integration test exercises the full lifecycle: synthetic
  client subscribes, server resolves and ships initial result,
  state mutates server-side, event fires, subscription
  re-resolves, delta lands on synthetic client, unsubscribe
  cleans up.
- Disconnect path cancels all subscriptions for the interactive
  without leak.
- Throttling (setImmediate batch) coalesces multiple events
  within one tick into one re-resolve per subscription. Tested.

**Dependencies.**

- Existing MQL grammar + resolver pipeline (no changes for v1
  outside what's noted in Chunk 2.5)
- Existing EventApi pub/sub mechanism
- Existing Interactive / connection-layer plumbing (extended
  in Chunk 2.4)
- Field-projection mechanism (Chunk 2.2)

**Out of scope (defer):**

- `mql-query` one-shot variant — Chunk 2.6
- `mql-subscribe-update` with `refresh: true` resync — Chunk 2.6
- Heartbeat — Chunk 2.6
- Adaptive dependency tracking — Tier 2
- Composite queries / joined results — Tier 2
- Selective per-result reverse index — Tier 2

### Chunk 2.2 — Field projection mechanism

**What it builds.** The `static subscribableFields` convention
and the substrate-side machinery that consumes it:

- The `SubscribableFieldDescriptor` type with both dynamic
  (`changes: ChangeSource[]`) and static (`static: true`)
  variants
- `collectSubscribableFields(stuff)` — walks the mixin
  composition chain, returns merged descriptor map (same
  pattern as `persistentFields` collection)
- `projectFields(stuff, fieldNames, viewer)` — per-viewer-scoped
  projection via descriptor getters
- `deriveDependencies(stuff, fieldNames)` — translates
  descriptors into meta-bus filter entries
- Field-set aliases (`'ref'` → standard ref fields, `'detail'`
  → standard detail fields)

**Acceptance criteria.**

- A `Vitals` mixin with `subscribableFields` declares hp / mv /
  maxhp / maxmv; projection returns the values; dependencies
  fire correctly on `PropertyChangedEvent`.
- The `'ref'` alias resolves to a documented set of fields
  (displayName, iconKind, capabilities, quantity).
- The `'detail'` alias resolves to a documented set including
  the ref fields plus descriptions, properties, slots, contents
  where applicable.
- A static descriptor (`iconKind` on `HasIcon`) projects on
  initial result, never emits a delta, never registers a
  listener.
- A multi-source descriptor (`displayName` on `NamedMixin` with
  both `NameChangedEvent` and `ShadowChangedEvent`) registers
  both listeners; both fires correctly trigger re-resolution.

**Dependencies.**

- Chunk 2.1 (substrate consumes the projection mechanism)
- `MixinApi` composition-walk (existing)
- A small set of mixin updates: `NamedMixin` adds the
  subscribable `displayName` descriptor; `VisibleMixin` adds
  description descriptors. `HasIcon` is a new fact-mixin
  introduced here. `Vitals` is introduced here. Other mixins
  add descriptors as their state surfaces stabilize.

**Out of scope (defer):**

- Tier 2 / Tier 3 canonical field bundles (`numeric`, etc.)
- `iconHint` chain on behavior-mixins — explicit
  `setIconKind` is sufficient for v1
- The `capabilities` synthetic-field projector — covered in
  Chunk 2.3 (it's substrate-side, not mixin-declared)

### Chunk 2.3 — Capability projection (coarse)

**What it builds.** The substrate-side `capabilities` projector
for `ref` records (coarse category bits). NOT the full per-target
verb list (`detail` records' richer capabilities — deferred).

- `computeCoarseCapabilities(actor, target)` — returns category
  bits like `actionable`, `talkable`, `wearable`, `examinable`
  based on `target`'s mixin presence
- The substrate's `'ref'` projection includes the result
- No dependency on actor state for coarse bits (target mixins
  are stable in-session); no listener registration for
  capabilities on refs
- Stubbed `'detail'` projection adds a `capabilities: never[]`
  placeholder so the wire shape is honest; full list lands in
  Tier 2 alongside verb-provisioning

**Acceptance criteria.**

- Static composition of common Stuff types produces correct
  coarse bits (an item → `actionable, examinable, wearable`
  if Wearable; an NPC → `talkable, examinable`; a door →
  `actionable, examinable`; etc.).
- The bits are stable across an actor's session (no spurious
  re-resolution for capability changes).
- Detail records carry the placeholder field without errors.

**Dependencies.**

- Chunk 2.2 (the projector lives in the substrate's projection
  machinery; `'ref'` field-set definition consumes it)
- `MixinApi.hasMixin` (existing)

**Out of scope (defer):**

- Full per-target verb list on `detail` records — needs
  verb-provisioning slate integration
- `CapabilityChangedEvent` — depends on actor-state-change
  detection
- Per-actor caching / memoization — premature

### Chunk 2.4 — Two-channel inbound dispatcher

**What it builds.** Routing for the new `type` discriminators on
inbound websocket messages.

- `Interactive.handleInbound` (or equivalent) discriminates by
  `type`
- Routes:
  - `command` → existing command-bus dispatcher (unchanged)
  - `mql-subscribe` / `mql-unsubscribe` / `mql-subscribe-update`
    → `MqlSubscriptionApi`
  - `mql-query` → `MqlSubscriptionApi.handleQuery` (one-shot)
    (deferred to Chunk 2.6 unless co-shipped)
  - `prompt-response` / `prompt-cancel` → `PromptApi` (after
    Chunk 2.5 lands)
  - `heartbeat` → handler (Chunk 2.6)
- Unknown `type` → soft-error envelope, no crash

**Acceptance criteria.**

- Existing `command` flow unchanged (no regression on shipped
  verbs).
- A subscribe message routes to `MqlSubscriptionApi`; a
  malformed subscribe message produces a parse-error envelope.
- A `command`-shaped message after the new routing lands
  doesn't accidentally trigger any other dispatcher.

**Dependencies.**

- Chunk 2.1 (substrate handlers exist to route to)
- Chunk 2.5 (PromptApi handlers exist) — can ship without if
  PromptApi handlers come later, with a TODO

**Out of scope (defer):**

- The `mql-query` / `heartbeat` routing if those land in 2.6.
  The dispatcher's `switch` just adds cases incrementally.

### Chunk 2.5 — `PromptApi` substrate

**What it builds.** The prompt mechanism as designed in
prompt-stack-slate, scoped to the **substrate plumbing**, not the
full kind canon.

- `MqlSubscriptionApi`-style resolver-map: pending awaiters
  keyed by `promptId`
- Per-Interactive stack of `PromptEntry` records
- Tier 1 method signatures: `choice`, `confirm`, `text`,
  `mqlObject` (the four canonical kinds)
- Each method:
  1. Generate promptId
  2. Store resolver record
  3. Append to interactive's stack
  4. Send PromptEnvelope + inline-in-terminal MessageFrame
  5. Return Promise that resolves on response
- Response handling: validate, resolve promise, send dismissed
  envelope
- Cancellation: `cancel(promptId)`, `cancelAll(interactive,
  reason)`, AbortError on awaiting promise
- The `validate` option + the `prompt-validation-failed`
  envelope path
- Priority levels (`demanding`, `passive`); `toast` reserved

**Acceptance criteria.**

- Server-side test: caller `await`s
  `PromptApi.choice(iact, "Which sword?", choices)`; synthetic
  client responds; await resolves with the chosen response.
- Validation: a validate function returning a string keeps the
  prompt alive and emits validation-failed; subsequent valid
  response resolves.
- Cancellation: explicit `prompt-cancel` from synthetic client
  rejects the awaiting promise with AbortError; subscription
  state cleaned.
- Disconnect: `cancelAll` rejects all pending; no state leak.
- Demanding-priority push emits PromptEnvelope; passive-priority
  push emits PromptEnvelope marked accordingly (server doesn't
  enforce client UX, just carries the flag).

**Dependencies.**

- Existing PromptEnvelope type in `@saxonberg/types`
- Need to add prompt-content Note kinds (`prompt-choice`,
  `prompt-confirm`, `prompt-text`, `prompt-mql-object`,
  `prompt-validation-failed`, `prompt-dismissed`) — small
  addition to the types package
- Chunk 2.4 (inbound dispatcher routes prompt-response /
  prompt-cancel here)

**Out of scope (defer):**

- Tier 2 prompt kinds (`numeric`, `multiChoice`, `password`,
  `mqlMany`) — additive; ship per content need
- Tier 3 kinds (`paginated`, `quiz`) — needs slate work first
- Composite prompt sequences — caller-level pattern, not
  substrate
- Preempting priority — defer

### Chunk 2.6 — Supporting infrastructure

**What it builds.** Smaller mechanical bits that complete the
v1 substrate.

- **One-shot query**: `mql-query` / `mql-query-result` /
  `mql-query-error` message types in the wire; handler reuses
  `MqlSubscriptionApi`'s parse + resolve + project without
  registering listeners or storing state
- **Resync mechanism**: `mql-subscribe-update` with
  `refresh: true` re-resolves the existing subscription's
  binding and emits a fresh `subscription-result` with
  `reason: 'refresh'`
- **Heartbeat**: bidirectional message type, server cadence
  (~30s) carrying current frameId, client cadence on visibility
  events
- **`ShadowChangedEvent`** firing from the shadow framework
  (`lib/stuff/Shadow.ts`): attach / detach / mutate lifecycle
  emits the event with target + shadow + cause
- **MQL global seeds** (`online`, `world`): scope-anchors that
  bypass perception scope. Used by future who-list / world-state
  queries; small parser/resolver extension

**Acceptance criteria.**

- One-shot query: synthetic client sends `mql-query`; server
  responds with `mql-query-result` carrying the projected
  records; no entry in the subscription registry afterwards.
- Resync: client sends `subscribe-update` with `refresh: true`
  on an existing subscription; server emits a fresh
  `subscription-result` with `reason: 'refresh'` distinct from
  the initial.
- Heartbeat: server emits at the configured cadence; client
  consumes; frameId reconciliation can detect gaps in
  integration test.
- ShadowChangedEvent: attaching a shadow fires the event;
  detaching fires it again; a synthetic mutation (e.g., updating
  the shadow's filter) fires `cause: 'mutated'`.
- MQL global seeds: a query `'all things in online'` (or
  whatever the surface shapes settle as) resolves a list of
  online-player Stuff in a test scenario.

**Dependencies.**

- All earlier Phase 2 chunks (each piece extends a different
  surface)
- Existing shadow framework — verify what `lib/stuff/Shadow.ts`
  exposes today and add the lifecycle event-firing where it
  doesn't exist

**Out of scope (defer):**

- Adaptive dependency tracking
- Composite queries
- Per-result reverse index for shadows
- Most "Tier 2" notes in the slates

---

## Phase 3 — first tandem slice (vitals end-to-end)

**Server side.** A `Vitals` mixin with descriptors; the
`me.vitals` canonical subscription kind registered. Some test
content (an avatar or NPC with vitals set) for verification.

**Client side.** A vitals widget component (chip strip or HUD
element showing HP / MV bars); the Zustand subscription slice
that the widget reads from via a selector; the wire client that
opens the subscription on mount and unsubscribes on unmount.

**Acceptance criteria.**

- Player logs in; vitals widget appears with current values.
- Admin runs `eval avatar.setHp(20)` in another session; vitals
  widget on the original session updates within ~50ms.
- Player logs out; subscription cleaned up server-side.
- Player reconnects; widget re-subscribes; initial result lands.

**Why this slice first.** It's the simplest possible vertical
that exercises the full stack: simple scalar field on a mixin,
property change as the dependency, basic widget UI. If the
substrate has design issues, this slice reveals them with
minimum throwaway code to fix.

**Don't ramp up parallelism until this slice is solid.** Discoveries
here probably change Chunk 2.2's field-set defaults, Chunk 2.1's
subscription state shape, or the client subscription slice's
interface. Better to absorb them with one widget than ten.

---

## Phase 4 — parallel tandem slices

After the vitals slice settles, parallel slices for the rest of
the v1 cockpit:

- **Things-here + chip strip** — collection-shaped subscription,
  per-viewer refs, click model integration
- **Inventory + chip strip** — sibling to things-here; tests
  cross-subscription behavior on pickup
- **Inspection pane + `$focus` subscription** — single-cardinality
  detail; tests the most complex projection path; depends on
  Vitals + descriptors maturing
- **`PromptApi.choice` + client choice rendering** — first
  prompt-stack vertical; depends on Chunk 2.5
- **`PromptApi.mqlObject` + MQL disambiguation integration** —
  the load-bearing first real-content prompt use case

Each is a vertical slice; can be split across builders or build
sessions. Land them in priority order (vitals → things-here →
inventory → inspection pane → prompts) so demo-readiness ramps
up monotonically.

---

## Phase 5 — client-pull buildout

When server foundations + tandem slices are validated:

- Cockpit shell layout / mode-switching UX
- Console filtering drawer + topic toggles + search
- Prompt-mode visual disambiguation polish
- Inspection pane breadcrumbs / refresh button / admin extras
- Shadow-model client store (if/when distance-aware surfaces
  need it)
- Theming, accessibility, mobile responsiveness

These mostly don't need server changes; iteration speed wins.

---

## Phase 6 — deferred laters, opportunistic

The "later" list from the design conversation:

- Tier 2 prompt kinds as content demands
- Adaptive dependency tracking when shadow churn or
  here-anchored subscriptions bite
- Server-rendered token-format base prompt
- Mini-map / 3D map (own slate when prioritized)
- Snoop / observer mode (admin tooling)
- Chat / channels (own slate)
- Composite queries
- Selective per-result reverse index

None of these are blocking for the cockpit's investor-demo
shape. Ship as content + tooling demand.

---

## Items NOT in Phase 2 that the slates flag

Worth calling out so they don't get forgotten:

- **`CapabilityChangedEvent`** — needed for the full
  capabilities field on `detail` records. Deferred; capabilities
  on `ref` (coarse bits) ship without it. Re-evaluate when
  verb-provisioning slate matures.
- **Adaptive dependency sets** — for `all sleeping things in
  here` and similar queries whose dependency set changes with
  results. v1 ships conservative-coarse.
- **Reverse-index on lastResult contents for shadow dispatch**
  — same; conservative-coarse for v1.
- **`mql-subscribe-update` query-rebinding** — the message type
  exists in the slate but v1 might only ship the
  `refresh: true` variant. Repointing a live subscription's
  query is a separable feature.

---

## How to use this doc

When ready to start a Phase 2 chunk:

1. Pick the chunk (start with Chunk 2.1; the rest can be
   sequenced or parallelized based on team capacity).
2. Generate a requirements doc for it via the `/requirements`
   skill, using this manifest's acceptance criteria as the
   load-bearing input.
3. Generate the implementation plan from the requirements doc.
4. Build.

After the Phase 2 chunks land, pick the first Phase 3 slice and
run the same loop, but expect the slate / requirements / plan
loop to iterate once when the tandem slice reveals surface
issues. That's the design — discovery is the point.

This doc gets revised when:

- A Phase 2 chunk's acceptance criteria miss something during
  build
- A Phase 3 slice surfaces a substrate change that wasn't
  anticipated
- New laters get added or load-bearing laters get pulled forward

It's a living manifest, not a frozen plan.
