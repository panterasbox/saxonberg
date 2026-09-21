# Slate-compaction pass — spoilage batch ledger

Seven slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `spoilage.md` only.
Line numbers below are the ORIGINAL file's. Code evidence is what was
grepped on 2026-09-19 against `packages/server/src/mud/**` and
`packages/content/**`; nothing was classified on a slate's own ✅.

Batch-wide evidence used repeatedly: `lib/material/Freshness.ts`
(`growthRate` l.255 — Arrhenius + the linear `f_aw` ramp; `killOver` l.409;
`inoculum` l.438; `doseFor` l.512; `FRESHNESS_CHANNELS` l.145) ·
`lib/material/Cured.ts` (`moisture`/`solute`, the multiplicative `a_w`, the
passive arm reading `BiomeApi.localHumidityFor`) ·
`lib/material/Contaminable.ts` (`PathogenBehavior` l.91 — `reach`,
`germinationK`, `awFloor`, `infectiousDose`; no `markupAugmenters` l.598;
`transferContaminationTo` l.575) · `platform/thing/Provision.ts:51` (the
composition: Contaminable · Cured · ThermalDose · Freshness · Thermal) ·
`platform/idea/Condition.ts` (`ProgressionSpec` l.638 now carries a declared
`law`; `PROGRESSION_LAWS` l.615 = stage · decay · logistic · burden;
`ContagionSpec` l.1139 still zero consumers) · `lib/vitals/Vitals.ts:1788`
(the logistic arm over `record.pathogenLoad`) · the five pathogen rows at
`platform/content/platform/idea/Condition/pathogen/` · `trade-cooking`'s
`cmd/crafting/{butcher,cure,dry,smoke}.yaml` + `recipes/{salt-cure,air-dry,
smoke-cure}.yaml` · `package.json` `lint:perishable` / `lint:pathogens`.

---

## docs/slates/builds/food-safety-slate.md — 586 → 120 · Status PARTIAL → PARTIAL

