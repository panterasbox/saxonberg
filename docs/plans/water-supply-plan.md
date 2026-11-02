# Water supply — implementation plan

Executes [water-supply-requirements.md](../requirements/water-supply-requirements.md)
(**kind: feature · leads from: kernel**; first consumers the Terminus houses
and the Hinkley Hills district, Rejection, and the Heart's Delight valley).
The build gives the kernel a **premises water citation** (energy's meter, for
water), makes every fixture **read its supply and fail closed**, ships the
**divider** (priority / proportion), **intermittent supply with storage**, the
**room pipe** as a durable fixture that freezes and leaches, the **soil's water
budget** (inlets · ponding · salt · drainage), the **aquifer**, the **gates and
the ditch** with a work log, two Disciplines, the `trade-plumbing` pack, the
dose fix, and the content that consumes all of it. Four stages, twelve waves;
Stage D is the first to cut.

Branch `reqs/water-supply` (build-1, `WIRE_PORT=2014`).

---

## ⚠ Requirements disagreements (for the owner — not absorbed)

Each is a place the code or a standing rule contradicts the requirements as
written. The plan proceeds on the **recommendation** column; the owner can
reverse any of them at review.

| # | requirement says | what the code/rules say | recommendation |
|---|---|---|---|
| R1 | *"Mining's `sink` sinks a well"* (Placement, D16, drive 15) | `sink` is `trade-mining`'s winze: `SinkController extends WinzeController → driveIn('down')`, which refuses outside a `Working` room and **mints a room** in a `MineWarren`, never a Thing. A well is a point on open ground. Rung 1 of the collision ladder (unify behind an interface) fails: the two acts share no host. | **`dig well`** — the platform's `dig [<what>] [with <tool>]` already exists over the ground protocol (`Workable.planWork(by, tool, what)`); a tract or yard answers `what = 'well'`. No new verb, `sink` untouched, mining credited through `WorkResult.credit`. (D20) ✅ **Owner agreed 2026-11-02**, and widened it: a well is dug OR drilled (D27), and the dug well is the first consumer of a general **hole** (D20). |
| R2 | drive 22: *"picks or breaks a junior padlock"* | No lock-picking or lock-breaking verb exists anywhere (`break`/`smash`/`pick` are free; `pick` is a `harvest` alias). | ✅ **Owner agreed 2026-11-02: theft is CUTTING THE BANK** (D28) — how water was actually stolen. The thief `ditch`es the ditch bank with a spade; the breach diverts water onto the ground beside it; the weir reads more than the gates account for and the rider's round finds the breach on `look`. The gate's log stays clean (nobody touched it). `break <padlock>` stays a deferred seam. |
| R3 | drive 7: *"the upstairs room's tap runs weak"* at Hinkley | `house-programme.yaml` has no upper floor. Paint (MR !513, `reqs/paint`, build-2) mints a `HoldingBuilding` per lot and answers `HoldingWarren.structureOf(room)`, but **no building anywhere authors storeys** — not Hinkley's minted ones, not Seznick (whose floors live in its `BuildingWarren` unit keys `f<floor>-u<pos>`). ⚠ The earlier claim that Seznick "computes head per storey today" was wrong. | ✅ **Owner agreed 2026-11-02: add the loft.** Hinkley's house gains a **loft bedroom** (one floorplan leaf on storey 1). One question answers a room's storey (D4): an authored building's `storeyOf`; a minted room asks the warren that minted it (`BuildingWarren` knows each unit's floor; the holding knows each room's floorplan storey via paint's `structureOf`). Drive 7 runs at Hinkley as written; Seznick's upper units read the same rule. **Built on paint's model** — paint is in review and lands first; if it has not when W0 starts, W0 reads Seznick's floors and the Hinkley half follows the merge of master (never gated). |
| R4 | *"The plumber's yard is in the goods yards, by the founders"* | The goods yards have no founder or foundry (zero rows); the only founder is Rejection's. | The yard sits in the goods yards (the industrial parcel, the city's demand); iron pipe is a **founding recipe** cast at Rejection's foundry and sold through its counter. The sentence "by the founders" is dropped. ✅ **Owner agreed 2026-11-02.** |
| R5 | D12: *"a flooded field becomes a water place you wade"* | `Field` is a fixture Thing; `Tract` is a Location composing neither Shore nor Swimmable nor WaterPlace, and `WaterPlaceMixin` claims a CITED water (`WaterSpec.of`) whose level comes from a water source — a ponded field cites nothing. | Standing water is **a depth on the tract's floor**, the shape the floor's snow already has (`Floor._snowDepthM` → `snowBandOf`): `look` reads it, the posture/traverse verbs read the band. The observable in AC 18 is unchanged; the word "water place" is not met literally. ✅ **Owner agreed 2026-11-02**; a swimmable paddy or bog belongs with the flood crop (farming-slate). |
| R6 | D2: *"The plumber may be a player or a hired NPC"* | Hiring an NPC to execute an act on your property is the work-contract (gig) substrate's `fulfill` shape; no shipped brain executes a `connect`/`plumb` on a contract. | The shipped NPC plumber **sells pipe and cisterns** at the yard; the player plumber does the acts. "NPC plumber on a gig" is a deferred seam named in § Deferred seams. AC 3 is met by the player path. ✅ **Owner agreed 2026-11-02**; "hire an NPC to perform an act" is the shared mechanism freight, drilling and construction also need → freight-slate + contract. |
| R7 | D2/D3/drive 6: one verb `plumb` with two targets (the lot, then the kitchen) | *One verb per act*; and the owner (2026-11-02): *"`plumb` as a magic verb that just does plumbing doesn't feel very lensworthy"* — construction must sit on assembly, crafting and the material trades. | ✅ **Owner agreed 2026-11-02: no new verbs — `fit`.** A pipe run is an **assembly** (D10): a bill of pipe lengths and wiped joints (assembly `Joint` rows dressed by plumbing, as cordage's knots are by ropework); `fit lead pipe to <run>` lays a length; a complete run delivers. The lot's **service run** (stopcock → house) works the same way and its completion cites the main (replaces `connect`). Runs sit `under`/`behind` with `conceals: true` (D29) so finished rooms do not show their plumbing. The general construction design is its own conversation → construction-slate. |
| R8 | drive 13: *"`fill` a bucket at the deep well (no pump) by hand"* | A `Well`'s trough starts empty; nothing lifts without a pump. The bucket act is **harbors'** (`bail` moved to platform over any `LiftSource`, MR in flight on build-4). Never gate on a sibling. | This build ships no bucket act. Drive 13's second half asserts the suction refusal + `analyze pump` at the deep well; the bail assertion is written **guarded** (`skip` with a named reason when `bail` is not installed) and lights up when harbors merges, whichever order. ✅ **Owner, 2026-11-02: this build starts before harbors merges, and harbors will probably merge first.** So: start guarded; **when harbors lands on master, merge master into this branch at the next wave boundary, reconcile `LiftSource.liftInto(litres, by?)` + `bail` on our side (we merge second), and remove the guard** — step 13 asserts `bail` unconditionally before the MR opens if harbors is on master by then. Flag to harbors' MR: should `bail` answer `draw` for a well (*draw water from the well*)? Their call. |
| R9 | D18 Rejection: the wells cite Rejection's aquifer | The zone cites deposit `ferrow` (`waterTable: −45`); the village well authors 6 m, the deep well 14 m. | Rejection's wells sit on a **shallow aquifer row** (`/stuff/idea/Aquifer/rejection-till`, table ≈ 6 m under the pithead yard); the Ferrow's −45 m is the mine's. No deposit edit. The brine bore stays drilling's. ✅ **Owner agreed 2026-11-02** — a perched/shallow till aquifer over the bedrock's deep table, kept apart by clay; the mine or a punched bore draining the village wells is digging-slate content. |
| R10 | D17: Furtado and Avila *work their own turns* — drive 20 under a jump | A clock jump runs no brain; the HD pack is deliberately unbooted. | Their turns are **reconciled from the posted rota** when the gate is read (`Gate.reconcileScheduled`), and the `irrigates` brain acts live when the valley is loaded with somebody present. AC 14 is met by both halves; step 20 passes under a jump by the first. ✅ **Owner agreed 2026-11-02, with the refusals:** the reconcile obeys the live act's refusals — `Gate.canOpen(theIrrigator)` per scheduled opening (a padlocked junior turnout with no key for the irrigator stays shut and the log records the refused turn); a gate opened on a river that delivers nothing logs the opening and credits the field zero. An NPC can never do through the reconcile what a player could not do at the gate. |

---

## Grounding

Verified 2026-11-02 on `reqs/water-supply` by opening the files named. Three
survey files in the scratchpad carry the line-level detail; this section keeps
what the decisions turn on. Paths relative to `packages/` unless absolute.

### The supply side (water pack + kernel)

- `content/water/src/thing/Conduit.ts` — `StagedMixin(ContainerMixin(SwitchableMixin(Thing)))`, **not Persistable**. `extent` is ONE path prefix (`serves()` l.331, exact prefix; `''` serves nothing). `supplyStateNow()` (l.489) is sync and answers only `cut`/`off`; `dry`/`frozen`/`fouled`/`overdrawn` are async in `readingFor()`. `withdrawalM3S()` returns capacity, not demand. No schedule, no shortage sharing, no knowledge of its taps, no `commandContributions`. Module-level `catalogueOf()` (`StuffApi.singleton(WATERCOURSE_CATALOGUE_PATH)`, load on use) and `dial()` at the bottom — the pattern a sibling class copies.
- `content/water/src/thing/StorageNode.ts` — `PersistableMixin(SwitchableMixin(Thing))`, the one work that persists itself; `levelM3` persistent, not authorable. `fillFrom`/`draw`/`headOverServedGroundM`/`outageToleranceS` have **test callers only**. No stamp, no clock, no `SupplyServing`, no rain.
- `content/water/src/thing/ControlStructure.ts` — plain `Thing`; `passFraction`, `divertsTo`, `split()`, `withdrawalM3S()`. **The diversion vanishes**: `divertsTo` is read only in `split()`; `WatercourseCatalogue.worldScan` subtracts the withheld share downstream and credits it nowhere. No setting verb, no lock, no log.
- `content/water/src/idea/WatercourseCatalogue.ts` — `flowAt(ref, nowS, draws)` (l.803, async; natural flow memoized per weather segment, minus every draw at/upstream); `worldScan(nowS)` (l.1149, the one enumeration over the works the reaches name; live object else `rowWork(row)`); `contaminationAt`; `waterStateAt` (l.923) carries `pH, hardnessDgh, nitrateMgL` from the course seed and a **derived** `salinityPpt` (l.954: 0.3 fresh, brackish near the sea, 33 at sea). The node parser (l.2900–2925) copies every key explicitly — a new node/course key needs a line there.
- `content/water/src/idea/Watercourse.ts` — `WatercourseWater {pH?, hardnessDgh?, nitrateMgL?}` (l.216), no salinity seed, no lining.
- `content/water/src/idea/WaterRightRegistry.ts` — documents of kind `water-right` at `/system/water/rights/<course>/<node>/<id>` (`DocumentKinds` has `contentDir: 'water-rights'`, so a pack can SHIP rights); `file`, `filedRightsOn`, `allocate` (seniority), `quotaRemainingM3`. **No production caller, no verb, no authored right.**
- Kernel `server/src/mud/platform/thing/WaterFixture.ts` — `UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`; `suppliedBy` (identity ref, `''` = own endless source), `hardnessDgh`; `mainOf()` (l.165) is a sync `StuffApi.findByTemplatePath` that **fails OPEN** (warns once, runs endlessly) when the main is not loaded; `supplyStateNow()`, `isBulkEmpty`/`getBulkAvailable` overrides; `settleBulk('interior')` (async) pulls the main's hardness; two module-level augmenters; `peers` wash/scrub/rinse/cool. No premises, no head, no depletion.
- Kernel `server/src/mud/lib/supply/SupplyState.ts` — six words, `SUPPLY_STATE_PRECEDENCE`, `SUPPLY_STATE_GLOSS`, shapes `SupplyServing {supplyStateNow; readWaterHardnessDgh?}`, `SupplyReporting {supplyReport?}`, `StreetLightingSupply`. `lib/supply/Powered.ts` is the kernel-shape-implemented-by-a-pack precedent (`GridPoweredMixin` implements it structurally).
- Kernel `platform/thing/Well.ts` — `StagedMixin(ContainerMixin(BulkableMixin(Thing)))`, `implements LiftSource, PumpSource`, **not Persistable**; `depthM`, `standing`; `standingAvailableL() → Infinity`; `liftInto(litres)` lands in the `interior` trough; `canAddContainable` admits one pump. Affords `pump.yaml` (peers).
- `lib/pump/Pumping.ts` — `planPump` refusal order (`beyond-suction` before `beyond-lift` before `nothing-standing`); `reconcileRunning(nowS)` integrates `poweredTrajectory` over `[runStamp, now]` for packing wear (l.530) — the integrate-never-sample idiom.
- `BiomeApi.suctionHeadFor(scope, density?)` — the suction ceiling, arithmetic over the place.
- `content/ground/src/idea/BodyRegister.ts` — `/system/ground/idea/BodyRegister`, documents of kind `body`, `recordDraw`/`drawnFrom`; **recharge is zero by design**; header names "a water utility sinking a municipal well" as its future consumer.
- `content/ground/src/idea/Deposit.ts` — `waterTable` (authorable, spoiler 1; `ferrow` −45, `valley-alluvium` −1.2).
- Harbors (`../build-4`, `reqs/harbors`): changes `LiftSource.liftInto(litres, by?)`, adds optional `liftedWords/bucketRefusal/bucketLanded`, moves `bail` to platform over any `LiftSource`, adds `barWaterAt`/`stopOver`/`hailables` on `Watercourse`/`WatercourseCatalogue`. **Untouched by harbors:** `Conduit`, `StorageNode`, `ControlStructure`, `WaterRightRegistry`, `Well`, `WaterFixture`, `lib/supply/*`, `flowAt`, `worldScan`, `contaminationAt`.

### Energy's premises pattern (the template)

- `lib/parcel/ParcelRecord.ts` — `TitleClaim {extent, holder, parentParcel?, landUse?, areaM2?, reach?, feeder?, powerBand?, published?}`; fields `reach`, `feeder`, `powerBand` persistent with get/set pairs; `setPowerBand` validates inline (no static helper — `lint:lib-statics` is a ratchet).
- `platform/idea/ParcelRegistry.ts` — `powerOf(path)` (l.157, **sync**: longest-prefix cover, then walk `parentParcel` for the first band and the first feeder); `byFeeder`/`byReach` keyed indexes maintained in `indexRecord`/`deindexExtent`; `citeReach`/`citeFeeder` (l.463/481) are runtime mutators with **no production caller** — the precedent for an act writing a premises fact. Gate `ParcelApiCallers`.
- `platform/idea/api/PackLogic.ts` l.451–482 (claim validation) + l.3442–3445 (copy into `TitleClaim`): `feeder`/`powerBand` parsed; `reach:` is NOT parsed (a latent gap, not this build's — noted).
- `content/energy/src/lib/GridPowered.ts` — lazy `ensureResolved()` on first READ (never `onCreate`; a boot-order bug is documented in its header), `resolveRoomPath()` walks containment to the room (a non-Containable host is its own premises), caches band+feeder, reads energization live. ⭐ The direct template for a fixture resolving its premises.
- `scripts/check-power-posture.ts` — every pack.yaml claim with `landUse ∈ {residential, commercial, industrial, civic}` declares or inherits `powerBand`; ceiling 0.
- ⭐ **Keyed holding rooms.** `content/residence/src/idea/HoldingWarren.ts` l.10–18: each room is a keyed instance of a REAL row, `(scope = the row, key = <lot extent>/<leaf>)`, and `templatePath` resolves to the shared row. So `ParcelApi.powerOf(room.getTemplatePath())` on a Hinkley kitchen resolves the **district**, not the lot. The lot is reachable from the room's **persistence key** (`PersistableMixin.getPersistenceKey()`, `lib/persistence/Persistable.ts` l.253; `MixinApi.isPersistable` at `api/mixin.ts:1852`): `<lot extent>/kitchen` longest-prefixes to the lot's parcel. Seznick units key `f<n>-u<m>` under `parentExtent …/seznick-house`.

### Locks, open/close, switch

- `lib/boundary/Lockable.ts` — `LockableMixin` (`locked`, `keyway` spoiler, `lockTechnology`; `isLocked/setLocked/lock/unlock/opensFor`); composed only by doors/exits; **no Thing composes it**. `lib/lock/Lock.ts` `opensFor(mover)` is a sync wallet scan; `issueKeyTo(holder)` ungated — callers: `TitleController:407`, duncan `ProvisionController:145`, mayfield `LeaseController:133`.
- `lib/spatial/Sealable.ts` — binary over `BistateMixin` (`isOpen/setOpen/open/close`), no setting, no hook. `OpenController` (l.39–125) narrows `effectiveTarget(isSealable)`, checks `isOpen`, calls `open()`, runs the interact-hazard; **never consults a lock**. The `open`/`close` views take one arg (`requires: SealableMixin`, `scope: reachable`).
- `SwitchController` — no ownership/lock/seat check; `switch.yaml` `requires: SwitchableMixin`. The intake's `switch` affordance comes from the `ElectricPump` inside it (`peers` + `environment`).
- `GovernmentApi.holdsSeat(character, governmentKey, seatKey)` (`api/government.ts:111`) — the authority predicate. Government rows: `terminus-city.yaml` (seats `magistrate`, `gauger`, `public-works` → `/world/terminus/budget` `works-foreman`); `hearts-delight.yaml` (one seat, the Warden). `Position` (`lib/employment/Position.ts`) has `key, label, noun?, wageRate, fulfills?, purchases?, requires?, …` — no key issuance. Employment controllers at `platform/idea/cmd/employment/{Apply,Appoint,Clock,Collect,Dismiss,Quit,Tip}Controller.ts`.

### Persistence of small state

- `PersistableMixin` — a host keyed by templatePath (or `(scope, key)`); captures `persistent` fields, direct contents, worn gear into `holder_snapshots`; a fixture's runtime state rides its host's record only for `persistent && runtimeState` fields (`lib/mixin.ts` l.194–198). The rooms holding the works are NOT persisted: Wharfside bank (`Quay`), Hinkley lane (`Locale`), Rejection yards (`Locale`), market square (`Street`), HD millsite (`Street`) — a switched-off intake, a cut, a changed `passFraction`, a well's trough all revert on unload. Hinkley/Seznick bathrooms and Hinkley yards ARE `PersistentLocation`.
- Reconcile precedents: `SoilMixin` stamps (`soilClockStamp`, `rainClockStamp`, `persistent+runtimeState`; `reconcileSoil` sync with a reentry guard, walked in ≤180 daily steps, `integrateRainfall` with an **unresolved-never-advances** stamp and an async `restampWatershed()`); `TrajectoryLog` (`lib/Trajectory.ts` l.220, a bounded ring over a host's persistent `Breakpoint[]`, `Piecewise.integrate`/`secondsAtOrAbove`); `GridCatalogue.outages` (in memory, re-energizes on reboot); `Pumping.runStamp`.
- `lint:reconcile-chains` refuses a new `reconcile*` that samples a stepped temperature (`getTemperature(`/`hostTemperatureK`/`getOwnTemperatureK`) without reading a `temperatureTrajectory` or carrying `@samples`.

### Soil, growth, readings, health

- `lib/husbandry/Soil.ts` (1414) — four reserves (`moisture` L, `nitrogen`, `organicMatter`, `structure`), **no salt**; `reconcileSoil` l.711; `drainSoilBetween` l.798 (the only sink is plant/sward demand — no percolation, no runoff, no drainage); `integrateRainfall` l.998 (`WeatherApi.precipitationBetween × area`, capacity-clamped, **excess discarded**; nitrate leach keyed to mm of RAIN); `waterSoil(litres)` l.1135; `creditReserve` l.1360 (`min(amount, headroom)`). Host hooks `soilWaterDemandPerGameDay`, `soilCatchmentAreaM2`, `soilLeachRate`, `soilDrawFactor`, the parts protocol, `watershedScope()`.
- `lib/reserve.ts` — `adjustReserve` and `Reserve.toStored` clamp `[0, capacity]`: **a reserve cannot hold above capacity**; ponding needs a field of its own.
- `lib/husbandry/Growing.ts` (2360) — `LimitingFactor = water|light|root|nutrient|cold|null`; `GrowthProfileData` has no salt or flood tolerance; adding `cold` touched exactly six places (union, five exhaustive phrase tables, `growthTerms`, `getLimitingFactor`, the step loop's `min`, the `sat*` function) — the template for a new factor. `satWater` saturates at 1 (wet is never a penalty); `RootsBand 'sodden'` at 0.95 is the nearest "drowning roots" words. Host seams `soilMoisture()/nutrientLevel()/waterTheSoil()`; `Plant.ts` overrides them.
- `lib/husbandry/Cultivable.ts` — `soilCatchmentAreaM2 = getLandRequirementM2()` (0 for a pot). Composers: `platform/thing/GardenBed.ts:59`, `platform/thing/PlantPot.ts:58`. **No drainage-hole concept exists.** `platform/idea/cmd/bulk/WaterController.ts` l.144–166 refuses at headroom ≤ 0 (`already-wet`) and transfers the pour to the `null` sink (payload chemistry dropped).
- `content/trade-farming/src/location/Tract.ts` — `PersistableMixin(WarrenMemberMixin(ImprovableMixin(CharacteredSoilMixin(SoilMixin(ReservedMixin(Location))))))`; `installTractReserves` (l.1292) calls `installSoilReserves` only when the moisture reserve is missing (a restored tract will not pick up a fifth reserve through it). `src/thing/Field.ts` — a fixture Thing (`AdornmentMixin`), `seedbedStamp` set by `turnUnder()` (the stamp-as-prepared-state shape furrows copy), `fieldLines(viewer)` is the look text. `src/lib/CharacteredSoil.ts` `installSoilReserves(sample, depthFactor)` installs per key idempotently — where `salt` is installed; `resizeSoilReserves` scales moisture only.
- `content/ground/src/idea/GroundCharacter.ts` — `GroundSample.drainage` (0 waterlogged … 1 droughty) is read by **nothing in the water balance** (only `improvementCost`, `lookPhrase`). `lib/ground/Improvable.ts` `IMPROVEMENT_JOBS = ['clearing','draining','liming']`, `bankWork`, `progressOn`, `REVERT_PER_GAME_DAY.draining = 0.0012`; `DitchController` (`cmd/ground/ditch.yaml`, `digging` tool) banks `draining` and changes no soil quantity. Turbary's peat subsidence (`trade-quarrying/src/location/Turbary.ts` l.140–160) is the "drainage effective over a window" pattern.
- `lib/ground/Floor.ts` — `_snowDepthM` (l.1039), `snowBandOf` (l.155, dials `climate.snow.bandM.*`), `snowPhrase()`, `refreshSnow()` gated on `rainReaches()` + `isOnGrade()` — the depth-on-a-floor shape standing water copies.
- Metabolism: `Metabolic.resolveToxinBehavior(type)` resolves `/platform/idea/Condition/metabolism/<type>` — **the dose tag is the row's file leaf**; unknown tags are a silent no-op. `Condition/metabolism/lead.yaml` (leaf `lead`, `name: lead-poisoning`, `law: burden`, one band `{threshold 5}`); five producer rows dose `lead-poisoning` (water `tainted-water.yaml:39`; base-library `glaze/lead.yaml:35`, `glaze/tin.yaml:31`, `alloy/pewter.yaml:31,33`, `element/lead.yaml:35`); `fouled-water.yaml:51` doses `dysentery` and **no `dysentery` row exists**. No lint joins tag to leaf (`check-conditions.ts` checks `law`/`signature`/`vital` only).
- Lead law: `BulkableMixin.reconcileFaceExchange()` (private, l.1075; host `Faced` + interior bulk; `material.acidAttack() > 0 && insideFace.getLeaches()`; `mg = mgPerLPerDay × attack × days` into `payload.dissolvedToxins`). `Material.acidAttack()` reads the **Material row's pH only**; plain water authors no pH (→ 7 → 0). Hardness is not in the law. `BulkPayload` is extended by declaration merge (`lib/cleanliness/WaterHardness.ts` l.25 — the pattern for `pH`/`salinityPpt`). `WaterDraw` (`lib/location/WaterSource.ts`) carries `materialPath, temperatureK, hardnessDgh?` only.
- Readings: `lib/instrument/Reading.ts` row fields `channel, kind, scope, subjectRequires, discipline, instrument, instrumentNoun, handTool, eyeCeiling, bench, improves, stakes`; `runAnalyze` bands by `min(competence, held handTool ceiling or eyeCeiling)`; hooks `analyze(ctx, target, band, handTool, param)` / `measure(ctx, target, instrument, band, param)`. Water pack `reading/water.yaml` (`instrument: ""`, `eyeCeiling: expert`, chemistry) — `WaterReading.analyze` prints *"fouled — an outfall above here"* **by eye** at a reach (l.233–248) and `reportOn(target)` for a fixture. `DepthReading.measure` (`bracketed(Quantity, band, seedFor)` + `creditDeed`) is the pattern for flow/stage/table. Farming's `SoilSurveyReading.ts` reports acidity + nitrogen bands — **no moisture, no salinity**.
- `lib/quantity.ts` — `Unit` is a closed TS union; `'m³'`, `'L'`, `'kg/m³'`, `'m/s'`, `'ppm'` exist; **no flow unit** (no `m³/s`, `L/s`); converters via `registerConverter`; tag tables via `Quantity.registerTagTable` (`'m²'` → `lot` is the precedent).
- Disciplines: rows `class: /platform/idea/Discipline` loaded by class from any root; `chemistry`, `health`, `teamstering`, `mining`, `founding`, `smithing`, `coopering`, `carpentry`, `soil-science` exist; **no `plumbing`, no `hydrology`**.
- Record layer: `FillController` l.142 says *"You fill <target> from <source>."* — the source THING only, never the place; `recall fill` finds it.
- Room thermal: `AtmosphericMixin` carries `enclosure`/`roof` as plain fieldMeta keys (`Place.ts` l.341–350: *a fourth mixin layer on this class collapses inference*, which is why they live on Atmospheric). `reconcileEnvelope()` integrates an opaque room's unobserved gap as ONE piece against `envelopeOutsideK`, **the outside temperature at the READ** — a frost night read at noon is never seen. Stateless `WeatherApi.temperatureAt(site, locality, t)`, `dailyRangeAt`, `freezeThawDaysAt(site, locality, from, to)` exist.
- Repair: `repair.yaml` arg `requires: DurableMixin`; a Location composes neither Durable nor Assembled; a room's pipe must be a Durable Thing to be mended.
- Calendar: `CalendarMixin` on **Avatar only**, `addCalendarEntry({label, whenGameS, source})` ungated; `MixinApi.isCalendarKeeping`. Behavior: a clock jump runs no brain; `candidate` trigger = one deliberation beat; `farms.ts` urgency is constant `wanted` and reads no calendar/rota; HD is unbooted by design; Terminus producer rooms boot under `unobserved-economy`.

### Content (row paths)

- Terminus works are `props:` of `wharfside/bank.yaml` (Quay): `thing/city-intake.yaml` (`extent: /world/terminus`, 1.2 m³/s, `on: true`, prop `intake-pump`), `city-outfall.yaml` (0.1 km below, organic 0.6), `cold-fell-aqueduct.yaml` (no `on:`, stays off), `aqueduct-house.yaml` (weir, hydro). **No pump-house location.** Market `square.yaml` props the one plumbed `standpipe.yaml` (`suppliedBy: city-intake`); no fountain.
- **Fifteen `WaterFixture` rows**, fourteen with no `suppliedBy`: Hinkley `thing/standpipe` (in each lot's YARD, not the lane), Duncan `tap`, campus-farm `trough`, generic `fixture/{basin, bath-tap, trough, water-butt}` (shared across kitchens/bathrooms/bathhouse/ward/lots), potash `rain-butt`, hospitality `water-tap`/`basin`, brewing/distilling `standpipe`, tannery `leat`, brickfield `pond`. Archetype slots (`archetypes/{bathroom,kitchen,hospitality,brewhouse,still-house}.yaml`) declare `needs: {bulkSource: water}`.
- Hinkley: `thing/district-tank.yaml` (StorageNode tower 400 m³ at 145 m over a 130 m zone, `servesExtent` the district, **no level**), `house-programme.yaml` (yard · hall · kitchen · living · bedroom · bathroom · garden; **no upper floor; `lots/kitchen.yaml` has no tap**), `pack.yaml` claims district + lot-1 (`powerBand: off-grid`), `idea/plat-book.yaml`.
- Rejection: `village-well.yaml` (6 m, hand pump) on `pithead-yard`, `deep-well.yaml` (14 m, bolt holes) on `hillside`; butts in `foundry.yaml`, `goat-pen.yaml`, potash `lean-to`. Founder + foundry rows exist here only.
- Heart's Delight: `Watercourse/delight.yaml` (nodes `spring` 720 m · **`flats`** 180 m `works: [millrace, sawmill-race]` · `mouth` 35 m, `branchesFrom: kestrel:confluence` — the intake's own reach, so a flats withdrawal reaches the city with no new link); `millrace.yaml` (weir, `delight:flats+0.3,right`, hydro for `mill-stones`), `sawmill-race.yaml`; prose asserting senior/junior rights in `bench-lane.yaml`, `valley-gate.yaml`, `bench-field/idea/ground.yaml`; Quist's `upper-bench.yaml` (`SingletonTract`, "JUNIOR rights"); buyable farmsteads (`valley-book.yaml`, `farmstead.yaml` leaves yard/house/barn + tracts `upper-bench 0.3`, `orchard-close 0.25`, `lower-meadow 0.45`); parish government with the Warden. **No flats location, no Furtado/Avila, no ditch company, headgate, weir, gauge or observation well.**
- Infirmary: ward/garden/collection/business + physician/nurse/registrar/runner/donor — no health officer, no kit.
- Wire harness: four test routes only (`test-clock`, `test-hand`, `test-nourish`, `test-weather`); `testharness` does `clock` + `weather`; everything else is founder `eval` (`cover.dirty.wire.test.ts` l.242–256 `founderEval`). Blocking files refuse a jump over a game day; `.soak.` files run under `pnpm wire:soak`.

### Lint roster (derived; `pnpm -C packages/server lint:family --list`, 85 gates)

The gates this build touches or adds: `lint:instanceable`, `lint:imports`,
`lint:module-scope`, `lint:mixin-names`, `lint:field-meta`, `lint:object-verbs`,
`lint:lib-statics` (ratchet — no new static helper classes in `lib/`),
`lint:verb-collisions`, `lint:instrument-args`, `lint:controller-rows`,
`lint:self-contributions`, `lint:power-posture` (the sibling of the new
`lint:water-posture`), `lint:conditions` (the sibling of the new
`lint:toxin-keys`), `lint:reconcile-chains`, `lint:boot-entries`,
`lint:template-scans`, `lint:get-or-create`, `lint:world-scan`,
`lint:unconsumed-seams` (a ceiling — a field authored in a wave ahead of its
reader is fine), `lint:water-citations`, `lint:envelope`, `lint:biome-sky`,
`lint:closed-vocabularies`, `lint:schema` (no new collection: it must not
move), `lint:drive-scripts`, `lint:test-bootstrap`. Never enumerate the
family in CI or docs; `lint:family` runs them all.

---

## Plan-level decisions

Numbered so waves and commits cite them. Lens citations are to
[design-lenses.md](../design-lenses.md); lenses 1 and 2 decide.

**D1 — The premises water citation is a `ParcelRecord` field, energy's shape.**
`waterSource: string` on `TitleClaim` + `ParcelRecord` (persistent, get/set,
inline validation): a **template path** of a thing that answers the
`WaterSupply` shape (a conduit, a tank, a store, a well), the literal
**`none`** (a declared dry premises — the `off-grid` analogue), or `''` to
**inherit** the covering parcel's. `PackLogic` parses it from a manifest
claim; `ParcelRegistry.waterOf(path)` is the sync longest-prefix-then-walk-up
twin of `powerOf`; `byWaterSource` is the keyed index twin of `byFeeder`;
`citeWaterSource(extent, path)` is the runtime mutator the **service run's
completion** calls (D10) (the `citeFeeder` precedent, which has no caller yet). The realm root
`/world/terminus` declares **nothing** (the feeder reasoning: an inherited
citation would put Rejection on the city main). A new gate,
`scripts/check-water-posture.ts` (`lint:water-posture`), is the twin of
`check-power-posture.ts`: every `residential · commercial · industrial ·
civic` claim declares or inherits; `agricultural`/`wild` exempt; ceiling 0
at landing. *Lens 2: one line per premises, in the file that already says
who owns it.*

**D2 — A fixture reads its premises, and fails closed.** `WaterFixture`
keeps `suppliedBy` as an explicit override (a fixture plumbed to a NAMED
source, which some rows legitimately are) and gains `natural: boolean`
(authorable, default `false`): an author's declaration that this fixture IS
a source (the leat, the pond, a spring) and runs endlessly. With neither,
the fixture resolves its premises — `resolvePremisesPath()`: the room at the
end of the containment walk (the `GridPowered.resolveRoomPath` shape);
⭐ when that room is `Persistable` with a persistence key, **the key**, not
the row path (a keyed holding room's premises is its lot; Grounding § Keyed
holding rooms) — then `ParcelApi.waterOf(premises)`. Resolution is **lazy on
first read, never `onCreate`**, and happens on the async `settleBulk` path
every draw verb already awaits; the supply itself is loaded on use with
`StuffApi.singleton(path)` (never `findByTemplatePath` in front of it —
`lint:get-or-create`). The sync reads (`supplyStateNow`, `isBulkEmpty`,
`getBulkAvailable`, the look augmenter) answer from the resolved cache;
**before resolution they report empty and say nothing** (never endless —
the `Feeder.drawFodder` fail-closed rule replaces the fail-open warn).
`UnboundedSourceMixin` comes **off** `WaterFixture`: available volume is
the supply's answer (a main or a natural source: unbounded; a store: its
level; `debitBulk` forwards to the store's `drawL`).

**D3 — One kernel shape for everything a tap can hang off: `WaterSupply`.**
In `lib/supply/SupplyState.ts` beside `SupplyServing`:
`supplyStateNow(): SupplyState | null` · `supplyHeadM(): number | null`
(the water surface's elevation ASL, `null` = unknown) ·
`supplyCapacityM3S(): number` · `drawL(litres): number` (what was actually
given — a main gives all it is asked, a store its level, a well through a
running pump its throughput) · `supplyReport(nowS)` · `readWaterChemistry():
Promise<WaterChemistry | null>` (D8). Implemented structurally (no kernel
import of a pack): water's `Conduit` and `StorageNode`, kernel `WaterStore`
(D5) and `Well` (D13 — only through a fitted running pump), plumbing's
cistern row (a `WaterStore`). Every `SupplyServing` reader keeps working
(it is a subset).

**D4 — Pressure is head, decided at the outlet by its own height.** A
fixture's `outletElevationM()` = the zone elevation of its room
(`ZoneApi.elevationFor`) + its storey's height (the room's storey index — one
question, answered by an authored building's `Structure.storeyOf(place)`, by
a `BuildingWarren` for its units (the floor it minted them on), or by a
holding for its rooms (the floorplan leaf's `storey:` key, through paint's
`HoldingWarren.structureOf`) —
depth in the `on:` chain × `construction.storeyHeightM`, dial 3.0; a place
in no structure is 0). Head at the outlet = `supplyHeadM − outletElevationM`.
≤ 0 → the outlet gives nothing and the report says *"the water stands below
here"* (state `dry` — the source has nothing to give THIS outlet); below
`water.weakHeadM` (dial 3) → **weak**: a draw gives at most
`water.weakDrawL` (dial 2) and says so. Nothing asks the supply which other
outlets exist. *Lens 1: head and the weak top floor are derivable from two
elevations.* R3: the head test drives at the Hinkley loft (and Seznick's upper units).

**D5 — Stores: the tank is the water pack's, the household store is the
kernel's.** `StorageNode` gains `fillsFrom` (a supply path), `fillRateM3S`,
`schedule: ShiftEntry[]` (the turncock's fills — the employment `ShiftEntry`
`{days, hours}` shape reused as data, no import), `drawM3S` (the district's
household rate — **never a sum over live taps**), `levelStamp`
(persistent + runtimeState), and `reconcileLevel(nowS)`: integrate inflow
over the schedule's on-windows ∩ the source's delivery (a 0/1 trajectory
derived from the authored schedule and the source's `cut` log — no sampling)
minus `drawM3S`, clamped to capacity. It implements `WaterSupply` and
`shares: 'priority' | 'proportion'` (D6). A new kernel
`platform/thing/WaterStore` — `PersistableMixin(ThermalMixin(BulkableMixin(Thing)))`,
`fixedInPlace` — is the butt, the cask-on-the-stand and the roof cistern:
its **level is its interior bulk** (so `fill`/`pour`/`drink` work at it with
no new verb), `fillsFrom: 'rain' | <supply path> | ''`, `catchmentM2` (its
roof), `fillStamp`, `reconcileFill(nowS)` (rain: `precipitationBetween ×
catchmentM2`, the soil edge's expression pointed at a roof; a supply: its
delivery trajectory × `fillRateLps`). It implements `WaterSupply` (a
premises cites it; its head is its own elevation + the room's). The generic
`water-butt` and potash `rain-butt` rows re-point to `WaterStore`
(`fillsFrom: rain`). Persistence purpose, in one line on each row: *a
store's level is the water the house has between fills.*

**D6 — The divider shares by the premises' land use.** `shares: priority`
ranks outlets by their premises' `landUse`: `civic` (public outlets) →
`commercial`/`industrial` (the trades) → `residential` (houses) — Vitruvius's
order from a field authors already write; no new field on any fixture.
`shares: proportion` scales every draw by `deliverable / demand`. Demand is
the divider's authored `demandM3S` (the district rate) plus the scheduled
fills it feeds; a shortage is `demand > deliverable` (capacity, the river,
the pump). An outlet asks *its own* supply for `rankServedNow(landUse)`; it
never enumerates siblings. *Lens 4: who goes dry first is a tier-C choice on
one row (`shares:`), and evidence at the tap says which rung you are.*

**D7 — A seventh supply word: `unplumbed`.** *Nothing is connected to it.*
A fixture whose premises declares `none`, cites nothing resolvable, or whose
room has no sound pipe (D10) reports `unplumbed`, ahead of `cut` in
precedence (it is the furthest from being fixed by the person asking).
`watershed.md` says a seventh word is a design conversation; this is it:
`dry` would make the river lie for the house (lens 3a). ✅ **Owner agreed
2026-11-02.** Words: the tap *"Nothing comes out — this house isn't on any
supply."*; `analyze water` *"unplumbed — no pipe brings water here."*
`SUPPLY_STATES`/`PRECEDENCE`/`GLOSS` gain the entry; every speaker keeps
compiling (the union widens, no switch is exhaustive on it — verified in W0).

**D8 — Water chemistry rides the payload and the draw.** `lib/supply/WaterChemistry.ts`
(a named value object): `WaterChemistry {pH, hardnessDgh, salinityPpt}`
with `blend(a, va, b, vb)`, and the declaration merge adding `pH?` and
`salinityPpt?` to `BulkPayload` (the `WaterHardness.ts` pattern; `hardnessDgh`
stays where it is). `WaterDraw` gains `pH?`/`salinityPpt?`. `Watercourse`'s
`water:` seed gains `salinityPpt?`; `waterStateAt` uses a **seed when
present, else the derived value** (requirements D13 "seeded on each river"
and the shipped sea-distance derivation are reconciled: a seed is an author's
override). `Conduit.readWaterChemistry()` returns the reach's; a tap settles
it into its interior payload. The **lead law** reads the payload: `Material.acidAttack()`
gains an optional `pH` argument (the WATER's when the payload carries one,
else the material row's — the shipped glaze case is unchanged), and a
**softness factor** `clamp01((SOFT_BELOW_DGH − hardness) / SOFT_BELOW_DGH)`
multiplies the lead rate (requirements D10: softness AND acidity). Flint is
derivable: soft, slightly acidic water in a lead run.

**D9 — The dose defect: the leaf is the key, and a gate holds it.** Retag the
five producer rows `lead-poisoning → lead` (the leaf is the join;
`name:` is display). Author `Condition/metabolism/dysentery.yaml` (toxin
route — fouled water's shipped route — `toxinBehavior.toxinType: dysentery`,
`law: burden`, a `vital` signature draining hydration, `observableSigns`,
resolution by rest/boiled water). New gate `scripts/check-toxin-keys.ts`
(`lint:toxin-keys`): every `toxicity[].type` and `leaches[].toxin` in content
resolves to a `Condition/metabolism/<leaf>` or `Condition/pathogen/<leaf>`
row; ceiling 0.

**D10 — The room pipe is a durable fixture Thing, not a fabric key.**
`platform/thing/PipeRun` — `FacedMixin(DurableMixin(ThermalMixin(BulkableMixin(Good))))`,
`fixedInPlace`, `lengthM`, interior bulk = the water standing in it
(`settleFrom(supply)` fills it with the supply's chemistry; a lead run
leaches by D8 through the shipped face law with no new integration). A
room **has water iff** a sound `PipeRun` stands in it (the fixture asks its
own container's contents — a local read, not a search) **and** the
premises resolves a supply; else `unplumbed`. Pre-connected rooms author a
`PipeRun` row in `props:` (Seznick's bathroom: lead; Duncan's: iron;
Hinkley's bathroom + kitchen: lead) — the same object a plumber completes
with `fit`, so one path, no `plumbing:` fabric key (the `Place.ts` fourth-layer note stands,
and the owner's "a building is not an assembly here" is untouched: the
pipe is a fixture in the room, like the range). `repair` binds it as any
Durable. **Frost**: `PipeRun.reconcileThermal` reads its room's
`temperatureTrajectory` (the publisher; clean under `lint:reconcile-chains`)
and, holding water, **bursts** when its own temperature crosses 273.15 K:
lead bulges (`condition → 0.4`, mendable), iron cracks (`condition → 0`,
mendable but worse — requirements D8, from the materials' `ductility`/
`brittle` rows, read not authored). **Thaw**: a burst run whose temperature
rises above freezing **leaks**: it empties its standing water onto the floor
— `Floor.wetFromSpill(litres)` (a small write on the shipped floor-wetness
seam) — and the room reads *water on the floor* until it dries. Payload lead
in the leak is dropped (it is not drunk).

**D10 (revised 2026-11-02) — the run is an assembly; `fit` lays it.**
`PipeRun` also composes `AssembledMixin`: its bill is `lengthM / pipeLengthM`
**pipe** parts plus a **joint** between each (`Joint` rows of kind
`wiped` — lead — and `caulked` — iron — dressed by the `plumbing` Discipline;
the dressing's quality is the joint's weep rate and its frost margin). `fit
lead pipe to <run>` lays one length and dresses one joint (the shipped
assembly verb; plumbing credit via the joint dressing). An **incomplete run
delivers nothing**; a complete one is sound. Material is the parts'
(a run mixing lead and iron is honest and each part leaches or cracks by its
own). `repair`/`salvage` act per part (assembly's localized wear). An
unplumbed room **offers** a run: the `PipeRun` row is propped EMPTY (bill
unfilled) in every room a floorplan marks `plumbable: true`, so `fit … to
the run` always has a target. **The service run**: a `PipeRun` row of kind
`service` at the premises' frontage (a lot's yard/hall; a unit's corridor
stub); completing it calls `ParcelApi.citeWaterSource(premises, the main
whose extents serve it)` and refuses its last fit with *"no main runs past
here"* when none does. No `connect`, no `plumb`, no plumbing controllers.

**D29 — Plumbing is hidden by construction, not by stealth.** Two new
`Placement` rows (`/platform/idea/Placement/{under,behind}`, prepositions
`[under, beneath]` / `[behind]`) carry a new row field **`conceals: true`**,
read by the room listing (`look`, the room card): a thing placed in a
concealing placement is in the room, nameable and reachable, and **not
listed**. The `Floor` (minted in every room) offers `under`; a bath panel, a
sink cabinet and the range offer `behind`. Runs authored in finished rooms
sit `under` the floor or `behind` a fixture; a scullery's or cellar's run sits
`on` the wall, exposed (the authored choice, and the honest reason it is the
one that freezes). Evidence instead of a listing: `survey` gains a plumbing
line per room (material, sound/weeping/burst); a burst leaks onto the floor
(D10). This is NOT `ConcealableMixin` (perception bands, `search`): a pipe
under floorboards is enclosed, not hiding, so `search` does not reveal it.
`lint:placement-words`: `put` gains the two primary words. The construction
design inherits these rows as its "services in the fabric" seam.

**D30 — Staged or live is the CONTENT's choice, never the class's.**
*(Owner, 2026-11-02: "the answer is always going to be 'is it staged or is
it live?' — that's a question about an individual piece of content, not a
system, so both need to be possible and you build what you need to build to
prove that.")* This supersedes every "becomes Persistable" in D5, D12, D13
and Host placement. Each new stateful kind ships as a **plain** class
(staged: its state derives or reconciles, and reverts to its row on unload)
and, **only where a row in this build needs it**, a **`Persistent…` twin**
(the place-taxonomy prefix: `PersistentConduit`, `PersistentGate`,
`PersistentWaterStore`, `PersistentWell`). An `Aquifer`'s draws ride a
persisted record only when its row says `live: true`. Each row picks, with
its one-line purpose when live:

| row | staged / live | why |
|---|---|---|
| city intake, Cold Fell aqueduct | **live** (`PersistentConduit`) | a cut or switch is somebody's act on the city's works |
| city outfall | staged | nothing acts on it in this build |
| Hinkley district tank | staged | its level derives entirely from the schedule and the district rate |
| Delight headgate, both turnouts | **live** (`PersistentGate`) | who opened what is the ledger the rider audits |
| weirs, the staff gauge | staged | readings, no state |
| a roof cistern sold at the yard; a holding's butt or cistern | **live** (`PersistentWaterStore`) | what was poured in and drawn out is the house's water |
| Rejection's butts, the potash rain butt | staged | rain-fill derives; nobody's water is kept there |
| authored wells (Rejection, Avila's) | staged | they read their aquifer; the trough reverts |
| a well a player digs | **live** (`PersistentWell`) | its banked depth and lining are the player's work |
| `delight-valley` aquifer | **live** | the valley's draws are the commons' history |
| `rejection-till` aquifer | staged | nothing in this build draws it beyond a pump that refills between visits |
| the Delight ditch bank | **live** (`PersistentLocation`, D28) | an open breach is the ditch's damage until closed |

**Proof:** the drive exercises at least one staged and one live row of every
kind it ships both of (the conduit: intake live, outfall staged; the store:
the yard's cistern live, Rejection's butt staged; the well: the dug well
live, the village well staged).

**D11 — The envelope sees the night.** ✅ *Owner agreed 2026-11-02, with D12's lock check and setting arg (all three shipped-behavior changes).* `AtmosphericMixin.reconcileEnvelope`
integrates an unobserved gap for an OPAQUE room as one piece against the
outside at the read. It will instead sample the outside **curve**
(`WeatherApi.temperatureAt` at each piece midpoint, the sunlit room's ≤
1-game-hour piecing applied to every room, capped at 48 pieces; beyond that
a daily `dailyRangeAt` min/max pair per day). No stored state; the gap's
breakpoints land in the ring as today. Without this a scullery read at noon
never froze (Grounding § Room thermal). ⚠ Paint (MR !513) edits
`Atmospheric.ts`; the change is confined to `reconcileEnvelope`'s piecing
loop — whichever merges second reconciles.

**D12 — Gates: one class, a setting, a lock and a log.** Water pack
`thing/Gate.ts` — `PersistableMixin(LockableMixin(SealableMixin(ControlStructure)))`
with `opening` (0..1, persistent + runtimeState), `capacityM3S` (what it
passes fully open into `divertsTo` — a ditch's head capacity, a turnout's),
and `workLog: WorkRecord[]` (`{atS, by, opening}`, persistent +
runtimeState, a 24-deep ring over the `TrajectoryLog` idiom). `split()`
overrides: `diverted = min(opening × capacityM3S, arriving)`, `passed =
arriving − diverted`; `passFraction` is derived, never authored on a gate.
The kernel gains the shape **`Throttleable`** (`lib/spatial/Sealable.ts`:
`getOpening(); setOpening(fraction, by?)`) and the hook
**`canOpen(by): VetoResult`** on `SealableMixin` (default ok). `Gate.canOpen`
refuses when locked and `!opensFor(by)`; `Door` overrides the same hook with
its lock (today a locked chest opens — the hook closes that too). The
`open`/`close` views gain an optional trailing `setting` arg (`a quarter |
half | three quarters | full | 0..1`); `OpenController` asks `canOpen`, then
calls `setOpening(fraction, giver)` when the target is `Throttleable`, else
`open()` — one verb, one act, with an amount (the `pour … <measure>` shape);
a setting on a plain door refuses *"it is open or shut"*. Every operation
records `by` in the log: **the gate's record shows who worked it** (drive
22) without an accountability event (harm only) or a new ledger. Persistence
purpose on the row: *a gate's openings are the water ledger the field
integrates and the rider audits.* Weirs and dams stay plain
`ControlStructure` rows.

**D13 — The aquifer is a record with a level; a lone well is one with one
straw.** Water pack `idea/Aquifer.ts` — `PersistableMixin(Idea)`, rows in the
commons `/stuff/idea/Aquifer/<key>`: `areaKm2`, `capacityM3`,
`rechargeFraction` (of rain over the area that reaches it), `tableM` (water
surface ASL when full), `bottomM`, `localityPath` (whose rain), `drawnM3`
+ `aquiferStamp` (persistent + runtimeState), `reconcile(nowS)`:
`level = clamp(level + rain(locality, area) × rechargeFraction +
percolationCredits − draws)`. `recordDraw(straw, litres, atS)` and
`creditPercolation(litres)` (soil's deep percolation on a tract whose zone
cites the aquifer, D15). Its level is **hidden**: only `ObservationWell`
(`/system/water/thing/ObservationWell`, cites an aquifer) reads it, through
the `water-table` reading. Kernel `Well` gains `aquifer: string`
(identity ref, `''` = lone), `bodyM3`/`drawnM3`/`bodyStamp` (lone body:
seeded at first use from the ground's character and the locality's
rainfall — `GroundCharacter.waterHoldingFactor` × a dial per m of depth; a
`bodyM3: -1` row is bottomless, the author's out), `bottomM`, and becomes
`PersistableMixin(…)` (*a well's standing is the water it has left*).
`standingAvailableL()` = the lone body or the aquifer's level over this
well's bottom; `standingDepthM()` = collar − (table ASL); `liftInto` records
the draw (`by` optional — harbors' signature; whichever merges second adds
the other's arguments). A running pump's rate is recorded at
`reconcileRunning` through the same `recordDraw`. A zone cites its aquifer
(`aquifer:` on `SpatialZone`, inherited by `lookupField`, the `deposit:`
shape) — what `dig well` consults (D20); a well cites its aquifer directly
(load on use: the well follows ITS reference outward).

**D14 — The ditch is a watercourse with a control at its head.** A ditch row
is a `Watercourse` (`/stuff/idea/Watercourse/delight-ditch`, `branchesFrom:
delight:flats`, nodes `head … tail`, `mouth` back into the Delight) with a
new course field `lining: earth | lined` (parser line added). The catalogue
**credits diversions**: `worldScan` collects `diversions: Map<ReachRef,
m3s>` from each gate's `split()`; `flowAt(ref)` adds the diversion credited
at `ref` and at every reach upstream of it on the same course; a course's
own natural flow stays zero when its nodes declare no catchment. **Seepage**
along a ditch: `water.ditch.seepagePerKm` (dial 0.08 of flow per km, earth)
× (`lined` ? 0.1 : 1) × km, subtracted reach by reach. **Return flow** needs
no code: a tributary's mouth already joins its river, so what survives the
tail reaches the Delight below the flats and the no-injury doctrine falls
out (AC 16). *Lens 1: lining cuts seepage; the downstream neighbor who
lived on it loses water, with nobody authoring the link.*

**D15 — Soil takes water through inlets; ponding, drainage and salt are
kernel soil.** On `SoilMixin`: `inlets: InletSpec[]` (`{gate, method:
flood|furrow|basin|overhead, capacityLps?}`, persistent, authorable on a
field row), `inletClockStamp`,
`_inletPendingL` (persistent + runtimeState), and an **async**
`settleInlets(nowS)` — the `restampWatershed` shape: for each inlet it
integrates `gate.openingTrajectory(from, to)` (from the work log, D12) ×
`min(capacityLps, the ditch's flow sampled at each daily step via
flowAt)` into a pending volume, advancing the stamp **only when the gate and
the catalogue resolved** (unresolved never reads as zero). The sync
`reconcileSoil` walk credits the pending volume step by step beside the rain.
**Method** decides the split (requirements D12): efficiency `flood 0.5 ·
furrow 0.65 · basin 0.8 · overhead 0.75` × a texture term; the rest goes to
runoff (lost), deep percolation (credited to the zone's aquifer when one is
cited), or the air (overhead: a loss by `WeatherApi` heat and wind at the
sample — noon in a strong wind delivers measurably less, AC/drive 27).
`furrow` is a stamp set by `plough` (`furrowStamp`, the `seedbedStamp`
shape); `basin` by `ditch` on the field; `overhead` requires the supply's
head > `water.overheadHeadM` (dial 10). **Ponding**: `pondedL` (persistent +
runtimeState) holds what the moisture reserve refuses (rain, inlets, the
can); it infiltrates into the reserve as demand frees headroom and drains by
`drainage`; the floor shows it as standing water (R5). **Drainage**:
`drainSoilBetween` gains deep percolation `max(0, moisture − fieldCapacity)
× drainRate(sample.drainage, progressOn('draining'), tiled)` per day —
`GroundSample.drainage` finally read; `ditch` progress finally changes a
quantity; `tiled` (D17) stops the revert. **Salt**: `SOIL_SALT_RESERVE_KEY =
'salt'` (kg, the fifth reserve, installed by `installSoilReserves` per key —
and `installTractReserves`'s moisture-only guard becomes per-key); in with
inlet litres × `salinityPpt`; out only with percolation at the soil
solution's concentration; `soilSalinityDsm()` = salt / moisture × a
constant. `GrowingMixin` gains `LimitingFactor` members **`salt`**
(Maas–Hoffman: `saltThresholdDsm`, `saltSlopePerDsm` on the profile —
wheat 6/7.1, barley 8/5) and **`flood`** (`floodToleranceDays`; a pond on
the ground longer than it drowns the roots) following the six-site
template; both are **quality** factors in the area-crop `graded` term. A
white crust appears in `fieldLines`/`tractLines` above `soil.saltCrustDsm`
(dial 4). Nitrate leaching keys to **water passing below the roots** (rain
or inlet), not mm of rain.

**D16 — The pot has a drainage hole, or not.** `PlantPot.drained: boolean`
(authorable, default `true` — every shipped pot drains, nothing changes
on the day); an undrained pot's `soilAcceptsPonding()` is true, so
`WaterController` stops refusing at headroom ≤ 0 for it (and for any
field): the excess ponds (D15). The drive's pot row authors `drained:
false`. `satWater` gains the flood penalty through D15's factor.

**D17 — Drains are `ditch` plus tile.** `ditch.yaml` gains an optional
`tile` arg (`ditch with tile`, `requires: StackableMixin`, the drain-tile
row); with tile in hand the act consumes `tilesPerAct` and sets
`drainTiled: true` on the Improvable work, which zeroes
`REVERT_PER_GAME_DAY.draining` for that ground. Drain tile is a ceramics
row (`/trade/ceramics/thing/drain-tile`, a `tile-mould` cast) — "made by
the potter". No new verb.

**D18 — Readings: hydrology, and the kit.** Water pack `Discipline/hydrology.yaml`
(`channel: skill`, specializes nothing; the reading discipline "built like
soil science"). `reading/water.yaml` gains `handTool: water-test`; the
fouling and lead lines in `WaterReading.analyze` print **only when
`handTool !== null`** (the kit in hand); the kit is `/system/water/thing/test-kit`
(a `Tool`, `capabilities: [water-test]`, epoch-dated). Three new channels,
the `DepthReading.measure` shape, banded by hydrology: `flow.yaml` (subject:
a weir `ControlStructure`; `kind: fact`, `scope: [subject]`, the eye reads a
bracket of `flowAt` + what each gate upstream accounts for → the
discrepancy), `stage.yaml` (subject: `/system/water/thing/StaffGauge`, the
reach's level), `water-table.yaml` (subject: an `ObservationWell`). The
miner's inch: `lib/quantity.ts` gains units `'m³/s'` and `'L/s'`
(converters both ways, `L/s ↔ m³/s`), and a tag table on `'L/s'` naming
**`miner's inch`** at 0.7373 L/s (the Colorado statute inch; a unit is a
fixed fact, not a dial). Rights print in it.

**D19 — Seats hold keys because a position issues them.** `PositionData.keys?:
string[]` — template paths of `Lockable` rows whose keyway a holder is
issued (`Lock.issueKeyTo`, the `TitleController` precedent) when they
**`clock on`** (`ClockController`); a quit/dismiss does not claw a bearer
key back (a key is physical; recovery is the institution's business — lens
7). The works keeper's position names the pump-house door; the ditch rider's
names the junior turnouts' padlocks; the turncock's the tank valve. No
permission check anywhere: `switch`, `open`, `pump` stay physical; the lock
is the gate. **Never a wizard check.**

**D20 — The hole, and the dug well as its first consumer.** *(Owner
conversation 2026-11-02 — the general model of digging; the full taxonomy
and the deferred consumers live in
[digging-slate](../slates/builds/digging-slate.md).)* Digging ships in four
kinds, told apart by **what it leaves**: extraction (material in hand —
`dig`/`split`), improvement (a changed state — `ditch`/`grub`/`lime`/
`plough`), **a hole** (a void at a POINT, with a depth — drilling's bore is
the only one today), and a place (mining's warren mints rooms). **Big and
small are volume and tooling, never different acts** — the tool owns the
pace (a spade, a pick, a steam shovel and a wand of digging answer the same
`dig`, the wand paying its pace in charge). This build adds **the hole** as
kernel substrate — `lib/ground/Hole.ts`, `HoleMixin`, with four rules, all
arithmetic over the ground the hole stands in:
1. **Depth is banked** (`depthM`, persistent + runtimeState; the act is one
   swing, the hole remembers — drilling's *depth is BANKED*), and each act
   removes `areaM2 × Δdepth` of ground at the ground's pace.
2. **Spoil goes somewhere**: the removed volume lands as the room's spoil
   heap (the shipped spoil row; `dig the spoil heap` already answers).
3. **The deeper, the more you lift**: past `ground.hoistFreeM` (dial 2) each
   act costs extra exertion ∝ depth, and past `ground.hoistAloneM` (dial 4)
   it refuses without a windlass at the collar (a `Tool` row with the
   `hoisting` capability, propped or carried) — *"you cannot throw it out
   from this deep"*.
4. **Walls stand to the ground's depth**: an unlined hole deeper than the
   ground's standing depth (`GroundSample` hardness → `standsUnlinedM`, the
   drilling liner's rule generalized; default dial 3 for soil) refuses the
   next act *"the sides will not hold"* until lined (`AssembledMixin`, a
   bill of `lining` courses; `fit brick to well`; `linedToM`).
5. **Below the water, it fills**: a hole whose bottom passes the water table
   (the zone's aquifer, else the lone body's seeded table — D13) **strikes**.

`Well` composes `HoleMixin` (a dug well IS a hole that struck). `Tract` (the
farmstead ground) answers `Diggable.planWork(by, tool, 'well')`: the first
act mints the `Well` (as a hole) in the tract, refusing on `wild` land use;
discipline credit `mining`. Past `water.dryHoleM` (dial 25) with no strike
it is a **dry hole** (a `Well` with `standing: ''`, honest, AC 21). `sink`
is untouched (R1). ⚠ The controller never branches on the kind of hole —
the god-verb guard holds; the ground answers `what`.

**D27 — A drilled well strikes the same water.** *(Owner, 2026-11-02:
"wells can be dug or drilled".)* Drilling's bore strikes only the ground's
fluid bodies (traps of oil, gas, brine); groundwater is not one. The
`Wellhead`'s depth read gains one rule: a bore whose depth passes the water
table of its zone's aquifer (or, uncited, the lone body seeded for that
point — D13's seed, keyed on the wellhead) **strikes water** before any
trap; stopped there, the wellhead's fluid is that water and its draws record
on the same aquifer (`recordDraw`), so a deep bore and the shallow dug wells
share one level and the shallow ones fail first. A bore admits no bucket
(narrow); below the suction ceiling a pump must sit down the hole (a force
pump — the mechanism row's `pulls: false`), which the shipped `planPump`
refusal order already says. The bore is its own hole (it does not compose
`HoleMixin`'s hoist/spoil rules — a rig lifts its cuttings); the water strike
is the shared rule. Casing off an aquifer and contaminating it with an
uncased oil bore → digging-slate / drilling's next layer.

**D28 — Theft is a breach in the bank.** *(Owner, 2026-11-02.)* The ditch's
bank (`ditch-bank.yaml`) answers `Diggable` `ditch` when it stands beside a
ditch reach: the act mints a `Breach` — a water-pack `ControlStructure` row
kind (`controlKind: breach`, `divertsTo: ''`, `passFraction` set by the
cut's size, a `cutBy` field naming the cutter). The breach is a prop of the bank, and
**the bank is a `PersistentLocation` for a named purpose: *a cut in the bank
is the ditch's own damage until the rider closes it*** — the one new
persistent place in this build. The catalogue counts a breach like any diversion (D14),
so the weir's account shows the loss (AC 15). `look` at the bank shows *"the
bank has been cut here; water runs out across the field"*. The rider's round
(`rides`) closes a breach it finds (`StuffApi.destruct` of the breach prop,
the act narrated); backfill as a player act is the digging slate's. The
gate's log is untouched — correct, the gate was not worked.

**D21 — The NPC irrigators: reconcile from the rota, act when present.**
The Delight Ditch Company is a `Business` (`/world/terminus/hearts-delight/ditch-company/idea/company`)
with positions `ditch-boss`, `ditch-rider`, `irrigator` (headcount 2),
rostered: Furtado and Avila hold `irrigator` with `schedule` entries that
ARE their turns (night turns included). The **rota is the turn list**:
`Gate.scheduledHolder` names the position + assignee whose shifts open it
(`turnOf: {business, positionKey, assignee}` on the turnout row).
`Gate.reconcileScheduled(nowS)` (called before any read of the log —
`openingTrajectory`, `look`, the rider's audit) appends the openings and
closings the roster implies since the last reconcile, `by: <the NPC's
identity>`, so a field nobody read all night integrates its NPC's turn
(R10). ⚠ **Each implied opening passes `canOpen(theIrrigator)` first** — a
turnout the rider has padlocked against a keyless irrigator stays shut, and
the log records the refused turn; the reconcile never does what the live
act could not. The `irrigates` brain (`trade-farming/src/behavior/irrigates.ts`,
`kind: work`, claims hands+body, urgency `pressing` when its turn is open
and its gate is not, `wanted` when the turn ended and the gate is open)
walks to the turnout and uses the player verbs (`open`/`close`) through
`executeCommand`; when it acts, the log already agrees. The `rides` brain
(water pack `src/behavior/rides.ts`, for the rider) runs when
`flowAt(headgate) < seniorDemand × water.curtailAt` (dial 1.1): walks the
round, `lock`s junior gates in priority order (reads the filed rights). A
player holding a turn gets it in their **calendar**: `ClockController` and
the roster tick write the holder's next `N` shifts as entries (`source:
'rota'`) when the holder is `isCalendarKeeping` (the medicine precedent) —
AC 13's second half.

**D22 — `recall` finds the place.** `FillController`'s line becomes *"You
fill <target> from <source> in <place>."* (`Mml.thing(room)` — the room the
source stands in). Nothing else is counted (requirements D10: the record is
the players' own memory).

**D23 — The intake narrows by a list, not a tree.** `Conduit.extent` becomes
`extents: string[]` (prefixes, longest-prefix over all; a single `extent:`
still authors as a one-element list); the city intake lists the fourteen
city districts. HD, Hinkley, Rejection fall outside, and a service run
refuses to complete where no main serves the premises (AC 3).

**D24 — Continuous outlets.** A `WaterFixture` with `continuous: true`
(authorable) draws its share whether used or not: the supply's `demandM3S`
counts it (the *calix* bore, a row number), it is ranked `civic` by its
premises, and it reads `off` the moment its supply stops (drive 3). The
market fountain is one row.

**D25 — Stores carry what is poured in.** `WaterStore` accepts `pour` of
water (any `water` material family; a fouled pour fouls the store by
volume-blend of `materialPath` — the shipped `drawnWaterPath` words). A
cask on a dray poured into a holding's cistern feeds its taps (AC 22) with
no new verb.

**D26 — Who is charged.** No money moves in any act of this build. The
plumber's fee is hand-to-hand or a gig (shipped substrate); utility billing
is the power-utility build's. The yard's counter sells pipe, sheet, kits
and cisterns through the shipped `PricedOffer` surface.

---

## ⭐⭐ Host placement

Every new field, mixin and class: its host, and what composing it claims
about everything else on that host. The test: a guard that re-narrows the
host set means the host is wrong.

| what | host | claims / why not elsewhere |
|---|---|---|
| `waterSource` | `ParcelRecord` (+ `TitleClaim`) | *every premises can say where its water comes from* — the `feeder` claim, same host. Not on the room (a room is not a premises; a keyed room is many premises), not on the fixture (shared rows). |
| `WaterSupply` shape | `lib/supply/SupplyState.ts` (kernel interface) | a shape, composed by nothing; implemented structurally by pack classes. The `Powered` precedent. |
| `unplumbed` | `SupplyState` union | a seventh word every speaker may answer; no switch is exhaustive on the union (checked W0). |
| `natural`, `continuous`, premises resolution, head | `WaterFixture` | *every tap/basin/trough reads a supply* — the whole claim of the build over the 15 rows. `UnboundedSourceMixin` leaves this class (it claimed every fixture is endless). |
| `WaterStore` (level = bulk, `fillsFrom`, `catchmentM2`, `fillStamp`) | new kernel `platform/thing/WaterStore` — `PersistableMixin(ThermalMixin(BulkableMixin(Thing)))` | a butt, a cask-stand, a roof cistern. **Persistable** because the level IS what the row cannot say (named on every row). Not `StorageNode` (m³/ASL civic works, not Bulkable — you do not `pour` into a water tower); not `WaterFixture` (a fixture does not hold its water). |
| `fillsFrom`, `fillRateM3S`, `schedule`, `drawM3S`, `levelStamp`, `shares`, `reconcileLevel`, `WaterSupply` | water `StorageNode` | already Persistable; the tank is the pack's. |
| `extents[]`, `demandM3S`, `schedule`, `shares`, `cutLog` ring, `WaterSupply`, `PersistableMixin` | water `Conduit` | ⭐ becomes Persistable: *the main's cut and switch are the works' own record* (requirements D7 names the cut as a real state; today it reverts with its Quay). Composing Persistable claims nothing about other Things — it is this class. |
| `WaterChemistry` + payload merge `pH?`/`salinityPpt?` | `lib/supply/WaterChemistry.ts` (value object + declaration merge) | a payload field like hardness; claims nothing (optional). |
| `salinityPpt?`, `lining` | water `Watercourse` (`water:` seed; course field) + parser | data on the course row. |
| `pH?` arg + softness factor | `Material.acidAttack(pH?)`, `Bulkable.reconcileFaceExchange` | the shipped law widened; every glaze case unchanged when the payload carries no pH. |
| dysentery row; retags | content | — |
| `PipeRun` | new kernel `platform/thing/PipeRun` — `AssembledMixin(FacedMixin(DurableMixin(ThermalMixin(BulkableMixin(Good)))))` (assembly: D10 revised) | *a pipe is a durable thing in a room that holds water, has a face and a temperature.* Not a `plumbing:` key on `Place`/`Atmospheric` (needs Durable + Bulkable + Thermal state; `repair` requires a Durable Thing). `Good`, not `Thing`: it is somebody's chattel until fixed in place (fixedInPlace after `plumb`). ⚠ `FacedMixin`'s header says "not on `Thing`" for walls/floors — a pipe's INSIDE is a face in exactly the glaze sense (the law reads the inside face), and it composes on `Good` as the glazed pot does. |
| `reconcileEnvelope` piecing | `AtmosphericMixin` | a correctness fix in an existing method; no new field. |
| `Throttleable` shape, `canOpen` hook | `lib/spatial/Sealable.ts` | the hook defaults ok (total — nothing re-narrows); `Door` overrides with its lock; `Gate` with its lock. |
| `Gate` | new water `thing/Gate` — `PersistableMixin(LockableMixin(SealableMixin(ControlStructure)))` | *a controlled structure with a setting, a lock and a log.* Weirs/dams stay plain `ControlStructure` (a weir has no setting). `LockableMixin` on a Thing for the first time — it composes on `MixinConstructor` with no constraint and claims only *this thing has a lock*. Persistable: the log is the ledger. |
| `Aquifer` | new water `idea/Aquifer` — `PersistableMixin(Idea)`, rows in `/stuff/idea/Aquifer/` | a system's class, the realm's instances (the `Watercourse` rule). Persistable: the level is hidden state. Not `BodyRegister` (ground's; recharge-free by design; a document per draw). |
| `aquifer`, `bodyM3`, `drawnM3`, `bodyStamp`, `bottomM`, `linedToM`, lining bill, `PersistableMixin`, `AssembledMixin` | kernel `Well` | *every well has a finite standing and may be lined.* Persistable purpose named. `AssembledMixin` is total (a bare well is one piece); no guard. ⚠ Harbors touches `liftInto` — reconcile. |
| `ObservationWell`, `StaffGauge`, `test-kit`, `Discipline/hydrology`, three `Reading` rows + classes | water pack `thing/`, `idea/reading/`, content | pack-owned instruments; readings add a channel with no platform change. |
| `inlets`, `inletClockStamp`, `_inletPendingL`, `pondedL`, `settleInlets`, percolation, salt key | kernel `SoilMixin` | *any soil — pot, bed, field — takes water through inlets and can be over-full.* The requirement's "any soil" IS the host; no composer gains a guard (a pot's inlets are `[]`). Salt is installed by the host that installs reserves (`CharacteredSoilMixin`) and the pot's `installSoilReserves` twin. |
| `furrowStamp`, crust line | farming `Field` / `Tract` | the field's prepared state, the field's look. |
| `salt`, `flood` factors + profile numbers | kernel `GrowingMixin` + plant rows | the six-site template. |
| `drained` | kernel `PlantPot` | a pot's own fact; default `true`. |
| `tile` arg, `drainTiled` | `DitchController` view/controller; `ImprovableMixin` | the improvement's own durability. |
| `drain-tile` row + mould | `trade-ceramics` content | "made by the potter". |
| `'m³/s'`, `'L/s'`, miner's inch tag | kernel `lib/quantity.ts` | the catalog is kernel code (closed union). |
| `keys?` | `PositionData`; issuance in `ClockController` | employment data; the key is bearer. |
| calendar entries from the rota | `ClockController` + roster tick | writers of the ungated seam, the medicine precedent. |
| `Fill` prose | `FillController` | — |
| `conceals` field + `under`/`behind` rows | `Placement` row (platform pack) + the listing reader | a way of sitting that the listing honors; claims nothing about other placements. |
| `trade-plumbing` pack: `Discipline/plumbing`, joint rows (`wiped`, `caulked`), pipe-length rows, rows (lead-pot, sand-bed, pipe-mould, lead-sheet, lead-pipe, roof-cistern body row, the yard, the plumber) | `packages/content/trade-plumbing` (`/trade/plumbing`) | a trade = mechanism; the venue rows live with the locality (Terminus) and name the trade's rows. No `src/lib`, no Api, no helpers. |
| `irrigates` brain | `trade-farming/src/behavior/irrigates.ts` | the farmer's act (farming owns "how a field takes water"). |
| `rides` brain | water pack `src/behavior/rides.ts` | the institution's act (the water system owns gates and the rotation). |
| `dig well` | kernel `DigController` (`what = 'well'`) over `Diggable` on farming `Tract` (+ the holding yard's ground, `/world/terminus/hearts-delight/farmstead/location/yard`'s class) | the ground protocol; no new verb. |
| Rights documents | HD content `content/water-rights/…` (the `water-right` document kind's `contentDir`) | shipped as documents, filed by the pack. |
| `lint:water-posture`, `lint:toxin-keys` | `packages/server/scripts/` | gates. |

**Placements refused**, with the reason, so review does not re-open them:
`FreshnessMixin`-style capability on `Thing` (no); `GridPowered`-style
mixin for water on every `Thing` (no — only `WaterFixture`, `WaterStore`,
`PipeRun` read a premises, and each does it as its own method);
`plumbing:` as a fabric key (D10); a `WithdrawingMixin` (watershed.md
refused it; the gate stays a local edit to the catalogue's class table);
`CalendarMixin` on NPCs (the rota is their calendar); a Mongo collection for
logs or levels (none).

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** on every place row; `container:` is refused by `lint:instanceable`. New fixtures (pipe runs, cisterns, the fountain, gates, gauges, wells) are `props:` of their place; the plumber and the health officer are `cast:`.
- **Locations, not rooms.** The pump house is a `/platform/location/Locale` (not `PersistentLocation`: its furnishing is authored, its state is the conduit's own record — *persistence is the exception*). The Delight flats/ditch bank are `Street`/`Locale` rows. One new `PersistentLocation` only: the Delight ditch bank (D28 — *a cut in the bank is the ditch's own damage until the rider closes it*).
- **The five axes.** `/system/water` (the system — gates, aquifer, rights, readings, hydrology); `/stuff/idea/Aquifer/<key>` + `/stuff/idea/Watercourse/delight-ditch` (the commons: a realm's own instances); `/trade/plumbing` (the trade); `/trade/ceramics`, `/trade/smelting`, `/trade/smithing`, `/trade/coopering` gain rows; `/world/terminus/…` venues. `classFileOf` resolves each new class under its pack by longest prefix; `trade-plumbing` holds a root of its own.
- **Module scope declares; lifecycles initialize.** No module-scope statements beyond declarations; the two pack `dial()`/`catalogueOf()` module functions are the shipped water-pack idiom and are copied, not multiplied (`Gate`/`Aquifer` import the catalogue path and call `StuffApi.singleton` at use).
- **The import boundary.** Packs import the kernel by specifier only (`@saxonberg/server/mud/…`); `trade-plumbing` depends on `platform`, `base-library`, `generic-objects`, `@saxonberg/server`, `@saxonberg/types` (+ `trade-smelting` for the ingot/pig shapes if a class import is needed — else rows only). The water pack does **not** import the ground pack: the aquifer's level is its own (D13); the lone well reads `Deposit.waterTable` only through the zone's `lookupField` (a string/number read, no import). The farming pack imports the water pack **only if** a class is needed — the inlet reads its gate through the kernel `Throttleable` + a kernel `OpeningLog` shape (`openingTrajectory(from, to)`) declared in `lib/spatial/Sealable.ts`; no duck typing (`lint:imports`, the no-duck-typing rule).
- **No new module category, no free helper.** Every new file is a Stuff class, a mixin (none new in the kernel except shapes), a brain, a reading class, a controller, a value object (`WaterChemistry`), a lint script, or content. A would-be helper folds into the class (`Gate.openingTrajectory`, `WaterStore.reconcileFill`).
- **Verbs on objects.** `dig well`/`open`/`close`/`ditch`/`repair`/`fit`/`pump`/`fill`/`pour`/`measure`/`analyze` act on their targets' own methods; no `XApi.verb(host, …)`; `lint:object-verbs` stays 0.
- **Mixin authoritative, controller dumb.** `canOpen` on the Sealable; `Gate.setOpening` logs; `WaterFixture.supplyStateNow` decides; `PipeRun.reconcileThermal` bursts; controllers render refusals returned.
- **Affordances are class statics.** `WaterStore` (`peers`: fill/pour/drink already ride Bulkable), `Gate` (`peers`: `open`, `close`, `lock`, `unlock` views), `StaffGauge`/`ObservationWell`/weir (`measure`/`analyze` are flat verbs — nothing to afford), `Well` (`peers`: `pump`; `fit`), the yard's counter (shopkeeping's class), `PipeRun` (`peers`: `repair`). A row's `commandContributions:` is dead.
- **Boolean field forms.** `natural`/`continuous`/`drained`/`drainTiled` fields; `isNatural()`/`isContinuous()`/`isDrained()` getters; `setNatural(v)` setters.
- **`#` privacy.** None in `lib/`/`platform/` (mixin state through the proxy); caches `private _x`.
- **No new collection.** Levels, logs and ponds are fields on Persistable hosts or on the hosts' records; rights are documents of the shipped kind.
- **American English** in every new name, row and line of prose. Shipped identifiers (`litres`, `metres`, `programme`) are not renamed piecemeal; new identifiers use the shipped `…L`/`…M` suffix style and never spell a unit out.

Gates this build must pass: the whole family (`pnpm -C packages/server
lint:family`), with two new members (`lint:water-posture`, `lint:toxin-keys`)
that run by being in `package.json`.

---

## Waves

Stage A — the supply contract (kernel-led, W0–W3) · Stage B — plumbing
(W4–W5) · Stage C — the valley (W6–W9) · Stage D — the water trade's ends
(W10) · W11 — the drive, docs and slates. Every wave lands green on
`test:near` + the touched packs' vitest + `lint:family`, at one commit.

### W0 · The premises and the fixture — `build(water-supply W0): a premises cites its water, and a tap reads it or gives nothing`

Implements D1, D2, D3, D4, D7, D23, D24.

- Kernel: `lib/supply/SupplyState.ts` (`unplumbed`; `WaterSupply` shape; `SUPPLY_STATE_PRECEDENCE` = `unplumbed · cut · off · dry · frozen · fouled · overdrawn`); `lib/parcel/ParcelRecord.ts` (`waterSource` + get/set, inline validation: `none`, `''`, or an absolute template path); `platform/idea/ParcelRegistry.ts` (`waterOf`, `byWaterSource`, `citeWaterSource`, index maintenance); `api/parcel.ts` + `platform/idea/api/ParcelLogic.ts` statics; `platform/idea/api/PackLogic.ts` claim parse (both sites); `platform/thing/WaterFixture.ts` (D2, D4, D24 — `UnboundedSourceMixin` removed; `natural`, `continuous`; `resolvePremisesPath()`; async `ensureSupply()` on `settleBulk`; `outletElevationM()`; the augmenters say `unplumbed`/weak/below-head); `lib/supply/Powered.ts` untouched.
- Water pack: `Conduit.ts` (`extents[]`, implements `WaterSupply`: `supplyHeadM` = reach elevation, `drawL` returns all while delivering, `rankServedNow`); `StorageNode.ts` (implements `WaterSupply` minimally: head = `elevationM`, `drawL` level-capped — the schedule comes in W1).
- Lint: `scripts/check-water-posture.ts` + `package.json` `lint:water-posture`; a test beside `check-power-posture`'s.
- Content: `city-intake.yaml` `extents:` = the fourteen city districts; every Terminus district claim cites `waterSource: /world/terminus/wharfside/thing/city-intake`; Hinkley district claim cites the tank (`/world/terminus/hinkley-hills/thing/district-tank`), `lot-1` cites `none`; the Hinkley `plat-book.yaml` mints new lot claims with `waterSource: none` (verify the PlatBook mint path writes a `TitleClaim`; if it grants through `ParcelApi.grant`, add the field there); HD claims: the valley/farmsteads `none`, the dairy/creamery/brickfield their own stores or natural (W1 rows) — until W1 they cite `none` and read `unplumbed` honestly; Rejection `none` (its wells are not taps); the fourteen fixture rows: `natural: true` on the tannery leat, the brickfield pond, the campus-farm trough (fed by a spring — the prose rewritten: "a lead pipe" becomes a spring, or it reads the campus premises when W0's claims cite the intake — pick the premises), the goat trough (`suppliedBy` a rick is nonsense today: becomes `natural: true` on the Rejection spring); every other row reads its premises.
- Tests: `WaterFixture.test.ts` (premises resolution by row path and by persistence key; fail-closed before resolution; `unplumbed`; head weak/below; continuous demand), `ParcelRegistry` water tests, `SupplyState` precedence, `Conduit.extents`.
- Acceptance: a Seznick unit's bath tap and Duncan's corner tap run as before on a fresh world (AC 4); a lot-1 kitchen tap reads `unplumbed` (AC 3 first half); the market standpipe names its main; `lint:water-posture` 0; a tap on an unloaded main reports empty and names the main once it loads.

### W1 · Dividers, schedules, stores, the pump house and the seats — `build(water-supply W1): a tank fills on a schedule, a shortage is shared by rule, and the works are locked`

Implements D5, D6, D19, D25.

- Water pack: `StorageNode.ts` (`fillsFrom`, `fillRateM3S`, `schedule`, `drawM3S`, `levelStamp`, `shares`, `reconcileLevel`, `deliveryTrajectory(from, to)` derived from schedule ∩ source); `Conduit.ts` (`PersistableMixin` outermost; `demandM3S`, `schedule`, `shares`, `cutLog` ring → `deliveryTrajectory`; `rankServedNow(landUse)`; `Watercourse`-side demand now counts `demandM3S` + continuous outlets rather than capacity in `withdrawalM3S`).
- Kernel: `platform/thing/WaterStore.ts` (D5, D25; `peers` none needed — Bulkable affords `fill`/`pour`/`drink`); `lib/employment/Position.ts` `keys?`; `platform/idea/cmd/employment/ClockController.ts` issues keys on clock-on; `WaterFixture` reads `rankServedNow` from its supply and scales by `shares`.
- Content: generic `fixture/water-butt.yaml` and potash `rain-butt.yaml` → `class: /platform/thing/WaterStore`, `fillsFrom: rain`, `catchmentM2`, with their one-line persistence purpose; Terminus `wharfside/pump-house.yaml` (Locale; exits to the bank; a `Door` row `locked: true`, keyway `terminus-works`), the intake + pump move from `bank.yaml` props to the pump house; `market/thing/fountain.yaml` (`WaterFixture`, `continuous: true`, `demand 0.002`), propped in `square.yaml`; Terminus works department: positions `works-keeper` (`keys: [pump-house door]`) and `turncock` (`keys: [tank valve]`) on `/world/terminus/budget` (or a new `wharfside/idea/works-department.yaml` if the budget row is the treasury only — the plan prefers the existing department row; decide in-wave by reading `budget.yaml`), seats `works-keeper`/`turncock` added to `Government/terminus-city.yaml`; a `works-keeper` Cast at the pump house with `clock on` on the roster; Hinkley `district-tank.yaml` (`fillsFrom: city-intake`, `fillRateM3S 0.02`, `schedule` 05:00–07:00 daily, `drawM3S 0.004`, `shares: proportion`); `city-intake.yaml` `shares: priority`, `demandM3S 0.4`.
- Tests: `StorageNode.test.ts` (schedule integration across a gap, outage), `Conduit` priority/proportion ranking, `WaterStore.test.ts` (rain fill over a gap, pour-in, draw-down, persistence round trip), `ClockController` key issuance.
- Acceptance: the tank's level rises through a staged schedule window and falls at the district rate; with the intake staged short, the fountain and standpipe run and a Seznick tap fails (`overdrawn`), each saying why; a butt's level rises under a pinned rain (AC 9, 10, 11, 12, 22).

### W2 · Chemistry, the dose fix, the readings and the unit — `build(water-supply W2): water carries its chemistry, fouled water sickens, and only the kit can tell`

Implements D8, D9, D18, D22.

- Kernel: `lib/supply/WaterChemistry.ts`; `lib/location/WaterSource.ts` (`WaterDraw.pH?`, `salinityPpt?`); `lib/material/Material.ts` `acidAttack(pH?)`; `lib/bulk/Bulkable.ts` `reconcileFaceExchange` reads payload pH + softness; `lib/quantity.ts` (units + tag table); `platform/idea/cmd/bulk/FillController.ts` prose; `scripts/check-toxin-keys.ts` + `lint:toxin-keys`.
- Water pack: `Watercourse.ts` (`salinityPpt?` seed; parser); `WatercourseCatalogue.waterStateAt` (seed wins); `Conduit.readWaterChemistry`; `reading/water.yaml` (`handTool: water-test`) + `WaterReading.ts` (kit-gated fouling + lead lines; the lead line reads the target's payload `dissolvedToxins`); `thing/test-kit.yaml`; `Discipline/hydrology.yaml`; `reading/{flow,stage,water-table}.yaml` + `src/idea/reading/{Flow,Stage,WaterTable}Reading.ts`; `thing/StaffGauge.ts` + row; `thing/ObservationWell.ts` + row (reads an aquifer — the class lands here, its aquifer in W8; until then it reports *"nothing to read"* honestly).
- Content: the five retags; `Condition/metabolism/dysentery.yaml`; the test kit propped in the infirmary `ward.yaml` with a `health-officer` Cast + position on the infirmary business; `Government/terminus-city.yaml` seat `public-health`.
- Tests: chemistry blend; lead rate soft-acid vs hard-neutral; the toxin gate's fixture; `WaterReading` with and without the kit (a golden on the lines); the unit conversions and the miner's-inch tag.
- Acceptance: `lint:toxin-keys` 0; a body dosed from fouled water carries dysentery and `assess` finds it (AC 7); `analyze water` at a fouled reach prints no verdict bare and the verdict with the kit (AC 8); a lead run standing in soft acid water doses lead and `assess` finds the burden (AC 6, the law half; the pipe is W4).

### W3 · The envelope sees the night; the gate shape — `build(water-supply W3): an unwatched room remembers the frost, and a sealable can say no`

Implements D11, D12 (kernel half).

- Kernel: `lib/biome/Atmospheric.ts` `reconcileEnvelope` piecing (D11; a test that a room read at noon after a −10 °C night shows a minimum breakpoint below 273.15 K in its ring); `lib/spatial/Sealable.ts` (`Throttleable`, `OpeningLog` shape, `canOpen` hook); `platform/thing/Door.ts` `canOpen` with its lock; `platform/idea/cmd/boundary/{Open,Close}Controller.ts` (ask `canOpen`; honor `setting`); `open.yaml`/`close.yaml` optional `setting` arg (`type: text`, not required, no default).
- Tests: `Atmospheric` night test; `OpenController` refuses a locked chest/door and a setting on a plain door; a `Throttleable` fake takes a quarter; ⭐ **a parse test that `open the door with the key` does not bind `with the key` as a setting** (owner, 2026-11-02).
- ⚠ **Benchmark gate (owner, 2026-11-02):** `pnpm bench` before and after D11. If the cost is real, fall back to fine piecing only for rooms holding something that cares about freezing (a `PipeRun`, a `WaterStore`, a `Thermal` store) — the coarse single piece elsewhere.
- Acceptance: the two door-family wire tests and the chest/footlocker tests still pass; `lint:reconcile-chains` ceiling unchanged (the fix reads `WeatherApi`, no sampling token).

### W4 · The room pipe and the plumber's two acts — `build(water-supply W4): a room has water because a plumber brought a pipe into it`

Implements D10 (revised), D29, the `trade-plumbing` pack skeleton, the run as an assembly laid with `fit`, frost/burst/leak, the lead pipe's leach.

- Kernel: `platform/thing/PipeRun.ts` (D10; `reconcileThermal` reads the room's trajectory; `burst`/`leak`; `peers: [repair]`); `lib/ground/Floor.ts` `wetFromSpill(litres)` (the floor-wetness seam — read the weather's puddle write first and reuse its field; if none is a field on the floor, this is the one new floor field, `persistent + runtimeState`); `WaterFixture` asks its room for a sound `PipeRun` (`unplumbed` without one, EXCEPT `natural` fixtures and fixtures whose premises cites a `WaterStore` in the same room — a butt feeds the tap beside it with no pipe; a store elsewhere needs the pipe).
- Pack `packages/content/trade-plumbing` (the cordage skeleton): `pack.yaml` (`root: /trade/plumbing`, title to `/compact/trade`), `package.json`, `tsconfig.json`, `vitest.config.ts`; `content/trade/plumbing/idea/Discipline/plumbing.yaml`; the joint rows `idea/Joint/{wiped,caulked}.yaml` (dressed by `plumbing`; quality → weep rate and frost margin); the pipe-length rows (`thing/lead-pipe.yaml`; `iron-pipe.yaml` named by smelting's recipe — W5). **No controllers, no new verbs** (R7): the acts are assembly's `fit` / `repair` / `salvage`.
- Affordance: `fit` is afforded by the `PipeRun` itself (`AssembledMixin`'s shipped contribution — verify it lists `fit`; `peers: [repair]` as before). A pipe length is a plain part row (`Good`, `lengthM`, material) — no pack class is needed; if one is, it is `/trade/plumbing/thing/PipeLength` with no `commandContributions`.
- Content: Seznick `stuff/location/room/bathroom.yaml` props `+ /trade/plumbing/thing/lead-run` (a `PipeRun` row); Duncan `dormroom.yaml` props `+ iron-run`; Hinkley `lots/bathroom.yaml` + `lots/kitchen.yaml` props `lead-run`, and a kitchen `tap` row (`/platform/thing/WaterFixture`) propped in the kitchen; Hinkley `house-programme` leaf **`loft`** (a bedroom, `storey: 1`, `lead-run` + a basin tap — R3) and leaf `scullery` (`/stuff/location/room/scullery`, a new generic room row, unheated, `lead-run` propped) for drive 8; Seznick's unit programme bathroom rows carry the same.
- ⚠⚠ **Every room the W0 census found reading a main gets a run, not just the three named above.** The moment a fixture requires a sound `PipeRun` in its room, every bar, brewhouse, still-house, bathhouse, ward and dorm room in the delivered districts that holds a non-`natural` fixture goes `unplumbed` unless its room props a run. W4's content step is therefore **census-driven**: extend W0's fixture census test to list every room holding a supply-reading fixture, and prop `lead-run` or `iron-run` in each (the row's author decides the material; default `iron-run` for civic/commercial rooms, `lead-run` for the residential rows named above). A street outlet (the market standpipe, the fountain) is exempt — its run is under the street, and the outlet rule is "a fixture on a public street reads its supply directly". The census test fails the wave if any room is missed (AC 4).
- ⚠ `generic-objects` must then depend on `trade-plumbing` for the row path — refused (the commons does not depend on a trade). Instead `PipeRun` rows for pre-connected rooms are **kernel generic rows** `/stuff/thing/fixture/{lead-run,iron-run}` (`class: /platform/thing/PipeRun`, material lead/iron), in `generic-objects`; a plumber completes an empty run of the same class by `fit`ting pipe lengths (D10 revised). The trade owns the joints and the pipe LENGTHS; the run in a wall is a fixture any pack props.
- Tests: `PipeRun.test.ts` (an empty run delivers nothing; fitting the bill completes it; joint dressing by competence → weep/frost margin; a service run's completion cites the main and refuses where no main serves; freeze/burst lead vs iron per part through a trajectory; thaw leak writes the floor; leach into standing water by payload chemistry); a `Placement` test (`under`/`behind` hide from the listing, stay nameable; `put` accepts both words); a `WaterFixture` + room + run integration test.
- Acceptance: AC 3 (fitting the service run, then the kitchen run, gives a lot-1 kitchen water; outside a main's extents the service run's last fit refuses), AC 5 (scullery bursts, kitchen beside the range does not, leak on the floor, `repair` mends the part), AC 6 (lead in soft water through the run); a finished room's `look` lists no pipe and `survey` names it.

### W5 · The plumber's supply chain and the yard — `build(water-supply W5): the plumber casts lead on a sand bed, the founder casts iron, the potter makes tile, the smith a boiler, the cooper a cistern`

- `trade-plumbing` content: `thing/lead-pot.yaml` (a `Receptacle`/`Vat` row on the kettle precedent, Thermal; lead melts at the material's own melting point), `thing/sand-bed.yaml` (`/platform/thing/Mould`, sand medium per `flask.yaml`, `castTemplate: /trade/plumbing/thing/lead-sheet`, `discipline: plumbing`), `thing/pipe-mould.yaml` (`Mould`, mandrel per rubber's `tube-mould`, `castTemplate: /trade/plumbing/thing/lead-pipe`), `thing/lead-sheet.yaml`, `thing/lead-pipe.yaml` (`PipeLength`, 3 m), `thing/iron-pipe.yaml` (`PipeLength`, 3 m), `thing/roof-cistern.yaml` (`/platform/thing/WaterStore`, 600 L, `fillsFrom: ''` → the premises' main, set when the service run completes: `WaterStore.fillsFrom` is written at the service run's completion for every store on the premises whose `fillsFrom` is `''` and `followsMain: true`), `thing/cistern-body.yaml` (coopering's output: `Assembled` bill — `body` + `lining` of lead sheet; `fit lead-sheet to cistern-body` completes it into the `roof-cistern` row via the shipped assembly `completesTo` — verify the bill/complete seam in `assembly.md`; if assembly has no "completes into another row", the body row IS the cistern with `lined: false` until the sheet is fitted and `WaterStore` refuses to hold water unlined), `wiki/guide/plumbing.md`.
- Recipes: `trade-smelting/content/recipes/iron-pipe.yaml` (founding, output `/trade/plumbing/thing/iron-pipe`), `trade-ceramics/content/recipes/drain-tile.yaml` + `thing/drain-tile.yaml` + a `drain-tile-mould` row, `trade-smithing/content/recipes/range-boiler.yaml` + `thing/range-boiler.yaml` (a `WaterStore` behind the range with `heatedBy` → it is a Thermal store next to a burner; it warms by the shipped room heat exchange — no new mechanism; hot water is what `fill` from it gives), `trade-coopering/content/recipes/cistern-body.yaml`.
- Terminus content: `goods-yards/plumbers-yard.yaml` (Locale) + `plumbers-yard/{idea/outfit.yaml (Business: positions plumber, counter), agent/plumber.yaml (Cast, competence plumbing proficient), thing/counter.yaml (shopkeeping's counter class, stock lines: lead-pipe, lead-sheet, roof-cistern, drain-tile, lead pigs), thing/{lead-pot,sand-bed,pipe-mould,hearth}.yaml}`, a parcel line in `terminus/pack.yaml` (industrial, `feeder: terminus-main:bank`, `waterSource: city-intake`); the `plumber` Cast's counter sells.
- Tests: pack vitest — a pig melted and poured on the bed sets a sheet; the pipe mould sets a pipe; the counter lists the goods.
- Acceptance: drive 6's first half end to end by player verbs.

### W6 · Gates, the ditch, rights and the rota — `build(water-supply W6): a headgate opens the river into a ditch, a turnout opens the ditch onto a field, and the turns are posted`

Implements D12 (pack half), D14, D21 (the company and the rota), rights.

- Water pack: `thing/Gate.ts` (+ `peers: [open, close, lock, unlock]`; `reconcileScheduled`; `openingTrajectory`; `recordWork`); `WatercourseCatalogue.ts` (`diversions` in `worldScan` + `rowWork` for a Gate row — `opening`, `capacityM3S`, `divertsTo`; `flowAt` credits; seepage by `lining`; `WATERWORK_CLASSES` + `Gate`); `Watercourse.ts` `lining` + parser; `src/behavior/rides.ts`; `FlowReading` lists each upstream gate's accounted share (the catalogue's `accountedDiversionsAt(ref)`), so the weir's bracket minus the account is the discrepancy.
- Kernel: `ClockController` + the roster tick write rota calendar entries (D21); `platform/idea/cmd/employment/__tests__` extended.
- Content (HD): `Watercourse/delight-ditch.yaml` (`branchesFrom: delight:flats`, nodes `head` 178 m `works: [turnout-furtado]`, `bench` 176 m `works: [turnout-avila]`, `tail` 172 m, `mouth: {into: river, course: delight, node: mouth}`, `lining: earth`); `delight.yaml` node `flats` `works: + [headgate, weir, gauge]`; `hearts-delight/location/flats.yaml` (Street — the ditch bank at the headgate; exits to valley-gate and bench-lane; props headgate, weir, gauge) and `location/ditch-bank.yaml` (PersistentLocation — D28's named purpose; props the two turnouts; the bank answers `ditch` with a breach — D28); `thing/headgate.yaml` (Gate, `divertsTo: delight-ditch:head`, `capacityM3S 0.6`, keyway `ditch-company`), `thing/turnout-furtado.yaml` / `turnout-avila.yaml` (Gate, `divertsTo: ''`, `capacityM3S 0.12`, `turnOf`, keyways `ditch-junior` on Avila's), `thing/weir.yaml` (ControlStructure weir on `delight:flats+0.1`), `thing/staff-gauge.yaml`; `ditch-company/idea/company.yaml` (Business; positions `ditch-boss` (`keys: [headgate]`), `ditch-rider` (`keys: [headgate, turnout-avila, turnout-furtado]`), `irrigator` ×2 with Furtado/Avila rostered — their schedules ARE the turns: Furtado days 0–6 hours [4, 10], Avila days 1,3,5 hours [22, 4] — night turns), `agent/ditch-boss.yaml`, `agent/ditch-rider.yaml` (Cast; the rider `behaviors: [{brain: /system/water/behavior/rides}]`); `Government/hearts-delight.yaml` gains the board as an appointing committee note (text only — civics owns no new machinery); rights `content/water-rights/delight/flats/{furtado-1850,avila-1872}.yaml` (`rateM3S` in miner's inches: 40 and 25, `priorityDateS` senior/junior, `use: irrigation`, holders the two farms).
- Tests: `Gate.test.ts` (opening, lock refusal, log, schedule reconcile across a gap), catalogue tests (diversion credited at the ditch head and lost at the tail; lined vs earth; the river below reads the difference), `FlowReading` discrepancy, rights load from `contentDir`.
- Acceptance: AC 13 (first half: water flows to the ditch only while the headgate is open; a turnout passes only while open), AC 15 (a locked junior gate; an opened one shows at the weir), AC 16 (lined vs earth).

### W7 · The soil's water budget — `build(water-supply W7): soil takes water through inlets, ponds when over-full, drains or salts, and a crust shows`

Implements D15, D16, D17.

- Kernel: `lib/husbandry/Soil.ts` (inlets; `settleInlets`; `pondedL`; percolation + runoff + evaporation by method; salt mass balance; `soilSalinityDsm()`; `soilAcceptsPonding()`; nitrate leach rekeyed to percolated mm); `lib/husbandry/Growing.ts` (`salt`, `flood`; profile fields; the six sites); `platform/thing/Plant.ts` seams; `platform/thing/PlantPot.ts` `drained`; `platform/idea/cmd/bulk/WaterController.ts` (ponding instead of refusing where accepted; the pour's payload salinity reaches the soil); `lib/ground/Improvable.ts` `drainTiled`; `platform/idea/cmd/ground/DitchController.ts` + `ditch.yaml` `tile` arg; `lib/ground/Floor.ts` standing-water depth beside snow (`_standingWaterM`, derived from the ground's `pondedL / areaM2` at refresh — the soil host is the floor's place; verify the floor can reach its place's soil through `hostOf()`; if not, the tract's floor phrase reads the tract's `pondedL` through a kernel `Ponding` shape on the place).
- Farming pack: `CharacteredSoil.ts` (salt reserve; per-key install), `Tract.ts` (`installTractReserves` per-key; crust + standing-water lines; `Diggable` is W10), `Field.ts` (`furrowStamp`, crust line, `inlets` authorable), `PloughController` sets `furrowStamp`, `SoilSurveyReading.ts` (moisture + salinity lines, banded), `wheat.yaml`/`barley.yaml` salt numbers, plant rows `floodToleranceDays` where known.
- Content: a drive pot row `generic-objects/.../thing/fixture/glazed-pot.yaml` (`drained: false`).
- Tests: `Soil.test.ts` (inlet integration against a fake opening trajectory and flow; ponding; percolation by drainage; salt in/out; tiled stops the revert), `Growing.test.ts` (Maas–Hoffman wheat vs barley; flood days), `PlantPot` undrained waterlog, `SoilSurveyReading` golden lines, `DitchController` with tile.
- Acceptance: AC 17, 18 (both halves), drive 19's survey line, drive 25, 26, 27 arithmetic in unit tests.

### W8 · The aquifer — `build(water-supply W8): a well draws on water that can run low, and the observation well is how a commons sees it`

Implements D13.

- Water pack: `idea/Aquifer.ts` + a commons row shape; `ObservationWell` reads it (`WaterTableReading` lights up); `src/__tests__/Aquifer.test.ts` (recharge over a gap from pinned rain; draws; percolation credits; two wells share one level).
- Kernel: `Well.ts` (D13 fields; `PersistableMixin` outermost; lone body seed; `standingAvailableL`/`standingDepthM` from the body or the aquifer; `liftInto` records; `bottomM`); `lib/zone/SpatialZone.ts` `aquifer` fieldMeta (authorable, inherited); `lib/pump/Pumping.ts` `reconcileRunning` records a running pump's drawn volume to the source when the source `recordDraw`s (a `LiftSource` optional member? — no duck typing: `LiftSource` gains a required `recordDraw(litres, atS, by?)` with `Well`/`Wellhead` implementing it; `Wellhead` forwards to its body register as today); `WaterFixture` + a premises citing a `Well`: supplied only while `pumpFitted()?.isRunning()` (an electric pump on Avila's well) — a hand pump feeds a trough, never a tap.
- Drilling pack (D27): `Wellhead.ts` — the water strike in its depth read (`fluidAtDepth` consults the zone's aquifer / the point's lone body before the deposit's traps), draws recorded on the aquifer; a `Wellhead.test.ts` case (a bore through a cited aquifer strikes water; a deep bore lowers the shared level a shallow well reads). ⚠ Harbors edits `Wellhead.ts` (bail over any `LiftSource`) — whichever merges second reconciles.
- Content: `/stuff/idea/Aquifer/{rejection-till, delight-valley}.yaml` (in `world-seed`, beside the rivers); Rejection zone `aquifer:`; `village-well.yaml`/`deep-well.yaml` cite `rejection-till` (R9: the deep well's hillside zone sits 8 m above the yard so its 14 m reaches the same table); HD valley zone `aquifer: delight-valley`; `hearts-delight/thing/observation-well.yaml` propped at the flats.
- Tests above + `Well.test.ts` (lone body: pumped low, recovers with rain; aquifer: shared; the hand pump sucks air at 10.3 m while the body still stands at 12 m → the "bucket still reaches water" half asserts `standingAvailableL() > 0` and the suction refusal, R8).
- Acceptance: AC 19, 20.

### W9 · The valley's people and ground — `build(water-supply W9): Furtado farms the flats on senior water, Avila the bench on junior water and his own pump`

Implements D21 (brains + Cast + their ground), the drive's valley content.

- Farming pack: `src/behavior/irrigates.ts`; the farmstead ground answers inlets (`farmstead/tract/*.yaml` rows accept `inlets:`).
- Content (HD): `agent/furtado.yaml`, `agent/avila.yaml` (Cast, `extends` the student costume per the warden; `behaviors: [{brain: /trade/farming/behavior/irrigates, trigger: candidate, config: {turnout: <path>}}, farms…]`), `idea/furtado-farm.yaml` + `idea/avila-farm.yaml` (Businesses, `operatingLocations`), their tracts: `flats-field/location/furtado-flats.yaml` (`SingletonTract`, deep alluvium, `inlets: [{gate: turnout-furtado, method: flood}]`), `bench-field/location/avila-bench.yaml` (`inlets: [{gate: turnout-avila, method: furrow}]`, thin soil, poorer drainage), Avila's `thing/bench-well.yaml` (`Well`, aquifer `delight-valley`, a hand pump) and `thing/bench-cistern.yaml` (`PersistentWaterStore`, filled by hand-pumping; the bench field's inlet draws from it — Risks 11, owner-agreed middle option); `pack.yaml` claims the two farms (agricultural, `reach: delight:flats`? — `reach:` is not parsed by `PackLogic`; the rights are filed documents so riparian derivation is not needed; leave `reach:` unparsed and note it); `location/flats.yaml` exits; the parish's board text; Quist's `upper-bench` keeps "above the last ditch; no water" with `inlets: []`.
- Tests: `irrigates` brain unit test with a fake turn window; `Gate.reconcileScheduled` against the two rosters.
- Acceptance: AC 14 (reconcile + live), drive 17–21 content present.

### W10 · The water trade's two ends — `build(water-supply W10): dig a well where there is water, and carry a cask to a cistern` — ⚠ first to cut

Implements D20, the cask leg, Rejection's content.

- Kernel: `lib/ground/Hole.ts` (`HoleMixin`, D20's five rules; `ground.hoistFreeM`, `ground.hoistAloneM` dials; a `windlass` Tool row with `hoisting`); `platform/idea/cmd/ground/DigController.ts` — no change if `what` already reaches `planWork` (verify; else pass it); `Well.ts` composes `HoleMixin` (`AssembledMixin` total, bill `lining`; `linedToM`; strike/dry hole; `fit brick`).
- Farming pack: `Tract.ts` `planWork(by, tool, 'well')` / `completeWork` (`Diggable`; mints or deepens the `Well` prop of the tract; refuses on `wild`); the holding yard row's class (`/world/terminus/hearts-delight/farmstead/location/yard` — a `Locale`; give it the same through a small `YardGround` class? No: the farmstead's tracts are where a farmer digs; the yard is paved. `dig well` works on a **tract**.)
- Content: Rejection `thing/village-well.yaml` keeps its hand pump; `thing/town-cask.yaml`? — no: the cask-on-a-dray is the shipped haulage `cask` on a dray; `generic-objects` `vessel/cask.yaml` is pourable already. A bucket of bricks is `trade-ceramics`' brick row. Drive 15/16 content is HD's farmstead (sold in the drive by `title buy`).
- Tests: `Tract` dig-well (strike at the table; dry past the dial; unlined refusal), `Well` lining bill.
- Acceptance: AC 21, AC 22 (W1 did the store; here the drive's cask leg is wired and driven).

### W11 · The drive, the soak, the docs — `drive(water-supply): <what driving found>` + `docs(water-supply): subsystem docs + slate deltas`

- `packages/wire/tests/water-supply.dirty.wire.test.ts` (blocking: the 27 steps, instant/short/staged, no jump over a game day; `DIRTY_REASON` names what it consumes — a Hinkley lot, pipe, a cask, a farmstead) and `water-supply.soak.dirty.wire.test.ts` (S1–S6).
- Docs: `docs/subsystems/watershed.md` (the gate, the aquifer, the ditch, diversions credited, rights consumed, the seventh word), `pump.md` (the well's body), `soil.md` (inlets, ponding, salt, drainage), `husbandry.md` (the two factors, the pot), `construction.md` (storey height, the envelope's night), `energy.md` (the sibling citation), a new `docs/subsystems/water-supply.md` (the premises citation, the fixture contract, stores, dividers, the room pipe, plumbing) and `plumbing.md` under the trade, `metabolism.md` (the leaf rule + gate), `instrumentation.md` (the kit, hydrology), `employment.md` (`keys`, rota → calendar), `boundary.md` (`canOpen`, `Throttleable`), `CLAUDE.md` map lines (one-line pointers; the trade's verbs), `lint-family.md` (two gates). Slates: `running-water-slate`, `irrigation-slate` compacted; new seams filed (§ Deferred seams).

---

## Reachability wiring

Each new capability's five links — **verb · affordance · data · boot · arg
gate** — every one fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| a tap reads its premises | `fill`/`drink`/`wash` (shipped) | shipped `peers` | `waterSource` on the claim; `lint:water-posture` | lazy on `settleBulk`; the supply loads on use (`singleton`) | none new |
| priority/proportion | `analyze water` | — | `shares`, `demandM3S` on the divider row | the divider loads when a tap resolves it | — |
| the tank fills | — (schedule) | — | `fillsFrom`, `schedule`, `fillRateM3S`, `drawM3S` | the tank loads on use from a Hinkley tap; `reconcileLevel` on read | — |
| a butt fills from rain | `fill`/`pour`/`drink` | Bulkable's | `fillsFrom: rain`, `catchmentM2` | `reconcileFill` on read | — |
| pump house + key | `unlock`/`lock`/`switch` | Door's; ElectricPump's `switch` | the door row's keyway; `Position.keys` | the Cast keeper is on the roster; the key issues at `clock on` | `switch.yaml` `requires: SwitchableMixin` (unchanged) |
| the kit | `analyze water <x> with kit` | flat verb | `reading/water.yaml` `handTool: water-test`; the kit row `capabilities: [water-test]` | `ReadingCatalogue` warms rows by path (verify the infix covers `/system/water/idea/reading/`) | `lint:instrument-args` |
| flow / stage / table | `analyze flow <weir>`, `analyze stage <gauge>`, `analyze water-table <obswell>` | flat | three rows + classes | as above | `subjectRequires` on each row |
| dysentery + lead | `drink` | — | the row leaf = the tag; `lint:toxin-keys` | conditions warm by class | — |
| lay a run | shipped `fit` (+ `repair`/`salvage`) | `AssembledMixin`'s shipped contribution on `PipeRun` | the run's bill; the joint rows; empty runs propped where `plumbable: true` | rows only | `fit.yaml` `requires: AssembledMixin` ✓ |
| hidden plumbing | `look` / `survey` | — | `Placement/{under,behind}` with `conceals`; the survey plumbing line | `PlacementCatalogue` warms rows from any root | `lint:placement-words` (`put` gains both words) |
| `repair` the run | shipped | `PipeRun` `peers: [repair]` | run rows | — | `repair.yaml` `requires: DurableMixin` ✓ |
| gates | `open`/`close` + setting, `lock`/`unlock` | `Gate` `peers` | gate rows; the ditch course; `works:` lists; `lint:water-citations` is for shores, not works | the works load when the catalogue scans the ROW (`rowWork` for a Gate) and live when somebody stands at them | `open.yaml` `requires: SealableMixin` ✓ (Gate composes it) |
| the rota → calendar | `calendar` (shipped) | shipped | roster schedules | written at `clock on`/tick | — |
| inlets | — (integration) | — | `inlets:` on a field/tract row | `settleInlets` on read follows the gate ref outward | — |
| `ditch with tile` | `ditch` | shipped `environment` on ground | `tile` arg; `drain-tile` row | — | `requires: [StackableMixin]` + the row's class |
| `dig well` | `dig well` | the tract's `Diggable` | `aquifer:` on the zone | — | `dig.yaml` already parses `what` (verify) |
| `fit brick to well` | shipped `fit` | `Well` bill | brick row | — | `fit.yaml` `requires: AssembledMixin` ✓ (Well composes it, total) |
| the observation well | `analyze water-table` | flat | the row cites an aquifer | — | `subjectRequires: [ObservationWell]` |
| Furtado/Avila turns | `open`/`close` through the brain | — | rosters; `turnOf` on the turnout | reconcile needs no boot; the brain needs presence | — |
| the rider | `lock` through the brain | — | rights documents from `contentDir` | the Company loads with the flats | — |

---

## Acceptance-criteria coverage

| AC | wave(s) | proof |
|---|---|---|
| 1 no fixture runs from nowhere | W0, W1, W4 | `lint:water-posture` 0 + a fixture census test (every `WaterFixture` row is `natural`, `suppliedBy`, or on a claiming premises) + drive 1 |
| 2 cut/off/dry/frozen/overdrawn | W0, W1 | unit + drive 3, 4 |
| 3 dry until plumbed; outside = no main | W0, W4 | drive 5, 6; the service run's refusal test |
| 4 houses run on day one | W0, W4 | drive 1, 3 (Seznick tap); wire-suite regressions |
| 5 frost burst, leak, repair | W3, W4 | drive 8, 9 |
| 6 lead in soft water → burden | W2, W4 | drive 10 |
| 7 fouled water → ill | W2 | drive 11 |
| 8 kit-only fouling | W2 | drive 1, 11 |
| 9 head; priority | W0, W1 | drive 4, 7 (the Hinkley loft, R3) |
| 10 cistern between fills | W1, W5 | drive 7 |
| 11 rain butt | W1 | drive 12 |
| 12 intake locked; keeper can | W1 | drive 2, 3 |
| 13 both gates; calendar | W6 | drive 18, 19 |
| 14 NPC turns | W6, W9 | drive 20 (reconcile), soak S1 (brain) |
| 15 rider padlocks; weir discrepancy | W6, W9 | drive 21, 22 |
| 16 lined vs earth | W6 | drive 23 + unit |
| 17 salt | W7 | drive 24 + unit |
| 18 pot drowns; field ponds | W7 | drive 25, 26 |
| 19 lone/shared wells; pump before bucket | W8 | drive 14 + unit (R8 for the bucket) |
| 20 only the observation well reads the level | W8 | unit (no other reader; `analyze water` at a well says nothing of the level) |
| 21 dig a well; dry hole | W10 | drive 15 + unit |
| 22 cask → cistern → taps | W1, W10 | drive 16 |
| 23 a season's events on first visit | W1, W3, W4, W7, W8 | the reconcile-on-read tests across a gap on every host (tank, store, pipe, soil, aquifer) + soak S3/S5 |

Nothing unmapped.

---

## Test & gate strategy

- **Unit** (vitest, colocated): every reconcile across a gap (the arithmetic a season proves), every refusal, the lint fixtures, the reading goldens. Anything touching the wired runtime imports `test-bootstrap`.
- **Packs' own vitest**: water, trade-farming, trade-plumbing, trade-smelting/ceramics/smithing/coopering (content only — their suites still run), energy (ElectricPump untouched), residence (keyed-room premises).
- **Lints**: `pnpm -C packages/server lint:family` after every wave; the two new gates join by `package.json`.
- **`pnpm test`** at code-complete (the MR opens READY first) and at `/finalize` only.
- **The drive IS a wire file.** Blocking = instant + short + staged; no jump over a game day; the soak file carries S1–S6.

### Drive pace and staging (the 27 blocking steps)

| step | pace | staged by | staging tool |
|---|---|---|---|
| 1 fill + analyze (bare, kit) | instant | player | — |
| 2 pump house locked | instant | player | — |
| 3 keeper unlocks, switches | instant | staged | `apply`+`clock on` as keeper (player verbs) → the key issues |
| 4 main short, priority | staged | staged | founder `eval`: `intake.setDemandM3S(2.0)` (the district rate above capacity) |
| 5 buy a lot | instant | player | — |
| 6 cast, pipe; `fit` the service run, then the kitchen run | short | player | — (heating the pot is minutes) |
| 7 tank low; cistern carries | staged | staged | `eval`: `tank.setLevelM3(…)`; the loft tap reads weak and the ground floor runs (R3) |
| 8 frost night | short | player | `testharness weather pin frost --at hinkley`, `clock advance 10h` (under a day) |
| 9 iron cracks | staged | staged | `eval`: swap the run's material row; same frost |
| 10 soft acid water | staged | staged | `eval`: `intake.chemistryOverride({pH 6.3, hardnessDgh 2})` — ⚠ a tool this build OWES: a `WaterSupply` chemistry override seam, `@TestOnly`-marked |
| 11 outfall fouls; dysentery; recall; handle off | staged | player | `eval`: `outfall.setDischargeLoadPerSecond(6)`; then player verbs |
| 12 pinned rain, butt rises | short | player | `testharness weather pin rain`, `clock advance 6h` |
| 13 pump at the village well; deep well refusal | instant | player | — (bail guarded, R8) |
| 14 aquifer low | staged | staged | `eval`: `aquifer.setDrawnM3(…)` — a tool this build owes (`@TestOnly` setter) |
| 15 dig well, strike | short | player | — |
| 16 cask → cistern | short | player | — |
| 17 flow/stage/rights | instant | player | — |
| 18 calendar | instant | player | `apply` for `irrigator` + `clock on` |
| 19 open turnout; survey rises; close | short | player | `clock advance 6h` |
| 20 Furtado's turn | short | player | `clock advance` across his window; read the gate's log + his field |
| 21 dry year; rider locks; Avila pumps; table falls | staged | staged | `eval`: `headgate` reach flow — a river-flow override on the catalogue (`@TestOnly` `pinFlowAt(ref, m3s)`) — a tool this build owes; then `rider` seat by player verbs or the brain's `act` via `eval` |
| 22 cut the bank; weir discrepancy; the rider finds the breach | short | player | — (D28; the rider's round via the brain's `act` by `eval` if the valley has nobody present) |
| 23 earth vs lined | staged | staged | `eval`: `ditch.setLining('lined')` + two `analyze flow` reads |
| 24 salt crust; wheat vs barley; ditch + tile | staged | staged | `eval`: `tract.setSoilReserveFraction('salt', 0.8)` (the staging seam that exists) |
| 25 undrained pot | instant | player | — |
| 26 flood a field | staged | staged | `eval`: `tract.pond(…)` — owed `@TestOnly` |
| 27 overhead noon vs dawn | staged | staged | `testharness weather pin wind`, two `settleInlets` reads via `eval` |

**Tools this build owes** (all `@TestOnly`-marked, on the model, counted by
`lint:test-seams`): `WaterSupply.chemistryOverride`, `Aquifer.setDrawnM3`,
`WatercourseCatalogue.pinFlowAt`, `SoilMixin.pond(litres)`. Everything else
stages through existing setters by founder `eval`.

**Soak** (`water-supply.soak.dirty.wire.test.ts`): S1 (weeks: rider +
aquifer + recovery; twins 21, 14), S2 (years: salt; twin 24), S3 (weeks of
cold; twins 8, 9), S4 (months of lead; twin 10), S5 (a season of rain on a
butt and a cistern; twins 7, 12), S6 (a lone well through a dry season; twin
14). Bodies are logged out across every jump.

---

## Risks & opens

1. **Keyed holding rooms resolve their premises by persistence key** (D2). If `getPersistenceKey()` is null on a keyed room until first capture, the kitchen reads the district until then. W0's test covers a freshly minted lot; if it fails, the fallback is `HoldingWarren` writing the lot extent into each room's `premisesKey` at mint — a residence-pack change, still load-on-use.
2. **The sync soil walk meets the async watershed** (D15). The pending-volume pattern copies the rain edge's unresolved-never-advances rule; the risk is a field that is never read by an async path and so never settles. Every read path the drive uses (`survey`, `look`, the brain, `water`) is routed through an async `settleSoil()` first; a unit test asserts the stamp holds while unresolved.
3. **`WatercourseCatalogue` edits collide with harbors** (D14). Harbors adds `barWaterAt`/`stopOver`/`hailables`/tidal depth; this build edits `worldScan`, `rowWork`, `flowAt`, the parser. Different functions; a textual merge is expected to be clean. Whichever merges second runs both packs' suites.
4. **Fifteen fixture rows change behavior on the day.** A premises nobody authored reads `unplumbed` — which is AC 1 working, and also every bar in the realm going dry if a claim is missed. `lint:water-posture` + the fixture census test are the guard; the drive's first step is run in every district's archetype room (bathhouse, ward, bar, brewhouse, still-house) before the MR opens.
5. **`reconcileEnvelope` piecing** (D11) changes every room's thermal integration cost (≤ 48 pieces per gap) and paint edits the same file. Measure with `pnpm bench` before/after; the cap is the lever.
6. **`Well` becomes Persistable + Assembled** while harbors changes `liftInto`. The Rejection wells sit on `Locale` hosts; Persistable on the well itself is what makes their trough and body survive — purpose named. Reconcile the signature on merge.
7. **The `open`/`close` views gain an optional arg** on verbs every door and chest use. Optional, no default; `lint:arg-kinds` + the boundary wire tests guard it.
8. **`FacedMixin` on `PipeRun`** — its header warns against walls/floors on Thing; a pipe's inside is a glaze-shaped face. If `lint:envelope`/faces lints object, the leach integration moves to `PipeRun.reconcileThermal` reading `Material.getLeaches()` + `acidAttack(pH)` directly (the two public methods), without the face.
9. **Pack class names in `requires:`** — verify a view's `args[].requires` accepts a pack-registered class/mixin name (the federation says mixins are nameable; a CLASS may not be). Fallback: the controller narrows and the view says `requires: any` with a reason.
10. **The ReadingCatalogue warm** — verify it keys on `/idea/reading/` across every root so `/system/water/idea/reading/flow` warms (the `MaterialCatalogue` rule: never an allowlist of roots).
11. ✅ **Avila's "pumped well" — owner agreed 2026-11-02, the middle option:** Avila hand-pumps from his well (valley aquifer) into a `PersistentWaterStore` cistern on the bench, and the bench field takes it through an inlet (`gate` = the cistern's outlet, method `furrow`). The hand rung of the ladder: defection paid in labor, not energy — the observation well falls for a visible reason, and a shallow well on the same aquifer feels it. The `irrigates` brain pumps while his turnout is padlocked; under a jump the cistern's fill reconciles from the brain's posted pumping shifts (the R10 shape). A powered or wind pump stays on the irrigation slate (the machines-slate meeting).
12. **Paint merges first** (R3): W0's storey question rides paint's `structureOf`; if paint has not landed, the Hinkley loft half lands after merging master.

Stop and ask only for: a worktree hazard; `requires:` refusing a pack name
with no honest fallback; the keyed-premises resolution failing both ways.

---

## Deferred seams

Clean attach points, each leaving as a slate line, never a stub:

- **Every other hole and every bigger dig** — graves, pits and pit traps, trenches and footings, cellars and dugouts (a hole that buds a place), machines (steam shovel, dredge), blasting, the wand of digging as content, backfill, casing an aquifer. `HoleMixin` is the seam. → [digging-slate](../slates/builds/digging-slate.md) (written with this plan).
- **Construction proper** — *the owner, 2026-11-02: construction must sit on assembly, crafting and the material trades; a magic "do the job" verb is not lensworthy.* The pipe run (an element made of parts by a trade, laid with `fit`) and the `under`/`behind` placements (services in the fabric) are its first worked example. → construction-slate.
- **`break <padlock>`** — the lock's `lockTechnology` and a striking tool; the gate's log already records whoever opens it. → irrigation-slate (kept) / a locks slate.
- **The NPC plumber on a gig** — the `fulfill` shape over `fit` on a run. → freight-slate / contract.
- **Metered billing** (`drawL` × time as a payment leg, with power). → power-utility-slate.
- **Sewer/WC/septic** — the service run (a drain is the same object reversed), the `PipeRun` and the aquifer are the seams; the outfall is the sink. → sanitation-and-pollution-slate.
- **Bored elm pipe** (a `PipeLength` row of wood). → forestry-slate.
- **A powered pump on the bench** (wind or grid) feeding a cistern. → irrigation-slate (kept).
- **The cone of depression, subsidence** — `Aquifer.level` is the seam. → irrigation-slate (kept).
- **Sprinkler objects, drip** — `method: overhead` is the seam. → irrigation-slate (kept).
- **Flood crops** — `floodToleranceDays` is the seam. → farming-slate.
- **`reach:` on a title claim** — `PackLogic` does not parse it; riparian derivation finds nobody. → water-rights follow-up (one parse line + a test).
- **Durable cuts on the grid** — the `Conduit.cutLog` ring is the water twin; energy's stays in memory. → power-utility-slate.

---

## Critical files

Read first, in this order:

1. `docs/requirements/water-supply-requirements.md`
2. this plan's § Requirements disagreements and § Host placement
3. `packages/server/src/mud/platform/thing/WaterFixture.ts`, `lib/supply/SupplyState.ts`, `lib/supply/Powered.ts`
4. `packages/content/energy/src/lib/GridPowered.ts` (the premises resolution template), `packages/server/src/mud/platform/idea/ParcelRegistry.ts` (`powerOf`, `citeFeeder`), `lib/parcel/ParcelRecord.ts`, `platform/idea/api/PackLogic.ts` l.440–490 + l.3436–3450, `scripts/check-power-posture.ts`
5. `packages/content/water/src/thing/{Conduit,StorageNode,ControlStructure}.ts`, `src/idea/WatercourseCatalogue.ts` (`worldScan`, `rowWork`, `flowAt`, `waterStateAt`, the parser), `src/idea/Watercourse.ts`, `src/idea/WaterRightRegistry.ts`, `src/idea/reading/{Water,Depth}Reading.ts`, `content/water/pack.yaml`
6. `packages/content/residence/src/idea/HoldingWarren.ts` l.1–60, `packages/server/src/mud/lib/persistence/Persistable.ts` (`getPersistenceKey`)
7. `packages/server/src/mud/lib/husbandry/{Soil,Growing,Cultivable}.ts`, `platform/thing/{PlantPot,Plant}.ts`, `platform/idea/cmd/bulk/WaterController.ts`, `packages/content/trade-farming/src/{location/Tract.ts,thing/Field.ts,lib/CharacteredSoil.ts,idea/reading/SoilSurveyReading.ts,behavior/farms.ts}`, `packages/content/ground/src/idea/GroundCharacter.ts`, `lib/ground/{Improvable,Floor}.ts`, `platform/idea/cmd/ground/{DitchController,DigController}.ts`
8. `packages/server/src/mud/lib/spatial/Sealable.ts`, `lib/boundary/Lockable.ts`, `lib/lock/Lock.ts`, `platform/idea/cmd/boundary/OpenController.ts`, `platform/thing/Door.ts`
9. `packages/server/src/mud/lib/biome/Atmospheric.ts` (`reconcileEnvelope`), `lib/Trajectory.ts`, `api/weather.ts` l.200–265, `lib/material/{Durable,Faced,Material}.ts`, `lib/bulk/Bulkable.ts` (`reconcileFaceExchange`), `lib/cleanliness/WaterHardness.ts`
10. `packages/server/src/mud/platform/thing/Well.ts`, `lib/pump/{Pumpable,Pumping}.ts`, `packages/content/ground/src/idea/{BodyRegister,Deposit}.ts`, `packages/content/trade-drilling/src/thing/Wellhead.ts` (the finite-body pattern)
11. `packages/server/src/mud/lib/metabolism/Metabolic.ts` l.1200–1220, `content/platform/content/platform/idea/Condition/metabolism/lead.yaml`, `scripts/check-conditions.ts`
12. `packages/server/src/mud/lib/employment/Position.ts`, `platform/idea/cmd/employment/ClockController.ts`, `lib/calendar/Calendar.ts`, `api/government.ts`, `content/platform/content/platform/idea/Government/terminus-city.yaml`, `content/world-seed/content/stuff/idea/Government/hearts-delight.yaml`
13. `packages/content/trade-cordage/` (the pack skeleton), `trade-smelting/content/trade/smelting/thing/{ingot-mould,flask}.yaml`, `trade-rubber/.../tube-mould.yaml`, `trade-sugar/content/recipes/copper-kettle.yaml`, `trade-coopering/content/recipes/cask.yaml`
14. The venue rows named in § Grounding › Content
15. `packages/wire/tests/cover.dirty.wire.test.ts` (the blocking file shape, `founderEval`), `cover.soak.dirty.wire.test.ts`, `docs/testing.md § The soak lane`

---

## Drive record

*(appended at build time)* — the blocking drive's run log (the output, the
count, each failure), and the soak file's name for the lane:
`packages/wire/tests/water-supply.soak.dirty.wire.test.ts`.
