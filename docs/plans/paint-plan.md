# Paint and adhesives — implementation plan

Executes `docs/requirements/paint-requirements.md` (**kind: feature ·
leads from: KERNEL**, first consumer the paint content shipped in the same
build). The build gives every `Structure` a **landing** (the derived place
where it meets the weather), composes the shipped `Faced` coat stack onto
it, teaches a coat to **set by its binder's chemistry read off the air**
and to **weather**, moves the residence shell onto a kernel `Shell`
capability every building composes, adds one verb `paint`, makes **paint a
mixture whose properties derive from what went in**, taps **resin** from
pine and cuts it to turpentine and rosin, makes **glue** from what ships
and gives the glued joint a real glue, ships the three **hazards** (the
slow lead poison, the smoldering rag, turpentine fumes), and stands up the
**colorman at Wharfside** and the **house painter's round**. A new
capability pack, `trade-painting` at `/trade/painting`, carries the trade.

Branch `reqs/paint` (worktree `build-2`, **`WIRE_PORT=2013`**), cut off
`origin/master` after the cordage merge. ⚠ Vocabulary: American English in
every new name (*color*, *mold* in prose; the shipped `Colour` class and
`MouldMixin` are not renamed). ⭐ *Painter* means someone who paints (the
owner, 2026-11-01: "ask anyone"): the diving pack's boat line was renamed a
**bow line** and Tam Rook answers to `painter` (B30).

---

## Requirements gaps

Found at planning; none reopens scope, each is recorded rather than
absorbed silently.

1. **AC "the chandlery's milk of lime works as limewash with no change to
   the chandlery."** The kernel rule for *is this liquid paint* is
   `Material.laysCoat` (the dip bath reads it, `GlazeTub.ts:56`), and
   `trade-chandlery/…/idea/material/milk-of-lime.yaml` authors neither
   `laysCoat` nor `coatWord`. The ROW gains two keys (`laysCoat: true`,
   `coatWord: limewashed`); no chandlery class, verb or kettle changes.
   Read "no change to the chandlery" as *no mechanism change* — the
   requirements' own Placement line says *no pack change* — and the plan
   makes exactly that edit (W4).
2. **"An oil coat warms as it sets"** (AC 7) — a `Structure` is an Idea
   with no thermal body, so the warmth is not a temperature anybody can
   read off a wall. It is REAL on a good with `ThermalMixin` (the rag heap,
   where it is the whole hazard) and the survey SAYS it of a building
   ("the new oil is still curing, faintly warm to the hand"). Recorded;
   the arithmetic (exothermic oxidation → `depositHeat`) is one rule in
   both places.
3. **Drive step 12 (restage = reboot)** cannot be driven inside one wire
   boot. Its blocking twin is staged: capture → fresh materialize through
   `eval`, asserting the staged structure writes NO record and the owned one
   round-trips its coat; the reboot path is a unit test over
   `StuffApi.singleton`'s capture-first branch. The soak lane cannot reboot
   either, so step 12 has no soak half.
4. **Step 15 "the infirmary can name it"** — the clinical path (`assess`)
   names a condition by its band; the chronic lead band is a row. No new
   medical verb; recorded so the build does not go looking for one.

---

## ⭐ Sibling builds — the pre-wave check

`./tools/wt-status` (2026-10-31): build-1 `reqs/cover`, build-3
`build/client-surface`, build-4 `reqs/harbors`, soak detached. **Not
verified by reading their diffs this session**; the harbors build
(ships, quays, *a ship is always alongside a room*) is the likely
collision — `AboardExit.ts`, `Ship.ts`, the estuary/wharfside landing rows.
Before W0 and before any wave that touches a shared file:

```bash
git fetch origin
git log --oneline origin/master -- <file>
git -C ../build-4 log --oneline origin/reqs/harbors -- <file>
git -C ../build-1 log --oneline origin/reqs/cover   -- <file>
```

Shared-file watch list: `platform/idea/Structure.ts`, `Ship.ts`,
`AboardExit.ts`, `lib/material/Faced.ts`, `Material.ts` (`fieldMeta`
union), `lib/mixin.ts` (`Mixins` union), `api/mixin.ts`, `PackLogic.
discover.test.ts` (recount, never sum), root `package.json`/`pnpm-lock`
(`pnpm install`, never hand-merge), `AppSettings.ts`. ⛔ Never gate a wave
on a sibling's merge: plan around its branch; whichever lands second
reconciles.

---

## Grounding

Verified by opening files on 2026-10-31 (three survey passes plus this
session). `K` = `packages/server/src/mud`.

### Structure, Ship, how they load

- `K/platform/idea/Structure.ts:63` — `Structure = Detailed(Visible(
  Perceptible(Named(Singleton(Idea)))))`; fields `extent · entrance ·
  landmark · heightM · storeys` (all persistent + authorable, `:66-72`);
  `storeyOf` `:102`, `membersOf(key)` `:138` (RESIDENT members only, via
  `StuffApi.findAllByTemplatePath` + `findByPathGlob`), `hasMember(path)`
  `:160` (pure prefix test), `canEvict` always vetoes `:174`. **No
  `PersistableMixin`.** Header `:34` says *"⛔⛔ It is never made of
  anything"* — the owner corrected this at requirements: a structure IS
  made of materials (a bill to erect and maintain), modelled differently
  from a Thing because it is an Idea. W0 rewrites the header and
  `construction.md`.
- `K/lib/stuff/Singleton.ts` — the mixin enforces **one live instance per
  template path in `StuffApi.clone()`** (a second clone throws). A keyed
  `(scope, key)` instance of a `Structure` row is therefore impossible
  without a non-singleton base (D6).
- `K/platform/idea/Ship.ts:61` — `Ship = Persistable(Voyaging(Moving(
  Engaged(Positioned(Structure)))))`; `Steamer extends Ship`
  (`Steamer.ts:27`). Ship IS captured (`api/stuff.ts:819-850`: a
  persistable singleton restores when a record exists, else seeds and
  captures first); a plain Structure re-hydrates from its row at every
  `singleton()` — so today a staged building resets every reboot
  (= restage) and nothing about a building persists.
- Loading: `K/lib/zone/LocationZone.ts:60` `addLocation` →
  `standUpAttached` `:79` (singletons everything the location graph
  attaches to the room's path) and `lookOutFrom` `:106` (stands up
  horizon structures). `K/platform/idea/LocationGraphRegistry.ts:451-458`
  derives the attachment `extent → structure` (kind `structure`) from
  ROWS only.
- Resolution: `NavigationApi.structureAt(path)` (async, stands up) /
  `structureAtNow(path)` (sync) — `K/platform/idea/api/NavigationLogic.ts:306-316`
  → `innermostStructure(place, paths)` `:65` resolves each attached PATH
  with `StuffApi.findByTemplatePath` and picks the longest extent. A minted
  structure with a shared row path is invisible to it (D6 adds the live
  registration).
- `K/lib/biome/Atmospheric.ts:1383` `exposure()` (memo keyed on the
  structure's `stuffId` + resident neighbours, re-checked once a real
  second), `buildExposure` `:1432` (a face is interior iff the neighbour is
  a member AND enclosed `:1470`), `construction()` `:1351` (undeclared +
  sky biome → roof `none`; undeclared non-sky → walls on five faces).
  `K/lib/spatial/Exposure.ts`: `rainReaches()` `:106` (`top === 'open'`),
  `holdsAir()` `:166` (`top !== 'open' && !wallsNone`),
  `exteriorAreaM2()` `:~170` (Σ exterior wall areas + the roof when it is
  one). `airChangesPerHour()` `Atmospheric.ts:1079` is `Infinity` under the
  sky; atmosphere contents decay by `exp(−ach·t/3600)` `:1046-1060`.
- Exits: `exit.getDestinationTemplatePath()` (`K/lib/boundary/Exit.ts:985`)
  reads the AUTHORED destination without loading; `getObviousNeighbours`
  (`K/lib/boundary/Exitable.ts:548-577`) skips non-resident destinations.
