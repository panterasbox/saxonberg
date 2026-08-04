# The virtual classroom — roles, curriculum feed, and the two game shapes

> **Status: design/sketch, aspirational.** Explores whether Saxonberg can
> stand up a *simulated university classroom* — interchangeable
> player/NPC roles teaching a **known curriculum fed by Study.com** — and
> how that differs for CX vs test-prep learners. Grounded in the verified
> platform facts ([study-com-platform-reality.md](./study-com-platform-reality.md))
> and the Saxonberg subsystems it composes (employment, behavior,
> npc-dialogue, advancement, cms, studio, content-packs). Nothing here has
> touched a live Study.com environment.
>
> The premise, in the user's words: *Study.com's content was never meant
> to be delivered by an instructor and consumed passively — it was meant
> to be engaged with actively. Saxonberg's pitch is the **university
> experience** an edtech website can't give you alone.* This doc asks: is
> that actually buildable, and what does it cost?

---

## 0. The one-paragraph answer

**Yes — and less of it is new than you'd think, because a classroom role
is not an actor, it's an employment `Position`.** Saxonberg's college is
"a composition, not a subsystem" ([college-slate.md](./slates/builds/college-slate.md):357):
professor/TA = an employment Position, student = an enrollment contract,
cohort = a group, study-group = a party, proctor = the belief substrate's
identity recognition. **Player/NPC interchangeability falls out for free**
because a Position confers its capability by *on-shift activeness on a
`Character`*, and both player Avatars and NPCs are Characters resolved by
the **same `isActive` gate** — so an NPC professor and a player professor
are indistinguishable at the seam that matters. The curriculum can be
**authored as data and fed live**. The genuinely hard part is not the
classroom — it's **deriving lived scenarios from Study's flat content**
(§4), and that gap is on Study's *content model*, not either CMS (§5).

---

## 1. The roles, and what backs each (verified against the subsystems)

Every classroom role is a projection of an already-shipped substrate
([college-slate.md](./slates/builds/college-slate.md):361-374):

| Role | Backed by | Mechanism |
|---|---|---|
| **Professor / instructor** | an employment **`Position`** on the University `Business` | `Position = {key, label, wageRate, confers}`; `confers` = the capability mixins an on-shift holder gets ([employment.md](./subsystems/employment.md):36-40) |
| **TA** | the same — a Position you *qualify for* by mastering the course | "master a course, get hired to TA it" (college-slate.md:387); competence qualifies you, the role is the Position |
| **Student** | **enrollment = a contract** | clauses over verifiable conditions, escrow, tuition ([contract](./subsystems/contract.md) via college-slate.md:366) |
| **Proctor** | the **belief substrate** doing per-viewer identity recognition | "a proctor who *recognizes* you"; anti-impersonation is itself a thaumological instrument (college-slate.md:337,348-354) |
| **Cohort / section** | a **group** (`GroupApi`) | scheduled sections vs self-paced content (college-slate.md:372,421-424) |
| **Study group / lab partner** | a **party** | the social layer's co-presence (college-slate.md:373,414) |
| **Registrar / diploma** | not an actor — the **Transcript** (evidence) + **chronicle** (deed/claim) | the diploma is a ledger entry, not a person (college-slate.md:371-373) |
| **Office hours** | a professor **shift roster** | "a professor with a schedule, which is a shift roster" (college-slate.md:340,368) |

Crucially, **roles are not competence bands.** "The course gates nothing…
**Competence** gates capability" (college-slate.md:73-82). Competence only
*qualifies* you for a teaching Position; the role itself is the
employment relationship.

---

## 2. Player ⇄ NPC interchangeability — the actual mechanism

The claim to make real is college-slate.md:393-398: *"a lab section run by
a player next to one run by an NPC, indistinguishable to a student, with a
live handoff."* The seam is the employment engine, and it's already
actor-agnostic ([employment.md](./subsystems/employment.md)):

1. **The role is a `Position`, not an actor.** Its capability is the
   Position's `confers` mixins (employment.md:36-40).
