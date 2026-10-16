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
a whole, and lets a name live in a part.

Waves: **W0** kernel parts model · **W1** the fold-back · **W2** the
mend + legibility · **W3** the paid service · **W4** the roster
timetable · **W5** content · **W6** the drive + docs. Every wave lands
on its own commit; `pnpm test` runs once, before the MR.

---

## Grounding

Verified by opening the files, 2026-10-16 (paths under `packages/`).

### The mend today

- `server/src/mud/platform/idea/api/CraftingLogic.ts:3209 repairImpl` —
  maker = `ExecutionContextApi.getActingAuthor()` else
  `req.makerPath`; refuses a non-Durable; an Assembled item runs
  `repairAssemblyRungs` (`:3615`) first — failed part refused and named
  (below the joint's band, *"something about the staves"*), slack joints
  tightened under `jointGate` (`:3576`), a spent cask re-fired — then the
  wear rung: the WHOLE's material decides the gate (`hasTag('metal')` →
  `maker.reachableHeatK() ≥ crafting.repair.metalHeatK` 900 + an `anvil`
  in the gather; else a `mending` tool); cost `mass × deficit ×
  crafting.repair.costFactor` 0.6 (× `brokenFactor` 2); draws same-tag
  stock; `item.setCondition(1)`; `applyControlFloor` on the grade.
  ⚠ **No band is read on the wear path; no `captureHostOf` after.**
