# Engagement meter (Consumer stock + Participation signal) — implementation plan

Plan phase for
[engagement-meter-requirements.md](../requirements/engagement-meter-requirements.md).
The build mirrors renown's four-layer pattern exactly, **sharing no
code**: append-only log (`participation_events`) → rebuildable standing
cache (`participation`) → scheduled recompute → boot warm; plus a
derive-on-read consumer-stock projection and one self-view verb. Every
piece cites its renown analogue.

## Api topology (per-stock Apis under a common `InfluenceApi`)

```
InfluenceApi          common cross-stock layer: the Band vocabulary, the
                      InfluenceStanding shape, and standingOf(subject, stock) /
                      bandOf(subject, stock) that DELEGATES to the per-stock Api.
  └─ ConsumerApi      the consumer stock's home: OWNS the participation faucet
                      (log + standing + dispatch tap + recompute) and computes the
                      consumer standing = max(0, renownOf) × participationOf;
                      READS RenownApi (does not own it).
  └─ (PatronApi)      future sibling: concave($)
  └─ (ProducerApi)    future sibling: build-engagement × usage

RenownApi             standalone shared social-standing substrate — UNTOUCHED.
                      Read by ConsumerApi now; by fame/NPC/disguise later. It is a
                      general dual-projection substrate (governance reads the
                      cooperative-wide roll-up; NPC/social/disguise read the
                      per-Group/per-locality vector), NOT a consumer-chamber thing,
                      so it stays its own substrate and is consumed, not absorbed.
```

**Key consequence vs. the first-pass plan.** There is **no standalone
`ParticipationApi`**. The participation faucet is owned by `ConsumerLogic`
(it is consumer-specific — no other reader — so it folds into the consumer
stock; renown does *not*, because it is general and shipped). The
participation *value-objects* keep their names in `lib/participation/`
(the signal keeps its identity; the stock owns the surface). `InfluenceApi`
is the thin common dispatcher + the `Band`/`InfluenceStanding` shape; the
consumer projection lives in `ConsumerLogic`.

## Locked decisions (the five plan-phase forks, resolved)

1. **What credits a bucket — a *recognized* command.** Fire the capture
   signal on a parsed-and-bound command (the engine recognized a real
   action), **not** on every raw dispatch attempt and **not** gated on
   the command *succeeding*. Permissive (failure still credits) but
   excludes keyboard-mashing from farming presence. Reversible — the log
   replays under a stricter filter without data loss.
2. **`InfluenceApi` is its own Api**, not folded into Participation. The
   projection sits *above* the faucets, where the three-stock contract
   lives; folding it in would bake "participation is the only faucet"
   into the projection's home.
3. **`stock` is an output tag only**, never a stored column in the
   participation substrate. Participation *is* the consumer faucet; the
   `stock` identity rides the `Influence` output. Patron/producer get
   their own logs later. Asymmetry at the source, symmetry at the output.
4. **Buckets and participation decay are REAL-TIME**, not game-time.
   Participation measures a *human showing up*; "present and contributing
   now" is real now. The bucket key derives from `realAt`, and the
   recompute's recency-decay uses `realAt` deltas. (Renown decays in
   game-time because reactions are in-world social acts — participation
   diverges deliberately. The influence projection multiplying a
   real-time-decayed participation by a game-time-decayed renown is
   coherent: each quantity decays in its natural clock.)
5. **Scoring starts simple** — a linear, half-life-decayed count of
   active buckets. The `× renown` product and the band quantization
   already dampen grind, so saturation is deferred. *Flagged near-term
   tuning:* the cooperative slate's anti-grind instinct (reception is
   log-saturated) means per-faucet saturation is likely wanted soon; it's
   a rebuildable projection over the log, so it's a later refinement, not
   a v1 blocker.

## Settled architectural shape

- **Capture seam = a dispatch hook firing a new domain event, tapped by
  `ConsumerLogic` via `EventApi.on`.** The exact renown reception
  precedent: renown subscribes to `CommReceivedEvent`
  (`CommReceivedEvent.ts:26`), fired from the chokepoint after
  `filterMessage` — it does *not* reach into `SensorMixin`. We replicate
  it: `executeCommand` fires `CommandDispatchedEvent` once per recognized
  player action; `ConsumerLogic.installDispatchTap()` subscribes and
  appends to the participation log. A free-floating helper called inside
  `executeCommand` is disallowed (CLAUDE.md); a mixin is wrong (the
  chokepoint already exists). The emit is one line at the
  recognized-command site.