2. **The relationship layer sits on `Character`.** `EmployedMixin` is on
   `Character` (employment.md:60); both player Avatars and NPCs *are*
   Characters. `getConferredMixinNames()` reads the `confers` of every
   **on-shift** Position — identical whether the holder is player or NPC.
3. **An NPC fills the seat** as a roster assignee: the `shifts` brain
   teleports it on-stage on-shift, and the Position's mixins go active via
   the augment substrate (employment.md:112-148,171-180).
4. **A player fills the same seat** via `hire`/`beginShift` — the Api is
   already actor-generic (employment.md:70-73).
5. **They're indistinguishable at the seam** because capability routes
   through `MixinApi.isActive` (activeness), **not** `hasMixin`
   (composition) — order/duty resolution finds "the present agent with an
   active capability" without asking *who* (employment.md:24-27,131-138).
6. **Live handoff** is the `covers` brain: if no active on-shift maker is
   present, `beginCover` upserts a transient on-shift Employment reusing
   the same confer path (employment.md:181-202) — NPC steps in / player
   steps out over one shared seam.

**The one honest gap:** a *player* professor needs the teaching-capability
mixin composed on `Avatar`, which is a named, deferred build-time seam
("runtime mixin-composition is its own deferred thing", employment.md:325-328).
The *relationship* is already actor-agnostic; only the capability
composition waits. So: **NPC-taught classrooms ship on today's substrate;
player-taught ones are one deferred seam away.**

---

## 3. How much of a course+classroom is authorable as pure data

Most of it. Every piece rides a data substrate; the CMS's rule is
"authoring is free, only *publish* is gated" ([studio.md](./subsystems/studio.md):14-18):

- **NPCs, dialogue trees** — pure data in the NPC template's
  `data.behaviors[]` ([behavior.md](./subsystems/behavior.md):19-36,
  [npc-dialogue.md](./subsystems/npc-dialogue.md):60-66). An instructor
  NPC that enrolls/grades runs commands *as itself* via the dialogue
  `dispatch` effect (npc-dialogue.md:98-127) — authored data, not code.
- **Courses / chapters / lessons** — a Course data-`Idea` in a catalogue,
  chapters as children, lessons as `StoredDocument`s (college-slate.md:103-108).
- **Disciplines** — pure-data leaves ([advancement.md](./subsystems/advancement.md):29-42).
- **The whole thing shippable as a content-pack** — git-versioned pure
  data, `replace` = "the file is truth" ([content-packs.md](./subsystems/content-packs.md):1-25,207-215).

**What still needs code:** a new backing class (wizard-gated), a brain
(module category), a genuinely new dialogue effect verb, and the item
generator's **evaluator** (it calls the real subsystem, never
reimplements it). Rooms are authorable as generic data today but lack a
bespoke room editor (deferred).

---

## 4. "Teach a known curriculum fed by Study.com" — the seam

The governing rule generalizes cleanly: **"the course cites, it never
restates — the course owns the pedagogy, the source owns the facts"**
(college-slate.md:562-583). A lesson that *restates* a Study fact goes
stale; one that *cites* the feed stays current for free. Decomposed:

- **Authored once (data):** the course skeleton in Study's taxonomy, the
  classroom rooms, the instructor Position + behavior + dialogue, the
  Discipline catalogue, the generator **spec** + misconception bank.
- **Generated (never authored):** exam items as `(spec, seed)` with a
  **computed** key from the running simulation (college-slate.md:158-239).
- **Fed live from Study.com:** lesson content (the watch-embed pane plays
  a Study video in-room, no new client work, college-slate.md:335,345-347)
  — that is *content delivery*; the live **lecture** is a separate mode
  (§6), not a video;
  the catalog itself (imported as content-pack data — "a data import, not
  a redesign", college-slate.md:96-99); inbound `claim` attestations (the
  academy faucet); optionally the outbound adaptive signal.

**The hard part is NOT the classroom.** It's turning Study's **flat,
item-based content** into **lived scenarios** — and that is a content-
*model* gap (§5), because the classroom, the roles, the feed, and the
generator are all already-shipped or thin adapters.

---

