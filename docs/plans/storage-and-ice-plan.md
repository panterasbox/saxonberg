# Storage and the ice trade — implementation plan

Executes [storage-and-ice-requirements.md](../requirements/storage-and-ice-requirements.md).
**Kind:** feature. **Lead:** kernel. **First consumers, in this build:**
the icehouse (a store whose stock melts) and the sawmill's sawdust (a
poolable good the saw now leaves behind). Three corrections ride along:
a swimmer's body reads the water, the re-meltable lump stops claiming a
temper, and ice becomes a material of the commons.

Written 2026-10-16 against `reqs/storage-and-ice` at `0c8a48153`;
re-planned the same day against `801b97cdc` (the floor ruling — *the
frozen pool is one place and the ice is its floor; on it or in it is
support, not location*). Paths are relative to `packages/`; `S` =
`server/src/mud`, `C` = `content`. The build agent runs with fresh
context: every wave is executable from this document plus the files it
names.

---

## ⚠ Requirements problems found

None open. Five questions the first draft raised were **resolved by the
user on 2026-10-16** and are in the requirements doc now; the plan
carries each as a settled decision: `plough` → `mark` for the ice act
(D19, with the verification that farming's `PloughController` is bound
to the `Field` protocol and cannot unify); `cut` is ONE kernel view over
a cut-plan protocol, tailoring refactored in W7 (D16); the fishing hole
is cut with the ice saw and boring with the auger goes to fishing-slate
(D15); tongs are flavour and carrying is ordinary `get` (D19); the
`custody` category name stands (D6). The first draft's in-room model of
the frozen pool (a transient standing map, a `wade` verb, a `mode`
argument on the place hooks) was rejected and replaced by the floor
model (D12, D13).

