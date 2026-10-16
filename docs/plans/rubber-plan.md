# Rubber — implementation plan

Executes [rubber-requirements](../requirements/rubber-requirements.md).
**Kind:** feature. **Leads from:** kernel — the construction model (what
is over and around a place), two material properties, the cure as a
function of composition × temperature × time, and four corrections to
shipped readers — with its first consumers shipping in the same build:
the `trade-rubber` capability pack, the rubber works and its stove house
in the Terminus goods yards, the Hill Quarry's sulfur band, and the
Drowned Substation as the proving ground.

The plan is in nine waves. W0–W3 are the kernel construction model and
its consequences (rain · light · sky view · wind · heat, solar gain,
heat between rooms) and are behaviour-preserving for every room not yet
placed in a building. W4 is materials and the cure. W5 is the four
corrections. W6 is supply. W7 is the pack, the works, the content pass
and the drive file. W8 is stretch, first to cut.

---

## Grounding

Every fact below was verified by opening the file this cycle
(2026-10-16, branch `reqs/rubber` at `91f763b05`). Paths are under
`packages/server/src/mud/` unless they start with `packages/`.

### Sky exposure — one bit, five questions

- `lib/biome/SkyExposed.ts` — `SkyExposedMixin`, a trait with no fields;
  `isSkyExposed(): true`. `platform/idea/SkyExposedBiome.ts` —
  `SkyExposedBiome extends SkyExposedMixin(Biome)`.
- `api/biome.ts:441` `BiomeApi.isSkyExposed(scope)` →
  `platform/idea/api/BiomeLogic.ts:710` `skyExposedWalk`: a containment
  walk outward (`stepOutward`, `CONTAINMENT_DEPTH_CAP`) to the first
  `Atmospheric` ancestor whose **own** `getBiome()` is non-null (it
  reads `_biomePath` only — `lib/biome/Atmospheric.ts:559`; no zone
  step), then `MixinApi.isSkyExposed(biome)`; `false` when nothing
  resolves. ⚠ So a room authoring no `_biomePath` reads *not sky-exposed*
  today, and an interior is simply a room the walk answers `false` for.
- Also in `BiomeLogic`: the weather-deviation gates at `:306` (pressure),
  `:615`/`:643` (`airFor`/`airSegmentsFor`), `:1071`/`:1105` (traces),
  `:1281` (`resolveQuantityFor`), `:1723` (`liveDeviation`);
  `outsideKFor` (`:977`) — the F1 nested-envelope seam, then the chain,
  then the climate when the chain fell to the root, else the weather
  folded iff `isSkyBiomePath(trace.sourcePath)` (`:1157`);
  `resolveEnvelopeTemperature` (`:1172`) with its per-scope
  `envelopeResolving` reentry set.
- **Every caller outside `BiomeLogic`** (grep, non-test):
  `lib/biome/Atmospheric.ts` `:834` (`addAtmosphereContent` — under the
  sky nothing accumulates), `:974` (`airChangesPerHour` → `Infinity`),
  `:1046` (`envelopeApplies`), `:1102` (`isThreshold(far)`, the
  documented attach point, docstring names
  `structureOf(this) !== structureOf(far)`); `lib/perception/AmbientLit.ts:336`
  (`isSkyLit()` falls through to the walk when `ambientSource` is null);
  `lib/husbandry/Soil.ts:514` (`_rainSkyExposed` stamped at the rain
  reconcile); `lib/ground/Floor.ts:398` (`isOnGrade()` default) and
  `:688` (snow lies only under the sky, re-checked every read, not
  memoised); `platform/idea/api/WeatherLogic.ts:905` (boundary fan-out:
  thermal restamp for sky rooms; `:941` notes the light dim follows
  `isSkyLit`), `:1420` (`runStormFanout`), `:1605`/`:1628`
  (`computeResolved` callers — `skyExposed` decides whether the procgen
  sky field or the biome baseline answers, and `precipitationHere`);
  `platform/idea/api/PerceptionLogic.ts:1256`/`:1280`
  (`horizonAtSea`/`horizonAshore`);
  `platform/idea/cmd/perception/SurveyController.ts:195`
  (`waysideSpaces`); `platform/idea/reading/WeatherReading.ts:232`
  (*snow lying: none* line); `packages/server/scripts/check-biome.ts:163`
  and `check-light-sources.ts:303-320` mirror the walk from rows.
- `WeatherLogic.wetOccupants` (`:1321`) wets every `Wet` **room
  content** by one segment's accrual — worn garments are slot occupants
  of the body, not room contents, so rain never reaches a garment today.
  `maintainPuddle` (`:1365`) fills the room's `Floor` surface pool.
- `WeatherLogic.computeResolved` (`:760`): a `_weatherPin` on a scope
  (`weeping-chamber.yaml`, four Localities) answers regardless of sky;
  with no pin an indoor scope reads the biome baseline and
  `precipitationHere: 'none'`.

### The envelope

- `lib/spatial/Enclosed.ts` — `EnclosureSpec { material?, thicknessM? }`
  (closed; `lint:envelope` clause (e)), `EnclosureDefaults`,
  `ResolvedEnclosure`, the `Enclosed` interface (implemented by
  `AtmosphericMixin`; the file explains why there is no `EnclosedMixin`
  — TS inference depth). Its own docstring: *"No `roofed`. Derivable,
  and already derived… which is what `BiomeApi.isSkyExposed` answers."*