## 5. "Extend which CMS?" — the decisive answer

Both platforms have a CMS. The verified finding
([platform-reality §7](./study-com-platform-reality.md)):

- **Study's `tools-cms`** authors flat item content *well* — 18 question
  types, **case-study passages with progressive reveal**
  (`case-reveal`/`case-hide` markers that unfold as you advance), essay
  `llmRubric`, taxonomy tagging. But it has **no scenario / branching /
  role / simulation model at any layer it controls**, and **the gap is
  the backend content model**, not the UI. CX's interactive `AiMastery`
  multi-step (`LLM_CHAT / USER_MULTIPLE_CHOICE / USER_TEXT`) is the one
  primitive in that direction — and it isn't even authorable in tools-cms.
- **Saxonberg's CMS** authors NPCs, dialogue graphs, roles, and courses
  **as data**, over a **world that supplies consequences** — which is
  exactly the missing model.

**So the answer is not "extend Study's CMS to author scenarios."** The
missing piece is a world/consequence engine, and Saxonberg *is* that. The
division of labor:

1. **Study's CMS stays the source of truth for the flat curriculum** —
   questions, passages, taxonomy, and (the bridge) the **`case_study`
   progressive-reveal passages** + **`AiMastery` multi-step activities**,
   which are the *richest, most scenario-shaped* things Study already
   authors. A modest Study-side ask: expose those two as the premium feed.
2. **Saxonberg's CMS becomes the expressive layer** — it *derives* a
   lived scenario from a Study item/passage: the item generator's cousin,
   a **"scenario derivation"** that maps a case-study passage → a room +
   NPC roles + a rubric-checked deed. This is the real net-new authoring
   work, and it belongs on Saxonberg's side because only Saxonberg has the
   substrate to run it.
3. **A course-importer content-pack path** on Saxonberg's side ingests the
   Study catalog (the college-slate's "data import" already anticipates
   this).

Net: **extend Saxonberg's CMS to derive; lean on Study's two interactive
primitives as the feed; don't try to make Study's CMS author worlds.**

---

## 6. Lecture vs lab — the two class modes, and the lecture agent

A class session is **two distinct modes** with opposite cost and
interactivity profiles. Conflating them — or calling a pre-watched video a
"lecture" — is the mistake that makes the classroom sound like a worse
website.

- **Lab = a quest.** A mini-narrative with roles, shared world state, and
  a world- or rubric-graded **deed** — the applied scenarios of §4–5
  (ignite the straw; calm the child; hand off the patient).
  **Deterministic and cheap at runtime**; the net-new work is *build-time*
  derivation from Study's case-study content (§5).
