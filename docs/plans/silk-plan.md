# Silk — implementation plan

Executes [silk-requirements.md](../requirements/silk-requirements.md)
(**kind: feature · leads from: content**; seeded by
[silk-slate.md](../slates/builds/silk-slate.md)). What gets built: a
`trade-sericulture` capability pack (the rearing tray, the egg lot, the
cocoon, the mulberry and its leaf, the reeling tools, the `sericulture`
Discipline, two brains), the silk house in Heart's Delight and a reeler at
the Wharfside mill (rows in those locality packs), the textile chain
learning to keep a fibre's material (`trade-textiles`), `reel` unified
with fishing's (`trade-fishing`), a cloth-finishing seam that degums in
the piece (`trade-textiles` + two kernel lines), kermes as rows
(`trade-farming` + `trade-dyeing`), and a labour bench that derives the
silk prices. Content-led: the only kernel edits are two one-method seams
(D8, D12) and no new category, Api, helper or ceiling.

> ⚠ Read **§ Requirements friction** before W1. Three product sentences
> cannot be built as written, and the plan says what it builds instead.

## Grounding

Verified this cycle by opening the files. Paths are repo-relative.

### The textile chain (what carries silk, and what it does wrong today)

- `packages/content/trade-textiles/src/idea/cmd/textiles/SpinController.ts:51,177-188`
  clones the fixed row `/trade/textiles/thing/yarn` and sets only quantity,
  grade band (from the stock) and `yarnCount`. The input's **material is
  not carried** — `yarn.yaml` authors `_materialPath: …/textile/linen`,
  `shortDescription: skein of linen yarn`, `keywords: [yarn, skein, thread,
  spun, linen]`. Spun wool is linen yarn today. **No maker is stamped.**
- `WeaveController.ts:41,77,137-140` clones `/trade/textiles/thing/bolt`
  (linen, `bolt of linen`), sets quantity, construction form and grade.
  It refuses anything whose template path does not end `/yarn` (`:77`),
  so a yarn **row** is the only shape it accepts — a material-carrying
  yarn on the same row passes. No maker stamped.
- `SpinController.isSpinnable` (`:244-256`) gates on the MATERIAL's
  `fibre` tag and `yarnCount <= 0`: a stock with yarnCount 0 and a
  `fibre` material spins. A reeled skein with `yarnCount: 0` can therefore
  be `spin`-thrown with no textiles change.
- `src/thing/TextileStock.ts` = `StackableMixin(CraftedMixin(Good))` +
  `yarnCount`; `src/thing/ClothBolt.ts` =
  `StackableMixin(CraftedMixin(ConstructedMixin(DyedMixin(Good))))`, no
  `ThermalMixin`, `canMergeWith` narrowed on grade/form/dye stack.
- `CraftedMixin` (`packages/server/src/mud/lib/craft/Crafted.ts:144-148`)
  exposes `getMaker()/setMaker(value)`; `stamp(spec)` writes maker + grade
  + recipe + craftedAt.
- `src/behavior/weaves.ts` — the mill hand's brain: literal verbs
  (`get bale from bales` → `scutch bale` → `spin strick` → `weave yarn` →
  `put bolt in stock`), ONE act per beat (engagements), a no-progress
  guard, `presenceGated = false`, `ambient = false`, `discipline =
  'textiles'`. The `spins` input is hard-coded to the LINE path
  (`:65,201,216`).
- `src/idea/cmd/textiles/__tests__/mill-throughput.bench.test.ts` — the
  bench precedent: reads `content/settings/textiles-trade.yaml` dials and
  tool rows via `fs` + `yaml`, prints hours per bolt, asserts ratios.
- Settings dials live in `content/settings/textiles-trade.yaml`
  (`settings: [{key, value}]`), read by `AppApi.setting(key)` through a
  module-private `dial()` in each controller.
- `content/trade/textiles/cmd/textiles/spin.yaml` arg gate: `stock`
  `requires: StackableMixin`; `wheel` `default:
  "reachable:[capability.spinning]"`, `requires: [ToolMixin]`;
  `options.count`.
- Material rows: `packages/content/base-library/content/stuff/idea/material/textile/{linen,wool,jute,down}.yaml`.
  Linen tags `["textile","fibre","organic","plant","cellulose","greige","once-living"]`;
  wool tags include `protein` and authors `biologicalSource:
  { speciesPath, tissueType: fleece }` — the shape a silk material copies.
- `trade-textiles/content/trade/textiles/idea/maturation/{retting,bleaching}.yaml`:
  `MaturationProfile` rows matched by a material TAG (`inputCategory`);
  `bleaching-green.yaml` + `src/thing/BleachingGreen.ts` whiten FIBRE in
  bulk and state the limit outright: *"PIECE bleaching … wants a durative
  gauge on a discrete object, which is a mixin … a real deferral."*
- `src/thing/SpinningTool.ts` — `Tool` subclass whose
  `commandContributions` (environment + peers) names `spin.yaml`: the
  instrument affords the verb.

### Maturation, the discrete twin, and the thermal coupling

- `packages/server/src/mud/lib/maturation/MaturationProfile.ts`:
  `rateAt(tempK)` (0 at/below `stallBelowK`, ramps to `ratePerDay` at
  `happyK`, 0 above `stallAboveK`), `damageSat(tempK)` (1 at/below
  `damageAboveK`, ramp over 15 K), `forMaterial(material)` (first profile
  whose `inputCategory` is a tag on the material), `getKillK()`,
  `productFraction`, `productMaterial`, `mechanism` (closed: microbial ·
  photochemical · chemical · evaporative · enzymatic).
- `lib/maturation/Ripening.ts` — `RipeningMixin`, the discrete twin for
  a wheel of cheese: integrates `profile.rateAt` over
  `self.temperatureTrajectory(stamp, now).samples(8)`, swaps material at
  finish, writes the worst-stretch band to `Graded`.
  `__validateComposition__` demands `Fresh` + `Thermal` + `Graded`, so it
  **cannot** compose on cloth.
- `lib/thermal/Thermal.ts:834-880` — ambient resolution order:
  `heatSourceK()` (a lit Burner that CONTAINS or SUPPORTS this body) →
  `holderK()` (a shut `Coolbox` enclosing it) → the enclosing
  `Atmospheric` scope's envelope. **A solid inside a vessel of hot liquid
  reads the ROOM's air, not the liquid** — there is no liquid-bath rung.
  `temperatureTrajectory(fromS, toS): Piecewise` (`:334`).
- `platform/thing/Vat.ts:69-74` — `Vat` = `AssembledMixin(… SealableMixin(ThermalMixin(BulkableMixin(Good))))`:
  **not a Container**; nothing solid can be put in a vat. `DyeVat extends
  Vat`. `platform/thing/Feeder.ts` = `FeederMixin(BulkableMixin(ContainerMixin(Good)))`
  — bulk and solid contents coexist on one vessel.
- `platform/idea/cmd/crafting/HeatController` (`heat.yaml` help): *"Anything
  else that holds heat … is set on the fire in reach (`heat vat`), and
  warms there until you take it off (`get vat`)"*; `boil.yaml` is an act
  that latches a build's heat / swaps `purifiedByBoiling` — neither is a
  bath for cloth.
- `lib/thermal/ThermalDose.ts` — a dose integral with its own browning
  `z`, prose (`raw…burnt`, *"The outside is scorched black"*) and a
  recipe-relative "done" — the wrong WORDS for a cocoon.
- `platform/thing/Oven.ts` = `ContainerMixin(PlacingMixin(Firebox))`; a
  thing IN or ON a lit oven takes the firebox temperature as ambient.
  `generic-objects/content/stuff/thing/fixture/range.yaml` (the Hinkley
  kitchen's range, class `/platform/thing/Oven`): `burnTemperatureK: 500`,
  `maxBurnPowerW: 5000`, `fuelCapacityKg: 20`. The malt kiln row holds
  340 K. `generic-objects/content/stuff/thing/brazier.yaml` is a
  `/platform/thing/Hearth` (`SpaceHeatingMixin(PlacingMixin(Firebox))`,
  `platform/thing/Hearth.ts:66`) — a hearth warms its ROOM; an oven does
  not (`lib/thermal/SpaceHeating.ts` header).

### The population precedent

- `packages/content/trade-apiculture/src/lib/Colony.ts` — `ColonyMixin`:
  reconcile-on-read, no far-past guard, `_outsideK` tri-state cache +
  `restampOutside()` walking containment to `BiomeApi.resolveTemperatureFor`.
  Its fields are bees' facts (strength, queen, pollen, stores hooks, the
  swarm, the sting ladder, the forage share). Hosts: `src/thing/Hive.ts`
  (a `Vessel`: `HandledMixin(HandlingMixin(ProducingMixin(ColonyMixin(OrganismMixin(SealableMixin(AtmosphericMixin(DetailedMixin(Vessel))))))))`)
  and `src/thing/Colony.ts` (a `Good` — the nuc you buy).
- `Hive.ts:451-531` — the adoption shape: `canAddContainable` says what
  the box is for, `onContainableAdded` copies a loose colony's state in
  by METHOD and destructs the husk **after the move** (a microtask).
- `Hive.ts:602-641` — a departed swarm is given a body by
  `StuffApi.clone('/trade/apiculture/thing/swarm')` + `ContainmentApi.move`
  — the ONE clone path, used from a mixin.
- `nuc.yaml` is stocked at
  `packages/content/terminus/content/world/terminus/general-store/counter.yaml`
  (`stockLines`, par 1, the one labelled faucet).
- `trade-apiculture/content/stuff/idea/species/…/apis/mellifera.yaml` —
  a trade pack shipping a species row **under `/stuff/`** (commons path,
  pack file).

### Growth, the leaf crop, the panel

- `lib/husbandry/Growing.ts:787-900` — `reconcileGrowth` integrates
  `min(water, light, root, nutrient, warmth)`; `updateFlowering` latches
  only at `currentStage() === 'mature' && _vigor >= 0.8`, and for a
  polycarp sets `_fruitFill = 0`, `_fruitSetCount`; `accrueFruitFill`
  fills at `limiting × dt / fruitFillDays`; `isHarvestable()` for a
  polycarp = `_fruitFill >= 1`. `currentStage()` reads the authored
  `growthStage` field (`:1132`), advancing on `_maturity` days.
- `trade-forestry/content/trade/forestry/thing/hazel-stool.yaml` — a
  `/platform/thing/Plant` authored **ready to cut on a fresh boot**
  (`growthStage: mature`, `_vigor: 0.9`, `_flowering: true`, `_seedSet:
  true`, `_fruitFill: 1`, `harvestTool: cutting`, `discipline:
  silviculture`).
- `trade-forestry/src/thing/Panel.ts` = `PersistableMixin(SingletonMixin(GardenBed))`
  — a bed that remembers being cut across a restart; its
  `commandContributions` copies the four cultivation views beside `fell`.
- `platform/idea/cmd/inventory/HarvestController.ts:222-233` mints
  `fruitSetCount` clones of `harvestTemplatePath` with `madeFrom: plant`
  and stamps the band; `harvest.yaml` target `requires: [VisibleMixin,
  GrowingMixin|CultivableMixin]`.
- `trade-farming/content/trade/farming/thing/plant/cherry.yaml` (a
  polycarp: `fruitSetCount: 12`, `fruitFillDays: 20`), `seed/cherry.yaml`
  (`/platform/thing/Seed`, `growsIntoPath`), `thing/cherry.yaml`
  (`/platform/thing/Provision`).
- `platform/thing/Crop.ts:43` — `Crop extends Provision`.
  `platform/thing/Provision.ts:63-73` =
  `SampledMixin(CraftedMixin(ComposedMixin(ContaminableMixin(WaterActivityMixin(ThermalDoseMixin(FreshnessMixin(ThermalMixin(Good))))))))`,
  **not stackable**.
- `base-library/content/stuff/idea/material/tissue/plant-tissue.yaml`:
  `spoilActivationEnergy: 60000`, `edibility: true`.

### Spoilage, contamination, freshness

- `lib/material/Contaminable.ts` — the second population is a FOOD-host
  gauge with every constant on a `Condition/pathogen/*` row (kill rate,
  `awFloor`, `inoculum`, `infectiousDose`), an invariant *"there is no
  seeding path anywhere in this file"*, and `lint:pathogens` over its
  roster. Nothing in it fits a hereditary insect disease.
