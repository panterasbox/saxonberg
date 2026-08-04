# Vertical fidelity audit — do the modeled industries teach the discipline's *reasoning*?

> **Status: audit + fixes, aspirational.** Cross-references Saxonberg's
> **modeled vocations** ([vocations.md](./vocations.md) + the subsystem
> docs) against **how Study.com's content teams actually teach the
> matching discipline** — using Study's real content (concepts, case
> structure) as the check instead of the training-data priors the planning
> agents worked from. Grounded 2026-08-03 (stage DB + the subsystem docs).
> It finds a **consistent, fixable gap**, and the fix is a Saxonberg-session
> change, not a redesign.

---

## 0. The question, and why it's the right one

Saxonberg's "model honestly" principle is **fidelity to the mechanism** —
"the game's own systems ARE curriculum" (Ohm's law, Newton cooling,
metabolism, materials). But **a profession's pedagogy is usually the
*reasoning process over* the mechanism**, not the mechanism itself. A
nurse is licensed on **clinical judgment**, not wound physics; a securities
rep on **suitability**, not arithmetic. So the audit asks, per modeled
vocation: **does it teach/assess the reasoning the discipline is actually
graded on — or only the honest mechanism plus a skill check?**

Method: **Saxonberg model** (subsystem docs) **× Study pedagogy** (the
real content concepts + case structure).

## 1. The meta-finding: "competence buys *information*, not *judgment*"

Saxonberg's vocations sit on one deliberate axis. The register's assessor
family — appraiser · assayer · underwriter · banker · credit-surveyor —
shares a single verb: **read a hidden state better than the other party**
(insurance-slate.md:42-50). Competence sharpens what a player can **read**;
it does **not** drive a branching **decision**. This is *principled* —
"competence buys **information, not outcomes** … no roll, no effect on the
clock" (mortality.md:102-106) — an anti-RNG, anti-gating stance the world
holds on purpose.

**Its pedagogy cost:** the professions Study teaches grade **judgment** —
and that loop is absent. This is the root cause behind every gap below, so
the fix is one pattern (§4), applied per vocation.

## 2. Worked audit A — `medic` ↔ Nursing

- **Mechanism (honest ✅):** injury/physiology as reconcile-on-read drivers
  — outside-in wound resolution, five trauma behaviors, a bleed/clot
  machine, a rescuable dying window, intake chemistry (harm.md:70-162,
  mortality.md:36-59, metabolism.md:52-134). Genuinely faithful.
