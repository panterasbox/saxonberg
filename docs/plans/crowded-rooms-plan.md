# Crowded rooms — implementation plan

Executes [crowded-rooms-requirements](../requirements/crowded-rooms-requirements.md)
(as amended 2026-11-17: *the room's own reading never writes; nothing
depends on who looked*): thirty people in one place answer like an empty
room, a card nobody can see costs nothing, an empty world idles under 15%
of a core, and what the room reads for everyone never changes the world.
**Kind:** refactor/sweep (performance). **Lead end:** kernel. No pack gains
a class, a row or a verb; one pack class loses an override (requirements
problem 1). Seeding slate and its reuse ledger:
[crowded-rooms-slate](../slates/tech-debt/crowded-rooms-slate.md).

The build is organized by **cost class, not symptom**: W0 measures and names
the classes, and every fix wave removes one class behind a census.

> **Revised 2026-11-17 after an independent review** (rulings R1–R5 and the
> two sequencing corrections). What changed: the mould no longer settles on
> `look` — it banks at its own changes and completes on the game clock (D8);
> walk purity is behavioral and enforced by a tripwire, not a method-name
> lint (D9); membership dependencies come from the MQL resolve itself and
> the index is the shipped `target` index with a field filter (D1); belief
> invalidation is designed (D2); W4/W5 are re-planned at a checkpoint after
> W0 (D10); pause/resume is the last wave, on navigation-server's D1
> protocol with one fallback (D5).

## ✅ Owner rulings at plan sign-off (2026-11-17)

The owner accepted every recommendation ("go with your leans on all of it"):

1. **A walk reads as banked.** The smell or a card's description of a thing
   nobody has deliberately read shows its last reconcile; Thermal reads its
   curve forward. No conversion of the 89 augmenters to pure projections.
2. **The tripwire throws only in test worlds;** in production it records a
   diagnostic, counts on `/stats` and lets the write proceed.
3. **A setting mould wakes once per game hour** (a constant, not a dial).
4. **Quiet-box runs:** the build agent takes the suite lock and asks
   sibling sessions to stop their worlds, and never kills one. If the box
   cannot be had, the MR opens with the timing gate named as outstanding.
5. **The `trade-chandlery` Hopper override is deleted in the pack** (W1),
   per "any other case on those walks is fixed the same way". Requirements
   problems 2 and 3 below stand as the plan resolves them.

## ⚠ Requirements problems

The amendment settled the two that mattered (the reach of *reading never
writes*, and the mould depending on who looked). Three remain; none reopens
scope.

1. **"No pack changes" vs the census.** `trade-chandlery`'s `Hopper`
   overrides `getContents()` to reconcile its heaps — the mould's defect in
   a pack. The requirements say both *"no pack changes"* and *"any other
   case on those walks is fixed the same way"*. The plan follows the
   second: the override is deleted in the pack (W1). The heap's own fix is
   in the kernel's `PercolatingMixin`.
2. **Login "while thirty are in the square" vs the drive.** Drive steps 2
   and 10 log players in at the avenue block, so the login they time is
   into a crowd of up to twenty-nine *at the block*. The plan keeps those
   steps and adds five logins directly into the full square, timed in the
   same p95.
3. **The `/healthz` freeze gate measures the harness too.** The round trip
   is timed in the vitest process that also holds thirty sockets. The plan
   gates on `/healthz` as required, samples from a worker thread, and
   records the server's own loop-delay beside it as diagnosis — never as
   the argument for a pass (D12).

## Grounding

Verified by opening the files on `reqs/crowded-rooms` at `5a764d06c` plus
the uncommitted requirements amendment. Line numbers are approximate.

### The subscription index and its drain

- `packages/server/src/mud/platform/idea/MqlSubscriptionRegistry.ts`.
  `index: Map<KIND, Map<by, Map<value, Set<SubscriptionState>>>>` (~l.270).
  `deriveAndInstallDependencies` (~l.659) installs, per result Stuff and
  requested descriptor, `(stuff.fieldChanged, 'field', <dep name>)` — the
  field NAME only. The holder flags install `('field','focus')` and
  `('field','container')`, also name-only. The index **already has a
  per-Stuff shape**: `ChangeSource` entries with `by: 'target'` install
  `(KIND, 'target', stuff.stuffId)` (~l.707), and `routeFire` (~l.798)
  matches any `by` against `payload[by]`.
- `FieldChangedPayload` is `{ target: StuffId, field, oldValue, newValue }`
  (`lib/events/FieldChangedEvent.ts`); every fire already names its target.
- `markDirty(sub)` carries no reason. `drainDirty` (~l.828) runs one
  subscription per iteration, `DRAIN_SLICE_MS = 20`, rest × 2; it cannot
  cut inside `reresolveAndEmit` (~l.891), which re-projects every row and
  tears down and re-derives every dependency.
- Projection: `projectStuffInto` → each descriptor's sync `read`.
  `Container`'s `contents` (`lib/spatial/Container.ts` ~l.944) runs
  `MqlApi.resolveMany('#<id>:i:visible:carried:[…] - me')`,
  `PerceptionApi.perceived`, `getLooseContents`, then one nested
  `MqlSubscriptionApi.projectFields(child, REF_FIELDS, viewer)` per child.
  `Placing`'s `placed` (`lib/spatial/Placing.ts` ~l.294) nests the same
  call. `displayName` is projected through `describeFor(viewer, stuff)`.
- Descriptors (`static subscribableFields`) live in 24 files. Fire sites:
  22 `fireFieldChange(` and 8 `new FieldChangedEvent(` outside tests.
  ⚠ **The placement fires are in
  `platform/idea/api/ContainmentLogic.ts`** (~l.164–166, ~l.384–388,
  ~l.419–421, ~l.572–576, ~l.623–624), each an inline
  `_setPlacement` + `fireFieldChange(item, 'placement', …)` +
  `if (isThermal(item)) item.restamp()`. Nothing fires on the placing host.
- MQL results already carry facts about the resolve: `ordinal`,
  `defaulted`, `RegistryScan` (`api/mql/types.ts` ~l.236–322). Containment
  is read at 11 sites in `api/mql/resolver.ts` and `predicates.ts`.
  Shell variables (`$focus`) are expanded **before** MQL
  (`resolveByQuery`, ~l.229).
- `lib/belief/BeliefStore.ts`: `learnIdentityOf` (~l.761), `adjustRegard`,
  `setRegard`, `clearRegard` write what `describeFor` reads; none fires
  anything the index hears.
- `durableKey` pokes (`notifyDurableSubject`) are exact, and are the
  shipped shape for *one producer poking one consumer* with string keys.

### Cards

- `platform/idea/CardRegistry.ts`: live = `def.live && mql && (placed ||
  role || pinned)` (`wantsLive`, ~l.1218). `subscribe` (~l.1228) opens the
  subscription server-side, `silent: true`, `subscriptionId ===
  instanceId`; a `needsSubject` card is subject-bound and re-gated by
  `PerceptionApi.perceives` on every re-resolve. `rebind` (~l.1304)
  cancels and re-subscribes the `here` card under the same `instanceId`.
- Live kinds (`lib/connection/Cards.ts`): `subject` (the `here` room card
  every session holds; `fields: 'detail'`) and `stock`
  (`reachable:[mixin.BulkableMixin]`). The shelf's `chrome: 'self'` is
  `me`, woken by `durableKey`.
- The server has no fact for *on screen*. The client does:
  `CardArea.tsx` (~l.145) drops `minimized`, `medium` and `full` cards from
  the gallery; `lib/stream/onAir.ts` listens for `visibilitychange`; there
  is no `IntersectionObserver` in the client. Card deltas arrive in
  `components/cards/useCardFeed.ts` (~l.200–215) keyed by `instanceId`.

### Navigation-server's D1, as settled (build-2; W1 not merged)

Wire: `subscribe {subscriptionId, source, params?}`, `unsubscribe`,
`subscription-result {subscriptionId, rev: 0, snapshot}`,
`subscription-delta {subscriptionId, rev, changes}`, `subscription-error`.
`SubscriptionRegistry` owns the id table, `rev` and the emits; sources
compose `SubscriptionSourceMixin` (`openSubscription` / `closeSubscription`
/ `pokeSubscriptions`) and get a handle (`push` / `fail` / `end`). Session
verbs on `Interactive`: `subscribe(id, source, params, {silent})`,
`cancelSubscription`, `cancelAllSubscriptions`, `hasSubscription`. A card's
subscription id is its `instanceId` — the client already names it;
`CardRegistry` opens it `{silent: true}`, the snapshot rides `card-opened`,
deltas ride `subscription-delta` from `rev` 1. A break in `rev` is a
defect; repair is a new snapshot. `closeSubscription` touches only the
source's index, never `CardRegistry`'s card set. Build-2 declined to carry
pause/resume; this build does. Its W1 says dependency indexing, the
scheduler and diffing are untouched — it moves the three emits
(`MqlSubscriptionRegistry` ~l.429, ~l.957, ~l.1078) and the id table.

Other siblings: **geography** edits `PerceptionLogic.ts` ~l.494–520 and
~l.1517–1700 (this build no longer edits `observeThing` at all).
**zone-instancing** shares only append-only `packages/wire/src/harness/
world.ts`. **soak-repair** touches `runner/boot.ts`, where W0 adds a few
lines.

### The mould, the heap, and what the room's walks reach

- `lib/mould/Mould.ts`: `getContents()` (~l.598) calls
  `reconcileSetting()`. `reconcileSetting` (~l.613–735) reads temperature
  (running the thermal reconcile), integrates `rate(now's load, now's
  wetness or temperature) × elapsed since setStamp`, credits drainings to
  another vessel, and at the set clears the pool and calls `castFromSet` —
  an **unawaited** `castInto` whose failure is `console.error`ed.
  `setState()` (~l.580) also reconciles and is what `mouldAugmenter`
  (~l.212, a `markupAugmenter`) reads. `receivedPour` (~l.778) starts the
  stamp at the pour.
- The integration is **path-dependent today**: the rate is read at the
  moment somebody reads, and applied to the whole stretch since the last
  read.
- `platform/thing/ScrewPress.ts` `turnBy` (~l.76) banks every mould on its
  bed at the OLD load before `turns` changes — the one place a load change
  is already handled correctly.
- `LookController.lookInto` (~l.108) renders the ledger and never calls
  `PerceptionApi.observe`; only `lookAtTarget` does.
- `trade-chandlery/src/thing/Hopper.ts` ~l.104 overrides `getContents()`
  to call `reconcilePercolation()` on its heaps.
  `lib/material/Percolating.ts`: `percolantL`, `percolationReach`,
  `percolationStamp` persisted; the rate is constant
  (`1 / percolationDays()`); `onPercolated(from, to)` is the host's hook.
- **What the walks call.** `VisionModality.ts` ~l.240, ~l.589, ~l.622,
  `SoundModality.ts` ~l.160, `SmellModality.ts` ~l.220, ~l.286,
  `AmbientLit.ts` ~l.368 call `getContents()`. `SmellModality.ts` also
  calls `thing.getTemperature()` (~l.61) and `getBulkAmount` /
  `getBulkPayload` / `getBulkMaterial('interior')` (~l.308–328).
  `Thermal.getTemperature()` (`lib/thermal/Thermal.ts` ~l.754) runs
  `reconcileThermal`, which integrates the curve and then runs the phase
  change (a pool freezes and casts), kinetics, coats and shock.
  `Bulkable.getBulkAmount` / `getBulkPayload` / `getBulkMaterialPath`
  (~l.1110, ~l.1155, ~l.1499) run the seepers and the face exchange. A
  card's `longDescription` runs `getMarkupLong(viewer)` and therefore every
  `markupAugmenter` on the host — **89 files declare one**.
- **The shipped precedent for a read that must not write:**
  `Bulkable.getHeldKeywords` (~l.729) raises `_peeking`, and both
  reconcilers stand off while it is raised (~l.1232, ~l.1299); its comment:
  *"A keyword read does not reconcile: reads don't write … What it holds is
  what its last reconcile left."* Thermal keeps a `TrajectoryLog` whose
  last entry is the forward segment from the stamp (~l.1100, ~l.1240).
- **Game-clock wakes exist.** `WorldClockApi.at(deadline, cb, {host, tag})`
  / `after` (`api/worldclock.ts` ~l.249–262) fire on game time, cancel with
  their host, and fire across a test `advance`. The precedent for a
  persisted due time re-armed by its setter is
  `lib/craft/Comminuting.ts` ~l.425–460 (`pendingGrind.dueAtS`,
  `setPendingGrind`, `landPendingGrind` awaited).
- `Soilable.reconcileAiring()` (`lib/cleanliness/Soilable.ts` ~l.665) is a
  shipped `@hook` on its own mixin, awaited by `observeThing` behind
  `MixinApi.isSoilable`. It is not reached by a walk and is unchanged.

### NPC idle cost

- `lib/behavior/Behaved.ts`: one beat per agent (`_scheduleBeat` ~l.484),
  20 s watched, 120 s unwatched; `_deliberate` (~l.545) asks `urgency()` of
  every candidate whose brain is not presence-gated. 41 brains declare
  `presenceGated = false` (9 kernel, 32 in trade packs) — the labor that
  runs with nobody logged in, through real dispatch and `Scene.send`.
- `lib/message/Scene.ts` `#dispatch` (~l.270) renders every frame for every
  sensor in the place and does not ask whether any has a live session.
- 16 `ScheduleApi.recurring` sites tick regardless of population.
- behavior.md's own figure is 18 beats a minute at 36 agents, which cannot
  be 60% of a core. **No file opened here says where the cost is.**

### The drive's tooling

- `packages/wire/src/harness/crowd.ts`: `runCrowd(label)`, `CROWD_SIZE` a
  module constant, `/healthz` sampled on the harness's main thread, no box
  load, no card phase, no restart. `crowd.dirty` (count, blocking) and
  `crowd.soak` (generous bounds) wire files.
- `services/Server.ts` ~l.166–190: `/healthz`, `/stats`.
- `runner/boot.ts`: owned boot on `WIRE_PORT` (build-1: **2014**), scrubs
  `NODE_OPTIONS`. `restartWorld()` is a private function in four test files
  (`size-and-carrying.dirty.wire.test.ts` ~l.249).
- `hand(session, template, data?)`, `stage(…)` in `harness/world.ts`; the
  hoop is `/trade/dairying/thing/hoop`.
- `tools/lib/suite-lock.sh` is the cross-worktree lock. Nothing reads the
  box's load. Eight cores.

## ⭐⭐ New substrate

No new mixin, Api, logic singleton, class, registry, document kind,
collection, verb or view key. Everything added:

