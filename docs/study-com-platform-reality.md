# Study.com platform — verified reality (2026-08-03)

> **Status: verified ground truth.** Checked on 2026-08-03 against the
> live **stage** database (a nightly mirror of prod) and the actual
> `academy-services`, `assessment-services`, and `tools-cms` source. This
> doc is the **"start from truth"** reference for the whole `study-com-*`
> set. Where any design doc conflicts with this one, **this one wins** —
> the design docs were written from product knowledge + inference and
> several load-bearing assumptions turned out wrong.
>
> Anchors are real table/column names (stage DB) and `repo … file:line`
> from the service code. Nothing here is inferred; each claim was read off
> schema or source. Still-open items are in §10, marked `[confirm]`.

---

## 0. Why this doc exists (the corrections that prompted it)

The earlier docs ([study-com-integration.md](./study-com-integration.md)
et al.) built the architecture's spine on **ISCED-F codes as the join
key**, described Study.com items as **static multiple-choice**, and said
**proctoring was removed**. Verified against the platform, **all three
were wrong.** §9 is the full claim→reality table; the body is the truth
to design against.

---

## 1. Segments & products (source: Notion product KB + `academy-services`)

Users buy **plans/products**; the business manages **segments**. The real
structure:

- **K-12** — Teachers (classroom/school), Parents/Homeschool.
- **College Learners** — Study Help / **Answers** (homework help).
- **Professional Prep** — **Test Prep** (~50+ suites; $59.99/mo) and
  **College Accelerator / "CX"** — the **credit-transfer** product,
  **$199/mo**, credit earned by passing proctored finals.

Product line is encoded as `SiteResource.Subdomain`
(`COLLEGEPREP, GRADUATEEXAMS, HOMEWORK, MEDICAL, NURSING, REALESTATE,
TEACHINGLICENSE`, with an `isTestPrep()` boolean) and `SiteResource.Type`
(`TEST_PREP_*`, `HOMESCHOOL_HUB`, …) — `academy-services …
SiteResource.java`. **CX is the only credit-bearing product**, and it is
a different structure from test prep (§5).

---

## 2. Content model (source: `academy-services`)

**Hierarchy is `Program → Course → Topic → Lesson`** — a single
self-referential `Academy_Asset_Tree` + `AcademyAsset`. **"Chapter" is
not a stored entity** — it's a derived display index on a Topic
(`Topic.getChapterNumber()`). The earlier docs' "course → chapter →
lesson" is off by a name: the level is **Topic**.

- **Course** (`resource/Course.java`): `creditEligible`,
  `inAceReviewMode` (a workflow flag — the only "ACE" token in code),
  `certificateEligible`, `certificateCourseHours`. **No ACE/NCCRS code
  and no semester-hours field exists.** Credit is boolean flags.
- **Lesson**: a video (Wistia embed) **plus a text transcript**
  (`Content` row `label = TRANSCRIPT`) **plus** longform text. Media
  types: `Multimedia.Type { VIDEO, PAYWALL_VIDEO, AUDIO, IMAGE, … }`. So
  a lesson is already **dual-register** (watch or read) — the text-first
  client can render it natively.
- **No learning-objective entity.** Grep for `objective` across
  `academy-services` returns zero. The nearest thing is `SkillNode`
  (K-12 teaching standards: `standard` e.g. "Common Core",
  `standardMappingCode`, state ISO codes) and a free-text
  `CourseNode.objective` string. **An objective, operationally, IS a
  Concept / ExamTaxonomyNode tag** (§3–4).

---

## 3. The taxonomy reality — three trees, no ISCED-F (THE correction)

**There is no ISCED-F, CIP, or NCES field-of-study code anywhere in
Study.com** — verified by grepping both service repos clean and finding
no such column in the DB. What actually exists:

| Tree | Table | What it's for | Per-member state |
|---|---|---|---|
| **Concept** | `Concept` (graph via `ConceptForParentConcept`) | **CX / course** mastery | `Member_Concept_Mastery` — **Bayesian** `masteryMean/SD/Alpha/Beta`, `master` |
| **ExamTaxonomyNode** | `Exam_Taxonomy_Node` (tree; `distributionPercentage` per node) | **test prep** | `Study_Priority` — score-prediction per node |
| **Classification** | `Classification` (`parent_classification_id`) | **fields of study / programs / degrees** — CIP-*flavored* names ("Physics, General", "Nuclear Physics") | — |