- **`ConsumerApi` owns the faucet + the consumer projection** (decision 2,
  refined to the per-stock topology). `ConsumerLogic` owns the
  participation log + standing **and** computes the consumer standing
  (`max(0, renownOf) × participationOf`), reading `RenownApi.renownOf`
  (sync cached). `InfluenceApi` is the common cross-stock layer that
  delegates `standingOf(subject, 'consumer')` to `ConsumerApi` and holds
  the shared `Band`/`InfluenceStanding` shape.

---

## Phase 1 — The append-only log

Independently testable: append + same-bucket dedup, no standing yet.

- **`lib/participation/ParticipationEvent.ts`** (value-object / `Document`).
  Mirrors `RenownEvent.ts`. One row per active bucket. Fields: `subject`
  (durable id, indexed), `bucket` (the **real-time** bucket key — the
  dedup key), `at` (game-seconds, recorded for parity), `realAt` (epoch
  ms — the clock decisions 4 keys on), and an open `kind` for the future
  stricter filter. `static collectionName = Collections.ParticipationEvents`.
  **Deliberate divergence from renown:** renown appends one row *per
  signal*; participation appends one row *per (subject, bucket)* — the
  append path is find-or-skip on `{subject, bucket}`, not blind insert.
- **`lib/events/CommandDispatchedEvent.ts`** (event value-object). Mirrors
  `CommReceivedEvent.ts`. Payload `{ subjectId, commandId, at, realAt }`.
  `KIND = 'command.dispatched'`.
- **`backend/PersistenceManager.ts`** (MODIFY). Add `ParticipationEvents =
  'participation_events'` and `Participation = 'participation'` to
  `Collections` (renown sits ~`:45-46`). Add indexes mirroring
  `:687-701`: `participation_events` on `{subject}` and `{subject,
  bucket}` (dedup lookup must be O(rows-for-subject)); `participation` on
  `{subject, scope}`.
- **`api/consumer.ts`** — `ConsumerApi` (thin gated forwarding shell).
  Mirrors `renown.ts`: `logic()` via `StuffApi.singletonSync` +
  `HotReloadApi.getCurrentExport`; faucet statics `boot()`,
  `append(fields)`, `eventsFor(subject)`, `recompute()`,
  `participationOf(subject)` (Phase 1–2), plus `standingOf(subject)`
  (the consumer projection, Phase 3); ends in
  `SecurityApi.decorateApiClass(ConsumerApi)`.
- **`obj/api/ConsumerLogic.ts`** — `ConsumerLogic` (`@internal`
  `@Unshadowable` singleton). Mirrors `RenownLogic.ts`: gate
  `FromModule('mud/api/consumer#ConsumerApi')`, module-private free
  functions (`active()`, `appendImpl`, `bucketOf`) to dodge the self-call
  gate. `appendImpl` computes the bucket key from `realAt` (decision 4),
  checks `{subject, bucket}` (dedup), inserts only if absent.
  `installDispatchTap()` subscribes to `CommandDispatchedEvent` (mirrors
  `installReceptionTap`, `RenownLogic.ts:495`). (Owns the participation
  faucet; the consumer projection lands here in Phase 3.)

Tests (mirror `RenownLogic.test.ts` + the collection-aware fake-Mongo
store in `RenownLogic.recompute.test.ts:28-90`):
- `ParticipationEvent.test.ts` — round-trip + collection name.
- `ConsumerLogic.test.ts` — **append + same-bucket dedup** (two actions
  one bucket → one row; two buckets → two rows); no-op when `!active()`;
  tap fires append on `CommandDispatchedEvent`.

## Phase 2 — The rebuildable standing cache

