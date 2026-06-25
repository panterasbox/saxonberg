# Engagement meter — requirements

Finish the `engagement × renown` standing so a member's influence
starts **accruing from real activity now**, before there is anything to
spend it on. Renown — the *quality* half — already runs (append-only
`renown_events` → rebuildable `RenownStanding`, see
[renown.md](../subsystems/renown.md)). This build adds the missing
*quantity* half (participation over time) and the projection that
combines the two into a single, banded standing. The motivating
constraint is longitudinal: engagement is time-integrated and **cannot be
backfilled** — every day not measured is history lost — so the priority
is to get a *sound raw log* running immediately and treat the scoring
formula as a rebuildable projection that can improve without discarding
data.

This build **mints the first of three influence stocks** — the consumer
stock's *measured standing* (not its spendable/voting dynamics, which are
deferred). It is built consumer-only, but against a **shared stock
contract** (see "The three stocks" below) so the patron and producer
stocks slot in later without a refactor.

Seeded by the [reputation slate](../slates/builds/reputation-slate.md)
and the [cooperative slate](../slates/builds/cooperative-slate.md)'s
`engagement × renown` consumer-contribution thesis; the design tier of
each decision below is tracked in
[polity-decision-register.md](../polity-decision-register.md).

## The three stocks — the shared contract

The eventual chamber-weighting reads three influence stocks (consumer,
patron, producer) uniformly. This build implements only **consumer**, but
locks the contract now because retrofitting symmetry after the consumer
stock is live and accruing is the expensive failure mode. The contract is
deliberately thin (a single concrete example cannot justify abstracting
the *implementation* — the rule of three — so only the *output surface*
is fixed):

- **Shared — the output surface.** Every stock produces a **per-subject
  measured standing scalar + a stock-agnostic band**, read uniformly by
  the future weighting, and carries a **`stock` identity tag**
  (`consumer` | `patron` | `producer`) — the direct mirror of how renown
  tags events with `scope`. The reservoir concept (a faucet replenishes;
  stop-the-faucet decay; a lifetime-contribution cap) is common.
- **Different — the faucet and the formula (NOT shared).** Each stock's
  raw signal and scoring differ and must not be forced into a common
  shape:
  - consumer = `engagement × renown`
  - producer = `build-engagement × usage` (same family)
  - **patron = `concave($)`** — the asymmetric one; *not*
    `engagement × quality`.

  Because patron breaks the `× quality` formula, the contract lives at
  the **standing/band layer, never the formula layer**, and the raw logs
  stay **per-faucet** (one shared log would force the asymmetric signals
  together). Symmetry at the output; asymmetry at the source.

## Goals

- **A raw participation signal is captured and persisted append-only**,
  keyed per subject, from the moment the build ships — mirroring the
  `renown_events` precedent (raw, pre-scoring, replayable).
- **A rebuildable participation standing** aggregates that log into a
  recency-decayed scalar per subject — a cache, never authoritative:
  drop it, replay the log, get identical standings.
- **A single banded influence standing is derivable on read** as
  `max(0, renownOf(subject)) × participationOf(subject)`, surfaced to
  players as qualitative bands, not a raw number — exposed through a
  **stock-parameterized, stock-tagged surface** (`'consumer'`
  implemented; `'patron'`/`'producer'` reserved) so the other two stocks
  slot in without a rename.
- **The standing is observable** through a self-view so the meter's
  output is legible and testable from day one.
- **The scoring is dial-driven, not hard-coded** — decay/weight live in
  AppSettings, seeded provisionally, tunable without a migration.

## Non-goals

Named and deferred — these are the "next" builds, not this one:

- **The ballot / governance machinery** — Motion/Proposal, voting,
  three-chamber weighting, 2-of-3 passage, AppSettings enactment. None of
  it. This build measures; it does not legislate. (cooperative-slate.md.)
- **The patron and producer influence stocks + chamber weighting** — only
  the consumer standing exists here. Patron (Twitch subs) and producer
  (CMS/AOP authortime + runtime-usage) are independent future faucets
  filling their own stocks; the three-stock architecture and the weighted
  refraction are deferred.
- **Second-order engagement (register D2)** — "the engagement you cause in
  others" is population-dependent and is a later *quality* enrichment.
  This build measures the solo-observable participation quantity.
- **Player/human-level rollup + enfranchisement** — keying matches
  renown (per durable subject); rolling per-character standings up to a
  verified human is a governance-layer concern (register D7), deferred.
