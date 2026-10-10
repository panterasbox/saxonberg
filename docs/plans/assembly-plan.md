# Assembly — implementation plan

Executes [assembly-requirements.md](../requirements/assembly-requirements.md)
(D1–D18, AC 1–28, the 23-step drive). **Kind:** feature. **Lead end:**
kernel — first consumer the miner's pick (`trade-mining`'s shipped
`pick.yaml` recipe, unedited), then the wood column (`trade-forestry` +
two new packs, `trade-carpentry` and `trade-coopering`) and eight
exemplar families chosen for the span of the joint vocabulary.

What is built, in one paragraph: the craft mint learns to keep its
inputs' identity — a **bill** on the kind, a **parts record** on the
instance, **joints as rows** with state of their own — and the three
shipped lifecycle verbs (`repair`, `salvage`, plus the one new verb
`fit`) learn to read it. Before any of that, the mint learns to **land**
its output (stamp, follow custody, capture), because today a crafted
good left where it was made is invisible to persistence. Then the wood
column supplies the parts: riving and seasoning in forestry, the sawmill
and joinery in carpentry, the cask and the gauger in coopering.

Planned 2026-10-09 on worktree `build-3` @ `reqs/assembly`
(`332013725`, clean, 0 behind `origin/master`). The grounding was done
on this tree the same day and every fact below was re-opened where a
decision hangs on it.

---

## Grounding

Verified by opening the file this cycle. Line numbers are from
`332013725`.

### The craft path

- `packages/server/src/mud/api/crafting.ts` — `CraftingApi` statics
  forward to the logic singleton at `/platform/idea/api/crafting`
  (`LOGIC_PATH` :241): `craft` :265, `mintFromBuild` :278, `repair`
  :292, `salvage` :303. `CraftRequest` :48 is
  `{recipeRef, makerMode, brand?, target?}` — **it carries no landing
  and no location**; the maker is derived from execution context.
  `CraftSuccess` :97 returns `{ok, output, grade, recipeId}`.
- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (3262
  lines). `craftImpl` :2556 → gather :655 → slot match :2613–2646
  (`pickItemInputs` :845 for `kind: item`, greedy to `count ?? 1`,
  `stack: true` ⇒ quantity debit, `false` ⇒ destruct) → tools by
  capability :2648 → heat :2660 → grade weakest-link :2703
  (`Grade.deriveAtFixedControl` = `reduce(min)`).
- ⛔⛔ **The flatten**: `applyTangibleOutput` :1619. Lines 1674–1712 sum
  every consumed item's mass into one `totalKg` and call `setMaterial`
  **once** (authored `outputMaterial` else `primary.material`). Only
  `setAlloying`/`setTemper` ride across (:1718), from `primary` only.
  Nothing records which inputs there were.
- ⭐ **The sanctioned extension point** — the docblock at :1355–1362:
  *"assembly an `applyComposedOutput` — each a new branch, never an edit
  to the craft skeleton."* Four arms exist today: `applyTangibleOutput`,
  `applyBulkOutput`, `applyEdibleOutput` :1824, `finishGlass` :1290.
  ⚠ The NAME in that docblock is unavailable: `MixinApi.isComposed` /
  `setComposition` :1729–1768 is the **nutrition** ledger
  (`{materialPath, servings}[]`, `Mixins.Composed = 'ComposedMixin'`,
  `lib/mixin.ts:486`). The assembly branch is `applyAssembledOutput`.
- ⛔⛔ **`craftImpl` does NOT place its output.** It returns
  `{ok: true, output, …}` at :2880. The one `ContainmentApi.move` in the
  tail (:2865) is the residue cake. Placement is each controller's own
  bare move — the census (non-test, `grep ContainmentApi.move(output`):

  | site | lands where |
  |---|---|
  | `trade-cooking/src/idea/cmd/crafting/CookController.ts:44` | `giver` |
  | `trade-cooking/src/idea/cmd/crafting/PreserveController.ts:118` | `giver` |
  | `trade-smithing/src/idea/cmd/crafting/ForgeController.ts:90` | `giver` |
  | `trade-smithing/src/idea/cmd/crafting/QuenchController.ts:175` | `giver` (the `mintFromBuild` path) |
  | `trade-milling/src/idea/cmd/milling/MillController.ts:306` | `giver` |
  | `trade-baking/src/idea/cmd/baking/BakeController.ts:74` | the **oven** when it is a usable chamber, else hand |
  | `platform/idea/cmd/crafting/SalvageController.ts:54` | `context.location` |

  Fourteen non-test callers of `CraftingApi.craft` / `mintFromBuild`
  exist in all: the seven above plus `OrderController` :158, `Mix` :34,
  `Serve` :46, `Strain` :88, `Dip` :111/:171, `Knead` :100, `Plate` :82
  — the bulk/edible ones, whose "output" is a glass or dish that was
  **already in the world** (claimed from the pool at :2746), so they
  move nothing. ⇒ the requirements' *"`fell`'s two lines at the craft
  mint, one change for every trade"* is false as a count and true as a
  shape: **make it one chokepoint, then it is one change** (D1).
- The **second mint path**: `mintFromBuildImpl` :2172 → `mintWorkpiece`
  :2328 / `mintVessel` :2423. `mintWorkpiece` sets material + mass +
  alloying on a cloned lump then `StuffApi.destruct(workpiece)` (~:2418)
  — the same flatten, no bill, and the output is returned unplaced.
- **Provenance**: the only stamp :2824 `output.stamp({maker:
  maker.getTemplatePath() …})`. ⚠ A templatePath, not an identity path
  — every player Avatar shares one. A maker-per-joint must use
  `getIdentityPath()` ([antipatterns § Keying a PERSON]).
- `salvageImpl` :3034 — refuses `!isTangible || isOrganism`, a non-empty
  build vessel, no material, `massKg <= 0`; `rate =
  dial(craftingSalvageRate, 0.5)`; per constituent `meltable ? 1.0 :
  rate`; metal → `/stuff/thing/Casting`, else `/stuff/thing/Scrap`;
  conservation throw; ends `StuffApi.destruct(item)`; outputs returned
  **unplaced**. ⭐ This IS the irreversible branch of disassembly.
- `repairImpl` :2893 — prices `1 − condition` as mass; metal needs forge
  heat, soft goods a `mending` tool; restores condition to 1, whole-item.
  No part is identified.
- ⛔⛔ **A reachability trap, live today**:
  `packages/content/platform/content/platform/cmd/crafting/repair.yaml`
  gates `item` on `requires: DurableMixin`, and `DurableMixin` is composed
  by exactly **four** classes — `platform/thing/Tool.ts:53`,
  `equipment/Weapon.ts`, `equipment/Shield.ts`, `equipment/Garment.ts`.
  `Vat`, `Lamp`, `Chair`, `Receptacle` are not among them, so `repair
  <cask>` dies at the binder with every controller test green.
  `salvage.yaml` gates on `TangibleMixin` and is fine.
