# Slate-compaction pass — batch `body`

Slates: `tails/vitals-slate.md` · `builds/mortality-slate.md` ·
`builds/mortal-vessel-slate.md` · `builds/health-vertical-slate.md`.
Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `mortality.md` only
(`vitals.md` / `harm.md` / `metabolism.md` / `respiration.md` /
`thermal.md` / `race.md` / `encumbrance.md` belong to sibling agents this
wave — everything for them is under *Handoff*).

Verified against code on this branch — **not** against `build/nutrition-
fitness` (MR!269, in flight), whose exertion producer / scurvy row /
`Vitals.ts`/`LocomotionLogic.ts` edits are not here. Sections that build
is building are KEPT and listed under *Uncertain* where relevant.

A previous agent on this batch died after research and before any cut;
its findings are folded in below (re-verified) — see
`/tmp/.../scratchpad/wave8-partial/body.findings.md` for the original.

## Findings for the coordinator

- **No recovery slate exists on this branch.** The 2026-09-18 draft the
  assignment mentions is not checked in here; health-vertical was
  compacted against `medic-judgment-slate.md` (exists, owns the diagnosis
  surface) and the code.
- **`mortality.md` carried three statements the code proves false**, all
  fixed by minimal edits, logged under the mortality-slate entry below:
  (1) § Deferred *"the recuperation model … undesigned"* — the
  consequence build shipped it (competence-band suppression via
  `expressionSuppression()`), and the doc's own top section already says
  so; (2) § Deferred *"forensic examination verbs — nothing consumes it
  yet"* — the `trade-medicine` pack's `analyze postmortem`
  (`AnalyzePostmortemController`) is that consumer, verified by reading
  the controller; a new **graduated** section (`## Forensic examination —
  analyze postmortem`) was inserted to carry it, since no subsystem doc
  described it before; (3) the "no Condition Idea is live at any path"
  passage — stale since `ConditionCatalogue`, same HISTORICAL fact
  vitals.md already flags; fixed with a matching ⚠ HISTORICAL note.
- **The `trade-medicine` pack's condition-catalogue gap is still real,
  verified independently.** `ConditionCatalogue.warm()`
  (`platform/idea/ConditionCatalogue.ts:87-95`) walks
  `Template.findDescendants(TemplatePathPrefixes.condition)` where
  `condition = "/platform/idea/Condition/"` (`lib/paths.ts:145`) and
  filters `tpl.class !== CONDITION_CLASS` (exact match, not `extends`) —
  the same shape `MaterialCatalogue` was fixed away from, still unfixed
  here. A pack cannot ship its own `Condition` row today. Kept in
  health-vertical-slate's Left and Hand-off section (unchanged); noted as
  Handoff to `vitals.md` / `content-packs.md` below since it's substrate,
  not health-vertical content.
- **Two slates carry the same open thing** (cluster candidates, not
  merged this pass): the re-embodiment service / patron mint —
  `mortality-slate § The re-embodiment service` and `mortal-vessel-slate
  § Thesis 6` (now cut, pointing back here); the passage ladder /route
  catalogue — both slates; the in-circle death arc — both slates and
  `mortality.md § Deferred`.
- **`mortal-vessel-slate`'s own "Theses 6–8 shipped" claim was not fully
  true.** Thesis 6 and Thesis 8's PC half are shipped and documented.
  Thesis 7 ("recovery reward scales with the richness of the passage") is
  **not** verifiably built — mortality.md ships only the bare `passage`
  floor and content-extensible `reembody`; nothing measures or rewards
  "richness." Kept verbatim, flagged Uncertain below. Thesis 8's NPC half
  (narrative-level convergent cycling / hard reset) is likewise unverified
  as a formal mechanism beyond the generic residency reset sweep; kept.
- **health-vertical-slate's "What's missing" (verified 2026-07-31) was
  mostly stale**: `treat` is no longer bandage-only (`resolution.by`
  dispatch — dressing/fluid/bare-hands-medicine/rest), stabilization
  shipped, 24 condition rows ship (not 11), `assess` moved to
  `content/platform/…`. Cut with pointers; the two still-true gaps (no
  medicine `Material`/antidote item; `ConditionApi.inflict` is
  trauma-only for afflictions) are kept.
