# Fire — implementation plan

Executes [fire-requirements.md](../requirements/fire-requirements.md).
**Kind: feature. Leads from: kernel.** The thesis the requirements
close on — *a fire is its fuel, its air, and its vessel; heat, light
and exhaust are consequences* — becomes true in `lib/fire/Burner.ts`,
whose own header has claimed *"a real, fuel-and-air-driven
temperature"* since it was written while nothing in the file reads
either. The build makes the docstring true, gives every scope's medium
**contents** beside its identity so that air derives from enclosure,
makes a gas a `Material` that only a `sealed` vessel holds, and then
lets four shipped packs express it: `trade-fuel`'s retort,
`trade-mining`'s firedamp, `trade-smelting`'s coke, `trade-malting`'s
peat kiln (the requirements say `trade-distilling`; the kiln rows live
in `trade-malting` — see Grounding G12).

Nine waves, `W0…W8`, each independently landable. W0 is the wide one
(every interior in the game) and carries the regression sweep on its
own; the user asked for that isolation and the grounding agrees.

---

## Grounding

Verified this cycle by opening the files. Line numbers are current
HEAD (`d2357a30c`). The three engineering surveys this plan folds are
cited as S1 (fire/burner), S2 (atmosphere/enclosure) and S3
(bulk/concentration/recipe); every load-bearing claim below was
re-opened, not copied.

### G1 — `BurnerMixin` is a pin and a percentage

`packages/server/src/mud/lib/fire/Burner.ts` (388 lines).

- Fields (`:154-174`): `burnTemperatureK` (800), `bellowsMultiplier`,
  `bellowsActive`, `lit` (**defaults `true`**), `fuelBurnRatePerMin`
  (0.5 `%`/game-min), `burnerFuelClockStamp`. Four module-private
  consts `BURNER_DEFAULTS` (`:43-53`), **not** AppSettings.
- `fuelRemaining()` (`:184-186`) is the ONLY fuel read:
  `getReserve('fuel')?.current.rawValue() ?? 0` — a `%` Reserve.
- `getHeldTemperatureK()` (`:188-191`) = `burnTemperatureK × bellows`;
  consults neither `lit` nor fuel. fire.md § 5 and
  `SmeltController.ts:295` both insist it is **the PIN, not the
  reading** — a doctrine this plan keeps (D4).
- `getEmittedFlux()` (`:234-251`) gates the authored flux on
  `lit && fuel > 0` and otherwise returns `LightSourceMixin`'s number
  unchanged — a gate, not a scaling.
- `reconcileBurnerFuel()` (`:262-285`) is the only drain; the burnout
  edge writes `this.lit = false` directly (bypassing `_setLit`).
- `heatContents()` (`:287-310`) uses `getMass()` on the WORKPIECE, so
  a mass read exists on every Tangible host; nothing reads the fuel's.
- `commandContributions` (`:109-152`): `environment` ignite/douse;
  `peers` ignite/douse/pump/heat/boil/warm/fire. **`stoke` and a
  draught verb do not exist** (verified: no view claims `stoke`,
  `draught`, `drain`, `cover`, `rake`, `damp`; `draft` is
  `trade-ranching`'s haulage verb; **`bank` is the banking verb**,
  `platform/cmd/banking/bank.yaml`, with eleven subcommands).
- Composers (S1 §5, re-opened): `lib/fire/Firebox.ts:45-49`
  `Burner(LightSource(Reserved(Thermal(Thing))))`; `Forge` (empty
  body); `Oven` = `Container(Placing(Firebox))` (`Oven.ts:25-27`, the
  comment at `:12-22` is why a Forge is NOT a Container); `Hearth` =
  `SpaceHeating(Placing(Firebox))` with `lit=false`, 700 K, 0.25;
  `Campfire`; `trade-smelting/src/thing/SmeltingFurnace.ts` =
  `Container(Forge)`; `trade-fuel/src/thing/CharcoalPit.ts:46` =
  `Container(Firebox)`; `platform/thing/Lamp.ts:66-83` =
  `Burner(LightSource(Reserved(Thermal(Good))))`, 330 K, 0.15;
  `trade-distilling/src/thing/Still.ts:53-59` (Fractionating over
  Burner over … Bulkable — ⚠ its interior is the WASH, not fuel);
  `trade-apiculture/src/thing/Smoker.ts:34-39`.
- `SpaceHeating.ts:94-100`: `spaceHeatOutputW()` = authored
  `heatOutputW` gated on lit+fuel; its docstring (`:33-35`) promises
  *"when it lands, rows change and this does not."*

### G2 — `Material` has the numbers and nobody reads the one that matters

`packages/server/src/mud/lib/material/Material.ts`: six fire
properties (`:369-526`), all `0`-until-authored. **`heatOfCombustion`
(`MJ/kg`, `:406`, getter `:1004-1010`) is authored on 26 rows and read
by NOTHING** outside its own test. Authored values re-opened: oak 16
(`density` 750, autoignition 570), coal 28 (1350, 700, tags include
`sulfurous`), peat 15 (1100, 500, tag `peat`), lamp-oil 43 (820,
`boilingPoint` 470, autoignition 490), charcoal **authors
`autoignitionPoint`, a dead key** (`trade-fuel/.../charcoal.yaml:29`)
and no `heatOfCombustion` — a row defect W1 fixes. `air.yaml` authors
`density` 1.225, tags `[gas, breathable]`, and **no `boilingPoint`**.
There is no `phase` field (S3 §9, confirmed: the full `fieldMeta`
`:765-835`). `purifiedByBoiling` (`:1028-1060`) is the shipped
*arrow between two authored materials* a boil-down reuses (D11).

### G3 — The atmosphere is one string and two sentinel writers

`packages/server/src/mud/lib/biome/Atmospheric.ts` (1339 lines).
`fieldMeta` `:320-340` — `_atmosphere { persistent, authorable }`, no
marshaller; `setAtmosphere` (`:620-630`) has **no validation** and no
thermal restamp (contrast `setTemperature` `:472-499`).
`envelopeApplies()` (`:662-667`) = volume non-null ∧ no own
`_temperature` ∧ not sky-exposed; `openExteriorOpenings()`
(`:678-702`) counts obvious exits to a sky-exposed destination with an
open/absent door — **interior openings count for nothing**;
`getVolume()` defaults `null` (`:1247`), overridden by
`CartesianLocation` (cell³), `SphericalLocation`, `ExitableVessel`,
`Hive`, `ColdStore`.

`platform/idea/api/BiomeLogic.ts`: four parallel module-private
tables keyed by tag (`:44-129`, seven tags: air, water, vacuum, smoke,
blackdamp, stinkdamp, carbon-dioxide). `densityOf`/`conductivityOf`/
`breathableOf` **throw** on an unknown tag with a stale message
naming three; `contaminantOf` returns `null`. `resolveAtmosphereFor`
(`:385-397`) → `resolveStringFor` → `runChainWalk` (`:1251`) whose
sync half `syncChainWalk` (`:1155-1245`) walks a+b (detail, innermost
only) → c (own override) → d (biome) per ancestor, then step 5 (zone,
the one async rung) and step 6 (root biome, **throws if the root lacks
the field**, `:1286-1302`).

Two sentinel write-throughs onto `_atmosphere`, both "only overlay a
`null`, only clear my own tag": `FireLogic.markFireSmoke`/
`clearFireSmoke` (`FireLogic.ts:366-378`) and
`Maturing.reconcileCellarAir` (`lib/maturation/Maturing.ts:143-170`,
`'carbon-dioxide'`, three module consts at `:126-130`). A third,
`trade-mining/src/lib/Working.ts:641-648 settleAir`, writes the
`blackdamp` tag by cast and stays (D7). Raw-field readers that bypass
the resolve: `SmellModality.ts:99`, `SoundModality.ts:94`,
`AudienceGather.ts:97` (the vacuum check; untouched).

### G4 — The oxygen leg is an authored `%` Reserve on eight rows, four inert

