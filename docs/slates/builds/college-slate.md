# College slate (working doc) — courses, assessment, and teaching

> **Status: sketch / pre-requirements.** A design pass, not a spec.
> Written 2026-08-02.
>
> Scope: the **academic apparatus** — what a course is, how assessment
> works, how enrollment and teaching are modelled, and what a classroom
> is as a place. It is deliberately *not* the campus (that's the
> Eternal University slate — topology, buildings, the dorm) and *not*
> the discovery loop (that's the inquiry slate — how sim-native
> knowledge gets found and published).
>
> The forcing function: the University has to teach something, and the
> study.com pitch needs a demonstration that a real course catalog can
> run inside this world. See [study-com-brief.md](../../study-com-brief.md)
> for what we're asking the study.com side to tell us, and
> [arcane-science.md](../../arcane-science.md) for the invented subject
> the first course teaches.

See also:

- [eternal-university-slate.md](./eternal-university-slate.md) — the
  **campus**. Buildings, topology, the dorm. This slate furnishes it.
- [inquiry-slate.md](./inquiry-slate.md) — the **experiential half** of
  assessment. Its `predict` gate is our practical exam.
- [../../arcane-science.md](../../arcane-science.md) — the first
  invented subject, authored to be teachable.
- [../../study-com-strategy.md](../../study-com-strategy.md) — the deal
  thinking; stakeholder map; the assessment-provenance seam.
- [../../subsystems/advancement.md](../../subsystems/advancement.md) —
  Competence, the Transcript, Disciplines. Assessment writes here.
- [../../subsystems/chronicle.md](../../subsystems/chronicle.md) —
  **deed vs claim**, which is already assessment provenance.
- [../../subsystems/contract.md](../../subsystems/contract.md) —
  enrollment rides this.
- [../../subsystems/employment.md](../../subsystems/employment.md) —
  teaching rides this.
- [../../subsystems/help.md](../../subsystems/help.md) — the precedent
  for a path-addressed, schema'd, REST-served content catalogue with an
  in-game browser. A course catalogue is that pattern again.

---

## Principle

> **The classroom's job is to create demand for knowing, not to
> deliver knowing.**

Instruction is the thing study.com is world-class at and the thing
LLMs are commoditizing. Per the practicum thesis, our half is
**application** — so the classroom is where *stakes get attached* to
instruction that can come from anywhere. Enrollment costs money. The
exam evidences a competence. The competence gates a capability. The
credential is what lets you take the job.

**The content can be theirs. The consequences have to be ours.**

If we build a classroom that mostly delivers lessons, we have built a
worse study.com inside a game.

### The guardrail — a course is never the only path

Coursework must never be the *sole* route to a capability. There is
always apprenticeship, self-study, and cold discovery. The course is
the **fast, social, credentialed** path, not the gate.

This is honest (you can learn to code without a CS degree), it keeps
us on the reward-only side of the gamification-mirror bridge rather
than turning homework into a toll booth, and it means we ship **zero
new gating mechanism** — see below.

### The corollary — the course gates nothing

Worth stating precisely because it prevents a whole class of bad
design: *a course does not gate anything.* **Competence** gates
capability, and the engine already does that (magic's band gate on
both grid axes; `AdvancementApi.bandFor`). A course is one way to
raise competence, and assessment is one way to evidence it.

So the College is not a new authority. It is a fast, legible,
sociable, expensive path onto a ladder that already exists.

---

## The load-bearing decision: adopt the study.com taxonomy verbatim

**Course → chapter → lesson,** with their metadata fields, their
lesson types, their objective tagging. Not "inspired by" — the same
shape, field for field, as far as their schema is public or
disclosable.

Why this is the highest-leverage decision in the slate:

- Licensing their catalog later becomes a **data import, not a
  redesign.**
- In the meantime, Magic 101 authored into their exact schema is a
  live demonstration that their catalog drops in. The pitch stops
  being *"we could integrate"* and becomes *"here's your schema,
  populated, running."*
- It costs us nothing. We have no incumbent course taxonomy to
  protect.

Shape: a `Course` data-`Idea` in a boot-warmed catalogue (the
Discipline / Recipe / Spell precedent — authored leaves, no Mongo
collection), chapters as ordered children, lessons as
`StoredDocument`s in the document store. The in-game browser is the
`help api` browser pattern with a different root.

