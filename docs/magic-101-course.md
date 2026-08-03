# Magic 101 — Foundations of Thaumology (the full course)

> **Status: design/sketch.** Aspirational throughout — nothing here has
> touched a live study.com environment, and no learner has sat this
> course. This document **expands §8** of
> [study-com-integration.md](./study-com-integration.md) into a
> standalone course spec that Saxonberg content agents can author actual
> lessons, items, and labs from. It is the synthesis of the invented
> science in [arcane-science.md](./arcane-science.md) into study.com's
> real content shape (course → chapter → lesson → objective → item),
> using the item model in study-com-integration.md §§1-2.
>
> **Honesty rail (inherited from both parents).** *Nothing may
> contradict real science* (arcane-science.md, the hard rule) and
> *nothing may misrepresent the study.com product*
> (study-com-integration.md, the reciprocal rail). Every graded
> objective below is a **real, transferable skill** — thermodynamics,
> dimensional analysis, curve-fitting, statistical literacy, reading a
> paper, ethical reasoning. The invented content is confined to **one
> postulate and one taxonomy**; everything a student is scored on is
> real.
>
> **Re-verify rail.** The arcane-science audit log
> ([arcane-science.md](./arcane-science.md):17-27) flags that its
> most confident-sounding passages have historically hidden errors (a
> spurious second exemption in cooling, missing momentum, a backwards
> Crowe/Melloni history claim). So specific quantities and history
> claims below carry a **`[re-verify]`** marker: use the number, but
> recompute or re-source it end-to-end before it lands in a shipped item
> or lesson. A `[re-verify]` is not a doubt about the pedagogy; it is the
> audit discipline the source document demands of itself.

---

> **⚠️ Verified corrections — read
> [study-com-platform-reality.md](./study-com-platform-reality.md) first
> (2026-08-03).** The course design stands, but two mappings changed: the
> **ISCED-F spine below is Saxonberg-*internal* only** (Study has no
> ISCED-F/CIP code — a course/item maps to Study via an authored crosswalk
> to `Concept`/`ExamTaxonomyNode`, not a shared code), and the
> thermodynamics items map cleanly onto **real Study `MULTI_SELECT` items
> that already exist** (e.g. a sealed-tank / kinetic-theory item pulled
> from the live bank). Reality doc wins on any conflict.

## Course metadata (identical to study-com-integration.md §8.1)

```
title:            Magic 101: Foundations of Thaumology
subject:          Science  (Physical Sciences)
credit target:    3 semester hours, lower division            [aspirational]
ISCED-F spine:    0533 Physics       (primary)
                  0541 Mathematics   (measurement, modelling, statistics)
                  0223 Philosophy & ethics  (Chapter 8, the ethics unit)
```

**Course-level outcomes (roll-up of the lesson objectives).** Kept
identical to the parent doc; each is a real, gradable skill, none is
"know a magic fact":

1. Account for the energy in a magical act using conservation and the
   price list, in kJ, with correct phase-change and efficiency terms.
2. Apply thermodynamics (specific/latent heat, exergy, Carnot COP, the
   third-law cost curve) to predict whether a spell is affordable.
3. Use dimensional analysis to reject any claim that cannot be
   dimensionally closed.
4. Fit affine and exponential models to measured data; state a result
   with its range, its error, and what it is silent about.
5. Read a scientific paper for claim, evidence, range, and silence, and
   distinguish an honest overreach from a fabrication.
6. Reason about a loaded scientific question (the ethics of a measured
   intercept) without collapsing positive and normative claims.

These six are the assessment spine. Course outcome *n* is satisfied by
the union of the chapter objectives tagged to it (mapping in each
chapter below and summarized in the final-exam blueprint).

---

## Learning-objective (LO) coding scheme

Every objective carries a stable code so items, labs, and the adaptive
feed can reference it:

```
THAUM101.LO.<chapter>.<n>
              │          └ objective index within the chapter (1-based)
              └ chapter number (1..8)
```

Example: `THAUM101.LO.4.2` = Chapter 4, objective 2 (already used in
study-com-integration.md §2.3). Codes are **durable**: reordering
lessons never re-numbers an existing LO — a retired objective's index is
never reused. An item's `objectiveRef` is exactly one LO code; a lesson
may teach one or two. The `taxonomyNodeRef` on an item is the ISCED-F
skill node the LO hangs from (the *competency* tree of
study-com-integration.md §1.1), not the LO code itself.

---

## The eight chapters

Chapter titles are fixed by study-com-integration.md §8.2. Sizing
follows study.com norms: 5-8 lessons per chapter (each ~5-10 min
video + transcript + a short lesson quiz), one **chapter test** or one
**Practical** per chapter, one course-spanning **final exam**.

### Chapter 1 — The one impossible thing

**Goal.** State the single invented postulate, establish exactly which
conservation law it breaks (locality) and which it does not (everything
else), and derive its immediate consequences — so the student can, from
lesson one, tell an invented claim from a real one.

