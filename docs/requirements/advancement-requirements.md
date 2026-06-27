# Advancement (measurement layer) — requirements

The **measurement substrate** for character growth: the engine-level
"physics" that turns situated practice into a current estimate of what a
character is good at, governed by the project's **derive-don't-track**
discipline. Three pieces, worked out in the [advancement
slate](../slates/builds/advancement-slate.md) § *The measurement
substrate*: a **Catalog** (the authored, typed field-of-study graph), a
**Transcript** (the per-character append-only evidence ledger), and
**Competence** (a derive-on-read estimator over Catalog × Transcript that
surfaces only as bands, never a number). This build adds the **conferral
seam** that makes advancement *observable* — crossing a competence band
confers verbs the way membership and augments do — plus a self-contained
**proof harness** so the loop is exercisable on its own branch.

This is **lane 3** of the Dave's-Bar parallel wave. It deliberately ships
the *physics*, not the content or play-loops that ride on it (the test:
"does it know what a sword is?" — if yes it's content, deferred). The one
cross-lane obligation is the **act-signature shape**: the same authored
signature that feeds this Transcript will later feed lane 1's trait ledger
(traits are "competence for dispositions"), so the signature is defined
here to be extensible to disposition-valences without rework. See
[npc-behavior-slate](../slates/builds/npc-behavior-slate.md) § *Traits are
competence for dispositions*.

Precedents this substrate mirrors, read before planning:
[chronicle.md](../subsystems/chronicle.md) (the dumb-ledger / smart-consumers
append-only Document the Transcript copies), [renown.md](../subsystems/renown.md)
(the derive-don't-track measured-standing precedent; note Competence
*diverges* — it is never materialized), and the `Catalogue`-of-`Idea`
reference-singleton pattern (`TopicCatalogue` / `SoulCatalogue`).

## Goals

- **The Catalog exists as authored, hot-loadable data.** A `Discipline`
  is an `Idea` reference-singleton held in a `DisciplineCatalogue`
  (the `TopicCatalogue` / `SoulCatalogue` pattern), carrying a `channel`
  facet (skill / knowledge / conditioning) and typed edges
  (`requires` / `specializes` / `synergizes`) to other Disciplines. New
  Disciplines and branches are addable at runtime without disturbing a
  running world.
- **A seed Catalog proves heterogeneity.** A handful of Disciplines from
  the Dave's-Bar slice — at minimum Mixology, Recipe-knowledge, Darts,
  Alcohol-tolerance — authored across all three channels and exercising
  every edge kind (`Mixology requires Recipe-knowledge`; `Appraisal`-style
  `synergizes`; `Darts` a standalone leaf).
- **The Transcript is a per-character append-only evidence ledger.**
  Learning-events are recorded as `{discipline, difficulty, outcome}`
  rows, owner-keyed on durable `templatePath`, with the chronicle
  `deed` / `claim` provenance split reused (a `deed` is a world
  demonstration; a `claim` is a study/LMS attestation). The Transcript is
  *what happened*, never the score.
- **Competence is derived on read, never stored.** A per-Discipline
  BKT-style estimator turns (Discipline × Transcript) into a current
  estimate, surfaced **only as capability bands**. The internal scalar has
  a referent (competence *in a Discipline*) but never surfaces as an
  authoritative number — the honesty firewall is "no quantity without a
  referent."
- **Crossing a band confers verbs.** A Discipline may declare verbs
  conferred at a competence band; when a character's estimate crosses that
  band the verbs become afforded, via the existing `confers()` +
  affordance-attribution seam (the same mechanism augments and guild
  membership use). The player never sees the estimate; they see the door
  open.
- **The act-signature shape is defined and write-seamed.** The
  `{discipline, difficulty, outcome}` sub-check triple and the append seam
  are first-class, structured so a later trait build can graft a parallel
  `disposition-valence` channel onto the same signature ("instrument once,
  both fall out").
- **The increment proves itself standalone.** An author-gated `practice`
  verb writes deeds with chosen difficulty/outcome, and a self-only,
  read-only self-view renders Competence bands — so the full loop
  (practice → Transcript → derived band → conferred verb) is observable on
  this branch without lane 2's craft verbs.

## Non-goals

Adjacent surfaces someone might assume are in scope. Each lands elsewhere:

- **The loadout** — active-readiness cap, savings-effect warm-up, the
  rusty-then-snaps-back dormant skill. Deferred to advancement increment 2
  (slate § *Capacity, not decay*).
- **Guilds / institutions** — venue, mentors, credential,
  membership-as-affordance, brands/branches. Deferred (slate § *Guilds*).
- **The Reserve-shaped stakes engine** — transient-deficit + played-recovery,
  the two-ledger split, opt-in risk. Deferred (slate § *Stakes*).
- **Graph-propagated evidence** — the Bayesian-net-over-KC-graph that flows
  credit along `requires` / `synergizes`. Edges are *authored and stored*
  here, but Competence treats each Discipline **independently** in this
  increment; propagation is a credit-assignment residual (slate §
  *Credit assignment*).
- **Per-verb skill-signature authoring across the command system** — this
  increment defines the signature shape and one write path (the `practice`
  harness); instrumenting the real verb/recipe surface is content carried
  by the consuming lanes (crafting, social verbs).
- **The disposition-valence half of the signature** — defined-for but not
  populated here; lane 1's trait build owns it.
- **Estimator family choice + numeric tuning** — BKT vs IRT vs DKT,
  cold-start, cross-Discipline difficulty calibration. Deferred to a
  running game (slate § *Open problems*).
- **The raw-θ "spoiler" analysis view** — bands-only this increment; the
  opt-in raw read is a later presentation surface.
- **The skill-signature review gate** (anti-leveling-mill curation),
  **learned signatures**, and the **learning-platform sensor bridge** — all
  deferred (slate § *Open problems*).
- **All consumers beyond conferral** — guild exams, instrument reads,
  reputation/alignment. The substrate ships designed-for-them, ships none.

## Surface decisions

### The node is `Discipline`, not `Subject`

The slate names the catalog node `Subject` ("Topic is taken by messaging").
`Subject` is now **also taken** — `lib/forum/Subject.ts` is the forums
identity/audience spine and `SubjectCatalogue` already exists. The
advancement node is renamed **`Discipline`** (a field of study/practice at
any grain), held in a **`DisciplineCatalogue`** singleton. The name is
neutral across all three channels — it reads correctly for a skill
(Mixology), a knowledge node (Recipe-knowledge), and a conditioning node
(Alcohol-tolerance) alike.

### Catalog: `Idea` members in a warmed-cache Catalogue

`Discipline extends Idea` (a data-bearing reference-singleton, like
`Topic`), authored as template documents and **never cloned as Stuff**.
`DisciplineCatalogue extends PostRegistrationMixin(Idea)` at
`/obj/DisciplineCatalogue`, warming a `Map` cache in `postRegister` (the
`SoulCatalogue` / `SubjectCatalogue` recipe). Edges are **fields on the
node** (typed-ref lists keyed by relation), mirroring the argument-map
`Entry.relation` representation — no separate edge documents. Edges are
**authored and stored**; their runtime *consumption* (prerequisite gating,
propagation) is deferred, but the graph is real and queryable.

### Transcript: a sibling store, not a chronicle realm

A new `TranscriptEntry extends Document` in its own `transcripts`
collection, **mirroring the chronicle spine** (`static collectionName`,
`static persistentFields`, owner-indexed, one row per entry — never a
growing array) but with **structured learning-event fields**
(`{owner, kind, when, discipline, difficulty, outcome, …}`) rather than
chronicle's narrative ones. The chronicle `deed` / `claim` **provenance
concept is reused; the storage is not** — exactly the renown↔regard
"sibling, not child" relationship. Keeps chronicle's narrative semantics
clean and gives the Transcript a quantitative schema of its own.

### Competence: derive-on-read, no materialized aggregate

Unlike renown (which materializes a `RenownStanding` cache), Competence is
**pure derive-on-read** over (Discipline × Transcript) — the slate is
explicit ("never stored"). No aggregate collection, no recompute schedule.
A warmed read-cache is a deferred optimization; this increment's consumers
(conferral, the self-view) tolerate on-read derivation. The estimator is a
**per-Discipline BKT**: difficulty-aware, with **informative-evidence-only
updates** (a trivial success or hopeless flop barely moves the estimate —
desirable difficulty enforced by the math). It surfaces **bands only**.

### Conferral: a competence-driven affordance source

A `Discipline` declares `{band, verbs}` conferral entries. A per-character
affordance source (a mixin contributing `commandContributions`, the way
`PersonaMixin` contributes the `chronicle` verb) consults Competence and
affords the declared verbs once the character's band crosses the threshold.
Attribution flows through the existing affordance machinery
(`getAffordances` / `commandSource`), so the conferred verb's source reads
as "competence in `<Discipline>`." Because lane 2's craft verbs don't exist
on this branch, the demo confers a **self-contained placeholder verb** to
prove the seam end-to-end.

### The act-signature shape (the cross-lane seam)

The unit of credit is a **sub-check triple** `{discipline, difficulty,
outcome}`. An act's signature is a **list** of these (one messy in-world
act decomposes into several per-Discipline sub-checks at different
difficulties with localized outcomes — Wren's deal succeeds at Appraisal,
fails at Logistics). The Transcript records each triple as its own row. The
signature type is defined so a parallel **`disposition-valence`** channel
(lane 1's traits) can be added alongside the discipline channel without
reshaping it — *one signature, two outputs*. Lane 3 populates and consumes
only the discipline channel; the disposition channel is a defined-but-empty
seam.

### Proof harness: an author `practice` verb + a self-view

An **author-gated `practice <discipline> [difficulty] [outcome]`** verb
(an `AuthorMixin`/developer affordance) appends a `deed` to the actor's
Transcript — the controllable test harness that stands in for real craft
verbs. A **self-only, read-only self-view verb** (the `chronicle`-verb
shape: single-token, afforded by a per-character mixin) renders the actor's
Competence **bands** across the Disciplines they have evidence in, never a
number. Optional **demo minters** on already-firing moments (the chronicle
precedent) may seed a starting deed so a fresh character has something to
read.

### Api surface

A thin gated `*Api` ↔ hot-reloadable `*Logic` singleton split (the
`ChronicleApi` / `ChronicleLogic` boilerplate: `StuffApi.singletonSync`
getter, `FromModule('mud/api/<x>#<X>Api')` gate, module-private free-function
helpers to dodge the self-call gate, `SecurityApi.decorateApiClass` tail).
The surface covers: appending a learning-event / signature to the
Transcript, reading a character's Competence band for a Discipline, and the
owner-scoped Transcript reader. Catalog authoring/lookup rides the
`DisciplineCatalogue` singleton's gated methods. Final Api naming/partition
is the planner's call; the *surfaces* above are fixed.

## Constraints

- **Derive-don't-track.** Competence is an *output you observe*, never an
  *input you set*. The Transcript (raw evidence) is the source of truth;
  the estimate is recomputed from it. No stored competence scalar anywhere.
  (Same stance as [renown.md](../subsystems/renown.md).)
- **No quantity without a referent / no-number-as-authority.** The internal
  θ has a referent and may be read by instruments, but the **player surface
  is bands and revealed performance only**. No "Mixology 47/100" ever
  reaches a player view in this increment.
- **Durable `templatePath` keying.** The Transcript owner key is the
  character's `templatePath` (`/obj/Avatar/<playerId>`), not the ephemeral
  `stuffId` — the Phase-0 durability discipline renown / chronicle / belief
  all use. Additive Catalog evolution (new branches, re-parenting) must
  leave existing Transcript rows valid.
- **Methods-only inter-Stuff contract.** Other Stuff reads Competence /
  Catalog through gated methods (`getBand…` / Api statics), never fields.
- **Go through the Api / Catalogue layer.** No direct `new TranscriptEntry`
  / `.save()` from content; the gated append seam is the only writer.
  Persistence connection-gating goes through **`PersistApi`** (the
  `lint:pm` chokepoint), not `PersistenceManager.get()` directly.
- **No new module categories.** `Discipline` / `DisciplineCatalogue` /
  `TranscriptEntry` are Stuff/Idea/Document classes; the estimator and
  write logic live in an `*Api` + `*Logic` pair; the verbs are MVC
  YAML+Controller pairs; the conferral and self-view affordances are
  mixin-level contributions. Everything fits the existing taxonomy in
  `CLAUDE.md` — if something doesn't, stop and discuss before creating it.
- **`#`-private rules.** Domain code (`lib/`, `obj/`) defaults to
  TypeScript modifiers; persistent fields stay public for the Hydrator;
  mixin instance state on Stuff hosts cannot be `#`-private (proxy
  receiver). Api static state may use `#`.
- **The cross-lane act-signature seam.** The signature type must remain
  compatible with lane 1's trait consumption — coordinate the shape if lane
  1 reaches signatures in its wave; otherwise lane 3's definition is
  canonical and traits graft onto it.
- **Folder placement.** A new `lib/advancement/` subsystem folder houses
  the value-objects / mixins / Documents (or a name the planner prefers);
  no `lib/mixins/`-style grab-bag.

## Acceptance criteria

- A `DisciplineCatalogue` singleton warms at boot from authored
  `Discipline` templates; a seed Catalog of ≥4 Disciplines spanning all
  three channels and all three edge kinds is present and queryable.
- `Discipline` nodes carry `channel` and typed edge fields; the seed graph
  includes a `requires`, a `specializes`, and a `synergizes` edge and a
  standalone leaf.
- `TranscriptEntry` is an owner-indexed `Document` in a `transcripts`
  collection (index declared centrally in `PersistenceManager.createIndexes`,
  `Collections.Transcripts` added); the `deed` / `claim` split is recorded
  by provenance.
- The Competence estimator derives a band per Discipline on read from
  Transcript evidence, is difficulty-aware, and updates only on informative
  evidence; **no competence scalar is persisted**, and **no raw number
  surfaces to a player view**.
- An author `practice` verb appends deeds; the self-view verb renders
  Competence bands (and an empty-state line) for the actor only.
- A seed `Discipline` declares a band-gated conferred verb; practicing past
  the band makes that verb appear in the actor's affordances with a
  competence-attributed source, and the verb is usable — demonstrating
  "advancement = the door opens."
- The act-signature type is defined as a list of `{discipline, difficulty,
  outcome}` triples with a documented, unused `disposition-valence` seam;
  the Transcript append accepts a signature.
- Tests (Vitest, colocated `__tests__/`) cover: Catalog warm + edge
  authoring, Transcript append + owner-scoped read + deed/claim provenance,
  the estimator (band derivation, difficulty/informativeness behavior,
  no-persistence), and conferral crossing a band.
- A subsystem doc `docs/subsystems/advancement.md` exists describing the
  Catalog / Transcript / Competence / conferral substrate and its deferred
  seams, and `CLAUDE.md`'s documentation map + collections list are updated.

## Cross-references

- **Seeding slate:** [advancement-slate.md](../slates/builds/advancement-slate.md)
  (§ *The measurement substrate*, § *Credit assignment*, § *Buildable now*,
  § *A worked Catalog slice — Dave's Bar*).
- **Cross-lane seam:** [npc-behavior-slate.md](../slates/builds/npc-behavior-slate.md)
  § *Traits are competence for dispositions* (the shared act-signature).
- **Precedents:** [chronicle.md](../subsystems/chronicle.md) (the
  append-only ledger the Transcript mirrors), [renown.md](../subsystems/renown.md)
  (derive-don't-track; Competence diverges by not materializing),
  [belief.md](../subsystems/belief.md) (the owner-indexed Document spine).
- **Conferral seam:** [augmentation.md](../subsystems/augmentation.md)
  (`confers()`), [command-routing.md](../subsystems/command-routing.md)
  (affordance attribution — `getAffordances` / `commandSource`).
- **Substrate leaned on:** [reserve.md](../subsystems/reserve.md),
  [activity.md](../subsystems/activity.md) (practice as engagement —
  wired by consuming loops, not this increment),
  [persistence.md](../subsystems/persistence.md) (`PersistApi` / `lint:pm`).
- **Related lanes in flight:** crafting (`feature/crafting-build`, lane 2 —
  the real practice verbs), npc-behavior (lane 1 — the trait consumer).