⚑ The exact field list is the first thing we need from the study.com
side. Guessing it wastes work.

---

## Assessment — four modes, one of which they cannot do

| Mode | Graded by | study.com analog |
|---|---|---|
| **Examination** | engine-computed key, procedurally generated items | chapter test / final |
| **Practical** | engine checks a submitted result against truth, within tolerance | lab project |
| **Essay / viva** | LLM, or a human instructor — including a *player* instructor | essay project |
| **Deed** | the engine watched you do it, in the course of living | *nothing* |

The fourth is the product. It is what "applied hours" means
operationally: evidence generated by living, not by sitting an
instrument.

### Provenance is already built

`chronicle.md`'s **deed vs claim** distinction *is* assessment
provenance. A competence evidenced by engine-witnessed deed is a
different record from one asserted by claim, and the record carries
which. That's the seam the study.com strategy doc called for —
credential events carrying their assessment conditions (proctored /
identity-verified open-book / unverified self-report) — and it exists.

`advancement.md`'s Transcript is the evidence ledger; Competence
derives on read. Assessment results are Transcript entries. **No new
ledger.**

### The viva

An oral defense with an examiner. In a text world that is *just
dialogue* — cheap for us, structurally impossible for a content
library, and the most human-feeling assessment in the set. Strong
candidate for the demo because it shows the medium doing something the
category cannot.

### Failure

Per the gamification-mirror doctrine: **soft recoverable entropy,
never a cliff.** A retake costs money and time. Attempts are recorded
(real transcripts record attempts) but carry no punitive mechanical
effect — the record is a presentation, per the credential doctrine.

---

## The procedural item generator — the centerpiece

Most study.com grading is **procedurally generated exams.** That is
the single best fit between what they do and what we have, because our
items can be generated from the running sim with a **computed answer
key.**

> *"You commit 60 τ at η = 0.85 to a 40 g bundle of dry straw at
> 15 °C, 8% moisture. Does it ignite?"*

- The numbers are **sampled from real material properties** out of the
  materials subsystem.
- The key is produced by **running the actual fire subsystem's
  ignition check.** Nobody authored it, so it cannot be wrong.
- Distractors generate from **characteristic errors** — dropped the
  moisture term, ignored efficiency, off by 10³ on the unit, used the
  wrong specific heat.

What it buys, in their language:

1. **An unbounded item bank** from a small generator spec.
2. **No item leakage.** Every student gets different numbers, so
   answer-sharing does nothing. A *higher* integrity signal at *less*
   friction — precisely the door that opens when proctoring shifts from
   live supervision to automated identity verification. *(Corrected
   2026-08-07: the strategy doc's "proctoring was removed" premise was too
   strong — `Proctored_Exam` is alive and CX credit rides it,
   [platform-reality §6](../../study-com-platform-reality.md). The
   generator's argument is unaffected: per-student items beat shared
   answers regardless of how the room is invigilated.)*