- **Headings cited that no longer exist**: `mortality.md`'s own header
  block links *"vitals.md § Layer 6"* — vitals-slate's Layer 6 section is
  cut by this pass (folded into a pointer) but the heading `## Layer 6 —
  Death & lifecycle` still exists in the compacted file, so the link
  still resolves; not a dead link. No other dangling headings found.

## `tails/vitals-slate.md` — 1088 → 535 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Older narrative status block (`> **Status (2026-06):**…`) — history,
  duplicate of the canonical block above it.
- `## Principle` — vitals.md § The load-bearing decision + § `VitalsMixin` surface.
- `## Layered design` table — folded into per-layer pointers.
- `## Layer 1 — VitalsMixin` — vitals.md § `VitalsMixin` surface.
- `## Layer 2 — Vital signs` — vitals.md § Vital signs + `vitalProfile`.
- `## Layer 3 — Anatomy` — vitals.md § Anatomy + tissue; harm.md § The
  depth ladder / § The function axis / § The sever.
- `## Layer 4 — Conditions` — vitals.md § Conditions — the three-kind
  type system (grew a Kind C, `SustainedShock`, beyond the two-kind lean).
- `## Layer 6 — Death & lifecycle` — mortality.md, in full.
- `### The derived summary` (Layer 7) — vitals.md § `VitalsMixin` surface.
- `### Treatment — the resolution seam` (Layer 7) — harm.md §
  `resolution.by` / § The medic vertical (resolves Open Q1, fork #3).
- Layer 8 `**Endurance/fatigue.**` paragraph — vitals.md § Reserves;
  harm.md § The couplings.
- Producers/seams `**The harmful direction — inflict.**` — harm.md § The
  `inflict` producer.
- Worked Scenario B (bleeding out) — harm.md § laceration / § The medic
  vertical.
- Worked Scenario E (unconsciousness) — vitals.md `getConsciousness()`.
- "What this stresses" § Race subsystem, § Quantities substrate,
  § Lifecycle/persistence — vitals.md / race.md / lifecycle.md /
  mortality.md.
- Open questions 1, 2, 3, 4, 5, 7, 8, 10, 13, 16 — each cut to one line
  "resolved — see …" (fork #3 loop, three-kind system, first-class
  fields, `bpm`, two `mmHg` fields, binary consciousness, universe-default
  baselines, `%` reserve, anatomy depth ceiling, the `VitalEffect` shared
  vocabulary).
- Build order Waves 1–3 — vitals.md/harm.md/mortality.md (Wave 3's
  unshipped instrument roster explicitly carried forward into the kept
  Layer 7 § Instruments instead of being lost).
- Two "Adjacent / future waves" bullets — resurrection/postmortem
  progressions (mortality.md § The corpse, richer than the lean); the
  `inflict` damage-intake seam (shipped).
- `## Once shaped into formal requirements` — historical; requirements
  were written and the waves shipped.

### Superseded — cut
- `## Layer 5 — Progression` — designed on `ScheduledEmission`; shipped
  as reconcile-on-read instead (harm.md § The wound driver).
- "What this stresses" § Activity substrate — same mechanism swap.
- Open question 11 (`inflict` seam adopt/skip) — adopted, but
  affliction-inflict (not trauma-inflict, which is what this question
  meant) remains open; noted at the Layer 4 pointer instead.
- Open question 14 (postmortem fidelity) — shipped **richer** than the
  "two cheap seams" lean (full decay-stage + readability curve).
- Build-order bullet "innervation/vascular graph" — shipped; split out of
  the still-open "deeper anatomy fidelity + promotion" bullet (a
  code-proves-false partial fix to a kept bullet, logged here).

### Kept (UNBUILT)
- `### Instruments + targeted measure/assess` (Layer 7) — only the
  Thermometer + `assess` exist; Sphygmomanometer/PulseOximeter/
  Stethoscope and the perception-targeted `measure on <patient>`
  generalization do not (verified: no such classes in the tree; `measure
  temperature` reads the actor's own location, not a target).
- Layer 8 `**Nutrition — satiation (+ hydration).**` (3 numbered roles) —
  roles 1–2 ship, role 3 ("recovery enabler" — nourishment gating healing
  rate) has no code; kept whole per paragraph-granularity.
- `### Consumables — eat, drink, and the effect-list` — no
  `NutritionFacts`/`kcal`/`Edible`/`DietApi` anywhere in the tree.
- Producers/seams `**The restorative direction — the mirror**` + `**Both
  parked deliberately.**` — no generalized heal/resolve producer surface
  exists; magic-healing is still deferred.
- Worked Scenarios A, C, D — each depends on an unbuilt piece (pulse
  oximeter; authored influenza/sepsis content; locomotion-exertion
  wiring).
- "What this stresses" § Biome/instrument pattern, § Locomotion — the
  targeted-measurement generalization and exertion→endurance wiring are
  both still unbuilt (confirmed: `measure.yaml` has no patient-targeting
  arg).
- Open questions 6 (pain modelling — no `pain` concept anywhere in
  `Vitals.ts`), 9 (contagion — disease-slate's), 12 (aging bands), 15
  (magic-healing pedagogy), 17 (consumption mechanics/portions — the
  food-payload-flip half now ships via spoilage.md, portions do not; kept
  whole).
- Remaining "Adjacent / future waves" bullets — full treatment verb
  suite, contagion, consumables, endurance↔locomotion + `J` model,
  deeper anatomy fidelity + part-promotion, age-curve/GCS.
- `## What this slate does NOT cover` — scope fence, unchanged, still
  accurate.

### Handoff (belongs in a doc outside my list)
- → `vitals.md` / `harm.md`: no changes needed — both already document
  everything this pass found shipped from vitals-slate more thoroughly
  than the slate itself did. Nothing new to graduate.

### Status block
- Left: was "the affliction driver … · medical instruments +
  consumable-crafting past the bandage · forensic examination verbs …" →
  now the itemized list above (instruments, consumables/nutrition +
  exertion wiring, the restorative-producer mirror, the affliction-inflict
  gap, the still-open Build-order bullets and open questions). The
  forensic-examination item is gone — `analyze postmortem` shipped (see
  the mortality.md fix above).
- Size: a wave → a wave (unchanged).

## `builds/mortality-slate.md` — 534 → 154 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## The gap (verified 2026-07-31)` — mortality.md § One transition
  (the seven sites collapsed to one call; the bricking bug fixed).
- `## The keystone` — mortality.md § Death is the sandbox crossing,
  backwards.
- `## The three objects at death` + `### The doctrinal split` —
  mortality.md § The corpse, § The shade, § The doctrinal split.
- `## What survives a new body, and what is lost on purpose` —
  mortality.md § What survives a new body.
- `## Dying as a state with a clock` — mortality.md § The dying clock.
- `## Stabilization — the minimal medic seam` — mortality.md §
  Stabilization.
- `## Death when nobody comes` — mortality.md § One transition.
- `## Recovery — shade → passage → new body` — mortality.md § The shade,
  § Coming back, § The floor, § Deferred ("The underworld") — including
  the cut `perceptualPlane` reasoning and "there is no wake point,"
  reused near-verbatim in the subsystem doc.
- `## Three hazards this design creates` (+ the two named sub-defects) —
  each closed and documented: § The two ways to persist death, § Inside a
  circle, § The dying clock runs while you are disconnected, § Circle-
  marked rows convict nobody, § Reading lifecycle state.
- `## Scope` — the IN list shipped in full; the OUT fences still hold
  and are carried by this slate's own cross-references + mortality.md's
  Deferred section.
- `## Rough waves (as built — see the subsystem doc)` — already said so;
  removed outright, no pointer needed.
- `## Resolved — see the requirements doc` — meta-commentary that the
  reasoning graduated; removed outright.
- `### The recuperation model` (design-open framing) — **resolved**:
  competence-band suppression shipped as the answer; see the mortality.md
  fix above. One-line pointer kept.
- "Still open" bullet **Corpse remains** — moved 2026-09-10 to
  `end-of-life-slate.md` per this slate's own header; redundant with the
  "Moved out" line, cut.
- "Still open" bullet **Where "wake at your residence" plugs in** —
  resolved the other way: mortality.md § The floor decided there is no
  wake point at all.

### Kept (UNBUILT)
- `### The re-embodiment service — decided as lore, unbuilt` — full
  temple/clinic/coverage design, verbatim. No code implements a vendor,
  pricing, or coverage; `reembody`'s content-facing seam is the only
  thing that shipped.
- "Still open" bullets **The in-circle death arc** and **The route
  catalogue** (passage ladder content).

### Status block
- Left: was 4 items (re-embodiment service · what diminishment IS · the
  in-circle death arc · wake-at-residence · passage ladder) → now 3 (the
  re-embodiment service, folded with "a service's own diminishment
  lever" · the in-circle death arc · the passage ladder / route
  catalogue). Diminishment-IS and wake-at-residence both resolved and
  dropped.
- Size: a build → a wave (what remains is content + two content-facing
  mechanism forks, not a fresh engine build; `reembody` already does the
  engine's whole part).

## `builds/mortal-vessel-slate.md` — 267 → 195 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Thesis 1 — The three-layer self` — mortality.md § The shade;
  connection.md/state-model.md for the `Login`↔`Interactive`↔`Avatar`
  handoff it names.
- `## Thesis 2 — Function over form` — mortality.md § Function over
  form, made mechanical (`requiresEmbodied`).
- `## Thesis 6 — The death arc` — mortality.md § The shade, § Coming
  back. (Its "coroner economy" clock mention pointed to
  end-of-life-slate.md, which already owns that.)
- Thesis 8's **PC** bullet — mortality.md, in full.

### Kept (UNBUILT)
- `## Thesis 3` (governance integrity *and* law enforcement) — the
  law-enforcement half is explicitly the slate's own Left item; kept
  whole per paragraph-granularity (mixed with the shipped-adjacent
  integrity-floor framing, which has no separate section to cut).
- `## Thesis 4` (moderation as diegetic capability-state) — Left item,
  no code (no capability-revocation moderation verb/mixin found).
- `## Thesis 5` (prison↔Hades unification) — Left item, unbuilt.
- Thesis 8's **NPC** bullet — convergent/hard-reset narrative cycling is
  not verified as a formal mechanism beyond the generic residency reset
  sweep.
- `## Deferred / boundaries` — still-accurate boundary list; the coroner-
  economy line got a one-line note that it moved to end-of-life-slate.md
  (2026-09-10), matching the note already added to mortality-slate.md.
- `## Cross-references` — unchanged.

### Uncertain — kept
- `## Thesis 7` (passage opt-in at thresholds; recovery scales with
  richness) — the slate's own status block claims "Theses 6–8 shipped,"
  but I could not verify a richness-reward mechanism anywhere: mortality.md
  ships only the bare `passage` floor and a content-extensible `reembody`
  with no measurement of "richness." Looked for it in mortality.md's §
  Coming back / § The floor and found only the floor + "content is free to
  be better than it," never a reward computation. Kept verbatim; flagged
  here rather than trusting the slate's own "shipped" claim.

### Status block
- Left / Size: unchanged (Thesis 4, 5, and Thesis 3's law-enforcement
  half were already the stated Left; still accurate after this pass).

## `builds/health-vertical-slate.md` — 359 → 320 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## What already exists` table + most of `## What's missing (verified
  2026-07-31)` — folded into one short "shipped further than claimed"
  paragraph: `treat` dispatches by `resolution.by` (no longer bandage-
  only), stabilization shipped, 24 condition rows ship (not 11), `assess`
  moved under `content/platform/…`. Pointers to harm.md §
  `resolution.by` / § The medic vertical and mortality.md § Stabilization.
- Open question "Does `resolution.by` become the cure dispatcher" —
  resolved (it did, and it was the harm-driver's own build, not this
  vertical's).
- Open question "✅ ANSWERED, and moved out" (the diagnosis surface) —
  already fully resolved text in the slate itself (medic-judgment-slate);
  removed as redundant with the status block's own note.

### Kept (UNBUILT)
- `## The differentiator`, `## The clinical-reasoning trainer we built by
  accident`, `## The chain of infection is already our schema`, `## The
  loop, and why it travels past nursing` (+ `### The veterinary track is
  free`), `## Prevention is the unexplored half`, `## The institutions`
  (+ subsections), `## Authoring an outbreak`, `## Where the education
  thesis lands best`, `## Four traps` — all still-open design/doctrine;
  no public-health department, College of Physic, outbreak content,
  apothecary, or veterinary-track content found in the tree.
- Remaining "still true" gaps: no medicine `Material`/antidote item; the
  affliction-inflict gap.
- Remaining open questions (epidemiology surfacing, human/animal
  asymmetry, public-health-office timing, aid-post placement).
- `## ⭐ Hand-off from the consequence build` — re-verified independently
  (see Findings above): still true today.

### Doctrine — kept, labelled
- `## The differentiator` (the "healing as practice, not resource"
  thesis) and `## The clinical-reasoning trainer we built by accident`
  are argument/thesis sections, not backlog items — kept per the pilot's
  doctrine rule. `## The clinical-reasoning trainer`'s "eleven authored
  conditions" count is stale (24 ship now) but not false at time of
  writing; left as-is rather than edited, since the underlying argument
  (differential diagnosis emerges from overlapping signs) is unaffected
  and stronger with more rows.
- `## Where the education thesis lands best` — product/business thesis
  about the external-mastery credential seam; kept, doctrine.

### Status block
- Left: dropped "a `resolution.by` dispatcher" (shipped); added the
  still-true `ConditionCatalogue` pack-condition gap explicitly, and
  narrowed the apothecary item to name what's actually missing (antidote
  item, medicine `Material`).
- Size: a build → a build (unchanged — institutions, outbreak content,
  apothecary and the veterinary track remain a real build).

## Graduated into `mortality.md` (my write list)

- **Fixed, code-proves-false**: § Deferred *"the recuperation model …
  undesigned"* → now points to the shipped § The recuperation model at
  the top of the doc, with the one still-real gap (a *better*
  diminishment for a paying service) kept.
- **Fixed, code-proves-false**: § Deferred *"forensic examination verbs —
  nothing consumes it yet"* → replaced with a pointer to the new §
  Forensic examination section.
- **Fixed, code-proves-false**: the "no Condition Idea is live at any
  path today" passage in § Coming back → HISTORICAL note matching
  vitals.md's existing pattern for the same closed bug.
- **New graduated section**: `## ⭐⭐ Forensic examination — analyze
  postmortem` — the `trade-medicine` pack's `AnalyzePostmortemController`
  (cause inferred from wounds not read off the stamp, `1 − readability`
  difficulty, competence-gated detail, a graded `forensics` deed). No
  subsystem doc described this verb before this pass. `analyze patient`
  (same pack, live diagnosis) is named but left to harm.md/Handoff — not
  inserted here, since it's the medic vertical's, not mortality's.

## Handoff (belongs in a doc outside my write list)

- → `harm.md` § The medic vertical: `analyze patient`
  (`trade-medicine/src/idea/cmd/perception/AnalyzePatientController.ts`)
  — the live diagnostic ladder (candidates plural, unranked), shipped in
  the same consequence build (MR!254) as `analyze postmortem`. No
  subsystem doc names it; only `end-of-life-slate.md`'s status block
  mentions it.
- → `content-packs.md`: the `trade-medicine` pack itself (two controllers,
  a `forensics` Discipline row specializing `medicine`) is undocumented
  in the shipped-packs roster.
- → `vitals.md` § Conditions (or `content-packs.md`): the still-open
  `ConditionCatalogue.warm()` gap — it selects by template-path prefix
  (`/platform/idea/Condition/`) and exact class match, not by `extends
  Condition` the way `MaterialCatalogue` was fixed to do, so a pack
  cannot ship its own condition row. Verified independently at
  `platform/idea/ConditionCatalogue.ts:87-95` and `lib/paths.ts:145`.
  Kept live in `health-vertical-slate.md`'s Left/Hand-off section since
  it blocks the apothecary/medicine-vertical work; a doc fix belongs to
  whichever sibling owns vitals.md or content-packs.md this wave.

---

## Coordinator (2026-09-20) — handoffs applied

- `harm.md § The medic vertical` — `analyze patient` paragraph inserted
  after the `assess` bullet (pack.yaml's own line: competence buys what
  you can SEE, never what you can DO).
- `content-packs.md` — a `trade-medicine` row added to the packs table
  after `trade-cooking`.
- `vitals.md § Conditions` — the `ConditionCatalogue.warm()` prefix +
  exact-class selection gap appended to the HISTORICAL banner (verified
  at `platform/idea/ConditionCatalogue.ts:86-95`).
