# The teacher vertical — the learner becomes the teacher

> **Status: opportunity design, aspirational.** Grounded in the live
> stage DB and Study.com's product/strategy docs in Notion (read
> 2026-08-03). Explores the **other end of the classroom** — aspiring
> teachers — which turns out to be Study's **largest test-prep vertical**
> and the one with a licensure rung a website structurally cannot serve.
> Nothing here has run against a live Study.com environment.
>
> Builds on the interchangeable-role classroom
> ([study-com-classroom-model.md](./study-com-classroom-model.md)) and the
> two game shapes; this is the killer application of the University shape.
>
> **Precision (2026-08-03, per the market plan):** Study's teacher *test
> prep* covers the recall/pedagogy exams; the performance assessment
> (edTPA/PPAT) is **downstream of and adjacent to** what they sell, and
> Teacher TP is a **0%-growth, mature** line. So this vertical's Saxonberg
> value is the **practicum gap + the CotF pathway/twofer**, not growth in
> exam prep itself. Prioritization context:
> [study-com-vertical-survey.md](./study-com-vertical-survey.md).
>
> **Update (2026-08-05):** education is also the **#1 declared field in CX**
> (~2,000 members, top-5 all education variants) — so the aspiring teacher
> is *both* a CX education-major (credit toward the ed degree) *and* a
> Praxis test-prep user, making this the **beachhead across both products**.
> See [study-com-cx-and-the-aspiring-teacher.md](./study-com-cx-and-the-aspiring-teacher.md).

---

## 1. Why this is the vertical to look at (the numbers)

- **Teaching is Study's #1 test-prep vertical by content footprint —
  880 `Test_Prep_Pillar`s**, versus Academic 156, College-Readiness 116,
  Real Estate 106, **Nursing 95**, Grade School 63. Teaching is ~6× the
  next professional-prep vertical and dwarfs nursing.
- **Business:** ~**$18M ARR today, target $50M+** in three years. Study is
  the **Official Praxis® Test Prep Provider (ETS partnership)** with a
  claimed **92% Praxis pass rate**; **60+ teacher exams** in one platform.
- **Market:** ~500k teachers test/year, ~250k buy prep; Praxis is required
  in **40+ states**, plus big state-specific exams (CA CBEST/CSET, TX
  TExES, FL FTCE, NY NYSTCE).
- **The macro backdrop is a crisis + a mission:** **400k+ teaching
  positions** vacant or filled by uncertified staff; first-attempt pass
  rates **below 50%** on some exams, and **markedly lower for Black and
  Hispanic candidates** — ETS's and Study's stated shared goal is to
  **diversify and fill the teacher pipeline.** (So the pitch has a mission
  rail, not just a revenue one.)
- **Persona:** aspiring K-12 teachers, ~77% female, 25–44, **57% novice /
  75% first-time**, career-changers and recent ed-grads and
  paraprofessionals — highly motivated by career entry, **anxious about
  licensure barriers, often with prior test failure.**

## 2. The rung Study.com structurally cannot serve

Teacher licensure is a **ladder of exam types** (from Study's own
knowledge base), and the top two rungs are pedagogy, not recall:

