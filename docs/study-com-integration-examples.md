# Study.com × Saxonberg — worked integration examples (real data)

> **Status: worked examples, aspirational integration.** Every example
> below is built on a **real row pulled from the live stage database**
> (a nightly mirror of prod) on 2026-08-03 — the item/table references are
> exact so each is re-verifiable. This is the concrete companion to
> [study-com-integration.md](./study-com-integration.md) and
> [study-com-platform-reality.md](./study-com-platform-reality.md): "here
> is what an integration moment actually looks like," in both directions.
> Nothing here has run against a live Study.com environment.
>
> **Direction tags:** **S→G** = a real Study.com artifact becomes a game
> moment/capability. **G→S** = game behavior becomes a Study.com signal.

---

## S→G ① A misconception becomes a world you can't argue with

**Real item** — `ariel2_0.Quiz_Question` #2575890 (chemistry, conservation
of mass), options in `Quiz_Question_Option`:

> *"In a closed system, 10 g of baking soda reacts completely with 15 g
> of vinegar to produce a gas and a liquid. What will the total mass of
> the system be after the reaction?"*
> — **10 g** / **15 g** / **25 g ✓** / **20 g**

The `explanation` cites the Law of Conservation of Mass (25 g). The
distractors are named errors: 10 g / 15 g = "only one reactant counts";
**20 g = the real misconception — "the gas escaped, so mass was lost."**

**Integration.** Saxonberg conserves mass/energy **by construction** — the
sealed two-tier money ledger ([banking.md](./subsystems/banking.md)) and
the arcane-science postulate "local conservation fails, **global holds**"
([arcane-science.md](./arcane-science.md)). So the learner who believes
mass vanishes is dropped into a **closed vessel**, runs the reaction, and
**watches the total not move.** The distractor becomes a demonstration the
world refuses to let you lose. You don't *read* conservation of mass — you
fail to violate it.

## S→G ② An unfolding NGN case becomes a shift-long team quest (flagship)