- **Per-circle influence vectors** — the consumer standing reads the
  cooperative-wide renown scope only; per-group vectors stay a social
  signal (renown.md:147).
- **Final value-function tuning** — exact decay half-life and curve
  shape are deferred to a running game; this build ships provisional
  dials (flawed *data*, sound *mechanism*).

## Surface decisions

### S1 — Subsystem name: **Participation** (not "Engagement")

- **Question.** The cooperative slate's quantity axis is called
  "engagement," but `lib/activity/` already owns `EngagedMixin` /
  engagement-slots for *in-session sustained actions*
  ([activity.md](../subsystems/activity.md)). Reusing the word collides.
- **Decision.** The code subsystem is **`participation`**
  (`lib/participation/`, `ParticipationApi`, `ParticipationLogic`,
  `ParticipationEvent`, `ParticipationStanding`). "Engagement" stays the
  design-level term in docs/the cooperative thesis. The activity/Engaged
  framework is a possible *future* signal source, not a dependency.
- **Reasoning.** Avoids a load-bearing name clash; keeps the
  governance-horizon participation signal distinct from the in-session
  action substrate.

### S2 — A participation event = an **active time-bucket**

- **Question.** What counts as one unit of the quantity axis? (The
  slate's open anti-bot/anti-AFK question.)
- **Decision.** A member is credited **once per coarse time bucket in
  which they take ≥1 meaningful action** — active-bucket counting, not
  per-command counting. The bucket size and the "meaningful action"
  filter are dials; the permissive start filters only obvious noise.
- **Reasoning.** Anti-AFK by construction (idle buckets score nothing —
  you must *act*), anti-spam by construction (a macro spamming a bucket
  earns the same as one deliberate action in it). It operationalizes
  "how present and active over time" directly. Starting permissive is
  safe because the raw log is replayable — a later, stricter filter
  re-scores history without losing it.

### S3 — Capture at the command-dispatch chokepoint

- **Question.** Where is the signal observed?
- **Decision.** At the existing player-command dispatch path — the one
  chokepoint every deliberate player action already crosses — mirroring
  renown's producer-site capture (it taps `SensorMixin.onMessage` after
  `filterMessage`). Exact hook placement is the planner's call.
- **Reasoning.** One chokepoint, already sees all activity, no new
  instrumentation surface; consistent with the "capture at a gate, then
  gate-by-predicate" precedent in renown.

### S4 — Subject granularity matches renown (per durable subject)

- **Question.** Per-character or per-human?
- **Decision.** Keyed at the **same granularity as renown** (the durable
  subject id). The per-human rollup that enfranchisement needs is a
  governance concern, out of scope (non-goal above).
- **Reasoning.** Keeps the projection's two inputs co-keyed (renown is
  per-subject), avoids importing the human-verification problem into a
  reputation-altitude build.

### S5 — The influence standing is **derived on read**, banded

- **Question.** Materialize a third stored standing, or compute it?
- **Decision.** **Derive on read.** Both inputs are already materialized
  caches (`RenownStanding`, `ParticipationStanding`), so the projection
  `max(0, renownOf) × participationOf` is a sync cached read (like
  `renownOf`). Player-facing output is a **band** (a `Band` vocabulary
  value-object, **stock-agnostic** — a band is a band regardless of which
  stock produced it, so patron/producer reuse it untouched); the raw
  scalar is internal.
- **Reasoning.** No third source of truth to keep coherent; honors
  register D5 (clamp at zero — notoriety disenfranchises, never
  anti-enfranchises) and D6 (bands, not a grindable number). The exact
  scalar stays available for the future ballot, which is where D6 says
  precision belongs.

### S6 — Projection naming: **consumer influence standing**, stock-parameterized

- **Question.** Call the projection "influence" (couples to the chamber
  model) or keep it neutral at reputation altitude — and how to name it
  so the patron/producer stocks slot in without a rename?
- **Decision.** Surface it as the **consumer influence standing**, with
  the stock named explicitly from day one:
  `InfluenceApi.standingOf(subject, 'consumer')` /
  `bandOf(subject, 'consumer')`. The standing carries a **`stock`
  identity tag** (the renown-`scope` mirror). Only `consumer` is
  implemented; `patron`/`producer` are reserved values, not unscoped
  assumptions.
- **Reasoning.** Matches the "seed influence" language, is
  forward-compatible (the later three-stock weighting reads stocks
  uniformly, no rename), and honors the three-stock contract above — an
  unscoped `standingOf(subject)` would silently bake in
  consumer-is-the-only-stock. The `× renown` combination ships now
  (player-facing bands need it); the chamber machinery does not.

