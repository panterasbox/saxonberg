# Slate-compaction pass — husbandry batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `husbandry.md` ·
`soil.md`. Line numbers below are the ORIGINAL file's. Original saved
under the scratch dir `husbandry/orig/` for diffing. Code was verified
in `packages/server/src/mud/lib/husbandry/**`,
`packages/content/trade-farming/**`, `packages/content/trade-ranching/**`,
`packages/content/hearts-delight/**`, `packages/content/water/**`,
`packages/content/arcana/**` and the platform command views.

Four findings a reviewer should know first:

1. **No verb sows a FIELD.** `plant`/`sow` (`platform/cmd/inventory/plant.yaml`)
   require a `CultivableMixin` target; `Field`
   (`trade-farming/src/location/Field.ts`) composes `SwardMixin(SoilMixin(…))`
   and **no plant slot** — its own header says so. `Improvable.isPlantable`
   (D54, *"newly plotted ground is NOT plantable"*) has **no caller** outside
   its own class; `farmstead.dirty.wire.test.ts` never plants. So the sward
   (pasture / hay / graze) shipped and the **arable crop in a field — the
   slate's aggregate density — did not**: crops grow in pots and beds only.
   `soil.md § The sward`'s *crop — a sown crop* row and `smallholding.md`'s
   *"not plantable until cleared"* both read as if a path existed. A short
   factual note was inserted at `soil.md § The sward` (below); the land
   model's aggregate-density paragraphs are KEPT and `Left` names it.
2. **The `farms` production brain has no content consumer.**
   `trade-farming/src/behavior/farms.ts` exists (tested), but no row names
   `/trade/farming/behavior/farms`: `farm-hand.yaml` runs `/lib/behavior/consigns`,
   hearts-delight's farmer runs `introduces` + `idles`. ⚠ `content-packs.md`
   l.1167 says the farm-hand is *"on the pack's own `farms` brain"* — false
   today; flagged for the coordinator (outside my list). The automation
   ladder is therefore still open even though both of its stated
   prerequisites (the employment engine, a production brain) exist.
3. **Stage B shipped in a different shape.** `hearts-delight` is a
   **static authored farm, not a managed one** (its README: content-only,
   no `src/`, *"a source node rather than a faucet"*); the player's own
   ground shipped as `plot` on a holding (`soil.md § Field`), not spherical
   fields; the B4 switchover did NOT happen — the trade-farming packing
   floor + Wen still stand at target through the distribution sweep, and
   the README calls the counter *"a faucet … honest precisely because it
   admits to being one"*. Waves B0/B2–B5 are SUPERSEDED; B1's district
   plat (hectare-band raw lots) has no shipped equivalent and is KEPT under
   Uncertain.
4. **Two of the slate's doctrine sections are now contradicted by shipped
   decisions** and are kept verbatim under Uncertain: *Magic as
   pharmacology* (*"no magic engine word"* — `magic.md` shipped an explicit
   Effect substrate + `CasterMixin`; potions ride `PotionMaterial` carrying
   a spell, `magic-items.md § Potions ride the MATERIAL`) and the growth
   model's **GDD** (maturity accrues by *good time*; `cold` is a fifth
   limiting factor — no heat integral).

---

## docs/slates/tails/farming-slate.md — 1239 → 950 · Status PARTIAL → PARTIAL


The slate is the living-world family's design surface; three builds took
its first two phases (houseplant → smallholding → farmstead) and Stage A
of the third. What remains is genuinely the depth: genetics, the
environment tier, the automation ladder, the compound/brewing layer, the
teaching seam — plus one thing the slate believed shipped and did not
(the arable field crop). 471 lines cut, ~180 lines of pointer notes left
in their place (every cut heading survives with a note, per the
*Heading + note left* convention).

