# Apiculture — implementation plan

Executes [apiculture-requirements.md](../requirements/apiculture-requirements.md)
(closed scope). **Kind: feature, content-led, with exactly two named kernel
touches.** A new capability pack `trade-apiculture` at root `/trade/apiculture`
is the spine; the two kernel changes — the **set-count latch** in the growth
model (W0) and **venom riding the wound** in the hazard path (W1) — are their
own early waves so they land independently of the pack. Three shipped packs
take small, named edits (`trade-ranching`, `trade-farming`, `trade-winemaking`)
and two take rows only (`generic-objects`, `hearts-delight`, `base-library`).

Seeded by [apiculture-slate.md](../slates/builds/apiculture-slate.md). The
grounding below was verified 2026-09-25 by opening every file cited.

---

## Grounding

Repo-relative to `/home/bobalu/play/saxonberg/build-2`. Every fact here was
checked in the file; a fact the build finds different is a finding, not a
typo to paper over.

### The tap mechanism (trade-ranching)

- `packages/content/trade-ranching/src/idea/cmd/ranching/TapController.ts`
  (142 lines): `export abstract class TapController extends
  CommandController<TapModel>`, abstract `tapKey()`, `emptyPhrase(animal)`,
  `takePhrase(animal, units, got)`. `execute` order: `typeof
  animal.takeFrom !== 'function'` → decline `not-producing`; `taps().find(key)`
  → decline `no-such-tap`; `isDriedOff` → `dried-off`; `standingIn(key) <=
  0.01` → `emptyPhrase`; `takeFrom(key)` → `mint(tap, taken, giver)` → scene →
  `creditDeed({discipline: STOCKMANSHIP, difficulty: animal.getHandling() <
  0.35 ? 'hard' : 'standard'})`. `mint` is `protected`, clones `tap.yieldRow`
  in try/catch, `setMass?.(Quantity.of(round2(units), 'kg'))`, moves into the
  giver. **Mass is the take, in kg.** `round2` is exported from the module.
- `GatherController.ts` is the 35-line accrue template: `tapKey() { return
  'eggs' }`, two phrases. Idea row
  `content/trade/ranching/idea/cmd/ranching/GatherController.yaml` = `class:`
  + `data: {}`. View `content/trade/ranching/cmd/ranching/gather.yaml`:
  `verbs`, `controller`, `description`, `help`, `validators:
  [requiresAnimate, requiresConscious]`, `args: [{name: target, type:
  object, required: true, scope: ["reachable"], requires: HandlingMixin}]`.
- `src/lib/Producing.ts` (301 lines): `PRODUCING_MIXIN = 'ProducingMixin'`;
  `static commandContributions.peers` = the three ranching views,
  **unconditionally**; `fieldMeta {tapState, productionStamp}`; `taps()`
  duck-types `this.getSpecies?.()`; `productionFactor()` reads
  `getReserve('flesh')` and **returns 1 flat when the host has no
  `getReserve`**; `reconcileProduction()` is sync, no far-past guard;
  `accrue`: `ceiling = perGameDay × windowDays`, `standing = min(ceiling,
  standing + perGameDay × days × factor)`; `takeFrom(key)` takes **all**
  standing and resets `lastTaken`. `tapState` is a public field written
  host-internally by spread-copy.
- Sole composer: `src/agent/Livestock.ts:61`
  `ProducingMixin(HandledMixin(HandlingMixin(Creature)))`. `WorkingAnimal.ts`
  composes `HandledMixin(HandlingMixin(…))`, **not** Producing.
- `src/lib/Handled.ts`: `HANDLED_MIXIN`, `static _mixinName`, `static
  commandContributions.peers: ['trade/ranching/cmd/ranching/handle.yaml']`,
  nothing else — a pure affordance carrier. Header: it does not compose
  `HandlingMixin` (nested factories collapse TS inference).
- `src/idea/cmd/ranching/HandleController.ts` (exports `STOCKMANSHIP =
  'stockmanship'`): guard `typeof target.getHandling !== 'function'`; reads
  `getReserve('flesh')`; if `handlingRisk() > 0.45` inflicts `blunt` at
  `body.torso` with `energy: getMass() × risk × 0.6` and narrates the rail;
  `target.handle(1)`; prints **`"${Math.round(flesh)} out of 100"`** or
  `'nothing you can feel through the coat'`; the spine/ribs prose; credits
  `STOCKMANSHIP` at `before < 0.25 ? 'hard' : before < 0.6 ? 'standard' :
  'trivial'`. `src/__tests__/stockman-read.test.ts` pins
  `Livestock.stockmanRead()`'s string (a `look` line, not this controller).
- `handle.yaml`: `requires: HandlingMixin` (the kernel mixin).
- Pack-to-pack imports use the source path form — e.g.
  `'@saxonberg/content-trade-shopkeeping/src/thing/Stock'` (3 sites),
  `'@saxonberg/content-ground/src/idea/Deposit'` (16). `trade-ranching`
  depends on `@saxonberg/content-trade-farming` in `package.json`.

### The kernel tap vocabulary + the honeybee

- `packages/server/src/mud/platform/idea/species/Species.ts:332` `TapSpec
  {key, yieldRow, perGameDay, behaviour: 'accrue'|'expire'|'continuous',
  windowDays}`; `production: TapSpec[]` fieldMeta `{persistent, authorable}`.
  No validation beyond `Array.isArray`. Also `handlingRange: HandlingRange
  | null` (`{floor, ceiling}`, L302, fieldMeta authorable, spoiler 1),
  `biddability`, `adultMass`, `getCommonNames()`.
- Honeybee row:
  `packages/content/trade-ranching/content/stuff/idea/species/animalia/arthropoda/insecta/hymenoptera/apidae/apis/mellifera.yaml`
  — `_bodyPlanPath: …/BodyPlan/sessile`, `lifecycleStates: [alive, dead]`,
  `sexDeterminationSystem: haplodiploid`, `lifespanMin: 0, lifespanMax: 1`,
  `commonNames: [bee, honeybee, bees]`. **No `production:`, no
  `handlingRange`, no `adultMass`.** No honey, beeswax, comb, hive, candle
  row or material exists anywhere.
- `packages/server/scripts/check-kept-animals.ts` reads **agent** rows only
  ("A species named by NO agent row is fine"). A species authoring
  `handlingRange` and named only by `thing` rows does not trip it.

### The growth model (kernel)

- `packages/server/src/mud/lib/husbandry/Growing.ts` (1157 lines).
  `GrowthProfileData` has `fruitSetCount?`, `fruitFillDays?` (L148–157, whose
  doc names the set moment as the home for *alternate bearing* — the seam is
  pre-authorised). `isPolycarp()` L534 = both > 0. `updateFlowering()`
  L1078–1107: `shouldFlower = currentStage()==='mature' && _vigor >=
  thrivingAt`; on a fresh latch with `!_seedSet`, polycarp branch sets
  `_fruitFill = 0; _worstLimiting = 1` — **the set moment**;
  `onFloweringLatched()` fires for monocarps only. `fieldMeta` L406–420
  lists `growthClockStamp, _vigor, _maturity, growthStage, _flowering,
  _seedSet, _lastLux, _lastAmbientK (runtimeState), _worstLimiting,
  _fruitFill, profile`. `getFruitFill()`, `settleCycle()`,
  `getWorstLimiting()`, `getProfile()` are public. `updateFlowering` runs
  inside the **sync** step loop; the async ambient walk is the
  `restampWarmth()` / `_warmthPromise` / `_lastAmbientK` tri-state at
  L821–851 (unresolved = **not limited**).
- `platform/idea/cmd/inventory/HarvestController.ts:209–211`: `count =
  polycarp ? max(1, floor(plant.getProfile()?.fruitSetCount ?? 1)) : 1` —
  **re-read from the profile at pick time; nothing records what was set.**
  `cropPath` is read at L136 before the tool; the tool is a boolean
  capability gate (L151–170) and never selects a product.
- `harvest.yaml` (`platform/cmd/inventory/`): `verbs: [harvest, pick]`,
  target `requires: [VisibleMixin, GrowingMixin|CultivableMixin]` → **a hive
  is refused at the binder.**
- Plant rows: `trade-farming/content/trade/farming/thing/plant/cherry.yaml`
  (`fruitSetCount: 12, fruitFillDays: 20`, species `…/prunus/avium`,
  `harvestTemplatePath: /trade/farming/thing/cherry`), `lime.yaml` (12/25).
  Ten fruiting rows exist.
- Beds: `/platform/thing/GardenBed` (`CultivableMixin(GardenBedGround)`,
  `platform/thing/GardenBed.ts:60`); the shipped row
  `trade-farming/content/trade/farming/thing/bed/garden.yaml` (12 L soil,
  `reserves.moisture`, `fixedGround: true`, `landRequirementM2: 8`).
  `lib/husbandry/Cultivable.ts:431` `applyProps` → `adoptArrivals()` seats
  any Slottable arrival with no host into a free plant slot — **a bed row's
  `props:` seats an authored plant with no code.**

### The forage side (trade-farming)

- `packages/content/trade-farming/src/location/Field.ts`: `legumeFraction`
  fieldMeta L217 `{persistent, authorable}`, field L251, `setLegumeFraction`
  clamps (L257) and has **zero production callers**; read only by
  `fixLegumeNitrogen` L522. `_ambientK = -1`, `_daylightFraction = -1`
  (public runtime fields, L395/398, resolved by `restampSeason()` L417 via
  `BiomeApi.resolveTemperatureFor` + `CelestialApi.daylightFractionAt`;
  called from `postRegister` L777 and re-armed when unresolved L798).
  `swardAreaM2()` L336 returns `areaM2`. `GRASS_BASE_K 278`, `DAYLIGHT_STOP
  0.33`, `DAYLIGHT_HAPPY 0.54` (module consts). `Field` =
  `PersistableMixin(WarrenMemberMixin(ImprovableMixin(SwardMixin(SoilMixin(
  ReservedMixin(CartesianLocation))))))` — **persists itself** (so it overlays
  owned goods placed in it), is Exitable (`CartesianLocation` =
  `ExitableMixin(CartesianCoordinatesMixin(VisibleMixin(Location)))`), and
  has **no plant slot** (a `props:` plant on a Field is scenery).
- `src/lib/Sward.ts`: `SWARD_MIXIN = 'SwardMixin'`; public
  `swardFraction()`, `swardBand()`, `swardPhrase()`, `standingDryMatterKg()`,
  `swardGrowthFactor()`.
- **There is no flowering concept on a sward or a Field.** `isFlowering()`
  exists only on `GrowingMixin`.
- The outward walk: `platform/idea/api/WeatherLogic.ts:297`
  `stepOutwardForPin` is one module-private four-line **containment** step
  (`PIN_WALK_DEPTH_CAP 32`); `Growing.resolveWarmth` (cap `MAX_LIGHT_HOPS`
  8) is the same containment walk. **The forage walk is a different walk:
  over exits, not containers.** `Exitable.getObviousExits(): Exit[]`
  (`lib/boundary/Exitable.ts:71`), `Exit.getDestination()`,
  `Exit.getEdgeMinutes(): number | null` (null → the
  `transport.defaultEdgeMinutes` corridor default).
- Heart's Delight rows (`packages/content/hearts-delight/`, **rows-only, no
  `src/`**, README says adding one breaks every class ref): `pack.yaml`
  (`requires.groups: [hearts-delight (owner office prime-minister)]`,
  `requires.title: [{extent: /world/terminus/hearts-delight, parentParcel:
  /world/terminus, holder: {group: hearts-delight}, landUse:
  agricultural}]`); `bench-field/location/upper-bench.yaml` (`Field`, 4000
  m², `legumeFraction: 0`, prose *"never had clover on it"*, exit `down` →
  farmstead-yard, three wheat `props`); `location/farmstead-yard.yaml`
  (`SingletonCartesianLocation`, props `thing/farm-shelf`, cast
  `agent/farmer`, exits east/north/up); `thing/farm-shelf.yaml`
  (`/trade/shopkeeping/thing/ConsignmentShelf`, **no `stockLines`, by
  design**); `agent/farmer.yaml` (Odell Quist, `Cast`, `costume`,
  `behaviors: introduces/idles`); `idea/farm-business.yaml`
  (`/platform/idea/Business`, `appointingAuthority: {kind: entity, path:
  agent/farmer}`, `operatingLocations: [farmstead-yard, upper-bench]`,
  `banksAt: goodkin`). The Locality row lives in `world-seed`
  (`content/stuff/idea/Locality/hearts-delight.yaml`) by the roster rule.
