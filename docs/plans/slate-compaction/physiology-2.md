# Slate-compaction pass — physiology, SECOND pass (the MR !269 delta)

Batch key `physiology-2`. One slate:
`docs/slates/builds/physiology-slate.md` (1,966 lines at start).
Procedure: `.claude/skills/compact-slate/SKILL.md`. Write list:
`vitals.md` · `harm.md`.

⚠ **Read the first ledger with this one**:
[`physiology.md`](./physiology.md) (2026-09-19/20, 2,201 → 1,935 lines,
9 cuts + 1 superseded + 3 uncertain). This pass does **not** redo it —
nine sections in the body are already pointer stubs from that pass and
were left untouched.

**Why a second pass exists.** The first ran against master *three
minutes before* the nutrition-and-fitness build merged
(`81caf517f`, MR !269), and its agent was explicitly instructed to treat
nothing that build claimed as shipped and to KEEP those sections.
Nobody re-checked afterwards, and that build's own sweep updated
`nutrition-and-fitness-slate` and `metabolism-slate` but never this one
— so the slate has been carrying design the build shipped. In
particular **`docs/subsystems/exertion.md` (271 lines) did not exist**
when the first pass ran; it was created by that sweep.

Verified against `packages/server/src/mud/**` and `packages/content/**`
at `73621bfc5` (detached master, MR !269 an ancestor — confirmed with
`git merge-base --is-ancestor`).

---

## Findings (for the coordinator)

### 1. The merge made exactly ONE section stale, and it is the one the `Left` list opened with

`## ⭐ Anthropometrics — stature and BMI` (2026-09-18) asserted as
*verified state*: **"`Species.stature` exists — but no individual has a
height, so BMI (mass ÷ height²) cannot be computed for a person."**
False since MR !269:

| the section's *Shape* bullet | state at `73621bfc5` |
|---|---|
| per-individual stature, set at char-gen, persistent on `Creature` | **still UNBUILT** — `Creature.bodyMassIndex()` reads `this.getSpecies()?.getStature()`; stature remains a **species** field (`Species.ts` l.709, `getStature()` l.809). Two bodies of one species cannot differ in height |
| BMI as a banded derived read, in a physician's read | **SHIPPED** — `BMI_BANDS` (`Creature.ts` l.303), `bodyMassIndex()` l.483, `bodyMassIndexBand()` l.495 (`underweight/healthy/overweight/obese`), spoken by `assess` for a competent looker (`AssessController.ts`, +23 lines in the merge). The number renders nowhere — the no-gauge rule held |
| body density, fat floats, as the first mechanical consumer | **SHIPPED as the read** — `Creature.getBodyDensity()` l.509 (`F = 0.08 + 0.32 × flesh/100`, fat 900 / lean 1100 kg/m³). Its consumer is still the water: exertion.md says so in as many words (*"waits for water"*) |

Documented in `exertion.md § The mirror`. So the section loses its false
state paragraph and two of three bullets; **per-individual stature is
what actually remains**, and the `Left` list is re-stamped to say only
that.

### 2. Everything else in `Left` re-verified OPEN — item by item

No pain reader anywhere (`lib/vitals`, `lib/creature`: zero hits for
*pain*) · no `ScheduleApi`/`SchedulerApi`/next-interesting-time in
`lib/vitals/**` or `ConditionLogic.ts` — `reconcileConditions` is still
pure reconcile-on-read · no `effectiveClearance`, no liver multiplier,
no topical or inhale route · no med/chem content (the `Condition/` tree
is still `circulation · magic · metabolism · mortality · pathogen ·
respiration · thermal`) · no wound/environmental infection **producer**
(the in-host arm and `tendInfection` are the food-safety build's
pathogen path, `spoilage.md`) · no scar feature, no prosthetic, no
`restorePart` (zero hits) · no sleep state · no clinic pricing or triage
· no reduced body plans · no `surgery` Discipline (the roster has
`medicine` and, new in MR !269, the two *conditioning* rows `wind` and
`alcohol-tolerance`) · no `staunch`/`purge`/`mend`/`numb`/`wake`/
`diagnose` spell rows (18 spells ship, none medical) · the only `draw`
is banking's · no weather-driven frostbite producer (`ConditionLogic`
l.76 is the cold-channel blow) and hypothermia still onsets at
`survivableMin` (`ThermalRegulation.ts` l.582) · `siteFor`
(`CombatLogic.ts` l.2688) still returns head-or-torso, so the called
shot is still the hard prerequisite Part 7h names.