| # | addition | ledger row | why it is not something existing |
|---|---|---|---|
| N1 | the shipped `(KIND, 'target', stuffId)` index entry gains a **field filter**, and field dependencies are installed there for every Stuff a projection read | *a card re-checked when its subject changes* — **generalize** | no new index, key shape or listener; the name-only `('field', name)` entries are deleted |
| N2 | `touched` on `MqlOne` / `MqlMany` (opt-in through `MqlContext`): the Stuff a resolve read — containers enumerated, candidates tested | same row — **generalize** | the `RegistryScan` / `ordinal` precedent: a fact about the resolve rides its result. Searched `api/mql/types.ts`: no trace of what was read exists |
| N3 | **row-level dirt and a projection memo** in the registry | *the drain that gives replies priority* — **reuse**; the ledger puts the fix *in the re-resolve* | the drain is untouched |
| N4 | `Placing.placedChanged(item)` and `Containable.placementChanged(was, now)` — the two bodies `ContainmentLogic` inlines five times, moved onto the mixins that own the fields; `placedChanged` also fires `placed` on the host | same row as N1 | not hooks: each has a real kernel body (the fire, and the Thermal restamp). `MouldMixin` extends both |
| N5 | `MqlSubscriptionApi.notifyBelief(viewerId, subjectId)` and the synthetic index kind behind it | same row as N1 | the `notifyDurableSubject` shape, one more key. Searched `lib/belief`: no event exists, and a broadcast would wake every viewer |
| N6 | `MouldMixin.setDueAtS` (persisted, re-armed by its setter) and `setLoadN` (the load the current stretch has been under); the same pair of ideas on `PercolatingMixin` (`percolationDueAtS`) | *a read that writes* — **fix** | `Comminuting.pendingGrind.dueAtS` is the precedent; no new clock, `WorldClockApi.at` |
| N7 | `PerceptionApi.holdWorldStill()` / `isWorldHeldStill()` (read as the `worldHeldStill` accessor since the checkpoint — D15, N14f) — the room-reading window — and the tripwire at the write chokepoints | *a read that writes* — the gate that holds the fix | generalizes `Bulkable._peeking` from one object to the walk. Searched `api/perception.ts`: `holdLightSteady` memoizes light and says nothing about writes; widening it would stop a deliberate `look`'s own reconciles |
| N8 | `Thermal.peekTemperature()` and `Bulkable.peekBulk(affordance)` — the banked value, read without reconciling | same row | `peekBulk` makes `_peeking` a method; `peekTemperature` reads the `TrajectoryLog`'s forward segment. *Peek* is the tree's word (`materials().peek`) |
| N9 | two client→server messages for a subscription the server opened: `subscription-pause` / `subscription-resume {subscriptionId}` in navigation-server's protocol (fallback names in D5) | *the client telling the server what it holds* — **reuse, sequenced** | nothing in either protocol stops and restores a server-opened subscription: the client cannot re-open a card, having no field that names one |
| N10 | `Interactive.pauseSubscription(id)` / `resumeSubscription(id)` and the paused set on the registry that owns the id table | *a card's liveness following attention* — **generalize** | two more session verbs beside `cancelSubscription` |
| N11 | client: one visibility observer in the card feed; `pauseSubscription` / `resumeSubscription` on `services/websocket.ts` | same row | genuinely new on the client — searched `packages/client/src` for `IntersectionObserver` (none) and `visibilitychange` (only `onAir.ts`) |
| N12 | `/stats` gains `cpu` and a **cumulative** `loop` histogram | *the crowd drive and its record* — reuse | fields on the shipped diagnostics read |
| N13 | wire tooling: `runCrowd(label, opts)` phases, the box-load record and quiet-box precheck, `crowd-timing.dirty.wire.test.ts`, `WIRE_CPU_PROF`, `Session.pauseSubscription`, `e2e/tests/crowded-rooms-walk.spec.ts` | *the crowd drive* — reuse; *a quiet-box run* — genuinely new as a procedure (searched `tools/` for a load gate) | the precheck is a few lines in the crowd harness |
| N14 | W4 and W5: one transient field and the bodies of five shipped members | *a read that writes* — **fix**; *NPC background work* — **reuse** | designed at the W0 checkpoint: N14a–N14g in D20, with their P1–P14 lines |

**Deleted:** `MouldMixin.getContents`, `Hopper.getContents`,
`Mould.castFromSet`'s unawaited swallow, `setState()`'s reconcile, the
name-only index entries and the *Conservative-coarse dispatch policy*, the
five inline placement fire/restamp blocks in `ContainmentLogic`.

**Dropped from the first draft:** the `observeThing` settle branch, the
`lint:walk-reads` method-name gate, `locationDependent` on the card
catalogue, the composite `field@target` key, the note-to-siblings file.

### P9–P14, per item

| item | P9 predictable from def and `help` | P10 metadata is a Document | P11 no caller branches on the destination | P12 no synonym | P13 on the mixin whose sentence it fits | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| N1 field filter on `target` entries | no command changes | none | one entry shape for every dependency | reuses the shipped index; nothing parallel | the registry's header lists `index` as state it holds | a card wakes when a Stuff it read fires a field it read |
| N2 `touched` | none | none | the resolver records the same way for every seed and predicate | not a second result; one optional field, like `ordinal` | `api/mql/types.ts`, where facts about a resolve live; `MqlApi` stays two functions | read-only; opt-in so no other caller pays |
| N3 memo and dirt | none | none | every projected Stuff is memoized alike | one re-resolve path with a memo | the registry (*`dirty` / `scheduled`*) | a memoized row is reused only while nothing it read has fired; the wake matrix pins it |
| N4 `placedChanged` / `placementChanged` | none | none | `ContainmentLogic` calls the same two methods at all five sites, whatever the host is — the mould decides inside its own override | they are the existing inline bodies, named once | `placed` is `Placing`'s field, `placement` is `Containable`'s | fires are synchronous with the stamp; the mould banks before the new load counts |
| N5 `notifyBelief` | none | none | n/a | the durable-subject poke with a second key kind, not a new event | `MqlSubscriptionApi` already holds `notifyDurableSubject` | scoped to the one viewer whose belief changed |
| N6 mould and heap due times | `help look` unchanged; a set mould reads *set* whoever looks | none | n/a | `reconcileSetting` keeps its name and callers | the set site is `MouldMixin`'s subject; percolation is `PercolatingMixin`'s | **the point of the change:** the cast appears at its due time on the game clock, the same whether anyone watched |
| N7 the window and tripwire | none | none | n/a | not `holdLightSteady` (different promise) | `PerceptionApi` owns what a walk may do | the window is opened by name at the four walks; a write inside it **throws** in a test world and is reported elsewhere — never silently skipped |
| N8 `peekTemperature` / `peekBulk` | none | none | the walk calls the peek on every thing alike | deliberately a second read with a different contract: *as banked, writes nothing* vs *bring to now* | on the mixins that own the values | a peek never changes what a later deliberate read finds |
| N9 pause / resume messages | non-diegetic; `help client-card` gains one sentence | none | n/a | not `unsubscribe` + `subscribe`: the client cannot re-open a server-opened subscription | `packages/types`, with the protocol | the client states the fact; the server never infers it; default is *shown* |
| N10 session verbs, paused set | none | none | `resume` is the same act for every source: open again, answer a snapshot | beside `cancelSubscription`, not a second cancel | `Interactive` carries the session's subscription verbs (`cancelMqlSubscription` and siblings, ~l.480; D1's `subscribe` / `cancelSubscription` / `hasSubscription`) | a paused id stays paused until the client resumes, the card closes or the socket ends |
| N11 client observer | none | none | one rule for every card | `live` keeps its meaning | card feed | pause is debounced 500 ms, resume immediate: no delay is added to anything on screen |
| N12 `/stats` | n/a | n/a | n/a | fields on the shipped route | `Server.ts` | cumulative, so two readers cannot disturb each other |
| N13 wire tooling | n/a | n/a | n/a | `runCrowd` stays the one crowd staging | `packages/wire` | the precheck refuses a busy box by name |

## Plan-level decisions

### D1 — A dependency is the Stuff that was read, with the fields that were read

**Question.** How the engine knows which cards show the mover.

**Choice.** The index keeps its shape. Every dependency on a Stuff is the
shipped `(stuff.fieldChanged, 'target', stuffId)` entry; its value becomes
`Map<SubscriptionState, FieldFilter>` where a filter is a set of field
names or *any*. `routeFire` already finds the bucket by `payload.target`;
it then keeps the subscriptions whose filter admits `payload.field`.

What installs entries, all captured while the subscription resolves and
projects (projection is synchronous, so the collector is one slot on the
registry):

| source of the dependency | entry |
|---|---|
| a Stuff projected (top-level or nested) with field set F | `target = that Stuff`, filter = the union of F's `dependsOnFields` |
| a Stuff an MQL resolve **touched** (N2) — the query's own resolve, and any resolve inside a descriptor's `read` | `target = that Stuff`, filter = *any* |
| the holder, for a query-bound subscription | filter = *any* (every relative seed and every shell variable answers from the asker) |
| the holder and the subject, for a subject-bound subscription | filter = `container` (the two facts its perception gate re-reads) |
| `ChangeSource` (`by: 'target'`), `durableKey` | unchanged |

Each touched entry remembers **which projected row's read made the
resolve** (or the subscription itself, for its own query), so a fire on a
touched Stuff marks that row stale and its membership is re-read.

The `focusDependent` / `locationDependent` flags are subsumed by the
holder entry. They stay in the wire type, accepted and unused, with a
comment; removing them is navigation-server's `params` to do, so the two
builds do not both edit that type.

**Why not flags.** A flag is the subscriber guessing what its query reads.
The resolve knows.

### D2 — The firing side names the Stuff whose projection changed; belief pokes its own viewer

- **Placement.** `ContainmentLogic`'s five stamp sites call
  `item.placementChanged(was, now)` (fires `placement` on the item, runs
  the Thermal restamp) and `host.placedChanged(item)` on the old and the
  new host (fires `placed` on that host). **Nothing is fired on the
  container**: its loose `contents` changed only as a consequence, and the
  container's card wakes because its `contents` resolve *touched* the item
  (D1).
- **Belief.** `BeliefStore`'s mutators (`learnIdentityOf`, `adjustRegard`,
  `setRegard`, `clearRegard`, and the discovery and disguise writes the W2
  census lists) end with `MqlSubscriptionApi.notifyBelief(viewer.stuffId,
  subject.stuffId)`. Every projected row whose fields include
  `displayName` installs `('__viewer-belief', 'key',
  '<viewerId>|<subjectId>')` for its own viewer. The poke marks that row
  stale in **that viewer's** subscriptions and nobody else's.
- **What a body wears.** `Stuff`'s `displayName` descriptor
  (`lib/stuff/Stuff.ts` ~l.223) adds `occupants` to its
  `dependsOnFields`: a change of dress changes how everyone perceives the
  wearer, so it is a fire on the wearer.
- **The census** (W0, acted on in W2): all 30 fire sites against all 24
  descriptor files. A descriptor whose `read` consults another Stuff
  without projecting or resolving it is rewritten to do one or the other,
  so the dependency is captured. No `dependsOn(stuff)` callback is added.
- **Residual, written in the doc:** a card does not wake on light alone
  (daylight is continuous and fires nothing); the next wake re-gates it.

### D3 — Dirt carries its reason; a re-resolve re-projects only stale rows

`markDirty(sub, staleStuffId)`. Each `SubscriptionState` holds a memo
`Map<'<stuffId>|<fieldSetKey>', record>` and a `stale` set. During a
re-resolve a projection request for a memoized, non-stale Stuff returns
the memo. A stale row re-reads its own fields; its `contents` read re-runs
membership and the perception filter and hits the memo for every child
that did not change. After the pass, untouched memo entries are dropped,
`stale` clears, and index entries are reconciled against the memo (only
changed rows are torn down and reinstalled). `refreshForInteractive` and a
resume (D4) clear the memo.

The first projection (a card opening, a login, a resume) stays one unit of
N rows; D7 bounds what a row costs. That unit is the next ceiling.

### D4 — The client says what is on screen; the server never guesses

One fact, one source. The client reports per live card when it stops being
shown (pause) and when it is shown again (resume). *Shown* = the card has
a mounted body (not in the tray, not displaced by a `medium`/`full` card,
not filtered out by a card view), its element intersects the viewport, and
the document is visible. Pause after 500 ms continuously unseen; resume at
once. The server does not pause a card because it knows it is `minimized`:
that would be a second source that could disagree. A client that never
reports keeps every card current, as today.

`CardState.live` keeps its meaning (*holds a subscription*); no `seen`
field is added to any card type or envelope. Card *events* (`card-touched`
on a rebind, `card-arranged`) still flow: the pause is of state.

### D5 — Pause/resume rides navigation-server's D1; one fallback; the wave is last

W7 is the last wave. It never waits on build-2.

**Primary — D1 has merged to master when W7 starts** (the check: `git
ls-tree origin/master packages/server/src/mud/api/subscription.ts`). Merge
master, then:

- Wire: `subscription-pause` / `subscription-resume {subscriptionId}`,
  two more client→server messages in that protocol.
- The paused set lives on `SubscriptionRegistry`, keyed by session and id,
  beside the id table.
- **Pause** calls the source's `closeSubscription(handle)` and keeps the
  id, source and params. The source drops its index entries, memo and dirt
  for that handle — nothing is computed or sent. `CardRegistry` is not
  told and its card set is untouched (D1's own rule for
  `closeSubscription`).
- **Resume** calls `openSubscription(handle, params)` and sends a fresh
  `subscription-result` with `rev: 0`. That is D1's repair act — a new
  snapshot — so no new `rev` rule exists: the client's tracker treats a
  result as a reset whenever it arrives.
- **Card routing.** The id is the card's `instanceId`; the client already
  holds it. `useCardFeed` gains a `subscription-result` handler that, for
  an id that is a card, replaces the card's records. Until now a card's
  only snapshot rode `card-opened`; a result for a card id means *resumed*.
- **A paused id that is opened again** (the `here` card rebinding while
  minimized — `cancelSubscription` then `subscribe` under the same id):
  `cancelSubscription` from the card's *close* forgets the pause;
  `CardRegistry.rebind` is a cancel-and-reopen and must not. So `rebind`
  reopens through the same session verb with the paused mark kept: the
  open answers its snapshot (it rides `card-touched`, an event, the
  mover's own cost) and the registry closes the source side again at once.

**Fallback — D1 has not merged when W7 starts.** Same behavior on the
current transport under its current naming: `mql-subscription-pause` /
`mql-subscription-resume` beside `mql-subscribe`; the paused set on
`MqlSubscriptionRegistry`; resume answers a fresh
`mql-subscription-result`; the session verbs forward through
`MqlSubscriptionLogic` as `cancelMqlSubscription` does. The build tells
build-2 **by message** that its W1 migration moves two more message types
and the paused set. No note file.

Either way W2/W3 keep their diff inside the resolve, projection and
dependency blocks of `reresolveAndEmit` and `handleSubscribe` and leave
the three emit lines as they are, so whichever build merges second
re-applies a few lines.

### D6 — (folded into D4)

### D7 — A row is cheap, by the profile

The slate's *~10–15 ms a row* for five reference fields is a defect class
of its own. W0's crowd profile attributes it (suspects from the read path:
`describeFor` and its perception gate, `primaryKeyword`, the nested MQL
resolve). W3 fixes the named cost in the member that owns it. Target: a
reference row under 1 ms with the light held, asserted by a unit bench
over a staged room of thirty.