`FireLogic.advanceFireInRoom` (`:256-350`): `airReserveOf(room)`
(`:354-360`) — a room with no `'air'` Reserve is *"open air =
unlimited"*; `ventilated = isSkyExposed || openNeighboursOf(room).length
> 0`; consume 8 `%`×burning, replenish 30 if ventilated; smother at
`≤ 0`; `complete = ventilated || !airHolder || airPct ≥ 40`;
**only `Combustible`s get `_setComplete`** — a `Burner` never gets a
completeness verdict (`:271` collects `isBurning()` Combustibles).
Dials `fire.air.*` at `AppSettings.ts:1645-1651`, seeds
`packages/content/platform/content/settings/fire.yaml:31-37`.

Seven rows author `reserves: air:` (S2 §4, all re-opened):
`trade-cooking/.../location/kitchen.yaml:49-55` (FurnishableRoom —
composes `ReservedMixin`, `FurnishableRoom.ts:119`),
`hinkley-hills/.../lots/kitchen.yaml:23-27` (FurnishableRoom),
`hearthworks/.../location/cellar.yaml:33-39` (`SealedCellar extends
ReservedMixin(SingletonCartesianLocation)`, `SealedCellar.ts:22`), and
**four `SingletonCartesianLocation` rows** (terminus goods-yards
brewing floor + cold-store, vintner floor, crowsfoot floor).
`SingletonCartesianLocation = SingletonMixin(CartesianLocation)`
(`:26-28`), `CartesianLocation = StagedMixin(ExitableMixin(
CartesianCoordinatesMixin(Location)))` (`:57-63`), `LocationBase`
(`Location.ts:163-173`) — **no `ReservedMixin` anywhere in that
chain**, so the four author a reserve the applier drops
(`TemplateApplier.ts:129-130` iterates only persistent fields) and
`airReserveOf` → `null` there: unlimited air, and
`Maturing.reconcileCellarAir:148` early-outs. ⭐ Deriving air from
enclosure fixes all four as a side effect (W0 confirms by test).
`platform/__tests__/room-archetypes.test.ts:159-177` pins the kitchen
reserve AND that no other archetype authors one — rewritten in W0.

### G5 — Respiration consumes one tag and depends on a throw

`lib/respiration/Respiration.ts`: `resolveCurrentMedium()` (`:235-255`)
ends in `BiomeApi.resolveAtmosphereFor(self)` — the whole seam;
`assessExchange()` (`:313-348`) uses `breathableOf`'s **throw** as its
known-medium oracle (`:330-339`); `applyMediumContaminant()`
(`:358-376`) adds a flat `respiration.contaminantBurdenPerBreath` (5)
per reassess via `contaminantOf(tag)`. `Metabolic.addToxinBurden(type,
amount)` (`Metabolic.ts:592`). The CO condition row:
`platform/content/platform/idea/Condition/metabolism/carbonMonoxide.yaml`.

### G6 — Closure: a three-word scale, a constant gate, a floor-puddle cascade

`lib/bulk/Bulkable.ts:66-73` `ClosureLevel = 'open'|'liquidTight'|
'sealed'`, `CLOSURE_ORDER`; default `liquidTight` (`:519`);
`setClosure` (`:630-632`) stores anything. **Three rows author
`closure: none`** (verified by grep): `trade-forestry/.../sap-pan.yaml:28`,
`generic-objects/.../vessel/pail.yaml:45`,
`trade-quarrying/.../salt-pan.yaml:31` — each with prose meaning *no
lid*; `BulkableLogic.compareClosure` (`:86-88`) is
`CLOSURE_ORDER[a]-CLOSURE_ORDER[b]` → `NaN` for `none`, and the
drain-through test `… < 0` (`:306-310`) is false for `NaN`, so **those
three retain liquid as though lidded** (a live defect; W2).
`requiredClosureFor(_material)` (`:142-148`) ignores its argument and
returns `'liquidTight'`. Step 3 of `transfer` (`:306-332`) has two
branches — redirect to `floorSurfaceNear`, or discard — and **no
refusal**; a gas requiring `sealed` would become a floor puddle. The
authored distribution: 22 `liquidTight`, 8 `sealed` (brewing keg,
veshko volk, wine-bottle, mixer-bottle, can, hollis-cane, old-hollis,
and `can.yaml:10` says *"`closure: sealed` is CONSTRUCTION (gas-tight)"*),
5 `open`, 3 `none`. `AirTank` is at
`platform/thing/AirTank.ts` (not `obj/`): `Wearable(Slottable(
Bulkable(Good)))`; `air-tank.yaml` and `air-compressor.yaml` author
`interiorMaterial: …/bulk/air` and **no `closure`** (default
`liquidTight`) — W2 sets both `sealed`. `TransferStatus` is
`'partial'|'declined'|'drained'` (`api/bulk.ts:83`).
`Thermal.ts:1253-1259` **boils bulk away** (`setBulkAmount(0)`) above
`boilingPoint` — a gas stored in a lit lamp would be destroyed by its
own flame unless the arm is guarded (W2).

### G7 — `Concentration` has two consumers and one shape

`lib/bulk/Concentration.ts` (137 lines): imports nothing; `Concentrate
{type: string; amount: number}` ("per litre"); statics `blend` and
`isClean` only; `@internal`. Consumers: `DissolvedToxins`,
`DissolvedAromatics` (`lib/metabolism`), `BulkableLogic.blendPayloads`
(`:90-140`), `Fractionating`. This build is the **fourth consumer**
(the scope's medium), not a parallel model (D1).

### G8 — `fire`/`burn`, the recipe, and one output

`platform/idea/cmd/device/FireController.ts`: `firingsFor(charge)`
(`:195-229`) matches recipe rows with only item slots by material tag,
`batches = floor(items/count)`; `runFiring` (`:280-345`) clones
`outputTemplate × batches` into the chamber and destructs the consumed
items. `lib/craft/Recipe.ts`: `outputTemplate` (one, required,
`:397-399`), `outputResidue: RecipeResidue | null` (one object,
`:272`), `imparts` (`:312`, validated `:354-388`, applied only in
`applyBulkOutput`'s authored-material branch,
`CraftingLogic.ts:1484-1490`), `fieldMeta` `:170-195`, `fromData`
`:390-451`. `trade-malting/content/recipes/kiln-malt-peated.yaml`
takes the turf as an item slot (`category: peat, count: 4`) and
declares `imparts: [{smoke, 30}]`; `kiln-malt.yaml` is the same recipe
without the slot or the imparts; both output `malt-sack` +
`outputMaterial …/food/malt`. `malt-kiln.yaml` is an `Oven` row at
340 K with a `%` reserve.

### G9 — The clamp, the draught and the collier

`trade-fuel/src/thing/CharcoalPit.ts`: `draught` (`:79`, authorable,
clamped 0..1), `CHARS_FROM 0.3`/`CHARS_TO 0.62` exported (`:41-42`),
`outcomeFor` threshold (`:113-117`), `yieldFor` (`:127-134`); a dead
`charMaterialPath` declaration (`:67`, no implementation behind it on
this class). `CharController.ts`: `instanceof CharcoalPit` (`:53`),
`setDraught` (`:59`), re-issue adjusts (`:61-75`), `isCordwood` by
keyword (`:206-209`), `openClamp` module function; ⚠ `watching`
computed at `:162` and never used. The clamp row
(`trade/fuel/thing/clamp.yaml`) authors 1420 K, 0.05 `%`/min, a `%`
reserve. The yard: `rejection/.../location/fuel-yard.yaml` props the
clamp, the panel, two tools and four charcoal baskets; prose names the
smoking dome.

### G10 — The mine's air, the deposit, Ferrow

`trade-mining/src/lib/Working.ts`: `AIR_REACH 12`, `FOUL_BELOW 0.34`,
`FOUL_ATMOSPHERE 'blackdamp'` (`:178-192`); `airAt()` BFS (`:609-626`)
→ `settleAir` (`:641-648`, the cast write); `refreshAir` (`:655-676`)
called from `MineWarren.ts:338,383` after a carve; `onCreate`
(`:398-407`) settles once; `breathes()` (`:684-696`) = declared
`getVentilated()` or an exit into another zone. Composed over
`StrataMixin` (`/system/ground`), imported by package specifier
`@saxonberg/content-ground/src/idea/Deposit` (`:68`).
`ground/src/idea/Deposit.ts`: `GroundSample` (`:218-231` — host,
hardness, lode, mineral, gangue, grade, water, feature); authored
layers `stratigraphy · waterTable · lode · zones · depletion ·
features` (`:289-301`, spoiler 1); `sampleAt(at, seed)` the one read.
The Ferrow deposit row
(`rejection/.../idea/deposit/ferrow.yaml`) authors slate to −60 m over
granite, water table −45, a copper heart and iron fringe, seeded
`vug`/`seep` pockets — **nothing about gas**. Rooms: `MineRoom`
(`Persistable(WarrenMember(Working(CartesianLocation)))`) and
`AuthoredWorking` (`Working(SingletonCartesianLocation)`, the
timbered drift). The canary brain `behavior/reads-air.ts:66-75` calls
`airAt()` and narrates a band; the `atmosphere` reading row
(`platform/idea/reading/atmosphere.yaml`) has `eyeCeiling: competent`
and **no `analyze` rung** (`AtmosphereReading.ts` overrides `measure`
only, ignores `_band`, prints a density **digit**). `TemperatureReading
.analyze` (`:60-87`) is the no-digit words precedent.

### G11 — Light, vision, the lint

`LightSourceMixin` (`lib/perception/LightSource.ts`): one authored
`emittedIntensity`, ungated. Four gates in four places (S1 §7): the
Burner override, `PortableLight.isOn`, `SconceLamp.isOn`,
`ElectricLight` powered. `VisionModality.ts:378-414` leg (b′) reads a
light **one level deep through a person** — the walk W4's naked-flame
check copies. `scripts/check-light-sources.ts` clause (g): a row whose
class composes `BurnerMixin` must author `lit:`; `--report` prints
every Location and its light source (the W0/W1 darkness sweep).

### G12 — The consumers already standing

- Oil works: `terminus/.../goods-yards/oilworks/location/floor.yaml:20`
  prose *"a squat retort standing cold in the corner (the crafted route
  is a later build)"*; `lamp-oil.yaml:13`, `trade-fuel/pack.yaml:14`,
  `oilworks.yaml:7` all say *later*.
- Smelter: `SmeltController.ts:243-251` reads fuel baskets out of the
  furnace **contents** (`isCharcoal` = material tags `fuel`+`carbon`,
  `isSulfurous` = tag `sulfurous`), consumes them at `:438`; the
  hot-short route at `:691`. A coke material tagged `fuel`+`carbon`
  without `sulfurous` passes with **no smelter code change** (AC9).
- Whiskey drives: `packages/wire/tests/whiskey.dirty.wire.test.ts:69-72`
  and `whiskey-styles.dirty.wire.test.ts:80-84`, both `DIRTY_REASON`
  ending *"no refuel verb exists for any burner"*.
- The epoch word: `energy/src/idea/reading/GridReading.ts:134-160`
  returns `'gas-lit'` when the locality's lighting supply is a
  `FuelStore`; comments in `FuelStore.ts:2`, `Locality.ts:114,329,367`,
  `energy/pack.yaml:13`, `energy/README.md:14,25`, `lamp-oil-cask.yaml:35`,
  `oilworks/agent/hand.yaml:33`, `docs/subsystems/energy.md:103,109,113`.
- Magic: no conjured fire exists. `firebolt` injects heat
  (`Effect.ts:46-62` `inject-channel`); `glowlight` conjures a
  `LightSource` locus via `emit-field` (`Effect.ts:216-221`,
  `MagicLogic.ts:2063-2092 execEmitField`: clones the locus, **requires
  only `isLightSource`**, moves it to the scene, drives its flux by a
  `SustainedEffect`). `arcane-library/src/thing/GlowlightMote.ts` is
  `LightSourceMixin(Good)`; spell rows live under
  `arcane-library/content/stuff/idea/magic/Spell/`. Because the
  executor only asks `isLightSource`, a `Burner`-composing locus is a
  valid emit-field target with **no kernel magic edit** (W8).
- The clock: `fuel-yard.yaml` comments three game days = six real hours
  — the default clock runs **12×**, so the 30 game-second fire tick is
  2.5 real seconds.

### G13 — Gates that will fire

`pnpm -C packages/server lint:family --list` (run): the ones this
build's shape touches — `lint:instanceable` (invariant 12: **orphan
data keys have a falling ceiling** — every `reserves: fuel:` /
`fuelBurnRatePerMin:` key left in a row after W1 fails),
`lint:light-sources` (g), `lint:closed-vocabularies` (counts
*undeclared* kernel membership lists — a `ClosureLevel` validator is a
new membership test; declare it in the gate's registry with its reason
rather than let it count), `lint:unconsumed-seams` (every new field
needs a reader), `lint:reconcile-chains` (a new `reconcile*` that
samples a temperature needs `@samples`; the contents decay samples
none), `lint:mass` (every new Thing row authors `mass` or
`_materialPath`), `lint:verb-collisions` (an allowlist that is *"a
to-do, not an amnesty"* — **no second `bank`**), `lint:lib-statics`
(a new static on a `lib/` value class counts down — none planned),
`lint:imports`, `lint:module-scope`, `lint:object-verbs` (zero),
`lint:schema` (no new collection), `lint:field-meta`, `lint:envelope`
clause (c) (no biome row may author the new contents field — it is
not authorable, so none can), `lint:test-bootstrap`.

---

## Plan-level decisions

**D1 — The medium's contents are `Concentration`'s fourth consumer, keyed by Material path, measured as a volume fraction.**
`AtmosphericMixin` gains `_atmosphereContents: Concentrate[]` beside
`_atmosphere`. `type` is a **Material template path** (never a kernel
tag — a pack adds a gas by adding a material row), `amount` is **litres
of the substance per litre of medium** (a fraction, 0..1), which is
"per volume" by construction; the air share is `1 − Σ amount`, and
nothing is ever a fill fraction. The identity tag is untouched —
`stinkdamp`, `water`, `vacuum`, `blackdamp` keep resolving exactly as
authored (the pit, the cistern, the adit). Why fraction and not mass
per litre: every consumer asks a *share* question (is it breathable,
will it burn, how much is in there relative to air) and a fraction is
what `Concentration.blend` already does with no unit story; density
rides the material row when anyone needs it.

**D2 — A material is a gas when its boiling point is at or below the standard ambient.**
`requiredClosureFor(material)` reads `boilingPoint > 0 &&
boilingPoint ≤ dial(atmosphere.standardK, 293)` → `'sealed'`; else
`'liquidTight'` (granular stays a deferred tail). No `phase` field, no
`gas` tag read: the authored surface stays closed and phase is a
consequence, which is what the rest of the thermal layer already does.
A pack ships a gas by authoring `boilingPoint` (coal gas ≈ 110 K,
firedamp ≈ 112 K, CO₂ ≈ 195 K sublimation point, smoke ≈ 100 K — the
number is honest within the only comparison it is ever put to).
`air.yaml` gains `boilingPoint: 79`. ⚠ The user's lean, confirmed.

**D3 — Volatiles are a *recipe* fact and a *vessel* act.**
`Recipe` gains `volatiles: [{ material, litresPerKg }]` — bulk matter
a FIRING drives off per kg of charge consumed. It is not a second
`outputTemplate` and not an `outputResidue[]`: it mints nothing;
`FireController.runFiring` hands the litres to the chamber, and **the
chamber routes them** (`Retort.receiveVolatiles` → the receiver placed
on it, else the scope's medium). `CraftingApi.craft` ignores the field
(a bench craft has no vessel to route through); `lint:unconsumed-seams`
sees one reader, the firing. The user's instinct — *the row never needs
multiple outputs* — holds for the minted solid; what the volatiles ARE
still has to be authored somewhere, and the firing row is the one place
that already knows this charge's chemistry. Rejected alternatives: a
field on the charge `Material` (base-library's `coal.yaml` naming
`trade-fuel`'s tar path is a commons row pointing at a trade's good);
a table on the retort row (a second feedstock would edit the retort,
not add a recipe).

**D4 — The vessel sets the ceiling; the fuel decides whether you reach it; air decides how clean.**
`getHeldTemperatureK()` stays the PIN (lit-agnostic, fire.md § 5) but
derives: `min(burnTemperatureK × bellows, fuelFlameK) ×
tempFactor(completeness)`, with `fuelFlameK = dial(fire.flame.baseK,
300) + dial(fire.flame.kPerMJkg, 65) × heatOfCombustion` (oak 1340 K,
peat 1275, coal 2120, charcoal 2250 — the smelter's 1590 ceiling is
reachable with charcoal and not with wood, so its own sentence *"this
fuel does not burn hot enough"* becomes true) and `tempFactor` = 1
complete, `dial(fire.incompleteTemperatureFactor, 0.75)` starved (the
1000/750 continuity). `burnTemperatureK` keeps its name and every
authored value.

**D5 — Power derives from draught and fuel; duration from mass.**
`burnPowerW() = min(maxBurnPowerW × draughtFactor × bellows,
fuelMassKg × dial(fire.power.perKgW, 1500))`, where `maxBurnPowerW` is
a new authorable vessel fact replacing `fuelBurnRatePerMin` (a forge
20 kW, hearth 6 kW, campfire 8 kW, oven 4 kW, still 10 kW, lamp 80 W,
clamp 2 kW; the row carries it), `draughtFactor = max(draught,
dial(fire.draught.banked, 0.05))`. Energy in the bed =
`Σ massKg × heatOfCombustion`; the drain per elapsed game-second is
`burnPowerW × dt`, taken from the bed by mass in proportion. A 6 kg oak
charge at 8 kW lasts ~3.3 game hours; banked, sixty — *the player who
banked is safe* is arithmetic. **Banking is the draught dial at its
floor, not a mechanism** (the requirements' own sentence).

**D6 — Light: the authored flux is a ceiling scaled by soot, and the other three gates stay.**
`getEmittedFlux() = ceiling × lum(completeness) × size`, `lum = clean +
(1 − clean) × (1 − completeness)`, `clean = dial(fire.light.cleanFraction,
0.3)`, `size = min(1, burnPowerW / (0.25 × maxBurnPowerW))` so a banked
fire is embers rather than a bright one. A worked flame has
completeness from air alone and no soot term → dim. **Not
consolidated**: `PortableLight`/`SconceLamp` (a switch) and
`ElectricLight` (a feeder) are not fires; folding them into one gate
would be a mixin on the wrong host. ⚠ A well-run forge at 90 lm now
sheds ~27 lm at full draught — the darkness sweep (W1) runs
`lint:light-sources --report` before and after and raises row ceilings
where a room went dark (AC20).

**D7 — Air derives from enclosure, as decay of the contents; the `'air'` Reserve is retired.**
Every fire emits exhaust litres into its scope
(`addAtmosphereContent`); the scope's contents decay on read at
`airChangesPerHour()` = `∞` if sky-exposed, else `exterior openings ×
dial(fire.air.achPerOpening, 4) + open interior openings ×
dial(fire.air.achInterior, 1) + dial(fire.air.achLeak, 0.1)`; a scope
with `getVolume() === null` (a plain `Location`, `Offstage`) accepts
nothing — the same discriminator `envelopeApplies` uses. Air share =
`1 − Σ`. The fire's completeness reads the share; it smothers below
`dial(fire.air.smotherAirShare, 0.70)`; a body stops exchanging below
`dial(atmosphere.breathableAirShare, 0.76)` — **the person is warned
before the fire smothers**, which is what the requirements ask. Of the
four ventilation definitions in the tree (S2 §6) this picks the
`Atmospheric` opening walk, generalised to classify openings as
exterior/interior, and retires `Maturing.roomVentilated` and
`FireLogic`'s `ventilated` for AIR (it stays for SPREAD). Mining's
`breathes()` is a graph-distance model feeding the identity tag and
stays. Both sentinel writers migrate to emission: the fire emits
`smoke`/`carbon-dioxide` litres; a converting ferment emits
`carbon-dioxide` litres per day; neither touches `_atmosphere` again.
The seven `reserves: air:` rows are deleted (three live, four inert —
all seven behave identically after, by derivation), `SealedCellar`
drops `ReservedMixin`, the three fire air dials are retired.

**D8 — Fuel lives in a fuel BED on the burner, loaded by `stoke`; a vessel whose interior IS its tank says so by one override.**
`BurnerMixin.fuelBed: Record<materialPath, kg>` (persistent,
runtimeState, authorable — rows seed a starting charge) +
`fuelCapacityKg` (authorable). `stoke <item> [into <burner>]` destructs
a Tangible with `heatOfCombustion > 0` into the bed by its mass;
refuses a stone (`not-fuel`), a sodden one (`too-wet`, the Combustible
wet formula lifted into `FireLogic` as a free function over material +
wetness + moisture), a full bed (`bed-full`). Liquid and gas fuel are
poured, not stoked: `BurnerMixin.fuelSlot(): BulkSlot | null` is a
protected `@hook` defaulting to `null`; **`Lamp` overrides it** to its
interior slot (so `fill lamp from cask` / `from gasometer` is the only
act) and composes `BulkableMixin`; the `Still` leaves it `null` because
its interior is the wash and its fire is a firebox you stoke. ⚠ This is
the host-placement call: the hook is a class-level statement of what a
vessel IS, not a runtime guard, and no `isX` re-narrows the host set.
The `%` `'fuel'` Reserve goes; `ReservedMixin` leaves the five burner
chains (`Firebox`, `Lamp`, `Still`, `Smoker` — `Firewood`/`Combustible`
keeps its own reserve, deferred). `fuelRemaining()` keeps its name and
returns kg; every caller tests `<= 0`.

**D9 — Draught is on `BurnerMixin`; the charring band stays the clamp's.**
Every fire has an air control (a damper, a wick, a tuyère, the ash you
bank with), so the field is honest on the forge, oven, hearth, campfire,
lamp and still: no guard re-narrows. `CharcoalPit.draught` moves up
(same name, same clamp, same default on the clamp row 0.45; the
`BurnerMixin` default is 1); `CHARS_FROM/TO`, `outcomeFor`, `yieldFor`
stay the clamp's — a trade's reading of the kernel dial, as they are
today. One platform verb, `draught [<fire>] <0..1 | wide | open | low |
banked>`, afforded by `BurnerMixin` (environment + peers); `banked`
sets the floor. ⭐ **The banking act ships as `cover [<fire>]`** — a
separate one-word verb on the same affordance, chosen by working the
verb-collision ladder rather than conceding the word (R1); `banked`
survives as the draught scale's floor value.

**D10 — A gas in a vessel is standard litres; pressure derives as amount over capacity.**
A `Bulkable` interior holding a gas material stores the slot's `amount`
as litres **at standard conditions**; `Bulkable.getGasPressureAtm()`
= `amount / capacity` (null when the material is not a gas). This is
intensive per-volume by construction: *how much is in there* is the
amount, pressure is its consequence, and `AirTank.getAirGauge()`
(amount/capacity) becomes an honest pressure read by reinterpretation.
The clamp at capacity means one atmosphere this build (a gasometer and
a bladder are constant-pressure vessels); a cylinder that compresses is
an authorable `maxPressureAtm` later. Retention needs **both**
`closure ≥ sealed` and, on a `Sealable` host, `!isOpen()` — closure is
construction, the lid is state (`bulk.md:244-249`). Transfer step 3 gains
a third branch: gas into an under-closed interior **escapes** — status
`'escaped'`, note `{kind:'target-declined', reason:'gas-escapes'}`, the
litres emitted into the destination holder's scope medium (so a failed
pour in a closed room poisons it, honestly).

**D11 — Pitch is `wood-tar.purifiedByBoiling`.**
The shipped arrow between two authored materials, driven by the shipped
`boil` verb; zero code. The word *purified* is a stretch and the
volume does not reduce — recorded as a seam, not worked around.

**D12 — Firedamp is a ground fact in a depth band, derived at the working like blackdamp, drained like a fishery.**
`Deposit.gas?: { material, belowZ, strength }` (ground pack owns
`Deposit`); `GroundSample.gas: {materialPath, strength} | null`.
`Working.airAt()` already settles air on every read and after every
carve; it now also writes `setAtmosphereStanding(firedamp, strength ×
(1 − air) × (1 − drawnFraction))` through a real setter — deep and
dead-ended it accumulates, holed through it clears, exactly the blackdamp
shape. **Standing** contents (a derived write-through) live in a second
list beside the accumulated ones and never decay; drawing one off
(`drain`, a flash) suppresses it for `dial(atmosphere.standingRebuildS,
7200)` and it ramps back. The reservoir term: `Working.firedampDrawnL`
(persistent runtime) with half-life recharge — reservoir · recharge ·
act · credit, the RGO law. `drain [<vessel>]` (trade-mining, `mining`
category, afforded by `WorkingMixin` on `self`/`inventory` like the
other acts) moves litres into a reachable **sealed** vessel.

**D13 — The safety lamp is a declared construction fact on the burner.**
`BurnerMixin.flameEnclosed: boolean` (authorable, default `false`); the
`safety-lamp.yaml` row over `/platform/thing/Lamp` authors `true`. The
enclosure DECLARATION (`EnclosureSpec`) belongs to `Atmospheric`
hosts — a lamp is not a place, and composing `AtmosphericMixin` on a
lamp to borrow its vocabulary would be the wrong host. A naked flame =
a lit `Burner` with `flameEnclosed === false`, or a `Combustible` that
`isBurning()`; the check walks the room's contents and **one level
deep through a person** (the `VisionModality` (b′) walk, G11).

**D14 — A worked flame is a `Burner` with a `worked` fuel source; the kernel decides, a pack row shows it.**
`BurnerMixin.fuelSource()` (protected `@hook`) returns `{kind:'bed'}`
by default; a locus class in `arcane-library` returns `{kind:'worked'}`:
no material → no soot term → dim, no `smoke`; it still emits
`carbon-dioxide` for its power (conservation — the room's air goes) and
smothers below the smother share. `execEmitField` already accepts any
`LightSource` locus, so `conjure-flame` (create·fire) is a spell row +
a `WorkedFlame` class + a thing row, **no kernel magic edit**. ⚠ The
requirements' placement table does not name `arcane-library`; AC17 is
unobservable without it. See Risks R2 — the plan ships it as W8 and the
user may cut the wave.

**D15 — `oil-lit`, and `gas-lit` is reserved for a supply that burns gas.**
`GridReading.epochOf` returns `'oil-lit'` for a `FuelStore` supply;
every comment and doc line that says gas-lit for oil follows. No
mechanism; a FuelStore that burns gas is the utility slate's.

**D16 — Combustible's own `%` reserve stays this build.** A log burning
on its own (a door, a bale) is the object-is-the-fuel path; its
duration deriving from `getMass() × heatOfCombustion` is the same
formula and lands as a one-line swap once `FireLogic` owns the burn-rate
function (W1 places it there). Deferred seam, not legacy.

---

## Host placement

For every new field, mixin and class: who carries it, and what that
claims of everything else on the host.

| what | host | claims of every other composer |
|---|---|---|
| `_atmosphereContents`, `_atmosphereStanding`, `_atmosphereContentsStamp` | `AtmosphericMixin` | every place that has a medium can carry amounts in it — `Location` (all), `ExitableVessel`, `ColdStore`, `Hive`. True of all four; a `Vessel` stays non-Atmospheric ("a bag is not a place"). No per-Detail map: nothing asks a hearth-detail what it carries. |
| `fuelBed`, `fuelCapacityKg`, `maxBurnPowerW`, `draught`, `flameEnclosed` | `BurnerMixin` | forge · oven · hearth · campfire · furnace · clamp · lamp · still · smoker all hold fuel, have an air control, have a maximum rate, and have a flame that is or is not gauzed. ⚠ The test: no `isX` guard re-narrows any of these. `flameEnclosed` defaults false everywhere except the one row that says otherwise. |
| `fuelSlot()` hook | `BurnerMixin` (default `null`), overridden by `Lamp` | a class states that its interior IS its tank; the `Still` does not override because its interior is the wash. A declaration per class, not a runtime guard. |
| `fuelSource()` hook | `BurnerMixin` (default bed), overridden by `WorkedFlame` | same shape: a class says where its fire's energy comes from. |
| `volatiles` | `Recipe` | a firing row may say what leaves the charge; `Crafting` reads nothing new. |
| `gas` | `Deposit` (ground pack) + `GroundSample` | a deposit may hold a gas below a depth; a quarry's ground answers `null`. |
| `firedampDrawnL`, `firedampDrawnStamp` | `WorkingMixin` (trade-mining) | a working can be drained; the quarry's `Working` does not compose this mixin. |
| `combustionImparts` | `Material` | a substance may say what burning it puts into what sits over it (peat: smoke 30 mg/L). Zero for 25 of 26 fuels by default. |
| `getGasPressureAtm()` | `BulkableMixin` | every vessel can be asked; non-gas answers `null`. A derived read, no field. |
| `Retort`, `Condenser`, `GasBladder`, `Gasometer` | `trade-fuel/src/thing/` | pack classes under `/trade/fuel/thing/`; `Retort extends ContainerMixin(PlacingMixin(Firebox))` — the clamp's capitalised sibling, with a receiver seat; `Condenser extends PlacingMixin(BulkableMixin(ThermalMixin(Good)))`; `GasBladder` and `Gasometer` are `BulkableMixin(Thing)`/`(Good)` rows with `closure: sealed`. |
| `SafetyLamp` | **no class** — a row over `/platform/thing/Lamp` | `flameEnclosed: true` is content. |
| `WorkedFlame` | `arcane-library/src/thing/` | `BurnerMixin(LightSourceMixin(ThermalMixin(Good)))`, the emit-field locus. |
| `smoke`, `carbon-dioxide` materials | `base-library` `/stuff/idea/material/gas/` | kernel code names them through two dials (the `enclosure.defaultMaterial` precedent, `Atmospheric.ts:420`). |
| `coal-gas`, `wood-tar`, `coal-tar`, `pitch`, `coke` materials | `trade-fuel/content/stuff/idea/material/` (the commons, as `lamp-oil` is) | the pack ships the substances; a second retort is rows. |
| `firedamp` material | `trade-mining/content/stuff/idea/material/gas/` | the mine ships the gas nature gives off. |

**What is deliberately NOT placed:** `SpaceHeating` stays off
`BurnerMixin` (its own header's rule); no `EnclosedMixin` is minted
(`Enclosed.ts:119-140`); no kernel mixin is added (`lint:mixin-names`
untouched); no `ReservedMixin` on `Location`.

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** — `fuel-yard.yaml`, `oilworks/location/floor.yaml`
  use `props:` + `cast:` (`populates:` retired). New props follow.
- **Locations, not rooms** — every new scope is an existing
  `CartesianLocation` row; no `FurnishableRoom` is touched except the two
  kitchens' `reserves:` deletion.
- **`<root>/<branch>/` path pattern** — `/trade/fuel/thing/Retort` ↔
  `trade-fuel/src/thing/Retort.ts`; `/trade/mining/cmd/mining/drain` view
  + `/trade/mining/idea/cmd/mining/DrainController` (controller row under
  `content/trade/mining/idea/cmd/mining/DrainController.yaml` as the
  seven shipped acts do); platform verbs `platform/cmd/device/stoke.yaml`,
  `draught.yaml` + `platform/idea/cmd/device/{Stoke,Draught}Controller.ts`.
- **Module scope declares; lifecycles initialize** — no module-scope
  statements; new dials are `AppSettingKeys` + `settings/fire.yaml` seeds.
- **Import boundary** — packs import the kernel by package specifier
  (`@saxonberg/server/mud/lib/…`); trade-mining already imports the
  ground pack by `@saxonberg/content-ground/src/idea/Deposit` and keeps
  that shape for `GroundSample.gas`. `lib/bulk` imports no subsystem;
  `Concentration` imports nothing; the `AtmosphericMixin` contents use
  the `Concentrate` TYPE only (a type import from `lib/bulk` into
  `lib/biome` — check `lint:imports`' category table; if `lib/biome →
  lib/bulk` is refused, declare the two-field interface locally, as
  `Concentration.ts:42-47` says both consumers may).
- **Verbs on objects** — `burner.stoke(item)`, `burner.setDraught(n)`,
  `retort.receiveVolatiles(...)`, `working.drain(vessel)`,
  `scope.addAtmosphereContent(...)`; controllers bind and narrate.
  **No `XApi.verb(host, …)`.** `BiomeApi.resolveAtmosphereContentsFor`
  and `BiomeApi.airShareOf` are reads over the chain walk (the same shape
  as `resolveAtmosphereFor`), not verbs.
- **`XApi ↔ XLogic` split** — new logic in `FireLogic`, `BiomeLogic`,
  `BulkableLogic`; facades forward.
- **No new module category, no free helper, no new Api, no new
  collection, no new namespace root, no new Discipline, no `isWizard`.**
- **A bound arg is `MqlOneResult`, never `Stuff`** — every new controller
  reads `model.x?.stuff`.
- **Every new object arg is `greedy: true`** (the article defect,
  instrumentation.md); every required arg has a default or is optional.
- **Lint gates this build must pass**: the whole `lint:family`; named
  in G13 the ones its shape exercises.

---

## Waves

Each wave: goal · decisions · files · acceptance · commit. `test:near`
+ every touched pack's own `vitest` + `pnpm -C packages/server
lint:family` at every wave; `pnpm test` exactly twice (before the MR,
at `/finalize`).

### W0 — The medium carries amounts, and air derives from enclosure ✅ DONE

> **Build note (W0).** Landed as planned, with four decisions the plan
> did not make and one real defect found.
>
> **B1 — The contents walk is "the innermost scope that IS a place", not
> a sum across ancestors.** The plan said *`syncChainWalk` over step c,
> summed by type*. Summing across the chain double-counts: a coach
> standing in a smoky street would breathe the street's litres as well
> as its own, and a sealed vessel would breathe the room. So
> `resolveContentsFor` walks outward and the first `Atmospheric` ancestor
> with a derivable **volume** answers — the SAME discriminator
> `addAtmosphereContent` uses to decide where litres may go, so contents
> can only be read from a scope they could have been put into. Summing
> by type still happens, within one scope, folding its accumulated and
> standing lists.
>
> **B2 — ⭐⭐ The thresholds and the exhaust are recalibrated on physics,
> and R6 asked for exactly this.** The plan's 0.85 / 0.76 / 0.70 shares
> with 1800 L/kg read as *spent air*, but the contents are the fire's
> actual **exhaust** — a kg of wood burns to ~950 L of CO₂ — so the
> fractions that matter are small: CO₂ is dangerous to breathe at 5 % of
> the air and lethal near 10 %. At 0.85/0.70 a room had to be a QUARTER
> exhaust before anyone noticed, which is both unphysical and so slow
> the lesson never lands in a session. Shipped:
> `atmosphere.breathableAirShare` **0.95**, `fire.air.completeAirShare`
> **0.93**, `fire.air.smotherAirShare` **0.88**,
> `fire.exhaust.litresPerKg` **950**, `smokeLitresPerKg` **300**. The
> ordering the requirements demand is preserved and tightened: told →
> sooty → in trouble → out.
>
> **B3 — ⛔ A real defect, found by a test that should have passed:
> `stamp === 0` is not "unseeded".** Game-time zero is a legal instant —
> it is the first instant of a fresh world — so a `0` sentinel makes the
> decay silently never run there, because every read re-seeds the stamp
> it is comparing against. `_atmosphereContentsStamp` uses `-1`. ⚠ **The
> shipped `Burner.burnerFuelClockStamp` has the same `0` sentinel and
> the same hole**; W1 fixes it there.
>
> **B4 — R5 is resolved in the permissive direction.** `lint:imports`
> only polices escapes from `src/mud/`, and the sealed-subdir ESLint rule
> covers `api/mql` and `api/mml` only — so `lib/biome` may type-import
> `Concentrate` from `lib/bulk/Concentration`. No local shape needed.
>
> **Also:** `BiomeApi.hasBreathableShare(contents)` had to be split out
> of `isBreathableMixture(tag, contents)`. Respiration asks the question
> *after* the body's own `breathableMedia` set has already accepted the
> medium, so re-consulting the air-breather table told a FISH it could
> not breathe water. The displacement half has no opinion about what the
> medium is.
>
> **Verified:** `lint:family` 65/65; the biome, respiration, maturation,
> fire, reading, platform and hearthworks suites green; zero rows author
> an `air` Reserve (a ratchet test in `terminus` holds it there);
> `check-light-sources --report` baseline saved for W1 to diff.


**Goal.** D1, D7. The wide wave: every interior in the game can starve a
fire, and nothing authored resolves differently.

**Kernel.**
- `lib/biome/Atmospheric.ts`: fields `_atmosphereContents: Concentrate[]
  = []`, `_atmosphereStanding: Concentrate[] = []`,
  `_atmosphereContentsStamp = 0`, `_atmosphereStandingSuppressed:
  Record<string, number> = {}` — all `{persistent: true, runtimeState:
  true}`, none authorable, no marshaller (plain JSON, the per-detail-map
  precedent). Methods: `getAtmosphereContents(): Concentrate[]`
  (resolved, via `BiomeApi`), `addAtmosphereContent(materialPath,
  litres): number` (returns litres accepted; 0 when `getVolume() ===
  null` or sky-exposed; `fraction += litres / volumeL`, clamped so
  `Σ ≤ 1`), `drawAtmosphereContent(materialPath, litres): number`
  (removes from accumulated then standing, marks standing suppressed),
  `setAtmosphereStanding(materialPath, fraction)` (the derive
  write-through; honours suppression by linear ramp),
  `reconcileAtmosphereContents()` (exponential decay of accumulated
  entries at `airChangesPerHour()` over elapsed game-time; stamped;
  removes `amount ≤ 1e-6`; standing entries untouched),
  `airChangesPerHour(): number` (D7 — generalise `openExteriorOpenings`
  into a private `openingsByKind()` that classifies by `isThreshold`;
  keep the public `openExteriorOpenings()` unchanged for the envelope),
  `airShare(): number`. `setAtmosphere` validates the tag against
  `BiomeApi.isKnownAtmosphere(tag)` and **throws** on an unknown one.
  ⚠ The applier does NOT catch a setter's throw
  (`TemplateApplier.ts:156-170` awaits `set<Field>` bare), so a row
  authoring an unknown tag fails its own hydration loudly — the clone
  rejects and the pack install names the row. That is the fail-loud the
  survey asked for; no shipped row authors an unknown tag (verified:
  `stinkdamp`, `water`, the three biome `air`s). The `'mythium'` test
  (`Atmospheric.persistence.test.ts:127-130`) flips to assert the throw.
- `platform/idea/api/BiomeLogic.ts`: `resolveAtmosphereContentsFor(scope):
  Concentrate[]` — **sync**, `syncChainWalk` over step c only (own
  accumulated + standing, summed by type; biome and detail getters
  return `null` by construction — climate is not contents, the
  `lint:envelope` (c) line), universe terminal `[]` (no root-biome
  field; the terminal is supplied inline, not through step 6's throw);
  each hit calls `reconcileAtmosphereContents()` first.
  `airShareOf(contents)`, `isBreathableMixture(tag, contents)` =
  `breathableOf(tag) && airShareOf ≥ dial(atmosphere.breathableAirShare,
  0.76)`, `isKnownAtmosphere(tag)`; fix the three stale `(known: air,
  water, vacuum)` strings to enumerate the table. Facades on
  `api/biome.ts`.
- `lib/respiration/Respiration.ts`: `assessExchange` — after the tag
  passes, read `resolveAtmosphereContentsFor(self)` (sync) and refuse
  exchange when the mixture is unbreathable (`cause: 'medium'`);
  `applyMediumContaminant` — besides `contaminantOf(tag)`, for each
  content whose `Material.getToxicity()` is non-empty add
  `amount × fraction` per toxin (a gas row's toxicity = burden per
  breath at unit fraction; documented on the two new rows). The
  known-medium throw-oracle stays as is.
- `platform/idea/api/FireLogic.ts`: delete `airReserveOf`,
  `markFireSmoke`, `clearFireSmoke`, the `ventilated` air logic; the
  oxygen leg reads `airShare = BiomeApi.airShareOf(resolve…(room))`;
  `complete = airShare ≥ dial(fire.air.completeAirShare, 0.85)`;
  smother below `dial(fire.air.smotherAirShare, 0.70)`; each burning
  Combustible emits per tick `litres = dial(fire.exhaust.litresPerKg,
  1800) × kgBurnt` of `dial(fire.exhaust.carbonDioxideMaterial)` plus,
  when incomplete, `dial(fire.exhaust.smokeLitresPerKg, 600) × kgBurnt`
  of `dial(fire.exhaust.smokeMaterial)` — `kgBurnt` for a Combustible
  this wave = `(fire.burnRatePerMin/100) × getMass() × dt/60` (the
  `%` reserve is a mass fraction of the object). `openNeighboursOf`
  stays for spread. Retire dials `fire.air.consumePerTick`,
  `replenishPerTick`, `completeThresholdPct` (keys + seeds).
- `lib/maturation/Maturing.ts`: `reconcileCellarAir` emits
  `CO2_LITRES_PER_DAY × days` (a module const, 5000 L/day for a converting
  batch — tune against the existing cellar calibration) into the room via
  `addAtmosphereContent`; delete `roomVentilated` and the three `%`
  consts; the room's own decay does the rest.
- `BiomeLogic.ATMOSPHERE_*` tables: untouched (the tag's physics).
- Dials: `AppSettingKeys` + `settings/fire.yaml`: `fire.air.
  completeAirShare` 0.85, `fire.air.smotherAirShare` 0.70,
  `fire.air.achPerOpening` 4, `fire.air.achInterior` 1,
  `fire.air.achLeak` 0.1, `fire.exhaust.litresPerKg` 1800,
  `fire.exhaust.smokeLitresPerKg` 600, `fire.exhaust.smokeMaterial`
  `/stuff/idea/material/gas/smoke`, `fire.exhaust.carbonDioxideMaterial`
  `/stuff/idea/material/gas/carbon-dioxide`; a new
  `settings/atmosphere.yaml` with `atmosphere.breathableAirShare` 0.76,
  `atmosphere.standardK` 293, `atmosphere.standingRebuildS` 7200.
- `platform/idea/reading/AtmosphereReading.ts`: add the `analyze` rung
  (words, no digit: the tag's word, then for each content over a
  `dial(atmosphere.noticeableFraction, 0.02)`: *"the air is thick with
  smoke"* / *"heavy and close"* (CO₂) / nothing for an odourless,
  invisible gas below competent; at `competent` the list of what a
  person could tell); `measure` reports every content in words banded
  by `band` — *a trace of · some · a great deal of* — and **drops the
  density digit** (AC20). Add `AtmosphereReading.test.ts` (none exists).

**Content.**
- `base-library/content/stuff/idea/material/gas/smoke.yaml` (density
  1.1, boilingPoint 100, toxicity `[{type: carbonMonoxide, amount: 50}]`,
  tags `[gas, exhaust]`) and `gas/carbon-dioxide.yaml` (1.98, 195,
  no toxicity, tags `[gas, exhaust]`). `air.yaml` gains `boilingPoint:
  79`.
- Delete `reserves: air:` from the seven rows (G4) and rewrite their
  header prose (kitchen ×2: *"the only room where you deliberately run a
  fire indoors"* is no longer a decision — every room with a volume can
  starve a fire; the `SealedCellar` keeps its granite and loses
  `ReservedMixin`).

**Tests.** Rewrite `FireChemistry.test.ts` (smoke is now a content; the
tick counts change; assert `airShareOf` falls, completeness flips,
smoke appears, smother happens, ventilated stays clean),
`hearthworks.integration.test.ts:169-190` (no `ReservedMixin`, no
seeded Reserve), `room-archetypes.test.ts:159-177` (no archetype
authors a reserve), `Atmospheric.persistence.test.ts:127-130` (the
throw), `Respiration.*` (one new case: a breathable tag with an
unbreathable mixture → crisis; a sub-threshold content → none), a
`Maturing` cellar case (CO₂ accumulates in a shut cellar and clears
with the trapdoor open), `biome.*` for the contents resolve through a
nested vessel, and ⭐ a test that the four Terminus goods-yard floors
now behave as the kitchens do (the inert-reserve finding, closed).

**Regression sweep (this wave's own).** `pnpm lint:light-sources
--report` saved before/after (nothing changes in W0 — it is the
baseline W1 diffs against); grep the content tree for `reserves:` with
`air` (zero); `trace atmosphere` on the slurry pit, the cistern, the
adit, a biome room — identical tags; the Hearthworks cellar lesson
still runs by test.

**Acceptance.** AC6, AC19 (first half), AC20 (no digit in the
atmosphere reading).

**Commit.** `build(fire W0): the medium carries amounts; air derives from enclosure, the air Reserve retired`

### W1 — The burner derives: fuel bed, draught, power, heat, light, exhaust ✅ DONE

> **Build note (W1).** `Burner.ts`'s header is true. Seven decisions the
> plan did not make, and **five real defects found** — four of them by
> tests written for this wave and one by a pack's own suite.
>
> **B5 — ⭐⭐ Completeness is `clamp01(draught × airShare / completeAirShare)`.**
> The plan had completeness from AIR alone (D4/D6) and the requirements
> demand that *starving the draught* makes a fire sooty and bright (AC4,
> drive step 7). Those are inconsistent: a draught that only scales power
> cannot make soot. The product is the fix, and it is better than either
> half — the draught and the room's air are **the same lever seen from
> two sides**, so closing the damper in a clean room and opening it in a
> foul one starve the fire identically. AC4 and AC7 become one mechanism
> instead of two, and ⭐ the charcoal clamp's smoking dome stops being
> prose: at its authored 0.45 draught its completeness is ~0.5, so it
> smokes because of what it IS.
>
> **B6 — ⭐⭐ Two luminosity floors, not one `clean` constant.** D6's
> single `fire.light.cleanFraction` 0.3 made *every* fire 30 % of its
> authored flux at full draught, which is wrong twice: a wood fire is
> always yellow (its flame is a cloud of particles, whatever the draught),
> and a gas flame is far dimmer than 0.3. Sootiness is a property of the
> **fuel**, and the build already derives gas-ness from the boiling point
> (D2) — so `fire.light.sootyFloor` 0.6 for a solid or liquid and
> `fire.light.cleanFloor` 0.15 for a gas or a worked flame. The gas lamp's
> mantle problem lands harder (0.15, unmistakable) and no room loses 70 %
> of its light.
>
> **B7 — "Fire size" is `burnPowerW / (0.25 × maxBurnPowerW)`**, dialled
> as `fire.light.fullSizeFraction`, so a banked fire is EMBERS rather
> than a dim bonfire.
>
> **B8 — Lamp power recalibrated to 300 W** (lantern), 80 W (candle — the
> classic figure for a candle), 1200 W (torch). The plan's 80 W for a
> lantern was two orders out: half a litre of lamp oil is 17.6 MJ, and at
> 80 W that is sixty game hours, so the class's own promise — *a lamp you
> fill at dusk is guttering by dawn* — could not hold. At 300 W it is ~16
> game hours.
>
> **B9 — ⛔ The guttering tail never reaches zero.** Once the bed's mass
> stops binding against `maxBurnPowerW` the power is proportional to what
> is left, so the drain is exponential and asymptotic: the burnout edge
> would never fire and a lamp would stay faintly lit forever on a
> milligram of oil. `FUEL_FLOOR_KG` (a gram) closes it. **Found by a test
> that expected a lamp to be dark after eighteen game hours and found 29 g
> left.**
>
> **B10 — ⛔⛔ `draught.yaml` did not load, and the verb was dead.** A
> greedy arg may only be followed by PREPOSITIONAL args (otherwise it
> swallows the boundary token), and the plan's view had a greedy `fire` in
> front of a bare `setting`. The whole view failed to parse — ⭐ the
> **arg-gate** link failing closed and silent, exactly as the plan's own
> reachability table warns. Fixed to `char`'s shipped shape: a
> prepositional non-greedy object, then the value.
>
> **B11 — ⛔ `Mml.thing` is LAZY.** `StokeController` destructs the fuel
> and then sends its scene; `Mml.thing` resolves its subject at SEND, a
> destroyed Stuff's `describeFor` is an inert no-op returning `undefined`,
> and the composer throws escaping it. ⚠ **Any verb that consumes its own
> target must capture the WORDS, not a reference** — `getPresentation()`
> before the destruct.
>
> **B12 — ⛔⛔ `isClamp` duck-typed on `getDraught`, and D9 made that
> universal.** `draught` rose onto `BurnerMixin`, so every furnace in the
> game answered to it and `smelt` declined *"that is a charcoal clamp"* at
> a smelting furnace. **Caught by `trade-smelting`'s own suite** — the
> whole case for a trade keeping tests over its own content. It
> discriminates on `outcomeFor` now (the charring BAND, which is the
> trade's and stays the trade's). ⭐ The general lesson: *duck-typing on a
> field is only honest while the field is the thing's own*, and a trade's
> reading of a shared dial is exactly what does not generalise.
>
> **B13 — ⛔ Two authored-key defects in material rows.**
> `charcoal.yaml` authored **`autoignitionPoint`**, which is not a field
> (`autoignitionTemperature` is), so charcoal's autoignition read ZERO for
> the life of the pack and `tryAutoignite` would never have caught it from
> a neighbouring fire; and it authored **no `heatOfCombustion` at all**,
> which under the new model would have made charcoal burn COLDER than oak
> — the exact opposite of the reason the material exists. ⚠ `burn.test.ts`
> *asserted the misspelling*, pinning the defect in place: an
> authored-key test written off the ROW rather than off the FIELD will do
> that. `beeswax` also gained its 42 MJ/kg, without which a lit candle is
> a cold candle.
>
> **The darkness sweep (AC20, R3).** Every burner row's
> `emittedIntensity` is scaled by `1/0.6`, so a well-run fire lights its
> room exactly as brightly as before and a badly-run one lights it MORE.
> Sixteen rows: torch 80→133, lantern 220→367, smelting furnace 120→200,
> Kiln 60→100, stove 8→13, Campfire 120→200, Oven 30→50, Forge 90→150,
> range 30→50, candle 12→20, brazier 60→100, Hearth 90→150, malt-kiln
> 20→33, practicum brazier 120→200, brine-hearth 40→67, limekiln 80→133.
>
> **The whiskey drives (AC2).** Both lose the fuel clause from
> `DIRTY_REASON` and now `stoke log into still` before igniting; the
> Crowsfoot floor props four split oak logs by the firebox (⚠
> deliberately `generic-objects`' row rather than the forestry pack's
> cordwood — a prop naming a pack this locality does not ship would not
> install and the boot would die cloning the floor). They stay `.dirty.`
> for their FEEDSTOCK, which is honest and is all the requirements asked.
>
> **Also:** `ReservedMixin` left `Firebox`, `Lamp`, `Still` and `Smoker`;
> `Lamp` composes `BulkableMixin` and is the one `fuelSlot()` override;
> `SpaceHeating` floors its authored watts at the fire's actual power (a
> banked hearth warms the room at a twentieth of its rate, and no row
> changed); `Thermal.reachableHeatSource()` ships for W5; a `look`
> augmenter says what a fire is burning, how cleanly, and whether it is
> banked; `ignite` gained the `no-fuel` reason and the sentence that names
> the act lifting it.
>
> **Verified:** 1607 kernel tests green across fire/thermal/biome/device/
> crafting/medical/platform/world; trade-fuel 14, trade-smelting 31,
> trade-distilling 10, trade-apiculture 69, trade-cooking 52,
> trade-quarrying 70, trade-forestry 120 green; `lint:family` green.


**Goal.** D4, D5, D6, D8, D9, D16. `Burner.ts`'s header becomes true.

**Kernel.**
- `lib/fire/Burner.ts`: fields per Host placement; remove
  `fuelBurnRatePerMin`; `fuelRemaining()` → `Σ bed kg` (or the
  `fuelSlot()`'s litres × density); `fuelEnergyJ()`,
  `fuelMaterials(): Material[]` (by mass, desc), `fuelMaterial()`,
  `burnPowerW()`, `completeness()` (reads `BiomeApi.resolveAtmosphere
  ContentsFor(scope)` sync — scope = the first `Atmospheric` ancestor,
  the `airScopeOf` walk thermal.md names), `getHeldTemperatureK()` (D4),
  `getEmittedFlux()` (D6), `getDraught()/setDraught(n)` (clamped 0..1),
  `isFlameEnclosed()`, `stoke(item: Stuff): StokeOutcome` (`{ok: true,
  kg} | {ok: false, reason: 'not-fuel' | 'too-wet' | 'bed-full' |
  'not-matter'}`; destructs the item via `StuffApi.destruct` on
  success — the collier's `openClamp` precedent), `consumeFuel(kg)`,
  `exhaustTick(dtS)` (emits CO₂ always, smoke when incomplete, into the
  scope — called by `FireLogic`), protected `@hook fuelSlot()` and
  `fuelSource()`. `reconcileBurnerFuel()` drains `burnPowerW × dt`
  joules as mass across the bed (or litres from the slot); the burnout
  edge routes through the same code path as `_setLit(false)` (one
  restamp). The far-past guard stays. `BURNER_DEFAULTS` reduces to
  `MAX_REASONABLE_GAP_SEC`; magnitudes become dials:
  `fire.power.perKgW` 1500, `fire.flame.baseK` 300, `fire.flame.kPerMJkg`
  65, `fire.incompleteTemperatureFactor` 0.75, `fire.light.cleanFraction`
  0.3, `fire.draught.banked` 0.05, `fire.burner.defaultMaxPowerW` 8000,
  `fire.burner.defaultCapacityKg` 10.
- `platform/idea/api/FireLogic.ts`: lit burners enter the chemistry —
  `advanceFireInRoom` calls `exhaustTick` on each lit burner (its
  exhaust is what the W0 oxygen leg reads next tick); `igniteImpl`'s
  Burner arm refuses `fuelRemaining() <= 0` with a new reason `'no-fuel'`
  (add to `IgniteOutcome.reason`); the wet formula moves here as a
  module function `wetPenaltyK(material, wetness, moisture)` and
  `Combustible.wetPenaltyK` forwards to it (D16's seam); `FireLogic.
  burnPowerFor(...)` is where a later Combustible swap lands.
- `lib/thermal/SpaceHeating.ts`: `spaceHeatOutputW() = min(heatOutputW,
  host.burnPowerW())` — rows change nothing.
- `lib/thermal/Thermal.ts`: add `reachableHeatSourceFor(position):
  (Stuff & Burner) | null` beside `reachableHeatForImpl` (same walk,
  returns the hottest lit burner) and `Thermal.reachableHeatSource()`
  on the mixin face — the fuel stops being anonymous (consumed by W5).
- `platform/thing/Lamp.ts`: `BurnerMixin(LightSourceMixin(ThermalMixin(
  BulkableMixin(Good))))`, `fuelSlot()` → `this.getBulk('interior')`
  when `interiorBulk`; defaults `maxBurnPowerW` 80, `lit = false`.
  Rows: lantern (`interiorBulk: true`, `interiorCapacity: 0.5`,
  `interiorMaterial: …/bulk/lamp-oil`, `closure: liquidTight`), torch
  (`interiorBulk: false`, `fuelBed: {…/wood/pine: 0.4}`), candle etc.
- `lib/fire/Firebox.ts`, `Lamp.ts`, `trade-distilling/src/thing/
  Still.ts`, `trade-apiculture/src/thing/Smoker.ts`: drop
  `ReservedMixin`; update the order docstrings (`Burner` outermost,
  `LightSource` next, `Thermal` innermost — the invariant that remains).
- `trade-fuel/src/thing/CharcoalPit.ts`: remove `draught` and the dead
  `charMaterialPath` (the field is `BurnerMixin`'s now); `CharController`
  unchanged in behaviour; fix the unused `watching` (guard the scene).
- Verbs: `platform/cmd/device/stoke.yaml` (`verbs: [stoke, fuel]`;
  args `fuel` object, required, `scope: reachable`, `greedy: true`,
  `requires: TangibleMixin`; `burner` object optional, `prepositions:
  [into, in, on]`, `default: "reachable:[mixin.BurnerMixin]"`,
  `requires: [BurnerMixin]`) + `StokeController.ts` (binds, calls
  `burner.stoke(item)`, narrates each refusal in the burner's words:
  *"A stone will not burn."* / *"It is too sodden to catch."* / *"The
  firebox is full."*); `platform/cmd/device/draught.yaml` (`verbs:
  [draught]`; args `fire` object optional with the Burner default;
  `setting` string optional: a number 0..1 or one of `wide|open|low|
  banked`) + `DraughtController.ts` (narrates the new setting in words
  — *"You open the vents wide. The fire draws, roars, and burns pale."*
  / *"You bank it down under its own ash; a dull red glow, and it will
  keep."*). Both afforded on `BurnerMixin.commandContributions`
  (`environment` + `peers`, the ignite/douse precedent).
- `look` at a burner: a `markupAugmenter` on `BurnerMixin` — *"It is
  burning oak."* / *"…oak, with a little peat."* / *"It is cold, and
  the bed is empty."*; and the brightness sentence the requirements
  demand: *"The flame burns clean and sheds little light."* when
  completeness ≥ 0.85, *"The flame is yellow and smoky and lights the
  room."* when below. Filter-gated (the `fractionAugmenter` lesson).
- `scripts/check-light-sources.ts` clause (g) unchanged (`lit` stays a
  field).

**Content.** Every burner row (G1's fourteen `burnTemperatureK`
authors + lamp/torch/candle/smoker rows): delete `reserves: fuel:` and
`fuelBurnRatePerMin:`; add `maxBurnPowerW:` (and `fuelCapacityKg:` where
not the default) and, for a row that ships lit (the campfire, the
practicum brazier), a `fuelBed:` seed. `charcoal.yaml` material: fix
`autoignitionPoint` → `autoignitionTemperature`, add `heatOfCombustion:
30`. Every material a row names as fuel must author `heatOfCombustion`
(audit the 26 + pine/willow/birch/hazel for the cordwood rows).
`lint:instanceable` invariant 12 is the backstop for a missed key.

**Tests.** Rewrite `Burner.test.ts`, `Lamp.test.ts`, `Hearth.test.ts`,
`Combustible.test.ts` (the wet function forwards), `SpaceHeating` /
`Atmospheric.envelope.test.ts:271`, `smelt.test.ts:113-114` (reads
`burnTemperatureK` × bellows directly — becomes a stoked-charcoal
assertion), `burn.test.ts:122`, `salt.test.ts`, `sugaring.test.ts`,
`malting-chain.test.ts`, `fermentation-distilling.test.ts:165`, every
fixture that `setBurnTemperatureK` (keeps working — the setter stays) or
seeds a `%` reserve (becomes `fuelBed`). New: `Stoke.test.ts` (the
three refusals + a lit and a cold stoke + two charges of oak, 6 kg vs 1
kg, the heavy one still lit when the light one is out — AC3),
`Draught.test.ts` (open = hotter, dimmer, cleaner; banked = cooler,
slower, embers; completeness falls with the scope's air share),
`Burner.worked.test.ts` (a test-local `fuelSource() → worked` Burner:
no smoke, CO₂ emitted, dim, smothers in a sealed test cell — D14's
kernel half, `FireController.test.ts`'s author-your-own-class
precedent).

**Un-dirty the whiskey drives.** With `stoke` shipped, both whiskey wire
files stoke the still before `ignite` and lose the fuel clause from
`DIRTY_REASON`; if the remaining clauses (the charge nothing puts back)
still hold they stay `.dirty.` for that reason only — the plan does not
promise more than the requirements do (AC2's sentence is *"stop needing
their dirty marker for this reason"*).

**Darkness sweep.** `lint:light-sources --report` diffed against W0's
baseline; any room whose only light is a fire and that drops a band at
full draught gets its row's `emittedIntensity` raised (the ceiling is
authored for exactly this) and the change is listed in the commit body
(AC20).

**Acceptance.** AC1, AC2, AC3, AC4, AC5, AC18 (the oven bakes, the still
runs, the clamp chars — run `test:near` across trade-baking,
trade-distilling, trade-fuel, trade-smelting), AC20.

**Commit.** `build(fire W1): a burner knows its fuel — the bed, stoke, the draught, and heat, light and exhaust derived`

### W2 — A gas is matter only a sealed vessel holds ✅ DONE

> **Build note (W2).** D2 and D10, and the three closure defects closed.
>
> **B14 — `isGasRetained` asks what a slot ALREADY holds, so the escape
> check cannot use it.** An empty can holds nothing and therefore answers
> *retained*, which would have let the arriving gas straight in. The
> transfer asks the destination's LID directly instead. ⭐ A question
> about what is arriving is not the same question as a question about
> what is there — and the public `isGasRetained()` read is still the
> right answer to the second one.
>
> **B15 — ⛔ The lid test was inverted on the first write.** `retained =
> !isSealable || isOpen()` says a shut bottle leaks. Caught by the test
> for the case it exists for.
>
> **B16 — R7 resolves as "no declaration".** `CLOSURE_ORDER` is a
> `Record`, and `lint:closed-vocabularies` only sees arrays of literals
> (its own documented limit 3) — so it does not count the new membership
> test, and the gate **refuses a stale exemption** by design: *"an
> exemption for a vocabulary whose consult shape the detector can no
> longer see reads as a considered judgement about live code and is not
> one."* Declaring it would be exactly the inert claim the gate exists to
> prevent. Recorded here instead.
>
> **Also:** a gas poured at a SURFACE escapes too (nothing lies on a
> table); `Thermal.reconcileBulkPhase`'s boil arm skips a gas, without
> which a lamp filled with coal gas would be destroyed by its own flame
> on the first tick; both air tanks author `closure: sealed`, which they
> now need because air has a boiling point; `getAirGauge()` becomes an
> honest pressure read by reinterpretation, with no new field.


**Goal.** D2, D10; the closure defects closed.

**Kernel.**
- `lib/bulk/Bulkable.ts`: `setClosure` validates against
  `CLOSURE_ORDER` keys and throws (declare the membership test in
  `check-closed-vocabularies`' registry as a physics scale — see G13).
  ⚠ Same applier fact as W0: a throwing setter fails the row's
  hydration outright, so the three `none` rows MUST change to `open` in
  this same wave or the sap-pan, the pail and the salt-pan stop
  cloning; the content-scan test below is what proves none is left;
  `getGasPressureAtm(affordance?)`; `isGasRetained(slot)` (closure ≥
  required ∧ (not Sealable or shut)); `bulkContentsAugmenter` renders a
  gas interior as *"It holds gas, at a little under a full charge."* —
  level words off the pressure, never a number.
- `platform/idea/api/BulkableLogic.ts`: `requiredClosureFor(material)`
  per D2 (reads `boilingPoint` vs `atmosphere.standardK`); transfer step
  3 third branch — required `sealed` and destination under it (or a
  `Sealable` destination standing open) → `status: 'escaped'`, note
  `target-declined / gas-escapes`, `from.debit(applied)`, litres emitted
  into the destination holder's scope via `addAtmosphereContent` (walk
  outward to the first `Atmospheric` container; none → lost). Surface
  destinations: a gas never lands on a surface — route to the same
  branch. `TransferStatus` gains `'escaped'`; `FillController`/
  `PourController` narrate it (*"It will not stay in an open pail — it
  is gone into the air."*).
- `lib/thermal/Thermal.ts` `reconcileBulkPhase` boil arm: skip when
  `requiredClosureFor(material) === 'sealed'` (a gas does not boil
  away; retention is closure's job). The freeze arm is unaffected.

**Content.** The three `closure: none` rows → `closure: open` (sap-pan,
pail, salt-pan — their prose already says *no lid*); `air-tank.yaml`,
`air-compressor.yaml` → `closure: sealed`; `bulk.md`'s stale file-map
line (`requiredClosureFor` lives in the logic singleton) fixed at the
sweep.

**Tests.** `Bulkable.closure.test.ts` (the `none` throw; the three rows
read `open`; drain-through now actually happens for the pail — the
live defect), `requiredClosureFor` by boiling point (air, coal gas →
sealed; water, lamp oil → liquidTight), the escape branch (open pail,
liquid-tight bottle, open-lidded sealed can → `escaped`; shut sealed →
held), pressure derivation, AirTank refill still works end to end.

**Acceptance.** AC10 (mechanism; the words land with the vessels in
W3).

**Commit.** `build(fire W2): gas is bulk that only a sealed vessel holds — closure validated, phase derived, the escape branch`

### W3 — The retort, the condenser, the gasometer: tar, pitch, coke, coal gas ✅ DONE

> **Build note (W3).** D3 and D11, and `trade-fuel` grew a second
> chamber beside the clamp. Four decisions the plan did not make.
>
> **B17 — ⭐ `placements: [on]`, not a bespoke `outlet` member.** The
> plan's own reachability table flagged this as one of the two links most
> likely to die silently, and it was right: `Placement` is a ROW
> vocabulary (`on`, `in`, `from` — three rows under
> `/platform/idea/Placement/`) and a member naming no row makes `place`
> refuse in the vocabulary's own phrase. A condenser stands ON the
> retort, which is both true and already expressible. No new row, no new
> vocabulary.
>
> **B18 — The gas bladder needs NO class.** `Flask` is already
> `Thermal(Sealable(Bulkable(Good)))` — carried, holds bulk, and has a
> lid whose state matters — so a bladder is that row with `closure:
> sealed` and `open: false`. Two classes shipped instead of four
> (`Retort`, `Condenser`, `Gasometer`; `GasBladder` declined).
>
> **B19 — ⛔ Coal had no tag meaning COAL.** `firingsFor` matches a
> charge by material tag, and coal carried `fuel` and `carbon` —
> which charcoal and coke also carry — so a `fire` on a loaded retort
> could not tell a coal charge from a charcoal one and would have matched
> whichever recipe came first. A `coal` tag added; ⚠ the smelter's two
> existing reads are untouched, which the pack's suite asserts.
>
> **B20 — Coal tar authors NO toxicity, deliberately.** Its real hazard
> is chronic (carcinogenic, over years of contact) and this game models
> an acute dose and a breath; a dose here would need a new toxin type
> AND a new `Condition` row to mean anything, and a toxin with no
> condition behind it is a number nothing reads. The hazard is recorded
> in the row's prose rather than faked as an acute figure.
>
> **The routing, which is what had three silent failure modes:** a
> receiver that swallows a gas, a condenser that drops an overflow, and a
> chamber with nothing on it that loses the lot instead of filling the
> room. `receive()` returns what it TOOK and the caller passes the
> remainder on, so *retort → condenser → gasometer* composes with no
> class knowing more than its neighbour, and every leftover litre ends up
> somewhere a player can measure.
>
> **AC9 needed no smelter code**, as the plan predicted: coke is tagged
> `fuel`+`carbon` and not `sulfurous`, so it passes every gate charcoal
> passes. The case is asserted in `trade-smelting`'s own suite beside the
> coal one.
>
> **Verified:** `retort.test.ts` 12 green; `trade-smelting` 32 green;
> `Bulkable` 65 green; the census holds at 47/47 pure repeats.


**Goal.** D3, D11, the `trade-fuel` expression; AC7–AC12 reachable.

**Kernel (small).**
- `lib/craft/Recipe.ts`: `volatiles: RecipeVolatile[]` (`{material:
  string; litresPerKg: number}`), validated in `fromData` (a material
  path string, a positive number), `fieldMeta` spoiler 1, `getVolatiles()`.
- `platform/idea/cmd/device/FireController.ts`: `runFiring` sums the
  consumed items' `getMass()`, computes litres per volatile, and calls
  `kiln.receiveVolatiles?.(materialPath, litres)` when the chamber
  declares it (a structural probe on the host — the `analyze water`
  shape-not-mixin rule, so the platform never names the trade); a
  chamber with no receiver method emits into its scope. The firing's
  heat gate reads the derived pin as before.

**`trade-fuel` (`/trade/fuel`).**
- `src/thing/Retort.ts` — `ContainerMixin(PlacingMixin(Firebox))`: the
  chamber is the Container (the charge), the fire is the bed (`stoke`),
  the `outlet` placement member (`PlacingMixin` members are rows) seats
  the receiver. `receiveVolatiles(materialPath, litres)`: hand to the
  placed `Condenser` if one is on the outlet, else `scope.
  addAtmosphereContent`. `commandContributions` names nothing new — the
  platform's `fire`, `stoke`, `draught`, `ignite`, `douse` reach it
  through `BurnerMixin`.
- `src/thing/Condenser.ts` — `PlacingMixin(BulkableMixin(ThermalMixin
  (Good)))`, interior `liquidTight`, capacity authored. `receive(material
  Path, litres)`: a liquid at ambient (required closure `liquidTight`)
  → `BulkableApi.transfer` from an unbounded source into its interior
  (the conjure-water shape); a gas → pass to the vessel placed on its
  own `outlet`, else the scope. Prose on `look`: *"a coil of copper
  pipe sweating into a tar-black receiver"*.
- `src/thing/Gasometer.ts` — `BulkableMixin(Thing)`, `closure: sealed`,
  interior `coal-gas` capacity 20 000 L, a fixture-weight row; a
  `markupAugmenter` renders the bell in **five level words** off
  `getGasPressureAtm()` (*"the bell sits on its seal"* … *"the bell
  rides high"*), visible on the room's `look` as a prop line — read
  from across the yard, no digit, identical for two viewers (AC11).
- Rows: `thing/retort.yaml`, `condenser.yaml`, `gas-bladder.yaml`
  (`BulkableMixin(Good)` — reuse `/platform/thing/Vessel`'s class if its
  chain is `Bulkable(Good)`; else a two-line `GasBladder` class),
  `gasometer.yaml`, `coke.yaml` (`/platform/thing/Provision`, material
  coke, mass 6), `tar-pot.yaml` (a liquidTight vessel, optional).
  Materials under `content/stuff/idea/material/`: `bulk/wood-tar.yaml`
  (density 1100, boilingPoint 520, `purifiedByBoiling: …/bulk/pitch`),
  `bulk/pitch.yaml` (1150, meltingPoint 0, boilingPoint 600),
  `bulk/coal-tar.yaml` (1200, bp 540), `gas/coal-gas.yaml` (density
  0.55, boilingPoint 110, heatOfCombustion 50, autoignitionTemperature
  870, toxicity `[{carbonMonoxide, 20}]`, tags `[gas, fuel]`),
  `organic/coke.yaml` (density 500, heatOfCombustion 29, autoignition
  970, tags `[organic, carbon, fuel, porous]` — **no `sulfurous`**).
  Recipes `content/recipes/retort-wood.yaml` (inputSlots `[{slot:
  charge, kind: item, category: wood, count: 4}]`, `requiresHeatK: 650`,
  `outputTemplate: /trade/fuel/thing/charcoal`, `volatiles:
  [{wood-tar, 0.08}]`, `discipline: colliery`) and `retort-coal.yaml`
  (`category: coal`, `requiresHeatK: 1100`, output coke, `volatiles:
  [{coal-tar, 0.04}, {coal-gas, 300}]`). ⚠ `firingsFor` matches by tag
  — `coal.yaml`'s tags include `fuel` and `carbon`; a `fire` on a
  retort charged with charcoal must match nothing, so the recipes'
  categories are `wood` and `coal` (not `fuel`).
- `fuel-yard.yaml` props: the retort, the condenser, two bladders, the
  gasometer, four `/trade/quarrying/thing/coal` lumps, eight
  `/trade/forestry/thing/cordwood` lengths (⚠ NOT `…/thing/log`, whose
  keywords are `[log, firewood, wood, crown]` — `CharController.
  isCordwood` and the retort recipes' `wood` tag both want the
  `cordwood.yaml` row — class `/platform/thing/Crop`, material
  `wood/hazel`, `mass: 3.2`; hazel authors `heatOfCombustion: 16` and
  `autoignitionTemperature: 560`, verified); prose gains
  the brick retort beside the clamp and the gasometer's bell. The
  collier keeps the clamp (coexistence by decision — nothing is removed).
- Oil works: `oilworks/location/floor.yaml` prose loses *"(the crafted
  route is a later build)"*, props a retort + condenser; `lamp-oil.yaml:13`,
  `trade-fuel/pack.yaml:14`, `oilworks.yaml:7` comments say the retort
  stands and makes tar; lamp oil from a retort's light fraction is the
  cuts rung's (drilling/refining), named there.
- The `fire` verb's `mixed-charge`/`no-firing` prose works unchanged.

**Smelter.** Nothing in code (G12): coke is tagged `fuel`+`carbon`,
not `sulfurous`; a drive charges coke baskets and gets a sound bloom.
`smelt.test.ts` gains the coke case (AC9).

**Tests.** `trade-fuel/src/__tests__/retort.test.ts`: fire a wood charge
with no condenser → charcoal + the room's medium carries tar-less
smoke? — no: volatiles with no receiver go to the scope as **their own
material** (wood tar vapour condenses nowhere → it is in the air; the
air reads *"heavy with tar reek"* via the content's material name);
with the condenser → charcoal + litres of wood-tar in the condenser;
coal → coke + coal-tar in the condenser + coal-gas in the bladder on
the outlet; no bladder → gas in the scope; bladder `open` → escaped;
boil the tar → pitch; the gasometer level words at 0 / half / full;
two viewers read the same words; `fill lantern from gasometer` → the
lantern's interior is coal-gas and `ignite` lights it, flux ≈ 0.3 ×
ceiling (AC12). A content-scan test that every `volatiles.material`
path resolves to a row that `requiredClosureFor` classifies as the
recipe intends.

**Acceptance.** AC7, AC8, AC9, AC10 (words), AC11, AC12.

**Commit.** `build(fire W3): the retort beside the clamp — tar, pitch, coke, coal gas, the condenser and the gasometer`

### W4 — Firedamp: the gas that kills you, the lamp that lets you work, the gas you drain ✅ DONE

> **Build note (W4).** D12 and D13. ⛔ **And one correction that
> invalidates W0's B2**, found by the test that exists for exactly this.
>
> **B23 — ⛔⛔ The breathable share is a DISPLACEMENT figure, not a
> toxicity one, and conflating them broke firedamp.** W0's B2 reset the
> shares to 0.95 / 0.93 / 0.88 by reasoning from carbon dioxide being
> dangerous to breathe at 5 %. Those are two different hazards:
> displacement is about how much oxygen is left, toxicity is the
> material's own `toxicity` tag. At 0.95 a heading holding 14 % methane
> read as **unbreathable** — so the canary would have reacted to it, and
> ⭐ the one thing the third damp must not do is be a third copy of
> blackdamp. Methane genuinely is breathable at the fractions that will
> kill you by burning; that is *why* its tell is a flame and not a bird,
> and why a Davy lamp exists.
>
> **Shipped: the plan's original numbers.** `atmosphere.breathable
> AirShare` **0.76** (≈16 % oxygen, where a person starts labouring),
> `fire.air.completeAirShare` **0.85**, `fire.air.smotherAirShare`
> **0.70**. The ordering the requirements demand holds: sooty → in
> trouble → out. ⚠ **Recorded seam:** carbon dioxide really is toxic near
> 5 % and authors no `toxicity`, because a dose would need a
> `carbonDioxide` toxin type AND a `Condition` row behind it to mean
> anything. So a shut cellar warns by displacement rather than by
> poisoning, later than it should. The metabolism tail owns it; faking an
> acute dose would be worse than saying so.
>
> **B24 — ⭐ The flash runs at `ignite` as well as on the tick, with the
> igniting object passed as the flame.** The tick's check finds a flame
> that is already burning; the case that actually kills people is a miner
> walking into a gassy heading with a COLD lamp and striking it. Without
> passing `stuff`, `nakedFlameIn` would find nothing (it is not lit yet)
> and striking a light in firedamp would be safe — the opposite of true
> and the opposite of the lesson.
>
> **B25 — The flame cap arrives at a FIFTH of the explosive limit**
> (`fire.flammable.capAt` 0.01 against `ignitesAt` 0.05). A tell that
> arrived at the same fraction as the flash would be an epitaph rather
> than a warning.
>
> **The hazard has no field.** `Deposit.gas` is a Material path, a depth
> band and a strength; everything else derives. A content is flammable
> because its material has a `heatOfCombustion` — the same number that
> gives a fuel its flame temperature — so one fact has two readers and
> there is no `flammable: true` anywhere. ⭐ And the remedy is therefore
> an OBJECT rather than a rule: a safety lamp's flame is enclosed, so the
> check does not find a naked flame, so a player with a gauze lamp works
> ground a player with a torch cannot, and nothing is told to make that
> true.
>
> **The safety lamp is a ROW** over `/platform/thing/Lamp` with one
> authored field (`flameEnclosed: true`), propped at the timbered drift —
> the lamp station, where a miner historically drew one on the way in.
> ⚠ Without the prop the hazard would ship with no counter but *do not go
> in there*, which is not a mechanic.
>
> **`drain` is the RGO law applied to a hazard**: reservoir (20× the
> cell's volume), recharge (a six-game-hour half-life), act (`drain
> <vessel>`), credit (a `mining` deed). ⭐ It is the one hazard in the
> trade you can HARVEST rather than merely survive — and at scale it is
> exactly how a town got its gas supply, so the act that makes a heading
> safe is the act the industrial epoch is built on. Only a sealed vessel
> holds it, and that refusal is the VESSEL's: a gas's required closure
> derives from its boiling point.
>
> **Verified:** `firedamp.test.ts` 9 green against the SHIPPED rows (a
> synthetic fixture would pass identically while Ferrow's own band was a
> typo); biome, respiration, reading, hearthworks suites green after the
> share correction.


**Goal.** D12, D13; AC13–AC15.

**Ground pack (`/system/ground`).** `Deposit.gas?: {material: string;
belowZ: number; strength: number}` (`fieldMeta` persistent, authorable,
spoiler 1); `GroundSample.gas` resolved in `sampleAt` (`null` above
`belowZ`); `Deposit.test.ts` case.

**`trade-mining`.**
- `src/lib/Working.ts`: `firedampDrawnL`, `firedampDrawnStamp`
  (persistent runtime); `airAt()` → after `settleAir`, read
  `sampleHere()?.gas` and `setAtmosphereStanding(gas.materialPath,
  gas.strength × (1 − air) × (1 − drawnFraction()))` (or clear it);
  `drawnFraction()` = `drawnL / reservoirL` with `reservoirL = strength ×
  volumeL × dial(mining.firedamp.reservoirMultiple, 20)`, recharging by
  half-life `mining.firedamp.rechargeHalfLifeDays` (reconcile-on-read);
  `drain(vessel): DrainOutcome` — refuses when no gas stands here
  (`no-gas`), when the vessel is not a Bulkable interior (`no-vessel`),
  when its closure is under `sealed` or it stands open (`not-sealed`,
  in the vessel's words — *"it will not hold in a pail"*); otherwise
  `BulkableApi.transfer` from an unbounded firedamp source of
  `min(remaining, standingLitres)` litres, `drawAtmosphereContent` the
  same litres, `firedampDrawnL += litres`; credits a `mining` deed.
  `settleAir`'s own cast write stays (D7).
- `content/trade/mining/cmd/mining/drain.yaml` (`verbs: [drain]`; arg
  `vessel` object, `greedy: true`, `scope: reachable`, `default:
  "reachable:[mixin.BulkableMixin]"`, `requires: [BulkableMixin]`) +
  `src/idea/cmd/mining/DrainController.ts` + the controller row
  `content/trade/mining/idea/cmd/mining/DrainController.yaml`; added to
  `WorkingMixin.commandContributions.self/inventory`.
- `content/stuff/idea/material/gas/firedamp.yaml` (density 0.72,
  boilingPoint 112, heatOfCombustion 55, autoignitionTemperature 810,
  no toxicity, tags `[gas, fuel]`).
- `content/trade/mining/thing/safety-lamp.yaml` — class
  `/platform/thing/Lamp`, `flameEnclosed: true`, `lit: false`,
  `interiorBulk: true`, lamp-oil, `mass`, prose of the gauze; propped at
  the Ferrow pithead/lamp room (find the room that props the canary —
  `grep -rn canary rejection/.../ferrow` — and prop the lamp beside it)
  and sold nowhere this build.
- `rejection/.../idea/deposit/ferrow.yaml`: `gas: {material:
  /stuff/idea/material/gas/firedamp, belowZ: -30, strength: 0.14}` with
  a header paragraph (a coal-measure gas in an iron mine is the
  venue's choice and is said so; a second mine authors none).

**Kernel.**
- `platform/idea/api/FireLogic.ts`: `flammableMediumCheck(room)` in
  `advanceFireInRoom` before spread — for each content whose material
  has `heatOfCombustion > 0` (a flammable gas, by the row) at a fraction
  ≥ `dial(fire.flammable.ignitesAt, 0.05)`: find a naked flame (D13 walk)
  → **flash**: `drawAtmosphereContent(type, all)`; every Creature in the
  room takes `ConditionApi.inflict({mechanism: 'heat', energy:
  dial(fire.flammable.flashEnergy, …) × fraction / ignitesAt, site:
  'torso'})` (the one heat channel — armour inversion applies);
  `depositHeat` + `tryAutoignite` on co-located combustibles; a scene
  message to the room; a deed of nobody's. `igniteImpl` runs the same
  check first so lighting a lamp in a gassy heading is the flash.
- `BurnerMixin` look augmenter (W1's) adds the **flame cap** when lit
  and the scope's flammable fraction ≥ `dial(fire.flammable.capAt, 0.01)`:
  *"The flame stands tall and wears a faint blue cap."* — the tell that
  is not the canary (AC13). The canary brain is untouched: firedamp at
  ignitable fractions leaves the air share above the breathable floor,
  so the bird sings (AC19).
- `AtmosphereReading.measure` (W0) already names every content; the
  analyser reports *"firedamp — enough to burn"* above `ignitesAt`.

**Tests.** `trade-mining`: a heading below −30 m dead-ended at
`AIR_REACH` depth accumulates firedamp above `ignitesAt` while blackdamp
has not yet set in (the canary is silent on it — assert `airShareOf >
breathableAirShare`); hole through → clears; a lit torch carried in
(one level deep) → flash: fraction 0, a burn inflicted, the torch still
lit; the safety lamp carried in → no flash, the cap line renders; `drain`
into a bladder → litres in the vessel, standing suppressed, the heading
workable; drain into a pail → `not-sealed`; the reservoir falls across
repeated drains and recharges. `Deposit.gas` above/below the band.

**Acceptance.** AC13, AC14, AC15, AC19 (the canary half).

**Commit.** `build(fire W4): firedamp — a gas in the seam, the flash, the safety lamp, and drain`

### W5 — The kiln's smoke comes from the fire ✅ DONE

> **Build note (W5).** `Material.combustionImparts` ships, the peated
> kiln recipe is **deleted**, and one more real defect fell out.
>
> **B21 — ⛔⛔ `applyEdibleOutput` handled NEITHER `imparts` nor the
> fire's — and it is the branch COOKING takes.** The plan said to fix the
> derived branch of `applyBulkOutput` ("which drops `imparts` entirely");
> there is a third output branch, it is the one every cooked dish goes
> through, and it folded no aromatics at all. So a recipe declaring
> `imparts:` on an **edible** output added nothing, silently, and smoking
> meat over a peat fire gave clean meat. ⭐ Found by a test written for
> the fire half: the fire's imparts never arrived, and the reason was
> that the recipe's own never had either. Fixed with one `addAromasTo`
> helper called from all three branches, so the next output kind cannot
> quietly miss it.
>
> **B22 — `volatilesFrom` is PRIVATE, and `lint:lib-statics` is why.**
> It has one caller (`fromData`), so a public static would be a member in
> neither of the two places a person searches — and the gate caught the
> +1 (340 against a ceiling of 339). ⭐ Being the same shape as its four
> sibling validators says it may EXIST, not that the population may
> grow; and the test is better for it, because asserting through
> `fromData` exercises the path a pack install actually takes.
>
> **The recipe is gone, not deprecated.** `kiln-malt-peated` was
> `kiln-malt` plus `imparts: [{smoke, 30}]` plus four turves as an ITEM
> SLOT. Three things that cost: *the same recipe over a different fire*
> was inexpressible; the turf's own moisture was invisible, because an
> item slot cannot see it, so an as-cut turf kilned exactly like a dried
> one; and the fuel was an input to a recipe rather than the thing in the
> firebox. ⭐ The Crowsfoot floor's own comment recorded the seam and
> named the fix — *"a burner that knows and dries its own fuel, on the
> fire/energy slate"* — and that burner shipped, so the comment is
> replaced by what happened rather than restated.
>
> **A mixed bed is weighted by mass** (`Burner.fuelShareOf`): half peat
> and half oak reads half as smoky, which is what a maltster actually
> controls and what an item slot could never express.
>
> **Verified:** `CraftingLogic.medium` 23 green including four new cases
> (smoky fuel, clean fuel, mixed bed, and the misspelt-aroma refusal);
> `malting-chain` rewritten and green; the still book, the hand's
> competence note and the turf stack's prose all updated.


**Goal.** The fourth consumer; AC16. The kiln rows live in
`trade-malting` (G8), which the requirements call the distiller's
kiln — the plan touches the pack that owns the rows and says so.

- `lib/material/Material.ts`: `combustionImparts: {type: string; amount:
  number}[]` (persistent, authorable, spoiler 1) — aroma compounds, mg/L,
  that burning this material puts into what is worked over its fire;
  validated like `Recipe.imparts` (the `AROMAS` membership, reusing
  `Recipe.impartsFrom`'s shape — move that validator to a static on
  `DissolvedAromatics`? ⚠ `lint:lib-statics` counts down; keep it as a
  module-private function in `Material.ts` that calls
  `DissolvedAromatics.isAroma`, the existing membership test).
- `platform/idea/api/CraftingLogic.ts` `applyBulkOutput`: after the
  recipe's `imparts`, read `Thermal.reachableHeatSource()` (W1) off the
  maker's position → `source.fuelMaterials()` → each material's
  `combustionImparts` scaled by that material's share of the bed, added
  through the existing `addConcentrations`. **Both** branches (the
  derived branch today drops `imparts` entirely — S3 §6; fix it while
  here so a derived-blend output over a peat fire is peated too).
- `base-library/.../organic/peat.yaml`: `combustionImparts: [{type:
  smoke, amount: 30}]`. Oak/pine/hazel/charcoal/coke/coal-gas author
  none.
- `trade-malting/content/recipes/kiln-malt-peated.yaml`: **deleted**;
  `kiln-malt.yaml` keeps its header and gains one paragraph — the smoke
  comes from the fire. `malt-kiln.yaml` already an `Oven` row (W1 gave
  it a bed). The whiskey-styles wire drive stokes the kiln with peat
  before `make kiln malt`; the plain whiskey drive stokes it with wood.
  A sodden turf (`stoke` of a `WaterActive` turf above `cure.band.driedAt`)
  refuses with the wet sentence (AC16).
- Tests: `malting-chain.test.ts` — the same recipe over peat vs oak:
  `dissolvedAromatics` smoke 30 vs none; a sodden turf refused at the
  stoke, not silently accepted; `crafting.md`'s history paragraph gets
  its closing note at the sweep.

**Commit.** `build(fire W5): the peated kiln derives — combustionImparts on the fuel, one kiln recipe, the sodden turf refuses`

### W6 — `oil-lit` ✅ DONE

> **Build note (W6).** D15, and it is one returned string plus thirteen
> comment and doc lines. A `FuelStore` holds lamp OIL — a liquid out of
> casks — and calling that *gas-lit* named the wrong fuel, the wrong
> supply chain and the wrong century.
>
> ⭐ The reservation is the point: a town is gas-lit when its supply
> burns a GAS, which W3 has just made possible (coal gas off a retort, a
> gasometer to hold it) and which wants a gas main and a `FuelStore` that
> stores gas — the power-utility slate's. Spending the word on oil now
> would make the real thing unnameable when it arrives, which is recorded
> in `GridReading.epochOf`'s own comment.
>
> The `energy` and `cold-storage` wire drives' assertions follow.


**Goal.** D15; AC21.

`energy/src/idea/reading/GridReading.ts:156` → `'oil-lit'`; the
docstrings at `:8,134-146`; comments in `FuelStore.ts:2`, `Locality.ts:
114,329,367`, `energy/pack.yaml:13`, `energy/README.md:14,25`,
`lamp-oil-cask.yaml:35`, `oilworks/agent/hand.yaml:33`; `energy.dirty.
wire.test.ts` if it asserts the word; `docs/subsystems/energy.md`
(`:103,109,113`) at the sweep. Reserve the word: a comment in
`GridReading.epochOf` says `gas-lit` is a supply that burns gas, which
the utility slate owns.

**Commit.** `build(fire W6): an oil-burning town is oil-lit — gas-lit reserved for gas`

### W7 — The drive ✅ WRITTEN (record below)

> **Build note (W7).** `packages/wire/tests/fire.dirty.wire.test.ts` —
> the requirements' 28 steps as checkpoints that CAN fail, with the
> `understood()` helper carrying the assertion no controller test can
> make: *the verb exists, something affords it here, its row resolves,
> its catalogue is warm, and the binder bound.*
>
> ⚠ **Three acceptance criteria are time-dependent at the clock's shipped
> scale and are named as such in the file's header** rather than asserted
> vacuously: AC3's tail (a 12 kg charge outlasting a 1 kg one is hours of
> burning — pinned as `fuelEnergyJ / burnPowerW` arithmetic in
> `StokeController.test.ts`), AC5's middle (the twenty-times ratio, in
> `DraughtController.test.ts`), and AC12's *burns until doused or empty*
> (16 game hours, walked in `Lamp.test.ts`). ⭐ What only the drive can
> see is everything else about them, and it does.
>
> `DIRTY_REASON` names four consumptions and ⭐ each is a question for
> the trade that owns it: the yard's cordwood wants the collier's
> producer brain (already a recorded seam), its coal wants a hauler from
> Ferrow (the logistics build's), the Ferrow measures recharge on their
> own half-life, and the cellar's firewood wants nothing — a demonstrator
> is allowed to be consumable.


`packages/wire/tests/fire.dirty.wire.test.ts` (dirty: it burns the yard's
coal and cordwood, chars, fires, drains the seam) — the requirements'
28 steps as checkpoints that **can fail** (no `if (x) expect` — assert
the premise in the helper), run against a fresh DB on `WIRE_PORT=2013`
(this worktree's port; `pgrep -f preload.js` first). The drive record
is appended below. Both whiskey drives re-run (W1/W5 touched them).
`docs/subsystems/` updates ride the sweep, but the fire.md § 5
*PIN not the reading* paragraph and bulk.md's closure section are
corrected in this wave because the drive reads them.

**Commit.** `drive(fire): <what driving found>`

### W8 — The worked flame (R2: ships; `fuelSource()`'s second implementer) ✅ DONE

> **Build note (W8).** D14's content half: a 20-line class and two rows,
> on `GlowlightMote`'s exact shape. ⭐ No kernel magic edit — the
> emit-field executor clones whatever `locus:` a row names and asks only
> `isLightSource` of it, so a `Burner`-composing locus is valid as it
> stands.
>
> **It completes a carve the sim already made.** The glowlight's own
> docstring: *"Light only, deliberately no heat — the sim decouples them
> (the Light-split-from-Fire carve), so a glowlight warms nothing and
> never ignites anything."* That is the light side. This is the heat
> side, and it takes **no exemption from the physics a hearth obeys**: no
> fuel so nothing to stoke, no soot so noticeably dim (a player tells a
> worked fire from a real one by looking), and ⭐⭐ it still spends the
> room's air, because conservation is not something magic is exempt from.
>
> ⚠ Its flame is NAKED, so it sets off firedamp. Honest — it is a flame —
> and it teaches: a caster who thinks magic exempts them from the gas
> finds out in the one place it matters.
>
> **The test asserts the pair**, which is what makes R2's argument real:
> `isBurner(workedFlame)` is true and `isBurner(glowlightMote)` is false,
> in one case, so the carve is a fact about two shipped objects rather
> than a sentence in a docstring.
>
> **Verified:** `worked-flame.test.ts` 8 green; `lint:spell-cost` passes
> at the ceiling; the locus row's class path resolves (⚠ it was written
> as `/stuff/thing/magic/WorkedFlame` first — the pack's class root is
> `/arcane-library`, which the glowlight mote's own row shows).


**Goal.** D14's content half; AC17 observable.

`arcane-library/src/thing/WorkedFlame.ts` — `BurnerMixin(LightSource
Mixin(ThermalMixin(Good)))`, `fuelSource() → {kind: 'worked'}`,
`isLit()` = the sustained arm's flux > 0 (`execEmitField` drives
`setEmittedFlux`; the class treats the authored flux as *the working
holds*), `maxBurnPowerW` 2000, `burnTemperatureK` 900, `flameEnclosed:
false` (a naked flame — it WILL flash firedamp, which is honest and
teaches). Rows: `content/stuff/thing/magic/worked-flame.yaml`;
`content/stuff/idea/magic/Spell/conjure-flame.yaml` (`verb: create,
noun: fire`, cost 20, `durationSeconds: 1800`, effects `[{kind:
emit-field, field: light, locus: /stuff/thing/magic/worked-flame}]`).
Test: cast in a sealed test cell → no `smoke` content, `carbon-dioxide`
rises, flux ≈ 0.3 × ceiling, the flame smothers when the share falls;
cast in the open → burns until expiry. ⚠ `lint:spell-cost` applies.

**Commit.** `build(fire W8): a worked flame — heat into the same physics, no fuel, no smoke, dim`

---

## Reachability wiring

Each new capability, the five links. Each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| stoke a fire | `platform/cmd/device/stoke.yaml` → `/platform/idea/cmd/device/StokeController` | `BurnerMixin.commandContributions` env + peers (a lamp in the hand is not a peer) | every burner row: `fuelCapacityKg`, `maxBurnPowerW`; fuel materials author `heatOfCombustion` | none (a mixin static) | `fuel` requires `TangibleMixin`, `greedy: true`; `burner` default `reachable:[mixin.BurnerMixin]`, requires `[BurnerMixin]` |
| set the draught / bank | `draught.yaml` → `DraughtController` | same | `draught` on the clamp row stays 0.45; `fire.draught.banked` seeded | none | `fire` default + requires `[BurnerMixin]`; `setting` is a string arg, parsed by the controller |
| fire a retort | the platform's `fire` (unchanged) | `BurnerMixin` peers | `retort-wood.yaml`, `retort-coal.yaml` recipes installed by `trade-fuel` (the `generic-objects` recipe-document precedent — confirm the pack's `recipes/` contribution kind is read: `charcoal.yaml` already lives there) ; the two output rows; the `volatiles` materials | `RecipeCatalogue` warms from the document store; the retort/condenser/gasometer are `props:` on `fuel-yard.yaml` | `kiln` requires `[BurnerMixin]` (unchanged) |
| catch the volatiles | `place condenser on retort` (`inventory/put`/the Placing verb — verify which verb `ContainmentApi.place` is reached by; `put X on Y`) | `PlacingMixin` members are rows on the retort/condenser (`placements:` — confirm the member vocabulary file) | `outlet` member rows | — | the Placing `canPlace` hook on `Retort` accepts a `Condenser`; on `Condenser` accepts a sealed Bulkable |
| hold gas | `pour`/`fill` (unchanged) | — | bladder + gasometer rows `closure: sealed`; `coal-gas.yaml` `boilingPoint` | — | `requiredClosureFor` by D2; the escape branch narrates |
| read the gasometer | `look` | `Gasometer.markupAugmenters` | the row | prop on the yard | — |
| light a lamp from gas | `fill lantern from gasometer` + `ignite` | `BurnerMixin` env (the lamp in hand) | lantern row `interiorBulk: true` | — | `ignite` requires `CombustibleMixin\|BurnerMixin` (unchanged); W1's `no-fuel` reason |
| measure the air | `measure atmosphere` / `analyze atmosphere` (unchanged) | the platform reading row | `AtmosphereReading.analyze` new | `ReadingCatalogue` | the instrument `gas-analysis` row exists (`trade-mining`'s gas analyser) |
| firedamp accumulates | — (a read) | `Working.airAt` write-through | `ferrow.yaml` `gas:`; `firedamp.yaml` | `MineWarren` carve → `refreshAir`; `onCreate` for the authored drift | — |
| the flash | — (the fire tick + `ignite`) | `FireLogic` | `fire.flammable.*` dials | `fire:tick` armed by `WorldClockRegistry:662` (presence-gated: the player must be in the room — the drive is) | — |
| the safety lamp | — | a `Lamp` row | `safety-lamp.yaml` `flameEnclosed: true`, propped | — | — |
| drain the seam | `trade/mining/cmd/mining/drain.yaml` → `/trade/mining/idea/cmd/mining/DrainController` (+ its controller ROW) | `WorkingMixin.commandContributions.self/inventory` | `mining.firedamp.*` dials in `trade-mining`'s settings (a pack settings contribution — check `content/settings/` exists for the pack; else the platform `fire.yaml`) | — | `vessel` requires `[BulkableMixin]`, `greedy: true` |
| the peated kiln | `make kiln malt` (unchanged) | unchanged | `peat.yaml` `combustionImparts`; one recipe | — | — |
| the worked flame | `cast conjure flame` (unchanged verb) | `CasterMixin` | the spell + locus rows | the spell catalogue | the band gate on the spell row |

⚠ **The two links most likely to die silently:** (1) a pack settings
seed for `mining.firedamp.*` — if `trade-mining` has no `settings`
contribution, the keys never seed and `dial()` falls back to the
literal: fine at runtime, but `config` cannot see them; put them in
the platform's `fire.yaml` if so. (2) the Placing member rows for the
retort's `outlet` — a member name that is not a row makes `place`
refuse with the vocabulary's own phrase; read `spatial.md § Placement`
before W3.

---

## Acceptance-criteria coverage

| AC | wave | how it is shown |
|---|---|---|
| 1 told what it is burning | W1 | `look` augmenter; `fuelMaterials()` |
| 2 add fuel cold or lit; the whiskey drives | W1 | `stoke`; `DIRTY_REASON` loses the fuel clause |
| 3 heavier charge lasts longer | W1 | `Stoke.test.ts` 6 kg vs 1 kg; drive step 5 |
| 4 draught: hot/clean/dim vs cool/sooty/bright, said | W1 | D4–D6 + the augmenter sentences |
| 5 bank, leave, come back | W1 | `draught … banked`; D5 arithmetic |
| 6 sealed interior starves after warning; outdoors not | W0 (+W1 for burners) | D7; `getVolume() === null`/sky → nothing accumulates |
| 7 retort without condenser → smell/measure the air; with → a liquid | W3 (+W0 reading) | volatiles to scope vs condenser |
| 8 wood→tar→pitch; coal→coke+tar+gas | W3 | recipes + `purifiedByBoiling` |
| 9 coke smelts sound | W3 | coke material tags; `smelt.test.ts` |
| 10 gas held only sealed, others say why | W2 + W3 | the escape branch + prose |
| 11 gasometer level in words, two readers agree | W3 | the augmenter; deterministic |
| 12 lamp lit from gas, dim | W1 + W3 | `fuelSlot()`; `lum` at completeness 1 |
| 13 a third gas, warned otherwise than the canary, hurt by a flame | W4 | standing firedamp; the cap; the flash |
| 14 safety lamp works where a naked flame is refused | W4 | `flameEnclosed`; the flash check |
| 15 drained into a vessel, carried out | W4 | `drain` |
| 16 peated by the fire; wood unpeated; sodden refused | W5 (+W1 stoke) | `combustionImparts`; `too-wet` |
| 17 conjured fire smothers, no smoke, dim | W1 (kernel test) + **W8 (observable)** | D14 — ⚠ R2 |
| 18 every shipped flow completes | W1 (+W3) | the four packs' suites + the drive's step 28 |
| 19 nothing reads the air differently | W0 + W4 | tags untouched; the canary unaffected by firedamp |
| 20 no room gone dark; no digit | W0 + W1 | the darkness sweep; `AtmosphereReading` words |
| 21 oil-lit | W6 | `GridReading.epochOf` |

Nothing unmapped. AC17's observability is the one place the plan
reaches outside the requirements' placement table (R2).

---

## Test & gate strategy

- **Unit, per wave** (`pnpm test:near` + the touched pack's `vitest`):
  the files named in each wave. Three new kernel test files
  (`AtmosphereReading.test.ts`, `Stoke.test.ts`, `Draught.test.ts`),
  one `Burner.worked.test.ts`, pack tests `retort.test.ts`,
  `firedamp.test.ts`, the coke case in `smelt.test.ts`, the peat case in
  `malting-chain.test.ts`.
- **Content-scan tests** (the `FractionSchedule` tag-clash precedent):
  every `volatiles.material` resolves and classifies as intended; every
  burner row authors `maxBurnPowerW` and no retired key; every material
  a `fuelBed:` seed names authors `heatOfCombustion > 0`.
- **Only the drive can prove**: the words a player reads (the brightness
  sentence, the cap, the gasometer level, the refusals), that a room lit
  only by a forge is still lit at full draught, that the fire tick's
  presence gate fires in the room the player stands in, that `place
  condenser on retort` reaches the Placing member, that the whiskey
  drives run twice.
- **Lint family**: all of it, every wave. The gates G13 names are the
  ones whose failure would be informative rather than cosmetic.
- ⚠ **`pnpm test` runs exactly twice**: before the MR opens (after W7)
  and at `/finalize`. Not after W0, however wide it is — W0's safety is
  its own tests plus `lint:family` plus the `trace atmosphere` sweep.
- **The dev DB is dropped** before the first boot after W0 and again
  after W1 (a `props:`/field edit never reaches a booted world).

---

## Risks & opens

**R1 — RESOLVED: the word is `cover`, on the merits.** ⛔ An earlier
draft of this section said *"the banking verb owns the word"* and offered
fallback aliases. **That is first-come-first-served, which is not one of
the seven solutions to a verb collision.** The collision was re-evaluated
against the full ladder, both sides:

| rung | verdict |
|---|---|
| 1 synonym | ⭐⭐ **the answer, and applied to the CHALLENGER.** `cover` is free, and *curfew is `couvre-feu`, "cover the fire"* — this game's locality fire ordinance is **already called a curfew** (fire-combustion-slate). Not a consolation prize: the better word for this world. (`rake`, `damp`, `smother`, `slake`, `bed` are also free; `douse` is taken.) |
| 2 unify behind an interface | ⛔ inapplicable — banking money and banking a fire share an etymology and no mechanism. |
| 3 options | ⛔ options add expressiveness to one verb; they do not disambiguate two senses. |
| 4 subcommands | — `bank` is **already** a subcommand dispatcher (8 names). Adding a fire sense there would put a hearth inside the banking view. |
| 5 never co-afforded | ⛔ **FAILS, and not for the obvious reason: a LAMP is a `Burner`.** `bank` is afforded by `lib/banking/Bank.ts` → `peers: [bank.yaml]`; the fire sense would be afforded by `BurnerMixin`. Every lit interior has a lamp, so a branch and a burner are routinely co-present. |
| 6 `keyword::verb` | ⏳ slated, not built. |
| 7 syntax fall-through | ⭐ **genuinely live** — `bank` bare, `bank <one of 8 subcommand names>`, and `bank <a Burner>` are disjoint shapes, and `shape-fall-through` already exists as a binder refusal. Rejected only because it couples two unrelated subsystems' views and would need the dispatcher to let a view *declare* the fall-through. Recorded as the alternative if `cover` is ever regretted. |

**So:** ship `cover [<fire>]` as the verb (afforded by `BurnerMixin`,
`device` category), keeping `banked` as the **value** on the draught
scale so the vocabulary survives in the prose and the help. AC5's
observable — *bank a fire, leave, come back to it still in* — is met;
only the word the player types changes. ⚠ Update AC5's wording in the
requirements doc at the sweep.

**R2 — RESOLVED: W8 ships and is NOT cuttable.** An earlier draft marked
it so. Interrogated, both cut-arguments fail and the keep-argument is
decisive:

- ⛔ **The non-goal is the Fire SCHOOL** — a spell grid, casting
  profiles, faculty, suppression, the discipline leaves. One conjured
  flame is not a school, and the requirements' own wording for that
  non-goal (*"this build decides how a worked fire behaves so the school
  inherits an answer instead of inventing one"*) presupposes the answer
  is **demonstrated**.
- ⚠ **`arcane-library` missing from the placement table was a gap in the
  requirements doc**, now filled. Not a reason to drop a wave.
- ⭐⭐⭐ **The decisive one: D14 puts `fuelSource()` on `BurnerMixin`
  whether or not W8 ships.** Cutting it ships a kernel hook with a
  `worked` branch and nothing exercising it — this repo's most-repeated
  failure (`feel`/`taste` shipped and never ran; reference Ideas went
  inert three times), and the exact thing the requirements phase's
  first-consumer rule exists to catch. It also leaves the hook with ONE
  implementer plus a dead branch, which means it should not be a hook at
  all.
- ⭐ **Cost is three files on an exact precedent.** `GlowlightMote` is a
  22-line `LightSourceMixin(Good)` with an empty body; `emit-field`
  already clones whatever `locus:` a row names, with no default and no
  fallback. The worked flame is that shape with `BurnerMixin`.
- ⭐⭐ **And it completes a carve the sim already made.** The glowlight's
  docstring: *"Light, not heat — the sim decouples them (the
  Light-split-from-Fire carve), so a glowlight warms nothing and never
  ignites anything."* The glowlight proves the decoupling on the light
  side; the worked flame proves it on the heat side.

**R3 — Darkness.** D6 dims every well-run fire to ~30 % of its authored
flux. The sweep is mechanical (`lint:light-sources --report` before and
after) but the ROWS that need raising are a judgment per room; the
commit body lists them. A room whose light is only a lit forge is the
case to look for first (the Hearthworks smithy, the Rejection smelter).

**R4 — The smelter's fuel is double-charged.** The furnace now has a
BED (heat) and the smelt still reads charcoal BASKETS in the furnace's
contents (the reducing charge, the fuel-to-ore ratio). That is the
shipped shape made explicit, not a regression; unifying *fuel is both*
is the metal chain's (Deferred seams). The drive stokes before it
charges.

**R5 — `lib/biome` importing a `lib/bulk` type.** `Concentrate` is a
two-field interface; if `lint:imports`' category table refuses the edge,
declare the shape locally in `Atmospheric.ts` — `Concentration.ts:35-41`
says both consumers satisfy it structurally, and the arithmetic (blend)
is not needed on the medium (contents are summed by type, never
volume-blended across scopes, because nothing transports a medium
between scopes — forward-compat constraint 2).

**R6 — Calibration.** Every magnitude is a dial with a seeded literal;
the numbers above are physical first guesses (a 6 kg charge, 8 kW, 27 m³,
1800 L CO₂/kg). The hearthworks cellar should smother in tens of ticks,
not hundreds, for the lesson to land in a session — tune
`fire.exhaust.litresPerKg` and the smother share together and record
the final values in the drive record.

**R7 — `lint:closed-vocabularies` and the closure validator.** A
membership test over `CLOSURE_ORDER` is a new undeclared kernel
vocabulary to the census. Declare it in the gate's registry with the
reason (a physics scale with three rungs; content never adds one) rather
than raise the ceiling.

**R8 — The clamp's own exhaust.** `char` is not a recipe firing; the
clamp's smoke "going out of the vents" is the burner's incomplete
exhaust at its 0.45 draught into a sky-exposed yard (lost) — drive step
10 checks it reads as before. If the clamp's bed model makes a three-day
burn consume its own charge as fuel, set the clamp row's
`maxBurnPowerW` low (2 kW) so the heat and the charge are distinct in
practice, and record it.

**R9 — Stop-and-ask list for the build agent:** none beyond R1/R2,
which it should decide per the plan's defaults and record. A new module
category, a free helper, a new collection, an `isWizard` check are
constraints with named compliant paths here, not checkpoints.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **Combustible's duration from mass** (D16) → `fire-combustion-slate`:
  `FireLogic.burnPowerFor` is the attach point; one-line swap.
- **Fuel is both the bed and the reducing charge** (R4) →
  `metal-chain-slate`.
- **Boil-down that reduces volume; `purifiedByBoiling` renamed** (D11)
  → `thermal-slate` (boil-as-a-plateau is already there).
- **Mixture density and conductivity; the thermal restamp on an
  atmosphere change** → `thermal-slate` (the asymmetry S2 §1 named).
- **A compressed cylinder (`maxPressureAtm`); gas leaking from an open
  sealed vessel over time** → `destructive-distillation-slate` Stage A
  tail.
- **A FuelStore that burns gas; the gas main** → `power-utility-slate`
  (D15 reserved the word).
- **The blackdamp/stinkdamp tags re-expressed as air carrying something**
  → `mining-slate` § the fluid pass (the requirements' own sentence).
- **The flue as an object; inter-room air mixing** →
  `structures-slate` (constraints 1–4 held: contents resolve through the
  same walk, nothing transports a medium, no room field for a stack,
  building condition untouched).
- **Light quality/colour from the fuel** → a light build (named in the
  requirements).
- **The `conjure-flame` spell's place in the Fire school's grammar** →
  `capability-magic-slate` (W8 ships the minimal row; the school
  inherits D14).
- **`Material` has nothing for smell; `tar` is not an aroma word** →
  `non-visual-senses-slate` (tar reek is reported by material NAME in
  the air reading, never as an aroma tag).

---

## Critical files

Read first, in this order.

1. `docs/requirements/fire-requirements.md` — closed scope; the drive.
2. `packages/server/src/mud/lib/fire/Burner.ts` — W1's whole subject.
3. `packages/server/src/mud/platform/idea/api/FireLogic.ts:250-420` —
   the tick, the oxygen leg, the two sentinel functions.
4. `packages/server/src/mud/lib/biome/Atmospheric.ts:316-340, 612-705,
   1240-1256` and `platform/idea/api/BiomeLogic.ts:36-130, 380-400,
   1155-1303` — the field, the walk, the terminal.
5. `packages/server/src/mud/lib/respiration/Respiration.ts:230-376`.
6. `packages/server/src/mud/lib/maturation/Maturing.ts:115-195`.
7. `packages/server/src/mud/lib/bulk/Bulkable.ts:55-80, 515-535, 622-634`
   and `platform/idea/api/BulkableLogic.ts:80-150, 271-335`;
   `lib/bulk/Concentration.ts`.
8. `packages/server/src/mud/lib/craft/Recipe.ts:95-115, 170-196,
   390-452` and `platform/idea/cmd/device/FireController.ts`.
9. `packages/content/trade-fuel/src/thing/CharcoalPit.ts`,
   `src/idea/cmd/fuel/CharController.ts`, `content/trade/fuel/thing/
   clamp.yaml`, `rejection/.../location/fuel-yard.yaml`.
10. `packages/content/trade-mining/src/lib/Working.ts:140-290, 590-700`,
    `src/idea/MineWarren.ts:330-390, 510-520`, `content/ground/src/idea/
    Deposit.ts:150-420`, `rejection/.../idea/deposit/ferrow.yaml`.
11. `packages/server/src/mud/platform/idea/reading/AtmosphereReading.ts`
    and `TemperatureReading.ts:40-100` (the words precedent).
12. `packages/server/src/mud/platform/thing/Lamp.ts`,
    `lib/fire/Firebox.ts`, `lib/thermal/SpaceHeating.ts`,
    `platform/thing/Oven.ts`, `Hearth.ts`.
13. `packages/content/trade-malting/content/recipes/kiln-malt*.yaml`,
    `platform/idea/api/CraftingLogic.ts:1374-1547`.
14. `packages/content/arcane-library/src/thing/GlowlightMote.ts`,
    `content/stuff/idea/magic/Spell/glowlight.yaml`,
    `platform/idea/api/MagicLogic.ts:2060-2095` (W8 only).
15. `packages/server/scripts/check-light-sources.ts`,
    `check-verb-collisions.ts`, `check-closed-vocabularies.ts`,
    `check-instanceable-placement.ts` (invariant 12).
16. `docs/subsystems/fire.md`, `bulk.md § closure`, `biome.md`,
    `respiration.md`, `instrumentation.md`, `mining.md § Air`,
    `crafting.md § History — whiskey-styles`.

---

## Drive record

*(appended at build time, not at plan time)*