### 3. ⭐ Tolerance shipped its STORAGE and not its MEANING — the one genuinely mixed case

MR !269 added `alcohol-tolerance` as a real biological reserve: seeded
0, fed in `Metabolic.absorbToxin` at alcohol absorption
(`body.toleranceGainPerGram`), decaying on `body.toleranceHalfLifeDays`,
banded by a `conditioning` Discipline row
(`Discipline/alcohol-tolerance.yaml`, `stock: alcohol-tolerance`).
Documented in `exertion.md § The stocks` and `metabolism.md § The slow
stocks`.

But the code says outright what did not ship — `Metabolic.ts` l.994:

> *"Its consumer (widening the `bac` bands) is a metabolism-tail seam;
> the requirement here is that it exists and fades honestly."*

§ Part 7h's *"Tolerance is the BANDS MOVING"* is therefore **half
real**: one number per body exists (for one substance), and the thing
the section is *about* — the bands moving — does not. **Kept whole**
(when in doubt, keep; and cutting the storage sentence out of a
three-sentence subsection would fall below paragraph granularity).
Requirements should open it knowing the stock is already there.

### 4. The 96.8 kg tissue-mass finding got SHARPER, not resolved

Re-counted mechanically at
`species-and-names/…/BodyPlan/biped.yaml`: 35 tissue entries summing
**96.8 kg** against `baseMass: 70`. Unchanged. But the finding's own
prediction — *"it will look wrong the first time anything aggregates
them, which the planned strength reading is designed to do"* — has now
been **dodged rather than met**: MR !269 shipped the strength read
(`leanMargin()` → `LoadBearing.getCarryCapacity`) off the `lean`
reserve, and shipped `Creature.getMass()` as `baseMass` + flesh/lean
terms. So mass is now load-bearing for carry capacity, thermal mass,
garment fit and **BMI itself**, all from the 70 kg frame, while the
tissue table beside it says 96.8. The two numbers now disagree in
public. Only `BodyPlan.partArea` reads tissues, and only per-part.
Finding kept verbatim; flagged here because it is closer to biting.

### 5. ⚠ The three-way away-recovery disagreement is STILL unresolved — MR !269 did not settle it

Checked, per the coordinator's instruction. The merge touched
`furnishing.md` (+9) and `metabolism.md` (+19) and neither line goes
near it:

- `furnishing.md § Sleep as logout` (l.480–485, **unchanged**) still
  says a body logged out on a bed integrates the elapsed hours at that
  bed's multiplier — *"Parity, never a bonus."*
- `metabolism.md`'s new *§ The slow stocks* **reinforces the opposite
  side** for the five new reserves: they *"ride THIS clock, so the
  linkdead freeze and the far-past guard make never tax absence true for
  all of them for free."* That is the freeze, extended to five more
  stocks — and `Metabolic.reconcileMetabolism` still drops any gap past
  `MAX_REASONABLE_GAP_SEC` for an unowned body.
- `harm.md`'s wound driver still states it copies the same
  presence-freeze discipline, so wound healing freezes while away.