### D8 — The mould and the heap: bank at your own changes, finish on the game clock

**The rule.** A set's progress is integrated only at moments that do not
depend on who is reading: the mould's own changes, and its own wake.

- **State.** `setProgress`, `setStamp`, `setPressed`, `setDrainedKg` as
  shipped, plus `setLoadN` — the load the stretch since `setStamp` has been
  under — and `setDueAtS`, whose setter cancels and re-arms
  `WorldClockApi.at(due, …, { host, tag: 'mould-set' })`
  (the `setPendingGrind` shape, so a restart or a reload re-arms from the
  persisted value; a due time already past fires at once).
- **Bank** (`reconcileSetting`, name and callers kept): integrate from
  `setStamp` to now at the **stored** `setLoadN` and the rate's other
  inputs read now; credit drainings; then store the load as it is now,
  stamp, and re-arm the wake for `now + min(time to finish at the current
  rate, MOULD_SET_STEP_S)`. The step (one game hour, a constant in
  `Mould.ts`) bounds the error from the continuous inputs — wetness drying
  and the cure's temperature — and makes the schedule a function of the
  mould's state alone.
- **Who calls bank** — each is a primitive the mould already hosts:

  | change | where |
  |---|---|
  | a pour arrives | `receivedPour` (shipped) |
  | something is set on it or taken off | `placedChanged(item)` — `MouldMixin` extends `Placing`'s (N4) |
  | it is set on, or taken off, a host that bears on it; it moves | `placementChanged` (N4) and `Containable`'s shipped `onMoved` witness |
  | a press it stands on is turned | `ScrewPress.turnBy` (shipped, unchanged — with a stored load, banking before the turn is still exact) |
  | something enters or leaves it | `Container`'s shipped `onContainableAdded` / `onContainableRemoved` witnesses |
  | the wake | the `WorldClockApi.at` callback |

- **Completion happens in the wake**, and the cast is **awaited** there:
  `await this.castInto(pool)` inside the callback's guarded root, with
  `assertCanRelease` checked first as today. `castFromSet`'s unawaited
  `.catch(console.error)` is deleted.
- **Reads are pure.** `getContents` is no longer overridden. `setState()`
  reads the banked fields and writes nothing; `mouldAugmenter` is
  unchanged and therefore pure. `IronPot.getAlkaliKg` (a deliberate read)
  may still bank; its `reconcileSetting` override now also runs at every
  wake, so its salts cast on the clock.
- **`get … from`** sees the truth because the truth exists by then: the
  cast was minted at its due time. No removal veto does any work.
- **A freezing pan.** The freeze is thermal's; the mould's wake keeps the
  temperature read it has today, so a filled pan below its melting point
  freezes at a wake rather than at whoever smells it.

**The heap.** `PercolatingMixin` gets the same shape and is simpler (its
rate is constant): `receivePercolant` sets `percolationDueAtS`; the wake
runs `reconcilePercolation` (so `onPercolated` fires at completion); the
due time is re-derived when the heap moves (`onMoved`), since
`percolationDays()` reads its host. `getReach()` stays a deliberate
reconciling read. `Hopper.getContents` is deleted; a hopper's liquor reads
keep bringing its heaps current through `Bulkable.reconcileSeepers`, which
is a deliberate read.

**`Soilable`** is untouched: `reconcileAiring` is already one narrowed
hook on its own mixin, reached only from a deliberate `look`.
`observeThing` learns no new kind.

### D9 — The room's reading holds the world still

**The window.** `PerceptionApi.holdWorldStill()` returns a release, like
`holdLightSteady()`. The four walks the requirements name open it for
their own (synchronous) duration: the light walk (`VisionModality`), the
sound gather, the smell fold, and a subscription's projection
(`projectStuffInto` in the registry, both at subscribe and at re-resolve).
A deliberate `look`'s own render is **not** inside it, so a look's
augmenters may still bring a thing up to date; the light walk that look
runs is.

**Inside the window:**

- A reconcile-on-read getter that a walk reaches answers **as banked**:
  the reconciler stands off, exactly as `Bulkable`'s two do under
  `_peeking`. The walks themselves call the explicit peeks where one
  exists (`SmellModality` → `peekTemperature`, `peekBulk`); `Thermal`'s
  peek reads the forward segment of its `TrajectoryLog`, so a cooling pot
  still smells cooler without anything being stamped.
- **The tripwire.** The write chokepoints — `fireFieldChange` and
  `EventApi.fire` of a `FieldChangedEvent`, `StuffApi.clone` / `create` /
  `destruct`, `ContainmentApi.move`, `PersistableApi.capture` — check
  the hold (`worldHeldStill`, D15). In a test world (`SecurityApi.isTestEnvironment()`,
  which every wire world is) a write inside the window throws a typed
  `WalkWriteError` naming the walk and the write. Elsewhere it is recorded
  through `DiagnosticApi` and counted on `/stats`, and proceeds — a
  player's `say` is not broken by a pack's defect.

**The census is behavioral.** `lib/perception/__tests__/
walk-purity.test.ts` stages one place holding a filled hoop past its set
time, a hopper with a charged heap, a pan of water below freezing, a lit
lamp and a ripening provision; snapshots every persistent field of each;
runs the light, sound and smell walks and a `DETAIL_FIELDS` projection of
the place and of each thing; asserts no `FieldChangedEvent`, no clone, no
destruct, no move, and field-for-field equality with the snapshot. Each
reconciler it catches gets its stand-off line. **Scope:** only what these
walks reach. The other reconcile-on-read sites are not touched.

**The gate** is the tripwire: a new walk-time write fails the first test
or wire drive that walks over it. There is no method-name lint.

### D10 — W4 and W5 are designed at a checkpoint after W0, and the build does not stop

The idle and login fixes cannot be designed before the profile exists.
W0 ends at a **re-plan-in-place checkpoint**:

1. The build agent writes the W0 record into this plan.
2. It re-invokes the `planner` agent with the W0 record and this plan, to
   design W4 and W5 as decisions with file lists, host placement and
   P1–P14 answers.
3. It gets a second review of that design from an agent given the plan
   and the code, **not** the planner's conclusion.
4. It records the decisions here (D13 onward) and continues. `/build` does
   not stop for sign-off; what it decided is in the plan and the MR.

**Hypotheses only**, to be confirmed or discarded by the profile:

| class | what it would look like | census |
|---|---|---|
| I1 unwatched `urgency()` | self time under `_deliberate` → a brain's `urgency` | the 41 `presenceGated = false` brains: what each reads per beat |
| I3 work nobody perceives | `Scene.#render` → `Mml.toString` → `describeFor` → light, with no live session in the place | which unwatched acts send Scenes |
| I4 standing ticks | a `recurring` callback's self time | the 16 sites: period × cost when empty |
| login L1 | the `here` card's first projection (D7) | — |
| login L2 | the arrival Scene to thirty; the greeters' beats; `materialize` | — |

(The first draft's "stuck critical" class is withdrawn: nothing opened
shows an agent held on the short beat in an idle world, and the one known
`critical` re-beat is the sugar pan's, which is correct.)

**Constraints the checkpoint design must obey.** Content's cadences, the
three beat dials and every brain's `presenceGated` declaration are not
edited. A fix changes the engine's cost per beat, never whether declared
unwatched work runs. No guard of the form *if nobody is watching* goes on
a base-class member; the presence fact belongs to the caller that has it.
Classes are fixed in order of share until the idle step measures under
12%; a class under 2% is left and recorded. If the profile says the cost
is content's own authored work, that is the owner's call.

### D11 — One hundred is a size, not a second drive

`runCrowd(label, { size })`; the 100 phase runs after the restart in the
same file inside a `try` that turns a crash, a timed-out login or a dead
world into the recorded finding. Its record goes beside the thirty's in
the Drive record and the slate's status block.

### D12 — The timing gate, the quiet box, and what counts as evidence

- The timing assertions live in `crowd-timing.dirty.wire.test.ts`, which
  runs only with `WIRE_QUIET=1` and otherwise reports itself skipped by
  name with the reason. It adds no lane. `crowd.dirty` keeps the greeting
  count on every MR; `crowd.soak` keeps its generous bounds after merge.
- **The quiet-box procedure** (written into `docs/testing.md` in W6):
  1. Take the suite lock (`tools/lib/suite-lock.sh`).
  2. List other Saxonberg servers (`pgrep -af preload.js`, then
     `readlink /proc/<pid>/cwd`). Ask the sessions that own them to stop
     them. ⛔ Never kill a sibling's world.
  3. Drop this worktree's database; run
     `WIRE_QUIET=1 WIRE_BOOT=1 WIRE_PORT=2014 pnpm wire crowd-timing`.
  4. **The precheck**, the file's first act: 1-minute load under 1.0, and
     no Saxonberg server or vitest process **outside its own process
     tree** (it walks `/proc/<pid>/stat` parents from each candidate; the
     vitest it runs in, that vitest's workers and the server it booted are
     its own). A failure stops the run with `box not quiet: <what>`.
  5. Throughout: `/proc/loadavg` at start and end, and per phase the CPU
     the box spent outside that same tree (`/proc/stat` minus the tree's
     own). More than half a core of foreign CPU in a phase marks it
     **inconclusive**, which fails under that name and is re-run.
- `/healthz` is sampled from a worker thread. `/stats.loop` is a
  **cumulative** histogram since boot (`monitorEventLoopDelay`, never
  reset): `count`, `over100` (derived from its percentile map), `maxMs`,
  `p99Ms`. The harness reads it at each phase boundary and subtracts, so
  two readers cannot disturb each other.
- Every number written into this plan, the MR or the slate comes from such
  a run with the load beside it. W0's profiles are for **shares**, not
  times, and may be taken on a busy box.

### D13 — A body's size reads its banked flesh (class B1)

*D13–D21 are the W0 checkpoint's decisions (D10), designed from the W0
record by the planner on 2026-11-17; D10 step 3's unanchored review is
folded in (the list closes D20).*

**What the code does** (opened, not inferred). `Creature.getBodyDensity()`
(`lib/creature/Creature.ts` ~l.642) calls `this.getReserve('flesh')`, and
`MetabolicMixin.getReserve` (`lib/metabolism/Metabolic.ts` ~l.678) is the
reconcile-on-read override. `Creature.getVolumeM3()` (~l.656) divides mass
by that density; `Shaped.getDimensions` / `getFitBox` call it; and
`Container.fitRefusal` (`lib/spatial/Container.ts` ~l.426–485) asks the fit
box of the arriving item **and of every content of the destination**
(`fillOf`, ~l.1231). So one crossing or one `move` into a place holding N
bodies runs `reconcileMetabolism` on N + 1 bodies — the mover's and every
bystander's — and each integration runs the thermoregulation slice and its
insulation walk (D16).

**This is a behavior defect before it is a cost.**
`docs/subsystems/behavior.md § NPC hunger begins existing in this build`
states the shipped rule: *"an NPC's satiation only advances when something
reads it, the only reader is this brain's `eat` … an empty counter cannot
starve anybody."* The size read (size and carrying, merged 2026-11-16)
broke it: an NPC now hungers because somebody walked into its room, and a
cast member in a busy square drains toward `STARVATION_LETHAL_SEC` while
the same one in a quiet shop does not. That is *state depending on who
happened to be there* — the mould's defect, on bodies.

**The fix.** `getBodyDensity()` reads the stored reserve raw —
`this.reserves['flesh']` — exactly as `Creature.withBodyComposition`
(~l.905) already does in the same class, for the reason its comment
gives: *"Reads the stored reserve values RAW (no reconcile): mass
is read on hot paths … The stocks move on the metabolism clock."* No
member is added. Today one volume is computed from a **banked** mass over
a **reconciled** density; after this both halves read the same banked
stock.

**Why not the hold.** Opening `holdWorldStill` around the fit read was
weighed and rejected. A `move` is itself one of D9's write chokepoints, so
a room-reading window opened inside it names nothing true; the window's
contract is *what the room reads for everyone*, and a tape measure under
one body's move is not that (P14: a getter whose answer changes with the
dynamic scope is a hidden decision, and D9 spends that budget once, on the
four walks). And it is unnecessary: the read is **wrong to reconcile**, not
merely expensive. Doctrine chose — D8's *reads are pure* and ruling R1,
with lens 3a (the world cannot differ by who was there).

**What keeps a body current instead** — all shipped, none added:

| what brings it to now | where |
|---|---|
| its own changes, each of which reconciles before it applies | `ingest` (`Metabolic` ~l.1548), `exert` (the scheduler, the traverse, the exchange — exertion.md), harm (`ConditionApi.inflict`), a drink, a dose |
| its own acts' reads | carrying (`wouldExceedCeiling` → the condition band), a brain's `urgency` that reads a reserve (`eats`, `feeds`) |
| a deliberate read of the body | `look at`, `score`, `assess`, `analyze`, the mirror line of a deliberate `look` |

**Nothing starts to depend on who looked.** The set of things that
reconcile a body only shrinks, and what leaves it is exactly the incidental
set (being walked past, standing where something was put down). Flesh moves
only in `partitionFlesh`, on the metabolism clock; a body's size therefore
reads as of its last reconcile, which is the convention its mass already
ships with. Density has three consumers, and each now reads the banked
stock: the fit (`getVolumeM3`, above); the doorway girth
(`Creature.ownEnvelope` ~l.853, the clearance a crossing is asked
against); and buoyancy (`Buoyant.displacement`,
`lib/encumbrance/Buoyant.ts` ~l.108, through a shipped duck-typed
`getBodyDensity?.()` this build does not widen or fix). The whole range of
flesh, empty to full, moves density by about 7% (`F = 0.08 + 0.32 ×
flesh/100` over 900/1100 kg/m³), so a body floats, fits and clears a door
as its last reconcile left it — and a swimmer's own strokes are exertion,
which reconciles.

