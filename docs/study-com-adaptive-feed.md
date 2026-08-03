# Game → Study adaptive feed — design

> **Status: design/sketch, aspirational — and gated.** This is the
> **reverse** direction of the seam: what Saxonberg sends *back* to
> study.com. It is the half the brief calls "the version where the two
> products actually improve each other"
> ([study-com-integration.md](./study-com-integration.md) §6.2, brief
> §8.5), and it is **entirely contingent on one open question**: does
> study.com's adaptive engine accept an inbound personalization signal?
> If no, this doc is unbuildable and the integration is one-way
> (credential feed only). If yes, this is the deepest thing the two
> products can do together. Treat every mechanism here as *proposed*,
> pending that confirmation and a live study.com environment (none has
> been touched).
>
> Pairs with the wire schema + `OutboundAdapter` in
> [study-com-integration-spec.md](./study-com-integration-spec.md) §2,
> §4.2. Reads bands off the advancement spine
> ([advancement.md](./subsystems/advancement.md)).

---

> **⚠️ Verified corrections — read
> [study-com-platform-reality.md](./study-com-platform-reality.md) first
> (2026-08-03).** Good news for this doc: Study's per-member mastery model
> is **real and Bayesian** — `Member_Concept_Mastery` (CX) and
> `Study_Priority` (test prep), plus the `Question_Stats` master/dimwit
> model — so the socket this feed targets genuinely exists and is
> shaped like Saxonberg's estimator. But the join is an **authored
> crosswalk to `Concept`/`ExamTaxonomyNode`**, not ISCED-F (§5), and
> whether the engine accepts an **inbound** signal is still the gating
> `[confirm]`. Reality doc wins on any conflict.

## 1. The thesis in one paragraph

study.com already personalizes: a **diagnostic** produces a per-taxonomy-
node strength/weakness map, and the **adaptive engine** builds a study
plan from it (test-prep, and increasingly College Saver). That diagnostic
sees a learner **through test items only**. Saxonberg sees the same
learner **applying the knowledge under stakes, repeatedly, in the course
of living** — and, because its distractors are *named characteristic
errors*, it can report not just *that* a learner is weak on a node but
*which misconception* they hold. Feeding that back is a diagnostic
study.com structurally cannot generate for itself: **applied failure,
with a named cause.** That is the synergy — instruction unlocks
application (study→game); applied failure personalizes instruction
(game→study).

---

## 2. What study.com consumes today (the target intake)

[known at the shape level; the actual intake API is the top open
question, §8]:

- A **diagnostic** result = a map `taxonomyNode → mastery estimate`
  (strong / weak / unknown), from a test the learner sits.
- The **adaptive engine** turns that map into an ordered study plan:
  which lessons/chapters to surface next, weighted toward weak nodes.
- Mastery is tracked per node as the learner works; the plan re-weights.

So the natural intake for an *external* signal is: **an additional
evidence source that updates the same per-node mastery map**, tagged as
externally-observed so study.com can weight or display it distinctly.
The game is, in study.com's own vocabulary, **a second diagnostic that
never stops running.**

---

## 3. The signal Saxonberg emits