- **Reasoning loop: NO.** The player-medic has three verbs — `assess`
  (a perception-gated **readout**; no roll, no effect), `treat` (dresses
  **"a body's worst bleeding wound"** — the sim **auto-selects** the
  target), `undress` (the clot-gate) (harm.md:196-224). The **prioritize /
  differential step is deleted by the sim**; the graded deed is the
  **outcome** (`dressingQuality × medicine band × wound-derived
  difficulty`, harm.md:201-203), which reads *no decision the player made*.
  Diagnostic-under-uncertainty exists only as **deferred forensics** for
  corpses ("the examiner reads signs and can be wrong … nothing consumes it
  yet", mortality.md:198-200, 581-582).
- **Study pedagogy:** the **nursing process** / NGN **clinical-judgment
  model** — recognize cues → analyze → prioritize → take action →
  evaluate. The *reasoning is the graded thing* (the six-question unfolding
  case, e.g. the postop-knee NGN case
  ([examples](./study-com-integration-examples.md) #②)). Study's content
  carries the concepts explicitly: **"Nursing process," "Differential
  diagnosis," "Prioritization."**
- **The gap:** Saxonberg's medic teaches *how to treat a wound*; nursing
  teaches *how to decide what's wrong and what to do first, under
  uncertainty, on a deteriorating patient.* The model already owns the
  ground truth (an honest body) — it just **skips the judgment**.
- **The fix (Saxonberg-session):** stop auto-selecting. Require the player
  to **recognize cues** (the `assess` readout becomes an input to a
  decision, not an answer), **form the differential**, **prioritize**
  (which wound / which patient first — triage), **choose the intervention**
  (once the instrument/medicine branches ship, harm.md:190-194), and
  **evaluate** — and grade the **decisions** against the honest
  physiological consequence. **Reuse Study's NGN case structure as the
  scaffold** (recognize→analyze→prioritize→act→evaluate). This *stays in
  the ethos*: the player's **judgment** — not a roll — drives the outcome,
  and the honest world adjudicates whether it worked (a *better* assessment
  than an MCQ, because the body actually responds). And note: **this is
  the nursing lab quest from [classroom-model](./study-com-classroom-model.md)
  §7 — the fidelity fix and the lab design are one build.**

## 3. Worked audit B — `banking`/`insurance` family ↔ Securities/Insurance

- **Mechanism (honest ✅, built):** a conserved two-tier ledger, one sealed
  write chokepoint, structural conservation per leg (banking.md:35-74).
  Rigorous economic mechanism.
- **Reasoning loop: designed, but UNBUILT — and it leans "read," not
  "recommend."** The insurance-slate is *organized around* judgment —
  **"if both sides know the same things, build a MENU; if one side knows
  more, build a VOCATION"** (insurance-slate.md:276-278); **"portfolio
  construction … is the real skill"** with correlation making a
  concentrated book **"insolvent by design"** (insurance-slate.md:26-34) —
  a genuine assess-risk → decide-exposure → **bear-consequence** cycle,
  made *legible by the public record* ("a bad actuary is provably bad,
  after the fact", insurance-slate.md:190-206). **But none of it is built**
  — the built layer is a payments **MENU with deliberately no
  practitioner** ("the vocation does not exist", insurance-slate.md:256).
  And even the design reframes judgment as **"better reading of public
  data"** (insurance-slate.md:198-202) rather than a *recommendation*.
- **Study pedagogy:** Securities/Insurance licensure grades **suitability**
  — match a *product* to a *client's* need, risk tolerance, and the
  regulation, under fiduciary duty. Concepts present: **"Suitability
  analysis," "Underwriting," "Risk assessment," "Medical underwriting."**
- **The gap:** the finance family is *closer* than the medic (judgment is
  designed, and public-record legibility is arguably a *better* assessment
  than an MCQ), but (a) it's **unbuilt**, and (b) it's light on the
  **client-suitability recommendation** that licensure centers on — the
  design models *reading risk*, not *recommending to a client and bearing
  the complaint.*
- **The fix:** build the designed vocation layer, and add the **suitability
  decision** — recommend the right instrument for a *modeled client's*
  need/risk, and bear the consequence (complaint, loss, discoverable
  misconduct) if it's unsuitable. The public ledger makes the reasoning
  gradable after the fact.

## 4. The reusable fix pattern

For any modeled vocation whose real discipline grades reasoning:

> **Layer the profession's reasoning loop onto the honest mechanism, and
> grade the *decision by real consequence* — never by a hidden roll.**

- The loop is the same shape everywhere: **assess/recognize → analyze →
  prioritize/decide → act → evaluate** (clinical judgment) or
  **assess-need → recommend → bear-consequence** (suitability).
- It is **compatible with "competence buys information"**: the information
  *informs* a judgment the **player** makes and is graded on — competence
  still buys the *reading*; the new thing is that the reading feeds a
  **decision with consequence**, instead of the sim deciding.
- **Study's content is the scaffold** — the nursing process, suitability
  analysis, the NGN case structure already exist; this is **reuse, not
  invention**, and the exact bidirectional synergy the integration promised
  (Study's pedagogy improves the game's models).
- **The reasoning loop *is* the lab quest** (classroom-model §7), so every
  fidelity fix doubles as content for the applied classroom.

## 5. The audit backlog (hypotheses to run in a session)

| Overlap | Model has the mechanism? | Reasoning loop? (hypothesis) |
|---|---|---|
| **science** (thermal/electricity/metabolism/materials/ballistics) ↔ **Academic science** | ✅ | **LIKELY MATCH** — arcane-science is judgment-rich (predict→verify, the misconceptions bank, the four-part paper read) mirroring real science pedagogy + Study's misconception distractors. The one modeled area where reasoning *is* present (the discovery/inquiry loop). Confirm vs Study's course sequencing. |
| `teacher` ↔ **Teaching** | (pedagogy substrate) | **LIKELY MATCH** — "competence *is* the product"; the teacher-role classroom *is* the reasoning loop, if the teaching-deed grades pedagogical decisions ([teacher-vertical](./study-com-teacher-vertical.md)). |
| `appraiser`/`surveyor` ↔ **Real Estate** | ✅ (information asymmetry) | **PARTIAL** — models appraisal reasoning but misses real-estate law/agency/client-representation reasoning. |
| `vet` ↔ (veterinary/animal science) | ✅ | **CLOSEST medic-adjacent** — "observation without self-report" is a real diagnostic-under-uncertainty seam; the one place the model leans toward judgment. |
| `employment`/HR-ish ↔ **HR (SHRM)** | ✅ (positions/wages) | **GAP** — SHRM is situational judgment ("BEST action"); the model has the mechanism, not the decision loop. |
| crafting/trades ↔ **CTE** | ✅ (making) | different axis — CTE pedagogy is *teaching the trade*, not doing it. |

## 6. Caveats (kept honest)

- **Concept-existence ≠ course-depth.** The reasoning concepts ("Nursing
  process," "Suitability analysis") come from Study's DBpedia-linked
  concept graph ("Bingipedia") — proof they *exist* in the taxonomy, not
  how deeply a given course *sequences* them. Fixes that hinge on
  sequencing need a course-level confirmation, not a concept-existence one.
- **The "information not judgment" axis is a principled choice, not a
  bug** (anti-RNG, anti-gating). The fix must keep judgment
  **consequence-graded, not roll-graded**, to stay in the ethos — which it
  does by design (§4).
- **Some professional reasoning can't be staged in a text world.** Claim
  the stageable slice (triage, prioritization, suitability, questioning),
  not the whole practicum.

---

## Bottom line

Saxonberg models the **honest mechanism** faithfully — but the **reasoning
layer that real pedagogy grades** (clinical judgment, suitability) is
**absent (medic) or designed-but-unbuilt (finance)**, both for the same
root reason: the world buys *information* with competence, not *decisions*.
The planning agents got the mechanism right and the pedagogy half-right.
The fix is one pattern — **layer the reasoning loop, grade the decision by
consequence, reuse Study's scaffold** — and it doubles as the applied
classroom's lab content. Documented; fixable in a session.

*Verified 2026-08-03 (stage DB + subsystem docs). The backlog rows are
hypotheses, not yet audited with real data.*