- `bandIn(who, discipline)` `:3566` (Advancing → `competenceBandFor`,
  else `CompetenceBand.FLOOR`); `RECOVERY_BY_BAND` `:3535`
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
  runtimeState}` — a new line field persists free. `billLines()` `:558`
  reads a FOUND thing's lines at defaults (material from the bill or the
  whole; grade `fair`; condition 1; **no form**). `getParts()` `:506`
  answers `billLines()` while `parts` is empty; `ensureParts()`
  materializes on the first mutating act. `wear(amount, channel)` `:869`
  → `lineGivingFirst`; `wearLine` `:689` fails a member at the broken
  dial; `getCondition()` `:825` = min(own, every line), 0 on a failed
  structural line; `setCondition()` `:841` sets every line;
  `replaceMembers()` `:725` sets the fitted line's condition to **1
  regardless of the part's own**; `restoreAll` `:799`;
  `assemblyAugmenter` `:311` (made of…, failed, slack, *the work of A
  and B*) — no condition word, no grade, no mend. `__validateComposition__`
  requires Durable. `commandContributions` `fit/repair/salvage` in
  `environment` + `peers`.
- `applyAssembledOutput` (`CraftingLogic.ts:2286`) — one line per
  recipe slot: template, material, weakest grade, mean condition,
  makers (the consumed part's `Crafted.maker`), form, green/cupped,
  nested record. **The consumed part's `Crafted.recipe` is not copied.**
  Bill parts no slot supplied read at defaults. With no bill and < 2
  slots: a one-slot craft of an assembly carries the record across;
  otherwise no record.
- `fitImpl` `:3700` — raise arm gates the bill's joints then
  `craftImpl`; replace arm matches a line by row lineage or keyword,
  reads the part's material/grade/form/green/cupped/nested, **drops its
  condition and keenness**, mints a sound count-1 member back
  (`mintMember`), `replaceMembers`, whole's grade = worst line,
  `captureHostOf(whole)`.
- `mintMember` `:3851` — clones `line.template` with `madeFrom`, sets
  material, grade (−1 if `gradeDown`), **condition** (if Durable),
  form, nested record, quantity. Not keenness, not a name, not mends.
- `salvageByJoints` `:3885` reads `RECOVERY_BY_BAND` per joint.
- `server/scripts/check-bills.ts` — arms 1–7; **arm 7 (`:219–240`) is
  `bill ⇔ composes AssembledMixin`, both ways**, and its header forbids
  the mixin on a broad family. Helpers from `scripts/pack-roots.ts`:
  `inheritanceIndex`, `effectiveRow`, `composesMixin`, `packSources`.
- `isAssembled` callers (all empty-safe when `getParts()` is `[]`):
  `RepairController:55`, `FitController:88,156` (`wholeFor` → no lines →
  null), `CraftingLogic:2291,2301,2352,3075,3232,3398,3744,3799,3868`,
  `ConditionLogic:1201,1260`, `Assembled.ts:312`,
  `trade-coopering/src/idea/reading/CapacityReading.ts:99`,
  `trade-farming/src/idea/cmd/farming/PloughController.ts:88`. `fit`
  on an empty record refuses `no-line`.

### Keen, Durable, Constructed, Tool

- `server/src/mud/lib/material/Keen.ts` — `keenness` persistent (default
  1), bands keen ≥ .85 / serviceable ≥ .55 / dulled ≥ .25 / blunted,
  `dull()`, `hone()` → 1, `keennessDeliveryFactor()`. Composed **only
  on `Weapon`** (`platform/thing/equipment/Weapon.ts:78`:
  `Wieldable(Slottable(Keen(Crafted(Durable(Constructed(Good))))))`).
  Readers: `CombatLogic:2301,2355` (edge/point only),
  `ResponseReading:135` (`!armor && isKeen` — prints *edge* for a mace
  too), `WeaponReading:99` (edge/point only), `SharpenController`.
- `server/src/mud/lib/material/Durable.ts` — `condition`, `wear`,
  `isBroken`; **no augmenter, no history**. Composers: `Tool`,
  `Weapon`, `Garment`, `Shield`, `Assembly`, `Barrel`, `Cask`,
  `Lantern`, `AssembledChair`, every `ToolMixin(…)` composer (`Sawmill`,
  `CookPot`, `Still`, `Tap`, `GristMill`, `MeasureBook`, `WateringCan`,
  `CocktailShaker`), `arcana/Conduit`, apiculture `Frame`/`Smoker`.
- `server/src/mud/platform/thing/Tool.ts:53` =
  `Crafted(ToolMixin(Durable(Good)))` — **no Constructed, no Keen**.
  Subclasses: kernel `Spade`, `LoadDevice`, `MendingTool`; packs
  `SurveyInstrument` (mining), `SpinningTool` (textiles), `Whetstone`,
  `Rod`, `Trap`, `KitchenTool`, `SutureKit`, `AssayKit`, `Bailer`,
  `Derrick`, `GrozingPliers`, `Blowpipe`, `ScribingWheel`, `Strainer`,
  `Muddler`, `HouseholdersKit`, `SoilKit`.
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
Families: `Tool` 66 rows, `Garment` 21, `Receptacle` 19
(`Thermal(Bulkable(Good))`, no Durable/Crafted; `WateringCan` extends
it), `Vat` 13 (`VesselKind(Maturing(Crafted(Sealable(Thermal(Bulkable
(Good))))))`, no Durable), `Weapon` 7 plain, `Lamp` 3
(`Burner(LightSource(Bulkable(Thermal(Good))))`, no Durable/Crafted),
`Chair` 3 (`Postured(Slotted(Good))`, no Durable/Crafted), `Launcher` 1
(musket). `Cask.ts` carries `emptySince` + `reconcileDrying` +
`getClosure` (open while `leaks()`); `Lantern.ts` scales flux by failed
facing panes; `AssembledChair.ts` scales `getRestQuality`.

### Recipes and disciplines

- `lib/craft/Recipe.ts:374 discipline`, `getDiscipline()` `:791`.
  `platform/idea/RecipeCatalogue.ts`: `getRecipe(id)`,
  `findByKeyword`, `allRecipes()` — **no output-row → recipe index**.
- Joint rows (`platform/idea/Joint.ts`) carry `competence {discipline,
  band} | null`; `wedged`/`friction`/`seated`/`glued` are hand joints
  (null), `riveted` is tool `striking` + smithing, `stitched` tool
  `mending` + tailoring, `pegged` carpentry novice.
- Bill-part rows with a recipe that makes them: stave, cask-head, hoop,
  cushion, mattress, frame, handle, pick-head, drawknife-blade,
  froe-blade, axe-haft, shield-boss, rivet (1 each). **Without one:**
  `/trade/farming/thing/share`, `/trade/tanning/thing/hide-face`,
  `/trade/apiculture/thing/bellows`, **`/trade/tanning/thing/sole`,
  `/trade/tailoring/thing/boot-upper`** (both plain `Tool` rows; recipe
  dirs: tanning `packing`, `salt-hide`; tailoring `cushion`,
  `leather-boots`, `leather-jerkin`, `mattress`).
- Anvil recipes discriminate on the exact slot signature
  (`content/trade-smithing/src/__tests__/anvil-ladder.test.ts:68` —
  `category×count:minGrade… @heat`); taken 1-slot `forgeable` signatures
  include `1:fair@1200` (pick-head, tongs, driver poor, shield-boss
  poor), `1:fair@1100` (pinch-bar), `1:fair@1150` (adze-blade),
  `1:poor@1050` (rivet), `2:fair@1450` (sword), `1:fair@1400`
  (belt-knife). The sword recipe (`trade-smithing/content/recipes/sword.yaml`)
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

### The paid service

- `platform/idea/cmd/retail/OrderController.ts:208 doService` →
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
  `Detailed.ts:301`, `Assembled.ts:280`) and union through the chain.
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
  `Persistable.reseedCast`). **`NPC` = `Costumed(Behaved(Character))`
  — `costume:` accepts `Wearable` only; an NPC cannot be born holding
  kit** (`StagedMixin` composes on `Pump`, `Well`, `GardenBed`,
  `FurnishableRoom`, never on a body). `lint:boot-entries` admits a
  content boot row whose reason cites `unobserved-economy-slate`
  (terminus `pack.yaml:104–134` has eleven such producer entries).
- `reachableHeatK()` (`lib/thermal/Thermal.ts:1188`) scans the maker's
  **container** for burners; the `Forge` row ships `lit: false`
  (`burnTemperatureK` 1300, bellows ×1.6) — the assembly drive stokes
  and lights it (`assembly.dirty.wire.test.ts:483`). The gather walk
  reads the maker's **direct** inventory + the room + open room
  containers (`CraftingLogic.ts:686–735`).
- Roads: wharfside `bank` → (west) valley-road towpath; `delight-road/ford`
  north → `wharfside/bank`, south → `milestone` → `drove` → `flats` →
  `crossroads` (north flats, west `rejection/kestrel-road/lower-climb`,
  south `hearts-delight/location/valley-gate`); `lower-climb` →
  `upper-climb` → `the-pass` → `tips` → `yard-gate` (northeast
  `rejection/location/pithead-yard`). Rejection's heat + anvil are at
  `rejection/location/smelter.yaml` (`/trade/smelting/thing/furnace`,
  `/trade/smithing/thing/anvil`); the provisioning shed has none.
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
  `rejection/thing/store-counter.yaml:23`; **no billhook anywhere**.
- Wire harness: `packages/wire/tests/assembly.dirty.wire.test.ts`
  (`say`, `examine` by projection, `inReach`, `cloneHere`, `newPlayer`
  via a 400-coin reserve override, `goTo`, `buy`, `untilRestocked`,
  `practise` = `practice <discipline> hard success`, `toDaylight`; the
  restart block `:638–676`); `advanceWorldClock` (`src/harness/world.ts:157`).

---

## Plan-level decisions

**D1 — A part's discipline is derived, in two reads, both load-on-use.**
`PartLine.recipe?` is copied from the consumed part's `Crafted.recipe`
at the mint and the fit; `RecipeCatalogue.recipeFor(outputTemplate)` is
a derived index (built in `warm()`, a `Map`, never a scan) read when a
line has no recipe — a found thing's lines, a stocked pick. Discipline =
`getRecipe(line.recipe)?.discipline ?? recipeFor(line.template)?.discipline
?? ''`. No `discipline:` on the bill part (a third declaration of one
fact). A line with no discipline resolvable (a found stone, a part no
recipe makes) is mended **as if competent** — nothing can be known
better or worse about it (lens 1: no skill, no lesson); `lint:bills`
arm 8 (D14) is what makes that honest by naming every such part at
build time. Lens 1 decided: the trade that made it is the one fact the
world already holds.

**D2 — The per-line state is the loose part's own fields, and the
whole's line is the same state.** `PartLine` gains `keenness?`
(0..1), `name?` (the seat), `nameGrant?` (identity path), `mends?:
MendRecord[]`, `recipe?`; `BillPart` gains `form?` and `name?` (found
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
the branch do anything.

**D7 — `lint:bills` arm 7 becomes two honest claims; arm 8 is a
census-then-ratchet.** 7a (kept): a bill on a class that does not
compose Assembled is an error. 7b (new): a row whose class composes
Assembled and whose recipe has **two or more distinct item slots** must
carry a bill — the mint would otherwise record a thing of parts nobody
declared (the billhook today). 7c (replaces *composes ⇒ billed*): a
row with a bill whose class composes Assembled passes; a composing
class's billless row is one piece and passes. Arm 8 (new): every bill
part `template` is the `outputTemplate` of some shipped recipe; the
census opens at **5** (share, hide-face, bellows, sole, upper) and the
build drives it to **3** (sole and upper gain recipes); the three stay
named in the script with a reason. The arm-7 header is rewritten: the
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
`recipeFor(own template)`. The whole mends every line it can and
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

**D14 — An NPC may be born holding things: `StagedMixin` composes on
`NPC`.** `props:` on a Cast row is what the person carries (the Staged
doc's own words: *anything inanimate the host is born holding*; an NPC
is a Container). Claim: every NPC may author kit; cast is reseeded on
restore so the kit is re-minted with the body. This is the honest
general mechanism the tinker (a billhook, a whetstone, a sewing kit, a
mending slate he sets down) and every future itinerant need, and it is
a composition on an existing class — no new category. ⚠ Flagged in
§ Risks for the user's eye.

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
crossroads carries a `Signpost` with the round. Boot entries: the yard
and the house (`role: producer`, reason citing
`unobserved-economy-slate`). The requirements' § 8 and drive 6 meet at
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
are chosen off the taken list and must be re-checked at build.

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

---

## ⭐⭐ Host placement

| what | host | what composing it claims about every other composer |
|---|---|---|
| `AssembledMixin` | `Tool`, `Weapon`, `Garment`, `Shield`, `Vat`, `Lamp`, `Chair`, `Receptacle`, `Assembly`, `Barrel` | every row of the family is parts or one piece; every method is total on an empty record (D4). Pack subclasses (`SurveyInstrument`, `SpinningTool`, `Whetstone`, `Rod`, `Trap`, `KitchenTool`, `SutureKit`, `AssayKit`, `Bailer`, `Derrick`, `GrozingPliers`, `Blowpipe`, `ScribingWheel`, `Strainer`, `Muddler`, `HouseholdersKit`, `SoilKit`, `Spade`, `LoadDevice`, `MendingTool`, `WateringCan`, `DisguiseGarment`, `Launcher`, `FoldingChair`) inherit it and need no restatement: mixin statics union. ⛔ Not on `Good`, `Thing`, `Fitting`, `Chest`, `Bottle`, `Provision`, the hive rows. |
| `DurableMixin` (new) | `Vat`, `Lamp`, `Chair`, `Receptacle`, `Timber` | a carboy, a torch, a stool, a sack, a stave wears on use and is `repair`able; nothing wears them yet, so they read sound. `Timber`'s condition is stack identity (D5). |
| `CraftedMixin` (new) | `Lamp`, `Chair`, `Receptacle` | a torch, a cot, a pail has a grade (`fair`) and may be a recipe output. |
| `ConstructedMixin` + `KeenMixin` (new) | `Tool` | a tool has a form word (optional) and an edge gauge; the edge is inert unless the form delivers edge/point (D3) — exactly `Weapon`'s claim. |
| `StagedMixin` (new) | `NPC` | an NPC may be born holding kit (D14). |
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

**The test, applied:** no caller anywhere asks `isAssembled(x) && x has
parts` to decide whether to proceed; `fitImpl` refuses `one-piece` from
the mixin's own `isOnePiece()`; the look augmenter's *one piece* line is
a total method on the host. If the build finds itself writing
`if (!MixinApi.isAssembled(host) || host.getParts().length === 0)
return` in a CALLER, the host is wrong — write it down instead.

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
  `template-scans`, `get-or-create`, `inert-weapon`. ⚠ The caller's
  "wiki-spoiler snapshot" was not found under that name; the golden
  this build churns is `lint:field-meta`'s
  (`scripts/__fixtures__/field-meta-golden.json`, `--snapshot`).

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
  `PartLine.keenness?/name?/nameGrant?/mends?/recipe?`; host fields
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
- `server/src/mud/lib/material/Keen.ts` — outward routing to
  `edgedLines()` (D3).
- `server/src/mud/platform/idea/RecipeCatalogue.ts` — `recipeFor(path)`.
- `server/src/mud/platform/idea/api/CraftingLogic.ts` —
  `applyAssembledOutput` copies form/recipe/keenness/name/nameGrant/mends
  from consumed parts; `fitImpl` reads condition/keenness/name/grant/
  mends/recipe off the part; `mintMember` writes them onto the minted
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

### W1 — the fold-back: one kind of thing, one class

**Goal.** The families compose Assembled; Durable/Crafted/Constructed/Keen
where D3–D6 say; the nine twins retire and 24 rows re-point; `lint:bills`
arms 7–8; NPC may hold props. Every shipped assembly still lists its
parts and still fits, mends, salvages (AC 12, 13). Implements D3 (host
half), D4, D5, D6, D7, D14.

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
- `server/scripts/check-bills.ts` — arms 7a/7b/7c + arm 8 (census 5 →
  ceiling 3 after W5; land the arm with the ceiling at the current
  count and lower it in W5); header rewritten.
- `server/src/mud/lib/npc/NPC.ts` — `Costumed(Staged(Behaved(Character)))`
  + a test (a Cast row with `props:` is born holding them; a Behaved
  prop still throws).
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
axe's lines carry `form: bladed` for the head (bill `form:`); `pnpm
test:near` on `lib/craft`, `platform/thing`, `lib/npc`, every touched
pack's vitest.

**Commit.** `refactor(assembly): the mixin composes on the FAMILIES — a monolith is one piece; the Assembled* twins retire (repair W1)`

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

### W5 — content: edges, the sword, soles, the cobbler, the tinker, the heirloom

**Goal.** Everything the requirements name in the world. Implements
D15–D18, the edge rows, AC 7–10, 12, 14 (content half).

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
  Lower `check-bills` arm 8's ceiling to 3.
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
  `tinker/location/offstage.yaml`, `tinker/agent/tinker.yaml` (dossier;
  `props: [/trade/forestry/thing/billhook,
  /world/terminus/general-store/thing/whetstone,
  /world/terminus/general-store/thing/sewing-kit]`), `tinker/idea/round.yaml`
  (the Business, five slots), `tinker/thing/slate.yaml` (the crossroads
  copy; `register`, `prices {repair: 4}`), `delight-road/thing/tinkers-notice.yaml`
  (`Signpost`, the round in `markText`), `delight-road/crossroads.yaml`
  props: the slate + the notice; `hearts-delight/…/thing/tinkers-slate.yaml`
  + `valley-gate.yaml` props; `rejection/…/thing/mending-slate.yaml`
  re-authored as the tinker's and propped at `location/smelter.yaml`;
  `terminus/pack.yaml` boot entries for the yard and the round.
- Heirloom (D18): `hearthworks/content/world/terminus/hearthworks/thing/heirloom.yaml`
  + `location/smithy.yaml` props; `NameController` second arm +
  `name.yaml` (`requires: any`, help); a `NameController.thing.test.ts`.
- Pack tests beside the rows (the venue offstage/menu-staff pattern:
  `world/<venue>/__tests__/`), `lint:dossiers`, `lint:menu-staff`,
  `lint:openings`, `lint:boot-entries`, `lint:mass`, `lint:bills`.
- Docs: `vocations.md` cooper/carpenter rows refreshed (the
  requirements flag them stale); `content-packs.md` one line (NPC `props:`).

**Acceptance.** `lint:family` green; every pack suite touched green;
`pnpm test:near`; the content tests prove: the cobbler's house calls,
the tinker's house has five stations and the slates' paths, the
heirloom's blade line is named, the sword's bill weighs ≤ 1.0 kg.

**Commit.** `content(repair): edges, the sword in four parts, soles, the cobbler, the tinker's round, the heirloom (repair W5)`