3. **One generator, two modes.** The same spec emits the
   multiple-choice item *and* the practical ("go do it, report your
   number"). That is the inquiry slate's didactic/experiential
   unification made operational rather than theoretical.

If we build one thing for the demo, it is this. It is their core
mechanic, done better, on content we own outright.

**Dependency:** the generator's honesty rests entirely on the
arcane-science content rules — costs derivable from the price list,
effects authored as energy delivered, everything dimensionally
checkable. A generator over dishonest content produces confidently
wrong answer keys.

### The generator spec

A data-`Idea` leaf in a catalogue (the same pattern as Recipe,
Discipline, Spell), carrying:

| Field | What it is |
|---|---|
| `objective` | the learning objective this item assesses ⚑ *their tagging* |
| `sampler` | what to draw the item's parameters from (below) |
| `stem` | the question prose, with slots for sampled values |
| `evaluator` | which shipped subsystem call computes the truth |
| `answerShape` | numeric + tolerance · boolean · categorical · ordering |
| `distractors` | named characteristic errors (below) |
| `practical` | the same item restated as "go do it and report" |

### Sampling, and why the default is not the live world

Three kinds, and the choice matters more than it looks:

1. **World sample** — pick an actual instance in the running world
   (that straw bale, in that yard). Most vivid, and **wrong for
   graded assessment**: two students get different difficulty, the
   world moves, and a disputed item cannot be reproduced for a
   re-grade.
2. **Catalogue sample** — draw a material or template from the
   catalogue and generate parameters numerically, without touching
   live state. Reproducible, safe, still real properties. **This is
   the default.**
3. **Synthetic sample** — parameters from an authored range with no
   world referent. The fallback where no catalogue entry fits.

World sampling stays available for **practice and lab** items, where
vividness is the point and nothing is being certified.

### Seeding

An item instance is `(spec, seed)`, with the seed derived
deterministically from student × assessment × index. Same seed, same
item, forever — so an item is **reproducible for re-grade, auditable
in a dispute, and re-renderable years later** when the world has
changed out from under it. Anything else makes credit-bearing
assessment indefensible, and it is the first question an academic
integrity reviewer will ask.

### The evaluator contract

> **The generator calls the game's own code path. It never
> reimplements the physics.**

This is the entire value proposition and it is one refactor away from
being lost. A reimplemented evaluator is an authored answer key with
extra steps: it drifts, and the drift is invisible because both sides
look plausible. If the fire subsystem's ignition balance changes, every
item about ignition must change with it *automatically*, or the
guarantee is gone.

### Distractors are named errors, and the misconception bank is their source

A distractor is **a deliberate wrong derivation**, never a random
perturbation. Two reasons:

- Randomly jittered numbers are eliminable by eyeball; a plausible
  wrong method is not.
- **Which distractor a student picks is diagnostic.** It names the
  misconception they hold, which is a far better signal than a score.

And the pipeline is already built: both course documents carry a
**misconceptions bank**, so *authoring a misconception is authoring a
distractor.* Keep them in sync and the item bank deepens for free.

### The discrimination invariant

The one machine-checkable quality rule, and it has teeth:

> **The answer tolerance must be smaller than the distance to the
> nearest characteristic-error answer.** If it isn't, a student using
> a wrong method lands inside the accepted band and the item measures
> nothing.

The generator can verify this at authoring time and refuse to ship an
item that fails it. It must also **dedupe**: a characteristic error
that happens to produce the correct answer for a given seed is not a
distractor, it's a bug — re-roll the seed.

### Worked, with real numbers

The firebolt item, generated against dry straw (50 g, 8% moisture,
ignition ~280 °C above ambient), correct answer **35.2 τ**:

| Option | τ | The error it encodes |
|---|---|---|
| **35.2** | — | *correct — sensible heat + moisture + latent, over η* |
| 22.9 | −35% | dropped the moisture term entirely |
| 24.5 | −30% | heated the water but never vaporised it |
| 29.9 | −15% | forgot delivery efficiency |
| 35 150 | ×10³ | kJ/J unit slip |

Every wrong option is a real thing a student does, and the answer
*tells you which*.

Note what the numbers expose. The nearest wrong answer sits **15%**
from the key, so a ±2%, ±5%, or even ±10% numeric item discriminates
cleanly. But two of the distractors — 22.9 and 24.5 — are only **6.9%
apart**. Fine as distinct multiple-choice options; **fatal** if the
item were free-response with a ±10% band, because a student could be
wrong two different ways and land in one bucket. The invariant catches
exactly this, and it is why the check runs against the *full* option
set rather than just the key.

### It works for the second course too

The same architecture, over rules instead of physics — because the
requirement is only a **deterministic evaluator**, and a
well-specified constitution is one:

> *"House C has fallen below quorum. Given these allocations and this
> Schedule of Parameters, does the bill become law?"*

The evaluator is the tallying code. The characteristic errors are the
Compact 200 misconception bank — *measured passage against the
shrunken count of houses rather than the full one* is a wrong answer a
student will genuinely produce, and it names the exact provision they
have not understood.

### What is blocked

Everything above is ours and unblocked. What we cannot finish without
study.com is the **output format**: their item schema, how variants are
declared in their system, objective tagging, and difficulty metadata.
Build the generator to emit an internal representation, and treat
their format as a **renderer** over it — then the schema arriving late
costs one adapter rather than a rewrite.

---

## The classroom as a place

| Room | What it is for, mechanically |
|---|---|
| **Lecture hall** | scheduled, many-to-one; a blackboard as a shared writable surface; the client's **watch embed** plays a video lesson in-card while you sit in it |
| **Exam hall** | proctored — diegetically, a proctor who *recognizes* you (the belief substrate doing identity verification) |
| **Laboratory** | the Practicum, which already has five runnable experiments and a calorimeter |
| **Library** | published laws as teachable goods (inquiry slate) |
| **Office hours** | a professor with a schedule, which is a shift roster |

Two notes worth keeping.

**The video card is free.** The client already has a watch embed for
streams. A study.com video lesson plays there while the player sits in
the hall; then they walk down the corridor to the lab and do it. That
is a complete demo sequence with no new client work.

**The exam hall's integrity apparatus is a thaumological
application.** The arcane-science doc predicts that *a veil does not
fool an instrument* — a semblance patterns viewers, not photons. So
the exam hall's anti-impersonation apparatus is an instrument, and the
invented science secures its own examination. Nice loop, and it wires
straight into the trusted-recording seed.

---

## The University is a composition, not a subsystem

Worth stating plainly because it is both true and pitch-relevant.

| Academic thing | Rides |
|---|---|
| Course / chapter | a data-`Idea` catalogue (Discipline / Recipe / Spell precedent) |
| Lesson | `StoredDocument` in the document store |
| Course browser | the `help api` browser pattern |
| **Enrollment** | **a contract** — clauses over verifiable conditions, escrow, tuition |
| Tuition / aid / sponsorship | banking; sponsored cohorts are a third-party payer |
| **Teaching** | **employment** — a position with shifts and wages |
| Cohort | a group (GroupApi) |
| Study group | a party |
| Discourse | forums |
| Evidence | the Transcript |
| The diploma | the chronicle (deed vs claim) |
| Capability gating | competence bands — *already shipped* |

Ten shipped substrates, no new subsystem. That is the
systems-over-content doctrine paying off, and it is the claim that
makes a pilot look cheap to their engineering side.

**Enrollment-as-contract is the sleeper.** It means financial aid,
deferred tuition, employer sponsorship, and the Working Scholars shape
(a third party funds a cohort against outcomes) all come for free on a
substrate built for gig work. Sponsor-visible persistence outcomes are
a contract's verifiable conditions.

---

## Teaching is a job

Master a course, get hired to TA it. Teaching is a position on the
University business with shifts, wages, and a roster.

This is the practicum thesis's **load-balance mechanism** staged in
the exact venue study.com cares about: a lab section run by a player
next to one run by an NPC, indistinguishable to a student, with a live
handoff available. Seats ration in the real world because seats are
people; here they don't, because the world staffs what players don't
want and yields what they do.

It is also the beginning of the teaching economy — the person who
discovers and publishes a law teaches it cheaply (inquiry slate's
library), and the person who has mastered a course sells sections.

---

## The social layer — their structural gap

From the strategy doc: study.com's product has essentially no social
dimension, self-paced structurally means self-isolated, and the
loneliness of the deferred goal is plausibly *the* stall-churn driver.
Pitch-weight: co-headline with completion.

The classroom is where we deliver it, and every piece already exists:
a **cohort** enrolled together, a **lab partner**, a **study group**, a
**TA**, **office hours**, and a professor who knows your name — which
here is mechanically real, because the belief substrate models
recognition per-viewer. *Being known is a modelled state, not a
metaphor.*

**Synchronicity resolution.** Their model is self-paced; ours wants
cohorts. Real universities already solved this: **content is
self-paced, sections are scheduled.** Read the chapter whenever; the
lab and the lecture are on a timetable. Adopt that and the tension
disappears.

---

## Two courses of our own making

We cannot demo curriculum ingestion without content to ingest, and we
do not have a license yet. The answer in plain sight: **invent the
subject matter, then we can teach it however we like.**

- **Magic 101 — Foundations of Thaumology.** A natural science.
  Authored in [arcane-science.md](../../arcane-science.md) under one
  hard rule: *nothing may contradict real science.* One invented
  postulate and one invented taxonomy; everything a student is graded
  on — thermodynamics, dimensional analysis, exponential decay,
  scientific literacy — is real.
- **Poli Sci 200 — The Compact.** A social science, and a 200-level
  because it presumes working knowledge of real state and corporate
  governance. Real invented institutions we designed, with a real
  governing document, a real chamber structure, and real decisions on
  the record. Not yet authored.

One natural and one social science together demonstrate that the
method **generalizes across a catalog** rather than that magic is a
special case. That is the load-bearing reason to do the second one.

---

## Content doctrine — how an invented subject avoids reading as trite

The standing risk with an invented course: it reads as a gimmick in a
lab coat next to Biology or Physics. The answers below are general —
they govern Compact 200 and any future invented subject, not just
magic.

**We are not competing with Biology. We are competing with the lab
section.** Biology 101 is largely memorizing things you cannot check,
taught to people who will never hold a pipette — not the part worth
beating. But every science course has a lab, and labs are famously
poor: canned procedures with known answers, three hours, a worksheet,
nobody discovers anything. Ours is a better lab, because the answer is
not in the back of the book. And the "but it's fake" objection
dissolves honestly: **a real physics lab is also a simulation** — a
frictionless cart on an air track is an apparatus built so an
idealized model is temporarily true. Every teaching lab is a
constructed world. Ours is a larger one that does not get reset
between sections.

**Depth must be discovered, not authored.** The invented layer is thin
(one postulate, one taxonomy); the real layer underneath is infinite.
So the subject is as inexhaustible as the physics it addresses,
without our having invented any of that depth. Ask *what happens if I
firebolt a sealed vessel of water* and the answer is in no document —
it is phase change, pressure, and material failure, computed.

**The content we need is not more magic. It is more consequences.**
Every subsystem the game ships deepens thaumology with no magic lore
written at all. A tenth spell teaches nobody anything; a new
subsystem confirms a noun.

**The failure mode to avoid is a Silmarillion.** Seven schools, forty
spells, a history of the Archmagi — pure assertion, uncheckable, no
texture, and the most reliable way to read as trite.

> **The test for any piece of content: does it create something a
> student can be wrong about?** If not, it is decoration.

**Content ranked by yield:**

1. **Anomalies** — a measurement the theory does not account for. Real
   fields are driven by these; a field without any reads as finished,
   which is fatal. One good anomaly is worth fifty spells. Three are
   authored in `arcane-science.md`, deliberately covering three kinds
   of wrong (your accounting · your instrument · genuinely open),
   because the meta-lesson is the ordering: *suspect yourself, then
   your instrument, and only rarely nature.*
2. **Instruments** — each is a new way to measure and therefore a new
   way to be wrong.
3. **Papers, including wrong ones** — reading literature *is* the
   discipline, and it teaches judgment rather than facts.
4. **People, just-in-time** — a disagreement is more legible with a
   face on each side, but one professor with a real position beats six
   with biographies, and NPCs are expensive carves.
5. **The ethical fault line** — the one piece of pure writing worth
   investing in, because a technical dispute with a moral fault line
   running through it is what a serious field looks like and what a
   toy never has.

**The general principle underneath all of it:** the running world
already computes more relationships than the theory explains. Finding
those is cheaper than inventing them, and they have the one property
invented lore can never have — they are true.

## The wiki — the commons the courses read from

> **study.com is to Wikipedia as our courses are to our wiki.**

The analogy is structural rather than genealogical: study.com is not
derived from Wikipedia, but it occupies the same position relative to
it that our courses occupy relative to our wiki — **the credentialed
pedagogical path through an open commons of the same knowledge.** The
mechanism the wiki itself needs is already designed in
[wiki-slate.md](../tails/wiki-slate.md); what follows is the part that slate
does not cover, which is the *relationship*.

### The source ladder

The relationship has a real name, and it is taught in every first-year
research-methods course:

| Tier | Here | Property |
|---|---|---|
| **Primary** | published papers (`arcane-science.md` § The literature) | original research, re-runnable against the sim |
| **Tertiary** | the wiki | synthesis; no original research; cites |
| **Pedagogical** | the course | a selected, sequenced path with assessment |

Teaching students to tell those apart **is information literacy**, and
it is plausibly the most employable single thing in the whole
curriculum. Here they do not learn it from a lecture about source
types — they *live in the ladder*, publish at one tier, cite from
another, and get graded at the third.

### Where our commons inverts Wikipedia — and why that is a lesson

Two of Wikipedia's load-bearing policies run backwards here, and the
contrast is the most valuable thing in this whole section:

- **"No original research."** Wikipedia forbids you from publishing
  your own findings. Our world's *entire discovery loop* is original
  research. So the ban does not vanish — it **relocates**: original
  research belongs in a paper (primary), and the wiki stays
  synthesis. Same rule, correctly placed.
- **"Verifiability, not truth."** Wikipedia checks claims against
  *published sources*, because it cannot check reality directly.
  **We can.** Verifiability here means **re-runnability**, which is a
  strictly stronger standard than any encyclopedia has ever been able
  to hold.

A student who understands *why* Wikipedia adopted those two rules, and
why a world with a running answer key can adopt different ones,
understands something real about how knowledge institutions are
designed around what they are able to check.

### The architectural rule: the course cites, it never restates

This is the concrete answer to *"the courses should adapt to it — maybe
not programmatically, but easy to adjust."*

> **The course owns the pedagogy. The wiki owns the facts.**

A lesson that restates a fact goes stale the moment the wiki improves
on it, and 88,000 restated lessons is precisely the maintenance burden
a content library carries. A lesson that **cites** stays current for
free. So a course's durable artifact is its **sequence, objectives, and
exercises** — and its adaptation surface is the **syllabus**, which is
a reading list, and revising a reading list is an afternoon's editorial
work rather than an engineering task.

That is the "not programmatically but easy to adjust" the analogy asks
for, and it costs us nothing to adopt now.

### Assessment integrity — the wiki can hold everything and the exam still works

The wiki slate explicitly punts this ("assessment integrity … not
here"). The college slate owns it, and the answer is clean:

**The machine-graded half is wiki-proof by construction.** Items are
`(spec, seed)`, catalogue-sampled per student, with the key computed by
running the subsystem. A wiki page can teach the *method* — which is
the objective, so that is studying, not cheating — but it **cannot
contain the answer**, because the parameters are generated and the key
is computed. Procedural generation does not defend the item bank; it
**removes the attack surface**.

**The human-graded half is not**, and pretending otherwise would be
silly: an argument can be cribbed. That half relies on the ordinary
defences — oral defence, originality, and provenance — which is exactly
where real courses already are.

So: no spoiler-gating is required for assessment integrity. The two
concerns are genuinely orthogonal, and the wiki can be as complete as
the community can make it without touching the credential's value.

### Contribution as coursework

Writing the definitive page on a topic is a **real assignment**, graded
by rubric, that leaves behind the textbook for the next cohort.

This is not speculative. **Wiki Education**, a Wikimedia Foundation
spin-off, has run exactly this in US and Canadian universities: more
than **14,000 students** have created or edited some **35,000
articles** for course credit, and the skills the program names —
research, source evaluation, writing for a public audience,
collaboration — are the skills we want and cannot easily assess any
other way.

The difference in our favour: a student's Wikipedia edit can be
reverted by a stranger, whereas here the claim can be **checked against
the world**, so the grading has a spine the real program lacks.

### Why this commons could go deeper than other game wikis

The user's intuition is right, and the reasons are structural rather
than hopeful:

1. **The content is transferable.** A drop table is useful in one game;
   a page on heat-pump COP or on statistical power is useful
   everywhere. Contributors are building something that survives
   outside the hobby, which is a fundamentally different motivation
   from documenting loot.
2. **Documentation is a rewarded act, not a side hobby.** Published
   findings are teachable goods and credibility is a renown consumer —
   the loop pays. Most games give the wiki nothing back.
3. **The surface is combinatorial.** Many honest interacting systems
   means the interesting pages are about *interactions*, and those do
   not run out.
4. **It reads as scholarship.** A person who writes the definitive page
   on conduction spread here has demonstrated analytical ability in a
   showable artifact — which is the LinkedIn-killer thesis arriving
   through the side door.

Which supports an inversion worth keeping: **in most games the wiki is
where the game's secrets go to die. Here it is a syllabus that writes
itself.**

### The discovery tension, answered honestly

Does a wiki spoil the discovery loop? Partly, and the honest framing
is: **discovery is a one-time reward per law per world, not per
player.** The first discoverer gets the credit; everyone after learns
it cheaply — which is already the inquiry design (published laws are
teachable goods, learnable via one confirming replication) and is
exactly how science works. The wiki is not a breach of that loop; it is
the loop's endpoint running out-of-band and faster.

The real consequence is a demand on us rather than on players:
**the frontier has to keep moving.** New subsystems confirm new nouns
and open new laws. A world whose wiki is finished is a world that
stopped shipping — which is the content doctrine above, arriving from a
different direction.

### The delta back to the wiki slate

Nothing here changes that slate's design. It adds three things it
should know:

- **A `papers` namespace is not a wiki namespace.** Primary sources
  live in the library with provenance and replication records; the wiki
  cites them. Keep the tiers apart or the ladder collapses.
- **Assessment integrity is resolved and does not need spoiler
  gating** (above) — that open item can close.
- **Course citation is a consumer of stable page identity.** If lessons
  cite wiki pages, slugs and redirects become load-bearing in a way
  they are not for casual reading.

## Open questions / forks

- **⚑ Their schema.** Course/chapter/lesson field list, lesson types,
  objective tagging, prerequisite modelling, item schema, rubric
  format. Blocks the catalogue shape and the generator's output
  format. See the brief.
- **⚑ What ACE/NCCRS require as assessment evidence.** Determines
  whether the **deed** mode can ever count toward credit, or whether
  it is strictly a motivation and capability layer. Materially changes
  the pitch.
- **⚑ Does their adaptive engine consume an outbound signal?** If so,
  in-world performance becomes an input to their personalization,
  which is a far deeper integration than a credential feed.
- **Player-authored courses.** The natural endpoint (and the
  LinkedIn-killer thesis's engine) and the biggest integrity risk.
  Lean: **v1 staff-authored only**; the seam when it opens is the same
  content-review path law and code use (review rides forums).
- **Real money never buys in-game advantage.** A real subscription
  entitles you to *content*; in-game tuition is in-game money. These
  must not blur. Flagging it here because enrollment-as-contract makes
  the blur easy.
- **How tight is exam → competence?** Lean: an exam is *evidence*
  banked to the Transcript like any other evidence, weighted by
  provenance. It does not directly set a band. Keeps one measurement
  model.
- **Grading essays.** LLM-graded is the pragmatic answer and matches
  their product. Open: does a *player* instructor's grade carry
  different provenance weight than an LLM's? (Probably yes, and that
  is interesting.)
- **Does the campus need more rooms than the Practicum + one hall for
  a credible demo?** Lean: no. Sparse and real beats broad and empty.

---

## Build order (sketch)

1. **Course catalogue + reader** — the data-Idea catalogue in their
   taxonomy, lessons as documents, the browser on the help pattern.
2. **The item generator + examination** — on Magic 101, using the
   shipped magic/fire/materials subsystems as the answer key. *The
   demo centerpiece.*
3. **Enrollment as contract + Transcript wiring** — mostly assembly of
   shipped parts.
4. **The lecture hall and exam hall** — plus the watch-embed lesson
   card. Two rooms.
5. **Practical assessment** — the inquiry slate's predict gate.
   *Depends on the inquiry build.*
6. **Teaching as employment** — TA positions, sections, the mixed
   roster.
7. **Player-authored courses** — deferred.

Steps 1–4 are a self-contained demo and none of them depends on the
inquiry build.

---

## What this slate does NOT cover

- The **campus** as a place — buildings, topology, the dorm. That's
  the Eternal University slate.
- The **discovery loop** — observe/measure/predict/verify, published
  laws, the wrong paper. That's the inquiry slate; this slate consumes
  its predict gate as one assessment mode.
- The **content of any course.** Magic 101's syllabus is synthesized
  later against the study.com product analysis; the Compact course
  isn't authored yet.
- **Real integration engineering** with study.com. One outbound
  credential event feed is the whole technical ask for a pilot, and it
  is not designed here.
- Anything that would imply this **replaces regulated practica.**
  Practice scales; licensure does not. That rail holds everywhere.
