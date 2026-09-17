# Forestry — implementation plan

Executes `docs/requirements/forestry-requirements.md`. **Kind:** feature
— one new capability pack (`trade-forestry`), a wood on Rejection's hill
(rows only, in the `rejection` pack), seven wood materials in the
commons, and a thin kernel wave beneath them. **Leads from:** content —
the two consumers of wood (the collier's clamp, the mine's timber set)
already ship and are starving; the kernel wave exists only because
three things a row cannot say today (a `stand` document kind, which
tool a plant is cut with and which Discipline that exercises, a tool's
epoch) are the difference between the wood being reachable and being
scenery.

Written for a fresh-context build agent. Every fact in § Grounding was
read out of the file named this cycle (2026-09-17); every decision in
§ Plan-level decisions is numbered so a wave or a commit can cite it.
The requirements doc is closed scope — where this plan deviates from a
sentence in it, the deviation is named in § Risks & opens, not absorbed.

The user's standing constraint governs every choice below: **an
authored wood is always a wood.** Nothing converts land use at runtime,
nothing simulates a tree, nothing generates a room. The one thing that
moves is the stand record.

---

## Grounding

### The record pattern — the herdbook, and the register transport

- `packages/content/trade-ranching/src/idea/HerdRegistry.ts` —
  `export default class HerdRegistry extends RegistrarMixin(Idea)`
  (L180); the constructor sets `registerPrefix = '/trade/ranching/herds'`,
  `registerOwner = '/trade/ranching'`, `registerKind = 'herd'`
  (L68–74, L195–200). `canEvict` vetoes (L209). `file()` validates then
  `DocumentApi.saveToRegister(this as unknown as Stuff & Registrar, path, {...herd})`
  (L240); `read()` re-checks the prefix on both the asked path and the
  returned doc's path and the kind (L258–265); `all()` is private and
  drops rows outside the prefix (L274–283); `update()` overwrites
  (L315). **A registry is not a cache — every read goes to the store.**
- `packages/server/src/mud/platform/idea/api/DocumentLogic.ts:344–376`
  `saveToRegisterImpl`: the register's template path must sit under
  `owner`; `prefix` under `owner`; `path` under `prefix`; and **the kind
  must be in `DECLARED_DOCUMENT_KINDS`** (L372) — the closed vocabulary
  in `packages/server/src/mud/lib/document/DocumentKinds.ts`
  (`DOCUMENT_KINDS`, L52–157; `DECLARED_DOCUMENT_KINDS = Object.keys(...)`,
  L161). The `herd` entry (L94–137) is
  `{ kind: 'herd', naturalKey: null, contentDir: 'herds', ext: 'yaml', onVanish: 'keep' }`
  with the *you file; you do not hold the pen* rationale. ⚠ **Editing
  this file is a platform act** (its own header, L12–17) — the one kernel
  list edit this build takes, named as such.
- `packages/server/src/mud/lib/document/Register.ts` — `RegistrarMixin`,
  `Registrar` interface (`getRegisterPrefix/Owner/Kind`); the header
  records why the kernel learns the SHAPE and never a pack's name.
- `packages/content/trade-ranching/src/thing/Herdbook.ts` — the venue
  fixture that files the record:
  `PostRegistrationMixin(FixtureMixin(DetailedMixin(Thing)))` (L60);
  `static commandContributions = { self: [], environment: ['trade/ranching/cmd/ranching/draft.yaml'], peers: [...] }`
  (L72–76); `postRegister()` resolves the registry through
  `StuffApi.singleton<HerdRegistry>('/trade/ranching/idea/HerdRegistry')`
  and files **iff `registry.read(herdId) === null`** — get-or-create, the
  existing record always wins (L157–175). `foundedNow()` guards on
  `StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)` before
  `WorldClockApi.getNow().rawValue()` (L194–197). The row that props it:
  `eternal-university/content/world/eternal/campus-farm/thing/herdbook.yaml`
  (`class: /trade/ranching/thing/Herdbook`, `herdId`, `tally`, …) — the
  VENUE authors the founding facts, the TRADE keeps the book.
- `packages/content/trade-ranching/pack.yaml` `requires.groups: [{name: ranching, …}]`,
  `requires.title: [{extent: /trade/ranching, holder: {group: ranching}}]`
  — the manifest shape a register's title needs. `trade-fuel/pack.yaml`
  is the identical thin-pack shape (`id`, `version`, `root`,
  `description`, `requires.groups`, `requires.title`; no `boot`).

### Engaged acts, and the base a pack can reach

- `packages/content/trade-mining/src/idea/cmd/mining/MiningActController.ts`
  — a **pack-local** base. `engageAct(context, {durationMs, beginSelf,
  beginPeers?, cost, onComplete, onAbort?})` (L115–147) spends endurance
  (`giver.adjustReserve('endurance', Quantity.of(-points, '%'))`, L150–154),
  falls through to `onComplete()` for a non-Engaged giver, else
  `new ManualBuildStep({actor, slots: ['hands'], durationMs, onComplete, onAbort})`
  → `SchedulerApi.start(step)`; `started|replaced` → begin scene;
  `engagement-conflict` → *"Your hands are already busy."*. A pack cannot
  import another pack's `src/`, so forestry cannot extend it.