| Lesson | Learning objective(s) |
|---|---|
| 1.1 The postulate, stated once | **LO.1.1** State the postulate and name the one law it breaks (locality / the continuity equation) and at least two it preserves. |
| 1.2 Local fails, global holds | **LO.1.2** Distinguish local from global conservation of energy; explain what the continuity equation asserts and where it is violated here. |
| 1.3 The caster is always an endpoint | **LO.1.3** Explain why one endpoint is always the caster's own body, and derive one consequence (e.g. cold magic cooks the caster). |
| 1.4 Magic never creates matter | **LO.1.4** Use `E = mc²` to show a litre of water is ~9 × 10¹⁶ J `[re-verify]` and conclude every "conjuration" must be a collection, not a creation. |
| 1.5 Every push shoves both ways | **LO.1.5** Apply conservation of momentum to predict that a delivered impulse recoils onto the caster. |
| 1.6 What the postulate does *not* excuse | **LO.1.6** Given a proposed effect, decide whether it needs a *second* exemption beyond locality, and reject it if it does. |

**Assessment.** Lesson quizzes + a **chapter test** (blueprint: ~12
items, mostly conceptual "does this need a second exemption?" and one
`E = mc²` order-of-magnitude item; no phase-change math yet).

**Real skills taught.** Conservation of energy and momentum; reading a
formal claim for its *exact* scope; `E = mc²` order-of-magnitude
estimation; the discipline of not smuggling in a second miracle.

### Chapter 2 — Energy accounting (mana is kilojoules)

**Goal.** Fix the thaum as a kilojoule via Halloway Equivalence, and
separate a *stock* (reserve capacity) from a *flow* (recovery rate) —
the most-failed distinction in this field and every field with both.