### Cut (SHIPPED · DOCUMENTED)
- the three narrative status blocks + the *Revised 2026-07-31* block (13–76, 64) — history: *STAGE A SHIPPED*, *PARTLY SHIPPED*, the four-change revision note and *Status: design captured, not built*. Everything they announce is in the body's own sections or in `husbandry.md` / `smallholding.md` / `soil.md`; the canonical block is kept and re-stamped
- `## The clock` → *Verified: `DEFAULT_SCALE` 12× … the table … the consequence … "This retires open question 1's lean"* (220–238, 19) — code: `WorldClockApi` default scale, `DefaultCalendar`; doc: `time.md`, `husbandry.md § Calibration` (*"Under the 12× clock one real day is 12 game days, so every threshold is calibrated against the login, not the game-day"*). Note left
- `### The rule: design cadence around the login, not the game-day` heading + body (239–247, 9) — doc: `husbandry.md § Calibration` (*the reserve is sized against the login*; *a daily player who waters at each login never leaves `healthy`*). Folded into the section note; heading removed
- `## The clock` → corollary 1 *Growth runs on world time … you don't grind, you return* (250–253, 4) — code: `GrowingMixin.reconcileGrowth` (no far-past guard, no linkdead freeze); doc: `husbandry.md § The clock rule — and why the far-past guard is excluded`
- `## The clock` → corollary 3 *Ranching inherits a correction … stock moves every 1–3 days impossible* (257–259, 3) — code: `trade-farming/src/lib/Sward.ts` (the residual); doc: `soil.md § Residual and recovery (D9)` (*moving stock is a READ, not a timer*). Replaced by a one-line pointer bullet
- `### Houseplants — farming's on-ramp` body (350–373, 24) — code: `platform/thing/Plant.ts`, `PlantPot.ts`, `lib/husbandry/Growing.ts`, the dorm `props:` starter pot; doc: `husbandry.md` (intro; *A pot is the density dial at N = 1*; `§ Content`; `§ Deferred seams` → *No bond, no attention need, no regard — a plant cannot hold an opinion of you*). Heading + note left
- `## Winter` → the intro *7.5 real days, globally synchronized — season from `CAMPUS_LATITUDE`; per-locality climate bias reserved* (378–382, 5) — code: `CelestialLogic.CAMPUS_LATITUDE`, `Locality._climateLean`; doc: `weather.md § Season` (global, one latitude), `§ The coexistence resolve` (the climate lean shipped, as a weather-distribution bias). Note left
- `### Two honest problems` → bullet 1 *Spoilage is the hard dependency … winter is a pause rather than an economy* (405–410, 6) — code: `FreshnessMixin`, `CuredMixin`, `trade-cooking`'s `cure`/`dry`/`smoke`; doc: `spoilage.md`. Replaced by a struck one-liner; bullet 2 KEPT
- `## The land model` → the *Ownership is property's* blockquote (420–427, 8) — code: `ParcelRecord`, `HoldingWarren.admitPlot`, `getLandRequirementM2`; doc: `parcel.md`, `smallholding.md` (the land draw), `holding.md`. The compute allowance is still inert — the note says so
- `## The land model` → *Substrate note: an N-slot planting bed is pure YAML … contents AND slots* (458–465, 8) — code: `trade-farming/…/thing/bed/garden.yaml`, `lib/husbandry/Cultivable.ts`; doc: `husbandry.md § ⚠ A slotted plant lives in the pot's contents and its slot`, `smallholding.md`
- `### A field-room is a land-use choice — and grazing is one of them` body (466–496, 31) — code: `trade-farming/src/lib/Sward.ts` (the same four-row table in its header; `swardGrazingDemandPerGameDay`), `Field.ts`, `mow.yaml`; doc: `soil.md § The sward, and the land uses nobody declares (D7)` (table, *fertility follows the mouths*, `mow` and grazing one draw). Heading + note left; the note flags that the *crop* row has no producer (finding 1)
- `### `reconcile(plot, now)` — the keystone` body (517–543, 27) — code: `Growing.ts:740–800` (step cap, `Math.min(satWater, satLight, satRoot, satNutrient, satWarmth)`, vigor relaxation, `_worstLimiting`); doc: `husbandry.md § The reconcile contract`, `§ Durability` (*checkpointing, not an event log; a mutating act captures its host*). ⚠ Not as written — no `gddAccum`, no weeds/pests; the note says so. Heading + note left
- `### The harvest` → *Harvest mints matter stamped with a `CraftedMixin` maker's-mark* (575–577, 3) — code: `Crop` composes the maker's mark + spoilage gauge; doc: `husbandry.md § Content` (*A harvested crop is a `Provision`*), `§ The fruit cycle` (graded off the worst limiting stretch)
- `## Maintenance` → the STRUCK *Upkeep is a real-time drain* blockquote (585–592, 8) — history of a self-correction; the surviving fact (one clock, world time) is `husbandry.md § The clock rule`
- `## Open problems & deferred` → *Tending cadence tuning* (1051–1053, 3), *Spoilage / perishability* (1064–1065), *Numeric calibration* (1066–1067), *A full farming design doc* (1068–1069) (9 total) — `husbandry.md § Calibration` (*every number is a dial … placeholders for a running game*), `spoilage.md`, and the three subsystem docs themselves. Each replaced by a struck one-liner with the pointer
- `## Open questions` → Q1 *Tending cadence* (1075–1080, 6) — resolved; pointer to `husbandry.md § Calibration`. Q4 *Crop catalog as `Species`-family* (1087–1096, 10) — resolved; code: 25 `plantae` species rows under `trade-farming/content/stuff/idea/species/plantae/`; doc: `race.md`. Q2 *How far do numbers surface* (1081–1084, 4) — answered by the code: `AnalyzeSoilController` prints `pH 6.2 ± 0.15`, the band recomputed at read time per viewer; doc: `soil.md § The survey ladder`, `§ D5`. Each left as a one-line *resolved* entry (open questions are spine)
- `## Acceptance-criteria coverage` + `## Risks & opens` (1172–1208, 37) — plan artifacts: the A rows shipped (`husbandry.md § The fruit cycle`, `§ Content`), the four opens were *"RESOLVED 2026-08-31: defaults accepted"*, the B rows are superseded (below). Merged heading + note left
- `## Checkpoint A — the drive record` → paragraphs 1–2 (1212–1223, 12) — history of a shipped stage (`e2e/tests/drive-farming.spec.ts`); the *Post-checkpoint ruling* (1234–1239, 6) — code: `trade-farming/src/behavior/farms.ts` at `/trade/farming/behavior/farms`; doc: `behavior.md` l.197, `content-packs.md § trade-farming`. The *drive-found seams* paragraph is KEPT (see Uncertain)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### Keep it hard — winter is why preservation exists` (383–393, 11) — code: winter is hard (`GrowingMixin.satWarmth` + `Field`'s photoperiod/temperature factors stop the field; nothing softens it); `soil.md § Winter` carried the *mechanism* and the greenhouse consequence but not the **why hard** → inserted at `soil.md § Winter (D10–D12)` as a closing paragraph (13 lines: preservation has no reason to exist without it; a global season is a shared world event — demand on a schedule, once a real month, independent of concurrency; the counterweight is the fuel bill the mechanism already gives). Heading + pointer left
- **A factual insert, not a slate graduation:** `soil.md § The sward` gained a ⚠ paragraph (10 lines) recording that the *crop* row has **no producer** — `plant`/`sow` need a `CultivableMixin` target, `Field` composes none, `Improvable.isPlantable` has no caller — and pointing at the slate's land model for the open aggregate density. The existing table row was left as written (it describes the nutrient flow correctly); this is the *"fix a statement the code proves misleading, by insert"* case, and the ledger says so here
- **A status insert in `husbandry.md § Deferred seams`** (8 lines) under *No automation ladder*: the two stated prerequisites (the employment engine, a production brain) now exist, but no row names `/trade/farming/behavior/farms` and nothing lets a player hire a hand for their own ground — *unwired, not unbuilt*. Written because the bullet as it stood would send a requirements pass to build two things that exist