- A `Question` can tag into **both** `concept_id` and
  `exam_taxonomy_node_id`; a node carries **both** `courseSiteResourceId`
  and `testPrepSkillSiteResourceId`.
- **The only external anchor that exists at all** is a **DBpedia** link on
  `Concept` (`dbpedia_subject_id`, `dbpedia_resource_id`) — a
  Wikipedia-derived knowledge-graph id, not a credentialing standard.

**Consequence for the integration:** the cross-platform join is an
**authored crosswalk** — Saxonberg `Discipline` ↔ Study `Concept` /
`ExamTaxonomyNode` id — that lives in the **proprietary adapter**.
Saxonberg's `iscedf` stays its *internal* spine; it is **not** a shared
join key. DBpedia is an optional secondary anchor. (This is arguably
better: Study's taxonomy stays theirs, and the crosswalk is exactly the
partner-specific artifact the vertical-agnostic split wanted.)

### 3a. There is no authored prerequisite / readiness graph (verified 2026-08-06)

A later check — prompted by a Study product reviewer's comment on the
StudyWorld doc (*"we have subject tags… not sure we have skill tags…
prerequisite interdependencies… possibly for Test Prep, fairly sure not for
CX"*) — confirms the reviewer is **right**. Study has **rich taxonomy and
rich mastery estimates, but no authored "X must precede Y" dependency graph**
to ingest. Four artifacts, none of which is a prerequisite DAG:

| Artifact | ~rows (stage) | What it is | What it is NOT |
|---|---|---|---|
| `ariel2_0.Concept` | 434k | DBpedia-derived subject taxonomy (hierarchy) | learning-order / prerequisites |
| `raptor.Concept_Relation` | 131k | **statistical** concept association (`slope_mean/sd`, `ranking`; many NULL) | authored prerequisites |
| `ariel2_0.Skill_Node` | 1.0M | **standards-aligned** skill tree (`standard` e.g. Common Core, `standardMappingCode`, `depth`, `sequence`) | a cross-node dependency DAG; largely unlinked to `Concept` (`concept_id` mostly NULL) |
| `raptor.Member_Concept_Mastery` | 880M | per-member Bayesian mastery **per concept** (α/β) | *what must precede what* |

- **`Concept_Relation` looks like a dependency graph but isn't.** Sampled
  rows relate **"Spanish goat" → "Counting" / "Decimal time" / "Spanish,
  Ontario"** with weak slopes (~0.5) and many NULLs — DBpedia entities
  clustered by statistical co-occurrence, not pedagogy. It cannot answer
  "ready to progress?"
- **`Skill_Node` is the only authored structured curriculum** — a real
  standards tree (e.g. *California Common Core Math → Number & Quantity /
  Algebra / Functions → N-RN, A-SSE, F-IF…*) with within-sibling `sequence`.
  But `sequence` is order-among-siblings, **not** explicit cross-node
  prerequisite edges, and it's **standards-aligned (K-12-flavored)** —
  consistent with the reviewer's "exists for Test Prep, not CX" instinct.

**Breadth profile (`Skill_Node` roots, verified 2026-08-06):** the authored
skill tree is overwhelmingly **K-12 + AP + intro-college academic content,
organized by US *state-standards* frameworks** — math-dominated because each
course (Algebra 1, Geometry, Algebra 2…) is **replicated across all ~50
states**. The `standard` *column* is mostly empty (1.59M of ~1.6M active
nodes have none; `academy_subject_id` is unpopulated too) — framework
identity lives in the **root title**. Coverage, richest → thinnest:

- **Deep:** K-12 **math** (per-state trees), then **science**
  (Biology/Chemistry/Physics), **ELA** (grades 9–12), **social studies /
  US & world history**; **AP** (Bio, Calc AB/BC, Chem, Physics 1/2/C, Stats,
  US/World History, English); intro **college** math/stats.
- **Thin:** **CTE career clusters** (Healthcare, Finance, Education,
  Manufacturing, Agriculture, Supply Chain…) and the odd teacher-cert exam
  (e.g. *GACE History 721*) — single shallow roots, not deep trees.
- **Absent as skill structure:** **CX** credit subjects and **professional
  test-prep** (nursing entrance, real estate, Praxis content) — no authored
  skill tree.

Two consequences: (1) **it reinforces the math/science-teacher beachhead —
hard**: the subject a K-12 math/science teacher will *teach* is exactly where
Study's authored skill structure is **deepest**. (2) **It's a mismatch to the
StudyWorld doc's target populations** — the doc pitches **CX + professional
Test Prep**, which are precisely where authored skill structure is *absent*;
the rich structure is **K-12**, a product the doc barely features. So
"taxonomy = progression" is *most* buildable for K-12 and *least* for the
populations the doc currently leads with.

**Consequence for the integration:** the catalog's **categorization** maps
cleanly (taxonomy → game subject/mastery structure) and the **mastery
estimates are a genuine, under-sold asset** — but **progression / readiness
gating is not an ingestible feed.** "Which concept unlocks which" must be
**derived** (from `Skill_Node` sequence + standards + mastery correlations)
or **authored** in the adapter/CMS. It is adapter *work*, not existing data.
Any StudyWorld claim that "the subject taxonomy becomes the progression
structure" must split: **categorization ✅ (ingestible), prerequisite
ordering ❌ (build item).** Silver lining: the one place authored sequencing
*does* exist is **standards-aligned math** — which reinforces the math/science
beachhead ([study-com-cx-and-the-aspiring-teacher.md](./study-com-cx-and-the-aspiring-teacher.md)
§5), the subjects with the best skill structure to build on.

---

## 4. Assessment / question model (source: `assessment-services`)

- **`Question` → table `Quiz_Question`.** Fields: `prompt` (stem),
  `explanation` (rationale), `options` → `Quiz_Question_Option`
  (`text`, `correct` flag), `correctAnswer` (now a serialized string,
  graded by adapter), `type`, `score` (points), `concept_id` /
  `secondary_concept_id`, `exam_taxonomy_node_id`, `question_passage_id`
  / `question_passage_sequence`, `rubric_id`.
- **Not multiple-choice-only.** `Question.Type` has **~20 values**:
  `MULTIPLE_CHOICE, MULTIPLE_CHOICE_ORDERED, MULTI_SELECT, MULTI_BLANK,
  SELECT_N, ESSAY, FREE_RESPONSE, HOTSPOT, MATRIX_SINGLE_SELECT,
  MATRIX_MULTI_SELECT, MATRIX_MULTI_SELECT_GROUPING, ORDERED_LIST,
  BUILD_SENTENCE, FILL_IN_LETTERS, FLASHCARD, TOEFL_SPEECH, TIMELINE,
  T_CHART, VENN_DIAGRAM, AI_MASTERY`. Essay carries an authored
  **`llmRubric`** and is **LLM-graded**; `TOEFL_SPEECH` and `AI_MASTERY`
  are LLM/AI-graded.
- **Story/scenario questions are first-class.** `Question_Passage` has
  `passage_text` and a **`case_study` boolean**; multiple questions
  attach via `question_passage_sequence`; `Exam_Instance` carries
  `supportsCaseStudyPassages` / `supportsPassageBasedQuestions`; and
  tools-cms authors a **progressive reveal** (`case-reveal="N"` /
  `case-hide="N"` markers that unfold as the student advances). **This is
  the schema-level proof that "questions are little stories" is real.**
- **Difficulty is not IRT and not on the question.** `Question_Stats`
  holds a **Bayesian** `prob_right_if_master` / `prob_right_if_dimwit`
  (Beta params) feeding an R/Rserve mastery engine. Difficulty-as-enum
  exists only in niches (`InstitutionAssessmentQuestion.Difficulty
  {BASIC,INTERMEDIATE,ADVANCED}`, TOEFL `CefrLevel`).
  - **This aligns with Saxonberg's estimator.** Study's "master vs
    dimwit" Beta params are conceptually slip/guess; both platforms
    already do *Bayesian mastery per node*. The adaptive-feed synergy
    ([study-com-adaptive-feed.md](./study-com-adaptive-feed.md)) has a
    real socket, not a hoped-for one.
- **Containers:** `QuestionBank → Quiz`; `ExamTemplate` / `Section` /
  `Page`; `Exam_Instance` (`AlgorithmType { ORIGINAL, PROPORTIONAL,
  FULL_LENGTH_PRACTICE_FINAL, EVENLY_DISTRIBUTED }`); `Proctored_Exam`.
- **CX already has interactive, LLM-graded activities** — `AiMastery`
  multi-step (`AiMasteryStepType { LLM_CHAT, USER_MULTIPLE_CHOICE,
  USER_CONFIRMATION, USER_TEXT }`) and `GradableCourseProject`. These are
  the closest thing Study has to a "lived scenario," and they live on the
  **CX** side.

---

## 5. Adaptive engine & pacing (source: `assessment-services` + stage DB)

Two products, two engines, two pacing models:

- **Test prep → readiness for a real external exam.** The terminal event
  is **passing the learner's actual, external test on its real date** —
  which the site **simulates** with a **full-length practice final** (the
  `FULL_LENGTH_PRACTICE_FINAL` algorithm honors each node's
  `distributionPercentage`, mirroring the real exam's blueprint) plus a
  per-node **score prediction**. `StudyPriorityComputer` predicts a
  per-node score from the member's answered questions (≥5/section) and
  `StudyPriorityThresholdRanker` ranks the weakest-predicted nodes highest
  (VERY_HIGH…LOW) to drive the learner toward that readiness. Individual
  practice *sets* are flagged `UNPASSABLE` — but that's a technicality
  (a set doesn't gate anything on its own); **the end state is real and
  external, and the simulated full-length final is its on-site dress
  rehearsal.** `Study_Priority` itself carries no date; the date lives on
  the orientation/plan layer below.
- **The exam date is captured, but the engine doesn't pace on it.**
  `Test_Prep_Orientation_Questionnaire` records `future_exam_date`,
  `has_scheduled_exam`, `is_scheduled_date`, `studying_goals`, plus rich
  self-assessment Likerts (confidence, motivation, where-to-focus). A
  `Study_Plan` / `Study_Plan_Period` schedule layer exists (with
  `end_date`, `syllabus`, calendar periods) — but the **test-prep-
  specific** schedule (`TEST_PREP_STUDY_SCHEDULE`) has only **51 rows**;
  the 2M-row use is a generic `STUDY_GOAL` reminder. So the date is a
  **real captured input + soft reminder**, not the driver of what's
  served.
- **CX → pass-for-credit, self-paced.** CX practice/finals are
  **passable** (`PRACTICE_FINAL`, `PROCTORED_FINAL` carry
  `passed`/`passingPercent`, link `creditProgressId`); progress is lesson
  coverage; the learner works until they **pass the final to earn
  credit**. **No external date.**

**The design consequence** (developed in
[study-com-classroom-model.md](./study-com-classroom-model.md)): CX suits
a self-paced **classroom**; test prep suits a **countdown coach** that
consumes both the `future_exam_date` and the live weakness ranking and
paces to the *learner*.

---

## 6. Proctoring reality

`Proctored_Exam` is **alive**, with `Typing_Dna_Result_For_Proctored_Exam`
and `Veriff_Result_For_Proctored_Exam` beside it. So the real state is an
**identity-verified proctored final** (TypingDNA typing-cadence + Veriff
ID/selfie), not necessarily live-human supervision — and **CX earns
credit through it**. "Proctoring was removed" (from the strategy doc) is
too strong; the entity and the credit path are intact.

---

## 7. The learning-content CMS (source: `tools-cms`)

`tools-cms` is a **thin authoring + workflow shell** over the backend
services (it persists almost nothing itself). It authors **flat,
item-based content well**:

- Rich question authoring across **18 types** (per-type editor
  directives: multiple-choice, multi-select, essay, free-response,
  hotspot, matrix, ordered-list, build-sentence, flashcard, toefl-speech,
  …); **case-study passages** with the progressive-reveal markers;
  multi-part passage sets; essay **`llmRubric`**; taxonomy node
  create/move over `COURSE_NODE / EXAM_TAXONOMY / SKILL_NODE /
  SUBJECT_PILLAR_TAXONOMY`; AI-assisted drafting (Langflow generates
  draft questions/taxonomies, human edits).
- **What it cannot express: scenario / branching / role / simulation
  content — at any layer it controls.** There is no entity for branching
  state, role definitions, per-choice consequences, or a dialogue graph.
  The `case_study` progressive-reveal passage and the assessment-side
  `AiMastery` multi-step are the *only* primitives in that direction, and
  `AiMastery` isn't even authorable in tools-cms.
- **The gap is the backend content MODEL, not the CMS UI.** Authoring
  true scenario/role content would require **new backend entities +
  services first** (a scenario graph, a role model, a branching-outcome
  model), then CMS views on top.

**This decides "extend which CMS":** neither CMS *alone* can express
lived-scenario content, and the missing piece is a **world/consequence
model** — which is precisely what Saxonberg already is. So the answer is
**not** "extend Study's CMS to author scenarios"; it's "let Saxonberg be
the expressive layer and *derive* scenarios from Study's flat content."
Detail in [study-com-classroom-model.md](./study-com-classroom-model.md).

---

## 8. Real examples — "questions are little stories" (verbatim from the bank)

**A. Teacher certification (a case study, `Question_Passage` #41150):**
> *"Mr. Kim teaches an 8th-grade science class during a unit on
> ecosystems… he notices that students generally summarize accurately but
> struggle to integrate evidence from multiple sources…"*
> Q: *"Which instructional decision would best support students'
> disciplinary literacy development?"* → **"showing how to combine
> scientific proof from more than one scientific authority when writing"**
> (the data shows evidence-integration is the weakest skill).

**B. Pediatric nursing (standalone scenario, `Quiz_Question` #2352178):**
> *"A pediatric nurse is caring for a 3-year-old who needs an injection.
> The child is crying and refusing to cooperate. What approach should the
> nurse use?"* → options: restrain firmly / **use therapeutic play to
> reduce anxiety** ✓ / ask the parents to leave / postpone.

**C. Thermodynamics (a `MULTI_SELECT`, `Quiz_Question` #2582702):**
> *"A sealed rigid tank and an open cup both hold the same ideal gas at
> room temp. The tank is heated; the cup is cooled. Which statements
> follow?"* → correct set: **pressure higher in the sealed tank** +
> **molecule speed lower in the cooled cup** (kinetic molecular theory).
> Maps directly onto Magic 101's heat/kinetic-theory chapters.

A and B are *already* someone doing a job; C is a real non-MC item. All
three are the raw material for "live it, don't solve it."

---

## 9. What this corrects in the design docs

| Earlier claim | Verified reality |
|---|---|
| Join on **ISCED-F** codes | No ISCED-F anywhere. Authored crosswalk to `Concept`/`ExamTaxonomyNode`; DBpedia the only external anchor (§3). |
| Items are **static multiple-choice** | ~20 types incl. essay/free-response/LLM-graded/matrix/ordering; case-study passages; CX has interactive AiMastery (§4). |
| **Proctoring removed** | `Proctored_Exam` alive, identity-verified (TypingDNA+Veriff); CX credit rides it (§6). |
| Course → **chapter** → lesson | Program → Course → **Topic** → Lesson; "chapter" is derived (§2). |
| **Learning objectives** are the load-bearing tag | No objective entity; the tag IS a Concept/ExamTaxonomyNode (§2–3). |
| Credit modeled as ACE/**semester-hours** | Boolean flags (`creditEligible`, `inAceReviewMode`); no codes/hours (§2). |
| Adaptive engine consumes a per-node mastery map (assumed) | True in *shape* — `Member_Concept_Mastery` (Bayesian) / `Study_Priority` (prediction) exist; whether an **inbound** signal is accepted is still `[confirm]` (§10). |
| Subject **taxonomy = progression/readiness** structure (StudyWorld doc) | Only half: **categorization ✅ ingestible; prerequisite ordering ❌** — no authored dependency graph; `Concept_Relation` is statistical DBpedia noise; readiness is adapter-derived work (§3a). |

---

## 10. Still unverified (do not design as settled)

- **`[confirm]` Does the adaptive engine accept an *inbound* signal?**
  The per-member mastery tables exist (`Member_Concept_Mastery`,
  `Study_Priority`), but I did not find an inbound-write API for external
  evidence. This still gates the whole
  [adaptive-feed](./study-com-adaptive-feed.md) direction.
- **`[confirm]` Event-stream / warehouse access** for the credential
  feed (the strategy-doc interview said instrumentation exists,
  distribution is warehouse-only) — not re-verified here.
- **`[confirm]` ACE/NCCRS evidentiary requirements** — whether a game
  `deed` could ever count toward credit (my read: no) needs the
  academic-partnerships insider.
- **`[confirm]` Who owns `Study_Plan` / `Test_Prep_Orientation_Question…`**
  — these tables are in `raptor` but not in `assessment-services` code;
  a different service writes them. Confirm before relying on the plan
  layer.

*Verified by direct query/read on 2026-08-03 (stage DB mirror of prod;
`academy-services`, `assessment-services`, `tools-cms` source). Re-verify
if the platform changes.*