One closure the requirements leave open is recorded here so the parent
session sees it: **the placeholder mere is authored in the southern
hemisphere.** The drive starts *"on the first day of the cold"* in a
fresh world, and a fresh world's day 0 is the northern spring equinox
(the climate drive stands at *"66° S on the northern equinox, where the
cold is DAYS OLD"*); a northern mere would be 270 days from its first
frost. The locality sits at ~58° S with an **alive** clear pin
(deterministic weather, seasons still run) and a cold offset tuned so
the freeze comes within days of day 0 and the thaw by day ~150 (D22).

---

## Grounding

Facts verified this cycle by opening the files (the three survey
agents' grounding at line level, re-opened by the planner where the
plan relies on it). What exists, what it does, what it does NOT do.

### Storage, custody, retail

- **Haulage depot.** `C/trade-haulage/src/thing/Warehouse.ts` extends
  `Holder` (`ContainerMixin(Thing)`), field `baileePath`, **not**
  persistable. `deposit(goods, depositor)` (l.75–99) moves the live
  goods in with `ContainmentApi.move` and calls
  `WaybillRegistry.issueReceipt`. **There is no withdraw**; the
  docstring (l.58–73) names it as the missing seam. No verb calls
  `deposit`; only `Depot.test.ts` does.
- **Receipts.** `WaybillRegistry.issueReceipt` (`C/trade-haulage/src/idea/WaybillRegistry.ts:302–334`)
  writes `DocumentApi.saveAsBusiness(bailee, `${baileePath}/warehouse-receipts/${uuid}`, 'warehouse-receipt', record)`.
  `WarehouseReceipt` (l.111–128) is `{receiptId, what, goodsPath,
  depositor, bailee, filedAtS}` — no terms, quantity, grade, fee or
  allowance. The kind `warehouse-receipt` is registered at
  `S/lib/document/DocumentKinds.ts` (`onVanish: keep`) and in the closed
  `BUSINESS_DOCUMENT_KINDS` (`S/platform/idea/api/DocumentLogic.ts:163–167`:
  bill-of-lading, warehouse-receipt, rate-card). `DocumentApi.read(path)`,
  `list(prefix)`, `listOfKind(kind)` exist (`S/api/document.ts:133–146`).
- **Retail.** `S/lib/retail/Stock.ts` =
  `PersistableMixin(ConsignmentShelfMixin(ResettableMixin(AttendantMixin(PricedOfferMixin(Holder)))))`.
  `StockLine` (l.73–90): `{itemTemplatePath, par, brandKey?, supplier?,
  pricing?: 'fixed'|'stocking'}`. `reset()` (l.293–308) clones only
  lines with no supplier up to par. `onHand` (l.271–285) counts a
  Stackable by quantity. `priceFor` (l.175–186): stocking →
  `max(1, round(base × (1 + e × (1 − onHand/par))))`, `e =
  retail.stockingElasticity` (0.5). `carriesLine(keyword)` (l.251–260)
  matches the template leaf. Rows name the twin
  `/trade/shopkeeping/thing/Stock` (e.g. `C/terminus/.../wharfside/chandlery/thing/counter.yaml`).
- **BuyController** (`S/platform/idea/cmd/retail/BuyController.ts:56–137`):
  `ensureOperatorAt` → attendant gate → `stock.resolveBuy(keyword)`; an
  empty shelf on a carried line is refused `sold-out` (l.105–114);
  `buyStock` (l.140–183) prices, `EmploymentApi.settleSale`, splits one
  off a stack, stamps, hands over. There is **no third stock source**.
- **Employment.** `ShiftEntry {days, hours}` + `RosterAssignment
  {positionKey, assignee, schedule, station?}` (`S/lib/employment/Roster.ts:15–37`);
  `Roster.evaluate(assignment, date)` (l.73–89) matches weekday + hour
  only; `RosterClock {weekday, hour}`. The tick:
  `EmploymentLogic.runTick` decomposes the clock with
  `DefaultCalendar.singleton().decompose(now)` and calls `tickBusiness`
  per business (l.1614–1707), which flips shifts and settles wages on
  on→off (`settleShiftWageImpl`, l.1299–1345: `wageRate × gameHours`).
  `DefaultCalendar` is 360 days, 12 × 30, "4 seasons × 90 days" in its
  docstring, but `CalendarDate` carries no season
  (`S/lib/time/Calendar.ts:17–25`). `Employed.isOnShift()` (any
  employment), `getEmployment(orgPath)` (l.398–424 of
  `S/lib/employment/Employed.ts`); **no `isOnShiftFor(org)`**.
  `Business.getParLines()`, `getOperatingLocations()`
  (`S/platform/idea/Business.ts:306, 327`). `Position` has `fulfills`,
  `headcount`, `requires`, `purchases`, `wageRate`.
- **The cookhouse.** `C/hearthworks/content/world/terminus/hearthworks/idea/business.yaml`
  — cook `fulfills: [cooking]`, `purchases: true`; `parLines`
  root-vegetables and stew-meat, supplier the distributor. The cook's
  `restocks` config (`agent/cook.yaml:57–65`): `shelf:
  /stuff/thing/fixture/table`, `board`, `bench:
  /trade/haulage/thing/receiving-bench`, `reward: 30`.
  `thing/stocked-icebox.yaml` extends `/stuff/thing/fixture/icebox` with
  `props: [/stuff/thing/ice-block]`.
- **`restocks`** (`S/lib/behavior/restocks.ts`): unpacks by
  `forceCommand` — a bulk interior tagged `ice` is poured into a bin
  (`isIce`, l.288–291), everything else `put <kw> on <shelf>` (l.215);
  `order` (l.348–415) posts `job post supply N <kw> to <bench> for
  <reward> --bounty --business --from <counter room>` after `wallet use
  house`. `counterRoomOf(supplierPath)` (l.333–346) finds the supplier's
  room holding a `ConsignmentShelf`.
- **`stockSheetForImpl`** (`S/platform/idea/api/EmploymentLogic.ts:863–900`)
  sums `CategoryMeasure.contribution` over `perceivedGoods(viewer)`
  (l.808–829), which descends into open containers and **never into a
  shut Sealable** (l.822–823). `CategoryMeasure.names(item, category)`
  matches a `getCategory()`, else the material's tag, else a bulk
  interior's tag (`S/lib/employment/CategoryMeasure.ts:65–78`).
- **Persistence.** `PersistableMixin` (`S/lib/persistence/Persistable.ts`):
  `getPersistenceKey`/`setPersistenceKey`; `capturesAtShutdown` false
  while the key is null; `onCreate` does not restore.
  `PersistableApi.capture / materialize / captureHostOf / restoreOrSeed`
  (`S/api/persistable.ts:74–141`). Precedent for a fixture that keeps
  runtime state: `C/terminus/src/market/thing/MarketStalls.ts:64–117`
  (`static hydrationSource = {name: 'holder_snapshots', required: false}`,
  `hydrateFromSource → PersistableApi.materialize`, `captureBook()` after
  every mutation; `lets` persistent, `pitches` authorable-only).
  Precedent for a place: `C/trade-quarrying/src/location/OpenWorking.ts`
  = `PersistableMixin(OpenWorkingMixin(SingletonCartesianLocation))`,
  restored through `singleton()`. `HydrateOutcome` is
  hydrated/skipped/unreachable (`S/lib/persistence/PersistenceSlice.ts:372–375`).
- **Put, get and where a placed thing lives** (re-verified after the
  dairy merge, 2026-10-17). ⚠ `ContainmentApi.place(item, 'on', host)`
  → `ContainmentLogic.placeOn` moves the item into the host's
  ENVIRONMENT (the room) and stamps the placement pair — `moveCore(item,
  targetEnv)` then `item._setPlacement(host, name)` — and `Placing.getPlaced()`
  is a lazy filter over the room's contents. A thing placed `on` a host
  is never one of the host's contents, so a host's
  `onContainableAdded/Removed` never fires for it. `PutController` has
  two branches: `mode === 'zero'` (the container's own interior) asks
  the target's optional `canAddContainable(item): VetoResult`
  (`S/lib/spatial/Container.ts:100`) FIRST, in the host's own words,
  then `ContainmentApi.move` — which fires `onContainableAdded(thing)` /
  `onContainableRemoved(thing)` (`Container.ts:104–106`); the placement
  branch asks `Placing.canPlace`. **`get.yaml` has no `from`
  preposition** (one greedy `targets` arg over `peers`, requires
  Visible+Containable); `peers` reaches one level into an OPEN container
  standing in the room (`api/mql/scope-walk.ts:133–163`,
  `MixinApi.isOpenContainer`), and `GetController` takes whatever
  `PerceptionApi.reachableAmong` grants, skipping `fixedInPlace` things
  (l.68–96). So `get block` picks a block out of an open holder in the
  room — exactly how `get block` takes a set block out of an open ice
  pan (`mould.md`: *"a plain `get` reaches into an open mould; `get X
  from Y` has no `from` and takes the mould as well"*).
- **Stackable** (`S/lib/stuff/Stackable.ts:214–285`): `canMergeWith`
  requires same templatePath, no shadow/adornment, untitled, equal
  `stackIdentity` fields, unlabelled, same appearance; then
  `setQuantity`, destruct, `onMerged`. Ore mass-weights its grade
  (`C/trade-mining/src/thing/Ore.ts:134–200`); Seasoning takes the
  minimum. `Scrap` is the fungible-by-mass stack precedent
  (`/stuff/thing/Scrap`, 0.1 kg units).
- **Banking** does not dematerialize: coin stacks move in and out of the
  vault (`BankingLogic.deposit` l.2673–2706, `withdraw` l.2710–2800).

### Room heat

- `reconcileEnvelope` (`S/lib/biome/Atmospheric.ts:1182–1275`) sums
  `heatW += occupant.spaceHeatOutputW()` over `isSpaceHeating`
  occupants (l.1208–1211), then per segment `steadyState = outside +
  (heatW + driveW)/U`, `tau = C/U`, `Decay.toward`. The only negative
  term is the scope's own `envelopeDriveW` hook (l.1290–1292), which
  `ClimateControlMixin` overrides (composed by `C/energy/src/location/ColdRoom.ts`,
  `thing/ColdStore.ts`). **An occupant cannot cool a room.**
- `SpaceHeatingMixin` (`S/lib/thermal/SpaceHeating.ts`) is composed only
  over a `Burner` (Hearth, Campfire); `setHeatOutputW` rejects
  negatives; `spaceHeatOutputW` reads `isLit`/`fuelRemaining` off the
  host. Its docstring forbids composing it on `BurnerMixin`.
- `envelopeApplies` (l.1042–1047): volume set, no authored
  `_temperature`, not sky-exposed. `envelopeCoefficients` (l.1379–1429):
  `U = A/(t/k + rFilms) + openingU·V·n`, `A = 5·side²`
  (`envelopeExposedAreaM2`, an `@hook`), `C = 1.2·1005·V + ρ·c·A·activeDepth`.
  `enclosure: {material, thicknessM}` is an authorable field (l.422).
  `envelopeOutsideK` is stamped by `BiomeLogic.ts:1196`
  (`host.envelopeOutsideK = await outsideKFor(scope)`), i.e. where
  somebody is — the climate drive's note that *"a room's ambient is
  restamped at a weather boundary only where somebody is"*.
- `airScopeOf(host)` (`S/lib/thermal/Thermal.ts:416–424`) walks
  `getEnclosingScope()` outward to the first Atmospheric;
  `Containable.getEnclosingScope` (`S/lib/spatial/Containable.ts:414–423`)
  returns the placement host when the member encloses. `Chamber` =
  `AtmosphericMixin(PlacingMixin(Thing))`, no volume → no envelope.
- `Coolbox` (`S/lib/thermal/Coolbox.ts`): contents read the coldest mass
  while shut; `insulationR` authored; not Atmospheric. `Icebox` =
  `CoolboxMixin(SealableMixin(StagedMixin(ThermalMixin(ContainerMixin(Good)))))`
  (`S/platform/thing/Icebox.ts`), fixed in place; the generic row ships
  `open: false`, `insulationR: 6.0`.
- Phase change: `reconcileBulkPhase` (`S/lib/thermal/Thermal.ts:1313–1406`)
  clones `mat.getCastTemplate()` on solidify and stamps prose/material
  only when the clone authored no material; `Material.castTemplate`
  defaults to `/stuff/thing/Casting` (`S/lib/material/Material.ts:493`);
  water authors `/stuff/thing/ice-block`
  (`C/base-library/content/stuff/idea/material/bulk/water.yaml:28`).

### The wet law and wetness

- Textiles' shipped law, `S/lib/slot/Wearable.ts:413–427`: `soak =
  wetness × min(1, capacity / dial(textiles.clo.absorptionReference,
  40))`, `kVoid = K_AIR·(1 − soak) + K_WATER·soak` (0.026 / 0.6).
  `Material.getWaterAbsorptionCapacity()` exists (field at
  `Material.ts:394`, persistent + spoiler; dairy's `DrainSetting` at
  l.132 and `drainSetting` at l.527–565 shifted the file). There is no `permeability`
  on `Material` and no `MaterialApi` wet method (`S/api/material.ts`
  has `findByTag`, `materialScale`, `resistanceTo`, …).
- The rubber plan (build-1, `docs/plans/rubber-plan.md` D12.1) agrees
  on one law, `p_eff = p_dry + saturation · permeability · (p_fluid −
  p_dry)`, `permeability = 0` when `wAC ≤ wetness.impermeableBelowPct`
  (2) else `min(1, wAC / absorptionReference)`, and that whichever build
  lands first generalizes the shipped textiles law onto the material and
  the second consumes it. Our reply note is `docs/plans/storage-and-ice-note-to-rubber.md`.
- `WetMixin` (`S/lib/wetness/Wet.ts:72–83`): `getWetness()`,
  `getWetnessBand()`, `wet(delta)`; composed on every Thing and every
  Agent. Rain wets direct room contents only (`WeatherLogic.wetOccupants`,
  l.1320–1332). **Nothing wets a swimmer.** `Attired.coveringAt(partKey)`
  returns the worn layers at a part; the walk over
  `plan.getBodyParts()` → `coveringAt(part.key)` is at `Attired.ts:700–725`.

### Water, ice, swimming, the body

- `Pool` (`S/platform/location/Pool.ts`) =
  `SwimmableMixin(ShoreMixin(SingletonCartesianLocation))`; `axes:
  ['*']`; `canEngageAxis` returns false when `peekWaterRead(key)?.frozen`.
  ⚠ A `Pool` mints the DEFAULT floor like any Location (a board floor —
  `/stuff/thing/surface/default-floor`), so today `sit` in the estuary
  cove sits you on boards over the water. `ShoreMixin` (`S/lib/location/Shore.ts`): `waters: Record<key,
  citation>`, `waterFor(name?)`, async `waterRefFor(name?)`, sync
  `peekWaterRead(key)`, a 6-hour memo, `commandContributions.inventory:
  DRAW_VERBS`. `WaterRead` (`S/lib/location/WaterSource.ts:39–54`):
  `{ref, atS, name, pending?, frozen, draw: {materialPath, temperatureK}|null}`
  — `draw` is null when frozen.
- `SwimmableMixin` (`S/lib/locomotion/Swimmable.ts`): `axes`,
  `difficulty`, `canEngageAxis(direction)`, `canBeEngagedBy(actor)`
  (the `Enablement` interface, `S/lib/locomotion/Enablement.ts:19–30`).
  Composed only by `Pool` in non-test code. `Mixins.Swimmable` exists
  (`S/lib/mixin.ts:458`); **`MixinApi.isSwimmable` does not.**
- Locomotion: `LocomotionLogic.canTraverseExit` (`S/platform/idea/api/LocomotionLogic.ts:225–252`):
  body plan → posture → `exit.canTraverse` → `checkEnablement` → the far
  side (`farSideEnablement`, l.260–277: destination composes the mode's
  enablement mixin and `canEngageAxis(direction)`, then `engageHost` →
  `canBeEngagedBy(actor)`, l.533–541) → haulage. `swim.yaml`:
  `enablementMixin: SwimmableMixin`, `medium: water`; `walk.yaml`:
  `enablementMixin: null`, `medium: ground`.
- `Mobile.traverse` (`S/lib/spatial/Mobile.ts:395–470`) — the seven
  steps; `crossExit` calls `canExit(mover, exit)` on the source and
  `canEnter(mover, exit)` on the destination (l.918–926, no mode
  argument; `Exitable.ts:197–199` declares them optional), moves, then
  fires `onExited`/`onEntered(mover, exit)` on the places and
  `onTraversed(exit)` on the mover (l.1005–1012). The mover's own say
  is `beforeTraverse?(via): TraversalGuard` (l.109; combat's flee is
  its one implementer today). ⭐ **The attempted mode is readable off
  the mover inside every one of those hooks**: `LocomotionLogic.engageAround`
  (l.416–453) does `actor.setEngagedMode(mode)` BEFORE running the
  action and, in `finally`, clears it only when `isTransientEngagement`
  (l.456–467: passthrough → keep; no enablement mixin → clear; an
  enablement mode whose destination composes the mixin → keep). So a
  swimmer who arrived by `swim` into a Swimmable room keeps `swim`
  engaged; one who walked in has none; and a refused walk out of a pool
  leaves the actor with NO engaged mode — the engaged mode is a fact
  about the last crossing, not a durable "I am swimming" state.
- `ThermalRegulation.effectiveAmbient` (`S/lib/thermal/ThermalRegulation.ts:502–588`):
  ambient from `BiomeApi.resolveTemperatureFor(scope)`, `mediumTag =
  resolveAtmosphereFor(scope)`; `immersion = k(medium)/k(air)`; above 2
  it folds half the gap toward the medium (l.571–573); a wet amplifier
  `sat × thermal.wetHeatLossFactor` (l.579–602). **A pool's biome gives
  air; nothing feeds in water temperature.**
- `WatercourseCatalogue.iceAt(ref, nowS)` (`C/water/src/idea/WatercourseCatalogue.ts:498–`),
  cached per 6-h segment; `running` when `currentMps ≥
  dial('water.ice.stillWaterMps', 0.1)` (l.511–513); `currentMps =
  m3s/(width × depth)` (l.724–726). `computeIce` (l.1622–1685) walks
  `WeatherApi.snowCoverAt(site, climate, now, {onStep})` from a capped
  start: freeze `h = min(cap, √(h² + α²·FDD))` with α-snow when `packMm
  > 0`, thaw `h −= melt·TDD`, `h ≤ 0` resets; quality `snow-ice` when
  ≥ 30 % of FDD came under snow; rotting when > `rotTdd` in 5 days;
  `bearsKg = σh²`. **It has no start date, no `h0 = 0`, no "bare until
  new snow".** `SnowStep {startsAtS, overlapS, airK, phase, packMm}`
  (`S/lib/weather/WeatherType.ts:249–260`) carries enough.
  `waterStateAt` temperature = `max(UNDER_ICE_K=274, airK)` (l.714–717).
  Dials at `C/water/content/settings/water.yaml:81–117`.
- `IceCrossingExit` (`C/transport/src/idea/IceCrossingExit.ts:118–196`):
  `refreshCrossing`, `canTraverse` → `refusalFor(massOf(mover))`
  (open/no-water/running/rotten/thin); the Circle's crossing row
  `C/world-seed/content/world/circle/exits/circle-crossing.yaml`
  (`_crossesReach`, `_bearsMarginKg: 15`). **Left unchanged.**
- Climate content: `C/world-seed/content/stuff/idea/Locality/circle.yaml`
  pins `{type: snow, mode: frozen}`; `north.yaml` pins `{type: clear,
  mode: frozen}`; `WeatherPinMode` is `'frozen' | 'alive'` (alive =
  the type forced, intensity animates by season — `WeatherType.ts:505–511`).
  `Watercourse/circlemere.yaml`: `site: {latitudeDeg: -66,
  continentality: 1, offsetK: 0}`, a `mere` node 200 m wide, 4 m deep.
- Fishing: `FishingController.reachFor` (`C/trade-fishing/src/idea/cmd/fishing/FishingController.ts:36–52`)
  binds the shore's water, used by Fish/Lay/Release controllers.
  **Nothing checks frozen.** `trade-fishing` already depends on
  `@saxonberg/content-water`.
- Buoyancy: no float/sink logic; `Material.getDensity()` exists; no
  bottom container.

### The floor, posture and support

- **Every Location has a floor** (`Location.ensureFloor`, `S/lib/stuff/Location.ts:368–420`,
  run from the base `onCreate`): unless `noDefaultFloor`, it clones
  `this.floor?.template ?? TemplatePaths.defaultFloor` and
  `addFixture(minted, 'floor')`. ⭐ **`FloorSpec.template` names the
  floor ROW a room clones** (`Location.ts:52–61`: `{template?,
  material?, onGrade?, worked?}`), so a row may carry a floor of any
  Floor class without a room subclass. `floorDefaults(onGrade)` answers
  only `{worked, materialPath}`. The floor is a **fixture**
  (`Adornable.fixtureSlots`, read back by `getFloor()`, `Adornable.ts:296–298`),
  has no container, and `setAdornedTo(host)` is its back-reference
  (`Adornment.ts:35, 75`); `resolveUnderfoot()` is awaited right after
  `addFixture`, so the floor knows its room from there.
- **The Floor twin** `S/platform/thing/Floor.ts` =
  `FloorMixin(BulkableMixin(PosturedMixin(SlottedMixin(AdornmentMixin(VisibleMixin(Thing))))))`,
  fixed in place. `FloorMixin` (`S/lib/ground/Floor.ts`): `onGrade`
  (tri-state), `isWorked`, `getGroundKind()` (derived), `hasStandingWater`,
  `getUnderfootMaterialPath/Rung`, `resolveUnderfoot()`, `groundPhrase()`,
  `getSnowDepthM()` (reads `WeatherApi.snowCoverAt`, gated on *on grade
  and under the sky*), `getSnowBand()`, `isSnowPerennial()`, `snowPhrase()`,
  `isFrozenOver()` (the puddle's skin: standing water under air at or
  below freezing, l.621). There is **no `bears()`/standability read on a
  floor**; the only existence question is `noDefaultFloor`. The
  shovelled-snow seam (`snowRemovedMm`) is named in `ground.md` and not
  built.
- **The floor's slot** `ground:1` (`Floor.ts:142–146`): `accepts:
  Slottable`, unbounded capacity, `postures: [Sit, Lie, Kneel, Stand]`,
  `userFacingDetail: 'floor'`. So `stand on the ground` is already a
  posture transfer onto the floor's slot; bare `stand` is slot-less
  (`StandController.ts:76–77` → `vacatePostureBearingSlots()`); `sit`
  has `default: "ground"` (`sit.yaml:20`) resolving to that slot.
- **Who may change a posture.** `PosedMixin` (`S/lib/character/Posed.ts`):
  `transferPosture` (l.276) and `vacatePostureBearingSlots` (l.331) are
  gated `PostureVerbCallers` = the six posture/mount controllers
  (l.82–87); `setPosture` is ungated (l.205). The HOST side is not
  gated: `Slotted.canOccupy(candidate, slot)` (`S/lib/slot/Slotted.ts:328`,
  overridable), `occupy` (l.376–400: calls `canOccupy`, then
  `candidate._noteOccupied(host, slot)` and the claim witness) and
  `vacate` (the chokepoint `Slottable.getOccupiedHost()` reads back,
  `Slottable.ts:142`). `transferOccupancy` is the atomic
  vacate-then-occupy (`Slottable.ts:226–258`). A room move does NOT
  vacate a posture slot (only the conveyance/dismount path does,
  `Mobile.ts:1108–1112`).
- **Ground kinds** (`S/lib/ground/GroundKind.ts`): ten words closed by
  `GROUND_KINDS` (l.55–67); a material's class comes from a tag table
  (`rock/mineral/ceramic/glass → mineral; earth; granular; wood →
  timber; metal/alloy → metal`, l.90–100) with a precedence order; the
  fold `GROUND_KIND_FOLD` (l.143–160) is `f(materialClass, onGrade,
  worked, standingWater)`, `contrived` when nothing matches (l.180:
  *"of no material anything underfoot has a word for"*). The ice
  material's tags `[solid, ice, frozen]` match no class → `contrived`.
- **`lint:ground`** (`server/scripts/check-ground.ts`): (a) the
  unbacked-prose ratchet; (b)/(c) stale entries; (d) every `FloorMixin`
  row says `ground` and `floor` in its keywords; (e) every Location
  `onCreate` override chains `super`; (f) a floor row authors no detail
  named `floor`/`ground`.
- **Respiration** (`S/lib/respiration/Respiration.ts:244–284`) resolves
  the medium from the engaged mode when breathable, else `immersedIn()`
  (the first containment ancestor holding a bulk interior), else the
  scope's atmosphere — a swimmer at the surface breathes air either way.

### The lump, the saw, verbs, readings, seats, packs, the drive

- `S/platform/thing/Casting.ts` = `AlloyedMixin(MeltableMixin(ThermalMixin(Good)))`.
  `AlloyedMixin` (`S/lib/material/Alloyed.ts:99–178`) carries
  `alloying: CompositionEntry[]` + `temper: 'none'|'hardened'`, both
  persistent/authorable/spoiler. Mint sites (lines after the dairy
  merge): `WORKED_LUMP_TEMPLATE = '/stuff/thing/Casting'`
  (`CraftingLogic.ts:111`); the off-spec lump (l.2673–2705, copies
  alloying + temper, `madeFrom: workpiece`); salvage (l.3462–3500: metal
  at `salvageRate`, meltable non-metal at 1.0 with `setAlloying`); glass
  crack/moil (`C/trade-glass/src/idea/cmd/glass/CrackController.ts:30, 104–141`,
  `thing/Gather.ts:40`, `CULLET_ROW = '/stuff/thing/Casting'`);
  `reconcileBulkPhase` (`Thermal.ts:1313–1415`). Rows:
  `C/generic-objects/content/stuff/thing/{Casting,ice-block,ice-lump}.yaml`.
  `alloying:` is authored on two glass rows (`C/trade-glass/.../thing/{melt,amber-melt}.yaml`).
- ⭐ **Moulds (the dairy build, merged `b18743d80`):** `docs/subsystems/mould.md`;
  `S/lib/mould/Mould.ts` (`MouldMixin`, `Mould {castTemplateFor(material),
  castInto(pool: SetPool)}`, `SetPool`, `MadeFromHolding`); the twin
  `S/platform/thing/Mould.ts` = `MouldMixin(Durable(Crafted(Thermal(Bulkable(Container(Good))))))`.
  *The container decides; the material sets*: at the set site
  `template = mould?.castTemplateFor(material) ?? material.getCastTemplate()`,
  destination = the mould itself else the vessel's scope.
  `reconcileBulkPhase` (`Thermal.ts:1386–1399`) now calls
  `v.castInto({material, massKg, payload, stampMaterial:
  !mat.hasTag('liquid')})` when `MixinApi.isMould(v)`, else the old
  path (`mat.getCastTemplate()` cloned beside the vessel, l.1401–1415).
  **Water's `castTemplate` is now `/stuff/thing/ice-lump`**
  (`base-library/.../bulk/water.yaml:28`): a pail frozen sets a LUMP
  beside it; **`ice-pan.yaml` is `class: /platform/thing/Mould` with
  `castTemplate: /stuff/thing/ice-block`**: the squared block sets INSIDE
  the pan. New row `ice-lump.yaml`: `class: /platform/thing/Casting`,
  `_materialPath: /trade/bottling/idea/material/ice`, mass 1, 268 K. The
  ingot mould casts an `Ingot` (Alloyed) the same way. Dairy's
  `trade-dairying` and the Hearts Delight creamery use no ice: no new
  consumer, no collision. `mould.md § Deferred` names *"the pool's
  payload onto a non-food cast (dirty water → a dirty block)"*.
- The ice material: `C/trade-bottling/content/trade/bottling/idea/material/ice.yaml`
  (917, k 2.2, c 2100, melting 273, L 334 000, tags `[solid, ice,
  frozen]`, `edibility: true`). Referenced by `ice-block.yaml`,
  `ice-lump.yaml`, `C/trade-hospitality/.../ice-bin.yaml:12`,
  `C/trade-bottling/.../ice-bag.yaml:12`, `S/world/__tests__/libations-annexes.test.ts`.
- `SawController` (`C/trade-carpentry/src/idea/cmd/carpentry/SawController.ts`):
  `BOARD_KG 6`, `QUARTER_YIELD 2/3`, `boardsFrom` (l.298–302);
  `finishSaw` (l.313–365) clones one Stackable board of quantity
  `boards`, consumes the log, lands at the saw's room. The remainder is
  never minted. The sawmill row: `C/hearts-delight/content/world/terminus/hearts-delight/location/sawmill.yaml`
  (a `Street`, `props: [sawmill-race, /trade/carpentry/thing/sawmill,
  pit-saw, timber-yard]`, cast the sawyer); its business
  `idea/sawmill-business.yaml` (sawyer seat, `operatingLocations` room +
  counter).
- Verbs. `cut`: `C/trade-tailoring/.../cmd/tailoring/cut.yaml` (`cloth`
  requires `StackableMixin`; `shears` default `reachable:[capability.cutting]`;
  options `for/tight/generous`), afforded by `CuttingTool`
  (`environment` + `peers`, `C/trade-tailoring/src/thing/CuttingTool.ts:25–31`),
  controller a 248-line `ManualBuildController` whose act is
  `this.engageStep(context, {durationMs, effortW, beginSelf, beginPeers,
  onComplete})` (`CutController.ts:118–146`; `ManualBuildController`
  offers `engageStep`, `bestInstrument`, `paceMs`, `declineStep`).
  `plough`: see problem 1. `measure`/`analyze` are flat over reading
  rows (`C/platform/.../cmd/perception/measure.yaml`; the `tool` arg
  is `objects` with default `reachable:[mixin.ToolMixin]`, the Reading
  narrows). `lint:verb-collisions` (`server/scripts/check-verb-collisions.ts:93–99`)
  amnesties only lease/unlease/pour. `mark`, `scrape`, `deposit`,
  `withdraw` are free at the top level; `stand`, `sit`, `lie` and
  `swim` are the shipped posture/movement verbs this build extends
  rather than adds to.
- Readings: row shape `<root>/idea/reading/<channel>.yaml` with `class,
  channel, kind, scope [self|here|subject], subjectRequires, discipline,
  instrument, instrumentNoun, eyeCeiling, improves, stakes`
  (`C/water/.../reading/depth.yaml`; coopering's `capacity.yaml` uses
  `instrument: gauging`, `instrumentNoun: a gauging rod`). Base
  `S/lib/instrument/Reading.ts`: `runMeasure` (l.425–470, narrows the
  bound tools by the declared capability, bands by competence and the
  instrument ceiling), `observed`/`bracketed` (l.714–745).
  `WaterReading.iceLine` (`C/water/src/idea/reading/WaterReading.ts:74–96`)
  bands the sheet by competence.
- Tools: `Tool` = `CraftedMixin(ToolMixin(DurableMixin(Good)))`
  (`S/platform/thing/Tool.ts`); `capabilities:` on rows with
  `{rate, control, working}` specs (`S/lib/craft/ToolCapability.ts`).
  `lint:capabilities`: a kind exists iff a consumer asks for it (a view
  `[capability.X]`, a recipe slot, or a literal `hasCapability('X')`).
  Rows: tongs `gripping` (`C/trade-mining/.../tongs.yaml`), auger
  `boring` (`C/trade-forestry/.../auger.yaml`), draft horse 700 kg
  (`C/transport/.../draft-horse.yaml`, a `DraftAnimal`).
- Packs: `pack.yaml` `{id, version, root, description, requires: {groups,
  title}, boot}`; `package.json` named `@saxonberg/content-<id>`, deps =
  install order; the ROOT `package.json` lists every pack. Venue pack
  precedent `C/hearts-delight/pack.yaml` (group + title under
  `/world/terminus`, parentParcel `/world/terminus`, `landUse`).
  Structure rows: `C/terminus/.../terminal/structure.yaml`
  (`extent`, `entrance`, `landmark`, `heightM`). The rubber addendum:
  walls go on the ROOM's `enclosure:`; a one-place Structure is fine.
- Wire: `packages/wire/src/harness/` exports `Session, declareFile,
  uniqueHandle, expectOk, expectRefused, expectNote, expectOkOr,
  isOwnedTestWorld, advanceWorldClock, worldClockNow, installedPacks,
  assertPacksPresent`. The climate drive's `refusal()` reads
  `controller-rejected | command-rejected | locomotion-gate-failed`
  (`tests/climate-and-water.dirty.wire.test.ts:130–142`); `goto`
  re-opens the session at a path (l.110–114); `nextDay` asserts the
  clock moved (l.155–160). The assembly drive restarts the world
  (`tests/assembly.dirty.wire.test.ts:625–678`: wait for saves,
  `dev-preflight.mjs` kill, `bootOwnedWorld()`, `stopOwnedWorld()` in
  `afterAll`). No season helper; 360-day year.
- Lints likely to bite, all in `lint:family`: instanceable-placement,
  location-graph, location-classes, counters, reachability, perishable,
  lib-statics, object-verbs, mixin-names, module-scope, mud-imports,
  schema-docs, envelope, shopfronts, capabilities, verb-collisions,
  menu-staff, mass, ground, drive-scripts, closed-vocabularies,
  instrument-args, unconsumed-seams, test-bootstrap.

---

## Plan-level decisions

### Storage

**D1 — A new kernel subsystem, `S/lib/storage/`.** Storage is
substrate with composers in three packs (the ice trade's stack, the
haulage depot, carpentry's sawdust as a poolable good) and no common
pack ancestor, so it is the kernel's (CLAUDE.md § Module Categories).
No existing subsystem folder is its home: `lib/retail/` is front of
house, `lib/spatial/` is containment, `lib/stuff/Stackable.ts` is a
quantity on one object. Four files:

| file | category | what |
|---|---|---|
| `lib/storage/StoreLine.ts` | value object | `StoreLine {goodPath, poolKey, amountKg, unitMassKg, state: Record<string, number>, lossKgPerDay, drawKgPerDay, lastReconciledS}` and its coerce/serialize |
| `lib/storage/Receipt.ts` | value object | `StoreReceipt` (D6) + `ReceiptTerms` |
| `lib/storage/Poolable.ts` | mixin `PoolableMixin` | the good's declaration (D2) |
| `lib/storage/Store.ts` | mixin `StoreMixin` | lines, the face, deposit/withdraw/absorb/draw, reconcile, capacity, the heat exchange, claims (D3–D7) |

Kernel `Mixins` gains `Store`, `Poolable`; `MixinApi.isStore`,
`isPoolable`. Instanceable twin: `S/platform/thing/Stockpile.ts` =
`PersistableMixin(StoreMixin(Holder))` — a fixed, OPEN holder whose
contents are the faces (D3); no `PlacingMixin`, because a thing placed
`on` a host lives in the room, not in the host (Grounding). The name is
a noun for what it IS (a stockpile), never an adjective.

**D2 — Poolability is the good's declaration, as instance methods on
`PoolableMixin`, mirroring `Stackable`'s `canMergeWith`/`onMerged`.**
The store calls them on a line's **face** (D3), which always exists
while the line has stock; when a face has just destructed, the store
re-faces before it reconciles. **A line is keyed by `poolKey()` alone,
and a `poolKey` names the GOOD by what it is, not by its row**: ice's
is `ice|<quality>` whether the object is `/stuff/thing/ice-block` or
`/stuff/thing/ice-lump` — a lump of pan ice and a squared block of pan
ice are the same matter at the same grade, and pooling them is lens 1
(the store holds frozen water by quality; shape is not a property the
melt or the receipt cares about) and lens 2 (a keeper never has to
author a second line because a bucket froze instead of a pan). The
line's `goodPath` is the template of the FIRST deposit and is what a
withdrawal or a bring-up rematerializes; the house's seeded line names
the block. So a house that took in lumps pays out blocks of the same
grade at the same mass per unit — honest, because a cut block and a
pan lump at 0 °C are indistinguishable as ice, and the alternative (a
line per row) would let a depositor demand "my lumps back" from a
commingled pool, which is exactly what commingling means they cannot.

```ts
interface Poolable {
  poolKey(): string;                 // good + the band it pools with: ice → iceQuality; sawdust → wetness band
  poolState(): Record<string, number>;      // what it keeps: ice {temperatureK}; sawdust {saturation}
  mergePoolState(a, massA, b, massB): Record<string, number>;   // ice: mass-weighted temperature; sawdust: mass-weighted saturation
  applyPoolState(state): void;       // on rematerialize: ice stamps its temperature; sawdust its wetness
  poolRole(): 'stock' | 'packing';   // sawdust answers 'packing'
  reconcileInStore(ctx: StoreConditions): StoreResponse;   // what time does to this good in a store (D4)
}
```

`StoreConditions = {massKg, state, ambientK, dtS, surfaceM2, packing:
{depthM, kWmK} | null}`; `StoreResponse = {massKg, state, heatW,
meltwaterKg}`. The base `reconcileInStore` is inert (returns the inputs,
`heatW 0`). Composers in this build: `IceBlock` (D17) and `Sawdust`
(D18). Timber's seasoning is the slate's example and is NOT composed
here (the timber yard migration is deferred by the requirements).

**D3 — The face: a store holds counts, and shows exactly one real
object per line — the top of the stack.** `get`/`put` are platform
verbs that bind real objects (`get.yaml` binds one greedy `targets`
over `peers`, which reaches into an open holder in the room and has no
`from`; `put.yaml` binds a `ContainerMixin|PlacingMixin` target), and a
count cannot be bound. So for every line with `amountKg > 0` the store
keeps ONE materialized exemplar **in its own contents** — the stockpile
is an open `Holder`, as an open ice pan is a `Mould` whose set block
you `get` out of it — a clone of the line's `goodPath` at `unitMassKg`
carrying the line's state (`applyPoolState`). The line's `amountKg`
INCLUDES the face.

- `put <good> in <stack>` (`in`/`into` — the container's own interior,
  `PutController`'s `zero` branch; the stack row's keywords carry
  `stack`, `pile`, `ice` so the target binds) → the stockpile's
  `canAddContainable(item)` (capacity, D7; the item must be Poolable and
  its `poolKey()` one the store accepts or the store accepts any —
  `acceptsPoolKeys: string[] | null` authored, null = any; refused in
  the host's words) → `ContainmentApi.move` → `onContainableAdded(item)`:
  if a face for that key already exists, **absorb** (`line.amountKg +=
  mass`, `state = mergePoolState`, `unitMassKg` mass-weighted, destruct
  the item); else the item BECOMES the face (a new line is opened from
  it). The putter is read in `canAddContainable` while the item is still
  in their hands (`item.getContainer()`), kept in a transient
  `pendingPutters: Map<stuffId, identityPath>` and consumed by
  `onContainableAdded` — the only way an actor reaches the hook, since
  `ContainmentApi.move` carries none. The house's claim rises iff the
  putter is on shift for the store's business (D6); otherwise the stock
  rises and no claim does — pilferage in reverse, which is also honest.
  ⚠ `put <good> on <stack>` is refused by the verb (the holder offers no
  `on` region); the help text and the stack's description say *in*.
- `get <good>` (plain; a word the face answers to — `block`, `ice`,
  `sawdust`) takes the face out of the open holder → `onContainableRemoved(face)`:
  if `!face.isDestroyed()` the line's `amountKg −= face mass` and no
  receipt changes (off the books); then `void this.reface(key)` —
  ⚠ keyed on the LINE's stored key, never `face.poolKey()` (a face's
  wetness band can drift once Things integrate long gaps; cleanliness)
  (fire-and-forget clone, the `reconcileBulkPhase` precedent). If the
  face DESTRUCTED (an ice face that melted away as an object between
  reconciles) the line is NOT debited again — the line's own physics
  already took it — only re-faced. ⚠ With a face in the house AND a
  loose block on the floor, `get block` binds both and `get 1 block`
  picks one; the drive uses `get 1 block` where it matters and asserts
  the stack's count.
- Every `reconcile()` re-stamps each face from its line (mass to
  `unitMassKg`, `applyPoolState(line.state)`), discarding whatever the
  face's own object clock did meanwhile; the face is a VIEW of the
  line. ⚠ An ice face's `ThermalMixin` runs in the house's air; in a
  cold house that drift is small and overwritten on the next read.
- `look <stack>` (`getLong()` override) describes the lines in WORDS
  from the counts (fullness against capacity in bands; the packing's
  wetness band; *"a block of ice on top"* is the face, visible as an
  ordinary content). No number is printed by `look`.

**D4 — The lazy reconcile, and where the conditions come from.**
`StoreMixin.reconcile()` runs on every read of the store (`look`,
`measure`/`analyze stock`, `deposit`, `withdraw`, `drawForHouse`,
`canAddContainable`) and integrates each line from `lastReconciledS` to now:

1. **The outside air over the gap** comes from the weather walk, not
   from the room's stale `envelopeOutsideK`: the store asks
   `WeatherApi.snowCoverAt(site, locality, now, {onStep})` for the
   segments since its last read (the exact walk `computeIce` uses;
   `site`/`locality` resolved exactly as `BiomeLogic.outsideKFor(scope)`
   resolves them for the store's air scope — the build agent reads
   `BiomeLogic.ts:1196` and reuses that resolution; if it is not
   callable from `lib/`, expose it as `AtmosphericMixin.outsideSegmentsSince(sinceS, {onStep})`
   on the scope, one method, so the room still owns its outside).
2. **The room's temperature per segment** is the room's answer:
   `scope.envelopeSteadyStateK(outsideK, atS)` — a new method on
   `AtmosphericMixin` that evaluates the closed-form steady state from
   `envelopeCoefficients()` and the occupants' exchanges (D5), the same
   formula `reconcileEnvelope` uses (folded in, one place). At a 6-h
   segment the shed's τ (hours) makes steady state honest.
3. **Per line**, `surfaceM2 = stackShapeFactor × (amountKg/ρ)^(2/3)`
   (ρ the good's material density; `stackShapeFactor` authored on the
   store, default 5: a block stack on a floor exposes five faces), and
   if a `packing` line exists, `depthM = (packingKg/ρ_packing_bulk) /
   surfaceM2` and `kWmK = packingMaterial.wetProperty(k_dry, 0.6,
   packingSaturation)` (D9). Then `good.reconcileInStore(ctx)` → new
   mass/state, `heatW`, `meltwaterKg`.
4. **Meltwater soaks the packing:** `wetKg = meltwaterKg × (1 −
   drainage)` (`drainage` authored on the store, `[0,1]`, default 0.5)
   raises the packing line's `saturation` by `wetKg / (packingKg ×
   wAC/100)`, clamped to 1. Only the meltwater path is in.
5. `lossKgPerDay` is updated from this reconcile; `drawKgPerDay` is an
   exponential moving average of withdrawals (window 30 days), updated
   by `withdraw`/`drawForHouse`. Both feed days of supply (D8).
6. Capture (`PersistableApi.capture(this)`) when anything changed, at
   most once per segment.

The icehouse arithmetic the build pins in a unit test (W2): a 20 t
stack packed in 2 t of dry sawdust in a 48 m³ shed with 0.4 m sawdust
walls, outside 20 °C, loses ~28 kg/day (≈ 17 % over a 120-day summer);
a 2 t stack in 0.2 t loses ~9 kg/day (≈ 50 %); the shed reads ~8 °C
beside an empty shed at 20 °C. Those are the AC's three inequalities,
derived.

**D5 — The heat sink is a conductance to the stock's temperature,
through one occupant protocol with TWO implementers.** `SpaceHeating`
cannot carry it (it reads `isLit` off a `Burner`; its own docstring
says why). A sibling `HeatSinkMixin` would be a hook with one
implementer. So the ENVELOPE's occupant read becomes a protocol by
shape, `lib/thermal/RoomHeatExchange.ts`:

```ts
export interface RoomHeatExchange { fixedW: number; conductanceWperK: number; anchorK: number }
export interface RoomHeatExchanging { roomHeatExchange(): RoomHeatExchange }
```

`SpaceHeatingMixin` implements it as `{fixedW: spaceHeatOutputW(),
conductanceWperK: 0, anchorK: 0}`; `StoreMixin` as `{fixedW: 0,
conductanceWperK: Σ surfaceM2/(depthM/kWmK + rFilms) over melting lines,
anchorK: 273.15}` (zero when no line is at its plateau).
`reconcileEnvelope` sums both terms over `occupants()` (shape check:
`typeof o.roomHeatExchange === 'function'`, replacing the
`isSpaceHeating` narrowing) and the steady state becomes

`T_ss = (U·outside + Σ fixedW + driveW + Σ G_i·anchor_i) / (U + Σ G_i)`,
`τ = C / (U + Σ G_i)`.

That is the coupled solve in closed form (a cold mass coupled through
its packing), no iteration. The setpoint clamps are unchanged. A
`ClimateControl` cold room is untouched (its term is the scope's own).

**D6 — Custody: receipts on the kernel, the book is the instrument,
the keeper is a seat.**

- `StoreReceipt` (`lib/storage/Receipt.ts`): `{receiptId, bailee,
  depositor, good, poolKey, unit: 'kg'|'count', amountKg,
  originalAmountKg, unitMassKg, terms: {allowancePct, feeMinorPerKg},
  what, filedAtS, settledAtS?}`. Written with the EXISTING kind
  `warehouse-receipt` through `DocumentApi.saveAsBusiness(bailee,
  `${baileePath}/warehouse-receipts/${id}`, 'warehouse-receipt', record)`
  — the closed `BUSINESS_DOCUMENT_KINDS` stays at three; the kind's
  record shape widens (the haulage `WarehouseReceipt` fields are a
  subset: `goodsPath` → `good`, a unique good is `unit: 'count'`,
  `poolKey = chattelId`, `amountKg = 1`). Issue/read move onto
  `StoreMixin` (`issueReceipt`, `receiptsFor(depositor)`,
  `claimsOn(poolKey)`); `WaybillRegistry.issueReceipt` forwards to the
  store for one release and its `WarehouseReceipt` type is re-exported
  from `lib/storage/Receipt.ts` (haulage's bills of lading are untouched).
- **The house's claim** is a receipt in the business's own name
  (`depositor = businessPath`), one running receipt per `poolKey`,
  incremented by staff `put` on shift and decremented by staff
  `withdraw` on shift and by the counter's `drawForHouse` (D8).
- **The predicate's home:** `Employed.isOnShiftFor(organizationPath)`
  = `getEmployment(organizationPath)?.isOnShift() ?? false`, one method
  beside `isOnShift()` (`S/lib/employment/Employed.ts`). The store
  reads `MixinApi.isEmployed(actor) && actor.isOnShiftFor(this.businessPath)`.
- **Keeper present:** the store row authors `keeperPositions: string[]`
  (the Stock `serverPositionKeys` precedent); `custodianIn(room)` returns
  the first occupant employed by the house, on shift, in one of those
  positions, else null. Two new top-level verbs, kernel category
  **`custody`** (`C/platform/content/platform/cmd/custody/{deposit,withdraw}.yaml`
  + `S/platform/idea/cmd/custody/{Deposit,Withdraw}Controller.ts`):
  - `deposit <thing> [in <book>]` — `thing` from inventory, Poolable or
    any Containable (a unique good is a live deposit, the depot's case);
    `book` default `reachable:[mixin.StoreBookMixin]`.
  - `withdraw <n> <good> [from <book>]` — `n` optional (default 1 unit).
  The affording instrument is **`S/platform/thing/StoreBook`**
  (`StoreBookMixin(Thing)`, fixed in place, field `storePath`), composed
  as the house's book standing on the platform beside the counter; it
  affords both views via `peers` (whoever shares the room). `book.getStore()`
  resolves the live stockpile. The verb goes on the instrument that
  performs the act, never on the keeper and never on the room; the book
  also answers `look book` with the outstanding claims by line.
- **Sequence (the mixin owns it; controllers resolve, call, render):**
  `deposit`: `store.reconcile()` → `store.custodianIn(actorRoom)` else
  refuse `no-keeper` *"Nobody is keeping the book just now."* → a staff
  actor on shift needs no keeper → `store.deposit(item, actor)` →
  absorb into the line (D3; the item is moved into the store by
  `ContainmentApi.move` then absorbed, never the controller's move) →
  issue/increment the receipt in the depositor's name → return
  `{receiptPath, amountKg, terms}`; the controller prints the receipt.
  `withdraw`: reconcile → custodian (or staff on shift → the house's
  claim) → `store.withdraw(actor, good, nKg)` → the payout rule (below)
  → mint objects (`StuffApi.clone(goodPath)`, `applyPoolState(line.state)`,
  `setMass(unitMassKg)`), decrement line and receipt, charge the fee
  (`EmploymentApi.settleSale(store.getIdentityPath(), fee, fee, 'storage
  fee')` — the store sits in an operating location of the house, so the
  operator index resolves it; the drive asserts the house's account
  rose) → hand over. Refusals are returned values, rendered by the
  controller.
- **The payout rule.** For the line (good, poolKey): `S = line.amountKg`,
  `C = Σ receipts.amountKg` (the house's included — pooled goods are
  owned in common). `f = min(1, S / C)`. A withdrawal of `n` kg against
  a receipt pays `min(n, receipt.amountKg × f)`, and the receipt is
  debited by the AMOUNT CLAIMED (`paid / f`), so a run pays everyone
  pro rata until settled. The allowance decides nothing about the
  payout; it classifies the shortfall on the record: the settlement
  writes `shortfallPct` and `withinAllowance = (1 − f) ≤ allowancePct/100`
  onto the receipt, and `look book` shows a line beyond its allowance.
  *The engine reports; the courts judge.* (The requirements' two
  sentences — within the allowance nobody's fault, beyond it shared
  pro rata — are both satisfied: the sharing is always pro rata; the
  allowance is the printed line that makes a shortfall ordinary or a
  claim.)
- **Stocktake** is the kernel reading `stock`: `S/platform/idea/reading/StockReading.ts`
  + `C/platform/content/platform/idea/reading/stock.yaml` (`scope:
  [subject]`, `subjectRequires: StoreMixin`, `discipline: appraisal`,
  `instrument: gauging`, `instrumentNoun: a gauging rod`, `eyeCeiling:
  competent`). `measure stock <stack>` prints each line's amount
  `observed ± bracket` by band and the packing's saturation in words;
  `analyze stock` is words only (*"a little under half full"*). The
  keeper compares the reading with the book by eye; the engine prints
  no verdict. The gauging rod is coopering's existing instrument kind;
  the ice company's keeper carries one (a `props:` tool row in the
  house room: `/stuff/thing/gauging-rod` if it exists in the commons,
  else the trade-coopering row path the build finds by
  `grep -rn "capabilities:.*gauging" packages/content`).

**D7 — Capacity is mass at the container's own veto.**
`Stockpile.canAddContainable(item)` (the optional `Container` witness
`PutController` asks first and `ContainmentApi.move` asserts): `Σ
lines.amountKg + item mass ≤ capacityKg` (authored), refused `{ok:
false, reason: 'The house is full.'}` — `PutController` prints the
reason in the host's words (`refused-by-container`). A full store is a
legitimate world state, refused at the verb; `ContainmentApi.move`'s
own assertion of the same hook is what stops a brain's forced put
overfilling it.

**D8 — Retail: a third stock source, "brought up to order".**
`StockLine.source?: string` (a store's template path) on
`S/lib/retail/Stock.ts`. A sourced line is never cloned and never
bought: `reset()` skips it like a supplied line, and a new
`Stock.bringUp(itemTemplatePath): Promise<number>` draws `par − onHand`
units from the store **on the house's claim** (`store.drawForHouse(goodPath,
kg)` → mints objects, debits the house's receipt and the line) and moves
them onto the shelf; returns how many came up (0 when the house's claim
is empty — *an empty store means an empty counter*). `bringUp` is called
from `reset()` for sourced lines (the sweep) and from `BuyController`'s
sold-out branch before it refuses (so a block is brought up the moment
somebody asks for one: *to order*). `par` on the ice counter is 1.
**Pricing:** for a sourced `stocking` line, `priceFor` replaces the
shelf term with the STORE's days of supply: `days = store.daysOfSupply(goodPath)`
= `amountKg / max(ε, lossKgPerDay + drawKgPerDay)` summed over the
line's keys the house holds; `price = max(1, round(base × (1 + e ×
clamp(1 − days/horizon, 0, 1))))`, `horizon = retail.stockingHorizonDays`
(new setting, default 120). Deep in spring, `days ≥ horizon` → base;
late summer → base × (1 + e). A keeper's authored `prices:` still wins
for a `fixed` line.

**D9 — ONE wet law, on `Material`, as instance methods; cloth migrates
onto it; rubber consumes it.** Verbs on objects: the law is about a
material, so it lives on `Material` (`S/lib/material/Material.ts`):

```ts
permeability(): number   // 0 when wAC ≤ dial('wetness.impermeableBelowPct', 2); else min(1, wAC / dial('textiles.clo.absorptionReference', 40))
wetProperty(dry: number, fluid: number, saturation: number): number   // dry + saturation × permeability() × (fluid − dry)
```

`Wearable.getClo` replaces its `soak`/`kVoid` arithmetic with
`kVoid = material.wetProperty(K_AIR, K_WATER, wetness)`; a test asserts
the clo of every shipped textile row is byte-identical before and
after (rubber verified no shipped textile/leather row has wAC ≤ 2, so
the new cutoff changes no shipped outcome). The setting
`wetness.impermeableBelowPct` is minted here with rubber's key so rubber
reads it rather than minting a second; `textiles.clo.absorptionReference`
is hoisted, not duplicated. Readers after this build: cloth (thermal,
shipped), the icehouse packing (thermal, D4), rubber's contact
resistance (electrical, theirs — `contactResistanceImpl` calls
`material.permeability()`). The build agent checks `reqs/rubber` at
build time: rubber's D12.1 states the SAME two `Material` instance
methods, the same signatures and the same `wetness.impermeableBelowPct`
key (verified 2026-10-17). If rubber has landed first, this build
consumes them and adds neither the methods nor the settings row (see §
Parallel builds).

### Cold water, wetness, the frozen pool

**D10a — The immersion fold is ONE body method**,
`ThermalRegulationMixin.exchangeWithWater(waterK: number, dtS: number)` (agreed
with cleanliness, 2026-10-17): the shipped immersion fold (water's
conductivity against air's, the half-gap fold, the wet amplifier) lifted
out of `effectiveAmbient` into a public method `effectiveAmbient` calls
for a swimmable scope (D10), and that cleanliness's tub and river-shore
`bathe` call once per bathing step, so a river bathe chills by the same
law as a pool swim. No second formula anywhere.

**D10 — A swimmable place says who is in its water, and the body reads
it; "in the water" is derived from SUPPORT.** `SwimmableMixin` gains
`immersionOf(occupant: Stuff): {mediumTag: 'water', temperatureK:
number} | null`. Base: an occupant is immersed unless it is **supported
by the host's floor** — `MixinApi.isSlottable(occupant) &&
occupant.getOccupiedHost() === floor` where `floor` is the host's
`getFloor()` (a host with no floor, a flooded room, immerses everyone);
temperature = the host's scope temperature. `Pool` overrides the
temperature only: `peekWaterRead(key)?.draw?.temperatureK ?? 274` (the
read's draw is null when frozen → 274 K, the under-ice floor). There
is no per-occupant flag anywhere: standing, sitting or lying on the
floor's slot IS support, and not holding it in a swimmable place IS
swimming — the engaged `swim` mode is set for the sense consumers when
a body goes in (D12), but nothing derives immersion from it, because
`engageAround` clears a transient mode on every refused crossing
(Grounding). `ThermalRegulation.effectiveAmbient` asks, right after the
biome reads: `if (scope && MixinApi.isSwimmable(scope)) { const im =
scope.immersionOf(host); if (im) { ambientK = im.temperatureK;
mediumTag = im.mediumTag; } }` — then the shipped immersion fold and
the wet amplifier do the rest. `MixinApi.isSwimmable` is added (the
`Mixins` constant exists). One implementation on the mixin plus one
temperature override on `Pool`; a method behind a mixin predicate, not
an optional hook.

**D11 — Going into water soaks you and what you wear.** `Attired.immerse(parts?:
(partKey: string) => boolean)`
(`S/lib/slot/Attired.ts`, beside the existing part walk): `this.wet(1)`
on the body and `layer.wet(1)` for every layer at every exterior part
(`coveringAt(part.key)`) the optional filter admits (no filter = every
part; rubber's flooded cell calls it with the foot parts, cleanliness's
`bathe` with none — both siblings consume this exact signature); a
non-Attired Wet thing gets `wet(1)`. ⚠ **`immerse` stays
side-effect-only (it wets; it computes no heat)** — cleanliness puts its
rinse line inside it (climbing out of a river rinses mud and sweat).
Callers: `Pool.onEntered(mover, exit)` when `immersionOf(mover)` is
non-null after the support check; `WaterSurface.giveWay(occupant)`
(D12); and `ThermalRegulation.restamp` re-immerses while
`immersionOf(host)` is non-null, so the drain does not dry you while you
swim. Rubber plans `Attired.exposeToRain(delta)`
on the same host (their D12.2); different method, no conflict; the
second to land re-reads the file.

**D12 — The ice is the pool's FLOOR. One place (the kernel `Pool`), a
floor row the water pack ships, and support instead of location.** A
phase change never creates or removes space: the pool is maritime's
small water you are in, and its floor is the water's surface — ice when
frozen and bearing, not standable when open. Three layers, each on the
host that already answers its question:

- **A kernel water-surface floor** — `S/platform/thing/WaterSurface.ts`
  extends the `Floor` twin (`platform/thing/Floor`), row
  `/stuff/thing/surface/water-surface` (generic-objects; keywords
  `[water, surface, floor, ground]` for `lint:ground` (d)). It adds to
  `FloorMixin` two kernel reads that every floor now answers:
  `bears(loadKg): boolean` (base `true`: ordinary ground bears
  anything) and `supportIsSlotted(): boolean` (base `false`: on ordinary
  ground standing is the free posture). `WaterSurface` answers `bears →
  false` and `supportIsSlotted → true`, overrides `Slotted.canOccupy(candidate,
  'ground:1')` with `bears(candidate mass)` (so `sit`/`lie`/`stand on
  the ground` are refused on open water in the slot host's own words),
  and owns **`giveWay(occupant)`**: `vacate('ground:1', occupant)` if
  held, `occupant.setEngagedMode(swim)`, `immerse()` (D11), and the
  scene *"the ice gives under you and you are in the water"* / *"you go
  in"*. ⭐ **`Pool` names it as its default floor** by setting
  `this.floor = { template: TemplatePaths.waterSurface }` in its
  constructor (a class default any row's `floor:` overrides) — so the
  estuary cove's floor is water from this build, and `sit` on it is
  refused honestly (today it sits you on boards).
- **The ice sheet** — `C/water/src/thing/IceSheet.ts` extends
  `WaterSurface` (the water pack reads `WatercourseCatalogue`, which the
  kernel cannot), row `/system/water/thing/ice-sheet` (keywords `[ice,
  sheet, field, floor, ground]`, `_materialPath: /stuff/idea/material/bulk/ice`,
  `onGrade: false` — nothing continues beneath; the bed is the
  underwater slate's). The Hollow Mere pool row is a plain
  `/platform/location/Pool` with `floor: { template:
  /system/water/thing/ice-sheet }`. **No `FrozenPool` subclass exists**:
  the room names its floor through `FloorSpec.template` and every hook
  the pool needs is generic over the floor protocol below. A second
  harvest pool is a row.
  - **The log is the floor's: areas by history.** `log: PatchRecord[]`
    (persistent, runtimeState) `{id, kind: 'field'|'scraped'|'marked'|'cut'|'broken'|'hole',
    areaM2, sinceS, gridM?}`; `areaM2` seeds one `field` patch on first
    read (authored on the floor row via the room's `floor:` spec is not
    possible — `FloorSpec` is closed — so `areaM2` is authored ON the
    sheet row, and a pool of another size `extends:` it).
  - **Scraped = the floor's cleared-snow seam, per area.** The
    `snowRemovedMm` seam `ground.md` names is taken by the log: a
    `scraped` patch is bare from `sinceS` until the next step with
    `phase: 'snow'`; the field's `getSnowDepthM()` is the sheet's
    (overridden to read the walk when frozen regardless of `onGrade`,
    since snow lies on ice; 0 when open). `snowPhrase()` reads *"the
    scraped patch shows bare"* beside the field's band.
  - **The patch walk** is one extension of `computeIce`:
    `iceAt(ref, nowS, opts?: {openedAtS?: number; bareFromS?: number})`
    — with `openedAtS` the walk discards every step before it and starts
    `h = 0` (a cut is open water on its date); with `bareFromS` every
    step after it reads `packMm = 0` until the first snow step after it.
    The cache key includes the opts; the field patch is the plain
    `iceAt`. `Ice.test.ts` pins: a cut patch regrows thinner than the
    field; a scraped patch is thicker and black after the same cold;
    new snow ends the bare run.
  - **`bears(loadKg)`** = some patch with `areaM2 > 0` has
    `iceAt(patch).bearsKg ≥ loadKg` and is not rotting; a person stands
    on whatever area still bears them. **`canOccupy`** inherits it. A
    hole is floor area with no ice (`kind: 'hole'`, `thickness 0` from
    `openedAtS`); there is no down exit, ever.
  - **`giveWay`** (inherited, extended): the patch that failed splits
    off a `broken` patch of `patchFootprintM2` (authored, default 1) at
    `sinceS = now` before the kernel drop runs — so the hole somebody
    went through is open water in the log.
  - **`reconcileSupport()`** — the catch-up: for every occupant holding
    `ground:1`, if `!bears(mass)` → `giveWay`. Called by the pool's
    hooks below and at the top of every sheet read (`groundPhrase`,
    `bears`, the acts), so spring rot under a crew still working drops
    them at the next read.
  - **`groundPhrase()`** lists the patches in words with their keywords
    (*the snowy field, the scraped patch, the marked grid, the channel,
    the hole*) — the room's `look` already appends the floor's sentence
    through its markup augmenter, and `look ice`/`look field` reads the
    floor by keyword. The kind: a new eleventh word **`ice`**, folded
    from a new material class `ice` (tag `ice`) with phrase *"frozen
    hard"* — lens 1: it is a word anyone underfoot has, and `contrived`
    (*no word for it*) would be false of a sheet you stand on; lens 2:
    a frozen puddle elsewhere stays its earth kind plus the skin (the
    ten words were closed against snow ON the ground; ice that IS the
    ground is the exception the fold was built to take). When the
    sheet is open the sheet's `getUnderfootMaterialPath()` answers
    water, which folds to `contrived` — honest, because nobody stands on
    it — and `groundPhrase` says *open water*.
  - **Float and sink.** At the thaw (and only then — an item does not
    record which patch it lies on, a simplification named under Risks),
    `reconcileSupport()` sorts every unheld content of the pool by its
    material's density against 1000 kg/m³: floats stay in the pool's
    contents; sinkers go `in` the **bottom**, a `props:` Holder row
    `/system/water/thing/pool-bottom` (class `C/water/src/thing/PoolBottom.ts`
    = `SealableMixin(Holder)`, shipped shut with no `open` affordance —
    a shut Sealable's contents are neither perceived nor reachable:
    *kept but unreachable until diving*).
  - **The thaw wipes the log.** When the field patch reads thickness 0
    (open, not `running`): `log` collapses to one `field` patch of the
    full area, every occupant holding the slot is given way, contents
    are sorted. A frozen sheet never resets the log.
  - **Persistence.** The sheet is a fixture with no container, so
    `captureHostOf` cannot reach it; it composes `PersistableMixin`
    itself and establishes its own record keyed by its pool:
    `restoreOrSeed(this, poolPath)` in `resolveUnderfoot()` (the room
    is `getAdornedTo()` there), the spine's `(scope, key)` multi-instance
    form; `capture(this, poolPath)` after every mutating act. Fallback
    if a fixture cannot be a `(scope, key)` host: a one-line
    `PersistableMixin(Pool)` twin for the row to name, and the sheet's
    capture goes through the room — say so in the wave if taken.
- **The pool's hooks, generic over the floor protocol** (on the kernel
  `Pool`, no subclass): `onEntered(mover, exit)` → `floor.bears(mass)` ?
  `floor.occupy(mover, 'ground:1')` : `floor.giveWay(mover)` — stepping
  onto the pool is the first check; `onExited(mover)` → vacate the slot
  if held (a room move does not); `onContainableAdded/Removed` → the
  floor's `reconcileSupport()` (a drop or a `get` on the ice is a load
  change; mass sums carried goods); `canExit(mover, via)` → an
  unsupported occupant may leave only when `mover.getEngagedMode()?.getMedium()
  === 'water'` (the attempted mode is on the mover during the hook,
  Grounding) — *"You are in the water; swim for it."*; `canEngageAxis(direction)`
  → true when the floor's `openWaterAreaM2() > 0`; `canBeEngagedBy(actor)`
  → an occupant swims iff unsupported; somebody outside swims in iff
  the field itself is open (the far-side rule). So the crossing shore →
  pool → far bank is **one exit pair** with `media: [ground, water]`,
  `_conditional: true`, and the MODE decides: walking onto the pool
  arrives on the floor and the floor bears you or gives way; swimming
  in needs open water.
- **Animals do not walk onto ice that will not bear them** — the
  mover's own say, `beforeTraverse(via)` on the kernel animal rung
  (`DraftAnimal`'s base, the class `platform/agent/DraftAnimal =
  Mountable(Hauler(Beast))` descends from): if the destination
  (`via.getDestination()`, sync) has a floor whose `bears(own mass)` is
  false → `{ok: false, gate: 'blocked', reason: 'the horse will not go
  out on it'}`. The hook's second implementer (combat's flee is the
  first). A person is let on and falls through; the horse's instinct
  is the horse's.
- **Getting out is `stand`.** `StandController`'s no-arg path: if the
  giver occupies no posture slot and the room's floor answers
  `supportIsSlotted()`, it transfers to the floor instead of the
  slot-less flip — `giver.transferPosture(floor, Postures.Stand,
  'stand')` — and the floor's `canOccupy` decides whether the edge bears
  you (the controller renders the refusal; the floor is the authority).
  Elsewhere bare `stand` is unchanged. On success the floor's claim
  witness clears the engaged swim mode (the `onSlotReleased` twin).
- **Going in deliberately** is leaving the floor at open water:
  `swim` with no direction. The `swim.yaml` view binds a required
  `target`; it gains `required: false` with the documented meaning
  *"swim here: let go of the floor and swim where you are"* →
  `SwimController` with no target asks the room's floor
  (`supportIsSlotted()` and `openWaterAreaM2() > 0`) and calls
  `floor.giveWay(giver)` deliberately (the same drop, the gentler
  scene *"you lower yourself into the water"*); with a floor that has
  no open water it refuses *"there is no open water here to swim in"*.
  Justification: `swim` is the shipped word for being in the water, the
  view already has the right affordance (every `ShoreMixin` place and
  the pool itself afford it), and a direction-less `swim` is the one
  shape nothing else claims; no new verb.
- **Rivers.** No class work: a pool row on a slow reach names the same
  sheet row; `iceAt` answers `running` above the threshold (D14). None
  is authored.

**D13 — No `mode` argument on `canExit`/`canEnter`.** The first draft
added one; the floor model does not need it. `engageAround` sets the
mover's engaged mode before the place hooks run, so `Pool.canExit`
reads `mover.getEngagedMode()?.getMedium()` to tell a swim from a walk,
and nothing else wants the mode. `Exitable`'s declarations and
`Mobile.crossExit` are untouched.

**D14 — The still-water threshold moves to 0.5 m/s.**
`water.ice.stillWaterMps` in `C/water/content/settings/water.yaml`
becomes `"0.5"`; the comment explains the figure (rivers freeze over at
currents up to about 0.5 m/s; only fast, turbulent water stays open).
`Ice.test.ts` fixtures that asserted `running` between 0.1 and 0.5 are
re-pinned (fixtures, never the law); the climate drive's open-water and
crossing checks are re-run (W5 acceptance).

**D15 — Frozen water is refused except through a hole: ONE gate on the
shore, `ShoreMixin.drawAt(key, room)`** (agreed with cleanliness,
2026-10-17: fishing and washing/bathing are its two consumers, so it is
one kernel method, not two copies). `drawAt` returns `{draw: WaterDraw}`
or `{refusal: 'frozen', line: 'The water is frozen over; you would need a
hole.'}`: if `peekWaterRead(key)?.frozen` and the room's FLOOR does not
offer open water (`const floor = room.getFloor(); typeof
floor?.openWaterAreaM2 === 'function' && floor.openWaterAreaM2() > 0`,
read by shape) → the refusal; through a hole → `read.underIce`. **`WaterRead`
gains `underIce?: WaterDraw`** (274 K, the reach's material and — once
cleanliness lands — its hardness), built in the read builder's `frozen ?
… : …` branch, because a frozen read's `draw` is null and a copied gate
would pass and then find no water. `FishingController.reachFor` (the one
seam Fish, Lay and Release share) calls `drawAt`; whichever of this
build and cleanliness lands second moves its own consumer onto it. Fishing happens from the
floor, through the hole; the reach is the same reach and fishing is
unchanged. **A hole is a small `cut` patch (0.1 m²) made by `cut hole`
with the ice saw** (D16: the raw word `hole` makes a 0.1 m² cut and
mints no block). Resolved by the user 2026-10-16: boring a hole with
forestry's auger is fishing-slate's (the auger has no `bore` verb; it
is consumed only by `tap`); the drive's step 8 reads `cut hole`.

### Harvest verbs, the lump, sawdust

**D16 — `cut` is ONE kernel view over a cut-plan protocol (collision
ladder rung 2).** `S/lib/craft/Cuttable.ts` (interface, by shape, like
`Workable`):

```ts
interface CutRequest { actor: Stuff; tools: readonly Stuff[]; raw: string | null; options: { for?: Stuff; tight?: boolean; generous?: boolean } }
type CutPlan = { ok: true } & BuildStepOptions /* durationMs, effortW, beginSelf, beginPeers, onComplete */;
type CutRefusal = { ok: false; reason: string; line: Mml };
interface Cuttable { cutPlan(req: CutRequest): Promise<CutPlan | CutRefusal> }
```

- `C/platform/content/platform/cmd/crafting/cut.yaml` (`verbs: [cut]`;
  `target` object, greedy, scope `[$focus, reachable]`, `requires: any`;
  `tools` objects, greedy, `prepositions: [with]`, default
  `reachable:[mixin.ToolMixin]`, `requires: [ToolMixin]`; options
  `for` (object, OrganismMixin), `tight`, `generous`). The target
  narrows the tools by the capability IT needs with a literal
  `hasCapability('…')` so `lint:capabilities` sees the consumer.
- `S/platform/idea/cmd/crafting/CutController.ts extends
  ManualBuildController`: `host = target.stuff` when it is Cuttable
  (`cut ice` binds the sheet by its keyword), else the room's floor
  (`room.getFloor()`) when THAT is Cuttable and the target was a bare
  word (a patch word binds `stuff: null, raw: 'scraped'`, the `measure`
  precedent), else refuse *"Cut what?"*. `plan = await host.cutPlan(req)`;
  refusal → `declineStep`; plan → `this.engageStep(context, plan)`.
  Resolved by the user 2026-10-16: this unification (rung 2, with
  tailoring's three options riding the kernel view as the plan's option
  bag) is the decision; no alternative is open.
- Tailoring: the cloth's class (whatever `CutController.ts` narrows —
  a Stackable, Constructed covering) implements `cutPlan` with the
  moved logic (pattern units, allowance, spoilage without a bench,
  `--for` measurements, the `finish` mint of `CutPieces`); `paceMs` is
  recomputed from the chosen shears' `cutting` rate (`ToolCapabilities`)
  since the controller helper is not reachable from a Stuff; `CuttingTool`
  affords the PLATFORM view; `trade/tailoring/cmd/tailoring/cut.yaml`,
  its controller row and `CutController.ts` are deleted. Tailoring's
  tests and the textiles drive re-run.
- Ice: `IceSheet.cutPlan({raw})` — the FLOOR is the Cuttable host;
  `raw` names a patch (`marked`, `scraped`, `field`, `hole`); needs a
  tool with `hasCapability('ice-sawing')`; refuses when the actor is not
  supported by the sheet (you do not saw from the water), on a patch
  that is open, and with no marked grid unless `raw === 'hole'`.
  `onComplete` → `cutBlock(patch)`: block mass = `thickness × gridM² ×
  917`, grade = the patch's quality, area `gridM²` leaves the patch as a
  `cut` patch (merged with an adjacent cut), the block is minted
  (`/stuff/thing/ice-block`, `setMass`, `setIceQuality`, stamped
  temperature 273.15 − a little) and dropped in the pool beside the
  actor; the sheet captures itself and runs `reconcileSupport()` (the
  load on the remaining area changed). A `hole` cut is 0.1 m² and mints
  no block.

**D17 — The truthful lump.** `AlloyedMixin` splits into
`CompositionMixin` (`S/lib/material/Composition.ts`: the `alloying`
list, `fractionOf`, `setFractionOf`, `getEffectiveComposition`,
`setAlloying` — the field keeps its name so the two glass rows that
author `alloying:` are untouched) and `TemperedMixin`
(`S/lib/material/Tempered.ts`: `temper`, `getTemper`, `setTemper`).
`AlloyedMixin` stays as the composite `TemperedMixin(CompositionMixin(Base))`
so `Ingot`, `Bloom` and every metal site are unchanged;
`MixinApi.isAlloyed` keeps meaning both; `isComposition`/`isTempered`
are added; `Mixins` gains both names. `Casting` becomes
`CompositionMixin(MeltableMixin(ThermalMixin(Good)))`; a new
`S/platform/thing/MetalCasting.ts` = `AlloyedMixin(MeltableMixin(ThermalMixin(Good)))`
with the row `/stuff/thing/metal-casting` (generic-objects).
`Material.getCastTemplate()`: authored value, else `/stuff/thing/metal-casting`
for a material tagged `metal`, else `/stuff/thing/Casting`. Mint sites:
the off-spec lump clones `MetalCasting` when the workpiece's material
is tagged `metal` (copies alloying AND temper) else `Casting`
(composition only); salvage's metal branch clones `MetalCasting`, its
meltable non-metal branch `Casting` with `setAlloying` (glass keeps its
iron); glass crack/moil keep `CULLET_ROW = '/stuff/thing/Casting'`;
`reconcileBulkPhase` is unchanged in both branches: the mould branch
asks `castTemplateFor` (an ingot mould → the `Ingot` row, which is
`AlloyedMixin` and keeps both claims; the ice pan → `ice-block`), and
the vessel branch asks `getCastTemplate()`, where the new rule sends a
`metal` pool to `metal-casting` and water to its own `ice-lump`. The
ice family: new `S/platform/thing/IceBlock.ts` = `PoolableMixin(Casting)`
with field `iceQuality: 'black' | 'snow-ice' | 'cloudy'` (persistent,
authorable; **default `cloudy`** — a block or lump not cut from a sheet
is pan ice, whether it set in a pan or in a pail, so the freeze needs
no kernel hook), `poolKey() = `ice|${iceQuality}`` (D2: lumps and
blocks pool by grade), `poolState() = {temperatureK}`, mass-weighted
merge, and `reconcileInStore` (the plateau physics: below the plateau
the line relaxes toward `ambientK` with `τ = m·c/G`; at the plateau
`heat = surface × (ambientK − 273.15) / (depth/k + rFilms)` and `melt =
heat·dt/L`, using the material's `latentHeatOfFusion` and
`meltingPoint`, no literal). **Both rows join it**: `ice-block.yaml`
and dairy's `ice-lump.yaml` become `class: /platform/thing/IceBlock`
(a lump is ice: it claims no temper, melts as ice and pools), each
`_materialPath` re-pointed. The ice material moves to
`C/base-library/content/stuff/idea/material/bulk/ice.yaml`
(`/stuff/idea/material/bulk/ice`, beside water; water's `castTemplate`
keeps naming `ice-lump`, the pan's keeps naming `ice-block`); the
bottling row is deleted; `ice-bin.yaml`, `ice-bag.yaml`,
`libations-annexes.test.ts` re-pointed. Rubber's `lightAbsorption`
lands on whichever path exists when they land.

**D18 — Sawdust by kerf.** Material
`C/base-library/content/stuff/idea/material/wood/sawdust.yaml` (bulk
density 200, k 0.06, c 2000, wAC 100, tags `[wood, organic, granular,
flammable, absorbent, sawdust]` — the last two are what cleanliness
reads (`strew` needs `granular, absorbent`; its cleanser agent keys
`sawdust`) — `biologicalSource: null`). Good: carpentry's
`C/trade-carpentry/src/thing/Sawdust.ts` =
`PoolableMixin(StackableMixin(Good))`, row `/trade/carpentry/thing/sawdust`
(`mass: 1` per unit, so quantity is kilograms; keywords `sawdust, dust,
heap`), `poolRole() = 'packing'`, `poolKey() = `sawdust|${getWetnessBand()}``
(wet sawdust is a grade: dug-out packing lands on its own line and
comes back out reading wet), `poolState() = {saturation: getWetness()}`
mass-weighted, `applyPoolState` → `wet(saturation)` after a dry stamp.
`finishSaw`: `cuts = boards × (quarter ? 2 : 1)`; `sawdustKg = cuts ×
kerfM / boardThicknessM × BOARD_KG` with `kerfM` read off the saw by
shape (`getKerfM?.()`, a field on `Sawmill` rows: frame saw 0.003, pit
saw 0.005; default 0.004) and `boardThicknessM = 0.025`; **boards are
lighter by the kerf**: `board.setMass(BOARD_KG × (1 − sawdustKg /
(boards × BOARD_KG)))` so `boards × boardMass + sawdustKg = boards ×
BOARD_KG` and mass is conserved (the floor's remainder was already
discarded by `boardsFrom`; nothing new is lost). The sawdust is minted
as a `Sawdust` stack of `round(sawdustKg)` units and moved to the same
`landing`, where it merges with the floor heap by `canMergeWith` (same
template, same wetness band). Carve's shavings stay out (carpentry-slate).

**D19 — `scrape` and `mark` are the ice trade's; the instrument affords
each.** `C/trade-ice/src/thing/Scraper.ts extends Tool` affords
`trade/ice/cmd/ice/scrape.yaml` (`environment` + `peers`, the
`CuttingTool` bucket); `IceMarker.ts extends Tool` (field `gridM`,
`draught: 'hand' | 'horse'`) affords `mark.yaml`. Resolved by the user
2026-10-16: `mark` is the ice act's verb (farming's `PloughController`
is a `FieldWorkController` bound to `Field` — `fieldOf` →
`bankWork('clearing', …)` with the soil sample's stoniness,
`PloughController.ts:109–152` — so it cannot unify with a sheet, and
two `plough` views would fail `lint:verb-collisions`; the historical
tool is the *ice marker* and the act *marking off*). Both controllers
are dumb: they resolve the patch word and the tool, take the room's
floor (`room.getFloor()`, narrowed by shape to the sheet's act surface)
and call `sheet.scrapePatch(actor, tool, raw)` / `sheet.markPatch(actor,
tool, raw)`, which the water pack's `IceSheet` implements (the
trade-ice pack depends on water; the floor's methods are the authority
and refuse an actor the sheet is not supporting). `scrape` turns area
off `field` into a `scraped` patch (`sinceS = now`, area = the scraper
row's `sweepM2` per act, default 4); `mark` turns `scraped` (or `field`)
area into a `marked` patch stamped with the tool's `gridM` (hand marker
0.3 m; ice plough 0.56 m); the horse rung refuses unless a `DraftAnimal`
stands in the pool (it got there only if the sheet bore it, D12).
Tongs: a row over `Tool` with `gripping`, flavour only — carrying a
block is ordinary `get` under the shipped soft encumbrance (resolved by
the user 2026-10-16). `measure ice` / `analyze ice`:
`C/trade-ice/src/idea/reading/IceReading.ts` + row
`content/trade/ice/idea/reading/ice.yaml` (`scope: [here]`, subject raw
= a patch word, `instrument: spudding`, `instrumentNoun: a spud`,
`discipline: ice-harvesting`, `eyeCeiling: competent`): measure prints
thickness in cm `± bracket` and the grade; analyze prints the
`WaterReading.iceLine` bands. Tool rows under `content/trade/ice/thing/`:
`ice-saw` (`capabilities: [ice-sawing]`), `spud` (`[spudding]`),
`scraper`, `hand-marker`, `ice-plough` (both `IceMarker`). **No tongs
row**: tongs are flavour (user, 2026-10-16) and the mining pack already
ships one; the venue may `props:` `/trade/mining/thing/tongs` as
dressing. The tool rows author no `constructionForm` (an edgeless ice
saw; whether it is `bladed` and sharpenable is a later row edit once the
repair build makes every Tool Keen). Discipline row
`idea/Discipline/ice-harvesting.yaml`.

### Seats, the cookhouse, the pack, the venue

**D20 — A seasonal shift is an optional closed vocabulary on
`ShiftEntry`, resolved to the business's LOCAL season.**
`ShiftEntry.season?: Season[]`, `SEASONS = ['spring', 'summer',
'autumn', 'winter'] as const` in `S/lib/employment/Roster.ts`
(registered with `lint:closed-vocabularies` and declared in its
`CLOSED_BY_DESIGN` list — `CLOSED_VOCABULARY_CEILING` is 5 and
cleanliness leans on it too); `RosterClock.season?:
Season`; `Roster.evaluate` adds `(!e.season || e.season.includes(date.season))`.
`CelestialApi.seasonAt(latitudeDeg: number, nowS: number): Season`
(`S/api/celestial.ts`). ⚠ **It takes a latitude, never a world object**:
`lint:object-verbs` holds Api statics whose first parameter is a world
object at zero, so the question about a PLACE is asked of the place
(`SpatialZone.climateSite().latitudeDeg`, resolved by the caller) and
the Api answers a pure question about a latitude and a time. Calendar
quarter from day-of-year (day 0 = northern spring; 0–89 spring, 90–179
summer, 180–269 autumn, 270–359 winter), **flipped by two quarters when
`latitudeDeg < 0`**. `tickBusiness` resolves the latitude once per
business from its first operating location's zone and passes the season
in the clock. ⚠ **The season rides ONLY `RosterClock` and
`Roster.evaluate`** — no loop logic of its own in `tickBusiness`, so it
survives the repair build's assignee grouping of that loop. Every shipped roster authors no `season` and is
unchanged; the wage settles only on on→off, so a seat outside its
season draws nothing.

**D21 — The cookhouse's ice.** `business.yaml` gains
`{category: ice, unit: count, level: 1, supplier: <the ice company's
business path>, exemplar: /stuff/thing/ice-block}` (the ice material's
tag `ice` is what `CategoryMeasure.names` matches on a block).
`perceivedGoods` descends into a shut container **only when it is a
Coolbox** (`MixinApi.isCoolbox`) — a cold box is shut to keep, not to
hide, and its contents are the house's cold stock; a shut larder or
cupboard stays invisible, so no other venue's sheet changes unless it
keeps a par line for something in its icebox (none does). `restocks`
gains config `cold: /stuff/thing/fixture/icebox` and an unpack rule, **one
small named branch** (`unpackIntoCold`) with `cold` a plain config option
so the repair build's W7 can carry it whole into `BusinessMixin.receiveBench`,
before the shelf default: a delivered good that is not bulk and whose
material has tag `ice` → `open <icebox>`, `put <kw> in <icebox>`,
`close <icebox>` (literal verbs, `forceCommand`). The cook's row names
the cold box. The supply job's `--from` is the ice company's platform
room (its counter is a ConsignmentShelf, which `counterRoomOf` finds).

**D22 — The `trade-ice` pack at `/trade/ice`, and a new venue pack
`hollow-mere` at `/world/terminus/hollow-mere`.** Trade-ice ships
mechanism only: tools (D19), the reading, `scrape`/`mark`, the
Discipline, three brains (`src/behavior/harvests.ts` — crew: on shift,
walk to the pool, `scrape`, `mark`, `cut`, `get`, carry to the house,
`put block in stack`; `bosses.ts` — the ice boss: `analyze ice` and
only when the sheet bears a person with margin does the crew's go-ahead
exist, which it signals by marking the first patch itself;
`keeps-house.ts` — the keeper: `measure stock` each shift and, when the
packing reads soaked, `get sawdust` (the wet face) and drop it in the spoil
heap), and the store rows that are the icehouse KIND
(`content/trade/ice/thing/stack.yaml` → `class: /platform/thing/Stockpile`,
`stackShapeFactor: 5`, `drainage: 0.5`, `acceptsPoolKeys: null`,
`keeperPositions: [keeper]`, terms `{allowancePct: 10, feeMinorPerKg: 1}`;
`book.yaml` → `/platform/thing/StoreBook`). Deps: platform, base-library,
generic-objects, water, trade-shopkeeping (the counter class), trade-carpentry
(the sawdust the stack packs), transport (the draft horse the plough
rung reads by shape — a `DraftAnimal`). The venue pack `hollow-mere`
(the hearts-delight shape: a group, a title under `/world/terminus`,
`landUse` none) ships ⚠ **its own zone authoring the same geography as its water**
(`latitudeDeg: -58`, the elevation and the tuned `climateOffsetK` on
the hollow-mere `SpatialZone` row) — the rooms' outside air, the body's
cold, the house's outside and the season all read the ZONE's climate
site, and a zone that inherited Terminus's latitude 42 would give a
southern water under northern air. The locality (`stuff/idea/Locality/hollow-mere.yaml`:
`_reach: hollowmere:mere`, `_weatherPin: {type: clear, mode: alive}`,
`_catchmentKm2: 3`), the watercourse (`stuff/idea/Watercourse/hollowmere.yaml`:
`site: {latitudeDeg: -58, continentality: 1, offsetK: <tuned>}`, a
`mere` node 300 m × 5 m with a couple of fish stocks so fishing binds),
rooms: `shore` (Shore; exits south → `road`, north → `pool`),
`pool` (`class: /platform/location/Pool`; `floor: { template:
/world/terminus/hollow-mere/thing/sheet }` where that row `extends:
/system/water/thing/ice-sheet` with `areaM2: 4000`; waters `mere:
hollowmere:mere`; exits south → shore, north → far-bank, both `media:
[ground, water]`, `_conditional: true`; props the bottom),
`far-bank` (Shore), `road` (a Street linking the shore, the icehouses
and the realm), ⚠ every icehouse room (platform, house, small house,
shed) is a `SingletonCartesianLocation` row (`lint:location-classes`
enumerates `MINTED_ROWS`), `icehouse-platform` (volume, `enclosure` 0.2 m pine,
ambient light, props: the counter `class: /trade/shopkeeping/thing/Stock`
with `stockLines: [{itemTemplatePath: /stuff/thing/ice-block, par: 1,
source: /world/terminus/hollow-mere/thing/stack, pricing: stocking}]`,
the book, a gauging rod), `icehouse-house` (volume 48 m³, `enclosure:
{material: /stuff/idea/material/wood/sawdust, thicknessM: 0.4}`, a dim
authored light, a lockable door to the platform, props: the stack row
`thing/stack.yaml extends /trade/ice/thing/stack` with `capacityKg:
30000` and the seeded lines — see W9), `small-house` (the scale check:
8 m³, same walls, its own stack `capacityKg: 3000`), `shed` (the empty
control: same volume and walls as the house, nothing in it), three
Structure rows (the icehouse over platform + house; the small house; the
shed) — each standing alone, so once rubber's heat-between-rooms lands
only the house couples to a neighbour (its platform, through the
door's wall), which is real and leaves the house still colder than the
shed,
the business `idea/ice-company.yaml` (positions keeper, house-hand,
crew ×2, ice-boss; `call: rota`; `rosterSlots` with `season: [winter]`
on crew and boss; `operatingLocations`: platform, counter, house,
stack; `banksAt: goodkin`; `parLines` sawdust from the sawmill's
timber-yard counter — present but not driven), five Cast rows, and the
boot entries the unobserved economy needs (the business and the house,
as hearthworks does). ⚠ **`lint:boot-entries` is a ratchet**
(`server/scripts/check-boot-entries.ts`: `BOOT_ENTRY_CEILING = 83`, may
fall, never rise; every content entry's `reason` must cite
`unobserved-economy`). These two entries raise it to **85**, approved by
the owner 2026-10-17 (relayed through the repair build; recorded in
`origin/reqs/repair` § Parallel builds): W9 edits the constant to 85 with
a dated comment naming storage-and-ice and the two entries, and both
`reason`s cite `unobserved-economy` (the ice company's keeper restocks
and the crew works with nobody present). No sibling adds boot entries
(repair says so explicitly), so the constant has one writer. A second
icehouse, company or pool is rows.

---

## ⭐⭐ Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else that already composes that host. The
test: a guard that re-narrows the host set means the host is wrong.

| new thing | host | what composing it claims | narrowing check |
|---|---|---|---|
| `StoreMixin` (lines, face, claims, reconcile, exchange) | `Stockpile` (kernel twin) and haulage `Warehouse` (re-based) | *this holder's contents are a ledger, and it may hold other people's goods on a receipt* | no guard: both hosts are custodial holders |
| `PoolableMixin` | `IceBlock`, `Sawdust` | *this good may be held as an amount per grade and merges by its own rule* | not on `Casting` (a metal lump pools by nothing here), not on `Good`; two composers, as the slate planned |
| `iceQuality` field | `IceBlock` | *every ice block has a grade* — true of pan, sheet and store ice | — |
| `Stockpile.capacityKg / stackShapeFactor / drainage / acceptsPoolKeys / keeperPositions / businessPath / terms` | the store row (authorable on `StoreMixin`) | *a store has a size, a shape, a floor, a keeper and printed terms* | — |
| `StoreBookMixin` / `StoreBook` | a fixed `Thing` row | *this object is the house's book: it affords custody and names a store* | the book is the instrument; never the counter, never the room |
| `RoomHeatExchange` (interface by shape) | `SpaceHeatingMixin` (+), `StoreMixin` (−) | *an occupant may push heat into or pull it out of its room* | two implementers; the envelope narrows by shape, never by class |
| `AtmosphericMixin.envelopeSteadyStateK(outsideK, atS)` | every Atmospheric scope | *a scope can say what temperature it would settle at for a given outside* — the formula it already uses, exposed | — |
| `Material.permeability() / wetProperty()` | `Material` | *every material has a pore permeability, zero when it absorbs nothing* | — |
| `CompositionMixin` / `TemperedMixin` | `Casting` (composition only); `MetalCasting`, `Ingot`, `Bloom` (both via `AlloyedMixin`) | composition: *this piece remembers what dissolved in it*; temper: *this piece can be heat-treated* — true only of metal | the split IS the narrowing; no guard |
| `SwimmableMixin.immersionOf()` | `Swimmable` hosts (`Pool`) | *a place you swim in knows who is in its water (whoever its floor is not supporting) and how cold it is* | base reads support off the floor's slot; `Pool` overrides the temperature only |
| `FloorMixin.bears(loadKg)` / `supportIsSlotted()` | every floor | *a floor can say whether it holds a load, and whether standing on it is a slot you hold or the free posture* — base `true`/`false`, which is what every shipped floor already means | no guard: ordinary ground answers the base; a water surface answers the other way by override |
| `WaterSurface` (kernel floor twin subclass; `giveWay`, `canOccupy` by bearing) + `Pool.floor` class default | the floor of every `Pool` | *a pool's floor is the water's surface: not standable, and it drops whoever it stops bearing* | the estuary cove's floor becomes water (today it is boards) — a correction, not a widening |
| `IceSheet` (water pack, extends `WaterSurface`; the log, the patch walk, the acts, `cutPlan`, its own `(scope, key)` record) | the floor row a harvest pool names via `floor.template` | *this water's surface carries a sheet somebody can stand on and work* | not on `Pool` (the cove has no sheet to work); never a room subclass |
| the ground kind `ice` + material class `ice` | `GROUND_KINDS` / `GROUND_KIND_FOLD` | *a floor made of ice has a word* | folds only from the `ice` tag; a frozen puddle keeps its earth kind and its skin |
| `Beast.beforeTraverse` (the animal's refusal of ice that will not bear it) | the kernel animal rung | *an animal will not step onto a floor that does not bear it* | the hook's second implementer (combat's flee is the first); people are not animals here and are let on |
| `Attired.immerse()` | every `Attired` body | *a dressed body can be soaked through, garments and all* | — |
| `Employed.isOnShiftFor(org)` | every `Employed` | a read beside `isOnShift()` | — |
| `ShiftEntry.season?` | the roster value object | *a shift may name the part of the year it runs in* — optional, every shipped roster unchanged | — |
| `PoolBottom` | a props Holder row in a pool | *what sank is kept here, unreachable* | — |
| `StockLine.source?` | retail `Stock` | *a counter line may be fed from a store* | the three sources are disjoint by field: `supplier` / `source` / neither |
| `Cuttable` (interface) | tailoring's cloth, `IceSheet` (the floor) | *this thing can plan a cut for an actor with a tool* | by shape; the kernel controller never names a pack class |
| `Scraper`, `IceMarker` (Tool subclasses) | trade-ice rows | *this instrument performs scrape / mark* | affordance needs a class static; the two rungs of `mark` are rows over one class |
| `Sawdust` | carpentry's `PoolableMixin(StackableMixin(Good))` | *a granular heap, by the kilogram, that pools* | — |
| `Sawmill.kerfM` | the saw rows (frame saw, pit saw) | *a saw has a kerf* | read by shape in `finishSaw` |

Things deliberately NOT placed: no field on `Thing` or `Good`; nothing
on `BulkableMixin`; no `storekeeping` Discipline (the stocktake bands by
`appraisal`); no `HeatSinkMixin`; no new Mongo collection (receipts are
documents under the business, the stack's lines are a singleton host's
`holder_snapshots` record, the sheet's log a `(scope, key)` record of
the floor); **no room subclass for the frozen pool, no per-occupant
"standing" state on any room, no `mode` argument on the place hooks,
no `wade` verb** — the floor's slot is the support state and the shipped
posture verbs move you on and off it.

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** — every new room row uses `props:` for
  fixtures and `cast:` for people (`populates:` is retired; none in the
  files read).
- **Locations, not rooms** — the harvest pool is a plain `Pool` row
  (`SingletonCartesianLocation`) naming its floor; the icehouse rooms
  are `CartesianLocation`/`Street` rows with `enclosure:`; nothing new
  is a `FurnishableRoom`, and no new Location class is added.
- **The five axes and `<root>/<branch>/`** — kernel classes at
  `S/platform/thing/{Stockpile,StoreBook,IceBlock,MetalCasting}.ts`,
  `S/platform/idea/reading/StockReading.ts`,
  `S/platform/idea/cmd/{custody,crafting}/…`; kernel substrate at
  `S/lib/{storage,thermal,craft,material}/`; the water pack's at
  `/system/water/{location,thing,lib,idea/cmd}`; the ice trade's at
  `/trade/ice/{thing,idea,behavior,lib}`; carpentry's sawdust at
  `/trade/carpentry/thing/sawdust`; the commons rows under `/stuff/…`;
  the venue under `/world/terminus/hollow-mere/…`. Controllers at
  `<root>/idea/cmd/<category>/`, views at `<root>/cmd/<category>/`.
- **Module scope declares; lifecycles initialize** — no module-scope
  statements; the pond's seed and the store's face are made in
  `onCreate`/first `reconcile()`; catalogues warm themselves.
- **Import boundary** — pack `src/` imports the kernel by package
  specifier only; `FishingController` and the kernel `CutController`
  read the sheet by shape off the room's floor; trade-ice reads the
  draft horse by `MixinApi` predicate; the kernel `Pool`, `WaterSurface`
  and `StandController` know only the floor protocol (`bears`,
  `supportIsSlotted`, `giveWay`, `openWaterAreaM2`), never the water
  pack's class. `lib/` imports nothing outside `src/mud/`.
- **No new module category, no free helper** — the four new
  `lib/storage` files are two value objects and two mixins; the two
  interfaces are types; no `*Api` is added (the custody verbs are
  controllers; the store's acts are its methods).
- **Verbs on objects** — `store.deposit(...)`, `store.withdraw(...)`,
  `pool.cutPlan(...)`, `material.wetProperty(...)`, `body.immerse()`;
  the only Api additions are `CelestialApi.seasonAt` (subjectless) and
  `MixinApi` predicates.
- **Inter-Stuff methods only** — the face is read through
  `getPoolKey()`-style methods; tests reach raw state via
  `Stuff.RAW_TARGET` with a comment.
- **A Map field is never bare-persistent** — `lines`, `log` and the
  receipts' claims are arrays of plain records; `pendingPutters` is a
  transient Map; support is the floor's slot occupancy, which the slot
  substrate already persists and restores.
- **A person keys on `getIdentityPath()`** — the depositor on a receipt,
  the putter, the hauler.
- **Lint gates this build must satisfy** (all run by `lint:family`):
  `instanceable-placement` (new kernel classes under `platform/<branch>`;
  pack classes under pack roots — `IceSheet` and `PoolBottom` at
  `/system/water/thing/`; no pack `lib/` is added), `location-graph`
  (mutual exits; `_conditional` rows; no dangling destination),
  `location-classes` (no new Location class), **`ground`** (the two new
  floor rows say `ground` and `floor`; no `floor`/`ground` detail on
  them; `Pool`'s `onCreate` is untouched; the `ice` kind joins
  `GROUND_KINDS` with its phrase, and the report's census of kinds is
  re-run), `counters` (the ice counter names
  `/trade/shopkeeping/thing/Stock`; `Stockpile` and `StoreBook` compose
  no priced-service mixin), `reachability` (every new verb is conferred
  by a class static — `scrape` by `Scraper`, `mark` by `IceMarker`,
  `cut` by `CuttingTool` and `IceSaw`, `deposit`/`withdraw` by
  `StoreBook`; `swim` and `stand` are shipped verbs already afforded),
  `verb-collisions`
  (zero new collisions; the tailoring `cut` view is deleted, not
  amnestied), `capabilities` (new kinds `ice-sawing`, `spudding`,
  `scraping`, `marking` each with a literal consumer), `instrument-args`
  (every tool is a declared arg), `perishable` (the sawdust and ice
  rows: the build runs the gate and composes `FreshnessMixin` only if
  the gate's own predicate asks — it keys on the material, and neither
  ice nor sawdust names a `biologicalSource`), `mass` (every new
  Tangible row authors `mass` and `_materialPath`), `envelope` (new
  rooms author causes, never `_temperature`), `mixin-names`,
  `closed-vocabularies` (`SEASONS`), `menu-staff`, `unconsumed-seams`
  (every new field is read in its own wave), `module-scope`,
  `mud-imports`, `lib-statics` (no new statics), `object-verbs`,
  `schema-docs` (no collection change), `drive-scripts`,
  `test-bootstrap`, `shopfronts` (the ice counter's `businessPath` is
  listed by the company), `openings` (the company advertises seats
  only if it is booted).

---

## Waves

Every wave lands independently, passes `pnpm test:near` + every
touched pack's vitest + `lint:family`, and ends at one commit. The
plan is kept current as each lands (mark the wave done; re-plan in
place when a premise fails, saying so).

### W0 — The truthful lump, and ice to the commons

Implements D17. Independent of everything else; de-risks the drive's
kernel check first.

- `S/lib/material/Composition.ts`, `Tempered.ts`; `Alloyed.ts` becomes
  the composite; `Mixins` + `MixinApi.isComposition/isTempered`.
- `S/platform/thing/Casting.ts` (composition only); `MetalCasting.ts`;
  `C/generic-objects/content/stuff/thing/metal-casting.yaml`;
  `Material.getCastTemplate()` rule.
- Mint sites: `CraftingLogic.ts` off-spec (template by `metal` tag;
  `isTempered` guard around `setTemper`) and salvage (metal →
  `/stuff/thing/metal-casting`); glass crack/moil unchanged in code
  (verify `isAlloyed` narrowings still pass for a composition-only
  cullet — change them to `isComposition`).
- `S/platform/thing/IceBlock.ts` (Poolable arrives in W2; here it is
  `Casting` + `iceQuality`; W2 adds the mixin), `ice-block.yaml` AND
  `ice-lump.yaml` → `class: /platform/thing/IceBlock`; the ice material
  to `C/base-library/.../material/bulk/ice.yaml`; re-point both ice
  rows, `ice-bin.yaml`, `ice-bag.yaml`, `libations-annexes.test.ts`;
  delete the bottling row.
- Tests: `Alloyed.test`/`Casting` split; `Thermal.freeze.test.ts` —
  a pail (plain vessel) freeze mints an `ice-lump` that is an `IceBlock`
  reading `cloudy` beside the pail; an ice-pan (`Mould`) freeze sets an
  `ice-block` INSIDE the pan reading `cloudy`; an ingot-mould pour still
  casts an `Ingot` with alloying and temper; a metal pool in a plain
  crucible casts `metal-casting`; glass `Crack` tests (cullet keeps
  iron); smelting's off-spec test (iron keeps temper); a `MetalCasting`
  row census; dairy's own `Mould` tests green.
- Acceptance: `look` at an ice block / glass lump shows composition and
  no temper; an iron lump shows both; smelting, smithing and glass
  packs' suites green.
- Commit: `build(storage-and-ice W0): the truthful lump — composition
  off temper, MetalCasting, ice to the commons`.
- ✅ **Done (build, 2026-10-17).** As planned, plus: every pack site that
  reads only the fractions now asks `isComposition` (glass ×6, smelting
  ×3, smithing hammer/quench-halves, quarrying), the temper-only reads
  `isTempered` (`heat`'s anneal); `iron.yaml`'s `subjectRequires` is
  `CompositionMixin` so `analyze iron` still reads a cullet lump.
  ⚠ Surprise: a class expression extending a generic mixin call inside a
  generic function loses the halves' members, so `AlloyedMixin` declares
  an explicit return type (`AlloyedClass<TBase>`) — the composite is the
  type the two halves compose to. `Material.castTemplate` defaults to `''`
  and `getCastTemplate()` derives the default from the `metal` tag.
  Decision: `ICE_QUALITIES` is closed in `IceBlock.ts` but the
  closed-vocabulary detector scans `lib/` only and does not see it, so no
  `CLOSED_BY_DESIGN` entry (the gate refuses an entry it cannot match).
  ⚠ `lint:field-meta --snapshot` cannot regenerate the golden on master
  today (8 pre-existing declaration forms the extractor refuses), and no
  gate reads it (`lint:field-meta` runs `--lint`), so it is left as is.
  Decision: the regression WIRE drives (smelting, glass, assembly,
  climate, maritime, fishing, textiles) run ONCE against one booted world
  at W10, not per wave — each needs a ~3 GB world and the pack suites +
  unit tests carry each wave; recorded for the MR.

### W1 — One wet law; sawdust by kerf

Implements D9, D18. Consumer: the sawmill floor.

- `Material.permeability()` / `wetProperty()`; settings
  `wetness.impermeableBelowPct` (2); `Wearable.getClo` migrated; the
  byte-identity test over every shipped textile row's clo.
- `sawdust.yaml` material; `C/trade-carpentry/src/thing/Sawdust.ts`
  (Stackable only in this wave; `PoolableMixin` is composed in W2 —
  note the order in the file); row `thing/sawdust.yaml`; `Sawmill.kerfM`
  on the frame-saw and pit-saw rows; `finishSaw` mints the stack and
  lightens the boards; `SawController` yield test extended (24 kg
  through-sawn: 4 boards × 5.04 kg + 3.84 kg sawdust = 24 kg; quartered:
  twice the cuts).
- Acceptance: `saw` leaves a heap on the floor whose mass grows with
  the cuts; mass conserved to the gram in the test; cloth clo unchanged.
- Commit: `build(storage-and-ice W1): the wet law on Material; sawdust
  by kerf`.
- ✅ **Done (build, 2026-10-17).** `Material.permeability()` /
  `wetProperty()` + `wetness.impermeableBelowPct` (2); `getClo` reads the
  law; `CLO_DEFAULTS.ABSORPTION_REFERENCE` is gone (the material reads the
  hoisted key). The identity test is `WetLaw.test.ts`: every shipped
  material above the cutoff agrees with the old arithmetic to 1e-12, and
  no fibre/leather row sits at or under it. ⚠ **Decision (conservation
  over the plan's figures):** a heap's unit is a kilogram, so the saw
  mints `round(kerfSawdustKg)` whole kilograms and the boards are
  lightened by EXACTLY what was minted (`BOARD_KG − dust/boards`) — 24 kg
  through-sawn at 4 mm is 4 boards of 5 kg + 4 kg of dust, not the plan's
  5.04 + 3.84, because 3.84 kg cannot be a stack of whole units and
  rounding the dust while lightening the boards by the unrounded figure
  would lose 160 g. `Sawdust.canMergeWith` vetoes across wetness bands;
  within a band the survivor keeps its saturation (no mass-weighting —
  the band already bounds the error). The material row dropped oak's
  `chemistry: null` (an orphan key `lint:instanceable` counts).

### W2 — The store substrate, the face, and the heat sink

Implements D1–D5, D7; composes `PoolableMixin` onto `IceBlock` and
`Sawdust`. Consumer: a kernel test fixture now; the icehouse rows in W9.

- `S/lib/storage/{StoreLine,Receipt,Poolable,Store}.ts`;
  `S/platform/thing/Stockpile.ts`; `Mixins` + predicates; `Stockpile`
  row for tests under `S/platform/thing/__tests__/fixtures`.
- `S/lib/thermal/RoomHeatExchange.ts`; `SpaceHeating` implements it;
  `Atmospheric.reconcileEnvelope` sums exchanges and uses
  `envelopeSteadyStateK(outsideK, atS)` (new, the one formula — `atS` so rubber's solar term can enter it);
  `outsideSegmentsSince` if `outsideKFor`'s site resolution is not
  reachable from `lib/` (read `BiomeLogic.ts:1196` first).
- `IceBlock.reconcileInStore` (the plateau physics), `Sawdust`'s
  packing role and wetting.
- Persistence: `hydrationSource holder_snapshots` + `hydrateFromSource`
  (the `MarketStalls` shape) on `Stockpile`; capture after mutation and
  per-segment after reconcile.
- Tests: the icehouse arithmetic (D4's three inequalities, the room
  temperature, the spiral: a soaked packing melts faster than dry);
  face lifecycle through the REAL verbs' paths — `ContainmentApi.move`
  into the holder absorbs / becomes the face and fires
  `onContainableAdded`; a lump and a block of one grade land on one
  line; moving the face out debits and refaces; a destructed face does
  not double-debit; `canAddContainable` refuses a full house and a
  non-poolable good in its own words, and `put X on stack` is refused
  by the verb; persistence round-trip through `materialize`.
- Acceptance: the unit numbers above; `lint:family` green with the new
  mixins named.
- Commit: `build(storage-and-ice W2): the store — lines, the face, the
  stack's physics and the heat it pulls from its room`.
- ✅ **Done (build, 2026-10-17).** `lib/storage/{StoreLine,Poolable,Store}.ts`
  (`Receipt.ts` lands with W3, its first reader), `lib/thermal/RoomHeatExchange.ts`,
  `platform/thing/Stockpile.ts`; `IceBlock` + `Sawdust` compose
  `PoolableMixin`; `Tangible.getDryMass()` (the ledger counts matter, not
  the water it soaked up). Unit numbers (`Store.test.ts`): 20 t in 2 t of
  dry sawdust in a 48 m³ shed at 20 °C loses 23.6 kg/day with the house
  settling at 10.4 °C; thin packing 38 kg/day; soaked 43 kg/day (the
  soaked house pulls its own room colder, which narrows the gap — less
  than the packing's 10× conductivity suggests); 2 t in an 8 m³ house
  loses a share several times larger. **Decisions:** (1) arrivals settle
  in a scheduled step AFTER the move completes, because the shipped stack
  merge-on-arrival folds an arriving sawdust heap into the face before the
  store could see it — the arrival's mass is recorded at arrival and the
  face normalised to one unit. (2) A face is debited only when it LEFT to a
  container (a `get`); one whose container is gone was destructed and its
  line's physics already took it. (3) ⚠ A restore re-adds the faces as
  contents: the store skips arrival accounting inside the spine's
  `persistenceRestore` frame and adopts faces by key — found by the
  round-trip test (+1 kg per restart otherwise). (4) Seeding runs in
  `Stockpile.hydrateFromSource` after `materialize` (no `onCreate`: the
  on-create ratchet, and whether the world remembered the house is the
  hydration source's question). (5) `Poolable` gained `applyPoolKey` (a
  line's grade onto a fresh unit) and `storeAnchorK(state)` (a line's
  thermal anchor while it exchanges — ice at its plateau), so the store
  never names ice. The custody hooks move to W3 (their consumer).

### W3 — Custody: receipts, deposit, withdraw, the stocktake, the depot

Implements D6. Consumers: the depot warehouse (live goods, the first
bailee store) now; the ice company in W9.

- `StoreReceipt` written through `DocumentApi.saveAsBusiness`
  (existing kind); `StoreMixin.issueReceipt/receiptsFor/claimsOn`;
  `Employed.isOnShiftFor`; `custodianIn`; the payout rule; the fee.
- `S/platform/thing/StoreBook.ts` (+ mixin), the `custody` category:
  two views + two controllers; help text.
- `StockReading` + `stock.yaml` (kernel reading, `gauging`).
- Haulage: `Warehouse` re-based on `StoreMixin` (live deposit keeps a
  receipt of `unit: count`; `withdraw` hands the chattel back);
  `WaybillRegistry.issueReceipt` forwards; `depot-book.yaml` prop +
  `keeperPositions: [warehouseman]` on the warehouse row;
  `Depot.test.ts` gains withdraw.
- Tests: deposit → receipt fields; withdraw → objects at the line's
  state, fee settled, receipt debited; two depositors + a shortfall →
  pro rata and `withinAllowance`; no keeper → `no-keeper`; staff on
  shift → the house's claim; a stocktake band narrows with competence.
- Acceptance: the depot can withdraw what it deposited; the controller
  tests use `MqlOneResult` fixtures (`ref()`), never a bare Stuff.
- Commit: `build(storage-and-ice W3): custody — receipts, deposit and
  withdraw through the keeper, the stocktake, the depot's withdraw`.

### W4 — Retail from a store

Implements D8.

- `StockLine.source`; `Stock.bringUp`; `reset()` skip; `priceFor`'s
  store term + `retail.stockingHorizonDays`; `BuyController` sold-out
  branch calls `bringUp` first; `stockSheetForImpl` ignores sourced
  lines (they are not supplied).
- Tests: a sourced line is never cloned; a buy on an empty shelf brings
  one up and debits the house's claim; an empty claim leaves the shelf
  bare and the refusal `sold-out`; price rises as days of supply fall.
- Commit: `build(storage-and-ice W4): a counter fed from a store, priced
  by the store's days of supply`.

### W5 — Cold water, the water's surface as a floor, support

Implements D10, D11, D13, D14 and the kernel half of D12. Kernel
correction for every swimmer; the floor model lands here so W6 only
adds the sheet.

- `FloorMixin.bears(loadKg)` / `supportIsSlotted()` (base answers);
  `S/platform/thing/WaterSurface.ts` + the generic-objects row
  `/stuff/thing/surface/water-surface` (`canOccupy` by bearing,
  `giveWay`, `openWaterAreaM2()` = the whole surface); `Pool`'s floor
  default and its hooks (`onEntered`, `onExited`,
  `onContainableAdded/Removed`, `canExit`, `canEngageAxis`,
  `canBeEngagedBy`) over the floor protocol; `Beast.beforeTraverse`;
  `StandController`'s slotted-floor path; `swim` with no target
  (`swim.yaml` `required: false` + `SwimController`'s give-way path);
  `TemplatePaths.waterSurface`.
- `SwimmableMixin.immersionOf` (support-derived), `Pool`'s temperature
  override, `MixinApi.isSwimmable`; `ThermalRegulation.effectiveAmbient`
  reads it; `Attired.immerse()`; `restamp` re-immerses.
- `water.ice.stillWaterMps` → 0.5; `Ice.test.ts` re-pinned.
- Tests: a body in a 274 K pool cools ≥ 3× faster than in 274 K air
  (the AC's *several times*); a summer swim (290 K water) does not
  chill but soaks; every worn layer reads soaked after entry; on a
  water surface `sit`/`stand on the ground` are refused and bare
  `stand` is refused in the floor's words; `swim` with no target drops
  a supported body and is refused where the floor has no open water;
  a Beast refuses an exit whose destination floor will not bear it;
  `canExit` lets an unsupported body out only by a water-medium mode;
  the estuary cove's floor resolves to the water surface (the
  `Location.floor.test.ts` shape).
- Acceptance: maritime's and climate's wire drives still pass (run
  both; the climate drive's open-water and crossing checks are the
  threshold's regression; maritime's swim-in/swim-out is the support
  model's).
- Commit: `build(storage-and-ice W5): a swimmer's body reads the water;
  the water's surface is a pool's floor; going in soaks you; the
  still-water threshold`.

### W6 — The ice sheet

Implements the water-pack half of D12 and D15; the sheet's acts
(`scrapePatch`, `markPatch`, `cutPlan`) are implemented here and driven
by verbs in W7/W8.

- `WatercourseCatalogue.iceAt(ref, nowS, opts)` with the patch walk +
  tests; `C/water/src/thing/IceSheet.ts` (extends `WaterSurface`:
  `bears` from the sheet, the log, `reconcileSupport`, `groundPhrase`,
  the per-area snow seam, the thaw wipe, float/sink, its own `(scope,
  key)` record), `thing/PoolBottom.ts`, rows
  `content/system/water/thing/{ice-sheet,pool-bottom}.yaml`; the `ice`
  ground kind + material class in `GroundKind.ts`;
  `FishingController.reachFor` frozen gate.
- Tests (`C/water/src/__tests__/IceSheet.test.ts`, a `Pool` row naming
  the sheet): seed; step on thin ice → broken patch, unsupported,
  immersed; a day later → supported; cross; scrape → black and thicker
  after the same cold; mark → grid; cut → block mass and grade from the
  patch, cut patch open then thinner; the hole; bare `stand` refused
  while nothing bears you, allowed once the field does; a horse refused,
  later admitted; load change (`get` a block on thin ice) gives way;
  the thaw wipes the log, drops every occupant, sorts float/sink; `look`
  words (the floor's sentence in the room's description); persistence
  through `materialize` with the pool's key. Fishing: refused on the
  sheet, allowed through the hole, unchanged in open water.
- Acceptance: the water pack's suite, `lint:ground` and
  `lint:location-graph` green; fishing's wire drive still passes.
- Commit: `build(storage-and-ice W6): the ice sheet — a floor you stand
  on while it bears you, the pond's log, giving way, the hole, the
  thaw`.

### W7 — One `cut`

Implements D16. Independent of ice; ordered here so W8's ice saw can
afford the kernel view.

- `S/lib/craft/Cuttable.ts`; `C/platform/.../cmd/crafting/cut.yaml`;
  `S/platform/idea/cmd/crafting/CutController.ts`; tailoring's cloth
  implements `cutPlan`; `CuttingTool` affords the platform view;
  tailoring's view, controller row and controller deleted.
- Tests: tailoring's cut tests re-pointed at the plan (same outcomes:
  units, allowance, spoilage, `--for`); a kernel test with a stub
  Cuttable; `lint:verb-collisions` reports zero `cut` claims beyond one.
- Acceptance: the textiles wire drive still passes.
- Commit: `build(storage-and-ice W7): one cut — the kernel view over a
  cut plan; tailoring's cloth plans its own`.

### W8 — The ice trade pack, and seasonal seats

Implements D19, D20, D22 (the trade half).

- Kernel: `ShiftEntry.season`, `SEASONS`, `Roster.evaluate`,
  `CelestialApi.seasonAt`, `tickBusiness`; `lint:closed-vocabularies`
  entry; tests (a winter seat is off in summer; a southern site's
  winter is calendar days 90–179; every shipped roster unchanged).
- `C/trade-ice/`: `pack.yaml`, `package.json`, root `package.json`
  dep; `src/thing/{Scraper,IceMarker,IceSaw}.ts` (`IceSaw extends Tool`
  affords the kernel `cut`), `src/idea/reading/IceReading.ts`,
  `src/idea/cmd/ice/{Scrape,Mark}Controller.ts`,
  `src/behavior/{harvests,bosses,keeps-house}.ts`; content: tool rows,
  `cmd/ice/{scrape,mark}.yaml`, controller rows, `idea/reading/ice.yaml`,
  `idea/Discipline/ice-harvesting.yaml`, `thing/{stack,book}.yaml`,
  a HelpConcept.
- Tests: the controllers with binder-shaped fixtures (the room's floor
  narrowed by shape; an actor the sheet does not support is refused);
  `measure ice` bands; `mark` horse rung needs a `DraftAnimal` in the
  room; the brains drive literal verbs through `forceCommand` (one beat
  each).
- Acceptance: `lint:reachability`, `lint:capabilities`,
  `lint:instrument-args` green for the pack.
- Commit: `build(storage-and-ice W8): the ice trade — tools, readings,
  scrape and mark, the seats and their season`.

### W9 — Hollow Mere, the icehouses, the company, the cookhouse's ice

Implements D21, D22 (the venue half).

- `C/hollow-mere/` pack (rows listed in D22). The two stacks are
  seeded by an authored `seedLines:` field, NOT by `props:` of blocks and
  sawdust: a stack's lines are runtime state, so `seedLines` is
  authorable and not persistent (the `MarketStalls.pitches` rule), and
  `onCreate` turns it into lines only when no record exists
  (`restoreOrSeed`'s seed branch): the large house 20 000 kg ice `black` + 2 000 kg sawdust dry;
  the small 2 000 + 200. The drive then cuts and deposits on top.
- The watercourse's `offsetK` pinned by a unit test in the pack:
  bears 80 kg between day 1 and day 3, thaws (field thickness 0) before
  day 150, open water through day 300.
- Cookhouse (⚠ `unpackIntoCold` is PINNED by a unit test — a delivered ice block lands IN the shut icebox — so a branch dropped in repair's W7 move fails loudly): the par line, `perceivedGoods` Coolbox rule, `restocks`
  `cold:` + the icebox unpack; the cook's row.
- Acceptance: every lint gate; `pnpm -C packages/content/hollow-mere test`;
  a boot of a fresh DB with the pack installed.
- Commit: `build(storage-and-ice W9): Hollow Mere — the mere, the
  icehouses, the ice company, and the cookhouse's ice`.

### W10 — The drive

The wire file `packages/wire/tests/storage-and-ice.dirty.wire.test.ts`
implementing the requirements' drive, every step, then `pnpm test`
once, the MR. See § Test & gate strategy for the file's contract.

- Commit: `drive(storage-and-ice): <what driving found>` plus the fixes
  it forces as `fix(<area>):` commits.

Docs that graduate at the sweep (not a wave): a new
`docs/subsystems/storage.md`; `thermal.md` (the exchange, the wet law,
immersion); `watershed.md` (the frozen pool, the patch walk, the
threshold); `retail.md` (the third source); `employment.md` (seasons,
`isOnShiftFor`); `logistics.md` (withdraw); `crafting.md` (the cut
plan); `materials` / `glass.md` (composition vs temper); `ground.md`
(the water surface, `bears`/`supportIsSlotted`, the `ice` kind, the
per-area snow seam) and `posture.md` (support on a slotted floor;
`stand` from the water); `locomotion.md` (`swim` with no target); the
`content-packs.md` (two packs). The `CLAUDE.md` map line and verb list
(`custody` category; `cut` is the kernel's; `mark`, `scrape`) are NOT
written by this build: they go to the one sweep after the last of the
four parallel builds merges (§ Parallel builds).

---

## Reachability wiring

Each capability: **verb · affordance · data · boot · arg gate**. Each
link fails closed and silent.

| capability | verb (view) | affordance (class static) | data (rows/settings) | boot | arg gate (`requires:` / defaults) |
|---|---|---|---|---|---|
| deposit at a house | `platform/cmd/custody/deposit.yaml` | `StoreBook.commandContributions.peers` | a `StoreBook` row in the room naming `storePath`; the stack row naming `businessPath`, `keeperPositions`, terms | the business and the house booted (unobserved economy); the keeper a live Cast | `thing: inventory, ContainableMixin`; `book: default reachable:[mixin.StoreBookMixin]` |
| withdraw | `withdraw.yaml` | same | receipts under `<business>/warehouse-receipts/` | same | `good: string`; `n: number optional` |
| stocktake | kernel `measure`/`analyze` | `Avatar` affords `measure` | `platform/idea/reading/stock.yaml`; a `gauging` tool in reach | `ReadingCatalogue` warms rows by path | `subjectRequires: StoreMixin`; the Reading narrows tools by `gauging` |
| put in / get from the stack | platform `put <good> in <stack>` / plain `get <good>` | platform | the stack is an open `Holder` whose contents are the faces; its row's keywords (`stack`, `pile`, `ice`) | — | `put` target `ContainerMixin` (`zero` branch → `canAddContainable`); `get` binds the face through `peers`' one-level reach into an open container (no `from`); `get 1 block` when a loose block is also in the room — ⚠ the house must be LIT (author `ambientIntensity`) or the face reads *something* |
| buy ice at the platform | platform `buy` | `Stock.commandContributions.peers` | `stockLines[].source`, `pricing: stocking`; `businessPath`; the company lists the counter in `operatingLocations` | the company booted | the line's leaf `ice-block` is what `buy ice-block` matches; `buy block` must also match → author the row's keywords and verify `carriesLine` |
| measure / analyze ice | kernel `measure`/`analyze` | `Avatar` | `trade/ice/idea/reading/ice.yaml` + `IceReading` class; a `spudding` tool | catalogue warm | `scope: [here]`; the reading takes the room's floor and narrows it by shape; subject raw = patch word |
| scrape | `trade/ice/cmd/ice/scrape.yaml` | `Scraper` (`environment`+`peers`) | scraper row `capabilities: [scraping]` | — | `tool default me:i:[capability.scraping]`; `patch: string`; the floor must support the actor |
| mark | `mark.yaml` | `IceMarker` | hand-marker / ice-plough rows (`gridM`, `draught`) | — | `tool default me:i:[capability.marking]`; the horse rung reads a `DraftAnimal` occupant |
| cut (ice) | kernel `cut.yaml` | `IceSaw` | ice-saw row `capabilities: [ice-sawing]`; the sheet row's keywords (`ice`, `field`) so `cut ice` binds the floor | — | `target requires any` (the floor, or a raw patch word); `IceSheet.cutPlan` narrows tools by `hasCapability('ice-sawing')` |
| cut (cloth) | kernel `cut.yaml` | `CuttingTool` | shears rows (`cutting`) | — | the cloth's `cutPlan` narrows by `hasCapability('cutting')` |
| standing, sitting, lying on the ice | shipped `stand`/`sit`/`lie` (`default: "ground"`) | shipped | the sheet row's `ground:1` slot (inherited from the Floor twin) | — | the floor's `canOccupy` by `bears(mass)`; bare `stand` routes to a slotted floor |
| going into the water on purpose | shipped `swim` with no target | shipped (`ShoreMixin` + the pool) | — | — | `target required: false`; refused where the floor has no open water |
| walk onto / swim into the pool | platform `go`/`walk`/`swim` | — | the pool row's `floor.template`; exit rows `media: [ground, water]`, `_conditional: true` | the sheet is minted by `ensureFloor` at the pool's `onCreate` | arrival → `floor.bears` (occupy or give way); `swim.yaml` `enablementMixin: SwimmableMixin` → `canEngageAxis` (open water) + `canBeEngagedBy` (unsupported / field open) |
| the horse on the ice | platform `go`/`lead`… | — | the draft horse row | — | `Beast.beforeTraverse` reads the destination floor's `bears` |
| fishing through a hole | fishing's `fish`/`lay` | fishing's | the mere's `stocks` | fishery registry | `reachFor`'s frozen gate reads the room's floor by shape |
| sawdust at the saw | carpentry's `saw` | `Sawmill` | `kerfM` on the saw rows; `/trade/carpentry/thing/sawdust` | — | — |
| seasonal seats | — | — | `rosterSlots[].schedule[].season` | the company booted so the tick runs | `SEASONS` closed vocabulary |
| the cook's ice | `restocks` (`job post supply …`) | — | the par line's `supplier` + `exemplar`; `cold:` in the cook's config; the icebox row | hearthworks already boots | the hauler's `buy` at the ice counter; `fulfill` (alias `handoff`, `platform/cmd/work/fulfill.yaml`) at the bench |
| the truthful lump | `look` | — | `metal-casting.yaml`; `getCastTemplate` rule | — | — |

---

## Acceptance-criteria coverage

| requirements AC | wave(s) |
|---|---|
| walk onto ice: in the water if it cannot bear you, on it if it can; decided by thickness and mass | W5 (the floor protocol, give way) + W6 (the sheet's `bears`) |
| a swimmer in near-freezing water cools several times faster; a summer swimmer unaffected | W5 |
| `measure ice` reports thickness and grade, more precisely to a skilled reader | W8 (reading) over W6 |
| a scraped patch reads thicker and black | W6 (patch walk) |
| a cut patch reads open at once, then thinner | W6 |
| a block's mass follows thickness and grid, grade follows the patch; a pan block reads cloudy | W6 (cut), W0 (default cloudy) |
| a draft horse cannot go out on ice a person can, until it thickens | W5 (`Beast.beforeTraverse`) + W6 (the sheet's `bears`) |
| anyone who goes into water comes out wet, worn clothes wet; wet clothes keep chilling in freezing air | W5 (+ the shipped wet-cloth law) |
| broke through: cannot climb out onto the ice that broke; can swim to the shore | W5 (`stand` onto a slotted floor; `canExit` by the attempted mode) + W6 |
| fishing frozen water refused except through a hole; a hole never leads down | W6 (the hole is `cut hole`; the auger is fishing-slate's, resolved) |
| after the thaw the pool holds no memory | W6 |
| crossing the mere = walking on its frozen pool; a mid-crossing break-through puts you in | W6 + W9 rows |
| summer: reached and crossed by swimming; chilled and wet | W5, W6, W9 |
| things left on ice that gives way float or sink | W6 |
| a river reach freezes below the threshold and opens above | W5 (threshold) + existing `iceAt` `running` — proved by `Ice.test.ts`, no authored river (per requirements) |
| `look` distinguishes scraped/marked/cut/regrowing; `measure ice` per patch | W6, W8 |
| cutting the whole field leaves nowhere to stand | W6 |
| an icehouse's stock falls through a summer: small faster than large; thin sawdust faster; estimable by `measure stock` | W2 (physics), W3 (reading), W9 (two houses), W10 |
| packing grows wetter; a repacked house keeps better; dug-out packing reads wet | W2 (meltwater, the wet grade), W9, W10 |
| the house room reads colder than the same room without the stock | W2 (exchange), W9 (the shed) |
| taking from the stack with no claim changes no receipt; discoverable by stocktake | W2 (face), W3 |
| custody: receipt fields; withdrawal returns the grade and charges the fee; pro rata; refused with no keeper | W3 |
| retail: the counter sells blocks brought up while the house holds ice, sells out when it does not; dearer in late summer | W4, W9 |
| the cookhouse icebox loop with money moving at the sale and the delivery | W9 (+ shipped `job`, `fulfill`, `buy`) |
| the crew and the ice boss rostered and paid in winter, not in summer; no other roster changes | W8, W9 |
| sawing leaves sawdust growing with the cuts; it can be gathered and packed into an icehouse | W1, W2 |
| ice, glass, wax lumps claim no temper and keep composition; recycled glass never clearer; iron keeps both | W0 |
| every stock, receipt and pond log survives a restart | W2, W3, W6; proved in W10 |
| the climate, maritime, assembly, smelting and fishing drives still pass | W5 (climate, maritime), W0 (smelting), W6 (fishing), W1 (assembly — the saw) — each re-run in its wave; all five again at W10 |

Nothing is unmapped. The requirements' *"or bored with the auger"* and
*"with tongs"* are resolved by the user (fishing-slate; flavour) and
recorded in D15 and D19.

---

## Test & gate strategy

- **Unit (per wave):** the store physics and its inequalities, the
  face lifecycle, the payout arithmetic, the clo byte-identity, the kerf
  conservation, the patch walk, immersion cooling ratios, the season
  flip, `cutPlan` outcomes for cloth and ice. Controller tests build
  models through `ref()`/`many()` fixtures (`MqlOneResult`), never a
  bare Stuff. Anything touching the wired runtime imports
  `test-bootstrap`.
- **Between waves:** `pnpm test:near`, every touched pack's `vitest
  run`, and `pnpm -C packages/server lint:family`. Not the full suite.
- ⚠ **The wiki-spoiler review log gets an entry** for the store's TRUE lines (`StoreMixin` lines are the world's exact stock — a spoiler a `measure stock` reading only brackets) and the ice sheet's `log` (W2, W6).
- **The two golden snapshots** (`scripts/__fixtures__/field-meta-golden.json`
  via `lint:field-meta --snapshot`, and
  `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` with a
  review-log entry) are regenerated in every wave that adds a
  persistent/authorable field (W0, W1, W2, W6, W8), and once more after
  each merge from master.
- **`pnpm test` runs exactly twice:** before the MR opens (after W10's
  drive passes) and at `/finalize`. A green run stays valid until a
  source file changes.
- **Wire drives re-run in the wave that touches their subject:** climate
  and maritime in W5, fishing in W6, textiles in W7, assembly in W1,
  smelting/glass in W0 — and all of them once more after W10.
- **The drive file** `packages/wire/tests/storage-and-ice.dirty.wire.test.ts`:
  - `DIRTY_REASON`: *"moves the world clock across a season, cuts the
    Hollow Mere's sheet, deposits into and buys from the icehouse, posts
    and fulfils the cookhouse's ice job, and restarts the world"*;
    `declareFile({file, packs: ['hollow-mere', 'trade-ice', 'water',
    'transport', 'trade-carpentry', 'trade-shopkeeping', 'hearts-delight',
    'hearthworks', 'terminus', 'trade-haulage', 'trade-fishing',
    'generic-objects', 'base-library', 'platform'], dirtyReason})`;
    `assertPacksPresent` in `beforeAll`.
  - Helpers copied from the climate drive by NAME: `goto(path)`
    (re-open the session at a path), `refusal(r)` reading
    `controller-rejected | command-rejected | locomotion-gate-failed |
    validator-failed` (add the fourth), `nextDay()` asserting the clock
    moved; `advance(days)` in ≤ 20-day steps each asserting the clock
    moved, standing in the icehouse (so the house restamps). A
    `season()` read via `CelestialApi.seasonAt` is NOT reachable over
    the wire; the drive asserts seasons by their effects (the roster,
    the sheet).
  - **Every checkpoint owns its position and preconditions** (`goto`
    first; daylight before any read — the pool is outdoors, the house
    authors its light), **opens by asserting the verb is understood**
    (`not.toMatch(/don't understand/)`), and **asserts a state change**
    (a count, a mass, a room, a receipt line, an account) — never only
    *not refused*. Put `noteKinds()` and the prose in every failure
    message.
  - Steps map 1:1 to the requirements' drive 1–21 with `mark` for
    `plough` (step 6/9), `get block` (step 10), `cut hole` (step 8).
    Step 2: walk out (`north` from the shore) → the room is the pool,
    `look` reads *in the water*, the body line reports cold, worn
    clothes read soaked; `stand` is refused in the floor's words; `swim
    south` lands on the shore. Step 3: a day later `north` → supported
    (`look` reads on the ice; `sit` on the ground succeeds), `north`
    again crosses to the far bank and back. Step 8: `cut hole` with the
    ice saw, `fish` through it, then `swim` (no target) lowers you into
    the channel and `stand` puts you back on ice that bears you — each
    asserted by the room's/body's state, not by the absence of a
    refusal.
    Step 12's two-house comparison reads both stacks with `measure
    stock` as the keeper (the drive's character is appointed keeper for
    that checkpoint — `appoint` is shipped) and the repack is performed
    on the large house by hand (`get sawdust` takes the wet face out of
    the stack — asserted by the stack's sawdust line falling and a wet
    heap in hand — then `put sawdust in stack` with fresh sawdust bought
    at the sawmill); step 10's house hand does `put block in stack`
    (the house's claim rises) and step 14's stranger does `get 1 block`
    (the line falls, no receipt changes — asserted by `measure stock`
    against `look book`); step 16 posts
    the job by advancing the cook's beat and then `job`/`buy`/`fulfill`
    as the hauler (⚠ once cleanliness has re-classed the cookhouse room,
    props re-lay only on the no-record branch, so steps 16 and 21 run on
    a FRESH DB after both land, and assert the delivered block's title
    lands with the business); step 12 reads the dug-out sawdust's
    wetness BEFORE any clock jump (cleanliness narrows the Wet far-past
    guard by holder chain, so a loose heap dries across a multi-day
    `advance`); step 21 restarts the world with assembly's exact
    sequence (wait 8 s for saves, `dev-preflight.mjs`, `bootOwnedWorld`,
    `stopOwnedWorld` in `afterAll`, `it.skipIf(!isOwnedTestWorld())`).
  - ⚠ A long jump costs; the summer step jumps in 20-day increments
    with a presence in the icehouse, and the sheet's state is pinned
    by unit tests so the drive asks the smallest question
    (`measure ice` once per stage, never a loop).
- **The drive is re-run after any review round that touches what it
  drives**, and the record in this doc shows the run: output, count,
  what each failure was.

---

## Risks & opens

0. **The repair build (build-3, `reqs/repair`) edits the same kernel
   files, unmerged.** Its W0–W2 rework `CraftingLogic` (`repairImpl`,
   `applyAssembledOutput`, `salvageByJoints`, the mint) beside this
   build's W0 salvage/off-spec edits, and its W7 adds `weatheringDays` /
   `laying` to `Material.ts` beside this build's W0/W1 additions. No
   design conflict (verified against its plan, 2026-10-17); a textual
   one is likely. Whichever lands second merges master first and re-runs
   the W0 freeze/salvage tests and the smelting and glass drives. Its
   moulding seam (a cast's maker = the discipline the mould credits)
   does not touch the ice pan: it authors no discipline.

1. **The sheet's own record.** A floor is a fixture with no container,
   so it must establish its own `(scope, key)` record keyed by its pool
   (D12). If `restoreOrSeed` on a fixture turns out awkward (the
   `Adornable` attach happens after the clone's `onCreate`), the
   fallback is a one-line `PersistableMixin(Pool)` twin the row names
   and capture through the room — the wave says which was taken. The
   drive's restart (step 21) is the proof either way.
2. **An item does not know its patch.** Float/sink sorts at the thaw
   (the whole surface) and not at a single cut; the requirements'
   *"or on a patch someone cuts"* is not literal here, because nothing
   records where on a 4 000 m² sheet a dropped tool lies. Drive step 12
   tests the thaw. If a reviewer wants the cut case, the honest seam is
   a `patchId` stamped on things dropped by an actor whose cut is in
   progress — a small addition, not a redesign.
3. **The estuary cove's floor changes** from the default board floor to
   the water surface (D12): `sit`/`lie` on its ground are now refused,
   which is a correction. Maritime's drive is re-run in W5 for it.
4. **The `ice` ground kind** is the first word added to the closed ten
   since the ground build; `lint:ground`'s report and any census that
   enumerates `GROUND_KINDS` are re-run, and the kind is folded only
   from the `ice` tag so no shipped floor changes its word.
5. **Unobserved-gap physics.** The store integrates its own gap from
   the weather walk (D4) because the room's `envelopeOutsideK` is stale
   while nobody is there. If `outsideKFor`'s site resolution is not
   callable from `lib/thermal`/`lib/storage`, the fallback named in D4
   (`AtmosphericMixin.outsideSegmentsSince`) keeps the outside the
   room's. Either way the drive's summer numbers are the test. If the
   room's envelope never reconciles at all between visits, the store's
   `envelopeSteadyStateK` call is what makes the melt honest; the room's
   own `envelopeTemperatureK` catches up at the next presence, which is
   shipped behaviour.
6. **The face's own clock.** An ice face in a warm shed can melt away
   as an object between reads; the `isDestroyed()` rule prevents a
   double debit, and `reconcile()` re-faces. If the drive shows a face
   vanishing within a checkpoint, author the house's light and volume
   so its air is cold (it should be: that is the point) rather than
   touching the rule.
7. **The season flip and the calendar.** D20 assumes day 0 = the
   northern spring equinox, from the climate drive's own comment. The
   W8 test pins it against `CelestialApi`'s solar geometry; if the
   equinox sits elsewhere, the quarter boundaries move with it and
   nothing else changes.
8. **`lint:perishable` on the sawdust and ice rows.** The gate keys on
   the material; the build runs it before deciding whether `Sawdust`
   composes `FreshnessMixin`. Do not compose it pre-emptively.
9. **Tuning `offsetK`** for a southern mere with an alive pin so the
   drive's first three steps (young ice, bears a day later, scraped
   patch black after several days) fall on days 0–10 and the thaw by
   day 150: a deterministic unit test in the venue pack, found by
   search before the drive is written.
10. **The clo migration** must be byte-identical; if any shipped
    textile row has `wAC ≤ 2` after all (rubber says none does), the
    cutoff changes its clo and the test fails loudly — then the cutoff
    setting is set to 0 in THIS build and rubber raises it with its
    boots, which is their call.
11. **`BUSINESS_DOCUMENT_KINDS` stays closed at three** by widening the
    receipt record, not the kind list. If the sweep prefers a distinct
    `store-receipt` kind, that is a one-line vocabulary edit with a
    schema-docs line, decided then.
12. **Bare `stand` on a slotted floor and `swim` with no target** are
    the two shipped-verb behaviours this build extends (D12). Both are
    conditional on the floor's `supportIsSlotted()`, so no ordinary room
    changes; the W5 tests pin that a chair-room's bare `stand` is
    byte-identical before and after.

---

## ⭐⭐ Parallel builds — the four plans read side by side (2026-10-17)

Four builds start at once off the same master: **rubber** (build-1,
`reqs/rubber`), **cleanliness** (build-2, `reqs/cleanliness`), **repair**
(build-3, `reqs/repair`) and this one. Each plan was read against this
one; nothing below is a design conflict that blocks a build, but several
files are edited by two or three builds and will conflict textually.
**The rule for every row:** the build that lands SECOND merges
`origin/master` first, resolves by hand as written here, re-runs the
named tests and drives, and never takes "theirs" wholesale. Expected
order (each sibling's own plan): this build and repair in either order,
rubber, then cleanliness (it says it merges after rubber and ice), then
repair's W7 (gated on rubber).

### Files more than one build edits

| file | this build | sibling | resolution |
|---|---|---|---|
| `S/lib/biome/Atmospheric.ts` `reconcileEnvelope` / `envelopeCoefficients` | D5: occupant `RoomHeatExchange` sum; the steady state pulled into `envelopeSteadyStateK(outsideK, atS)` | **rubber** W0–W3: `exposure()`, exterior area, solar gain per segment, interior-face terms `ΣU_i·T_i` | ⚠ the one hard conflict: ONE formula, in `envelopeSteadyStateK`: `T_ss = (U_ext·T_out + ΣU_i·T_i + ΣfixedW + driveW + P_solar(t) + ΣG_j·anchor_j) / (U_ext + ΣU_i + ΣG_j)`, `τ = C / (same denominator)`. Whoever lands second folds its terms into the other's. Re-run W2's icehouse arithmetic and rubber's hothouse tests |
| `S/lib/material/Material.ts` (+ `scripts/__fixtures__/field-meta-golden.json`) | W0 `getCastTemplate()` rule; W1 `permeability()`/`wetProperty()` | rubber W2 `lightAbsorption`, W4 `elasticity`/`crosslinking`, W5 the same two wet methods if first; cleanliness W3 `ashFraction`, `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`; repair W7 `weatheringDays`, `laying` | adjacent additions; the wet methods exist ONCE (second drops its copy); **regenerate** the field-meta golden, never hand-merge it |
| `C/platform/content/settings/wetness.yaml` + `AppSettings.ts` | `wetness.impermeableBelowPct: 2` | rubber the same row | one row, identical key and default; second skips |
| `S/lib/slot/Wearable.ts` `getClo` | W1 migrates `soak`/`kVoid` onto `wetProperty` | rubber W5 the same migration (if first); cleanliness W2 the stamp's shrinkage; rubber W8 `fitOn` | identical migration, second skips; other edits are separate regions |
| `S/lib/slot/Attired.ts` | D11 `immerse(parts?)` | rubber `exposeToRain(delta)`; cleanliness `doff(garment, {careful})` + a soil clause in the impression | separate methods; trivial adjacency |
| `S/lib/ground/Floor.ts` + `platform/thing/Floor.ts` | W5 `bears`/`supportIsSlotted`; `WaterSurface`, `IceSheet` subclasses; the `ice` kind in `GroundKind` | rubber W1 `isOnGrade()` default + the snow gate on `rainReaches()`; cleanliness W0–W4 `SoilableMixin` on the twin (`receiveTraffic`, `soilFeetOf`, `strewn`, `cleaningMethod`, `stalls`, `soilAugmenter`) | text adjacent; ⚠ meaning: see *Floors* below |
| `S/platform/idea/api/CraftingLogic.ts` | W0: the off-spec lump's template choice + salvage's metal branch — kept as **one small template-choice helper** so it re-applies onto a rewrite | repair W0–W3/W7 rewrites `repairImpl`, `applyAssembledOutput`, `fitImpl`, the mint, salvage-adjacent code (its range `:3215–4000` contains our salvage hunk); cleanliness W1/W5/W6 `Recipe.soils`, `contaminateFromKit`, `presentFulfillers` | ours is the small hunk: if second, re-apply the helper; re-run W0's freeze/salvage/off-spec tests (salvage a `Tool`, so it passes whether or not repair has made Tool Assembled) and the smelting + glass drives |
| `S/platform/idea/api/EmploymentLogic.ts` `tickBusiness` | D20: the season on `RosterClock` only | repair W4 groups assignments by assignee and moves for the shift | re-thread the clock's season into repair's per-slot `evaluate`; ask repair to make `check-openings`' overlap arm season-aware (a winter-only and a year-round slot do not overlap) |
| `S/lib/behavior/restocks.ts` | D21 `unpackIntoCold` + `cold:` | repair W7 moves `order`/`unpackBench` onto `BusinessMixin.orderShortfall`/`receiveBench` | repair carries `unpackIntoCold` and the `cold` option across whole |
| `S/lib/location/Shore.ts` + `S/lib/location/WaterSource.ts` | D15 `ShoreMixin.drawAt(key, room)`, `WaterRead.underIce` | cleanliness's `wash`/`bathe` consume `drawAt`; cleanliness adds `WaterDraw.hardnessDgh` | ONE gate; second lander moves its own consumer onto it |
| `S/lib/thermal/ThermalRegulation.ts` | D10/D10a `exchangeWithWater(waterK, dtS)` called from `effectiveAmbient` | cleanliness's tub/shore `bathe` call it | if cleanliness lands first with its own copy of the fold, fold it into this one method |
| `C/water/src/idea/WatercourseCatalogue.ts` | W6 `iceAt(ref, nowS, opts)` | cleanliness D12 `hardnessDgh` in the reach read | separate regions |
| `C/trade-bottling/.../material/ice.yaml` → `C/base-library/.../material/bulk/ice.yaml` | W0 moves it, deletes the bottling row | rubber W2 authors `lightAbsorption ≈ 2/m` on it | modify/delete: if we land first rubber authors on `bulk/ice.yaml`; if rubber lands first we carry its line into the moved row |
| `C/hearthworks/...` | `idea/business.yaml` (ice par), `agent/cook.yaml` (`cold:`) | cleanliness re-classes `location/cookhouse.yaml` (persistent room); repair edits `thing/smithy-tariff.yaml`, `location/smithy.yaml`, a heirloom row | different files; once cleanliness lands, the icebox's contents persist with the room (harmless) |
| registries: `Mixins`/`MixinApi`, `check-closed-vocabularies.ts`, root `package.json` pack list, `scripts/__fixtures__/field-meta-golden.json`, `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` | Store, Poolable, Composition, Tempered, StoreBook, `isSwimmable`; `SEASONS`; trade-ice, hollow-mere; new fields (`iceQuality`, the stockpile's, `kerfM`, `seedLines`) | every sibling appends | list-append conflicts; **re-snapshot both golden files after the merge** and keep every build's review-log entry (W0, W2, W6, W8 regenerate them in this build: `lint:field-meta --snapshot` + the wiki-spoiler entry) |
| `S/platform/idea/cmd/crafting/FireController.ts` `runFiring` | W0: the alloy-merge narrowings (`:340`, `:360`) become `isComposition` so a composition-only lump keeps its fractions | **rubber** rewrites `runFiring` (the alloy merge + its mould seam) | if rubber lands first, re-apply the `isComposition` swap INSIDE its rewritten `runFiring`; if we land first, rubber keeps it |
| `S/platform/location/Pool.ts` | W5: the floor default (`WaterSurface`), the support hooks (`onEntered`/`onExited`/`onContainableAdded/Removed`/`canExit`/`canEngageAxis`/`canBeEngagedBy`), the temperature override for `immersionOf` | **cleanliness** adds `bathe` on the pool | separate members; cleanliness's `bathe` calls our `immerse()` and must not re-implement the support state |
| docs at the sweep | `thermal.md`, `ground.md`, `crafting.md`, `employment.md`, `retail.md`, `watershed.md` | all siblings | trivial; sweep last. ⚠ **`CLAUDE.md`'s map and verb list are NOT edited by any build** (rule 5: swept, not raced) — every build adds verbs; the one sweep after the last merge writes them all |

### Concepts two builds share (one owner each)

- **The wet law** — ONE pair of `Material` methods (`permeability()`,
  `wetProperty(dry, fluid, saturation)`), first lander writes it;
  rubber and cleanliness consume. (Rubber's plan still has stale
  `MaterialLogic`/`MaterialApi` wording; its D12.1 is the binding text.)
- **Immersion** — ours: `Attired.immerse(parts?)` and
  `SwimmableMixin.immersionOf`. Rubber's flooded cell and cleanliness's
  `bathe` consume them as written in D10/D11.
- **Sawdust is ONE heap** — ours: the carpentry `Sawdust` good
  (Poolable + Stackable, one stack per wetness band). ⚠ **Asks of
  cleanliness:** sweep sawdust AS a `Sawdust` stack, never fold it into
  `/stuff/thing/sweepings` (the icehouse keeper's `get sawdust` and the
  store's pool key need the template); drop or give a producer to its
  `sawdust` `DirtKind` row; if `Sweepings` merges anything it needs a
  class.
- **Floors** — ours: `bears`/`supportIsSlotted`, `WaterSurface`,
  `IceSheet`, the eleventh kind `ice`. ⚠ **Asks of cleanliness:** a
  water surface takes no dirt — its `receiveTraffic` and `soilFeetOf`
  must exempt a floor that does not bear (open water) and an `IceSheet`
  (tracked mud on a mere is wrong, and a swimmer climbing out is wet,
  not muddy); map the `ice` kind in `cleaningMethod`'s table; order its
  `soilAugmenter` after the sheet's `groundPhrase`; and its fixture-state
  slice must NOT capture the sheet's `log` (the sheet keeps its own
  `(scope, key)` record — D12).
- **Rooms in one building share heat** (rubber D7) — the icehouse
  platform and house couple through their wall; the control shed stands
  alone in its own Structure (D22).
- **`lint:unhoused` does not exist**: rubber replaced it with
  `lint:biome-sky` (rows under a non-sky biome lacking `enclosure:` or
  `roof:`). If rubber lands first, the four icehouse rooms author
  `roof:` (pine, 0.05 m) in W9; if we land first, rubber's census
  authors it.
- **Building upkeep** — repair's W7; the icehouse and sawdust are
  deliberately off there and opt in later by declaration. Leave
  sawdust's `laying`/`weathers` unauthored.
- **Every `Tool` becomes an assembled, keen, one-piece host under
  repair** — `look` gains *"It is one piece."*: no drive or test of this
  build pins a tool's `look` text.

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **Store-to-store transfer, the ship's hold, cargo** → freight-slate.
  Attach: `StoreMixin.drawForHouse` / `deposit` are the two ends; a
  transfer is a draw at one and a deposit at the other with a bill of
  lading between.
- **Damp, spontaneous combustion, vermin** → storage-slate (next pass).
  Vermin's substrate is cleanliness's `Floor.hasPests()` /
  `pestRatePerHour` (a `pests` term in `StoreConditions`); spoiled
  packing a keeper digs out goes to cleanliness's midden via `dispose`
  once it lands (until then, the floor).
  Attach: `reconcileInStore` receives `StoreConditions`; a humidity term
  and a `heatW` source on the good are the seam; `poolRole` admits a
  third role.
- **Transferable receipts** (futures, collateral) → storage-slate;
  `StoreReceipt.depositor` is the field a transfer re-writes.
- **The bank vault as a store** → banking/currency slate (recorded in
  storage-slate § 4).
- **Migrating the timber yard; timber's seasoning as pool state** →
  storage-slate (candidate). `PoolableMixin` on the board with
  `poolState = {seasonedFraction}` and the minimum merge.
- **Ice rescue** (a rope from thicker ice, crawling out flat) →
  ice-trade-slate. Attach: `IceSheet.bears(loadKg)` and the floor's
  `canOccupy` are where a prone posture (`lie` on the floor's slot)
  would spread a load; a rope is a `Slottable` pull from a supported
  body.
- **Ice-fishing gear and behaviour** → fishing-slate. Attach: the
  frozen gate in `reachFor`.
- **Handling at scale** (poling, hooking, the elevator; tongs as a
  gate) → freight-slate.
- **Thin ice over a current, pressure ridges** → watershed. Attach:
  `iceAt`'s `opts` is where a per-reach variation enters.
- **A frozen lake crossed by compass** → navigable-water-slate /
  expanse.
- **Going under the water; recovering what sank** → underwater-slate.
  Attach: `PoolBottom` is the holder; diving is the verb that opens it.
- **The building's upkeep** → the repair build's W7 (`reqs/repair`, build-3: layers weather by `Material.weatheringDays`, `maintain` lays them under the layer's `laying` trade; buildings and materials opt in by declaration; the icehouse and sawdust are OFF there until a supply reaches the icehouse). The erection bill of goods → structures-slate.
- **Night-sky radiation (pan ice)** → the weather slate; rubber's roof
  face is the attach point.
- **NPC restocking unobserved** → unobserved-economy-slate; the
  physics needs nothing.
- **The iceman's route; the ice card** → logistics-slate /
  standing-instructions-slate.
- **Climate's crossings brought onto the pool model** (the Circle and
  the north cross the ice without standing on it) → a later pass;
  recorded in the climate slate by the sweep.
- **Natural-ice contamination** — `mould.md § Deferred` names *"the
  pool's payload onto a non-food cast (dirty water → a dirty block)"*,
  which is this trade's typhoid history (sewage-fouled river ice, the
  1890s scare that handed the trade to plant ice). Attach: the cut
  stamps nothing of the water today; the seam is `cutBlock` reading the
  reach's `waterStateAt` contamination (the water pack's `contamination
  by kind`, watershed.md) onto the block's `ContaminableMixin` the way
  `castInto` carries a payload onto a cast that can hold it; the store
  line's state would then carry a load the way sawdust carries
  saturation. → cold-chain-slate (the cold chain's purity rung) with a
  pointer from the ice-trade-slate.

---

## Critical files

Read first, in this order, with the lines cited in § Grounding:

1. `docs/requirements/storage-and-ice-requirements.md`
2. `packages/server/src/mud/lib/retail/Stock.ts`, `lib/stuff/Stackable.ts`,
   `lib/spatial/Container.ts` (58–106), `platform/idea/api/ContainmentLogic.ts`
   (`placeOn`), `platform/idea/cmd/inventory/{Put,Get}Controller.ts`,
   `api/mql/scope-walk.ts` (133–163), `docs/subsystems/mould.md`,
   `lib/mould/Mould.ts`, `platform/thing/Mould.ts`
3. `packages/content/terminus/src/market/thing/MarketStalls.ts` (the
   persistence shape); `packages/content/trade-quarrying/src/location/OpenWorking.ts`
4. `packages/server/src/mud/lib/biome/Atmospheric.ts` (1182–1300,
   1379–1430), `lib/thermal/SpaceHeating.ts`, `lib/thermal/Thermal.ts`
   (416–424, 1062, 1313–1415), `platform/idea/api/BiomeLogic.ts` (~1196)
5. `packages/server/src/mud/lib/slot/Wearable.ts` (380–431),
   `lib/material/Material.ts` (132, 394, 507–565)
6. `packages/server/src/mud/lib/thermal/ThermalRegulation.ts` (500–610),
   `lib/locomotion/Swimmable.ts`, `platform/location/Pool.ts`,
   `lib/location/Shore.ts`, `lib/spatial/Mobile.ts` (100–112, 395–470,
   905–1015), `platform/idea/api/LocomotionLogic.ts` (225–280, 416–467,
   533–541), `lib/respiration/Respiration.ts` (244–284)
6a. **The floor model:** `docs/subsystems/ground.md` and
   `docs/subsystems/posture.md` (whole), `packages/server/src/mud/lib/stuff/Location.ts`
   (52–61, 368–420, 449), `lib/ground/Floor.ts` (142–146, 150–215,
   323–400, 560–625), `lib/ground/GroundKind.ts` (55–185),
   `platform/thing/Floor.ts`, `lib/slot/Slotted.ts` (328–400),
   `lib/slot/Slottable.ts` (142, 226–258), `lib/character/Posed.ts`
   (82–87, 268–340), `platform/idea/cmd/posture/StandController.ts`,
   `platform/idea/cmd/movement/SwimController.ts`,
   `packages/content/platform/content/platform/cmd/{posture/stand,posture/sit,movement/swim}.yaml`,
   `packages/content/generic-objects/content/stuff/thing/surface/default-floor.yaml`,
   `packages/server/scripts/check-ground.ts` (1–80, 500–700)
7. `packages/content/water/src/idea/WatercourseCatalogue.ts` (480–520,
   700–730, 1616–1685), `packages/server/src/mud/api/weather.ts` (244–266),
   `packages/content/water/content/settings/water.yaml`
8. `packages/content/transport/src/idea/IceCrossingExit.ts` (read, not
   changed), `packages/content/world-seed/content/world/circle/**`
9. `packages/content/trade-tailoring/src/idea/cmd/tailoring/CutController.ts`,
   `src/thing/CuttingTool.ts`, `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
10. `packages/server/src/mud/platform/thing/Casting.ts`,
    `lib/material/Alloyed.ts`, `platform/idea/api/CraftingLogic.ts`
    (105–115, 2665–2705, 3455–3500), `packages/content/trade-glass/src/idea/cmd/glass/CrackController.ts`,
    `packages/content/generic-objects/content/stuff/thing/{ice-block,ice-lump,ice-pan}.yaml`,
    `packages/content/base-library/content/stuff/idea/material/bulk/water.yaml`
11. `packages/content/trade-carpentry/src/idea/cmd/carpentry/SawController.ts`
    (290–370)
12. `packages/server/src/mud/lib/employment/{Roster,Employed}.ts`,
    `platform/idea/api/EmploymentLogic.ts` (800–905, 1600–1710),
    `lib/behavior/restocks.ts`, `packages/content/hearthworks/content/world/terminus/hearthworks/{idea/business,agent/cook}.yaml`
13. `packages/content/trade-haulage/src/thing/Warehouse.ts`,
    `src/idea/WaybillRegistry.ts` (100–140, 290–340),
    `packages/server/src/mud/platform/idea/api/DocumentLogic.ts` (157–170)
14. `packages/server/src/mud/lib/instrument/Reading.ts` (420–475,
    710–745), `packages/content/water/content/system/water/idea/reading/depth.yaml`,
    `packages/content/trade-coopering/content/trade/coopering/idea/reading/capacity.yaml`
15. `packages/content/hearts-delight/pack.yaml`, `package.json`,
    `packages/content/terminus/content/world/terminus/terminal/structure.yaml`
16. `packages/wire/tests/climate-and-water.dirty.wire.test.ts` (1–190),
    `packages/wire/tests/assembly.dirty.wire.test.ts` (615–680),
    `packages/wire/src/harness/index.ts`
17. `docs/plans/rubber-note-to-storage-and-ice.md`,
    `docs/plans/storage-and-ice-note-to-rubber.md`, and build-1's
    `docs/plans/rubber-plan.md` D12 (the wet law), re-checked at build
    time for whether rubber has landed.
18. Memory doctrine the plan was written against (read if any of these
    is about to be violated): mixin-authoritative-controller-dumb,
    verb-collision-ladder, oo-calling-conventions,
    mixin-on-the-wrong-host, a-hook-needs-more-than-one-implementer,
    never-invent-the-third-consumer, bound-arg-is-mqloneresult-not-stuff,
    rerun-the-drive-after-every-review-fix,
    drive-checkpoints-own-their-position, persistence-capture-the-host,
    no-new-mongo-collections-document-tree,
    instrument-affords-not-furniture, perception-gates-binding,
    unlit-interiors-are-pitch-black.

---

## Drive record

*(appended at build time, not at plan time — the output of running the
requirements doc's drive script, the count, and what each failure was.)*
