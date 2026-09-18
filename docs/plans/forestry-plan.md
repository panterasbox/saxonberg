# Forestry — implementation plan

Executes `docs/requirements/forestry-requirements.md`. **Kind:** feature
— one new capability pack (`trade-forestry`), a wood on Rejection's hill
(rows only, in the `rejection` pack), seven wood materials in the
commons, and a thin kernel wave beneath them. **Leads from:** content —
the two consumers of wood (the collier's clamp, the mine's timber set)
already ship and are starving; the kernel wave exists only because two
things a row cannot say today (which tool a plant is cut with and which
Discipline that exercises; a tool's epoch) are the difference between
the wood being reachable and being scenery.

Written for a fresh-context build agent. Every fact in § Grounding was
read out of the file named this cycle (2026-09-17); every decision in
§ Plan-level decisions is numbered so a wave or a commit can cite it.
The requirements doc is closed scope — where this plan deviates from a
sentence in it, the deviation is named in § Risks & opens, not absorbed.

The user's standing constraint governs every choice below: **an
authored wood is always a wood.** Nothing converts land use at runtime,
nothing simulates a tree, nothing generates a room. The one thing that
moves is the stand.

> **Revised 2026-09-17 — the stand is the ground.** The first draft
> filed the stand as a document record (a `StandRegistry` on the
> herdbook's register transport, a `stand` document kind in the kernel,
> a `Stand` fixture propped in every wood room reading a per-process
> memo). Decided by lenses 1 + 2 in conversation with the user: **roots
> go INTO the ground; a stand is a sward of trees.** A herd is a record
> filed elsewhere because a herd *moves* — its position and its
> composition are two sources on purpose; a stand does not move, so the
> place carries it, exactly as `Field` carries its sward. The stand is
> now `StandMixin` on a pack-owned persistable singleton **location**
> class, `Wood` — the `Field`/`SwardMixin` precedent — and the increment
> is scaled by the room's own soil moisture, which is the whole reason
> for the move: rain and drought reach the trees. Deleted with the
> record: the kernel `stand` kind (`DocumentKinds.ts` is untouched), the
> registry, the fixture and its row, the memo, the `/trade/forestry/stands`
> prefix, and the pack's `requires.title` claim (no register remains).
> Kept from the same day's earlier edits: the **bole** (D3/D4 — a felled
> standard drops one bole; `fell bole` cross-cuts it; a young tree is
> carried whole) and the `fell` view's polymorphic `target` with **no
> `requires:`**. The requirements' *"the wood has one stand"* becomes
> one stand per Wood room, the wood being their sum — a deviation the
> user accepted, recorded in § Risks & opens.

---

## Grounding

### The ground precedent — `Field`, `SwardMixin`, and how a place carries a standing cover