### Superseded — cut
- `### Implementation note — read weather, don't trust the room` body (261–284, 24) — by the code: the elapsed-window read the slate said *"does not exist"* is `WeatherApi.precipitationBetween(t0, t1, locality)` (`api/weather.ts:131`; `Soil.ts:610` integrates it; `weather.md § precipitationBetween` — *a sum, not a sample*) and temperature reaches the plant/ground through `BiomeApi.resolveTemperatureFor` restamped on the host (`Field.resolveSeason`, `Growing.restampWarmth`; `soil.md § Two checkpoints`, `husbandry.md § A fifth limiting factor: cold`). ⚠ Whether the integral honours an **authored pin** over a past window I did not verify (`precipitationBetween` walks procgen segments keyed by locality; the pin resolve is now-only) — noted, not asserted. Heading + note left
- `### Orchards — the perennial, and the tenure hook` → paragraph 1 *the standing tap … a multi-year capital investment* (333–338, 6) — the perennial shipped as the **fruit cycle** on the flowering latch (`Growing.ts` `_fruitFill`, `fruitSetCount`/`fruitFillDays` as the polycarp marker; `husbandry.md § The fruit cycle`); and the *Substrate: residency.md's reset sweep* paragraph (344–349, 6) — by the code: the tap rides the latch, not `Stock.reset()`'s sweep. Both replaced by notes; the tenure blockquote KEPT (Doctrine)
- `### The checkpoint` (501–516, 16) — by the shipped state: `GrowingMixin` carries `growthClockStamp` · stage · vigor · `_worstLimiting` · `_fruitFill` · `_lastLux` · `_lastAmbientK`; the **ground** carries moisture · nitrogen · organicMatter · structure with its own two stamps (`husbandry.md § The reconcile contract`, `soil.md § Two checkpoints`). No `genome`, no `gddAccum`, no `stress`/`pressure`. Heading + note left
- `### Soil — six reserves, six lessons` (544–553, 10) — by `soil.md § The four reserves` (moisture · nitrogen · organicMatter · structure; legume fixation in, leaching out). **pH is not a reserve**: `GroundCharacter.nativePh` is seeded, `lime`/marl offset it (`phOffset`), and character prices *improvement*, never availability (`soil.md § D55`). P · K · tilth did not ship; `trade-ranching/…/thing/bone.yaml` names phosphorus as *"the second thing a field runs out of"* — a stated seam with no reserve behind it. Heading + note left
- `### Irrigation` → *Cost check (2026-07-31): the finite-but-regenerating source is a named deferral* (619–628, 10) — by the water pack: flow is a **takeable volume**, `StorageNode` carries a level, rights are *volume per window + priority date* (`watershed.md § Flow is a TAKEABLE volume`, `§ Storage and control`, `§ Rights`); the household tap stays deliberately unlimited (`§ What this build deliberately did NOT do`). `UnboundedSource.ts:20` still calls the regenerating well deferred. Note left; the irrigation-rung paragraph KEPT
- `## Buildable-now — the staple loop (v1)` body (983–1017, 35) — by the three builds, in a different shape: no `till` (clearing is `grub`/`plough`), `sow` is an alias on `plant.yaml`, many crops not one, the survey ladder not *one soil probe*, and the *"hard prerequisite"* sun→light driver was not needed (rooms author `ambientIntensity`; the field's sward reads photoperiod) and is still open. Heading + note left
- `### Wave B0` (1109–1114, 6) — a plan checkpoint; history. Heading removed; note left under `## Stage B`
- `### Wave B2` · `### Wave B3` · `### Wave B4` · `### Wave B5` (1127–1170, 44) — by the farmstead build: B2's spherical fields → `plot` breaks a keyed `Field` out of a holding's yard (`PlotController`, `Field.groundSpot`; `soil.md § Field`, `§ plot`); B3's exemplar → `hearts-delight` shipped as a **static authored farm** (its README) with the campus farm as the managed exemplar, farmer row on `introduces`/`idles`; B4's switchover **did not happen** and is superseded by that ruling (the trade-farming floor + Wen still stand at target via the distribution sweep — `trade-farming/…/location/farm.yaml`, `farm-hand.yaml`; the README calls the counter an honest faucet); B5's drives ran (`packages/wire/tests/farmstead.dirty.wire.test.ts`) and the docs exist. One merged heading + note left

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the framing paragraph · *See also* (all 19 links resolve; none pointed at a cut section)
- `## The clock` → corollary 2 (*a multi-season breeding program is a real-month commitment* — genetics)
- `## The three axes` → intro + table + worked examples (aggregate + hydroponic unbuilt) · `### The environment axis is a variance-reduction ladder` (greenhouse content — glass, `Window`/`LightConduit` flux — and hydroponics; the mechanism *falls out free* per `soil.md § Winter`, no greenhouse row exists anywhere in `packages/content`) · the *Substrate check (2026-07-31)* paragraph (see Uncertain)
- `## Winter` → `### What a player actually does, in ascending cost` (item 3 blocked — see Uncertain) · `### Two honest problems` → bullet 2 (the bounce risk; mining + crafting are live, fishing is not — a sequencing note, nothing to build)
- `## The land model` → the three-tier structure + both densities + *Both densities run the identical `PlantMixin` growth model* (the **aggregate** density is the arable field crop — finding 1; see Uncertain for what of the rest shipped)
- `## The growth model` → `### Stages teach when` (per-stage sensitivities are a comment-documented seam on `GrowthProfileData`, shipped OFF — `husbandry.md § The fruit cycle`) · `### The harvest — three outputs` list (yield scaling by the vegetative/filling window and the **composition** output are unbuilt; quality-as-worst-window shipped)
- `## Maintenance & the automation ladder` → intro, the rung table, the sinks paragraph (see Uncertain) · `### Irrigation` → paragraph 1 (the irrigation rung is unbuilt; the commons half shipped — see Uncertain) · `### Pests, thorns, and navigability` whole (no `pest`/`vermin`/`infest` anywhere; `coverScoreOf` still counts non-Mobile contents uncapped by kind; `LocomotionMode.costMultiplier` still has no reader; no hedge; thorns shipped only as *rough ground* clearing cost in `Improvable` — no `HazardMixin` on any ground)
- `## Genetics & breeding` — every subsection. Grep: no `Genome`, `allele`, `heritab`, `express(`, `GrowthParams`, `cultivar`, `pollinate` in the tree (`Seed.ts:7` and `Clade.ts:20` name genetics as deferred). Ranching's `breed` writes *served* only (`ranching.md § What is NOT built … heredity of any kind`)
- `## Magic as pharmacology` whole (see Uncertain — contradicted)
- `## The synthesis / brewing layer` whole (see Uncertain)
- `## The University & the external-mastery seam` whole (see Uncertain)
- `## Substrate mapping` — the audit blockquote + the table, kept as one unit (see Uncertain)
- `## Phases` (1 shipped; 2–4 open) · `## Open problems & deferred` → effect-resolution detail · the teaching unit · the external-mastery adapter · genome linkage · `## Open questions` → Q3
- `## ⭐ Stage B, salvaged` intro + `### Wave B1` (see Uncertain)
- `## Checkpoint A` → the *drive-found seams* paragraph (see Uncertain)

### Doctrine — kept, labelled
- `## The spine (non-negotiable)` — the eight principles. ⚠ Item 8 (*Magic is pharmacology. No magic engine word*) is now contradicted by `magic.md` / `docs/arcane-science.md` (an explicit Effect substrate, `CasterMixin`, the Arcane grid as Disciplines); item 2 names `PlantMixin` (shipped as `GrowingMixin`); item 3 shipped verbatim (`husbandry.md § The clock rule`). Kept whole as the slate's thesis; the coordinator decides its home
- `### Orchards` → the tenure blockquote (*the orchard is the mechanic that makes land tenure emotionally real*) — an argument for property, not a mechanism
- `## Numbers, instruments, competence` — five bullets of philosophy (*competence sharpens instruments, never multiplies yield*; the scientific-method loop; *what stops it becoming a wiki-lookup game*). Partly realized: the survey ladder reads with an error band the eye earns (`soil.md § D5`); nothing multiplies yield by competence; but **GDD did not ship** as an integral (bullet 5 says it *"falls out of shipped substrate"* — it does not; maturity accrues by good time and `cold` is a factor)
- `## Prior art` — the influences table

### Uncertain — kept
- `## The land model` → the three-tier structure — mixed: *Farm = a Warren* shipped as the **holding** (`HoldingWarren.admitPlot`, `WarrenMemberMixin` on `Field` — `soil.md § plot`, `holding.md`), not a farm-owned Warren that buds field-rooms; *Field = a room, its `Floor` carrying the state* shipped as `Field extends CartesianLocation` composing `SoilMixin` directly (no `Floor` surface-bulk); the **bed** density shipped (`GardenBed`); the **aggregate** density did not — nothing sows a `Field` (finding 1). Kept whole because the aggregate design is the open item and the bullets are one list
- `## The three axes` → *Substrate check (2026-07-31)* — still accurate on the two points that matter: no room derives ambient flux from the sun (`setAmbientFlux` callers: `AmbientLit.ts` only; every outdoor row authors a static `ambientIntensity`, e.g. hearts-delight `40000`), and `Window`/`LightConduit` propagates from an adjacent room. `AtmosphericMixin.setTemperature` room override — not re-verified this pass
- `## Winter` → *What a player actually does* item 3 *own land somewhere milder — blocked on the reserved per-locality climate seam*: the season is still computed from one `CAMPUS_LATITUDE` (`CelestialLogic.ts:27`, `weather.md § Season`), but `Locality._climateLean` (weather-type bias) and per-biome temperature baselines (`BiomeApi.resolveTemperatureFor`) both exist, so *somewhere warmer* is partly authorable today. The latitude seam is weather's/time's, not farming's — `Left` names it as such
- `## Maintenance & the automation ladder` — the rung table: **hand-farming** shipped; **farmhand (NPC)** — the employment engine (`employment.md`: positions, wages, on-shift conferral) and a production brain (`farms.ts`) both exist, but no row wires the brain and no player can appoint a hand to tend *their* ground (finding 2); **script** — the interpreter shipped (`scripting.md`) but *metered compute* has no code (`property-slate` Phase 1). *Tool wear* shipped (`ToolMixin`); OM/structure decay shipped (`soil.md`); weeds/pests unbuilt
- `### Irrigation` → paragraph 1 — the **commons** half shipped in the water pack (rights, priority, the stranded navigation claim — `watershed.md § Rights`) and is *not* an exception to the private/commons line any more but its own system; the **irrigation rung** (a fixed-schedule watering automation, a ditch delivering to a field) is unbuilt — `Conduit` exists (`watershed.md § Conduit`) but no field draws from one. One paragraph, kept whole
- `## Magic as pharmacology` — **contradicted by a shipped decision.** `magic.md` ships an explicit effect substrate (*Effect-iff-gated-Api*), `CasterMixin`, suppression; `magic-items.md § Potions ride the MATERIAL` ships potions as `PotionMaterial` carrying a **spell**, charged in τ; `docs/arcane-science.md` gives magic one postulate and eight authoring rules. The slate's *"no magic engine word"* is false now, and its compound→substrate table (augmentation, vitals, perception, thermal, reserve) has no plant-side producer. The **pharmacology vector itself** (biosynthesized compounds, dose/half-life) is unbuilt — `metabolism.md`'s toxin/BAC dose model is the only shipped piece. Requirements must reconcile this section against arcane-science rather than inherit it; `Left` says so
- `## The synthesis / brewing layer` — brewing shipped as **recipe transforms** in `trade-brewing` / `trade-distilling` / `trade-winemaking` + `maturation.md` (grade/mark/strain transfer), and the dye stack is the one shipped *computed-from-inputs* composition (`textiles.md`); the slate's *output composition computed from input chemistry × process*, extraction by polarity, the authored reaction network and purity-as-`Grade` have no code. `Flask`, `pour`/`stir`/`strain`, `ManualBuild` + `mintFromBuild` + `Transcriber` all exist as the substrate it names. Kept whole
- `## The University & the external-mastery seam` — the **number-vs-meaning gate** is partly realized by the survey ladder (`look` free, `measure texture` a spade, `analyze soil` many samples — `soil.md § The survey ladder`) and the `soil-science` Discipline; no course, no mentor, no treatise; `credential.md` still defers the issuer-authorization ledger the external adapter would plug into. Kept whole; Q3 is its open question
- `## Substrate mapping` — one table, kept whole; row by row: *crop maturing* ✔ · *weather* ✔ as `precipitationBetween` · *temperature* ✔ via `BiomeApi` (not as GDD) · **sun→light ✘ still open** (the row's diagnosis holds; `obj/Lamp.ts` pattern unused) · *seasons* — now consumed (`daylightFractionAt` by `Field` + `Species.breedsAtDaylight`; `atNext*` still zero callers) · *plant taxonomy* ✔ (25 rows; the row's *"only `wolf.yaml`"* is stale) · the remaining rows ✔ except *magical effects* (see above) and *farm structure = Warren* (the holding)
- `## Phases` → phase 1 shipped; kept as the slate's sequencing (one list)
- `### Wave B1` — the `hearts-delight` **pack** shipped (content-only) but with **no district plat, no hectare-band raw lots, no Murphy's Station, no `SphericalZone`**; a player's fields today are bounded by their holding's yard (`soil.md § plot` — *a holding with no room in its yard*). Whether farmland-at-scale for players is still wanted, and where (Heart's Delight per this wave, or a district of its own), is a requirements question — the two-kinds-of-farm ruling (static authored vs managed) does not decide it. Kept verbatim; `Left` names it. The wave text cites retired plan decisions (P8/P9) that no longer exist
- `## Checkpoint A` → the *drive-found seams* paragraph — three seams for other owners: (a) substring keyword ambiguity (`pot` ⊂ *potting soil*) — the targeting build's `onFiltered` (commit `d0613c014`) is the likely answer; not verified closed; (b) *a fresh bed ships capacity but no soil* — `bed/garden.yaml` now authors `reserves.moisture` and describes itself *filled level with dark soil*; the small pot still ships empty by design; (c) `dev-preflight.mjs` still kills by *"inside a Saxonberg checkout"*, not *this* checkout (`scripts/dev-preflight.mjs:40–46`) — still open, tooling's, not farming's
- Overlaps for the cluster pass: genetics ↔ `ranching-slate § Breeding` (the same husbandry-wide substrate, kept in both) and `disease-slate` (resistance as the marker trait); the water commons ↔ `watershed.md` (shipped) and `credit`/civics for D18's nitrate destination; pests ↔ `disease-slate`; the compound layer ↔ `capability-magic-slate` (itself PARTIAL against `magic.md`) and `trade-medicine`; the teaching seam ↔ `college-slate`, `education-integration-slate`, `help-slate`; the automation ladder ↔ `employment.md § deferred`, `property-slate` Phase 1 (metered compute); hydroponics/greenhouse ↔ `fire.md` (the fuel bill) and the light subsystem (sun→flux)