- **`lib/participation/ParticipationStanding.ts`** (value-object /
  `Document`). Mirrors `RenownStanding.ts`: `Collections.Participation`,
  fields `subject`/`scope`/`value`/`recomputedAt`/`recomputedRealAt`, the
  `private static _cache = new Map()`, `key()`, `warm()`, `cached()`,
  `_resetForTesting()` (with `SecurityApi.assertTestOnly`). v1 is
  cooperative-wide only — reuse the `COOPERATIVE_WIDE = '*'` sentinel; no
  group/locality partition (participation isn't scope-tagged like
  reactions).
- **`obj/api/ConsumerLogic.ts`** (MODIFY). Add `recomputeImpl()`
  (mirrors `RenownLogic.ts:375`): load all events, group by subject, score
  each subject's bucket-set through the **real-time** recency-decay
  value-function (decision 4: decay on `realAt` deltas; decision 5: linear
  decayed bucket-count), `upsertStanding`, then
  `ParticipationStanding.warm()`. Add `participationOfImpl` (sync cached
  read, mirrors `renownOfImpl`, `:413`). Add `installRecomputeSchedule()`
  via `ScheduleApi.recurring` with a `CONSUMER_RECOMPUTE_MS` code constant
  (cadence is mechanism, not a dial — `RenownLogic.ts:516`).

Tests:
- `ParticipationStanding.test.ts` — warm/cache/cold-read-is-zero (mirror
  `RenownStanding.test.ts`).