- `lib/material/Freshness.ts:905-1035` — `FreshnessMixin`
  (`getFreshnessBand()`: fresh · tainted · spoiled · rotten),
  reconcile-on-read, no far-past guard; `Freshness.advance(load, s,
  material, tempK)` is pure and testable.
- `packages/server/scripts/check-perishable.ts` — a row whose material
  spoils must name a class reaching `FreshnessMixin` (plants under
  `GrowingMixin` exempt).

### Dyeing

- `trade-dyeing/src/idea/cmd/dyeing/DyeController.ts:142-173` —
  `bondPenalty = 0.5` when the fibre has tag `cellulose` and no tannin;
  it multiplies **fastness only**; `strength` (the colour depth) is
  `fullness × exhaust × 1.6` for both fibres. A protein fibre takes alum
  at full fastness today, and the same depth as linen.
- `findBath` (`:230-241`) needs a reachable `Bulkable` whose interior
  MATERIAL is a dyestuff (`Dyestuff.forMaterial(materialPath)`).
  `Dyestuff.all()` globs `/**/idea/dyestuff/*`; `DyestuffCatalogue`
  warms by path infix. `madder.yaml` names `materialPath:
  /trade/farming/idea/material/madder`.
- ⚠ **No shipped mechanism puts a dyestuff into a bath.** Madder root is
  `trade-farming/content/trade/farming/thing/crop/madder-root.yaml`, class
  `/platform/thing/Crop`; the only verb that turns a solid into a bulk
  extract is `steep` (`platform/cmd/crafting/steep.yaml`: solute
  `requires: any`, vessel `requires: [BulkableMixin]`), whose controller
  narrows on `MixinApi.isSteepable` + `getSteepsInto()`; the only
  Steepable class is `trade-medicine/src/thing/Simple.ts` =
  `SteepableMixin(Provision)`. The dye vats author no interior. **No wire
  drive has ever dyed anything** (`packages/wire/tests/textiles.wire.test.ts`
  only walks to the dyehouse).
- `lib/material/Dyed.ts:249-290` — `getColorMix` folds the stack at each
  entry's `strength`; the base is undyed white (a stated deferral).
- `mordant.yaml`/`dye.yaml` arg gates: `target requires: DyedMixin`
  (`ClothBolt` composes it); `dye.bath default:
  "reachable:[mixin.BulkableMixin]"`.

### `reel`, bait, the worked-act protocol

- `trade-fishing/content/trade/fishing/cmd/fishing/reel.yaml`: `verbs:
  [reel]`, `args: []`. Afforded by `src/thing/Rod.ts:28-38`
  (`environment`). `src/idea/cmd/fishing/ReelController.ts` extends
  `FishingController` (`CommandController` + a `decline` helper) and acts
  on the actor's live `FishingEngagement`.
- `packages/server/scripts/check-verb-collisions.ts` — two views
  claiming one verb fail the gate unless allowlisted; the allowlist is a
  to-do, not an amnesty. **One view per verb.**
- `trade-fishing/src/thing/Bait.ts:16` — `BAIT_KINDS = ['worm',
  'baitfish', 'crumbs', 'lure']`, closed.
- `lib/ground/Workable.ts:75-162` — `WorkPlan {kind:'plan', durationMs,
  cost, beginSelf, beginPeers?, token}` · `WorkRefusal {kind:'refusal',
  reason, prose}` · `WorkResult {self, peers?, credit?: {discipline,
  difficulty}}`; `platform/idea/cmd/ground/SplitController.ts:59-61`
  duck-types `Splittable` (`splittable === true` + two methods) and the
  kernel `WorkedActController.land()` credits `giver.creditDeed({discipline,
  difficulty, outcome:'success'})` off `result.credit`.
- `platform/idea/cmd/crafting/ManualBuildController.ts` — `engageStep(ctx,
  {durationMs, effortW, beginSelf, beginPeers?, onComplete, onAbort?})`,
  `bestInstrument(bound, cap)`, `paceMs(baseMs, instrument, kinds)`,
  `declineStep`. Completion closures must be MODULE functions (the
  controller is destructed).
- `lib/advancement/Advancement.ts:283,536` — `creditDeed(subcheck,
  opts?)`, `competenceBandFor(discipline)` (reads the transcript; a
  Discipline row is not required for the read, `lint:dossiers` requires
  one for a claim).

### Retail, employment, brains, boot

