# Slate-compaction pass — physiology ledger

Batch key `physiology`. One slate: `docs/slates/builds/physiology-slate.md`
(2,201 lines at start). Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `vitals.md` · `harm.md`.
Verified against `packages/server/src/mud/**` and `packages/content/**` on
this branch — the nutrition & fitness build (MR !269,
`build/nutrition-fitness`) is NOT on this branch and nothing it claims is
treated as shipped here.

A previous agent on this batch died after verification and before any cut;
its findings (saved at the wave8-partial scratchpad) are folded in below —
re-verified, not re-typed on faith.

## Findings (for the coordinator)

- **Duplicate headings, unrenumbered by design.** Two `## Part 7g` (the
  care/NPC cost model at the original l.1301 and *Frostbite from WEATHER*
  at l.2065) and two `## Part 7h` (tolerance at l.1390 and *Dismemberment
  as GAMEPLAY* at l.2115). `harm.md § What this is NOT` points at
  *"physiology-slate § Part 7h"* meaning the dismemberment one. Not
  renumbered here either (no rewrites) — both survive this pass since both
  are still open design.
- **Stale premise, left standing:** § Part 8c says `docs/arcane-science.md`
  was *"untracked at time of reading"* and § Part 7d says it is *"not in
  the repo at time of writing, so unchecked."* It is tracked (2,000+
  lines). Both paragraphs are kept verbatim — the surrounding design is
  live and the clause is a dated aside, not the substance.