- `ConsumerLogic.recompute.test.ts` — recompute materializes a scalar
  `participationOf` returns; **rebuildable invariant**: drop the
  `participation` collection, replay the log → identical standings (mirror
  `RenownLogic.recompute.test.ts` AC#5); decay math uses `realAt` deltas
  with a pinned clock.

## Phase 3 — The Influence projection + Band vocabulary

- **`lib/participation/Band.ts`** (value-object / vocabulary).
  **Stock-agnostic.** Immutable value-object + `as const` vocabulary
  (model on `Light.ts` static-factory style + the `as const` tier
  vocabularies). A `Band` is a named qualitative tier with
  `Band.fromScalar(value, thresholds)`. No `stock` knowledge inside — a
  band is a band regardless of faucet; patron/producer reuse it untouched.
  Thresholds from AppSettings (Phase 4), not constants.
- **`lib/participation/InfluenceStanding.ts`** (value-object). The
  `{ subject, stock, scalar, band }` output shape carrying the `stock`
  tag. `Stock = 'consumer' | 'patron' | 'producer'` union; only
  `consumer` implemented. Homed in `lib/participation/` (not a
  single-module `lib/influence/`): the dir is the consumer-influence
  measurement substrate — raw signal, both standings, and the band —
  mirroring how `lib/renown/` holds `RenownEvent` + `RenownStanding`
  together.
- **`obj/api/ConsumerLogic.ts`** (MODIFY) — the **consumer projection
  lives here**, not in the common layer. Add `standingOfImpl(subject)`:
  compute `Math.max(0, RenownApi.renownOf(subject)) * participationOf(subject)`
  — the **load-bearing `max(0, …)` clamp (register D5)** — wrap in
  `Band.fromScalar`, return an `InfluenceStanding` tagged `'consumer'`.
  Reads `RenownApi` (sync cached) + its own participation standing. Sync
  derive-on-read, no third stored source of truth. `ConsumerApi.standingOf`
  forwards here.
- **`api/influence.ts`** — `InfluenceApi` (thin gated shell, the **common
  cross-stock layer**): `standingOf(subject, stock)` → `InfluenceStanding`,
  `bandOf(subject, stock)` → `Band`. **Delegates** by stock: `'consumer'`
  → `ConsumerApi.standingOf(subject)`; a reserved-but-unimplemented stock
  (`'patron'`/`'producer'`) returns a defined neutral/zero standing tagged
  with that stock — **a defined reserved value, not a throw** (AC). Holds
  the shared `Band`/`InfluenceStanding` shape; owns no faucet. Ends in
  `decorateApiClass`. (Its logic is thin enough to live in an
  `InfluenceLogic` singleton if a gated home is wanted, mirroring the Api
  pattern; the dispatch + reserved-stock zero are the only behavior.)

Tests:
- `Band.test.ts` — scalar → band mapping at boundaries.
- `ConsumerLogic.standing.test.ts` — the **`max(0, renown)` clamp**
  (renown ≤ 0 ⇒ consumer standing pinned to the floor regardless of
  participation); the multiplication for positive renown; the output is
  tagged `'consumer'`.
- `InfluenceApi.test.ts` — `standingOf(subject, 'consumer')` delegates to
  `ConsumerApi` and carries the `stock` tag; a reserved stock
  (`'patron'`/`'producer'`) returns a defined value, not a throw.

## Phase 4 — The dials (AppSettings)

No code defaults; values warm at boot.

- **`lib/config/AppSettings.ts`** (MODIFY). Add to `AppSettingKeys`
  (alongside renown's, `:78-96`): `participationDecayHalfLife`
  (`"participation.decayHalfLife"`, **real-time** seconds per decision 4),
  `participationBucketSeconds` (`"participation.bucketSeconds"`, real-time
  bucket width), `influenceBandThresholds` (`"influence.bandThresholds"`,
  JSON).
- **`mud/config/app-settings.yaml`** (MODIFY). Seed the three values
  mirroring the renown block. Seeder is merge-missing/idempotent — no
  migration. `ParticipationLogic` reads with the
  try/catch-to-sane-default-pre-boot pattern from `receptionWindowS`
  (`RenownLogic.ts:170-178`) so settings-less tests still run.

Tests: covered inside recompute/Influence tests via the `seedAppSettings`
helper (`RenownLogic.recompute.test.ts:67`); assert scoring reads the
dials, no hard-coded constant.

## Phase 5 — Boot wiring + the dispatch emit

- **`backend/AppBootstrap.ts`** (MODIFY). After the renown block
  (`:157-158`): `await ParticipationStanding.warm();
  ConsumerApi.boot();`. `boot()` installs the dispatch tap +
  self-registers the recompute schedule (idempotent, mirrors
  `RenownApi.boot`, `renown.ts:65`). `InfluenceApi` needs no boot — pure
  derive-on-read dispatcher, activation = singleton presence.
- **`lib/command/CommandGiver.ts`** (MODIFY). One-line
  `CommandDispatchedEvent` emit at the **recognized-command** site
  (decision 1 — post parse+bind, before/independent of success), gated on
  interactive origin + `MixinApi.isSensor` (like `_emitInputEcho`,
  `:723`), so it fires once per deliberate *player* action and excludes
  NPC/programmatic/cascaded dispatch. Payload `{ subjectId:
  giver.stuffId, commandId, at: WorldClockApi.getNow().rawValue(),
  realAt: <epoch ms> }`. No participation logic here — just the emit.

## Phase 6 — The `standing` self-view verb

Mirrors the `chronicle` verb (zero-arg, self-only, read-only).

- **`mud/cmd/social/standing.yaml`** (View). Mirrors `chronicle.yaml`:
  `verbs: [standing]`, `controller: social/StandingController`,
  description. (Category `social` alongside the identity verbs.)
- **`obj/command/social/StandingController.ts`** (Controller). Mirrors
  `ChronicleController.ts`: reads `ConsumerApi.participationOf(actor)`,
  `RenownApi.renownOf(actor)`, `InfluenceApi.bandOf(actor, 'consumer')`,
  composes an MML self-readout via
  `MessageApi.scene(actor).topic(...).toSelf(body).send()`. Emits the
  **band**, never the raw scalar (register D6 / AC).
- **`mud/seeds/obj/command/social/StandingController.yaml`** (seed).
  Mirrors `ChronicleController.yaml` (`class:` + `data: {}`).
- **Discovery wiring**: add `standing.yaml` to the `self` bucket of the
  `commandContributions` that hosts `chronicle`.

Tests:
- `StandingController.test.ts` — drive with a synthetic `CommandContext`
  (mirror `ChronicleController.test.ts`): stub
  participation/renown/influence, assert the rendered scene carries the
  band and not the raw number.

## Phase 7 — The subsystem doc

- **`docs/subsystems/participation.md`**. Mirrors `renown.md`'s
  structure: the log → standing → projection pipeline; the active-bucket =
  anti-AFK/anti-spam rationale (S2) and the recognized-command credit rule
  (decision 1); the **real-time** clock divergence from renown (decision
  4); the three-stock contract at the standing/band layer (the
  patron-breaks-`×quality` argument); the renown kinship and deliberate
  divergences (per-bucket dedup vs per-signal append; no scope-axis v1;
  Influence as a separate projection Api). State the rebuildable-cache
  invariant and the `max(0, …)` clamp as load-bearing, not tuning. Add the
  doc to the CLAUDE.md documentation map.

---

## Files summary

**CREATE**
- `lib/participation/ParticipationEvent.ts` — value-object: one append-only active-bucket row.
- `lib/participation/ParticipationStanding.ts` — value-object: rebuildable per-subject standing cache.
- `lib/participation/Band.ts` — value-object/vocabulary: stock-agnostic scalar→tier mapping.
- `lib/participation/InfluenceStanding.ts` — value-object: `{subject, stock, scalar, band}` output with the `stock` tag (homed here, not a single-module `lib/influence/`).
- `lib/events/CommandDispatchedEvent.ts` — event value-object: the capture-seam signal (joins the existing `lib/events/` siblings).
- `api/consumer.ts` — Api: the consumer stock's home (faucet append/read/recompute/participationOf/boot **+** the consumer projection `standingOf`).
- `api/influence.ts` — Api: the common cross-stock dispatcher (`standingOf`/`bandOf`, stock-parameterized; delegates `'consumer'` to `ConsumerApi`).
- `obj/api/ConsumerLogic.ts` — Logic: `@internal` singleton (participation append+dedup, recompute, dispatch tap, schedule, **+** consumer projection with the `max(0,…)` clamp).
- `mud/cmd/social/standing.yaml` — View: the self-view verb.
- `obj/command/social/StandingController.ts` — Controller: renders participation+renown+band.
- `mud/seeds/obj/command/social/StandingController.yaml` — seed: controller Template.
- `docs/subsystems/participation.md` — doc.
- `__tests__` siblings: `ParticipationEvent.test.ts`, `ConsumerLogic.test.ts`, `ConsumerLogic.recompute.test.ts`, `ConsumerLogic.standing.test.ts`, `ParticipationStanding.test.ts`, `Band.test.ts`, `InfluenceApi.test.ts`, `StandingController.test.ts`.

*(No standalone `ParticipationApi`/`ParticipationLogic` or
`InfluenceLogic` — the participation faucet and the consumer projection
both live in `ConsumerApi`/`ConsumerLogic`; `InfluenceApi` is a thin
dispatcher. `RenownApi` is untouched.)*

**MODIFY**
- `backend/PersistenceManager.ts` — two `Collections` values + indexes.
- `lib/config/AppSettings.ts` — three `AppSettingKeys` constants.
- `mud/config/app-settings.yaml` — seed the three dial values.
- `backend/AppBootstrap.ts` — warm `ParticipationStanding` + `ParticipationApi.boot()`.
- `lib/command/CommandGiver.ts` — one-line `CommandDispatchedEvent` emit at the recognized-command site.
- the `commandContributions` host for `chronicle` — add `standing.yaml` to `self`.
- `CLAUDE.md` — add `participation.md` to the documentation map.

## Acceptance (from requirements, restated checkable)

- Append-only `participation_events` persists per-subject active-bucket signal via `PersistApi`; tests cover append + same-bucket dedup.
- `ParticipationStanding` recomputes on `ScheduleApi.recurring` + warms at boot; drop-and-replay yields identical standings.
- `InfluenceApi.standingOf(subject, 'consumer')` delegates to `ConsumerApi`, which derives `max(0, renownOf) × participationOf`; clamps when renown ≤ 0; carries the `stock` tag; reserved stocks return a defined value.
- Stock-agnostic `Band` vocabulary; player-facing surface emits bands, never raw scalars.
- The `standing` self-view verb renders participation + renown + band; controller test covers it.
- Scoring dials resolve from AppSettings; no hard-coded constants.
- `docs/subsystems/participation.md` exists and is in the CLAUDE.md map.

## Cross-references

- Requirements: [engagement-meter-requirements.md](../requirements/engagement-meter-requirements.md)
- Architecture mirrored: [renown.md](../subsystems/renown.md)
- Decisions: [polity-decision-register.md](../polity-decision-register.md)