- **Lecture = a live, interrogable agent — not a video.** Delivering
  information is the one thing async content already does well and the one
  thing a lecture need not justify. A lecture earns its place on the two
  things a video **cannot** do: **you can interrogate the instructor**,
  and **you hear the whole room's questions** (half of what you learn in a
  good lecture is the question you wouldn't have asked). So what we model
  is *not* delivery — it is **live interrogation + shared Q&A**. A video,
  if present, is a **prop the instructor plays** ("watch this, now tell me
  where the energy went"), never the lecture itself.

### 6.1 Why the lecture is the *cheap* runtime-LLM shape

Counter-intuitively, a real lecture is the **most cost-efficient** runtime
use of an LLM, because it is **one instructor : N students in one shared
conversation** — not N private tutoring sessions:

- **Amortized + bounded.** One agent, one context, N listeners; a
  per-lecture cap on answered questions makes cost roughly **flat vs
  headcount** (5 or 50, similar spend). 1:1 tutoring is the *expensive*
  shape; the lecture is the cheap one — and the realistic one (one
  professor, many students).
- **Grounded in Study's real lesson.** The agent's source of truth is the
  lesson transcript + objectives + the misconception bank, so it teaches
  the **actual curriculum**, can't wander, and **gives Study a reason to
  endorse it** (their content stays the authority).
- **FAQ cache.** The tenth student to ask "why does cooling cost more"
  gets the first student's answer for free; the cache grows, live calls
  shrink.

### 6.2 Class size = the interaction budget (realistic *and* cost-capping)

- **Seminar (≤ ~30):** open floor — anyone interrogates, the agent fields
  questions freely.
- **Lecture hall (~100):** questions are **gated** the way a real hall
  gates them — hand-raise / upvote, the instructor takes the best few, and
  **TAs (player or NPC) field overflow** in side-threads. Fewer agent
  turns, more realistic, cost flat regardless of headcount.

Room size *is* the question budget — bigger = cheaper-per-head, same as
real life.

### 6.3 The empty hall — "the show must go on"

The real dependency is **people, not model cost**, and it's solvable:

- **Scheduled + persistent instructor** — the lecture happens at its slot
  whether 2 attend or 0. This makes the college-slate's "sections
  scheduled" load-bearing: scheduling *concentrates* a cohort into one
  moment ([college-slate.md](./slates/builds/college-slate.md):421-424).
- **NPC students backfill seats and ask seeded questions.** The
  **misconception bank is a bank of illuminating "wait, but…" questions**
  (every misconception is a great student question), so even a solo real
  student sits in a room where classmates ask the good ones — the
  shared-question value survives at zero real attendance, and seeded Q&As
  can be **cache-served** (no live call).
- **Lectures "record."** A live session's transcript-with-Q&A replays for
  latecomers — a *richer* artifact than the raw video, because it carries
  the discussion. (This is the good version of "watch it beforehand.")

### 6.4 The two-tier ramp — same room, config swap

- **Interim (no runtime LLM):** the instructor NPC runs an **authored
  lecture** — a scripted beat sequence + a **dialogue-tree Q&A** over the
  misconception bank ([npc-dialogue.md](./subsystems/npc-dialogue.md):60-97,
  pure data), with NPC students asking the seeded questions.
  Deterministic, zero per-play cost, ships on today's substrate.
- **Premium (live LLM):** swap the instructor's brain to a **live agent**
  grounded in the Study lesson — genuinely interrogable, handles novel
  questions. Enable per-lecture (flagship courses / peak sections first).

Both tiers share the same **room, roster, schedule, roles, and
question-budget**, so upgrading a lecture is a **config swap, not a
rebuild**. Mechanically the instructor is still an employment `Position`
holder (§2); the lecture is its **on-shift behavior**
([behavior.md](./subsystems/behavior.md)) — the interim tier is a dialogue
tree, the premium tier is a new **agent-backed behavior** that calls an
LLM with the room context + lesson grounding under the question budget.

### 6.5 Where the spend concentrates

Runtime LLM spend lands **on the lecture** — the "grill a real professor"
moment a website structurally cannot offer — while **labs stay
deterministic quests**. **Build-time** LLM does the offline heavy lifting:
deriving the lab quests (§5) and seeding the per-topic question banks from
Study's content, once, human-reviewed, shipped as data. So the one genuine
net-new *runtime* component is a single **agent-instructor behavior**
(bounded room conversation, lesson-grounded, budget-aware, cache-backed);
everything else — the room, schedule, roster, NPC students, seeded
questions — is shipped substrate or authored data.

---

## 7. How the classroom actually runs — two build models, and what campus does with Study's assets

Building on §6, this examines the **two architectures** we'd support for
both modes, and the load-bearing question: what does the *campus* do with
Study's website-shaped assets (videos, transcripts, the two taxonomies,
assessments)?

### 7.1 What Study's assets become on campus

Study's assets are built to be *delivered and answered on a page*. On
campus each changes job:

| Study asset (website) | In the **lecture hall** | In the **lab** |
|---|---|---|
| **Video** | a *prop* the instructor plays ("watch this, now tell me where the energy went") — not the lecture | a mid-task reference |
| **Transcript** (lesson text) | the instructor's **grounding / source of truth** + the readable lesson | the manual you consult |
| **Concept / ExamTaxonomyNode** | *what the session covers* + the live **competence map** of who's weak where | *what deed this exercises*, via the Discipline crosswalk |
| **Assessment items + `case_study` passages** | **formative checks** (clicker questions) + the seed bank of good student questions | the **graded deed** (computed key) + the **scenario itself** (a case → the quest) |

