# Sugar — implementation plan

Executes [sugar-requirements.md](../requirements/sugar-requirements.md)
(kind: **feature**, lead end: **content-led over kernel seams** — every
seam's first consumer ships here). Both stages are one build on branch
`reqs/sugar` in worktree `build-1` (WIRE_PORT **2014**). Seeding slate:
[sugar-slate](../slates/builds/sugar-slate.md). Two unmerged slate MRs
this build rides: **!398** (the-world slate — the planet radius setting,
§ D12) and **!397** (unfree-labour — only its "unpaid hand walks off"
finding, § D10). ⭐⭐ **One unmerged CODE branch the boil converges on:
`reqs/silk` (MR !395)** — silk W4 (`f45f0fe0a`) gave `reconcileBulkPhase`
the latent-heat boil plateau and `4d8d6e55f` retired the `boil` verb to
an alias of `heat`; § D1/D2 re-plan the staged boil onto that mechanism
and § D21 says how the branch is stacked. **!380 (cleanliness) MERGED to
master on 2026-10-19 (`b7b97f0c3`)** after this plan was first written:
the place-taxonomy rename, `Maturing.matchProfile` and the lye `Hopper`
are on master now, and every class name below is master's.

Wave order (founder-agreed, revised 2026-10-19): **W0** the unpaid hand
(now, on master) → *silk (!395) merges* → **W1a** the fire has power (the
general physics, alone, with a blast-radius check) → **Stage A** the
Terminus sugar house (W1 the boil · W2 the cone and the grades · W3 the
rum · W4 claying, last) → **Stage B** the island (W5) → *the ship design
settles* → **W6** the voyage with the radius setting. Every wave lands at a commit
`build(sugar W<n>): …` and is independently landable.

---

## Grounding

Verified by opening the file, on `reqs/sugar @ 8a064b676` (branched from
master `a084aad88`), re-checked against master `b7b97f0c3` and
`origin/reqs/silk` (`aa6d57de7`, carrying `f45f0fe0a` + `4d8d6e55f`) on
2026-10-19. `M` = `packages/server/src/mud`, `C` = `packages/content`,
`G` = `C/terminus/content/world/terminus/goods-yards`. ⚠ Line numbers are
the branch's at `8a064b676`; master's cleanliness merge shifts
`Maturing.ts` (+47), `Material.ts` (+106), `Burner.ts` (+123) and
`CraftingLogic.ts` (+134).

### ⭐⭐ What silk's branch changes under the boil (`f45f0fe0a`, `4d8d6e55f`)

Neither is on master; both are on `origin/reqs/silk`, which itself lacks
the cleanliness merge. Read `git show 4d8d6e55f` and
`git show 4d8d6e55f:packages/server/src/mud/lib/thermal/Thermal.ts`
l.1375–1480 before touching the boil.

- **The latent-heat boil plateau** (silk W4): `reconcileBulkPhase(v,
  clock)` at `temp ≥ mat.boilingPoint` no longer flashes the pool. With
  `latentHeatOfVaporization > 0` it computes `overshootJ = (temp − bp) ×
  v.thermalCapacityJPerK()`, `boiledL = overshootJ / latent / kgPerL`,
  debits the pool, `setContentsTemperature(bp)` (the plateau), and
  returns; a material with **no latent heat still flashes**. Boiled dry
  → the slot clears. ⚠ The boil-off per read is whatever Newton overshoot
  the read FINDS — a long unread gap spends one capacity's worth, a
  watched pot more — and **no burner power enters it anywhere**; silk's
  `thermal.md` l.884–905 lists *"a power-limited heat transfer"* as
  OPEN (τ = R·C, a 30 L copper takes ~5 game hours to a simmer).
- **`boilHeldSeconds`** integrates the time at the boil off the vessel's
  own `temperatureTrajectory` (banked as `BulkPayload.boilHeldS` /
  `boilCheckedS`, declared from `lib/thermal/Thermal.ts` beside
  `latentRemovedJ`; first read looks back at most `PURIFY_LOOKBACK_S`
  600 s and never past the horizon) — but **only for a material naming
  `purifiedByBoiling`**; `purifyIfHeld` swaps the material at
  `PURIFY_HOLD_S` 60 s (fouled water → water, wood tar → pitch). ⭐ That
  arrow — *a material names what boiling makes of it, and the plateau
  fires it* — is the shape the staged boil converges on.
- **`boil` is retired** (`4d8d6e55f`): `BoilController`, its seed row
  and `boil.yaml` deleted; `heat.yaml` is `verbs: [heat, boil]` and the
  fire affords it through `Burner.commandContributions`
  (`platform/cmd/crafting/heat.yaml` replaces the `boil.yaml` line).
  `HeatController`'s placing arm `ContainmentApi.move(target, fire,
  'on')` — *"set a plain vessel on the lit fire in reach"*. ⚠ Master
  still has `boil.yaml` + `BoilController`; cleanliness added no `boil`
  arm of its own, so the silk merge simply deletes them.
- **`Material.purifiedByBoiling`** (silk, l.947 fieldMeta / l.1195 field)
  is the row-extension precedent for a material arrow; `boilingPoint`
  and `latentHeatOfVaporization` are existing fields (water authors 373 /
  2 260 000; lye authors `boilingPoint 375` and **no latent heat**; the
  maple-sap material authors neither).
- **`Burner.ts` on silk** removes `settleRoomAir()` (3 call sites) and
  swaps the `boil.yaml` contribution; **on master** cleanliness added
  `ashKg` / `rakeGrate` / `ashChoke` (+123 lines) and a new
  `lib/fire/Flued.ts` (`FluedMixin`, composed on `Hearth` and `Oven`: the
  flue soots and can catch). The two sides touch different regions of
  `Burner.ts`; a three-way merge should be clean, verify by hand.
- Silk's textile `Copper` (`C/trade-textiles/src/thing/Copper.ts`) caps
  `getContentsTemperature()` at the water's boiling point itself,
  because *"between reads the vessel's own temperature runs ahead of the
  plateau"* — the read-cadence artefact the power limit (D2) removes.

### What the cleanliness merge (`b7b97f0c3`) changed under this plan

- **The place rename** (`c9ca578ce`, B52): `lib/stuff/Location → Place`
  (`isLocation() → isPlace()`); `CartesianLocation → Location`;
  `SingletonCartesianLocation → Locale`; `FurnishableRoom →
  PersistentLocation`; `PersistentCartesianLocation → PersistentLocale`
  (`PersistableMixin(Locale)` — *"the kept Locale: the cookhouse, the
  chandlery, the lavoir"*; props capture as unstamped contents, cast is
  re-seeded, fixtures' runtime state rides the Adornable slice);
  `SingletonSphericalLocation → SphericalLocale`. Row counts on master:
  `Locale` 133, `PersistentLocale` 14, `PersistentLocation` 11,
  `Location` 3, `Shore` 9, `CartesianZone` 80. The `/…/location/` PATH
  segment is **not** renamed. The hold, the sugarbush, Veshko's
  distillery are `Locale` on master.
- `Maturing.matchProfile(material)` `@hook` (master l.1476) and the
  chandlery `Hopper` overriding it (destroys its ash at match time) are
  on master — D3's "if !380 lands" is now "it has".
- `CraftingLogic.ts` gained the kitchen-flora inoculum and `wash`;
  `Recipe.ts` gained `soils`; `EmploymentLogic.ts` +4 lines. None touch
  the sites this plan edits, but the line numbers moved.
- `soda-from-lye.yaml` (`C/trade-fuel/…/idea/maturation/`) is a third
  fire-heated `evaporative` profile on master, beside `maple-sap`,
  `birch-sap` and the sun-dried `brine`.

### The boil (maturation, thermal, fire)

- `M/lib/maturation/Maturing.ts` — `reconcileFerment()` (l.599) takes the
  time-weighted mean of `ThermalMixin.temperatureTrajectory` and, while
  `active`, dispatches an `evaporative` profile (four rows: `maple-sap`,
  `birch-sap`, `brine`, `soda-from-lye`) to
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
  Master (since `b7b97f0c3`) has the `matchProfile` hook at l.1476 and
  `Hopper` overrides it.
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
  and the body relaxes toward it by `τ = R·C` (`reconcileThermal`
  integrates stretch by stretch with `driftTowardMoving`, then runs
  `reconcilePhase()` outside the guard). **No concentration dependence,
  no burner power.** On this branch `reconcileBulkPhase` (l.1313) still
  **flashes a liquid to nothing** at `temp ≥ material.boilingPoint`; on
  silk it plateaus (above). `thermalCapacityJPerK()` and
  `setContentsTemperature()` are public on the mixin.
- `M/api/bulk.ts` — `transfer` step 5: a fresh fill carries the batch's
  identity (*a Graded source stamps the destination's grade band, a
  Crafted source the maker's mark*); `blendPayloads(from, fromL, to,
  toL)` folds the **per-litre** payload domains by volume at a pour, a
  recipe's bulk output and a grind. A per-litre domain is declared by
  module augmentation from the folder that owns it
  (`lib/metabolism/DissolvedToxins.ts`: `BulkPayload.dissolvedToxins`).
  `BulkPayload` itself carries only `recipeId`, `appearance`, `keywords`
  plus the declared domains.
- `M/lib/craft/Graded.ts` / `Crafted.ts` — `getGrade(): Grade`,
  `getGradeBand()` on any Graded host; `Vat` is Crafted (so a dissolve
  recipe's bulk output stamps the copper, and `pour copper into cone`
  stamps the cone).
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
  `location/ground/works/floor.yaml` (`Locale` on master,
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
  greywater}`); **`hold.yaml` is a `Locale` on master ("Not
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
- Persistence (master's names): `M/platform/location/PersistentLocale.ts`
  = `PersistableMixin(Locale)` — the kept singleton place (14 rows);
  `PersistentLocation.ts` = `Persistable → WarrenMember → Reserved →
  Location` (the old `FurnishableRoom`, for rooms laid out to a plan —
  the seznick-house `main.yaml`). Capture at shutdown
  (`PersistableLogic.captureAtShutdownImpl`) and at the sweep;
  `drop`/`put` do not call `captureHostOf`.
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
  `PersistableMixin(StandMixin(SoilMixin(ReservedMixin(Locale))))` (the
  geometry root is `Locale` on master; the branch still reads
  `SingletonCartesianLocation`);
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
- `packages/server/scripts/check-template-scans.ts` — every
  `Template.findByPathInfix` / `findByClass` / … call in kernel or pack
  `src/` must be on `ALLOWLIST`, and **`TEMPLATE_SCAN_CEILING` (the
  allowlist's total) may never exceed `CENSUS_AT_LANDING = 43`** — a new
  catalogue that scans an infix FAILS the gate without a census rise and
  a caller audit. The rule it enforces: content is reached by following
  an AUTHORED reference from what is loaded, never by searching the
  table.
- `lint:family` roster (derived from `packages/server/package.json`
  `lint:*`): the gates named in § Test & gate strategy all exist today.

---

## Plan-level decisions

**D1 — ⭐⭐ The staged boil is the plateau's: the liquor's boiling point
rises with its concentration, the latent-heat boil-off drives the
concentration, and what the liquor BECOMES is an arrow on its material.**
Converged on silk W4 + `4d8d6e55f`, not beside it. Three pieces:

1. **Concentration is bulk state.** `BulkPayload.dissolvedSolidsKgPerL`
   — a per-litre domain declared from `lib/thermal/Thermal.ts` beside
   `boilHeldS` (the plateau is what moves it), folded by volume in
   `blendPayloads` like `dissolvedToxins`. A fresh fill of a solution
   starts from its **material's** `solidsKgPerL` (new authorable field:
   sap 0.025, cane juice 0.16, raw liquor 0.6, molasses 0.8); the plateau
   rewrites the payload's figure every time it boils water off
   (`solids / litresLeft`). The mass fraction `w = s / (s + (1 − s/1.6))`
   (sucrose at 1.6 kg/L) is the one derived read everything else uses.
2. **The law is the material's.** `Material.boilingPointElevation:
   [[w, ΔK], …]` (piecewise-linear; `boilingPointAt(w) = boilingPoint +
   curve(w)`; absent = no elevation, water's behaviour). Sucrose:
   `[[0,0],[0.5,1.5],[0.7,5],[0.8,10],[0.85,14],[0.9,22],[0.95,32],[0.98,50],[0.99,60],[1,70]]`
   (K above 373). `reconcileBulkPhase` takes `bp = mat.boilingPointAt(w)`
   instead of `mat.getBoilingPoint()` — so the plateau **climbs as the
   pan thickens**, `measure temperature copper` reads it, and silk's
   `Copper` cap (`getContentsTemperature` at the water's boil) keeps
   working because water authors no curve.
3. **The stages are arrows, like `purifiedByBoiling`.**
   `Material.concentratesTo: [{fromW, becomes, minBand?, elseBecomes?},
   …]` (ordered). After the boil-off the plateau walks the arrows: the
   highest `fromW ≤ w` fires `becomes` (the material swaps, the payload
   carries — the `purifyIfHeld` shape); an arrow with `minBand` reads the
   **vessel's** `getGrade()` (a Vat is Crafted; the dissolve recipe
   stamps it, the pour carries it) and below the band fires
   `elseBecomes` instead — *what will not grain is blackstrap*. Each
   target material `extends:` its parent row (the `extends:` row
   inheritance), keeping the curve and the solids, overriding tags,
   prose and the next arrows: raw liquor → cane syrup (0.68) → strike
   (0.90, `minBand: fair`, else blackstrap) → caramel (0.985) → burnt
   (0.995). **Burnt is an arrow, not `damageAboveK`.** Nothing here
   reads a maturation `f`.

**What the `evaporative` maturation profile keeps.** The **sun-dried
brine** (no fire, the air's rate, rain reversing) — unchanged. The two
**fire-heated sap profiles retire**: `maple-sap.yaml` and
`birch-sap.yaml` are deleted and the sap materials author `boilingPoint
373`, `latentHeatOfVaporization 2 260 000`, `solidsKgPerL`, the sucrose
curve and arrows (sap → syrup at `w` 0.66 → maple strike 0.90 → caramel
→ burnt; the strike's `drainSetting` sets to maple sugar in a mould),
so maple gets its sugar from exactly the same mechanism. `soda-from-lye`
(fuel pack, fire-heated) is **not** converged here — it is the potash
build's; note only that lye must author a `latentHeatOfVaporization`
once silk lands or a lye kettle flashes dry (§ Risks). The copper, the
kettles and the sap pan still compose `MaturingMixin` (a `Vat` does) and
idle on a liquor no profile matches; `batchInputBand` plays no part.

**`measure density`** is fixed where it reads: `DensityReading.measure`'s
non-maturing arm returns `1 + 0.52·w` when the payload carries dissolved
solids, else the material's density as today.

**D2 — ⭐ The energy balance fills silk's open seam: a power-limited heat
transfer on the Burner/Thermal side — landed ALONE, as W1a.** The founder
wants it *fixed for real*, and it reaches every heated body in the game
(forge bars, oven loaves, stills, the glasshouse, the bath), not just
sugar's pans. So it is not folded into the sugar boil: it lands as its own
wave, first after silk merges and before any sugar boiling, with a
**blast-radius check** as its acceptance (§ W1a) — if a forge or an oven
now behaves wrong, it surfaces and is fixed in that wave, never tangled
with the boil. `BurnerMixin` gains
`heatTransferFraction` (authorable field, default `0.5`; an open island
kettle over a poor arch authors `0.3`; the Jamaica train overrides the
getter to derive `0.8` from its parts, D17). `ThermalMixin` exposes the
burner it is in or on as a public `heatSource(): (Stuff & Burner) |
null` (the private `heatSourceK` reads it). Two consumers:

- **The rise.** In `reconcileThermal`'s stretch loop, when `heatSource()`
  is lit, the body's temperature gain per stretch is capped at
  `P_in × dur / C` with `P_in = burnPowerW × heatTransferFraction` and
  `C = thermalCapacityJPerK()` — a 30 L copper on a hearth heats at the
  fire's real power, which is the thing silk's `thermal.md` says is open.
  No burner → Newton as today.
- **The plateau.** `reconcileBulkPhase` spends `min(overshootJ, P_in ×
  Δt_at_boil)` on steam, where `Δt_at_boil` is the time at the boil since
  the last check integrated off the trajectory — `boilHeldSeconds`
  generalized to run for **every** plateau material (it already banks
  `boilCheckedS`; `purifyIfHeld` keeps reading the held seconds only for
  an arrow). No burner → the overshoot stands. So an unread pot no
  longer boils off "one capacity's worth per gap", a watched pot no
  longer boils faster for being watched, and a better furnace evaporates
  the same pan on less fuel — fuel burns as it does today. Latent heat
  (2.26 MJ/kg) is the lesson; 12 kW × 0.5 is ~230 L/day.

**D3 — Claying gets the general mechanism in the kernel; the hopper
adopts it later.** A `PercolatingMixin` (`M/lib/material/Percolating.ts`,
kernel `Mixins.Percolating`) composes on a **porous solid**: it records
the liquid poured through it (`receivePercolant(litres, nowS)`),
reconciles on read against the host's `percolationDays()`, calls the
host's `@hook onPercolated(fromReach, toReach)` with the reach advanced,
and resolves where the outflow goes — `percolatesInto()`: the host's
container when that is a Mould with `drainsInto()` (the cone on its
pot), else the host's placement host when Bulkable. The sugar loaf is its
first consumer. The lye `Hopper` on master destroys its ash at
`matchProfile` time — that stays its own until the potash build, which
is where the ash becomes a composer of this mixin. Nothing here touches
`Maturing.ts`.

**D4 — The thread test is a `boil` reading row the sugar pack ships.**
`/trade/sugar/idea/reading/boil.yaml` (`subjectRequires: [BulkableMixin]`,
`discipline: sugar-refining`, `eyeCeiling: proficient`, `instrument:
thermometry`, `instrumentNoun: a thermometer`); the class reads the
subject's interior payload for `w` and its material's `concentratesTo`
for the stage names. `analyze boil <pan>` is the hand — a drop between
finger and thumb, in words banded by competence (*threads / soft ball /
hard ball / crack / caramel / burnt*, coarser below `competent`);
`measure boil <pan>` with a thermometer prints the stage **and** the
bracketed temperature — the better rung inside the same channel, while
`measure temperature <pan>` keeps working as the plain thermometer. One
row, both rungs, no platform file changed. ⚠ `boil` is the CHANNEL word
on a reading row; the verb is `heat` everywhere in this plan.

**D5 — Honey's refusal follows an authored citation: a material names
its family, and the family is a content row.** No kernel list, no
catalogue (`lint:template-scans` holds the scan census at 43 and refuses
a new infix scan without a caller audit — and a scan is the wrong shape
anyway: *follow the authored reference*). Kernel: an instanceable Idea
`M/platform/idea/IngredientFamily.ts` (`tag`, `members: string[]`,
`fieldMeta` persistent+authorable) and a `Material._familyPath` citation
(fieldMeta `ref: 'identity:relation'`, the `_speciesPath` shape) with
`getFamily(): Promise<IngredientFamily | null>` resolved by
`StuffApi.singleton(path)` — load on use. Content: `trade-cooking` ships
`content/trade/cooking/idea/ingredient-family/sweetener.yaml`
(`{tag: sweetener, members: [sugar, honey, syrup]}`), and `sugar.yaml`,
`honey.yaml` (apiculture), `maple-syrup.yaml` (forestry), `molasses`
and `cane-syrup` (sugar) cite it. At the two decline sites
(`CraftingLogic.ts` l.2962/2979), on a miss, walk the same pool: a
candidate whose material's family lists the wanted category but whose
tags lack it is the near miss, carried as `near: {name, family}` on the
`insufficient-input` failure (an optional field, not a new reason);
`CraftingDecline` renders *"This wants sugar — honey is a different
sweetener."* A second family (`fat`: tallow, lard, butter, oil) is a row
any pack ships with no kernel edit. The slate's withdrawn `parent:` is
not revived: membership is still the tags the materials carry.

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
the same reason. A limeburner seat is **unowned** (potash closed its
scope without one, 2026-10-19); sugar does not need it — the shelf is
the supply — so it waits in the quarrying tail. The sugar
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
`class: /platform/location/PersistentLocale` (master's kept singleton
place — `PersistableMixin(Locale)`, the cookhouse/lavoir precedent);
keep `coords`, the indoor biome, the adornment and `props:`. Owned goods
ride the estate overlay, the company's and unowned goods the room's
record. Verify the charts are not duplicated once a record exists
(`StuffApi.singleton` seeds `props:` only on the first record).

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
(four copper kettles + a brick flue) whose `getHeatTransferFraction()`
override derives from parts present and sound (0.8 whole; each missing
or failed kettle −0.15). An `Oven` on master composes `FluedMixin`
(cleanliness D18), so the train's flue soots like a hearth's and can be
swept — free, and correct. Bagasse is `src/thing/Bagasse.ts =
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
the woodpile; tempers, skims, heats to the strike, pours into the
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
empty, temper when untempered, skim, `heat copper` (the placing arm sets
it on the arch), `ignite`/`stoke`, `get copper` off the fire at the
strike (read by the vessel's own `w`, never by the reading verb) and
`pour` it into a cone, clay a set loaf (W4), nip a cured one, pound a
piece, put the sack in the stock, decant the pot into a cask — **one
step per beat**, every step a literal verb, bounded, home re-taken in
`finally`. The player's drive is the same verbs by hand. ⚠ No `boil`
anywhere: it is `heat`'s alias and the plateau does the boiling.

**D20 — ⭐ Every room whose vessels carry in-progress state is a
`PersistentLocale`.** A restart mid-boil that forgets the copper, a cone
draining, a loaf percolating, a wash fermenting or a still's charge is
the fiction betraying itself — exactly what `PersistentLocale` exists
for (cleanliness D31a: *"the tub of hot water, the soap curing on the
rack"*). Rows re-classed `Locale → PersistentLocale`: the Terminus
boiling floor and curing house (W1/W2), Veshko's distillery (W3), the
sugarbush (W1, the sap pan), the island's train floor and curing house
(W5), the Hesper's hold (W6, D13). A vessel's bulk slot, payload
(`dissolvedSolidsKgPerL`, `boilHeldS`), Thermal stamp, Mould set
progress and the loaf's percolation record all ride the room's container
slice as unstamped contents with their fields. ⚠ Cast is transient and
re-seeded — the refiner and the hands come back by their rows; the
`shiftStations` cache in `EmploymentLogic` re-moves them once. ⚠
`PersistentLocale` is the "visit" kind (one row = one place); none of
these rooms is laid out to a plan, so `PersistentLocation` (the old
`FurnishableRoom`) is wrong for all of them. The wire drive **restarts
the world mid-batch at a Stage A checkpoint** (after step 4, with the
copper on the lit arch at the plateau and a cone draining) and again at
W6's hold.

**D21 — ⭐⭐ Stacking: W0 on master; W1+ on master + `reqs/silk`.**
`origin/reqs/silk` (`aa6d57de7`) carries silk W4 and the boil
retirement but **lacks the cleanliness merge**; master has cleanliness
and lacks silk. The recommendation, in order:

1. **Now, before W0:** `git merge origin/master` into `reqs/sugar` (the
   place rename, `matchProfile`, `Flued`, the ash). Re-run `test:near` +
   `lint:family`. W0 touches employment only and has no silk dependency.
2. **Before W1:** `git merge origin/reqs/silk` into `reqs/sugar` — a
   catch-up merge INTO your own branch, which CLAUDE.md allows (landing
   is the MR's job; this is not that). Expected conflicts: `Burner.ts`
   (cleanliness's ash region vs silk's `settleRoomAir` removal —
   different regions, resolve by hand); `boil.yaml` + `BoilController`
   (deleted on silk, present on master — take the deletion);
   `thermal.md`. Then: lye's missing latent heat (§ Risks), the
   forestry `SapStandard.test.ts` against the retired sap profiles
   (D1), and the fire wire test's `boil` lines (already `heat` on silk).
   Re-run `test:near`, the thermal/fire/maturation suites, every
   touched pack, `lint:family`. **Then W1a (the fire has power) lands
   before W1.**
3. **When !395 merges to master:** `git merge origin/master` again — a
   no-op on silk's files unless review changed them; re-verify as in 2
   and re-drive.
4. **Open the MR only after !395 has merged**, or its diff carries
   silk's whole build and the reviewer cannot see sugar. If !395 stalls,
   the fallback is to open against `reqs/silk` as the target branch —
   never to cherry-pick silk's commits (duplicate commits conflict at
   the later merge).

What the build does at each later master merge (!397, !398 are docs
only): merge, `test:near` + touched packs + `lint:family`, recount the
pack test (§ Risks), re-drive. Never the full suite for a merge.

---

## Host placement

| new thing | host | what composing it claims about the host's other composers |
|---|---|---|
| `Material.solidsKgPerL`, `.boilingPointElevation`, `.concentratesTo`, `._familyPath` | the **Material** row (kernel Idea) — the `purifiedByBoiling` / `drainSetting` precedent | nothing until a row authors them; water, lye, every liquid that authors no curve and no arrow boils exactly as silk left it |
| `BulkPayload.dissolvedSolidsKgPerL` | a per-litre payload domain declared from `lib/thermal/Thermal.ts` (beside `boilHeldS`) | folded by `blendPayloads` like `dissolvedToxins`; absent on every pour that exists today |
| the elevated boiling point, the arrow walk, the generalized `boilHeldSeconds` | `reconcileBulkPhase` (module-private in `Thermal.ts`, silk's plateau) | every `Bulkable & Thermal` vessel — and for a material with no curve and no arrows the arithmetic is silk's, byte for byte |
| `Burner.heatTransferFraction` (+ `getHeatTransferFraction()`); `Thermal.heatSource()` public; the power cap on the rise and on the plateau | `BurnerMixin` / `ThermalMixin.reconcileThermal` | ⚠ **every body a lit burner heats warms at `P × fraction / C` instead of Newton's `τ`** — a loaf in an oven, an ingot in a forge, a still's charge. A forge's 8–20 kW over a 2 kg bar is faster than today's τ, a hearth over a 30 L copper slower; the default `0.5` and the existing `maxBurnPowerW` rows are the calibration, and the thermal + fire + crafting suites (295 tests on silk) are the check. This is silk's open seam being filled, and it is the one change in this plan that reaches past sugar |
| `IngredientFamily` (instanceable Idea) | `M/platform/idea/IngredientFamily.ts` + rows at `<root>/idea/ingredient-family/` | reached only by a material's citation; no catalogue, no scan |
| `DrainSetting.drains`, `.drainPerBand`; `Mould.drainsInto()` + incremental credit | `MaturingMixin`'s sibling `MouldMixin` (the cone, the hoop) | the hoop gains whey into a pail if one is ever placed under it; on its board nothing changes |
| `PercolatingMixin` | **kernel** `lib/material/Percolating.ts`, composed by the sugar loaf only | first consumer here; the hopper's ash is a later composer — the mixin claims nothing about any shipped class |
| `near` on the decline | `CraftingLogic` + `CraftingDecline` | an optional field on one failure arm; every other decline reads as before |
| `Business.arrearsOwedTo`, `Employed.onWageRefused`, roster-derived `openingsFor` | `Business` / `EmployedMixin` / `OrganizationMixin` | every business and every worker — which is the requirement (*nobody works unpaid forever*); a player worker is told, never auto-quit |
| `Biome._planetRadiusM`; `GeoPosition.nmPerDegree()`; the sight coefficient; four gravity reads | `Biome` row + two expanse value objects | every chart on every expanse; Earth's value when unauthored |
| `GroundSample.nativeNitrogenPct/.nativeOrganicPct` | `GroundSample` (ground pack) read by `Field.installSoilReserves` | every field seeds from the sample instead of two literals — same numbers unless a band or pin says otherwise |
| `PersistentLocale` for the hold, the two Terminus sugar rooms, Veshko's distillery, the sugarbush, the island's two boiling rooms (D20) | the rows only | each persists like the cookhouse; seven more `holder_snapshots` records; cast re-seeded |
| `InvertingMixin` / `Cane` | **pack** `trade-sugar/src/lib/`, on `Crop` | only cane; a sack of wheat does not invert |
| `SugarLoaf` (`PercolatingMixin(Provision)` + `Cuttable`), `CuringPot` (`PlacingMixin(Vat)`), `Bagasse` (`WaterActivityMixin(Firewood)`), `Train` (`AssembledMixin(Oven)`), `Copper` (`Vat` + `temper`/`skim` methods + the verb statics), `BoilReading` | **pack** `trade-sugar/src/thing/` and `src/idea/reading/` | pack classes a second sugar house names by row; the kernel's `Vat`, `Oven`, `Provision` unchanged |
| `distils`, `sails`, `refines`, `cuts`, `mills`, `boils` | pack brains (`trade-distilling`, `water`, `trade-sugar` ×4) | brains are modules; they claim nothing about classes |

**The narrowing test, applied.** `onWageRefused` branches on *is this an
Avatar* — that is the person kind, not a re-narrowing of the host set
(Employed composes on both by design, and both get an answer). The
plateau branches on *does the material author a curve / an arrow* and
the rise on *is a lit burner heating this* — data and a relation, not a
class. No new guard anywhere re-narrows a host set.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** on every place row; `container:` is refused by
  `lint:instanceable` (every new vessel is a prop of its room; the
  brains place what they make).
- **Places, by master's taxonomy**: a new place is a `Locale` (one row,
  one place — you visit it) or, when its vessels carry state across a
  restart (D20), a `PersistentLocale`; a landing on water is a `Shore`;
  nothing here is laid out to a plan, so no `Location` /
  `PersistentLocation`. Every room authors `enclosure:`/`roof:`
  (`lint:biome-sky` counts the legacy flag) and sits in a zone by
  `coords:`.
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
- **`boil` is not a verb.** Every act that brings a vessel to the boil is
  `heat <vessel>` (silk's alias); the drive, the brains and the help
  prose say `heat`. `boil` appears only as the reading CHANNEL (D4).
- **Content by citation, never by scan** (`lint:template-scans`): the
  family row is reached from the material's `_familyPath`; no new
  catalogue in this build.
- **No new Mongo collection, no migration.** The hold's record is a
  `holder_snapshots` row; a renamed census key means a dropped dev DB.
- **Gates this build must satisfy**: `lint:family` in full; the ones with
  something to say are named in § Test & gate strategy.

---

## Waves

### W0 — the unpaid hand walks off ✅ DONE

> **Build note (2026-10-19).** Master merged first (`reqs/sugar` was 71
> behind; clean). As planned, with two changes. ① The worker is handed
> the decision in **`settleShiftWageImpl`**, not in `tickBusiness`: both
> shift ends (the roster tick and `clock off`) settle through it, so
> one site covers both, and the tick's `void` promise stays untouched.
> ② `Organization.endShift` now refuses to overwrite an EXITED record.
> `clock off` awaits the settle and then calls `endShift`, so a hand who
> quit inside the settle would otherwise have come back `off-shift`.
> `openingsFor` = `max(headcount, distinct rostered assignees) −
> holders`. `holdersOf` already counts a roster assignee until their
> record says they exited, so a seat opens only on positive evidence. ⚠ That
> evidence is read off the live NPC, so after a restart with the hand
> unloaded the seat reads held until they load (load on use). The
> spoken line needs a room (`toPeers`); an offstage hand just leaves.
> The "drive step 1" wire checkpoint is written with the drive file at
> the end of the build, not here. The test is in `credit.note.test.ts`:
> the payroll harness lives there.

**Goal.** AC 13; drive step 1. Decisions D10, D21 step 1.

**First:** `git merge origin/master` into `reqs/sugar` (cleanliness),
`pnpm install` if a pack was added or renamed, `test:near` +
`lint:family`. W0 needs nothing from silk.

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

### W1a — the fire has power (after silk; before W1) ✅ CODE DONE — drives owed

> **Build note (2026-10-19).** `76f625436`. Three departures from D2 as
> written, each decided by the physics:
> ① **The power is a RESISTANCE, not a per-stretch cap.**
> `R_fire = (T_fire − T_room)/P_delivered` in `effectiveR()`. That is a
> constant of the fire, so the curve stays one exponential and a watched
> pot heats exactly like an unwatched one. A per-stretch `P·dur/C` cap
> depends on read cadence.
> ② **A pot SET ON a fire is in the flame:** `R = R_wall + R_fire`, with no
> still-air term. A body IN an oven takes `max(R_air + R_wall, R_fire)`.
> The test showed the still-air term was the real limiter: a 30 L pot on
> a 6 kW hearth climbed 0.8 K/min where the fire delivers 1.4.
> ③ **The boil spends `P_at_boil × Δt`, not `min(overshoot, P×Δt)`.** The
> min would keep the "one capacity's worth per gap" defect it was meant
> to fix. Supporting changes:
> - `Δt` comes from the new exact `Piecewise.secondsAtOrAbove`.
> - The boil clock starts where the phase pass last looked (transient
>   `_phaseCheckedS`, seeded from the persisted stamp). Silk's 600 s
>   first-read lookback had credited an unread hour as ten minutes.
> - Silk's copper test reads 2 h, not 8: a real range boils 12 L dry in
>   about 3 h.
>
> ⚠ **The blast-radius drives are owed.** A run on a fresh world was
> reaped for memory after the boot (576 s). The owner said carry on, so
> they run in the same boot as W1's drive checkpoints. A heat drift found
> there is fixed on its row and recorded here.

**Goal.** D2 alone: a burner warms what it heats at its real power, and the
boil plateau spends the fire's power on steam — the general physics, with
no sugar in it. **Waits on:** silk (!395) merged into `reqs/sugar` (D21
step 2).

**Files.**
- `M/lib/fire/Burner.ts` — `heatTransferFraction` field + `fieldMeta` +
  `getHeatTransferFraction()` / setter (default `0.5`).
- `M/lib/thermal/Thermal.ts` — `heatSource()` public; the rise cap in
  `reconcileThermal` (`P_in × dur / C`); in `reconcileBulkPhase` the
  power-limited boil-off (`min(overshootJ, P_in × Δt_at_boil)`) and
  `boilHeldSeconds` running for every plateau material.
- Tests: `Thermal.power.test.ts` (the rise is capped at `P × fraction /
  C`; the boil-off over a long unread gap equals `P × Δt / latent`, not
  one capacity's worth; a watched and an unwatched pot boil off the same
  litres; no burner → silk's figures), the `Burner` field test.
- Row calibration as the check finds it: a row whose `maxBurnPowerW` was
  never calibrated is fixed **on the row**, never by moving the default.
- `docs/subsystems/thermal.md` — silk's open "power-limited heat
  transfer" item closed, with the history note.

**Acceptance — the blast-radius check.** `pnpm test:near`, the thermal,
fire, crafting, bulk and maturation suites, every pack whose rows heat
something, and `lint:family`; then **the wire drives of every trade that
heats things**, each on a fresh world, each compared with its last green
run on master:

| trade | drive (in `packages/wire/tests/`) | what to watch |
|---|---|---|
| smithing | `crafting.dirty.wire.test.ts -t 'the smithy'` | a bar reaches forging heat at the forge's power |
| cooking | `cooking.dirty.wire.test.ts` | oven loaves, the range, the copper |
| glass | `glass.dirty.wire.test.ts` | the furnace melt, the gather's working window |
| distilling | the drive whose checkpoints run a still (`grep -l still packages/wire/tests/*.ts`) | the still's heat-up and the cut |
| rubber | `rubber.dirty.wire.test.ts -t 'the cure\|stove house'` | the oven's hold at ~430 K; the stove house |
| cleanliness | `cleanliness.dirty.wire.test.ts` (on master since `b7b97f0c3`) — the bath checkpoints | a heated bath |
| taps | `taps.dirty.wire.test.ts` — the sugarbush checkpoints | the maple pan |
| fire | `fire.dirty.wire.test.ts` | the hearth, the furnace |

A drive that changes is either a row to calibrate (fix it here) or a real
finding (record it in the drive record). Commit `build(sugar W1a): the fire
has power — a burner heats at its power, the boil spends it on steam`.

### W1 — the boil, the thread test, the sugar house (Stage A) ✅ CODE DONE — drive owed

> **Build note (2026-10-19).** As planned, with these decisions:
> - **Dissolving is physics, not a recipe.** A raw-sugar block put
>   into a copper that holds water dissolves on `onContainableAdded`; a
>   dry copper refuses it. The strength is whatever block-to-water you
>   gave it. No crafting verb fits a bulk-into-vessel recipe by hand, and
>   the requirements' wording ("dissolve it into a warm liquor in the
>   pan") is the act itself. Lens 1: derivable. `recipes/dissolve.yaml`
>   is not shipped.
> - **The copper is `ContainerMixin(Vat)`**, so it can hold the block.
>   `temper`/`skim` flags (`limed`, `skimmed`) ride the liquor's payload,
>   declared by module augmentation in `Copper.ts` (not a separate lib
>   file). The band they decide is written onto the copper (`setGrade`),
>   which is what the kernel's strike arrow reads.
> - **A solution holds at its solids ceiling** (1.58 kg/L) rather than
>   boiling dry. Blackstrap, which has no arrows, would otherwise have
>   vanished. Burnt is the arrow's job.
> - **The house's door is off Veshko's distillery (east), not the yard.**
>   The yard uses all eight compass points. Next door to the still that
>   buys its molasses (W3) is where it belongs. Boiling floor: west to
>   the distillery, north to the curing house, south to the store.
> - **The stock needed `prices:`.** A Stock with lines and no prices
>   sells nothing. Raw sugar is 14; quicklime at Rejection is 3.
> - **refines (W1 steps):** pour 30 L from the butt · put a block in ·
>   temper · skim · stoke with coal · light · heat · get copper at the
>   strike. One verb per beat, a pure `brain.next(floor)` state machine.
>   It works with what is in the room. Fetching blocks and lime is the
>   hand's and the par sheet's.
> - **Maple:** both sap profiles deleted. The saps author the boil +
>   sucrose curve + arrows. The syrups `extends:` their sap, with their
>   own `solidsKgPerL 0.88`. Maple strikes (`maple-strike`); birch stops
>   at syrup. Maple's caramel/burnt arrows are NOT authored: they would
>   need the sugar pack's rows, a forestry→sugar dependency. Evaporator
>   390 → 470 K, `heatTransferFraction 0.5`. The sugarbush is a
>   `PersistentLocale`. Maple sugar from the strike waits on W2's mould.
> - ⚠ **Found, not mine:** `corrosion-narrowing.test.ts` is red on
>   master. Cleanliness added once-living rushes, sweepings and manure
>   after rubber's narrowing; silk adds frass. Reported, not fixed.
> - `DensityReading`'s solids arm takes precedence over the maturing arm
>   (the copper IS a Maturing Vat).

**Goal.** AC 2, 3; drive steps 2–5 and 12. Decisions D1, D4, D7 (D2
landed in W1a and is used here),
D19 (the house's rows; the refiner brain's first steps: dissolve ·
temper · skim · heat · stoke · off-the-fire-and-pour at the strike —
the rest lands in W2/W4), D20 (the two Terminus rooms + the sugarbush),
D21 step 2.

**First:** silk merged in and W1a landed (D21 step 2). Everything below
assumes silk's `Thermal.ts` with W1a's power limit.

**Kernel files.**
- `M/lib/material/Material.ts` — `solidsKgPerL`, `boilingPointElevation`
  (+ validation: `w` ascending in `[0, 1]`, `ΔK ≥ 0`),
  `boilingPointAt(w)`, `concentratesTo` (+ validation: `fromW`
  ascending in `(0, 1]`, `becomes` non-empty, `minBand` a known band,
  `elseBecomes` present iff `minBand`), getters; `fieldMeta`
  persistent+authorable for the three (the `purifiedByBoiling` shape).
- `M/lib/thermal/Thermal.ts` — the `dissolvedSolidsKgPerL` payload
  declaration; in `reconcileBulkPhase`: `bp = mat.boilingPointAt(w)`,
  W1a's power-limited boil-off (used, not added), the solids rewrite
  after boil-off, the arrow
  walk (`concentrateIfReached`, the `purifyIfHeld` shape — swaps the
  material, keeps the payload minus the boil clock, reads the vessel's
  `getGrade()` for `minBand`); `boilHeldSeconds` runs for every plateau
  material.
- `M/platform/idea/api/BulkLogic.ts` — `blendPayloads` folds
  `dissolvedSolidsKgPerL` by volume; `transfer` seeds the payload's
  figure from the material's `solidsKgPerL` on a fresh fill when the
  payload carries none.
- `M/platform/idea/reading/DensityReading.ts` — the solids arm (D1).
- Tests: `Thermal.concentrate.test.ts` (a vessel of a curve-and-arrows
  material on a lit burner stub: the plateau climbs with `w`, the arrows
  fire in order syrup → strike → caramel → burnt, `minBand` below the
  band fires `elseBecomes`, a material with no curve plateaus at its
  plain boil, a material with no latent heat still flashes — silk's
  `Thermal.purify.test.ts` is the model), `BulkLogic.blend.test.ts`
  (solids fold by volume), `DensityReading` solids test.

**Pack `trade-sugar` (new).** `pack.yaml` (`root: /trade/sugar`, title
holder `{organization: /compact/trade}`), `package.json`
(`@saxonberg/content-trade-sugar`, deps above), `tsconfig.json`,
`vitest.config.ts`, `src/__tests__/rows.test.ts` (every row resolves;
one matcher per tag; the reading row warms). Content:
- `content/trade/sugar/idea/Discipline/sugar-refining.yaml`,
  `sugar-boiling.yaml` (the island's; the same discipline family —
  check `docs/subsystems/advancement.md` for the Discipline row shape).
- materials `content/trade/sugar/idea/material/`: `raw-sugar` (solid,
  food, raw-sugar), **`raw-liquor`** (liquid, food, raw-liquor;
  `boilingPoint 373`, `latentHeatOfVaporization 2260000`, `solidsKgPerL
  0.6`, the sucrose `boilingPointElevation` (D1), `concentratesTo:
  [{fromW: 0.68, becomes: …/cane-syrup}, {fromW: 0.90, becomes:
  …/strike, minBand: fair, elseBecomes: …/blackstrap}, {fromW: 0.985,
  becomes: …/caramel}, {fromW: 0.995, becomes: …/burnt-sugar}]`),
  `cane-syrup` (`extends: raw-liquor`; tags liquid, food, syrup, treacle,
  sweetener; `_familyPath` the sweetener family; the same arrows from
  the strike on), `strike` (`extends: raw-liquor`; the massecuite;
  `drainSetting {days: 4, becomes: loaf-sugar, drains: …/molasses,
  moisture: {unloaded: 0.04, loaded: 0.04}, loadRef: 1, drainPerBand:
  0.08}`; arrows caramel/burnt), `caramel`, `burnt-sugar` (no arrows —
  the end), `loaf-sugar` (solid, food, sugar, loaf-sugar, sweetener),
  `molasses` (liquid, food, molasses, first-molasses, sweetener;
  `solidsKgPerL 0.8`, the curve, arrows: strike at 0.90 `minBand: fair`
  else blackstrap, caramel, burnt — the re-boil is the same arrows on a
  lower band), `blackstrap` (liquid, food, molasses, blackstrap; **no
  arrows**), `skimmings`, `cane-fibre`, `cane-juice` (`solidsKgPerL
  0.16`, the same curve and arrows; W5 uses it — author now). **No
  maturation profile in this pack**: the boil is the plateau's.
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
  lump and records `limed` on the liquor's payload (a pack-declared
  payload field by module augmentation — the `DissolvedToxins` shape,
  from the pack's `src/lib/Tempering.ts` declaration); `skim(by, into)`
  moves 5 % of the liquor as `skimmings` into the pail and marks
  `skimmed`; **the two acts write the vessel's grade**: untempered caps
  the copper's band at `poor` (so the strike arrow's `minBand: fair`
  fires `elseBecomes` — it will not grain), over-limed or unskimmed caps
  at `fair` (dark); `static commandContributions` for `temper` and
  `skim`), `src/idea/cmd/sugar/TemperController.ts`,
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
`location/ground/boiling-floor.yaml` (**`PersistentLocale`**, D20;
props: copper, arch, pail, a quern `/trade/milling/thing/quern`, the
thermometer, a works board), `location/ground/curing-house.yaml`
(**`PersistentLocale`**; W2 props), `location/ground/store.yaml`
(`Locale`; the Stock persists itself), `thing/stock.yaml`
(`businessPath …/idea/outfit`; lines `raw-sugar-block par 6` import;
`sugar-sack`, `molasses-cask`), `idea/outfit.yaml` (D19; `parLines` lime
from Rejection, `banksAt goodkin`, operating the three rooms **and** the
stock), `agent/refiner.yaml` (Cast, `archetype: artisan` or whatever
the dossier vocabulary offers — check `lint:dossiers`' list),
`agent/hand.yaml` (Cast, `consigns`), the yard exit in `G/yard.yaml`).
`C/rejection/…/thing/store-counter.yaml` gains the quicklime line (D7).
**Forestry (D1's convergence):** delete
`C/trade-forestry/…/idea/maturation/maple-sap.yaml` and `birch-sap.yaml`;
`C/trade-forestry/content/stuff/idea/material/food/maple-sap.yaml` (and
birch) author `boilingPoint 373`, `latentHeatOfVaporization 2260000`,
`solidsKgPerL 0.025` (birch 0.012), the sucrose curve and
`concentratesTo` (syrup at 0.66 → `maple-syrup`, which `extends:` it
with the strike arrow → `maple-strike` (new; `drainSetting` → maple
sugar) → caramel → burnt); new forestry rows `thing/maple-sugar.yaml`,
`thing/sugar-mould.yaml` (a `/platform/thing/Mould`, `castTemplate
…/thing/maple-sugar`) propped at the sugarbush; `evaporator.yaml`
`burnTemperatureK` 390 → 470 (its comment about sitting between the
profile's bands is rewritten: the profile is gone), `heatTransferFraction
0.5`; `C/rejection/…/hanging-wood/sugarbush.yaml` → `PersistentLocale`
(D20); `C/trade-forestry/src/__tests__/SapStandard.test.ts` and the
forestry wire test re-pointed from the profile to the arrows (a sap pan
on the lit arch reaches syrup by the plateau). **Registration**: root
`package.json`, `C/terminus/package.json`, `PackLogic.discover.test.ts`
64 → 65 with an order claim (`trade-sugar` after `trade-milling`),
`pnpm install`.

**Acceptance.** Drive steps 2–5 and 12 pass on a fresh world: a block
dissolved, tempered with lime bought at Rejection, skimmed; `heat
copper` (never `boil`), the arch lit and stoked; `measure temperature
copper` rises across three reads as the plateau climbs; `analyze boil
copper` answers in words; one batch taken off (`get copper`) at syrup
reads *treacle*, one at the strike (poured into a plain vessel for now)
reads *strike*, one left on reads *caramel* then *burnt*; **the world is
restarted with the copper on the lit arch and the plateau still reads
and climbs afterwards** (D20); at the sugarbush, sap heated past syrup
reads a maple strike. Commit `build(sugar W1): the boil converges on the
plateau — elevation, the arrows, the power limit; the thread test; the
Terminus sugar house`.

### W2 — the cone, the grades, the sack, the rum's feedstock ✅ CODE DONE — drive owed

> **Build note (2026-10-19).** As planned, with these decisions:
> - **Drainings get a FRESH payload**, not the pool's (D16 said carry
>   it). Carrying it hands the molasses the liquor's treatment: its
>   `limed`/`skimmed` flags would re-grade a re-boil back up, laundering
>   it. Their grade is the mould's minus one band. A re-boil then grains
>   one band darker, because a pour into an empty copper carries the
>   pot's grade (the shipped "vessel grade = contents' grade" rule) and
>   the strike arrow reads it.
> - `Mould.creditDrainings` credits `totalKg × progress` each step
>   (`setDrainedKg`, persistent). `drainPerBand` adds a share per band
>   below `fine`. The strike's `nutrientAmounts.water 0.35` is the MOTHER
>   LIQUOR: a third of a cone drains as molasses.
> - **D5** as planned. `IngredientFamily` is a `SingletonMixin(Idea)` (the
>   `PumpMechanism` shape). The near miss is found at both decline sites
>   by `withNearMiss`, which follows each candidate's own `_familyPath`.
>   `lint:census` reads `_familyPath` and `concentratesTo`.
> - **The loaf's bands** are a field (`bands`, empty = the cast grade
>   throughout). `look` reads the colour head to foot through a markup
>   augmenter. Its pieces are the generic `sugar-piece` row, graded, not
>   renamed: no rename surface on Perceptible.
> - **Stock lines** for `sugar-sack`/`molasses-cask` are `par: 0` (never
>   imported; filled only by hands) with prices. `molasses-cask`
>   `extends:` the fuel trade's oak `oil-cask`.
> - The refiner sets a cone on a pot and pours the strike in. Nipping,
>   pounding and decanting are the drive's hands, not the brain's. A cone
>   and pot stand on the boiling floor; three of each in the curing house.
> - ⭐ **Fixed a master defect:** `corrosion-narrowing.test.ts` was red.
>   Rushes, sweepings, manure and frass were `organic` without
>   `once-living`, so lime and vitriol silently stopped attacking them
>   when rubber narrowed the caustics. All four are tagged `once-living`.

**Goal.** AC 1, 4, 5 (the muscovado half), 6, 7; drive steps 6, 8, 9,
10. Decisions D5, D6, D9, D16.

**Kernel files.** `M/lib/material/Material.ts` (`DrainSetting.drains`,
`.drainPerBand` + validation; `_familyPath` citation + `getFamily()`),
`M/lib/mould/Mould.ts` (`drainsInto()`, incremental crediting with
payload + band − 1), `M/platform/idea/IngredientFamily.ts` (new
instanceable Idea: `tag`, `members`, `fieldMeta`),
`M/platform/idea/api/CraftingLogic.ts` (the near-miss walk at
l.2962/2979 following each candidate material's `getFamily()`),
`M/lib/craft/CraftingDecline.ts` (the line). Content:
`C/trade-cooking/content/trade/cooking/idea/ingredient-family/sweetener.yaml`;
`_familyPath` on `sugar.yaml`, apiculture's `honey.yaml`, forestry's
`maple-syrup.yaml`, the sugar pack's `cane-syrup`/`molasses`. Tests:
`Mould.drain.test.ts` (a cone on a curing pot: the pot's interior rises
as the set progresses and the loaf is cast with the complementary mass),
`CraftingLogic.near.test.ts` (honey for sugar → `near`; a material
citing no family → no near), `CraftingDecline` rendering, a
trade-cooking row test (every member tag is slotted by some recipe, the
family tag by none, every citer's tags include a member).

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
pot; advance two days; **restart the world**; advance two more; `look`
shows the loaf in the cone and molasses in the pot (D20); `get` the pot.
Drive 8: pour the pot into the copper; `heat` to the strike; a second
loaf reads one band darker; again; the fourth boil reads *blackstrap*
and never grains. Drive 9: `cut loaf with nips` →
three pieces; `mill piece` at the quern → a sugar sack graded as the
piece. Drive 10: `order mojito` at the Lounge after the distributor has
sugar from the house (`house stock` on the Lounge shows the sugar line
supplied); honey offered to `simple-syrup` refuses with the family
sentence. The pantry's row has no sugar line. Commit `build(sugar W2):
the cone keeps its molasses; one loaf, three grades; the sack is made,
not conjured`.

### W3 — the rum has a feedstock ✅ CODE DONE — drive owed

> **Build note (2026-10-19).** ⭐ **No `distils` brain: the shipped
> `cellars` brain already does exactly this.** It buys inputs at the
> cash-and-carry, orders the wash recipe off the floor, ferments it in a
> vat, runs the still with a banded cut and consigns the bottles.
> Veshko's distiller runs it with `crushes: [light-rum-wash,
> dark-rum-wash]` and buys `molasses`, which the Sugar House's hand
> consigns there. That is the shipped convergence, so no new brain. The
> distillery is a `PersistentLocale` with a still, tun, standpipe, two
> vats, slop bucket, wash bucket, bottles and logs. The distiller seat
> fulfils `[distilling, fermenting]`. Veshko's two rum lines stay as
> lines at `par: 0` (never imported). The distilling test requires every
> floor bottle to be some yard's line. **Hollis is untouched**: its two
> branded rums still import. D8's brandKey question was not reached; it
> is recorded as an open.

**Goal.** AC 8; drive step 11. Decision D8.

**Files.** `C/trade-distilling/content/recipes/{light,dark}-rum-wash.yaml`,
`…/idea/material/{light,dark}-rum-wort.yaml`, `{light,dark}-rum-wash.yaml`,
`…/idea/maturation/{light,dark}-rum-wash.yaml`,
`…/idea/fractionation/{light,dark}-rum.yaml` (copy `wash.yaml`'s
fractions and toxins; `aromaticCarry` higher for dark);
`C/trade-distilling/src/behavior/distils.ts`; `C/trade-distilling/src/__tests__/rum.test.ts`
(one matcher per tag; both schedules warm). `G/veshko/location/distillery.yaml`
→ **`PersistentLocale`** (D20: a wash fermenting in the tun and the
still's charge survive a restart) and props a still, a mash tun, a wash
bucket, bottles; `G/veshko/idea/outfit.yaml`
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

### W4 — claying (Stage A's last) ✅ CODE DONE — drive owed

> **Build note (2026-10-19).** `PercolatingMixin` as D3. ⭐ The loaf's
> bands are DERIVED from the reach, not stored (W2's `bands` field
> retired). Unclayed is muscovado throughout (two bands under the loaf's
> grade: the crystals are filmed in their molasses), which is what the
> requirements' step 7 says. Past ⅓ of the reach the head is a band
> above (white); past ⅔ the middle is the loaf's own (pale); through,
> the foot is a band under (brown). Claying washes 12 % of the loaf's
> mass out as molasses into the pot below. `clay loaf with clay` takes
> a quarrying clay lump; four are propped in the curing house.
> `mould.md` gained the drainings and percolation sections.

**Goal.** AC 5 (the clayed half); drive step 7. Decision D3 (master's
`matchProfile`/`Hopper` are untouched; the hopper's adoption is the
potash build's).

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

### W5 — Waponi Woo (Stage B) ✅ ROWS + SUBSTRATE DONE — estate brains deferred, drive owed

> **Build note (2026-10-19).**
> - **Shipped:** the `waponi-woo` pack; the Greywater node (rho 444480,
>   theta 180); the landing with an `aboard` exit (the Gannet Rock
>   shape); the track; two estate cane pieces and two smallholdings
>   (`Field`, cane props); the mill yard with the edge runner; the
>   boiling house (train floor + curing house, both `PersistentLocale`);
>   the estate store; the forest (`Wood`, mahogany: species + material
>   shipped by the island, since no tropical wood existed); the volcano;
>   the fumaroles (`OpenWorking` over a `vent` deposit, sulfur at the
>   surface over granite, since no tuff row exists); the estate business
>   with its owner (Adaeze Fairweather), cutters, miller, boiler and
>   hand; the smallholders.
> - **trade-sugar:** `InvertingMixin` (pack lib) with `Cane =
>   InvertingMixin(Crop)`. The grade falls a band at 25 % and two at
>   50 % from the band it was cut at. `Bagasse = WaterActivityMixin(Firewood)`
>   is wet off the rollers. `Train = AssembledMixin(Oven)`:
>   `getHeatTransferFraction` is 0.8 whole and −0.15 per missing or
>   failed kettle (bill: 4 copper-kettles + a flue). The kettle arch is
>   0.3. The kettle is a 200 L `Copper` row. Also: the hogshead (`Mould`
>   → raw-sugar block), the edge runner (`GristMill`, millstone), the
>   `crush-cane` recipe (`mill cane` → 18 L juice + a bagasse), and the
>   cane species, plant, crop and sett.
> - **D11 ground:** `GroundSample.nativeNitrogenPct`/`nativeOrganicPct`
>   (optional, absent = 25/40), `GroundBand.nitrogenPct/organicPct`, and
>   `Field.installSoilReserves` reads them. The island's
>   `idea/ground.yaml` bands the cane ground at 45/60.
> - The cane-juice maturation profile is NOT shipped: the boil is the
>   plateau's (D1), so a profile would be a second mechanism.
> - ⚠ **The estate brains (`cuts`/`mills`/`boils`) are deferred.** The
>   hands are rostered and paid (AC 11). Cane grows (AC 9). A player cuts,
>   mills and boils by hand (drive 15–16). Unattended production waits
>   on W6's voyage, which is itself held (below). The estate's store
>   lines are `par: 0`: it sells only what is made.

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
`aboard` exit to the Hesper's deck, `oneWay: true`), `location/track.yaml`
(`Locale`), `location/cane-piece.yaml` ×2 (estate `Field` rows, `areaM2
8000`, props the cane plants), `location/mill-yard.yaml` (`Locale`;
props the edge runner, a juice tub, the drying ground is the yard
itself), the boiling house as a structure (`boiling-house/structure.yaml`,
`location/train-floor.yaml` — **`PersistentLocale`**, D20 — the train,
the kettle arch + two kettles, the bagasse stack (a `Stockpile`), the
woodpile; `location/curing-house.yaml` — **`PersistentLocale`** —
hogsheads on curing pots), `location/store.yaml` (the estate Stock), `location/wood.yaml`
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
(`Oven`, `heatTransferFraction 0.3`, `burnTemperatureK 470`),
`thing/kettle.yaml` (a `Vat`, 200 L — the juice runs the same curve and
arrows as the copper's liquor, D1),
`thing/edge-runner.yaml` (class `/trade/milling/thing/GristMill`,
`{kind: millstone}`, mass 900), `thing/juice-tub.yaml`, `thing/hogshead.yaml`
(a `Mould` row, `castTemplate …/thing/raw-sugar-block`), `thing/bagasse.yaml`
(wet moisture, the `fuel` reserve like turf), recipe `recipes/crush-cane.yaml`
(item slot `category: cane` ×6, `millstone`, bulk `cane-juice` into the
tub, `outputPortionL 12`, `outputResidue: {template: bagasse, count: 2}`),
profile `idea/maturation/cane-juice.yaml` (`inputCategory: cane-juice`,
sugar 150 g/L, `productFraction 0.2`, the same curve and stages),
`src/behavior/{cuts,mills,boils}.ts` (`boils` issues `heat kettle`,
never `boil`), `src/__tests__/{inverting,train}.test.ts`.
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

### W6 — the voyage, the hold, the smaller world ⚠ RE-PLANNED (the ship design landed)

> **Re-plan (2026-10-19), per this section's own pre-check.** The ship
> design landed on master (`167a9b5ba`…`85441dda5`,
> `docs/slates/builds/ships-and-harbours-slate.md`). It says outright:
> *"build-1 (sugar) — carry on through W5; hold W6 (the voyage) until
> the harbour lands"*. Waponi Woo's landing becomes a quay with berths,
> and the home leg becomes the harbour. Masters are seats the shipping
> line appoints; crews belong to `trade-seafaring`. So:
> - **Built here:** D13, the hold persists by re-class (the slate
>   endorses it, L421–422), and D12, the planet radius (the slate is
>   silent on it).
> - **Held, destination the harbour build** (ships-and-harbours slate):
>   D14, the master's `sails` brain and the two-leg run.
>
> ⭐⭐ **Re-plan 2 (2026-10-19, the owner's call): ship sugar without the
> voyage. The sea is crossed by PLAYERS.** The realm already lets a player
> board the Hesper and `course waponi woo`, and the hold now persists, so
> the run exists with no new sailing code:
> - **The Sugar House orders island sugar.** A par line raw-sugar × 8,
>   supplier the estate. The refiner runs the shipped `restocks` beat,
>   which posts the shortfall as a carriage bounty on the works board,
>   `--from` the estate's store. The reward is 112 = 8 × the import's 14:
>   **the import is the CEILING** on what island sugar is worth landed
>   here. Delivered blocks land on the receiving bench and go on the
>   floor's table.
> - **The import stays as the backstop.** With no island sugar on the
>   floor the refiner buys a block off its own counter (and lime likewise).
>   The house keeps boiling with nobody sailing (DAU-independence), and
>   the bounty keeps standing.
> - ⭐ **Kernel fix in `restocks`: the supplier is LOADED ON USE.**
>   `counterRoomOf` used a registry read, so a supplier nobody had loaded
>   (an unbooted island) was never ordered from. It now follows the
>   authored reference with `singleton`, loading only paths the location
>   graph says are places, so it never mints a stray counter.
> - **The estate works** (this closes W5's deferral, because the bounty
>   needs blocks to buy):
>   - `refines` is configurable by the place's words: kettle/fire/mould/
>     pot/fuels, `source: block|juice`, `finish: loaf|block`, counter and
>     multi-step errand ways. The island's boiler runs it.
>   - New `cuts`: cut ripe cane, carry it to the mill, or with
>     `deliver: sell cane` sell it at the counter (smallholders, who need
>     no shift).
>   - New `mills`: crush, then carry the tub of juice north.
>   - The estate counter imports lime.
>   - The fields carry `standing-cane`, ripe: an island that grew cane
>     before anyone watched.
> - **The Terminus refiner finishes what he makes:** loaf out of the
>   cone, nipped, a piece milled, the sack carried to the counter.
>   Before this, loose sugar needed a player's hands; the pantry stopped
>   conjuring it in W2, so the Lounge's mojitos depended on a player.
> - **When the ship build lands:** the shipping line's master fills the
>   same bounty. Nothing here is torn out; the import can retire once
>   someone reliably runs the route.
> - Drive 18: the estate shelves its own blocks. Drive 20: a player
>   claims the bounty, buys at the estate, sails home over the bar,
>   lands the blocks on the bench and is paid.

**Goal.** AC 12; drive steps 19–20. Decisions D12, D13, D14.

⚠ **Before starting W6: check the ship design.** A ship design
conversation was in progress in the `master` worktree on 2026-10-19 (how
ships carry cargo, crew and sail). Before writing a line of W6, read what
it decided (new or changed slates under `docs/slates/` touching ships,
cargo, the hold, berths or crews — `git log origin/master --oneline` since
`b7b97f0c3`, and ask the founder if nothing landed). If it changes how a
hold keeps cargo, how a crew sails, or how a ship berths, **re-plan W6 in
place** (D13/D14 and this section) before building it. The radius setting
(D12) does not depend on it.

**Files.** `M/platform/idea/Biome.ts` (`_planetRadiusM`), `M/api/biome.ts`
(`planetRadiusM()`), `C/base-library/…/biome/universe.yaml`
(`_planetRadiusM: 2124000`), `M/lib/expanse/GeoPosition.ts`
(`nmPerDegree()`), `M/lib/expanse/Expanse.ts` (the coefficient), the four
gravity literals; tests pinning 60 nm/° (`GeoPosition.test.ts`,
`Expanse` sight tests) rewritten against the setting with Earth as a
fixture; `docs/subsystems/expanse.md` and `biome.md` notes. `hesper/hold.yaml`
re-classed `Locale → PersistentLocale` (D13, D20) + a wire checkpoint. `hesper/idea/outfit.yaml` (the
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
restart the world (the assembly precedent — the file's **third**
restart, after W1's mid-boil and W2's mid-drain); the hold holds them. Drive 20: with the master on shift, advance the clock through a
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
| the thread test | platform `analyze` / `measure` (channel word `boil`) | none needed — flat over a channel | `idea/reading/boil.yaml` on the `/idea/reading/` infix, class resolves into the pack's `src/` | `ReadingCatalogue` warms lazily | `subjectRequires: [BulkableMixin]`; ⚠ a required arg with no default fails closed and silent — copy `ice.yaml`'s shape exactly |
| the staged boil | `heat <copper>` (silk's view; `boil` its alias), `ignite`, `stoke`, `get`, `pour` — all the platform's | the fire's `commandContributions` names `heat.yaml` (silk) | `boilingPoint` + `latentHeatOfVaporization` + `solidsKgPerL` + `boilingPointElevation` + `concentratesTo` on the liquor MATERIAL rows, each stage a row that `extends:` its parent; ⚠ **a material with no latent heat flashes** (silk) | materials warm by `MaterialCatalogue` on the `/idea/material/` infix (every root) | the arrows read the vessel's `getGrade()` — the copper must be Crafted (a `Vat` is) |
| the power limit | none | — | `heatTransferFraction` on every arch/oven row that matters (default 0.5) | — | `Thermal.heatSource()` finds the burner the vessel is IN or ON — `heat copper` places it ON |
| the cone's drainings | `put cone on pot`, `pour` | `Placing` on the pot (pack class) | `drainSetting.drains` on the strike material; `castTemplate` on the cone | — | `put … on` binds a Placing host |
| nip | platform `cut` | `Cuttable` on `SugarLoaf` (interface, no static) | the nips row's `capabilities: [nipping]` | — | `cut.yaml` binds `tools requires: [ToolMixin]`; the plan refuses without nips |
| pound | milling's `mill` | `ComminutingMixin` on the quern row (shipped) | `recipes/pound-sugar.yaml` with `toolCapabilities: [millstone]` and an item slot on `loaf-sugar` | recipes load from `content/recipes/` | the mill binds `reachable:[mixin.ComminutingMixin]` |
| clay | `cmd/sugar/clay.yaml` | `SugarLoaf.commandContributions` | the loaf row's `clayDays`, `clayWaterL` | — | `target requires: [PercolatingMixin]` — the kernel const is `Mixins.Percolating`; `lint:mixin-names` refuses it missing |
| honey's reason | none | — | the `sweetener.yaml` family row + `_familyPath` on each member material — reached by citation, loaded on use | — | a material that cites no family gives no `near` (the decline reads as today) |
| the kept rooms (D20) | — | — | the rows' `class: /platform/location/PersistentLocale` | `StuffApi.singleton` restores the record or seeds `props:` once | — |
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

- **Unit, kernel** (`pnpm test:near` as each lands): the plateau with
  elevation and arrows (order, `minBand`/`elseBecomes`, no-curve = silk's
  figures, no-latent-heat still flashes), the power-limited rise and
  boil-off (watched and unwatched gaps agree; no burner = Newton), the
  solids fold, the Burner field, silk's own `Thermal.purify.test.ts`
  still green, the Mould's incremental drainings, `Percolating`, the
  near-miss decline following a citation,
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
  `/lib/` class in a row, no `container:`, no `hydratorClass:`;
  `IngredientFamily` is an instanceable Idea in `platform/idea/`),
  `mixin-names` (`Percolating` in the kernel const), `field-meta` (the
  four Material fields, the Burner field, `_familyPath` as a relation
  ref), `template-scans` (**no new scan** — the family is a citation;
  the ceiling stays at 43), `fraction-schedules` + the content clash
  test (one matcher per tag), `dossiers` (every Cast's
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

- **Potash builds in parallel (build-2, `reqs/potash`, heads-up
  2026-10-19).** It builds none of D1–D3 and converges on them after they
  land. Shared files, disjoint parts: `Burner.ts` (potash: ash accrual in
  `consumeFuel`/`takeAsh`/`rakeGrate`; W1a: the heat path),
  `Material.ts` (one field each), `DensityReading.ts` + `density.yaml`
  (potash: the egg rung and lye strength in its own method; ours: the
  measure arm — ⚠ when D1's dissolved-solids field lands, potash's lye
  strength should read it, one field not two), `FireController.ts`
  (potash: firing fractions + weakest grade), `lye.yaml` (potash adopts
  the plateau), `soda-from-lye.yaml` (potash deletes it — drop our
  retirement line if it is gone on master). Additive overlaps:
  AppSettings keys, the `PackLogic.discover` pack count, package.json /
  lockfile. Whichever lands second merges and resolves.

- **The silk merge (D21).** `reqs/silk` is behind master; the catch-up
  merge into `reqs/sugar` must resolve `Burner.ts` (ash vs
  `settleRoomAir`) and take silk's deletion of `boil.yaml` /
  `BoilController`. If !395's review changes the plateau's arithmetic,
  W1's tests are the first to say so. The MR waits for !395 (or targets
  `reqs/silk`).
- **Lye flashes once silk lands.** `lye.yaml` authors `boilingPoint 375`
  and no latent heat; on silk's plateau a lye kettle on a fire **flashes
  dry** (silk: *"a material with no latent heat still flashes"*). Give
  lye `latentHeatOfVaporization 2260000` at the merge (a row edit in the
  chandlery pack) and leave `soda-from-lye` as the fire-heated
  evaporative profile it is — the plateau and the profile both shrink
  the pan, the profile re-bases `startL` from the amount it finds, and
  the profile still completes by its own clock. Converging lye onto the
  arrows is the potash build's; record it in the potash slate.
- **The power cap reaches every heated body** (host-placement table) —
  which is why it is its own wave (W1a) with a blast-radius check: a
  forge warms a bar at its power, not its τ. The thermal/fire/crafting
  suites (295 on silk) and the smithing, cooking and distilling wire
  tests are the check; a row whose `maxBurnPowerW` was never calibrated
  shows up as a cold or a too-quick forge. Calibrate the row, not the
  default.
- **Read-cadence honesty.** With the plateau power-limited, a watched and
  an unwatched pot boil off the same litres over the same game-time; a
  test pins it. Without a burner (a pan in the sun) the overshoot stands
  — silk's behaviour, unchanged.
- **The sap profiles' retirement** touches forestry (`SapStandard.test.ts`,
  the forestry wire test's boil checkpoint) and the sugarbush row.
  Forestry still does not depend on `trade-sugar`: the maple strike, the
  maple sugar and the sugar mould are forestry rows; the kernel fields
  are shared.
- **Grade through the plateau.** The arrows' `minBand` reads the
  vessel's Crafted grade; the dissolve recipe's bulk output must stamp
  the copper (verify `applyBulkOutput`'s stamp at W1 — the
  `vessel-not-crafted` check at `CraftingLogic.ts` l.2758 says the path
  expects a Crafted vessel) and `transfer` step 5 carries it to the cone.
  If the bulk output does not stamp the band, `Copper.dissolve` stamps
  it from the block's band — the pack class is the authority either way.
- **Seven kept rooms (D20)** are seven `holder_snapshots` records
  captured at shutdown and the sweep; a crash between captures loses
  what happened since — the spine's existing limit, now visible on a
  boil. Not new, noted.
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
| the hopper adopting percolation | `PercolatingMixin` on a potash-ash solid; `Hopper.matchProfile` retires | a line in the potash slate |
| lye and soda converging on the arrows | `concentratesTo` on `lye.yaml`; `soda-from-lye.yaml` retires | the potash slate |
| a pan of strike left to cool setting hard | `reconcileBulkPhase`'s melt arm on a `strike` material with a melting point | `moulding-slate` |
| rain into an open fire-heated pan | the plateau has no sky term (the evaporative profile's rain arm stays the brine's) | `thermal-slate` |
| a limeburner seat at the quarry | the `burn-lime` recipe on a roster | unowned — potash declined it; a quarrying tail |
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

1. `docs/requirements/sugar-requirements.md`, then this plan's § Decisions
   (D1, D2, D20, D21 first).
2. ⭐⭐ Silk's boil, on its branch: `git show 4d8d6e55f` (the whole
   commit), `git show 4d8d6e55f:packages/server/src/mud/lib/thermal/Thermal.ts`
   (l.60–110 the payload declarations, l.985–1080 the drift,
   l.1375–1480 the plateau, `boilHeldSeconds`, `purifyIfHeld`),
   `git show 4d8d6e55f:docs/subsystems/thermal.md` (l.655–800,
   884–905), `git show 4d8d6e55f:packages/content/platform/content/platform/cmd/crafting/heat.yaml`,
   `git show 4d8d6e55f:packages/content/trade-textiles/src/thing/Copper.ts`,
   silk's `Thermal.purify.test.ts`. Then, on this branch:
   `M/lib/thermal/Thermal.ts` (l.860–900, 1015–1060),
   `M/lib/fire/Burner.ts` (l.350–400, 600–680), `M/api/bulk.ts`
   (l.150–200, 270–300), `M/lib/metabolism/DissolvedToxins.ts` (the
   payload-domain declaration), `M/lib/material/Material.ts`
   (`purifiedByBoiling` on silk, `drainSetting` l.120–160, 580–630).
   `M/lib/maturation/Maturing.ts` l.1340–1450 only to see what the
   brine keeps.
3. `M/lib/mould/Mould.ts` (l.270–420), `C/trade-dairying/src/thing/Hoop.ts`;
   master's `M/platform/location/PersistentLocale.ts` header (D20) and
   `docs/subsystems/location.md § The place taxonomy`.
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
what it found, including the three restarts (mid-boil after step 4,
mid-drain in step 6, the hold in step 19 — `stopOwnedWorld` /
`bootOwnedWorld`, `it.skipIf(!isOwnedTestWorld())`, each reopening its
`Session`). The record must show the run.

### Drive record — status (2026-10-19)

- The drive is written: `packages/wire/tests/sugar.dirty.wire.test.ts`,
  Stage A steps 1–9, 11 and 12, and Stage B steps 13–17 and 19. Step 20
  is held with W6.
- **Not yet run end to end.**
  - Attempt 1: the world refused to boot. trade-sugar named
    `GristMill` without depending on trade-milling, and waponi-woo named
    `Deposit` without depending on ground. Fixed in `807a2da27`.
    ⚠ **No lint gate catches a pack naming another pack's class without
    depending on it; only the boot does.** That's a gate gap worth a
    census.
  - Attempt 2: reaped for memory during boot, with two other
    worktrees' worlds up.
- W1a's heating drives (smithy, cooking, glass, rubber, cleanliness,
  taps, fire, silk, whiskey) are also owed, and go in the same boot when
  memory allows.

  - Attempt 3: 20/20 red. Causes: the duration format, dark rooms, and
    founder clones that were denied.
  - Attempt 4: 6/20 (steps 2, 11, 12, 16, 18, 19). Its failures were
    then probed one at a time on a standing world (`.wire/*.probe.ts`,
    gitignored), which turns a 40-minute question into a two-minute one.

### Drive 4's findings, and what each became (2026-10-19/20)

| finding | fix |
|---|---|
| copper, kettle, juice tub, curing pot were `closure: open` — a SIEVE on the bulk scale (the lid is `open:`) | `liquidTight`; forestry's sap pan and quarrying's salt pan had the same latent defect |
| `stoke arch with coal` binds the arch as the fuel; the platform help example taught it | `stoke coal into arch` in the brain, tests, drive and help |
| `harvest cane` not understood in a field — only a Cultivable bed afforded it | **a `Plant` affords its own harvest** wherever it stands; medicine's `PhysicPlant` (the same fix in a pack) retired into it |
| the lime order was refused: "fungible goods can't be contracted" | restocks orders a stackable count line by its TAG; `job post` gained `pieces of <category>` (the engine always held a counted category; the phrase did not) |
| the raw-sugar order was refused: "you can't fund that reward" (112 against a 50 advance) | a par line may carry **`rewardPerUnit`**, and the keeper orders only what the house can fund at that rate (raw sugar 14, the import ceiling; lime 5) |
| the Sugar House took THREE opening advances | `ContractLogic.openingAdvance` serialized per borrower (the `inFlightClones` precedent); "idempotent per borrower" held only for asks that did not overlap. Pre-existing for any house whose wages settle in one tick |
| `Train` = `AssembledMixin(Oven)` — refused at first registration, which in a live world was the first LOGIN (test-login 500) | `AssembledMixin(DurableMixin(Oven))` + `train.test.ts`, which fails on the old composition |
| she never raised Waponi Woo: the island had nothing to be SEEN by, and a course worked from the reckoning misses a one-mile node | **the peak of Waponi Woo** — a landmark Structure (1100 m) on the light-on-Gannet-Rock pattern; the lookout raises it ~36 h out, `measure bearing peak` fixes her, the course is laid again. Homeward, a course laid from the island's fix raises the bar on its own |
| step 14 expected "warm" | 30° in January is ~284 K at night (Madeira's latitude): warmer than the estuary's 273, not warm. The step compares; the cane and zone rows stop claiming cane never stops growing |
| step 1: no walk-off seen | the mechanism WORKS ("4 days unpaid, and 108 zorkmids owed. I'm done here."); the drive stepped a day at a time, which skips whole shifts, and read the notice by a glowcap too dim to read by. Twelve-hour steps; the notice read by daylight |
| a deck in a storm: the sailor is struck by lightning and cannot lay a course | the drive lays it again (the sim working, not a defect) |

⚠⚠ **A finding for the user, not fixed here — W0 surfaces the idle
economy.** A fresh house gets a 50 opening advance and pays more than
that in a day's wages, so houses fall into arrears with no player in the
world (that was true before this build). W0 turns arrears into
walk-offs: a probe census over ~6 idle game days went from 5 to 13
vacant seats of 71, 14 houses in arrears — the Sugar House's refiner
among them. And the island estate has no buyer until a player sails
there (the voyage is the player's), so it cannot pay its hands either.
The vacancies read as HELP WANTED, which is the lens-3b hole the design
wants; whether an idle world should shed staff this fast is a values
question (the seed `employment.unpaidStandGameDays: 3`, the opening
advance, NPC demand) and the economy's, not sugar's.

- Gate gap 2: a pack class whose composition the check refuses is
  caught only when something registers one; no gate registers every
  pack class.

### Drives 5–8 and the estate probes (2026-10-20)

Drive counts: 9/20 → 11 → 11 → 11 (by drive 8, Stage A passes 1–6, 8, 9
and 11; its remaining reds were handling, fixed after).

| finding | fix |
|---|---|
| the D20 restart SIGKILLed the world two seconds into its shutdown capture (preflight's grace); the copper came back empty | preflight takes `PREFLIGHT_GRACE_MS`; the drive's restart gives it a minute |
| `look` names a liquor by its APPEARANCE, never its material | the stage checks read appearances (thin and brown · thick and golden · clouding with grain · thick as tar) |
| a burned-out arch left the copper at syrup for twelve hours; a thirty-minute step carried it from syrup to burnt toffee | the boil loops tend the fire and time the strike by thermometer, two minutes a step past 385 K (an untrained hand's thread test cannot tell the stages apart) |
| the island estate ran 2170 into arrears with every hand on shift: the refusal looked the worker up only if RESIDENT | an NPC hand is loaded on use to decide; a player is only told while here |
| cane shipped as an ANNUAL — the estate's 24 stands were ~4 blocks, ever | it ratoons (polycarp cycle); ONE bundle a cut, five days round — three 30 kg bundles froze every carrier (`locomotion-gate-failed`) |
| no roster seat named a STATION: every shift began in the store, cutters in the shop | every estate seat (and the Sugar House's two) names its station |
| ⚠ a brain's `forceCommand` is unattributable by design, so every MAKER verb (`mill`, `cut`, `order`) found no maker: the miller declined `no-maker` at every bundle | the sugar brains act with `executeCommand` (`prints`' precedent); ⚠ the shipped `cellars` brain had the same defect (the vermouth winery declined fifteen times a run) and is fixed with a test |
| the crush needs an EMPTY tub (`no-glass`) and W6 had removed the yard's | the tubs are back; the miller pours his tub into the kettle and carries the same tub home (`carry.into`) |
| drive steps 15 and 18 passed vacuously (room prose said "tub"; the counter's description said "sugar") | 15 reads juice IN a tub; 18 BUYS a block |
| a twelve-hour clock jump runs no brain at all — a probed "week" cut nothing | steps 18 and 20 wait through real-time working hours, jumping only the nights |
| the libations annex suite (outside test:near): the Sugar House hand consigns as the house without a purchasing seat; rum and the sack are made at `par: 0` | the seat purchases; the suite names MADE lines |

- After step 1 the drive sets a long unpaid stand (restored at the end):
  in an idle world no house earns its wages, and the estate's miller
  walked off before the first block — the idle-economy finding above.
- **Not yet verified end to end**: the estate's boil-to-block leg (the
  boiler's `refines` on juice into a hogshead, the cure, the carry to the
  counter) has not been watched — the probes stopped on the steps above,
  and on 2026-10-20 the host's memory went to the underwater build.