Per learner, per node with fresh evidence (schema in
[spec §2](./study-com-integration-spec.md#2-the-two-wire-schemas)):

```typescript
interface CompetencySignal {
  v: 1;
  learnerRef: string;
  iscedf: string;                 // → mapped to study.com's node (§5)
  band: CompetenceBand;           // untrained..expert — NEVER raw theta
  missedMisconceptions: string[]; // named-distractor tags — the novel part
  provenance: "deed" | "claim";
  observedAt: string;
}
```

Two payload halves, and the second is the one study.com can't get
elsewhere:

### 3.1 The band — an applied mastery estimate

`AdvancementApi.bandsFor(owner)` (advancement.md:188) yields a band per
Discipline the learner has evidence in. Mapped to a study.com node, this
is a **mastery estimate derived from doing, not testing** — a
`proficient` band on a node the diagnostic marked `weak` is a signal
worth surfacing (the learner tests badly but performs well, or vice
versa). The band respects the **theta firewall**: the raw estimator scalar
never leaves the game (advancement.md:141-148); study.com receives the
ordinal band, honoring "no quantity without a referent."

### 3.2 The named misconception — the diagnostic study.com lacks

Every distractor in the generated bank is a **named characteristic
error**, not random jitter (college-slate.md:252-264), sourced from the
authored **misconceptions bank** (arcane-science.md carries a ~14-row
bank: "cold destroys heat," "there is no distance term," "mastery is
uncapped," "cheap = safe," …). When a learner **picks** a distractor —
in an exam item or by failing a Practical the corresponding way — the
game learns *which* misconception is active, not merely that the answer
was wrong.

`missedMisconceptions` is that set of tags. Concretely:

```
learner repeatedly picks the "dropped-the-latent-heat-term" distractor
  → missedMisconceptions: ["thermo.latent-heat.omitted"]
  → study.com surfaces the phase-change lesson next, and can display
    "you tend to skip the vaporisation term" — a targeted remediation
    no percent-correct score could produce.
```

This is the payload that makes the feed *deep* rather than *redundant*:
study.com's own bank has options + rationale; it does **not** track
which misconception a wrong pick evidences over time, per learner, under
applied conditions. The game does, for free, as the byproduct of an
honest generator.

---

## 4. The closed loop

```
   study.com                           Saxonberg
   ─────────                           ─────────
   pass thermodynamics final  ──claim──▶  delivery-efficiency band rises
                                          → caster's η ceiling lifts
                                             (instruction unlocks application)

   phase-change lesson surfaced  ◀─signal─  learner keeps failing the
   next; "you skip the latent-                conjure-water lab by the
   heat term" shown                           latent-heat route
                                             (applied failure personalizes
                                              instruction)
```

Each arrow is one wire schema. The left column is study.com's product
motion (completion, personalization); the right is the game's. Neither
side has to model the other — they exchange **bands, claims, and named
misconceptions** keyed by ISCED-F.

---

## 5. Mapping to study.com's node space

- **`iscedf` → study.com taxonomy node.** If study.com's nodes can carry
  (or be assigned) ISCED-F codes, this is a direct join
  (integration-spec §3.1). If not, the `CourseDisciplineMap`'s inverse —
  a `disciplineIscedf → studyComNode` table — lives in the proprietary
  adapter (integration-spec §4.3). Either way the mudlib emits only
  ISCED-F; the partner adapter localizes.
- **Granularity mismatch is expected and fine.** The game's Disciplines
  are coarser than study.com's per-lesson objectives. A game band on
  "thermodynamics" informs a *cluster* of study.com nodes; the adapter
  fans the band out to the nodes under that code and lets study.com's
  engine weight it. The misconception tags are finer and can target
  individual nodes/lessons where the tag vocabulary lines up.
- **Misconception vocabulary is the coordination cost.** For a tag like
  `thermo.latent-heat.omitted` to drive remediation, study.com needs a
  lesson/objective it maps to. For Magic 101 that's authored on both
  sides at once (the course is co-designed). For a *real* study.com
  course, the game would need study.com's misconception/objective
  vocabulary — a reason to align the two banks when authoring
  ([magic-101-course.md](./magic-101-course.md) distractor banks are the
  starting vocabulary).

---

## 6. Cadence & volume

- **Batch is correct here.** Unlike the deed-moment (which wants
  real-time, integration-spec §7), personalization has no urgency — a
  study plan re-weighted the next morning is fine. A daily
  `OutboundAdapter.exportFor(cohort)` (integration-spec §4.2) suffices.
- **Emit on change, not on a clock where possible** — a signal only when
  a band crosses or a new misconception is observed keeps volume down and
  the payload meaningful. Coalesce per learner per day.

---

## 7. Privacy, consent, and the overjustification guard

This direction sends a learner's **in-game behavior** to an external
service. That raises bars the inbound direction does not:

- **Explicit, separable opt-in.** Account linking (integration-spec §5)
  consents to *inbound* claims. Sending behavior *outbound* is a distinct
  consent — a learner may want their coursework to power their character
  without their play telling study.com how they think. Gate the outbound
  feed on its own opt-in, revocable, off by default.
- **Minimal payload — bands and named tags only.** Never free-form
  behavior, session logs, chat, social graph, or location. The
  `CompetencySignal` is deliberately narrow (§3); it is the *entire*
  outbound surface. The theta firewall (§3.1) is also a privacy control —
  a band leaks far less about a person than a scalar.
- **The overjustification guard** (advancement.md:800-802). Once real
  coursework is the signal *and* play feeds instruction, keep verifying
  the reward is **chosen capability**, not a carrot — the governing
  high-stakes reconciliation (strategy doc): the avatar borrows its
  stakes and has none of its own that compete. A personalization feed
  must not become a nudge engine that manufactures play to harvest
  diagnostics. The feed reports what happened; it never asks the learner
  to play *in order to* be diagnosed.
- **No PII beyond the opaque `learnerRef`** crosses the wire; the
  identity join stays backend-side (integration-spec §5).

---

## 8. What study.com must expose for this to exist (the [confirm]s)

In priority order — these gate the build:

1. **Does the adaptive engine accept an inbound personalization signal
   at all?** (integration doc §9, college-slate:689-691.) If no, stop
   here; the integration is credential-feed-only. **Everything below is
   moot until this is yes.**
2. **At what grain and in what format** does it accept external evidence
   — a per-node mastery update? a raw event it re-diagnoses from? Decides
   whether we send bands, or richer per-item outcomes.
3. **The node id scheme** and whether nodes carry ISCED-F (§5) — decides
   whether the join is direct or table-mediated.
4. **The misconception/remediation model** — does study.com have a
   place to hang "learner holds misconception X → surface lesson Y"? If
   not, the misconception tags degrade gracefully to a weighted mastery
   signal (still useful, less magical).

---

## 9. Open design questions (game-side)

- **Do we emit per-Discipline bands, or also per-*objective* evidence?**
  Bands are the honest, firewall-safe default; finer evidence is more
  useful to study.com but risks leaking toward a scalar. Lean bands +
  misconception tags only.
- **Misconception tag namespace** — ratify a shared vocabulary rooted in
  the misconceptions banks (arcane-science + Compact 200 + any real
  course's bank). This is the real interop artifact; §5 flags it as the
  coordination cost.
- **Cross-Discipline propagation** — the Discipline graph's `synergizes`/
  `specializes` edges aren't walked by the estimator yet
  (advancement.md:60-62). When they are, a band on one node could inform
  neighbors in the outbound signal — deferred until edge propagation
  ships.
- **Provenance in the outbound signal** — we send `deed | claim` so
  study.com knows an applied-in-world signal from a re-imported study
  signal. Confirm study.com wants / can use that distinction rather than
  treating all external evidence uniformly.
