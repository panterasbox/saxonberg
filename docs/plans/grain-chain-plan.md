# The grain chain — implementation plan

Executes `docs/requirements/grain-chain-requirements.md`. **Kind:**
feature — two new trade packs (`trade-milling`, `trade-baking`), one
thin locality pack (`hearts-delight`), a kernel wave beneath them.
**Leads from:** content, with the kernel wave (the thermal couple, the
dose gauge, the scorch ceiling, the comminution primitive, the power
read) landing first because six consumers already wait on it.

The plan is written for a fresh-context build agent. Every fact in
§ Grounding was read out of the file named this cycle; every decision
in § Plan-level decisions is numbered so a wave or a commit can cite
it. The requirements doc is closed scope — where this plan deviates
from a sentence in it, the deviation is named in § Risks & opens, not
absorbed.

---

## Grounding

### Fire, thermal, the couple (S1)

- `packages/server/src/mud/lib/fire/Furnace.ts` — `FurnaceMixin`
  (fields `burnTemperatureK`, `bellowsMultiplier`, `bellowsActive`,
  `lit`, `fuelBurnRatePerMin`, `furnaceFuelClockStamp`; fuel is the
  host's `'fuel'` Reserve). `getTemperature()` **pins at
  `getHeldTemperatureK()` while lit + fuelled** (line ~183) — a lit
  furnace is hot instantly; there is no warm-up. `heatContents()`
  (215–238) walks `this.getContainer().getContents()` — the furnace's
  **room siblings**, not its contents — and skips anything not
  `isThermal && isMeltable`. `_setLit(value)` is the one writer of lit
  state (`ApiOnly`, called from `FireLogic.igniteImpl` line 149 and
  `douseImpl` line 201); the burnout edge is inside
  `reconcileFurnaceFuel` (`this.lit = false` after
  `setContentsTemperature(held)`).
- `platform/thing/Oven.ts` = `FurnaceMixin(LightSourceMixin(ReservedMixin(ThermalMixin(Thing))))`,
  same shape for `Kiln.ts`, `Forge.ts`; `Campfire.ts` adds
  `PosturedMixin(SlottedMixin(…))` inside. **None composes
  `ContainerMixin` or `SurfacedMixin`** — nothing can be put in or on
  any of them. The Hearthworks cookhouse's only hearth IS its
  `/stuff/thing/Oven` (`packages/content/hearthworks/content/world/hearthworks/location/cookhouse.yaml`,
  props list); `generic-objects/content/stuff/thing/Oven.yaml` authors
  `burnTemperatureK: 500`, `fuelBurnRatePerMin: 0.2`, the `fuel` reserve
  at 100 %.
- `lib/thermal/Thermal.ts` — `ThermalMixin`: 4 persistent fields
  (`stampedTemperatureK`, `thermalClockStamp`, `lastAmbientK`,
  `barrier`). `reconcileThermal()` (438–487) is closed-form Newton via
  `Decay.toward(stamped, lastAmbientK, elapsed, tau)`, with a **4 h
  far-past guard** and a **linkdead freeze**. ⭐ `restamp()` (499–520)
  is *the one async mutation*: freeze under the old ambient, resolve
  the new ambient with `BiomeApi.resolveTemperatureFor(container)`,
  adopt it, re-anchor. Triggers: `onMoved` (549), `Atmospheric.setTemperature`
  fan-out (`lib/biome/Atmospheric.ts` `restampThermalContents`), the
  weather segment boundary, `Flask`/`Vat` seal toggles,
  `ThermalRegulation`. `reachableHeatK()` (394) = the hottest lit
  furnace among the host's **room siblings** (`reachableHeatForImpl`
  585–598). `mediumConductivity()` reads `vacuum` when a Sealable host
  is closed.
- `platform/idea/api/BiomeLogic.ts` `resolveTemperatureFor` (252–264)
  walks containment ancestors reading each `Atmospheric._temperature`,
  then zone, then root biome. A `Furnace` is not `Atmospheric`, so
  **nothing in the chain ever reads a furnace's heat as an ambient**.
- `platform/idea/api/FireLogic.ts` `onFireTick` (236–246) is
  presence-gated to rooms holding a live Interactive;
  `advanceFireInRoom` (256+) calls `heatContents()` on each lit furnace.
- `lib/spatial/Surfaced.ts` — `Surfaced.getResting()` walks the
  environment for `Containable.getRestingOn() === this`;
  `ContainmentApi.placeOn(item, surface)` is the one primitive.
- `lib/Decay.ts` — `byHalfLife`, `toward`. Its header **refuses**
  `Charge.decayFor` and `Freshness.killOver` because "their rate is a
  subsystem's quantity". That refusal applies to the dose below.

### Spoilage, the kill, the payload (S2)