**The count** (`lib/creature/__tests__/Creature.size-read.test.ts`, imports
`test-bootstrap`): a place holding five fed, clothed bodies **with no
brains** (an arrival Scene's witnesses and a greeter's act read a body
deliberately, and legitimately reconcile it); advance the
injected clock ten game minutes; then `place.fitRefusal(x)`, a
`ContainmentApi.move` of a crate into the place, and one body's
`traverse` into it. **A crossing runs `reconcileMetabolism` zero times on
the bodies standing there** — counted by a spy on the raw target where the
proxy honors one, and in any case proved by every bystander's
`metabolicClockStamp`, `thermalRegStamp` and `reserves` being
field-for-field what they were (an unmoved stamp across a ten-minute
advance is zero integrations). The mover's own stamp may move: its
exertion is its own change. ⚠ The traverse leg **depends on D14**: the
arrival Scene is rendered to every bystander, and until the sight gate
stops reconciling, that render moves their stamps. The `fitRefusal` and
`move` legs stand alone.

### D14 — A sight gate reads the conditions as they stand (class B2)

**What the code does.** `Actor.hasCausticAtHead()`
(`lib/creature/Actor.ts` ~l.113) calls `this.getConditions()`, which
reconciles (`lib/vitals/Vitals.ts` ~l.2849 → `reconcileConditions`
~l.3122: the burden stages, `deriveCirculation`'s two vital-sign writes,
every wound's tick and mend, `noticeGripLost`). It is asked by
`perceivedBandModifier` and `canSeeOverride`, so by every
`VisionModality.perceivedBand` — every `describeFor`, for the **viewer**:
each Scene frame to each sensor, each roster row, each card row.

**The fix, and why it is exact.** The gate reads `this.conditions` — the
collection as the last reconcile left it. The question it asks is *is a
caustic agent still on the head*, and `agentActive` changes at exactly two
events: `CAUSTIC_BEHAVIOR.onset` (the splash) and `resolve` (the rinse) —
`platform/idea/Condition.ts` ~l.1477–1503. `tick` only grows severity
while it is active and `mend` returns early while it is; no passage of
time flips it and an active caustic never heals away. So the banked answer
**is** the reconciled answer, always — this is not *as banked, slightly
stale*, it is the same value without the integration. No member is added;
`Actor` is the host's own class body reading its own composed storage, the
`withBodyComposition` shape again.

⚠ **One thing did depend on that integration** — the dying clock; see
D21, which lands in the same commit.

**Why not the hold:** as D13, and more strongly — a Scene render and a
roster row are not walks, so the window would not cover them.

**The count** (`lib/creature/__tests__/Actor.sight-gate.test.ts`): thirty
bodies in a lit place, three carrying an open wound; advance ten game
minutes; every body `describeFor`s every other. **A `describeFor` runs
`reconcileConditions` zero times**: every wound's `tickedAt` / `mendedAt`
and both circulation vital signs are unchanged on viewer and target.
And the exactness, pinned: a body splashed at the head reads two bands
down before and after a clock advance with nothing reconciled; rinsed, it
reads clear; in both states the gate equals what
`getConditions().some(…)` answers.

**The class, not the instance.** The same test fails on any *other*
reconciling read under `canSeeGate` (the consciousness read, the
concealment band). Each one it catches is sorted by one question — *can
elapsed time alone change this answer?* If no, it reads the stored field
(this decision). If yes, it is **not** fixed here: it is recorded in the
W4 record with its share and goes to D15's hold where a walk reaches it,
else to D20's seam.

### D15 — Inside the room's reading a body stands still too

D9's census (`walk-purity`) stages a mould, a heap, a pan, a lamp and a
provision — and **no body**. A card's projection of a person still reaches
body reconcilers through `longDescription`'s augmenters (the mirror's body
line reads reserves) and `worn`; a body reconcile writes reserves without passing any chokepoint, so the tripwire
never fires on it. That is the requirement's *"any other case on those
walks is fixed the same way"*, and ruling R1 already says what a card shows
(*its last reconcile*).

- `walk-purity.test.ts` gains a fed, clothed NPC with an open wound, in the
  staged place. Its snapshot is **every persistent field of the body**,
  taken generically (the `fieldMeta` of every composed mixin, as
  `PersistableApi.capture` enumerates them) and never a hand list — so the
  respiration stamps, `Wet`'s wetness and stamp (`lib/weather/Wet.ts`),
  the caster's faculty stamps (`lib/magic/Caster.ts`), hygiene and
  soiling are in it with the reserves, the thermal stamps, the conditions
  and the vital signs. Whatever it catches takes the same line.
- `reconcileMetabolism`, `reconcileConditions` and
  `reconcileThermalRegulation` take the stand-off:
  `if (PerceptionApi.worldHeldStill) return;` — placed **after the
  reentrancy guard and before the clock read** (the clock read is two
  gated calls, and the first-touch stamp after it is a write). One
  mechanism serves the four walks (N7); no peek is added beside any
  getter.

**The flag is read without a security frame** (this supersedes N7's
`isWorldHeldStill()` for W1's stand-offs in Thermal, Bulkable, Mould and
Percolating too). `getReserve` is the hottest getter on a body, and
`PerceptionApi.isWorldHeldStill()` as W1 first wrote it is an Api static
(wrapped) → `logic()` → a `@CallSecurity` method: class P, paid on every
reserve read to learn *no*. The design, once:

- The stack of open walks is `static #stillWalks: string[]` **on
  `PerceptionApi`** — Api static `#` state is sanctioned (CLAUDE.md
  § Member Privacy; `StuffApi.#pendingSingletons` is the precedent), and a
  hold is a synchronous window with nothing to hot-reload.
- It is read through a **static read-only accessor**,
  `static get worldHeldStill(): boolean`. `SecurityApi.decorateApiClass`
  wraps only own statics whose descriptor `value` is a function
  (`#wrapAllStaticMethods`, `api/security.ts` ~l.693–701), so an accessor
  is never wrapped: no frame, no policy resolution — the same ungated read
  every `static readonly needs` already is. It exposes one boolean and
  cannot change it.
- `holdWorldStill(walk)` stays a gated method and pushes/pops that stack.
  `wouldWrite(write)` returns at once when the stack is empty and
  otherwise forwards the innermost walk to `PerceptionLogic`, which keeps
  the throw, the diagnostic and the `/stats` count.
- `isWorldHeldStill()` is **deleted**, not kept beside the accessor (P12).
- No module, class or exported function is added, and nothing in `lib/`
  gains a static.

