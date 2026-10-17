> ✅ **Dairy has merged (`b18743d80`, 2026-10-17) and this plan was
> re-grounded against it (below).** W0–W6 may `/build`.
> ⏸ **W7 (building upkeep, D20–D27) is gated SEPARATELY on the rubber
> build reaching master** — see § W7 and § Risks 12. If it has not, W0–W6
> open the MR and W7 ships as its own follow-up MR. As of 2026-10-17
> `origin/reqs/rubber` is still docs only (8 files; see § W7 Gate).

> **Re-ground 2026-10-17** — what changed in SUBSTANCE on master since
> the assembly merge (`72fc1681e..b18743d80`, 267 files: the dairy build,
> the slate cleanup, the stewardship doc). Line shifts are fixed in place
> and not listed.
> 1. **The kernel MOULD system exists** (`lib/mould/Mould.ts`,
>    `platform/thing/Mould`, dairy's `Hoop`, `docs/subsystems/mould.md`).
>    D1's third read is now written against its real names (a cast
>    carries the mould's `maker` and grade already; it carries NO
>    discipline — the pour credits it and forgets — so the build stamps
>    one more value at the same place). D4 decides `Mould` is **not** a
>    family in this build (no recipe makes one); the moulding build adds
>    it with the two-piece mould. § Grounding gains *The mould system*.
> 2. **`StagedMixin` already composes on bodies**: Katie, Walter and the
>    Realtor are `CastMixin(StagedMixin(NPC))` in their packs, and
>    `Gus.ts`'s header names the kernel split that blocks a general
>    *person with a loadout* (`props:` is bundled with `cast:`). **D14 is
>    revised** to that shipped shape — a `Tinker` class in the terminus
>    pack, no kernel claim on every NPC; the split leaves as a seam.
> 3. **The `lint:bills` arm-8 census was wrong**: 17 bill-part templates
>    have no recipe today (not 5), and the plough's share is
>    `/trade/smithing/thing/plough-share`, which HAS one. D7 opens the
>    ceiling at 17 and drives it to 15. D7 also gains **arm 7d** — the
>    owner's rule made checkable (*a recipe output's class that wears
>    composes Assembled*), which is what caught `CookPot`: a cast pot with
>    a smithing recipe that is Durable and not Assembled. It joins D4's
>    families (a pack one-liner).
> 4. **`ToolMixin` does not bundle `Durable`** — the grounding's Durable
>    composer list was wrong (Sawmill, Still, Tap, GristMill… are not
>    Durable; `CookPot`, `Mould`, `Hoop` are). No decision changes; the
>    host-placement table's inherited list is corrected.
> 5. **Row counts moved**: `Vat` 16 (dairy's cheese vat, rennet jar and
>    starter crock are kernel `Vat` rows — D5/D6 reach them, vacuously),
>    `Tool` 67, `Receptacle` 18 (the pail is a `CraftVessel` now),
>    `Mould` 2. Rejection's smelter now props a **crucible and an ingot
>    mould** beside the furnace and anvil (dairy D19) — the tinker's stop
>    is unchanged. The valley gate gained two dairy exits.
> 6. **The anvil ladder's taken list** was partly wrong in § Grounding
>    (no `driver`; `shield-boss` is `poor`); D17's four new heats were
>    re-checked against the real list and are free.
> 7. The caller's *wiki-spoiler snapshot* exists after all —
>    `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` enumerates
>    every `fieldMeta` field with its reveal level and demands a
>    review-log entry per new field; every new field in this build
>    churns it (§ Convention conformance).
> 8. Slate cleanup: `clinical-medicine`, `assembly`, `trade-roster` and
>    `magic-items` slates now live under `docs/slates/tails/`; this plan's
>    one link (`repair-slate`) is unmoved. ⚠ The requirements doc links
>    `clinical-medicine-slate` under `builds/` — stale, listed in § Risks.

# Repair — assemblies, part two — implementation plan

Executes [repair-requirements](../requirements/repair-requirements.md)
(kind: **feature**, leads from **kernel**; first consumers the pick, the
axe and the sword; the Hearthworks smith; a tinker and a cobbler; one
heirloom). Seeded by [repair-slate](../slates/builds/repair-slate.md).
The build makes a mend depend on the hand (per part, in the trade that
made the part, derived never rolled), makes the paid mend somebody's
work, puts two menders in the world, folds the narrow `Assembled*` twins
back into their families (a monolith is a thing of one piece), carries a
part's own state — wear, edge, grade, mend history, name — in and out of
a whole, lets a name live in a part, and — reopened 2026-10-16 — makes a
building's upkeep cost the materials time took from it, layer by layer,
by the trade that laid each one (W7, D20–D27).

Waves: **W0** kernel parts model · **W1** the fold-back · **W2** the
mend + legibility · **W3** the paid service · **W4** the roster
timetable · **W5** content · **W6** the drive + docs · **W7** building
upkeep (gated on rubber; its own MR if rubber is late). Every wave lands
on its own commit; `pnpm test` runs once, before the MR.

---

## Grounding

Verified by opening the files, 2026-10-16; **re-verified against
`b18743d80` (master after dairy) on 2026-10-17** — every line number
below is the current tree's (paths under `packages/`).

### The mend today

- `server/src/mud/platform/idea/api/CraftingLogic.ts:3222 repairImpl` —
  maker = `ExecutionContextApi.getActingAuthor()` else
  `req.makerPath`; refuses a non-Durable; an Assembled item runs
  `repairAssemblyRungs` (`:3628`) first — failed part refused and named
  (below the joint's band, *"something about the staves"*), slack joints
  tightened under `jointGate` (`:3590`), a spent cask re-fired — then the
  wear rung: the WHOLE's material decides the gate (`hasTag('metal')` →
  `maker.reachableHeatK() ≥ crafting.repair.metalHeatK` 900 + an `anvil`
  in the gather; else a `mending` tool); cost `mass × deficit ×
  crafting.repair.costFactor` 0.6 (× `brokenFactor` 2); draws same-tag
  stock; `item.setCondition(1)`; `applyControlFloor` on the grade.
  ⚠ **No band is read on the wear path; no `captureHostOf` after.**
- `bandIn(who, discipline)` `:3580` (Advancing → `competenceBandFor`,
  else `CompetenceBand.FLOOR`); `RECOVERY_BY_BAND` `:3548`
  (0.5/0.7/0.85/0.95/1.05) is salvage's band table — the shape to copy.
- Types in `server/src/mud/api/crafting.ts`: `RepairRequest {item,
  makerPath?}` `:204`, `RepairDeclineReason` `:218`, `RepairSuccess
  {conditionBefore, costKg, rung?, named?}` `:236`. Statics `craft ·
  mintFromBuild · repair · salvage · fit · lookupRecipe · offeredRecipes ·
  canMake · blend*`.
- `server/src/mud/platform/idea/cmd/crafting/RepairController.ts` —
  checks `failedLines()` up front (refuses without engaging), then a
  6 s `engageStep` paced by the mending kit or anvil, completion in a
  module-private `completeRepair` → `CraftingApi.repair({item,
  makerPath})`. `repair.yaml` `requires: DurableMixin`.
- Dials in `content/platform/content/settings/crafting.yaml`
  (`crafting.brokenThreshold` 0.1, `crafting.keenness.*`,
  `crafting.repair.*`, `crafting.joint.slackThreshold` 0.5,
  `cask.dryOutDays`, `lamp.crackedGlassFlux`, `chair.bareFrameRest`).

### The parts model

- `server/src/mud/lib/craft/Assembled.ts` (907 lines). `BillPart {part,
  template, count, role, plural?, material?}` `:79`; `BillJoint` `:97`;
  `PartLine {part, template, count, role, material, form?, grade,
  condition, failed, green?, greenAt?, warped?, cupped?, makers[],
  parts?, joints?, plural?}` `:117` — **no keenness, no name, no mends,
  no recipe**. `JointState` `:155`. fieldMeta `:444`: `bill`
  authorable; `parts`/`joints`/`gauge`/`hands` `{persistent,
  runtimeState}` — a new line field persists free. `billLines()` `:596`
  reads a FOUND thing's lines at defaults (material from the bill or the
  whole; grade `fair`; condition 1; **no form**). `getParts()` `:516`
  answers `billLines()` while `parts` is empty; `getLine(part)` `:558`;
  `ensureParts()` `:589`
  materializes on the first mutating act. `wear(amount, channel)` `:869`
  → `lineGivingFirst`; `wearLine` `:689` fails a member at the broken
  dial; `getCondition()` `:825` = min(own, every line), 0 on a failed
  structural line; `setCondition()` `:841` sets every line;
  `replaceMembers()` `:725` sets the fitted line's condition to **1
  regardless of the part's own**; `restoreAll` `:799`;
  `assemblyAugmenter` `:311` (made of…, failed, slack, *the work of A
  and B*; registered at `static markupAugmenters` `:401`) — no condition
  word, no grade, no mend. `__validateComposition__` `:434`
  requires Durable. `commandContributions` `:410` `fit/repair/salvage` in
  `environment` + `peers`. (Unchanged by dairy — 907 lines.)