So campus consumes the **transcript as teachable content, the taxonomy as
the competence map, and the assessment bank as both formative checks and
lab raw material** — the video is demoted to a prop.

### 7.2 Why the interface is "built for LLMs"

Saxonberg exposes the world as **structured, queryable state** (MQL, the
viewer-aware perception face, the inspection pane —
[mql.md](./subsystems/mql.md),
[perception.md](./subsystems/perception.md),
[inspection-pane.md](./subsystems/inspection-pane.md)) and a **command
grammar with structured response envelopes**
([command-routing.md](./subsystems/command-routing.md),
[response-envelope.md](./subsystems/response-envelope.md)). That is exactly
an **agent tool-use loop**: perceive state as text → decide → emit a
command → read a structured result. A player drives it through the
cockpit; an agent drives the **same verbs and queries**. This is the deep
reason the player/NPC interchangeability of §2 extends to **LLM**
inhabitants: an agent is a **brain** ([behavior.md](./subsystems/behavior.md))
that perceives and acts through the standard surface. The world's native
I/O *is* an agent's native I/O — so the agent model is a new **brain kind**,
not a new subsystem.

### 7.3 The two models, across lecture and lab

|  | **Mechanical** (request/response, signals, pre-canned) | **Agent** (LLM inhabitants + game state) |
|---|---|---|
| **Lecture** | instructor = a dialogue tree keyed to the topic (`ask` → canned answer); formative checks = the item generator (computed key); NPC students ask **seeded** misconception-bank questions with cached answers. *Scripted direct instruction + retrieval practice — reliable; can't field a novel question or read the room.* Cost ≈ 0 runtime. | instructor = an LLM agent grounded in the transcript + objectives **and the room's live competence state** (sees the cohort is weak on latent heat and adapts), interrogable freely; NPC students are agents (emergent, instructively-wrong questions). *Responsive, dialogic, Socratic — contingent teaching a video can't do.* Cost: bounded 1:N (§6.1). |
| **Lab** | the classic quest: the `case_study` passage → a branching scenario with **authored per-choice consequences**; the world subsystem grades the deed; the item generator supplies checks. *Learning-by-doing with immediate consequence (Kolb, deliberate practice); finite branches, can't handle an unforeseen action.* | the scenario is **inhabited by agents with game state** — the patient responds to *whatever* you do (not just authored branches), the lab partner is an agent, the instructor coaches contingently. *Authentic open-ended practice with a coach — closest to a real clinical placement / studio critique.* See the rule below. |

### 7.4 The rule that makes the agent model safe

**The simulation adjudicates; agents only narrate and socialize.** In the
lab, the patient agent cannot invent a vitals change the physiology sim
didn't produce — the sim is **truth and grade**; the agent *speaks* that
truth in character and reacts socially. Break the rule and the deed stops
being gradable and the agent starts hallucinating outcomes; keep it and you
get open-ended interactivity on an **honest deterministic core**. (This is
the runtime cousin of the item generator's rule — "the evaluator calls the
game's own code path, it never reimplements the physics",
[college-slate.md](./slates/builds/college-slate.md):241-251.)

### 7.5 The three-layer dial (not old-vs-new)

The real architecture composes all three, dialed per course / section /
budget:

1. **Deterministic core (always on)** — the physics/vitals/conservation
   sim + the computed-key items. *Truth and grade; never an LLM.*
2. **Agent layer (dial up)** — the professor who riffs, the patient who
   reacts, the peer who argues. *Interactivity and presence.*
3. **Mechanical layer (floor + fallback)** — dialogue trees, seeded
   questions, authored branches; for when you won't pay, the agent is down,
   or a formative check must be exact.

The §6.4 two-tier ramp is this dial applied to the instructor; the same
dial exists for the lab (authored branches → agent-inhabited scenario) and
the classmates (seeded questions → agent peers). **Ship on layers 1+3;
turn on layer 2 where it earns its cost.**

### 7.6 A campus walk-through, lecture → lab, consuming the assets