**Real case** — `ariel2_0.Question_Passage` #15172 + its six ordered
`Quiz_Question`s (#1822090-100), from the Next-Gen-NCLEX nursing bank:

> *Passage:* "The nurse is caring for a 58-year-old male client, one day
> post left total knee replacement." A **Nurses' Notes chart** with a
> deteriorating timeline — *0815: pain 4/10 at rest → 0930: 8/10, sharp,
> intermittent, worse on movement…*
>
> *The six questions walk the exact NCLEX clinical-judgment cycle:*
> 1. `SELECT_N` — which assessment findings **require follow-up**? *(recognize cues)*
> 2. `MULTI_SELECT` — **priority** interventions? *(prioritize)*
> 3. `MULTI_SELECT` — which **complication** is most likely? *(analyze)*
> 4. `MULTI_SELECT` — priority interventions **as it evolves** *(re-prioritize)*
> 5. `MULTIPLE_CHOICE` — **most important details to communicate to the surgical provider** *(SBAR handoff)*
> 6. `MULTI_SELECT` — appropriate actions **after** the intervention *(evaluate)*

**Integration.** It is already a mini-narrative with a chart. In-world it
becomes a **shift-long lab quest**: an NPC patient whose modeled vitals
worsen on the 0815→0930 clock; you (the nurse role — an employment
Position) examine and flag cues, act, and re-assess. **Question 5 is the
player-to-player SBAR handoff** — you brief the incoming shift / provider
NPC, and they act on *what you actually told them* (tell it badly → wrong
call → the patient NPC deteriorates). Six questions = six graded decision
points; each is a computed-key `SELECT_N`/`MULTI_SELECT`, so **no new
grading tech** — the deed is the correct navigation of a real case. This
is the scenario-densest, highest-value S→G material (the NGN bank is
almost entirely cases like this).

## S→G ③ Mastering a real concept unlocks an in-world capability

**Real mastery** — `raptor.Member_Concept_Mastery` joined to
`ariel2_0.Concept`: concept **"Ecology"** `mastery_mean 0.619, master=0`
(not yet); **"Constitutional law"** `0.944`.

**Integration.** Crosswalk the `Concept` → a Saxonberg `Discipline`
(authored, proprietary-layer — there is no shared code, §see
platform-reality §3). When Study flips `master=1` on "Ecology," the same
credential event mints a `claim` `TranscriptEntry`
([advancement.md](./subsystems/advancement.md)); if it crosses a band, the
game **confers a capability** gated on that Discipline (e.g. you can now
read/steer the husbandry & ecosystem systems). Real coursework → real
ability, through the conferral seam that already exists.

---

## G→S ④ Applied failure in the world updates Study's mastery estimate

**Real target shape** — `raptor.Member_Concept_Mastery` (verbatim
columns): `{concept, mastery_mean, mastery_alpha, mastery_beta,
number_correct, number_answered, master}`. Sample rows:

| concept | mean | α | β | correct/answered | master |
|---|---|---|---|---|---|
| Ecology | 0.619 | 4.4 | 2.7 | 18/21 | 0 |
| Constitutional law | 0.944 | 3.7 | 0.2 | 21/23 | 0 |
| Decision analysis | 1.000 | 997 | 1 | 14/15 | 1 |

**This is a Beta-distribution mastery model — the same shape Saxonberg's
BKT Competence estimator produces.**

**Integration.** The game watches you repeatedly mismanage an in-world
ecosystem — a **deed**, not a quiz — and emits a `CompetencySignal`
([study-com-adaptive-feed.md](./study-com-adaptive-feed.md)) that adds
evidence against your "Ecology" mastery (nudges β, bumps `number_answered`)
or flags the named misconception. Study's engine re-weights and surfaces
the ecology lesson. The game hands Study the one signal items can't
produce — *applied* competence under stakes — in a shape its model already
speaks.

## G→S ⑤ The Proving Ground reads Study's weakness ranking to pick your next scene

**Real ranking** — `raptor.Study_Priority` joined to
`ariel2_0.Exam_Taxonomy_Node`:

| taxonomy node | priority | predicted score |
|---|---|---|
| Number & Quantity and Algebra | **HIGH** | 0.0 |
| Craft, Structure, and Language Skills | EXCLUDED | 0.52 |
| Functions and Calculus | LOW | 1.0 |

**Integration.** The test-prep Proving Ground reads `Study_Priority` and
serves the **weakest node first** — scenarios drilling "Number & Quantity
and Algebra" (predicted 0, HIGH) before the ones you've already got. Your
in-world performance then updates the prediction. **The study plan becomes
the quest queue, and the quest results feed the study plan** — bidirectional
over one taxonomy the platform already maintains.

## G→S ⑥ A game deed is banked as verified evidence

**Real slots** — `Member_Concept_Mastery.number_correct / number_answered`
and `exam_instance_id`: evidence is already tied to an assessment instance.

**Integration.** A witnessed game deed (you ran the calorimetry lab and
computed 35.2 τ correctly) is banked as a **`claim` with provenance**
([study-com-integration-spec.md](./study-com-integration-spec.md) §3.4),
adding to the concept's evidence the way an `exam_instance` does — weighted
below an identity-verified final, above a self-report. The receiving slots
already exist.

---

## Two bonus findings worth the pitch

- **Study's essay/project grading is manual and clunky.**
  `raptor.Gradable_Course_Project` is graded through **Smartsheet**
  (`smartsheet_sheet_id`/`row_id`/`attachment_id`, `grade_percent`, a human
  `grading_reason`). That is real friction Saxonberg's rubric-checked deeds
  + LLM/viva grading could *replace*, not merely complement — a concrete
  "we make your worst-scaling assessment mode cheap" line. (CX already
  LLM-grades some activities, so the direction isn't foreign.)
- **Study already has a literal "classroom" construct.**
  `raptor.Classroom_Mastery_Action` / `Classroom_Mastery_Progress_Node`
  (`classroom_id`, `mastery_cohort`, `skill_node_id`, `has_user_moved_node`)
  — a K-12 cohort working a board of skill nodes. A conceptual cousin of
  the game cohort, and a natural mapping target if the classroom pitch
  turns toward the K-12/teacher segment.

---

*All rows verified by direct query on 2026-08-03 (stage mirror of prod).
Member identifiers were deliberately omitted from the pulls above — only
anonymous shape/params are shown.*