- Ships alongside: `K/platform/idea/AboardExit.ts` — a
  `DeferredDestinationExit` on the quay room, authored destination = the
  usual berth (her deck); `alongside()` `:80` (PRIVATE) answers which Ship
  lies at this node NOW (within the node's radius, no course); the river
  twin `alongsideOnRiver` `:98` (`landingNear(pos, 60 m)`). The quay has NO
  field naming its ship. Rows: `platform/…/idea/exits/aboard.yaml`;
  `terminus/…/estuary/estuary-mouth.yaml:60` (`aboard → /world/terminus/
  hesper/deck` — the Hesper's berth; she starts lying at the bar,
  `hesper/structure.yaml`), `wharfside/bank.yaml:61` (the Ostrander),
  `woodyard/landing.yaml`, `gannet-rock/landing.yaml`.
- Targeting: `look.yaml` `target` scope `["$focus", "reachable"]`;
  `K/api/mql/scope-walk.ts:216` `candidatesForReachable` = person + here +
  peers; `candidatesForHere` `:60` = the room, its details, its doors, its
  exits. A `Structure` is NEVER in it. Only the `horizon` seed binds one
  (`resolver.ts:168` `SEED_WORDS`, `:509`, `:799` → `PerceptionApi.
  horizonFor`; `PerceptionLogic.ts:1381-1391` EXCLUDES the structure you
  stand in). `QueryController.ts:148` special-cases landmark structures in
  the "You can see" line. ⚠ The MQL grammar stays small (no new seed): the
  landing enters the `here` pool (D2).
- `survey.yaml` has no target (the controller reads the room);
  `K/platform/idea/cmd/perception/SurveyController.ts:119-126` prints
  `holding.conditionBand()` + `conditionCause()` + the term; `holdingOf`
  `:274` duck-types the warren (`conditionBand`/`getUpkeepTerm`/
  `getMembers` as functions).
- Envelope lint: `packages/server/scripts/check-envelope.ts:270-274`
  (`STRUCTURE_CLASSES` = Structure/Ship/Steamer) and `:424-470` refuse
  `enclosure`/`roof` on a structure row and police `storeys`. Nothing
  refuses `coats:` on one.

### The residence shell (what moves)

- `packages/content/residence/src/idea/HoldingWarren.ts` = `Persistable(
  WarrenMember(Container(RoomWarren)))`; `UPKEEP_TERMS` `:77`;
  `CONDITION_BANDS` `:85`; fields `shellCondition`/`shellStamp` persistent
  `:105-125`; `reconcileShell` `:629` (linear, `0.5/(daysToWorn·86400)` per
  second; dial `residence.weather.daysToWorn` = 45,
  `residence/content/settings/residence.yaml:27`); `conditionBand` `:645`;
  `conditionCause` `:656` (*"The paint is going…"* / *"The paint has gone;
  rain has gotten into the sills."*); `restoreShell` `:666`.
  `holdingKey()` `:226` = the `(scope, key)` key (the lot's / unit's parcel
  extent); `wake()` `:335` mints rooms as keyed clones of real rows;
  capture with key `:318`.
- `residence/src/idea/cmd/crafting/MaintainController.ts` — needs a
  `WarrenMember` room of a `HoldingWarren`, a carried `upkeep` tool,
  refuses `sound`, `restoreShell()` + `KIT_WEAR 0.08`; `HouseholdersKit.ts`
  (a `Tool`) contributes `system/residence/cmd/crafting/maintain.yaml`.
- `residence/src/behavior/maintains.ts` — config `{extent, batch}`; walks
  holdings under the extent, teleports to `entryRoom()`, `forceCommand(
  'maintain')`; reads `conditionBand()` duck-typed (`HoldingShape`). Cast:
  Katie (`duncan-hall/units`), Walter (`mayfield-row/seznick-house/units`).
- `K/lib/location/CirculationWarren.ts:346` `conditionOf(extent)` → the
  programme's `reconcileShell`/`conditionBand` duck-typed; read by the
  ascent gates `residence/src/idea/cmd/banking/TitleController.ts:513-523`
  and `terminus/src/mayfield-row/idea/cmd/LeaseController.ts:153-163`
  (dial `residence.ascent.minCondition` 0.5); spied in
  `SeznickHouse.test.ts:480`, `TitleVerb.test.ts:548`.
- Holdings with no Structure row: Seznick House (`mayfield-row/seznick-house/
  building.yaml` is a `BuildingWarren`, units mint per `(scope, key)`),
  Hinkley Hills (`hinkley-hills/…/idea/house-programme.yaml`, one keyed
  instance per sold lot; the lane `location/lane.yaml` hangs a gate per
  lot), Duncan Hall (the dorm).
- Building row precedent: `terminus/…/goods-yards/sugar-house/structure.yaml`
  (`/platform/idea/Structure`: extent, entrance, heightM, storeys). **No
  Structure row anywhere at Wharfside.** `grep -rln cottage` over terminus,
  rejection and world-seed content finds only `rejection/…/gas-flat.yaml` —
  the drive's cottage is new content (W8).

### Coats, color, setting, mixing

- `K/lib/material/Faced.ts` — `CoatState = wet|set|crazed|run|crawled`
  `:46`; `CoatLayer {material, thicknessM, state, dirtyAtLay?, progress?}`
  `:66-78`; `coats` per face `outside|inside` (persistent, authorable,
  runtimeState `:204`); `layCoat` `:278` (always `wet`; default thickness
  dial `facesDipThicknessM` 0.0003); `heatCoats` `:289` (heat-work via the
  material's first kinetic change, else the melting point; its only caller
  `ThermalMixin.reconcileCoats` `K/lib/thermal/Thermal.ts:1298-1310`);
  `fuseCoats` `:323`; `coolCoats(atK)` `:342` (only caller `Rope.getCoats`
  `K/platform/thing/Rope.ts:402-405`, `SETS_BELOW_K 300`); `fusedCoat`
  `:364` (run past scorch · crawled over dirt · crazed by expansion
  mismatch · else set); `COAT_WORDS` `:157-166` + `coatAugmenter` `:177`
  (the look line); `outermost()` `:271` (top coat's material, else the
  body's — `MixinApi.isTangible` guarded, so an Idea answers `null`);
  `holdsWater` `:383`; `cleansAs` `:401`. `FacedMixin<TBase extends
  MixinConstructor<Stuff>>` `:196`, host deps all soft
  (`isBulkable`/`isTangible`/`isIntegrity`) — composes on an Idea without
  a guard. Only composer `K/lib/stuff/Good.ts:74`. **`thicknessM` is never
  read. Nothing sets by humidity, rain, CO₂, O₂ or time; no coat ever
  wears; a coat has no color.**
- Dip: `K/lib/craft/DipBath.ts` (`dipPlanFor` `@hook`, the bath affords
  `platform/cmd/crafting/dip.yaml`); `K/platform/thing/GlazeTub.ts:50`
  (`DipBathMixin(CompoundingVessel)`): `skinLitres` `:42` = `6·V^⅔ ×
  thickness × 1000` per face, requires `material.getLaysCoat()`, refuses
  `not-faced` / `no-such-face` / `bath-too-low`, calls `target.layCoat`
  `:115`. The target-plans-the-coat protocol for `paint` mirrors this
  (D9).
- `K/lib/material/Kinetics.ts` — `KineticSpec` `:126-178` (`rate` dose law
  `{referenceK, zK, fullDoseS}` or curve; `agent`, `scorchAboveK`,
  `requiresStarvedAir`, `volatiles`, `ladder`, `words`…); `rateAt(kelvin)`
  `:313` **temperature only**; `floorK()` `:331`. Rubber's cure row
  `base-library/…/organic/compounded-rubber.yaml` is the dose-law
  precedent.
- `K/lib/material/Material.ts` — `meltingPoint :570`, `lightAbsorption
  :533`, `kinetics :568`, `vapourLPerLPerHour :915` + `vapourMaterial
  :921`, `laysCoat` (fieldMeta `:1192`), `coatWord :1195`, `solidsKgPerL
  :1205`, `concentratesTo :1215`, `chillsTo :662`, `getToxicity :1303`,
  `corrosiveTo`. **No color, no pigment, no weathering rate, no adhesive
  block on a material.** Tag `waterproofing` on `bulk/pitch`,
  `bulk/wood-tar`, `organic/beeswax`; `pitch.yaml` authors `laysCoat:
  true, coatWord: tarred` (the shape for every binder row).
- Color: `K/lib/perception/Colour.ts` (subtractive transmittance, stack
  fold, `nearestTag`, `toHex`); `K/lib/material/Dyed.ts` (`DyeApplication`
  stack, `fastness`, `getColorMix :256`, `getColorTag :291`, `bleach`)
  composed by `Garment` and `ClothBolt` only; the dyestuff row shape
  `trade-dyeing/…/idea/dyestuff/madder.yaml` (`shades[].transmitR/G/B`,
  `fastness`). Sun fade: `K/platform/thing/equipment/Garment.ts:281-319`
  `reconcileAiring` (sky-exposed room, daylight walked in 2-hour steps via
  `CelestialApi.isDayAt`, capped at ten days; `bleach(sunDose·0.5)`).
- Mixing: `stir` → `StirController` → `Compounding.kneadPlanFor`
  (`K/lib/material/Compounding.ts:196`) → `compound()` `:275` = ONE mint
  `CraftingApi.mintFromBuild({charge})`; product = the VESSEL's
  `productMaterial` (`:128-136`, one per vessel row), no recipe.
  `BulkPayload` (`K/lib/bulk/Bulkable.ts:143`) carries `recipeId`,
  `appearance`, `keywords`, `cookedAtK`, `faceCheckedS`, `bulk.affordance`;
  the declaration-merge precedent for a subsystem's own payload field is
  `lib/cleanliness/WaterHardness.ts` (`hardnessDgh`) and the plateau's
  `dissolvedSolidsKgPerL`. Milk of lime is made only in
  `trade-chandlery/src/thing/SoapKettle.ts:85-140` (`matchProfile`
  override) and is NOT sold.
- Boiling down: the Thermal boil plateau (`Thermal.ts` `concentrateIfReached
  :2438`, `purifyIfHeld :2473`; rows `maple-sap.yaml` with `boilingPoint`,
  `solidsKgPerL`, `boilingPointElevation`, `concentratesTo`);
  `enclosingBath` puts an immersed solid at its bath's temperature.
  Butchery's long-moist cook (`K/lib/butchery/Texture.ts`, `LONG_COOK_S
  7200`) changes only GRADE — **no collagen → gelatin material change
  exists.**

### Joints and assembly

- `K/platform/idea/Joint.ts` — `JointDescriptor` `:46-74`: `portability ·
  instrument · competence · reversible freely|effort|never · strength ·
  structuralRecovery · fastenerRecovery · tightenable · needsFlat ·
  failure slack|sprung|parted|split|spilled`; `JointCatalogue.ts:133-170`
  validates. `platform/…/idea/Joint/glued.yaml`: `hand`, `reversible:
  never`, `strength 0.7`, recoveries 0, `needsFlat: true`, `parted` — **no
  glue field, consumes nothing.** The one content use:
  `generic-objects/…/thing/arms/shield.yaml:52` (`facing: glued, members
  [hide-face, shield-board]`).
- `K/lib/craft/Assembled.ts` — `BillJoint {key, method, members,
  fastener?}` `:113`; `JointState {key, method, members, fastener?,
  tension, maker}` `:215` (no set state); `jointRow()` sync peek `:385`;
  `getJoints()` `:714` → `reconcileWarp` `:693`; `seatFlatJoints` `:740`;
  `wear` `:1194` slackens by `a·(1−strength)` `:1213`. Fastener consumed
  only as a recipe input through `fit`'s raise arm (`CraftingLogic.ts:4733-4766`
  `fitImpl` → `craftImpl`) and the replace arm (`~:4870`); `jointGate`
  `:4697`; new joints tension 1 (`:2665-2672`); `salvageByJoints` `:5042`
  (`never` → 0 `:5069`).
- `K/platform/thing/Vat.ts:168-171` `getJoints` override →
  `reconcileDrying` `:185` — the one shipped joint that reads its
  surroundings (empty for `cask.dryOutDays` → every joint slackens once).
  The precedent for the glue line's damp/heat read (D11).

### Fire, soil, wetness (the rag)

- `packages/content/trade-farming/src/lib/SelfHeating.ts` —
  `SelfHeatingMixin` (on `HayBale` only): scalar `rickCoreK`, constant
  `AMBIENT_K 288`, `PEAK_HEATING_K_PER_DAY 3`, `COOLING_PER_GAME_DAY 0.08`,
  `RUNAWAY_K 328`, bands cold/warm/hot/smoking; **never ignites, no
  Thermal/Fire call.** A pack `lib/` — a second composer in another pack is
  the kernel-promotion signal (`CLAUDE.md` § Module Categories).
- Primitives: `ThermalMixin.depositHeat(joules)` `Thermal.ts:843`;
  `Combustible.tryAutoignite()` `K/lib/fire/Combustible.ts:333` →
  `FireLogic.tryAutoignite` `:159` (wetness-adjusted autoignition point,
  `Material.autoignitionTemperature :488`); `Combustible` composers in
  platform: `Firewood.ts` (+ test fixtures).
- Soil: `K/lib/cleanliness/Soilable.ts:179` `soil(kind, amount, by?,
  site?)` — a scalar load per site × `DirtKind` row, **no material**;
  `DirtKind/grease.yaml` (`answersTo [surfactant, …, absorbent]`).
  `K/lib/wetness/Wet.ts:190` `soakUp(from)` moves WATER only (wetness
  fraction of `waterCapacityKg`); no field says what a cloth is wet WITH.

### Upstream content and verbs

- `mill`: `trade-milling/…/MillController.ts:271` `grindThrough` →
  `MillController.recipeForStock(material)` → `CraftingApi.recipeTaking(
  'millstone', tags)` (`CraftingLogic.ts:5227`: first recipe whose single
  item slot category is one of the material's tags). Recipe shape
  `trade-ranching/…/recipes/bone-meal.yaml` (`inputSlots[0].category:
  bone`, `toolCapabilities [millstone]`, `outputApplication: bulk`,
  `outputTemplate` sack, `outputMaterial`, `outputPortionL`). ⚠ First
  match wins — new categories must be specific (`oilseed`, `ochre-clay`).
  Flax seed row `trade-farming/…/thing/seed/flax.yaml` is a `/platform/
  thing/Seed` with **no `_materialPath`**.
- ⚠ **Shipped bug:** lead doses carry toxin type `lead-poisoning`
  (`base-library/…/material/glaze/tin.yaml:31`, `glaze/lead.yaml:35`,
  `alloy/pewter.yaml:31,33`, `element/lead.yaml:35`, `water/…/tainted-water.yaml:39`)
  but the Condition row `platform/…/Condition/metabolism/lead.yaml` keys
  `toxinType: lead` (name `lead-poisoning`); `Metabolic.ts:1212`
  `resolveToxinBehavior` looks up `TemplatePathPrefixes.metabolismCondition
  + type` → `null` → the dose is dropped `:1135-1136`. `lead.yaml`: law
  `burden`, `clearanceRate 0.01`, one band at 5, signature `expression
  bands 1`. No chronic staged band; no dust/skin route.
- Respiration: `K/lib/respiration/Respiration.ts:745` `applyMediumContents`
  folds each atmosphere content's material `toxicity[]` × fraction into
  `addToxinBurden` per breath. Gas rows: `base-library/…/gas/naphtha-vapour.yaml`
  (`toxicity []`, `flammableLimit`), the CO condition
  `Condition/metabolism/carbonMonoxide.yaml` (`resolution: by: fresh-air`,
  signs `[flushed, dizzy, confused]`). Emission is ONE-SHOT on a pour into an
  open vessel: `BulkableLogic.ts:762` adds `litres × vapourLPerLPerHour ×
  0.25` of `vapourMaterial`; no continuous evaporation anywhere.
- `write`: `platform/cmd/inventory/write.yaml` (`words` greedy string,
  `surface` greedy object `requires: [MarkedMixin]`, prepositions
  `on/onto/in`) → `WriteOnController` → `Marked.writeOn(by, words)`
  (`K/lib/description/Marked.ts:328`): no medium; `markForm` inked|
  embossed|both; ink runs when wet; marks never weather.
- Tap: `trade-forestry/src/thing/SapStandard.ts` = `Producing(Plant)`;
  `trade/forestry/cmd/forestry/tap.yaml` (`target requires: any`, `tool`
  default `reachable:[capability.boring]`); `TapSpec` (`K/platform/idea/
  species/Species.ts:441`: `key · yieldRow · perGameDay · behaviour accrue|
  expire|continuous · windowDays · window · yieldShape mass|volume|count ·
  capUnits · takeMs · sex · restDays`) — **no instrument field**; windows
  `always|event|photoperiod|biome|weather|freeze-thaw` `:516`. Volume taps
  pour into a bound vessel (`yieldRow` names a MATERIAL). Precedents:
  maple (`saccharum.yaml:38`, freeze-thaw), latex (`brasiliensis.yaml:30`,
  weather minK 291, maxK 309); `hanging-wood/…/maple-standard.yaml`,
  `trade-rubber/…/hevea-standard.yaml`; the sugarbush panel
  `rejection/…/hanging-wood/thing/sugarbush-panel.yaml` (6 slots, 6 named
  trees as `props:`; *a tree in a panel slot affords its own verb outward*).
  Scots pine `trade-forestry/…/pinus/sylvestris.yaml` has **no
  `production`**; Hanging Wood's ride mix has pine (`ride.yaml:66`) as a
  stand species only; no pine standard, no pine seed row.
- Still: `trade-distilling/src/thing/Still.ts` = `Fractionating(Burner(
  LightSource(Thermal(Crafted(Bulkable(Tool))))))`; a schedule is matched
  by the charge material's TAGS against `FractionSchedule.inputCategory`
  (`K/lib/fractionation/FractionSchedule.ts:37,:173`); `trade-fuel/…/
  fractionation/crude.yaml` is the per-fraction-material shape; a pot still
  is `cuts` with one `productMaterial` + `residueMaterial`. A `character`
  may contain no digit.
- Rows that exist: `milk-of-lime` (chandlery), `quicklime`/`chalk`
  (trade-quarrying; chalk sold at the general store), `bone` + `hide` +
  `egg` (trade-ranching), `rawhide` (base-library organic), `leather-offcuts`
  (trade-tanning), soft/firm curd + whey (trade-dairying), `wheat-flour`
  (trade-milling), `lead-pig` (generic-objects), `copper-ingot`
  (trade-smelting), `copper-ore` malachite (rejection), `wine-vinegar`
  (trade-winemaking), `madder-root` + `madder` material (trade-farming),
  `alum` (trade-dyeing), latex/rubber (base-library + trade-rubber),
  `pitch`. **Do not exist:** fish skin, hide scraps, ochre clay, lampblack
  (soot is flue state in `K/lib/fire/Flued.ts`, never a good), any binder,
  pigment, paint, glue, varnish, resin, turpentine, rosin.
- Venue pattern: `terminus/…/wharfside/ropewalk.yaml` (CartesianZone) +
  `ropewalk/location/walk.yaml` (Locale, `_address terminus/city/wharfside/
  ropewalk`, open sky, `props`/`cast`), `ropewalk/agent/ropekeeper.yaml`
  (`/platform/agent/Cast`, `extends: /stuff/agent/costume/student`,
  `archetype: proprietor`, `behaviors`), `ropewalk/idea/outfit.yaml`
  (`Business`: positions, `rosterSlots` with `station`, `banksAt`,
  `operatingLocations`), `ropewalk/thing/counter.yaml` (`/trade/shopkeeping/
  thing/Stock`, `stockLines par`, `prices`). The towpath exit to the walk:
  `valley-road/towpath.yaml:31`. The knackers and tannery
  (`wharfside/knackers/`, `wharfside/tannery/`) have an `idea/outfit.yaml`,
  a yard and one prop each — **no counter**.
- Pack creation: `trade-potash/{pack.yaml, package.json, tsconfig.json,
  vitest.config.ts, README.md}` is the template (`root`, `requires.title`
  held by `/compact/trade`, workspace deps); a new pack is added to the root
  `package.json` and `pnpm install` run; `PackLogic.discover.test.ts`
  asserts the count (recount at every merge). `terminus/package.json`
  lists its pack deps (`:13-58`) — `trade-painting` joins it.
- Persistence seams: `Persistable.shouldPersist()` `@hook`
  (`K/lib/persistence/Persistable.ts:72`, consulted by `PersistableLogic.
  capture`/`materialize` and `onCreate`); per-mixin capture slices
  (`PersistableLogic.ts:636-656`: a contributor with `captureSlice` writes
  its own slice, else its declared fields — `ContainerMixin.captureSlice`
  `K/lib/spatial/Container.ts:184` is the precedent); `PersistableApi.
  capture(host, key?)`/`materialize(host, key?)`. Parcels:
  `ParcelApi.ownerOf(path)`, `coveringParcelOf`, `transfer`, `grant`
  (`K/api/parcel.ts:76-330`); `ParcelOwner` = group | player | organization
  (`ParcelRecord.ts:60`); the chain of title is the sibling `ParcelEvent`
  (`:28`). ⚠ A pack claims title through an organization too
  (`trade-potash/pack.yaml`: `holder: {organization: /compact/trade}`), so
  *held by an organization* does not mean *sold* (D7).
- Weather for an unloaded place: `WeatherApi.segmentsBetween(t0, t1,
  locality, maxSegments?, site?)` (`K/api/weather.ts:176`) — the exact
  six-hour segment walk; `temperatureAt(site, locality, t)` `:204`;
  `dailyRangeAt` `:236`; `ClimateSite` (`K/lib/weather/WeatherType.ts:189`)
  from `ZoneApi.climateSiteFor`. `BiomeApi.resolveHumidityFor(scope)`
  `:329`, `localHumidityFor` `:348`.
- The drive harness: `packages/wire/src/harness/index.ts` exports
  `Session, declareFile, expectOk, advanceWorldClock, pinWeather,
  unpinWeather, nourish, dress, hand, worldClockNow, toWarmSeason…`;
  `Session.open(handle, {parcels: [...]})` transfers title of each named
  extent to the test character (`docs/testing.md:101-115`); `eval` binds
  every Api; the `testharness` verb. Shape: `cordage.dirty.wire.test.ts` /
  `cordage.soak.dirty.wire.test.ts`.

### What does NOT exist (so the build does not go looking)

No landing · no structure in any MQL pool but `horizon` · no coat wear,
color or air-setting · no pigment/binder/paint/glue/resin row · no
`paint` verb · no brush · no `Weathering`/`Shell`/`Exterior` mixin · no
structure persistence · no per-lot structure · no instrument on a tap ·
no continuous evaporation · no soot good · no material on a wet cloth ·
no kernel self-heating · no chronic lead band · no `painting` capability or
Discipline · no `/trade/painting` pack.

---

## Plan-level decisions

Numbered for waves, commits and the sweep. Where the requirements left a
fork, the lens that chose is named.

- **D1 — Structure splits into a `lib/` base and the platform twin; the
  twin composes the capabilities.** `K/lib/structure/Structure.ts` (new,
  abstract: everything `platform/idea/Structure.ts` carries today EXCEPT
  `SingletonMixin` — membership, entrance, landmark, height, storeys,
  `hasMember`, `canEvict`, plus the landing core of D2) and
  `K/platform/idea/Structure.ts` = `ShellMixin(WeatheringMixin(FacedMixin(
  SingletonMixin(StructureBase))))` + `PersistableMixin` (D7) — the
  default building, which every existing row names and so weathers from
  the day this ships. `Ship extends` the platform twin (unchanged
  composition above it). A ruin or a monument is a content class over the
  BASE that composes none of the three (none ships; the seam is the base).
  ⚠ Nothing of Ship's or Structure's existing state moves into a mixin —
  the split is the sanctioned lib-base/platform-twin pattern (nine twins
  share their base's name; the import aliases it `StructureBase`), needed
  because `SingletonMixin` forbids the keyed per-lot instance D6 mints.
  `QueryController`'s `instanceof Structure` and `AboardExit`'s
  `instanceof Ship` keep working (both name platform classes);
  `NavigationLogic.innermostStructure`'s `isStructure` shape test keeps
  working for the base.
- **D2 — The landing is derived on read, from the room side and the
  structure side, by ONE rule with an entrance clause.** *A landing of
  structure S is a place that does not hold its own air
  (`exposure().holdsAir() === false`) with an exit whose far side is a
  member of S that is either enclosed or S's `entrance`.* The entrance
  clause is what makes a ship's quay a landing (her deck is her entrance
  and holds no air) and costs no load. For a non-entrance member (a back
  door, a courtyard door) the far room's enclosure is read off the
  resident instance (`exposure().holdsAir()`); a non-resident member
  counts as enclosed ONLY after being stood up — the controllers
  (`paint`/`survey`/`look`) `await structure.landingsFrom(room)` which
  `StuffApi.singleton`s each member exit's destination (load on use: the
  exit's authored destination is the ref we follow), and the base stands
  up its `entrance` member at `postRegister` so the front-door answer is
  sync at any landing. `AboardExit` is asked, not its authored
  destination: `alongsideNow(): Ship | null` is made public (the authored
  berth of a ship that has sailed is not a landing). Surface:
  `StructureBase.isLandedAt(room): boolean` (sync, resident rule) and
  `landingsNow(): Place[]` (resident rooms adjacent to its members that
  pass the rule); `NavigationLogic.structuresLandedAtNow(room): Structure[]`
  walks the room's exits (a member's path → `structureAtNow(dest)`; an
  `AboardExit` → `alongsideNow()`), dedups, filters by `isLandedAt(room)`.
  A member courtyard open to the sky passes (it does not hold air and
  exits into an enclosed member) — it is a landing of its own structure.
  A shed inside a warehouse: the warehouse floor holds air → no landing.
  *Lens 1 and the shipped envelope rule chose, per the requirements.*
- **D3 — The landing enters the `here` pool; no new MQL seed.**
  `scope-walk.ts` `candidatesForHere(location, viewer)` pushes each of
  `NavigationApi.structuresLandedAtNow(location)` as a direct candidate
  (its keywords; `via: {landing: true}`), so `look cottage`, `survey
  cottage`, `paint cottage`, `maintain cottage` bind through the shipped
  `reachable` scope with no grammar change (MQL grammar stays small). A
  structure's own members never see it in `here` (you are inside; `survey`
  with no target reads the building you stand in, D13). The `horizon`
  pool is untouched. `look <structure>` renders its `Detailed` description
  + the `coatAugmenter` line (the FacedMixin static on the twin) + the
  shell line (D12's augmenter).
- **D4 — Setting is the coat MATERIAL's rule, read off the AIR; heat is one
  case of it.** `KineticSpec` gains `sets?: 'heat' | 'carbonation' |
  'oxidation' | 'drying' | 'solvent'` (default `heat`, so every shipped
  glaze row is byte-identical) and `exothermicJPerKg?: number`
  (oxidation). `FacedMixin.airCoats(window)` advances every wet coat whose
  material's first change `sets` by air, integrating `rateAt(T_air) ×
  f_air` over a weather window: `f_air = 1` for carbonation and oxidation
  (they want air and time; indoors they run at the room's air changes:
  `min(1, ach/4)` for carbonation — a sealed cellar carbonates slowly);
  `f_air = (1 − RH)` for drying and solvent (the maturation evaporative
  shape); `0` under rain reaching the coat. **Rain on a wet coat → `run`;
  frost (`T_air < 273`) on a wet coat → `crazed`** — the shipped fault
  states, reused rather than invented ("sets badly" is what they already
  say). `heatCoats` is untouched and keeps firing from `Thermal.
  reconcileCoats`; `coolCoats` likewise. An oxidation coat on a
  `ThermalMixin` host deposits `exothermicJPerKg × kg set this window`
  (the rag's whole hazard, D15); on a structure the survey says it.
  *Where the window comes from:* a good asks its ambient scope's air
  (`ambientScopeOf` chain, `BiomeApi.localHumidityFor`, the room's
  `exposure().rainReaches()` + the weather sample) over `[faceCheckedS,
  now]`; a structure asks `WeatherApi.segmentsBetween` at its site (D5).
  *Lens 1 chose (carbonation, oxidation, evaporation are the lesson; one
  law with the binder as the parameter is derivable).*
- **D5 — Weathering is a coat property and a walk; the fabric is the
  shell.** `Material.weatheringMPerGameYear` (new, authorable, default 0 =
  never weathers — a glaze, a tar) is the rate a SET coat of it thins when
  the weather reaches it. `WeatheringMixin` (`K/lib/material/Weathering.ts`,
  `Mixins.Weathering`, requires a `Faced` host) owns `weatherCoats(window)`:
  for each outside coat, outermost first, `thicknessM −= rate × years ×
  f_exposure` (`f_exposure` = 1 for a structure's outside and for a good
  whose room's `exposure().rainReaches()`; 0.3 under a roof in the open
  air; 0 indoors), a coat at 0 is dropped and the next one meets the
  world; a `crazed`/`run` coat weathers at twice the rate (it has opened).
  The same walk sun-fades pigment (D8) by `lightfastness` × daylight
  hours. `ShellMixin` (`K/lib/structure/Shell.ts`, `Mixins.Shell`, requires
  `Weathering`) owns the fabric: `fabric` 0..1 (the old `shellCondition`),
  `fabricStamp`, `reconcileFabric()` wearing at `0.5/(structure.weather.
  daysToWorn · 86400)` per second ONLY while `coatGone()` (no set outside
  coat with thickness > 0) — a coated building holds; `conditionBand()`
  (the five bands, moved verbatim), `conditionCause()` derived from the
  COAT (thin → *"The paint is going; weather is starting to find the
  seams."*; gone → *"The paint has gone; rain has gotten into the sills."*;
  wet oil → *"the new oil is still curing"*), `mendFabric()` (the
  `maintain` restore: fabric → 1, coats untouched). The dial
  `residence.weather.daysToWorn` MOVES to the platform settings as
  `structure.weather.daysToWorn` (`AppSettingKeys.structureWeatherDaysToWorn`,
  default 45; the residence key is deleted — no readers remain). The two
  mixins compose on the platform twin and on `HoldingStructure` (D6), and
  `WeatheringMixin` on the sign board and the gessoed panel (D10) — not on
  the `Good` base (a cart's coat wearing outdoors waits for decomposition's
  exposure clock; Deferred seams). *Why thickness and not a per-paint
  life:* the requirements — *two coats last longer than one* — and lens 1
  (coverage and solids are the arithmetic a painter learns).
- **D6 — A holding's building is minted per `(scope, key)` and registered
  live.** `/system/residence/idea/HoldingStructure` (`packages/content/
  residence/src/idea/HoldingStructure.ts` = `PersistableMixin(ShellMixin(
  WeatheringMixin(FacedMixin(StructureBase))))` — no `Singleton`) with one
  row `/system/residence/idea/holding-structure` (`extent: ''`, `coats:`
  the programme's authored starting coat). `HoldingWarren.wake()` clones it
  with key = `holdingKey()`, `setExtent(holdingKey())`, `setEntrance(
  entryRoom path)`, materializes/captures under the same `(scope, key)`
  as its rooms, and registers it: **`NavigationApi.attachStructure(
  structure)` / `detachStructure`** — a runtime attachment on
  `LocationGraphRegistry` (a `Map<extent, Stuff>` consulted by
  `attachedNow`/`attachedTo` for kind `structure`, by INSTANCE, longest
  extent first) so `structureAtNow(unitRoom)` answers the lot's house and
  `exposure()` sees its walls. Seznick House is ONE building: a Structure
  ROW (`mayfield-row/seznick-house/structure.yaml`, extent the house, its
  landing Mayfield Row — the street holds no air, `house` → the lobby,
  enclosed), and every unit under it reads the house (`innermost` is the
  house because the unit holdings mint NO HoldingStructure when a Structure
  row already covers their extent — `wake()` checks `structureAtNow(
  holdingKey())` first). Hinkley lots and Duncan Hall units mint one each.
  *Lens 3a (a lot's house is a building you walk around) and the owner's
  question in the brief chose.*
- **D7 — "Owned" means SOLD: the covering parcel's chain of title records
  a transfer after its grant.** `StructureBase.isTitleSold(): boolean`
  reads a transient flag refreshed by `refreshTitle()` (async:
  `ParcelApi.coveringParcelOf(extent)` → its `ParcelEvent`s; any
  `transfer`/`subdivide-to-another-holder` event after the installing grant
  = sold), called at `postRegister`, at every `paint`/`maintain` act and
  by the residency sweep. The platform twin composes `PersistableMixin`
  with `shouldPersist() { return this.isTitleSold(); }` — a staged
  building writes NO record and re-hydrates from its row at every boot
  (= restage), an owned one captures and restores its coats and fabric.
  `Ship` already persists (her voyage); so `WeatheringMixin` and
  `ShellMixin` each implement `static captureSlice(host, ctx)` returning
  their fields only when `host.isTitleSold()`, else `{fields: {}}` — a
  staged ship's voyage persists and her hull resets. `HoldingStructure`
  persists unconditionally (a holding exists only because somebody holds
  it). ⚠ Not `ownerOf(kind)`: a pack claims through an organization too.
  *Lens 7 chose: title is the register of who answers for a building; the
  engine invents no second owner.*
- **D8 — Paint is a mixture; its properties derive from its makeup and
  ride the payload.** `K/lib/material/Paint.ts` — a value object (instance
  methods only, `lint:lib-statics` clean): `declare module '../bulk/
  Bulkable' { interface BulkPayload { paint?: PaintMakeup } }` where
  `PaintMakeup = { binder: string; pigments: {material: string; share:
  number}[]; solidsFraction: number; thinner?: string }`; class
  `Paint(makeup)` with `colour(): Colour` (fold of each pigment's
  transmittance weighted by share and hiding power, over the binder's own
  tint), `colorTag()`, `hidingPower()`, `lightfastness()` (min over
  pigments), `coatWord()` (the binder's `coatWord`), `litresFor(areaM2,
  thicknessM)` and `thicknessFor(litres, areaM2)` (= `litres ×
  solidsFraction / areaM2 / 1000`), `words(band)`. New `Material` fields:
  `pigment?: {transmitR, transmitG, transmitB, hidingPower 0..1,
  lightfastness 0..1}` (the dyestuff row's shape, on the MATERIAL because a
  pigment is suspended, not dissolved — the dye/pigment line is the
  Dyed/Faced line) and `binder?: {sets: KineticSpec, solidsFraction}`
  is NOT a second block — a binder is any `laysCoat` material with
  `kinetics[0].sets` (D4) and `solidsKgPerL`; paint's `solidsFraction`
  derives from the binder's solids + the pigment mass share. The pot:
  `/trade/painting/thing/PaintPot extends CompoundingVessel`
  (`productMaterial: /trade/painting/idea/material/paint` — ONE generic
  paint row, `laysCoat: true`, tags `[liquid, paint]`, no color of its own,
  the blend precedent) overriding a new `Compounding` `@hook
  payloadFor(charge)` that `compound()` calls after the mint to write the
  payload (`paint` from the charge's binder liquid + solid pigments by
  mass; a thinner `solvent`-tagged liquid recorded). `CoatLayer.paint?:
  PaintMakeup` snapshots the makeup at `layCoat` (a wall remembers what it
  was painted with; `outermost()` still answers the generic material; the
  look word reads the pigment's `Colour.nearestTag()`: *"It is painted
  ochre-yellow on the outside."*). Lime: milk of lime carries pigment-less
  makeup (white by its own `pigment` block: chalk-like transmittance). A
  dye is NOT a pigment: the madder LAKE is a pigment row minted from madder
  + alum (W4) — where a dye becomes a pigment, as the requirements say.
  *Lens 1 (hiding power and lightfastness are what a painter learns) and
  lens 2 (no paint table — a second paint is a pigment row) chose.*
- **D9 — One verb `paint`, afforded by the brush, the TARGET plans the
  coat.** Kernel view `platform/cmd/crafting/paint.yaml` (`verbs: [paint]`;
  args `target` object required, scope `[reachable]`, `requires: any`
  (a structure from the `here` pool or any `Faced` good), `paint` object
  optional `prepositions [with, using]`, default `reachable:[mixin.
  BulkableMixin]`, `requires: [BulkableMixin]`, `brush` object optional
  `prepositions [using]`, default `reachable:[capability.painting]`,
  `requires: [ToolMixin]` — declared, never hunted (`lint:instrument-
  args`)) → `K/platform/idea/cmd/crafting/PaintController.ts`, dumb: it
  resolves the vessel's liquid, asks the TARGET `coatPlanFor({actor,
  source, brush, faces})` and runs the `ActPlan`. The protocol lives on
  the model: `Faced.coatPlanFor(req): Promise<ActPlan | ActRefusal>`
  (`@hook`, default: refuse `not-paint` when the liquid does not `laysCoat`,
  refuse `source-too-low` when litres > held (the dip rule), else a plan
  whose `onComplete` draws `litresFor(area, thickness)` from the source and
  `layCoat(face, path, thickness, soil, makeup)`; a good's area is the dip's
  `6·V^⅔`). `StructureBase` overrides it: refuse `no-landing` when the
  actor's room `!isLandedAt(room)` — *"You cannot reach the outside of the
  cottage from here"* / for a ship with no landing *"She is not alongside
  anything"* — and uses `exteriorAreaM2()` (D13). Thickness per coat =
  `Paint.thicknessFor(litres drawn, area)` where the litres drawn = what a
  brush lays: `area × structure.paint.coatThicknessM` (dial, 0.00005 — a
  50 µm wet film) / solids. The brush is a kernel class
  `K/platform/thing/Brush extends Tool` (`commandContributions: {self:
  ['platform/cmd/crafting/paint.yaml']}`, `capabilities` from its row:
  `[painting]`) — a verb affordance is a static on a class, never a row;
  `trade-painting` ships the brush ROW (an assembly, D11). Making paint is
  `mill`/`pour`/`stir`; `dip` stays the bath's. The `painting` capability
  is consumed the day `paint.yaml` names it (`check-capabilities.ts`).
  *One verb per act; the owner's directive.*
- **D10 — `write` gains paint as a medium; the painted panel is a good.**
  `write.yaml` gains `medium` (object, optional, `prepositions [with,
  using]`, `requires: [BulkableMixin]`, scope `[inventory, reachable]`) —
  ⚠ placed BEFORE the greedy `surface` in the arg list so the tokenizer
  splits `… on board with paint`; the build verifies with `msh` and the
  reachability lint. `Marked.writeOn(by, words, medium?)`: a medium whose
  liquid `laysCoat` lays the words as a coat — the surface must be `Faced`
  (a board is a Good), `markForm` stays what the row authored, the text is
  recorded on the `CoatLayer` (`CoatLayer.marks?: string`) and `read`
  shows it through the coat; when the coat weathers away the words go with
  it (`WeatheringMixin` drops the layer, `Marked` re-derives `markText`
  from its coats). Without a medium nothing changes (ink). The sign board:
  `/trade/painting/thing/SignBoard = WeatheringMixin(Good)` + `Marked`
  (row `signboard`, `markForm: inked`, fixed when hung). The gessoed
  panel: `/trade/painting/thing/GessoPanel = WeatheringMixin(Good)` (row
  `gessoed-panel`, authored outside coat `gesso` set); `paint panel with
  tempera` lays a coat; the lake fades in a sunny window by D5's sun walk
  (the room's `skyLightFraction` × daylight). What the picture IS stays the
  visual-arts build's.
- **D11 — The glued joint takes a real glue; the glue decides.**
  `Material.adhesive?: {strength 0..1; reversible: 'never' | {heatK?:
  number; steam?: boolean}; resistsDamp 0..1; softensAtK?: number}` on
  every glue row; the setting rule is the glue's `kinetics[0].sets` (D4:
  hide/bone/fish `drying` — they also gel on cooling, the `chillsTo`
  phase; casein `drying`; starch `drying`; rosin cement `heat` (cools);
  rubber cement `solvent`). `BillJoint.takes?: 'glue'` and
  `JointDescriptor.takes` (`glued.yaml` authors `takes: glue`; its
  `strength`/`reversible`/`failure` become DEFAULTS the glue overrides).
  `fit`'s raise and replace arms (`CraftingLogic` `fitImpl` + the
  `jointGate`) gate a `takes: glue` joint on a reachable OPEN vessel
  holding a `glue`-tagged liquid with enough in it (litres = the members'
  contact area × `crafting.glueFilmM` 0.0002 — area from the parts'
  masses as the dip's `6·V^⅔`, the smaller member), draw it, and record
  `JointState.glue = materialPath`, `JointState.setAt = now`,
  `JointState.setProgress` (0). `Assembled.getJoints()` gains
  `reconcileGlue()` beside `reconcileWarp` (the Vat precedent): advances
  each glued joint's set by the glue's rule over the whole's room air;
  **weak until set** (effective strength = `adhesive.strength × max(0.2,
  progress)`); a joint disturbed before set (any `wear` on the whole while
  `progress < 1`) loses tension by `(1 − progress)`; **damp** (the whole's
  room humidity ≥ `crafting.glueDampRh` 0.85, or the whole `wet`) slackens
  by `(1 − resistsDamp)` per day → `parted` at the slack threshold, and
  `look` says *"the glue line has let go"*; **heat** ≥ `softensAtK` →
  parted at once. `salvageByJoints`: a glued joint's reversibility is the
  GLUE's — `never` for casein/resin/rubber; hide/bone/fish `{heatK: 330,
  steam: true}` come apart when the whole is at ≥ heatK AND wet ≥ damp
  (steamed), else `never`. `shield.yaml` keeps its row (the joint now costs
  glue to `fit` and lets go in the damp). The brush row is an assembly:
  `bill: parts [handle (wood), bristles (hog bristle — the knackers' pig
  gives `bristle`? no row: `/trade/painting/thing/bristle` minted from the
  butcher's `hide`? ⚠ decided below], ferrule?]` — keep it to two parts
  and one `glued` joint (`takes: glue`). *Lens 1 (water resistance,
  reversibility and open time are the lesson) chose.*
  **Bristle:** a `bristle` row in `trade-painting` (material `organic/
  hair`-like, tags `[bristle]`), stocked by the colorman; its upstream (the
  pig's hair at the knackers) is a stock line, not a mechanism — Deferred
  seams.
- **D12 — Glue is made by the kettle pattern, the plateau and the phase.**
  `/trade/painting/thing/GluePot extends MaturingMixin(CraftVessel)`
  (the `SoapKettle` shape): `matchProfile(water)` with `collagen`-tagged
  solids in the pot (hide scraps, bone, fish skins) destructs the solids
  (the hopper's precedent) and returns the `glue-extraction` profile
  (`chemical`, requires heat — a `MaturationProfile` temperature band,
  `happyK 345` — hours, product `glue-liquor`, `solidsKgPerL` seeded from
  the solids' mass / litres); the liquor REDUCES on the plateau
  (`concentratesTo` → `hide-glue` at the solids ceiling) and **gels**
  below its `meltingPoint` 308 K (`Thermal.reconcileBulkPhase`'s set:
  `chillsTo`/cast → `glue-cake` beside the pot — a mould keeps its form);
  warmed again it is liquid glue (meltingPoint). Bone and fish glue are
  the same profile keyed by the solids' tag (`collagen`); the three glue
  materials differ in `adhesive` and `coatWord`. Casein glue = curd + milk
  of lime `stir`red in a `CompoundingVessel` row (`productMaterial
  casein-glue`). Starch paste = flour + water stirred (`flour-slurry`) with
  a `kinetics` ladder `→ starch-paste` at 340 K (gelatinizes on the
  hearth). Rosin cement = rosin warmed past its melting point (a solid
  used hot, `laysCoat`). Rubber cement = rubber lump dissolved in
  turpentine stirred (`productMaterial rubber-cement`, `sets: solvent`).
  No new verb anywhere.
- **D13 — The shell moves to the kernel; residence keeps the TERM.**
  `HoldingWarren` loses `shellCondition`, `shellStamp`, `reconcileShell`,
  `conditionBand`, `conditionCause`, `restoreShell` and `CONDITION_BANDS`;
  keeps `upkeepTerm` + `UPKEEP_TERMS` (who OWES is residence's).
  `SurveyController`: the fabric lines read `NavigationApi.structureAtNow(
  room path)` → `ShellMixin` (`conditionBand`, `conditionCause`) and the
  coat (`Faced.getCoats('outside')[0]` → the word + the paint's color),
  plus the AREA and the JOB (`exteriorAreaM2()`, `Paint.litresFor(area,
  coatThicknessM)` *"about nine litres of paint"* — a figure is allowed
  here; the survey is a measurement verb) — a `survey <structure>` target
  from a landing reads the same (D3); the upkeep term line still comes
  from the holding when the room is a `WarrenMember` (unchanged duck-typed
  `holdingOf`, narrowed to the term). `exteriorAreaM2()`: Σ over the
  structure's RESIDENT members of `exposure().exteriorAreaM2()`; the
  controllers `await structure.standUpMembers()` first (the location
  graph's nodes under the extent, `NavigationApi.attachedWithin`/
  `nodesInZone` — never a content-tree search). `MaintainController`
  (residence) re-targets: the room's structure (inside) or a landed
  structure (`maintain [<structure>]`, optional target), `ShellMixin.
  mendFabric()`, the kit's wear, refuses `sound` and *"the coat is paint's
  to lay"* when only the coat is wanting — it mends sills and putty and
  nothing else. `maintains` brain → the structure at each holding's extent
  (`NavigationApi.structureAt`), `forceCommand('maintain')` from the entry
  room as today. `CirculationWarren.conditionOf(extent)` →
  `NavigationApi.structureAt(extent)` and `MixinApi.isShell` — the
  duck-typed `WarrenMemberView.reconcileShell` goes. The two ascent-gate
  tests re-spy `NavigationApi.structureAt`. ⭐ The `maintains` brain keeps
  Walter's and Katie's rounds alive the day the shell moves (D6 gives their
  holdings a building).
- **D14 — Lead: fix the type, add the chronic band and the dust/skin
  route.** The five dose rows (Grounding) change `lead-poisoning` →
  `lead`; the Condition keeps `name: lead-poisoning` (`toxinType: lead` is
  the key). `lead.yaml` gains two bands (`{threshold: 2, severity: 1}` —
  the painter's colic: `observableSigns` + an appetite signature;
  `{threshold: 5, severity: 2}` the shipped acute) so the slow dose shows
  before it is acute. Route: `mill`ing a `lead`-tagged charge and
  `paint`ing with a paint whose makeup carries a `lead`-tagged pigment call
  `actor.addToxinBurden('lead', dial)` (`metabolism.leadDustDose` 0.3 per
  grind, `leadSkinDosePerL` 0.05 per litre brushed) — the body's own
  method, from the two acts that raise dust and wet the hands; a glove
  (`outermostAt(hand) !== null`, the hopper's rule) halves the skin dose.
  `assess`/`analyze` name the band (the clinical path, shipped).
- **D15 — Oily rags: `SelfHeating` is promoted to the kernel and made to
  burn.** `K/lib/thermal/SelfHeating.ts` (`Mixins.SelfHeating`; the pack
  file deleted, `HayBale` imports the kernel one by specifier) generalized:
  `@hook heatingWPerKg(): number` (hay: its moisture drive as today; a rag:
  its oil's `exothermicJPerKg × rateAt(coreK)` while the oxidation
  change is incomplete), cooling by **surface over mass** (`6·V^⅔ / kg`:
  a heap of ten rags sheds a tenth of what one spread rag does — a
  `Stackable` quantity ≥ `fire.rag.heapAt` 3 is a heap, one rag is spread
  out), and the core temperature DEPOSITS into the host's `ThermalMixin`
  and calls `tryAutoignite()` on a `Combustible` host — the shipped fire
  driver spreads it from there. Water quenches: a rag `soaked` in water
  (`Wet.getWetnessBand()`) halts the oxidation (`f_air = 0` while wet, D4)
  and raises the autoignition point as the fire logic already does. What a
  rag is wet WITH: `Wet` gains `wetMaterial?: string` (the last liquid
  `soakUp`/`wipe` put into it; water is the default and clears it) — the
  honest field the brief asked for, kernel because `Wet` is kernel. The
  rag: `/trade/painting/thing/Rag = SelfHeating(Combustible(Thermal(
  Stackable(Good))))` (row `rag`, cloth, `[rag, rags, cloth]`); wiping a
  brush or a spill with it (`wipe` is cleanliness's shipped verb) puts the
  liquid in it. The hay rick keeps its bands and prose. *Three composers in
  three packs (hay, rag, later compost) is the kernel-promotion signal.*
- **D16 — Turpentine fumes: the one-shot emission suffices, and `stir`
  re-exposes.** `turpentine.yaml` authors `vapourLPerLPerHour` +
  `vapourMaterial: …/gas/turpentine-vapour` (toxicity `[{type:
  turpentine, amount}]`); the Condition `Condition/metabolism/turpentine.yaml`
  (law `burden`, `resolution: fresh-air`, signs `[dizzy, nauseous]`,
  clearance fast). A pour into an open pot emits (shipped); `stir` on a
  vessel holding a `solvent`-tagged liquid emits the same quarter hour
  (one line in `Compounding.compound`'s narrate path) — the act exposes
  it. Airing is the shipped ACH decay; open the door and it clears.
  Continuous evaporation stays a deferred seam (it would change every
  open naphtha dish in the game).
- **D17 — Resin is a tap with an instrument.** `TapSpec.instrument?:
  string` (default `boring`, every shipped row byte-identical) and
  `TapSpec.setWords?/drawWords?` are NOT added — one field, `instrument`;
  the words stay the controller's generic ones (*"you open the tree and set
  a cup"* is the resin row's `character`… no: the species row carries no
  prose; `tap.yaml`'s help gains one sentence). `sylvestris.yaml` gains
  `production: [{key: resin, yieldRow: /trade/painting/idea/material/
  pine-gum, perGameDay: 0.04, behaviour: accrue, windowDays: 12,
  yieldShape: volume, instrument: cutting, window: {kind: weather,
  daylightFrom: 0, daylightTo: 1, minK: 288, maxK: 320}}]` (warm weather;
  a litre a season a face). ⚠ `trade-forestry` then needs a row for
  `pine-gum` it does not own: the material row lives in **trade-forestry**
  (`/trade/forestry/idea/material/pine-gum`, tags `[liquid, oleoresin,
  resin, flammable]`) — the tree's yield is the forestry pack's, the CUT is
  painting's. `trade-forestry/…/thing/pine-standard.yaml` (the maple's
  shape, `SapStandard`, `standardMaterialPath wood/pine`, `seedTemplatePath:
  null`); rejection's Hanging Wood gains `thing/pine-stand.yaml` (a `Panel`,
  3 slots, 3 named pines `pine-north/middle/south` extending the standard,
  `spiles: 1`) propped on the ride. The schedule `/trade/painting/idea/
  fractionation/pine-gum.yaml` (`inputCategory: oleoresin`, `cuts`,
  `requiresHeatK 430`, `productMaterial turpentine`, `residueMaterial
  rosin`, one fraction `spirit` with a digit-free character). Varnish =
  rosin + turpentine stirred (`productMaterial varnish`, `laysCoat`,
  `sets: solvent`).
- **D18 — Lampblack is the flue's soot, taken.** `Flued` (kernel) gains
  `takeSoot(by): Stuff | null` minting `cleanliness.sootTemplate` (dial,
  default `''` = nothing minted) scaled by the flue's soot load, zeroing it;
  `SweepController` (narrows `isBurner` today) also calls it on a `Flued`
  burner — *you sweep the flue and the soot comes down in a heap*.
  `trade-painting`'s settings set the dial to `/trade/painting/thing/
  lampblack` (the `cleanliness.ashTemplate` precedent: kernel dial, pack
  row). The colorman's hearth is where the drive takes it.
- **D19 — The missing upstream rows, each in the pack that owns the
  thing.** `trade-tanning/…/thing/hide-scraps.yaml` (rawhide, tags
  `[collagen, hide-scraps]`, propped as a crate in the tannery yard;
  stocked by the colorman); `trade-fishing/…/thing/fish-skins.yaml`
  (`[collagen, fish-skin]`, stocked by the colorman — the fishmonger's
  by-product is a Deferred seam); `base-library/…/material/mineral/
  ochre-clay.yaml` (goethite-rich clay, tags `[clay, ochre-clay, mineral]`)
  + `trade-quarrying/…/thing/ochre-clay.yaml` lump; `trade-farming/…/
  idea/material/flax-seed.yaml` (tags `[seed, oilseed, organic]`) and
  `_materialPath` on the flax seed row; the bone row gains tag `collagen`.
  Milk of lime gains `laysCoat` + `coatWord` (Requirements gap 1). Chalk
  gains a `pigment` block (white). Copper + vinegar → verdigris and lead +
  vinegar → lead white are **maturation profiles** in `trade-painting`
  (`chemical`, `inputCategory vinegar` with a `copper`/`lead`-tagged solid
  in the vessel — the hopper's shape in a `CorrosionJar extends
  MaturingMixin(CraftVessel)`; days; product the pigment as a bulk
  precipitate the pot `drainSetting`s to a cake, then `mill`ed). Burnt
  ochre: `yellow-ochre.yaml` material `kinetics` ladder `→ red-ochre` at
  550 K (`fire` it in a pan on a hearth; the ceramics one-rule firing).
  Madder lake: madder root + alum + water stirred and left (`chemical`
  profile → `madder-lake` precipitate). Linseed oil: `mill` recipe
  `linseed-oil.yaml` (`category: oilseed`, `[millstone]`, bulk output).
  Yellow ochre: `mill` recipe (`category: ochre-clay`). Lead white and
  verdigris cakes: `mill` recipes (`category: lead-white-cake` etc.) to
  pigment powder.
- **D20 — The venue, the cast, the round.** `/world/terminus/wharfside/
  colorman` (CartesianZone) with `location/shop.yaml` (enclosed brick,
  `_address terminus/city/wharfside/colorman`, exit `towpath`; props the
  counter, a hearth (`/stuff/thing/Hearth`, the lampblack), paint pots,
  a glue pot, brushes, rags) and `location/yard.yaml` (open sky; props a
  hand quern (`generic-objects`'s millstone-bearing quern row — verify at
  build; else the `trade-milling` hand mill row), the corrosion jars, a
  rag heap in a lean-to `shed.yaml` (enclosed, `holdsAir` — where the rags
  smolder)); `agent/colorman.yaml` Cast (name *Ira Pell*, keywords
  `[ira, pell, colorman, "color man", "paint seller"]`); `idea/outfit.yaml`
  Business (seat `colorman`, `fulfills [painting]`, `banksAt goodkin`);
  `thing/counter.yaml` Stock (`stockLines`: linseed oil, yellow/red ochre,
  chalk, lampblack, lead white, brushes, rags, ready paint (ochre oil),
  milk of lime, hide scraps, bone, fish skins, bristle, flax seed, ochre
  clay; `prices`). The house painter: `agent/housepainter.yaml` Cast (name
  *Tam Rook*, keywords `[tam, rook, housepainter, "house painter",
  decorator]` — ⛔ no bare `painter`), props a brush + a pot of ochre oil
  paint, `behaviors: [{brain: /trade/painting/behavior/paints, trigger:
  candidate}]`; `idea/painters-round.yaml` Business (`call: rota`,
  `rosterSlots` with `station:` = the landings of the town's buildings:
  the towpath (cottage), Mayfield Row (Seznick House), the goods yard
  (sugar house)); the `paints` brain (`trade-painting/src/behavior/
  paints.ts`: at a station, `structuresLandedAtNow`, the worst
  `conditionBand` below `sound` with a coat gone or thin →
  `forceCommand('paint <building> with paint')`, refills from the shop
  counter by `buy` when the pot is low — every step a literal verb). The
  cottage: `wharfside/cottage.yaml` zone + `cottage/location/room.yaml`
  (enclosed, brick, `_address terminus/city/wharfside/cottage`, exit
  `towpath`) + `cottage/structure.yaml` (`coats: {outside: [{material:
  milk-of-lime, thicknessM: 0.00002, state: set}]}`, `heightM 5`); the
  towpath gains exits `cottage` and `colorman`. Structure rows for the
  chandlery (brick, limewashed) and Seznick House (D6). `terminus/pack.yaml`
  claims the cottage's extent as its own title row so the drive's
  `Session.open({parcels: [cottage]})` has a parcel to transfer (the
  "owned" building). A second colorman, paint or building is rows.
- **D21 — Discipline.** `/trade/painting/idea/Discipline/painting` (a new
  Discipline row: the coat laid, the glue line made, the sign lettered) —
  credited by `paint`, by `fit` of a glued joint and by `write … with
  paint`; the colorman's seat `fulfills [painting]`. `chemistry` (shipped)
  for the still cut and the corrosion jars.

### Build decisions (recorded during the build)

- **B1 (W0)** — the ship clause of the landing is a protocol on the EXIT
  (`Exit.alongsideNow()` / `lyingAlongside()`, null by default; the
  `AboardExit` answers), not a duck-typed read of `AboardExit`. *CLAUDE.md
  § no duck typing.*
- **B2 (W0)** — no `postRegister` stand-up of the entrance: the entrance
  clause is a PATH test and needs nothing standing.
- **B3 (W1, lint:object-verbs)** — the room-side landing reads are methods
  on `Place` (`landedStructuresNow()`, `landedStructures()`), not
  `NavigationApi` statics taking a room; `attachStructure(extent, s)` takes
  the extent first. *Verbs on objects.*
- **B4 (W1; replaced in review, B32)** — *was* `Stuff.getPlacePath()`, a
  keyed room answering its persistence key as its place. Removed: a key is
  persistence's, not a place. A room now asks its warren which building it
  is in (`Warren.structureOf` via `Place.structureNow`).
- **B5 (W1, D7 simplified)** — "sold" = the covering parcel's current
  owner is a PLAYER (`ParcelApi.coveringParcelOfSync`, sync, no
  `refreshTitle`). An organization or group holding the ground is not a
  sale. *Lens 7: a person answers for it.*
- **B6 (W1)** — `PersistableMixin` moved from `Ship` onto the platform twin
  (contributors are read off the whole chain, so position is moot);
  `Ship.persistsWhenStaged() → true`. Coat/weathering/shell slices are
  gated by a `Faced.persistsCoats()` hook (`FacedMixin.captureSlice`), so
  a staged ship's hull resets while her voyage persists.
- **B7 (W1)** — the weather walk is `BiomeApi.airSegmentsFor(scope, …)`
  (shipped; per-segment air + rain), with the scope a standing LANDING
  (`StructureBase.outsideScope()`; `standUpLandings()` from inside). No
  new site walk.
- **B8 (W1)** — an oil's heat on a STRUCTURE is said by the survey only;
  the `onCoatHeat` hook was cut (no consumer — `lint:unconsumed-seams`).
  On a thermal good, `Thermal.reconcileCoats` air-sets a wet coat over the
  room's air and `depositHeat`s the oxidation.
- **B9 (W1)** — paint color is the pigments' fold by share × hiding power,
  NOT blended over the binder (a chalk + lampblack mix read near-white);
  the binder's own body colors a pigment-less coat only.
- **B10 (W2)** — a holding's house starts BARE (no coat): its fabric wears
  from the day it is held, exactly as the old shell did, until somebody
  paints it. *Lens 6 — the house painter's demand is there first.*
- **B11 (W2)** — Duncan Hall gets NO structure row: its steps and cistern
  share the hall's extent, so a hall-wide row would change their exposure.
  Its units mint a house each (D6's own fallback). Seznick House has a row
  (bare until W8 lays its oil coat).
- **B12 (W2)** — `maintain` with a sound fabric under a wanting coat
  refuses `coat-not-fabric` (*"that is a brush's work"*); the kit is
  spared. `maintain`/`maintains` find the house through the holding
  (`HoldingWarren.house()`) first, then the graph.

- **B13 (W3)** — `paint`'s pot is `objects` (every reachable bulk vessel;
  the controller takes the first whose liquid lays a coat), and the brush
  binds `me:i:[capability.painting]`. The `Brush` class contributes the
  view on `environment` (the householder's kit precedent), not `self`.
- **B14 (W3)** — a paint coat's MATERIAL is its binder (the makeup's
  `binder`), so the binder's kinetics set it and its weathering wears it;
  the makeup rides `CoatLayer.paint` for the color. A pigment-less liquid
  (milk of lime) lays itself.
- **B15 (W3)** — `write … with paint` letters the words as a thin coat
  (`CoatLayer.marks`); `getMarkText()` appends painted marks from the
  coats, so the words go when the weather drops the coat. The medium arg
  is declared AFTER the greedy surface (its preposition stops the
  lookahead).
- **B16 (W3, lint:reachability arm G)** — `paint`'s `pot`/`brush` and
  `write`'s `medium` are `greedy: true`.
- **B17 (W4)** — PIGMENTS ARE ITEMS (a paper of pigment, the quarrying
  `Lump` class so it is stackable and thermal — burnt ochre fires), never
  bulk: a pot's liquid is ONE slot, so a bulk pigment could not share it
  with the binder. The mill's tangible-output recipes mint them.
- **B18 (W4)** — the ready-mixed pot's makeup is a `seed: true` field
  (`seedMakeup`), not `onCreate` (`lint:on-create` ceiling); a bulk
  payload is not authorable.
- **B19 (W4)** — an EGG in the paint pot binds as egg tempera (a mapping
  in `PaintPot.payloadFor`); a `solvent`-tagged liquid is the thinner.
- **B20 (W4, lint:descriptors)** — `ochre` left the arcana potion bank
  (now `tawny`): ochre is a real material.
- **B21 (W4, lint:reachability arm R)** — the colorman's shop, yard, shed,
  counter, outfit and Ira Pell moved forward from W8: a pack row nothing
  stocks fails the gate, so the counter lands with the rows it reaches.
- **B22 (W4)** — the CORROSION JAR and the madder-lake strike are NOT
  built this wave: the counter stocks lead-white cake, verdigris and madder
  lake. Recorded as a gap to close before the MR if time allows (the
  maturation-profile route: vinegar + a metal solid → a cake).

- **B23 (W5)** — the pines join the Hanging Wood SUGARBUSH panel (capacity
  6 → 9) instead of a separate `pine-stand` place: the panel already
  affords each tree's tap outward, and a second panel would be a second
  place for nothing. Varnish is a plain `CompoundingVessel` row (rosin lump
  + turpentine → varnish). `tap.yaml`'s tool default stays
  `capability.boring`: `tap pine with knife` names the blade.

- **B24 (W6)** — only `fit`'s RAISE arm consumes glue; re-making a glued
  joint by the replace arm does not yet (recorded; the drive glues by
  raising). The glue litres are a per-joint dial
  (`crafting.glueLitresPerJoint`, 0.02 L), not contact area — the parts'
  areas are not on the bill.
- **B25 (W6)** — starch paste's pot takes flour and water, both BULK, and
  a pot's liquid is one slot: whether a second pour mixes is the bulk
  layer's (unverified). Casein (curd item + milk of lime) and rubber
  cement (rubber lump + turpentine) are item + liquid and sound. An animal
  glue at room temperature is a cake (meltingPoint 308, cast
  `glue-cake`): it must be warm in its pot to glue anything.

- **B26 (W7, D15 re-planned)** — there is NO `wipe` verb (the plan's
  premise). A rag gets oily by `dip rag in pot`: the `PaintPot` is now a
  `GlazeTub` (a dip bath), and the rag's self-heating reads its wet
  oxidation coat. `Wet.wetMaterial` was therefore not added (nothing would
  write it). `Thermal.reconcileCoats` leaves a self-heating host's coats to
  the host.
- **B27 (W7)** — the kernel `SelfHeatingMixin` keeps the hay rick's field
  names (`rickCoreK`/`rickStamp`) so no barn record needs a migration; a
  heap catches only when COMBUSTIBLE (a bale is not, so hay smokes as
  before). Linen gained an autoignition point (680 K); an oily rag lowers
  its own to 420 K.
- **B28 (W7)** — a pour joins only LIKE with like (`BulkableLogic` step 2),
  so turpentine cannot thin a pot of oil paint; the `PaintPot` thinner path
  is unreachable from the verbs today. The fumes come from pouring
  turpentine into an open dish (shipped emission) and from stirring a
  volatile (vented). Recorded for the bulk-mixing seam.

- **B29 (W8)** — the round has two stations, not
  three (the sugar house's landing is inside Veshko's works). He does not
  restock his pot from the counter (`buy` from a brain) — recorded; his pot
  is authored full.

- **B30 (review, the owner)** — *painter* is the house painter's word. The
  plan had ceded it to `trade-diving`'s boat line; the owner: *"if you ask
  anyone what a painter is they're gonna say it's someone who paints."* The
  boat line is now `bow line` (shortDescription and keywords; its template
  path `/trade/diving/thing/painter` is kept so every stock line and record
  still resolves), the lining prose says *bow line*, and Tam answers to
  `painter` and `house painter`. *Lens 3a: the fiction speaks the common
  word.*

- **B31 (review, the owner)** — *no new mixins.* `WeatheringMixin` folded
  into `FacedMixin`: weathering is every outside's, on decomposition's
  exposure rule (nothing changes indoors — Law 2 by construction), so a
  second weathering thing needs no class; `GessoPanel` retired to a `Good`
  row, `SignBoard` is `MarkedMixin(Good)`. `ShellMixin` folded into
  `DurableMixin`: the fabric was a second 0..1 condition with bands and a
  restore; a building now composes `Durable`, the weather writes its
  condition only while the coat is gone (`bareWearPerDay`, the building's
  `structure.weather.daysToWorn` dial), and `maintain` sets it sound. The
  five residence bands gave way to `Durable`'s four words. A building with
  no landing standing leaves its coat unwalked until one stands; a bare one
  still wears. The staged-ship rule holds: `Durable`'s slice is empty while
  the coats are not kept. Only `SelfHeatingMixin` remains, promoted, not
  new. *Lens 2: a second instance needs zero code.*

- **B32 (review, after merging the tracts build)** — *a holding's buildings
  come from its floorplan.* Farms became holdings, and D6's one house per
  holding made a farmstead's house and barn one building with its yard and
  tracts inside it. Now a building is the ENCLOSED rooms grouped by the
  floorplan room's `building:` key (none = the main building); open ground
  is no building's and is where they are painted from. Each house holds
  its room INSTANCES; a room asks its warren which building it is in
  (`Warren.structureOf`, the hook `HoldingWarren` answers;
  `Place.structureNow` asks it before the location graph) — a keyed room
  has no path of its own (holding.md § Identity), and the first cut's
  `Stuff.getPlacePath()` (a persistence key passed off as a place) is gone;
  `Stuff.ts` and `Persistable.ts` are master's again. Only the main
  building is registered with the location graph, at the holding's extent.
  Each persists under `<extent>` (main) or `<extent>@<name>`. The farmstead's barn is `building: barn`. The ascent
  gate reads the main building. *Lens 2: the author says what a building
  is; the next farm layout is rows.*

- **B33 (review, the owner)** — *a Building is not every Structure.* The
  outside (coat + condition + upkeep) had been put on the `Structure` twin
  every row names, so the Hesper inherited a building's (weathered only
  from a landing, area from walls, `maintain`-able with a householder's
  kit) and the Waponi Woo PEAK could be painted. Now `lib/structure/
  Building` (only inherited: `Durable(Faced(Structure))` + the outside's
  rules, once) under the `platform/idea/Building` twin (11 rows) and
  `HoldingBuilding` (renamed from `HoldingStructure`, its copied overrides
  gone; row `holding-building`); the `Structure` twin is bare
  (`Singleton(Structure)` — the peak); `Ship` is master's
  `Persistable(…(Structure))` plus a `Faced` hull (weathers at her deck,
  area L × (B + 2D), coats kept once sold) and no `Durable`;
  `persistsWhenStaged` is gone. `maintain`, `survey` and the painter's
  brain narrow on `Building`. No migration: a plain Structure never
  persisted on master and `HoldingStructure` never left this branch.
  *Lens 3a (a mountain you can paint betrays the fiction); lens 2 (the
  next kind of building composes once).*

---

## ⭐⭐ Host placement

| what | host | what composing it claims of everything else on that host |
|---|---|---|
| `isLandedAt` / `landingsNow` / `isTitleSold` / `exteriorAreaM2` / `standUpMembers` | `lib/structure/Structure` (the base) | every structure, including a ruin and a minted lot house, can be reached from where it meets the weather and knows whether it has been sold — true of anything with members and an extent |
| `FacedMixin` | the platform `Structure` twin; `HoldingStructure` | every default building has ONE outside something can be laid on (`faces()` answers `['outside']` — not Bulkable); a Ship inherits it (her hull is her outside). Not on the base: a monument composes none |
| `WeatheringMixin` | the twin; `HoldingStructure`; `SignBoard`; `GessoPanel` | *this thing's coats thin where the weather reaches them and its pigment fades in the sun*. ⚠ NOT on `Good` — a cart's outdoor wear is decomposition's exposure clock (Deferred seams); a `Faced` host is required (the mixin throws at compose otherwise — no guard inside) |
| `ShellMixin` | the twin; `HoldingStructure` | *this thing has a fabric that wears when its coat is gone and can be mended*. Requires `Weathering`. A ship's "fabric" is her hull's — true |
| `PersistableMixin` + `shouldPersist = isTitleSold` | the platform `Structure` twin | a building persists iff sold; **Ship** already composes Persistable above the twin and keeps persisting always — the exterior slices gate themselves (D7) |
| `HoldingStructure` | `residence` pack class over the base | a minted building per holding; persists unconditionally; never a row-named landmark |
| `KineticSpec.sets`, `exothermicJPerKg` | `lib/material/Kinetics.ts` (data on the material) | a change may set by air; default `heat` leaves every glaze, cure and firing row byte-identical |
| `Material.weatheringMPerGameYear`, `pigment`, `adhesive` | `Material` | authored per row; absent = never weathers / no color / not a glue |
| `BulkPayload.paint` | declaration merge from `lib/material/Paint.ts` | a liquid may be a mixture with a makeup; absent on everything that is not |
| `CoatLayer.paint`, `CoatLayer.marks`, `CoatLayer.weatheredS` | `Faced.ts`'s `CoatLayer` | a coat may remember what it was made of and what was written in it |
| `Compounding.payloadFor` `@hook` | `lib/material/Compounding.ts` | a compounding vessel may describe its product's makeup; default writes nothing |
| `PaintPot`, `GluePot`, `CorrosionJar`, `Rag`, `SignBoard`, `GessoPanel`, `Brush` row | `trade-painting/src/thing/` (the `Brush` CLASS is kernel `platform/thing/Brush`) | pack-owned instanceables under `/trade/painting/thing/` |
| `Brush` class | `K/platform/thing/Brush extends Tool` | the one verb affordance (`paint`) — a static on a class |
| `SelfHeatingMixin` | kernel `lib/thermal/SelfHeating.ts`; composers `HayBale` (trade-farming), `Rag` (trade-painting) | *this thing makes its own heat and sheds it by its surface*; requires `Thermal` + `Combustible` to burn (hay composes both today? — ⚠ verify at W7; if `HayBale` lacks `Combustible`, the ignite call is `MixinApi.isCombustible`-narrowed and hay keeps its bands without burning, exactly as today) |
| `Wet.wetMaterial` | kernel `lib/wetness/Wet.ts` | a wet thing may say what it is wet with; water by default |
| `TapSpec.instrument` | `Species.ts` (data) | a tap may name its tool; default `boring` |
| `JointState.glue/setAt/setProgress`, `BillJoint.takes` | `lib/craft/Assembled.ts` (data) | a joint may be made with a consumable that decides its life |
| `Flued.takeSoot` | kernel `lib/fire/Flued.ts` | every flue's soot can be taken as a thing when a dial names the row |
| live structure attachments | `LocationGraphRegistry` | the graph may carry runtime structures beside row-derived ones |
| `candidatesForHere` landing push | `api/mql/scope-walk.ts` | a room's pool includes the buildings whose outside is at hand |

⭐ The test applied: no guard re-narrows a host. `WeatheringMixin` refuses
to compose without `Faced` (a compose-time throw, not a runtime guard);
`ShellMixin` without `Weathering` likewise. `FacedMixin` on the twin needed
no change to its own guards (`isTangible`/`isBulkable` are soft host reads,
not narrowing). Where this plan was tempted to compose `Weathering` on
`Good` "so a cart weathers" and then skip indoor goods, it wrote the seam
down instead (Deferred seams).

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- `props:`/`cast:` on every new place row (`populates:` is retired; the
  ropewalk rows are the shape). The pine stand's trees are `props:` of a
  `Panel` (the sugarbush shape).
- Locations: `/platform/location/Locale` for the shop, the yard, the
  cottage room and the shed; `/platform/location/Street` only if a new
  street is needed (none is — the towpath is the lane).
- Namespace axes: `/trade/painting` (who makes); the generic paint
  material, pigments, binders, glues under `/trade/painting/idea/material/`;
  the commons gets only what the commons owns (`ochre-clay` in
  base-library, `pine-gum` in forestry); `/world/terminus/wharfside/…` for
  the venue; `/system/residence/idea/HoldingStructure` for the minted
  building (a system's class).
- `<root>/<branch>/` for every row and class: `/trade/painting/thing/…`,
  `/trade/painting/idea/{material,fractionation,maturation,Discipline}/…`,
  `/trade/painting/idea/cmd/` — NONE (the pack ships no controller: `paint`
  is the kernel's). Pack `src/`: `thing/`, `behavior/`, `__tests__/`; no
  `lib/` (no pack-only substrate).
- Module scope declares; lifecycles initialize (`postRegister` for the
  entrance stand-up; no module-scope statements).
- Import boundary: the pack imports the kernel by `@saxonberg/server/mud/…`
  specifier only; `lib/material/Paint.ts` imports nothing outside `lib/`;
  `lib/structure/*` may import `api/navigation`/`api/parcel` (as
  `Atmospheric.ts` already imports `NavigationApi`).
- Verbs on objects: `coatPlanFor` on the target, `takeSoot` on the flue,
  `mendFabric` on the structure, `addToxinBurden` on the body. No
  `XApi.verb(host, …)`; `PaintController` orchestrates only.
- No new module category, no free helper, no new `eslint-disable`.
- Lint gates this build must pass (`pnpm -C packages/server lint:family`):
  `lint:mixin-names` (three kernel mixins added to `Mixins`),
  `lint:instanceable` (base in `lib/`, twin + `Brush` in `platform/`, pack
  classes under the pack root; no `container:`/`hydratorClass:`),
  `lint:envelope` (structure rows author no `enclosure`/`roof`; `coats:`
  is fine), `lint:arg-kinds` + `lint:instrument-args` (`paint.yaml`'s
  `brush` default; `write.yaml`'s `medium`), `lint:reachability` (the
  greedy-arg arms on `write`), `lint:capabilities` (`painting` consumed by
  `paint.yaml`), `lint:counters` (content `Stock` rows are exempt),
  `lint:location-graph` (the cottage, shop, yard, shed on the towpath's
  graph), `lint:light-sources` (the shop's hearth row), `lint:module-scope`,
  `lint:imports`, `lint:lib-statics` (`Paint` is instance-method only),
  `lint:object-verbs` (zero), `lint:descriptors` (new material names vs
  the descriptor bank — *ochre*, *lampblack*, *varnish* checked), `lint:
  schema` (no new collection), `lint:test-bootstrap`, `lint:drive-scripts`
  (the drive is a wire file), `lint:perishable` (no new `Provision`),
  `lint:biome-sky` (the new places DECLARE `enclosure:`/`roof:` so the
  legacy count does not rise).

---

## Waves

Every wave lands at a commit `build(paint W<n>): …`, with `pnpm test:near`,
every touched pack's own vitest and `lint:family` green. The plan is kept
current as each lands.

### W0 — the landing, and a structure you can address (kernel) ✅

> **Done** (757210c0e). Base/twin split, the landing rule, the exit's
> alongside protocol, live structure attachments, the `here` push,
> `survey`'s optional target. Notes B1, B2. construction.md's correction
> rides W9's docs.

Goal: from a landing, `look <building>` and `survey <building>` bind and
answer; a closet, a neighbor's parlor and a sailed ship's berth do not.

- D1: split `platform/idea/Structure.ts` → `lib/structure/Structure.ts`
  (base) + the twin (`SingletonMixin(StructureBase)` for now; the
  capability mixins arrive in W1). Rewrite the header: a structure IS
  made of materials — the bill to erect and maintain is the construction
  slate's; what it is NOT is a container of walls (each place authors its
  own). `docs/subsystems/construction.md` § the Structure paragraph gets
  the same correction. `check-envelope.ts` prose line 424 updated (the
  gate itself unchanged).
- D2: `StructureBase.isLandedAt(room)`, `landingsNow()`, `landingsFrom(
  room)` (async stand-up), `postRegister` standing up `entrance`;
  `AboardExit.alongsideNow()` public; `NavigationLogic.structuresLandedAtNow(
  room)` + `NavigationApi` forwarder.
- D3: `candidatesForHere` pushes landed structures. `SurveyController`
  gains an optional `target` arg (`survey.yaml`: `scope [reachable]`,
  `requires: any`) that, bound to a structure, reads it; `look <structure>`
  needs nothing (Detailed + the augmenter).
- D6 half: `LocationGraphRegistry` live attachments + `NavigationApi.
  attachStructure/detachStructure`.
- Tests: `lib/structure/__tests__/Structure.landing.test.ts` (the rule
  over a street/hall/closet/courtyard/warehouse-shed fixture; the entrance
  clause; a sailed ship); `scope-walk` test for the `here` push;
  `NavigationLogic` live attachment test.
- Acceptance: AC 1 (the reach half) and AC 2 unit-proved; `look cottage`
  from the towpath binds in the drive once W8 lands.
- Commit: `build(paint W0): the landing — a structure is reached where it
  meets the weather`.

### W1 — the coat sets by the air and weathers; the shell is a capability (kernel) ✅

> **Done, landed WITH W2** (one commit — the cohesion note: W1 alone would
> have dropped a home's fabric line). `KineticSpec.sets`/`exothermicJPerKg`
> (validated), `Faced.airCoats`, `Weathering`, `Shell`, `Paint`,
> `Material.pigment/adhesive/weatheringMPerGameYear`, the twin's
> composition + persistence, the survey's building read and the look
> augmenter. `Compounding.payloadFor` moved to W4 (its consumer).
> Notes B3–B9.

Goal: one coat model for a pot, a sign and a building; a building left
alone loses its coat and then its fabric.

- D4: `KineticSpec.sets` + `exothermicJPerKg`; `Faced.airCoats(window)`,
  rain → `run`, frost → `crazed`; `CoatLayer.paint/marks/weatheredS`;
  `layCoat(face, path, thickness, dirty, makeup?)`.
- D5: `lib/material/Weathering.ts` (`WeatheringMixin`), `lib/structure/
  Shell.ts` (`ShellMixin`), `Material.weatheringMPerGameYear`, the site
  weather walk (`WeatherApi.segmentsBetween` over the structure's locality
  + `ClimateSite`; cap the window at `structure.weather.maxWalkDays` 400
  segments), the dial move (`structure.weather.daysToWorn` in
  `platform/content/settings/structure.yaml` + `AppSettingKeys`; delete the
  residence key), `COAT_WORDS` reading the makeup's color.
- D8: `lib/material/Paint.ts` + the payload merge; `Material.pigment`;
  `Compounding.payloadFor` hook; `Colour` fade by lightfastness.
- D7: `PersistableMixin` on the twin with `shouldPersist`; `isTitleSold`
  + `refreshTitle`; `captureSlice` on both mixins; the twin composes
  `Shell(Weathering(Faced(Singleton(Base))))`. Ship's hull reads as her
  outside.
- D13 half: `SurveyController` fabric/coat/area/job lines read the
  structure (the holding only for the term); the `coatAugmenter` +
  a `shellAugmenter` on the twin (*"Its fabric is weathered — the paint is
  going…"*).
- Tests: `Faced.air.test.ts` (carbonation vs drying vs rain vs frost;
  heat untouched — every existing Faced test green), `Weathering.test.ts`
  (thickness → years; two coats; the fade), `Shell.test.ts` (fabric holds
  under a coat, wears at 0.5/45 days once gone; bands; cause lines),
  `Structure.persist.test.ts` (staged writes nothing; sold round-trips;
  a Ship record without the slices restores from the row), `Paint.test.ts`
  (colour fold, litres/thickness arithmetic, words with no digit).
- Acceptance: AC 3 (arithmetic), AC 4 (one rule), AC 7, AC 8 (fade), AC 9
  (staged/owned) unit-proved; the drive's staged twins stand on these.
- Commit: `build(paint W1): a coat sets by its binder's chemistry and
  weathers; the shell is every building's`.

### W2 — the shell leaves residence; a holding gets its building ✅

> **Done** (with W1). `HoldingWarren` lost the shell; `HoldingStructure` +
> its row; `wakeHouse` mints/registers/persists it; `maintain [<x>]`, the
> `maintains` brain and `CirculationWarren.conditionOf` read the building;
> the residence dial moved to `structure.weather.daysToWorn`; Seznick
> House's structure row. Notes B10–B12.

Goal: `survey`, `maintain`, Walter's round and the ascent gate all read a
kernel structure; Hinkley lots and Seznick House have buildings.

- D13: `HoldingWarren` loses the six shell members; `MaintainController`
  re-targets (`maintain [<structure>]`; `mendFabric`); `maintains` brain;
  `CirculationWarren.conditionOf` → `NavigationApi.structureAt` +
  `isShell`; the two ascent-gate tests re-spied.
- D6: `residence/src/idea/HoldingStructure.ts` + the row
  `/system/residence/idea/holding-structure`; `HoldingWarren.wake()` mints
  or skips (a Structure row already covering the key); `mayfield-row/
  seznick-house/structure.yaml`; Duncan Hall gets a structure row too
  (the dorm is one building; its landing is the quad — verify the quad
  holds no air at build).
- Tests: residence `HoldingWarren.test.ts` updated (no shell fields);
  `HoldingStructure.test.ts` (minted per key, persisted, registered,
  `structureAtNow(unit)` answers it; skipped under a row);
  `SeznickHouse.test.ts`, `TitleVerb.test.ts`, `MaintainController.test.ts`
  re-pinned.
- Acceptance: AC 4 (*a home's survey reads its building*), the `maintain`
  half of AC 3.
- Commit: `build(paint W2): the shell is a kernel capability; a holding's
  house is a building`.

### W3 — `paint`, the brush, and `write … with paint` (kernel) ✅

> **Done, landed with W4** (the `painting` capability is offered only by
> the brush ROW, which is the pack's). `paint.yaml`, `PaintController`,
> `Faced.coatPlanFor` + `coatReachRefusal` (a building refuses off its
> landing), `platform/thing/Brush`, `write … with <pot>`. The Discipline
> credit is NOT wired (no `AdvancementApi` call in `dip` to copy) —
> recorded. Notes B13–B16.

- D9: `platform/cmd/crafting/paint.yaml`, `PaintController`, `Faced.
  coatPlanFor` + the structure override, `platform/thing/Brush`,
  `structure.paint.coatThicknessM` dial, the `painting` capability +
  Discipline credit seam (`AdvancementApi` as `dip` credits ceramics —
  verify the call shape in `DipController`).
- D10: `write.yaml` `medium`, `Marked.writeOn(by, words, medium?)`, marks
  on a coat, `read` through the coat, marks gone with the coat.
- Tests: `PaintController.test.ts` (a Faced good; a structure from a
  landing; refusals `no-landing`/`not-paint`/`source-too-low`; litres
  drawn ∝ area; the lead skin dose stub), `Marked.paint.test.ts`,
  `msh` round-trip of `write ROPEWALK on board with paint` (the greedy
  arg order).
- Acceptance: AC 1 (the paint half), AC 6 (proportional use), AC 14
  (letters) at the unit level.
- Commit: `build(paint W3): one verb paint, afforded by a brush; write
  takes paint as a medium`.

### W4 — `trade-painting`: binders, pigments, paint, varnish; the mill and the jars ✅ (jars open)

> **Done** except the corrosion jar (B22). The pack, linseed oil / egg
> tempera / generic paint / gesso / seven pigments + lead-white flake,
> `PaintPot.payloadFor`, `GessoPanel`, `SignBoard`, the mill recipes
> (linseed, yellow ochre, lead white), burnt ochre's ladder, milk of lime
> as limewash, chalk's pigment, flax seed's material, ochre clay, the
> Discipline, and the colorman's shop pulled forward (B21). Notes B17–B22.

- The pack (`pack.yaml` root `/trade/painting`, title under
  `/compact/trade`; `package.json` deps: platform, base-library,
  generic-objects, trade-chandlery, trade-dairying, trade-ranching,
  trade-tanning, trade-fishing, trade-milling, trade-farming, trade-dyeing,
  trade-distilling, trade-forestry, trade-fuel, trade-rubber,
  trade-quarrying, trade-smelting, trade-winemaking, server, types; root
  `package.json` entry; `pnpm install`; the pack-count test recounted).
- D19 rows: linseed oil (`sets: oxidation`, `exothermicJPerKg`,
  `weatheringMPerGameYear 0.000015`, `solidsKgPerL`, `laysCoat`,
  `coatWord: painted`), milk of lime's two keys (chandlery), casein, egg
  tempera (`sets: drying`), the generic `paint` material, `varnish`,
  pigments (yellow/red ochre, chalk, lampblack, malachite green,
  verdigris, madder lake, lead white — each a `pigment` block; lead white
  tagged `lead` + `toxicity` of the shipped shape), `flax-seed` material +
  the seed row's `_materialPath`, `ochre-clay` (base-library + quarrying
  lump), `turpentine` (+ vapour, W7's toxicity added then), `rosin`.
- D8 `PaintPot` + rows (`paint-pot`); D19 recipes `linseed-oil.yaml`,
  `yellow-ochre.yaml`, `lead-white.yaml`/`verdigris.yaml` (cake → powder);
  the `CorrosionJar` + two `chemical` profiles; burnt ochre's kinetics
  ladder; the madder-lake profile; the ready-paint counter line's row
  (`ochre-oil-paint`, a pot authored full with a `paint` payload — ⚠
  verify the applier writes a payload from a row; the sugar build's
  filled-vessel precedent).
- Tests (pack vitest): the pot's `payloadFor` (ochre + linseed → a paint
  whose `colour().nearestTag()` is a yellow and whose words name binder,
  pigment and color with no digit); the jar's profile match; burnt ochre.
- Acceptance: AC 5 (make paint; look names binder, pigment, color).
- Commit: `build(paint W4): trade-painting — pigment in a binder, made
  from what ships`.

### W5 — resin: the tapped pine, the cut, the varnish ✅

> **Done.** `TapSpec.instrument` (default `boring`); `SapStandard` refuses
> and words the set by the tap's instrument (a pine is cut with a blade);
> Scots pine produces gum in warm weather; `pine-gum` (forestry),
> `pine-standard`, three named pines added to the SUGARBUSH panel (9 slots)
> rather than a new panel — no new place; the `pine-gum` schedule (still →
> turpentine, rosin residue); rosin casts as a lump; turpentine jar,
> rosin and varnish pot on the colorman's counter. Note B23.

- D17: `TapSpec.instrument` + `TapController` reading it (one line where
  the tool is narrowed; `tap.yaml` help sentence); `sylvestris.yaml`
  production; `pine-gum` material (forestry); `pine-standard.yaml`;
  rejection's `pine-stand.yaml` + three pines + the ride's `props:`;
  `trade-painting/…/fractionation/pine-gum.yaml`; `varnish` compounding
  row (`varnish-pot`? — no: any `CompoundingVessel` row with
  `productMaterial varnish`; one row `varnish-pot`).
- Tests: forestry `SapStandard.test.ts` (a `cutting` tap refuses an
  auger); distilling's schedule test for `oleoresin` (cut + residue);
  pack test for the varnish payload.
- Acceptance: AC 10.
- Commit: `build(paint W5): resin tapped from pine, cut to turpentine and
  rosin, stirred to varnish`.

### W6 — adhesives: the glues, and the glued joint made real ✅

> **Done.** `JointDescriptor.takes` (`glued.yaml takes: glue`, validated);
> `fit`'s raise arm finds an open vessel of glue in reach (litres per
> joint dial), refuses `insufficient-input: glue` without one, draws it
> and `glueJoints()`; `Assembled.reconcileGlue` sets the line by the
> glue's air rule, slackens it in the damp by `1 − resistsDamp`, lets go
> past `softensAtK`; weak until set, and a knock before it sets costs
> more; the look says *the glue line has failed*; salvage reads the glue
> (hide/bone/fish come apart hot and wet). Six glue materials + rosin's
> adhesive; `GluePot` (stock → hide/bone/fish glue by the stock's tag,
> three profiles); casein, paste and cement pots; hide scraps (tanning),
> fish skins (fishing), bone's `collagen` tag; the brush is an ASSEMBLY
> (bristle glued into a handle) with a `fit brush` recipe. Notes B24–B25.

- D11: `Material.adhesive`; `BillJoint.takes`; `JointDescriptor.takes`;
  `glued.yaml` `takes: glue`; `fitImpl` + `jointGate` consume glue;
  `JointState` set fields; `Assembled.reconcileGlue`; `salvageByJoints`
  reads the glue; `look`'s slack line says *the glue line has let go*;
  `shield.yaml` unchanged (verified to still `fit`).
- D12: `GluePot` + `glue-extraction` profile; `glue-liquor` →
  `hide-glue`/`bone-glue`/`fish-glue` (`concentratesTo`, `meltingPoint
  308`, `chillsTo`/cast `glue-cake`); `casein-glue`, `flour-slurry` →
  `starch-paste` (kinetics), `rosin-cement`, `rubber-cement` + their
  vessel rows; hide scraps (tanning) + fish skins (fishing) + bone's tag.
- The brush row as an assembly (`bill` with a `glued` joint, `takes:
  glue`; parts `handle` (a `trade-carpentry` dowel/board? — the nearest
  shipped wooden part row, verified at build) + `bristle`).
- Tests: `Assembled.glue.test.ts` (weak until set; disturbed; damp parts
  a hide line and not a casein one; heat+steam reverses hide only;
  litres consumed ∝ area); pack tests for the pot's profile and the gel.
- Acceptance: AC 16, AC 17.
- Commit: `build(paint W6): glue from what ships; the glued joint costs
  glue and fails by it`.

### W7 — the three hazards ✅

> **Done.** Lead: every row now doses `lead` (the shipped bug — leaches too);
> the Condition has the colic band at 2; `mill`ing a `lead`-tagged stock and
> brushing lead paint dose the body (a glove halves the skin's share).
> `SelfHeating` is the kernel's (`Mixins.SelfHeating`); hay's drive moved
> onto `HayBale` unchanged (its suite green); the `Rag` heap heats from its
> oil coat and catches; a spread rag sheds it; a wet one does not heat.
> Turpentine is a volatile with a vapor and a Condition; stirring a
> volatile vents it. Notes B26–B28.

- D14 lead (rows + bands + the two dose calls + a glove halving).
- D15 `SelfHeating` to the kernel (`Mixins.SelfHeating`,
  `MixinApi.isSelfHeating`; `HayBale` re-imports; the `Rag` class + row;
  `Wet.wetMaterial`; `wipe` recording the liquid — verify the cleanliness
  verb's seam at build: `Wet.soakUp(from)` gains the material of `from`'s
  bulk when `from` is a vessel).
- D16 turpentine vapour material + Condition; `stir` re-emits.
- Tests: `SelfHeating.test.ts` (a heap of oily rags runs away in ~N game
  days and ignites; one rag does not; a water-soaked heap does not; the
  hay rick's bands unchanged), `Metabolic.lead.test.ts` (the fixed type
  absorbs; the colic band at 2), `Respiration.turpentine.test.ts` (a
  closed room poisons; ACH clears it).
- Acceptance: AC 11, AC 12, AC 13.
- Commit: `build(paint W7): lead white poisons slowly; oily rags catch;
  turpentine in a shut room`.

### W8 — Wharfside: the colorman, the house painter, the buildings ✅

> **Done** (the shop itself landed in W4, B21). The towpath cottage (zone,
> room, limewashed structure row, its own parcel so it can be sold), the
> chandlery's structure row, Seznick House's white-lead oil coat, the shop's
> hearth, the shed's rag; Tam Rook (`housepainter`) with a brush and a pot
> of ochre oil, his rota round (the towpath mornings, Mayfield Row
> afternoons) and the `paints` brain (the landed building with its coat gone
> or thin → the literal `paint` verb); `Flued.takeSoot` behind
> `cleanliness.sootTemplate` (the pack sets it to lampblack) and the sweep
> saying what was gathered. Note B29.

- D20 + D18: the zone, shop, yard, shed, cottage (+ structure row with its
  limewash), the chandlery's structure row, the towpath exits, the counter,
  the outfit, the cast, the round, the `paints` brain; `Flued.takeSoot` +
  `cleanliness.sootTemplate` + `SweepController`; `terminus/package.json`
  + `pack.yaml` title for the cottage.
- Tests: terminus `Wharfside.test.ts` row-shape checks (no keyword
  `painter` anywhere under `wharfside/colorman`); `paints.test.ts` (the
  brain picks the worst coated-gone building at its station and types
  `paint`).
- Acceptance: AC 18, AC 19.
- Commit: `build(paint W8): the colorman at Wharfside, the house painter's
  round, the cottage that peels`.

### W9 — the drive, the docs

- `packages/wire/tests/paint.dirty.wire.test.ts` (blocking) +
  `paint.soak.dirty.wire.test.ts` (span), per § Test & gate strategy; run
  the blocking drive (`WIRE_BOOT=1 WIRE_PORT=2013 npx vitest run
  tests/paint.dirty.wire.test.ts` from `packages/wire`); fix what it
  finds as commits; append the Drive record.
- Docs the build owes (the sweep graduates the rest): `faces.md` (air
  setting, wear, color, the structure host), `construction.md` (the
  correction + the landing), `holding.md` (the shell moved; the term
  stays), `assembly.md` (the glued joint takes glue), `taps.md`
  (`instrument`), `spoilage.md`/`fire.md` (SelfHeating promoted),
  `metabolism.md` (the lead fix), a new `docs/subsystems/painting.md`.
- Commit: `drive(paint): the blocking drive, N/N` + `docs(paint): …`.

---

## Reachability wiring

| capability | verb | affordance (who lists the view) | data | boot | arg gate |
|---|---|---|---|---|---|
| see / survey a building from its landing | `look <x>`, `survey [<x>]` | platform views (the Avatar's); the structure enters `here` via `structuresLandedAtNow` | the structure row (or the minted `HoldingStructure`); member rows' `enclosure`/`roof` | none — the structure stands up with its zone; its entrance stands up with it | `look` target `reachable`; `survey` target `requires: any` |
| paint | `paint <x> [with <pot>] [using <brush>]` | `Brush.commandContributions` (`self`) — a brush in hand; ⚠ the brush row must name `class: /platform/thing/Brush` or the verb is invisible | `paint.yaml`; the pot's liquid `laysCoat`; `structure.paint.coatThicknessM` | — | `target requires: any` (the plan refuses in words); `paint requires [BulkableMixin]`; `brush default reachable:[capability.painting]` |
| maintain a building | `maintain [<x>]` | `HouseholdersKit.commandContributions` (shipped, residence) | the kit row; the structure | — | the room's structure or a landed one; `sound` refused |
| make paint | `mill`, `pour`, `stir` | shipped (`Mill`, platform bulk, `Compounding`) | recipes `oilseed`/`ochre-clay`; `PaintPot` row with `productMaterial paint`; pigment rows | the recipe catalogue (shipped loader over `content/recipes/`) | `mill` first-match by tag — categories specific |
| limewash | `pour`, `paint` | shipped | milk-of-lime's `laysCoat`/`coatWord` | — | — |
| write in paint | `write <words> on <board> with <pot>` | `MarkedMixin` (shipped) | `write.yaml` `medium`; the board row `Faced` | — | `medium requires [BulkableMixin]` BEFORE the greedy `surface` |
| tap resin | `tap pine with knife`, `tap pine into pot` | `SapStandard` (shipped, the tree affords it outward from the panel) | `sylvestris.yaml` production (`instrument: cutting`); `pine-standard`; the stand panel + three trees as `props:` | the panel is a room prop (load with the ride) | `tool` default `capability.boring` is OVERRIDDEN by the spec's instrument — the controller narrows on `instrument`, else the auger binds and the tree refuses in words |
| cut the gum | `pour gum into still`, `ignite`, `pour still into cask` | shipped (`Still`) | `fractionation/pine-gum.yaml` keyed by tag `oleoresin`; `turpentine`/`rosin` rows | the schedule roster (shipped, by key/tag) | the charge must be Bulk |
| make glue | `put scraps in pot`, `pour water`, hearth, `pour` | shipped (`CraftVessel` is a Container; `Maturing.matchProfile`) | the profile row; the three liquors; `meltingPoint`/`chillsTo` | profile roster warms by key | the `collagen` tag on the solids |
| glue a joint | `fit <recipe>` / `fit <part> to <whole>` | shipped | `glued.yaml takes: glue`; a bill with a `glued` joint; the glue in an open vessel in reach | — | `takes: glue` gates on the vessel; the refusal names the glue |
| the rag fire | `wipe … with rag`, drop the rags in the shed | shipped `wipe` + inventory | the `rag` row (class composes SelfHeating+Combustible+Thermal+Stackable); linseed's `exothermicJPerKg` | — (reconcile on read; the fire driver's spread is presence-gated — the soak step logs a body in the shed) | — |
| lead | `mill lead-white-cake`, `paint … with lead paint` | shipped + W3 | the fixed `toxinType`; the bands; the two dials | — | — |
| fumes | `pour turpentine into pot`, `stir` | shipped | `turpentine.yaml` vapour fields; the gas row; the Condition | — | the vessel `open`; the room `holdsAir()` |
| lampblack | `sweep hearth` | `SweepingTool` + the platform view (shipped) | `cleanliness.sootTemplate` (pack settings) + the `lampblack` row | — | the burner must be `Flued` |
| buy at the colorman's | `buy <x>` | shipped retail | the counter's `stockLines` + `prices`; the outfit; `banksAt` | `EmploymentApi.ensureOperatorAt` — the seat on shift or self-service | — |
| the round | — | the roster tick relocates Tam to each `station:`; the `paints` brain on `candidate` | `painters-round.yaml`, `housepainter.yaml` (`behaviors: [{brain: /trade/painting/behavior/paints}]`), his props | the stations spawn him (the tinker's precedent) | his `forceCommand`s are gated as typed lines — he needs the brush and a pot |
| the holding's house | — | — | `holding-structure` row; `HoldingWarren.wake()` | the holding's own wake | registered live or `structureAtNow(unit)` is null — the W2 test asserts the registration |

⚠ Check by hand in W8: the `Brush` row's class; that `colorman/location/
shop` is on the towpath's graph (`lint:location-graph`); that no keyword
under `wharfside/colorman` or `trade-painting` contains the token
`painter`.

---

## Acceptance-criteria coverage

| AC | where it is met | drive |
|---|---|---|
| 1 look/survey/paint from a landing; refusals elsewhere say why | W0 (D2/D3), W3 (D9) | 5, 6, 8, 13 |
| 2 a courtyard is a landing; a shed in a warehouse has none | W0 (unit) | unit (no shipped courtyard; the fixture) |
| 3 left alone it loses its coat then wears; repainted stays sound; words match | W1 (D5), W3 | 7 (staged), 8; soak 7 |
| 4 shop, barn, ship, home weather by one rule; a home's survey reads its building | W1, W2 (D6/D13) | 6, 13 |
| 5 make paint with mill/pour/stir; look names binder, pigment, color | W4 (D8/D19) | 2, 3, 4 |
| 6 paint used ∝ area; survey says the job | W1 (D13), W3 | 5, 8 |
| 7 lime needs air and time; oil warms; rain/frost sets badly | W1 (D4) | 9, 10 (staged); soak 10 |
| 8 color shows; a fugitive pigment fades | W1 (D8), W3 | 4, 20 (staged); soak 20 |
| 9 restage resets staged; owned unchanged | W1 (D7) | 12 (staged) + unit |
| 10 resin tapped, cut, varnish | W5 | 16 (staged), 17; soak 16 |
| 11 oily rags catch; spread or wet do not | W7 (D15) | 14 (staged); soak 14 |
| 12 repeated lead work → a named slow poisoning | W7 (D14) | 15 |
| 13 turpentine in a shut room harms until aired | W7 (D16) | 18 |
| 14 letter a board in paint; anyone can read it | W3 (D10) | 19 |
| 15 a gessoed panel painted with tempera is a good | W4, W3 | 20 |
| 16 seven glues from what the world produces | W6 (D12) | 22 (+ unit for the other six) |
| 17 glued joint uses glue; weak until set; hide fails damp, comes apart hot+steamed; casein holds, never comes apart | W6 (D11) | 23 (staged), 24, 25 |
| 18 colorman sells; house painter paints on his round; he answers to *painter* | W8 | 1, 21 |
| 19 milk of lime works as limewash with no chandlery mechanism change | W4 (gap 1) | 10 |

Nothing unmapped.

---

## Test & gate strategy

- Per wave: `pnpm test:near`, the touched packs' `pnpm -C packages/
  content/<pack> test`, `pnpm -C packages/server lint:family`.
- `pnpm test` exactly twice: at code-complete (the MR opens READY first,
  never draft) and at `/finalize`. Never in the background.
- Every player line that reads a band, a color or a condition is asserted
  with `not.toMatch(/\d/)`; the survey's area and litres MAY carry a figure
  (a measurement verb).
- ⭐ The drive IS the exit criterion. **Blocking:** `packages/wire/tests/
  paint.dirty.wire.test.ts` (instant + short + staged). **Soak:**
  `paint.soak.dirty.wire.test.ts` (span), named in the MR, run by the
  soak lane after merge. `declareFile({packs: [terminus, rejection,
  residence, trade-painting, trade-forestry, trade-distilling,
  trade-chandlery, trade-milling, trade-farming, trade-tanning,
  trade-fishing, trade-ranching, trade-dairying, trade-carpentry, water,
  world-seed, generic-objects, base-library]})`, `WIRE_PORT=2013`. The test
  character opens with `parcels: ['/world/terminus/wharfside/cottage']`
  for the owned half of step 12 only in a SECOND session (the first session
  drives the staged cottage).

| step | what | pace | staged twin (blocking) / soak |
|---|---|---|---|
| 1 | `look` at the colorman's; `buy` the list | instant | — |
| 2 | `mill flax seed` → linseed oil in the yard | short (the grind) | — |
| 3 | `mill ochre clay` → yellow ochre; `fire` some → red | short | the burn is minutes on a hearth |
| 4 | `pour`, `put ochre`, `stir`; `look pot` names binder/pigment/color | instant | — |
| 5 | from the towpath `look cottage`, `survey cottage` (coat, area, litres) | instant | — |
| 6 | inside, `survey` reads the same building | instant | — |
| 7 | weather the staged cottage until the coat is gone; survey's cause line; fabric wearing | **span** | staged: `eval` sets the outside coat's thickness to 0 and the fabric stamp back 60 days; `survey` reads *"the paint has gone…"*; soak: `advanceWorldClock` a game year with `pinWeather('rain')` |
| 8 | `paint cottage with paint`; pot drops by the litres; survey: wet → set → sound | short (oil sets over hours in dry air; `pinWeather('clear')`, jump 12 h) | — |
| 9 | paint in pinned rain → `run`, survey says so | instant | — |
| 10 | limewash a brick building sets over days by CO₂ | **span** | staged: `eval` advances the coat's `progress` to 1; `survey` reads *limewashed*; soak: jump 5 days |
| 11 | `maintain` inside mends the fabric, leaves the coat | instant | — |
| 12 | restage: staged resets, owned keeps | **staged** | `eval` → `PersistableApi.capture` on both, `hasRecord(cottage)` false for staged (title unsold) and the second session's (sold) record carries the coat; the reboot path is `Structure.persist.test.ts`; no soak half (gap 3) |
| 13 | on the estuary bank `paint hesper`; move her off the node (`eval` sets a course) → no landing | instant | — |
| 14 | a heap of oily rags in the shed warms and catches; spread/wet do not | **span** | staged: `eval` sets the heap's core to runaway − 5 K; a 4-hour jump ignites it (the shed burns); the spread and soaked heaps at the same core do not; soak: wipe, heap, jump 20 days |
| 15 | grind lead white repeatedly; the colic appears; `analyze` names it | short | the dose dial raised for the drive, put back after |
| 16 | `tap pine` in Hanging Wood; resin gathers in warm weather | **span** | staged: `eval` fills the tree's standing reservoir; `tap pine into pot` draws it; soak: `toWarmSeason`, jump 12 days |
| 17 | the still cuts turpentine, rosin left; stir → varnish | short | — |
| 18 | thin paint with turpentine in the shut shop → dizzy; open the door → clears | short (hours of ACH) | — |
| 19 | `write ROPEWALK on board with paint`; `read` | instant | — |
| 20 | gessoed panel + tempera → a painted panel; the lake fades in a sunny window | **span** | staged: `eval` applies a sun dose; `look panel` reads faded; soak: jump 30 days by a sky-lit window |
| 21 | Tam paints a weathered staged building on his round | short (the roster tick) | `testharness clock advance` to his slot; assert the building's coat is wet |
| 22 | hide scraps hot in water reduce to a liquor that gels; warmed, ready | short (hours) | — |
| 23 | hide-glued joint holds set; disturbed-before-set weak; wet cellar parts it; casein holds | **span** (the damp days) | staged: `eval` sets the room's humidity pin / the joint's `setProgress`; `look` says *let go* for hide, not casein; soak: jump 10 days in a pinned-damp cellar |
| 24 | heat + steam parts hide, not casein (`salvage`) | instant | — |
| 25 | the brush is an assembly, bristles glued | instant | — |

A season's outcome is proved by arithmetic in the unit tests (W1, W5, W6,
W7) and end-to-end in soak — never in the blocking drive. At `/finalize`
each step says `player` or `staged`.

- A headed browser walk of the colorman's, the towpath and the cottage
  after the wire drive is green (the live-drive rule); findings go in the
  Drive record.

---

## Risks & opens

### For the owner's eye

1. **D1 — the Structure base/twin split.** Needed by D6 (Singleton forbids
   the keyed per-lot instance). It moves no state into a mixin, but it
   touches the class the harbors build is likely editing. If the owner
   would rather not split, the alternative is Hinkley lots and Duncan
   units with NO building (their shell gone) — a regression this plan
   refused.
2. **D7 — "owned" = sold by the chain of title.** The harness's
   `Session.open({parcels})` makes the drive's cottage "owned"; the Hinkley
   lot is owned by `title buy`. A building a pack stages under an
   organization stays staged until somebody buys it. An institution that
   wants its building persisted without a sale has no path (Deferred
   seams).
3. **D4 — reusing `run` for rain and `crazed` for frost.** No new coat
   state; the words already fit. If the owner wants a distinct *"sets
   badly"* word, it is a `CoatState` value and `COAT_WORDS` line.
4. **D17 — `pine-gum` lives in trade-forestry.** The tree's yield is the
   forestry pack's (the maple's sap is `/stuff/idea/material/food/maple-sap`
   in base-library); the plan puts the gum beside the pine. Alternatively
   base-library, as the sap is.
5. **D18 — lampblack from the flue** rather than a lampblack lamp. The
   lamp is the historically right instrument; the flue is the shipped
   soot. A lamp is a Deferred seam.
6. **D15 — `wipe` records the liquid.** The cleanliness verb's seam is
   named but was not opened this session; if `wipe` cannot carry a
   vessel's liquid into a cloth, the rag is soaked by `dip rag in pot`
   (the bath lays a coat on a Faced good — a rag is a Good) and the coat's
   oxidation self-heats it; same arithmetic, different act.
7. **The oil mill** at the colorman's is a hand quern (`millstone`
   capability). Verify a quern row exists in `generic-objects` or
   `trade-milling`; else the yard props the trade-milling hand mill.

### Requirements-vs-code disagreements recorded, not reshaped

- Drive step 10 says *"slaked at the chandlery's kettle, or bought from
  the colorman"*: milk of lime is not sold today; the colorman's counter
  stocks it (a `par` line; the house buys nothing). The kettle route is
  the chandlery's shipped act.
- Drive step 16 *"cuts a face and sets a cup"*: the tap act's prose is the
  controller's; the pine's take reads *opens the tree and sets a cup*.

### Risks

- ⚠ The `here` pool now reaches a structure: a `get cottage` or `enter
  cottage` could bind. The plan's push marks the candidate `via:
  {landing: true}`; `GetController`'s `isContainable` narrowing already
  refuses an Idea; verify `enter`/`climb` refuse in words rather than
  throwing (reachability lint arm for `requires: any` views).
- ⚠ `exposure()` memoizes on the structure's `stuffId`: a minted
  `HoldingStructure` registered after its rooms stood up must invalidate
  the rooms' memo — the registry's attach calls `invalidateExposure()` on
  resident members (the Floor-snow precedent: re-run until the place
  answers).
- ⚠ The site weather walk over a long absence: cap at 400 segments
  (100 days) per read, as the maturation walks do; a longer gap integrates
  the cap and stamps forward — recorded in `Weathering`'s header.
- ⚠ `write.yaml`'s greedy `surface` after a `medium`: the tokenizer must
  split `on board with paint`; `msh` round-trip in W3 before the drive.
- ⚠ `PackLogic.discover.test.ts` recount at every merge; a sibling pack
  landing first changes the sum.
- ⚠ `lint:biome-sky`: every new place DECLARES `enclosure:`/`roof:`.
- ⚠ The drive world is ~3 GB; drive from the foreground, tear the server
  down by PID between runs; `WIRE_PORT=2013` so no sibling's preflight
  kills it.

---

## Deferred seams

Clean attach points, each leaving as a slate line, not a plan section:

- **A cart's coat weathering outdoors** → decomposition slate (the
  exposure clock; `WeatheringMixin` composes on `Good` the day it exists).
- **Continuous evaporation of an open volatile** → cleanliness/respiration
  slate (D16 keeps the one-shot).
- **An institution's building persisted without a sale** → the
  stage-and-simulation slate (runtime restage).
- **The lampblack lamp; the fishmonger's skins; the pig's bristle; a
  tannery and knackers counter** → the paint slate's "upstream" list.
- **Painting interior walls** → decor slate. **The erection bill** →
  construction slate (D1's header now says a structure IS made of
  materials; the bill is theirs). **The picture** → visual-arts slate.
- **Alkyd and latex** → the paint slate's epoch ladder (same `paint`).
- **Distemper (glue paint) on walls** → decor slate.
- **A `sets badly` coat word of its own** → faces.md open item if the
  owner wants it.

---

## Critical files

Read first, in this order:

1. `docs/requirements/paint-requirements.md`
2. `packages/server/src/mud/platform/idea/Structure.ts`,
   `platform/idea/Ship.ts`, `platform/idea/AboardExit.ts`,
   `platform/idea/api/NavigationLogic.ts` (`innermostStructure`,
   `structureAt`), `platform/idea/LocationGraphRegistry.ts:440-470`
3. `packages/server/src/mud/lib/biome/Atmospheric.ts:1340-1500`
   (`exposure`, `buildExposure`), `lib/spatial/Exposure.ts`
4. `packages/server/src/mud/lib/material/Faced.ts`, `Kinetics.ts`,
   `Material.ts` (`laysCoat`, `kinetics`, `solidsKgPerL`),
   `platform/thing/GlazeTub.ts` (the plan shape), `lib/thermal/Thermal.ts:1290-1315`
5. `packages/content/residence/src/idea/HoldingWarren.ts`,
   `…/cmd/crafting/MaintainController.ts`, `…/behavior/maintains.ts`,
   `packages/server/src/mud/lib/location/CirculationWarren.ts:335-365`,
   `platform/idea/cmd/perception/SurveyController.ts`
6. `packages/server/src/mud/lib/persistence/Persistable.ts`,
   `platform/idea/api/PersistableLogic.ts:520-660`, `lib/spatial/Container.ts:184-222`,
   `api/stuff.ts:810-860`, `api/parcel.ts`, `lib/parcel/ParcelRecord.ts`
7. `packages/server/src/mud/api/mql/scope-walk.ts:60-100`, `resolver.ts:160-180, 790-850`
8. `packages/server/src/mud/lib/craft/Assembled.ts` (joints), `platform/idea/Joint.ts`,
   `platform/idea/api/CraftingLogic.ts:4697-4780, 5040-5080`, `platform/thing/Vat.ts:160-240`
9. `packages/server/src/mud/lib/material/Compounding.ts`, `lib/bulk/Bulkable.ts:143-260`,
   `lib/cleanliness/WaterHardness.ts` (the payload merge shape)
10. `packages/content/trade-farming/src/lib/SelfHeating.ts`, `lib/fire/Combustible.ts`,
    `lib/wetness/Wet.ts`, `lib/metabolism/Metabolic.ts:1120-1220`,
    `lib/respiration/Respiration.ts:735-775`, `platform/idea/api/BulkableLogic.ts:745-780`
11. `packages/server/src/mud/platform/idea/species/Species.ts:400-560`,
    `packages/content/trade-forestry/src/thing/SapStandard.ts`,
    `packages/content/trade-fuel/content/trade/fuel/idea/fractionation/crude.yaml`
12. `packages/content/terminus/content/world/terminus/wharfside/ropewalk*`,
    `…/goods-yards/sugar-house/structure.yaml`, `…/estuary/estuary-mouth.yaml`,
    `packages/content/trade-potash/{pack.yaml,package.json}`
13. `packages/wire/tests/cordage.dirty.wire.test.ts`, `cordage.soak.dirty.wire.test.ts`,
    `docs/testing.md:55-130`, `docs/workflow.md` § No merge waits on the clock

---

## Drive record

**Result: 16/16 green** (run 6, 2026-11-01). **Files:** blocking `packages/wire/tests/paint.dirty.wire.test.ts`; soak
`packages/wire/tests/paint.soak.dirty.wire.test.ts` (steps 7 and 14 on the
real clock, for the soak lane after merge).

**Not driven in the blocking file, and why** (recorded in its header): 13
(ship from the quay — the Hesper starts at the bar; unit-proved), 16/17 (the
pine tap and the still — rows over shipped mechanisms; the blade tap
unit-proved), 18 (fumes need an open dish; B28), 20 (the panel's fade —
unit-proved in `Weathering.test.ts`), 21 (Tam's round), 22–24 (glue — unit-
proved in `Assembled.glue.test.ts`). 10 (limewash setting) is unit-proved
(`Faced.air.test.ts` carbonation).

**What the drive found** (six runs, each a fix and a commit):

1. The colorman's shop was PITCH DARK — the sky-light claim was dropped for
   `lint:light-sources` and no lamp replaced it. A lamp adornment.
2. `survey <building>` threw: the controller read `model.target` as the
   Stuff rather than `model.target.stuff`. Fixed.
3. The towpath's exit named `cottage` took the word from the building (an
   exit name is a candidate in the room's pool). The exit is `door`.
4. A mill's tangible output must compose `Crafted`: the pigment papers are a
   pack `Pigment` class (Crafted + Thermal + Stackable); the bristle and the
   handle are `Assembly`.
5. Milling flax needs a vessel to catch the oil — the counter stocks oil
   jars.
6. Rags bought one by one never stack; sold as a stack of six. A rag is
   DIPPED one at a time, so a heap is the oily rags lying in one place
   (`Rag.heaped` counts its container), not one stack.
7. The brush's bill named no part materials, so the bristles read "beech".
8. `dip` laid the generic paint row, not its binder, so a dipped rag had no
   drying oil (`GlazeTub.dipPlanFor` lays the binder and keeps the makeup —
   B14 applied to the bath).
9. `SelfHeating.reconcileHeating` stamped on its first read and returned
   before the ignition check — a heap set hot never caught until time
   passed. It checks on every read.
10. `paint` took the first coat-laying pot even when it held too little; it
    now asks each pot (the `dip` precedent).
11. A look at a pot did not say what paint was in it — `PaintPot`'s look
    line.
12. Staging, not code: the harness's `parcels:` grant keeps a town parcel a
    new character's group already holds, so the "sold" twin transfers the
    parcel by eval; eval jurisdictions widened to `/world/terminus`; the
    shop props its own paint pot, so the drive names `me:i:kettle`.
**Browser walk** (`e2e/tests/paint-walk.spec.ts`, Chromium against the real
client, 1 passed in 5.0 min, 2026-11-01): the lit shop and its card, `mill flax`,
`mill clay`, pour/put/stir into `me:i:kettle` (the card names *yellow ochre in
linseed oil*), `write PELL on board with ochre paint` and `read board`, the
glued brush on its card, `survey cottage` from the towpath (coat, fabric, 64 m²,
about 3 litres), `paint cottage` to its finish line, `maintain cottage`, the
survey inside, `dip rags`. Found nothing in the code; the walk's own lessons:
`mill ochre` is ambiguous with a pot of ochre paint in hand (a prompt), and
after `look <x>` the shell's focus prompt makes a bare exit name fail (`go
<exit>` works) — shipped shell behavior, not this build's.

13. Intermittent: two world boots wedged after the location graph projected
    (CPU idle); a retry with a longer boot budget booted the same code.