- `packages/content/trade-farming/src/location/Field.ts` — the pack-owned
  location class this plan copies. Composition (L141–150):
  `FieldGround = SoilMixin(ReservedMixin(CartesianLocation))` named as an
  intermediate *"because inference through this many nested generic
  mixin factories in one expression collapses to `never`"*, then
  `FieldBase = PersistableMixin(WarrenMemberMixin(ImprovableMixin(SwardMixin(FieldGround))))`.
  The header (L11–36): **`PersistableMixin` outermost — the host rule**
  (`cleanupOnDestruct` must fire before the inner `Container`
  evacuates); over the **permissive** `CartesianLocation` *only because
  every instance is keyed* `<holding extent>/<leaf>` — *"a keyless
  persistable over a permissive base would silently share ONE
  `holder_snapshots` scope across every field in the world"*;
  `WarrenMemberMixin` because a field lives in a holding and is on
  nobody's grid (its position is `groundSpot`, stamped at `plot` time).
  `fieldMeta` (L153–161): `fieldName`, `groundSpotX/Y`, `areaM2`,
  `legumeFraction` (authorable), `_ambientK`, `_daylightFraction`
  (runtimeState). **The two soil host hooks** (L253–286):
  `watershedScope()` returns itself (*"a field IS a place, so it is its
  own watershed scope"* — the default asks a container, right for a pot
  and wrong for ground), `soilCatchmentAreaM2()` returns `areaM2`
  (*"every square metre of it catches rain"*), `soilWaterDemandPerGameDay()`
  returns `swardTranspirationPerGameDay()` (*"what drinks this soil is
  the grass standing in it"*). `swardGrowthFactor()` (L302–340) is the
  **minimum** of `clampUnit(soilMoistureFraction() / 0.35)`,
  `clampUnit(0.25 + nutrientFraction() × 1.5)`, the cached ambient and
  the daylength — *"unauthored reserves read `null`, which means this
  ground does not model that factor and NOT that this factor is zero"*.
  `installSoilReserves(sample)` (L480–545) installs moisture (capacity
  `areaM2 × 45 L × texture factor`, half full), organic matter,
  structure and nitrogen **idempotently** (a restored field keeps its
  reserves — *"a reserve is state"*). `postRegister()` (L598–611): an
  AUTHORED field *stands itself up* — resolves the locality's seed and
  the zone's `GroundCharacter`, installs the reserves, restamps the
  season. `presentationPhrase` overrides for a holder-named field.
- `packages/content/trade-farming/src/lib/Sward.ts` — `SwardMixin`, host
  constraint **`MixinConstructor<Stuff & Reserved>`** (L198), *the
  standing grass* as a `Reserve` (`SWARD_RESERVE_KEY = 'sward'`, kg dry
  matter, theme `cultivation`). **`static commandContributions = { self: ['trade/farming/cmd/farming/mow.yaml'], inventory: [...] }`
  declared ON THE MIXIN CLASS** (L204–214), with the comment *"the sward
  affords the cutting of it, outward to whoever is standing in the
  field… `bucketFilenames` collects the class's own static PLUS every
  mixin in the chain, so two mixins on one host contribute both lists"*.
  `fieldMeta`: `swardStamp`, `swardGrazedKg` (persistent). Four `@hook`s
  the host answers: `swardAreaM2`, `swardGrowthFactor`,
  `swardGrazingDemandPerGameDay`, `onSwardIntegrated`.
  `reconcileSward()` (L318–378): read-triggered behind a reentry guard;
  `nowSeconds()` returns `null` with no world clock; stamp seeding on
  first touch; stepped (`min(365, ceil(days))`) with growth applied
  before grazing; the stamp written BEFORE the host hook so a host that
  reads its own soil cannot re-enter. `swardTranspirationPerGameDay()`
  = standing kg × 4 L (L386–390) — the term the soil asks its host for.
- `packages/server/src/mud/api/command.ts:305–333` — the affordance
  buckets: `self` = the object itself; **`inventory` = everything nested
  inside it, at any depth**; `environment` = its container chain
  outward; `peers` = its siblings + one passable exit away. ⭐ For a
  LOCATION host, *the people standing in it* are its **inventory**, which
  is why `SwardMixin` affords `mow` through `self` + `inventory` and NOT
  `environment`/`peers` (those would offer the verb to the zone and to
  the neighbouring rooms).
- `packages/server/src/mud/api/mixin.ts:1783–1814`
  `getAllMarkupAugmenters` walks the prototype chain unioning every
  class's static `markupAugmenters` — so a mixin's own augmenter renders
  on the host's `look` beside `Detailed`'s (`Detailed.ts:244`) and, on a
  Plant, `Growing`'s (`Growing.ts:415`). A `MarkupAugmenter` is
  **synchronous** — `(text, host, viewer, opts?) => string`
  (`api/mml.ts:130–135`).
- `packages/server/src/mud/lib/husbandry/Soil.ts` — `SoilMixin<TBase extends MixinConstructor<Stuff & Reserved>>`
  (L258); the two hooks `soilWaterDemandPerGameDay()` (L308, default 0)
  and `soilCatchmentAreaM2()` (L313, default 0); the protected
  `watershedScope()` (L534, default asks the container; `null` when
  unplaced); `soilMoistureFraction(): number | null` (L650, reconciles
  first) and `nutrientFraction()` (L673); `_rainSkyExposed` resolved
  through `BiomeApi.isSkyExposed(scope)` (L510) — the rain edge credits
  only sky-exposed ground. `docs/subsystems/soil.md:20–82` — the split
  (derived half kernel; the seeded `GroundCharacter` half is
  `trade-farming`'s, *"consumers: only `Field`"*), the two hooks, the
  tri-state rule (*unresolved must never read as zero*).
- `packages/server/src/mud/lib/reserve.ts:184–188` — `reserves` is
  `{ persistent: true, runtimeState: true }`; `PersistentHydrator.ts:67–75`
  applies every persistent field present in `data` and consults no
  `runtimeState` flag, and **five shipped rows author `reserves:`**
  (`generic-objects` Campfire/range/Kiln, hearthworks cellar, hinkley
  kitchen) plus the coppice panel — so a row MAY author its reserves.
  `home-field.yaml`'s *"it authors no reserves, because it cannot"* is
  about Field deriving capacity from ground character, not a hard rule.
- `packages/content/eternal-university/content/world/eternal/campus-field/location/home-field.yaml`
  — the authored-Field precedent: `class: /trade/farming/location/Field`,
  `coords: {0,0,0}` inside its own zone `campus-field.yaml`
  (`CartesianZone`, `cellSize: 20`, the yard's `address` on purpose, a
  `groundCharacter:` citation), `_biomePath: outdoor/meadow`,
  `ambientIntensity: 40000` (*"lux is lumen over AREA, and a farm is
  big"* — 100 lux over 400 m²), `areaM2: 400`, `legumeFraction: 0.4`, a
  named non-cardinal exit `yard:` (legal only ACROSS a zone boundary —
  the reason the field has its own zone). No `src/` in the pack that
  ships it: *"a `Field` authored directly, with NO pack code anywhere"*.
- `packages/server/src/mud/platform/location/PersistentCartesianLocation.ts`
  — the kernel's own **singleton AND durable** room:
  `PersistableMixin(SingletonCartesianLocation)`, header L3–45: *"one
  row, one room, in a zone's coordinate grid, whose props write back to
  `holder_snapshots`… No establishing context is needed: `StuffApi.singleton`
  IS the establishing context for a keyless persistable singleton
  (restore when a record exists under the scope, else seed the born-with
  `props:` and capture the first record)… Composes over
  `SingletonCartesianLocation`, not the lib base: a durable room over the
  permissive base would silently share ONE `holder_snapshots` scope
  across every mint."* **No shipped row uses it** (grep, 2026-09-17).
  Its test `__tests__/PersistentCartesianLocation.test.ts` asserts
  *"seeds born-with props and captures the first record when none
  exists"* and *"restores instead of seeding when the scope already has
  a record"* — the singleton opt-in, unit-tested. ⚠ The Wood cannot
  *extend* it: `Persistable` must be outermost and the Wood adds mixins.
- `packages/server/src/mud/api/stuff.ts:631–639` `singletonOrClone`
  routes a class composing `SingletonMixin` through `singleton()`;
  `ContainmentLogic.ts:151–155` `resolveLanding` uses it for an exit's
  destination; `Populates.ts:231–239` uses `singleton()` for a
  `props:` entry whose class composes `SingletonMixin`. `singleton()`
  (`api/stuff.ts:659–700`) restores-or-seeds a keyless persistable.
  `Persistable.ts:303–317`: `postRegister` **no longer auto-drives
  persistence (D1)** — a host reached by `clone()` restores nothing.

### `lint:locations` — what a pack Location must satisfy

`packages/server/scripts/check-location-classes.ts` (`lint:locations`):

- Zone-ness and cartesian-ness are **derived, never listed**
  (`extendsAny`, L100–160): the gate reads the class file, takes every
  identifier in the LAST `class X extends …` clause, unwraps a local
  `const Base = Mixin(Real)` one hop, resolves each identifier through
  its import — `@saxonberg/server/mud/<p>` → `/<p>`, a relative import →
  relative — and walks. `CARTESIAN_ROOTS` includes
  `/platform/location/SingletonCartesianLocation` and
  `/platform/location/PersistentCartesianLocation` (L48–54). ⭐ A pack
  room class `PersistableMixin(StandMixin(SoilMixin(ReservedMixin(SingletonCartesianLocation))))`
  is therefore recognised as cartesian **provided the base is imported
  as `@saxonberg/server/mud/platform/location/SingletonCartesianLocation`**
  and the mixins by relative or `@saxonberg/server/mud/…` specifiers.
- Three enumerated rosters: `MINTED_ROWS` (every row on the permissive
  `/platform/location/CartesianLocation` — three rows), `FURNISHED`
  (every row on `FurnishableRoom`), `WARREN_PLACED` (rows a warren
  positions at runtime — the mine's four types and `field.yaml`). Each
  is asserted *exactly* (`against()`: unexpected + missing).
- `unplottedLocations` (L441–453): **every cartesian row must author
  `coords:` under a covering spatial zone** unless it is in one of the
  three rosters. `unzonedCoords`: coords with no zone over the directory
  → a hydrate throw. `orphanedZones`: a zone row must zone a sibling
  directory of its stem. `sameZoneNamedExits`: a non-cardinal exit
  between two rows of one zone throws.
- **The exact edit a `Wood` needs: none.** Its rows are on a pack class
  that is neither the permissive base nor `FurnishableRoom`, so no
  roster names them; they author `coords:` under `hanging-wood.yaml`;
  their exits are cardinal in-zone and the cross-zone `south` to the
  hillside is legal either way. The gate's derivation reaches the
  pack's `src/` through `classFileOf` (the same reader that found
  `AuthoredWorking`).

### Engaged acts, and the base a pack can reach

- `packages/content/trade-mining/src/idea/cmd/mining/MiningActController.ts`
  — a **pack-local** base. `engageAct(context, {durationMs, beginSelf,
  beginPeers?, cost, onComplete, onAbort?})` (L115–147) spends endurance
  (`giver.adjustReserve('endurance', Quantity.of(-points, '%'))`, L150–154),
  falls through to `onComplete()` for a non-Engaged giver, else
  `new ManualBuildStep({actor, slots: ['hands'], durationMs, onComplete, onAbort})`
  → `SchedulerApi.start(step)`; `started|replaced` → begin scene;
  `engagement-conflict` → *"Your hands are already busy."*. **The room
  is found as `giver.getContainer()` narrowed by
  `MixinApi.isActive(room, WORKING_MIXIN)`** (L66–70) — *"a pack must
  never need a kernel list edit; `isActive` takes a plain string"*. A
  pack cannot import another pack's `src/`, so forestry cannot extend it.
- `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
  — the **kernel** base, exported through the server's `exports` map
  (`./mud/platform/idea/*`). `engageStep(context, {durationMs, beginSelf,
  beginPeers?, onComplete, onAbort?})` (L60–110) is `engageAct` minus the
  endurance spend, verbatim. Its header says it is "a base class only",
  already used by `repair`. `abstract class ManualBuildController<M> extends CraftController<M>`
  (L49); `CraftController` (L34) is abstract with no abstract members a
  subclass must supply beyond `execute`.
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
  + `shore.yaml`: the **instrument as an argument** shape —
  `args: [{name: timber, type: object, required: false, scope: "reachable", requires: ToolMixin}]`;
  the controller narrows `MixinApi.isTool(item) && item.hasCapability('timber-set')`,
  and when the arg is absent takes the first qualifying item the giver
  holds (`findTimber`).
- Controller registration is a row at
  `<root>/idea/cmd/<category>/<Name>Controller.yaml` — e.g.
  `trade-mining/content/trade/mining/idea/cmd/mining/HewController.yaml`
  is exactly `class: /trade/mining/idea/cmd/mining/HewController` +
  `data: {}`.
- `packages/server/src/mud/api/mql/types.ts:225–255` — `MqlOneResult`:
  the dispatcher lands `{ stuff, via, raw, prep }` on `model[field]`;
  `stuff` is **`null` when MQL produced no match** (distinguished from
  the field being absent when the player typed nothing); `raw` is
  always present. So an optional object arg with no `requires:` lets a
  bare word reach the controller as `{stuff: null, raw: 'oak'}`.
- The stanza precedent: `platform/content/platform/cmd/perception/analyze.yaml`
  is ONE verb with `subcommands:`; its `ground` stanza names
  `controller: /trade/mining/idea/cmd/perception/AnalyzeGroundController`.

### The growth model — what a row can author, and what latches

- `packages/server/src/mud/lib/husbandry/Growing.ts` — `fieldMeta`
  (L391–411): `growthClockStamp`, `_vigor`, `_maturity`, `growthStage`,
  `_flowering`, `_seedSet`, `_lastLux`, `_lastAmbientK` (runtimeState),
  `_worstLimiting`, `_fruitFill`, `profile` are `persistent` (not
  `authorable`); `harvestTemplatePath`, `nutrientDraw` are
  `persistent + authorable`. Defaults: `_vigor = 0.7` (L420),
  `growthStage = 'seedling'` (L424), `_flowering = false`,
  `_seedSet = false`, `_fruitFill = 0`. `SECONDS_PER_GAME_DAY = 86_400`
  (L161). `PersistentHydrator.ts:67–75` applies **every persistent field
  present in `data`** — so a YAML `growthStage: mature` hydrates.
- First reconcile with `growthClockStamp === 0` seeds the stamp and
  integrates nothing (L680–682). `advanceStage()` (L999–1014) walks
  **forward only** — an authored `mature` with `_maturity: 0` is stable.
  `updateFlowering()` (L1022–1051): `shouldFlower = mature && _vigor >= husbandry.band.thrivingAt (0.8)`;
  on latch a polycarp sets `_seedSet = true`, `_fruitFill = 0`,
  `_worstLimiting = 1`. `accrueFruitFill` (L1058–1067):
  `_fruitFill += limiting × dt / (fruitFillDays × DAY)`.
  `isHarvestable()` (L565–571): `harvestTemplatePath` set, mature,
  alive, polycarp ⇒ `_fruitFill >= 1`. `settleCycle()` (L527–530) zeroes
  the cycle. `isPolycarp()` = `fruitSetCount > 0 && fruitFillDays > 0`.
  ⚠ **An authored-mature stool does not fill until `_vigor` climbs to
  0.8**, and the light ramp decides whether it ever gets there.
- `GrowthProfileData` (L102–158): `moistureHappyAt`, `moistureWiltAt`,
  `litresPerGameDay`, `luxHappyAt`, `luxDarkAt`, `rootDemand{...}`,
  `daysToStage{young, established, mature}`, `fruitSetCount?`,
  `fruitFillDays?`. Clock: `WorldClockApi.DEFAULT_SCALE = 12`;
  `DefaultCalendar.ts:15–21` 360 days a year → **one game year = 360
  game days = 30 real days**.
- `packages/server/src/mud/platform/thing/Plant.ts` —
  `PersistableMixin(PostRegistrationMixin(SlottableMixin(GrowingMixin(ReservedMixin(OrganismMixin(ThermalMixin(DetailedMixin(Thing))))))))`
  (L53); own field `seedTemplatePath`; `getPersistenceKey()` mints a
  uuid **lazily on first demand** (L222–232); `onFloweringLatched` clones
  the seed into the bed (monocarps only).
- `packages/server/src/mud/lib/husbandry/Cultivable.ts` — host
  constraint `Stuff & Container & Bulkable & Slotted & Populates & Reserved & Soil`
  (L141–145); `_mixinName` a **plain literal** (L147–157);
  `commandContributions.peers = [plant, repot, harvest, feed]`
  (L174–184); `fixedGround`, `landRequirementM2`; `PLANT_SLOT = 'plant'`;
  `occupy()` (L391–404) detects a **reseat** as
  `candidate.getContainer() === this` and settles the soil only on a real
  arrival; `applyProps()` → `super` then `adoptArrivals()` (L431–434).
- `packages/server/src/mud/platform/thing/GardenBed.ts` —
  `CultivableMixin(SoilMixin(PopulatesMixin(SlottedMixin(BulkableMixin(ContainerMixin(ReservedMixin(DetailedMixin(Thing))))))))`.
  `Crop.ts:35` = `CraftedMixin(DetailedMixin(Thing))`; `Seed.ts:25` =
  `PlantableMixin(DetailedMixin(Thing))`; `ToolItem.ts:37` =
  `CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))))`.
- `HarvestController.ts` — `HarvestModel { target: MqlOneResult }`;
  narrows `isGrowing(named)` else `isCultivable(named)` → first
  harvestable occupant else first growing (L98–104); refusals name the
  state; count = `floor(fruitSetCount ?? 1)` clones of
  `harvestTemplatePath`, `Crafted`-stamped (`maker`, `Grade.of(band)`,
  `recipe`, `craftedAt`) when `isCrafted`; `bed.drawNutrient(draw)`;
  polycarp → `settleCycle()` else destruct; captures; **credits
  `horticulture`** (L253–258). **No tool anywhere.** `harvest.yaml`:
  `verbs: [harvest, pick]`, `target` `requires: [VisibleMixin, GrowingMixin|CultivableMixin]`.
- `PlantController.ts` — narrows `isPlantable(seed)`, `isCultivable(target)`;
  **the land-use gate** runs only when `target.isFixedGround()`
  (L104–150) and refuses when `covering && !LandUses.permitsAnyCultivation(use)`;
  then `hasSoil`, a free slot, `getGrowsIntoPath`, clones, `fitsSlot`,
  `ContainmentApi.move(plant, target)`, `target.reconcileSoil()`,
  `target.occupy(plant, PLANT_SLOT)`, destructs the seed, captures,
  credits `horticulture`/`trivial` (L237–243). `plant.yaml`: `seed`
  requires `[VisibleMixin, PlantableMixin]`, `pot` requires
  `[VisibleMixin, CultivableMixin]`, `prepositions: [in, into]`.
- `packages/server/src/mud/lib/parcel/LandUse.ts:71–101` — the closed
  six; `wild` admits no cultivation; `agricultural` admits `field`.
  ⚠ **A wood titled `wild` refuses `plant` on any fixed ground in it.**

### Persistence — what survives a restart, and what silently does not

- `Populates.ts:231–239` — a `props:` entry whose class composes
  `SingletonMixin` is minted through **`StuffApi.singleton(path)`**;
  anything else through `StuffApi.clone`. `singleton()` restores-or-seeds
  a keyless persistable (§ above). A host reached by `clone()` restores
  nothing on its own.
- Consequence for today's coppice: `fuel-yard.yaml` (a
  `SingletonCartesianLocation`, transient contents — rebuilt from
  `props:` each boot, `PersistentCartesianLocation.ts:8–10`) props
  `/trade/fuel/thing/coppice-panel` (`GardenBed`, neither persistable
  nor singleton) → **a fresh, full panel every boot**; a harvested
  stool's own captured record is never re-referred. AC 8 fails on the
  shipped shape; D5 is the fix.
- `PersistableLogic.ts:1014–1018` `captureHostOf(stuff)` captures the
  **nearest persistable host** — in a `Wood` room, a panel's capture
  walks up to the panel itself (persistable), and a loose object's
  capture walks up to the room. `Persistable.ts:245–270`: the
  `applyProps` override *retains* the specs and seeds them only through
  the persistence gate, so a restored host never re-seeds; cast is
  re-seeded on every restore (`reseedCast`).
- `platform/thing/Stock.ts:53–60` = `PersistableMixin(…(Vessel))` —
  persistable, **not** singleton; `postRegister` runs `reset()`. It
  survives a bounce today only where its room is a persistable host that
  refs it. Recorded, not fixed here.

### The rows that move, and everything that names them

- `packages/content/trade-fuel/content/trade/fuel/thing/cordwood.yaml`
  — `class: /platform/thing/Provision`, *"A straight length of oak"*,
  `_materialPath: …/wood/oak`, `gradeBand: fair`, `mass: 3.2`.
  `Provision` = `CraftedMixin(ContaminableMixin(CuredMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing))))))`.
- `…/hazel-stool.yaml` — `/platform/thing/Plant`, `_speciesPath` corylus
  avellana, `_materialPath: …/tissue/plant-tissue` (⚠ the row key is `_materialPath`, never `material:` — 186 shipped rows, zero the other way; an undeclared key is dropped silently), `harvestTemplatePath: /trade/fuel/thing/cordwood`,
  `nutrientDraw: 6`, profile `luxHappyAt: 100`, `luxDarkAt: 10`,
  `daysToStage {200, 900, 2500}`, `fruitSetCount: 8`, `fruitFillDays: 120`;
  the header claims *"Authored ALREADY GROWN"* and sets no stage.
- `…/coppice-panel.yaml` — `/platform/thing/GardenBed`, `mass: 2400`,
  `fixedGround: true`, `landRequirementM2: 120`, `interiorBulk: true`,
  `interiorCapacity: 180`, reserves moisture 90 L / nitrogen 100 %,
  `staticSlots: [{name: plant, accepts: SlottableMixin, capacity: 6, userFacingDetail: planting}]`,
  six `props:` stools, `_materialPath: …/wood/oak`.
- `trade-mining/content/trade/mining/thing/felling-axe.yaml`
  (`ToolItem`, `capabilities: ["cutting", "striking"]`, iron, mass 2.8)
  and `billhook.yaml` (`capabilities: ["cutting"]`, mass 1.1);
  `trade-mining/content/recipes/felling-axe.yaml` + `billhook.yaml`
  (`outputTemplate: /trade/mining/thing/…`, `discipline: mining`).
  `recipes/timber-set.yaml`: `inputSlots: [{slot: stock, category: wood, minGrade: poor, kind: item, count: 2}]`,
  `toolCapabilities: [cutting]`.
- `trade-fuel/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/fagales/betulaceae/corylus/avellana.yaml`
  — the hazel species (`_defaultMaterialPath: …/tissue/plant-tissue`,
  `lifespanMax: 80`); its header names the rotation as the seam.
- Every reference (grep, 2026-09-17): `rejection/…/location/fuel-yard.yaml`
  (props L33–35 + comments), `trade-fuel/src/__tests__/burn.test.ts`
  (L152–186), `trade-fuel/src/idea/cmd/fuel/CharController.ts`
  (`isCordwood` = keyword `'cordwood'`, L199 — path-independent),
  `trade-fuel/content/trade/fuel/thing/clamp.yaml` (prose),
  `trade-fuel/README.md` (L3–8), `trade-mining/src/__tests__/archetype-and-ladder.test.ts:154–159`
  (the exact recipe-id list), `packages/wire/tests/metal-chain.dirty.wire.test.ts:42`
  and `metallurgy.dirty.wire.test.ts:37–47` (`packs:` lists),
  `docs/antipatterns.md:4397–4435`, `docs/subsystems/smallholding.md:56–66`,
  `docs/slates/builds/metal-chain-slate.md`. Comment-only mentions in
  `ToolItem.ts:22–23`, `trade-cooking/src/thing/KitchenTool.ts:10–11`,
  `lib/material/__tests__/Contaminable.test.ts:363–365` need no edit.
- Material use counts across all shipped rows: `wood/oak` ×30, `wood/pine`
  ×1 (`trade-farming/…/thing/bed/garden.yaml:20`, resolving to no row).

### Materials, species, the category rule

- `base-library/content/stuff/idea/material/wood/oak.yaml` (the only
  wood): `density: 750`, `specificHeat: 2000`, `thermalConductivity: 0.17`,
  `electricalConductivity: 1.0e-4`, `waterAbsorptionCapacity: 28`,
  `autoignitionTemperature: 570`, `heatOfCombustion: 16`, `hardness: 40`,
  `toughness: 60`, `tags: ["wood", "mixture", "organic", "flammable", "once-living"]`,
  `biologicalSource: null` under *"until an oak-tree species template is
  authored"*. No `spoilActivationEnergy`.
- `lib/material/Material.ts:128–131` `BiologicalSource { speciesPath; tissueType }`;
  `MaterialCatalogue.warm()` selects by the path infix `/idea/material/`
  and the class, over every root.
- `CraftingLogic.ts:1417–1423`: a recipe slot's `category` matches the
  input material's `category` OR a member of its `tags`; `minGrade`
  compares an ungraded item as `Grade.of('fair')` (L391, L404). A plain
  `Thing` made of a `wood`-tagged material satisfies `timber-set` and
  `charcoal`.
- `Species` (`lib/species/Species.ts`; `_defaultMaterialPath` L530,
  `adultMass` L536): the default material is the **living organism's**.
  `avellana.yaml` is the species row shape. No `quercus`, `fraxinus`,
  `fagus`, `ulmus`, `salix`, `pinus`, `taxus` row exists.

### Tools, epoch, the seams gate

- `lib/craft/Tooled.ts` — `ToolMixin`: `capabilities` (persistent +
  authorable, L45–56), `hasCapability(cap)` L78,
  `getInstanceContributions` over a capability's `verbs` + `placement`.
  **No `epoch` field exists anywhere** (grep, 2026-09-17).
- `scripts/check-unconsumed-seams.ts:66–73` counts unread `fieldMeta`
  keys **under `platform/idea/**` only**. A `lib/` mixin field is outside
  its scope. The gate is a ceiling.

### Light, the rooms, the biome

- `docs/subsystems/light.md:146–154` bands (lux): `<1` pitch-black ·
  `1–5` very-dim · `5–20` dim · `20–60` lit · `60–200` bright;
  `lux = lumens / cellSize²` (L190–198); direct sunlight (ambient slot)
  = 8000 lm (L230; `8000 / 100 = 80 lux → bright` L236). L686: time of
  day is out of scope — `AmbientLitMixin` (`lib/perception/AmbientLit.ts:49`)
  is a constant nothing modulates. **There is no night.**
- `rejection/content/world/rejection.yaml` — `CartesianZone`,
  `cellSize: 10.0`, `address: terminus/rejection`, `deposit:` — the
  header: `Zone.lookupField` walks OUTWARD so sub-zones inherit both.
  `kestrel-road.yaml` — `CartesianZone`, `cellSize: 20.0`.
- The twelve `location/*.yaml` rows: all `SingletonCartesianLocation`
  except the two `AuthoredWorking`s; **none authors `ambientIntensity`
  or `_biomePath`**. Coords: pithead (0,0), claims-office (0,1),
  hillside (0,2) with `southwest`/`northeast` exits, old-workings (2,4),
  fringe-claim (5,7), far-fringe (10,14); fuel-yard (1,1); smelter (2,1);
  the-dry (−1,1); provisioning (−1,0); assay-shed (1,0); adit (0,−1).
  **Nothing at y > 2 west of x = 2.** `fuel-yard.yaml` props `clamp`,
  `coppice-panel`, `billhook`, `felling-axe`, four `charcoal`; casts the
  collier; *"the coppice standing behind it"*.
- The five Kestrel Road rooms author `ambientIntensity: 600`-ish at
  `cellSize: 20` → 1.5 lux → **very-dim** by their own arithmetic.
- Biome rows: `base-library/…/biome/outdoor/baseline.yaml`
  (`SkyExposedBiome`, `_extendsBiomePath`, `_defaultHumidity`,
  `_ambientSoundMml`) and `meadow.yaml` (`_defaultWind`,
  `_ambientSmellMml`).
- Title: `rejection/pack.yaml:19–31` —
  `{ extent: /world/rejection/kestrel-road, parentParcel: /world/rejection, holder: { group: rejection }, landUse: wild }`.
  `rejection/package.json` depends on `trade-fuel`, `trade-mining`,
  `trade-smelting`, `trade-smithing`, `transport` + the three base packs.

### Packs, the graph, the lints

- `content-packs.md:126–137`: `dependsOn` is DERIVED from `package.json`;
  the root `/package.json` is the deployment manifest — **a new pack is
  one dependency line there**. `StuffApi.resolveClassFile` resolves a
  class path into the owning pack's `src/` by longest root, so a
  `rejection` row naming `/trade/forestry/location/Wood` resolves into
  `trade-forestry/src/` provided `rejection` depends on it.
- `trade-fuel/package.json` and `trade-mining/package.json` depend on
  nothing forestry will ship.
- Lint roster (`packages/server/package.json:36–77`) — the gates this
  build's changes meet: `verb-collisions` (`fell` is free), `arg-kinds`
  (an object-typed arg must declare `requires` — see D3 for the one
  deliberate absence and its test), `binder-models`, `untitled`,
  `census`, `perishable`, `instanceable`, `locations` (above), `imports`,
  `boundary`, `module-scope`, `mixin-names`, `unconsumed-seams`,
  `test-bootstrap`, `test-content`, `schema` (unchanged — no kind
  edit), `world-scan`.
- `args[].requires` is parsed by `CommandLogic.ts:2816` (`|`-separated
  mixin names; the scope scan filters candidates before binding,
  L2989–2996). `buy.yaml` shows `default:` + `scope: [reachable]`.
- Wire: `packages/wire/src/harness/index.ts` exports `Session`,
  `uniqueHandle`, `declareFile`, `expectOk`, …; the harness *"waits on a
  frame, never on a clock"* and no test moves the world clock.
- Chronicle: `lib/character/Persona.ts:268` `recordDeed`, L279
  `recordChronicleOnce(key, fields)` (idempotent on `key`);
  `ChronicleEntry.ts:46–64` fields. Narrow with `MixinApi.isPersona`.
- Advancement: `Advancing.creditDeed` on the actor; Discipline rows
  warmed by class; `platform/…/Discipline/agriculture.yaml` exists;
  `trade-mining/…/Discipline/mining.yaml` is the row shape.
- Charcoal: `trade-fuel/src/thing/CharcoalPit.ts` — `CHARS_FROM 0.3`,
  `CHARS_TO 0.62`, `yieldRatio` 0.35 (`clamp.yaml`);
  `yieldFor(lengths) = floor(lengths × yieldRatio × (1 − 0.4 × |draught − 0.46| / 0.16))`;
  `recipes/charcoal.yaml` charges 8 lengths; `CharController.ts:74–84`
  chars every cordwood in the pit.
- `mining.md:200–203`: *"a mine that runs out of timber has a supply
  problem"*.

---

## Plan-level decisions

### D1 — `Wood`: a pack-owned persistable singleton location that IS ground

**Question.** What carries the stand, and what does a wood room *be*?

**Choice.** `trade-forestry/src/location/Wood.ts` (`/trade/forestry/location/Wood`):

```ts
// The ground half first, named — the Field/GardenBed rule: inference
// through nested generic mixin factories collapses to `never`.
const WoodGround = SoilMixin(ReservedMixin(SingletonCartesianLocation));
// The stand goes OVER the soil because it drinks it (the Sward rule).
// Persistable OUTERMOST — the host rule (cleanupOnDestruct before the
// inner Container evacuates; applyProps/applyCast wrap Populates).
const WoodBase = PersistableMixin(StandMixin(WoodGround));
export default class Wood extends WoodBase { … }
```

**Why `SingletonCartesianLocation` and not `Field`'s permissive base.**
A Field is a KIND of place minted many times, keyed per instance by its
holding, on nobody's grid (`WarrenMember`). A Wood room is an authored
place — one row IS one clearing, at a coordinate in the Hanging Wood's
zone, reached by an exit — so it is the **singleton** cell, and
`PersistentCartesianLocation.ts:40–45` states the rule for the durable
version of it: *a durable room over the permissive base would silently
share ONE `holder_snapshots` scope across every mint*. The Wood is that
kernel class's shape with two mixins inside the outermost
`Persistable` — which is exactly why it cannot `extend` it. No
`WarrenMemberMixin`: a clearing lives in a zone, not in a holding.

**A Wood IS ground.** Own fields (`fieldMeta`, persistent + authorable):
`woodName` (what the place is called in the stand's prose), `areaM2`
(default the zone's `cellSize²`; authored when a clearing is bigger than
its cell). The soil's reserves are **authored on the row** (the coppice
panel's shape — `reserves:` hydrates; § Grounding): `moisture` capacity
`areaM2 × 45 L` (Field's `LITRES_PER_M2_LOAM`), half full; `nitrogen`
100 % capacity, 60 % current (a wood's litter cycles it; nothing draws
it in this build but the panels' stools). Rain-fed, generous — the
LIMIT is the increment, not husbandry. The three soil hooks, as Field
answers them: `watershedScope()` returns itself (a place);
`soilCatchmentAreaM2()` returns `areaM2` (every square metre catches
rain); `soilWaterDemandPerGameDay()` returns the stand's transpiration
(`StandMixin.standTranspirationPerGameDay()`, D2) **plus** the summed
`waterDemandPerGameDay()` of the plants in any `Panel` standing in the
room (a Panel is its own soil checkpoint — the stools drink the
panel's water, not the room's; the room-level sum is the *stand's*
draw and nothing else, so the second term is dropped: **a Wood's soil
is drunk by its standards; a Panel's soil by its stools**. Stated so
nobody double-bills). `postRegister()`: `super` (Persistable's driver
does nothing — D1 of the spine; the establishing context is
`singleton()`), then `void this.settleSoilPlacement()` so the sky edge
learns where it is (Field's `settleSoilPlacement` override). No
`GroundCharacter`: the seeded half of soil is `trade-farming`'s
(`soil.md:20–45` — *"consumers: only Field"*), unreachable from a pack
that must not import another's `src/`; the Wood's soil is the derived
half only, and its capacity is a row number. Named in § Deferred seams.

**How it is minted and restored.** An exit's destination resolves
through `ContainmentLogic.resolveLanding` → `StuffApi.singletonOrClone`
→ `singleton()` (the class composes `SingletonMixin` through its base)
→ **restore when a `holder_snapshots` record exists under the scope
`/world/rejection/hanging-wood/<room>`, else seed the born-with
`props:` (the panel, cast) and capture the first record** — the
`PersistentCartesianLocation` test's two cases, verbatim. So on a fresh
boot the room's authored `stand:` block (D2) hydrates into the mixin's
fields and is captured with the first record; on every later boot the
record wins and the authored block is inert — *the row is what the
stand STARTED as; the record is what it has become*, the Herdbook's own
sentence, now on the place. ⚠ `props:` inside a persistable host are
retained and seeded only through the persistence gate
(`Persistable.ts:245–270`); a `Panel` propped in a Wood is a nested
persistable singleton — `{ref}` in the room's container slice, restored
by `cloneHost` → `singleton()` (its own scope).

**`lint:locations`:** no roster entry (§ Grounding — the Wood is on
neither enumerated class; its rows plot under a zone). The class file
imports `SingletonCartesianLocation` from
`@saxonberg/server/mud/platform/location/SingletonCartesianLocation`
so the gate's derivation resolves it (`CARTESIAN_ROOTS`), and the
intermediate `const WoodGround` is the one-hop unwrap the gate performs.

**What composing it claims:** every Wood room is soil (true — it has
reserves the sky fills and roots drink), a persistence host (a clearing
remembers what was cut from it — true, and the point of AC 7/8), and
one-per-row (true — a clearing is a place). A room with no `stand:`
block is a Wood with nothing standing (a felled-out clearing an author
writes as such).

### D2 — `StandMixin`: the standing timber as a cover over a place, on the Sward shape

`trade-forestry/src/lib/Stand.ts` — `export function StandMixin<TBase extends MixinConstructor<Stuff & Reserved>>`
(the Sward constraint; `Reserved` so the mixin can read the host's soil
through the composed `Soil` face at runtime — checked by
`MixinApi.isActive(this, 'SoilMixin')`, never a type assertion that the
constraint hides). `export const STAND_MIXIN = 'StandMixin'`;
`static _mixinName = STAND_MIXIN` (a plain literal — the `Cultivable`
TS2417 note). ⭐ **The second instance of a continuous-cover mixin**
(Sward is the first): reconcile-on-read over a stamp, host hooks for
area and growth, a percept phrase. Named, not factored — *two instances
is where a pattern is NAMED* (soil.md's own rule); a kernel
`lib/husbandry/Cover` is the seam when a third appears (§ Deferred
seams).

**Fields** (`fieldMeta`, persistent + authorable unless noted):

```ts
interface StandSpecies {
  speciesPath: string;        // the Species row
  name: string;               // the word a player uses: 'oak'
  woodMaterialPath: string;   // what a felled one is made of
  seedPath: string | null;    // what a felled one drops
  standing: number;           // whole standards, true at `standStamp`
  capacity: number;           // what this ground carries
  incrementPerYear: number;   // standards per game year, at full satisfaction
}
interface StandPlanting { plantKey: string; planter: string; planterName: string; speciesPath: string; gameDay: number }
mix: StandSpecies[] = []                       // authored as `stand:`? — no: the key is `mix`
standStamp: number = 0                         // persistent; game-s the `standing` figures are true at (0 = never)
plantings: StandPlanting[] = []                // persistent
cutLog: { speciesPath: string; at: number; by: string }[] = []   // persistent
```

(The row authors `mix:`; the plan's prose calls the whole block *the
stand*.) **Unit: whole standards** ("trees' worth"), never m³ — the drive
reads *smaller by one tree's worth*, and a volume would be a second
number nothing reads.

**Reconcile on read, and the soil reaches the trees.**
`standingNow(sp): number = min(sp.capacity, sp.standing + sp.incrementPerYear × growthFactor × (nowS − standStamp) / (360 × 86_400))`
where `growthFactor = clampUnit(soilMoistureFraction() / 0.35)` when the
host's `soilMoistureFraction()` is non-null (Field's own drought curve
for a sward, `Field.ts:311–314`; `null` = unmodelled = 1, the tri-state
rule). ⚠ Because the factor is read at derive time rather than
integrated, a dry spell counts at the moisture *now*, not the mean over
the window — the honest cheap form, and stated in `forestry.md`; the
Sward's stepped integral is the upgrade if anyone can see the
difference. `nowSeconds()` is Sward's (`null` with no world clock →
`standing` as stamped). **Reads stamp nothing.** The increment continues
from zero (AC 7: *refilled only by the increment and by planting*), so a
felled-out clearing is empty for `capacity / incrementPerYear` game
years at full moisture, longer in drought.

**Mutators** (`@Final @Unshadowable`, called only by `FellController` and
`Panel`, both narrowing the room with `MixinApi.isActive(room, STAND_MIXIN)`
the pack way — no kernel list, no `Mixins` entry):
- `cut(speciesPath, nowS): boolean` — settle **every** species to
  `standingNow`, refuse (`false`) if the chosen one derives `< 1`,
  decrement it by one, `standStamp = nowS`, push `cutLog`, return
  `true`. The caller captures the host afterwards
  (`PersistableApi.captureHostOf(room)`).
- `recordPlanting(p)`, `removePlanting(plantKey)` — the ledger only;
  neither touches `standing`.
- `standTranspirationPerGameDay(): number` — `Σ standingNow × 120 L`
  (a mature broadleaf transpires ~100–150 L a summer day; the number is
  the one the soil hook drinks by, and it is what makes a full stand on
  a small cell run its ground dry in a dry month — the coupling the
  move exists for).
- `standPhrase(viewer): string` — the derived reading (below).

**Affordance.** `static commandContributions = { self: ['trade/forestry/cmd/forestry/fell.yaml'], inventory: ['trade/forestry/cmd/forestry/fell.yaml'] }`
**on the mixin class** — `Sward.ts:204–214` verbatim in shape, and for
the same reason: on a LOCATION host, *the people standing in it are its
`inventory`* (`api/command.ts:308–309`), so `inventory` is what puts
`fell` in a player's `commands` while they stand on the ride. ⚠ Not
`environment`/`peers`: for a room those reach the zone and the
neighbouring rooms. The mixin's static and the class's own are both
collected (`bucketFilenames` unions the chain — Sward's comment), so
`Wood` declares none of its own.

**Presentation.** `static markupAugmenters = [standAugmenter]` on the
mixin: appended to the room's long description on `look`
(`getAllMarkupAugmenters` walks the chain), synchronous, reading the
host's own fields and `WorldClockApi` — no memo, no registry, no
async. Per species: *"Oak stands here — about twenty-four trees' worth,
old, planted by nobody alive."*, *"Ash — twelve."*; then the plantings:
*"An oak sapling, planted by Tam Ferrier on the 4th day of the 2nd
year."*; when every species derives `< 1`: *"Nothing stands here that is
worth the axe — stumps, brash, and the saplings somebody planted."*
Numbers as words: a stand is a ledger a player reads, not a gauge (the
herdbook's tally is the precedent). The room's authored
`longDescription` stays static and never states a number the stand
holds.

**What composing it claims:** any `Reserved` host may carry a standing
cover of trees. Its one composer is `Wood`; a second (a hedgerow on a
Field, an orchard) is the third-instance signal for the Cover seam.

**Rejected.** A document record (the first draft — see the revision
note: a stand does not move, so a filed record is two sources for one
fact, and its memo was a cache nothing but boot warmed). A field on the
zone (a pack cannot add a field to a kernel class). A stand fixture in
the room's contents (a Thing standing in for the room's own ground).

### D3 — `fell`: one view, the kernel engaged-act base, the axe as an argument, the room as the stand

**View** `trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`
(`verbs: [fell]` — free; `lint:verb-collisions` stays at its nine):

```yaml
verbs: [fell]
controller: /trade/forestry/idea/cmd/forestry/FellController
description: "Fell a standard with an axe, or cross-cut a felled one"
validators: [requiresAnimate, requiresConscious, requiresEmbodied]   # the three /lib/command/validators paths
args:
  - name: target            # a bole on the floor, a planted standard, or a
    type: object            # bare species word — polymorphic, so NO
    required: false         # `requires:` here; the controller narrows
    scope: [reachable]      # (revised 2026-09-17 — the bole; the stand is the ROOM)
  - name: axe               # DECLARED, never hunted (grain-chain's
    type: object            # `lint:instrument-args`, ceiling 0, and the
    required: false         # `[capability.X]` atom it added — see
    prepositions: [with, using]   # § Pending branches)
    default: "reachable:[capability.felling]"
    scope: ["reachable"]
    requires: [ToolMixin]
```

**The target is polymorphic, so the view gates nothing on it and the
controller narrows.** Three things can stand in that slot and they
share no mixin: a **`Bole`** on the floor (D4 — `fell bole` cross-cuts
a length off it), a mature planted `Plant` (D6 — `fell sapling`), or a
bare word that binds nothing — **the room is not a bindable target**, so
`fell oak` / `fell trees` bind NOTHING and land as
`{stuff: null, raw: 'oak'}` (`api/mql/types.ts:225–255`), and the
controller treats `raw` as a species word against the room's stand. A
`requires:` on this arg would refuse two of the three at the binder, and
an alternation deletes a check (project memory), so there is none; the
arg-gate test asserts the view declares **no** `requires` on `target`
and `ToolMixin` on `axe`. ⚠ A controller test cannot see the binder —
so a **dispatcher-level** unit test (`test-bootstrap`, a room composing
`StandMixin`, `CommandApi.dispatch('fell oak')`) asserts the raw word
reaches `execute` with `stuff === null` and is read as the species.
`with <axe>` names the instrument; when absent the view's `default:`
binds the first reachable thing offering `felling` — **the controller
never hunts**. `design/grain-chain` (unmerged, 2026-09-17) retired the
held-first walk from `shore` itself and ships `lint:instrument-args`
at a ceiling of ZERO: a `giver.getContents().find(MixinApi.isTool…)`
in this controller fails that gate the day grain merges. The
controller reads `model.axe?.stuff`, checks `hasCapability('felling')`
(a bound billhook → `wrong-tool`), and null → `no-axe`. ✅ Verified on the
merged tree (2026-09-17): the gate fires only on a **`.getContents()`
walk searched by a type test** (`check-instrument-args.ts:255-320` —
`receiverOf` keys on `.getContents()`; `searchesAccumulator` on a
find/filter/loop with `instanceof`/`MixinApi.isX`). The stand lookup
`MixinApi.isActive(giver.getContainer(), STAND_MIXIN)` walks no
contents and does not fire. No `stand` arg needed.

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
`ForestryActController` copy**: the kernel already holds the thing it
would copy. The remaining seam — `engageAct` is `engageStep` plus a
spend — leaves as a tail (§ Deferred seams).

Constants: `FELL_MS = 30_000` game-ms (2.5 real seconds at 12×),
`FELL_COST = 10` endurance points; `CROSSCUT_MS = 15_000`,
`CROSSCUT_COST = 5`; `LOGS_PER_STANDARD = 4` (the crown), one seed, and
**one bole** carrying `BOLE_LENGTHS = 6` cross-cuts of timber.

⭐⭐ **The bole — bigness, decided (user, 2026-09-17).** A standard oak
is tonnes, and a tree is the first `Thing` whose product exceeds a
body. Felling therefore does NOT collapse the tree into pocketable
pieces: it drops **one bole** on the room floor — the felled trunk as a
single loose object, mass = the species' wood density × `BOLE_M3 = 0.9`
(oak ≈ 675 kg; can't-budge is emergent from mass, never a flag) — and
**cross-cutting is a second act** on that object: `fell bole` takes one
length of timber off it per engagement until its `lengthsLeft` reaches
zero, at which point the butt and brash are destructed with prose
(*"what is left is a knotted butt and a heap of brash, and the wood can
have it back"*). The bole's mass drops by each length taken. What a
forester with an axe gets from a tree is six mine-grade lengths; what a
sawyer gets from the same bole is boards — the bole on the ground IS
the seam `trade-sawing` attaches to, and it is what the transport
pack's sledge and dray exist to move (no haulage act ships here; a bole
where it fell is honest). ⭐ **A bole in a `Wood` room now SURVIVES a
restart** — the room is a persistence host and a loose object in it
rides the container slice (revised from the first draft's *"a bole is
lost at restart"*; a bole dragged into a non-persistable room is still
lost there, as any loose thing is).

Flow (`execute`): read the bound axe (never hunt) → the stand:
`const room = giver.getContainer(); const stand = room && MixinApi.isActive(room, STAND_MIXIN) ? room : null`
(the `workingOf` shape, `MiningActController.ts:66–70`; no fixture
lookup) → the target: (a) `model.target.stuff` is a `Bole` → cross-cut;
(b) a `Growing` plant → `fellPlanted` (must be a standard: `harvestTemplatePath === null`
and `discipline === 'silviculture'`; a stool refuses *"That is a stool —
cut it with a billhook."*, `not-a-standard`; a seedling refuses
`not-yet-a-tree`); (c) `stuff === null` → the room's stand: none →
*"There is nothing here to fell."* (`no-stand`); species = `raw` matched
against `mix[].name` (empty `raw` → the species with the greatest
`standingNow`; an unknown word → *"No <word> stands here."*,
`no-such-species`); `standingNow < 1` → *"There is nothing left here
that is worth the axe."* (`stand-empty`, in words about the wood). Then
`engageStep(context, { durationMs, beginSelf, beginPeers, onComplete: () => { void fellStandard(...) | void crosscut(...) | void fellPlanted(...) } })`
with the spend before it.

`fellStandard` (module-level, opens with `isDestroyed()` checks on the
giver and the room): `if (!stand.cut(sp.speciesPath, nowS))` → the same
*nothing left* line (a concurrent cut); mint **one**
`/trade/forestry/thing/bole` (`setMaterial(woodMaterial)`,
`setMass(density × BOLE_M3)`, `lengthsLeft = BOLE_LENGTHS`) onto the
room floor, `LOGS_PER_STANDARD` clones of `/trade/forestry/thing/log`
with the same material onto the floor, one clone of `sp.seedPath` into
the giver's hands (material resolved through
`StuffApi.singleton<Material>(sp.woodMaterialPath)`); `stampChattel(giver)`
on each; `await PersistableApi.captureHostOf(room)` (the stand's cut and
the bole on the floor, one record); scene *"The oak goes over with a
crack you feel in your feet and lies there, the whole length of it, too
much for any one back. Four logs come off the crown, and an acorn."*;
credit `silviculture` `standard`. `crosscut` (the bole form):
`engageStep` at `CROSSCUT_MS`; on complete, if the bole is destroyed
return; mint one `/trade/forestry/thing/timber` with the bole's material
into the giver, `bole.takeLength()`; at zero, `StuffApi.destruct(bole)`
with the brash line; capture the room; credit `silviculture` `easy`.
`fellPlanted`: **the product is sized by the tree** (the anatomy pass,
2026-09-17). `StuffApi.destruct(plant)` (vacating its slot through
`Cultivable.vacate`); by stage: `mature` → the same bole + logs + seed
mint, material from the plant's species → the room stand's `mix` entry
when the room is a Wood and names that species, else the plant's own
`standardMaterialPath` (D7); `young`/`established` → **one whole felled
tree** (`/trade/forestry/thing/felled-tree`, `young` 8 kg,
`established` 30 kg — carryable, the Christmas-tree case) and no seed;
`seedling` refuses. Either way, if the room is a Wood,
`stand.removePlanting(plantKey)`; capture the panel and the room.

Refusals are diegetic and noted. No deed gate — felling is labour.

### D4 — bole, timber, log, seed, and the whole small tree: five product rows, material stamped at the mint

- `/trade/forestry/thing/felled-tree` — `class: /platform/thing/Thing`,
  what a `young` or `established` slot-plant becomes when felled
  (D3's `fellPlanted`): one carryable object, the species' wood,
  mass by stage. A tree small enough to carry is carried whole — the
  Christmas-tree case, and the honest inverse of the bole. Combustible
  only once it is logs (`fell felled-tree` is not a form; a small tree
  is split by hand later or burned as brash — nothing here).
- `/trade/forestry/thing/bole` — `class: /trade/forestry/thing/Bole`,
  a pack class `trade-forestry/src/thing/Bole.ts` =
  `DetailedMixin(Thing)` with one own field (`fieldMeta`, persistent +
  authorable) `lengthsLeft: number` and one mutator `takeLength(): number`
  (`@Final`; decrements, drops the mass by `TIMBER_MASS`, returns what
  is left). `shortDescription: felled trunk`, `keywords: [bole, trunk,
  tree, log, felled]`, `register: indefinite`, `_materialPath: …/wood/oak`
  (restamped at the mint), `mass: 675` (restamped), `lengthsLeft: 6`.
  ⭐ `static commandContributions = { self: ['trade/forestry/cmd/forestry/fell.yaml'], environment: [], peers: [] }`
  — **the bole affords its own cross-cut**, so a bole dragged to the
  yard one day is still cross-cuttable there with no stand in the room.
  `markupAugmenter`: *"six lengths in it yet"* / *"one length left"*.
  What composing it claims: a bole is a Thing (Tangible, Containable —
  it can in principle be loaded, which is the haulage seam; Chattel —
  it is somebody's), and nothing else.
- `/trade/forestry/thing/timber` — `class: /platform/thing/Thing`,
  `shortDescription: length of green timber`, `keywords: [timber, length, wood, round]`,
  `_materialPath: …/wood/oak` (the default; the mint restamps),
  `mass: 24` (`TIMBER_MASS`; six come off a bole). Satisfies
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
persistable singleton. In a `Wood` room the panel is *also* a nested
`{ref}` in the room's container slice and restores by the same
`singleton()` call; in the fuel yard (a transient room) it is the panel's
own singleton record that carries it across a restart. That is what
makes AC 8 true for the yard: a harvested panel's stools are captured as
`{ref, key}` nested hosts in the panel's container slice and restored on
the next boot, elapsed time integrated by the growth model's
reconcile-on-read. Each panel is **its own row** (one instance per
template path): the yard's, and one per wood clearing.

**No own fields.** `standId` is deleted (revised 2026-09-17): the room
the panel stands in IS the stand. `static commandContributions`
re-declares Cultivable's four **plus** `trade/forestry/cmd/forestry/fell.yaml`
in `peers` (a mature standard in a panel is felled where it stands;
⚠ a class's own static shadows the composed mixin's list, so the four
cultivation views are copied in — `ranching.md § What the carcass opened
onto` records the one-direction silent failure).

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
across a restart — true), and one-per-row (true: a panel is a
place-thing; a second cant is a second row).

**Rejected.** Leaving the panel a `GardenBed` in a non-persistable room
(the shipped shape — a full panel every boot, a faucet through
`restart`). Making the fuel yard's cant a tiny `Wood` room of its own
(the yard is a `SingletonCartesianLocation` with a business in it; its
class does not change).

### D6 — planting a standard is the kernel `plant` into a `Panel`; the deed is written by the ground, and the ground asks its room

The kernel `plant <acorn> in <panel>` runs **unchanged**: `PlantController`
narrows `isCultivable(target)` (a Panel is), the land-use gate passes
(D13), `hasSoil`, a free slot (the panel's `plant` slot has capacity 8:
six stools + two standards — coppice-with-standards is one panel doing
both, the slate's own sentence), mints the sapling, seats it, credits
the plant's `discipline` (D7).

**The sapling rows** (`trade-forestry/content/trade/forestry/thing/plant/oak-standard.yaml`,
`ash-standard.yaml`): `class: /platform/thing/Plant`, `_speciesPath` the
tree, `_materialPath: …/tissue/plant-tissue`, `lifecycleState: alive`,
`harvestTemplatePath: null` (a standard is not harvested — it is felled),
`discipline: silviculture`, `standardMaterialPath: …/wood/oak` (D7's
third field — what a felled one is made of when no stand answers for
it), profile `luxHappyAt: 20`, `luxDarkAt: 3`, `moistureHappyAt: 0.25`,
`moistureWiltAt: 0.05`, `litresPerGameDay: 0.3`,
`rootDemand {seedling: 0.5, young: 3, established: 10, mature: 20}`,
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
`const room = this.getContainer(); if (room && MixinApi.isActive(room, STAND_MIXIN)) { room.recordPlanting({plantKey: candidate.getPersistenceKey(), planter: author.getIdentityPath(), planterName: author.getPresentation(), speciesPath, gameDay}); void PersistableApi.captureHostOf(room); }`
— **the panel asks its container for the stand**; in the fuel yard the
container is not a Wood and no planting is recorded (the former
`standId: ''` case, now *the container is not a Wood*); (2) if
`MixinApi.isPersona(author)`,
`void author.recordChronicleOnce('forestry:planting:' + plantKey, { template: 'planted {{species}} standard in {{where}}', vars, tags: ['forestry', 'planting'], where: room path })`
— `recordChronicleOnce` because a deed is minted once per tree, and its
key is the tree. Both fire-and-forget with a `console.warn` on failure.
`Plant.getPersistenceKey()` mints the key on demand, so it is stable
from the first call.

**Why the ground writes it and not the verb:** the deed is a fact about
*this panel in this clearing* — which stand it joined — and only the
panel knows its room. The verb knows a seed and a bed.

**Fifteen game years is stated, not promised:** the sapling row's
`daysToStage.mature: 5400` and the stand prose are the statement;
nothing in this build can observe the maturity (450 real days).

### D7 — the coppice cut is the kernel `harvest`, told by the plant which tool and which Discipline

Two kernel fields on `GrowingMixin` (`lib/husbandry/Growing.ts`
`fieldMeta`, persistent + authorable, beside `harvestTemplatePath`):

- `harvestTool: string = ''` — the **capability kind** the cut needs
  (`''` = none; a carrot is pulled by hand). Getter `getHarvestTool()`.
- `discipline: string = 'horticulture'` — the Discipline this plant's
  husbandry exercises. Getter `getDiscipline()`.

And a third on `Plant` (the class, beside `seedTemplatePath`):
`standardMaterialPath: string | null = null` — what a felled standard is
made of when no stand answers for it (a planted tree in a panel whose
room is not a Wood — the fuel yard). Read only by
`FellController.fellPlanted`. **Kept** through the revision: the yard
case is real.

`HarvestController`: after resolving the plant and before the
`isHarvestable` refusal, `const need = plant.getHarvestTool(); if (need) { const tool = model.tool?.stuff ?? null; if (!tool || !MixinApi.isTool(tool) || !tool.hasCapability(need)) → refuse *"You need something that cuts to take that — a billhook, or an axe."* (`needs-tool`) }`
— **no `toolFor` hunt** (revised 2026-09-17: `lint:instrument-args` on
`design/grain-chain`). The view's `default:` does the finding: a plant
that authors no `harvestTool` ignores whatever bound. The credit becomes
`discipline: plant.getDiscipline()`. `PlantController` credits
`plant.getDiscipline()` too (the minted plant is in scope at L237).
`harvest.yaml` gains:

```yaml
  - name: tool
    type: object
    required: false
    prepositions: [with, using]
    default: "reachable:[capability.cutting]"   # the one kind any plant asks for today
    scope: ["reachable"]
    requires: [ToolMixin]
```

and `HarvestModel` gains `tool?: MqlOneResult` (`lint:binder-models`).
⚠ The default names `cutting` because it is the only `harvestTool`
any shipped row authors; a future plant wanting another kind adds a
second default or the arg is named. `lint:capabilities` (also grain's)
wants every kind CONSUMED — `felling` is consumed by `fell.yaml`'s
default and `hasCapability('felling')`, `cutting` already is.
The hazel-stool row authors `harvestTool: cutting`,
`discipline: silviculture`. Every other plant row authors neither and
behaves exactly as today — the phase-1 suite is the proof.

**Host placement:** `GrowingMixin` — *what it is cut with* and *what its
keeping exercises* are facts about the plant, not about the verb, and
the alternative (a `harvest`-side species table) is a content word in
the kernel. `lint:unconsumed-seams` does not count `lib/` fields and
both have readers in the same wave regardless.

`silviculture` is therefore credited by: `fell` (D3); `harvest` of any
plant whose row says so (the stool); `plant` of a seed whose plant says
so (the acorn → `oak-standard`). AC 12.

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
→ **true on a fresh boot**. A cut runs `settleCycle()`; the next
reconcile latches (`_vigor 0.9 ≥ 0.8`) and reopens the window; fill
accrues at `limiting × dt / (360 × DAY)` — at full satisfaction the
panel is ready again in exactly one game year, and a stressed panel
later. The old `daysToStage.mature: 2500` and `fruitFillDays: 120` are
replaced, not tuned; the header's *"ALREADY GROWN"* claim finally
describes the row. The species row's *"cut-and-regrow ROTATION"* seam
paragraph is retired with the move, and the `burn.test.ts` assertion
that reads it moves with the row (W2).

**Yields less if cut sooner.** The kernel refuses an unripe polycarp
(`nothing-ripe`) rather than yielding less. This plan does not add a
partial-yield rule — recorded in § Risks & opens as the one AC read
loosely.

### D10 — the row moves, the pack graph, and who depends on whom

Moves into `trade-forestry` (`packages/content/trade-forestry/content/`):
`trade/forestry/thing/{cordwood, hazel-stool, felling-axe, billhook}.yaml`,
`recipes/{felling-axe, billhook}.yaml` (`outputTemplate` re-pointed;
`discipline: mining` kept — renaming a recipe's Discipline is not this
build's), and the hazel species row at the same taxonomy path (path
unchanged; owning pack changed — two packs may not ship one path, so it
is a move, not a copy). The coppice panel becomes a **venue row**
(D5): `rejection/content/world/rejection/thing/fuel-yard-panel.yaml`,
`class: /trade/forestry/thing/Panel`, the six stools now
`/trade/forestry/thing/hazel-stool`, `capacity: 8`;
`trade/fuel/thing/coppice-panel.yaml` is deleted.

Every reference in § Grounding updated: `fuel-yard.yaml` props (the
panel path, the two tool paths, the comments); `burn.test.ts` — the
`describe('the coppice')` block **moves** to
`trade-forestry/src/__tests__/coppice.test.ts` (the `> 2000` assertion
becomes `=== 360`, the species-paragraph assertion is retired);
`archetype-and-ladder.test.ts:154–159` drops `'billhook', 'felling-axe'`;
both metal wire tests' `packs:` gain `'trade-forestry'`;
`trade-fuel/README.md` L3–8 points at forestry;
`antipatterns.md:4397–4435` and `smallholding.md:56–66` re-pointed (W6).

**Dependencies.** `rejection/package.json` gains
`"@saxonberg/content-trade-forestry": "workspace:*"` (its rows name
forestry classes — `Wood`, `Panel` — and the class-source resolver
needs the pack installed first). Root `package.json` gains the same line
(alphabetical, after `content-trade-farming`). ⚠ **`trade-fuel` and
`trade-mining` do NOT gain the dependency**: neither imports a forestry
class or names a forestry path (`CharController` is keyword-driven;
`timber-set` matches the `wood` tag), and a `dependsOn` edge is *"the
line that lets a pack's code import another pack's classes"*
(content-packs.md:131). A salt town with a fuel yard fed by a bought
stock line must be installable without a forester. Forestry depends on
`base-library`, `generic-objects`, `platform`, `server`, `types` — and
on nothing else. ⚠ **`pack.yaml` carries `requires.groups` and NO
`requires.title`**: with the register gone, nothing forestry ships needs
a title claim (`lint:untitled` covers only the nine title roots —
`/trade/forestry/…` rows are template paths, not documents on a titled
branch; verify with the gate in W1, and add the claim only if it
fires).

**After W2 lands: `pnpm install` and `pnpm --filter @saxonberg/server reset:db`**
— a template-path move is a drop, never a migration.

### D11 — seven wood materials in the commons, with numbers a substrate reads

`base-library/content/stuff/idea/material/wood/{ash, hazel, beech, elm, willow, pine, yew}.yaml`
on the oak row's shape. Every row: `tags: ["wood", "mixture", "organic", "flammable", "once-living"]`,
`edibility: false`, `nutrients: ["cellulose"]`, `composition: []`,
`chemistry: null`, and `biologicalSource: { speciesPath: <the tree>, tissueType: wood }`;
oak gains the same and loses its *"until an oak-tree species"* sentence.
The numbers (density kg/m³ · hardness MPa · toughness MJ/m³ ·
waterAbsorptionCapacity % · autoignition K · heatOfCombustion MJ/kg ·
thermalConductivity W/mK; electrical conductivity 1.0e-4 for all):

| wood | density | hardness | toughness | absorb | autoign | heat | cond | the number that makes it so |
|---|---|---|---|---|---|---|---|---|
| oak *(ships)* | 750 | 40 | 60 | 28 | 570 | 16 | 0.17 | dense and hard |
| ash | 690 | 36 | **95** | 30 | 570 | 16 | 0.16 | the toughest common timber — a haft |
| hazel | 620 | 26 | 55 | 32 | 560 | 16 | 0.15 | light, fast, chars well |
| beech | 720 | 42 | 65 | 30 | 570 | 17 | 0.17 | dense, hard, splits clean — the best firewood |
| elm | 560 | 30 | 70 | 35 | 570 | 15 | 0.14 | will not split; does not rot wet |
| willow | 420 | 18 | 60 | 40 | 550 | 15 | 0.12 | very light, very tough |
| pine | 510 | 22 | 30 | 35 | **540** | **18** | 0.12 | light, soft, resinous — lights first, burns hottest |
| yew | 670 | 38 | **110** | 25 | 580 | 16 | 0.15 | extreme toughness for its weight — the bow |

(Each row's comment names which substrate reads which number.) The
garden bed's `wood/pine` resolves; a test in
`trade-forestry/src/__tests__/wood-vocabulary.test.ts` walks every
`_materialPath`/`material:` under `material/wood/` across all packs and
every wood material's `biologicalSource.speciesPath` and asserts both
resolve to a file (the `verb-gates.test.ts` shape).

### D12 — eight tree species, in the pack that grows them

`trade-forestry/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/…`
at the standard taxonomy paths: `fagales/fagaceae/quercus/robur`,
`lamiales/oleaceae/fraxinus/excelsior`, `fagales/fagaceae/fagus/sylvatica`,
`rosales/ulmaceae/ulmus/glabra`, `malpighiales/salicaceae/salix/alba`,
`fagales/betulaceae/corylus/avellana` (moved), and the two conifers under
`plantae/tracheophyta/pinopsida/pinales/pinaceae/pinus/sylvestris` and
`…/pinales/taxaceae/taxus/baccata`. Each on `avellana.yaml`'s shape;
**`_defaultMaterialPath: /stuff/idea/material/tissue/plant-tissue`** —
confirmed correct: the species' default material is the living
organism's; the wood is the material row's fact. `lifespanMax`: oak 600,
ash 250, beech 300, elm 350, willow 80, pine 300, yew 2000, hazel 80.

### D13 — the Hanging Wood: a sub-zone, four rooms of which three are Woods, one biome, common land that may be planted

**Zone** `rejection/content/world/rejection/hanging-wood.yaml` —
`/platform/idea/location/CartesianZone`, `name: the Hanging Wood`,
`cellSize: 10.0`, `address: terminus/rejection/hanging-wood`. It
inherits `deposit:` from the region zone by the outward walk — § Risks.

**Rooms** under `hanging-wood/`, `_biomePath: /stuff/idea/biome/outdoor/woodland`,
coords on the wood's own grid, exits cardinal so the grid rule holds:

| room | class | coords | exits | props | `mix` (standing/capacity/+per year) | ambient (lm) |
|---|---|---|---|---|---|---|
| `treeline` — the ride's end above the hillside; the yard's smoke visible below | `/platform/location/SingletonCartesianLocation` — **not a Wood**: the edge, scrub and the view; nothing stands here worth the axe, and saying so with a class is honest | (0,0,0) | `south` → `/world/rejection/location/hillside`; `north` → ride | — | — | 5000 (lit) |
| `ride` — the main ride under the canopy | `/trade/forestry/location/Wood` | (0,1,0) | `south` treeline; `north` oak-clearing; `west` hazel-cant | — | oak 8/10/+1 · ash 4/6/+1 (a thin mix; the ride is edged with standards) | 1500 (dim) |
| `oak-clearing` — the big tree the prose is about | `Wood` | (0,2,0) | `south` ride | `panel-north` | oak 12/14/+1 · ash 4/6/+1 | 3500 (lit) |
| `hazel-cant` — a clearing with a coppice panel | `Wood` | (−1,1,0) | `east` ride | `panel-west` | oak 4/6/+1 · ash 4/4/+1 | 3500 (lit) |

Thirty-six standards over three rooms (24 oak, 12 ash — the first
draft's total, now distributed): the same one-and-a-half real minutes to
fell the lot, and the increment brings back two trees a game year per
room. ⚠ **The requirements' "the wood has one stand" is now three** (the
treeline has none) — each clearing reads and depletes its own; the wood
is their sum and no reading gives the sum. Recorded in § Risks & opens
as the deviation the user accepted with the move. Each Wood row authors
`woodName: the Hanging Wood`, `areaM2: 100`, and its `reserves:` (D1).
`hillside.yaml` gains `north: { destination: /world/rejection/hanging-wood/treeline, edgeMinutes: 4 }`.
The two clearings prop their own panel row
(`hanging-wood/thing/panel-north.yaml`, `panel-west.yaml`:
`class: /trade/forestry/thing/Panel`, `capacity: 8`, six stools,
reserves as the yard's, `interiorCapacity: 180`). Prose: authored,
invariant, and it never mentions a number the stand holds. The
treeline's `details:` carry `smoke`, the ride `litter`, `birdsong`.

**Biome** `base-library/content/stuff/idea/biome/outdoor/woodland.yaml`
— `class: /platform/idea/SkyExposedBiome` (rain reaches the panels AND
the Wood rooms' soil — `SoilMixin`'s rain edge is gated on
`BiomeApi.isSkyExposed`; a canopy that delays it is the light tail's),
`_extendsBiomePath: …/outdoor/baseline`, `_defaultHumidity: { value: 70, unit: "%" }`,
`_defaultWind: { value: 2, unit: "m/s" }`, `_ambientSoundMml`,
`_ambientSmellMml`.

**Title** in `rejection/pack.yaml`:
`{ extent: /world/rejection/hanging-wood, parentParcel: /world/rejection, holder: { group: rejection }, landUse: agricultural }`.
⚠ **Not `wild`**: `LandUse.ts` says `wild` admits **no** cultivation, and
`PlantController.ts:104–150` refuses `plant` on any `fixedGround` bed in
a covered parcel whose use forbids it — so a `wild` wood makes AC 6
unreachable. `agricultural` — *"cultivation at scale, livestock and
orchards"* — is the honest word for a worked common (ISCED `0821` sits
under `08 Agriculture, forestry, fisheries`). The **holder** stays the
settlement's group — *common land* is who holds it. Flagged in § Risks.

The fuel-yard prose gains one line: *"Above the yard the hill goes up
into trees — the Hanging Wood, which is where all of this comes from."*

### D14 — daylight is authored, per room, against the room's own cell

`lux = lm / cellSize²`. For Rejection's 10 m cells: dim ≥ 500 lm, lit
≥ 2000, bright ≥ 6000; direct sun 8000. For the Kestrel road's 20 m
cells the same bands need ×4.

| room(s) | lm | band | why |
|---|---|---|---|
| pithead-yard, claims-office, hillside, fuel-yard, smelter, assay-shed, old-workings | 8000 | bright | open hill under the sun |
| the-dry, provisioning | 2500 | lit | interiors with a door open and a lamp |
| adit | 800 | dim | the portal — daylight reaching in |
| fringe-claim, far-fringe | 8000 | bright | open fell |
| Kestrel road ×5 | 24000 | bright | 60 lux over a 400 m² cell; the shipped 600 read very-dim |
| the Ferrow (8 rooms), hush, gallery | *unchanged* | pitch-black | underground, as designed |
| treeline / ride / clearings | 5000 / 1500 / 3500 | lit / dim / lit | the wood is dimmer than the hill and its clearings brighter than its rides |

`ambientColorTemperature: 5800` on every outdoor row; `3200` on the two
lamp-lit interiors. **Night is not modelled**: `AmbientLit` is a
constant; the authored value is the day value, and AC 1's *"at every
hour"* is satisfied because every hour is this one. Stated in
`forestry.md` and the drive record.

### D15 — reading the stand is `look` at the room; `analyze wood` is deferred

`look` in a Wood room renders the room's authored prose plus D2's
derived reading — species, count in words, age, plantings. **There is
no fixture to `look` at**: the stand is the place, and reading the place
is `look`. That satisfies AC 2 and the drive's step 6 with one
mechanism. The `analyze wood` stanza on the platform `analyze.yaml` (a
numbers card: the increment, the moisture factor, the year the clearing
fails) is deferred to the slate — the arithmetic is the player's, which
is the lesson.

### D16 — the tools carry their epoch on `ToolMixin`, and its reader is the covenant's

`lib/craft/Tooled.ts` `ToolMixin` gains `epoch: string = ''` (persistent
+ authorable; getter `getEpoch()`), and the felling-axe and billhook
rows author `epoch: medieval`. **What composing it claims:** every tool
has an epoch — true (`''` = unstated). Rejected: a tag (tools have no
tag vocabulary); an entry on `CapabilitySpec` (closed, and per-capability
is wrong). `lint:unconsumed-seams` does not count `lib/` mixin fields,
so the gate passes structurally — but the field is **knowingly unread
in this build**; its first reader is the land-use covenant's predicate.
Recorded in § Risks & opens.

### D17 — one Discipline, `silviculture`, credited by three acts

`trade-forestry/content/trade/forestry/idea/Discipline/silviculture.yaml`
— `key: silviculture`, `channel: skill`, `label: Silviculture`,
`iscedf: "0821"`, `specializes: [agriculture]`, `requires: []`, a
description in the mining row's voice. Credited by `fell` (`standard`
for a standard, `easy` for a cross-cut), by `harvest` of a plant whose
`discipline` says so (`easy`), by `plant` of a standard (`trivial`).

### D18 — the charcoal arithmetic, stated in the panel rows

Per burn: 8 lengths at `yieldRatio: 0.35`, draught 0.45
(`efficiency = 0.975`) → `floor(2.73) = 2` baskets — one smelt. A panel
gives 6 × 8 = 48 lengths a game year = 6 burns = 12 baskets = **6 smelts
per panel per game year**; three panels → 18 smelts a year realm-wide.
Stated in each panel row's header with *"this is not a number to raise
when somebody runs out"*, and asserted by `coppice.test.ts` from the
clamp row, the recipe and the stool's `fruitSetCount`.

### D19 — the drive is a wire file; the second instance is a collection test

`packages/wire/tests/forestry.dirty.wire.test.ts` walks the
requirements' drive 1–13 (§ Test & gate strategy). Step 14 (*a second
stand row for a second locality installs with no code*) is
`trade-forestry/src/__tests__/second-wood.test.ts`: under `test-bootstrap`,
a second in-test `Wood` template row with its own `mix:` in its own
zone; assert it registers, `standingNow` derives from the authored
block, `fell` is in the afforded commands for an actor placed in it,
and the first Wood is untouched. No scratch pack: the property proved is
*a row and a class the pack already ships*.

### D20 — docs

`docs/subsystems/forestry.md` (new): ⭐ **opens with the four
representations of a tree** — a *place* (the stand: a standing cover on
a Wood room, drunk from its soil), a *record* (rejected here and why —
a stand does not move), a *slot-plant* (tended, cut, planted, yours), a
*prop* (a landmark; scenery by design) — and which of the tree's axes
lives where; then the Wood (persistable singleton location, authored
reserves, the three soil hooks, `singleton()` as its establishing
context, what a fresh boot does with an authored `mix:` versus a
snapshot), `StandMixin` (derive on read, the moisture factor, the cut,
the increment from zero, the Sward parallel and the Cover seam), `fell`
and the bole, the panel (persistable singleton, ready-on-boot authoring,
the ready line), coppice with standards (the slot arithmetic, the deed
written by the ground asking its room), the wood vocabulary table, the
charcoal arithmetic, the daylight rule and *no night*, the
second-instance recipe (a Locality authors clearings on `Wood` with a
`mix:` each, panels, and a zone; zero code), and the restart procedure.
Edits: `smallholding.md:56–66` (grown plants ARE authored; → forestry.md);
`husbandry.md` (the two new Growing fields); `soil.md` (one line: the
Wood is soil's third location-shaped composer, and the seeded half is
still farming's); `ranching.md` (one line: the stand is NOT the
herdbook's fourth consumer — it is Field's second; → forestry.md);
`mining.md:200–203` (timber now has a source); `content-packs.md` (the
pack count); `antipatterns.md:4397–4435` (paths re-pointed, the two
*"does NOT fix"* items closed → forestry.md); `light.md` — nothing.
`CLAUDE.md`'s map line and the slates README are **swept**.

### D21 — wave order

Kernel first (W0) because W2's rows author fields W0 declares; the pack
and the vocabulary (W1) before the moves (W2); the Wood, the stand and
`fell` (W3) before planting (W4) because the deed asks the room; the
Hanging Wood (W5) last among content; the drive (W6) last. Each wave
lands green on `pnpm test:near` + every touched pack's vitest +
`lint:family`, and each ends at a commit.

### D22 — what is deliberately NOT built, and where each goes

The Cover seam (Sward + Stand → a kernel `lib/husbandry/Cover`) → a
kernel tail on the third instance; the seeded site character for a Wood
(farming's `GroundCharacter`, unreachable without a kernel promotion of
the seeded half) → soil.md's own *promote on the third consumer* rule;
`analyze wood` → forestry-slate; sawing → `trade-sawing`; foraging →
discovery; the engaged-act base → a kernel tail; partial yield →
forestry-slate; night → the light tail. § Deferred seams has the
pointers.

---

## ⭐⭐ Host placement

| what | host | what composing it claims | why not the alternatives |
|---|---|---|---|
| `Wood` (`PersistableMixin(StandMixin(SoilMixin(ReservedMixin(SingletonCartesianLocation))))`) | `trade-forestry/src/location/`; ROWS are Rejection's | every Wood room is soil, a persistence host, and one-per-row | not `Field` (a minted, keyed, warren-member KIND of place); not `PersistentCartesianLocation` extended (Persistable must be outermost and the Wood adds mixins inside it); not `SingletonCartesianLocation` + a fixture (the first draft — a Thing standing in for the room's ground) |
| `StandMixin` | `trade-forestry/src/lib/`, composed by `Wood` | a `Reserved` host may carry a standing cover of trees, drunk from its soil | not the kernel (one composer; the Cover seam waits for the third instance); not a document (a stand does not move); not on the zone (a pack cannot add a field to a kernel class) |
| `mix`, `standStamp`, `plantings`, `cutLog` | `StandMixin` | the cover's own state, on the place | not on `Panel` (a panel is a bed in the room, not the room) |
| `woodName`, `areaM2`, authored `reserves:` | `Wood` | a wood is named and sized ground | `reserves:` authored because `GroundCharacter` (which derives Field's) is farming's |
| `fell` affordance (`self` + `inventory`) | `StandMixin.commandContributions` | whoever stands in a room with a stand may fell | the Sward shape (`Sward.ts:204–214`); not `environment`/`peers` (wrong buckets for a location host) |
| the derived reading | `StandMixin.markupAugmenters` | the room's `look` says what stands in it | not a fixture; not a card |
| `Panel` (`PersistableMixin(SingletonMixin(PostRegistrationMixin(GardenBed)))`) | `trade-forestry/src/thing/`; ROWS are venue content | every panel is a bed, a persistence host, one-per-row | not `GardenBed` in place (a full panel every boot — AC 8) |
| planting deed hook | `Panel.occupy` → `container.recordPlanting` when the container is a Wood | the ground that receives a standard tells its room | not `PlantController` (kernel must not learn forestry); not `Wood` watching its contents (a slot arrival is the panel's event) |
| `harvestTool` | `GrowingMixin` (kernel) | **every growing thing can say what cuts it**; `''` = hands | not on the view/controller (a species table in the kernel) |
| `discipline` | `GrowingMixin` (kernel) | every growing thing can say which Discipline its keeping exercises | the same |
| `standardMaterialPath` | `Plant` (kernel class) | a plant may name the wood a felled one is made of; `null` = not a standard | not on `GrowingMixin` (a Plant-shaped question — `seedTemplatePath`'s host); kept for the planted-in-the-yard case |
| `tool` arg | `harvest.yaml` (kernel view) | the cut may name its instrument | the instrument-is-an-argument rule |
| `epoch` | `ToolMixin` (kernel) | every tool has an epoch (`''` = unstated) | not a tag; not on `CapabilitySpec` |
| `Bole` (`DetailedMixin(Thing)`) + `lengthsLeft` | `trade-forestry/src/thing/` | a felled trunk knows how many lengths are left in it, and affords its own cross-cut | not `Firewood` (not fuel until logs); not `Crop`; not a counter on the room (a bole moves) |
| `felling` capability | the felling-axe **row** | a felling axe fells; a billhook does not | not `cutting` (a knife would fell an oak) |
| `fell` view + `FellController extends ManualBuildController` | `trade-forestry/content/…/cmd/forestry/` + `src/idea/cmd/forestry/` | the trade's act, on the kernel's engaged-act base; the stand found as the giver's container | not a `ForestryActController` copy; not a stanza |
| `timber`, `log`, `bole`, `felled-tree`, `cordwood`, seeds, `hazel-stool`, tools, recipes, `silviculture` | `trade-forestry/content/` | the producer trade owns its products, its stool, its instruments and its Discipline | not `trade-fuel` (a customer); not `rejection` (a second wood grows the same hazel) |
| the seven wood materials + the species | `base-library` · `trade-forestry` | what things are; what grows | the oak/charcoal precedents |
| the wood: zone, four rooms (three `Wood`), panel rows, biome, title, the hillside exit | `rejection` (rows) · `base-library` (biome) | the venue = expression; the pack ships no code | the second-instance test passing on the first instance |
| `ambientIntensity` on 17 rows | `rejection` | each room says its daylight | not the biome (not a light source in this model) |

**The narrowing test, applied.** `fell` narrows its *target* (a stool is
not a standard) and its *instrument* (`felling`) — the shore shape; the
room is narrowed by `isActive(room, STAND_MIXIN)` exactly as `hew`
narrows its working, which is *finding the host*, not re-narrowing a
host set. `harvestTool` is read by the one verb that cuts, on every
plant, and a plant that authors none skips the branch.

---

## Convention conformance

- **`props:` / `cast:`** — every placement uses `props:`.
- **Locations, not rooms** — the wood's four rows are locations: one
  `SingletonCartesianLocation`, three `Wood` (a pack Location class, the
  `AuthoredWorking`/`Field` precedent); no `FurnishableRoom`; every one
  has `coords` in a `CartesianZone` with `cellSize` (every location
  plots — `unplottedLocations`).
- **The five axes / `<root>/<branch>/`** — `/trade/forestry/{thing,idea,location,lib}/…`
  (`lib/` for the mixin: *substrate only ever inherited*, the arcana
  `ManaPowered` precedent), `/trade/forestry/idea/cmd/forestry/FellController`,
  the view at `content/trade/forestry/cmd/forestry/fell.yaml`; materials
  at `/stuff/idea/material/wood/…`; the wood at `/world/rejection/hanging-wood/…`.
  `forestry` is a new command **category** (the sweep adds the word).
- **Module categories** — the pack ships `src/{location,lib,thing,idea}`
  + tests; no Api, no logic singleton, no free helper (`fellStandard`,
  `crosscut`, `fellPlanted` are module-private functions in the
  controller module).
- **Module scope declares** — constants are `const`; nothing executes at
  module scope.
- **Import boundary** — pack code imports the kernel only by
  `@saxonberg/server/mud/...` specifiers; nothing from another pack's
  `src/` (⚠ `SwardMixin` is `trade-farming`'s and is **not imported** —
  the Stand copies its shape). `lint:imports` + `lint:boundary`.
- **Verbs on objects** — `stand.cut()`, `room.recordPlanting()`,
  `panel.occupy()`, `plant.getHarvestTool()`; no `XApi.verb(host)`.
- **`_mixinName`** — `StandMixin` is a pack mixin: registered at pack
  discovery, never added to `Mixins`; a plain literal static.
  `lint:mixin-names` is for kernel mixins.
- **Persona keys** — `planter: author.getIdentityPath()`.
- **Gates this build must pass**: `lint:family` in full; by name —
  `verb-collisions`, `arg-kinds` (the `target` absence is deliberate and
  tested; confirm the gate accepts an object arg with no `requires` —
  if it does not, the gate's own exemption shape applies and the reason
  is the polymorphic slot), `binder-models`, `census`, `untitled`,
  `perishable`, `instanceable`, `locations` (no roster edit), `imports`,
  `boundary`, `module-scope`, `unconsumed-seams` (unchanged),
  `test-bootstrap`, `test-content`, `world-scan`.

---

## Waves

### W0 — the kernel seams

**Goal.** Everything a forestry row needs to say that the kernel cannot
hear today. Implements D7, D16. **No `DocumentKinds` edit** (revised).

**Files.**
- `packages/server/src/mud/lib/husbandry/Growing.ts` — `harvestTool`,
  `discipline`.
- `packages/server/src/mud/platform/thing/Plant.ts` — `standardMaterialPath`.
- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — `tool?` on the model; `toolFor`; the `needs-tool` refusal;
  `discipline: plant.getDiscipline()`.
- `packages/server/src/mud/platform/idea/cmd/inventory/PlantController.ts`
  — `discipline: plant.getDiscipline()`.
- `packages/content/platform/content/platform/cmd/inventory/harvest.yaml`
  — the `tool` arg.
- `packages/server/src/mud/lib/craft/Tooled.ts` — `epoch`.
- Tests beside each: `Growing.test.ts`, `HarvestController.test.ts`
  (needs-tool; held tool harvests; no-tool plant unchanged; the credit
  reads the plant), `PlantController.test.ts` (credit), an arg-gate test
  for `harvest.yaml`'s `tool` (`ToolItem` composes `ToolMixin`),
  `Tooled.test.ts` (epoch hydrates).

**Acceptance.** `pnpm test:near` green; `lint:family` green. No row
changes behaviour yet.

**Commit.** `build(forestry W0): the kernel seams — the plant names its tool and its Discipline, the tool its epoch`

> ✅ **W0 done (2026-09-17).** As planned. One thing the build found:
> the harvest credit reads the plant's Discipline AFTER an annual is
> destructed — a destroyed proxy reads `undefined` — so the Discipline
> is read up front beside the grade (the same reason the grade is read
> first). The `harvest.yaml` arg-gate test lives at
> `cmd/inventory/__tests__/harvest-view.test.ts` (the `verb-gates` shape).

### W1 — the pack, the woods and their species

**Goal.** `trade-forestry` exists and installs empty of acts; the realm
speaks eight woods. Implements D10 (the scaffold), D11, D12.

**Files.**
- `packages/content/trade-forestry/{pack.yaml, package.json, tsconfig.json, vitest.config.ts, README.md}`
  — from `trade-fuel`'s: `id: trade-forestry`, `root: /trade/forestry`,
  `requires.groups: [{name: forestry, purpose: the forestry trade's own body, owner: {office: prime-minister}}]`,
  **no `requires.title`** (D10; add only if `lint:untitled` fires).
- Root `package.json` — the dependency line. **`pnpm install`.**
- Seven material rows (D11) in `base-library`; oak's `biologicalSource`.
- Eight species rows (D12) in `trade-forestry`; the hazel row **moved**.
- `trade-forestry/src/__tests__/wood-vocabulary.test.ts` (D11). ⚠ A
  pack with `src/` and no tests fails the root suite — the test dir
  lands here even though no class does until W2.

**Acceptance.** Boot: `pack status` lists `trade-forestry`; the species
and materials warm; the garden bed's `pine` resolves; `burn.test.ts`
still passes; `lint:untitled` green.

**Commit.** `build(forestry W1): the trade-forestry pack, and eight woods with their species`

### W2 — the rows move; the panel becomes a Panel; the stool is ready

**Goal.** The producer owns its products, its stool and its tools; the
yard's panel persists and is cuttable on a fresh boot. Implements D5,
D8, D9, D10 (the moves). **Drop the dev DB after.**

**Files.**
- `trade-forestry/src/thing/Panel.ts` (D5, no `standId`) + `Panel.test.ts`
  (the composition; the ready line; **a materialize round-trip**: seat
  six stools, harvest one, `PersistableApi.capture(panel)`, clone a
  fresh shell, `materialize`, assert the harvested stool comes back with
  `_fruitFill` 0 and the others at 1 — the AC 8 proof at unit scale).
- Moves (D10): `cordwood.yaml` (→ `Crop`, hazel), `hazel-stool.yaml`
  (D9), `felling-axe.yaml` (`felling`, `epoch`), `billhook.yaml`
  (`epoch`), the two recipes; delete `trade-fuel/…/coppice-panel.yaml`.
- `rejection/content/world/rejection/thing/fuel-yard-panel.yaml` (D5,
  capacity 8, D18's header) and `fuel-yard.yaml` props + the prose line.
- `rejection/package.json` — the forestry dependency.
- `burn.test.ts` → the coppice block moves to
  `trade-forestry/src/__tests__/coppice.test.ts`; `trade-fuel/README.md`.
- `trade-mining/src/__tests__/archetype-and-ladder.test.ts:154–159`.
- `packages/wire/tests/{metallurgy,metal-chain}.dirty.wire.test.ts` —
  `packs:` + `'trade-forestry'`.
- `pnpm --filter @saxonberg/server reset:db`; boot; **`look panel` in
  the fuel yard reads *ready to cut*; `harvest panel with billhook`
  yields eight lengths of hazel; restart; `look panel` reads
  *regrowing*.**

**Acceptance.** Both metal wire files still pass; `lint:census`
resolves every moved path; `lint:perishable` green.

**Commit.** `build(forestry W2): cordwood, the stool, the axe and the billhook move to forestry; the panel persists and is ready on a fresh boot`

### W3 — the Wood, the stand, and `fell`

**Goal.** A place that is a stand can be read and felled to nothing, and
remembers it. Implements D1, D2, D3, D4, D17.

**Files.**
- `trade-forestry/src/lib/Stand.ts` (D2) + `Stand.test.ts` (an in-test
  `Reserved` host composing `StandMixin` and `SoilMixin`: `standingNow`
  from an authored `mix` with no clock; the increment over a year at
  full moisture; **half the increment at half the drought curve**
  (`soilMoistureFraction` 0.175); capped at capacity; `cut` to empty
  refuses on the next; the increment from zero; `recordPlanting`/
  `removePlanting`; the augmenter's lines for a founding mix, a
  planting, an empty stand; the transpiration figure).
- `trade-forestry/src/location/Wood.ts` (D1) + `Wood.test.ts` (the
  composition reaches `PersistableMixin`, `SingletonMixin`, `SoilMixin`,
  `StandMixin`, and `extendsAny` would find `SingletonCartesianLocation`
  — assert the import specifier textually, the `verb-gates` shape; the
  three soil hooks answer as D1 says; **the singleton opt-in round-trip**
  — the `PersistentCartesianLocation.test.ts` cases: a `Wood` row with
  `mix:` + a propped Panel, `StuffApi.singleton` seeds and captures;
  `cut` one; a second `singleton` call on a fresh registry restores
  the cut count and the panel rather than re-seeding the authored
  `mix:`).
- `trade-forestry/content/trade/forestry/cmd/forestry/fell.yaml`,
  `content/trade/forestry/idea/cmd/forestry/FellController.yaml`,
  `src/idea/cmd/forestry/FellController.ts` (D3) + `FellController.test.ts`
  (refusals `no-stand`, `no-axe`, `wrong-tool`, `stand-empty`,
  `no-such-species`, `not-a-standard`, `not-yet-a-tree`; a felling drops
  ONE bole of the species' material and mass + 4 logs on the floor and a
  seed in hand and draws the room's stand down by one; `fell bole` ×6
  yields six timber and destructs the bole; the completions survive a
  destroyed giver, room and bole; the credits), the arg-gate test
  (`fell.yaml`'s `target` declares NO `requires`; `axe` requires
  `ToolMixin`), and **the dispatcher test** (`test-bootstrap`; an actor
  in a `Wood`; `fell oak` reaches `execute` with `target.stuff === null`
  and `raw === 'oak'` and cuts oak; `fell` alone cuts the most-standing
  species; `fell` is in the actor's afforded `commands` standing in the
  room — the `inventory` bucket — and NOT in a neighbouring room).
- `src/thing/Bole.ts` (D4) + `Bole.test.ts`.
- Rows: `thing/bole.yaml`, `thing/timber.yaml`, `thing/log.yaml`,
  `thing/felled-tree.yaml`, `thing/seed/{acorn,ash-key}.yaml` (D4),
  `idea/Discipline/silviculture.yaml` (D17).
- In-test Wood rows only; the Hanging Wood's are W5.

**Acceptance.** Under `test-bootstrap`: `fell` → 30 game-s → a bole of
~675 kg on the floor, four logs, an acorn in hand; `fell bole` ×6; a
dozen fellings later `fell oak` refuses in words about the wood and
`look` says so; the log lights (`ignite` over `Firewood`); the timber
matches `timber-set`; `fell` is afforded beside a bole with no stand.
`lint:locations` green with no roster edit.

**Commit.** `build(forestry W3): the Wood — a place that is a stand, drunk from its own soil; fell`

### W4 — planting a standard

**Goal.** A player plants an acorn in a panel; the room's stand and the
chronicle say so; a mature planted tree can be felled. Implements D6,
the rest of D7.

**Files.**
- `trade-forestry/content/trade/forestry/thing/plant/{oak-standard,ash-standard}.yaml`.
- `Panel.ts` — the `occupy` hook (D6); `Panel.test.ts` gains: a real
  arrival in a Wood with an acting author records a planting on the ROOM
  and one chronicle deed keyed on the plant; a **reseat** records
  nothing; a stool arrival records nothing; a Panel in a non-Wood room
  records the deed and no planting.
- `FellController.ts` — `fellPlanted`; tests: a mature `oak-standard`
  in a Wood's panel → bole + logs + seed with the room stand's material;
  in the yard's panel → the plant's `standardMaterialPath`;
  `established` → one `felled-tree` of 30 kg; `young` → 8 kg;
  `seedling` refuses; a stool refuses.
- `Stand.test.ts` gains the planting line.

**Acceptance.** `plant acorn in panel` seats an `oak-standard`;
`look` names the planter and the game day; `chronicle` shows the deed;
the credit is `silviculture`.

**Commit.** `build(forestry W4): planting a standard — the kernel plant into a panel, the deed written by the ground and told to its room`

### W5 — the Hanging Wood, and daylight over Rejection

**Goal.** The wood exists, is lit, is titled, and is three stands on
three clearings; Rejection's rooms stop reading *"something"*.
Implements D13, D14.

**Files.**
- `rejection/content/world/rejection/hanging-wood.yaml` (zone);
  `hanging-wood/{treeline,ride,oak-clearing,hazel-cant}.yaml` (three on
  `/trade/forestry/location/Wood` with `mix:`, `woodName`, `areaM2`,
  `reserves:`; the treeline plain); `hanging-wood/thing/{panel-north,panel-west}.yaml`;
  `location/hillside.yaml` (the `north` exit); `pack.yaml` (the title
  entry, `agricultural`).
- `base-library/content/stuff/idea/biome/outdoor/woodland.yaml`.
- `ambientIntensity` + `ambientColorTemperature` on the 12 `location/*.yaml`
  rows and the five `kestrel-road/*.yaml` rows (D14).
- `trade-forestry/src/__tests__/hanging-wood.test.ts` (reads the
  rejection rows by relative path): three rooms on `Wood` with a `mix:`
  whose `speciesPath`/`woodMaterialPath`/`seedPath` resolve; every
  `exits.*.destination` resolves; every room has `coords` and
  `ambientIntensity ≥ 500`; every Rejection surface room clears `dim`
  at `cellSize 10` and every Kestrel room clears `bright` at 20; no two
  rooms share coords; no two rooms prop the same panel path; the title
  entry is `agricultural`.

**Acceptance.** Boot on a fresh DB; `pithead → north → north → north`:
the treeline; `north`: the ride, `look` reads `dim` and *Oak stands
here — about eight trees' worth…*; `look` in the fuel yard names every
object. `lint:census`, `lint:untitled`, `lint:locations` green.

**Commit.** `build(forestry W5): the Hanging Wood above Rejection — a treeline, a ride and two clearings that are stands, and daylight on every room`

### W6 — the drive, and the docs

**Goal.** The requirements' drive runs over the wire and keeps running;
the knowledge lands in the subsystem docs. Implements D19, D20.

**Files.** `packages/wire/tests/forestry.dirty.wire.test.ts`;
`docs/subsystems/forestry.md` (new); edits per D20; this plan's § Drive
record (including the hand-run restart).

**Acceptance.** `pnpm wire` green with the forestry file in the run
report; then **`pnpm test` once**; push; open the MR.

**Commit.** `build(forestry W6): the wire drive, and forestry.md` then
`drive(forestry): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the stand | none (a place) | — | the Wood row's `mix:` block + `reserves:`; the zone over it (`coords`, `unplottedLocations`) | ⭐ the room is minted by `singleton()` on first arrival (`resolveLanding` → `singletonOrClone`) — **restore when a record exists under `/world/rejection/hanging-wood/<room>`, else hydrate the authored `mix:` and capture it**; after the first capture the row's numbers are inert (the record wins) — so an author who edits `mix:` on a live world sees no change until the DB is dropped, exactly as a `props:` edit never reaches a booted world | — |
| reading the stand | `look` (platform) | `StandMixin.markupAugmenters` on the room, collected by `getAllMarkupAugmenters` | `mix`, `plantings` on the room; the world clock (`null` clock → the stamped figures) | none — synchronous, no memo | — |
| `fell` a standard | `trade/forestry/cmd/forestry/fell.yaml` | **`StandMixin.commandContributions` `self` + `inventory` — a class static on a LOCATION, the Sward precedent (`Sward.ts:204–214`): whoever is nested in the room has the verb**; `Panel.commandContributions` (peers) for a planted tree; `Bole.commandContributions.self` | the `FellController.yaml` registration row; the felling-axe row's `felling`; the `bole`/`log`/`timber`/seed rows; the stand's `woodMaterialPath` + `seedPath` | the pack in the root manifest + `pnpm install`; `rejection` depends on it; the DB dropped after W2 | `target` declares NO `requires` (a bole, a plant, or a bare word landing as `raw`); `axe` requires `ToolMixin` (`ToolItem` composes it). The W3 arg-gate + dispatcher tests pin both |
| cross-cutting a bole | same view | `Bole.commandContributions.self` | the bole row; `lengthsLeft` | a bole in a Wood room rides the room's container slice | the bole binds by keyword |
| `fell` a planted standard | same view | the Panel's `peers` | the `oak-standard` row | — | the plant binds to `target` |
| the coppice cut | `harvest`/`pick` (platform) | `CultivableMixin.commandContributions.peers`, **re-declared on `Panel`** | the stool row's `harvestTool` + `discipline` + D9's fields; the billhook's `cutting`; `cordwood` | the panel row is minted through `singleton()` (`SingletonMixin`) in the yard; as a nested `{ref}` of a Wood room by the same call | `harvest.yaml`'s `tool` requires `ToolMixin`; `target` unchanged |
| planting a standard | `plant`/`sow` (platform, unchanged) | Cultivable's `plant.yaml` via `Panel`'s static | the acorn row; the panel's free slots; soil in the panel; **the title's `landUse` admitting cultivation (D13)** | — | `seed` requires `PlantableMixin`; `pot` requires `CultivableMixin` — **not widened** |
| the deed | none (a side effect of `occupy`) | — | the panel's container being a Wood (`isActive(room, STAND_MIXIN)`); an acting author in the frame | the chronicle is a no-op when Mongo is not connected — the unit test asserts the call, the drive asserts the row | — |
| `silviculture` credit | — | — | the Discipline row (warmed by class from any root) | confirm `help silviculture` after a fresh boot | — |
| the wood | `north` at the hillside | the exit pair | the zone row; every room's `coords`; the biome row; the Wood rows' `class:` | `rejection` depends on `trade-forestry` so `/trade/forestry` is in the class-source table before the wood's rows resolve `class:` | — |
| daylight | `look` | — | `ambientIntensity` on each row | none | — |
| the second instance | — | — | a Locality's clearings on `Wood` with `mix:`, panels, a zone | the same `singleton()` path | — |

⚠ The five silent failures to check by hand after W5: `fell` appears in
`commands` while standing on the ride, and does NOT on the treeline;
`look` on the ride shows the derived stand line; `harvest panel` in the
hazel cant is afforded; `plant acorn in panel` is not refused by the
land-use gate; `restart` → the ride's stand reads the cut count and the
yard panel reads *regrowing*.

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 walk in and back; every object named at every hour | W5 (the exit pair; D14; no night) |
| 2 read the stand: species, how much, how old, who planted | W3 (D2's augmenter on the room) + W4 (the planting line) — per clearing |
| 3 fell with the axe → timber + logs of the stand's wood; the stand reads smaller | W3 (D3, D4) |
| 4 cut any panel with the billhook → hazel cordwood; ready again one game year later; less if sooner | W2 (D7, D8, D9) + W5. ⚠ *less if sooner* is read as *refused until ripe* — § Risks |
| 5 the timber set from that timber; the clamp chars that cordwood; a hearth burns that log | W3 (the `wood` tag; `Firewood`) + W2 |
| 6 plant a standard; the record carries the name; mature in fifteen game years | W4 (D6; `daysToStage.mature: 5400`) |
| 7 felled to empty, in words about the wood; refilled only by increment + planting; rooms and prose unchanged | W3 (D2's derive-from-zero, D3's `stand-empty`) — the room's authored prose is static; only the appended reading changes |
| 8 survives a restart | W3 (the Wood is a persistence host — the stand, the bole, the panel `{ref}`) + W2 (the yard panel's own record) + the drive's step 13 |
| 9 a second locality with a stand row and clearings is a working wood with no code | D19's `second-wood.test.ts` + W5 shipping no code |
| 10 the charcoal rate is a stated number in the panel row | W2 (D18) |
| 11 eight distinct materials + species naming each other; cordwood hazel | W1 (D11, D12) + W2 |
| 12 silviculture in the transcript after fell / cut / plant | W3 + W2 + W4 (D17) |

Nothing unmapped. AC 2/7 are met **per clearing** (§ Risks 1).

---

## Test & gate strategy

**Unit / collection (beside the code, `test-bootstrap` where the wired
runtime is touched):** W0's five; `wood-vocabulary.test.ts`;
`Panel.test.ts` (incl. the materialize round-trip); `coppice.test.ts`;
`Stand.test.ts`; `Wood.test.ts` (incl. the singleton opt-in round-trip);
`FellController.test.ts` + the arg-gate test + the dispatcher test;
`Bole.test.ts`; `second-wood.test.ts`; `hanging-wood.test.ts`.

**The wire drive** `forestry.dirty.wire.test.ts` — `DIRTY_REASON`:
*"cuts the yard's and the wood's panels (a game-year rotation nothing
resets), fells the Hanging Wood's clearings (a stand only the increment
refills), plants a standard (a chronicle deed), and burns cordwood"*;
`packs: ['trade-forestry', 'trade-fuel', 'trade-mining', 'trade-smelting', 'generic-objects', 'base-library', 'rejection', 'terminus']`.
Steps, each an `it`:

1. `look` in the fuel yard: no `something`; the prose mentions the wood.
2. `look panel`: *ready to cut*, six stools, mature.
3. `get billhook`; `harvest panel with billhook`: eight cordwood, each
   `queryOne` material `…/wood/hazel`; `look panel`: *regrowing … about
   three hundred and sixty days*.
4. `put cordwood in clamp` ×8; `char`: the engagement starts (the burn's
   three game days are not waited for).
5. `northeast`, `north`: the treeline; `look` — lit, named objects, the
   smoke detail, and **no** stand line; `north`: the ride — `dim`, and
   the stand line.
6. `look` on the ride: oak about eight, ash four, *planted by nobody
   alive*; `north`: the oak clearing — twelve and four.
7. `get axe` (carried up from the yard); `fell oak with axe`;
   `awaitActivity`; a bole on the floor made of oak (`queryOne` mass
   ≈ 675), four logs, an acorn in hand; `look`: eleven. `fell bole` ×2;
   two timber in hand made of oak; `look bole`: *four lengths in it yet*.
8. Carry the timber down; `make timber set` (the shipped recipe; the
   `cutting` tool is the billhook in hand); the set's material = oak;
   `shore` in the timbered drift — `expectOk`.
9. `get log`; `ignite log` — it catches.
10. Back up; `west` from the ride: the hazel cant; `harvest panel with
    billhook` → eight more; `look panel` reads the ready line; `look`:
    the cant's own stand (four and four).
11. To the oak clearing; `plant acorn in panel`; `look` shows the sapling
    with the handle's name and the game day; `chronicle` shows the deed.
12. Loop `fell oak with axe` in the oak clearing until `stand-empty`;
    `look`: *nothing stands here worth the axe*; the room's authored
    paragraph is byte-identical to step 6's; `south` to the ride: its
    oaks are untouched (the stands are per clearing).
13. Re-login in the same boot (the harness boots ONE world per run): the
    yard panel still *regrowing*; the oak clearing still empty; the
    sapling still there. **The true restart is asserted by hand in the
    drive record** — a server restart between two runs of steps 12→13,
    with the procedure written in `forestry.md`. ⚠ § Risks 3.
14. `second-wood.test.ts` (D19).

**Gates:** `pnpm -C packages/server lint:family` after every wave;
`pnpm test:near` + `pnpm -C packages/content/trade-forestry test` (and
`trade-fuel`, `trade-mining` in W2) between waves; **`pnpm test` exactly
once before the MR opens**, and once at `/finalize`. Never in the
background.

---

## ⚠ Pending branches (read 2026-09-17) — what changed when they merged

✅ **`build/pets` and `design/grain-chain` MERGED to master the same
day (`f47a2600f`, `583a79c46`); `design/forestry` carries the merge
(`2e160156b`).** Everything below was verified on the merged tree:
`lint:instrument-args` and `lint:capabilities` are in `package.json`;
the `[capability.X]` atom is in `api/mql/resolver.ts`; the persistence
fixes are in; `harm-survey` is still open and still does not overlap.
⭐ One more change the merge brought: **every row's material key is
`_materialPath:`** — the plan's row specs are corrected; `material:`
would be dropped silently. ⚠ `pnpm install` is required after this
merge (three new packs in the root manifest — stale `node_modules`
fails every pack suite at collection).

- **`design/grain-chain`** (28 ahead, 23 behind). ⭐⭐ Ships
  `lint:instrument-args` (ceiling **0**) and the MQL atom
  **`[capability.X]`**, and retired the held-first walk from the very
  `shore` controller this plan had copied. D3 and D7 are revised above
  to the declared shape (`default: "reachable:[capability.felling]"`).
  Also `lint:capabilities` (a kind must be consumed — `felling` is).
  `char.yaml` gains a declared `clamp` arg (no conflict with W2's row
  moves; `CharController` still finds cordwood by keyword). Root
  `package.json` gains three pack lines beside W1's one — a trivial
  conflict. `analyze.yaml`/`measure.yaml` stanzas now declare their
  instruments — irrelevant while `analyze wood` is deferred.
- **`build/pets`** (27 ahead, current). ⭐⭐ Three persistence-spine
  fixes that are EXACTLY this build's seams: a self-persisting good in
  a room that persists itself keeps its own `place`; a placement names
  the nearest addressable ancestor and the way down; two records that
  could disagree about where a keyed host is now resolve first instead
  of throwing (which used to abort a room's whole restore). The
  `Panel`-in-the-yard (a persistable singleton in a non-persistable
  room), the `Panel`-in-a-`Wood` (a persistable host inside a
  persistable room) and the stools as nested keyed hosts all sit on
  those seams. ⚠ **And it changes Risk 4:** an owner-persisted CHATTEL
  keeps its own `place` and restores into a public room — so a bole
  `stampChattel`ed to the feller is expected to survive a restart on
  the wood floor via its owner's estate, not be lost. W2's round-trip
  test must run against the post-pets spine, not master's.
- **`design/harm-survey`** (21 ahead, 23 behind). `Material` gains an
  optional `corrosiveTo` (a spoiler-tagged field); nothing a wood row
  must author. `check-template-census` learns `projectileTemplate`.
  No overlap.

**Sequencing.** Both are in; branch off master and go. `harm-survey`
lands whenever; nothing here waits on it.

## Risks & opens

1. **Three stands, not one (D13) — a requirements deviation the user
   accepted with the move.** *"The wood has one stand"* is now one per
   Wood room; the wood is their sum and nothing reports the sum. Honest
   consequences: a player empties the oak clearing and walks to the
   ride, where oaks still stand; the increment refills each clearing
   independently; the transpiration coupling is per clearing (a dry
   clearing slows only its own trees). The registry design had one
   number for the wood; this has three. A per-locality roll-up
   (`analyze wood` over the zone's Wood rooms) is the deferred read.
2. **`landUse: agricultural`, not `wild` (D13).** `wild` refuses `plant`
   on fixed ground, which kills AC 6. **The user should see this.** The
   alternative is a seventh land use (`woodland`) — a kernel edit
   rejection's own manifest says no to.
3. **The restart assertion cannot be a single wire test** (one boot per
   run). `Wood.test.ts`'s singleton round-trip and `Panel.test.ts`'s
   materialize round-trip are the unit proofs; the drive record must
   carry a hand-run restart.
4. **An authored `mix:` on a live world is inert after the first
   capture** — the persistence record wins (the reachability table's
   boot column). An author tuning a stand edits the row and sees
   nothing until the DB is dropped. Same class as *a `props:` edit never
   reaches a booted world*; `forestry.md` says so. The registry design
   had the same property (get-or-create) — not worse, but now it is on
   a *room*, where authors expect prose edits to go live.
5. **The moisture factor is read at derive time, not integrated** (D2).
   A month of drought followed by a wet day derives the whole month at
   the wet day's factor. Sward integrates stepwise; the stand does not.
   Stated; the Sward's integral is the upgrade and the Cover seam is
   where it would be shared.
6. **AC 4's "yields less if cut sooner"** is read as *refused until
   ripe; graded by the cycle*. A partial-yield rule changes every
   polycarp. Not taken; the user decides.
7. **The wood inherits `deposit:`** from the region zone; `analyze
   ground` there reports the Ferrow. A claim cannot be staked there
   (blocks key on the region grid). A `deposit: null` override on the
   sub-zone is the test to run if the user wants *no orebody*.
8. **`epoch` is knowingly unread (D16).** The sweep should not file it
   as drift.
9. **`Stock` is persistable but not singleton** — recorded, not this
   build's.
10. **`lint:arg-kinds` and an object arg with no `requires`** — the
    gate's header says an *undeclared* object-typed arg is the defect;
    D3 declares the arg and omits the requirement on purpose. If the
    gate reads absence as undeclared, the fix is its exemption shape
    with the polymorphic reason, not a `requires:` that would refuse
    the bare word.
11. **The `discipline` field name on `GrowingMixin`** — `husbandryDiscipline`
    if it clashes.
12. **No tool hunt anywhere** (revised): both instrument reads are
    view defaults; the stand lookup verified not to fire the gate (D3).
13. **Kestrel road at 24000 lm** is the arithmetic; a `cellSize: 10`
    zone edit is the alternative.
14. **The `forestry` command category** is new; the sweep adds the word.
15. **A `Wood` with `reserves:` authored and `GroundCharacter` absent**
    reads `nutrientFraction` from its own reserve and never leaches or
    fixes — the ledger has only the rain edge and the panels' draw.
    Honest for v1 (nothing draws a wood's nitrogen); the seeded half is
    farming's and the promotion is named in § Deferred seams.

---

## Deferred seams

Clean attach points; each leaves as a slate line, never a plan section.

- **The Cover seam** — `SwardMixin` (grass on a Field) and `StandMixin`
  (trees on a Wood) are two instances of one shape: a `Reserved` host,
  a stamp, reconcile-on-read scaled by the host's soil, host hooks for
  area/growth/draw, a percept phrase. A kernel `lib/husbandry/Cover`
  when a third appears (an orchard, a hedgerow, a reed bed) → a kernel
  tail; not factored at two (soil.md's rule).
- **The seeded site character for a Wood** — `GroundCharacter` is
  `trade-farming`'s (*consumers: only Field*); a Wood cannot reach it
  without a kernel promotion of the seeded half, which soil.md defers to
  the third non-farming consumer. This IS that consumer's signal;
  → soil.md's own deferred line. Until then a Wood authors its reserves.
- **A per-wood roll-up and `analyze wood`** (the sum over a zone's Wood
  rooms; the increment, the moisture factor, the year each clearing
  fails) → forestry-slate, D15/Risk 1.
- **The stand's moisture factor integrated stepwise** (the Sward's loop)
  → the Cover seam.
- **The engaged-act base** — `MiningActController.engageAct` =
  `ManualBuildController.engageStep` + an endurance spend → a kernel
  tail; the third copy is the trigger.
- **Partial yield below ripe** → forestry-slate (Risk 6).
- **Night / time-of-day ambient; canopy as a light model; rain delayed
  under canopy** → the light tail / biome.
- **Sawing, cleaving, boards, seasoning, the water-powered saw** →
  `trade-sawing`. The bole on the ground is its attach point.
- **Foraging / `gather`** → discovery-slate.
- **Estovers, the woodward, the close season, the epoch predicate** →
  the land-use covenant slate.
- **The collier as a producer** → `trade-fuel`'s README seam.
- **Cordwood as a stack** → bulk/stacks tail.
- **What the tree-dimensions pass (2026-09-17) left for later** — each
  a slate line in forestry-slate § Dimensions of a tree: fire on the
  stand (a wood's second way to die — now a fact about a *room*, which
  is where fire already lives); multi-product plants (bark · mast · sap
  · resin); masting; a reader for `Species.sexDeterminationSystem`;
  shade (a standard in a panel lowering the stools' lux); browse; form
  as an instance stamp; the nursery ladder; hauling the bole (the
  sledge's first real load).
- **Planted standards joining the stand's count at maturity** — a
  mature planting folding into `mix[].standing` (and the Plant
  destructed) is one mixin method when anyone can observe a maturity →
  forestry-slate.
- **The kernel population record** (herd · hive · wild population) —
  the stand is NOT its fourth consumer (it is Field's second); the
  herdbook pattern stays a three-consumer pattern → ranching.md's note.

---

## Critical files

Read first, in this order:

1. `docs/requirements/forestry-requirements.md` — the product scope.
2. This plan — the revision note, § Grounding, D1–D9, § Host placement.
3. `packages/content/trade-farming/src/location/Field.ts` and
   `src/lib/Sward.ts` — the location-that-is-ground and the
   standing-cover mixin the Wood and the Stand copy;
   `docs/subsystems/soil.md:20–82, 226–270`.
4. `packages/server/src/mud/platform/location/PersistentCartesianLocation.ts`
   + its test — the singleton-and-durable cell and its establishing
   context; `api/stuff.ts:631–700`; `lib/stuff/Populates.ts:225–245`.
5. `packages/server/scripts/check-location-classes.ts` — the derivation
   a pack Location must be legible to; the three rosters.
6. `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
   — the base `fell` extends; `trade-mining/src/idea/cmd/mining/{MiningActController,HewController,ShoreController}.ts`
   + their YAML — the act shape, `isActive(room, MIXIN)`, the
   instrument-as-argument shape; `api/mql/types.ts:225–255`.
7. `lib/husbandry/{Growing,Cultivable,Soil}.ts`,
   `platform/thing/{Plant,GardenBed,Crop,Seed,Firewood,ToolItem}.ts`.
8. `platform/idea/cmd/inventory/{HarvestController,PlantController}.ts`
   + `platform/content/platform/cmd/inventory/{harvest,plant}.yaml`.
9. `api/command.ts:305–333` — the four affordance buckets, and why a
   location affords through `inventory`; `api/mixin.ts:1783–1814`.
10. `trade-fuel/content/trade/fuel/thing/{cordwood,hazel-stool,coppice-panel}.yaml`,
    `trade-mining/content/trade/mining/thing/{felling-axe,billhook}.yaml`,
    `trade-mining/content/recipes/{felling-axe,billhook,timber-set}.yaml`
    — the rows that move.
11. `rejection/{pack.yaml,package.json}`, `content/world/rejection.yaml`,
    `kestrel-road.yaml`, `kestrel-road/lower-climb.yaml`,
    `location/{hillside,fuel-yard}.yaml`;
    `eternal-university/…/campus-field/location/home-field.yaml` + its
    zone — the authored-ground row shape.
12. `base-library/…/material/wood/oak.yaml`, `…/biome/outdoor/{baseline,meadow}.yaml`,
    the hazel species row.
13. `docs/subsystems/light.md:146–240`, `content-packs.md:100–260`,
    `persistence.md § Keyed nested hosts`.
14. `packages/wire/tests/metallurgy.dirty.wire.test.ts`;
    `trade-smithing/src/__tests__/verb-gates.test.ts`.

## Drive record

*(appended at build time, not at plan time)*
