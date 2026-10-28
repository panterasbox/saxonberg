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
§ *Merge protocol* is written for either landing order, and nobody waits:
ceramics builds in parallel with both (the owner, revision 2).

Revised 2026-10-20 (revision 1) after a fresh-reader review and four
physics rulings from the coordinator, folded in below (§ *Rulings*).

**Honest size:** nine waves, no sibling gate, roughly 350 files and 18–22k lines (sugar was
227 files / 10k; this build is two of those: a kernel rework of firing plus
a two-trade venue plus a founding trade). The waves are ordered so the
kernel substrate lands with a consumer each time and no wave waits on a
sibling.

---

## Rulings folded in (2026-10-20, revision 1)

- **A — Charcoal is the wood transition; no second path.** The clamp's
  three outcomes are the one rule: starved air (a reducing atmosphere) +
  full heat-work → charcoal; too much air (oxidizing) at full heat-work →
  the carbon burns out to ash; insufficient heat-work → brands, which is
  partial conversion. `CharcoalPit.outcomeFor`/`yieldFor` and
  `CharController.openClamp` retire; `char` stays the collier's word and
  only sets the draught, lights and holds. The retort's wood and coal are
  the same transitions in a chamber that keeps the volatiles. The
  extraction wire drive loses its `no-firing` expectation (l.312; the
  fire drive has none) and both gain outcome checkpoints (W0).
- **B — Agents live in the piece's own composition, or in the chamber's
  atmosphere.** Rubber is COMPOUNDED with sulfur before it is cured (a
  `stir` recipe into a compounded stock, a `Composition` good — like clay
  and the glass batch); the transition reads `fractionOf(agent)` off the
  piece. A chamber's atmosphere carries oxidizing/reducing AND vapors:
  salt thrown in at peak heat is salt vapor in the kiln's atmosphere, and
  a stoneware body under it takes a salt-glaze coat. Nothing sums sibling
  pieces (the shipped `cureOf` agent sum is gone).
- **C — Whole objects remelt by phase change, and the pool keeps its
  composition.** A glass bottle in a hot kiln melts (`MeltableMixin` on
  the glass pack's goods; `doMelt` pools into a bulk vessel standing in
  the same chamber before it falls to a floor) and the pool sets as a
  glass lump; `gob` takes any hot glass-tagged `Composition` piece. No
  rung ever changes a class; `remelt-cullet.yaml` retires with the other
  firing rows. ⭐ **A molten pool carries its composition** (revision 2,
  the owner): `BulkPayload.composition?: CompositionEntry[]` — declared
  from `lib/material/Composition.ts`, folded by volume on every pour like
  `dissolvedToxins`, seeded by `doMelt` from the melting piece's
  `getAlloying()`, and stamped back by the set edge (`carryPayload` and
  the plain `Casting` clone in `reconcileBulkPhase`) onto any
  `Composition` cast. So a green bottle remelted comes back green
  (glass.md's colour-as-grade and cullet-one-way-toward-green survive
  intact), and the smelt's crucible closes the same gap: the liquid run's
  liquid run (`runIntoCrucible`, called at l.482) seeds the run's payload
  with the carbon the charge computed, as NEW code, and the ingot takes it
  off the pool — ⚠ l.533's `setFractionOf(CARBON, …)` is the SOLID
  bloom/steel path and is untouched. In W0, with `Meltable` on the glass
  goods.
- **D — The pot.** `fire-pot.yaml` retires in W0 (no recipe path can
  survive W0): a bare clay lump fires to a terracotta lump. The made pot
  is reachable again at W4 (`shape`); between W0 and W4 — inside one MR,
  never a shipped state — the extraction drive's clay checkpoint asserts
  the lump, and W4 extends it to the pot.

**Revision 3 rulings (the coordinator, 2026-10-20):**

- **R1 — Mixing is one rule.** Combining materials yields a BLEND — a
  `Composition` good, or bulk carrying `payload.composition` — whose
  fractions are COMPUTED from the inputs by mass; no recipe, no fixed
  ratio. Clay + sand + breeze, rubber + sulfur (rubber is milled), the
  glass batch and the glaze slip are one mechanism (D34). The verb follows
  the material's state: `knead` a plastic mass, `stir` a slurry, powder or
  liquid. So the `knead` promotion moves to W0 (rubber's compounding needs
  it), `StirController` learns to blend, and a kernel `MixingVessel`
  exists. The rubber drive's two charges cure by their computed sulfur
  fraction (below the optimum → under-cured, at or above `over` →
  ebonite).
- **R2 — Green ends at firing.** Rain-slump, frost-shatter and
  too-fast-crack apply only while the body is unfired (heat-work `degree`
  0, the material still `plastic`-tagged); a fired piece's relation to
  water is porosity/weep/seep only. `GreenwareMixin` goes inert at the
  first rung; `SettingPan` (which already composes `WaterActivity`)
  composes `Greenware` over it and the host table says so.
- **R3 — A sealed clamp cannot flame — ONE rule, *a flame needs air*,
  shared with underwater (revision 4).** `origin/reqs/underwater`
  (build-4, in review) adds `FireLogic.mediumBurns(stuff)` — *no flame
  where there is no air* (underwater D29 seam 1): a thing in a medium
  whose `BiomeApi.mediumProps(tag).supportsCombustion` is false is refused
  before anything is struck — and `Burner.completeness()` answers 0 when
  immersed below the surface. ⭐ Our sealed-clamp check is a SECOND ARM of
  that same gate, never a parallel check: `mediumBurns(stuff)` = the
  medium supports combustion (their arm) AND, when `stuff`'s immediate
  container is a `Burner` chamber, that burner's `completeness()` ≥
  `fire.air.flamingCompleteness` (0.6, our arm). The gate is called from
  BOTH `igniteImpl` (where underwater calls it — the deliberate strike)
  and `tryAutoigniteImpl` (the heat-threshold path, which is how a log in
  a clamp would catch) — so cordwood in a clamp at draught 0.45
  (completeness ≈ 0.53) or in a shut retort chars by the transition and
  never ignites; at `draught wide` it ignites and burns by the fire path,
  which IS the collier's lost burn (the transition's `oxidized` rung is
  therefore gone — one dial, two readers). **Both orders:** if underwater
  lands first we EXTEND their `mediumBurns` with the chamber-air arm and
  add the `tryAutoigniteImpl` call; if we land first we INTRODUCE the gate
  under that exact name with the chamber-air arm and both call sites, and
  underwater adds the medium arm. Pinned by `FireLogic.sealed.test.ts`;
  fire drive 10 stays green; their underwater drive's *no flame in the
  water* checkpoint stays green under either.
- **R4 — Commons name only commons.** Every material a base-library row
  names lives in base-library: `organic/{charcoal,coke,ash}.yaml` and
  `bulk/wood-tar.yaml` MOVE from `trade-fuel` to `base-library` at the
  same paths (no reference changes); new `organic/half-burnt-wood.yaml`,
  `rock/gypsum.yaml`, `mineral/plaster.yaml`, `ceramic/refractory.yaml`
  are base-library's (gypsum has ONE home); the lining bills on rows owned
  by generic-objects, trade-quarrying and trade-fuel name only the
  commons firebrick row `/stuff/thing/firebrick` (generic-objects, class
  `/platform/thing/Good`, material `ceramic/refractory`), which the pack's
  made firebrick `extends:`. No pack depends on `trade-ceramics` except
  the realm packs that prop its venues (`rejection`, `terminus`,
  `hearts-delight`); the wheel's `setting-pan` form is listed on the
  Delight's wheel ROW (hearts-delight depends on dairying), never on the
  pack's; the smelt's crucible row stays smelting's (no `extends:`), and
  the potter's crucible is the pack's own row that `crucibleIn` finds by
  mixin.

Owner-confirmed defaults (previously *needs the owner*, now the plan's
position): D7 the leach on the vessel's inner face / `Bulkable` (casks
recorded for later); D26 the bell pit a fixed mould thing; both die
syntaxes (`hammer <blank> on <die>` and `impress die on blank`); the four
verb promotions stay in THIS MR as early waves; the furnace rooms become
`PersistentLocale`; `Faced` on `Good`; an unwatched transition credits
`heatWork.firedBy`. ⭐⭐ **Sequencing (revision 2, the owner): WAIT ON
NOBODY.** Ceramics builds now, in parallel with sugar and potash; W8 ships
in this MR on MASTER's code, shaped to sugar's names wherever they
overlap; the former sibling gate is gone. § *Merge protocol* says what
each side does in BOTH orders, and `docs/plans/ceramics-note-to-siblings.md`
says it to the sugar and potash sessions.

---

## ⭐⭐ Merge protocol — sugar and potash (nobody waits)