Three docs, three answers, and § Part 4b (*"you log off with a splint
and come back mended"*) is a fourth. **Still flagged, still nobody's to
fix in a compaction pass.** The merge's only contribution is that the
freeze side now has more code behind it.

### 6. ⚠ Kept-but-contradicted: *"nothing else needs player fatigue"*

§ Part 7d *"Sleep ADDS; wakefulness does not subtract"* (l.917–928)
argues **not sleeping does no damage** and that *"nothing else needs
player fatigue (NPC schedules are employment rosters)"*, with a
counter-argument on the record that the night then has no personal
pressure. MR !269 shipped a work-driven fatigue ladder — `fresh ·
tired · winded · spent` on endurance, the run that breaks, the step verb
that refuses, the `BODY` shelf row, the *"You're winded."* cue — with an
explicit clamp that **work never collapses a body** (exertion.md
§ *Soft limits*). The section's conclusion survives (there is still no
**sleep** need, and a walk is still free), but its premise now sits
beside a shipped fatigue vocabulary it does not know about. **Kept
verbatim**; requirements should reconcile the two words, not inherit
the sentence.

### 7. Noted, not cut: the bed's balance rule is already stated in a subsystem doc

§ Part 7d *"The balance rule that stops the distortion"* — **"The bed
heals you. The client does not. Same rate logged in or out."** —
is `furnishing.md § Sleep as logout`'s *"Parity, never a bonus, and
never below the floor"*, shipped in the furnishing build (before either
compaction pass). **Not cut**, for two reasons: the surrounding sleep
design is wholly unbuilt, and the parity rule is one of the three
positions in the unresolved disagreement above — cutting it would look
like the disagreement had been decided. Flagged for the coordinator.

### 8. Standing items the first pass recorded and this pass re-confirms

The duplicate `## Part 7g` / `## Part 7h` headings (care-model vs
frostbite; tolerance vs dismemberment) are **still unrenumbered** —
both of each pair are live open design, and `harm.md § What this is NOT`
points at *"physiology-slate § Part 7h"* meaning the dismemberment one.
§ Part 8c's dated aside that `docs/arcane-science.md` was *"untracked at
time of reading"* is still standing and still wrong (the doc is tracked)
— kept, per the no-rewrite rule. The `## Where this leaves the model`
layers table still says the four couplings are *"declared, ALL FOUR
UNREAD"*, which the function axis disproved; kept for the same reason,
with the canonical status block above it as the accurate read.

---

## `docs/slates/builds/physiology-slate.md` — 1,966 → 1,971 lines · Status PARTIAL → PARTIAL

⚠ **The file grew by 5 lines and that is the honest outcome.** The merge
made exactly one section stale; 21 lines of content left, 26 lines of
pointer + re-stamp arrived (7 of them in the status block, so a third
agent does not re-derive why a second pass existed). A delta pass is not
a second compaction — the other ~1,950 lines were re-verified, not
re-cut. Written incrementally: findings before the first cut, this
record after it.

### Cut (SHIPPED · DOCUMENTED)

- `## ⭐ Anthropometrics — stature and BMI` → the **`State (verified)`
  paragraph** (4 lines) — code: `Creature.ts` l.483 `bodyMassIndex()`,
  l.495 `bodyMassIndexBand()`, l.303 `BMI_BANDS`; doc:
  `exertion.md § The mirror`. The paragraph's claim (*"no individual has
  a height, so BMI cannot be computed for a person"*) is false as
  written: BMI is computed, banded and spoken. What is still true — that
  the height it divides by is the **species'** — survives in the kept
  bullet and in the note left at the cut.
- Same section → **Shape bullet 2** (*BMI as a banded derived read, in a
  physician's read, never a gauge*) (3 lines) — code: `Creature.ts`
  l.483–505, `AssessController.ts` (+23 in the merge); doc:
  `exertion.md § The mirror`. Shipped exactly as designed, no-gauge rule
  intact.
- Same section → **Shape bullet 3** (*body density, fat floats, as the
  first mechanical consumer*) (5 lines) — code:
  `Creature.getBodyDensity()` l.509; doc: `exertion.md § The mirror`
  (*"waits for water"*). The READ shipped; its consumer is the
  underwater/fishing slate's, not this one's.

Net: 12 content lines + the 9 lines of surrounding list/heading
structure they sat in.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut

None **from the slate**. Everything MR !269 shipped that this slate had
designed was documented by that build's own sweep, in `exertion.md` (a
doc that did not exist when the first pass ran) and `metabolism.md`.

### ⚠ Corrections to a subsystem doc on my write list (statements the code proves false)

