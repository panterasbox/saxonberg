# Assessment slate — we measure real competence, and the world is where you practise it

> **Status: UNBUILT** — designed at high level 2026-11-02 with the owner, out of the lock
> slate's question 2 (*how does a pick resolve?*). Most of the parts are already designed in
> five documents that do not cite each other; this slate is the **re-emphasis** that joins
> them and the decisions that are new. Shipped: the Transcript with its `deed` and `claim`
> kinds, the BKT estimator, act signatures as a Q-matrix, Discipline channels and `iscedf`
> codes, stored-but-unread `requires` edges ([advancement.md](../../subsystems/advancement.md)).
> **Left:** assessment as the general measure (§ 1) · exams over taxonomy nodes, quick win to
> deep, adaptive (§ 3) · the issuer model — institution and standards body as one mechanism
> (§ 4) · our own item banks, trades first, ahead of any study.com deal (§ 5) · the exam
> interface, timed (§ 6) · what a Discipline node carries (§ 7) · a realm admits assessment,
> performance or both (§ 8) · the refusal that names its examiner (§ 9) · ⭐ the Discipline
> tree pass (§ 10) · lockcraft as the first consumer (§ 11)
> **Size:** a build — ⚠ cross-cutting (review question R3): it would make sense with no locks
> in the game, so it is its own build, never solved inside a trade build

## 0. The ask **[DECIDED — the owner]**

*"Maybe part of this game's thesis is we measure real competence in a domain and that's where
your disciplines come from. You take a lot of different tests and your knowledge matrix comes
from that. But at the same time we build the content that expresses the concepts in tests, so
you're not just studying from a book, you're making a decision about what content to engage
with. Then you make your way through that however you figure things out: reading online
resources, talking to other players, trial and error, concealing yourself and shadowing someone
else."*

*"A lot of our previous designs were some wishful thinking about 'we track what you do and
figure out how competent you are from that'. That might work for certain quests or recipes or
operations, but as a general principle it's not as universal as basic multiple-choice
questioning."*

*"Take a test, unlock an ability is a very simple proposition for a role-playing game to make."*

## 1. ⭐⭐⭐ The thesis, re-emphasized **[DECIDED — the owner]**

> **We measure real competence in a domain, mostly by assessment; the world is built from the
> concepts the assessments measure, so the content is where you practise them.**

What this changes, against the shipped and slated design:

| was | now |
|---|---|
| performance first — a deed is minted when an act resolves, and claims are a deferred *"academy faucet"* ([advancement.md](../../subsystems/advancement.md)) | **assessment is the general measure**; performance (stealth assessment) remains where an act is authored as evidence, and the body's conditioning stays its own |
| *"gamify the metacognition of learning, not the content; the classroom plugs in, it is never required"* ([advancement-slate](./advancement-slate.md) § thesis) | the content **is** examined, by us, before any classroom plugs in. The metacognition thesis survives: choosing what to study, at what grain, when to test, is still the play |
| the curriculum arrives with a partner | **we author the curriculum and its item banks first**, from the trades and their subsystem docs (§ 5) |

⭐ **Why it is not a departure.** Evidence-Centered Design (Mislevy) separates a *student
model* (what we believe you know), *evidence models* (what counts) and *task models* (what
produces evidence). Tests and in-world deeds are **two evidence models feeding one student
model**, and the shipped substrate already is that student model: BKT per Discipline, act
signatures as the Q-matrix, `claim` rows defined and waiting. We built the measurement half and
never the assessment half.

### The learning-science vocabulary, for the record
- **Evidence-Centered Design** (Mislevy) — the frame above.
- **Stealth assessment** (Shute) — assessment embedded in play; our deeds. Its known limit is
  the owner's finding: each task must be authored as evidence, so it never becomes universal.
- **Knowledge Space Theory** (Doignon & Falmagne; ALEKS) — knowledge as a fine-grained item
  graph with prerequisites; an adaptive test places you in a *knowledge state*. Our granular
  tree and its `requires` edges.
- **Item Response Theory / computerized adaptive testing** — calibrated item difficulty; the
  next item chosen to sharpen the estimate.
- **The testing effect / retrieval practice** (Roediger & Karpicke) — taking tests is itself
  one of the strongest ways to learn. A test-taking game is a learning game.
- **Spaced repetition** — re-testing at widening intervals is what keeps knowledge; a candidate
  answer to the loadout's *upkeep* question ([advancement-slate](./advancement-slate.md)).
- **Declarative vs procedural knowledge; Bloom's levels** — multiple choice reaches *remember*
  through *analyze* with scenario items; it does not reach hands. The Discipline `channel`
  (`knowledge` · `skill` · `conditioning`) is this line, already shipped.
- **Mastery learning / competency-based education** — advance on demonstrated mastery, not time.
- **Self-determination theory** — autonomy (choosing the content and the grain) keeps the
  motivation intrinsic; the reason a realm and a player may opt out (§ 8).

## 2. What already exists — the five documents this joins