- ⭐ **`garnish` is the one shipped part-keeps-identity case** —
  `gatherMatter` :664–682 refuses to descend into a Crafted container
  (*"the olive in a served martini is not the next martini's
  garnish"*); the garnish is matched but kept out of `matchedItems`
  :2709–2733 (never consumed, contributes nothing to grade/mass);
  `finishGlass` :1344–1353 moves it into the glass. No role label, no
  structural dependency, the `bulk` arm only.

### The mixins and value objects

| file | surface | fieldMeta | composed by |
|---|---|---|---|
| `lib/craft/Crafted.ts` (extends `Graded`) | `stamp(CraftedStamp)`, `getMaker/Recipe/CraftedAt` | maker/recipe/craftedAt `{persistent, runtimeState}` | `Tool`, `CraftVessel`, `Cutlery`, `Vat`, `GradedReceptacle`, `Provision`, `Sack`, `Crop`, `Weapon`, `Garment`, `Shield` |
| `lib/material/Durable.ts` | `getCondition/setCondition`, `wear(amount = 0.01)`, `isBroken()` (≤ `craftingBrokenThreshold`, fallback 0.1) | `condition {persistent, runtimeState}`, `_condition = 1`, accessor-clamped | the four above only |
| `lib/material/Constructed.ts` | `get/setConstructionForm` (throws `RangeError` unless `Construction.isForm`), `getConstruction(): Construction \| null` | `constructionForm {persistent, authorable}` | `Weapon`, `Shield`, `Garment` only. ⚠ **`Tool` composes no `Constructed`** — a haft has no construction today |
| `lib/craft/Tooled.ts` | capabilities, `hasCapability`, `capabilityControl` | `{persistent, authorable}` | `Tool`, `WateringCan`, `CocktailShaker`, pack tools (`GristMill`) |
| `lib/craft/Graded.ts` / `Grade.ts` | bands poor…masterful, `min`/`max`, `deriveAtFixedControl` | | |

- `platform/thing/Good.ts` — `Tangible + Containable + Chattel` and
  nothing else. `platform/thing/Tool.ts:53` =
  `CraftedMixin(ToolMixin(DurableMixin(Good)))`.
- `platform/thing/Vat.ts:37` =
  `VesselKindMixin(MaturingMixin(CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(Good))))))`;
  constructor sets `interiorBulk`, `category = 'vat'`, 100 L,
  `setClosure('liquidTight')`. `setOpen` reconciles the batch first.
- `platform/thing/Lamp.ts:92` =
  `BurnerMixin(LightSourceMixin(BulkableMixin(ThermalMixin(Good))))`;
  `BurnerMixin.getEmittedFlux` (`lib/fire/Burner.ts:738`) wraps
  `LightSourceMixin`'s and reads the base through a captured prototype
  — the seam a pane factor multiplies into.
- `platform/thing/Chair.ts:17` = `PosturedMixin(SlottedMixin(Good))`;
  `Vitals.ts:1437` reads `host.getRestQuality()` off the rest surface.
- `platform/thing/Receptacle.ts:46` = `ThermalMixin(BulkableMixin(Good))`.
- `platform/thing/equipment/Launcher.ts:19` = `LauncherMixin(Weapon)`.
- `platform/thing/instrument/Balance.ts:12` extends plain `Good` (not a
  Tool) — not an instrument-exemplar candidate.
- Stackable trade stock precedent:
  `trade-textiles/src/thing/TextileStock.ts:27` =
  `StackableMixin(CraftedMixin(Good))`.
- `lib/mixin.ts` — `Mixins` const; `_mixinRefusal` table at :855 shape
  `DurableMixin: "{} doesn't wear out"`.

### Materials response — the composite seam, exactly

- `api/material.ts:188` `attenuate(channel, energy, material,
  construction, grade?, condition?, agent?, penetration?, layerClo?)`
  (nine params; `materials-response.md` says six — stale).
- ⭐⭐ **`attenuate` has ONE non-Api caller**:
  `platform/idea/api/ConditionLogic.ts:1194`, inside
  `inflictThroughStack`, iterating `resolveCoveringStack(target, site,
  shieldFacing)`. Each layer is built by `layerOf(occ, construction)`
  (~:1180): `{occ, material: occ.getMaterial(), construction,
  grade: occ.getGrade(), condition: isDurable ? occ.getCondition() : 1}`
  — and the stack **skips any occupant whose construction is not a
  covering** (`if (!construction || !construction.isCovering())
  continue`). Wear lands on the layer at :1222 (corrosion that passed)
  and :1240 (a mechanical blow that was attenuated): `layer.occ.wear(…)`.
- `MaterialLogic.ts:506` `attenuateImpl`: a non-covering construction
  passes energy untouched; thermal channels fold by `clo`; `corrosion`
  by material tags; **`shock` passes untouched** (*"resolves by circuit
  upstream"*); only then `construction.responseFor(channel)` ×
  `materialScale(material, channel)` (:362 — edge → hardness, blunt →
  toughness, point → both, `default` → 0 *"never reached in practice"*)
  × `gradeConditionScale`.
- `lib/material/Construction.ts` — two closed kernel tuples
  (`COVERING_FORMS` :75 `plate|mail|padded|quilted|hide`,
  `WEAPON_DELIVERY_FORMS` :100 `bladed|pointed|hafted|flail|whip|blunted`)
  plus the **open fabric family** (`registerFabric` :379 from
  `FabricCatalogue.warm`, every fabric answering
  `TEXTILE_RESIST_PROFILE`). `responseFor` :507 **throws** on a delivery
  form and on a non-mechanical channel; `deliveryFor` :528 throws on a
  covering form; `getLayerDepth` :579 throws on a non-covering form
  (total only because every hot path filters `isCovering()` first);
  `doesNothing` :607. `Channel.ts:46` `CHANNELS =
  edge|point|blunt|shock|heat|cold|corrosion`, closed.
- `scripts/check-does-nothing.ts` walks `COVERING_FORMS` +
  `WEAPON_DELIVERY_FORMS` + the textile profile;
  `scripts/check-closed-vocabularies.ts` censuses kernel word lists
  content cannot add to (its header records `MATURATION_MECHANISMS`
  growing 4 → 5 inside a trade build as the injury it exists for).

### Persistence — the W0 facts

- `lib/chattel/Chattel.ts:97` declares `followCustody(): Promise<void>`
  and `stampChattel(owner)`; impl `ChattelLogic.ts:183–196` records,
  never judges; returns silently for a stackable, an unstamped good, a
  non-player owner, or no nearest host.
- Non-test `followCustody` call sites: `BuyController` :176 :286,
  `HangController` :119, `PutController` :292, `GetController` :455,
  `DropController` :220, `trade-forestry/…/FellController.ts:364`.
  **`CraftingLogic.ts` contains zero occurrences of `followCustody`,
  `captureHostOf`, `PersistableApi` or `stampChattel`.**
- ⭐ The pattern to copy — `FellController.ts:353–378`: `stamp(thing,
  owner)` = `stampChattel(owner)` then `followCustody()` (try/warn);
  `capture(host)` = `PersistableApi.captureHostOf(host)` (try/warn).
  Order: clone → move → stamp → at the end of the act capture the room
  and the giver.
- `api/persistable.ts` — `capture(host, key?)` :64, `captureHostOf`
  :109 (impl `PersistableLogic.ts:1183`: nearest persistable host, then
  `captureImpl`), `restoreOrSeed(host, key)` :120.
- The room's estate slice (`PersistableLogic.ts:495–554`
  `flushSkippedOwnedGoods`) writes each entry's `place:
  good.getPlace()` — the field `followCustody` writes — and the restore
  side `overlayOwnedGoods` :1014–1060 skips any entry whose
  `entry.place !== placeId`. An unplaced output falls out of both halves.
- Ratchet precedent: `scripts/check-create-sites.ts` (`CEILING = 5`
  :44, an `ALLOWED` map of survivor → why); the three-branch tail shape
  in `scripts/check-condition-arms.ts:308–333`; the shared reader
  `scripts/pack-roots.ts`.

### `Recipe` and the row-vocabulary precedents

- `lib/craft/Recipe.ts` — a value shape over a `kind: 'recipe'`
  document (`DocumentKinds.ts:59`, `contentDir: 'recipes'`).
  `RecipeInputSlot` :53 `{slot, category, minGrade, kind?: 'bulk'|'item',
  measureL?, count?}`. `fromData` :442 requires `recipeId`, non-empty
  `inputSlots`, `outputTemplate` and validates nothing about the output
  row existing. `count ≥ 2` is authored on 34 slots today (max 8).
  `baseGradeBand` and `imparts` are read (:2704, :1523) and authored
  nowhere; `kiln-malt.yaml:23` records `imparts` as retired to the
  vessel.
- `platform/idea/RecipeCatalogue.ts` — `onCreate → warm()` over
  `DocumentApi.listOfKind('recipe')`; ⚠ a malformed row is skipped with
  `console.warn`.
- ⛔ `scripts/check-reachability.ts:527` lists `outputTemplate` as a
  **faucet** (*"a recipe mints it"*) without checking the row resolves
  — which is how `/trade/distilling/thing/spirit-bottle`
  (`vat-whisky.yaml:57`, `compound-gin.yaml:20`) ships naming a row that
  does not exist (the authored row is `empty-spirit-bottle`).
- ⭐ `Joint`'s template is `platform/idea/Operation.ts` (`extends Idea`,
  `static CLASS_PATH`, fields `persistent: true`, read off
  `template.data`) + `platform/idea/OperationCatalogue.ts` (warmed by
  `Template.findByClass`, hand-written `buildDescriptor` validator,
  `onCreate → loadCacheFromTemplates`, residency + destruct vetoes).
  Rows at `trade-medicine/content/trade/medicine/idea/Operation/*.yaml`
  (`key, label, addresses, instrument, competence {discipline, band},
  bloodCostL, baseDurationS, anaesthesia, resolution, difficulty`).
  ⚠⚠ Copy **`ReadingCatalogue`'s lazy warm** (`warmedOnce` + `warmed()`
  warming on the first miss, `ReadingCatalogue.ts:100–137`), not
  Operation's cold-empty path. Both need a `boot:` line
  (`packages/content/platform/pack.yaml:68`, :86 — `role: sync-read`).
- `measure.yaml` is the flat-positional precedent: a string arg resolved
  against the catalogue, **`greedy: true` on every object arg** (the
  `look at the ground` defect), positional before prepositional.
  `mill.yaml` records that positionals bind in declared order and that
  its instrument arg queries the **mixin**, never the class.
- `ReadingCatalogue.warm()` indexes `Template.findByPathInfix('/idea/reading/')`
  by class; 37 channels, none named `capacity`. A pack reading is a row
  + a class (`trade-mining/…/idea/reading/strike.yaml` → `class:
  /trade/mining/idea/reading/StrikeReading`), with `channel`, `kind`,
  `scope`, `discipline`, `instrument`, `instrumentNoun`, `eyeCeiling`,
  `improves`, `stakes`. `lib/instrument/Reading.ts:654` `ceilingOf(tool)`
  reads the instrument's `getCondition()` — ⭐ **a damaged instrument
  already coarsens its reading through condition**; :1028 `wearOnce`.

### Maturation — Fork B's facts

- `lib/maturation/Maturing.ts` (1336 lines). ⛔ `:393`
  `__validateComposition__` **throws** unless the host composes
  `BulkableMixin`, and the hook is enforced (`api/mixin.ts:2180`,
  per concrete class at register). Half the mixin is bulk-specific: the
  batch IS the interior slot (an empty interior ends a batch, :545–553),
  `ensureInteriorMaterial` :1043 swaps the host's interior material,
  `applyImparts` :1009 writes into the contents' payload,
  `getBulkAvailable` :1080 / `getBulkPayloadForDraw` :984 override
  `Bulkable`'s surface, `evaporativeApertureM2` :290 derives from
  `getBulkCapacity('interior')`.
- The host-agnostic half, by line: `rateAt(profile, tempK)` :181 and
  `damageSat` :193 (module-private functions over a profile),
  `bandFor(worst)` :168, `_worstStretch` :500 (the min-over-samples
  satisfaction, husbandry's `_worstLimiting` second consumer),
  `maturationClockStamp` :488, `batchDays` :485, the gap integration at
  :596–747 (elapsed → `temperatureTrajectory(stamp, now)` :617 when the
  host is Thermal else `DEFAULT_ROOM_K` → per-stretch rate × days,
  `MATURING_SUB_STEPS = 8` :91), `applyBatchGrade` :937, the air-segment
  read `BiomeApi.airSegmentsFor(scope, stamp, now)` :1219.
- `fieldMeta` :403–435: every clock/batch field `{persistent,
  runtimeState}`; `imparts` `{persistent, authorable, spoiler: 1}` —
  an **array of plain objects** persisted directly (the precedent for
  the parts record's shape).
- `MaturationProfileCatalogue.warm()` globs `/idea/maturation/` by
  path infix across every root (no boot line per pack). Profiles key on
  the LIQUID's `inputCategory`; `forMaterial` resolves a double match by
  lowest key, silently — the stated reason `imparts` lives on the
  vessel.
- `trade-forestry/src/lib/Stand.ts:11` — *"two instances is where a
  pattern is NAMED, not factored."*

### The wood column and the pack shape

- `trade-forestry` (`pack.yaml` root `/trade/forestry`, title
  `/compact/trade`): `src/thing/Bole.ts` (plain `Good`; `TIMBER_MASS_KG
  = 24`, `BOLE_LENGTHS = 6`, `@Final takeLength()`,
  `commandContributions.self = ['trade/forestry/cmd/forestry/fell.yaml']`;
  docstring: *"The bole on the ground IS the seam `trade-sawing` attaches
  to (boards, not lengths)"*), `Panel.ts`, `SapStandard.ts`,
  `location/Wood.ts`, `lib/Stand.ts`, `idea/cmd/forestry/{Fell,Tap}Controller.ts`.
  Rows: `thing/{bole,timber,log,cordwood,felling-axe,billhook,…}`,
  recipes `billhook.yaml`, `felling-axe.yaml` (⚠ forge-welds a haft at
  1300 K), ten species rows, two maturation profiles. `fell.yaml`'s
  `target` is `requires: any`, polymorphic by design.
- Ten wood material rows at `packages/content/*/content/stuff/idea/material/wood/{ash,beech,birch,elm,hazel,maple,oak,pine,willow,yew}.yaml`.
- `trade-milling` (23 files) is the pack to scaffold from: `pack.yaml`
  `{id, version, root, description, requires.title[]}`, `package.json`
  deps `content-base-library`, `content-generic-objects`,
  `content-platform`, `server`, `types` — ⭐ **no dependency on the water
  pack** though `GristMill` reads a river; `tsconfig.json`,
  `vitest.config.ts`, `README.md`; `content/stuff/…` (commons),
  `content/trade/milling/…` (own root: `cmd/milling/mill.yaml`,
  `idea/Discipline/milling.yaml`, `idea/HelpConcept/*.yaml`,
  `idea/cmd/milling/MillController.yaml`, `thing/*.yaml`),
  `content/recipes/*.yaml`; `src/thing/GristMill.ts`,
  `src/idea/cmd/milling/MillController.ts`, `src/__tests__/`.
- `trade-milling/src/thing/GristMill.ts` =
  `ComminutingMixin(ToolMixin(Good))`; a **static**
  `commandContributions {self: [], peers: [mill.yaml], environment:
  [mill.yaml]}`; the duck-typed `powerTake()` (a room sibling answering
  `generationW(flow)` + `getReachRef()`), `refreshPower` memoised per
  six-game-hour segment with `catch → 0`, `public override async
  settlePower()` (⚠ exists because a fresh mill's first `mill` read a
  cold cache), `availablePowerW()`, test seam `_setCachedPowerW`.
  ⚠ Sawing is conversion, not comminution: copy the shape and the power
  read, not `ComminutingMixin`.
- The grist mill sits at
  `hearts-delight/content/world/terminus/hearts-delight/location/millsite.yaml`
  (class `/platform/location/Street`, `props: [millrace, grist-mill,
  toll-bin]`, `cast: [miller]`, exit north → `bench-lane`), on the
  Delight (`world-seed/…/Watercourse/delight.yaml`: nodes `spring 720 m
  → flats 180 m → mouth 35 m`, basin `kestrel`). The five hearts-delight
  locations: `barn`, `bench-lane`, `farmstead-yard`, `millsite`,
  `valley-gate`.
- Disciplines are rows at `<root>/idea/Discipline/<key>.yaml`
  (`milling.yaml`: `key, channel: skill, label, description, iscedf,
  requires, specializes, synergizes, conferrals`); the three pick-trio
  recipes are `discipline: mining`; `mining.yaml` is `iscedf: "0724"`.
- Cross-pack class references are normal (`trade-fuel` rows name
  `/trade/distilling/thing/Still`; ranching names tanning's `Hide`;
  tailoring names textiles' `TextileStock`), and sixteen `trade-*`
  `package.json`s depend on other trade packs.
- `extends:` precedent: `base-library/…/biome/outdoor/meadow.yaml` and
  two siblings.

### The cask's ten consumers, by class

Rows naming `/platform/thing/Vat` (16): generic-objects `culture-jar`,
`carboy`; apiculture `honey-jar`; baking `starter-crock`; brewing
`cask`, `vat`, two culture jars; distilling `cask`, `charred-cask`,
`vat`; forestry `sap-pan`; malting `malting-floor`; quarrying
`salt-pan`; winemaking `conditioning-bottle`, `vat`. ⚠ **`trade-fuel`'s
`oil-cask` and `lamp-oil-cask` are `/platform/thing/Bottle`** — casks
by name, bottles by class. `generic-objects/…/vessel/pail.yaml` is a
`Receptacle`; `fixture/water-butt.yaml` a `WaterFixture`
(`UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))` — a source,
not a vessel). The distilling cask rows: `category: cask`, oak,
`mass: 40`, `interiorCapacity: 25`, `closure: liquidTight`, authored
`imparts` (plain: oak 25 / vanilla 3; charred: vanilla 40 / char 120 /
oak 15). `ClosureLevel` (`lib/bulk/Bulkable.ts:67`) is
`'open' | 'liquidTight' | 'sealed'` — **there is no dry-tight band**.

### The exemplar rows, by class

armchair → `/platform/thing/Chair` (generic-objects `fixture/armchair.yaml`)
· bed → `Chair` · table → `Fitting` · wardrobe → `Chest` · lantern →
`Lamp` (terminus `general-store/thing/lantern.yaml`) · plough → `Tool`
(trade-farming) · hunting-bow → `equipment/Launcher` · pail →
`Receptacle` · smoker → `/trade/apiculture/thing/Smoker`
(`BurnerMixin(…)`) · sextant → `Tool` · shears → tailoring's
`CuttingTool` · spear/mace → `Weapon` · shield → `Shield` · boots →
generic-objects `armor/leather-boots.yaml` (`Garment`) · drop-spindle →
`trade-textiles/…/thing/drop-spindle.yaml` · frame/hive/super/nuc →
apiculture rows. **No row exists for a froe, drawknife, adze, croze,
driver, hoop, stave, board, peg, dowel or billet.**

### The gauger's two halves

- `api/government.ts:111` `holdsSeat(character, governmentKey, seatKey)`
  (impl `GovernmentLogic.ts:116–147`: the seat off the catalogue → live
  `Employment` records matching `(department, positionKey)` → roster
  assignments). Also `governmentAt(address)` :68,
  `governmentChainAt` :76, `subjectTo` :84, `seatsOf` :130.
- `Government.ts:39` `GovernmentSeat {key, label, department,
  positionKey}`; authored `platform/…/Government/terminus-city.yaml`
  (seats `magistrate`, `public-works`; department
  `/world/terminus/registry/business`).
- `terminus/content/world/terminus/registry/business.yaml` — positions
  `registrar`, `magistrate`; rosterSlots assign both to
  `/world/terminus/registry/clerk`. ⚠⚠ A seat whose `positionKey` is
  not on the department's chart resolves and never matches anybody.

### The compartment's two design docs

- `docs/slates/builds/fridge-design-pack.md` § *`Chamber` and the
  `Atmospheric` widening* (graduated 2026-09-28, verified against MR
  !302): `platform/thing/Chamber.ts =
  AtmosphericMixin(PlacingMixin(DetailedMixin(Thing)))`, occupancy by
  **placement** (`occupants()` → `getPlaced('in')`), the
  `AtmosphericMixin<MixinConstructor<Stuff>>` widening (about a dozen
  `Stuff & Container` retypes in `BiomeLogic`/`BiomeApi`), *"Agents are
  placeable in a Chamber."*
- `docs/slates/tails/chambered-vessels-slate.md` (2026-09-25):
  `ChamberedMixin` on the host minting chambers at `postRegister`, each
  chamber *"its own Stuff — a Vessel (Container + Atmospheric)"*,
  occupancy by **containment**, a no-loose-contents invariant,
  part-transparency in scope-walk + `canReach`.
- They agree a chamber is its own Stuff with its own air and disagree on
  whether a thing sits **in** it by placement or by containment. See
  D15.

### Lint and test shape

- 73 `lint:*` scripts in `packages/server/package.json`; `lint:family`
  derives the roster. Relevant to this build by name:
  `lint:closed-vocabularies`, `lint:does-nothing`, `lint:capabilities`
  (a capability kind must be consumed — by a recipe slot, a view's
  `[capability.X]` arg or a `hasCapability` read), `lint:reachability`,
  `lint:create-sites`, `lint:instanceable`, `lint:mixin-names`,
  `lint:field-meta`, `lint:verb-collisions`, `lint:instrument-args`,
  `lint:untitled`, `lint:counters`, `lint:object-verbs`,
  `lint:lib-statics`, `lint:module-scope`, `lint:imports`,
  `lint:test-bootstrap`, `lint:drive-scripts`.
- Wire drives live at `packages/wire/tests/<feature>.dirty.wire.test.ts`
  (forestry, metal-chain, grain-chain, crafting are the nearest shapes).

---

## Plan-level decisions

### D1 — Fork A: the mint lands its output through ONE chokepoint (A2)

**Question.** `craftImpl` returns its output unplaced and seven
controllers each do a bare `ContainmentApi.move`. Fix the seven (A1), or
move placement into the Api (A2)?

**Choice: A2.** `CraftRequest`, `BuildMintRequest` and `SalvageRequest`
gain an optional `landing`:

```ts
export type Landing = 'hands' | 'here' | { into: Stuff } | 'none';
```

Default `'hands'` for a tangible output, `'none'` whenever the output is
a vessel claimed from the pool (`application !== 'tangible'` — the glass
is already on the bar; the Api must not move it). `CraftingLogic` gains
one module-private `landOutput(output, maker, landing)` beside
`applyTangibleOutput` (inside the logic file — not a new module): move
(`ContainmentApi.move` — into the maker, the maker's container, or the
named container), then the `FellController` pair —
`stampChattel(maker)` + `followCustody()` when the output is Chattel and
unstamped, then `PersistableApi.captureHostOf(output)` and
`captureHostOf(maker)` (try/warn). `salvageImpl`'s outputs land `'here'`
by default; `mintWorkpiece`'s lump `'hands'`.

The seven controllers **delete** their move (Bake passes
`landing: {into: oven}` when it has a usable chamber; Salvage passes
nothing). The other seven callers are unchanged (`'none'` is derived).

**Price, honestly.** A1 is seven six-line insertions and leaves the
contract alone; its weakness is that it is the exact failure class the
requirements name (*"the seventh verb forgets"*), and Salvage/Bake show
the landing is already per-site policy, so a convention would carry a
parameter anyway. A2 touches the Api's request shapes (three interfaces,
additive and optional), `craftImpl`/`mintFromBuildImpl`/`salvageImpl`
(one call each), seven controllers (deletions), and every controller
test that asserts the output's container keeps passing because the
default is what they did by hand. It changes the contract of fourteen
call sites in one build in the sense that the Api now places — which is
the doctrine (*go through the Api layer*; `ContainmentApi.move` is the
orchestration layer and `craftImpl` already moves the residue and the
garnish). **A2 is the smaller diff and the stronger guarantee.**

**The ratchet still exists** — for everything that is not a craft:
`scripts/check-mint-custody.ts` (`lint:mint-custody`) censuses files
that call `StuffApi.clone(` **and** `ContainmentApi.move(` and contain
neither `followCustody` nor `stampChattel` nor a `CraftingApi.craft|
mintFromBuild|salvage` call (the Api now does it for them). Today's
count is the ceiling, each survivor enumerated with a why (the
`check-create-sites` shape), driven to zero across the build's waves.
AC 1's *"gated at zero"* is satisfied when the ceiling reads 0 at the
MR; if a survivor is legitimately not custody (a thrown spell locus, a
hazard's trap) it is enumerated, not counted.

### D2 — Fork B: seasoning rides the maturation CLOCK, not `MaturingMixin`

**Question.** Requirements D9 says seasoning *rides `MaturingMixin` on
the GOOD*. `Maturing.__validateComposition__` throws on any host without
`BulkableMixin`, and half the mixin is the interior bulk slot.

**Choice.** Lift the host-agnostic half into a kernel value object,
`lib/maturation/MaturationClock.ts` (category: named value-object), and
give seasoning a sibling mixin that consumes it:

- `MaturationClock` — pure, no Stuff, no state of its own: `integrate({
  stampS, nowS, trajectory: TemperatureSample[], rateAt(tempK),
  damageSat(tempK), subSteps }) → { days, advanced, worst }` (the
  :596–747 loop), `bandFor(worst)` (:168), and the two curve shapes
  (`stallBelow / happy / damageAbove` with `DAMAGE_RAMP_K`, :181–197)
  as static functions over a `ClockProfile {stallBelowK, happyK,
  damageAboveK, ratePerDay, stallAboveK?}` — which `MaturationProfile`
  already is.
- `MaturingMixin` keeps every field and every bulk-specific method and
  calls `MaturationClock.integrate` where the loop was. **Byte-identical
  numbers**; the existing `Maturing` tests are the regression net.
- `lib/maturation/Seasoning.ts` → `SeasoningMixin` (`Mixins.Seasoning`,
  refusal `"{} doesn't season"`): fields `seasonedFraction` (0..1),
  `seasonClockStamp`, `quarterSawn: boolean` (`{persistent,
  runtimeState}`; `quarterSawn` also `authorable`); reads
  `getMaterial().getSeasoningDays()` (0 ⇒ the mixin is vacuous — the
  thing does not season), the air over the gap from
  `BiomeApi.airSegmentsFor(scope, stamp, now)` (the evaporative
  mechanism's read, :1219 — not `temperatureTrajectory`, a board is
  not Thermal), rain on a sky-exposed stack subtracts (the evaporative
  precedent *"rain reverses it"*), and the clock profile is a kernel
  constant (`stallBelowK 273, happyK 290, damageAboveK 330` — a
  split from drying too fast); `isSeasoned()` (≥ dial
  `woodSeasonedThreshold`, 0.8), `isGreen()`. The grade read on a
  seasoning host is capped at `poor` while green (the shipped quality
  axis is how the difference is priced).
- Two new authorable fields on `Material` (`platform/idea/material/
  Material.ts`): `seasoningDays` (days to season a 25 mm board at
  `happyK`; default 0) and `greenShrinkage` (0..1; default 0). The ten
  wood rows author them (oak 365, ash 300, beech 330, elm 400, yew 540,
  pine 180, birch 200, hazel 150, willow 150, maple 300 — grain, an
  author's numbers). No new row kind, no catalogue, no boot line.

**Cost, honestly.** The extraction is a refactor inside a 1336-line
mixin with ten consumers (every ferment, every cask, two sap profiles);
it lands as its own commit with no behaviour change before the
seasoning mixin exists, and the sweep's regression net is the whole
`lib/maturation/__tests__` + `trade-brewing` / `trade-distilling` /
`trade-winemaking` / `trade-forestry` suites. About a day. The
alternative — removing the composition guard and composing `Maturing`
on a board — ships a board with a bulk slot, a lees floor and an
aperture of zero; it is not a cheaper path, it is a wrong one.

⚠ **This is a requirements-level change** — D9's mechanism sentence
becomes *"seasoning rides the maturation clock as its second host"*.
Product behaviour is identical (reconcile-on-read, a species-level
rate, green wood that warps). Flagged in *Risks & opens* for the user to
confirm; the build proceeds on it.

### D3 — The data model: a BILL of lines on the kind, a recursive PARTS record on the instance, no child objects

**Question.** Is a part a bill line or a real object, and does a line
point at a nested bill?

**Alternatives priced.**

- *M2 — real child objects* (parts contained inside the whole, role-
  labelled): nesting is free, per-part condition is free, but thirty
  staves are thirty objects (or one stack with one condition), D16's set
  joint needs a relation over thirty contained things, in-place
  inspection must be actively refused by a perception gate, and the
  whole's capture must serialize a subtree. The slate priced this and
  refused it (*"thirty staves is a line on a record"*).
- *M1 — lines only, flat*: nesting impossible except by row reference,
  so a cushion you made and fitted loses its own record.
- **M3 — lines, where a line may carry a nested record** — chosen.

**The kind (row), authorable, persisted with the row's other authored
data (`bill: {persistent: true, authorable: true}` — the `imparts`
shape):**

```yaml
bill:
  parts:
    - { part: stave, template: /trade/coopering/thing/stave, count: 30, role: structural }
    - { part: hoop,  template: /trade/smithing/thing/hoop,   count: 6,  role: fastener }
    - { part: head,  template: /trade/coopering/thing/cask-head, count: 2, role: structural }
  joints:
    - { key: hooping, method: hooped, members: [stave, head], fastener: hoop }
```

`role ∈ structural | fastener | wear | facing` (the requirements' four).
`method` names a `Joint` row (D4). `members` names parts; `fastener`
names a `role: fastener` part. A sub-assembly is a part whose own row
has a bill — **nesting is by row reference on the kind** (a cask head's
row declares boards + dowels, pegged), which is D15's rule made
structural: a part whose row has no bill is a leaf.

**The instance, `{persistent: true, runtimeState: true}`, two arrays of
plain records (no Map, no class instance — the `imparts` precedent, no
marshaller):**

```ts
interface PartLine {
  part: string;            // the bill's name
  template: string;        // the row that was consumed
  count: number;
  material: string;        // material templatePath of what went in
  grade: GradeBand;
  condition: number;       // 0..1, the set's wear gauge
  failed: number;          // members that have failed discretely (sprung, split, warped)
  green?: boolean;         // worked unseasoned (D2)
  makers: string[];        // identity paths; grows on every fit
  parts?: PartLine[];      // the nested record, when the fitted part was itself an assembly
  joints?: JointState[];
}
interface JointState {
  key: string;             // the bill's joint key
  tension: number;         // 0..1; slack below dial `jointSlackThreshold` (0.5)
  maker: string;           // identity path of whoever made or last re-made it
}
```

⭐ **Wear and failure are two things.** `condition` is the set's gradual
wear; `failed` is a count of discrete member failures. *The haft is
split* is `failed = 1` on a count-1 line; *one stave is sprung* is
`failed = 1` on a count-30 line with `condition` untouched; *the hoops
are slack* is a joint's `tension` below the dial with every line sound
(AC 6, D16). Replacing `k` of `n` members: `failed -= k`, `condition =
(condition·(n−k) + k)/n` — a count-1 line comes back to 1.

**A found instance** (`parts` empty, `bill` present) reads every
derived property off the bill at defaults (grade `fair`, condition 1,
`failed 0`, no makers) and **materializes** `parts` from `bill` on its
first mutating act (`ensureParts()` — the first routed wear, the first
`fit`, `salvage`), so a spawned cask yields thirty generic oak staves
and a spawned pick that takes a shock gets a haft line at that moment
(D7, AC 26).

**A crafted instance** gets its `parts` from what the recipe consumed
(D5), its `joints` from the row's bill with `tension 1` and the maker's
identity path. ⭐ *Zero content change for the pick* (AC 3): the parts
record comes from the matched slots (`head`, `haft`) with no bill on the
row at all; the joints come from the row's bill, which W1 adds to
`pick.yaml` — a content edit on the row, with the recipe untouched.
`lint:bills` (D11) is what makes the recipe's slots and the row's bill
*one declaration*: every structural/fastener part of a row's bill must
be covered by an item slot of the same name and count on every recipe
that outputs that row.

### D4 — `Joint` rows: the `Operation` shape, the `Reading` warm

`platform/idea/Joint.ts` (`extends Idea`, `static CLASS_PATH =
'/platform/idea/Joint'`, fields `persistent: true`) and
`platform/idea/JointCatalogue.ts` (`Template.findByClass`, lazy
`warmed(key)` + `allWarmed()`, residency and destruct vetoes, a boot
line in the platform pack). Row shape:

```yaml
class: /platform/idea/Joint
data:
  key: hooped
  label: hooped
  portability: tool            # hand | tool | premises  (the ladder)
  instrument: driving          # a capability kind, '' for by-hand
  competence: { discipline: coopering, band: competent }   # the band to MAKE it
  reversible: effort           # freely | effort | never
  strength: 0.6                # the shock fraction (0..1) a joint takes before it slackens
  structuralRecovery: 0.8      # the fraction of structural members a competent hand gets back
  fastenerRecovery: 0.5        # the fraction of fasteners that survive (D16: mostly not)
  tightenable: true            # repair's cheapest rung applies
  failure: slack               # the word: slack | sprung | parted | split
```

**Who ships which row is decided by its competence Discipline, and it
must EXIST when the row ships.** ⛔ A Joint whose `competence.discipline`
names a Discipline that does not exist yet is the silent class: every
salvager reads as novice and nothing says why. `carpentry` and
`coopering` are created in W4 and W5, so the rows that need them ship
there. (Found in the plan's once-over, 2026-10-09.)

- **The platform pack** (W1), at
  `packages/content/platform/content/platform/idea/Joint/` — the joints
  whose competence already exists, or that need none:
  `friction` (hand · freely · the drop spindle's floor), `wedged` (hand ·
  effort · the pick, every hafted tool), `seated` (hand · freely · the
  lantern's pane), `glued` (hand · never), `stitched` (tool `mending` ·
  effort · `tailoring`), `riveted` (tool `striking` · never ·
  `smithing`), `soldered` (premises `heat` · never · `smithing`).
- ⭐ **The by-hand rung carries NO competence gate** —
  `competence: null` is legal on a `portability: hand` row, and
  `buildDescriptor` accepts it. This is the bootstrap root stated as
  data: anyone can wedge a haft, which is what lets the hand rung make
  the hand-tool rung's tools (AC 21). The recovery curve on a null-
  competence joint uses the salvager's band in the *whole's* recipe
  discipline, else flat.
- **`trade-carpentry`** (W4) ships `pegged` (tool `driving` · effort ·
  the frame) at `content/trade/carpentry/idea/Joint/pegged.yaml`.
- **`trade-coopering`** (W5) ships `hooped` (tool `driving` · effort ·
  the cask; `fastenerRecovery 0.5`) at
  `content/trade/coopering/idea/Joint/hooped.yaml`.

⭐⭐ **And this turns D4's own promise into a demonstration.** "A pack
may ship its own under `<root>/idea/Joint/`" was a claim; with `pegged`
and `hooped` shipped by the trades that practise them, AC 4 (*a new one
can be added with nothing in the engine changed*) is proven by
**shipped content**, not only by the W1 test fixture. `JointCatalogue`
warms by class across every root, so neither pack needs a boot line.

⛔ No `threaded` row ships (non-goal); the vocabulary admits it as a row.

The competence curve for recovery is code over the row's figure (dial
`salvageRecoveryByBand`: novice 0.5 × … master 1.1 ×, clamped), so *an
expert recovers more than you* (AC 8, AC 12) without a second row.

### D5 — The recipe assembles; `fit` has two arms and is the ONE new verb

`fit <recipe>` with no `whole` raises the whole from the parts in reach
(an ordinary craft through `CraftingApi.craft`; the mint writes the
parts record). `fit <part> to <whole>` replaces one member of one line:
mints the failed member if it is worth minting (a sprung stave is not —
it becomes the irreversible branch's scrap), consumes the new part
(matched by the line's bill `template`, or a row carrying the same
category when the bill is absent), amends the line, re-makes the joints
the member belongs to at `tension 1` under this maker's identity, and
re-derives grade (weakest link) and mass. Both arms need the joint's
instrument in reach and the joint's band; both end with
`captureHostOf(whole)`.

`fit <part>` with no `whole` and a bound object: the controller finds
the one reachable assembly with a failed or missing line that part
satisfies, else refuses naming what it would need. Raw text that
matches no object but matches a recipe the maker knows is the first
arm. The view (`platform/cmd/crafting/fit.yaml`):

```yaml
verbs: [fit]
controller: /platform/idea/cmd/crafting/FitController
args:
  - { name: thing, type: object, required: false, greedy: true, scope: ["reachable"], requires: any }
  - { name: whole, type: object, required: false, greedy: true, prepositions: [to, on, in, into, onto], scope: ["reachable"], requires: AssembledMixin }
  - { name: tool, type: objects, required: false, greedy: true, prepositions: [with, using], default: "reachable:[mixin.ToolMixin]", scope: ["reachable"], requires: [ToolMixin] }
```

`thing` is `required: false` so an unresolved recipe word binds as
`{stuff: null, raw}` (the `measure.yaml` rule); the controller refuses
when nothing bound at all.

**Affordance — verified, and not `repair`'s path.** `repair`/`salvage`
are afforded by INSTRUMENT classes' statics (`platform/thing/MendingTool.ts:17`,
`trade-smithing/src/thing/Anvil.ts:18`, `trade-tailoring/src/thing/SewingTool.ts:47`,
`trade-glass/src/thing/GrozingPliers.ts:12`). `fit` cannot ride that:
the hand rung (`friction`, `wedged`, `seated`) has no instrument, and
the cooper's driver is a `Tool` ROW, not a class. So `fit` is afforded by
**what is being fitted**: a static `commandContributions {self:
['platform/cmd/crafting/fit.yaml'], peers: [the same]}` on the class
`AssembledMixin` returns (mixin statics UNION; base-class statics
shadow — the shipped rule) and `peers` on `Timber`. Every assembly
affords fitting a part to itself; every part in reach (a `Tool`, an
`Assembly` or a `Timber` row — the only classes bills name) makes the
raise arm sayable beside it. A binder test asserts `fit` binds with a
pick in reach and with only staves in reach.

⭐ This keeps AC 7 literal. The wood column's conversion acts (`rive`,
`saw`, `carve`) are trade verbs for rung-1/2 transformations — the
precedent is every trade pack's own verbs — and are not assembly's
budget. Named in *Risks & opens* so the reading is the user's, not the
plan's.

### D6 — `repair`'s ladder and `salvage`'s reversible branch

`repairImpl` on an Assembled item, in order, first rung that applies:

1. **a slack joint** (any `tension` below the dial) → tighten: needs the
   joint's instrument + band; consumes nothing; `tension = 1` (AC 6,
   drive 8). The response names the joint.
2. **a failed line** → refuse with the part named and the cure — *"the
   haft is split; fit a new haft"* (the refusal is the progression UI;
   AC 10). Below the joint's band the name is the SET, not the member
   (*"something about the staves"*) — the diagnosis rung, grain.
3. **a spent character** (a Maturing host whose `impartsSpent ≥ 1`) →
   the cooper's re-fire: needs reachable heat ≥ `charK` and a `shaving`
   instrument + `coopering` band; `impartsSpent = 0`, `charLevel = 1`
   (D9; drive 17).
4. **wear** → today's material-priced restore over the worst line; every
   line's `condition = 1`.

`salvageImpl` on an Assembled item with joints: for each structural line
`recovered = floor(count × joint.structuralRecovery ×
bandFactor(salvager))`, minted from the line's `template` with the
line's material/grade and the nested record re-applied; the remainder
and every fastener's non-recovered share go down the existing
irreversible path by mass (scrap / casting); a joint `reversible: never`
sends everything down it. A line with no joints (an informational
record on a one-slot thing) is the irreversible branch, unchanged. The
conservation throw keeps its meaning: recovered mass ≤ input mass.

### D7 — Wear routes to the part that answers the channel, and the channel-routing hypothesis HOLDS

The hypothesis: *route the channel to the part, then call the existing
single-material `attenuate` with that part's own material and
construction.* Tested against the code:

- **It holds for the only place composite response is read.**
  `attenuate` has one caller, the covering fold, which already builds a
  per-layer `{material, construction, grade, condition}` and already
  lands wear on `layer.occ`. For an Assembled occupant (a shield of
  boards + a hide face; boots of upper + sole), `layerOf` asks the host
  `partAnswering(channel)` and builds the layer from THAT line's
  material, construction (the part's own `constructionForm` if its row
  has one, else the host's), grade and condition; the fold's call to
  `attenuate` is unchanged; wear lands via `host.wearLine(line, amount)`
  instead of `occ.wear`. **No synthetic `Construction`, no composite
  arithmetic, no authored profile** — the standing doctrine survives.
- **The derivation rule is the fold's own function.** *Answers* = the
  part with the greatest attenuation at unit energy for that channel,
  computed by calling `MaterialApi.attenuate` per candidate — the layer
  that stops the blow is the layer that takes it. One Api addition,
  `MaterialApi.rankAgainst(channel, candidates: {material, construction
  | null}[]) → number` (index of the best resister; `lint:object-verbs`
  is untouched — its first parameter is a channel), with its impl in
  `MaterialLogic` beside `attenuateImpl`.
- **Its honest limits.** Only the mechanical channels route through the
  fold; thermal keeps the garment's `clo` and corrosion keeps the host's
  material (the outer surface is what the lye meets — the whole's
  authored material is the facing's by authoring convention, recorded).
  `shock` never enters the fold, so *a haft breaks from shock* is a
  **use-wear** route, not a fold route; and `hafted` is a delivery form,
  so a pick is never a covering layer — correct.
- **Use-wear routing**, the same rank run the other way:
  `AssembledMixin.wear(amount, channel?)` overrides Durable's. With a
  channel: route to the line *weakest* against it
  (`rankAgainst` inverted — the lowest resister), where for `shock`
  `MaterialLogic` reads toughness directly (today's `materialScale`
  `default` branch is documented *"never reached"*; it now is, and reads
  toughness — a one-line, honest extension). Without a channel (the
  crafting `t.wear()` at :2871, `Reading.wearOnce`, `Sharpen`/`Hammer`/
  `Maintain`): route to the declared `role: wear` line if any (the share
  wears, D17), else spread across structural lines. `CombatLogic`'s two
  weapon wears (:2349 per strike, :2941) pass the weapon's primary
  delivery channel; the crafting wear passes `shock` for a `striking`
  capability (the pick, the sledge) and nothing otherwise — a two-line
  table in `CraftingLogic`, grain.
- **A line fails** when its routed wear would drive `condition` below
  the broken dial (`failed++`, condition restored to the set's remaining
  members) or when a single routed shock exceeds `joint.strength ×
  material toughness` (the haft under the sledge). A joint slackens
  under a shock above its `strength` (the hoop under a drop).
- `getCondition()` on an Assembled host with parts = `min(own gauge,
  min over lines of condition, 0 for any failed structural line)`;
  `isBroken()` = a failed structural line, or a joint below the broken
  dial, or Durable's own test. ⭐ This is why the instrument exemplar
  costs nothing: `Reading.ceilingOf` reads `getCondition()` (AC 11).

**D10 — riven versus sawn through the construction axis.** Needs a
third, closed, kernel form domain in `Construction.ts`: `STOCK_FORMS =
['riven', 'sawn', 'hewn']`, `domain() → 'stock'`, `isCovering()` and
`isWeapon()` false (so `responseFor`/`deliveryFor`/`getLayerDepth` keep
their guards and every hot path keeps skipping it), and one new read
`integrityFor(channel): number` (riven 1.0 everywhere; sawn `blunt 0.7,
shock 0.7` — fibres cut across; hewn 0.85) that `rankAgainst` and the
use-wear route multiply into the material's figure. `doesNothing()` for
a stock form: has effect iff some channel ≠ 1. `check-does-nothing.ts`
walks the new tuple. ⚠ `lint:closed-vocabularies` will census the
growth; this is a kernel-led build and the rise carries its caller
audit in the commit (the only readers are `Constructed.setConstructionForm`
and the two folds). Not needed for the hypothesis; needed for AC 20.

### D8 — Host placement, decided (see the section below)

`AssembledMixin` requires `DurableMixin` on its host
(`__validateComposition__`, the Maturing precedent) and composes
**outside** it. New concrete class `platform/thing/Assembly` =
`AssembledMixin(DurableMixin(CraftedMixin(Good)))` — *a made thing of
parts with no other capability* (the cask head, the bellows, the
frame, the cushion, the wheel). Composed onto `Tool`, `Weapon` (hence
`Launcher`), `Shield`, `Garment`, and — gaining `Durable` in the same
stroke — `Vat`, `Lamp`, `Chair`, `Receptacle`; and in the apiculture
pack onto `Smoker`.

### D9 — The cask's character is INSTANCE state over two authored profiles

On `MaturingMixin` (the cask is a Vat): `fillCount`, `impartsSpent`
(0..1; `startBatch` adds dial `impartsSpentPerFill` 0.34, so a third
fill gives little and a fourth nothing) and `charLevel` (0 plain, 1
charred), all `{persistent, runtimeState}`; a second authorable profile
`charredImparts` beside `imparts`. The effective imparts =
`(charLevel ? charredImparts : imparts) × (1 − impartsSpent)`.
`applyImparts` :1009 reads the effective figure. The re-fire (D6 rung
3) resets `impartsSpent` and sets `charLevel = 1`. ⭐ The charred cask
row becomes the plain cask row with `charLevel: 1` authored — and the
cooper's re-fire of a plain cask MAKES a charred one, which is what
re-firing does (AC 23; drive 17).

### D10 — The commons cask and `extends:`

The cooper's recipes must name an AUTHORED row (requirements §
*Collisions*), and coopering cannot depend on distilling. So the cask
moves to the commons: `generic-objects/content/stuff/thing/vessel/cask.yaml`
(wet; `class: /platform/thing/Vat`, the bill, 25 L, `imparts` oak +
`charredImparts`), `slack-cask.yaml` (`closure: open`) and
`dry-cask.yaml` (`closure: dryTight`). The three coopering recipes
output these three rows at three competence bands (AC 22 — a
**capability** ladder: `slack-cask` at `novice`, `dry-cask` at
`competent`, `cask` at `proficient`, the same bill in all three). The
ten shipped consumers keep their paths and gain `extends:
/stuff/thing/vessel/cask` (brewing's `cask`, distilling's `cask` and
`charred-cask` — the latter overriding `charLevel: 1`), their own
`imparts` deleted where the commons row's answers (the build diffs each
row: a consumer that authored a different capacity keeps it). ⚠ The
fuel pack's `oil-cask`/`lamp-oil-cask` are `Bottle`s by class and stay
exactly as they are (AC 27, read literally); a deferred seam.

**`dryTight`** is a new `ClosureLevel` between `open` and `liquidTight`
(`compareClosure` orders it; a `pour` into a dry-tight cask is refused
by the existing :710 comparison with the stated reason — drive 9). A
kernel list edit; the closed-vocabulary census rises by one with its
audit.

**Leaks derive.** `AssembledMixin.leaks(): boolean` = any structural
line failed or any joint slack; `Vat.getClosure()` and
`Receptacle.getClosure()` override to `'open'` while `leaks()` — four
lines each; the authored closure is the ceiling, the joints are the
floor. The requirements' *"closure must derive from joint state"* is
this (drive 7, 8).

### D11 — Gates: `lint:bills`, `lint:recipe-outputs`, `lint:mint-custody`

- `scripts/check-bills.ts` — every `bill.parts[].template` resolves to
  a row; every `joints[].method` names a Joint row; `members`/`fastener`
  name parts; a `fastener` is `role: fastener`; **every recipe whose
  `outputTemplate` row has a bill covers each structural/fastener part
  by an item slot of the same `slot` name and `count`**; a row with
  `constructionForm: mail` has no bill; the enumerated refusal list
  (`hive`, `thick-hive`, `nuc`, `super`) has no bill (AC 16, D6, D18).
- `lint:recipe-outputs` — folded into `check-reachability.ts` arm R:
  a faucet's `outputTemplate` must resolve to an authored row (fixes
  the two distilling recipes to `empty-spirit-bottle`, AC 28); and
  `RecipeCatalogue.warm()` throws on a malformed row instead of warning
  (the boot fails loudly; the test fixtures that relied on the skip are
  fixed in place).
- `lint:mint-custody` — D1.
- `lint:capabilities` direction 1 gains a fourth consumer kind: a Joint
  row's `instrument:` (otherwise `driving`/`riving`/`sawing`/`shaving`
  read as declared-never-consumed the moment a tool row offers them).

### D12 — Two packs, one re-homing, three trade verbs

- **`trade-carpentry`** (`/trade/carpentry`, scaffolded from
  `trade-milling`'s 23 files; deps as milling's plus `trade-forestry`
  for the bole/billet rows it consumes; ⛔ no dependency on `water`).
  `src/thing/Sawmill.ts` = `ToolMixin(Good)` + GristMill's power read
  verbatim including `settlePower()` and `_setCachedPowerW`, **minus**
  `ComminutingMixin`; capabilities `[sawing]`; a static
  `commandContributions {peers, environment: [saw.yaml]}`. Two rows of
  it: `sawmill` (a power coefficient, no throughput) and `pit-saw` (a
  throughput, no coefficient) — GristMill's two rungs.
  `src/idea/cmd/carpentry/SawController.ts` (`saw <bole|length> [quarter|through] [at <saw>]`,
  an engaged act whose duration is `massKg / rate`, rate from
  `availablePowerW() × coefficient` or the authored throughput;
  `quarter` yields ⅔ the boards with `quarterSawn: true`); output a
  `Timber` stack with `constructionForm: sawn`.
  `src/idea/cmd/carpentry/CarveController.ts` (`carve <thing>` — the
  by-hand shaping verb that runs the trade's one-slot wood recipes:
  haft, peg, dowel, leg, rail, handle; tool capability `cutting` so a
  kitchen knife serves — the bootstrap root).
  Rows: `thing/{board, peg, dowel, leg, rail, frame, cushion, pick-haft,
  axe-haft, handle, froe, drawknife, sawmill, pit-saw, timber-yard}`,
  recipes for each, `idea/Discipline/carpentry.yaml` (`iscedf: "0722"`),
  `cmd/carpentry/{saw,carve}.yaml`, HelpConcepts (`grain`,
  `seasoning`, `the-cut`).
- **`trade-coopering`** (`/trade/coopering`; deps as carpentry's plus
  `trade-carpentry` for the board/dowel rows the head consumes):
  rows `thing/{stave, cask-head, croze, driver, adze, inshave}` (the
  tools are `Tool` rows with capabilities `[driving]`, `[shaving]`,
  `[crozing]`; each is a forged blade on a riven handle — recipes `fit
  croze` etc. over smithing's blade rows), recipes `stave` (riven from a
  billet under `rive`), `cask-head` (boards + dowels, pegged, `fit`),
  `slack-cask`/`dry-cask`/`cask` (`fit`), `pail`; `idea/Discipline/
  coopering.yaml` (`specializes: carpentry`);
  `idea/reading/capacity.yaml` + `src/idea/reading/CapacityReading.ts`
  (the gauger's act, D13); HelpConcept `the-gauge`.
- **`trade-smithing`** gains the metal parts the bills name: `hoop`,
  `froe-blade`, `drawknife-blade`, `adze-blade`, `axe-head`,
  `spear-head`, `mace-head`, `warhammer-head`, `flail-head`,
  `plough-share`, `rivet`, `shield-face`, `lantern-body` (soldered tin)
  — rows + one-slot `forgeable` recipes each; `pick-head` moves here
  (row + recipe, `discipline: smithing`).
- **`trade-forestry`** gains `rive` (`src/idea/cmd/forestry/RiveController.ts`,
  `cmd/forestry/rive.yaml`: `rive <bole|billet> [with <froe>]`, tool
  capability `riving`; from a bole it `takeLength()`s and yields a
  `billet` stack `constructionForm: riven`; from a billet it runs
  whichever installed recipe takes a billet under `riving` — the
  coopering `stave`, carpentry's `riven-blank`), the `billet` row +
  recipe, and nothing else changes: `fell`, the bole, the coppice are
  untouched (AC 27).
- **`trade-mining`** loses `pick-haft` and `pick-head` (rows + recipes
  move; `pick.yaml` recipe untouched; the `pick` row gains its bill;
  any `props:` naming the moved rows is re-pointed — grep at build
  time) (AC 18, D13).
- **`hearts-delight`** gains `location/sawmill.yaml` (downstream of
  the millsite on the Delight, its own `millrace` take — the venue's
  content, so a second sawmill is rows) with `props: [millrace,
  sawmill, timber-yard]`, where `timber-yard` is a counter stocking
  boards and staves (the sawyer's multure yard; drive 16's seller of
  staves) and the general store stocks `pick-haft` (the haft seller).
- **Timber** — kernel class `platform/thing/Timber.ts` =
  `StackableMixin(SeasoningMixin(ConstructedMixin(CraftedMixin(Good))))`
  (the `TextileStock` order with the two wood axes inside): *converted
  wood stock — a billet, a board, a stave, a length*. Rows name it from
  three packs (forestry's billet, carpentry's board, coopering's
  stave), which is the kernel test (*no common pack ancestor*). ⚠ The
  shipped forestry row `/trade/forestry/thing/timber` (a round
  mine-grade length, plain `Good`) keeps its class — AC 27 — and the
  name collision is recorded; a later sweep may move it. Stack merge
  takes the greener fraction (weakest link; stated in the mixin).

Verb collision: `lint:verb-collisions` runs on every wave; `rive`,
`saw`, `carve`, `fit` were checked for a claiming view by grep at plan
time (none found) and the build runs the ladder at the commit. ⛔ `split`
is NOT a fallback for `rive` (a ground protocol owns it).

### D13 — The gauger: a reading everyone may take, a record only the seat may write

`measure capacity <cask>` answers for anyone (instrumentation's
⭐⭐⭐ rule: competence resolves detail, never access). The reading
resolves the cask's jurisdiction (`GovernmentApi.governmentAt` over the
place's address) and, when `holdsSeat(actor, govKey, 'gauger')`, also
**writes the gauge** onto the cask — a `gauge: {litres, by, at,
standardL} | null` field (`{persistent, runtimeState}`) on
`AssembledMixin`, since a gauge is a fact about the vessel's build and
every gauged thing is an assembly; `look` renders it in words
(*gauged at the Terminus tun*). Otherwise the answer carries the stated line *"the figure is yours; it
is not of record — the gauger's is"*. The drive's *"be refused for a
stated reason"* is that line (flagged in *Risks*: the doctrine wins over
a literal refusal). The standard: `standardL: 25` authored on the
Reading row as the realm default, overridable by a `standards:
[{key: cask, value: 25, unit: L}]` field on the `Government` row (a
second polity appoints a gauger and declares its tun with rows only,
AC 24). *Off-standard* = `|capacity − standard| > 5 %`, said in words.
The seat: `terminus-city.yaml` seats += `{key: gauger, label: Gauger
of Terminus, department: /world/terminus/registry/business,
positionKey: gauger}`; `registry/business.yaml` positions += `gauger`
and a roster slot assigning the clerk by default (the founder-default
holder pattern, so the drive can `clock on`).

### D14 — The instrument exemplar is the surveyor's compass

`Balance` is a plain `Good` and the sextant is excluded, so the
instrument family's exemplar is `trade-mining`'s surveyor's compass
(a `Tool` row): bill `card + needle + case + glass`, the glass a pane
from `trade-glass` (`seated`). Nothing new is needed for the derived
property: `ceilingOf` already reads `getCondition()`, which D7 derives.

### D15 — The compartment: the fridge-design-pack's `Chamber`, with the chambered slate's host half

The two docs agree a chamber is its own Stuff with its own air and
disagree on **placement versus containment** for what sits in it.
Decision: **placement**, the fridge-design-pack's shape, because (a) it
is the doc the requirements name as the specification; (b) `put super
in hive` already proved containment is for DETACHABLE occupants (D6),
and a compartment's occupants are placed `in` it, not held by it; (c)
it needs no change to scope-walk or `canReach`. The chambered slate's
contribution survives as the **host side**: a host declares its
chambers (`chambers: [{key, template}]`, authorable) and mints them at
`postRegister` under `(scope, key)` — one method on a new
`lib/spatial/Chambered.ts` mixin — with the destruct cascade. The
reconciliation is recorded in both slates at the sweep.

The first composer in THIS build is the sawmill's **drying loft**
(`trade-carpentry/thing/drying-loft`, a `Chamber` row authored warm and
sky-covered): boards placed `in` it season at the loft's air and rain
cannot reverse them; a person standing in it reads the loft's air
through the existing chain walk (AC 25; drive 23). *At a cost the host
declares*: the loft charges nothing and declares so (`admission: free`
on the row, read by `look` and by the placement refusal when `none`);
the boat's price is the maritime lane's to put behind that field.
⚠ The wave opens by verifying how an actor is placed `in` a Placing
thing today (`enter`/`climb`/the posture verbs — the fridge doc says
agents are placeable; the plan does not assert which verb) and reuses
whichever exists; if none does, that is the one thing in this plan the
build may NOT invent a verb for — it narrows AC 25 to goods and records
the gap in the slate. Flagged.

---

## ⭐⭐ Host placement

For every new field, mixin and class — the host, and what composing it
claims about everything else on that host.

| what | host | the claim, and the check |
|---|---|---|
| **`AssembledMixin`** (`lib/craft/Assembled.ts`; fields `bill`, `parts`, `joints`, `gauge`; a `commandContributions` static for `fit`; overrides `getCondition`, `isBroken`, `wear`; adds `isAssembly()`, `leaks()`, `partAnswering`, `wearLine`, `ensureParts`, `getParts()`, `getJoints()`; a `markupAugmenters` bill line) | requires `DurableMixin` beneath it (`__validateComposition__` throws otherwise) | *a durable thing MAY be made of parts.* Vacuous for a one-input thing: `parts` empty, `bill` absent, every override falls through to Durable. A dagger from one bar is not an assembly and says nothing about one (`isAssembly()` false). No guard anywhere re-narrows the host set; the mixin answers its own emptiness, as `imparts` does |
| `AssembledMixin` on `Tool` | `platform/thing/Tool.ts` → `AssembledMixin(CraftedMixin(ToolMixin(DurableMixin(Good))))` | every tool may be hafted; the pick, the axe, the froe, the plough, the compass. True |
| on `Weapon` (→ `Launcher`), `Shield`, `Garment` | `equipment/` | the spear, the bow, the shield's face over boards, the boots. True; and these are the covering-fold hosts the channel routing serves |
| on **`Vat`** + **`DurableMixin`** (new) | `platform/thing/Vat.ts` | *a vessel wears and can be made of staves.* Sixteen rows gain a `condition` gauge at 1 — a carboy, a salt pan, a culture jar wear honestly and never say so until worn. **This is what makes `repair <cask>` reach the controller** (the `requires: DurableMixin` gate). `getClosure()` consults `leaks()` |
| on **`Lamp`** + `Durable` | `platform/thing/Lamp.ts` | a lamp wears and may be a body + pane + wick. `getEmittedFlux()` multiplies the `facing` lines' condition (a failed pane × dial `paneCrackedFlux` 0.35) |
| on **`Chair`** + `Durable` | `platform/thing/Chair.ts` | every seat and bed wears and may be a frame + cushion. `getRestQuality()` × the worst structural line's condition, and the bare-frame figure (dial) when the cushion line is failed |
| on **`Receptacle`** + `Durable` | `platform/thing/Receptacle.ts` | a pail, a pot, a bowl wear and may be hooped. `getClosure()` consults `leaks()`. The widest claim in the table; true of every pot |
| on `Smoker` (pack) | `trade-apiculture/src/thing/Smoker.ts` | the bellows is riveted leather over boards; local to the pack |
| ⛔ NOT on `Good`, `Thing`, `Fitting`, `Chest`, `WaterFixture`, `Bottle`, `Provision` | — | *Freshness off every Thing* is the shape to fear. The table and the wardrobe are deferred (a `Fitting` claim is *every shelf wears*, weak; a `Chest` is Staged); the water-butt is a source by class; the fuel casks are bottles |
| **`platform/thing/Assembly`** (new concrete) | `AssembledMixin(DurableMixin(CraftedMixin(Good)))` | the generic made-of-parts thing with no other capability: cask head, bellows, frame, cushion, wheel. A noun, not an adjective. The twin of `Good` for this axis |
| **`Joint`** (Idea) + **`JointCatalogue`** | `platform/idea/` | rows, warmed by class, lazy; no Api |
| **`MaturationClock`** (value object) | `lib/maturation/` | pure; no host |
| **`SeasoningMixin`** (`lib/maturation/Seasoning.ts`) | composed by `Timber` only | *this thing dries over time at its material's rate.* Vacuous on a material with `seasoningDays 0`. ⛔ NOT on `Good`, NOT on `Bole` (a bole seasons too slowly to model; the length you take from it starts the clock) |
| **`Timber`** (new concrete, kernel) | `StackableMixin(SeasoningMixin(ConstructedMixin(CraftedMixin(Good))))` | converted wood stock from three packs. Stackable so thirty staves is one object before the craft; merge = min seasoned fraction |
| `Material.seasoningDays`, `greenShrinkage` | `platform/idea/material/Material.ts` | two authorable scalars, default 0: *a material may season; most do not*. The ten wood rows author them |
| `Construction` stock domain (`riven`, `sawn`, `hewn`; `integrityFor`) | `lib/material/Construction.ts` | a closed third tuple; `isCovering()`/`isWeapon()` false, so every existing guard holds. `Timber` rows and part lines carry it |
| `MaturingMixin.fillCount`, `impartsSpent`, `charLevel`, `charredImparts` | `lib/maturation/Maturing.ts` | *a maturing vessel's character depletes with use and can be restored.* True of every vat; vacuous where no `imparts` is authored |
| `ClosureLevel` `dryTight` | `lib/bulk/Bulkable.ts` | a band between open and liquid-tight; `compareClosure` orders it |
| **`Chamber`** (`platform/thing/Chamber.ts`) + `ChamberedMixin` (`lib/spatial/Chambered.ts`) + the `Atmospheric` widening | per the fridge-design-pack | the widening is a claim on every Atmospheric composer: none may assume `getContents()` on `this`; the compiler enforces it |
| `Government.standards[]` | `platform/idea/Government.ts` | *a polity may declare a standard measure.* Empty by default |
| `Landing` on the three request shapes | `api/crafting.ts` | optional; `'hands'` default; derived `'none'` for a claimed vessel |

⭐ The tell to watch during the build: if any controller or logic site
grows `if (MixinApi.isAssembled(x) && x.getParts().length > 0)` to
avoid an Assembled host that is not an assembly, stop — the mixin's own
overrides must already answer. The only legitimate narrowings are the
mint's (`isAssembled(output) && (bill || ≥2 item slots)`) and the
fold's (`isAssembled(occ) ? partAnswering : occ`), both on an object the
site is already stamping or reading.

---

## Convention conformance

Checked at plan time against the current tree, not recalled.

- **`props:` / `cast:`** — the new `sawmill` location uses `props:` and
  `cast:` (`millsite.yaml` is the exemplar); `populates:` appears
  nowhere.
- **Locations, not rooms** — the sawmill is a `/platform/location/Street`
  row like the millsite (an outdoor site on a race), not a
  `FurnishableRoom`; the drying loft is a `Chamber` Thing inside it.
- **`<root>/<branch>/`** — `/platform/idea/Joint/*`,
  `/platform/thing/{Assembly,Timber,Chamber}`, `/trade/carpentry/thing/*`,
  `/trade/carpentry/idea/cmd/carpentry/*Controller`,
  `/trade/carpentry/cmd/carpentry/*.yaml`, `/trade/coopering/idea/reading/capacity`,
  commons rows at `/stuff/thing/vessel/*`. Each pack's `src/` mirrors
  its root's content path exactly.
- **Module scope declares; lifecycles initialize** — catalogues warm in
  `onCreate`/lazily; the `Construction` stock tuple is a `const`
  declaration; no module-scope executable statements.
- **Import boundary** (`lint:imports`) — packs import the kernel by
  package specifier only; `Sawmill.ts` reads the watercourse catalogue
  by path, never by import (the FordExit restraint); no `fs`/`yaml` in
  the mudlib.
- **Module categories** — no new category, no free helper: the clock is
  a named value-object, `landOutput`/`applyAssembledOutput` are
  module-private functions inside the logic singleton's file (the
  `applyTangibleOutput` pattern), `rankAgainst` is an Api static with
  its impl on `MaterialLogic`. No new `eslint-disable`. No new Mongo
  collection (the parts record rides the host's capture; the gauge
  stamp rides the cask's record).
- **Verbs on objects** — `fit`/`repair`/`salvage` act through
  `CraftingApi` (orchestration: gather, consume, mint, land); the
  reads (`leaks()`, `partAnswering`, `isSeasoned()`) are methods on the
  host; `lint:object-verbs` stays at zero.
- **Identity keys** — every `makers[]`/`JointState.maker` entry is
  `getIdentityPath()`.
- **A Map field never bare-persistent** — the parts record is arrays of
  plain objects.
- **`hydratorClass:` retired** — no row names one.
- **Mixin names** — `Mixins.Assembled`, `Mixins.Seasoning`,
  `Mixins.Chambered` added to `lib/mixin.ts` with refusals
  (`"{} isn't made of parts"`, `"{} doesn't season"`, `"{} has no
  compartments"`); pack mixins none (the Smoker composes a kernel mixin).
- **Lint gates this build must satisfy:** all of `lint:family` (73 today
  + the three new ones: `lint:bills`, `lint:mint-custody`, and the
  reachability/recipe-output arm) on every wave. Named individually only
  where a wave is expected to move one: `lint:closed-vocabularies`
  (two audited rises), `lint:does-nothing` (the stock tuple),
  `lint:capabilities` (the Joint consumer kind), `lint:verb-collisions`
  (four verbs), `lint:instrument-args` (`fit`'s declared tool arg),
  `lint:untitled` (the sawmill under the venue's title),
  `lint:counters` (the timber-yard counter names `trade-shopkeeping`'s
  class), `lint:create-sites` (unchanged — every mint is a clone),
  `lint:reachability` (every new row reachable: a prop, a recipe output,
  a stock line, a bill template).

---

## Waves

Every wave lands independently, ends at a named commit, and has
something the drive can touch. Gate on every wave: `pnpm test:near` +
each touched pack's `pnpm test` + `pnpm -C packages/server lint:family`;
`pnpm install` first whenever a pack is added or renamed. ⚠ `pnpm test`
exactly twice: before the MR opens, and at `/finalize`.

### W0 — the mint lands, stamps and captures its output

**Decisions:** D1, D11 (recipe outputs).
**Files:** `api/crafting.ts` (`Landing`, three request shapes),
`CraftingLogic.ts` (`landOutput`; one call in each of `craftImpl`,
`mintFromBuildImpl`, `salvageImpl`), the seven controllers (delete
the move; Bake passes `{into: oven}`), `scripts/check-mint-custody.ts`
+ `package.json` `lint:mint-custody`, `scripts/check-reachability.ts`
(arm R: `outputTemplate` must resolve), `platform/idea/RecipeCatalogue.ts`
(malformed → throw), `trade-distilling/content/recipes/{vat-whisky,compound-gin}.yaml`
→ `empty-spirit-bottle`, tests beside each.
**Acceptance:** a `forge`d knife left on the smithy floor survives
`restart` with its stamp; a bought cask `put` down with a sealed batch
keeps its clock (the crafted-cask half of drive 1 lands in W5);
`lint:mint-custody --list` prints the ceiling and every survivor's
why; `lint:reachability` fails on a recipe naming a missing row.
**Commit:** `build(assembly W0): the craft mint lands, stamps and captures its output; mint-custody ratchet; recipe outputs must resolve`.

### W1 — the model: bill, parts, joints, the mint's new branch, the pick

**Decisions:** D3, D4, D7 (the overrides and the use-wear route), D8
(the mixin, `Assembly`, composed on `Tool`/`Weapon`/`Shield`/`Garment`).
**Files:** `lib/craft/Assembled.ts` (+ `__tests__`), `lib/mixin.ts`,
`platform/thing/Assembly.ts`, `platform/idea/Joint.ts`,
`platform/idea/JointCatalogue.ts` (+ boot line in
`packages/content/platform/pack.yaml` and the catalogue's own row),
`packages/content/platform/content/platform/idea/Joint/*.yaml` (the
seven whose competence exists or is null — D4; ⛔ NOT `pegged`/`hooped`),
`Joint.buildDescriptor` accepting `competence: null` on a hand row, `CraftingLogic.ts` (`applyAssembledOutput` after
`applyTangibleOutput`, called when `isAssembled(output) && (bill ||
distinct item slots ≥ 2)`; the one-slot Assembled→Assembled carry-across;
the crafting `t.wear()` passes `shock` for `striking`),
`api/material.ts` + `MaterialLogic.ts` (`rankAgainst`; `materialScale`'s
`shock` reads toughness), `CombatLogic.ts` (the two weapon wears pass
the primary channel), `Tool.ts`, `equipment/{Weapon,Shield,Garment}.ts`,
`trade-mining/…/thing/pick.yaml` (`bill:` with `wedged`),
`scripts/check-bills.ts` + `lint:bills`, the `look` augmenter (the bill
line in words; failed lines; slack joints).
**Acceptance:** `forge pick` (the recipe unedited) yields a pick whose
`look` says it is a head on a haft; a shock-wear through the use route
splits the haft and `look` names it; `look haft` finds nothing to look
at; `lint:bills` passes on the pick and fails on a deliberately broken
fixture.
**Commit:** `build(assembly W1): the bill on the kind, the parts record on the instance, Joint rows, the mint keeps its inputs' identity — the pick knows it has a haft`.

### W2 — the three verbs' arms, and the four new Durable hosts

**Decisions:** D5, D6, D7 (the fold route), D8 (Vat, Lamp, Chair,
Receptacle), D10 (`leaks()` → closure), D11 (`lint:capabilities`
consumer).
**Files:** `platform/cmd/crafting/fit.yaml`,
`platform/idea/cmd/crafting/FitController.ts` (+ a binder test in the
`mill-view.binder.test.ts` shape), `CraftingLogic.ts` (`fitImpl` behind
`CraftingApi.fit`; the repair ladder in `repairImpl`; the reversible
branch in `salvageImpl`), `ConditionLogic.ts` (`layerOf` asks
`partAnswering`; wear via `wearLine`), `Vat.ts`, `Lamp.ts`, `Chair.ts`,
`Receptacle.ts`, `lib/bulk/Bulkable.ts` (nothing yet — `dryTight` is
W5), `scripts/check-capabilities.ts` (Joint `instrument:`),
`docs/subsystems/crafting.md` (a short *verbs* note — the doc sweep
proper is `/finalize`'s).
**Acceptance:** `fit haft to pick` keeps the head and records two
makers; `repair pick` with a split haft refuses naming the haft;
`salvage pick` yields the head and a scrap of haft, and an expert
yields more; `repair <any Vat row>` reaches the controller; a shield
of boards with a hide face routes an edge blow to the face and a blunt
one to the boards (unit test over `rankAgainst`).
**Commit:** `build(assembly W2): fit; repair's four rungs; salvage's reversible branch; Durable on Vat, Lamp, Chair, Receptacle; the fold routes to the part`.

### W3 — the wood column's kernel: the clock seam, seasoning, `Timber`, riven/sawn

**Decisions:** D2, D12 (`Timber`), D7's D10 half.
**Files:** `lib/maturation/MaturationClock.ts` (+ tests), `Maturing.ts`
(calls it; no behaviour change — **its own commit first**:
`refactor(maturation): the clock off Maturing — MaturationClock, byte-identical`),
`lib/maturation/Seasoning.ts` (+ tests), `platform/thing/Timber.ts`,
`platform/idea/material/Material.ts` (two fields), the ten wood rows,
`lib/material/Construction.ts` (the stock domain + `integrityFor`),
`scripts/check-does-nothing.ts`, `scripts/check-closed-vocabularies.ts`
(the audited rise), `lib/mixin.ts`.
**Acceptance:** `Maturing` suites green before and after the
extraction; a `Timber` stack authored green reads green, reads seasoned
after its material's days at `happyK`, and a sky-exposed stack in rain
goes backwards; `sawn` integrity under `blunt` is 0.7 of `riven` in
`rankAgainst`; merge takes the greener.
**Commit:** `build(assembly W3): the maturation clock as a seam; SeasoningMixin on Timber; riven and sawn as stock constructions`.

### W4 — the wood column's content: forestry rives, carpentry saws and carves, the sawmill on the Delight

**Decisions:** D12, D13 (the two Disciplines), D15's first composer
is W7's — the loft is only a row here.
**Files:** `packages/content/trade-carpentry/**` (scaffolded from
`trade-milling`: `pack.yaml`, `package.json`, `tsconfig.json`,
`vitest.config.ts`, `README.md`, `src/thing/Sawmill.ts`,
`src/idea/cmd/carpentry/{Saw,Carve}Controller.ts`, rows, recipes,
Discipline, ⭐ `content/trade/carpentry/idea/Joint/pegged.yaml` (D4 — the
first pack-shipped Joint), HelpConcepts, tests incl. a view-binder test
per verb),
`trade-forestry` (`rive.yaml`, `RiveController.ts` + its controller
row, `billet` row + recipe, `froe` row moves to carpentry), `trade-smithing`
(the blade/head rows + recipes; `pick-head` arrives), `trade-mining`
(`pick-haft`/`pick-head` leave), `hearts-delight/…/location/sawmill.yaml`
+ `thing/{sawmill-race,timber-yard}.yaml` (the counter names
`/trade/shopkeeping/thing/Stock`'s class as the general store does) +
the general store's stock line for `pick-haft`; root `pnpm-workspace`
if packages are enumerated (check); `pnpm install`.
**Acceptance:** `fell` → `rive bole` → billets; `rive billet` →
staves/blanks; `saw length at the sawmill` → boards, slower at low
flow (`_setCachedPowerW` in the test, the river in the drive); `carve
haft` from a billet with a kitchen knife; `fit froe` from a smith's
blade and a carved handle; `rive` with it; a stave bought at the
timber yard and a haft at the general store; forestry's whole suite
green; AC 18 by `grep discipline:` on the three recipes.
**Commit:** `build(assembly W4): trade-carpentry (saw, carve, the sawmill) and forestry's rive; the haft re-homed to the woodworker, the head to the smith`.

### W5 — coopering: the cask, the character, the gauger

**Decisions:** D9, D10, D12 (coopering), D13.
**Files:** `packages/content/trade-coopering/**` (rows, recipes,
Discipline, ⭐ `content/trade/coopering/idea/Joint/hooped.yaml` (D4),
`CapacityReading.ts` + its row, tests), `generic-objects`
(`vessel/{cask,slack-cask,dry-cask}.yaml`), the ten consumer rows
(`extends:`), `lib/bulk/Bulkable.ts` (`dryTight` + `compareClosure`),
`Maturing.ts` (the four fields; `applyImparts` reads the effective
figure), `CraftingLogic.ts` (repair rung 3), `trade-smithing`
(`hoop` row + recipe), `platform/…/Government/terminus-city.yaml`,
`terminus/…/registry/business.yaml`, `platform/idea/Government.ts`
(`standards[]`), `scripts/check-closed-vocabularies.ts` (audited rise).
**Acceptance:** drive 6–9, 11, 17, 22 and the crafted half of drive 1
(a `fit cask`, sealed with new-make, survives a restart with its
clock); every brewing/distilling/winemaking/fuel suite green unchanged;
`pour beer into dry-cask` refused with the closure named.
**Commit:** `build(assembly W5): trade-coopering — three casks by capability, the character that spends and is re-fired, the hoop from the smith, the gauger as a seat and a reading`.

### W6 — the exemplar span

**Decisions:** D7 (derived outputs), D14.
**Files:** `trade-forestry/content/recipes/felling-axe.yaml` (head +
haft, wedged, no heat) + `axe-head` in smithing; the five smithing arms
recipes (`spear`, `mace`, `warhammer`, `flail`, `shield`) re-authored
as `fit` assemblies over head/face rows + haft/board rows, with
`_detailMaterialPaths` promoted into bills; `hunting-bow.yaml` (yew
stave + 2 horn nocks + linen `string` as `role: wear`); `lantern.yaml`
(tin body soldered + `pane` seated from `trade-glass` + `wick` wear);
`armchair.yaml`/`bed.yaml` (a `frame` sub-assembly row in carpentry,
pegged + a `cushion` row stitched over tailoring's cloth); `leather-boots.yaml`
(uppers + lining + `sole` wear + laces, stitched; a `sole` row in
tanning); `plough.yaml` (ash beam + `share` wear from smithing +
handles); `smoker.yaml` + a `bellows` row (riveted) in apiculture;
`frame.yaml` (bars + wire, the smallest honest assembly) and the
`hive` refusal in `check-bills.ts`; `drop-spindle.yaml` (shaft +
whorl, `friction`; a `whorl` row in quarrying or textiles); the
surveyor's compass bill in mining; `Lamp.getEmittedFlux`,
`Chair.getRestQuality` overrides.
**Acceptance:** drive 13, 14, 15, 20, 21; `lint:bills` green over
every bill; a mail hauberk with a bill fails the gate (fixture).
**Commit:** `build(assembly W6): eight families — wedged, hooped, pegged, stitched, seated, riveted, friction; the pane darkens the room, the cushion rests you, the share is replaced next season`.

### W7 — the compartment

**Decisions:** D15.
**Files:** `lib/biome/Atmospheric.ts` (the widening),
`platform/idea/api/BiomeLogic.ts` + `api/biome.ts` (retypes),
`platform/thing/Chamber.ts`, `lib/spatial/Chambered.ts`, the
`drying-loft` row and its mint from the `sawmill` row's `chambers:`,
`SeasoningMixin` (reads the enclosing scope's air — already the chain
walk), the two slates' reconciliation notes.
**Acceptance:** a board `in` the loft seasons at the loft's air while
one in the yard reads the weather; a person in the loft reads its
temperature through `look`'s body line; drive 23.
**Commit:** `build(assembly W7): Chamber — a space inside a thing with its own air; the drying loft is its first composer`.

### W8 — the drive, the record, the MR

`packages/wire/tests/assembly.dirty.wire.test.ts` — the 23 steps, each
a checkpoint that asserts a **state change** and can fail
(`refusedFor` is blind to `command-rejected`; assert the verb was
understood and the thing changed). Run it against the running game;
append the record below; `pnpm test` once; push; open the MR.
**Commit:** `drive(assembly): <what driving found>`.

---

## Reachability wiring

Five links per capability — **verb · affordance · data · boot · arg
gate** — each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `fit` | `platform/cmd/crafting/fit.yaml` | ⚠ NOT the instrument path `repair` uses — a static `commandContributions {self, peers}` on `AssembledMixin`'s class + `peers` on `Timber` (D5); a row's `commandContributions:` is dead silently | Joint rows + bills | `JointCatalogue` boot line, `role: sync-read` | `whole: requires: AssembledMixin` — composed on nine classes by W2; `thing: requires: any` |
| `repair <cask>` | ships | ships | — | — | ⛔ **`requires: DurableMixin` and Vat is not Durable** → W2 composes it; the binder test asserts a cask binds |
| `salvage` reversible | ships (`requires: TangibleMixin`) | ships | joints | — | fine |
| Joint rows | — | — | `/platform/idea/Joint/*.yaml`, class `/platform/idea/Joint` | ⚠ a catalogue nothing boots reads empty forever — the platform pack's `boot:` line + the lazy warm | — |
| `rive` | `trade/forestry/cmd/forestry/rive.yaml` | a **static** `commandContributions` on the froe's class? — no: the froe is a `Tool` row; the affordance is `Bole.commandContributions.self` += `rive.yaml` (the bole affords riving as it affords felling) and the `Timber` class's static `peers` += `rive.yaml` for billets | `billet`/`stave` recipes, `riving` capability on the froe row | `RecipeCatalogue` (ships) | `target: requires: any` (bole or billet); `froe: requires: [ToolMixin]`, default `reachable:[capability.riving]` |
| `saw` | `trade/carpentry/cmd/carpentry/saw.yaml` | `Sawmill.commandContributions {peers, environment}` static | the two Sawmill rows, the `board` row, the recipe | the watercourse catalogue is the water pack's (`FordExit`: no boot dependency; `catch → 0`) | `log: requires: TangibleMixin`; `saw: requires: [ToolMixin]` default `reachable:[capability.sawing]` — **the mixin/capability, never `[class.Sawmill]`** |
| `carve` | `trade/carpentry/cmd/carpentry/carve.yaml` | afforded by the `cutting` instrument's class — `Tool.commandContributions`? ⚠ `Tool` is kernel and must not name a pack view; so `carve` is afforded by **the `Timber` class** (`peers`: a billet in reach makes carving sayable) — verified at W4 | one-slot recipes | — | `stock: requires: TangibleMixin`; `tool` default `reachable:[capability.cutting]` |
| the sawmill's power | — | — | `sawmill-race` prop answering `generationW`/`getReachRef` in the same room | the reach exists on the Delight (`delight.yaml` nodes) — the race row names `delight:flats` (or whichever node the millrace row uses; copy it) | — |
| seasoning | — | — | `seasoningDays` on the ten wood rows (0 elsewhere) | `MaterialCatalogue` ships | — |
| `measure capacity` | ships (`measure`) | ships | `/trade/coopering/idea/reading/capacity.yaml` + `CapacityReading` class | `ReadingCatalogue` lazy warm (ships); the pack ships NO boot line (the catalogue globs by infix) | the seat: `terminus-city.yaml` seat + `registry/business.yaml` position — ⚠⚠ a `positionKey` missing from the chart matches nobody |
| the commons cask as a recipe output | — | — | `/stuff/thing/vessel/cask` exists (W5) | — | `lint:reachability` arm R now verifies it |
| the `hoop`, `share`, `string`, `sole`, `pane` parts | each trade's own verb | ships | rows + recipes in the producer's pack; bills name them | — | `lint:bills` resolves every template |
| `Chamber`'s occupants | `put X in loft` (ships) · a person: **verified at W7, not asserted** | — | the `drying-loft` row, minted by the sawmill's `chambers:` | — | `put`'s `in` placement member (ships) |
| the drive itself | `packages/wire/tests/assembly.dirty.wire.test.ts` | — | the whole content set | ⚠ the wire port per worktree (`WIRE_PORT`; build-1 = 2014, build-2 = 2013 — pick a free one for build-3) | — |

---

## Acceptance-criteria coverage

| AC | wave | how it is observed |
|---|---|---|
| 1 W0 restart survival; custody census at zero | W0 (+ W5 for the cask) | drive 1; `lint:mint-custody` reads 0 at the MR |
| 2 made from parts, one declaration | W1 | `look` after `forge pick`; `lint:bills` ties recipe slots to the bill |
| 3 the pick with no content change | W1 | drive 2 runs the shipped recipe before `pick.yaml` gains its bill; the plan's W1 commit lands the bill in the same wave |
| 4 joining method is data, addable with no engine change | W1, W4, W5 | a W1 test adds a `lashed` row under a fixture root; ⭐ and `pegged` / `hooped` are **shipped by `trade-carpentry` and `trade-coopering`** under their own roots — the claim proven by content, not only a fixture (D4) |
| 5 nesting; inner replaced without the outer's joints | W6 | drive 13 (armchair) |
| 6 joint fails with every part sound; repair consumes nothing | W2/W5 | drive 8 |
| 7 at most one new verb; salvage reuses, reversibility decides | W2 | `fit` only; drive 11 |
| 8 disassembly lossy, varies with joint and competence | W2 | drive 11, 12 |
| 9 mending cheaper than rebuilding | W2 | one stave vs thirty, in the drive's ledger |
| 10 names its part; no in-place inspection | W1/W2 | drive 3, 10 |
| 11 a part's condition moves another subsystem | W6 | drive 14 (light), 15 (reading), the bed's rest |
| 12 tradeable parts; four-rung wood market | W4 | drive 16; bole → boards → staves → cask each a transaction |
| 13 wear parts, recurring, no diagnosis | W6 | drive 20 |
| 14 a joint spans a set | W5 | drive 8 (slacken one hoop) |
| 15 leaf-part rule: decisions, not count | W1 (D15 as the bill's nesting rule) | the compass's `card` is a leaf with fifteen parts in prose |
| 16 mail and hive refused | W6 | `check-bills.ts` fixtures |
| 17 three trades; second venue zero code | W4/W5 | the sawmill is venue rows; coopering ships no location |
| 18 haft by a woodworker, head by a smith | W4 | `grep discipline:` |
| 19 seasoned vs green, priced, fails for a reason | W3/W4 | drive 5; the grade cap; the warped line's words |
| 20 riven vs sawn through construction | W3 | `integrityFor` unit test; drive 7 (a sawn stave leaks) |
| 21 by-hand makes the hand-tool rung | W4 | drive 19 (the froe) |
| 22 cooper grades as capability | W5 | drive 9 |
| 23 fill history, restorable | W5 | drive 17 |
| 24 gauger as seat + reading; a second polity in rows | W5 | drive 22; a test authors a second Government row with a `gauger` seat |
| 25 compartment | W7 | drive 23 |
| 26 crafted and found casks the same kind | W5 | same class, same bill (the `extends` chain); `salvage` of each |
| 27 ten consumers unchanged; fell/bole/coppice unchanged | W4/W5 | the packs' suites; the fuel casks untouched |
| 28 recipe outputs gated; spirit-bottle fixed | W0 | `lint:reachability` |

Unmapped: nothing. ⚠ Two are satisfied by interpretation rather than
by the literal sentence — AC 7's verb budget (D5) and drive 22's
"refused" (D13) — and both are in *Risks & opens*.

---

## Test & gate strategy

- **Unit (vitest, beside the source):** `Assembled` (the overrides,
  `ensureParts`, the replacement arithmetic, `leaks()`), `Joint` +
  `JointCatalogue` (lazy warm, a pack-root row), `MaterialLogic.rankAgainst`
  (shield boards vs face; sawn vs riven), `MaturationClock` (the
  extraction's byte-identity against recorded `Maturing` numbers),
  `Seasoning` (rate, rain, merge), `Timber`, `Construction` stock
  domain, `Maturing` spentness/re-fire, `Vat.getClosure` over `leaks()`,
  `Lamp.getEmittedFlux` with a failed pane, `Chair.getRestQuality`,
  `Sawmill` (power read with `_setCachedPowerW`, the pit-saw rung),
  `CapacityReading` (with and without the seat; the standard),
  `Chamber` + the widening, `check-bills`/`check-mint-custody` fixtures.
  Anything touching the wired runtime imports `test-bootstrap`
  (`lint:test-bootstrap`).
- **Controller + binder tests:** every new view gets a binder test in
  `trade-milling/src/__tests__/mill-view.binder.test.ts`'s shape —
  ⚠ controller tests skip the binder, which is how `repair <cask>`
  shipped dead.
- **Only the drive proves:** restart survival (W0), the river slowing
  the saw, a person in the loft, the general store selling a haft, the
  gauger's seat through `clock on`, and that `fit`'s two arms are
  reachable from a player's hands.
- **Gates:** `lint:family` on every wave — never a subset. Expected
  movement: `lint:closed-vocabularies` (+2, audited), `lint:does-nothing`
  (the stock tuple), `lint:capabilities` (the Joint consumer), the three
  new gates.
- **Full suite:** once before the MR; once at `/finalize`. Between,
  `test:near` + the touched packs + the family. Check `git status
  --short | grep -vE '…'` before any run — a green run stays valid until
  a source file changes.

---

## Risks & opens

Things the user should look at before the build starts; the build
proceeds on the plan's answer unless told otherwise.

1. ⭐⭐ **Fork B is a requirements change.** D9 says seasoning rides
   `MaturingMixin`; it cannot (the composition guard), and the plan ships
   a sibling over a lifted clock seam (D2). Product behaviour is the
   same. Confirm, or the alternative is to drop AC 19 to a slate.
2. **The verb budget's reading.** AC 7's *"at most one new verb"* is
   read as assembly's budget (`fit`); the wood column ships three trade
   verbs (`rive`, `saw`, `carve`) for rung-1/2 transformations, as every
   trade pack does. If the user means ONE verb in the whole build, the
   conversions need a generic recipe verb that does not exist today —
   a different, larger decision.
3. **The gauger's refusal versus the instrumentation doctrine.** Drive
   22 says *"be refused"*; instrumentation says competence (and by
   extension office) resolves detail, never access. D13 answers for
   everyone and withholds only the RECORD. The drive checkpoint asserts
   the stated line, not a refusal envelope.
4. **Four kernel classes gain `Durable`** (Vat, Lamp, Chair,
   Receptacle). Each claim is written in the host table; Receptacle's
   is the widest. The alternative — a parallel `requires:` on
   `repair.yaml` — is the *alternation deletes a check* trap.
5. **The commons cask and `extends:`.** Ten consumer rows gain
   `extends:`; the "same kind" claim is same class + same bill, with
   distinct template paths for authored variants. The fuel casks are
   `Bottle`s and stay so (a deferred seam).
6. **Two audited closed-vocabulary rises** (`CONSTRUCTION_FORMS` third
   domain; `ClosureLevel` `dryTight`). Both carry a caller audit in the
   commit; both are *facts about the world*, not conveniences.
7. **The `Maturing` extraction** touches ten consumers; it lands as its
   own byte-identical refactor commit with the whole maturation net run
   before the seasoning mixin exists.
8. **The compartment wave** reconciles two design docs in the plan's
   favour of placement (D15) and depends on an actor being placeable
   `in` a Placing thing by an existing verb; if none exists the wave
   narrows AC 25 to goods and records the gap — it may not invent a
   verb.
9. **Two power takes on one reach double-count** (the sawmill reads the
   same `flowAt(reach)` as the grist mill). Recorded as a coarseness of
   the water seam, not fixed here.
10. **Content moves** (`pick-haft`, `pick-head`, the froe) — any
    `props:`/stock line naming the old paths must be re-pointed;
    `lint:reachability` catches a dangling one.
11. **The seasoning merge rule** on a stack (min fraction) is weakest-
    link doctrine applied to time; a player merging a dry stack into a
    green one loses the dry one's lead. Stated in the mixin and the
    help concept; grain.
12. **The price-ceiling finding** (every spawned assembly caps its
    parts' prices) is recorded, not countered (D12 of the requirements).
13. **Scope size.** Eight waves; W1, W2 and W4 are each a full day or
    more. The plan is ordered so that a build stopping after W2 has
    shipped the substrate with a working pick, after W4 the wood market,
    after W5 the cask.

---

## Deferred seams

Clean attach points, each with the slate it leaves as.

- **`Fitting` and `Chest` as Assembled hosts** (the table, the
  wardrobe) → `assembly-slate` tail: *the furniture family's second
  half*; the `Assembly` class and the bill shape are the attach point.
- **The water-butt** (a `WaterFixture` source by class) and **the fuel
  casks** (`Bottle`s) → the same tail: *casks that are not Vats*.
- **The threaded fastener** → `content-declaration-slate` § `Epoch`
  (a Joint row `threaded`, `portability: tool`, `reversible: freely`,
  `interchangeable: true` — the field the vocabulary does not yet
  carry).
- **The remaining makerless assemblies** (guns, clocks, looms, the
  spinning wheel) → `vocations.md`'s gap matrix; each is rows over
  `Assembly` + a recipe.
- **Humidity in seasoning** (today the air temperature and rain only)
  → the climate lane: `SeasoningMixin` reads `airSegmentsFor`; when the
  weather field carries humidity, the rate reads it there.
- **The water right of the sawmill** → `watershed.md`'s prior-
  appropriation record; the race row is the attach point.
- **A compartment's admission cost** (`admission:` on the `Chamber`
  row, free here) → the maritime lane.
- **Transport conversions** → the maritime/transport lane, as the
  requirements say.
- **The remaining `_detailMaterialPaths`** not promoted in W6 → an
  audit line in `assembly-slate`.

The `assembly-slate` itself stays open as the record that the
factory's prerequisite is met (the requirements' own instruction).

---

## Critical files

Read first, in this order:

1. `docs/requirements/assembly-requirements.md` — the product.
2. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` —
   :1355 (the extension point), :1619–1780 (the tangible arm),
   :2556–2880 (`craftImpl`), :2893 (`repairImpl`), :3034 (`salvageImpl`),
   :2172/:2328/:2423 (the second mint path).
3. `packages/server/src/mud/api/crafting.ts` — the request shapes.
4. `packages/content/trade-forestry/src/idea/cmd/forestry/FellController.ts:353–378`
   — the stamp/capture pair W0 copies.
5. `packages/server/src/mud/lib/material/Durable.ts`,
   `lib/material/Constructed.ts`, `lib/material/Construction.ts`
   (:60–130 the tuples, :495–620 the reads),
   `platform/idea/api/MaterialLogic.ts:362–400` and :506–569,
   `platform/idea/api/ConditionLogic.ts:1170–1250` — the fold.
6. `packages/server/src/mud/lib/maturation/Maturing.ts` — :181–197,
   :393, :403–435, :538–760, :937, :1009, :1181–1225.
7. `packages/server/src/mud/platform/idea/Operation.ts`,
   `OperationCatalogue.ts`, `ReadingCatalogue.ts:60–140`,
   `lib/instrument/Reading.ts:640–670`.
8. `packages/content/trade-milling/` (all 23 files) and
   `trade-milling/src/thing/GristMill.ts` in full.
9. `packages/content/trade-mining/content/recipes/pick*.yaml` and
   `…/thing/pick*.yaml`; `trade-distilling/…/thing/{cask,charred-cask}.yaml`.
10. `packages/content/platform/content/platform/cmd/crafting/{repair,salvage}.yaml`,
    `…/cmd/perception/measure.yaml`, `trade-milling/…/cmd/milling/mill.yaml`.
11. `packages/server/scripts/{check-create-sites,check-condition-arms,check-reachability,check-capabilities,check-closed-vocabularies,check-does-nothing,pack-roots}.ts`.
12. `packages/content/platform/content/platform/idea/Government/terminus-city.yaml`,
    `terminus/content/world/terminus/registry/business.yaml`,
    `packages/server/src/mud/api/government.ts`.
13. `docs/slates/builds/fridge-design-pack.md` § `Chamber`,
    `docs/slates/tails/chambered-vessels-slate.md`.
14. `docs/subsystems/{crafting,materials-response,maturation,forestry,instrumentation,civics,bulk,persistence,chattel,furnishing}.md`.

---

## Drive record

*(appended at build time — the output of running
`packages/wire/tests/assembly.dirty.wire.test.ts` against the running
game: the count, each checkpoint, what each failure was.)*
