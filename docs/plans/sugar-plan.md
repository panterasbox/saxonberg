# Sugar — implementation plan

Executes [sugar-requirements.md](../requirements/sugar-requirements.md)
(kind: **feature**, lead end: **content-led over kernel seams** — every
seam's first consumer ships here). Both stages are one build on branch
`reqs/sugar` in worktree `build-1` (WIRE_PORT **2014**). Seeding slate:
[sugar-slate](../slates/builds/sugar-slate.md). Two unmerged MRs this
build rides: **!398** (the-world slate — the planet radius setting, § D12)
and **!397** (unfree-labour — only its "unpaid hand walks off" finding,
§ D10). One unmerged MR it must NOT depend on: **!380** (cleanliness —
the lye hopper; § D3).

Wave order (founder-agreed): **W0** the unpaid hand → **Stage A** the
Terminus sugar house (W1 the boil · W2 the cone and the grades · W3 the
rum · W4 claying, last) → **Stage B** the island (W5) → **W6** the voyage
with the radius setting. Every wave lands at a commit
`build(sugar W<n>): …` and is independently landable.

---

## Grounding

Verified by opening the file, on `reqs/sugar @ 99e535261` (master
`a084aad88`), 2026-10-18/19. `M` = `packages/server/src/mud`, `C` =
`packages/content`, `G` = `C/terminus/content/world/terminus/goods-yards`.

### The boil (maturation, thermal, fire)

- `M/lib/maturation/Maturing.ts` — `reconcileFerment()` (l.599) takes the
  time-weighted mean of `ThermalMixin.temperatureTrajectory` and, while
  `active`, dispatches an `evaporative` profile to
  `reconcileEvaporativeWindow(profile, tempK, amountL, nowS)` (l.698 →
  l.1351). There `f` = water removed / water to remove; `startL =
  amountL / (1 − f·shrink)` is **recovered, not stored**; `f` is clamped
  `Math.min(1, …)` per segment (l.1399); at `f ≥ 1` (l.1433) the phase is
  set `finished`, `ensureInteriorMaterial(productMaterial)` and the amount
  set to `startL × productFraction`. The `finished` branch (l.802) only
  retries the swap and runs the `turnedMaterial` clock. **One product,
  then frozen.** `getGravity()` (l.841) = `1 + remainingSugar × k` with
  `remainingSugar = startingSugar × (1 − f)` — on an evaporative batch
  `measure density` **falls** as the pan concentrates. `startBatch`
  (l.873) captures `startingSugarGPerL = material.getNutrientAmounts()['sugar']`.
  `batchInputBand` (l.~590) caps an ungraded batch's band at the input's.
  ⚠ Master has **no** `matchProfile` hook; `origin/reqs/cleanliness`
  adds one at its l.1476 and `Hopper` overrides it.
- `M/lib/maturation/MaturationProfile.ts` — the row-extension precedent:
  `transforms` (l.350), `scaldAboveK` (l.356), `leesShare` (l.362), all
  `fieldMeta` persistent+authorable with get/set pairs; `forMaterial`
  (l.735) warns on a two-profile clash. Fields today: `key inputCategory
  stallBelowK happyK damageAboveK ratePerDay productMaterial
  productFraction turnedMaterial turnDays sealedOnly productAtFraction
  kind mechanism strain requiresStrain wildStrain spontaneousLagDays
  killK stallAboveK leesFraction leesMaterial starveDays transforms
  scaldAboveK leesShare`.
- `M/lib/maturation/MaturationClock.ts` l.79 `damageSat` is
  **temperature-only** (ramps over 15 K above `damageAboveK`). There is
  no "boiled dry" path anywhere; the yaml prose that says so is stale.
- `M/lib/material/Evaporation.ts` l.69 `AIR_BOIL_CAP_K = 373` caps the
  heat term of the rate.
- `M/lib/thermal/Thermal.ts` — `heatSourceK()` (l.1028, **private**)
  returns a lit, fuelled `Burner`'s `getHeldTemperatureK()` when the body
  is IN it or placed ON it; `ambientTrajectory()` (l.873) returns that flat
  and the body relaxes toward it. **No concentration dependence.**
  `reconcileBulkPhase` (l.1313) **flashes a liquid to nothing** at
  `temp ≥ material.boilingPoint` (sap survives because it authors none).
- `M/lib/fire/Burner.ts` — `burnPowerW()` (l.613) = min(maxBurnPowerW ×
  draught × bellows, kg × `fire.power.perKgW` 1500); `getHeldTemperatureK()`
  (l.663) = min(burnTemperatureK × bellows, fuel flame K) × completeness
  factor. `fieldMeta` at l.353 (`burnTemperatureK`, `maxBurnPowerW`,
  `draught`…). **No heat-transfer / efficiency field.** Affordances are
  `static commandContributions: CommandContributions` (l.299) — the
  pattern every verb-affording class uses.
- `M/platform/thing/Oven.ts` = `ContainerMixin(PlacingMixin(Firebox))`;
  `fuelSlot()` reads a gas vessel placed on it. `M/platform/thing/Vat.ts`
  composes `AssembledMixin(DurableMixin(VesselKindMixin(MaturingMixin(CraftedMixin(…)))))`
  (l.69) — **a Vat already matures**, which is why the sap pan runs a
  profile with no pack class.
- Rows: `C/trade-forestry/content/trade/forestry/idea/maturation/maple-sap.yaml`
  (`evaporative`, `happyK 370`, `damageAboveK 400`, `ratePerDay 6`,
  `productFraction 0.04`, product `…/material/maple-syrup`); `birch-sap.yaml`
  (0.02); `C/trade-quarrying/…/maturation/brine.yaml` (0.1). The arch
  `C/trade-forestry/content/trade/forestry/thing/evaporator.yaml` is an
  `Oven`, `burnTemperatureK 390`, `maxBurnPowerW 12000`, `fuelCapacityKg
  80`; the pan `sap-pan.yaml` a `Vat`, 40 L, `closure: open`. Both are
  `props:` of `C/rejection/content/world/terminus/rejection/hanging-wood/sugarbush.yaml`.
  The maple-sap material authors **no `boilingPoint`** and its tags
  `[liquid, food, sap, maple-sap, perishable, once-living]`.
- `M/platform/thing/Firewood.ts` = `CombustibleMixin(ThermalMixin(ReservedMixin(Good)))`
  (no seasoning). `C/trade-quarrying/src/thing/Turf.ts` =
  `WaterActivityMixin(Firewood)` with `turf.yaml` authoring a `fuel`
  reserve (`capacityValue 100, currentValue 100, unit "%"`, theme
  `combustion`). `FireLogic.tooWetToCatch` gates ignition on moisture;
  heat does not vary with it.

### Moulds and drainings

- `M/lib/mould/Mould.ts` — `reconcileSetting()` (l.290) integrates
  `setProgress` at `(1 + ratio)/days` per game-day, `ratio = min(1,
  loadKg/(poolKg × loadRef))`; at completion computes `massKg = poolKg ×
  (1 − (1 − moisture)·waterFraction)`, zeroes the interior (l.344–346)
  and `castInto({material: becomes, massKg, payload, moisture,
  stampMaterial: true})`. **The driven-off liquid is subtracted
  arithmetically and vanishes; nothing drains during the set.**
  `castInto` (l.362) clones `castTemplateFor(material)`, sets material and
  mass, `carryPayload`, and for a reusable mould `ContainmentApi.move(item,
  self)` + `wear(wearPerCast)`. `getContents()` drives the reconcile.
- `M/lib/material/Material.ts` l.135 `DrainSetting {days, becomes?,
  moisture: {unloaded, loaded}, loadRef}`, validated in `setDrainSetting`
  (l.598). `M/platform/thing/Mould.ts` =
  `MouldMixin(DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))))`
  — no `Placing` (the hoop composes it itself).
- `C/trade-dairying/src/thing/Hoop.ts` = `PlacingMixin(MouldMixin(DurableMixin(CraftVessel)))`;
  `hoop.yaml`: `interiorCapacity 4`, `closure: liquidTight`,
  `castTemplate /trade/dairying/thing/wheel`, `reusable: true`,
  `placements: [on]`. The whey today goes nowhere.

### Readings

- `M/lib/instrument/Reading.ts` `@hook analyze` (l.473), `measure`
  (l.491), `benchRead` (l.511); the base refuses a rung it lacks. A
  channel is a row at `<root>/idea/reading/<channel>.yaml` naming
  `class: <root>/idea/reading/<Channel>Reading`, warmed by
  `M/platform/idea/ReadingCatalogue.ts` on the `/idea/reading/` infix
  (no kernel list). Pack exemplar: `C/trade-ice/content/trade/ice/idea/reading/ice.yaml`
  + `C/trade-ice/src/idea/reading/IceReading.ts` (row keys `channel kind
  scope discipline instrument instrumentNoun eyeCeiling improves stakes`).
- `M/platform/idea/reading/TemperatureReading.ts` — `subjectValue`
  (l.95) returns a Thermal subject's `getTemperature()`; `analyze` in
  words (l.60); `halfWidthOf` per band. `measure temperature <pan>` is
  therefore already the thermometer rung — once the pan's temperature
  tracks concentration.
- `M/platform/idea/reading/DensityReading.ts` — overrides `measure` only,
  prints `getGravity()` for a Maturing subject, no bracket.

### Crafting, tags, cutting, milling

- Decline sites: `M/platform/idea/api/CraftingLogic.ts` l.2962 (item
  slot) and l.2979 (bulk slot) return `{ok: false, reason:
  'insufficient-input', detail: inSlot.category}` — **only the slot
  category**; nothing records a near miss. Rendered by
  `M/lib/craft/CraftingDecline.ts` l.56–74
  (`There isn't enough ${detail} to make that.`). `CraftDeclineReason` /
  the failure union at `CraftingLogic.ts` l.264.
- `C/trade-cooking/content/trade/cooking/idea/material/sugar.yaml` tags
  `[solid, food, sugar, sweetener]`; honey
  (`C/trade-apiculture/…/material/honey.yaml`) `[honey, sweetener, food,
  edible]`. `sugar-sack.yaml` is a `/platform/thing/Bottle`, `censusKey
  pantry:sugar`, 6.25 L sugar. Recipes slotting `category: sugar`:
  `C/trade-hospitality/content/recipes/mojito.yaml` (0.005 L, `minGrade
  fair`), `old-fashioned.yaml`, `C/trade-winemaking/content/recipes/sweet-vermouth.yaml`,
  `C/trade-cooking/content/recipes/simple-syrup.yaml`. The Lounge par line:
  `C/saxonberg-lounge/content/world/lounge/idea/business.yaml` l.205
  (`category: sugar, unit: L, level: 4, supplier: …/distributor/idea/business,
  exemplar: /trade/cooking/thing/sugar-sack`). Tests naming the sack:
  `C/trade-cooking/src/__tests__/roster.test.ts:306`,
  `C/trade-hospitality/src/__tests__/menu.test.ts:262`.
- `M/lib/craft/Cuttable.ts` — `Cuttable.cutPlan(req) → CutPlan | CutRefusal`
  (`durationMs, effortW, beginSelf, onComplete`) and `CutPlanner` on a
  tool; `M/platform/idea/cmd/crafting/CutController.ts` is dumb (asks the
  target, then a bound tool; `cut.yaml` binds `target` with `requires:
  any` and `tools` with `requires: [ToolMixin]`). Implementers:
  `C/water/src/thing/IceSheet.ts` (and cloth via a planner).
- `C/trade-milling/src/idea/cmd/milling/MillController.ts` — anything not
  `grain`/`malt` goes `grindThrough` → `recipeForStock` (l.336:
  `CraftingApi.recipeTaking('millstone', material.getTags())`) →
  `CraftingApi.craft`. **A new grindable is a recipe row.** Precedents:
  `C/trade-milling/content/recipes/bone-meal.yaml`,
  `C/trade-rubber/content/recipes/dandelion-latex.yaml`. Two-output
  precedent: `C/trade-winemaking/content/recipes/crush.yaml`
  (`outputResidue: {template, count}`); `RecipeResidue` at
  `M/lib/craft/Recipe.ts` l.118, minted at `CraftingLogic.ts` l.3208 as a
  fixed count landed beside the maker. Mill rows: `grist-mill.yaml` /
  `quern.yaml` (`/trade/milling/thing/GristMill`, `{kind: millstone}`) —
  **no edge-runner row**. No mortar anywhere.
- Staling precedent for a clock on a held discrete thing:
  `C/trade-baking/src/lib/Staling.ts` (pack `lib/`, reconcile-on-read),
  composed on `C/trade-baking/src/thing/Loaf.ts` over `Provision`.
  `M/platform/thing/Crop.ts` `extends Provision`; `Provision` =
  `SampledMixin(CraftedMixin(ComposedMixin(ContaminableMixin(WaterActivityMixin(ThermalDoseMixin(FreshnessMixin(ThermalMixin(Good))))))))`.
  `HarvestController.ts` l.204–235: band from `getWorstLimiting()`, clones
  `harvestTemplatePath` with `madeFrom`, `crop.stamp({maker, grade,
  recipe, craftedAt})`.

### Lime, stocks, distilling, Veshko, the pantry

- `C/trade-quarrying/content/recipes/burn-lime.yaml` → `/trade/quarrying/thing/quicklime`
  (a `Lump`, 4.5 kg; material tags `[mineral, caustic, alkali, liming]`).
  **No `stockLines` anywhere carries it**; the glasshouse has two as
  bounded `props:`. The quarry's shop is
  `C/rejection/content/world/terminus/rejection/thing/store-counter.yaml`
  (a `/trade/shopkeeping/thing/Stock`, `businessPath
  …/rejection/idea/provisioning-business`, import lines for tools, the
  sugaring kit, the drilling kit — "a new trade's instruments go where
  people already buy").
- `M/lib/retail/Stock.ts` l.75–104 `StockLine {itemTemplatePath, par,
  brandKey?, from?, pricing?, buys?}`; `from` absent = import cloned to
  par at reset; `{supplier}` bought by the keeper's `stocks` beat
  (`C/trade-shopkeeping/src/behavior/stocks.ts`, config `counter` +
  `ways`); `{store}` brought up; `buys: true` = the house buys from
  anyone who `sell`s at `bidFor` (ask less `retail.termsMargin`).
  `sourceOf` (l.209) is the one decoder. **A line cannot transform an
  input into an output.**
- Veshko: `G/veshko/idea/outfit.yaml` (Business, `appointingAuthority
  {kind: committee, parcel: /corpo/veshko}`, one position `hand`
  `purchases: true`, roster 06–18, `banksAt goodkin`, operating the
  distillery + its stock); `G/veshko/agent/hand.yaml` Petra Volkova
  (Cast, `consigns` to `…/counting-houses/distributor/thing/counter`,
  asks `spirit:rum-light 7`, `spirit:rum-dark 8`); `G/veshko/thing/stock.yaml`
  import lines incl. `rum-dark 12`, `rum-light 18`;
  `G/veshko/location/distillery.yaml` props `works-board`, `racking`,
  the stock; **no still, no tun**. Hollis: `G/hollis/thing/stock.yaml`
  imports `/trade/distilling/thing/hollis-cane 8`, `old-hollis 8`.
- Distilling: `C/trade-distilling/src/thing/Still.ts` =
  `FractionatingMixin(BurnerMixin(LightSourceMixin(ThermalMixin(CraftedMixin(BulkableMixin(ToolMixin(Good)))))))`;
  `still.yaml` (`capabilities: [still]`, 60 L, `burnTemperatureK 358`,
  `lit: false`, a fuel reserve). `recipes/wash-mash.yaml` (grist 4 L +
  water 16 L on `mash-tun` → `distillers-wort` in a `wash-bucket`,
  residue spent-grain). `idea/maturation/wash.yaml` (`inputCategory:
  distillers-wort` → material `wash`). `idea/fractionation/wash.yaml`
  (`inputCategory: wash`, `requiresHeatK 351`, product `new-make`,
  residue `stillage`, foreshots/heads/hearts/tails). ⚠ **One matcher per
  tag per kind** (fractionation.md l.323/370; a content test scans the
  clash): a wort tag and a wash tag must differ, and two schedules may
  not share an input tag. `rum-dark.yaml` / `rum-light.yaml` are
  materials only (tags `…spirit, rum, dark-rum|light-rum`).
- The pantry: `G/pantry/thing/stock.yaml` import line
  `/trade/cooking/thing/sugar-sack, par: 6`; `G/pantry/agent/hand.yaml`
  Rufus Penhallow `consigns` with `ask: {pantry:sugar: 8, …}`.
- The rubber works as the venue precedent: `G/rubber-works.yaml`
  (`CartesianZone`, `cellSize 3`), `G/rubber-works/structure.yaml`
  (`Structure`, `extent`, `entrance`, `storeys`),
  `location/ground/works/floor.yaml` (`SingletonCartesianLocation`,
  `enclosure:`/`roof:`, `ambientSource: sky`, `props:`), the yard exit at
  `G/yard.yaml` l.60–63 (`west → …/rubber-works/location/ground/works/floor`).
  `C/trade-rubber/` = `pack.yaml` (`root: /trade/rubber`, `requires.title`
  holder `{organization: /compact/trade}`), `package.json`
  (`@saxonberg/content-trade-rubber`), `tsconfig.json`, `vitest.config.ts`
  (`callSecPlugin()`), `content/`, `src/__tests__/`. Registration: root
  `package.json` workspace dep; `C/terminus/package.json` dep; the count
  in `M/platform/idea/api/__tests__/PackLogic.discover.test.ts` l.120
  (**64** today) + order claims; `pnpm install`.

### Employment: the unpaid hand

- `M/platform/idea/Business.ts` l.252–277 `payrollArrears: PayrollArrear[]`
  (persistent) with `getPayrollArrears`, `addPayrollArrear`,
  `settlePayrollArrears(workerKey, amount)`; **no per-worker read**.
- `M/platform/idea/api/EmploymentLogic.ts` — `payHouseWageImpl` (l.1201)
  pays arrears first, tries a rung-2 `ContractApi.issueLoan`, else
  `refuseWage` (l.1260: `addPayrollArrear({workerKey, amountMinor, at:
  now})`, tells the proprietor **only if an Avatar**; the worker is told
  nothing). `settleShiftWageImpl` (l.1328) → `payHouseWageImpl`, warns on
  `no-account` only. The roster tick: `runTick` (l.1629, hourly via
  `installRosterSchedule`) → `tickBusiness` (l.1663) rounds assignees;
  `TERMINAL.includes(emp.status) → continue`; at on→off it fires
  `void settleShiftWageImpl(business, assignee, emp, nowRaw)` then
  `business.endShift(employed)` (l.1760–1770). `endEmploymentImpl`
  (l.612) flips status via `Organization.endEmployment` or
  `_setEmploymentStatus`, unlinks the house account, **says nothing**.
  `quit` (l.1872) is `endEmploymentImpl(actor, org, 'quit')`.
- `M/lib/employment/Employed.ts` — `quitJob(orgPath)` (l.536) forwards to
  the logic; `getEmployments` / `getEmployment` / `getActiveEmployment`
  (l.400–420); `_setEmploymentStatus` gated `ByEmployingOrganization`.
  `M/lib/employment/Employment.ts` `EXITED_STATUSES = ['quit','fired','vacated']`.
- `M/lib/employment/Organization.ts` l.732 `openingsFor(key)` =
  `headcount − holders` — **zero when the Position authors no
  `headcount`**; `openings()` feeds the help-wanted sign.
- Dials: `M/lib/config/AppSettings.ts` (`AppSettingKeys`, e.g.
  `employmentAbsenceVacatesAfterDays: "employment.absenceVacatesAfterDays"`
  l.399), seeded from `C/platform/content/settings/*.yaml`
  (`treasury.yaml` carries the `employment.*` keys).
- Brains: the one deliberation beat (`trigger: candidate`) with
  `static kind / summary / discipline / claims / urgency()` — see
  `C/trade-haulage/src/behavior/hauls.ts` (every act a literal verb
  through `host.forceCommand(...)`, bounded loops, home re-taken in
  `finally`) and `M/lib/behavior/restocks.ts` (par sheet → `job post`).

### The sea, the ship, the hold, the crew

- `C/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml` origin
  `42.000 N, −8.470`; nodes under `greywater/`: `the-pool` (place →
  `/world/terminus/estuary/pool`), `gannet-rock` (`kind: passage, passage:
  areal`, destination `/world/terminus/gannet-rock/landing`, `focus {rho:
  33111, theta: 52.8, radius: 1852}` — **rho in metres, theta a
  bearing**), `open-sea`, `the-roads`, `bar`; bands `channel`,
  `the-westerlies`, `the-haar`, `the-race`. `world-seed/package.json`
  depends on energy, ground, platform, trade-quarrying, transport, water
  (not terminus).
- `M/platform/idea/ExpanseNode.ts` — `destination` authorable; arrival
  inside `radius` else `expanse.arrivalNm`; chart position = origin +
  focus via `GeoPosition.atFocus`.
- `M/lib/expanse/GeoPosition.ts` l.28 `const NM_PER_DEGREE = 60`, used at
  l.97–98, 118–121, 146–148 (plane sailing). `M/lib/expanse/Expanse.ts`
  l.425–433 `sightRangeNm = 1.17 × (√h_obs_ft + √h_tgt_ft)`.
- Gravity: `C/base-library/content/stuff/idea/biome/universe.yaml` l.23
  `_defaultGravity: {value: 9.81, unit: "m/s²"}` (also on
  `indoor/baseline.yaml`, `rejection/…/underground/upper-workings.yaml`);
  read as `BiomeApi.getRootBiome().getDefaultGravity()` by
  `C/water/src/thing/{Conduit,ControlStructure,StorageNode}.ts`. **The
  literal `9.81` survives at** `M/platform/idea/api/MagicLogic.ts:571`,
  `M/lib/pump/Pumping.ts:80` (`STANDARD_GRAVITY`),
  `C/water/src/idea/reading/PowerReading.ts:276`,
  `C/water/src/idea/WaterExpanse.ts:54`. (Tests excluded.)
- The Hesper: `C/terminus/content/world/terminus/hesper/structure.yaml`
  (`/platform/idea/Ship` = `PersistableMixin(VoyagingMixin(EngagedMixin(PositionedMixin(Structure))))`,
  `speedKn 6`, `house …/idea/outfit`); `deck.yaml` (`/platform/location/Shore`,
  `cast: [lookout]`, exit `ashore` kind `/platform/idea/exits/ashore`
  destination `/world/terminus/estuary/estuary-mouth`, `waters: {sea:
  greywater}`); **`hold.yaml` is a `SingletonCartesianLocation` ("Not
  persistable")** with `props:` two charts, an adornment lamp, exit `up`;
  `idea/outfit.yaml` (Business, PM-appointed, one position `lookout`
  wage 3 headcount 1, `rosterSlots: []`, `startsShiftOnHire: true`,
  `banksAt goodkin`, operating `deck`); `agent/lookout.yaml` Tam Rook,
  brain `/system/water/behavior/keeps-watch` (`C/water/src/behavior/keeps-watch.ts`,
  config `{}`). **The only `steer()` caller is
  `M/platform/idea/cmd/movement/CourseController.ts` l.99**
  (`craft.steer({bearingDeg, speedKn, node})` after `nodeByKeyword`).
  `M/lib/expanse/Voyage.ts` l.188–200: arrival `craft.placeAt(at)`,
  "You raise X and come up to it.", `SchedulerApi.complete(this)` — no
  hook fires ashore. `Voyaging.ts` `@hook aboard()/watchRoom()/gearAboard()`
  (l.323–350).
- Landing elsewhere already works: `C/terminus/…/gannet-rock/landing.yaml`
  authors `aboard: {kind: /platform/idea/exits/aboard, destination:
  /world/terminus/hesper/deck, oneWay: true}`; the estuary mouth
  (`C/terminus/content/world/terminus/estuary/estuary-mouth.yaml` l.49)
  the same. The Hesper lies at the **bar**; the working wharf is
  `estuary/lower-towpath.yaml`; `the-pool`'s room is `estuary/pool.yaml`.
- Persistence: `M/platform/location/FurnishableRoom.ts` =
  `Persistable → WarrenMember → Reserved → CartesianLocation`, "venue
  generic on purpose", backing singleton rows such as
  `C/terminus/…/mayfield-row/seznick-house/location/main.yaml`. No
  "Persistent"-prefixed location class exists on this branch.
  Capture at shutdown (`PersistableLogic.captureAtShutdownImpl`) and at
  the sweep; `drop`/`put` do not call `captureHostOf`.
- The wire restart precedent:
  `packages/wire/tests/assembly.dirty.wire.test.ts` l.626–650
  (`stopOwnedWorld()` … `bootOwnedWorld()`, `it.skipIf(!isOwnedTestWorld())`,
  run LAST).

### Climate, soil, plants, the wood, the deposit, a locality pack

- Latitude is a `SpatialZone` field (`M/lib/zone/SpatialZone.ts` l.75,
  `climateSite()` l.413); unauthored = 42°, sea level, continentality
  0.5 (weather.md l.151–165); precedent
  `C/hollow-mere/content/world/terminus/hollow-mere.yaml` (`CartesianZone`,
  `cellSize 20`, `address terminus/hollow-mere`, `latitude −58`,
  `continentality 1`, `elevation 300`, `climateOffsetK −12`). Dials
  `C/platform/content/settings/climate.yaml`. **No frost concept.**
- `M/lib/husbandry/Growing.ts` `satWarmth()` (l.944) =
  `ramp(ambientK, coldStopK ?? 278, warmHappyK ?? stop + 10)`; growth is
  the min of five; below `coldStopK` vigor decays and the plant dies
  (`latchDead`). The profile is on the **Plant row**:
  `C/trade-farming/content/trade/farming/thing/plant/wheat.yaml`
  (`class /platform/thing/Plant`, `_speciesPath`, `seedTemplatePath`,
  `harvestTemplatePath /trade/farming/thing/crop/wheat`, `profile:
  {coldStopK 280, warmHappyK 291, daysToStage {young 18, established
  55, mature 110}, …}`); the crop `thing/crop/wheat.yaml`
  (`/platform/thing/Crop`, `_materialPath`); the species
  `C/trade-farming/content/stuff/idea/species/plantae/…/triticum/aestivum.yaml`
  (`/platform/idea/species/Species`, `binomial`, `_parentCladePath
  /stuff/idea/species/plantae`, `_defaultMaterialPath`).
- A field row: `C/hearts-delight/…/bench-field/location/upper-bench.yaml`
  (`/trade/farming/location/Field`, `fieldName`, `_address`, `areaM2`,
  `groundSpotX/Y`, `props:` = the plant rows). `Field.onCreate`
  (`C/trade-farming/src/location/Field.ts` l.822) resolves
  `GroundCharacter.forZone(this.getZone())` and calls
  `installFieldReserves(this.groundSample(model, seed))`;
  `installSoilReserves` (l.602–666) seeds nitrogen **25 %**, organic
  matter **40 %**, structure 85 %, moisture half full — **literals**.
  `C/ground/src/idea/GroundCharacter.ts` — `GroundSample {texture,
  stoniness, drainage, slopeDeg, aspectDeg, topsoilM, nativePh}`
  (l.110–125), `GroundPin = Partial<GroundSample>`, `GroundBand`
  scales/offsets, `resolve(model, at, seed)` (l.275: pin > band >
  procedural). **No fertility value.**
- `C/trade-forestry/src/location/Wood.ts` l.86 =
  `PersistableMixin(StandMixin(SoilMixin(ReservedMixin(SingletonCartesianLocation))))`;
  row `C/rejection/…/hanging-wood/oak-clearing.yaml` (`woodName`,
  `areaM2`, `mix: [{speciesPath, name, woodMaterialPath, seedPath,
  barkPath?, standing, capacity, incrementPerYear}]`).
  `StandMixin.cut()` stamps; `standingNow` derives. `FellController`
  drops a bole, four `/trade/forestry/thing/log` and a seed.
- Sulfur: `C/rejection/…/idea/deposit/quarry-hill.yaml` l.51 `{toZ: −11,
  host: …/mineral/sulfur, wins: /trade/quarrying/thing/sulfur}` on a
  `/system/ground/idea/Deposit`; the zone `quarry.yaml` cites `deposit:`;
  worked in `quarry/pit.yaml` (`/trade/quarrying/location/OpenWorking`,
  `faceRunM`, `spoilTo`, tool props) by the platform `dig`.
- A locality pack: `C/hollow-mere/` = `pack.yaml` (`root
  /world/terminus/hollow-mere`, `requires.groups` + `requires.title
  {extent, parentParcel: /world/terminus, holder: {group}}`, `boot:` two
  producer entries with reasons), `package.json`, `tsconfig.json`,
  `vitest.config.ts`, `src/__tests__/mere.test.ts`; content: the zone
  row, `stuff/idea/Locality/hollow-mere.yaml` (`_address`, `_reach`,
  `_catchmentKm2`, `_weatherPin`), `idea/ice-company.yaml` (positions
  with `headcount`, season-bound `rosterSlots` with `station`, `offstage`,
  `call: rota`), `agent/*.yaml` (four `Cast` with `archetype`),
  `location/`, `thing/`, three `structure.yaml`. The realm root
  (`C/terminus/pack.yaml` l.30) is the parent every district names.
  `packages/server/scripts/check-boot-entries.ts` `BOOT_ENTRY_CEILING =
  85` (85 approved 2026-10-17; a rise wants the owner).
- Identity: a `Cast` is a singleton person with a dossier (`archetype`
  required by `lint:dossiers`); a `Business.appointingAuthority {kind:
  entity, path}` + `archetype: proprietor` is the named-owner precedent
  (Dave, Odell Quist); `getProprietor()` reads it.

### Other gates and shapes this plan leans on

- `M/platform/idea/cmd/inventory/EquipController.ts` l.577–592: a
  completion runs after the controller clone is destructed, so the
  completion and everything it reads are **`private static`** (issue
  #95).
- `packages/server/scripts/check-no-authored-faucet.ts` counts **money**
  faucets (`openingCapital`, `mint`), not goods — an import stock line is
  not a faucet.
- `lint:family` roster (derived from `packages/server/package.json`
  `lint:*`): the gates named in § Test & gate strategy all exist today.

---

## Plan-level decisions

**D1 — The staged boil lives on the VESSEL's batch, as data on the
profile.** Two new `MaturationProfile` row fields:
`boilingCurve: [[w, K], …]` (piecewise-linear, `w` = dissolved-solids
mass fraction) and `stages: [{key, fromW, material, minBand?,
elseMaterial?}, …]` (ordered by `fromW`). `MaturingMixin` derives the
batch's concentration on read — `solidsKg = startL × startingSugarGPerL /
1000`, `waterL = amountL − solidsKg / 1.6`, `w = solidsKg / (solidsKg +
waterL)` — and publishes two reads: `boilingCapK()` (the curve at `w`, or
`null` when the profile authors no curve) and `getStage()` (the highest
stage whose `fromW ≤ w`; when the stage authors `minBand` and the batch
band is below it, the stage resolves to `elseMaterial` — *what will not
grain is blackstrap*). A staged profile lets `f` exceed 1: the
`Math.min(1, …)` clamp and the `f ≥ 1 → finished` arm apply only to a
profile with no `stages`; a staged batch keeps evaporating through its
stages (the volume formula `startL × (1 − f·shrink)` already holds past
1) and each stage change is a `ensureInteriorMaterial(stage.material)`
swap. The **temperature cap** is the thermal side's: `Thermal`'s
`heatSourceK()` asks `MixinApi.isMaturing(self) ? self.boilingCapK() :
null` and returns `min(burnerK, cap)` — so `measure temperature pan`
rises as the pan thickens, by the physics and with no new reading.
**Burnt** stays what it is today — `damageAboveK` on the profile — now
honest because the pan can only reach it by concentrating. ⚠ The liquor
materials author **no `boilingPoint`** (the cap is the profile's, never
the material's, or `reconcileBulkPhase` flashes the pan). The `measure
density` defect is fixed in the same mixin: on an evaporative batch
`getGravity()` returns `1 + 0.52·w` (sucrose; a grain dial on the
profile is not warranted — brine never had a hydrometer reading that
anyone believed).

**D2 — The energy balance is a power limit on the evaporative rate, and
the furnace's efficiency is a Burner field.** `BurnerMixin` gains
`heatTransferFraction` (authorable, default `0.5`; an open island kettle
over a poor arch authors `0.3`, the Jamaica train derives `0.8` from its
parts). `reconcileEvaporativeWindow`, when a lit `Burner` heats the pan
(the same container-or-placement-host read `Thermal.heatSourceK` makes,
exposed as a public `Thermal.heatSource(): (Stuff & Burner) | null`),
limits the segment's rate to `burnPowerW × heatTransferFraction ×
seconds / 2.26 MJ` litres — latent heat is the lesson. Fuel burns as it
does today, so a better furnace evaporates the same pan on less fuel.
With the default 0.5 a 12 kW arch evaporates ~230 L/day, which is what
the sap pan does today at `ratePerDay 6`; the sugarbush is unchanged in
practice.

**D3 — Stage A does not depend on !380, and claying gets the general
mechanism in the kernel.** A `PercolatingMixin` (`M/lib/material/Percolating.ts`,
kernel `Mixins.Percolating`) composes on a **porous solid**: it records
the liquid poured through it (`receivePercolant(litres, nowS)`),
reconciles on read against the host's `percolationDays()`, calls the
host's `@hook onPercolated(fromReach, toReach)` with the reach advanced,
and resolves where the outflow goes — `percolatesInto()`: the host's
container when that is a Mould with `drainsInto()` (the cone on its
pot), else the host's placement host when Bulkable. The sugar loaf is its
first consumer; the lye hopper's ash adopts it later (the hopper on !380
destroys its ash at match time — that stays its own until the potash
build). **If !380 lands mid-build:** merge master into `reqs/sugar`,
resolve `Maturing.ts` (their `matchProfile` hook at l.~1476 and our
`boilingCapK`/stage reads are different regions), re-run
`pnpm test:near` + the touched packs + `lint:family`, and re-drive. If
the place-taxonomy rename rides it, name the hold's class (D13) by what
master then calls `FurnishableRoom`.

**D4 — The thread test is a `boil` reading row the sugar pack ships.**
`/trade/sugar/idea/reading/boil.yaml` (`subjectRequires: [MaturingMixin]`,
`discipline: sugar-refining`, `eyeCeiling: proficient`, `instrument:
thermometry`, `instrumentNoun: a thermometer`): `analyze boil <pan>` is
the hand — a drop between finger and thumb, in words banded by competence
(*threads / soft ball / hard ball / crack / caramel / burnt*, coarser
below `competent`); `measure boil <pan>` with a thermometer prints the
stage **and** the bracketed temperature — the better rung inside the same
channel, while `measure temperature <pan>` keeps working as the plain
thermometer. One row, both rungs, no platform file changed.

**D5 — Honey's refusal reads a declared family.** A kernel vocabulary
`M/lib/craft/IngredientFamily.ts` (`INGREDIENT_FAMILIES = { sweetener:
['sugar', 'honey', 'syrup'] }` with its validation array; `lint:closed-vocabularies`
checks every member is slotted by some recipe and the family tag by
none). At the two decline sites (`CraftingLogic.ts` l.2962/2979), on a
miss, scan the same pool for a candidate whose material carries the
family tag of the wanted category but not the category; carry it as
`near: {name, family}` on the failure (a new optional field on the
`insufficient-input` arm, not a new reason); `CraftingDecline` renders
*"This wants sugar — honey is a different sweetener."* The slate's
withdrawn `parent:` mechanism is not revived: the family is a tag the
materials already carry; the vocabulary only says which tag is a family.

**D6 — Nipping is `cut`, pounding is `mill`.** `SugarLoaf` implements
`Cuttable`: `cutPlan` requires a bound tool with capability `nipping`
(`/trade/sugar/thing/sugar-nips`, a `Tool` row) and plans one engaged
step whose **static** completion mints the loaf's bands as
`/trade/sugar/thing/sugar-piece` rows (head · middle · foot), each
stamped with its band's grade. `mill <piece>` runs
`/trade/sugar/content/recipes/pound-sugar.yaml` (item slot `category:
loaf-sugar`, `toolCapabilities: [millstone]`, `outputApplication: bulk`,
`outputTemplate /trade/cooking/thing/sugar-sack`, `outputMaterial
/trade/cooking/idea/material/sugar`); the grade carries because crafting
grades the output by its worst input. No mortar: `mill` is the ladder's
first rung and a quern is a millstone.

**D7 — Lime goes on the quarry's shelf.** One import line on
`C/rejection/…/thing/store-counter.yaml` (`/trade/quarrying/thing/quicklime,
par: 4`) — the same shelf the sugaring and drilling kits went on, for
the same reason. A limeburner seat is the potash build's. The sugar
house buys it through a `parLines` entry (`{category: liming, unit:
count, level: 6, supplier: …/rejection/idea/provisioning-business}`)
served by the refiner's `purchases: true` seat and the shipped
`restocks` brain; `lint:openings` arm 5 is satisfied only if the
provisioning business's `operatingLocations` lists the **room** the
counter stands in — verify, and add the room if it lists the fixture
alone.

**D8 — Rum is rows plus one seat and one brain.** Materials in
`trade-sugar`: `molasses` (tags `[liquid, food, molasses,
first-molasses, sweetener]` — the sweetener family, never `sugar` or
`syrup`), `blackstrap` (`[liquid, food, molasses, blackstrap]`),
`skimmings`. In `trade-distilling`, two chains under the one-matcher
rule: recipes `light-rum-wash.yaml` (`first-molasses` 4 L + water 16 L
on `mash-tun` → `light-rum-wort` in a wash bucket) and
`dark-rum-wash.yaml` (`blackstrap` → `dark-rum-wort`); profiles
`light-rum-wash.yaml` (`inputCategory: light-rum-wort` → material
`light-rum-wash`) and `dark-rum-wash.yaml`; schedules `light-rum.yaml`
(`inputCategory: light-rum-wash`, product `rum-light`) and
`dark-rum.yaml` (`…dark-rum-wash` → `rum-dark`). Veshko's distillery
props a `/trade/distilling/thing/still` and a `mash-tun`; the outfit
gains a position `distiller` (`wageRate 5`, `headcount 1`, `fulfills:
[distilling]`, `purchases: true`) held by a new Cast
(`G/veshko/agent/distiller.yaml`) whose brain
`C/trade-distilling/src/behavior/distils.ts` (config `{still, tun,
stock, washes: [{recipe, line}]}`) runs the literal verbs when a rum line
is short: buy molasses off the par sheet (the yard's `parLines` name the
sugar house as supplier), run the wash recipe, `pour` the wash into the
still, `ignite`, draw the cut into bottles, `put` them in the stock. The
two rum lines on `veshko/thing/stock.yaml` lose their import (they are
`from: {store: …}` nothing — delete them as stock lines; the distiller's
output is **placed** in the stock, which lists what it holds). Hollis:
`hollis-cane` and `old-hollis` become `from: {supplier: veshko outfit}`
lines on `/trade/distilling/thing/rum-dark` with `brandKey: hollis-cane`
/ `old-hollis` — the brand rides the line, not a cloned row; the two
thing rows stay for the brand's prose. (If `brandKey` on a supplied line
does not shelve under the brand in `Stock.offeredItems`, keep Hollis's
two rows as `from: {supplier}` lines on their own paths and have the
yard's distiller `put` one branded bottle in four — decide at W3 by
reading `Stock.ts` § brandKey; record which.)

**D9 — The pantry's sack retires; the sugar house ships `sugar-sack`.**
Delete the `sugar-sack` line from `G/pantry/thing/stock.yaml` and the
`pantry:sugar` ask from the pantry hand. The pounded sugar lands in
`/trade/cooking/thing/sugar-sack` (D6) so the Lounge's par line and the
distributor's census key keep working; the sack's `censusKey` is renamed
`sugar:loose` (nothing is legacy) and the two tests that name
`pantry:sugar` follow. The sugar house's hand `consigns` sugar sacks and
molasses casks to the cash-and-carry with `ask: {sugar:loose: 8,
sugar:molasses: 5}`. The interim raw-sugar line is an import on the
sugar house's own Stock (`/trade/sugar/thing/raw-sugar-block, par: 6`)
until W6 removes it (D14).

**D10 — The unpaid hand decides, at the moment the wage is refused.**
`Business` gains `arrearsOwedTo(workerKey): {amountMinor, oldestAtS}`
(the inline filter in `payHouseWageImpl` folds into it). `EmployedMixin`
gains `onWageRefused(business, owedMinor, oldestAtS, nowS)`: an Avatar is
**told** (*"The house could not pay you; N stands on the book."*); an NPC
compares `nowS − oldestAtS` with the dial
`employment.unpaidStandGameDays` (AppSettings key
`employmentUnpaidStandGameDays`, seeded in `settings/treasury.yaml` at
`"3"`, grain) and, past it, **quits and says so** — `quitJob(orgPath)`
then a scene to peers in its room (*"<name> throws down the apron. 'Three
days unpaid. I'm done here.'"*). The roster tick calls it: in
`tickBusiness`, the `void settleShiftWageImpl(...)` promise's result is
inspected and a refused wage (`!paid.ok && paid.reason ===
'insufficient-funds'`) hands the worker the decision — the payroll code
reports a fact, the worker decides, the controller layer is not
involved. **The vacancy derives from the roster**:
`Organization.openingsFor(key)` becomes `max(headcount − holders, roster
slots for `key` whose assignee's employment is EXITED)`, so a quit
roster seat is an opening whether or not the Position authored
`headcount` (the help-wanted sign and `look` read `openings()` already).
A `quit` record is terminal, so the tick never re-rosters them.

**D11 — Waponi Woo is a locality pack at `/world/terminus/waponi-woo`.**
The one shipped precedent (hollow-mere) roots under the realm and names
`parentParcel: /world/terminus`; the island joins the realm's title tree
the same way (one world, not islands). Zone: `latitude: 30`,
`continentality: 0`, `elevation: 40`, `climateOffsetK: 0` (frost-free by
the climate expression; nothing hard-codes "frost"). Volcanic soil: the
`GroundSample` gains two seeded fields `nativeNitrogenPct` (default 25)
and `nativeOrganicPct` (default 40) — the two literals in
`Field.installSoilReserves` move onto the sample and a pin or band may
set them; the island's `GroundCharacter` row bands the cane ground at
45 / 60. Character still prices improvement; this is what was there
before anyone worked it. The volcano is a `CartesianZone` with a
`Deposit` row (`{toZ: −1, host: …/mineral/sulfur, wins:
/trade/quarrying/thing/sulfur}` over tuff) and an `OpenWorking` room
(`the fumarole field`) with a spade prop — `dig` wins sulfur. The node
`C/world-seed/content/stuff/idea/WaterExpanse/greywater/waponi-woo.yaml`
(`kind: place`, destination the island's landing, `focus {rho: 444480,
theta: 180, radius: 1852}` — 240 nm due south in metres, which is 12° on
the ⅓-Earth chart and 4° on today's; the metres do not move) is the
cross-pack edit the crossroads back-exit precedent allows.

**D12 — The planet radius is one authored setting on the root biome.**
`Biome` gains `_planetRadiusM` (persistent, authorable; `getPlanetRadiusM()`),
`universe.yaml` authors `2124000`; `BiomeApi.planetRadiusM()` returns the
root's or Earth's 6 371 000. `GeoPosition` derives `nmPerDegree() = 2π·R
/ 360 / 1852` (lazy, Earth fallback) in place of the constant;
`Expanse.sightRangeNm` scales its coefficient by `√(R / R_earth)` (0.675
on this world). The four `9.81` literals (MagicLogic:571, Pumping:80,
PowerReading:276, WaterExpanse:54) read
`BiomeApi.getRootBiome().getDefaultGravity()` with 9.81 as the fallback,
the water pack's own pattern. Nothing changes value but the chart.

**D13 — The hold persists by re-class.** `hesper/hold.yaml` →
`class: /platform/location/FurnishableRoom` (the authored-singleton-room
precedent); keep `coords`, the indoor biome, the adornment and `props:`.
Owned goods ride the estate overlay, the company's and unowned goods the
room's record. Verify the charts are not duplicated once a record exists.

**D14 — The crew sails a shuttle, buys on terms, sells at the sugar
house's buying counter; the voyage replaces the import by removing it.**
The outfit gains a `master` seat (`wageRate 5`, `headcount 1`,
`purchases: true`) held by a new Cast whose brain
`C/water/src/behavior/sails.ts` (beside `keeps-watch`; config `{legs:
[{node, landing, store?, buy?: [lines], sellAt?: counter}]}`) does, per
beat: at a leg's node → `go ashore`, walk the authored way to the store,
`wallet use house`, `buy` the leg's lines (on terms when short — the
`stocks` brain's rung), carry aboard and `drop` in the hold, return to
the deck and `course <next node>`; at sea → nothing (the `Voyage`
engagement carries her); at the home node (`the-pool`) → carry the hold's
cargo to the sugar house's counter and `sell` it (the house's
`raw-sugar-block` and `molasses-cask` lines carry `buys: true`). The
sugar house's raw-sugar line loses its import in this wave — *the voyage
replaces it* is a row edit the voyage wave makes, and "no longer
restocks" is the import's absence. The Hesper keeps lying at the bar
for players; the crew's home leg is the pool node, whose room already
exists, and the walk pool → goods yards is the realm's streets.

**D15 — Cane inverts on a pack mixin, and inversion is grade.**
`C/trade-sugar/src/lib/Inverting.ts` (`InvertingMixin`, reconcile-on-read
like `Staling`): `invertedFraction` advances from the harvest stamp at
`k(T)` per hour (grain: 2 %/h at 300 K, halving per 10 K colder), read
by `look` (*fresh-cut / turning / inverted*). `src/thing/Cane.ts =
InvertingMixin(Crop)` derives its **grade band** down as it inverts (one
band below 25 %, two below 50 %); the crush recipe grades the juice by
its worst input, the batch's `batchInputBand` caps the boil, and the
cone's drain set yields a smaller loaf and more molasses from a lower
band (`DrainSetting.drainPerBand`, D16) — less sugar, more molasses, by
derivation. The plant: `thing/plant/cane.yaml` (`coldStopK 288`,
`warmHappyK 300`, `daysToStage {young 30, established 120, mature
330}`) — at 42° the winter kills it before maturity; at 30° it never
stops. Species `saccharum/officinarum.yaml`.

**D16 — The cone keeps its molasses: the drain set credits what it
drives out, as it drives it out.** `DrainSetting` gains `drains?:
string` (the drainings' material; absent = the pool's own) and
`drainPerBand?: number` (extra drained share per band below `fine`).
`MouldMixin.reconcileSetting` credits `drainsInto()` — the mould's
placement host when it is Bulkable with an open interior — with the
delta of the drained volume each step (`totalDrainL × Δprogress`),
carrying the pool's payload and stamping the drainings' grade one band
below the pool's. No vessel below = today's behaviour (the hoop on its
board). The curing pot is `C/trade-sugar/src/thing/CuringPot.ts =
PlacingMixin(Vat)`; `put cone on pot` is the whole placement.

**D17 — The island's boil is the same mixin on bigger iron.** The
boiling house's open kettles are `Vat` rows over a `/platform/thing/Oven`
arch (`heatTransferFraction 0.3`); the **Jamaica train** is
`C/trade-sugar/src/thing/Train.ts = AssembledMixin(Oven)` with a `bill`
(four copper kettles + a brick flue) whose `heatTransferFraction()`
override derives from parts present and sound (0.8 whole; each missing
or failed kettle −0.15). Bagasse is `src/thing/Bagasse.ts =
WaterActivityMixin(Firewood)` (the Turf twin, no pack dependency on
quarrying) over a `cane-fibre` material (`heatOfCombustion 8e6`), minted
as the crush recipe's residue at the row's authored wet moisture; `dry`
(or a day on the ground) brings it under `tooWetToCatch`. Firewood is
forestry's `log` off the island's `Wood` row — the stand thins when it
is felled, as shipped.

**D18 — The estate is a Business with a named proprietor; the
smallholders sell at its mill.** `idea/estate.yaml` (`appointingAuthority
{kind: entity, path: …/agent/owner}`, positions `cutter` (headcount 2,
wage 3), `miller` (1, wage 4), `boiler` (1, wage 5, `fulfills:
[sugar-boiling]`), `hand` (1, wage 3, `purchases: true`), season-bound
`rosterSlots` with stations, `banksAt goodkin`, `parLines` for lime and
firewood). The owner is a `Cast` (`archetype: proprietor`, a dossier that
says how she came by the land). Three pack brains in
`C/trade-sugar/src/behavior/`: `cuts` (harvests mature cane into the mill
yard; with `sellAt:` config a smallholder sells the same cut at the
estate's cane counter), `mills` (crushes what is in the yard, spreads
the bagasse), `boils` (stokes the train from the dry bagasse stack, else
the woodpile; tempers, skims, boils to the strike, pours into the
hogsheads; moves cured blocks and molasses to the estate store). The
store is a `Stock` with lines `raw-sugar-block` and `molasses-cask`
(what the brains place) and `cane` with `buys: true` (the smallholders'
and a player's cane). Two smallholder Casts each hold a `Field` row of
their own (titled parcels) and run `cuts` with `sellAt`.

**D19 — The Terminus sugar house runs on a refiner brain stepping one
act per beat.** The house (terminus rows, the rubber-works shape: a
`CartesianZone`, a `Structure`, the boiling floor, the curing house, the
store) is a Business (`idea/outfit.yaml`: `refiner` — `fulfills:
[sugar-refining]`, `purchases: true`, headcount 1 — and `hand` —
consigns) with two Casts. `C/trade-sugar/src/behavior/refines.ts`
(config `{copper, arch, cones, pot, quern, stock, nips}`) runs a state
machine over the house's vessels — dissolve a block when the copper is
empty, temper when untempered, skim, light and stoke, pour at the
strike, clay a set loaf (W4), nip a cured one, pound a piece, put the
sack in the stock, decant the pot into a cask — **one step per beat**,
every step a literal verb, bounded, home re-taken in `finally`. The
player's drive is the same verbs by hand.

---

## Host placement

| new thing | host | what composing it claims about the host's other composers |
|---|---|---|
| `MaturationProfile.boilingCurve`, `.stages` | the **profile row** (kernel Idea) | nothing until a row authors them; every shipped evaporative profile stays one-product-then-frozen |
| `Maturing.boilingCapK()`, `.getStage()`, `.getConcentration()`, the `f > 1` walk, the gravity fix | `MaturingMixin` (on the vessel — `Vat` already composes it) | a vessel with a staged profile keeps boiling past its first product; `getGravity` changes **only** for `evaporative` batches (wine and beer read as before) |
| the temperature cap | `ThermalMixin.heatSourceK()` | reads a sibling through `MixinApi.isMaturing`; `null` from a non-maturing or curveless host = today's answer, byte for byte |
| `Burner.heatTransferFraction` (+ `Thermal.heatSource()` public) | `BurnerMixin` | a field nothing reads but the evaporative window; a forge, a still, a lamp are untouched |
| `DrainSetting.drains`, `.drainPerBand`; `Mould.drainsInto()` + incremental credit | `MaturingMixin`'s sibling `MouldMixin` (the cone, the hoop) | the hoop gains whey into a pail if one is ever placed under it; on its board nothing changes |
| `PercolatingMixin` | **kernel** `lib/material/Percolating.ts`, composed by the sugar loaf only | first consumer here; the hopper's ash is a later composer — the mixin claims nothing about any shipped class |
| `IngredientFamily` vocabulary + `near` on the decline | kernel `lib/craft/` + `CraftingLogic` | one family today; a member slotted by no recipe fails the vocabulary lint |
| `Business.arrearsOwedTo`, `Employed.onWageRefused`, roster-derived `openingsFor` | `Business` / `EmployedMixin` / `OrganizationMixin` | every business and every worker — which is the requirement (*nobody works unpaid forever*); a player worker is told, never auto-quit |
| `Biome._planetRadiusM`; `GeoPosition.nmPerDegree()`; the sight coefficient; four gravity reads | `Biome` row + two expanse value objects | every chart on every expanse; Earth's value when unauthored |
| `GroundSample.nativeNitrogenPct/.nativeOrganicPct` | `GroundSample` (ground pack) read by `Field.installSoilReserves` | every field seeds from the sample instead of two literals — same numbers unless a band or pin says otherwise |
| `FurnishableRoom` for the hold | the row only | the hold persists like any venue room |
| `InvertingMixin` / `Cane` | **pack** `trade-sugar/src/lib/`, on `Crop` | only cane; a sack of wheat does not invert |
| `SugarLoaf` (`PercolatingMixin(Provision)` + `Cuttable`), `CuringPot` (`PlacingMixin(Vat)`), `Bagasse` (`WaterActivityMixin(Firewood)`), `Train` (`AssembledMixin(Oven)`), `Copper` (`Vat` + `temper`/`skim` methods + the verb statics), `BoilReading` | **pack** `trade-sugar/src/thing/` and `src/idea/reading/` | pack classes a second sugar house names by row; the kernel's `Vat`, `Oven`, `Provision` unchanged |
| `distils`, `sails`, `refines`, `cuts`, `mills`, `boils` | pack brains (`trade-distilling`, `water`, `trade-sugar` ×4) | brains are modules; they claim nothing about classes |

**The narrowing test, applied.** `onWageRefused` branches on *is this an
Avatar* — that is the person kind, not a re-narrowing of the host set
(Employed composes on both by design, and both get an answer). The
Thermal cap branches on *does the sibling answer* — the sibling's `null`
is the ordinary case. No new guard anywhere re-narrows a host set.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** on every place row; `container:` is refused by
  `lint:instanceable` (every new vessel is a prop of its room; the
  brains place what they make).
- **Locations, not rooms**: new places are `SingletonCartesianLocation`
  (and `FurnishableRoom` only for the hold, whose point is persistence).
  Every room authors `enclosure:`/`roof:` (`lint:biome-sky` counts the
  legacy flag) and sits in a zone by `coords:`.
- **Paths**: `/trade/sugar/<branch>/…` for the trade's rows and classes
  (`src/thing/`, `src/lib/`, `src/idea/reading/`, `src/idea/cmd/sugar/`,
  `src/behavior/`); `/world/terminus/waponi-woo/…` for the island;
  `/world/terminus/goods-yards/sugar-house/…` for the venue; the node in
  world-seed under the sea row; the Veshko and Hollis edits in terminus;
  the rum rows in `/trade/distilling/…`; the kernel mixin in `M/lib/material/`.
  Controllers at `src/idea/cmd/sugar/<Name>Controller.ts`, views at
  `content/trade/sugar/cmd/sugar/<verb>.yaml`.
- **Module scope declares; lifecycles initialize** — the brains export
  `export const brain = class { … }` only; no module-scope statements.
- **Import boundary**: packs import the kernel by package specifier only
  (`@saxonberg/server/mud/…`); the `trade-sugar` pack depends on
  `trade-cooking` (the sack, `dry`), `trade-milling` (the quern/edge
  runner class), `trade-forestry` (logs), `trade-quarrying` (quicklime,
  sulfur), `trade-farming` (Field, Plant rows' shapes), `ground`,
  `trade-shopkeeping` (Stock). `waponi-woo` depends on `trade-sugar`,
  `terminus`, `water`, `trade-forestry`, `trade-farming`,
  `trade-quarrying`, `trade-shopkeeping`, `ground`. **No Api, no logic
  singleton, no free helper in any pack.**
- **Verbs on objects**: `copper.temper(by, lime)`, `copper.skim(by, into)`,
  `loaf.clay(by, clayLump)`, `loaf.cutPlan(req)`, `worker.onWageRefused(…)`
  — controllers bind and call; `lint:object-verbs` stays at zero.
- **Affordances are statics**: `static commandContributions` on `Copper`
  (temper, skim) and `SugarLoaf` (clay); never a row's
  `commandContributions:`.
- **Completion is static** (issue #95): `ClayController`, the loaf's
  `cutPlan.onComplete`, `TemperController`, `SkimController` keep every
  completion and the reads it makes `private static`.
- **A person keys on `getIdentityPath()`** — the worker key in
  `arrearsOwedTo` and the roster assignee are identity paths, as
  `payHouseWageImpl` already uses them.
- **No new Mongo collection, no migration.** The hold's record is a
  `holder_snapshots` row; a renamed census key means a dropped dev DB.
- **Gates this build must satisfy**: `lint:family` in full; the ones with
  something to say are named in § Test & gate strategy.

---

## Waves

### W0 — the unpaid hand walks off

**Goal.** AC 13; drive step 1. Decisions D10.

**Files.**
- `M/platform/idea/Business.ts` — `arrearsOwedTo(workerKey)`.
- `M/platform/idea/api/EmploymentLogic.ts` — `payHouseWageImpl` uses it;
  `tickBusiness` awaits the settle result inside the existing `void …`
  promise and calls `employed.onWageRefused(...)` on refusal.
- `M/lib/employment/Employed.ts` — `onWageRefused(business, owedMinor,
  oldestAtS, nowS)` on the mixin + the `Employed` interface; the NPC
  branch quits and speaks (`MessageApi.scene(self).topic('act.deed')
  .toPeers(…)` + a `say`-shaped line through `forceCommand` when the
  host is a `CommandGiver`).
- `M/lib/employment/Organization.ts` — `openingsFor` counts exited
  roster assignees.
- `M/lib/config/AppSettings.ts` — `employmentUnpaidStandGameDays`;
  `C/platform/content/settings/treasury.yaml` — the seed `"3"`.
- Tests beside each: `Business.test.ts` (arrears by worker),
  `EmploymentLogic` tick test (a refused shift wage past the stand → the
  record is `quit`, the scene was sent, `openings()` shows the seat),
  `Organization.test.ts` (roster-derived opening).
- `docs/subsystems/employment.md` — a short section (the finding was
  unfree-labour's; the mechanism is here).

**Acceptance.** `pnpm test:near` green; `lint:family` green; drive
step 1 written in `packages/wire/tests/sugar.dirty.wire.test.ts`
(wizard drains an NPC-run house's operating account, sets the dial to
`"0.5"` via `config`, advances the clock two shifts, reads the quit line
in the room and the help-wanted sign on `look`). Commit
`build(sugar W0): the unpaid hand walks off and the roster shows the seat`.

### W1 — the boil, the thread test, the sugar house (Stage A)

**Goal.** AC 2, 3; drive steps 2–5 and 12. Decisions D1, D2, D4, D7,
D19 (the house's rows; the refiner brain's first steps: dissolve ·
temper · skim · stoke · pour-at-strike — the rest lands in W2/W4).

**Kernel files.**
- `M/lib/maturation/MaturationProfile.ts` — `boilingCurve`, `stages`
  (+ `fieldMeta`, getters/setters with validation: `stages` sorted by
  `fromW` in `(0, 1]`, materials non-empty, `minBand` a known band).
- `M/lib/maturation/Maturing.ts` — `getConcentration()`, `boilingCapK()`,
  `getStage()`, the staged `f` walk and stage swaps in
  `reconcileEvaporativeWindow` and the `finished` branch, the power
  limit (D2), the evaporative `getGravity()`.
- `M/lib/thermal/Thermal.ts` — public `heatSource()`; `heatSourceK()`
  caps by `boilingCapK()`.
- `M/lib/fire/Burner.ts` — `heatTransferFraction` field + `fieldMeta` +
  accessor pair.
- `M/platform/idea/reading/DensityReading.ts` — unchanged (it reads
  `getGravity()`); a test proves the evaporative read now rises.
- Tests: `Maturing.evaporative.test.ts` (a pan over a lit burner stub:
  temperature climbs with `w`, stage order syrup → strike → caramel →
  burnt, rain reverses, a curveless profile is byte-identical to the
  old run), `Thermal` cap test, `Burner` field test.

**Pack `trade-sugar` (new).** `pack.yaml` (`root: /trade/sugar`, title
holder `{organization: /compact/trade}`), `package.json`
(`@saxonberg/content-trade-sugar`, deps above), `tsconfig.json`,
`vitest.config.ts`, `src/__tests__/rows.test.ts` (every row resolves;
one matcher per tag; the reading row warms). Content:
- `content/trade/sugar/idea/Discipline/sugar-refining.yaml`,
  `sugar-boiling.yaml` (the island's; the same discipline family —
  check `docs/subsystems/advancement.md` for the Discipline row shape).
- materials `content/trade/sugar/idea/material/`: `raw-sugar` (solid,
  food, raw-sugar), `raw-liquor` (liquid, food, raw-liquor; sugar ~600
  g/L; **no boilingPoint**), `cane-syrup` (liquid, food, syrup, treacle,
  sweetener), `strike` (the massecuite; `drainSetting {days: 4,
  becomes: loaf-sugar, drains: …/molasses, moisture: {unloaded: 0.04,
  loaded: 0.04}, loadRef: 1, drainPerBand: 0.08}`), `caramel`,
  `burnt-sugar`, `loaf-sugar` (solid, food, sugar, loaf-sugar,
  sweetener), `molasses`, `blackstrap`, `skimmings`, `cane-fibre`,
  `cane-juice` (W5 uses them; author now, they are rows).
- profiles `content/trade/sugar/idea/maturation/raw-liquor.yaml`
  (`evaporative`, `inputCategory: raw-liquor`, `happyK 370`,
  `damageAboveK 450`, `ratePerDay 6`, `productFraction 0.55` (the
  syrup), `productMaterial cane-syrup`, `boilingCurve: [[0,373],[0.5,375],[0.7,378],[0.8,383],[0.85,387],[0.9,395],[0.95,405],[0.98,423],[0.99,433],[1,443]]`,
  `stages: [{key: syrup, fromW: 0.68, material: cane-syrup}, {key:
  strike, fromW: 0.90, material: strike, minBand: fair, elseMaterial:
  blackstrap}, {key: caramel, fromW: 0.985, material: caramel}, {key:
  burnt, fromW: 0.995, material: burnt-sugar}]`), `molasses.yaml`
  (`inputCategory: first-molasses`, the same stages), `blackstrap` has
  no profile (it is the end).
- `content/trade/sugar/idea/reading/boil.yaml` +
  `src/idea/reading/BoilReading.ts` (D4).
- things: `thing/copper.yaml` (class `/trade/sugar/thing/Copper`, 120 L,
  open, steel), `thing/arch.yaml` (`/platform/thing/Oven`,
  `burnTemperatureK 470`, `maxBurnPowerW 20000`, `heatTransferFraction
  0.5`, `fuelCapacityKg 120`, `lit: false`), `thing/raw-sugar-block.yaml`
  (`/platform/thing/Provision`, 20 kg), `thing/skimming-pail.yaml`,
  `thing/thermometer` — **not** a new row: the platform's thermometer
  (`measure temperature` sells it already; find its row and prop one in
  the house).
- `src/thing/Copper.ts` (`extends Vat`; `temper(by, lime)` consumes the
  lump and records `limeKgPerL` on the batch; `skim(by, into)` moves 5 %
  of the batch as `skimmings` into the pail and marks `skimmed`;
  `getStage()`'s strike resolves to `elseMaterial` when untempered;
  unskimmed caps the batch band at `fair`; `static commandContributions`
  for `temper` and `skim`), `src/idea/cmd/sugar/TemperController.ts`,
  `SkimController.ts`, views `content/trade/sugar/cmd/sugar/temper.yaml`
  (`temper <copper> with <lime>`: target `requires: [MaturingMixin]`,
  lime `requires: [TangibleMixin]`), `skim.yaml` (`skim <copper> into
  <pail>`).
- recipe `content/recipes/dissolve.yaml` (item slot `category:
  raw-sugar` ×1 + bulk `water` 10 L → `raw-liquor` bulk into the copper;
  the by-hand recipe path per crafting.md § the manual build — find the
  verb the fermentation wire test uses for `wash-mash` and use that).
- `src/behavior/refines.ts` (D19) — the first five steps.

**Terminus rows** (`G/sugar-house.yaml` zone, `G/sugar-house/structure.yaml`,
`location/ground/boiling-floor.yaml` (props: copper, arch, pail, a
quern `/trade/milling/thing/quern`, the thermometer, a works board),
`location/ground/curing-house.yaml` (W2 props), `location/ground/store.yaml`
(the Stock), `thing/stock.yaml` (`businessPath …/idea/outfit`; lines
`raw-sugar-block par 6` import; `sugar-sack`, `molasses-cask`), `idea/outfit.yaml`
(D19; `parLines` lime from Rejection, `banksAt goodkin`, operating the
three rooms **and** the stock), `agent/refiner.yaml` (Cast, `archetype:
artisan` or whatever the dossier vocabulary offers — check
`lint:dossiers`' list), `agent/hand.yaml` (Cast, `consigns`), the yard
exit in `G/yard.yaml`). `C/rejection/…/thing/store-counter.yaml` gains
the quicklime line (D7). `C/trade-forestry/…/maturation/maple-sap.yaml`
gains a `boilingCurve` and `stages` (`syrup` at `productFraction`,
`strike` → `maple-strike` with `drainSetting` → `maple-sugar`;
`caramel`, `burnt`), `evaporator.yaml` `burnTemperatureK` 390 → 470, the
sugarbush gains a `/trade/forestry/thing/sugar-mould` prop (a
`/platform/thing/Mould` row, `castTemplate …/thing/maple-sugar`) and the
two new forestry materials/things. **Registration**: root
`package.json`, `C/terminus/package.json`, `PackLogic.discover.test.ts`
64 → 65 with an order claim (`trade-sugar` after `trade-milling`),
`pnpm install`.

**Acceptance.** Drive steps 2–5 and 12 pass on a fresh world: a block
dissolved, tempered with lime bought at Rejection, skimmed; the arch lit;
`measure temperature copper` rises across three reads; `analyze boil
copper` answers in words; one batch stopped at syrup reads *treacle*,
one poured at the strike (into a plain vessel for now) reads *strike*,
one pushed on reads *caramel* then *burnt*; at the sugarbush, sap boiled
past syrup reads a maple strike. Commit `build(sugar W1): the staged
boil, the thread test, the Terminus sugar house`.

### W2 — the cone, the grades, the sack, the rum's feedstock

**Goal.** AC 1, 4, 5 (the muscovado half), 6, 7; drive steps 6, 8, 9,
10. Decisions D5, D6, D9, D16.

**Kernel files.** `M/lib/material/Material.ts` (`DrainSetting.drains`,
`.drainPerBand` + validation), `M/lib/mould/Mould.ts` (`drainsInto()`,
incremental crediting with payload + band − 1), `M/lib/craft/IngredientFamily.ts`
(new vocabulary), `M/platform/idea/api/CraftingLogic.ts` (the near-miss
scan at l.2962/2979), `M/lib/craft/CraftingDecline.ts` (the line),
`lint:closed-vocabularies` gains the family check. Tests: `Mould.drain.test.ts`
(a cone on a curing pot: the pot's interior rises as the set progresses
and the loaf is cast with the complementary mass), `CraftingLogic.near.test.ts`
(honey for sugar → `near`), `CraftingDecline` rendering.

**Pack files.** `src/thing/SugarLoaf.ts` (`Provision` + `Cuttable`;
bands `[head, middle, foot]` each a grade derived from the loaf's base
band and, from W4, the claying reach; prose by band — *white · pale ·
brown · muscovado*; `cutPlan` with `nipping`), `src/thing/CuringPot.ts`
(`PlacingMixin(Vat)`), rows `thing/cone.yaml` (`/platform/thing/Mould`,
`interiorCapacity 8`, `castTemplate /trade/sugar/thing/sugar-loaf`,
`reusable: true`, `_materialPath …/ceramic/earthenware`, `placements:
[on]` — a stocked earthenware row until pottery ships), `thing/sugar-loaf.yaml`
(class `SugarLoaf`, `_materialPath loaf-sugar`), `thing/curing-pot.yaml`,
`thing/sugar-piece.yaml` (`/platform/thing/Provision`, `_materialPath
loaf-sugar`), `thing/sugar-nips.yaml` (a `/platform/thing/Tool`,
`capabilities: [nipping]`), `thing/molasses-cask.yaml` (a cask row, the
coopering kind if one is shipped, else a `Vat` with `closure:
liquidTight`), recipe `recipes/pound-sugar.yaml` (D6). `refines.ts` gains
pour-into-cone · decant-the-pot · nip · pound · put-in-stock.
`C/trade-cooking/…/thing/sugar-sack.yaml` `censusKey: sugar:loose`;
`G/pantry/thing/stock.yaml` and `pantry/agent/hand.yaml` lose the sugar
line/ask; the sugar house's hand `consigns` config (`ask: {sugar:loose:
8, sugar:molasses: 5}`); the two tests naming `pantry:sugar`.

**Acceptance.** Drive 6: pour the strike into a cone standing on the
pot; advance four days; `look` shows the loaf in the cone and molasses in
the pot; `get` the pot. Drive 8: pour the pot into the copper; boil to
the strike; a second loaf reads one band darker; again; the fourth boil
reads *blackstrap* and never grains. Drive 9: `cut loaf with nips` →
three pieces; `mill piece` at the quern → a sugar sack graded as the
piece. Drive 10: `order mojito` at the Lounge after the distributor has
sugar from the house (`house stock` on the Lounge shows the sugar line
supplied); honey offered to `simple-syrup` refuses with the family
sentence. The pantry's row has no sugar line. Commit `build(sugar W2):
the cone keeps its molasses; one loaf, three grades; the sack is made,
not conjured`.

### W3 — the rum has a feedstock

**Goal.** AC 8; drive step 11. Decision D8.

**Files.** `C/trade-distilling/content/recipes/{light,dark}-rum-wash.yaml`,
`…/idea/material/{light,dark}-rum-wort.yaml`, `{light,dark}-rum-wash.yaml`,
`…/idea/maturation/{light,dark}-rum-wash.yaml`,
`…/idea/fractionation/{light,dark}-rum.yaml` (copy `wash.yaml`'s
fractions and toxins; `aromaticCarry` higher for dark);
`C/trade-distilling/src/behavior/distils.ts`; `C/trade-distilling/src/__tests__/rum.test.ts`
(one matcher per tag; both schedules warm). `G/veshko/location/distillery.yaml`
props a still, a mash tun, a wash bucket, bottles; `G/veshko/idea/outfit.yaml`
(the `distiller` seat, `parLines` for `first-molasses` and `blackstrap`
from the sugar house's outfit, operating the distillery), `G/veshko/agent/distiller.yaml`
(Cast, `archetype: artisan`, competence distilling `competent`, brain
`distils`), `G/veshko/thing/stock.yaml` (the two rum import lines
removed), `G/hollis/thing/stock.yaml` (D8's brand decision, recorded in
the row's comment), `G/veshko/agent/hand.yaml` asks unchanged.

**Acceptance.** Drive 11: molasses bought at the sugar house, the wash
recipe run in the tun, poured into the still, lit, the cut drawn into a
bottle that reads *rum*; after a day with the distiller on shift the
yard's stock holds rum bottles whose maker is the distiller and the
stock row carries no import for rum. Commit `build(sugar W3): Veshko's
still — rum from molasses, light from first, dark from blackstrap`.

### W4 — claying (Stage A's last)

**Goal.** AC 5 (the clayed half); drive step 7. Decision D3.

**Files.** `M/lib/material/Percolating.ts` + `Mixins.Percolating` in
`M/lib/mixin.ts` + `MixinApi.isPercolating`; `Percolating.test.ts`;
`SugarLoaf` composes it: `percolationDays()` = 10 (grain, a row field
`clayDays` on the loaf row), `onPercolated(from, to)` credits
`percolatesInto()` with molasses proportional to the reach (the loaf
loses that mass) and the head/middle/foot bands lift as the reach
crosses ⅓ and ⅔; `clay(by, clayLump)` consumes a
`/trade/quarrying/thing/clay` lump and starts the percolation with its
authored water (`clayWaterL` on the loaf row); `static
commandContributions` for `clay`; `src/idea/cmd/sugar/ClayController.ts`
+ `content/trade/sugar/cmd/sugar/clay.yaml` (`clay <loaf> with <clay>`;
target `requires: [PercolatingMixin]`); the curing house props a
`/trade/quarrying/thing/clay` or the house's `parLines` buys it from
Rejection; `refines.ts` gains the clay step; `docs/subsystems/mould.md`
gets the percolation section (and a one-line pointer in the cleanliness
slate that the hopper's adoption is open).

**Acceptance.** Drive 7: `clay loaf with clay`; advance ten days; `look
loaf` reads a white head and a brown foot; `cut` gives three pieces of
three grades; a second loaf left unclayed reads *muscovado* throughout.
Commit `build(sugar W4): claying — percolation through a loaf that
survives it`.

### W5 — Waponi Woo (Stage B)

**Goal.** AC 9, 10, 11; drive steps 13–18 (13 by a player sailing
`course waponi woo`). Decisions D11, D15, D17, D18.

**Pack `waponi-woo` (new)** at `C/waponi-woo/` (hollow-mere's four
files + `src/__tests__/island.test.ts`). Content under
`content/world/terminus/waponi-woo/`: the zone row
`…/waponi-woo.yaml` (D11 climate keys, `groundCharacter:` the island's
row, `cellSize 20`), `stuff/idea/Locality/waponi-woo.yaml` (`_address
terminus/waponi-woo`, `_reach: null` — off the watershed; confirm
`lint:water-citations` accepts a reach-less locality, else cite a small
`Watercourse` row for the island's stream), `stuff/idea/GroundCharacter/waponi-woo.yaml`
(a band over the cane ground: `nitrogenPct 45`, `organicPct 60`,
`drainageScale 1.2`), `idea/deposit/vent.yaml`, `location/landing.yaml`
(a `/platform/location/Shore` with `waters: {sea: greywater}` and the
`aboard` exit to the Hesper's deck, `oneWay: true`), `location/track.yaml`,
`location/cane-piece.yaml` ×2 (estate `Field` rows, `areaM2 8000`,
props the cane plants), `location/mill-yard.yaml` (props the edge
runner, a juice tub, the drying ground is the yard itself), the
boiling house as a structure (`boiling-house/structure.yaml`,
`location/train-floor.yaml` — the train, the kettle arch + two kettles,
the bagasse stack (a `Stockpile`), the woodpile, hogsheads on curing
pots), `location/store.yaml` (the estate Stock), `location/wood.yaml`
(a `/trade/forestry/location/Wood`, `mix:` one tropical hardwood species
row the pack ships under `stuff/idea/species/…`), `location/volcano.yaml`
(a scenery zone room with the view), `location/fumaroles.yaml`
(`/trade/quarrying/location/OpenWorking`, props a spade),
`smallholding-a/` and `-b/` (a `Field` each, a hut), `idea/estate.yaml`
(D18), `agent/owner.yaml`, `cutter-1.yaml`, `cutter-2.yaml`,
`miller.yaml`, `boiler.yaml`, `hand.yaml`, `smallholder-a.yaml`,
`smallholder-b.yaml` (all `Cast` with dossiers). `pack.yaml`: groups
(`waponi-woo`), titles (the island under `/world/terminus`; the estate
and the two smallholdings as parcels with their holders), `boot:` the
estate business + the train floor (producer; **ceiling 85 → 87 — a
caller audit in the commit message and the owner's approval at MR**).
`world-seed/…/greywater/waponi-woo.yaml` (the node) + a corridor band
`the-southern-run.yaml` (`endpoints: [the-roads, waponi-woo]`, a lean on
the prevailing wind) — optional; bands give character, never
connectivity.

**Pack `trade-sugar` additions.** `stuff/idea/species/plantae/…/saccharum/officinarum.yaml`,
`thing/plant/cane.yaml`, `thing/crop/cane.yaml` (class `Cane`),
`thing/seed/cane-sett.yaml`, `src/lib/Inverting.ts`, `src/thing/Cane.ts`,
`src/thing/Bagasse.ts`, `src/thing/Train.ts` + `thing/jamaica-train.yaml`
(the `bill`: `kettle` ×4 `/trade/sugar/thing/copper-kettle`, `flue` ×1
`/trade/sugar/thing/flue-brickwork`; joints `set`), `thing/kettle-arch.yaml`
(`Oven`, `heatTransferFraction 0.3`), `thing/kettle.yaml` (a `Vat`, 200 L),
`thing/edge-runner.yaml` (class `/trade/milling/thing/GristMill`,
`{kind: millstone}`, mass 900), `thing/juice-tub.yaml`, `thing/hogshead.yaml`
(a `Mould` row, `castTemplate …/thing/raw-sugar-block`), `thing/bagasse.yaml`
(wet moisture, the `fuel` reserve like turf), recipe `recipes/crush-cane.yaml`
(item slot `category: cane` ×6, `millstone`, bulk `cane-juice` into the
tub, `outputPortionL 12`, `outputResidue: {template: bagasse, count: 2}`),
profile `idea/maturation/cane-juice.yaml` (`inputCategory: cane-juice`,
sugar 150 g/L, `productFraction 0.2`, the same curve and stages),
`src/behavior/{cuts,mills,boils}.ts`, `src/__tests__/{inverting,train}.test.ts`.
`C/ground/src/idea/GroundCharacter.ts` (`nativeNitrogenPct`,
`nativeOrganicPct` on the sample, `GroundBand.nitrogenPct?/organicPct?`
as overrides), `C/trade-farming/src/location/Field.ts`
`installSoilReserves` reads them (+ test). **Registration**: root
`package.json`, `PackLogic.discover.test.ts` 65 → 66 with order claims
(`waponi-woo` after `trade-sugar`, `terminus`, `water`), `pnpm install`,
`docs/subsystems/content-packs.md` pack table rows for both packs.

**Acceptance.** Drive 13: `course waponi woo` from the bar, advance the
clock (the Voyage runs at 6 kn; ~40 game hours on today's chart), *You
raise Waponi Woo*; `go ashore`. Drive 14: `feel` reads warm; `analyze
soil` on the cane piece reads rich; `look volcano`; `dig` at the
fumaroles wins sulfur. Drive 15: `harvest cane`, `mill cane` at the edge
runner → juice in the tub + two bagasse; a second cut left a day reads
*inverted* and its juice grades lower. Drive 16: the bagasse refuses to
light wet, lights dry; the train boils the tub's juice on bagasse; the
kettle arch needs logs to finish the same volume; `look` at the wood
after felling reads fewer standing. Drive 17: a smallholder's cane
`sell`s at the estate store's counter. Drive 18: `talk owner`; after a
shift the hands' accounts show a wage. Commit `build(sugar W5): Waponi
Woo — cane, the crush, inversion, the train and the forest, the estate
and the smallholders`.

### W6 — the voyage, the hold, the smaller world

**Goal.** AC 12; drive steps 19–20. Decisions D12, D13, D14.

**Files.** `M/platform/idea/Biome.ts` (`_planetRadiusM`), `M/api/biome.ts`
(`planetRadiusM()`), `C/base-library/…/biome/universe.yaml`
(`_planetRadiusM: 2124000`), `M/lib/expanse/GeoPosition.ts`
(`nmPerDegree()`), `M/lib/expanse/Expanse.ts` (the coefficient), the four
gravity literals; tests pinning 60 nm/° (`GeoPosition.test.ts`,
`Expanse` sight tests) rewritten against the setting with Earth as a
fixture; `docs/subsystems/expanse.md` and `biome.md` notes. `hesper/hold.yaml`
re-classed (D13) + a wire checkpoint. `hesper/idea/outfit.yaml` (the
`master` seat, `parLines` none — the crew buys per leg), `hesper/agent/master.yaml`
(Cast, brain `sails` with the two-leg config: Waponi Woo's landing →
the estate store, buy `raw-sugar-block` ×6 and `molasses-cask` ×2; the
pool → the sugar house's counter, sell), `C/water/src/behavior/sails.ts`
+ a unit test with a stub craft; `G/sugar-house/thing/stock.yaml` — the
raw-sugar import removed, `buys: true` on `raw-sugar-block` and
`molasses-cask`. `C/world-seed/…/greywater.yaml` comment: the chart
re-derives from the planet. Boot: the Hesper's company is a Business the
ship's `house` names — confirm it is live unobserved (the ship persists
and the roster tick walks `allBusinesses()`); if not, one more boot
entry (ceiling 87 → 88, same audit).

**Acceptance.** Drive 19: load six blocks and two casks into the hold;
restart the world (the assembly precedent, run **last**); the hold holds
them. Drive 20: with the master on shift, advance the clock through a
round trip; the sugar house's stock holds blocks whose `madeFrom` traces
to the estate; the row has no import; `measure` nothing — the
checkpoint reads the stock's lines and the chart: `GeoPosition` places
Waponi Woo 12° south of the origin. Commit `build(sugar W6): the voyage
— the hold persists, the crew sails the sugar run, the planet is a third
of Earth`.

### Then: the drive, the suite, the MR

Run `packages/wire/tests/sugar.dirty.wire.test.ts` end to end on a
freshly dropped world (`WIRE_PORT=2014`), append the record below, run
`pnpm test` **once**, push, open the MR with the ceiling audits in its
description.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| temper / skim | `trade-sugar` views `cmd/sugar/temper.yaml`, `skim.yaml` | `Copper.commandContributions` (static) | the copper row names the class | the copper is a prop of a booted room (the house's boot entry) | `target requires: [MaturingMixin]`; lime `requires: [TangibleMixin]`; pail `requires: [BulkableMixin]` |
| the thread test | platform `analyze` / `measure` | none needed — flat over a channel | `idea/reading/boil.yaml` on the `/idea/reading/` infix, class resolves into the pack's `src/` | `ReadingCatalogue` warms lazily | `subjectRequires: [MaturingMixin]`; ⚠ a required arg with no default fails closed and silent — copy `ice.yaml`'s shape exactly |
| the staged boil | none (`pour`, `ignite`, `stoke` are the platform's) | — | `boilingCurve` + `stages` on the profile row; **no `boilingPoint` on the liquor materials** | `MaturationProfileCatalogue` warms by the `/idea/maturation/` infix across pack roots | — |
| the cone's drainings | `put cone on pot`, `pour` | `Placing` on the pot (pack class) | `drainSetting.drains` on the strike material; `castTemplate` on the cone | — | `put … on` binds a Placing host |
| nip | platform `cut` | `Cuttable` on `SugarLoaf` (interface, no static) | the nips row's `capabilities: [nipping]` | — | `cut.yaml` binds `tools requires: [ToolMixin]`; the plan refuses without nips |
| pound | milling's `mill` | `ComminutingMixin` on the quern row (shipped) | `recipes/pound-sugar.yaml` with `toolCapabilities: [millstone]` and an item slot on `loaf-sugar` | recipes load from `content/recipes/` | the mill binds `reachable:[mixin.ComminutingMixin]` |
| clay | `cmd/sugar/clay.yaml` | `SugarLoaf.commandContributions` | the loaf row's `clayDays`, `clayWaterL` | — | `target requires: [PercolatingMixin]` — the kernel const is `Mixins.Percolating`; `lint:mixin-names` refuses it missing |
| honey's reason | none | — | `INGREDIENT_FAMILIES` | — | — |
| the unpaid hand | none (the tick) | — | `employment.unpaidStandGameDays` in `treasury.yaml` (merge-missing) | the roster schedule is installed at boot already | — |
| rum | the distilling verbs the pack already affords (`pour`, `ignite`, the by-hand recipe verb) | the still row (`capabilities: [still]`), the tun (`mash-tun`) | the ten rum rows; **one matcher per tag** (`lint:fraction-schedules` + the content clash test) | Veshko's distillery is live when its hand is (the yard is a booted producer today — confirm in `C/terminus/pack.yaml` `boot:`) | the recipes' categories `first-molasses` / `blackstrap` |
| cane, the crush | `harvest`, `mill` | `Plant` (`harvest`), `ComminutingMixin` (the edge runner row) | the species/plant/crop rows; `recipes/crush-cane.yaml` | the estate's fields are rooms of the booted island — `lint:boot-entries` | the crush's item slot `category: cane` (the crop material's tag) |
| bagasse fuel | `dry`, `stoke` | `Combustible` (via `Firewood`) | `cane-fibre.heatOfCombustion > 0`; the row's `fuel` reserve | — | `stoke` refuses `too-wet` until dry (`FireLogic.tooWetToCatch`) |
| the train | `ignite`, `stoke`, `fit`, `repair` | `Burner`, `Assembled` | the `bill` on the train row; the kettle part rows | — | — |
| sulfur | platform `dig` | `OpenWorking` | the `Deposit` row + the zone's `deposit:` | — | a `digging` tool in reach (prop a spade) |
| the island by sea | `course waponi woo`, `go ashore`, `go aboard` | `Helm` (shipped) | the node row in world-seed with a `destination`; the landing's `aboard` exit | the sea row is world-seed's | `nodeByKeyword` matches `alternateNames` — author `[waponi, woo, waponi woo, the island]` |
| the hold persists | — | — | the row's class | capture at shutdown + the sweep; the wire restart proves it | — |
| the crew sails | — (a brain issuing `course`, `go ashore`, `buy`, `sell`, `drop`) | — | `sails` config on the master row; `buys: true` on the house's lines | the Hesper's company must be live unobserved (§ W6) | the brain's loops are bounded; a refused verb ends the beat |
| the planet | — | — | `_planetRadiusM` on `universe.yaml` | the root biome is booted first | — |

Each row's fifth column is the binder: a view's `args[].requires` naming
a mixin the target does not compose is refused before any controller
runs, invisibly to controller tests. Every new view is driven once by
the wire file **before** its controller test is trusted.

---

## Acceptance-criteria coverage

| AC | wave(s) |
|---|---|
| 1 sugar from the sugar house; the pantry conjures no sack | W2 (+ W1's house, W6 completes the chain from the island) |
| 2 temperature rises as it thickens; treacle · grain · caramel · burnt; maple sugar | W1 |
| 3 the thread test by hand; the thermometer more precisely | W1 |
| 4 the cone keeps its molasses in a vessel you can pick up | W2 |
| 5 clayed head white, foot brown, sold by grade; unclayed = muscovado | W2 (muscovado, the bands) + W4 (the clay) |
| 6 second and third sugar, then blackstrap | W2 |
| 7 honey refused with the reason | W2 |
| 8 Veshko's rum from molasses by a distiller; light/first, dark/blackstrap | W3 |
| 9 Waponi Woo by sea; cane grows there not at 42°; inversion | W5 |
| 10 bagasse + firewood; the train burns less; the forest thins | W5 (the balance is W1's D2) |
| 11 the estate and smallholders; a named owner; paid hands | W5 (+ W0 if they are not) |
| 12 the hold survives a restart; the island's sugar replaces the line | W6 |
| 13 the unpaid hand leaves, says so, the vacancy shows | W0 |

Nothing unmapped.

---

## Test & gate strategy

- **Unit, kernel** (`pnpm test:near` as each lands): the staged
  evaporative window (stage order, the cap, rain reversal, the curveless
  profile unchanged, the power limit), the Thermal cap, the Burner field,
  the Mould's incremental drainings, `Percolating`, the near-miss decline,
  `arrearsOwedTo` / `onWageRefused` / roster-derived openings,
  `GeoPosition.nmPerDegree` and the sight coefficient on two radii, the
  four gravity reads on a non-Earth root biome.
- **Unit, packs** (each touched pack's own `vitest run`): `trade-sugar`
  rows + one-matcher-per-tag + `Inverting` + the train's derived
  efficiency + `SugarLoaf.cutPlan`; `trade-distilling` rum rows;
  `waponi-woo` rows + the island's climate (a day-0 temperature above
  288 K at the zone) + the soil band; `water` `sails` with a stub craft;
  `terminus` general-store tests (`SUGAR_DIR` beside `RUBBER_DIR` if the
  venue's rows load there); `trade-cooking` / `trade-hospitality` for the
  renamed census key.
- **Only the drive can prove**: the Lounge's mojito made with house
  sugar through the distributor; the refiner, the island's three brains,
  the distiller and the master running unobserved; the hold across a
  restart; the chart distance. The wire file asserts a **state read back
  off the world** at every checkpoint — a stage word, a band, a stock
  line's `from`, a material, a position — never *not refused*.
- **Gates** (`pnpm -C packages/server lint:family`): `instanceable` (no
  `/lib/` class in a row, no `container:`, no `hydratorClass:`),
  `mixin-names` (`Percolating` in the kernel const), `field-meta`,
  `closed-vocabularies` (the family), `fraction-schedules` + the content
  clash test (one matcher per tag), `dossiers` (every Cast's
  `archetype`), `openings` (arm 5 for every new `parLines.supplier`;
  no overlapping roster slots), `boot-entries` (**ceiling 85 → 87/88
  with a caller audit in the MR**), `counters`, `perishable` (every
  food material on a `Provision`-descended class: the loaf, the piece,
  the block, the cane), `pathogens` (untouched), `light-sources` (every
  new burner row `lit: false`), `verb-collisions` (`temper`, `skim`,
  `clay` — if any collides, the ladder, not first-come), `reachability`,
  `template-scans`, `locations` / `location-graph` / `ground` /
  `biome-sky` (every new room: `coords`, exits both ways, `enclosure:`),
  `water-citations`, `module-scope`, `imports`, `lib-statics`,
  `object-verbs`, `person-keys`, `idle-cadence` (every `candidate` brain
  declares `urgency`), `arg-kinds` / `binder-models` / `instrument-args`
  (the reading row's args), `test-bootstrap`, `pack-extends`, `schema`
  (no collection touched), `drive-scripts` (the drive is a wire file).
- `pnpm test` runs exactly twice: before the MR opens and at `/finalize`.
  Merging master mid-build (for !380, !397, !398) is a `test:near` +
  touched packs + `lint:family` moment, then a re-drive — never a reason
  for the full suite.

---

## Risks & opens

- **The `f > 1` walk and the volume formula.** `startL` is recovered from
  `amountL / (1 − f·shrink)`; past `f = 1` with `shrink = 1 −
  productFraction` the formula still inverts cleanly, but a batch rained
  into after the strike re-bases from a smaller volume. Acceptable
  (*a setback, not a failure*); a test pins it.
- **Thermal/Maturing read order.** `Maturing.reconcileFerment` reads
  `temperatureTrajectory`, which runs the thermal reconcile, which now
  asks `boilingCapK()`, which reads concentration **without**
  re-entering the ferment reconcile (the `_reconcilingFerment` guard
  makes a nested read return the last state). Document the order in the
  method; a test boils a pan through three reads.
- **The sap pan's rate.** The power limit at the default 0.5 matches
  today's authored rate within noise; if the forestry wire test
  (`forestry.dirty.wire.test.ts`) times a boil, re-check it after W1.
- **Vessel state across a restart.** The copper's batch is captured only
  if its room persists or it is a persistable fixture — parity with the
  sap pan today, and the refiner brain re-derives its step from the
  vessels' state, so a restart mid-batch loses the batch, not the house.
  Not fixed here; a note in the drive record if it bites.
- **Brains are ~40 % of the build's code** (`refines`, `cuts`, `mills`,
  `boils`, `distils`, `sails`). Each is one step per beat, every act a
  verb, bounded, modelled on `hauls` and `consigns`. If the founder
  would rather the island's hands be rostered-but-idle in this build,
  the three island brains are a clean cut (AC 11 still holds); the
  refiner and the master are not (AC 1 and 12 need them unobserved).
- **The crew's money.** The Hesper's company buys on terms at the estate
  and sells at the house; the first voyage needs the `stocks` brain's
  rung-1 path to extend to a non-shop buyer, or the company starts with
  nothing it can buy with. Check `ContractApi.issueLoan` rung 1 from a
  business with no sales history; if refused, the estate consigns onto
  the Hesper instead (the carrier never owns the cargo) — decide at W6
  and record it.
- **`brandKey` on a supplied line** (Hollis) — decided at W3 by reading
  the code, recorded in the row.
- **Pack dependency direction.** `trade-forestry` must not depend on
  `trade-sugar`: the maple strike, maple sugar and the sugar mould are
  forestry rows; only the kernel fields are shared.
- **`lint:water-citations` on a reach-less locality** — verify before
  authoring the island's Locality; the fallback is a small stream row.
- **The place-taxonomy rename** (memory: *rename IN !380 after
  compaction*) — if it lands first, `FurnishableRoom` may have a new
  name; the hold's row names whatever master calls it.
- **Aboard, the climate is Terminus's** — anything on deck at 30° N
  reads 42° weather (expanse.md's deferred "latitude as a resolved
  value"). The drive's `feel` is ashore; the seam stays deferred.
- **The pack count** is the one assertion a merge cannot reconcile:
  recount at every master merge (64 today; 65 after W1; 66 after W5).
- **Stop and ask** only for: a worktree hazard; a gate ceiling the
  owner has not approved at MR time (the boot entries); a lint that
  refuses a new file with no compliant home (none is expected — every
  new file above has a category).

---

## Deferred seams

| seam | attach point | leaves as |
|---|---|---|
| the hopper adopting percolation | `PercolatingMixin` on a potash-ash solid; `Hopper.matchProfile` retires | a line in the cleanliness/potash slates |
| a pan of strike left to cool setting hard | `reconcileBulkPhase`'s melt arm on a `strike` material with a melting point | `moulding-slate` |
| a limeburner seat at the quarry | the `burn-lime` recipe on a roster | `potash-slate` |
| earthenware cones made, not stocked | the cone row's `_materialPath` + a pottery recipe | `pottery-slate` (sugar is its first customer) |
| latitude resolved from a ship's position | `WaterExpanse` + `SpatialZone.climateSite()` | climate-and-water's seam (expanse.md) |
| consistent positions on the globe | — | the-world slate § 5 |
| customs duty at the wharf | the `sell` at the house's counter | markets slate |
| a berth as a quay feature; a wharf node | `AboardExit.computeDestination` | navigable-water § 7a |
| dunder | the dark-rum wash recipe's residue | distilling, a hook |
| the three-roller mill, the vacuum pan, bone char, the centrifuge | new rows on `mill`, the profile's stages, the loaf's percolation | sugar-slate § 7.5 |
| an eruption; geothermal boiling | the volcano zone | sugar-slate notes |
| vacancy signage for a seat with neither headcount nor a roster slot | `openingsFor` | employment.md note |

---

## Critical files

Read first, in this order:

1. `docs/requirements/sugar-requirements.md`, then this plan's § Decisions.
2. `M/lib/maturation/Maturing.ts` (l.590–720, 790–860, 1340–1450),
   `M/lib/maturation/MaturationProfile.ts` (l.180–420),
   `M/lib/thermal/Thermal.ts` (l.860–900, 1015–1060, 1300–1360),
   `M/lib/fire/Burner.ts` (l.350–400, 600–680).
3. `M/lib/mould/Mould.ts` (l.270–420), `M/lib/material/Material.ts`
   (l.120–160, 580–630), `C/trade-dairying/src/thing/Hoop.ts`.
4. `M/platform/idea/api/EmploymentLogic.ts` (l.1190–1370, 1620–1790),
   `M/lib/employment/{Employed,Organization,Employment}.ts`,
   `M/platform/idea/Business.ts` (l.240–290).
5. `M/platform/idea/api/CraftingLogic.ts` (l.2940–3000, 3195–3225),
   `M/lib/craft/{CraftingDecline,Cuttable,Recipe}.ts`,
   `M/platform/idea/cmd/crafting/CutController.ts`,
   `C/trade-milling/src/idea/cmd/milling/MillController.ts`.
6. `M/lib/instrument/Reading.ts`, `M/platform/idea/reading/TemperatureReading.ts`,
   `C/trade-ice/src/idea/reading/IceReading.ts` + its row.
7. `M/lib/retail/Stock.ts`, `C/trade-shopkeeping/src/behavior/{consigns,stocks}.ts`,
   `M/lib/behavior/restocks.ts`, `C/trade-haulage/src/behavior/hauls.ts`,
   `docs/subsystems/behavior.md` (the candidate beat, `Urgency`).
8. The venue precedent: `G/rubber-works.yaml`, `G/rubber-works/structure.yaml`,
   `…/location/ground/works/floor.yaml`, `G/yard.yaml`; the pack
   precedent: `C/trade-rubber/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}`;
   the locality precedent: `C/hollow-mere/**`.
9. The sea: `docs/subsystems/expanse.md`, `M/lib/expanse/{GeoPosition,Expanse,Voyaging,Voyage}.ts`,
   `M/platform/idea/cmd/movement/CourseController.ts`,
   `C/terminus/content/world/terminus/hesper/**`,
   `C/world-seed/content/stuff/idea/WaterExpanse/greywater/gannet-rock.yaml`,
   `C/terminus/…/gannet-rock/landing.yaml`.
10. Growing and ground: `M/lib/husbandry/Growing.ts` (l.900–960),
    `C/trade-farming/src/location/Field.ts` (l.595–670, 810–840),
    `C/ground/src/idea/GroundCharacter.ts`, the wheat plant/crop/species
    rows, `C/hearts-delight/…/bench-field/location/upper-bench.yaml`,
    `C/trade-forestry/src/location/Wood.ts`, `C/rejection/…/hanging-wood/oak-clearing.yaml`.
11. `M/platform/idea/cmd/inventory/EquipController.ts` l.572–595 (the
    static completion), `packages/wire/tests/assembly.dirty.wire.test.ts`
    l.620–660 (the restart), `packages/wire/tests/rubber.dirty.wire.test.ts`
    (the dirty-file shape).
12. `packages/server/scripts/check-boot-entries.ts`,
    `check-no-authored-faucet.ts`, `docs/lint-family.md`.

---

## Drive record

*(appended at build time, not at plan time)* — the output of running
`packages/wire/tests/sugar.dirty.wire.test.ts` against a freshly dropped
world on port 2014: the count, each checkpoint, what each failure was and
what it found. The record must show the run.