Sanctioned by the procedure's *"except to fix a statement the code
proves false — and if you do that, the ledger says so."* Both in
`docs/subsystems/vitals.md`, both invalidated by MR !269, neither
noticed by that build's sweep:

1. **`§ Reserves`** said *"The reserve producers (consumption, exertion
   wiring) are **deferred**."* They are not: `ExertingMixin` and
   metabolism's slice steps 6–9 are the producers, and the roster grew
   from three named reserves to nine. Replaced the false clause with a
   dated `> Update (nutrition-and-fitness, MR !269)` block (+14 lines)
   naming the five new stocks and pointing at `exertion.md` /
   `metabolism.md`.
2. The same block carries the **vitals-side rule** that arrived with
   them and lives nowhere else that owns `getConditionBand`:
   **a floored biological reserve counts toward the condition band only
   when it HAS a `floorEffect`** (`Vitals.ts` l.907–918) — a stock
   seeded empty is untrained, not degraded. Without it every fresh body
   would have read as degraded the day `wind` landed.
3. **`§ What's deferred`** listed *"reserve drain/replenish producers"*
   among the remaining deferrals. Struck from the list with a one-line
   pointer to § Reserves above.

`docs/subsystems/harm.md` — **no change**. MR !269 made no harm
decision; the one seam it touched (`assess` reporting the BMI band) is
already stated in `exertion.md`, and duplicating it into harm.md would
be a second copy, not a graduation.

### Superseded — cut

None this pass. (The first pass's one superseded section — the
self-assess-reads-worse design — remains cut, with its note in place.)

### Kept (UNBUILT) — re-verified against code on 2026-09-23

Everything the first pass kept, with the evidence in *Findings § 2*:
`## Part 4` (pain) · `## Part 4b` remainder · `## Part 5` (alarms) ·
`## Part 7` (five verbs, time-is-free, masking, buffs) · `## Part 7b`
remainder (routes, object model, dose-as-verb, the liver multiplier) ·
`## Part 7c` (wound infection, permanence, prosthetics, the ratchet) ·
`## Part 7d` (sleep & beds) · `## Part 7e` remainder ·
`## Part 7f` (the care economy) · `## Part 7g` *Who gets a body* ·
`## Part 7h` *Tolerance* · `## Part 8`, `8b`, `8c` (medicine vs magic,
the roster, the arcane revision) · `## Part 8d` remainder ·
`## Part 8e` remainder · `## Part 9` remainder · `Proposed waves` 5–18 ·
`Open questions` 5–7 · the Hand-off's splint + instruments bullets ·
`## Part 7g` *Frostbite from WEATHER* · `## Part 7h` *Dismemberment as
GAMEPLAY* · `## Where this leaves the model` (doctrine) · the two
read-through findings in `## Part 3` · and the surviving
`## ⭐ Anthropometrics` remainder (per-individual stature).

Nine sections in the body are pointer stubs from the first pass and were
**not touched**: Part 1, Part 2, Part 3's roster block, Part 4b's two
armor subsections, Part 6, Part 7b's two correction subsections, Part
8d's superseded subsection, Part 8e's opening, Part 9's closing, the
waves 1–4 note, and the Hand-off's severed-limb bullet.

### Uncertain — kept

- **`## Part 7h — Tolerance, withdrawal, and interactions` → *Tolerance
  is the BANDS MOVING*.** Half shipped: the stock exists
  (`alcohol-tolerance`, fed in `Metabolic.absorbToxin`, half-life decay,
  banded by a `conditioning` Discipline row), the consumer does not, and
  the code says so at `Metabolic.ts` l.994 — *"Its consumer (widening
  the `bac` bands) is a metabolism-tail seam."* Kept whole: the
  subsection is three sentences and the one that shipped cannot be cut
  without going below paragraph granularity. Requirements should open it
  knowing the number is already on the body. See *Findings § 3*.
