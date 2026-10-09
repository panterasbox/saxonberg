# Drilling — implementation plan

Executes [drilling-requirements.md](../requirements/drilling-requirements.md)
(**kind: feature · leads from: content**; sited at Rejection; three
stages — **A brine · B gas · C oil** — against one technique). The build
stands up a `trade-drilling` capability pack holding the **hole** (the
derrick, the wellhead, the bailer, the liner, the bore log, the crew), teaches
the ground column to hold a **fluid body** with a readable structure and an
unreadable charge, gives the fractionation substrate a **second kind of
separation**, lets the brine hearth burn **gas from a coupled vessel**, and
ships the oil field's barrel honestly — two fractions with buyers and three
with none. Everything else it needs already ships and is cited below.

Branch `design/2026-10-08-rgo-track` (build-2). Written 2026-10-08.

> **The invariant this build is for:** a borehole is a **point, not a
> place.** It mints no room, adds no node to the location graph, and what
> comes out comes up a pipe. If a wave finds itself wanting a `Location`,
> the wave is wrong.

---

## Grounding

Verified by opening files this cycle (2026-10-08). The caller's survey was
treated as fact and re-opened only where a plan decision depended on the
detail; the places where the code says something the requirements did not
expect are marked ⚠ and carried into § Risks & opens.

### The column