The slate's own second status block said it: everything shipped in MR
!244 except molds. Verified true — and `spoilage.md` carries nearly all of
it. What remained undocumented was the *why* of four decisions, graduated
below. Parts 0–9 are gone behind one pointer block; Part 10 and the
attach points are the body.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"⭐⭐ Status: SHIPPED 2026-09-04 … with one tail"* + the one-sentence build (8–23, 16 lines) — history; the canonical block above it says the same
- `## Part 2 — Per-instance water activity [DECIDED]` (106–165, 60) — code: `lib/material/Cured.ts`; doc: `spoilage.md § The water state` (two scalars, multiplicative `a_w`, the drying/curing asymmetry, `moisture: 1, solute: 0` identity, symmetric on `BulkPayload`). The two undocumented pieces (the `WetMixin` trap; the `f_aw` ramp) are graduated below
- `## Part 3 — The pathogen split [DECIDED]` (168–246, 79) — code: `Contaminable.ts` (`{}` until seeded, no augmenters), `Freshness.ts:145` (channel list), `freshness.killActivationEnergy` dial; doc: `spoilage.md` header (*a clock vs an EVENT*), `§ The silent population`, `§ What cooking does to it` (*"hot enough" is a RATE*), `§ Dials`, the `perfringens` roster row (the danger-zone lesson)
- `## Part 4 — In-host growth, no transmission [DECIDED]` (249–317, 69) — code: `Condition.ts:71` `AfflictionRecord.pathogenLoad`, `Vitals.ts:1788` logistic arm under `progression.law`, `Metabolic.ingest` seeds it; doc: `spoilage.md § In the body` (incubation, the dying arc as ceiling, *invisible to the senses, knowable by procedure*), `vitals.md` l.259. `ContagionSpec` untouched (zero consumers — verified)
- `## Part 5 — The roster IS the curriculum` (320–355, 36) — content: the five `Condition/pathogen/*.yaml` rows; doc: `spoilage.md § The silent population` (the roster table, `reach` × spore-forming, botulinum's `labileAtK`). The sealed-jar deferral paragraph (350–354) is carried verbatim by `preservation-slate § Terms` consequence 2, kept
- `## Part 6 — Butchering` (358–392, 35) — code: `trade-cooking/src/idea/cmd/crafting/ButcherController.ts` (cuts derive from `sinceDeath()`; one `butchery` band read sets yield AND gut spill), `Species.getButcheryYield` (3 rows); doc: `spoilage.md § The silent population` (*where a load comes from: butcher*; the block/blade/wash chain), `mortality.md § sinceDeath() is public, and butchering reads it`
- `## Part 7 — Substrate audit (verified 2026-09-03)` (394–415, 22) — history
- `## Part 8 — Findings filed on the way` items 1 + 3 (418–428, 432–438) — item 1 FIXED: `ProgressionSpec` now carries a declared `law` and `Vitals.ts:1621` dispatches on it (its docstring even records this finding); item 3 is `spoilage.md § Fermentation is the one collision to watch`. Item 2 → Handoff (still true)
- `## Part 9 — Build shape` (441–462, 22) — history; W0–W4 all shipped
- `## Open questions — all five ANSWERED` + `### The original questions, as asked` (537–587, 51) — every answer is a shipped decision the doc states: host = `VitalsMixin` (`§ In the body`), objects-only reach (`§ The silent population`, and the hands seam stays in the kept attach points), `channels: []` gated by `lint:pathogens` (`§ What a player sees`), calibration fitted to the ptomaine seed (`§ Calibration`). The sibling-field answer is graduated below

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Part 1 — The punchline: curing preserves the contamination` (82–103, 22) — code: `Contaminable.ts:245` (`if (aw <= behavior.awFloor) return 0` — suspends, never kills) → inserted at `spoilage.md § The water state` after the asymmetry paragraph (12 lines: lowering `a_w` suspends every population including pathogens; *heat kills but does not clean; curing cleans nothing and kills nothing*; why traditional curing is a sequence)
- `### ⚠ The trap: this must NOT ride WetMixin` (142–152, part of Part 2) — code: `Cured.ts` composes beside `Freshness`, reads humidity only through the passive arm → inserted at `spoilage.md § The water state` after the *composed beside* paragraph (6 lines: surface saturation drains to dry; internal moisture must not; the coupling runs the other way)
- `### Two things that come free` → the `f_aw` ramp bullet (156–160) — code: `Freshness.ts:284` `clamp01((aw - floor) / (1 - floor))` → inserted at `spoilage.md § The rate law` after the `f_aw` bullet (7 lines: the linear ramp, 0.80 halves / 0.70 quarters / 0.60 stops, why not Gibson)
- Open questions → *"sibling field: `pathogens` + `pathogenStamp` on `BulkPayload`, declared from `Contaminable.ts`"* (545–549) — code: `interface BulkPayload` augmentations in `Freshness.ts:214`, `Contaminable.ts:173`, `Cured.ts:142` → inserted at `spoilage.md § The blend half` (7 lines: each gauge declares its own payload field from its own module; why a shared `{load, stamp}` could not hold a per-organism map)

### Superseded — cut
- `## Part 0 — What shipped, and what this is` (53–80, 28) — by the code: *"nothing in the game preserves anything"* and *"14 recipes and not one is a cure"* were true on 2026-09-03 and false since MR !244 (`cure`/`dry`/`smoke` verbs + `salt-cure`/`air-dry`/`smoke-cure` recipes). The lever table's three-of-four is `spoilage.md § Deliberate deferrals` (acidity). One pointer block left for Parts 0–9

### Kept (UNBUILT)
- `## Part 10 — The cut, and why` — molds (no `Penicillium`/`Aspergillus`/mold row anywhere; `Contaminable` has no visible surface population), medicine (pharma's), rancidity (doc records the deferral, but the *"olive oil and tallow ship so a consumer exists; wants its own law"* is design), `f_pH` (nothing in code speaks acidity outside `trade-farming`'s soil pH)
- `## ⭐ The attach points the build left open` — all eight are seams with no consumer: hands (`Creature` composes no `Contaminable`), irrigation (`WateringCan` does not), `trade-butchery` (butchering lives in `trade-cooking`), a durative `cook`, `f_pH`, molds, `ContagionSpec`, rancidity

### Uncertain — kept
- the See-also's *"(⚠ the boundary. This build fills `ProgressionSpec` … — see Part 4)"* now points at a cut section. Left as is: the See-also is spine and I only drop links to things I cut, not reword entries
- Overlaps for the cluster pass: molds ↔ nothing else (a real tail); `f_pH` ↔ `preservation-slate § Terms` (kept there too, by the two-slates rule); `ContagionSpec` ↔ both disease slates

### Handoff (belongs outside my list)
- → **code, not a doc**: `platform/idea/Condition.ts:1156` — the class docstring still reads *"ZERO content ships — the class + field shape only; the catalog is a later wave."* 24 `Condition` rows ship. Was Part 8 finding 2; still true; a one-line comment fix
- → `metabolism.md`: nothing — the ingest rung is already stated there (l.258, l.277)

### Status block
- Left: *molds (Part 10) — the second population's visible surface* → *molds (Part 10) · rancidity's own small law (Part 10) · `f_pH` + the `Vat` collision it inherits (Part 10) · the attach points nobody uses yet (hands on `Creature` · irrigation contamination · the `trade-butchery` spin-out · a durative `cook`)*
- Size: a build → a build (molds alone is one)

---

## docs/slates/builds/fridge-design-pack.md — 491 → 482 · Status PARTIAL → PARTIAL

Almost entirely unbuilt, and the greps agree: no `ClimateControl`, no
`PoweredMixin`, no `Coolbox` anywhere (`arcana`'s `ManaPowered` is a
different thing); `AtmosphericMixin` still composes on `Location` and
`Vessel` only (`lib/stuff/Location.ts:46`, `lib/stuff/Vessel.ts:50`), so
update #1 (atmosphere on a `Container`) is open and the container-skip the
slate worries about is still real. Only the spoilage prerequisite shipped.

### Cut (SHIPPED · DOCUMENTED)
- Part 1 § 6 → the *"⛔ Requires `Freshness` on food to have a point … do not schedule it before spoilage"* bullet (151–153, 3) — the prerequisite landed (MRs !231, !244)
- Part 7 → the **[1] Spoilage core** bullet (447–449, 3) — replaced by a one-line ✅ pointer to `spoilage.md`
- See also → the `spoilage-design-pack` entry (24–25) — dropped; that file is deleted in this batch (below)

### Graduated
- none

### Superseded — cut
- `## Part 2 — The spoilage co-dependency` → paragraph 1 (167–175, 9) — by the code: the summary it gives (a ~120-line mixin copying `Wet.ts`, a freshness→ptomaine *override rung*) is not what shipped (`FreshnessMixin` on `Provision`, the dose folded at the read by `Freshness.withDose`, `CuredMixin` for the water state) → `spoilage.md`. One-line note left; paragraph 2 (*the fridge consumes exactly one output: temperature*) kept

### Kept (UNBUILT)
- `## Part 0` (the per-object format) · `## Part 1` (all seven fields; the fridge rows) · `## Part 3` (jar/cellar/icebox/fridge; `CoolboxMixin`) · `## Part 3A` (the physics; the COP fork) · `## Part 3B` (interop) · `## Part 4` (the mirror) · `## Part 5` (the civic extension — flagged for its own pass) · `## Part 6` (partner surface) · `## Part 7` (fault lines [2]–[6]) · `## Open questions / forks`

### Uncertain — kept
- Part 3B → *"gated on the Condition-live prerequisite (doctrine Part 6)"* — satisfied: `Condition` rows ship and the ptomaine path is live. Kept inside an otherwise-unbuilt bullet
- Part 3 → *"Cellar / cold room — a `Location` atmosphere override — ships with update #1"* — a `Location` override is authorable TODAY (`AtmosphericMixin` on `Location`, `BiomeApi.resolve*For` walks it; the `Thermal` host reads it), so the cellar does not wait on update #1. Kept; requirements should note the cellar is free
- Part 3A → `Atmospheric` *"humidity as water activity / RH (the real spoilage driver)"* — `a_w` is now a per-instance property of the FOOD (`CuredMixin`), not the air; ambient RH reaches it only through the slow rehydration arm (`cure.rehydrationPerHour`). The *cold-and-dry vs cold-and-humid* lesson survives via that arm, but the mechanism named here is stale

### Handoff
- none

### Status block
- Left: *the cold-container substrate · the icebox · `ClimateControl` + `Powered` · the fridge/freezer rows · the mirror inbound channel* → same, plus *the COP fork · the civic "better resident" extension (Part 5 — needs its own pass) · the partner surface (Part 6, bracketed)* — three unbuilt sections were unrepresented
- Size: a build → a build

---

## docs/slates/tails/preservation-slate.md — 462 → 194 · Status PARTIAL → PARTIAL

The *mechanism* half shipped whole and the slate said so. What it did
not say is that several of its own [DECIDED] calls landed in a different
shape (wetness is NOT the carrier; the `a_w` floor DOES stop the clock;
the dose is folded, not an override rung). Two undocumented rationales
graduated. The endeavour half — acidity, sealing, the year, geography,
salt — is the body.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"design captured 2026-07-31, not built … keystone deferral"* (11–24, 14) — history
- `## The mechanism — spoilage is disease without transmission` + `### It is a third wear axis` (93–124, 32) — code: `Freshness.ts` (logistic, `lib/material/`, own bands); doc: `spoilage.md § The rate law`, `§ The gauge`. The disease inheritance happened (`Vitals.ts:1788`)
- `## What is blocked today` (314–328, 15) — history; every row's blocker shipped or is owned by a kept section
- `## Keeping it un-miserable` items 1–4 (332–339, 8) — doc: `§ The gauge` (only `Provision` rots), `§ The rate law` (the floor), `§ What a player sees` (banded, never a number). Item 3 (*never deletion*) is structural — the load saturates at 1 and reads *rotten*
- `## Two divergences from the copied skeleton` (355–369, 15) — doc: `§ The gauge` (*two deliberate divergences from `WetMixin`*, verbatim in substance)
- `## Substrate audit (verified 2026-07-31)` (401–419, 19) — history
- `## v1 scope` (422–433, 12) — shipped (over `Provision` generally rather than fish only; salt authored at `trade-cooking/…/material/salt.yaml`, `a_w 0.15`)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Law 2, and the line this must not cross` + `### Correcting an inherited framing` (45–89, 45) — code: `FreshnessMixin` composes on `Provision` only (`Provision.ts:51`; a plant, a live `Creature`, a blade carry no gauge) → inserted at `spoilage.md § The gauge` before *The blend half* (9 lines: the clock starts at an ACT, never at ownership — the Law-2 clearance by construction; why gear never rusts without a flag). The `corrosion`-channel note is materials-response's and was not touched by the build, as the slate asked
- `### Do NOT drop Grade [DECIDED]` (341–352, 12) — code: `Freshness.ts` references no grade (grep: 0 hits); `gradeConditionScale` unchanged → inserted at `spoilage.md § The gauge` (7 lines: Grade is the maker's verdict, the load is entropy, freshness is a third gauge; the one heat-driven grade write is doneness's *ruined*)

### Superseded — cut
- `## What the drivers actually cost [corrected]` + `### The material number` + `### Two behaviours come free` (128–175, 48) — by the code: `WetMixin` is NOT the `a_w` carrier (`CuredMixin` is, and `spoilage.md § The water state` now says why — graduated from food-safety); `ThermalMixin` on `Provision` and the real `spoilActivationEnergy` (J/mol) are `§ The gauge` / `§ The rate law`. One-line note left covering § Law 2 · § mechanism · § drivers
- `## The counterplay` → the method table + *"Preservation lowers the rate. It never stops the clock"* + *"No preservation craft exists"* (180–201, 22) — by the code: the `a_w` floor genuinely stops growth (`Freshness.ts:278`), and `cure`/`dry`/`smoke` ship as `trade-cooking` recipes with `cure:` blocks (`§ The water state`). One-line note left; the heading and `### Terms, not methods` kept
- `## The one real seam — and it is already an override point` (372–398, 27) — by the code: the ptomaine dose is folded at the READ (`Freshness.withDose` / `ingestPayloadOf`; `§ The ingest reach`, *never stored*), not a freshness override rung ahead of the material fallback

### Kept (UNBUILT)
- `### ⭐ Terms, not methods — the completeness doctrine` (203–256) — `f_pH` is absent (no acidity read anywhere outside soil); pickling as a `MaturationProfile` row is unbuilt; the sealing decision (binary; a hurdle multiplier when wanted, never a flora model) is unbuilt — `Sealable` appears nowhere in `Freshness.ts`/`Cured.ts`. The lever table's three shipped rows stay because the table is one paragraph
- `## The agricultural year falls out` — winter ships (`soil.md § Winter`) but nothing about *stores*/the preserving season is content yet
- `## Spoilage creates the geography of trade` · `## Salt is the keystone commodity` — salt is a `ConsumableMaterial` tagged `seasoning`; no mine, no tax, no route
- `## Open questions` — spine; see Uncertain

### Uncertain — kept
- `## Open questions` — five of seven are answered by the code and the doc: composed on `Provision` not universal-and-inert (`§ The gauge`, and the two-wrong-answers story); an activation energy, not a shelf-life constant (`§ The rate law`); cooking resets by RATE and the cooked material spoils faster (`§ What cooking does to it`); calibration (`§ Calibration`); the kill NOT re-based onto doneness's `z` (`§ Doneness`). Still open: *does sealing do physics* and the rolling numeric calibration. Kept whole per the spine rule; requirements should read them as history except sealing
- `### Terms` → consequence 1 names `MaturingMixin` as the carrier — correct name today (`Vat.ts:38`); consequence 2 (sealing) is the same deferral `food-safety-slate` Part 5 carried (cut there; this is its one home now)
- Overlaps for the cluster pass: `f_pH` ↔ `food-safety § Part 10`; salt-as-staple ↔ `mining-slate`; the agricultural year ↔ `farming`/`farmstead`; the trade geography ↔ `logistics`/`freight`

### Handoff
- none

### Status block
- Left: *smoking · the victualler / packing house · salt as a mined and taxed staple · the agricultural year (winter stores) · wetness → water-activity coupling · the trade geography spoilage creates* → *the acidity term `f_pH` (pickling as a `MaturationProfile` row + one read) · the sealing decision (binary until a consumer wants a hurdle multiplier, never a flora model) · the agricultural year (winter stores) · the trade geography spoilage creates · salt as a mined and taxed staple*. Dropped: **smoking** (shipped — `smoke.yaml` + `smoke-cure.yaml`, 13 K under the kill); **the victualler / packing house** (no body section here; `hearth-and-larder § Part 2` carries the victualler); **wetness → `a_w` coupling** (no body section; `spoilage.md § Deliberate deferrals` is its home, and food-safety's graduated paragraph says why it must not be `WetMixin`)
- Size: a wave → a wave

---

## docs/slates/builds/disease-slate.md — 402 → 342 · Status PARTIAL → PARTIAL

The growth term shipped, in a different shape than the [DECIDED] section
designed; `ContagionSpec` did not (zero consumers — the only `contagion`
references in the kernel are `Condition.ts`'s own field + accessors). The
push-tick spread driver, host range and reservoir are open; `hostRange`
matches nothing; `openNeighboursOf` is still `function`-private at
`FireLogic.ts:398`.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"design captured 2026-07-31, not built … the delta is two things"* (12–27, 16) — history; the husbandry-is-immunity connection it leads with is § Immunity, kept
- `## Where to prove it` → the *"Amended 2026-07-31: the growth term should be proven earlier, in preservation"* blockquote (354–359, 6) — done: `Vitals.ts:1788` runs the logistic law spoilage proved

### Graduated
- none (the in-host half's rationale is already `spoilage.md § In the body` + `vitals.md`)

### Superseded — cut
- `## The core model — a burden that grows [DECIDED]` (85–112, 28) — by the code: the load lives on the `AfflictionRecord` as `pathogenLoad` under a declared `progression.law: logistic` (`Condition.ts:638`, `PROGRESSION_LAWS`), grown by `reconcileConditions` — a sibling of a wound (food-safety's call), NOT a positive term added to `ToxinBehavior`. The phase table (incubation = load below the lowest band) holds exactly. One-line note left → `spoilage.md § In the body`, `vitals.md`
- `## Substrate audit (verified 2026-07-31)` + the *"Doc bug found: harm.md claims …"* paragraph (325–348, 24) — by the code: the growth term shipped; `treat` now handles `kind === 'affliction'` (`TreatController.ts:260`); and `harm.md` l.23–35 itself carries the `ConditionApi` correction this audit filed, so the doc bug is resolved. One-line note left naming what is STILL true (`ContagionSpec` unconsumed; `openNeighboursOf` private; no host range)

### Kept (UNBUILT)
- `## The seam is already cut` (see Uncertain) · `## Two idioms, not one` (the push tick) · `## ContagionSpec — the one thing to design` + routes + host range + reservoir · `## Immunity is live` · `## The unifying frame` · `## How it plugs into each system` · `## The clock does something lovely here` · `## Four rules` + `### A free quarantine mechanic` + `### An outbreak is an investigation` · `## Where to prove it — crops first` + `### The v1 slice` · `## Open questions`

### Uncertain — kept
- `## The seam is already cut` — the yaml path `seeds/lib/metabolism/conditions/ptomaine.yaml` is stale (now `platform/content/platform/idea/Condition/metabolism/ptomaine.yaml`), *"null in all 11 seeds"* is now 24 rows, and `Kind A … under /lib/condition/…` is the old namespace. The framing point (`ContagionSpec` reserved, zero consumers) is still exactly true, so kept
- `## Two idioms` → *"the within-host half inherits a mature discipline … a persisted stamp, linkdead re-stamp"* — shipped for the body via `reconcileConditions` (game-time, freezes on absence); the HERD half (world-time, no far-past guard) has no host. Mixed table kept whole
- `## Open questions` Q1 (*extend `ToxinBehavior` or a sibling `PathogenBehavior`?*) — answered by the code: neither; the record carries the load under a named law, and `PathogenBehavior` exists but describes the FOOD-side organism (`Contaminable.ts:91`). Kept as spine; requirements should not re-ask it
- Overlap: this slate and `disease-design-pack.md` say the same open things almost section for section — a merge candidate for the cluster pass

### Handoff
- → `harm.md`: nothing — the `ConditionApi` correction is already in the doc (l.23–35)

### Status block
- Left: *`ContagionSpec` (routes · host range · reservoir) · the husbandry-is-immunity coupling · quarantine · the outbreak investigation · the crops-first v1 slice* → *`ContagionSpec` (routes · host range over `Clade` · reservoir) · the between-room push tick + the per-room contaminant map · the husbandry-is-immunity coupling · quarantine (promote `openNeighboursOf`) · the outbreak investigation · the crops-first v1 slice* — § Two idioms' spread half was unrepresented
- Size: a build → a build

---

## docs/slates/tails/hearth-and-larder-design-pack.md — 324 → 308 · Status PARTIAL → PARTIAL

Both `Left` items verified open: `thermal.md` l.333–336 still calls the
indoor room-ambient bump *"a follow-on"*; `compost` exists only as a bulk
material tag + the `feed` consumer (`FeedController.ts`, `Soil.ts`,
`Cultivable.ts`) and nothing composes a `CompostingMixin`. The larder
half shipped and one paragraph about it was stale.

### Cut (SHIPPED · DOCUMENTED)
- Part 2 → the second *"⭐⭐ And the economic story is real history: the machine devalues the craft"* paragraph (147–151, 5) — an exact duplicate (a strict subset) of the paragraph five lines above it, which is kept. Not a classification call; a duplicate

### Graduated
- none

### Superseded — cut
- `## Part 2` → the *"⚠⚠ Corrected by the reconciliation pass, 2026-08-11"* blockquote (115–130, 16) — by the code: it defers the mechanism to `spoilage-design-pack § Part 4` and says drying/salting *"read straight off the shipped `WetMixin` gauge"*; what shipped is `CuredMixin`'s `moisture`/`solute`, deliberately NOT on `WetMixin` (`spoilage.md § The water state`, graduated this batch). One-line note left; the scope conclusion (*this pack adds only the room and the economic story*) is preserved in it

### Kept (UNBUILT)
- `## Part 0` · `## Part 1` (the hearth; `restQuality` gains room temperature) · `## Part 2` (the room, the economic story, the victualler) · `## Part 3` (the compost heap) · `## Part 4` (the format table — see Uncertain) · `## Part 5` · `## Part 6` · `## Interop map` · `## Open questions`

### Uncertain — kept
- Part 4 table → *"Preservation recipes — dry · salt · smoke · pickle; each extends a `Freshness` clock — rides crafting + spoilage"* — three of four shipped (`dry`/`cure`/`smoke`), pickle did not; and they do not *extend a Freshness clock*, they lower `a_w` on `CuredMixin`. One row inside a one-paragraph table; kept
- Part 4 § 6 *"Spoilage is the hard prerequisite for two of the three halves"* — satisfied. Kept as sequencing context
- `## Open questions` Q3 (*does preservation change what a food IS, or only how long it lasts? Lean: both — salt fish should be a different item*) — **contradicted by the shipped shape**: a cure recipe applies a `cure: { moisture?, solute? }` block to the SAME instance (stronger-of-each-axis; `spoilage.md § The water state`), and a treated thing gets its own render line rather than becoming a different item. Kept verbatim so requirements reconcile it rather than inherit it
- See-also + Interop → two links retargeted from the deleted `spoilage-design-pack.md` to `spoilage.md` (the sentence around each link is untouched)

### Handoff
- → `thermal.md`: nothing new — it already names the indoor bump as the follow-on this slate wants

### Status block
- Left: *the indoor room-ambient bump · the compost heap + its nitrogen loop* → same, plus *`restQuality` gains room temperature · (`CompostingMixin`, `turn`) · the victualler vocation + the machine-devalues-the-craft story (Part 2)* — Part 2's own contribution was unrepresented
- Size: a wave → a wave

---

## docs/slates/tails/spoilage-design-pack.md — 237 → DELETED · Status PARTIAL → ABSORBED

⚠ Read in full before the call. Every section is either shipped and in
`spoilage.md`, superseded by the shipped shape, or a deferral that
`spoilage.md § Deliberate deferrals` already lists in the same words. Its
`Left` (six items) named NOTHING with a body section here — the body wins,
so `Left` is empty and the file is retired. Absorbed by
**`docs/subsystems/spoilage.md`**; the remaining deferrals keep a slate
home as noted per item.

### Cut (SHIPPED · DOCUMENTED)
- `## Part 0 — What it is` (29–40) · `## Part 1 — Designed to the per-object format` (44–82) — code: `Freshness.ts`, `Provision.ts:51` (Thermal beside Freshness), `Material.spoilActivationEnergy`/`waterActivity`; doc: `§ The gauge`, `§ The rate law`. *No new verbs* held (a band on `look`/`smell`; countered by acts)
- `## Part 2 — The physics (honest)` (86–116) — doc: `§ The rate law` (logistic, Arrhenius `f_T`, the `a_w` floor, the three regimes incl. freezing as a pause not a reset, the two divergences from `Wet.ts`)
- `## Part 3 — Pedagogically rich` (120–145) — the four lessons are the doc's own framing (`§ The rate law` *"the whole preservation curriculum in one number"*; the regime table's *thawed resumes where it left off*). The three item-generator hooks (college-slate evaluator questions) exist nowhere else — recoverable from git at this commit's parent; flagged below
- `## Part 4 — Interoperation` (149–182) — doc: thermal (`§ The gauge`), metabolism (`§ The ingest reach`), bulk (`§ The blend half`), crafting/cooking (`§ What cooking does to it` — the cooked material spoils faster), husbandry hand-off (`§ The gauge`, the clock-at-an-act paragraph graduated this batch), disease (`§ In the body`). Persistence-ordering caveat is `fridge-design-pack § Part 3B`, kept
- `## Part 5 — The forks, settled` (186–208) — forks 1 (`Ea` + `a_w` threshold), 3 (cooking resets by method — shipped as a RATE), 5 (never delete / never erode `Grade` — graduated this batch into `§ The gauge`) shipped and documented
- `## Part 6 — Build order note` (212–221) — history

### Superseded — cut
- Part 1 §3 *"`ThermalMixin` on perishables — compose"* + Part 5 fork 2 *"universal-and-inert on perishable-eligible `Thing`s (the `WetMixin` pattern)"* — by the code: narrowed to `Provision` after two wrong answers, gated by `lint:perishable` (`§ The gauge`). Universal-and-inert was tried (`ThingBase`, then `Prop`) and rejected
- Part 1 §3 *"the ingest toxicity rung — a freshness override ahead of the `Material` fallback"* — by `Freshness.withDose` (`§ The ingest reach`: folded at the read, never stored)
- Part 2 / Part 4 *"read straight off the shipped `WetMixin` water-activity gauge"* — by `CuredMixin` (`§ The water state` + the graduated *not on `WetMixin`* paragraph)
- Part 5 fork 4 *"Sealing → binary v1 … a modest rate reducer"* — sealing is not a rate reducer at all today (`Sealable` appears nowhere in `Freshness.ts`/`Cured.ts`); the decision that it stays binary until a consumer wants a hurdle multiplier lives in `preservation-slate § Terms` consequence 2, kept
- `## Open questions / forks` Q1 (*confirm `WetMixin` exposes a real `a_w`*) — by `CuredMixin` (it must not); Q2 (bulk/item parity) — `§ The blend half` (both halves call the same `Freshness` statics); Q3 (*hazard band → ptomaine dose: a curve, not a step*) — shipped exactly so (`Freshness.doseFor`, `§ The ingest reach`, `§ Calibration`); Q4 (calibration) — `§ Calibration`, with the ongoing tuning nobody's slate can carry

### Where the old `Left` items live now
- *the `WetMixin` saturation → `a_w` conversion* → `spoilage.md § Deliberate deferrals` (*wetness does not feed water activity*), and the graduated paragraph says the coupling must be a term, not the carrier
- *alcohol and acidity as real preservatives* → `spoilage.md § Deliberate deferrals`; acidity's design is `preservation-slate § Terms` (`Left`)
- *staling by oxidation* → `spoilage.md § Deliberate deferrals` (*not a microbial story*); rancidity's own law is `food-safety-slate § Part 10` (`Left`)
- *dish-as-ingredient* → `spoilage.md § Deliberate deferrals` (cooking's, with a negative test)
- *the hazard-band → ptomaine dose curve* → SHIPPED (`Freshness.doseFor`)
- *numeric calibration* → `§ Calibration` (fitted to the ptomaine seed); further tuning is a running-game activity, not a slate item

### Uncertain
- Part 3's three item-generator hooks (*fish at 20 °C — hours to the hazard band?* · *salt to `a_w` 0.75 — now how long?* · *frozen a month then left out — from where does the clock resume?*) are pedagogy content for the college slate's evaluator contract and are not in any doc. Judged not design-that-exists-nowhere-else (each is a direct reading of the shipped law) but the coordinator may prefer them salvaged into `college-slate`. `git show HEAD:docs/slates/tails/spoilage-design-pack.md` has them
- Inbound links from OUTSIDE my batch now dangle: `docs/slates/README.md` (the sweep's), `cooking-slate.md` (×5), `room-condition-design-pack.md` (×2), `household-design-pack.md`, `residence-ladder-design-pack.md`, `water-design-pack.md`, `docs/stewardship-doctrine.md`. Not touched — outside the assignment. Links inside my batch (fridge, hearth, disease-design-pack) were dropped or retargeted to `spoilage.md`

### Status block
- Left: *(six items)* → *(empty)* — deleted
- Size: a tail → —

---

## docs/slates/builds/disease-design-pack.md — 218 → 221 · Status PARTIAL → PARTIAL

The planner-ready restatement of `disease-slate`. Everything it designs
is open except the growth term, which shipped in a different shape than
its fork 1 chose. Grew by three lines (a longer `Left`, a longer fork-1
note).

### Cut (SHIPPED · DOCUMENTED)
- none

### Graduated
- none

### Superseded — cut
- `## Part 7 — Forks settled` → fork 1 *"Growth term → extend `ToxinBehavior` (not a sibling `PathogenBehavior`)"* (192–194, 3) — by the code: `pathogenLoad` on the `AfflictionRecord` under `progression.law: logistic`; `ToxinBehavior` is untouched and `PathogenBehavior` names the food-side organism. Struck with a one-line note → `spoilage.md § In the body`

### Kept (UNBUILT)
- `## Part 0` · `## Part 1` (the table; the two idioms; verbs; fields; seams; fault line) · `## Part 2 — ContagionSpec` · `## Part 3 — The two unifications` · `## Part 4 — Keeping it un-miserable` · `## Part 5 — Pedagogy` · `## Part 6 — Interop` · `## Part 7` forks 2–6 · `## Open questions`

### Uncertain — kept
- Part 0's blockquote *"a whole disease system is two deltas: one growth term (spoilage builds it) + one filled-in `ContagionSpec`"* — half done; and *"`null` in all 11 condition seeds"* is now 24 rows. Kept as framing
- Part 1 table row 1 *"Growth term on `ToxinBehavior` — extend (shared with spoilage)"* — superseded exactly as fork 1 was, but it is one row in a one-paragraph table; kept, and the struck fork 1 beneath it says so
- Part 3 unification 1 claims a care-derived condition score is *"now built for four hosts … the body (hygiene — room condition's `Soilable`), and the home"* — the room-condition pack is unbuilt, so two of the four are not built; the slate's own `Left` already says so
- Two links retargeted from the deleted `spoilage-design-pack.md` to `spoilage.md` (framing paragraph l.13; See-also l.18)
- Overlap: near-total with `disease-slate.md` — a merge candidate for the cluster pass

### Handoff
- none

### Status block
- Left: *`ContagionSpec` itself · the two unifications · the room-condition half of immunity · the four un-misery rules · the per-object specs* → same, plus *the push-tick spread driver + the per-room contaminant map · the medic vertical / `resolution.by` dispatcher (open Q1)* — Part 1's spread row and open Q1 were unrepresented
- Size: a build → a build

---

## Subsystem-doc edits (all in `docs/subsystems/spoilage.md`, +57 / −2)

Five INSERTS (named above under each slate's *Graduated*): the `f_aw`
ramp (`§ The rate law`), clock-at-an-act + Grade untouched (`§ The
gauge`), per-module payload fields (`§ The blend half`), curing preserves
the contamination + not on `WetMixin` (`§ The water state`).

⚠ One EXISTING-sentence fix, per the skill's *statement the code proves
false* clause: `§ Fermentation is the one collision to watch` named
`FermentingMixin` twice; `Vat.ts:35` records that this branch renamed it
to `MaturingMixin` (composition at `Vat.ts:38`), and `maturation.md` l.48
says the same. Both occurrences → `MaturingMixin`. Nothing else in the
doc was reworded.

## Calibration notes for the coordinator

1. **The only ABSORBED call in the batch is the one the assignment
   flagged as likely.** `spoilage-design-pack` had a six-item `Left` and
   not one item had a body section — every item was a `§ Deliberate
   deferrals` line restated. The *body wins* rule emptied `Left`
   honestly; I did not round it to a stub because no OTHER SLATE owns the
   remainder — the subsystem doc does.
2. **The hardest calls were kept-but-contradicted.** Hearth Q3 (*salt fish
   should be a different item*) and fridge Part 3A (*humidity as `a_w` on
   the container's atmosphere*) both describe mechanisms the shipped
   `CuredMixin` made false. Kept verbatim, listed under Uncertain.
3. **Preservation's `Left` shrank by three and grew by two**, and every
   change is body-derived: *smoking* shipped; *victualler* and *wetness
   coupling* had no section; `f_pH` and the sealing decision had sections
   and no `Left` entry.
4. **One duplicate paragraph** (hearth, l.147–151) was cut as a duplicate,
   not classified — recorded so the reviewer can see it was not a judgment.
5. **Six files outside the batch link to the deleted pack.** Left for the
   sweep; listed above.