- `applyAssembledOutput` (`CraftingLogic.ts:2299`) — one line per
  recipe slot: template, material, weakest grade, mean condition,
  makers (the consumed part's `Crafted.maker`), form, green/cupped,
  nested record. **The consumed part's `Crafted.recipe` is not copied.**
  Bill parts no slot supplied read at defaults. With no bill and < 2
  slots: a one-slot craft of an assembly carries the record across;
  otherwise no record.
- `fitImpl` `:3716` — raise arm gates the bill's joints then
  `craftImpl`; replace arm matches a line by row lineage or keyword,
  reads the part's material/grade/form/green/cupped/nested, **drops its
  condition and keenness**, mints a sound count-1 member back
  (`mintMember`), `replaceMembers`, whole's grade = worst line,
  `captureHostOf(whole)`.
- `mintMember` `:3857` — clones `line.template` with `madeFrom`, sets
  material, grade (−1 if `gradeDown`), **condition** (if Durable),
  form, nested record, quantity. Not keenness, not a name, not mends.
- `salvageByJoints` `:3894` reads `RECOVERY_BY_BAND` per joint.
- `server/scripts/check-bills.ts` — arms 1–7; **arm 7 (`:219–240`) is
  `bill ⇔ composes AssembledMixin`, both ways**, and its header forbids
  the mixin on a broad family. Helpers from `scripts/pack-roots.ts`:
  `inheritanceIndex`, `effectiveRow`, `composesMixin`, `packSources`.
- `isAssembled` callers (all empty-safe when `getParts()` is `[]`):
  `RepairController:55`, `FitController:88,156` (`wholeFor` → no lines →
  null), `CraftingLogic:2304,2314,2365,3088,3245,3411,3757,3812,3881`,
  `ConditionLogic:1201,1260`, `Assembled.ts:312`,
  `trade-coopering/src/idea/reading/CapacityReading.ts:99`,
  `trade-farming/src/idea/cmd/farming/PloughController.ts:88`. `fit`
  on an empty record refuses `no-line`. (Recounted 2026-10-17: the same
  seventeen sites; dairy added none.)

### Keen, Durable, Constructed, Tool

- `server/src/mud/lib/material/Keen.ts` — `keenness` persistent (default
  1), bands keen ≥ .85 / serviceable ≥ .55 / dulled ≥ .25 / blunted,
  `dull()`, `hone()` → 1, `keennessDeliveryFactor()`. Composed **only
  on `Weapon`** (`platform/thing/equipment/Weapon.ts:78`:
  `Wieldable(Slottable(Keen(Crafted(Durable(Constructed(Good))))))`).
  Readers: `CombatLogic:2301,2355` (edge/point only),
  `ResponseReading:135` (`!armor && isKeen` — prints *edge* for a mace
  too), `WeaponReading:99` (edge/point only), `SharpenController`.
- `server/src/mud/lib/material/Durable.ts` — `condition` (`:77`),
  `wear` (`:95`, `WEAR_PER_USE` 0.01 `:48`), `isBroken`; **no augmenter,
  no history**. ⚠ **`ToolMixin` does NOT bundle Durable** (`lib/craft/
  Tooled.ts:14`: *at the use site, never bundled here*) — so the
  composer list is exactly the `DurableMixin(` sites: kernel `Tool`
  (`:53`, hence every `extends Tool`), `Weapon`, `Garment`, `Shield`,
  `Assembly`, `Barrel`, `Cask`, `Lantern`, `AssembledChair`,
  **`Mould`** (dairy); packs `arcana/Conduit`, apiculture
  `Frame`/`Smoker` (both already Assembled), cooking `CookPot`
  (`ManualBuild(ToolMixin(Durable(ServingVessel)))` — a **recipe output**,
  Durable, NOT Assembled), dairying `Hoop`. `Sawmill`, `Still`, `Tap`,
  `GristMill`, `WateringCan`, `CocktailShaker` are `ToolMixin` composers
  with **no** Durable (nothing wears them; `repair` does not afford).
- `server/src/mud/platform/thing/Tool.ts:53` =
  `Crafted(ToolMixin(Durable(Good)))` — **no Constructed, no Keen**.
  `extends Tool` today: kernel `Spade`, `LoadDevice`, `MendingTool`;
  packs `SurveyInstrument`, `AssayKit`, `AssayBench`, `TimberSet`
  (mining), `SpinningTool`, `Loom`, `ScutchingBoard` (textiles),
  `Whetstone`, `Anvil` (smithing), `Rod`, fishing `Trap`, `KitchenTool`,
  `SutureKit`, `Bailer`, `Derrick`, `GrozingPliers`, `Blowpipe`,
  `ScribingWheel`, `Strainer`, `Muddler`, `HouseholdersKit`, `SoilKit`,
  `CuttingTool` (tailoring). (`Whetstone`/`SutureKit` are
  `AudibleMixin(Tool)`, `Blowpipe` `ContainerMixin(Tool)`, the fishing
  `Trap` `Bulkable(Container(Tool))` — mixin statics union through.)
- `lib/material/Construction.ts` — `WEAPON_DELIVERY_FORMS = bladed ·
  pointed · hafted · flail · whip · blunted` (`:100`); `bladed` delivers
  edge primary; `isWeapon()` = a delivery form; `STOCK_FORMS` `:127`.
  `Timber` (`platform/thing/Timber.ts`) =
  `Seasoning(Stackable(Constructed(Crafted(Good))))` — **not Durable**,
  so a loose haft cannot be worn today; `constructionForm` is a
  `stackIdentity` field (the restatement precedent).
- `content/trade-smithing/src/idea/cmd/crafting/SharpenController.ts:57–72`
  refuses unless `isConstructed && construction.isWeapon() && isKeen &&
  primaryChannel ∈ {edge, point}`; needs a carried `whetstone`
  capability; `hone()` to 1. `sharpen.yaml` arg `requires: KeenMixin`.
- `Tooled.hasCapability` goes dark when broken (`lib/craft/Tooled.ts:111`).

### The narrow twins and their rows (direct `class:` counts)

`AssembledTool` 7 (drawknife, froe, croze, inshave, plough, felling-axe,
pick) · `AssembledChair` 2 (armchair, bed) · `Cask` 5 (cask, dry-cask,
brewing/cask, distilling/cask, charred-cask) · `Lantern` 1 ·
`AssembledWeapon` 4 (flail, mace, spear, warhammer) · `AssembledLauncher`
1 (hunting-bow) · `AssembledGarment` 1 (leather-boots) · `Assembly` 5
(bellows, frame, cask-head, cushion, mattress) · pack
`AssembledSurveyInstrument` 1 (compass; `SurveyInstrument extends Tool`,
restates `commandContributions`) · `AssembledSpinningTool` 1
(drop-spindle; `SpinningTool extends Tool`) · `Barrel` 1 · `Shield` 1.
Families (recounted 2026-10-17): `Tool` 67 rows, `Garment` 21,
`Receptacle` 18 (`Thermal(Bulkable(Good))`, no Durable/Crafted;
`WateringCan` extends it; the commons **pail is a `CraftVessel`** since
dairy), `Vat` 16 (`VesselKind(Maturing(Crafted(Sealable(Thermal(Bulkable
(Good))))))`, no Durable — dairy added three kernel-`Vat` rows:
`/trade/dairying/thing/{cheese-vat, rennet-jar, starter-crock}`; the
rest are brewing/winemaking/distilling vats, culture jars, the carboy,
the honey jar, the sap pan, the salt pan and the malting floor),
`Weapon` 7 plain, `Lamp` 3
(`Burner(LightSource(Bulkable(Thermal(Good))))`, no Durable/Crafted),
`Chair` 3 (`Postured(Slotted(Good))`, no Durable/Crafted), `Launcher` 1
(musket), **`Mould` 2** (`ice-pan`, `ingot-mould` — see *The mould
system*). The twins' exact chains, for the fold-back: `Cask` =
`Assembled(Durable(Vat))`; `Lantern` =
`Assembled(Crafted(Durable(Lamp)))`; `AssembledChair` =
`Assembled(Crafted(Durable(Chair)))`; `AssembledTool` =
`Assembled(Tool)`; `AssembledWeapon` = `Assembled(Weapon)`; `Assembly` =
`Assembled(Crafted(Durable(Good)))`; `Barrel` =
`Assembled(Durable(Crafted(Sealable(Container(Good)))))`; `Shield` =
`Wieldable(Slottable(Assembled(Crafted(Durable(Constructed(Good))))))`.
`Cask.ts` carries `emptySince` + `reconcileDrying` +
`getClosure` (open while `leaks()`); `Lantern.ts` scales flux by failed
facing panes; `AssembledChair.ts` scales `getRestQuality`. None of
these files changed in dairy.

### Recipes and disciplines

- `lib/craft/Recipe.ts:374 discipline`, `getDiscipline()` `:791`.
  `platform/idea/RecipeCatalogue.ts`: `getRecipe(id)`,
  `findByKeyword`, `allRecipes()` — **no output-row → recipe index**.
- Joint rows (`platform/idea/Joint.ts`) carry `competence {discipline,
  band} | null`; `wedged`/`friction`/`seated`/`glued` are hand joints
  (null), `riveted` is tool `striking` + smithing, `stitched` tool
  `mending` + tailoring, `pegged` carpentry novice.
- **Bill-part templates: 51 distinct, 34 with a recipe that makes
  them** (recomputed 2026-10-17 from every `{ part: …, template: … }`
  bill line against every `recipes/*.yaml` `outputTemplate`). ⚠ The
  plough's share is `/trade/smithing/thing/plough-share` and HAS a
  recipe (`forgeable×3 fair @1250`). **Without one (17):**
  `/stuff/thing/arms/nock`, `/trade/apiculture/thing/bellows`,
  `/trade/carpentry/thing/board`, `/trade/chandlery/thing/wick`,
  `/trade/glass/thing/pane`, `/trade/mining/thing/{compass-housing,
  compass-needle, compass-rose}`, `/trade/smithing/thing/canister`,
  **`/trade/tailoring/thing/boot-upper`**, `/trade/tailoring/thing/
  {cushion-cover, stuffing}`, `/trade/tanning/thing/bellows-gusset`,
  `/trade/tanning/thing/hide-face`, **`/trade/tanning/thing/sole`**,
  `/trade/textiles/thing/{bowstring, whorl}`. Sole and boot-upper are
  plain `Tool` rows (recipe dirs: tanning `packing`, `salt-hide`;
  tailoring `cushion`, `leather-boots`, `leather-jerkin`, `mattress`).
  Some of the 17 are made by a verb that is not a recipe (a pane by the
  glass bench, a board by the saw) — the arm cannot know that, which is
  why it is a ceiling and not a zero.
- Anvil recipes discriminate on the exact slot signature
  (`content/trade-smithing/src/__tests__/anvil-ladder.test.ts:68` —
  `category×count:minGrade… @heat`; `KNOWN_TIES` `:37` =
  `assay-kit+miners-dial`, `pick-head+tongs`). The taken list, computed
  2026-10-17 over smithing + mining + smelting (29 anvil recipes):
  `1:fair@` 800 smiths-hammer · 1100 pinch-bar · 1150 adze-blade ·
  **1200 pick-head + tongs** · 1250 froe-blade · 1300 table-knife ·
  1350 drawknife-blade · 1400 belt-knife · 1450 dagger; `1:good@1450`
  spear-head; `1:poor@` 700 fire-poker · 800 cook-pot · 1050 rivet ·
  1150 hoop · 1200 shield-boss; `2:fair@` 1150 warhammer-head · 1200
  axe-head · 1400 mace-head · **1450 sword**; `2:poor@` 700 barbell ·
  1250 flail-head; `3:fair@` 1100 mail-hauberk · 1250 plough-share;
  `4:fair@1350` breastplate; plus the `wood` two-slot ones (shovel,
  sledge, assay-kit, miners-dial). Dairy added no anvil recipe. The
  sword recipe (`trade-smithing/content/recipes/sword.yaml`)
  is one slot `forgeable×2 @1450`, hard, smithing; the row
  (`generic-objects/content/stuff/thing/arms/sword.yaml`) is a `Weapon`,
  `bladed`, `fine`, no bill.
- Edged tool rows: scythe (`trade-farming`, Tool, `mowing`, no recipe),
  billhook (`trade-forestry`, Tool, `cutting`; recipe is 2 slots
  `stock`+`handle` @1200 under **mining**), felling-axe
  (`AssembledTool`, bill axe-head + helve `wedged`; axe-head row is a
  smithing `Tool`, no form), adze-blade, drawknife-blade, froe-blade
  (smithing Tools), drawknife/froe (carpentry assembled), belt-knife /
  clasp-knife (Weapons, `bladed`). `axe-haft` is `Timber`.
- Disciplines shipped by pack: smithing/appraisal/blades… (platform),
  carpentry, coopering, tailoring, leatherwork (tanning), textiles,
  mining, silviculture… `appraisal` specializes `retail-sales`;
  **nothing in code reads it**.

### The mould system (dairy, on master since 2026-10-17)

- `server/src/mud/lib/mould/Mould.ts` (434 lines) — `MouldMixin`,
  `_mixinName 'MouldMixin'` (`Mixins.Mould`, `MixinApi.isMould`). Fields
  (fieldMeta): `castTemplate` `{persistent, authorable, ref:
  'identity:kind'}`, `reusable` (default true), `wearPerCast` (default
  `WEAR_PER_USE` 0.01, imported from `Durable.ts`), **`discipline`**
  (`authorable`; `getMouldDiscipline()` / `setDiscipline()`),
  `setProgress`/`setStamp`/`setPressed` (runtime state).
  `__validateComposition__` requires `Bulkable`, `Thermal`, `Container`
  — NOT Durable; Durable is read by probe (`castTemplateFor` casts the
  material's own lump while `isDurable(self) && isBroken()`; `castInto`
  wears a reusable Durable mould by `wearPerCast`, destructs a consumed
  one). `castInto(pool: SetPool)` is the one cast path (freeze from
  `Thermal.reconcileBulkPhase`, drain from `reconcileSetting()`):
  clones `castTemplateFor(material)`, stamps material/mass, then
  module-private **`carryPayload(cast, pool, mould)`** — `if
  isCrafted(cast)`: `setMaker(payload.maker || mould's Crafted.maker)`
  and, `if isGraded(mould)`, `cast.setGrade(mould.getGrade())`; then
  freshness, pathogens, water state, `madeFrom` by duck-probe. ⭐ **The
  cast records WHO and HOW WELL but not WHICH TRADE**: the discipline
  is credited to the pourer at the fill (`platform/idea/cmd/bulk/
  PourController.ts:130–146`: `isMould(target) && getMouldDiscipline()`
  → `giver.creditDeed({discipline, difficulty: 'standard'})`) and is
  then forgotten. No recipe is involved anywhere (`mould.md § No verb`).
  `mouldAugmenter` prints *filled · setting · set* on `look`.
- `platform/thing/Mould.ts` = `Mould(Durable(Crafted(Thermal(Bulkable
  (Container(Good))))))` — rows `generic-objects/…/vessel/ice-pan.yaml`
  (no discipline) and `trade-smelting/…/thing/ingot-mould.yaml`
  (`discipline: smelting`, `castTemplate: /trade/smelting/thing/ingot`,
  ceramic, 6 kg). `trade-dairying/src/thing/Hoop.ts` =
  `Placing(Mould(Durable(CraftVessel)))` — row `hoop.yaml`
  (`discipline: dairying`, `castTemplate: …/wheel`, beech, keywords
  `hoop · cheese hoop · mould · mold`). **No recipe outputs a `Mould`,
  a `Hoop` or an ice pan** (the smithing `hoop` recipe outputs the CASK
  hoop `/trade/smithing/thing/hoop`). Both compose Durable, so
  `repair` already affords on them and the shipped wear rung mends them
  by material (ceramic/wood → a `mending` tool).
- **What a cast IS today**: `/platform/thing/Ingot` =
  `Alloyed(ManualBuild(Meltable(Thermal(Good))))`, `/platform/thing/
  Casting` = `Alloyed(Meltable(Thermal(Good)))` — neither Crafted nor
  Durable, so `carryPayload` tells an ingot nothing (`mould.md`: *an
  ingot composes none of these*). The `Wheel` is `Ripening(Provision)`
  (Crafted via `Provision`). **No bill part in the realm is cast**, and
  no Durable thing is; D1's third read therefore has no content consumer
  in this build and is proven by a unit fixture.
- `Crafted.ts` fields: `maker` (`:122`), `recipe` (`:126`), `craftedAt`;
  fieldMeta `:113` (`{persistent, runtimeState}` both). `MadeFromHolding`
  (`Mould.ts`) is the duck-probed `getMadeFrom/setMadeFrom` pair
  `CraftingLogic.ts:1904–1912` now also copies across a transform.
- `docs/subsystems/mould.md` — *Reusable and consumed* says `repair`
  mends a mould; *Deferred* lists other moulded goods, dry/cure/bake as
  set processes, the consumed mould, the pool's payload onto a non-food
  cast. The moulding slate (`docs/slates/builds/moulding-slate.md § 0`,
  owner 2026-10-16) rules *this is its own build, after repair; repair
  takes one seam now — a cast part is mended under the discipline its
  mould credits* and (§ 7) *the two-piece mould is an assembly — cope
  and drag under a joint*.
- The `wiki-spoiler-fields` audit (`src/mud/__tests__/
  wiki-spoiler-fields.snapshot.test.ts` + `__snapshots__/*.snap`, 1,375
  lines) enumerates every `fieldMeta` field with its reveal level and
  its header carries a per-build review log (dairy's: *24 fields, and a
  relabel*). `DurableMixin.condition = 0` is at `:410`.

### The paid service

- `platform/idea/cmd/retail/OrderController.ts:207 doService` →
  `ensureOperatorAt(venuePath)` → `performService` repair arm
  (`:350–367`): `CraftingApi.repair({item})` — **no hand**: the acting
  author (the customer) is the maker; then `tariff.collect(key)`.
  Transfusion is the durative precedent (`:270–330`).
- `platform/thing/Tariff.ts` — `SERVICE_KINDS = repair · treatment ·
  burial · transfusion`, `services`, `labourIndexed`, `priceFor`
  override; `PricedOffer.collect(key, reason)`
  (`lib/commerce/PricedOffer.ts:114`) resolves the house **self-first**
  (`ensureOperatorAt(selfPath)`) then the container, settles
  credential → cash, appends `flowSplitsFor`, remits tax.
- Maker resolution: `presentFulfillers(giver, discipline?)`
  (`CraftingLogic.ts:311`: others in the room first, the asker last),
  `houseOf`, `resolveMaker` (`:351`: `canMake` per candidate →
  `ambiguous-house` → `house.callFor({patron, candidates})`).
  `Employed.isFulfilling(discipline?)` (`lib/employment/Employed.ts:426`)
  = on shift ∧ seat `fulfills` the discipline (any when undefined) ∧
  the house operates the ROOM's template path or the identity path of
  something IN the room.
- Confirm: `Interactive.promptConfirm(label, default)`
  (`platform/idea/Interactive.ts:373`) via `context.interactive`
  (optional; `WikiController:602`, `TransferController:134`). Wire:
  `Session.awaitPrompt()` / `answerPrompt(promptId, response)`
  (`wire/src/harness/session.ts:812,831`).
- Pay: `settleShiftWageImpl` (time basis, at off-shift);
  `EmploymentApi.settlePiecework(business, employeeKey, units)`
  (`EmploymentLogic.ts:1357`, requires the position's `compensation.basis:
  per-settlement`, which then accrues no shift wage);
  `flowSplitsFor`. `EmploymentApi` statics: `businessAt · operatorsAt ·
  noticesAt · ensureOperatorAt · settlePiecework · flowSplitsFor ·
  settleSale …`.
- Rows: Hearthworks `thing/smithy-tariff.yaml` (`prices: {repair: 5}`;
  business `idea/business.yaml`: smith `fulfills [smithing]`, `call:
  rota`, slot 6–19, `offstage`; Berta's dossier smithing expert,
  appraisal competent). Rejection
  `thing/mending-slate.yaml` (`repair: 7`, propped at
  `location/provisioning.yaml:42`; the storekeeper has no `fulfills`).
  Infirmary `infirmary/thing/tariff.yaml` (`treatment: 12`, `repair: 8`,
  `labourIndexed`).

### Legibility

- `Crafted.renderVerdict()` (`lib/craft/Crafted.ts:160`) rendered only
  by `GradedReceptacle` and `CraftVessel`; `Constructed`'s
  `responsePipsAugmenter` folds grade/condition into pips silently.
  **No condition-word function for goods.** Augmenters are
  `static markupAugmenters` on a class or mixin (`Visible.ts:174`,
  `Detailed.ts:301`, `Assembled.ts:401`, `Mould.ts`'s `mouldAugmenter`)
  and union through the chain.
- `lib/instrument/Reading.ts:641 bandOf(actor)`, `ceilingOf`, `lower`,
  `observe`, `bracketed` — the detail-not-access ladder; a channel is a
  row `<root>/idea/reading/<channel>` + a class extending `Reading`,
  warmed by `ReadingCatalogue` (`PumpReading` is the eye-rung-only
  exemplar).

### Naming and presentation

- `NameController` (`platform/idea/cmd/social/NameController.ts:61`)
  requires `isBonded && isNamed`; `name.yaml` arg `requires:
  BondedMixin`. `NamedMixin` (`lib/description/Named.ts`) carries
  honorific/surname/alternates + a subscribable field; **no Thing
  composes it**. `Stuff.identityPhrase` (`lib/stuff/Stuff.ts:422`):
  disguise → `isNamed && getName()` as a proper phrase → short
  description. `Perceptible.hasKeyword` matches the keyword list only.
  `Signpost` = `MarkedMixin(Thing)`, affords `read`
  (`lib/description/Marked.ts:153`, `peers` + `environment`).

### NPCs, rounds, presence

- `lib/behavior/patrols.ts` — one authored direction per beat,
  presence-gated by default (`Behaved.ts:438,589`: a brain declaring
  `presenceGated = false` is consulted unwatched; the beat is 20 s
  watched / 120 s unwatched; `WorldClockApi.DEFAULT_SCALE` 12 → 1 game
  hour ≈ 5 real minutes). `consigns` walks by `NavigationApi.routeBetween`
  + literal `go`; `hauls` runs a `Journey` on a lane.
- Presence is the roster tick's (`EmploymentLogic.ts:1655 tickBusiness`):
  per assignment, `roster.evaluate` → off→on `beginShift` +
  `moveForShift` (teleport to the slot's `station`, else the first
  operating **Location**, live only); on→off settle + `endShift` +
  teleport to the house's `offstage`. ⚠ **Two slots for one assignee
  at one business are evaluated independently** — a later slot's
  off-transition ends the one Employment, so a round as N slots is
  fragile by iteration order. `ensureOperatorAt(path)` →
  `bringHouseCurrent(house, force)` runs the same pass on an act, and
  at most once per game hour on a look; the house is **attached to the
  place by its own `operatingLocations`** (the location graph), so
  arriving anywhere a house operates stands it up.
- A `cast:` member spawns when its host room stands up; cast is
  conserved-live and reseeded on restore (`lib/stuff/Staged.ts`,
  `Persistable.reseedCast`). **`NPC` = `Costumed(Behaved(Character))`**
  (`lib/npc/NPC.ts:32`) — `costume:` accepts `Wearable` only, so a bare
  NPC row cannot author held kit. ⭐ **But a pack class can, and three
  do** (corrected 2026-10-17): `eternal-university/src/duncan-hall/agent/
  Katie.ts:38`, `terminus/src/mayfield-row/agent/Walter.ts:34` and
  `terminus/src/realty/agent/Realtor.ts:64` are all
  `CastMixin(StagedMixin(NPC))`, and their rows author `props:` (Katie's
  kit + master ring, `katie.yaml:28`). `platform/agent/Gus.ts:14–26`
  names this the *fourth receipt* and the honest fix — *a superclass
  meaning a person who boots with a loadout* — as **blocked on a kernel
  split: `StagedMixin` bundles `props:` WITH `cast:`, so composing it
  on a person claims that person contains a cast.** `StagedMixin`
  otherwise composes on `Pump`, `Well`, `GardenBed`, `PlantPot`,
  `FurnishableRoom`, `CartesianLocation`, the cold stores. The `props:`
  / `cast:` keys carry a `Behaved` gate both ways (a `Behaved` prop
  throws at hydrate). `lint:boot-entries` admits a content boot row
  whose reason cites `unobserved-economy-slate` (terminus
  `pack.yaml:104–134` has eleven such producer entries).
- `reachableHeatK()` (`lib/thermal/Thermal.ts:732` → `reachableHeatForImpl`
  `:1207`; `reachableHeatSource()` `:1188` is the burner itself) scans the
  maker's **container** for burners; the `Forge` row ships `lit: false`
  (`burnTemperatureK` 1300, bellows ×1.6) — the assembly drive stokes
  and lights it (`assembly.dirty.wire.test.ts:483`). The gather walk
  (`gatherMatter`, `CraftingLogic.ts:699`; its contract `:686–698`)
  reads the maker's **direct** inventory + the room + open room
  containers. Dairy's `heat` gained a placing arm (a Thermal,
  Containable, non-build vessel is set ON the lit `Placing` fire via
  `reachableHeatSource()`) — it reads the vat, not the maker; the
  fold-back must keep `Vat` Containable (it is a `Good`).
- Roads: wharfside `bank` → (west) valley-road towpath; `delight-road/ford`
  north → `wharfside/bank`, south → `milestone` → `drove` → `flats` →
  `crossroads` (north flats, west `rejection/kestrel-road/lower-climb`,
  south `hearts-delight/location/valley-gate`); `lower-climb` →
  `upper-climb` → `the-pass` → `tips` → `yard-gate` (northeast
  `rejection/location/pithead-yard`). Rejection's heat + anvil are at
  `rejection/location/smelter.yaml` (`/trade/smelting/thing/furnace`,
  `/trade/smithing/thing/anvil`, the smith's hammer, two charcoal; since
  dairy D19 also a `crucible` and an `ingot-mould` — the smelt pours
  molten metal into the mould, which is not this build's concern but IS
  in the room the tinker works in); the provisioning shed has none.
  `hearts-delight/location/valley-gate.yaml` gained `south` (the dairy
  yard) and `southwest` (the creamery) exits in dairy — the tinker's
  stop there is unchanged.
- Venue exemplar: `terminus/content/world/terminus/mayfield-row/tailor.yaml`
  (CartesianZone) · `tailor/location/shop.yaml` · `tailor/idea/outfit.yaml`
  (Business, `requires {discipline, band}`, `headcount 2`) ·
  `tailor/thing/counter.yaml` · `tailor/agent/tailor.yaml`; the street
  (`mayfield-row/street.yaml`) exits `avenue · house · realty · graves`
  (the tailor's shop exits to the street by `row`). Boots:
  `generic-objects/content/stuff/thing/armor/leather-boots.yaml` (bill
  upper×2 structural + sole×2 wear, `welting: stitched`); recipe
  `trade-tailoring/content/recipes/leather-boots.yaml` (tailoring,
  `mending`). General store counter stock lines
  (`general-store/counter.yaml:31–58,323`) sell torch, rations,
  clasp-knife, lantern, whetstone, boots, pick-haft; the pick is at
  `rejection/thing/store-counter.yaml:23`; **no billhook is SOLD
  anywhere** (one is propped at Rejection's `location/fuel-yard.yaml:47`
  — a starting condition, not a supply; the drive buys at the general
  store).
- Wire harness: `packages/wire/tests/assembly.dirty.wire.test.ts`
  (`say`, `examine` by projection, `inReach`, `cloneHere`, `newPlayer`
  via a 400-coin reserve override, `goTo`, `buy`, `untilRestocked`,
  `practise` = `practice <discipline> hard success`, `toDaylight`; the
  restart block `:638–676`); `advanceWorldClock` (`src/harness/world.ts:157`).

### Building upkeep (W7) — master today, and the rubber PLAN

- **The shell clock** — `content/residence/src/idea/HoldingWarren.ts`:
  `UPKEEP_TERMS` `:76`; `CONDITION_BANDS` `:83` (≥ .9 sound · .7
  weathered · .5 worn · .25 shabby · dilapidated); fieldMeta `:100–106`
  (`shellCondition`, `shellStamp` persistent; the class composes
  `PersistableMixin`); `reconcileShell()` `:550` — linear, `0.5 /
  (daysToWorn × 86 400)` per game-second off
  `residence.weather.daysToWorn` (`content/residence/content/settings/
  residence.yaml`, 45), stamp-forward, no scheduler; `conditionBand()`
  `:570`; `conditionCause()` `:579` (two fixed sentences);
  `restoreShell()` `:589`. `OuterWarren.conditionOf`
  (`lib/location/OuterWarren.ts:340–361`) reads both BY SHAPE for the
  ascent gate.
- **`survey`** — `platform/idea/cmd/perception/SurveyController.ts`:
  `HoldingShape` `:54` (duck-typed — the kernel never imports the pack),
  the holding lines `:121–128`; its suite
  (`__tests__/SurveyController.test.ts:314–315`) asserts no `%` and no
  `0.x` reaches the readout.
- **`maintain`** — `content/residence/content/system/residence/cmd/
  crafting/maintain.yaml`: one arg `kit`, `default:
  "me:i:[capability.upkeep]"`, `requires: [ToolMixin]` (declared, never
  hunted — `lint:instrument-args`); `src/idea/cmd/crafting/
  MaintainController.ts`: holding here → the bound kit
  `hasCapability('upkeep')` → already sound → `restoreShell()` +
  `wear(KIT_WEAR 0.08)`. **No materials, no discipline, no band.**
  `src/thing/HouseholdersKit.ts` = `extends Tool` +
  `commandContributions.environment: [maintain.yaml]`; row
  `thing/householders-kit.yaml` (`toolCapabilities: [{kind: upkeep}]`).
- **The `maintains` brain** — `src/behavior/maintains.ts`: `config
  {extent, batch 3}`; `holdingsUnder(extent)` via
  `NavigationApi.attachedTo/attachedWithin(extent, 'institution')` →
  `OuterWarren.holdings()` filtered by `holdingKey()` prefix; per
  holding below sound: `teleport(entryRoom)`, `forceCommand('maintain')`,
  back. Rows: `eternal-university/…/duncan-hall/agent/katie.yaml` (props
  the kit + the master ring; `extent: …/duncan-hall/dorms`),
  `terminus/…/mayfield-row/agent/walter.yaml` (`…/seznick-house`).
- ⚠ **Their employers are Organizations, not Businesses**:
  `duncan-hall/idea/college.yaml` (`/platform/idea/Organization`,
  `hall-manager`, wage 0, Katie on `rosterSlots`),
  `mayfield-row/idea/agency.yaml` (`agent`, Walter). No `banksAt`, no
  `parLines`, no `purchases` — **neither can buy anything today.**
  `BusinessMixin extends OrganizationMixin` (`platform/idea/
  Business.ts:145–160`).
- **The buying seam** — `Position.purchases` (`lib/employment/
  Position.ts:9,112`); `issueHouseCardImpl` (`EmploymentLogic.ts:571`)
  deals a non-Avatar `purchases` holder a `PaymentCard` on the house's
  account **from the roster tick** (`:1678`), so an authored-roster NPC
  gets one if the house `banksAt`. `lib/behavior/restocks.ts` is the
  shipped NPC buyer: `business.stockSheetFor(keeper)` → short lines by
  supplier → a `job post` carriage bounty per line (module-private
  `order`, house-funded, landing on a `bench`) → `unpackBench`; the
  keeper never travels (logistics D11). A `ParLine {category, unit,
  level, supplier, exemplar}` matches by `getCategory()` or a material
  TAG (the tailor's `outfit.yaml`).
- **The first homes** — `duncan-hall/idea/dorm-programme.yaml` (a
  one-room floorplan over `location/dormroom.yaml`, `institution-all`;
  one keyed instance per unit — *the dorm* is many holdings);
  `dormroom.yaml` is a plain Location, **no `enclosure:`**. Seznick:
  `seznick-house/unit-programme.yaml` (hall · main · bedroom · generic
  bathroom; `landlord-shell`), rooms `location/{hall,main,bedroom}.yaml`.
  Hinkley: `hinkley-hills/idea/house-programme.yaml` (`owner-all`; rooms
  `/world/terminus/hinkley-hills/lots/*`). Seven rows author
  `enclosure:` on master (smithy, woodshed, cold room, two fridges, two
  hives) — none in a holding.
- **Construction on master** — `lib/spatial/Enclosed.ts`:
  `EnclosureSpec {material?, thicknessM?}` (closed; `lint:envelope`
  clause (e)), `ResolvedEnclosure {kWmK, rhoKgM3, cJkgK, thicknessM,
  materialPath}`; `lib/biome/Atmospheric.ts:422` `enclosure
  {persistent, authorable}`, `getEnclosure()` `:510`,
  `resolveEnclosure()` `:1130`. ⚠ `AtmosphericMixin` composes on
  `ExitableVessel` and the apiculture `Hive`
  (`trade-apiculture/…/thick-hive.yaml` authors `enclosure:`) — **a
  Thing, a GOOD.**
- **`Material`** — `lib/material/Material.ts` fieldMeta `:873–953`
  (dairy added `castTemplate` `:924` and `drainSetting` `:925`, both
  `authorable`, plus `transforms`; +66 lines): `density`,
  `thermalConductivity`, `waterAbsorptionCapacity`, `hardness`,
  `seasoningDays` (`:911`, the precedent for a time constant on a
  Material), `tags`; **no weathering rate, no laying trade.** Rows: `rock/slate`, `rock/granite`, `wood/*`, `glass/glass`,
  `caustic/quicklime`; **no thatch, lime plaster, brick or sawdust**
  (brick is rubber's content pass; sawdust the ice build's). The
  library is a closed vocabulary (`race.md`). Discipline rows: the
  platform pack's `content/platform/idea/Discipline/*.yaml`, a trade's
  under `<pack>/content/trade/<x>/idea/Discipline/`; **no masonry, no
  thatching.** `GrammarApi.inWords(n)` (`api/grammar.ts:278`) is the
  number-to-words reader; `GRADE_BANDS` `lib/craft/Grade.ts:25`.
- **The two-clocks regression** — `content/residence/src/__tests__/
  HoldingWarren.test.ts:611` (a `Tool` in the hall, one game year,
  `reconcileShell()` → dilapidated, `tool.getCondition()` unchanged);
  `:366` the stamp-honest decline; `:528/:547` maintain restores /
  refuses without a kit.
- ⚠⚠ **The rubber build is a PLAN, not code** — re-checked 2026-10-17:
  `origin/reqs/rubber` at `a2e688ff1` (master-after-dairy merged in)
  still carries **8 docs files and no `packages/` change**; its latest
  commits re-plan its moulds onto dairy's system and add a BUILD GATE
  (`rubber-plan.md:22–35`) that waits on THIS plan and storage-and-ice
  settling, then asks repair to *confirm its plan does not put materials
  on `Structure`* — it does not (D20: the layers' state is the
  programme's, the materials the place's). `origin/reqs/storage-and-ice`
  (`5cf06785a`) is likewise docs only. The seams W7 plans against, **as
  rubber's plan defines them** (`git show
  origin/reqs/rubber:docs/plans/rubber-plan.md`): **D1** (`:388`) `roof:`
  as `enclosure:`'s sibling on the place, `none` legal; **D1a** (`:398`)
  each is one `{material, thicknessM}` or a LIST outermost first,
  `ResolvedEnclosure` a list of resolved layers — rubber names it *the
  seam a building's bill of goods would read (material × face area ×
  thickness)* and defers that to structures-slate (`:411`, deferred
  seams `:1578–1615`); **D2** (`:415`) the place owns every material
  (`AtmosphericMixin` gains `roof` + `roofDefaults()`; a `Structure`
  carries neither); **D3** storeys as relations on the structure; **D4**
  (`:466`) `lib/spatial/Exposure.ts`, `exposure()` per room — `top:
  'open' | 'roof' | 'ceiling'`, `roof: Face | null`, `walls: Face[]`,
  `Face {material, areaM2, exterior, neighbour?, exit?}`,
  `exteriorAreaM2()`; **D14** the census of interiors lacking
  `enclosure:` or `roof:` ratchets down. Rubber's W0 (`:1148`) lands the
  vocabulary + `Exposure`, its W7 the content pass (the works authors
  `enclosure: brick 0.23`, `roof: slate 0.01` — brick arrives with it).
  **Nothing in rubber weathers, wears or costs a layer.**

---

## Plan-level decisions

**D1 — A part's discipline is derived, in three reads, all load-on-use.**
`PartLine.recipe?` is copied from the consumed part's `Crafted.recipe`
at the mint and the fit; `RecipeCatalogue.recipeFor(outputTemplate)` is
a derived index (built in `warm()`, a `Map`, never a scan) read when a
line has no recipe — a found thing's lines, a stocked pick. ⭐ **The
third read is the mould's** (the moulding slate's one seam, owner
2026-10-16, written against the merged `lib/mould/Mould.ts`): a cast
part has no recipe, and today the cast remembers its maker and the
mould's grade but not the trade — the pour credits the pourer and
forgets. So **`CraftedMixin` gains one field, `castDiscipline: string`**
(`{persistent, runtimeState}`, `''` default; `getCastDiscipline()` /
`setCastDiscipline()`), written in exactly one place: `Mould.ts`'s
module-private `carryPayload`, in the existing `if
(MixinApi.isCrafted(cast))` block beside `setMaker` and `setGrade` —
`cast.setCastDiscipline(mould.getMouldDiscipline())` (⚠ the mould's own
`getMouldDiscipline()`, not the payload: the trade is the mould row's
fact, the maker the pourer's). A VALUE and not a mark pointing at the
mould row, because a consumed mould is destructed at the cast and a
kind-identity row has no live singleton to resolve — the same shape as
the grade, which also rides as a value. `PartLine.castDiscipline?` is
copied beside `recipe?` at the mint and the fit and written back by
`mintMember`. Discipline =
`getRecipe(line.recipe)?.discipline ?? recipeFor(line.template)?.discipline
?? line.castDiscipline ?? ''`; a monolith reads its own `Crafted` fields
the same way. No `discipline:` on the bill part (a third declaration of
one fact). ⚠ No shipped cast composes Crafted except the dairy `Wheel`
(a Provision, never mended), and no bill part is cast — the read's
content consumer is the moulding build's (a cast pommel, a two-piece
mould); here it is proven by a unit fixture (a Crafted+Durable test
class cast in a mould authoring `discipline: smelting` →
`disciplineOf` = `smelting`; `wheel` reads `dairying` for free).
A line with no discipline resolvable (a found stone, a part no recipe
makes) is mended **as if competent** — nothing can be known
better or worse about it (lens 1: no skill, no lesson); `lint:bills`
arm 8 (D7) is what makes that honest by naming every such part at
build time. Lens 1 decided: the trade that made it is the one fact the
world already holds.

**D2 — The per-line state is the loose part's own fields, and the
whole's line is the same state.** `PartLine` gains `keenness?`
(0..1), `name?` (the seat), `nameGrant?` (identity path), `mends?:
MendRecord[]`, `recipe?`, `castDiscipline?` (D1); `BillPart` gains `form?` and `name?` (found
defaults, like `material`). `mintMember` writes the line onto the
minted part's own fields (Durable condition — already; Keen keenness;
Assembled `seatName`/`nameGrant`; Durable `mends`); `fitImpl` reads
them back off the part; `replaceMembers` takes `condition`, `keenness`,
`name`, `nameGrant`, `mends` from the fitted record and **no longer
forces condition 1**. No self-record on a loose part, no nesting of its
own state (AC 11, 14). `applyAssembledOutput` copies `form` from the
part, `recipe` from its mark, `name`/`nameGrant`/`mends`/`keenness` from
the consumed part's fields; it never copies the bill's `name` (a crafted
sword is nameless; only `billLines()` — a found thing — reads it).

**D3 — Keen composes on `Tool` and reads the construction form; the
edge is declared by `constructionForm: bladed`.** `Tool` becomes
`Assembled(Keen(Crafted(ToolMixin(Durable(Constructed(Good))))))`. This
is the shape `Weapon` already has — Keen on a family where a mace has
no edge, with the edge DERIVED from the form (`construction.isWeapon()
&& primaryChannel ∈ {edge, point}`), never a predicate on the host set.
`sharpen` keeps that test and drops nothing but the requirement that
the thing be a weapon. Edged tool rows author `constructionForm:
bladed` (scythe, billhook-blade, axe-head, adze-blade, drawknife-blade,
froe-blade, sword-blade). `KeenMixin` routes outward: when `this` is
Assembled with edged lines (`edgedLines()` = lines whose `form` has an
edge/point channel), `getKeenness` is their minimum, `dull`/`hone`
apply to them; else its own field. A loose head honed and fitted keeps
its edge (AC 11). `ResponseReading:135` gets the same channel test
(the mace that reads *edge keen* today). Lens 1 decided: an edge is a
fact about shape, and shape is already the form word.

**D4 — The families compose `AssembledMixin`; the twins retire; a
monolith has NO record.** `Tool`, `Weapon` (hence `Launcher`),
`Garment`, `Shield`, `Vat`, `Lamp`, `Chair`, `Receptacle`, `Assembly`,
`Barrel` compose it. A thing with no bill answers `getParts() = []`,
`getBill() = null`, `isOnePiece() = true`; every mixin method is total
on that (the mixin's own `parts.length` branches are the shipped
found-vs-materialized seam, not caller guards). Wear, condition, keenness,
grade, mends and a name live on the host's own fields for a monolith and
on the lines for a whole (D2). `fit x to <one-piece>` refuses in words
(*"It is one piece."*, `no-line` detail `one-piece`); `look` says *It is
one piece.* for a billless Assembled host; `salvage` by joints finds
none and melts (shipped). The owner's ruling (slate § 0) decided it.
`Assembly` (`Assembled(Crafted(Durable(Good)))`) **stays**: it is the
family for a made part with no other capability (cask head, frame,
cushion), beside nothing — not a twin.

⭐ **The rule, computed (2026-10-17):** *the families we write recipes
for* = the classes of every recipe's `outputTemplate` that compose
Durable. Over today's 179 recipes that is the ten above, their `Tool`
subclasses (`Spade`, `LoadDevice`, `SurveyInstrument`, `AssayKit`,
`TimberSet`, `Bailer`), apiculture's `Frame` (already Assembled) — and
**one more: `trade-cooking`'s `CookPot`** (`ManualBuild(ToolMixin(
Durable(ServingVessel)))`, the smithing `cook-pot` recipe; the
requirements' own *a cast pot* is one piece). It joins: `Assembled(
ManualBuild(ToolMixin(Durable(ServingVessel))))`, one pack line, no
guard. D7's arm 7d is that computation as a gate.

**`Mould` is NOT a family in this build** — decided per the owner's
rule, not by taste: no recipe outputs a `Mould`, a `Hoop` or an ice pan
(§ Grounding), so nothing we write recipes for is a mould yet; it is
Durable and Crafted already, `repair` affords on it, and D8's monolith
path mends it under its own fields (its discipline: no recipe →
`recipeFor(ingot-mould)` → none → as if competent). The moulding slate
§ 7's *two-piece mould is an assembly* is the moulding build's — when it
writes the cope-and-drag recipe, arm 7d fires and the answer is one
line on `platform/thing/Mould`. Lens 2 decided (the ordinary case with
no code: a mould row today is a one-piece vessel and already answers
`repair`, `look`, `pour`, `get`; lens 5's test — *does the new object
answer the same commands* — holds without the composition). `Hoop`
likewise (it is Durable by its own line). ⛔ `CraftVessel` stays out: it
is not Durable, nothing wears a glass, and a recipe FILLS one rather
than making it — the thirty-one `ServingVessel`/`CraftVessel` recipe
outputs are pours, not makes.

**D5 — Durable is added to `Vat`, `Lamp`, `Chair`, `Receptacle`,
`Timber`; Crafted to `Vat`(has), `Lamp`, `Chair`, `Receptacle`.** The
claim, stated per host in § Host placement: every one of these wears
on use and can be repaired; nothing calls `wear()` on a sack today, so
a sack reads sound until something does. `Timber` composes Durable
INSIDE Stackable (`Seasoning(Stackable(Durable(Constructed(Crafted(Good)))))`)
and restates `condition` as a `stackIdentity` field, so a worn haft
never merges with a sound one (the `constructionForm` precedent) — the
price of AC 11's *a worn part removed is still worn*.

**D6 — `Cask`, `Lantern`, `AssembledChair` behaviour moves onto `Vat`,
`Lamp`, `Chair` and is total.** `Vat.getClosure()` is `'open'` while
`leaks()` (false with no lines or joints); `reconcileDrying` returns
at once with no joints; `emptySince` persists on every vat (0 = wet).
`Lamp.getEmittedFlux()` scales by failed facing lines (none → ×1).
`Chair.getRestQuality()` scales by structural lines (none → unchanged).
No guard anywhere narrows the host set; the row's bill is what makes
the branch do anything. (Re-checked 2026-10-17: dairy did not touch
`Vat.ts`, `Cask.ts`, `Lamp.ts`, `Lantern.ts`, `Chair.ts` or
`AssembledChair.ts`; its three new kernel-`Vat` rows — the cheese vat,
the rennet jar, the starter crock — take `emptySince` and Durable
vacuously like the carboy; dairy's `heat` placing arm sets a vat ON a
fire through `reachableHeatSource()` and reads nothing the fold-back
moves. Dairy's `Hoop` composes `Durable` on its own line and is NOT a
`Vat`; the mould rows are `platform/thing/Mould`, outside D5/D6.)

**D7 — `lint:bills` arm 7 becomes two honest claims; arm 8 is a
census-then-ratchet.** 7a (kept): a bill on a class that does not
compose Assembled is an error. 7b (new): a row whose class composes
Assembled and whose recipe has **two or more distinct item slots** must
carry a bill — the mint would otherwise record a thing of parts nobody
declared (the billhook today). 7c (replaces *composes ⇒ billed*): a
row with a bill whose class composes Assembled passes; a composing
class's billless row is one piece and passes. **7d (new, the owner's
rule as a gate): a recipe's `outputTemplate` whose row's class composes
`DurableMixin` must compose `AssembledMixin`** — census-then-ratchet,
opening at **1** (`CookPot`) and closed to **0** in W1; it is what
answers *is a mould a family?* mechanically the day a recipe makes one.
Arm 8 (new): every bill
part `template` is the `outputTemplate` of some shipped recipe; the
census opens at **17** (the list in § Grounding — recomputed 2026-10-17;
the plan's earlier *5* missed twelve and mis-named the plough's share)
and the build drives it to **15** (sole and boot-upper gain recipes);
the fifteen stay named in the script with a reason each (a pane and a
board are made by a verb that is not a recipe; the compass's three, the
bellows' two, the bow's nock and string, the cushion's cover and
stuffing, the spindle's whorl, the canister, the wick and the hide-face
have no maker at all). The arm-7 header is rewritten: the
mixin composes on the families, a monolith is one piece, and the gate
that keeps the guard from coming back is *every method total*.

**D8 — The mend is per line, under the line's discipline, at the
hand's band, by a grain table, never rolled.** In `CraftingLogic`:

```
MEND_BY_BAND = {
  untrained:  { ceiling: 0.60, gradeLoss: 1, slackens: true,  stock: 1    },
  novice:     { ceiling: 0.75, gradeLoss: 1, slackens: false, stock: 1    },
  competent:  { ceiling: 1,    gradeLoss: 0, slackens: false, stock: 1    },
  proficient: { ceiling: 1,    gradeLoss: 0, slackens: false, stock: 0.85 },
  expert:     { ceiling: 1,    gradeLoss: 0, slackens: false, stock: 0.70 },
}
```

Per worn line (`condition < 1 − ε`, `failed = 0`): the instrument by the
LINE's material (metal → reachable heat ≥ `crafting.repair.metalHeatK`
+ an `anvil`; wood → a `cutting` tool; else `mending`); the discipline
by D1; the band by `bandIn(hand, discipline)`; the stock = the part
row's `mass × count × deficit × costFactor × stock(band)` of same-tag
donors; the result `condition = max(current, ceiling)`; the grade band
on the line −`gradeLoss`; `slackens` sets every joint the line sits in
to `slackThreshold − 0.01`; a `MendRecord` is appended to the line;
the hand joins `line.makers`. A second untrained mend loses another
band — the compounding IS the grade loss (AC 1, 2). A monolith is one
line: the host's own fields, the discipline from `Crafted.recipe` else
`recipeFor(own template)` else `Crafted.castDiscipline` (D1). ⭐ That
monolith path is keyed on *is there a record* (`!isAssembled(item) ||
item.isOnePiece()`), so it also serves every Durable host that does
not compose Assembled — a `Mould`, a `Hoop`, arcana's `Conduit`, a
pack's one-off — exactly as the shipped wear rung does today
(`repair.yaml` `requires: DurableMixin`, nothing narrower). Not a
guard: it is the found-vs-materialized seam the mixin already owns,
read once at the top of the ladder. The whole mends every line it can and
reports what it could not (`RepairSuccess.mended[] / skipped[]`); it is
a refusal only when nothing was mended. `captureHostOf(item)` ends
every successful repair. Lens 1 decided the shape; the numbers are the
requirements' own and are grain (code constants beside
`RECOVERY_BY_BAND`, not dials — nothing operates them).

**D9 — A failed METAL member is reforged by its trade at its recipe's
heat; a failed wooden or soft member is refused naming the cure.** A
new rung in `repairAssemblyRungs` before the refusal: a failed line
whose material has `metal` and whose recipe (D1) names a heat
(`requiresHeatK`, else `metalHeatK`) reachable by the hand, with the
recipe's `toolCapabilities` in the gather, costs `brokenFactor ×` the
line's stock under D8's band and re-makes the members (`failed → 0`,
condition to the band's ceiling, grade by band, mend recorded
`reforged`); ⭐ **a named line reforged loses its name and records
`nameGrant = the reforger`** (Narsil's rule; AC 14). Wood is not
re-made: *"the haft is split — it wants a new haft"* (shipped). This
is also what lets the tinker say *hot metalwork waits for a fire*: a
WORN head mends at 900 K, a BROKEN one wants the pick-head recipe's
1200 K.

**D10 — Mend history lives on `DurableMixin`; the condition word is
Durable's augmenter.** `MendRecord {at, by, byName, band, discipline,
part?, kind: 'mended' | 'reforged' | 'tightened', result: 'sound' |
'short'}`; `mends: MendRecord[]` `{persistent, runtimeState}` on
Durable; `recordMend()`, `getMends()`. `AssembledMixin` overrides
`getMends()` to the union of its lines' records and its own. The
augmenter (`durableAugmenter`, on `DurableMixin`) prints, after the
description: the condition word when not sound (`sound ≥ 0.8 · worn ≥
0.4 · badly worn > broken dial · broken`), *It has been mended.* / *It
has been mended by Berta.* (the last record's `byName`), and — when the
host is Assembled and billless — *It is one piece.* A sound, unmended
thing prints nothing (the requirement's *every worn or mended thing*).
Order: Durable's line, then Assembled's (made of … the work of …).

**D11 — Appraisal detail is a `Reading` row, not the look.**
`/platform/idea/reading/condition` (`ConditionReading`, discipline
`appraisal`, scope `subject`, `subjectRequires: [DurableMixin]`, eye
rung only — the ladder's *competence resolves detail, never access*):
untrained — the word and whether mended; novice — how many times;
competent — the worst hand's band in words (*by an unpractised hand*)
and the grade band; proficient — per part; expert — the menders by
name. `analyze condition <thing>`. The first code reader of `appraisal`.
`improves`/`stakes` authored on the row.

**D12 — The paid mend: diagnose → quote → confirm → mend as the hand →
collect the quote → pay the hand by the seat's basis.** New
`CraftingApi.diagnose({item, hand: 'self' | 'fulfilling'})` →
`Diagnosis {hand, faults: [{part, kind: 'worn'|'failed'|'slack'|'spent',
named, discipline, band, mendable, reason?, stockKg}]}`, read-only; the
`'fulfilling'` hand is `presentFulfillers(giver)` (no discipline — the
hand's bands per part decide the result, not the seat) → `houseOf` →
`callFor`, refactored out of `resolveMaker`'s tail into one
module-private `callHouse(giver, candidates)`. A fault the hand cannot
name reads *something about the staves* and is not priced (§ 4's *a hand
who cannot diagnose quotes only what they can see*). `RepairRequest`
gains `hand?: Stuff` (world state, never wire) which overrides the
acting author as maker — the gather reads the HAND's reach, so the
house's iron mends the pick. `Tariff.quoteFor(diagnosis)`: Σ per fault of
`priceFor(key)` where `key` is `repair` (worn), `tighten`, `reforge`,
`refire`; an unpriced key derives from `repair` × `{tighten 0.25,
reforge 2, refire 1}` (grain). `PricedOfferMixin.collectMinor(amount,
reason)` is the settlement path for a computed charge (`collect(key)`
calls it). `OrderController`'s repair arm: no hand → *"There's nobody
here to do the work."*; quote scene (*Berta looks it over. The head is
worn — 5. The hafting has gone slack — 1. Six for the lot.*); `await
context.interactive?.promptConfirm('Have it done for 6?', 'no')` (no
interactive → declined); yes → `repair({item, hand})` → `collectMinor`
→ if the hand's position basis is `per-settlement`,
`settlePiecework(houseOf(hand), hand, 1)`; a time-basis hand is paid by
the shift wage already. The mend records `by: the hand` (AC 5, 6).

**D13 — The round is the roster's: one assignee, several slots, the
station follows the hour.** `tickBusiness` groups assignments by
assignee: desired on if any slot says on; the station is the on-slot's
(`station` else the first operating Location); one `beginShift` at the
first on, one settle + `endShift` at the last off, and a **move on a
station change** mid-shift (tracked in a per-logic `Map<assignee,
station>`; a restart re-moves once). A round is then N `rosterSlots`
rows, and the postman and the roadmender are the same rows. Watched or
not, the move is the shipped hourly teleport (Berta's precedent);
*walking between stops when watched* is a deferred seam, named below.
Memory's rule decided it: where he IS is a function of the clock.
Overlapping on-slots for one assignee take the first in file order
(`lint:openings` gains a refusal of two overlapping on-windows for one
assignee at one house).

**D14 — The tinker is born holding his kit the way Katie is: a pack
class `CastMixin(StagedMixin(NPC))`, and NO kernel change** (revised
2026-10-17). The first draft composed `StagedMixin` on `NPC` itself;
re-grounding found the shipped shape — `Katie.ts`, `Walter.ts`,
`Realtor.ts` are each `CastMixin(StagedMixin(NPC))` in their packs, and
`Gus.ts`'s header (`:14–26`) explains why the kernel composition is
WRONG as a claim: *`StagedMixin` bundles `props:` WITH `cast:`, so
composing it on a person claims that person contains a cast.* Putting
it on `NPC` would be the `Freshness off every Thing` shape — a base
class quietly claiming every NPC may carry a cast of people. So:
`terminus/src/wharfside/agent/Tinker.ts` = `CastMixin(StagedMixin(NPC))`
(the Katie file, renamed; `props:` on his row), the fifth receipt for
Gus's split. `props:` is reseeded on restore so the kit is re-minted
with the body (shipped). ⚠ The split itself — a `props`-only half of
Staged that a *person with a loadout* composes, making Gus and the
four pack classes ROWS — is cross-cutting and leaves as a seam (memory's
rule: never solve a cross-cutting capability in a trade build). § Risks
3 names it for the owner.

**D15 — The tinker.** A Cast at a booted home yard
(`/world/terminus/wharfside/tinker/location/yard`, exits to the bank),
employed by his own house (`…/tinker/idea/round`, proprietor = himself,
`call: rota`, seat `fulfills [smithing, carpentry, tailoring]`, time
basis), five roster slots: yard 6–8, crossroads 8–10, valley-gate
10–12, crossroads 12–14, Rejection's **smelter** 14–17, `offstage` after
(an Offstage row of his own). Bands: smithing competent, carpentry
novice, tailoring novice, appraisal competent. His slate (a `Tariff`,
`repair: 4`) is a prop of EACH stop room — one row per owning pack
(terminus at the crossroads, hearts-delight at the valley gate,
rejection at the smelter — the re-pointed `mending-slate.yaml`) — and
every slate's path plus every stop room is in the house's
`operatingLocations`, so `collect` attributes to his house self-first
and `isFulfilling` holds wherever he stands. At a stop with no fire he
mends wood (his billhook) and soft goods (his kit) and quotes iron as
*wanting a fire*; at the smelter, with the furnace lit, he mends iron
at 900 K and quotes a BROKEN head as beyond the fire he has (D9). The
crossroads carries a `Signpost` with the round. ⛔ **No boot entries**
(revised 2026-10-17, § Parallel builds P9): `BOOT_ENTRY_CEILING` (83)
may not rise without the owner, and the owner's standing rule is *load
on use, never boot*. A stop room's arrival brings the house current
(the shipped arrival path the drive already relies on), so the tinker is
at the stop whenever anyone is there; where he is when nobody looks is
a function of the clock, read on arrival. The requirements' § 8 and drive 6 meet at
the smelter (§ Risks, conflict 1).

**D16 — The cobbler is rows, on the tailor's pattern.**
`/world/terminus/mayfield-row/cobbler{.yaml, /location/shop, /idea/outfit,
/thing/slate, /agent/cobbler}`; the street gains a `cobbler` exit; the
seat `cobbler` (`fulfills [leatherwork, tailoring]`, `headcount 2`,
`requires {discipline: leatherwork, band: novice}`, `compensation
{basis: per-settlement, rate: 4}` — paid per mend, which is how a
cobbler was paid and what lets drive 8 see the wage land), `call: rota`,
slot 8–18; props: the slate (`repair: 4`), a `MendingTool` row (the
cobbler's last-and-awl, `mending` — the repair pacer), the tailoring
`needle-case` (what affords `sew`), hide stock
(`/stuff/thing/items/hide-stock`), soles ×4 and uppers ×2 as stock
(`{template, count}` props). Recipes `sole` (tanning pack, `discipline:
leatherwork`, one `leather` item slot, `toolCapabilities: [mending]`)
and `boot-upper` (tailoring, the same shape) — both run by tailoring's
shipped `sew` (§ Risks 11). Zero code.

**D17 — The sword is four parts, riveted.** Rows (smithing `Tool`s,
`bladed` where edged): `/trade/smithing/thing/sword-blade` (2.1 kg? the
sword row says 1.0 kg — bill parts must weigh ≤ the whole: blade 0.6,
crossguard 0.15, pommel 0.15; grip `/trade/carpentry/thing/grip` 0.1,
`Timber`). Bill: blade + crossguard + grip structural, pommel
`fastener`; joint `hilting: riveted` (members [blade, crossguard,
grip], fastener pommel — the peened tang; `riveted` is tool `striking`,
smithing, reversible `effort`, `fastenerRecovery` low: a re-hilt costs
a pommel). Recipes: `sword-blade` (smithing, `forgeable×2 fair @1450`,
hard — the old sword's signature), `crossguard` (`forgeable×1 fair
@1175`), `pommel` (`forgeable×1 poor @1000`), `grip` (carpentry, wood ×1,
`cutting`, easy), and `sword` becomes a `fit`-raise recipe (four item
slots named for the parts, tools `striking`+`anvil`, no heat,
smithing, standard). The billhook follows the same split
(`billhook-blade` smithing `forgeable×1 fair @1225`; the forestry
`billhook` recipe becomes blade + handle, carpentry, easy; row bill
blade + handle `wedged`) — required by D7 7b and by drive 4. The scythe
stays one piece with an edge (grain; the snath is the carpentry slate's).
Anvil signatures are checked by `anvil-ladder.test.ts`; the heats above
were re-checked 2026-10-17 against the computed list in § Grounding and
are all free: `2:fair@1450` is the retiring `sword`'s own (`sword-blade`
inherits it, `sword` becomes a no-heat fit and leaves the anvil set);
`1:fair@1175` sits between adze-blade 1150 and pick-head 1200;
`1:poor@1000` between cook-pot 800 and rivet 1050; `1:fair@1225`
between pick-head 1200 and froe-blade 1250. Dairy added no anvil
recipe; `KNOWN_TIES` stays at its two. Re-run the test at build anyway.

**D18 — The heirloom.** `/world/terminus/hearthworks/thing/heirloom`
extends `/stuff/thing/arms/sword`: its own short/long description (the
re-hilting history in prose), the full bill restated with `name:` on
the blade part (the found default — the row is spawned, never
crafted), propped in the smithy. `Stuff.identityPhrase` gains one rung
after `isNamed`: an Assembled host's `getSeatName()` (the named line's
name, or a monolith's own `seatName`) as a proper phrase;
`AssembledMixin.hasKeyword` answers the seat name too. `name <thing>
<name>` gains a second arm in `NameController`: an Assembled target
whose `getNameGrant()` is the actor's identity path — set the name,
clear the grant, capture; `name.yaml`'s `target` arg becomes
`requires: any` (the controller refuses *That isn't something you can
name.*; the memory rule: alternation deletes a check, so both arms are
checked in code).

**D19 — Removals.** The infirmary tariff loses `repair`; the Rejection
`mending-slate.yaml` is re-authored as the tinker's and moved from the
provisioning shed's props to the smelter's (AC 7).

### Building upkeep (reopened 2026-10-16; W7)

**D20 — A layer's condition lives on the HOLDING PROGRAMME, keyed by
member room, part and index; the clock stays the programme's one
`shellStamp`; the scalar becomes a read.** `HoldingWarren.fabric:
LayerState[]` `{room (member key), part: 'walls' | 'roof', index
(outermost 0), materialPath, condition 0..1, grade: GradeBand ('fair' at
mint), patches: PatchRecord[]}` `{persistent}` — an array, never a
bare-persistent Map. Seeded at wake from each member room's **declared**
`getEnclosure()` / `getRoof()` (rubber D1a: a spec, a list, `'none'`,
null) — the resolved universe default is NOT a layer; an undeclared room
contributes nothing; a re-authored row re-seeds sound at
`restoreFromTemplate`. `reconcileShell()`: with `fabric` non-empty, each
layer whose part has an exterior face (rubber D4: the roof iff
`exposure().top === 'roof'`, the walls iff any `walls[].exterior`) loses
`elapsed × 0.5 / (weatheringDays(material) × gradeFactor × 86 400)` and
`shellCondition` is **assigned the minimum** — the holding is as sound
as its worst layer, so `conditionBand()`, `OuterWarren.conditionOf` and
the ascent gate are unchanged readers; with `fabric` empty the shipped
slope runs (*a building with no layers weathers as today*). ⛔ Not the
assembly vocabulary: a `PartLine` is Durable state on a GOOD and a
whole's condition is the goods clock — calling a wall a part invites
`AssembledMixin` onto a place and `wear()` onto the calendar. ⛔ Not on
`AtmosphericMixin`/`Enclosed`, the layers' owner: it composes on the
`Hive` and `ExitableVessel`, both Goods — a clock there rots a beehive
on the calendar, the exact two-clocks breach. ⛔ Not a mixin on
`Location`: `maintain`'s *holding here* check would become a guard
re-narrowing the host set, and the smithy's slate would weather with
nobody able to keep it. Written down instead of coded: **a building
outside a holding does not weather in this build** → Deferred seams.
The two-clocks rule holds by construction — the only reader of the
calendar is still the programme, an Idea; no Good composes anything
new; the regression test gains a layered holding beside the spanner.

**D20a — Two opt-ins (owner, 2026-10-16), and they shape D20–D22.**
(1) **The building opts in.** The fabric clock is a capability a host
DECLARES, not a property of every holding's rows by accident: put
D20's `fabric` + `reconcileFabric` on a mixin (e.g. `WeatheringMixin`,
`lib/residence/` or the kernel's `lib/` if a non-pack host will need it
— the icehouse is the named next composer, so prefer the kernel), plus a
row flag (`weathers: true`) the host reads, so a composing class can
still leave a row out. `HoldingWarren` composes it and its rows set the
flag; nothing else composes it in this build. ⛔ Never on a Good (two
clocks). The icehouse later opts in by composing/flagging, no new
mechanism. (2) **The material opts in, and only when supplied.** A
material weathers only if its row says so (`weathers: true`, default
**false** — opposite of D21's default below, which now applies only to
opted-in materials); an un-opted layer is seeded but never loses
condition and never appears in a cure. ⚠ **Sawdust stays off** (no
sawyer → icehouse supply chain); ⚠ **brick stays OFF** too (P5: rubber
authors the brick row; nobody makes or sells brick until moulding's
brickmaking — the dorm's lime coat weathers, its brick does not); lime
plaster, slate, thatch and
the boards opt in for the first holdings because the general store
stocks their laying goods (D26). A `lint:` arm or a test pins it: every
opted-in material's `laying.good` is sold somewhere in the realm
(a stock line or a producer) — the supply rule made checkable. AC 15a.

**D21 — Weathering pace is ONE authored field on `Material`:
`weatheringDays` (game-days in the open from sound to worn — the
shipped `daysToWorn` scale), defaulting to
`residence.weather.daysToWorn`.** Not derived: the predicate does not
exist — `waterAbsorptionCapacity` and `hardness` are authored on a
minority of rows, and a formula fitted to *thatch fast, slate slow* is
invented physics wearing a derived face; `seasoningDays` is the
precedent for a time constant on a material. Lens 1: the lesson is
*what is this roof made of and what does it cost a year*, which the
material's NAME teaches; lens 2 grain: one number a realm re-authors.
A poorly patched layer weathers faster — `gradeFactor = 1 / (1 + 0.5 ×
bands below fair)` (D25's compounding, in the same clock). First
numbers (grain): lime plaster 30 · thatch 60 · oak/pine/ash boards 120
· brick 400 · glass 600 (the putty goes, not the pane) · slate 900. A
material that says nothing takes the default — no gate refuses an
author.

**D22 — A material names its laying trade on its row: `laying:
{discipline, capability, good} | null`.** The Discipline that lays it
(the band read), the tool capability the instrument must offer, and the
Stackable row a layer is laid FROM (its `mass` is the unit the cure is
said in; the draw matches by MATERIAL, so any stack of it serves).
`null` (default) = the householder's: no discipline (as if competent —
D1's rule for a thing nothing can be known about), instrument `upkeep`.
On `Material` because no tag says *thatcher*; not a `Laying` row because
a field will do; the shape is the Joint row's `competence` + its tool
capability. Authored in W7: thatch → `{thatching, thatching,
reed-bundle}` · lime plaster → `{masonry, masonry, lime-sack}` · brick →
`{masonry, masonry, brick}` (rubber's row) · slate → `{masonry,
masonry, slates}` · oak/pine/ash → `{carpentry, upkeep, plank}` (nailed
with what is in the kit) · glass → `{glasswork, upkeep, pane}` (putty)
· sawdust → `null`. Two new Discipline rows, `masonry` and `thatching`,
in the platform pack beside `smithing`; two instrument rows, a
**trowel** (`masonry`) and a **leggett** (`thatching`), both ALSO
carrying `upkeep` (D25).

**D23 — The holding's band reads from its layers; the cause line names
the worst layer in words.** `conditionCause()` on a layered holding:
*"The lime on the walls of the hall is going; the slate over the bedroom
has gone."* — material name, part, member room (weathered/worn → *is
going*; shabby/dilapidated → *has gone*), no per-material prose. An
unlayered holding keeps its two shipped sentences. `survey` adds one
line per wanting layer from a new shape method `fabricReport():
FabricLine[]` (`{room, part, material, band, cure}`), read by shape like
`conditionCause`.

**D24 — `survey`'s cure line: the layer, the material, the amount in
words.** `owedKg = (1 − condition) × areaM2 × thicknessM × density`
(area from rubber's `exposure()` face); `count = ceil(owedKg /
good.mass)`; said as `GrammarApi.inWords(count)` + the good's noun —
*"the thatch over the bedroom has thinned; it wants two bundles of
reed."* No digit, no unit symbol: the suite's regex runs over the cure
line. A patched layer below fair adds *the patch is poor* (plain, for
anyone — grain).

**D25 — `maintain` lays the material from hand into the worst reachable
layer, by the material's trade, at the hand's band, through D8's
table.** Reachable = the layers of the room you stand in (no ladder;
grain). Order: holding here (shipped) → `reconcileShell()`; the worst
layer of this room below `1 − ε`, else the shipped scalar path when the
holding has no `fabric` (kit, back to sound — the requirement's last
sentence) → the instrument: the bound `kit` must
`hasCapability(laying?.capability ?? 'upkeep')`, refused naming the
tool (*"Thatch wants a leggett, not a putty knife."*) — every laying
tool carries `upkeep`, so the view's ONE declared default still binds
it and `maintain with leggett` names it → the materials: stacks in the
actor's hands of the layer's material totalling ≥ `owedKg ×
stock(band)`, refused naming the good and the count in words →
`CraftingApi.mendTerms(hand, discipline)` → `MendTerms {band, ceiling,
gradeLoss, stock}` (a read-only static over `MEND_BY_BAND` — the pack's
seam into D8; `laying: null` answers competent) → draw the stock
(`Stackable.applyQuantity` / destruct on the actor's own stacks),
`condition = max(current, ceiling)`, `grade −= gradeLoss`, push
`PatchRecord {at, by, byName, band, result}`, wear the instrument
(`KIT_WEAR`), `PersistableApi.captureHostOf(programme)`. Compounding IS
the grade: two untrained patches are two bands down and twice the pace
(D21). `maintain.yaml` help rewritten; the `kit` arg unchanged. ⚠ A
layer's condition has NO physics yet — Deferred seams.

**D26 — The keepers buy what they lay: the college and the agency
become Businesses with a par sheet and a bench; the `maintains` brain
orders, receives, carries and lays.** `college.yaml` → `class:
/platform/idea/Business`, `banksAt: goodkin`, `hall-manager` gains
`purchases: true` (the roster tick deals Katie the house card),
`parLines` one per material the dorm's layers name (`exemplar` the
good, `supplier` the general store's business, `level` = one patch's
count), `operatingLocations: [the lobby]`, a receiving bench + a store
cupboard propped in the lobby; `agency.yaml` likewise at Seznick's. The
brain's beat gains the `restocks` front half before its round: from the
lobby, `business.stockSheetFor(keeper)` → `business.orderShortfall(
keeper, {board, bench, reward, batch})` → `business.receiveBench(
keeper, bench, into)` — **both MOVED onto `BusinessMixin` out of
`restocks.ts`'s module-private `order`/`unpackBench`** (a second brain
is the second caller; a pack brain cannot import a kernel brain's
privates; an Api static with a world object first would raise the
`lint:object-verbs` ceiling); `restocks` calls the same two. Then per
wanting holding: take the layer's good from the cupboard into hand,
teleport, `forceCommand('maintain')`, return the remainder. An employer
that cannot fund the bounty (`job post` refuses on escrow) posts
nothing, nothing arrives, the holding weathers — AC 17 by the same
refusal a player gets; the brain says nothing (`survey` is the mirror).
Supply: general-store stock lines for `reed-bundle`, `slates`,
`lime-sack` (the producer-stock convention); `plank` at the timber
yard; `pane` from the glass trade. ⚠ No RGO behind reed, lime or slate
— Risks 15.

**D27 — The first layered buildings.** `dormroom.yaml`: `enclosure:
[{lime-plaster 0.015}, {brick 0.23}]` (outermost first), `roof:
[{slate 0.008}, {oak 0.025}]`; `lobby` and `corridor` likewise so the
hall leaves rubber's census — ⛔ **not `steps`** (an outdoor room,
`outdoor/baseline`, lit by the sun: a slate roof would make it dry and
dark) and ⚠ **`cistern`** only if its drown-here proof tests still pass
(rubber, 2026-10-17). Seznick `hall/main/bedroom`: `[brick 0.23]`,
`roof: [{slate 0.008}, {pine 0.02}]` — ⚠ authored on **Seznick's own
room rows**, never on the shared `/stuff/location/room/{living,
bedroom, bathroom}` rows that feed every programme. Hinkley
`house-programme`'s **enclosed** rooms (⛔ not `lots/yard` — it is outdoors; cleanliness, 2026-10-17): lime over brick, `roof: [{thatch 0.3}]` —
where thatch lives in the world (AC 15's *slate and thatch on one
calendar* is a unit test; the drive's home is the dorm, where the lime
goes before the slate). Without a `Structure`'s storeys every room's
roof is exterior (rubber's lone-place rule) — a ground-floor room
weathers a roof it does not have; grain, Deferred seams.

---

## ⭐⭐ Host placement

| what | host | what composing it claims about every other composer |
|---|---|---|
| `AssembledMixin` | `Tool`, `Weapon`, `Garment`, `Shield`, `Vat`, `Lamp`, `Chair`, `Receptacle`, `Assembly`, `Barrel` | every row of the family is parts or one piece; every method is total on an empty record (D4). Pack subclasses (`SurveyInstrument`, `SpinningTool`, `Whetstone`, `Rod`, `Trap`, `KitchenTool`, `SutureKit`, `AssayKit`, `Bailer`, `Derrick`, `GrozingPliers`, `Blowpipe`, `ScribingWheel`, `Strainer`, `Muddler`, `HouseholdersKit`, `SoilKit`, `Spade`, `LoadDevice`, `MendingTool`, `TimberSet`, `AssayBench`, `Anvil`, `Loom`, `ScutchingBoard`, `CuttingTool`, `WateringCan`, `DisguiseGarment`, `Launcher`, `FoldingChair`) inherit it and need no restatement: mixin statics union. **Plus `trade-cooking`'s `CookPot`** (a recipe output that wears — D4's computed rule, arm 7d). ⛔ Not on `Good`, `Thing`, `Fitting`, `Chest`, `Bottle`, `Provision`, `CraftVessel`, the hive rows; **not on `Mould`/`Hoop` in this build** (no recipe makes one — the moulding build's one line). |
| `castDiscipline: string` | `CraftedMixin` (kernel) | every made thing MAY record the trade of the mould it set in; `''` for everything a recipe made or nothing made. Written only by `Mould.ts`'s `carryPayload`; read only by `disciplineOf` (D1). The wheel reads `dairying`, an ingot composes nothing and is told nothing. |
| `PartLine.castDiscipline?` | the record | copied beside `recipe?` — the same fact a loose cast part carries (D1, D2). |
| `DurableMixin` (new) | `Vat`, `Lamp`, `Chair`, `Receptacle`, `Timber` | a carboy, a torch, a stool, a sack, a stave wears on use and is `repair`able; nothing wears them yet, so they read sound. `Timber`'s condition is stack identity (D5). |
| `CraftedMixin` (new) | `Lamp`, `Chair`, `Receptacle` | a torch, a cot, a pail has a grade (`fair`) and may be a recipe output. |
| `ConstructedMixin` + `KeenMixin` (new) | `Tool` | a tool has a form word (optional) and an edge gauge; the edge is inert unless the form delivers edge/point (D3) — exactly `Weapon`'s claim. |
| `StagedMixin` | `terminus/src/wharfside/agent/Tinker.ts` = `CastMixin(StagedMixin(NPC))` — the Katie/Walter/Realtor chain, a pack class | THIS person boots with a loadout (D14). ⛔ Not on `NPC`: `Staged` bundles `cast:` with `props:`, so the kernel composition would claim every NPC contains a cast (`Gus.ts:14–26`). The `props`-only split is a seam. |
| `PartLine.{keenness, name, nameGrant, mends, recipe}`, `BillPart.{form, name}` | the record / the bill | a line carries the same state its loose part carries (D2). |
| `seatName`, `nameGrant` (host fields) | `AssembledMixin` | a one-piece thing may bear an authored or granted name (D18). |
| `mends: MendRecord[]`, `durableAugmenter` | `DurableMixin` | everything that wears remembers its mends and shows its condition word (D10). |
| `emptySince`, `reconcileDrying`, `getClosure` | `Vat` | every vat dries out when empty — true of a cask, vacuous for a carboy (no joints) (D6). |
| flux by failed pane | `Lamp` | every lamp's light passes its facing lines (none → unchanged). |
| rest by structural lines | `Chair` | every seat rests as well as its parts (none → unchanged). |
| `MEND_BY_BAND`, `diagnoseImpl`, `callHouse`, the reforge rung | `CraftingLogic` (module-private) | nothing new on `lib/`. |
| `quoteFor` | `Tariff` | a platform class method. `collectMinor` on `PricedOfferMixin` — every offer may settle a computed charge. |
| `recipeFor(outputTemplate)` | `RecipeCatalogue` | an index on an existing warm, no scan (D1). |
| `ConditionReading` | `platform/idea/reading/` + a platform row | a channel like every other (D11). |
| the station map, assignee grouping | `EmploymentLogic` | a seat's station may change within one shift (D13). |
| `fabric: LayerState[]`, `fabricReport`, the layered `reconcileShell` / `conditionCause` | `HoldingWarren` (residence pack) | every holding whose member rooms DECLARE layers weathers by them; one that declares none weathers as today (D20). ⛔ Not `AtmosphericMixin` (the Hive is a Good), not `Location` (nobody could keep the smithy). |
| `weatheringDays`, `laying` | `Material` (kernel) | every material may say how fast it goes in the open and who lays it; one that says nothing takes the default and the householder (D21, D22). No Good reads either. |
| `mendTerms` | `CraftingApi` (read over `MEND_BY_BAND`) | the band table is readable by a pack; nothing but `CraftingLogic` writes it. |
| `orderShortfall`, `receiveBench` | `BusinessMixin` | every house may order its shortfall and receive at a bench — `restocks` and `maintains` are the two callers (D26). |
| `UpkeepTool` (← `HouseholdersKit`) | residence pack, `src/thing/` | a tool that confers `maintain`: the kit, the trowel, the leggett are rows of it, each carrying `upkeep` + its trade capability (D25). |
| `masonry`, `thatching` | platform Discipline rows | two trades that lay building materials; no pack owns them yet (D22). |

**The test, applied:** no caller anywhere asks `isAssembled(x) && x has
parts` to decide whether to proceed; `fitImpl` refuses `one-piece` from
the mixin's own `isOnePiece()`; the look augmenter's *one piece* line is
a total method on the host. If the build finds itself writing
`if (!MixinApi.isAssembled(host) || host.getParts().length === 0)
return` in a CALLER, the host is wrong — write it down instead. The
same test on W7: `maintain`'s *holding here* check is the SHIPPED
boundary of the clock, not a guard added to narrow a kernel mixin —
which is why the layers' state sits on the programme (D20) and not on
the place.

---

## Convention conformance

Checked at plan time against `CLAUDE.md` and the current tree:

- **`props:` / `cast:`** — every new row uses them; the tinker's kit is
  `props:` on a Cast row (D14). No `populates:`, no `container:`.
- **Locations, not rooms** — new places are `SingletonCartesianLocation`
  under a `CartesianZone` (the tailor's shape); the tinker's offstage is
  a `/platform/location/Offstage` row.
- **The five axes / `<root>/<branch>/`** — smithing parts at
  `/trade/smithing/thing/…`, the grip at `/trade/carpentry/thing/grip`,
  the round-knife at `/trade/tanning/thing/round-knife`; the reading row
  at `/platform/idea/reading/condition`; venues under
  `/world/terminus/…`; the heirloom under `/world/terminus/hearthworks/thing/`.
- **Module scope declares; lifecycles initialize** — `MEND_BY_BAND` is
  a `const`; the recipe index is built in `warm()`.
- **Import boundary** — packs import the kernel by specifier only;
  `SharpenController` already does. No pack Api, logic or helper.
- **Verbs on objects** — `quoteFor` on `Tariff`, `recordMend` on the
  host, `edgedLines` on the whole; nothing `XApi.verb(host, …)`.
- **No new module category, no free helper, no new Api** — `diagnose`
  rides `CraftingApi`; `ConditionReading` is a `Reading` (existing
  category); every helper is module-private in a logic singleton or a
  method on its class. `lint:lib-statics` and `lint:object-verbs`
  stay at their ceilings.
- **Methods-only inter-Stuff contract** — lines are read through
  `getParts()`/`getLine()`; new mutators `setLineKeenness`,
  `honeLine`, `setSeatName`, `recordMend`.
- **Persistence** — new fields `{persistent: true, runtimeState: true}`;
  `captureHostOf` after `repair`, `name`, the service.
- **Lint family this build must satisfy** (run `lint:family`): `bills`
  (rewritten arms 7–8), `self-contributions` (0), `menu-staff` (new
  houses with `fulfills` carry `call:`), `openings` (the cobbler's
  `requires` vocabulary; the new overlap arm), `dossiers` (two new Cast
  rows carry dossiers), `shopfronts`, `reachability` (new recipes'
  outputs exist; the condition row is warmed by infix), `instanceable`
  (twins deleted; no `/lib/` rows), `field-meta` (**re-snapshot**: new
  fieldMeta on Durable, Assembled, Timber, Vat), `unconsumed-seams`
  (every new field has a reader in this branch), `boot-entries` (the
  two tinker entries cite the slate), `light-sources` (Lamp rows keep
  `lit:`), `mass` (every new row states `mass`), `counters` (no new
  counter class — `Tariff` is kernel), `instrument-args`, `verb-collisions`
  (no new verbs), `test-bootstrap`, `authored-prose`, `controller-rows`,
  `template-scans`, `get-or-create`, `inert-weapon`. All of these are in
  the derived roster (`lint:family --list`, **79 gates** on
  2026-10-17; dairy added none — it extended `envelope`'s held-room
  allowlist, `light-sources` and `census`). **Two goldens churn, not
  one**: `lint:field-meta`'s (`scripts/__fixtures__/field-meta-golden.json`,
  `--snapshot`) AND the **wiki-spoiler audit**
  (`src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` — a vitest
  snapshot of every `fieldMeta` field with its reveal level). The
  second is the one the caller meant: every new field here
  (`DurableMixin.mends`, `AssembledMixin.seatName/nameGrant`,
  `CraftedMixin.castDiscipline`, W7's `Material.weatheringDays/laying`,
  `HoldingWarren.fabric`) appears as a diff, and the file's rule is a
  **review-log entry in its header** answering *is this a spoiler?*
  per field (dairy's entry is the template: *24 fields, and a relabel*).
  None of this build's is — mend history, a seat name, a laying trade
  are what `look`, `analyze` and `survey` say in words; `mends` and
  `fabric` are runtime state. Write the entry, then bless.
- **W7 additionally**: `envelope` (rubber's clause (e) validates every
  layer; the dorm/Seznick/Hinkley rows must pass it), `field-meta`
  (re-snapshot: `Material.weatheringDays/laying`,
  `HoldingWarren.fabric`), `unconsumed-seams` (both Material fields are
  read in the residence pack — the gate walks packs), `instanceable`
  (the kit row re-points to `UpkeepTool`), `object-verbs` stays 0 (the
  order/receive seam is a method on `Business`), `instrument-args` (the
  one declared default), `reachability` + `mass` (the new goods are
  stocked and weigh), `boot-entries` (⛔ no new entries — P9), `dossiers` (unchanged — no new Cast). The
  Material library is a closed vocabulary (`race.md`): thatch and lime
  plaster are two rows whose substrate-read properties differ from
  everything shipped — Risks 15.

---

## Waves

### W0 — the parts model carries a part's own state

**Goal.** A line carries keenness, name, name grant, mends and its
recipe; a loose part carries the same on its own fields; fit and mint
move the state both ways; the discipline of a line is derivable.
Implements D1, D2, D3 (the Keen routing half), D10 (fields only), D18
(presentation + keyword).

**Files.**
- `server/src/mud/lib/craft/Assembled.ts` — `BillPart.form?/name?`;
  `PartLine.keenness?/name?/nameGrant?/mends?/recipe?/castDiscipline?`; host fields
  `seatName: string`, `nameGrant: string` (`{persistent, runtimeState}`);
  `billLines()` copies `form`, `name`; `replaceMembers(part, k,
  fitted)` takes `condition?`, `keenness?`, `name?`, `nameGrant?`,
  `mends?`, `recipe?` and uses `fitted.condition ?? 1`; new methods
  `isOnePiece()`, `edgedLines()`, `lineKeenness(part)`,
  `setLineKeenness(part, v)`, `honeLine(part)`, `dullLine(part, a)`,
  `getSeatName()` (named line's name, else own `seatName`),
  `setSeatName(v)`, `getNameGrant()`, `setNameGrant(v)`,
  `clearSeatName()` (for the reforge), `getMends()` override (union),
  `recordLineMend(part, rec)`, `hasKeyword` override (super || seat
  name); the augmenter adds *It is one piece.* when billless.
- `server/src/mud/lib/material/Durable.ts` — `MendRecord`, `mends`,
  `recordMend`, `getMends` (the augmenter lands in W2).
- `server/src/mud/lib/craft/Crafted.ts` — `castDiscipline` field +
  fieldMeta `{persistent, runtimeState}` + `getCastDiscipline` /
  `setCastDiscipline` (D1).
- `server/src/mud/lib/mould/Mould.ts` — ONE line in `carryPayload`'s
  `isCrafted(cast)` block: `cast.setCastDiscipline(mouldDisc)` where
  `mouldDisc = MixinApi.isMould(mould) ? mould.getMouldDiscipline() : ''`
  (the mould is passed in already). Nothing else in the file.
  `lib/mould/__tests__/Mould.test.ts` gains the fixture case (a
  Crafted+Durable cast in a `discipline: smelting` mould reads it).
- `server/src/mud/lib/material/Keen.ts` — outward routing to
  `edgedLines()` (D3).
- `server/src/mud/platform/idea/RecipeCatalogue.ts` — `recipeFor(path)`.
- `server/src/mud/platform/idea/api/CraftingLogic.ts` —
  `applyAssembledOutput` copies form/recipe/castDiscipline/keenness/name/
  nameGrant/mends from consumed parts; `fitImpl` reads condition/keenness/
  name/grant/mends/recipe/castDiscipline off the part; `mintMember` writes
  them onto the minted
  part; a module-private `disciplineOf(line)` (D1).
- `server/src/mud/lib/stuff/Stuff.ts` — the seat-name rung in
  `identityPhrase`.
- `server/src/mud/lib/stuff/__tests__/…`, `lib/craft/__tests__/Assembled.test.ts`,
  `platform/idea/api/__tests__/CraftingLogic.assembly.test.ts` — extend.

**Acceptance.** Unit: a worn (0.4), keen (0.3), named line minted out
reads 0.4 / 0.3 / the name on the loose part; fitted back the line
reads the same; `recipeFor('/trade/smithing/thing/pick-head')` answers
the pick-head recipe and `disciplineOf` a stocked pick's head line is
`smithing`; a billless Weapon's `getSeatName()` is its own `seatName`;
`getPresentation()` of a whole with a named blade line is the name;
`get <name>` matches by keyword. `pnpm test:near` + `lint:family`.

**Commit.** `feat(assembly): a part's own state rides its line — keenness, name, mends, recipe (repair W0)`

> ✅ **W0 done (2026-10-17).** As planned. Notes for review: (1) the fit
> read the part's condition AFTER consuming it (a destructed part reads
> 1) — it is read first now, which the round-trip test caught. (2) A
> crafted whole's line copies `castDiscipline`/`keenness`/`name`/`mends`
> only from a ONE-member slot (`carriedState`); a thirty-stave line takes
> the recipe mark alone. (3) `AssembledMixin.__validateComposition__`
> moved below `fieldMeta` — the dairy's `name.*` owner-scan glitch had
> filed every assembly field under `name.*` in the wiki-spoiler audit;
> repair's review-log entry records the relabel and answers the heirloom
> question (a name is what a thing is CALLED — level 0). (4)
> `disciplineOf` lands unused; W2's mend is its first reader.

### W1 — the fold-back: one kind of thing, one class

**Goal.** The families compose Assembled; Durable/Crafted/Constructed/Keen
where D3–D6 say; the nine twins retire and 24 rows re-point; the cook
pot joins the families; `lint:bills` arms 7–8. Every shipped assembly
still lists its parts and still fits, mends, salvages (AC 12, 13).
Implements D3 (host half), D4, D5, D6, D7. (D14 lands in W5 with the
tinker's rows.)

**Files.**
- Rewrite: `platform/thing/Tool.ts`, `Vat.ts` (absorb `Cask.ts`),
  `Lamp.ts` (absorb `Lantern.ts`), `Chair.ts` (absorb
  `AssembledChair.ts`), `Receptacle.ts`, `Timber.ts` (Durable inside
  Stackable, `condition` stackIdentity), `equipment/Weapon.ts`
  (`Wieldable(Slottable(Keen(Assembled(Crafted(Durable(Constructed(Good)))))))`
  — Assembled inside Keen, since Keen reads outward), `equipment/Garment.ts`.
  Mind the Lamp order: `Assembled(Crafted(Durable(Burner(LightSource(
  Bulkable(Thermal(Good)))))))` (Burner stays outermost of the light
  stack; Lantern already sat outside it).
- Delete: `platform/thing/{AssembledTool,AssembledChair,Cask,Lantern}.ts`,
  `platform/thing/equipment/{AssembledWeapon,AssembledLauncher,AssembledGarment}.ts`,
  `content/trade-mining/src/thing/instrument/AssembledSurveyInstrument.ts`,
  `content/trade-textiles/src/thing/AssembledSpinningTool.ts`, and
  their tests (move the behaviour tests onto Vat/Lamp/Chair).
- Re-point rows (`class:` only): the 7 `AssembledTool` → `/platform/thing/Tool`;
  armchair, bed → `/platform/thing/Chair`; the 5 `Cask` →
  `/platform/thing/Vat`; general-store lantern → `/platform/thing/Lamp`;
  flail, mace, spear, warhammer → `/platform/thing/equipment/Weapon`;
  hunting-bow → `…/Launcher`; leather-boots → `…/Garment`; compass →
  `/trade/mining/thing/instrument/SurveyInstrument`; drop-spindle →
  `/trade/textiles/thing/SpinningTool`. Grep every `AssembledTool|Cask|
  Lantern|AssembledChair|AssembledWeapon|AssembledLauncher|AssembledGarment`
  mention in `packages/**` (tests, docs, help, wire) and fix.
- `server/scripts/check-bills.ts` — arms 7a/7b/7c + **7d** (recipe
  output's Durable class composes Assembled; census 1 → 0 in this wave)
  + arm 8 (census **17** → ceiling **15** after W5; land the arm with
  the ceiling at the current count and lower it in W5); header
  rewritten. ⚠ Arm 7d needs the recipe corpus (`recipes/*.yaml` across
  packs — `anvil-ladder.test.ts:52` shows the walk) joined to the row
  index `effectiveRow` already builds.
- `content/trade-cooking/src/thing/CookPot.ts` —
  `AssembledMixin(ManualBuild(ToolMixin(Durable(ServingVessel))))` (D4;
  the cook pot is one piece; its suite green).
- ⛔ `lib/npc/NPC.ts` is NOT touched (D14 revised) — the tinker's class
  lands in W5 with his rows.
- `server/src/mud/platform/idea/reading/ResponseReading.ts:135` — edge
  line only on an edge/point form.
- `pnpm -C packages/server lint:field-meta --snapshot`.
- Docs: `docs/subsystems/assembly.md` § Host placement rewritten (the
  table of families; the twins' history kept as history),
  `docs/antipatterns.md § A mixin composed on a broad family` — the
  *Do* gains the second honest shape (make the family total: a
  monolith is one piece) with this build as the instance.

**Acceptance.** Every existing assembly, cask, lantern, chair test
green against the family classes; `lint:bills` green with arm 8 at its
census; `lint:instanceable` green; `fit haft to whetstone` → `no-line`
/`one-piece`; `look whetstone` → *It is one piece.*; a found felling
axe's lines carry `form: bladed` for the head (bill `form:`); `look
cook-pot` → *It is one piece.*; arm 7d at 0; `pnpm
test:near` on `lib/craft`, `platform/thing`, `trade-cooking`, every
touched pack's vitest.

**Commit.** `refactor(assembly): the mixin composes on the FAMILIES — a monolith is one piece; the Assembled* twins retire (repair W1)`

> ✅ **W1 done (2026-10-17).** The nine twins are deleted and their **23**
> rows (not 24) re-point. Decisions the build made, for review:
> - **D7 7b found SEVEN rows, not one.** Once `Tool` composes the mixin,
>   every `tangible` two-part recipe output with no bill is parts when
>   crafted and one piece when found: the billhook (W5 declares it), and
>   mining's shovel, sledge, assay kit and miner's dial, drilling's
>   pressure gauge and bailer. Declaring those six means inventing part
>   rows (a shovel blade, a dial body…) and either splitting each trade's
>   one-step make or growing arm 8's census — scope the requirements never
>   touched. **Decided: 7b is census-then-ratchet** (`UNDECLARED_ASSEMBLIES`,
>   seven named with why, may only fall), the shipped behaviour for those
>   six is unchanged (the mint already recorded slot-named lines on an
>   Assembled output — the assembly build's *the pick needs no bill*), and
>   each is its trade's to declare. Lens 2 decided: they already work as
>   parts by recipe, with no code.
> - **Arms 7b, 7d and 8, and `RecipeCatalogue.recipeFor`, read only
>   `tangible` recipes.** A `bulk` recipe FILLS a vessel (the dough fills
>   the trough, the rennet the jar); counting it would have recorded *egg*
>   and *salt* as parts of a trough, and made the trough's mend trade
>   baking. The mint already ran the parts arm for `tangible` only.
> - **7d exempts stock**: `Timber` composes Durable now (D5) and is a
>   recipe output (hafts, grips), but a stave is not a whole — it goes
>   INTO one. A `Stackable` class is exempt; the plan had not seen the
>   collision between D5 and 7d. 7d's census closed at **0** (CookPot).
> - **D8's top-of-ladder seam landed here, not W2**: a one-piece Weapon
>   (now Assembled) walked `repairAssemblyRungs` and asked for the joint
>   catalogue — `repairImpl` reads `isAssembled && !isOnePiece()` once.
> - `fit x to <one-piece>` refuses `no-line`/`one-piece` (*It is one piece
>   — there is nothing in it to fit anything to.*); `FitController`'s
>   mis-bind correction treats a one-piece whole as not made of parts.
> - `ResponseReading` prints `edge:` only for an edge/point form.
> - `lint:field-meta` needed no re-snapshot (its golden does not list
>   runtime-state fields); the wiki-spoiler log gained `Vat.emptySince`
>   (was `Cask.emptySince`) and `Timber.condition`.

### W2 — the mend, and what it reads like

**Goal.** A mend is per line, under the line's trade, at the hand's
band, compounding, derived; a broken metal part is reforged at its
recipe's heat; `look` shows the condition word and the mend; `analyze
condition` shows the detail; `sharpen` reaches every edge and the edged
part inside a whole. Implements D8, D9, D10 (augmenter), D11, D3
(sharpen), AC 1–4, 11.

**Files.**
- `server/src/mud/platform/idea/api/CraftingLogic.ts` — `MEND_BY_BAND`;
  `repairImpl` rewritten: the ladder is (1) reforge or refuse a failed
  line (D9), (2) tighten slack joints (shipped), (3) re-fire (shipped),
  (4) **per-line wear** (D8; a monolith is one line on the host's own
  fields); `RepairSuccess.mended[]/skipped[]`; `captureHostOf(item)`.
- `server/src/mud/api/crafting.ts` — `RepairRequest.hand?`,
  `RepairSuccess.mended/skipped`, `MendOutcome`, decline reasons
  `one-piece`, `wants-fire`, `wants-tool` (detail names the part).
- `server/src/mud/lib/material/Durable.ts` — `durableAugmenter` (D10).
- `server/src/mud/platform/idea/reading/ConditionReading.ts` +
  `content/platform/content/platform/idea/reading/condition.yaml` (D11).
- `server/src/mud/platform/idea/cmd/crafting/RepairController.ts` —
  renders `mended`/`skipped` (*You mend the head; the haft wants an
  edge.*); the pacer picks the kit, anvil or a `cutting` tool.
- `content/trade-smithing/src/idea/cmd/crafting/SharpenController.ts` —
  the edge test by form only (D3); a whole with `edgedLines()` hones
  its lines; the stone wears as before. `sharpen.yaml` help text.
- `content/platform/content/platform/cmd/crafting/repair.yaml` — help:
  *how well it comes back is the hand's*. The `kit` default adds
  `capability.cutting`.
- Tests: `CraftingLogic.repair.test.ts` (new): the band table per band
  (AC 1), two untrained hands → identical result (AC 2), a split haft
  under an expert smith with no carpentry → the head mends, the haft
  is skipped naming carpentry (AC 3), reforge clears a name and grants,
  a monolith mends under its recipe's trade, a found pick's head under
  smithing; `Durable.test.ts` augmenter words; `ConditionReading.test.ts`
  per band; `Sharpen` tests in `trade-smithing/src/__tests__`.
- Docs: `crafting.md § The lifecycle` (the band table, the reforge),
  `instrumentation.md` (the `condition` channel), `assembly.md § repair`.

**Acceptance.** Unit as listed; `pnpm test:near`; `lint:family`.
`help repair` no longer promises *restores fully*.

**Commit.** `feat(crafting): a mend can be done badly — per part, by the trade that made it, at the hand's band (repair W2)`

> ✅ **W2 done (2026-10-17).** Decisions the build made, for review:
> - **`diagnose` landed in W2, not W3**, and it is the SAME ladder run
>   without committing (`runMendLadder(item, hand, commit)`). The reason:
>   `RepairController` answered a failed part up front by CALLING `repair`
>   — harmless while a failed part always refused, a silent instant mend
>   once a failed iron head can be reforged. The controller now reads the
>   diagnosis and refuses before the spell of work only when nothing is
>   mendable (it also refuses *nothing to repair* up front now). W3's
>   quote reads the same faults, so the quote and the mend cannot disagree.
> - Decline reasons stay the shipped ones (`insufficient-heat`,
>   `missing-tool`, `insufficient-input`, `part-failed`, `not-skilled`) —
>   the plan's `wants-fire`/`wants-tool` would have been synonyms with
>   prose already written; `one-piece` lives on `fit` (W1).
> - **The anvil is not a new gate for metal**: the shipped wear rung gated
>   on the fire only and used the anvil as the control instrument when
>   present; kept (the tinker's stop and Berta's smithy both have one).
>   Wood now wants a `cutting` tool (D8) — a shipped wooden monolith
>   needed a mending kit before.
> - **A broken metal monolith is reforged too** (at its recipe's heat; a
>   named one-piece thing loses its name) — D9 applied to the one-line
>   case, so a one-piece sword and a four-part one obey one rule.
> - A line reforged this pass is not also "mended" by rung (4) (an
>   untrained reforge to 0.6 would otherwise have lost a second grade).
> - `Keen.hasEdge()` (its own edge form, or edged parts) is what `sharpen`
>   asks — the controller decides nothing.
> - The skipped-part prose is module-private in `RepairController` (a
>   `CraftingDecline` static raised `lint:lib-statics`; its one caller is
>   the controller).
> - `crafting-lifecycle.acceptance` (smithing) now proves the band: one
>   knife made is a novice smith, whose mend is 0.75; a competent one's
>   is sound.

### W3 — the paid mend is somebody's work

**Goal.** `order repair <thing>` resolves the on-shift hand, diagnoses,
quotes by fault, confirms, mends as the hand, collects the quote, pays
the hand by the seat's basis; nobody on shift refuses in words; the
infirmary line and the Rejection slate go. Implements D12, D19, AC 5–7.

**Files.**
- `server/src/mud/platform/idea/api/CraftingLogic.ts` — `diagnoseImpl`,
  `callHouse` (factored from `resolveMaker`), `hand` on `repairImpl`.
- `server/src/mud/api/crafting.ts` — `DiagnoseRequest`, `Diagnosis`,
  `Fault`, static `diagnose`.
- `server/src/mud/platform/thing/Tariff.ts` — `quoteFor(diagnosis)`,
  `Quote {total, lines}`; the fault→key map and grain multipliers.
- `server/src/mud/lib/commerce/PricedOffer.ts` — `collectMinor`.
- `server/src/mud/platform/idea/cmd/retail/OrderController.ts` — the
  repair arm (D12); `order.yaml` help.
- `content/terminus/content/world/terminus/infirmary/thing/tariff.yaml`
  — drop `repair` (both maps); its header comment.
- `content/rejection/content/world/terminus/rejection/location/provisioning.yaml`
  — drop the slate from `props:` **and delete
  `thing/mending-slate.yaml`** (`lint:reachability` arm R holds
  unreached thing rows at ceiling 0, so an unpropped row fails the
  gate); W5 re-creates it as the tinker's slate at the smelter.
- `content/hearthworks/.../thing/smithy-tariff.yaml` — comment: a
  quote by diagnosis; `prices` may add `tighten: 1`, `reforge: 12`.
- Tests: `OrderController.repair.test.ts` (no hand → refusal; a hand
  → quote lines differ between a slack joint and a broken head on one
  pick (AC 5); the mend records the hand (AC 6); decline keeps the
  coin; a per-settlement seat is paid; a time seat is not double-paid);
  `Tariff.quote.test.ts`.
- Docs: `retail.md § The priced SERVICE` (the repair arm is performed by
  a person; the quote), `employment.md` (a fulfilling hand mends).

**Acceptance.** Unit as listed; the prompt rides `prompt-confirm`;
`lint:family`; `pnpm test:near` on `cmd/retail`, `platform/thing`,
`lib/commerce`.

**Commit.** `feat(retail): a paid mend is the on-shift hand's work — diagnosis, quote, confirm, their band (repair W3)`

> ✅ **W3 done (2026-10-17).** Built to § Parallel builds' P1 shape:
> `CraftingApi.fulfillingHand(giver, tariff, discipline?)` (only the
> Tariff's own house's hands — `PricedOfferMixin.house()`, self-first, the
> same walk `collect` uses), `Tariff.quoteFor(lines)` generic
> (`{key, label, qty}` → `{lines[{…, price|null}], total}`; repair keys
> derive from `repair`, any other unpriced key stays null),
> `NOBODY_TO_WORK` exported from `api/crafting.ts`, `PricedOfferMixin`
> gains `house()`, `houseAccount()`, `canSettle(amount)` and
> `collectMinor(amount, reason)` (`collect(key)` is now a call to it), and
> every `performService` arm returns `{ok, detail, charge?, hand?,
> declined?}` that `doService` settles ONCE. Decisions the build made:
> - **`BankingApi.canSettle(amount)`** is new (read-only: the routing
>   credential's balance, else coin in hand) — `canSettle` needed a payer
>   question the banking surface did not answer; `settle` answered it only
>   by trying.
> - **The Rejection slate MOVED to the smelter instead of being deleted
>   and re-created in W5** — same end state, no row churn; until W5 it
>   refuses honestly (*nobody here to do the work*).
> - The hearthworks tariff prices `tighten: 1` and `reforge: 12` outright
>   (a broken head at Berta's should cost more than its derived 10).
> - A customer saying no (or no interactive at all) is `declined`: nothing
>   done, nothing charged, a `controller-rejected` note `declined`.
> - The quote's prose is module-private in `OrderController`
>   (`faultSentence`, `cureFor`) — `Fault.result === 'short'` is what lets
>   the tinker say *serviceable is the best I can do* before money (AC 9).
> - `fulfillingHand` has no unit test of its own: it is a filter over the
>   shipped `presentFulfillers` + `callFor`; `OrderRepair.test.ts` stubs it
>   and drive 5–8 prove it live.

### W4 — the roster keeps a round

**Goal.** One assignee with several slots at one house holds one shift
and moves station by the hour. Implements D13.

**Files.**
- `server/src/mud/platform/idea/api/EmploymentLogic.ts` —
  `tickBusiness` grouped by assignee; the station map; `moveForShift`
  takes a station path.
- `server/scripts/check-openings.ts` — refuse overlapping on-windows
  for one assignee at one house.
- Tests: `EmploymentLogic.shiftMove.test.ts` (three slots → one
  `beginShift`, two moves, one settle; a station that is not live is
  skipped and taken on the next pass; `ensureOperatorAt` at a stop moves
  the assignee there).
- Docs: `employment.md § Presence and cover` (a round is slots).

**Acceptance.** Existing shift-move and wage tests green; new tests;
`lint:openings`.

**Commit.** `feat(employment): a round is roster slots — one shift, a station per hour (repair W4)`

> ✅ **W4 done (2026-10-17).** The grouping key is assignee + seat (one
> person in two seats is two shifts, as before). ⭐ The station cache is
> `{slot, at}` — the slot index and the path the move LANDED on — not
> "the station": the first cut recorded the slot's station whenever a move
> returned, and a stop that was not standing had fallen back to the
> house's room and counted as reached, so it was never retried (the
> "taken on the next pass" test caught it). `moveForShift` now returns the
> path it reached. The overlap arm lives in `check-openings.ts` (all 62
> houses pass); it has no fixture test of its own — the script is
> main-level code, not a pure function.

### W5 — content: edges, the sword, soles, the cobbler, the tinker, the heirloom

**Goal.** Everything the requirements name in the world. Implements
D14 (the tinker's class), D15–D18, the edge rows, AC 7–10, 12, 14
(content half).

**Files.**
- Edges: `trade-farming/…/scythe.yaml`, `trade-smithing/…/{axe-head,
  adze-blade, drawknife-blade, froe-blade}.yaml` gain `constructionForm:
  bladed`; `trade-forestry/…/felling-axe.yaml` bill part `axe-head` gains
  `form: bladed`; drawknife/froe bills likewise on their blade parts.
- Billhook: `trade-smithing/content/trade/smithing/thing/billhook-blade.yaml`
  + `recipes/billhook-blade.yaml`; `trade-forestry/…/billhook.yaml` gains
  a bill (blade `form: bladed` + handle, `hafting: wedged`) and its
  recipe becomes blade + handle (carpentry, easy, no tools).
- Sword: rows `sword-blade`, `crossguard`, `pommel` (smithing),
  `grip` (carpentry, `Timber`); recipes `sword-blade`, `crossguard`,
  `pommel`, `grip`; `trade-smithing/content/recipes/sword.yaml`
  becomes the fit; `generic-objects/…/arms/sword.yaml` gains the bill
  (D17). Run `anvil-ladder.test.ts` and adjust heats on collision.
- Soles: `trade-tanning/content/recipes/sole.yaml` (leatherwork),
  `trade-tailoring/content/recipes/boot-upper.yaml` (tailoring);
  `trade-tanning/…/thing/round-knife.yaml` (Tool, `cutting`, `bladed`).
  Lower `check-bills` arm 8's ceiling to **15** (17 − sole − boot-upper; D7, P8).
- General store: `general-store/counter.yaml` stock line
  `/trade/forestry/thing/billhook`, par 1.
- Cobbler (D16): `terminus/content/world/terminus/mayfield-row/cobbler.yaml`,
  `cobbler/location/shop.yaml`, `cobbler/idea/outfit.yaml`,
  `cobbler/thing/slate.yaml`, `cobbler/thing/last-and-awl.yaml`
  (`/platform/thing/MendingTool`, `mending`), `cobbler/agent/cobbler.yaml`
  (dossier leatherwork competent, tailoring novice, appraisal competent;
  `idles`); `mayfield-row/street.yaml` exit `cobbler`.
- Tinker (D15): `terminus/content/world/terminus/wharfside/tinker.yaml`
  (zone), `tinker/location/yard.yaml` (exit `bank` ↔ a new `yard` exit
  on `wharfside/bank.yaml`; `cast: [agent/tinker]`),
  `tinker/location/offstage.yaml`, **`terminus/src/wharfside/agent/
  Tinker.ts`** (`CastMixin(StagedMixin(NPC))` — copy `Walter.ts`'s
  shape; D14) and `tinker/agent/tinker.yaml` (`class:
  /world/terminus/wharfside/agent/Tinker`; dossier;
  `props: [/trade/forestry/thing/billhook,
  /world/terminus/general-store/thing/whetstone,
  /world/terminus/general-store/thing/sewing-kit]`), `tinker/idea/round.yaml`
  (the Business, five slots), `tinker/thing/slate.yaml` (the crossroads
  copy; `register`, `prices {repair: 4}`), `delight-road/thing/tinkers-notice.yaml`
  (`Signpost`, the round in `markText`), `delight-road/crossroads.yaml`
  props: the slate + the notice; `hearts-delight/…/thing/tinkers-slate.yaml`
  + `valley-gate.yaml` props; `rejection/…/thing/mending-slate.yaml`
  re-authored as the tinker's and propped at `location/smelter.yaml`;
  ⛔ no `terminus/pack.yaml` boot entries (D15, P9).
- Heirloom (D18): `hearthworks/content/world/terminus/hearthworks/thing/heirloom.yaml`
  + `location/smithy.yaml` props; `NameController` second arm +
  `name.yaml` (`requires: any`, help); a `NameController.thing.test.ts`.
- Pack tests beside the rows (the venue offstage/menu-staff pattern:
  `world/<venue>/__tests__/`), `lint:dossiers`, `lint:menu-staff`,
  `lint:openings`, `lint:boot-entries`, `lint:mass`, `lint:bills`.
- Docs: `vocations.md` cooper/carpenter rows refreshed (the
  requirements flag them stale); `Gus.ts`'s header gains the fifth
  receipt (one line: the tinker).

**Acceptance.** `lint:family` green; every pack suite touched green;
`pnpm test:near`; the content tests prove: the cobbler's house calls,
the tinker's house has five stations and the slates' paths, the
heirloom's blade line is named, the sword's bill weighs ≤ 1.0 kg.

**Commit.** `content(repair): edges, the sword in four parts, soles, the cobbler, the tinker's round, the heirloom (repair W5)`

> ✅ **W5 done (2026-10-17).** Decisions the build made, for review:
> - ⭐ **A new Joint row, `peened`** (platform pack; tool `striking`,
>   smithing novice, **`reversible: effort`**, pommel lost). D17 named
>   `riveted`, which is `reversible: never` — a riveted sword could never be
>   taken apart, and drive 9 / AC 14 (*draw the blade, re-hilt it*) need
>   exactly that. A sword's tang peened over its pommel is the one joint a
>   smith expects to undo.
> - **The sword's parts are `blade · guard · grip · pommel`** — AC 12's own
>   words — not the plan's `sword-blade`/`crossguard` part names (the ROWS
>   are `sword-blade`, `crossguard`, `pommel`). ⚠ Risk 8 stands: a billed
>   slot takes a thing by row OR keyword, and a drawknife blade answers
>   `blade`; harmless unless someone fits one to a sword.
> - **The grip is carpentry's existing `handle` row** (*a short grip of
>   wood, shaved round and bored for a tang*), so no `grip` row or recipe;
>   masses: blade 0.55 + guard 0.12 + grip 0.2 + pommel 0.13 = the sword's
>   1.0 kg.
> - **The sword is fitted COLD** (`toolCapabilities: []`, no heat) like the
>   spear/mace/warhammer/flail/shield — `anvil-ladder.test.ts` holds that
>   every fitted arm is so; the peened joint gates the hammer. The test now
>   lists `sword` among the assembled arms and `sword-blade` among the
>   forged.
> - The billhook's `stock` slot became `blade` (arm 3: slot = part name);
>   the billhook recipe moved from mining to carpentry (the hafting), the
>   blade to smithing. `UNDECLARED_ASSEMBLIES` 7 → 6, `UNMADE_PARTS`
>   17 → 15.
> - The tinker's dossier `archetype: smith` (archetypes are rows; there is
>   no `tradesman`), and his seat `fulfills` leatherwork too (his kit is a
>   sewing kit; a boot on the road is his).
> - ⭐ **`lint:location-graph` no longer counts an `Offstage` as a walkable
>   place** — its invariant is that nothing leads there, so every venue
>   with an offstage read as an "unreachable room" by construction (the
>   market's was called news in the first run). The ceiling FELL 13 → 12;
>   the cobbler's and tinker's offstages are not counted.
> - The general-store tests' pack-prefix tables gained `/trade/forestry/`
>   (the billhook); `terminus/package.json` gained `trade-forestry`.
> - The yard slate is propped in the yard (it was only in
>   `operatingLocations`; `lint:openings` and arm R caught it).

### W6 — the drive, the suite, the MR

**Goal.** `packages/wire/tests/repair.dirty.wire.test.ts` runs the
requirements' drive **1–10 and 12** (the restart) against the real
socket on `WIRE_PORT` 2016 — drive 11 is W7's and is appended to the
SAME file when W7 lands; the record lands in this plan; `pnpm test`
once; MR.

**Files.** (W5 also: `terminus/package.json` gains `trade-forestry`; `pnpm install`.) The wire file (`DIRTY_REASON`: buys out the store's billhook
and whetstone and Rejection's pick, clones iron and a billet into the
smithy, stokes and lights the smelter furnace, appoints a player to the
cobbler's seat, moves the clock by hours); `docs/plans/repair-plan.md`
§ Drive record; `docs/subsystems/*` final pass; `CLAUDE.md` index lines
are left to the sweep.

**Drive notes the build must honour.** Hold the thing (held is not
floor). `look` the stop room before asserting the tinker (the arrival
look is what brings his house current). Stoke and light the smelter
furnace at Rejection before step 6 (`stoke charcoal into furnace`,
`light furnace`; charcoal from the fuel yard or a clone). Answer the
quote through `awaitPrompt`/`answerPrompt`. Break the heirloom's blade
for step 9/AC 14 by a wizard write (`eval`) or repeated strikes — assert
`failed` on the line first. Each checkpoint asserts a STATE CHANGE read
back; `refusedFor` is blind to `command-rejected`. Restart last.

**Commit.** `drive(repair): the requirements' drive, 1–10 + the restart, on the real socket` then the MR.

> ✅ **W6 done (2026-10-17).** The drive is green, 13/13 (§ Drive
> record): five game defects fixed on the way (the whole-bar stock bound,
> the proprietor's own shift read as a cover, house identity by path,
> leather the cobbler could cut, a doubled price), two recorded for their
> owners (a proprietor's house never shuts; a consigned good at a `props:`
> counter is not placed after a restart). Drive 11 (building upkeep) is
> W7's and lands with it.
>
> ⚠ **The full suite found two W1 regressions the drive could not**
> (`76b715056`): `Receptacle` composing `CraftedMixin` made every plain
> jug of water a "product" that `wash`/`rinse`/`cool` skip (on a bulk
> holder Crafted means the BATCH's identity — Receptacle is Durable and
> Assembled only now); and the folded `AssembledChair`'s `min(1, …)` cap
> flattened every bed and cot to a stool's rest quality. The lesson for
> W1-shaped work: composing a mixin onto a family changes what every
> `isX` site means for that family — grep the predicate's callers, not
> only the mixin's methods.

### W7 — building upkeep (⏸ gated: the rubber build on master)

**Gate.** Do not start until rubber's W0 is on `origin/master` (`git
log origin/master -- packages/server/src/mud/lib/spatial/Exposure.ts`
shows a commit). **If rubber has not merged when W6 is done, W6 opens
the MR without this wave and W7 ships as its own follow-up MR** off the
merged repair branch, adding drive step 11 to the same wire file (the
requirements' Placement). ⚠ That is the EXPECTED path — rubber is a
plan with no code today. **State on 2026-10-17:** `origin/reqs/rubber`
= `a2e688ff1` (dairy merged in), 8 docs files, zero `packages/`
changes; its plan now carries its own BUILD GATE waiting on this plan
and storage-and-ice to settle before it builds, and its re-plan moved
its moulds onto dairy's system (nothing W7 reads changed: D1/D1a/D2/D4
as cited in § Grounding). `origin/reqs/storage-and-ice` = `5cf06785a`,
likewise docs only. Re-run the `git log` check before starting W7.

**Re-ground first** — write the findings into § Grounding before any
code: `getEnclosure()` / `getRoof()` return shapes and `roofDefaults()`
(`lib/biome/Atmospheric.ts`); `lib/spatial/Exposure.ts` (`exposure()`,
`Face.areaM2 / exterior`, `top`); the resolved layer list in
`Enclosed.ts`; `check-envelope.ts` clause (e); the brick material's
path; whether rubber's census pass touched the dorm or Seznick rooms;
whether the ice build's sawdust landed; `trade-glass`'s
`GlazeController` capability. Then D20–D27 in order.

**Files.**
- Kernel: `lib/material/Material.ts` (`weatheringDays`, `laying`,
  fieldMeta `authorable`, getters); `api/crafting.ts` +
  `CraftingLogic.ts` (`mendTerms`); `platform/idea/Business.ts` +
  `lib/employment/*` (`orderShortfall`, `receiveBench` moved out of
  `lib/behavior/restocks.ts`, which now calls them);
  `cmd/perception/SurveyController.ts` (`fabricReport` by shape → the
  cure lines); platform Discipline rows `masonry.yaml`, `thatching.yaml`.
- Material rows in **`base-library/content/stuff/idea/material/`** (not
  generic-objects — P5): `organic/thatch.yaml`, `mineral/lime-plaster.yaml`,
  each authoring `thermalConductivity` (rubber's `lint:envelope` clause
  b) and `waterAbsorptionCapacity` (ice's wet law); `weatheringDays` + `laying` on slate,
  oak, pine, ash, glass (brick on rubber's row); goods
  `stuff/thing/building/{reed-bundle, slates, lime-sack}.yaml`
  (Stackable, `mass`), `/trade/carpentry/thing/plank.yaml` (`Timber`) if
  none exists; tools `stuff/thing/tools/{trowel, leggett}.yaml`
  (`class: /system/residence/thing/UpkeepTool`); general-store
  `counter.yaml` + the timber yard's counter stock lines.
- Residence pack: `src/idea/HoldingWarren.ts` (D20, D23, D24);
  `src/thing/UpkeepTool.ts` (rename of `HouseholdersKit.ts`; the kit
  row re-pointed); `src/idea/cmd/crafting/MaintainController.ts` (D25);
  `maintain.yaml` (help); `src/behavior/maintains.ts` (D26; config
  gains `board`, `bench`, `cupboard`, `reward`).
- Locality content: `college.yaml`, `agency.yaml` → Business + lobby
  props; `katie.yaml` / `walter.yaml` brain config; the dorm, Seznick
  and Hinkley rooms author `enclosure:` + `roof:` (D27); ⛔ no boot
  entries (P9) — the keepers act while their building is loaded; the
  fabric reconciles on read.
- Tests: `HoldingWarren.test.ts` — the two-clocks test **extended,
  never replaced** (a layered holding AND the spanner over one game
  year: the lime goes, the slate barely moves, the band is the lime's,
  the spanner unchanged; an unlayered holding as before);
  `MaintainController` — refusals naming the good + count in words and
  the wrong tool; untrained → ceiling 0.6, grade down, patch recorded,
  twice the pace after; competent → sound; the unlayered path
  unchanged; `SurveyController.test.ts` — the digit regex over the cure
  line; `maintains.test.ts` — orders when short, lays when stocked,
  weathers when the house is broke; `Material.test.ts` — the defaults;
  the `restocks` suite green after the move; `lint:field-meta
  --snapshot`.
- Wire: drive 11 appended to `repair.dirty.wire.test.ts`:
  `advanceWorldClock` a season; `survey` at the dorm (the lime line, the
  cure in words, no digit); `maintain` refused naming lime; `buy lime`;
  `maintain` untrained → *short*; `survey` → *the patch is poor*; fund
  the hall's account, `look` the lobby (brings the house current),
  watch Katie post the bounty, take it (buy, deliver to the bench),
  watch the dorm come back sound; drain the account by wizard write →
  a season later it weathers. Step 12's restart re-asserts the patch.
- Docs: `holding.md § Condition`, `race.md` (the two Material fields),
  `employment.md` (`orderShortfall` / `receiveBench`), `behavior.md`,
  `vocations.md` (thatching, masonry: demand with no supply).

**Acceptance.** AC 15–17 by unit + drive 11; `lint:family`; the
residence, terminus, eternal-university, hinkley-hills, generic-objects
suites; `pnpm test:near`.

**Commit.** `feat(residence): a building is kept up layer by layer — materials in hand, the laying trade's band, the keeper's par sheet (repair W7)`

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| mend per part | `repair` (shipped) | `AssembledMixin` env+peers on every family; `MendingTool`; anvil kinds | `MEND_BY_BAND`, recipe index | none (load-on-use) | `requires: DurableMixin` — every family composes it |
| reforge | `repair` | same | the line's recipe heat/tools | none | same |
| sharpen a tool / a part | `sharpen` (smithing pack) | carried whetstone (`environment`) | `constructionForm: bladed` on the row / `form:` on the bill part | none | `requires: KeenMixin` — Tool composes it now |
| condition word | `look` | Durable augmenter | — | — | — |
| appraisal detail | `analyze condition` | the flat `analyze` verb | the reading row | `ReadingCatalogue` warms by infix on first dispatch | `subjectRequires: [DurableMixin]` |
| one piece | `fit`, `look` | Assembled env+peers | no bill | — | `whole` arg `requires: AssembledMixin` — now any family |
| paid mend | `order repair` | `Tariff` peers+env | `services {repair: repair}`, prices | `ensureOperatorAt` on the act | the hand: `presentFulfillers` → `callFor` (house needs `call:`) |
| nobody on shift | `order repair` | same | roster slots | the house attached by `operatingLocations` | — |
| the round | — | — | five `rosterSlots` with `station` | none — arrival at a stop brings the house current (P9) | the stop room must be live for the move; arriving makes it so |
| the notice | `read` | `Signpost` peers+env | `markText` | — | — |
| the cobbler's seat | `apply`, `clock on` | the opening derived from `headcount` | `requires {leatherwork, novice}` | the house stands up on arrival | `lint:openings` vocabulary |
| the name | `name` | `Avatar` self (shipped) | `nameGrant` on the line | — | `requires: any` + both arms checked in the controller |
| the heirloom | `look`, `get`, `salvage`, `fit` | props of the smithy | the row's bill with `name:` | the smithy stands up on arrival | — |
| a layer weathers (W7) | `survey` | actor-side beside `look` (shipped) | `enclosure:` / `roof:` DECLARED on the member rows; `weatheringDays` on the material; `exposure()` exterior faces | the holding wakes with its room | — |
| the cure in words | `survey` | same | `laying.good`'s `mass`; `inWords` | — | — |
| lay a layer | `maintain` | `UpkeepTool` env on whoever holds it (kit, trowel, leggett) | `laying` on the material; the good in hand; `mendTerms` | — | the `kit` arg's `capability.upkeep` — every laying tool carries it |
| the keeper buys | (`job post`, `get`, `maintain` as literal verbs) | — | the house's `parLines`, `purchases`, `banksAt`; the bench + cupboard props; the brain config | none — the keeper acts while the building is loaded (P9) | the house must fund escrow; refused → weathers |
| the materials exist | `buy` | the store counter | stock lines | the store stands up on arrival | — |
| sole / upper | `sew` (tailoring's shipped verb — `SewController` runs any installed recipe wanting `mending`; the recipe's OWN discipline is credited, so the sole credits leatherwork). ⛔ No new `cut` in tanning: tailoring's `cut` is the cloth-pattern act and the collision ladder's first rung is *unify behind the verb that exists* | the needle-case / the cobbler's last-and-awl (`mending`) in the room | the two recipe docs (`toolCapabilities: [mending]`) | `RecipeCatalogue` | — |

Each fails closed and silent; the drive is what proves each link.

---

## Acceptance-criteria coverage

| AC | wave(s) |
|---|---|
| 1 untrained short + a grade; again a grade; competent sound | W2 (unit) · W6 (drive 3) |
| 2 same band, same result | W2 (unit; no draw anywhere) |
| 3 a split haft needs carpentry | W2 (unit: expert smith, no carpentry → haft skipped) · W6 (drive 6) |
| 4 look says worn/mended; appraisal the detail; survive restart + sale | W2 (augmenter + reading) · W0 (persisted on the line) · W6 (drive 10, 11) |
| 5 fault + price named first; prices differ by fault | W3 · W6 (drive 5) |
| 6 nobody on shift refused; on shift at their band, their name | W3 · W6 (drive 5) |
| 7 infirmary and shed offer none | W3 (removal) · W5 (the shed's slate is the tinker's) |
| 8 tinker at each stop at its hour, watched or not; notice readable | W4 + W5 (arrival brings the house current) · W6 (drive 6, after `advanceWorldClock`) |
| 9 metal well, wood poorly, says so first | W2 (bands) + W3 (quote) + W5 (dossier) · W6 (drive 6 at the smelter) |
| 10 cobbler re-soles; a player holds the seat and is paid | W5 + W3 (piecework) · W6 (drive 7, 8) |
| 11 every edged tool sharpens; honed loose stays keen fitted; worn removed stays worn | W0 + W1 (Timber Durable) + W2 (sharpen) + W5 (forms) · W6 (drive 4) |
| 12 parts or one piece; the sword's four | W1 + W5 (sword) · W6 (drive 1) |
| 13 every shipped assembly still lists/mends/fits/salvages | W1 (every existing test + `assembly.dirty.wire.test.ts` stays in the suite) |
| 14 heirloom keeps its name re-hilted and drawn; hilt nameless; reforged loses it, reforger names once | W0 (seat on the line) + W2 (reforge grant) + W5 (row) · W6 (drive 9) |
| 15 a season unwatched → `survey` names the layer and its need; slate and thatch differ | W7 (unit: two layers one year; `fabricReport`) · W7 drive 11 (`survey` after a season) |
| 15a an un-opted building (the smithy) and an un-opted material (sawdust) are unchanged after the season | W7 (unit: D20a both opt-ins; the supply pin) · W7 drive 11 |
| 16 `maintain` lays the named material by its trade at the hand's band; refused without it; short + readable untrained; a durable beside it unchanged | W7 (unit: refusal words, band table, the extended two-clocks test) · drive 11 |
| 17 the dorm stays kept while its employer can buy, weathers when it cannot | W7 (`maintains.test.ts`: stocked → lays; broke → nothing posted) · drive 11 (fund, watch; drain, watch) |
| 18 the drive end to end incl. restart | W6 (1–10, 12) · W7 (11, and 12 again in its own MR) |

Nothing unmapped.

---

## Test & gate strategy

- **Unit** (per wave, `pnpm test:near` + each touched pack's vitest):
  the band table and compounding; determinism (two hands, one part,
  equal records); per-line discipline from both reads; state in and out
  of a whole (condition/keenness/name/mends); the fold-back (every
  existing Cask/Lantern/Chair/assembly test moved onto the family); the
  one-piece refusal and look line; the quote arithmetic and the fault
  keys; hand resolution + refusal; piecework vs time pay; the roster
  grouping; the name grant; the reading per band; NPC props.
- **Content tests beside rows**: the cobbler's and the tinker's houses
  (call policy, stations, slates in `operatingLocations`), the heirloom's
  named line, the sword's bill mass, the anvil ladder.
- **Lint**: `pnpm -C packages/server lint:family` after every wave; the
  gates named in § Convention conformance; `lint:field-meta --snapshot`
  once in W1.
- **Only the drive proves**: the quote prompt over the socket, the
  tinker at a stop after a clock jump in a world nobody watched, the
  cobbler seat's wage landing, the restart, every prose line a player
  reads (read the words — a substring match is blind to the sentence).
- **The two clocks** (W7): `HoldingWarren.test.ts:611` is extended, not
  replaced — one game year over a layered holding AND a durable good in
  it: the lime layer goes, the slate barely moves, the good is
  unchanged; and nothing on a Good reads `weatheringDays` (a grep-level
  assertion in the Material test: no `lib/material/Durable.ts` import
  of it).
- `pnpm test` runs **twice in the cycle**: before the MR opens (W6) and
  at `/finalize`. Never in the background. ⚠ If W7 ships as its own MR
  it runs once more, before that MR.

---

## Risks & opens

1. **Requirements conflict (resolved in-plan, for the user's eye).**
   § 8 says *hot metalwork waits for a smithy* and drive 6 says *he
   mends the head well*. The plan reconciles them physically: a WORN
   head mends at 900 K and a BROKEN one at the recipe's 1200 K (D9), and
   the tinker's Rejection stop is the **smelter** (furnace + anvil),
   not the provisioning shed — the shed has no fire. Drive 6 must run
   there with the furnace lit. If the user wants the shed, a fire must
   be authored in it (a `Forge` row), which makes Rejection a smithy.
2. **AC 8's *walks a round* is met by presence at stops, not by a walk.**
   The hourly teleport is the shipped presence mechanism (Berta); a
   watched tinker vanishing from the crossroads is a lens 3a cost this
   plan accepts and names as a deferred seam. Say if that is wrong.
3. **D14 (revised 2026-10-17) follows the Katie chain instead of
   widening `NPC`** — a fifth `CastMixin(StagedMixin(NPC))` pack class.
   Owner's eye on the shape it leaves behind: `Gus.ts` already calls
   for the kernel split (`props:` apart from `cast:`, so a *person with
   a loadout* is a row and not a class), and this build makes it five
   receipts. Deferred seams names it; nothing here depends on it.
4. **D3 adds `ConstructedMixin` + `KeenMixin` to `Tool`** — 67 rows and
   ~25 subclasses (the anvil, the loom, the assay bench among them)
   gain an inert edge gauge and an optional form.
   `responsePipsAugmenter` prints delivery pips on a billhook; a
   hammer's `analyze response` line must not read *edge* (fixed in W1).
   If a gate (`lint:inert-weapon`, `lint:capabilities`) objects to a
   `bladed` Tool, the build reports rather than widens the gate.
5. **`Timber` becomes Durable with `condition` as stack identity** —
   a worn haft never merges; a sound one merges as today. Confirm no
   test asserts stacks merge regardless of condition.
6. **Anvil signatures** for the four new blade/hilt recipes are chosen
   off the list computed 2026-10-17 (§ Grounding) and are free;
   `anvil-ladder.test.ts` is the gate — adjust heats, never duplicate,
   never add to `KNOWN_TIES`.
7. **`Receptacle` composing Assembled/Durable/Crafted** reaches odd
   rows (`air-compressor`, `flask-of-vitriol`, the `spent-grain`
   sacks). They read sound and one piece; honest, slightly silly. The
   owner's ruling lists the family.
8. **`fit` raise for the sword** needs the gather to draw four named
   parts; the pick proves two. Verify the keyword/row matching for
   `blade`/`grip`/`crossguard`/`pommel` (no colliding keywords — `blade`
   is a keyword on every blade row; the part NAME must match the slot
   name and the bill part; drawknife's bill already uses `blade` — the
   gather matches *a thing that IS that part (its row, or its keyword)*,
   so a drawknife blade in reach could answer a sword's `blade` slot by
   keyword. Name the sword's part `sword-blade` to be safe.) ⚠ The same
   seam, found at re-ground: dairy's cheese `hoop` row carries the
   keyword `hoop`, and the cask's bill part is `hoop` — a cheese hoop
   in reach of a cask raise could be drawn as a cask hoop by keyword.
   Not this build's defect (the fold-back changes no matching), but W1's
   cask tests should add the one case: a `/trade/dairying/thing/hoop`
   in the room does not satisfy the cask's `hoop` slot (row lineage
   wins; keyword is the fallback — verify which the gather tries first).
9. **The cobbler's `requires: {leatherwork, novice}`** — the drive's
   player must `practise leatherwork` to apply; `lint:menu-staff` rule
   on dossiers vs offered difficulty does not apply (no menu).
10. **Overlapping roster windows** for one assignee: refused by the new
    `lint:openings` arm; the tinker's are disjoint.
11. **The sole/upper recipes' verb — decided.** `carve` is wood-only
    (`CARVING_STOCK = 'wood'`), tailoring's `cut` is the cloth-pattern
    act, tanning affords only `tan`, and `make` runs def'd scripts. Both
    recipes ask `mending` and are run by tailoring's `sew`, which runs
    any installed recipe wanting `mending` and credits the recipe's own
    discipline (`leather-jerkin` is the precedent). The cobbler's shop
    therefore props a `/trade/tailoring/thing/needle-case` beside the
    last-and-awl so `sew` is sayable there (D16).
12. **The rubber dependency is a PLAN, not code** (W7). `reqs/rubber`
    is docs only (re-checked 2026-10-17 at `a2e688ff1`; its own build
    gate now waits on THIS plan settling, so the two cannot both be
    waiting — repair goes first, W7 follows rubber). Expect W7
    as the follow-up MR; re-ground against the merged files, treating
    § Grounding's rubber paragraph as the contract to re-check when
    shapes drift.
13. **Requirements wording, listed not absorbed.** (a) *What already
    exists* calls layered walls *the rubber build (in flight)*; rubber
    is PLANNED, not built, so the fallback (W7 as its own MR) is the
    likely path. (b) The requirements' Non-goals link
    `../slates/builds/clinical-medicine-slate.md`, which the 2026-10-16
    slate cleanup moved to `docs/slates/tails/`; `assembly-slate` is
    linked correctly under `tails/`. (c) § 5 names *a cast pot* as one
    piece — true of `CookPot` only once D4 reaches it (it does now);
    and it says *vessel … container* broadly, which this plan reads as
    the Durable families (a glass is not mended). Owner's eye on all
    three; no plan change beyond D4's `CookPot`.
14. **Katie's and Walter's "employers" are Organizations with no
    money.** D26 makes both Businesses with an account; the economic
    bootstrap must FUND them (re-ground how the tailor's shop's account
    is seeded) or AC 17's *while its employer can buy* is vacuous on
    day one. Owner's eye: the university paying for its own roof is the
    first institution with a bill, reaching the committee that holds
    the hall.
15. **No RGO makes reed, lime plaster or slate tiles**; the general
    store mints them (the producer-stock convention — honest within the
    shipped rule, a real gap: reed beds, lime burning, the quarry's
    slate → `vocations.md`). The two new Material rows (thatch, lime
    plaster) are vocabulary decisions under the closed-library rule —
    properties differ from everything shipped; owner's eye.
16. **Two new Discipline rows** (`masonry`, `thatching`) with no trade
    pack. Re-ground 2026-10-17: there is no list — `DisciplineCatalogue`
    warms every row under an `/idea/Discipline/` path (the platform's
    37, forty-odd pack rows incl. dairy's `dairying`); two files in
    `content/platform/idea/Discipline/` beside `smithing.yaml` suffice.
17. **`HouseholdersKit` → `UpkeepTool`** is a pack-internal class rename
    (one row's `class:`, the suite's import, `holding.md`); no
    migration. If the owner keeps the kit's name, the trowel and leggett
    become rows of `HouseholdersKit` and the name lies a little.
18. **Rubber's lone-place rule makes every dorm room's roof exterior**
    (no storeys on the hall) — harmless for a one-room holding; the
    storeys are rubber's content or the structures-slate's.
19. **`mendTerms` is the ONE seam between `maintain` and `repair`'s
    band table** — never copy the numbers into the pack.

---

## ⭐⭐ Parallel builds (2026-10-17) — rubber · cleanliness · repair · storage-and-ice

Four builds start together from the same master in four worktrees:
**rubber** (build-1, `reqs/rubber`), **cleanliness** (build-2,
`reqs/cleanliness`), **repair** (build-3, this), **storage-and-ice**
(build-4, `reqs/storage-and-ice`). Read beside
`docs/plans/repair-note-to-siblings.md` (the asks we sent) and each
sibling's own § Parallel builds / note files.

### Merge order — ✅ DECIDED by the owner (2026-10-17)

> **storage-and-ice and repair (W0–W6) first, in either order; then
> rubber; then cleanliness; repair W7 after rubber, its own MR.** This
> supersedes rubber's note's fixed *ice → rubber → repair → cleanliness*.
> ✅ The owner also **approved storage-and-ice's two boot entries**
> (`BOOT_ENTRY_CEILING` 83 → 85, a dated line naming ice); repair still
> adds none.


1. **storage-and-ice** and **repair W0–W6** — either first; whichever is
   ready. Neither needs the other's code.
2. **rubber** — after both (it folds into ice's `envelopeSteadyStateK`
   and consumes ice's wet law; it re-counts `lint:biome-sky` with
   repair's new rooms in it).
3. **cleanliness** — after all three (it authors `roof:`, rubber's field;
   it consumes repair W3's service seam). ⛔ Never before rubber.
4. **repair W7** (building upkeep) — after rubber; before or after
   cleanliness. Its own MR.

**The second to land on any shared file** merges master first, resolves,
regenerates, and re-runs the named tests below. Nobody hand-merges a
generated file.

### Artifacts every build touches — the rule for each

| artifact | rule |
|---|---|
| `scripts/__fixtures__/field-meta-golden.json` (+ `field-tags-golden.json`, `unconsumed-seam-shapes.ts.txt`) | never hand-merge: resolve code, then `pnpm -C packages/server lint:field-meta --snapshot` |
| `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` + `.snap` | keep EVERY build's review-log entry, in landing order; regenerate the `.snap` with `-u` only once each new field has its entry. Repair's entry: `Durable.mends`, `Assembled.seatName/nameGrant`, the `PartLine` additions, `Crafted.castDiscipline`, W7's `weathers/weatheringDays/laying/fabric` — ⚠ decide in the entry whether an un-revealed heirloom's `seatName` is a spoiler |
| list ratchets (`lint:biome-sky` list, `AUTHORED_TEMPERATURES`, …) | union of additions minus union of removals, re-run the script |
| numeric ceilings (`LIB_STATICS_CEILING`, `SEAM_CEILING`, `CLOSED_VOCABULARY_CEILING`, …) | write the merged tree's ACTUAL count, ≤ master's; if not, fix code, never the number |
| `BOOT_ENTRY_CEILING` (83) | rises only with the owner's sign-off — ✅ **approved +2 for storage-and-ice** (→ 85, a dated line); **repair adds none** (P9) |
| `Mixins` / `MixinApi`, `CLOSED_BY_DESIGN`, `AppSettings`, settings yaml, the general store's `counter.yaml`, `Material.ts` fieldMeta | take both; one copy of anything two builds both add (`wetness.impermeableBelowPct`, `permeability()/wetProperty()`) |
| root/pack `package.json`, `pnpm-lock.yaml` | take both; `pnpm install` regenerates the lock |
| `docs/slates/README.md` | `./tools/slate-index` |
| `CLAUDE.md` | index lines at each build's `/finalize`, take both |
| subsystem docs (`employment.md`, `retail.md`, `crafting.md`, `race.md`, `ground.md`, `thermal.md`, `mould.md`) | section by section, keep both; ⚠ `appraisal`'s *first readers* are Condition (repair) **and** Stock (ice) |

### Repair × storage-and-ice (ice's six asks — all accepted)

✅ Both directions settled: ice applied repair's four asks back (`origin/reqs/storage-and-ice` 48fbdb199 — FireController + Pool.ts in its table, `unpackIntoCold` pinned by a W9 test, the storage-slate poolKey seam, its wiki-spoiler entries) and agrees the merge order.

| shared | resolution (both builds follow) |
|---|---|
| `CraftingLogic.ts` | ice W0's template-choice helper (an off-spec lump by `metal` tag → `MetalCasting`) sits inside repair's `:3215–4000`; the second to land re-applies it. Ice's salvage test uses a `Tool`, so it passes Assembled or not. |
| `EmploymentLogic.tickBusiness` (repair W4 ↔ ice W8) | repair's grouping keeps **`Roster.evaluate(assignment, clock)` per slot as the ONLY on-test**, with the clock that carries ice's `season`; the station map rides on top. The second lander adds a test: one grouped assignee with seasonal slots. |
| `check-openings.ts` overlap arm (repair W4) | **season-aware from the start**: two windows overlap only if days, hours AND season sets intersect (absent = all seasons) — winter-only and summer-only do not; winter-only and year-round at the same hours do. |
| `restocks.ts` → `BusinessMixin.receiveBench` (repair W7) | carry ice's named branch **`unpackIntoCold`** and its `cold:` config **whole**; ice pins it with a unit test so a dropped branch fails loudly. |
| `perceivedGoods` (repair D26) | it never descends into a shut `Sealable` — the lobby **store cupboard is not Sealable** (or stands open), or Katie's par sheet never sees the lime. |
| ice tools (Scraper, IceMarker, IceSaw — `Tool` subclasses) | one-piece Keen hosts under W1; no `constructionForm` now; ice pins no `look` text for them; **after both land, a one-line follow-up makes the spud `bladed`** (the saw stays unbladed — filing a saw is not honing → carpentry-slate). |
| sawdust | **ice's row** (`/stuff/idea/material/wood/sawdust`); repair authors nothing on it (`weathers` false, `laying` null by default); W7's AC 15a test uses a **fixture** material, never ice's row. |
| the icehouse opt-in (D20a) | `WeatheringMixin` goes in the kernel's `lib/`; D20a and Deferred seams name **ice's two `Structure` rows** (or their programme) as the future composers. Ice does nothing now. |
| Timber in a store (ice's deferred timber-yard-on-a-store) | a Durable poolable keys its condition band into `poolKey()`; a store never calls `wear()` (the two clocks). Ice records it on storage-slate. |
| repair Risk 11's wording | after ice lands, *"tailoring's `cut` is the cloth-pattern act"* is stale (`cut` becomes a kernel view over `Cuttable`); reword, behaviour unchanged. |

### Repair × rubber

✅ **Rubber's note (`origin/reqs/rubber:docs/plans/rubber-notes-to-parallel-builds.md` § To repair, a2f9da83f) — answered:**
1. **Accepted.** W7's re-ground reads the RAW getters (`getEnclosure()`/`getRoof()` → spec · list · `'none'` · null), never `resolveEnclosure()`, for layers; `'none'` is legal for both keys; `Exposure.walls[]` carries interior faces with `exterior: false`, and a layer's wall area = Σ exterior wall faces (stored on `LayerState`, P6).
2. **Noted.** An exit is an open side only when the place across it is outside — the dorm corridor's doorless exits are not missing walls.
3. **Accepted** (already P5): brick and canvas are rubber's rows; thatch and lime plaster in base-library.
4. **Accepted.** `packages/server/scripts/check-biome-sky.ts` is in W7's files: W7 deletes the ceiling-list lines for rows it authors both keys on.
5. **Accepted (corrections to D27):** `steps` stays open; Hinkley `lots/yard` is outdoor; Seznick's layers go on its own room rows, never the shared `/stuff/location/room/*` rows; `cistern` only if its drown-here tests still pass.
6. **Accepted.** Rubber's boots/gloves/apron are one-piece casts mended by the monolith path under the boot-mould's `castDiscipline` (chemistry); repair's D1 test gains the rubber-boot case once rubber lands, and D1's grounding line *"no shipped cast composes Crafted except the Wheel"* is stale from then on.
7. **Already in the plan (P3):** the stock draw is the same MATERIAL path first, then a family tag, never `organic` — so a rubber good is mended from rubber stock; a raw-rubber patch is exactly that draw. If no rubber stock is in reach the mend refuses naming it (no leather patch).
8. **Noted.** Rubber's moulds and coagulating pan state iron; repair's metal path mends them.
9. **Accepted.** W5 adds `trade-forestry` to `terminus/package.json` (the tinker's billhook prop) and re-runs `pnpm install`; `Mould.ts` separate hunks; counter keep-all; goldens regenerated.
10. **Noted.** `moulding-slate.md` lands with repair; rubber fixes its citation at its own merge if repair has landed, else repair does at its.

✅ **Merge order — resolved by the owner (2026-10-17): ice and repair W0–W6 first (either), then rubber** (see § Merge order). Was: Rubber's note fixes **ice → rubber → repair → cleanliness** (repair whole, after rubber). Storage-and-ice and cleanliness both recorded **storage + repair W0–W6 (either), rubber, cleanliness, repair W7**. Repair W0–W6 needs nothing of rubber's (rubber's pieces repair uses — brick, layers, `exposure()`, `lint:biome-sky` — are all W7's), so either order is safe for the code; repair is happy to land W0–W6 after rubber if that is the agreed order. The owner decides; until then, the owner rule stands (one named owner per shared piece, `// DROP AT MERGE` local copies).

| shared | resolution |
|---|---|
| `lib/mould/Mould.ts` | rubber edits `holdsCast` (D10), repair one line in `carryPayload` (D1); the second lander keeps both and re-runs `Mould.test.ts`; rubber extends its `FireController.mould-shape` test to assert `castDiscipline`. |
| `Material.ts` fieldMeta + material rows | take both (rubber: `lightAbsorption`, `elasticity`, `crosslinking`; repair W7: `weathers`, `weatheringDays`, `laying`). |
| **brick** | **rubber authors** `base-library/.../material/ceramic/brick.yaml` (density, specific heat, `thermalConductivity`); repair W7 adds `weatheringDays`/`laying` and leaves it **`weathers: false`** (no brick supply until moulding's brickmaking). |
| **rubber boots** (ask to rubber) | a **standalone** `/trade/rubber/thing/rubber-boots`, `class: /platform/thing/equipment/Garment`, **no bill and no `extends: leather-boots`** — a moulded boot is one piece (repair § 5); likewise gloves and the other rubber goods: family classes only, never an `Assembled*` twin. |
| moulds' `discipline: chemistry` | deliberate (rubber); once both land, a cast rubber good mends under chemistry — **the cobbler quotes rubber boots as beyond him** (an honest D12 beat; repair adds the case to its D1 test). |
| D8's stock draw | **narrowed in repair W2**: a mend draws the same material path first, then a family tag, **never `organic`** (rubber D12.4's precedent). |
| walls/roof layers (W7 ↔ rubber D1/D1a/D2/D4) | rubber does not reshape `getEnclosure()`/`getRoof()` (spec · list · `'none'` · null) or `Exposure`/`Face` without telling repair; repair W7 stores each layer's **`areaM2` and exterior flag on `LayerState`** when seeded or re-read while resident, so `reconcileShell` never needs loaded rooms or a standing structure. |
| `lint:biome-sky` (rubber's census) | rubber computes its ceiling on the rebased tree and **pays repair's new interiors** (cobbler shop, tinker yard/offstage) by authoring `enclosure:`+`roof:` on them; repair W7 deletes the dorm/Seznick/Hinkley lines it pays off. |
| `SurveyController.ts` (three builds) | one readout block per room: holding/fabric lines first, then cleanliness's floor line; rubber's `waysideSpaces` edit untouched; no digits (survey's regex); the last lander adds a test that all appear. |
| docs | rubber fixes its `structures-slate`/`biome-normalization-slate` notes (places own materials; **upkeep → repair W7**; erection → structures-slate) and re-points its cobbler non-goal (mending → repair; *making* boots → textiles-slate); `moulding-slate.md` lands with repair, so rubber's D10 link resolves once repair merges. |

### Repair × cleanliness

✅ **Settled both directions** — cleanliness recorded repair's answers (`origin/reqs/cleanliness` 45addec08) and had already applied repair's asks: `Soilable` on `Lamp` (soot in `getEmittedFlux`, glazed share only); bleach rot and vitriol burns through `wear(…, 'corrosion')`, the Flued `wear()` branch gone; a `Sawdust` stack stays one, the `sawdust` DirtKind dropped; its floor predicate is `takesSoil()` (= our `takesTraffic`); `cleaningMethod('ice')` → scrape; sulfur `autoignitionTemperature: 505`; shrink/felting only for a `fibre`-tagged material the water reaches. Same landing order.

✅ **Cleanliness's asks (2026-10-17, `origin/reqs/cleanliness:docs/plans/cleanliness-note-to-siblings.md` § To repair) — answered:**
1. **Accepted.** `CraftingApi.fulfillingHand(giver, tariff, discipline?)` is public and resolves candidates **only within the Tariff's own house** (its `businessPath` / the house `collect` attributes to) — the lavoir and bathhouse are multi-house rooms. `diagnose` uses it.
2. **Accepted.** `Tariff.quoteFor(lines)` takes priced lines; the Diagnosis → lines mapping stays in repair's arm.
3. **Accepted.** `PricedOfferMixin` exposes `houseAccount()` and `canSettle(amount)`; repair's arm calls `canSettle(quote.total)` **before** mending (no mend that cannot be paid for — today's *on the house* failure is not a free repair), which is also its reader.
4. **Accepted in part.** One `doService` shape: every arm returns `{ok, detail, charge?}` and `doService` settles `charge` (or the row's price) once. ⚠ The **durative helper** (transfusion, later bath) is NOT extracted here: in repair's branch it would have one consumer (transfusion); whoever adds the second durative arm (cleanliness's `bath`) extracts it from transfusion's shape (*a hook needs more than one implementer*).
5. **Accepted, conditional.** If cleanliness lands first, repair's W1 fold-back carries `Soilable` (+ `Labelled` on Garment) onto the recomposed `Chair`/`Garment`/`Lamp` and keeps the soot-dims-the-glass factor (facing share only) inside `Lamp.getEmittedFlux`.
6. **Accepted.** `SurveyController`: the holding line, then repair's `fabricReport` lines, then cleanliness's room line.
7. **Accepted.** The wiki-spoiler review log: one paragraph per build, so both entries merge.
8. **Accepted (a correction).** Hinkley `lots/yard` is outdoors — excluded from W7's `enclosure:`/`roof:` (D27).

| shared | resolution |
|---|---|
| **`Lantern.ts`** (repair W1 deletes it; cleanliness composes Soilable on it) | cleanliness composes **`SoilableMixin` on `Lamp`**; **`Lamp.getEmittedFlux` is the one funnel for pane state** — repair's failed facing lines and cleanliness's soot both scale it, through facing lines whose material is glass (total: a billless torch has none). |
| the paid service (repair W3 ↔ cleanliness W6) | repair W3 exposes **`CraftingApi.fulfillingHand(giver, venue, discipline?)`** — public, the wrapper over `presentFulfillers` → `houseOf` → `callHouse`, which `diagnose` itself uses; the **optional discipline comes from the Tariff row** (`serviceDisciplines: {wash: textiles}`), never hard-coded; repair passes none. |
| the quote | repair W3 makes **`Tariff.quoteFor(lines: {key, label, qty}[]) → Quote`** generic; the Diagnosis → lines mapping lives in the repair arm; the `tighten/reforge/refire` derivation applies to repair keys only; an unknown key with no price is unpriced (null), never derived from `repair`. *"There's nobody here to do the work."* is one shared constant. |
| `SERVICE_KINDS` | repair adds none; cleanliness adds `wash`, `bath`. |
| `Chair.ts`, `Garment.ts`, `Tool.ts`, `Vat.ts`, `Receptacle.ts`, `Timber.ts` | repair W1 recomposes them first (merge order); cleanliness re-grounds its W0 on repair's W1 and adds `Soilable`/`Labelled` to the new chains; `Timber.ts`: keep repair's chain, add cleanliness's `seasonPhrase` override, pin it with the byte-identity test. |
| wear from non-use sources | cleanliness's bleach rot / burns call `Durable.wear()` (mendable; the condition word shows them); repair's `MendRecord` is written only by a mend, never by wash damage. |
| the doorman | cleanliness may add an optional `wornBelow` clause reading Durable condition (its call). |
| repair's new venues (cobbler shop, tinker yard) | plain `SingletonCartesianLocation`; if cleanliness wants their floors' soil to survive a restart it re-classes them (its call). |
| docs | `retail.md` / `employment.md`: cleanliness **extends** repair's *a priced service is performed by a person* section rather than writing a parallel one. |

### Changes this section made to repair's own decisions

- **P1** (W3/D12): `fulfillingHand` public + the Tariff row's discipline; `quoteFor` generic; one shared refusal constant.
- **P2** (W1/D6): `Lamp.getEmittedFlux` is the single pane funnel.
- **P3** (W2/D8): stock draw by material path → family tag, never `organic`.
- **P4** (W4): the grouped tick evaluates per slot with the season clock; the overlap arm is season-aware.
- **P5** (W7): materials in `base-library`; brick is rubber's row and stays `weathers: false`; thatch and lime plaster author `thermalConductivity` + `waterAbsorptionCapacity`.
- **P6** (W7/D20, D20a): `LayerState` stores `areaM2` + exterior; `WeatheringMixin` in the kernel `lib/`.
- **P7** (W7/D26): `receiveBench` carries `unpackIntoCold`; the cupboard is not Sealable.
- **P8** (W5): arm 8's ceiling is 15, not 3 (a slip).
- **P9** (D15, W5, W7): **no boot entries** — load on use; the tinker is brought current by arrival at a stop, the keepers act while their building is loaded.

## Deferred seams

- **A tinker seen on the road** — a kernel `rounds` brain that walks to
  the next station when watched (`NavigationApi.routeBetween`, one leg a
  beat) and lets the tick reconcile when not → `trade-roster-slate`
  (the pedlar) / `behavior`.
- **The scythe's snath and blade**, the adze whole, a second edged
  whole → `carpentry-slate`.
- **Walking between stops; the tinker's drawer of parts** (fitting a
  new haft as a service — `fit` as a tariff kind) → `repair` tail in
  `assembly-slate`.
- **A mended thing's price on the consignment shelf** (the lemons
  problem reads the mend history) → `sanitation-slate`.
- **The seat of an assembled magic item** → `magic-items` tail
  (requirements non-goal).
- **Treatment and burial by an on-shift hand** → clinical-medicine /
  end-of-life slates.
- **Fifteen bill parts no recipe makes** (§ Grounding's list less sole
  and boot-upper) — `lint:bills` arm 8 holds the ceiling at 15 and
  names them → the owning trades' tails (apiculture's bellows and
  gusset, tanning's hide-face, the compass's three, the bow's nock and
  string, the spindle's whorl, chandlery's wick, the canister, the
  cushion's cover and stuffing; a pane and a board are made by verbs
  that are not recipes — the glass and forestry docs may want to say so
  where the arm names them).
- **`StagedMixin`'s `props`/`cast` split** — a `props`-only half a
  *person with a loadout* composes, making Gus, Katie, Walter, the
  Realtor and the tinker ROWS over one kernel class (`Gus.ts:14–26`'s
  filed fix, now five receipts) → `content-declaration-slate` /
  `object-taxonomy-slate` (kernel; cross-cutting).
- **`Mould` as a family** (compose `AssembledMixin` the day a recipe
  makes a mould; the cope-and-drag two-piece mould) → `moulding-slate`
  § 7; arm 7d fires on its own when that recipe lands.
- **Erecting a building** from its bill of goods (D20's layers summed
  over a structure's members × area × thickness × density) →
  `structures-slate` § building materials (owner: upkeep only).
- **Hired building trades** — a thatcher or mason through a counter
  (`order thatch` as a `Tariff` service kind, D12's paid-mend shape on
  a layer) → the erection design.
- **Fire, rot, collapse; a worn layer's physics** (rain through thin
  thatch, heat through a settled fill — rubber's five answers reading
  `LayerState.condition`) → `structures-slate`.
- **Buildings outside a holding weathering** (the smithy, the rubber
  works, the icehouse; the programme's clock generalized onto a
  `Structure`) → `structures-slate`, with erection (D20's written-down
  narrowing).
- **Storeys for the hall and Seznick** (a ground-floor room has a
  ceiling, not a roof) → rubber's content pass / `structures-slate`.
- **A supply chain for reed, lime and slate** (reed beds, lime burning,
  slate from the quarry) → `vocations.md` gap list.
- **The keeper walking to the store** → the same `rounds` seam as the
  tinker.

---

## Critical files

Read first, in this order:

1. `docs/subsystems/assembly.md`, `docs/subsystems/crafting.md § The lifecycle`
2. `packages/server/src/mud/lib/craft/Assembled.ts`
3. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:2299–2410, 3215–4000` (dairy's +13 lines sit at `:1898–1912`, above both ranges)
4. `packages/server/src/mud/api/crafting.ts:36–270`
5. `packages/server/src/mud/lib/material/{Durable,Keen,Construction}.ts`
6. `packages/server/src/mud/platform/thing/{Tool,Vat,Cask,Lamp,Lantern,Chair,AssembledChair,Receptacle,Timber}.ts`, `equipment/{Weapon,Garment,AssembledLauncher}.ts`
7. `packages/server/scripts/check-bills.ts`, `scripts/pack-roots.ts`
8. `packages/server/src/mud/platform/idea/cmd/retail/OrderController.ts`, `platform/thing/Tariff.ts`, `lib/commerce/PricedOffer.ts`
9. `packages/server/src/mud/platform/idea/api/EmploymentLogic.ts:925–1010, 1630–1730, 2030–2110`, `lib/employment/{Roster,Employed}.ts`
10. `packages/server/src/mud/lib/stuff/{Staged,Stuff}.ts`, `lib/npc/NPC.ts`, `platform/agent/Gus.ts:1–40` (the Staged split, filed), `packages/content/terminus/src/mayfield-row/agent/Walter.ts` (the chain the tinker copies)
10a. **The mould system**: `packages/server/src/mud/lib/mould/Mould.ts` (`carryPayload` — D1's one-line write site), `platform/thing/Mould.ts`, `packages/content/trade-dairying/src/thing/Hoop.ts`, `docs/subsystems/mould.md`, `docs/slates/builds/moulding-slate.md § 0, § 7`, `packages/content/trade-cooking/src/thing/CookPot.ts` (D4's one pack line)
11. `packages/server/src/mud/lib/instrument/Reading.ts`, `platform/idea/reading/PumpReading.ts`
12. `packages/server/src/mud/platform/idea/cmd/social/NameController.ts`
13. `packages/content/trade-smithing/src/idea/cmd/crafting/SharpenController.ts`
14. The exemplar rows: `terminus/…/mayfield-row/tailor/**`, `hearthworks/…/{idea/business,thing/smithy-tariff,agent/smith,location/smithy}.yaml`, `generic-objects/…/armor/leather-boots.yaml`, `trade-mining/…/thing/pick.yaml`, `trade-forestry/…/thing/felling-axe.yaml`
15. `packages/wire/tests/assembly.dirty.wire.test.ts`, `packages/wire/src/harness/session.ts:800–840`

For W7, additionally:

16. `packages/content/residence/src/idea/HoldingWarren.ts:60–130, 540–600`, `src/idea/cmd/crafting/MaintainController.ts`, `src/behavior/maintains.ts`, `src/thing/HouseholdersKit.ts`, `content/system/residence/cmd/crafting/maintain.yaml`, `content/system/residence/thing/householders-kit.yaml`, `src/__tests__/HoldingWarren.test.ts:360–640`
17. `packages/server/src/mud/platform/idea/cmd/perception/SurveyController.ts`, `lib/location/OuterWarren.ts:340–361`, `lib/behavior/restocks.ts`, `lib/spatial/Enclosed.ts`, `lib/biome/Atmospheric.ts:420–540, 1100–1160`, `lib/material/Material.ts:800–880`, `platform/idea/Business.ts`, `lib/employment/Position.ts`, `api/grammar.ts:270–300`
18. `git show origin/reqs/rubber:docs/plans/rubber-plan.md` § D1–D4, D14, § Host placement (`roof`/`exposure()` on `AtmosphericMixin`), § Deferred seams — then the MERGED files once rubber lands (re-ground, § W7)
19. `eternal-university/…/duncan-hall/{idea/college, idea/dorm-programme, location/dormroom, agent/katie}.yaml`, `terminus/…/mayfield-row/{idea/agency, agent/walter, seznick-house/unit-programme, seznick-house/location/*}.yaml`, `hinkley-hills/…/idea/house-programme.yaml`, `general-store/{business, counter}.yaml`, `trade-apiculture/…/thick-hive.yaml` (the Good that authors `enclosure:`)

---

## Drive record

*(appended at build time — the output of running the requirements'
drive 1–10 + 12 on the real socket (and 11 + 12 again when W7 lands),
the count, and what each failure was.
Precedent: `farming-plan.md § Checkpoint A`.)*

`packages/wire/tests/repair.dirty.wire.test.ts`, `WIRE_BOOT=1
WIRE_PORT=2016 WIRE_BOOT_TIMEOUT=900000`, a fresh `saxonberg_build3`
per run. Thirteen checkpoints (drive 1–10 + 12; drive 7 carries the
off-shift check, drive 6 the notice). Eight runs.

**What the drive found in the GAME (each fixed, its own commit):**

1. ⭐ **A whole bar could not serve a mend** (`25ccad0f8`). The stock
   draw judged a discrete donor's overshoot against what was LEFT to
   draw, so an iron head needing 0.3 kg refused a 1 kg bar outright —
   and the smithy holds only bars. The bound is now the WHOLE need
   (`needKg − remaining + unitKg ≤ 2·needKg`).
2. ⭐⭐ **The Hearthworks smith lost her job at the first tick**
   (`dea1f3334`). Berta is the house's proprietor AND its rostered
   smith; the cover pass read her own rostered shift as a cover, and
   ended it (`endCover` drops the house's record) whenever anybody else
   was on. She stood at the anvil employed by nobody. A proprietor's own
   rostered shift is no longer a cover (`ownSlotOn`).
3. **`fulfillingHand` compared houses by object identity** — Berta on
   shift, "nobody here". By organization PATH now.
4. **The cobbler had no leather a sole could be cut from** — the shop
   gained `leather-offcuts` (trade-tanning, `Scrap`).
5. **A quote said each price twice** (`8d0d88070`).
6. **Recorded, not changed:** a proprietor covers her own house whenever
   no rostered hand is on, so the Hearthworks smithy never shuts —
   drive 6's off-shift check moved to the cobbler's, whose proprietor is
   nobody's hand. Whether a house should be able to close on its
   proprietor is the employment slate's question.
7. ⭐ **Recorded, not changed — retail's: a good consigned at the general
   store does not come back after a restart.** Run 10 restarted
   gracefully (SIGTERM; *shutdown captured 54 persistable hosts*), the
   mender's estate held the pick at `/world/terminus/general-store/counter`
   with every mend, and the world never placed it: the counter is a
   `Persistable` `Stock` that never establishes a record of its own (no
   key → no shutdown capture, no materialize → the owner overlay never
   runs). `MarketStalls.hydrationSource` is the shipped fix for exactly
   this on the market square (its own docstring: *the market's produce
   vanished at every boot*). Not moved onto `Stock` here: that puts a
   boot-time read on every counter and a keyless restore on every rented
   stall before it is keyed — retail's decision. The good is not lost
   (its owner's record keeps it); it is unplaced. Drive 10 now reclaims
   the pick, and drive 12 reads its mends in the owner's hands.

**What it found in the SCRIPT (the harness facts worth keeping):** a
prompt's id is on the frame, not under `payload`; ⚠⚠ a confirm's
response is the STRING `'yes'` — a boolean is dropped at the inbound
handler with no word and the command waits out its timeout, then every
later command on that session is poisoned; ⚠ `Session.open` for a
handle that is already in the world MOVES the character (drive 8's hand
was at the bank when the order came); `eval --on` binds through
perception, so the founder carries a light; `|` in eval text pipes;
`-t "drive 1"` also matches 10 and 12; clone is refused over a live
instance where the founder holds no title (steel/cast-iron, not the
smithy's iron); a drive world is ~3 GB and a sibling's world on the same
box OOM-killed it twice (exit 137); ⚠⚠ the harness's `stopOwnedWorld`
SIGTERMs `pnpm exec`, which does not forward it, and the preflight
SIGKILLs after two seconds — so every "restart" in a drive was a CRASH,
with no shutdown capture. Drive 12 signals the listening server directly
and waits (the harness fix is the wire build's: signal the server, not
the wrapper).

**Runs.** 1–5: the fixes above, one by one. 6: 7/13 (the confirm
answered with a boolean). 7: 11/13 (drive 8 the bank move; drive 10 the
server OOM-killed mid-test — drive 12's restart then passed, only
because the store had sat empty long enough to be swept). 8: 12/13 (the
consigned pick gone after the restart — the crash above). 9: the same,
`stopOwnedWorld` added (it never reached the server). 10: the same, with
a real shutdown — finding 7. ⭐ **11: 13/13 green** (1291 s; drive 10
reclaims, drive 12 restarts gracefully and reads the pick, the keen
billhook and *Hollin* back).

**After the suite's two W1 fixes (`76b715056`):** 12: 12/13 — drive 1's
`buy pick haft` waited out the wire's 30 s while a sibling worktree's
world booted beside it (load ~30); every later checkpoint, which uses
that pick, passed. 13: abandoned — four ~3 GB worlds on a 15 GB box and
this one was OOM-killed at drive 7 (exit 137). A clean final-code run is
owed once the box is free.