*Thermodynamics (CX / Magic-101 flavor).* Pre-work, async, anywhere: the
Study **video + transcript**. Then campus:

- **Lecture hall.** The instructor opens grounded in the **transcript** and
  the cohort's **Concept mastery** — *"last week you all forgot the
  water"* — and plays a 20-sec **video** clip as a prop. A **formative
  check** drops: the real `MULTI_SELECT` thermo item (sealed tank heated /
  cup cooled); everyone answers live and the misses steer the session. You
  `ask "isn't that just latent heat?"` — *mechanical:* a canned latent-heat
  answer; *agent:* it engages your framing and pushes. A classmate asks the
  conservation question (the real 25-g-vs-20-g item, seeded from the
  misconception bank).
- **Lab.** You run the **calorimetry deed** — the fire/thermal sim computes
  ignition and energy (the computed key is the grade; no LLM). *Mechanical:*
  a fixed sequence of checks. *Agent:* a lab-partner agent argues whose
  measurement was off and the instructor coaches — but the calorimeter's
  reading is the **sim's**, not the agent's (§7.4). You leave with a **deed**
  banked to the Transcript (→ competence → conferral → the dual transcript).

Swap the domain and it's the NGN **postop-knee case**: the transcript
grounds the lecture, the case's six questions are the formative spine, and
the lab is the shift-long patient scenario (patient agent reacting, the
SBAR handoff to a peer) with the vitals sim adjudicating.

### 7.7 The pedagogy bets — and what an education expert must stress-test

This design makes real learning-science bets, mostly good ones — but the
agent layer has a specific hazard, and **none of this has been validated
with a learning scientist.** That is a real dependency to close *before*
the agent layer is built.

- **Good bets:** active > passive; formative assessment + immediate
  feedback; contingent tutoring at the ZPD (the agent lecture); deliberate
  practice with consequence (the lab); social/dialogic learning (agent
  peers); retrieval practice (the checks).
- **The hazard — desirable difficulties.** An LLM instructor tends to be
  *too helpful*. Productive struggle is where learning happens; an agent
  that instantly resolves every confusion can **remove the struggle and the
  learning with it.** Tuning an agent to *coach* (withhold, redirect)
  rather than *answer* is a pedagogical design problem, not a prompt tweak.
- **Questions for an expert:** where should the agent withhold vs. tell?
  does hearing seeded NPC questions actually transfer, or just feel social?
  is the lab's deterministic grade measuring understanding or
  button-finding? should the lecture agent be allowed to be *wrong on
  purpose* (a productive misconception to debate)?

The **mechanical layer is pedagogically conservative and safe; the agent
layer is where you can accidentally build something that *feels* like great
teaching and isn't** — which is exactly why an education expert belongs in
the room before it's built.

---

## 8. The two game shapes (the big design output)

CX and test prep are **structurally different products**
([platform-reality §3,§5](./study-com-platform-reality.md)), so they want
**different game shapes** — and the classroom fits CX, as you suspected:

### CX / College Accelerator → **the University**

- **Unit:** a real `Course` (Topics/Lessons, `Concept` mastery).
- **End state:** **pass the credit final** — a discrete, self-paced deed
  that earns real credit.
- **Clock:** none — self-paced to readiness.
- **Fit:** the semester **classroom** — enrollment-as-contract, cohorts,
  sections scheduled / content self-paced, an instructor who knows your
  name (belief substrate), the deed = the credit final. CX *already* has
  interactive `AiMastery` activities, so "engage actively, don't consume
  passively" is a direction Study already started on this side. **The
  learner paces to the game.**

### Test Prep → **the Proving Ground**

- **Unit:** a `TestPrepPillar` + study-guide (no `Course` entity);
  `ExamTaxonomyNode` + `StudyPriority` prediction.
- **End state (corrected):** **pass the learner's real external exam on
  its real date** — which the site *simulates* with the **full-length
  practice final** (blueprint-weighted) + score prediction. The game's
  "graduation" is that simulated full-length: a **dress rehearsal** whose
  passing predicts the real pass.