- The general store's stocked counter:
  `terminus/content/world/terminus/general-store/counter.yaml` — class
  `/trade/shopkeeping/thing/Stock`, `businessPath`, `staffingPolicy:
  self-service`, `stockLines: [{itemTemplatePath, par}]`. Its lantern row is
  `general-store/thing/lantern.yaml` (`/platform/thing/Lamp`, `lit: false`,
  `reserves.fuel {capacityValue 100, currentValue 100, unit "%", theme:
  combustion, floorEffect: null}`, `emittedIntensity: 220`,
  `emittedColorTemperature: 2700`).

### The hive as a Vessel, and its winter

- `lib/stuff/Vessel.ts`: `VesselBase = AtmosphericMixin(ContainerMixin(Thing))`,
  `VESSEL_WALL_M = 0.01` (module-private), `enclosureDefaults()` override
  reads `getMaterial()`. **No `getVolume()` override** — `Atmospheric`'s
  default (L1056) returns `null` ("concrete subclasses override").
- `lib/biome/Atmospheric.ts`: `enclosure` fieldMeta `{persistent,
  authorable}` (L289), `getEnclosure/setEnclosure`, `enclosureDefaults()`
  @hook, `envelopeApplies()` L609 = `getVolume() !== null && _temperature ===
  null && !BiomeApi.isSkyExposed(self)`; `openExteriorOpenings()` L625
  returns 0 unless `isExitable`; `protected envelopeExposedAreaM2(volume)`
  @hook L841 = `5·cbrt(V)²`; `envelopeCoefficients()` L846 (public) =
  `{uWperK, capacityJPerK, enclosure}` with `rWall = thicknessM/kWmK +
  rFilms(0.17)`, `uOpen = 6·V·openings`; `envelopeUWperK()`; the state
  fields `envelopeTemperatureK / envelopeClockStamp / envelopeOutsideK`.
  `BiomeApi.isSkyExposed(scope)` resolves the **nearest biome ancestor** —
  a Vessel on an outdoor Field reads sky-exposed.
- `lib/spatial/Enclosed.ts` is types only: `EnclosureSpec {material?,
  thicknessM?}` closed by `lint:envelope` (clause (b): the material row
  must author `thermalConductivity > 0`). Authoring precedent: hearthworks
  `woodshed.yaml` `{material: /stuff/idea/material/wood/oak, thicknessM:
  0.05}`.
- `lib/spatial/Sealable.ts`: `isOpen()`, `setOpen()`, `open()`, `close()`;
  `platform/thing/Vat.ts` overrides `setOpen`, `open`, `close`, `onMoved`
  (the precedent for reacting to a seal toggle). `Chest` =
  `StagedMixin(SealableMixin(ContainerMixin(DetailedMixin(Thing))))`.
  `open.yaml` (`platform/cmd/boundary/`) `requires: SealableMixin`;
  `OpenController.ts:104–112` calls `sealable.open()` then, **iff
  `MixinApi.isHazard(opened)`**, `opened.resolveInteract(commandGiver)`.
- `lib/spatial/Container.ts:84–88`: optional witness hooks
  `canAddContainable(thing): VetoResult`, `onContainableAdded(thing)`,
  fired by `ContainmentApi.move`.
- `put.yaml` (`platform/cmd/inventory/`): `verbs: [put, place]`, item
  `scope: inventory, requires: ContainableMixin`, target `scope: peers,
  prepositions: [in, on], requires: [VisibleMixin,
  ContainerMixin|SurfacedMixin]`. `drop.yaml` exists. `ignite.yaml`
  (`platform/cmd/device/`): `verbs: [ignite, light, kindle]`, target
  `requires: CombustibleMixin|FurnaceMixin`.
- `lib/fire/Furnace.ts`: `static _mixinName = 'FurnaceMixin'`, `isLit()`
  L180, `ignite()`, `douse()`, `burnTemperatureK` authorable (default 800).
  `platform/thing/Lamp.ts` = `FurnaceMixin(LightSourceMixin(DetailedMixin(
  ReservedMixin(ThermalMixin(Thing)))))`, ships **cold and out**
  (`lint:light-sources` clause (g) refuses a Furnace row omitting `lit:`).
- `lib/thermal/SpaceHeating.ts`: `spaceHeatOutputW()` from an **authored**
  `heatOutputW` — not a derived output; the envelope integration sums it
  over contents. Not used by this build (D8).
- Biped hand slots (`…/BodyPlan/biped.yaml` L45–46): `hand:left` /
  `hand:right`, `accepts: WieldableMixin`, `bodyPart: body.arm.*.hand`;
  covering slots `head→[body.head]`, `hands→[both hands]`, `torso`, `legs`,
  `feet`; `neck` has no `bodyPart`/`covers`. `Slotted.getOccupant(slot)`,
  `getAllOccupants()` (`lib/slot/Slotted.ts:284–315`).

### The sting

- `api/condition.ts`: `ConditionApi.inflict(target, spec): InflictOutcome`
  (L250); `InflictOutcome {trauma, afflicted, reached?}` (L201) — `afflicted`
  is **true iff the target was a wound-able body and the trauma was
  afflicted**. `EnergyInflictSpec {mechanism, site, energy, shieldFacing?,
  …}` (L80). The Api class is the door trusted producers reach; the
  `FromModule('/api/condition#ConditionApi')` gate is on `ConditionLogic`
  (`platform/idea/api/ConditionLogic.ts:49`), so lib mixins
  (`HazardMixin`) and pack controllers (`HandleController`) call the Api
  directly today.
- `ConditionLogic.ts:914` `inflictThroughStack`: attenuates through
  `resolveCoveringStack(target, site)` via `MaterialApi.attenuate`; **a
  fully-attenuated blow returns `{trauma, afflicted: false}`** (L1030–1032:
  `if (!isBody || resolution === null)`), as does a body veto.
- `lib/hazard/Hazard.ts:383` `private deliverHarm(mover)`: `if (spec)
  ConditionApi.inflict(mover, spec); if (hasToxin && isMetabolic)
  mover.introduceToxin(type, amount)` — **the toxin lands unconditionally,
  even when `spec` is null.** `MixinApi.isHazard` exists; `disarm` is
  afforded by the **viewer** (`lib/description/Perceiver.ts:153`), not by
  the hazard.
- `lib/hazard/HazardDelivery.ts`: a plain value object — `constructor(opts
  {channel, energy, siteSelector, toxin?, corrosiveTo?, embeds?, range?})`,
  `resolveSite(mover)` (first `siteSelector` key the mover has),
  `toInflictSpec(mover)`, `hasToxin()`, `getToxin()`, `static from()`.
  Importable by a pack (`@saxonberg/server/mud/lib/hazard/HazardDelivery`)
  **without** composing `HazardMixin`.
- `MetabolicMixin.introduceToxin(type, amount)` — no gating, adds to the
  burden. `venom.yaml` (platform Condition): `absorptionRate 8, clearanceRate
  0.05, potency 2, bands 3/1, 8/2, 15/3, resolution: {by: antivenin}`.
- `step-dart.yaml` (`/stuff/thing/traps/`) authors `channel: point, toxin:
  {type: venom}` and its own text says *"a boot mitigates"*.

### Recipes, the payload, maturation

- `lib/craft/Recipe.ts`: `RecipeInputSlot {slot, category (a Material TAG),
  minGrade, kind?: 'bulk'|'item', measureL?, count?}`; fields `recipeId,
  name, keywords, discipline, inputSlots, toolCapabilities, outputTemplate,
  outputMaterial, baseGradeBand, requiresHeatK, holdS, maxHeatK, medium,
  outputResidue {template, count?}, outputApplication: 'bulk'|'tangible'|
  'edible', outputPortionL, outputAppearance, difficulty, garnish, ice,
  cure`. Rows live in any pack's `content/recipes/` (quarrying: `fire-pot`,
  `burn-lime`; winemaking: `crush.yaml` — item input `category: grape,
  count: 6`, `toolCapabilities: [press]`, `outputApplication: bulk`,
  `outputTemplate: …/must-bucket`, `outputMaterial: …/red-must`,
  `outputPortionL: 2.4`, `outputResidue: {template: …/pomace, count: 1}`).
  Two recipes over one input with different tools/outputs is ordinary data.
- `platform/idea/api/CraftingLogic.ts:1222–1231`: a bulk output's
  `composition` is summed from each input — a bulk slot's payload
  composition, **or, for an item input, `MixinApi.isComposed(m.stuff) ?
  m.stuff.getComposition()`**. `lib/bulk/Bulkable.ts:115` `BlendPart
  {materialPath, servings}`; `BulkPayload {recipeId?, appearance?,
  keywords?, cookedAtK?, composition?}`. `taste`, the label and the tags
  derive from `composition` on read (bulk.md). **A Composed input's
  composition rides into the honey with no kernel edit.**
- `platform/thing/Provision.ts:64`: `SampledMixin(CraftedMixin(ComposedMixin(
  ContaminableMixin(WaterActivityMixin(ThermalDoseMixin(FreshnessMixin(
  ThermalMixin(DetailedMixin(Thing)))))))))`. `lib/metabolism/Composed.ts`:
  `getComposition()`, `setComposition(parts)`.
- `packages/server/scripts/check-perishable.ts`: a row whose
  `_materialPath` resolves to a Material with `spoilActivationEnergy > 0`
  must be a class reaching `FreshnessMixin`; no exemption list.
- `lib/material/WaterActivity.ts`: `a_w = a_w(material) · moisture · (1 −
  solute)`; the passive arm only **raises** moisture toward the ambient
  RH equilibrium and only for a `moisture < 1` (treated) instance. Honey at
  `a_w 0.60` is at the microbial floor (spoilage.md L65).
- `lib/maturation/MaturationProfile.ts` fields (grounding doc): `key,
  inputCategory (TAG match; double match = warned authoring error),
  stallBelowK 283, happyK 291, damageAboveK 303, ratePerDay 0.12,
  productMaterial, productFraction 1, turnedMaterial|null, turnDays 3,
  sealedOnly false, kind: batch|culture, mechanism, strain '',
  requiresStrain '', wildStrain 'wild', spontaneousLagDays 0, killK,
  stallAboveK, leesFraction, leesMaterial, starveDays 14`. Rows found by
  `findByPathGlob('/**/idea/maturation/**')` — any root; the catalogue is
  self-warming. `requiresFlora` (module-private, `Maturing.ts:300`) is true
  when `requiresStrain !== '' || wildStrain !== '' || spontaneousLagDays >
  0` — so with the default `wildStrain: 'wild'` a batch needs a **pitch**,
  or **`spontaneousLagDays > 0` and an OPEN vessel** to catch wild flora.
  Precedents: `trade-winemaking/content/trade/winemaking/idea/maturation/
  white-wine.yaml` (no strain fields), `wine-culture.yaml` (`kind: culture,
  strain: wine-yeast, inputCategory: wine-lees`).
- `platform/thing/Vat.ts` = `VesselKindMixin(MaturingMixin(CraftedMixin(
  SealableMixin(ThermalMixin(BulkableMixin(DetailedMixin(Thing)))))))`; a
  small Vat-family row is `conditioning-bottle.yaml`.
- `trade-cooking/content/trade/cooking/idea/material/sugar.yaml` is where
  `category: sugar` lives — a trade's material ships in the trade.

### `split`

`platform/cmd/ground/split.yaml`: `verbs: [split]`, target `requires: any`
+ `canReach`, tool optional. `lib/ground/Workable.ts`: **declared shapes,
not mixins** — `Workable {planWork(by, tool, what): Promise<WorkPlan |
WorkRefusal>; completeWork(by, tool, token): Promise<WorkResult>}`,
`Splittable extends Workable {readonly splittable: true}`; `WorkPlan {kind:
'plan', durationMs, cost, beginSelf, beginPeers?, token}`, `WorkRefusal
{kind: 'refusal', reason, prose}`, `WorkResult {self, peers?, credit?}` —
the credit names the Discipline. `SplitController` narrows with a
module-private `asSplittable` (`splittable === true` + both methods).