- `lib/biome/Atmospheric.ts`: `enclosureDefaults()` (`:527`, universe
  default from `enclosure.defaultMaterial`/`defaultThicknessM`),
  `resolveEnclosure()` (`:1130`, cached in `_resolvedEnclosure`),
  `envelopeApplies()` (`:1042`: volume ∧ no authored `_temperature` ∧
  not sky-exposed), `openExteriorOpenings()` (`:1058`, obvious
  `open-only` exits whose far side `isThreshold`), `openingsByKind()`
  (`:990`, exterior vs interior for `airChangesPerHour`),
  `reconcileEnvelope()` (`:1182`: `T ← Decay.toward(T, outside + (P +
  drive)/U, Δt, C/U)`, segmented by the supply trajectory, breakpoints
  into `envelopeLog`), `envelopeExposedAreaM2(volume)` (`:1375`:
  `5·side²`, **five faces unconditionally** — docstring names the buried
  corridor and the subdividing-is-colder defects and says *"This method
  is the attach point"*), `envelopeCoefficients()` (`:1379`: `U = A /
  (t/k + R_films) + openingUPerM3·V·n`, `C = 1.2·1005·V +
  ρ·c·A·activeDepth`), `envelopeTemperatureSync()`/`Last()`
  (`:1492`/`:1516`), `envelopeOutsideK` (persistent runtime state,
  `:489`).
- Dials: `packages/content/platform/content/settings/envelope.yaml`
  (`enclosure.defaultMaterial` granite, `enclosure.defaultThicknessM`
  0.3, `envelope.surfaceResistanceM2KPerW` 0.17, `envelope.openingUPerM3`
  6, `envelope.activeDepthM` 0.01); keys at
  `lib/config/AppSettings.ts:1572-1593`.
- `lib/boundary/ExitableVessel.ts`: `enclosureDefaults()` (`:182`, the
  vessel's own material at `VESSEL_WALL_M`), `envelopeApplies()`
  (`:205`, **roofed by declaration**: volume ∧ no `_temperature`, no sky
  walk), `openExteriorOpenings()` (`:230`, shut seal ⇒ 0),
  `resetWeatherLocality()` on move (`:351`).
- Seven rows author `enclosure:`: hearthworks `smithy` (granite 0.45) and
  `woodshed`, general-store `cold-room` (pine 0.15), infirmary
  `blood-fridge` and `freezer-box`, apiculture `hive` and `thick-hive`.
- `lint:envelope` (`packages/server/scripts/check-envelope.ts`) clauses
  (a)–(e): authored `_temperature` ratchet list, enclosure material
  exists and conducts, the biome line, no indoor `_defaultTemperature`,
  closed spec keys.

### Structures and attachments

- `platform/idea/Structure.ts` — `DetailedMixin(VisibleMixin(Perceptible
  (Named(Singleton(Idea)))))`; fields `extent` (template-path prefix;
  `hasMember(path)` on a segment boundary), `entrance`, `landmark`,
  `heightM`; **no material, no storeys**; `canEvict` vetoes (*a structure
  stands while the zone that names it does*). `platform/idea/Ship.ts` —
  `Ship extends Structure` adds `deckHeightM`, the position and voyage.
- ⚠ The brief's "zones name structures (`structures:`)" is **stale**:
  the scan sweep retired it. Attachments are DERIVED in
  `platform/idea/LocationGraphRegistry.ts:437-440` — a row whose class
  is a Structure and authors `extent` is attached to that extent (kind
  `'structure'`; `expanse` → `'craft'`). `NavigationApi.structureAt(path)`
  (async, stands the attached structures up) / `structureAtNow(path)`
  (sync; `platform/idea/api/NavigationLogic.ts:306-316`,
  `innermostStructure`); `attachedNow` is `[]` before the first
  derivation. `lib/zone/LocationZone.ts:60-88` — `addLocation` kicks
  `standUpAttached` (a `StuffApi.singleton` per attached path, never
  awaited) and `lookOutFrom`. Nothing is booted.
- Three Structure rows exist: `packages/content/terminus/content/world/
  terminus/terminal/structure.yaml` (extent `/world/terminus/terminal`,
  entrance `…/location/arrival-gate`, landmark, 25 m — its rooms are
  `terminal/location/{arrival-gate, departure-gate-a|b|c, hall, office}`),
  `hesper/structure.yaml` (a `Ship`), `gannet-rock/structure.yaml`.
- `lib/stuff/Location.ts:185-205` — `noDefaultFloor`, `horizon`
  (authorable); `lib/location/CartesianLocation.ts:171-215` — `extent`
  override, else the zone's `cellSize`; volume and `getSizeScale` derive
  from it. `AtmosphericMixin._biomePath` is `authorable, ref:
  'identity:constituent'` (`Atmospheric.ts:404`).

### Light

- `lib/perception/AmbientLit.ts` — `ambientSource: 'sky'|'glow'|'none'|
  null`, `ambientOpening`, `_weatherDimFactor` (transient, stamped by the
  boundary fan-out), `isSkyLit()` (`:333`), `skyNoonFlux()` (`:350`: an
  authored `ambientIntensity` wins, else `light.sky.noonLux` (80) ×
  `getSizeScale()`).
- `platform/idea/modalities/VisionModality.ts` — `ownFlux` (`:407`;
  `:426` `isSkyLit() ? skyNoonFlux × skyFactor × weatherDim :
  ambientFlux × weatherDim`), `lightLegs` (`:339`: boundary conduits
  with `transmissivity` and optional `transmittanceColour`, exits at
  `EXIT_TAU`), `walkFluxAt` (`:541`). `CelestialApi.skyFactorNow()` is a
  per-game-minute memo over `skyIlluminanceFactor(profile, lat, t)`
  (`api/celestial.ts:452`), one sky for one world; `solarAltitudeDeg`
  (`:238`) exists.
- `platform/thing/Window.ts` — `baseTransmissivity`, directional
  overrides, `colorTint`, `glazeR/G/B`, `lightTransmittance(): Colour`.
  `lib/perception/Colour.ts` — `Colour.of(r,g,b)`, `UNDYED`, `stack`.
- `packages/content/trade-glass/src/lib/Tinted.ts:98-117` —
  Beer–Lambert **per channel** over the piece's `AlloyedMixin` iron and
  carbon fractions × `thicknessFactor()` (0.5 pane / 1.0 bottle), dials
  `glass.colour.*`. The glass material row
  (`base-library/…/material/glass/glass.yaml`) carries no optical field.
- ⚠ **The cafeteria atrium does not exist as a place.** The only rows
  containing *atrium* or *cafeteria* in the whole content tree are the
  two biome rows `base-library/…/biome/indoor/cafeteria.yaml` and
  `cafeteria-atrium.yaml` (the latter a `SkyExposedBiome`); **no
  location row references either**, and the University pack has no
  dining room (its rooms: Duncan Hall's lobby, corridor, dormroom,
  cistern, steps; the campus farm and field). See Risks & opens 1.
- The market awning is prose: `terminus/…/market/square.yaml:94` has a
  `bunting/canvas/awnings` detail and the fish stall's description says
  *under a striped awning*; no room is under an awning. The coach
  (`transport/content/system/transport/thing/coach.yaml`) authors
  `interiorVolume: 5`, `open: false`, no `_materialPath` comment-flagged.

### Supply & cure

- `packages/content/base-library/content/stuff/idea/material/organic/
  rubber.yaml` — density 1100, specificHeat 2000, k 0.16, hardness 5,
  toughness 20, `electricalConductivity: 1.0e-13`,
  `waterAbsorptionCapacity: 0.5`, `tags: [organic, elastomer,
  insulating, synthetic]`; nothing names it.
- `lib/material/Material.ts` `fieldMeta` — the Quantity fields
  (`density`, `thermalConductivity`, `specificHeat`, `hardness` MPa,
  `toughness` MJ/m³, `electricalConductivity` S/m,
  `waterAbsorptionCapacity` %, `meltingPoint`, `latentHeatOfFusion`,
  `castTemplate`, `ruinedByFreezing`, …), `tags`, `corrosiveTo`,
  `composition`. Units: `'%'` exists in `lib/quantity.ts`; **no `1/m`
  unit** today.
- `lib/material/Alloyed.ts` — `AlloyedMixin` per-instance fractions
  (`fractionOf`, `setFractionOf`, `getAlloying`/`setAlloying`).
- Materials that matter: leather toughness 10 / σ 1e-9 / wAC 15; wool
  4 / 1e-11 / 33; linen 3 / 1e-11 / 20; glass toughness 0.5 / wAC 0.1.
- No sulfur material. The Hill Quarry column
  (`rejection/content/world/terminus/rejection/idea/deposit/quarry-hill.yaml`,
  class `/system/ground/idea/Deposit`): bands `toZ` −1 drift, −2 clay,
  −6 granite, −9 limestone, −10 coal, −12 halite (wins bulk salt), −400
  granite; `waterTable: -12`. `packages/content/ground/src/idea/Deposit.ts:56-81`
  — `StratumBand { toZ, host, wins? }`, `wins` a thing row or (by the
  `/idea/material/` infix) a bulk material. The won-coal exemplar is
  `trade-quarrying/content/trade/quarrying/thing/coal.yaml` (a row with
  `_materialPath` and a mass). `dig` is the platform's
  (`platform/idea/cmd/ground/DigController.ts`).
- `platform/idea/species/Species.ts:432-540` — `TapSpec { key, yieldRow,
  perGameDay, behaviour, windowDays, window?, yieldShape?, … }`;
  `TapWindowSpec` kinds `always | event | photoperiod | biome | weather
  {daylightFrom, daylightTo, rising?, minK, maxK} | freeze-thaw`.
  `lib/husbandry/Producing.ts:353-392` — the `weather` kind reads the
  **host's own** `getTemperature()` when `MixinApi.isThermal(self)`
  (absent ⇒ open); `:437-452` the refusal words (`cold` → *it is too
  cold for anything to run*). `freeze-thaw` reads the AIR
  (`WeatherApi.dailyRangeAt`). The maple exemplar: species
  `trade-forestry/…/acer/saccharum.yaml` (`production: [{key: sap,
  yieldRow: /stuff/idea/material/food/maple-sap, perGameDay: 2,
  behaviour: accrue, windowDays: 4, yieldShape: volume, window:
  {kind: freeze-thaw}}]`), tree row `trade/forestry/thing/plant/
  maple-standard.yaml` (`class: /trade/forestry/thing/SapStandard` =
  `ProducingMixin(Plant)`, `spiles`, `profile`), standing stems in
  rejection's hanging wood `extends:` it with `growthStage: mature`,
  `mass: 290`. `platform/thing/Plant.ts:51` — `Plant` composes
  `ThermalMixin` (so a tree HAS a body temperature; a 290 kg stem's τ is
  hours).
- Crops: `platform/thing/Plant.ts` rows with `harvestTemplatePath`
  (read in `lib/husbandry/Growing.ts`); `platform/thing/Crop.ts:43`
  `Crop extends Provision`; `trade-farming/content/trade/farming/thing/
  plant/madder.yaml` → `crop/madder-root.yaml` (`_materialPath:
  /trade/farming/idea/material/madder`) is the root-crop exemplar.
- `lib/craft/Recipe.ts` — `inputSlots` (`kind: 'item'` slots: `category`
  tag, `count`, consumed; bulk slots `measureL`), `toolCapabilities`,
  `outputTemplate`, `outputMaterial`, `outputApplication`, `requiresHeatK`,
  `holdS`, `maxHeatK`, `massYield`, `difficulty`, `discipline`. No
  non-consumed slot flag.
- `platform/idea/cmd/device/FireController.ts` — `FIRE_MS = 60_000`
  (`:77`); `firingsFor` (`:198`) matches every catalogue recipe with
  `requiresHeatK > 0` whose slots are all `item` against the chamber's
  Tangibles by material tag; refuses `mixed-charge`, `not-lit`,
  `insufficient-heat` (`held < wanted`, `:162`); `runFiring` (`:303`)
  consumes `batches × count`, applies `massYield`, merges the consumed
  charge's `Alloyed` fractions mass-weighted onto an Alloyed output
  (`:330-362`), lands the output in the kiln. **It never reads `holdS`
  or `maxHeatK`.** `fire.yaml` arg `kiln` defaults to
  `reachable:[mixin.BurnerMixin]`.
- `holdS` readers (grep): `CraftingLogic.ts` (`donenessAtMint :1029`,
  the kill `:1203`, `:1657`), `ThermalDose.ts`, `Freshness.ts`,
  `Contaminable.ts`, `Texture.ts`. **Recipes authoring `holdS`**: only
  baking/cooking rows (`flatbread`, `lean-loaf`, `dog-loaf`,
  `black-pudding`, `hearty-stew`, `seared-cut`, `warmed-through`) — all
  craft-resolve (`make`/`cook`) recipes; **no `fire` recipe** (`glass-
  batch`, `glass-batch-amber`, `remelt-cullet`, lime, pots) authors it.
- `lib/thermal/ThermalDose.ts` — `rateAt(T) = 10^((T−Tref)/z)` above a
  floor, `integrate(fromK, ambientK, Δt, τ)` (Simpson over
  `Decay.toward`), `wantedDoseS(T, holdS)`, `bandFor`; dials
  `thermal.dose.*`; composed only on `platform/thing/Provision.ts:68`.
- `platform/thing/Oven.ts:28` — `Oven = ContainerMixin(PlacingMixin(
  Firebox))`; the brine hearth (`trade-quarrying/…/thing/brine-hearth.yaml`)
  is the exemplar `Oven` row (`burnTemperatureK: 450`, `bellowsMultiplier
  1`). `lib/fire/Burner.ts:614` — held K = `burnTemperatureK × (bellows
  ? bellowsMultiplier : 1)`. Space heating is `SpaceHeatingMixin`,
  composed by `platform/thing/Hearth.ts` and `Campfire.ts`; rows
  `generic-objects/…/stuff/thing/{stove, brazier, Hearth}.yaml`.
- `lib/craft/Epoch.ts` + `Tooled.getEpoch()`: the stamp has **no
  reader**. The requirements forbid a gate; none is added.
- `SmeltController.ferrousMaterialFor` (`trade-smelting/src/idea/cmd/
  smelting/SmeltController.ts:686`) — a code table from fraction to
  material; the shape the cure must NOT copy.
- Maturation: `MaturationProfile` rows under any root's `idea/maturation/`
  (`trade-forestry/…/idea/maturation/maple-sap.yaml`: `inputCategory`,
  `mechanism: evaporative`, `stallBelowK`, `happyK`, `damageAboveK`,
  `productMaterial`, …); mechanisms are a CLOSED five
  (`lib/maturation/MaturationProfile.ts:56-66`: microbial · chemical ·
  evaporative · enzymatic · one more) under `lint:closed-vocabularies`'s
  ceiling. A `Bulkable & Thermal` vessel's pool **solidifies** below its
  material's `meltingPoint` into the material's `castTemplate`
  (thermal.md § Phase change both ways; the climate build widened it to
  `Bulkable & Thermal` hosts).

### Demand

- `platform/idea/api/ElectricityLogic.ts` — `groundContactInsulated`
  (`:241`): foot parts' coverings via `body.coveringAt(part)`; insulated
  iff any covering's material σ ≤ `electricity.insulator.maxConductivity`
  (0.001); **dry conductivity, wetness ignored**. `isWet` (`:355`):
  immersed in a conducting pool ⇒ wets the BODY and returns true; else
  the body's wetness band. `pathResistance` (`:382`): per worn
  `Constructed` material, σ ≥ poolMin ⇒ ×skinFactor, σ ≤ insulatorMax ⇒
  `+ MaterialApi.contactResistance(mat)`. `MaterialLogic.contact
  ResistanceImpl` (`:878`): `clamp(geo/σ, 0, max)`, `geo` 0.01.
- The Drowned Substation: `world/substation/FloodedCell.ts` (a kernel
  world class; `onEntered` conducts from every energized content),
  rows `world-seed/content/world/substation/{flooded-cell, flooded-floor
  (concrete, surface pool salt-water 40 L), live-wire (120 V), stun-baton}`.
- `lib/slot/Attired.ts` — `coveringAt(part)` outside-in (`[0]` is
  outermost), `outermostAt`, `insulationAt` (clo × `(1 − looseness ×
  penalty)` via `fitOn`), `bodyInsulation` (Meeh surface shares),
  `windproofing`. `lib/wetness/Wet.ts` — `wet(delta)`, `getWetness()`,
  `getWetnessBand()`; composed at the matter baselines (Thing, Vessel,
  Agent) so a garment is `Wet`. `lib/slot/Wearable.ts` — `getClo()`
  floods the loft by wetness × `min(1, wAC/ABSORPTION_REFERENCE(40))`;
  `fitOn(wearer): FitReading { cut, distance, looseness, tightness }`,
  `cutToBodyPlan/Stature/Girth`; readers `Attired.insulationAt:633`,
  `LoadBearing.ts:287` (tightness surcharge), `ConditionLogic.ts:1252`
  (seam wear), the wear verb's `fit-impossible` refusal.
- `lib/pump/Pumping.ts:413-435` — `completePump` calls
  `wearPacking(dial(pump.wearPerStroke, 0.06))`; `PackingCondition`
  bands (`:108`: sound · worn (<0.55) · leaking · perished · gone);
  material-blind. `trade-tanning/content/trade/tanning/thing/packing.yaml`
  (a `Tool`, `capabilities: [packing]`, leather, 0.3 kg) + its recipe.
- Corrosion: `base-library/…/material/bulk/vitriol.yaml:27`
  `corrosiveTo: [metal, organic, tissue, leather, textile]`; quicklime
  spares metal. `ConditionLogic.ts:143` folds the corrosion channel only
  through `Constructed` occupants whose construction `isCovering()`;
  `:1235` a corroded layer wears `response.corrosion.wearPerContact`.
  Rubber's `organic` tag puts it in vitriol's set.
- Garments: `platform/thing/equipment/{Garment, AssembledGarment,
  DisguiseGarment}.ts`; the boots row `generic-objects/…/stuff/thing/
  armor/leather-boots.yaml` is an `AssembledGarment` (`slotClaims` feet,
  `constructionForm: hide`, `bill` of uppers welted to soles). Aprons
  and coats: `trade-tailoring/content/trade/tailoring/thing/{apron,
  coat}.yaml`. The general store's counter
  (`terminus/…/general-store/counter.yaml:30-58`) stocks
  `/stuff/thing/armor/leather-boots` at par 2. The gas bladder
  (`trade-fuel/…/thing/gas-bladder.yaml`) is a `Flask`, jute,
  `closure: sealed`.
- The goods yards: `terminus/…/goods-yards/{yard.yaml, oilworks.yaml
  (a CartesianZone, cellSize 3), oilworks/{location/floor, agent/hand,
  idea/outfit, thing/stock}}`. The terminus pack already depends on
  twenty-seven trade packs (its `package.json`).

### Pack conventions and the drive harness

- A capability pack: `pack.yaml` (`id`, `root`, `requires.title`,
  `boot`, `maintainers`; closed key set), `package.json` whose
  `@saxonberg/content-*` lines ARE `dependsOn`, `src/` in the kernel
  taxonomy (`thing/`, `idea/cmd/<cat>/`, `idea/reading/`, `lib/`,
  `__tests__/`), `content/<root>/…`, `content/recipes/`,
  `content/settings/`. Exemplar: `packages/content/trade-glass/`.
- The lint roster is derived (`lint:family`); gates that will see this
  build: `lint:envelope`, `lint:biome`, `lint:light-sources`,
  `lint:closed-vocabularies`, `lint:unconsumed-seams`, `lint:reachability`
  (arm R: every thing row reached; arm A: every view afforded),
  `lint:capabilities`, `lint:instanceable`, `lint:mixin-names`,
  `lint:field-meta`, `lint:imports`, `lint:module-scope`,
  `lint:object-verbs`, `lint:lib-statics` (a ratchet), `lint:mass`,
  `lint:perishable`, `lint:test-bootstrap`, `lint:drive-scripts`.
- `packages/wire/tests/*.dirty.wire.test.ts` — the drive shape
  (`assembly.dirty.wire.test.ts`: `declareFile({file, packs,
  dirtyReason})`, `Session`, `expectOk/expectNote/expectRefused`,
  `query()`, `prose()`, `advanceWorldClock('1 day')` through
  `/auth/test-clock`, `bootOwnedWorld`). `WIRE_PORT=2014` in this
  worktree. The clock scale is 12 (one real minute = twelve game
  minutes); a wire run cannot wait out days except by `advanceWorldClock`.
  **There is no verb that sets the weather**; the climate drive reads
  `analyze weather` and compares wet/dry after clock jumps.

---

## Plan-level decisions

### The construction model (D1–D7)

**D1 — Vocabulary: `enclosure:` stays the WALLS; `roof:` is its new
sibling; `none` is a legal value for either.** `Enclosed.ts` already
argued *enclosure* over *walls* (a fence is not a wall) and seven rows
author it; renaming buys nothing. Both specs are the same closed shape
`{ material?, thicknessM? }`; the literal `none` means *no such part*
(an awning has `enclosure: none`; a roofless yard-within-a-building has
`roof: none`). `lint:envelope` clause (e) grows to hold `roof` shut the
same way. ⚠ `Enclosed.ts`'s *"No `roofed`"* paragraph is rewritten: the
roof is now a declared part because the sky bit is leaving the biome.

**D2 — Hosts of the construction: the `Structure` owns it; a room
overrides; a vessel is its own material all round.** `Structure` gains
`enclosure`, `roof` and `storeys` (host placement below). A room's own
`enclosure:`/`roof:` (on `AtmosphericMixin`, where `enclosure` already
lives) wins over the structure's, which wins over the class hook
`enclosureDefaults()` (which keeps answering the universe default — and
`roofDefaults()` answers the walls' material, so an unhoused interior
reproduces today's *one material, five faces*). `ExitableVessel`
overrides both to its own material at `VESSEL_WALL_M` when it declares
an `interiorVolume`, and to `none` when it does not (an open boat).

**D3 — Storeys are a small tree on the structure; membership is the
longest storey prefix; no `storeys` means one implicit storey.**

```yaml
storeys:
  - { key: ground,  extent: /world/terminus/goods-yards/rubber-works/location/ground }
  - { key: works,   extent: …/location/ground/works }           # longest prefix wins
  - { key: wing,    extent: …/location/ground/wing }
  - { key: loft,    extent: …/location/loft,    on: works }
  - { key: tower,   extent: …/location/tower,   on: wing }
  - { key: terrace, extent: …/location/terrace, on: loft, open: true }
```

A storey with no `on` stands on the ground. `open: true` is a storey
with no roof and no walls of its own (a terrace, a flat deck, a
balcony); its floor is the roof of the storey it stands on. An author
carves prefixes as finely as the stacking needs — the loft stands on the
works room, not on the whole ground floor, so the works room is its own
storey. `lint:envelope` gains clause (f): every `on` names a key, no
cycle, every storey extent lies inside the structure's extent, and
`open` storeys carry no `enclosure`/`roof` of their own.

**D4 — One rule decides every face, computed once per room into an
`Exposure` value object, synchronously.** `lib/spatial/Exposure.ts` (a
named value object, the module category `Light`/`Quantity` use) is the
construction answer:

```ts
interface Face { material: ResolvedEnclosure | null; areaM2: number; exterior: boolean; neighbour?: Stuff }
interface Exposure {
  housed: boolean;            // in a Structure (or a vessel's own hull)
  top: 'open' | 'roof' | 'ceiling';
  roof: Face | null;          // the top face when 'roof'
  walls: Face[];              // up to four; interior where a same-storey
                              // member of this building stands across an exit
  wallsNone: boolean;         // `enclosure: none` — wind enters
  onGrade: boolean;           // root storey of the building (no `on`)
  floorIsRoofOf: Structure | null;  // an open storey's floor
  rainReaches(): boolean;     // top === 'open'
  skyLightFraction(): number; // D5 — 1 when open, 0 when ceiling
  skyVisible(): boolean;      // skyLightFraction() > 0
  windEnters(): boolean;      // wallsNone || top === 'open'
  isOutside(): boolean;       // !housed && legacy sky walk true, or open on top and no walls
  exteriorAreaM2(): number;   // Σ exterior face areas (replaces 5·side²)
  interiorFaces(): Face[];    // the room-to-room couplings (D7)
}
```

The face rule, exactly as the requirements state it: a face is exterior
unless the space across it is an enclosed space of the same building.
Concretely, for a room `R` in structure `S` at storey `k`:

- **top** — `ceiling` iff some non-open storey `j` has `on: k`; else
  `roof` unless `R`'s resolved roof is `none`, in which case `open`. An
  open storey's own top is always `open` and it has no walls.
- **walls** — four faces of the cube cell (`side = ∛V`); a face is
  interior for each distinct same-storey member of `S` reachable by an
  obvious exit (capped at four); the rest exterior. ⚠ A stated
  abstraction: the engine has no room geometry, so *which wall is
  shared* is answered by *who is next door*. A stair or ladder to
  another storey is an interior face too (it couples heat, D7) but does
  not consume a wall.
- **floor** — never a loss face (the ground, or the room below), as today.
- **a vessel** — `housed` by its own declaration: roof and four walls of
  its own material when it declares an interior; open when it does not.
- **not in any structure** — `housed: false`, and the five answers are
  **today's**: `BiomeApi.isSkyExposed` (the legacy walk) decides
  outside vs interior; an interior gets five exterior faces of its
  resolved enclosure (`roofDefaults()` = the walls' material). This is
  the counted exception of D14.

The method is `AtmosphericMixin.exposure(): Exposure`, cached in a
transient `_exposure` keyed by `(structure stuffId | null, storey key)`
and recomputed whenever `NavigationApi.structureAtNow(path)` answers a
different structure than the cache was built against — the Floor snow
precedent (*re-runs each read until the place answers*), because a
structure stands up asynchronously after its room (`LocationZone.
addLocation` kicks and does not await) and a memo taken before it
stands would say *unhoused* forever. Also invalidated by
`restoreFromTemplate` and by `resolveEnclosure`'s own cache reset. Cost
on the hot path: one map lookup over the path's ancestors plus, on a
miss, one pass over the room's obvious exits.

**D5 — Light through matter by Beer–Lambert: `Material.lightAbsorption`
in 1/m; absent means opaque.** A new `Quantity<'1/m'>` unit (the
catalog in `lib/quantity.ts` gains it) and a `Material` field with
marshaller; `getLightAbsorption(): Quantity<'1/m'> | null`. A face of
thickness `t` passes `e^(−α·t)`; a material authoring nothing passes 0.
Rows that author it this build: `glass/glass.yaml` (α ≈ 8/m: 4 mm clear
glass passes 0.97), `bulk/water` (≈ 0.5/m), the ice cast's material
(≈ 2/m), `organic/horn` if it exists (≈ 200/m), and nothing else — every
opaque row is opaque by omission, which is the honest default.
`Exposure.skyLightFraction()` = `min(1, T_top + w_side · Σ T_wall_i)`
for exterior faces, `w_side = light.solar.sideWeight` (0.25): an opaque-
walled glass-roofed hall is lit by its roof; a glass-walled lean-to
under slate by its walls. **Reconciled with `Tinted`**: `Tinted` is the
COLOUR term (iron and carbon per channel, dimensionless thickness
factor, on a piece of glass); `lightAbsorption` is the grey base term on
the material row. They multiply where both exist (a glazed `Window`
already multiplies the pane's colour into the walk); a construction
face has no pane object (glass-slate), so it uses the grey term alone,
and `glass.yaml`'s α is chosen so a clear pane's grey transmittance
matches what `Tinted` reads as *clear*. Nothing in `Tinted.ts` changes.

**D6 — Solar gain is a heat term on the envelope, derived from the sky
the light walk already reads.** `P_solar = I_noon · skyFactor(t) ·
weatherDim · Σ_exterior T_i · A_i · w_i`, with `I_noon =
light.solar.noonIrradianceWm2` (a dial; 700 — a clear temperate noon on
a horizontal surface, ⚠ the one calibration constant, and it is a
setting not a plan decision), `skyFactor(t)` the pure-geometry
`CelestialApi.skyIlluminanceFactor` at the realm's profile and latitude
(sync), `weatherDim` the scope's cached dim factor, `w_top = 1`,
`w_wall = light.solar.sideWeight`. Folded into `reconcileEnvelope`'s
`heatW` **per segment**: a gap is split into at most
`envelope.solarSegmentsMax` (48) equal segments, each no longer than a
game hour, with the sky factor sampled at the segment's midpoint; a room
with no transmitting exterior face (every opaque building) skips the
split entirely and integrates exactly as today. ⚠ The lux→W/m²
conversion is NOT used: `noonLux` is a MUD-scale number (80), not a
photometric one (light.md § Calibration), so the irradiance is its own
dial and the two share only the sky factor and the dim.

**D7 — Heat between rooms of one building: one-hop coupling through
interior faces, each neighbour read as a constant over the gap.** For
each `Face` in `exposure().interiorFaces()`, `U_i = A_i / (t_i/k_i +
R_films)` through the partition (the room's own resolved walls — a
party wall is the building's walls; the structure's `partition:` is
deliberately NOT a third spec, see Deferred seams) and `T_i =
neighbour.envelopeTemperatureLast()`. The steady state becomes
`(U_ext·T_out + Σ U_i·T_i + P) / (U_ext + Σ U_i)` and `τ = C / (U_ext +
Σ U_i)`; a neighbour whose `Last` is `null` (never resolved) contributes
no term (adiabatic, not exterior). **Bounded and recursion-free:** the
neighbour's `Last` never integrates; the async
`resolveEnvelopeTemperature` additionally resolves `envelopeOutsideK`
for each interior neighbour that has none (one hop, never awaited
recursively), and calls `neighbour.reconcileEnvelope()` once so the
value read is current to this read (the neighbour's own reconcile reads
*this* room's `Last`, and its `_envelopeReconciling` guard holds). A
neighbour not resident is stood up by the obvious-exit resolution that
already loads a destination on use; a neighbour that fails to resolve is
skipped (the five `getObviousNeighbours` guards). What it costs: a read
in an `n`-room building is `O(n)` cached reads and one neighbour
integration per face; what it buys: a warm kitchen warms the room above
it through the stair, and an interior partition loses nothing to the
weather because it is no longer an exterior face (D4), which is the
requirement's second clause with no extra code.

### Materials and the cure (D8–D12)

**D8 — `fire` honours a hold.** `fire.yaml` gains an optional `for
<duration>` arg (`type: string`, `prepositions: [for]`, parsed by the
shipped duration grammar the clock verbs use); the firing's game-time
hold is the arg, else the recipe's `holdS` when `> 0`, else today's
`FIRE_MS` worth of game time. The real engagement stays `FIRE_MS`
unless the hold is longer, in which case the engagement is the hold
divided by the clock scale (the clock ceiling applies: a two-game-hour
cure is ten real minutes; the drive uses `advanceWorldClock` across it
— see D15). **Audit:** no shipped `fire` recipe authors `holdS`, so every
shipped firing is byte-identical; the cooking recipes that author it
run through craft-resolve and are untouched.

**D9 — The cure is DATA on the feedstock material: `Material.crosslinking`,
a `CrosslinkSpec`, evaluated by a value object, never a controller
table.** `lib/material/Crosslinking.ts` (named value object):

```yaml
# on /stuff/idea/material/organic/raw-rubber
crosslinking:
  agent: sulfur            # a material TAG the charge's other inputs carry
  referenceK: 418          # 145 °C — the rate is 1 here
  zK: 12                   # a decade of rate per 12 K (empirical, a setting-free row fact)
  fullDoseS: 1800          # dose-seconds at reference for a full cure at the optimum
  agentOptimum: 0.03       # mass fraction of agent that cures best
  agentOver: 0.20          # at or above, a full cure is the over-range material
  scorchAboveK: 455
  products:
    under: /stuff/idea/material/organic/raw-rubber      # stays what it was, now weeping
    cured: /stuff/idea/material/organic/rubber
    over:  /stuff/idea/material/organic/ebonite
    scorched: /stuff/idea/material/organic/rubber-scorched
```

`Crosslinking.outcome({ agentFraction, heldK, holdS })` returns
`{ material, grade, degree }`: `dose = holdS · 10^((heldK − ref)/z)`,
`degree = min(1, dose/fullDoseS) · min(1, agentFraction/agentOptimum)`;
`degree < 0.6` ⇒ `under`; else `agentFraction ≥ agentOver` ⇒ `over`;
else `heldK > scorchAboveK` ⇒ `scorched`; else `cured`, graded by
distance from `(degree = 1, agentFraction = agentOptimum)` through the
shipped `Grade` band ladder. The agent fraction is **the consumed
charge's agent-tagged mass over its total consumed mass** — the same
mass-weighting `runFiring` already does for alloying, so a player who
weighs sulfur against rubber gets the fraction they weighed. The
ebonite over-range, the under-cure and the scorch each come out as a
**different material row** (lens 2: an author names, prices and
describes each), and the product says so through its material's
`appearance` and the thing's `look`. ⚠ A fourth row,
`rubber-scorched` (`extends: rubber`, worse hardness/toughness, tag
`scorched`, appearance *blistered and brittle-skinned*), is how
*scorched, and it says so* becomes a fact a player can read without a
flag on `CraftedMixin` (which would hang a scorch gauge on every crafted
thing — the *Freshness off every Thing* shape). The requirements count
three materials on the curve; this is a fourth row, not a fourth
chemistry — flagged in Risks & opens 3. `FireController.runFiring`
gains one branch: if any consumed input's material carries a
`crosslinking` spec, the outputs' material is set to the outcome
(`setMaterial`) and their grade to the outcome's — fifteen lines, no
table, and the glass and lime firings never enter it. A test in
`lib/material/__tests__/Crosslinking.test.ts` prints the curve.

**D10 — The mould decides the shape: a recipe slot that is matched and
not consumed.** `RecipeInputSlot` gains `consumed?: boolean` (default
`true`; a Document field, additive, round-trip-tested). `firingsFor`
matches it like any item slot; `runFiring` skips it when consuming.
Five recipe rows in `trade-rubber/content/recipes/` — `vulcanize-boots`,
`-gloves`, `-sheet`, `-ring`, `-tube` — each `{raw rubber (category
elastomer-raw, count 1), sulfur (category sulfur, count 1), mould
(category boot-mould …, consumed: false)}`, `requiresHeatK: 400`,
`holdS: 1800`, `maxHeatK: 455`, `outputTemplate` the shape. The moulds
are `Tool` rows carrying a material tag per shape (cast iron, a mould
material row tag `boot-mould` etc. — ⚠ tags are on MATERIALS; so each
mould row names a small `/trade/rubber/idea/material/mould-<shape>`
iron-`extends:` material carrying the tag, the way the quarry's `wins`
rows name materials). Lens 2: a sixth product is a mould row and a
recipe row. Craft-resolve (`make`) is untouched: `consumed: false` is
honoured there too (it already treats tools as reachability, so a
non-consumed slot in a `make` recipe simply isn't consumed).

**D11 — Elasticity is a `Material` property: `elasticity`, a
`Quantity<'%'>` — the strain it springs back from.** Rubber 500, raw
rubber 300 (and it creeps — prose), ebonite 2, leather 10, knitted wool
30 (the construction's loft adds to a garment's stretch in D16),
linen 3, glass 0.1, iron 0.2; unauthored reads 0 (rigid), which is
today's behaviour everywhere. Readers: the cure (the product material's
own row carries its elasticity — nothing per instance), the pump
packing's wear (D12.3), and the fit stretch term (D16). ⚠
`lint:unconsumed-seams` counts an unread field: every reader lands in
the same wave as the field or the next.

**D12 — The four corrections, each on the host that already answers
the question.**

1. *Wet conducts.* `MaterialApi.contactResistance(material, wet?)` gains
   an optional `{ saturation, fluidSigma }` and `MaterialLogic.
   contactResistanceImpl` computes `σ_eff = σ_mat + saturation ·
   permeability(material) · fluidSigma`, where `permeability = 0` when
   `waterAbsorptionCapacity ≤ wetness.impermeableBelowPct` (2 — rubber
   0.5, glass 0.1, metals 0) else `min(1, wAC / 40)` (Wearable's
   `ABSORPTION_REFERENCE`). `ElectricityLogic.groundContactInsulated`
   and `pathResistance` pass each worn layer's own `getWetness()` and
   the pool's material conductivity when immersed (else fresh water's
   0.01 S/m). `ElectricityLogic.isWet`, on immersion, also wets the
   **foot coverings** (`body.coveringAt(part)` for the foot parts) so
   boots wading brine soak as the body does. Leather (wAC 15 ⇒
   permeability 0.375) soaked in salt water (≈ 5 S/m) reads ≈ 1.9 S/m —
   a conductor; rubber stays 1e-13.
2. *The outermost layer sheds rain.* `Attired.exposeToRain(delta)` (a
   method on the wearer — verbs on objects): for each body part by
   surface share, the outermost covering takes `delta` (it is `Wet`), and
   the body takes `delta · share · passThrough`, `passThrough =
   permeability(outer material) · saturation(outer after)`; a bare part
   passes 1. `WeatherLogic.wetOccupants` calls `exposeToRain` for an
   `Attired` occupant and `wet` for anything else. Wool (0.825 × its
   saturation) soaks through as it saturates; rubberized cloth
   (permeability 0) passes nothing; oilskin (linseed-oiled linen row, if
   authored, low wAC) is honest for free.
3. *Wear reads the material.* `Pumping.wearPacking(amount)` multiplies by
   `wearFactor(material) = (pump.referenceToughness / toughness) · (1 −
   min(0.8, elasticity/500 · pump.elasticityWearRelief))`, reference
   toughness = leather's 10, relief dial 0.5: leather ×1.0, rubber
   (toughness 20, elasticity 500) ×0.25. The rubber packing row
   (`/trade/rubber/thing/packing`, a `Tool` with `capabilities:
   [packing]`, the tanning row's twin) outlasts leather four to one on
   the same pump — AC 10 by arithmetic, printed by a test.
4. *Rubber and ebonite resist acid.* Rubber's row drops the `organic`
   tag (`[elastomer, insulating, synthetic, polymer]`); ebonite,
   raw rubber and rubber-scorched are tagged the same way; vitriol's and
   quicklime's `corrosiveTo` lists are untouched. ⚠ The build greps every
   reader of the `organic` tag (`Combustible`, spoilage, `lint:perishable`)
   before retagging and records what each does with it — a retag is a
   data change with readers.

### Supply (D13)

**D13.1 — Hevea and the latex tap.** `trade-rubber` ships the species
row `/stuff/idea/species/plantae/tracheophyta/magnoliopsida/malpighiales/
euphorbiaceae/hevea/brasiliensis.yaml` with `production: [{ key: latex,
yieldRow: /stuff/idea/material/bulk/latex, perGameDay: 0.3, behaviour:
accrue, windowDays: 2, yieldShape: volume, window: { kind: weather,
daylightFrom: 0, daylightTo: 1, minK: 291, maxK: 309 } }]` — a
whole-year daylength band (wrapping is legal) and the temperature as
the whole season, which is what a stove house is. The tree row
`/trade/rubber/thing/plant/hevea-standard.yaml` names `class:
/trade/forestry/thing/SapStandard` (`trade-rubber` depends on
`trade-forestry`; the `tap` affordance is that class's static, so the
verb reaches a Hevea with no rubber code). Three mature stems
(`extends:` the standard, `growthStage: mature`) are `props:` of the
stove house, the hanging-wood maples' shape. **⚠ The `weather` window
reads the AIR at the host's place, not the host's body** — a 290 kg
stem's own temperature lags the house by hours, and taps.md already
moved `freeze-thaw` to the air for the same reason (*a tree's xylem
follows the air*). `Producing.ts:383-390` changes to read the host's air
scope (`airScopeOf` → `envelopeTemperatureLast()` when an envelope
applies, else the sync chain) and falls back to the body only when no
air answers. Birch outdoors reads the same number either way after its
τ; a test asserts the birch's shipped season is unchanged on the
equinox.

**D13.2 — Latex sets into raw rubber by the shipped phase engine.** A
`MaturationProfile` row `/trade/rubber/idea/maturation/latex.yaml`
(`inputCategory: latex`, `mechanism: chemical`, `ratePerDay` so a cup
turns in about a game day at room temperature, `stallBelowK: 278`,
`productMaterial: /stuff/idea/material/organic/raw-rubber-coagulum`), and
the coagulum material authors `meltingPoint: 320`, a small
`latentHeatOfFusion`, and `castTemplate: /trade/rubber/thing/raw-rubber`
— so the vessel's pool, now a liquid below its own melting point,
plateaus and **casts to a lump** exactly as a jug of water in a winter
street casts to ice (thermal.md § Phase change both ways; `Bulkable &
Thermal` hosts since the climate build). No new mechanism; two rows.
The lump (`/trade/rubber/thing/raw-rubber`, class `/platform/thing/Thing`,
material raw-rubber, tag `elastomer-raw`) is `Thermal` like every
`Thing`, so `feel` gives its band and its description reads *tacky when
warm, stiff when cold*. ⚠ `MATURATION_MECHANISMS` is a closed five under
`lint:closed-vocabularies`; `chemical` is the honest word (acid
coagulation) and no sixth is added.

**D13.3 — Russian dandelion.** Rows in `trade-farming` (its title extent;
Placement says *a farming crop row*): species
`/stuff/idea/species/plantae/…/asteraceae/taraxacum/kok-saghyz.yaml`,
plant `/trade/farming/thing/plant/kok-saghyz.yaml` (`harvestTemplatePath:
/trade/farming/thing/crop/dandelion-root`; `daysToStage.mature` sized so
roots are dug in their first autumn), seed, and the crop row (material
`/trade/farming/idea/material/kok-saghyz-root`, tags `[rubber-root,
organic]`). Roots to raw rubber by two shipped verbs and two recipe rows
in `trade-rubber/content/recipes/`: `root-pulp` (`mill`, the millstone
capability, like `bone-meal`: item slot `rubber-root` → bulk pulp into a
sack) and `raw-rubber-from-pulp` (`make`, craft-resolve: the pulp item
slot + a `water` bulk slot of 5 L → the raw-rubber lump; prose *the
rubber floats off and is skimmed*). ⚠ The requirements say *milled and
washed*; `wash` is the cleaning verb (`WashController`: dregs, grime,
dye) and is the wrong act, so the washing is the `make` recipe. Flagged
in Risks & opens 4.

**D13.4 — Sulfur is caprock.** `base-library` gains
`/stuff/idea/material/mineral/sulfur.yaml` (tags `[sulfur, mineral]`,
density 2070, meltingPoint 388, k 0.2, yellow); `trade-quarrying` gains
the won row `/trade/quarrying/thing/sulfur.yaml` (the coal row's shape,
mass 2); the Hill Quarry column inserts `{ toZ: -10.4, host:
/stuff/idea/material/mineral/sulfur, wins: /trade/quarrying/thing/sulfur }`
between coal (−10) and halite (now −10.4 … −12). `dig` wins it with no
code. The water table stays at −12.

### The pack, the works, the census and the drive (D14–D15)

**D14 — `trade-rubber` at `/trade/rubber`; the works is Terminus
content; interiors in no building are a counted, falling number.**

- `packages/content/trade-rubber/`: `pack.yaml` (`root: /trade/rubber`,
  `requires.title: [{ extent: /trade/rubber, holder: { organization:
  /compact/trade } }]` — the glass precedent, a placeless trade);
  `package.json` depends on `platform`, `base-library`,
  `generic-objects`, `trade-forestry` (the `SapStandard` class),
  `trade-farming` (the crop), `trade-quarrying` (the sulfur row),
  `trade-tanning` (the packing recipe's shape is mirrored, not
  imported — no dependency needed; drop if nothing imports),
  `trade-tailoring` (the apron/coat rows the rubberized versions
  `extends:`). `src/` holds **nothing** unless a wave needs a class: the
  moulds are `Tool` rows, the oven an `Oven` row, the goods `Garment`/
  `AssembledGarment` rows, the lump a `Thing` row. If the build finds it
  needs a class, it is `src/thing/<Name>.ts` and nothing else.
- Materials are commons rows in `base-library`: `organic/latex`
  (bulk, tag `latex`), `organic/raw-rubber-coagulum`, `organic/raw-rubber`,
  `organic/ebonite`, `organic/rubber-scorched`, `mineral/sulfur`;
  `organic/rubber.yaml` gains `elasticity` and `crosslinking`
  stays on raw-rubber.
- The works and stove house: `packages/content/terminus/content/world/
  terminus/goods-yards/rubber-works/` — `structure.yaml`
  (`/platform/idea/Structure`, `extent: …/rubber-works`, `enclosure:
  brick 0.23`, `roof: slate 0.01`, the storeys of D3, `entrance: the
  works floor`), `rubber-works.yaml` (a `CartesianZone` beside the
  oilworks', cellSize 3), rooms `location/ground/works/floor.yaml` (the
  oven, moulds, a `stove`), `location/ground/stove-house.yaml` (room
  override `roof: { material: glass, thicknessM: 0.004 }` and `enclosure:
  { material: glass, thicknessM: 0.004 }` — a glasshouse is glass all
  round on a brick dwarf wall, and the override is the room's; a
  `/stuff/thing/stove` prop; three Hevea stems; a door exit to the yard
  that is the vent), `location/ground/wing/store.yaml`, `location/loft/
  loft.yaml` (ladder exit from the works floor), `location/tower/
  tower.yaml`, `location/terrace/terrace.yaml` (stair from the loft).
  The business (`idea/outfit.yaml`) and a works hand are the oilworks'
  shape and are **optional** — nothing in the drive needs staff.
- The content pass places the drive's other buildings: the **terminal
  hall** gets a room override `roof: glass` (a station train shed —
  period-honest, and the terminal is already a Structure) and the
  terminal structure gains `enclosure: brick`, `roof: slate` and one
  implicit storey; the **market awning** is a new one-room Structure
  `market/awning` (`enclosure: none`, `roof: { material: canvas,
  thicknessM: 0.002 }`) with a room `market/location/under-the-awning`
  off the square; the **coach** authors `_materialPath` (ash) so its
  envelope and its rain answer name a real material. The two orphan
  cafeteria biome rows are **deleted** (Risks & opens 1).
- `lint:unhoused` (`packages/server/scripts/check-unhoused.ts`, picked up
  by the derived roster): counts every Location row the legacy rule
  reads as an interior (its `_biomePath` resolves to no
  `SkyExposedBiome`, or it authors none) that lies under no Structure
  row's `extent`, excluding `Offstage`/lounge rows and rows that author
  `_temperature` (a cellar authors its air and has no weather question);
  **the count at W0 is the ceiling**, held in the script as
  `UNHOUSED_CEILING` with the list of paths, failing when a listed path
  is no longer unhoused (pay the debt, delete the line) and when the
  count rises. Today's figure is computed by the script itself at W0 —
  roughly 170 of the 263 location rows (85 author a sky biome).
- `SkyExposedBiome` and `SkyExposedMixin` **stay** as the legacy
  discriminator for the counted rows and are retired at ceiling zero —
  the biome-normalization slate carries it (Deferred seams). ⚠ This is
  a sequencing fact, not a scope change: the requirements' *"the biome
  stops deciding the sky"* is true for every housed room and every
  outdoor room from W1, and *"keeps exactly today's behaviour"* for an
  unhoused interior is only possible if something still says it is one.

**D15 — The drive is a wire file, born in W7, and it drives time and
weather with what exists.** `packages/wire/tests/rubber.dirty.wire.test.ts`
(dirty: it buys out stock, clones into the works, moves the clock by
days). Rain: there is no weather verb; the drive advances the clock in
weather-segment steps (`advanceWorldClock('6 hours')`, at most 40 steps)
until `analyze weather` at the yard reports rain, then runs steps 1–3,
5 and 19 in that window; a run that finds no rain in ten game days
fails loudly rather than skipping (⚠ *a checkpoint owns its position*).
Sun: steps 7 and 10 advance to a clear noon by the same loop; step 8
advances to the hour before dawn. The cure (steps 14–17) uses `fire …
for 30 minutes`/`for 2 hours` and `advanceWorldClock` across the hold.
Coagulation (step 11) advances one game day. Each step asserts a STATE
read back (`query`, a reading's figure, a wetness band, a material
name), never only *not refused*.

### Stretch (D16, first to cut)

**D16 — Stretch is a term on `fitOn`, read from the material's
`elasticity` and the construction form's loft; no new flag.**
`Wearable.fitOn` computes an allowance `stretch = elasticity/100 · (1 +
loft)` (a dimensionless fraction of the garment's girth) and subtracts
`min(tightness, stretch)` from `tightness`; `looseness` is taken up by
the same allowance. The allowance is the garment's **material** (a
knitted wool jumper stretches; a linen shirt does not) and its form's
`loft`; an *elastic-waisted* stock garment is a row whose waistband
detail names rubber (`setMaterial(rubber, 'waist')` — the detail-material
override `Tangible` already has), and `fitOn` reads the `waist` detail's
material when one is present, else the bulk material. Cut this wave and
`elasticity` keeps its other two readers.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `enclosure` (exists), **`roof`**, **`storeys`** fields | `platform/idea/Structure` | every Structure — a building, the Hesper, Gannet Rock's light — has walls and a roof and storeys. True: a ship has a hull and decks (its `storeys` are its decks, and `Ship`'s own `deckHeightM` is untouched); a light has walls and a lantern roof. No guard re-narrows. |
| `roof` field + `roofDefaults()` hook + `exposure()` | `lib/biome/Atmospheric.ts` (`AtmosphericMixin`, beside `enclosure`) | every scope with air — a Location, an `ExitableVessel`, the `Hive` — has a construction answer. True of all three (the hive's is its own walls, as its envelope already is). ⚠ NOT on `Location` (the `Enclosed.ts` argument: the mixin could only reach it through a cast) and NOT on `Enclosed` as a new mixin (TS inference depth, same file). |
| `Exposure` | `lib/spatial/Exposure.ts`, a value object | nothing composes it; it is computed and cached. |
| `lightAbsorption`, `elasticity`, `crosslinking` | `lib/material/Material.ts` | every material may be transparent, may stretch, may crosslink. All three default to the honest zero (opaque, rigid, inert), so every shipped row is byte-identical until it authors one. |
| `CrosslinkSpec` + `Crosslinking` | `lib/material/Crosslinking.ts`, a value object | nothing composes it; `FireController` and the test call it. |
| `consumed?` on `RecipeInputSlot` | `lib/craft/Recipe.ts` | every recipe may name an input it keeps — a mould, a form, a last. True of crafting generally; craft-resolve honours it for free. |
| `for <duration>` | `fire.yaml` + `FireController` | every chamber may be held for a stated time. True of a kiln, a lime clamp, a glass pot. |
| `exposeToRain(delta)` | `lib/slot/Attired.ts` (`AttiredMixin`, on `Creature`) | every body that wears things sheds rain through them. True; a creature wearing nothing passes everything, as today. ⚠ NOT on `Wet` (a cloak is Wet and has no layers) and NOT in `WeatherLogic` (the walk belongs to the body that owns the slots — the three-copies lesson in `Attired.ts`'s header). |
| wet term on `contactResistance` | `MaterialApi`/`MaterialLogic` (exists) | an optional argument; dry callers are byte-identical. |
| `wearFactor` | `lib/pump/Pumping.ts` (`PumpingMixin`) | every pump wears its packing by the packing's material. True by construction. |
| `lint:unhoused` | `packages/server/scripts/check-unhoused.ts` | a gate, not a host. |
| the `weather` window's air read | `lib/husbandry/Producing.ts` | every weather-windowed tap reads the air at its place. True of birch, Hevea, any future row. |
| Hevea rows, the works, the moulds, the goods | content — `trade-rubber`, `terminus`, `trade-farming`, `trade-quarrying`, `base-library` | rows name shipped classes; no class is added unless W7 finds one is needed, and then it is `trade-rubber/src/thing/`. |

**The narrowing test, applied.** Nothing above needs an `if (host is a
building)` guard: a vessel answers the construction question with its
own material (an override, not a guard), an unhoused room answers with
the legacy walk (a fallback the census is shrinking, not a re-narrowing
of the host set), and a material with no `crosslinking` simply has none.
The one place a guard was tempting — *is this charge rubber?* in
`FireController` — is answered by the material carrying a spec or not.

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- **`props:` / `cast:`** — every placed thing in the works is a `props:`
  entry on its room (`populates:` is retired; `container:` is refused by
  `lint:instanceable`). The Hevea stems are `props:` of the stove house.
- **Locations, not rooms** — the works' rooms are
  `SingletonCartesianLocation` rows joining a `CartesianZone` by
  `coords:` (the oilworks' shape). `FurnishableRoom` is not used.
- **`<root>/<branch>/`** — pack rows at `/trade/rubber/{thing,idea}/…`,
  recipes in `content/recipes/`, maturation under `idea/maturation/`
  (the catalogue's infix), the works under `/world/terminus/goods-yards/
  rubber-works/…` in the terminus pack (trade = mechanism, locality =
  expression), materials and the species under `/stuff/…` in
  `base-library` / the pack's own `/stuff/idea/species/…` (species rows
  ship from trade packs today — forestry's maple).
- **Module scope declares; lifecycles initialize** — `Exposure` and
  `Crosslinking` are value objects with no module-scope execution; no
  new Api; `check-unhoused.ts` is a script.
- **Import boundary** — nothing new outside `api/**` imports outside
  `src/mud/`; `Exposure` reaches `NavigationApi` through `api/navigation`
  (a static import from `lib/biome/Atmospheric.ts` — ⚠ check for a cycle;
  `LocationZone.ts` uses a dynamic import of the same module for the
  same reason, and the plan follows it: `exposure()` imports
  `NavigationApi` dynamically once and memoizes the module, or
  `structureAtNow` is reached through a `Stuff`-level seam the build
  finds already exists. The build records which.)
- **No new module category, no free helper** — none planned. If the
  build wants a helper, it folds into the value object or the owning
  class and says so in the commit.
- **Verbs on objects** — `exposeToRain` on the wearer; `exposure()` on
  the scope; `wearPacking` on the pump; `outcome()` on the spec.
- **Methods-only inter-stuff** — a neighbour's temperature is read by
  `envelopeTemperatureLast()`; a structure's construction by
  `getEnclosure()`/`getRoof()`/`getStoreys()`; the foot coverings by
  `coveringAt`.
- **Api ↔ Logic** — the only Api surface touched is
  `MaterialApi.contactResistance` (an optional argument on an existing
  pair) and, if needed, `BiomeApi.exposureOf(scope)` forwarding to
  `BiomeLogic` for scripts and lints that cannot reach a mixin method.
- **No `isWizard`, no migrations, no new collections** — none. Dev DBs
  are dropped (the quarry column changes a seeded Deposit row).
- **Lint gates this build must satisfy:** `lint:envelope` (grown),
  `lint:biome`, `lint:light-sources` (its row-side sky mirror learns
  `roof`), `lint:unhoused` (new), `lint:closed-vocabularies` (no new
  closed word; `none` is a value of an open spec), `lint:unconsumed-seams`
  (every new field has a reader in its wave), `lint:reachability` (every
  new thing row reached: props, stock lines, recipe outputs, `wins`),
  `lint:capabilities` (`packing` already minted; a `mould` capability is
  NOT minted — moulds are matched by material tag), `lint:instanceable`,
  `lint:field-meta`, `lint:mixin-names`, `lint:imports`, `lint:module-
  scope`, `lint:object-verbs`, `lint:lib-statics` (the two value objects
  hold no statics beyond what the ratchet allows — `Crosslinking` is
  instance methods on a parsed spec, `Exposure` likewise),
  `lint:test-bootstrap`, `lint:schema` (untouched), `lint:drive-scripts`
  (the drive is a wire file).

---

## Waves

Each wave lands green on `pnpm test:near` + touched packs' vitest + the
lint family, at a commit. `pnpm test` runs once before the MR.

### W0 — the construction vocabulary and the `Exposure` answer (behaviour-preserving)

Implements D1, D2, D3, D4, D14 (the census).

Files:
- `lib/spatial/Enclosed.ts` — add `RoofSpec` (= `EnclosureSpec | 'none'`),
  `StoreySpec { key, extent, on?, open? }`, `roofDefaults()` on the
  `Enclosed` interface; rewrite the *No `roofed`* paragraph.
- `lib/spatial/Exposure.ts` — NEW value object (D4).
- `platform/idea/Structure.ts` — fields `enclosure`, `roof`, `storeys`
  (persistent, authorable); `getEnclosure/getRoof/getStoreys`,
  `storeyOf(path)` (longest prefix; the implicit storey when none),
  `storeyStandingOn(key)`, `isOpenStorey(key)`.
- `lib/biome/Atmospheric.ts` — `roof` field + `getRoof/setRoof`,
  `roofDefaults()` (walls' material), `resolveRoof()`, `exposure()` with
  the cache rule; `envelopeExposedAreaM2` **unchanged this wave**.
- `lib/boundary/ExitableVessel.ts` — `roofDefaults()` override (own
  material when `interiorVolume`, `'none'` otherwise).
- `packages/server/scripts/check-envelope.ts` — clause (e) admits `roof`
  with the same two keys and `none`; clause (f) the storey tree.
- `packages/server/scripts/check-unhoused.ts` — NEW; `package.json`
  `lint:unhoused`.
- Tests: `lib/spatial/__tests__/Exposure.test.ts` (a fixture structure
  with the D3 tree: works floor → ceiling; stove house → roof; wing →
  ceiling; loft → roof; terrace → open, floor is the roof; an unhoused
  interior → five exterior faces of its enclosure; an outdoor row →
  outside; a coach → housed by itself), `Structure.storeys.test.ts`,
  the lint's fixture.

Acceptance: every existing test green with no reader moved; `exposure()`
for every shipped room reproduces `isSkyExposed`'s answer in
`isOutside()`; `lint:unhoused` prints the ceiling and the list.

Commit: `feat(construction): walls, a roof and storeys on the Structure; Exposure answers the five faces`

### W1 — the five readers move onto the construction

Implements D4's second half; the biome stops deciding the sky for every
housed and every outdoor room.

Files (each caller from Grounding, in this order):
- **air & heat** — `Atmospheric.ts`: `addAtmosphereContent` (`exposure().
  top === 'open'` ⇒ 0), `airChangesPerHour` (open ⇒ ∞; exterior/interior
  openings by `isThreshold`), `envelopeApplies` (`!exposure().isOutside()`),
  `isThreshold(far)` → `structureOf(this) !== structureOf(far) ||
  far.exposure().isOutside()` (the documented one-liner),
  `envelopeExposedAreaM2` → `exposure().exteriorAreaM2()` (⚠ this is the
  first behavioural change for housed rooms: the terminal's and the
  Hesper's interiors lose through fewer faces; unhoused rooms are
  byte-identical because their exposure is five exterior faces).
- **rain** — `WeatherLogic.ts`: the two `computeResolved` callers pass
  `exposure().rainReaches()` as `skyExposed` for `precipitationHere` and
  keep the sky-field decision on `isOutside()` (an atrium under glass is
  inside for the air and under the sky for the light — two questions,
  two answers); `wetOccupants`/`maintainPuddle` gated on `rainReaches()`;
  `runStormFanout` on `top === 'open'`; the restamp fan-out at `:905` on
  `isOutside()`. `Soil.ts:514` and `Floor.ts:688` → `rainReaches()`.
  `Maturing.ts:1303` already reads `airSegmentsFor` → its `rainMmPerH`
  must be 0 under a roof: `BiomeLogic.airSegmentsFor` gates rain on
  `rainReaches()`.
- **light** — `AmbientLit.isSkyLit()` → `exposure().skyVisible()` when
  `ambientSource` is null (the `'sky'`/`'glow'`/`'none'` rungs keep
  winning); `VisionModality.ownFlux` multiplies the sky term by
  `exposure().skyLightFraction()` (1 for open, so every street is
  byte-identical; the fraction only bites in W2 when glass authors an
  absorption — until then a roof passes 0 and a housed interior with a
  slate roof is dark unless lit, which is today's answer).
- **view** — `PerceptionLogic.horizonAtSea/Ashore`, `SurveyController.
  waysideSpaces`, `WeatherReading` → `skyVisible()`.
- **ground** — `Floor.isOnGrade()` default → `exposure().onGrade` for a
  housed room (root storey), the legacy walk for an unhoused one;
  `floorDefaults(onGrade)` on an open storey reads the structure's roof
  material (`floorIsRoofOf`).
- **weather deviation** — `BiomeLogic`'s six `skyExposedWalk` gates →
  `exposure().isOutside()`; `outsideKFor`'s `fromSky` unchanged (it is
  about the chain's provenance).
- Lints: `check-biome.ts` and `check-light-sources.ts` row-side mirrors
  learn: a row under a Structure's extent takes its answer from the
  structure's roof/storeys; the legacy class check holds for the rest.
- `BiomeApi.exposureOf(scope)` (+ `BiomeLogic`) if any script or test
  needs it without a mixin in hand.

Acceptance: the shipped drives `envelope`, `climate-and-water`, `fire`,
`glass`, `taps` unchanged (run their wire files); `Exposure.test.ts`
extended with each reader's answer; the terminal hall (no override yet)
is dry, dark and under slate; the Hesper's cabins under a deck are a
ceiling.

Commit: `refactor(sky): the five readers answer from the construction; the biome keeps only the unhoused`

### W2 — Beer–Lambert and solar gain

Implements D5, D6.

Files: `lib/quantity.ts` (`'1/m'`), `lib/material/Material.ts`
(`lightAbsorption`), `base-library` material rows (`glass`, `bulk/water`,
the ice material, `organic/horn` if present), `lib/spatial/Exposure.ts`
(`skyLightFraction`, per-face transmittance), `AmbientLit.ts`/
`VisionModality.ts` (the fraction now bites), `Atmospheric.ts`
(`solarGainW(t)` + the hourly segmentation in `reconcileEnvelope`;
`envelopeCoefficients` untouched), `lib/config/AppSettings.ts` +
`packages/content/platform/content/settings/envelope.yaml` (`light.solar.
noonIrradianceWm2`, `light.solar.sideWeight`, `envelope.solarSegmentsMax`),
`lint:envelope` clause (b) sibling: a transparent `roof`/`enclosure`
material (α authored) may be thin; an opaque one at 4 mm is warned.
Tests: `Exposure.light.test.ts` (glass roof passes ≈ 0.97; slate 0;
glass walls under slate 0.9 × 4 × 0.25 capped 1), `Atmospheric.solar.
test.ts` (a 3 m glass cell at a clear noon, stove out, lands above its
outside; the same cell at midnight falls to it; an opaque cell is
byte-identical to W1 — the gym prints the day curve).

Acceptance: `measure light` in a glass-roofed fixture reads daylight; the
same room is warmer than its outside at noon and equal before dawn.

Commit: `feat(light): matter passes light by Beer–Lambert; the sun warms a room through a transparent face`

### W3 — heat between rooms of one building

Implements D7.

Files: `Atmospheric.ts` (`reconcileEnvelope` interior-face terms,
`envelopeCoefficients` returns `uInteriorWperK` beside `uWperK`;
`traceOf`/the `feel` cause line names the warmest neighbour), `BiomeLogic.
resolveEnvelopeTemperature` (neighbours' outside resolved one hop),
`Exposure.ts` (`interiorFaces()` carries the neighbour). Tests:
`Atmospheric.coupling.test.ts` — two rooms of one fixture structure, a
`SpaceHeating` stove lit in the lower: the upper's `Last` rises within a
game hour and sits above an identical unheated control; an interior
partition's U does not appear in `uWperK`; a cycle of three rooms
reconciles without recursion (`Thermal.freeze.test.ts`'s ticking clock).

Acceptance: AC 7 by test; the works' loft in the drive (W7) by the drive.

Commit: `feat(envelope): rooms of one building share heat through their interior faces`

### W4 — materials, the hold, and the cure

Implements D8, D9, D10, D11.

Files: `lib/material/Material.ts` (`elasticity`, `crosslinking` with a
validating setter), `lib/material/Crosslinking.ts` (NEW), `lib/craft/
Recipe.ts` (`consumed?`), `platform/idea/cmd/device/FireController.ts`
(the hold; the non-consumed slot; the crosslink branch), `packages/content/
platform/content/platform/cmd/device/fire.yaml` (the `for` arg + help),
`platform/idea/api/CraftingLogic.ts` (honour `consumed: false` in the
`make` path — one guard at the consume site), `base-library` rows
(`raw-rubber`, `raw-rubber-coagulum`, `latex`, `ebonite`, `rubber-scorched`,
`mineral/sulfur`, `elasticity` on rubber/leather/wool/linen/glass/iron/
raw-rubber/ebonite), `lib/material/__tests__/Crosslinking.test.ts`
(prints the curve: 3 % sulfur at 418 K for 1800 s → rubber `fine`; 1 %
for 600 s → under; 25 % for 3600 s → ebonite; 3 % at 470 K → scorched),
`Recipe.schema.test.ts` round-trip, `FireController` tests (a recipe
with `holdS` runs its hold; `for 2 hours` runs two game hours; a glass
batch is byte-identical).

Acceptance: AC 2 and 3 in unit tests with a fixture oven and mould;
`pnpm lint:closed-vocabularies` unchanged; `lint:unconsumed-seams`:
`elasticity` has its first reader (the curve test is not a reader —
W5's pump is; the field lands here and the gate's ceiling is checked,
not raised: if it trips, `elasticity` moves to W5).

Commit: `feat(cure): a hold on fire; the crosslink curve as data on the feedstock; the mould is a slot the firing keeps`

### W5 — the four corrections

Implements D12.

Files: `api/material.ts` + `platform/idea/api/MaterialLogic.ts`
(`contactResistance(material, wet?)`, `permeability`), `platform/idea/api/
ElectricityLogic.ts` (`groundContactInsulated`, `pathResistance`,
`isWet` wets foot coverings), `lib/slot/Attired.ts` (`exposeToRain`),
`platform/idea/api/WeatherLogic.ts` (`wetOccupants`), `lib/pump/
Pumping.ts` (`wearFactor`), `packages/content/platform/content/settings/
{pump,wetness,electricity}.yaml` (`pump.referenceToughness`,
`pump.elasticityWearRelief`, `wetness.impermeableBelowPct`), the rubber
retag + the three new rubber materials' tags, a grep record of `organic`
readers in the commit. Tests: `ElectricityLogic.wet-boots.test.ts`
(leather boots dry in the brine cell: insulated; the same boots after
`isWet` immersion: shocked; rubber boots: insulated wet or dry),
`Attired.rain.test.ts` (wool coat: body wets as the coat saturates;
rubberized coat: body dry after ten segments), `Pumping.wear.test.ts`
(leather to `worn` in N strokes; rubber at N strokes reads `sound`),
`ConditionLogic.corrosion.test.ts` (vitriol on a linen apron wears it;
on a rubber apron, residual 0 and no wear).

Acceptance: AC 8–11 by unit test; the substation integration test
(`world/substation/__tests__/FloodedCell.integration.test.ts`) extended
with the two boots.

Commit: `fix(garments): wet matter conducts, the outer layer sheds rain, wear reads the material, rubber shrugs acid`

### W6 — supply

Implements D13.

Files: `lib/husbandry/Producing.ts` (the `weather` window's air read;
test the birch unchanged), `trade-rubber` species + tree + stems +
maturation profile rows (the pack skeleton lands here with `pack.yaml`
and `package.json`), `trade-farming` dandelion species/plant/seed/crop +
root material, `trade-rubber/content/recipes/{root-pulp, raw-rubber-
from-pulp}.yaml`, `trade-quarrying/…/thing/sulfur.yaml`, `rejection/…/
deposit/quarry-hill.yaml` (the band), `base-library` `mineral/sulfur`
(if not landed in W4). Tests: `trade-rubber/src/__tests__/latex.test.ts`
(a stem in a 300 K scope: open; at 285 K: `cold`; a cup of latex left a
game day casts a raw-rubber lump), `trade-farming` row test (the crop
mills to pulp; the `make` recipe mints the lump with water in reach),
the quarry column test (`dig` at −10.2 wins sulfur; −11 wins salt).

Acceptance: AC 1 by test (every input obtainable with nothing granted);
AC 4's tap half by test.

Commit: `feat(rubber): latex from a Hevea under glass, rubber roots from a field, sulfur from the caprock`

### W7 — the works, the content pass, the goods, the drive

Implements D14, D15 (and the general-store and gas-bladder collisions).

Files: `terminus/…/goods-yards/rubber-works/**` (structure, zone, six
rooms, the oven `/trade/rubber/thing/oven` — an `Oven` row,
`burnTemperatureK: 430`, `bellowsMultiplier: 1.12` so the bellows is
how you scorch — five mould `Tool` rows and their tag materials, a
`stove` prop in the stove house, a stove in the works floor, the three
stems, the raw-rubber lump's cast row, the goods rows `/trade/rubber/
thing/{rubber-boots (extends leather-boots, material rubber, bill parts
rubber), rubber-gloves, rubber-sheet, packing, hose, rubber-apron
(extends tailoring's apron), rubberized-coat (extends coat; material a
new `textile/rubberized-cloth` row: linen with wAC 0.5)}`; the terminal
hall's glass roof + the terminal structure's construction; the market
awning structure and room; the coach's `_materialPath`; the general
store's two stock lines; the gas bladder's material →
`rubberized-cloth`; deletion of the two cafeteria biome rows;
`packages/wire/tests/rubber.dirty.wire.test.ts` (steps 1–22).
`trade-rubber/README.md`. `docs/subsystems/construction.md` (NEW — the
model's permanent home; thermal.md § The envelope, biome.md §
SkyExposedMixin, light.md § The sky, ground.md § onGrade each gain a
pointer paragraph) and `docs/subsystems/rubber.md` (NEW).

Acceptance: `lint:reachability` arm R zero (every new row reached by a
prop, a stock line, a recipe output or a `wins`); `lint:unhoused` falls
by the terminal's six rooms (already housed — unchanged) plus the works'
six (new, housed) and does not rise; **the drive runs 22/22 against a
freshly dropped world** (the exit criterion); AC 5, 6, 12, 13.

Commit: `feat(rubber): the works and its stove house in the goods yards; the drive's buildings placed; rubber on the shelf`

### W8 — stretch (first to cut)

Implements D16. Files: `lib/slot/Wearable.ts` (`fitOn` stretch term),
an elastic-waisted stock garment row in `trade-rubber` (or tailoring),
drive step 23, `Wearable.stretch.test.ts`. Acceptance: AC 14. Cut
cleanly: nothing in W0–W7 references it.

Commit: `feat(fit): a garment stretches by its material; an elastic waist serves a band of bodies`

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the sky from construction | none (`look`, `feel`, `measure light/temperature`, `analyze weather` exist) | — | Structure rows' `enclosure`/`roof`/`storeys`; room overrides | none — a structure loads with its zone (`LocationZone.standUpAttached`), the cache recomputes when it stands; **no boot warming, no template search** | — |
| `fire … for 2 hours` | `fire`/`burn` (exists) | `BurnerMixin` default (exists) | the `for` arg | — | ⚠ the arg is `required: false`, `type: string`, `prepositions: [for]` — a required arg with no default fails closed and silent (instrumentation.md); test the bare `fire` still binds |
| the cure | `fire` | the oven is a `BurnerMixin` host in reach | five recipe rows (`RecipeCatalogue` warms `recipe` documents at boot — exists); the mould slot `consumed: false`; `crosslinking` on raw-rubber | the pack's `recipes/` are installed like glass's | the chamber must hold raw rubber + sulfur + a mould; `mixed-charge` if two moulds — the drive puts one in |
| `tap` a Hevea | `tap` (forestry's) | `SapStandard.commandContributions.peers` (the class static — a row's `commandContributions:` is dead silently) — the stem row names that class | species `production`, window `weather` | none (species resolve by identity ref) | `yieldShape: volume` ⇒ a vessel is needed; the drive carries a cup |
| latex → lump | none (time) | — | the maturation row under `/trade/rubber/idea/maturation/` (catalogue warms by infix — verify `MaturationProfileCatalogue.onCreate` scans every root, as `MaterialCatalogue` does; if it is platform-only, that is a one-line infix fix in W6) + `castTemplate` on the coagulum material | the platform's `boot:` already stands the catalogue up | the cup must be `Bulkable & Thermal` — the drive uses a `Receptacle` row |
| dandelion → pulp → lump | `mill`/`grind` (trade-milling), `make` (platform) | millstones in reach; craft-resolve | two recipe rows; the crop's material tag `rubber-root` | — | `make` needs water in reach: a bulk slot `measureL: 5` |
| sulfur | `dig` (platform) | the quarry face | the band's `wins` | — | depth: the drive digs from the coal floor |
| rubber boots/gloves | `buy` | the store's counter | two `stockLines` | the store's sweep clones par | the names are two words — `buy "rubber boots"` quoting exists; keywords carry the phrase |
| `lint:unhoused` | — | — | the ceiling list in the script | the derived roster | — |

Each of these is asserted by the drive as a state change, not a
non-refusal.

---

## Acceptance-criteria coverage

| AC | waves | proof |
|---|---|---|
| 1 every input obtainable | W6, W7 | drive 11–13; `latex.test`, the quarry test |
| 2 the cure's four outcomes describe themselves | W4, W7 | drive 14–17; `Crosslinking.test` |
| 3 nothing gates the attempt | W4 | no knowledge/epoch read in `FireController`; a test fires as a fresh character |
| 4 the stove house's temperature and the tap | W2, W3, W6, W7 | drive 7–10; `Atmospheric.solar.test`, `latex.test` |
| 5 rain: atrium/awning/coach/covered room dry; terrace/street wet | W1, W7 | drive 1–3, 5 |
| 6 light, sky view, wind, heat loss agree with construction | W1, W2 | drive 1, 2, 6; `Exposure.test` |
| 7 heat between rooms; interior wall loses nothing | W3 | drive 4; `Atmospheric.coupling.test` |
| 8 leather soaked shocks; rubber does not | W5 | drive 18; `wet-boots.test`, the substation integration test |
| 9 rubberized coat dry; wool wet | W5 | drive 19; `Attired.rain.test` |
| 10 rubber packing outlasts leather | W5 | drive 20; `Pumping.wear.test` |
| 11 vitriol eats linen, not rubber | W5 | drive 21 |
| 12 boots and gloves buyable | W7 | drive 22 |
| 13 every drive room answers from a building; the unhoused count does not rise | W0, W7 | `lint:unhoused`; `query` of each room's structure in the drive |
| 14 (cut-first) elastic fits | W8 | drive 23 |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (per wave, `pnpm test:near`):** `Exposure` over a fixture
  structure (the whole face rule in one file); the solar gym (prints a
  day); the coupling test with a ticking clock; the crosslink curve
  (prints the table — the number a reviewer reads); the four
  corrections each with a dry/wet or leather/rubber pair; the tap window
  at two temperatures; the quarry column.
- **Row tests in packs:** `trade-rubber/src/__tests__/` (latex, recipes,
  the works' rows resolve); `terminus` row test for the structure's
  storeys (every member room under a storey); `test-bootstrap` imported
  by anything touching the wired runtime.
- **Lints:** the family, with `lint:envelope` (f) and `lint:unhoused`
  new; run `pnpm -C packages/server lint:family` at every wave.
- **The drive:** `packages/wire/tests/rubber.dirty.wire.test.ts`, run
  against a freshly dropped world (`WIRE_BOOT=1 WIRE_PORT=2014`) before
  the MR opens and after every review fix (⚠ *re-run the drive after
  every review fix*; ⚠ a checkpoint that accepts two outcomes proves
  neither).
- **Only the drive can prove:** the stove house's day (sun in, cold
  before dawn, stove opens the tap), the loft warming through the ladder,
  the terrace wet while the loft is dry, the glass roof's daylight on a
  real `measure light`, the general store selling boots, the gas bladder
  reading rubberized.
- **`pnpm test` at exactly two moments:** before the MR and at
  `/finalize`. Nothing in between.

---

## Risks & opens

1. ⚠⚠ **The cafeteria atrium does not exist.** The requirements name it
   in *Collisions* and drive step 1; the only rows are two orphan biome
   rows no location references, and the University has no dining room.
   The plan's answer (D14): the **terminal hall** is the glass-roofed
   room (a train shed; the terminal is already a Structure), and the two
   biome rows are deleted. **This is the user's call** — the
   alternatives are to author a cafeteria at the University (the
   University only teaches, but a cafeteria is not a trade venue) or to
   use the stove house for step 1 as well. Decide before W7.
2. ⚠ **`SkyExposedBiome` does not retire this build**; it is the
   discriminator for the counted unhoused rows and retires at ceiling
   zero. The requirements' wording (*retires*) is satisfied in effect for
   every housed and outdoor room; if the user wants the class gone now,
   the only honest route is to house or re-biome ~170 rows in this build,
   which is a content pass the requirements explicitly defer.
3. **A fourth material row, `rubber-scorched`** (D9) — the requirements'
   curve has three materials and *scorched* as a worse grade that says
   so. A row is how it says so without a flag on every crafted thing. If
   the user prefers *grade only*, the branch collapses to `cured` at
   `poor` and the firing's narration carries the word.
4. **`wash` vs `make`** (D13.3) — the requirements say the roots are
   *milled and washed*; `wash` is a cleaning verb. The washing is a
   `make` recipe with water in reach. Wording only.
5. **The `weather` window reads the air** (D13.1) — a behaviour change
   for the birch, asserted unchanged by test; if the test disagrees on
   the equinox, the plan keeps the body read for `rising` rows and the
   air read otherwise, and says so.
6. **The `organic` tag retag** (D12.4) — readers of the tag must be
   grepped; if `Combustible` or spoilage keys on it, rubber must still
   burn (it does, in life) and never spoil (it does not). The build
   records each reader's behaviour in the commit.
7. **Glass as an enclosure** — 4 mm glass conducts (k ≈ 1) so the stove
   house's `U` is film-dominated (≈ 5.7 W/m²K): it leaks hard, which is
   true of a glasshouse and is why it freezes before dawn. The risk is
   the other way: with `activeDepth` 0.01 m of glass the skin capacity is
   tiny and the house swings fast — honest, and the drive's clock steps
   must be sized to it (the solar gym prints the curve first).
8. **The drive and the weather** — no verb sets the weather; the clock
   loop (D15) may take many segments to find rain in a dry stretch. The
   loop is bounded and fails loudly. If it proves flaky, the honest
   fallback is a drive-only Locality with a `_weatherPin` (the weeping
   chamber's shape) for the rain steps — recorded here so it is not
   invented silently.
9. **Cache staleness in `exposure()`** — a structure standing up after
   its rooms; the recompute-on-identity-change rule covers it, but a
   room read in the gap gets the unhoused answer once. Pinned by a test
   that reads before and after the singleton stands.
10. **TS inference depth** — `Enclosed.ts` records that one more mixin
    layer on `Location` blew the chain. The plan adds no layer: `roof`
    and `exposure()` ride `AtmosphericMixin`, and `Structure`'s fields
    are plain.
11. **The import graph** — `Atmospheric.ts` reaching `NavigationApi`
    (`api/navigation` → `NavigationLogic` → the registry) may cycle;
    `LocationZone.ts` already uses a dynamic import for exactly this.
    The build follows it and records the cycle or its absence.
12. **`lint:lib-statics` is a ratchet** — the two value objects must be
    instance-shaped (`new Exposure(...)`, `Crosslinking.parse(spec).
    outcome(...)` with `parse` being the one static the pattern allows,
    or a constructor). If the ratchet trips, the answer is to restructure,
    never to raise it.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **`SkyExposedBiome`/`SkyExposedMixin` retirement at `lint:unhoused` = 0;
  the Terminus housing pass** → biome-normalization-slate (job 2's tail).
- **Air mixing between rooms of one building; the flue as an object;
  fire spread through storeys** → structures-slate.
- **Sun direction; a south-facing glass face** → biome-normalization-slate
  (the `w_wall` weight is where azimuth would enter: one face weight
  becomes four).
- **A partition spec distinct from the walls** (an interior stud wall in
  a stone building) → structures-slate; today the party wall is the
  building's wall.
- **Glazing as pane objects on a construction face; hail** → glass-slate.
- **A woodland canopy as a roof of leaves** → forestry (rows only, once
  `roof:` exists).
- **Per-channel absorption on faces (a stained roof colouring a hall)** →
  glass-slate; the grey term is the seam.
- **The stove house's stoker and vent brain; standing instructions** →
  standing-instructions-slate (the fuel contest's sixth claimant is
  content, not code).
- **Synthetic rubber, plastics, tyres** → destructive-distillation-slate,
  drilling-slate (the `CrosslinkSpec` is the seam: a second polymer is a
  spec on a second feedstock).
- **A `cure` discovery loop / the published curve** → inquiry-slate.

---

## Critical files

Read first, in this order:

1. `docs/requirements/rubber-requirements.md`
2. `lib/biome/Atmospheric.ts` (the envelope: `:1042-1110`, `:1130-1260`,
   `:1340-1440`) and `lib/spatial/Enclosed.ts`
3. `platform/idea/api/BiomeLogic.ts` (`:700-746`, `:977-1035`,
   `:1172-1240`) and `api/biome.ts`
4. `platform/idea/Structure.ts`, `platform/idea/LocationGraphRegistry.ts:425-450`,
   `lib/zone/LocationZone.ts:55-130`, `platform/idea/api/NavigationLogic.ts:300-330`
5. `lib/boundary/ExitableVessel.ts:175-240`
6. `lib/perception/AmbientLit.ts:325-375`, `platform/idea/modalities/VisionModality.ts:339-460`
7. `platform/idea/api/WeatherLogic.ts:755-800, 900-915, 1315-1375, 1395-1430`
8. `lib/ground/Floor.ts:390-410, 680-700`, `lib/husbandry/Soil.ts:505-520`
9. `platform/idea/cmd/device/FireController.ts`, `lib/craft/Recipe.ts`,
   `lib/thermal/ThermalDose.ts`, `lib/material/Material.ts`, `lib/material/Alloyed.ts`
10. `platform/idea/api/ElectricityLogic.ts:225-445`, `platform/idea/api/MaterialLogic.ts:878-900`
11. `lib/slot/Attired.ts:570-670`, `lib/slot/Wearable.ts`, `lib/wetness/Wet.ts`
12. `lib/pump/Pumping.ts:100-120, 400-445`
13. `platform/idea/species/Species.ts:430-545`, `lib/husbandry/Producing.ts:340-452`,
    `packages/content/trade-forestry/…/acer/saccharum.yaml`, `…/thing/plant/maple-standard.yaml`
14. `packages/content/rejection/…/idea/deposit/quarry-hill.yaml`, `packages/content/ground/src/idea/Deposit.ts:56-86`
15. `packages/content/trade-glass/{pack.yaml, package.json, src/lib/Tinted.ts, content/recipes/glass-batch.yaml}`
16. `packages/content/terminus/content/world/terminus/{terminal/structure.yaml, goods-yards/oilworks.yaml, goods-yards/oilworks/location/floor.yaml, general-store/counter.yaml}`
17. `packages/server/scripts/{check-envelope.ts, check-light-sources.ts, check-biome.ts}`
18. `packages/wire/tests/assembly.dirty.wire.test.ts`, `packages/wire/src/harness/index.ts`
19. `docs/subsystems/{thermal, biome, weather, light, taps, electricity, textiles, embodiment, pump, crafting, content-packs}.md`, `docs/testing.md § Two tiers`

---

## Drive record

*(appended at build time — the output of `packages/wire/tests/
rubber.dirty.wire.test.ts` against a freshly dropped world, run count,
and what each run found.)*