- `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
  — the **kernel** base, exported through the server's `exports` map
  (`./mud/platform/idea/*`, `packages/server/package.json:6–18`).
  `engageStep(context, {durationMs, beginSelf, beginPeers?, onComplete, onAbort?})`
  (L60–110) is `engageAct` minus the endurance spend, verbatim: hands
  slot, `started|replaced` → begin scene + note, `completed-sync` →
  return, `engagement-conflict` → *"Your hands are busy with something
  else."*, else `start-rejected`. Its header says it is "a base class
  only", already used by `repair` — *"an engaged act since the
  capability-table build — its deed-free gates"* — so it is not
  cocktail-specific. `abstract class ManualBuildController<M> extends CraftController<M>`
  (L49); `CraftController` (`crafting/CraftController.ts:34`) is
  abstract with no abstract members a subclass must supply beyond
  `execute`.
- `packages/content/trade-mining/src/idea/cmd/mining/HewController.ts`
  — the act shape to copy: `HEW_MS = 9000` game-ms, `HEW_COST = 4`
  (L41–43); `engageAct(..., onComplete: () => { void winOre(...) })`
  where **`winOre` is a module-level function, never `this.<method>`**
  (L148–155 — the controller is destructed the moment `execute`
  returns); the completion opens with `if (context.commandGiver.isDestroyed()) return;`
  (L174); mints through `StuffApi.clone`, `ContainmentApi.move(lump, room)`,
  `stampChattel(owner)`; credits with
  `if (MixinApi.isAdvancing(giver)) await giver.creditDeed({discipline: 'geology', difficulty, outcome: 'success'})`
  (L213–218). `hew.yaml`: `args: [{name: face, type: string, required: false}]`.
- `packages/content/trade-mining/src/idea/cmd/mining/ShoreController.ts`
  + `content/trade/mining/cmd/mining/shore.yaml`: the **instrument as an
  argument** shape — `args: [{name: timber, type: object, required: false, scope: "reachable", requires: ToolMixin}]`;
  the controller narrows `MixinApi.isTool(item) && item.hasCapability('timber-set')`,
  and when the arg is absent takes the first qualifying item the giver
  holds (`findTimber`, L56 onward).
- Controller registration is a row at
  `<root>/idea/cmd/<category>/<Name>Controller.yaml` — e.g.
  `trade-mining/content/trade/mining/idea/cmd/mining/HewController.yaml`
  is exactly `class: /trade/mining/idea/cmd/mining/HewController` +
  `data: {}`.
- The stanza precedent: `platform/content/platform/cmd/perception/analyze.yaml`
  is ONE verb with `subcommands:`; its `ground` stanza (L332–361) names
  `controller: /trade/mining/idea/cmd/perception/AnalyzeGroundController`,
  registered by `trade-mining/content/trade/mining/idea/cmd/perception/AnalyzeGroundController.yaml`.

### The growth model — what a row can author, and what latches

- `packages/server/src/mud/lib/husbandry/Growing.ts` — `fieldMeta`
  (L391–411): `growthClockStamp`, `_vigor`, `_maturity`, `growthStage`,
  `_flowering`, `_seedSet`, `_lastLux`, `_lastAmbientK` (runtimeState),
  `_worstLimiting`, `_fruitFill`, `profile` are `persistent` (not
  `authorable`); `harvestTemplatePath`, `nutrientDraw` are
  `persistent + authorable`. Defaults: `_vigor = 0.7` (L420),
  `growthStage = 'seedling'` (L424), `_flowering = false`,
  `_seedSet = false`, `_fruitFill = 0`. `SECONDS_PER_GAME_DAY = 86_400`
  (L161).
  `packages/server/src/mud/platform/idea/persistence/PersistentHydrator.ts:67–75`
  applies **every persistent field present in `data`** (`if (!(field in data)) continue;`)
  — so a YAML `growthStage: mature` hydrates whatever `authorable` says.
- First reconcile with `growthClockStamp === 0` seeds the stamp and
  integrates nothing (L680–682). `advanceStage()` (L999–1014) walks
  **forward only** from the current stage — an authored `mature` with
  `_maturity: 0` is stable. `updateFlowering()` (L1022–1051):
  `shouldFlower = mature && _vigor >= husbandry.band.thrivingAt (0.8)`;
  on latch a polycarp sets `_seedSet = true`, `_fruitFill = 0`,
  `_worstLimiting = 1`. `accrueFruitFill` (L1058–1067):
  `_fruitFill += limiting × dt / (fruitFillDays × DAY)`.
  `isHarvestable()` (L565–571): `harvestTemplatePath` set, mature,
  alive, and for a polycarp `_fruitFill >= 1`. `settleCycle()`
  (L527–530) zeroes `_fruitFill`, `_seedSet`, `_flowering`.
  `isPolycarp()` = `fruitSetCount > 0 && fruitFillDays > 0` (L517–519).
  ⚠ **So an authored-mature stool does not fill until `_vigor` climbs to
  0.8**, and vigor relaxes toward the limiting satisfaction — the light
  ramp (`luxHappyAt`/`luxDarkAt`) decides whether it ever gets there.
- `GrowthProfileData` (L102–158): `moistureHappyAt`, `moistureWiltAt`,
  `litresPerGameDay`, `luxHappyAt`, `luxDarkAt`, `rootDemand{...}`,
  `daysToStage{young, established, mature}`, `fruitSetCount?`,
  `fruitFillDays?`. Clock: `WorldClockApi.DEFAULT_SCALE = 12`
  (`api/worldclock.ts:108`); `DefaultCalendar.ts:15–21` 360 days a year
  → **one game year = 360 game days = 30 real days**.
- `packages/server/src/mud/platform/thing/Plant.ts` —
  `PersistableMixin(PostRegistrationMixin(SlottableMixin(GrowingMixin(ReservedMixin(OrganismMixin(ThermalMixin(DetailedMixin(Thing))))))))`
  (L53); own field `seedTemplatePath` (persistent + authorable);
  `getPersistenceKey()` mints a uuid **lazily on first demand** (L222–232);
  `onFloweringLatched` clones the seed into the bed (monocarps only).
- `packages/server/src/mud/lib/husbandry/Cultivable.ts` —
  `CultivableMixin<TBase extends MixinConstructor<Stuff & Container & Bulkable & Slotted & Populates & Reserved & Soil>>`
  (L141–145); `_mixinName` is a **plain literal** with the TS2417 warning
  (L147–157); `commandContributions.peers = [plant, repot, harvest, feed]`
  (L174–184); fields `fixedGround`, `landRequirementM2` (L186–189);
  `PLANT_SLOT = 'plant'` (L87); `occupy()` (L391–404) detects a
  **reseat** as `candidate.getContainer() === this` and only settles the
  soil on a real arrival; `applyProps()` calls `super.applyProps` then
  `adoptArrivals()` (L431–434).
- `packages/server/src/mud/platform/thing/GardenBed.ts` —
  `CultivableMixin(SoilMixin(PopulatesMixin(SlottedMixin(BulkableMixin(ContainerMixin(ReservedMixin(DetailedMixin(Thing))))))))`,
  the intermediate stack **named** because inference collapses otherwise.
  `platform/thing/PlantPot.ts` is the identical stack. `Crop.ts:35` =
  `CraftedMixin(DetailedMixin(Thing))`; `Seed.ts:25` =
  `PlantableMixin(DetailedMixin(Thing))`; `ToolItem.ts:37` =
  `CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))))`.
- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — `HarvestModel { target: MqlOneResult }` (L70–72); narrows
  `isGrowing(named)` else `isCultivable(named)` → first harvestable
  occupant else first growing (L98–104); refusals name the state
  (`plant-dead`, `nothing-ripe`, `not-mature`); count =
  `floor(fruitSetCount ?? 1)` clones of `harvestTemplatePath`, each
  `Crafted`-stamped (`maker`, `Grade.of(band)`, `recipe`, `craftedAt`)
  when `isCrafted`, else `setGrade` when `isGraded`, moved into the
  giver (L165–200); `bed.drawNutrient(draw)`; polycarp →
  `settleCycle()` else destruct; captures `bed ?? crops[0]` and the
  plant; **credits `horticulture`** with `polycarp ? 'easy' : transplantDifficulty()`
  (L253–258). **No tool anywhere.**
  `platform/content/platform/cmd/inventory/harvest.yaml`:
  `verbs: [harvest, pick]`, one arg `target` `requires: [VisibleMixin, GrowingMixin|CultivableMixin]`.
- `packages/server/src/mud/platform/idea/cmd/inventory/PlantController.ts`
  — narrows `isPlantable(seed)`, `isCultivable(target)`; **the land-use
  gate** runs only when `target.isFixedGround()` (L104–150): resolves the
  covering parcel of the room (persistence key first, then template
  path) and refuses when `covering && !LandUses.permitsAnyCultivation(use)`;
  then `hasSoil`, `isSlotFull(PLANT_SLOT)`, `getGrowsIntoPath`, clones
  the plant, `fitsSlot`, `ContainmentApi.move(plant, target)`,
  `target.reconcileSoil()`, `target.occupy(plant, PLANT_SLOT)`, destructs
  the seed, captures the plant, credits `horticulture`/`trivial`
  (L237–243). `plant.yaml`: `verbs: [plant, sow]`, `seed` requires
  `[VisibleMixin, PlantableMixin]`, `pot` requires
  `[VisibleMixin, CultivableMixin]` with `prepositions: [in, into]`.
- `packages/server/src/mud/lib/parcel/LandUse.ts:71–101` — the closed
  six; `wild` admits no cultivation (`cultivation: 'none'`),
  `agricultural` admits `field` (area band 1 000–4 000 000 m²);
  `residential` admits `bed`. ⚠ **A wood titled `wild` refuses `plant`
  on any fixed ground in it** — see D13.

### Persistence — what survives a restart, and what silently does not

- `packages/server/src/mud/lib/stuff/Populates.ts:231–239` — a `props:`
  entry whose class composes `SingletonMixin` is minted through
  **`StuffApi.singleton(path)`**; anything else through `StuffApi.clone`.
- `packages/server/src/mud/api/stuff.ts:659–700` `singleton()`: on a
  mint, if the instance `isPersistable` with no explicit key, **restore
  when a record exists, else lay down `props:` and capture the first
  record** — "a venue room reached by an exit or booted by a pack".
  `PersistableLogic.ts:740–765` `cloneHost` keyless routes through the
  same call. `Persistable.ts:303–317`: `postRegister` **no longer
  auto-drives persistence (D1)** — a host cloned by `clone()` restores
  nothing on its own.
- Consequence for today's coppice: `fuel-yard.yaml` (a
  `SingletonCartesianLocation`, not persistable) props
  `/trade/fuel/thing/coppice-panel` (`GardenBed`, not persistable, not
  singleton) → **a fresh, full panel every boot**, and a harvested
  stool's own captured record (`HarvestController` L242–246 captures
  the plant) is never re-referred because nothing persistable holds a
  `{ref, key}` to it. AC 8 (*"the panel is still regrowing"*) fails on
  the shipped shape; D5 is the fix.
- `PersistableLogic.ts:153–190` `place` capture records
  `container: env.getIdentityPath()`; `restorePlacement` (L192–245)
  resolves it by `findByTemplatePath` then `singletonOrClone`.
  `PersistableLogic.ts:1014–1018` `captureHostOf(stuff)` captures the
  **nearest persistable host**. `Persistable.ts:245–270`: the
  `applyProps` override *retains* the specs and seeds them only through
  the persistence gate, so a restored host never re-seeds.
- `platform/thing/Stock.ts:53–60` = `PersistableMixin(ConsignmentShelfMixin(…(Vessel)))`
  — persistable, **not** singleton; its `postRegister` runs `reset()`
  (the sweep), not a materialize. It survives a bounce today only where
  its room is a persistable host that refs it. Recorded, not fixed here.

### The rows that move, and everything that names them

- `packages/content/trade-fuel/content/trade/fuel/thing/cordwood.yaml`
  — `class: /platform/thing/Provision`, *"A straight length of oak"*,
  `_materialPath: …/wood/oak`, `gradeBand: fair`, `mass: 3.2`.
  `Provision` = `CraftedMixin(ContaminableMixin(CuredMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing))))))`
  — a spoilage gauge, a cure state and a pathogen population on a log.
- `…/hazel-stool.yaml` — `/platform/thing/Plant`, `_speciesPath` corylus
  avellana, `material: …/tissue/plant-tissue`, `harvestTemplatePath: /trade/fuel/thing/cordwood`,
  `nutrientDraw: 6`, profile `luxHappyAt: 100`, `luxDarkAt: 10`,
  `daysToStage {200, 900, 2500}`, `fruitSetCount: 8`, `fruitFillDays: 120`;
  the header claims *"Authored ALREADY GROWN"* and sets no stage.
- `…/coppice-panel.yaml` — `/platform/thing/GardenBed`, `mass: 2400`,
  `fixedGround: true`, `landRequirementM2: 120`, `interiorBulk: true`,
  `interiorCapacity: 180`, reserves moisture 90 L / nitrogen 100 %,
  `staticSlots: [{name: plant, accepts: SlottableMixin, capacity: 6, userFacingDetail: planting}]`,
  six `props:` stools, `material: …/wood/oak`.
- `packages/content/trade-mining/content/trade/mining/thing/felling-axe.yaml`
  (`ToolItem`, `capabilities: ["cutting", "striking"]`, iron, mass 2.8)
  and `billhook.yaml` (`capabilities: ["cutting"]`, mass 1.1);
  `trade-mining/content/recipes/felling-axe.yaml` + `billhook.yaml`
  (`outputTemplate: /trade/mining/thing/…`, `discipline: mining`,
  `requiresHeatK` 1300 / 1200). `recipes/timber-set.yaml`:
  `inputSlots: [{slot: stock, category: wood, minGrade: poor, kind: item, count: 2}]`,
  `toolCapabilities: [cutting]`.
- `packages/content/trade-fuel/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/betulaceae/corylus/avellana.yaml`
  — the hazel species (`_defaultMaterialPath: …/tissue/plant-tissue`,
  `lifespanMax: 80`); its header names the rotation as the seam.
- Every reference (verified by grep, 2026-09-17):
  `rejection/content/world/rejection/location/fuel-yard.yaml` (props L33–35
  + comments), `trade-fuel/src/__tests__/burn.test.ts` (L152–186: reads
  `hazel-stool.yaml`, `cordwood`, the species file, and asserts
  `daysToStage.mature > 2000`), `trade-fuel/src/idea/cmd/fuel/CharController.ts`
  (`isCordwood` = keyword `'cordwood'`, L199 — path-independent),
  `trade-fuel/content/trade/fuel/thing/clamp.yaml` (prose),
  `trade-fuel/README.md` (L3–8, the rotation seam),
  `trade-mining/src/__tests__/archetype-and-ladder.test.ts:154–159`
  (the exact recipe-id list incl. `billhook`, `felling-axe`),
  `packages/wire/tests/metal-chain.dirty.wire.test.ts:42` and
  `metallurgy.dirty.wire.test.ts:37–47` (`packs:` lists),
  `docs/antipatterns.md:4397–4435`, `docs/subsystems/smallholding.md:56–66`,
  `docs/slates/builds/metal-chain-slate.md`. Comment-only mentions in
  `ToolItem.ts:22–23`, `trade-cooking/src/thing/KitchenTool.ts:10–11`,
  `lib/material/__tests__/Contaminable.test.ts:363–365` need no edit.
- Material use counts across all shipped rows: `wood/oak` ×30, `wood/pine`
  ×1 (`trade-farming/content/trade/farming/thing/bed/garden.yaml:20`,
  a path that resolves to no row).

### Materials, species, the category rule

- `base-library/content/stuff/idea/material/wood/oak.yaml` (the only
  wood): `density: 750`, `specificHeat: 2000`, `thermalConductivity: 0.17`,
  `electricalConductivity: 1.0e-4`, `waterAbsorptionCapacity: 28`,
  `autoignitionTemperature: 570`, `heatOfCombustion: 16`, `hardness: 40`,
  `toughness: 60`, `tags: ["wood", "mixture", "organic", "flammable", "once-living"]`,
  `biologicalSource: null` under a comment that says *"until an oak-tree
  species template is authored"*. No `spoilActivationEnergy`.
- `packages/server/src/mud/lib/material/Material.ts:128–131`
  `BiologicalSource { speciesPath: string; tissueType: string }`;
  `getBiologicalSource()` L1131. `MaterialCatalogue.warm()` selects by
  the path infix `/idea/material/` and the class (CLAUDE.md), so a wood
  row anywhere under a root qualifies.
- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:1417–1423`:
  a recipe slot's `category` matches the input material's `category` OR
  a member of its `tags`; `minGrade` compares against an ungraded item as
  `Grade.of('fair')` (L391, L404). So a plain `Thing` made of a material
  tagged `wood` satisfies `timber-set` and `charcoal`.
- `Species` (`packages/server/src/mud/lib/species/Species.ts` per the
  grep; `_defaultMaterialPath` persistent L530, `adultMass` L536): the
  default material is the **living organism's** bulk material, which is
  why every plant species points at `tissue/plant-tissue`. The wood is
  the material's fact (`biologicalSource`), not the species'.
- `avellana.yaml` is the species row shape: `binomial`, `commonNames`,
  `_bodyPlanPath: /stuff/idea/species/BodyPlan/sessile`,
  `_parentCladePath: /stuff/idea/species/plantae`, `_defaultMaterialPath`,
  `lifecycleStates`, `sexDeterminationSystem`, `reproductiveMode`,
  `lifespanMin/Max`, `circadianBand`, `diet`. No `quercus`, `fraxinus`,
  `fagus`, `ulmus`, `salix`, `pinus`, `taxus` row exists anywhere.

### Tools, epoch, the seams gate

- `packages/server/src/mud/lib/craft/Tooled.ts` — `ToolMixin`:
  `capabilities: (string | CapabilitySpec)[]` (persistent + authorable,
  L45–56), `hasCapability(cap)` L78, `getInstanceContributions` over a
  capability's `verbs` + `placement` (the watering-can rule:
  `generic-objects/content/stuff/thing/vessel/watering-can.yaml:17`
  `- { kind: watering }`). **No `epoch` field exists anywhere** in the
  mudlib or in any row (grep, 2026-09-17).
- `packages/server/scripts/check-unconsumed-seams.ts:66–73`
  `isDataIdeaFile`: the unread-field census counts fields declared in
  `fieldMeta` **under `platform/idea/**` only** (not `idea/cmd/`, not
  `idea/api/`). A field on a `lib/` mixin is outside its scope. The gate
  is a ceiling (the count may fall, never rise).

### Light, the rooms, the biome

- `docs/subsystems/light.md:146–154` bands (lux): `<1` pitch-black ·
  `1–5` very-dim · `5–20` dim · `20–60` lit · `60–200` bright · `≥200`
  blinding; `lux = lumens / getSizeScale()`; `CartesianLocation.getSizeScale()`
  = the zone's `cellSize²` (L190–198); the table at L230 gives **direct
  sunlight (ambient slot) = 8000 lm**, worked at L236 as
  `8000 / 100 = 80 lux → bright` for a 10 m cell. L686 lists
  *"Time-of-day / world clock / outdoor ambient computation"* as out of
  scope — `AmbientLitMixin` (`lib/perception/AmbientLit.ts`,
  `ambientIntensity` + `ambientColorTemperature`, persistent +
  authorable, L49) is a constant nothing modulates. **There is no
  night.**
- `rejection/content/world/rejection.yaml` — `CartesianZone`,
  `cellSize: 10.0`, `address: terminus/rejection`,
  `deposit: /world/rejection/idea/deposit/ferrow`; the header explains
  `Zone.lookupField` walks OUTWARD so sub-zones inherit `deposit` and
  `address`. `kestrel-road.yaml` — `CartesianZone`, `cellSize: 20.0`.
- The twelve `location/*.yaml` rows: every one is
  `/platform/location/SingletonCartesianLocation` except `fringe-claim`
  and `far-fringe` (`/trade/mining/location/AuthoredWorking`); **none
  authors `ambientIntensity` or `_biomePath`**. Coords: pithead (0,0),
  claims-office (0,1), hillside (0,2) with exits `southwest` → claims
  office and `northeast` → old-workings (2,4) → fringe-claim (5,7) →
  far-fringe (10,14); fuel-yard (1,1) with `southwest` → pithead, `east`
  → smelter (2,1); the-dry (−1,1); provisioning (−1,0); assay-shed (1,0);
  adit (0,−1) `south` → the Ferrow. **Nothing at y > 2 west of x = 2**:
  the ground north and west of the hillside is free, and the seam runs
  NE. `fuel-yard.yaml` props `clamp`, `coppice-panel`, `billhook`,
  `felling-axe`, four `charcoal`; casts the collier; its prose says
  *"the coppice standing behind it"*.
- The five Kestrel Road rooms (`kestrel-road/{lower-climb,upper-climb,tips,the-pass,yard-gate}.yaml`)
  author `ambientIntensity: 600`–ish with `_biomePath: /stuff/idea/biome/outdoor/baseline`
  at `cellSize: 20` → 1.5 lux → **very-dim** by their own arithmetic.
- Biome rows: `base-library/content/stuff/idea/biome/outdoor/baseline.yaml`
  (`class: /platform/idea/SkyExposedBiome`, `_extendsBiomePath: …/universe`,
  `_defaultHumidity`, `_ambientSoundMml`) and `meadow.yaml`
  (`_defaultWind`, `_ambientSmellMml`). `BiomeApi.isSkyExposed(scope)` is
  what `SoilMixin` reads for the rain edge (`Soil.ts:510`).
- Title: `rejection/pack.yaml:19–31` —
  `{ extent: /world/rejection/kestrel-road, parentParcel: /world/rejection, holder: { group: rejection }, landUse: wild }`
  is the sub-parcel shape. `rejection/package.json` depends on
  `trade-fuel`, `trade-mining`, `trade-smelting`, `trade-smithing`,
  `transport` + the three base packs.

### Packs, the graph, the lints

- `docs/subsystems/content-packs.md:126–137`: `dependsOn` is DERIVED
  from `package.json` `@saxonberg/content-<id>` dependencies; the root
  `/package.json` (L5–47, alphabetical) is the deployment manifest —
  **a new pack is one dependency line there**. `StuffApi.resolveClassFile`
  (`api/stuff.ts:320`) resolves a class path into the owning pack's
  `src/` by longest registered root, so a `rejection` row naming
  `/trade/forestry/thing/Stand` resolves into `trade-forestry/src/`
  provided `rejection` depends on it (install order).
- `trade-fuel/package.json` and `trade-mining/package.json` depend on
  nothing that forestry will ship; `CharController` reads cordwood by
  keyword; `timber-set` takes the `wood` tag.
- Lint roster (`packages/server/package.json:36–77`, all run by
  `lint:family`): `gates, blessed-bands, field-meta, module-scope,
  boundary, world-scan, whole-table, thin-forwarder, object-verbs, pm,
  imports, identity, person-keys, get-or-create, lib-statics,
  presentation, does-nothing, drive-scripts, dossiers, inert-weapon,
  combat-dynamics, instanceable, locations, census, perishable,
  pathogens, arg-kinds, mixin-names, binder-models, descriptors,
  dispositions, condition-arms, conditions, unconsumed-seams,
  verb-collisions, topics, test-bootstrap, test-content, schema,
  untitled`. The ones this build's changes meet: `verb-collisions`
  (`check-verb-collisions.ts` — every `cmd/**/*.yaml` whose parent is not
  `idea`; `fell` is claimed by nothing today; `plant`, `sow`, `survey`,
  `cut`, `harvest`, `pick` are taken), `arg-kinds` (an object-typed arg
  must declare `requires`), `binder-models` (a controller test that
  hand-builds a model must declare every object arg on the model
  interface), `untitled` (every shipped path under a title root needs a
  claim prefix), `census` (every path-valued field in a row —
  `props:`, `exits.*.destination`, … — resolves), `perishable`,
  `instanceable`, `locations` (`check-location-classes.ts` — the
  `FurnishableRoom` roster is enumerated; `SingletonCartesianLocation` is
  the default), `schema` (`documents.yaml` prose enumerates kinds at
  L11 and L43), `imports`, `module-scope`, `mixin-names`,
  `unconsumed-seams`.
- `args[].requires` is parsed by `CommandLogic.ts:2816` `parseRequirement`
  — a `|`-separated list of mixin names (or `class:` for the sanctioned
  roots); the scope scan filters candidates by the terms **before
  binding**, so a keyword match that cannot satisfy `requires` falls
  through instead of shadowing (L2989–2996). A pack mixin's
  `_mixinName` is registered at discovery and nameable (CLAUDE.md
  § Session notes). `buy.yaml` shows an arg `default: "reachable:[mixin.X]"`
  + `scope: [reachable]`.
- Wire: `packages/wire/src/harness/index.ts` exports `Session`,
  `uniqueHandle`, `declareFile`, `expectOk`, …; `Session.cmd`, `.prose`,
  `.query/queryOne`, `.drainProse`, `.awaitActivity`;
  `metallurgy.dirty.wire.test.ts:23–47` is the `DIRTY_REASON` +
  `declareFile({file, packs, dirtyReason})` shape. The harness *"waits on
  a frame, never on a clock"* (`session.ts:10`) and no test moves the
  world clock (the farming and cooking files say so in their headers).
- Chronicle: `packages/server/src/mud/lib/character/Persona.ts:268`
  `recordDeed(fields: ChronicleEntryFields)` (`@Final @Unshadowable`,
  ungated) and `recordChronicleOnce(key, fields)` (L279 — idempotent on
  `key`); `ChronicleEntry.ts:46–64` fields `template`, `vars`, `text`,
  `when`, `where`, `who`, `tags`, `key`. Narrow with `MixinApi.isPersona`.
- Advancement: `Advancing.creditDeed({discipline, difficulty, outcome})`
  on the actor (`lib/advancement/Advancement.ts:225–235`); Discipline
  rows are warmed by class (`DisciplineCatalogue.ts:144–150`);
  `platform/content/platform/idea/Discipline/agriculture.yaml` exists;
  `trade-mining/content/trade/mining/idea/Discipline/mining.yaml` is the
  row shape (`key, channel, label, iscedf, description, requires`).
- Charcoal: `trade-fuel/src/thing/CharcoalPit.ts` — `CHARS_FROM 0.3`,
  `CHARS_TO 0.62` (L44–45), `yieldRatio` authorable, `clamp.yaml`
  authors `0.35`; `yieldFor(lengths, draught)` =
  `floor(lengths × yieldRatio × (1 − 0.4 × |draught − 0.46| / 0.16))`
  (L130–137). `recipes/charcoal.yaml` charges 8 lengths
  (`category: wood, count: 8`). `CharController.ts:74–84` chars every
  cordwood in the pit.
- `docs/subsystems/mining.md:200–203`: *"a mine that runs out of timber
  has a supply problem"* — the sentence this build makes true.

---

## Plan-level decisions

### D1 — the stand is a filed record: `StandRegistry`, one kernel kind, whole standards as the unit

**Question.** What is the stand, where does it live, and in what unit?

**Choice.** `trade-forestry/src/idea/StandRegistry.ts` =
`RegistrarMixin(Idea)`, the `HerdRegistry` shape line for line:
`STAND_PREFIX = '/trade/forestry/stands'`, `STAND_OWNER = '/trade/forestry'`,
`STAND_KIND = 'stand'`; row `content/trade/forestry/idea/StandRegistry.yaml`
(`class:` only); `canEvict` vetoes; `file` / `read` / `update` with the
prefix re-check on every read. **The kernel edit this needs, named:**
`lib/document/DocumentKinds.ts` gains
`stand: { kind: 'stand', naturalKey: null, contentDir: 'stands', ext: 'yaml', onVanish: 'keep' }`
with the herd entry's rationale (a record of something that happened; a
record about the commons kept by the trade). This is the one place a
pack needs a kernel list edit, and it is the platform act
`DocumentKinds.ts` says it is.

**The record.**

```ts
interface StandSpecies {
  speciesPath: string;        // the Species row
  name: string;               // the word a player uses: 'oak'
  woodMaterialPath: string;   // what a felled one is made of
  seedPath: string | null;    // the seed a felled one drops (an acorn)
  standing: number;           // whole standards at `stamp`
  capacity: number;           // what the site carries (the cap)
  incrementPerYear: number;   // standards per game year, toward capacity
}
interface StandPlanting {
  plantKey: string;           // the planted Plant's persistence key
  planter: string;            // getIdentityPath()
  planterName: string;        // what the record shows
  speciesPath: string;
  gameDay: number;            // floor(gameSeconds / 86_400)
}
interface StandRecord {
  standId: string; name: string; extent: string; // the wood's parcel
  founded: number;            // game-seconds
  stamp: number;              // game-seconds the `standing` figures are true at
  mix: StandSpecies[];
  plantings: StandPlanting[];
  cutLog: { speciesPath: string; at: number; by: string }[];
}
```

**The unit is whole standards ("trees' worth"), not m³.** Felling takes
one; the drive says *"smaller by one tree's worth"*; a player reads
*twenty-four oaks*. Volume would be a second number derived from the
first and read by nothing.

**Derive on read, write on acts — never stamp on read.**
`StandRegistry.standingNow(sp: StandSpecies, nowS): number = min(sp.capacity, sp.standing + sp.incrementPerYear × (nowS − stamp) / (360 × 86_400))`.
A cut calls `registry.cut(standId, speciesPath, nowS)` which settles
every species to `standingNow`, decrements one, rewrites `stamp = nowS`,
appends the `cutLog` entry, and saves. The herd derives ages the same
way and stamps nothing on read; the soil stamps on read because it
integrates a drain — the stand has no drain, so the pure form is the
honest one. The increment continues from zero (a stump-field regrows;
AC 7 says *refilled only by the increment and by planting*), so a
felled-out wood is empty for `capacity / incrementPerYear` game years.

**A sync memo, warmed at boot, so prose can read it.** `look` renders
through a **synchronous** `MarkupAugmenter` (`api/mml.ts:130`), and the
registry's store reads are async. `StandRegistry` keeps
`#memo: Map<standId, StandRecord>` — write-through on `file`/`update`/
`cut`/`recordPlanting`, refreshed by every `read`; `peek(standId)` is
the sync read. ⚠ The *reference-Ideas-inert-at-boot* trap: every
`Stand` fixture's `postRegister` **awaits** `registry.read(standId)`, so
the memo is warm before any `look`. The memo is a per-process copy of
the store, never a second source of truth (every act re-reads before it
writes).