### Packs, parcels, drives, gates

- Capability pack skeleton (`packages/content/trade-quarrying/`): `pack.yaml`
  (`id, version, root, description, requires.title: [{extent:
  /trade/quarrying, holder: {organization: /compact/trade}}]`),
  `package.json` (name `@saxonberg/content-trade-quarrying`, deps
  `@saxonberg/server`, `@saxonberg/types`, content packs, all `workspace:*`;
  scripts `build: tsc`, `test: vitest run`; devDeps typescript/vitest/yaml),
  `tsconfig.json` (`extends ../../../tsconfig.base.json`, `noEmit`,
  `include: [src/**/*]`), `vitest.config.ts` (`callSecPlugin()`, globals,
  node), `src/{lib,location,thing,__tests__}`, `content/{archetypes,
  recipes, stuff, trade/quarrying/{idea/Discipline, idea/maturation,
  thing}}`. Discipline row `trade/quarrying/idea/Discipline/quarrying.yaml`
  (`class: /platform/idea/Discipline`, `data: {key, channel: skill, label,
  iscedf, description, specializes: [], requires: []}`).
- `lib/parcel/ParcelRecord.ts:58–77`: `ParcelOwner = {kind: 'group'} |
  {kind: 'player', templatePath} | {kind: 'organization', templatePath}`;
  `TitleClaim {extent, holder, parentParcel?, landUse?, areaM2?, reach?}`.
  `PackLogic.ts:439/3024` parses `holder: {group} | {organization: </path>}`
  and refuses anything else. `access.ts:145`: an organization holder admits
  its **staff or head**; `Business extends Organization`
  (`platform/idea/Business.ts:137`) with `appointingAuthority` — Quist's
  farm business is a legal holder with Quist as head. **Ownership is never
  declarable in a row.**
- Wire drives: `packages/wire/tests/<feature>.dirty.wire.test.ts`
  (`extraction.dirty.wire.test.ts` is the shape — `declareFile({file,
  packs, dirtyReason})`, `export const DIRTY_REASON`, `Session.cmd()` →
  `CommandResult {notes…}`, `prose()`, `drainProse()`, `expectOk`).
  **No drive advances the game clock** (only `_advanceForTesting` in unit
  tests); extraction's header says so and pins time-dependent ACs in unit
  tests. `lint:drive-scripts` holds `packages/server/scripts/drive-*.ts` at
  zero.
- The lint family is **55 gates**, derived (`pnpm -C packages/server
  lint:family --list`). `lint:verb-collisions` refuses **two views claiming
  one verb** (allowlist of nine shipped pairs, ratchet) — so the pack
  **cannot ship a second `handle` view**. `lint:census`
  (`check-template-census.ts`) requires every path-valued row field
  (`props`, `cast`, `exits.*.destination`, `stockLines[].itemTemplatePath`,
  …) to resolve repo-wide. `lint:capabilities`: a capability word is minted
  by a **consumer** (a recipe or verb), never by a tool row alone.
- `docs/plans/envelope-plan.md` is the shape precedent for this document.

---

## Plan-level decisions

Numbered so waves and commits can cite them. D1–D5 implement the five
decisions the requirements phase closed; D6–D13 answer the seven
engineering questions; D14–D22 are the rest.

### D1 — The kept colony IS the hive Vessel; the boxless colony is a Thing you carry

The population state (`ColonyMixin`, D14) is carried by **two** pack
classes:

- **`Hive`** — a `Vessel` (so it has `AtmosphericMixin`'s `enclosure`, and a
  volume for the winter arithmetic) that composes the colony state, the
  taps and handling: `HandledMixin(HandlingMixin(ProducingMixin(ColonyMixin(
  OrganismMixin(SealableMixin(DetailedMixin(Vessel)))))))`. When occupied it
  *is* the colony you keep. Not a `Livestock` (a Creature with a body plan,
  vitals, flesh, a herd behind it); not a `Location`.
- **`Colony`** — a `Thing` (`HandledMixin(HandlingMixin(ColonyMixin(
  OrganismMixin(DetailedMixin(Thing)))))`): **bees without a box** — a swarm
  hanging in a tree, a nucleus on a shelf, a split in your hands. It has
  strength, a queen and a temper, and no stores (stores are comb in a box).
  Putting it in a hive installs it (D15).

Why the second class: without it, buying a nuc, catching a swarm and
splitting each need a bespoke verb or a state transfer between two
Vessels. With it, all three acquisitions **mint the same Thing** and the
install is the platform's `put`. Decision 1's rationale — the hive must be a
Vessel for the envelope — holds exactly; this adds only the transit form.

### D2 — The colony's condition term is an override, never a reserve

`Hive.productionFactor()` overrides `ProducingMixin`'s:

```
factor = strength × forageFactor × (0.5 + 0.5 × combDrawn)
```

`strength` [0,1] is the population; `forageFactor` is the range's bloom
against the hives on it (D6/D7); `combDrawn` [0,1] is whether the comb is
there to fill (crushing takes it, D3). An empty box has `taps() === []`
(D14: `getSpecies()` answers `null` with no colony), so **nothing accrues in
an empty hive** and the factor is never 1 flat. A `flesh` reserve was
rejected: it would make the colony a body with fat cover, which it is not.

### D3 — `rob` is a `TapController` subclass; comb is the yield; two recipes make honey

