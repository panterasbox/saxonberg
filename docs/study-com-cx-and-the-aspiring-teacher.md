# CX enrollment, and the aspiring-teacher beachhead

> **Status: verified findings + strategic reframe (2026-08-05).** Corrects
> the test-prep over-focus and the earlier **TOEFL-beachhead error**,
> captures the **two scoring axes** the vertical survey was missing, the
> **verified CX enrollment/majors model**, and the data-backed conclusion
> that the **aspiring teacher** is the real beachhead. Grounded in the
> stage DB + the CX product docs (Notion). Supersedes the "TOEFL is the
> beachhead" claim in
> [study-com-vertical-survey.md](./study-com-vertical-survey.md).

---

## 0. Why this doc exists (the correction)

An expert (the user) flagged a failure mode: I scored verticals on
*discipline fit* and *Study's strategic priority* and skipped **whether the
game's medium can deliver it** and **whether the rung the game is best for
is the rung Study actually sells**. TOEFL was the vivid case — Study's #2
priority, but a text-based English world can't serve non-English speakers,
and we have no speaking/listening. Applying the two missing checks reorders
the whole field.

## 1. The two axes the survey was missing

Add these to the fit score (they are *verifiable*, not judgment calls):

- **Medium fit** — *can a text-based, English world actually deliver this
  vertical?* **TOEFL fails** (English-*learner* audience; a text-dense
  English world is a wall for the low-proficiency half; two of four exam
  skills — speaking, listening — don't exist in the game). English-native
  academic/professional verticals pass.
- **Product alignment** — *is the rung the game is best for the rung Study
  sells **B2C**?* **Nursing fails** (the game's strength is clinical
  judgment → **NCLEX**, but Study's B2C nursing vertical is **TEAS/HESI
  *entrance*** — pre-clinical academic recall; NCLEX is Elsevier/B2B, "out
  of scope"). **Teacher partially fails** (the game's killer *practicum*
  fit → **edTPA/PPAT**, a separate human-scored assessment Study doesn't
  sell; Study sells the **Praxis MC** knowledge/pedagogy exams — of which
  the **PLT/PPR scenario** items *are* a genuine, product-aligned fit).

These two axes catch every over-claim in the self-audit
([survey §backlog]) and are why the beachhead is CX/teacher, not TOEFL.

## 2. The verified CX enrollment / majors model

CX ("**College Accelerator**", the current brand; "College Saver" the older
name) is **not an enrolled-at-Study major.** It is **à-la-carte
credit-recommended courses you take and transfer toward a degree at an
*external* institution** — their own docs call it "very different from a
traditional college pathway." Verified structure (tables all present in
`ariel2_0`/`raptor`):

- The learner **declares a target field/degree** — `Member_Profile.cx_field_of_study`,
  `User_Profile_Degree` — and often a **target transfer school** (partners
  like **WGU** and Thomas Edison show up; plus "transfer anywhere accredited"
  users).
- Study models **`Major` → `Major_Course` / `Major_Requirement`**,
  **`Program` / `Canonical_Program` / `Degree_Tree`**, and
  **`Transfer_Guide` / `Transfer_Guide_Course_Info_For_Major_Course`** — i.e.
  *which Study courses transfer toward which major/program at which school*.
- A **`Course_Plan` / `Course_Plan_Template`** is the curated course sequence
  toward the goal; **`Credit_Progress`** tracks it; **advisors** are real
  (`Course_Info_For_Advisor`, `Member_Advisor_Referral`) — the "advisor
  suggests a major" beat has a real backing.
- Assessment = the **identity-verified proctored final** per course
  (TypingDNA + Veriff), plus CX's `AiMastery` / `Gradable_Course_Project`
  activities.

So "major" in CX = the learner's **declared target degree/field + a
transfer-guide/course-plan** toward it; Study is the affordable credit
*provider* feeding an external degree, not the degree-granter.

*Still to verify (not asserted): exact pricing ($199 KB vs $95/$235 public
— tiers or stale); whether B2C degree-paths are built or aspirational; the
detailed `Course_Plan`/`Major_Requirement` flow.*

## 3. The data finding — education dominates *both* products

Real `cx_field_of_study` distribution (stage, declared CX fields):
**Education (499) + Teaching (491) + Elementary Ed (409) + Math Ed (223) +
English Ed (188) + Science Ed (96) + Early-Childhood/Special/Secondary
(~120) ≈ ~2,000** — dwarfing the next fields (Psychology 303, Nursing 219,
Speech-Language 173, Counseling 163, Business 127, CS 109, Accounting 105).

So **education is the #1 field in CX *and* the #1 test-prep vertical**
(teacher cert). The single strongest Study learner archetype is the
**aspiring teacher**, who is *both* a CX education-major (credit toward the
ed degree) *and* a test-prep user (Praxis/state exams).

## 4. The beachhead: the aspiring teacher

Scored on every axis at once — and now data-backed:

- **Biggest real population, on both sides** (§3).
- **Clean medium fit** — English-native.
- **Clean product alignment** — Study sells *both* the CX credit courses
  *and* the Praxis prep; the game fits the PLT/PPR pedagogy scenarios
  directly.
- **The University model's native citizen** — enroll in the education path →
  study on campus → the classroom-as-a-stage (learner-becomes-teacher) →
  prep the cert → credit transfers toward the degree.
- **Hits all four execs** (completion / segment+mission / whole-funnel /
  mission) — see the marketing reframe.
- **Mission-aligned** — the real teacher-shortage + equity pass-gap (ETS's
  and Study's stated shared goal), replacing the weaker "Working Scholars"
  mission beat.

**Honest guardrail:** keep the *practicum / "learn to teach"* framed as
**experience and mission**, not a Study product (edTPA/PPAT is separate,
human-scored). The **product hooks** are **CX credit + Praxis prep**; the
practicum-rehearsal is the differentiated experience that makes them
stickier.

## 5. What this corrects elsewhere

- [study-com-vertical-survey.md](./study-com-vertical-survey.md) — "TOEFL is
  the beachhead/standout wedge" is **wrong**: TOEFL → a caveated
  immersion-*complement* (Reading+Writing only, entry barrier, intermediate+),
  and the **aspiring teacher (CX + Praxis)** is the beachhead. Add the two
  axes (§1) as first-class scoring.
- [study-com-teacher-vertical.md](./study-com-teacher-vertical.md) — add the
  **CX education-major** dimension (credit-toward-the-degree), and keep the
  practicum framed as experience/mission (§4 guardrail).
- [study-com-studyai.md](./study-com-studyai.md) — soften the
  "container-failure" reading of the pills stat (their doc frames pills as
  the *intended* interface; the honest claim is "the free-form assistant
  underperforms," not "nobody engages").
- [study-com-integration-examples.md](./study-com-integration-examples.md) —
  the nursing NGN case is NCLEX/clinical (already noted); the *game's*
  nursing fit is NCLEX, not the TEAS/HESI B2C entrance vertical (§1).

*Verified 2026-08-05 (stage DB + CX product docs). The self-audit that
produced §1 is the method to keep running before any vertical reaches the
pitch.*