- `lib/material/Freshness.ts` — the pattern the dose gauge copies
  verbatim: a value class `Freshness` (statics = the model:
  `growthRate`, `advance`, `killOver` (409), `bandFor`, `inoculum`;
  instance over a `BulkSlot` = the reads/writes: `load()` (662),
  `stampLoad` (708), `ingestPayload` (723)), a `FreshnessMixin` for
  tangible hosts (774+: `_microbialLoad`, `freshnessClockStamp`, a
  `markupAugmenters` line, reconcile-on-read with **no far-past guard
  and no linkdead freeze**, inertness checked BEFORE the clock so inert
  matter never stamps), and a `declare module '../bulk/Bulkable'`
  merge adding `freshness?: { load; stamp }` to `BulkPayload` (213).
  `growthRate` returns a **negative rate above `killK`** — the passive
  reconcile already kills while hot. `GAS_CONSTANT: 8.314` at line 89
  (also `Contaminable.ts:159` and inline at `:232` — three copies; a
  `pnpm formulae` finding, not this build's).
- Bulk freshness is driven by its readers: `PourController.ts:113`,
  `SipController.ts:60`, `EatController.ts:179`, `DrinkController.ts:64`,
  `BulkableLogic.ts:307/308/344`, `CraftingLogic.ts:709/769`.
- `platform/idea/api/CraftingLogic.ts` (2387 lines): `resolveSpoilage`
  (844–876) — `Contamination.killOver` runs per organism, then
  **`if (effectiveHeatK < Freshness.killTemperatureK()) return untouched`**,
  then `holdS > 0 ? Freshness.killOver(...) : 0`. `applySpoilage` (708)
  stamps the outcome on a bulk output slot; `applyTangibleOutput`
  (1108–1160) flows the **primary matched ITEM input's** material and
  the summed item mass onto the cloned output and **throws when no item
  input matched** (a bulk-only tangible recipe cannot exist today). The
  resolve (1840–1990): `effectiveHeatK = maker.reachableHeatK()`, capped
  by `mediumCapK` (water 373 K / fat's smoke point), gated
  `insufficient-heat` below `requiresHeatK`, then **`workingHeatK =
  requiresHeatK`** (the actual reachable heat is dropped after the
  gate). `'edible'` output claims a cook vessel and fills it;
  `'tangible'` clones `outputTemplate`. `applyControlFloor` (1536) lets
  a used tool's `capabilityControl` floor the grade — the quern/mill
  grade floor already works. `mintFromBuildImpl` (1483) reverse-matches
  the buffer with exact cover (1424) and mints into `req.vessel`.
- `lib/craft/Recipe.ts` — 21 fields, **optionality by sentinel**
  (`''`/`0`/`null`): `requiresHeatK`, `holdS`, `medium`,
  `outputResidue: {template, count}`, `outputApplication`,
  `baseGradeBand`, `cure`, `difficulty`, `discipline`. **No `maxHeatK`.**
  Warmed by `platform/idea/RecipeCatalogue.ts` (`DocumentApi.listOfKind('recipe')`,
  `lib/document/DocumentKinds.ts:59`, `contentDir: 'recipes'`,
  naturalKey `recipeId`), re-warmed on pack go-live.
- `lib/craft/Crafted.ts` — fields `maker`, `recipe`, `craftedAt`
  (runtimeState); composes `GradedMixin` (`gradeBand`, default `fair`).
- `platform/thing/Provision.ts` = `CraftedMixin(ContaminableMixin(CuredMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing))))))`,
  with an `interface Provision extends Crafted` merge. `Thing` =
  `ChattelMixin(ConcealableMixin(WetMixin(VisibleMixin(PerceptibleMixin(TangibleMixin(ContainableMixin(Stuff)))))))`
  (`lib/stuff/Thing.ts:40`) — every Thing is Tangible (material + mass).
- `platform/idea/cmd/bulk/EatController.ts` — a discrete food is
  **all-or-nothing, one portion** (`EAT_PORTION_LITRES`, line 81),
  destructed after; the material's `edibility` gates it; the ingest
  payload carries `getMicrobialLoad()` (144).
- `lint:perishable` = `packages/server/scripts/check-perishable.ts` —
  textual: for every row whose `_materialPath` resolves to a Material
  with `spoilActivationEnergy > 0`, the class must reach
  `FreshnessMixin` via the `extends` walk (`packSources`/`classFileOf`
  from `scripts/pack-roots.ts`). No ratchet; no exemption list. The
  ratchet shape lives in `scripts/check-dossiers.ts` rule 5
  (`UNDOSSIERED_CAST_CEILING = 0`).
- Settings: `packages/content/platform/content/settings/freshness.yaml`
  seeds 15 `freshness.*` keys (`killK: 333`, `killRatePerHour: 6`,
  `killActivationEnergy: 200000`, `awFloor: 0.6`, `freezingK: 273`…);
  `lib/config/AppSettings.ts:1190–1239` declares them. ⚠ **`freshness.dose.*`
  keys already exist** (`freshness.dose.onsetLoad`, `freshness.dose.scaleMg`
  — the *ptomaine* dose). The thermal dose must not reuse that word in
  that namespace.
- ptomaine: `packages/content/platform/content/platform/idea/Condition/metabolism/ptomaine.yaml`
  — `absorptionRate: 4`, `clearanceRate: 0.02`, bands `{2,1},{6,2},{12,3}`.
- `WorldClockApi.DEFAULT_SCALE = 12`; `lib/reserve.ts` is a file.

### Maturation, bulk, vessels

- `lib/maturation/Maturing.ts` — `__validateComposition__` (313)
  throws unless the host composes `BulkableMixin`. Fields (339–361):
  `maturationClockStamp`, `maturationPhase`, `maturationProfileKey`,
  `batchMaterialPath`, `startingSugarGPerL`, `fractionConverted`,
  `_worstStretch`, `turnedDays`, `batchStrain`, `wildLagDays`,
  `viability`, `leesVolumeL`. `startBatch` (571) sets `phase = profile
  !== null ? 'active' : 'idle'` (no sugar precondition — the retting
  pit removed it); the turn (503–508) rewrites the interior to
  `turnedMaterial` when finished + open past `turnDays`;
  `applyBatchGrade` (677) writes the worst-stretch band onto the
  host's Graded face; `stampBatchMark` (658) writes `ferment:<key>`
  into `recipe`.
- `lib/maturation/MaturationProfile.ts` fields: `key`,
  `inputCategory` (a material **tag**), `stallBelowK` 283, `happyK`
  291, `damageAboveK` 303, `ratePerDay` 0.12, `productMaterial`,
  `turnedMaterial`, `turnDays` 3, `sealedOnly`, `kind:
  'batch'|'culture'`, `mechanism`, `strain`, `requiresStrain`,
  `wildStrain` 'wild', `spontaneousLagDays` 0, `killK`, `stallAboveK`,
  `leesFraction`, `leesMaterial`, `starveDays` 14, `foreshotCharacter`.
  Rows are found by **path infix `/idea/maturation/`** over every root.
  Exemplars: `trade-brewing/content/trade/brewing/idea/maturation/ale.yaml`
  (batch; `spontaneousLagDays: 4`, `turnDays: 4`, lees), `ale-culture.yaml`
  (culture; `strain`, `starveDays: 12`),
  `trade-textiles/.../retting.yaml` (sugar-free batch with a
  `turnedMaterial`).
- `platform/thing/Vat.ts` = `VesselKindMixin(MaturingMixin(CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(DetailedMixin(Thing)))))))`;
  constructor sets `interiorBulk`, `category 'vat'`, capacity 100 L,
  closure `liquidTight`; seal toggles and moves reconcile the batch
  before re-anchoring. `jar-of-barm.yaml` (trade-brewing) is a `Vat`
  row, `category: culture-jar`, capacity 2, `interiorMaterial:
  …/ale-lees`.
- `platform/thing/Receptacle.ts` = `ThermalMixin(BulkableMixin(Thing))`
  — "ThermalMixin outer of Bulkable: capacity derives from contents".
  `platform/thing/GradedReceptacle.ts` = `BrandedMixin(CraftedMixin(BulkableMixin(Thing)))`
  — **no Thermal**, with a `verdictAugmenter` and re-surfaced Graded
  accessors. Composers: **two rows** (`trade-farming/.../crop/flax-sheaf.yaml`,
  `trade-textiles/.../flax-bale.yaml`) and `platform/thing/Bottle.ts`
  (`VesselKindMixin(CirculatingMixin(SealableMixin(DetailedMixin(GradedReceptacle))))`)
  — so **no Bottle has a temperature today** either.
  `platform/thing/CraftVessel.ts` (`Contaminable(Serviceable(VesselKind(Crafted(Thermal(Bulkable(Container(Detailed(Thing))))))))`);
  `trade-cooking/src/thing/CookPot.ts` = `ManualBuildMixin(ToolMixin(DurableMixin(ServingVessel)))`,
  `capabilities: ['pot']`, contributes `heat.yaml`/`cook.yaml`/`plate.yaml`
  via a **static `commandContributions`** (the row-level key is dead —
  `trade-dyeing/src/thing/DyeVat.ts:28` says so).
- `lib/bulk/Bulkable.ts` `BulkPayload` extension pattern: `declare
  module '../bulk/Bulkable'` from the owning folder (five extenders).
  Bulk mass is **not** folded into `Tangible.getMass()` (the encumbrance
  read `lib/encumbrance/LoadBearing.ts:167` uses the authored mass) —
  a sack's mass is whatever was authored or `setMass`ed.
- `BulkableLogic.requiredClosureFor(_material)` always returns
  `'liquidTight'`; there is no granular phase. The malt sack
  (`distribution/content/trade/distribution/thing/malt-sack.yaml`) is a
  plain `/platform/thing/Receptacle`, 25 L, `interiorMaterial:
  /stuff/idea/material/food/malt`, no `VesselKind`, no mass.
- Measure grammar (`QuantityLogic.ts:59–72`) is units only.

### Craft sequencing, the manual build, engagements (S4)

- `lib/script/Coroutine.ts:169–183` — the **await-engaged pacing rule**
  (a dispatched command that started an engagement suspends the script
  until it completes); `wait <dur>` parses at `Interpreter.ts:355` and
  rides `WorldClockApi.after` (`Coroutine.ts:204`). **S4 needs no
  engine work.**
- `lib/craft/ManualBuild.ts` — `Builds` surface: `addContribution`,
  `setBuildMethod(method)` (an **open string** `BuildMethod =
  Technique`), `noteHeat`, `recordCommand`, `getContributions`,
  `clearBuild`. Runtime-only; the physical matter is debited off the
  source to the discard sink — **a build buffer holds no bulk**, so a
  buffer cannot proof.
- `platform/idea/cmd/crafting/StirController.ts` (`stir`/`shake`)
  extends `ManualBuildController` (`engageStep`, `findBuildVessel`,
  `paceMs`, `declineStep`); `trade-hospitality/src/idea/cmd/crafting/StrainController.ts`
  is the terminal-mint shape (`CraftingApi.mintFromBuild({ vessel:
  into, … })`). `pour.yaml` carries `verbs: [pour, add]`.
- `lib/craft/ManualBuildStep.ts` — `{actor, slots, durationMs,
  onComplete, onAbort?, host?}` over `SchedulerApi.start`;
  `trade-fuel/src/idea/cmd/fuel/CharController.ts` is the durative
  precedent (slot `attention`, completion in a **module-level async
  function** because the controller clone is destructed when `execute`
  returns; re-issuing the verb adjusts the running burn).
- `platform/idea/cmd/crafting/CraftController.ts:46` `requireDeed(context,
  recipeRef, verb)` — the by-hand-then-shorthand knowledge gate;
  `trade-cooking/src/idea/cmd/crafting/CookController.ts` is the
  27-line exemplar (craft → move output to giver → scene).

### Water, power

- `packages/content/water/src/thing/ControlStructure.ts` —
  `controlKind`, `reachRef`, `passFraction`, `divertsTo`, `headM`,
  `generates`, `ownerRef`; `generationW(flowM3S) = ρ·g·headM·Q·η`
  (η from `water.turbineEfficiency`, 0.85); `withdrawalM3S = arriving ·
  (1 − passFraction)`. Nothing in the tree consumes the wattage.
- `water/src/idea/WatercourseCatalogue.ts` — `WATERWORK_CLASSES`
  (94–97) is the draw roster (`Conduit`, `ControlStructure`), found by
  `Template.findByClass` (815) — **a row of class
  `/system/water/thing/ControlStructure` anywhere is a water work with
  no roster edit**. `flowAt(ref, nowS, draws?)` (438) → `FlowReading`
  (`m3s`, `navigable`…), memoised per 6-game-hour weather segment.
- `packages/content/transport/src/idea/FordExit.ts` — the cross-pack
  read: `StuffApi.singleton('/system/water/idea/WatercourseCatalogue')`,
  duck-typed `flowAt`, memoised on the segment; **no dependency on the
  water package**.
- `terminus/content/world/terminus/wharfside/thing/aqueduct-house.yaml`
  — `reachRef: cold-fell:cascade`, `passFraction: 1`, `headM: 60`,
  `generates: true`, `ownerRef: "group:terminus"`. The mill's charter.
- `world-seed/content/stuff/idea/Watercourse/delight.yaml` — nodes
  `spring` 720 m (190 km²), `flats` 180 m (width 22, 240 km²), `mouth`
  35 m; "what the model asks of that build is a single declared field"
  (`_reach` on the Locality).
- The instrumentation split precedent: platform
  `content/platform/cmd/perception/measure.yaml` stanzas `strike`/`dip`
  name `controller: /trade/mining/idea/cmd/perception/…`;
  `analyze.yaml` has `ground`, `response`, `weapon`, `electrical`…
  the same way. A pack controller is registered by a row at
  `<root>/idea/cmd/<category>/<Name>Controller.yaml` (`class:` +
  `data: {}`).

### Packs, world, addresses

- `StuffApi.resolveClassFile` (`api/stuff.ts:320–350`): longest
  registered root wins; the class path's tail IS the file under
  `src/`; a pack root with `src/` **throws** on a missing file (never
  falls back to the kernel); a pack with **no `src/`** (`srcRoot ===
  null`, `PackLogic.ts:576`) registers no root and its class paths
  resolve to the kernel. `rejection` ships no `src/`; `hinkley-hills`
  ships `src/__tests__/` only (the footgun).
- `trade-fuel` is the thin-pack template: `pack.yaml` (closed keys
  `id, version, description, root, requires{groups,title}, boot,
  maintainers`), `package.json` (deps on `@saxonberg/server`, `types`,
  `content-platform`, `content-base-library`, `content-generic-objects`),
  `tsconfig.json` (`extends ../../../tsconfig.base.json`, `noEmit`,
  `include: src/**/*`), `vitest.config.ts` with `callSecPlugin()`; the
  root `package.json` dependency list is the deployment manifest
  (lines 5–47, alphabetical).
- Server `exports` map: `./mud/lib/*`, `./mud/api/*`,
  `./mud/platform/thing|idea|agent|location/*`; `platform/idea/api/*`
  and `hooks/*` are `null`. Subpath patterns match nested paths, so
  `@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController`
  resolves.
- `platform/idea/AddressRegistry.ts:189` walks
  `TemplatePathRosters.locality = ['/platform/idea/Locality/',
  '/stuff/idea/Locality/']` (`lib/paths.ts:119`) and keeps rows whose
  `class === '/platform/idea/Locality'`. All eleven Locality rows live
  in `world-seed/content/stuff/idea/Locality/` (`rejection.yaml`:
  `_address: terminus/rejection`, `_reach: kestrel:headwaters`,
  `_catchmentKm2: 30`, no `_governmentKey`). `Locality.ts` fields:
  `name`, `_address`, `_weatherPin`, `_climateLean`, `_governmentKey`,
  `_reach`.
- `terminus/content/world/terminus/delight-road/crossroads.yaml` —
  `_address: terminus/delight-valley/crossroads`, exits `north`
  (flats, `edgeMinutes: 8`) and `west` (rejection's `lower-climb`,
  cross-pack, authored on both sides); **no `south`**; the `roads`
  detail has **no direction keywords** (a recorded bug). The zone
  `delight-road.yaml` is a `CartesianZone`, `cellSize: 20.0`.
- `terminus/content/world/terminus/market/square.yaml` exits:
  `northeast` (avenue-block), `south` (wharfside/bank); `west`,
  `north`, `east` are free.
- Land use vocabulary (`lib/parcel/LandUse.ts:71`): `residential ·
  agricultural · commercial · industrial · civic · wild`.
- Cast rows: `rejection/content/world/rejection/agent/storekeeper.yaml`
  (`/platform/agent/Cast`, `archetype:` a free string stamp
  (`lib/npc/Cast.ts:124`), `prologue`, `competence[{discipline,
  asserting}]`, `dispositions`, `behaviors`); `lint:dossiers` rules:
  `archetype:` required, every `competence[].discipline` must be a
  shipped Discipline, every `asserting:` derivable, ceiling of
  undossiered Cast = **0**.
- `platform/idea/Discipline.ts` fields: `key, channel, label,
  description, iscedf, requires, specializes, synergizes, conferrals`;
  `DisciplineCatalogue` warms by class (any root). Exemplar
  `platform/content/platform/idea/Discipline/cooking.yaml`
  (`channel: skill`, `iscedf: "1013"`, `requires: [recipe-knowledge]`).
- Business: `platform/idea/Business.ts` + the
  `hearthworks/content/world/hearthworks/idea/business.yaml` exemplar
  (`appointingAuthority`, `positions[{key,noun,label,wageRate,confers}]`,
  `rosterSlots`, `banksAt`, `operatingLocations`). Prices live on
  fixtures: `platform/thing/Stock.ts` (`stockLines`, `prices` —
  `distribution/.../counter.yaml` stocks `malt-sack` par 6 at 5),
  `platform/thing/Tariff.ts` (services from a **closed kernel
  vocabulary** — adding a `mill` service would be a kernel edit),
  `lib/retail/Consignment.ts` (`heldGoods`, `listingCapOverride`).
- `trade-farming/src/behavior/farms.ts` — the producer brain: waters,
  feeds, **picks ripe occupants**, carries the take to a stall and
  `consign`s it; **it does not sow**. The campus field is
  `eternal-university/content/world/eternal/campus-field/location/home-field.yaml`
  (`class: /trade/farming/location/Field`, `areaM2: 400`) beside
  `idea/ground.yaml`.
- Barley (trade-farming): species `…/poaceae/hordeum/vulgare.yaml`;
  material `content/stuff/idea/material/food/barley-grain.yaml`
  (`class: /platform/idea/material/Material`, density 620,
  `nutrientAmounts: {carb: 730000, protein: 105000}`, tags `food grain
  cereal brewing feed`, **no `waterActivity`/`spoilActivationEnergy`** —
  inert); `thing/crop/barley.yaml` (`/platform/thing/Crop`, `mass:
  25`, a tangible sack); `thing/plant/barley.yaml` (profile
  `coldStopK: 278`, `warmHappyK: 289`, `moistureWiltAt: 0.05`,
  `daysToStage {16, 50, 100}`, `nutrientDraw: 18`); `thing/seed/barley.yaml`.
  `Crop.ts` = `CraftedMixin(DetailedMixin(Thing))`, zero own fields;
  `HarvestController.ts:175–200` stamps `Grade.of(bandFor(worstLimiting))`.
  ⚠ `base-library/.../food/malt.yaml` authors `nutrientAmounts: {carb:
  14000, sugar: 80}` — a different scale from barley's; the two packs
  disagree on the unit. Noted, not fixed here.
- Mash recipes: `trade-brewing/content/recipes/mash.yaml`,
  `lager-mash.yaml`, `trade-distilling/content/recipes/wash-mash.yaml`
  — each `slot: malt, category: malt, measureL: 4` + water 16 L,
  `toolCapabilities: [mash-tun]`, residue `spent-grain`.
- Lint roster: 39 `lint:*` scripts (`pnpm -C packages/server
  lint:family --list`); `check-verb-collisions.ts` holds 9 known
  collisions; 250 command views today.
- Wire suite: `packages/wire/tests/*.wire.test.ts` /
  `*.dirty.wire.test.ts` (`farmstead.dirty.wire.test.ts` is the
  `declareFile` + `DIRTY_REASON` exemplar).

---

## Plan-level decisions

### D1 — S1: a furnace heats what it HOLDS and what RESTS on it, through Thermal's own ambient

**Question.** Does `Oven` become a Container, and how does a non-Meltable
Thermal host near a fire accumulate temperature?

**Choice.** Three small edits, no new integrator:

1. `Oven` composes `ContainerMixin` inside `ThermalMixin`:
   `FurnaceMixin(LightSourceMixin(ReservedMixin(ThermalMixin(ContainerMixin(Thing)))))`.
   `Campfire` composes `SurfacedMixin` (a pot rests ON a fire). `Kiln`
   and `Forge` are untouched — a forge is not a chamber you put bread
   in, and their Meltable path (`heatContents`, the sibling walk) is a
   different mechanism (radiant transfer to a workpiece in the room)
   that stays exactly as it is.
2. `ThermalMixin.restamp()` asks for a **heat source** before the biome
   resolve: if the host's container is a lit, fuelled `Furnace`, or the
   host's `getRestingOn()` is one, the ambient is that furnace's
   `getHeldTemperatureK()`; otherwise the biome chain as today. This is
   one private method `heatSourceK(): number | null` on the mixin, read
   only inside `restamp()`. Newton drift toward the furnace's held
   temperature with the host's own `τ = R·C` then IS the warm-up: a
   loaf climbs toward 500 K over its own time constant; a pot of water
   (`Bulkable` + Thermal) climbs toward 500 K and `reconcilePhase`
   pins it at 373 K when it boils (already implemented for
   Bulkable+Thermal hosts, `Thermal.ts:698`).
3. `FurnaceMixin` fans out `restamp()` over its **heat scope** —
   `getContents()` if the host is a Container, `getResting()` if it is
   Surfaced — from `_setLit()` and from the burnout branch of
   `reconcileFurnaceFuel()`. That is the eighth re-stamp trigger class
   and it is the same shape as `Atmospheric.setTemperature`'s fan-out.

**Rejected.** `AtmosphericMixin` on `Oven` (14 fields — pressure, wind,
gravity, a biome ref — claimed for a clay oven; the temperature seam is
the only one wanted). Adding a furnace term to `BiomeLogic` (a lit
forge would then warm a room, which the grounding says it must not).
Making `Oven.getTemperature()` climb instead of pin (it would change
every forge/kiln melt test; the firebox is hot, the *chamber contents*
warm — that is what the drive's step 21 observes).

**Consequence for the drive.** Step 21 reads "climbs toward 500 K over
time" — the furnace pin is unchanged, so what climbs is the loaf/pot
inside it. The drive record should say so.

### D2 — the thermal dose is a twelfth integrator, and here is why that is right

**Question.** Where does the cook-dose accumulator live?

**Choice.** `packages/server/src/mud/lib/thermal/ThermalDose.ts` — the
`Freshness.ts` shape verbatim: a value class `ThermalDose` (the model
as statics; an instance over a `BulkSlot` for the reads/writes), a
`ThermalDoseMixin` for tangible hosts, and a `declare module
'../bulk/Bulkable'` merge adding `dose?: { doseS: number; scorchS:
number; stamp: number; tempK: number }` to `BulkPayload`. Composed on
**`Provision`** (tangible food) and read off the payload for bulk food
(a dish in a pot). Registry entry `Mixins.ThermalDose = 'ThermalDoseMixin'`.

**The model.** One accumulator, thermal-death-time form (the F-value):

```
doseS   += ∫ 10^((T(s) − Tref) / z) ds        for T ≥ floorK, else 0
scorchS += ∫ 1 ds                              for T > ceilingK
```

`Tref = thermal.dose.referenceK` (373), `z = thermal.dose.zK` (33 K —
a browning/doneness z, NOT the kill's; see below), `floorK =
thermal.dose.floorK` (323 — below it nothing cooks). `ceilingK` is the
object's recipe's `maxHeatK` (D4) when it has a recipe (`Crafted.recipe`
on a tangible, `payload.recipeId` on bulk), else
`thermal.dose.defaultCeilingK` (470 — where sugars char). Doneness for a
recipe `R` is `doseS · 10^((Tref − R.requiresHeatK)/z) / R.holdS`; the
bands are ratios (`raw < 0.5 ≤ underdone < 1 ≤ done < 1.5 ≤ overdone <
3 ≤ burnt`) and `scorched` is `scorchS ≥ thermal.dose.scorchedAtS`
(60 s). `burnt` also writes the host's Graded face down to `poor`
(monotone min, on reconcile — `Maturing.applyBatchGrade`'s shape). A
host with no recipe reads its bands against the dial reference alone
(`raw`/`warmed`/`cooked`/`scorched`) — enough for a cut in a pan.

**Why not the rectangle rule.** The gauge stores `tempK` at its last
reconcile. On reconcile it reads the host's current temperature and
integrates along the exponential between the two samples (8 Simpson
sub-steps on `Decay.toward(prev, now-asymptote, s, τ)` with the host's
`getTau()`), which reproduces the real Newton trajectory whenever the
ambient was constant across the gap — the same assumption the thermal
model itself makes. That is a dose, not a sample.

**Why a twelfth.** (a) `Decay.ts` refuses it by name: the rate is a
subsystem's quantity (log-linear in T), not a free parameter. (b) It is
not `Freshness`'s integrator: freshness integrates a *population* under
a growth law with a water-activity term and a material dependence; the
dose has no material term, no floor of that kind, and an opposite
sign convention. Folding it into Freshness would hang a cooking gauge
on a hide. (c) It has no far-past guard and no linkdead freeze
(`Freshness`'s reasoning: an item has no Interactive, and a loaf left
in an oven overnight burns — `Thermal`'s guard keeps the loaf's
*temperature* stamped hot, and the dose bills that). (d) It is one
integrator with three readers — doneness, scorch, and the recipe-time
kill hold — not three integrators.

**The kill is NOT re-based onto this gauge.** The kill has its own
Arrhenius (`Ea = 200 kJ/mol`, roughly z ≈ 7 K near 333 K) and a
z = 33 doneness dose cannot be re-based to it. The passive kill already
integrates while hot (`Freshness.growthRate < 0` above `killK`); what
was optional was the *recipe-time* hold — D3.

### D3 — the recipe hold is never zero, and `resolveSpoilage` loses its threshold

`Recipe.getHoldS()` returns `this.holdS > 0 ? this.holdS :
dial(thermal.dose.defaultHoldS)` (1200 game-seconds). `resolveSpoilage`
drops the `effectiveHeatK < killTemperatureK() → return untouched`
branch and always calls `Freshness.killOver(blended, holdS,
effectiveHeatK)` — which itself returns the load untouched below
`killK`, so nothing below the kill changes; what changes is that every
working *above* it is integrated as a rate held for a time instead of
short-circuiting to `0`. `formed` (the ptomaine already made) is
computed exactly as today (only when `T ≥ killK`). The tangible arm
(`outputMicrobialLoad`, line 1148) reads the same `getHoldS()` and
changes with it.

**AC15 consequence.** A recipe at ≥ 373 K with a 20-game-minute hold
at `killRatePerHour: 6` (Arrhenius-steepened) leaves a load
indistinguishable from `0`; a recipe between 333 K and ~350 K may now
leave a residual load where it left none. W1 censuses the 19 cooking
recipes' `requiresHeatK` and records which (if any) fall in that band
in the plan; that IS the "sear vs lazy warm-through differ by default"
the requirements ask for, and the ptomaine recalibration (W10) is the
matching obligation.

### D4 — `maxHeatK` on `Recipe`, sentinel `0`, and the burnt outcome is a BAND

`Recipe.maxHeatK: number = 0`, persistent, spoiler-tagged; `fromData`
rejects a negative value and rejects `0 < maxHeatK < requiresHeatK`.
Enforced twice: at resolve, when `effectiveHeatK > maxHeatK > 0` the
working still mints (never a decline) and stamps `scorchS` past the
scorched band — the outside burnt because the fire was too hot (drive
33). After the mint, the gauge accrues `scorchS` on the object while it
sits above the ceiling (drive 32, 42). **Burnt is the object with the
band**, plus the Graded write-down to `poor`. No burnt template, no
second terminal: "another off-spec terminal beside the pot-luck mint"
would put a second object shape where one band on the first object
already says everything the player can perceive. The mint stamps the
output's dose at exactly `holdS`-equivalent (the one-shot working "was
as long as it needed" — today's semantics, preserved), so every
one-shot dish is minted **done** and only physics takes it past.

### D5 — staling is a pack mixin on a pack class, not a fifth gauge on `Provision`

`StalingMixin` lives in **`packages/content/trade-baking/src/lib/Staling.ts`**
(`/trade/baking/lib/Staling`) and composes on
**`trade-baking/src/thing/Loaf.ts`** = `StalingMixin(Provision)`
(`/trade/baking/thing/Loaf`). One composer today; the kernel test for
substrate is "composers with no common pack ancestor", and the
requirements' kernel list names five things and staling is not among
them. When cooked rice or a potato wants retrogradation, that is the
third-pack signal to promote it to `lib/material/`.

Fields: `_staleness` (0..1), `stalingClockStamp`, `stalingTempK`.
Rate: `k(T) = kPeakPerHour · exp(−((T − peakK)/sigmaK)²)` with
`peakK = 277`, `sigmaK = 12`, zero at or below 273 K (frozen pauses),
so room temperature (293) runs at ~0.17 of peak — a cold larder stales
fastest, exactly the requirements' table. **Re-baking**: at `T ≥
refreshK` (330) staleness *falls* at `refreshPerHour` toward a floor
of `refreshFloor` (0.2 — "partly"). All five numbers are **authorable
fields with class defaults on `Loaf`** ("the staling axis's authored
data" is the pack's; no kernel dial, no `AppSettingKeys` edit). No
far-past guard, no linkdead freeze — Freshness's reasoning applies
unchanged, and it is the whole point that bread stales while you are
away. Bands `fresh < 0.25 ≤ firm < 0.5 ≤ stale < 0.8 ≤ hard`, phrases
disjoint from `FRESHNESS_PHRASE` (a test asserts the two vocabularies
share no word). `markupAugmenters` adds the band line on `look`.

Same-sample rule as Freshness (single sample per reconcile): staling
runs over hours-to-days, and the loaf's thermal τ is minutes; the
rectangle rule is honest at that ratio.

### D6 — the flour sack: `GradedReceptacle` gains a temperature, and `Sack` is its kinded twin

`GradedReceptacle` becomes `ThermalMixin(BrandedMixin(CraftedMixin(BulkableMixin(Thing))))`
(Thermal outer of Bulkable, the `Receptacle` rule). **What that
claims:** two flax rows and every `Bottle` now have a temperature. All
three should: a bottle in a cellar is cold, and a bottled ale's
freshness gauge has been reading a default holder temperature until
now. `Bottle` composes `SealableMixin`, so a corked bottle also gets
the `vacuum` barrier (hours-long τ) — the Flask rule, and correct.
`VesselKindMixin` is **not** added to `GradedReceptacle` (Bottle already
wraps it; a double composition is the bug).

New kernel class `platform/thing/Sack.ts` = `VesselKindMixin(DetailedMixin(GradedReceptacle))`,
constructor `interiorBulk = true`, `category = 'sack'`, closure
`liquidTight`, capacity 25 L — a graded, marked, kinded, thermal bulk
holder for dry goods. Rows: `flour-sack`, `bran-sack`, `grist-sack`,
`toll-bin` (trade-milling). The malt sack is **not** migrated (its
missing `VesselKind` is a distribution finding, recorded in § Risks).
Grade and the miller's mark ride the sack's Crafted face — the holder
convention.

### D7 — the dough: a `Vat` that is also a build vessel, and `knead` is the build's terminal

`trade-baking/src/thing/DoughTrough.ts` = `ManualBuildMixin(Vat)`,
`category = 'trough'`, capacity 20 L, `static commandContributions`
affording `platform/cmd/crafting/pour.yaml` (`pour`/`add`),
`trade/baking/cmd/baking/knead.yaml`, `trade/baking/cmd/baking/bake.yaml`
(environment + peers). Bulkable is mandatory (`Maturing.__validateComposition__`),
and `Vat` brings Sealable (a cloth over the trough is a seal: closed
keeps wild flora out, open lets them in — `spontaneousLagDays` is
OPEN-only).

**`knead` is a `ManualBuildController` step that ALSO mints.** A build
buffer holds no bulk, so a kneaded buffer cannot proof; the kneading
is therefore where the dough becomes matter: `KneadController` sets
`setBuildMethod('kneaded')`, engages `hands` for `paceMs`, and on
completion calls `CraftingApi.mintFromBuild({ vessel: trough,
contributions, method: 'kneaded', … })` exactly as `StrainController`
does — the buffer reverse-matches the `dough`/`wholemeal-dough` recipe
(exact cover), the trough's own bulk slot fills with the dough
material at the summed volume, grade weakest-link, the deed is
captured. ⚠ The requirements say "`knead` is a mix method, not a
subsystem"; this keeps that (one controller, an open method word, no
schema) but makes the word the terminal as well. Recorded in § Risks.

Materials (commons, shipped by trade-baking under
`content/stuff/idea/material/food/`): `dough`, `wholemeal-dough`,
`proofed-dough`, `proofed-wholemeal-dough`, `collapsed-dough`, `bread`,
`wholemeal-bread`, `levain`. The doubling is the cost of nutrition
riding the material (a tangible has no payload), and it is rows.
Profiles (`content/trade/baking/idea/maturation/`): `bread-dough`
(`kind: batch`, `inputCategory: dough`, `spontaneousLagDays: 1`,
`wildStrain: sourdough`, `stallBelowK: 288`, `happyK: 300`,
`damageAboveK: 308`, `killK: 323`, `ratePerDay: 6`, `productMaterial:
proofed-dough`, `turnedMaterial: collapsed-dough`, `turnDays: 0.5`,
`leesFraction: 0`), `wholemeal-dough` (same, over `wholemeal-dough` →
`proofed-wholemeal-dough`), `levain-culture` (`kind: culture`,
`strain: sourdough`, `inputCategory: levain`, `starveDays: 7`). The
starter is `content/trade/baking/thing/starter-crock.yaml` — a `Vat`
row, `category: culture-jar`, 2 L of `levain` (the `jar-of-barm`
shape); pitching is `pour` (the strain-transfer seam is the shipped
one). Over-proofing is D3's turn, unchanged.

### D8 — the mill: a kernel `ComminutingMixin`, a pack `GristMill` class, two rows

Kernel: `lib/craft/Comminuting.ts` → `ComminutingMixin` (host: a
`Tooled` Thing). Fields (persistent, authorable): `throughputKgPerMin`
(the unpowered rate), `kgPerMinPerKw` (0 = unpowered),
`maxThroughputKgPerMin`, `extractionMin`, `extractionMax`,
`extractionDefault`, `products: [{ maxExtraction, material }]`
(ascending), `residueMaterial`, `productVessel`, `residueVessel`
(template paths), `tollFraction`, `tollBinPath`. Methods:
`planComminution(input: { kg, material, grade, maker }, extraction):
ComminutionPlan` (pure arithmetic — clamp extraction, `productKg = kg
· e`, `residueKg = kg · (1 − e)`, `tollKg = productKg · tollFraction`,
litres via each output material's density, the product material by
the first `products[]` band ≥ e, grade = weakest link of the input
grade and this instrument's control floor), `grindMs(kg)` (=
`kg / throughput`, in game-minutes → real ms at the clock scale), and
`availablePowerW()` (0 on the kernel mixin — the power read is the
pack's, D9). The second consumer (the stamp mill) authors ore products
and a tailings residue on the same fields; that is why the vocabulary
is `product`/`residue` and not `flour`/`bran`.

Pack: `trade-milling/src/thing/GristMill.ts` =
`ComminutingMixin(ToolMixin(DetailedMixin(Thing)))`, `capabilities:
['millstone']`, `static commandContributions` affording
`trade/milling/cmd/milling/mill.yaml`; it overrides `availablePowerW()`
(D9). Two rows: `content/trade/milling/thing/quern.yaml`
(`throughputKgPerMin: 0.25`, `kgPerMinPerKw: 0`, control floor absent)
and `grist-mill.yaml` (`throughputKgPerMin: 0`, `kgPerMinPerKw: 0.5`,
`maxThroughputKgPerMin: 10`, `tollFraction: 0.1`, `tollBinPath:
/trade/milling/thing/toll-bin`, `capabilities: [{kind: millstone,
control: fine}]` so the mill floors flour at `fine` via
`applyControlFloor`). The instrument-affords-the-verb pattern: two
rungs as rows, one class.

`MillController` (`trade-milling/src/idea/cmd/milling/MillController.ts`,
view `mill.yaml` args `grain: object reachable` + `extraction: number
optional`): resolves the reachable mill (`instanceof GristMill` in the
room — the `char` precedent), reads the input as either a tangible
`Crop` (`getMass`, material, grade, maker) or a bulk holder whose
material carries tag `grain` or `malt` (litres × density), builds the
plan, engages `['hands','attention']` for `grindMs`, and completes in a
**module-level async function**: clone `productVessel`/`residueVessel`
(`StuffApi.clone`), fill via `BulkableApi`, `setMass` (tare + kg),
stamp grade + maker (`CraftedMixin.stamp`), move the toll into the
toll bin, destruct or drain the input, scene. Re-issuing `mill` while
milling adjusts nothing and declines (`already-milling`).

**The toll is in kind** (multure), not money: a fraction of the flour
stays in the mill's bin and the miller sells it. That is "pays for the
premises" with zero banking code and no edit to `Tariff`'s closed
service vocabulary (rejected: a `mill` service kind — a kernel edit for
one venue). The quern has no toll.

### D9 — the power read: a water-pack controller, a duck-typed consumer, no dependency

The millrace is a **`ControlStructure` row in the locality pack**
(`hearts-delight/content/world/hearts-delight/thing/millrace.yaml`,
`class: /system/water/thing/ControlStructure`, `controlKind: weir`,
`reachRef: delight:flats`, `passFraction: 1`, `headM: 6`, `generates:
true`, `ownerRef: "group:hearts-delight"`). No `WATERWORK_CLASSES`
edit; the catalogue finds it by class. `passFraction: 1` is what makes
the claim non-consumptive (AC 18): `withdrawalM3S` is 0.

`GristMill.availablePowerW()`: find a room sibling that duck-types
`generationW(flow)` and `getReachRef()`; resolve
`/system/water/idea/WatercourseCatalogue` by `StuffApi.singleton` and
call `flowAt(reachRef, nowS)` (the `FordExit` shape, memoised on the
6-game-hour segment); return `sibling.generationW(m3s)`. No wheel, no
water pack, or no flow → 0 → the row's unpowered rate (a grist mill
with no water grinds at 0 kg/min and says so). `trade-milling`'s
`package.json` does **not** depend on `content-water`.

`analyze power [target]` is a stanza on the platform's `analyze.yaml`
whose controller is the **water pack's**
`/system/water/idea/cmd/perception/AnalyzePowerController` (the
mining `analyze ground` precedent). It reports, for a target that
duck-types `generationW`, the flow and the watts; for one that
duck-types `availablePowerW`, the watts and the throughput. The
aqueduct house answers its own docstring's invitation through the same
controller (drive 19).

### D10 — extraction is an option on the verb, bounded by the instrument, banded by the row

`mill <grain> --extraction 0.72` — the view's `extraction` arg,
defaulting to the mill row's `extractionDefault`, clamped to
`[extractionMin, extractionMax]`. The product material is the row's
`products[]` band (quern and mill both: `{maxExtraction: 0.75, material:
white-flour}`, `{maxExtraction: 1, material: wholemeal-flour}`); bran is
always minted as `residueMaterial` in the `residueVessel`. Rejected:
per-recipe extraction (milling is not a recipe — a recipe's residue is
a fixed count, and the miller's decision is the whole point) and a
setting on the mill (a decision made once is not a decision).

### D11 — `bake` mints INTO the oven; `make` stays the platform shorthand

`trade-baking/src/idea/cmd/baking/BakeController.ts extends
CraftController`: `requireDeed(context, model.loaf, 'bake')`,
`CraftingApi.craft({recipeRef, makerMode: 'self'})`, then
`ContainmentApi.move(output, oven)` where the oven is the lit furnace
`reachableHeatK` found (a `Container` furnace in the room); if the
furnace is not a container (a campfire), the loaf goes to the giver
as `cook` does. The loaf is minted done (D4) and burns by staying. The
platform `make lean-loaf` also works (mints to hand) — the drive's
step 29 says either.

**Kernel edit this needs:** `applyTangibleOutput` accepts a recipe with
**no item inputs** when `outputMaterial` is authored: material =
`outputMaterial`, mass = Σ(bulk litres × source material density).
Today it throws. Two lines and a test.

### D12 — Heart's Delight: no `src/`, the Locality row in world-seed, the road authored on both sides

`packages/content/hearts-delight/` ships `pack.yaml`, `package.json`,
`README.md`, `content/` and **nothing else** — the `rejection` shape.
No `tsconfig.json`, no `vitest.config.ts`, no `src/__tests__/` (the
`hinkley-hills` footgun: a `src/` with tests only makes `srcRoot`
non-null and every class path under the root throws instead of
resolving to the kernel). Its tests are the wire drive.

The Locality row lives at
`world-seed/content/stuff/idea/Locality/hearts-delight.yaml`
(`_address: terminus/hearts-delight`, `_reach: delight:flats`,
`_catchmentKm2: 40`, no `_governmentKey`) — where all eleven live,
because the `AddressRegistry` roster is `/stuff/idea/Locality/` and
because a locality is the realm's. ⚠ The requirements say the pack
"carries the Locality row"; the product meaning (the valley exists as
a place) holds, the file lives with its siblings. No `Government` row
(the bible's government is the valley's own build).

`pack.yaml`: `root: /world/hearts-delight`; `requires.groups:
[{name: hearts-delight, purpose: the valley's own body, owner: {office:
prime-minister}}]`; `requires.title: [{extent: /world/hearts-delight,
holder: {group: hearts-delight}, landUse: agricultural}]`. No `boot`.

The road: `terminus/.../delight-road/crossroads.yaml` gains `south:
{destination: /world/hearts-delight/valley-gate, media: [ground],
edgeMinutes: 10, wheelPassable: true}`; `hearts-delight/content/world/hearts-delight/valley-gate.yaml`
carries `north` back. Both sides, both packs, explicitly. The
crossroads' yard, stone and ditch are not touched (the depot's).

Rooms (`/platform/location/SingletonCartesianLocation`, zone
`hearts-delight.yaml` a `CartesianZone` `cellSize: 20.0`, every room
with `coords`): `valley-gate` (the road enters the valley; the flats'
orchards are described, not built), `bench-lane` (climbs to the
bench), `farmstead-yard` (the farmer, the barn door, the shelf),
`barn` (the sacks), `upper-bench` (a `/trade/farming/location/Field`
+ `idea/ground.yaml`, `areaM2: 4000`, the campus home-field shape,
sown with `plant/wheat` rows at `established` stage), `millsite` (the
Delight running past, the millrace, the grist mill, the toll bin, the
miller). Exits: gate → lane → yard ↔ barn; yard → bench; lane →
millsite (down to the water). Every room carries `_biomePath`,
`ambientIntensity`, `_address` under `terminus/hearts-delight/…`.

Cast: `agent/farmer.yaml` (`/platform/agent/Cast`, named — the
farmstead is somebody's; `archetype: farmer`, `competence:
[{agriculture, proficient}, {soil-science, competent}]`, `behaviors`:
`introduces`, `idles`, and the trade's `farms` brain with `home:
farmstead-yard`, the shelf as its stall) and `agent/miller.yaml`
(`archetype: miller`, `competence: [{milling, proficient}]`,
`introduces` + `idles`). Businesses: `idea/farm-business.yaml` and
`idea/mill-business.yaml` (the hearthworks shape; positions `farmer`
and `miller`, `confers: [MakerMixin]`). The farm's shelf
(`thing/farm-shelf.yaml`, the retail consignment shelf class the
`farms` brain expects) is stocked by the brain's own picks and by
**eight authored `crop/wheat` sacks in the barn consigned at boot** —
finite. No `stockLines`, no par: a static farm is a source node, never
a faucet.

### D13 — the bakery is a west door off the market square

`terminus/content/world/terminus/market/bakery.yaml` (a shopfront,
new build; `square.yaml` gains `west` → bakery, bakery `east` →
square), `market/agent/baker.yaml` (`Cast`, `archetype: baker`,
`competence: [{baking, proficient}, {cooking, competent}]`, `introduces`
+ `idles`), `market/idea/bakery-business.yaml`, `market/thing/bread-counter.yaml`
(`/platform/thing/Stock`, `stockLines: [{itemTemplatePath:
/trade/baking/thing/lean-loaf, par: 6}]`, `prices: {…: 2}` — the
eternally-fresh NPC shelf the requirements note and do not build) and
a consignment shelf for a player's loaves. Props: `/stuff/thing/Oven`,
`/trade/baking/thing/dough-trough`, `/trade/baking/thing/starter-crock`,
two `/trade/milling/thing/flour-sack` (the baker's own stock, finite),
a `/stuff/thing/fixture/water-butt`, `/trade/cooking/thing/kitchen-salt`.
`terminus/package.json` gains `@saxonberg/content-trade-baking` and
`-trade-milling` (it names their paths).

### D14 — wheat is barley's five rows, shifted where the agronomy says

`trade-farming`: species `…/poaceae/triticum/aestivum.yaml`; material
`stuff/idea/material/food/wheat-grain.yaml` (barley's row with tags
`food grain cereal wheat feed`, `nutrientAmounts` on barley's scale;
inert — grain in a dry sack does not rot); `thing/seed/wheat.yaml`,
`thing/plant/wheat.yaml` (profile `coldStopK: 280`, `warmHappyK: 291`,
`moistureWiltAt: 0.08`, `moistureHappyAt: 0.35`, `daysToStage {18, 55,
110}`, `nutrientDraw: 22`), `thing/crop/wheat.yaml` (`mass: 25`). The
three shifted numbers are why barley carries where wheat struggles
(drive 6); nobody authors the comparison.

### D15 — flour, grist and bran are commons materials shipped by `trade-milling`

`content/stuff/idea/material/food/white-flour.yaml` (density 550,
`waterActivity: 0.62`, `spoilActivationEnergy: 45000`, tags `food
flour white-flour baking`), `wholemeal-flour.yaml` (density 600, `aw
0.68`, more `carb`/`protein`/`fibre`, tags `food flour wholemeal-flour
baking`), `bran.yaml` (density 250, tags `feed bran`, edible false),
`grist.yaml` (density 580, malt's row with tag `grist` instead of
`malt`, `waterActivity: 0.45`). Both flours sit just above the 0.60
growth floor — wholemeal further — which is the whole of "wholemeal
keeps worse" without a keeping flag (drive 11).

### D16 — the retrofit: three recipes change one word, the counter gains one line

`mash.yaml`, `lager-mash.yaml`, `wash-mash.yaml`: `category: malt` →
`category: grist` (the brewer and the distiller want milled malt;
`wash-mash`'s own comment already says "the distiller's grist").
`distribution/.../thing/grist-sack.yaml` (a `Sack` row, 25 L of grist)
and `counter.yaml` gains `{itemTemplatePath: …/grist-sack, par: 6}` at
price **7** beside the malt sack at 5 — whole malt at par, grist at a
markup; a miller undercuts 7 by milling a 5-crown sack. Existing
brewing play keeps working through the counter (AC 13). Lands LAST
(W11) so its blast radius — every brewing/distilling suite, Dave's Bar's
chain — is one commit wide.

### D17 — the new gate is `lint:doneness`, census-then-ratchet, two halves

`packages/server/scripts/check-doneness.ts` (the `check-perishable.ts`
walk): (a) **recipe half** — every recipe with `requiresHeatK > 0`
whose output is edible (`outputApplication: edible`, or `tangible`
with an `outputMaterial` whose Material has `edibility: true`) must
author `maxHeatK ≥ requiresHeatK`; `UNCEILINGED_RECIPE_CEILING` is
today's count when the script lands (W1) and is lowered to **0** in
W10. (b) **row half** — every row whose `_materialPath` resolves to a
Material tagged `bread` must be on a class reaching `StalingMixin`;
ceiling 0 from the first commit (a bread row on bare `Provision` is
the exact silent failure `lint:perishable` cannot see). Runs in the
family with no list edit.

### D18 — verbs, categories, collisions

New views: `mill` (`trade-milling`, category `milling`), `knead` +
`bake` (`trade-baking`, category `baking`), `analyze power` (a stanza,
platform view, water controller). `grind`, `prove`, `shape`, `sift`
are not claimed (a verb nothing needs is a verb). **`score` is not
touched.** Categories `milling` and `baking` are new and are recorded
in `CLAUDE.md § Command YAML views` at the sweep. The 9-collision
baseline holds: `lint:verb-collisions` must report exactly 9 after
every wave.

### D19 — the two Disciplines

`trade-milling/content/trade/milling/idea/Discipline/milling.yaml`
(`key: milling`, `channel: skill`, `iscedf: "0721"`, `requires:
[recipe-knowledge]`); `trade-baking/.../Discipline/baking.yaml` (`key:
baking`, `channel: skill`, `iscedf: "0721"` — the requirements flag the
slate's codes as unverified; 0721 is ISCED-F 2013 *food processing*,
which `fermenting.yaml` already uses, and is correct for both),
`specializes: cooking`, `requires: [recipe-knowledge]`. Both rows must
carry `class: /platform/idea/Discipline` literally (`lint:dossiers`).

### D20 — wave order, and why the retrofit is last

Stage A (kernel) first because six consumers wait on it and every
content wave reads it. Content waves in dependency order (wheat →
milling → baking → the valley → the bakery). The 19-recipe ceiling
pass and the ptomaine recalibration before the retrofit (they touch
`trade-cooking`, whose suites should be green before brewing's are
disturbed). The retrofit last, alone in its commit. The drive last.

---

## ⭐⭐ Host placement

| what | host | what composing it claims | why not the alternatives |
|---|---|---|---|
| `ContainerMixin` | `Oven` (kernel) | a clay oven is a chamber; things go in it | not `Forge`/`Kiln` — a forge is not a chamber; not `FurnaceMixin` itself — every campfire would become a container |
| `SurfacedMixin` | `Campfire` (kernel) | a pot rests on a fire | not on `FurnaceMixin` — an oven's top is not a surface |
| `heatSourceK()` read | `ThermalMixin.restamp()` | every Thermal host can be warmed by the furnace holding it or under it | not on `Furnace` (the furnace does not know its contents' τ); not on `BiomeLogic` (a forge must not warm a room) |
| heat-scope fan-out | `FurnaceMixin._setLit` + burnout | a furnace re-stamps what it heats when its state changes | the `Atmospheric.setTemperature` shape; no new trigger registry |
| `ThermalDoseMixin` | `Provision` (kernel) | **every food can be cooked** — true of the class by name | not `Thing` (the `Freshness off every Thing` shape); not `CraftVessel` (the pot is not what cooks — the dish is; bulk rides the payload) |
| `dose` payload field | `BulkPayload` (declared from `lib/thermal/`) | nothing about hosts; data the vessel carries | the five-extender pattern |
| `maxHeatK` | `Recipe` | a working can state a ceiling | not on the output material (a fat's smoke point is already a material fact; a *dish*'s ceiling is a working's) |
| `StalingMixin` | `Loaf` (`trade-baking/src/thing/`, via `src/lib/Staling.ts`) | **only bread stales** | not `Provision` — a stew does not retrograde; not the kernel `lib/material/` — one composer, one pack (promote on the third-pack signal) |
| `ThermalMixin` | `GradedReceptacle` (kernel) | a graded receptacle — flax rows and **every Bottle** — has a temperature | not a fourth receptacle class; a bottle without a temperature is the defect |
| `Sack` | new kernel class over `GradedReceptacle` + `VesselKind` + `Detailed` | a kinded, marked, thermal bulk holder for dry goods | not `Receptacle` (no grade), not `CraftVessel` (a sack is not a container of things nor a serviceable tool) |
| `ComminutingMixin` | kernel `lib/craft/`, composed by `GristMill` (`trade-milling`) | a tooled Thing can reduce and separate matter | kernel because the stamp mill (metal chain) is the second consumer with no pack ancestor in common |
| `GristMill` | `trade-milling/src/thing/` | two rows (quern, water mill); one class | not two classes — the capital ladder is rows |
| `ManualBuildMixin` | `DoughTrough` (`trade-baking/src/thing/`, over `Vat`) | a proofing vessel is also a build vessel | not `Vat` (a dye vat is not built in); Bulkable via `Vat` is mandatory for `Maturing` |
| `ControlStructure` row | `hearts-delight` content | the millrace is a valley thing | not `trade-milling` (a second mill sites its own wheel; the water pack owns the class) |
| the millsite room | `hearts-delight` | locality = expression | not `trade-milling` (the requirements list the millsite under both; the trade ships the rungs, the valley ships the room) |
| the Locality row | `world-seed` | the valley is the realm's | the `AddressRegistry` roster and eleven precedents |
| wheat rows | `trade-farming` | the trade owns the cereal | not `hearts-delight` (a second valley grows the same wheat) |
| flour/grist/bran materials | commons root, shipped by `trade-milling` | "what things are" | the `trade-fuel` charcoal precedent |
| `Loaf` rows (`lean-loaf`, `wholemeal-loaf`, `flatbread`) | `trade-baking/content/trade/baking/thing/` | recipe output templates | class + rows in one pack |

**The narrowing test, applied.** No guard anywhere re-narrows a host
set: the dose mixin is on the food class and reads nothing but the
host's temperature and recipe; staling is on the one class that
stales; the heat-source read is a property of *every* Thermal host
(any of them can be put in an oven).

---

## Convention conformance

Checked against the tree this cycle, not recalled:

- **`props:` / `cast:`** — every room row uses `props:` for things and
  `cast:` for Cast/Extra rows (`cookhouse.yaml`); `populates:` is
  retired. A verb affordance is a **static `commandContributions` on
  the class** (`DyeVat.ts:28`), never a row key.
- **Locations, not rooms** — rooms are
  `/platform/location/SingletonCartesianLocation` with `coords`; the
  field is `/trade/farming/location/Field`; zones are `CartesianZone`
  with `cellSize`. **Every location plots** (coords on every row).
- **The five axes / `<root>/<branch>/`** — `/trade/milling/{thing,
  idea/cmd/milling, idea/Discipline}`, `/trade/baking/{thing, lib,
  idea/cmd/baking, idea/maturation, idea/Discipline}`,
  `/world/hearts-delight/{agent, idea, thing, <rooms>}`; commons
  materials at `/stuff/idea/material/food/`; the water controller at
  `/system/water/idea/cmd/perception/`. A `cmd` dir is views unless
  its parent is `idea`.
- **Module scope declares; lifecycles initialize** — the new mixins
  and controllers have no module-scope statements beyond declarations
  and `const` construction; the water catalogue is resolved at first
  use (`FordExit`), never at import. `lint:module-scope`.
- **Import boundary** — pack code imports the kernel only by package
  specifier (`@saxonberg/server/mud/lib/…`); the kernel `lib/` imports
  nothing outside `src/mud/`; `AppApi.setting` reads for dials
  (`ControlStructure.ts`'s `dial` shape; in the kernel, `Freshness`'s).
  `lint:imports`.
- **No new module category, no free helper** — `ThermalDose` is a
  value class with statics (the `Freshness`/`Decay` shape);
  `Comminuting` is a mixin; the plan-arithmetic is a method on the
  mixin; `check-doneness.ts` is a script. Pack `src/lib/` holds only
  `Staling.ts` (a mixin factory — the sanctioned exported function).
- **Verbs on objects** — `mill` calls `mill.planComminution(...)`,
  `bake` calls `CraftingApi.craft` (orchestration) then
  `ContainmentApi.move`; no `XApi.verb(host, …)`. `lint:object-verbs`
  census stays 0.
- **`Mixins` registry** — `ThermalDose`, `Comminuting` added to
  `lib/mixin.ts` with their "isn't" phrases; `Staling` is pack-local
  and does not enter the kernel registry (narrow with
  `MixinApi.hasMixin(ctor, 'StalingMixin')` inside the pack).
- **`_mixinName` widens to `string`** on every new mixin.
- **Persistent fields public, TS modifiers in domain code**, reentry
  guards `private _reconciling…` (the Freshness shape); no `#` on
  mixin state.
- **Recipe optionality by sentinel** — `maxHeatK: 0`.
- **The identity key** — makers stamp `getIdentityPath()` (via
  `CraftedMixin.stamp`), never `getTemplatePath()`.
- **No new Mongo collections, no migrations.** Recipe documents gain a
  field with a sentinel default; the dev DB is dropped, not migrated
  (`reset:db`).
- **Never a new `isWizard` check.** None anywhere in this build.
- **Lint gates this build must pass** (the derived family, all 39 +
  the new one): in particular `lint:perishable` (bread rows on `Loaf`
  reach `FreshnessMixin` through `Provision`), `lint:pathogens`,
  `lint:instanceable` (no `/lib/` template; `/trade/baking/lib/Staling`
  has no row), `lint:dossiers` (three new Cast rows, each with
  `archetype:`, derivable assertions; ceiling 0), `lint:verb-collisions`
  (9), `lint:field-meta` (every new persistent field declared),
  `lint:mixin-names`, `lint:module-scope`, `lint:imports`,
  `lint:object-verbs`, `lint:locations` (every new room plots),
  `lint:schema` (no collection change), `lint:test-bootstrap` (every
  wired test imports it), `lint:test-content`, `lint:untitled` (the two
  new packs claim title extents), `lint:drive-scripts` (the drive is a
  wire file, not a script), and the new `lint:doneness`.

---

## Waves

Every wave ends at a green `pnpm test:near` + every touched pack's own
vitest + `pnpm -C packages/server lint:family`, and at one commit.
`pnpm test` runs once, before the MR (W11), and again at `/finalize`.

### Stage A — the kernel

#### W0 — the couple (D1)

Goal: a Thermal host inside a lit oven, or resting on a lit campfire,
drifts toward the furnace's held temperature; nothing else changes.

Files: `lib/thermal/Thermal.ts` (`heatSourceK()`, read in `restamp()`),
`lib/fire/Furnace.ts` (`restampHeated()` private; called from
`_setLit` and the burnout branch), `platform/thing/Oven.ts`
(`ContainerMixin`), `platform/thing/Campfire.ts` (`SurfacedMixin`),
`lib/thermal/__tests__/Thermal.test.ts` + `lib/fire/__tests__/Furnace.test.ts`
(new cases), `docs/subsystems/thermal.md` and `fire.md` (a paragraph
each — the eighth trigger, the heat scope).

Acceptance: (1) a `Receptacle` of water moved into a lit `Oven` reads
its ambient as 500 K after `restamp` and, after one `τ` of game time,
`getTemperature()` has closed 63 % of the gap (`1 − e⁻¹`); (2) dousing the
oven re-anchors the pot toward the room ambient; (3) `reconcilePhase`
pins boiling water at 373 K inside the oven; (4) a `Forge` still melts
an ingot beside it exactly as before (existing tests untouched and
green); (5) `look in oven` lists contents.

Commit: `build(grain-chain W0): the couple — a furnace heats what it holds`.

#### W1 — the dose, the ceiling, the hold (D2, D3, D4, D17)

Files: `lib/thermal/ThermalDose.ts` (value class + mixin + payload
merge + `markupAugmenters`), `lib/mixin.ts` (`ThermalDose`),
`platform/thing/Provision.ts` (compose `ThermalDoseMixin` outside
`ThermalMixin`, inside `CraftedMixin`), `lib/craft/Recipe.ts`
(`maxHeatK`, `getHoldS()` default, `fromData` checks),
`platform/idea/api/CraftingLogic.ts` (`resolveSpoilage` threshold
removed; the mint stamps the dose on bulk (`applySpoilage`'s
neighbour, `applyDoneness(outSlot, recipe, effectiveHeatK)`) and on a
tangible (`output.stampThermalDose(...)`), scorch when `effectiveHeatK
> maxHeatK > 0`; the burnt write-down), `lib/config/AppSettings.ts`
(`thermal.dose.*` keys), `packages/content/platform/content/settings/thermal-dose.yaml`,
`packages/server/scripts/check-doneness.ts` + `package.json`
(`lint:doneness`, ceilings = today's census), tests:
`lib/thermal/__tests__/ThermalDose.test.ts` (the integral against a
closed form at constant T; the sub-stepped trajectory against a
brute-force integration; band thresholds; no far-past guard),
`platform/idea/api/__tests__/CraftingLogic.spoilage.test.ts` (the hold
default; a 340 K working now leaves a residual load; a 373 K working
leaves none; the `scorched-cutlet` fixture now MINTS scorched instead
of declining — update it), `docs/subsystems/spoilage.md` + `crafting.md`
(a paragraph each; the doc growth proper is the sweep's).

Also in W1: the census of the 19 cooking recipes' `requiresHeatK`,
recorded in this plan under § Drive record → "W1 census".

Acceptance: a `Provision` in a lit oven reads `done` after `holdS` at
`requiresHeatK`-equivalent and `burnt` after 3×; `look` shows the band;
the grade reads `poor` once burnt; a pot's dish accrues `payload.dose`
on the fire; `lint:doneness` runs in the family and reports its
census; every existing crafting/cooking test green.

Commit: `build(grain-chain W1): the dose — one integral, three readers, a ceiling on every recipe`.

#### W2 — the sack, the comminution primitive, the bulk-only tangible (D6, D8, D11)

Files: `platform/thing/GradedReceptacle.ts` (`ThermalMixin` outer),
`platform/thing/Sack.ts` (new), `lib/craft/Comminuting.ts` (new
mixin), `lib/mixin.ts` (`Comminuting`), `platform/idea/api/CraftingLogic.ts`
(`applyTangibleOutput` bulk-only branch), tests:
`lib/craft/__tests__/Comminuting.test.ts` (mass conservation: product +
residue + toll = input; the product band by extraction; the clamp; the
grade weakest-link with the control floor; litres by density),
`platform/thing/__tests__/Sack.test.ts` (empty-vessel line, grade
verdict, temperature), `platform/thing/__tests__/Bottle.test.ts` (a
corked bottle cools on the vacuum τ; existing bottle tests green),
`CraftingLogic` test for a bulk-only tangible mint. `docs/subsystems/bulk.md`
(a paragraph: the `Sack`).

Acceptance: `test:near` on `Bottle`, `GradedReceptacle`, and the
`trade-bottling`, `trade-hospitality`, `trade-distilling`,
`trade-winemaking` suites green (Thermal on Bottle is the blast
radius; run those four packs' vitest explicitly).

Commit: `build(grain-chain W2): a graded receptacle has a temperature; the sack; comminution`.

#### W3 — the power read (D9)

Files: `packages/content/water/src/idea/cmd/perception/AnalyzePowerController.ts`,
`water/content/system/water/idea/cmd/perception/AnalyzePowerController.yaml`,
`packages/content/platform/content/platform/cmd/perception/analyze.yaml`
(the `power` stanza; `args: target object reachable optional`),
`water/src/idea/cmd/perception/__tests__/AnalyzePower.test.ts`.

Acceptance: `analyze power aqueduct house` at Wharfside reports the
flow at `cold-fell:cascade` and `ρ·g·60·Q·0.85` W; a target with
neither surface declines `not-a-generator`; 250 → 250 views (a
stanza, not a view); collisions 9.

Commit: `build(grain-chain W3): analyze power — the aqueduct house answers its own invitation`.

### Stage B — the content

#### W4 — wheat (D14)

Files: the five rows under `packages/content/trade-farming/content/`;
`trade-farming/src/__tests__/wheat.test.ts` (the rows resolve; the
profile is cold-limited at 279 K where barley is not; a harvest mints
a graded `crop/wheat` with the grower's mark).

Commit: `build(grain-chain W4): wheat — barley's five rows, shifted where the agronomy says`.

#### W5 — `trade-milling` (D8, D10, D15, D19)

Scaffold from `trade-fuel`: `pack.yaml` (`root: /trade/milling`,
group `milling`, title `/trade/milling`), `package.json`
(`@saxonberg/content-trade-milling`; deps: server, types, platform,
base-library, generic-objects — **no farming dependency**: the mill
matches its input by material tag (`grain`, `malt`), never by a
farming path), `tsconfig.json`, `vitest.config.ts`, `README.md`; root
`package.json` dependency line (alphabetical); `pnpm install`.

Content: materials ×4 (D15); `content/trade/milling/thing/{quern,
grist-mill, flour-sack, bran-sack, grist-sack, toll-bin}.yaml`;
`idea/Discipline/milling.yaml`; `cmd/milling/mill.yaml`;
`idea/cmd/milling/MillController.yaml`. Code: `src/thing/GristMill.ts`,
`src/idea/cmd/milling/MillController.ts`, tests
`src/__tests__/mill.test.ts` (quern: 25 kg wheat at 0.72 → 18 kg
white flour in a sack graded ≤ the grain, 7 kg bran; at 0.9 → wholemeal;
poor grain → poor flour; a malt sack → grist; the quern's duration;
the water mill with a stub sibling `generationW` → the powered rate
and the toll in the bin; no sibling → 0 kg/min decline).

Commit: `build(grain-chain W5): trade-milling — grind, then bolt; extraction is the miller's`.

#### W6 — `trade-baking` (D5, D7, D11, D19)

Scaffold as W5 (`root: /trade/baking`; deps add **trade-milling** —
the dough recipes name the flour material paths. **No trade-cooking
dependency**: `bake` extends the kernel `CraftController`, and the
salt in the bakery room is `terminus`'s reference, not this pack's).
Root `package.json` line; `pnpm install`.

Content: materials ×8 (D7); profiles ×3; recipes `dough`,
`wholemeal-dough` (by-hand: flour bulk 1 L + water 0.6 L + salt item
1; `outputApplication: bulk`, `outputTemplate:
/trade/baking/thing/dough-trough`, `outputMaterial: dough`), `lean-loaf`
(`inputSlots: [{slot: dough, category: proofed-dough, measureL: 1}]`,
`requiresHeatK: 480`, `maxHeatK: 560`, `holdS: 1800`, `medium: ''`,
`outputApplication: tangible`, `outputTemplate:
/trade/baking/thing/lean-loaf`, `outputMaterial: bread`,
`discipline: baking`), `wholemeal-loaf` (over the wholemeal pair),
`flatbread` (raw `dough`, 480 K, `holdS: 300` — the honest unleavened
fork, one row); rows `thing/{dough-trough, starter-crock, lean-loaf,
wholemeal-loaf, flatbread}.yaml` (loaf rows on `/trade/baking/thing/Loaf`,
`material: …/bread`, `mass: 0.8`); `idea/Discipline/baking.yaml`;
views `cmd/baking/{knead, bake}.yaml`; registration rows
`idea/cmd/baking/{Knead,Bake}Controller.yaml`. Code: `src/lib/Staling.ts`,
`src/thing/Loaf.ts`, `src/thing/DoughTrough.ts`,
`src/idea/cmd/baking/{Knead,Bake}Controller.ts`. **One kernel touch
in this wave:** `lib/maturation/MaturationProfile.ts`
(`MATURATION_LINES[<mechanism>].stalled` and `.killed`, all three
mechanisms) and `lib/maturation/Maturing.ts` (the augmenter, lines
291–301, branches `stalled` when the host's temperature is below
`stallBelowK` or above `stallAboveK`, and `killed` when a batch's
`viability <= 0`, before the `working`/`starting` branch) with a
kernel test in `lib/maturation/__tests__/` — AC 9 needs the prose to
say which failure happened, and today a cold batch reads `starting`.
Tests
`src/__tests__/{staling, dough, bake}.test.ts` (staling fastest at
277 K, paused at 273 K, slower at 293 K, reversed at 330 K to the
floor; the phrase vocabularies disjoint from `FRESHNESS_PHRASE`; add ×3
+ knead → the trough holds `dough` and the recipe is captured; a
cold trough stalls; a 330 K pour kills; open past `turnDays` →
`collapsed-dough`; `bake` at a lit oven → a `Loaf` in the oven, done,
graded weakest-link; cold oven → `insufficient-heat`).

Commit: `build(grain-chain W6): trade-baking — the trough, the levain, the loaf, and bread that goes stale`.

#### W7 — Heart's Delight, thinly (D12)

Files: `packages/content/hearts-delight/{pack.yaml, package.json,
README.md}`, `content/world/hearts-delight.yaml` + the six rooms +
`bench-field/{location/upper-bench.yaml, idea/ground.yaml}`,
`content/world/hearts-delight/{agent/farmer.yaml, agent/miller.yaml,
idea/farm-business.yaml, idea/mill-business.yaml, thing/millrace.yaml,
thing/farm-shelf.yaml}`; `world-seed/content/stuff/idea/Locality/hearts-delight.yaml`;
`terminus/.../delight-road/crossroads.yaml` (`south`); root
`package.json`; `hearts-delight/package.json` deps: platform,
base-library, generic-objects, world-seed, terminus, trade-farming,
trade-milling, water (paths named). ⚠ No `src/`.

Acceptance (booted, by hand, recorded in the drive): walk crossroads →
valley-gate → bench-lane → farmstead-yard → barn/upper-bench; the
farmer introduces himself; eight sacks on the shelf; `mill` at the
millsite grinds at the powered rate; `analyze power` at the millrace
moves with the season; `lint:dossiers` 0; `lint:locations` green;
`AddressApi.resolveLocalityFor(millsite)` is Heart's Delight.

Commit: `build(grain-chain W7): Heart's Delight — the gate, the bench, the farm, the millsite`.

#### W8 — the bakery (D13)

Files under `terminus/content/world/terminus/market/`: `bakery.yaml`,
`agent/baker.yaml`, `idea/bakery-business.yaml`, `thing/bread-counter.yaml`,
`thing/bakery-shelf.yaml`; `square.yaml` (`west`); `terminus/package.json`.

Commit: `build(grain-chain W8): the bakery — the first of the four the general store fragments into`.

#### W9 — the tending wave lands on the shipped kitchen (D3, D4, D17)

Files: the 19 recipes under `trade-cooking/content/recipes/` each gain
`maxHeatK` (a wet recipe: ≥ 373; a roast/fry: 20–60 K over its
`requiresHeatK`); `check-doneness.ts` ceiling (a) → **0**;
`ptomaine.yaml` bands re-derived; a new
`trade-cooking/src/__tests__/ptomaine-calibration.test.ts` (a tainted
serving → severity ≤ 1, spoiled → 2, rotten → 3, the authored trap
ration → 1; the numbers chosen are written into the plan's drive
record); `packages/wire/tests/cooking.dirty.wire.test.ts` and
`food-safety.dirty.wire.test.ts` re-run and any pinned expectation
that the threshold kill produced is updated with the reason in the
commit body.

Commit: `build(grain-chain W9): every shipped dish can now be overcooked; the ptomaine bands re-derived`.

#### W10 — the retrofit (D16)

Files: three mash recipes; `distribution/.../thing/grist-sack.yaml`,
`counter.yaml`; `trade-brewing`, `trade-distilling`, `distribution`
suites; `packages/wire/tests/` any brewing flow. Run those three packs'
vitest explicitly.

Acceptance: `mash` with whole malt declines `insufficient-input:
grist`; with milled or bought grist works; Dave's Bar's chain (the
bar-fight/libations wire flows) closes.

Commit: `build(grain-chain W10): the mash wants grist — the miller's other two customers`.

#### W11 — the drive, the register, the MR

`packages/wire/tests/grain-chain.dirty.wire.test.ts` (`DIRTY_REASON`:
it consumes the barn's finite sacks and the bakery's flour) covering
the requirements' 47 steps; `docs/vocations.md` (miller → shipped,
baker row added — AC 16); the plan's § Drive record; `pnpm test`
once; push; MR.

Commit: `drive(grain-chain): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| the couple | none (physics) | `Oven` is a Container → `put X in oven` resolves through `ContainerMixin`; `Campfire` Surfaced → `put X on campfire` | the oven row's `burnTemperatureK` | none — mixins compose at class load |
| the dose | none (reads on `look`) | `ThermalDoseMixin.markupAugmenters` on every `Provision`; the payload band on a bulk holder's description (the same augmenter shape, reading the slot) | `thermal-dose.yaml` settings seeded by the platform pack; `maxHeatK` on recipes | the settings seed is a platform pack `settings` contribution — confirm `AppApi.setting('thermal.dose.zK')` reads `33` after boot |
| `analyze power` | stanza on the platform `analyze.yaml` | the platform view is universal | the water controller registration row | the water pack installs the controller. ⚠ The stanza must NOT be a second `analyze` view in the water pack — a second view claiming a verb shadows the first silently (the 9 shipped collisions). The mining precedent (`analyze ground`, `measure strike`) ships stanzas on the platform view with controllers in the trade; follow it. Without the water pack the stanza declines at dispatch exactly as `analyze ground` does without mining |
| `mill` | `trade/milling/cmd/milling/mill.yaml` | `GristMill.commandContributions` static (environment + peers) — a quern in your hands or a mill in the room affords it | the two mill rows; the four materials; the sack rows; the `milling` Discipline (found by class) | the pack in `SAXONBERG_PACKS`/the root manifest; `pnpm install` after adding the package |
| `knead` / `bake` | `trade/baking/cmd/baking/{knead,bake}.yaml` | `DoughTrough.commandContributions` static | the dough recipes (by-hand match needs exact cover: flour + water + salt, no more); the three profiles found by path infix; the loaf rows | the `RecipeCatalogue` re-warms on pack go-live; `MaturationProfileCatalogue` warms by infix — nothing to add |
| the proof | none (a `Vat` detects the batch) | `pour` into the trough is the platform's | the profile's `inputCategory: dough` must match a **tag** on the dough material | none |
| the starter | `pour` | the crock is a `Vat` | `levain` material tag + the culture profile | none |
| wheat | `sow`/`harvest` (platform) | `Plant.harvestTemplatePath` | the five rows | none |
| the farm | `buy`/`consign` (platform retail) | the shelf class the `farms` brain expects (read `farms.ts` for the exact stall shape and mirror the campus farm's stall row) | the eight sacks in the barn; the brain config on the farmer | the `farms` brain is `/trade/farming/behavior/farms` — path-resolved, no registry |
| the valley | `go south` at the crossroads | the exit pair | the Locality row under `/stuff/idea/Locality/` | `AddressRegistry.postRegister` walks the roster — a row elsewhere is silently absent |
| the bakery | `go west` at the square | the exit pair | the counter's `stockLines` (a par line mints fresh clones on the sweep) | none |
| the retrofit | `mash` (brewing) | unchanged | `category: grist` on three recipes; the `grist` tag on the grist material; the counter line | the recipe catalogue re-warms on go-live |
| `lint:doneness` | `pnpm lint:doneness` | derived into `lint:family` by name | — | CI's `gate` job must be clicked |

⚠ The four silent failures to check by hand after W7 and W8: the
Locality prefix registers (`AddressApi.resolveLocalityFor` on a
valley room ≠ null); the `farms` brain's stall resolves; the trough's
`commandContributions` shows `knead` in `commands` when standing beside
it; `bake` finds the oven as a Container.

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| 1 grow → mill → bake → eat, no purchase | W4 (wheat on a held plot), W5 (quern), W6 (`knead`/`bake`/`eat`), W0–W2 beneath |
| 2 buy grain at a farm that is somebody's, journey + season cost | W7 (the valley, the farmer, finite sacks, the road's `edgeMinutes`) |
| 3 grade legible end to end; the loaf names its maker | W4 (harvest grade + mark), W5 (weakest-link + the miller's mark on the sack), W6 (`Grade.deriveAtFixedControl` at `knead` and `bake`; `CraftedMixin.stamp`) |
| 4 extraction: darker, more nutritious, worse-keeping vs white + saleable bran | W5 (D10, D15), the bran sack as a `Sack` with a grade (consignable) |
| 5 hand quern vs valley mill, faster, premises paid | W5 (the two rows, the toll in kind), W3 + W7 (the millrace's power sets the mill's rate) |
| 6 power tracks head and flow; a dry season moves it | W3 + W7 (`flowAt` over the weather segment) |
| 7 hauling flour cheaper than grain | arithmetic: `RateCardRegistry` prices `perKgMinor × kg`; a 25 kg sack of grain vs an 18 kg sack of flour at 0.72 — the drive computes both with `analyze load`/the rate board (W11) |
| 8 dough from a bought culture OR caught from the air | W6 (`spontaneousLagDays: 1`, open trough; `pour` from the crock) |
| 9 cold stalls, scald kills, forgotten collapses — each legible | W6 (the profile bands, plus the kernel prose seam W6 adds: `Maturing.ts`'s augmenter reads `starting`/`working`/`finished`/`turned` today (lines 291–301) and has **no `stalled` or `killed` line for a batch** — `MATURATION_LINES[mechanism]` in `MaturationProfile.ts` gains both, and the augmenter branches on the host's current temperature against the profile's stall bands and on `viability <= 0`; a test asserts the three phrases are distinct) |
| 10 a loaf can be burnt, and burnt is a thing you hold | W1 (D4), W6 |
| 11 cold vs warm diverge oppositely; stale ≠ spoiled prose | W6 (D5 + the disjoint-vocabulary test), W1 (Freshness untouched) |
| 12 re-baking improves a stale loaf | W6 (D5 `refreshK`) |
| 13 a brewer who has never seen this build still supplies Dave's Bar | W10 (the counter's grist line at 7) |
| 14 milling your own malt costs less than buying grist | W5 + W10 (5 + a quern's time vs 7) |
| 15 the 19 recipes produce what they produced, plus overcooking | W1 (D3 census), W9 (ceilings + the cooking wire flows green) |
| 16 `vocations.md` | W11 |

Unmapped: none. ⚠ AC 7 is proved by arithmetic the drive performs,
not by a mechanism this build adds — the cost surface is haulage's.

---

## Test & gate strategy

- **Unit (kernel):** `ThermalDose` (closed-form integral, sub-stepped
  trajectory, bands, write-down), `Thermal` (heat source, fan-out),
  `Furnace` (heat scope), `Comminuting` (conservation, bands, clamp,
  floor), `Sack`, `GradedReceptacle`/`Bottle` (temperature), `Recipe`
  (`maxHeatK` validation, `getHoldS` default), `CraftingLogic`
  (spoilage without the threshold; the scorched mint; the bulk-only
  tangible).
- **Unit (packs):** each pack's own vitest (`callSecPlugin`) — milling
  (W5), baking (W6), farming (W4), water (W3), cooking (W9), brewing /
  distilling / distribution (W10). ⚠ A pack with `src/` and no tests
  fails the root suite; `hearts-delight` has no `src/` and no vitest.
- **What only the drive proves:** the road is contiguous; the farmer
  reads as a person; the trough affords `knead` where you stand; the
  loaf goes into the oven and comes out burnt; two loaves in two rooms
  read differently the next morning; the mill's figure moves with the
  weather; Dave's Bar still closes. Written as
  `grain-chain.dirty.wire.test.ts` and kept.
- **Gates:** the whole family after every wave; `lint:doneness` from
  W1; `lint:verb-collisions` must read 9 after every wave (a second
  view claiming a verb shadows the first silently).
- **`pnpm test`:** once before the MR (W11), once at `/finalize`.
  Everything between is `test:near` + the touched packs + the family.
  Never in the background.
- **Reset:** the recipe schema gains a field → `pnpm -C
  packages/server reset:db` before W1's first boot; a `pack FAILED …
  owned by pack` boot line = drop and reboot, never code.

---

## Risks & opens

1. **Thermal on `GradedReceptacle` reaches every `Bottle`** (D6). The
   physics is right; the blast radius is four packs' suites and any
   test that snapshot-compares a bottle's fields. Run those four packs'
   vitest in W2 before committing. If a suite pins a bottle's
   temperature to a default, the pin was the defect.
2. **`knead` is the terminal, not only a method word** (D7). The
   requirements' sentence is honoured in mechanism (one controller, no
   schema, the open method vocabulary) but not in letter: a build
   buffer holds no bulk, so the kneading is where dough becomes matter.
   If the user wanted a separate terminal (`shape`?) the plan changes
   one controller; say so at review, do not add a verb speculatively.
3. **Drive step 21 ("climbs toward 500 K over time")** reads the oven's
   contents, not the oven — the furnace pin is unchanged (D1). If the
   user meant the oven itself, that is a `FurnaceMixin` change
   (Newton toward held instead of a pin) touching every forge/kiln test;
   ask before doing it.
4. **AC 15 / D3:** a shipped recipe between 333 K and ~350 K may now
   leave a residual load. W1 records which; W9 recalibrates ptomaine.
   That is the requirement, but it is a visible behaviour change in a
   shipped vertical — name it in the MR.
5. **The Locality row's home** (D12) differs from the requirements'
   letter; the product meaning is identical. Recorded so the sweep does
   not "fix" it into the pack, where the registry would not see it.
6. **The `nutrientAmounts` unit disagreement** (`malt.yaml` 14000 vs
   `barley-grain.yaml` 730000): the new grain-derived materials follow
   barley's scale; malt/grist inherit malt's. A finding for whoever owns
   `base-library`; do not fix here.
7. **The malt sack's missing `VesselKind`** (empty sack recites its full
   description) — a distribution finding; the grist sack is a `Sack`
   and does not repeat it.
8. **`z = 33 K` and the band ratios are playtest numbers**, dials by
   design; the requirements accept same-width windows for everyone
   until the skill seam lands.
9. **Eight materials for two breads** (D7) is the honest cost of
   nutrition riding the material. If the user finds it heavy, the
   fallback is one dough/one bread with the wholemeal difference
   expressed only at the flour and sack level (drive 30 would then read
   the same nutrition for both loaves) — a product call, not the
   plan's.
10. **The farm's finiteness vs "seasonal":** the `farms` brain picks
    ripe stands and does not sow; after one harvest the bench is
    stubble until somebody sows it (a player can). Replanting each
    season is the valley's own build. State it in the drive record.
11. **A campfire as a Surface** changes `put X on campfire` semantics
    for the practicum brazier row (`world-seed/.../practicum/brazier.yaml`
    is a Campfire). Check it in W0's `test:near`.
12. **Stop-and-ask list:** none of the above blocks the build. The
    only real stops are the standing ones — a worktree hazard, a
    credential, an irreversible act.

---

## Deferred seams

Clean attach points; each leaves as a slate line, never a plan section.

- **Portioning a discrete food** (`eat a slice`): a loaf is one portion
  today (`EAT_PORTION_LITRES`, all-or-nothing). → `cooking-slate.md`
  (Left: "slices — a tangible food that yields N portions").
- **Granular bulk** (`requiredClosureFor` always `liquidTight`; a sack
  of flour is nominal litres): → `bulk.md`'s existing deferred tail.
- **A stamp mill on the Kestrel falls** — `ComminutingMixin` with ore
  products + tailings residue; → `metal-chain-slate.md`.
- **Staling promoted to the kernel** on the third-pack signal (cooked
  rice, potatoes) → `cooking-slate.md`.
- **The kill re-based onto a shared integrator** (one z) — deliberately
  not done (D2); the passive kill's rectangle rule is the seam →
  `preservation-slate.md`.
- **A money toll / a `mill` service kind on `Tariff`** — rejected for
  multure; if a venue wants coin, the Tariff vocabulary is the seam →
  `retail.md` history note.
- **The oven's own warm-up** (a furnace with thermal mass) →
  `fire.md` history note, if the user wants it.
- **The malt sack migrating to `Sack`** → distribution's README.
- **Confectionery, enriched doughs, the roller-mill inversion** —
  already in the requirements' non-goals with their homes.
- **The valley** — everything the bible is and this build is not →
  `towns-slate.md` (its "Retire when" is NOT satisfied).

---

## Critical files

Read first, in this order:

1. `docs/requirements/grain-chain-requirements.md`
2. `packages/server/src/mud/lib/material/Freshness.ts` — the gauge
   shape D2 and D5 copy
3. `packages/server/src/mud/lib/thermal/Thermal.ts` (`restamp`,
   `reconcileThermal`, `reachableHeatForImpl`) and
   `lib/fire/Furnace.ts` (`_setLit`, `reconcileFurnaceFuel`,
   `heatContents`)
4. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` —
   `resolveSpoilage` (844), `applyTangibleOutput` (1108), the resolve
   (1840–1990), `mintFromBuildImpl` (1483), `applyControlFloor` (1536)
5. `packages/server/src/mud/lib/craft/Recipe.ts`, `ManualBuild.ts`,
   `ManualBuildStep.ts`; `platform/idea/cmd/crafting/StirController.ts`;
   `packages/content/trade-hospitality/src/idea/cmd/crafting/StrainController.ts`
6. `packages/server/src/mud/lib/maturation/Maturing.ts` +
   `MaturationProfile.ts`; `platform/thing/Vat.ts`;
   `trade-brewing/.../maturation/{ale,ale-culture}.yaml`
7. `packages/server/src/mud/platform/thing/{Oven,Campfire,Provision,GradedReceptacle,Bottle,Receptacle,Crop}.ts`
8. `packages/content/water/src/thing/ControlStructure.ts`,
   `water/src/idea/WatercourseCatalogue.ts` (`flowAt`, `WATERWORK_CLASSES`),
   `packages/content/transport/src/idea/FordExit.ts`
9. `packages/content/trade-fuel/` (the pack template) and
   `trade-fuel/src/idea/cmd/fuel/CharController.ts` (the durative
   verb); `packages/content/rejection/pack.yaml` (a pack with no `src/`)
10. `packages/content/terminus/content/world/terminus/delight-road/crossroads.yaml`,
    `world-seed/content/stuff/idea/Locality/rejection.yaml`,
    `world-seed/.../Watercourse/delight.yaml`,
    `terminus/.../wharfside/thing/aqueduct-house.yaml`
11. `packages/content/trade-farming/content/trade/farming/thing/{crop,plant,seed}/barley.yaml`,
    `stuff/idea/material/food/barley-grain.yaml`,
    `trade-farming/src/behavior/farms.ts`,
    `eternal-university/.../campus-field/location/home-field.yaml`
12. `packages/content/hearthworks/content/world/hearthworks/{location/cookhouse.yaml, agent/cook.yaml, idea/business.yaml}`;
    `rejection/.../agent/storekeeper.yaml`
13. `packages/server/scripts/check-perishable.ts`, `check-dossiers.ts`,
    `pack-roots.ts`
14. `packages/wire/tests/farmstead.dirty.wire.test.ts`
15. `docs/subsystems/{thermal,fire,spoilage,crafting,maturation,bulk,watershed,content-packs}.md`

---

## Drive record

*(appended at build time)*

### W1 census — the 19 cooking recipes' `requiresHeatK`

*(filled by W1)*

### The drive

*(the 47 steps, run against the booted game, with what each found)*