- **Two docs disagree about away-recovery, neither mine.**
  `furnishing.md § Sleep as logout` says a body logged out on a bed
  integrates the elapsed hours at that bed's multiplier;
  `Metabolic.reconcileMetabolism` drops any gap over
  `MAX_REASONABLE_GAP_SEC` (4h) for a body nobody owns, and
  `metabolism.md` says outright *"no sleeping player body and no
  away-recovery."* **This pass adds a third data point**: `harm.md`'s
  wound driver states it copies the *same* presence-freeze discipline
  (linkdead re-stamp + far-past guard) as metabolism/thermal — i.e.
  wound healing ALSO freezes while away. That is the **exact opposite**
  of what physiology-slate § Part 4b argues for (*"the freeze is right
  for decay and wrong for repair… you log off with a splint and come back
  mended"*) and of what furnishing.md claims about beds. Three docs, three
  different answers, none of them mine to fix. Kept as Uncertain — not
  cut — because it is a live design disagreement, not settled fact.
- **`assess` shipped the OPPOSITE of what Part 8d designed.** The slate's
  § Part 8d argues *"you are the worst-placed observer of your own
  body"* — self-assess should read WORSE than a competent other's.
  `AssessController.ts`'s own header states **"Full fidelity on one's own
  body (self); banded + competence-gated on others"** and forces
  `medBand = 'expert'` for a self-assess when judging through a dressing
  (line ~101, ~217). This is SUPERSEDED — cut with a note, not silently
  dropped, because the design argument itself (the epistemic-vocation
  angle, the physician's customer) may still be worth someone reopening
  against the shipped call.
- **The tissue-mass finding grew.** § Part 3 finding 1 recorded 92.9 kg
  against `baseMass: 70`; verified against the current
  `species-and-names/…/BodyPlan/biped.yaml` the authored tissue sum is
  now **96.8 kg** (four more organs added since: brain 1.3, spine upper
  0.6 + lower 0.5, liver 1.5). Still unaddressed anywhere; kept, number
  updated.
- **Stale comment in content**: `biped.yaml`'s slot block still says
  `covers` has *"no consumer yet"* even though the same file's body-part
  block and `harm.md`/`vitals.md` both describe four live readers
  (`getSlotsCovering`, the covering fold, materials-response armor).
  Outside my write list (a content file, not a subsystem doc) — noted,
  not touched.
- **Headings cited that no longer exist as open sections after this
  pass:** § Part 4b's *"third divergence in `reconcileConditions`"* cites
  the dying-clock carve (that content is in mortality.md, untouched here);
  § Part 7h (tolerance)'s reference to *"§ Part 3"* for the liver roster
  now resolves to a cut pointer; § Part 8b cites *"§ Part 7"* for the five
  verbs (that section is kept, so the citation still resolves). Nothing
  restored on the strength of a dangling citation.
- **Wave 4 ("the function axis") is done, not just waves 1–3.** The
  `Proposed waves` list's own numbering undercounts what shipped —
  waves 1–4 are all SHIPPED·DOCUMENTED (condition catalogue, capacity
  vocabulary + `governs` rename, the roster, the function axis itself).
  Cut those four list items; kept 5–18 verbatim (unrenumbered — a gap
  starting at 5 is honest, not a defect).

---

## `docs/slates/builds/physiology-slate.md` — 2,201 → 1,935 lines · Status PARTIAL → PARTIAL

Worked bottom-up in one pass given the size of the verification (not
literally bottom-up in file order, but section-by-section against code);
ledger written once, at completion, per the actual pace of verification
(no cuts landed before verification was far enough along to be safe —
next time I'd checkpoint after Part 1–4b to match the "as cuts land" rule
more literally).

### Cut (SHIPPED · DOCUMENTED)

- `## Part 1 — The inventory` (39 lines) — code: `biped.yaml`,
  `Vitals.ts`; doc: `vitals.md` § *The load-bearing decision* + § *Anatomy
  + tissue*. Heading kept with a pointer (Part 7b references "Part 1").
- `## Part 2 — The missing primitive: a function axis` (73 lines) — code:
  `VitalsMixin.functionAt`/`capacity` (`lib/vitals/Vitals.ts`,
  `BodyCapacity.ts`); doc: `harm.md` § *The function axis — a wound costs
  a CAPACITY*, `vitals.md` § *Anatomy + tissue*.
- `### ⚠ Correcting this slate's own first framing` through
  `### The roster` table, inside Part 3 (105 lines) — code:
  `species-and-names/…/BodyPlan/biped.yaml` (brain/spine/liver rows,
  `governs`/`innervatedBy` fields); doc: `vitals.md` § *Anatomy + tissue*.
  Findings 3–4 of the read-through (missing-cascade, `covers` consumer)
  cut with the same pointer — code: `Vitals.severPart`,
  `getSlotsCovering`; doc: `harm.md` § *The sever*, `vitals.md` § *Anatomy
  + tissue*.
- `### ⭐⭐⭐⭐ Armor converts STRUCTURAL injury into FUNCTIONAL injury` +
  `### The five trauma types differ in SHAPE, not magnitude` (43 lines,
  inside Part 4b) — code: `ConditionApi.inflict`'s covering-stack fold,
  `TRAUMA_BEHAVIOR`; doc: `harm.md` § *The function axis*, § *The nine
  trauma behaviors*, `materials-response.md`.
- `## Part 6 — The blocker: the Condition catalogue is not live`
  (12 lines) — code: `ConditionCatalogue`; doc: `vitals.md` § *Conditions*
  (keeps the historical banner describing the closed failure mode).
- `### ⚠ Correcting Part 1: the pharmacokinetics are already built` +
  `### ⭐⭐⭐⭐⭐ One substance system — the band decides help or harm`
  (36 lines, inside Part 7b) — code: `ToxinBehavior`/`toxinBurdens`
  (`lib/metabolism/Metabolic.ts`); doc: `metabolism.md` (documents
  `ToxinBehavior`, Widmark, the toxin-burden mechanism).
- `### ⭐⭐⭐ What the patient knows: you are the worst-placed observer of
  your own body` (inside Part 8d) — **SUPERSEDED, see below**, filed here
  too since it left a pointer rather than a bare cut.
- `### ⭐⭐⭐ One competence rule covers both shipped verbs` (inside Part
  8e) — code/doc: `harm.md` § *The medic vertical* (outcome quality =
  dressing × competence for `treat`; banded/competence-sharpened
  `assess`).
- `### ⭐ The information vocation already ships` (inside Part 9) —
  code/doc: `harm.md` § *The medic vertical* (`assess`).
- Proposed-waves list items 1–4 (condition catalogue, capacity vocabulary
  + `governs` rename, the roster, the function axis) — all four
  SHIPPED·DOCUMENTED per the entries above. Left unrenumbered (5–18
  intact) rather than rewritten.
- The Hand-off section's "The severed limb" bullet — code: `harm.md` §
  *The sever*; doc: same, plus this slate's own Part 7h already tracks
  what's left.
- The older narrative status line ("direction set, nothing built,
  FAST-TRACK") — the one-status-block rule; superseded by the canonical
  block.

### Superseded — cut

- `### ⭐⭐⭐ What the patient knows: you are the worst-placed observer of
  your own body` (Part 8d, 19 lines) — by `AssessController.ts`'s shipped
  behavior (full fidelity on self, `medBand` forced to `expert` for
  self-assess), the opposite of what this subsection designed. Cut with a
  note (not a bare pointer) since the design argument may be worth
  reopening deliberately. See Findings above.

### Kept (UNBUILT)

- `## Part 4 — Pain is a READER, not an organ` — no pain reader anywhere
  in `lib/vitals`.
- `## Part 4b` remainder — the arithmetic table, the linkdead-freeze-
  backwards argument (contradicted by what shipped, see Findings), the
  bed-as-product design, the function-fast/structure-slow two-clock
  proposal (not how it shipped — single severity clock instead, noted at
  the cut site), the cross-build death-cures-injury exploit.
- `## Part 5 — alarms, not a heartbeat`, whole — confirmed no
  `ScheduleApi.schedule`/`recurring` anywhere in the condition/vitals
  path; `reconcileConditions` is pure reconcile-on-read with no booked
  next-interesting-time. Even simpler than the slate's own "safe form,"
  and the "notify" gap it names is still real.
- `## Part 7 — Heals & buffs`, whole — the five-verb taxonomy
  (arrest/accelerate/mask/restore/prevent) is only half-real: arrest and
  accelerate ship (dressing, rest-heals), mask/restore/prevent do not
  (no pain, no `numb`/`wake`/antitoxin content).
- `## Part 7b` remainder (Routes table, object model, dose-as-verb, the
  liver multiplier) — confirmed no `effectiveClearance`/liver-function
  multiplier anywhere; topical/inhale routes unbuilt.
- `## Part 7c — Infection, permanence, and the recovery ratchet`, whole —
  no wound/environmental infection producer (distinct from the shipped
  pathogen/food-borne infection in `spoilage.md`); no scar-as-belief-
  feature, no prosthetic.
- `## Part 7d — Sleep, beds, and being logged in`, whole — no sleep
  mixin/consciousness-filtering state anywhere.
- `## Part 7e` remainder — already mostly pointed at `blood-slate`; no
  blood-volume regeneration in code, kept as-is.
- `## Part 7f — The care economy`, whole — no clinic pricing, triage
  policy, or controlled-substance content found.
- `## Part 7g — Who gets a body` (first instance), whole — design/cost-
  model reasoning, nothing to verify against code (alarms don't exist yet
  so "alarm cost bounded by drama" is unbuilt too); self-flagged
  "unverified" against husbandry already.
- `## Part 7h — Tolerance, withdrawal, and interactions` (first
  instance), whole — no tolerance/withdrawal code anywhere.
- `## Part 8`, `Part 8b`, `Part 8c` (medicine vs magic, the control·body
  roster, the arcane-science revision), whole — confirmed no
  `staunch`/`purge`/`mend`/`numb`/`wake`/`diagnose` spell content exists;
  the general verb·noun grid they lean on (`control·body` etc.) IS
  shipped (`magic.md`, `SpellCatalogue`), noted at read time but not a
  reason to cut since the medical application is what's designed here.
- `## Part 8d` remainder (One extended verb, the site argument, `draw`) —
  `treat <target> with <item>` is shipped, but part-site targeting and
  the `draw <substance> from <target>` verb are not (only an unrelated
  banking `draw` exists).
- `## Part 8e` remainder (Discipline roster, the vet question,
  malpractice, reputation, licensure) — no `surgery` Discipline (only
  `medicine` shipped), no malpractice/liability code, no licensure
  content.
- `## Part 9` remainder (the vocations table) — no apothecary/field-medic/
  surgeon/physician/poisoner business content.
- `## Part 7g — Frostbite from WEATHER` (2026-09-18, second instance),
  whole — confirmed no weather-driven cold producer for `frostbite`
  (only the direct cold-channel blow path exists); hypothermia's onset
  threshold is unchanged (`survivableMin`), the exact problem this
  section names.
- `## Part 7h — Dismemberment as GAMEPLAY` (2026-09-18, second instance),
  whole — confirmed no `restorePart`, and combat's called shot only
  distinguishes head vs torso (a comment says so verbatim) — the
  below-torso called shot this section is gated on has not landed.
- `Proposed waves` items 5–18, `Open questions` (already in compacted
  form from an earlier pass — items 1–4 struck through with pointers,
  5–7 genuinely open), the Hand-off section's remaining two bullets
  (splint, instruments).
- `## Where this leaves the model` (the whole consolidated section) —
  doctrine/framing, preserved as the slate's spine per the procedure.

### Uncertain — kept

- **The away-recovery three-way disagreement, now with a third data
  point.** `furnishing.md` says a bed integrates elapsed hours at its
  multiplier while logged out; `metabolism.md`/`Metabolic.
  reconcileMetabolism` say the opposite (drops any gap past 4h, "no
  away-recovery"); `harm.md`'s wound driver states it copies the *same*
  presence-freeze discipline, so wound healing ALSO freezes while away —
  directly contradicting this slate's § Part 4b thesis ("you log off with
  a splint and come back mended") and `furnishing.md`'s claim. None of
  the three docs is mine to fix; kept as Uncertain, not resolved.
- **Part 4b's function-fast/structure-slow two-clock proposal** vs. the
  single-severity-clock mechanism that actually shipped — noted at the
  cut site as "shipped in a different, simpler shape" rather than
  silently dropped, because the richer split was never built and may
  still be wanted.
- **Part 8d's masking-blinds-the-diagnosis subsection**, kept, whose
  premise (patients are worse at self-assessment) is undercut by the
  superseded claim next to it — masking itself doesn't exist yet either,
  so nothing forces a decision now, but a future build should reconcile
  the premise before implementing it.

### Doctrine (kept, not added to Left)

- `## Where this leaves the model` in full: the three-tiers-of-truth
  table, the layers table (now understating what shipped — left
  unedited per the no-rewrite rule; the canonical status block above it
  is the accurate read), "every addition is additive," the eight
  emergent rules, "what the model cannot express," the recovery-ratchet
  boundary statement, and the smallest-proof-scene.
- Part 4b's "the bed's product is recovery time" / Part 7d's "the inn
  sells safety, not a heal rate" / Part 8's "medicine spends money, magic
  spends you" — thesis statements the coordinator may want to lift into a
  `docs/design-philosophy.md` someday; left in place for now.

### Handoff (belongs in a doc outside my list)

None. Every SHIPPED·UNDOCUMENTED case I found resolved to `metabolism.md`
or `spoilage.md`, both of which **already** carry the relevant decision
(verified, not assumed) — so those became plain cuts, not graduations.
Nothing needed inserting into `mortality.md`, `respiration.md`,
`thermal.md`, `encumbrance.md`, `race.md`, or `reserve.md` either; the
sever-gameplay hand-off (reachability/`restorePart`/stump-economy)
belongs entirely to physiology's own kept § Part 7h, not to `mortality.md`
(mortality.md already correctly points back here, unchanged).

### Status block

- Left: *(29-item list spanning waves 5–18)* → *(same shape, corrected:
  pain · alarm-clock optimization · substances' topical/inhale/liver
  multiplier · chems/meds as content · wound infection · permanence &
  prosthetics · sleep & beds · care economy · animal/NPC body-plan
  fidelity · tolerance & withdrawal · medicine-vs-magic + `control·body`
  spell roster · site-targeted `treat`/`draw` · disciplines + malpractice
  + licensure · vocations as content · frostbite from weather ·
  dismemberment gameplay (gated on combat's called shot) · the two open
  read-through findings*. Net change: four shipped items (condition
  catalogue, capacity vocabulary/roster, function axis) dropped off the
  front; the self-assess design explicitly flagged as rejected rather
  than silently vanished.
- Size: a build → a build (unchanged — sleep, the care economy, chems-
  as-content, disciplines and the spell roster are each still real scope
  on their own).
