# Ceramics & moulding — implementation plan

Executes [ceramics-requirements.md](../requirements/ceramics-requirements.md)
(**kind: feature · leads from: KERNEL**, first consumers in the same build).
The kernel gains seven engine facts and the `fire` verb loses its recipe
path: **heat-work is a face of `ThermalMixin`** and every material declares
what heat does to it (M1 — lime, clay, gypsum, glaze, rubber, the glass
batch and the retort's volatiles all ride the one rule); **a good has faces
and a face carries coats** (M6, on `Good`, construction's layer shape);
**brittle breakage, hidden flaws and `ring`** live on the matter rung
(`Tangible`); **evaporation carries heat away** (M8, in `ThermalMixin`);
**the freeze-thaw count is a weather fact** (S2); **clay is a composition**
(M3, the quarry's `Clay`); **the mould is an envelope** that takes
impressions, judges a pour and presses (M2/M9/S12–S16). The consumers are
the `trade-ceramics` pack (brick, tile, firebrick, pottery, the filter, four
disciplines), the Delight brickfield-and-pottery, the Rejection foundry in
`trade-smelting`, and the Terminus potter's stall. Branch `reqs/ceramics`,
worktree `build-3`. ⚠ Two unmerged siblings touch the same kernel seams —
§ *Sibling collisions* is written for either merge order and the owner
decides the order after reading this plan.

**Honest size:** ten waves, roughly 350 files and 18–22k lines (sugar was
227 files / 10k; this build is two of those: a kernel rework of firing plus
a two-trade venue plus a founding trade). The waves are ordered so the
kernel substrate lands with a consumer each time and nothing waits on a
sibling until W8.

---

## ⭐⭐ Sibling collisions — sugar and potash

Both siblings are **code**, not plans: `origin/reqs/sugar` (build-1) has
W0–W6 landed and eight drives run; `origin/reqs/potash` (build-2) has W0–W6
landed and three drives. Read 2026-10-20 against merge-base
`2a4e9af0a` (the silk merge, which is also this branch's base). What
follows is what each has pushed, per shared file, and how this plan's
waves are shaped so the merge is cheap in either order. ⭐ Where a sibling
already built the mechanism this plan needs, this plan **uses it** rather
than a parallel one: sugar's `dissolvedSolidsKgPerL` / `concentratesTo`
arrows / `Mould.drainsInto()` / `PercolatingMixin` / public
`Thermal.heatSource()` / `Burner.deliveredPowerW()`, and potash's
`Composition` ash good, `Material.alkaliShare`, the `flux`/`stabilizer`/
`carbonate` tags and the firing's grade carry.

### Per shared file

| file | sugar has pushed | potash has pushed | this plan | how it is shaped |
|---|---|---|---|---|
| `lib/thermal/Thermal.ts` | public `heatSource()` (replacing private `heatSourceK`), `fireCouplingR()` in `effectiveR()`, `boilHeldSeconds` → `{heldS, sinceS}` for every plateau material, `boilJoules`, `concentrateIfReached`, `BulkPayload.dissolvedSolidsKgPerL`, `PhaseClock.lastS` + `_phaseCheckedS` | nothing | the heat-work record + `reconcileHeatWork()` called from `reconcileThermal()` **after** `reconcilePhase()`; `heatSource()` public with **sugar's exact signature**; the evaporative term as its own private `evaporativeDepressionK()` read where `ambientTrajectory()` picks the flat ambient — NOT inside `effectiveR()` | different regions; `heatSource()` is byte-identical so whichever lands second merges as a no-op; the heat-work window reuses `PhaseClock.lastS` when sugar is in, else its own stamp (one line either way) |
| `lib/material/Material.ts` | `DrainSetting.drains/drainPerBand`, `ConcentrationArrow`, `solidsKgPerL`, `_familyPath`, `boilingPointElevation`, `concentratesTo` (+106 lines mid-file) | `alkaliShare` after `ashFraction` | `heatTransitions` (replaces `crosslinking`), `thermalExpansion`, `acidity`, `brokenTemplate`, `leaches`, `formTemplates`, `chillsTo`, `cureSetting`, `filteredTo`, `solubility`/`crystallizesTo` (W8) | every field appended at the END of `fieldMeta` and every accessor at the END of the class; the `crosslinking` → `heatTransitions` rename is the one edit inside an existing region (one fieldMeta line, one field, one get/set pair) |
| `lib/mould/Mould.ts` | `drainsInto()`, `setDrainedKg`, `creditDrainings()`, `bandsBelowFine()` inside `reconcileSetting` | nothing | `impression`, `receivedPour()`, the envelope reads, `SetPool.temperatureK`, the cure set, `pressRelease()`, Chvorinov + survival + the damp blow in `castInto` | the cure branch is a separate early `return` block in `reconcileSetting` above the drain arithmetic; slip-cast absorption (W6) is a separate branch, never an edit to `creditDrainings`; `castInto` additions sit before the clone |
| `platform/idea/cmd/device/FireController.ts` (+ test) | nothing | D12a (fractions ÷ `massYield`), D12b (weakest graded input), tests | **rewritten** — no recipe path; both potash rules survive as the transition's own conversion carry (`alloying` rescaled by `1/massRetained`) and the heat-work grade rule | if potash lands first, our rewrite deletes its hunks and the pearl-ash drive step must pass on a transition (§ below); if we land first, potash's W3 hunks will not apply and its `calcine.yaml` is a dead row until converted — **one row + one `heatTransitions` block** on `black-salts.yaml`, which this plan ships pre-emptively in W0 if potash is on master |
| `lib/fire/Burner.ts` | `heatTransferFraction`, `deliveredPowerW()` | `ashAlkaliKg`, `mintAshHeaps()`, `rakeGrate` returns heaps | `@hook heldTemperatureKFor(body)` (default `getHeldTemperatureK()`), `@hook heatCeilingFactor()` (default 1), `fire.yaml` stays in `commandContributions` | three regions; a `fieldMeta` append conflict is a union |
| `platform/idea/api/BulkableLogic.ts` | folds `dissolvedSolidsKgPerL` (step 5) | folds it for `lye` (to be deleted at sugar's merge) | receiver survival (`to.canReceiveAtK`) BEFORE the debit; `mould.receivedPour()` AFTER the thermal coupling | above and below their hunk |
| `lib/bulk/Bulkable.ts` | declaration merges only (from `Thermal.ts`) | declaration merge only (from `LyeStrength.ts`) | the per-slot leach reconcile (D7) and the seep (D6) as methods on the mixin | no overlap |
| `lib/material/Crosslinking.ts` | — | — | `git mv` → `HeatTransition.ts`, generalized | no overlap |
| `lib/mixin.ts`, `api/mixin.ts` | `Percolating` + `isPercolating` | — | `Faced`, `Greenware` + predicates + refusals | appends; union |
| `lib/config/AppSettings.ts` + `content/settings/*.yaml` | `employmentUnpaidStandGameDays` | `fireAshHeapKg`, `fireAshAlkaliMaterial`, `potash.*` | `ceramics.*` keys in the pack's own `settings/ceramics.yaml`; kernel keys `thermal.evaporation.*`, `impact.*`, `faces.*` in `thermal.yaml`/`fire.yaml` | appends; union |
| `platform/idea/reading/TemperatureReading.ts` + `temperature.yaml` | — | — (potash edits `DensityReading`) | incandescence words ≥ 800 K; `handTool: pyrometry` | no overlap |
| `PackLogic.discover.test.ts` | +1 (`trade-sugar`, `waponi-woo`) | +1 (`trade-potash`) | +1 (`trade-ceramics`) | whoever lands second recounts (the silk comment) |
| root `package.json` / `pnpm-lock.yaml` | +2 packs | +1 pack | +1 pack | union the block; `pnpm install` resolves the lockfile, never hand-merge |
| `trade-quarrying` | — | `burn-lime.yaml` slot → `carbonate`; `OpenWorking.test.ts` tag list | `Lump` composes `ThermalMixin`; new `src/thing/Clay.ts`; `clay.yaml` re-classed; `fire-pot.yaml` and `burn-lime.yaml` **deleted**; `limekiln.yaml` gains a bill | the deletion wins over potash's edit at merge (take ours) |
| `trade-fuel` | — | `Ash` class, ash rows, `CharController` ash minting | `Retort` composes `Assembled`+`Durable` (lining); `retort-wood.yaml`/`retort-coal.yaml` **deleted** (volatiles ride the wood/coal transitions); `retort.yaml` gains a bill | different files |
| `base-library/…/material/wood/*.yaml` | — | `alkaliShare` on nine rows | `heatTransitions` (char + volatiles) on the same nine rows | same rows, different keys — union |
| `trade-glass` | — | `glass-batch*.yaml` slots `flux`/`stabilizer` | `glass-batch.yaml` becomes a `stir` MIXING recipe (keeps potash's slots), output `/trade/glass/thing/batch`; the batch material transitions to glass; `ShapeController` promoted to platform (`Gather` implements `Shapeable`) | the recipe row conflicts textually if potash lands after; resolve by keeping potash's slot lines inside our row |
| `trade-chandlery` | — | `Hopper.ts`, `SoapKettle.ts`, materials, `lye.yaml` | `DipController.ts` + `dip.yaml` move to platform; `DipPot` implements `DipPlanner` | different files |
| `rejection` | `store-counter.yaml` +1 quicklime line (D7) | ashery, lean-to, ash-burner, glasshouse buying lines | `quarry-hill.yaml` fireclay + gypsum bands; foundry rooms; four furnace rooms → `PersistentLocale`; `store-counter.yaml` +firebrick/+crucible/+lead/+tin lines; roster slots for `relines` | `store-counter.yaml` line-union; `glasshouse.yaml` potash adds a counter prop, we add a bill on the kiln row (different files) |
| `terminus` | pantry, Veshko | `chandlery/thing/counter.yaml` (a `buys` line), general-store tests | market stall rows; `general-store/counter.yaml` + `chandlery/thing/counter.yaml` lines re-pointed with a backstop | line-union |
| `hearts-delight` | — | — | the brickfield-and-pottery sub-works | no overlap |
| `packages/wire/tests/*` | `sugar.dirty.wire.test.ts` | `potash.dirty.wire.test.ts` | four `ceramics-*.dirty.wire.test.ts` | separate files |

### What each sibling's drive relies on that M1 changes

- **Potash** fires `calcine` (a `fire` recipe, black salts → pearl ash at
  900 K, `massYield 0.8`, grade carried). Under M1 this is
  `heatTransitions` on `/trade/potash/idea/material/black-salts.yaml`
  (`referenceK 900`, `massRetained 0.8`, `products.done: …/pearl-ash`
  material; the cake is an `Ash` good so it keeps its class and its potash
  fraction rescales by 1/0.8 — potash D12a's exact arithmetic) and the row
  `thing/pearl-ash.yaml` becomes the cake's post-transition material, not
  a second thing. The potash wire step reads *"pearl ash has come out"*;
  under M1 the same cake reads as pearl ash. **W0 ships the transition
  block on potash's row if potash is on master, else records it as potash's
  one-line conversion.**
- **Sugar** fires nothing; it drains (the cone), concentrates (the plateau)
  and percolates (claying). None of that is touched. W8 (crystallize, the
  filter) is written ON sugar's mechanisms and is gated on them.
- **Rubber** (merged) fires `vulcanize` with a `crosslinking` spec. W0
  rewrites the raw-rubber row's spec as a `heatTransitions` block with the
  same four product rows and the rubber suite (`Crosslinking.test.ts`,
  `FireController.test.ts`'s cure describes) is re-pinned on the renamed
  evaluator; the wire drive `rubber.dirty.wire.test.ts` must still pass
  (its boot has a mould, an oven and `fire … for`).

### Recommended order (for the owner)

**After both** is cheapest for this build: the `FireController` rewrite
subsumes potash's two hunks; W8 ships inside the MR on sugar's
`dissolvedSolidsKgPerL` / `drainsInto` / `Percolating`. **Before both** is
possible: W8 leaves the MR (its own follow-up), potash converts `calcine`
to a transition at its merge (one row), sugar's `heatSource()` merges as a
no-op. **Between** (after potash, before sugar) is the worst: W8 still
leaves, and the `Thermal.ts` three-way merge is ours against sugar's, by
hand.

### Pre-wave check, for every wave touching a shared file

```bash
git fetch origin
git log --oneline origin/master -- <file>
git log --oneline origin/reqs/sugar -- <file>
git log --oneline origin/reqs/potash -- <file>
```

If a sibling has pushed to the file since 2026-10-20, read its hunk before
editing and keep to the region named above.

---

## Grounding

Verified by opening the file on `reqs/ceramics @ 2c8454122` (= master
`2a4e9af0a` + three docs commits), 2026-10-20. `K` =
`packages/server/src/mud`, `C` = `packages/content`. Where this corrects a
premise in the requirements it says so inline.

### Firing today

- `K/platform/idea/cmd/device/FireController.ts` (680 lines). `execute`
  (l.116): the kiln must be `Burner & Container`; the charge is the
  tangible contents, reaching one level into a charged `Mould` (one mould
  at a time, `mixed-charge`); `firingsFor` (l.258) scans
  `RecipeCatalogue.allRecipes()` for `requiresHeatK > 0` rows whose item
  slots the charge satisfies by `hasMaterialTag`; `not-lit` and
  `insufficient-heat` (`getHeldTemperatureK() < requiresHeatK`) refuse;
  the hold is `for <duration>` → `authoredHoldS` → 60 s; `engage` (l.318)
  runs a sealed-down `ManualBuildStep` on the attention slot; `runFiring`
  (l.441) consumes `batches × count`, carries mass (`massYield`) and
  `Composition` fractions, takes the cure branch (`cureOf` →
  `Crosslinking.outcome`), the mould branch (`castInto`), the plain clone
  branch, routes `volatiles` to a `receiveVolatiles` probe or
  `emitIntoScope`, soils the giver, stamps `recordHeat(recipe.requiresHeatK,
  holdS)` on Soilables — **the recipe's figures, not the actual** — destructs
  the inputs, credits `recipe.discipline`. ⚠ `heldK` is sampled once at the
  start; nothing re-checks lit at completion; nothing wears the chamber;
  nothing records the atmosphere.
- Recipe rows this path runs: `C/trade-quarrying/content/recipes/burn-lime.yaml`
  (flux ×2 → quicklime, 1170 K), `fire-pot.yaml` (clay ×1 →
  `/stuff/thing/clay-pot`, 1100 K, `discipline: quarrying`),
  `C/trade-glass/content/recipes/glass-batch.yaml` + `glass-batch-amber.yaml`
  (1400 K, `massYield 0.72`, → `/trade/glass/thing/melt`),
  `C/trade-fuel/content/recipes/retort-wood.yaml` (`category: wood` ×4 →
  charcoal, 650 K, `volatiles: wood-tar 0.08 L/kg`) and `retort-coal.yaml`,
  `C/trade-rubber/content/recipes/vulcanize.yaml` (the cure). All six retire
  as rows; the materials gain transitions.
- `K/lib/material/Crosslinking.ts`: `CrosslinkSpec {agent, referenceK, zK,
  fullDoseS, agentOptimum, agentOver, scorchAboveK, products{under, cured,
  over, scorched}}`; `outcome(charge)` = `dose = holdS·10^((heldK−ref)/zK)`,
  `degree = min(1, dose/fullDoseS)·min(1, agent/optimum)`; `gradeOf` from
  the miss. ⭐ This IS the heat-work evaluator; it generalizes by adding a
  product LADDER and a mass retention. `Material.crosslinking` is
  `fieldMeta` l.1031 (`persistent, authorable`).
- `K/lib/thermal/Thermal.ts` (1618 lines): `reconcileThermal()` (l.962,
  **not** `@Final` — only `depositHeat` l.738 and `reconcilePhase` l.764
  are) drifts toward the moving ambient then calls `reconcilePhase()`
  outside the guard (l.1070); `reconcilePhaseImpl` (l.1318) takes
  `PhaseClock {nowS, horizonS}`; `boilHeldSeconds` (l.1387) integrates
  `temperatureTrajectory(fromS, nowS).samples(8)` at or above a threshold,
  banked on the payload (`boilHeldS`/`boilCheckedS`), first read bounded by
  `PURIFY_LOOKBACK_S` and the ring's `horizonS()`; `purifyIfHeld` (l.1422)
  fires the material arrow at 60 s. `heatSourceK()` (l.1083, private): a
  lit, fuelled `Burner` the body is IN or ON. `thermalLog` is a
  `TrajectoryLog` ring of 24 (`K/lib/Trajectory.ts:187`); `Piecewise` has
  `integrate(f, n)`, `samples(n)`, `at(t)`, `window()`. ⚠ Master has no
  `secondsAtOrAbove` (sugar adds it). `K/lib/thermal/ThermalDose.ts` is the
  other dose integrator (`doseS += ∫ 10^((T−Tref)/z) ds`, Simpson along
  `Decay.toward`) — the shape heat-work takes.
- Burners: `K/lib/fire/Burner.ts` (1276 lines) — `completeness()` (l.707)
  = `clamp01(draught × airShare / 0.85)`; `getHeldTemperatureK()` (l.780)
  = `min(ceiling × bellows, fuelFlameK) × (0.75 + 0.25·completeness)`;
  `commandContributions` (l.320) affords `ignite/douse/stoke/draught/cover`
  in environment and peers plus `pump`, `heat`, `warm`, `fire`; `fieldMeta`
  l.374. `K/lib/fire/Firebox.ts` = `Burner(LightSource(Thermal(Thing)))`;
  `K/platform/thing/Oven.ts` = `Flued(Container(Placing(Firebox)))`;
  `C/trade-smelting/src/thing/SmeltingFurnace.ts` = `Container(Forge)`;
  `C/trade-fuel/src/thing/Retort.ts` = `Container(Placing(Firebox))` with
  `receiveVolatiles` (l.63); `C/trade-fuel/src/thing/CharcoalPit.ts` =
  `Container(Firebox)`, `outcomeFor(draught)` thresholds, affords
  `trade/fuel/cmd/fuel/char.yaml`. ⚠ **No furnace composes `Durable` or
  `Assembled`.** Rows: `C/generic-objects/content/stuff/thing/Kiln.yaml`
  (`Oven`, 1200 K ×1.25, `unreachable: exemplar` — *what lifts this: a
  pottery or lime trade*), `C/trade-quarrying/…/thing/limekiln.yaml`
  (`Oven`, 1500 K), `C/trade-smelting/…/thing/furnace.yaml`
  (`SmeltingFurnace`, 1420 K ×1.12), `C/trade-fuel/…/thing/retort.yaml`
  (`placements: [on]`, `fixedInPlace`), `clamp.yaml` (`draught 0.45`,
  2 kW over a 4-tonne bed).
- `C/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`:
  `crucibleIn` (l.781) finds the first `Bulkable & Thermal`, non-`Mould`,
  interior vessel in the furnace; `runIntoCrucible` (l.803) restamps it and
  sets both ends to `heldK` before `BulkableApi.transfer`; `isFlux` (l.962)
  reads the `flux` tag (potash renames it `smelting-flux`).

### Thermal hosts, matter and breakage

- `K/lib/stuff/Thing.ts` l.100: `WetMixin(Visible(Detailed(Perceptible(
  Tangible(Containable(Stuff))))))` — **every Thing is `Wet`, no Thing is
  `Thermal`**. `K/lib/stuff/Good.ts` l.65 = `Chattel(Concealable(Thing))`.
  Thermal hosts among the classes the 22 rows name: `Receptacle`
  (`Assembled(Durable(Thermal(Bulkable(Good))))`), `CraftVessel`
  (`Soilable(Contaminable(Serviceable(VesselKind(Crafted(Thermal(Bulkable(
  Container(Good))))))))` — ⚠ **no `Durable`**), `Vat` (`Assembled(Durable(
  VesselKind(Maturing(Crafted(Sealable(Thermal(Bulkable(Good))))))))`),
  `Dish` = `NutritionLabel(ServingVessel)` = `Palatable(CraftVessel)`,
  `Mould` (`Mould(Durable(Crafted(Thermal(Bulkable(Container(Good))))))`),
  `Firewood` (`Combustible(Thermal(Reserved(Good)))`), `Casting`
  (`Composition(Meltable(Thermal(Good)))`), `Ingot`
  (`Alloyed(ManualBuild(Meltable(Thermal(Good))))`). **Not Thermal:**
  `C/trade-quarrying/src/thing/Lump.ts` (`Stackable(Good)` — limestone,
  clay, quicklime), `K/platform/thing/PlantPot.ts` (`Cultivable(Soil(Staged(
  Slotted(Bulkable(Container(Reserved(Good)))))))`), `Tool`
  (`Assembled(Named(Keen(Crafted(Tool(Durable(Constructed(Good)))))))`).
- `K/lib/material/Material.ts` (1707 lines): `fieldMeta` at l.982 ends with
  `purifiedByBoiling`. Fields present: `density`, `thermalConductivity`,
  `specificHeat`, `hardness` (MPa), `toughness` (MJ/m³), `elasticity`,
  `waterAbsorptionCapacity` + `permeability()`/`wetProperty()`,
  `autoignitionTemperature`, `heatOfCombustion`, `meltingPoint`,
  `latentHeatOfFusion`, `boilingPoint`, `latentHeatOfVaporization`,
  `castTemplate` (`getCastTemplate()` derives `metal-casting`/`Casting`),
  `drainSetting {days, becomes, moisture, loadRef}`, `ruinedByFreezing`,
  `crosslinking`, `composition: {materialPath, fraction}[]`, `tags`,
  `corrosiveTo`, `toxicity: ToxinTag[]`, `cleanser`, `ashFraction`,
  `combustionProducts`, `lightAbsorption`. **Absent:** thermal expansion,
  acidity, solubility, a shard template, a form map, a leach spec.
- `C/base-library/content/stuff/idea/material/ceramic/ceramic.yaml`: one
  generic row, `waterAbsorptionCapacity 8`, **no `hardness`, no
  `toughness`** (both read 0 → a thrown mug always shatters); tags
  `[ceramic, mineral, solid, brittle, fired]`. `ceramic/brick.yaml`:
  `hardness 60, toughness 8, wAC 12`, tags `+ masonry`. `earth/clay.yaml`:
  `wAC 45, hardness 5, toughness 2`, tags `[earth, solid, soil, plastic,
  clay]`, `composition: []`. No fireclay, earthenware, stoneware,
  terracotta, kaolin, gypsum or plaster row exists. `element/lead.yaml`
  authors `toxicity: [{type: lead-poisoning, amount: 0}]` and the Condition
  `C/platform/content/platform/idea/Condition/metabolism/lead.yaml` exists
  (`name: lead-poisoning`). `element/tin.yaml`, `alloy/bronze.yaml`,
  `rock/limestone.yaml` (potash: tags + `carbonate`), `caustic/quicklime.yaml`
  exist; no pewter, no brass, no gypsum.
- The 22 rows naming `material/ceramic/` (from `grep -rl`; the classes are
  what matters): dairy `butter-crock`, `jug` (`CraftVessel`), `rennet-jar`,
  `starter-crock` (`Vat`), `setting-pan` (`/trade/dairying/thing/SettingPan`
  = `Fractionating(Contaminable(Crafted(Thermal(Bulkable(Good)))))`);
  smelting `crucible` (`Receptacle`), `ingot-mould` (`Mould`); fuel `retort`
  (`Retort`); mining `streak-plate` (`Tool`); farming `pot/small|large|starter`
  (`PlantPot`); quarrying `/stuff/thing/clay-pot` (`PlantPot`); apiculture
  `honey-jar` (`Vat`); chandlery `soft-soap-jar`, `lye-flask` (`Receptacle`);
  cooking `tallow-crock` (`CraftVessel`), `smoke-chimney` (`SmokeChimney`
  extends `Station`); generic `bowl`, `plated-dish`, `platter` (`Dish`).
  Prose-only: `C/trade-baking/…/thing/starter-crock.yaml`,
  `C/trade-medicine/…/thing/steeping-pot.yaml`. Plus 19 LOCATION/FLOOR rows
  naming ceramic as an enclosure or floor material — untouched.
- Breakage: `K/platform/idea/cmd/inventory/ThrowController.ts` `deliver`
  (l.133) hands the PROJECTILE's `toughness`/`hardness` to
  `Combatant.resolveThrown`; `K/lib/combat/DeliveryProfile.ts`
  `deriveIntegrity` (l.213): `toughness < shatterToughness` ⇒ `shatter`;
  the shatter path (l.193–258) spills and destructs. `DropController.ts`
  l.215 is `ContainmentApi.move(operand, context.location)` — no fall. A
  room's floor material: `(location as Adornable).getFloor()?.getMaterial()`
  (`K/lib/spatial/Mobile.ts:1057`, `K/lib/ground/Floor.ts:642`).
- Wetness: `K/lib/wetness/Wet.ts` — `wet(delta)`, `getWetness()`,
  `reconcileWetness()`, `dryRatePerHour()` = evaporation / wAC,
  `airDryingFactor()`; rain pushes `wet()` from `WeatherLogic.wetOccupants`.
  `K/lib/material/WaterActivity.ts` — `_moisture`/`_solute`,
  `advanceMoisture(from, humidity, elapsed, drying{air, exposure})` toward
  `equilibriumMoisture(RH)`, rewetting at `cureRehydrationPerHour`,
  `exposureOf(host)` (l.200: rack vs ground vs chest); `getMoisture()`,
  `setWaterState()`, `seedDryness()`. `C/trade-quarrying/src/thing/Turf.ts`
  = `WaterActivity(Firewood)` is the dries-but-does-not-rot precedent.
  `K/lib/material/Evaporation.ts` — a value class (`humidityPct, windMs,
  tempK`), `evaporationFactor()`, **no statics**; `AIR_BOIL_CAP_K 373`.
  ⚠ **No evaporative cooling of objects anywhere**; the only wet-bulb
  arithmetic is `ThermalRegulation.wetBulbK(ambient, humidity)` (private,
  l.412/450).
- `K/lib/cleanliness/Soilable.ts`: `soil(kind, amount, by?, site?)`, sites
  (`''` = the whole thing), `recordHeat(peakK, heldS)` (l.544, keeps the
  hottest hold), `holdAtHeat`. `K/platform/idea/DirtKind.ts` rows at
  `C/platform/content/platform/idea/DirtKind/` (`mud.yaml`: `answersTo
  [surfactant, alkali-mild, abrasive]`, `waterLifts 0.7`).

### Moulds, bulk, composition, goods

- `K/lib/mould/Mould.ts` (454 lines): `SetPool {material, massKg, payload,
  moisture?, stampMaterial?}` (l.58, **no temperature**); the `Mould`
  interface (l.88): `castTemplateFor`, `castInto`, `holdsCast`, `loadKg`
  (kg placed ON — needs `Placing`), `reconcileSetting` (the drain set),
  `getMouldDiscipline`, `setState`; fields `reusable`, `wearPerCast`,
  `discipline`, runtime `setProgress/setStamp/setPressed`; `castInto`
  (l.362) clones `castTemplateFor`, stamps material/mass, `carryPayload`
  (maker, the mould's grade and `castDiscipline`, freshness, pathogens,
  moisture, madeFrom), moves the cast IN (reusable, `wear(wearPerCast)`) or
  beside and destructs the mould (consumed). ⚠ No read of the mould's
  material against the pour; no wetness read; no impression. The freeze
  set site is `Thermal.reconcileBulkPhase` → `castInto` when
  `MixinApi.isMould(v)`.
- `K/platform/idea/api/BulkableLogic.ts` `transfer` l.303–648: the thermal
  coupling at l.629–640 (`toHolder.setContentsTemperature(newK)`), vapour
  at l.606; **never reads the receiver's material or melting point** (the
  survival site). `K/lib/bulk/Bulkable.ts`: `ClosureLevel` (l.70),
  `closure` field (l.601); `BulkPayload` extended by declaration merging
  (`DissolvedToxins.ts` → `dissolvedToxins: ToxinTag[]` per litre, blended
  by volume on every pour).
- `K/lib/material/Composition.ts`: `alloying: CompositionEntry[]`,
  `fractionOf`, `setAlloying`, `getEffectiveComposition()` (the material's
  kind-composition scaled by what is left + the alloying) — ⭐ exactly the
  per-instance clay. `C/trade-quarrying/src/lib/Working.ts` `mintWinnings`
  (l.595) clones the band's `wins` row, `setMaterial(face.host)`, and
  `stampAssay` only when `MixinApi.isComposition(thing)` (l.638).
  `C/ground/src/idea/Deposit.ts`: `StratumBand {toZ, host, wins?}`;
  `C/rejection/…/idea/deposit/quarry-hill.yaml`: clay −1…−1.6 m (`wins:
  /trade/quarrying/thing/clay`, a `Lump` of `earth/clay`, 12 kg), coal
  −9…−10, sulfur −10…−11, halite −11…−12, water table −12. **No fireclay,
  no gypsum band; the Delight has no deposit at all.**
- Potash's `C/trade-fuel/src/thing/Ash.ts` (on its branch) =
  `Composition(Crafted(Good))` with `gradedByStrength` and a
  `markupAugmenter` — the per-instance composition-good shape this plan
  copies for `Clay`.
- Stacks: `K/lib/stuff/Stackable.ts` — `getQuantity`, `split(n)`
  (`canSplit` l.287), `onSplit`/`onMerged` hooks; `C/trade-mining/src/thing/Ore.ts`
  mass-weights its `grade` on merge (l.134).
- Assembly: `K/lib/craft/Assembled.ts` — `bill`, `parts`, `joints`,
  `wearLine`, `mendLine`, `replaceMembers`, `canBeNamedBy(handPath)`
  (l.1037: only the hand whose mend took the name). `K/api/crafting.ts`
  `fit(request)` (l.586): a **replace** arm (`part` + `whole`) and a
  **raise** arm; `fit.yaml` binds `thing` (`requires: any`, greedy),
  `whole` (`requires: AssembledMixin`), `tool`. `K/platform/idea/Joint.ts`
  rows (`reversible: freely|effort|never`). ⚠ No `interchangeable` field
  anywhere (`grep -rn interchangeable K` is empty).
- `K/lib/craft/Crafted.ts`: `maker`, `craftedAt`, `castDiscipline`,
  `stamp(spec)`; `Crafted extends Graded`. `K/lib/craft/Grade.ts`:
  five bands `poor fair fine exceptional masterful`. `K/lib/craft/Tooled.ts`:
  `capabilities`, a work-rate. `K/lib/craft/Recipe.ts`: `requiresHeatK`,
  `holdS`, `maxHeatK`, `massYield`, `volatiles`, `discipline`,
  `outputTemplate`, `outputMaterial`.
- `K/lib/craft/Cuttable.ts` — ⭐ the dumb-kernel-verb protocol this plan
  copies three times: `CutRequest {actor, tools, raw, options}`, `CutPlan
  {durationMs, effortW, beginSelf, onComplete}` | `CutRefusal {reason,
  line}`; the TARGET plans (`cutPlan`), then a bound TOOL (`cutPlanFor`);
  `K/platform/idea/cmd/crafting/CutController.ts` asks in order and
  `engageStep`s. `K/platform/idea/cmd/crafting/ManualBuildController.ts`:
  `engageStep(context, opts)` (l.68), `bestInstrument`, `paceMs` (base ÷
  tool rate — no competence pacing).

### Verbs this build extends (and who owns them today)

| verb | view | controller | afforded by | note |
|---|---|---|---|---|
| `shape` | `C/trade-glass/…/cmd/glass/shape.yaml` (arg `form` string, `pipe` `requires: [ToolMixin]`) | `C/trade-glass/src/idea/cmd/glass/ShapeController.ts` (`FORMS = [bottle, cylinder]`, `gather.setForm`, re-validates `isWorkable()` at commit) | `Blowpipe.ts` `HOT_SHOP` | glass-owned |
| `knead` | `C/trade-baking/…/cmd/baking/knead.yaml` | `KneadController` (`ManualBuildController`, `CraftingApi.mintFromBuild`) | `DoughTrough.ts:46` | baking-owned |
| `dip` | `C/trade-chandlery/…/cmd/chandlery/dip.yaml` | `DipController.ts` (one recipe, `candle`; melts tallow first) | `DipPot.ts:47` | chandlery-owned; the paint slate reserved `dip` as THE coat-from-bath primitive |
| `carve` | `C/trade-carpentry/…/cmd/carpentry/carve.yaml` (`thing` greedy `requires: any`, `stock`, `knife` default `capability.cutting`) | `CarveController.ts` (`isCarving(recipe)`: one wood item, an edge, no heat) | `Board`/`Blank` | carpentry-owned |
| `fit` | `C/platform/…/cmd/crafting/fit.yaml` | `FitController` → `CraftingApi.fit` | `AssembledMixin` + `Avatar` self | platform |
| `hammer` | `C/trade-smithing/…/cmd/crafting/hammer.yaml` (`target` `requires: AlloyedMixin`, `striker`, `anvil` prepositions `[on, at, against]`) | `HammerController` | smithing | ⭐ `on` already binds an object |
| `name` | `C/platform/…/cmd/social/name.yaml` | `NameController` (two arms: `Assembled & Named` via `canBeNamedBy`, or `Bonded`) | — | platform |
| `fire`, `dry`, `stir`, `pour`, `put`, `get`, `salvage`, `repair`, `measure`, `analyze`, `look`, `taste`, `listen` | platform | | | `press` is `cmd/system/press.yaml` (the ticker); **no `turn`, `ring`, `impress`, `mold` view exists**; `mill.yaml` is `verbs: [mill, grind]` |

- `K/platform/idea/cmd/bulk/PourController.ts` l.137 credits a mould's
  `discipline` at the fill. `HeatController.ts` l.252 places a vessel on
  the fire (`ContainmentApi.move(target, fire, 'on')`).
- `scripts/check-verb-collisions.ts`: two views may not claim one verb
  (allowlist of nine shipped pairs); the dry promotion precedent
  (`c77081bcc`) moved `dry.yaml`, `DryController.{ts,yaml}` and
  `DryingRack.ts` from `trade-cooking` into the platform wholesale.

### Readings, sound, keys, retail, weather, people

- `K/lib/instrument/Reading.ts` `@hook analyze(context, target, band,
  handTool, param)` / `measure(context, target, instrument, band, param)` /
  `benchRead`; rows at `<root>/idea/reading/<channel>.yaml` warmed by
  `ReadingCatalogue` on the infix. `temperature.yaml`: `scope: [subject,
  here]`, `subjectRequires: [ThermalMixin]`, `instrument: thermometry`,
  `eyeCeiling: competent`, **no `handTool`**;
  `TemperatureReading.analyze` (l.60) words by `feelOf`/`crudeFeelOf`.
  `C/trade-coopering/…/reading/capacity.yaml` + `CapacityReading.ts`
  (`GovernmentApi.subjectTo(place)`, the `gauger` seat writes the gauge of
  record). `K/platform/idea/Government.ts` `GovernmentStandard {key,
  value: number, unit}`; Terminus declares `cask 25 L`
  (`C/platform/…/Government/terminus-city.yaml:49`).
- Sound: `K/lib/perception/Audible.ts` `emit({db, character…})` →
  `Scene.toAudible` (`K/lib/message/Scene.ts`); `SoundModality.signalAt`
  walks containment, boundary conduits and doorless exits (`MAX_HOPS`).
  Composers: `Whistle`, `Whetstone`, the medical kits, `LightningStrike`.
- Keys: `K/lib/credential/Credential.ts` `KeyEntry {keyway, technology}`
  (l.296), `KeyCredential.addKey(keyway, technology)` (l.341);
  `K/lib/lock/Lock.ts` `{keyway, technology}` + `mintKeyway`;
  `K/platform/thing/Key.ts` = `CredentialWallet(Good)`, born with an empty
  `key` credential filled at issuance. ⭐ The keyway is readable off a key's
  wallet, so an impression can carry it.
- Retail: `K/lib/retail/Stock.ts` `StockLine {itemTemplatePath, par,
  brandKey?, from?, pricing?, buys?}` (l.74), `from` is ONE of `{supplier}`
  | `{store}` | absent (= import, cloned to par at `reset()`), decoded by
  `sourceOf` (l.209). **No local-first-with-import-backstop shape.**
  `C/terminus/…/general-store/counter.yaml` l.151 `honey-jar par 4`;
  `C/terminus/…/wharfside/chandlery/thing/counter.yaml` l.39–40
  `soft-soap-jar par 4`, `lye-flask par 4`; ⚠ **no plant-pot line exists
  on any counter** (the requirements' "the general store's plant pots" is
  a line this build ADDS, not re-points). Market:
  `C/terminus/…/market/square.yaml` (a `Street`, props `stalls`),
  `stalls.yaml` (`/world/terminus/market/thing/MarketStalls`, `pitches 12`,
  `rentMinor 5`), `thing/stall.yaml` (the rented `Stock` seed, keyed on the
  pitch). The potter does NOT rent a pitch: a fixed stall is its own
  `Stock` row propped on the square (the fish-stall precedent,
  `thing/fish-stall.yaml`).
- Weather: `K/api/weather.ts` `dailyRangeAt(site, locality, dayStartS) →
  {minK, maxK}` (l.236), `seasonAt` (l.227), `snowCoverAt` (stateless,
  walked back) — the shape a freeze-thaw count takes. `climate.yaml`: at
  the realm default (42°, which the Delight zone inherits — its row
  authors no latitude) the winter quarter averages ≈ 274 K and the coldest
  dawn ≈ 268.5 K, so **the Delight crosses freezing in winter**. The only
  freeze-thaw reader is `K/lib/husbandry/Producing.ts:412` (yesterday
  only).
- People and places: `C/rejection/…/rejection/agent/{glassblower,
  smelterman, collier, storekeeper}.yaml` and `idea/{glasshouse-business,
  smelter-business, fuel-yard-business, provisioning-business}.yaml` exist
  on master (the keepers S10 needs). `C/rejection/…/location/smelter.yaml`
  is a `Locale` (props furnace, crucible, ingot-mould, anvil, tongs);
  `glasshouse.yaml` a `Locale` (props `/stuff/thing/Kiln`); `fuel-yard.yaml`
  a `Locale`; `quarry/pit.yaml` an `OpenWorking`. ⚠ A `Locale` is not
  persistable: a fixture's runtime state (a lining's wear) survives a
  restart only in a `PersistentLocale` (14 rows). `C/hearts-delight/` has
  **no `src/`** (its README forbids code); its works are sub-trees
  (`silk-house/{idea/outfit.yaml, agent/{keeper,hand}.yaml, thing/*,
  location/{floor,walk,offstage}.yaml}`) titled to their outfit in
  `pack.yaml` `requires.title`; the zone is a `CartesianZone` cellSize 20;
  its `package.json` lists 21 content deps (not quarrying, not ceramics).
  `C/terminus/…/wharfside/tinker/idea/round.yaml` is the roster-as-round
  precedent; `src/wharfside/agent/Tinker.ts` = `Cast(Staged(NPC))`.
- Brains: `K/lib/behavior/stokes.ts` (a hand on shift feeds a fire — the
  keeper shape), `restocks.ts` (par sheet → `job post`);
  `C/trade-shopkeeping/src/behavior/{stocks,consigns}.ts` (every act a
  literal verb through `forceCommand`).
- Gates: `lint:template-scans` `CENSUS_AT_LANDING = 43` (no new infix
  scan); `lint:boot-entries` ceiling 85; `lint:counters` kernel counters 4;
  `lint:lib-statics` ceiling 341; `lint:verb-collisions` allowlist;
  `lint:light-sources` clauses (g) `lit:` and (h) fuel+power on every
  burner row; `lint:instrument-args` (declare tool args);
  `lint:reconcile-chains` (a `reconcile*` sampling a temperature must read
  a trajectory); `lint:perishable`; `lint:instanceable` (nothing instances
  `/lib/`, no `container:`, no `hydratorClass:`); `lint:mixin-names`;
  `lint:dossiers` (a `Cast` needs an `archetype`); `lint:openings`;
  `lint:bills`; `lint:untitled`.
- Pack scaffolding: `C/trade-rubber/{pack.yaml (root, requires.title
  holder /compact/trade), package.json (@saxonberg/content-trade-rubber,
  workspace deps), tsconfig.json, vitest.config.ts (callSecPlugin)}`;
  `PackLogic.ts:365` `MANIFEST_KEYS = {id, version, description, root,
  requires, boot, maintainers}`; the discover test asserts **65** today; a
  new pack is added to the root `package.json` + `pnpm install`.
- Wire: `packages/wire/src/harness` exports `Session, declareFile,
  uniqueHandle, expectOk, engagementIdOf, advanceWorldClock`;
  `glass.dirty.wire.test.ts` is the shape; the restart precedent is
  `assembly.dirty.wire.test.ts` l.626–670 (`stopOwnedWorld` /
  `bootOwnedWorld`, run last).

### What does NOT exist (so the build does not go looking)

No heat-work record on any body · no per-piece conversion · no transition
on any material · no faces or coats on anything · no thermal expansion,
acidity, solubility, shard template, form map or leach on `Material` · no
evaporative cooling of a wet object · no freeze-thaw count · no clay
composition good · no green-ware state · no `Thermal` on a lump or a plant
pot · no furnace lining, wear or bill · no crucible wear per melt · no
`turn`/`ring`/`impress`/`mold` verb · no parametric form, no form row · no
impression on a mould · no pour-temperature on a `SetPool` · no survival
check on a transfer · no press beyond a placed weight · no bell · no
`/trade/ceramics` pack · no founding discipline · no potter, brickmaster,
setter, founder seat · no stock backstop · no `size` reading · no
contaminant KIND on drawn water (binary `fouled-water`).

---

## Plan-level decisions

Numbered so the build and the sweep can cite them. Where the requirements
left a fork the lens that chose is named.

- **D1 — ⭐⭐ Heat-work is a face of `ThermalMixin`, not a mixin of its own.**
  M1 says heat-work accrues wherever a thing is hot; the honest host of
  *"this body has been hot"* is the body that has a temperature. A
  separate `HeatWorkMixin` would need a guard to pick its hosts and would
  leave a limestone lump in a bread oven uncounted. So `ThermalMixin`
  gains one persistent runtime record, `heatWork: HeatWorkRecord`
  (`{peakK, aboveS, atmosphere, checkedS, conversions: Record<transitionKey,
  {dose, degree, rung}>, lastTransitionAtS}`), and one private
  `reconcileHeatWork(clock)` called from `reconcileThermal()` **after**
  `reconcilePhase()`, outside the reentry guard, with its own guard (the
  phase pass's precedent). It does nothing — one lookup answering no —
  unless the body's material declares `heatTransitions`. The dose is
  integrated off the body's **own** `temperatureTrajectory(checkedS, nowS)`
  (`Piecewise.integrate(T ↦ 10^((T−ref)/zK), 8)`, bounded by the ring's
  horizon — silk's `boilHeldSeconds` idiom and `ThermalDose`'s integrand),
  so a brick in a clamp, a pot in a house fire and a crucible in a furnace
  are one rule. *Decided by* lens 1 (the lesson is that heat-work is a
  dose) and the owner's M1.
- **D2 — ⭐⭐ `Crosslinking` generalizes into `HeatTransition`; no second
  path.** `git mv K/lib/material/Crosslinking.ts → HeatTransition.ts`.
  `HeatTransitionSpec {key, referenceK, zK, fullDoseS, massRetained?
  (default 1), agent?, agentOptimum?, agentOver?, scorchAboveK?,
  volatiles?: {material, litresPerKg}[], ladder: {atDegree, becomes}[],
  over?: string, scorched?: string, reducing?: string}`. `degree` is
  rubber's formula unchanged; the four rubber rows map onto `ladder:
  [{0, raw-rubber}, {0.6, rubber}]`, `over: ebonite` (agent ≥ `agentOver`),
  `scorched: burnt-rubber` (peak ≥ `scorchAboveK`). Clay is a continuous
  ladder (`terracotta 0.15 · earthenware 0.4 · stoneware 0.7 ·
  refractory 0.95`, `over: clinker`, `reducing` → the blue/celadon twin of
  each rung by a `reducing:` map on the rung); limestone is `[{0,
  limestone}, {1, quicklime}]`, `massRetained 0.56`, `referenceK 1170`;
  gypsum → plaster at 420 K, `0.85`; a glaze slip fuses at its maturing
  heat; the glass batch → glass at 1400 K, `0.72`; wood → charcoal at
  650 K, `0.25`, `volatiles: wood-tar 0.08`; coal → coke, tar + gas. A
  firing that stops part-way leaves `degree < 1` on the record — ⭐ the
  **piece's material swaps only at a rung**, and between rungs the piece
  reads *"burnt to the skin, raw at the heart"* and its mass is
  `raw·(1−degree) + raw·degree·massRetained`. `Material.crosslinking` is
  deleted (one field, one rubber row, one test file re-pinned).
- **D3 — The atmosphere is the heat source's `completeness()`,
  time-weighted while the body is above its first threshold.** A
  reducing firing is `atmosphere < ceramics.atmosphere.reducingBelow`
  (0.55, the clamp's banked draught). `ThermalMixin.heatSource()` becomes
  public (sugar's exact signature) so the reconcile can ask the fire its
  completeness per stretch. `BurnerMixin` gains `@hook
  heldTemperatureKFor(body: Stuff): number` (default
  `getHeldTemperatureK()`), which `Thermal.heatSourceK()` asks instead of
  the bare getter — the clamp overrides it by the brick's position (D15).
- **D4 — ⭐⭐ `fire` lights and holds; it decides nothing about the charge.**
  `FireController` is rewritten: `fire <burner> [<draught word>] [for
  <hold>]` → sets the draught (the `draught` verb's five words), refuses
  `no-charge` / `not-lit`, engages the hold (sealed down), and at completion
  calls `getTemperature()` on every content (so each piece reconciles its
  own heat-work, transitions, routes its volatiles and takes the mould
  seam), wears the lining (D19), credits the discipline **of each
  transition that completed** (a material names `discipline` on the spec)
  and narrates what came out by reading each piece's record. `firingsFor`,
  `Firing`, `cureOf`, `stampCure`, `massYield`, the plain clone branch and
  `recordHeat(recipe…)` are deleted; the soil of the firer and the dry-heat
  stamp on Soilables stay, reading the ACTUAL peak and hold off the
  record. The mould seam stays: a piece whose transition reaches a rung
  while it stands in a `Mould` that is not its own cast hands the mould a
  pool (`castInto`) and is destructed — the rubber charge becomes boots
  exactly as today, by the transition instead of the recipe.
- **D5 — Faces and coats compose on `Good`.** `K/lib/material/Faced.ts`
  (`FacedMixin`, requires `Tangible`): `coats: Record<'outside'|'inside',
  CoatLayer[]>` outermost first, `CoatLayer = EnclosureSpec & {state:
  'wet'|'fused'|'crazed'}` (construction's `{material, thicknessM}` reused
  verbatim); `faces()` answers `['outside']` + `'inside'` iff the host is
  `Bulkable` with interior bulk; `outermost(face)` answers the top coat or
  the body's own material; `layCoat(face, material, thicknessM)`,
  `fuseCoats(peakK)` (called by the heat-work reconcile at a rung),
  `crazes()` (thermal expansion mismatch, D11), `holdsWater(face)` (a
  fused, uncrazed coat, or a body whose `porosity()` ≤ the dial),
  `cleansAs()` for cleanliness. State-free until a coat is laid (`{}`);
  the claim it makes of every good — *it has an outside, and something may
  be laid on it* — is true of every good, which is the test for composing
  on the base. ⚠ Not on `Thing`: a wall, a floor and a fixture take paint
  through construction's layers (W7/paint), never through this.
- **D6 — Weeping and evaporative cooling are two kernel reads.**
  `ThermalMixin.evaporativeDepressionK()` = `wetness × (T_air − T_wb) ×
  thermal.evaporation.efficiency` where `T_wb` is
  `Evaporation.wetBulbK()` — a new instance method on the `Evaporation`
  value class; `ThermalRegulation.wetBulbK` is deleted and reads it (one
  formula). It is applied where `ambientTrajectory()` chooses its flat
  ambient (not in `effectiveR`). `BulkableMixin` gains the seep:
  `reconcileSeep()` on read — a vessel whose holder `isFaced` and whose
  `inside`/`outside` do not `holdsWater` loses `porosity() ×
  thermal.evaporation.seepLPerHourPerL` litres per hour to its own
  `wet()`, so the jar's outside stays wet, cools by evaporation, and its
  contents (the vessel's Thermal IS its contents on a `CraftVessel`) read
  cooler than the air. A glazed jar seeps nothing.
- **D7 — The lead leach is a bulk fact, not a maturation one.** The
  requirements say *through `imparts`*; `MaturingMixin.imparts` is aroma on
  a batch clock and composes only on `Vat`, while the crocks the drive
  fills are `CraftVessel`s with no batch. The honest host of *what the
  inside coat gives the contents* is the slot that holds them:
  `BulkableMixin.reconcileLeach()` (per slot, stamped `leachCheckedS` on
  the payload) reads the holder's inside outermost layer material's
  `leaches: {toxin, mgPerLPerDayPerAcidity}[]` × the contents material's
  `acidity` (new `Material.acidity`, 0..1; vinegar 0.9, wine 0.7, whey 0.5,
  brine 0.6, water 0) × days, and adds to `payload.dissolvedToxins`
  (metabolism's own field; `Metabolic.ingest` doses it with no new code).
  No sense reads it. Maturation's `imparts` is untouched. ⚠ Recorded under
  *Risks → needs the owner* as the one place this plan reads a requirement
  loosely.
- **D8 — Brittle, flaws and `ring` live on `Tangible` (the matter rung).**
  `TangibleMixin` gains `flaws: Flaw[]` (`{kind: 'dunt'|'crack'|'casting'|
  'check', visible: boolean, atS}`), `sufferImpact(spec: ImpactSpec):
  Promise<ImpactOutcome>` — the ONE breakage act: `energyJ` vs
  `impactStrengthJ()` = `toughness × volumeFactor × (1 − flawPenalty)`,
  against `spec.surface` (a `Material`; a strewn earth floor absorbs by its
  own `toughness`/`hardness`, flagstone does not) — and `ring(by)`:
  a `brittle`- or `metal`-tagged body emits (`Audible` is NOT composed —
  the act builds the scene through `MessageApi.scene(...).toAudible`
  directly, as `CallController` does) a clear note or a dull one by its
  flaws. Shatter mints `Material.brokenTemplate` (new, authorable;
  default `getCastTemplate()` — glass keeps its cullet) at the body's mass
  and destructs. `DropController` and `ThrowController` route through
  `sufferImpact` (drop energy = `m·g·1 m`; throw energy = the profile's
  joules; `DeliveryProfile.deriveIntegrity` keeps deciding the *projectile*
  on the *target*, and the vessel's own break on arrival becomes a
  `sufferImpact` against the target's material). ⭐ Nothing breaks from
  `put`, `get` or carrying: those never call it. The dorm pot is a
  terracotta row with `mass` that puts its drop energy under its strength.
- **D9 — Thermal shock is judged in the heat-work reconcile.** The same
  trajectory window gives `max |dT/dt|`; a `brittle` body whose rate exceeds
  `thermalShockRateKPerS()` = `k / (thermalExpansion × (1 − grogFraction))`
  (new `Material.thermalExpansion` 1/K; stoneware 6e-6 dense, earthenware
  5e-6 with grog's pores, glass 9e-6) takes a `dunt` flaw, hidden with
  probability ZERO — ⭐ hidden-ness is **derived**: a dunt is visible iff
  the body's `outermost('outside')` is a fused coat (a glaze shows a
  craze line) or the crack reached a rim (the last 20 % of strength);
  otherwise only `ring` finds it. No roll (uncertainty.md).
- **D10 — The freeze-thaw count is `WeatherApi.freezeThawDaysAt(site,
  locality, fromS, toS)`**, stateless over `dailyRangeAt` per day
  (`minK < 273.15 < maxK`), the `snowCoverAt` shape; and
  `AtmosphericMixin.freezeThawDaysSince(atS)` answers it for a place, **0
  when `exposure().holdsAir()`** (a heap indoors stops counting). Readers:
  the clay heap (D12); frost on green ware (D13); W7 is the third.
- **D11 — Thermal expansion, acidity and the shard template are `Material`
  fields; porosity is DERIVED.** `thermalExpansion`, `acidity`,
  `brokenTemplate`, `leaches`, `formTemplates`, `chillsTo`, `cureSetting`,
  `filteredTo` (W8), `solubility` + `crystallizesTo` (W8), `heatTransitions`
  — each `persistent, authorable`, appended at the end of `fieldMeta`.
  A fired body's porosity is `body material wAC × (1 − degree)` read off
  the heat-work record (terracotta weeps, stoneware does not), so no row
  authors a porosity. Crazing: at a coat's fuse the coat's
  `thermalExpansion` is compared with the body's; a coat that shrinks more
  by over `faces.crazeMismatch` (1.5e-6) is laid `crazed`.
- **D12 — ⭐ Clay is `/trade/quarrying/thing/Clay`, minted by `dig`.**
  `C/trade-quarrying/src/thing/Clay.ts` = `CompositionMixin(WaterActivityMixin(
  ThermalMixin(StackableMixin(Good))))` (potash's `Ash` shape plus water and
  heat): `getEffectiveComposition()` is the material's kind-composition
  (a deposit's clay row authors `composition: [{clay-mineral, 0.55}, {iron-
  oxide, 0.06}, {lime, 0.03}, {sand, 0.3}, {organic, 0.06}]`) plus what was
  kneaded in (`alloying`: sand, grog, breeze); `plasticity()`,
  `firedColor()`, `refractoriness()`, `crackRisk()` are methods reading
  it; `weatheredDays` (persistent) is advanced on read by the heap's
  place's `freezeThawDaysSince(stamp)` up to `ceramics.weathering.ceilingDays`
  (40) and raises `plasticity()`; `mergeStacks` mass-weights `alloying` and
  `weatheredDays` (Ore's `onMerged` precedent); `analyze clay` words it.
  The clay MATERIAL rows live with their deposits: `/stuff/idea/material/
  earth/clay` stays Rejection's quarry clay (gains a `composition`),
  `hearts-delight` ships `…/hearts-delight/idea/material/alluvial-clay.yaml`,
  `rejection` ships `…/idea/material/fireclay.yaml` and `gypsum.yaml` and
  two new bands on `quarry-hill.yaml` (fireclay −10 … −10.4 under the coal,
  gypsum −6.5 … −6.8 above the limestone). *Why quarrying owns the class:*
  the burner mints ash so fuel owns `Ash`; `dig` mints clay. `Lump` gains
  `ThermalMixin` so limestone burns under D1.
- **D13 — Green ware is a kernel mixin: `K/lib/material/Greenware.ts`.**
  `GreenwareMixin` (requires `WaterActive & Thermal & Tangible & Faced`):
  `state()` = `plastic` (moisture > `ceramics.green.plasticAbove` 0.22) ·
  `leather-hard` · `bone-dry` (< 0.08); `reconcileGreen()` on read: rain
  (`getWetness()` rising while plastic or leather-hard → `slumped`), frost
  (the place's air trajectory below 273 K while moisture > bone-dry →
  `shattered`, via `sufferImpact` with a frost spec), drying too fast
  (`advanceMoisture`'s rate × `crackRisk()` of the body's composition ×
  wall unevenness > the dial → a `crack` flaw); `canTrim()`, `canJoin()`,
  `canStamp()` are `leather-hard`; `isFireable()` is `bone-dry` (a wet piece
  in a kiln `shatters` on the first reconcile above 373 K — the steam
  burst, no special case). The two packs that compose it (ceramics' ware,
  dairying's `SettingPan`) have no common pack ancestor, which is the
  kernel test. Shrinkage: the brick mould row is authored oversize
  (`castTemplate` mass and the form's `greenScale 1.08`).
- **D14 — ⭐ `shape`, `knead`, `dip` and `carve` are promoted to the
  platform behind protocols; the incumbents implement them.** The
  collision ladder's rung 2, applied to each word with the one-verb-per-act
  test (does one controller serve both without narrowing on the target?):
  - `shape` — forming a plastic material into a form by hand with an
    instrument. `K/lib/craft/Shapeable.ts`: `ShapeRequest {actor, material:
    Stuff, form: ParsedForm, instrument: Stuff | null, tools}`; the
    INSTRUMENT plans (`ShapePlanner.shapePlanFor(material, req)` — the
    wheel, the brick table, the blowpipe), else the MATERIAL plans
    (`Shapeable.shapePlan` — hands). `Gather.shapePlan` is glass's two forms
    word for word; `Clay.shapePlan` resolves the word (D16). View
    `platform/cmd/crafting/shape.yaml`: `material` (`requires: any`,
    greedy), `form` (greedy string after `into`), `instrument` (`with|on|at`,
    default `reachable:[mixin.ToolMixin]`), options `holding <qty>` and the
    proportion words. Glass's view and controller are deleted; `Blowpipe`'s
    `HOT_SHOP` names the platform view. ⚠ **`shape bottle` must keep
    working word for word** — the parser accepts a bare form word with no
    material when exactly one shapeable material is in hand.
  - `knead` — working a plastic mass by hand to a window.
    `K/lib/craft/Kneadable.ts` (the Cuttable shape); `DoughTrough` implements
    `kneadPlanFor` (its `mintFromBuild` moves into the plan's `onComplete`);
    the temper pit implements it for clay (water in, sand and breeze from
    reach, to the window). Baking's view and controller move to the
    platform (the `dry` precedent).
  - `dip` — laying a coat from a bath. The BATH plans (`DipPlanner.
    dipPlanFor(target, req)`): `DipPot` (chandlery) keeps the candle; the
    kernel default on any `Bulkable` bath whose material carries `coats:
    true` lays `outermost` a wet coat of the bath's material on the
    target's named face (`dip crock inside` / `outside`, default both)
    at `faces.dipThicknessM`. The paint slate's reservation is honored.
  - `carve` — cutting away to a form with an edge. The TARGET plans
    (`Carvable.carvePlan`): a leather-hard ware plans a trim/foot/pattern;
    carpentry's `Board`/`Blank` plan by their recipe lookup (`isCarving`
    moves onto them); a pattern blank plans an oversize pattern (`carve
    pattern of <thing>` → a `Pattern` good carrying the thing's `Impression`
    scaled by the metal's shrinkage, D22). Carpentry's view and controller
    move to the platform.
  - `hammer` is NOT promoted: `hammer <blank> on <die>` binds `on` to the
    smithing view's existing `anvil` arg; the smithing forming step's
    completion asks the bound `anvil` whether it `strikes` (a `Mould` with
    `pressKind: blow` — the structural-probe shape, like `receiveVolatiles`)
    and calls `die.strikeWith(blank, blowJ)`; a plain anvil answers nothing.
    `impress die on blank` is the same act said the universal way (D21).
  *Decided by* lens 2 (one word, one model, extensible by rows) and the
  one-verb-per-act test (none of the four controllers narrows on its
  target — each asks the thing that knows).
- **D15 — The clamp is a `Burner` whose held heat varies by position.**
  `C/trade-ceramics/src/thing/BrickClamp.ts` = `ContainerMixin(Firebox)`
  (the charcoal clamp's chain; a row of its own, NOT a `CharcoalPit` — that
  would afford `char`). It overrides `heldTemperatureKFor(body)`: the
  charge is banded by the setter's competence (`setBy` identity stamped at
  the first `put`; band → channel share `ceramics.clamp.channelShare[band]`)
  into **three stacks** at `fire` time (`Stackable.split`): fire-channel
  (× `ceramics.clamp.channelFactor` 1.25), middle (× 1), skin (× 0.8,
  minus rain `getWetness()` and wind). Each stack integrates its own
  heat-work (D1) and comes out over-burnt / well-burnt / place by the clay
  ladder's rung, with `absorption()` derived (D11). A reducing draught
  (D3) gives the ladder's `reducing` twin (blue). It glows at night
  (`LightSource`, inherited) and smells (`combustionProducts` of its fuel —
  already the fire build's). The pit firing is a row on the same class.
- **D16 — ⭐ Forms are parametric; words are rows; the material names its
  product rows.** `K/lib/craft/Form.ts` value object: `ParsedForm {class:
  open|closed|flat|block|cone, capacityL, proportion: tall|squat|wide|
  narrow, word?}` parsed from the `form` string (`mug`, `tall jug holding
  3 pints`, `jar holding 2 gallons`). A form WORD is a row `<root>/idea/
  form/<word>.yaml` (`K/platform/idea/Form.ts`: `key, class, capacityL,
  proportion, product?, seats?: ['handle'], greenScale`) resolved **by
  path** from the instrument's `forms:` list (the wheel row lists
  `/trade/ceramics/idea/form/{mug,jug,jar,crock,bowl,plant-pot,crucible,
  flask,sugar-cone}` and `/trade/dairying/idea/form/setting-pan`) — load on
  use, no scan; a bare parametric form needs no row. The product template
  is the form's `product`, else the clay MATERIAL's `formTemplates[class]`
  (`Material.castTemplate`'s shape — the Delight's clay row names
  `/trade/ceramics/thing/{vessel,jar,dish,block,cone}`). Competence
  (`competenceBandFor('pottery')`) decides deterministically: wall mass
  = form nominal × `ceramics.wall.factor[band]` (novice 1.6 … masterful
  0.8), the largest `capacityL` = `ceramics.wall.maxL[band]` (refused above
  it, naming the band), grade = band − 1. At the brick table the plan is a
  game-day engaged step whose `onComplete` mints `rate[band] × hours`
  bricks as one stack (`Brick`, D17), consuming clay mass; on the wheel one
  pot. ⭐ The mint calls `followCustody()` and `PersistableApi.captureHostOf`
  (the `fell` precedent) — the craft-mint defect must not reach green ware
  on the hacks.
- **D17 — The pack's classes.** `C/trade-ceramics/src/thing/`: `Brick` =
  `GreenwareMixin(StackableMixin(DurableMixin(CraftedMixin(ThermalMixin(
  Good)))))` — bricks, tiles, firebricks, blocks are rows; `Ware` =
  `GreenwareMixin(AssembledMixin(DurableMixin(CraftVessel)))` (⭐ `Assembled`
  so `fit handle to jug` binds — `CraftVessel` composes neither) — mugs, jugs, crocks, jars,
  flasks, bowls, the filter, the crucible row (`/trade/ceramics/thing/
  crucible`, which the smelt's `crucibleIn` finds by mixin exactly as today
  and which **wears per melt** (D19)); `Cone` = `GreenwareMixin(Mould)`
  (sugar's cone re-points its class to it so a potter can make one; the
  row stays sugar's); `FlowerPot` = `GreenwareMixin(ThermalMixin(DurableMixin(
  PlantPot)))`; `Sherds` = `StackableMixin(Good)` (`grind` → grog by a
  millstone recipe row, the `bone-meal` shape); `Stamp` = `MouldMixin(Good)`
  with `pressKind: blow` and an `Impression` (D21); the pack `lib/` holds
  nothing — every mixin it composes is the kernel's. ⚠ `Ware` and `Brick`
  are NOT the 22 rows' classes: those keep their classes and re-point
  `_materialPath` + `coats:` (D18).
- **D18 — S1 re-pointing is rows: material + coats, classes unchanged.**
  Four body material rows in `C/trade-ceramics/content/trade/ceramics/idea/
  material/{terracotta,earthenware,stoneware,fireclay-body}.yaml` (the
  fired bodies, each with `thermalExpansion`, `hardness`, `toughness`,
  `wAC`, `brokenTemplate: /trade/ceramics/thing/sherds`, tags `[ceramic,
  mineral, solid, brittle, fired, …]`) and `porcelain.yaml` (import). Each
  of the 22 rows gets `_materialPath` → its S1 body and, where glazed,
  `coats: {inside: [{material: /trade/ceramics/idea/material/glaze/lead|
  ash, thicknessM: 0.0003, state: fused}], outside: [...]}`. The generic
  `ceramic/ceramic.yaml` stays for the 19 location rows and gains honest
  `hardness 50`/`toughness 6` so a thrown saucer no longer always
  shatters. The six packs whose rows re-point add no dependency: a row
  naming a material path is a content reference, and `trade-ceramics` is a
  dependency of the realm packs that prop the rows (`rejection`,
  `hearts-delight`, `terminus`) — install order is what the path needs.
- **D19 — ⭐ A lining is an assembly PART LINE on a chamber furnace.**
  `Oven`, `SmeltingFurnace` and `Retort` compose `AssembledMixin(DurableMixin(
  …))` (⛔ not `Firebox`: a lamp and a campfire have no lining). A furnace
  row authors a `bill` with a `lining` line (`part: lining, count: N,
  members: firebrick, joint: /platform/idea/Joint/dry-laid`) and a
  `liningRefractoryK` ceiling. `BurnerMixin.@hook heatCeilingFactor()`
  reads the lining line's condition (`1` with no line; `0.6 + 0.4 ×
  condition` with one; **refuses `ignite` at `isBroken`** through the
  existing ignite refusal path). The `fire` completion wears the line by
  `held/refractory × hold/ceramics.lining.refHoldS` (`wearLine`). `fit
  lining to furnace` is the shipped replace arm (firebricks in reach, the
  `masonry` discipline on the joint row). Crucibles: `Ware` with a
  `crucible` row wears `wear(ceramics.crucible.wearPerMelt)` from
  `SmeltController.runIntoCrucible` (one line in the smelting pack), reads
  *worn* and **cracks** (a `crack` flaw at `isBroken` — it holds nothing).
  ⚠ "Wear runs only where firebrick is sold": a furnace row with no `bill`
  wears nothing; the bills ship only on the six furnaces whose realm has
  the firebrick line (Rejection's store counter, W5) and the brickfield.
- **D20 — The keeper relines by a pack brain, `relines`.**
  `C/trade-ceramics/src/behavior/relines.ts` (`kind: work`, `claims:
  [hands]`, config `{furnace, source}`): on shift in the furnace's room, when
  the lining line's condition < `ceramics.lining.relineBelow` (0.4), it
  runs the literal verbs: buy firebricks at the configured counter by the
  `restocks` par-sheet shape (`job post` the shortfall; the house pays),
  then `fit lining to <furnace>`. Attached to the glassblower (glasshouse
  kiln), the smelterman (furnace), the collier (retort), the storekeeper
  (limekiln) by `behaviors:` on their rows; the rosters already put them on
  shift. ⚠ The roster tick only runs for a loaded business, so drive step
  14 visits the glasshouse first and then jumps time; no boot entry.
- **D21 — ⭐ Impressions and the one `impress` verb.** `K/lib/mould/
  Impression.ts` value object `{kindPath, volumeL, formDescription,
  partsDescription, takenFromIdentity, takenAtS, carried: {keys?:
  KeyEntry[], seal?: string}}`; `MouldMixin.impression: Impression | null`
  (persistent) — a mould with one casts `kindPath` in the poured material
  at `volumeL × density`, one piece, `look` says *a <material> cast of a
  <kind>* with seams and *taken from <whose>*; name, mark, grade, seat,
  history never copy (the clone is a fresh row). Carried function: a
  `Key` cast gets `addKey` for each carried entry (the keyway IS shape);
  a seal matrix's impression carries its `seal` token. **`impress <thing>
  in|on <medium>`** (platform, `cmd/crafting/impress.yaml`, alias `mold`):
  the MEDIUM plans (`Impressible.takeImpression(pattern, actor)`): a
  `Mould` with an empty cavity takes an `Impression` (a sand flask, a wax
  block, a plaster slurry about to cure); a `Greenware` body at
  leather-hard takes a MARK (`Crafted.mark = the stamp's impression's
  `takenFromIdentity`; the base reads maker and, after firing,
  `heatWork.lastTransitionAtS` as the date); a hot metal blank on a die
  takes the die's shape (D14's `strikeWith`). `impress` of a face mints a
  likeness and nothing more (no belief write anywhere — asserted in a
  test).
- **D22 — The pour's physics live in `MouldMixin.castInto` and the
  transfer.** `SetPool.temperatureK?` (the freeze edge passes the pool's
  temperature; the fill records `pourSuperheatK` through
  `mould.receivedPour({temperatureK, litres})`, called from
  `BulkableLogic.transfer` after the thermal coupling). At the set:
  **misrun** iff `pourSuperheatK < ceramics.pour.misrunK × (A/V)` where
  `A/V` derives from the shape (`6 × (volumeL)^(−⅓) × formFactor[class]`)
  and the mould's conductivity (`k_mould / k_sand`); **shrinkage** (porous,
  grade −1) iff the mould row authors no `riser: true`; **chill**: the metal's
  `chillsTo: [{mouldConductivityAbove, becomes}]` arrow swaps the cast's
  material (cast iron → white in iron, grey in sand); a **damp** mould
  (`getWetness() > ceramics.pour.blowWetness` 0.3) ruins the cast (a lump)
  and `ConditionApi.inflict({mechanism: 'heat', …})` on the pourer (the
  shipped touch-burn route). **Survival**: `TangibleMixin.canReceiveAtK(k):
  'holds'|'melts'|'burns'` reads the receiver's `meltingPoint` /
  `autoignitionTemperature`; `BulkableLogic.transfer` asks the receiver
  BEFORE the debit and, on `melts`/`burns`, pours onto the room's floor
  (the shipped puddle path) and destructs the receiver into its
  `brokenTemplate` (melt) or ignites it through `FireApi` (burn) — for
  every vessel, closing mould.md's finding. A competent founder reads the
  signs in advance through `analyze temperature <crucible>` (incandescence
  words) and `analyze wetness <flask>` (the cleanliness read).
- **D23 — Consumed moulds, the pattern, two-piece.** A sand flask
  (`/trade/smelting/thing/flask`, a `Mould` row with `reusable: false`,
  material `moulding-sand`, `castTemplate: null` — it casts only an
  impression) is broken at the cast (the shipped consumed path) and leaves
  its sand (`brokenTemplate: /trade/smelting/thing/moulding-sand`, a bulk
  heap re-tempered by `knead`); a wax block (`/trade/chandlery/thing/wax-
  block`, consumed) returns as wax to the pourer's room (`brokenTemplate`
  wax); plaster (`/trade/ceramics/thing/plaster-slurry` bulk → cures by
  `Material.cureSetting {minutes, becomes: plaster}` on `reconcileSetting`
  — the third set process — into a plaster `Mould` whose `castInto` drinks
  slip (D24)). A `Pattern` (`carve pattern of <thing>` → `/trade/carpentry/
  thing/pattern`, a `Good` carrying an `Impression` scaled `1 + shrinkage`
  of the metal named at carving) is what `impress pattern in flask` reads.
  A two-piece mould is a `Mould` row with a `bill` of two halves and a
  `freely` joint — an assembly, worn and mended as one; draft is a form
  flag (`undercut: true` on a form or impression) that a one-piece reusable
  mould refuses at `castInto` (*it will not draw*).
- **D24 — Slip casting is the drain set with the mould as the sink.**
  `Material.drainSetting` gains `absorbedByMould?: true`; `reconcileSetting`
  credits the driven-off water to the MOULD's own `wet()` instead of
  `creditDrainings` (a separate branch above sugar's), and the set rate
  scales by `(1 − mould.getWetness())` — a wet plaster mould drinks slower.
  The slip material (`/trade/ceramics/idea/material/slip`) authors it; a
  cup releases as the clay's cast (a `Ware` row by the mould's
  `castTemplate`) at leather-hard moisture.
- **D25 — Pressing is one load from three sources on `Mould.loadN()`.**
  `loadKg()` becomes `loadN()`: placed weight × g + a screw press's force
  when the mould is placed ON one (`K/platform/thing/ScrewPress` =
  `PlacingMixin(Good)`, `turns`, `newtonsPerTurn`; **`turn <press>`** is a
  new platform verb, `cmd/device/turn.yaml`, over a `Turnable` protocol so
  a windlass can take the word later) + a blow (`strikeWith(blank, blowJ)`
  → an instantaneous load). `pressRelease()`: a charge with green strength
  (`Greenware.state() !== 'plastic'`… i.e. tempered clay at the window,
  butter, a pressed tile) is cast at once (`castInto`) and the cast leaves
  the mould to the mould's container (shape-and-release) — the hoop's
  cheese stays (its material drains, no green strength). Hearts-delight's
  creamery gets a screw press row beside its stone.
- **D26 — Bells are `trade-smelting`'s.** `C/trade-smelting/src/thing/
  Bell.ts` = `CraftedMixin(ThermalMixin(Good))` (+ `Composition` for the
  alloy) with `pitch()` = `ceramics.bell.pitchRef × (massKg)^(−⅓) ×
  f(alloy)` in words and a named note, `ring` (D8) emitting at `db =
  60 + 10·log10(massKg)` across the acoustic walk (a hop per 10 dB over
  the threshold); a crack flaw dulls it. The hand bell casts in a flask;
  the large bell in `/trade/smelting/thing/bell-pit` — a **fixed `Mould`
  thing** (`fixedInPlace`, loam, `castTemplate: large-bell`) in the foundry
  yard; the pour into it is a game-day engaged `pour` (the mould row's
  `pourDurationS`). ⚠ The requirements say *the mould is a place*; a fixed
  mould you stand at is what the engine can say today (a Location
  composing `Mould` would need `Bulkable+Thermal` on a place) — recorded
  under *needs the owner*. The Terminus curfew bell is a row propped on
  the square, hung (`fixedInPlace`), anyone rings it.
- **D27 — Recast and interchangeable.** `salvage` of a cast whose material
  melts already returns a pool (`salvageImpl` l.3998 — a meltable
  non-metal at 1.0, a metal at the rate); fired clay salvages to `sherds`
  by `brokenTemplate` (one branch in the non-meltable arm). A part cast
  from an impression carries `Impression.kindPath`; `AssembledMixin`'s
  replace arm skips the joint's re-make (no instrument, no band) when the
  incoming member's impression kind equals the line's part kind — that IS
  interchangeability, derived, no new field; `interchangeable` as an
  authored joint flag stays the assembly tail's.
- **D28 — ⭐ The stall and the backstop.** `StockLine.from` gains a third
  shape, `{supplier, importBackstop: number}`: the reset sweep clones from
  nothing up to par **only when the supplier's counter holds none** (the
  supplier business is authored; its counter is read on use), and
  `Stock.priceOf(item)` multiplies by `importBackstop` for an item with no
  `maker` — ⭐ an import is derivably *a good nobody here made*. The
  potter's stall (`C/terminus/…/market/thing/potters-stall.yaml`, a fixed
  `Stock` propped on the square, `from: {supplier: the Delight pottery}`)
  and the re-pointed lines (general store: a NEW plant-pot line →
  `/trade/ceramics/thing/plant-pot`; chandlery: `soft-soap-jar` and
  `lye-flask` → the pottery's `jar` and `flask` rows; apiculture's
  `honey-jar` → the pottery's `jar`) all name the pottery as supplier with
  `importBackstop: 1.5`. The potter NPC's `pots` brain (pack) shapes,
  dries, fires and consigns.
- **D29 — Four disciplines, credited by acts.** `/trade/ceramics/idea/
  Discipline/{brickmaking, pottery, masonry}.yaml` and `/trade/smelting/
  idea/Discipline/founding.yaml` (ISCED-F 0722 — materials; founding
  `specializes: [smelting]`). Credit comes from: a transition's own
  `discipline` (clay → pottery or brickmaking by the form's trade;
  limestone → quarrying; glass → glasswork), a form row's `discipline`
  (`shape`), the lining joint's (`fit lining` → masonry), the mould's
  (`pour` into a flask → founding — the shipped mould credit), `impress`
  and `ring` credit nothing. No recipe row anywhere credits a firing.
- **D30 — `measure size` is a pack reading over the polity's standards.**
  `/trade/ceramics/idea/reading/size.yaml` (`subjectRequires:
  [TangibleMixin]`, `instrument: gauging`, `discipline: brickmaking`) +
  `SizeReading.ts`: the brick's form dimensions (from its form row or its
  `Impression`) against `Government.standards` keys `brick-length`,
  `brick-width`, `brick-depth` (Terminus declares 9 × 4½ × 2¼ in); a
  gauger seat's reading is of record (the capacity precedent). A standard
  measure jar is the same reading on `capacity` (already shipped).
- **D31 — Kiln heat reads the potter's way.** `temperature.yaml` gains
  `handTool: pyrometry`; `TemperatureReading.analyze` adds incandescence
  words above 800 K (*dull red · cherry · orange · yellow · white*) for a
  Burner subject and, with cones in reach (`/trade/ceramics/thing/
  pyrometric-cones`, a `Tool` with `capabilities: [pyrometry]`, consumed a
  cone per read), the cone band at the proficient ceiling. The heat-work
  record reads on `look` (*bisque, porous* · *vitrified* · *burnt to the
  skin, raw at the heart*) and `analyze heat-work <piece>` prints the band.
- **D32 — W8 converges on sugar.** Crystallizing is a third arm of
  `reconcileBulkPhase`: a bulk whose material authors `solubility:
  [[K, kgPerL]…]` and whose payload `dissolvedSolidsKgPerL` (sugar's)
  exceeds `solubilityAt(T)` sets the excess (`castInto` on a Mould, else a
  crystal lump beside) and keeps the saturated liquor, whose material swaps
  by `crystallizesTo.residue` (bittern) and drains below through sugar's
  `drainsInto()`. The sun-dried `brine` evaporative profile is kept and
  taught to rescale `dissolvedSolidsKgPerL` as it concentrates (one line
  in `reconcileEvaporativeWindow`). The filter: `/trade/ceramics/thing/
  water-filter` = `PercolatingMixin(Ware)` (sugar's kernel mixin);
  `onPercolated` swaps the percolant's material by `Material.filteredTo`
  and the clean water lands in the vessel below. The water pack's draw
  picks `fouled-water` (organic/sediment dominant; `filteredTo: water`,
  `purifiedByBoiling: water`) or a new `tainted-water` (persistent
  dominant; neither arrow) by the reach's `contamination.byKind` — two rows
  and one branch in `WatercourseCatalogue`'s draw. The whole wave is gated
  on sugar being on master or merged into this branch.

## ⭐⭐ Host placement

Every new field, mixin and class, with what composing it claims of
everything else on that host. ⭐ The test applied to each: if a reader
would need a guard to re-narrow the host set, the host is wrong.

| new thing | host | what composing it claims | why not the alternative |
|---|---|---|---|
| `heatWork` record, `reconcileHeatWork()`, `heatSource()` public, `evaporativeDepressionK()` | `ThermalMixin` | every body with a temperature has a heat history and cools faster when wet — true; inert (one lookup) when its material declares nothing and it is dry | a `HeatWorkMixin` needs a guard to choose hosts; a limestone lump in a bread oven must count |
| `@hook heldTemperatureKFor(body)`, `@hook heatCeilingFactor()` | `BurnerMixin` | every fire may answer a different heat for a different body (default: the same), and may be ceilinged by its vessel (default: not) | the clamp and the lined furnace override; a lamp inherits the defaults |
| `heatTransitions`, `thermalExpansion`, `acidity`, `brokenTemplate`, `leaches`, `formTemplates`, `chillsTo`, `cureSetting`, `filteredTo`, `solubility`, `crystallizesTo` | `Material` (singleton rows) | a material may say what heat, cold, a knock, an acid or a mould does to it; unauthored = nothing happens | per-instance copies would be the `Freshness on every Thing` shape |
| `FacedMixin` (`coats`, `faces()`, `outermost`, `layCoat`, `fuseCoats`, `holdsWater`, `cleansAs`) | `lib/stuff/Good` | every good has an outside that something can be laid on; a vessel has an inside | on `Thing` it would claim it of walls and floors, which take paint through construction's layers |
| `flaws`, `sufferImpact()`, `impactStrengthJ()`, `ring()`, `canReceiveAtK()` | `TangibleMixin` | every piece of matter can be struck, can carry a hidden flaw, can be rung, and can or cannot take a pour's heat — all true, all derived from its material | on a `Brittle` mixin the host set is a tag the material already carries |
| `reconcileLeach()`, `reconcileSeep()` | `BulkableMixin` | what holds a liquid may give it something from its inside face and may lose it through a porous body — true of every slot; inert when the holder is not `Faced` or holds water | on `Maturing` it misses every crock that has no batch |
| `GreenwareMixin` | kernel `lib/material/Greenware.ts`; composed on `Brick`, `Ware`, `Cone`, `FlowerPot` (ceramics), `SettingPan` (dairying) | a plastic body whose moisture decides whether it can be trimmed, joined, stamped or fired, and whether rain and frost ruin it | the 22 shipped rows are born fired and do not compose it |
| `weatheredDays`, `plasticity()` … | `/trade/quarrying/thing/Clay` | a clay lump remembers its winters and its temper | on `Lump` it would claim it of limestone |
| `Thermal` on `Lump` | `/trade/quarrying/thing/Lump` | a lump of stone has a temperature — true, and limestone must burn | — |
| `Thermal` + `Durable` on `FlowerPot` | `/trade/ceramics/thing/FlowerPot` (over kernel `PlantPot`) | a flower pot made by a potter is fired, wears and breaks | the kernel `PlantPot` stays bare for the farm's own fixtures |
| `AssembledMixin(DurableMixin(…))` | `Oven`, `SmeltingFurnace`, `Retort` | a chamber furnace is made of parts, one of which is a lining that wears | on `Firebox` it would claim a lining of a lamp and a campfire |
| `impression`, `receivedPour()`, `pourSuperheatK`, `loadN()`, `pressRelease()`, the envelope reads | `MouldMixin` | a mould may be shaped by a thing, judges the pour it took, and may be loaded by a press or a blow | — |
| `Impression` value object | `lib/mould/Impression.ts` | a shape copied from a thing, never its identity | — |
| `freezeThawDaysSince(atS)` | `AtmosphericMixin` (a place) | a place knows how many times its air crossed freezing, and a place that holds its own air says 0 | on the heap it would be a clock the heap cannot reconstruct after a move |
| `freezeThawDaysAt` | `WeatherApi`/`WeatherLogic` | stateless, like snow | — |
| `canBeNamedBy(handPath)` | `NamedMixin` (default false); overrides on `Crafted` (its maker, once, while unnamed), `Assembled` (super ∥ the reforge rule), `Bonded` (the bond rule) | the thing that holds a name decides who may write it | `NameController` today narrows on class to pick the rule |
| `Shapeable`/`ShapePlanner`, `Kneadable`/`KneadPlanner`, `DipPlanner`, `Carvable`, `Impressible`, `Turnable` | `lib/craft/*.ts` protocols (the `Cuttable` shape) | the target or the instrument plans; the kernel controller never names a pack class | — |
| `ParsedForm`, `Form` row | `lib/craft/Form.ts`, `platform/idea/Form.ts` | a form is five classes × a capacity × a proportion; a word is a row | — |
| `ScrewPress` | `platform/thing/ScrewPress` (`Placing(Good)`) | two consumers (creamery, tile works) in two packs → kernel | — |
| `Brick`, `Ware`, `Cone`, `FlowerPot`, `Sherds`, `Stamp`, `BrickClamp`, `Wheel`, `BrickTable`, `TemperPit`, `WaterFilter` | `/trade/ceramics/thing/*` | the trade's goods and instruments | — |
| `Bell`, `Flask`, `Pattern`? (no — `Pattern` is carpentry's), `BellPit` row | `/trade/smelting/thing/*` | founding is smelting's | — |
| `importBackstop` on `StockFrom` | `lib/retail/Stock.ts` | a supplied line may name a dearer fallback | — |
| `relines`, `moulds`, `sets`, `pots` brains | `/trade/ceramics/src/behavior/` | the trade's people | — |

**Findings from the narrowing test (recorded, not coded):**

- `Greenware` on the kernel `PlantPot` was considered and rejected: the
  farm's pots are fixtures that never pass through green; a potter's is
  the pack's `FlowerPot`.
- The lead leach on `MaturingMixin` was rejected (D7): every reader would
  guard on *has this vessel a batch*.
- A `Brittle` mixin was rejected (D8): its host set is the `brittle` tag,
  already on the material.
- `Faced` on `Thing` was rejected (D5): a floor's paint is a construction
  layer.

## Convention conformance (checked at plan time)

- `props:`/`cast:` on every new place row; no `container:` on any row
  (the brick on the hacks is placed by `dry`; the clamp's charge by `put`).
- Locations: `Locale` for the works' rooms; **`PersistentLocale`** for the
  hacks (green bricks persist), the potter's shop (the kiln's lining), the
  moulding shed, the foundry floor, and the four Rejection furnace rooms
  (smelter, glasshouse, fuel yard, quarry pit — ⚠ `pit.yaml` is an
  `OpenWorking`; the limekiln stands IN it, so the limekiln's lining is
  carried by the pit's own persistable ledger — verify `OpenWorking` is
  persistable; it is (`Working.ts` banks a per-face ledger)).
- Namespace roots: `/trade/ceramics` (new pack); founding rows under
  `/trade/smelting`; the pattern under `/trade/carpentry`; the wax block
  under `/trade/chandlery`; the stall under `/world/terminus/market`; the
  works under `/world/terminus/hearts-delight/brickfield`; the foundry
  under `/world/terminus/rejection/foundry`.
- Module scope declares; lifecycles initialize: every catalogue read is
  on use; no module-scope statements.
- Import boundary: the pack imports the kernel by specifier only; the
  kernel never imports a pack (the die-strike probe and `receiveVolatiles`
  are structural).
- Module categories: no new category, no free helper — the protocols are
  interfaces in `lib/craft/`, the value objects (`Impression`, `ParsedForm`,
  `HeatTransition`) are classes with instance methods; **no new public
  static on any `lib/` class** (`lint:lib-statics` 341 holds).
- Verbs on objects: `sufferImpact`, `ring`, `takeImpression`, `strikeWith`,
  `pressRelease`, `receivedPour`, `layCoat`, `canReceiveAtK` are methods;
  no `XApi.verb(host)`.
- A bound arg is `MqlOneResult`, never `Stuff`: every new controller reads
  `model.x?.stuff ?? null`.
- Never a new `isWizard` check; no new Mongo collection (green ware
  persists through the room's estate slice; the stall through its
  `Stock` record).
- American English in every new identifier and row (`mold` alias,
  `color`, `FlowerPot`); shipped `Mould*` identifiers kept.
- **Lint gates this build must satisfy** (and the ones it is likeliest to
  trip): `lint:verb-collisions` (four views move, four new views —
  `shape`, `knead`, `dip`, `carve` are deleted from their packs in the
  same commit they appear in platform); `lint:light-sources` (g)(h) on
  the clamp, kiln, pit-firing rows; `lint:reconcile-chains` (every new
  `reconcile*` reads a trajectory — `reconcileHeatWork`,
  `reconcileGreen`, `reconcileLeach`, `reconcileSeep` all do);
  `lint:instanceable` (nothing instances `/lib/`; the pack has no `lib/`);
  `lint:mixin-names` (`Faced`, `Greenware` added to `Mixins`);
  `lint:perishable` (no food class loses `Freshness`); `lint:bills`
  (furnace bills name real part rows); `lint:openings` (the brickmaster's
  and pottery's `operatingLocations` list every room their counters
  stand in); `lint:dossiers` (every new `Cast` has an `archetype`);
  `lint:template-scans` (no new scan — forms resolve by path);
  `lint:boot-entries` (no new entry); `lint:instrument-args` (every tool
  arg declared with a default); `lint:untitled` (the brickfield and the
  foundry are titled in `pack.yaml`); `lint:counters` (the stall is a
  content `Stock` row, not a kernel counter); `lint:field-meta`;
  `lint:schema` (no collection change); `lint:object-verbs` (zero);
  `lint:drive-scripts` (the drive is a wire file).

---

## Waves

Every wave lands at one commit `build(ceramics W<n>): …`, is independently
landable (the tree boots, `test:near` + the touched packs' suites +
`lint:family` are green, the rubber/glass/potash-if-merged wire drives
still pass), and leaves a consumer running. Kernel substrate lands first
with a consumer each time; the sibling-gated wave is last.

### W0 — one rule fires everything (the kernel's M1)

**Goal.** Heat-work on `ThermalMixin`; `HeatTransition` folds
`Crosslinking`; `fire` has no recipe path; the five shipped firings ride
materials. Consumers in the same wave: the limekiln (burn-lime), the
retort (volatiles), the glass batch (as a `stir` mix + a transition), the
rubber works (its cure), the quarry's pot (now a transition on clay to
terracotta with no row).

**Decisions.** D1 D2 D3 D4 D31; the glass batch becomes a `stir` recipe
whose output `/trade/glass/thing/batch` (class `Melt`, material
`/trade/glass/idea/material/batch` with `heatTransitions` → `glass` at
1400 K, `massRetained 0.72`, `discipline: glasswork`) keeps potash's slot
tags; `remelt-cullet` becomes a transition on `glass` (cullet is already
glass: `heatTransitions` on the glass material with `referenceK 1200`,
ladder `[{1, glass}]` — a melt is the same material hot, so this is the
no-op rung that makes a cullet lump a workable `Melt`… ⚠ the cullet
`Casting` must become a `Melt` to be gobbed — the transition's rung names
`becomesTemplate: /trade/glass/thing/melt` (a rung may re-class a piece
whose class is only a material's fallback shape; identity is the row's,
and a `Casting` has none) — **the one place a rung changes a class, and
only for a `Casting`/`metal-casting` fallback clone**; `burn-lime.yaml`,
`fire-pot.yaml`, `retort-wood.yaml`, `retort-coal.yaml`,
`vulcanize.yaml`, `glass-batch-amber.yaml` (→ a second batch material
with charcoal) are deleted; `calcine.yaml` is deleted iff potash is on
master (else recorded).

**Files.**
- `K/lib/material/HeatTransition.ts` (← `git mv Crosslinking.ts`): the
  spec, the evaluator (`degree(dose, agent)`, `rungFor(degree, peakK,
  agent, atmosphere)`, `gradeOf`), `HeatWorkRecord` type, `@internal`.
- `K/lib/material/Material.ts`: `heatTransitions` field + fieldMeta +
  `getHeatTransitions()/setHeatTransitions()` (validated); `crosslinking`
  removed; `discipline` on a spec.
- `K/lib/thermal/Thermal.ts`: `heatWork` (+ fieldMeta `persistent,
  runtimeState`), `reconcileHeatWork(clock)` (private; integrates the
  dose per transition over `temperatureTrajectory(heatWork.checkedS ??
  clock.lastS ?? stamp, nowS)` with `Piecewise.integrate`, tracks
  `peakK`, `aboveS`, the time-weighted `atmosphere` from
  `heatSource()?.completeness()`; applies a rung: material swap, mass
  rescale, `alloying` rescale by `1/massRetained` on a `Composition`
  host, volatiles to `getContainer()`'s `receiveVolatiles` probe else the
  scope (moved from `FireController.emitIntoScope` to a `ThermalMixin`
  private), the mould seam (`castInto` when `getContainer()` `isMould` and
  the host is not that mould's cast), `fuseCoats(peakK)` on a `Faced` host
  (W1), the `discipline` credit to the acting author when one exists —
  ⚠ a transition that fires in an unwatched reconcile has NO actor;
  credit goes to `heatWork.firedBy` (stamped by `fire` at the hold's
  start) when set, else nobody); `heatSource()` public; `heatSourceK()`
  asks `heldTemperatureKFor(self)`; `getTemperature()`'s doc gains the
  record.
- `K/lib/fire/Burner.ts`: the two hooks.
- `K/platform/idea/cmd/device/FireController.ts` rewritten (~250 lines);
  `fire.yaml`: args `kiln` (`requires: BurnerMixin`), `draught` (string,
  the five words), `hold` (greedy after `for`); help rewritten.
- `K/platform/idea/reading/TemperatureReading.ts` + `temperature.yaml`
  (`handTool: pyrometry`; incandescence words).
- `K/lib/cleanliness/Soilable.ts`: `recordHeat` now called by the
  completion with the record's actual `peakK`/`aboveS`.
- Material rows: `base-library/…/rock/limestone.yaml` (`heatTransitions`
  → `caustic/quicklime`, 1170 K, 0.56, `discipline: quarrying`);
  `earth/clay.yaml` (the ladder → `/trade/ceramics/idea/material/…`
  bodies — ⚠ base-library cannot name a trade path; so W0 ships the four
  body rows in **base-library** `ceramic/{terracotta,earthenware,
  stoneware,refractory}.yaml` and the pack's material dir holds only the
  glazes, slip and the clays — correction to D18's paths, recorded);
  `wood/*.yaml` ×9 (char at 650 K, 0.25, volatiles wood-tar 0.08);
  `mineral/coal.yaml` (coke, tar + gas); `organic/raw-rubber.yaml`
  (the cure as a transition); `trade-glass/…/material/batch.yaml`
  (new), `glass.yaml` (remelt); `trade-potash/…/black-salts.yaml` (iff
  present).
- `trade-glass/content/recipes/glass-batch.yaml` → a `stir` row
  (`requiresHeatK: 0`, `toolCapabilities: []`, `outputTemplate:
  /trade/glass/thing/batch`); `C/trade-glass/content/trade/glass/thing/
  batch.yaml`.
- `C/trade-quarrying/src/thing/Lump.ts` composes `ThermalMixin`.
- Tests: `HeatTransition.test.ts` (← `Crosslinking.test.ts`, re-pinned: the
  four rubber outcomes, lime 56 %, partial conversion, atmosphere);
  `Thermal.heatwork.test.ts` (a body in a lit oven accrues; an unwatched
  gap integrates; a mould seam fires; volatiles route); `FireController.
  test.ts` rewritten (a bare `Oven` fires a lump whose material declares a
  transition; the draught arg; the hold; no-charge; not-lit — every
  shipped `describe` that authored a recipe now authors a material);
  `trade-rubber` suites; `trade-glass/recipes.test.ts`;
  `trade-quarrying` suites; the rubber and glass wire drives re-run.
- Docs: `fire.md` (the `fire` section rewritten), `thermal.md` (heat-work),
  `rubber.md` (the cure is a transition), `glass.md` (the batch is mixed),
  `mould.md` (the seam fires from the transition).

**Acceptance.** `fire limekiln` with limestone in it, held two hours, yields
quicklime at 56 % mass; held ten minutes yields a lump *burnt to the skin,
raw at the heart* with `degree < 1`; the rubber wire drive's boots come
out of the boot mould; `fire retort` with cordwood fills the condenser
with tar; `stir` the glass batch then `fire kiln` gives a gobbable melt
the color of its sand; `analyze temperature kiln` reads *cherry red*
with no instrument. No recipe row with `requiresHeatK > 0` remains in the
tree (a one-line grep in `FireController.test.ts` asserts it).

**Commit.** `build(ceramics W0): one rule fires everything — heat-work on
Thermal, HeatTransition folds the cure, fire has no recipe path`

### W1 — faces, coats and the glaze; the lead leach; the weeping jar

**Goal.** M6, M7, M8: `Faced` on `Good`; `dip` promoted and laying a wet
coat; coats fuse and craze at a rung; the inside coat leaches by acidity;
a porous body seeps and cools. Consumer: the four body material rows,
two glaze materials, and a unit-level glazed crock vs unglazed jar.

**Decisions.** D5 D6 D7 D11 D14 (`dip` only).

**Files.**
- `K/lib/material/Faced.ts` (new) + `Mixins.Faced` + `MixinApi.isFaced`
  + the refusal line; `K/lib/stuff/Good.ts` composes it.
- `K/lib/material/Material.ts`: `thermalExpansion`, `acidity`, `leaches`,
  `coats: boolean` (a bath material that lays a coat).
- `K/lib/material/Evaporation.ts`: `wetBulbK()` instance method;
  `ThermalRegulation.ts` reads it (its private deleted).
- `K/lib/thermal/Thermal.ts`: `evaporativeDepressionK()`, read in
  `ambientTrajectory()`'s flat branch and in `restamp()` (both sides —
  the Coolbox lesson); `fuseCoats` call at a rung (W0 left the call
  site).
- `K/lib/bulk/Bulkable.ts`: `reconcileLeach()`, `reconcileSeep()` driven
  from `getBulkAmount`/`getBulkPayload` reads (the slot's reconcile
  stamp on the payload: `leachCheckedS`, `seepCheckedS`).
- `K/lib/craft/DipPlanner.ts` (new protocol); `C/platform/…/cmd/crafting/
  dip.yaml` + `K/platform/idea/cmd/crafting/DipController.ts` (moved from
  chandlery, made dumb; `in`/`inside`/`outside` options); `C/trade-
  chandlery/src/thing/DipPot.ts` implements `dipPlanFor` (the candle
  plan, verbatim); chandlery's view/controller deleted.
- `K/lib/cleanliness/Soilable.ts`: `cleansAs()` read — a crazed coat or a
  bare porous body raises `waterLifts` resistance (one multiplier).
- Rows: `base-library/…/ceramic/{terracotta,earthenware,stoneware,
  refractory}.yaml` gain `thermalExpansion`; `C/trade-ceramics/…/material/
  glaze/{lead,ash}.yaml` (`coats: true`, `heatTransitions` fuse at 1250 K /
  1200 K, `leaches: [{toxin: lead-poisoning, mgPerLPerDayPerAcidity: 4}]`
  on lead, `thermalExpansion` 7e-6 lead / 5e-6 ash); `food/vinegar.yaml`,
  `wine*.yaml`, `whey.yaml`, `brine.yaml`, fruit juices: `acidity`.
- Settings: `thermal.yaml` (`thermal.evaporation.efficiency 0.8`,
  `seepLPerHourPerL 0.02`), `fire.yaml`? no — `faces.crazeMismatch`,
  `faces.dipThicknessM` in a new `C/platform/content/settings/faces.yaml`.
- Tests: `Faced.test.ts`; `Bulkable.leach.test.ts` (vinegar in a
  lead-glazed inside doses lead after a week; ash does not; water does
  not); `Thermal.evaporation.test.ts` (a wet body reads below its room);
  `Bulkable.seep.test.ts` (terracotta weeps, glazed holds);
  `DipController.test.ts` (moved) + `DipPot.test.ts` (the candle still
  works); `Faced.craze.test.ts`.
- Docs: new `docs/subsystems/faces.md` (coats; the paint seam);
  `cleanliness.md` (dirt on a crazed coat); `spoilage.md` (the toxin on a
  slot); `thermal.md` (evaporation).

**Acceptance.** A `CraftVessel` row with a fused lead inside coat holding
vinegar for seven game days carries `dissolvedToxins` lead; `drink` doses
it; the same with ash carries nothing; `look`/`smell`/`taste` say nothing
of it. A terracotta jar of water in a 300 K room reads its contents at
≤ 295 K and its outside wet; a glazed one at the room. `dip crock inside`
in a glaze bucket lays a `wet` coat; a 1250 K reconcile fuses it; lead on
terracotta crazes, ash does not.

**Commit.** `build(ceramics W1): a good has faces and a face carries coats
— dip lays a glaze, the inside coat leaches by acidity, a porous jar weeps
and cools`

### W2 — brittle bodies, flaws, `ring`, the 22 rows, naming

**Goal.** M5 and S1: breakage on `Tangible` through `DropController` and
`ThrowController`; thermal shock judged in the heat-work reconcile; hidden
flaws; the `ring` verb; sherds; `name` by the maker; the 22 rows
re-pointed; the dorm pot. Consumers: every ceramic row in the realm.

**Decisions.** D8 D9 D18; `canBeNamedBy` on `Named` (host placement table).

**Files.**
- `K/lib/stuff/Tangible.ts`: `flaws` (+ fieldMeta), `impactStrengthJ()`,
  `sufferImpact()`, `ring()`, `canReceiveAtK()` (W6 reads it).
- `K/lib/material/Material.ts`: `brokenTemplate` + `getBrokenTemplate()`
  (falls back to `getCastTemplate()`).
- `K/platform/idea/cmd/inventory/DropController.ts` (the fall) and
  `ThrowController.ts` (the shatter path → `sufferImpact`);
  `K/lib/combat/DeliveryProfile.ts` keeps `deriveIntegrity` for the
  wound; a `shatter` integrity now routes the vessel through
  `sufferImpact` against the target's material.
- `K/lib/thermal/Thermal.ts`: the shock test inside `reconcileHeatWork`
  (reads `max |dT/dt|` off the same window; brittle-tagged hosts only —
  a material fact, not a class guard).
- `C/platform/…/cmd/perception/ring.yaml` + `K/platform/idea/cmd/
  perception/RingController.ts` (dumb: `target.ring(giver)`); afforded by
  `TangibleMixin.commandContributions.peers` (⚠ check `lint:self-
  contributions`; the person affords it too so `ring` with nothing in
  reach is refused in words).
- `K/lib/description/Named.ts` `canBeNamedBy` default; `Crafted.ts`,
  `Assembled.ts`, `husbandry/Bonded.ts` overrides; `NameController.ts`
  made dumb (`isNamed(t) && t.canBeNamedBy(id)`); `name.yaml` help.
- `C/trade-ceramics/…/thing/sherds.yaml` + `src/thing/Sherds.ts`;
  `C/trade-ceramics/content/recipes/grog.yaml` (millstone, `category:
  sherd` → `/trade/ceramics/thing/grog`, a `Lump` of material `grog`).
- The 22 rows: `_materialPath` + `coats:` per S1; `generic-objects/…/
  ceramic/ceramic.yaml` gains `hardness 50, toughness 6`; the dorm starter
  pot (`/stuff/thing/clay-pot`): terracotta, `mass 1.2` (its drop energy
  12 J under terracotta's strength at that mass).
- Tests: `Tangible.impact.test.ts` (a thin stoneware bowl on granite
  shatters, on strewn earth survives; a thick terracotta mug survives
  both; `put`/`get` never call it); `Thermal.shock.test.ts` (stoneware on a
  flame cracks, grogged earthenware does not; boiling water into a cold
  glazed mug; a kiln opened hot dunts — the dunt hidden under a glaze
  only when the crack is short); `RingController.test.ts` (clear vs dull;
  a wooden spoon thuds); `NameController.test.ts` (the maker names a mug
  once; a stranger cannot; the reforge rule unchanged; the bond rule
  unchanged); the 22 rows' owning-pack suites.
- Docs: `materials-response.md` (brittle, flaws, ring); `assembly.md`
  (naming moved down to `Named`); `spatial.md`? no.

**Acceptance.** Drive steps 20, 23, 24's wording; AC 11; the 22 goods
read their S1 bodies in `look`; nothing in the realm breaks from
`put`/`get`/carry (a sweep test moves every ceramic row through a
container and asserts no `sufferImpact` call).

**Commit.** `build(ceramics W2): a brittle body breaks by a cause — impact
on Tangible, thermal shock on the heat history, ring finds the hidden
crack; the 22 rows read their bodies`

### W3 — clay's year: the composition, the count, the temper, green ware

**Goal.** M3 M4 S2 S3 S7: `Clay` with a composition; the freeze-thaw
weather fact; weathering; `knead` promoted and tempering; `Greenware`.
Consumer: the `trade-ceramics` pack is CREATED here with its materials and
the Delight's clay row, so a lump dug at Rejection can be weathered,
kneaded and (W4) shaped. ⚠ The pack's existence is this wave's first
commit-able fact (`pack.yaml`, `package.json`, root dep, the discover
count 65 → 66, `pnpm install`).

**Decisions.** D10 D12 D13 D14 (`knead`).

**Files.**
- `C/trade-ceramics/{pack.yaml, package.json, tsconfig.json,
  vitest.config.ts, README.md}` (root `/trade/ceramics`, title holder
  `/compact/trade`; deps: base-library, generic-objects, platform,
  trade-quarrying, trade-fuel, trade-milling, trade-shopkeeping,
  trade-smelting, server, types); root `package.json`;
  `PackLogic.discover.test.ts` 66.
- `K/api/weather.ts` + `K/platform/idea/api/WeatherLogic.ts`:
  `freezeThawDaysAt`; `K/lib/biome/Atmospheric.ts`:
  `freezeThawDaysSince(atS)`.
- `C/trade-quarrying/src/thing/Clay.ts` (new) + `clay.yaml` re-classed;
  `C/trade-quarrying/src/__tests__/Clay.test.ts`.
- `K/lib/material/Greenware.ts` (new) + `Mixins.Greenware` +
  `MixinApi.isGreenware`.
- `K/lib/craft/Kneadable.ts` (protocol); `C/platform/…/cmd/crafting/
  knead.yaml` + `K/platform/idea/cmd/crafting/KneadController.ts` (moved
  from baking, dumb); `C/trade-baking/src/thing/DoughTrough.ts` implements
  `kneadPlanFor` (its `mintFromBuild` becomes the plan's completion);
  baking's view/controller deleted; `C/trade-ceramics/src/thing/
  TemperPit.ts` (`Bulkable(Container(Thing))`, needs water; `kneadPlanFor`:
  sand/breeze/grog from reach into the clay's `alloying`, water to the
  window, the tread as a `body` + `hands` step; credits brickmaking or
  pottery by the pit row's `discipline`).
- Material rows: `C/trade-ceramics/…/idea/material/{clay-mineral,
  grog, breeze, slip}.yaml` (constituents and the slip); `C/hearts-delight/
  …/idea/material/alluvial-clay.yaml` (composition, `formTemplates`);
  `base-library/…/earth/clay.yaml` composition; `C/rejection/…/idea/
  material/{fireclay,gypsum}.yaml` + `quarry-hill.yaml` two bands
  (`wins: /trade/quarrying/thing/clay` for fireclay with its own material;
  `wins: /trade/quarrying/thing/gypsum` a `Lump`).
- `C/trade-ceramics/…/idea/reading/clay.yaml` + `src/idea/reading/
  ClayReading.ts` (`analyze clay`: fat/lean, iron-rich, limy, in words by
  band; `measure` with a ribbon — reuses soil's `texture` precedent).
- Settings `C/trade-ceramics/content/settings/ceramics.yaml`
  (`ceramics.weathering.ceilingDays`, `ceramics.green.*`,
  `ceramics.temper.*`).
- Tests: `WeatherLogic.freezeThaw.test.ts`; `Clay.test.ts` (weathering
  rises with crossings, stops indoors, ceilings; merge mass-weights);
  `Greenware.test.ts` (the three states; rain slumps; frost shatters;
  fat clay dried fast cracks; sand tames it); `KneadController.test.ts`
  (moved; dough still kneads); `TemperPit.test.ts`.
- Docs: new `docs/subsystems/ceramics.md` (started), `weather.md`
  (the count), `content-packs.md` (66 packs).

**Acceptance.** Drive steps 1–3 and 5–6 at unit level: a clay lump stamped
in autumn at the Delight's latitude and read after a 90-day jump outdoors
reads *frost-broken*; indoors *unweathered*; tempered with sand a slab
dries without a crack, fat clay cracks; a wet slab across a 268 K night
shatters; a plastic slab under rain slumps.

**Commit.** `build(ceramics W3): clay has a year — a composition the quarry
mints, the winter's freeze-thaw count, knead to the window, green ware's
three states`

### W4 — the potter's hand: `shape`, forms, `carve`, `fit`, `impress`, the brick table

**Goal.** S4 S5, the trimming/joining/marking window, the mark and the
date. Consumer: the pack's `Ware`, `Brick`, `FlowerPot`, `Cone`, the
wheel, the brick table, the stamp; a potter can make and name a jug; a
moulder makes a day's bricks.

**Decisions.** D14 (`shape`, `carve`, `hammer`), D16 D17 D21 (the mark
arm), D25 (`loadN` only).

**Files.**
- `K/lib/craft/Form.ts`, `K/platform/idea/Form.ts` (+ `lint:instanceable`
  sees an instanceable Idea under `platform/idea/`); `K/lib/craft/
  Shapeable.ts`, `Carvable.ts`, `Impressible.ts` (protocols).
- `C/platform/…/cmd/crafting/{shape,carve,impress}.yaml` +
  `K/platform/idea/cmd/crafting/{Shape,Carve,Impress}Controller.ts`
  (dumb); glass's and carpentry's views/controllers deleted;
  `C/trade-glass/src/thing/{Gather,Blowpipe}.ts` (`shapePlan` with the two
  forms; `HOT_SHOP` → the platform view); `C/trade-carpentry/src/thing/
  {Board,Blank}.ts` implement `carvePlan` (the recipe lookup moves onto
  them); `C/trade-carpentry/src/thing/Pattern.ts` + `thing/pattern.yaml`
  (W6 reads it).
- `K/lib/mould/Impression.ts`; `MouldMixin.impression`; `Greenware.mark`
  via `Crafted.mark` (new field on `Crafted`: `mark: string` — the
  stamp's identity).
- `C/trade-ceramics/src/thing/{Ware,Brick,FlowerPot,Cone,Wheel,BrickTable,
  Stamp}.ts`; rows `thing/{vessel,jar,dish,block,cone,mug,jug,crock,
  flask,bowl,plant-pot,brick,tile,firebrick,wheel,brick-table,tile-mould,
  brick-mould,stamp,pallet}.yaml`; `idea/form/{mug,jug,jar,crock,bowl,
  plant-pot,crucible,flask,brick,tile,firebrick,cone}.yaml`;
  `C/trade-dairying/…/idea/form/setting-pan.yaml` and
  `src/thing/SettingPan.ts` composes `Greenware`+`Durable`+`Faced`(inherited);
  `C/trade-sugar`'s cone row → class `/trade/ceramics/thing/Cone` **only if
  sugar is on master** (else a note).
- `fit`: `K/platform/idea/api/CraftingLogic.ts` `fit` replace arm: a
  `slip` joint row (`C/platform/…/Joint/slip.yaml`, `reversible: never`,
  instrument none, band pottery novice) that `Greenware.canJoin()` gates
  and whose moisture mismatch (`|handle.moisture − body.moisture| >
  ceramics.green.joinMismatch`) records a `crack` flaw on the line at the
  next drying reconcile; the jug form's `seats: [handle]`.
- `C/trade-smithing/src/idea/cmd/crafting/HammerController.ts`: the
  `strikes` probe on the bound `anvil` (D14).
- Tests: `Form.test.ts` (parsing `tall jug holding 3 pints`);
  `ShapeController.test.ts` (glass's two forms word for word; a novice's
  mug is heavy; `jar holding 2 gallons` refused naming the band; the brick
  table's day mints `rate × hours`; the mint follows custody);
  `CarveController.test.ts` (carpentry's haft still carves; a foot on a
  leather-hard mug; bone-dry refuses); `ImpressController.test.ts` (a
  stamp on a leather-hard jug; a stamp on bone-dry refused; a face cast
  writes nothing to belief); `fit.slip.test.ts`; `HammerController.test.ts`
  (the die probe); the glass and carpentry suites.
- Docs: `ceramics.md` (forms, the hand), `glass.md`, `assembly.md` (the
  slip joint), `command-spec.md` (the promotions, with the ladder's rung
  named for each).

**Acceptance.** Drive steps 4, 15, 16 at unit level; `shape bottle` on the
blowpipe unchanged; `carve haft` unchanged; AC 6, AC 7.

**Commit.** `build(ceramics W4): the potter's hand — shape over parametric
forms, trim and join and stamp at leather-hard, a day at the brick table`

### W5 — the clamp, the kiln, linings and crucibles, the statute brick

**Goal.** S6 S10 S11: the clamp's gradient and grades; the draught's
atmosphere; glow and smell; linings as part lines that wear and reline;
crucible wear; `relines`; `measure size`. Consumers: the brickfield's
clamp and kiln (rows in W6, but the classes and the Rejection furnaces
land here), the four Rejection furnaces with bills and keepers.

**Decisions.** D15 D19 D20 D30.

**Files.**
- `C/trade-ceramics/src/thing/BrickClamp.ts` + rows `thing/{clamp,
  pit-firing,updraft-kiln}.yaml` (the kiln an `Oven` row with a bill);
  `Stackable.split` at `fire` time (the clamp's `onFireStart(by)` hook —
  a `@hook` on `Burner` the `fire` controller calls, default no-op).
- `K/platform/thing/Oven.ts`, `C/trade-smelting/src/thing/
  SmeltingFurnace.ts`, `C/trade-fuel/src/thing/Retort.ts` compose
  `Assembled(Durable(…))`; `Burner.heatCeilingFactor()` reads the lining
  line; `FireController` completion wears it; `K/lib/fire/Burner.ts`
  `ignite` refusal `lining-burnt-through`; rows `C/generic-objects/…/
  Kiln.yaml` (loses `unreachable: exemplar`; bill), `limekiln.yaml`,
  `furnace.yaml`, `retort.yaml` (bills: `lining × 40 firebrick`, `dry-laid`
  joint `C/platform/…/Joint/dry-laid.yaml` with `discipline: masonry`).
- `C/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
  `runIntoCrucible`: `crucible.wear(dial)` + the crack; the crucible row
  moves to `/trade/ceramics/thing/crucible` and `smelter.yaml` props it
  (the smelting row kept as `extends:` for its prose).
- `C/trade-ceramics/src/behavior/relines.ts`; `behaviors:` on
  `rejection/agent/{glassblower,smelterman,collier,storekeeper}.yaml`;
  `rejection/…/thing/store-counter.yaml` + firebrick line (`from:
  {supplier: the brickfield, importBackstop: 1.5}` — ⚠ the supplier does
  not exist until W6; land the line as an import in W5 and re-point in
  W6), + crucible, lead, tin lines; the four furnace rooms →
  `PersistentLocale`.
- `C/trade-ceramics/…/idea/reading/size.yaml` + `SizeReading.ts`;
  `terminus-city.yaml` three brick standards.
- Disciplines: `C/trade-ceramics/…/idea/Discipline/{brickmaking,pottery,
  masonry}.yaml`.
- Settings: `ceramics.clamp.*`, `ceramics.lining.*`, `ceramics.crucible.*`,
  `ceramics.atmosphere.reducingBelow`.
- Tests: `BrickClamp.test.ts` (three stacks, three rungs, absorption
  falls with heat-work; a better setter's shares; a reducing draught's
  blue; rain on the skin); `Oven.lining.test.ts` (wear per firing, the
  ceiling falls, burnt through refuses, `fit lining` with 40 firebricks
  relines and credits masonry); `relines.test.ts` (the glassblower buys and
  relines on a clock jump); `SmeltController.crucible.test.ts`;
  `SizeReading.test.ts`.
- Docs: `fire.md` (linings), `ceramics.md` (the clamp), `civics.md`
  (standards), `employment.md`? no.

**Acceptance.** Drive steps 7–14 at unit level; AC 3, AC 5, AC 21's
second half.

**Commit.** `build(ceramics W5): the clamp grades by position and the
draught decides the atmosphere; a furnace's lining is a part that wears
and its keeper relines it; the statute brick`

### W6 — the works and their people; the stall; drive parts A–C

**Goal.** S20, S8's glazes as rows, the re-pointed lines, the
businesses, the drive wire files for A, B and C. Consumer: the realm.

**Decisions.** D28 D29; the venue rows.

**Files.**
- `C/hearts-delight/content/world/terminus/hearts-delight/brickfield/`:
  `structure.yaml`; `location/{clay-pit (an OpenWorking on a new
  deposit row …/idea/deposit/valley-alluvium.yaml), weathering-ground,
  temper-pit, moulding-shed (PersistentLocale), hacks (PersistentLocale,
  `roof:` canvas, `enclosure: none`), clamp-ground, potters-shop
  (PersistentLocale), offstage}.yaml`; `thing/{temper-pit, brick-table,
  brick-mould ×2, tile-mould, screw-press, wheel, updraft-kiln, clamp,
  glaze-bucket ×2, stamp, pallet, counter}.yaml`; `idea/{brickmaster.yaml
  (Business: moulder ×3, setter, potter — `fulfills`, `purchases`, rota;
  `parLines` sand/breeze/wood/firebrick-not), pottery.yaml (the potter's
  own outfit)}`; `agent/{brickmaster, moulder-a, moulder-b, setter,
  potter}.yaml` (Cast, archetypes); the valley-gate exit; `pack.yaml`
  titles; `package.json` + trade-ceramics, trade-quarrying.
- The ground reads `mud` (`DirtKind` is shipped): the brickfield rooms'
  floors are `earth/clay` worked false → the shipped floor soiling.
- `C/trade-ceramics/src/behavior/{moulds,sets,pots}.ts` (the gang's day;
  the setter's `put`s and `fire`; the potter's shape → dry → fire → glaze
  → fire → consign).
- Glazes: `C/trade-ceramics/content/recipes/{ash-glaze,lead-glaze,
  tin-glaze}.yaml` (`stir` rows into a bucket: silica sand + flux + clay);
  `thing/glaze-bucket.yaml`; salt glaze as a `heatTransitions.agent: salt`
  on stoneware (salt thrown into the kiln `put salt in kiln`) — the
  rubber agent arithmetic reused.
- Terminus: `C/terminus/…/market/thing/potters-stall.yaml` (a fixed
  `Stock`, supplier the pottery; lines plant-pot, mug, jug, crock, bowl,
  jar, flask, setting-pan); `square.yaml` props it + the curfew bell row
  (W7 — place the row then); `general-store/counter.yaml` + plant-pot
  line; `chandlery/thing/counter.yaml` two lines re-pointed; the general
  store's honey-jar line → the pottery's jar (apiculture's row stays for
  the apiary's props).
- `K/lib/retail/Stock.ts`: `importBackstop` on `StockFrom`, `reset()`
  reads the supplier's counter, `priceOf` the maker rule;
  `Stock.backstop.test.ts`.
- `rejection/…/store-counter.yaml` firebrick line re-pointed to the
  brickfield as supplier.
- `packages/wire/tests/ceramics-a.dirty.wire.test.ts` (steps 1–9),
  `ceramics-b.dirty.wire.test.ts` (10–14), `ceramics-c.dirty.wire.test.ts`
  (15–25) — each `declareFile({packs})`, `DIRTY_REASON` (clay won from a
  persisted ledger; the clock jumped through a year; a lining worn),
  every checkpoint asserting the verb was understood AND a state changed.
- Docs: `ceramics.md` (the works), `retail.md` (the backstop),
  `settlement-model.md`? one line.

**Acceptance.** Parts A–C of the drive run green against a booted world
(the record below); AC 1–13 and 21.

**Commit.** `build(ceramics W6): the Delight brickfield-and-pottery, the
Terminus stall, the lines that buy local first; drive parts A–C`

### W7 — moulding and founding: impressions, the pour, pressing, bells

**Goal.** M2 M9 S12–S16 S18 S19: the mould envelope, impressions in sand
and wax and plaster, survival and Chvorinov and chill and the damp blow,
consumed moulds and the pattern and the two-piece mould, `turn press` and
the die, recast and interchangeable, bells and the curfew bell, the
Rejection foundry and the founder; drive part D.

**Decisions.** D21 (the flask/wax/plaster arms) D22 D23 D24 D25 D26 D27
D29 (founding).

**Files.**
- `K/lib/mould/Mould.ts`: `receivedPour`, `pourSuperheatK`, `loadN()`
  (`loadKg` kept as a deprecated alias for one build? no — renamed, three
  callers: Hoop's test, the mould doc, sugar's cone when merged),
  `pressRelease()`, the cure set, the slip absorption, Chvorinov/riser/
  chill/damp in `castInto`, the impression cast, `undercut` refusal;
  `K/lib/material/Material.ts` `chillsTo`, `cureSetting`,
  `drainSetting.absorbedByMould`; `K/platform/idea/api/BulkableLogic.ts`
  survival + `receivedPour`; `K/lib/stuff/Tangible.ts` `canReceiveAtK`
  (W2 declared it); `K/lib/thermal/Thermal.ts` passes `temperatureK` in
  the freeze-edge `SetPool`.
- `K/platform/thing/ScrewPress.ts` + `C/platform/…/cmd/device/turn.yaml`
  + `TurnController.ts` + `K/lib/craft/Turnable.ts`; `C/hearts-delight/…/
  creamery/thing/screw-press.yaml`; `C/trade-ceramics/…/thing/tile-press`
  row uses the kernel class.
- `C/trade-smelting/src/thing/{Bell,Flask}.ts`; rows `thing/{flask,
  moulding-sand,bell-hand,large-bell,bell-pit,founding-sand-tub,
  pattern-rack,riser}.yaml` (the riser a mould row flag, not a thing);
  `idea/Discipline/founding.yaml`; `C/rejection/…/foundry/{location/floor
  (PersistentLocale), yard}.yaml`, `agent/founder.yaml`, `idea/
  foundry-business.yaml`, exits off the smelter; `C/trade-chandlery/…/
  thing/wax-block.yaml` (consumed `Mould`); `C/trade-ceramics/…/thing/
  plaster-mould.yaml` + `material/plaster-slurry.yaml` (`cureSetting`);
  `base-library/…/alloy/{pewter,brass,cast-iron,white-cast-iron,
  grey-cast-iron}.yaml` (`chillsTo` on cast iron); `rock/gypsum.yaml`'s
  transition → `mineral/plaster.yaml`.
- `K/platform/idea/api/CraftingLogic.ts`: the fired-clay salvage branch
  (`brokenTemplate`); the interchangeable skip in the replace arm.
- `C/terminus/…/market/thing/curfew-bell.yaml` + `square.yaml` prop.
- `packages/wire/tests/ceramics-d.dirty.wire.test.ts` (steps 26–34) and
  the restart checkpoint (35) appended to `ceramics-d` as the last `it`
  (the assembly precedent).
- Tests: `Mould.pour.test.ts` (misrun; riser; chill; damp blow burns the
  pourer; bronze into wood burns it; lead into tin melts it; pewter into
  bronze holds); `Impression.test.ts` (a sword's impression casts a
  nameless pewter sword with seams; a key's cast opens the lock; a face
  cast confers nothing); `Mould.cure.test.ts` (plaster cures; the slip
  mould drinks and releases a cup); `ScrewPress.test.ts` (cheese firmer;
  a tile releases at once); `HammerController.die.test.ts` (a struck
  token carries the die's provenance); `Bell.test.ts` (pitch by mass and
  alloy; a crack dulls; the carry reaches the next room);
  `CraftingLogic.salvage.ceramic.test.ts`; `fit.interchangeable.test.ts`.
- Docs: `mould.md` rewritten (the envelope; impressions; the pour;
  pressing; cure), `credential.md` (a cast key), `belief.md` (a face
  cast), `assembly.md` (interchangeable), `smelting`/`mining.md` one
  line, `ceramics.md`.

**Acceptance.** Drive part D (26–35) green; AC 14–20, 22.

**Commit.** `build(ceramics W7): the mould is an envelope — impressions
of anything, a pour that obeys its receiver and Chvorinov, one load from
three sources, cure, recast, and the bell that carries`

### ⛔ The sibling gate (before W8)

1. If sugar (and potash) have merged: `git merge origin/master` into
   `reqs/ceramics`; resolve by the § *Sibling collisions* table; recount
   the pack test; `pnpm install`; `test:near` + thermal/fire/bulk/mould
   suites + every touched pack + `lint:family`; re-run the rubber, glass,
   sugar and potash wire drives (they boot our kernel now) and
   `ceramics-a…d`.
2. If sugar has not merged: `git merge origin/reqs/sugar` into our own
   branch (allowed; landing is the MR's job) — and **open the MR only
   after sugar is on master**, else our diff carries sugar's build. If
   sugar stalls, W8 is cut from this MR and preserved as a follow-up
   (its design stays in this plan's § *Deferred seams* with the wave
   text intact).

### W8 — crystallizing and the filter (on sugar's mechanisms)

**Goal.** S17 and S9's filter; AC 12 and 18. Consumers: the salt pans
(bittern below), the ceramic water filter, alum and saltpetre rows.

**Decisions.** D32.

**Files.** `K/lib/thermal/Thermal.ts` (the crystallize arm of
`reconcileBulkPhase`, beside sugar's `concentrateIfReached`);
`K/lib/material/Material.ts` (`solubility`, `crystallizesTo`,
`filteredTo`); `K/lib/maturation/Maturing.ts` (one line in
`reconcileEvaporativeWindow` rescaling `dissolvedSolidsKgPerL`);
`C/trade-quarrying/…/thing/salt-pan.yaml` → class `/platform/thing/Mould`
(reusable, `castTemplate: /stuff/thing/salt-crystals`, `drainsInto` the
tub beneath — a `thing/bittern-tub.yaml` propped under it at the salt
flat and the salt house); `bulk/salt-water.yaml` (`solubility`,
`crystallizesTo {product: food/salt, residue: bulk/bittern}`),
`bulk/bittern.yaml`; `material/{alum,saltpetre}.yaml` rows;
`C/trade-ceramics/src/thing/WaterFilter.ts` (`PercolatingMixin(Ware)`) +
`thing/water-filter.yaml` + the `filter` form row; `C/water/…/material/
{fouled-water (filteredTo), tainted-water}.yaml` + the draw branch in
`WatercourseCatalogue.ts`; `ceramics-d.dirty.wire.test.ts` gains steps 22
and 32 (moved from the parts they sit in, because they are gated).
Tests: `Thermal.crystallize.test.ts`, `WaterFilter.test.ts`,
`WatercourseCatalogue.draw.test.ts`.

**Commit.** `build(ceramics W8): brine sets its salt with the bittern
below; porous stoneware strains the water by its pores`

### Then: the drive, the suite, the MR

Run `ceramics-a…d` against the booted world; record each run below;
`pnpm test` ONCE before the MR; open the MR; the pre-MR check in
CLAUDE.md § the lint family.

**Total:** nine waves plus a gate — W0 ≈ 3.5k lines (the kernel rework +
six packs' rows), W1 ≈ 2k, W2 ≈ 2.5k, W3 ≈ 2.5k (the pack is born), W4 ≈
3.5k (three verb promotions), W5 ≈ 2.5k, W6 ≈ 3k (rows + three wire
files), W7 ≈ 3k, W8 ≈ 1k. Expect 20k ± 3k lines, ~350 files, and the
**order of waves is the order of risk**: W0 is where the build learns
whether the one rule is really one.

---

## Reachability wiring

Five links per capability, each of which fails closed and silent: **verb**
(a view claims the word) · **affordance** (a static `commandContributions`
on a CLASS puts the view in reach) · **data** (the row the act reads
exists and resolves) · **boot** (the thing is standing somewhere a player
can reach, loaded on use) · **arg gate** (every `requires:` names a mixin
the target composes, every tool arg declares a default).

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| fire a chamber | `platform/cmd/device/fire.yaml` (rewritten) | `BurnerMixin.commandContributions` (unchanged) | the charge's material `heatTransitions` | every burner row that stands in a room | `kiln: requires BurnerMixin`; `draught` a string of five words; `hold` greedy after `for` |
| read the kiln | `analyze/measure temperature` | the platform `Reading` affordance | `temperature.yaml` `handTool: pyrometry`; the cones row | cones propped at the potter's shop | the cones are a `Tool` with `capabilities: [pyrometry]` |
| lay a glaze | `platform/cmd/crafting/dip.yaml` | `BulkableMixin`? no — ⚠ `dip` was afforded by `DipPot` only; now afforded by **`FacedMixin.commandContributions.peers`** (every good can be dipped) AND the person's self-contributions so a bare `dip` is refused in words | the bath material's `coats: true`; the glaze rows | glaze buckets propped at the potter's shop | `target: requires FacedMixin`; `bath: requires BulkableMixin`, default `reachable:[mixin.BulkableMixin]` |
| ring a body | `platform/cmd/perception/ring.yaml` | `TangibleMixin.commandContributions.peers` + self | material tags | — | `target: requires TangibleMixin` |
| name a pot | `platform/cmd/social/name.yaml` | unchanged (`Avatar` self) | `Named.canBeNamedBy` | — | `target: requires any` (the controller asks `isNamed`) |
| win clay | quarrying's `dig` (unchanged) | `OpenWorking` | the deposit band's `wins:` → `/trade/quarrying/thing/clay` (class `Clay`) + the clay material's `composition` | the valley clay pit (a new `OpenWorking` row + deposit) and Rejection's existing pit | `dig`'s shipped gate |
| weather it | none — a read | — | `freezeThawDaysSince` on the heap's place | the weathering ground is sky-open (`roof: none`) | — |
| knead | `platform/cmd/crafting/knead.yaml` | `TemperPit.commandContributions` (environment) and `DoughTrough`'s (unchanged list, new path) | the pit row's `discipline`; water in the pit | the temper pit propped | `material: requires any`; `pit/trough: requires KneadPlanner` by **shape** — ⚠ `requires:` names mixins only; so the view declares `requires: ContainerMixin` and the controller probes `kneadPlanFor` (the `cut` precedent) |
| shape | `platform/cmd/crafting/shape.yaml` | `Wheel`, `BrickTable`, `Blowpipe` (environment); `Clay`'s own peers for hand-building | form rows by path; the clay material's `formTemplates` | wheel/table at the works; the blowpipe at the glasshouse | `material: requires any` (greedy); `instrument: requires [ToolMixin]` with the default; `form` greedy string |
| carve | `platform/cmd/crafting/carve.yaml` | `GreenwareMixin` peers (a leather-hard pot) + `Board`/`Blank` (unchanged) | a `Carvable` plan | — | `thing: requires any`; `knife` default `capability.cutting` |
| fit a handle / a lining | `fit.yaml` (unchanged) | `AssembledMixin` (the jug and the furnace now compose it) | the `slip` and `dry-laid` joint rows; the furnace's `bill` | firebricks in reach | `whole: requires AssembledMixin` — ⚠ **`Ware` must compose `Assembled`** for `fit handle to jug` (it does: `CraftVessel` does not, so `Ware` = `Greenware(Assembled(Durable(CraftVessel)))` — correction to D17) |
| impress | `platform/cmd/crafting/impress.yaml` (alias `mold`) | `MouldMixin` peers (a flask, a wax block), `GreenwareMixin` peers (a leather-hard pot), the die (`Stamp`) | the pattern's `Impression` | flasks/wax/stamps propped at the foundry and the shop | `pattern: requires TangibleMixin`; `medium: requires any` (the controller probes `takeImpression`) |
| pour the melt | `pour.yaml` (unchanged) | `BulkableMixin` | `SetPool.temperatureK`, the mould's `riser`, `chillsTo` | the crucible stands in the furnace | unchanged |
| turn the press | `platform/cmd/device/turn.yaml` | `ScrewPress.commandContributions` (environment) | the mould placed ON the press | the creamery's and the shed's presses | `target: requires PlacingMixin` + the `turnPlan` probe |
| strike a die | smithing's `hammer.yaml` (unchanged) | smithing's | the die's `pressKind: blow` | the die propped | `anvil: prepositions [on, …]` already binds it |
| measure size | `measure.yaml` (unchanged) | the `Reading` affordance | `size.yaml`, three `Government.standards` | a gauging rod (`capability: gauging`, coopering's) | `subjectRequires: [TangibleMixin]` |
| buy at the stall | `buy` (unchanged) | `Stock` | the stall row's lines, the pottery as supplier, `importBackstop` | the stall propped on the square; the pottery's counter loaded on use by the stall's reset | unchanged |
| reline (NPC) | `fit` through `forceCommand` | the brain | the furnace's bill; the firebrick line | the keeper's business loaded (the drive visits first) | — |
| ring the curfew bell | `ring.yaml` | `TangibleMixin` | the bell row (`fixedInPlace`) | propped on the square | — |
| filter water (W8) | `pour` (unchanged) | `BulkableMixin` | `filteredTo` on `fouled-water`; the filter's `Percolating` | the filter sold at the stall | unchanged |

⚠ Three arg gates that would have failed silently, caught at plan time:
`dip`'s target gate (`FacedMixin` — a bare `Good` composes it, a
`Thing` fixture does not: you cannot glaze a wall); `fit handle to jug`
(`Ware` must be `Assembled`); `knead`'s medium gate (a protocol is not a
mixin — declare `ContainerMixin` and probe).

## Acceptance-criteria coverage

| AC | wave | how it is observed |
|---|---|---|
| 1 clay won, read, weathers worse in a mild winter | W3 (+W6 rows) | drive 1–2; `Clay.test` compares two winters by `climateOffsetK` |
| 2 rain, frost, fast drying; only bone-dry fires | W3 | drive 5–6; a wet piece in a kiln bursts |
| 3 grades by position, absorption, the setter, blue | W5 | drive 7–8 |
| 4 identity through the kiln; body from composition × heat-work; the 22 read S1 | W0, W2 | drive 17–18 (`look` names the same jug before and after); the 22 rows' `look` |
| 5 linings and crucibles wear, read, lower heat, crack, are replaced; the keeper relines | W5 | drive 11–14 |
| 6 competence decides wall, largest form, grade; any capacity/proportion; name; mark and date | W4 | drive 15, 16, 18 |
| 7 trim/join/stamp only at leather-hard; mismatch cracks a joint | W4 | drive 16 |
| 8 glaze by dip, fused by fire; crazing, running, crawling, dunting | W1, W2, W5 | drive 18; running = over-fired coat (`over` rung → runs, `state: run`); crawling = `soilAt('inside') > dial` at the dip (cleanliness) |
| 9 lead leaches by acidity, silently; ash does not | W1 | drive 19 |
| 10 the weeping jar cools; glazed holds | W1 | drive 21 |
| 11 breakage by impact vs strength vs floor; thermal shock; nothing from handling; `ring` | W2 | drive 20, 23 |
| 12 the filter removes particulate/bacterial, not dissolved | W8 | drive 22 |
| 13 the stall sells the pottery's; lines local first, imports dearer | W6 | drive 25 |
| 14 impression of anything; kind, mass, behavior, seams, provenance; never identity; a cast key; no disguise | W7 | drive 27–28 |
| 15 every pour obeys its receiver | W7 | drive 30 |
| 16 misrun, shrinkage, damp blow, chill; read in advance | W7 | drive 29–30 |
| 17 screw press and die load a mould; self-supporting releases at once | W7 | drive 31 |
| 18 brine crystallizes with bittern below; plaster cures and casts slip | W8, W7 | drive 32, 26 |
| 19 metal casts salvage to a pool, fired clay to sherds; interchangeable fit | W7 | drive 33 |
| 20 a bell's note by size and alloy; carries; the pit; the curfew bell | W7 | drive 34 |
| 21 four disciplines learnable and credited; the statute brick | W5, W6, W7 | drive 9, 12 and the transcript after each part |
| 22 every piece of state survives a restart | W7's last `it` | drive 35 |

**Drive checkpoints → waves:** 1–3 W3 (rows W6) · 4 W4 · 5–6 W3 · 7–9 W5 ·
10 W3/W5 · 11–14 W5 · 15–16 W4 · 17–18 W0/W1/W5 · 19 W1 · 20 W2 · 21 W1 ·
22 W8 · 23–24 W2 · 25 W6 · 26 W7 · 27–31 W7 · 32 W8 · 33–34 W7 · 35 W7.

## Test & gate strategy

- `pnpm test` runs at exactly two moments: once before the MR opens, once
  at `/finalize`. Nothing else triggers it — not W0's size, not a sibling
  merge, not a review round.
- Every wave: `pnpm test:near`, every touched pack's own `vitest run`
  (`trade-ceramics`, `trade-quarrying`, `trade-fuel`, `trade-glass`,
  `trade-rubber`, `trade-chandlery`, `trade-carpentry`, `trade-baking`,
  `trade-smelting`, `trade-smithing`, `trade-dairying`, `rejection`,
  `hearts-delight`, `terminus`), and `pnpm -C packages/server lint:family`.
- The kernel suites that must stay green after W0: `Thermal*.test.ts`,
  `FireController.test.ts`, `Mould.test.ts`, `Burner*.test.ts`,
  `BulkableLogic*.test.ts`, `Crosslinking.test.ts` (renamed), and the
  rubber + glass wire drives (`rubber.dirty.wire.test.ts`,
  `glass.dirty.wire.test.ts`) — these are the proof that one rule is
  one; they run at W0's commit.
- **The drive is four wire files**, all `.dirty.`: `packages/wire/tests/
  ceramics-a.dirty.wire.test.ts` (the brickmaker's year — clay from a
  persisted ledger, the clock jumped through four seasons),
  `ceramics-b.dirty.wire.test.ts` (linings — furnaces worn, a keeper's
  purchase), `ceramics-c.dirty.wire.test.ts` (the potter — ware
  consigned, the stall's shelf drawn), `ceramics-d.dirty.wire.test.ts`
  (moulding and founding — flasks consumed, a bell cast, the server
  restarted last). Each checkpoint asserts the verb was UNDERSTOOD
  (`verbUnderstood`) and a STATE CHANGED (a `look` line, an inventory
  count, a transcript entry) — never "not refused". `WIRE_PORT` for this
  worktree is the build-3 one (check `wire-port-per-worktree`).
- A green run stays valid until a source file changes:
  `git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`
  empty means the last run stands.
- Re-run the drive after every review fix; the record below carries
  every run's count and failures.

## Risks & opens

### Needs the owner

1. **D7 — the lead leach is on `Bulkable`, not maturation's `imparts`.**
   The requirements name `imparts`; the mechanism that reaches the crocks
   the drive fills (CraftVessels with no batch) is the slot's. Aroma
   `imparts` is untouched. If the owner wants the word kept, the
   requirements' M7 sentence should read *the vessel-to-contents channel*
   without naming maturation.
2. **D26 — the bell pit is a fixed mould thing, not a place.** S19 says
   *the mould is a place*. A Location composing `MouldMixin` would need
   `Bulkable + Thermal + Container` on a place; the honest engine answer
   today is a `fixedInPlace` mould you stand at in the foundry yard. If
   the owner wants the place, it is a build of its own (a pit you climb
   into).
3. **D14 — `hammer <blank> on <die>` rides smithing's `anvil` arg** and a
   structural probe on the bound object rather than a promotion of
   `hammer`. `impress die on blank` is the same act said the universal
   way and works everywhere. Say if the literal syntax must be the only
   one.
4. **W0 re-classes a `Casting` fallback clone at a rung** (cullet →
   `Melt`) — the one place a transition changes a class, restricted to
   fallback shapes that carry no identity. Confirm the restriction is
   acceptable, or the glass remelt stays a `stir`-less special case.
5. **Four verb promotions in one build** (`shape`, `knead`, `dip`,
   `carve`) each refactor a shipped pack (glass, baking, chandlery,
   carpentry). The ladder's rung 2 chose each; the alternative — four
   second views — fails `lint:verb-collisions`. The owner may want the
   promotions as their own small MR before this one.
6. **The furnace rooms become `PersistentLocale`** (smelter, glasshouse,
   fuel yard; the quarry pit is already a persistable working). Their
   bounded fuel props then persist as consumed — which is honest, and a
   change to how those rooms re-seed at boot.
7. **The sequencing against sugar and potash** (§ Sibling collisions):
   after-both is cheapest; W8 leaves the MR under any other order.
8. **`Faced` on `Good`** touches every good's class chain (one field, no
   behavior until a coat is laid). Confirm this is the host the owner
   meant by *every good has an outside*.
9. **No plant-pot line exists on any counter today** — AC 13's
   *re-pointed* line is a NEW line on the general store. Recorded, not
   reshaped.
10. **Heat-work credit with no actor.** A transition that completes in
    an unwatched reconcile (a clamp opened three days later) credits
    `heatWork.firedBy` — the one who ran `fire`. A pot that fires in a
    house fire credits nobody. Confirm.

### Requirements-vs-code disagreements recorded, not reshaped

- The requirements' table *"`dip` (chandlery) dips a solid in a pot"* —
  it dips a WICK and mints a candle by recipe; after W1 the chandlery's
  plan is the bath's and nothing else changes for a chandler.
- *"`carve` gains trimming at leather-hard"* — carpentry's `carve`
  resolves a recipe word; a trim is not a recipe. The protocol makes the
  pot plan its own trim; carpentry keeps its recipe lookup on its stock.
- *"Quarrying's `fire-pot` … retire into the materials' own heat
  transitions, and pottery credits pottery"* — a bare clay lump fired by
  anyone transitions to terracotta and credits the transition's
  `discipline` (pottery); the form's trade decides brickmaking vs pottery
  when the piece was shaped.
- The fired bodies live in `base-library` (D18 corrected in W0): a
  kernel material row cannot name a trade path, and clay's ladder must
  name the bodies.

### Risks

- **W0 is the build.** If the one rule turns out to need *"if clay"*
  anywhere, stop and re-plan rather than add the branch. The tell is a
  `hasTag('clay')` in `Thermal.ts`.
- The thermal ring holds 24 breakpoints; a three-day clamp burn with
  no reads banks heat-work at the first read off a reconstructed
  curve — exact (one lit stretch), but a clamp re-stoked twenty-five
  times unread would lose its oldest stretch. The clamp is read at the
  end by `fire`'s completion; record the limit in `thermal.md`.
- `GreenwareMixin` on `SettingPan` (dairying) adds `WaterActivity` to a
  class that composes `Fractionating`; `reconcileWater` and the fraction
  reconcile both read the trajectory — verify no reentry ring with the
  dairying suite before W4 lands.
- The `shape` grammar (`tall jug holding 3 pints`) parses quantities
  through the shipped measure grammar (`bulk.md`); a word the parser does
  not know must refuse naming the five classes, never bind silently.
- The potter's `pots` brain runs a six-step chain through
  `forceCommand`; each step must be a verb a player types, and the brain
  must bound its loops (the `hauls` precedent).
- `lint:self-contributions` may refuse `ring`/`dip` on the person's
  self list; the compliant path is the mixin's `peers` list alone with a
  worded refusal when nothing is in reach.
- `Stock.reset()` reading the supplier's counter loads it on use; a
  supplier in an unloaded locality is loaded by that read — bounded (one
  room), but note it in `retail.md`.

## Deferred seams

| seam | destination |
|---|---|
| casks, pitch-lined amphorae, tin-lined copper onto faces | `maturation.md` § a recorded target (W7's sweep writes the note; no migration) |
| coats on building faces, the painted image, binders | [paint-slate](../slates/builds/paint-slate.md) (rides `Faced` for goods, construction layers for buildings) |
| wet clothes and sweat reading `evaporativeDepressionK` | `exertion.md` / `textiles.md` deferred lists |
| frost tilth, frost damage to brick (the count's next readers) | repair W7, `soil.md` |
| lime mortar by cure, repointing, the spall, `maintain` | repair W7 |
| the Scotch and Hoffmann kilns, the pugmill, the jigger, extrusion | brickmaking-slate § 5, pottery-slate § 4 |
| kintsugi (lacquer from a tapped tree) | `taps.md` deferred list |
| porcelain and kaolin | pottery-slate § 9 |
| salt-glaze fumes as harm | the potash slate's smoke ordinance |
| a fire code, zoning the brickfield, a public kiln | construction-slate, civics |
| ringing the curfew on a schedule | civics (the curfew ordinance) |
| coin striking authority; the die as a credential | `banking.md` coinage, attestation-slate |
| bricks and wares by barge; breakage in transit; straw | river-slate, freight-slate |
| the per-brick levy | brickmaking-slate § 3 |
| drain tiles, brick sewers, flue liners, clay lamps | watershed's conduit ladder, cleanliness's flue, fire's lamp — rows on this build's bodies |
| `interchangeable` as an authored joint flag | assembly tail (the derived skip ships here) |
| a pit you climb into (the bell mould as a place) | moulding-slate (if the owner wants it) |
| W8 if cut by sequencing | this plan's W8 text, preserved as a follow-up |
| `hammer` promoted behind a protocol | command-taxonomy-slate |
| the oven's own warm-up (thermal mass on the furnace) | `fire.md` deferred (unchanged) |

## Critical files

Kernel: `K/lib/thermal/Thermal.ts` · `K/lib/material/HeatTransition.ts`
(← `Crosslinking.ts`) · `K/lib/material/Material.ts` ·
`K/lib/material/Faced.ts` · `K/lib/material/Greenware.ts` ·
`K/lib/material/Evaporation.ts` · `K/lib/stuff/Tangible.ts` ·
`K/lib/stuff/Good.ts` · `K/lib/bulk/Bulkable.ts` ·
`K/platform/idea/api/BulkableLogic.ts` · `K/lib/mould/Mould.ts` ·
`K/lib/mould/Impression.ts` · `K/lib/fire/Burner.ts` ·
`K/platform/thing/Oven.ts` · `K/platform/thing/ScrewPress.ts` ·
`K/lib/craft/{Shapeable,Kneadable,DipPlanner,Carvable,Impressible,
Turnable,Form}.ts` · `K/platform/idea/Form.ts` ·
`K/platform/idea/cmd/device/{Fire,Turn}Controller.ts` ·
`K/platform/idea/cmd/crafting/{Shape,Knead,Dip,Carve,Impress}Controller.ts`
· `K/platform/idea/cmd/perception/RingController.ts` ·
`K/platform/idea/cmd/inventory/{Drop,Throw}Controller.ts` ·
`K/platform/idea/cmd/social/NameController.ts` ·
`K/lib/description/Named.ts` · `K/lib/craft/{Crafted,Assembled}.ts` ·
`K/lib/retail/Stock.ts` · `K/api/weather.ts` ·
`K/lib/biome/Atmospheric.ts` · `K/platform/idea/reading/
TemperatureReading.ts` · `K/lib/mixin.ts` · `K/api/mixin.ts`.

Packs: `C/trade-ceramics/**` (new) · `C/trade-quarrying/src/thing/
{Clay,Lump}.ts` · `C/trade-fuel/src/thing/Retort.ts` ·
`C/trade-smelting/src/thing/{SmeltingFurnace,Bell,Flask}.ts` +
`SmeltController.ts` · `C/trade-glass/src/thing/{Gather,Blowpipe}.ts` ·
`C/trade-baking/src/thing/DoughTrough.ts` ·
`C/trade-chandlery/src/thing/DipPot.ts` ·
`C/trade-carpentry/src/thing/{Board,Blank,Pattern}.ts` ·
`C/trade-dairying/src/thing/SettingPan.ts` ·
`C/trade-smithing/…/HammerController.ts`.

Content: the material rows (base-library ceramic/, wood/, rock/,
alloy/; the pack's glazes and clays; Rejection's fireclay and gypsum) ·
the six deleted recipe rows · the 22 re-pointed rows ·
`C/hearts-delight/…/brickfield/**` · `C/rejection/…/foundry/**` + the four
furnace rooms + `quarry-hill.yaml` + `store-counter.yaml` · `C/terminus/…/
market/thing/{potters-stall,curfew-bell}.yaml` + the counters ·
`terminus-city.yaml` · the four wire files.

## Drive record

*(appended at build time — one entry per run: the date, the file, the
count, each failure and what it became)*