### W6 — the drive, the suite, the MR

**Goal.** `packages/wire/tests/repair.dirty.wire.test.ts` runs the
requirements' drive 1–11 against the real socket on `WIRE_PORT`
2016; the record lands in this plan; `pnpm test` once; MR.

**Files.** The wire file (`DIRTY_REASON`: buys out the store's billhook
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

**Commit.** `drive(repair): the requirements' drive, 1–11, on the real socket` then the MR.

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
| the round | — | — | five `rosterSlots` with `station` | **boot entries** for the yard + the house (else an unobserved tinker is nowhere) | the stop room must be live for the move; arriving makes it so |
| the notice | `read` | `Signpost` peers+env | `markText` | — | — |
| the cobbler's seat | `apply`, `clock on` | the opening derived from `headcount` | `requires {leatherwork, novice}` | the house stands up on arrival | `lint:openings` vocabulary |
| the name | `name` | `Avatar` self (shipped) | `nameGrant` on the line | — | `requires: any` + both arms checked in the controller |
| the heirloom | `look`, `get`, `salvage`, `fit` | props of the smithy | the row's bill with `name:` | the smithy stands up on arrival | — |
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
| 8 tinker at each stop at its hour, watched or not; notice readable | W4 + W5 (boot entries) · W6 (drive 6, after `advanceWorldClock`) |
| 9 metal well, wood poorly, says so first | W2 (bands) + W3 (quote) + W5 (dossier) · W6 (drive 6 at the smelter) |
| 10 cobbler re-soles; a player holds the seat and is paid | W5 + W3 (piecework) · W6 (drive 7, 8) |
| 11 every edged tool sharpens; honed loose stays keen fitted; worn removed stays worn | W0 + W1 (Timber Durable) + W2 (sharpen) + W5 (forms) · W6 (drive 4) |
| 12 parts or one piece; the sword's four | W1 + W5 (sword) · W6 (drive 1) |
| 13 every shipped assembly still lists/mends/fits/salvages | W1 (every existing test + `assembly.dirty.wire.test.ts` stays in the suite) |
| 14 heirloom keeps its name re-hilted and drawn; hilt nameless; reforged loses it, reforger names once | W0 (seat on the line) + W2 (reforge grant) + W5 (row) · W6 (drive 9) |
| 15 the drive end to end incl. restart | W6 |

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
- `pnpm test` runs **twice in the cycle**: before the MR opens (W6) and
  at `/finalize`. Never in the background.

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
3. **D14 widens `NPC` with `StagedMixin`** so a Cast row may author
   `props:`. A composition, not a new category — but it is a kernel
   claim about every NPC, so it is here for sign-off. The alternative
   (a kit propped at each stop room) lies when the tinker is absent.
4. **D3 adds `ConstructedMixin` + `KeenMixin` to `Tool`** — 66 rows and
   ~20 subclasses gain an inert edge gauge and an optional form.
   `responsePipsAugmenter` prints delivery pips on a billhook; a
   hammer's `analyze response` line must not read *edge* (fixed in W1).
   If a gate (`lint:inert-weapon`, `lint:capabilities`) objects to a
   `bladed` Tool, the build reports rather than widens the gate.
5. **`Timber` becomes Durable with `condition` as stack identity** —
   a worn haft never merges; a sound one merges as today. Confirm no
   test asserts stacks merge regardless of condition.
6. **Anvil signatures** for the four new blade/hilt recipes are chosen
   off today's list; `anvil-ladder.test.ts` is the gate — adjust heats,
   never duplicate.
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
   keyword. Name the sword's part `sword-blade` to be safe.)
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

---

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
- **Three bill parts no recipe makes** (share, hide-face, bellows) —
  `lint:bills` arm 8 holds the ceiling at 3 and names them → farming,
  tanning, apiculture tails.

---

## Critical files

Read first, in this order:

1. `docs/subsystems/assembly.md`, `docs/subsystems/crafting.md § The lifecycle`
2. `packages/server/src/mud/lib/craft/Assembled.ts`
3. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:2286–2400, 3200–3990`
4. `packages/server/src/mud/api/crafting.ts:36–270`
5. `packages/server/src/mud/lib/material/{Durable,Keen,Construction}.ts`
6. `packages/server/src/mud/platform/thing/{Tool,Vat,Cask,Lamp,Lantern,Chair,AssembledChair,Receptacle,Timber}.ts`, `equipment/{Weapon,Garment,AssembledLauncher}.ts`
7. `packages/server/scripts/check-bills.ts`, `scripts/pack-roots.ts`
8. `packages/server/src/mud/platform/idea/cmd/retail/OrderController.ts`, `platform/thing/Tariff.ts`, `lib/commerce/PricedOffer.ts`
9. `packages/server/src/mud/platform/idea/api/EmploymentLogic.ts:925–1010, 1630–1730, 2030–2110`, `lib/employment/{Roster,Employed}.ts`
10. `packages/server/src/mud/lib/stuff/{Staged,Stuff}.ts`, `lib/npc/NPC.ts`
11. `packages/server/src/mud/lib/instrument/Reading.ts`, `platform/idea/reading/PumpReading.ts`
12. `packages/server/src/mud/platform/idea/cmd/social/NameController.ts`
13. `packages/content/trade-smithing/src/idea/cmd/crafting/SharpenController.ts`
14. The exemplar rows: `terminus/…/mayfield-row/tailor/**`, `hearthworks/…/{idea/business,thing/smithy-tariff,agent/smith,location/smithy}.yaml`, `generic-objects/…/armor/leather-boots.yaml`, `trade-mining/…/thing/pick.yaml`, `trade-forestry/…/thing/felling-axe.yaml`
15. `packages/wire/tests/assembly.dirty.wire.test.ts`, `packages/wire/src/harness/session.ts:800–840`

---

## Drive record

*(appended at build time — the output of running the requirements'
drive 1–11 on the real socket, the count, and what each failure was.
Precedent: `farming-plan.md § Checkpoint A`.)*