| document | what it already decided | this slate |
|---|---|---|
| [advancement.md](../../subsystems/advancement.md) (shipped) | Transcript `deed`/`claim`; BKT with difficulty-modulated guess and slip; act signatures; channels; bands only; `iscedf` | the student model, unchanged |
| [college-slate](./college-slate.md) | ⭐ the **procedural item generator that calls the game's own code** (*"it never reimplements the physics"*); distractors are **named errors** from a misconception bank; four assessment modes; *the course cites, never restates*; adopt study.com's taxonomy verbatim | the generator is how § 5 keeps items true to the world. ⚠ The verbatim taxonomy is revisited in § 3 |
| [guild-slate](./guild-slate.md) | the **witnessed rank exam** (*eligibility derived, conferral witnessed*); the **claim rule** — a charter claims only Disciplines it has a master of | the guild is the standards-body issuer (§ 4) |
| [study-com/integration-spec](../../study-com/integration-spec.md) | `recordClaim`, the claim producer; **provenance tags weight evidence** (`identity-verified > proctored > unverified > self-report`; a deed outranks any claim) | integrity weighting (§ 4), already designed |
| [study-com/dual-transcript](../../study-com/dual-transcript.md) | the claim ledger and the deed ledger, **shown side by side**, the comparison itself the product | the lean for § 12 Q1 |
| [real-world-anchors-slate](./real-world-anchors-slate.md) | a **Wikidata id** anchors a reality-shaped row (Disciplines named); relation *is · models · contrasts* with a note on how we differ | § 7's reference, decided there |

## 3. ⭐⭐ Exams are built from taxonomy nodes; evidence lands per node **[DECIDED — the owner]**

*"Granularity is part of the allure. Take a test just on one type of lockpicking to learn simple
locks — you don't need to take the whole course."*

- **Every item is tagged with the node or nodes it measures** (the Q-matrix, as acts already are).
- **An exam is a selection over a subtree**: a scope (one node or many), a length, a target
  difficulty, and whether it adapts. A **quick win** is six items on warded locks; **deep
  learning** is an adaptive forty across pin-tumbler picking. Same machinery, different size —
  study.com's *test prep* product is the reference, not College Saver's course/chapter/lesson.
- **Each answer is evidence for the node it measures, never for "the exam".** Partial progress
  is real progress; the next quick win can target the gap.
- **A parent's standing derives from its children** — a measurement of one domain, inside the
  measurement doctrine ([measurement.md](../../measurement.md) § *Consumption confers monopoly*:
  the engine reads single-domain measurements, never a cross-domain valuation).
- ⚠ **The college slate's "adopt study.com's taxonomy verbatim" is revisited.** That taxonomy is
  course → chapter → lesson and has no trades. **Our Discipline tree is the grain; study.com's
  concepts map onto it by crosswalk** (the [platform-reality](../../study-com/platform-reality.md)
  correction already replaced the ISCED-F reverse index with an authored crosswalk).

## 4. ⭐⭐ Issuers — institution and standards body, one mechanism **[DECIDED — the owner]**

| | **the institution** (the university — study.com's *College Saver*) | **the standards body** (a guild — ETS, Praxis, TOEFL; study.com's *test prep*) |
|---|---|---|
| issues | course exams within a curriculum it designs | standardized exams for the Disciplines it **chooses to regulate** |
| breadth | a program of study | one competence |
| for | learning, in a sequence | certifying — proof to others that you can practise |

**One mechanism:** an **issuer** (any organization) offers **exams** over nodes; answers mint
`claim` evidence attested by the issuer. The university and each guild are **rows**; a rival
guild or Rejection's mining school is rows (lens 2).

- **Integrity weights the evidence** — the study.com spec's provenance tags, generalized: an exam
  taken **in person at the issuer's venue before a seat-holder** is strong evidence; open-book
  anywhere is weak. Nothing is forbidden; weak evidence moves the estimate less, through the BKT
  guess parameter the estimator already has.
- **A realm decides which issuers it accepts** (lens 7, tier C).
- **The guild's claim rule is its scope**: it examines only what it has a master of.
- The university's governance (a superintendent accountable to the Compact) is **open** and does
  not block this; the university only teaches and examines — practice is at the real venues in
  the community (the standing rule: the campus never hosts a trade venue).

## 5. ⭐⭐ Our own item banks, trades first **[DECIDED — the owner]**

*"Coverage is the big one and why I think we'll probably be generating a lot of our own content
in this regard in advance of any potential study.com deal."*

- **The curriculum is already written**: the trades and their subsystem docs are the syllabus —
  absorbency and sizing, colour by Beer–Lambert, a lock's binding order. Each is a principle the
  simulation actually runs.
- **Items come from two sources**: the **procedural generator** over the game's own code (the
  college slate's centerpiece — the answer is computed by the code that runs the world, so it
  cannot drift), and **authored items** written against a node's objectives from its references.
- ⭐ **The game's model is what is examined.** Where the simulation simplifies reality, an item
  that disagrees with the world is a bug in the item or the simulation — never left standing.
  The world must stay derivable from what you study. The real-world-anchors relation (`models`,
  `contrasts`) is where the difference is written down.
- **Invented subjects source from our own docs** — the 17 magic Disciplines from
  [arcane-science.md](../../arcane-science.md).

