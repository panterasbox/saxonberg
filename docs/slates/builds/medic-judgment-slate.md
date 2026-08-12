# Medic-judgment slate (working doc) — clinical reasoning as the graded act

> **Status: sketch / pre-requirements.** A design pass, not a spec. Spun
> out of the study.com **vertical fidelity audit**
> ([../../study-com-vertical-fidelity-audit.md](../../study-com-vertical-fidelity-audit.md)
> §2), which found the `medic` vocation ships an **honest physiology
> mechanism + a skill check** but **no clinical-reasoning loop**: `treat`
> auto-selects "a body's worst bleeding wound" (harm.md:198) — the
> **triage/decision step is deleted by the sim** — and the graded deed
> grades the **outcome** (`dressingQuality × medicine band × difficulty`,
> harm.md:201-203), not the judgment. This slate adds the missing layer:
> **make the clinical *decision* the graded thing, adjudicated by the
> honest body.**
>
> **Why it's the same shape as inquiry.** The science↔academic audit found
> the [inquiry-slate](./inquiry-slate.md) is the **reference
> implementation** of this exact fix — it grades *reasoning* by asking you
> to **predict a novel case** and checking against the real evaluator,
> "ungameable by memorization" (inquiry-slate.md:80-88). The medic is the
> same idea in a different register: inquiry discovers a **general law** by
> experiment; the medic reasons about a **specific patient** by decision.
> Both grade the reasoning by **demonstration against the sim**, never by a
> stated answer or a roll.

See also:

- [inquiry-slate.md](./inquiry-slate.md) — **the template.** Same
  epistemic spine ("truth is demonstrated, not stated"); this is its
  specific-patient register, alongside deduction's specific-past-event one.
- [deduction-slate.md](./deduction-slate.md) — sibling: investigate a
  **specific case** by demonstrated evidence. The medic investigates a
  **present** patient the same way.
- [../../subsystems/harm.md](../../subsystems/harm.md),
  [../../subsystems/mortality.md](../../subsystems/mortality.md),
  [../../subsystems/metabolism.md](../../subsystems/metabolism.md) — the
  **honest mechanism** this rides. Already built; the reasoning layer is
  what's missing.
- [../../subsystems/advancement.md](../../subsystems/advancement.md) — the
  **Competence / Discipline / `ActSignature`** spine the graded decisions
  bank into (the `medicine` Discipline, harm.md:225-227).
- [college-slate.md](./college-slate.md) — the **Practical / Deed**
  assessment modes and the **nursing lab quest**: this slate *is* that
  quest, applied to the world's own medic.
- [../../study-com-vertical-fidelity-audit.md](../../study-com-vertical-fidelity-audit.md),
  [../../study-com-platform-reality.md](../../study-com-platform-reality.md),
  [../../study-com-integration-examples.md](../../study-com-integration-examples.md)
  §② — the **Study/NGN pedagogy scaffold** (below), reused not invented.

---

## The gap, precisely (from the audit)

Three verbs, no judgment:

- **`assess`** (harm.md:210-224) — a perception-gated **readout**; no roll,
  no effect. Signs are shown; and mortality already degrades the affliction
  readout to **signs-before-names** (mortality.md:422-431) — good, keep it.
- **`treat`** (harm.md:196-204) — dresses **"a body's worst bleeding
  wound," auto-selected.** The player never triages, forms a differential,
  or chooses the modality (instrument/medicine branches deferred,
  harm.md:190-194).
- **`undress`** (harm.md:206-209) — the clot gate; the one existing
  timing judgment.

Grading is `dressingQuality × medicine band × difficulty` — the **outcome**,
reading no decision the player made. Diagnostic-under-uncertainty exists
only as **deferred forensics** for corpses (mortality.md:198-200).

## The Study scaffold (reuse, not invent)

Real nursing licensure grades the **NGN Clinical Judgment Measurement
Model**: **recognize cues → analyze → prioritize hypotheses → generate
solutions → take action → evaluate.** The real postop-knee NGN case
(a *Nurses' Notes* timeline 0815 pain 4/10 → 0930 8/10, and six sequenced
questions walking that exact cycle,
[../../study-com-integration-examples.md](../../study-com-integration-examples.md)
§②) is the exemplar. That cycle is the loop below; Study's case structure
is its content scaffold.

## The clinical-judgment loop

The **answer key is the sim** — the honest body (harm/mortality/metabolism).
You recover the right care the way inquiry recovers a law: by acting and
letting reality grade you. Two keystones, lifted from inquiry-slate.md:75-88:

1. **The engine exposes cues, never the diagnosis.** `assess`/`analyze`
   give *this patient's* signs and measurements — data — never the
   condition name or the correct action. (mortality's signs-before-names is
   this keystone already half-built.) The moment a tool prints "lacerated
   femoral artery — apply pressure," judgment is dead. So it never does.
2. **Judgment is gated by *action on the patient*, not by stating the
   diagnosis.** No NLP, no naming the condition for credit. You **recognize
   the cue, prioritise the problem, and choose the intervention**; the
   patient's **honest physiology confirms or refutes** — the right call
   stabilises them, the wrong one lets the real problem deteriorate on its
   clock. Correctly caring for a *novel* presentation is proof of the
   judgment, ungameable by memorization, and trivial to build (the sim
   already computes the body's response). This is inquiry's predict-gate in
   the patient register: **the deed is the decision; the body is the grade.**

So the graded act moves from **outcome** (dressing quality) to **decision
quality** — did you read the cue, prioritise the right problem, pick the
intervention the honest body rewards — recorded as the `ActSignature`
Q-matrix's per-decision sub-checks (advancement.md:96-101, `recordSignature`
:184), banding a **clinical-judgment** competence.

