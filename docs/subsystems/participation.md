# Participation & the consumer influence stock

The **quantity** half of consumer influence — the sibling of
[renown](./renown.md) (the quality half). Renown measures *how valued* you
are; participation measures *how much you show up and take part*. Their
product is the consumer stock's standing: `engagement × renown`, the
cooperative slate's consumer-contribution thesis made into a measured,
banded output.

This build ships the substrate and the projection; it wires **no
consumer** — there is no ballot yet. It exists now because participation is
**time-integrated and cannot be backfilled**: every day not logged is
history lost. So the priority is a *sound raw log* running from day one,
with the scoring as a rebuildable projection that can be re-legislated
without discarding data. See the
[engagement-meter requirements](../requirements/engagement-meter-requirements.md)
and the [polity decision register](../polity-decision-register.md) (D2/D4/D5/D6).

## The pipeline (mirrors renown, shares no code)

```
CommandDispatchedEvent ─► participation_events ─► participation ─► InfluenceStanding
   (capture seam)          (append-only log)       (rebuildable      (max(0,renown)
                                                     aggregate)        × participation,
                                                                       banded)
```

- **Capture** — `CommandGiverMixin._emitInputEcho` (the single-fire,
  sensor-gated dispatch tail) fires `CommandDispatchedEvent` once per
  **recognized** command (a verb bound — parse failures carry no `verb`)
  from an **interactive** origin (a real player, never NPC / programmatic /
  cascaded). `ConsumerLogic.installDispatchTap` taps it. This mirrors renown
  tapping `CommReceivedEvent` rather than reaching into the command
  framework — the chokepoint stays ignorant of participation.

- **`participation_events`** (`ParticipationEvent`) — the append-only log,
  **one row per active time-bucket**: a member is credited *once per coarse
  bucket* in which they take a recognized action. The append is
  find-or-skip on `{subject, bucket}`. This is **anti-AFK** (idle buckets
  never appear — you must act) and **anti-spam** (a macro spamming a bucket
  earns the one row the bucket already holds), the resolution of the
  slate's "what counts as engagement" question. The deliberate divergence
  from renown: renown appends one row *per signal*; participation dedups
  *per bucket*.

- **`participation` standing** (`ParticipationStanding`) — the rebuildable
  per-subject aggregate: the recency-decayed active-bucket count. A derived
  cache, never authoritative — **drop it, replay the log, get identical
  standings** (the invariant a test asserts). Cooperative-wide only (no
  scope partition); the `{subject, scope}` shape with `scope = '*'` is kept
  for parity with `RenownStanding`.

- **Projection** — `ConsumerLogic.standingOf` derives, on read,
  `max(0, renownOf(subject)) × participationOf(subject)`, wrapped in a
  `Band`. Both inputs are sync cached reads, so there is no third stored
  source of truth. The `max(0, …)` clamp is **load-bearing** (register D5):
  net-negative regard disenfranchises (zeroes the standing), it never
  drives influence below nothing.

## Two clocks (the divergence from renown)

Renown decays in **game-time** (its signals are in-world social acts).
Participation decays in **real-time** — it measures *a human showing up*,
and "present and contributing *now*" is real now. So:

- the **bucket key** is `floor(realAt / bucketMs)` (wall clock);
- the recompute's recency-**decay** uses `realAt` deltas, real-time
  half-life.

`ParticipationEvent.at` (game-seconds) is recorded for parity/correlation
only. The recompute *cadence* rides real-time `ScheduleApi.recurring`, as
renown's does.

## The three-stock contract (symmetry at the output)

The consumer stock is the first of three influence stocks (consumer /
patron / producer). It is built consumer-only, but against a shared
**output contract** so the others slot in without a refactor:

- **`InfluenceStanding`** `{subject, stock, scalar, band}` — the uniform
  output shape every stock emits, carrying the `stock` identity tag (the
  renown-`scope` mirror).
- **`Band`** — a stock-agnostic qualitative tier (register D6: standing is
  shown as a band, never a grindable number; the scalar is reserved for the
  ballot). Cutoffs are an AppSettings dial.
- **`InfluenceApi`** — the thin common dispatcher: `standingOf(subject,
  stock)` delegates `'consumer'` to `ConsumerApi`; `'patron'`/`'producer'`
  are reserved values returning a defined zero standing, never a throw.

The symmetry lives at the standing/band layer; the **asymmetry stays at
the source** — each stock's faucet and formula differ (patron is
`concave($)`, *not* `engagement × quality`, so no shared formula could
fit). Raw logs stay per-faucet.

## Api topology

- **`ConsumerApi`** (`api/consumer.ts`) → **`ConsumerLogic`**
  (`obj/api/ConsumerLogic.ts`, `/obj/api/consumer`) — owns the
  participation faucet (`append` / `eventsFor` / `recompute` /
  `participationOf` / `boot`) and the consumer projection (`standingOf`).
  Reads `RenownApi`; never owns it.
- **`InfluenceApi`** (`api/influence.ts`) — the common cross-stock
  dispatcher; no faucet, no logic singleton.
- **`RenownApi`** — the shared, general social-standing substrate, read for
  the quality half. Untouched by this build (it is dual-projection —
  governance reads the cooperative-wide roll-up; NPC/social/disguise read
  the per-circle vector — not a consumer-chamber thing).

Value-objects live in `lib/participation/` (`ParticipationEvent`,
`ParticipationStanding`, `Band`, `InfluenceStanding`); the capture event in
`lib/events/CommandDispatchedEvent.ts`. Named **Participation** (not
"engagement") to avoid colliding with `lib/activity/`'s in-session
`EngagedMixin` — a different concept (sustained in-session actions).

## Tuning (AppSettings, no code defaults)

- `participation.bucketSeconds` — active-bucket width (real seconds).
- `participation.decayHalfLife` — recency half-life (real seconds).
- `influence.bandThresholds` — JSON `[{name, min}]` band cutoffs
  (stock-agnostic).

The entrenched invariants — the `engagement × renown` form, the
`max(0, renown)` clamp, derive-don't-track / rebuildable cache — are
**code, never keys**.

## The `standing` verb

A zero-arg, self-only, read-only self-view (afforded by `PersonaMixin`,
sibling to `chronicle`). Renders the actor's participation, renown, and
resulting influence **band** — qualitatively, never the raw scalar.

## Deferred (named, not built)

The ballot / chambers / voting; the patron faucet (Twitch subs) and
producer faucet (CMS/AOP authortime × runtime-usage); **second-order
engagement** (register D2 — "the engagement you cause in others", the
population-dependent quality enrichment; this build measures the
solo-observable quantity); the player/human-level rollup for enfranchisement;
per-faucet saturation.