Both siblings are **code**: `origin/reqs/sugar` (build-1) has W0–W6 landed
and eight drives; `origin/reqs/potash` (build-2) has W0–W6 and three
drives. Read 2026-10-20 against merge-base `2a4e9af0a` (the silk merge,
this branch's base too). The owner's ruling (revision 2): **ceramics
builds now, in parallel; nobody waits on anybody; W8 stays in this MR.**
The rule that makes that cheap: ⭐ where a sibling has a mechanism we
need, we adopt its **names, types and signatures verbatim** — the same
payload field with the same declaration, the same mould method with the
same signature, the same accessor pair on `Material` — so whichever lands
second gets a near no-op merge (the `Thermal.heatSource()` move already
done this way). Precedent for this section's shape:
`docs/plans/repair-note-to-siblings.md` (on master) and repair's
*Parallel builds* table. The note addressed to the two sessions is
`docs/plans/ceramics-note-to-siblings.md`.

### Per shared file — each side's change, and the resolution in BOTH orders

⚠ A THIRD branch shares four kernel files: **`origin/reqs/underwater`**
(build-4, review round 1, likely to land before us). Its 67-line diff on
`FireLogic.ts`, `Burner.ts`, `Thermal.ts`, `ThermalRegulation.ts` is in
the rows marked *underwater* below.

| file / thing | sugar | potash | ceramics (this plan) | we land first → they do | they land first → we do |
|---|---|---|---|---|---|
| **underwater** `K/platform/idea/api/FireLogic.ts` | — | — | (underwater: `mediumBurns(stuff)` — the medium's `supportsCombustion` — called from `igniteImpl`) | the SAME function gains a chamber-air arm (a content of a `Burner` needs `completeness()` ≥ `fire.air.flamingCompleteness`) and a second call site in `tryAutoigniteImpl` (R3) | if we land first the function exists under their name with our arm and both call sites; underwater adds the medium arm inside it and its `igniteImpl` reason `no-air` | we extend their function with our arm and add the `tryAutoigniteImpl` call; one function, two arms |
| **underwater** `K/lib/fire/Burner.ts` | `heatTransferFraction`, `deliveredPowerW()` | `ashAlkaliKg`, `mintAshHeaps` | (underwater: `completeness()` returns 0 when immersed below the surface — three lines at the top of the method) | our `heldTemperatureKFor`, `heatCeilingFactor`, `chamberVapors`, `settleFiring` are separate members; their three lines are at the head of `completeness()`, which we do not edit | union | union |
| **underwater** `K/lib/thermal/Thermal.ts` | (see the sugar row) | — | (underwater: `immersedTag`, the immersed arm of `mediumConductivity()`, the immersed branch of `restamp()`'s ambient resolve after `holderK`) | our `evaporativeDepressionK()` is read in `ambientTrajectory()`'s flat branch and answers 0 when `immersedTag !== null`; our heat-work reads whatever ambient results (water included); none of our edits touch `restamp()`'s branch ladder or `mediumConductivity()` | underwater's hunks apply unchanged beside ours | we merge; our 0-when-immersed clause reads their field |
| **underwater** `K/lib/thermal/ThermalRegulation.ts` | — | — | (underwater: `setWorkingOffsetK`/`getWorkingOffsetK`, the medium read replacing `isSwimmable` in `effectiveAmbient`) | we delete `protected wetBulbK` in favour of `Evaporation.wetBulbK()` (W1) — two call sites at l.412/450, neither in their hunks | union | union |
| `K/lib/thermal/Thermal.ts` | public `heatSource()` replacing private `heatSourceK`; `fireCouplingR()` inside `effectiveR()`; `boilHeldSeconds` → `{heldS, sinceS}` for every plateau material; `boilJoules`; `concentrateIfReached`; `PhaseClock.lastS` + `_phaseCheckedS`; declares `BulkPayload.dissolvedSolidsKgPerL` | — | `heatWork` record + `reconcileHeatWork()` after `reconcilePhase()`; **`heatSource()` public, sugar's exact signature and doc**; `evaporativeDepressionK()` read in `ambientTrajectory()`'s flat branch (never inside `effectiveR`); `poolVesselIn()` in `doMelt`; the crystallize arm in `reconcileBulkPhase` (W8); **declares `BulkPayload.dissolvedSolidsKgPerL?: number` with sugar's exact comment and type, from the same file** | sugar re-applies `fireCouplingR` into our `effectiveR` (an untouched method) and keeps ONE `heatSource()` (identical text → git merges clean); their `concentrateIfReached` and our crystallize arm are siblings in the same `if (bp > 0 && temp >= bp)` block — sugar inserts theirs after ours; the duplicate `dissolvedSolidsKgPerL` declaration merges by identity (TypeScript merges identical declarations; delete one) | we merge their file and re-apply `reconcileHeatWork` (one call site after the phase pass), `evaporativeDepressionK`, `poolVesselIn`; our crystallize arm goes after their `concentrateIfReached`; we delete our duplicate declaration; our heat-work window takes `clock.lastS` |
| `K/lib/material/Material.ts` | `DrainSetting.drains/drainPerBand`, `ConcentrationArrow`, `solidsKgPerL` + `getSolidsKgPerL/setSolidsKgPerL` + `solidsMassFraction`, `_familyPath`, `boilingPointElevation`, `concentratesTo` | `alkaliShare` after `ashFraction` | `heatTransitions` (replacing `crosslinking` — one field, one fieldMeta line, one get/set pair), `thermalExpansion`, `acidity`, `brokenTemplate`, `leaches`, `formTemplates`, `chillsTo`, `cureSetting`, `vaporizesAboveK`, `filteredTo`, `solubility`, `crystallizesTo`, **`solidsKgPerL` with sugar's exact accessor pair and semantics** (W8) — every one APPENDED at the end of `fieldMeta` and of the class | sugar's `fieldMeta`/method appends union with ours; `solidsKgPerL` is identical text (delete one copy); potash's `alkaliShare` is a different region | we merge, delete our `solidsKgPerL` copy in favour of theirs, keep our appends at the end |
| `K/lib/mould/Mould.ts` | `drainsInto(): (Stuff & Bulkable) \| null`, `setDrainedKg`, `creditDrainings()`, `bandsBelowFine()` inside `reconcileSetting` | — | `impression`, `receivedPour()`, `pourSuperheatK`, `pourDurationS`, `loadN()`, `pressRelease()`, the cure branch (an early `return` block ABOVE the drain arithmetic), slip absorption (its own branch), Chvorinov/survival/damp in `castInto` before the clone; **`drainsInto()` with sugar's exact signature and body** (W8, the bittern below the pan) | sugar keeps one `drainsInto` (identical); `creditDrainings` lands untouched below our cure branch; `loadKg` → `loadN` rename hits their `reconcileSetting` (`this.loadKg()` one call) — they rename the call | we merge, delete our `drainsInto` copy, rename their `loadKg()` call to `loadN()`, keep our branches in the stated positions |
| `docs/subsystems/mould.md` | the drainings paragraph (sugar D16) | — | rewritten in W7 (envelope, impressions, the pour, pressing, cure) | sugar adds its drainings paragraph under our *The drain set* heading | we rewrite around their paragraph, keeping it verbatim |
| `K/platform/idea/cmd/device/FireController.ts` + test | — | D12a fractions ÷ `massYield`; D12b weakest graded input; two `describe`s | REWRITTEN (no recipe path; light/hold/draught option/settle) | potash's two hunks do not apply; both rules already live in the transition (fractions ÷ `massRetained`; the heat-work grade rule) — they drop the hunks and re-pin their two `describe`s on a transition fixture | we rewrite over their file; their two `describe`s are re-pinned on a transition fixture as part of our rewrite |
| `docs/subsystems/fire.md` | — | the pearl-ash firing sentence | the `fire` section rewritten (W0) | potash's sentence is rewritten as *black salts calcine by a transition* | we rewrite; their sentence folds in |
| `BulkPayload` declarations (`lib/bulk/Bulkable.ts` untouched; merges from other files) | `dissolvedSolidsKgPerL` from `Thermal.ts` | the SAME member from `LyeStrength.ts` (to be deleted at sugar's merge) | `composition?: CompositionEntry[]` from `Composition.ts`; `leachCheckedS`, `seepCheckedS`, `absorbCheckedS` from `Bulkable.ts` itself; `dissolvedSolidsKgPerL` from `Thermal.ts` (sugar's text) | identical declarations merge; potash's `LyeStrength` copy is deleted by whoever lands after sugar | same |
| `K/platform/idea/api/BulkableLogic.ts` | the `dissolvedSolidsKgPerL` volume fold (step 5) | a `lye`-only fold (deleted at sugar's merge) | receiver survival BEFORE the debit; `mould.receivedPour()` AFTER the thermal coupling; the `composition` fold (W0) beside `dissolvedToxins`; **sugar's solids fold copied verbatim** (W8) | identical fold text merges; potash's lye fold is dropped by whoever lands after sugar | delete our copy of the fold |
| the `flux` tag | — | `flux` = the potash family; `stabilizer` new on quicklime; limestone's smelting tag → `smelting-flux`; `burn-lime` slot → `carbonate`; `SmeltController.isFlux` reads `smelting-flux` | we read no `flux` tag anywhere; glaze recipes slot `category: flux` for ash/lead/salt/tin fluxes — ⭐ we adopt potash's vocabulary now (`flux` on our glaze-flux rows; `stabilizer` where lime goes) so the rows are right in either order | nothing to do (our rows already speak their tags) | nothing to do |
| quicklime / lime | sugar D7: a quicklime import line on `rejection/…/store-counter.yaml` | `quicklime.yaml` + `stabilizer`; slaking in the soap kettle | `limestone.yaml` `heatTransitions` → quicklime (0.56), `burn-lime.yaml` DELETED; `store-counter.yaml` +firebrick/+crucible/+lead/+tin lines; W7 gypsum → plaster | sugar's counter line unions by line; potash's `burn-lime` slot edit meets a deleted file — the deletion wins | we delete their edited `burn-lime.yaml`; our counter lines union |
| `trade-potash/…/black-salts.yaml` + `recipes/calcine.yaml` | — | the calcine `fire` recipe (900 K, `massYield 0.8`, grade carried) | `heatTransitions` on the black-salts material (`referenceK 900`, `massRetained 0.8`, ladder → pearl ash, discipline ashery); `calcine.yaml` deleted; the cake keeps its `Ash` class and its potash fraction rescales by 1/0.8 (their D12a) | potash converts at their merge: delete `calcine.yaml`, add the block (text in the note), re-pin their wire step on the cake's material | we delete `calcine.yaml` and add the block in W0 |
| the sugar cone row (`trade-sugar/…/thing/cone.yaml`, `_materialPath: ceramic/ceramic`, class `/platform/thing/Mould`) | sugar's row | — | re-point `_materialPath` → `ceramic/earthenware` with an inside glaze coat and class → `/trade/ceramics/thing/Cone` (so a potter can make one) — **only when sugar is on master**; until then the row is untouched | sugar re-points its own row per the note (two keys) | we edit their row in W4's sweep |
| potash's `Ash` good (`trade-fuel/src/thing/Ash.ts`, `mintAshHeaps`) | — | the `Composition` ash good; `Burner.mintAshHeaps`; the clamp's `openClamp` ash branch | a lost burn is ordinary combustion (R3: above `fire.air.flamingCompleteness` the charge ignites and burns by the fire path); the ash it leaves inside a burner is minted through `Burner.mintAshHeaps` when present (a structural probe), else the shipped ash-template clone; `openClamp` is DELETED; ⚠ R4 MOVES `organic/{charcoal,coke,ash}.yaml` + `bulk/wood-tar.yaml` from `trade-fuel` to `base-library` at the same paths — potash edits `organic/ash.yaml` (tags) and adds `organic/spent-ash.yaml` there | potash's `openClamp` hunk does not apply; their `ash.yaml` edit re-applies on the moved file and `spent-ash.yaml` moves with it (both in the note) | we call `mintAshHeaps` directly; we move their `spent-ash.yaml` with the others |
| `K/lib/fire/Burner.ts` | `heatTransferFraction`, `deliveredPowerW()` | `ashAlkaliKg`, `mintAshHeaps`, heaps from `rakeGrate` | `heldTemperatureKFor`, `heatCeilingFactor`, `chamberVapors`, `settleFiring` | three regions; `fieldMeta` union | same |
| `trade-fuel` `CharController.ts` / `CharcoalPit.ts` | — | `openClamp` ash minting | REWRITTEN / three templates removed (ruling A) | their hunk does not apply (above) | we rewrite over theirs |
| `trade-glass` recipes | — | `glass-batch*.yaml` slots `flux`/`stabilizer` | all three glass recipe rows DELETED (R1: the batch pot blends by mass; the materials carry potash's `flux`/`stabilizer` tags); `remelt-cullet.yaml` deleted | their slot edits meet deleted files — the deletion wins; their tags live on the materials | same |
| `base-library/…/material/wood/*.yaml` | — | `alkaliShare` ×9 | `heatTransitions` ×9 | union by key | union by key |
| `K/lib/mixin.ts`, `K/api/mixin.ts` | `Percolating` + `isPercolating` | — | `Faced`, `Greenware` + predicates + refusals | appends; union | appends; union |
| `K/lib/config/AppSettings.ts` + settings yaml | `employmentUnpaidStandGameDays` | `fireAshHeapKg`, `fireAshAlkaliMaterial`, `potash.*` | `ceramics.*` (pack yaml), `thermal.evaporation.*`, `faces.*`, `impact.*` | appends; union | appends; union |
| `PackLogic.discover.test.ts` | +2 | +1 | +1 (66 on our base) | whoever lands second recounts — the sum | same |
| root `package.json` / `pnpm-lock.yaml` | +2 packs | +1 | +1 | union the block; `pnpm install`, never hand-merge the lockfile | same |
| `trade-quarrying` | — | `burn-lime.yaml` slot; `OpenWorking.test.ts` tag list | `Lump` + `Thermal`; `Clay.ts`; `clay.yaml` re-classed; `fire-pot.yaml`/`burn-lime.yaml` deleted; `limekiln.yaml` bill | the deletion wins; their test's tag list stands | same |
| `rejection` | `store-counter.yaml` +1 line | ashery, lean-to, ash-burner, glasshouse counter | fireclay/gypsum bands; foundry; four furnace rooms → `PersistentLocale`; counter lines; `relines` on four keepers; `package.json` + ceramics | line-unions; `glasshouse.yaml` potash adds a counter prop, we add nothing there (the bill is on the kiln ROW) | same |
| `terminus` | pantry, Veshko | chandlery counter `buys` line; general-store tests | stall rows; general-store + chandlery lines re-pointed; `package.json` + ceramics | line-unions; their test recounts lines | same |
| `hearts-delight`, `trade-ceramics`, the four wire files | — | — | ours alone | — | — |

### ⭐ What W8 uses, and from whom

- **Crystallize** ships on MASTER's code: the payload field
  `dissolvedSolidsKgPerL` (sugar's declaration, copied verbatim into
  `Thermal.ts`), `Material.solidsKgPerL` (sugar's accessor pair, copied),
  the pour fold (sugar's hunk, copied), and `Mould.drainsInto()` (sugar's
  signature and body, copied). None of sugar's OTHER machinery
  (`boilingPointElevation`, `concentratesTo`, `concentrateIfReached`,
  `Percolating`) is needed or touched. The sun-dried `brine` maturation
  profile rescales the field as it concentrates (one line in
  `reconcileEvaporativeWindow`, a function sugar does not edit).
- **The filter depends on nothing of sugar's.** It is a `Ware` whose
  porous body SEEPS (W1's `reconcileSeep`) into the vessel beneath
  through the same `drainsInto()` we ship, swapping the material by
  `Material.filteredTo` on the way. `PercolatingMixin` is not used.
- **Potash's `calcine`** becomes a transition block (above); the ash
  minting converges on `mintAshHeaps` by probe.

### Before the MR merges — the probe (repair's precedent)

In a throwaway DETACHED worktree (never a branch two worktrees hold):
`git worktree add --detach ../probe reqs/ceramics && cd ../probe && git
merge origin/reqs/sugar && pnpm install && pnpm -C packages/server
lint:family` — then the same with `origin/reqs/potash`, then
`origin/reqs/underwater`, then all three together. Read
every conflict against the table above; fix the SHAPE on `reqs/ceramics`
(never in the probe), re-probe, then `git worktree remove ../probe`. A
sibling that merged to master in the meantime is simply
`git merge origin/master` into `reqs/ceramics` with the same table.

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
  arithmetic is `ThermalRegulation.wetBulbK(ambient, humidity)`
  (`protected`, l.878; read at l.412/450).
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
  `soft-soap-jar par 4`, `lye-flask par 4`; `general-store/counter.yaml`
  l.99–100 `pot/small par 3`, `pot/large par 2` (and prices at l.478–479)
  — the plant-pot lines AC 13 re-points. Market:
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
  (default 1), agent?: {material, optimum, over}, scorchAboveK?,
  requiresAtmosphereBelow?, volatiles?: {material, litresPerKg}[],
  ladder: {atDegree, becomes, reducing?}[], over?: string, scorched?:
  string, vapor?: Record<materialPath, coatMaterialPath>, discipline?}`. `degree` is rubber's formula
  unchanged. ⭐ **The agent is read off the PIECE's own composition**
  (ruling B): `agent.material` is a material path and the fraction is
  `fractionOf(it)` on a `Composition` host — rubber is COMPOUNDED with
  sulfur first (`stir` raw rubber + sulfur in the works' mixing tub →
  `compounded-rubber`, a `Composition` good; W0 ships the recipe row, the
  tub and the material), so nothing sums sibling pieces. The four rubber
  rows map onto `ladder: [{0, compounded-rubber}, {0.6, rubber}]`, `over:
  ebonite` (agent ≥ `over`), `scorched: burnt-rubber` (peak ≥
  `scorchAboveK`). Clay is a continuous
  ladder (`terracotta 0.15 · earthenware 0.4 · stoneware 0.7 ·
  refractory 0.95`, `over: clinker`, `reducing` → the blue/celadon twin of
  each rung by a `reducing:` map on the rung); limestone is `[{0,
  limestone}, {1, quicklime}]`, `massRetained 0.56`, `referenceK 1170`;
  gypsum → plaster at 420 K, `0.85`; a glaze slip fuses at its maturing
  heat; the glass batch → glass at 1400 K, `0.72`. ⭐ **Wood is the
  clamp (ruling A):** `wood/*.yaml` author `{referenceK 650, zK 40,
  fullDoseS …, requiresAtmosphereBelow: fire.air.flamingCompleteness,
  massRetained 0.25, ladder: [{0.35, organic/half-burnt-wood}, {0.8,
  organic/charcoal}], volatiles: [{wood-tar, 0.08}], discipline:
  colliery}` (every material path base-library's — R4); coal the same
  shape to coke with tar and gas. ⚠ **Pyrolysis needs starved air, and
  ONE dial decides which path runs (R3):** below
  `fire.air.flamingCompleteness` (0.6) a combustible in a chamber cannot
  ignite (`FireLogic.mediumBurns` — underwater's gate, one shared
  function, called from `igniteImpl` and `tryAutoigniteImpl` — reads its
  burner's `completeness()` as its chamber-air arm, R3) and the
  transition accrues; at or above it the
  transition accrues nothing and the wood IGNITES and burns by fire.md's
  path to its `charMaterialPath` — the collier's lost burn is ordinary
  combustion, and the ash it leaves is minted through the burner
  (`Burner.mintAshHeaps` when present, else the shipped ash clone). A
  `Burning` host accrues no transition at all. So a log on an open hearth
  above 570 K ignites; a log in a sealed clamp (draught 0.45 ⇒
  completeness ≈ 0.53) or a shut retort pyrolyzes; a log in an open kiln
  at full draught
  burns. ⭐ **Vapors (ruling B):** a chamber's atmosphere carries what
  vaporized in it — `Material.vaporizesAboveK` (salt 1350 K) makes a
  content lump of that material vaporize into the chamber's
  `chamberVapors` (D3) and destructs it; a transition's `vapor:` map lays
  a fused coat of the named glaze material on the piece's outside face
  when that vapor is present at the rung (salt → `glaze/salt`). A
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
  completeness per stretch, and its `chamberVapors` (a runtime
  `Record<materialPath, kg>` on `BurnerMixin`, fed by `Oven`/`BrickClamp`
  content reconciles for any content whose material `vaporizesAboveK` ≤
  the held K, cleared at `douse`/burnout; the record carries
  `atmosphere: {completeness, vapors}`). `BurnerMixin` gains `@hook
  heldTemperatureKFor(body: Stuff): number` (default
  `getHeldTemperatureK()`), which `Thermal.heatSourceK()` asks instead of
  the bare getter — the clamp overrides it by the brick's position (D15).
- **D4 — ⭐⭐ `fire` lights and holds; it decides nothing about the charge.**
  `FireController` is rewritten: `fire [<burner>] [--draught <word>] [for
  <hold>]` (alias `burn`). ⭐ Parse rules, so the draught can never
  swallow the kiln: the `kiln` arg keeps its shipped shape (positional
  or `in`/`at`, default `reachable:[mixin.BurnerMixin]`, `requires:
  BurnerMixin`) — `fire kiln`, `burn kiln`, `fire in retort` all bind as
  today; the draught is a **command option** `--draught wide|open|half|
  low|banked` (the ladder's rung 3; the shipped `draught <word>` verb
  stays the in-burn adjustment); the hold is `for <duration>` (greedy
  after `for`). ⚠ `burn lime` is not a shape this view ever accepted —
  the charge is what is IN the chamber, never an argument — and the
  extraction drive types `burn kiln`, which keeps working. The controller
  sets the draught, refuses `no-charge` / `not-lit`, engages the hold
  (sealed down), and at completion
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
  'wet'|'fused'|'crazed'|'run'|'crawled', dirtyAtLay?: number}`
  (construction's `{material, thicknessM}` reused verbatim; ⭐ the two
  faults the requirements name beside crazing are STATES too: `run` is
  the glaze transition's `over` rung — a coat fired past its
  `scorchAboveK` runs to the foot, pools, and grades the piece down;
  `crawled` is laid at the dip when the face's `soilAt(face)` exceeds
  `faces.crawlDirt` (cleanliness's grease and dust), recorded as
  `dirtyAtLay`, and becomes `crawled` at the fuse — bare patches, so
  `holdsWater(face)` is false); `faces()` answers `['outside']` + `'inside'` iff the host is
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
  ambient (not in `effectiveR`), ⭐ **and only in AIR**: it answers 0
  whenever the body is immersed — underwater's `immersedTag !== null` /
  `BiomeApi.mediumFor(host).immersed` branch (revision 4) wins, because
  water evaporates nothing off a thing that is in it; heat-work reads
  whatever ambient the body has, water included. `BulkableMixin` gains the seep:
  `reconcileSeep()` on read — a vessel whose holder `isFaced` and whose
  `inside`/`outside` do not `holdsWater` loses `porosity() ×
  thermal.evaporation.seepLPerHourPerL` litres per hour to its own
  `wet()`, so the jar's outside stays wet, cools by evaporation, and its
  contents (the vessel's Thermal IS its contents on a `CraftVessel`) read
  cooler than the air. A glazed jar seeps nothing.
- **D7 — The lead leach is a bulk fact, not a maturation one.** The
  requirements say *through `imparts`*; `MaturingMixin.imparts` is aroma on
  a batch clock and composes only on `Vat` and the chandlery's
  `SoapKettle`, while the crocks the drive
  fills are `CraftVessel`s with no batch. The honest host of *what the
  inside coat gives the contents* is the slot that holds them:
  `BulkableMixin.reconcileLeach()` (per slot, stamped `leachCheckedS` on
  the payload) reads the holder's inside outermost layer material's
  `leaches: {toxin, mgPerLPerDayPerAcidity}[]` × the contents material's
  `acidity` (new `Material.acidity`, 0..1; vinegar 0.9, wine 0.7, whey 0.5,
  brine 0.6, water 0) × days, and adds to `payload.dissolvedToxins`
  (metabolism's own field; `Metabolic.ingest` doses it with no new code).
  No sense reads it. Maturation's `imparts` is untouched. ⚠ Recorded under
  *Positions taken* (owner-confirmed) as the one place this plan reads a
  requirement loosely.
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
  `GreenwareMixin` (requires `WaterActive & Thermal & Tangible & Faced` —
  ⭐ so every composer composes `WaterActivityMixin` itself, Turf's
  dries-but-does-not-rot shape; `lint:perishable` is satisfied because no
  clay body tabulates a spoil activation energy). ⭐ **Green ends at firing
  (R2):** every read below answers only while `heatWork` records
  `degree 0` for the body's first transition (the material still
  `plastic`-tagged); after the first rung the mixin is inert and the
  piece's relation to water is D6's porosity, weep and seep alone:
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
  - `knead` — working a plastic mass by hand to a window (lands in W0:
    rubber's compounding is a knead). `K/lib/craft/Kneadable.ts` (the
    Cuttable shape); `DoughTrough` implements `kneadPlanFor` (its
    `mintFromBuild` moves into the plan's `onComplete`); a `MixingVessel`
    is the kernel's default planner (the blend by mass, D34) and the
    temper pit adds water-to-the-window and the tread. Baking's view and
    controller move to the platform (the `dry` precedent).
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
  - `char` is NOT promoted and stays `trade-fuel`'s word (ruling A): the
    view keeps its `clamp` and `draught` args; `CharController` becomes
    *set the draught, `ignite` if cold, engage the three-day hold* and its
    completion reconciles the contents (the `fire` completion's one
    method, `Burner.settleFiring(by)`, shared) and narrates by the
    lengths' rungs — charcoal / brands / ash — crediting `colliery` from
    the wood transition. `openClamp`, `outcomeFor`, `yieldFor`, the three
    template fields and the per-basket mint are deleted: the cordwood
    lengths BECOME charcoal (material `organic/charcoal`, mass × 0.25),
    which `stoke` already takes by the `fuel` tag; `charcoal.yaml` and
    `brands.yaml` stay as rows for props and stock lines.
  - `dip` keeps `verbs: [dip, melt]` in the platform view (the chandlery's
    alias rides along); the `DipPot` plan still melts a cold cake of
    tallow first, and the kernel default plan on a bath that holds no
    liquid refuses *nothing to dip in*.
  - `hammer` is NOT promoted (both syntaxes are the plan's position): `hammer <blank> on <die>` binds `on` to the
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
  product rows.** `K/lib/craft/FormSpec.ts` value object: `ParsedForm {class:
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
  `GreenwareMixin(WaterActivityMixin(StackableMixin(DurableMixin(CraftedMixin(
  ThermalMixin(Good))))))` — bricks, tiles, firebricks, blocks are rows;
  `Ware` = `GreenwareMixin(WaterActivityMixin(AssembledMixin(DurableMixin(
  CraftVessel))))` (⭐ `Assembled` so `fit handle to jug` binds —
  `CraftVessel` composes neither; `WaterActivity` because D13 requires it
  and `CraftVessel` has none) — mugs, jugs, crocks, jars,
  flasks, bowls, the filter, the potter's crucible row (`/trade/ceramics/
  thing/crucible`, which the smelt's `crucibleIn` finds by mixin exactly
  as today and which **wears per melt** (D19); the smelting pack's own
  `crucible.yaml` stays its own row, R4); `Cone` = `GreenwareMixin(WaterActivityMixin(Mould))`
  (sugar's cone re-points its class to it so a potter can make one; the
  row stays sugar's); `FlowerPot` = `GreenwareMixin(WaterActivityMixin(ThermalMixin(DurableMixin(
  PlantPot))))`; `Sherds` = `StackableMixin(Good)` (`grind` → grog by a
  millstone recipe row, the `bone-meal` shape); `Stamp` = `MouldMixin(Good)`
  with `pressKind: blow` and an `Impression` (D21); `Wheel` and
  `BrickTable` = `ToolMixin(DurableMixin(Good))` (⭐ `Tool` because
  `shape`'s instrument arg `requires: [ToolMixin]`; `capabilities:
  [wheel]` / `[brick-table]`) and implement `ShapePlanner`; `TemperPit`
  and `GlazeBucket` are `MixingVessel` rows/classes (D34); the pack `lib/` holds
  nothing — every mixin it composes is the kernel's. ⚠ `Ware` and `Brick`
  are NOT the 22 rows' classes: those keep their classes and re-point
  `_materialPath` + `coats:` (D18).
- **D18 — S1 re-pointing is rows: material + coats, classes unchanged.**
  Four body material rows in `C/trade-ceramics/content/trade/ceramics/idea/
  material/{terracotta,earthenware,stoneware,fireclay-body}.yaml` (the
  fired bodies, each with `thermalExpansion`, `hardness`, `toughness`,
  `wAC`, `brokenTemplate: /trade/ceramics/thing/sherds`, tags `[ceramic,
  mineral, solid, brittle, fired, …]`) and `porcelain.yaml` (import). Each
  of the 23 rows (the list is in W2) gets `_materialPath` → its S1 body and, where glazed,
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
  yard; the pour into it is a game-day engaged `pour`: `MouldMixin` gains an
  authorable `pourDurationS` (0 = instant, the default) and
  `K/platform/idea/cmd/bulk/PourController.ts` — the one change — asks
  `MixinApi.isMould(target) && target.getPourDurationS() > 0` and runs the
  transfer as the completion of a sealed-down `ManualBuildStep` on the
  attention slot (the `fire` hold's shape) instead of inline; every other
  pour is byte-identical. ⚠ The requirements say *the mould is a place*; a fixed
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
  and the re-pointed lines (general store: the two existing plant-pot
  lines `pot/small` / `pot/large` (counter.yaml l.99–100) → the pottery's
  `/trade/ceramics/thing/plant-pot-small` / `plant-pot-large` (two form
  rows, two product rows); chandlery: `soft-soap-jar` and `lye-flask` →
  the pottery's `jar` and `flask` rows; the general store's `honey-jar`
  line → the pottery's `jar`) all name the pottery as supplier with
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
- **D32 — W8 ships on master's code, in sugar's names.** Crystallizing is
  a third arm of `reconcileBulkPhase`: a bulk whose material authors
  `solubility: [[K, kgPerL]…]` and whose payload `dissolvedSolidsKgPerL`
  (⭐ declared by us from `Thermal.ts` with sugar's exact text, seeded
  from `Material.solidsKgPerL` — sugar's accessor pair, copied — and
  folded on a pour by sugar's hunk, copied) exceeds `solubilityAt(T)` sets
  the excess (`castInto` on a Mould, else a crystal lump beside) and keeps
  the saturated liquor, whose material swaps by `crystallizesTo.residue`
  (bittern) and drains below through `Mould.drainsInto()` (⭐ ours, with
  sugar's signature and body). The sun-dried `brine` evaporative profile
  is kept and taught to rescale the field as it concentrates (one line in
  `reconcileEvaporativeWindow`, which sugar does not edit). The filter
  depends on nothing of sugar's: `/trade/ceramics/thing/water-filter` is
  a `Ware` row whose porous body seeps (W1's `reconcileSeep`) and whose
  seep, when the filter stands on a vessel (`drainsInto()`), lands there
  with the material swapped by `Material.filteredTo`. The water pack's
  draw picks `fouled-water` (organic/sediment dominant; `filteredTo:
  water`, `purifiedByBoiling: water`) or a new `tainted-water` (persistent
  dominant; neither arrow) by the reach's `contamination.byKind` — two
  rows and one branch in `WatercourseCatalogue`'s draw. Nothing in the
  wave waits on a sibling.
- **D34 — ⭐ Mixing is one rule (R1).** `K/lib/material/Mixing.ts`:
  `MixingVesselMixin` (requires `Container & Bulkable & Thermal`), fields
  `blendMaterial` (the material the blend IS — the vessel decides the
  blend's name exactly as a mould decides a cast's shape) and
  `blendTemplate` (the row a SOLID blend is minted as; absent = the blend
  is bulk in the vessel carrying `payload.composition`); `blend(by)`:
  fold every tangible content and the interior bulk by mass —
  `CompositionMixin.absorbComposition(entries, massKg)` on the product,
  each input contributing its material's kind-composition plus its own
  `alloying` — destruct the inputs, mint the blend (a `Composition` good
  of `blendTemplate`, or rewrite the interior to `blendMaterial` with the
  folded `payload.composition`), stamp the maker. No recipe, no ratio:
  one sand too many is a lean batch, one sulfur nodule too many is
  ebonite. The verb follows the state: `knead` (a plastic mass —
  `MixingVessel` is the kernel's default `KneadPlanner`), `stir`
  (`StirController` gains the one arm). Four vessels on day one: the
  rubber works' mixing tub, the glasshouse's batch pot, the brickfield's
  temper pit (the ceramics class over a `Thing`), the pottery's glaze
  bucket. The glass batch's iron is its sand's by this fold (glass.md's
  colour-as-grade unchanged); the glaze's flux names the coat. *Decided
  by* lens 1 (a blend is arithmetic a player can predict) and the owner's
  R1. *(Renamed in re-plan R1, W-R1b: `CompoundingMixin` in
  `K/lib/material/Compounding.ts`, `productMaterial`/`productTemplate`,
  `compound(by, verb)`, the kernel twin `CompoundingVessel`; the fold is
  `MaterialApi.foldMakeup`.)*

### Build decisions (recorded as the build made them)

- **B1 (W0) — Clay is THREE transitions, not one ladder.** Ceramic heat-work
  is steep in temperature (an Orton cone bends ~20 K lower for a ten-times
  soak), so one dose cannot carry a terracotta firing to stoneware without
  making time a substitute for heat. `earth/clay` authors `terracotta`
  (ref 1200 K), `earthenware` (1330 K), `stoneware` (1480 K, scorched →
  clinker above 1560 K), zK 30, each its own reference — same evaluator.
  *Lens 1* (cones measure exactly this).
- **B2 (W0) — The pool field is `BulkPayload.alloying`, not `composition`.**
  `composition` is already the drink blend's (`BlendPart[]`). It is the
  piece's own `alloying`, molten. ⚠ The sibling note's name changes.
  *(Renamed in re-plan R1: both are `BulkPayload.makeup` now, by mass
  fraction — W-R1a.)*
- **B3 (W0) — `requiresStarvedAir: true`, not `requiresAtmosphereBelow: <n>`.**
  One dial, two readers (R3): the transition and `FireLogic.mediumBurns` both
  read `fire.air.flamingCompleteness`; a number on each wood row would drift.
- **B4 (W0) — A rung restamps prose without re-classing.** The old
  material's name is swapped in the short description (*lump of limestone →
  lump of quicklime*); where the name is absent the rung's `describes` word
  goes in front (*charred length of cordwood*); the long description gains
  one sentence of the new appearance, replaced (never stacked) next rung.
- **B5 (W0) — The lost burn is the BED's.** `Burner.catchContents()` (fire
  tick + `settleFiring`): in a chamber at or above the flaming dial, a
  non-`Combustible` piece of a fuel material above its autoignition goes
  onto the bed (skipping the too-wet stoke gate) and burns by the burner's
  own path, its ash in the grate. Cordwood is a `Crop`, not a `Combustible`,
  so R3's "it ignites" needed a home; the burner is it.
- **B6 (W0) — `heatSource()` looks one hop through a mould** to a lit burner
  (the rubber worker): stock in a boot mould in an oven otherwise never
  heated. ⚠ Sugar's identical `heatSource()` text now differs by that hop.
- **B7 (W0) — The census is by retired ROW ID.** The old `firingsFor` shape
  (heat > 0, item slots, no tools) also matched eight live rows other verbs
  run (`smelt`'s charges, smoke-cure, the toasts, melt-wax) — a kiln could
  have "fired" a smoke-cure. `FireController.test` asserts the ten retired
  ids are gone instead.
- **B8 (W0) — Smelt fuel is reckoned by MASS** (≥ 16 kg; ratio = fuel kg ÷
  charge kg). Charcoal now comes out of a clamp as the lengths that went in
  at a quarter of their mass (≈ 21 % of dry wood — real), where the old yield
  was 84 %; counting pieces would have quadrupled a coppice. A panel is now
  ≈ 38 kg ≈ two smelts a year (the panel headers restated). *Lens 1*.
- **B9 (W0) — The reducing threshold is the kernel's**
  (`thermal.heatWork.reducingBelow` 0.55), not `ceramics.atmosphere.*`: the
  rung's twin is the heat-work reconcile's read.
- **B10 (W0) — Different matter does not stack.** `Stackable.canMergeWith`
  refuses two pieces of different material or fired differently (a lump of
  quicklime keeps the limestone row).
- **B11 (W0) — Fuel rows.** The clamp holds a charring heap's 720 K (not the
  1420 K forge figure) with a 40 kg hazel kindling bed (`char` stokes one
  length when empty); the retort's row draught is 0.3 (its default 1 was
  flaming); `pitch.yaml` moved with `wood-tar` (R4). `brands.yaml` is half-
  burnt wood.
- **B12 (W0) — Glass.** `Melt` is not `Meltable` (it IS the molten pot); `gob`
  defaults to `class.Melt` ∪ `class.Casting` and a bottle is named (`gob from
  bottle`); `reconcilePhaseImpl` takes the melt branch for a meltable VESSEL
  only at/above its melting point (else a bottle's contents never froze or
  boiled). ⚠ Remelted cullet no longer comes back a step greener — that
  step was the deleted melt row's own iron; `glass.pot.ironPickup` was never
  read. Recorded as a seam in `glass.md`.
- **B13 (W0) — Rubber.** The cure's agent is `/stuff/idea/material/mineral/
  sulfur` (the quarry nodule mixes in under its own path); the stock row is a
  `Casting`; a conversion records its `agentFraction` so a cast (not a
  `Composition`) keeps grading; the cast's cure grade is set at its mint.
- **B14 (W0) — Rows nothing mints any more are deleted, not kept.** A
  firing changes the piece in place, so the old recipe OUTPUT rows were
  reached by nothing (`lint:reachability` arm R): `/stuff/thing/clay-pot`
  (W2/W4 name the potter's pot rows instead), `/trade/fuel/thing/{brands,
  coke}`, `/trade/glass/thing/{melt,amber-melt}`. The batch row (class `Melt`)
  IS the melt now. `blendTemplate` is a FAUCET (a mixing vessel mints it).
- **B15 (W0) — `handTool: pyrometry` waits for the cones.** A capability
  nothing offers is a gate nobody passes (`lint:capabilities`); the glow
  words ship now, the cone rung lands with the cones row (W5/W6). The
  burner's `heatCeilingFactor`/`onFireStart` hooks likewise land in W5 with
  their overriders (`lint:unconsumed-seams`).
- **B16 (W1) — The bath flag is `Material.laysCoat`**, not `coats` (a good's
  `Faced.getCoats(face)` is the other meaning of the word).
- **B17 (W1) — One payload stamp, `faceCheckedS`**, for the whole face
  exchange (leach, weep, aroma memory) — not three stamps; at most once a
  game-minute, on an interior read.
- **B18 (W1) — A weeping vessel counts its surface fully wet** for
  evaporation: the film is there as long as it weeps, whatever the body's
  average saturation. ≈ 6 K under a 300 K room at half humidity.
- **B19 (W1) — `ThermalRegulation.wetBulbK` stays as a one-line delegate** to
  `Evaporation.wetBulbK()` (one formula), so its two call sites — beside
  underwater's hunks — are untouched.
- **B20 (W1) — `dip`'s target is `requires: any`** (the chandler's beeswax
  cake is a plain `Thing`, not `Faced`); the controller refuses `not-faced`
  in words. Grammar: `dip [<thing>] [inside|outside] [in|into|from <bath>]
  [inside|outside]`. Tin glaze leaches lead too (a historic tin glaze is a
  lead glaze made opaque).
- **B21 (W1) — Coats fuse by the WINDOW's peak** (`reconcileCoats` on every
  `Faced` body's thermal read), never the lifetime's, so a glaze laid on a
  bisque fuses at the glost firing and not off the bisque's past.
- **B22 (W2) — `Tangible` judges, others act.** `TangibleMixin` is in every
  Thing's base chain, and importing `ContainmentApi`/`BulkableApi`/
  `MessageApi` there made a module cycle ("TangibleMixin is not a function"
  in two suites). So `Tangible` owns `impactVerdict`, `sufferImpact` (the
  break, pieces placed through the new `Containable.leaveBeside(item)`),
  and `ringSound()`; `BulkableMixin.sufferImpact` spills a vessel's
  contents before the break; `RingController` tells the sound.
- **B23 (W2) — Strength is toughness × V × (V/Vref) × `impact.fractureShare`.**
  A thicker wall must be disproportionately stronger or the drive's
  novice-mug-survives / master-bowl-breaks pair is impossible; the floor
  scales the blow by `min(1, floor hardness ÷ body hardness)`.
- **B24 (W2) — Thermal shock** is a STEP (`setContentsTemperature`: boiling
  water into a cold mug) or a RATE over ΔT_tol ÷ `impact.shockWallS`, with
  ΔT_tol = `impact.shockStrain` ÷ α × (1 + 10·porosity) ÷ (1 − 2·grog) ×
  0.7 if glazed — dunt past 1×, visible crack past 2×; a crack leaks
  (`holdsWater` false). Judged on every brittle body's thermal read, not
  only those with heat transitions (born-fired rows have none).
- **B25 (W2) — The glazes live in base-library** (`/stuff/idea/material/
  glaze/{lead,ash,salt,tin}`): the re-pointed rows' packs do not depend on
  trade-ceramics (R4). Sherds are the commons `/stuff/thing/sherds` (class
  `/platform/thing/Scrap`, `Stackable(Good)` sold by mass); grog's millstone
  recipe takes anything `fired` (a whole pot is grindable too).
- **B26 (W2) — `canBeNamedBy(handPath, by?)`** — the bond rule needs the
  person, not just a path. The maker may name an unnamed thing once;
  ⚠ W4's `Ware` must compose `NamedMixin` (`CraftVessel` does not), or
  `name jug …` is refused `not-nameable`.
- **B27 (W2) — `ring` carries** by `toAudible` at 50 + 10·log₁₀(kg) dB for a
  sound body (a bell to the next street), 35 dB for a knock.
- **B28 (W3) — The freeze-thaw count is stateless** over `dailyRangeAt`,
  walking at most 400 days; `AtmosphericMixin.freezeThawDaysSince` answers 0
  for a place that holds its own air.
- **B29 (W3) — Green ware's dials are the KERNEL's** (`green.*` in
  `AppSettingKeys` + `settings/green.yaml`), not `ceramics.green.*`: the
  mixin is kernel and dairying's setting pan composes it.
- **B30 (W3) — Green state is DRYNESS against the air**, `(1 − m) ÷ (1 −
  equilibrium)`, so *bone-dry* means as dry as this air allows (the shipped
  water model's equilibrium is h/100, which would otherwise pin a piece at
  leather-hard in a 50 % room forever).
- **B31 (W3) — The weather's ruin is a FLAG** (`slumped` | `shattered`, plus
  a crack flaw), not a destruction: the piece stays to be looked at and
  re-kneaded. The heat-work reconcile asks green ware to read its weather
  first, so a wet piece's steam burst is seen before a rung swaps it. A
  too-fast drying leaves a `check`.
- **B32 (W3) — Clay rows extend the commons clay** (`extends:
  /stuff/idea/material/earth/clay`): alluvial clay inherits the three
  transitions, fireclay overrides them (terracotta at 1250 K, refractory at
  1550 K, clinker only past 1800 K); gypsum and clay-mineral are base-library
  rows (R4). The temper-pit ROW waits for W6's brickfield (nothing props it
  yet, `lint:reachability`).
- **B33 (W4) — `shape` grammar:** `shape [<material>] [with|on|at
  <instrument>] [into <form…>]`; with no `into` the material word IS the
  form, so the glassblower's `shape bottle` binds word for word. Instruments
  plan first (wheel, brick table, blowpipe), then the clay by hand.
  `FormGrammar` parses capacity words (pints, quarts, gallons, cups,
  litres); an unknown word refuses naming the five classes.
- **B34 (W4) — `Ware` = Greenware(WaterActivity(Assembled(Named(Durable(
  Composition(CraftVessel))))))** — Named so a maker names it, Assembled so a
  handle fits, Composition so it keeps its clay. A form with `seats:` is
  born with that bill line EMPTY (else `fit` hands back a phantom handle).
  ⚠ `SettingPan` did not compose `WaterActivity` before (a plan premise
  was wrong); it composes both now.
- **B35 (W4) — Carve logic stays in the platform controller** (a carving
  recipe is a platform idea and `carve haft` has no target to ask); a
  target that plans (green ware: foot/trim/pattern at leather-hard) answers
  first. The mark is `Crafted.mark` (an identity path); the base line
  ("bears X's mark, fired <date>") survives firing. The die is a shape
  probe on `hammer`'s anvil (`strikeWith`).
- **B36 (W4) — The slip joint has no competence band** (a beginner's
  starting band is below novice and would be refused); a dryness mismatch
  over `green.joinMismatch` joins with a visible check.
- **B37 (W5) — The clamp** (1474 K, draught 0.6 → held ≈ 1366 K over three
  days): middle ×1 → earthenware (sound brick), channels ×1.25 → clinker,
  skin ×0.9 (less rain and wind) → terracotta (place brick); a `half`
  draught is reducing (blue). A better setter's channel share is smaller
  (untrained 0.35 … expert 0.12). A brick's position lives ON the brick
  (`clampPosition`, survives a restart); a split carries the piece's whole
  state.
- **B38 (W5) — Linings:** health = (count − failed − (1 − condition)) ÷
  count over the bill's `lining` line; the ceiling is 0.6 + 0.4 × health;
  wear = `fire.lining.wearPerHour` 2 bricks/h × (held ÷ the lining's melting
  point)³ — a smelting furnace (8 bricks) relines every few runs (bloomery
  practice), the Kiln (30) every ~38 h at heat; burnt through below 0.15
  refuses `ignite`. `fit lining to <furnace>` needed a new FitController arm
  (a word naming a line of the named whole; parts taken from hands, then
  the room). The keeper's `relines` brain walks authored ways, buys on the
  house card, fits. Bills: furnace 8, limekiln 24, retort 12, Kiln 30.
  The furnace rooms are `PersistentLocale`.
- **B39 (W5) — Rejection's store sells the SMELTING crucible** (the potter's
  `/trade/ceramics/thing/crucible` is green ware until fired); firebrick is
  the commons fired row, an import until W6's brickfield supplies it.
  `measure size` blurs by competence (±8 % untrained).
- **B40 (W7) — The mould dials are the KERNEL's** (`mould.*` in
  `AppSettingKeys` + `settings/mould.yaml`), not `ceramics.pour.*`: the
  mixin is kernel (B29's precedent). `misrunKcm` 15, `sandEffusivity` 850,
  `blowWetness` 0.3, `blowBurnJ` 40, `rammedWetness` 0.15, `pressNPerKg`
  2000, `overpressExponent` 0.15.
- **B41 (W7) — What a thing leaves pressed into something soft is ITS
  answer**, `TangibleMixin.leaveImpression(nowS)` (a `@hook`), not a helper
  in the mould: the carved `Pattern` overrides it with the impression it
  was cut to, and the board that carves it reads the same answer off the
  thing (no new public static anywhere). The cast's provenance is a
  Tangible field, `castFrom {kindPath, takenFromIdentity, takenAtS}`, so
  interchangeability (D27) and the die's token read one record; the seams
  and *taken from* are written into the cast's prose at the set.
- **B42 (W7) — Misrun and shrinkage judge a CLOSED cavity only** (any mould
  holding an impression, or `closedCavity: true` — the bell pit). An open
  ingot trough is its own riser and fills from above; judging it would
  have failed the dairy drive's tiny copper ingot. A pour that runs short
  of the cavity is a misrun too; the overfill of a metal is a *runner and
  riser* lump beside the cast (never lost); a slip's is poured back.
- **B43 (W7) — The undercut is refused at the IMPRESS, not at `castInto`**
  (the plan's place): the set has no actor to tell, the impress does. An
  undercut is derived — more than one line in the pattern's bill (a sword's
  four parts; a jug's one handle line is not).
- **B44 (W7) — The damp blow happens at the POUR.** `receivedPour` marks
  the mould blown; `Bulkable.afterPouredInBy(by, litres)` — a new `@hook`
  the pour verb calls, the twin of `afterPouredOutBy` — throws the metal at
  the pourer (`ConditionApi.inflict` heat, hands); the set mints a *blown
  lump*. A sand flask is dampened by pouring water into it: an `absorbent`
  mould drinks plain water into its own wetness.
- **B45 (W7) — Past the reference load the drain set keeps firming**, as
  `loaded × ratio^(−0.15)`, and the ratio is no longer capped at 1 for the
  moisture (the pace still is). ⚠ This moves a shipped number: the 12 kg
  stone on a 2 L hoop is ~2.9× its reference, so its wheel presses to 0.47
  rather than 0.55 (`hoop.test` restated). Without it a screw press could
  not make a cheese firmer than a stone, which S16 requires.
- **B46 (W7) — The bell pit's slow pour transfers AT ONCE and holds the
  founder's attention after** (six game hours), crediting `founding` at
  `hard` when the watch is kept — not the transfer at the completion the
  plan named: a crucible held a game day before the pour would have set.
- **B47 (W7) — Survival is asked of INTERIOR receivers only** (a floor is
  never one), right after the material-compatibility step and before the
  closure step. A melting receiver is destructed at once and its broken
  form placed where it stood; a burning one ignites through its own
  `ignite` when it is `Combustible`, else chars away. Statuses `melted` /
  `burned`.
- **B48 (W7) — An alloy salvages as itself.** `salvageImpl` used to flatten
  every material to its elements, so salvaging pewter would have handed back
  tin and lead apart — which a melt never does. A material tagged `alloy`
  and `metal` is one constituent now (D27's *a pool, which recasts*). Fired
  clay's branch is the authored `brokenTemplate` (≠ its cast template) at
  full mass.
- **B49 (W7) — The die is a `Tool` with `capabilities: [anvil]`**, not a
  `Mould` with `pressKind: blow` (D25): `hammer`'s anvil arg `requires:
  [ToolMixin]`, so only a tool reaches its `strikeWith` probe. `loadN` is
  weight + press; the blow is the die's own arithmetic (energy over a 2 mm
  stroke against hardness over a token's face, eased toward the melt).
- **B50 (W7) — `carve riser on <flask>`**: the riser is a mould row flag
  (`riser`) that the `carve` verb can set on a rammed mould
  (`MouldMixin.carvePlan` — any edge), so *no riser → porous; a riser →
  sound* is a player's act, not two rows. The foundry props a moulder's
  trowel for it.
- **B51 (W7) — `carve pattern of <thing> [from <wood>] [for <metal>]`**:
  carve gains `of` and `for` args (`CarveRequest.of`, `forWord`); the stock
  plans it through carpentry's `PatternStockMixin` (pack `lib/` — Board and
  Blank compose it). The metal defaults to the thing's own when it is metal.
- **B52 (W7) — The foundry is flat rows** (`rejection/location/foundry`,
  `location/foundry-yard`), beside the smelter's flat siblings, not a
  `foundry/` folder; the yard is roofed (rain on the pit would blow a bell).
  The wax block and the moulding-sand heap are `trade-smelting` rows (the
  venue does not depend on `trade-chandlery`); the pattern bell is a real
  hand bell (anything can be a pattern), so no pattern rack.
- **B53 (W7) — Plaster has no dead-burnt rung.** Gypsum past ~700 K becomes
  anhydrite and never sets — but the mixing vessel names the blend whatever
  went in, so the row would have been a false claim; deferred in mould.md.
- **B54 (W7) — `terminus` depends on `trade-smelting`** for the curfew
  bell's `Bell` class (a new workspace dependency: `pnpm install`).
- **B55 (W6) — A sold row is the FIRED good.** The rows the re-pointed
  lines name (mug, jug, jar, crock, bowl, flask, both plant pots) carry
  `ceramic/earthenware`; the pack firebrick drops its `earth/clay`
  override and inherits the commons refractory. `shape` restamps clay,
  water and maker, so the potter's piece is born green and a backstop
  import (a bare clone) is born finished with no maker. Without it every
  import was raw clay that slumps in the rain. *Lens 1.*
- **B56 (W6) — The ceramics plant pots are working pots**: the farming
  pot rows' interior, moisture reserve, plant slot and planting detail are
  copied onto them (the trades share no dependency). The two farming pot
  rows lost their only reacher (the general store) and are propped at the
  Delight farmstead yard (`lint:reachability` arm R).
- **B57 (W6) — The chandlery ADDS the pottery's jar and flask** beside its
  soft-soap jar and lye flask instead of replacing them: the soft soap and
  the lye are the chandler's product and the cleanliness chain's inputs;
  the jar is the pot they go in. *Lens 6 (was the demand there first).*
- **B58 (W6) — The stall is the MARKET's counter** (the fish stall's
  shape), its eight lines supplied by the pottery with the backstop; the
  potter carries ware to it with the shopkeeping `consigns` brain. The
  general store keeper's `stocks` beat gets an authored way down the
  Delight road to the potter's shop. Setting pan off the stall: terminus
  does not depend on dairying.
- **B59 (W6) — The brickfield is its own `CartesianZone` with its own
  `deposit:`** (the valley's farms do not stand on brick clay), and the
  pit is authored at `floorDepthM: 1.2` on the water table, so the clay
  and the sand are WALL faces. ⚠ With the floor in the clay band a pit
  stops after two digs (`LIFT_M` 0.5 per floor dig). `faceRunM: 200`
  (≈ 800 lumps, 400 loads of sand).
- **B60 (W6) — The flooded old pit is a `Locale` with a `WaterFixture`
  pond**, not a `Shore` (a Shore cites a Watercourse; a flooded pit is
  none). It also holds the old oversize moulding table (`idea/form/
  old-brick`, `greenScale` 1.6 — off standard past any reader's blur) for
  drive step 9.
- **B61 (W6) — The TUB names the glaze.** Two `MixingVessel` rows,
  `blendMaterial: glaze/ash` and `glaze/lead`; no dominant-flux naming
  exists in the kernel blend and none was added (R1: the vessel names the
  blend, the inputs decide what is in it).
- **B62 (W6) — The temper pit is a WORLD row** (its blend is the Delight's
  alluvial clay, which a trade row may not name — R4) and authors its
  starting water (`interiorAmount: 200`, the soft-soap jar's shape).
- **B63 (W6) — The cone rung** (`TemperatureReading`): a set of three
  (08 · 04 · 6 at 1218 · 1333 · 1495 K, ±15 K bending), counted by anyone,
  named by a competent reader, read into the body by a proficient one;
  the set is destructed by the read.
- **B64 (W6) — No `structure.yaml`, no screw press, no tile/brick mould
  rows, no `parLines`.** Each shed is a lone building (a structure only
  says who shares a wall); the press and the moulds are W7's files; a par
  sheet does nothing without a `restocks` brain, so the stack's BREEZE is
  an import line instead (S20 "buys breeze"), and the sand is dug.
- **B65 (W6) — The brains never move a PLAYER's goods** (a good stamped to
  a player stops the step); the setter `douse`s a clamp once its bricks
  are burnt (a 600 kg coal bed would smoulder for weeks); the potter
  throws clay untempered (the temper pit's blend would re-name any clay
  the Delight's). The clamp answers only to `clamp`/`brick clamp`.
- **B66 (W6) — Every kept brickfield place is a `PersistentLocale`** —
  the weathering ground, temper yard and clamp ground too, not only the
  three sheds: a heap's winter and a clamp mid-burn are AC 22 state.
- **B67 (W8) — Crystallizing runs BEFORE the boil and freeze arms**, not
  inside the `bp > 0 && temp >= bp` block the plan named: brine has no
  boiling point and a pan crystallizes at room heat. A maturing host's
  liquor stays saturated while its batch is active (the crop is the same
  however often the pan is read); otherwise it becomes `crystallizesTo.
  residue` and drains to the vessel the mould stands on.
- **B68 (W8) — The salt pan is a pack class** (`SaltPan` = VesselKind(
  Maturing(Mould)), `Tub` = Placing(Vat)) — the kernel `Mould` has no
  maturation, so a plain row could never evaporate. ⚠ `salt-pan.yaml` is
  also sugar's file: expect a conflict at the merge.
- **B69 (W8) — The filter seeps into what it stands on, or what it sits
  in** (`faces.filterLPerHourPerL` 5): a candle sits in a crock's mouth and
  `Ware` offers no placement. Side effect: a weeping jar in a basin drips
  into it. Plain stoneware holds water, so the filter is its own 12 %
  porous body. The water pack's draw picks `fouled-water` or the new
  `tainted-water` (lead; neither filtered nor boiled clean) by the reach's
  contamination kind — no persistent outfall ships yet, so tainted water is
  drawable nowhere today. Sugar's names copied verbatim (B-protocol).
- **B70 (the underwater merge, 2026-10-21) — `ring` is one verb.** Underwater
  shipped its own `ring` view for the signal bell; ours is the platform's
  (`TangibleMixin` affords it). Tapping a jug to hear a crack and striking
  a bell to be heard are one act, so diving's view and controller went and
  `ringSound()` gained an optional `carries` (what the others hear in place
  of the tap), the hook the founder's `Bell` already overrides. Under the
  water the medium already drops the direction. *Lens 2 (one verb, a
  second bell is rows) chose.* The fire gate's two arms (chamber + medium)
  merged into one `mediumBurns`, as the note to siblings said they would.

- **B71 (the drives, 2026-10-21) — `clone` asks the KIND's title.** The
  gate walked a live representative's zone, so whether a founder could
  clone a flask depended on where the first flask stood. `canAtPath` on
  the kind's own path. *Decided by the user.* (`access.md`.)
- **B72 — lightning is derived, per place.** `storm.strikeRate` 0.15 →
  0.0025 a 30-minute tick (~0.5 ground flashes/km²/h × a ~0.01 km² place):
  across a drive's clock jumps a waterlogged pit took dozens of strikes
  and killed the Delight's potter. *Lens 1 (derivable) chose.*
- **B73 — the dig's word.** The word names a band unless it bound the very
  thing being worked: `dig clay` bound the "clay pit", `dig coal` a lump
  of coal in hand, and both dug the floor at the water. A band you NAME
  stays at your feet; a bare `dig` strips to the tip.
- **B74 — bone-dry is judged against the air the brick dried in.**
  `WaterActivityMixin.getAirHumidityPct()` (the last integrated segment)
  replaces a second, weather-blind read; a hack (a `DryingRack`, 0.85) is
  where bricks dry.
- **B75 — what an engaged act may ask of a body.** `lint:act-effort`
  refuses an act no fresh body can do (the whole act is charged up front);
  the brick table 330 → 260 W, the temper pit 450 → 360 W.
- **B76 — smaller truths the drives found.** Partitive plurals ("lumps of
  clay"); clay reads its own colour; a thrown wall says whose hand raised
  it; an empty seat is *wanted*, not *worn through* (`PartLine.empty`); a
  green pot affords `carve` and the potter has a turning tool; a
  refractory body counts as grogged for shock; a mould's blow burns on the
  contact scale (2, not 40 "J"); the pit has five spades and the brains
  leave theirs at the pit; one platform `ring` (B70).
- **B77 — the wire harness keeps a world.** `WIRE_KEEP_WORLD` /
  `WIRE_REUSE` (testing.md): the drive loop was boot-bound.

- **B78 — the potash merge (2026-10-22): its firings ride the one rule.**
  Potash extended the retired recipe path (the `calcine` recipe; a firing
  concentrates by `1/massYield`, grades by its worst input, titles to its
  charge's owner). Here a piece keeps its identity, so grade and owner come
  free; the concentration moved into `rescaleConvertedMass` (what stays in
  less mass is stronger — the glass melt's iron now 0.002/0.72, as potash
  pinned it); `calcine` is a heat transition on the black-salts row into a
  new `pearl-ash` MATERIAL. ⭐ The cost of identity-through-the-kiln: a
  counter buys by row, and the cake's row is still black salts — so
  `Stock.lineKeyFor` prices a good on its material's own lump line when the
  house lists one (lens 1: what a thing IS is its material, derivable). The
  clamp-only `/trade/fuel/thing/ash` row retired: a burnt-through clamp's ash
  lies in its grate and `sweep` rakes it in heaps, potash's alkali and all.
  `CommandGiver`'s fall-through landed twice; master's text kept.

- **B79 — review: one model of a solid drying in air (2026-10-28).** The
  review asked whether the new mixins compete with shipped ones; Greenware
  did not (it was already a reading over `WaterActivityMixin`), but that
  exposed `SeasoningMixin` running a SECOND drying model — its own fraction
  on the maturation clock, a flat rain penalty, a damage band for heat. The
  two disagreed visibly (a ham in a damp shed regained water, a board beside
  it only stalled; a pot checked for drying too fast, a board for drying too
  hot). Lens 1 chose: one derivable law — a solid gives water to the air
  until it matches it, and drying it faster than it stands cracks it.
  `Timber` and `SoapBar` compose the water model; Seasoning is wood's
  reading of it (seasoned = an absolute moisture, 0.8 of the way to what
  85 % air holds; `seasonedFraction` a row SEED). The water model gained,
  for every drying solid: the enclosing scope's air (Seasoning's chamber
  walk), rain (`cure.rewetPerMm`), the drying-too-fast check
  (`cure.crackRate` × a `dryingCrackRisk()` hook — clay's from its
  composition, a board's scaled to its species so only a hot kiln checks
  it) and a `dryingRatePerHour()` hook (a board's from `seasoningDays`,
  calibrated to the mark in good air on stickers). `green.crackRate`
  retired into `cure.crackRate`. ⚠ An unstickered stack on bare ground now
  dries at the ground's exposure (0.35), about three times slower.

- **B80 — review: Faced vs Dyed, and Faced made ready for paint (2026-10-28).**
  They do not compete: a coat becomes the outermost material (what meets the
  world), a dye goes into the fiber — the paint slate's own dye/pigment line.
  Faced is the paint slate's coat substrate on goods, so its glaze-only words
  were generalized now (lens 2 — a paint row should need no code): `fused` →
  `set`; a set coat holds water when its MATERIAL is tight; the look word is
  the coat material's `coatWord` (`glazed` on the four glaze rows). Composition
  audit: `Faced` on `Good` stands (the claim is true of every good), but it
  had been AFFORDING `dip` on every good — the bath affords it now
  (`MixingVesselMixin` — `CompoundingMixin` since re-plan R1 W-R1b — and
  chandlery's dip pot as on master); and a coated
  stack no longer merges with a bare one (a coat signature in `canMergeWith`).
  The paint slate gains § 0: setting by binder, wear, one color read, and one
  stack shared with construction's layers are the paint build's, on `Faced`.

- **B81 — review: one move between slots (2026-10-28).** The filter's seep
  (`seepInto`) and the crystallizing pan's bittern drain (`drainLiquorInto`)
  were hand-rolled transfers beside `BulkableApi.transfer`, each with its own
  copy of the dissolved-solids fold and none of transfer's spoilage, water,
  pathogen, surface-load, grade, ownership or survival rules. Both are now
  transfers; the filter's is `via: { through: 'pores', arrivesAs }` — the
  dissolved passes, the suspended stays (lens 1: a ceramic filter is why
  unboiled water was safe to drink). ⚠ Not covered and noted: a mould's
  set DRAININGS (whey off the curd, `Mould.creditDrainings`) are minted with
  a fresh payload by design — whether separated whey should inherit the
  curd's microbial load is open. *(Resolved: re-plan R1-D8, W-R1e — it
  does.)*

- **B82 — review: Forming is the kernel's, for any plastic mass
  (2026-10-28).** The pack-lib `FormingMixin` had no `_mixinName`, duck-typed
  clay (`yieldPieces`) and form rows (`toWord`), swallowed a failed row load,
  and was clay-only while the glass blowpipe hardcoded `["bottle","cylinder"]`
  and `crack` mapped form→product in a table with a flat "fair" grade. Lens 2
  chose: a blown vessel is a row. `lib/craft/Forming.ts` (registered,
  `Mixins.Forming`) owns words, class check, product and the hand check; a
  `Formable` mass (`formingHand`, `refuseBeyond`) — Clay and the glass
  Gather; each instrument names its mass (`formingMassClass` → Clay;
  the pipe's `formingMass` → its gather). Glass `Form` rows bottle and
  cylinder; the gather records product and grade; `crack` mints from them.
  ⚠ An untrained blower's bottle now grades poor (was always fair).
  Deferred: the smith's `hammer` also forms a plastic mass but names its
  product through a recipe build — the R1 naming question.

## Re-plan R1 — combining is one rule (review, 2026-10-28)

✅ **Complete (2026-10-28)** — W-R1a–e landed; notes under each wave.

The review found *several inputs become one product* shipped TWICE (the
recipe build in `K/lib/craft/ManualBuild.ts` → `mintFromBuildImpl`
`K/platform/idea/api/CraftingLogic.ts` l.2612; the by-mass fold in
`K/lib/material/Mixing.ts` l.160–255, this MR's D34) and composition carried
FOUR ways (`BulkPayload.composition: BlendPart[]` in servings,
`ComposedMixin` in servings on `Provision`, `CompositionMixin.alloying` +
`BulkPayload.alloying` in mass fractions, `Material.composition` for the
kind). The owner ruled; this section is the engineering of that ruling. Per
`workflow.md` § 4 it is a placement re-plan, not a review round: five waves,
each landable, no clock run until the whole MR review is done — every wave
is proved by unit tests, the touched packs' vitest and the gates named per
wave, chosen per change (a guaranteed pass is not run).

### Grounding (every claim opened)

- **A "serving" today is one recipe slot or one unit, not a mass.**
  `deriveBlendPayload` (CraftingLogic l.1390–1474) is fed `servings: 1` per
  bulk slot and `servings: m.count` per item (l.1792, l.1800; `mintVessel`
  l.2936 the same), and its own doc says so (l.1383–1386: *a martini was gin
  19 + vermouth 7*). `Material.nutrientAmounts` is documented *mg per
  serving* (`K/lib/material/Material.ts` l.945) but the rows are
  heterogeneous: milk `fat: 34000` is per LITRE
  (`trade-ranching/…/food/milk.yaml` l.33), root-vegetable `carb: 17000` is
  per 100 g, and `CompositionShare` reads them as per KILOGRAM (l.14). The
  mill carries its own `SERVING_KG: 0.1` (`K/lib/craft/Comminuting.ts` l.62,
  used l.359). Nothing has ever reconciled these because the amounts are
  **display only**: `Metabolic.routeIntake` routes nutrients by TAG ×
  litres (`K/lib/metabolism/Metabolic.ts` l.1627–1631) and never reads the
  label. The one serving-scaled number a BODY feels is the toxin dose:
  `BlendLabel.toxicityOf` multiplies each part's dose by its servings
  (`K/lib/metabolism/BlendLabel.ts` l.197) and `routeIntake` adds that whole
  dose ONCE per ingest however large the sip (l.1632–1637; a sip is 0.03 L,
  `SipController` l.24). So a martini is 26 "mg" of alcohol per sip of it,
  today, whether the glass is full or nearly empty.
- **A pour does not fold a composition.** `BulkableLogic.blendPayloads`
  (l.110–162) folds `dissolvedToxins`, `dissolvedAromatics`, `alloying`
  (volume-weighted, `blendComposition` l.1063) and `maturedDays`; `composition`
  is not in it. Into an EMPTY destination `transfer` copies the whole payload
  (absolute servings — a half-pot poured off carries the whole pot's dose);
  into a non-empty one the source's composition is DROPPED. The fraction
  carrier (`alloying`) already pours, draws and splits correctly; the
  servings carrier cannot, because servings are extensive and every
  per-litre domain in that fold is intensive.
- **The two expansions.** CraftingLogic l.1406–1446 expands an input's
  parts by servings share; `Mixing.constituentsOf` l.71–82 expands by the
  piece's `getEffectiveComposition()`, else the kind composition, else the
  material whole. Same question, two answers (one never sees kind
  composition, the other never sees a food's parts). The bulk belly's
  expansion is a third copy inline (Mixing l.188–196).
- **Readers of servings** (all to convert): `BlendLabel` ×3 (l.68, 106,
  180), `NutritionLabel.labelFaceOf` (l.114–122), `Palatable` l.243 (names
  and tastes; does not weight by servings), `Freshness.ingestPayload`
  (l.1022–1026), `Loaf.branShareOf` (`trade-baking/src/thing/Loaf.ts`
  l.45–55 — a ratio of servings), `Hive.combComposition`
  (`trade-apiculture/src/thing/Hive.ts` l.428–436 — already a SHARE named
  `servings`), `MillController` l.556–563 (stamps `Comminuting`'s
  servings), CraftingLogic l.1792–1801, 1987–2023 (the `Composed` output
  merge), 2141–2155, 2928–2938. Readers of `alloying` on the payload (to
  rename): `BulkableLogic` l.153, 658–664; `Mould.ts` l.929–930, 1241;
  `Thermal.ts` l.1260, 1550–1557, 2194, 2575; `Mixing.ts` l.188, 226;
  `Composition.ts` l.34–43 (the declaration). Readers of the piece's
  `alloying` by method stay as they are (`getAlloying`/`fractionOf`/
  `setAlloying` — 40 sites across glass, smelting, smithing, potash, fuel,
  quarrying, ceramics; the method NAMES change in W-R1a and nothing else).
- **Rows.** `alloying:` is authored on 2 rows (`trade-fuel/…/thing/wood-ash`,
  `trade-potash/…/thing/black-salts`); `composition:` in servings on 2 non-
  material rows (`trade-baking/…/thing/white-loaf`, `wholemeal-loaf`); the
  other 344 `composition:` rows are `Material` kinds and are untouched. 347
  of 347 material rows author `density`; 98 author `nutrientAmounts`; 44
  author a non-zero toxin dose (20 alcoholic drinks, 3 medicines, 4 fuels,
  gases, two waters, the spoiled ration). No migrations: the dev DB drops.
- **Recipes: 185**, not 97 (`grep -rl '^recipeId:' packages/content`). 93
  single-slot, 29 with ≥2 bulk slots and no items, 23 bulk + items, 40
  multi-item only. Reachable BY HAND (where matching ratio matters):
  hospitality's 25 (shaker / mixing glass → `StrainController`), cooking's
  24 (`CookPot` → `PlateController`), baking's 3 doughs (`DoughTrough`
  l.107), smithing's ladder (`QuenchController` l.158, one item slot each).
  Every other recipe is the one-shot `craftImpl` (l.3015), which DRAWS
  exactly each slot's measure (`consumeBulkInputs` l.2236–2250), so its
  proportion is exact by construction and D2 cannot change its outcome.
- **The pour banks a flat 0.06 L of anything** (`K/platform/idea/cmd/
  crafting/PourController.ts` l.34, l.127–129). Under D2 that alone would
  turn every unequal cocktail (martini 6:1, manhattan 2:1:dash) into
  pot-luck — see R1-D4. The bulk pour already takes `--amount`
  (`platform/cmd/bulk/pour.yaml` l.10, l.24; the whiskey drive uses it).
- **The build buffer carries the loads; the by-mass fold carries nothing.**
  `BuildContribution` banks `freshnessLoad`, `pathogenLoads`, `tags`,
  `materialPath`, `composition` (ManualBuild l.60–122) and the mint runs
  `buildMicrobialLoad` (l.1297) + `kitInoculum` (l.1074) + `applyMethodFit`
  (l.2708); `Mixing.blend` stamps mass, makeup and maker only — a spoiled
  curd compounded into a slip comes out clean. One route must carry both.
- **No drive strains a cocktail** (`grep -l strain packages/wire/tests`
  finds none of hospitality's); the bar is unit-tested only
  (`CraftingLogic.buildmint.test.ts`, `ManualBuild.test.ts`,
  `libations-steps.test.ts`). The compounding drives are ceramics-a (`knead
  pit` l.498), ceramics-c (`stir "ash tub"` l.525, `"lead tub"` l.536),
  ceramics-d (`stir "plaster tub"` l.532, `"slip tub"` l.554), glass (`stir
  pot` l.200), rubber (`knead tub` l.386); cooking's drive orders a stew
  (one bulk slot); grain-chain reaches `knead`'s gate only.
- **The import edge.** No `lint:*` gate pins `lib/bulk` ↛ `lib/craft` /
  `lib/metabolism` specifically (`check-mud-imports.ts` is the driver/mudlib
  boundary); the edge is held by the load-time cycle `BlendIdentity.ts`
  l.59–64 records and by the declaration-merging convention (`bulk.md` §
  `BulkPayload`). The plan keeps it by construction: the record is declared
  from `lib/material`, as `alloying` is today.
- **Separation already has one move.** B81 made `BulkableApi.transfer` the
  one move between slots with `via: { through: 'pores', arrivesAs }`
  (`K/api/bulk.ts` l.77–84, l.306–313); `Mould.creditDrainings` (l.966–992)
  still fills the vessel below by hand with a `null` payload and a grade one
  band down.

### Decisions

- **R1-D1 — one composition record, by mass (the owner).** ⭐ Refinement,
  from the pour fold above: the record is stored as a **mass FRACTION** of
  its host (`CompositionEntry { materialPath, fraction }`, the type
  `Material.ts` l.94 already defines) and a part's absolute mass is
  `fraction × hostKg` — a piece's `getMass()`, a pool's `litres × density`.
  Fractions are intensive, which is exactly why the shipped `alloying` fold
  survives every pour, draw, split and top-up and the servings carrier
  survived none of them. Servings DERIVE at the read:
  `servings_i = fraction_i × hostKg / servingKg_i`, where `servingKg_i` is
  the part material's authored `servingKg` else `nutrition.servingLitres`
  (0.25) × its density. **One per-piece mixin:** `CompositionMixin` absorbs
  `ComposedMixin`; `Provision` composes `CompositionMixin` and the loaf's
  bran share is `fractionOf(bran)`. *Decided by the owner; the fraction
  representation by lens 1 (a pour is arithmetic a player can predict, and
  it already is for a melt).*
  - **What changes, exactly.** (i) A blend's per-ingest toxin dose now
    scales with the mass still in the vessel: a full martini glass is 26 as
    today; half a glass gives 13 a sip, and pouring half off no longer
    duplicates the dose into both glasses (today it does — absolute
    servings copied). Intended. (ii) With the default serving and NO
    `servingKg` authored, every cocktail's dose would fall 3–10× (60 ml of
    gin is a quarter of a 250 ml serving). So W-R1a authors `servingKg` on
    the 20 alcoholic rows, bitters and the 3 medicines at their bar measure
    × density (gin · vodka · tequila · whiskey · blended-whisky ·
    grain-whisky · rum-light · rum-dark 0.06 L; neutral-spirit 0.12;
    sweet-vermouth · bitter-liqueur · aperitivo 0.03; dry-vermouth 0.01;
    orange-liqueur 0.02; bitters 0.002; ale · lager · cask-ale 0.5; white ·
    red · sparkling 0.15; wash rows 1.0; medicines 0.25). Then a recipe
    using a spirit AT its measure is unchanged and one using it elsewhere
    scales honestly — the named deltas: whiskey-ginger (whiskey 0.05: 40 →
    33), gin-tonic and tom-collins (gin 0.05: 19 → 16), negroni (gin 0.03:
    19 → 9.5), daiquiri (rum 0.06 vs the modal 0.05: 19 → 23),
    cosmopolitan (vodka 0.045: 19 → 17), aperol-spritz (sparkling 0.09 vs
    0.15: 12 → 7), vat-whisky, compound-gin and the two vermouths (one-shot,
    neutral spirit at 0.6/0.12 vs its 0.12). Nine hand-build cocktails and
    four one-shot blends change their alcohol figure; 16 cocktails are
    byte-identical. (iii) Nutrition LABEL numbers (display only) move the
    same way; the two loaf rows and the mill keep theirs exactly because
    `wheat-flour`, `bran`, `meal` and `grist` author `servingKg: 0.1` — the
    mill's constant — and the loaf rows re-author in fractions (flour
    0.8125 / bran 0.1875 is `6.5 : 1.5`). (iv) A stew poured into a pot of
    stew now keeps its ingredients (today dropped). (v) Nothing a body
    feels from a NON-blend changes: an empty record falls through to the
    material's own dose, as today (BlendLabel l.189–190).
- **R1-D2 — recipes match by proportion (the owner).** Refinement, the
  rule in full: over a recipe's BULK slots the target fraction of slot *i*
  is `t_i = measureL_i × ρ_i / Σ`, and the build's `a_i` is the SUM of every
  bulk contribution carrying slot *i*'s category (two pours of gin are one
  gin — today a second pour is a leftover and refuses), both at the banked
  material's density; `d = max_i |a_i − t_i|`. **Match** iff every slot's
  category is present, `d ≤ crafting.proportion.tolerance` (0.12), the heat
  and medium gates hold (unchanged, l.2276–2289), item slots are covered
  (R1-D3), and `Σ a ≥ crafting.proportion.minScale (0.5) × Σ t` — a half
  measure is still a martini, a thimble is a taste. **Grade:** `d ≤ tol/3`
  costs nothing; `≤ 2·tol/3` one band; `≤ tol` two bands, then the shipped
  weakest-link / control floor / method-fit rules. A slot authored
  `measureL: 0` (`steep-barley`'s barley) is presence-only and outside the
  sum. A contribution whose category matches no slot is still a leftover →
  no match → the shipped pot-luck / worked-lump path. *Decided by the
  owner; the thirds and the scale floor by lens 1 (a lean batch is a poorer
  batch; a quarter batch is not a batch).*
- **R1-D3 — item slots are COUNTED, never weighed.** A recipe row carries no
  mass for an item slot, and the content's unit masses behind one tag span
  five orders of magnitude (`wood` 0.03–2400 kg, `metal` 0.005–18000, the
  survey in this re-plan); `dough`'s `salt ×1` is a 1 kg salt unit, which
  would be 46 % of the dough by mass. The authored proportion for an item IS
  its count (*2 roots, 1 meat*), so the count check stays exactly as
  `buildSatisfies` l.2326–2345 has it, surplus units of a listed category
  summing into the slot. A workpiece build (one item, no bulk) therefore
  matches as today. *Lens 1 (the derivable answer is the one the row
  states); taken by the planner as the owner delegated — say if wrong.*
- **R1-D4 — a pour is ONE SERVING of what you pour.** `pour x into shaker`
  banks `servingKg(material) / density` litres (gin 60 ml, dry vermouth
  10 ml, bitters 2 ml) and `--amount` overrides it, the bulk pour's own
  option; `STANDARD_POUR_L` retires. Three pours of sweet vermouth is a
  negroni's measure — the arithmetic is the play. *Lens 2 chose (one row
  field, `servingKg`, is both the nutrition serving and the jigger; a new
  spirit needs no code) with lens 3a behind it (a bartender does not pour
  60 ml of bitters).* ⚠ This changes what a shipped verb does and is the
  one item here the owner may want to veto; the alternative is a flat pour
  plus `--amount` on every unequal recipe.
- **R1-D5 — the names, once.** The per-instance record is **`makeup`** —
  what THIS piece or pool is made of — on `CompositionMixin`
  (`makeup: CompositionEntry[]`, `getMakeup()` / `setMakeup()` /
  `fractionOf()` / `effectiveMakeup()` / `absorbMakeup()`) and on
  `BulkPayload.makeup`; `Material.composition` keeps its name (it is the
  KIND's, 344 rows). `alloying` and `composition` (the servings one) and
  `BlendPart` retire; `ComposedMixin`, `Mixins.Composed`, `isComposed`
  retire into `CompositionMixin` / `Mixins.Composition` / `isComposition`.
  "Blend" stays the recipe's word only (`BlendIdentity`, `BlendLabel`,
  `recipeId`). The by-contents vessel is **`CompoundingMixin`**
  (`K/lib/material/Compounding.ts`, `Mixins.Compounding`,
  `isCompounding`, refusal *"{} isn't something you compound in"*), its
  fields **`productMaterial`** / **`productTemplate`** (the vessel names its
  PRODUCT, as a mould names a shape), its act `compound(by)`, its kernel
  twin **`K/platform/thing/CompoundingVessel`**; `MixingVesselMixin`,
  `MixingVessel`, `blendMaterial`, `blendTemplate`, `BlendOutcome` retire —
  the bar keeps *mixing glass* and `mix` uncontested. Dials:
  `nutrition.servingLitres`, `crafting.proportion.tolerance`,
  `crafting.proportion.minScale` (`AppSettingKeys`, the `crafting.*` block
  at `K/lib/config/AppSettings.ts` l.2120). American English throughout.
- **R1-D6 — one fold, in the material logic.** The recursive *what is this
  input made of* and the mass-weighted fold are two statics on
  `MaterialApi` forwarding to `MaterialLogic` (the F4 face that already
  owns `compositionOf`): `MaterialApi.makeupOf(material, own?)` → the
  piece's own effective makeup, else the kind composition, else the
  material whole (Mixing's `constituentsOf` rule, which is the right one —
  CraftingLogic's never saw a kind composition); `MaterialApi.foldMakeup
  (parts: { material, kg, makeup? }[])` → one `CompositionEntry[]` by mass.
  No free helper (both expansions were module-private functions and the
  lint tripwire is why), no new statics in `lib/` (`lint:lib-statics`);
  `absorbMakeup` stays on the mixin as the two-body form. `CraftingLogic`'s
  three expansions and `Mixing`'s two call these.
- **R1-D7 — one mint, two namers; two ways of holding inputs stay.**
  `mintFromBuildImpl` takes EITHER `contributions` (a buffer: the shaker,
  the pot, the trough, the workpiece) OR `charge: vessel` (a compounding
  vessel's physical contents); a charge becomes contributions by the
  vessel's own `chargeContributions()` (each piece: `kind: 'item'`, `count`,
  `massKg`, tags, material, makeup, freshness, pathogens; the belly: one
  bulk contribution) and from there the ONE path runs — reverse-match (D2),
  grade, method fit, `buildMicrobialLoad` + kit, maker — then the **namer**:
  the vessel's `productMaterial` when it names one (a glaze tub makes glaze
  whatever went in — D34's claim, unchanged), else the matched recipe's
  output, else the generic pot-luck / worked lump. A charge is consumed at
  the mint (pieces destructed, belly emptied), as a buffer was consumed at
  the pour. `BuildContribution` gains `massKg` (banked by `add`,
  `bankWorkpiece` and the charge; a bulk contribution's mass is
  `measureL × ρ`, derived). Smithing rides it unchanged. The one-shot
  `craftImpl` keeps its own draw and consume (it holds nothing) and calls
  the same `foldMakeup`. `BlendIdentity`/`recipeId` and `productMaterial`
  coexist: a vessel-named product has a material and no recipe, a
  recipe-named one a recipe and a generic material — every reader already
  falls back one to the other.
- **R1-D8 — a mould's drainings are a transfer, and the population goes
  with the liquid (the coordinator's item).** `Mould.creditDrainings`
  becomes `BulkableApi.transfer(pool, below, { kind: 'measure', litres,
  mode: 'lenient' }, { through: 'set', arrivesAs: drain.drains })` — the
  one move (B81) with a second `through`: the inverse of `'pores'`. Through
  a set, the **suspended passes** (microbial load and pathogens at the
  pool's concentration — a population lives in the liquid phase too, which
  is the whole reason `whey.yaml` l.3–5 calls a crock of whey a living
  starter and backslopping works) and the **dissolved passes** (toxins,
  aromatics, solids — per-litre, intensive); the **identity does not**
  (`recipeId`, `makeup`, `appearance`, `keywords`, `maturedDays` are the
  curd's; the drainings are `arrivesAs` whole); the **maker passes**
  (harm from the whey names the cheesemaker); the water state is the
  arriving material's own; the grade stays one band below the pool's,
  applied after the move as today. It is a SEPARATION, so it does not ride
  the fold (many → one); it rides the one move with its own `through` —
  what a filter holds back, a set lets through. The pool is now debited by
  the move, so the set's `poolKg` (Mould l.603) reads `amountL` PLUS
  `setDrainedKg` for the original charge; `clearPool` clears what is left.
  *Lens 1 chose (a starter is a culture because it carries the ferment; a
  fresh payload made that a lie), lens 3a behind it (a spoiled curd's whey
  cannot come out clean).* Wave W-R1e.
- **R1-D9 — `dissolve` is a deferred seam, not a fold.** A future act that
  dissolves a solid into a liquid goes the dissolved-solids way
  (`dissolvedSolidsKgPerL`, the solubility table `Material.ts` l.2148–2160),
  never into `makeup`: a solution is one phase with a concentration, a
  compound is parts by mass. Recorded in § *Deferred seams*.

### Host placement (this re-plan's additions)

| new thing | host | what composing it claims | why not the alternative |
|---|---|---|---|
| `makeup`, `getMakeup`/`setMakeup`/`fractionOf`/`effectiveMakeup`/`absorbMakeup` | `CompositionMixin` (the shipped `Composition` hosts + `Provision`, which composed `Composed`) | every food can be made of parts — `Composed`'s own claim at `Provision.ts` l.66, and `fractionOf(bran)` is what the loaf wanted | a second servings mixin was the rework |
| `BulkPayload.makeup` | declared from `K/lib/material/Composition.ts` (as `alloying` is at l.34–43) | a pool remembers what went into it, intensively | on `lib/bulk` it would import a subsystem |
| `Material.servingKg` (+ `getServingKg()`) | `Material` | any material may say what one serving of it is; default derived | a serving table in the kernel is a list with no author |
| `CompoundingMixin` (`productMaterial`, `productTemplate`, `compound(by)`, `chargeContributions()`, `kneadPlanFor`) | `K/platform/thing/CompoundingVessel` (`Good`), `trade-ceramics` `TemperPit` (`Thing`) | a vessel that names its product and compounds its contents | on `Container` it would claim every chest |
| `BuildContribution.massKg` | the value object (`ManualBuild.ts`) | a banked item knows its mass | — |
| `TransferVia.through: 'set'` | `K/api/bulk.ts` `TransferVia` | a move may be a separation that keeps the suspended | a hand-rolled move beside `transfer` was B81's finding |

Nothing lands on `Thing`, `Good`, `Tangible` or `Container`.

### Waves

**W-R1a — the record.** Files: `K/lib/material/Composition.ts` (field
`makeup`, the renamed surface, the `BulkPayload.makeup` declaration;
`absorbMakeup`), `K/lib/metabolism/Composed.ts` DELETED (+ its test moved
to `Composition.test.ts`), `K/lib/bulk/Bulkable.ts` (`BlendPart` and
`composition` removed; the doc block at l.212–228 rewritten), `K/lib/mixin.ts`
(`Composed` entry l.553 and its refusal removed), `K/api/mixin.ts`
(`isComposed` l.1552 removed; 10 call sites → `isComposition`),
`K/platform/thing/Provision.ts` l.66, `K/lib/material/Material.ts`
(`servingKg` + fieldMeta + accessor; the l.945/957 docs say *per serving,
see `servingKg`*), `K/api/material.ts` + `MaterialLogic` (`servingKgOf
(material)`, `servingsOf(material, kg)`), `K/lib/metabolism/BlendLabel.ts`
(every reader takes `hostKg`; servings derived), `NutritionLabel.ts`
(both faces pass the mass), `Palatable.ts`, `K/lib/material/Freshness.ts`
l.1022, `K/lib/craft/ManualBuild.ts` (`composition?` → `makeup?`),
`K/lib/craft/Comminuting.ts` (`SERVING_KG` deleted; the product's makeup is
`[inner 1−outerShare, outer outerShare]`), the `alloying` payload readers
(`BulkableLogic` ×2, `Mould` ×2, `Thermal` ×4, `Mixing` ×2) renamed,
`CraftingLogic` (`alloying`/`composition` names only — the expansions wait
for W-R1b), `K/lib/config/AppSettings.ts` (`nutritionServingLitres`).
Packs: `trade-baking` `Loaf.ts` (bran share by `fractionOf`), the two loaf
rows (`makeup:` in fractions), `trade-apiculture` `Hive.ts` l.428–436
(`fraction`), `trade-milling` `MillController.ts` l.556–563, `trade-fuel`
`wood-ash.yaml` + `Ash.ts`, `trade-potash` `black-salts.yaml` + `IronPot.ts`,
`trade-quarrying` `Clay.ts` (`getAlloying` → `getMakeup`, l.548 stash),
`trade-glass`, `trade-smelting`, `trade-smithing`, `trade-ceramics` method
renames; `servingKg` authored on the rows R1-D1 lists. Tests: the 16
`servings` assertions in `Composed.test`, `TastePalate.test`, the
`BlendLabel` tests, `rows.test`/`staling.test` (baking), `mill.test`
rewritten in fractions; NEW `BlendLabel.servings.test.ts` pins the martini
at 26 full / 13 half, the loaf label byte-identical, and the nine deltas
R1-D1 names. Docs: `bulk.md` (§ `BulkPayload` table; the five-link table l.64–75 names
`ComposedMixin`), `apiculture.md` l.219, `architecture.md`'s mention,
`metabolism.md`, `mixins.md`.
Gates: `lint:mixin-names`, `lint:field-meta`, `lint:instanceable`,
`lint:imports`, `lint:closed-vocabularies`; `test:near` + the eleven packs'
vitest. Acceptance: one record type, one mixin, no `servings` in source
outside `MaterialLogic.servingsOf`; a half-poured pot keeps its makeup.
Commit: `refactor(composition): one makeup record by mass — Composed
absorbed, servings derived`.

✅ **W-R1a done (2026-10-28).** One `makeup` record by mass fraction;
servings derive only in `MaterialLogic.servingsOf`, every reader takes
`hostKg` (`BulkSlot.getMassKg`; `ingest(…, hostKg)` read before the draw).
Decided here: items weigh `count × servingKg` until W-R1c banks `massKg`;
dilution and ice melt THIN the makeup (else a stirred glass grows its dose);
`lint:servings` deferred (it would force a serving onto gases and fuels).
Surprise: at the authored measures 14 cocktails change and 6 hold — the
R1-D1 delta list is off (daiquiri holds at 19; negroni 38 → 28.5).

**W-R1b — the fold and the names.** Files: `K/api/material.ts` +
`K/platform/idea/api/MaterialLogic.ts` (`makeupOf`, `foldMakeup`);
`K/lib/material/Mixing.ts` → `git mv` `Compounding.ts` (`CompoundingMixin`;
`productMaterial`/`productTemplate`; `chargeContributions()`; `compound(by)`
and `kneadPlanFor` forward to `CraftingApi.mintFromBuild({ charge, makerPath
})` — the body of `blend` goes in W-R1c, so this wave keeps `blend` calling
`foldMakeup` and renames only); `K/platform/thing/MixingVessel.ts` → `git mv`
`CompoundingVessel.ts`; `K/lib/mixin.ts` l.720 + refusal l.1008;
`K/api/mixin.ts` l.1761; `K/platform/idea/cmd/crafting/StirController.ts`
l.50 (`isCompounding`); `stir.yaml`/`knead.yaml`/`dip.yaml` defaults
(`mixin.CompoundingMixin`); `K/lib/craft/ManualBuild.ts` (`massKg` banked
by `bankWorkpiece`), `PourController.ts` l.184–200 (`add` banks
`getMass() × count`); the 7 rows (`class: /platform/thing/CompoundingVessel`,
`productMaterial:`, `productTemplate:` — `trade-ceramics` slip/plaster
tubs, `trade-glass` batch-pot, `trade-rubber` mixing-tub, `hearts-delight`
ash/lead tubs + temper-pit); `trade-ceramics/src/thing/TemperPit.ts`
(l.29, 49, 105–140 — `mixBy` → `compoundBy`); `CraftingLogic` l.1406–1446,
1987–2023 and `Mixing`'s two expansions → `MaterialApi.makeupOf`/
`foldMakeup`. Plan text: D34, B2, B80 and the W0 bullet name the new names
(a one-line *renamed in R1* note each, not a rewrite). Gates:
`lint:mixin-names`, `lint:instanceable` (the row `class:` moves),
`lint:reachability` + `lint:arg-kinds` (the three views' defaults),
`lint:lib-statics` (zero new statics in `lib/`), `lint:object-verbs`;
`test:near` + ceramics/glass/rubber/hearts-delight vitest. Acceptance: one
expansion function in the tree; every row names the new class; the
`TemperPit.test` and glass batch test green unchanged. Commit:
`refactor(compounding): one makeup fold in MaterialLogic; MixingVessel is
CompoundingVessel`.

✅ **W-R1b done (2026-10-28).** One fold (`MaterialApi.makeupOf`/`foldMakeup`
→ `MaterialLogic`); CraftingLogic's three call sites and `blend` (now over
`chargeContributions()`) use it; the act is `compound(by, verb)` (TemperPit's
too). Decided here: whatever a record or kind composition leaves unaccounted is
the material ITSELF (a shoulder is 0.12 fat + 0.88 shoulder; a diluted pour's
thinned makeup folds its water as the slot's own material), and a charged
stack weighs every unit (`getMass() × count`; `blend` had counted one).

**W-R1c — one mint.** Files: `K/api/crafting.ts` (`BuildMintRequest.charge?:
Stuff`, `contributions` optional when `charge` is given), `CraftingLogic.ts`
`mintFromBuildImpl` l.2612–2675 (a charge → `chargeContributions()`; after a
successful mint `consumeCharge(vessel)`; the namer order R1-D7 in
`mintVessel` l.2871–2960 and a new `mintProduct` arm for a `productTemplate`
— clone, `setMaterial(productMaterial)`, `setMass(Σ)`, `setMakeup(fold)`,
maker, `ContainmentApi.move` into the vessel — carved from `Mixing.blend`
l.231–254; the bulk arm rewrites the belly as `Mixing.blend` l.217–228 did),
`buildMicrobialLoad` l.1297 weights by `massKg ?? 0.1 × count` for items;
`Compounding.ts` `compound(by)` is now the forward + the narration
(`narrateBlend` l.264–287 kept as the mixin's private `narrate`), `blend`
deleted. The glaze tub's `dip` affordance (B80) is untouched. Tests:
`CraftingLogic.charge.test.ts` (a charge of two pieces + a belly mints the
vessel's product with the mass fold, carries a spoiled piece's load and
pathogens, stamps the maker, consumes the charge; a vessel with no
`productMaterial` and no recipe falls to pot-luck), `TemperPit.test` and the
glass/rubber pack tests green. Gates: `lint:object-verbs`,
`lint:thin-forwarder`, `lint:unconsumed-seams`; `test:near` + the packs.
Acceptance: `grep -rn "blend(" lib/material` is empty; one function mints
every made-of-several thing. Commit: `refactor(crafting): one mint for a
buffer and a charge; the vessel or the recipe names it`.

✅ **W-R1c done (2026-10-28).** `mintFromBuild({ charge })` reads the vessel's
`chargeContributions()` and runs the one path; `compound` forwards and maps the
outcome, `blend` is gone. Decided here: a vessel-named product skips the
reverse-match (no recipe, no evidence); a tub takes no glass finish and no stamp
unless Crafted; build items weigh their banked `massKg` (stew label → 1.6 kg in).

**W-R1d — proportional matching and the serving pour.** Files:
`CraftingLogic.ts` `matchBuild` l.2268–2297 + `buildSatisfies` l.2323–2370 →
`buildFit(recipe, contributions): { ok, d } | null` implementing R1-D2 +
R1-D3 (categories summed; zero-measure presence-only; leftovers refuse;
scale floor; heat/medium gates verbatim), the grade step at l.2628–2640
takes the bands `d` costs before the base floor; `AppSettings.ts`
(`craftingProportionTolerance`, `craftingProportionMinScale`);
`PourController.ts` (`STANDARD_POUR_L` retired; the measure is
`MaterialApi.servingKgOf(material) / ρ`; `--amount` parsed as the bulk
pour's `pour.yaml` l.24 option) and `platform/cmd/crafting/pour.yaml` (the
option + help: *a pour is one serving; `--amount` to measure*). Tests:
`CraftingLogic.buildmint.test.ts` l.133–134 and l.166–167 rewritten
(0.06 + 0.01 matches; 0.06 + 0.06 is pot-luck — the two shipped outcomes
that change); NEW `CraftingLogic.proportion.test.ts` (martini at 60+10 →
full grade; 60+20 → two bands; 60+30 → pot-luck; two gin pours sum; a
0.5-scale martini matches; a thimble does not; steep-barley's zero slot;
an unlisted pour refuses); `PourController.test` (gin pours 0.06, vermouth
0.01, bitters 0.002; `--amount 30ml`). `crafting.md` § the reverse-match
(l.940–960) rewritten; `help pour`. Gates: `lint:arg-kinds`,
`lint:reachability`, `lint:authored-prose`, `lint:drive-scripts` (no drive
edits expected — none strains); `test:near` + hospitality, cooking,
baking, smithing vitest. Acceptance: the proportion test green; anvil
ladder, cooking-manual, DoughTrough tests green unchanged. Commit:
`feat(crafting): recipes match by proportion; a pour is one serving`.

✅ **W-R1d done (2026-10-28).** `buildFit` matches by proportion + counts items
(R1-D2/D3), the bands cost before the base floor; a pour is one serving with
`--amount`. Decided here: equal heat falls to the CLOSER proportion; a charge's
pot-luck conserves mass (a plated one keeps the 0.3 L portion); every load
weighting and the one-shot item parts weigh by real mass. Plan fixes:
steep-barley's slot authors NO `measureL` (absent = presence-only); there is no
`PourController.test` — the pour is pinned in hospitality's `manual-build.test`.

**W-R1e — drainings through a set.** Files: `K/api/bulk.ts` l.84
(`TransferVia = { through: 'pores' | 'set'; arrivesAs? }`), `BulkableLogic`
`transfer` (the `'set'` arm: carry freshness, pathogens, the per-litre
domains and `maker`; drop identity; `arrivesAs` names the matter),
`K/lib/mould/Mould.ts` l.966–992 (`creditDrainings` = the transfer + the
one-band grade), l.603 (`poolKg` from `amountL` + `setDrainedKg`), l.701
`clearPool`. Tests: `Mould.drainings.test.ts` (a curd at load L with
pathogens P: the whey below reads L and P, is `whey`, has no `recipeId`,
names the maker; the set solid's mass is unchanged by the debit), the
shipped `Mould` and `WaterFilter` tests green. `mould.md` + `bulk.md` (the
two `through`s). Gates: `lint:unconsumed-seams`, `lint:pathogens`;
`test:near` + dairying/sugar vitest. Commit: `fix(mould): drainings are a
transfer through the set — the population goes with the whey`.

✅ **W-R1e done (2026-10-28).** `through: 'set'` (whitelist `throughSet`); the
drainings are two transfers (below, the overflow to no sink), `poolKg` adds
`setDrainedKg` back. Plan fixes: no curd authored `drains:` — both now drain
`whey` (lens 1); solids and holder grade/mark stay the solid's.

Order: a → b → c → d → e (the representation lands before any matching
change; e is independent and may land any time after a).

### Risks, and what only a drive can prove

- **Wire drives are not run in these waves** (the owner's review rule).
  What they alone would prove, to be run once at the review's end:
  ceramics-a/c/d, glass and rubber (compounding through the one mint —
  masses, the glaze's coat, the rubber's sulfur fraction), cooking (`order
  stew` through the pot), grain-chain (`knead`'s gate). The bar has no
  drive; its coverage is the new proportion + pour tests, and a bar drive
  is a debt this re-plan names (§ *Deferred seams*).
- **Mass vs volume in the fold.** `t_i` and `a_i` both use the banked
  material's density, so a recipe authored in litres is matched in litres
  effectively; the fraction record is by mass. A category spanning densities
  (`fat`: tallow vs oil) matches by what was poured — intended.
- **The pour's serving default** (0.25 L) is wrong for any un-authored
  spirit; `servingKg` is authored on every row with a dose. A pack that
  ships a new liquor without `servingKg` pours a quarter litre: a
  `lint:perishable`-style gate (`lint:servings`: every material authoring
  a toxin dose authors `servingKg`) is cheap and named in W-R1a.
- **Clay's own stash fold** (`Clay.ts` l.575–586) is a third fold left in
  place this round (it folds a stack's `weatheredDays` with its makeup);
  it should call `absorbMakeup` — noted, not done, so the ceramics drives
  stay untouched.

### Deferred seams (from this re-plan)

- `dissolve` → `dissolvedSolidsKgPerL`, never `makeup` (R1-D9).
- A bar wire drive (`hospitality.dirty.wire.test.ts`): pour · stir · strain
  a martini and a negroni by serving, read the glass's dose.
- `nutrientAmounts` units are heterogeneous (per litre, per 100 g, per
  serving) and display-only; a nutrition pass should re-base them on
  `servingKg` — a slate item, not this MR.
- The dough rows hydrate above 100 % by mass (flour 1 L = 0.565 kg against
  0.6 kg water, `dough.yaml`); a batter, not a dough. Rows, baking's.
- `Clay`'s stash fold → `absorbMakeup`.

## ⭐⭐ Host placement

Every new field, mixin and class, with what composing it claims of
everything else on that host. ⭐ The test applied to each: if a reader
would need a guard to re-narrow the host set, the host is wrong.

| new thing | host | what composing it claims | why not the alternative |
|---|---|---|---|
| `heatWork` record, `reconcileHeatWork()`, `heatSource()` public, `evaporativeDepressionK()` | `ThermalMixin` | every body with a temperature has a heat history and cools faster when wet — true; inert (one lookup) when its material declares nothing and it is dry | a `HeatWorkMixin` needs a guard to choose hosts; a limestone lump in a bread oven must count |
| `@hook heldTemperatureKFor(body)`, `@hook heatCeilingFactor()`, `chamberVapors`, `settleFiring(by)` | `BurnerMixin` | every fire may answer a different heat for a different body (default: the same), may be ceilinged by its vessel (default: not), carries what vaporized in it (empty for a lamp), and can settle what it held | the clamp and the lined furnace override; a lamp inherits the defaults |
| `MeltableMixin` (+ `ThermalMixin` on `Sheet`) | glass `GlassBottle`, `Sheet`, `Melt` (the kernel `Casting` already composes it) | a glass good melts because it is warm (ruling C) | a rung that re-classes was rejected |
| `BulkPayload.composition` | declared from `lib/material/Composition.ts`; written by `doMelt`, the pour fold, the smelt's run; read by the set edge | molten matter remembers what was dissolved in what melted into it | on the vessel it would be lost at every pour |
| `pourDurationS` | `MouldMixin` | a mould may take a pour that is a day's work (default instant) | — |
| `vaporizesAboveK` | `Material` | a material may become a chamber vapor | — |
| `heatTransitions`, `thermalExpansion`, `acidity`, `brokenTemplate`, `leaches`, `formTemplates`, `chillsTo`, `cureSetting`, `filteredTo`, `solubility`, `crystallizesTo` | `Material` (singleton rows) | a material may say what heat, cold, a knock, an acid or a mould does to it; unauthored = nothing happens | per-instance copies would be the `Freshness on every Thing` shape |
| `FacedMixin` (`coats`, `faces()`, `outermost`, `layCoat`, `fuseCoats`, `holdsWater`, `cleansAs`) | `lib/stuff/Good` | every good has an outside that something can be laid on; a vessel has an inside | on `Thing` it would claim it of walls and floors, which take paint through construction's layers |
| `flaws`, `sufferImpact()`, `impactStrengthJ()`, `ring()`, `canReceiveAtK()` | `TangibleMixin` | every piece of matter can be struck, can carry a hidden flaw, can be rung, and can or cannot take a pour's heat — all true, all derived from its material | on a `Brittle` mixin the host set is a tag the material already carries |
| `reconcileLeach()`, `reconcileSeep()` | `BulkableMixin` | what holds a liquid may give it something from its inside face and may lose it through a porous body — true of every slot; inert when the holder is not `Faced` or holds water | on `Maturing` it misses every crock that has no batch |
| `GreenwareMixin` | kernel `lib/material/Greenware.ts`; composed on `Brick`, `Ware`, `Cone`, `FlowerPot` (ceramics, each composing `WaterActivity` itself) and `SettingPan` (dairying, which already composes `WaterActivity`) | an UNFIRED body whose moisture decides whether it can be trimmed, joined, stamped or fired, and whether rain and frost ruin it — inert from the first rung (R2) | the 23 shipped rows are born fired and do not compose it |
| `MixingVesselMixin` (`blendMaterial`, `blendTemplate`, `blend(by)`), `CompositionMixin.absorbComposition` | `lib/material/Mixing.ts`; kernel twin `platform/thing/MixingVessel`; the ceramics `TemperPit` | a vessel that turns what is put in it into one blend whose fractions are the inputs' by mass (R1) | a recipe per mix would be a fixed ratio |
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
| `ParsedForm`, `Form` row | `lib/craft/FormSpec.ts`, `platform/idea/Form.ts` | a form is five classes × a capacity × a proportion; a word is a row | — |
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
  (smelter, glasshouse, fuel yard; the quarry pit is already
  `PersistableMixin(OpenWorkingMixin(Locale))` and W5 proves its props'
  state survives — see W5).
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
with a consumer each time; no wave waits on a sibling.

### W0 — one rule fires everything (the kernel's M1)

> ✅ **DONE (W0).** Heat-work on `ThermalMixin`, `HeatTransition` (←
> `Crosslinking`), `fire` without a recipe path, `mediumBurns` (chamber arm,
> both call sites), `MixingVessel` + `stir`'s arm + `knead` promoted,
> `BulkPayload.alloying` + `poolVesselIn`, the glow reading, the
> `trade-ceramics` pack born (66 packs). Ten firing rows retired; lime,
> clay, wood, coal, the glass batch and compounded rubber ride materials.
> Decisions B1–B13 above. Surprises: clay needed three transitions (B1); the
> lost burn needed the bed (B5); charcoal by mass rebalanced the smelt (B8).
> Three workers did glass, rubber and fuel in parallel.

**Goal.** Heat-work on `ThermalMixin`; `HeatTransition` folds
`Crosslinking`; `fire` has no recipe path; the five shipped firings ride
materials. Consumers in the same wave: the limekiln (burn-lime), the
retort (volatiles), the glass batch (as a `stir` mix + a transition), the
rubber works (its cure), the quarry's pot (now a transition on clay to
terracotta with no row).

**Decisions.** D1 D2 D3 D4 D31 D34; the glass batch is a BLEND (R1): the
glasshouse's batch pot is a `MixingVessel` row and `stir` folds sand,
flux and lime by mass into `/trade/glass/thing/batch` (class `Melt`,
material `/trade/glass/idea/material/batch` with `heatTransitions` →
`glass` at 1400 K, `massRetained 0.72`, `discipline: glasswork`); both
batch recipe rows are deleted (potash's `flux`/`stabilizer` slot tags
move onto the materials the pot accepts — the same words, now
`Material.tags`, so the merge is a union either way); amber is the same
pot with charcoal in it. ⭐ **Remelt is phase change (ruling C), never a reclass:**
`remelt-cullet.yaml` is deleted; `MeltableMixin` is composed on the glass
pack's `GlassBottle`, `Sheet` (which is `Tinted(Alloyed(Good))` today, so
it takes `ThermalMixin` too — `reconcileMelt` needs a temperature) and
`Melt` (the kernel `Casting` is already `Composition(Meltable(Thermal(
Good)))` and needs nothing); `doMelt`'s destination gains one rung before the floor — a
`Bulkable & Thermal` vessel standing in the SAME chamber that is empty
or holds this material (the smelt's `crucibleIn` rule, moved into
`Thermal.ts` as a private `poolVesselIn(scope)`), so a bottle in a kiln
pools into the glasshouse's pot and never into a floorless chamber's
void; `gob.yaml`'s `melt` arg becomes `requires: CompositionMixin`,
default `reachable:[mixin.CompositionMixin]`, and `GobController` takes
any `glass`-tagged `Composition & Thermal` piece at or above its working
floor — a fired batch (a `Melt`), a cullet lump the kiln brought up, a
bottle put in hot (`GlassBottle` is `Composition` through `Tinted`). A
pool that cools sets as a glass `Casting` by the shipped freeze edge.
⭐ **The pot (ruling D):** `fire-pot.yaml` is deleted here; a clay lump
fires to a terracotta lump (`/stuff/thing/clay-pot` stays as the dorm's
and the farm's row and becomes the `open` form's product in W4); ⚠ the
extraction drive has NO clay checkpoint today (its l.291 comment says the
clay→pot loop was deliberately not driven) — **this build WRITES one**:
in W0 it digs the clay band and fires a lump to terracotta, in W4 it
shapes and fires the pot. `burn-lime.yaml`, `retort-wood.yaml`, `retort-coal.yaml`,
`vulcanize.yaml` are deleted; `calcine.yaml` is deleted iff potash is on
master (else recorded). ⭐ **The `trade-ceramics` pack is BORN here**
(it is the first wave that writes under `/trade/ceramics`: the three
disciplines W0 credits), with `pack.yaml`, `package.json`,
`tsconfig.json`, `vitest.config.ts`, the root dependency, the discover
count 65 → 66, `pnpm install`, and `idea/Discipline/{brickmaking,pottery,
masonry}.yaml` (W3 and later waves fill it). ⭐ **The pool keeps its
composition** (ruling C, revision 2): `BulkPayload.composition?:
CompositionEntry[]` declared from `K/lib/material/Composition.ts`;
`doMelt` seeds it from the melting piece's `getAlloying()` (mass-weighted
into an existing pool); `BulkableLogic.blendPayloads` folds it by volume
(the `dissolvedToxins` shape, through `Concentration.blend`); the set
edge stamps it back — `Mould.carryPayload` and the plain `Casting` clone
in `reconcileBulkPhase` call `setAlloying(payload.composition)` on a
`Composition` cast; `SmeltController`'s liquid run moves its carbon stamp
(`setFractionOf(CARBON, …)`, l.533) onto the run's payload so the ingot
takes it off the pool — as NEW code in `runIntoCrucible` (its source
receptacle's payload seeded `{composition: [{carbon, fraction}]}` from
the `carbon` the charge computed; l.533's stamp is the solid bloom/steel
path and is untouched). The fold is our own: `Concentration.blend` is
typed `{type, amount}` and a `CompositionEntry` is `{materialPath,
fraction}`, so `BulkableLogic` gets a private `blendComposition(a, La,
b, Lb)` (volume-weighted, like the toxin fold but over `materialPath`),
and `CompositionMixin` gains `absorbComposition(entries, massKg)` — the
mass-weighted fold a mixing vessel (D34) and a multi-input craft mint
share; `CraftingLogic.carryChemistry` (l.144, a one-to-one copy) is
unchanged for one input and calls `absorbComposition` per input when a
build had several `Composition` inputs. A green bottle remelts green; a
pig's carbon rides the crucible. ⭐ **Mixing (R1, D34) lands here too:**
`MixingVesselMixin` + `platform/thing/MixingVessel`, the `stir` change,
the `knead` promotion (moved from W3), rubber's mixing tub and the glass
batch pot.

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
  `fire.yaml`: args `kiln` (`requires: BurnerMixin`, positional or
  `in`/`at`, unchanged), `hold` (greedy after `for`), and the command
  OPTION `--draught <wide|open|half|low|banked>`; help rewritten.
- `K/platform/idea/reading/TemperatureReading.ts` + `temperature.yaml`
  (`handTool: pyrometry`; incandescence words).
- `K/lib/cleanliness/Soilable.ts`: `recordHeat` now called by the
  completion with the record's actual `peakK`/`aboveS`.
- Material rows: `base-library/…/rock/limestone.yaml` (`heatTransitions`
  → `caustic/quicklime`, 1170 K, 0.56, `discipline: quarrying`);
  `earth/clay.yaml` (the ladder → `/trade/ceramics/idea/material/…`
  bodies — ⚠ base-library cannot name a trade path; so W0 ships the four
  body rows in **base-library** `ceramic/{terracotta,earthenware,
  stoneware,refractory}.yaml` plus the three reducing twins
  `ceramic/{terracotta-reduced,earthenware-reduced,stoneware-reduced}.yaml`
  (gray · the blue brick · celadon-gray; refractory has no color twin),
  named by each rung's `reducing:`; the pack's material dir holds only the
  glazes, slip and the clays; `organic/{charcoal,coke,ash}.yaml` and
  `bulk/wood-tar.yaml` MOVE from `trade-fuel` to base-library at the
  same paths (R4; `half-burnt-wood.yaml` is born there) — correction to D18's paths, recorded);
  `wood/*.yaml` ×9 (char at 650 K, 0.25, volatiles wood-tar 0.08);
  `mineral/coal.yaml` (coke, tar + gas); `organic/compounded-rubber.yaml`
  (new; the cure as a transition reading its own sulfur fraction) and
  `raw-rubber.yaml` (loses `crosslinking`); `food/salt.yaml`
  (`vaporizesAboveK 1350`); `trade-glass/…/material/batch.yaml`
  (new), `glass.yaml` (remelt); `trade-potash/…/black-salts.yaml` (iff
  present).
- `trade-glass/content/recipes/glass-batch.yaml` and
  `glass-batch-amber.yaml` DELETED (R1: no recipe — the batch pot is a
  `MixingVessel` row `C/trade-glass/…/thing/batch-pot.yaml`,
  `blendMaterial: /trade/glass/idea/material/batch`, `blendTemplate:
  /trade/glass/thing/batch`; sand, flux and lime go in and `stir` blends
  them by mass — the glasshouse props the pot); `C/trade-glass/content/
  trade/glass/thing/batch.yaml` (class `Melt`); the amber batch is the
  same pot with charcoal in it (its carbon fraction tints by `Tinted`'s
  existing carbon term).
- `C/trade-quarrying/src/thing/Lump.ts` composes `ThermalMixin`.
- `C/trade-fuel/src/idea/cmd/fuel/CharController.ts` rewritten (draught,
  ignite, hold, settle); `C/trade-fuel/src/thing/CharcoalPit.ts` loses
  `outcomeFor`/`yieldFor`/the three template fields; `clamp.yaml` loses
  them; `C/trade-fuel/…/material/organic/half-burnt-wood.yaml` (new; the
  brands' material); `brands.yaml`/`charcoal.yaml` kept as rows.
- `K/lib/fire/Burner.ts`: `chamberVapors` (+ fieldMeta `runtimeState`),
  `settleFiring(by)` (the completion both `fire` and `char` call: reconcile
  every content, wear the lining (W5), credit); `K/lib/material/
  Material.ts` `vaporizesAboveK`; `K/platform/thing/Oven.ts` the vapor
  reconcile over its contents (and `BrickClamp` in W5).
- `K/lib/thermal/Thermal.ts`: `poolVesselIn(scope)` in `doMelt`; the
  `Burning`-host and `requiresAtmosphereBelow` skips in
  `reconcileHeatWork`.
- Mixing (D34; *renamed in re-plan R1 W-R1b — `Compounding.ts`,
  `CompoundingMixin`, `CompoundingVessel`, `productMaterial`/
  `productTemplate`*): `K/lib/material/Mixing.ts` (`MixingVesselMixin` +
  `Mixins.MixingVessel` + `isMixingVessel`), `K/platform/thing/
  MixingVessel.ts` (`MixingVesselMixin(ContainerMixin(BulkableMixin(
  ThermalMixin(Good))))`); `K/platform/idea/cmd/crafting/StirController.ts`
  (one new arm: a `MixingVessel` target's completion calls
  `vessel.blend(giver)`; the `BuildVessel` arm is untouched; `stir.yaml`'s
  `vessel` default widens to `reachable:[mixin.ManualBuildMixin,
  mixin.MixingVesselMixin]`); `K/lib/craft/Kneadable.ts` + the `knead`
  promotion (view, `KneadController`, `DoughTrough.kneadPlanFor` — moved
  here from W3; a `MixingVessel` is the kernel's default `KneadPlanner`,
  blending by mass); `C/trade-rubber/…/thing/mixing-tub.yaml` (a
  `MixingVessel` row, `blendMaterial: organic/compounded-rubber`,
  `blendTemplate: /trade/rubber/thing/compounded-stock`) propped at the
  works floor; NO `compound.yaml` recipe — the sulfur fraction is
  computed from what was put in; `vulcanize.yaml` deleted;
  `rubber.dirty.wire.test.ts` gains `put rubber in tub`, `put sulfur in
  tub`, `knead tub` before `fire … for`, and asserts the two charges'
  outcomes by computed fraction.
- `K/lib/material/Composition.ts` (the `BulkPayload.composition`
  declaration); `K/platform/idea/api/BulkableLogic.ts` (the fold);
  `K/lib/mould/Mould.ts` `carryPayload` (+ `setAlloying`);
  `K/lib/thermal/Thermal.ts` `doMelt` (seed) and the solidify clone
  (stamp); `C/trade-smelting/…/SmeltController.ts` l.533 (the carbon onto
  the payload); tests `Thermal.pool-composition.test.ts` (a green bottle
  melts, sets, re-reads green; two pools blend by volume) and the smelt's
  pig test re-pinned.
- `C/trade-glass/src/thing/{GlassBottle,Sheet,Melt}.ts` compose
  `MeltableMixin`; `gob.yaml` + `GobController.ts` (the gate above);
  `remelt-cullet.yaml` deleted.
- Wire: `extraction.dirty.wire.test.ts` l.312 → `['no-charge',
  'not-lit']`, and its clay checkpoint asserts a terracotta lump;
  `fire.dirty.wire.test.ts` drive 10 (`char 0.45` understood AND, after
  the three-day jump, the lengths read as charcoal) and drive 11 (the
  condenser fills by the transition's volatiles); `glass.dirty.wire.test.ts`
  ⭐ GAINS batch coverage it never had (today it only proves `fire kiln`
  is wired): `put sand in pot` ×2, `put ash in pot`, `put lime in pot`,
  `stir pot`, `fire kiln`, then a `look` naming a glass melt in the
  kiln; `extraction.dirty.wire.test.ts` gains the NEW clay checkpoint
  (dig the clay band, `put clay in limekiln`, `fire limekiln`, a
  terracotta lump).
- Tests: `HeatTransition.test.ts` (← `Crosslinking.test.ts`, re-pinned: the
  four rubber outcomes, lime 56 %, partial conversion, atmosphere);
  `Thermal.heatwork.test.ts` (a body in a lit oven accrues; an unwatched
  gap integrates; a mould seam fires; volatiles route); `FireController.
  test.ts` rewritten (a bare `Oven` fires a lump whose material declares a
  transition; the `--draught` option; the hold; no-charge; not-lit — every
  shipped `describe` that authored a recipe now authors a material);
  `FireLogic.sealed.test.ts` (R3: cordwood in a clamp at draught 0.45
  held at 650 K never ignites and chars; at `draught wide` it ignites;
  the gate is `mediumBurns` and both call sites are asserted — a log
  under water never ignites either, the arm underwater owns);
  `Mixing.test.ts` (fractions by mass; the glass batch's iron from its
  sand; rubber 3 % sulfur cures, 25 % goes ebonite);
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
with no instrument; `char 0.45` on a charged clamp, jumped three days,
leaves charcoal lengths; at `draught wide` it leaves ash; a six-hour burn
leaves brands. ⚠ The census assertion is SCOPED: a `FireController.test`
walks every installed recipe row and asserts none has the shape the old
`firingsFor` matched — `requiresHeatK > 0` AND every slot `kind: item`
AND `toolCapabilities: []` — so the ~80 heated recipes other verbs run
(stills, cooking, smithing, all with tool capabilities or bulk slots)
are untouched; the six deleted rows (+ `calcine` when present) are the
whole set.

**Commit.** `build(ceramics W0): one rule fires everything — heat-work on
Thermal, HeatTransition folds the cure, fire has no recipe path`

### W1 — faces, coats and the glaze; the lead leach; the weeping jar

> ✅ **DONE (W1).** `Faced` on `Good` (coats outermost first; wet → fused /
> crazed / run / crawled by the coat material's own fuse heat, expansion and
> the face's dirt), `holdsWater`, porosity off the fired material,
> `cleansAs` read by the wash; the face exchange on `Bulkable` (lead leach by
> acidity, the weep into the vessel's own wetness, the porous face's aroma
> memory); evaporative cooling on both ambient sides; the salt-vapor coat at
> a rung; `dip` promoted behind `DipPlanner` (the chandler's pot plans its
> candle). Glazes lead/ash/salt/tin, acidity on 30 rows, `thermalExpansion`
> on the bodies, `faces.md`. Decisions B16–B21. Surprise: the weeping jar
> only cooled 2 K until its surface counted fully wet (B18).

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
  `ThermalRegulation.ts` reads it (its `protected wetBulbK` deleted).
- `K/lib/thermal/Thermal.ts`: `evaporativeDepressionK()` (0 when
  immersed — never inside underwater's immersed branch), read in
  `ambientTrajectory()`'s flat branch and in `restamp()` (both sides —
  the Coolbox lesson); `fuseCoats` call at a rung (W0 left the call
  site).
- `K/lib/bulk/Bulkable.ts`: `reconcileLeach()`, `reconcileSeep()` driven
  from `getBulkAmount`/`getBulkPayload` reads (the slot's reconcile
  stamp on the payload: `leachCheckedS`, `seepCheckedS`).
- `K/lib/craft/DipPlanner.ts` (new protocol); `C/platform/…/cmd/crafting/
  dip.yaml` + `K/platform/idea/cmd/crafting/DipController.ts` (moved from
  chandlery, made dumb; `in`/`inside`/`outside` options; `verbs: [dip, melt]`; afforded on
  `FacedMixin.commandContributions` in BOTH `environment` and `peers` — a
  held mug and a mug on a shelf alike); `C/trade-
  chandlery/src/thing/DipPot.ts` implements `dipPlanFor` (the candle
  plan, verbatim); chandlery's view/controller deleted.
- `K/lib/cleanliness/Soilable.ts`: `cleansAs()` read — a crazed coat or a
  bare porous body raises `waterLifts` resistance (one multiplier).
- ⭐ S9's *porous ware absorbs fat and flavor* (two reads, no new
  state): FAT is cleanliness's — `grease` dirt deposited on a face whose
  `outermost` does not `holdsWater` is multiplied into the body
  (`Faced.absorbs(face)` → the `DirtKind.absorbedBy` arm already on the
  dirt row, so a wash lifts less of it); FLAVOR is the slot's —
  `BulkableMixin.reconcileAbsorb()` beside the leach: an inside face that
  does not hold water keeps a share of the last fill's
  `dissolvedAromatics` (`faces.aromaRetained` 0.1) on the face
  (`CoatLayer`-less `Faced.absorbed[face]`) and re-imparts it into the
  next fill at the leach rate — *the crock that remembers the pickles*.
  Glazed ware and stoneware keep nothing, which is S9's *hygienic*.
- Rows: `base-library/…/ceramic/{terracotta,earthenware,stoneware,
  refractory}.yaml` gain `thermalExpansion`; `C/trade-ceramics/…/material/
  glaze/{lead,ash,salt}.yaml` (`coats: true`, `heatTransitions` fuse at
  1250 K / 1200 K with `scorchAboveK` 1400 / 1350 → the `run` state
  (D5); `salt` is laid only by vapor, D2), `leaches: [{toxin: lead-poisoning, mgPerLPerDayPerAcidity: 4}]`
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

> ✅ **DONE (W2).** Impact on `Tangible` (drop, throw), flaws, `ring`,
> `canReceiveAtK`; thermal shock (step and rate) on `Thermal`; a crack
> leaks; `brokenTemplate` → sherds; naming moved onto the thing; 22 rows
> re-pointed (the 23rd, the dorm clay pot, was deleted in W0) with glaze
> coats and honest masses; porcelain and grog. Decisions B22–B27.
> Surprise: an import cycle through `Tangible` (B22).

**Goal.** M5 and S1: breakage on `Tangible` through `DropController` and
`ThrowController`; thermal shock judged in the heat-work reconcile; hidden
flaws; the `ring` verb; sherds; `name` by the maker; the 22 rows
re-pointed; the dorm pot. Consumers: every ceramic row in the realm.

**Decisions.** D8 D9 D18; `canBeNamedBy` on `Named` (host placement table).

**Files.**
- `K/lib/material/Tangible.ts`: `flaws` (+ fieldMeta), `impactStrengthJ()`,
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
  `TangibleMixin.commandContributions` in BOTH `environment` and `peers`
  (a held mug, a bell on the square, a brick on a stall; ⚠ check
  `lint:self-contributions` — the person affords it too so `ring` with
  nothing in reach is refused in words).
- `K/lib/description/Named.ts` `canBeNamedBy` default; `Crafted.ts`,
  `Assembled.ts`, `husbandry/Bonded.ts` overrides; `NameController.ts`
  made dumb (`isNamed(t) && t.canBeNamedBy(id)`); `name.yaml` help.
- `C/trade-ceramics/…/thing/sherds.yaml` + `src/thing/Sherds.ts`;
  `C/trade-ceramics/content/recipes/grog.yaml` (millstone, `category:
  sherd` → `/trade/ceramics/thing/grog`, a `Lump` of material `grog`).
- ⭐ The 23 rows (the requirements' 22 counts `bowl/dish/platter` as
  three and lists the dorm pot under S1; the tree has 21 rows naming the
  material + 2 prose-only): **terracotta** — farming `pot/small`,
  `pot/large`, `pot/starter`, quarrying `/stuff/thing/clay-pot` (the
  dorm pot), dairying `setting-pan`; **glazed earthenware** — dairying
  `butter-crock`, `jug`, `rennet-jar`, cooking `tallow-crock`,
  apiculture `honey-jar`, chandlery `soft-soap-jar`, `lye-flask`, generic
  `bowl`, `plated-dish`, `platter`, medicine `steeping-pot` (prose-only
  today: gains `_materialPath` + an inside coat); **stoneware** —
  dairying `starter-crock`, baking `starter-crock` (prose-only today:
  gains `_materialPath`); **refractory** — smelting `crucible` (re-pointed
  to the pack's row in W5), `ingot-mould`, fuel `retort`, cooking
  `smoke-chimney`; **porcelain (import)** — mining `streak-plate`. Each
  gets `_materialPath` + `coats:` per S1; `base-library/…/
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

> ✅ **DONE (W3).** `WeatherApi.freezeThawDaysAt` + the place's
> `freezeThawDaysSince`; `Clay` (composition, weathering by winters,
> plasticity/fired color/refractoriness/crack risk, `analyze clay`); the
> temper pit (knead = blend by mass, water to the window); green ware's three
> states and its weather (slump, frost, steam burst, drying check) with green
> ending at firing; clay-mineral, breeze, slip, alluvial clay, fireclay and
> gypsum, two new quarry-hill bands. Decisions B28–B32.

**Goal.** M3 M4 S2 S3 S7: `Clay` with a composition; the freeze-thaw
weather fact; weathering; tempering on the W0 `knead`; `Greenware`.
Consumer: the pack's materials and the Delight's clay row, so a lump dug
at Rejection can be weathered, kneaded and (W4) shaped.

**Decisions.** D10 D12 D13 D14 (`knead`).

**Files.**
- (the pack exists since W0; W3 adds `content/settings/ceramics.yaml`,
  the materials and the reading.) Pack deps are one direction only (R4):
  `trade-ceramics` → base-library, generic-objects (its firebrick
  `extends: /stuff/thing/firebrick`), platform, trade-quarrying,
  trade-fuel, trade-milling, trade-shopkeeping; **no trade pack depends on
  ceramics** — not smelting (its crucible row stays its own), not
  dairying (its `setting-pan` form row is under its own root and only the
  Delight's wheel ROW lists it); only the realm packs that prop the
  venues do: `rejection` (W5, its store lines), `terminus` and
  `hearts-delight` (W6). `lint:pack-extends` enforces the `extends:` edges; a plain path
  reference to another pack's row is resolved at use and ordered by the
  `package.json` dependency graph — a path to a pack that is not
  installed resolves to nothing, so every cross-pack path in this plan
  sits in a pack that lists the target.
- `K/api/weather.ts` + `K/platform/idea/api/WeatherLogic.ts`:
  `freezeThawDaysAt`; `K/lib/biome/Atmospheric.ts`:
  `freezeThawDaysSince(atS)`.
- `C/trade-quarrying/src/thing/Clay.ts` (new) + `clay.yaml` re-classed;
  `C/trade-quarrying/src/__tests__/Clay.test.ts`.
- `K/lib/material/Greenware.ts` (new) + `Mixins.Greenware` +
  `MixinApi.isGreenware`.
- (`Kneadable` and the `knead` promotion landed in W0.) `C/trade-ceramics/
  src/thing/TemperPit.ts` = `MixingVesselMixin(ContainerMixin(BulkableMixin(
  ThermalMixin(Thing))))` (a fixed mixing vessel that needs water;
  `kneadPlanFor`: the kernel blend-by-mass — sand/breeze/grog put in fold
  into the clay's `alloying` (the clay stays `Clay`: `blendTemplate` is
  the clay's own stack) — water to the window, the tread as a `body` +
  `hands` step; credits brickmaking or pottery by the pit row's
  `discipline`).
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
  fat clay dried fast cracks; sand tames it; ⭐ R2: a fired piece ignores
  rain and frost); `TemperPit.test.ts`.
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

> ✅ **DONE (W4).** `shape` promoted (FormGrammar, Form rows, Shapeable/
> ShapePlanner; wheel, brick table, hands, blowpipe); competence decides
> wall, size and grade; `carve` and `impress` promoted (trim at
> leather-hard, the maker's mark and date); the slip joint for handles;
> the die probe on `hammer`; Ware/Brick/FlowerPot/Cone; product and form
> rows. Rows nothing props yet (wheel, brick table, generic per-class
> products, stamp) wait for W6's works. Decisions B33–B36.

**Goal.** S4 S5, the trimming/joining/marking window, the mark and the
date. Consumer: the pack's `Ware`, `Brick`, `FlowerPot`, `Cone`, the
wheel, the brick table, the stamp; a potter can make and name a jug; a
moulder makes a day's bricks.

**Decisions.** D14 (`shape`, `carve`, `hammer`), D16 D17 D21 (the mark
arm), D25 (`loadN` only).

**Files.**
- `K/lib/craft/FormSpec.ts` (`ParsedForm` — renamed from `Form.ts` so it
  is not a false lib/platform twin of the row class), `K/platform/idea/Form.ts` (+ `lint:instanceable`
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

> ✅ **DONE (W5).** Linings as part lines that wear, ceiling the heat,
> refuse to light burnt through, and are relined (`fit lining to …`) by the
> keepers' `relines` brain; crucibles wear and crack; the clamp grades by
> position and the draught; `measure size` against the statute brick.
> Clamp, pit-firing, updraft kiln and cones rows wait for W6's works.
> Decisions B37–B39.

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
  `furnace.yaml`, `retort.yaml` (bills: `lining × 40` of the COMMONS row
  `/stuff/thing/firebrick` — `C/generic-objects/content/stuff/thing/
  firebrick.yaml`, class `/platform/thing/Good`, material base-library
  `ceramic/refractory` (R4) — `dry-laid` joint `C/platform/…/Joint/
  dry-laid.yaml` with `discipline: masonry`); the pack's made firebrick
  `extends: /stuff/thing/firebrick` and satisfies the line.
- `C/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
  `runIntoCrucible`: `crucible.wear(dial)` + the crack (a `Receptacle` is
  `Durable`, so smelting's own crucible row and the potter's `Ware` row
  both wear); the smelting `crucible.yaml` stays its own row (material
  `ceramic/refractory`, no `extends:`); the potter's `/trade/ceramics/
  thing/crucible` is what the Rejection store line and drive step 13
  name — `rejection/package.json` adds `@saxonberg/content-trade-ceramics`
  here (its store lines name pack rows); `trade-smelting` depends on
  nothing new (R4).
- ⚠ The limekiln's lining persistence: the limekiln is a prop of
  `quarry/pit.yaml`, an `OpenWorking` = `PersistableMixin(OpenWorkingMixin(
  Locale))`, and a persistable room restores *its own record — its
  fixtures* first (furnishing.md § the order). W5 adds
  `Oven.lining.persist.test.ts`: wear the limekiln, `PersistableApi.
  capture(pit)` / `materialize`, assert the line's condition survives. If
  the pit's capture turns out not to carry prop state, the fallback is a
  `lime-yard` `PersistentLocale` beside the pit that props the kiln — a
  row move, no mechanism.
- `C/trade-ceramics/src/behavior/relines.ts`; `behaviors:` on
  `rejection/agent/{glassblower,smelterman,collier,storekeeper}.yaml`;
  `rejection/…/thing/store-counter.yaml` + firebrick line (`from:
  {supplier: the brickfield, importBackstop: 1.5}` — ⚠ the supplier does
  not exist until W6; land the line as an import in W5 and re-point in
  W6), + crucible, lead, tin lines; the four furnace rooms →
  `PersistentLocale`.
- `C/trade-ceramics/…/idea/reading/size.yaml` + `SizeReading.ts`;
  `terminus-city.yaml` three brick standards.
- Disciplines: shipped in W0; W5 adds nothing here.
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
  deposit row …/idea/deposit/valley-alluvium.yaml with `waterTable:
  -1.2` — the shipped working stops at the water table, which is what
  "worked out" IS here), old-pit (⭐ S20's *a worked-out pit floods and
  stands as a pond*: a sibling `Shore` row over a `WaterFixture` of
  standing water, the valley's older pit, authored flooded — the
  dynamic flood of a working is mining-slate's, recorded in Deferred),
  weathering-ground,
  temper-pit, moulding-shed (PersistentLocale), hacks (PersistentLocale,
  `roof:` canvas, `enclosure: none`), clamp-ground, potters-shop
  (PersistentLocale), offstage}.yaml`; `thing/{temper-pit, brick-table,
  brick-mould ×2, tile-mould, screw-press, wheel, updraft-kiln, clamp,
  glaze-bucket ×2, stamp, pallet, counter}.yaml`; `idea/{brickmaster.yaml
  (Business: moulder ×3, setter, potter — `fulfills`, `purchases`, rota;
  `parLines` sand/breeze/wood/firebrick-not), pottery.yaml (the potter's
  own outfit)}`; `agent/{brickmaster, moulder-a, moulder-b, setter,
  potter}.yaml` (Cast, archetypes); the valley-gate exit; `pack.yaml`
  titles; `hearts-delight/package.json` + trade-ceramics, trade-quarrying;
  `terminus/package.json` + trade-ceramics (the stall and the counters
  name `/trade/ceramics/thing/*`).
- The ground reads `mud` (`DirtKind` is shipped): the brickfield rooms'
  floors are `earth/clay` worked false → the shipped floor soiling.
- `C/trade-ceramics/src/behavior/{moulds,sets,pots}.ts` (the gang's day;
  the setter's `put`s and `fire`; the potter's shape → dry → fire → glaze
  → fire → consign).
- Glazes (R1): NO recipe rows — `thing/glaze-bucket.yaml` is a
  `MixingVessel` row (`blendMaterial: slurry`, the slip's water from the
  pail) and `stir bucket` blends what was put in by mass: silica sand +
  a flux (ash, lead, tin — the glaze is NAMED by its dominant flux through
  `Material.coats` on the flux material: `glaze/{ash,lead,tin}` as the
  laid coat's material) + a little clay; the bath's `coats: true` is the
  dip's cue. Salt glaze is the chamber VAPOR path (ruling B): `put salt
  in kiln`, salt vaporizes above 1350 K into `chamberVapors`, and the
  stoneware transition's `vapor: {salt: glaze/salt}` lays the coat.
- Terminus: `C/terminus/…/market/thing/potters-stall.yaml` (a fixed
  `Stock`, supplier the pottery; lines plant-pot, mug, jug, crock, bowl,
  jar, flask, setting-pan); `square.yaml` props it + the curfew bell row
  (W7 — place the row then); `general-store/counter.yaml` plant-pot lines
  (l.99–100) re-pointed; `chandlery/thing/counter.yaml` two lines re-pointed; the general
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
  survival + `receivedPour`; `K/lib/material/Tangible.ts` `canReceiveAtK`
  (W2 declared it); `K/lib/thermal/Thermal.ts` passes `temperatureK` in
  the freeze-edge `SetPool`; `K/platform/idea/cmd/bulk/PourController.ts`
  the engaged pour (above); `K/lib/mould/Mould.ts` `pourDurationS`.
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

### W8 — crystallizing and the filter (master's code, sugar's names)

> ✅ **DONE (W8).** Crystallizing (solubility, crystallizesTo, the bittern
> below via `drainsInto`), the salt pan on its tub, saltpeter and alum
> liquors; the water filter (porous Ware seeping into what it stands on,
> `filteredTo`); tainted vs fouled water on the draw; checkpoints 22 and 32
> written. Decisions B67–B69.

**Goal.** S17 and S9's filter; AC 12 and 18. Consumers: the salt pans
(bittern below), the ceramic water filter, alum and saltpetre rows.
⭐ Waits on nobody (D32); its shared-file work is append-only and copies
sugar's text where the two overlap.

**Decisions.** D32.

**Files.** `K/lib/thermal/Thermal.ts` (the crystallize arm of
`reconcileBulkPhase` inside the existing `if (bp > 0 && temp >= bp)`
block, and the `dissolvedSolidsKgPerL` declaration — sugar's comment and
type verbatim); `K/lib/material/Material.ts` (`solubility`,
`crystallizesTo`, `filteredTo` appended; `solidsKgPerL` + its accessor
pair copied from sugar); `K/platform/idea/api/BulkableLogic.ts` (sugar's
solids fold, copied verbatim, beside the `composition` fold);
`K/lib/mould/Mould.ts` (`drainsInto()` — sugar's signature and body);
`K/lib/maturation/Maturing.ts` (one line in `reconcileEvaporativeWindow`
rescaling the field); `C/trade-quarrying/…/thing/salt-pan.yaml` → class
`/platform/thing/Mould` (reusable, `castTemplate: /stuff/thing/
salt-crystals`, standing ON a `thing/bittern-tub.yaml` propped under it
at the salt flat and the salt house); `bulk/salt-water.yaml`
(`solidsKgPerL 0.035`, `solubility`, `crystallizesTo {product: food/salt,
residue: bulk/bittern}`), `bulk/bittern.yaml`; `material/{alum,
saltpetre}.yaml` rows; `C/trade-ceramics/…/thing/water-filter.yaml` (a
`Ware` row, unglazed stoneware body) + the `filter` form row;
`C/water/…/material/{fouled-water (filteredTo), tainted-water}.yaml` +
the draw branch in `WatercourseCatalogue.ts`; drive steps 22 and 32 stay
in `ceramics-c`/`ceramics-d` where the requirements put them. Tests:
`Thermal.crystallize.test.ts`, `WaterFilter.test.ts`,
`WatercourseCatalogue.draw.test.ts`.

**Commit.** `build(ceramics W8): brine sets its salt with the bittern
below; porous stoneware strains the water by its pores`

### Then: the drive, the suite, the MR

Run `ceramics-a…d` against the booted world; record each run below;
run the sibling PROBE (§ Merge protocol — each sibling's tip merged onto
ours in a throwaway detached worktree + `lint:family`); `pnpm test` ONCE
before the MR; open the MR; the pre-MR check in CLAUDE.md § the lint
family.

**Total:** nine waves, no gate — W0 ≈ 4.5k lines (the kernel rework, the
pack's birth, `knead` + `stir` mixing, six packs' rows), W1 ≈ 2k, W2 ≈ 2.5k, W3 ≈ 2.5k, W4 ≈
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
| fire a chamber | `platform/cmd/device/fire.yaml` (rewritten) | `BurnerMixin.commandContributions` (unchanged) | the charge's material `heatTransitions` | every burner row that stands in a room | `kiln: requires BurnerMixin` (positional or `in`/`at`); `--draught <word>` a command option; `hold` greedy after `for` |
| char a clamp | `trade/fuel/cmd/fuel/char.yaml` (unchanged view) | `CharcoalPit.commandContributions` (unchanged) | the wood material's transition; the clamp's draught | the fuel yard's clamp | `clamp: requires [BurnerMixin]` unchanged |
| read the kiln | `analyze/measure temperature` | the platform `Reading` affordance | `temperature.yaml` `handTool: pyrometry`; the cones row | cones propped at the potter's shop | the cones are a `Tool` with `capabilities: [pyrometry]` |
| lay a glaze | `platform/cmd/crafting/dip.yaml` (`verbs: [dip, melt]`) | ⚠ `dip` was afforded by `DipPot` only; now afforded by **`FacedMixin.commandContributions`, `environment` AND `peers`** (a held mug, a mug on the stall's shelf) plus the person's self-contributions so a bare `dip` is refused in words | the bath material's `coats: true`; the glaze rows | glaze buckets propped at the potter's shop | `target: requires FacedMixin`; `bath: requires BulkableMixin`, default `reachable:[mixin.BulkableMixin]` |
| ring a body | `platform/cmd/perception/ring.yaml` | `TangibleMixin.commandContributions`, `environment` + `peers` + self | material tags | — | `target: requires TangibleMixin` |
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
| filter water (W8) | `pour` (unchanged) | `BulkableMixin` | `filteredTo` on `fouled-water`; the filter's seep into `drainsInto()` | the filter sold at the stall | unchanged |
| mix (R1) | `stir.yaml` (unchanged verbs) / `knead.yaml` (platform, W0) | `MixingVesselMixin.commandContributions` (environment + peers) | the vessel row's `blendMaterial`/`blendTemplate` | the batch pot, the mixing tub, the temper pit, the glaze bucket | `vessel` default widened to `mixin.MixingVesselMixin`; `knead`'s medium `requires: ContainerMixin` + the planner probe |

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

1. **Later, not now:** the bell pit as a PLACE you climb into (S19's
   *the mould is a place*). The plan's position is a fixed mould thing;
   a Location composing `Mould` is a build of its own. Recorded in
   Deferred seams.

### Positions taken (owner-confirmed defaults, 2026-10-20)

- D7 — the lead leach is on the vessel's inner face through `Bulkable`;
  maturation's `imparts` is untouched; casks (a char layer on the inside
  face) are the special case recorded in `maturation.md` for later.
- D26 — the bell pit is a fixed mould thing in the foundry yard.
- D14 — both die syntaxes ship: `hammer <blank> on <die>` through
  smithing's `anvil` arg and `impress die on blank`.
- The four verb promotions (`shape`, `knead`, `dip`, `carve`) stay in
  THIS MR as early waves (`knead` W0, `dip` W1, `shape` + `carve` W4).
- The three furnace rooms become `PersistentLocale`; their bounded fuel
  props persist as consumed.
- `Faced` composes on `Good`.
- An unwatched transition credits `heatWork.firedBy`; a pot fired in a
  house fire credits nobody.
- Ruling C removed the only class change at a rung; nothing re-classes.

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
| a working that FLOODS when it reaches the water table (the valley pit standing as a pond is authored, not dynamic) | mining-slate (*a pit that fills, and a pump*) |
| the clamp's over-burnt CLINKER grade as the paving brick (Dutch *klinkers*) — roads-slate § 4's surface table has no brick today | [roads-slate](../slates/builds/roads-slate.md) (the coordinator edits the slate) |
| drain tiles under a McAdam road (the brickfield's tile mould, laid for drainage) | [roads-slate](../slates/builds/roads-slate.md) |
| `hammer` promoted behind a protocol | command-taxonomy-slate |
| the oven's own warm-up (thermal mass on the furnace) | `fire.md` deferred (unchanged) |

## Critical files

Kernel: `K/lib/thermal/Thermal.ts` · `K/lib/material/HeatTransition.ts`
(← `Crosslinking.ts`) · `K/lib/material/Material.ts` ·
`K/lib/material/Faced.ts` · `K/lib/material/Greenware.ts` ·
`K/lib/material/Evaporation.ts` · `K/lib/material/Tangible.ts` ·
`K/lib/stuff/Good.ts` · `K/lib/bulk/Bulkable.ts` ·
`K/platform/idea/api/BulkableLogic.ts` · `K/lib/mould/Mould.ts` ·
`K/lib/mould/Impression.ts` · `K/lib/fire/Burner.ts` ·
`K/platform/thing/Oven.ts` · `K/platform/thing/ScrewPress.ts` ·
`K/lib/craft/{Shapeable,Kneadable,DipPlanner,Carvable,Impressible,
Turnable,FormSpec}.ts` · `K/platform/idea/Form.ts` · `K/lib/material/Mixing.ts` · `K/platform/thing/MixingVessel.ts` ·
`K/platform/idea/cmd/bulk/PourController.ts` ·
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
{Clay,Lump}.ts` · `C/trade-fuel/src/thing/{Retort,CharcoalPit}.ts` + `CharController.ts` ·
`C/trade-glass/src/idea/cmd/glass/GobController.ts` ·
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

## Build status (handoff, 2026-10-20)

- Committed: W0 d22c2a429 · W1 4a671e8f1 · W2 38d1a676d · W3 2a21c0e2f ·
  W4+W5 1eaa685d9 · W6+W7 3e32aa72f · W8 (see git log).
  Each wave: `test:near` + all 82 lint gates green.
- Drives: 21 runs so far (see § Drive record). The full `pnpm test` is
  still owed, after the drives are clean.
- Memory is short on this box (build-4's test world): one heavy process at a
  time, never parallel tsc.
- Drive risks flagged by the W6/W7 builders: Rejection's firebrick line
  depends on a brickfield carrier nobody runs (backstop holds while the
  Delight stack has bricks); the Delight temper pit makes any clay the
  Delight's; `measure size` blurs ±8 % untrained; quoted multi-word MQL
  keywords and `get lump` from the oven are untested live; checkpoint 35
  covers only W7's restart state.

## Drive record

*(appended at build time — one entry per run: the date, the file, the
count, each failure and what it became)*

Runs 1–15 (2026-10-21 → 22) are recorded commit by commit
(`git log --grep 'drive(ceramics'`); B71–B77 hold the decisions they
forced. What they found, by kind:

- **Product defects the drives found and the build fixed** —
  - `dig clay` in the pit bound the PIT and dug its floor (642490ba6);
  - a won load merged before it was named, and named winnings went to
    the tip (647103aba, 4c6806c9a);
  - moulding and treading cost beyond any body: the `lint:act-effort`
    gate was built (448d7cefe);
  - bone-dry was judged against the wrong air (417f006b9);
  - a lump in hand swallowed the band word (4176d43a3);
  - an empty seat read as broken, and nothing afforded `carve` on green
    ware (a93de82d8);
  - thermal shock ignored refractory bodies (c917dfa79);
  - a thing destroyed before its line rendered crashed the MML render
    (fc99194a4);
  - a die afforded no blow, and a town bell did not carry (88c02cef1);
  - the pan crystallized on a heat read, not as its water left
    (05ef3b39f);
  - `clone` judged the giver, not the kind's own path (B76).
- **Drive defects** — the five reachability-adjacent traps every long drive
  meets:
  - **set on read** — a mould, case or pan sets when it is read, so the
    drive looks first;
  - **the dark** — names read "something" and queries return nothing;
  - **the eval sandbox** — no `|`, no `&&`, no `destroy`, no reading
    a person's contents;
  - **a bare `get X` takes every match**;
  - **a checkpoint owns its position**.

**Run 16** (D 17/23, B+C stopped at C 16, A 7/20):
- B 13/14 and C 16+ were **dead characters**. The brickmaker died of
  hyperthermia (no water, no sweat) and the potter of starvation: the
  drives jumped weeks unfed. The fix is in the harness: `advanceLiving`
  plus `nourish` (ff6cd30e2, docs/testing.md).
- B 13's ore setup was refused at the sandbox boundary. That was a
  **kernel defect**: a marshaller was held to the jurisdiction compare,
  so a scoped eval could clone nothing with a mass. Fixed in 49f9f3f58.
- A 5a: a storm soaked the open-yard brick and dried off before the
  read, so it never slumped. Green ware now records rain as an **event**
  (ef3572d9a).
- A 5b: the world **crashed**. `drop 1 brick` merged into the hack's
  stack, and the detached fall read a destroyed piece's mass; nothing
  caught the rejection (ef3572d9a).
- C 16c / 17: drying waits read in the dark (whole-day steps that began
  at night). They now read by daylight.

**Run 17** (D only; the world crashed at step 29):
- **The crash was caused by me, not the build.** A probe I ran by hand
  called an async read through `eval`; it was refused at the sandbox
  boundary, nothing caught it, and the server exits on any unhandled
  rejection. That exit is deliberate platform policy and is recorded as
  a finding; this build does not change it.
- D 28: still a misrun at 1420 K. Measured: a full crucible of brass
  radiates about 20 K per real second, and the drive takes several
  seconds from the melt to the pour. It now melts at 1500 K (caff50dd0).
- D 26b: the plaster case had not cured after 30 minutes. It passed in
  runs 16 and 18 (alone); this one is watched, not yet explained.

**Run 18** (D 16/23; B stopped after 11; A ran with `nourish` refused):
- D 32: the salt pan on the hearth now fired, because the hearth counts
  what stands on it (run 16 had read "the brine hearth is empty"). Then
  it set **no salt**: the boil arm took water off a liquid and left the
  dissolved solids per liter unchanged, so the salt left with the steam.
  That was a **kernel defect**: a boil now concentrates (eb5b288b0).
- D 28: still a misrun at 1500 K. The wax block's mould material is its
  cold fired-clay jacket, against which a 20 g key needs ~120 K over its
  melt, and the drive waited on the melt's prose before pouring. It now
  pours as soon as the melt's envelope lands (d276de22c).
- D 33a / 34a: `clearFloor` could not destruct a cast of a /stuff kind,
  so the next `pewter` named the old cast. Leftovers now go out to the
  foundry yard.
- D 34c: the curfew bell was heard, but before the listener started
  listening: `listen()` clears what came before it. The drive now listens
  from before the ring.
- D 34b: `ring bronze` rang the floor; this run records what `bronze`
  names.
- B 10 / 11 (drive defects):
  - `at` was empty, so a rest's drink came back to no location;
  - every rest drank, and the village pump's packing wore through;
  - a bare `get coal` took every lump at the face;
  - lumps left out through the night were rained on (`too-wet`).
- A:
  - `nourish` was refused. Topping up a reserve reconciles the body,
    the reconcile reads the biome, and a parcel-bound eval may not.
    **Kernel**: Biome is `commons` (ceiling 24 → 25, caller audit in
    afa24dc58). **Harness**: `POST /auth/test-nourish` replaces the eval.
  - The pit's fresh clay merged into the moulders' weeks-old heap and
    read weathered. The gang's leftovers now go offstage first.
- `lint:instrument-args`: my buy fallback hunted the room in the
  controller. The search moved onto `Stock.counterFor` (3e39b664a); the
  family is back to 83/83.

**Runs 19–21** (D 16/23 each; A 1–5a and the winter pass once fed):
- **Kernel defects found and fixed:**
  - **Verb dispatch** (814d65551): a view refused by an *argument's* gate
    now yields to the next view of the same verb. An ingot (a runner and
    riser) affords crafting's `pour`, and `pour ladle into pit` stopped
    at its vessel gate.
  - **Transfer order** (790b63100): the destination is brought current
    *before* the pour lands. A 19 g key cast was frozen in the cold
    jacket by the heat-set's own reconcile, with no superheat on record
    (DIAG: `superheat=0.0`).
  - **Shaping** (d19968f42): `Clay.consumeKg` kept a worked heap as ONE
    lump of everything left, which handed a potter a 75 kg "lump".
  - **Look line**: `Assembled` printed "It is made of ." for a jug whose
    only line was its wanted handle.
  - **Death** (0fd0cf563): a player body's death read a mass that wasn't
    there and took the world down from a detached `die`.
  - **Sandbox** (afa24dc58): `Biome` is `commons`; `POST
    /auth/test-nourish` replaces the drive's eval.
  - **Silent cast loss**: `Mould.castInto` warns when a shape cannot be
    cloned, instead of returning null in silence.
- **Drive defects, all fixed:**
  - **People died between checkpoints.**
    - Run 20 fed only bread and water through a game year, and the
      brickmaker and the founder died of **scurvy**. Vitamin C is now
      fed too, and so is the founder.
    - B's `at` was empty, so its water break returned nowhere.
  - **Reads hit the wrong object.**
    - C took the gang's clay heap with a bare `get clay`.
    - The D sweep was refused on a person in the room (now by id, one
      item at a time), so `flask` and `pewter` named old things.
  - **The step's own setup failed.**
    - A crucible cracked over a day of melts (now replaced).
    - The key and bell were poured late (now as soon as the melt lands).
- **Engine confirmed by DIAG:** the salt pan works — 20 L boiled to
  0.6 L and set 5.4 kg of crystals in the pan.
- **Findings, not fixed in this build:**
  - **`pan:i` lists nothing**, though an eval shows the crust's
    container is the pan. The drive counts `crystals`.
  - **`ring bronze` rang the floor** when `bronze` named the bell and
    its runner. The drive now rings by identity.
  - **A parcel-bound eval:**
    - may not clone a `/stuff` kind (`setShortDescription()` denied
      during hydration);
    - may not move a Delight lump (`getPlacement()` denied);
    - may not read a room holding a person (`peek()` denied).
  - **The server exits on any unhandled rejection**, so one bad `eval`
    — mine, run 17 — or one detached throw ends a world. That is policy,
    and it is left alone.
  - **Temporary `DIAG(ceramics)` logging was in** (7a21b7a23); it came
    out in 8646da843.

**Runs 22–23** (D 18/23, then 17/23; A–C not reached in 23):
- **Kernel defects found and fixed:**
  - **Work heat** (e0adc3234): a body working in the heat banked its whole
    work heat and shed none until the work ended, so an afternoon's digging
    killed the brickmaker of hyperthermia while resting. `absorbHeatLoad`
    now sheds what the body can while it works — the sweat it can afford,
    nothing past the wet-bulb ceiling.
  - **Carve** (1b3be923b): `carve pattern from <stock> for <metal>`
    declared `for` before `stock`, so the documented line never bound its
    metal.
  - **Greenware slump**: a wetted pot read the slump off the last delta
    only; `greenWetted` accumulates.
  - **Boil concentrates** (Thermal): a boil arm leaving less liquor now
    keeps its dissolved solids in it.
  - **Bricks stack only alike**: a wet brick merged into a bone-dry stack
    and took its water.
  - **Gang brains** take their own bricks by id, never the player's.
- **Drive defects, all fixed:** the cast key was swept up by the general
  floor sweep (the sweep is now narrow); 34a read the old straight cast
  (now by `idsOf()`); the bell's ring listened after the ring; 33a now casts
  its own pewter; jumps over 4 h dropped heat regulation as absence and are
  stepped at 4 h.
- **Open from 23:** `fire hearth for 12 hours` got no dispatch response
  within 30 s once — contention, or the hold. Watched in run 24.
- **The potash merge** (c627b0893, B78) lands before run 24.

**Run 24** (after the potash merge; D 18/23 · A 9/20 · B 5/6 · C stopped at
2 passing, the chain reaped for memory):
- **Kernel defect found and fixed — the freeze banked by reads, not time**
  (3e485fd6a). A damp-blown flask of pewter sat "filled, and has not begun
  to set" for three game hours: the plateau banked `(mp − T)·C` per READ, so
  one read after a long gap banked one cooling's worth. Step 27 passed only
  because a later query re-read its flask. Now the heat is integrated from
  the drift itself (`C·(mp − amb)·ln((mp − amb)/(T − amb))`); thermal.md had
  recorded the defect as known. The melt still banks per read.
- **Drive defects, all fixed:**
  - D 32: six 6 kg coal lumps were over the caster's load; the five held
    then made 34a's `get board` fail. Two a trip now.
  - D 35: the key is now asserted in hand BEFORE the restart — the caster
    carried nothing after it, and the run could not say which side of the
    restart lost it (a probe login overwrote the snapshot).
  - A 5b: `get 1 brick` bound the moulding table ("brick table"); the brick
    is taken by id. The step's 300 s timeout did not stop its loop, which
    jumped the clock through 3 and 4 and killed the sodden brickmaker of
    hypothermia — everything in A after 5b was that cascade.
  - A 3: the knead's blend mints AFTER the engagement completes; read at
    once the pit is empty. ⭐ This was the "`pit:i` lists nothing" finding.
  - B 13: coal won at night (every lump "something") and four lumps over
    the load; daylight first, two a melt.
- **Findings, not fixed in this build:**
  - **A singular head noun binds a modifier**: `get 1 brick` → the "brick
    table"; `get clay from pit`, refused by the `from` view, falls through
    to plain `get`, which binds "clay from pit" to the pit and answers
    "fixed in place" — a misleading refusal (potash's MQL-substring note).
  - **A durative act's heat lands at completion**, so work does not warm a
    body while it runs; a sodden worker in winter cools as if idle.
  - **A timed-out wire test keeps running** — its loop outlives the test.

**Runs 25–29** (D reached 20/23, A 11/20, B 5/6 at best; each run surfaced
the next layer — drive defects mostly, and these kernel ones):
- **Kernel defects found and fixed:**
  - **The world wedged on a lit hearth** (a2d46efac): `MaturationProfile.
    byKey` globbed the whole stuff trie on every read of a maturing
    vessel, and a fire tick reads its fuel slot dozens of times. Found by a
    live CPU profile; byKey now re-resolves a remembered path.
  - **The freeze plateau, three ways** (6b2df3a62, 13322e077, b45de18ff):
    a pool read the instant it landed sat AT the cold mould's temperature
    and banked infinite heat; the drift on record counted from before the
    pool existed; a damp mould's easing evaporative chill left the pool
    BELOW its rising air and back on the per-read figure. The transfer now
    sets the heat before the matter lands; the drift is consumed by the
    next phase pass; at or below the air it banks by elapsed drift.
  - **A refused split threw** (7ed79b793): `get 1 clay`, too heavy, could
    not merge its split-off back (clay's state read diverges) and threw
    out of the command. The split now stays a lump of its own.
  - **MQL matched mid-word** (c9264790f): `consign "plant pot"` with no
    plant pot in hand put the player's aether imPLANT up for sale. A query
    word now matches where a word begins.
- **Harness:** `POST /auth/test-hand` hands a character a thing by name;
  every drive dresses its people for winter (`dress`), and `test-nourish`
  now also tends open wounds (an untreated burn weeps until the body is
  SAFE — the founder bled out of a scald over jumped weeks) and dries the
  body and what it wears (a sodden brickmaker died of hypothermia mid-
  knead, coat or no coat).
- **Findings, not fixed in this build:**
  - **`X:i` lists nothing for a kiln that holds six pieces** — confirmed by
    an eval in run 28 (so the old `pit:i` / `pan:i` finding is real, not
    only the knead race). The drives prove loading by the acts.
  - **A keyword phrase matches on its first word** — `get 1 brick` takes
    the "brick table".
  - **Two-word names need quotes on a command line**, and the refusal
    ("doesn't match any known command shape") does not say so; `get
    "plant pot" from kiln` passes the quotes through to MQL.
  - **Perception is the world's hot path**: every describe walks light
    through the location graph; under a long clock advance the server
    answered nothing for minutes (run 29's profile).
  - **A durative act's heat lands at completion**, and **the smelt wants
    16 kg of charcoal present at its start** while a lit chamber burns a
    charcoal charge in minutes — a player must charge cold or smelt at once.
  - **NPCs die of the world**: Abel Thorne (hypothermia, every run) and a
    brickfield gang member (starvation) — content, not this build.

**Runs 30–31** (run 31: D 21/23 · A 12/20 · B 3/6 · C 3/21 — each file now
runs to its end, so the counts are honest cascades):
- **The drive ORDER sets the season.** A runs through a winter (5b needs a
  frost), and B and C began wherever A left the year. Their wet ware burst
  on the unheated shop floor, and the liner (at the open-sided smelter)
  and the potter died of hypothermia. Every later checkpoint was a shade's
  "your hand passes through it". The harness's `toWarmSeason()` now
  brings B and C to late spring as lived time. The game is right: a potter
  makes in the warm months, or heats the shop.
- **A shade died of hypothermia twelve times** (aadd8e494): a body that
  runs no living processes drifts with the air, and the thermal cascade
  still raised hypothermia on it. The death that followed divided the
  identity again. The cascade now draws metabolism's line
  (`isLivingBody()`).
- **`look` names a glow in the dark** (a246fb762): the clamp's 120 lm
  reaches the hacks too faintly to see BY, and "at night it glows from the
  next place" was unreachable. In the dark, `look` names the strongest
  light SOURCE the walk attributes, by colour temperature and direction.
- **A handed ore lump smelts to slag**: the row authors grade 0 and `hew`
  stamps the face's figure. `test-hand` takes a `data` overlay
  (5352bfdf0), and B hands its ore at Ferrow's grade. The crucible never
  wore because no metal ever ran into it.
- **Drive defects:** `put bricks in clamp` binds one stack (A now sets
  each); A's 5b follows the fresh bricks to the hacks; the fat batch's
  crack is logged, not asserted (a slow season dries it whole, and the
  rule is pinned by the unit test); D locks then unlocks the door after a
  restart (a hard kill loses the door's state); the test routes retry
  once on a reset socket (D 29b).
- **Finding, not fixed:** `get crucible from furnace` binds the furnace
  as well as the crucible (it strains at the furnace, then takes the
  crucible).

**Run 32** (D 23/23 — the first clean pass · A 12/20 · B and C never
started):
- **The world wedged on its own standings recompute** (d9af1e1cd). The
  consumer, producer and renown recomputes are real-time recurring fires
  that do not wait on the pass they start, and a pass is a find and a save
  per subject. On a slow link the passes stacked and held all ten of the
  Mongo pool's connections, with 55 operations queued behind them. Every
  test-login waited past undici's five-minute header timeout, so B and C
  skipped every checkpoint, twice. Found by reading the live
  `ConnectionPool` through the inspector, then wrapping the driver's
  `Connection.command`: about 1,900 participation finds and as many
  updates in forty seconds. A fire that finds a pass running is now
  skipped. The per-subject find is a recorded finding, not fixed.
- **The gang carted off the player's drying bricks** (2c1cacfad). A stack
  bears no title, so nine bricks set out on a hack carried no stamp, and
  the setter took them to its clamp once bone-dry. A then read "no
  bricks", which is also run 29's mystery. The brickfield brains now read
  a crafted good's maker, and two makers' bricks no longer merge.
- **The glow by moonlight** (40e38bcc7, then 402d15785): the hacks read
  `very-dim`, not `pitch-black`. The vision walk's three strongest
  sources were all sky, so the clamp next door was never in the list.
  `VisionModality.brightestFireNear` reads the emitters themselves, here
  and beyond an open obvious exit.
- **5b struck its brick in spring** (f57496176): the winter pass ends
  when the heap reads frost-broken, which can already be spring. 5b goes
  on to early winter (`toSeasonDay`); step 3 returns to late spring.
- **The harness login** retries on a header timeout (d7cdaac41).

**The live browser walk (2026-10-26)** — the client on Vite against a fresh
test-mode world, as one player (`walker-potter`): dig, temper, mould,
hack, the clamp at night, the wheel, ring, name. It found eight things
the wire drives could not see, because they read prose:
- **`look clay` looked at the PIT** (b47f70382, af9cf8652). Two causes,
  both fixed. Every word in the room's name tied with the lumps on its
  floor. And `look`'s `['$focus', 'reachable']` stopped at the default
  focus `here`, which is the room and its features WITHOUT its contents,
  so the lumps were never compared. A `here` try is now dropped when
  `reachable` follows it, and an exact keyword or name (70+) cuts a mere
  name word.
- **"The day is done. something stand turned out on the pallet"**: a
  moulding day ends after dark, and the maker's own line used the
  perceptual name. Named as the maker knows it now (table and wheel).
- **"Somebody starts stripping the face"** in full daylight: the
  `Workable` plans' onlooker lines were hard strings (quarrying's face,
  the hive, the cheese wheel). They name the worker now.
- **The clamp's smoke carried nowhere** (edf2f3fcd, c2240c086). Nothing
  emitted it, although the clamp's own docstring said it did. A lit clamp
  is a smell source now ("You smell coal smoke — from a brick clamp" at
  the hacks), and `smell <a smell source>` answers with the odor instead
  of reciting its look.
- **`ring` echoed to its ringer** ("You tap a mug" and "a human taps a
  mug"): `Scene.toAudible` did not skip the actor as `peers` does. `call`
  had it too.
- ✅ Confirmed live: the glow by night ("You can see a dull red glow to the
  east"), my bricks left alone overnight by the gang, the novice's
  beginner's-wall mug, `name`, the temper pit's card listing its lump.
- **Findings, not fixed here:**
  - What another person HOLDS reads as "something" ("a moulder picks up
    something"). `canSee` reads a held thing by the light inside its
    holder. Fixing it means deciding what others' inventories show, which
    is a perception-policy question.
  - `smell`/`listen` in a place with no channel-tagged prose recite the
    room's VISUAL description: untagged prose passes the sense filter.
  - The potter's shop reads "warm from the kiln", but its air is the
    night's. Green ware froze on its boards in early spring, the same
    thing drive C hit in run 31. The shop needs a heat of its own, or the
    prose is wrong.
  - `focus clear` sets a focus literally named "clear".
  - `analyze light` and `look` disagree at night ("barely enough to move
    by" against "pitch dark").
  - NPCs moved by the roster tick "vanish" and "appear out of nowhere"
    across a clock jump.
- **Fixed after the walk — the potter's shop is warm by its causes**
  (545a9fae1): `extent: 6` (it had the field's 20 m cell, an 8000 m³
  barn), a 4 kW drying stove the potter keeps fed (`stokes`, now told
  which fire and what fuel), and weighted doors that swing shut behind
  you (`Door.closesBehind`, new). Shut, the 6 m brick shop loses about
  360 W/K, so the stove holds it about 11 K above the night: a spring
  frost no longer reaches the boards. `_temperature` was not an option;
  it is the decree the envelope build retired, and its list is a ratchet.
  `lint:location-graph` now walks the far side a `bidirectional` exit
  installs.

**Run 34** (D 23/23 · A 11/20 · B 5/6 · C 5/21; the walk's fixes loaded,
the shop's warmth not yet). The world's fixes held: A's bricks dried with
the gang leaving them be; B's firebricks no longer froze and the
glasshouse keeper relined the kiln unattended for the first time; B and C
started clean. Nearly every failure was the drives' own, each fixed:
- **A:** 5b's move to winter in 4 h lived steps (about 2 game days a
  minute) outran its hour, and its orphaned loop moved the clock under
  3 and 7 ("the clock is paused"). A now starts in early winter, reached
  in setup with day-long jumps (`advanceLiving` with no drive body
  open), and 5b runs before the winter pass. Steps 8 and 9 fetch the
  day's bricks by daylight.
- **B:** 13's first GRADED smelt reached the heat gate: the half-relined
  furnace held 1258 K against copper's 1358 K. Step 12 relines it whole.
- **C:**
  - The handle firms on the board, since a handle in the hand never
    dries.
  - The fresh handle is looked for in the thrower's hands.
  - Each potter takes ONE set of cones.
  - Steps 18–25 start by daylight; the glaze ran at night, and a named
    crock in hand could not be bound.
  - 21 follows its filled jar by identity.
  - Every founder `eval` is gone: it holds no authority over the
    brickfield. The setup liquids (fouled and tainted water, vinegar,
    boiling water) are handed in pre-filled pails through the test-hand
    data overlay.
  - `get charcoal` took every basket, and the potter could not lift a
    bowl. Each takes one.

**Run 35** (D 23/23 · A lost to seasons · B 5/6 · C 5/21 on its old copy).
Drive defects, all fixed:
- **A:** the year now starts in late autumn (day 230–260). In early winter
  the rain fell as snow, so 5a never got its rain, and the brickmaker froze
  on the open yard. 5b walks on into early winter and knows its fresh
  stack by its new id; a frost may burst it before the morning read. The
  winter pass re-homes and reads by day.
- **B:** 13 pours the crucible straight off the smelt. Doused and left,
  the copper froze, dropped out of the crucible (a crucible is no mould)
  as a lump in the furnace, and the next charge was ore and metal
  together.
- **C:** each fix below is a drive fix:
  - 16 finds the potter's own handle on the boards (by "Made by").
  - 18 hands its own lead pig (the NPC potter used the shop's) and names
    the two crocks by id.
  - 18b loads its own ware before opening the kiln hot.
  - 21 finds the filled jar by bulk material.
  - 22 hands a filter when the stall's one is sold.
  - 23 looks for the bowls in hand and hands the tinker the piece the hot
    kiln cracked.
  - 24 finds each mug by its maker.
- **Harness:** a clock jump asked for while another is settling waits it
  out ("the clock is paused" after a drive was stopped mid-jump), and
  `test-nourish` also warms a chilled body (the off-camera hours are
  spent by a fire; the work's heat is left alone).
- **Game defects the drives found:**
  - **The mug had no handle line** although its prose promised "a seat
    for a handle" (d9d6f325a).
  - **Cones were read by `awareness`**, so the practised potter read the
    spy-hole exactly as the novice did. A tool may now name its craft
    (`Tooled.getDiscipline`), and the cones name `pottery` (ca6e84086).
  - **`get "plant pot" from kiln` was a parser error**: a quoted name
    inside a longer object span kept its quotes on the way to MQL
    (42f69c4fd). This is the recorded two-word-name finding, now fixed.

**Run 36** (D 23/23 · A 12/20 · B 5/6 · C 8/21). D is clean for the fifth
run running. Most of what A and C lost was one drive defect seen many
times: a **bare word binds whichever like thing comes first**. Once a
drive character's hands and the shed fill up, `get bricks`,
`analyze clay lump`, `pour pail` and `drop crock` each took a stack the
step never meant. A and C now follow their own pieces by id: A uses
`stackAfter` (a new id, or a stack that grew, since a fresh stack can
merge into a like one) and C uses `freshIn`.
- **A:**
  - 3 tempers the weathered lumps by id; a stray raw lump read FAT.
  - 5b, 4, 6, 7 and 8 follow the day's bricks by id. 7 confirms the
    clamp is charged from what the setter said: a clamp is dark inside,
    so `clamp:i` lists nothing.
  - 9b quotes `at "old table"`. It failed the same way in every run from
    15 to 36: an object argument binds ONE word, so "old" bound the table
    and "table into brick" went to the form. 9b also puts the
    brickmaker's load down first, because a laden brickmaker strained at
    a fresh lump and lifted nothing.
- **B:**
  - 13 relines between melts (`relineWhole`, shared with 12). The fifth
    melt was refused too cold at 1309 K against 1358 K, because the melts
    wear the lining too.
  - 13 pours five minutes after the two-minute run. Two hours later the
    fire was out and the copper had set: "nothing to pour".
- **C:**
  - 16b takes 16's trimmed mug by id; 16 had set it down.
  - 17 bisques only when every piece of the potter's reads bone-dry.
  - 18 glazes only sound crocks.
  - 18b rings its pieces by id; the eye cannot see a dunt in bisque by
    design.
  - 19, 22 and 23 pour handed pails by id.
  - 22 hands a crock when the stall is out.
  - 20 and 23 follow their pieces by id and maker.
  - 23's tinker takes a piece the ear found.
- **Game defects the drives found, fixed:**
  - **`get X from Y` had no `from`.** "from kiln" was two more words to
    match, so every such `get` also tried to lift the container ("an
    updraft kiln is fixed in place"), and `get "plant pot" from kiln`
    took the potter's stamp. `get` now has a trailing greedy `source`,
    and the controller narrows to what is in or on it (ef56d045b).
    42f69c4fd had made that sentence bind without making it right.
  - **A steam burst read as frost.** A damp crock in the bisque kiln
    read "It froze wet, and the frost has burst it apart". Greenware now
    records the cause (`greenBurstBy`) (5584df326).
  - **Grog could not be made.** `grind sherds` threw: the grog row named
    quarrying's `Lump`, which has no maker. Grog is its own `Crafted`
    class (08ace31c5).
  - **`buy small plant pot`**: the shelf showed the name and the row did
    not answer to it (0ec1cca33).
- **Open findings, not fixed in this build:**
  - **Recipe outputs that cannot be stamped.** A census of tangible
    recipe outputs found six whose class does not compose `Crafted`, the
    same throw as grog's whenever one is made:
    - four `Ingot` rows in trade-smelting (`cast-bar`, `carburize-steel`,
      `cast-pig-iron`, `smelt-copper`);
    - drilling's `liner` (`Good`);
    - ceramics' `case-half` (`Thing`).

    The fix belongs to those trades. ⭐ It wants a gate (a tangible
    output's class composes `Crafted`) rather than six patches.
  - **A hot-opened jar read 599.6 K a week later** (C 21). A probe on the
    same world after the run read 297 K, so it is not reproduced; record
    it, and watch 21 next run.
  - **An argument that declares `into` takes leftover words without
    it**, so 9b's refusal named a nonsense form ("table into brick")
    instead of saying the table was not found.

**Run 37** (D 23/23 · A 13/20 · B 5/6 · C 10/21), the first run on sugar's
master (merge 85314c1df). D is clean for the sixth run running. This run's
findings were mostly game defects, and each now has a unit test:
- **Clay lost mass when lumps pooled.** Two fresh 12 kg lumps picked up
  onto two 0.9 kg remnants became four 0.9 kg lumps, and 22 kg of clay
  was gone. The moulding day then found 3.6 kg against a 3.9 kg brick and
  minted nothing: A 5b and A 8, in two runs. `Clay.onMerged` now keeps the
  total mass and weights weathering and temper by mass, and `onSplit`
  keeps the heap's lump size (72590897e). A probe at the shed proved the
  table itself works.
- **A fired brick was still "green brick", and bodies stacked.** The
  clamp's three grades folded into one stack in hand. Fired bricks are
  named for their body, and a stack keeps one material (789cf9f33).
- **Nothing described a coat.** A glazed crock read as a bare one, and
  run 36 had passed only because "froze wet" matched /wet/. Faced now
  says wet, glazed, crazed, run or crawled (38bd52f6b).
- **A weeping jar read "thoroughly dried"** while the cooling treated its
  outside as wet. There is now one `weeps()` rule on Faced, read by both
  (1d8234b95).
- **A crock looked into showed nothing its filter dripped.** The seep was
  integrated only on the filter's read. A vessel now brings its seepers
  current first (load on use, b2c619143).
- **An import read as nothing.** It now says "It is fired earthenware"
  (723af5bcd).
- **⭐ The tinker could not rivet**, though the requirements promise it
  ("gains riveting a broken pot", AC 1131). Mending read only condition.
  A crack rung (`mendCracks`) rivets a crack or a dunt with a mending kit,
  and the staples show. **No look line read flaws at all**, so a visibly
  cracked bowl read as sound; Tangible now describes them (61277a4fe).
- **Drive fixes:**
  - **A:**
    - `act` records how its engagement ended;
    - 3 analyzes `clay #id`;
    - 8 and 9a start at the clamp ground.
  - **B:** 13 pours the furnace's own crucible by id. The melts now all
    run (the reline fix held), but the crucible read only "worn" after
    ten.
  - **C:**
    - 16b firms the handle before joining: a soft handle will not join,
      by design;
    - 18b loads only the ware it names (a crock answers to "pot");
    - 20b spills;
    - 23 takes a dunted second bowl;
    - 25a judges the consign by the buyer's pot.
- **Findings, not fixed here:**
  - "pour out X" reads "out" as the thing to pour; a player will type it.
  - A moulding day that has too little clay refuses at the END of eight
    hours, not at the start.
  - Stackables whose per-unit mass varies (ore, bricks) may share clay's
    merge flaw. Only clay's is fixed.

**Run 38** (D 22/23 · A 17/20 · B 3/6 · C 12/21). A is the best it has
been: kneading, the blue brick and both statute measures passed. C's
glaze, its lead leach and its wet-handle joint passed for the first
time.
- **D, a regression of mine:** b2c619143's seep reconcile read a salt
  pan's contents across the founder's sandbox boundary. Seepers are now
  narrowed to Faced vessels, and a denied read is skipped (04bedc216).
- **⭐ Game defects, fixed:**
  - **A clamp set its positions only at `fire`.** Lit at noon and fired
    at dusk, every brick sat "in the middle" for hours and burnt to one
    earthenware. Lighting a burner now starts its firing (`ignite` calls
    `onFireStart`), and the clamp sets each brick once (bdb3832ac).
  - **A rivet quoted 0 zorkmids.** It is now one repair's work
    (bd1401d02).
- **Drive fixes:**
  - **A:** 5b moulds a fresh handed lump. The brickmaker's remnants were
    smaller than a brick, and the day says so only at its END (a recorded
    finding).
  - **B:** 12 buys by daylight. In the dark store every buy read
    "something" and the firebricks went unseen in hand, which also sank
    13 (lining never relined) and 14 (no coal liftable).
  - **C:**
    - 21 weeps a bisque terracotta jar, chosen by its look;
    - 22 reads the crock's look and its chemistry (`bulkMaterial` is the
      vessel's own BODY, never its contents);
    - 20b pours into a cold glazed mug, per AC 1120 and the rule's own
      unit test (porous terracotta stands the step);
    - 23 answers the tinker's quote while the order is pending, and takes
      a bought bowl for the earth floor when it has only one of its own;
    - 24 falls back to 15's reading of the novice's mug;
    - 25 names the potter's stall.

**Run 39** (D 22/23 · A 18/20 · B 4/6 · C 14/21). Passing for the first
time:
- the clamp's three grades by position (clinker, earthenware,
  terracotta);
- A 5b's frost burst;
- the tinker riveting a cracked bowl, and the mend showing;
- the cold glazed mug cracking under boiling water;
- the shelf.

Fixed this round:
- **D:** the seeper gather read the world placement catalogue from inside
  the founder's jurisdiction-bound eval. The gather sits in the same
  SecurityError guard now (8be5b2fbb).
- **⭐ Game defects:**
  - **"firebrick" renamed "refractory fireclay brick".** 789cf9f33 renamed
    every fired brick, and B found no firebrick in hand. Only a stem that
    says green is renamed (3251234e0).
  - **The shed's bricks fired 6 % over statute.** The row was 3.6 kg against
    the statute brick's 2.99, and the measure derives size from mass. The
    row now holds the statute's fired mass (5457cd934).
  - **`ring earthenware brick` was "no known command shape".** ring's one
    object arg is greedy now (bfbab9e16).
  - **⭐ Nothing could report what a vessel holds.** `analyze chemistry`
    read the vessel's body only, so C 19's "it carries lead" passed on
    the crock's NAME ("leadpot"). The reading adds the contents and
    anything dissolved in them. The crock under a filter still looked
    empty because the contents line reads the material PATH first; that
    read brings the seepers current now (335a19860).
  - **A potter's plant pot never said who made it.** It renders its
    verdict now (1ee14c9b6).
  - **A piece the fire never turned read "fired alluvial clay".** It now
    says it is still clay (fa42c4c6a).
- **C drive fixes:**
  - 18 unloads the glost kiln by daylight;
  - 21 hands a terracotta jar when none was bisqued;
  - 23 empties the kiln of mugs before looking for the novice's;
  - 25 drops a quoted look MQL cannot parse (an apostrophe inside
    quotes).

**Run 40** (D 22/23 · ⭐ A 20/20 · ⭐ B 6/6 · C 16/21). A and B are green for
the first time: the statute brick reads true, and the crucible wears and
cracks across the melts.
- **⭐ D 32, found at last:** a live probe put the denied call at
  `ContainmentLogic.placement`. The salt pan stands ON the hearth, and
  every placed body's reconcile reads the placement catalogue to find its
  air. The catalogue and its `Placement` rows are closed shared
  vocabulary, now `commons`; the ceiling rises 25 → 27 with that caller
  audit (2c9a0c234). The Bulkable guards stay for genuine out-of-reach
  seepers.
- **⭐ The filter's crock stayed empty:** the face exchange's clock opened
  on the vessel's FIRST READ, so a filter nobody looked at had passed
  nothing. The clock now starts when the interior fills (a113c2166).
- **C:**
  - 21's handed jar cracked over the six hours. It runs in the warm
    season now, and records the jar right after the fill.
  - 23 drops the THIN bowl on stone; a sound but thick one held, and 23b's
    grind and 20a's grogged pot fell with it.
- **Polish:** a thing standing in a bare vessel reads "There is a water
  filter in it.", not "It is with a water filter."

**Run 41** (D 22/23 · ⭐ A 20/20 · ⭐ B 6/6 · C 11/21). A and B stay green.
- **D 32:** the fill passes now, but `fire hearth for 12 hours` timed out at
  30 s. Re-sent to the standing world, it answered in 57 ms. The cause is
  unexplained; profile it if it repeats.
- **C 21 timed out at 30 minutes.** It moved the season with a session
  open, so each lived step was 4 hours, not 24. The test kept running after
  its timeout and left the clock paused, which failed 22, 23c, 20a, 24 and
  25 on "the clock is paused". 21 now moves the season with nobody in the
  world (a7e53ca95).
- **C 23:** the dropped "thin" bowl was unfired ("still alluvial clay"), so
  it was not brittle and held on stone. 23 now drops only a fired bowl
  (39c73a2e6). 23b's grind fell with it.