## The pieces

| Piece | What it is | Reuses |
|---|---|---|
| **Stop auto-selecting** | `treat` requires the player to *choose* the target + modality (which wound, which patient, which intervention) — the auto-pick of "the worst bleeding wound" (harm.md:198) is removed. This alone restores the decision. | harm.md `treat` |
| **Cues, not answers** | `assess`/`analyze` expose signs + measurements, **withhold the condition name and the correct action** (extend mortality's signs-before-names, mortality.md:422-431). | harm/perception `assess` |
| **Triage under a clock** | multiple wounds/patients → the player *prioritises*; the **honest deterioration clocks** (the dying window mortality.md:36-59, bleed rate harm.md) make mis-prioritisation *consequential* — treat the wrong problem first and the right one worsens. | mortality dying clocks + harm bleed |
| **Decision → consequence grade** | the intervention's effect **is the sim's honest response**; grade the *decision* by whether the body improved, **never a roll**. | harm/vitals reconcile-on-read |
| **Clinical-judgment competence** | a Discipline (or a channel on `medicine`, harm.md:225-227) banded from the decision sub-checks — the "recognise / prioritise / intervene / evaluate" Q-matrix, not the outcome. | advancement Competence + `ActSignature` |
| **The unfolding case** | a patient NPC whose modelled state **deteriorates on a timeline** (the NGN 0815→0930 shape) — recognise→prioritise→act→**evaluate** over time, as a lab quest / live scenario. | classroom lab quest (college-slate) + behavior/NPC |
| **SBAR handoff (multi-player)** | communicate the patient's state to the incoming shift / provider; **they act on what you told them** — miscommunication → wrong downstream call. The real nursing competency a solo quiz can't touch. | comms / npc-dialogue + party |

## The honesty rails (and the design tension it resolves)

- **This consciously extends the "competence buys *information*, not
  *judgment*" axis** the vocations sit on (fidelity-audit §1) — but **stays
  in the ethos**: judgment is graded by **consequence** (the honest body's
  response), *never a roll*. Competence still buys the *reading* (`assess`
  acuity); the new thing is that the reading feeds a **decision with a
  consequence**. No RNG; no gating-by-course.
- **Rehearsal, not the licensure instrument.** NCLEX/NGN and the
  student-teaching-style performance assessments are external and
  human/agency-scored. This is a **practice and confidence space**, never
  the exam (practice scales; it does not replace the regulated practicum).
- **Real human anatomy/pharmacology is out of scope by design** (the
  [teachability boundary](../../study-com-teachability-boundary.md): the
  game models *a* body, not *the human* body). This teaches clinical
  *reasoning* on the honest fictional body; the real A&P facts stay
  study.com **reference**.

## Content-agnostic (build now) vs. supply (wait)

The judgment loop needs **no real-medicine facts** — it teaches clinical
*reasoning* on the game's own honest physiology, which the sim already
computes. So it ships **before any licensing deal**, exactly the "our own
systems ARE curriculum … build the machine now, fill it later" pattern
(vocations.md). Licensed/real content (real drugs, real A&P) extends it as
reference later; it is never a prerequisite.

## Build order

1. **Withhold the answer** — `assess`/`analyze` give signs + numbers, not
   names or actions; `treat` stops auto-selecting (player chooses target +
   modality). *Restores the decision; smallest change, unblocks everything.*
2. **Grade the decision by consequence** — the intervention's effect is the
   body's honest response; the graded sub-check is the *choice*, not the
   dressing quality.
3. **Triage under the clock** — multiple problems/patients + the
   deterioration clocks make prioritisation consequential.
4. **Clinical-judgment competence** — the `ActSignature` sub-checks
   (recognise/prioritise/intervene/evaluate) band into a Discipline.
5. **The unfolding case + SBAR handoff** — the NGN-timeline patient
   scenario as a lab quest; the multi-player handoff.
6. **The study.com claim-feed** — the witnessed judgment deed corroborates
   / informs Study's nursing mastery
   ([../../study-com-adaptive-feed.md](../../study-com-adaptive-feed.md),
   [../../study-com-dual-transcript.md](../../study-com-dual-transcript.md)) —
   the bidirectional synergy, once the integration exists.

1–4 ship on today's substrate (harm/mortality/advancement); 5 rides the
classroom composition; 6 waits on the integration.

## Open questions

- **How is the "differential" represented without NLP?** Same answer as
  inquiry's predict-gate: it's **action-based** — you don't name the
  hypothesis, you *act* on it and the body grades you. Confirm this fully
  covers "analyze" (the second NGN step) or whether a lightweight
  cue→hypothesis selection (choose from surfaced possibilities, not free
  text) is needed.
- **`medicine` Discipline vs. a new `clinical-judgment` Discipline** — is
  reasoning a channel on `medicine`, or its own leaf? (Mirrors the
  inquiry-slate's "scientific-method Discipline" question.)
- **How much triage before it's busywork?** The clock must make
  prioritisation matter without turning into reflex-twitch; tune against
  the dying-window durations (mortality.md:36-59).
- **Grading the SBAR communication** — the lived handoff is
  consequence-gradable (did the receiver act correctly on what you sent?);
  the *quality* of the communication itself may need the essay/viva layer
  (college-slate Essay mode).
- **Does the same loop generalise to the `vet`?** The audit flagged the vet
  as the closest medic-adjacent judgment seam ("observation without
  self-report"); this loop may serve it with no new design.