- **Clock:** an external, real-world exam date (`future_exam_date`).
- **Fit:** not a semester classroom but an **apprenticeship / proving
  ground** — the scenario-dense professional-prep questions (the nurse,
  Mr. Kim) served **weakness-first** (the `StudyPriority` ranking) on a
  **countdown** to the real date, building to the simulated full-length as
  the in-world final. **The game paces to the learner.**

The scenario-density that makes "live it, don't solve it" vivid is
concentrated in **test prep** (nursing/HESI, teacher-cert, real estate,
medical); the **university-experience** pitch is strongest for **CX**.
They're two products and two builds — which is the honest answer to "is
this one thing or several."

---

## 9. Pacing — keeping the game on the learner's clock

The failure mode you named — the learner forced to keep up with the *game*
instead of their real goal — is a real risk and is resolved structurally:

- **CX:** no external clock, so the classroom cadence *is* the structure
  (sections scheduled, content self-paced). Safe by construction.
- **Test prep:** the game consumes **both** the learner's `future_exam_date`
  **and** the live `StudyPriority` weakness ranking, and paces the scenario
  feed to **them** — a countdown-aware, weakest-node-first delivery that
  front-loads what they'll fail and culminates in the simulated
  full-length before their date. **Two hard rules:**
  1. **Mirror the real date; never manufacture urgency.** No game-invented
     deadlines, streak-punishment, or FOMO competing with the real exam
     (the high-stakes reconciliation applied to tempo).
  2. **The game's "final" IS Study's simulated full-length** — one
     terminal event, not two. Passing it in-world *is* the readiness
     signal, so the game never adds a rival milestone.

So for test prep the game is a **rehearsal space on the learner's
countdown**; for CX it's a **classroom on the learner's own schedule**.
Neither asks the learner to keep up with *it*.

---

## 10. Is it actually possible? — verdict and the honest gaps

**Possible, mostly on shipped substrate**, with three named gaps:

- ✅ **Interchangeable roles** — shipped mechanism (employment Position +
  `isActive`); **player-taught** classrooms wait on one deferred
  build-time seam (Avatar mixin composition, §2).
- ✅ **Curriculum as data, fed live** — shipped (catalogue, content-packs,
  watch-embed, cite-not-restate); the join is an **authored crosswalk**
  (not ISCED-F — [platform-reality §3](./study-com-platform-reality.md)).
- ⚠️ **Lived scenarios from flat content** — the real net-new work: a
  **scenario-derivation** authoring path on Saxonberg's side (§5), fed by
  Study's `case_study` passages + `AiMastery` steps.
- ⚙️ **Live lecture agent** (optional, premium tier) — the one net-new
  *runtime* piece: an agent-instructor behavior, lesson-grounded,
  budget-aware, cache-backed (§6). The classroom **ships without it** via
  the authored interim tier; add it per-lecture where "grill a real
  professor" is worth the (bounded, 1:N-amortized) spend.
- ⚠️ **Inbound personalization** — still gated on the `[confirm]`: does
  Study's adaptive engine accept an inbound signal
  ([platform-reality §10](./study-com-platform-reality.md)).

---

## 11. Open questions

- **Scenario-derivation fidelity** — how faithfully can a `case_study`
  passage be auto-derived into a room + roles + a rubric-checked deed, vs
  hand-authored? Start with the highest-value verticals (nursing,
  teacher-cert) and measure.
- **Does exposing `AiMastery` steps as a feed need Study-side work?** —
  they exist in `assessment-services` but aren't in `tools-cms`; confirm
  the export path.
- **Player-instructor provenance** — a player-graded viva vs an
  NPC/LLM-graded one carry different weight (college-slate.md:704-707);
  ratify the rule.
- **The deferred Avatar-capability seam** — scope the build-time
  mixin-composition work that unblocks player-taught classrooms.
- **Two builds or one?** — CX-University and test-prep-Proving-Ground
  share substrate but differ in shape; decide whether to ship one first
  (the data pushes toward test-prep scenarios as the vivid wedge, CX as
  the credentialed university story).