| Rung | Purpose | Examples | Can content + MCQ prep it? |
|---|---|---|---|
| Basic Skills | literacy/math | Praxis Core, CBEST | ✅ yes (Study's bread and butter) |
| Content / Subject | subject knowledge | Praxis 5161, CSET, TExES | ✅ yes |
| **Pedagogy / Professional Knowledge** | teaching methods, instructional strategy, **classroom management** | Praxis **PLT**, TExES **PPR**, CalTPA | ⚠️ partly — these are the *scenario* items (the "Mr. Kim" case) |
| **Performance-Based Assessment** | **"practical teaching abilities through real classroom scenarios"** — several tasks over multiple cycles, **"completed during student teaching"**, ~$300 | **Praxis PPAT**, **CalTPA**, (edTPA-family) | ❌ **no — it requires actually teaching** |

**The bottom two rungs are Study's whole business. The top rung is the one
a website can't touch** — because it is a *performance*, done during the
student-teaching practicum. It is the single most applied, most rationed,
most anxiety-inducing, and least-served step in the biggest test-prep
vertical. It is the **"applied hours" thesis pointing at its perfect
target.**

## 3. The Saxonberg fit — the learner takes the teacher's seat

The classroom we designed already models the instructor as a **fillable
employment `Position`** (classroom-model §2), with NPC/player students, the
belief substrate ("knows your name"), and the **command bus** to run a
class (§7.8). So the aspiring teacher doesn't *study about* teaching —
**they teach:**

- Take the **teacher role** in a simulated classroom of NPC (and player)
  students with modeled competence and behavior.
- **Run the class through the command bus** — deliver a lesson, `call on` a
  student, `reveal` an example, handle the student who's lost, differentiate
  for the one who's ahead, manage the disruption. Real actions on shared
  state, adjudicated by the sim.
- Be assessed on the **performance and the process trace** (the teaching
  *deed*, §7.8 "assessment by action") — did the students' modeled
  competence actually move? did you recognize the confusion and respond? —
  the exact competencies PPAT/CalTPA/edTPA score.

**This is a rehearsal space for the performance-based teaching assessment**
— a flight simulator for the student-teaching practicum. It prepares the
one rung Study's content cannot, using the classroom sim we already
designed.

## 4. Why this is unusually good (three multipliers)

1. **The learner-becomes-teacher loop is pedagogically potent** — teaching
   content is one of the strongest ways to *learn* it (the protégé
   effect). A candidate rehearsing how to teach fractions also masters
   fractions. One activity serves both the content exams and the
   performance exam.
2. **It solves Saxonberg's own staffing problem.** The University needs
   instructors; player-teachers (aspiring teachers practicing) fill the
   seats the world would otherwise staff with NPCs (classroom-model §2's
   "seats don't ration"). The teacher vertical is where **players teaching
   players** becomes the product, not a nice-to-have.
3. **It produces a teaching deed transcript.** You don't just pass the PLT
   multiple-choice — you accrue a **witnessed record of teaching**
   ([study-com-dual-transcript.md](./study-com-dual-transcript.md)):
   corroboration a college of ed, an alt-cert program, or ETS would value,
   and a confidence-builder for an anxious first-timer.

## 5. Business / pitch fit (grounded in their own plan)

- **Mission rail:** the teacher shortage + the equity pass-gap are
  explicitly ETS's and Study's shared goal. A **low-cost rehearsal space
  for the practicum** most helps exactly the underrepresented / alt-cert /
  paraprofessional candidates who *lack* a supportive student-teaching
  placement — the pipeline-diversity story, made concrete.
- **B2B fit is native:** their plan targets **colleges of education,
  alt-cert programs (TFA, TNTP, residencies), districts' "grow-your-own,"
  and state ed departments** — all of whom must provide *practicum /
  microteaching* at scale and struggle to. A simulated teaching practicum
  is a scalable answer they're already trying to buy.
- **The ETS/Praxis partnership is the credibility rail** — Saxonberg rides
  Study's official-provider status rather than competing with it.
- **Lifecycle upside:** certify in the sim → graduate into Study's **K-12
  teacher tools** (the StudyAI teacher assistant, lesson-plan generator,
  classrooms — [study-com-studyai.md](./study-com-studyai.md)) → **Teacher
  PD / CEU** cross-sell (in their plan). The aspiring-teacher and the
  practicing-teacher ends of the classroom become one customer lifetime.

## 6. Honest caveats

- **Rehearsal, not the assessment.** PPAT/edTPA/CalTPA are official,
  submission-based, human-scored. Saxonberg is a **practice/confidence
  space**, never the licensure instrument (the honesty rail: practice
  scales; it does not replace the regulated practicum).
- **Fidelity is unproven and the pedagogy stakes are doubled.** Simulated
  microteaching against NPC students only works if the **agent-student
  layer** (LLM classmates who misunderstand realistically, classroom-model
  §7) is convincing, and if the *assessment of teaching* reflects real
  teacher-competency frameworks (Danielson/edTPA rubrics). This is squarely
  the §7.7 "get an education expert in the room" dependency — and here the
  expert is a **teacher-educator**, because we'd be assessing pedagogy
  itself.
- **The teaching deed is scoped to what the sim can stage** — classroom
  management, questioning, differentiation, formative response are
  stageable; a full multi-week unit with real children is not. Claim the
  rehearsable slice, not the whole practicum.

## 7. Open questions

- **Which teacher competencies are faithfully rehearsable in a text world**
  (questioning, wait-time, cold-call equity, checking for understanding,
  responding to a wrong answer) vs. which need embodiment? Start with the
  stageable set and measure.
- **Do colleges of ed / alt-cert programs want a simulated practicum** as a
  supplement, and would ETS view it as pipeline support (mission) rather
  than a threat to the official assessment? (A `[confirm]` for the
  partnerships insider.)
- **Map the classroom-management scenario bank** — the PLT/PPR pedagogy
  items (the "Mr. Kim" cases) are the seed content for these teaching
  scenarios, same derivation path as the nursing NGN cases
  ([study-com-integration-examples.md](./study-com-integration-examples.md)).

---

*The teacher vertical unifies the whole design: it's the largest market,
it needs the one thing only a world provides (the practicum), it's served
by the classroom sim already designed, and the learner-teacher loop feeds
the world its instructors. Verified 2026-08-03; re-verify before a deck.*
