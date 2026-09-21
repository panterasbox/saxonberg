# Slate-compaction pass — ranching batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `ranching.md` only.
Line numbers below are the ORIGINAL file's. Original saved under the
scratch dir `ranching/orig/` for diffing. Code was verified in
`packages/content/trade-ranching/**` (the pack: `Livestock.ts`,
`WorkingAnimal.ts`, `Herdbook.ts`, `HerdRegistry.ts`, `lib/Producing.ts`,
`lib/Handled.ts`, `lib/HeadSeed.ts`, `behavior/herds.ts`, `behavior/raids.ts`,
the eight `cmd/ranching/*.yaml` views, the five `__tests__`),
`packages/content/trade-farming/src/location/Field.ts` + `src/lib/Sward.ts`,
`packages/server/src/mud/lib/metabolism/Metabolic.ts`,
`lib/thermal/ThermalRegulation.ts`, `lib/creature/{Creature,KeptAnimal}.ts`,
`lib/husbandry/{Handling,Feeder,Bonded}.ts`, `lib/species/Organism.ts`,
`platform/idea/species/Species.ts`, the platform `cmd/bulk/feed.yaml`, the
campus farm (`eternal-university/content/world/eternal/campus-farm/**`),
and `docs/requirements/return-leg-requirements.md` (still a requirements
doc — the midden is a description, nothing produces muck).

Four findings a reviewer should know first:

1. ⚠⚠ **Nothing grazes, and nothing feeds a head.**
   `Field.swardGrazingDemandPerGameDay()` (`trade-farming/src/location/Field.ts:418`)
   sums `grazingDemandPerGameDay()` over the field's occupants — and **no
   class anywhere in `packages/` declares that method** (the only other
   hits are the field's own call and `Sward.test.ts`, which overrides the
   field hook with a constant). `Livestock` does not implement it. The
   platform `feed` verb (`cmd/bulk/feed.yaml`) requires a `CultivableMixin`
   target — it works compost into a BED, it does not feed an animal. And
   `Livestock` composes no `BehavedMixin`, so neither the `feeds` nor the
   `eats` brain can run on a head (`WorkingAnimal` got a brain from
   `KeptAnimal` in the pets build; `Livestock` did not). So the sward
   mechanics shipped (residual/recovery, `mow`, `cycleGrazedNitrogen`,
   poaching — all tested), the partition cascade shipped
   (`Metabolic.partitionFlesh`), and **the intake that joins them does
   not exist**: the feed loop, the winter-feed budget, "a herd eats
   whether or not it produces", and grazing-in-place are unwired. The
   slate marked all of these DECIDED; `Left` now names them, and a
   factual ⚠ was inserted at `ranching.md § Condition` (below); the
   sibling note for `soil.md § The sward`'s *graze* row is in Handoff.
2. **The return leg is a live requirements doc, not code.**
   `docs/requirements/return-leg-requirements.md` (2026-09) surveys the
   byre's `muck` slot, the midden, the slurry pit and compost as *"almost
   all of it, inert"*. The slate's *nutrients* coupling (manure → soil) is
   therefore half-shipped: grazing-in-place is a tested method on `Field`
   (with no grazer, finding 1); muck from a byre is that doc's. Noted in
   Uncertain; not duplicated into `Left` beyond the pointer.
3. **Two of the slate's DECIDED sections are now contradicted by shipped
   decisions** and are kept under Uncertain: § The frame's table (pet =
   `Character`; the Creature/Character split IS the pet/livestock split —
   `pets.md` rejected pet-as-`Character` and `KeptAnimal` extends
   `Creature`; `ranching.md § Three ROLES` replaced the class split with
   roles) and § The deliberate divergences' *"the animal can go feral and
   leave"* (`pets.md` l.75: *difficult, not feral*).
4. **The pets build moved the collie.** `WorkingAnimal` is now
   `HandledMixin(KeptAnimal)` (`WorkingAnimal.ts:76`; `pets.md` l.23) and
   its `herds` brain had never run before that. `ranching.md § Three
   ROLES` still says *"`WorkingAnimal` adds nothing but a name and an
   absence"* — true when written, false now. A one-line ⚠ pointer was
   inserted after that sentence (my write list); no existing sentence was
   edited.