## 6. The exam interface — its own, timed **[DECIDED — the owner]**

Exams get **their own interface**, not the command prompt's `choice`, and they are **timed**.
Study.com's assessment interface is the reference to study. Design deferred to the build.

## 7. What a Discipline node carries **[LEAN]**

**Authored:**
- **References** — the Wikidata anchor ([real-world-anchors-slate](./real-world-anchors-slate.md))
  plus optional external sources.
- **Learning objectives** — can-do statements, each at a Bloom level (*explain why a master-keyed
  lock is easier to pick*). Items are written against them.
- **Prerequisites** — `requires`, already stored.
- **Misconceptions** — the distractor source (the college slate's bank, per node).
- **Where the game models it** — the subsystem doc.

**Derived, never authored** (it cannot go stale): where you practise it (the verbs and acts that
credit it, the venues that afford them), the recipes and locks that set floors in it, the exams
that cover it, the issuers that examine it. This is the player's *how do I engage with this*
page — plausibly the Discipline's wiki subject page.

## 8. A realm admits assessment, performance or both **[DECIDED — the owner]**

*"Some games can opt out of the testing and just do behavior-based advancement."* Lens 2: enable
authors, never impose. Within a realm that admits both, a player who never takes a test still
advances by doing.

## 9. ⭐⭐ "Take a test, unlock an ability" — through the refusal, never a conferred verb **[DECIDED]**

Verb conferral is retired ([advancement-slate](./advancement-slate.md) § *the refusal is the
progression UI*), and the proposition survives intact:

- Everyone has the verb (`pick`).
- A lock has a **floor**: below the band its tolerance demands it refuses, and **the refusal
  names the examiner** — *"this lock wants a finer hand — the Locksmiths' Guild examines for
  it."* That is lens 7's appeal built into the refusal.
- Pass the exam, the band rises, the lock yields.

From the player's seat that **is** *take a test, unlock an ability*.

## 10. ⭐⭐⭐ The Discipline tree pass **[DECIDED — the owner: run it as a workflow]**

93 Disciplines today, most one node per trade (`geology` is all of *reading ground*), 17 of
them the magic grid, a few coarse fields, prerequisite edges nearly empty. *"'Mining' isn't just
'mining' anymore."* The pass anchors depth on external taxonomies rather than inventing it —
**ESCO** (the EU skills/occupations classification), **O\*NET** (US occupational task
statements), **ISCED-F**, **Wikidata/Wikipedia** — and marks each proposed node **modelled**
(a mechanic exercises it), **seam** (a slated build will) or **out** (real, not this game's).
Lockcraft is the pilot cluster. Output: `discipline-tree-slate.md` (a slate; migrating
transcript rows onto finer nodes is its own build).

## 11. Lockcraft — the first consumer

The lock slate's questions 1–2 (a lock's secret by technology; a pick as a durative computed act
with a floor) make lockcraft the worked example: a granular subtree (mechanisms · keying and
master systems · picking principles · impressioning · bypass · duplication and restricted
keyways · safe manipulation · locksport ethics and law), every node with a Wikipedia article,
and the **Locksmiths' Guild** as its first issuer. See [lock-slate](./lock-slate.md).

## 12. Open

1. **One standing or two?** A tester and a doer reach "competent" by different evidence. One
   band fed by both, or *assessed* and *practised* shown side by side? **Lean: side by side** —
   [dual-transcript](../../study-com/dual-transcript.md) already argues the comparison is the
   product, and the channel decides which a floor reads (a pick reads `skill`; reading a lock
   reads `knowledge`).
2. **Open book.** Study.com's current finals appear to be open-book and unproctored (its own
   support pages disagree by plan) — the industry that awards credit accepts it. Lean: accept
   it, weight it by provenance, and reserve strong evidence for exams taken before a seat-holder.
3. **Upkeep.** Spaced re-testing as the loadout's answer — or capacity-not-decay as the
   advancement slate has it?
4. **The university's governance** — the superintendent, the committee, the Compact.
5. **Licensure** — a polity requiring a guild's certificate to practise is tier C and waits for
   a polity that wants it.

## 13. Lens pass

1. **Pedagogy** — the strongest heading by construction: real competence measured, the world
   built from what is measured, items computed by the world's own code.
2. **Expression** — an issuer, an exam, a node are rows; a rival guild is rows; a player who can
   do a thing can write its items for others (the college slate's contribution as coursework).
3. **3a Immersion** — the exam is out-of-fiction in its interface and in-fiction in its issuer
   and venue; the refusal speaks in-world. **3b Participation** — a guild that refuses someone,
   an issuer nobody trusts, a rival that founds a better exam.
4. **Values** — study or practise; look it up or know it; take the strong exam before a master
   or the weak one at home. No gauge.
5. **Continuity** — an exam is the same act in every epoch; the issuer changes (the master's
   hall, the university, the online test).
6. **Economy** — exams cost the issuer a seat-holder's time and the candidate a fee; a
   certificate is worth what someone who reads it will pay.
7. **Governance** — the issuer's criterion is its item bank and pass mark; the appeal is another
   issuer; which issuers count is tier C.