- `packages/content/ground/src/idea/Deposit.ts` (786 lines) — `GroundSourceMixin(Idea)`,
  pure data, **no mutable state** (header `:4-14`, `:25-30`; `mining.md:92-130`;
  `ferrow.yaml`'s own header). Eight authored fields with `fieldMeta`
  (`:255-266`): `name` · `stratigraphy: StratumBand[]` (`toZ`, `host`, `wins?`) ·
  `waterTable` · `lode: Lode | null` · `zones: GradeBand[]` · `depletion` ·
  `features` · `gas: {material, belowZ, strength} | null`. `sampleAt(at: Point,
  seed): GroundSample` is synchronous, metres, z negative down, folds
  pin → lean → procedural (`:318-370`). `seedFor(address)` = FNV-1a ^
  `BASE_SEED` (`:301`, `:627`). `surfaceReadingAt(x, y, errorDeg, seed)`
  (`:402-446`) returns **truth and observation** with the bracket as an
  INPUT — and ⚠ returns `null` for a flat-lying lode (`nH < 1e-9`,
  `:418`), so *"a `dip: 0` slab is a volume"* would also be a body with
  **no surface read at all**. `dipReadingAt` (`:461-468`) is `null` unless
  `at[2] < 0 && isInLode(at)`. `gasAt(z)` is `protected` (`:375`). The
  row: `packages/content/rejection/content/world/terminus/rejection/idea/deposit/ferrow.yaml`
  (water table −45, lode through `[0,0,-20]` striking 041 dipping 62, gas
  `firedamp` below −20); the quarry's column at `…/idea/deposit/quarry-hill.yaml`
  (halite at −10…−12, `wins: /stuff/idea/material/food/salt`).
- The citation lives on the **region zone**: `rejection.yaml:45`
  `deposit: /world/terminus/rejection/idea/deposit/ferrow` on a plain
  `CartesianZone`; `SpatialZone.ts:58,162-165` declares `deposit` in
  `fieldMeta` (the header there records why a pack cannot add a field to a
  kernel zone). Every room under the region inherits it by `lookupField`.
- Resolution: `StuffApi.singleton<Deposit>(path)` is the get-or-create
  (`Strata.ts:231-244`, `SurveyReading.ts:98-110`).

### The position seam

- `packages/content/ground/src/lib/Strata.ts` — `StrataMixin<TBase extends
  MixinConstructor<Stuff & Container>>` (`:112`); `getCell()` reads
  `getCoordinates()` (`:119-124`); `metresOf` reads `getZone().getCellSize()`
  (`:131-137`); `getDeposit()` walks `getZone().lookupField('deposit')`
  (`:150-160`); `getGroundSeed()` is `Deposit.seedFor(AddressApi.resolveLocalityFor(this).getAddress())`
  (`:166-171`). ⚠ `:8-9` predicts *"a cellar, **a well** and a cave"* as
  the next consumers — a well is not a room, and this plan says so (D3).
- The trio for *"I have a place, not a working"* already exists twice:
  `packages/content/trade-mining/src/lib/SurveyReading.ts:121-176`
  (`depositAt(place)` / `metresAt(place)` / `seedAt(place)` / `groundAt(place)`)
  and `packages/content/trade-farming/src/lib/SoilReading.ts:178`
  (`sampleAt(place)`). A wellhead is the **third** — the promotion trigger.

### The reservoir-state pattern

- `packages/content/water/src/idea/FisheryRegistry.ts` — `RegistrarMixin(Idea)`
  singleton (`:148-150` sets `registerPrefix = '/system/water/fisheries'`,
  `registerOwner = '/system/water'`, `registerKind = 'fishery'`),
  `FisheryRecord {reachRef, drawn: Record<string, number>, reconciledAtS}`
  a plain interface (`:93-99`); capacity **derived** (`:183-230`); `recovered()`
  reconciles on read and the caller decides whether to write; a reach
  nobody fished has no document. `RegistrarMixin` itself
  (`packages/server/src/mud/lib/document/Register.ts:52-100`) has **no**
  read/write surface — writes are `DocumentApi.saveToRegister(register,
  path, data)` (`api/document.ts:196-202`, gated
  `FromMixin(Mixins.Registrar, caller === args[0])`), reads `DocumentApi.read`
  / `list(prefix)` (`:133`, `:141`).
- The contrasting shape: `packages/content/trade-apiculture/src/lib/Colony.ts:152-163`
  — persistent fields (`strength`, `pollenKg`, `colonyStamp`, …) with
  `reconcileColony()` on every public read (`:262-277`), because a hive is
  an object you stand next to.
- The minted-instance shape, which is the one the wellhead needs:
  `packages/content/terminus/src/market/idea/cmd/StallController.ts:95-205`
  — `idsFor(fixture, pitch)` keys the counter `<seed>/<fixture row>/<pitch>`,
  `StuffApi.clone(seed, undefined, {asIdentityPath})`,
  `PersistableApi.restoreOrSeed(counter, key)`, `ContainmentApi.move` into
  the room, `PersistableApi.capture(counter, key)`; the HOUSE is a
  `Business` cloned from `/trade/shopkeeping/idea/business/stall`
  (`…/content/trade/shopkeeping/idea/business/stall.yaml` — one seat,
  `appointingAuthority.path: ""`, `banksAt: ""`, overlaid at mint) with a
  `dataOverlay` naming the renter as appointing authority and their bank.
  `(scope, key)` persistence: `docs/subsystems/residence.md:53-61`.

### The reading ladder

- `packages/server/src/mud/lib/instrument/Reading.ts` — `SingletonMixin(Idea)`
  (`:245`), `PATH_INFIX = '/idea/reading/'` (`:247`), twelve authorable
  fields (`:252-312`: `channel`, `kind`, `scope: ReadingScope[]` where
  `ReadingScope = 'self' | 'here' | 'subject'` (`:132`), `subjectRequires`,
  `discipline`, `instrument`, `instrumentNoun`, `handTool`, `eyeCeiling`,
  `bench`, `improves`, `stakes`). `runAnalyze`/`runMeasure` (`:401-461`)
  resolve the subject by scope then dispatch the `@hook` rungs
  (`analyze`/`measure`/`benchRead`, `:466-510`). Bracket:
  `halfWidthOf(truth, band) = |truth| × HALF_WIDTH[band]` (`:776-778`,
  `{untrained .08 … expert .005}` `:184-190`), with the header at `:179-183`
  **inviting an override for a non-ratio quantity**. ⚠ `observe` uses
  `Math.sin(seed)` (`:687`) — do not copy. The field book: readings stored
  in the DISCOVERY realm **without the band** (`SurveyReading.ts:214-250`).
- `GroundReading.ts:41-110` (`analyze ground`): recalls the field book,
  averages, `residual = errorDeg / √n` (`:92`) — the one place more
  readings narrow the answer.
- Warmed by `ReadingCatalogue` (`platform/idea/ReadingCatalogue.ts:36-71`),
  keyed **by channel token** (`byChannel`), on `onCreate` and lazily on
  first miss. ⚠ Two rows claiming one channel token collide; a pack's
  channel must be a **new token**.
- The shipped `pressure` channel
  (`packages/content/platform/content/platform/idea/reading/pressure.yaml`,
  `scope: [here]`, `eyeCeiling: untrained`, instrument `barometry`) reads
  `BiomeApi.resolvePressureFor(scope: Stuff & Container)`
  (`PressureReading.ts:26-29`) — atmospheric, Container-only.
- Mining's channel rows (`…/trade/mining/idea/reading/strike.yaml`) are the
  exemplar for a pack channel: `class`, `channel`, `kind: fact`, `scope`,
  `discipline`, `instrument`, `instrumentNoun`, `eyeCeiling`, `improves`,
  `stakes`. The article defect: a bound object arg needs `greedy: true`
  (`measure.yaml:59`, `instrumentation.md:138-146`).

### Pressure and bulk

- `packages/server/src/mud/lib/bulk/Bulkable.ts:666-700` —
  `getGasPressureAtm()` = amount / capacity, only for a material whose
  `requiredClosureFor` is `sealed`; docstring: *"Pressure is a CONSEQUENCE,
  not a field … One atmosphere is the ceiling this build … `maxPressureAtm`
  later."* `isGasRetained()` (`:704-717`) = closure meets requirement AND a
  lid that exists is shut. `gasLevelWord()` (`:916`) is the five-word
  no-gauge read.
- `platform/idea/api/BulkableLogic.ts:161` — `requiredClosureFor`: `0 <
  boilingPoint ≤ atmosphereStandardK (293)` → `sealed`. ⭐ **A pack ships
  a gas by authoring a boiling point** (`firedamp.yaml` 112 K, `coal-gas.yaml`
  110 K). `transfer` (`:327-361`) already handles a gas poured into an
  under-closed vessel: it **escapes** into the room's air (`status:
  'escaped'`, `reason: 'gas-escapes'`, `:781` puts it in the Atmospheric).
- The four policy seams every Bulkable host may override
  (`Bulkable.ts:396-422`, read by the slot at `:255,292,300,333`):
  `getBulkMaterialPath` · `getBulkAvailable` · `debitBulk` ·
  `getBulkPayloadForDraw`. `FractionatingMixin` overrides all four
  (`lib/fractionation/Fractionating.ts:571-660`).
- `BulkPayload` fields are **declaration-merged** from each subsystem's
  own file (`declare module '../bulk/Bulkable'` in `vitals/Blood.ts:48`,
  `maturation/Maturing.ts:1328`, `metabolism/DissolvedToxins.ts:52`,
  `material/Contaminable.ts:203`, …). No kernel edit for a pack field.
- Sealed vessel rows: `generic-objects/…/gear/air-tank.yaml` (`closure:
  sealed`, with the comment explaining why), `trade-fuel/…/thing/gasometer.yaml`
  (`class: /trade/fuel/thing/Gasometer`, 20 000 L, `fixedInPlace`,
  `closure: sealed`), `…/thing/gas-bladder.yaml` (`/platform/thing/Flask`,
  400 L, `closure: sealed`, `open: false`). `oil-cask.yaml` /
  `lamp-oil-cask.yaml` are `/platform/thing/Bottle` 40 L with **no
  `closure`** (inherit `liquidTight` — right for oil) and ⚠ **no `mass`**.
- ⭐ CONFIRMED: no crude, petroleum, naphtha, kerosene or paraffin-wax
  **material** row exists. The one lamp fuel is
  `trade-fuel/content/stuff/idea/material/bulk/lamp-oil.yaml`
  (`tags: [liquid, lamp-oil, fuel, flammable]`, boiling 470 K, keywords
  include `kerosene` and `paraffin`; header `:12-17`: the crafted route *"is
  the destructive-distillation build, and this row is ready for it … a lamp
  burns lamp oil because of what lamp oil is"*). No recipe produces it.

### Fire, the hearth, the lamp, the candle

- `packages/server/src/mud/platform/thing/Oven.ts:25-27` —
  `ContainerMixin(PlacingMixin(Firebox))`, **empty body**. `Firebox`
  (`lib/fire/Firebox.ts:51`) = `BurnerMixin(LightSourceMixin(ThermalMixin(Thing)))`.
- `lib/fire/Burner.ts` — `fuelBed: Record<materialPath, kg>` (`:378`);
  `fuelSource()` hook (`:411`, default `{kind:'bed'}`); **`fuelSlot()` hook
  (`:427`, default `null`)** — *"the bulk slot that IS this vessel's fuel
  tank"*; every fuel read branches on it (`fuelRemaining :434-445`,
  `:450`, `:469`, `:511`, `consumeFuel :840-855` debits the slot by
  litres at the material's density); `stoke` refuses `'no-bed'` when
  `fuelSlot() !== null` (`:802`). Acceptance is **any tangible whose
  material has `heatOfCombustion > 0`** (`:801-828`) — no fuel category.
  `Lamp.ts:105-122` is the one override: the interior slot when
  `interiorBulk` is authored. ⚠ **An Oven cannot burn gas from any vessel
  today**; the pan's heat is `ThermalMixin.heatSourceK()`
  (`lib/thermal/Thermal.ts:997`) reading a lit Burner it is **inside** or
  placed on.
- The brine chain, `packages/content/trade-quarrying/content/trade/quarrying/`:
  `thing/brine-hearth.yaml` (`/platform/thing/Oven`, 450 K, 15 kW, 100 kg
  bed, **no `placements`**), `thing/salt-pan.yaml` (`/platform/thing/Vat`,
  40 L, `closure: open`, `open: true`), `idea/maturation/brine.yaml`
  (`inputCategory: brine`, `mechanism: evaporative`, `ratePerDay 0.25`,
  `productMaterial: …/food/salt`, `productFraction 0.1`). `Vat` composes
  `MaturingMixin` (`platform/thing/Vat.ts:37-45`) — the mechanism is on the
  VESSEL. `salt-water.yaml` carries `tags: [liquid, brine, conductive]`.
  `salt-cure.yaml` (cooking) and `salt-hide.yaml` (tanning) take `category:
  salt` — a tag, which `food/salt` and `halite` both carry. `boil.yaml`
  exists (`platform/cmd/crafting/boil.yaml`) but the hearth is not driven
  by it: the pan sits **in** a lit hearth and reconciles on read.
- ⚠ **There is no street-lamp object.** Street lighting is
  `PublicLightingMixin` on the Locality supplied by
  `packages/content/energy/src/thing/FuelStore.ts` (`OIL_TAG = 'lamp-oil'`
  `:44`; `oilLitresIn` `:189-193` counts casks placed in the store whose
  interior material **has the tag**; `drainLitres` `:199-215`). The
  portable lamp is `platform/thing/Lamp.ts` (fuel is its own interior,
  filled by `fill <lamp> from <cask>`, no material predicate beyond
  closure); rows `terminus/…/general-store/thing/lantern.yaml` and
  mining's `safety-lamp.yaml`, both `closure: liquidTight`.
- `trade-chandlery/content/trade/chandlery/thing/candle.yaml` has **no
  `_materialPath`**; `recipes/candle.yaml` takes `category: candle-stock`
  (`measureL: 0.12`, `requiresHeatK: 340`); `DipController.ts:145-151`
  calls `adoptMaterialSmell()` + `adoptMaterialFuel()` (the latter lives on
  `Candle.ts:136`, not on Burner). ⭐ A wax is **a material tagged
  `candle-stock`** (`beeswax.yaml:40`, `tallow.yaml:53`) — a third wax is a
  tag.
- `Gasometer.ts` (`trade-fuel/src/thing/`) — `BulkableMixin(ThermalMixin(Thing))`,
  no fields, `receive(materialPath, litres)` (`:38-54`); filled by the
  `fire` verb's `receiveVolatiles` chain (retort → condenser → whatever is
  placed on the condenser, `Condenser.ts:52`); drawn by `fill`.

### Fractionation

- `packages/server/src/mud/lib/fractionation/FractionSchedule.ts` —
  `SingletonMixin(Idea)` (`:115`); fields `key`, `inputCategory`,
  `discipline`, `requiresHeatK`, `productMaterial`, `residueMaterial`,
  `readBlur`, `gradeStretch`, `fractions` (`:117-156`, all
  `{persistent, authorable}` `:158-168`); `FractionSpec {key, upTo,
  character, gradeBand, toxins?, requiresHeatK?, aromaticCarry?}`
  (`:59-113`); `setFractions` validates non-empty, unique keys, `upTo`
  strictly ascending in (0,1], a real grade band, no digit in `character`
  (`:335-340`), last fraction leaves a residue (`:342-347`). Statics
  `byKey`, `forMaterial` (`:382`, `:394`); instanceable twin at
  `platform/idea/fractionation/FractionSchedule.ts`.
- `lib/fractionation/Fractionating.ts:215` — `__validateComposition__`
  requires Bulkable; `drawnL` `{persistent, runtimeState}` (`:236,247`);
  `reconcileRun` (`:264`); the four seams (`:571-660`) — ⚠ `getBulkMaterialPath`
  carries the poisoned-bottle history (`:560-575`); `getBulkAvailable`
  clamps at the first fraction whose `requiresHeatK` is unmet (`:589-620`,
  *"the seam a refinery column is built on and a pot still never
  exercises"*). Sole composer: `trade-distilling/src/thing/Still.ts:52`.
- `platform/idea/FractionScheduleCatalogue.ts:57-95` warms by path infix
  `/idea/fractionation/` + `prototype instanceof FractionSchedule`.
  `PourController.ts:113-125` credits the running schedule's own
  discipline. Rows: `trade-distilling/…/idea/fractionation/{wash,grain-wash,wine,rectify}.yaml`.

### The acts, the engagement, the scars

- `packages/server/src/mud/lib/command/EngagedActController.ts:76-170` —
  the promoted base: `decline(context, prose, reason)`, `inform`,
  `engageAct(context, {durationMs, beginSelf, beginPeers?, cost, onComplete,
  onAbort?})` on the `hands` slot (`ManualBuildStep`). `ACT_TOPIC =
  'act.deed'`. `platform/idea/cmd/ground/WorkedActController.ts:48-130`
  (the `Workable` protocol: `planWork`/`completeWork`, `boundTool`) and
  `platform/idea/cmd/inventory/TapActController.ts:64-140` (adds a
  **vessel**) extend it. ⚠ `trade-mining/src/idea/cmd/mining/MiningActController.ts`
  is the un-promoted fourth copy — do not extend it.
- `lib/ground/Workable.ts:63-69` sanctions a new verb for *"a hole that
  persists and does something"*; `WorkPlan`/`WorkRefusal`/`WorkResult`
  (`:80-150`), `WorkResult.credit = {discipline, difficulty}`.
- Two scars, both to carry: **never `this.<method>` inside `onComplete`**
  (`WorkedActController.ts:92-108`; `DriveController.ts:110-125`) — a
  controller is destructed in a `finally` while the engagement is pending;
  **guard `commandGiver.isDestroyed()`** at completion
  (`DriveController.ts:160-171`).
- The banked-progress pattern: `lib/ground/Improvable.ts` — persistent
  `improvementWork: Record<job, number>` + `improvementStamp`
  (`:285-293`), `bankWork(job, amount, cost)` once per completed swing
  (`:314-320`), the requirement as a **host hook** `improvementBill()`
  (`:210-221`, *"the kernel asks the ground what it owes … `null` means
  this host has not said, and the acts refuse in words"*),
  `reconcileImprovement()` (`:391-401`), bands as **percepts**.
  Composers: `trade-farming/src/location/Field.ts`,
  `trade-quarrying/src/location/Turbary.ts`.
  `trade-quarrying/src/lib/Working.ts` accumulates **depth without a
  room**: `floorDepthM` persistent (`:278,285`), `LIFT_M = 0.5` (`:95`),
  `deepen()` (`:572`), `floorStop()` at the water table (`:400-406`).
- ⚠⚠ Engagements do not survive a restart and `restart` is unbuilt
  (`docs/subsystems/activity.md:592-596`, `:731-734`). The engagement is
  for the **swing**; nothing longer.
- Per-instance game-clock timers: `packages/content/tpa/src/lib/FastTravel.ts:254,969-999`
  (`WorldClockApi.every(interval, cb)` handles kept in `_clockHandles`,
  cancelled on disarm). `WorldClockApi.every(interval: Quantity<'s'> |
  string, cb, opts)` (`api/worldclock.ts:242`); `ScheduleApi.recurring(ms,
  fn)` (`api/schedule.ts:223`) for real time.

### The crew

- `packages/server/src/mud/lib/employment/Organization.ts` — the runtime
  transitions on `OrganizationMixin`, gated `OrganizationSurface =
  AnyOf(SelfOnly, FromTemplate('/platform/idea/api/employment'))`
  (`:71-74`): `callFor` (`:328`), `hire(actor, positionKey, nowRaw)`
  (`:543`), `endEmployment` (`:562`), `ensureRostered` (`:570`, idempotent),
  `beginShift(actor, nowRaw)` (`:590`), `endShift(actor)` (`:597`),
  `beginCover`/`endCover` (`:602`, `:627`). ⭐ The **public** org face,
  `@Final @Unshadowable`: `appoint(actor, positionKey)` (`:642`) and
  `dismiss(actor)` (`:656`). `positions`/`rosterSlots` are
  `{persistent, authorable}` (`:261-262`) with **no runtime setter**;
  `getProprietor()` (`:484`) is the appointing authority's entity path.
- `platform/idea/api/EmploymentLogic.ts` — `moveForShift` (`:841`;
  `assignment.station ?? operatingLocations[0]`), `tickBusiness` hourly
  (`:1469`, installed `:1542` via `WorldClockApi.every`),
  `settleShiftWageImpl` (`:1135`: `wageRate × hours since onShiftSince`,
  skips the proprietor, `basis() === 'time'`), `payHouseWageImpl`
  (`:1008`: arrears → `ContractApi.issueLoan` → `refuseWage` (`:1068`,
  arrear on the book + a line to a resident proprietor) →
  `BankingApi.payWage`). Facade statics (`api/employment.ts`):
  `businessAt`, `employeesOf`, `payHouseWage` (`:297`), `settleShiftWage(business,
  employeeKey, employment)` (`:329`), `ensureOperatorAt`,
  `operatingAccountOf`. ⚠ `hire`/`fire` exist on the LOGIC (`:1611`,
  `:1621`) and **not** on the facade; the doc's deferred line is
  `docs/subsystems/employment.md:866-868`.
- `platform/content/platform/cmd/employment/appoint.yaml` — target
  `scope: "online"`, `requires: class:Agent`; the help explains `online`
  (*"the player argument resolves against who is online, and `me` is how
  you name yourself"*). `apply.yaml`/`clock.yaml` take an organization by
  string and work for a player hand as shipped.
- The watch reconcile: `platform/idea/WatchWarden.ts:56-93` (a boot-listed
  Idea arming `ScheduleApi.recurring(30 s)`), `ContractLogic.ts:279-324`
  (`min(now − watchSeenSec, 900)`, `standingThePost` = resolvable + in the
  destination room + no engagements). ⚠ `claimantStuff` (`:335-342`)
  resolves **only connected Avatars** — an NPC never resolves. The
  doctrine transfers; the resolver does not.
- An NPC crew row: `rejection/…/agent/hewer.yaml` (`/platform/agent/Extra
  extends /stuff/agent/costume/student`, props, one `behaviors[]` brain);
  a Business row with roster slots: `…/idea/coop-business.yaml`;
  `station:` on a slot: `terminus/…/infirmary/idea/window.yaml:12-39`.
  `HewController.ts:311-324` stamps the lump to the business the hewer is
  on shift for (`EmploymentApi.businessAt`) — tutwork is the chattel rule
  reading the shift.

### The claim

- `trade-mining/src/idea/cmd/mining/StakeController.ts:63-82` — the
  **surface fork**, taken before any warren is resolved:
  `counter.surfaceWorkingFor(word)` → `stakeSurface(context, path, word)`
  (`:205-246`): `ParcelApi.ownerOf(path)` refuses a held one, then
  `ParcelApi.subdivide(path, parentExtentOf(path), {kind: 'player',
  templatePath: giver.getIdentityPath()}, 0, 1, 'industrial')`.
  `ClaimsRegister.ts:26-31` affords `stake` via `static
  commandContributions` (environment + peers); `surfaceWorkings:
  Array<{path, keywords}>` (`:54`); the Rejection row
  `…/thing/claims-counter.yaml` lists the quarry pit. **A bore site is
  one more entry — zero code.**
- `api/parcel.ts:76,162` (`ownerOf`, `subdivide`); `api/access.ts:123`
  `can(subject, action, resource)` resolves title via `ownerOf`.

### `drain`, and the vessel contract that transfers

- `trade-mining/…/cmd/mining/drain.yaml` + `DrainController.ts:34-51,121`
  — `workingOf(giver)` needs the actor's **container** to compose
  `WorkingMixin`; the gas is the room's atmosphere; `refusalFor` carries
  *"It will not stay in that — gas wants a sealed vessel, shut."*
  (`:41`). `Working.ts:792-801` `drain(vessel)` → `DrainOutcome`. ⛔ Not a
  wellhead act; the sentence and the four-reason shape are reused.

### Credit

- `lib/advancement/Advancement.ts:466-508` — `creditSignature(signature,
  opts)` and `creditDeed(subcheck, opts)` are `@Final @Unshadowable`,
  **no `@CallSecurity`**; `ActSignature.discipline` is `Subcheck[]`
  (`ActSignature.ts:87`); writes key on `getIdentityPath()` (`:74-76`);
  `buildAndSave` module-private. `CraftingLogic.recordCraftEvidence`
  (`:2129-2157`) credits the maker a deed and gives witnesses a chronicle
  *known-of* entry. `GroundWorkController.credit` (`:152-160`) is the
  controller-side shape. Discipline rows: `geology` (trade-mining),
  `physics` + `chemistry` (platform), `leatherwork` (tanning), `mining`
  (trade-mining). ⚠ `creditDeed` is a **method**, so the credited Stuff
  must be resident — every credit in this plan rides an act the credited
  person types or is standing at.

### Documents, the map, the pen

- `lib/document/DocumentKinds.ts:31,49` — `DocumentKindSpec {kind,
  naturalKey, contentDir, ext, onVanish}`; `map` (`:118`), `herd`
  (`:154`), `fishery` (`:172`) all `naturalKey: null, ext: 'yaml',
  onVanish: 'keep'`. Everything mechanical derives (`NON_TEMPLATE_DIRS`
  `lib/paths.ts:243`; `gen-schema.ts:146-149` keeps every declared kind
  through the reset; `ResetPolicy.ts` is **generated** — run `pnpm
  gen:schema`). Test: `lib/document/__tests__/PaperKinds.test.ts`. ⚠ Two
  scripts hand-copy the dir set: `check-untitled-paths.ts:41`,
  `check-template-census.ts:47` — a new `contentDir` must be added to the
  second.
- The map: `NavigationLogic.growMap` (`:360`, *"nothing is ever removed,
  and nothing is ever corrected"* `:339-340`); `DocumentApi.saveMap`
  (`:269-276`) derives the owner from the **viewer key** passed by
  NavigationLogic because `getActingAuthor()` is null in a forced frame.
  The pen: `DocumentKinds.ts:128-134` — *"You file; you do not hold the
  pen"*; herdbooks are titled `/trade/ranching/herds/…` owned by
  `/trade/ranching` (`HerdRegistry.ts:68-74`).

### Water, and what dumping would need

- `water/src/idea/WatercourseCatalogue.ts:656` `contaminationAt(ref, nowS)`
  sums `worldScan(nowS).discharges` over the duck-typed `Discharging`
  shape (`:239`) **only on `WATERWORK_CLASSES`** (`:100-103`: `Conduit`,
  `ControlStructure`). `water/src/thing/Conduit.ts:105-106,252-258` —
  `dischargeLoadPerSecond`/`dischargeKind` are **authored**;
  `getDischargeReach()` answers only for `direction: 'disposal'`. Exemplar
  row `terminus/…/wharfside/thing/city-outfall.yaml`. ⛔ **No shipped verb
  turns a poured liquid into an outfall load** (`SpillController` → the
  floor's puddle; `PourController` → `BulkableApi.transfer`; `Shore` is not
  Bulkable).

### The pack rung

- `docs/subsystems/content-packs.md:525-760` — a pack's `src/` has the
  kernel taxonomy + `lib/`; `StuffApi.resolveClassFile` by longest root;
  the import profile is `packages/server/package.json` `exports`
  (`:6-19`: `mud/lib/*`, `mud/api/*`, `mud/platform/{thing,idea,agent,location}/*`,
  `test-bootstrap`; `platform/idea/api/*` and `hooks/*` blocked); the rung
  check (`requires-kernel`: a class resolving into another pack's `src/`
  needs that pack in `package.json` dependencies — `check-mud-imports.ts:144-214`
  enforces the same line). Manifests: `trade-mining/pack.yaml` (root
  `/trade/mining`, title `{extent, holder: {organization: /compact/trade}}`),
  `ground/pack.yaml` (root `/system/ground`, group `ground`). The
  deployment manifest is the root `package.json` dependency list (`:5-60`);
  `pnpm-workspace.yaml` globs `packages/content/*`. ⚠ A pack-graph change
  needs `pnpm install` before any test is trustworthy.

### Lint roster — **derived**, read with `pnpm -C packages/server lint:family --list`

⚠ No count is stated here on purpose: the roster is read from
`package.json`, and naming a number is how the enumerated lists rotted.

Named where they bite: `closed-vocabularies` (`check-closed-vocabularies.ts:111`
ceiling 5, walks `src/mud/**` only; matches `export const NAME = [..strings..]`
+ `.includes(`/`of NAME` + a refusal within ±5 lines), `instanceable`
(invariants 1–3, 7, 8, 11–13), `imports` (pack tier), `mass`, `locations`,
`location-graph`, `untitled`, `drive-scripts`, `field-meta`,
`unconsumed-seams`, `arg-kinds`, `instrument-args`, `capabilities`,
`verb-collisions`, `census`/`world-scan`, `mixin-names`, `light-sources`,
`test-bootstrap`, `schema`.

---

## Plan-level decisions

**D1 · The reservoir is a FIELD ON THE COLUMN — `Deposit.fluids: FluidBody[]`
— and never the lode re-used.** The requirements place the body with *the
ground system*; the question was reuse-the-lode versus a sibling row kind.
Both are wrong. A lode re-used (a `dip: 0` slab) drags `gangue`, `halo`,
`meanGrade/spread`, the ore-softens-rock blend and the depletion boxes, and
**`surfaceReadingAt` returns `null` for a flat plane** — the slab has no
surface read, which is the one read drilling wants. A sibling row kind
needs a second citation field on `SpatialZone` (a kernel edit the zone's
own header warns about), a second resolve walk in every consumer, and a
second seed. A new field on the column has neither cost: one zone
citation, one seed, one address, one `singleton` resolve, and a reader of
the row sees exactly which fields are live because **every sub-field of
`fluids[]` has a reader and no reader of `fluids[]` touches a lode field.**
The narrowing test holds: a column with `lode: null` and one fluid body is
a legal row (barren of ore, charged with brine) with no guard anywhere.
`gas: {material, belowZ, strength}` is the shipped precedent of a fluid
fact on the column and stays as it is (the mine's hazard is not a well's
product).

```ts
export interface FluidBody {
  key: string;                       // 'salt-leg' — the body's durable name
  fluid: string;                     // material path of what comes up
  trap: {                            // ⭐ the READABLE factor — structure
    crest: readonly [number, number, number]; // the high point, metres
    strike: number;                  // azimuth of the fold axis, degrees
    alongExtent: number;             // half-extent along the axis, metres
    acrossExtent: number;            // half-extent across it, metres
    closureM: number;                // vertical closure under the crest
  };
  topZ: number;                      // top of the fluid leg (negative)
  baseZ: number;                     // its base; the contact below
  chargeChance?: number;             // the LEAN on the unreadable factor; default 0.5
  charge?: boolean;                  // the PIN
  capacityL?: number;                // the PIN; else closureM × extents × porosity
  porosity?: number;                 // default 0.2
  headAtm0?: number;                 // initial head at the wellhead; 0 = must be bailed
}
```

Three new reads, all pure, all seeded off the same `seedFor(address)`:
`structureReadingAt(x, y, errorM, seed): StructureReading[]` (per body
whose trap covers `(x, y)`: the TRUE crest depth and the OBSERVED depth =
truth + a seeded offset × `errorM`, plus distance to the crest and the
axis bearing — the `surfaceReadingAt` shape, in metres); `isCharged(body,
seed)` = `body.charge ?? Seeded.unit(seed, hash('charge:' + key)) <
chargeChance` (⭐ the dry hole, decided before anyone looked; **no
channel reads it**); `fluidAt(at: Point, seed): FluidSample | null` = the
charged body whose trap covers `(x, y)` and whose `[topZ, baseZ]` spans
`z`, else `water` at or below the water table, else `null`. Capacity:
`capacityOf(body)`; recharge: **zero** (the RGO spine's own case). Ferrow
gains four bodies (W-A2, W-B1, W-C1); a second field is rows.

**D2 · Withdrawal is split by WHOSE FACT IT IS: the hole's state on the
wellhead, the body's withdrawal in a register.** The wellhead is a minted,
persisted Thing you stand at (the stall-counter shape), so `depthM`,
`linedToM`, `swingBank`, `rigStamp`, `lastDrawS` live on it as persistent
fields (the Colony shape). But the thing that spans holdings is the BODY,
and *two straws in one glass* is the physics the requirements ship for the
polity to argue over — so **a `/system/ground` register holds each body's
withdrawal per straw**: `BodyRegister` (`RegistrarMixin(Idea)`, prefix
`/system/ground/bodies`, owner `/system/ground`, kind `body`), record
`{bodyRef: '<locality address>/<body key>', drawn: Record<wellheadIdentity,
litres>, since: S}` — the fishery's record with straws where it has
species. Capacity is **never stored**; remaining = `capacityOf(body) −
Σ drawn`. Written only on a draw (`debitBulk`), never on a read; a body
nobody has tapped has no document. The wellhead's own `drawnL` is the
truth for ITS straw and the register entry mirrors it — the chattel
`place` rule (*an index, not a source*). ⭐ Pressure is then a read, not a
field: `headAtm(now) = headAtm0 × (1 − Σdrawn / capacity)`, and two
wellheads on one body watch the same gauge fall.

**D3 · A wellhead reads the ground THROUGH ITS ROOM, and Strata's "a
well" is corrected.** The wellhead is a `Thing` standing in a surface
Location; its point in the ground is `[room x · cellSize, room y ·
cellSize, −depthM]`. The trio that does that for a *place rather than a
working* exists twice already (SurveyReading, SoilReading); the wellhead
is the third, so it is promoted into the ground pack as
`packages/content/ground/src/lib/GroundPoint.ts` — `GroundPointMixin<TBase
extends MixinConstructor<Stuff & Containable>>` with `groundPlace()`,
`metresHere(depthM)`, `getDeposit()`, `getGroundSeed()`, all reading the
**container's** zone and locality. Composed by `Wellhead` only in this
build; `SurveyReading`'s protected trio is left in place and named as the
sweep that follows (Deferred seams). `Strata.ts:8-9` is edited to read *"a
cellar and a cave are the ones after it; a well is a `GroundPoint`, not a
room"*. ⛔ No `Location` is minted anywhere in this plan; `lint:location-graph`
sees nothing new.

**D4 · The programme is BANKED, the swing is ENGAGED, and the bill is a
host hook.** On `Wellhead`: persistent `swingBank: number` (swings banked
toward the next metre), `depthM`, `linedToM`, `rigStamp` (game-seconds of
the last reconcile). The requirement is `cutBill(): Promise<CutCost | null>`
(`{swingsPerMetre, wantsLinerBeyondM, stopAtM}`), the `improvementBill`
shape — read off `Deposit.sampleAt` at the current depth: `swingsPerMetre
= SWINGS_REF × hardnessMPa / REFERENCE_MPA`; `wantsLinerBeyondM` = the
water table when the host rock below it is soft (hardness < LINING_MPA) —
*the hole wants lining before it goes deeper* is a threshold refusal, not
a roll; `null` means the ground has not said and `bore` refuses in words.
Two feeders bank swings: (a) a **hand's own swing** — `bore` by a present
person is one `engageAct` on `hands` (`SWING_MS`, scaled by hardness as
`paceForGround` does) whose module-function completion calls
`wellhead.bankSwing(by)`; (b) **the crew's presence** —
`reconcileRig(nowS)` credits `min(nowS − rigStamp, SAMPLE_CAP_S) ×
SWINGS_PER_HOUR` per hand that is *rostered to the outfit, on shift,
standing in the wellhead's room, holding no engagement* (the watch
doctrine, with the resolver being the room's own contents, so an NPC
resolves). Every public read reconciles first (`look`, `bail`, `fill`,
`measure head`), and `postRegister` arms `WorldClockApi.every('1h', …)`
on the instance (the `FastTravel._clockHandles` shape; cancelled in
`onDestruct`) so weeks pass with nobody reading. The engagement never
outlives a swing; a restart loses at most one swing.

**D5 · Two new channels, both the pack's: `structure` and `head`.** The
shipped `pressure` is Container-only and its token is taken, and a trade
adds a reading with no platform file changed (instrumentation's own law).
`structure` (`/trade/drilling/idea/reading/structure`, `StructureReading
extends Reading`; `discipline: geology`, `instrument: surveying` — the
miner's dial and compass already ship, zero new instrument; `eyeCeiling:
untrained`; `scope: [here]`) reads `Deposit.structureReadingAt` and
reports, per body under this ground, *a closed structure, crest about N
m that way, at about D m ± E m*. ⭐ **The bracket widens with depth and
narrows with band**: `halfWidthOf(truth, band)` is overridden to
`|truth| × DEPTH_FRACTION[band]` with `{untrained .5, novice .3, competent
.15, proficient .08, expert .04}` — the invited non-ratio override, and
the one law the slate asked for. The reading is remembered in the
DISCOVERY field book the way strike is (`rememberReading`), so `analyze
structure` averages repeat readings as `analyze ground` does. The eye
rung says what a trained eye can: *there is a spring here; that is charge,
not a place to bore* — the free signal is the room's prop, and the eye
rung names it. `head` (`/trade/drilling/idea/reading/head`, `HeadReading`;
`discipline: physics`, `instrument: gauging` (a new capability string a
`pressure-gauge` tool row affords), `instrumentNoun: a pressure gauge`,
`eyeCeiling: novice`, `scope: [subject]`, `subjectRequires: [class:Wellhead]`
checked in the channel's own words) reads `wellhead.headAtm(now)`; the
eye rung answers in words (*it flows hard · it has slackened · it is not
flowing*), the instrument in atm with the default ratio bracket. ⚠ The
requirements' drive says `measure pressure`; the token is `head` — see
Risks §3.

**D6 · Stage B lives within one atmosphere; `maxPressureAtm` is a deferred
seam.** A wellhead's `head` is the RESERVOIR's and is read by D5; what a
vessel receives is at atmospheric — the gasometer and the bladder are
constant-pressure vessels by construction, and `getGasPressureAtm` on
them stays amount/capacity. Nothing in this build compresses gas. The
vessel-side ceiling is the slate's *inherit this on purpose*; the first
cylinder that compresses is the seam's first consumer.

**D7 · A schedule declares its SEPARATION, and `fractions` mode yields
distinct materials that never share a pour.** Substrate grows two
authorable fields: `FractionSchedule.separation: 'cuts' | 'fractions'`
(default `'cuts'` — every shipped row byte-identical) and
`FractionSpec.material?: string`. `setFractions` validates the pair: in
`fractions` mode every spec names `material` and `productMaterial` must
be `''`; in `cuts` mode a spec naming `material` throws (*a pot still's
fractions recombine; name one product or declare a column*). In
`fractions` mode `getBulkMaterialPath('interior')` answers **the material
of the fraction the next litre is in**, and `getBulkAvailable` **clamps at
the next boundary** so a pour never straddles two substances — that is
*what refuses what*: the column will not hand you gasoline and kerosene in
one cask; you draw until the character changes and change casks. The
straddle blend in `getBulkPayloadForDraw` is unchanged for `cuts`. ⭐ The
per-fraction `requiresHeatK` seam is exercised for the first time (naphtha
350 → kerosene 450 → gas oil 550 → the residue stays). The TypeScript
`separation` type is a string union, not an exported array with a
membership test, so `lint:closed-vocabularies` (at 5 of 5) does not count
it. The column's host class is distilling's `Still` (`Still.ts:52`): the
fuel pack's `refinery.yaml` names `/trade/distilling/thing/Still`, adds
`@saxonberg/content-trade-distilling` to `trade-fuel/package.json`, and
the plan records *a second namer of `Still`* as the content-packs signal
to promote the class — a review question, not this build's.

**D8 · The bore log is the TRADE's, not the owner's.** A log is read by a
prospective buyer, so *you file; you do not hold the pen*: kind `bore`
(`naturalKey: null, contentDir: 'bores', ext: 'yaml', onVanish: 'keep'`),
path `/trade/drilling/bores/<locality address>/<claim leaf>`, owner
`/trade/drilling`, written only by `BoreRegistry` (`RegistrarMixin(Idea)`
at `/trade/drilling/idea/BoreRegistry`) through the gated
`DocumentApi.saveToRegister`, and **append-only** (`growMap`'s rule). The
wellhead calls `registry.appendLine(wellhead, line)` — a participant
contract `FromClass(Wellhead)` on the registry method. A line is `{atS,
depthM, host, fluid | null, by}`: what each metre cut and what came up.
`look at wellhead` renders the last lines; no `log` verb. The owner's own
structural readings stay in their private field book (shipped), which is
the thing they may keep secret.

**D9 · Credit follows the act that was typed.** Owner: `geology` deed at
the **siting** (`bore` on a staked claim with no wellhead — standard;
`hard` when the structure read puts the target below −100 m) and at the
**answer** (the owner's own `bail` that returns the first fluid-or-dry log
line — `hard`, `outcome: 'success'` either way: judgment was exercised and
answered). Crew: `mining` deed per banked metre to each hand that was
present (the rig credits on reconcile; the hand is resident by
construction, being in the room) and per `line` act. `measure head` /
`structure` credit `physics` / `geology` through the Reading ladder as
every channel does. ⭐ No credit reaches anyone offline: both owner credits
are typed by the owner, both crew credits are earned standing there. No
new transport.

**D10 · `trade-drilling` is a capability pack with its own root.**
`packages/content/trade-drilling/` — `pack.yaml` (`id: trade-drilling`,
`root: /trade/drilling`, `requires.title: [{extent: /trade/drilling,
holder: {organization: /compact/trade}}]`, the mining pack's own shape);
`package.json` `@saxonberg/content-trade-drilling` depending on `server`,
`types`, `content-platform`, `content-base-library`, `content-generic-objects`,
`content-ground` (Deposit, GroundPoint, BodyRegister — typed, since the
drilling trade cannot exist without the column); **no** dependency on
`trade-mining` (the venue row names mining's register; drilling's code
never imports it) or `trade-quarrying` (the brine meets the pan by TAG).
Add the line to the root `package.json`, run **`pnpm install` before any
test**, then `tsconfig`/`vitest.config` copied from `trade-mining`.
`src/` holds `thing/{Derrick,Wellhead}.ts`, `idea/{DrillingOutfit,BoreRegistry}.ts`,
`idea/reading/{StructureReading,HeadReading}.ts`,
`idea/cmd/drilling/{Bore,Bail,Line,Hire,Dismiss}Controller.ts`,
`__tests__/`. No `lib/`, no brain, no Api.

**D11 · Verbs: `bore` (alias `drill`) · `bail` · `line` · `hire` ·
`dismiss`.** `lint:verb-collisions` grep over every `verbs:` line: none of
the five is claimed (`raise` is mining's, `fire` is the device verb, `cap`
and `plug` are unclaimed but out of scope, `casing` is cooking's material
and thing). The liner is `/trade/drilling/thing/liner` (keywords `liner`,
`tube`, `pipe` — never `casing`), set by `line`. The category is
`drilling` (`content/trade/drilling/cmd/drilling/`, controllers at
`src/idea/cmd/drilling/`).

**D12 · The hiring driver is the derrick's `hire`, and the outfit is
minted at the siting like a stall's house.** `appoint` stays untouched
(`online` is its documented contract). The derrick affords `hire <person>`
(target `scope: [reachable]`, `requires: class:Agent`, `greedy: true`) and
`dismiss <person>`; both call the **public** org face — `outfit.appoint(npc,
'roustabout')` then `outfit.startCrew(npc)` (a `DrillingOutfit` method
calling its own `beginShift` under `SelfOnly`; the hand is already in the
room, so no move), and `outfit.payOff(npc)` → `EmploymentApi.settleShiftWage`
→ `this.endShift` → `this.dismiss(npc)`. The outfit is a `DrillingOutfit
extends Business` (`/trade/drilling/idea/DrillingOutfit`; the
`CarrierBusiness` precedent) cloned at the siting from
`/trade/drilling/idea/business/outfit` (one authored seat `roustabout`,
`wageRate: 4`, `headcount` open; the stall seed's `""` overlays) with
`asIdentityPath: <seed>/<claim leaf>` and `dataOverlay {appointingAuthority:
{kind: 'entity', path: giver identity}, banksAt: <the giver's bank>,
operatingLocations: [<room>]}`. ⭐ `positions` are authored — on the SEED
row — which is what the no-runtime-setter constraint actually permits.
Wages: `DrillingOutfit.payDay(nowRaw)` settles each on-shift hand
(`EmploymentApi.settleShiftWage`, then `endShift`/`beginShift` to reset
`onShiftSince` — *paid off at the end of the day and signed on again*),
called from the rig's hourly reconcile when a game-day has passed; an
unpayable wage follows the shipped rule (arrear on the book, the
proprietor told, nothing silently free) and *when to stop paying* is
`dismiss`. A **player** hand uses `apply for roustabout at <outfit>` +
`clock on` exactly as shipped. The labour pool is content: two `Extra`
rows at Rejection standing in the Dry with no brain.

**D13 · Staging — three stages, thirteen waves, every wave a commit.** Stage A
(brine) is seven waves and the one that proves the shape; B (gas) is two;
C (oil) is four. The drive and docs close each stage so the MR could open
after any stage. Detail under § Waves.

**D14 · The hearth burns gas from a sealed vessel PLACED ON IT — `Oven`
overrides `fuelSlot()`.** `Oven.ts` is empty today and already
`PlacingMixin`; the override returns the interior slot of the first item
placed `on` it that is Bulkable, `isGasRetained()`, and holds a material
with `heatOfCombustion > 0` and `requiredClosureFor === 'sealed'`; else
`null`, and the bed is the fuel as before. Every fuel read follows the
hook (`fuelRemaining`, `consumeFuel` debits the bladder's litres). While
a gas vessel is coupled `stoke` refuses `'no-bed'` — *the fire is on the
pipe; take the bladder off to burn wood* — which is what *the cordwood
stays unbought* means in code. ⭐ **Why `Oven` and not `Firebox`:** a
`Retort` is a Firebox that is also a Placing host, and what is placed on
a retort is its PRODUCT path (the condenser, the gasometer) — on `Firebox`
the hook would need a guard to tell a fuel vessel from a product vessel;
on `Oven` it needs none. The brine-hearth row gains `placements: [on]`.
No kernel class gains a field.

**D15 · The disposal ladder: store and flare ship; the river is a WATER
change this build makes, flagged.** Store: a volatile material is a fire
risk by its own fields (`autoignitionTemperature`, `heatOfCombustion`) —
shipped. Flare: `/trade/fuel/thing/flare.yaml` is a `/platform/thing/Lamp`
row with a 400 L `closure: liquidTight` tank, `maxBurnPowerW` high,
`fixedInPlace` — `fill flare from cask; light flare` burns the fraction
visibly for nothing, zero code. Dump: ⛔ no shipped verb discharges a
liquid into a reach, and a `pour`-into-water → discharge event is
cross-cutting and NOT solved here. What this build does: `Conduit`
(water pack) gains an optional **sump** — `interiorBulk` on the row — and
`dischargeLoad()` derives `{load, kind}` from what is in the sump when one
is authored (`kind` from the material's tags: `flammable` → a new
`ContaminantKind` `'hydrocarbon'` with its own survival-per-hop), so
`pour gasoline into outfall` at the refinery is a real discharge the
fishery's `contaminationAt` already carries downstream, with the no-tell
the slate wants. The refinery row ships one `direction: disposal` outfall.
⚠ This is the plan's one reach into a system pack beyond ground; see
Risks §5 for the user's call.

**D16 · The drive's wording is amended to the shipped vocabulary, and no
geometry is reopened.** Risks §1–§4 are four places the drive names
something the code does not do, and all four are wording: step 1 is
`look` (`survey` is the holding mirror), step 3's second instrument read
is `measure structure` (`measure dip` is `null` from the surface by the
mining build's own geometry and this build does not reopen it), step 15
is `fill <sealed vessel> from wellhead` (`drain` is mining's room-bound
working verb; only its refusal sentence transfers), step 21 is `measure
head`, and step 24 is the lantern plus the civic fuel store, which takes
the kerosene fraction by the `lamp-oil` tag with nothing changed.
Amended in the requirements doc at build time, each with a ⚠ note saying
what it was and why. **What decided it:** lens 1 — the ground's geometry
has a derivable right answer that the mining build already derived, and
changing it to make a sentence true would make the world less derivable,
not more.

**D17 · The river leg is DEFERRED; W-C3 ships store and flare only.**
Risks §5 was left as the user's call between a `Conduit` sump plus a new
`'hydrocarbon'` contaminant kind, and deferring. Deferred — the standing
rule is that **a trade build never solves a cross-cutting capability**,
and a new member of the water system's contaminant vocabulary plus a new
derived-load path on `Conduit` is that by shape, whatever its size. The
two disposal routes that need **no code at all** ship (a volatile in a
cask is a fire risk by its own authored fields; `fill flare from cask;
light flare` burns it visibly for nothing), the `'hydrocarbon'` kind and
the sump go to the watershed slate beside *a dumped liquid as a discharge
from any shore*, and **AC 9's dump leg is recorded unmet** in the
requirements rather than quietly dropped. W-C3 therefore touches no pack
outside `trade-fuel`, which leaves this build's reach exactly ground +
kernel + its own pack. **What decided it:** the standing constraint, not
a lens.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `fluids: FluidBody[]` + `structureReadingAt` / `isCharged` / `fluidAt` / `capacityOf` | `Deposit` (`/system/ground/idea/Deposit`) | every column MAY hold fluid bodies; a column with none answers `null`, which every consumer already handles for `lode`. No reader of `fluids` reads a lode field. |
| `BodyRegister` + kind `body` | `/system/ground/idea/BodyRegister` (`RegistrarMixin(Idea)`, boot-listed) | withdrawal is a fact about the BODY, which spans holdings; the ground system is true with nobody drilling. Not on the wellhead (two straws would each think the glass full). |
| `GroundPointMixin` | `packages/content/ground/src/lib/GroundPoint.ts`; composed by `Wellhead` | a fixed Thing standing in a located room can ask the ground beneath that room. Claims nothing about rooms (`Strata` stays theirs). ⛔ Not on `Thing`/`Good` (every object would claim a column). |
| `Wellhead` (`depthM`, `linedToM`, `swingBank`, `rigStamp`, `drawnL`, `lastDrawS`, `outfitPath`, `bodyKey`) | `/trade/drilling/thing/Wellhead` = `PersistableMixin(BulkableMixin(GroundPointMixin(Good)))`, `fixedInPlace`; minted per claim, keyed `(seed, claim path)` | the hole's own state on the hole; a Bulkable whose four seams are policy (the Fractionating shape) — `getBulkMaterialPath` = the fluid at depth, `getBulkAvailable` = what is standing (flow × elapsed capped, or the bailer's lift), `debitBulk` = the straw's draw + the register write, `getBulkPayloadForDraw` default. `fill <vessel> from <wellhead>` and the gas-escapes physics are then shipped behaviour. |
| `Derrick` | `/trade/drilling/thing/Derrick extends Tool` (`capabilities: [derrick]`, `fixedInPlace`), affords `bore/drill`, `bail`, `line`, `hire`, `dismiss` from `static commandContributions.peers` | the instrument affords the verb (the `ClaimsRegister`/`TimberSet` shape); a derrick with no wellhead beside it is where `bore` SITES one. Nothing on `Tool` changes. |
| `cutBill()` hook | `Wellhead` | the hole asks the ground what the next metre costs; `null` → `bore` refuses in words. |
| `DrillingOutfit` (`startCrew`, `payOff`, `payDay`, `crewOnShift`) | `/trade/drilling/idea/DrillingOutfit extends Business`; seed row `/trade/drilling/idea/business/outfit`; minted per claim | an outfit is a Business whose seats are authored on its seed; its proprietor is the appointing authority. Claims nothing about `Business` itself (the `CarrierBusiness` precedent). |
| `BoreRegistry` + kind `bore` | `/trade/drilling/idea/BoreRegistry` (`RegistrarMixin(Idea)`, boot-listed); `appendLine` gated `FromClass(Wellhead)` | the log is filed under the trade and nobody holds the pen. |
| `StructureReading` / `HeadReading` rows + classes | `/trade/drilling/idea/reading/{structure,head}` | two channels, warmed by the catalogue by infix; the platform names neither. |
| `separation` + `FractionSpec.material` | `lib/fractionation/FractionSchedule.ts` (kernel) | every schedule declares its kind, default `cuts`; every shipped row is byte-identical. The `fractions` branches of the three seams live in `Fractionating.ts` beside the `cuts` ones. |
| `Oven.fuelSlot()` override | `platform/thing/Oven.ts` (kernel) | every Oven may be fed by a sealed gas vessel placed on it — true of an oven, and needs no guard. ⛔ Not on `Firebox` (the Retort's placed items are products). ⛔ Not a new `GasOven` class (one row toggles it by `placements: [on]`). |
| ~~`Conduit` sump + `'hydrocarbon'` kind~~ | ⛔ **withdrawn by D17** — deferred to the watershed slate; this build touches no water-pack file. |
| crude + four fraction materials; `refinery.yaml`; `flare.yaml`; `crude.yaml` schedule; `oil-cask` mass | **trade-fuel** (`/stuff/idea/material/bulk/*` shipped by fuel, rows under `/trade/fuel/`) | fuel owns oil and its products (the requirements' placement). Kerosene **is** the shipped `lamp-oil` material — the fraction names it, and the lamp, the store and the civic bill need nothing. |
| `paraffin-wax` material (`tags: [… candle-stock]`) | trade-fuel ships it to the commons | the candle's third wax is a tag; chandlery is untouched. |
| salt spring, gas flat, seep hollow, dry rise rooms + props; four `surfaceWorkings` entries; Ferrow `fluids:`; two roustabout rows | **rejection** (no `src/`) | a second well town is rows and a place. |
| `brine-hearth.yaml` `placements: [on]` | trade-quarrying row | one key; the hearth keeps cordwood. |

**The narrowing test, applied:** the one guard this plan nearly wrote was
`Firebox.fuelSlot()` telling fuel from product by class — a guard that
re-narrows the host set, so the hook went one rung down to `Oven`. The
other temptation was `Deposit` branching on *is this body a slab* — a
body is its own field and the branch never exists.

---

## Convention conformance

- **`props:` / `cast:`** — the four Rejection rooms seat their props
  (`salt-spring`, `seep`) with `props:`; the two roustabouts stand in the
  Dry via `cast:`. No `populates:`.
- **Locations, not rooms** — the four sites are
  `/platform/location/SingletonCartesianLocation` rows with an outdoor
  biome and coordinates on the pithead's 10 m grid (the `hillside.yaml`
  shape). ⛔ No `AuthoredWorking`, no `FurnishableRoom`, no minted room.
- **The five axes / `<root>/<branch>/`** — pack classes at
  `/trade/drilling/{thing,idea}/…`, controllers at
  `/trade/drilling/idea/cmd/drilling/<Name>Controller`, views at
  `/trade/drilling/cmd/drilling/<verb>`, readings at
  `/trade/drilling/idea/reading/<channel>`, the seed business at
  `/trade/drilling/idea/business/outfit`, recipes under
  `content/recipes/`; ground substrate at `/system/ground/{idea,lib}/`;
  materials in the commons `/stuff/idea/material/bulk/`; venue rows under
  `/world/terminus/rejection/`.
- **Module scope declares** — the per-instance clock is armed in
  `postRegister`; registries warm in `onCreate`; nothing executes at
  module scope.
- **Import boundary** — pack code imports the kernel by specifier only
  (`@saxonberg/server/mud/lib/stuff/Good`, `…/mud/api/bulk`,
  `…/mud/platform/idea/Business`, `…/mud/lib/instrument/Reading`,
  `…/mud/lib/document/Register`); `content-ground` by
  `@saxonberg/content-ground/src/idea/Deposit` and
  `…/src/lib/GroundPoint` with the dependency line in `package.json`;
  absolute `FromModule`/`FromClass` gate strings.
- **No new module category, no free helper, no `eslint-disable`** —
  `GroundPoint.ts` is a mixin factory in a pack `lib/` (invariant 8);
  `FluidBody`/`StructureReading` are types exported from `Deposit.ts`;
  every helper is a private method or a module-private function in the
  file that owns it.
- **Verbs on objects** — `wellhead.bankSwing / bail / line / headAtm /
  cutBill`, `outfit.startCrew / payOff / payDay`, `registry.appendLine`;
  controllers orchestrate. No `XApi.verb(host, …)`.
- **Inter-Stuff contract** — controllers and the reconcile read
  `getDepthM()`, `crewOnShift()`, never a field; the Hydrator is the only
  field writer.
- **A person keys on `getIdentityPath()`** — the register's straw key,
  the outfit's appointing authority, the `drawn` map, the log's `by`.
- **`_mixinName` widens to `string`** — `static _mixinName: string =
  'GroundPointMixin'` + `GROUND_POINT_MIXIN` const + `_mixinRefusal`
  (*"{} does not stand on ground"*).
- **`fieldMeta`** — every new persistent field declared
  (`lint:field-meta`); every new authorable field has a reader
  (`lint:unconsumed-seams`: `fluids.*`, `separation`,
  `FractionSpec.material`, the sump).
- **Document kinds** — two entries in `DOCUMENT_KINDS`, `pnpm gen:schema`,
  the `PaperKinds.test.ts` rows, and `check-template-census.ts:47`'s
  hand-copied dir set gains `bodies` and `bores`.
- **Gates this build must newly satisfy:** `lint:untitled` (the
  `/trade/drilling` claim), `lint:instanceable` (branch dirs, pack `lib/`,
  `class:` resolution), `lint:imports` (pack tier: the `content-ground`
  and `trade-distilling` dependency lines), `lint:mass` (every new thing
  row states `mass`; **fix `oil-cask.yaml`/`lamp-oil-cask.yaml` while
  there**), `lint:arg-kinds` (`requires: class:Agent`, `requires: any`,
  `subjectRequires`), `lint:instrument-args` (bailer default
  `reachable:[capability.bailing]`, gauge `reachable:[capability.gauging]`,
  vessel `me:i:[mixin.BulkableMixin]`), `lint:capabilities` (`derrick`,
  `bailing`, `gauging` consumed), `lint:verb-collisions`,
  `lint:census`/`lint:world-scan` (every new row reachable from Rejection
  or a recipe), `lint:mixin-names` (one new pack mixin, unique),
  `lint:light-sources` (the flare is a Lamp — author its emitted fields),
  `lint:closed-vocabularies` (ceiling 5 — no new exported string-array
  vocabulary with a membership test in `src/mud`), `lint:drive-scripts`
  (wire file only), `lint:test-bootstrap`, `lint:schema` (no collection
  touched).

---

## Waves

Every wave lands at one commit; `pnpm test:near` + every touched pack's
vitest + `pnpm -C packages/server lint:family` before each. `pnpm test`
runs **once** before the MR opens and once at `/finalize`.

### Stage A — brine

#### W-A0 · The pack stands up — `build(drilling W-A0): trade-drilling exists and ships nothing`
- `packages/content/trade-drilling/{pack.yaml, package.json, tsconfig.json, vitest.config.ts, README.md}`
  (D10); root `package.json` line; **`pnpm install`**.
- An empty `content/trade/drilling/` tree + one test that the pack
  reconciles (`rung: 'data'` until `src/` lands).
- Acceptance: boot with `SAXONBERG_PACKS` including `trade-drilling`
  prints the pack; `lint:untitled` green on the new claim.

#### W-A0 ✅ DONE — `d320169d1`
#### W-A1 ✅ DONE — `d320169d1`

> **What landed.** The pack stands up with its own root and ships nothing
> but a manifest test. `Deposit.fluids` + the three reads +
> `BodyRegister` + the `body` document kind + `GroundQueryMixin` +
> `GroundPointMixin`. ground 108 ✓ · trade-mining 154 ✓ unchanged ·
> trade-quarrying 70 ✓ unchanged · kernel document suite ✓ · **all 69
> lint gates ✓**.
>
> **Three decisions this wave made that this plan did not:**
>
> - ⭐⭐ **D1a — the structural bracket is a FRACTION of the READING, not
>   an absolute in metres.** Caught writing the channel: a half-width
>   scaled off the *truth* **leaks the truth exactly** — quote *± 55 m*
>   at a half fraction and the reader knows the crest is at 110 m to the
>   metre, which makes an untrained eye the sharpest instrument in the
>   game. The reading is solved as `R = T / (1 − u·f)` and the quoted
>   half-width is `f·R`, which contains the truth for every `u` by
>   construction and is computable from what the player was told and
>   nothing else. A real instrument quotes accuracy as a percentage of
>   reading for this reason. `structureReadingAt` therefore takes a
>   FRACTION, not metres.
> - **D1b — no `boot:` entry for either register.** This plan called for
>   one; the shipped precedent (`FisheryRegistry`, `HerdRegistry`) is
>   lazy `StuffApi.singleton` resolution, and *`Api.boot()` is an
>   operator act*.
> - **D1c — the two hand-copied non-template dir sets need no edit.**
>   This plan said `check-template-census.ts:47` would; neither
>   `fisheries` nor `herds` is in them either, because no pack ships
>   those dirs as content, and `lib/paths.ts` derives the real set from
>   `DOCUMENT_KINDS`.
>
> **And one piece of substrate this plan put off.** `StructureReading`
> needed the **place-based** trio (the actor's room), not
> `GroundPointMixin`'s container-based one — so it would have been the
> fourth private copy of `depositAt`/`metresAt`/`seedAt`. Promoted to
> `ground/src/lib/GroundQuery.ts` as `GroundQueryMixin` now;
> `GroundPointMixin` composes it and supplies the place, so the position
> logic exists once in this build. ⚠ `trade-mining`'s `SurveyReading`
> and `trade-farming`'s `SoilReading` still hold their copies — that is
> the Deferred seam, unchanged, and now it has a home to move to.

#### W-A1 · The column holds a fluid body — `build(drilling W-A1): a Deposit holds fluid bodies with a readable trap and a seeded charge`
- `Deposit.ts`: `FluidBody`, `fluids` field + `fieldMeta` + `get/setFluids`,
  `structureReadingAt`, `isCharged`, `fluidAt`, `capacityOf` (D1). A
  body's trap is tested like the lode's plane: in/out by three dot
  products against `crest`/`strike`/extents; closure is vertical.
- `BodyRegister.ts` (D2) + row `content/system/ground/idea/BodyRegistry.yaml`
  + `boot:` entry in `ground/pack.yaml` (`role: sync-read`); kind `body`
  in `DocumentKinds.ts` + `gen:schema` + the two test/script dir sets.
- `GroundPoint.ts` (D3); `Strata.ts:8-9` corrected.
- Tests (ground pack): same seed → same charge in two processes; a pinned
  `charge: false` under a structure the read reports; `fluidAt` answers
  water at the table and `null` above it; `structureReadingAt`'s truth is
  identical across bands and its offset scales with `errorM`; a body
  nobody drew has no document; `Σ drawn` over two straws.
- Acceptance: `trade-mining`'s and `trade-quarrying`'s suites unchanged.

#### W-A2 · The survey — `build(drilling W-A2): measure structure reads a trap at depth, wider the deeper`
- `StructureReading.ts` + `structure.yaml` (D5), the `halfWidthOf`
  override, the field-book write, the eye rung naming the spring.
- Rejection: `location/salt-spring.yaml` (an exit from `hillside`), prop
  `thing/salt-spring.yaml` (a `Thing` with `details`), Ferrow `fluids:`
  gains `salt-leg` (`fluid: …/bulk/salt-water`, crest under the spring,
  `topZ −110`, `baseZ −140`, `charge: true` — the first bore must not be a
  bet, and the pin is the author's right; `headAtm0: 0`), the
  `claims-counter.yaml` `surfaceWorkings` entry.
- Tests: the row warms; `measure structure with dial` reports one body
  with `± m` growing with depth; `analyze structure` averages two readings.
- Acceptance: drive steps 1–4 pass (`stake spring` through the shipped
  surface fork, unchanged).

#### W-A3 · The rig — `build(drilling W-A3): a derrick sites a wellhead, bore cuts a metre at a time, bail lifts what is standing, line holds the hole`
- Rows + recipes: `derrick` (`/trade/drilling/thing/Derrick`, wood × 6,
  `cutting`, `fixedInPlace`, mass 1500), `bailer`
  (`/platform/thing/Tool`, `capabilities: [bailing]`, leather + wood),
  `liner` (`/platform/thing/Good`, wood × 2), `wellhead` seed
  (`/trade/drilling/thing/Wellhead`, never stood up as itself).
- `Wellhead.ts` (D2, D4): fields, `cutBill`, `bankSwing`, `reconcileRig`
  (hand-swing path only this wave), the four bulk seams (`fluidAt` at
  `depthM`; `getBulkAvailable` = the bailer's lift when bailed), the clock
  in `postRegister`, the `look` detail with the last log lines.
- `BoreRegistry.ts` + row + boot entry; kind `bore` (D8).
- `BoreController` (siting + swing; `extends EngagedActController`):
  with no wellhead in the room and the giver holding title
  (`AccessApi.can(giver, 'bore', room)`) it **sites** — clones the wellhead
  (`asIdentityPath`, `restoreOrSeed(claim path)`, move, `capture`) and the
  outfit (W-A4 fills it; this wave mints it so the key exists), credits
  `geology` (D9); with a wellhead it plans one swing off `cutBill()` and
  engages; completion is a module function calling `wellhead.bankSwing`.
  `BailController` (`extends EngagedActController`, vessel arg): lifts
  `BAILER_L` through `BulkableApi.transfer(wellhead → vessel)`; with no
  fluid at depth it brings up cuttings (the host word) and **appends the
  log line**; refuses an under-closed vessel in `drain`'s sentence before
  the act. `LineController`: consumes a liner, `linedToM = depthM`.
- Views `bore.yaml` (`verbs: [bore, drill]`), `bail.yaml`, `line.yaml`;
  controller rows.
- Tests: siting refuses untitled ground; the swing banks and the metre
  drops at `swingsPerMetre`; an unlined hole below the water table yields
  water, a lined one yields the leg; a completion after the giver logs
  out is a no-op; the log appends and never rewrites.
- Acceptance: drive steps 5, 7 (by hand), 8, 9 pass for a single player.

#### W-A4 · The crew — `build(drilling W-A4): hire a crew at the derrick; presence is depth and depth is wages`
- `DrillingOutfit.ts` + seed row (D12); `HireController`/`DismissController`
  + views; the rig's presence feeder and `payDay` in `reconcileRig` (D4);
  crew credit `mining` per metre (D9).
- Rejection: `agent/roustabout-{a,b}.yaml` (`Extra extends costume/student`,
  no brain) cast in `location/the-dry.yaml`.
- Tests: a rostered hand standing in the room with no engagement banks
  swings across a clock jump; a hand with an engagement banks nothing; a
  player hand via `apply` + `clock on`; a game-day settles a wage into the
  hand's account from the proprietor's bank, and an empty bank writes an
  arrear and tells the proprietor; `dismiss` settles and ends.
- Acceptance: drive steps 6–7 pass with the crew working while the owner
  is logged out (the clock seam, taps-plan D22).

#### W-A5 · Brine to salt — `build(drilling W-A5): bail brine, fill the pan, boil to salt; the owner's answer is credited`
- The owner's answer credit on the first fluid/dry log line (D9).
- `fill pan from wellhead` is shipped (`FillController` ↔ the seams);
  the pan in the lit hearth matures by tag `brine` (shipped). Rejection's
  provisioning store gains a `salt` stock line and a `salt-pan` + a
  `brine-hearth` row at the pithead yard (`props:`) so the chain is local.
- Tests: `getBulkMaterialPath` on a wellhead at −120 m is `salt-water`;
  the pan reconciles brine → salt at `productFraction`.
- Acceptance: drive steps 10–13.

#### W-A2 ✅ · W-A3 ✅ · W-A4 ✅ · W-A5 ✅ — landed together

> **What landed.** The `structure` channel + row; the two Rejection sites
> and the spring prop; the Ferrow salt leg; two `surfaceWorkings`
> entries; `Wellhead`, `Derrick`, `Bailer`, `BoreRegistry` + the `bore`
> kind, `DrillingOutfit` + its seed; five controllers, five views, five
> controller rows; the bailer/liner recipes; the drilling kit on the
> store's slate; two roustabouts in the Dry; the saltern at the flat.
> trade-drilling 55 ✓ · ground 108 ✓ · trade-mining 154 ✓ unchanged ·
> trade-quarrying 70 ✓ · trade-forestry 122 ✓.
>
> ### ⭐⭐⭐ W-A1's premise was WRONG, and fixing it is the best thing in
> the build
>
> The fluid leg was authored as a **slab**: `topZ`/`baseZ` on the body,
> uniform wherever the trap covered you. Writing the channel's prose
> made it obvious that this makes **the structural survey decorative** —
> if the leg is the same everywhere, the crest's bearing and distance are
> noise, a narrower bracket buys nothing, and acceptance criterion 2 is
> hollow.
>
> So the leg is **derived from the arch**: `legAt(body, x, y)` runs from
> the structure surface down to the spill depth, which is the full
> `closureM` directly over the crest and **nothing at the rim**.
> `topZ`/`baseZ` are gone (two author fields that could contradict the
> closure), `capacityOf` is the exact `π·a·b·closure / 3` of that shape,
> and the reading gained `thicknessHereM`. The consequence is the content:
> **the spring sits on the rim and the flat sits over the crest.** The
> place the ground tells you about is not the place to dig — and
> `measure structure` says so, from the spring, before a penny is spent.
>
> ### Decisions this wave made that the plan did not
>
> - ⭐⭐ **The derrick is raised by the SITING ACT; `make derrick` is
>   gone, and `bore` is afforded by the BAILER.** Risks §6 called this
>   right and then some: `CraftingLogic` lands a tangible output at the
>   maker, so a `fixedInPlace` 1 500 kg frame arrives in a pocket — and
>   six lengths of mine timber is **240 kg**, which no body in this game
>   can carry to a hillside. Raising it on site is what happens in the
>   fiction and what the trade's own thesis says should be cheap. ⭐ That
>   left a circularity — a derrick cannot be what affords raising a
>   derrick — closed by the kernel's own blessed split: *`plot` is
>   afforded by the SPADE, not the field.* So `Bailer` is a class with
>   `commandContributions.inventory`, and the derrick keeps the `peers`
>   rung.
> - ⭐⭐ **The rig and the hole are BOUND BY THE VIEW, not hunted for.**
>   `lint:instrument-args` refused the `getContents().find(c instanceof
>   Derrick)` scan with the better answer attached — *the query is the
>   MIXIN, never the class* — and `lint:capabilities` separately refused
>   `derrick` as offered-and-unwanted. One fix answered both: `rig`
>   (`reachable:[capability.derrick]`) and `hole`
>   (`reachable:[mixin.GroundPointMixin]`) on all five views, and the
>   ceiling stayed at 1 rather than rising.
> - ⭐⭐ **The structural bracket may not be quoted off the truth** (D1a,
>   recorded at W-A1 and worth repeating here because this is where it
>   would have shipped): `errorM` is `f × reading`, solved as
>   `R = T / (1 − u·f)`.
> - **No `@CallSecurity` on `BoreRegistry.appendLine`.** The plan called
>   for a `FromClass(Wellhead)` participant contract. Declined:
>   `DocumentApi.saveToRegister` is already gated `FromMixin(Registrar,
>   caller === args[0])`, the branch is titled to the trade, and this is
>   the only `Registrar` with that prefix — so the guarantee is already
>   made. `HerdRegistry.file` is ungated for the same reasons and is the
>   shipped precedent; being the **first capability pack in the repo** to
>   use the decorator, to re-state a guarantee the document surface
>   already makes, is drift with no gain.
> - **The derrick recipe's `fibre` slot was deleted before it shipped.**
>   Oak's own tags carry `fibre`, so the slot would have been satisfied
>   by more timber and refused nothing. ⚠ *A slot that cannot refuse is a
>   slot that should not exist.*
> - **`lint:census` clause (d) caught `fluids` on its first run** and the
>   fix is a reader, not an ignore entry: `refsOf` reads
>   `fluids[].fluid`. The gate's own reasoning is sharper here than
>   anywhere it has fired before — the citation resolves at the
>   completion of a **bail**, game-weeks of paid labour after the siting,
>   so a misspelt one is a hole that reaches the promised depth and
>   brings up nothing, **indistinguishable from the dry hole the trade
>   ships on purpose.**
> - Five drive steps amended (1, 2, 5, 10, and 15/21/24 by D16) with a ⚠
>   note each saying what they were.

#### W-A6 · Stage A drive — `drive(drilling A): <what driving found>`
- `packages/wire/tests/drilling.dirty.wire.test.ts` steps 1–13, run with
  `WIRE_BOOT=1 WIRE_PORT=2013 WIRE_FRAME_TIMEOUT=60000`; every checkpoint
  asserts the verb was **understood and a state changed** (never
  `refusedFor` alone).

> **W-A6 — the drive.** Written as
> `packages/wire/tests/drilling.dirty.wire.test.ts`, run with
> `WIRE_BOOT=1 WIRE_PORT=2013`. See § Drive record for what it found;
> the short version is that it found **seven real defects in eight
> runs**, four of them boot-fatal, and two of them pre-existing in other
> packs.

### Stage B — gas

#### W-B1 · The gas well and the gauge — `build(drilling W-B1): a deeper bore reaches gas; a gauge reads the head and the head falls`
- Rejection: `location/gas-flat.yaml` + the `surfaceWorkings` entry;
  Ferrow `fluids:` gains `gas-cap` (`fluid: …/gas/firedamp` — the
  measures' own gas, which the column already says is there; `topZ −160`,
  `baseZ −175`, `charge: true`, `headAtm0: 4`).
- `HeadReading.ts` + `head.yaml` (D5); `pressure-gauge` row + recipe
  (`capabilities: [gauging]`); `headAtm(now)` on the wellhead; the flowing
  seam of `getBulkAvailable` (rate × elapsed while `head > FLOW_FLOOR`);
  the uncapped-well leak in `reconcileRig` (a flowing wellhead with
  nothing coupled puts its flow into the room's air through the shipped
  `escaped` path — the liability you can name).
- Tests: `fill bladder from wellhead` retains; `fill pail from wellhead`
  escapes with the gas-escapes note; `head` falls monotonically with
  `Σ drawn` and two wellheads on one body read one gauge; the eye rung
  has no digit.
- Acceptance: drive steps 14–15.

#### W-B2 · The hearth on gas — `build(drilling W-B2): a brine hearth runs on a bladder set on it, and the cordwood stays unbought`
- `Oven.fuelSlot()` (D14) + `brine-hearth.yaml` `placements: [on]`.
- Tests (kernel): a bladder of coal gas placed on an Oven is its fuel; the
  bed is refused while coupled; removing it restores the bed; a pail of
  water placed on it is not fuel; `Retort` unchanged.
- Acceptance: drive step 16.

### Stage C — oil

#### W-C1 · The oil country — `build(drilling W-C1): a seep, two structures, one of them empty`
- Rejection: `location/seep-hollow.yaml` (prop `thing/seep.yaml`),
  `location/dry-rise.yaml`, both `surfaceWorkings`; Ferrow `fluids:` gains
  `oil-leg` (`fluid: …/bulk/crude-oil`, `charge: true`, `headAtm0: 2.5`,
  `topZ −200`) under the hollow and `dry-trap` (a structure the read
  reports, `charge: false` pinned) under the rise.
- Tests: `structure` reports both; `fluidAt` under the rise is `null` at
  every depth of the trap; the dry hole's log line reads *nothing*.
- Acceptance: drive steps 17–19 (the dry hole spends the payroll, the log
  keeps).

#### W-C2 · The barrel — `build(drilling W-C2): a schedule declares its separation; crude splits into five things, two of which anyone buys`
- Kernel (D7): `separation`, `FractionSpec.material`, validations, the
  `fractions` branches of `getBulkMaterialPath`/`getBulkAvailable`.
- trade-fuel: materials `crude-oil` (tags `[liquid, crude, flammable]`),
  `gasoline` (`[liquid, fuel, flammable, volatile]`, autoignition low),
  `lubricating-oil`, `paraffin-wax` (`[… candle-stock]`, melting ~330 K),
  `asphalt` (residue); schedule `idea/fractionation/crude.yaml`
  (`separation: fractions`, `inputCategory: crude`,
  `discipline: chemistry` — the requirements name it, and the shipped row
  already owns *"the salts in a water"*), fractions gasoline → kerosene (`material: …/bulk/lamp-oil`)
  → lubricating oil → paraffin wax, residue asphalt, per-fraction
  `requiresHeatK`; `thing/refinery.yaml` naming `/trade/distilling/thing/Still`
  (+ the dependency line); `thing/flare.yaml`; `oil-cask`/`lamp-oil-cask`
  gain `mass`. Terminus: the oilworks stocks a refinery (`props:`).
- Tests (kernel): a `cuts` row with `material` throws; a `fractions` row
  with `productMaterial` throws; a draw clamps at the boundary; the
  destination's material is the fraction's; the `requiresHeatK` ladder
  clamps. (fuel): the candle recipe matches paraffin; the lantern fills
  with the kerosene fraction.
- Acceptance: drive steps 20, 23–26.

#### W-C3 · The remainder — `build(drilling W-C3): store it or flare it; the river leg is deferred`
- **Revised by D17.** No water-pack change. `thing/flare.yaml` ships in
  W-C2 with the rest of trade-fuel's rows; this wave is the **honesty**
  wave: the flare's authored light/burn fields (`lint:light-sources`),
  the volatile materials' `autoignitionTemperature`, and the line on the
  watershed slate recording the sump + `'hydrocarbon'` kind as the
  deferred half.
- Tests (trade-fuel): the flare row warms and lights off a cask of
  gasoline; a cask of gasoline standing in a room reports its own fire
  risk from its material fields; no stock line anywhere names gasoline.
- Acceptance: drive step 27 (store + flare legs), step 28. ⚠ The dump
  leg of step 27 and of AC 9 is recorded unmet in the requirements.

> **W-B1 ✅ · W-B2 ✅ — `47ddea1e3`.** `HeadReading` + the `head` row, the
> pressure gauge and its recipe, the gas cap on Ferrow, the burnt ground
> and its blow, a fourth `surfaceWorkings` entry, and
> `Oven.fuelSlot()` + `placements: [on]` on the brine hearth.
>
> - **`head` goes out in Pa** through the shipped `atmosphere` measure
>   channel. The `Unit` vocabulary is the kernel's and closed and
>   `'atm'` is not in it; adding a unit so one pack's channel could
>   print its favourite scale is a kernel vocabulary edit for a
>   presentation preference.
> - **No `halfWidthOf` override on either channel.** This plan called for
>   one as *the invited non-ratio override* — but both quantities ARE
>   ratio-shaped, so the ladder's default is right and only the constants
>   differ. `DEPTH_FRACTION` lives where the observing happens (the
>   column), and an unused override is dead code.
> - ⭐⭐ **A DRAINED coupled tank is a fire with NO FUEL**, not one that
>   falls back to the bed. The test asserted the fallback first and the
>   code was right: reverting silently would make running out of gas
>   invisible and the bed's depletion inexplicable.

> **W-C1 ✅ · W-C2 ✅ — `87e543d86`.** The oil leg and the pinned dry
> trap; the seep, the whaleback and the cairn; five materials; the
> `crude` schedule; the column and the flare at the oil works; the
> kernel's `separation` + `FractionSpec.material`.
>
> - ⭐⭐ **The separation pair is validated in `onCreate`**, not in
>   `setFractions`: the two keys arrive in whatever order the row lists
>   them, so a setter check depends on authoring whitespace. The
>   convention already says a cross-field rule lives in `onCreate`.
> - **No new `barrel` row.** One was written and deleted on reading the
>   fuel pack properly — `oil-cask` IS the empty cask and
>   `lamp-oil-cask` is the filled twin. The real gap was a STOCK LINE:
>   nowhere in the mining town sold an empty one.
> - ⚠ **trade-fuel is a second namer of distilling's `Still`** and takes
>   the dependency line; promotion is recorded, not done.
> - ⚠⚠ **Two closed-vocabulary slips caught before a boot could see
>   them**, both of which make the whole pack skip install with one log
>   line: `difficulty: straightforward` and `gradeBand: good`.

#### W-C3 · The remainder — ✅ by D17 (store + flare only)

#### W-C4 · The drive and the docs — `drive(drilling): <what driving found>` + `docs(drilling): drilling.md, ground/fractionation/fire/employment/water notes`
- Wire file complete (28 steps); `docs/subsystems/drilling.md` new;
  one-paragraph additions to `ground.md` (fluids), `mining.md` (the
  column's second consumer), `fractionation.md` (`separation`),
  `fire.md` (the coupled fuel vessel), `employment.md` (the hire driver —
  strike the deferred line at `:866-868`), `watershed.md` (the sump),
  `instrumentation.md` (two channels), `content-packs.md` (pack 57). The
  `CLAUDE.md` map line is left to the sweep.

---

## Reachability wiring

Five links — verb · affordance · data · boot · arg gate — each fails
closed and silent. ⭐ An affordance is a **static on a class**; a row's
`commandContributions:` is dead.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `bore`/`drill` (site, then swing) | `trade/drilling/cmd/drilling/bore.yaml` → `/trade/drilling/idea/cmd/drilling/BoreController` | `Derrick.commandContributions.peers` | the derrick recipe + row; the wellhead seed; Ferrow `fluids:`; the claim's title (`stake`) | the wellhead's `postRegister` clock; `BoreRegistry`/`BodyRegister` boot entries | `derrick` default `reachable:[class.Derrick]`, `requires: [ToolMixin]`; the room must be titled to the giver (`AccessApi.can`) |
| `bail` | `bail.yaml` → `BailController` | `Derrick.peers` | the bailer recipe/row (`capabilities: [bailing]`); a vessel | — | `tool` default `reachable:[capability.bailing]`; `vessel` `greedy: true`, default `me:i:[mixin.BulkableMixin]`, `requires: VisibleMixin` + `mustHaveBulkSlot` (the `tap.yaml` shape) |
| `line` | `line.yaml` → `LineController` | `Derrick.peers` | the liner recipe/row | — | `liner` default `me:i:[class.Liner]`… ⚠ a Good has no class token — use `requires: TangibleMixin` + keyword `liner`, the register's own pattern |
| `hire` / `dismiss` | `hire.yaml`, `dismiss.yaml` → controllers | `Derrick.peers` | the outfit seed row; the two roustabout rows cast in the Dry; the giver's bank | — | `target scope: [reachable]`, `requires: class:Agent`, `greedy: true` |
| `apply` / `clock on` (a player hand) | shipped | shipped (`JobBoard`/opening derivation) | the outfit's open `roustabout` seat | — | shipped |
| `measure structure` / `analyze structure` | platform `measure`/`analyze` (shipped) | the channel row | `structure.yaml` + class; a dial/compass (shipped) | `ReadingCatalogue` warms by infix | `scope: [here]`; instrument `surveying` |
| `measure head` | platform `measure` | the channel row | `head.yaml` + class; the gauge row/recipe | catalogue | `scope: [subject]`, `subjectRequires: [class:Wellhead]` in the channel's words; `greedy: true` on the subject |
| `fill <vessel> from <wellhead>` | platform `fill` (shipped) | — | the wellhead's four seams | — | both args `requires: VisibleMixin`, reachable (shipped) |
| `stake spring` | mining's `stake` (shipped) | `ClaimsRegister` (shipped) | one `surfaceWorkings` entry per site | — | shipped |
| `make derrick / bailer / liner / pressure-gauge` | platform `make` (shipped) | the recipe rows | wood, leather, iron in Rejection's store | `RecipeCatalogue` | shipped |
| the hearth on gas | shipped `fill`/`put … on`/`ignite` | `Oven.fuelSlot()` | `brine-hearth.yaml` `placements: [on]`; a bladder of gas | — | — |
| the refinery | shipped `pour` | `Still` (shipped) | `refinery.yaml`; `crude.yaml` schedule; five materials | `FractionScheduleCatalogue` by infix | `pour`'s vessel arg (shipped) |
| the candle / the lantern / the street | shipped `dip` / `fill` / the civic bill | shipped | `paraffin-wax` `candle-stock` tag; kerosene = `lamp-oil` | — | shipped |
| the flare | shipped `fill` + `light` | `Lamp` | `flare.yaml` | — | shipped |
| the outfall | shipped `pour` | `Conduit` | `outfall.yaml` with a sump | the water catalogue's class scan (shipped) | shipped |

⚠ Three of these were the precedent's silent failures: a `data:` key the
class's `fieldMeta` does not declare is discarded (every new field is
declared); a controller `requires:` naming a pack mixin must resolve in
the live registry (`GroundPointMixin` is registered at pack discovery);
and a Reading row whose class does not extend `Reading` warms as nothing.

---

## Acceptance-criteria coverage

| AC | wave(s) | how it is observed |
|---|---|---|
| 1 free evidence says *something*, never *where* | W-A2, W-C1 | the spring/seep props; the eye rung's sentence; `structure` needs an instrument |
| 2 a better instrument or band narrows structure; nothing reads charge | W-A1, W-A2 | `DEPTH_FRACTION[band]`; `isCharged` has no channel and no refusal |
| 3 depth takes wages over time | W-A3, W-A4 | `swingBank` + presence feeder; `payDay` |
| 4 a dry hole costs the payroll, informs, leaves a record | W-C1, W-A3 | the bank statement; the log line *nothing at −210 m*; the `bore` document kept |
| 5 brine → hearth → salt sold inland | W-A5 | the pan's `salt`; the provisioning store's line |
| 6 the hearth on the bore's gas, cordwood untouched | W-B1, W-B2 | the bed unchanged while coupled |
| 7 pressure falls across visits; the owner decides | W-B1, W-C1 | `head` monotone; `dismiss` is the decision; no notice ever fires |
| 8 kerosene in a lamp, paraffin in a candle, by hand | W-C2 | the lantern burns the kerosene fraction; the dip matches `candle-stock` |
| 9 something nobody buys; every disposal visible | W-C2, W-C3 | no stock line names gasoline; the cask's own fire risk; the flare's light. ⚠ The **dump** leg is unmet by D17 and amended in the requirements |
| 10 owner's geology, crew's labour | W-A3, W-A4, W-A5 | two transcripts after one bore |
| 11 a second bore is rows | W-A2, W-B1, W-C1 | four sites, zero code in `rejection` |
| 12 same seed, same answer | W-A1 | the determinism test across two processes |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (ground):** `Deposit.fluids` — the trap geometry, `fluidAt`
  ordering (body over water over null), seeded charge determinism, the
  structure bracket; `BodyRegister` reconcile and the two-straw sum;
  `GroundPointMixin` over a fixture room.
- **Unit (kernel):** `FractionSchedule` separation validations;
  `Fractionating` `fractions` clamp + material-per-fraction;
  `Oven.fuelSlot` coupling; `DocumentKinds` two new rows (`PaperKinds.test.ts`).
- **Unit (trade-drilling):** `Wellhead` bank/reconcile/presence/leak,
  the four seams, `cutBill` thresholds; `DrillingOutfit` payDay/payOff;
  five controllers through `CommandApi.createCommandContext` (⚠ a bound
  arg is an `MqlOneResult`, never a `Stuff` — every controller reads
  `.stuff`); the two readings (no digit in an eye rung; `± m` grows with
  depth).
- **Unit (trade-fuel, water):** the schedule row parses and warms; the
  wax matches the candle recipe; the sump discharge.
- **Only the drive can prove:** the five links per verb; the stake fork
  on a new entry; the crew working through a clock jump with the owner
  logged out; the gas escaping from a pail in a real room; the hearth
  running on the bladder; the barrel's five casks and who will buy them.
- **Wire file:** `packages/wire/tests/drilling.dirty.wire.test.ts`,
  `WIRE_BOOT=1 WIRE_PORT=2013` (build-2's port), the harness clock seam
  for the weeks of boring (taps-plan D22). ⚠ Re-run after **every** review
  fix; assert understood-and-changed, never *not refused*.
- **Gates:** `pnpm -C packages/server lint:family` every wave — the roster
  is derived; never enumerate it in a script.
- `pnpm test` **twice**: before the MR, at `/finalize`. Rebuild
  `packages/types` after any merge from master before trusting a `tsc`
  error. `pnpm install` after W-A0 and after W-C2's dependency line.

---

## Risks & opens

1. ⚠ **`measure dip` at the surface is `null` by design** (`Deposit.ts:461-468`
   — dip wants the vein in section). Drive step 3 (*`measure strike` and
   `measure dip`*) cannot pass as written. This plan does not reopen the
   mining geometry; `measure structure` is the second instrument read and
   the drive should say so. **User's call:** amend step 3, or let the
   fluid body's trap expose a surface dip the way an outcrop's bedding
   does (a `Deposit` change the mining build declined).
2. ⚠ **`survey` is a holding mirror** (`SurveyController.ts:76-123` —
   shell, upkeep, *nothing here to take stock of*); the salt spring is a
   prop that `look` shows. Drive step 1 should read `look`, or the eye
   rung of `analyze structure`.
3. ⚠ **`measure pressure` is atmospheric and Container-only**; the token
   this build ships is **`head`** (D5). Drive step 21 wording.
4. ⚠ **There is no street lamp.** Drive step 24's *street lamp* is the
   lantern (`fill lantern from cask; light lantern`) plus the civic fuel
   store, which accepts the kerosene fraction by the `lamp-oil` tag with
   nothing changed. Wording, not scope.
5. ⚠⚠ **Dumping into the reach has no mechanism** (Grounding § Water). D15
   makes a contained water-pack change (a sump on `Conduit`) so the
   refinery's own outfall is a real discharge. This is the plan's one
   touch outside ground and the kernel, and it is the cross-cutting edge
   of *every disposal is visible to somebody*. **User's call:** keep W-C3
   as planned, or defer the river to the watershed slate and ship store +
   flare only (AC 9's *dump* leg then goes unmet and the requirements say
   so).
6. ⚠ **`make` and a 1 500 kg fixed derrick.** `CraftingLogic` lands
   tangible output at the maker (`:684`, `:2147`); a `fixedInPlace` output
   in a pocket is wrong. The build confirms where `make` lands a
   `fixedInPlace` row; if in the inventory, the derrick is minted by the
   **siting act** from six lengths of wood in the room and the recipe row
   stays as the ladder's rung (the `charcoal.yaml` shape).
7. ⚠ **A second namer of distilling's `Still`** (D7). Dependency line
   now; promotion to `platform/thing/Still` is the content-packs rule's
   review question and is recorded in Deferred seams.
8. ⚠ **The wage is a loan or a refusal** — a bore owner with an empty bank
   gets arrears and a line, and the crew keeps working on the book. That
   is the shipped rule and the honest one; the plan does not add *crew
   downs tools*. Lens 6 says the owner finds out at the bank.
9. ⚠ **Presence across a gap is assumed for a brainless NPC** (he has
   nothing that moves him). The sample cap (`SAMPLE_CAP_S`, one game
   hour) bounds the error if something does — a player hand gets the
   same cap, so a player crew member must stay for real.
10. **Kerosene = `lamp-oil`.** The requirements call the fraction
    kerosene; the shipped material's keywords already include it and the
    lamp, the store and the bill all read its tag. Renaming the row is a
    rename across five packs for no new behaviour — declined; the
    fraction's `key` is `kerosene` and its `material` is `lamp-oil`.
11. **The crew's labour discipline is `mining`.** The requirements name
    no labour discipline and forbid a new one; cutting ground is what
    `mining` already is (its row: *"Cutting ground and keeping it up …
    Improves by doing, and the ground is an unforgiving marker"*). Alternative
    considered: `teamstering` (the beam is a team's work) — rejected, a
    windlass is not a team.

---

## Deferred seams

- **The pump** → [pump-slate](../slates/builds/pump-slate.md): the
  wellhead's `getBulkAvailable` bailed-rung is where a pump's throughput
  plugs in (a `LiftMixin` on the derrick raising `BAILER_L` per swing to a
  continuous rate).
- **Compressed storage** (`maxPressureAtm`) → the destructive-distillation
  slate's tail; the first cylinder is the consumer (D6).
- **`Still` promotion to the kernel** when a third pack names it (D7).
- **`SurveyReading`'s position trio onto `GroundPointMixin`** — the third
  copy exists now; the sweep is `trade-mining`'s (D3).
- **Dip from the surface** — Risks §1; a `Deposit` decision the mining
  build made and this one leaves.
- **A dumped liquid as a discharge from any shore** — the whole of it now
  (D17), not just the general half: the `Conduit` sump, the derived
  `dischargeLoad` and the `'hydrocarbon'` contaminant kind → watershed
  slate.
- **Secondary recovery; `cap`/`plug`** → drilling-slate's tail. An
  uncapped well leaks (W-B1) and nothing caps it — the liability the
  polity gets to price.
- **The act/credit legs for every other RGO** → the RGO spine
  (field-substrate-slate § the other two legs): the owner/crew split is
  implemented here on the wellhead; the spine says the roster will want
  the same read.
- **`appoint` reaching a reachable NPC** — declined here; `hire` is the
  trade's word. If a second trade wants it, widen `appoint`'s scope then.

---

## Critical files

Read first, in this order:

1. `docs/requirements/drilling-requirements.md`
2. `packages/content/ground/src/idea/Deposit.ts` (`:140-260` the types and
   fields, `:318-470` the reads, `:627-786` the helpers) ·
   `…/ground/src/lib/Strata.ts` · `…/ground/pack.yaml`
3. `packages/content/water/src/idea/FisheryRegistry.ts:1-230` ·
   `packages/server/src/mud/lib/document/{Register,DocumentKinds}.ts` ·
   `api/document.ts:100-280` · `lib/document/__tests__/PaperKinds.test.ts`
4. `packages/content/terminus/src/market/idea/cmd/StallController.ts:60-240`
   · `…/trade-shopkeeping/content/trade/shopkeeping/idea/business/stall.yaml`
   · `packages/content/trade-haulage/src/idea/CarrierBusiness.ts`
5. `packages/server/src/mud/lib/command/EngagedActController.ts` ·
   `platform/idea/cmd/inventory/TapActController.ts` ·
   `platform/idea/cmd/ground/WorkedActController.ts` ·
   `packages/content/trade-mining/src/idea/cmd/mining/DriveController.ts:60-175`
   (the scars)
6. `packages/server/src/mud/lib/ground/Improvable.ts:180-410` ·
   `packages/content/trade-quarrying/src/lib/Working.ts:395-580`
7. `packages/server/src/mud/lib/employment/Organization.ts:60-660` ·
   `platform/idea/api/EmploymentLogic.ts:841-900, 1008-1170, 1469-1545` ·
   `api/employment.ts` · `platform/content/platform/cmd/employment/appoint.yaml`
8. `packages/server/src/mud/lib/instrument/Reading.ts` ·
   `packages/content/trade-mining/src/lib/SurveyReading.ts` ·
   `…/trade-mining/src/idea/reading/GroundReading.ts` ·
   `…/content/trade/mining/idea/reading/strike.yaml` ·
   `packages/content/platform/content/platform/idea/reading/pressure.yaml`
9. `packages/server/src/mud/lib/bulk/Bulkable.ts:380-430, 660-720, 780-900`
   · `platform/idea/api/BulkableLogic.ts:150-370` ·
   `lib/fractionation/{FractionSchedule,Fractionating}.ts` ·
   `packages/content/trade-distilling/content/trade/distilling/idea/fractionation/wash.yaml`
   · `…/trade-distilling/src/thing/Still.ts`
10. `packages/server/src/mud/lib/fire/Burner.ts:340-460, 790-880` ·
    `platform/thing/{Oven,Lamp}.ts` · `lib/spatial/Placing.ts:60-90, 239-260`
    · `packages/content/trade-quarrying/content/trade/quarrying/{thing/brine-hearth,thing/salt-pan,idea/maturation/brine}.yaml`
11. `packages/content/trade-mining/src/idea/cmd/mining/StakeController.ts:55-250`
    · `…/trade-mining/src/thing/ClaimsRegister.ts` ·
    `packages/content/rejection/content/world/terminus/rejection/{rejection.yaml,thing/claims-counter.yaml,idea/deposit/ferrow.yaml,location/hillside.yaml,agent/hewer.yaml,idea/coop-business.yaml}`
12. `packages/content/trade-fuel/{pack.yaml,package.json}` ·
    `…/content/stuff/idea/material/bulk/lamp-oil.yaml` ·
    `…/content/trade/fuel/thing/{gasometer,gas-bladder,oil-cask}.yaml` ·
    `packages/content/energy/src/thing/FuelStore.ts` ·
    `packages/content/trade-chandlery/content/recipes/candle.yaml`
13. `packages/content/water/src/thing/Conduit.ts` ·
    `…/water/src/idea/WatercourseCatalogue.ts:90-110, 230-260, 640-780`
14. `docs/subsystems/content-packs.md:525-760` · `docs/subsystems/{ground,mining,instrumentation,fractionation,employment,bulk,fire,activity,location-graph}.md`
15. `packages/wire/tests/taps.dirty.wire.test.ts` (the harness shape and
    the clock seam) · `docs/plans/taps-plan.md § D22`

---

## Drive record

✅ **MET — 24 of 24, on a fresh database (2026-10-09).** The wire file is
`packages/wire/tests/drilling.dirty.wire.test.ts`; run it with

```
WIRE_BOOT=1 WIRE_PORT=2013 WIRE_BOOT_TIMEOUT=900000 \
  WIRE_FRAME_TIMEOUT=60000 npx vitest run tests/drilling.dirty.wire.test.ts
```

⭐ **A fresh DB needs the raised boot budget** — `bootOwnedWorld`'s
default is 420 s and installing the full pack set exceeds it, after
which the harness reports *the owned server did not answer* while the
log's last line is `AppBootstrap: world open`. Reset with
`pnpm -C packages/server reset:db` before a run that cares about
`stake` (the claim persists, and a repeat run answers
`already-claimed`).

### What the drive has PROVED live

- the free evidence (the spring) and the eye rung's refusal to say more;
- ⭐⭐⭐ **the structural read points off-site at the spring and says
  *you are as near the top as the ground gets* at the flat** — the crest
  geometry, which is the thing W-A1's slab premise would have made
  decorative;
- ⭐⭐⭐ **the CAIRN reads exactly as well as the whaleback** — two
  structures, one charged and one not, and no instrument tells them
  apart. The trade's premise, driven;
- ⚠⚠ the instrument's words never mention charge;
- `stake flat` RECORDING a claim (which had never once succeeded in this
  realm before this build's fix), and the untitled refusal proved by a
  **non-wizard**;
- siting raising a derrick and a wellhead; the second `bore` banking a
  swing;
- the wage bill; `dismiss`; the gas country as a fourth site and third
  showing; `head` refusing a non-wellhead in the channel's own words;
- the bore log keeping a dry metre.

### ✅ What the last four defects were

The three checkpoints that had never passed went green with the content
fixes (daylight before the rack; the crew cast at the flat). The pass
that got to 23/24 then found four more, and they were the best findings
of the build:

| defect | what it cost |
|---|---|
| `FractionSchedule.setProductMaterial` refused `''` | the crude row threw at hydration and the schedule never stood up: **the only fractionating column in the game was inert**. The pairing rule had already moved to `lint:fraction-schedules` *because* `separation:` may be read after this field — the setter was never relaxed to match the gate it delegated to. |
| `bore` missing from `DOCUMENT_KINDS` | every `logMetre` threw. ⚠ It catches its own failure, so the metre was still cut and **only the record was lost** — a write that looked like it worked. |
| ⛔⛔⛔ **nothing ever READ the bore log** | write-only for the whole build. See below. |
| a swing that bought no yard printed only its stroke count | the depth was already being read here and `void`ed. |

⭐⭐⭐ **The write-only register is the one worth reading about.**
`StructureReading`'s own header already promised the reader — *"what a
trained eye makes of the country, and of its own notes"* — so wiring it
finished a wave rather than widening one. ⚠ It does not weaken the
premise: *nothing tells you that but the hole* stays exactly true,
because **a log IS a hole** — append-only, filed by the trade, editable
by nobody including its subject. That is precisely what makes a **dry**
log worth money, since a dry trap reads as well as a charged one
forever, so the only evidence a trap is dry is somebody's wasted
payroll written down where a stranger can read it.

### ⚠ And three DRIVE defects, which cost more run time than the engine did

- **One ambiguous noun cost six checkpoints.** `look roustabout` matched
  both hands, the binder raised a disambiguation prompt (correct
  behaviour), nothing answered it, and **the session stayed wedged on
  the open prompt so every later checkpoint timed out too** — six
  failures at 60 s apiece with nothing wrong with their subjects.
- **A checkpoint read a surface the author had deliberately closed** —
  it diffed `look wellhead`, whose row says *there is no telling
  anything about it from up here*.
- **A vacuous assertion looked exactly like a passing one** — the
  bore-log checkpoint asserted `look wellhead` was non-empty, and passed
  green all build while the register it claimed to prove was write-only.

⭐ **`too-tired` is the design, not a defect.** A swing costs real
endurance and *you are not meant to do this by hand* is the trade's
thesis. The drive eats, drinks and rests on the clock rather than the
cost being lowered to suit a test. ⚠ It was NOT a cost problem but a
**hunger** one: endurance is a Reserve and *hydration throttles
recovery*, so a body that has never eaten or drunk never gets its wind
back however long you wait.

### ⭐⭐⭐ Three things perception masqueraded as

Worth the most of anything here, because each one presents as the
mechanism being broken:

1. a **target** you cannot see does not BIND — `dismiss roustabout`
   answered `no-target` at a rig with two hands standing on it;
2. an **item** you cannot see cannot be taken — the `get`s off the rack
   bound nothing in a dim claims office, so the kit never arrived and
   `bore` answered *I don't understand that* four rooms later;
3. a **room** you cannot read returns no prose to match, so a checkpoint
   fails on its assertion rather than on its subject.

### ⚠⚠ And two drive-writing rules this file paid for

- **A checkpoint must own its position.** A walk appended to checkpoint
  A does not run when A fails, leaving the session in the wrong room and
  every later checkpoint failing for reasons unrelated to its subject.
  *A checkpoint that inherits its position inherits every earlier
  failure.*
- **`refusedFor` must read all three refusal kinds.** The usual helper
  looks only for `controller-rejected` and is blind to
  `command-rejected` / `validator-failed` — the two ways a command dies
  before a controller runs. ⭐ The tell was **seven diagnostics inside
  the controller never firing**, which reads as the controller doing
  nothing rather than as the command never arriving. *"Not refused" is
  not "succeeded."*

---

## ⚠⚠ ONE QUESTION FOR REVIEW: the crew's rate

**Measured on a fresh world, 2026-10-09:** two roustabouts on shift at
the rig, over a full game day, moved the hole **one metre**.

Against the shipped constants that looks an order of magnitude light:
`CREW_SWINGS_PER_HOUR = 120` × 2 hands × 24 h = 5 760 swings, and
`SWINGS_PER_METRE_REF = 6` at the reference hardness. Lining is **not**
the gate — the Rejection deposit authors no `waterTable`, so it defaults
to −45 m and `wantsLinerBeyondM` is 45, far below where the hole stopped.

⭐ **The suspect is `SAMPLE_CAP_S = 3600`.** `reconcileRig` clamps
`elapsed` to one hour, so a clock JUMP is credited **once** rather than
replayed hour by hour. The cap is the right shape — it is what stops an
unobserved rig minting unbounded depth, and it is consistent with
*depth is BANKED, only the swing is ENGAGED* — but it means the
docstring's *"weeks pass with nobody reading"* is only partly true: the
weeks are credited as an hour. A shift window that the jump lands
outside of would compound it, since `crewOnShift()` counts only hands
actually on shift.

⚠ **Deliberately not changed by this build, and deliberately not
asserted by the drive.** Which number is wrong — the cap, the swing
rate, or the expectation — is a balance question against a running game,
and this project's standing posture is that pricing and rate tuning are
parked until there is one. What the drive asserts is the mechanism: the
hole gets deeper, and the reader never touched the beam. ⭐ A rate
nobody has tuned is not a mechanism, and a checkpoint that asserts one
fails for reasons that teach nothing.

---

## ✅ BUILD COMPLETE (2026-10-09)

The drive is 24/24 on a fresh database, `origin/master` is merged in
(which brought `trade-glass`), **15 886 tests pass**, `pnpm build` is
type-clean and all 70 `lint:family` gates pass. The MR is open; review
is a conversation in the build session.

⭐ **Two stale censuses in other packs surfaced at the full suite**, and
only one was this build's:

- `PackLogic.discover` expected 57 packs and `trade-drilling` makes 58 —
  the **fifth** arrival of the hazard that test's own comment block
  describes. Both branches counted 57 correctly off 56, and git merged
  the assertion line *cleanly* while conflicting the comments, so it
  went red with nothing in the diff to explain it.
- `trade-mining`'s exemplar census was stale for the **glass** build's
  `sand-pit.yaml` and `glasshouse-business.yaml` (`d4965e7ab`) — so
  `origin/master` was red, and this merge is simply the first full suite
  run to notice. ⭐ The ordinary cost of a census living in another
  pack's test: the build that adds the row is not the build whose suite
  fails.

### ⚠ Two findings owed to OTHER packs, not fixed here

- ⛔⛔ **Rejection's provisioning till cannot take money.** `settleSale`
  returns `null` for three different reasons — no venue path, no
  business operator, no operating account — and **all three are
  reported to the player as `insufficient-funds`**, so a shop that
  cannot trade tells the buyer their wallet is empty. ⭐ This build adds
  the thing the taps build could not: **a working comparison.** The
  apiculture drive buys six goods at the Terminus general store
  cleanly, so `settleSale` is sound and the defect is specifically
  `provisioning-business`. A hypothesis worth chasing:
  `operatingAccountOfImpl` takes an `openingAdvance` only when the
  account has no entries, and a sale remits the demo sales tax OUT of
  the shop — so a cold shop at zero may be unable to remit the tax on
  its first sale, which would make *the first sale a venue ever makes*
  the one that always fails. A bootstrap deadlock, invisible to any
  venue that has traded once.
- ⚠ **A sibling worktree's `dev:server` preflight SIGTERMs this drive's
  server** mid-run (port 2010 is shared). A run that dies with
  `fetch failed` and wholesale dispatch timeouts, with
  `Server: SIGTERM received` in the log, was killed from outside and
  should simply be re-run.
