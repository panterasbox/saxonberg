# Study.com integration & Magic 101 — response and design

> **Status: design pass / sketch.** This is the document
> [study-com-brief.md](./study-com-brief.md) §9 asks for — written from
> the **study.com-side** view (an agent that knows the study.com product
> and content structure) and handed **back to the Saxonberg agents** to
> guide how the platform models the education seam and synthesizes
> **Magic 101**.
>
> **Two companion docs frame this one:** the brief is the factual,
> unsold description of Saxonberg handed *to* me; the
> [strategy doc](./study-com-strategy.md) holds the deal/GTM thinking.
> This doc is neither pitch nor deal — it is the **product/engineering
> answer**: the real study.com model, the corrections, the integration
> architecture, and the course.
>
> **Accuracy rail (inherited from the brief, pointed the other way).**
> Study.com claims below are marked **[known]** (I'm confident from the
> product/codebase), **[likely]** (strong inference, confirm field
> names/behaviour with the resident insider), or **[confirm]** (a real
> open question for a human). Saxonberg claims cite the source-of-truth
> doc. Nothing about either side is described as existing when it
> doesn't — the whole seam is **aspirational**: nothing here has been
> exposed to a live study.com environment.
>
> **The reciprocal honesty rail.** The brief holds "nothing may
> contradict real science." The mirror rule for this doc: **nothing may
> misrepresent the study.com product.** Where I don't know, I say so
> rather than inventing a schema that reads plausibly and sends the
> generator down a wrong road.
>
> **Deepening companions (expand three parts of this doc):** the full
> course, [magic-101-course.md](./magic-101-course.md) (expands §8); the
> concrete interfaces/types,
> [study-com-integration-spec.md](./study-com-integration-spec.md)
> (expands §§6-7); and the reverse game→study adaptive feed,
> [study-com-adaptive-feed.md](./study-com-adaptive-feed.md) (expands
> §6.2). Plus the verified-reality grounding
> ([study-com-platform-reality.md](./study-com-platform-reality.md)), the
> classroom model ([study-com-classroom-model.md](./study-com-classroom-model.md)),
> worked real-data examples
> ([study-com-integration-examples.md](./study-com-integration-examples.md)),
> and the dual-transcript idea
> ([study-com-dual-transcript.md](./study-com-dual-transcript.md)), and the
> StudyAI capture + pitch argument
> ([study-com-studyai.md](./study-com-studyai.md)), and the teacher
> vertical / learner-becomes-teacher opportunity
> ([study-com-teacher-vertical.md](./study-com-teacher-vertical.md)), and
> the fit-scored, market-grounded vertical survey
> ([study-com-vertical-survey.md](./study-com-vertical-survey.md)), and the
> vertical **fidelity audit** — do our modeled industries teach the
> discipline's reasoning?
> ([study-com-vertical-fidelity-audit.md](./study-com-vertical-fidelity-audit.md)),
> and the **teachability boundary** — what the game can teach and how
> (direct enactment / allegory / reference)
> ([study-com-teachability-boundary.md](./study-com-teachability-boundary.md)).
> **Latest (2026-08-05):** the CX enrollment model + the corrected
> **aspiring-teacher beachhead** (with the two missing scoring axes — medium
> fit + product alignment — that demote TOEFL)
> ([study-com-cx-and-the-aspiring-teacher.md](./study-com-cx-and-the-aspiring-teacher.md)),
> the corrected **platform business model** — Saxonberg is AGPL-3, Study is
> an *operator* that licenses/runs its own instance, and revenue is support
> + managed PaaS, not customer ownership
> ([study-com-platform-business-model.md](./study-com-platform-business-model.md)),
> and the **student experience** — the off-campus paradox (education is the
> model's most complete citizen), the world's *danger is load-bearing*
> ("safe" = register: non-graphic text + cooperative/PvE + moderation, not
> the absence of combat), and the post-goal retention stack
> ([study-com-student-experience.md](./study-com-student-experience.md)), and
> the **engagement & positioning** layer — the verified gamification history
> (why the word is burned), the validated *synthesis*-novelty claim (with the
> play-to-earn cautionary parallel), the marketing moves that lead with fun
> without apologizing, and the honest fun-vs-honesty design risk
> ([study-com-engagement-and-positioning.md](./study-com-engagement-and-positioning.md)).

---

> **⚠️ Verified corrections — read
> [study-com-platform-reality.md](./study-com-platform-reality.md) first
> (2026-08-03).** This doc predates checking the real platform, and
> several load-bearing claims below are wrong: the **ISCED-F join does not
> exist** (Study has no ISCED-F/CIP field — join via an **authored
> crosswalk** to Study's `Concept` (CX) / `ExamTaxonomyNode` (test prep)
> trees, in the proprietary adapter; ISCED-F is Saxonberg-*internal*
> only); items are **not multiple-choice-only** (~20 types incl.
> essay/free-response/LLM-graded, plus first-class case-study passages);
> **proctoring is intact** (identity-verified via TypingDNA+Veriff; CX
> rides it); the hierarchy is Program→Course→**Topic**→Lesson; and there
> is **no learning-objective entity** (the tag is a Concept/ExamTaxonomyNode).
> Where the reality doc conflicts with anything below, **it wins.** The
> inline text here is not yet fully rewritten.

## 0. TL;DR — the five things that decide the build

1. **The hook already exists on the Saxonberg side.** Every `Discipline`
   carries an `iscedf` field (UNESCO ISCED-F 2013 code) that is
   authored, stored, and *inert in v1*, explicitly "designed in for the
   academy / LMS bridge, which will map real coursework onto Disciplines
   by code" ([advancement.md](./subsystems/advancement.md):44-53). The
   `claim` kind on the Transcript is documented as "**the academy
   faucet** … defined for the deferred learning-platform bridge; no
   consumer mints claims this increment" (advancement.md:86-87). The
   integration is **not** a new subsystem on the game side — it is the
   *producer* the game already left a socket for.

2. **There are two mapping regimes, and the split IS the
   vertical-agnostic / proprietary boundary.** (a) **Generic academic
   transfer** — *any* real study.com course → competence on the game
   Discipline that shares its ISCED-F code. A real thermodynamics course
   raises a real thermodynamics competence. This is vertical-agnostic and
   licensable to any ed-tech catalog. (b) **Fiction-bound courses** —
   Magic 101, authored *into* the fiction, mapping to the game's
   invented magic-grid Disciplines. This is proprietary to the
   study.com × Saxonberg product. §7 makes this the architectural seam.

3. **study.com's real item model is a good fit for the generator, with
   one correction the brief needs.** The centerpiece the brief wants —
   procedurally-generated items with a computed key — maps onto study.com
   *assessment* structure well, but study.com's shipped item format is
   **overwhelmingly static, authored, four-option multiple choice tagged
   to a taxonomy node and a lesson objective**, not a parametric
   generator. So the generator should emit study.com's *item instance*
   shape (a rendered question with options + key + objective tag), and
   the "spec + seed" machinery stays **game-side**. study.com is the
   **renderer/consumer of instances**, not the home of the generator.
   (§2.)

4. **The strongest real integration is bidirectional, and the
   game→study direction is the one that makes the products improve each
   other.** study.com's differentiator is an **adaptive engine** that
   builds a personalized study plan from a diagnosed
   strength/weakness map per taxonomy node. Saxonberg's Competence
   estimator produces exactly that shape as a byproduct of play —
   per-Discipline bands plus, via the *named-distractor* design, a
   **misconception diagnosis**. Feeding that back is a far deeper
   integration than a one-way credential feed (brief §8.5). (§6.2.)

5. **The claim must carry assessment provenance, and the game has no
   home for it yet.** study.com post-2025 is **identity-verified
   open-book** (TypingDNA + Veriff), not proctored. The credential
   substrate models `payment | travel | key` and has **no field for
   assessment conditions** (credential.md:34) — so "proctored /
   id-verified / self-report" is net-new and belongs as **`tags` on the
   `claim` Transcript row**, with the deed-vs-claim split as the coarse
   proxy already in place. (§4, §6.4.)

---

## 1. The study.com product model (answers brief §8.2, §8.6; corrections)

### 1.1 Content taxonomy — adopt it, with the real field shape

The brief's instinct to adopt the taxonomy **verbatim** is correct, and
the college slate's "same shape, field for field"
([college-slate.md](./slates/builds/college-slate.md):85-90) is the right
call. The real hierarchy is deeper than "course → chapter → lesson":

```
Subject  (e.g. "Science", "Business")           [known]
  └─ Course  (the credit-bearing unit; ACE/NCCRS reviews at THIS grain)
       └─ Chapter  (ordered; carries a Chapter Test)
            └─ Lesson  (video + transcript + a short lesson quiz)
                 └─ (question bank tagged to the lesson & its objectives)
```

Field inventory, as best I know it — **confirm exact names against
`academy-services` and `assessment-services`** [likely]:

| Grain | Fields that matter to you |
|---|---|
| **Course** | stable id; title; subject; description; **credit recommendation** (ACE and/or NCCRS, semester-hours, lower/upper division); course-level **learning outcomes**; chapter list (ordered); a **final exam**. |
| **Chapter** | stable id; title; order index; lesson list; a **chapter test**. |
| **Lesson** | stable id; title; order; **lesson type** (video / text / interactive); a **video asset with a full text transcript** (this is the one the brief cares about — see §1.3); **learning objectives** (the taggable unit); a short **lesson quiz** (typically ~5 MC items). |
| **Objective** | a learning-objective string attached at lesson level; the **anchor a credit recommendation hangs on** (§3). |
| **Taxonomy node** | the *other* tree — a hierarchical **skill/knowledge taxonomy** that questions are tagged to, used by the **adaptive test-prep engine** and mastery tracking. Course/chapter/lesson is the *content* tree; the taxonomy is the *competency* tree. **These are distinct, and the second one is the real analog of your Discipline graph** (§6.2). [known that both exist; exact node schema — confirm]. |

> **Correction for the brief.** The brief models "course → chapter →
> lesson" as the whole taxonomy. There are effectively **two trees**: the
> authored **content** tree (course/chapter/lesson) and a **taxonomy of
> skills/objectives** that assessment items hang from and that the
> adaptive engine walks. Your **Discipline graph** (nodes + `requires`/
> `specializes`/`synergizes` edges, advancement.md:58-62) is a much
> closer cousin of the *second* tree than of the first. Map to **both**:
> content tree → the University's course catalogue; taxonomy tree →
> Disciplines via ISCED-F (§6.1).

### 1.2 Assessment structure post-2025 — what's required and how it's verified

[known, from the strategy-doc interview + product]:

- **As of 2025, lessons and lesson quizzes are optional.** Only
  **chapter tests + the final exam** are required to earn the credit
  recommendation. This matters: your **required-evidence** signal is the
  chapter test and final, not lesson consumption.
- **Proctoring was removed.** The final is **open-book, identity-verified**
  via **TypingDNA** (typing-cadence biometrics) and **Veriff** (ID +
  selfie), *not* live supervision. The brief's old "proctored = deed"
  shorthand is dead — the strongest study.com signal today is an
  **identity-verified open-book final**. (This is already reflected in
  the strategy doc's seam correction; restating because it drives the
  `claim` provenance tags in §4/§6.4.)
- **Test prep is adaptive.** SAT/ACT/AP, GED, HESI, ASVAB, TOEFL, teacher
  certification. A **diagnostic** produces a personalized study plan from
  a per-taxonomy-node strength/weakness map; **mastery** is tracked per
  node. Some newer TOEFL speaking/writing items are **LLM-graded**, not
  string-matched — relevant precedent for your Essay/viva mode (§5).

### 1.3 Lesson assets & the text register (answers brief §8.6)

- **Yes — video lessons carry full text transcripts.** The K-12/homework
  catalog alone is "88,000+ video lessons with transcripts"
  (strategy doc). This is the answer to the brief's softest-but-important
  question: **your text-first client can render a study.com lesson as
  text natively**, and the watch-embed pane can play the video for
  learners who want it (college-slate.md:342-346). No transcription work
  on either side.
- Practically: a lesson's transcript is a first-class asset you can pull
  and render as MML prose; the video is the same asset for the embed
  pane. **A study.com lesson is already dual-register** (watch or read),
  which is exactly the `look` vs `analyze` ethos pointed at content.

---

## 2. The item schema (answers brief §8.1, §9 — highest-value section)

### 2.1 What a study.com item actually is [known/likely]

The brief hopes for "how procedurally generated questions are specified."
The honest answer: **study.com's shipped items are overwhelmingly static
and authored**, not parametric. The dominant shape is a four-option
multiple-choice item:

```
Item (multiple-choice, the ~90% case):        [likely — confirm field names]
  id                stable identifier
  stem              the question prose
  options[]         typically 4; each { id, text, isCorrect }
  rationale         explanation of the correct answer
                    (often per-option rationale in newer content)
  difficulty        an ordinal/'1..n' difficulty
  objectiveRef      the lesson learning-objective it assesses
  taxonomyNodeRef   the skill/knowledge node (drives adaptive selection)
  assetRefs[]       optional image/passage stimulus
```

Assessment containers:

- **Lesson quiz** — a handful of items scoped to one lesson's objectives.
- **Chapter test** — a larger set spanning a chapter's objectives.
- **Final exam** — course-spanning; the credit-bearing instrument.
- **Test-prep pools** — items tagged to taxonomy nodes; the adaptive
  engine *selects* from the pool by the learner's mastery map. This is
  the closest study.com gets to "generation" — it's **adaptive
  selection over an authored bank**, not parametric synthesis.

Newer item types exist (LLM-graded free response in the TOEFL
experience), but the credit-bearing College Saver instrument is MC.

### 2.2 The consequence for Saxonberg's generator

The college slate's generator is **better than study.com's item model**,
not merely compatible with it: it produces a *computed* key from the
running physics (college-slate.md:158-195), which no authored bank can
match for leak-resistance. Don't weaken it to study.com's shape — instead:

- **Keep the `(spec, seed)` machinery game-side** (college-slate.md:231-238).
  study.com has no home for a parametric spec; it consumes **item
  instances**.
- **Emit study.com's item-instance shape as a render target.** The slate
  already lands on exactly this: "build the generator to emit an internal
  representation and treat their format as a **renderer**"
  (college-slate.md:321-327). Confirmed — that is the right call, and the
  IR → study.com-item adapter is a §7 proprietary-layer component.
- **Your named distractors are a strict superset of what study.com
  carries.** study.com items have options + (sometimes per-option)
  rationale; your distractors are *named characteristic errors*
  (college-slate.md:252-264). Emit the misconception name into the
  per-option rationale slot — you'll be handing study.com **better
  distractor metadata than its own authored bank has**, and it doubles as
  the diagnostic signal for the game→study adaptive feed (§6.2).
- **The discrimination invariant (college-slate.md:266-279) has no
  study.com equivalent** — author-time verification that the answer
  tolerance is smaller than the distance to the nearest characteristic
  error. Keep it game-side; it's part of what makes the generated bank
  defensible to the ACE-facing stakeholders (§4).

### 2.3 Two worked items in the real format

Grounded in the shipped arcane-science numbers
([arcane-science.md](./arcane-science.md):1157-1250) so they're
honest today.

**Item A — Examination mode (MC), rendered as a study.com item:**

```
stem:    Igniting 40 g of dry straw (15 °C → ignition ~250 °C, 8%
         moisture by mass) means raising the straw and its bound water
         to ignition AND vaporising the moisture. At delivery
         efficiency η = 0.85, how much energy must you COMMIT (in τ)?
options:
  A. 22.9 τ        (distractor: dropped the moisture/latent-heat term)
  B. 24.5 τ        (distractor: heated the water but never vaporised it)
  C. 29.9 τ        (distractor: used the delivered energy — forgot ÷η)
  D. 35.2 τ  ✓     (correct: 29.9 kJ delivered ÷ 0.85 = 35.2 τ committed)
  E. 35,150 τ      (distractor: ×10³ unit slip, J↔kJ)
rationale (D): raise straw + bound water to ignition, vaporise the 8%
         moisture (latent heat) → ~29.9 kJ that must ARRIVE; divide by
         η to get committed energy. Each wrong option names the specific
         step skipped. (τ ≡ kJ, so 5.3 kJ of the 35.2 stays in the
         caster — the honest account of a novice "running hot".)
difficulty:     hard (near-edge; ZPD-appropriate for 'competent'→'proficient')
objectiveRef:   THAUM101.LO.4.2  ("compute a spell's committed energy from
                the price list, including phase-change terms")
taxonomyNodeRef: <ISCED-F 0533 Physics → thermodynamics → latent heat>
```

Note B and A are only ~6.9% apart — fine as distinct MC options, **fatal
for a ±10% free-response band**; the discrimination invariant catches
exactly this at author time (college-slate.md:281-303). This is the item
that becomes a **Practical** simply by swapping the answer surface (§5).

**Item B — Practical mode, same spec, "go do it" surface:**

```
prompt:  Ignite the straw bundle on the lab bench using a single cast.
         Report the energy you committed (τ) at the η shown on your focus.
evaluator: run the fire subsystem's ignition check against the bench
         instance; PASS iff the straw ignites AND the reported committed
         energy is within tolerance of the computed key (~35.2 τ here).
objectiveRef / taxonomyNodeRef: identical to Item A.
```

One generator spec, both study.com assessment surfaces — the "one
generator, two modes" claim (college-slate.md:174-186), realized in
study.com's own item vocabulary.

---

## 3. Objective tagging & prerequisites (answers brief §8.2, §9)

- **Learning objectives are the load-bearing metadata** for a credit
  recommendation. ACE/NCCRS reviewers map a course's stated **learning
  outcomes** to the credit award; every assessment item should trace to
  an objective, and every objective should trace to the lessons that
  teach it and the items that assess it. [known that objectives + course
  outcomes exist and drive the credit review; exact tagging schema —
  confirm].
- **Write objectives as measurable outcome statements** ("compute…",
  "distinguish…", "predict…"), one clause each, at lesson grain, rolled
  up to a smaller set of **course outcomes**. Your arcane-science
  material is already written this way — the Course-readiness section
  (arcane-science.md:1496-1536) is a de-facto objective outline (§8).
- **Prerequisite modelling** on study.com is lighter than your
  Discipline graph. study.com expresses prerequisites mostly as
  human-readable course descriptions and the adaptive engine's implicit
  ordering, not as a hard typed edge set. **Your `requires`/`specializes`
  edges (advancement.md:58-62) are richer** — so the mapping is lossy in
  the study.com→game direction (you can import study.com's ordering as
  `requires` hints) and *additive* in the game→study direction (you can
  hand study.com a real prerequisite graph it doesn't currently model).
- **The tagging hook to design for:** objective → taxonomy-node →
  ISCED-F. If Magic 101's objectives are tagged to taxonomy nodes that
  carry the same ISCED-F codes your Disciplines carry, the whole
  study↔game correspondence falls out of one join column (§6.1).

---

## 4. ACE/NCCRS assessment evidence — the honest read (answers brief §8.3)

This is the answer the brief asked for "the real one rather than the
hopeful one," so:

- **What ACE/NCCRS credit recommendations rest on** is a course with
  stated learning outcomes, a body of instruction, and a **summative
  assessment whose integrity they can vouch for** — historically
  proctored, now (across the category, not just study.com)
  **identity-verified open-book**. The credit hangs on the **final exam
  (and chapter tests)** as the assessment of record, tied to objectives.
  [known at this level; the exact ACE evidentiary requirements — confirm
  with the academic-partnerships insider, brief §8.3.]
- **Can the game's `deed` mode ever count toward credit-recommended
  assessment?** My honest read: **not in the near term, and you should
  not pitch that it does.** Credit-bearing assessment needs an instrument
  a review body can inspect and an identity it can verify. A `deed`
  witnessed by the game engine is *evidence of applied competence*, but
  it is (a) not a study.com-controlled instrument and (b) identity-bound
  only as strongly as the game account is. So:
  - **Deed stays a motivation + capability layer**, not a credit
    instrument — which is exactly what the brief's honesty rail already
    fears (brief §8.3) and the college slate flags open
    (college-slate.md:685-688). Confirmed: keep it there.
  - **The one exception worth exploring** is the reverse: a game **deed**
    could be a *reason a learner opts into* study.com's identity-verified
    assessment ("prove it for real to unlock the deed tier") — rigor as
    an unlock, the strategy doc's best line. The credit still comes from
    study.com's instrument; the game supplies the *demand* for taking it.
- **Provenance ladder — grade the signal, don't assume it.** The
  credential/claim must record **how** an assessment was verified:

  | Provenance | study.com source | Weight |
  |---|---|---|
  | `identity-verified` | final exam, TypingDNA + Veriff | strongest available today |
  | `unverified` | lesson quizzes, chapter tests taken un-verified | motivational; low weight |
  | `self-report` | learner asserts completion | claim-only, lowest |
  | (`proctored`) | legacy / opt-in higher-rigor tier if it ever ships | reserved slot |

  This ladder is vertical-agnostic by construction (CLEP proctored,
  Sophia open-book, a bootcamp project-graded — one schema, graded
  provenance, strategy doc's seam correction). It has **no home on the
  game side yet** — see §6.4.

---

## 5. The four assessment modes mapped onto the product (answers brief §9)

| Saxonberg mode | Maps onto study.com as | Fit | Notes |
|---|---|---|---|
| **Examination** (computed key, generated items) | chapter test / final exam | **Strong** | Your generator is *stronger* than the authored bank (leak-proof, per-student numbers). Emit study.com item instances (§2). This is the credit-bearing instrument. |
| **Practical** (perform, engine checks result) | lab project / performance task | **Partial** | study.com has no native "perform in a simulator" surface; this is the mode study.com *gains* from you. Depends on the inquiry build's `predict` gate (college-slate.md:724, 739-741). Not credit-bearing on its own today. |
| **Essay / viva** (LLM- or human-graded) | essay/project; TOEFL LLM-graded items are precedent | **Good** | LLM-graded default; the **viva** (oral defense as dialogue) is trivial in a text world and impossible for a content library — best demo of the medium (college-slate.md:141-146). Human-graded-by-a-*player*-instructor is a provenance question (§6.4). |
| **Deed** (engine-witnessed living) | **nothing** | **No product analog** | The differentiator and the thing a content library structurally cannot produce. **Not** credit-bearing (§4). Stays motivation/capability + the "opt into real rigor to unlock" hook. |

Where they **don't** map: study.com has no Practical/Deed surface at all,
and its MC bank is narrower than your generator. The mapping is therefore
**study.com ⊂ Saxonberg on assessment** — you implement all four; they
consume the two that fit their credit model (Examination, Essay) and gain
two they never had (Practical, Deed) as product surface.

---

## 6. The bidirectional integration architecture (the core of the ask)

Two directions. **Study → Game** is the credential/competence feed (the
cheap pilot). **Game → Study** is the adaptive-personalization feed (the
deep synergy). Design both; ship them in that order.

### 6.1 Study → Game: the claim faucet and the ISCED-F join

The game side is already socketed for this. The flow:

```
study.com event                     integration layer                 Saxonberg core
(chapter test / final passed,  ─▶  map course→Discipline(s)      ─▶   AdvancementApi
 with objective + provenance)       by ISCED-F code + tag map          .recordClaim(...)
                                                                        │ appends a `claim`
                                                                        │ TranscriptEntry
                                                                        ▼
                                                             Competence.derive (on read)
                                                                        │ band may cross
                                                                        ▼
                                                        refreshConferrals → verbs afforded
```

Concretely, keyed to the source-of-truth mechanics:

1. **Join on `iscedf`, not on names.** A study.com course/objective
   carries (or is assigned, in the mapping table) an ISCED-F code; the
   game Discipline with the matching `iscedf` (advancement.md:44-53) is
   the target. Join on the **durable `key`** for recording
   (advancement.md:38-42) — re-pathing the catalogue never invalidates
   banked evidence.
2. **Mint a `claim` Transcript row**, not a deed. `claim` is "the academy
   faucet … no consumer mints claims this increment"
   (advancement.md:86-87) — this integration is that consumer. Row shape
   `{owner, kind:'claim', discipline, difficulty, outcome, tags}`
   (advancement.md:79-80). `difficulty` comes from the assessment's own
   difficulty; `outcome` from pass/score; **`tags` carries provenance**
   (§6.4).
3. **Append primitive:** `AdvancementApi.recordSignature` /
   `recordDeed` exist (advancement.md:184-185); a **`recordClaim`-shaped
   sibling** is the one new append seam (or reuse `recordSignature` with
   `kind:'claim'`). Band recompute + verb conferral then happen **for
   free** via derive-on-read (advancement.md:157-169).
4. **Two gaps to build on the game side, both already named as
   deferred:** (a) the **claim-minting producer** itself
   (advancement.md:271-273 — "the learning-platform sensor bridge") and
   (b) **login-time `refreshConferrals`** so conferred verbs survive a
   relog (advancement.md:271-273). Nothing else is missing.

**The two mapping regimes (this is the vertical-agnostic seam, §7):**

- **Generic academic transfer (vertical-agnostic).** A real study.com
  course whose objectives carry real ISCED-F codes → `claim`s on the
  **real-skill Disciplines** that share those codes (thermodynamics,
  dimensional analysis, statistical literacy…). This works for *any*
  ed-tech partner's catalog with zero fiction knowledge. It's the
  licensable core behaviour.
- **Fiction-bound course (proprietary).** **Magic 101** is authored into
  the fiction; its chapters map to the **invented magic-grid
  Disciplines** (advancement.md:241-252) through a **course→Discipline
  mapping table that lives in the study.com proprietary layer** (§8.5).
  The core never learns "what magic is"; it just applies claims to the
  Disciplines the table names.

> **Guardrail (both regimes):** a claim is *evidence weighted by
> provenance; it does not directly set a band* (college-slate.md:701-703).
> An identity-verified final is strong evidence; an unverified lesson
> quiz is weak. Crossing a band still requires the estimator to be
> convinced — so an external feed **cannot** mint capability by fiat, and
> "real money never buys advantage" holds because money buys *content*,
> content produces *evidence*, and evidence must clear the estimator
> (college-slate.md:695-699).

### 6.2 Game → Study: the adaptive-personalization feed (the real synergy)

This is the direction the brief flags as "the version where the two
products actually improve each other" (brief §8.5) — and it's a natural
fit study.com's own product is *built to consume*:

- **study.com's adaptive engine already ingests a per-node
  strength/weakness map** (the diagnostic → study-plan pipeline, §1.2).
  Saxonberg's **Competence estimator produces that map continuously**,
  per Discipline, as a byproduct of play — and, via **named distractors**
  (§2.2), it produces something study.com's diagnostic *cannot*: **which
  specific misconception** a learner holds (they picked the
  "dropped-the-moisture-term" option, not just "got it wrong").
- **The outbound signal shape** (honesty firewall preserved): send
  **bands + misconception tags, never the raw θ**. The estimator's
  internal scalar never crosses the Api boundary
  (advancement.md:141-148); the adaptive feed is
  `{ taxonomyNode, band, missedMisconceptions[] }` per learner. That is
  a *stronger* diagnostic than a percentage-correct, and it respects "no
  quantity without a referent."
- **The loop that makes each product better:**
  - Game → Study: "you keep dropping the latent-heat term in the lab →
    study.com surfaces the phase-change lesson next." Applied failure in
    the world **personalizes instruction**.
  - Study → Game: "you passed the thermodynamics final → your caster's
    delivery-efficiency ceiling rises." Instruction **unlocks
    application**. This is the seam beat end-to-end (strategy doc video
    #1).
- **Latency tiering (from the interview, strategy doc):**
  instrumentation exists, distribution doesn't. So:
  - **Pilot** on a scheduled **warehouse export** for a flagged cohort —
    daily-ish grain. Good enough to prove the claim tier (coursework
    knowledge tolerates batch).
  - **Productize** with a thin **pub/sub relay** on the existing event
    stream for the **deed-tier moment** — pass the final, walk into the
    University, the conferral fires while it still feels like consequence.
  - The game→study adaptive feed is comfortable at batch grain
    throughout — personalization doesn't need to be real-time.

### 6.3 The event contract (both directions, one schema family)

Keep the wire vocabulary tiny and partner-neutral:

```
INBOUND  (study → game)   LearningEvent {
  learnerRef       external learner id  (maps to a game owner)
  courseRef        study.com course id
  objectiveRef     objective / taxonomy node
  iscedf           ISCED-F code(s) for the objective        ← the join column
  kind             'course.completed' | 'exam.passed' | 'chapter.mastered'
  score / outcome
  provenance       'identity-verified' | 'unverified' | 'self-report' | 'proctored'
  occurredAt
  idempotencyKey   for at-least-once delivery (see recordOnce, below)
}

OUTBOUND (game → study)   CompetencySignal {
  learnerRef
  taxonomyNode / iscedf
  band             'untrained'..'expert'   (never raw θ)
  missedMisconceptions[]                   (named distractor tags)
  provenance       'deed' | 'claim'
  observedAt
}
```

At-least-once inbound delivery pairs with the chronicle's
`recordOnce(owner, key, …)` idempotent seam (chronicle.md:93,111-120) —
use `idempotencyKey` as the once-key so a redelivered warehouse export
doesn't double-bank a claim.

### 6.4 Assessment provenance — the one net-new game-side field

study.com's real signal is **identity-verified open-book**, so the
credential/claim must carry *how* it was verified. The credential
substrate has no slot for this (`payment | travel | key` only,
credential.md:34). Two options, and I recommend the second:

- (a) a new `CredentialKind` record carrying assessment conditions — but
  credentials are authorization instruments, not evidence, so this
  overloads the wrong substrate.
- (b) **Carry provenance as `tags` on the `claim` `TranscriptEntry`** —
  `tags` is the open-vocabulary extension point (advancement.md:80,
  chronicle.md:20), the estimator can weight evidence by it, and the
  deed-vs-claim `kind` split already encodes the coarsest form
  (engine-witnessed vs asserted). **Recommended.** The provenance ladder
  (§4) becomes a tag vocabulary; deed-weight is graded by it exactly as
  the strategy doc's seam correction wants — vertical-agnostic, no
  per-partner hardcoding.

---

## 7. The architecture split — vertical-agnostic core vs proprietary layer

The user's requirement: **keep Saxonberg the platform vertical-agnostic,
build a separate proprietary integration layer for study.com to plug
into.** The good news is the game side is *already* built this way (the
advancement build's scope test is literally "does it know what a sword
is?", advancement.md:32-36). The seam:

```
┌─────────────────────────────────────────────────────────────────┐
│  SAXONBERG CORE  — vertical-agnostic, licensable to any ed-tech    │
│                                                                    │
│  • Discipline catalog + ISCED-F codes (advancement.md:44-53)       │
│  • Transcript (deed/claim), Competence derive-on-read, bands       │
│  • recordClaim / recordSignature append primitive                  │
│  • band-crosses → refreshConferrals → verbs afforded               │
│  • the item GENERATOR (spec+seed, computed key, IR out)            │
│  • University composition (enrollment=contract, teaching=employ,   │
│    cohort=group, forums, exam hall, practicum) — all shipped subs  │
│  • the two wire schemas (LearningEvent in / CompetencySignal out)  │
│                                                                    │
│  Knows: ISCED-F codes, bands, evidence. Knows NOTHING about        │
│  study.com, or about magic-as-a-partner-subject.                   │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  two neutral wire schemas (§6.3)
┌───────────────────────────────┴───────────────────────────────────┐
│  STUDY.COM INTEGRATION LAYER  — proprietary, one per partner        │
│                                                                    │
│  • Inbound adapter: study.com event stream / warehouse export      │
│    → LearningEvent (auth, learner-id mapping, provenance mapping)   │
│  • Outbound adapter: CompetencySignal → study.com adaptive-engine   │
│    input format                                                    │
│  • The COURSE→DISCIPLINE mapping table (incl. Magic 101 →           │
│    magic-grid Disciplines, the fiction-bound regime)               │
│  • The item-IR → study.com-item-instance renderer (§2.2)           │
│  • Magic 101 content authored in study.com's schema (§8)           │
│  • latency tiering (warehouse pilot ↔ pub/sub relay)               │
│                                                                    │
│  Knows: study.com's schema, ids, event stream, and the fiction     │
│  mapping. This is the ONLY place study.com specifics live.         │
└───────────────────────────────┬───────────────────────────────────┘
                                 │  study.com's Java/Hibernate services,
                                 │  Solr, Cassandra, event stream (interview)
┌───────────────────────────────┴───────────────────────────────────┐
│  STUDY.COM  — unchanged for a pilot (one outbound feed is the ask)  │
└─────────────────────────────────────────────────────────────────────┘
```

**The invariant that keeps it clean:** the core speaks only **ISCED-F
codes, bands, and evidence**. Everything study.com-specific — ids,
schema, the event-stream shape, and the *fiction* mapping (Magic 101 →
which Disciplines) — lives in the integration layer. A second ed-tech
partner is a **second integration layer** against the same two wire
schemas; the core doesn't change. That is the platform-license endgame
(strategy doc model E) made concrete: **each partner's taxonomy is a
projection onto the shared ISCED-F spine; each partner is one adapter.**

**Where "colleges of the University" lands:** a study.com "college" is
the same pattern as a **guild** — an institution claiming a *projection
over a subgraph* of the shared canonical taxonomy (advancement.md:326-360),
competing on *how well* it teaches, not on owning the knowledge. So the
core need not model "study.com" at all; it models a guild/college that
happens to be backed by an external adapter.

---

## 8. Magic 101 — the synthesized course (in study.com's real shape)

Synthesizing [arcane-science.md](./arcane-science.md) against §§1-2 above.
This is the skeleton the brief §9 asks for. Numbers are honest against the
shipped build; **re-verify every quantity and history claim** — the
arcane-science audit log flags that its most confident passages have
historically hidden errors (arcane-science.md:17-27).

### 8.1 Course metadata

```
title:            Magic 101: Foundations of Thaumology
subject:          Science  (Physical Sciences)
credit target:    3 semester hours, lower division   [aspirational]
ISCED-F spine:    0533 Physics (primary), 0541 Mathematics,
                  0223 Philosophy & ethics (one unit)
course outcomes (roll-up of the lesson objectives):
  1. Account for the energy in a magical act using conservation and the
     price list, in kJ, with correct phase-change and efficiency terms.
  2. Apply thermodynamics (specific/latent heat, exergy, Carnot COP,
     the third-law cost curve) to predict whether a spell is affordable.
  3. Use dimensional analysis to reject any claim that cannot be
     dimensionally closed.
  4. Fit affine and exponential models to measured data; state a result
     with its range, its error, and what it is silent about.
  5. Read a scientific paper for claim, evidence, range, and silence,
     and distinguish an honest overreach from a fabrication.
  6. Reason about a loaded scientific question (the ethics of a measured
     intercept) without collapsing positive and normative claims.
```

Every outcome is a **real, gradable skill** — the whole demonstration
(brief §4). None of them is "know a magic fact."

### 8.2 Chapter / lesson skeleton

study.com sizing: ~8 chapters, ~5-8 lessons each (~5-10 min video +
transcript + a short lesson quiz), a **chapter test** per chapter, a
**final exam**. Mapped from the Course-readiness strands
(arcane-science.md:1496-1536):

| # | Chapter | Lessons (objective seeds) | Assessment |
|---|---|---|---|
| 1 | **The one impossible thing** | the postulate; local-fails/global-holds; the four consequences; the caster is always an endpoint; why locality and nothing else | quiz + chapter test |
| 2 | **Energy accounting (mana is kilojoules)** | the thaum ≡ kJ (Halloway Equivalence); reserve vs recovery (stock vs flow); the ¼-banana budget; the one-grenade-a-day ceiling | quiz + chapter test |
| 3 | **The price list (exergy)** | why heat is cheap and coherent light is dear; η<1 warms the caster; the second law as anti-power-creep; worked firebolt | quiz + **calorimetry lab (Practical)** |
| 4 | **Heat, phase change & the cold problem** | specific vs latent heat; conjure-water as a dehumidifier (the mana bar ≠ the danger meter); Carnot COP; the third-law cost curve; why no flat-mana cold spell can exist | quiz + chapter test |
| 5 | **Momentum, recoil & dielectric breakdown** | every push shoves both ways; bracing; Control·Body as one of the dearest acts; spark needs 3 kV/mm; lethal in amps not thaums | quiz + chapter test |
| 6 | **Measurement & modelling** | dimensional analysis as a lie-detector; affine vs exponential models; curve fitting; extrapolation and its dangers; error bars; the Reeve Line lab | quiz + **Reeve-line lab (Practical)** |
| 7 | **Reading the literature** | claim/evidence/range/silence; the eight-paper shelf; statistical power & the winner's curse; confounding; the unanswerable paired papers | quiz + **essay/viva (Essay mode)** |
| 8 | **Ethics of a measured intercept** | f > 0 and what it means; therapeutic vs autonomous; positive vs normative; the Ordinance's program as a long experiment; the accountability ledger | quiz + chapter test |
|   | **Final exam** | course-spanning; generated items with computed keys (§2); the "which paper overreached" item as the capstone | **credit-bearing instrument** |

The five shipped experiments (arcane-science.md:1437-1460) become the
**Practical** assessments in chapters 3, 6 (+ the ward/boundary/circuit
experiments as optional labs). The Practicum room already runs them with
no new code (college-slate.md).

### 8.3 The final, and what "done" looks like

The final is the **credit-bearing instrument** and the showcase for the
generator: every item is `(spec, seed)` with a computed key
(college-slate.md:231-238), so every learner gets different numbers,
answer-sharing does nothing, and the "higher integrity at lower friction"
claim (brief §6) is literally true. The capstone item is the
**unanswerable exam** (arcane-science.md:1042-1060): hand the student
papers #2 and #3, ask which deliberately overreached — correct answer is
"you can't tell from the artifact," teaching that intent lives in
provenance. That single item is the course's thesis and the seam's
thesis at once (provenance is the thing you can't fake).

### 8.4 A note on Compact 200

The same skeleton pattern applies to Poli Sci 200
([compact-political-science.md](./compact-political-science.md)) with the
generator running over **rules instead of physics** (college-slate.md:305-319),
ISCED-F **0312 (political sciences & civics)**. Naming both proves the
method generalizes across a catalog rather than magic being a special
case (brief §5) — which is the actual platform claim and the reason the
vertical-agnostic split (§7) is worth building.

### 8.5 The Magic 101 → Discipline mapping table (proprietary layer)

This table is the fiction-bound regime (§6.1) and lives in the study.com
integration layer, **not** the core. Sketch — the Saxonberg agents own
the real magic-grid Discipline keys (advancement.md:241-252):

| Magic 101 chapter/objective | Provenance-weighted claim raises… |
|---|---|
| Ch 2-3 (energy accounting, price list) | the caster's **delivery-efficiency** competence → raises the η ceiling (the anti-power-creep axis, arcane-science.md:328-342) |
| Ch 4 (heat & cold) | **thermal/fire** Discipline competence; unlocks nothing a novice can't attempt, but *grades* the outcome (grade-not-gate, advancement.md:229-232) |
| Ch 6 (measurement) | the **awareness / metrology** Discipline — instrument reading, the survey-meter labs |
| Ch 7-8 (literature, ethics) | knowledge-channel Disciplines; the ethics unit ties to the accountability ledger and Compact 200 |

The core applies these as `claim`s on the named Disciplines; it never
learns what "delivery efficiency" *means* in the fiction. Swap the table,
point the same machinery at Compact 200 or a real physics course.

---

## 9. What I assumed, and what a human must confirm (brief §9, last bullet)

The brief said this is "genuinely the most useful thing" the response
could return, so:

- **[confirm] Exact schema field names** — course/chapter/lesson/objective
  and the item model. I've given the real *shape* [known/likely]; the
  literal field names should be read off `academy-services` /
  `assessment-services` before the IR→item renderer (§2.2, §7) is coded.
- **[confirm] The taxonomy-node schema** and whether nodes carry (or can
  be assigned) ISCED-F codes. **The entire join in §6.1 depends on this.**
  If study.com nodes can't carry ISCED-F, the mapping table moves fully
  into the proprietary layer (still fine, just less automatic).
- **[confirm] Does the adaptive engine accept an inbound signal?**
  (brief §8.5, college-slate.md:689-691.) §6.2 is the highest-value
  integration *if yes*, and unbuildable *if no*. This is the single most
  important product question in the doc.
- **[confirm] ACE/NCCRS evidentiary requirements** (brief §8.3) — pins
  whether Deed can ever count (my read: no, §4) and what provenance the
  claim must carry.
- **[confirm] Event-stream / warehouse access** — the §6.3 inbound
  adapter assumes the interview's picture (instrumentation exists,
  distribution is warehouse-only, pub/sub to be built). Confirm the
  export cadence for the pilot cohort.
- **[assumed] 3 semester hours / 8 chapters for Magic 101** — sized to a
  typical College Saver course; adjust to the real median once the
  schema lands.
- **[corrected in this doc]** the brief's single-taxonomy model (→ two
  trees, §1.1) and the "procedurally-generated items are study.com's
  native format" hope (→ study.com is static-authored MC; the generator
  is *yours*, study.com renders instances, §2).

## 10. Open design questions this raises for the Saxonberg side

- **The sensor-bridge mapping table** (advancement.md:785-789) — "when a
  learner masters a chapter, *what exactly* happens to the character?"
  §8.5 sketches it for Magic 101; the general per-Discipline mapping
  (which channel — skill/knowledge/conditioning — a given objective
  feeds, authored-per-subject vs derived) is still the biggest unbuilt
  seam. **Start with the fiction-bound table; generalize after the
  pilot.**
- **`recordClaim` signature** — add a claim-minting sibling to
  `AdvancementApi`, or overload `recordSignature` with `kind:'claim'`?
  (advancement.md:184-185.)
- **Login-time `refreshConferrals`** — required so an externally-granted
  verb survives relog (advancement.md:271-273). Small, but it's on the
  critical path for the deed-moment feeling real.
- **Provenance tag vocabulary** — ratify the §4 ladder as the `tags`
  vocabulary on claim rows, and set the estimator's evidence weights per
  tag (§6.4).
- **Overjustification guard** (advancement.md:800-802) — once real
  coursework is the signal, keep verifying the reward is *chosen
  capability*, not a carrot. The high-stakes reconciliation (strategy
  doc) is the governing constraint: the avatar borrows its stakes and has
  none of its own that compete.

---

*Written by the study.com-side agent in response to
[study-com-brief.md](./study-com-brief.md) §9. Aspirational throughout —
no part of this seam has touched a live study.com environment. Confirm
every **[confirm]** with the resident insider before any of it is coded.*