- `RobController extends TapController` at
  `trade-apiculture/src/idea/cmd/apiculture/RobController.ts`: `tapKey()
  = 'honey'`, `emptyPhrase` (*"Nothing capped. Out of the flow there is
  simply nothing to take, and the refusal is the season's"*), `takePhrase`,
  and a **`mint` override** that clones `ceil(units / combKg)` `Comb`
  Things of `combKg` (1 kg) each, stamps each with the hive's forage
  composition (D7), and moves them to the giver. The credit stays
  `TapController`'s but the Discipline must be `apiculture`: `execute` is
  not overridden; instead `TapController` gains one protected hook
  `discipline(animal): string` defaulting to `STOCKMANSHIP` (a 3-line
  ranching edit, W2) which `RobController` overrides.
- **The take is one box-worth**: `Hive.takeFrom('honey')` overrides the
  mixin's take-everything with `min(standing, superCapacityKg)` and sets
  `combDrawn = 0` (the comb went with it). Repeat `rob` to take more; stop
  to leave some — which is the whole of AC 8's forced choice.
- **Two recipes, one input** (`trade-apiculture/content/recipes/`):
  `crush-comb.yaml` — item slot `{kind: item, category: honey, count: 1}`
  (a slot's `category` is a **Material tag**, and the comb's material is
  honey — see the wiring note), `toolCapabilities: []`, `outputApplication: bulk`, `outputTemplate:
  /trade/apiculture/thing/honey-jar`, `outputMaterial:
  /trade/apiculture/idea/material/honey`, `outputPortionL: 0.55`,
  `outputResidue: {template: /trade/apiculture/thing/beeswax-cake}`;
  `spin-comb.yaml` — same slot, `toolCapabilities: [extracting]`,
  `outputPortionL: 0.72`, `outputResidue: {template:
  /trade/apiculture/thing/drawn-comb}`. Both `discipline: apiculture`. No
  controller anywhere branches on a tool. The comb's `composition`
  (Provision → Composed) flows into the jar's payload by the shipped
  `CraftingLogic` rule.
- **The flat-list affordance problem** is solved by moving the three
  ranching views off `ProducingMixin.commandContributions` and onto
  `Livestock.commandContributions` (W2). `Livestock` is the mixin's only
  composer today, so nothing shipped changes; the `Hive` affords `rob`
  from its own class static and never offers `milk`. ⚠ The honest
  per-authored-tap affordance ("a species with an eggs tap affords
  `gather`") needs an **instance-level contribution seam** the kernel does
  not have (`CommandApi.collectContributions` walks class statics only,
  `api/command.ts:1444`); that is a finding for tapping-slate, not this
  build.
- The `rob` arg gate: `requires: ProducingMixin` (the federated ranching
  name). A cow binds and declines `no-such-tap` — the same sentence `milk`
  gives a hen today. `rob` is unclaimed (`lint:verb-collisions` will say so
  at W4).

### D4 — Kernel touch A: the set-count latch, and pollination as a push

`packages/server/src/mud/lib/husbandry/Growing.ts` (W0):

- `GrowthProfileData.pollinationBaseline?: number` — the fraction of the
  authored set a plant achieves **with no pollinator** (`1` absent: wind- or
  self-pollinated, byte-identical to today; an insect-pollinated crop
  authors `0.5`). Authors author the CAUSE (what pollinates this plant),
  never the effect.
- Two persistent fields: `_fruitSetCount` (the count latched at the set)
  and `_pollination` (the fraction of the set reached, `[baseline, 1]`).
- The polycarp branch of `updateFlowering()` (L1086–1095) additionally sets
  `_fruitSetCount = floor(profile.fruitSetCount)` and `_pollination =
  profile.pollinationBaseline ?? 1`.
- `public pollinate(share: number): void` — only while `_flowering &&
  _seedSet && _fruitFill < 1`; `_pollination = min(1, _pollination +
  share)`. Sync, idempotent for a given elapsed window (the caller scales
  `share` by its own elapsed days). A hive pushes; the plant never asks the
  biome, so **no async enters the sync step loop** and the tri-state
  pattern is not needed here.
- `public getFruitSetCount(): number` = `_fruitSetCount > 0 ?
  max(1, floor(_fruitSetCount × _pollination)) : max(1,
  floor(profile.fruitSetCount ?? 1))` — a plant persisted before this
  field existed reads exactly as before. `HarvestController.ts:209–211`
  reads `plant.getFruitSetCount()` instead of the profile.
- `settleCycle()` and the death branch zero `_fruitSetCount`.

### D5 — Kernel touch B: venom rides the wound

`lib/hazard/Hazard.ts:383` `deliverHarm`:

```ts
const spec = this.delivery.toInflictSpec(mover);
const outcome = spec ? ConditionApi.inflict(mover, spec) : null;
if (outcome?.afflicted && this.delivery.hasToxin() && MixinApi.isMetabolic(mover)) {
  const toxin = this.delivery.getToxin();
  if (toxin) mover.introduceToxin(toxin.type, toxin.amount);
}
```

A boot that turns the dart now stops the venom; a body with no resolvable
site takes none; a conferred immunity that refuses the wound refuses the
dose. This is the shipped trap's own text made true. Test
(`lib/hazard/__tests__/`): step-dart vs a bare foot → venom burden rises;
vs a booted foot (a covering the point channel cannot breach at the dart's
energy) → burden unchanged, `afflicted === false`. **The colony's stings
apply the same rule from the same value object** (D9) without composing
`HazardMixin`.

### D6 — The forage read is a Field read plus an exits walk on the hive

- **`Field.inFlowerFraction(): number`** (trade-farming edit, W2, ~15
  lines): `legumeFraction × swardFraction() × bloomSeason()` where
  `bloomSeason()` reads the Field's own cached `_ambientK` /
  `_daylightFraction`: `1` when `_ambientK ≥ 285 && _daylightFraction ≥
  0.45`, `0` otherwise, and **`1` when either is unresolved (`-1`)** — the
  tri-state rule: unknown reads as not-limited, and `restampSeason()`
  resolves it within the first read cycle. The sward knows when it blooms;
  the hive asks. A pack-local helper reading `_ambientK` from outside would
  break the methods-only contract and is refused.
- **`Hive.forageCensus()`** (in `ColonyMixin`, pack lib): a bounded
  breadth-first walk **over exits**, not containers — from the hive's
  location, following `getObviousExits()` on every `Exitable` location,
  edge cost `exit.getEdgeMinutes() ?? apiculture.defaultEdgeMinutes`,
  stopping at `apiculture.forageRangeMinutes` (40 — *about an hour's
  flight*) with a hard depth cap of 12 and a visited set; a
  `getDestination()` that answers `null` (a deferred exit) is not an edge.
  At each location it sums, in **clover-equivalent m²**: `field.
  inFlowerFraction() × field.swardAreaM2()` when the location composes
  `SwardMixin` (narrowed by the federated name `SWARD_MIXIN`; the type is
  imported from `@saxonberg/content-trade-farming/src/location/Field`);
  `apiculture.bloomM2PerPlant` (6) for every `GrowingMixin` content that
  `isFlowering()`, looking one level into any `Cultivable` content (a bed's
  plants); and it counts every `ColonyMixin` host with `strength > 0` (the
  hives on the range, itself included). Every read is sync. Result:
  `{sources: Map<key, m²>, totalM2, hives}` where a sward's key is the
  pack's `clover-nectar` material and a plant's key is its
  `harvestTemplatePath` (resolved to the crop's material at rob time, D7).
  Cached on the hive with a game-time stamp and recomputed when more than a
  game-hour old.
- `forageFactor = clamp01(totalM2 / (apiculture.forageM2PerHive × hives))`,
  with `forageM2PerHive` 600.
- The same walk **pushes pollination**: for every flowering plant visited,
  `plant.pollinate(apiculture.pollinationPerHiveDay × days × forageFactor)`
  where `days` is the hive's elapsed reconcile window. The hive gives to
  land it does not own, and nothing on the plant asks who.

### D7 — Crowding is a sentence, honey character is the composition

- **Crowding** is visible in the hive's reading (D10) and its `look` line:
  when `hives > 1 && totalM2 < forageM2PerHive × hives` the line reads *"and
  bees from another stand are working the same bloom — the flow is thinner
  than the flowers would give one hive."* No number, no gauge, no title,
  no appeal — the lesson the requirements ask for.
- **Honey character** rides the **comb's composition** (Provision →
  `ComposedMixin`): `RobController.mint` resolves each census source to a
  Material path — the sward's `clover-nectar` directly; a plant's
  `harvestTemplatePath` via `Template.findByPath(path)` (async, allowed in a
  controller) → its `data._materialPath` — and `comb.setComposition(parts)`
  with servings proportional to m². Crush/spin carry the composition into
  the jar (`CraftingLogic.ts:1230`), so `taste`, the label and the tags
  differ between clover honey and cherry-blossom honey **with no row
  written for either**. The comb's own `look` line names its sources in
  words. ⚠ One authored row is honest: the bench's clover is a sward
  *fraction*, not a plant, so its nectar is a material row
  (`/trade/apiculture/idea/material/clover-nectar`); every Plant source is
  its crop's own material and needs nothing.

### D8 — The hive's boxes, volume and envelope

- **Supers are ordinary contents**: `HiveBox` (pack `thing/HiveBox.ts`, a
  `DetailedMixin(Thing)` with authorable `volumeM3` and `combCapacityKg`).
  `Hive.getVolume()` = `broodVolumeM3` (authorable, 0.045) + Σ boxes'
  `volumeM3`; `Hive.combCapacityKg()` = `broodCombKg` (8) + Σ boxes'
  `combCapacityKg`. `put super in hive` is the supering act (the hive is a
  Container; `put`'s gate admits it).
- **The hive's invariants** (`canAddContainable`): a `Colony` Thing is
  refused when the hive already holds a live colony (*"there are bees in
  it already"*); anything that is not a `HiveBox`, a `Frame`, a `Colony`
  or a comb is refused (*"a hive is not a cupboard"*).
- **`envelopeApplies()` and sky exposure.** A hive standing on the bench
  is sky-exposed by the shipped rule (nearest biome ancestor), so the
  Atmospheric envelope **never applies to it** — and this build does not
  need it to: the hive interior's integrated temperature is not a product
  requirement. What the winter equation needs is the **loss coefficient**,
  `envelopeCoefficients().uWperK`, which depends only on volume, area and
  the enclosure and is computed regardless of `envelopeApplies()`. So:
  no override of `envelopeApplies()`, no `SpaceHeating` on the colony, and
  the hive's `enclosure` row field (`{material: /stuff/idea/material/wood/
  pine, thicknessM: 0.019}`) is what the arithmetic reads.
- **`envelopeExposedAreaM2` is not overridden.** Five faces of a cube is
  right for a box on a stand. A hive inside a shed loses to the shed's air,
  not the sky, because the outside temperature the hive reads (D9's
  `_outsideK`) is `BiomeApi.resolveTemperatureFor(container)` — the shed's
  envelope answers for the shed.
- `openExteriorOpenings()` is inherited (a Vessel is not Exitable → 0); the
  entrance's leak is folded into the cluster-coupling dial.

### D9 — The winter equation, and the two ambient caches

`ColonyMixin.reconcileColony()` (sync, read-triggered from every public
read, from `onMoved`, and from `productionFactor()` so a `rob` reconciles
first) integrates the elapsed window in one step (rates × days, each stock
clamped):

```
U        = hive.envelopeCoefficients()?.uWperK ?? 0           (W/K)
P        = U · max(0, clusterK − outsideK) · coupling         (W)
burnKg   = (maintenanceKgPerDay · strength + P·86400/honeyJPerKg) · days
clusterK = brood season ? 308 : 293   (brood season = outsideK ≥ flightK 283)
```

`honey standing −= burnKg` (the tap's own state, written host-internally
after `super.reconcileProduction()`), then clamped to `combCapacityKg()`.
Dials (`content/settings/apiculture.yaml`, playtest-tuned, **not plan
decisions**): `coupling` 0.35, `honeyJPerKg` 12.5e6, `maintenanceKgPerDay`
0.04. A **gym test** prints the table — thin pine box vs thick box vs skep
across a 90-day winter at three outside temperatures — and asserts the
ordering (thick needs less), which is AC 7's arithmetic.

`outsideK` is a cache: `_outsideK` (persistent, runtimeState) resolved by
`restampOutside()` — the `restampWarmth` promise pattern verbatim — from
`onMoved` and at first read; unresolved (`-1`) reads as **mild (293 K)**, so
an unresolved hive never freezes and never burns.

Pollen: `pollenKg += pollenPerDay × forageFactor × days − broodKgPerDay ×
strength × days`; strength: `+= growthPerDay × min(honeyOk, pollenOk,
queen) × days − attritionPerDay × days`, where `honeyOk`/`pollenOk` are 1
with stores and 0 without. Everything derived, nothing drawn.

### D10 — Swarming and absconding are reconcile-shaped, and death is the third exit

Not brain-shaped: a brain is conduct emitted on channels by a Behaved host
with cadence timers; this is arithmetic on a record, exactly the growth
model's shape. In `reconcileColony()`:

- **Swarm** when `hasQueen && strength ≥ 0.85 && honeyStanding ≥ 0.85 ×
  combCapacityKg() && forageFactor > 0.3` — the colony filled its room in
  a flow. Then `strength ×= 0.5; hasQueen = false; queenlessSince = now;
  _pendingSwarm = {at: now, strength, handling}` and `void
  settleDepartures()`.
- `settleDepartures()` (async, the promise-coalesced pattern) clones
  `/trade/apiculture/thing/swarm` into the **hive's own location** — a
  swarm hangs where it left, findable by `look` — copying strength and
  temper, iff `now − at ≤ swarmHangDays (1)`; older than that it is simply
  gone and the hive's reading says *"swarmed some time ago"*. The queen
  goes with the swarm; the parent raises one after `requeenDays` (21) if
  `strength ≥ 0.25`, else dwindles.
- **Abscond** when `honeyStanding ≤ 0` for `abscondDays` (3) **while flying
  weather** (`outsideK ≥ flightK`): `strength = 0; hasQueen = false;
  lifecycleState = ''` (nothing died), `_lastEvent = 'absconded'`. The box
  is empty.
- **Die** when `honeyStanding ≤ 0` for `starveDays` (5) **in cold**
  (`outsideK < flightK`): `strength = 0; lifecycleState = 'dead'`. AC 8 and
  AC 16 read this: the third hive is dead, the fourth alive.
- Persistent disturbance (a `disturbCount` in the last game-day above a
  dial) lowers `handling` by the sting act itself (D11) — a hive worked
  roughly gets harder to work, which `HandlingMixin`'s decay already
  models; it does not by itself abscond in this build (the slate's
  "persistent disturbance" trigger is left to the husbandry follow-on).

### D11 — Stings: derived count, deterministic sites, the covering decides

`ColonyMixin.disturb(actor): StingReport` on both classes, called from
`Hive.open()` (override, actor from `ExecutionContextApi.getActingAuthor()`
— hydration goes through `setOpen`, not `open()`, so it never fires on
restore), from `workedOver` (D12) and from `RobController.execute`
(before the take). It:

1. reads `smoked` = any occupant of the actor's `hand:left` / `hand:right`
   slots that `MixinApi.isFurnace(x) && x.isLit()` (the smoker is a
   Furnace, D16) — a body read on the actor, not an instrument search;
2. derives `attempts = round(stingBase(6) × (0.25 + handlingRisk()) ×
   (smoked ? 0.15 : 1) × (outsideK < 285 ? 1.5 : 1))`;
3. walks the **gap ladder** `[body.head, body.arm.left.hand,
   body.arm.right.hand, body.arm.left, body.arm.right, body.torso,
   body.leg.left, body.leg.right]` from a **seeded** start index
   (`hash(stuffId) + disturbCount`) — the field pattern, never a draw;
4. per attempt: `new HazardDelivery({channel: 'point', energy: stingJ,
   siteSelector: [site], toxin: {type: 'venom', amount: 0.5}})` →
   `toInflictSpec(actor)` → `ConditionApi.inflict` → **iff `afflicted`**,
   `actor.introduceToxin('venom', 0.5)` — the D5 rule, applied by the
   producer that knows the consent (none);
5. costs the colony `strength −= stingCost (0.002)` per landed sting (a bee
   dies when it stings) and `handle(−)` is not called — but `disturbCount`
   increments;
6. **narrates itself** (`MessageApi.scene(actor)`), naming where the stings
   landed and what would have stopped them: *"Three land — both hands, and
   one through your collar. A veil and gloves, and smoke, is what you
   should have had."* Zero attempts (a quiet colony, well smoked) says
   *"They hardly notice you."*

`stingJ` is calibrated by a test (W4): bare skin at `body.head` →
`afflicted`, severity-1 puncture; a woven linen veil on the `head` slot →
`afflicted === false`. AC 3 and AC 4 fall out: one sting is one puncture
and 0.5 burden (under venom's first band at 3); thirty stings cross
severity 3 with nothing authored.

### D12 — `handle` reaches the hive through ranching's view; the body of the act moves onto the animal

`lint:verb-collisions` forbids a second `handle` view, so the hive binds
through `trade/ranching/cmd/ranching/handle.yaml` (`requires:
HandlingMixin`, which the hive composes) and ranching's `HandleController`
runs. That controller today prints a livestock body — flesh score,
rail-slam, spine prose — so (W2, trade-ranching):

- `HandledMixin` gains `workedOver(actor: Stuff): HandleReport` where
  `HandleReport = {self: MmlNode, peers: MmlNode, difficulty:
  'trivial'|'standard'|'hard', discipline?: string}`, whose **default
  implementation is the shipped livestock body moved verbatim** (the risk
  hazard via `ConditionApi.inflict`, `handle(1)`, the score string, the
  prose; `discipline` absent → `STOCKMANSHIP`). It duck-types
  `getReserve`/`getMass`/`handlingRisk` exactly as the controller did.
- `HandleController.execute` shrinks to the machinery: guard → `report =
  target.workedOver(giver)` → scene → `creditDeed({discipline:
  report.discipline ?? STOCKMANSHIP, difficulty: report.difficulty})`.
  Livestock and the collie are byte-identical in behaviour
  (`hazards.test.ts`, `stockman-read.test.ts` hold).
- `Hive.workedOver(actor)` and `Colony.workedOver(actor)` (the concrete
  classes are outermost, so no HandledMixin default can shadow them):
  `disturb(actor)` then the **band-only reading** — entrance traffic
  (`strength` → *a trickle at the door / steady traffic / bees stacked up
  on the board*), the heft (`honeyStanding / combCapacityKg` → *light as
  an empty box / heavier than it looks / you can barely tip it*), the brood
  read (`hasQueen` × `strength` → *brood in a tight pattern / spotty /
  no brood, and no queen to be found*), `handlingPhrase()` for temper, the
  crowding line (D7), and the last event. `handle(1)` is called so working
  a colony quietens it. `discipline: 'apiculture'`. **No number appears in
  either override**, which is how AC 2 stays true: the precise flesh score
  belongs to palpating a mammal and is livestock's sentence, not the
  mixin's.

### D13 — Quist's close, its title, and the crop

- A new Field row `hearts-delight/content/world/terminus/hearts-delight/
  bench-field/location/orchard-close.yaml` — *"the close"*: 1200 m² cut off
  the bench's lower corner, `legumeFraction: 0.4` (a clover ley Quist sowed
  under his trees, which is what an orchard floor is), exits `up`/`down`
  between the bench and the yard, `props`: three `/trade/farming/thing/bed/
  garden` beds, each with a `/trade/farming/thing/plant/cherry` prop
  (`Cultivable.applyProps` seats it). The **upper bench keeps its
  character** — thin, stony, no clover — and the close is where the fruit
  and the ley are.
- **Title by manifest claim**, not a boot producer: `hearts-delight/
  pack.yaml` `requires.title` gains `{extent: …/bench-field/location/
  orchard-close, parentParcel: /world/terminus/hearts-delight, holder:
  {organization: /world/terminus/hearts-delight/idea/farm-business},
  landUse: agricultural, areaM2: 1200}`. Why: it is the only declarative
  seam (`PackApi.install → ParcelApi.grant`), it reconciles idempotently
  (`granted | kept | conflict`), a boot producer would be code in a pack
  whose README forbids code, and a `player` holder cannot name an NPC — a
  **Business is an Organization** whose head is Quist, so `AccessApi.can`
  answers for him. Placement consent is thereby *demonstrable*
  (`ParcelApi.ownerOf(close)` names the farm); `drop` is not gated on it,
  and the requirements do not ask that it be — the polity's criterion
  exists, the code refuses nothing.
- The three insect-pollinated crop rows in trade-farming (`cherry`,
  `cranberry`, `mint`) author `pollinationBaseline: 0.5`; the seven others
  author nothing and read as before (D4). The close's cherries author
  `_maturity` / `growthStage: mature` so they flower in the drive's first
  season (verify at W7 that a row's `data:` reaches these persistent fields
  through the Hydrator; if not, the trees are mature by the next game-year
  and AC 10 is test-pinned only — record it).

### D14 — `ColonyMixin` and what it carries

Pack `lib/Colony.ts` (`COLONY_MIXIN = 'ColonyMixin'`, `static _mixinName`,
`static _mixinRefusal`). Persistent: `strength`, `pollenKg`, `hasQueen`,
`queenlessSince`, `starvingSince`, `colonyStamp`, `disturbCount`,
`_outsideK` (runtimeState), `_forage` (runtimeState cache), `_lastEvent`.
Authorable on the Hive only: `broodVolumeM3`, `broodCombKg`,
`superCapacityKg`, `combDrawn`. The mixin requires `OrganismMixin` beneath
it (composition-validated in the factory): `_speciesPath` defaults to the
honeybee; `getSpecies()` answers `null` while `strength === 0 &&
!hasQueen` so `ProducingMixin.taps()` is `[]` for an empty box and the
Organism read `isAlive()` is honest.

### D15 — Install, catch and split all mint or consume one `Colony` Thing

- **Install**: `Hive.onContainableAdded(thing)`: if `thing` composes
  `ColonyMixin` → `adoptColony(thing)`: copy `strength`, `hasQueen`,
  `pollenKg`, `handling`; `lifecycleState = 'alive'`; then destruct the
  Thing (`void StuffApi.destruct(thing)` after the hook returns — never
  inside the move). `canAddContainable` refuses a second colony.
- **Catch**: a swarm is a `/trade/apiculture/thing/swarm` row (class
  `Colony`, ~2 kg) minted by D10 into the hive's location; `get swarm`,
  `put swarm in hive`.
- **Buy**: a nucleus is `/trade/apiculture/thing/nuc` (class `Colony`,
  `strength: 0.35`, `hasQueen: true`, `handling: 0.6`) sold from Quist's
  board (D18); `put nuc in hive`.
- **Split**: `Hive` implements `Splittable` (`splittable = true`,
  `planWork`, `completeWork`): refuses under `strength < 0.6` or without a
  queen (*"there is not enough of them to make two"*), else plans a
  20-minute act; `completeWork` mints a `Colony` Thing at `0.4 ×
  strength`, no queen (it raises one in `requeenDays`), into the actor's
  inventory, sets the parent to `0.6 × strength`, credits `apiculture`.
  Rides the platform's `split` with no registration.

### D16 — The toolkit: two mitigations, one shape, no new verb

- **Smoker**: pack class `Smoker = FurnaceMixin(ReservedMixin(ThermalMixin(
  DetailedMixin(Thing))))` (a Lamp without the light), row `/trade/
  apiculture/thing/smoker` (`lit: false`, `reserves.fuel` as the lantern
  authors it, `burnTemperatureK: 330`). Lit with the platform's `ignite`
  (`requires: FurnaceMixin`), held in a hand (Wieldable is what a hand slot
  accepts — the row composes nothing extra; a `Thing` is `get`-able and the
  D11 read checks the hand slots' occupants). No capability word.
- **Veil and gloves**: two `Garment` rows in generic-objects
  (`/stuff/thing/clothes/bee-veil` — `slotClaims: biped: [head]`, linen,
  woven; `/stuff/thing/clothes/work-gloves` — `[hands]`, leather or canvas,
  whichever textile material exists with a `thermalConductivity`). Both are
  ordinary clothing; their whole value is the covering stack.
- **Extractor**: `/trade/apiculture/thing/extractor` (`/platform/thing/
  ToolItem`, `capabilities: [extracting]`, ~18 kg). `extracting` is minted
  by the `spin-comb` recipe (the consumer), satisfying `lint:capabilities`.
- **Hive tool** is not shipped: no verb or recipe consumes a `prising`
  word, and a tool nothing asks for fails the same gate.

### D17 — Materials, things and where each ships

| what | path | pack | class | why there |
|---|---|---|---|---|
| honey (material) | `/trade/apiculture/idea/material/honey` | trade-apiculture | Material | the trade's product, as sugar is cooking's; `waterActivity: 0.60`, `spoilActivationEnergy: 80000`, `nutrientAmounts.sugar` ~800 g/L, `tastes: [sweet]`, `tags: [honey, sweetener, food, edible]` — ⚠ **never `sugar`** |
| clover nectar (material) | `/trade/apiculture/idea/material/clover-nectar` | trade-apiculture | Material | the sward's authored bloom (D7) |
| honey must, mead, fermented honey (materials) | `/trade/winemaking/idea/material/{honey-must,mead}`, `/trade/apiculture/idea/material/fermented-honey` | winemaking / apiculture | Material | the process that makes it (D20) |
| beeswax (material) | `/stuff/idea/material/<the group that holds animal products>/beeswax` | base-library | Material | a fact about the world the candle (in generic-objects) must name without depending on a trade; `density 960`, `thermalConductivity 0.25`, `meltingPoint 335`, `tags: [wax]` |
| comb | `/trade/apiculture/thing/comb` | trade-apiculture | `Comb extends Provision` | food (`_materialPath: honey`) — `lint:perishable` requires Freshness, Provision has it; carries `composition` |
| drawn comb | `/trade/apiculture/thing/drawn-comb` | trade-apiculture | `Thing` row | the spin residue; `put` back in a hive sets `combDrawn = 1` (`onContainableAdded`) |
| beeswax cake | `/trade/apiculture/thing/beeswax-cake` | trade-apiculture | `Thing` row, `_materialPath: beeswax` | the crush residue; category `wax` for the candle recipe |
| honey jar | `/trade/apiculture/thing/honey-jar` | trade-apiculture | row over `/platform/thing/Vat` | bulk honey needs a Sealable, Maturing holder (AC 15) — `interiorCapacity: 1`, `category: jar` |
| hive, thick hive | `/trade/apiculture/thing/{hive,thick-hive}` | trade-apiculture | `Hive` | pine 0.019 m vs pine 0.045 m `enclosure` — AC 7 |
| super | `/trade/apiculture/thing/super` | trade-apiculture | `HiveBox` | `volumeM3: 0.04, combCapacityKg: 12` |
| frame | `/trade/apiculture/thing/frame` | trade-apiculture | `Frame` (a `DetailedMixin(Thing)` whose `look` line derives from its container when that is a Hive: brood/stores/empty comb) | *comb tells you brood* |
| nuc, swarm | `/trade/apiculture/thing/{nuc,swarm}` | trade-apiculture | `Colony` | D15 |
| smoker, extractor | `/trade/apiculture/thing/{smoker,extractor}` | trade-apiculture | `Smoker`, `ToolItem` | D16 |
| candle | `/stuff/thing/candle` | generic-objects | row over `/platform/thing/Lamp` — `lit: false`, `reserves.fuel` 100 %, `emittedIntensity: 12`, `emittedColorTemperature: 1900`, `_materialPath: beeswax` | the requirements' placement; a candle burns itself down |
| bee veil, work gloves | `/stuff/thing/clothes/{bee-veil,work-gloves}` | generic-objects | `Garment` rows | D16 |
| honeybee species | `/stuff/idea/species/…/apis/mellifera` | **moved** from trade-ranching to trade-apiculture, same path | Species | D19 |

### D18 — Quist's board is a labelled imported-input faucet

`hearts-delight/…/thing/bee-board.yaml`: class `/trade/shopkeeping/thing/
Stock`, `businessPath: …/idea/farm-business`, `staffingPolicy:
self-service`, `stockLines`: nuc (par 1), hive (2), thick hive (1), super
(3), smoker (1), extractor (1), honey jar (3), bee veil (1), work gloves
(1), candle (0 — the board sells inputs, not the trade's output). Placed in
the farmstead yard by `props:`; the slate on it is a `details:` entry.
⚠ The farm shelf refuses par on principle (a static farm is a source node)
and this row is a **faucet, labelled as one** in its comment by the malt
precedent (*the honestly-labelled imported-input faucet*): woodenware and a
smoker are hauled into the valley, and a nucleus is Quist's spring split
sold on. The requirements' drive buys these off Quist and there is no
other shipped way to put stock on a shelf without a brain. **Flagged for the
user** (Risks).

### D19 — The honeybee row moves into the pack; its path does not

The `production:` block the row must gain names an apiculture row
(`yieldRow: /trade/apiculture/thing/comb`). Leaving the file in
trade-ranching would make the ranching pack's content depend on apiculture
— the dependency arrow backwards. The file moves to
`trade-apiculture/content/stuff/idea/species/…/mellifera.yaml` at the
**same template path** (the commons; quarrying ships `/stuff/thing/clay-pot`
the same way), and gains: `production: [{key: honey, yieldRow:
/trade/apiculture/thing/comb, perGameDay: 0.5, behaviour: accrue,
windowDays: 400}]` (the species ceiling is deliberately far above any box
so the **hive's** `combCapacityKg()` is the real ceiling), `handlingRange:
{floor: 0.15, ceiling: 0.9}`, `adultMass: 0.0001`, and the lifespan fix
(`lifespanMin: 720, lifespanMax: 1800` — the queen's, since she is the one
individual). Flat-key uniqueness: exactly one pack ships the row.

### D20 — Mead's strain, and the honey that ferments by itself

Neither `wildStrain: ''` nor a new culture row:

- `trade-winemaking/content/trade/winemaking/idea/maturation/mead.yaml`:
  `mechanism: microbial, inputCategory: honey-must, stallBelowK 283, happyK
  291, damageAboveK 301, killK 310, ratePerDay 0.04, productMaterial: mead,
  turnedMaterial: wine-vinegar, turnDays 3, leesFraction 0.04, leesMaterial:
  wine-lees, spontaneousLagDays: 4` — `wildStrain` stays `'wild'`. A must
  left **open** catches wild yeast after four game days (historically how
  mead was made); a pour from the shipped `wine-culture` jar pitches it at
  once; a sealed must never starts. The `requiresFlora` trap is satisfied
  by `spontaneousLagDays > 0`, the shipped predicate's own third clause.
- `trade-winemaking/content/recipes/honey-must.yaml`: two **bulk** slots —
  `{slot: honey, category: honey, measureL: 1}`, `{slot: water, category:
  water, measureL: 3}` — `toolCapabilities: []`, `outputApplication: bulk`,
  `outputTemplate: /trade/winemaking/thing/must-bucket`, `outputMaterial:
  …/honey-must`, `outputPortionL: 4`, `discipline: fermenting`.
- `trade-apiculture/content/trade/apiculture/idea/maturation/honey-wild.yaml`:
  `inputCategory: honey, spontaneousLagDays: 6, ratePerDay: 0.03,
  productMaterial: …/fermented-honey, turnedMaterial: null` — an **open**
  jar of honey somewhere warm ferments on its own; sealed, it keeps
  forever. ⚠ Honest limit: the shipped microbial clock reads temperature
  and openness, not ambient humidity, so *"where it can take up damp"* is
  realised as *"left open"* (which is how honey takes up damp). Recorded in
  Risks, not pretended at.
- Tag hygiene for the double-match rule: `honey` carries `honey`; `honey-
  must` carries `honey-must` and **not** `honey`.

### D21 — Discipline and credit

`/trade/apiculture/idea/Discipline/apiculture.yaml` (`key: apiculture,
channel: skill, iscedf: "0811"` — Crop and livestock production, the same
field as agriculture; `specializes: []`). Credited by `rob` (D3),
`handle` on a colony (D12), `split` (D15), the two comb recipes and the
candle recipe (`discipline: apiculture`). Handling a colony also credits
nothing else; Disciplines are not exclusive, but one act credits one.

### D22 — Dials ship as pack settings

`trade-apiculture/content/settings/apiculture.yaml` (the tailoring
precedent), read by `AppApi.setting(key)` with a seeded literal fallback
in the pack's lib: `forageRangeMinutes 40`, `defaultEdgeMinutes 5`,
`bloomM2PerPlant 6`, `forageM2PerHive 600`, `pollinationPerHiveDay 0.08`,
`coupling 0.35`, `honeyJPerKg 12500000`, `maintenanceKgPerDay 0.04`,
`pollenPerDay 0.03`, `growthPerDay 0.02`, `attritionPerDay 0.004`,
`stingBase 6`, `stingJ` (calibrated at W4), `stingCost 0.002`,
`swarmHangDays 1`, `requeenDays 21`, `abscondDays 3`, `starveDays 5`,
`flightK 283`, `combKg 1`. Rates are playtest-tuned, not plan decisions.

---

## ⭐⭐ Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else on that host. The test throughout: **if a
guard re-narrows the host set, the host is wrong.**

| new thing | host | what composing it claims | why not the alternatives |
|---|---|---|---|
| `ColonyMixin` (population, forage cache, winter burn, swarm/abscond, `disturb`, the reading) | `Hive` (Vessel) and `Colony` (Thing), both in the pack | *this object is a population of bees* — true of exactly these two | on `Vessel`/`Thing` it would claim every box and stone is a colony; on `Livestock` it would claim a body plan, vitals and a herd the bees do not have |
| `ProducingMixin` (ranching) | `Hive` only | *this has taps* — a hive gives comb; a swarm in a tree gives nothing | not on `Colony`: a boxless swarm has no comb to fill, and `rob swarm` would be a re-narrowing decline |
| `HandlingMixin` (kernel) + `HandledMixin` (ranching) | `Hive` and `Colony` | *this has a temper you find out by putting your hands on it, and it affords `handle`* — true of a hive and of a swarm you are deciding whether to box | putting the temper on a separate field would be a second source of truth beside `handling` |
| `OrganismMixin` (kernel) | `Hive` and `Colony` | *this is a living thing of a species* — the colony IS the organism (the slate's rung); `getSpecies()` is also how the taps and the handling range are read | a Hive whose species is read from a hard-coded constant would be a class knowing a row |
| `SealableMixin` | `Hive` | *it has a lid you open* — the drive's `open the hive` | not on `HiveBox` (a super has no lid of its own) |
| `Vessel` base + authored `enclosure` | `Hive` | *a container-thing with an interior climate* — the volume and the wall the winter is computed from | a plain `Thing` cannot declare `enclosure:`; a `Location` is not a thing you carry |
| `HiveBox` (`volumeM3`, `combCapacityKg`) | its own pack class over `DetailedMixin(Thing)` | *a box that adds room to a hive* | counting contents by template path would be brittle and would make a crate a super |
| `Frame` (derived look line) | its own pack class over `DetailedMixin(Thing)` | *reads its hive when it is in one* — a dumb object with one derived sentence | a `Comb` (food) is a different thing: a frame of empty or brood comb is not eaten |
| `Comb` (capped comb, `composition`, mass) | pack class **`extends Provision`** | *food, graded, composed of what the bees foraged* — `lint:perishable` requires a Freshness host for a perishable material, and honey's character rides `ComposedMixin` | a `Thing` row would fail the perishable gate and lose the composition |
| `Smoker` | pack class `FurnaceMixin(ReservedMixin(ThermalMixin(DetailedMixin(Thing))))` | *a fuelled fire you hold* | not a `Lamp` — it gives no light; not a `ToolItem` — no verb consumes a capability from it |
| `_fruitSetCount`, `_pollination`, `pollinate()`, `getFruitSetCount()`, `GrowthProfileData.pollinationBaseline?` | **`GrowingMixin` (kernel)** | *every growing thing can have its set latched and its pollination raised* — default baseline 1 makes it a no-op for everything shipped; the hook is the pre-authorised alternate-bearing seam | on `Plant` (the class) it would miss any future Growing host; on the profile alone it cannot persist |
| `Field.inFlowerFraction()` | **`Field` (trade-farming)** | *a sward with a clover fraction blooms in season* — reads the Field's own cached sky | a pack helper would read another Stuff's fields; `SwardMixin` does not own `legumeFraction` |
| `HandledMixin.workedOver()` default, `TapController.discipline()` hook, `Livestock.commandContributions` gaining the three tap views | **trade-ranching** | *the animal owns the act's body; the trade's class affords the trade's verbs* | a `typeof target.colonyReading === 'function'` branch in the controller would be the guard that tells you the host is wrong |
| `deliverHarm` gate | `HazardMixin` (kernel) | *venom needs a wound* — true of every toxin-bearing delivery | — |
| `Hive.getVolume()`, `combCapacityKg()`, `takeFrom()`, `productionFactor()`, `workedOver()`, `open()`, `canAddContainable()`, `onContainableAdded()`, `Splittable` | the **concrete `Hive`** (outermost) | *what a hive box does with its contents and its keeper* | on `ColonyMixin` they would apply to a swarm; a swarm has no volume, lid or comb |

**Two things deliberately NOT placed:** no `HazardMixin` on the hive (it
would afford `disarm` through the viewer and require a `disarmBy` refusal —
the re-narrowing tell) and no `SpaceHeatingMixin` on the colony (its output
is derived, and the interior temperature is not a requirement).

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — every placement in this build uses `props:`
  (beds, frames in a hive, the board in the yard); Quist stays `cast:`.
  `populates:` appears nowhere.
- **Locations, not rooms** — the close is a `Field` (a `CartesianLocation`);
  nothing new is a `FurnishableRoom`.
- **The five axes / `<root>/<branch>/`** — `/trade/apiculture/{thing,idea,
  lib}` for the trade; `/stuff/…` for the commons rows the pack contributes
  (species, candle, clothes); `/world/terminus/hearts-delight/…` for the
  valley; controllers at `/trade/apiculture/idea/cmd/apiculture/
  RobController`, view at `/trade/apiculture/cmd/apiculture/rob`.
- **Module scope declares** — pack constants are `const`; no module-scope
  statement; `AppApi.setting` reads at use.
- **The import boundary** — pack code imports the kernel only by package
  specifier (`@saxonberg/server/mud/lib/...`, `mud/api/...`,
  `mud/platform/thing/Provision`), other packs by `@saxonberg/content-
  trade-ranching/src/...` and `@saxonberg/content-trade-farming/src/...`
  with both in `package.json`; absolute `FromModule` strings.
- **Verbs live on objects** — `disturb`, `workedOver`, `forageCensus`,
  `takeFrom`, `planWork` are methods on the hive; the controllers are
  machinery; no `XApi.verb(host, …)` is added (the `object-verbs` census
  stays 0).
- **No new module category, free helper, Api, logic singleton, Mongo
  collection or lint exemption.** The exits walk and the sting ladder are
  methods on `ColonyMixin`; the hash for the seeded site index is a private
  method.
- **Money** — nothing mints; the board's stock is goods, priced by the
  shipped `PricedOffer`.

**Lint gates this build must satisfy** (all run by `lint:family`; the
ones with something specific to check are named):
`arg-kinds` (rob.yaml) · `capabilities` (`extracting` is consumed by
`spin-comb`; no orphan capability word) · `census` (every `props`,
`stockLines`, `exits` path resolves — the moved species row, the new
close) · `controller-rows` (RobController has its idea row) · `envelope`
(pine and any skep material author `thermalConductivity > 0`) ·
`field-meta` (every new field declared) · `gates` (absolute strings in the
pack) · `imports` (pack tier) · `instanceable` (pack `lib/` is inherited
only; `/stuff/thing/candle` names `/platform/thing/Lamp`) · `kept-animals`
(honeybee `handlingRange` with no agent row — passes) · `lib-statics` (no
new statics in `lib/`) · `light-sources` (candle authors `lit:`) ·
`mixin-names` (`ColonyMixin` unique) · `module-scope` · `perishable` (Comb
→ Provision) · `pathogens` (none added) · `untitled` (`/trade/apiculture`
claimed) · `verb-collisions` (`rob` unclaimed) · `drive-scripts` (the drive
is a wire file) · `test-bootstrap` / `test-content` · `no-authored-faucet`
(no `openingCapital`) · `doneness` (crush/spin/candle author no heat) ·
`authored-prose`.

---

## Waves

Every wave is independently landable and ends at a commit. Full-suite
runs happen at exactly two moments (before the MR, at `/finalize`);
between them, `pnpm test:near` + every touched pack's own vitest + `pnpm
-C packages/server lint:family`.

### W0 — Kernel touch A: the set-count latch (D4)

**Files.** `packages/server/src/mud/lib/husbandry/Growing.ts` (profile
field, two persistent fields + fieldMeta, the polycarp branch, `pollinate`,
`getFruitSetCount`, `settleCycle`/death zeroing, the `Growing` interface);
`packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts:209`;
`lib/husbandry/__tests__/Growing.fruit-set.test.ts` (new).

**Acceptance.** A polycarp with no `pollinationBaseline` picks
`fruitSetCount` exactly as before; one authoring `0.5` picks half;
`pollinate(0.5)` during the fill window restores the full set; `pollinate`
outside the window is a no-op; a plant hydrated without `_fruitSetCount`
reads the profile. `test:near` + `lint:field-meta` green.

**Commit.** `build(apiculture W0): the set count latches at the set, and pollination has somewhere to land`

### W1 — Kernel touch B: venom rides the wound (D5)

**Files.** `packages/server/src/mud/lib/hazard/Hazard.ts:383`;
`lib/hazard/__tests__/Hazard.venom.test.ts` (new; the step-dart against a
bare and a booted foot).

**Acceptance.** The two cases above; the existing hazard suite green.

**Commit.** `fix(hazard): venom rides the wound — a boot that turns the dart stops the dose`

### W2 — The neighbours make room (trade-ranching, trade-farming)

**Files.** `trade-ranching/src/lib/Producing.ts` (remove the static peers
list — keep the header's argument, note the instance-seam finding);
`trade-ranching/src/agent/Livestock.ts` (add the three views to its
`commandContributions.peers`); `trade-ranching/src/lib/Handled.ts`
(`HandleReport`, `workedOver` default = the moved body);
`trade-ranching/src/idea/cmd/ranching/HandleController.ts` (machinery
only); `trade-ranching/src/idea/cmd/ranching/TapController.ts`
(`protected discipline(animal): string` hook, used in the credit);
`trade-farming/src/location/Field.ts` (`inFlowerFraction()`);
`trade-farming/content/trade/farming/thing/plant/{cherry,cranberry,mint}.yaml`
(`pollinationBaseline: 0.5`); tests: ranching `hazards.test.ts`,
`taps.test.ts`, `stockman-read.test.ts` unchanged and green; a new
`Field.bloom.test.ts` (legume 0.4 × sward 1 × in season → 0.4; unresolved
sky → not limited; `legumeFraction: 0` → 0).

**Acceptance.** `handle cow` prints byte-identically (assert the string in
a controller test); `milk`/`shear`/`gather` still afforded by a Livestock
(`CommandApi.collectContributions(Livestock, 'peers')` contains all
three); both pack suites green.

**Commit.** `refactor(ranching): the handled animal owns the act, and the taps are Livestock's verbs`

### W3 — The pack and the population (D1, D2, D8, D9, D10, D14, D19, D22)

**Files.** `packages/content/trade-apiculture/{pack.yaml, package.json,
tsconfig.json, vitest.config.ts, README.md}` (quarrying's skeleton; deps
add `@saxonberg/content-trade-ranching`, `@saxonberg/content-trade-farming`,
`@saxonberg/content-generic-objects`, `@saxonberg/content-base-library`,
`@saxonberg/content-platform`); `src/lib/Colony.ts`; `src/thing/Hive.ts`;
`src/thing/Colony.ts`; `src/thing/HiveBox.ts`; `content/trade/apiculture/
idea/Discipline/apiculture.yaml`; `content/settings/apiculture.yaml`;
rows `content/trade/apiculture/thing/{hive,thick-hive,super,nuc,swarm}.yaml`;
the species row **moved** (`git mv`) from trade-ranching to
`content/stuff/idea/species/…/mellifera.yaml` with its new fields; the
pack registered in `pnpm-workspace` if the workspace globs do not already
cover `packages/content/*` (check), then `pnpm install`. Tests in
`src/__tests__/`: `winter.gym.test.ts` (the table, D9), `colony.test.ts`
(accrue only with a colony; swarm at the derived threshold and never
below it; abscond in warm dearth vs death in cold dearth; requeen after 21
days; install via `onContainableAdded`; a second colony refused), and a
composition test that the `Hive` reaches `ProducingMixin`, `HandlingMixin`,
`HandledMixin`, `OrganismMixin`, `SealableMixin`, `AtmosphericMixin`.

**Acceptance.** `pnpm -C packages/content/trade-apiculture test` green;
`lint:family` green (`untitled`, `instanceable`, `mixin-names`, `census`
for the moved row); the ranching suite still green with the row gone.

**Commit.** `build(apiculture W3): the colony — a hive that winters by its walls, swarms when it is full, and leaves when it starves`

### W4 — The acts: rob, handle, open, split, the sting (D3, D11, D12, D15, D16)

**Files.** `src/idea/cmd/apiculture/RobController.ts` + idea row
`content/trade/apiculture/idea/cmd/apiculture/RobController.yaml` + view
`content/trade/apiculture/cmd/apiculture/rob.yaml`; `src/thing/Comb.ts`
(extends Provision) + row `thing/comb.yaml`; `src/thing/Frame.ts` + row;
`src/thing/Smoker.ts` + row; `thing/extractor.yaml`; `Hive.workedOver`,
`Colony.workedOver`, `Hive.open()`, `Hive` `Splittable`; `Hive.
commandContributions.peers: ['trade/apiculture/cmd/apiculture/rob.yaml']`;
generic-objects `content/stuff/thing/clothes/{bee-veil,work-gloves}.yaml`.
Tests: `stings.test.ts` (bare head → afflicted + 0.5 venom; veiled head →
neither; gloves → hands stop; a lit smoker in `hand:left` → ~0.15× the
attempts; a quiet colony → zero; thirty landed stings → venom severity 3 —
this **calibrates `stingJ`** and asserts the count is a function of
`handlingRisk()` and not a draw by running twice); `rob.test.ts` (one
box-worth per rob, `combDrawn` → 0, N combs of `combKg`, empty out of
season with the season's sentence, a Livestock declines `no-such-tap`);
`split.test.ts`; `frame.test.ts` (the derived line changes with the hive).

**Acceptance.** `lint:verb-collisions` (rob unclaimed), `lint:perishable`
(Comb), `lint:capabilities`, `lint:controller-rows` green; both suites
green.

**Commit.** `build(apiculture W4): rob, handle, open and split — and the covering decides the sting`

### W5 — The forage read, crowding, pollination (D6, D7)

**Files.** `ColonyMixin.forageCensus()` and its cache, `forageFactor()`,
the pollination push, the crowding sentence in `workedOver` and in a
`Hive` `markupAugmenters` look line; `RobController.mint` composition
stamping; `content/trade/apiculture/idea/material/{honey,clover-nectar}.yaml`.
Tests: `forage.test.ts` — a synthetic Field (legume 0.4, 1000 m²) two
exits away from a hive contributes 400 m²; a flowering plant in a bed
contributes 6; a non-flowering one 0; a second hive on the range halves
`forageFactor` and turns the crowding sentence on; the walk stops at the
range and at a null destination; the census is sync (no `await` on the
read path — assert by calling it inside a sync reconcile); a flowering
polycarp in range has `_pollination` rise across a reconcile window and
`getFruitSetCount()` climb from the baseline; a rob stamps a composition
whose servings are proportional to the census.

**Acceptance.** Suites green; `lint:imports` (the Field type import by
package specifier).

**Commit.** `build(apiculture W5): the crop is the landscape's — the forage read, the crowded range, and pollination on land you do not own`

### W6 — The products: honey, wax, the candle, mead (D3, D17, D20)

**Files.** `trade-apiculture/content/recipes/{crush-comb,spin-comb,candle}.yaml`;
rows `thing/{honey-jar,beeswax-cake,drawn-comb}.yaml`; `Hive.
onContainableAdded` for a drawn comb (`combDrawn = 1`); base-library
beeswax material; generic-objects `content/stuff/thing/candle.yaml`;
trade-winemaking `idea/material/{honey-must,mead}.yaml`,
`idea/maturation/mead.yaml`, `content/recipes/honey-must.yaml`;
trade-apiculture `idea/material/fermented-honey.yaml`,
`idea/maturation/honey-wild.yaml`. Tests: a content test in the pack that
resolves every recipe's template paths and materials; `mead.test.ts` (an
open honey-must catches after 4 days and converts; a sealed one never
starts; a pitch from `wine-culture` starts at once — the `requiresFlora`
predicate exercised through the shipped mixin); `honey-wild.test.ts` (an
open jar ferments after 6 days, a sealed one keeps); a taste test that
clover-composed honey and cherry-composed honey render different
`taste`/label lines from the same recipe; `lint:light-sources` on the
candle.

**Acceptance.** `MaturationProfile.byKey('mead')` and `('honey-wild')`
present after warm; no double-match warning; suites green.

**Commit.** `build(apiculture W6): crush or spin, a candle from the wax, and mead — the hurdle run backwards`

### W7 — Heart's Delight: the close, the crop, the board (D13, D18)

**Files.** `hearts-delight/content/world/terminus/hearts-delight/bench-field/
location/orchard-close.yaml`; `upper-bench.yaml` (an `exit` to the close;
one sentence of prose noticing the close below); `location/farmstead-yard.
yaml` (the board in `props`, a `details` entry); `thing/bee-board.yaml`;
`pack.yaml` (the title claim); `hearts-delight/package.json` (dep on
trade-apiculture, generic-objects); `agent/farmer.yaml` (one `idles` pool
line about the bees — optional). Test: the census gate; a boot test is the
drive.

**Acceptance.** `lint:census` green; the pack installs with `granted` for
the close (boot line); `ParcelApi.ownerOf(close)` answers the farm business
(assert in the drive).

**Commit.** `build(apiculture W7): Quist gets his close — a clover ley, three cherries, a title, and a board that sells woodenware`

### W8 — The drive, the docs, the suite, the MR

**Files.** `packages/wire/tests/apiculture.dirty.wire.test.ts`
(`DIRTY_REASON`: it buys the board's par, robs and crushes comb, sells
honey on the farm shelf, plants nothing but leaves hives on a persisted
Field); `docs/subsystems/apiculture.md` (new — the colony, the forage read,
the winter equation, the sting ladder, what the drive found); one-line
pointers in `CLAUDE.md`'s subsystem map and `ranching.md § Not built:
bees` (→ *built; see apiculture.md*) — **left to the sweep if a sibling
worktree is racing them**; `docs/subsystems/husbandry.md` (the latch),
`hazard.md` (venom rides the wound), `maturation.md` (mead + honey-wild),
`thermal.md` (a Vessel's `uWperK` read without an applying envelope).

**The drive**, step by step against the requirements' script, with what
the wire can and cannot see (extraction's precedent — no drive advances
the clock):

| req. step | wire assertion | pinned in unit tests instead |
|---|---|---|
| 1 | `up` to the bench, `down`/`up` into the close; `look` reads the clover line from `Field` prose + the census (words, no digit) | — |
| 2 | `look cherry` → *"in flower"* (mature rows); note `getFruitSetCount` via `query` | the fill and the pick (W0, W5) |
| 3 | `buy nuc/hive/smoker/veil` at the board; `check` | — |
| 4 | `drop hive`; `put nuc in hive` → adopted (the nuc is gone; `look hive` reads traffic) | — |
| 5 | `handle hive` bare → the sting scene names hands/head and the veil+smoke sentence; a `puncture` at a bare site in `conditions`; no `combat` note | 30 stings → severity 3 (W4) |
| 6 | `wear veil`, `wear gloves`, `handle` → fewer landed, none at head/hands | calibration (W4) |
| 7 | `ignite smoker`, `handle` → the reading; regex asserts **no `\d`** in the self line | — |
| 8 | `open hive`; `look in hive` lists frames; `get frame`; `look frame` reads the derived line | — |
| 9–10 | `put super in hive` accepted; `look hive` shows two boxes | the swarm threshold + hang (W3) |
| 11 | a second hive whose colony state is set by an admin-free path is **not available on the wire** — assert the swarm row can be `get` + `put` into a hive when one is present (seed one with `clone` under a wizard session if the harness has one; else pin) | swarm mints a `Colony` in the location (W3) |
| 12 | `rob hive` out of season → the season's refusal (`nothing-standing`); in-flow behaviour | one box-worth (W4) |
| 13 | `make crush-comb` on a comb obtained by `clone` (wizard) or pinned; `make spin-comb with extractor` | recipe behaviour (W6) |
| 14 | the cherry's `getFruitSetCount` after a hive stands in range across a reconcile > baseline (query twice) | (W5) |
| 15 | `make candle`, `ignite candle`, the room's light reading changes | — |
| 16 | — | dead vs alive (W3) |
| 17 | `drop` a second hive on the bench; `handle` → the crowding sentence | halved factor (W5) |
| 18 | — | abscond (W3) |
| 19 | `make honey-must`, `pour` into a vat, `look` reads the ferment state after the profile warms; an open honey jar reads the wild line | conversion (W6) |
| 20 | `consign honey-jar` on the farm shelf; a second session `buy` | — |

**Acceptance.** The drive **run**, its output and count recorded in this
plan's Drive record; `pnpm test` once, green; `lint:family` green; branch
pushed; MR opened against `master` with the number reported.

**Commit(s).** `drive(apiculture): <what driving found>` then
`docs(apiculture): the subsystem doc and the pointers`.

---

## Reachability wiring

Each link fails closed and silent; each is named so the sweep's drive check
can read it off.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| take comb | `rob` (`trade/apiculture/cmd/apiculture/rob.yaml`) | `Hive.commandContributions.peers` | species `production[honey]` → `yieldRow` comb row | species rows warm by path infix (the moved row keeps its path); `RecipeCatalogue` n/a | `requires: ProducingMixin` (federated ranching name) |
| read the colony | `handle` (ranching's view) | `HandledMixin` on Hive/Colony | the reading derives from `ColonyMixin` state | — | `requires: HandlingMixin` — Hive and Colony compose it |
| open the hive, get stung | `open` (platform) | `SealableMixin` is what `open.yaml` requires; `Hive.open()` does the rest | — | — | `requires: SealableMixin` |
| install / super | `put … in hive` (platform) | Container | `canAddContainable` / `onContainableAdded` | — | target `ContainerMixin` ✓, item `ContainableMixin` ✓ |
| split | `split` (platform) | none needed — `requires: any` | `splittable = true` + two methods on Hive | — | duck-typed by `SplitController` |
| crush / spin | `make` (platform crafting) | the recipe rows under `content/recipes/` | `category: comb` tag on the honey material? **No** — the slot's `category` matches the **input's Material tags**, so the comb's material (`honey`) must carry the tag the recipe names: use `category: honey` on the comb slot, and `honey-must`'s slot names `honey` too (a jar of honey and a comb both satisfy it; the jar is bulk, the comb an item — `kind` disambiguates) | `RecipeCatalogue` warms `content/recipes/` | `extracting` on the extractor row for `spin-comb` |
| the candle | `make candle`, `ignite candle` | recipe row; `FurnaceMixin` for ignite | `wax` tag on beeswax; `/stuff/thing/candle` row | — | `ignite` `requires: CombustibleMixin\|FurnaceMixin` ✓ Lamp |
| mead / wild honey | `pour`, `open`/`close` (shipped) | the Vat family | `honey-must` / `honey` tags; the two profile rows | `MaturationProfileCatalogue` warms any root's `idea/maturation/**` | — |
| buy the kit | `buy` at the board | `Stock` affords `buy` | `stockLines` paths resolve (`lint:census`) | the board stocks itself to par at `postRegister` | — |
| sell honey | `consign`/`buy` on the farm shelf | `ConsignmentShelf` | — | — | the jar is a chattel-stamped Thing ✓ |
| pollination | none — a consequence | — | `pollinationBaseline` on the three crop rows | — | — |
| the forage read | none — a read | — | `legumeFraction` on the close; flowering plants in beds | `Field.restampSeason` resolves the sky | — |
| Discipline | credits from rob/handle/split/recipes | — | the Discipline row | the Discipline catalogue warms by class | — |
| the pack itself | — | — | `pack.yaml` root + title claim | `SAXONBERG_PACKS` / the drive's `declareFile.packs` must list `trade-apiculture` | — |

⚠ The recipe-tag point above is a **plan correction discovered while
wiring**: `RecipeInputSlot.category` is a Material tag, so an item slot
`category: comb` would match nothing unless the honey material carried a
`comb` tag. Decision: the comb's material `honey` carries tags `[honey,
sweetener, food, edible]`; `crush-comb`/`spin-comb` slots are `{kind: item,
category: honey, count: 1}`; `honey-must`'s slot is `{kind: bulk, category:
honey, measureL: 1}`. A jar of honey cannot satisfy an `item` slot and a
comb cannot satisfy a `bulk` one, so the two never collide.

---

## Acceptance-criteria coverage

| AC | satisfied by | proof |
|---|---|---|
| 1 three ways, three costs | W3 (nuc row, swarm row), W4 (split), W7 (the board) | drive 3/4, 11; `split.test.ts`; `colony.test.ts` |
| 2 words, never a number | W4 `workedOver` overrides; W2 keeps the flesh score on livestock | drive 7 (`no \d`); controller test |
| 3 stung bare, less when veiled — because the covering stopped it | W4 + W1 | `stings.test.ts`; drive 5–6 |
| 4 one sting's pain, thirty a medical problem | W4 (0.5 burden vs venom's bands) | `stings.test.ts` |
| 5 cannot fight a colony, told what to do instead | the species' `sessile` body plan (shipped) + the sting scene's sentence (W4) | drive 5 (no `combat` note; the sentence names veil/smoke/withdraw) |
| 6 swarms when unroomed; catchable; supered in time keeps the crop | W3 (derived threshold, the swarm row), W8 | `colony.test.ts`; drive 10–11 |
| 7 thin vs thick box need different honey | W3 gym table | `winter.gym.test.ts` (ordering asserted); the reading's heft line differs (drive, if two hives are set up) |
| 8 take all → dead by spring; leave surplus → alive; nothing warned | W3 (death branch), W4 (rob takes one box at a time, no refusal) | `colony.test.ts`; `rob.test.ts` asserts no warning note |
| 9 clover honey ≠ other honey, no author | W5 composition + W6 recipes | taste test (W6) |
| 10 trees in range set more fruit | W0 + W5 + W7 | `Growing.fruit-set.test.ts`, `forage.test.ts`; drive 14 |
| 11 crush → wax + less honey; spin → more honey, no wax, comb back | W6 | recipe content test; drive 13 |
| 12 wax → candle → lights a room | W6 | drive 15 |
| 13 the second beekeeper can tell | W5 crowding sentence | `forage.test.ts`; drive 17 |
| 14 neglected colony leaves; empty box, nothing died | W3 abscond branch (`lifecycleState` stays unset) | `colony.test.ts` |
| 15 damp honey ferments; diluted honey → mead; one mechanism | W6 (two profiles over one mixin) | `mead.test.ts`, `honey-wild.test.ts`; drive 19 — ⚠ *damp* realised as *open* (Risks) |
| 16 sold where things are sold | W7/W8 (the farm shelf) | drive 20 |
| 17 "a look every week or two" is true | W3 dials: `attritionPerDay`, `abscondDays`, `swarm` at ≥ 0.85 with a 30–40 day flow → a weekly look catches supering; `honey-wild` at 6 days | `colony.test.ts` asserts a 14-game-day gap in a flow loses no colony |
| 18 a second apiary needs no code | W3–W5 by construction; W8 drive 17 uses only `buy` + `drop` | drive 17 |

Nothing unmapped. Two are **narrower than their sentence** and are said
so: AC 15's *damp* (D20) and AC 5's *refusal* (there is no `fight hive`
verb to refuse — a colony is not a combatant by the shipped body plan, and
the sting scene carries the *what instead*).

---

## Test & gate strategy

- **Unit tests** carry everything the clock owns: the winter table, the
  swarm/abscond/death derivations, requeening, the sting calibration and
  count law, the forage walk's bounds, the pollination latch, the two
  maturation profiles, the venom gate. Each uses
  `WorldClockApi._advanceForTesting` and `test-bootstrap`.
- **Content tests** (in the pack's `__tests__`) resolve every path the
  rows name and every recipe's tags against the materials they must match.
- **The drive** proves reachability and the immediate acts; its record
  goes in this plan. It is `.dirty.` because it consumes the board's par
  and leaves hives on a persisted Field.
- **Gates**: named above. `pnpm test` at two moments only.
- ⚠ The `ConditionApi.inflict` call from a **pack mixin method**
  (`disturb`) is asserted by `stings.test.ts` under the call-security
  plugin; if the Api's class decoration refuses a non-controller caller,
  the fallback is to have `RobController`/`HandleController`'s machinery
  hand the report through — record whichever holds.

---

## Risks & opens

1. **Quist's board is a faucet** (D18) in a valley whose own row refuses
   one for produce. It is labelled, it sells imported inputs, and the nuc
   line (par 1) is the one place a colony is minted from nothing. The user
   should look: the alternative (Quist runs the `consigns` brain over an
   authored stock of woodenware) is a brain on a static farm.
2. **The `handle` body moves onto the animal** (D12) — a ranching pack
   refactor beyond "rows over shipped verbs". It is the only way the
   colony's read can be band-only under `lint:verb-collisions`, and it is
   the OO doctrine (`hazard.disarmBy` precedent). The user should confirm
   they are content with a ranching edit of this size (~60 lines moved,
   behaviour byte-identical, two tests hold it).
3. **One file moves, its path does not**: the species row goes into the
   pack (D19) by `git mv`, keeping `/stuff/idea/species/…/mellifera`;
   flat-key uniqueness is the check. The candle stays in generic-objects.
4. **Nested chattel persistence**: a super (chattel) inside a hive
   (chattel) on a Field (persists itself). The container slice reports
   owner-persisted goods to the estate; whether a good inside another
   owned good restores into it is **not verified**. The build must restart
   the dev server after W7 with a hive holding a super and a colony and
   confirm both come back; if not, the hive persists its boxes itself
   (`PersistableMixin` is the wrong tool for a multi-instance chattel) —
   stop and record rather than improvise.
5. **`_maturity` authored on a plant row** (D13) — persistent but not
   `authorable`; whether `data:` reaches it is a Hydrator question the
   build answers in W7. If not, AC 10 is unit-pinned and the drive's step
   14 asserts the census lists the cherry once it flowers.
6. **Sky exposure and `envelopeCoefficients()`**: the plan reads `uWperK`
   without `envelopeApplies()`. `envelopeCoefficients()` needs only
   `getVolume() > 0` and an area — verified in the source (L846–895). If
   `resolveEnclosure()` turns out to consult exposure, the hive overrides
   `envelopeApplies()` to `getVolume() !== null && !isOpen()`.
7. **`ConditionApi.inflict` from a pack mixin** — see Test strategy.
8. **The `-1` rule twice**: `inFlowerFraction()` and `_outsideK` both read
   unresolved as not-limited / mild. A test in each pack asserts it.
9. **Drive limits**: swarming, wintering and absconding cannot be driven
   (no clock control on the wire). The record must say which steps were
   pinned and which were run — a drive that cannot fail is not a drive.
10. **AC 15's "damp"** is realised as "open" (D20) — the microbial clock
    does not read humidity. Honest, recorded; a humidity gate on
    `spontaneousLagDays` is a maturation follow-on, not this build's.
11. **`stockman-read.test.ts`** pins `Livestock.stockmanRead()` — a `look`
    line, untouched by D12. `hazards.test.ts` may assert the controller's
    inflict path; it must keep passing with the body inside `workedOver`.

---

## Deferred seams

Clean attach points, each leaving as a slate line, not a plan section:

- **Instance-level affordances** (a species' authored taps affording their
  verbs) → [tapping-slate](../slates/builds/tapping-slate.md): the finding
  that `commandContributions` is class-static and the tap views had to move
  to `Livestock`.
- **The tap window predicate** — not needed for honey (the requirements'
  finding); hand tapping-slate the sentence.
- **Persistent-disturbance absconding, robbing between colonies, foulbrood
  via `Contaminable` on the comb, varroa** → apiculture-slate's husbandry
  section (`Comb extends Provision` already composes `ContaminableMixin`,
  which is the AFB seam).
- **Pollination as a contract** (N hives present over the bloom window) →
  apiculture-slate; the census already counts hives per location.
- **Honey's ambient-humidity uptake** → a note in maturation-slate /
  spoilage: `WaterActivity` raises moisture toward RH only for treated
  matter, and the microbial profile does not read RH.
- **The hive interior as an applying envelope** (a `feel hive` reading) →
  thermal-slate: the exposure rule for a Vessel outdoors.
- **A `face`/`neck` body part** → its own increment (requirements
  non-goal); the gap ladder in D11 is authored so a `body.head.face` key
  slots in first.
- **The allergy seam** → pharma (requirements non-goal); the sting's
  `introduceToxin('venom', …)` is the exposure event it will read.

---

## Critical files

Read first, in this order:

1. `docs/requirements/apiculture-requirements.md`
2. `docs/subsystems/ranching.md` §§ *The taps*, *Three ROLES*, *Not built: bees*
3. `packages/content/trade-ranching/src/lib/Producing.ts`,
   `src/idea/cmd/ranching/TapController.ts`, `GatherController.ts`,
   `HandleController.ts`, `src/lib/Handled.ts`, `src/agent/Livestock.ts`
4. `packages/server/src/mud/lib/husbandry/Growing.ts` (L130–160, L520–545,
   L815–855, L1078–1140) and `platform/idea/cmd/inventory/HarvestController.ts`
   (L120–230)
5. `packages/server/src/mud/lib/hazard/Hazard.ts` (L370–420),
   `lib/hazard/HazardDelivery.ts`, `api/condition.ts` (L80–215)
6. `packages/server/src/mud/lib/stuff/Vessel.ts`,
   `lib/biome/Atmospheric.ts` (L600–630, L826–900, L1056)
7. `packages/content/trade-farming/src/location/Field.ts` (L210–260,
   L330–440), `src/lib/Sward.ts`
8. `packages/server/src/mud/lib/ground/Workable.ts`,
   `platform/idea/cmd/ground/SplitController.ts`
9. `packages/server/src/mud/lib/craft/Recipe.ts` (L36–200),
   `platform/idea/api/CraftingLogic.ts` (L990–1065, L1215–1235),
   `packages/content/trade-winemaking/content/recipes/crush.yaml`,
   `…/idea/maturation/{white-wine,wine-culture}.yaml`
10. `packages/content/trade-quarrying/` (the pack skeleton) and
    `docs/subsystems/content-packs.md` § *The capability rung*
11. `packages/content/hearts-delight/` (every row; the README)
12. `packages/wire/tests/extraction.dirty.wire.test.ts` (the drive shape)
    and `packages/wire/src/harness/session.ts`
13. `docs/plans/envelope-plan.md` § *Drive record* (the record's shape)

---

## Drive record

*(appended at build time, not at plan time)*