- **The three-way away-recovery disagreement — STILL UNRESOLVED**, and
  MR !269 did not settle it (checked, per instruction): `furnishing.md
  § Sleep as logout` is unchanged, `metabolism.md`'s new *§ The slow
  stocks* extends the freeze to five more reserves, `harm.md`'s wound
  driver still freezes repair, and § Part 4b still argues the opposite.
  Four positions now. See *Findings § 5*.
- **`## Part 7d` → *Sleep ADDS; wakefulness does not subtract*** —
  kept-but-contradicted. Its *"nothing else needs player fatigue"* now
  sits beside MR !269's shipped `fresh · tired · winded · spent` ladder,
  the run that breaks and the step verb that refuses. The conclusion
  survives (no **sleep** need shipped, and work never collapses a body);
  the vocabulary needs reconciling at requirements. See *Findings § 6*.
- **`## Part 7d` → *The balance rule that stops the distortion*** —
  *"Same rate logged in or out"* is already `furnishing.md § Sleep as
  logout`'s *"Parity, never a bonus."* Not cut: it is one of the three
  positions in the unresolved disagreement above, and cutting it would
  read as deciding it. See *Findings § 7*.
- **`## Part 3` finding 1 (the 96.8 kg tissue sum)** — re-counted
  mechanically, unchanged, but now sharper: MR !269 made `getMass()`
  load-bearing for carry capacity, thermal mass, garment fit and BMI
  from the **70 kg** `baseMass` frame, while the tissue table beside it
  sums 96.8. The shipped strength read (`leanMargin()`) went round the
  tissues rather than through them, so the finding's own prediction was
  dodged, not met. See *Findings § 4*.

### Doctrine (kept, not added to `Left`)

Unchanged from the first ledger — `## Where this leaves the model` in
full, plus Part 4b's *"the bed's product is recovery time"*, Part 7d's
*"the inn sells safety, not a heal rate"* and Part 8's *"medicine spends
money, magic spends you"*. No doctrine moved or homed this pass.

### Handoff (belongs in a doc outside my write list)

**None.** Every shipped-but-relevant decision this pass found was
already carried by the doc that owns it:

- BMI, its bands, body density, the build phrase, the mirror →
  `exertion.md § The mirror` ✓
- the five stocks, their rates and sinks → `exertion.md § The stocks` +
  `metabolism.md § The slow stocks` ✓
- the `alcohol-tolerance` stock → both of the above ✓
- the gym archetype → `furnishing.md` (+9 in the merge) ✓
- conditioning as `Discipline.stock` → `advancement.md` (+8) ✓

Nothing needed inserting into `exertion.md`, `metabolism.md`,
`advancement.md`, `mortality.md`, `furnishing.md`, `reserve.md` or
`encumbrance.md`. The two `vitals.md` corrections above are on my write
list and are recorded there, not here.

### Status block

- **Status:** PARTIAL → PARTIAL (unchanged — most of the slate is still
  unbuilt design).
- **Left:** first item was *"per-individual stature + BMI as a banded
  derived read (its first consumer is body density for buoyancy)"* →
  *"per-individual stature (BMI itself shipped; stature is still a
  **species** figure, so two bodies of one species cannot differ in
  height)"*. Every other item re-verified and unchanged. A dated
  re-verification line was added above `Left` so a third pass does not
  have to re-derive why this one ran.
- **Size:** a build → **a build** (unchanged — sleep, the care economy,
  chems-as-content, infection, the disciplines and the spell roster are
  each still real scope).

### For the coordinator to decide

1. **The away-recovery disagreement now has four positions and two
   compaction passes flagging it.** It is a one-decision fix that no
   agent on this pass is allowed to make. It blocks nothing today and
   will block the physiology build's first wave.
2. **Whether a build's sweep should re-run compaction on the slates it
   invalidated but did not own.** MR !269's sweep updated the two slates
   it built *from* and left this one carrying design it had shipped.
   That is the failure this ledger exists to record, and it is
   structural, not this build's oversight.
3. **The 96.8 kg vs 70 kg tissue/mass contradiction** is now public in
   four consumers. It is a content fix (or one sentence at the site
   saying the masses are relative), not a build.