### Handoff (belongs in a doc outside my list)
- → `content-packs.md § trade-farming` (l.1167): **a correction, not a paragraph** — the row says the `farm-outfit` + `farm-hand` run *"on the pack's own `farms` brain"*. They do not: `trade-farming/content/trade/farming/agent/farm-hand.yaml` runs `/lib/behavior/consigns` (`trigger: cadence:4m`), and no content row anywhere names `/trade/farming/behavior/farms`. The brain exists and is tested (`src/behavior/__tests__/farms.test.ts`); it is unwired
- → `smallholding.md § ⭐ The field arrived (farmstead)`: the sentence *"newly plotted ground is **not plantable** until it has been cleared"* implies a planting path onto a field that does not exist (finding 1). Suggested insert after it, verbatim:

  > ⚠ *Plantable* here is `Improvable.isPlantable` — a gate with no caller yet. `plant`/`sow` require a `CultivableMixin` target and a `Field` composes none, so a cleared field grows sward (hay, grazing) and arable crops still grow in beds and pots. The arable field crop is [farming-slate § The land model](../slates/tails/farming-slate.md)'s open item.

- → `ranching.md` (§ the field / `plough`): nothing to insert; noting only that `ranching.md` l.~290 says *bone goes back into the soil as phosphorus* and `bone.yaml` calls phosphorus *"the second thing a field runs out of"* — there is **no phosphorus reserve** (`SoilMixin` carries moisture · nitrogen · organicMatter · structure). If that sentence describes a mechanism, the doc is ahead of the code; if it describes intent, it should say so
- → `weather.md § What it does not see` / `§ precipitationBetween`: one clause the coordinator may want verified — whether the integral over a **past** window honours an authored `WeatherPin` (the slate's original worry: *"a storyteller's storm would not touch the harvest"*). `precipitationBetween` walks procgen segments keyed by locality; `resolveWeatherFor` is the pin-aware read and is now-only. Not asserted either way in the slate's note

### Status block
- Status line: unchanged in substance; added *(sward only — nothing sows a field yet)* and the ledger pointer
- Left: *plant genetics — cultivars and fixed-vs-segregating lines (husbandry.md still says "no genetics") · the controlled-environment tier past the free greenhouse (hydroponics)* → *the arable field crop — the aggregate density (no verb sows a `Field`) · plant genetics — `Genome`, `express`, `pollinate`, cultivars + fixed-vs-segregating seed lots, the husbandry-wide breeding substrate · the environment-control tier (greenhouse glass + hydroponics) · the sun→ambient light driver · per-stage stress sensitivities + yield scaling + the composition output · the automation ladder (a hireable hand on YOUR ground, the irrigation rung, metered compute) · weeds/pests as an adversarial reserve, thorns as hazards, hedges as a grown boundary · the compound effect layer (magic as pharmacology — contradicted by `magic.md`, to reconcile) · the computed-chemistry brewing layer · the University teaching seam (the teaching unit, the external-mastery adapter) · a farming district at scale (Stage B1's hectare-band plat) · per-locality season (weather's seam)*. The body wins: two items were listed, thirteen open designs were in the body. ⚠ **One item is NEW to the list because the slate believed it shipped**: the arable field crop
- Size: a wave → **a build** (genetics alone is one; the environment tier + the light driver another)
