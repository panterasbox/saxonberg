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
- **Reasoning loop: fully designed, but UNBUILT.** The insurance-slate is
  *organized around* judgment — **"if both sides know the same things,
  build a MENU; if one side knows more, build a VOCATION"**
  (insurance-slate.md:276-278); portfolio construction with correlation
  making a concentrated book **"insolvent by design"**
  (insurance-slate.md:26-34) — a genuine assess-risk → decide-exposure →
  **bear-consequence** cycle, made *legible by the public record*
  (insurance-slate.md:190-206). **The post-merge `credit-slate` (verified
  2026-08-05) deepens this into a full lending loop** — assess
  creditworthiness → decide to lend / set terms → **bear default**
  (foreclosure, distressed-debt, discharge) — with a **human practitioner
  deliberately seated at the locality / commercial-bank layer** ("local
  knowledge substitutes for credit scoring", credit-slate.md:435-437),
  while the **central bank stays deliberately practitioner-free** ("the CB
  never makes a credit judgment at all", credit-slate.md:176-178). So the
  earlier "leans *read*, not *recommend*" read **softens — the design now
  models decide-and-bear-consequence.** **But none of it is built** — the
  built layer is a *per-currency* conserved ledger + a payments **MENU with
  no practitioner** ("the vocation does not exist", insurance-slate.md:256;
  lending still deferred, banking.md:546-548), and `credit-slate` is
  explicitly "Not requirements."
- **Study pedagogy:** Securities/Insurance licensure grades **suitability**
  — match a *product* to a *client's* need, risk tolerance, and the
  regulation, under fiduciary duty. Concepts present: **"Suitability
  analysis," "Underwriting," "Risk assessment," "Medical underwriting."**
- **The gap:** the finance family is *closer* than the medic (judgment is
  now *fully* designed, and public-record legibility is arguably a *better*
  assessment than an MCQ), but (a) it's **unbuilt**, and (b) even with
  `credit-slate`'s *lender-side* underwriting loop, it doesn't model the
  **securities client-suitability** frame licensure centers on — an
  *adviser recommending a product to a client under fiduciary duty and
  bearing the complaint*, a different loop from a lender assessing a
  borrower.
- **The fix:** build the designed vocation layer, and add the **suitability
  decision** — recommend the right instrument for a *modeled client's*
  need/risk, and bear the consequence (complaint, loss, discoverable
  misconduct) if it's unsuitable. The public ledger makes the reasoning
  gradable after the fact.

## 3b. Worked audit C — science ↔ academic (the positive-case check)

Run to test whether the audit also *confirms* a match, not only finds gaps.
I'd flagged science as the "likely MATCH." **Verification flipped it —
science is a GAP, the same axis as finance: the reasoning loop is fully and
*well* designed, but unbuilt.** (A clean demonstration of why the audit
reads real data instead of trusting the prior.)

- **Mechanism (honest ✅, built):** the shipped physics — thermal,
  electricity, materials, metabolism, ballistics — plus the observe/measure
  instruments (`measure` / `analyze` / `assess`) that read one honest
  number off a channel.
- **Reasoning loop: modeled, gets the pedagogy *right*, but
  DESIGNED-not-built.** `inquiry-slate.md` specifies the canonical loop
  (observe → measure → hypothesize → **predict** → verify) and — unlike
  medic (outcome-only) and finance (leans "read") — it grades the
  *reasoning*: "the engine exposes measurements, never the model," and
  "**discovery is gated by *prediction*, not by stating the law** … predict
  a *novel* case … ungameable by memorization" (inquiry-slate.md:80-88);
  the college generator's **named characteristic-error distractors** name
  the misconception a wrong pick reveals (college-slate.md:252-303). *That
  is exactly the reasoning-grading real science pedagogy uses — and
  stronger than selected-response.* **But it ships as "sketch /
  pre-requirements … zero implementing code"** — no `Law` catalog, no
  `predict` gate, no inquiry Discipline; the five arcane-science labs "run
  on the shipped build" only as **ungraded demonstrations** ("a teaching
  laboratory that was only ever missing its theory", arcane-science.md:1480);
  the college **Practical** mode grades **result-within-tolerance (the
  outcome)** and "depends on the inquiry build" (college-slate.md:119,
  724-725).
- **Study pedagogy (a real match to the design):** Study teaches
  science-as-reasoning — the concept graph carries **Controlled Experiment,
  Data analysis, Dimensional analysis, Confounding, Error analysis, History
  of scientific method**, and the real thermo items are *reasoning* items
  ("which conclusions correctly explain … according to kinetic molecular
  theory"), not recall. Per the teachability boundary, science *facts* stay
  reference (study.com); the *method* is the game's to enact.
- **The gap + the fix:** identical pattern — **build** the designed inquiry
  loop (a `Law` catalog + the `predict` gate + a scientific-method /
  inquiry Discipline) so the reasoning becomes a graded, consequence-checked
  activity. **Science is the *reference implementation* of the fix:** its
  design already grades reasoning correctly (predict-a-novel-case,
  misconception distractors), so building it both closes this gap *and*
  gives the medic and finance fixes a working template.

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
| **science** (thermal/electricity/metabolism/materials/ballistics) ↔ **Academic science** | ✅ | **AUDITED → §3b. NOT the hypothesised match — a GAP (inquiry loop designed *right* but unbuilt), the best-designed of the three and the fix's reference implementation.** |
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

Saxonberg models the **honest mechanism** faithfully — but across **all
three audited verticals** the **reasoning layer real pedagogy grades**
(clinical judgment · suitability · scientific inquiry) is **absent (medic)
or designed-but-unbuilt (finance, science)** — one axis, one root cause:
the world buys *information* with competence, not *decisions*. **Science is
the best-designed case** — its inquiry loop already grades the reasoning
(a predict-a-novel-case gate + misconception distractors) — and so is the
**reference implementation** of the single fix: **layer the reasoning loop,
grade the decision by consequence, reuse Study's scaffold** (which doubles
as the applied classroom's lab content). The planning agents got the
mechanism right and the pedagogy *designed-right-but-unbuilt*; the lesson of
the science case is that **verification, not the prior, is what tells a
match from a gap** — my "likely MATCH" was wrong until the data corrected
it. Documented; fixable in a session.

*Verified 2026-08-03; re-verified against merged master + science audited
2026-08-05 (stage DB + subsystem docs). Remaining backlog rows
(teacher/appraiser/HR) are hypotheses, not yet audited with real data.*