### S7 — Observable surface: a minimal self-view verb

- **Question.** How is the meter observed, given there's no ballot to
  consume it?
- **Decision.** One minimal self-view verb (working name `standing`)
  rendering the viewer's own participation, renown, and resulting band.
  Richer/other-target views deferred.
- **Reasoning.** Without it the meter is invisible and untestable;
  acceptance needs an observable behavior. Self-only sidesteps the
  viewer-aware naming/perception surface (out of scope here).

## Constraints

- **Mirror the renown architecture, share no code.** Append-only log +
  rebuildable aggregate + scheduled recompute + boot warm, exactly as
  `renown_events`/`RenownStanding` — but a sibling subsystem, not a
  refactor of renown (renown.md established the pattern; this repeats it).
- **Rebuildable-cache invariant.** `ParticipationStanding` is never
  authoritative; replaying the log must reproduce it byte-for-byte
  (derive-don't-track).
- **Persistence via `PersistApi`** (the `lint:pm`-locked chokepoint
  renown uses); new collections `participation_events` and
  `participation`. No direct Mongo access. (persistence.md.)
- **Scheduling via `ScheduleApi.recurring`**, never bare
  `setInterval`/`setTimeout` — the recompute runs under
  `ExecutionContextApi.runRoot` (CLAUDE.md antipattern table).
- **Module taxonomy.** `ParticipationApi` (thin gated forwarding shell,
  `decorateApiClass`) → `ParticipationLogic` (`@internal` singleton);
  value-objects (`ParticipationEvent`, `ParticipationStanding`, `Band`)
  in `lib/participation/`; the capture seam as a mixin or dispatch hook,
  not a free-floating helper. No new module category. (CLAUDE.md.)
- **Dials in AppSettings**, seeded from `mud/config/app-settings.yaml`,
  no code defaults; values warm at boot. (app-settings.md.)
- **Flawed data, sound mechanism.** The value-function may be crude and
  the event filter permissive; the *log* must be correct and complete,
  because it's the one thing that can't be recomputed.
- **`max(0, renown)` clamp is load-bearing** (register D5), not a tuning
  choice.
- **Bands, not raw scalars, in player-facing output** (register D6).
- **Honor the three-stock contract.** The standing/band output surface
  must be stock-tagged and stock-parameterized (consumer implemented,
  patron/producer reserved) and the `Band` vocabulary stock-agnostic — so
  the future patron/producer stocks conform without reshaping this one.
  Do **not** pre-build an abstract stock framework from this single
  example; the contract is the *output surface*, not a shared
  implementation (rule of three).

## Acceptance criteria

- Append-only `participation_events` persists per-subject active-bucket
  signal through `PersistApi`; tests cover append + same-bucket dedup.
- `ParticipationStanding` recomputes on a `ScheduleApi.recurring` cadence
  and warms at boot; a test proves drop-and-replay yields identical
  standings (rebuildable invariant).
- `InfluenceApi.standingOf(subject, 'consumer')` derives
  `max(0, renownOf) × participationOf` on read; a test proves it clamps
  to the participation-independent floor when renown ≤ 0. The standing
  carries its `stock` tag, and an unimplemented stock
  (`'patron'`/`'producer'`) is a defined, reserved value (not a silent
  failure).
- A stock-agnostic `Band` vocabulary maps the scalar to qualitative
  bands; the player-facing surface emits bands, never the raw number.
- The `standing` self-view verb renders participation + renown + band for
  the actor; covered by a controller test.
- Scoring dials resolve from AppSettings (seeded in
  `app-settings.yaml`); no hard-coded constants.
- A subsystem doc exists at `docs/subsystems/participation.md` describing
  the log → standing → projection pipeline and its renown kinship.

## Cross-references

- **Seeding slates:** [reputation-slate.md](../slates/builds/reputation-slate.md),
  [cooperative-slate.md](../slates/builds/cooperative-slate.md)
- **Architecture mirrored:** [renown.md](../subsystems/renown.md)
- **Decisions:** [polity-decision-register.md](../polity-decision-register.md)
  (D2 deferred, D4 gate, D5 clamp, D6 bands)
- **Substrate:** [persistence.md](../subsystems/persistence.md),
  [app-settings.md](../subsystems/app-settings.md),
  [activity.md](../subsystems/activity.md) (the naming-collision sibling),
  [command-routing.md](../subsystems/command-routing.md) (capture chokepoint)
