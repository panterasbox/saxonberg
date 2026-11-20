# Matter-model overlaps — implementation plan

Executes [matter-model-overlaps-requirements](../requirements/matter-model-overlaps-requirements.md)
(as corrected at `dfc16ff6a`). **Kind:** refactor/sweep with behavior
changes. **Lead end:** the kernel; the first consumers are shipped content
(the sugar house, the sugarbush, the salt pan, the Crowsfoot casks, the
Hearts Delight creamery, potter's shop and weathering ground, the chandlery
hopper, the boats and ships). Seven questions about matter each get ONE
model; the other models' behavior moves onto it and their surface is
deleted. Packs change rows, plus the pack classes that wrote a batch's
grade onto a vessel.

⛔ Constraints that bind every wave (CLAUDE.md, owner rules): no new Mongo
collection; no new `isWizard` check; no new `eslint-disable
no-restricted-syntax` and no lint exemption; no new module category; no
exported free helper; the Api↔Logic split kept; verbs on objects;
refuse/skip/throw, never silent; `MixinApi.isX`, never a structural cast;
load on use, never a boot entry; American English in every new name; no new
verb and no new view; game clock only; never `pnpm dev:server` (the wire
runner boots the world it owns). Nothing in this plan carries old data
forward: rows are rewritten and state starts fresh.

Revision 2 (2026-11-20): reviewed against design-lenses, antipatterns,
review-questions and the subsystem docs; items B1–B2, S1–S11 applied. The
requirements conflicts of revision 1 are closed by the requirements'
correction (the hopper keeps its lye; a spent pan's bittern runs to the
ground; a cask mends by fitting a stave; a ship's caulking is what
`maintain` restores).

## Grounding

Verified by opening the file, on `reqs/matter-model-overlaps` (master
`ace3d9b0a`). `S` = `packages/server/src/mud`, `C` = `packages/content`,
`D` = `docs/subsystems`. Line numbers are where the text stood at plan
time.

### Who composes what

- `S/lib/stuff/Good.ts:80` — `GoodBase = SlottableMixin(FacedMixin(IntegrityMixin(MadeFromMixin(ChattelMixin(ConcealableMixin(Thing))))))`.
  **Every Good is Faced and carries Integrity.** ⚠ The survey note *"Vat
  composes Durable+Assembled, NOT Faced"* is wrong: `Vat` extends `Good`.
- `S/lib/stuff/Vessel.ts:84` — `SlottableMixin(IntegrityMixin(MadeFromMixin(ChattelMixin(ConcealableMixin(Holder)))))`:
  Integrity, not Faced.
- `S/lib/stuff/Thing.ts:101` — `WetMixin(VisibleMixin(DetailedMixin(PerceptibleMixin(TangibleMixin(ShapedMixin(ContainableMixin(Stuff)))))))`.
- `S/platform/thing/Vat.ts` — `AssembledMixin(DurableMixin(VesselKindMixin(MaturingMixin(CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(Good))))))))`.
  Not a Container, not Soilable. `getClosure()` returns `'open'` when
  `this.leaks()`; `reconcileDrying()` slackens every joint after
  `cask.dryOutDays` empty.
- `S/platform/thing/CraftVessel.ts:118` — `SoilableMixin(ContaminableMixin(ServiceableMixin(VesselKindMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))))))`.
- `S/platform/thing/Mould.ts:26` — `MouldMixin(AssembledMixin(DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good)))))))`.
- `C/transport/src/thing/Boat.ts:87` — `BilgeMixin(FacedMixin(HirableMixin(PullableMixin(HaulableMixin(AnchoringMixin(SmallCraftMixin(StagedMixin(EngagedMixin(MobileMixin(ExitableVessel))))))))))`.
  Integrity (through `Vessel`), Faced, **not Durable**. Her `HullSpec`
  (106) has `lengthM`, `beamM`, `draftM`.
- `S/platform/idea/Ship.ts:252` — `AnchoringMixin(BilgeMixin(PersistableMixin(VoyagingMixin(MovingMixin(EngagedMixin(PositionedMixin(DurableMixin(FacedMixin(Structure)))))))))`.
  A `Structure` (an Idea): Durable and Faced, **not Integrity, not
  Tangible**. `ShipHull` (95) is `draftM`, `beamM`, `lengthM`, `depthM?` —
  no material.
- `C/trade-sugar/src/thing/Copper.ts:73` — `ContainerMixin(Vat)`; its
  `canAddContainable` refuses everything but raw sugar, which dissolves.
  `CuringPot.ts:12` — `PlacingMixin(Vat)`. `SugarLoaf.ts:57` —
  `CuttableMixin(PercolatingMixin(Provision))`.
- `C/trade-chandlery/src/thing/Hopper.ts` — `ContainerMixin(Vat)`.
  `C/trade-quarrying/src/thing/SaltPan.ts:23` —
  `VesselKindMixin(MaturingMixin(Mould))`, standing on a bittern `Tub`
  where it is shipped (`D/mould.md` § Where the drainings go).
- `MoistureMixin` hosts: `Timber`, `Provision`, `Sheet` (kernel); `Brick`,
  `Cone`, `FlowerPot`, `ClayPart`, `ClayVessel` (ceramics); `SoapBar`;
  `SettingPan`; `Clay`, `Turf`; `Bagasse`; `Hide`.
- `SoilableMixin` hosts: `Creature`, `Bandage`, `Chair`, `Cloth`,
  `CraftVessel`, `Floor`, `Lamp`, `Rug`, `Window`, `Garment`, and four pack
  tools. **Not `Vat`.**
- `FluedMixin` (`S/lib/fire/Flued.ts`) is on `Hearth` and `Oven` only. The
  potter's kiln row (`C/trade-ceramics/content/trade/ceramics/thing/updraft-kiln.yaml:5`)
  is `class: /platform/thing/Oven`: flued, and a Container.
- `S/lib/bulk/Bulkable.ts:599` — `BulkableMixin extends
  PourTargetMixin(Base)`; `S/lib/craft/ManualBuild.ts:226` —
  `ManualBuildMixin extends HeatedMixin(PourTargetMixin(Base))`. The
  protocol-mixin shape is shipped.

### #2 Holding liquid

- `S/lib/material/Faced.ts` — `porosity()` (787) is the body material's
  `waterAbsorptionCapacity/100` **only if the material is tagged `porous`
  or `fired`**, else 0. `holdsWater(face)` (795): `false` on any unmended
  `crack` flaw; `true` under a `set`/`run` top coat whose own absorption is
  ≤ `faces.holdsWaterBelow` (0.03); else `porosity() <= 0.03`
  (`D/faces.md` § Holding water, and porosity). `bareWearPerDay()` (875)
  is a hook, 0 by default; `Ship.ts:313` overrides it.
- `S/lib/bulk/Bulkable.ts` — `reconcileFaceExchange()` (1299) runs on a
  read of the interior slot at most once a game-minute and does three
  things inline: the lead leach, the aroma memory, and the weep. The weep
  loses `porosity × rate × litres × dt/3600`, `rate` =
  `faces.filterLPerHourPerL` (5) into `seepReceiver()` when there is one,
  else `thermal.evaporation.seepLPerHourPerL` (0.02) onto the vessel's own
  wetness (`D/faces.md` § The weeping jar, § The water filter).
  `getClosure()` (932) returns the authored `closure` with no leak check.
  `sufferImpact` (1166) spills all to `BulkableApi.floorSurfaceNear(self)`.