**The count** (`api/__tests__/perception.hold.test.ts`):
`Object.getOwnPropertyDescriptor(PerceptionApi, 'worldHeldStill')` is an
accessor with no wrapped value; ten thousand `getReserve` calls on a body
outside a hold enter `PerceptionLogic` zero times (a spy on the logic
singleton's raw target).

This is the only place the hold is widened to bodies. It is **not** opened
anywhere new.

⚠ **Owner's eye.** The shelf's `BODY` row changes when a reconcile turns
a band over (exertion.md § The poke). After D13–D15 the only reconciles
are the body's own acts and deliberate reads of it, so a player who stands
still learns their breath is back, or that they are hungry, at their next
act — as a player alone in a quiet room does today, where nothing
incidental reads them either. R1 accepted *as banked* for things; this
applies it to people. W4 pins the alone case so it cannot regress (a
winded player, alone, the clock advanced, one act: the line arrives). D20
names the piece that would make a body tick by itself.

### D16 — An integration reads what the body wears once

The leaf of B1's chain is the cost of one integration, which D13 does not
change: `integrateThermalSlice` (`lib/thermal/ThermalRegulation.ts`
~l.378) calls `wornInsulationKelvin()` per slice, `shedAndOffset` (~l.487)
and `bodyTau` (~l.921) call `bodyInsulation()` again, and
`Attired.bodyInsulation` (`lib/slot/Attired.ts` ~l.945) walks every
exterior body part × its worn stack × `Wearable.getClo`. A reconcile over
a k-minute gap does that walk up to 3k times, and what a body wears cannot
change inside one synchronous reconcile.

**The fix.** `reconcileThermalRegulation` reads `bodyInsulation()` once,
into a transient private field (`_reconcileClo: number | null`, set first
inside the guarded block — before `refreshEffectiveAmbientFromEnvelope`,
so nothing in the reconcile reads insulation ahead of it — and cleared in
the `finally` beside
`_thermalRegReconciling`); the three readers use it when it is set and
call through when it is not (`shedWhileWorking` ~l.185, the fourth
`bodyInsulation` site, runs outside a reconcile and is deliberately
unchanged). Identical arithmetic, so no thermal test moves.

**The count** (`lib/thermal/__tests__/ThermalRegulation.insulation.test.ts`):
a reconcile across sixty slices calls `bodyInsulation` once.

**Conditional** on D18's re-profile: built if `bodyInsulation` is still
≥ 2% of the idle window after D13–D15; otherwise recorded and left.

### D17 — The roster is composed in one frame, with the light held (class B3)

**What the code does.** `PresenceLogic.snapshotForImpl`
(`platform/idea/api/PresenceLogic.ts` ~l.116) loops
`await viewer.composeRosterRow(person)` over everyone online, and
`fanImpl` (~l.141) does the same per viewer for the arriver. Each `await`
is its own tick, and `holdLightSteady` is a synchronous window by contract
(`api/perception.ts` ~l.210), so every row's `describeFor` walks the light
of a crowded place alone: sixty walks for a login into thirty.

Nothing in the row is asynchronous. `ProfileLogic.composeRowImpl`
(`ProfileLogic.ts` ~l.115) awaits nothing; `SecurityApi.projectAcross`
returns what its callback returns.

**The fix.** No new member:

- `ProfileLogic.composeRow` and `NotifyPolicy.composeRosterRow`
  (`lib/social/NotifyPolicy.ts` ~l.116, ~l.290) return `RosterRow`, not a
  promise of one. (Rejected: a plural `composeRosterRows` beside it — a
  second name for the same act, P12, and it would not serve the fan, whose
  many is the viewers.)
- `snapshotForImpl` and `fanImpl` take `PerceptionApi.holdLightSteady()`,
  compose every row in one synchronous loop (the per-viewer `try` stays
  around each compose), release in a `finally`, **then** send — no Scene
  is sent inside the hold.
- `WhoController` (~l.82): its `Promise.all` becomes a plain `map` inside
  a light hold, as `LookController` ~l.538 does for its own listing.

**The count** (`platform/idea/api/__tests__/PresenceLogic.roster.test.ts`):
thirty avatars in two places; one snapshot walks the light **once per
place** — the memo is keyed by the place's `stuffId`
(`VisionModality.signalAt` ~l.84–94), confirmed in the file — (two walks, counted at `VisionModality.signalAt`'s walk), one `add` fan
walks it once; before the change the same test counts thirty.

**The frame is bounded by the row** (D7: under 1 ms held), so thirty rows
are one unit of about 30 ms and the hundred's are about 100 ms — recorded
with the hundred's numbers, not chunked here.

### D18 — W4's ladder, its acceptance, and what is the owner's call

The profile gave shares on a busy box, with overlapping stacks; nobody can
say from it what idle costs after D13–D15. So W4 is a ladder with the
measurement between rungs, decided here so the build does not come back:

1. D13, D14, D15 (one commit). Re-profile ten idle minutes
   (`WIRE_CPU_PROF`, shares only) and write the **W4 record** under the W0
   record: the same class table, plus one line per unwatched act that is
   still ≥ 2% naming the member where its self time sits.
2. D16 if its condition holds.
3. Every remaining **engine** class ≥ 2%, in order of share, fixed in the
   member that owns it under D10's constraints, each with its
   count-per-call test. Two are pre-named because the code shows them:
   - `reconcileThermalRegulation` has no sub-step stand-off, so every
     core-temperature read integrates a sliver; `reconcileMetabolism`
     has had one since a profile put 28% of the server there
     (`Metabolic.ts` ~l.762–775, *do nothing yet and do not re-stamp*).
     The same three lines, against `REG_STEP_SEC`. It changes the
     granularity at which a core drift becomes visible to the model's own
     declared step, so the thermal and respiration suites are its gate.
   `Container.fitRefusal`'s sum over a place's contents is **not**
   pre-named. After D13 it is N size reads and zero reconciles, and the
   obvious cut (skip the sum for a place none of whose sides close) needs
   `bounds()` first — the exposure read the strict pass exists to avoid
   (`Container.ts` ~l.440–444). If the re-profile shows it, it is designed
   then, with that trade measured.
4. Stop when a quiet-box idle step (D12) reads under **12%**.

**What W4 may not do** (D10, restated because this is where it bites): no
brain's `presenceGated`, cadence or `urgency` is edited; no beat dial
moves; no `recurring` site gains a population test; `lint:idle-cadence`
does not move.

**The honest expectation.** Class A — the cast's authored acts, a `get`,
a `look`, the roster tick, through real dispatch — was about **25% of the
idle window** in the W0 record, and class P is ~60% of self time under
all of it. Part of A is B1 underneath (a `get` is a `move`), so D13 will
shrink it; how far is what rung 1 measures. Engine fixes alone may not
reach 12%.

**If the ladder ends above 12%,** what is left is, by construction, class
A at content's cadence running on class P (D20). Neither is this build's to
change. The MR then opens with the idle criterion **named as outstanding**,
the W4 record beside it, and the owner's two levers stated: content's
rates, or the call-security build first. The build does not trade either
on its own.

### D19 — Login into a crowd, and the restart

**The crowd half** is D13 (the arrival's fit read over thirty bodies, and
`restorePlacement`'s `move`), D14 (every `describeFor` in the arrival
Scene and the roster) and D17, plus W3's row. After they land, re-profile
the last five logins; any synchronous unit over 100 ms that remains is
named in the W5 record and fixed in its owner, under the same rule as
D18.3. The first projection of the `here` card stays one unit of N rows
(the shipped deferred seam).

**The restart half is correctness, and the code says it should already
hold:** `retireSignedOutBody` saves **before** it destructs
(`lib/character/Avatar.ts` ~l.1757); the record carries `place`
(persistence.md § `PersistedRecord.place`); `restorePlacement`
(`platform/idea/api/PersistableLogic.ts` ~l.327) materializes a lazy room
through `StuffApi.singleton`, whose in-flight map coalesces thirty
concurrent first resolutions onto one clone (`api/stuff.ts` ~l.211–219).
W5 proves it rather than assuming it:

- **Unit** (`platform/idea/api/__tests__/PersistableLogic.crowd-restore.test.ts`):
  thirty avatars captured in one place and destructed, the place
  destructed, then materialized with `Promise.all`. All thirty stand in
  **one** live instance of that place; none is at the default start; the
  backstop's warning was not logged.
- **Drive step 10**: before step 9's quit each player's place is read as a
  player reads it (the `here` card's path); after the restart the same
  read is compared, per player.
- **One hazard the code shows.** `restorePlacement` ends in an unguarded
  `ContainmentApi.move` (~l.361). If the tape measure refuses a returning
  body (a place that filled while they were away), the login fails
  outright. The unit test stages it (a place whose sides close, filled past
  its room). If it throws, the fix is the function's own backstop — land
  at the default start with the worded warning it already has — never a
  forced move and never a fit exemption for returning bodies (that would be
  the performance cap's twin: a room that holds more people after a
  restart than before).
- **And the backstop has the same hazard.** Its own `move` (~l.348) runs
  the tape measure too; if the default start refuses, the `catch` (~l.350)
  warns and returns, the host is containerless, and `Avatar.enter` fails
  with an error that says nothing about why. The test stages it as a third
  case (the captured place **and** the default start both full). The rule,
  whatever it shows: the failure is never swallowed (P3) — the login is
  refused with the reason in words (*nowhere to stand: `<place>` and the
  realm's start are full*), thrown from `restorePlacement`, not discovered
  two calls later. Whether a realm's default start may ever be full is the
  room-capacity slate's question and the owner's, not this build's.

Any other way step 10 fails is a defect, fixed here in the member that
owns it (the capture's `place`, or `Avatar.enter` step 1), and recorded.

### D20 — What W4 and W5 add, and what they leave

**Added substrate** — one transient field and one static accessor (which
replaces a method). Everything else is the body of a shipped member.

| # | addition | ledger row (P1) | P2 host | P3 | P4 | P5 | P6 | P7 | P8 |
|---|---|---|---|---|---|---|---|---|---|
| N14a | `getBodyDensity` reads `reserves['flesh']` raw (D13) | *a read that writes* — **fix**; the `withBodyComposition` precedent | `Creature`: every creature has a density; no guard | no failure path | n/a | no controller | reads a field its host already persists | n/a | no name |
| N14b | `hasCausticAtHead` reads `this.conditions` (D14) | same row — **fix** | `Actor`, where it already sits | n/a | n/a | n/a | n/a | n/a | no name |
| N14c | three stand-off lines; a body in `walk-purity` (D15) | same row; N7's mechanism | not a host guard: asks *is the room reading*, not *what am I* | a walk-time body write now cannot happen; the tripwire still throws on any that reach a chokepoint | n/a | n/a | n/a | n/a | no name |
| N14d | `ThermalRegulationMixin._reconcileClo` (D16) | *NPC background work* — **reuse** (cost per beat); searched `ThermalRegulation.ts` for a per-reconcile cache: none | every thermoregulating body reads its insulation in a reconcile; a body with no clothes holds 0 | n/a | reads behind `MixinApi.isAttired`, as today | n/a | transient, never persisted; `private`, not `#` (mixin state behind the proxy) | n/a | beside `_ambientOffsetK`, `_workingOffsetK` |
| N14e | `composeRow` / `composeRosterRow` return a value; the two presence loops and `who` hold the light (D17) | *one light walk per message* (shipped by controllers-are-io) — **reuse** of `holdLightSteady` | `NotifyPolicy`: unchanged host | the per-viewer `try` stays; a failed compose drops that viewer as today | n/a | `who`'s hold is the `LookController` precedent: a listing's frame, not a decision | n/a | n/a | names unchanged |
| N14f | `PerceptionApi.worldHeldStill` (static accessor) over `static #stillWalks`; `isWorldHeldStill()` deleted (D15) | N7's row — the same window, read cheaply; searched `api/*.ts` for a static accessor: none, the precedent is the unwrapped data static (`needs`, `DEFAULT_SCALE`) | `PerceptionApi`, which owns the window | a write in the window still throws / is reported | n/a | n/a | process state, dies with the frame | no boot entry | an adjective for a state, beside `holdWorldStill` |
| N14g | the dying deadline in `Vitals.nextInterestingAt`; `beginDying` calls `rescheduleNotify` (D21) | *a read that writes* — **fix**, on the shipped D19 alarm | `Vitals`; the alarm is already gated to a body with a session, so no host is re-narrowed here | the alarm's reconcile runs `expireDying` as any read does | behind the shipped `MixinApi.isHasInteractive` | n/a | the handle is transient; a restored dying body re-books at its first reconcile | n/a | no name |

**P9–P14, per item.**

| item | P9 | P10 | P11 | P12 | P13 | P14 |
|---|---|---|---|---|---|---|
| N14a | no command changes; `help` unchanged | none | `fitRefusal` asks every item the same question | no new read — the getter itself stops reconciling | density is `Creature`'s; the reserve store is `Reserved`'s, read as `withBodyComposition` reads it | **the point**: a bystander's body no longer changes because someone walked in |
| N14b | none | none | n/a | no new read | the perception seam's implementer is `Actor`; the collection is `Vitals`' | the gate's answer is unchanged in every case (proved in D14); what stops is the invisible integration |
| N14c | a card shows a body as last reconciled (R1) | none | every reconciler stands off alike | no peek beside a getter; W1's one mechanism | each line sits in the reconciler it stops | the window is opened by name at the four walks only |
| N14d | none | none | n/a | not a second insulation read: the same call, made once | thermoregulation's own reconcile | cleared in `finally`; never read outside a reconcile |
| N14e | `who` and the roster read the same | none | one compose for snapshot, fan and `who` | no plural added; the singular stops being a promise | the row is `ProfileLogic`'s, the fan `PresenceLogic`'s | rows are composed before anything is sent; nothing is sent inside a hold |
| N14f | none | none | every stand-off reads the one flag | replaces `isWorldHeldStill()`; the method is deleted | the window is `PerceptionApi`'s | read-only; only `holdWorldStill` and its release change it |
| N14g | a dying player dies when the window ends, as `help` for the dying arc already says | none | n/a | no second alarm: one more deadline in the shipped one | the dying record and the alarm are both `Vitals`' | **the point**: death arrives on the clock, not at the next thing rendered to the body |

**Left, with destinations** (also in § Deferred seams):

- **P — the call-security / proxy tax**, ~60% of self time in all three
  windows (`findDescriptor`, the proxy `get`, policy resolution,
  `_pushFrame`). Destination:
  [call-security-performance-slate](../slates/tech-debt/call-security-performance-slate.md),
  whose *Left* list already names `findDescriptor` accessor-ness caching
  and the static-Api apply thunk; the W0 and W4 records are appended to it
  as its second measurement at the W4 commit.
- **A body has no clock of its own.** Every body integrates only when read,
  and an unowned body drops any gap over four game hours
  (`MAX_REASONABLE_GAP_SEC`; twenty real minutes at the default scale). So
  whether a cast member hungers still depends on whether *something*
  deliberately read it inside that window — narrower after D13–D15, not
  gone. D8's second half (*finish on the game clock*: a body's own wake)
  is **not** built here: it would make the whole cast metabolize
  unwatched, which behavior.md deliberately makes unreachable, and that is
  a change to what the world does unwatched (§ Risks, *stop and ask*).
  Destination: [silent-write-census-slate](../slates/tech-debt/silent-write-census-slate.md),
  as a named finding with D13's table.
  ⚠ Two timed transitions are inside this seam and are named so nobody
  finds them later: **bleed-out onset** (`beginDying` at the blood floor,
  `Vitals.ts` ~l.3570) and **sustained-shock relief** (~l.3419) happen
  only in a reconcile and have no closed-form deadline to book. Today a
  crowd's Scenes drive them and a quiet room does not; after D14 a crowd
  behaves as the quiet room does. The dying window, which does have a
  deadline, is D21.
- **A reconciling read under the sight gate that time can change** (D14's
  second bucket), if the test finds one. Same slate.
- **Sc — Scene render to the place** (10.7% of the crowd): every frame is
  rendered for every sensor. D14 cuts each render's cost; the fan itself
  is untouched. Destination: the
  [crowded-rooms slate](../slates/tech-debt/crowded-rooms-slate.md)'s
  status block, with its share after W4 beside the hundred's record.

**Review at the checkpoint (2026-11-17)** — D10 step 3's unanchored
review, folded in:

- D13: the density consumers are named (`ownEnvelope`, `Buoyant`), not
  "the fit alone"; the count test stages no brains and states that its
  traverse leg depends on D14.
- D14, D16, D17: confirmed. D16 sets the cached insulation before the
  envelope refresh and names the fourth site it leaves; D17's per-place
  memo key is cited and its two stub-async test files are in W5's list.
- D15: the hold flag became an unwrapped static accessor on
  `PerceptionApi` (N14f), for W1's stand-offs as well; the stand-off sits
  after the reentrancy guard; `walk-purity` snapshots every persistent
  field of the body generically.
- D18: the `fitRefusal` rung is no longer pre-named (its cut needs the
  exposure read); the exit states class A's ~25% and that 12% may not be
  reachable by engine fixes.
- D19: the backstop's own tape measure is staged; a login with nowhere to
  stand is refused in words, never swallowed.
- **A missed reader, now D21:** the dying clock had no wake and D14/D15
  would have left a dying player waiting on a deliberate read.
- Bleed-out onset, shock relief and Scene render (Sc) are named as left,
  with destinations. W4's B-check grep and doc list are widened.

### D21 — The dying window ends on the clock

**What the review found.** `expireDying` runs only inside
`reconcileConditions` (`lib/vitals/Vitals.ts` ~l.3549–3559), whose own
comment says *"a body dies on schedule whether or not anyone is
watching"*. It does not: today a dying player in a busy place dies at the
next Scene rendered to them (B2 is the driver), and one alone in a quiet
room at their next read. After D14 and D15 every dying player would wait
on a deliberate read — and `Avatar.signOutHold` (`Avatar.ts` ~l.1733)
holds the body in the world while `isDying()`. That is visible state
depending on who was there, and D14 may not ship without closing it.

**The fix is shipped substrate.** `Vitals` already books a one-shot at
the body's next silent transition — `nextInterestingAt` /
`rescheduleNotify` / `onNotifyFire` (~l.4278–4325; the alarm runs an
ordinary reconcile), gated to a body with a session.

- `nextInterestingAt` also returns each dying record's deadline,
  `tickedAt + (windowSec − elapsed)`, by the same array-method read
  (`lint:condition-arms` stays at its count). A deadline already past is
  returned as *now*, so the alarm fires at once rather than being
  filtered away.
- `beginDying` (~l.1423) calls `rescheduleNotify()`, as `afflict` and
  `relieve` do; so does a stay that lengthens or ends the window.
- **NPCs are untouched** — the gate stands, and a cast member's dying
  resolves when read, as shipped. No recurring timer, no sweep.
- Linkdead is covered: the dying arm does not freeze on linkdead
  (mortality.md), and a linkdead avatar still composes the session mixin.

**The pin** (`lib/vitals/__tests__/Vitals.dying-clock.test.ts`): a dying
player alone in a place; the clock advanced past the window; **nothing
reads the body**; death has arrived and the sign-out hold has cleared.
Its twin: a dying NPC is unchanged by the advance until it is read.


## ⭐⭐ Host placement

No mixin or class is added. For every new field and member:

| what | host | what that claims about everything else on the host |
|---|---|---|
| field filter, memo, `stale`, the collector, the belief kind, (fallback) the paused set | `MqlSubscriptionRegistry` | one singleton; nothing else composes it |
| the paused set (primary) | `SubscriptionRegistry`'s id table | any source's subscription can be paused — true: pause is *close and keep the id* |
| `pauseSubscription` / `resumeSubscription` | `Interactive` | every session holds subscriptions; no guard |
| `touched` | the MQL result types | any resolve *can* report what it read; opt-in, so absent unless asked |
| `placedChanged(item)` | `Placing` | every placing host's `placed` projection changes when its placed set does — true of every host that composes it |
| `placementChanged(was, now)` | `Containable` | every containable has a placement that can change — true; it is where the `placement` field lives |
| `setDueAtS`, `setLoadN` | `MouldMixin` | every mould is a set site. A reusable ingot mould that only freezes never arms a wake (no drain or cure material) — the fields rest at zero, as `setProgress` does today. Not an answer of "no" from most hosts: every composer can hold a setting pool |
| `percolationDueAtS` | `PercolatingMixin` | every percolating solid has liquid work through it over time — the mixin's whole subject |
| `peekTemperature` | `Thermal` | every thermal body has a banked curve |
| `peekBulk` | `Bulkable` | every bulk holder has a banked slot |
| `holdWorldStill` | `PerceptionApi` / `PerceptionLogic` | process-level counter, like the light hold |
| `notifyBelief` | `MqlSubscriptionApi` | beside `notifyDurableSubject` |

**The guard test.** No wave adds a guard that re-narrows a host. The
stand-off line in a reconciler is not a host guard — it asks *is the room
reading*, not *what am I*. If the checkpoint's W4 design wants *if nobody
is watching* on a base member, that is a finding (D10).

## Convention conformance

- **`props:` / `cast:`**, places not rooms, the five namespace axes: no row
  or place is added. The drive stages a hoop with `hand` + `drop`.
- **Module scope declares**: the collector, memo and hold counter are
  instance fields; the loop histogram is created when the route is set up.
- **Import boundary**: nothing in `src/mud/**` gains an outside import;
  `perf_hooks` is imported in `services/Server.ts`.
- **Module categories**: none new. No exported helper: the client observer
  lives in `useCardFeed.ts`, the precheck in `harness/crowd.ts`,
  `WalkWriteError` beside `DetachedError` in the errors module that holds
  it.
- **Verbs on objects**: `interactive.pauseSubscription(id)`;
  `host.placedChanged(item)`. `notifyBelief` takes two strings, as
  `notifyDurableSubject` takes one (`lint:object-verbs`).
- **Api ↔ Logic**: no Api added; the new `PerceptionApi` and
  `MqlSubscriptionApi` statics forward to their logic singletons.
- **Privacy**: registry state is TypeScript `private` (it is a Stuff
  behind the proxy).
- **P3 refuse / skip / throw.** A walk-time write **throws** in a test
  world and is reported elsewhere. The mould's cast is awaited and its
  failure reaches the wake's guarded root; `assertCanRelease` still throws
  `DetachedError` before the pool is touched. A pause or resume for an id
  the session does not hold is a skip. A busy box is a refusal by name.
- **P4 no duck typing.** No `?.()` on an unnamed member. `ContainmentLogic`
  calls `placedChanged` behind `MixinApi.isPlacing`, as it already narrows
  for `canPlace`. The shipped `getCircleScope?.()` cast in `reresolveAll`
  is not widened.
- **P5 the mixin decides.** No controller changes. The mould decides when
  it sets; the client decides only what is on its own screen.
- **P6 persistence.** `setDueAtS`, `setLoadN`, `percolationDueAtS` are
  `runtimeState` fields persisted with the fields beside them, by whatever
  already captures their host; no class newly persists anything. The live
  `ClockHandle` is transient and re-armed by the setter. Paused ids, memos
  and dirt die with the socket.
- **P7 load on use.** No boot entry (`lint:boot-entries` must not move). A
  mould that is not loaded has no wake; its setter re-arms when it loads.
- **P8 names.** `pause` / `resume`; `peek…` for a banked read;
  `holdWorldStill` beside `holdLightSteady`; `placedChanged` /
  `placementChanged` for the two fields they announce; `touched`.
- **Lint gates** (`pnpm -C packages/server lint:family`, per wave):
  `lint:object-verbs`, `lint:lib-statics`, `lint:mixin-clusters` (Mould,
  Percolating, Placing, Containable, Thermal and Bulkable each gain
  members), `lint:module-scope`, `lint:imports`, `lint:duck-typing`,
  `lint:envelope`, `lint:idle-cadence`, `lint:boot-entries`,
  `lint:test-bootstrap`, `lint:controller-decisions`. No ceiling is raised
  without a caller audit; a `lint:mixin-clusters` split is evidence, not a
  number to move.
- **American English.** Shipped `MouldMixin` / `mould.md` keep their
  spelling.

## Waves

Each wave ends at one commit, passes `pnpm test:near`, every touched
pack's own vitest and `lint:family`, and is landable alone. ⛔ `pnpm test`
is not run in any wave.

### W0 — Measure, then re-plan W4 and W5 in place ✅ (record in § Drive record)

No behavior change. *Done 2026-11-17.* `--cpu-prof` is refused in
`NODE_OPTIONS` on Node 22, so `WIRE_CPU_PROF` rides `tsx`'s command line
(`serverArgs()` in `boot.ts`). The record overturned the idle hypotheses:
the leading class is a body read that reconciles the body (B1/B2).

- `services/Server.ts`: `/stats` gains `cpu` and the cumulative `loop`
  (N12).
- `runner/boot.ts`: `WIRE_CPU_PROF=<dir>` passes `--cpu-prof
  --cpu-prof-dir=<dir>` to the spawned server (set after the
  `NODE_OPTIONS` scrub). A profile is written at a clean exit: stop the
  world with SIGTERM as `restartWorld` does.
- `harness/crowd.ts`: the box-load record, the worker-thread sampler,
  `runCrowd(label, opts)` with `size`.
- **Three profiles**, shares only: ten minutes idle; the existing crowd
  run at 30; the last five logins of that run.
- **Three static censuses**: the 30 fire sites × 24 descriptor files and
  `BeliefStore`'s mutators (D2); the 41 unwatched brains; the 16 recurring
  sites.
- **The W0 record**, appended to this plan: class shares; where a
  reference row's time goes (D7); the login's contributors; a baseline row
  for the slate from one quiet-box run of the existing crowd file if the
  box can be had, else marked *not quiet*.
- **The checkpoint (D10):** planner re-invoked on the record, unanchored
  second review, decisions recorded as D13 onward, W4/W5 rewritten below.

**Acceptance.** The plan carries the W0 record and designed W4/W5.
**Commit:** `build(crowded-rooms W0): the instruments, the cost-class
record, W4 and W5 designed`.

### W1 — The room's reading holds the world still; the mould and the heap set by the clock ✅

D8, D9. *Done 2026-11-17.* Build decisions (recorded in the MR too):

- **The hold lives on `ExecutionContextApi`, not `PerceptionApi`** (supersedes
  N7/N14f's placement; same names, same contract). The write chokepoints in
  `api/stuff.ts` and `api/event.ts` sit below `api/perception` in the import
  graph: importing it there was a load-order (TDZ) cycle that failed four
  test files at collection. A hold is a property of the synchronous frame,
  like the call stack; the class is undecorated, so `worldHeldStill` (a
  static accessor) is a free read. `WalkWriteError` is in
  `lib/security/errors.ts` (importable from there; `lib/errors.ts` is not).
  Outside a test world a walk-time write warns once and counts on `/stats`
  (`walkWrites`) — no `DiagnosticApi` (it sits above this module).
- **No `peekTemperature` / `peekBulk`** (P12): inside the hold the shipped
  getters stand off, and `Thermal.getTemperature()` answers its banked curve
  read forward. One mechanism, no second getter.
- **`placedChanged` / `placementChanged` chain to an inner implementation**
  (the `onMoved` shape). The shipped dairy `Hoop` is
  `PlacingMixin(MouldMixin(…))`: without the chain the mould's bank was
  shadowed and a weight set on a hoop never banked.
- **A set completes only in the wake**, which disarms itself first: a
  one-use mould standing nowhere throws `DetachedError` to the clock's root
  with its pool untouched and retries at its next change — never a refire
  loop. A cure's due time is found off its own kinetic (bisection within the
  hour step); a drain's by its rate.
- Percolation treats a reach within 1e-9 of the bottom as through (the
  clock fires within its epsilon).
- Tests: the mould and heap suites move time through
  `_advanceForTesting` (an `advanceTo` helper) so wakes fire, and stand up an
  `EventRegistry` (a host-bound wake listens for its host's destruct).

- `api/perception.ts` + `platform/idea/api/PerceptionLogic.ts`:
  `holdWorldStill` / `isWorldHeldStill` (outside geography's ranges; the
  read becomes the unwrapped `worldHeldStill` accessor — D15, applied
  here if W1 is still open, else in W4's first commit).
  Opened in `VisionModality`'s light walk, the sound gather, the smell
  fold, and the registry's projection.
- The tripwire at the chokepoints named in D9; `WalkWriteError`; the
  `/stats` counter.
- `lib/thermal/Thermal.ts`: `peekTemperature`; `reconcileThermal` stands
  off inside the window. `lib/bulk/Bulkable.ts`: `peekBulk`; the two
  reconcilers' `_peeking` test also admits the window.
  `SmellModality.ts` calls the peeks.
- `lib/spatial/Placing.ts`, `Containable.ts`,
  `platform/idea/api/ContainmentLogic.ts`: N4 — the five sites call the two
  methods.
- `lib/mould/Mould.ts`: D8 in full. `lib/material/Percolating.ts`: the
  due time and wake. `trade-chandlery/src/thing/Hopper.ts`: the override
  and its guard deleted.
- `walk-purity.test.ts` (D9), written first and red. Then every reconciler
  it catches.
- Mould tests: a hoop poured and left sets at its due time with nobody
  reading (advance the injected clock; assert the wheel exists before any
  read); two hoops poured together, one looked at every game minute and
  one never, hold **identical** state and cast at the same game second; a
  weight set on the follower halfway changes the finish time by the
  arithmetic, whether or not anyone looked between; a restart mid-set
  (capture, materialize) re-arms and finishes on time; a wake whose cast
  cannot release throws `DetachedError` to its root, not to the console.
  The same three shapes for a heap.
- B4: grep every caller that drove a set by reading —
  `grep -rn "getContents()\|setState()" packages/content/trade-{dairying,
  sugar,ceramics,potash,chandlery} packages/server/src/mud/lib/mould` —
  tests advance the clock instead; the dairy, sugar, ceramics and potash
  wire files that take a cast out after a clock jump need no change if the
  wake fired, and are read to confirm it.
- `docs/subsystems/mould.md`, `potash.md`, `perception.md`: what drives a
  set; the window; what a peek is.

**Acceptance.** `walk-purity` green; the mould, dairying, sugar, ceramics,
potash and chandlery suites green; `pnpm wire crowd.dirty` runs with the
tripwire armed and throws nothing. **Commit:** `fix(perception): the
room's reading holds the world still; a mould sets by the clock, not by
who looked`.

### W2 — Exact dispatch ✅

D1, D2. *Done 2026-11-17; committed WITH W1 as one commit* — the two
waves' edits interleave in `MqlSubscriptionRegistry.ts` and
`api/mql-subscription.ts` (the projection hold and the fire tripwire are
W1's; the collector and the dispatch W2's), so neither half compiles alone.
Build decisions:

- **`touched`** lives in `api/mql/scope-walk.ts` as a record that exists
  only inside a tracked resolve (`trackTouched` / `noteTouched`, sealed-subdir
  pipeline internals); `MqlLogic.resolveMany` attaches it when
  `ctx.trackTouched`. It records each candidate, the candidate's holder, every
  holder enumerated, and the children `:i` / `:I` return. `MqlApi` gains
  nothing.
- **Nested rows** report through `MqlSubscriptionApi.collectProjections`
  (an `@internal` static the registry wraps its projection in;
  `projectFields` reports each row). A descriptor's OWN resolve reports what
  it read with `noteRead(stuffs, fields)`: `Container.contents` names the
  membership fields (`placement`, `container`), which install as raw field
  filters, not through descriptor names. Without that a cup taken off a desk
  onto the floor never woke the room (the matrix found it).
- **`Placing.placed` depends on `placed`** — the host's own announcement
  (N4); it was missing and the desk's card never woke.
- **`BeliefStore` pokes in `know` / `forget` / `forgetField`** (every
  mutator goes through them), resolving the referent by
  `findByIdentityPath` (a person) or `findById` (a thing) —
  `findByTemplatePath` misses a player, whose lineage and identity differ.
- `focusDependent` / `locationDependent` are accepted and inert; their two
  tests now pin that the holder entry subsumes them.
- The wake matrix found two over-wakes on the way (a child's any-field
  read; `contents` in the membership filter) — both narrowed.

- `api/mql/types.ts`, `resolver.ts`, `predicates.ts`, `scope-walk.ts`:
  `touched`, behind `MqlContext.trackTouched`.
- `MqlSubscriptionRegistry.ts`: the collector; field-filtered `target`
  entries; the holder and subject entries; the belief kind and
  `notifyBelief`; the name-only entries removed.
- `api/mql-subscription.ts` + `MqlSubscriptionLogic.ts`: `projectFields`
  reports to the collector (a no-op outside one); `notifyBelief`.
- `lib/belief/BeliefStore.ts`: the pokes. `lib/stuff/Stuff.ts`:
  `occupants` on `displayName`. Other fire-site fixes per the census.
- ⭐ **The wake matrix** —
  `api/__tests__/mql-subscription.wake-matrix.test.ts`: for every field in
  `REF_FIELDS` and `DETAIL_FIELDS`, a scripted mutation (a) wakes a
  subject-bound subscription on the thing, (b) wakes one on its container
  when the container's projection shows it, (c) does not wake one on an
  unrelated thing in the same place, (d) does not wake one in another
  place. Plus: an item moved from a desk to the floor and back wakes the
  room's card and the desk's both ways; a newcomer wakes a `reachable:…`
  subscription that declared no flag; viewer A introduced to X re-projects
  X's row for A and marks nothing dirty for B. A field with no mutation
  site is listed by name as a residual, so a new field without a row
  fails.
- `docs/subsystems/mql-subscription.md`: the dispatch-policy and
  holder-flags sections rewritten to the contract.

**Acceptance.** The `mql-subscription.*` and `card-*` test families,
`Application.mql-subscribe.test.ts`, the sandbox subscription escape test
and the MQL suites green; the matrix green; a count shows one body walking
into a staged room of thirty marks dirty the thirty room-bound
subscriptions and none of thirty bound to a barrel there. **Commit:**
`refactor(mql-subscription): a dependency is the Stuff that was read; the
coarse dispatch policy is retired`.

### W3 — Row-level dirt, and a cheap row ✅

*Done 2026-11-17, after W4 rung 1* (the row's cost is D14's). The memo is
per subscription (`RowMemo`: rows by `stuffId|fields`, `stale` ids, an
`invalid` flag); `ProjectionCollector` (enter / leave / read) replaces the
plain collector so `projectFields` can return a memoized nested row. A
fire names its target; a fire on the holder or a ledger poke drops the
memo. Tests: one arrival into thirty computes 1 child row (31 with the
memo disabled), a rename 1, a departure 0. ⚠ The row bench (D7, < 1 ms) is
taken from the re-profile rather than a unit bench.

D3, D7. `MqlSubscriptionRegistry.ts` (memo, `stale`, memo-aware
projection, reconciled index maintenance); the row cost W0 named, in its
owner.

Tests: thirty subscriptions on a staged room of thirty — one arrival costs
each exactly one row projection plus its membership read; a rename
re-projects one row per subscription; a row that left is dropped from the
memo; the wake matrix still green; the row bench under 1 ms; no single
`reresolveAndEmit` in the arrival case exceeds the drain slice by more
than one row. `mql-subscription.md § A crowd makes a card lag` rewritten.

**Commit:** `perf(mql-subscription): a re-resolve re-projects only what
changed`.

### W4 — The idle world — rung 1 ✅ (D13, D14, D15, D17, D21)

*Rung 2 done 2026-11-17.* The re-profile after rung 1 (busy box, load
1.3 → 27): idle 0.62 cores (0.81 at W0), profile busy 57.5% (63.8%), 414
loop stalls over 100 ms, `walkWrites` 0. The new leader (~25%) is class A
reading ITSELF — an NPC's `get` runs the reach validator → carry capacity →
the condition band → a conditions and thermoregulation reconcile — which
D13's table classes as the body's own act (legitimate). So rung 2 is D18's
in-the-integration cuts: **D16** (`_reconcileClo`, the worn clo read once
per reconcile; `bodyInsulation` was 17.4%) and the pre-named **sub-step
guard** on `reconcileThermalRegulation` (below `REG_STEP_SEC` do nothing
and do not re-stamp — the metabolism shape), with one exemption found by
the thermal suite: a pending heat load integrates at once (a fireball's
heat shows on the next read). The idle step under 12% is measured by the
quiet-box run (W6); if it is not reached, D18's owner levers apply.

*Rung 1 done 2026-11-17, ahead of W3* (build decision: W3's row cost (D7)
is class B2, which is D14 — the memo is measured on cheap rows, so the body
fixes go first). D13 `getBodyDensity` reads `reserves['flesh']` raw; D14
`hasCausticAtHead` reads `this.conditions`; D15 the three body reconcilers
stand off inside the hold (after their reentrancy guards), and
`walk-purity` stages a wounded body snapshotted over every persistent field
generically; D21 the dying deadline joins `nextInterestingAt` (`afflict`
already re-books, so `beginDying` needed no line); D17 the roster row is
synchronous and the snapshot, the `add` fan and `who` compose under one
held light, sending after. Tests: `lib/creature/__tests__/
crowded-rooms.body-reads.test.ts` (D13 proven to fail on the old read).
⚠ D17's dedicated walk-count test was not written (a presence snapshot
needs connected avatars); the re-profile is its evidence. D16 waits on the
re-profile, as designed.

D13, D14, D15, D16, D18, D21. Starts after W1 (it uses the hold and
extends `walk-purity`). Each test below is written first and red.

**Commit 1 — bodies stop being reconciled by bystanders.**

- `lib/creature/Creature.ts`: `getBodyDensity()` reads
  `this.reserves['flesh']` raw; its doc says why, citing
  `withBodyComposition` (D13).
- `lib/creature/Actor.ts`: `hasCausticAtHead()` reads `this.conditions`;
  its doc carries D14's exactness argument (`agentActive` moves only at
  `onset` and `resolve`).
- `api/perception.ts`, `platform/idea/api/PerceptionLogic.ts`: the
  `worldHeldStill` accessor over `static #stillWalks`; `wouldWrite`'s
  early return; `isWorldHeldStill()` deleted and W1's stand-offs in
  `Thermal`, `Bulkable`, `Mould` and `Percolating` moved to the accessor
  (D15). `api/__tests__/perception.hold.test.ts`.
- `lib/metabolism/Metabolic.ts`, `lib/vitals/Vitals.ts`,
  `lib/thermal/ThermalRegulation.ts`: the stand-off line after the
  reentrancy guard in `reconcileMetabolism`, `reconcileConditions` and
  `reconcileThermalRegulation` (D15).
- `lib/vitals/Vitals.ts`: the dying deadline in `nextInterestingAt`;
  `beginDying` re-books (D21). `Vitals.dying-clock.test.ts`.
- Tests: `lib/creature/__tests__/Creature.size-read.test.ts` (D13's
  count), `lib/creature/__tests__/Actor.sight-gate.test.ts` (D14's count
  and exactness); `lib/perception/__tests__/walk-purity.test.ts` gains the
  body (D15). One more, for D15's owner's-eye note: a winded player alone
  in a place, the clock advanced past recovery, one act — the breath line
  arrives (`lib/exertion/__tests__`, beside the shipped cue tests).
- B-check: every test that drove a body by an incidental read —
  `grep -rn "getVolumeM3()\|getDimensions()\|getFitBox()\|describeFor(" `
  over `lib/{metabolism,vitals,thermal,exertion,creature,mortality,combat,encumbrance,respiration,electricity}/__tests__`,
  `platform/idea/api/__tests__` (the Condition and Combat files), the
  trade packs' tests that starve, chill or wound a body, and the wire
  drives that wait on hunger, a bleed-out or a chill — reads the body
  deliberately (`getReserve`, `getConditions`) or acts instead.
- Docs: `metabolism.md` and `vitals.md` (what brings a body to now —
  D13's table; what does not), `size.md` (a body's size reads its banked
  flesh), `behavior.md § NPC hunger` (the structural claim holds again,
  and what broke it), `perception.md` (the sight gate reads conditions as
  they stand; bodies inside the window; the flag's cheap read),
  `mortality.md` (when death arrives: a player's on the clock, a cast
  member's when read), `underwater.md` (buoyancy reads banked flesh).

**Then measure** (D18.1): ten idle minutes under `WIRE_CPU_PROF`; the
**W4 record** appended under the W0 record.

**Commit 2, if D16's condition holds** — `ThermalRegulation.ts`: the
per-reconcile insulation; `ThermalRegulation.insulation.test.ts`;
`thermal.md`.

**Further commits** per D18.3, one per class, each with its count test and
its row in the W4 record. `behavior.md § Cost` gets the measured cost per
beat at the end, from the last profile.

**Held throughout:** `lint:idle-cadence` unmoved; no content row, brain,
cadence or beat dial edited; no `recurring` site touched; `pnpm wire
crowd.dirty` green after every commit (the greeting count is the shipped
half of D27, and the greeters' sight gate is exactly what D14 changes);
`lint:mixin-clusters` unmoved (no mixin gains a public member).

**Acceptance.** The count tests green (size read, sight gate, the hold
flag, the dying clock); `walk-purity` green with a body in it; the thermal, vitals, metabolism, exertion, respiration,
mortality and husbandry suites green; then D18.4 — a quiet-box idle step
under 12%, **or** the W4 record showing every remaining class is under
2%, class A or class P, with the idle criterion named as outstanding in
the MR for the owner (D18). The quiet run itself is W6's; W4 ends on the
shares.

**Commits:** `fix(creature): a body's size and a sight gate read the body
as it stands` · `perf(thermal): one insulation read per reconcile` ·
`perf(<owner>): <class>`.

### W5 — Login into a crowd, and back after a restart — ✅ (by D13/D14/D17; proven by drive step 10)

*2026-11-17.* The login's two leading costs (B3, the roster's unheld light
walks; B1/B2 under the arrival) are fixed by W4 rung 1. ⚠ D19's unit test
(`PersistableLogic.crowd-restore.test.ts`) was not written; the restart is
proven end to end by the timing drive's step 10 (thirty log back in and
each reads the place they quit, per player), and the login profile is taken
from the quiet-box run.

D17, D19. After W3 (the row) and W4 (D13, D14).

- `platform/idea/api/ProfileLogic.ts`, `lib/social/NotifyPolicy.ts`:
  `composeRow` / `composeRosterRow` return `RosterRow`.
  `platform/idea/api/PresenceLogic.ts`: `snapshotForImpl` and `fanImpl`
  compose under one light hold, then send.
  `platform/idea/cmd/social/WhoController.ts`: a `map` under a hold.
  `platform/idea/api/__tests__/ProfileLogic.test.ts` (~l.46) and
  `platform/idea/cmd/social/__tests__/WhoController.test.ts` (~l.80, ~l.95)
  stub async rows and follow the signature.
- `platform/idea/api/__tests__/PresenceLogic.roster.test.ts` (D17's
  count: one light walk per place per snapshot; one per fan).
- `platform/idea/api/__tests__/PersistableLogic.crowd-restore.test.ts`
  (D19: thirty restored concurrently into one live place; the refused
  restore). `PersistableLogic.ts` changes **only** if that test shows the
  unguarded `move` failing a login, and then by its own backstop.
- **Then measure:** the last five logins of a crowd run under
  `WIRE_CPU_PROF`; the **W5 record** under the W4 record — the login's
  contributors after D13/D14/D17, and every synchronous unit over 100 ms
  by name. Each is fixed in its owner (D19), with a count test.
- Docs: `social-graph.md` (the roster is composed in one frame),
  `connection.md` (login into a crowd; what a restart restores and the
  backstop).

**Acceptance.** The roster count green; the crowd-restore test green; a
profile of one login into thirty shows no synchronous unit over 100 ms;
`pnpm wire crowd.dirty` green. That thirty stand where they quit after a
real restart, and the 2 s p95, are drive step 10's (W6).

**Commit:** `perf(connection): logging in to a crowd; the roster is one
frame`.

### W6 — The drive's harness, the docs, and a first quiet run — harness ✅

*2026-11-17.* `runCrowd(label, { size, during })` (the `during` hook runs
steps 6–9 with the crowd standing and the freeze sampler on),
`foreignMeter` (box busy less server and harness), `quietBoxRefusal` (the
precheck), `Session.pauseSubscription` / `resumeSubscription`, and
`tests/crowd-timing.dirty.wire.test.ts` (steps 1–11, skipped by name
without `WIRE_QUIET=1`). `restartWorld` is the private copy (navigation-
server's lift has not merged). The procedure is in testing.md § The quiet
box. The quiet run itself is in the Drive record.

D11, D12 — everything but the hidden card.

- `harness/crowd.ts`: the on-screen card phase (step 6), the mould phase
  (8), the leave (9), the five logins into the square, the precheck and
  foreign-CPU record.
- `packages/wire/tests/crowd-timing.dirty.wire.test.ts`: steps 1–6 and
  8–11 as ordered tests, `packs: ['platform', 'terminus',
  'trade-dairying']`. `restartWorld()` from the harness if
  navigation-server's lift has merged, else the private copy the four
  shipped files carry.
- B2: every timing checkpoint is made to fail once on purpose (a bound of
  0 ms; a `look` at the hoop with the tripwire disarmed and the override
  restored locally) before its green is believed.
- Docs: `docs/testing.md` (the quiet-box procedure, `WIRE_QUIET`,
  `WIRE_CPU_PROF`, the tripwire), `connection.md` and `messaging.md` where
  W4/W5 changed them. Index files are left to the sweep.
- One quiet-box run of steps 1–6 and 8–11, recorded.

**Commit:** `build(crowded-rooms W6): the timing drive and its record`.

### W7 — A card you cannot see pauses (last) — ✅ (D5 FALLBACK)

*2026-11-17.* Navigation-server's D1 was not on master, so the fallback:
`mql-subscription-pause` / `-resume` on the current transport; the paused
flag on the registry's `SubscriptionState` (a cancel forgets it); resume
answers one `mql-subscription-result`; `CardRegistry.rebind` re-applies a
pause after its cancel-and-reopen; the session verbs on `Interactive`
(gated `MqlSubCallers`, as `handleUnsubscribe`). Client: `useCardShown` in
`useCardFeed.ts` (one hook per card body, 500 ms debounced pause, immediate
resume, the document's visibility) and the result handler. build-2 was told
by message and will port at whichever merge is second. ⚠ The
rebind-while-paused path has no unit test (the drive's step 7 crosses it
only if the watcher rebinds); the e2e walk is `e2e/tests/crowded-rooms-
walk.spec.ts`.

D4, D5. Starts with D5's check; primary path unless D1 is not on master.

- `packages/types`: the two messages.
- Server: `Interactive.pauseSubscription` / `resumeSubscription`; the
  paused set and its behaviors on the registry D5 selects; the inbound
  handlers and their registration; `CardRegistry.close` forgets the pause,
  `rebind` keeps it.
- Client: `services/websocket.ts`; `useCardFeed.ts` (the observer, the
  debounce, the result handler for a card id); `CardArea.tsx` / `Card.tsx`
  only to hand the observer each card's body element. On reconnect every
  card starts shown; nothing is replayed.
- Harness: `Session.pauseSubscription` / `resumeSubscription`; drive
  step 7 added to `crowd-timing`.
- `packages/content/platform/content/platform/cmd/shell/client-card.yaml`:
  the help sentence.
- `e2e/tests/crowded-rooms-walk.spec.ts` (B3): a browser in the square
  with the room card; scroll it away and minimize it while a second player
  walks in and out; restore; the card is current.
- Tests: a paused subscription has no index entries, never enters the
  dirty set and emits nothing across fifty mutations of its subject;
  resume emits exactly one result equal to a fresh resolve, at `rev` 0 on
  the primary path; a rebind while paused stays paused; a close forgets;
  an unknown id is a skip. Client: the observer pauses a card scrolled
  out, a minimized one and one behind a `full` card, resumes each at once,
  and applies the snapshot.
- `docs/subsystems/card-surface.md`: shown vs live.
- If on the fallback: the message to build-2.
- **The full blocking drive on a quiet box**, all eleven steps, into the
  Drive record and the slate's status block. Then `tools/suite` (the one
  full run) alongside the MR.

**Commit:** `feat(card-surface): a card nobody can see pauses and catches
up when shown`.

## Reachability wiring

No new verb. The capabilities and their five links:

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a mould sets on the clock | none — the pour starts it | n/a | `setDueAtS` persisted | ⚠ the wake exists only while the mould is loaded: the **setter** must re-arm on materialize, and a past due time must fire — the restart test proves it | n/a |
| a load change banks | shipped `put` / `get` / `turn` | shipped | `setLoadN` | ⚠ all five `ContainmentLogic` sites must call both methods; a missed site is a silent mis-set — the matrix's desk test and the mould's weight test cover two, a grep for `_setPlacement(` covers the rest | n/a |
| exact wake | none | n/a | `target` entries | the collector must be active in **both** `handleSubscribe` and `reresolveAndEmit`, and `trackTouched` set on **both** the query resolve and descriptor resolves, or the first resolve installs nothing — the matrix subscribes fresh for every row | n/a |
| belief re-projects a row | shipped `introduce` etc. | shipped | the belief kind | every `BeliefStore` mutator must poke; the census lists them | n/a |
| a card pauses and resumes | none — a protocol message | the client's observer; ⚠ silent if never attached to a card body — the e2e walk is the proof | the two types; the paused set | the handlers **registered** in `backend/inbound/index.ts` (an unregistered type is dropped without a word — the unit test sends through `Application.processUserMessage`) | `subscriptionId` a string the session holds; else skip |
| the tripwire | none | n/a | the hold counter | armed only where `isTestEnvironment()` — a wire world must report true (`SAXONBERG_TEST_WORLD`, set in `boot.ts`) | n/a |
| the timing gate | `WIRE_QUIET=1 pnpm wire crowd-timing` | the procedure in `docs/testing.md` | `.wire/crowd-*.json` | skipped by name without the env | the precheck |

## Acceptance-criteria coverage

| acceptance criterion | waves | proved by |
|---|---|---|
| `say hello` under 250 ms p95 at thirty | W2, W3, W4 | drive steps 3–4 |
| no freeze over 100 ms across arrival, talk, leaving | W1, W2, W3, W5 | step 5 |
| login under 2 s p95 | W3, W5 | steps 2, 10, the five into the square |
| an on-screen card shows a change within 2 s | W2, W3 | step 6 |
| a hidden card receives nothing, and is current within 2 s of being shown | W7 | step 7; the e2e walk |
| idle world under 15% of a core over ten minutes | W4 | step 1 |
| a mould looked at and into in empty-room time; nothing the room reads for everyone writes; a mould left alone sets on time whether or not anyone looks | W1 | step 8; `walk-purity`; the two-hoops test; the tripwire armed in every wire world |
| each arriver greeted once by each greeter; an NPC walking in greets nobody | every wave; W4 at risk | `crowd.dirty` per wave; step 2 |
| after a restart thirty log in under 2 s p95 and stand where they quit | W5 | step 10 |
| the one-hundred record exists with the load beside it | W6, W7 | step 11; Drive record; the slate |

Nothing is unmapped.

## Test & gate strategy

**Unit**: `walk-purity`; the mould's and heap's clock tests (arithmetic —
a set's outcome is proved here, on the injected clock, never in the
drive); the wake matrix; dirty counts; memo reuse and eviction; the row
bench; pause / resume / rebind / close; the per-class beat tests the
checkpoint designs. Anything touching the wired runtime imports
`test-bootstrap`.

**Only the drive can prove:** every timing number, the freeze bound, the
idle share, the restart, and that a real client reports what is on screen.

**The blocking drive** — `crowd-timing.dirty.wire.test.ts`, quiet box,
fresh database:

| step | pace | kind | how it is staged |
|---|---|---|---|
| 1 the idle world | `short` (ten wall minutes) | `staged` | two `/stats` reads ten minutes apart, before anyone logs in |
| 2 thirty arrive | `instant` | `player` | `Session.open` at the avenue block, `go southwest` |
| 3 one person speaks | `instant` | `player` | — |
| 4 in turn, then all at once | `instant` | `player` | — |
| 5 no freeze | `instant` | `staged` | the worker-thread `/healthz` sampler across 2–4 and 6–9 |
| 6 a card you can see | `instant` | `player` | `look` leaves the `here` card live; another walks in; the delta is timed |
| 7 a card you cannot see | `instant` | `player` | `client-card minimize`, the harness says pause as a client does; five walk in and out; `client-card restore` + resume; zero envelopes for that id in between, one snapshot within 2 s |
| 8 a mould in the crowd | `instant` | `player` (the hoop is staged) | `hand(session, '/trade/dairying/thing/hoop', …curd…)`, `drop`; ten `look` and `look in` |
| 9 thirty leave | `instant` | `player` | walk back, `session.close()` |
| 10 a restart | `short` | `staged` | SIGTERM + owned boot; thirty `Session.open` on the same handles |
| 11 one hundred | `instant` | `player`, reported | `runCrowd('hundred', { size: 100 })` inside the recording `try` |

There is **no span step**, so no staged twin is owed. Step 8 asserts the
cost of the look, not that the cheese set; that the cheese sets on time
unwatched is the unit test's.

**The soak drive:** none new; `crowd.soak` stays the post-merge watch and
is updated in the same commit if `runCrowd`'s record shape changes.

**Gates:** per wave, `pnpm test:near`, touched packs' vitest,
`lint:family`; `pnpm lint` for the client in W7. ⛔ The full suite runs at
code-complete (through `tools/suite`, never bare, never in the background)
and at `/finalize`, and a green run stands until a source file changes.

## Risks & opens

- **The tripwire is a census that runs late.** It throws in every test
  world, but the full suite runs only at code-complete, so a walk-time
  write in a subsystem no wave's `test:near` reaches surfaces then. Each
  is one stand-off line. If there are many, they are fixed as a class in
  one commit, not waived.
- **A stale card nobody notices** is W2/W3's failure mode. The wake matrix
  is exhaustive over the two field sets and fails on an unlisted field.
  No periodic refresh is added to paper over a missed fire.
- **`touched` costs a set add per candidate** on subscription resolves
  only. If the W3 bench shows it matters, the resolver records containers
  enumerated and lets candidates ride their container's entry.
- **The mould's step constant** trades accuracy for wakes: one wake per
  setting mould per game hour while it sets. A cellar of two hundred hoops
  is two hundred wakes an hour, each a handful of arithmetic; W4's idle
  profile will show it if it is wrong.
- **W4 and W5 are designed mid-build.** The checkpoint's second review is
  the control. If the idle cost is content's own authored work, the 15%
  target is the owner's to trade against content's rates.
- **The quiet box is not the build agent's to take.** It can lock out
  suites and refuse to run; it cannot stop a sibling's world.
- **Merge order with navigation-server.** Either order works (D5).
- **`--cpu-prof` through `tsx`** needs a clean exit. If it does not write,
  take the profile as controllers-are-io did
  (`git show 2fa4b0e72:docs/plans/controllers-are-io-plan.md`,
  l.2372–2377); do not add a profiling route.
- **Stop and ask:** any fix that would change what a brain does unwatched;
  any new event class; any second source for *shown*; any reconciler whose
  as-banked answer inside the window would be visibly wrong to a player.

## Deferred seams

- **The first projection is one unit of N rows.** Destination: the
  crowded-rooms slate's status block, with the hundred's record.
- **Pausing the shelf, a forum board, the map copy.** The protocol pauses
  any subscription; this build wires cards. Destination:
  `docs/slates/engine/mql-subscription-slate.md`.
- **Light as a wake**, and the two unused holder flags in the wire type.
  Same slate.
- **Reconcile-on-read sites the room's walks do not reach** — do any of
  them make a thing's state depend on who looked? Destination:
  `docs/slates/tech-debt/silent-write-census-slate.md`.
- **The call-security / proxy tax** (~60% of self time, W0 record class
  P). Destination:
  [call-security-performance-slate](../slates/tech-debt/call-security-performance-slate.md);
  the W0 and W4 records are appended to it at the W4 commit (D20).
- **A body has no clock of its own**, so an unowned body's metabolism
  still depends on being deliberately read inside four game hours (D20).
  Destination: `docs/slates/tech-debt/silent-write-census-slate.md`.
- **Room capacity** and **the soak lane's clock**: routed by the
  requirements.

## Critical files

1. `docs/requirements/crowded-rooms-requirements.md`.
2. `packages/server/src/mud/platform/idea/MqlSubscriptionRegistry.ts`.
3. `packages/server/src/mud/api/mql-subscription.ts`;
   `api/mql/types.ts`, `resolver.ts`, `predicates.ts`.
4. `docs/subsystems/mql-subscription.md` — § Holder-level dependency
   flags, § Meta-bus dependency index, § Conservative-coarse dispatch
   policy, § A crowd makes a card lag.
5. `lib/spatial/Container.ts` ~l.930–1070; `Placing.ts` ~l.280–330;
   `platform/idea/api/ContainmentLogic.ts` ~l.155–170, ~l.370–425,
   ~l.565–625.
6. `lib/mould/Mould.ts` ~l.205–240, ~l.530–800;
   `lib/material/Percolating.ts`; `lib/craft/Comminuting.ts` ~l.425–460;
   `platform/thing/ScrewPress.ts`;
   `packages/content/trade-chandlery/src/thing/Hopper.ts`;
   `packages/content/trade-potash/src/thing/IronPot.ts`.
7. `lib/thermal/Thermal.ts` ~l.750–775, ~l.1100, ~l.1166–1300;
   `lib/bulk/Bulkable.ts` ~l.715–745, ~l.1205–1305, ~l.1495;
   `platform/idea/modalities/SmellModality.ts`, `VisionModality.ts`,
   `SoundModality.ts`; `api/perception.ts` ~l.210–230.
8. `lib/belief/BeliefStore.ts` ~l.755–890.
9. `platform/idea/CardRegistry.ts` ~l.1195–1340.
10. `lib/behavior/Behaved.ts` ~l.440–680; `lib/message/Scene.ts`
    ~l.255–400; `docs/subsystems/behavior.md` § The deliberation beat.
11. `packages/wire/src/harness/crowd.ts`; `runner/boot.ts`;
    `tests/crowd.dirty.wire.test.ts`; `services/Server.ts` ~l.160–190.
12. `packages/client/src/components/cards/useCardFeed.ts`, `CardArea.tsx`;
    `services/websocket.ts` ~l.790–860.
13. `git show origin/build/navigation-server:docs/plans/navigation-server-plan.md`
    — § D1, § W1.
14. `docs/review-questions.md` (the B questions); `docs/testing.md`
    § Attach or own, § Test the WAKE.

## Drive record

### W0 record (2026-11-17) — shares, not times

One profiled world (`WIRE_CPU_PROF`, build-1, port 2014), sliced by the
server's own uptime (`CrowdRecord.marks`). ⚠ **Busy box** (siblings' worlds
and suites; 1-minute load 3.6 → 15.5 across the idle window, ~11 in the
crowd), so every time below is an upper bound and only the **shares** are
evidence (D12).

| window | wall | server CPU | `/stats.loop` over 100 ms | profile busy |
|---|---|---|---|---|
| idle, nobody logged in (uptime 171–771 s) | 600 s | **0.81 core** | 353 (max 7.6 s) | 63.8% of a core |
| crowd of 30 (logins → speech, 830–1204 s) | 374 s | 1.26 cores (walk/speech phase) | 27 in-phase (max 10 s) | 99.2% |
| the last five logins (990–1018 s) | 28 s | — | — | 89.5% |

Crowd record (busy box): login p50 4.9 s / p95 14.9 s; arrival walk p95
10.0 s; `say` alone p50 517 ms / p95 2.7 s; in turn p95 656 ms; all at once
p95 5.0 s; greetings 1 per greeter per arriver, 0 in quiet (D27 holds).

**Cost classes, by inclusive share** (proxy/security frames filtered; shares
overlap, since one stack can sit under several):

| class | idle | crowd | login | where |
|---|---|---|---|---|
| **B1 a body's size read reconciles the body** — `crossExit` / `move` → `Container.fitRefusal` → `Shaped.getDimensions` → `Creature.getVolumeM3` → `getBodyDensity` → `Metabolic.getReserve` → `reconcileMetabolism` → `thermalMultiplier` → `ThermalRegulation.reconcileThermalRegulation` → `Attired.bodyInsulation` → `Wearable.getClo` | ~22% | ~24% | ~21% | `lib/creature/Creature.ts`, `lib/metabolism/Metabolic.ts` |
| **B2 a sight gate reconciles the viewer** — `describeFor` → `canSeeGate` → `VisionModality.perceivedBand` → `Actor.perceivedBandModifier` → `hasCausticAtHead` → `Vitals.getConditions` → `reconcileConditions` (→ thermoregulation, `noticeGripLost`) | ~10% | ~20% | (in `describeFor` 44%) | `lib/creature/Actor.ts`, `lib/vitals/Vitals.ts` |
| **B3 an unheld light walk per described row** — `ProfileLogic.composeRow` (the roster) → `describeFor` → `walkLight` | — | — | **25% / 27%** | `lib/social/NotifyPolicy.ts`, `ProfileLogic.ts` |
| **S subscription re-resolve** (W2/W3's) | — | 13.8% | — | `MqlSubscriptionRegistry.reresolveAndEmit` |
| **M the mould's read-driven set** (W1's) | 2.9% | — | — | `Mould.getContents` |
| **Sc Scene render** to the place | — | 10.7% | — | `Scene.#dispatch` |
| **A NPC acts** — `GetController` 12.8%, `LookController.lookAtLocation` 4.6%, `EmploymentLogic` roster tick 2.7%, `_deliberate` 2.5% | ~25% | ~12% | — | the brains' `act`s, through real dispatch |
| **P the call-security / proxy tax** — `findDescriptor`, proxy `get`, policy resolution, `_pushFrame` | **~60% of SELF time** in every window | | | `api/proxy.ts`, `api/security.ts` |

What this says:

1. **The hypotheses were the wrong shape.** I1 (`urgency()`) is 2.5%; I3
   (unwatched Scenes) and I4 (recurring ticks) are small. The dominant
   class is **the read that writes, on BODIES**: B1 and B2 are the same
   defect as the mould's — a read (a size, a sight gate) that integrates a
   body's metabolism and thermoregulation to now. They run under every
   move, every crossing and every `describeFor`, for players and NPCs alike,
   so they dominate idle (NPCs on errands), crowd and login together.
2. **Subscriptions are 14% of a crowd**, not the whole of it. W2/W3 stand.
3. **The proxy tax is the floor under everything**: the same work costs
   several times its own body in `findDescriptor` / policy resolution. It
   is not this build's to fix (a security-layer build) and is recorded as
   a deferred seam with these numbers.

**The static censuses** (2026-11-17, read-only):

- **Fire sites × descriptors.** 29 fire sites, all kernel; 23 descriptor
  tables, none in packs. Fields nothing fires: `borneBurden`,
  `carryCapacity`, `loadRatio`, `exits`, `bodyState`, `brand`/`corpo`, every
  Party field but `name`. `BeliefStore` fires nothing from any mutator
  (`know` ~l.568, `forget` ~l.679, `forgetField` ~l.686, `loadBelief`
  ~l.712, `clearBeliefs` ~l.716, `evictAndFlushBeliefs` ~l.737,
  `learnIdentityOf` ~l.761, `adjustRegard` ~l.823, `setRegard` ~l.863,
  `clearRegard` ~l.876). Descriptors reading other Stuff unprojected:
  `displayName` (belief, light, mask, carry tier), `longDescription` (the
  augmenters), `borneBurden`/`loadRatio` (every carried item), `exits`.
  Light is never a dependency.
- **Unwatched brains.** 43 declare `presenceGated = false`; ~20 have a
  heavy `urgency()` (room-content walks; registry lookups or awaits in
  restocks, eats, relines, stocks, consigns); ~20 return a constant
  `wanted`, so their `act` runs every 120 s beat (hauls queries Mongo per
  board; maintains walks all holdings; reads-air sends a Scene each beat).
- **Standing ticks.** 18 `ScheduleApi.recurring` + ~11 game-clock
  `every`/`cron`. Iterate-everything with no population early-out:
  `ResidencyLogic` eviction sweep (60 s, every object), `Producer` /
  `Consumer` / `Renown` recomputes (60 s, a full-collection `find({})`
  each), `WatchWarden` (30 s), `AttendantLogic` (15 s), the hourly
  `EmploymentLogic` and `ResidencyLogic` game-clock ticks, `ReactionRegistry`
  (5 Hz, never disarmed), the `fire:tick` heartbeat (2.5 s). None
  shows above ~3% in the idle profile.

**The checkpoint's decisions are D13–D21** (§ Plan-level decisions): D13
B1 · D14 B2 · D15 bodies inside the window · D16 the insulation read ·
D17 B3 · D18 W4's ladder and acceptance · D19 login and the restart · D20
what is added, what is left (class P → the call-security performance
slate) and the review's findings · D21 the dying window ends on the
clock. W4 and W5 below § Waves are rewritten from them. The W4 and W5
records are appended here as those waves measure.

### The first quiet-box run (2026-11-17, all waves landed)

`WIRE_QUIET=1 WIRE_BOOT=1 pnpm wire crowd-timing` under the suite lock,
siblings asked to hold (all four agreed), fresh database. The precheck
passed: 1-minute load 0.93 at start. (A first attempt never ran a step: a
cold boot on a reset database overran the 420 s budget; re-run with
`WIRE_BOOT_TIMEOUT=900000`.)

| step | result | gate |
|---|---|---|
| 1 idle, nobody logged in | **0.170 cores** over ten minutes (foreign 0.24) | < 0.15 — ✗ by 0.02 |
| 2–9 thirty, the cards, the mould | stopped at step 6: no `mql-subscription-delta` for the watcher's `here` card within 2 s of an arrival (nothing captured at all) — under investigation | — |
| 10 restart | not meaningful (step 6 threw before the places were recorded) | — |
| 11 one hundred (reported) | logins p50 2.1 s / p95 3.8 s; `say` alone p50 189 / p95 260 ms; all at once p95 15 s; `/healthz` 142 of 356 samples over 100 ms (max 8.7 s); server 0.92 cores; load 0.93 → 1.38; foreign 0.21 | — |

Idle against W0's 0.81 (busy box): the empty world is ~4.8× cheaper.

**Step 6, isolated afterwards** (a kept world, two sessions, nobody else
in the square): the watcher's `here` card DID receive its delta for the
arrival. So the wake is right and the miss is **latency at thirty**: one
arrival dirties all thirty-one room cards, each recomputes the room's own
row (its stale `contents` re-runs the membership resolve and the
perception filter over ~31 occupants, plus `longDescription`'s augmenters;
the child rows are memo hits), and the time-sliced drain (20 ms slices,
resting 2× what it ran) delivers the last card past 2 s. Not yet measured
by a profile; this is the reading of the code and the probe. The levers
are named for review (§ Risks: the first projection is one unit of N
rows; D7's row target was met for child rows, not for a place's own row).

*(appended at build time)* — the W0 record and the checkpoint's decisions
(D13 onward); W6's first quiet run; W7's full blocking drive with the load
beside every number; the one-hundred record; what each found. The soak
drive is the existing `crowd.soak`.
