# Renown — implementation plan

A grounded, phased plan for the renown substrate. Authoritative spec:
[renown-requirements.md](../requirements/renown-requirements.md). The
build is **server-only**; all paths are under `packages/server/src/`.
Every step names the real file it mirrors.

## 1. Approach overview

### The shape

Renown is the **belief/chronicle `Document` + `Api`↔`Logic` split** applied
once more, plus a **boundary-schedule recompute** mirroring weather, plus
an **`EventApi.on` ingestion tap** mirroring `SchedulerRegistry`. The
mirror map (build against these, don't invent):

| Renown piece | Mirrors exactly | Evidence |
|---|---|---|
| `RenownEvent` Document (log) | `ChronicleEntry` | `mud/lib/chronicle/ChronicleEntry.ts` (`extends Document`, `static collectionName`, `persistentFields`, owner-indexed) |
| `RenownStanding` Document (materialized cache) | `ChronicleEntry` + `AppSettings.warm()` boot-warm | `mud/lib/config/AppSettings.ts` `warm()`/`getCached()` |
| `RenownApi` / `RenownLogic` | `ChronicleApi`/`ChronicleLogic`, `WeatherApi`/`WeatherLogic` | `mud/api/chronicle.ts` + `mud/obj/api/ChronicleLogic.ts` |
| Ingestion tap | `SchedulerRegistry` `EventApi.on(...)` | `mud/obj/SchedulerRegistry.ts:330` |
| Soft import (no static cycle) | `WeatherLogic` `await import('../../api/biome')` | `mud/obj/api/WeatherLogic.ts:272` |
| Recompute schedule | `ScheduleApi.recurring` self-registered at boot (real-time, wraps `runRoot`) | CLAUDE.md antipatterns — `ScheduleApi` over bare timers |
| Value-function params | `AppSettings.values` bag + `AppSettingKeys` + `app-settings.yaml` seeder | `mud/lib/config/AppSettings.ts`, `mud/config/app-settings.yaml`, `backend/AppSettingsSeeder.ts` |
| Collections + indexes | `Collections` enum + `createIndexes()` | `backend/PersistenceManager.ts:30`, `:530-620` |
| Boot warm | `await AppSettings.warm()` / `await WorldClockApi.boot()` | `backend/AppBootstrap.ts:140-148` |

### Two constraints the investigation surfaced

1. **Nothing wires reaction→regard today, and it can't be wired cleanly
   yet.** `ReactionFiredEvent` has zero consumers; `RegardApi.adjustRegard`
   takes resident `Stuff` (subject often offline) and there is no
   principled *signed* regard delta for a raw reaction without the
   value-function. So the reaction→regard poke is **descoped** (decision 1,
   §6); this build wires only the renown tap. AC#1 is the renown half; the
   recompute never reads belief regardless (AC#6).
2. **`GroupApi` has no "groups shared by two players" method** (only
   `membersOf`/`isMember`/`roleOf`/`parseRef`). The managed `groups`
   collection is already indexed on `memberIds`
   (`PersistenceManager.ts:584`); scope tagging needs a new intersection
   method (Phase 4).

### Ingestion seam: `EventApi` bus, not a witness hook (decided)

Phase 3 ingests via `EventApi.on(ReactionFiredEvent)`, **not** a
witness/`@hook` mixin (the `callHook(item, 'onMoved', …)` idiom
`ContainmentLogic.ts:320` → `ThermalMixin.onMoved`). The witness idiom was
considered and rejected *for this seam* — the distinguishing principle:

> **Witness hooks are for instance-local state changes on a resident
> object; a bus is for decoupled aggregation of id-keyed signals.** Renown
> is the latter.

Three grounded reasons:

1. **The signal is id-keyed and the subject is often offline.**
   `ReactionFiredPayload` carries `subjectId` — the credited author of a
   *past* act, frequently logged off by reaction time
   (`ReactionFiredEvent.ts:18`). A witness hook on the subject
   (`callHook(subject, …)`) needs the subject resident, so reactions to
   departed actors would be **silently dropped → renown undercounts**. The
   bus logs an id and doesn't care.
2. **`ReactionFiredEvent` was purpose-built as "the renown seam"** — a
   decoupled DTO mirroring `FieldChangedEvent` (`ReactionFiredEvent.ts:1-10`).
   The reactions build already made this architectural choice.
3. **Renown's state is singleton/collection, not instance-local.** Thermal's
   `onMoved` updates the moved thing's *own* cached temperature — the mixin
   owns the state it mutates, which is what makes the hook pay off. A renown
   witness mixin would only **forward to `RenownApi.append`** — a thin
   pass-through holding no state. The idiom's benefit doesn't apply.

The coupling that decides it: **singleton storage ⟹ bus ingestion;
instance-local standing ⟹ witness hook.** We chose singleton (for
derive-don't-track per scope, offline tolerance, and the batch recompute),
so the bus follows; the bus also gives free multi-consumer fan-out (the
reactions slate's overlay/analytics taps) that a point-to-point hook
wouldn't. The bus's one real cost — discoverability vs an author-surface
`@hook` — is mitigated by installing the subscription in one obvious place
(`RenownApi.boot()`, Phase 6). The idiomatic fallback if ever revisited is
a **reactor-side** hook (the reactor is always resident, hung off
`SoulMixin`), accepting the inverted semantics. This is a Phase-3-only
seam; storage, scope, value-function, and recompute are identical either
way, so it is swappable later.

## 2. File-by-file changes, sequenced

Each phase is independently landable with an acceptance check tied to the
requirements' Acceptance criteria (AC#).

### Phase 1 — event log Document + collection

The `renown_events` log exists: append-only, scope-tagged, raw signal. No
scoring, aggregate, or ingestion yet.

- **Create** `mud/lib/renown/RenownEvent.ts` — `extends Document`,
  mirroring `ChronicleEntry.ts`: `static collectionName =
  Collections.RenownEvents`, `persistentFields = ['subject','source',
  'kind','signal','locality','groups','at']`. Fields per the spec's
  `RenownEvent` shape — `kind: 'reaction' | 'engagement-sample' |
  'recognition-spread'`, `signal` = raw `{ emote, tags }` (**pre-valence,
  unscored**), scope flattened to `locality: string | null` +
  `groups: string[]`, `at: number` (game-clock seconds, like
  `ChronicleEntry.when`). Export `RenownEventFields` (mirror
  `ChronicleEntryFields`).
- **Create** `mud/lib/renown/__tests__/RenownEvent.test.ts` — mirror the
  chronicle entry test: `toDocument`/`fromDocument` round-trip, defaults,
  scope fields.
- **Modify** `backend/PersistenceManager.ts` — add `RenownEvents =
  'renown_events'` (and `Renown = 'renown'` for Phase 5) to `Collections`
  (`:30`); add indexes in `createIndexes()` (`:530`) mirroring the
  chronicle block: `{ subject: 1 }` (hot read partition) +
  `{ subject: 1, at: 1 }` (decay-ordered slice).

**AC:** a `RenownEvent` with scope fields round-trips through
`renown_events`; index exists. (Substrate half of AC#1.)

### Phase 2 — `RenownApi` / `RenownLogic` skeleton + raw append/read

The gated facade + logic singleton exist with the standard split; raw
`append(fields)` + `eventsFor(subject, scope)` reader. No scoring,
aggregate, or ingestion.

- **Create** `mud/obj/api/RenownLogic.ts` — mirror `ChronicleLogic.ts`:
  `@Unshadowable`, `@internal`, `extends Idea`. **No intra-singleton
  `this.x()`** (the gate denies it — use module-private free functions, as
  `ChronicleLogic` documents). Every public method carries
  `@CallSecurity(SecurityPolicies.FromModule('mud/api/renown#RenownApi'))`.
  This phase: `append(fields)`, `eventsFor(subjectId, scope)` (raw
  `RenownEvent.find({ subject })`, scope-containment filtered in memory).
- **Create** `mud/api/renown.ts` — mirror `chronicle.ts`: `LOGIC_PATH =
  '/obj/api/renown'`, the `logic()` HMR resolver, forwarding statics,
  `export type {...}`, ends with `SecurityApi.decorateApiClass(RenownApi)`.
- **Create** `mud/api/__tests__/renown.test.ts` — append+read round-trip;
  gate-denial (non-`RenownApi` caller throws `SecurityError`).

**AC:** `pnpm lint:gates` resolves `'mud/api/renown#RenownApi'`;
append/read green; `dest /obj/api/renown` HMR resolves.

### Phase 3 — ingestion tap: `ReactionFiredEvent` → `RenownEvent`

A reaction produces a scope-tagged `RenownEvent`. **Renown's tap only**
(decision 1, revised at build time): the sibling reaction→regard poke is
**descoped** — a reaction has no principled signed regard delta without the
value-function (and `regard` has no recompute to apply it). Renown never
imports `RegardApi`; the recompute never reads belief.

- **Modify** `mud/obj/api/RenownLogic.ts` — add a one-time subscription
  installer mirroring `SchedulerRegistry.ts:330` (`EventApi.on<...>`
  storing the `Subscription`) / `BroadcastFeed.ts:108`. The listener:
  1. reads `ReactionFiredPayload` (`subjectId`, reactor/`source`, `emote`,
     `tags`, `scope`, `selfReaction`) from `lib/events/ReactionFiredEvent.ts`;
  2. resolves scope tags (Phase 4 — stub `{ locality: null, groups: [] }`
     here so the phase lands alone);
  3. `append`s a `RenownEvent` (`kind: 'reaction'`, `signal: { emote,
     tags }`, `at: WorldClockApi.getNow().rawValue()`).
  - **Imports:** `EventApi`/`WorldClockApi` static; `ReactionFiredEvent`
    from `lib/events/` (pure DTO). **No `RegardApi` import** (that's the
    other tap's job). `selfReaction` events are appended but flagged
    (recompute flat-weights or drops later).
- **Descoped:** no `RegardLogic` reaction tap. Reaction→regard is a
  belief-side decision (how a raw reaction maps to a *signed* regard delta)
  deferred to a belief build. This build makes **no** belief-side change.
- **Create** `mud/obj/api/__tests__/RenownLogic.test.ts` — fire a
  synthetic `ReactionFiredEvent` via `EventApi.fire`; assert exactly one
  raw `RenownEvent` lands (tags retained, no score). Use the
  `EventApi._clearAllForTesting`/`_setRegistryForTesting` seams
  (`api/event.ts:531-556`).
- **Create/extend** a `RegardLogic` test — fire the same event; assert
  `RegardApi.adjustRegard` ran. The two taps are asserted separately,
  proving the independent fan-out (AC#1).

**AC#1.**

### Phase 4 — scope resolution at ingestion (locality + shared Groups)

`RenownEvent.scope` carries the real locality and the objective Groups
shared by source+subject.

- **Modify** `mud/obj/api/GroupLogic.ts` + `mud/api/group.ts` — add
  `sharedManagedGroups(playerIdA, playerIdB): Promise<GroupRef[]>`,
  intersecting the two players' managed memberships (over the
  `memberIds`-indexed `groups` collection). Gate
  `FromModule('mud/api/group#GroupApi')`; forward from `GroupApi`.
- **Modify** `mud/obj/api/RenownLogic.ts` — replace the Phase-3 scope
  stub:
  - **locality:** parse `payload.scope` (`location:<id>` |
    `channel:<groupRef>`); for a location, resolve via
    `AddressApi.resolveLocalityFor(...)` (the weather seam,
    `WeatherLogic.ts:341`, `api/address.ts:87`), store the locality
    address-prefix string (or `null` = global — the documented
    null-is-global seam);
  - **groups:** `await GroupApi.sharedManagedGroups(source, subject)`;
  - **cycle discipline:** if a static `RenownLogic → AddressApi/GroupApi`
    import closes a cycle (check at build), use the **soft import** `await
    import('../../api/address')` per `WeatherLogic.ts:272`. Ingestion is
    the cold/async path, so a lazy import is free.
- **Create/extend** `RenownLogic.test.ts` + `group.test.ts` — co-guild
  members in a located room tag both `locality` and shared `groups[]`;
  non-members tag empty groups; `sharedManagedGroups` intersects correctly.

**AC:** substrate for AC#3 (events carry the multi-axis scope index).

### Phase 5 — value-function params + materialized aggregate + recompute

A signed per-`{subject, scope}` aggregate, materialized by a batch
recompute that applies the legislated value-function **at recompute
time**, warmed at boot, read by `RenownApi.renownOf`.

- **5a — params (governance-owned AppSettings shape).** Add to
  `AppSettingKeys` (`AppSettings.ts:48-54`, mirror the `reactions.*` keys):
  `renown.valenceMap`, `renown.decayHalfLives`,
  `renown.contextMultipliers`, `renown.qualityWeight` (JSON-encoded in the
  `values` bag). Seed defaults in `mud/config/app-settings.yaml` with a
  comment marking them **governance-owned (ordinary law), not
  deployment-owned**; note the **entrenched invariants** (notoriety→zero
  governance weight, the `engagement × renown` form) are **code, never a
  key** — plant nothing. `AppSettingsSeeder` is insert-only and needs no
  change. Reads via `AppApi.setting(key)` (sync, cached).
- **5b — aggregate Document.** Create `mud/lib/renown/RenownStanding.ts`
  (`extends Document`, `collectionName = Collections.Renown`,
  `persistentFields = ['subject','scope','value','recomputedAt']`, one row
  per `{subject, scope}`). Add `static warm()`/`getCached()`/
  `_resetForTesting()` mirroring `AppSettings.warm()` (`:84`) into an
  in-memory `Map` keyed `subject|scope` for sync reads. Index `renown` on
  `{ subject: 1, scope: 1 }`.
- **5c — recompute.** Add `RenownLogic.recompute()` (gated) +
  module-private scoring free functions: load params via `AppApi.setting`,
  scan
  `renown_events` per subject, for each materialized scope filter to
  events whose `scope` *contains* the queried scope, apply
  `valence(signal.tags) × contextMultiplier(zone tag) × decay(halfLife,
  now − at)`, sum (**flat `source` weight = 1** — recursion DEFERRED),
  write a `RenownStanding`. **No belief-store read in this path** (AC#6).
  Expose as the stable facade `RenownApi.recompute()` so the schedule
  survives HMR (mirror `WeatherApi.onBoundary`).
- **5d — reads.** `RenownApi.renownOf(subject, scope): number` — sync read
  off the warmed `RenownStanding` cache (mirror `AppApi.setting`); a
  non-materialized scope returns null/0 (decision 4 — arbitrary on-demand
  slicing is deferred; the retained log makes it a later additive reader).
- **Create/extend** tests: `RenownStanding.test.ts` (warm/getCached);
  `RenownLogic.test.ts` — AC#2 (recompute materializes a signed standing),
  AC#3 (one stream → different standings per scope), AC#4 (mutate valence
  key → standings change, `renown_events` byte-identical), AC#5 (drop
  `renown`, replay from log, identical standings), AC#6 (no belief read in
  `recompute`).

**AC#2, #3, #4, #5, #6.**

### Phase 6 — boot wiring

Activation = `RenownLogic` singleton presence; recompute on a cadence;
cache warmed at boot; ingestion live.

- **Modify** `backend/AppBootstrap.ts` (near `AppSettings.warm()` `:140` /
  `WorldClockApi.boot()` `:148`) — add `await RenownStanding.warm()` and a
  `RenownApi.boot()` that resolves the singleton and, in one place,
  **(a)** installs the renown ingestion subscription, **(b)** installs the
  RegardLogic regard-tap (or RegardLogic self-installs at its own boot),
  and **(c)** self-registers the recompute schedule (below). Mirrors
  weather forcing its singleton into existence (`WeatherLogic.ts:303`) and
  `WorldClockApi.boot()` as a named boot seam.
- **Recompute schedule (decision 3): renown self-registers a *real-time*
  `ScheduleApi.recurring`** inside `RenownApi.boot()` —
  `ScheduleApi.recurring(RENOWN_RECOMPUTE_MS, () => RenownApi.recompute(),
  { tag: 'renown:recompute' })`. Cache refresh is a real-time concern, so
  real-time `ScheduleApi.recurring` (which wraps the callback in
  `ExecutionContextApi.runRoot`) is the right primitive — **not** game-time
  `WorldClockApi.every`, and **not** a `WorldClockRegistry` edit; renown
  stays self-contained. The interval is a **code constant**
  (`RENOWN_RECOMPUTE_MS` in `lib/renown/`) — cadence is mechanism, not a
  legislated value. Decay math still uses game-time `at` deltas internally.
- **Create/extend** test — after the boot path, firing a reaction lands a
  row with no manual subscription setup; the `renown:recompute` schedule
  handle is registered.

**AC:** full end-to-end through the real boot seam (re-confirms AC#1–#6).

## 3. Tests (Vitest, colocated `__tests__/` siblings)

| Source | Test |
|---|---|
| `mud/lib/renown/RenownEvent.ts` | `mud/lib/renown/__tests__/RenownEvent.test.ts` |
| `mud/lib/renown/RenownStanding.ts` | `mud/lib/renown/__tests__/RenownStanding.test.ts` |
| `mud/obj/api/RenownLogic.ts` | `mud/obj/api/__tests__/RenownLogic.test.ts` |
| `mud/api/renown.ts` | `mud/api/__tests__/renown.test.ts` |
| `mud/obj/api/GroupLogic.ts` (new method) | extend `mud/api/__tests__/group.test.ts` |

Reuse the `EventApi` test seams (`_clearAllForTesting`,
`_setRegistryForTesting`, `api/event.ts:531-556`) and the
`AppSettings._resetForTesting` / `RenownStanding._resetForTesting`
cache-drop seams. Persistence tests run against the connected PM the
chronicle/belief tests already use.

## 4. Critical files

- `mud/lib/chronicle/ChronicleEntry.ts` — Document + collection mirror.
- `mud/obj/api/ChronicleLogic.ts` + `mud/api/chronicle.ts` — Api↔logic mirror.
- `mud/obj/SchedulerRegistry.ts` — the `EventApi.on` ingestion-tap pattern.
- `mud/obj/api/WeatherLogic.ts` — soft-import + isActive-by-presence +
  facade-targeted schedule.
- `mud/lib/config/AppSettings.ts` + `mud/config/app-settings.yaml` +
  `backend/AppBootstrap.ts` — param storage, seeding, boot-warm.
- `backend/PersistenceManager.ts` — Collections enum + indexes.
- `mud/api/schedule.ts` (`ScheduleApi.recurring`) — the real-time recompute
  handle renown self-registers at boot.

## 5. Trickiest integration points (get these right)

- **Value-function applied at *recompute*, never at write.** The log
  stores raw `signal`; scoring happens only in `recompute()`. This is what
  makes AC#4 (re-legislate → re-score history, log untouched) hold.
- **The recompute never touches belief (AC#6).** It reads only
  `renown_events` + `AppApi.setting`. The regard fan-out lives in the
  *ingestion* tap, not the recompute.
- **Soft import to break cycles.** `renownOf` (sync read) must avoid any
  cycle-closing static import — it reads only the warmed cache + `AppApi`.
  The async ingestion path may soft-import `AddressApi`/`GroupApi` per the
  weather precedent.
- **Ingestion install timing.** The `EventApi.on` tap is installed when
  the singleton is forced into existence at boot (`RenownApi.boot()`), not
  lazily — otherwise early reactions are missed.
- **`source` retained, weight flat.** v1 sums with weight = 1; the
  eigenvector recursion is a pure `recompute()` upgrade later — no schema
  or migration. Don't drop `source`.

## 6. Decisions (locked) & build-time checks

The four open decisions are locked below; #5 is a build-time verification,
not a decision.

1. **Regard-poke → descoped (revised at build time).** Renown's tap is the
   only reaction subscriber this build adds; it appends the `RenownEvent`
   and **never touches `RegardApi`**. The reaction→regard poke is deferred
   to a belief build, because building it surfaced that it can't be done
   cleanly: a reaction has **no principled signed regard delta** without
   the value-function (and `regard`, unlike renown, has *no recompute* to
   apply valence later — a fixed `+1` hard-codes "reactions are positive"),
   and `RegardApi.adjustRegard` needs resident `Stuff` while the subject is
   often offline. Renown is unaffected — it aggregates the event log, never
   `regard` (siblings, not parent/child); the recompute stays belief-free
   (AC#6). AC#1 was rescoped to the renown half. *(Earlier leans — one
   combined subscriber, or a separate `RegardLogic` tap — both founder on
   the no-principled-delta problem above.)*
2. **`GroupApi.sharedManagedGroups` → add it.** Small read method
   intersecting two players' managed memberships over the
   `memberIds`-indexed `groups` collection; no new module category. Lands
   with its own test (Phase 4) + a `grouping.md` note at sweep.
3. **Recompute → real-time `ScheduleApi.recurring`, code-constant
   interval, renown self-registered** (refines the plan's game-time lean).
   Cache refresh is a real-time concern, so `ScheduleApi.recurring` (wraps
   `runRoot`) is the right primitive — **not** game-time
   `WorldClockApi.every`, and **not** a `WorldClockRegistry` edit;
   `RenownApi.boot()` self-registers the handle, keeping renown
   self-contained. Interval = `RENOWN_RECOMPUTE_MS` code constant (cadence
   is mechanism, not a legislated value). Decay math uses game-time `at`
   deltas internally.
4. **Scopes → materialize the named set; defer arbitrary on-demand.** v1
   materializes cooperative-wide + registered Groups + localities;
   `renownOf(subject, scope)` is the sync cached read (non-materialized
   scope → null/0). Arbitrary retroactive slicing is **deferred** — no
   consumer needs it yet (consumers are deferred wholesale), and the
   retained scope-tagged log makes it a pure additive upgrade (a future
   async reader), no migration.

### Build-time check (not a decision)

5. **Verify the import cycle.** Run `pnpm build` to confirm whether
   `RenownLogic → AddressApi/GroupApi` closes a static cycle; if so,
   soft-import per `WeatherLogic.ts:272`. The sync `renownOf` read must
   never close a cycle — it reads only the warmed cache + `AppApi`.

## Explicitly deferred — seams left open, nothing planned

- **Consumers** (governance influence, NPC behaviour, disguise/notoriety):
  `RenownApi.renownOf` is their read seam; ship reads, wire no caller.
- **Eigenvector recursion:** `source` retained, recompute flat-weighted —
  a pure recompute-time upgrade, no migration.
- **Engagement-effect sampler:** `RenownEvent.kind` is an open string;
  reactions are the v1 proxy; new `kind`s slot in with no schema change.
- **Per-institution value overrides:** one polity-level param set;
  per-scope is a partition, never a per-place parameter.
- **Log compaction:** later space optimization; recompute is
  replay-from-log so it's always safe.

## Sweep-time (not build phases)

`docs/subsystems/` updates (a new `renown.md`, plus notes to
`grouping.md` / `app-settings.md` / `time.md`) and the `CLAUDE.md`
collection-list + subsystem-map lines land at `/finalize`, not in the
landable phases above.