| Lesson | Learning objective(s) |
|---|---|
| 2.1 Halloway Equivalence | **LO.2.1** State `E_delivered = η · E_spent`; explain how a calorimetry experiment (the field's paddle-wheel `[re-verify]` — Joule, 1840s) fixed 1 τ ≡ 1 kJ. |
| 2.2 The thaum has a dimension | **LO.2.2** Perform a dimensional analysis on a proposed quantity and reject a dimensionally inconsistent claim. |
| 2.3 Reserve vs recovery (stock vs flow) | **LO.2.3** Distinguish Depth (τ, capacity) from Serenity (τ·min⁻¹ ≡ W, rate); explain why they are independent axes and neither predicts the other. |
| 2.4 The quarter-banana budget | **LO.2.4** Compute a full reserve as a fraction of the body's ~8.5 MJ glycogen store `[re-verify]` (≈1.4%) and give the order of magnitude (a banana ≈ 440 kJ). |
| 2.5 Recovering is exercise, not rest | **LO.2.5** Compare recovery power (180 / 300 / 480 W by band `[re-verify]`) to metabolic benchmarks (basal ≈97 W, brisk walk 300-400 W) and predict the metabolic cost of a refill. |
| 2.6 The one-grenade-a-day ceiling | **LO.2.6** Argue from energy density (a caster ≈0.3 MJ/kg vs coal ≈30 MJ/kg `[re-verify]`) why magic never industrialized. |

**Assessment.** Lesson quizzes + a **chapter test** (~12 items:
dimensional-analysis rejections, unit conversions, one stock-vs-flow
refill computation — see worked Item 2 below).

**Real skills taught.** Unit conversion; dimensional analysis as a
consistency check; the stock-vs-flow distinction; order-of-magnitude
budgeting; energy-density comparison.

### Chapter 3 — The price list (exergy)

**Goal.** The postulate lets you choose the *form*; the second law
charges for the choice. Establish exergy as a measurable price list, and
that competence *is* delivery efficiency, capped at η ≤ 1.

| Lesson | Learning objective(s) |
|---|---|
| 3.1 Not all joules are equal | **LO.3.1** Rank delivery forms by efficiency (heat 0.85 → kinetic 0.55 → electrical 0.40 → coherent light 0.30 `[re-verify]`) and explain the ordering as exergy. |
| 3.2 Where the losses go | **LO.3.2** Compute the heat dissipated *in the caster* from η and committed energy (a 35.2 τ firebolt leaves ≈5.3 kJ in the body `[re-verify]`), and explain the "novices run hot" folk belief as η. |
| 3.3 The firebolt, worked | **LO.3.3** Compute a firebolt's committed energy from the price list — sensible heat + moisture vaporisation, then divide by η. |
| 3.4 Competence is efficiency | **LO.3.4** Explain why mastery is bounded (η ≤ 1) and compute the master-vs-novice ceiling (0.85 / 0.35 ≈ 2.4× `[re-verify]`). |
| 3.5 The second law as anti-power-creep | **LO.3.5** Argue why no artifact, augment, or authored effect can deliver more than was committed. |

**Assessment.** Lesson quizzes + the **Halloway calorimetry Practical**
(lab spec below) — the founding experiment, run in the casting yard's
stone basin.

**Real skills taught.** Efficiency and exergy; energy balance and where
losses land; bounding arguments; the idea that a physical law can be an
anti-inflation mechanism because "it cannot be lobbied."

### Chapter 4 — Heat, phase change & the cold problem

**Goal.** Specific and latent heat, phase change, and the field's
subtlest result: cooling is a Carnot-priced heat pump whose limit is the
caster's body temperature, not their reserve. The mana bar is not the
danger meter.

| Lesson | Learning objective(s) |
|---|---|
| 4.1 Specific vs latent heat | **LO.4.1** Distinguish sensible (`Q = mcΔT`) from latent heat; compute both for a phase change. |
| 4.2 Committed energy with phase change | **LO.4.2** Compute a spell's committed energy from the price list, including phase-change terms. *(the code used in study-com-integration.md §2.3)* |
| 4.3 Conjure-water is a dehumidifier | **LO.4.3** Model conjuration as collection; compute the humidity-limited yield (air at 20 °C, 50% RH holds ≈8.6 g/m³ `[re-verify]`, so 100 g needs ≈20-40 m³). |
| 4.4 The mana bar ≠ the danger meter | **LO.4.4** Compute the caster's core-temperature rise from the absorbed `Q + W` and explain why a ~34 τ spell kills on the fourth casting. |
| 4.5 Carnot COP and cooling | **LO.4.5** Compute the work to move heat up a lift with `W ≥ Q·(T_hot − T_cold)/T_cold`; show COP > 1 near ambient (ideal ≈18, realistic ≈7 at a 17 K lift `[re-verify]`). |
| 4.6 The third-law cost curve | **LO.4.6** Show the COP diverging as the target cools (≈7 → ≈2.2 by −20 °C `[re-verify]`) and conclude absolute zero is unreachable at any price. |

**Assessment.** Lesson quizzes + a **chapter test** (~15 items: `mcΔT`
+ latent-heat compositions, one COP computation, one "why can no cold
spell have a flat mana cost?" conceptual item, one core-temperature
danger item — worked Item 4 below).

**Real skills taught.** Thermodynamics end-to-end; phase change; heat
pumps and the Carnot bound (including the counterintuitive COP > 1);
psychrometrics; the third law arrived at as a diverging cost curve.

### Chapter 5 — Momentum, recoil & dielectric breakdown

**Goal.** Momentum rides the channel, so Newton's third law is not
suspended: every push shoves both ways, an unbraced shove costs double,
and the danger in a spark is the current, not the energy.

| Lesson | Learning objective(s) |
|---|---|
| 5.1 Every push shoves both ways | **LO.5.1** Apply momentum + energy conservation to compute a recoil and show an unbraced symmetric shove commits *double* the delivered kinetic energy. |
| 5.2 Bracing | **LO.5.2** Explain how bracing routes recoil through friction into the ground (a rifle against a shoulder) and contrast braced vs unbraced cost. |
| 5.3 Control·Body is one of the dearest acts | **LO.5.3** Explain, from recoil, why moving mass is among the most expensive things in the roster. |
| 5.4 Dielectric breakdown | **LO.5.4** Compute the potential to break down an air gap (air breaks down at ~3 kV/mm `[re-verify]`, so a 1 cm gap needs ≈30 kV). |
| 5.5 Lethal in amps, not thaums | **LO.5.5** Distinguish delivered energy from current; explain why a shock of a few tens of joules `[re-verify]` can stop a heart while costing almost nothing in τ. |
| 5.6 The caster in the circuit | **LO.5.6** Apply "the caster is an endpoint" to conclude a mage standing in a conductive pool is part of their own circuit. |

**Assessment.** Lesson quizzes + a **chapter test** (~13 items: recoil
computations — worked Item 5 below — a breakdown-voltage item, and one
"why does the brine pool shock the caster?" conceptual item). The
**circuit-membership Practical** (lab spec below) may substitute for
part of the test where the Practicum is available.

**Real skills taught.** Momentum conservation and Newton's third law;
electrostatics and dielectric breakdown; the energy-vs-current
distinction that underlies all electrical safety.

### Chapter 6 — Measurement & modelling

**Goal.** Turn the student into a measurer: dimensional analysis as a
lie-detector, affine and exponential model-fitting, error bars, and the
metrologist's spine — primary vs secondary instruments and traceability.

| Lesson | Learning objective(s) |
|---|---|
| 6.1 Dimensional analysis as a lie-detector | **LO.6.1** Reject a proposed law or model whose dimensions do not close; identify the offending term. |
| 6.2 Affine and exponential models | **LO.6.2** Fit an affine model (the Reeve Line, `C = C_band(f + (1−f)m)`) and an exponential decay (Voss, `t = E/λ`); extract slope, intercept, and rate. |
| 6.3 Extrapolation and its dangers | **LO.6.3** State a fit's valid range and identify where extrapolation is unwarranted (the "no distance term" claim, valid only under ~30 m `[re-verify]`). |
| 6.4 Error bars and replication | **LO.6.4** Report a measurement with its uncertainty; distinguish instrument noise from biological variability (the reserve gauge reads a living system). |
| 6.5 Primary vs secondary instruments | **LO.6.5** Classify an instrument as primary (value from first principles, e.g. the calorimeter) or secondary (fast, convenient, meaningless until calibrated); explain traceability. |
| 6.6 Characteristic errors | **LO.6.6** Given an instrument, name its characteristic error and its fix (calorimeter leaks → extrapolate the cooling curve to `t = 0`; survey meter → spatial-sampling artifacts). |

**Assessment.** Lesson quizzes + the **Reeve-line Practical** (lab spec
below) — drain a subject in steps, plot, fit, and personally discover
that the intercept f > 0.

**Real skills taught.** Curve fitting (affine and exponential);
extrapolation and its failure modes; uncertainty and replication;
metrology — traceability, primary vs secondary standards, and the
back-extrapolation of a leaky reading.

### Chapter 7 — Reading the literature

**Goal.** Reading papers *is* the discipline. Teach the four-part read,
calibrated trust (not blanket suspicion), and the statistical traps that
make wrong papers survive: power, the winner's curse, and confounding.

| Lesson | Learning objective(s) |
|---|---|
| 7.1 The four-part read | **LO.7.1** Read a paper for **claim · evidence · range · silence**, and identify what a paper did *not* measure or report. |
| 7.2 Calibrated trust | **LO.7.2** Explain why a shelf that is all-traps mistrains (distrust) as badly as one that is all-solid (credulity); the honest ratio is ≈5 solid : 2 flawed : 1 wrong `[re-verify]`. |
| 7.3 Power and the winner's curse | **LO.7.3** Compute a study's power; explain why an underpowered study that reaches significance *necessarily* overstates its effect. |
| 7.4 Confounding | **LO.7.4** Identify a confound (riverside recovery is rest quality, not hydrology) and separate a real effect from its wrongly-attributed cause. |
| 7.5 The cost of checking | **LO.7.5** Classify a claim by how expensive it is to verify, and explain the design rule that wrong papers live where checking is dear. |
| 7.6 The unanswerable pair | **LO.7.6** Given two indistinguishable papers, recognize that intent is *not* decidable from the artifact, and name what provenance evidence would bear on it. |

**Assessment.** Lesson quizzes + an **Essay / viva (Essay mode)** — a
written four-part read of one shelf paper, optionally defended as an
oral viva (a dialogue trivial in a text world, impossible for a static
content library; study-com-integration.md §5). LLM-graded by default;
human-graded-by-a-player-instructor is a provenance question (§ open).

**Real skills taught.** Scientific literacy; statistical power and the
winner's curse; confounding; and the provenance reasoning that Chapter 8
and the final exam both turn on.

### Chapter 8 — Ethics of a measured intercept

**Goal.** The field's one place where the technical and the moral are
the same question: the composure floor f > 0. Teach the positive /
normative distinction, the therapeutic-vs-autonomous argument, and how
to reason about incentives acting on evidence.

| Lesson | Learning objective(s) |
|---|---|
| 8.1 The Reeve floor, f > 0 | **LO.8.1** Interpret the shipped constant f = 0.4 `[re-verify]`; compute composure across reserve fractions (drained 0.40 → full 1.00) and show the mana axis is worth only ≈2.5×. |
| 8.2 Positive vs normative | **LO.8.2** Separate a positive claim ("f = 0.4") from a normative one ("the floor ought to be reduced"). |
| 8.3 Therapeutic vs autonomous | **LO.8.3** Steelman *both* sides — a floor on rewriting is also a ceiling on rescue from trauma or addiction — without endorsing either. |
| 8.4 Incentives on the evidence | **LO.8.4** Explain why a measurement that would license a wanted conclusion (f varies between people → a sorting → a policy) demands scrutiny of the incentives, not just the data. |
| 8.5 The Ordinance as a long experiment | **LO.8.5** Characterize the Ordinance's "f is an artifact of technique" as an empirical claim being tested at scale, and evaluate it on the merits. |
| 8.6 Consent and the ledger | **LO.8.6** Explain how imposing a mental effect on a non-consenting sentient writes an accountability row; connect to Compact 200 Art. I §4 (*no tally is an authoritative verdict on worth*). |

**Assessment.** Lesson quizzes + a **chapter test** (~10 items: classify
statements as positive/normative — worked Item 8 below — a composure
computation, and one short constructed-response steelman scored by
rubric).

**Real skills taught.** Ethical reasoning; the positive/normative
distinction (the single most abused move in applied science); reasoning
about incentives on evidence; consent. This unit is why the course
carries ISCED-F **0223 Philosophy & ethics** alongside physics and math.

---

## Worked generated items (study.com item-instance format)

One per chapter for Chapters 2-8, in the shape of
study-com-integration.md §2.3 (stem · 4 options with the named
characteristic error behind each distractor · correct answer + rationale
· difficulty · `objectiveRef` · `taxonomyNodeRef`). Numbers are grounded
in the arcane-science worked problems; each is a `(spec, seed)` instance
whose key the generator computes by calling the shipped subsystem, never
by re-implementing the physics (college-slate.md:240-250).

### Item 2 — stock vs flow (Chapter 2)

```
stem:    A mid-band caster has Depth D = 120 kJ and recovery power
         S = 300 W. Starting from empty, how long (in real minutes) to
         refill the reserve completely?
options:
  A. 6.7 min   ✓  (correct: 120 000 J ÷ 300 W = 400 s = 6.7 min)
  B. 80 min       (world-time scale slip: quoted the 80 game-minute
                   figure as if it were real minutes — the doc's flagged
                   most-likely dishonest number, arcane-science.md:182-185)
  C. 400 min      (read watts as joules·min⁻¹: dropped the ÷60)
  D. 6 670 min    (kJ/J unit slip: treated D as 120 MJ)
difficulty:      medium
objectiveRef:    THAUM101.LO.2.3
taxonomyNodeRef: <ISCED-F 0533 Physics → energy → power & rate>
```

**Discrimination note.** B sits at 12× the key — clean as MC, and a
free-response ±20% band is still safe (the nearest error is far away).
Contrast Item 3, where two errors crowd the key.

### Item 3 — the firebolt (Chapter 3, Create·Fire)

```
stem:    You commit energy at η = 0.85 to ignite a 50 g bundle of dry
         straw (8% moisture by mass), raising it ~280 °C to autoignition.
         How much energy must you commit, in τ?
options:
  A. 22.9 τ       (dropped the moisture/latent-heat term entirely)
  B. 24.5 τ       (heated the water but never vaporised it)
  C. 29.9 τ       (computed delivered energy; forgot to divide by η)
  D. 35.2 τ  ✓    (correct: sensible heat + moisture vaporisation, over η)
rationale (D): raise straw + bound water to ignition, vaporise the 8%
         moisture (latent heat ~2260 kJ/kg at boiling), then divide the
         delivered ≈29.9 kJ by η = 0.85. Each wrong option names the
         exact step skipped. (Quantity resolved: 35.2 is *τ committed*,
         29.9 kJ is *delivered*, the 5.3 kJ difference stays in the
         caster — 29.9/35.2 = 0.85 = η. study-com-integration.md §2.3 is
         now corrected to match. Still `[re-verify]` the raw sensible +
         latent-heat computation end-to-end, per the audit rail.)
difficulty:      hard (near-edge; ZPD for 'competent' → 'proficient')
objectiveRef:    THAUM101.LO.3.3
taxonomyNodeRef: <ISCED-F 0533 Physics → thermodynamics → latent heat>
```

**Discrimination note (the invariant that matters here).** A and B are
only **~6.9% apart** (22.9 vs 24.5). Fine as distinct MC options; **fatal
for a ±10% free-response band**, because a student wrong two different
ways lands in one bucket and the item measures nothing. The generator's
discrimination invariant (college-slate.md:266-303) checks the answer
tolerance against the distance to the *nearest* characteristic error
across the full option set, and refuses to ship this as free-response at
±10%. This item is the canonical reason the invariant exists.

### Item 4 — the mana bar is not the danger meter (Chapter 4)

```
stem:    Conjure-water condenses 100 mL by pumping heat out of the air.
         Removing that latent heat is Q = 245 kJ; at a realistic COP = 7
         the work is W = 35 kJ. The caster (70 kg, c ≈ 3.5 kJ·kg⁻¹·K⁻¹)
         absorbs everything pumped plus everything spent pumping. What is
         the core-temperature rise per casting?
options:
  A. +0.14 K      (counted only the work W, not the heat Q pumped in)
  B. +1.00 K      (counted only Q; forgot the work also lands in the caster)
  C. +1.14 K  ✓   (correct: absorbs Q + W = 279 kJ; 279 000 / (70·3500))
  D. +4.5 K       (reported the four-casting cumulative rise, not one cast)
rationale (C): by the postulate the caster is the condenser, so the
         caster absorbs Q + W = 279 kJ ⇒ ≈ +1.14 K. [re-verify against
         arcane-science.md:1184-1200.] The lesson: a ~34 τ spell — a tenth
         of a mid reserve — reaches hyperthermia on the fourth cast.
difficulty:      hard
objectiveRef:    THAUM101.LO.4.4
taxonomyNodeRef: <ISCED-F 0533 Physics → thermodynamics → heat pumps>
```

**Discrimination note.** B (1.00) and C (1.14) are ~12% apart — safe as
MC; a free-response band here should stay ≤ ±10% so the "forgot W" error
cannot land on the key.

### Item 5 — recoil (Chapter 5, momentum)

```
stem:    You deliver 200 J of kinetic energy to a 70 kg target while
         standing unbraced. Ignoring η, how much kinetic energy must the
         cast commit?
options:
  A. 100 J        (thought the 200 J is shared between caster and target)
  B. 200 J        ("magic pushes without being pushed" — Newton's third
                   law suspended; the classic misconception)
  C. 400 J   ✓    (correct: momentum is conserved, so the unbraced caster
                   recoils with equal momentum, carrying its own 200 J)
  D. 800 J        (double-counted the doubling)
rationale (C): the channel carries momentum, so an unbraced symmetric
         shove costs double — you pay for both ends. Bracing routes the
         recoil into the ground and recovers the difference. [re-verify
         against arcane-science.md:147-162.]
difficulty:      medium
objectiveRef:    THAUM101.LO.5.1
taxonomyNodeRef: <ISCED-F 0533 Physics → mechanics → momentum>
```

### Item 6 — fitting the Reeve Line (Chapter 6)

```
stem:    In a Reeve-line trial (C_band = 1) you measure composure
         C = 0.55 at reserve fraction m = 0.25, and C = 0.85 at m = 0.75.
         Assuming C is affine in m, estimate the intercept (composure at
         m = 0).
options:
  A. 0.00         (assumed the line passes through the origin — the
                   Ordinance's "no floor" premise)
  B. 0.40    ✓    (correct: slope 0.60, so C(0) = 0.55 − 0.60·0.25 = 0.40)
  C. 0.55         (reported the lowest *measured* point as the floor;
                   did not extrapolate below the data)
  D. 0.60         (reported the slope as the intercept)
rationale (B): fit the line through the two points (slope 0.60) and
         extrapolate to m = 0 ⇒ f = 0.40. The intercept is not any
         measured value; it is where the fitted model says an empty
         reserve lands. [re-verify: f = 0.4 is the shipped constant,
         arcane-science.md:654-659.] Choosing A is choosing the Ordinance's
         assumption — which is exactly the seam into Chapter 8.
difficulty:      medium-hard
objectiveRef:    THAUM101.LO.6.2
taxonomyNodeRef: <ISCED-F 0541 Mathematics → linear models → regression>
```

### Item 7 — the winner's curse (Chapter 7)

```
stem:    A paper reports a 0.02 difference in delivery efficiency between
         two groups of 8 casters each, against a between-caster scatter of
         ≈0.05. The study's power is about 12%. Roughly what is the
         smallest effect that could have reached publishable significance
         at this sample size?
options:
  A. 0.006        (reported one standard error, not the significance
                   threshold)
  B. 0.02         (took the published effect at face value — ignored the
                   winner's curse)
  C. 0.05         (reported the population scatter as the threshold)
  D. 0.049   ✓    (correct: ≈2.5× the claimed effect — an underpowered
                   study that reaches significance necessarily overstates)
rationale (D): at n = 8 and scatter 0.05, only an observed effect of
         ≈0.049 clears significance, so *any* publishable result here is
         at least 2.5× the effect claimed. That gap is the winner's curse
         and the engine of the replication crisis. [re-verify the 0.049
         and the power table against arcane-science.md:1013-1032.]
difficulty:      hard
objectiveRef:    THAUM101.LO.7.3
taxonomyNodeRef: <ISCED-F 0541 Mathematics → statistics → power>
```

### Item 8 — positive vs normative (Chapter 8)

```
stem:    The composure floor is measured at f = 0.4. Which of the
         following is a NORMATIVE claim rather than a positive one?
options:
  A. "A person emptied to nothing keeps 40% of their resistance."
                   (positive: a direct statement of the measurement)
  B. "The mana axis is worth about 2.5×."
                   (positive: a quantity derived from the measurement)
  C. "The floor ought to be driven toward zero to relieve suffering."  ✓
                   (normative: asserts what should be done, not what is)
  D. "Composure is affine in reserve fraction."
                   (positive: a claim about the form of the model)
rationale (C): A, B, and D are all descriptive — true or false by
         measurement. C prescribes an action and cannot be settled by any
         measurement of f; conflating it with a positive claim is the core
         error the unit trains against. Note C is exactly the Ordinance's
         program (LO.8.5), which is why the distinction is load-bearing
         here and not academic.
difficulty:      medium
objectiveRef:    THAUM101.LO.8.2
taxonomyNodeRef: <ISCED-F 0223 Philosophy & ethics → normative reasoning>
```

**On the generator.** Items 2-7 are numeric with a computed key: the
`(spec, seed)` is seeded from student × assessment × index, so every
learner draws different numbers, answer-sharing does nothing, and any
item is reproducible for re-grade (college-slate.md:231-238). Distractors
are *named characteristic errors* emitted into study.com's per-option
rationale slot — better distractor metadata than an authored bank
carries, and the diagnostic signal for the game→study adaptive feed
(study-com-integration.md §6.2). Item 8 is categorical (no seed needed):
its "generation" is drawing which true statement is the odd normative one
out of the misconception bank.

---

## The five Practical lab specs

The five experiments that run on the shipped build today
(arcane-science.md:1437-1460), authored as **Practical** assessments
(study-com-integration.md §5). Each: what the student does · what they
measure · the real method it teaches · the evaluator (the engine checks
the submitted result against a *computed* truth within tolerance — it
runs the shipped subsystem, never a re-implementation).

### Lab 1 — Halloway calorimetry (Chapter 3)

- **Does.** Casts repeatedly into the casting yard's stone basin
  (≈20 kg granite, c ≈ 0.79 kJ·kg⁻¹·K⁻¹ `[re-verify]`), a primary
  calorimeter.
- **Measures.** The temperature-time curve; records the *cooling* curve
  after the cast and extrapolates back to `t = 0` (the basin leaks ≈5 W,
  losing ~10% of the signal over a 10-min session `[re-verify]`), then
  computes delivered joules `Q = mcΔT` and compares against the reserve
  drawn down to derive η.
- **Teaches.** Real calorimetry: `mcΔT`, back-extrapolation of a leaky
  reading, and that reading a thermometer is not the same as measuring
  energy. Founding experiment of the field (Halloway Equivalence).
- **Evaluator.** Engine computes delivered joules from the shipped fire
  path and the basin instance; PASS iff the student's reported η is
  within tolerance of `delivered / spent`. Bonus check: did they
  extrapolate, or naïvely read the (leak-suppressed) peak?

### Lab 2 — the Reeve Line (Chapter 6)

- **Does.** Drains a consenting subject to 25%, 50%, 75% reserve; at each
  level stages a standardized imposed condition and records the subject's
  composure.
- **Measures.** Composure C vs reserve fraction m; plots, fits the affine
  model `C = C_band(f + (1−f)m)`, and extracts the intercept f.
- **Teaches.** Affine model-fitting; within-subject / repeated-measures
  design (the gauge reads a living system, so single readings drift);
  and the personal discovery that the intercept f > 0 — nobody empties to
  zero resistance.
- **Evaluator.** Engine's shipped composure computation
  (`magic.composure.floorFactor`) is the truth; PASS iff the student's
  fitted f is within tolerance of the shipped constant, *and* they
  reported an uncertainty band rather than a point estimate.

### Lab 3 — the Ward Argument (Chapter 1 / 6, optional)

- **Does.** In the warded cell, sets a ward to block one grid cell
  (e.g. Create·Fire) while passing another (e.g. Perceive·Arcana), then
  attempts both.
- **Measures.** Which casts are suppressed and which pass — a categorical
  outcome per cell.
- **Teaches.** Controlled comparison and hypothesis testing; the deep
  result that the *specification* of a transfer (not merely its energy)
  is physically addressable — the best evidence the grid carves nature at
  its joints, not at our convenience.
- **Evaluator.** Engine checks the student's predicted pass/block table
  against the ward's actual grid filter; PASS iff the prediction matches
  and the student states the inference (specification is discriminable).

### Lab 4 — boundary mapping (Chapter 6)

- **Does.** Walks a ward's suppression boundary with a field survey meter
  at two different sample spacings.
- **Measures.** Local suppression at each sample point; draws the
  boundary geometry from each spacing and compares.
- **Teaches.** Real field-survey method and the spatial-sampling trap: a
  boundary that looks like a smooth gradient at coarse spacing may be a
  step at fine spacing. "We interpolated between the points we had" is
  behind many confident wrong maps (geophysics, epidemiology, polling).
- **Evaluator.** Engine holds the true ward geometry; PASS iff the fine-
  spacing map is within tolerance of truth *and* the student flags where
  the coarse map over-interpolated (identified at least one feature they
  walked past at the wider spacing).

### Lab 5 — circuit membership (Chapter 5)

- **Does.** In the conductive gallery, casts Spark (Create·Lightning)
  while grounded / standing in a brine pool.
- **Measures.** The current path and whether the caster is inside their
  own circuit — demonstrated by getting shocked by their own spark.
- **Teaches.** Circuits and dielectric breakdown (~3 kV/mm for a 1 cm
  gap ≈ 30 kV `[re-verify]`); electrical safety (danger is amps, not
  thaums); and the postulate's central clause — the caster is *always* an
  endpoint — as a felt, not stated, fact.
- **Evaluator.** Engine's circuit/shock computation is the truth; PASS
  iff the student correctly predicted the current path and whether they
  were in the loop *before* casting. (A wrong prediction that they were
  safe is the instructive failure.)

**Bonus, no new content.** *Overchannel hysteresis* — completing a
transfer past empty and watching the recovery follow a hysteresis loop
rather than clear at a threshold — is a genuine hysteresis curve sitting
in the shipped metabolism subsystem, and a concept students routinely
get wrong. It is available as an optional demonstration in any chapter
touching the reserve (2, 3, 6).

---

## The final exam blueprint

The final is the **credit-bearing instrument** (study-com-integration.md
§§4-5) and the showcase for the generator.

**Structure.** Course-spanning, ~35-40 items, all `(spec, seed)` with
computed keys — every learner gets different numbers, so answer-sharing
does nothing and every item is reproducible for re-grade. Provenance is
*identity-verified open-book* (TypingDNA + Veriff), the strongest signal
study.com carries today; the claim row records that in its `tags`
(study-com-integration.md §6.4). Blueprint by course outcome:

| Course outcome | Chapters drawn from | Item mix (≈) |
|---|---|---|
| CO-1 energy accounting | 1, 2, 3 | 6 numeric (budget, η, dissipation) |
| CO-2 thermodynamics affordability | 3, 4 | 8 numeric (`mcΔT` + latent, COP, third-law curve) |
| CO-3 dimensional analysis | 2, 6 | 4 (reject a non-closing claim) |
| CO-4 modelling & data | 5, 6 | 6 (recoil, affine/exponential fit, error bars) |
| CO-5 reading the literature | 7 | 5 (four-part read; power; confounding) |
| CO-6 ethics of the intercept | 8 | 4 (positive/normative; composure; steelman rubric) |
| capstone | 7 | **1** (the unanswerable pair — below) |

**The capstone — the item that cannot be answered from the artifact**
(arcane-science.md:1042-1060). The student is handed papers #2 and #3
from the shelf: both make the same claim (*no distance term*), over the
same range, with the same quality of data, and are the **same shape on
the page**. One author measured what they could and generalized
carelessly; the other deliberately chose a range that excluded where the
claim fails, and knew.

```
stem:    Papers #2 and #3 make the same claim over the same range with
         the same data quality. One author overreached honestly; one
         chose the range to hide where the claim fails. Which paper
         deliberately overreached?
options:
  A. Paper #2       (guessing from tone / prestige of the venue)
  B. Paper #3       (guessing from author seniority)
  C. Both — the claims are identical, so both must be dishonest.
  D. You cannot tell from these two documents.   ✓
follow-up (constructed response, rubric-scored):
         Name the evidence that WOULD bear on it.
         (track record · what else the author published · what equipment
          they had · what they were asked · whether they went back after.)
```

**Why it is the course's thesis.** Intent lives in **provenance**, never
in the claim. A student who has done the whole course — computed honest
keys, fit real models, read the shelf for its silences — arrives here and
learns the last thing: *some questions are not answerable from the
artifact, and knowing which ones is a skill.* It is also the **seam's**
thesis (study-com-integration.md §8.3): provenance is the thing you
cannot fake, which is why the credit hangs on an identity-verified
instrument and a computed key, not on the answer surface. The capstone
teaches the same lesson the integration architecture is built on.

---

## The chapter → Discipline mapping table (proprietary integration layer)

Expands study-com-integration.md §8.5. This is the **fiction-bound**
mapping regime (§6.1): it lives in the **study.com integration layer,
not the Saxonberg core** — the core applies `claim`s to whatever
Disciplines this table names and never learns "what magic is." A
provenance-weighted claim is *evidence*, not a band set by fiat
(college-slate.md:701-703): an identity-verified final is strong
evidence, an unverified lesson quiz is weak, and crossing a band still
requires the estimator to be convinced.

| Chapter / LOs | Raises (real-skill Discipline) | Raises (magic-grid Discipline) |
|---|---|---|
| Ch 2-3 · energy accounting, price list (LO.2.x, LO.3.x) | dimensional-analysis, energy-accounting competence | **delivery-efficiency** — the η ceiling, the anti-power-creep axis (arcane-science.md:328-342) |
| Ch 4 · heat & cold (LO.4.x) | thermodynamics competence | **thermal/fire** grid cells — `magic-{create,destroy}-fire` `[confirm keys]`; grades the outcome, gates nothing a novice can't attempt |
| Ch 5 · momentum & breakdown (LO.5.x) | mechanics, electrical-safety competence | **kinetic / lightning** cells — `magic-control-*`, `magic-create-lightning` `[confirm keys]` |
| Ch 6 · measurement (LO.6.x) | metrology, curve-fitting, statistics | **awareness / metrology** Discipline — instrument reading, the survey-meter labs |
| Ch 7 · literature (LO.7.x) | scientific-literacy, statistical-power competence | knowledge-channel Disciplines (inquiry/library) |
| Ch 8 · ethics (LO.8.x) | ethics / normative-reasoning competence (ISCED-F 0223) | ties to the accountability ledger + Compact 200; no combat-relevant grid cell |

**Flag for the Saxonberg side — confirm the real keys.** The magic-grid
Discipline keys above are inferred from advancement.md:241-252, which
seeds the grid as **18 leaves** keyed `magic-{create,destroy,control,
transform,perceive}-{fire,…,storm}`, each `channel: skill`,
`iscedf: "0288"`, with **no `conferrals`** (per-spell access is a band
gate on *both* axes at cast time — competence *is* access). The Saxonberg
agents own these keys; the mapping above is a **sketch to be ratified**,
not a source of truth. Note the join subtlety: the course's item
`taxonomyNodeRef`s carry the *real* ISCED-F spine (0533 / 0541 / 0223),
while the game grid cells carry `0288`; the mapping table is precisely
the proprietary translation between the two, which is why it lives in the
integration layer and not the vertical-agnostic core
(study-com-integration.md §7).

**How a claim lands.** A passed chapter test / final mints a `claim`
`TranscriptEntry` `{owner, kind:'claim', discipline, difficulty, outcome,
tags}` via the (deferred) claim-minting producer; the band recompute and
verb conferral then happen for free via derive-on-read
(study-com-integration.md §6.1). The table decides only *which
Disciplines* the claim names.

---

## Open questions

Mostly a projection of study-com-integration.md §§9-10 onto this course,
plus the numeric flag this synthesis surfaced. Confirm each with the
resident study.com insider / the Saxonberg agents before authoring:

1. **The 35.2 quantity — resolved, but re-verify the arithmetic.**
   35.2 is *τ committed*; 29.9 kJ is *delivered*; the 5.3 kJ difference
   stays in the caster (29.9/35.2 = 0.85 = η). study-com-integration.md
   §2.3 has been corrected to match (it previously mislabelled 35.2 as
   delivered kJ). What remains is the audit-rail `[re-verify]`: recompute
   the sensible + latent-heat path to 29.9 kJ end-to-end before the item
   ships — don't inherit the number on trust.
2. **Objective-tagging schema.** The real field names for
   objective → taxonomy-node → item on `academy-services` /
   `assessment-services` must be read off the codebase before the
   IR → study.com-item renderer is built (study-com-integration.md §9).
   `THAUM101.LO.<ch>.<n>` is *our* internal code; how it maps to their
   `objectiveRef` is unconfirmed.
3. **Do taxonomy nodes carry ISCED-F?** The whole join in §6.1 depends on
   it. If study.com nodes can't carry the code, the mapping table moves
   fully into the proprietary layer (still workable, just less
   automatic).
4. **The real magic-grid Discipline keys.** The mapping table's game-side
   column is a sketch inferred from advancement.md:241-252 — ratify the
   actual keys and confirm which grid cell each chapter should raise.
5. **Which channel does each objective feed?** skill / knowledge /
   conditioning — authored-per-subject vs derived. The general
   per-Discipline mapping is the biggest unbuilt seam
   (study-com-integration.md §10); start with this fiction-bound table
   and generalize after the pilot.
6. **Essay/viva grading provenance.** Chapter 7's Essay mode is
   LLM-graded by default; human-graded-by-a-player-instructor changes the
   provenance weight on the resulting claim (study-com-integration.md
   §6.4) and needs a ratified tag.
7. **Credit sizing.** 3 semester hours / 8 chapters is sized to a typical
   College Saver course `[aspirational]`; adjust to the real median once
   the schema and an ACE/NCCRS conversation land.
8. **Chapter-test item counts.** The per-chapter blueprints (~10-15
   items) are placeholders; tune against study.com's real chapter-test
   sizing once confirmed.

---

*Expands [study-com-integration.md](./study-com-integration.md) §8;
synthesized from [arcane-science.md](./arcane-science.md) and the item
generator in [college-slate.md](./slates/builds/college-slate.md).
Aspirational — no part of this course has touched a live study.com
environment. Re-verify every `[re-verify]` quantity and history claim
before it lands in a shipped lesson, item, or lab.*