---

## docs/slates/builds/ranching-slate.md — 946 → 672 · Status PARTIAL → PARTIAL

The slate is the animal half of the living-world family; the farmstead
build took the keeping (record · boundary acts · handling · taps · carcass
· hazards) and the pets build re-homed the collie. What remains is the
feed side the slate believed shipped (nothing grazes or is fed), the
paddock move, breeding, bees, the skill axis, and the Tier 3 economy.
410 lines cut; 124 lines of pointer notes left in their place (every cut
heading survives with a note); the status block grew by 12.

### Cut (SHIPPED · DOCUMENTED)
- the second status block's *Session 1* / *Session 2* paragraphs (21–33, 13) — history: the five conventions, energy partitioning, pasture-is-a-field and the paddock dial each have their own section below and their doc homes. ⚠ The block's FIRST paragraph (14–20) is kept whole: it is a stale status stamp *and* the slate's only framing sentence (*ranching is the economic half of owned animals…*), one paragraph, so the paragraph rule wins over the one-status-block rule
- `> ⚠⚠ SEAM NOTE for the build (2026-09-03) — leave the carcass open` (35–55, 21) — code: `ButcherController.ts`, `Species.ButcheryYield`, `trade-ranching/…/thing/{tallow,hide,bone}.yaml` + `material/food/animal-fat.yaml` (the fat precursor the note said did not ship), `carcass-rows.test.ts`; doc: `ranching.md § What the carcass opens onto` (named materials, condition-scaled, the `mint` catch + the row-walking test), `§ slaughter` (*finish it before you kill it* — culling as a decision). No knacker/tanner/chandler was authored (no `tan`/`render` verb anywhere; `organic/leather` still has no source) — that is `rendering-slate`'s. 5-line note left
- `## The five shared conventions` → `### 1. Where identity lives — one density dial` body (135–167, 33) — code: `HerdRegistry.ts` (`HerdRecord`, the sparse `overlay`), `HeadSeed.ts` (`(herdId, index)` seeding), `DraftController.ts` / `ReturnController.ts`, `Livestock.ts` header (*there is no `Herd` class and there never will be*); doc: `ranching.md § The individual is the base case (D19)`, `§ The herdbook (D20, D79, P4)`, `§ Draft and return (D21)`. Heading + note left
- `### 2. Custody — ChattelMixin on the Creature stack` body (169–186, 18) — code: `lib/creature/Creature.ts:134` (`ChattelMixin(BrandedMixin(…))`), `HerdRecord.holderRef`; doc: `ranching.md § Ownership, and the two one-liners (D22, D98)` (the one composition line, rustling, branding), `pets.md` (the `CompanionMixin` retirement). Heading + note left
- `### 3. The clock — nothing freezes but the body you inhabit` body incl. the far-past-guard blockquote (188–224, 37) — code: `Metabolic.ts:633` (`elapsed > MAX_REASONABLE_GAP_SEC && !this.integratesLongAbsence()`), `:686–697` (ownership read through the chattel stamp); doc: `husbandry.md § The clock rule — and why the far-past guard is excluded`, `ranching.md § Condition` (*the far-past guard is narrowed to bodies nobody owns*). Heading + note left
- `### 4. Yield — two shapes, not four systems' worth` body (226–235, 10) — code: `trade-ranching/src/lib/Producing.ts` (`TapState`, expire/accrue/continuous, `seedTaps`), `ButcherController.ts`; doc: `ranching.md § The taps (D25, D93)` (*copy `Stock`'s reset sweep; never its `par`*), `§ slaughter`. Heading + note left
- `## The automation ladder — and the one thing it can't do` body (293–319, 27) — code: `trade-ranching/src/behavior/herds.ts` header (the dog as the fourth rung; *automation maintains your assets and cannot maintain your relationships*); doc: `ranching.md § Working animals (D40–D42)` carries the ladder, the rung and the principle verbatim. The rung table's open rungs (hired hand · script · metered compute) are `farming-slate § Maintenance & the automation ladder`'s kept section; the compute note is `property-slate`'s. Heading + 8-line note left
- `## The loop` → `### Still ranching-specific, still open` → *Butchering / slaughter* (404–405, 2) — doc: `ranching.md § slaughter (D28)` (*sober and complete … make waste the thing that feels bad*); *Predators vs the herd* (406–407, 2) — code: `behavior/raids.ts`, `hazards.test.ts § the fox kills more than it takes (D50)`; doc: `ranching.md § Hazard`. Two struck one-liners left; the breeding bullet KEPT
- `## Land use — pasture is a field` → the three-row use table + the D7 correction blockquote (413–437, 25) — code: `trade-farming/src/lib/Sward.ts` (the same table in its header; *no `use` enum*), `MowController.ts`; doc: `soil.md § The sward, and the land uses nobody declares (D7)`. 4-line note left, flagging that the *graze* row has no mouth (finding 1); the hay paragraph (439–444) KEPT
- `### The soil consequence — why rotation emerges` body (446–464, 19) — code: `Field.ts:436–470` (`onSwardIntegrated` → `cycleGrazedNitrogen`: *fertility follows the mouths, and this is the line that makes it true*; `mow`/crop export), `trade-farming/src/lib/__tests__/rotation.test.ts`; doc: `soil.md § The sward (D7)` (*grazing and `mow` are the same draw … that difference is where the nitrogen goes*). Heading + note left; the note says the in-place branch never fires in play (finding 1)
- `### The move is a read, not a timer` body (516–525, 10) — code: `Sward.ts:42–52` (*move at residual, return at recovery — a read rather than a timer*; growth varies with rain/season/stocking), `SWARD_BANDS` + the band phrases; doc: `soil.md § Residual and recovery (D9)`. ⚠ The sward-stick instrument read is not built and the note says so. Heading + note left
- `### Failure is two-sided in both directions` + `### Every failure is a slope, never a cliff` (527–548, 22) — code: `Sward.ts` (`grazed-out` = overstocking, `ahead-of-them` = understocking; *a recovery-rate penalty, never a dead field and never a dead herd*); doc: `soil.md § D9` (*understocking is a mistake too … two faults pointing opposite ways, and the bands say which*). One merged heading + note left
- `## The farming coupling` → *One catalog shape* (624–628, 5) — code: `trade-farming/content/stuff/idea/species/plantae/**` (25 rows), `trade-ranching/content/stuff/idea/species/animalia/**` (6 rows); doc: `race.md`; farming's Q4 was resolved the same way (the husbandry ledger). The *peace-lily is documentation-only* caveat is stale. 3-line note left
- `## Pedagogy` → *Two things fit the engine's shipped conventions* lead-in + the BCS-band bullet + the records-earn-identity bullet (647–662, 16) — code: `Livestock.stockmanRead()` (*both are BANDS … a precise score costs an act*), `HandleController.ts`; doc: `ranching.md § handle — precision costs an act (D24)`, `§ Draft and return` (*identity is earned by being measured … becomes the implementation*). Note left; the intro + discipline table KEPT (Doctrine)
- `## Pedagogy` → *The deep payoff worth building toward* (`R = h²·S / L`) (664–669, 6) — doc: `ranching.md § Breeding` (*the generation interval `L` … makes animal breeding a different lesson*); the same paragraph is the kept § Breeding's *Axis 1* closing. One-line pointer left
- `## Breeding` → `### What shipped, and what it is allowed to claim` body (679–704, 26) — code: `BreedController.ts` (writes `overlay[index].served`; the daylength refusal at l.88–94), `HerdRegistry.ts` (`HeadOverlay.served`, `bornAt` read never written); doc: `ranching.md § What breed does: it writes SERVED` carries the three traps blockquote (announced-not-modelled · heredity claimed and absent · born adult) and `§ Breeding (D26)` the photoperiod season. Heading + note left; everything from `### ⭐⭐ The two axes` on is KEPT verbatim
- `## Open questions` → *Where yield lives* (816–817, 2) — resolved: `ProducingMixin` on the animal (`Livestock.ts`, `ranching.md § Three ROLES` verb table); *Slaughter tone* (828, 1) — `ranching.md § slaughter`; *Land dependency* (829–831, 3) — the stock rides `Creature`'s chattel stamp, the ground is `trade-farming`'s (`trade-ranching/package.json` dependency); *Sequence with farming* (832–837, 6) — shipped riding the farmstead build. Each left as a struck one-liner (open questions are spine)
- `## Open questions` → the *Disease* entry (808–815, 8) — already struck and pointing at `disease-slate`; its two *findings that land here* (husbandry-is-immunity; density is transmission) are that slate's `Left`. Under the two-slates rule the owner keeps them; a 3-line pointer left
- `## Risks & opens` (922–946, 25) — plan artifact of the farmstead build: 1 settled; 2 the manifest dependency is declared (`package.json` → `@saxonberg/content-trade-farming`; `content-packs.md`: *`dependsOn` is derived from `package.json`*); 3 the prefix check shipped (`HerdRegistry.ts:249, 390`, `ranching.md § Read-side verification is mandatory`); 4–5 history (W1 done; bees cut in the predicted order — `ranching.md § Not built: bees`); 6 `archetypes/byre.yaml` header *reported, never enforced*; 7 `SWARD_BANDS` + the condition/handling bands shipped; 8 D79 record ✓, D82/D74 are AC 40/43 in the kept Tier 3 block. Heading + 8-line note left

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## The core model — energy partitioning, not the limiting factor` (337–371, 35) — code: `Metabolic.ts:717–741` (`partitionFlesh` runs LAST in the slice; *production dies before condition does*), `ThermalRegulation.ts:324–328` (cold stress spends satiation), `Producing.ts:143–156` (the tap rate scales with `flesh`); `ranching.md § Condition — flesh (D24, P7)` carried the mechanism and the ordering but NOT the why (*if ranching copies the limiting factor it is farming with legs*; two optimisation idioms on one reconcile engine) → **inserted at `ranching.md § Condition`** as a closing ⭐ paragraph (12 lines). Heading + note left. ⚠ The section's *a herd eats whether or not it produces* and *a pregnant animal partitions to the fetus* are NOT shipped — the first because nothing feeds a head (finding 1; the note says so), the second is § Breeding's
- **A factual insert, not a slate graduation:** `ranching.md § Condition` also gained a ⚠ paragraph (10 lines) recording that **the cascade has no input** — `Field.swardGrazingDemandPerGameDay()` sums a method no class declares, `feed` targets a `CultivableMixin` bed, `Livestock` composes no `BehavedMixin` — and pointing at the slate's `Left`. Written because the section above it says *the winter-feed budget would never bite* as though a budget existed
- **A second factual insert:** `ranching.md § Three ROLES`, after *"`WorkingAnimal` adds nothing but a name and an absence"* — a 4-line ⚠ that since MR !257 the collie is `HandledMixin(KeptAnimal)` (`WorkingAnimal.ts:76`) with the bond, a name and `BehavedMixin`, pointing at `pets.md`. The existing sentence was left as written (it describes the ranching build's decision correctly); this is the *fix a statement the code proves stale, by insert* case

### Superseded — cut
- `## The frame` → paragraph 1 + the Pet/Livestock table (84–93, 10) — by the code and two docs: the individual is the base case (`ranching.md § D19` quotes and refutes this exact sentence), a pet is a `Creature` rung (`KeptAnimal.ts:81–95`; `pets.md` l.63–66: *making a pet a `Character` instead was also rejected*), and the split is roles on capabilities (`ranching.md § Three ROLES`). 5-line note left; paragraph 2 KEPT (see Uncertain)
- `### Paddock = room, not slot` (576–583, 8) — by the code: `Field extends CartesianLocation` composes `SoilMixin` + `SwardMixin` directly (no `Floor` surface-bulk carrying the crop), and the mouths are the field's occupants read by duck-typed `grazingDemandPerGameDay()` (`Field.ts:418–429`) — which nothing declares. Heading + note left
- `## Gap map — verified against the code (2026-07-30)` (790–802, 13) — by the shipped state: custody ✓ (`Creature.ts:134`); individual persistence ✓ in a different shape (the head persists as the RECORD — `HerdRecord.overlay`; the object is transient, `Livestock.ts` header); soil-on-a-place ✓; **maturation** ✓ as derived age + `Species.ageCurve` life stages (`Organism.getLifeStage`, `Species.massAt`/`lifeStageAt`, `DraftController.ts:138 setAge`) — the row's *no driver* is stale; reproduction — `breed` → SERVED only; yield tap ✓ `ProducingMixin`; genome ✗ (still absent — `Seed.ts:7`, `Clade.ts:20` name it deferred); fear axis ✗ (`pets-slate` `Left`); brains — `follows.ts` (kernel), `herds.ts`, `raids.ts` ship, no flee brain. Heading + 9-line note left
- `## Open questions` → `### Dependency — the time-parameterised weather resolve` (839–845, 7) — by `WeatherApi.precipitationBetween(t0, t1, locality)` (`weather.md § precipitationBetween`, *a sum, not a sample*; `Soil.ts` integrates it). Heading + note left

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the first paragraph of the old status block (framing — see Cut, item 1) · *See also* (all 17 links resolve; none pointed at a cut section)
- `## The frame` → paragraph 2 (see Uncertain — contradicted)
- `## The five shared conventions` → the heading + intro (`husbandry.md` l.17 links to this anchor as *governing*; the anchor holds) · `### 5. One care model, three outputs` whole (Doctrine, below)
- `## The deliberate divergences` — one table, kept whole (see Uncertain — contradicted)
- `## The loop — three cadences` — one list, kept whole: daily ✓ (`milk`/`gather`/`shear`, `stockmanRead`), **weekly `move herd <paddock>` ✗** (no verb, no paddocks, no grazer), seasonal mixed (`breed` ✓ served-only · cull ✓ `butcher` · sell ✗ no market · shear ✓ · *lay in winter feed* — `mow`/`HayBale` ship, nothing eats hay) · `### The year's spine — the winter-feed problem` whole — unbuilt: no intake, so no budget; ⚠ `soil.md` l.378 (*why the feed budget exists*) reads as if one did
- `## The loop` → *Breeding at scale* bullet (→ § Breeding)
- `## Land use` → the hay paragraph (439–444) — `HayBale` + `mow` ship, the *only form of grass you can keep until February* half has no consumer · `### The gate you left open` whole — no herd moves; `homeExtent` vs containment IS straying (D95, `ranching.md § Two sources`) but nothing produces the disagreement; a gated `Field` exit exists only as the holding's `LotGateExit`
- `## Paddock granularity` → intro + the dial blockquote · `### The clock bounds the useful range` (calibration for the unbuilt move; the 7–14 game-day residency figure is nowhere in the docs) · `### The automation valve` (no hired hand moves stock; the `herds` dog brain quiets, it does not move — `herds.ts:20–24`; the utilization penalty of a cadence has no code) · `### What bounds subdivision` (no fence object that wears — `yard-wall.yaml` is a description; the compute allowance is inert; the hedge is `farming-slate § Pests, thorns`'s). The nearest shipped subdivision is `plot` (a `Field` out of a holding's yard — `soil.md § plot`), not a paddock split
- `## The farming coupling` → paragraphs 1–3 + the numbered couplings (see Uncertain — mixed) · *The shared genome* paragraph (two-slates overlap with `farming-slate § Genetics & breeding`, kept in both — no `Genome`/`allele`/`heritab` anywhere)
- `## Breeding — everything we know` → `### ⭐⭐ The two axes` (both axes; the seam table's four rows verified: `HeadOverlay.served` written by `breed`, `HeadOverlay.bornAt` read never written, `HerdRecord.foundingMeanAgeDays`, `Species.BreedingSpec.gestationDays`; no `dam`, no `calved`) · `### ⭐ Records are the selection game` · `### Scope note` — verbatim
- `## Open questions` → *Breeding model* · *Herd UX* (see Uncertain for the halves the code answered) · `### Deferred to a running game` (residual thresholds are `Sward.ts` constants; the cadence penalty and feed-conversion constants have no code at all — the deferral still names real gaps)
- `## Tier 3 criteria, salvaged from the retired farmstead plan` — the whole block (AC 36–47) + the AC 41–42 paragraph (see Uncertain)

### Doctrine — kept, labelled
- the first paragraph of the old status block (14–20) — the slate's thesis sentence (*ranching is the economic half of owned animals*), wrapped in a stale stamp; kept as the framing
- `## The family placement [DECIDED]` — the Grange/Wardens placement (`guild-slate`'s), the production-family convention set, *one shared substrate under two distinct experiences* (realised: `pets.md` — `KeptAnimal` over the ranching substrate)
- `### 5. One care model, three outputs` — the family thesis + the resistance column. ⚠ The resistance column is `disease-slate`'s `Left` (*the husbandry-is-immunity coupling*), not built; the *pet-only: attention + un-delegable outcome* line shipped as `pets.md`'s bond (regard × handling) and the feeding ladder
- `## Pedagogy` → intro + the six-discipline table — lens-1 doctrine; of the six, grazing management and nutrient cycling have shipped mechanism (with no grazer), animal nutrition / population dynamics / farm economics have none, epidemiology is `disease-slate`'s
- `## Scope guardrails` — four rules the build honoured (no `Herd` class; one `livestock.yaml` KIND row; no new module categories; yield is a transform) and the follow-on still needs (*build the genome once*)

### Uncertain — kept
- `## The frame` → paragraph 2 — **contradicted by a shipped decision.** *The Creature/Character split IS the livestock/pet split … pets require the belief / regard / sensor / engaged stack* — `KeptAnimal` (`lib/creature/KeptAnimal.ts:81–95`) composes exactly that stack on `Creature`, and `WorkingAnimal` now extends it; `pets.md` rejects pet-as-`Character`. The paragraph's second half (*domesticability is one axis wild → pet → livestock; fear-baseline zero*) is `pets-slate`'s Wave 2 (the fear/threat axis + the wild taming encounter) and is unbuilt. One paragraph, kept whole; requirements for the fear axis must not inherit the tier split
- `## The deliberate divergences` — **contradicted:** row 3's *the animal can go feral and leave* vs `pets.md` l.75 *it becomes difficult, not feral*. Row 3's ranching half (*material loss, up to death, mitigable by wages*) has no path either: an unstamped drafted head is not fed and, being unstamped, still gets the 4-hour far-past guard (`Metabolic.ts:633`, `integratesLongAbsence` reads `isChattel && isStamped()`; no ranching caller stamps a head — grep `ChattelApi.stamp` / `.stamp(` finds forestry, tailoring, harvest only), so it neither eats nor starves across an absence. Rows 1–2 shipped (no bond stat on livestock — `ranching.md § Working animals`; one KIND row). Rows 4–5 are property doctrine. One table, kept whole
- `## The loop` → *Herd UX* — *Demotion back down is still open* is answered: `return` folds the head into the overlay and destructs it (`ranching.md § Draft and return`). *What `look` shows for an aggregate herd* is partly the herdbook row's `details: numbers` (`campus-farm/thing/herdbook.yaml`) and the room prose; count/split/pen have nothing. Kept because the entry is one bullet
- `## Open questions` → *Breeding model* — the *likely answer* (compress maturation: a game-cow matures in one game year) was taken: `bos/taurus.yaml` authors `ageCurve.matureAt: 300`, `gestationDays: 120` (vs ~283 real). *How much of `R = h²S/L` lands in v1* is still the open half. Kept whole
- `## The farming coupling` → paragraphs 1–3 — mixed: the *nutrients* coupling's grazing-in-place branch is a tested method (`Field.cycleGrazedNitrogen`) with no grazer to call it; its byre half (muck → midden → field) is `docs/requirements/return-leg-requirements.md`'s (a live requirements doc: *almost all of it, inert*; the midden is a description); the *feed* coupling has no code at either end (nothing feeds a head; no feed product — `hay.yaml` is a material and a bale, and no animal's metabolism accepts it). *Both halves share the `Business` + labor wrapper* — the campus farm's `farm-unit.yaml` is a `Business`; no ranch hand position exists. Kept whole; `Left` names both halves
- `## Tier 3 criteria` — AC 36 is probably met by the forestry build (`forestry.md § The panel — the coppice`: *the rotation is the shipped polycarp cycle, ONE GAME YEAR*; the three-way contest not verified); AC 37–39 (saltern, peat, bog) — no `saltern`/`peat` row or class anywhere; AC 40 (profits à prendre) — nothing; AC 43 — the record is a document a buyer could read through the register, no premium mechanism; AC 44–47 — nothing. The closing paragraph's *AC 41–42 are this MR's and are met* I did not verify (no check made for a condition-reading working or a `quiet` effect); kept as written
- *the rendering chain this build must leave open* (the old `Left`) — the obligation was discharged (named materials; nothing authored past the carcass) and the chain is `rendering-slate`'s (Status UNBUILT, its own `Left` names *the carcass → named-materials seam in ranching*). Dropped from `Left`; that slate's seam line is now stale in the other direction and is the cluster pass's
- *bees* and *the training/skill axis* (both in `Left`, old and new) have **no body section in the slate** — the slate never had one. Their design lives in `ranching.md § Not built: bees (D34–D39)` (the colony as *the herdbook with the individual end amputated*; what ships: the `Apis mellifera` row + clover; what does not: hive, pollination on `fruitSetCount`, forage range, honey character, swarming; *AC 14 not met*) and `§ Working animals` (*the skill axis is not built … a working animal is an animal with a transcript; belongs beside pets*). A subsystem doc carrying an unbuilt design is the inverse of this pass's move; I left both where they are (moving doc text into a slate is not a cut) and kept the `Left` items so the backlog stays honest. The coordinator may want the two paragraphs lifted into the slate at the cluster pass; `pets-slate`'s `Left` also names training-as-transcript
- Overlaps for the cluster pass: the genome ↔ `farming-slate § Genetics & breeding` (kept in both) · the automation rungs ↔ `farming-slate § Maintenance & the automation ladder` · disease / resistance ↔ `disease-slate` · the carcass chain ↔ `rendering-slate` · the fear axis + training-as-transcript ↔ `pets-slate` (its `Left` has both) · muck ↔ `return-leg-requirements.md` · profits à prendre / agistment ↔ `property-slate`, `stewardship-slate`, `contract.md`

### Handoff (belongs in a doc outside my list)
- → `soil.md § The sward, and the land uses nobody declares (D7)`, directly after the existing ⚠ paragraph about the *crop* row — the sibling fact for the *graze* row, verbatim:

  > ⚠ **The *graze* row has no mouth yet either** (verified 2026-09-19).
  > `Field.swardGrazingDemandPerGameDay()` sums `grazingDemandPerGameDay()`
  > over the field's occupants, and no class in the tree declares that
  > method — `Livestock` included; `Sward.test.ts` overrides the field hook
  > with a constant. So in play the sward is drawn down by `mow` alone,
  > `cycleGrazedNitrogen` never runs, and *fertility follows the mouths* is
  > true of the code and not yet of the game. The grazer is
  > [ranching-slate](../slates/builds/ranching-slate.md)'s first `Left` item.

- → `soil.md § Winter (D10–D12)`, l.378 — a clause, not a paragraph: *"A grazed paddock in January still goes down, which is why the feed budget exists"* presumes a feed budget; there is none (no intake path). Suggest appending *— once anything eats* or a pointer to the same slate item
- → `pets.md` — nothing to insert; noting only that `pets.md` l.63 cites *`WorkingAnimal`+`Handled`* as the idiom and the class now composes over `KeptAnimal` (its own l.23 says so) — consistent, no action
- → `forestry.md § The panel — the coppice` — a question, not a paragraph: whether the shipped panel satisfies AC 36's *a single stand cannot simultaneously satisfy charcoal, mine timber and winter firewood — the contest is observable*. If yes, AC 36 can leave the ranching slate's Tier 3 block at the next pass
- → `content-packs.md § trade-ranching` — no correction found; the README/manifest match the code. (The husbandry ledger's `bone.yaml`/phosphorus note against `ranching.md` l.290 stands: `SoilMixin` has no phosphorus reserve; I left that sentence alone because it is not a slate cut)

### Status block
- Status line: unchanged in substance; added *⚠ the intake side is unwired — nothing grazes (no class declares `grazingDemandPerGameDay`) and nothing feeds a head* and the ledger pointer
- Left: *breeding (gestation · birth · heredity; nothing writes `bornAt`) · bees — the hive, pollination, forage range, swarming (AC 14 unmet) · the training/skill axis (working-animal transcripts) · disease · herd UX · the rendering chain this build must leave open (knacker → tanner → chandler — `organic/leather` ships and nothing makes leather)* → *the feed loop — grazing demand on the animal, a way to feed a head, hay as the stored form, the winter-feed budget · the paddock move — `move herd`, paddocks as subdivided fields, the open gate resolved at reconcile, fencing as a bound, the hired-hand cadence with its utilization penalty · breeding (gestation · birth · heredity; nothing writes `bornAt`, no `dam` column; the husbandry-wide genome, also kept in farming-slate) · the nutrients coupling's byre half — muck → midden → field (owned by `return-leg-requirements.md`) · bees — the hive, pollination, forage range, swarming (AC 14 unmet) · the training/skill axis (working-animal transcripts; beside pets) · disease (owned by disease-slate — the husbandry-is-immunity coupling) · herd UX (what `look` shows for a herd; count, split, pen) · the Tier 3 criteria (AC 36–47 — the record read by a buyer, agistment and stud service over contracts, a market day, joint capital, profits à prendre)*. The body wins: six items were listed, nine open designs were in the body. ⚠ **Two items are NEW to the list because the slate marked them DECIDED and they did not ship**: the feed loop and the paddock move. One item left: the rendering chain (discharged; `rendering-slate`'s)
- Size: a build → **a build** (breeding alone is one; the feed loop + the paddock move another)

---

## Inserts into subsystem docs (all `ranching.md`, +28 lines)

- `§ Condition — flesh (D24, P7)`, after *"Read through the chattel stamp, synchronously, on the reconcile path."* — **Why a cascade, and not farming's limiting factor** (12 lines) ← ranching-slate § The core model; then **⚠ The cascade has no INPUT yet** (10 lines) — a factual insert (finding 1)
- `§ Three ROLES, not three kinds of object`, after *"the absence is the point."* — the collie's re-parenting since MR !257 (4 lines + blank) — a factual insert (finding 4)

No existing sentence in any subsystem doc was edited.

## Findings outside this batch (not acted on)

- `ranching.md` never mentions the **`Herdbook` fixture** (`trade-ranching/src/thing/Herdbook.ts`) — the row that affords `draft` and files the herd get-or-create at `postRegister` (*you fill in the form; the society keeps the book*; the campus farm's `herdbook.yaml`). The doc's `§ Where it is proved` and `§ The herdbook` describe the record and the register but not the door into them. SHIPPED · UNDOCUMENTED, but it was never in the slate, so it is not this pass's graduation — a doc-rot note for the coordinator (in my write list, so I can insert it on request; ~8 lines)
- `ranching.md` l.290 *bone goes back into the soil as phosphorus* — no phosphorus reserve exists (the husbandry ledger flagged this already)
- `rendering-slate` `Left` still names *the carcass → named-materials seam in ranching* — that seam shipped (`animal-fat`, `tallow`, `hide`, `bone`, `stew-meat`); the cluster pass should re-stamp it
- `soil.md` l.378 presumes a feed budget (Handoff above)