- `lib/retail/Stock.ts:73-90,175-260` — `StockLine {itemTemplatePath,
  par, brandKey?, supplier?, pricing?}`; a line with `supplier` is NEVER
  cloned (the keeper's `stocks` beat buys it); `priceFor(key)` answers an
  authored `prices[key]`, else a terms listing's ask + margin, else null;
  `resolveBuy(keyword)` searches contents. `BuyController.ts:250` prices a
  consigned listing at `stock.priceFor(path) ?? listing.askMinor`.
- `trade-shopkeeping/src/behavior/consigns.ts` — carries an outfit's
  Stock to a shelf and `consign <kw> --ask <n>` as the house (`wallet use
  house`; the hand needs a `purchases` seat); the ask is keyed by the
  good's **`censusKey`** (`MixinApi.isCirculating(good)`, `:335-342`),
  else `defaultAsk`. `ClothBolt` does not compose `CirculatingMixin`
  (`lib/residency/Circulating.ts`; composers: Crate, Bottle, ManaCell,
  Amulet) — the mill's `cloth:linen` ask line is dead and bolts list at
  `defaultAsk`.
- `trade-shopkeeping/src/behavior/stocks.ts` — for each supplied line
  short of par: walk an AUTHORED `ways` route to the supplier's counter
  (`supplierCounterOf` = first Stock among the supplier Business's
  `operatingLocations`), `wallet use house`, `buy <kw>` up to the
  shortfall (borrowing `bank borrow … --for stock` if short), walk back,
  `put <kw> in <counter>`. Host must be live with nobody online.
- `terminus/content/world/terminus/wharfside/mill/{agent/spinner.yaml,
  agent/weaver.yaml, idea/outfit.yaml, location/floor.yaml, thing/stock.yaml}`
  + `trade-textiles/content/trade/textiles/thing/bale-store.yaml` (the
  INPUT Stock, `stockLines: [{flax-bale, par: 2}]`, nothing consigns
  from it). Spinner wage 3, weaver 5 (`purchases: true`), hours `[6,18]`,
  `banksAt: goodkin`.
- `platform/idea/api/EmploymentLogic.ts:1735-1760` — the roster tick
  settles the shift wage at the off-transition
  (`settleShiftWageImpl(business, assignee, …)`) from
  `business.getAccountPath()`; `lib/employment/Position.ts:126-137` —
  `headcount` absent ⇒ no opening advertised; `headcount: 2` on a seat one
  person holds advertises one place (a player can `apply`).
- `lib/behavior/brain.ts:126-180` — `BrainStatics`: `label`, `claims`,
  `presenceGated` (default true: `Behaved.ts:438` skips the beat with no
  audience), `ambient`, `kind`, `summary`, `discipline`, `produces`,
  `consumes`, `urgency`, `act`. `lib/behavior/stokes.ts` — the fire-tending
  shape (`Burner.stoke(fuel)` / `ignite()`, fuel = a material tagged
  `fuel`), presence-gated.
- ⚠ `packages/server/scripts/check-boot-entries.ts`:
  `BOOT_ENTRY_CEILING = 83` and the gate reports **83/83** today. A new
  `boot:` entry cannot be added without a ceiling rise. Heart's Delight's
  manifest boots nothing (`hearts-delight/pack.yaml`); the mill floor and
  outfit ARE booted (`terminus/pack.yaml` boot list).
- `hearts-delight/README.md:5` — *"No `src/`. This pack ships content
  only"*; `package.json` already depends on `trade-forestry`,
  `trade-apiculture`, `trade-shopkeeping`, `terminus`. Delight coords
  in use: gate (0,0,0), bench-lane (-12,0,6), farmstead (-20,0,7), barn
  (-20,1,7), close (-20,3,6), upper-bench (-20,4), millsite (-13,-6),
  sawmill (-13,-8), creamery (-4,-4), dairy yard (0,-6), byre (1,-6),
  public works (2,0). `bench-lane.yaml` exits: east / west / south —
  **north is free.** `wharfside/mill.yaml` is a `CartesianZone` sub-zone
  (the floor at its own (0,0,0), linked to the bank across the boundary).
- `hearts-delight/content/world/terminus/hearts-delight/creamery/location/floor.yaml`
  — an interior authored with `extent`, `_biomePath: indoor/baseline`,
  `_temperature: 293` (⚠ listed in `check-envelope.ts`'s
  `AUTHORED_TEMPERATURES`, a ceiling) and a lantern **adornment**
  `{ template: …/lantern, slot: lamp:creamery }` whose row sets `on:
  true`. `check-light-sources.ts:187-200` lists the kitchen and the
  creamery as `SKYLIT_INTERIORS` (a ceiling: adding a skylit interior
  raises it). A room lit by a lit fixture needs no list entry.
- `terminus/…/tinker/location/offstage.yaml` — `/platform/location/Offstage`;
  `BusinessMixin.offstage` (`platform/idea/Business.ts`) names where a
  house parks off-shift cast.

### Persistence, placement, stacks

- `docs/subsystems/furnishing.md § The skip rule` — a good stamped to a
  PLAYER persists owner-side (the estate slice); an organization's goods
  ride their room's record. `trade-forestry/src/thing/Panel.ts` is the
  shape for a prop that must survive a restart in a transient room.
- `platform/idea/cmd/inventory/PutController.ts:395-432` — a Container
  offers region zero under the `in` placement row's words; a `Placing`
  host offers its `placements`. `put X on <container>` is refused with
  *"it takes in"* (`:124-137`). A Placing host's placed items live in the
  ROOM (`docs/subsystems/spatial.md § Placement`).
- `lib/stuff/Stackable.ts:214-244` — `canMergeWith` compares the union
  of `stackIdentityFields` (must be persistent); `__validateComposition__`
  refuses `Stackable + Container` and `Stackable + Singleton`.
  `platform/idea/api/StackableLogic.ts:129-167` — `split` clones the row,
  copies ONLY `stackIdentityFields` (`StuffApi.copyField`), then calls
  `source.onSplit(splitoff)`.
- `get.yaml` targets are `greedy`; `consigns.ts:224` uses `get 1 <kw>`,
  so a leading number takes a quantity off a stack.
- `lib/husbandry/Feeder.ts` — `feederKind` is the Species `FeederKind`
  closed set (bowl · trough · hopper); its consumer is `feeds` over
  `Bonded` animals; `check-kept-animals.ts` reads the triangle.
- `lib/species/Organism.ts:153` — `_speciesPath` is `ref:
  'identity:constituent'`: the row loads with the body that cites it.
- `platform/idea/Discipline` rows are found **by class** wherever a pack
  ships them (`platform/idea/DisciplineCatalogue.ts:154-168`);
  `trade-apiculture/content/trade/apiculture/idea/Discipline/apiculture.yaml`
  is the shape (`iscedf: "0811"`, `specializes: []`).
- `lib/thermal/SpaceHeating.ts`, `platform/thing/Hearth.ts` — only a
  Hearth/Campfire warms a room; the Hinkley kitchen's range (an `Oven`)
  does not. The world boots in winter; the indoor baseline biome declares
  no temperature.
- Wire harness: `packages/wire/src/harness/index.ts` exports `Session`,
  `declareFile`, `uniqueHandle`, `expectOk`, `expectRefused`,
  `expectNote`, `advanceWorldClock(duration)`, `worldClockNow`,
  `isOwnedTestWorld`; `tests/taps.dirty.wire.test.ts` is the clock-walking
  drive precedent (`DIRTY_REASON`, `declareFile({packs})`).

## Plan-level decisions

### D1 — The rearing lives on the TRAY; no object is minted for it; `ColonyMixin` is not promoted

**Question.** A new pack class vs promoting `ColonyMixin`; what the tray
is vs the rearing; what an egg lot is; how hatching avoids a second
minting path.

**Choice.** `trade-sericulture` ships:

- `src/lib/Rearing.ts` — `RearingMixin` (pack `lib/`, `_mixinName:
  'RearingMixin'`, `_mixinRefusal: "{} has no worms on it"`): the
  population state and its clock (D2–D3). Composes on
  `src/thing/RearingTray.ts` = `RearingMixin(ThermalMixin(ContainerMixin(Good)))`
  — the box IS the host, exactly as the hive carries the colony. The
  worm is below the resolution anything acts at; there is no `Rearing`
  object.
- `src/thing/EggLot.ts` = `ThermalMixin(Good)` + fields `_strainPath`
  (fieldMeta `ref: 'identity:constituent'`, so the strain row loads with
  the lot), `eggCount`, `meanShellMg`, `pebrineLoad` (fieldMeta `spoiler:
  1`), `laidAt` (game-seconds), `laidWhere` (a room path string),
  `wintered` (bool), `chillS` (runtime). `look` renders strain, where and
  when — never the load.
- **Hatching is adoption, not minting.** `RearingTray.canAddContainable`
  admits an `EggLot` only when the tray is empty of worms, leaf, a
  mounting brush or cocoons; `onContainableAdded` copies the lot's fields
  in by METHOD (`RearingMixin.seedFromLot(lot)`) and destructs the husk
  after the move (the `Hive.consumeAfterMove` microtask, verbatim). The
  clock then runs on the tray. Nothing clones a rearing. The only clones
  are the cocoons, frass and the laid egg lot, all through `StuffApi.clone`
  + `ContainmentApi.move` (the `Hive.mintDeparture` shape).

**Why not promote `ColonyMixin`.** Its fields and arithmetic are bees'
(strength, queen, stores hooks, swarm, sting ladder, forage share) — the
rearing shares the *shape* (population-as-body, reconcile-on-read, no
far-past guard) and none of the mechanism. A third pack wanting
`ColonyMixin` is the promotion signal; silk does not want it, it wants
its own clock. (`never-invent-the-third-consumer`: a shared shape is not a
shared mechanism.) The two packs' mixins share the outside-temperature
idiom by TEXT, not by import; the tray composes `ThermalMixin` instead of
copying `restampOutside` (D2).

### D2 — The age clock is degree-days off the tray's own temperature trajectory, limited by feeding

- `RearingMixin.reconcileRearing()` — reconcile-on-read, **no far-past
  guard**, reentry-guarded, stamp `rearingStamp`. It samples
  `self.temperatureTrajectory(stamp, now).samples(8)` (the `Ripening`
  loop) and accrues `degreeDays += max(0, T − baseK) × days × (0.5 + 0.5
  × feedSat)` while worms are alive. The tray is Thermal so a tray carried
  from a cold yard to a warm kitchen restamps like any Thing; a tray in
  an unheated room in winter stalls (cold slows, never kills).
- Stages derive from cumulative degree-days against the strain row's
  thresholds (dials with seeded fallbacks): `eggs` (hatch at `hatchDD`,
  gated by D1's wintering rule: a `broods: 1` strain hatches only if
  `wintered`, which an `EggLot` earns by `chillS ≥ winterS` below
  `chillK`, authored true on bought lots) → ages I–V (`ageEndDD[0..4]`),
  each ending in a **moult window** (the last 10 % of the age: *asleep
  for the moult*, eating nothing) → `wandering` at the end of V → `spinning`
  (3 game days with a mounting brush present, 1 day + a weight penalty
  without) → `spun` (cocoons minted, tray state cleared to `empty`).
- **Feeding.** Leaf is contents: `put leaf in tray` (D9). Each reconcile
  window computes demand `eggCount × leafKgPerWormPerDD × ΔDD` and takes
  it from leaf on the tray, oldest first, weighting each item by its
  freshness band (`fresh 1 · tainted 0.6 · spoiled 0.2 · rotten 0`) and
  destructing an eaten item. `feedSat = min(1, taken / demand)`; the
  rolling mean over the fifth age (`fifthAgeSat`) scales cocoon mass
  (`0.6 + 0.4 × sat`). Hunger is SOFT: no term kills.
- **Reads are words.** `RearingTray.readingLine()` (a `markupAugmenter`)
  renders: *nothing on it* · *eggs, waiting for warmth* · *a tray of worms
  in their first age, eating* · *restless, heads raised* (hungry: `feedSat
  < 0.5` over the last window) · *asleep for the moult* · *the fifth age:
  the sound of rain on leaves* · *wandering, looking for somewhere to
  spin* · *climbing the brush and spinning* · the pébrine specks (D3).
  Never a number.
- Unobserved trays reconcile when read: the house hand's beat reads every
  tray (`tends`, D10); a hobbyist's tray reconciles on `look` after an
  absence. Load-on-use; nothing is booted for it.

### D3 — Pébrine is a dedicated seeded field, carried on the lot, the tray and the cocoons; not `ContaminableMixin`

`ContaminableMixin` is a food-host gauge whose every constant is a
`Condition/pathogen/*` row (kill rate, `awFloor`, infectious dose) and
whose invariant is *no seeding path*; `lint:pathogens` reads that roster.
A hereditary insect disease has none of those facts and needs the thing
the gauge forbids (seeding at origin). So:

- `pebrineLoad: number` `[0,1]` on `EggLot`, `RearingMixin` and
  `Cocoons`, fieldMeta `{ persistent: true, authorable: true, spoiler: 1 }`.
- **Seeded, never drawn.** Authored on bought rows: the general store's
  `egg-lot/imported` 0.02 (*from away, clean*), the silk house's
  `egg-lot/valley` 0.25 (the house's own grainage — the provenance
  lesson), `egg-lot/cheap` 0.8 (*off a spotted tray, going for nothing*).
  A laid lot's load = `min(1, parentLoad × amplification)` (dial 1.6):
  the mother moths carried what they carried.
- Consequences inside `reconcileRearing`: feed demand × `(1 − 0.5 ×
  load)` (eats poorly), visible specks from age IV when `load ≥ 0.4`
  (the augmenter line *peppered with dark specks*), **collapse** at the
  start of age V when `load ≥ collapseAt` (dial 0.6): the rearing dies
  (`collapsed` state, *a tray of dead worms*), no cocoons; a light load
  spins `cocoonCount × (1 − load)`.
- No sense reports the load on a lot or a cocoon; nothing in `look`,
  `handle`, `smell` or the wiki (`spoiler`).

### D4 — Stifling is a held-warm integral on the cocoon stack; emergence is a reconcile-on-read event that lays a lot

`src/thing/Cocoons.ts` = `ThermalMixin(StackableMixin(CraftedMixin(Good)))`
(+ `CirculatingMixin`, D10). Fields (all persistent, all in
`stackIdentityFields` so a split keeps them and stacks of different
state never merge): `_strainPath` (constituent ref), `meanShellMg`,
`lotMeanMg`, `heftBand` (`heavy · middling · light`), `pebrineLoad`,
`spunAt`, `stifleS`, `scorchS`, `stifled`, `scorched`, `pierced`,
`cocoonStamp`.

- `reconcileCocoons()` on every read (and from `getGrade()`): integrates
  `temperatureTrajectory(stamp, now)`: `stifleS += s` while `T ≥ stifleK`
  (dial 333), `scorchS += s` while `T ≥ scorchK` (dial 423); `stifled`
  latches at `stifleS ≥ stifleHoldS` (dial 600); `scorched` latches at
  `scorchS ≥ scorchHoldS` (dial 900) and drops the grade two bands.
  ⚠ **Calibration constraint, asserted by a unit test over the real
  `Decay.toward` trajectory:** in a 500 K range (the kitchen's) a cocoon
  stifles before it scorches; in a 345 K oven (the silk house's) it
  never scorches. The build tunes the four dials until both hold and
  records them in `content/settings/sericulture.yaml`.
- **Emergence.** If `!stifled && now − spunAt ≥ emergeDays` (dial 10):
  `pierced = true` (the stack reads *pierced, the moths gone*; `spin`
  still accepts it — its material carries `fibre`), and ONE `EggLot` is
  cloned into the stack's container (`StuffApi.clone('/trade/sericulture/thing/egg-lot', undefined, { madeFrom: this })`
  + `ContainmentApi.move`) with: the strain, `eggCount = min(maxEggs,
  quantity × eggsPerMoth)`, `pebrineLoad = min(1, load × amplification)`,
  `meanShellMg = lotMeanMg + h² × (meanShellMg − lotMeanMg)` (D5),
  `laidAt = now`, `laidWhere = container path`, `wintered = false`. A
  stack with no container (limbo) lays nothing and stays pierced.
  Unobserved cocoons do this on the next read — a hobbyist who comes back
  after a fortnight finds the lot on the tray; the house hand's beat
  reads its stock every cadence.
- A stifled stack never opens; a scorched one is stifled too (it got
  hot). The deadline is a `markupAugmenter` line in words: *quiet; the
  moths will come in about N days* (`GrammarApi.inWords`).

### D5 — Selection: three heft stacks at the spin, R = h²S at the lay

- `src/idea/Strain.ts` = `SingletonMixin(Idea)` reference data (the
  `Dyestuff` shape, `canEvict` veto): `key`, `label`, `colour` (a word:
  gold · white · green), `broods` (1 | 2), `heritability` (`h²`),
  `meanShellMg`, `sdShellMg`. Rows under
  `content/trade/sericulture/idea/strain/`: `valley-gold` (2 broods, gold,
  h² 0.4, 380 ± 40), `white-one-brood` (1 brood, white, h² 0.5, 420 ± 45).
  Reached through the constituent ref on every lot/stack — no catalogue,
  nothing booted.
- The lot's `meanShellMg` is the GENETIC mean. At the spin the tray
  mints three `Cocoons` stacks (the ONE clone path, three calls) from the
  phenotype mean `p = lotMean × (0.6 + 0.4 × fifthAgeSat) × (brush ? 1 :
  0.8)`: `heavy` (top 20 %, mean `p + 1.4 sd`), `middling` (60 %, `p`),
  `light` (20 %, `p − 1.4 sd`). Generative (what the world IS, derived
  from the strain), never a draw. Each stack carries `lotMeanMg = p`.
- **Keeping the heaviest** is keeping the `heavy` stack unstifled. At
  emergence `S = meanShellMg − lotMeanMg` (the kept stack against the
  tray's phenotype mean) and the laid lot's genetic mean moves by
  `h² × S`. Keeping `light` moves it down; keeping `middling` moves it
  nowhere. One trait, one equation.
- Heft reads in words off `heftBand` (*heavy in the hand* …), the
  hive's precedent; a scorched stack says so.

### D6 — `reel` stays ONE view, fishing's; the cocoon stack answers a declared shape; the instrument affords it

- `trade-fishing/content/trade/fishing/cmd/fishing/reel.yaml` gains:
  `target` (`type: object`, `required: false`, `scope: [inventory,
  reachable]`, `requires: any` — ⚠ NOT `greedy:` (greedy is for a free-text tail; a multi-word target is quotable, and greedy would swallow the `with <tool>` clause)); `tool` (`type: objects`,
  `required: false`, `prepositions: [on, at, with]`, `default:
  "reachable:[capability.reeling]"`, `requires: [ToolMixin]`); `options.count`
  (number). Help text gains the silk sentence. The fishing branch is
  unchanged when no target binds (AC 19).
- `trade-fishing/src/lib/Reelable.ts` (a named value-object/vocabulary
  module, the `SupplyReporting` precedent): `interface Reelable {
  reelable: true; planReel(by, tool, count: number | null):
  Promise<WorkPrognosis>; completeReel(by, tool, token):
  Promise<WorkResult> }` — reusing the KERNEL's `WorkPrognosis` /
  `WorkResult` from `lib/ground/Workable` rather than a parallel vocabulary.
- `ReelController` re-bases onto `ManualBuildController<ReelModel>`
  (keeps its fishing code; `decline` → `declineStep`). With a bound
  target that answers the shape (a module-private `reelableOf(stuff)`
  — `reelable === true` and both methods, the `SplitController.splittableOf`
  idiom), it calls `planReel(giver, bestInstrument(model.tool, 'reeling'),
  count)`, declines a refusal in the subject's words, else `engageStep`
  (`effortW: 150`) with a MODULE-level `land()` that calls
  `completeReel`, narrates `result.self/peers` and credits `result.credit`
  via `giver.creditDeed` — `WorkedActController.land` verbatim, in the
  fishing file because the controller is fishing's. Controller dumb;
  the stack authoritative.
- `Cocoons.planReel` refuses: not stifled (*the moths are still in
  them*), pierced (*nothing to reel off a pierced cocoon — it spins*),
  too few (`quantity < charge`), no reeling tool bound, no hot water
  (`by.reachableHeatK() < waterK` dial 330 — *they want hot water to
  loosen the gum, and there is no fire here*). The plan's duration is
  `baseMs / tool.capabilityRate('reeling') × (8 / count)` (fewer is
  slower). `completeReel` debits `charge` cocoons (destructing an emptied
  stack), mints ONE `/trade/sericulture/thing/raw-silk` unit and ONE
  `/trade/sericulture/thing/pupae` into `by`, stamps the skein's
  `maker` (`by.getIdentityPath()`), `filamentCount = count`, `evenness =
  clamp01(0.45 + 0.12·rank(textiles band) + (control === 'fine' ? 0.2 :
  0) − 0.04·max(0, 8 − count))`, and grade `min(cocoon band, band(evenness))`.
  `credit: { discipline: 'textiles', difficulty: count < 6 ? 'hard' :
  'standard' }`.
- **Affordance.** `src/thing/ReelingTool.ts` (extends `Tool`) names
  `'trade/fishing/cmd/fishing/reel.yaml'` in `environment` + `peers`.
  Rows: `/trade/sericulture/thing/hand-reel` (`capabilities: [{kind:
  reeling, rate: 1}]`, sold at the general store) and
  `/trade/sericulture/thing/reeling-basin` (`rate: 2, control: fine`,
  propped at the mill). The stack affords nothing (re-narrowing tell).
  ⚠ The first cross-pack view key in a `commandContributions` static —
  verified in W3's drive checkpoint, not assumed.
- **Fineness in words, banded by the READER's competence**
  (`RawSilk.finenessLine()` augmenter, `instrumentation.md`'s rule:
  competence resolves detail, never access): untrained — *fine* / *coarse*;
  competent — *a thread of about N cocoons*; proficient+ adds *even* /
  *uneven in places*. Never denier as a number.

### D7 — Spin and weave keep the fibre's material; descriptions derive from it; the maker is stamped

In `trade-textiles` (W0): `SpinController.finish` sets `yarn.setMaterial(stock.getMaterial())`
and `yarn.setMaker(giver.getIdentityPath())`; `WeaveController.finish`
sets `bolt.setMaterial(yarn.getMaterial())` and the maker. One row each
still (per-material rows rejected: a fourth fibre would be a fourth row
pair and a fourth brain constant). `TextileStock.getShortDescription()`
override: when `yarnCount > 0`, `skein of <fibreWord> yarn`; `ClothBolt`:
`bolt of <fibreWord>`; `<fibreWord>` is the material's `name` (`linen`,
`wool`, `raw silk`, `silk`), and the mint adds that word to the keywords.
Rows `yarn.yaml`/`bolt.yaml` keep linen as the authored default so every
existing caller reads as before. The grade band still carries from the
input (unchanged). Wool therefore spins to *skein of wool yarn* and weaves
to *bolt of wool* with no wool-specific line anywhere (AC 8, AC 13).

### D8 — Degumming is a finishing gauge on the bolt, driven by a bath, through one kernel thermal rung

Item-in-bath maturation is unrepresentable today for two reasons, each
one method away:

1. **Thermal:** a solid inside a vessel of liquid reads the room's air.
   Kernel seam (W4): `ThermalMixin.holderK()` gains a second rung after
   the Coolbox — *an enclosing `Bulkable` container whose interior holds
   a liquid answers with its contents temperature*. Physically true of
   every solid in a bath (a fish in a keepnet, a wheel in brine, a bolt in
   a copper), read in the same position on the pull and push sides, and
   proven by a unit test (a Thermal good in a vat of hot water follows the
   water). This is the kernel line the requirements' "boil the cloth"
   spends.
2. **The gauge:** `trade-textiles/src/lib/Finishing.ts` — `FinishingMixin`
   (pack `lib/`; composers: `ClothBolt`, with `Garment` the recorded next
   consumer → the promotion signal). The `RipeningMixin` twin for cloth,
   minus food: matches a `MaturationProfile` by the bolt's material tag
   (`inputCategory`), integrates `profile.rateAt` over the bolt's
   trajectory, tracks the worst `damageSat`, and at fraction 1 swaps the
   material to `productMaterial` and scales mass by `productFraction`.
   Phases `idle · active · finished · killed`. `ClothBolt` composes
   `ThermalMixin` + `FinishingMixin` (claims: every bolt has a
   temperature and may be finished by a temperature-driven profile — true
   of scouring wool and piece-bleaching linen too, the deferral
   `BleachingGreen.ts` names).
3. **The vessel:** `trade-textiles/src/thing/Copper.ts` =
   `SealableMixin(ThermalMixin(ContainerMixin(BulkableMixin(Good))))` —
   *a copper: a vessel you boil CLOTH in*; `canAddContainable` admits
   only a `FinishingMixin` host (*a copper is for cloth*). Row
   `/trade/textiles/thing/copper` (interior 40 L, `liquidTight`, iron):
   sold at the general store, propped at the dyehouse beside a brazier
   and three dry logs (bounded props, the kitchen's shape).
4. **The profile:** `trade-sericulture/content/trade/sericulture/idea/maturation/degumming.yaml`
   — `mechanism: chemical`, `inputCategory: gummed`, `stallBelowK: 343`,
   `happyK: 363`, `damageAboveK: 383`, `ratePerDay: 12` (≈ two game hours
   at a simmer), `productMaterial: /trade/sericulture/idea/material/silk`,
   `productFraction: 0.75` (the quarter that was gum), no turn.
5. **The act:** `put bolt in copper` · `fill copper from <water>` ·
   `heat copper` (the dairy arm sets it on the lit range) · wait · `get
   bolt`. No new verb. `look bolt` reads the finishing line (*stiff in
   the gum* → *soft and lustrous, lighter in the hand*).
6. **Colour and dyeing:** the raw-silk material's `appearance` is gold,
   silk's is white; the derived description (D7) says *bolt of raw silk*
   → *bolt of silk*. Under-boiled cloth keeps material `raw-silk`, tagged
   `gummed`: `DyeController`'s bond penalty gains `|| fibre.hasTag('gummed')`
   and **the penalty now multiplies `strength` as well as fastness** —
   the one line that makes AC 10 true (silk on alum is brighter than
   un-tannined linen in the same bath because linen's depth halves).

### D9 — Feeding is `put leaf in tray`; the tray reads its own leaf; no `FeederMixin`

`FeederMixin`'s `feederKind` is the Species `FeederKind` closed set and
its consumer is `feeds` over `Bonded` pets; composing it would claim a
kept animal eats from a tray (`lint:kept-animals` reads that triangle).
The tray exposes `leafOnTray()` (contents whose material carries the
`silkworm-fodder` tag) and `hasMounting()` (contents whose material
carries `mounting`). Leaf row `/trade/sericulture/thing/leaf` is a
`/platform/thing/Crop` (Provision: freshness, so it wilts; harvest mints
it graded) over `/trade/sericulture/idea/material/mulberry-leaf`
(`edibility: true`, tags `tissue plant edible silkworm-fodder once-living`,
`spoilActivationEnergy` tuned so the band leaves `fresh` within ~1 game
day at 293 K — asserted with `Freshness.advance` in a unit test). The
mounting brush `/trade/sericulture/thing/mounting-brush` is a `Good` over
`/trade/sericulture/idea/material/brushwood` (tag `mounting`, not
perishable), sold at the general store and propped in the house.

### D10 — The silk house runs while it is LOADED; the mill reeler's buying trip is what loads it; no boot entry

`check-boot-entries` is at **83/83** and a ceiling rise is out of bounds.
The requirement's *"with no player present"* is therefore delivered as
*while loaded* (load-on-use), and § Requirements friction records it.

- **The house** (rows in `hearts-delight`, under
  `/world/terminus/hearts-delight/silk-house/`): a `CartesianZone`
  sub-zone (the mill's shape); `location/floor` — ONE room holding the
  trays, the stifling oven, a brazier (a `Hearth`, so the loft is warm
  when it burns), the counter, the house stock and the cast; `location/walk`
  — outdoors, the `Panel` of four mulberries and one kermes oak;
  `location/offstage`. Exits: `bench-lane north ↔ floor south`, `floor
  west ↔ walk east`. The floor is lit by a hung lantern adornment (`on:
  true`, the creamery's row) and authors **no** `ambientIntensity`, no
  `ambientSource`, no `_temperature`; it authors `enclosure: { material:
  …/wood/pine, thicknessM: 0.03 }` and `extent: 8`.
- `idea/outfit` (Business): `appointingAuthority: { kind: entity, path:
  …/agent/keeper }`, `call: rota`, positions `keeper` (wage 5, `purchases:
  true`, `fulfills: [sericulture]`) and `hand` (wage 3, `purchases: true`,
  `fulfills: [sericulture]`, `headcount: 2` so a player may `apply`),
  roster both `[5,19]`, `banksAt: goodkin`, `offstage`, operatingLocations
  `[floor, walk, thing/counter]`. Titled in `pack.yaml` to the outfit
  (the close's precedent).
- `thing/tray-1..3` — class `/trade/sericulture/thing/HouseTray` =
  `PersistableMixin(SingletonMixin(RearingTray))` (the `Panel` shape: a
  tray mid-rearing survives a restart), each `extends:` a shared base row.
  `thing/oven` — `/platform/thing/Oven`, `burnTemperatureK: 345` (the
  malt kiln's gentle heat). `thing/counter` — `/trade/shopkeeping/thing/Stock`
  with `prices` for the three house goods and no `stockLines` (no
  faucet); `thing/stock` — the house's output Stock. Fuel: `{ template:
  /stuff/thing/items/dry-log, count: 6 }` (bounded; fuel supply is the
  fuel trade's, a named seam).
- **The cast:** `agent/keeper` (Cast, `archetype` as the general-store
  keeper's, `competence: [{sericulture, proficient}, {textiles, competent}]`,
  `idles`) and `agent/hand` (Cast, `archetype: hand`, `competence:
  [{sericulture, competent}]`, brains `tends` + `consigns`).
- **`trade-sericulture/src/behavior/tends.ts`** — the `weaves` shape
  (literal verbs, one engaged act per beat, no-progress guards,
  `presenceGated = false`, `ambient = false`, `discipline = 'sericulture'`,
  `kind: 'work'`, config `{ floor, walk, stock, oven }`). Priority each
  beat: cocoons in the oven that read stifled → `get cocoons from oven`,
  `put cocoons in stock`; a tray that has spun → `get cocoons from tray`,
  `put cocoons in oven`; a tray wandering → `put brush in tray`; a tray
  hungry and leaf in hand → `put leaf in tray`; no leaf in hand and a
  hungry tray → `west`, `pick mulberry`, `east`; the brazier/oven cold or
  low with fuel in reach → `stoke`/`light` (the `stokes` pair, as literal
  verbs, so the loft stays warm with nobody watching). The hand reads the
  trays through their public reads, which reconciles them.
- **`consigns`** on the hand: `stock → thing/counter`, `ask` keyed by
  `censusKey` (`Cocoons` and `EggLot` compose `CirculatingMixin` with
  authored keys `cocoons:stifled`, `egg-lot:valley`; leaf is a kernel
  `Crop` and lists at `defaultAsk`). The counter's authored `prices`
  equal the asks so `priceFor` answers a buyer.
- **The mill** (rows in `terminus`): `mill/agent/reeler` (Cast, `archetype:
  hand`, `competence: [{textiles, competent}]`), a `reeler` position on
  `mill/idea/outfit` (wage 3 — the bottleneck job, worst paid, the mill's
  own lesson; `purchases: true`; `headcount: 2`), a `reeling-basin` and
  a `/stuff/thing/brazier` + dry logs propped on the floor,
  `mill/thing/silk-stock` (a second output Stock so silk bolts list at
  their own ask), and a line on the bale store: `{ itemTemplatePath:
  /trade/sericulture/thing/cocoons, par: 60, supplier:
  /world/terminus/hearts-delight/silk-house/idea/outfit }`. The reeler
  runs three brains: `stocks` (counter: bale-store; `ways` authored
  mill → silk-house floor and back, computed off the exits as the
  apiculture drive computed its road), **`trade-sericulture/src/behavior/reels.ts`**
  (the `weaves` shape over `reel cocoons --count N` → `spin skein` →
  `weave yarn` → `put bolt in silk-stock`, stoking the basin's brazier
  first), and `consigns` (`silk-stock → general-store counter`,
  `defaultAsk` = the bench's silk price, D14). The mill is already
  booted; the reeler's trip loads the house.
- Wages: the roster tick settles both houses' shifts from their accounts
  (grounded above); the house's income is the mill's purchases.

### D11 — The mulberry is a polycarp whose "fruit" is leaf; the walk is a `Panel`; a sapling is a `Seed`

`/trade/sericulture/thing/plant/mulberry` (`/platform/thing/Plant`;
species `/stuff/idea/species/plantae/…/moraceae/morus/alba` shipped by
the pack under `/stuff/`; `harvestTemplatePath: …/thing/leaf`, no
`harvestTool`, `discipline: sericulture`, profile `fruitSetCount: 6`,
`fruitFillDays: 12`, `daysToStage { young: 30, established: 90, mature:
180 }`); the walk's four are authored ready (the hazel stool's fields),
the sapling row `/trade/sericulture/thing/seed/mulberry` (`/platform/thing/Seed`,
*mulberry sapling*, `growsIntoPath`) is a general-store line, planted in
the Hinkley yard bed with the platform's `plant`. Winter stalls the leaf
through the shipped `cold` factor; the drive opens in early summer.

### D12 — Kermes is rows, and the bath it needs is one kernel line that dyeing was already missing

`trade-farming`: `plant/kermes-oak` (polycarp over species
`…/fagaceae/quercus/coccifera`, `harvestTemplatePath: crop/kermes`,
`discipline: horticulture`), `crop/kermes` (`/platform/thing/Crop`,
material `/trade/farming/idea/material/kermes`, tags `dyestuff mordant-dye
insect organic once-living`, `steepsInto: /trade/farming/idea/material/kermes`).
`trade-dyeing`: `idea/dyestuff/kermes.yaml` (`chemistry: mordant`; alum
*a deep crimson* `0.8,0.05,0.18`; iron *a dark claret*; tannin *a dull
brick*; none *a red that will not hold*). **Kernel (W4):** `Crop` composes
`SteepableMixin` (`platform/thing/Crop.ts` — a harvested plant part may
steep into something; inert without `steepsInto`), and `madder-root`,
`weld`, `woad` crop rows gain `steepsInto:` their dyestuff material.
That is the only way a bath has ever been chargeable; it is a finding
(§ Requirements friction), not kermes code. Kermes itself: zero code.

### D13 — Byproducts: frass is a compost-tagged bulk good; pupae are a `Provision`; bait is out

`/trade/sericulture/thing/frass` — the compost sack's shape (a
`BulkableMixin(Good)` row holding `/trade/sericulture/idea/material/frass`,
tag `compost`), minted once per rearing at the spin, so the platform's
`feed <bed> with frass` accepts it unchanged. `/trade/sericulture/thing/pupae`
— `/platform/thing/Provision` over `/trade/sericulture/idea/material/pupa`
(`edibility: true`, `nutrients: [protein, fat, water]`, `tastes:
[umami]`, `spoilActivationEnergy: 80000`), one per reel act: `eat pupae`.
Bait: `BAIT_KINDS` is closed and a fifth kind is fishing's decision —
recorded, not built.

### D14 — The labour bench derives the prices, and the rows must agree with it

`trade-sericulture/src/__tests__/labour.bench.test.ts` reads, via
`fs`+`yaml` as the mill bench does: `textiles-trade.yaml`,
`sericulture.yaml` (dials), the strain/plant/leaf rows, the degumming
profile, the tool rows, the house outfit, the mill outfit, the hand's and
reeler's brain configs and the house counter's prices. It computes
**attended hours per kilogram of cloth** for linen (scutch · spin ·
weave), wool (spin · weave) and silk (leaf picking · feeding acts over the
rearing — `feeds = ceil(totalDD / ddPerFeed)` × the `put` act — the
mount · the harvest · the oven handling · reel · throw · weave · the
copper handling), prints the three, asserts `silk / linen > 4` and
`silk / wool > 3` (a smaller gap fails with the message *the rows are
wrong*), and asserts the house's cocoon ask and the reeler's silk-bolt
`defaultAsk` each equal `round(hours × the seat's wageRate)` summed along
the chain (±10 %). Retting and emergence are reported separately as
elapsed, not labour.

### D15 — Persistence: a hobbyist's tray rides its owner; the house's trays are persistable singletons

A `RearingTray` bought at the store is a chattel `Good`: the skip rule
captures it owner-side with its persistent fields and its contents (the
backpack precedent), wherever its owner left it. `HouseTray`
(`PersistableMixin(SingletonMixin(RearingTray))`) is the `Panel` shape
for a prop in a transient room. Cocoons left mid-stifle in the house's
transient oven across a restart are lost — legitimate loss, the hand
refills. W1's unit test captures and materializes a mid-rearing tray
through `PersistableApi`; the drive bounces nothing (the taps drive's
persisted-tree assertion is the precedent if a review asks).

### D16 — The drive is `packages/wire/tests/silk.dirty.wire.test.ts`

`declareFile({ packs: ['trade-sericulture','trade-textiles','trade-dyeing',
'trade-fishing','trade-farming','trade-forestry','trade-shopkeeping',
'generic-objects','base-library','species-and-names','terminus',
'world-seed','hearts-delight','hinkley-hills'] })`. `DIRTY_REASON`: buys
the general store's egg-lot/tray/hand-reel/sapling/copper/brush par,
leaves a persisted tray and a planted mulberry on a Hinkley lot, consumes
the silk house's counter and the bale store's cocoon line, and walks the
world clock through a season. Checkpoint 0 jumps the clock to early
summer (the taps precedent) so the kitchen is warm and the walk is in
leaf. Every checkpoint asserts a STATE CHANGE (a quantity, a material
word in `look`, a counter's contents), never *"not refused"*. The twenty
steps map 1:1 to the requirements' drive; step 16 is run with the player
standing at the valley gate and polls the house counter and the general
store shelf across clock jumps, bounded.

### D17 — Wave order

W0 (textiles carry-through, independent, fixes the shipped wool defect)
→ W1 (the pack: rearing, leaf, mulberry, strains, store lines) → W2 (the
cocoon: stifle, emergence, selection, pupae, frass) → W3 (`reel`) → W4
(finishing, the bath rung, kermes, dye depth) → W5 (the silk house and
the mill reeler) → W6 (the bench and the prices) → W7 (the drive and the
docs). Each lands at a commit and passes `pnpm test:near` + its pack's
vitest + `lint:family`.

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `RearingMixin` (pack lib) | `RearingTray` only (and `HouseTray` by inheritance) | *this box can hold a rearing* — nothing else composes it; no guard re-narrows |
| `ThermalMixin` on `RearingTray` | the tray | a tray has a temperature and follows its room — true of any wooden tray |
| `ContainerMixin` on `RearingTray` | the tray | leaf, an egg lot, a brush and cocoons sit IN it; `canAddContainable` says what it is for |
| `EggLot` fields (`_strainPath`, `eggCount`, `meanShellMg`, `pebrineLoad`, `laidAt`, `laidWhere`, `wintered`, `chillS`) | `EggLot` (`ThermalMixin(Good)`) | an egg lot winters by its own temperature; nothing else carries these |
| `Cocoons` fields (D4) | `Cocoons` (`ThermalMixin(StackableMixin(CraftedMixin(Good)))` + `CirculatingMixin`) | a cocoon stack has a temperature, a grade, a maker (the tray's keeper), a census key; every field is stack identity |
| `Strain` | `SingletonMixin(Idea)` rows | reference data, constituent of lots and stacks |
| `RawSilk` (`filamentCount`, `evenness`) | `RawSilk extends TextileStock` | only a reeled skein has a filament count; `yarnCount` stays 0 so `spin` throws it |
| `ReelingTool` | `extends Tool` | an instrument that affords `reel`; the stack affords nothing |
| `Reelable` (interface) | `trade-fishing/src/lib/Reelable.ts` | a declared shape; `Cocoons` implements it structurally |
| material carry + maker | `SpinController`/`WeaveController` (textiles) | every spin and weave now stamps who and what — true of all of them |
| derived descriptions | `TextileStock` (yarn-shaped only), `ClothBolt` | a yarn/bolt is named for its fibre; line, tow, shive, fleece keep their authored words |
| `FinishingMixin` (textiles lib) + `ThermalMixin` | `ClothBolt` | every bolt has a temperature and can be finished by a profile — scour, degum, piece-bleach; `Garment` is the recorded next consumer |
| `Copper` | textiles `src/thing/Copper.ts` | a vessel for boiling cloth; refuses non-cloth contents |
| `holderK` liquid rung | kernel `ThermalMixin` | a solid in a vessel of liquid is at the liquid's temperature — true everywhere |
| `SteepableMixin` on `Crop` | kernel `platform/thing/Crop` | a harvested plant part MAY steep; inert without `steepsInto`; `Simple` (medicine) unchanged this build |
| `steepsInto` on madder/weld/woad/kermes crops | farming rows | the dyestuff crops become the bath's source |
| `gummed` penalty + strength × penalty | `DyeController` | the depth rule now matches its own prose for both cellulose and gum |
| `tends`, `reels` brains | pack `src/behavior/` | stateless strategies named by rows |
| `HouseTray` | `PersistableMixin(SingletonMixin(RearingTray))` | one row one tray, surviving restart; `Stackable ⊥ Singleton` is not violated (a tray is not a stack) |
| `sericulture` Discipline | row | found by class |

⚠ Not placed, deliberately: nothing on `Thing`, `Good`, `Provision`,
`Bulkable`, `Species` or `Business`. No `Mixins` const edit (pack mixin
names federate at discovery). No `OrganismMixin` on the tray (it is
furniture; the species row exists for `biologicalSource` and the
strains).

## Convention conformance

Checked at plan time against the live files:

- **Paths** `<root>/<branch>/`: `/trade/sericulture/{thing,idea,lib,behavior}`,
  controllers none (no new verb), views none; rows in locality packs
  under their roots; the species row under `/stuff/idea/species/…`
  (the mellifera precedent). `trade-sericulture/pack.yaml` claims title
  `/trade/sericulture` → `/compact/trade` (every placeless trade); the
  silk house extent is claimed in `hearts-delight/pack.yaml` for its
  outfit.
- **`props:` / `cast:`**, `{ template, as }` for individuals, `{ template,
  count }` for fuel; never `container:`.
- **Locations, not rooms**: `SingletonCartesianLocation` with `coords` for
  the floor/walk inside the house's `CartesianZone`; `Offstage` for the
  offstage.
- **Module scope declares**: brains export `export const brain = class
  {…}`; no module-scope statements; catalogues none (strains ride the
  constituent ref).
- **Import boundary**: pack code imports the kernel by package specifier
  only (`@saxonberg/server/mud/...`), fishing's `Reelable` by
  `@saxonberg/content-trade-fishing/src/lib/Reelable`, textiles'
  `TextileStock` by `@saxonberg/content-trade-textiles/src/thing/TextileStock`;
  `package.json` of `trade-sericulture` depends on textiles, fishing,
  farming, shopkeeping, platform, base-library, generic-objects; `terminus`
  and `hearts-delight` add `trade-sericulture`.
- **Verbs on objects**: `Cocoons.planReel/completeReel`,
  `RearingTray.seedFromLot/readingLine`, `ClothBolt` finishing reads;
  no `XApi.verb(host)` anywhere; no new Api, logic singleton, free helper
  or `eslint-disable`.
- **Mixin authoritative / controller dumb**: `ReelController` narrows and
  engages; every refusal is the stack's sentence.
- **A bound arg is `MqlOneResult`**: `model.target?.stuff` everywhere.
- **Arg gates** (see § Reachability wiring): every `requires:` names a
  mixin the real target composes.
- **Lint gates this build must pass** (all of `lint:family`; named
  because each has a known trip-wire here): `instanceable` (invariant 8:
  pack `src/` taxonomy; 12: no orphan data keys — every authored field
  has fieldMeta), `reachability` (arms A/R: every new view-naming static
  and every new `thing` row reachable: store lines, props, minted rows
  declared the way `swarm.yaml` declares its disposition), `verb-collisions`
  (one `reel` view), `self-contributions` (no `self` lists), `perishable`
  (leaf/pupae on `Provision`; tray/brush/cocoons on non-perishable
  materials), `pathogens` (untouched), `kept-animals` (no handlingRange
  on the silkworm species), `mixin-names` (`RearingMixin`, `FinishingMixin`
  unique), `envelope` (no `_temperature`; the floor's `enclosure.material`
  has conductivity), `light-sources` (no `ambientIntensity` on the floor;
  the lantern is the source), `boot-entries` (no new entry), `shopfronts`
  + `openings` + `menu-staff` + `dossiers` (the two outfits' seats,
  counters, claims), `placement-words`, `location-graph` (two-way exits,
  no dangling destination), `census`, `field-meta`, `mass`, `arg-kinds`,
  `instrument-args` (`reel`'s tool arg declared), `test-bootstrap`,
  `unconsumed-seams` (`FinishingMixin` has `ClothBolt`), `object-verbs`,
  `lib-statics` (no new statics in any `lib/`), `graph-walks`,
  `template-scans`/`world-scan` (brains read authored paths only),
  `no-authored-faucet`, `untitled`.

## Waves

### W0 — the textile chain keeps a fibre's material (and a maker)

**Goal.** Spun wool is wool yarn; woven wool is wool cloth; every yarn and
bolt says who made it. Independent of everything else; fixes a shipped
defect (D7).

**Files.** `packages/content/trade-textiles/src/idea/cmd/textiles/SpinController.ts`
(`finish`: `setMaterial`, `setMaker`, keyword add), `WeaveController.ts`
(same), `src/thing/TextileStock.ts` (`getShortDescription` override for
`yarnCount > 0`), `src/thing/ClothBolt.ts` (override), `content/trade/textiles/thing/{yarn,bolt}.yaml`
(comments only; keep linen defaults), `src/__tests__/material-carry.test.ts`
(new: spin a wool `TextileStock` → yarn material wool, description *skein
of wool yarn*, maker set; weave → *bolt of wool*; a linen chain reads
exactly as before), `src/behavior/__tests__/weaves.bounded.test.ts`
(unchanged, must stay green).

**Acceptance.** AC 8 (wool half), AC 13, AC 16 (weaver half). `pnpm -C
packages/content/trade-textiles test`, `test:near`, `lint:family`.

**Commit.** `build(silk W0): spin and weave keep the fibre's material and stamp the maker`

> ✅ **Done — 71e23860b.** The fibre is read BEFORE the input is consumed
> (an emptied stack is destructed first, and a husk's material is not a
> thing to trust). Keywords gain the material's name words (`raw silk` →
> `raw`, `silk`). The unit test drives the real controllers through their
> engaged steps with only the row clone stubbed.

### W1 — the pack, the rearing, the leaf

**Goal.** A player buys an egg lot, a tray and a sapling, hatches, feeds,
reads the tray in words, mounts, and harvests three heft stacks of
cocoons and a sack of frass. (D1, D2, D3 (seeding + signs + collapse), D5
(the three stacks), D9, D11.)

**Files (new pack `packages/content/trade-sericulture/`).**
`package.json`, `pack.yaml` (`root: /trade/sericulture`, title claim),
`tsconfig.json`, `vitest.config.ts`, `README.md`.
`content/settings/sericulture.yaml` (every dial named in D2–D6, D13).
`content/trade/sericulture/idea/Discipline/sericulture.yaml` (`iscedf:
"0811"`, `specializes: [agriculture]`, `channel: skill`).
`content/trade/sericulture/idea/material/{mulberry-leaf,brushwood,silkworm-egg,cocoon-shell}.yaml`
(⚠ `cocoon-shell` is a non-perishable material with tag `fibre protein
textile sericin gummed once-living` + `biologicalSource: { speciesPath:
bombyx mori, tissueType: cocoon }` — the stack's material; `silkworm-egg`
non-perishable). `content/stuff/idea/species/animalia/arthropoda/insecta/lepidoptera/bombycidae/bombyx/mori.yaml`
(`_bodyPlanPath: …/BodyPlan/sessile`, `_parentCladePath: …/animalia`,
`lifespanMin/Max` the moth's, no `handlingRange`, no `production`).
`content/stuff/idea/species/plantae/…/morus/alba.yaml`.
`content/trade/sericulture/idea/strain/{valley-gold,white-one-brood}.yaml`.
`content/trade/sericulture/thing/{tray,egg-lot,egg-lot/imported,egg-lot/valley,egg-lot/cheap,leaf,mounting-brush,cocoons,frass,plant/mulberry,seed/mulberry}.yaml`.
`src/idea/Strain.ts`, `src/lib/Rearing.ts`, `src/thing/{RearingTray,HouseTray,EggLot,Cocoons}.ts`
(`Cocoons` in W1 carries the fields and the heft/stack identity; its
clock lands in W2).
Tests: `src/__tests__/rearing-clock.test.ts` (warm vs cold trays age at
different rates — AC 3; fed vs unfed; hunger never kills; moult windows;
the collapse at age V for load 0.8; specks at age IV; the three stacks'
means; frass minted), `src/__tests__/egg-lot.test.ts` (a `broods: 1` lot
refuses to hatch unwintered and hatches after `chillS`; `look` shows no
load), `src/__tests__/leaf-wilt.test.ts` (`Freshness.advance` leaves
`fresh` within a game day at 293 K), `src/__tests__/rows.test.ts` (every
row's class resolves; the perishable and reachability dispositions),
`src/__tests__/persistence.test.ts` (capture/materialize a mid-rearing
`HouseTray` — D15).
**Store lines** (`terminus/…/general-store/counter.yaml`): `egg-lot/imported`
par 2, `tray` par 2, `seed/mulberry` par 2, `mounting-brush` par 2
(`hand-reel` and `copper` land with W3/W4).

**Acceptance.** AC 1, 2, 3, 4, 12 (first two clauses), the seeded loads.
Pack vitest + `test:near` + `lint:family` (notably `reachability`,
`perishable`, `instanceable`, `kept-animals`, `mixin-names`).

**Commit.** `build(silk W1): trade-sericulture — the tray, the egg lot, the leaf and the ages`

> ✅ **Done.** Decisions the build made:
> - **The bought lots are sibling rows** `imported-eggs` / `valley-eggs` /
>   `cheap-eggs`, each `extends:` the base `egg-lot` — the folder/leaf
>   invariant forbids `egg-lot` being both a row and a directory.
> - **The cheap lot is a general-store line** (par 1, price 2, *taken in
>   trade*) — the only honest place a player can meet a sick lot that looks
>   clean; the shopkeeper cannot see it either. `valley-eggs` waits on the
>   W5 house counter (`unreachable: awaiting:silk-slate` until then).
> - **`laidWhere` is WORDS, not a path** — `lint:census` reads any
>   path-shaped value as a template ref; a lay writes the room's name.
> - **A one-brood lot that has not wintered is REFUSED by the tray** (in
>   words) rather than adopted into a dormant tray: the winter clock lives
>   on the `EggLot`, and the tray never holds diapause eggs.
> - **Selection keeps the GENETIC mean separate from the phenotype**: the
>   tray carries `lotGeneticMg`, each stack `lotMeanMg` (phenotype, the
>   baseline for S) and `lotGeneticMg`; W2's lay is `G + h²(kept − p)`, so an
>   underfed tray does not breed lighter worms (lens 1 — the breeder's
>   equation applies to the heritable part only).
> - Stack identity is `fieldMeta.stackIdentity: true`, not a static.
> - **Persistence (D15) is asserted at the declaration** (`rows.test`:
>   `HouseTray` composes `PersistableMixin`, every rearing field is
>   persistent), not by a spine round-trip — the spine is generic and its
>   own suite proves capture.
> - Pack added to the repo root `package.json` (PackLogic discovers from
>   it) — the discovery count 61 → 62, ⚠ the known merge hazard.

### W2 — the cocoon: stifle, scorch, the deadline, the lay, selection

**Goal.** D4, D5 (the lay), D3 (inheritance), D13 (pupae row; frass was
W1). (`reel` is W3; pupae are minted there but the row lands here.)

**Files.** `src/thing/Cocoons.ts` (`reconcileCocoons`, the augmenters:
heft, deadline, stifled/scorched/pierced words), `content/trade/sericulture/thing/pupae.yaml`,
`content/trade/sericulture/idea/material/pupa.yaml`, `content/trade/sericulture/thing/stifling-oven.yaml`
(`/platform/thing/Oven`, 345 K — the house's and anybody's row).
Tests: `src/__tests__/stifling.test.ts` — over a real `ThermalMixin`
trajectory toward 500 K: stifled before scorched; toward 345 K: stifled,
never scorched; unstifled at +10 days: pierced + an `EggLot` in the
container with strain, amplified load, `meanShellMg = lotMean + h²S` for
the `heavy` stack, `wintered: false`; stifled at +30 days: unchanged;
scorched drops two bands; `split` keeps every field; stacks of different
state refuse to merge.

**Acceptance.** AC 5, 6, 12 (third clause), 13. Pack vitest + `test:near`
+ `lint:family`.

**Commit.** `build(silk W2): the cocoon — stifled by heat, opened by the deadline, selected by what you keep`

> ✅ **Done.** Calibrated on the real oven: a cocoon stack has almost no
> thermal mass, so it is at the oven's temperature in a minute and the
> window between DEAD and BURNT is the difference of the two hold times.
> `scorchHoldS` went 900 → **1800** so the 500 K kitchen range stifles at
> ~11 min and scorches at ~32 (a 21-minute window — about a real minute
> and three quarters); 345 K never scorches. Risk 3 did not bite: the
> range works, the stifling oven is the forgiving option.
> - **The cocoon material is named `spun silk`** (which is literally what a
>   cocoon is): `spin` carries the material's NAME down the chain, so a
>   pierced cocoon spins to *a skein of spun silk yarn* (AC 11) with no
>   silk code in textiles.
> - **Piercing drops the stack one grade band** (the cut thread is a short
>   staple); scorching drops two and implies stifled.
> - A lay is ONE card: `min(maxEggs 600, quantity × 200)` eggs; the
>   genetic mean is `lotGeneticMg + h² × (meanShellMg − lotMeanMg)` (see
>   W1); `laidWhere` is the enclosing room's name in words.
> - `stifling-oven` and `pupae` carry `unreachable: awaiting:silk-slate`
>   until W3 (reel mints pupae) and W5 (the house props the oven).

### W3 — `reel`, unified

**Goal.** D6. `reel` with a hooked fish reels the fish; `reel cocoons
--count N` at a pot with a hand reel, or at a basin, reels silk.

**Files.** `trade-fishing/content/trade/fishing/cmd/fishing/reel.yaml`
(args + option + help), `trade-fishing/src/lib/Reelable.ts` (new),
`trade-fishing/src/idea/cmd/fishing/ReelController.ts` (re-based on
`ManualBuildController`, the silk branch, module `land()`),
`trade-fishing/src/behavior/__tests__/brains.test.ts` (unchanged),
`trade-fishing/src/idea/cmd/fishing/__tests__/reel-unified.test.ts` (new:
no target → the fishing path; a `Reelable` fake → plan/complete/credit;
the fishing arg gate accepts `any`).
`trade-sericulture/src/thing/{ReelingTool,RawSilk}.ts`, `src/thing/Cocoons.ts`
(`planReel`/`completeReel`), `content/trade/sericulture/thing/{hand-reel,reeling-basin,raw-silk}.yaml`,
`content/trade/sericulture/idea/material/raw-silk.yaml` (`fibre protein
textile gummed sericin once-living`, `appearance: stiff gold raw silk`,
`biologicalSource` bombyx), `src/__tests__/reel.test.ts` (refusals:
unstifled, pierced, too few, no tool, no heat; fewer cocoons → finer,
slower, less even; the basin's `control: fine` evens; maker stamped;
pupae minted; `spin` accepts the skein and carries `raw-silk`; fineness
words by viewer band). Store line: `hand-reel` par 2.
`trade-sericulture/package.json` depends on `trade-fishing`.

**Acceptance.** AC 7, 11, 16 (reeler half), 19. ⚠ W3's own checkpoint:
boot a world, hold a hand reel in a lit kitchen, `reel cocoons --count 6`
— the cross-pack view key must resolve from `ReelingTool`'s static; if it
does not, the view moves to `trade-sericulture` and fishing's `Rod` names
it there (a dependency flip to record, not a design change).

**Commit.** `build(silk W3): reel — one verb, the rod or the basin decides`

> ✅ **Done.** The cross-pack view key in `ReelingTool`'s static needed no
> fallback — a forestry `Panel` already names platform views the same way.
> Decisions:
> - **The `tool` arg IS `greedy: true`** (it is the trailing prepositional
>   tail, and `lint:reachability` arm G ratchets non-greedy prepositional
>   object args); the TARGET stays non-greedy, per the review fix.
> - **A bound target that is not `Reelable` falls through to the fishing
>   act** rather than refusing — `reel` typed with any stray word keeps
>   behaving as it did (AC 19).
> - **Fineness reads the same for every viewer**: a sync `look` augmenter
>   cannot await a competence read, and the ACs ask only that EVENNESS
>   reflect the REELER's competence (it does, baked at the reel). The count
>   is spoken (*six cocoons to it*); denier never appears.
> - Reel charge 40 cocoons/act, base 30 game-minutes at eight to the thread
>   with a rate-1 reel; hot water = a lit burner in reach ≥ 330 K (the
>   stack's or the reeler's `reachableHeatK`).
> - ⚠ **A lint precision fix**: `pack-roots.declaredFields` did not follow
>   a cross-pack base imported by package specifier, so `RawSilk extends
>   TextileStock` read as fieldless. Following it cleared 25 pre-existing
>   false orphans — `lint:instanceable`'s ceiling 387 → 362.
> - `reeling-basin` holds `unreachable: awaiting:silk-slate` until W5 props it.

### W4 — finishing in the piece, the bath rung, dye depth, kermes

**Goal.** D8, D12, the AC 10 line.

**Files.** Kernel: `packages/server/src/mud/lib/thermal/Thermal.ts`
(`holderK` liquid rung + its push-side twin), `lib/thermal/__tests__/bath.test.ts`
(new), `platform/thing/Crop.ts` (`SteepableMixin`), `platform/thing/__tests__/Crop.test.ts`
(steeps iff `steepsInto`). Textiles: `src/lib/Finishing.ts`,
`src/thing/ClothBolt.ts` (+Thermal +Finishing, `canMergeWith` adds the
finishing phase), `src/thing/Copper.ts`, `content/trade/textiles/thing/copper.yaml`,
`src/__tests__/finishing.test.ts` (a raw-silk bolt in a copper of 363 K
water finishes in ~2 game hours: material silk, mass × 0.75, phase line;
a cold copper stalls; a linen bolt is idle). Sericulture:
`content/trade/sericulture/idea/maturation/degumming.yaml`,
`content/trade/sericulture/idea/material/silk.yaml` (white, lustrous,
`protein fibre textile once-living`, `thermalConductivity` wool-ish). Dyeing:
`DyeController.ts` (`gummed` in the penalty; `strength *= bondPenalty`),
`src/__tests__/two-chemistries.test.ts` (+ a case: alum-silk deeper than
alum-linen; gummed silk thin), `content/trade/dyeing/idea/dyestuff/kermes.yaml`.
Farming: `content/trade/farming/thing/plant/kermes-oak.yaml`,
`thing/crop/kermes.yaml`, `idea/material/kermes.yaml`, the species row,
`steepsInto` on `crop/madder-root`, `crop/weld`, `crop/woad` rows,
`src/__tests__/fibre-and-dye-rows.test.ts` (+ kermes, + every dye crop
steeps into its dyestuff). Terminus: the dyehouse floor props a copper, a
brazier and dry logs. Store line: `copper` par 1.

**Acceptance.** AC 9, 10, 17. Kernel `test:near`, textiles/dyeing/farming
vitest, `lint:family` (`envelope`, `perishable`, `doneness` untouched).

**Commit.** `build(silk W4): finishing in the piece — a bath has a temperature, a bolt a profile, kermes two rows`

> ✅ **Done.** Risk 2 BIT, and the fix is a kernel one:
> - ⚠⚠ **The bulk phase layer flashed a vessel's whole interior to steam
>   the instant it reached the boil** — every pot on every fire boiled dry
>   at 100 °C, despite `Material.latentHeatOfVaporization`'s own doc
>   promising a plateau. `reconcileBulkPhase` now has the latent-heat
>   plateau (the boil twin of `reconcileMelt`): the heat above the boil
>   turns liquid to steam and the liquid HOLDS at the boil; a material with
>   no latent heat still flashes. `Meltable.test`'s instant-boil case now
>   asserts the plateau (+ a boil-dry case). `reconcilePhase` is `@Final`,
>   so a per-class override was not available — the plateau was the only
>   compliant path, and it is the documented intent.
> - **The immersion rung is any interior bulk** (not only "a liquid"):
>   a body buried in grain is at the grain's temperature too, and there is
>   no cheap phase predicate. Immediate holder only.
> - **The copper is 12 L**, not 40: the kernel's Newton model (τ = R·C,
>   no burner power) heats 30 L to a simmer in ~5 game hours; 12 L
>   simmers in ~1½ and degums in ~3½ all told. `Copper` caps its CONTENTS
>   read at the boil (the vessel's own temperature runs ahead between reads).
> - `FinishingMixin`'s two progress fields are stack identity (a half-boiled
>   bolt never merges with a finished one); held past `damageAboveK` costs a
>   band — unreachable in water, by the cap.
> - Dye: the gum penalty applies to BOTH chemistries, with its own sentence
>   (*still in its gum*); depth pays the penalty for both (`depth.test` runs
>   the real controller).
> - The kermes oak is a polycarp authored ready, propped on the silk house
>   walk (W5); `two-chemistries` now counts three mordant dyes.
> - The dyehouse floor props a copper, a brazier and three logs — its prose
>   always said *"coppers along one wall, each over its own fire"*.

### W5 — the silk house, and the reeler at the mill

**Goal.** D10, D11 (the walk), D15 (house trays). The house runs while
loaded; the mill buys, reels, weaves and consigns silk cloth.

**Files.** `hearts-delight/pack.yaml` (title for the silk house to its
outfit; no boot entry), `package.json` (+ `trade-sericulture`),
`content/world/terminus/hearts-delight/silk-house.yaml` (zone),
`silk-house/{location/floor,location/walk,location/offstage,idea/outfit,agent/keeper,agent/hand,thing/tray,thing/tray-1,thing/tray-2,thing/tray-3,thing/oven,thing/brazier,thing/counter,thing/stock,thing/walk}.yaml`
(the walk is a `/trade/forestry/thing/Panel` with four mulberries `{as}`
+ one kermes oak), `location/bench-lane.yaml` (+ `north`).
`trade-sericulture/src/behavior/{tends,reels}.ts` + `src/behavior/__tests__/{tends,reels}.bounded.test.ts`
(the `weaves.bounded` shape: literal verbs, bounded, no-progress guards,
`presenceGated = false`, nothing cloned).
Terminus: `mill/agent/reeler.yaml`, `mill/idea/outfit.yaml` (+ reeler
seat), `mill/location/floor.yaml` (+ cast, + basin, brazier, logs,
silk-stock), `mill/thing/silk-stock.yaml`, `trade-textiles/content/trade/textiles/thing/bale-store.yaml`
(+ the cocoon line with `supplier`), `terminus/package.json`
(+ `trade-sericulture`), `terminus/src/__tests__/silk-mill.test.ts`
(rows resolve; the outfit lists the counters; the reeler claims
textiles). `weaves.ts` is untouched (silk runs on the reeler).

**Acceptance.** AC 14 (as § Requirements friction states it), 15. Pack
+ terminus vitest, `lint:family` (`openings` rules 3–5, `shopfronts`,
`dossiers` rule 6, `boot-entries` unchanged at 83, `location-graph`,
`light-sources`, `envelope`).

**Commit.** `build(silk W5): the silk house in the valley, and a reeler at the mill`

> ✅ **Done.** Re-planned in place where the plan's premise was wrong:
> - **No sub-zone**: the loft and the walk are `SingletonCartesianLocation`s
>   on the Delight grid (`{-12,3,6}` / `{-14,3,6}`), the creamery's shape.
> - ⚠ **The cocoon line is NOT on the textiles bale store**: that row is
>   the textiles pack's, and a textiles row naming a sericulture good points
>   the dependency the wrong way. The mill gets its own input Stock,
>   `mill/thing/crib` (par 40, supplier the silk house outfit).
> - **The house hand puts stifled cocoons straight on the house counter**
>   (the house's own goods, priced) instead of `consigns` — `consigns` lifts
>   ONE unit per `get 1`, which for cocoon-count stacks is forty listings a
>   reeling. The reeler's `stocks` beat buys them there (`batch: 40`).
> - **No `CirculatingMixin` on Cocoons/EggLot**: a `censusKey` with the
>   default `regionTarget` is a census FAUCET; the asks ride the counter's
>   `prices` and the reeler's `defaultAsk` instead.
> - **The trays are worked by OBJECT in `tends`** (three trays in one room;
>   a typed `tray` resolves whichever comes first) — the oven, counter,
>   mulberry and doors are literal verbs. The oven is lit only when there is
>   a crop to stifle (the kernel `stokes` calls), fuelled by the fuel trade's
>   charcoal (bounded props).
> - ⭐ **tray-1 is authored SPINNING** (`spinStartS: 1`): spinning is a time
>   not a warmth, so the house has a crop on the first reads of a boot in
>   ANY season — the world boots in winter and an unheated loft rears
>   nothing (honest), which would otherwise leave AC 14 undrivable.
> - `reels` words chosen so nothing else on the floor answers: `hank` (a new
>   raw-silk keyword), `crib`, `silks`; config key `bin` (a reachability
>   CITATION) for the crib. Walk mill↔loft: 9 authored steps each way (via
>   the ford).
> - The lane gains `north`; the house is titled to its outfit; nothing is
>   booted (83/83 unchanged). The dyehouse also gains a water butt.

### W6 — the labour bench and the prices

**Goal.** D14. **Files.** `trade-sericulture/src/__tests__/labour.bench.test.ts`;
the numbers it prints are written into `silk-house/thing/counter.yaml`
(`prices`), the hand's `consigns` ask table, the reeler's `consigns`
`defaultAsk`, and the bale-store line is left as `supplier` (the price is
the house's). **Acceptance.** AC 20. **Commit.** `build(silk W6): the
labour bench — hours per kilo, and the silk prices that follow`

> ✅ **Done.** ⭐ A rearing's hours are **attendance** (two 15-minute visits
> a day for the ~23 feeding days at 25 °C, + 4), not act length — the
> slate's insight that silk is scarce because the TIME commitment is.
> Printed: per web linen 4.2 h · wool 3.5 · silk 10.5; per kg of fibre
> linen 2.6 · wool 2.2 · **silk 173**. The cocoon's price is those hours at
> the hand's wage **floored at one coin** (≈0.15 by the hours — the currency
> has no smaller unit; markets-slate Q5); the silk bolt's ask is the cocoons
> plus the reeler's hours at her wage, per bolt: **84** (linen asks 40).

### W7 — the drive, and the docs

**Goal.** D16; the subsystem doc. **Files.**
`packages/wire/tests/silk.dirty.wire.test.ts`; `docs/subsystems/sericulture.md`
(new: the tray as the host, the degree-day clock, the seeded load, the
three heft stacks and R = h²S, the stifle integral and the deadline, `reel`'s
unification, the silk house); `docs/subsystems/textiles.md` (material
carry, the finishing seam, the copper); `docs/subsystems/fishing.md`
(`reel`'s second arm); `docs/subsystems/taps.md` (the fourth row of the
feedback law — a pointer); `docs/subsystems/thermal.md` (the bath rung);
`docs/subsystems/apiculture.md` (the vacancy note: the valley's second
party is the silk house); `CLAUDE.md` map line + the `sericulture`
category note (index lines are swept, not raced — add them in this
worktree only if no sibling holds the file). **Acceptance.** The drive
record below, 20/20, appended with the run's output. **Commit.**
`drive(silk): …` then the MR.

## Reachability wiring

| capability | verb | affordance (a class static) | data | boot | arg gate |
|---|---|---|---|---|---|
| hatch / feed / mount | `put` (platform) | `ContainerMixin` on `RearingTray` offers region zero | tray/egg-lot/leaf/brush rows; store lines | none — the store counter stands the rows up | `put.yaml` item `ContainableMixin` ✔ (Goods), target `ContainerMixin|PlacingMixin` ✔ |
| harvest cocoons | `get … from tray` (platform) | contents of a container | cocoons rows | none | `get.yaml` `VisibleMixin, ContainableMixin` ✔ |
| cut leaf | `harvest`/`pick` (platform) | `Panel`/`GardenBed` statics (already) | mulberry plant row (`harvestTemplatePath`), leaf row | none; the walk is a prop of the walk room | `GrowingMixin|CultivableMixin` ✔ (`Plant`) |
| plant a sapling | `plant` (platform) | `GardenBed` statics (already) | seed row, store line | none | the Seed row's class ✔ |
| stifle | `put cocoons in oven` + `ignite`/`stoke` (platform) | `Oven`'s container + `Burner` statics (already) | stifling-oven row; the kitchen range | none | ✔ |
| the deadline, the lay | none — a reconcile | — | egg-lot base row minted by code (declare the row's disposition as `swarm.yaml` does) | none | — |
| `reel cocoons` | `reel` (fishing's view, extended) | `ReelingTool.commandContributions` → `trade/fishing/cmd/fishing/reel.yaml` (⚠ cross-pack key, verified in W3) | hand-reel + basin rows; raw-silk + pupae rows | none | `target requires: any` (the controller narrows on the shape); `tool requires: [ToolMixin]` ✔ (`ReelingTool extends Tool`); `instrument-args` satisfied by `default:` |
| throw / weave silk | `spin`/`weave` (textiles, unchanged views) | `SpinningTool`/`Loom` statics (already) | the skein's `yarnCount: 0` + `fibre` tag | none | `StackableMixin` ✔ (`RawSilk extends TextileStock`) |
| degum | `put bolt in copper`, `fill`, `heat copper`, `get` (platform) | `Copper` is a Container + Bulkable + Thermal | copper row; degumming profile (warmed by `MaturationProfileCatalogue` by infix — it already globs `/**/idea/maturation/**`) | none | `heat.yaml` `requires: any` ✔; `fill` `BulkableMixin` ✔ |
| dye silk / kermes | `steep`, `mordant`, `dye` (platform + dyeing, unchanged views) | `DyeVat` statics (already) | kermes rows; `steepsInto` on the dye crops; `DyestuffCatalogue` warms by infix on first `dye` | none | `steep.solute requires: any` + `isSteepable` ✔ (Crop composes it after W4); `dye.target DyedMixin` ✔ (`ClothBolt`) |
| frass | `feed` (platform) | `GardenBed` statics | frass row with a `compost`-tagged interior | none | `source` `mustHaveBulkSlot` ✔ (`BulkableMixin(Good)`) |
| pupae | `eat` (platform) | — | pupae row | none | `mustBeEdible` ✔ (material `edibility: true`) |
| the house | `apply`, `clock`, `buy` (platform) | counter `Stock` statics; the outfit via the location graph | business, counter, cast rows | **none** (83/83) — loads on arrival; the reeler's `stocks` trip arrives | `openings` rules 3–5 ✔ by authoring |
| the mill reeler | brains | `stocks`/`reels`/`consigns` named on the row | reeler seat, basin, silk-stock, bale-store line | the mill floor + outfit are already booted | `dossiers` rule 6: the reeler claims `textiles` |

Each `requires:` above was checked against the composition of the class
the real target names.

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 buy/hatch/feed/rear/harvest alone | W1 |
| 2 the tray in words, no number | W1 |
| 3 colder slower; underfed slower + lighter; never dies | W1 (unit) + W7 (drive step 4) |
| 4 leaf wilts in ~a day, feeds worse | W1 |
| 5 stifled never opens; unstifled opens at ~10 days with pierced + a lot | W2 |
| 6 over-heated scorched, worse silk | W2 (+ W3 reads it) |
| 7 `reel cocoons --count`, words, evenness by competence, basin evener | W3 |
| 8 silk stays silk; wool is wool | W0 + W3 + W4 |
| 9 boiling: softer, lighter, white; under-boiled dyes poorly | W4 |
| 10 silk on alum brighter than linen | W4 |
| 11 pierced cocoons spin | W2 + W3 |
| 12 lot reveals nothing; heavy lot specks + collapses; moths lay infected | W1 + W2 |
| 13 keeping the heaviest raises the next lot | W2 |
| 14 the house feeds/stifles/sells; the mill reels/weaves; cloth at the store; wage from the house account | W5 (see § friction) |
| 15 a player takes the hand's or reeler's seat | W5 (`headcount: 2`) |
| 16 silk carries reeler's and weaver's marks | W0 + W3 |
| 17 kermes crimson, no code | W4 |
| 18 frass into a bed; pupae eaten | W1 + W2 + W3 |
| 19 fishing's `reel` unchanged | W3 |
| 20 the bench; prices follow | W6 |

Nothing unmapped.

## Test & gate strategy

- **Unit (per wave, colocated `__tests__/`)** — every clock over a real
  trajectory (`ThermalMixin` with stamped ambient), never a mocked rate:
  the ages, the stifle/scorch window at 500 K and 345 K, the lay, the
  selection arithmetic, the finishing profile, the bath rung, the leaf
  wilt, the two brains' boundedness. `Freshness.advance`,
  `MaturationProfile.rateAt`, `Decay.toward` are pure and testable.
- **Content tests** — rows resolve, every stock line is chattel-stampable
  (`general-store-standup.integration.test.ts` already asserts this and
  will fail loudly on a bad row), the outfits list their counters.
- **Only the drive can prove**: the cross-pack affordance of `reel`; the
  hand feeding trays and the reeler's walk; a copper on a range with a
  bolt in it; `put` into a tray from a player's hands; the mill's
  consigned silk bolt on the general store shelf; the wage out of the
  house's account. Each is a drive checkpoint that can FAIL (a count, a
  material word, a balance).
- **`pnpm test`** at two moments only: before the MR and at `/finalize`.
  Between: `pnpm test:near`, each touched pack's vitest, `pnpm -C
  packages/server lint:family`.
- **`pnpm test:gym`** untouched.

## Risks & opens

1. ⚠⚠ **The unobserved house** (D10). With the boot ceiling full, the
   house acts only while loaded; residency may evict it between the
   reeler's visits and a tray then stalls (soft) until the next read. If
   review wants the house booted, that is a `check-boot-entries` ceiling
   conversation with a caller audit, not a plan change — raise it there.
2. ⚠⚠ **The bath** (D8). The kernel `holderK` rung touches every
   Thermal body inside a liquid-holding vessel; the boil transition in
   `reconcilePhase` may cap or evaporate the copper's water at 373 K. The
   degumming profile's `happyK: 363` is chosen so a simmer suffices; the
   W4 unit test runs the real vessel.
3. ⚠ **The stifle window at 500 K** (D4). If no dial pair lets a kitchen
   range stifle before it scorches on the real trajectory, the honest
   answer is that a range is too hot and the hobbyist buys the
   `stifling-oven` row (gentle, sold at the store) — record it, do not
   fudge `burnTemperatureK`.
4. ⚠ **Cross-pack view key** in `ReelingTool`'s static (D6) — no
   precedent found; W3 checks it live first.
5. ⚠ **The reeler's errand** — a 14-hop authored `ways` list each way;
   `stocks` resolves the supplier by the ROOM its counter stands in
   (`openings` rule 5) and prices by `priceFor` (author the counter's
   `prices`). A `par` on a stackable line: verify `Stock.onHand` counts
   quantity, not objects, before trusting `par: 60`.
6. ⚠ `lint:reachability` arm R for rows only code mints (cocoons, frass,
   pupae, raw-silk, egg-lot base): copy `swarm.yaml`'s disposition.
7. ⚠ The Hinkley kitchen is unheated (an `Oven` heats no room): the
   drive opens in summer; winter rearing at home is correctly slow.
8. Open to the user, not guessed: whether the reeler's wage is 3 (the
   bottleneck-worst-paid lesson, chosen here) or 4; whether the house
   keeper should also run `tends` off shift (chosen: no — the hand does
   the motion, the keeper holds the judgment seat).

## Requirements friction

1. **AC 14 / drive step 16 — "with no player present".** The boot-entry
   gate is at its ceiling (83/83) and a rise is out of bounds for this
   build. The silk house therefore runs **while loaded** — loaded by a
   visitor or by the mill reeler's buying trip — and reconciles its trays
   on the next read otherwise. The drive proves step 16 with the player
   standing outside the valley. The question *should an NPC house act
   while nothing has loaded it* is the unobserved-economy slate's, and
   this plan does not reopen it.
2. **"`put leaf on tray`"** — the tray is a container (its contents must
   persist with it and an egg lot must be adopted on entry), and a
   container takes `in`. The drive types `put leaf in tray`; `put leaf on
   tray` answers the platform's teaching refusal (*it takes in*). Product
   wording, not product scope.
3. **Drive steps 11 and 17 presuppose a dye bath** and no shipped
   mechanism can charge one (grounding § Dyeing): dyeing's own drive
   never dyed. The plan closes it with one kernel line (`Crop` composes
   `SteepableMixin`) and `steepsInto` on four crop rows — a defect fixed
   on the way, recorded here so the sweep graduates it to `textiles.md`.
4. **Goals say pupae are "food and bait"; AC 18 and the drive say
   eaten.** Bait kinds are a closed set in fishing's `Bait.ts`; the plan
   ships eating only and records bait as fishing's call.
5. **AC 10** needs a one-line change to `DyeController` (depth, not only
   fastness, pays the bond penalty) — in scope as integration, noted so
   the dyeing doc's *"saturation is a thing wool brings"* sentence gets
   its mechanism.

## Deferred seams

- **Fuel for the house's brazier and oven** — bounded dry-log props; the
  fuel trade's supplied line is the attach point (`stockLines` with
  `supplier` on the house's stock) → fuel-trade / markets slate.
- **Bait from pupae** → fishing's `BAIT_KINDS` (a fifth word) — textiles
  or fishing slate, one line when wanted.
- **`FinishingMixin` on `Garment`**, scouring wool, piece-bleaching
  linen → textiles-slate (the seam is the mixin; each is a profile row).
- **The fibre's own base colour** in `Dyed.getColorMix` (gold raw silk,
  fawn linen) → textiles-slate (already recorded there).
- **The conditioning house, status demand, the finite labour pool** →
  markets-slate (unchanged).
- **A booted silk house** → unobserved-economy-slate.
- **Microscope certification of a lot** → optics-slate Half A: the seam
  is `EggLot.pebrineLoad` behind `spoiler`.
- **`weaves.ts` spinning a second fibre** — not needed (silk runs on the
  reeler's brain); if a mill ever wants one hand on two fibres, a `spins:`
  config list is the attach point.

## Critical files

Read first, in this order:

1. `docs/requirements/silk-requirements.md`, `docs/slates/builds/silk-slate.md`
2. `packages/content/trade-apiculture/src/lib/Colony.ts`, `src/thing/Hive.ts` (the population host, adoption, minting from a mixin)
3. `packages/server/src/mud/lib/maturation/Ripening.ts`, `lib/maturation/MaturationProfile.ts`, `lib/thermal/Thermal.ts:820-1100`
4. `packages/content/trade-textiles/src/idea/cmd/textiles/{Spin,Weave}Controller.ts`, `src/thing/{TextileStock,ClothBolt,BleachingGreen}.ts`, `src/behavior/weaves.ts`, `src/idea/cmd/textiles/__tests__/mill-throughput.bench.test.ts`
5. `packages/content/trade-fishing/src/idea/cmd/fishing/ReelController.ts`, `src/thing/Rod.ts`, `packages/server/src/mud/lib/ground/Workable.ts`, `platform/idea/cmd/ground/{SplitController,WorkedActController}.ts`, `platform/idea/cmd/crafting/ManualBuildController.ts`
6. `packages/content/trade-forestry/src/thing/Panel.ts`, `content/trade/forestry/thing/hazel-stool.yaml`, `packages/server/src/mud/lib/husbandry/Growing.ts:787-900`
7. `packages/content/trade-dyeing/src/idea/cmd/dyeing/DyeController.ts`, `packages/server/src/mud/platform/idea/cmd/crafting/SteepController.ts`, `platform/thing/Crop.ts`
8. `packages/content/trade-shopkeeping/src/behavior/{consigns,stocks}.ts`, `packages/server/src/mud/lib/retail/Stock.ts`, `packages/content/terminus/content/world/terminus/wharfside/mill/**`, `packages/content/hearts-delight/{pack.yaml,content/world/terminus/hearts-delight/creamery/location/floor.yaml}`
9. `packages/server/scripts/check-{boot-entries,reachability,envelope,light-sources,openings,perishable,kept-animals}.ts` (headers)
10. `packages/wire/tests/taps.dirty.wire.test.ts`, `packages/wire/src/harness/index.ts`
11. `docs/subsystems/{textiles,apiculture,taps,husbandry,maturation,spoilage,employment,thermal,furnishing,content-packs}.md`

## Drive record

*(appended at build time — the output of `packages/wire/tests/silk.dirty.wire.test.ts`,
the count, and what each failure was. Precedent: `farming-plan.md §
Checkpoint A`.)*