- `S/lib/craft/Assembled.ts` — a `PartLine` carries `failed` (150: members
  failed discretely; the header, 27–30: *"one stave is sprung is `failed 1`
  on a count-30 line"*). `leaks()` (950) is a boolean: any structural line
  with `failed > 0`, or any joint under `crafting.joint.slackThreshold`.
- `D/assembly.md` § `fit` — *Replace*: `fit <part> to <whole>` takes the
  line most in need (failed first), gates the line's joints, and re-makes
  them at tension 1. `C/trade-coopering/content/joints/tight-hooped.yaml`
  asks `instrument: driving`, `competence: coopering / proficient`. The
  pack ships `stave.yaml` and `driver.yaml`.
- `S/platform/idea/api/BulkableLogic.ts` — the under-closed arm (≈410–465)
  sends a pour into a vessel whose closure is under the material's
  requirement to `floorSurfaceNear(to.getHolder())`. Nothing drains what a
  vessel already holds. `floorSurfaceNear` (832) walks the container chain
  to the first `Adornable` whose `getFloor()` has surface bulk.
- `S/lib/spatial/Container.ts:565` — `closureLevel()`: a bulk vessel's
  `getClosure()`; any other shut `Sealable` is `'open'` when its material's
  `waterAbsorptionCapacity > 0`, else `'liquidTight'`.
- `S/platform/thing/PipeRun.ts` — `leakOntoFloor` (249) writes the floor
  slot's material and amount directly and `wet(1)`s loose things.
- `S/lib/material/Integrity.ts` — `FlawKind` includes `'holed'`
  (penalty 0.5). `flaws` is persistent and authorable. `getFlaws()` derives
  `mended: 'riveted'` for a `crack`/`dunt` from a `riveted` mend at or after
  the flaw. The mixin also carries impact, ring, the `ring` command
  contribution and `sodden`, and casts its host to `Tangible`.
- `S/lib/material/Durable.ts:86` — `MendRecord.kind` is
  `'mended' | 'reforged' | 'tightened' | 'riveted'`.
- `S/platform/idea/api/CraftingLogic.ts` — `runMendLadder` (3923) refuses
  anything not `Durable`, runs `mendAssembly` or `mendOnePiece`, then
  `mendCracks` (4328, brittle bodies only — unchanged by this build).
- `S/lib/expanse/Bilge.ts` — `leakedBetween(from, to)` is the host hook;
  `integrateBilge` integrates it on read.
- `Boat.ts:373` — `hullLeakLps` = `holed` flaws × `boat.leak.holed` +
  `boat.leak.seep` when `!holdsWater('outside')`. **No production code
  adds a `holed` flaw to a boat**; the only writer is
  `packages/wire/tests/harbors.dirty.wire.test.ts:1011`.
  `D/faces.md:231–233` says the boat has *no fabric*.
- `Ship.ts` — `holed` is a persisted boolean (481); `setHoled` (488) has no
  production caller; `onStop` sets it (2421); `steer` refuses *"…until she
  is patched"* (2366); `SEAM_BANDS` (188) and `leakLpsFor(band)` (515) =
  `length × (ship.leak.<band> + (holed ? ship.leak.holed : 0))`;
  `leakedBetween` integrates band by band; `maintainWith(kit)` sets
  condition to 1 (`D/ship.md` § The hull: coat, seams, leak).
- `C/water/src/idea/WatercourseCatalogue.ts:1471–1487` — the only snag
  rule, inline in `plotPassage`. `C/transport/src/lib/Propel.ts`
  (`stroke`) reads `water.riverAt(room, inside)` for depth, current and
  roughness and never asks about snags.
- Views: `repair.yaml` — `item` scope `here, peers, person`, `requires:
  DurableMixin`. `wash.yaml` — `target` `requires: SoilableMixin`.
  `pour.yaml` — `target` `requires: PourTargetMixin`.

### #3 Drip receivers

- `Bulkable.seepReceiver()` (1200): the placement host, then the
  container; else `null` (weeps onto its own outside).
- `S/lib/material/Percolating.ts` — `percolatesInto()` (161): the
  container's `drainsInto()` when the container is a Mould, then the
  placement host, else `null`. The mixin holds only a number of litres
  (`percolantL`), never what the liquid is. **`receivePercolant` has two
  callers**: `Hopper.leach` (91) and `SugarLoaf.clay` (139). Nothing lets a
  player water a heap that is not in a hopper. Its due time is a
  persisted, re-armed wake (`percolationWakeAtS`).
- `S/lib/mould/Mould.ts:632` — `drainsInto()`: the placement host only.
  `creditDrainings` (1186) transfers to it through `'set'`, takes none into
  a vessel holding a different liquor, sends the rest to `null`, and sets
  the receiver VESSEL's grade one band under the mould's.
- `S/lib/thermal/Thermal.ts:2873` — `crystallizeIfOver`: spent liquor in a
  mould goes to `drainsInto()`; with none it stays.
- `C/trade-fuel/src/thing/Ash.ts` — `percolatesInto` overrides to the
  container first; `onPercolated` enriches the liquor of the vessel it is
  IN, in place, and sets that vessel's grade from `LyeStrength`. With no
  receiver it returns and the alkali goes nowhere.
  `SugarLoaf.onPercolated` (145) loses mass always and writes the molasses
  amount straight onto the receiver's slot; with none the mass is gone.
- `C/trade-chandlery/src/thing/Hopper.ts` — the ash lies IN the hopper,
  the lye is the hopper's interior liquor, and a player draws it with
  `pour hopper into pail` (`packages/wire/tests/potash.dirty.wire.test.ts`
  497–515). No pot stands under either shipped hopper.
- `S/lib/spatial/Containable.ts` — `getPlacement()`, `getContainer()`.
  `Container.closureLevel()` already returns a `lib/bulk` type.
- `docs/antipatterns.md` § The FAT variant: an Api static whose subject is
  a world object it takes as a parameter is the antipattern;
  `lint:object-verbs` holds the first-parameter census at zero.

### #4 Wall to contents

- `Faced.absorbed` (508) is persistent, per face. The exchange in
  `Bulkable.reconcileFaceExchange` learns `max(kept, fill ×
  faces.aromaRetained)` and gives back toward `kept` at `min(1, days)`;
  `kept` is never reduced. It fires only when `!holdsWater('inside')`.
- The lead leach is in the same function: `outermost('inside')`'s
  `getLeaches()` × `acidAttack(pH)` × softness (`D/faces.md` § The lead
  leach). `getLeaches()`/`LeachSpec` live on `S/lib/material/Toxicity.ts`
  (*"it POISONS"*; the spec's own comment: *"What a face gives its
  contents"*).
- `D/faces.md` § Seams already records the direction: *"maturation's char
  layer, pitch and tin linings are inside-face coats; recorded, not
  migrated."*
- `S/lib/maturation/Maturing.ts` — `imparts`, `charredImparts`,
  `impartsSpent`, `fillCount`, `fillsSinceRefire`, `charLevel`,
  `impartedFraction` (497–522); `startBatch` spends
  `maturing.impartsSpentPerFill` (882–896); `effectiveImparts` (1117),
  `applyImparts` (1150, paced by `fractionConverted`), `refire()` (1144),
  `isSpent()` (`D/maturation.md` § `imparts` — what the VESSEL gives;
  `D/assembly.md` § Coopering and the cask).
- Aromas reach a nose and a tongue through `payload.dissolvedAromatics`
  (`SmellModality.addInterior`, `TasteModality.ts:75`). A material's own
  `smells` (`S/lib/material/Odor.ts`) are a different unit and are **not**
  learned by the wall today.
- `S/lib/cleanliness/Soilable.ts:710` — `washSite` already asks
  `MixinApi.isFaced(host)` for `cleansAs()` (`D/cleanliness.md` § The wash).
- Stale: `D/maturation.md:179` and
  `docs/slates/trades/libations-slate.md:106` say imparts do not deplete.

### #7 Grade and maker

- `BulkableLogic.ts:985` `carryBatchIdentity` writes the source HOLDER's
  grade, maker, recipe and craftedAt onto the destination HOLDER on a fill
  from empty; `carryTopUpGrade` (1004) takes the lower grade
  (`D/maturation.md` § The transfer seam carries the batch's identity).
- `S/lib/craft/Crafted.ts:71` declares `BulkPayload.maker`;
  `BulkPayload.recipeId` is on the base interface (`Bulkable.ts:151`).
  No grade and no craft time on the payload.
- Writers onto the vessel: `CraftingLogic.ts:3378` (`vessel.stamp` at the
  end of a by-hand build); `Maturing.stampBatchMark` (994 — from
  `getTemplatePath()`, the lineage-key defect `Fractionating.ts:398`
  records); `Maturing.applyBatchGrade` (1032); the `Maturing.setGrade`
  witness (1019, `batchInputBand`); `Copper.regrade` (213);
  `Mould.creditDrainings` (1218); `Ash.onPercolated` (173);
  `S/lib/craft/Comminuting.ts:882–883`.
- Readers of the vessel as the batch: `concentrateIfReached` (`Thermal.ts`
  2541); `Mould.carryPayload` (1443); `Mould.bandsBelowFine` (1171);
  `IronPot.setCake` (`C/trade-potash/src/thing/IronPot.ts:137`);
  `Fractionating.ts:385–388`; `vesselVerdictAugmenter` (`CraftVessel.ts`)
  and `verdictAugmenter` (`GradedReceptacle.ts:42`);
  `ConditionReading.ts:108`.
- `Thermal.setCrystals` passes `payload: null` to `castInto`.
- `D/assembly.md:195` (§ Host placement) and
  `S/platform/thing/Receptacle.ts:55` say *"on a bulk holder Crafted is the
  BATCH's identity."*

### #1 Crystallizing and graining

- `S/lib/material/Solution.ts` — `solubility`, `crystallizesTo {product,
  residue}`, `solidsKgPerL`, `solidsMassFraction` (solute density 1.6),
  `boilingPointElevation`, `concentratesTo` arrows with
  `minBand`/`elseBecomes`.
- `Thermal.reconcileBulkPhase` (2639) runs `crystallizeIfOver` first, then
  the boil plateau, which keeps the solids, discards the water and calls
  `concentrateIfReached` (`D/thermal.md` § Crystallizing — the third arm;
  § The bath, and the boil).
- `crystallizeIfOver`: all the excess sets at once on the read; the liquor
  keeps its material while the host is a maturing vessel with an active
  batch, else swaps to `residue`. Nothing nucleates.
- Rows: `C/trade-sugar/content/trade/sugar/idea/material/raw-liquor.yaml`
  (arrows 0.68 cane-syrup · 0.9 strike, `minBand: fair` else blackstrap ·
  0.985 caramel · 0.995 burnt-sugar; no solubility); `strike.yaml`
  (`drainSetting`: days 4, becomes loaf-sugar, `becomesAs`, `drains`
  molasses, `drainPerBand`); `molasses.yaml` (extends raw-liquor).
  `C/trade-forestry/content/trade/forestry/idea/material/maple-strike.yaml`
  has no `drainSetting`; its directory holds no maple-sugar row.
- `drainSetting` is also used by dairying's curds (`drains: whey`), slip,
  hard soap curd and latex. Only sugar uses `becomesAs` and
  `drainPerBand`.
- `S/platform/idea/cmd/crafting/StirController.ts` narrows the vessel by
  host three ways already: `isCompounding` → `stirPlanFor`;
  `isKneadVessel` → refused as stiff; `isBuildVessel` →
  `ManualBuild.stirPlan()`. `stir.yaml`'s `vessel` arg is `requires: any`.
- `C/trade-sugar/src/idea/reading/BoilReading.ts` words the stage off the
  liquor's `w` and tags. `C/trade-sugar/src/behavior/refines.ts` drives the
  boiler by command lines.

### #5 Vapor and smell

- `S/lib/material/Volatility.ts` — `boilingPoint`,
  `latentHeatOfVaporization`, `vapourLPerLPerHour`, `vapourMaterial`,
  `vaporizesAboveK`.
- `Thermal.vaporizeIfHot` (1589) → `holder.addChamberVapor(<the solid's
  path>, kg)`. `Thermal.routeVolatile` (2194): the holder Burner's
  `receiveVolatiles`, then `addAtmosphereContent` on the first Atmospheric
  scope with a volume. The coat is laid at the kinetic swap from
  `chamber.getChamberVapors()` keyed by `c.getVapor()` (1879).
- `S/lib/fire/Burner.ts` — `chamberVapors` is persistent, in kg, cleared
  in `_goOut` (1676) and `_setLit(false)` (1686) (`D/fire.md` § The
  burner's hooks).
- `C/trade-fuel/src/thing/Retort.ts:61` — `receiveVolatiles` hands litres
  to whatever is placed on its head by a structural `typeof` test.
- `BulkableLogic.ts:766–786` — a volatile liquid poured into an `'open'`
  vessel adds its vapor straight to the room.
- `S/lib/biome/Atmospheric.ts` — `addAtmosphereContent` (1025);
  `reconcileAtmosphereContents` (1130) writes and has no held-still guard;
  `_atmosphereContents` is persistent. `S/api/biome.ts` already owns the
  room's air (`resolveAtmosphereContentsFor`, `airFor`, `airSegmentsFor`,
  `exposureOf`, `localHumidityFor`). Humidity is a biome-chain value;
  nothing in the air feeds it.
- `SmellModality.signalAt` holds the world still and folds `ownSmell(loc)`.
  It never reads atmosphere contents (`D/senses.md` § One smell: source,
  air, nose). Gas rows carry `smells:`. There is no water-vapor row and no
  salt-vapor row; `…/material/food/salt.yaml:41` authors `vaporizesAboveK:
  1350`; `…/material/glaze/salt.yaml` is the coat.

### #6 Water in a body

- `S/platform/idea/api/WeatherLogic.ts:1357` — `wetOccupants(room)` gives
  every Wet occupant of a rain scope the same delta through a structural
  cast; presence-gated (`D/weather.md` § Wetness — the cross-cutting
  gauge).
- `S/lib/wetness/Wet.ts` — `wet(delta)`, `getWetness()`,
  `waterCapacityKg()`.
- `S/lib/material/Moisture.ts` — `exposureOf(host)` (225, module-private).
  `reconcileWater` integrates `BiomeApi.airSegmentsFor` on read and, per
  segment, adds `mm × cure.rewetPerMm × exposure`; a segment's rain is 0
  under a roof.
- `D/spoilage.md` § Drying is a RATE (686–695): held moisture is *not* on
  `WetMixin`; the coupling between the two is *"a term, not the carrier."*
- `C/hearts-delight/…/brickfield/location/hacks.yaml` is its own roofed
  place; the weathering ground is open.

### The harness

- `packages/wire/src/harness/world.ts` — `hand(session, template, data?)`
  (a clone with a per-instance data overlay); `stage(path, method,
  …args)`; `stageShip`; `pinWeather`/`unpinWeather`; `advanceWorldClock`;
  `worldClockNow`; `restartWorld`. `eval --parcel <extent>` stages inside
  a parcel the session holds. `practice <discipline> hard success` is how
  `assembly.dirty.wire.test.ts:232` gives a cooper a band.

## ⭐⭐ New substrate

Short by design. Each line names the slate's reuse-ledger row. Nothing
here is a new Api class, logic singleton, Idea class, document kind,
collection, registry, verb, view or controller.

| # | item | where | ledger |
|---|---|---|---|
| N1 | `FlawedMixin` — the flaw RECORD (`flaws`, `getFlaws`, `addFlaw`, `takeFlawsFrom`, `getIntegrity`) and `flawLeakLPerHour(headM, scaleM)`, **split out of** `IntegrityMixin`, which composes it | `S/lib/material/Flawed.ts` | ⚠ **A ledger deviation.** The ledger says *the flaw record → reuse* and *no new mixin*. This is a split of that row, taken because `Ship` must carry a hole without claiming she can be dropped, rung or broken (D5). The owner decides; W3 confirms `lint:mixin-clusters` agrees with the record/impact cut. |
| N2 | `Faced.isSealed(face)`; `Bulkable.leakLPerHour()` · `isLiquidTight()`; `Assembled.jointLeakShare()`; `Bilge.hullLeakLps()` with hooks `hullLengthM()` · `hullDraftM()` | their own files | *does it hold, at what rate → generalize*. The sum lives on the two things that hold. |
| N3 | `Containable.dripSlots()`; `BulkableApi.drip(matter)` → `BulkableLogic.drip` | `S/lib/spatial/Containable.ts`, `S/api/bulk.ts` | *what catches my drip → merge* |
| N4 | `Faced.exchangeWith(contents, dtS)` · `noteFill(face)` · `washAbsorbed(share)` · `refireFace(face)`; field `wallSpent`; `CoatLayer.spent` | `Faced.ts` | *what the wall gives → merge, moved onto FacedMixin* |
| N5 | `ExtractionMixin` — a new material capability, *what a wall of this gives what it holds*: `leaches` (moved from `ToxicityMixin`, with `LeachSpec`) and `imparts` (moved from the vessel rows) ⭐ owner 2026-11-20 | `S/lib/material/Extraction.ts` (D11) | *what the wall gives* — genuinely new as a capability; its two fields are moved, not new |
| N6 | `BulkPayload.grade`, `BulkPayload.craftedAt` | `S/lib/craft/Crafted.ts` | *whose grade and maker → move* |
| N7 | `Solution.metastableRatio`, `Solution.purity` (the row's starting share), `minCrystalPurity`; `CrystallizesTo.productAs` · `drainDays`; `BulkPayload.nucleated` · `purity` · `liquorDrainStampS` · `liquorDrainDueS` | `Solution.ts`, `Thermal.ts` | *graining → retire the strike swap*; *nucleation → genuinely new* (searched `Thermal`, `Solution`, `Copper`, `StirController`, all of `lib/` for `nucleat`/`supersatur`: none) |
| N8 | `StirTargetMixin` — the protocol behind `stir`, composed by `CompoundingMixin`, `ManualBuildMixin` and `BulkableMixin`; `Thermal.noteAgitated()` · `supersaturation()` | `S/lib/craft/StirTarget.ts` | *nucleation → genuinely new*; the protocol is `PourTargetMixin`'s shape, and it replaces three controller arms with one call. Searched: the retired `AgitatedMixin` (one host then; four now). |
| N9 | `BiomeApi.vent(matter)` → `BiomeLogic.vent`, **replacing** `Thermal.routeVolatile` and the open-pour arm | `S/api/biome.ts` | *vaporizing → merge to one receiver chain* |
| N10 | `Wet.takeRain(delta)`, `Wet.weatherReach()` (the body of `Moisture.exposureOf`, moved) | `S/lib/wetness/Wet.ts` | *surface water → reuse* |
| N11 | `MendRecord.kind: 'patched'`; `Flaw.mended: 'patched'`; `Flawed.patchMaterial()` hook | `Durable.ts`, `Flawed.ts` | *the flaw record → reuse* |
| N12 | `Boat.stove(words)`; `WatercourseCatalogue.snagVerdict(...)` (lifted out of `plotPassage`) | `C/transport`, `C/water` | *the snag stop and the boat's stove-in write the flaw* |
| N13 | `PercolatingMixin` composes `PourTargetMixin` and keeps what was poured on it (`percolant`: material, payload, litres) | `Percolating.ts` | *what catches my drip* — the first producer that needs it (the requirements' step 15) |
| N14 | Rows: a water-vapor gas, a salt-vapor gas, a char coat material, a maple-sugar material; tags `absorbent` and `water-vapor`; one `vapor:` entry on the stoneware body's firing; `hull.material` on the shipped ship rows; settings keys | content | row-only, per the requirements' Placement |

**Deleted, so the general thing is the only thing (P1 ⭐):**
`Bulkable.seepReceiver`, the inline face exchange in `Bulkable`,
`Percolating.percolatesInto`, `Mould.drainsInto`, `Ash.percolatesInto`,
`Thermal.drainLiquorInto`, `Thermal.routeVolatile`, `Assembled.leaks()`,
`Ship.holed` / `setHoled`, `Ship.leakLpsFor` and her own `SEAM_BANDS`
(they move to `Bilge`), `Boat.hullLeakLps`, the settings `boat.leak.holed`
· `boat.leak.seep` · `ship.leak.holed`, `Maturing.imparts` ·
`charredImparts` · `impartsSpent` · `fillCount` · `fillsSinceRefire` ·
`charLevel` · `impartedFraction` · `applyImparts` · `effectiveImparts` ·
`refire` · `isSpent` · `batchInputBand` · the `setGrade` witness ·
`stampBatchMark`, `BulkableLogic.carryBatchIdentity` · `carryTopUpGrade`,
`Copper.regrade` · `liquorBand`, `Mould.bandsBelowFine`,
`DrainSettingSpec.becomesAs` · `drainPerBand`,
`ConcentrationArrow.minBand` (it becomes `minPurity`), `strike.yaml`'s
`drainSetting`, `Moisture.exposureOf`, `Burner.chamberVapors` in
kilograms, `ManualBuild.stirPlan` and `Compounding.stirPlanFor` as two
names, and `StirController`'s three host arms.

### P9–P14, per item

One line each: P9 predictable from the def and `help` · P10 metadata is a
Document · P11 no caller branches on the destination · P12 no synonym ·
P13 fits the host's header sentence · P14 nothing moves or decides
invisibly.

- **N1 `FlawedMixin`.** P9 n/a. P10 n/a (state written by acts). P11 n/a.
  P12 it IS `Integrity`'s record, moved. P13 *"the flaws a body carries,
  and what they let through"* is the whole sentence; impact, ring and
  sodden stay on `Integrity` (*"articles you can drop, throw, tap and
  crack"*). P14 nothing moves.
- **N2 the leak.** P9 `help pour`, `help bail`, `help repair`, `help fit`
  each gain one sentence. P10 n/a. P11 the vessel and the hull each call
  their own one method; no caller tests what it holds. P12
  `isLiquidTight` replaces `Assembled.leaks()`; `holdsWater(face)` keeps
  its one meaning and loses its crack clause. P13 `Bulkable` is *"what a
  holder holds"* and `Bilge` *"the water a hull holds"*: whether each
  keeps it is theirs; `Faced` keeps only what is about a face. P14 the
  loss is on the vessel's `look` line and in the puddle.
- **N3 drip.** P9 n/a. P10 n/a. P11 ⭐ five callers each chose a receiver;
  now none does, and none passes a chain — the primitive asks the source.
  P12 `drip` forwards to `transfer` per slot and adds only *where*. P13
  `Containable`: *"where inside its container this thing sits"* — what is
  under it is that. P14 a drip lands in the first slot or the next, each a
  true transfer; a pack it passes through is wetted and says so on `look`.
- **N4 wall exchange.** P9 `help wash` gains *"washing a vessel also
  spends what its wall has soaked up."* P10 n/a. P11 `Bulkable` calls one
  method. P12 it replaces the two exchanges. P13 Faced: *"a face's
  outermost layer decides what meets the contents."* P14 the memory is
  smelled and tasted; `look` words what the wall has left to give.
- **N5 `ExtractionMixin`.** P9 n/a. P10 fields on a material row. P11/P12
  n/a. P13 *"what a wall of this gives what it holds"* — lead's leach and
  oak's vanilla are both extraction from a wall by its contents;
  `Toxicity` keeps *"it POISONS"* and loses `leaches`. P14 n/a.
- **N6 payload grade.** P9 `help pour` gains *"the vessel keeps its own
  making."* P10 the payload is the batch's record (the `maker`
  precedent). P11 `transfer` decides. P12 replaces the two carry
  functions. P13 declared from `lib/craft`. P14 read by `look` and
  `taste`.
- **N7 solubility fields.** P9 `help stir`, `help put` each gain a
  sentence. P10 fields on material rows. P11–P12 n/a. P13 `Solution`:
  *"it dissolves, or holds what is dissolved."* P14 a held liquor says so
  on the boil reading.
- **N8 `StirTargetMixin`.** P9 `stir.yaml` states the three things a stir
  can meet; `requires:` names the protocol, so the def predicts who
  answers. P10 n/a. P11 ⭐ the controller stops narrowing by host. P12 one
  method name where there were two. P13 a protocol mixin says one thing:
  *what being stirred means here.* P14 a stir takes its time and reports.
- **N9 `vent`.** P9 n/a. P10 n/a. P11 four sites chose a receiver; now
  none does. P12 replaces `routeVolatile`. P13 `BiomeApi` owns the room's
  air; a vapor's route ends there, and open naphtha, a copper's steam and
  a cleaning rag are not fire. P14 vapor in a room is read by `smell` and
  `analyze atmosphere`; the sky is the documented sink.
- **N10 `takeRain`.** P9–P10 n/a. P11 weather calls one method on every
  Wet thing. P12 `wet(delta)` stays the raw push; `takeRain` replaces the
  structural cast. P13 WetMixin is the surface gauge. P14 n/a.
- **N11 `'patched'`.** P9 `help repair` names patching a hole and what it
  draws. P10–P12 n/a. P13 a mend is `Durable`'s record. P14 the patch
  shows on the flaw line.
- **N12 `stove`, `snagVerdict`.** P9 `help paddle` gains the snag
  sentence `course`'s help has. P10 n/a. P11 the boat and the ship ask one
  rule. P12 n/a. P13 the watercourse owns its obstructions. P14 the hole
  is told as it happens.
- **N13 a poured-on solid.** P9 `help pour`: *"poured onto a heap a liquid
  works down through it, and what comes out runs to what is under the
  heap."* P10 n/a. P11 ⭐ the destination decides — `pour` asks its target
  and a percolating solid answers; `transfer` gains no branch. P12 n/a.
  P13 Percolating: *"a porous solid a liquid seeps down through."* P14 the
  heap reads as wet; the lye appears under it.
- **N14 rows.** P10 materials are rows by doctrine. Others n/a.

## Plan-level decisions

### A vessel and its liquid

**D1 — #7 comes first.** The batch's grade moves onto the payload before
anything else, because the drip (drainings one band down), the crystal
(min of batch and mould) and the wall all read the payload.

**D2 — The batch is the payload's.** `BulkPayload` gains `grade?:
GradeBand` and `craftedAt?: number`, declared in `lib/craft/Crafted.ts`
beside `maker`; `recipeId` is already there. Absent means ungraded. Rules,
all inside `BulkableLogic.transfer`:
- a fill from empty carries the payload as today;
- a top-up writes `min` of the two grades onto the destination's payload
  (one side ungraded: the other's stands); maker and recipe are not
  re-signed;
- `faceCheckedS` never rides a pour (it is the old wall's clock);
- ⭐ a transfer into an EMPTY interior **declares the fill**: it calls the
  destination's `noteFill('inside')` when the holder is Faced (D11). The
  fill is said by the act, never inferred from a missing stamp;
- `throughSet` passes `maker` as today and never `grade` (the mould grades
  its drainings, D10).

Every writer moves (W1 lists each). A pour, a ferment, a temper or a build
never writes the vessel's `Graded`/`Crafted` again. Reason: lens 1 — a
batch and its container are different things.

**D3 — Only a shaping vessel passes its own grade.** A mould casts
`min(payload.grade, mould grade)`: one line in `Mould.carryPayload`, no
flag, because *being a Mould* is the claim. The cast's maker is the
batch's; the fallback to the mould's maker is deleted.
`Thermal.setCrystals` passes the liquor's payload to `castInto`.

**D4 — One leak read, on the things that hold.** Three paths, summed:
- **`Bulkable.leakLPerHour()`** (the interior's loss, at what it holds
  now) =
  - *pores*: 0 when the host is not Faced or either face `isSealed`, else
    `porosity() × thermal.evaporation.seepLPerHourPerL × heldL` (the
    shipped weep);
  - *flaws*: `MixinApi.isFlawed(self)` → `self.flawLeakLPerHour(headM,
    1)`, `headM` the liquid's depth (`∛(heldL/1000)` m, a vessel's
    proportions);
  - *joints*: `MixinApi.isAssembled(self)` → `self.jointLeakShare() ×
    heldL`.
- **`Bulkable.isLiquidTight()`** = the same three at capacity, as a share
  of capacity an hour, under `faces.holdsLiquidBelowSharePerHour` (0.05).
  `getClosure()` returns `'open'` when it is false, else the authored
  closure — so every vessel, not only a `Vat`, spills a pour it cannot
  hold. `Vat.getClosure` keeps only its `reconcileDrying()` call.
- **`Faced` keeps what is about a face**: `porosity()`, `holdsWater(face)`
  (now `isSealed(face) || porosity() <= tight`, with the crack clause
  gone — a crack is a flaw, so a cracked glazed crock leaks at the crack's
  rate), and the new `isSealed(face)`: a `set` or `run` top coat whose
  material's absorption is ≤ `faces.holdsWaterBelow`.
- **`Flawed.flawLeakLPerHour(headM, scaleM)`** — ONE rule for every hole
  and crack: `Σ over unmended crack/holed flaws of
  flaws.leak.<kind>LPerHour × √headM × scaleM`. A vessel passes its
  liquid's depth and a scale of 1; a hull passes her draft and her
  length (a longer hull strikes harder and opens more of herself).
  `boat.leak.holed`, `ship.leak.holed` and any per-host hole dial are
  deleted; W3 tunes the two `flaws.leak.*` dials so the shipped rowboat
  stays bailable by one bucket and the Hesper's hole stays near its
  shipped rate, and pins both.
- **`Assembled.jointLeakShare()`** — the share of what it holds an hour:
  slack joints × `crafting.joint.slackSharePerHour` + failed structural
  members × `crafting.joint.failedSharePerHour`. A share, not litres, so
  a sprung stave is above the liquid-tight line on a cask of any size (the
  shipped boolean, kept) and the fall is visible at the same pace on all of
  them. ⭐ `failedSharePerHour` is tuned so **a full 25 L cask with one
  sprung stave has lost about a third after an hour** — a watchable fall,
  not an empty cask in 25 minutes. `Assembled.leaks()` is deleted;
  `PipeRun.isComplete` reads `jointLeakShare() === 0`.
- **`Bilge.hullLeakLps()`** — a hull's sum, the same read run the other
  way (water comes IN): *seams* (the joints term: her `Durable` condition
  in the five seam bands × `hullLengthM()` — `SEAM_BANDS` and the
  `ship.leak.<band>` dials move here from `Ship`) + *flaws*
  (`flawLeakLPerHour(hullDraftM(), hullLengthM())`). Both hulls answer the
  two hooks from the specs they already carry. `Ship`'s band-by-band
  integral keeps its shape and reads this.
- `Container.closureLevel()` for a shut non-bulk container → `'open'` on
  an unmended hole or crack, and it keeps its shipped clause that an
  absorbent material lets the wet through (that is wicking, #6's flow; it
  stays so a canvas sack does not become watertight).
- `PipeRun.leakOntoFloor` pours through `BulkableApi.transfer`. Its frost
  burst stays an event (Deferred seams). `Bulkable.sufferImpact` is
  unchanged: a break is the limit case.

**D5 — `FlawedMixin`, and `Ship` composes it.** `Ship` is a Structure,
not an article: composing `IntegrityMixin` would give her an impact
strength off a mass she does not have, a `ring` contribution and a
`sodden` latch — an honest "no" on almost every member. So the record
half is split out (`Mixins.Flawed`, `MixinApi.isFlawed`), and
`IntegrityMixin`'s factory extends `FlawedMixin(Base)` (the
`ManualBuildMixin extends HeatedMixin(PourTargetMixin(Base))` precedent),
so `Good` and `Vessel` change no line. `Ship` becomes
`…DurableMixin(FlawedMixin(FacedMixin(Structure)))`.
- `Ship.holed` and `setHoled` are deleted; `isHoled()` derives.
- `Ship.onStop('holed')` integrates her bilge to now, then
  `addFlaw('holed', true, atS)`.
- ⚠ A ledger deviation (New substrate N1), ✅ kept by the owner
  2026-11-20 over composing `IntegrityMixin` whole. Rejected alternative: keep the
  boolean and derive a flaw from it — two records of one hole.

**D6 — A ship's seams are the joints term, read off her fabric.** Her
seams are her joints in the read (D4, `Bilge.hullLeakLps`); the caulking
in them is what `maintain` restores and the tarred coat outside protects
them, as `D/ship.md` § The hull has it. She gains no `JointState` rows and
no caulk coat.

**D7 — A boat has real seams, and a stove-in is written by play.**
- `Boat` composes `DurableMixin` and overrides `bareWearPerDay()` as
  `Ship.ts:313` does: under her coat her fabric is her seams, and once the
  coat is gone they wear at the house's rate. Her seep is the seam term of
  `Bilge.hullLeakLps` — the ship's model at a boat's length — and the
  constant `boat.leak.seep` goes. So a tarred boat is tight, a bare one
  opens slowly, and `repair` (her wear rung) or re-tarring is how she is
  kept. That is what makes Durable an honest claim on a boat rather than a
  gate-opener for `repair`. `D/faces.md:231–233` (*"no fabric"*) and
  `D/ship.md` § Boats are rewritten in W3.
- `WatercourseCatalogue.snagVerdict({ obstruction, sogMps, nowS, lyingIn
  })` returns `'clear' | 'seen' | 'struck'`: the rule now inline in
  `plotPassage`, which calls it. `Propel.stroke` calls it for the stretch
  the stroke enters — ⚠ re-planned at W0: `ReachWarren.riverAt` drops
  `state.stretch` and returns no `obstruction`, so W3 adds the stretch's
  `obstruction` to `riverAt`'s answer (it is seeded per bend in
  `RiverLine.ts`, never authored); `Propel.stroke` reads it from there: `'seen'` ends the paddling with the snag words,
  `'struck'` calls `boat.stove(words)`.
- `Boat.stove(words)`: integrate the bilge to now, `addFlaw('holed',
  true)`, tell the people aboard, end the engagement.

**D8 — `repair` patches a hole; `fit` mends a stave; rivets are
untouched.**
- `mendHoles(item, m)` joins the mend ladder beside `mendCracks`: for a
  Flawed, Durable item with an unmended `holed` flaw, the instrument by
  the shipped `instrumentFor`, stock through the shipped `StockDraw` of
  `crafting.repair.patchKg` of **the hull's own authored material**
  (`Flawed.patchMaterial()`: a Tangible's material; a `Ship` answers her
  `hull.material`). ⛔ No default: a hull that authors no material is
  refused by reason row (`no-hull-material`), never patched with
  whatever is at hand. So the shipped ship rows gain `hull.material` in
  W3. One mend is recorded with kind `'patched'`; `Flawed.getFlaws()`
  derives `mended: 'patched'` as it derives `'riveted'`.
- `mendCracks` keeps its `brittle` test. A cask does not crack open and
  get riveted: **a sprung stave is `failed` on the stave line**, already a
  joints-term input (D4), and `fit stave to cask` is the shipped mend. The
  build adds nothing to `fit` but one sentence of help.
- ⚠ `repair` on a ship must not also do `maintain`'s work: the ladder's
  wear rung is skipped for a hull whose fabric `maintain` mends (W0 names
  the predicate; never a cast). ⚠ Re-planned at W0: no runtime predicate
  exists (`Maintainable` is a bare interface; `MaintainController.kept()`
  is an `instanceof` pair), and `isFaced && bareWearPerDay() > 0` is wrong
  because D7 gives the BOAT that override while her wear rung IS `repair`.
  W3 adds the hook `DurableMixin.keptByUpkeep(): boolean` (`@hook`, default
  false; `Ship` and `Building` answer true) and the ladder skips the wear
  rung on it. `repair <ship>` binds through `Place.landedStructuresNow()`
  from the quay (`BerthExit.alongsideNow`) and from an open deck room, NOT
  from a cabin that holds air — the drive patches from the quay; a
  `Building` binds the same way from its landing, and the skip covers it.

**D9 — Held contents drain on read, with ONE wake.** The wall's exchange
(still triggered by a read of the interior, at most once a game-minute)
computes `lost = min(held, leak integrated over dt)` and moves it with
`BulkableApi.drip`. The pore share goes `through: 'pores'` with the
material's `filteredTo` (the water filter, unchanged); the flaw and joint
share goes plain. No recurring timer. When an exchange finds the vessel
losing liquid it arms one game-clock wake at the **computable** moment the
state next changes — the vessel is down to its dregs (the share law's time
to `flaws.leak.dregsL`) or the receiver brims, whichever is first — the
`percolationWakeAtS` precedent: a persisted due time, re-armed by its
setter on restore. Between the two the loss is integrated on read; the
receiver's own read (`reconcileSeepers`) brings its leakers current. A
hull runs through `Bilge.leakedBetween`, the shipped integrator.

**D10 — One drip.**
- `Containable.dripSlots(): BulkSlot[]` — positional and pure: the
  interior of the vessel it is IN (its container, when that is Bulkable
  with an interior), then of the vessel it stands ON (its placement host,
  same test), then the floor's surface.
- `BulkableApi.drip(matter)` — `matter` is `{ from: BulkSlot, litres,
  via? }` (liquid leaving a vessel) or `{ off: Stuff, material, litres,
  payload }` (liquid a solid gives up). ⭐ The primitive asks the source
  for its `dripSlots()` itself; no caller passes a chain. It fills each
  slot in order by `transfer`, skips a vessel already holding a different
  liquor, and puts what is left on the floor. ⚠ Re-planned at W0:
  `transfer` into a floor surface already holding a DIFFERENT liquid
  declines (`material-mismatch`, applied 0) — so at the floor step `drip`
  debits the source and reports the rest as soaked into the ground (a note
  on its result; the puddle that is there stays). Lens 1: a leak never
  pauses because of what is on the floor. With nowhere at all it
  throws `DetachedError` (the crystals' B105 rule).
- ⭐ **A leak inside something that is not a vessel** — a jug in a pack, a
  crock in a chest. Decided by **lens 1** (the world is derivable: water
  runs down and wets what it passes): the drip first wets the non-bulk
  container it is in (`wet()` up to that container's own water capacity),
  and only what the container cannot hold runs on, to the floor of the
  place that container is in — at the carrier's feet when it is carried.
  The rejected limb was landing it straight on the floor: a jug that
  empties through a dry pack is a thing a player could not predict or
  learn from. A body is not wetted by this in this build (what a carried
  pack does to the back under it is textiles' layer rule; Deferred seams).
- Collapsed onto it: the weep, `Percolating`'s run-off, `Mould`'s
  drainings, the crystallize arm's spent liquor, and the leak (D9).
- **Mould drainings keep their one-band drop** as `payload.grade` one band
  under the pool's batch grade, never above what the receiver's payload
  already carries.
- **The pore weep with no vessel under it** still wets the vessel's own
  outside first (the film and its evaporation ARE the weeping jar,
  `D/faces.md` § The weeping jar); what the film cannot hold drips. With a
  vessel in or on, the flow goes through at the filter rate, as shipped.
- **A spent pan's bittern** with nothing under the pan runs to the
  ground (requirements, Collisions). A pan still concentrating keeps its
  brine, as shipped.

**D10b — A liquid poured ONTO a porous solid (step 15).** The destination
decides: `PercolatingMixin` composes `PourTargetMixin`, so `pour <vessel>
onto <heap>` binds (the view's `requires:`) and the heap's own answer
takes the liquid — it debits the source and keeps `percolant: { material,
payload, litres }` (persistent), where today it holds only a number.
`transfer` and `PourController` gain no branch. As the reach advances the
share that has come through leaves by `BulkableApi.drip({ off: heap, … })`
carrying what the host says it took:
- `Ash` answers **lye**: the water, with the alkali that share of the heap
  gave (`dissolvedSolidsKgPerL`), its hardness loss, the `LyeStrength`
  band as `payload.grade`, and whose it is by the communal-oven rule
  (`D/potash.md` § Whose it is). On a bare floor that is a puddle of lye.
- **The hopper is unchanged.** `Hopper.leach` still puts the hopper's own
  liquor on its heaps by amount, with no carried matter, and `Ash` still
  enriches the liquor it lies in; `pour hopper into pail` draws it. The
  only edit there is `Ash` reading `dripSlots()[0]` where it called its
  own `percolatesInto`.
- `SugarLoaf.onPercolated` gives up its molasses through the same `drip`.
- The lye's material path: read where the hopper's leach names its
  product. If `trade-fuel` cannot name it without depending on
  chandlery, the Ash row authors the path (W2 decides; see Opens).

**D11 — One wall exchange, on `Faced`.** `Bulkable` keeps the clock and
the payload and calls `self.exchangeWith({ material, litres, payload },
dtS)`, which returns the new payload. Inside:
- **Sealed inside** (`isSealed('inside')`): neither source gives; only the
  coat's own leach runs.
- **The wall's own material.** The giving layer is the inside face's top
  coat when there is an unsealed one, else the body. It gives **its own
  material's** `imparts` (mg/L at full give) × `1 − spent`, toward that
  target over contact time (`faces.wallGiveDays`, set in W4 to the shipped
  whiskey profile's length so a first fill at maturity reads as it does
  today). There is no second profile on the body: a charred cask's giving
  layer is its char coat, and the char coat's material row carries the
  vanilla and the char. `spent` is per layer: `wallSpent[face]` for the
  body, `CoatLayer.spent` for a coat. `noteFill(face)` (called by the
  transfer, D2) spends `faces.wallSpentPerFill` on every fill after the
  first.
- **What the wall has absorbed.** An unsealed wall whose body is tagged
  `absorbent`, `porous` or `fired` learns `faces.aromaRetained` of what the
  contents give a nose held close: the dissolved aromatics, **and the held
  material's own `smells`** converted at each aroma's threshold (`strength
  × threshold` = mg/L) — which is what makes water in a whiskey cask smell
  of whiskey. It gives back toward what it holds, and what it gives it
  LOSES.
- **Char and pitch are coats** (`D/faces.md` § Seams already says so).
  `Faced.refireFace('inside')` lays a fresh coat of the char material the
  ROW's repair rung names (the cooper's re-fire recipe step carries the
  path; no settings-held path and no kernel default). A pitched ale cask
  is a cask with a pitch coat, which seals. The cask rows are rewritten
  (W4); oak's row gains `imparts` and the `absorbent` tag.
- ⭐ **`ExtractionMixin` holds `imparts` and `leaches`** (owner, 2026-11-20)
  — a material capability named for the physics, *what a wall of this
  gives what it holds*, never on `Odor` and no longer on `ToxicityMixin`
  (*"it POISONS"* — oak's vanilla is not a poison). `LeachSpec` and
  `getLeaches`/`setLeaches` move with it; the lead, tin, pewter and lead-
  glaze rows keep their `leaches:` key unchanged (a row field, not a
  mixin name). It is a kernel mixin: a `Mixins.Extraction` constant and a
  `MixinApi.hasExtraction` narrow (`lint:mixin-names`), registered with
  the material capabilities (`lint:material-kinds`). W4's first commit.
- **Washing.** `Soilable.washSite` calls `host.washAbsorbed(share)` when
  the host is Faced: the learned source falls by the wash's own strength,
  capped at `faces.washClears` (0.5) a wash. It never touches `wallSpent`.
- `Vat` composes `SoilableMixin` so `wash <cask>` binds.
- `look` words what the wall has left (`coatAugmenter` gains the line the
  retired `characterAugmenter` printed, derived from `spent`).

### What leaves a solution

**D12 — Sugar crystallizes; the stage names stay; grade is purity.**
`raw-liquor.yaml` gains a `solubility` curve and `crystallizesTo`; every
sugar liquor inherits them through `extends:`.
- The curve is sucrose's, in kg per litre of solution by
  `s = w / (1 − 0.375 w)` (the kernel's `solidsMassFraction`): about 0.89
  at 293 K, 0.98 at 323 K, 1.10 at 353 K, 1.20 at 373 K, and above 1.36 at
  the strike's boil (395 K) so the pan does not grain on the fire. W5 pins
  the last point against the elevation curve.
- `crystallizesTo: { product: loaf-sugar, residue: molasses, productAs:
  { /trade/sugar/thing/raw-sugar-block: raw-sugar }, drainDays: 4 }`.
- **The four arrows stay as what the boil reaches**: syrup (0.68), strike
  (0.9), caramel, burnt. Names; no solute leaves at an arrow.
- ⭐ **A pass's grade falls out of what is left** (requirements decision
  1), not out of a rule about bands. A sugar liquor carries `payload.purity`
  — sucrose's share of its dissolved solids — starting at the row's
  `purity` and raised by tempering and skimming (`Copper.temper`/`skim`
  write it; that is *temper and skim grade the liquor*). Crystallizing
  takes out sucrose only, so the residue's purity is `(S·p − x)/(S − x)`
  for `x` set out of `S` solids: molasses is less pure than its strike by
  arithmetic, and each re-strike less pure again. The liquor's
  `payload.grade` is read off its purity by the row's authored thresholds,
  and a liquor under the row's `minCrystalPurity` will not grain at all —
  that is blackstrap, and the strike arrow names it by `minPurity` where
  it had `minBand`. `ConcentrationArrow.minBand` goes (sugar and maple
  were its only users; W5 confirms by grep).
- Retired with it: `strike.yaml`'s `drainSetting`,
  `DrainSettingSpec.becomesAs` and `drainPerBand`, `Mould.bandsBelowFine`,
  `Copper.liquorBand`. `DrainSetting` and `drains:` survive for curd,
  slip, soap and latex.
- Maple: the sap row gains the same fields with `product` a new
  maple-sugar material row and `residue: maple-syrup`.

**D13 — The crop and its liquor.** `crystallizeIfOver` changes in three
places:
- it sets nothing while the liquor is held (D14);
- the crop's material is `productAs[cast template]` when the mould's shape
  names one, else `product`; its grade is `min(batch, mould)`, one band
  lower when the liquor nucleated on its own (a coarse mass);
- spent liquor in a mould stays in the pool as `residue` and leaves by
  `drip` over `drainDays` (two stamps on the payload and one wake at the
  due time); with no `drainDays` it leaves at once, as salt's does. A
  vessel still concentrating keeps its liquor, as shipped.

**D14 — Supersaturation waits.** A liquor over its solubility sets only
when nucleated. Four terms, one piece of state:
- **a seed** — derived: the vessel holds (its contents) a solid of the
  liquor's product. The seed joins the first crop.
- **stirring** — `payload.nucleated = true`, written by
  `Thermal.noteAgitated()`.
- **deep cooling** — derived: held/solubility ≥ the material's
  `metastableRatio` (sugar ≈ 1.7, salt ≈ 1.1, alum and saltpeter their
  own; absent = 1, today's behavior for any row that does not author it).
- **the drying edge** — derived: the vessel is losing water in the open —
  on the boil plateau, or a maturing vessel with an active batch (the
  shipped `concentrating` test). So a salt pan and a boiling brine hearth
  behave as today.

Once any term fires `nucleated` is stamped; a read that finds the liquor
back under saturation clears it. The flag rides the payload through a
pour.

**D15 — `put` and `stir` reach it; `stir` becomes a protocol.**
- `put <sugar> in <cone>` is the shipped `move` into a Container; the
  seed term is derived, so nothing new is called.
- ⭐ **`StirTargetMixin`** (W5's first commit) — the model-side protocol
  behind `stir`, `PourTargetMixin`'s shape: one method,
  `stirPlanFor(req): StirPlan | StirRefusal`. Three composers:
  - `CompoundingMixin` — its shipped `stirPlanFor`;
  - `ManualBuildMixin` — its shipped `stirPlan()`, renamed onto the
    protocol; with no build staged it answers `super` (the vessel's
    liquid) instead of refusing `'empty-build'`;
  - `BulkableMixin` — *the solution-holding vessel*: an interior holding a
    liquid is stirred in the shipped stir's time and effort; the
    completion asks the host's `Thermal.noteAgitated()` when it is
    Thermal and reports whether anything started. Empty, or not liquid:
    `'nothing-to-stir'`.
  A knead vessel's *"too stiff — knead it"* becomes its own answer on the
  protocol. `StirController` calls the one method and words the result;
  its three `MixinApi.isX` arms go. `stir.yaml`'s `vessel` arg becomes
  `requires: StirTargetMixin`, and its help states the three things a stir
  can meet. ⛔ Not on `ThermalMixin` (it is composed far more widely than
  the things that can be stirred); `Thermal` gains only the two small
  reads the phase engine owns.
- `BoilReading.analyze`/`measure` add a clause from
  `Thermal.supersaturation()`: over saturation and not nucleated, *"it is
  holding more than it can keep and nothing has started it."* The drive's
  *analyze reports it supersaturated* is `analyze boil <cone>`.
- The boiler brain (`refines.ts`) gains one step after `pour <kettle>
  into <mould>`: `put <piece of sugar> in <mould>` when a piece is in its
  reach, else `stir <mould>`. The boiling floor's `props:` gain sugar to
  seed with (⚠ re-planned at W0: `put`'s `item` is `scope: inventory`
  with `mustBeInInventory`, so a floor prop does NOT bind; the brain says
  `get <sugar>` first, the `get <mould>` → `put` precedent at
  `refines.ts:245–247`; the floor has no sugar prop today and gains
  `/trade/sugar/thing/sugar-piece`). The boiler stands on the boiling
  floor (its `cast:`), and the brain's lines run through the player
  dispatcher (`executeCommand`, unforced), so `get` then `put` bind as a
  player's would.

**D16 — One vaporization, one route.** The two points stay two fields
(`boilingPoint` for a liquid, `vaporizesAboveK` for a solid — a solid's
vaporizing point is not its boiling point); what merges is everything
after the point: a **vapor row** (`vapourMaterial`) and **one receiver
chain**, `BiomeApi.vent({ from, material, litres })`, beside the room
air's own receiver (`BiomeApi` already owns `resolveAtmosphereContentsFor`
and `airFor`; a dish of naphtha, a copper's steam and a cleaning rag are
not fire's). The chain, walking `from`'s holders outward:
1. **the head** — a holder Burner's `receiveVolatiles` (the retort's
   condenser; the kernel hook, shipped);
2. **the chamber** — the Burner's default `receiveVolatiles` now keeps
   the vapor as its chamber air when it is a lit, enclosed chamber, less
   `fire.chamber.leakShare` (0.1) that escapes at once;
3. **the room** — the first Atmospheric scope with a volume; a scope open
   to the sky takes none, the sink `addAtmosphereContent` already names;
4. **the flue** — when the fire goes out (`_goOut`, `_setLit(false)`) the
   Burner vents its chamber air onward: to the sky when it is `Flued`,
   into the room when it is not. Room air leaves by its shipped air-change
   decay.

Callers, all four: the kinetic volatiles (was `routeVolatile`); the boil
plateau's steam (water's `vapourMaterial` is the new water-vapor row);
`vaporizeIfHot` (salt's is the new salt-vapor row); the open-pour
evaporation and the two cleaning sites (opened in W6).
`Burner.chamberVapors` becomes litres keyed by VAPOR row, and the kinetic
`vapor:` map is keyed the same way. Salt glazing is then a row: the
stoneware body's firing change gains `vapor: { <salt-vapor>:
/stuff/idea/material/glaze/salt }`, and the potter's `pots` brain spec
gains the salting step and salt among the shop's props.

**D17 — Humidity counts water vapor.** `BiomeLogic.resolveHumidityFor`
and `localHumidityFor` add, for the scope's air contents whose material is
tagged `water-vapor`, their fraction over the saturation fraction at the
scope's temperature, capped at 100 %. The arithmetic goes on the
`Evaporation` value object.

**D18 — Smell reads the air.** `SmellModality.ownSmell(loc)` adds, for an
Atmospheric `loc`, each air content as a source: the gas row's `smells`
by `amountFactor(kg)`, `kg` = fraction × the scope's volume × the row's
density. Two guards: `reconcileAtmosphereContents` returns at once while
the world is held still (the fold must not write), and
`_atmosphereContents` gets a restore door that loads the rows it cites.
Pinned smell values that now include air re-baseline in the same commit.

### Water in a body

**D19 — One rain, one exposure, one face; two records.**
- `Moisture.exposureOf` moves to `Wet.weatherReach()`; `Moisture` calls
  it.
- **The film.** `WeatherLogic.wetOccupants` calls `takeRain(delta)` in
  place of its cast: the thing takes `delta × weatherReach()`, times
  `1 − wetness.shedShare` (0.8) when `isSealed('outside')`. `shedShare`
  applies to the film and to nothing else.
- **The soak.** In `Moisture.reconcileWater` the rain arm becomes a
  bounded flow off the rain record: what lands (`mm × cure.rewetPerMm ×
  exposure`) soaks in at the body's own rate — its `dryingRatePerHour()`
  × `cure.soakFactor` — up to `1 − moisture`. ⭐ Through a sealed outside
  the soak is **zero**: a glazed pot takes no rain into its body.
- ⭐ **One carrier.** The soak is carried by the rain record
  (`airSegmentsFor`) alone and never debits the Wet film. `D/spoilage.md`
  is explicit that held moisture must not ride `WetMixin` and that the
  coupling is *"a term, not the carrier"*: the film is a presence-pushed
  view of the surface that dries by itself; the soak must hold for a brick
  nobody is standing beside. Conservation, stated: the two records are fed
  by the same rain through the same exposure and the same face, and no
  water moves between them, so nothing is counted out of one into the
  other. The unbounded per-mm add is gone; `cure.rewetPerMm` survives only
  as the millimetre-to-moisture conversion.
- `Tangible.getWetIgnitionPenaltyK` is untouched.

### Order and proof

**D20 — Waves.** Substrate before the rows that read it, #7 first, each
wave green on its own. Docs are corrected in the wave that changes them.

**D21 — The drive.** One wire file, a soak twin for S1–S3, one browser
walk; § Test & gate strategy has every step.

## ⭐⭐ Host placement

| item | host | what composing it claims of every other composer |
|---|---|---|
| `FlawedMixin` | `Good`, `Vessel` (through `Integrity`), `Ship` | *it can carry a flaw, and a flaw lets liquid through.* True of every article and of a hull. ⛔ Not `Structure`: a building's damage is construction's layer wear. |
| `isSealed(face)` | `FacedMixin` | a question about a coat; every Faced thing can answer it. |
| `leakLPerHour` · `isLiquidTight` | `BulkableMixin` | *what it holds, it may lose.* Asked of the interior only; a surface slot (a floor's puddle) has no wall and answers 0 by having no interior. |
| `hullLeakLps` · `hullLengthM` · `hullDraftM` | `BilgeMixin` → `Ship`, `Boat` | *a hull takes water by her seams and her holes.* Both composers mean all of it. |
| `jointLeakShare` | `AssembledMixin` | its own joints; a one-piece thing answers 0 by having none. |
| `exchangeWith` · `noteFill` · `wallSpent` · `washAbsorbed` · `refireFace` | `FacedMixin` | *its inside wall gives and takes.* Read only where `faces()` says there is an inside. `wallSpent` is `{}` until a wall with something to give is filled. ⚠ The quiet-form test: most Goods never answer; they also never store. It sits beside `absorbed`, which has had this shape since ceramics. |
| `imparts` | the wall material's row | *a wall of this gives this.* Every oak thing that holds a liquid gives oak — meant (the requirements' *"anything authored inherits"*), and named in `D/potash.md` (W4). |
| `dripSlots()` | `ContainableMixin` | *something is under it.* True of everything that sits somewhere. |
| `PourTargetMixin`, `percolant` | `PercolatingMixin` → `Ash`, `SugarLoaf` | *a liquid can be poured on it and works through.* Both mean it. |
| `StirTargetMixin` | `CompoundingMixin`, `ManualBuildMixin`, `BulkableMixin` | *being stirred means something here.* A Bulkable with no liquid interior refuses by reason; the first two already answered. ⚠ Bulkable is also on floors and wells: a surface slot refuses `'nothing-to-stir'`. W5 states the count of Bulkable composers with an interior against those without; if the refusers are the majority the protocol moves to the interior-holding rung instead. |
| `noteAgitated` · `supersaturation` | `ThermalMixin` | two reads of the phase engine it already owns; no affordance, no verb. |
| payload fields | the payload | absent on water in a butt. |
| `metastableRatio`, `purity`, `minCrystalPurity`, `productAs`, `drainDays` | `SolutionMixin` rows | per material. |
| `takeRain` · `weatherReach` | `WetMixin` | *rain reaches it by where it stands.* Every Thing. |
| `DurableMixin` on `Boat` | transport's `Boat` | *a boat's seams wear and are mended* — true now that her seep reads them (D7). |
| `SoilableMixin` on `Vat` | `Vat` → casks, carboys, coppers, hoppers, curing pots | *a working vessel gets dirty and can be washed.* |

No guard re-narrows a host anywhere in this plan. Where the build finds it
wants one, that is a finding to write down, not code.

## Convention conformance

Checked at plan time against `CLAUDE.md`, `docs/antipatterns.md` and the
files above.

- **`props:` / `cast:`** — the only placement rows touched are the boiling
  floor's and the potter's shop's `props:`. No `container:`.
- **Places, not rooms** — no place is added.
- **Paths** — new rows at `/stuff/idea/material/gas/…` and the char coat
  (base-library), `/trade/forestry/idea/material/maple-sugar`, the
  stoneware entry under `/trade/ceramics/…`. No new root. No pack gains an
  Api, a logic singleton or a free helper; `FlawedMixin` and
  `StirTargetMixin` are kernel `lib/` because their composers have no
  common pack ancestor.
- **Module scope** — every new function is a method, or a module-private
  function in a file that already has them (`Thermal.ts`,
  `BulkableLogic.ts`, `CraftingLogic.ts`).
- **Import boundary** — `Containable.ts` names `BulkSlot` as a type (the
  `Container.closureLevel` precedent). `lib/bulk` still imports no
  subsystem: the payload fields are declaration merges.
- **Verbs on objects** (antipatterns § The FAT variant) — every new read
  is a method on the thing that owns it. The two Api statics, `drip` and
  `vent`, take ONE value parameter and dispatch across objects (source →
  receivers), the fourth mandate; neither has a world object as its first
  parameter and `lint:object-verbs` stays at zero.
- **Api ↔ Logic** — `drip` and `vent` are thin statics forwarding to
  `BulkableLogic` and `BiomeLogic`, gated like their neighbors.
- **Gates on new methods** — `Flawed.addFlaw` keeps `Integrity.addFlaw`'s
  policy; `Faced.exchangeWith`/`noteFill` are participant contracts
  (`FromMixin` Bulkable; `noteFill` also `FromModule` of
  `BulkableLogic`); `washAbsorbed` is `FromMixin` Soilable; `refireFace`
  is `FromModule('/platform/idea/api/CraftingLogic')`; `Boat.stove` is
  `FromModule` of `Propel`; `Thermal.noteAgitated` is `FromMixin`
  Bulkable; `stirPlanFor` is public, as it is today.
- **P3 refuse / skip / throw** — a drip with nowhere to go throws
  `DetachedError`; a hull with no authored material refuses the patch by
  reason row; a row a material names and nothing resolves throws at the
  setter; `stir` with nothing liquid refuses by reason row; a vapor under
  open sky is the documented sink.
- **P4 no duck typing** — `wetOccupants`' cast goes; `Retort`'s `typeof
  receiver.receive` test is replaced by the pack's own predicate in W6
  (`lint:duck-typing` may fall, never rise).
- **P5 the mixin decides** — the one controller edit REMOVES three
  decisions (`StirController`).
- **P6 persistence per content** — no class is made persistent. New state
  rides fields that already persist with their host (`flaws`, `coats`,
  `absorbed`, the interior payload) plus `wallSpent`, `percolant` and one
  leak due-time. `payload.maker` is an identity path
  (`getIdentityPath()`).
- **P7 load on use** — every new material path loads through a restoring
  setter (the `setCoats` precedent) or the act that names it.
- **P8 names** — mixins are adjectives or protocol names; no class is
  renamed; shipped `Mould` and `vapourMaterial` are not renamed
  piecemeal.
- **Lint gates** — the whole family (`pnpm -C packages/server
  lint:family`), and by name the ones this build moves:
  `lint:mixin-names`, `lint:mixin-clusters`, `lint:mixin-files`,
  `lint:capabilities`, `lint:object-verbs`, `lint:lib-statics`,
  `lint:thin-forwarder`, `lint:duck-typing`, `lint:silent-catch`,
  `lint:floating-promises`, `lint:reconcile-chains`, `lint:field-meta`,
  `lint:imports`, `lint:module-scope`, `lint:instanceable`,
  `lint:material-kinds`, `lint:aromas`, `lint:content-refs`,
  `lint:closed-vocabularies`, `lint:view-keys`, `lint:command-views`,
  `lint:one-word`, `lint:controller-decisions`,
  `lint:controller-resolution`, `lint:reason-rows`, `lint:test-seams`,
  `lint:test-bootstrap`, `lint:test-content`, `lint:drive-scripts`,
  `lint:unconsumed-seams`, `lint:wizard-axis`, `lint:schema`. A ceiling
  that wants to rise gets a caller audit, never a raise.

## Waves

Each wave ends at one commit, staged by name, pushed. Each runs `pnpm
test:near`, the touched packs' own vitest and `lint:family` before it
commits. B4 at every wave: grep `packages/content` for every renamed key.

### W0 — truth and census ✅ done (fc737ae4b)

- Correct `D/maturation.md:179` and
  `docs/slates/trades/libations-slate.md:106` (imparts deplete — true
  since coopering).
- Write the two censuses the later waves burn down, as test files pinning
  today's count: (1) every call that reads or writes `Graded`/`Crafted` on
  a Bulkable holder as its batch; (2) every site that picks a drip or
  vapor receiver.
- Confirm, and re-plan in place where one is false:
  - what `transfer` does into a floor surface already holding a different
    liquid;
  - that `ReachWarren.riverAt` hands `Propel` the reach's `obstruction`;
  - how `repair` binds a ship from her deck and the quay, and the
    predicate for a hull `maintain` mends;
  - that `/auth/test-hand`'s overlay reaches `interiorPayload`,
    `absorbed`, `coats` and **`parts`** (a `failed: 1` on the stave line);
  - that `refines.ts`'s `put` binds the boiling floor's prop sugar from
    the boiler NPC's scope;
  - the count of Bulkable composers with and without an interior (D15's
    host check);
  - which reach near the Rejection put-in is snag-choked.
- **Commit:** `plan(matter-overlaps): W0 — docs say what is true; the two censuses`.

**Build note (W0).** Docs corrected (`D/maturation.md` § `imparts`,
libations slate). Censuses at `lib/bulk/__tests__/BatchOnHolder.census.test.ts`
(`BATCH_ON_HOLDER_CEILING` 38 → W1 to 0) and `Receiver.census.test.ts`
(`DRIP_RECEIVER_CEILING` 16 → W2 to 0; `VAPOR_RECEIVER_CEILING` 6 → W6 to 0),
counted by code signature with comments stripped; a site W1 keeps because it
now reads the holder's OWN grade leaves the list with a build-note line.
Findings, one each:
- Floor of another liquid: `transfer` declines `material-mismatch`, applied 0
  → D10 re-planned (the drip soaks the rest into the ground, reported).
- `riverAt` returns `{currentMps, depthM, roughness, course, km, barSide,
  widthM}` and drops the stretch — no `obstruction` → D7 re-planned (W3 adds it).
- `repair <ship>` binds from the quay and an open deck, not an air-holding
  cabin; no runtime "maintained hull" predicate exists and the Faced
  `bareWearPerDay` pair would catch the boat → D8 re-planned
  (`DurableMixin.keptByUpkeep()` hook, Ship + Building true).
- `/auth/test-hand` needs no change: `dataOverlay` runs the applier's phase 1
  over every persistent field, and `interiorPayload`, `absorbed`, `coats`,
  `parts` all are. ⚠ `parts` is bracket-assigned whole and `ensureParts`
  then leaves `joints` empty — a drive overlaying a stave line's `failed: 1`
  must overlay `joints` too.
- `refines.ts`' `put` does NOT bind a floor prop (`item` is `scope:
  inventory`) → D15 re-planned (`get` first; the floor gains a sugar-piece).
  ⚠ For W5: `refines.ts:276` `put block in <kettle>` has no `get` before it
  and the unit test checks only strings — likely a shipped defect.
- Bulkable composers: 30 direct (17 kernel, 13 packs); 29 hold an interior,
  1 (`Floor`) is surface-only; slots are per row (`interiorBulk`) → D15
  stands on `BulkableMixin`, the refusal is the per-instance
  `hasInteriorBulk()` read.
- Rejection: no authored `obstruction` anywhere (seeded per bend,
  `RiverLine.ts:568`); put-in km 60.4 is bend #2 (clear); nearest choked is
  bend #4 ≈ km 59.2–58.5, then #7 → drive step 11 rewritten (offline hash;
  W8 confirms live).
- Not-opened items: `BlendIdentity` is identity only (name/appearance/
  keywords/discipline) → W1 takes the plan's fallback, `renderVerdict`
  takes the stamp; `Compounding.ts:321` and `CleanserUse.ts:35` vent by hand
  → W6 moves them too; maple sap is
  `trade-forestry/content/stuff/idea/material/food/maple-sap.yaml`; no `look`
  line names a Vat's maker → step 6 uses `analyze condition`; whiskey
  (`whiskey-aging.yaml`) has no length field, `ratePerDay` 0.011 —
  whiskey at ≈23 game-days, finished ≈90; `lint:drive-scripts` only bans
  `scripts/drive-*.ts` (drives live at `packages/wire/tests/<f>(.dirty).wire.test.ts`).

### W1 — the batch is the contents' (D1–D3) ✅ done (02b48999f)

- `Crafted.ts`: declare `grade`, `craftedAt` on `BulkPayload`.
- `BulkableLogic.transfer`: the top-up min on the payload; `faceCheckedS`
  never carried; delete `carryBatchIdentity`, `carryTopUpGrade`. (The
  `noteFill` call lands in W4 with its receiver.)
- Writers: `CraftingLogic` by-hand build and any bulk `output.stamp` → the
  out slot's payload; `Maturing` — `stampBatchMark` → payload maker
  (identity path) and craft time, `applyBatchGrade` → `payload.grade`,
  the input cap read from the payload at the batch's start, the `setGrade`
  witness and `batchInputBand` deleted; `Copper.regrade` → the liquor's
  payload (its purity form lands in W5); `Ash.onPercolated`;
  `Comminuting`'s sack; `Mould.creditDrainings`.
- Readers: `concentrateIfReached`; `Mould.carryPayload` (D3);
  `Thermal.setCrystals` passes the payload; `IronPot.setCake`;
  `Fractionating`; the two verdict augmenters render the CONTENTS' verdict
  from the payload (through `lib/craft/BlendIdentity`, opened in this
  wave; if it cannot host the read, `Crafted.renderVerdict` takes the
  stamp as an argument) and say nothing of the vessel; `Receptacle.ts:55`
  and any `wash`/`rinse`/`cool` skip of a crafted holder it describes.
- Docs: `D/assembly.md` § Host placement (line 195); `D/bulk.md`
  § `BulkPayload` and § `BulkableApi.transfer`; `D/maturation.md` § The
  transfer seam carries the batch's identity; `D/mould.md` § What rides
  onto the cast; `D/crafting.md` where it says a build stamps its vessel.
- Tests: `GradeCarry.test.ts` and `InputBandCap.test.ts` rewritten against
  the payload; new — a fine pour into a poor mould casts poor; a fine
  wine in a poor bottle stays fine; filling a potter's jug leaves
  `canBeNamedBy` true; a ferment in a cooper's cask leaves the cask the
  cooper's.
- **Acceptance:** census (1) at zero. **Commit:** `feat(bulk): a batch's
  grade and maker travel with the contents`.

**Build note (W1).** `BulkPayload.grade`/`craftedAt` declared in `Crafted.ts`;
`transfer` strips `faceCheckedS` on landing and folds a top-up's grade
(`lowerGrade`); the two carry functions are gone; census (1) is 0.
Decisions the plan did not make:
- Renamed what now writes the payload: `Maturing.signBatch` (identity path)
  / `gradeBatch`, field `inputGradeCap` (read at `startBatch`, cleared at
  reset — still persistent state: a reconcile rewrites the payload's grade
  every pass, so the cap cannot live there); `Copper.gradeLiquor`;
  `Mould.castGrade()` + `poolBandsBelowFine()` (drainings and
  `drainPerBand` read the pool's effective grade, min(payload, mould)).
  The ferment's `recipe: 'ferment:<key>'` stamp is dropped — `recipeId` on
  the payload is the blend's identity (`BlendIdentity`, `Palate`), so it is
  not written; an authored-substance craft output likewise gets no
  `recipeId` (its material is its identity).
- `ConditionReading`'s signature left the census: with no batch writing a
  vessel's grade, *"as it stands, it is fine work"* reads the thing's own.
- Census missed seven sites, moved too: `CraftingLogic.collectCandidate`
  (a bottle input's grade), `ManualBuild.servingPlan`, `Compounding`'s
  belly, `Palate.detailsOf`, `Comminuting.chargeFrom` (a bulk feed),
  `Churn` (greasy → the butter's payload), `WaterDrawable` (skips a crafted
  PRODUCT by `payload.recipeId`, not a Crafted holder). The bulk/edible
  `output.stamp` and `mintVessel`'s stamp moved to the out slot's payload;
  `vessel-not-crafted` is gone (its only reason was the stamp).
  `Fractionating` also caps a draw by the contents' own grade (a greasy
  churn's butter stays ≤ fair through the draw). `IronPot` keeps its
  explicit cake grade = the lye's payload grade.
- ⚠ For W8: an unauthored mould reads `GradedMixin`'s `fair`, so a world
  mould now caps its casts at fair (a fine strike in a stock cone → a fair
  loaf) — D3 as written; a row that should pass finer authors `gradeBand`.
  A grind's flour sack carries no maker any more (the meal does), so
  `controller-liquidity`'s `newMineKinds` sees it only by its title — check
  in the drive. `help pour` gained the D2 sentence.

### W2 — one drip (D10, D10b) ✅ done (b1c679583)

- `Containable.dripSlots`; `BulkableApi.drip` / `BulkableLogic.drip`,
  with the non-bulk-container wetting rule.
- `PercolatingMixin` composes `PourTargetMixin`, keeps `percolant`, and
  runs off through `drip`; `Ash` answers lye for a carried percolant and
  keeps its in-place arm for the hopper; `SugarLoaf.onPercolated` uses the
  same run-off.
- Delete `Bulkable.seepReceiver`, `Percolating.percolatesInto`,
  `Mould.drainsInto`, `Ash.percolatesInto`, `Thermal.drainLiquorInto`;
  move their callers. `reconcileSeepers` reads the same chain from the
  receiver's side. `PipeRun.leakOntoFloor` uses `transfer`.
- `help pour` (N13's sentence).
- Docs: `D/spatial.md` § Placement — where inside its container a thing
  sits (the drip); `D/mould.md` § Where the drainings go, § The mould
  keeps its drainings, § Percolation; `D/faces.md` § The water filter;
  `D/potash.md` (a watered heap on bare floor; the hopper unchanged);
  `D/dairying.md` (whey to the floor); `D/thermal.md` § Crystallizing (a
  spent pan's bittern).
- Tests: `Percolating.test.ts`, `Mould.drainings.test.ts`,
  `Thermal.crystallize.test.ts`, `water-filter.test.ts`,
  `SaltPan.test.ts` moved to the one read; new — a cone lifted onto the
  floor pools its drainings; a hoop on a bare board drains whey to the
  floor; drainings one band down on the payload; ash heaped on a floor
  and watered pools lye, the hopper's leach is byte-for-byte what it was;
  a leaking jug in a pack wets the pack and puddles at the carrier's
  feet.
- **Acceptance:** census (2), drip half, at zero. **Commit:**
  `feat(spatial): one drip — in, then on, then the floor`.

**Build note (W2).** `Containable.dripSlots()` + `BulkableApi.drip` →
`BulkableLogic.drip` (one `DripMatter` value; `{off}` draws through a
module-private `GivenUp` slot so every landing is a real `transfer`);
`floorSurfaceNear` now reads its floor off `dripSlots`; census (2)'s drip half
is 0. Decisions the plan did not make:
- ⚠ A loaf sits IN its cone, so "the vessel it is IN" would catch its molasses
  in the mould. Rather than re-narrow on `isMould`, `Bulkable` gained a hook
  `passesDripsThrough()` (default false; `Mould` true — an open foot hands on
  to what the mould drips to). `reconcileSeepers` follows it and keeps only
  candidates whose `dripSlots()` name this interior.
- `TransferVia.grade` carries the drainings' one-band drop (a top-up still takes
  the lower via `lowerGrade`). The weep's filter rate applies when an in/on
  vessel would TAKE what comes through (empty or same liquid); a crock of
  something else is skipped and the filter weeps slowly instead (was: held).
  The weep film is capped at the wall's `waterCapacityKg`; the rest drips.
- Percolation: `percolant {material|null, payload, litres}` with restoring setter
  `setPercolant`; `receivePercolant(litres)` stays the in-place form (hopper,
  clay). New hooks `percolateOut` (ash → lye) and `percolantPoured(by)` (ash
  titles the lye at the pour, the hopper's communal-oven rule). Non-liquid
  source → `nothing`; another liquid on a working heap → `mismatch`. `pour`
  gained the `onto` preposition. Opens 3 decided: the lye path is authored on
  the Ash row (`leachesTo`, constituent ref) on `wood-ash.yaml`. ⚠ Review
  fix: it first named chandlery's lye with no package dependency (an
  undeclared cross-pack reference); the lye ROW moved into trade-fuel
  (`/trade/fuel/idea/material/lye` — water through ash makes it; chandlery
  already depends on fuel) and its three references follow.
- Every drip with nowhere throws `DetachedError` — a spent mould pan checks
  before its liquor changes. Unit-test rooms that drain now carry a floor
  (Mould, Mould.drainings, Thermal.crystallize, dairying hoop).

### W3 — one leak (D4–D9) ✅ done (de05fc725)

- `Flawed.ts` split with `flawLeakLPerHour` and `patchMaterial`;
  `Mixins.Flawed`; `MixinApi.isFlawed`; `Integrity` extends it. ⭐ Run
  `lint:mixin-clusters` on the cut and record what it says (N1).
- `Faced.isSealed`; `holdsWater` loses its crack clause.
  `Assembled.jointLeakShare`; delete `leaks()`. `Bulkable.leakLPerHour`,
  `isLiquidTight`, `getClosure`; `Vat.getClosure`;
  `Container.closureLevel`; `PipeRun.isComplete`.
- `Bilge.hullLeakLps` and the two hooks; the seam bands and their dials
  move from `Ship`. Settings: `flaws.leak.crackLPerHour`,
  `flaws.leak.holedLPerHour`, `flaws.leak.dregsL`,
  `faces.holdsLiquidBelowSharePerHour`,
  `crafting.joint.slackSharePerHour`, `crafting.joint.failedSharePerHour`,
  `crafting.repair.patchKg`; `boat.leak.*` and `ship.leak.holed` removed.
- The drain in the wall's exchange, and its one wake (D9).
- `Ship`: compose `FlawedMixin`; delete `holed`/`setHoled`/`leakLpsFor`;
  `onStop`; `patchMaterial` from `hull.material`; the shipped ship rows
  author it. `stageShip`'s route if it names `holed`.
- Transport: `Boat` composes `DurableMixin`, overrides `bareWearPerDay`,
  loses `hullLeakLps`; `stove`. Water: `snagVerdict`; `plotPassage` calls
  it. `Propel.stroke` calls it.
- `CraftingLogic`: `mendHoles`; `MendRecord` and `Flaw.mended` gain
  `'patched'`; the fault and reason rows (`no-hull-material`); the ship's
  wear rung skipped. `help repair`, `help bail`, `help pour`, `help
  paddle`, `help fit` (*"a sprung stave is fitted, one at a time"*).
- `harbors.dirty.wire.test.ts`'s staged hole stays valid (it hands a
  flaw); its comment is updated.
- Docs: `D/faces.md` § Holding water, and porosity and lines 231–233 (the
  boat has a fabric now); `D/bulk.md` § Closure scale; `D/assembly.md`
  § Coopering and the cask (a sprung stave drains what the cask holds);
  `D/ship.md` § The hull: coat, seams, leak, § Boats, § Settings (grain);
  `D/harbor.md` and `D/river.md` where each names a hole or a snag
  (located in the wave).
- Tests: `Faced.test.ts`, `Assembled.test.ts`, `assembly-reads.test.ts`,
  `Ship.bilge.test.ts`, `Boat.leak.test.ts`, `Tangible.impact.test.ts`
  moved; new — the sum of three terms; a cracked glazed crock leaks at
  the crack's rate; ⭐ **a sprung stave drains a full cask; `fit` stops
  it** (a 25 L cask about a third down after an hour); a dried-out cask
  still spills a refill; the wake fires at the dregs with no read between
  (testing.md § Test the WAKE); one hole rule at a vessel's, a boat's and
  a ship's scale; a bare boat's seams open and a tarred one's do not; a
  boat struck at night is holed and a patched one leaks only by her
  seams; a holed ship refuses a course and a patched one sails; a hull
  with no authored material refuses the patch.
- **Commit:** `feat(bulk): one leak — pores, flaws and joints`.

**Build note (W3).** `FlawedMixin` split out (`Integrity extends FlawedMixin(Base)`,
now a `NestingConstructor` so the record's members reach the class); the flaw
look line moved with it and words a patch. `lint:mixin-clusters` on the cut:
Flawed one cluster (record), Integrity one (article) — the split is clean; the
ceiling fell 43 → 42 (Bulkable's capacity cluster joined through
`isLiquidTight`; Bilge's new leak read joined its store via a default
`leakedBetween = hullLeakLps × dt`). Decisions the plan did not make:
- Pores term gate = `isPermeable()`, REDEFINED as *neither face holds*
  (`!holdsWater(out) && !holdsWater(in)`): D4's "either face sealed → 0", plus
  the shipped "tight body (≤ 0.03) never weeps". `weeps()` (the look line,
  evaporative cooling) follows. The filter rate still applies when something
  under it takes what comes through; `leakLPerHour`/`isLiquidTight` use the
  weep rate, so a filter candle is still liquid-tight.
- `Durable.getCondition` keeps reading `isIntegrity` (not `isFlawed`): a ship's
  hole is in her LEAK, never her seams' band — `hullLeakLps` and `hullBand`
  read her wear condition, so a hole is not counted twice.
- `Boat.stove` is UNGATED, beside its ungated sibling `capsize`: `Propel` is a
  scheduler-run engagement (a root frame), so a `FromModule(Propel)` gate is
  never the caller and fails closed. Recorded, not hidden.
- `snagVerdict({obstruction, sogMps, nowS})` — no `lyingIn`: lying-in only
  changes `planPassage`'s words. `Propel` asks it of the stretch a stroke
  ENTERS (so a boat lying in a choked reach can paddle out).
- Dials: `flaws.leak.holedLPerHour` 640 (rowboat 0.4 L/s < a bucket's 0.5;
  Hesper ≈ 5.8 L/s, 78 % of her shipped 7.5 — one knob cannot meet both
  exactly; bailable won), `crackLPerHour` 4, `dregsL` 0.05,
  `failedSharePerHour` 0.4 (25 L cask −33 % in an hour), `slackSharePerHour`
  0.1, `faces.holdsLiquidBelowSharePerHour` 0.05, `crafting.repair.patchKg` 2.
- The leak integrates by midpoint steps (≤ 2 % of what is left each), runs out
  at the dregs, and drips the pore share `through: 'pores'` and the rest plain;
  a float crumb under 1e-9 L is debited so the wake is not re-armed. The wake
  is armed on the first read after a fill too (the just-filled path).
- `no-hull-material` reason row shipped (`/platform/reasons/`);
  `CraftingDecline` words the repair arm with the same sentence (the repair
  family still words its own declines). Boats are tarred in their rows (pitch,
  which has no weathering rate, so a tarred boat stays tight); ship rows author
  `hull.material: oak`. `Ship.recordMend`/`Boat.recordMend` integrate the bilge
  before a patch; `Building` and `Ship` answer `keptByUpkeep()`.
- The leak's wake is NOT host-bound (unlike `percolationWakeAtS`): host binding
  subscribes to the event registry, and every porous pot of water arms one —
  the callback checks `isDestroyed()` instead. (Host-bound, it broke every unit
  test that read a weeping vessel under a clock.)

### W4 — one wall exchange (D11)

- `Faced.exchangeWith` takes the leach, the memory and the own-material
  give; `Bulkable.reconcileFaceExchange` shrinks to the clock, the call
  and the writes. `noteFill` (and the transfer's call to it),
  `wallSpent`, `CoatLayer.spent`, `washAbsorbed`, `refireFace`.
  `imparts` beside `leaches` (D11's placement, decided here by the lints).
- `Maturing`: delete the eleven members named under New substrate; the
  repair rung calls `refireFace` with the coat its recipe step names.
- `Soilable.washSite` calls `washAbsorbed`; `Vat` composes
  `SoilableMixin`.
- Rows: oak (`imparts`, tag `absorbent`); the char coat material (its own
  `imparts`: vanilla and char); generic-objects `cask.yaml`,
  trade-distilling `cask.yaml` and `charred-cask.yaml` (a char coat
  inside), trade-brewing `cask.yaml` (a pitch coat inside). Settings:
  `faces.wallGiveDays`, `faces.wallSpentPerFill`, `faces.washClears`;
  `maturing.impartsSpentPerFill` removed.
- Docs: `D/maturation.md` § `imparts` — what the VESSEL gives (rewritten
  to point at faces); `D/faces.md` § The lead leach (it becomes *the
  wall's exchange*, the one model) and § Seams (the casks are migrated
  now); `D/assembly.md` § Coopering and the cask (*Character is spent and
  re-fired*); `D/cleanliness.md` § The wash; `D/dairying.md` (the crock);
  ⭐ `D/potash.md` — oak gives oak to a lye in an oak hopper, named.
- Tests: `CaskCharacter.test.ts` re-baselined on the face; new — the
  memory's first tests (learn, give back, run out, a wash halves it, a
  pitch coat stops both, the leach still runs under a sealed glaze); a
  fill is counted by the transfer; a restore round trip of `absorbed`,
  `wallSpent` and a coat's `spent`. ⭐ The potash drive
  (`potash.dirty.wire.test.ts`) pins the oak note in the hopper's lye.
- **Commit:** `feat(faces): one exchange through the wall, two sources`.

### W5 — graining is crystallization (D12–D15)

- ⭐ **First commit:** `StirTargetMixin`; `Compounding`, `ManualBuild` and
  `Bulkable` compose it; `StirController` calls the one method;
  `stir.yaml`'s `requires:` and help. No behavior change for a compound
  or a build. `refactor(crafting): stir is a protocol the target answers`.
- `Solution`: `metastableRatio`, `purity`, `minCrystalPurity`,
  `productAs`, `drainDays`; `ConcentrationArrow.minPurity` replaces
  `minBand`. `DrainSetting`: `becomesAs`, `drainPerBand` deleted. `Mould`:
  `bandsBelowFine` deleted.
- `Thermal`: the hold, the four terms, the crop's material and grade, the
  purity arithmetic at the set, the timed drain and its wake,
  `noteAgitated`, `supersaturation`.
- `Copper.temper`/`skim` write purity; `liquorBand` goes.
- Rows: `raw-liquor.yaml`, `strike.yaml`, `molasses.yaml`, the maple sap
  row, maple-sugar; `metastableRatio` on salt-water, alum-liquor,
  saltpeter-liquor. `BoilReading`. `refines.ts`. The boiling floor's
  `props:`.
- Docs: `D/thermal.md` § Crystallizing — the third arm (nucleation, the
  one model) and § The bath, and the boil; `D/mould.md` § The drain set,
  § The mould keeps its drainings, § Percolation; `D/bulk.md`; the sugar
  slate's strike, cone and percolation sections retire to those docs at
  the sweep.
- Tests: `Thermal.crystallize.test.ts`, `DrainSetting.test.ts`,
  `Mould.test.ts`, trade-sugar `rows`/`copper`/`loaf`/`refines`/`train`,
  forestry `sugaring`, quarrying `salt`, drilling `brine-chain`; new —
  each nucleation term alone; a strike held cold and unseeded sets
  nothing; seeded it sets and drains over four days; ⭐ **each pass's
  residue is less pure by the mass balance, its grade read off that
  purity, and the pass that falls under `minCrystalPurity` will not grain
  — blackstrap** (the season's arithmetic, here, not in the drive);
  temper and skim raise the liquor's purity and never touch the copper;
  maple sets; the brain seeds.
- **Commit:** `feat(thermal): sugar grains by solubility, and crystals
  wait to be started`.

### W6 — one vaporization, and the nose (D16–D18)

- `BiomeApi.vent` / `BiomeLogic.vent`; `Burner.receiveVolatiles`' default
  keeps chamber air; delete `routeVolatile`; move the four callers (and
  W0's two more: `Compounding.ts:321` and `CleanserUse.ts:35` add vapor to
  the room by hand — census (2) vapor half counts them);
  `chamberVapors` in litres by vapor row; the going-out vent.
- `BiomeLogic` humidity; `Evaporation`'s saturation read.
- `SmellModality.ownSmell`; the held-still guard and the restore door on
  `Atmospheric`.
- Rows: water-vapor, salt-vapor (with their aromas; new aroma rows if
  none fits), `vapourMaterial` on water and salt, the stoneware `vapor:`
  entry, the potter's brain spec and shop props.
- Docs: `D/fire.md` § The burner's hooks and § The clamp and the retort;
  `D/thermal.md` § Kinetics (the volatiles) and § The bath, and the boil;
  `D/ceramics.md` (salt glaze — no longer deferred; the harm stays the
  pottery slate's); `D/senses.md` § One smell: source, air, nose;
  `D/biome.md` (humidity; the vapor route's home); `D/weather.md` where it
  states humidity.
- Tests: `Thermal.heatwork.test.ts`, trade-fuel `retort.test.ts`; new —
  the chain rung by rung; a flued kiln's air goes to the sky and an
  unflued one's to the room; a boil raises the room's humidity and the
  air changes take it down; smell finds a gas in the air and the fold
  writes nothing.
- **Commit:** `feat(biome): one vapor route, and smell reads the air`.

### W7 — one water for porous bodies (D19)

- `Wet.weatherReach`, `Wet.takeRain`; `Moisture` calls the first and
  loses `exposureOf`; `WeatherLogic.wetOccupants`; the bounded soak arm.
  Settings: `wetness.shedShare`, `cure.soakFactor`.
- Docs: `D/weather.md` § Wetness — the cross-cutting gauge;
  `D/spoilage.md` § The water state and § Drying is a RATE (two records,
  one rain, the soak a term off the rain record); `D/ceramics.md` § Green
  ware — the water decides; `D/fire.md` (two waters — unchanged, said so).
- Tests: the Moisture and Wet suites; new — a glazed pot's body takes no
  rain and its film a fifth; a terracotta pot beside it takes both; a
  sheltered brick takes none; soak stops at capacity; the soak never
  moves the film; a wet week unattended (the season's arithmetic, here);
  the ignition penalty unchanged.
- **Commit:** `feat(wetness): rain lands by exposure, sheds off a sealed
  face, soaks into a porous body`.

### W8 — the drive

- `packages/wire/tests/matter-model-overlaps.dirty.wire.test.ts`,
  `…overlaps.soak.dirty.wire.test.ts`,
  `e2e/tests/matter-model-overlaps-walk.spec.ts` (§ Test & gate strategy).
- B2: make each checkpoint fail once on purpose. B3: the walk, once.
- The retail slate gets its one-line finding (grade does not price).
- `pnpm test` — the build's one full run, alongside the MR.
- **Commit:** `test(matter-overlaps): the blocking drive, the soak twin,
  the walk`; then the MR.

## Reachability wiring

Each link fails closed and silent; each is named so the build checks it.

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| seed a strike | `put` (shipped) | the cone is a Container | `crystallizesTo` on raw-liquor, inherited | the product row loads at the set (`ensure` in the act) | `put`'s destination takes a Mould — W5 confirms with the cone |
| stir a held liquor | `stir` (shipped view) | reachable vessel | the same | resident | ⚠ `stir.yaml` `requires: StirTargetMixin`; a bare `stir` still defaults to the build you are at |
| read the hold | `analyze boil` / `measure boil` | the sugar pack's reading row | `supersaturation()` | resident | the reading binds any Bulkable |
| water a heap | `pour <vessel> onto <heap>` | reachable heap | `percolant` | — | ⚠ `pour.yaml` `requires: PourTargetMixin` — hence the protocol on `Percolating` |
| mend a stave | `fit stave to cask` (shipped) | the cask | `failed` on the stave line; `tight-hooped` | the joint row is the bill's | ⚠ the joint's gate: a `driving` tool in reach and coopering at proficient |
| patch a hole | `repair` | `item` in `here/peers/person` | the flaw; the hull's material | — | ⚠ `requires: DurableMixin` (Boat is, D7); ⚠ a SHIP binding as `item` is W0's check |
| wash a cask | `wash` | reachable | `absorbed` | — | ⚠ `requires: SoilableMixin` — hence Soilable on `Vat` |
| hole a boat by play | `paddle` | the boat | `obstruction` on the reach | the river line is the warren's | — |
| salt a kiln | `put salt in kiln` | the kiln is a Container | `vaporizesAboveK`, `vapourMaterial`, the body's `vapor:` | ⚠ the vapor row and the coat row load with the salt and the body (the setters' `ensureCitedIn`) | — |
| smell the air | `smell`, `analyze atmosphere` | the room | air contents | ⚠ a restored room's air — the new restore door | — |
| humidity from steam | `measure humidity` | the room | water's `vapourMaterial`; tag `water-vapor` | as above | — |
| the wall gives | (on read) | — | `imparts` on the wall's material; the coats | the body's material is resident with the vessel; a coat's with `setCoats` | — |
| the NPC seeds | the brain's command lines | sugar in the boiler's reach | `props:` on the boiling floor | — | W0 confirms the bind |

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| a cask with a sprung stave, a cracked glazed crock and a holed boat lose or take water at a watchable rate; a sound one does not | W3 |
| nothing that drips or drains disappears | W2 (W3 for the leak, W5 for the liquor) |
| a whiskey cask makes water taste and smell of whiskey; washing reduces it; a pitched cask gives nothing | W4 |
| a filled vessel's condition reads its maker; its contents read theirs; filling never changes the maker | W1 |
| a poor mould casts poor; a poor bottle leaves its wine | W1 |
| cane and maple strikes set as crystal and mother liquor; an unseeded strike holds | W5 |
| a salted kiln makes salt-glazed stoneware and the shop smells of it | W6 |
| steam and retort fumes are smelled and measured | W6 |
| a glazed pot and a sheltered pot stay drier than exposed terracotta | W7 |
| a holed ship is refused until `repair` patches her | W3 |
| after a restart every state reads back | W8, with a restore test in each of W1–W7 |
| the docs each state the one model; none says imparts do not deplete | W0 and each wave's doc lines |

Nothing is unmapped.

## Test & gate strategy

**Units** carry the arithmetic: every term of the leak and the one hole
rule at three scales; the drip's rungs and the pack rule; the wall's two
sources and the wash; the top-up min and the shaping vessel; each
nucleation term; the purity mass balance; the vapor chain; the humidity
term; the rain film and the soak. ⭐ Two season outcomes are proved here
by arithmetic and never in the blocking drive: molasses re-struck to
blackstrap (W5) and bricks through a wet week (W7).

**Only the drive can prove:** that `fit`, `repair`, `wash`, `stir`, `put`
and `pour` bind what the steps name; that rows load on use in a standing
world; that state survives a restart.

**Gates:** `lint:family` and `pnpm test:near` at every wave; `pnpm test`
twice only (code-complete, `/finalize`).

### The blocking drive — `matter-model-overlaps.dirty.wire.test.ts`

`.dirty.` because it empties casks, holes and patches hulls and restarts a
world it owns. Staged steps name their tool. **No tool is owed** unless W0
finds `hand`'s overlay cannot set a payload or `parts`, in which case the
route gains it in W0.

| # | step | pace | check | how it is staged |
|---|---|---|---|---|
| 1 | sugar strikes and seeds (the boiling floor) | short | player | none — boiled, struck, cooled with `advanceWorldClock` under a game day; `analyze boil cone`; `put` a piece in |
| 2 | the strike drains to molasses | staged | staged | `hand` a cone whose payload is a nucleated strike with `liquorDrainStampS` four days back (`worldClockNow` − 4 d); the player sets it on the pot, then on the floor |
| 3 | maple sugar sets (the sugarbush) | staged | staged | `hand` a mould of maple strike and a piece of maple sugar |
| 4 | salt waits for its edge (the estuary pan) | short | player | none — the open pan under the clock; brine taken off into a crock, cooled, stirred |
| 5 | a cask remembers (Crowsfoot) | staged | player | `hand` two plain casks with `absorbed` set as a whiskey fill leaves it, and a pitched cask (a pitch coat inside); the player empties, fills, smells, washes |
| 6 | the whiskey is the distiller's | instant | player | `hand` a cooper-made cask holding a distiller's batch (the cask's own `maker`, the payload's) |
| 7 | a poor mould, a poor bottle | staged | staged | `hand` a poor mould and a poor bottle; pour a fine batch into each |
| 8 | a sprung stave leaks | short | staged | `hand` a full cask with a `parts` overlay, `failed: 1` on the stave line; one game hour (the level falls, the floor pools); `hand` the player a `/trade/coopering/thing/stave` and a `driving` tool, give them coopering at proficient (`practice coopering hard success`, the assembly drive's way); `fit stave to cask`; a further hour and the level holds |
| 9 | a cracked glazed crock | short | staged | `hand` a glazed crock, cracked, full |
| 10 | the crock remembers and washes (the creamery) | short | player | none — the shipped butter crock, emptied, refilled, washed |
| 11 | a snag holes her; `repair` patches her | short | staged | the rowboat: a clock jump to night and the boat launched at the Rejection put-in (km 60.4, bend #2, clear) and PADDLED downstream to the choked bend #4 (≈ km 59.2–58.5, `obstruction` ≈ 0.52 > `SNAG_CHOKED` 0.5; W0's offline computation of the seeded snag — confirm it on the running world) — the hole is play's; the Hesper: `stageShip` at the city quay's choked stretch, at night, then `course` at speed; each patched with stock of her own material |
| 12 | salt glazing | staged | player | `stage` the kiln lit and at heat with stoneware in it; the player puts the salt in, smells, reads the air, lets the fire out |
| 13 | steam and fouled air | short | player | a copper boiled by play; `hand` a retort with no condenser |
| 14 | rain and glaze (the weathering ground) | short | staged | `pinWeather('rain', …)`; two `hand`ed pots; held moisture read by `eval` (no player reading exists, and none is added); green ware in the hacks |
| 15 | lye goes where the ash lies (the chandlery) | short | player | none — ash in the hopper, watered, `pour hopper into pail` as today; then ash dropped on the floor, `pour pail onto` it, half a game day, and the floor's puddle is lye |
| 16 | restart | instant | staged | `restartWorld`; read back the seven states |

No step is `span`. Every clock jump is under a game day.

### The soak drive — `matter-model-overlaps.soak.dirty.wire.test.ts`

Named in the MR for the soak lane; never run by `/build`, a review round
or `/finalize`.

| # | step | pace | staged twin |
|---|---|---|---|
| S1 | a cask over three fills | span | step 5 (and W4's unit) |
| S2 | a curing house's season, the NPC seeding | span | steps 1–2 (and W5's blackstrap unit) |
| S3 | green bricks through a wet week | span | step 14 (and W7's unit) |

### The browser walk — `e2e/tests/matter-model-overlaps-walk.spec.ts`

Once, at code-complete, beside the blocking drive. The player-facing
steps: 1, 4, 5, 6, 10, 12, 13 and 15 — each a thing a person reads on the
page: the boil reading's hold line, the crop appearing, the smell line
naming whiskey, the verdict naming the distiller while `analyze condition`
names the cooper, the fumes in `smell`, the puddle of lye on the room's
line.

## Risks & opens

**For the owner:**

1. ✅ **`FlawedMixin`** (N1, D5) — owner 2026-11-20: keep the split.
2. ✅ **`imparts` and `leaches`** (D11) — owner 2026-11-20: a new
   extraction capability, `ExtractionMixin`.
3. **The lye's material path for a watered floor heap** (D10b): read from
   the hopper's leach product, or authored on the Ash row.

**Unverified at plan time — W0 checks each (listed in W0):** the floor
puddle of another liquid; `riverAt` and obstruction; how `repair` binds a
ship; `test-hand`'s overlay on a payload and on `parts`; the brain's `put`
bind; Bulkable composers with and without an interior; the choked reach.
Also not opened: `lib/craft/BlendIdentity.ts`; `CleanserUse.ts` and
`Compounding.ts`'s vapor sites; the maple sap row's path; which `look`
line, if any, names a cask's maker (step 6 falls back to `analyze
condition`); the whiskey profile's length; `lint:drive-scripts`' exact
expectations. `D/ceramics.md`, `D/potash.md`, `D/dairying.md`,
`D/harbor.md`, `D/river.md`, `D/biome.md`, `D/senses.md`,
`D/cleanliness.md` and `D/spatial.md` were located by heading, not read
end to end; each wave opens the doc it corrects.

**What could break:**

- **Pinned values move** beyond smell: `CaskCharacter` (the give is paced
  by contact time, not conversion), every test that read a vessel's grade
  as its batch, the whole sugar suite (bands become purity), green-ware
  slump timing is NOT expected to move (the film is untouched by the
  soak) — a change there is a defect.
- **The hull numbers.** Collapsing three hole dials and the boat's
  constant seep into one rule and the seam bands moves every shipped
  bilge figure; W3 pins the rowboat (bailable by one bucket) and the
  Hesper (near her shipped rate) and re-baselines `Ship.bilge.test.ts`,
  `Boat.leak.test.ts` and the harbors drive's bail and settle steps.
- **A bare boat now wears.** The shipped boats author their coats or
  they start opening at launch, as ships do. W3 checks every boat row.
- **Oak gives oak everywhere** — named in `D/potash.md`, pinned in the
  potash drive (W4).
- **`Container.closureLevel`** keeps its absorbent clause: #2 is one read
  for vessels and one read plus a wicking clause for shut containers.
- **`Vat` as Soilable** adds lines to `look` on shipped vessels.
- **The smell fold reads air on every room in the walk.** It must not
  write and must not load (`peek`, with the restore door doing the load).
- **`stir` on a build vessel with no build** now stirs the liquid in it
  instead of refusing `'empty-build'`; the libations drive's refusal
  wording is checked in W5.

## Deferred seams

- **Frost burst as a flaw** — the attach point is
  `PipeRun.reconcileFrost`; a line on the water-supply slate.
- **A leak onto the body under a carried pack** — the attach point is
  `drip`'s non-bulk-container rule; textiles' layer rule decides; a line
  on the textiles slate.
- **Salt-glaze fumes as a harm** — `pottery-slate`.
- **Construction's wall layers holding water** — they attach to
  `Wet.takeRain` and the soak arm; the construction slate.
- **Retail pricing by grade** — `payload.grade` is the read; one line on
  `retail-slate`.
- **A crucible as a made thing** (`Receptacle` composing `Crafted`, now
  that a pour no longer overwrites it) — smithing's next build.
- **Cane inversion beyond its grade loss** — the sugar slate; `purity` is
  its attach point.
- **A plug in the cone** (a mould that holds until it is unplugged) — the
  sugar slate; today the liquor's own `drainDays` paces it.

## Critical files

Read these first, in this order.

1. `docs/requirements/matter-model-overlaps-requirements.md`
2. `docs/slates/tech-debt/matter-model-overlaps-slate.md` § Reuse ledger
3. `docs/antipatterns.md` § Thin Api Wrappers (the FAT variant), § Duck
   Typing with Mixins
4. `packages/server/src/mud/lib/material/Faced.ts`, `Integrity.ts`,
   `Toxicity.ts`
5. `packages/server/src/mud/lib/bulk/Bulkable.ts` (the payload, 1180–1470),
   `lib/bulk/PourTarget.ts`
6. `packages/server/src/mud/platform/idea/api/BulkableLogic.ts`
7. `packages/server/src/mud/lib/craft/Assembled.ts`, `ManualBuild.ts`;
   `lib/expanse/Bilge.ts`
8. `packages/server/src/mud/lib/thermal/Thermal.ts` (1555–1900, 2185–2220,
   2520–3000)
9. `packages/server/src/mud/lib/mould/Mould.ts`,
   `lib/maturation/Maturing.ts`
10. `packages/server/src/mud/lib/material/Solution.ts`, `Volatility.ts`,
    `Percolating.ts`, `Moisture.ts`
11. `packages/server/src/mud/lib/wetness/Wet.ts`, `lib/fire/Burner.ts`,
    `lib/biome/Atmospheric.ts`, `api/biome.ts`
12. `packages/server/src/mud/platform/idea/Ship.ts`, `platform/thing/Vat.ts`
13. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (the mend
    ladder, 3923–4400), `WeatherLogic.ts` (1351–1373),
    `platform/idea/cmd/crafting/StirController.ts`
14. `packages/server/src/mud/platform/idea/modalities/SmellModality.ts`
15. `packages/content/transport/src/thing/Boat.ts`, `src/lib/Propel.ts`;
    `packages/content/water/src/idea/WatercourseCatalogue.ts` (1440–1490)
16. `packages/content/trade-sugar/src/` (all) and its `material/` rows;
    `packages/content/trade-fuel/src/thing/Ash.ts`, `Retort.ts`;
    `packages/content/trade-chandlery/src/thing/Hopper.ts`;
    `packages/content/trade-coopering/content/joints/tight-hooped.yaml`
17. `docs/subsystems/faces.md`, `assembly.md` § `fit` and § Coopering,
    `ship.md` § The hull, `spoilage.md` § Drying is a RATE, `mould.md`
    § Where the drainings go
18. `packages/wire/tests/harbors.dirty.wire.test.ts`,
    `assembly.dirty.wire.test.ts`, `packages/wire/src/harness/world.ts`,
    `docs/testing.md` § Staging and § Test the WAKE

## Drive record

*(appended at build time — the blocking drive's output and what it found;
the soak drive's name for the lane.)*