**Rejected.** A field on the zone (a pack cannot add a field to a kernel
class, and the MineZone lesson in `rejection.yaml`'s header). A
persistable Stand fixture (N clones per wood; a keyless persistable
singleton collides). m³ with a density (nothing reads it). The seeded
field-from-the-address (the mine's `Deposit` shape): the requirements'
*"an authored wood is always a wood"* makes the row the seed — a
species mix authored on the venue's row IS the seeded character; the
record IS the derived state. Named as a seam for the RGO-unification
build (§ Deferred seams).

### D2 — the `Stand` fixture: one venue row, propped in every wood room, first-to-register files

`trade-forestry/src/thing/Stand.ts` =
`PostRegistrationMixin(DetailedMixin(Thing))` (`/trade/forestry/thing/Stand`).
Authorable fields (`fieldMeta`): `standId`, `standName`, `extent`,
`mix: StandSpecies[]` (the founding figures — the row is what the stand
STARTED as; the document is what it has become). `postRegister()`:
`super`; resolve `StuffApi.singleton<StandRegistry>('/trade/forestry/idea/StandRegistry')`
(the Herdbook's try/catch with the `console.error` — tolerated pre-boot,
never silent); `if ((await registry.read(standId)) === null) await registry.file({... founded: now, stamp: now, plantings: [], cutLog: []})`.
Get-or-create: a re-registration never rolls the record back. The venue
row: `rejection/content/world/rejection/hanging-wood/thing/stand.yaml`
(`class: /trade/forestry/thing/Stand`, `shortDescription: standing timber`,
`register: definite`, `keywords: [trees, timber, stand, wood, standards, oak, ash]`,
`mass: 100000` — can't-budge is mass, never a flag), propped in **each**
of the four wood rooms. Four clones of one row, the first to register
files, the rest read.

`static commandContributions = { self: [], environment: ['trade/forestry/cmd/forestry/fell.yaml'], peers: ['trade/forestry/cmd/forestry/fell.yaml'] }`
— the trade's act is conferred by the trade's own fixture, never by a
core mixin (the Herdbook / ClaimsRegister rule).

`static markupAugmenters = [standAugmenter]` appends the derived
reading to the authored long description: per species
*"Oak stands here — about twenty-four trees' worth, old, planted by
nobody alive."* / *"Ash — twelve."*; then the plantings *"An oak
sapling, planted by Tam Ferrier on the 4th day of the 2nd year."*; when
every species derives to `< 1`: *"Nothing stands here that is worth the
axe — stumps, brash and the saplings somebody planted."* Numbers as
words (`about twenty-four`) because a stand record is a ledger a player
reads, not a gauge: the herdbook's tally is the precedent. The
augmenter reads `registry.peek(standId)` and `WorldClockApi.getNow()`;
a null memo (pre-boot) renders the authored line alone.

**What composing this claims:** nothing beyond the fixture — `Thing`
brings Tangible/Containable/Visible/Chattel/Wet, all true of a stand of
trees (it is wet when it rains). No `FixtureMixin`: the Herdbook
composes it and never uses `seatIn`; a `props:` entry is how this row is
placed and `seatIn` would be a second, unused placement route.

### D3 — `fell`: one view, the kernel engaged-act base, the axe as an argument, no second copy

**View** `trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`
(`verbs: [fell]` — free; `lint:verb-collisions` stays at its nine):

```yaml
verbs: [fell]
controller: /trade/forestry/idea/cmd/forestry/FellController
description: "Fell a standard with an axe"
validators: [requiresAnimate, requiresConscious, requiresEmbodied]   # the three /lib/command/validators paths
args:
  - name: target            # a planted standard you can see, OR a species word
    type: object
    required: false
    scope: [reachable]
    requires: GrowingMixin
  - name: axe
    type: object
    required: false
    prepositions: [with]
    scope: [reachable]
    requires: ToolMixin
```

`fell` — the room's stand, its most-standing species. `fell oak` — the
word cannot bind (`oak` matches no Growing thing; the scan filters the
Stand fixture out because it does not compose `GrowingMixin`,
`CommandLogic.ts:2989`), so the controller reads `model.target.raw` as
a species word against the stand's `mix[].name`. `fell sapling` — binds
the planted `Plant` (D6) when it is mature. `with <axe>` names the
instrument; when absent the controller takes the first reachable tool
the giver *holds* with the `felling` capability (the `shore` shape,
held first). ⚠ Not `requires: GrowingMixin|<something>` — an alternation
deletes a check (project memory), and the fixture is reached as the
room's environment, not as a target.

**The capability.** The felling-axe row gains `felling`:
`capabilities: ["felling", "cutting", "striking"]`. `fell` narrows to
`felling`; a billhook (`cutting`) refuses *"That is a billhook. It will
take a stool off at the ankle, and it will not take an oak."*
(`wrong-tool`). No axe at all: *"You have nothing here that will fell a
tree."* (`no-axe`).

**Controller** `trade-forestry/src/idea/cmd/forestry/FellController.ts`
`extends ManualBuildController<FellModel>` from
`@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController`
— the kernel base whose `engageStep` is `MiningActController.engageAct`
minus the endurance spend (§ Grounding). The spend is three lines inline
(`MixinApi.isReserved(giver) && giver.hasReserve('endurance')` →
`adjustReserve('endurance', Quantity.of(-FELL_COST, '%'))`). **No
`ForestryActController` copy**: the second copy of `engageAct` was the
seam to name, and the kernel already holds the thing it would copy. The
remaining seam — `MiningActController.engageAct` is `engageStep` plus a
spend — leaves as a tail (§ Deferred seams).

Constants: `FELL_MS = 30_000` game-ms (a cut takes longer than a
pick-swing; 2.5 real seconds at 12×), `FELL_COST = 10` endurance points;
`TIMBER_PER_STANDARD = 2`, `LOGS_PER_STANDARD = 4`, one seed.

Flow (`execute`): resolve the axe (arg, else held-first) → the target:
(a) `model.target.stuff` is a `Growing` plant → it must be `mature`, and
its `_speciesPath` must appear in the room's stand `mix` **or** the plant
must carry `harvestTemplatePath === null` and a `discipline` of
`silviculture` (a standard, not a stool: *"That is a stool — cut it with
a billhook."*, `not-a-standard`); (b) no object → the room's `Stand`
fixture (`giver.getContainer().getContents().find(isStand)`; none →
*"There is nothing here to fell."*, `no-stand`); species = the raw word
matched against `mix[].name`, else the species with the greatest
`standingNow`; `standingNow < 1` → *"There is nothing left here that is
worth the axe."* (`stand-empty`, in words about the wood). Then
`engageStep(context, { durationMs: FELL_MS, beginSelf, beginPeers, onComplete: () => { void fellStandard(...) | void fellPlanted(...) } })`
with the spend before it.

`fellStandard` (module-level, opens with `isDestroyed()` check): re-read
the record; `registry.cut(standId, speciesPath, nowS)` (which re-derives
and refuses if it derived to `< 1` meanwhile — a concurrent cut — with
the same *nothing left* line); mint `TIMBER_PER_STANDARD` clones of
`/trade/forestry/thing/timber` and `LOGS_PER_STANDARD` of
`/trade/forestry/thing/log`, `setMaterial(woodMaterial)` on each
(`Tangible.setMaterial`, the material resolved through
`StuffApi.singleton<Material>(sp.woodMaterialPath)`), one clone of
`sp.seedPath` when non-null; move timber + seed into the giver, logs
onto the room floor (four logs exceed what a person carries beside two
lengths of green oak — the encumbrance gauge decides, not the verb);
`stampChattel(giver)` on each; scene *"The oak goes over with a crack
you feel in your feet. You cross-cut it where it lies: two lengths of
timber, four logs, and an acorn out of the crown."*; credit
`silviculture` `standard` (a felling is one act of judgment; the ground
does not grade it). `fellPlanted`: `StuffApi.destruct(plant)` (vacating
its slot through `Cultivable.vacate`), the same mint with the material
from the plant's species → the stand's `mix` entry (or, for a planted
tree outside any stand, the plant's own `standardMaterialPath`, D6),
`registry.removePlanting(plantKey)`, capture the panel.

Refusals are diegetic and noted (`controller-rejected` with the reasons
above). No deed gate — felling is labour (`MiningActController`'s own
ruling).

### D4 — timber, log, seed: three product rows, material stamped at the mint

- `/trade/forestry/thing/timber` — `class: /platform/thing/Thing`
  (`packages/server/src/mud/platform/thing/Thing.ts` — the concrete
  twin; Tangible carries material + mass), `shortDescription: length of green timber`,
  `keywords: [timber, length, log, wood, round]`, `_materialPath: …/wood/oak`
  (the default; the mint restamps), `mass: 24`. Satisfies
  `timber-set`'s `category: wood, minGrade: poor` through the material's
  tag and the ungraded-reads-`fair` rule. Not `Crop` — nothing grew it in
  a bed; not `Provision` — wood does not spoil.
- `/trade/forestry/thing/log` — `class: /platform/thing/Firewood`
  (the `dry-log.yaml` shape: `charMaterialPath: …/element/carbon`, a
  `fuel` reserve at 100 %), `mass: 4`, `keywords: [log, firewood, wood]`.
  A hearth lights it (AC 5) because `Firewood` reads ignition off its
  Material — which the mint stamps per species.
- `/trade/forestry/thing/seed/acorn` and `…/seed/ash-key` —
  `class: /platform/thing/Seed`, `growsIntoPath` → the sapling rows (D6),
  `_speciesPath` the tree. The drive's step 11 plants *"an acorn from the
  felled oak"* — the felled oak drops it.

### D5 — the `Panel`: a persistable singleton bed, one row per panel, and it tells you when it is ready

`trade-forestry/src/thing/Panel.ts` =
`PersistableMixin(SingletonMixin(PostRegistrationMixin(GardenBed)))`
(`/trade/forestry/thing/Panel`), importing `GardenBed` from
`@saxonberg/server/mud/platform/thing/GardenBed`, `SingletonMixin` from
`…/lib/stuff/Singleton`, `PersistableMixin` from `…/lib/persistence/Persistable`
— **Persistable outermost** (the host rule), **Singleton so that a
room's `props:` mints it through `StuffApi.singleton`**
(`Populates.ts:231–239`), which is the one path that restores-or-seeds a
persistable singleton (`api/stuff.ts:659–700`). That is what makes AC 8
true: a harvested panel's stools are captured as `{ref, key}` nested
hosts in the panel's container slice and restored on the next boot,
elapsed time integrated by the growth model's reconcile-on-read. Each
panel is therefore **its own row** (one instance per template path):
the yard's, and one per wood clearing.

Own fields (`fieldMeta`, persistent + authorable): `standId: string`
(`''` for a panel with no stand behind it — the yard's), and nothing
else. `static commandContributions` re-declares Cultivable's four
**plus** `trade/forestry/cmd/forestry/fell.yaml` in `peers` (a mature
standard in a panel is felled where it stands; ⚠ a class's own static
shadows the composed mixin's list, so the four cultivation views are
copied in — `ranching.md § What the carcass opened onto` records the
one-direction silent failure).

`static markupAugmenters = [readyAugmenter]`: for each occupant that
`isGrowing` and `isPolycarp` and not `isHarvestable`, derive
`daysLeft = ceil((1 − getFruitFill()) × profile.fruitFillDays)` — the
polycarp fill is linear at full satisfaction — plus, when not yet
flowering, the words *"cut to the stool and regrowing"*; render one line
for the panel: *"The stools are cut and regrowing; at this rate they
will be ready to cut again in about three hundred and forty days — a
year, near enough."* When every stool `isHarvestable`: *"The stools are
ready to cut."* (The drive's step 3 reads this line.)

`occupy(candidate, slot)` override — D6's deed hook.

**What composing it claims:** every Panel is a bed (true: the same
stack), a persistence host (a panel remembers what was cut from it
across a restart — true, and the whole point), and one-per-row (true:
a panel is a place-thing; a second cant is a second row, the way a
second herdbook is a second row).

**Rejected.** Leaving the panel a `GardenBed` in a non-persistable room
(the shipped shape — a full panel every boot, a faucet through
`restart`). A persistable *room* for the yard (the fuel yard is a
`SingletonCartesianLocation` and `lint:locations` enumerates the
`FurnishableRoom` roster on purpose — nobody furnishes a fuel yard).

### D6 — planting a standard is the kernel `plant` into a `Panel`; the deed is written by the ground

The kernel `plant <acorn> in <panel>` runs **unchanged**: `PlantController`
narrows `isCultivable(target)` (a Panel is), the land-use gate passes
(D13), `hasSoil`, a free slot (the panel's `plant` slot has capacity 8:
six stools + two standards — coppice-with-standards is one panel doing
both, the slate's own sentence), mints the sapling, seats it, credits
the plant's `discipline` (D7).

**The sapling rows** (`trade-forestry/content/trade/forestry/thing/plant/oak-standard.yaml`,
`ash-standard.yaml`): `class: /platform/thing/Plant`, `_speciesPath` the
tree, `material: …/tissue/plant-tissue`, `lifecycleState: alive`,
`harvestTemplatePath: null` (a standard is not harvested — it is felled),
`discipline: silviculture`, `standardMaterialPath: …/wood/oak` (D7's
third field — what a felled one is made of when no stand record answers),
profile `luxHappyAt: 20`, `luxDarkAt: 3` (a sapling under the canopy at
a clearing's 30 lux is light-unlimited; 15 lux on a ride is still
growing), `moistureHappyAt: 0.25`, `moistureWiltAt: 0.05`,
`litresPerGameDay: 0.3`, `rootDemand {seedling: 0.5, young: 3, established: 10, mature: 20}`,
**`daysToStage {young: 360, established: 1800, mature: 5400}`** — fifteen
game years, the requirements' number, stated on the row. No
`fruitSetCount`/`fruitFillDays`; `seedTemplatePath: …/seed/acorn` (a
mature standard sets an acorn into its panel once per flowering episode,
the shipped monocarp latch — a wood that seeds itself, for free).

**The deed.** `PlantController` is kernel and must not learn forestry.
`Panel.occupy(candidate, slot)`: `super.occupy(...)`; then, if
`slot === PLANT_SLOT`, the arrival is not a **reseat** (the same
`candidate.getContainer() === this` test `Cultivable.occupy` uses — a
persistence restore re-seats and must not re-record), the candidate
`isGrowing` with `getHarvestTemplatePath() === null` (a standard, not a
stool), and an acting author resolves
(`ExecutionContextApi.getActingAuthor()` — the command frame's giver,
exactly how `HarvestController.ts:157–158` finds the maker): (1)
`void registry.recordPlanting(standId, {plantKey: candidate.getPersistenceKey(), planter: author.getIdentityPath(), planterName: author.getPresentation(), speciesPath, gameDay})`
when `standId !== ''`; (2) if `MixinApi.isPersona(author)`,
`void author.recordChronicleOnce('forestry:planting:' + plantKey, { template: 'planted {{species}} standard in {{where}}', vars, tags: ['forestry', 'planting'], where: room path })`
— `recordChronicleOnce` because a deed is minted once per tree, and its
key is the tree. Both fire-and-forget with a `console.warn` on failure
(`Plant.onFloweringLatched`'s posture: a failed side record must never
abort a seat). `Plant.getPersistenceKey()` mints the key on demand, so
it is stable from the first call.

**Why the ground writes it and not the verb:** the deed is a fact about
*this panel in this wood* — which stand it joined — and only the panel
knows its `standId`. The verb knows a seed and a bed.

**Fifteen game years is stated, not promised:** the sapling row's
`daysToStage.mature: 5400` and the stand prose *"planted … will stand
mature in fifteen years"* are the statement; nothing in this build can
observe the maturity (450 real days).

### D7 — the coppice cut is the kernel `harvest`, told by the plant which tool and which Discipline

Two kernel fields on `GrowingMixin` (`lib/husbandry/Growing.ts`
`fieldMeta`, persistent + authorable, beside `harvestTemplatePath`):

- `harvestTool: string = ''` — the **capability kind** the cut needs
  (`''` = none; a carrot is pulled by hand). Getter `getHarvestTool()`.
- `discipline: string = 'horticulture'` — the Discipline this plant's
  husbandry exercises. Getter `getDiscipline()`.

And a third on `Plant` (the class, beside `seedTemplatePath`):
`standardMaterialPath: string | null = null` — what a felled standard is
made of when no stand record answers for it (a planted tree in a panel
with `standId: ''`). Read only by `FellController.fellPlanted`.

`HarvestController`: after resolving the plant and before the
`isHarvestable` refusal, `const need = plant.getHarvestTool(); if (need) { const tool = toolFor(giver, model.tool?.stuff ?? null, need); if (!tool) → refuse *"You need something that cuts to take that — a billhook, or an axe."* (`needs-tool`) }`
where `toolFor` = the named tool if `isTool && hasCapability(need)`,
else the first `isTool` in `giver.getContents()` with the capability
(held first — the `shore` shape; `ManualBuildController.findCapability`
is on a different base and is not reused). The credit becomes
`discipline: plant.getDiscipline()`. `PlantController` credits
`plant.getDiscipline()` too (the minted plant is in scope at L237).
`harvest.yaml` gains:

```yaml
  - name: tool
    type: object
    required: false
    prepositions: [with]
    scope: [reachable]
    requires: ToolMixin
```

and `HarvestModel` gains `tool?: MqlOneResult` (`lint:binder-models`).
The hazel-stool row authors `harvestTool: cutting`,
`discipline: silviculture`. Every other plant row authors neither and
behaves exactly as today (a carrot: no tool, horticulture) — the
phase-1 suite is the proof.

**Host placement:** `GrowingMixin`, and what that claims is true of
every growing thing — *what it is cut with* and *what its keeping
exercises* are facts about the plant, not about the verb, and the
alternative (a `harvest`-side species table) is a content word in the
kernel. `lint:unconsumed-seams` does not count `lib/` fields (§ Grounding)
and both have readers in the same wave regardless.

`silviculture` is therefore credited by: `fell` (D3, the pack's own act);
`harvest` of any plant whose row says so (the stool); `plant` of a seed
whose plant says so (the acorn → `oak-standard`). AC 12.

### D8 — cordwood is a `Crop`, and it is hazel

`/trade/forestry/thing/cordwood` — `class: /platform/thing/Crop`
(`CraftedMixin(DetailedMixin(Thing))`), `_materialPath: …/wood/hazel`,
`gradeBand: fair`, `mass: 3.2`, keywords unchanged (`CharController`
finds it by `cordwood`), prose *"A straight length of hazel, barked and
cut to an arm's length."* `Crop` is the honest class: cordwood is what
`harvest` takes off a stool, and `HarvestController` stamps a `Crafted`
crop with the maker and the grade of the cycle (L175–183). `Provision`
hung a freshness clock, a cure state and a pathogen population on a
stick — the `Freshness off every Thing` shape at row scale.
`lint:perishable` is indifferent (hazel authors no
`spoilActivationEnergy`). The charcoal recipe (`category: wood`) and the
timber-set recipe match through the `wood` tag.

### D9 — the rotation, and a panel that is ready on a fresh boot

`hazel-stool.yaml` (moved to `trade-forestry/content/trade/forestry/thing/hazel-stool.yaml`)
authors, beside the species/material/harvest fields:

```yaml
  harvestTool: cutting
  discipline: silviculture
  growthStage: mature        # persistent, not authorable — hydrates regardless (PersistentHydrator L67–75)
  _vigor: 0.9                # above thrivingAt (0.8), so the FIRST re-latch after a cut is immediate
  _flowering: true
  _seedSet: true             # the cycle window is open …
  _fruitFill: 1              # … and full: isHarvestable() is true before any reconcile
  profile:
    luxHappyAt: 15           # hazel is shade-tolerant; a 30-lux clearing and a 15-lux ride both keep it thriving
    luxDarkAt: 2
    moistureHappyAt: 0.2
    moistureWiltAt: 0.03
    litresPerGameDay: 0.15
    rootDemand: { seedling: 0.4, young: 2, established: 6, mature: 14 }
    daysToStage: { young: 60, established: 180, mature: 360 }   # a stool planted from a nut is cuttable after one game year — real hazel's 7, at the 1:7 ratio
    fruitSetCount: 8
    fruitFillDays: 360       # one game year — the requirements' rotation
```

Traced against `Growing.ts`: hydration sets the six fields; the first
read seeds `growthClockStamp` and integrates nothing; `isHarvestable()`
= `harvestTemplatePath && mature && alive && _fruitFill >= 1` → **true
on a fresh boot**. A cut runs `settleCycle()` (fill 0, window closed);
the next reconcile latches (`_vigor 0.9 ≥ 0.8`) and reopens the window;
fill accrues at `limiting × dt / (360 × DAY)` — at full satisfaction the
panel is ready again in exactly one game year, and a stressed panel
later (the requirements' *"yields less if cut sooner"* is
`HarvestController`'s refusal-until-ripe plus the cycle's
`_worstLimiting` grading the cut). The old `daysToStage.mature: 2500`
and `fruitFillDays: 120` are replaced, not tuned; the header's
*"ALREADY GROWN"* claim finally describes the row. The species row's
*"cut-and-regrow ROTATION"* seam paragraph is retired with the move (the
rotation is now the profile), and the `burn.test.ts` assertion that
reads that paragraph moves with the row (W2).

**Yields less if cut sooner.** The kernel refuses an unripe polycarp
(`nothing-ripe`) rather than yielding less. The requirements' AC 4 says
*"yields less if cut sooner"*; the shipped model says *yields nothing
until ripe, and grades by the cycle's worst stretch*. This plan does
not add a partial-yield rule (it would be a second mechanism for one
crop) — recorded in § Risks & opens as the one AC read loosely.

### D10 — the row moves, the pack graph, and who depends on whom

Moves into `trade-forestry` (`packages/content/trade-forestry/content/`):
`trade/forestry/thing/{cordwood, hazel-stool, felling-axe, billhook}.yaml`,
`recipes/{felling-axe, billhook}.yaml` (`outputTemplate` re-pointed;
`discipline: mining` kept — the recipe is the smith's anvil work, and
renaming its Discipline is not this build's), and the hazel species row
at the same taxonomy path under `content/stuff/idea/species/…` (path
unchanged; owning pack changed — two packs may not ship one path, so it
is a move, not a copy). The coppice panel becomes a **venue row**
(D5): `rejection/content/world/rejection/thing/fuel-yard-panel.yaml`,
`class: /trade/forestry/thing/Panel`, `standId: ''`, the six stools now
`/trade/forestry/thing/hazel-stool`, `capacity: 8`; `trade/fuel/thing/coppice-panel.yaml`
is deleted.

Every reference in § Grounding updated: `fuel-yard.yaml` props (the
panel path, the two tool paths, the comments); `burn.test.ts` — the
`describe('the coppice')` block **moves** to
`trade-forestry/src/__tests__/coppice.test.ts` (it reads forestry's rows
now; the `> 2000` assertion becomes `=== 360`, the species-paragraph
assertion is retired with the paragraph); `archetype-and-ladder.test.ts:154–159`
drops `'billhook', 'felling-axe'`; both metal wire tests' `packs:` gain
`'trade-forestry'`; `trade-fuel/README.md` L3–8 points at forestry;
`antipatterns.md:4397–4435` and `smallholding.md:56–66` re-pointed (W6).

**Dependencies.** `rejection/package.json` gains
`"@saxonberg/content-trade-forestry": "workspace:*"` (its rows name
forestry classes — the class-source resolver needs the pack installed
first). Root `package.json` gains the same line (alphabetical, after
`content-trade-farming`). ⚠ **`trade-fuel` and `trade-mining` do NOT
gain the dependency** — a deviation from the lean, for a reason: neither
imports a forestry class or names a forestry path (`CharController` is
keyword-driven; `timber-set` matches the `wood` tag), and a `dependsOn`
edge is *"the line that lets a pack's code import another pack's
classes"* (content-packs.md:131). A salt town with a fuel yard fed by a
bought stock line must be installable without a forester; the customer
relation is the tag, exactly as the smelting pack is a customer of the
mine through the ore's tag and not through a dependency. Forestry
depends on `base-library`, `generic-objects`, `platform`, `server`,
`types` (the fuel pack's list) — and on nothing else.

**After W2 lands: `pnpm install` (a new workspace package) and
`pnpm --filter @saxonberg/server reset:db`** — a template-path move is
a drop, never a migration (project rule).

### D11 — seven wood materials in the commons, with numbers a substrate reads

`base-library/content/stuff/idea/material/wood/{ash, hazel, beech, elm, willow, pine, yew}.yaml`
on the oak row's shape. Every row: `tags: ["wood", "mixture", "organic", "flammable", "once-living"]`
(the `wood` tag is what every recipe matches — `lint:census`-visible
through the rows that name them), `edibility: false`,
`nutrients: ["cellulose"]`, `composition: []`, `chemistry: null`, and
`biologicalSource: { speciesPath: <the tree>, tissueType: wood }`; oak
gains the same and loses its *"until an oak-tree species"* sentence.
The numbers that make each wood its word (density kg/m³ · hardness MPa ·
toughness MJ/m³ · waterAbsorptionCapacity % · autoignition K ·
heatOfCombustion MJ/kg · thermalConductivity W/mK; electrical
conductivity 1.0e-4 for all, dry wood being dry wood):

| wood | density | hardness | toughness | absorb | autoign | heat | cond | the number that makes it so |
|---|---|---|---|---|---|---|---|---|
| oak *(ships)* | 750 | 40 | 60 | 28 | 570 | 16 | 0.17 | dense and hard |
| ash | 690 | 36 | **95** | 30 | 570 | 16 | 0.16 | the toughest common timber — a haft |
| hazel | 620 | 26 | 55 | 32 | 560 | 16 | 0.15 | light, fast, chars well |
| beech | 720 | 42 | 65 | 30 | 570 | 17 | 0.17 | dense, hard, splits clean — the best firewood |
| elm | 560 | 30 | 70 | 35 | 570 | 15 | 0.14 | will not split; does not rot wet (`waterAbsorptionCapacity` low for its density is the tell an author reads) |
| willow | 420 | 18 | 60 | 40 | 550 | 15 | 0.12 | very light, very tough |
| pine | 510 | 22 | 30 | 35 | **540** | **18** | 0.12 | light, soft, resinous — lights first, burns hottest |
| yew | 670 | 38 | **110** | 25 | 580 | 16 | 0.15 | extreme toughness for its weight — the bow |

(Fire: `autoignitionTemperature` + `heatOfCombustion` are read by
`Combustible`; response: `hardness` + `toughness` by materials-response;
wetting: `waterAbsorptionCapacity` by `Wet`. Each row's comment names
which substrate reads which number, the oak row's convention.) The
garden bed's `wood/pine` resolves; `lint:census` clause (b) does not
read `material:` today, so a test in `trade-forestry/src/__tests__/wood-vocabulary.test.ts`
walks every `_materialPath`/`material:` under `material/wood/` across
all packs and every wood material's `biologicalSource.speciesPath` and
asserts both resolve to a file (the `verb-gates.test.ts` shape — YAML
against the tree, no controller).

### D12 — eight tree species, in the pack that grows them

`trade-forestry/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/…`
at the standard taxonomy paths: `fagales/fagaceae/quercus/robur`,
`lamiales/oleaceae/fraxinus/excelsior`, `fagales/fagaceae/fagus/sylvatica`,
`rosales/ulmaceae/ulmus/glabra`, `malpighiales/salicaceae/salix/alba`,
`fagales/betulaceae/corylus/avellana` (moved), and the two conifers under
`plantae/tracheophyta/pinopsida/pinales/pinaceae/pinus/sylvestris` and
`…/pinales/taxaceae/taxus/baccata`. Each on `avellana.yaml`'s shape:
`_bodyPlanPath: sessile`, `_parentCladePath: /stuff/idea/species/plantae`,
**`_defaultMaterialPath: /stuff/idea/material/tissue/plant-tissue`** —
confirmed correct: the species' default material is the living
organism's, which is what an `Organism` (a sapling) is made of; the wood
is the material row's fact, pointing back through `biologicalSource`.
`lifespanMax`: oak 600, ash 250, beech 300, elm 350, willow 80, pine 300,
yew 2000, hazel 80. `commonNames` carry the word the stand uses. The
`plantae` clade and the `sessile` body plan already exist (the fuel
pack's hazel row names both).

### D13 — the Hanging Wood: a sub-zone, four rooms, one biome, common land that may be planted

**Zone** `rejection/content/world/rejection/hanging-wood.yaml` —
`/platform/idea/location/CartesianZone`, `name: the Hanging Wood`,
`cellSize: 10.0`, `address: terminus/rejection/hanging-wood` (the
longest-prefix walk resolves the Locality `terminus/rejection`; the
Kestrel road's rooms carry per-room `_address` the same way). It
inherits `deposit:` from the region zone by the outward walk — recorded
in § Risks; mechanically harmless (the claim register keys blocks on
the *region* grid's coordinates, and the wood has its own grid).

**Rooms** under `hanging-wood/`, all `/platform/location/SingletonCartesianLocation`,
`_biomePath: /stuff/idea/biome/outdoor/woodland`, coords on the wood's
own grid, exits cardinal so the grid rule holds
(`CartesianLocation.addExit` refuses non-cardinal in-zone):

| room | coords | exits | props | ambient (lm) |
|---|---|---|---|---|
| `treeline` — the ride's end above the hillside; the yard's smoke visible below | (0,0,0) | `south` → `/world/rejection/location/hillside`; `north` → ride | stand | 5000 (50 lux, lit) |
| `ride` — the main ride under the canopy | (0,1,0) | `south` treeline; `north` oak-clearing; `west` hazel-cant | stand | 1500 (15 lux, dim) |
| `oak-clearing` — the big tree the prose is about; the standing timber read here | (0,2,0) | `south` ride | stand, `panel-north` | 3500 (35 lux, lit) |
| `hazel-cant` — a clearing with a coppice panel | (−1,1,0) | `east` ride | stand, `panel-west` | 3500 (lit) |

`hillside.yaml` gains `north: { destination: /world/rejection/hanging-wood/treeline, edgeMinutes: 4 }`
— north and west of the hill, off the strike (the seam runs NE to
(2,4) and beyond; the wood's grid is separate and nothing at the
region's (0,3+) exists). Every room `props:` the stand row (D2);
the two clearings each prop their own panel row
(`hanging-wood/thing/panel-north.yaml`, `panel-west.yaml`:
`class: /trade/forestry/thing/Panel`, `standId: hanging-wood`,
`capacity: 8`, six stools, reserves as the yard's, `interiorCapacity: 180`).
Prose: authored, invariant, and it never mentions a number the record
holds (the stand fixture reads those). The treeline's `details:` carry
`smoke` (*"thin blue smoke off the yard below"*), the ride `litter`,
`birdsong` — and every room's `details` are static.

**The stand row** `hanging-wood/thing/stand.yaml`: `standId: hanging-wood`,
`standName: the Hanging Wood`, `extent: /world/rejection/hanging-wood`,
`mix`: oak `{standing: 24, capacity: 30, incrementPerYear: 1, seedPath: acorn, woodMaterialPath: wood/oak}`,
ash `{standing: 12, capacity: 16, incrementPerYear: 1, seedPath: ash-key, woodMaterialPath: wood/ash}`.
Thirty-six standards; one player fells the lot in thirty-six engaged
acts (≈ 1½ real minutes of cutting plus walking); the increment brings
back two trees a game year (a month, real) against a smelter that would
like a set a shift. *Running out is correct.*

**Biome** `base-library/content/stuff/idea/biome/outdoor/woodland.yaml`
— `class: /platform/idea/SkyExposedBiome` (rain reaches the panels; a
canopy that delays it is the light tail's), `_extendsBiomePath: …/outdoor/baseline`,
`_defaultHumidity: { value: 70, unit: "%" }`, `_defaultWind: { value: 2, unit: "m/s" }`,
`_ambientSoundMml: "<markup>birdsong close overhead, and a wood pigeon somewhere further off</markup>"`,
`_ambientSmellMml: "<markup>leaf litter and wet bark</markup>"`.

**Title** in `rejection/pack.yaml`:
`{ extent: /world/rejection/hanging-wood, parentParcel: /world/rejection, holder: { group: rejection }, landUse: agricultural }`.
⚠ **Not `wild`**, and this is a deliberate deviation from the task
brief's `landUse: wild`: `LandUse.ts` says `wild` admits **no**
cultivation, and `PlantController.ts:104–150` refuses `plant` on any
`fixedGround` bed in a covered parcel whose use forbids it — so a `wild`
wood makes AC 6 (*a player can plant a standard*) unreachable, silently,
at the binder's successor. Among the closed six (rejection's own
manifest: *"No seventh land use"*), `agricultural` — *"cultivation at
scale, livestock and orchards"* — is the honest word for a worked
common: a coppice with standards is silviculture, ISCED `0821` sits
under `08 Agriculture, forestry, fisheries`, and a medieval common was
managed ground, not wilderness. The **holder** stays the settlement's
group — *common land* is who holds it, not which use it admits. The
`residential` `bed` ceiling was the alternative and it is false of a
wood. Flagged for the user in § Risks & opens.

The fuel-yard prose gains one line: *"Above the yard the hill goes up
into trees — the Hanging Wood, which is where all of this comes from."*

### D14 — daylight is authored, per room, against the room's own cell

`lux = lm / cellSize²`. For Rejection's 10 m cells: dim ≥ 500 lm, lit
≥ 2000, bright ≥ 6000; direct sun 8000 (light.md's own table). For the
Kestrel road's 20 m cells the same bands need ×4.

| room(s) | lm | band | why |
|---|---|---|---|
| pithead-yard, claims-office *(open front)*, hillside, fuel-yard, smelter *(open-sided)*, assay-shed *(a shed, open door)*, old-workings | 8000 | bright | open hill under the sun |
| the-dry, provisioning | 2500 | lit | interiors with a door open and a lamp |
| adit | 800 | dim | the portal — daylight reaching in |
| fringe-claim, far-fringe | 8000 | bright | open fell |
| Kestrel road ×5 | 24000 | bright | 60 lux over a 400 m² cell — an open mountain road at noon; the shipped 600 read very-dim |
| the Ferrow (8 rooms), hush, gallery | *unchanged* | pitch-black | underground; the glowcap and a lamp light them, as designed |
| treeline / ride / clearings | 5000 / 1500 / 3500 | lit / dim / lit | the wood is dimmer than the hill and its clearings brighter than its rides (requirements § The wood is lit) |

`ambientColorTemperature: 5800` on every outdoor row (the Kestrel
road's own value); `3200` on the two lamp-lit interiors. **Night is not
modelled**: `AmbientLit` is a constant and light.md L686 says the
outdoor computation is out of scope — the authored value is the day
value, and AC 1's *"at every hour"* is satisfied because every hour is
this one. Stated in `forestry.md` and in the drive record so nobody
reads the wood as *"dark at night"* and files a bug.

### D15 — reading the stand is `look`; `analyze wood` is deferred

`look` in a wood room lists *the standing timber*; `look trees` (any
keyword on the fixture) renders the authored line plus D2's derived
reading — species, count in words, age (*old, planted by nobody alive*
for the founding mix; *a sapling, planted by X on day N* for
plantings). That satisfies AC 2 and the drive's step 6 with **one**
mechanism. The `analyze wood` stanza on the platform `analyze.yaml`
(the `analyze ground` shape — a numbers card with the increment and the
year the wood fails) is deferred to the slate: it is a second read of
the same record, and the pedagogy lens's *"a player who reads the stand
can predict the year the wood fails"* is already possible from the
words (twenty-four standing, one a year back — the arithmetic is the
player's, which is the lesson).

### D16 — the tools carry their epoch on `ToolMixin`, and its reader is the covenant's

`lib/craft/Tooled.ts` `ToolMixin` gains `epoch: string = ''` (persistent
+ authorable; getter `getEpoch()`), and the felling-axe and billhook
rows author `epoch: medieval`. **What composing it claims:** every tool
has an epoch — true (a flint knife, a chainsaw; `''` = unstated).
Rejected: a tag (tools have no tag vocabulary; a material tag is the
wrong host — steel is not medieval); an entry on `CapabilitySpec`
(closed, validated, and an epoch is the tool's, not a capability's).
`lint:unconsumed-seams` does not count `lib/` mixin fields
(`check-unconsumed-seams.ts:69–73`), so the gate passes structurally —
but the field is **knowingly unread in this build**; its first reader is
the land-use covenant's predicate over the bound instrument. Recorded in
§ Risks & opens so the sweep does not read it as drift. No in-world
reader is invented to launder it: a player cannot perceive an epoch.

### D17 — one Discipline, `silviculture`, credited by three acts

`trade-forestry/content/trade/forestry/idea/Discipline/silviculture.yaml`
— `key: silviculture`, `channel: skill`, `label: Silviculture`,
`iscedf: "0821"`, `specializes: [agriculture]` (the horticulture
precedent; `agriculture.yaml` ships in the platform pack), `requires: []`,
a description in the mining row's voice (*rotation, the increment,
species by site; improves by doing, and the wood is a slow marker*).
Credited by `fell` (`standard`), by `harvest` of a plant whose
`discipline` says so (`easy` — the polycarp rule), by `plant` of a
standard (`trivial`). Difficulty is read off the world where there is a
world to read (the polycarp/annual distinction), never off the verb.

### D18 — the charcoal arithmetic, stated in the panel rows

Per burn: the recipe charges 8 lengths; at the clamp's authored
`yieldRatio: 0.35` and a draught of 0.45 (`efficiency = 1 − 0.4 × 0.0625 = 0.975`),
`yieldFor(8) = floor(8 × 0.35 × 0.975) = floor(2.73) = 2` baskets — one
smelt (a smelt wants ≥ 2). A panel gives 6 stools × 8 lengths = 48
lengths a game year = 6 burns = 12 baskets = **6 smelts per panel per
game year** (30 real days), and a burn is three game days. Three panels
(the yard's and the wood's two) → 18 smelts a year realm-wide. Stated
verbatim in each panel row's header, with the sentence *"this is not a
number to raise when somebody runs out"*, and asserted by
`coppice.test.ts` (which computes it from the clamp row's `yieldRatio`,
the recipe's count and the stool's `fruitSetCount`, so a change to any
of the three moves the test).

### D19 — the drive is a wire file; the second instance is a collection test

`packages/wire/tests/forestry.dirty.wire.test.ts` walks the
requirements' drive 1–13 (§ Test & gate strategy has the step map).
Step 14 (*a second stand row for a second locality installs with no
code*) is `trade-forestry/src/__tests__/second-stand.test.ts`: under
`test-bootstrap`, clone a `Stand` from an in-test template row with a
different `standId` and `mix`, run `postRegister` against the registry
(the register transport under `test-bootstrap`'s document store or a
mocked `DocumentApi` — follow `trade-ranching`'s registry tests), and
assert a second record filed, the first untouched, and `peek` answering
both. No scratch pack: the property being proved is *a row and a class
the pack already ships*, which a unit test states more cheaply than a
boot.

### D20 — docs

`docs/subsystems/forestry.md` (new): the stand (record, memo, derive on
read, the cut, the increment from zero), `fell`, the panel (persistable
singleton, ready-on-boot authoring, the ready line), coppice with
standards (the slot arithmetic, the deed written by the ground), the
wood vocabulary table with its numbers, the charcoal arithmetic, the
daylight rule and *no night*, the second-instance recipe (a Locality
authors clearings + one stand row + panels; zero code). Edits:
`smallholding.md:56–66` (the panel paragraph rewritten: grown plants ARE
authored — the field list from D9 — and the pointer to forestry.md);
`husbandry.md` (the two new Growing fields under *The verb surface* and
*Advancement*); `ranching.md` (one line: the stand is the pattern's
fourth consumer, → forestry.md); `mining.md:200–203` (timber now has a
source — one sentence); `content-packs.md` (the pack count and one line
in the shipped-packs paragraph); `antipatterns.md:4397–4435` (paths
re-pointed, the two *"does NOT fix"* items marked closed → forestry.md);
`light.md` — nothing (no model changed; the authored-value rule is
already its doctrine). `CLAUDE.md`'s map line and the slates README are
**swept**, not edited here.

### D21 — wave order

Kernel first (W0) because W2's rows author fields W0 declares; the pack
and the vocabulary (W1) before the moves (W2) because moved rows point
at forestry species and materials; the stand and `fell` (W3) before
planting (W4) because the deed writes to the register; the wood (W5)
last among content because it props everything above; the drive (W6)
last because it consumes the lot. Each wave lands green on
`pnpm test:near` + every touched pack's vitest + `lint:family`, and each
ends at a commit.

### D22 — what is deliberately NOT built, and where each goes

The kernel population record (herd · hive · wild · stand) → the
RGO-unification build; the seeded stand field from the address → the
same; `analyze wood` → forestry-slate; sawing/boards/seasoning →
`trade-sawing`; foraging → discovery; the engaged-act base unification →
a kernel tail; partial yield for an early cut → forestry-slate; night →
the light tail. § Deferred seams has the pointers.

---

## ⭐⭐ Host placement

| what | host | what composing it claims | why not the alternatives |
|---|---|---|---|
| `stand` document kind | kernel `lib/document/DocumentKinds.ts` | the platform knows a fourth runtime-written record kind; nothing composes it | a pack cannot declare a kind (`DocumentLogic.ts:372`); this is the one named kernel list edit |
| `StandRegistry` (`RegistrarMixin(Idea)`) | `trade-forestry/src/idea/` | the forestry trade keeps its own book under `/trade/forestry/stands`; a registry, not a cache (plus a warmed sync memo, D1) | not the kernel (a pack's namespace hardcoded in the engine — the `saveHerd` lesson); not on the zone (a pack cannot add a field to a kernel class) |
| `Stand` fixture (`PostRegistrationMixin(DetailedMixin(Thing))`) | `trade-forestry/src/thing/`; the ROW is Rejection's | a Thing in a room that files and reads a record and affords `fell`; N clones of one row | not persistable (N clones, one scope); not `FixtureMixin` (no `seatIn` use); not `Cultivable` (planting lives in the panel — a stand is a reading, not a bed) |
| `Panel` (`PersistableMixin(SingletonMixin(PostRegistrationMixin(GardenBed)))`) | `trade-forestry/src/thing/`; ROWS are venue content (the yard's in `rejection`, the wood's in `rejection`) | every panel is a bed, a persistence host, and one-per-row | not `GardenBed` in place (a full panel every boot — AC 8); not a room-level host (`lint:locations`' roster is enumerated; nobody furnishes a fuel yard) |
| `standId` | `Panel` | a panel may belong to a stand (`''` = it does not) | not on `GardenBed` (a kernel bed knows no stand); not on the room |
| planting deed hook | `Panel.occupy` | the ground that receives a standard records who planted it | not `PlantController` (kernel must not learn forestry); not the `Stand` fixture (a slot arrival is the panel's event) |
| `harvestTool` | `GrowingMixin` (kernel) | **every growing thing can say what cuts it**; `''` = hands | not on `harvest.yaml`/the controller (a species table in the kernel); not a pack mixin on `Plant` (a pack cannot add to a kernel class) |
| `discipline` | `GrowingMixin` (kernel) | every growing thing can say which Discipline its keeping exercises; default `horticulture` | the same |
| `standardMaterialPath` | `Plant` (kernel class) | a plant may name the wood a felled one is made of; `null` = not a standard | not on `GrowingMixin` (a felled thing is a Plant-shaped question — `seedTemplatePath`'s host) |
| `tool` arg | `harvest.yaml` (kernel view) | the cut may name its instrument | the instrument-is-an-argument rule |
| `epoch` | `ToolMixin` (kernel) | every tool has an epoch (`''` = unstated) | not a tag (no tool tag vocabulary); not on `CapabilitySpec` (closed, and per-capability is wrong) |
| `felling` capability | the felling-axe **row** | a felling axe fells; a billhook does not | not `cutting` (a knife would fell an oak) |
| `fell` view + `FellController extends ManualBuildController` | `trade-forestry/content/…/cmd/forestry/` + `src/idea/cmd/forestry/` | the trade's act, on the kernel's engaged-act base | not a `ForestryActController` copy (the seam is the kernel base that already exists); not a stanza (it is a verb, not a channel) |
| `timber`, `log`, `cordwood`, seeds, `hazel-stool`, tools, recipes, `silviculture` | `trade-forestry/content/` | the producer trade owns its products, its stool, its instruments and its Discipline | not `trade-fuel` (a customer); not `rejection` (a second wood grows the same hazel) |
| the seven wood materials + the species | `base-library` (materials) · `trade-forestry` (species) | what things are; what grows | the oak/charcoal precedents (`MaterialCatalogue` warms by infix over every root) |
| the wood: zone, rooms, stand row, panel rows, biome, title, the hillside exit | `rejection` (rows) · `base-library` (biome) | the venue = expression; the pack keeps its property of shipping no code | the second-instance test passing on the first instance |
| `ambientIntensity` on 17 rows | `rejection` | each room says its daylight | not the biome (a biome is not a light source in this model — light.md L686); not a zone field (rooms already carry it) |

**The narrowing test, applied.** `fell` narrows its *target* (a stool is
not a standard) and its *instrument* (`felling`) — both are the shore
shape (a broad binder gate, a capability in the controller), neither
re-narrows a host set. `harvestTool` is read by the one verb that cuts,
on every plant, and a plant that authors none skips the branch. No
guard anywhere asks *"is this the kind of thing that can be X"* after a
mixin already said so.

---

## Convention conformance

- **`props:` / `cast:`** — every placement below uses `props:`;
  `populates:` appears nowhere.
- **Locations, not rooms** — the wood's four are
  `/platform/location/SingletonCartesianLocation` (`lint:locations`'
  default); no `FurnishableRoom`; every one has `coords` in a
  `CartesianZone` with `cellSize` (every location plots).
- **The five axes / `<root>/<branch>/`** — `/trade/forestry/{thing,idea}/…`,
  `/trade/forestry/idea/cmd/forestry/FellController` (a controller is an
  Idea at `idea/cmd/<category>/`), the view at
  `content/trade/forestry/cmd/forestry/fell.yaml` (a `cmd` dir is views
  unless its parent is `idea`), documents at `/trade/forestry/stands/…`;
  materials at `/stuff/idea/material/wood/…` (commons); the wood at
  `/world/rejection/hanging-wood/…`. `forestry` is a new command
  **category** (CLAUDE.md lists the categories; the sweep adds the
  word — like `mining` and `fuel` before it).
- **Module categories** — the pack ships `src/{idea,thing}` + tests;
  no Api, no logic singleton, no free helper (`fellStandard` and
  `fellPlanted` are module-private functions inside the controller
  module — the `HewController`/`CharController` shape, not exported).
  A pack `lib/` is not needed (no mixin).
- **Module scope declares** — the memo is an instance field on the
  registry; constants are `const`.
- **Import boundary** — pack code imports the kernel only by
  `@saxonberg/server/mud/...` specifiers (`lib/*`, `api/*`,
  `platform/thing/*`, `platform/idea/*`) — `GardenBed`, `Thing`,
  `Idea`, `ManualBuildController`, `Registrar`, the Apis; nothing from
  another pack's `src/`. `lint:imports` + `lint:boundary`.
- **Verbs on objects** — `registry.cut()`, `panel.occupy()`,
  `plant.getHarvestTool()`, `tool.hasCapability()`; no `XApi.verb(host)`.
- **`_mixinName`** — no new mixin. `Mixins` unchanged.
- **Member privacy** — TS modifiers in `lib/`/pack code; the registry's
  memo is `private` (a Stuff instance field behind the proxy — never
  `#`).
- **Persona keys** — `planter: author.getIdentityPath()`, never
  `getTemplatePath()`.
- **Gates this build must pass**: `lint:family` in full; the ones its
  changes meet by name — `verb-collisions`, `arg-kinds`, `binder-models`,
  `census`, `untitled`, `perishable`, `instanceable`, `locations`,
  `schema` (the `documents.yaml` prose lists kinds — add `stand`),
  `imports`, `boundary`, `module-scope`, `mixin-names`,
  `unconsumed-seams` (ceiling; unchanged), `test-bootstrap` (every new
  test that touches the wired runtime imports it), `test-content`,
  `dossiers` (no cast changes), `world-scan` (no `world:` scans — the
  registry lists its own prefix).

---

## Waves

### W0 — the kernel seams

**Goal.** Everything a forestry row needs to say that the kernel cannot
hear today. Implements D1 (the kind), D7, D16.

**Files.**
- `packages/server/src/mud/lib/document/DocumentKinds.ts` — the `stand`
  entry, herd-shaped comment.
- `packages/server/src/schema/documents.yaml` — the kinds prose (L11,
  L43) names `stand`; `pnpm gen:schema` if the tables change (they
  should not — kinds are not collections); `pnpm lint:schema`.
- `packages/server/src/mud/lib/husbandry/Growing.ts` — `harvestTool`,
  `discipline` (fieldMeta, fields, getters/setters, the `Growing`
  interface).
- `packages/server/src/mud/platform/thing/Plant.ts` — `standardMaterialPath`.
- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — `tool?` on the model; `toolFor`; the `needs-tool` refusal before the
  ripeness check; `discipline: plant.getDiscipline()`.
- `packages/server/src/mud/platform/idea/cmd/inventory/PlantController.ts`
  — `discipline: plant.getDiscipline()`.
- `packages/content/platform/content/platform/cmd/inventory/harvest.yaml`
  — the `tool` arg (+ help text: *with a billhook*).
- `packages/server/src/mud/lib/craft/Tooled.ts` — `epoch`.
- Tests beside each: `Growing.test.ts` (fields hydrate + default),
  `HarvestController.test.ts` (a plant with `harvestTool: cutting` and
  no tool held refuses `needs-tool`; with a held `cutting` tool
  harvests; a plant with none is unchanged; the credit reads the
  plant's discipline), `PlantController.test.ts` (credit), an arg-gate
  test (`harvest.yaml`'s `tool` requires `ToolMixin`, which `ToolItem`
  composes — the `verb-gates.test.ts` shape), `Tooled.test.ts` (epoch
  hydrates).

**Acceptance.** `pnpm test:near` green; `lint:family` green
(`binder-models` sees `tool?` on `HarvestModel`; `schema` sees the
prose). No row anywhere changes behaviour (no plant authors the fields
yet).

**Commit.** `build(forestry W0): the kernel seams — a stand document kind, the plant names its tool and its Discipline, the tool its epoch`

### W1 — the pack, the woods and their species

**Goal.** `trade-forestry` exists and installs empty of acts; the realm
speaks eight woods. Implements D10 (the scaffold), D11, D12.

**Files.**
- `packages/content/trade-forestry/{pack.yaml, package.json, tsconfig.json, vitest.config.ts, README.md}`
  — copied from `trade-fuel`'s and edited: `id: trade-forestry`,
  `root: /trade/forestry`, `requires.groups: [{name: forestry, purpose: the forestry trade's own body, owner: {office: prime-minister}}]`,
  `requires.title: [{extent: /trade/forestry, holder: {group: forestry}}]`;
  `package.json` name `@saxonberg/content-trade-forestry`, the fuel
  pack's five dependencies.
- Root `package.json` — the dependency line. **`pnpm install`.**
- `packages/content/trade-forestry/content/trade/forestry/idea/StandRegistry.yaml`
  (`class:` only) and `src/idea/StandRegistry.ts` (D1 — the registry
  lands here so the pack has a class and `lint:instanceable` sees the
  row; `Stand` and `fell` are W3).
- Seven material rows (D11) in `base-library`; oak's `biologicalSource`
  + comment.
- Eight species rows (D12) in `trade-forestry`; the hazel row **moved**
  from `trade-fuel` (same path) with its rotation paragraph retired.
- `trade-forestry/src/__tests__/wood-vocabulary.test.ts` (D11);
  `stand-registry.test.ts` (file / read / derive / cut-to-empty /
  increment-from-zero / `peek` after `read` / the prefix re-check
  refuses a forged path — the `HerdRegistry` tests' shape).

**Acceptance.** Boot with the pack installed: `pack status` lists
`trade-forestry`; the eight species and eight materials warm (`analyze`
nothing yet — a test asserts `MaterialCatalogue` resolves
`…/wood/hazel`); the garden bed's `pine` resolves; the fuel pack's
`burn.test.ts` still passes (the species path did not change).
`lint:untitled` green (the `/trade/forestry` claim covers the rows).

**Commit.** `build(forestry W1): the trade-forestry pack, the stand register, and eight woods with their species`

### W2 — the rows move; the panel becomes a Panel; the stool is ready

**Goal.** The producer owns its products, its stool and its tools; the
yard's panel persists and is cuttable on a fresh boot. Implements D5,
D8, D9, D10 (the moves). **Drop the dev DB after.**

**Files.**
- `trade-forestry/src/thing/Panel.ts` (D5) + `Panel.test.ts` (the
  composition reaches `PersistableMixin`, `SingletonMixin`,
  `CultivableMixin`; the ready line; **a materialize round-trip**: seat
  six stools, harvest one, `PersistableApi.capture(panel)`, clone a
  fresh shell, `materialize`, assert the harvested stool comes back
  with `_fruitFill` at 0 and the others at 1 — the AC 8 proof at unit
  scale).
- Moves (D10): `cordwood.yaml` (→ `Crop`, hazel), `hazel-stool.yaml`
  (D9's fields), `felling-axe.yaml` (`felling` capability, `epoch`),
  `billhook.yaml` (`epoch`), the two recipes (`outputTemplate`
  re-pointed); delete `trade-fuel/content/trade/fuel/thing/coppice-panel.yaml`.
- `rejection/content/world/rejection/thing/fuel-yard-panel.yaml` (D5,
  `standId: ''`, capacity 8, D18's header) and `fuel-yard.yaml` props
  (`/world/rejection/thing/fuel-yard-panel`, `/trade/forestry/thing/{billhook,felling-axe}`)
  + the one prose line (D13).
- `rejection/package.json` — the forestry dependency.
- `trade-fuel/src/__tests__/burn.test.ts` — the coppice block moves to
  `trade-forestry/src/__tests__/coppice.test.ts` (D9 numbers, D18
  arithmetic, the stool's tool + discipline, cordwood is `Crop` and
  hazel); `trade-fuel/README.md` L3–8.
- `trade-mining/src/__tests__/archetype-and-ladder.test.ts:154–159`.
- `packages/wire/tests/{metallurgy,metal-chain}.dirty.wire.test.ts` —
  `packs:` + `'trade-forestry'`.
- `pnpm --filter @saxonberg/server reset:db`; boot; **`look panel` in
  the fuel yard reads *ready to cut*; `harvest panel with billhook`
  yields eight lengths of hazel; restart; `look panel` reads
  *regrowing*.**

**Acceptance.** Both metal wire files still pass (they burn the yard's
cordwood — now hazel, now from forestry); `lint:census` resolves every
moved path; `lint:verb-collisions` unchanged; `lint:perishable` green.

**Commit.** `build(forestry W2): cordwood, the stool, the axe and the billhook move to forestry; the panel persists and is ready on a fresh boot`

### W3 — the stand, and `fell`

**Goal.** A stand can be read and cut down to nothing. Implements D1
(the fixture side), D2, D3, D4, D17.

**Files.**
- `trade-forestry/src/thing/Stand.ts` (D2) + `Stand.test.ts` (files
  iff absent; reads otherwise; the augmenter's lines for a founding
  mix, a planting, an empty stand; keywords).
- `trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`,
  `content/trade/forestry/idea/cmd/forestry/FellController.yaml`,
  `src/idea/cmd/forestry/FellController.ts` (D3) + `FellController.test.ts`
  (refusals `no-stand`, `no-axe`, `wrong-tool`, `stand-empty`,
  `not-a-standard`; a cut mints 2 timber + 4 logs + 1 seed with the
  species' material and draws the record down by one; the completion
  survives a destroyed giver; the credit) and an arg-gate test
  (`fell.yaml`'s `target` requires `GrowingMixin` — `Plant` composes it;
  `axe` requires `ToolMixin` — `ToolItem` composes it).
- Rows: `thing/timber.yaml`, `thing/log.yaml`, `thing/seed/{acorn,ash-key}.yaml`
  (D4), `idea/Discipline/silviculture.yaml` (D17).
- A temporary in-test stand row only; the Hanging Wood's row is W5.

**Acceptance.** Under `test-bootstrap`, a room propping a Stand: `fell`
is in the afforded verbs; `fell` → 30 game-s → products; twenty-four
cuts later `fell oak` refuses in words about the wood; the log lights
(`Firewood` over `wood/oak` — `ignite` in a unit test); the timber
matches `timber-set` (`CraftingApi` match test over the recipe).

**Commit.** `build(forestry W3): the stand is a filed record you can read and cut to nothing; fell`

### W4 — planting a standard

**Goal.** A player plants an acorn in a panel; the record and the
chronicle say so; a mature planted tree can be felled. Implements D6,
the rest of D7.

**Files.**
- `trade-forestry/content/trade/forestry/thing/plant/{oak-standard,ash-standard}.yaml`
  (D6).
- `Panel.ts` — the `occupy` hook (D6); `Panel.test.ts` gains: a real
  arrival with an acting author records a planting on the register and
  one chronicle deed keyed on the plant; a **reseat** records nothing; a
  stool arrival records nothing; `standId: ''` records the deed and no
  planting.
- `FellController.ts` — `fellPlanted` (D3); test: a mature
  `oak-standard` in a panel is felled to the same products; an
  `established` one refuses *"not yet a tree worth felling"*
  (`not-mature`); a stool refuses `not-a-standard`.
- `Stand.test.ts` gains the planting line.

**Acceptance.** `plant acorn in panel` (kernel verb, unchanged) seats an
`oak-standard` whose `daysToStage.mature` is 5400; `look trees` names
the planter and the game day; `chronicle` (the shipped verb) shows the
deed with tags `forestry, planting`; the credit is `silviculture`.

**Commit.** `build(forestry W4): planting a standard — the kernel plant into a panel, the deed written by the ground`

### W5 — the Hanging Wood, and daylight over Rejection

**Goal.** The wood exists, is lit, is titled, and props everything
above; Rejection's rooms stop reading *"something"*. Implements D13,
D14.

**Files.**
- `rejection/content/world/rejection/hanging-wood.yaml` (zone);
  `hanging-wood/{treeline,ride,oak-clearing,hazel-cant}.yaml`;
  `hanging-wood/thing/{stand,panel-north,panel-west}.yaml`;
  `location/hillside.yaml` (the `north` exit); `pack.yaml` (the title
  entry, `agricultural`).
- `base-library/content/stuff/idea/biome/outdoor/woodland.yaml`.
- `ambientIntensity` + `ambientColorTemperature` on the 12 `location/*.yaml`
  rows per D14's table and on the five `kestrel-road/*.yaml` rows.
- `rejection`'s own test dir does not exist (no `src/`); the wood's
  content invariants go in `trade-forestry/src/__tests__/hanging-wood.test.ts`
  (reads the rejection rows by relative path, the `burn.test.ts`
  cross-pack precedent): every wood room props the stand row; every
  `exits.*.destination` resolves; every room has `coords` and
  `ambientIntensity ≥ 500`; every Rejection surface room's ambient
  clears `dim` at `cellSize 10` and every Kestrel room clears `bright`
  at 20; no two wood rooms share coords; the title entry exists and is
  `agricultural`; the stand row's `mix[].speciesPath` and
  `woodMaterialPath` and `seedPath` resolve.

**Acceptance.** Boot on a fresh DB; walk `pithead → north → north →
north`: the treeline; `look` lists *the standing timber*, the room reads
`lit`; `look` in the fuel yard names every object. `lint:census`,
`lint:untitled`, `lint:locations` green.

**Commit.** `build(forestry W5): the Hanging Wood above Rejection — four clearings, one stand, two cants, and daylight on every room`

### W6 — the drive, and the docs

**Goal.** The requirements' drive runs over the wire and keeps running;
the knowledge lands in the subsystem docs. Implements D19, D20.

**Files.**
- `packages/wire/tests/forestry.dirty.wire.test.ts` (§ Test & gate
  strategy).
- `docs/subsystems/forestry.md` (new); edits to `smallholding.md`,
  `husbandry.md`, `ranching.md`, `mining.md`, `content-packs.md`,
  `antipatterns.md` (D20).
- This plan's § Drive record.

**Acceptance.** `pnpm wire` green with the forestry file in the run
report; then **`pnpm test` once** (the pre-MR moment); push; open the
MR.

**Commit.** `build(forestry W6): the wire drive, and forestry.md` then
`drive(forestry): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the stand record | none (a record) | — | the `stand` kind in `DocumentKinds` (W0); the registry row `/trade/forestry/idea/StandRegistry`; the `/trade/forestry` title claim (else `saveToRegister` throws on owner) | the registry is minted by the first `Stand.postRegister` through `StuffApi.singleton` — nothing warms it earlier, and nothing needs to (every fixture warms the memo) | — |
| reading the stand | `look` (platform) | the fixture is in the room's contents; its keywords | the venue stand row's `mix` | each fixture `postRegister` awaits `read(standId)` — a cold memo renders the authored line and nothing else; the W5 test asserts the derived line is present after boot | — |
| `fell` a standard | `trade/forestry/cmd/forestry/fell.yaml` | `Stand.commandContributions` (environment + peers) and `Panel.commandContributions` (peers) — **a class static; a row's `commandContributions:` is dead silently** | the `FellController.yaml` registration row; the felling-axe row's `felling` capability; the `timber`/`log`/seed rows; the stand row's `woodMaterialPath` + `seedPath` | the pack in the root manifest + `pnpm install`; the DB dropped after W2 | `target` requires `GrowingMixin` (a `Plant` composes it; the fixture is filtered out at scan and the word falls through as `raw`); `axe` requires `ToolMixin` (`ToolItem` composes it). The arg-gate test in W3 pins both |
| `fell` a planted standard | same view | same | the `oak-standard` row (`harvestTemplatePath: null`, `discipline: silviculture`, `standardMaterialPath`) | — | the plant binds to `target` |
| the coppice cut | `harvest`/`pick` (platform) | `CultivableMixin.commandContributions.peers` — inherited by `GardenBed`, **re-declared on `Panel`** (an own static shadows the composed list) | the stool row's `harvestTool: cutting` + `discipline` + D9's ready fields; the billhook row's `cutting`; `cordwood` (`Crop`, hazel) | the panel row is minted through `singleton()` because `Panel` composes `SingletonMixin` — restore-or-seed; a `Panel` that lost `SingletonMixin` would clone fresh every boot and the W2 round-trip test would not see it (it materializes by hand) — the W6 drive's step 13 is the only witness | `harvest.yaml`'s `tool` requires `ToolMixin`; `target` requires `GrowingMixin|CultivableMixin` (unchanged; a `Panel` composes `CultivableMixin`) |
| planting a standard | `plant`/`sow` (platform, unchanged) | Cultivable's `plant.yaml` via `Panel`'s static | the acorn row (`growsIntoPath`); the panel's free slots (capacity 8, six seated); soil in the panel (`interiorBulk` + reserves as the yard's); **the title's `landUse` admitting cultivation (D13)** | the register + memo as above | `seed` requires `PlantableMixin` (`Seed` composes it); `pot` requires `CultivableMixin` (`Panel` does) — **not widened** |
| the deed | none (a side effect of `occupy`) | — | `Panel.standId`; an acting author in the frame | the chronicle is a no-op when Mongo is not connected (`Persona.ts:41–44`) — the unit test asserts the call, the drive asserts the row | — |
| `silviculture` credit | — | — | the Discipline row (warmed by class from any root) | `DisciplineCatalogue` warms by `Template.findByClass` — confirm `help silviculture` after a fresh boot | — |
| the wood | `north` at the hillside | the exit pair (hillside ↔ treeline) | the zone row (`cellSize`, `address`); every room's `coords`; the biome row | the `rejection` pack depends on `trade-forestry` so the class-source table has `/trade/forestry` registered before the wood's rows resolve `class:` | — |
| daylight | `look` | — | `ambientIntensity` on each row | none | — |
| the second instance | — | — | a Locality's clearings + one `Stand` row + panel rows | the same `postRegister` path | — |

⚠ The five silent failures to check by hand after W5: `fell` appears in
`commands` while standing on the ride; `look trees` shows the derived
line (the memo warmed); `harvest panel` in the hazel cant is afforded
(the Panel's own static carries the four views); `plant acorn in panel`
is not refused by the land-use gate; `restart` → the yard panel reads
*regrowing* and not *ready*.

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 walk in and back; every object named at every hour | W5 (the exit pair; D14's ambient on every surface room; no night) |
| 2 read the stand: species, how much, how old, who planted | W3 (D2's augmenter) + W4 (the planting line) |
| 3 fell with the axe → timber + logs of the stand's wood; the stand reads smaller | W3 (D3, D4) |
| 4 cut any panel with the billhook → hazel cordwood; ready again one game year later; less if sooner | W2 (D7, D8, D9) + W5 (the wood's panels). ⚠ *less if sooner* is read as *refused until ripe, graded by the cycle* — § Risks |
| 5 the timber set from that timber; the clamp chars that cordwood; a hearth burns that log | W3 (the `wood` tag; `Firewood`) + W2 (cordwood `Crop`) — asserted in W3's unit tests and the drive's steps 4, 8, 9 |
| 6 plant a standard; the record carries the name; mature in fifteen game years | W4 (D6; `daysToStage.mature: 5400` stated) |
| 7 felled to empty, in words about the wood; refilled only by increment + planting; rooms and prose unchanged | W3 (D1's derive-from-zero, D3's `stand-empty`) — the rooms are rows and never change |
| 8 survives a restart | W2 (D5's persistable singleton panel; the plants' keyed records) + W3 (the record is a document) + the drive's step 13 |
| 9 a second locality with a stand row and clearings is a wood with no code | D19's `second-stand.test.ts` + the fact that W5 ships no code |
| 10 the charcoal rate is a stated number in the panel row, smaller than a smelter wants | W2 (D18: 6 smelts per panel-year, in the row's header, asserted) |
| 11 eight distinct materials + species naming each other; cordwood hazel; nothing names a wood that does not exist | W1 (D11, D12, `wood-vocabulary.test.ts`) + W2 |
| 12 silviculture in the transcript after fell / cut / plant | W3 + W2 + W4 (D17) |

Nothing unmapped.

---

## Test & gate strategy

**Unit / collection (beside the code, `test-bootstrap` where the wired
runtime is touched):** W0's five; `stand-registry.test.ts`;
`wood-vocabulary.test.ts`; `Panel.test.ts` (incl. the materialize
round-trip); `coppice.test.ts` (moved + D18); `Stand.test.ts`;
`FellController.test.ts` + the two arg-gate tests; `second-stand.test.ts`;
`hanging-wood.test.ts`. ⚠ A pack with `src/` and no tests fails the root
suite (project memory) — `trade-forestry` ships tests from W1.

**The wire drive** `forestry.dirty.wire.test.ts` — `DIRTY_REASON`:
*"cuts the yard's and the wood's panels (a game-year rotation nothing
resets), fells the Hanging Wood's standards (a record only the increment
refills), plants a standard (a chronicle deed), and burns cordwood"*;
`packs: ['trade-forestry', 'trade-fuel', 'trade-mining', 'trade-smelting', 'generic-objects', 'base-library', 'rejection', 'terminus']`.
Steps, each an `it`:

1. `look` in the fuel yard: no `something`; the prose mentions the wood.
2. `look panel`: *ready to cut*, six stools, mature.
3. `get billhook`; `harvest panel with billhook`: eight cordwood, each
   `queryOne` material `…/wood/hazel`; `look panel`: *regrowing … about
   three hundred and sixty days*.
4. `put cordwood in clamp` ×8; `char`: the engagement starts (the burn's
   three game days are not waited for — the metallurgy file's `char`
   assertion shape).
5. `northeast`, `north`: the treeline; `look` — lit band, named objects,
   the smoke detail.
6. `look trees`: oak twenty-four, ash twelve, *planted by nobody alive*.
7. `get axe` (back in the yard first, or the drive carries it up);
   `fell oak with axe`; `awaitActivity`; timber ×2 in hand made of oak,
   an acorn, logs on the floor; `look trees`: twenty-three.
8. Carry the timber down; `make timber set` at the provisioning shed's
   bench (the shipped recipe; the tool with `cutting` is the billhook in
   hand); `queryOne` the set's material = oak; `shore` in the timbered
   drift (`metal-chain`'s `DRIFT` path) — `expectOk`.
9. `get log`; `ignite log` (the platform verb over `Combustible`) — a
   lit note, or *it catches*.
10. `west` from the ride: the hazel cant; `harvest panel with billhook`
    → eight more; `look panel` reads the same ready line.
11. `north` ×2 to the oak clearing; `plant acorn in panel`; `look trees`
    shows the sapling with the handle's name and the game day;
    `chronicle` shows the deed.
12. Loop `fell oak with axe` until a `command-rejected` note with
    `stand-empty`; `look trees`: *nothing stands here worth the axe*;
    `look`: the room's prose is byte-identical to step 5's clearing
    read (the rooms do not change).
13. Reboot is the harness's business — the wire runner boots ONE world
    per run; the restart assertion is the **W2 materialize round-trip
    test plus a second `Session` that opens after a `pack sync`
    round-trip is NOT available**, so step 13 is a re-login assertion in
    the same boot (the panel still reads *regrowing*; the stand still
    empty; the sapling still there) and the true restart is asserted by
    hand in the drive record with a server restart between two runs of
    steps 12→13 (`forestry.md` records the procedure). ⚠ Named in
    § Risks.
14. `second-stand.test.ts` (D19).

**Gates:** `pnpm -C packages/server lint:family` after every wave;
`pnpm test:near` + `pnpm -C packages/content/trade-forestry test` (and
`trade-fuel`, `trade-mining` in W2, `rejection` has none) between
waves; **`pnpm test` exactly once before the MR opens**, and once at
`/finalize`. Never in the background.

---

## Risks & opens

1. **`landUse: agricultural`, not `wild` (D13).** The task brief and the
   slate say `wild`; `wild` refuses `plant` on fixed ground, which
   kills AC 6. The plan chooses the honest one of the closed six and
   keeps the holder the settlement's group. **The user should see
   this.** If `wild` is wanted for the wood's *character*, the
   alternative is a seventh use (`woodland`: passage, gathering,
   silviculture) — a kernel `LandUse.ts` edit the requirements did not
   ask for and rejection's manifest says no to.
2. **AC 4's "yields less if cut sooner" is read as the shipped model
   (refuse until ripe; grade by the cycle).** A partial-yield rule
   would be a second yield mechanism for one crop. If the requirements
   mean *literally fewer lengths*, that is a `HarvestController`
   change (mint `floor(count × fruitFill)` below ripe and settle the
   cycle) — ~15 kernel lines, but it changes every polycarp in the
   game (a half-ripe cherry tree could be picked). Not taken; the user
   decides.
3. **The restart assertion cannot be a single wire test** (the harness
   boots once per run). W2's materialize round-trip is the unit proof;
   the drive record must carry a hand-run restart between two runs.
   AC 8 is otherwise unwitnessed by the suite.
4. **`Stock` is persistable but not singleton**, so a Stock counter in
   a non-persistable room does not restore — the same shape the panel
   had. Not this build's; recorded for whoever finds a shop that
   forgets its consignments after a bounce.
5. **The wood inherits `deposit:` from the region zone** by the outward
   `lookupField` walk, so `analyze ground` in the wood reports the
   Ferrow. The Kestrel road has the same property today. A wood with a
   seam under it is not wrong (the Forest of Dean); a claim cannot be
   *staked* there because blocks key on the region grid. If the user
   wants the wood to answer *no orebody*, a `deposit: null` override on
   the sub-zone is the test to run (whether the hydrator's null
   survives `lookupField`) — not assumed.
6. **`epoch` is knowingly unread (D16).** The gate passes structurally;
   the sweep should not file it as drift. Its reader is the covenant.
7. **Two panels of one row would collide** (`SingletonMixin`). Every
   panel is its own row, by construction; `hanging-wood.test.ts` asserts
   no two rooms prop the same panel path.
8. **The `discipline` field name on `GrowingMixin`** could collide with
   a future `Species.discipline`; the name is chosen for symmetry with
   `Recipe.discipline`. If the build agent finds a clash, `husbandryDiscipline`.
9. **The memo is per-process.** One server, one world — true today. A
   second process writing the same register would go stale until the
   next `read`; every act re-reads before it writes, so the worst case
   is a stale `look`.
10. **`HarvestController`'s held-first tool fallback** is a small hunt
    (the `shore` shape). If the user wants the instrument strictly
    declared, the `tool` arg becomes `required: true` for plants that
    author `harvestTool` — the binder cannot express that conditional,
    so it would be `required: true` for everyone and `harvest carrot
    with hands` is absurd. Kept optional.
11. **Kestrel road at 24000 lm** is the arithmetic, not a photometric
    truth; if the user prefers the road's zone at `cellSize: 10`, that
    is a one-line zone edit instead and the rooms take 8000. Either
    is honest; the plan changes the rows because the zone's cell size
    is a fact about road geometry the logistics build chose.
12. **The `forestry` command category** is new (CLAUDE.md enumerates
    categories); the sweep adds the word. `mining`, `fuel`, `smelting`
    were added the same way.

---

## Deferred seams

Clean attach points; each leaves as a slate line, never a plan section.

- **The kernel population record** — herd · hive · wild population ·
  stand are four registers with one shape (a record, a fixture that
  files it, derive-on-read from a stamp). The third consumer signal
  fired here; the promotion (a `lib/register/Population` value object,
  or nothing more than a shared test) → the RGO-unification build the
  land-use covenant slate names (`docs/slates/builds/` — the covenant
  slate file is not present on this branch; the sweep points at it
  when it lands, else at `forestry-slate.md`).
- **The seeded stand field from the address** (species-by-site from
  soil/aspect, the mine's `Deposit` shape) → forestry-slate. The row is
  the seed today.
- **`analyze wood`** (a numbers card: increment, capacity, the year the
  wood fails) → forestry-slate, D15.
- **The engaged-act base** — `MiningActController.engageAct` =
  `ManualBuildController.engageStep` + an endurance spend. A kernel
  `EngagedActController` (or the spend on `ManualBuildController`) →
  a tail slate; the third copy is the trigger.
- **Partial yield below ripe** → forestry-slate (Risk 2).
- **Night / time-of-day ambient** → the light tail (light.md L686).
- **Canopy as a light model; rain delayed under canopy** → the light
  tail / biome.
- **Sawing, cleaving, boards, seasoning, the water-powered saw** →
  `trade-sawing` (the requirements' non-goal, the grain chain's mill
  shape).
- **Foraging / `gather`** → discovery-slate.
- **Estovers, the woodward, the close season, the epoch predicate** →
  the land-use covenant slate.
- **The collier as a producer** (a brain that cuts and chars) →
  `trade-fuel`'s README seam, unchanged.
- **Cordwood as a stack** (`Stackable`) → bulk/stacks tail; eight
  discrete `Crop`s today, as the yard already had.
- **Planted standards joining the stand's count at maturity** — today
  a planted tree is felled as itself (`fellPlanted`) and the record
  carries it as a planting; folding a mature planting into `mix[].standing`
  (and removing the Plant) is one registry method when anyone can
  observe a maturity (450 real days) → forestry-slate.

---

## Critical files

Read first, in this order:

1. `docs/requirements/forestry-requirements.md` — the product scope.
2. This plan — § Grounding, § Plan-level decisions D1–D9, § Host
   placement.
3. `packages/content/trade-ranching/src/idea/HerdRegistry.ts` and
   `src/thing/Herdbook.ts` — the record + fixture pattern to copy.
4. `packages/server/src/mud/lib/document/DocumentKinds.ts` +
   `platform/idea/api/DocumentLogic.ts:344–376` — the kind and the
   transport's checks.
5. `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
   — the base `fell` extends; `packages/content/trade-mining/src/idea/cmd/mining/HewController.ts`
   + `ShoreController.ts` + their YAML — the act shape and the
   instrument-as-argument shape.
6. `packages/server/src/mud/lib/husbandry/Growing.ts` (fieldMeta,
   `updateFlowering`, `isHarvestable`), `Cultivable.ts` (`occupy`,
   `applyProps`, `commandContributions`), `platform/thing/{Plant,GardenBed,Crop,Seed,Firewood,ToolItem}.ts`.
7. `packages/server/src/mud/platform/idea/cmd/inventory/{HarvestController,PlantController}.ts`
   + `platform/content/platform/cmd/inventory/{harvest,plant}.yaml`.
8. `packages/server/src/mud/lib/stuff/Populates.ts:225–245` and
   `api/stuff.ts:659–700` — why `Panel` composes `SingletonMixin`.
9. `packages/content/trade-fuel/content/trade/fuel/thing/{cordwood,hazel-stool,coppice-panel}.yaml`,
   `trade-mining/content/trade/mining/thing/{felling-axe,billhook}.yaml`,
   `trade-mining/content/recipes/{felling-axe,billhook,timber-set}.yaml`
   — the rows that move.
10. `packages/content/rejection/{pack.yaml,package.json}`,
    `content/world/rejection.yaml`, `kestrel-road.yaml`,
    `kestrel-road/lower-climb.yaml`, `location/{hillside,fuel-yard}.yaml`
    — the venue's shapes.
11. `packages/content/base-library/content/stuff/idea/material/wood/oak.yaml`,
    `…/biome/outdoor/{baseline,meadow}.yaml`, the hazel species row.
12. `docs/subsystems/light.md:146–240`, `docs/subsystems/content-packs.md:100–260`,
    `docs/subsystems/document-store.md § The register transport`,
    `docs/subsystems/persistence.md § Keyed nested hosts`.
13. `packages/wire/tests/metallurgy.dirty.wire.test.ts` — the drive
    file's shape; `packages/content/trade-smithing/src/__tests__/verb-gates.test.ts`
    — the arg-gate test's shape.

## Drive record

*(appended at build time, not at plan time)*
