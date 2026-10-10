# Climate and weather — implementation plan

Executes [climate-and-water-requirements.md](../requirements/climate-and-water-requirements.md)
(**kind: platform · leads from: kernel**; first consumers the maple tap,
the biome chain, and the shipped cold mechanisms). The build replaces the
realm's two disagreeing climates (the sky's flat cosine over a 295 K
biome constant; the catchment's four-row seasonal table) with **one
expression in the kernel** derived from solar geometry at a resolved
`latitude`, damped per place, lapsed by elevation and offset per place;
derives season and hemisphere from the same geometry; decides
precipitation **phase** from the local temperature; lays **snow on
sky-exposed ground** as a stateless derivation over the same integral the
catchment banks; gives standing water and room-held vessels an ambient
freeze; grows **ice** on a still reach as a readable record; opens and
shuts two routes on snow and ice through the shipped `FordExit` seam;
gives the maple a freeze-thaw window; hardens the biome roster with a
resolve-gate and hands maritime a water-biome row; and authors the
places the drive stands in.

Branch `reqs/climate-and-water` (worktree `build-4`), current with
`origin/master` at `ba2c6bdb7`.

---

## Grounding

Verified by opening files this cycle (2026-10-09). Paths are under
`packages/server/src/mud/` unless they start with `packages/`.

### Temperature — the two climates and the third

- **The sky.** `platform/idea/api/WeatherLogic.ts:824-844`
  `solarTemperatureDeviationK(nowS)` — a pure function of TIME only (no
  latitude, no declination): `−10·cos(2π(doy − Y/4)/Y) − 4·cos(2π(sec −
  3 h)/day)` over dials `weather.solarAnnualSwingK` /
  `weather.solarDiurnalSwingK` (`lib/config/AppSettings.ts:1620,1625`),
  memoised in a single module slot `solarTempMemo` keyed on the game
  minute (:855). Folded in exactly ONE place: `deviatedFieldFor`
  (:1130-1151), for `temperature` only, added on top of the weather
  TYPE deviation whether or not a pin applies.
- **Who folds it.** `platform/idea/api/BiomeLogic.ts`:
  `resolveQuantityFor` (:1072-1120; the fold at :1101-1118) after three
  cheap gates — field-in-set → `WeatherApi.isActive()` →
  `skyExposedWalk(scope)` — then `await AddressApi.resolveLocalityFor`
  and `base.add(dev)` onto **whatever the chain answered**, authored or
  root. `outsideKFor` (:941-982) folds only when the answer came
  `fromSky` (universe root, or a `SkyExposed` biome row). The sync
  `airFor` (:591 → `liveDeviation` :1515-1538) folds it through the
  `weatherLocality()` memo; ⚠ `airSegmentsFor` (:604-662) adds only the
  type deviation and **has no solar term at all** — drying, maturation
  and evaporation integrate a different outdoor temperature than a live
  `feel` reads. The pressure precedent to mirror: `pressureTraceFor`
  (:904-925) replaces the chain's answer with `pressureFromElevation`
  **iff `trace.sourcePath === ROOT_BIOME_PATH`** (universe, `biome` or
  `biome-ancestor` that reached the root row).
- **The catchment.** `packages/content/water/src/idea/WatercourseCatalogue.ts:1298-1323`
  `airTemperatureK(season, type, elevationM) = seasonMeanK(season) +
  WEATHER_PROFILES[type].deviation.temperature − lapse·elevation`, with
  `seasonMeanK` reading four dials (`water.season.meanK.{spring 285,
  summer 295, fall 283, winter 272}`) and the lapse dial
  `water.snow.lapseRateKPerKm` 6.5. Public `airTemperatureKAt(ref, nowS)`
  (:503-519) takes the last `WeatherApi.segmentsBetween` segment over
  `climateOf(reach)`. `climateOf` (:1281-1287) resolves
  `reach.climateLocalityPath` — stamped at compile by
  `accumulateCatchments` (:1183-1205) as the **largest-contributing
  Locality**. `CompiledReach` (:123-156) carries `elevation` (the node's)
  and `climateLocalityPath`.
- **The biome.** `lib/biome/Biome.ts:151` `_defaultTemperature: {
  persistent, inherit: 'never', spoiler 1, marshaller K }`. Rows:
  `packages/content/base-library/content/stuff/idea/biome/universe.yaml`
  (295 K, the only sky-reachable constant), `outdoor/baseline.yaml`,
  `outdoor/meadow.yaml`, `packages/content/trade-forestry/.../outdoor/woodland.yaml`
  — ⭐ **none of the outdoor rows author a temperature**; every
  sky-exposed scope falls through to the ROOT's 295 K.
  `packages/content/rejection/.../underground/upper-workings.yaml`
  authors 285 K (plain `Biome`, not sky). `base-library/pack.yaml` boots
  the root by hand; `platform/idea/BiomeCatalogue.ts:91-108` warms the
  rest by the `/idea/biome/` infix and **swallows a per-row failure with
  `console.warn`**; `isBiomeClass` (:116-121) swallows a class-load
  failure silently. `lib/biome/__tests__/roster.test.ts:81-91` requires
  the root to author `_defaultTemperature`; :123-142 pins the exact file
  set under base-library's biome directory (a water row must NOT go
  there). No `lint:biome*` exists; `lint:envelope` (d) forbids
  `_defaultTemperature` under the `indoor/` path; `lint:census` (b)
  checks every `_biomePath` resolves to a row (existence only).
- **Celestial.** `platform/idea/api/CelestialLogic.ts:60`
  `CAMPUS_LATITUDE = 42`, passed at :161 `skyFactorNow`, :205
  `skyFactorDailyPeak`, :233 `isDayAt`, :244 `sunAltitude`, :257
  `sunAzimuth`, :283/:299 `nextSunrise/nextSunset`, :330/:344
  `moonAltitude/Azimuth`, :483 `daylightAt`, :497 `daylightFractionAt`;
  `platform/idea/WorldClockRegistry.ts:697` (the lamp-sunset system
  schedule); `lib/husbandry/Producing.ts:1018-1027` `daylightFraction()`;
  `packages/content/trade-fishing/src/idea/Waters.ts:97` (twilight bite).
  The pure geometry (`api/celestial.ts` → `CelestialLogic.ts:624-801`)
  is already latitude-general: `sunriseHourAngleDeg` returns
  `'polar-day' | 'polar-night'` (:714-725), `daylightSeconds` answers
  the whole rotation or zero (:741-750). `seasonFor(profile, t)`
  (:794-801) is day-of-year quarters with **no latitude**. `profileFor`
  (:106-131) throws on a second `CelestialProfile` (the tilt), and
  `lint:light-sources` (f) refuses any row authoring `celestialProfile`.
  The sky memos `skyFactorNow`/`skyFactorDailyPeak` are global instance
  memos keyed on minute/day.
- **Season readers.** `WeatherLogic.seasonAtSegment` (:140-153, memo
  `seasonCache` keyed by year-relative segment) → `pickWeighted`
  (:166-186) multiplies `SEASON_BIAS[season]` (`lib/weather/WeatherType.ts:333`)
  × `ClimateLean`; `walkSegments` (:455-503) stamps `season` on each
  `WeatherSegment`; the catchment's table; `FisheryRegistry.ts:175` →
  `Species.fitIn`/`Habitat.seasons` (three fishing rows gate on season
  names); `SkyReading.ts:70` prints `currentSeason(loc)`;
  `WeatherReading.ts:128` prints `sample.season`. Daylength readers that
  carry latitude implicitly: `Field.ts:458-469` (season edge),
  `Producing.ts:329-380` (photoperiod/weather openers),
  `BreedController.ts:86`.
- **Elevation.** `lib/zone/Zone.ts:68-72` `fieldMeta {name, wire,
  elevation: {persistent, authorable}}`, `protected elevation: number |
  null` (:149), `getElevation` reads its own value only; inheritance is
  `lookupField` (:202, **async**, no sync variant) →
  `lookupAncestorField` → `ZoneApi.getEnclosingZone`.
  `platform/idea/api/ZoneLogic.ts:141-157` `elevationFor(scope)` walks
  to the outermost container, `getZone()` (sync), then
  `lookupField('elevation')`. `lib/zone/SpatialZone.ts:44-61` declares
  `address · deposit · groundCharacter · celestialProfile ·
  suppressesMagic`; `lib/zone/__tests__/SpatialZone.authoredFields.test.ts`
  asserts both ends (every authored zone key declared; every
  `lookupField('name')` declared on a class a shipped row names) and
  that `address/deposit/groundCharacter` sit on `SpatialZone` not `Zone`.
  Only two zone rows author `elevation`: `/world/terminus` 35 m and
  `/world/terminus/hinkley-hills` 130 m; Rejection's zones inherit 35 m.
- **Locality.** `platform/idea/Locality.ts:127` `extends Idea` (not a
  Zone). `fieldMeta` (:253-265): `_address`, `_weatherPin`,
  `_climateLean` (⚠ neither marked `authorable`, but the moor row
  hydrates a pin fine), `_governmentKey`, `_reach`, `_catchmentKm2`,
  `_publicLighting` (+ three runtime lighting fields). **A Locality holds
  no zone reference and no zone holds a Locality reference**; the only
  bridge is `SpatialZone.address` → the registry's longest-prefix match.
  Rows live at `/platform/idea/Locality/*` (2) and
  `/stuff/idea/Locality/*` (12, `packages/content/world-seed/content/stuff/idea/Locality/`);
  `WatercourseCatalogue.ts:85` `LOCALITY_PATH_PREFIX = '/stuff/idea/Locality'`.
  No row authors `_climateLean`; only `moor.yaml` authors a pin
  (`{storm, alive}`); `moor/weeping-chamber.yaml` has a scope-tier
  `{rain, frozen}` pin.
- **The weather-locality memo.** `lib/biome/Atmospheric.ts:1482-1558`:
  `_weatherLocalityPath` / `_weatherLocalityResolved` /
  `_weatherLocalityPromise` / `_weatherLocalityGeneration`;
  `weatherLocality()` kicks the resolve and answers `null` once;
  `resetWeatherLocality()` on `ExitableVessel.onMoved`. Not persisted,
  no tri-state (documented as honest-cheap).

### Precipitation and snow

- `WeatherLogic.precipitationRateOf(type)` (:371-383) is type-only over
  `PRECIPITATION_RATES_MM_PER_HOUR` (`WeatherType.ts:204`: rain 0.3,
  storm 1.2, snow 0.25) with the `water.rate.*` dials.
  `integratePrecipitation` (:417-440) splits liquid/frozen by
  `WEATHER_PROFILES[seg.type].precipitation === 'snow'` — the grammar
  label, never a temperature. `walkSegments` keeps the window's tail
  under `PRECIPITATION_MAX_SEGMENTS` 120 (30 game-days). `computeSample`
  (:264-290) and `pinnedSample` (:559) take `precipitation` from the
  profile; `resolveWeatherFor` → `computeResolved` (:606-641) sets
  `precipitationHere`. `SEASON_BIAS` zeroes `snow` in summer.
- **Soil discards frozen.** `lib/husbandry/Soil.ts:569-635`
  `integrateRainfall`: stamps `rainClockStamp` (first touch at :575-578,
  does not advance while `_rainResolved` is false :586-589), reads
  `precipitationBetween(from, now, locality)` (:610-614) and at :615-617
  uses `fell.liquid` only (*"Snow banks at altitude and releases on melt
  — that is the watershed's integral, not the soil's"*). `fieldMeta`
  :281-293 (none authorable). `watershedScope()` is a `@hook` (:534-543).
- **The catchment snowpack.** `WatercourseCatalogue.snowpackOf`
  (:1392-1430): `segmentsBetween` over `water.snow.windowDays` 180,
  accumulate `precipitationRateOf('snow') × hours` on `snow`-labelled
  segments, degree-day melt `water.snow.meltMmPerKPerDay` 4 above
  `FREEZING_K` 273.15, melt credited to the 30-day flow window.
  Memoised by `naturalFlowOf` (:812-826) per `reach.ref` within the
  current weather segment. `computeNaturalFlow` (:1350-1382). `flowAt`
  (:454-491) returns `FlowReading {ref, m3s, naturalM3S, meltM3S,
  drawnM3S, snowpackMm, navigable}`; `navigable` is consumed only by
  `WaterReading.ts:145` prose.
- **The puddle.** `lib/bulk/Bulkable.ts:496-539` surface slot
  (`surfaceBulk`, `surfaceMaterial`, `surfacePayload`, amount/capacity);
  `WeatherLogic.maintainPuddle` (:930-956) fills on
  `precipitationHere === 'rain'` and evaporates otherwise, from the
  presence-gated `runBoundaryFanout` (:717-760). **No reconcile-on-read
  for surface bulk anywhere.** `platform/thing/Floor.ts:53-56` is
  `FloorMixin(BulkableMixin(PosturedMixin(SlottedMixin(AdornmentMixin(VisibleMixin(Thing))))))`
  — ⚠ **the floor is not `Thermal`**, so `reconcilePhase` cannot freeze a
  puddle (`reconcileBulkPhase` needs `isThermal`, `Thermal.ts:1222`).
- **The floor.** `lib/ground/Floor.ts`: `fieldMeta` :243-246 (`onGrade`,
  `worked`); `isOnGrade` :307 (authored, else
  `BiomeApi.isSkyExposed(host)` or `coords[2] < 0`); `getGroundKind`
  :482-506 over `GROUND_KIND_FOLD` (`lib/ground/GroundKind.ts:121-143`,
  inputs `materialClass · onGrade · worked · standingWater`, shared with
  `scripts/check-ground.ts`); `hasStandingWater` :514-518;
  `groundPhrase` :525-531 rendered by `floorAugmenter` (:223-228) via
  `static markupAugmenters` (:240); `getKeywords` :541-549 unions
  `ground`/`floor`. `lib/stuff/Location.ts:343-399` `ensureFloor`.
  `lint:ground` clauses (a)–(f) (`scripts/check-ground.ts:40-73,
  607-699`); a second augmenter stacks (augmenters union up the
  prototype chain, `api/mixin.ts:2112-2149`) and trips nothing.

### Freezing

- `lib/thermal/Thermal.ts:985` `if (MixinApi.isMeltable(self))
  this.reconcilePhase();` outside the reentry `try` (:979-984 comment:
  *"the Bulkable freeze/boil rung has its own callers (a CraftVessel
  drives it from its own reconcile)"* — ⚠ **stale**:
  `platform/thing/CraftVessel.ts:237-240` calls `absorbIntoIce()`, never
  `reconcilePhase`). `reconcilePhaseImpl` (:1214-1225) dispatches
  Meltable → `reconcileMelt`, else `Bulkable & Thermal` →
  `reconcileBulkPhase` (:1281-1382): plateau at `mp`, banks
  `(mp − T)·C` into `BulkPayload.latentRemovedJ` (:1319-1324), clamps
  contents to `mp`, solidifies at `mass × latentHeatOfFusion` by cloning
  the material's `castTemplate` into `v.getContainer()` (:1352), with
  the `ruinedByFreezing` edge (:1334-1342). Today's only ambient Bulkable
  freeze drivers: `lib/thermal/ClimateControl.ts:125-139` (contents pass,
  guarded `_climateDriving`) and two spell endpoints
  (`MagicLogic.ts:1025, :1533`). A second pass at `T == mp` banks
  nothing (`undershootJ = 0`), so widening :985 cannot double-bank; the
  cast mints after the slot is emptied synchronously, so it cannot mint
  twice.
- `packages/content/water/src/thing/Conduit.ts:407-410`: `frozen` iff
  `catalogue.airTemperatureKAt(this.reachRef, nowS) ≤ water.freezeK`
  (273.15) — **the INTAKE reach's catchment air; the delivered `extent`
  is never consulted** (`extent` is read only for the served-path test
  :293 and `resolveHead` :312-326 via `ZoneApi.resolveEnclosingZoneForPath`).
  All three Terminus conduits are props of the street
  `/world/terminus/wharfside/bank` (`packages/content/terminus/content/world/terminus/wharfside/bank.yaml:128-152`,
  `_address: terminus/city/wharfside`, `outdoor/baseline`): `city-intake`
  (reach `kestrel:confluence` 30 m, extent `/world/terminus`),
  `cold-fell-aqueduct` (reach `cold-fell:cascade` **1150 m**),
  `city-outfall`.
- `WatercourseCatalogue.waterStateAt` (:540-598) floors `temperatureK`
  at `UNDER_ICE_K = 274` (:1242) and derives `currentMps = m3s /
  (widthM × depthM)` with hydraulic geometry where the row is silent.
  ⚠ **`WaterState` is a CLOSED kernel vocabulary** —
  `platform/idea/species/Species.ts:316-332` `WATER_PARAMETERS`, *"adding
  a word here is a kernel MR"*, and it is the fish-tank vocabulary a
  species' tolerances read. `packages/content/water/src/thing/Shore.ts`
  memoises `{reach, standing, disciplineKey, atS}` per segment (:138-154)
  and renders `physicalRead` (:200-219: *"The water is still/slow/fast,
  …, cold/cool/warm"*) + the fishery's banded `readFor` (:181-197).
- **Ice elsewhere:** none. `/stuff/thing/ice-block` is water's
  `castTemplate`.

### Maple, stalls, openers

- `packages/content/trade-forestry/content/stuff/idea/species/.../acer/saccharum.yaml:46-61`
  `window: {kind: weather, daylightFrom 0.36, daylightTo 0.44, rising:
  true, minK 276, maxK 295}`; its header names freeze-thaw as *"the
  climate slate's first consumer"*. Birch (`betula/pendula.yaml:66-72`)
  `{weather, 0.40–0.50, rising, minK 278, maxK 300}`.
  `platform/idea/species/Species.ts:496-523` `TapWindowSpec` union
  (`always | event | photoperiod | biome | weather`).
  `lib/husbandry/Producing.ts:309-385` `tapWindow(key)`: the `weather`
  arm reads `daylightFraction()` (global latitude) and the HOST's own
  `getTemperature()` (a cached body temperature, not the air).
  `packages/content/trade-forestry/src/__tests__/sugaring.test.ts:191-203`
  asserts sap `minK > 273` and is written to FAIL when winter becomes
  real. A maple already stands in a tappable panel:
  `/world/terminus/rejection/hanging-wood/thing/sugarbush-panel`
  (maple-north/middle/south, `growthStage: mature`); the taps drive taps
  `birch-north` there (`packages/wire/tests/taps.dirty.wire.test.ts:100`).
- `stallBelowK: 273` on `trade-forestry/.../maturation/{birch-sap,maple-sap}.yaml:36`
  and `trade-quarrying/.../maturation/brine.yaml:35`; read in
  `lib/maturation/Maturing.ts` (:184/:1194/:1293) off the vessel's
  `Thermal` temperature.

### Traversability

- `lib/boundary/Exit.ts`: `canTraverse` → `TraversalGuard` (gate
  `'blocked'` first after the far-side gates), `applyTraversal` awaited
  by `Mobile.traverse`, `isConditional()` from the KIND row's
  `conditional: true`, projected to `StoredEdge.conditional`.
  `scripts/check-location-graph.ts:328-365` requires `conditional: true`
  on any kind row whose class source matches `/\bapplyTraversal\s*\(/`
  **and** `/\bblocked\b/` (a text match — the word in a comment counts).
  `platform/idea/LocationGraphRegistry.ts:571-625`: an authored
  `blocked: true` spec projects NO edge; the runtime bit never reaches
  the projection.
- `packages/content/transport/src/idea/FordExit.ts` (full text in the
  survey): `fieldMeta {...Exit.fieldMeta, _crossesReach,
  _floodThresholdM3S}`, `refreshCrossing(force)` memoised per weather
  segment, `applyTraversal` refreshes and returns `false`, `canTraverse`
  overrides the `'blocked'` prose, `private static flowSource()` resolves
  `/system/water/idea/WatercourseCatalogue` by SHAPE in a try/catch.
  ⚠ Its header claims `LaneCatalogue` calls `refreshCrossing` by shape;
  `LaneCatalogue.ts:486-497` records that it no longer does (closure is
  found at the leg by `applyTraversal`). Kind row: NOT under
  `/stuff/idea/exits` — the locality's own
  `packages/content/terminus/content/world/terminus/delight-road/exits/delight-ford.yaml`
  (`class: /system/transport/idea/FordExit`, `conditional: true`,
  `crossesReach: delight:mouth`, `floodThresholdM3S: 12`); used by
  `delight-road/ford.yaml:39` and `milestone.yaml:29`.
  `packages/content/rejection/.../kestrel-road/the-pass.yaml` authors
  inline `east`/`west` exits (`wheelPassable: false`, `edgeMinutes: 12`)
  and no `kind:`.

### Instrumentation and Disciplines

- `lib/instrument/Reading.ts:245-309`: a `Reading` row at
  `<root>/idea/reading/<channel>.yaml` with `class`, `channel`, `kind`,
  `scope`, `discipline`, `instrument`, `eyeCeiling`, `improves`,
  `stakes`; hooks `analyze(ctx, subject, band, handTool, param)` /
  `measure` / `benchRead` / `truth`. Warmed by
  `platform/idea/ReadingCatalogue.ts:100-137` (infix
  `/idea/reading/`). The platform's `analyze`/`measure` views are **one
  flat view each** with a `channel` positional
  (`packages/content/platform/content/platform/cmd/perception/{analyze,measure}.yaml`)
  — no stanzas. Platform readings include `temperature.yaml`
  (discipline `awareness`, instrument `thermometry`, class
  `platform/idea/reading/TemperatureReading.ts` banding prose by
  `CompetenceBand.atOrAbove`), `weather.yaml`, `sky.yaml`.
  `packages/content/water/content/system/water/idea/reading/water.yaml`
  (`discipline: chemistry`, `eyeCeiling: expert`) → `WaterReading.ts:63-151`
  ignores its `_band`, prints exact figures, never calls `waterStateAt`,
  and **credits nothing**. Credit is `giver.creditDeed({discipline,
  difficulty, outcome})` from the reading class (exemplar
  `trade-mining/src/idea/reading/StrikeReading.ts:81-108`).
  `CompetenceBand` (`lib/advancement/CompetenceBand.ts:22-36`):
  `untrained · novice · competent · proficient · expert`.
- Shipped Disciplines (rows `<root>/idea/Discipline/<key>.yaml`): there
  is **no** `hydrology`, `husbandry`, `surveying`, `weatherlore` or
  `agronomy`. Natural-science candidates: `physics` (platform — *"the
  head on a water course"*), `chemistry`, `awareness`, `geology`,
  `soil-science`, `fishing` (*"reading a water for what it holds"*, the
  Shore's band discipline via `water.fishery.readDiscipline`).
- ⚠ `lint:instanceable` invariant 12 (orphan `data:` keys) is **full at
  390/390** and the gate's own header says Reading rows are
  over-represented in it. A NEW Reading row risks tripping it; the
  existing `water` channel does not.

### The wire harness and the clock

- `packages/wire/src/harness/index.ts:11-30` is the whole import
  surface: `Session, expectOk, expectRefused, expectOkOr, expectNote,
  declareFile, installedPacks, isOwnedTestWorld, advanceWorldClock,
  worldClockNow`, … Attach (default, probes `/healthz`) vs own
  (`WIRE_BOOT=1`, `WIRE_PORT` per worktree, `SAXONBERG_TEST_WORLD=1`,
  `AUTH_MODE=test`, `FOUNDER_GOOGLE_EMAIL`). `Session.open(handle, {
  startLocation, wizard })` dresses the actor in the student outfit
  (`backend/TestHooks.ts:297,345-371`), provisions no food. `goto <path>`
  is the in-run teleport. `s.cmd()` returns the envelope; `s.query(mql)`
  reads state; `.dirty.` files export `DIRTY_REASON`.
- Clock: `advanceWorldClock('1 day')` → `POST /auth/test-clock` →
  `TestHooks.advanceClock` → `WorldClockApi.advance` (`@TestOnly`,
  drains schedules). ⚠ **Big jumps saturate the world** (taps:610-650,
  butchery-slate:297-334, carcass-chain caps at one day): plan on
  **one-day steps, a handful at most**. ⚠ **No runtime weather-pin seam
  reaches the wire**: `WeatherApi._forceTypeForTesting` is
  `assertTestOnly` (stack-frame gated, useless over a socket) and no
  test route writes a pin — determinism comes from **authored pins on
  content rows**. `refusedFor` idioms are blind to `command-rejected` /
  `validator-failed`; assert a typed note AND a state change.
- `WorldClockApi.advance` at `WorldClockRegistry.ts:458-505`; bodies
  drop any gap over `THERMAL_DEFAULTS.MAX_REASONABLE_GAP_SEC` = 4 h
  (`Thermal.ts:85`, `ThermalRegulation.ts:299`) — a clock jump never
  chills a body; only real-time standing does.

### Lethality (the invariant the content must respect)

`THERMAL_DEFAULTS` (`Thermal.ts:83-266`): setpoint 310 K, band ±8 K,
`CLO_TO_KELVIN` 8, shivering covers at most 20 K, lethal dwell 3 h below
`survivableMin` 301 K (`lib/vitals/Vitals.ts:235`). A naked fed body is
held down to an effective 282 K and dies below ~281 K (≈ 21 h at 273 K,
≈ 16 h at 268 K); **1 clo holds to 274 K**, 2 clo to 266 K. Wind chill
0.6 K per m/s (a storm's 12 m/s ≈ −7 K); a soaked body in 281 K air
feels ≈ 255 K. The student outfit is under 1 clo.

### Test churn (sized)

With the derivation kept behind the shipped `WeatherApi.isActive()`
gate, **zero** shipped assertions pin an absolute outdoor Kelvin that
changes (survey: 65 files with Kelvin assertions; 7 files assert deltas
against a same-clock baseline; ~33 pin indoor/authored/synthetic values).
Three change if the derivation runs with weather inactive
(`BiomeLogic.weather-deviation.test.ts:115`,
`Thermal.weather-coupling.test.ts:173,209`). Season-label tests
(`CelestialApi.test.ts:51`, `geometry.test.ts:92`, `SkyReading.test.ts:100`,
`weather.coherence.test.ts:74-91`, `FisheryRegistry.test.ts:47`) stay
green if the default latitude keeps the northern sign. The water pack's
`Flow.test.ts:227-300` and `FisheryRegistry.test.ts:207` are tied to
`seasonMeanK` and are re-derived in W4. `sugaring.test.ts:191-203` is
re-pointed in W9.

### Review additions (2026-10-10)

- **A pin forces the whole walk, history included.**
  `WeatherLogic.walkSegments` :486-496 reads `locality.getWeatherPin()`
  once and stamps `pin.type` on every segment of the window — so under
  a `{snow, frozen}` pin every segment ever walked is snow. A fixed-
  window stateless sum is therefore a sliding constant at a permanently
  pinned site (D15).
- **`dry` reads no temperature.** `trade-cooking`'s `DryController` and
  `DryingRack` have no cold branch; the 273 K stalls are the
  `evaporative` maturation profiles (`brine`, `maple-sap`, `birch-sap`),
  read by `lib/maturation/Maturing.ts:300-318` (`stallReason`: `'stalled'`
  iff `host.getTemperature() < stallBelowK`, on a `Thermal` host) and
  rendered by `maturationAugmenter` (:323-350) from
  `lib/maturation/MaturationProfile.ts:33-45`
  (`evaporative.stalled = 'It sits frozen over. Nothing is leaving it.'`).
  `trade-quarrying/.../thing/salt-pan.yaml` is a `/platform/thing/Vat`
  (`interiorBulk`, capacity 40, `closure: open`, matured by TAG);
  `brine-hearth.yaml` is an `Oven` the pan goes in. `cmd/bulk/pour.yaml`
  is *source* then `into` *target* with `mustHaveBulkSlot`. Rows author
  `interiorMaterial` + `interiorAmount` today (`trade-brewing/.../jar-of-barm.yaml:13`,
  `rejection/.../sugarbush-panel.yaml:35`) although `interiorAmount` is
  `runtimeState` in `Bulkable.fieldMeta` (:534).
- **Arrival.** `config/char-gen.yaml:79-82` outfit (student shirt ·
  trousers · canvas shoes), worn by `Character.wearGarments` at embody
  and by `backend/TestHooks.ts:345-371 #dress`. The dorm:
  `eternal-university/.../duncan-hall/location/dormroom.yaml` (`props:`
  mana lamp · `/platform/thing/sandbox/wardrobe` — **the holodeck door,
  not a clothes press** · bed · desk · footlocker · tap · watering can ·
  a starter pot `on: desk`), seeded once per unit by `DormWarren.admit
  → seedBornWith`; `thing/footlocker.yaml` ("Empty") backed by
  `eternal-university/src/duncan-hall/thing/Footlocker.ts` (`extends
  Vessel`, `fieldMeta {}`). `generic-objects/.../stuff/thing/fixture/wardrobe.yaml`
  is a `Chest` sold at the general store, not born-with.
- **Garments and `clo`.** `generic-objects/.../clothes/{tweed-jacket
  (wool, woven, 1.1 kg, torso), field-jacket (linen, 1.4 kg),
  white-coat (linen), hood (wool, head), student-*}`; no coat row.
  `lib/slot/Wearable.ts:386-430` `getClo()`: `t = mass/(ρ·A_covered)`,
  `k_eff = k_fibre·(1−loft) + k_void·loft`, `clo = t/k_eff/0.155`; loft
  is the fabric form's (`base-library/.../stuff/idea/fabric/{woven,knit,felted}.yaml`,
  `trade-textiles/.../fabric/{sackcloth,fine-woven}.yaml`); wool
  `density 1310`, `thermalConductivity 0.04`. `biped.yaml:35-40`
  covering slots `head · torso · legs · feet · hands` (capacity 4 —
  layering). `Attired.bodyInsulation()` (`lib/slot/Attired.ts:640`)
  weights per part by surface share; `Thermal.cold.gym.test.ts:129-133`
  SUPPLIES clo (0 / 0.6 / 1.0 / 2.0 — "outfit + wool coat") rather than
  deriving it.

### Lint state (ratchets that are full)

`lint:lib-statics` **341/341** (any new public static on an exported
non-`Api` class outside a mixin factory fails; `private static` and
`@internal` do not count). `lint:instanceable` invariant 12 **390/390**
(every authored `data:` key must be declared in the effective class's
`fieldMeta`). `lint:closed-vocabularies` 5/5 (a new exported
string-literal array checked by `includes`/`throw` in kernel source
trips it; a TS union does not). `lint:unconsumed-seams` 18/18 (a new
`fieldMeta` key on a `platform/idea/**` data Idea must be read by some
other file). `lint:reconcile-chains` 0 (a `reconcile*` method sampling
`getTemperature(` over an `elapsed` gap without a trajectory fails).
The roster: `pnpm -C packages/server lint:family --list` (72 gates).

---

## Plan-level decisions

Numbered to the brief's fourteen engineering questions, then the ones
the grounding forced.

### D1 — What AC 3 preserves and what AC 1 changes (the requirements tension)

**The tension.** AC 3 says *every existing reader is unchanged at the
default (42)*; AC 1 says the sky and the catchment give the **same
answer**. Today, at 42° and sea level, the sky's annual mean is 295 K
(floor 276 K) and the catchment's is 283.75 K (winter 272 K). They
cannot both survive unification unchanged.

**The resolution.** AC 3 governs **readers of latitude** — the celestial
geometry (`isDay`, sun altitude, sunrise, daylength, the sky factor, the
lamp schedule, the photoperiod openers): an unauthored place resolves
`42` and every one of those answers is byte-identical. AC 1 governs the
**temperature numbers**, and they change at the default **by design**:
the catchment's table was the honest one (a 42° sea-level winter is near
freezing; the sky's 295 K mean was 17 °C in January), so the unified
expression is calibrated to reproduce the **catchment's** means at the
default site and the sky's numbers move to meet it. The default world's
sea-level climate becomes, at `latitude 42 · elevation 0 · continentality
0.5 · offset 0`: annual mean ≈ 284 K, winter mean ≈ 273 K, summer mean
≈ 295 K, the coldest clear-sky dawn ≈ 268 K. These are **calibration
pins** in W0's test, not dials to re-tune later.

⚠ **Surfaced, not absorbed** (see Risks R1): this makes the default
realm's winter nights cold enough that a naked body outdoors dies in
~16 h and a storm-wind makes a 1-clo body hypothermic. The requirements'
lethality invariant is about **drive paths**, which this plan protects
(clock jumps never chill a body; the drive's cold stands are momentary);
the metabolic/thermal rebalance stays a non-goal. The user should price
the default-world winter.

### D2 — The one expression: shape, home, memo, how water reads it

**Home.** The expression lives on **`WeatherLogic`** (`platform/idea/api/WeatherLogic.ts`,
the stateless logic singleton behind `WeatherApi`), beside
`solarTemperatureDeviationK` which it **replaces**. No new Api, no new
logic singleton, no free helper: weather already owns the precipitation
integral, the segment walk and the solar term, and the requirements
place the expression in *"kernel (weather/celestial)"*. The value shape
lives in the weather vocabulary file.

**The site.** `lib/weather/WeatherType.ts` gains

```ts
export interface ClimateSite {
  latitudeDeg: number;      // signed; negative = southern hemisphere
  elevationM: number;
  continentality: number;   // 0 = maritime … 1 = continental
  offsetK: number;          // the anomaly no local term derives
}
export const DEFAULT_CLIMATE_SITE: ClimateSite = {
  latitudeDeg: 42, elevationM: 0, continentality: 0.5, offsetK: 0,
};
```

(a `const`, pure value construction — module-scope legal). `42` is the
one place `CAMPUS_LATITUDE`'s value survives; `CelestialLogic.ts:60`
keeps the constant for the celestial defaults (D3) and its comment says
it is now a DEFAULT, not the realm.

**The expression** (every term's owner stated; lag and damping are
SEPARABLE — a short land memory sets the lag, a continentality-driven
pull toward the annual mean sets the amplitude):

```
Q(φ, d)   = (1/π) · ( H0·sinφ·sinδ(d) + cosφ·cosδ(d)·sin H0 )
            — daily top-of-atmosphere insolation; H0 = sunrise hour angle in
              radians (0 in polar night, π in polar day), δ = declination;
              both from CelestialApi's pure geometry (sunriseHourAngleDeg,
              declinationDeg). Q(0, equinox) = 1/π.
T_eq(φ, d) = T_pole + (T_equator − T_pole) · π·Q(φ, d)
            — the instantaneous equilibrium; dials climate.poleMeanK (245),
              climate.equatorMeanK (301). Polar night ⇒ T_pole.
L(φ, c, d) = Σ_k w_k·T_eq(φ, d − k) / Σ_k w_k,  w_k = e^(−k/τ(c)), k = 0 … 4τ
            — the LAG: an exponential memory of the equilibrium over the
              preceding days (Δ = 1 day). Exact for the polar-night
              non-sinusoid (it is a weighted sum, not a harmonic fit).
τ(c)       = τ_cont + (τ_mar − τ_cont)·(1 − c)
            — climate.tauContinentalDays (30) … climate.tauMaritimeDays (55):
              lag = arctan(ωτ)/ω ≈ 28 d inland, ≈ 44 d on a coast.
M(φ)       = (1/360) Σ_d T_eq(φ, d)           — the annual mean at this latitude
m(c)       = climate.maritimeMixing (0.6) · (1 − c)
            — the DAMPING: how strongly the place is pulled to its annual mean.
T_season(φ, c, d) = (1 − m(c))·L(φ, c, d) + m(c)·M(φ)
T_here(t)  = T_season(φ, c, doy(t))
             − Γ · elevationM                      (Γ = water.snow.lapseRateKPerKm, 6.5)
             + offsetK
             − A_day · cos(2π(secOfDay − 3 h)/day)  (A_day = weather.solarDiurnalSwingK, 4 — unchanged)
             + WEATHER_PROFILES[type].deviation.temperature   (unchanged)
```

Computed at plan time with the starting dials above (the scratch script
is not shipped; W0's test is): the default site `{42, c 0.5, 0 m, 0}`
gives annual mean 286.3 K, winter-quarter mean 274.0, summer-quarter
298.6, minimum 272.5 on day 306 (**36 days after the solstice**),
coldest clear dawn 268.5; `{42, c 1}` range 42.9 K with its coldest
window centred 27 d after the solstice, `{42, c 0}` range 14.1 K centred
45 d after (**+18 d**); `{60, c 1}` 55.5 K vs `{60, c 0}` 18.2 K (ratio
3.0); the equator 1.8 K; the pole's coldest quarter 252 K; `{71, c 0.7,
50 m}` reads 255 K on day 0. The annual and summer figures sit at the
top of their pins; the build tunes `poleMeanK`/`equatorMeanK` by a
kelvin inside them.

**Calibration pins** (W0's test, the authority over the starting dial
values): at the default site, annual mean ∈ [282, 286], winter-quarter
mean ∈ [270, 275], summer-quarter mean ∈ [292, 298]; **the coldest
30-day window at the default site falls 20–45 days after the winter
solstice; a `continentality 0` site's coldest window falls no more than
20 days later than a `continentality 1` site's at the same latitude**;
monotone colder with |latitude| averaged over a year; equatorial annual
range < 6 K; a `continentality 1` place at 60° has an annual range ≥ 2×
a `continentality 0` place at the same latitude (AC 17); the pole's
coldest quarter is below 262 K; `T_here` is continuous in `t`.
⚠ Polar summers run warm (no ice-albedo feedback) — an accepted
abstraction, stated in the doc.

**Surface** (`WeatherApi` → `WeatherLogic`, all sync, all pure):

```ts
temperatureAt(site: ClimateSite, locality: Locality | null, timeS): Quantity<'K'>   // T_here incl. type deviation + pin
seasonAt(site, timeS): Season                                                       // D3
dailyRangeAt(site, locality, dayStartS): { minK, maxK }                              // D10 — 24 hourly samples
snowCoverAt(site, locality, nowS, opts?): SnowCover                                  // D6
```

**Memo.** Two module-scope `Map`s replacing `solarTempMemo`: `M(φ)`
keyed on `round(φ·2)` (≤ 361 entries), and `L` keyed on `(round(φ·2),
round(c·10), dayIndex)` (bounded: ≤ 361 × 11 × 360; evicted by a
generation counter per year). `T_season` is then two lookups and a
blend; per read the cost is that plus the diurnal cosine.

**How water reads it.** `CompiledReach` gains `site: ClimateSite`
(latitude/continentality/offset from the climate-proxy Locality's
*place*, elevation the node's own — see D-L), resolved at compile inside
the already-async `accumulateCatchments`, the P0 cold-path discipline.
`airTemperatureKAt(ref, nowS)` becomes
`WeatherApi.temperatureAt(reach.site, climateOf(reach), nowS)`. The water
pack imports `@saxonberg/server/mud/api/weather` and
`@saxonberg/server/mud/lib/weather/WeatherType` by package specifier,
both already on the server `exports` map. **The four-row seasonal table
and its four `water.season.meanK.*` dials are deleted** (climate-slate
open question 8: the table dies).

### D3 — Season and hemisphere from the same geometry

`CelestialApi.seasonFor(profile, t, latitudeDeg = CAMPUS_LATITUDE)`:
season = the shipped day-of-year quarter for `latitudeDeg ≥ 0`, shifted
by half a year for `latitudeDeg < 0` (day 0 is the northern vernal
equinox; the southern autumnal). The hemisphere is the SIGN of the
latitude; the swing is already declination × latitude in D2.
`CelestialLogic.currentSeason(location)` resolves the location's latitude
(D-S). Every reader re-sources onto **the site in hand**:

- `WeatherLogic.seasonAtSegment(seg, hemisphere)` — the memo is re-keyed
  `(hemisphere, year-relative segment)`; `typeForSegment`, `computeSample`,
  `walkSegments`, `pinnedSample`, `baselineSample` take a `site` (default
  `DEFAULT_CLIMATE_SITE`, i.e. northern — byte-identical for every caller
  that passes none). `SEASON_BIAS` is untouched; it now biases by the
  LOCAL season, so a southern place snows in July. The grammar is
  parameterised by the caller's site, and the Locality knows nothing — a
  Locality is assumed not to straddle the equator (documented).
- The catchment's table is gone (D2); `snowpackOf`'s per-segment
  temperature comes from the reach's site.
- `Field.ts:458-469`, `Producing.ts:1018` `daylightFraction()`,
  `BreedController.ts:86`, `Waters.ts:97`: read daylength at the host's
  site latitude (D-S); unauthored places keep 42.
- `FisheryRegistry.ts:175` passes the reach's site latitude; the three
  fishing rows' `seasons:` gates mean the local season.
- `SkyReading` prints `currentSeason(loc)`; `WeatherReading` prints the
  sample's season, which now carries the site's.

### D4 — Biome coupling: the derived temperature IS the chain's answer under the sky

Mirror `pressureTraceFor`. In `BiomeLogic`, temperature for a
**sky-exposed** scope (`skyExposedWalk` true, `WeatherApi.isActive()`
true — the same two gates as today) resolves as:

- run the chain; if `trace.sourcePath === ROOT_BIOME_PATH` (the universe
  row, reached directly or through a sky biome's `extends:` chain), the
  answer is **`WeatherApi.temperatureAt(site, locality, now)`** — the
  root constant is replaced, source `'climate'`, `sourcePath` the zone
  that supplied the latitude (or `'(default)'`);
- if an author said a temperature anywhere in the chain (detail, room,
  a biome row, a zone `atmosphere.temperature`), it wins and gets **only
  the weather TYPE deviation** — no solar term — because an authored
  sky-exposed temperature is an author overriding the climate, and the
  honest tool for "this place is warm for its latitude" is the zone's
  `climateOffsetK`. No shipped row is in this case.

Applied identically in the three paths that fold temperature today —
`resolveQuantityFor` (the live read), `outsideKFor` (the envelope's
outside), and the sync `liveDeviation`/`airSegmentsFor` pair — so the
`airSegmentsFor` inconsistency (no solar term; drying never saw winter)
is closed by construction. The **universe root keeps a mandatory
`_defaultTemperature`** (step 6 still throws without it): it is now the
temperature of a place that is *neither under the sky nor authored* (an
unbiomed interior, `Offstage`), and its row comment says so. `lint:biome`
(D11) forbids a `SkyExposedBiome` row from authoring `_defaultTemperature`
— *outdoor biomes stop authoring a flat base* becomes a gate rather than
a habit. The indoor chain is untouched: an enclosed scope drifts toward
`outsideKFor`, which is now the derived sky.

`AtmosphericTrace.source` gains the word `'climate'`; `trace atmosphere`
prints *derived from the climate at <zone> (lat …, …)*.

### D5 — Precipitation phase per place; intensity per Locality

- **Phase.** `walkSegments` / `integratePrecipitation` /
  `WeatherLogic.segmentsBetween` take an optional `site`. With a site,
  each segment's phase is `temperatureAt(site, locality, segMidS) ≤
  climate.snowThresholdK` (dial, 274.5) ⇒ frozen, else liquid —
  **regardless of the grammar label**; `WeatherSegment` gains
  `phase: 'none' | 'rain' | 'snow'` beside the label. With no site the
  shipped descriptor split stands (the kernel rains correctly with no
  climate authored, and every existing caller is byte-identical).
  `resolveWeatherFor(scope)` resolves the scope's site and re-derives
  `precipitationHere` from the phase, so `analyze weather`, the puddle
  push and the wetness fan-out all agree: a `snow` segment at 290 K
  rains, a `rain` segment at 268 K snows. `SEASON_BIAS`'s snow weighting
  stays — it now only shapes which *type* word the grammar picks, which
  still drives cloud form and the type's own deviation.
- **Intensity.** `Locality._precipitationIntensity: number | null`
  (`fieldMeta {persistent, authorable}`, `getPrecipitationIntensity()`),
  multiplied into the millimetres inside `integratePrecipitation`'s
  callback (the locality is in scope there; `precipitationRateOf` stays
  type-only). `null` ⇒ the **light latitude default**:
  `1` for `|φ| ≤ climate.precipDryAboveDeg` (55), falling linearly to
  `climate.precipPolarFactor` (0.4) at 80° — stated as grain. The
  annual-total climate pin (`Precipitation.test.ts`) is re-asserted at
  the default site (unchanged there: factor 1).

### D6 — Snow on the ground: a stateless derivation on the floor, sharing the catchment's function

⚠ **A deliberate deviation from the requirements' stated mechanism
(persisted stamps + reconcile-on-read), surfaced to the user.** Snow on
the ground is changed by **nothing a player does** in this build (no
shovel, no verb), so it is a pure function of the weather history at a
site — exactly what the catchment's `snowpackOf` already is. The kernel
therefore gets ONE function, `WeatherLogic.snowCoverAt(site, locality,
nowS, {meltWindowS})` → `{ packMm (water-equivalent), meltMm (over the
melt window), depthM (packMm × climate.snowDensityRatio 10 / 1000),
perennial, coveredS }`, walking `segmentsBetween` **back to the last
melt-out** (D15 — not a fixed window) with the D5 phase and the D2
temperature per segment and the `water.snow.meltMmPerKPerDay` degree-day
melt — the catchment's algorithm lifted, re-sourced to the site, and
re-anchored on the melt-out. The water pack's `snowpackOf` is
**deleted** and `computeNaturalFlow` calls the kernel's. AC 9 (the two
snow truths never visibly disagree) holds by **identity of function**,
and AC 8's *correct after an unobserved absence* holds trivially.
`lint:reconcile-chains` is not engaged (no `reconcile*`, no stamp).

**Host.** `FloorMixin` (`lib/ground/Floor.ts`) — the floor is the kernel
surface-overlay concern (the puddle precedent; `ground.md` names snow a
floor concern). Not a new mixin: `platform/thing/Floor` is the only
composer and a capability one class composes is a method on that class.
New surface on `FloorMixin`:

```ts
getSnowDepthM(): number           // 0 when not on grade or not sky-exposed
getSnowBand(): SnowBand           // 'none' | 'dusting' | 'ankle-deep' | 'knee-deep' | 'deep'
isFrozenOver(): boolean           // D7 — the puddle's derived frozen read
```

memoised per weather segment on the instance (transient fields
`_snowSegment`, `_snowDepthM`, the `FordExit` idiom) and keyed through
the host room's `climateSite()`/`weatherLocality()` memos (D-S);
unresolved ⇒ `0` with the memo NOT written, so the next read retries.
Gate: `isOnGrade()` and `BiomeApi.isSkyExposed(host)` — a state of the
floor's place, not a re-narrowing of the host set.

**Presentation.** A second `markupAugmenter` on `FloorMixin`
(`snowAugmenter`, stacking with `floorAugmenter`) appends one sentence
from an exhaustive `Record<SnowBand, string>`: *"A dusting of snow lies
over it."* · *"Snow lies ankle-deep."* · *"Snow lies knee-deep; walking
is work."* · *"Snow lies deep here, and whatever is under it is under
it."* At `knee-deep` and above the material sentence (`groundPhrase`) is
**replaced** by the snow sentence (masking only when deep, as the
requirements leave to the plan). The derived ground KIND is untouched
(the ten words stay closed; `GROUND_KIND_FOLD` gains no input). Band
thresholds are dials (`climate.snow.bandM.{dusting 0.02, ankle 0.15,
knee 0.5}`). The depth figure surfaces on the platform's `weather`
Reading (`analyze weather`): banded prose below `competent`, metres at
`proficient`+, and a *"the last thirty days brought N mm"* line from the
integral (the wet/arid read for AC 16).

**Deferred seam.** When a shovel or a trail ever moves snow, a persisted
`snowRemovedMm` + stamp subtracts from the derivation — the attach point
is `getSnowDepthM()`; it leaves as part of the locomotion-on-snow slate.
Meltwater does not credit the room's soil (soil keeps discarding
`frozen`; the catchment keeps the hydrology) — noted in soil.md.

### D7 — Freezing: vessels through the phase engine; the puddle as a read; the main agrees with the street

- **Vessels.** `Thermal.ts:985` widens to `if (isMeltable(self) ||
  (isBulkable(self) && isThermal(self))) this.reconcilePhase();`, with
  the stale comment rewritten. The plateau/latent machinery is already
  the mirror of the melt; a second pass at `T == mp` banks nothing. A
  jug of water carried into a 268 K street now plateaus at 273.15, banks
  its latent heat over its own `τ`, and solidifies into an
  `/stuff/thing/ice-block` placed in the vessel's container — the
  shipped freezer behaviour, now ambient-driven. Thaw is the shipped
  Meltable melt (the block pools into the floor's surface slot, not back
  into the jug — asymmetry accepted, already on `thermal-slate`).
- **The puddle.** The floor is not `Thermal` and must not become one for
  this (a floor is a fixture with no thermal mass of its own to drift).
  `FloorMixin.isFrozenOver()` = `hasStandingWater() &&
  temperatureAt(site, now) ≤ water.freezeK` — a **read**, and the
  augmenter says *"a skin of ice lies on the water"*. Electricity's
  puddle conduction is unchanged (ice on top of water still bridges) —
  noted.
- **The main.** `Conduit` reads **both ends**: `frozen` iff the intake
  reach's temperature **or** the delivered extent's site temperature
  (the extent's zone, resolved beside `headM` in `resolveHead` as
  `extentSite`) is at or below `water.freezeK`. A line is frozen if any
  part of it is. For `city-intake` the two ends are 30 m and 35 m on the
  same Locality: the main and the Wharfside bank agree to the
  hundredth of a kelvin (AC 10, drive 10). For the Cold Fell aqueduct the
  intake at 1150 m freezes first, which is true of an aqueduct.

### D8 — Ice on a reach: its own record, Stefan growth, snow-on-ice quality, read through `analyze water`

⚠ **Not a `WaterState` field** — that vocabulary is closed in the kernel
(`WATER_PARAMETERS`) and it is the fish-tank parameter set a species'
tolerances read; ice is not a tank parameter. The requirements' *"sibling
to snowpack and current"* is honoured by shape: `snowpackMm` lives on
`FlowReading`, not `WaterState`, and ice gets its own record beside it.

`WatercourseCatalogue.iceAt(ref, nowS): Promise<IceRecord | null>`,
`IceRecord { thicknessM, quality: 'none' | 'black' | 'snow-ice', rotting:
boolean, bearsKg: number, reason: 'running' | 'warm' | null }` (a TS
union, no runtime array — `lint:closed-vocabularies`). Memoised per reach
per weather segment in a sibling slot to `flowCache` (same clearing
rule).

- **Still-water gate.** `currentMps` (from `waterStateAt`'s geometry) ≥
  `climate.ice.stillWaterMps` (0.1) ⇒ `{thicknessM 0, quality 'none',
  reason 'running'}` — running water does not freeze over here (the
  thin-place-over-the-current is the ice trade's).
- **Growth.** Over the same segment walk back to the last **open
  water** (D15), with `T = temperatureAt(reach.site, …)` per segment:
  freezing degree-days accumulate `FDD += (273.15 − T)·days` while
  `T < 273.15`; thawing degree-days melt back `thickness −=
  climate.ice.meltMPerKd (0.005) · (T − 273.15)·days`; thickness is
  Stefan's `α·√FDD_sinceLastOpen` with `α = climate.ice.growthClear
  (0.027 m/√(K·d))` for a snow-free sheet and `climate.ice.growthUnderSnow
  (0.017)` while the kernel's `snowCoverAt(reach.site, …)` reports snow
  lying that segment — the third reader of the `frozen` integral,
  consistent by shared inputs. A sheet that never opened inside the
  walk-back bound is reported `perennial` at the cap (D15).
- **Quality.** `black` when < 30 % of the FDD accrued under snow cover,
  else `snow-ice`; `rotting` when the last 5 days' thawing degree-days
  exceed `climate.ice.rotTddK` (10).
- **Bearing.** Gold's formula `bearsKg = climate.ice.bearingKgPerM2 ·
  thicknessM²` (dial, 2.5e4 — ≈ 60 kg at 5 cm, 160 kg at 8 cm, 250 kg
  at 10 cm, 1000 kg at 20 cm) — a derived read the exit (D9) and the
  reading use.
- **Reading.** The existing `water` channel (`WaterReading.analyze`),
  no new Reading row (invariant 12 is full). Bare on a Shore or pointed
  at one, the reading gains an ice line **banded on `physics`** via
  `actor.competenceBandFor('physics')`: `untrained`/`novice` → *"ice lies
  on the water"* / *"the water is open"*; `competent` → adds *"it looks
  solid enough to walk on"* or *"it would not bear you"*; `proficient`+
  → thickness in centimetres, *black ice* / *snow-ice* / *rotten*, and
  what it bears (a person · a horse · a team). It credits
  `giver.creditDeed({ discipline: 'physics', difficulty: thickness-banded,
  outcome: 'success' })` when ice is present and the band is
  `competent`+ (the mining `StrikeReading` idiom). The row's
  `discipline: chemistry` is unchanged for the water-quality half.
  `Shore.physicalRead` gains the unbanded sentence (*"Ice lies on it
  from bank to bank."* / *"It is open water."*) from an `ice` field added
  to `ShoreMemo`.
- **Discipline chosen: `physics`** — Stefan's law and bearing are
  physics; `physics`'s description already claims the head on a water
  course; it is the existing natural-science Discipline the requirements
  asked for. (`fishing` stays the Shore's fishery band; `awareness` stays
  the temperature band.)

### D9 — Traversability: two transport classes, kind rows in the content that owns the ground

Classes in `packages/content/transport/src/idea/` (the `FordExit`
precedent — the mechanism is transport's), each copying FordExit's
shape: `fieldMeta {...Exit.fieldMeta, …}`, a per-segment memo,
`applyTraversal` refresh-and-fall-through, a `canTraverse` prose
override, `private static` resolvers only (lib-statics is full), and
`conditional: true` on every kind row (the by-shape lint).

- **`SnowboundExit`** — fields `_closesAboveM` (authorable; default
  0.5). Reads the SOURCE room's floor **by shape**: `source.getFloor?.()`
  → `floor.getSnowDepthM?.()`; blocked iff depth > threshold. Refusal:
  *"The way is under snow — deeper than your knee and drifted higher
  against the rocks. Nothing is getting through until it goes."* No pack
  dependency at all (the floor is kernel).
- **`IceCrossingExit`** — fields `_crossesReach`, `_bearsMarginKg`
  (default 0). Reads the water catalogue by shape (`iceAt`). Blocked
  unless `ice.bearsKg ≥ moverMassKg + margin`, where the mover's mass is
  `mover.getMass()` when Tangible, else 80 kg. Refusals name the water:
  *"The water is open; there is no crossing here until it freezes."* /
  *"The ice is there, but it is thin and grey and it would not bear
  you."* / *"The ice is rotten — honeycombed and dark."* With no water
  pack installed the crossing is always blocked (a crossing with no
  water behind it is a wall, the inverse of the ford's degrade — stated).
- **Kind rows** in the content pack that owns the place (the
  `delight-ford` precedent): `world-seed`'s `/world/north/exits/snowbound-pass`
  and `/world/north/exits/ice-crossing`, `/world/moor/exits/mere-crossing`
  (W10). The pass at Rejection stays as authored this build (its weather
  is procgen and the drive cannot walk to its winter — R6).
- The closure is **physical only** (AC 19): nothing here touches comms,
  teleport or the peer graph; the drive asserts `tell`/`who` work from
  behind the shut pass.

### D10 — Maple: a `freeze-thaw` window kind

`TapWindowSpec` gains

```ts
| { kind: 'freeze-thaw'; freezeK?: number;           // default 273.15
    daylightFrom?: number; daylightTo?: number; rising?: boolean }
```

Open iff the host's AIR crossed `freezeK` both ways over the last game
day: `WeatherApi.dailyRangeAt(site, locality, dayStart)` gives
`{minK, maxK}` from 24 hourly samples of D2's expression (not the
host's cached body temperature — a tree's xylem follows the air), with
`minK < freezeK < maxK`; the optional daylength band and `rising` behave
as in `weather`. Reasons: `cold` (never thawed), `warm` (never froze).
The host's site comes from its air scope (`ThermalMixin.airScopeOf` →
the room's `climateSite()` memo).

**The maple row** re-points to `{kind: freeze-thaw}` with **no daylength
band** — stated as grain: the freeze-thaw IS the sugaring season (a warm
spell in November runs a maple too, and the sugar build may tighten it
with the band the kind still accepts). The header comment is rewritten.
Birch keeps `weather`. `sugaring.test.ts:191-203` is replaced by a test
that the maple opens on a day whose range straddles 273 and closes on a
day that does not.

### D11 — The resolve-gate: `lint:biome` + a loud catalogue

New gate `packages/server/scripts/check-biome.ts` wired as
`lint:biome` (the family picks it up by name):

- (a) every `_biomePath` cited by any row across every pack resolves to
  a row whose **class extends `Biome`** (not merely exists — census (b)
  stops at existence);
- (b) every biome row's `extends:` chain terminates at
  `/stuff/idea/biome/universe` with no cycle and no missing link;
- (c) the root authors all six mandatory `_default*` fields;
- (d) no row whose class extends `SkyExposedBiome` authors
  `_defaultTemperature` (D4);
- (e) every biome row's class loads (the `isBiomeClass` silent-skip,
  made loud).

`BiomeCatalogue.warm()` returns `{stood, failed: string[]}`; a failure
logs at `console.error` AND files a `DiagnosticApi` entry naming the row;
the platform boot line prints the failed count; a wire drive asserts
`failed.length === 0` through `errors` (the author diagnostics verb).

### D12 — The water-biome stub

`packages/content/water/content/stuff/idea/biome/water.yaml`
(`FolderZone`) + `water/open.yaml` (`class: /platform/idea/SkyExposedBiome`,
`extends: /stuff/idea/biome/universe`, `name: open-water`,
`_defaultAtmosphere: water`, `_defaultHumidity: 100 %`). The water pack
ships it because "what a water is made of atmospherically" is the water
system's; a `/stuff` row from a non-platform pack is the `woodland`
precedent. **Not** under base-library (its roster test pins the file
set). Nothing cites it; `lint:biome` (a) checks citations, not
citedness. A one-line pointer in biome.md and
`maritime-space-requirements.md`'s collision table is the hand-off.

### D13 — Test content, the lit polar place, the lethality guard, the drive

See W10 and W11. The places (all `world-seed`, beside the Weeping Moor
demonstrator, reachable by `goto`/`startLocation` with no inbound exit
— the moor precedent):

| place | zone (`latitude · continentality · elevation`) | Locality (`_address`, pin, lean, intensity) | what it proves |
|---|---|---|---|
| **the north station** `/world/north/station` + `shore` + `far-bank` | `/world/north` 71 · 0.7 · 50 | `north`, pin `{clear, frozen}` | genuinely cold northern place (255 K on day 0); thick black ice on `blackmere` (a crossing already open); a lit street (brazier + `publicLighting`) |
| **the snowfield** `/world/north/snowfield/{camp, pass, beyond}` | `/world/north/snowfield` 71 · 0.7 · 60 | `north/snowfield`, pin `{snow, frozen}`, intensity 0.3 | deep snow lying (a few metres since the autumn — constant, by D15 exact); the snowbound pass shut; the wet cold peak |
| **the plateau** `/world/north/plateau/{flat, pass}` | `/world/north/plateau` 71 · 0.9 · 900 | `north/plateau`, pin `{snow, frozen}`, intensity 0.004 | the dry cold plateau near bare (a dusting); its pass open |
| **the Circle** `/world/circle/{camp, shore, far-bank, pass, beyond}` + `/world/circle/bare/{shore, far-bank}` | `/world/circle` −66 · 1.0 · 900 · offsetK −7 (D16) | `circle`, pin `{snow, frozen}`, intensity 1.5; `circle/bare`, pin `{clear, frozen}` | **the growing stands**: snow deepens day on day and the Circle pass shuts live (`closesAboveM: 0.2`); `circlemere`'s snow-ice thickens day on day beside `clearmere`'s black ice; the ice crossing refuses on day 0 and bears from day 1; the frozen salt pan (D17); lit by a brazier |
| **the south station** `/world/south/station` | `/world/south` −89 · 0.3 · 20 | `south`, pin `{clear, frozen}` | opposite hemisphere; polar night from day ≥ 3; lit by a brazier (never pitch dark) |
| **the wet coast / the dry basin** `/world/pair/{wet,arid}` | `/world/pair/wet` 42 · 0.1 · 10; `/world/pair/arid` 42 · 0.9 · 400 | `pair/wet` lean `{rain 3, storm 2, clear 0.3}` intensity 2; `pair/arid` lean `{rain 0.1, storm 0.1, clear 3}` intensity 0.3 | AC 16 at a warm latitude; AC 17 (the Seattle/Minneapolis case, same latitude, different continentality) |
| **the high sugarbush** `/world/terminus/rejection/kestrel-road/upper-climb` prop `high-sugarbush` (a maple-only `Panel`) | `kestrel-road` zone gains `elevation: 1500`; `rejection` zone `elevation: 450` | (Rejection's) | the maple opens on freeze-thaw at the equinox (1500 m at 42°: dawn ≈ 271, afternoon ≈ 279) |
| **the moor mere** `/world/moor/heath-mere` + a new `far-shore` | (existing) | `moor` (storm, alive) | the crossing refused — open water (stormy, 42°) |

Three one-node `Watercourse` rows (`blackmere`, basin `north`;
`circlemere` and `clearmere`, basin `circle`; each with its `site:` and
authored `channelWidthM 200`, `meanDepthM 4` ⇒ `currentMps ≈ 0`) with
`Shore` props; a `Watercourse` `northwater` with a flowing reach for the
*running water does not freeze* refusal. Three braziers (the practicum
`brazier.yaml` Campfire, `lit: true`, banked) as adornments — authored
light, the lint-free path (`glow` rows need an `INHERENT_GLOWS` edit; no
lamppost class may exist). At the Circle camp: quarrying's `salt-pan`
and the new `brine-cask` (D17). In the dorm room: the greatcoat in the
footlocker (D18).

**Lethality.** Every drive stand in a cold place is a `goto` → read →
`goto` back inside one real minute; clock jumps happen with the actor at
the Terminus start location (bodies drop any gap over 4 h anyway). No
authored place in the shipped realm's drive paths (Terminus, Rejection,
Hinkley, Heart's Delight, the moor) is colder at the equinox than
≈ 274 K dawn at Rejection's new 450 m. The invariant is pinned by a
kernel test: *at the default site the coldest clear-sky dawn of the year
is ≥ 268 K* and *the kestrel-road zone at 1500 m never reads below
255 K* (the point at which a 1-clo body would be hypothermic in under a
game-hour).

**The drive** — `packages/wire/tests/climate-and-water.dirty.wire.test.ts`
(dirty: clock jumps) — W11.

### D14 — Test-suite churn strategy

- The derivation stays behind `WeatherApi.isActive()`; with weather
  inactive the chain answers the root constant exactly as today
  (`BiomeLogic.weather-deviation.test.ts:115` and the two
  `Thermal.weather-coupling` baselines stay green).
- An assertion about an **outdoor absolute** is written as (i) a delta
  against a baseline measured on the same clock at the same site
  through a helper that *creates* the weather singleton (the weather.md
  caveat), or (ii) a pin of the **expression itself** at a literal
  `ClimateSite` and a literal `t` (pinning arithmetic is legitimate;
  pinning a world read is not), or (iii) left alone when it is indoor /
  authored / synthetic.
- The catchment tests re-derive against the kernel expression at the
  reach's site; the spring-rise shape test asserts shape (rise after the
  thaw, late-summer low) not kelvins.
- `sugaring.test.ts` re-pointed (D10); the taps wire drive is RE-RUN
  after W1 (its birch opens at Rejection's new 450 m at the equinox:
  mean ≈ 282 K > 278).

### D15 — Snow and ice walk back to the last melt-out, bounded, with a perennial cap

⚠ **A defect in the first draft of D6/D8, found in review.** A Locality
pin forces its type across the WHOLE segment walk, history included
(`WeatherLogic.walkSegments` :486-496). A stateless sum over a *fixed*
180-day window at a snow-pinned site where nothing melts inside the
window is therefore a sliding sum — each day adds one day of snowfall
and drops the day from 180 days ago — so the depth reads **constant**,
and so does ice thickness from a fixed-window FDD. The drive's *deepens*
and *thickens* steps could not pass, and the physics was wrong: snow
and ice older than the window vanished where nothing ever melted them.

**The algorithm (both `snowCoverAt` and `iceAt`, still stateless).**
The state (pack mm / sheet m) is a monotone function of its starting
value — more at the start means at least as much at every later
instant. So: start `W₀ = climate.walkback.windowDays` (180) before
`now` with the state at its **cap** (`climate.snow.perennialMaxMm`
1500 / `climate.ice.perennialMaxM` 2.0), integrate forward segment by
segment. If the capped state reaches **zero** at some `t₀` inside the
window, every smaller start would have too, so the history after `t₀`
is independent of the start — exact. If it never reaches zero, double
the window (360 d, then 720 d = `climate.walkback.maxDays`) and repeat.
At the bound with no melt-out, report the capped value flagged
`perennial: true` — firn, névé and glaciers are out of scope and the
cap is the stated abstraction ("snow older than two winters is a
glacier's business, not a floor's"); the readings say *perennial* rather
than a growing number. The melt window (`meltMm` over the catchment's
30-day flow window) is unaffected.

**Cost.** Worst case per memo miss: 180 + 360 + 720 days × 4 segments
= **5 040 segments**, each one `T_season` lookup, the diurnal cosine,
and either the pin (O(1)) or `typeForSegment` (O(8) over the season
memo) — ≈ 10⁵ simple operations, well under a millisecond — memoised
per floor / per reach per six-game-hour segment exactly as
`naturalFlowOf` is today. Typical case: the first window suffices
wherever the previous summer melted out within 180 days (every
mid-latitude site); the north places need the second (their last
melt-out is ~200 days before the spring equinox).

**What this changed elsewhere.** D6 and D8 reference it; `water.snow.
windowDays` (180) is renamed to `climate.walkback.windowDays` with the
same literal (the water pack's `water.yaml` entry is retired with its
three sibling dials in W4); the drive's *grow* stands move to the
Circle (D16).

### D16 — The Circle: a southern site where the cold is a few days old

On day 0 (the northern vernal equinox) the southern hemisphere enters
autumn, so a southern site can be **open water and bare ground at the
end of its summer and freezing day on day through the drive's one-day
steps**. ⚠ The requested *"around −62°"* does not work at the equinox:
the lag puts every subpolar site ≈ 11 K above its annual mean on day 0
(`{−62, c 0.85, 0 m}` reads 285.6 K; `{−70, c 1.0, 800 m}` 275.6), so a
site cold enough on day 0 that still has a real summer needs altitude
and the fourth lever. Computed with D2's expression and the starting
dials:

| site | day 0 · 1 · 2 · 3 · 4 · 5 (K) | summer max | last day > 273.15 K | coldest |
|---|---|---|---|---|
| **the Circle** `{−66, c 1.0, 900 m, offsetK −7}` | 270.2 · 269.7 · 269.1 · 268.6 · 268.0 · 267.5 | 291.9 (day 295) | day 354 | 233.4 (day 121) |

Monotone falling through the drive's budget; 117 days above freezing
in its summer (open water and bare ground by day 354 — six days before
day 0, so the pack and the sheet are a few days old on day 0, not
zero: the drive records the day-0 reading and asserts growth, not
absence). Day-0 segment means with the diurnal term: 266.2 / 270.2 /
274.2 / 270.2 K — all at or under the 274.5 K snow threshold under its
`{snow, frozen}` pin, and three of four below freezing. Cumulative FDD
at segment resolution: 3.2 K·d after day 0, 6.8 after day 1, 10.8 after
day 2, 15.4 after day 3 — clear-ice thickness 4.8 → 7.0 → 8.9 → 10.6 cm,
`bearsKg` 58 → 124 → 197 → 280: **the crossing refuses an 80 kg body on
day 0 and bears it from day 1**. Snow at intensity 1.5: ≈ 9 mm
water-equivalent per day less ≈ 1 mm of noon melt ⇒ ≈ 8 cm of depth per
day; the Circle pass authored `closesAboveM: 0.2` **shuts live between
day 2 and day 3**.

A sub-locality `circle/bare` under a `{clear, frozen}` pin with its own
one-node mere gives the snow-free twin for the ice-quality comparison
(black ice beside the snow-pinned mere's snow-ice) at the same
temperatures. The north places keep their jobs (cold vs warm; the
plateau-vs-snowfield wet/dry contrast; the permanently shut pass; a
thick black-ice crossing already open), and `whitemere` is dropped.

### D17 — Drive step 8 reads a frozen salt pan, not `dry`

`trade-cooking`'s `DryController`/`DryingRack` read no temperature, so
`dry` is not refused anywhere. The 273 K stalls AC 13 means are the
**evaporative maturation profiles** — `trade-quarrying/.../maturation/brine.yaml`
(`stallBelowK: 273`, mechanism `evaporative`), `maple-sap`, `birch-sap`
— read by `lib/maturation/Maturing.ts:300-318` `stallReason` (`'stalled'`
when the host's `Thermal` temperature `< stallBelowK`) and rendered by
`maturationAugmenter` (:323-350) on `look` from `MATURATION_LINES.evaporative.stalled`
(`lib/maturation/MaturationProfile.ts:42`): **"It sits frozen over.
Nothing is leaving it."** The vessel is quarrying's `salt-pan` row
(`/trade/quarrying/thing/salt-pan`, a `Vat`: `interiorBulk`, capacity
40, `closure: open`, matured by TAG — `inputCategory: brine` ↔ the
`bulk/salt-water` material); the shipped exemplar stands at Rejection's
salt flat beside a brine hearth (`rejection/.../location/salt-flat.yaml`).

**The flow at a freezing place.** W10 authors at the Circle camp a
`salt-pan` prop and a **brine cask** (`/world/circle/thing/brine-cask`,
a `/platform/thing/Receptacle` like the commons pail, `interiorMaterial:
/stuff/idea/material/bulk/salt-water`, `interiorAmount: 30`,
`interiorCapacity: 40` — rows author `interiorAmount` today:
`jar-of-barm.yaml:13`, `sugarbush-panel.yaml:35`). The player `pour cask
into pan` (`cmd/bulk/pour.yaml`, source then `into` target); the pan's
batch starts (`phase: active`, profile `brine` by tag); the pan is a
prop placed at hydrate, so its `Thermal` ambient is the camp's derived
air (≈ 270 K on day 0 < 273); `look pan` prints the stalled line. The
drive asserts the pour moved litres (`query` the pan) and the look
matches `/frozen over/`. No change to `dry`.

### D18 — The arrival greatcoat (R1 decided: option b)

The user accepted the honest default winter **and** a warm coat where
new players wake. Grounding: a new player's first home is the leased
dorm room (`residence.md`), one `DormRoom` clone per unit
(`eternal-university/.../location/dormroom.yaml`) whose born-with
fixtures are its `props:` (bed · desk · footlocker · tap · the mana lamp
· the sandbox door — ⚠ the "tall wardrobe wedged in beside the door" is
`/platform/thing/sandbox/wardrobe`, the holodeck crossing, not a clothes
press), seeded ONCE per unit by `DormWarren.admit → seedBornWith` and
captured thereafter. The university's **footlocker**
(`duncan-hall/thing/footlocker.yaml`, class `Footlocker extends Vessel`,
"its tenant-scoped contents are the deferred possession seam — v1 is
functional-empty") is the store surface a dorm offers; the arrival
outfit (`config/char-gen.yaml:79` student shirt · trousers · canvas
shoes, worn by `Character.wearGarments` at embody and by
`TestHooks.#dress`) is force-equipped and stays as it is. No shipped
garment is a coat: `generic-objects/.../clothes/` holds `tweed-jacket`
(wool, woven, 1.1 kg, torso), `field-jacket` (linen), `hood` (wool,
head), `white-coat` (linen); `clo` derives on `Wearable.getClo()`
(`lib/slot/Wearable.ts:386-430`: `t = mass/(ρ·A_covered)`, `k_eff =
k_fibre·(1−loft) + k_air·loft`, loft from the fabric form —
`base-library/.../fabric/{woven,knit,felted}.yaml`), and the body sums
per part by surface share (`Attired.bodyInsulation()` :640).

**The row.** `generic-objects/content/stuff/thing/clothes/greatcoat.yaml`,
authored like `tweed-jacket`: `class: /platform/thing/equipment/Garment`,
*heavy wool greatcoat*, `_materialPath: …/textile/wool`,
`constructionForm: felted` (boiled wool — the highest-loft shipped
form), `slotClaims: {biped: [torso, legs]}` (an ankle-length coat;
`arms` is not a covering slot), `gradeBand: fair`, mass sized by a unit
test (`Slotted.covering`'s shape) so that `bodyInsulation()` of the
arrival outfit + greatcoat reads **≥ 2.0 clo** — which with
`CLO_TO_KELVIN` 8 and the 20 K shiver gap holds a fed body to ≈ 266 K.
⚠ If no honest mass (≤ 5 kg) reaches 2.0 under the shipped derivation,
the build ships the coat at the heaviest honest mass, records the
derived figure for the outfit and the coat in the test, and files the
under-read against `textiles` (the derivation's calibration is not this
build's) — the coat still offers whatever it is worth.

**Where it is offered.** Not force-equipped: the dorm room's `props:`
gains `{ template: /stuff/thing/clothes/greatcoat, in: /world/terminus/eternal/duncan-hall/thing/footlocker }`
— the row's own `on: desk` placement idiom, with `in` — so a new tenant
opens the footlocker and finds it (the footlocker's prose "Empty" is
rewritten). Seed-once means only units admitted after the change carry
it; dev databases are dropped, there is no migration.
`lint:census` sees the `props:` entry (`refsOf` reads `props`),
`lint:reachability` arm R is satisfied by it, and `lint:instanceable`
12 adds no key (the row's keys are `tweed-jacket`'s). ⚠ The DormRoom
seed test that pins the born-with fixture set must be extended, not
loosened.

### D-L — Where the four levers live (Locality vs Zone, resolved)

- **`latitude`, `continentality`, `climateOffsetK`** are **`Zone`
  fields** (`lib/zone/Zone.ts`, beside `elevation`, same `fieldMeta`
  shape `{persistent, authorable}`, `number | null`, `get/set`
  finite-or-null), inherited by `lookupField`. On `Zone` not
  `SpatialZone` because the region FolderZone (`/world/terminus`,
  35 m) is exactly where a realm authors its latitude once; the
  authored-fields test's `SpatialZone`-only assertion covers `address /
  deposit / groundCharacter` and is extended to assert the three new
  keys on `Zone`.
- **`_precipitationIntensity`** is a **`Locality`** field (the
  requirements say so; the integral is keyed by Locality; it is read by
  `WeatherLogic`, so `lint:unconsumed-seams` is satisfied).
- **Resolution: `ZoneApi.climateSiteFor(scope): Promise<ClimateSite>`**
  on `ZoneLogic` beside `elevationFor` — one outward walk, four
  `lookupField`s, nulls → the defaults. **The reach's site**
  (`CompiledReach.site`) resolves from the climate-proxy Locality's
  place: `ZoneApi.resolveEnclosingZoneForPath(<a room path under the
  Locality's address>)` is not available (a Locality knows no zone and
  no room), so the water pack resolves the site from the **Watercourse
  row's basin zone**: each `Watercourse` row gains an optional
  `site: {latitudeDeg, continentality, offsetK}` block (authorable;
  default the realm default) — a river's latitude is a fact about the
  river, authored where its elevations are. ⚠ Drift between a river's
  authored site and the zones beside it is an authoring error the drive
  catches for the shipped basins (the Kestrel, the Delight, the Holloway,
  Cold Fell author `latitudeDeg: 42`; the north meres 71). A future pass
  may derive it from the proxy Locality once a Locality knows its zone —
  a deferred seam, written down.
- **The sync memo.** `AtmosphericMixin` gains `climateSite(): ClimateSite`
  / `resolveClimateSite(): Promise<void>` / `resetClimateSite()` — the
  `weatherLocality()` trio copied field for field (`_climateSitePath`,
  `_climateSiteResolved`, `_climateSitePromise`, generation; not
  persisted), answering `DEFAULT_CLIMATE_SITE` and kicking the resolve
  while unresolved. The async readers (`resolveTemperatureFor`,
  `outsideKFor`, `resolveWeatherFor`, the Reading verbs) **await
  `resolveClimateSite()`** before folding, so a verb never sees the
  default at a polar place; only the sync getters can, and they heal on
  the next read (the weatherLocality precedent, documented the same way).
  `ExitableVessel.onMoved` resets it beside the locality memo.

### D-S — The celestial defaults: `CAMPUS_LATITUDE` becomes the default

- `CelestialLogic`'s location-taking methods (`isDayAt`, `sunAltitude`,
  `sunAzimuth`, `nextSunrise/Sunset`, `moonAltitude/Azimuth`,
  `daylightAt`, `daylightFractionAt`, `currentSeason`) resolve
  `latitudeFor(location)` (= `(await ZoneApi.climateSiteFor(location)).latitudeDeg`)
  — they are async already. `skyFactorNow()` and `skyFactorDailyPeak()`
  gain a `latitudeDeg = CAMPUS_LATITUDE` parameter with a small bounded
  memo keyed `(round(φ·2), minute)` / `(round(φ·2), day)`;
  `VisionModality.ts:89,103` pass the room's `climateSite().latitudeDeg`
  (sync memo); `Street`'s dusk gate likewise. The single-PROFILE guard
  (`profileFor` throws on a second tilt; `lint:light-sources` (f)) is
  untouched — the comment that justified it by the global memo is
  rewritten. `WorldClockRegistry.ts:697`'s lamp-sunset system schedule
  keeps the default latitude (a realm-wide arming tick; the per-street
  dusk gate is what decides a lamp) — residue noted in energy.md.
- `Producing.daylightFraction()` takes the host's site;
  `BreedController`, `Waters.ts` pass the location.

### D-D — Dials

New `AppSettingKeys` + seeded literals at every call site (the water
pack's rule), values in the platform pack's settings yaml beside the
weather dials: `climate.poleMeanK` 245, `climate.equatorMeanK` 301,
`climate.tauContinentalDays` 30, `climate.tauMaritimeDays` 55,
`climate.maritimeMixing` 0.6, `climate.defaultContinentality` 0.5,
`climate.snowThresholdK` 274.5, `climate.snowDensityRatio` 10,
`climate.snow.bandM.{dusting 0.05, ankle 0.15, knee 0.5}`,
`climate.snow.perennialMaxMm` 1500, `climate.walkback.windowDays` 180,
`climate.walkback.maxDays` 720, `climate.precipDryAboveDeg` 55,
`climate.precipPolarFactor` 0.4, `climate.ice.stillWaterMps` 0.1,
`climate.ice.growthClear` 0.027, `climate.ice.growthUnderSnow` 0.017,
`climate.ice.meltMPerKd` 0.005, `climate.ice.rotTddK` 10,
`climate.ice.bearingKgPerM2` 2.5e4, `climate.ice.perennialMaxM` 2.0.
**Retired:** `weather.solarAnnualSwingK`,
`water.season.meanK.{spring,summer,fall,winter}`, `water.snow.windowDays`
(→ `climate.walkback.windowDays`) — removed from `AppSettings.ts`,
`water.yaml` and their docs. Kept: `weather.solarDiurnalSwingK`,
`water.snow.lapseRateKPerKm`, `water.snow.meltMmPerKPerDay` and every
`water.rate.*` dial (now shared by ground snow and the catchment — AC 9).

### Build decisions (recorded during /build)

- **B1 (W0) — the dials moved a kelvin, as the plan expected.** At
  `poleMeanK 245 / equatorMeanK 301` the default annual mean was 286.3 K,
  over the [282, 286] pin. Retuned to **247 / 299**: annual 285.4,
  winter quarter 274.0, summer 296.7, coldest clear dawn 268.6, lag 37 d;
  the Circle reads 269.5 → 267.0 K over days 0–5 (was 270.2 → 267.5).
  Decided by the calibration pins (D2 says they are the authority).
- **B2 (W0) — the high sugarbush cannot stand at 1500 m.** The plan's
  *"1500 m at 42°: dawn ≈ 271, afternoon ≈ 279"* was arithmetic error:
  day 0 at the default site is 277.9 K, so 1500 m reads 264–272 K and
  never thaws. A freeze-thaw day at the equinox needs ≈ 750–850 m. W0
  pins `{42, 800 m}` straddling 273 on day 0; W10 places the sugarbush at
  that height (the pass keeps its own, higher, elevation).
- **B3 (W0) — `phase` on `WeatherSegment` lands in W3** with the code that
  fills it, not as an empty field a wave early.
- **B5 (W2) — the open-water biome breathes air.** The plan's
  `_defaultAtmosphere: water` would drown everyone standing on a boat:
  the atmosphere tag is the medium a body is IN (respiration's medium
  trigger). The stub authors humidity 100 % and inherits air.
- **B6 (W1) — the sync air substitutes the climate with no Locality.**
  `airFor` used to fold nothing until the weather Locality resolved; the
  climate needs only the site, so a sky place under no Locality still
  has a season on the sync path (the weather deviation still waits for
  the Locality).
- **B7 (W3) — phase re-derivation is for the SKY.** An indoor pin
  (the weeping chamber's rain) is not falling from this sky and keeps
  its descriptor; the integral (keyed by Locality) always takes the
  phase when the caller hands a site.
- **B4 (W0) — no `climate.defaultContinentality` dial.** The default site
  is the `DEFAULT_CLIMATE_SITE` value; a dial read beside a const would be
  two sources for one number.

---

## Host placement

| thing | host | what composing it claims | the narrowing test |
|---|---|---|---|
| `latitude`, `continentality`, `climateOffsetK` | `Zone` (kernel, beside `elevation`) | every zone — a FolderZone region root included — may say where on the world it is; `null` means *walk further* | none; an unauthored chain resolves the default, no guard |
| `_precipitationIntensity` | `Locality` | a place that has weather may say how hard it rains; `null` = the latitude default | none |
| `ClimateSite` + `DEFAULT_CLIMATE_SITE` | `lib/weather/WeatherType.ts` (vocabulary/value) | a plain shape; no statics | n/a |
| the expression, `seasonAt`, `dailyRangeAt`, `snowCoverAt` | `WeatherLogic` (+ thin `WeatherApi` forwards) | weather owns *what the sky does at a site*; hydrology still owns what that does to a river | n/a |
| `climateSite()` memo trio | `AtmosphericMixin` | every place with air knows where it is on the world — true of a room and of a coach (reset on move) | none |
| `'climate'` trace source | `AtmosphericTrace` | a reading may come from the climate | n/a |
| `getSnowDepthM` / `getSnowBand` / `isFrozenOver` + `snowAugmenter` | `FloorMixin` | every floor can carry snow and can freeze its puddle; an indoor floor answers 0/false because its place is not under the sky | ⚠ the gate is `isOnGrade() && isSkyExposed(place)` — a fact about the floor's place, not a class guard; if a `Floor` subclass ever needs `if (!(this instanceof X))` the host is wrong |
| `phase` on `WeatherSegment` | `lib/weather/WeatherType.ts` | a segment knows what fell, not only what the grammar called it | n/a |
| `CompiledReach.site`, `iceAt`, `IceRecord`, `iceCache` | `WatercourseCatalogue` (water pack) | a reach has a site and may carry ice; running reaches answer `none` with a reason | none |
| `ice` on `ShoreMemo`; the ice line | `Shore`, `WaterReading` (water pack) | a shore reads its ice; the water channel reports it | n/a |
| `extentSite` | `Conduit` (water pack) | a conduit knows the climate at both ends | n/a |
| `freeze-thaw` kind | `TapWindowSpec` (kernel vocabulary) + `ProducingMixin.tapWindow` | any producer may open on a freeze-thaw; the arm reads the host's air scope | the arm uses `MixinApi.isThermal(self)` only to find the air scope; a host with no air scope reads open (the tri-state rule) |
| `SnowboundExit`, `IceCrossingExit` | `packages/content/transport/src/idea/` | transport owns routes that close; the ground and the water are read by shape | n/a |
| kind rows | the content pack that owns the place | a kind carries somebody's water/snow | n/a |
| `open-water` biome | `packages/content/water/content/stuff/idea/biome/water/` | the water system says what a water is made of | n/a |
| `site:` on a `Watercourse` row | `Watercourse` (water pack) | a river says where on the world it runs | n/a |
| `brine-cask` row (D17) | `world-seed` `/world/circle/thing/` — a `Receptacle` | a place's prop | n/a |
| `greatcoat` row (D18) | `generic-objects` `/stuff/thing/clothes/` — a `Garment` | a commons garment any wardrobe may hold | n/a |
| `check-biome.ts` | `packages/server/scripts/` | a gate | n/a |
| content rows (W10) | `world-seed`, `rejection` | places | n/a |

**Explicitly NOT placed:** no `SnowCoverMixin` (one composer); no
`ClimateApi`/`ClimateLogic` (weather is the subsystem); no field on
`Biome` (the biome is the air, not the globe); no `Thermal` on `Floor`;
no `latitude` on `Locality` (the requirements decided `Zone`; the
Locality reads the site the caller holds); no new Reading row; no new
verb anywhere.

---

## Convention conformance

Checked at plan time against the current tree:

- **Module categories.** Everything new is a field/method on an existing
  class, a vocabulary entry, a logic-singleton method with an Api
  forward, two pack `src/idea/` Exit subclasses, one `scripts/check-*.ts`
  gate, and rows. No free helper, no new module category, no
  `eslint-disable`. Pure helpers inside `WeatherLogic`/`CelestialLogic`
  stay **module-private functions** (the grammar's own shape).
- **Verbs on objects; Api statics never take a world object as the
  verb.** `WeatherApi.temperatureAt(site, locality, t)` takes a value and
  a reference-data Idea, not a host object; the floor answers its own
  snow; the reach's ice is the catalogue's (a registry read); the exits
  refresh themselves. `lint:object-verbs` stays at zero.
- **`lint:lib-statics` 341/341** — no new public static outside an Api,
  a mixin factory's class, or a `private static` (the exits copy
  `FordExit.flowSource`'s `private static`).
- **`lint:instanceable` invariant 12 at 390/390** — every authored key
  declared: `latitude/continentality/climateOffsetK` on `Zone`,
  `_precipitationIntensity` on `Locality`, `site` on `Watercourse`,
  `_closesAboveM`/`_crossesReach`/`_bearsMarginKg` on the exits, the
  maple's `window` (existing), the biome row (existing keys), the
  greatcoat (`tweed-jacket`'s keys), the brine cask (the pail's keys +
  `interiorMaterial`/`interiorAmount`, both declared on `Bulkable`).
  Rows under `/world/` are exempt from invariant 7; the two exit classes
  resolve at `/system/transport/idea/<Name>` (invariant 8).
- **`lint:mixin-names`** — no new kernel mixin, so no `Mixins` entry.
- **`lint:module-scope`** — the memo Maps are `const` pure value
  construction (the `seasonCache` precedent).
- **`lint:imports`** — the water pack and transport import the kernel
  only by `@saxonberg/server/mud/{api,lib}/…` (on the `exports` map).
- **`lint:location-graph`** — both new kind rows carry `conditional:
  true`; the new rooms' exits are authored both sides; new zones are
  `CartesianZone` rows with rooms beneath them (`lint:locations`).
- **`lint:ground`** — the snow augmenter stacks; no floor row authors a
  `floor`/`ground` detail; new rooms author no floor claims.
- **`lint:envelope`** — (d) untouched; the new SkyExposed clause lives in
  `lint:biome`.
- **`lint:light-sources`** — braziers author `lit:`; no `glow` rows; no
  lamppost class; no `celestialProfile` authored anywhere.
- **`lint:reachability`** — no new views; new `thing` rows are props /
  adornments of rooms (faucets).
- **`lint:closed-vocabularies`** — `SnowBand`, `IceQuality`, the new
  trace source are TS unions; the band phrases are exhaustive
  `Record`s.
- **`lint:unconsumed-seams`** — `_precipitationIntensity` is read by
  `WeatherLogic`; `Watercourse.site` by the catalogue.
- **`lint:reconcile-chains`** — no new `reconcile*`.
- **`lint:schema`** — no collection touched. **No migration**: the
  retired dials are keys in a settings document, not a schema; a dev DB
  carrying the old keys is harmless (the `dial()` fallback reads the
  literal).
- **`lint:drive-scripts`** — the drive is a wire file.
- **`props:`/`cast:`** on new rooms; Locations not rooms
  (`CartesianLocation` / `SingletonCartesianLocation`, `Street` for the
  lit stations); the `<root>/<branch>/` pattern (`/world/north/...`,
  `/system/transport/idea/...`, `/stuff/idea/biome/water/...`,
  `/stuff/idea/Watercourse/<key>`).
- **Module scope declares; lifecycles initialize** — memos are lazy;
  the catalogue compiles at first read; the floor's memo at first read.
- **No new `isWizard`**; no new Mongo collection; no `Map` field persisted.

Gates this build must pass: the whole family (`pnpm -C packages/server
lint:family`), with `lint:biome` added to it, plus every touched pack's
own vitest (`water`, `transport`, `trade-forestry`, `rejection`,
`world-seed`, `trade-fishing`, `trade-ranching`, `trade-farming`).

---

## Waves

Every wave lands independently, ends at a commit
`build(climate W<n>): …`, and is gated by `pnpm test:near` + the touched
packs' vitest + `lint:family`. The full suite runs once, before the MR.

### W0 — The expression, as arithmetic nobody reads yet

**Goal.** The kernel can answer *how warm is a site on a day* and *what
season a latitude is in*, calibrated and pinned, with no reader changed.
**Decisions.** D2, D3 (the pure half), D-L (fields only), D-D.
**Files.** `lib/weather/WeatherType.ts` (`ClimateSite`,
`DEFAULT_CLIMATE_SITE`, `phase` on `WeatherSegment`);
`platform/idea/api/WeatherLogic.ts` (`temperatureAt`, `seasonAt`,
`dailyRangeAt`, the `T_season` memo; `solarTemperatureDeviationK` kept
for one wave); `api/weather.ts` (forwards); `api/celestial.ts` +
`CelestialLogic.ts` (`seasonFor(profile, t, latitudeDeg?)`;
`CAMPUS_LATITUDE`'s comment); `lib/zone/Zone.ts` (three fields);
`platform/idea/api/ZoneLogic.ts` + `api/zone.ts` (`climateSiteFor`);
`lib/zone/__tests__/SpatialZone.authoredFields.test.ts` (extend);
`lib/config/AppSettings.ts` (keys); the platform settings yaml.
**Tests.** `platform/idea/api/__tests__/WeatherLogic.climate.test.ts`:
the calibration pins of D2 **including the two lag pins** (the default
site's coldest 30-day window 20–45 d after the solstice; a `c 0` site's
no more than 20 d later than a `c 1` site's); continuity; hemisphere
inversion of `seasonAt`; polar night ⇒ `T_pole` equilibrium; the
lethality floor pins (D13); `dailyRangeAt` straddles 273 at `{42,
1500 m}` on day 0 and does not at `{42, 0 m}`; **the Circle pins** (D16:
`{−66, 1.0, 900, −7}` falls monotonically over days 0–5 and its summer
maximum exceeds 285 K).
**Acceptance.** `lint:family` green; no behaviour change (the taps,
drilling and fishing wire drives still pass when attached).
**Commit.** `build(climate W0): one temperature expression at a site, pinned`

> ✅ **Done.** `WeatherApi.temperatureAt / seasonAt / dailyRangeAt`, the
> three Zone levers, `ZoneApi.climateSiteFor`, `seasonFor(…, latitude)`,
> five `climate.*` dials (`content/settings/climate.yaml`). 16 calibration
> pins in `WeatherLogic.climate.test.ts`. Dials retuned (B1); the
> sugarbush height corrected (B2). The memo quantises latitude to ½° and
> continentality to 0.1 — an author's 0.75 reads as 0.8 (stated in the
> memo's comment). The day's season is interpolated across the day, so
> `T` is continuous at midnight.

### W1 — The sky re-sourced: biome, celestial, the memo, the readers

**Goal.** Every sky-exposed scope's temperature IS the expression; the
celestial location calls resolve a latitude; season is local; the solar
cosine is gone.
**Decisions.** D1, D3, D4, D-L (the memo), D-S, D14.
**Files.** `lib/biome/Atmospheric.ts` (the `climateSite()` trio,
`resetClimateSite` in `ExitableVessel.onMoved`);
`platform/idea/api/BiomeLogic.ts` (`temperatureTraceFor` mirroring
`pressureTraceFor`; `resolveQuantityFor` / `outsideKFor` /
`liveDeviation` / `airSegmentsFor` → the one rule; `'climate'` source;
`trace atmosphere` prose); `WeatherLogic.ts` (`deviatedFieldFor` drops
the solar term; `seasonAtSegment(seg, hemisphere)` + re-keyed memo;
`site` threaded through `computeSample`/`walkSegments`/`pinnedSample`/
`baselineSample`; `solarTemperatureDeviationK` and `solarTempMemo`
deleted; `weather.solarAnnualSwingK` retired); `CelestialLogic.ts` (the
twelve `CAMPUS_LATITUDE` sites → `latitudeFor(location)`; per-latitude
`skyFactorNow`/`skyFactorDailyPeak` memos);
`platform/idea/modalities/VisionModality.ts:89,103`;
`platform/location/Street.ts` dusk gate; `lib/husbandry/Producing.ts`
`daylightFraction(site)`; `packages/content/trade-farming/src/location/Field.ts`;
`packages/content/trade-ranching/.../BreedController.ts`;
`packages/content/trade-fishing/src/idea/Waters.ts:97`;
`packages/content/water/src/idea/FisheryRegistry.ts:175` (interim: the
default; W4 passes the reach's site); `base-library/.../biome/universe.yaml`
comment; `platform/idea/reading/SkyReading.ts` (prints `polar night` /
`polar day` from `sunriseHourAngleDeg` at the site — the sky *says so*,
AC 5).
**Tests.** Re-derive per D14 (expected: the two `Thermal.weather-coupling`
baselines and `BiomeLogic.weather-deviation` keep their deltas; add
`BiomeLogic.climate.test.ts`: root-replacement vs authored-wins; a room
at `{−42}` reads the opposite season; `airSegmentsFor` now equals the
live read's segment mean). Re-run the taps wire drive attached.
**Acceptance.** `measure temperature` at a Terminus street on day 0 reads
≈ 284 ± diurnal; `trace atmosphere` says *derived from the climate*;
`analyze sky` at a `{−89}` test room (unit) says polar night on day 3.
**Commit.** `build(climate W1): the sky derives from latitude — biome, celestial and season re-sourced`

> ✅ **Done.** `temperatureTraceFor` mirrors `pressureTraceFor`: a sky
> scope whose chain reaches the universe constant reads
> `WeatherApi.climateAt(site)` + the weather (trace `source: 'climate'`,
> naming the zone and the site); authored wins and takes the TYPE
> deviation only. `outsideKFor` substitutes the climate whenever the
> chain reached the root — ⚠ **so an indoor-biomed enclosed room now
> drifts toward the real winter** (before, its outside was 295 K the
> year round: `indoor/baseline` reached the root as `biome-ancestor`,
> which the old `fromSky` test excluded). The solar cosine and its dial
> are deleted. Season/hemisphere thread through the grammar
> (`seasonAtSegment(seg, south)`; every weather fold of one scope passes
> the site so its fields read one type). The `climateSite()` memo trio
> is on `AtmosphericMixin`; the sync `airFor` substitutes the climate
> even with no Locality (B6). Celestial location methods resolve
> `latitudeFor(location)`; the sky factor memos key by ½° latitude;
> vision, street dusk, `Producing.daylightFraction` and fishing's
> twilight read the place's latitude; `analyze sky` names the polar
> night/day. The taps wire re-run is folded into W11's drive boot (one
> owned world for all wire runs).

### W2 — `lint:biome` and the loud catalogue; the water biome

**Goal.** A cited-but-unresolved or malformed biome fails loud; the
roster rule from D4 is a gate; maritime's row exists.
**Decisions.** D11, D12.
**Files.** `packages/server/scripts/check-biome.ts` + `package.json`
`lint:biome`; `platform/idea/BiomeCatalogue.ts`; `docs/lint-family.md`
(one entry); `packages/content/water/content/stuff/idea/biome/water.yaml`,
`water/open.yaml`.
**Tests.** A fixture-tree test for the gate's five clauses (the
`check-ground` test shape); `BiomeCatalogue.test.ts` asserts a row with a
bad class is COUNTED.
**Acceptance.** `pnpm lint:biome` green on the tree; it fails on a
scratch row citing `/stuff/idea/biome/nowhere`.
**Commit.** `build(climate W2): lint:biome — a biome that does not resolve fails loud; the water-biome stub`

> ✅ **Done.** `scripts/check-biome.ts` (a pure `biomeFindings` core +
> disk facts; 7 fixture tests); green on the tree: 9 biome rows, 67
> citations. ⚠ `Biome` is a base CLASS whose twin aliases it
> (`extends BiomeBase`), so "is a biome" is `extendsAny`, not
> `composesMixin` — the first run called every indoor citation a
> non-biome. `BiomeCatalogue.warm()` returns `{stood, failed}` and
> distinguishes a folder (quiet) from an unloadable class (loud:
> `console.error` + a `biome.unresolved` diagnostic). The water stub
> breathes air (B5). ⚠ The pointer line in `maritime-space-requirements.md`
> lives on the maritime branch (build-1) — left for that build, named
> in the MR.

### W3 — Precipitation: phase by temperature, amount by place

**Goal.** It cannot snow at 290 K; one storm snows on the peak and rains
in the valley; a Locality can be wet or arid by amount.
**Decisions.** D5.
**Files.** `WeatherLogic.ts` (`walkSegments`/`integratePrecipitation`/
`segmentsBetween` take `site?`; `computeResolved` re-derives
`precipitationHere`; the intensity multiply); `api/weather.ts`
signatures (optional trailing `site`); `platform/idea/Locality.ts`
(`_precipitationIntensity`); `lib/husbandry/Soil.ts` (passes the
host's site — it already resolves the locality; `liquid` semantics
unchanged, `frozen` still discarded); `platform/idea/reading/WeatherReading.ts`
(the thirty-day millimetre line, banded).
**Tests.** `WeatherLogic.phase.test.ts`: a `snow` segment at a 290 K
site is liquid; a `rain` segment at a 265 K site is frozen; two sites
under one Locality and one segment split by elevation; intensity 2
doubles the integral; the latitude default; `Precipitation.test.ts`'s
annual pin re-asserted at the default site.
**Acceptance.** `analyze weather` at a cold site under a `snow` pin says
snow; at a warm site under the same pin says rain.
**Commit.** `build(climate W3): precipitation falls as the phase its place is cold enough for; a Locality has an amount`

> ✅ **Done.** `WeatherSegment.phase` (B3) decided at the segment's
> midpoint (so a segment reads one phase from any window);
> `precipitationIntensityOf` (authored, else 1 → 0.4 between 55° and
> 80°); `computeResolved` re-derives `precipitationHere` under the sky
> only (an indoor pin keeps its descriptor — B7). Soil warms the
> place's site memo in its watershed resolve and passes it; the
> evaporation segments pass it too. `analyze weather` gains the month
> line (words always; millimetres at `competent`+). ⚠ **Surprise:** six
> shipped tests asserted rain at the reset clock (day 0, midnight) —
> an equinox night at 42° that is now cold enough to snow. Each was
> moved to a summer afternoon and kept its claim; one new test pins the
> cold case (a storm pin snows at the solstice dawn). The wire clock
> seam anchors at `setScale`, so the provider must read 0 then.

### W4 — The catchment unified; the main agrees with the street

**Goal.** The water pack reads the kernel expression; its table and its
snowpack copy are gone; the conduit reads both ends.
**Decisions.** D2 (water half), D6 + D15 (the kernel `snowCoverAt` with
the walk-back, consumed here first), D7 (the main), D-L
(`Watercourse.site`).
**Files.** `WeatherLogic.ts` + `api/weather.ts` (`snowCoverAt`);
`packages/content/water/src/idea/Watercourse.ts` (`site` field +
`fieldMeta`); `WatercourseCatalogue.ts` (`CompiledReach.site`;
`airTemperatureKAt` → the expression; `airTemperatureK`, `seasonMeanK`,
`snowpackOf` deleted; `computeNaturalFlow` calls `snowCoverAt`;
`FisheryRegistry` season at the reach's site); `src/thing/Conduit.ts`
(`extentSite` beside `headM`; `frozen` on either end);
`content/settings/water.yaml` (four dials removed, comments rewritten);
`AppSettings.ts` (keys removed); the four shipped `Watercourse` rows
(`site: {latitudeDeg: 42}` — explicit, so the drive's agreement check is
against an authored number).
**Tests.** `Flow.test.ts` re-derived (shape: spring rise, summer low;
the pack at the headwaters' site); `Conduit.test.ts`: frozen when the
extent is cold and the intake warm, and vice versa; a kernel test that
`snowCoverAt` at `{42, 1400 m}` over a synthetic winter with a melt-out
inside 180 days equals the former `snowpackOf` on the same segments;
**the D15 walk-back tests**: a pinned-snow site that never melts reads
`perennial` at the cap and not a sliding constant; a site whose last
melt-out is 200 days back reads the same at window 360 as at 720 (the
answer is independent of the start once a zero is found); a site under
a `{snow, frozen}` pin whose cold began N days ago reads strictly more
on day N+1 than on day N.
**Acceptance.** AC 1 unit-proved: a room's `resolveTemperatureFor` at
`{42, 30 m}` and `airTemperatureKAt(kestrel:confluence)` at the same
instant agree to < 0.1 K.
**Commit.** `build(climate W4): the catchment reads the one expression — the seasonal table and the second snowpack are gone`

### W5 — Snow on the ground

**Goal.** A sky-exposed floor reads its snow, deepens in a cold spell,
clears in a thaw, masks the ground when deep.
**Decisions.** D6.
**Files.** `lib/ground/Floor.ts` (`getSnowDepthM`, `getSnowBand`,
`snowAugmenter`, the per-segment memo, `SnowBand` + phrases);
`lib/ground/__tests__/Floor.snow.test.ts`; `WeatherReading.ts` (the
snow line); `docs/subsystems/ground.md` (the named seam closes).
**Tests.** A floor under a synthetic cold+snow segment history reads a
depth; the same floor indoors reads 0; a warm site under the same
segments reads 0; a floor whose cold began N days ago reads more on
day N+1 (the D15 walk-back, through the floor); a permanently cold
pinned floor reads *perennial* at the cap; masking at `knee-deep`; the
memo invalidates at the segment boundary; an unresolved site is not
memoised as 0.
**Acceptance.** `look` in a cold snow-pinned test room (unit, a fixture
Locality) renders the overlay sentence after the ground sentence;
`analyze weather` prints the depth.
**Commit.** `build(climate W5): snow lies on sky-exposed ground, derived from the same integral the river banks`

### W6 — Freezing from the weather

**Goal.** A vessel of water freezes in a cold street and the puddle
reads frozen over.
**Decisions.** D7 (vessels + puddle).
**Files.** `lib/thermal/Thermal.ts:979-985`; `lib/ground/Floor.ts`
(`isFrozenOver`, the augmenter clause); `lib/thermal/__tests__/Thermal.freeze.test.ts`
(an ambient case beside the ClimateControl case: a `Receptacle` of
water restamped into a 265 K room plateaus, banks, mints an ice block
into the room; a second `getTemperature` banks nothing more).
**Acceptance.** Drive step 5's unit twin passes; `Thermal.cold.gym`
unchanged.
**Commit.** `build(climate W6): the freeze gets its ambient driver — the melt's mirror`

### W7 — Ice on a reach

**Goal.** A still reach grows ice by freezing degree-days, snow spoils
it, and `analyze water` reads it by competence.
**Decisions.** D8.
**Files.** `WatercourseCatalogue.ts` (`iceAt`, `IceRecord`, `iceCache`);
`src/thing/Shore.ts` (`ice` on the memo, the sentence);
`src/idea/reading/WaterReading.ts` (the banded line, the `physics`
credit; also uses `_band` for the figures it already prints — the
survey found it ignores its band); `Ice.test.ts`.
**Tests.** No ice on a running reach; thickness after N cold days ∝
√FDD; thicker after 2N; snow-covered ⇒ `snow-ice` and thinner than the
snow-free twin on identical temperatures; `bearsKg` monotone; melt-back
in a thaw; the memo clears per segment; **the D15 walk-back**: a sheet
under a permanent freeze reads `perennial` at the cap, never a
window-sliding constant; a sheet whose open water was 10 days ago reads
thicker every day.
**Acceptance.** `analyze water` at a Shore on a frozen test reach prints
an ice line whose detail follows the actor's `physics` band.
**Commit.** `build(climate W7): ice grows on still water by freezing-degree-days, and you can read it`

### W8 — The routes that close

**Goal.** Deep snow shuts a path; a bearing sheet opens a crossing;
both through the `blocked` seam; physical only.
**Decisions.** D9.
**Files.** `packages/content/transport/src/idea/SnowboundExit.ts`,
`IceCrossingExit.ts`, `src/__tests__/Snowbound.test.ts`, `IceCrossing.test.ts`
(the `Ford.test.ts` shape: a stub floor / a stub catalogue by shape;
open in autumn / shut in winter; bears a person not a cart);
`FordExit.ts` header (the stale `LaneCatalogue` claim corrected while
there); `docs/subsystems/logistics.md` + `boundary.md` (two lines).
**Acceptance.** `lint:location-graph` passes with the kind rows W10
adds (`conditional: true`); a stub mover at a shut pass gets
`controller-rejected` with the snow prose and does not move.
**Commit.** `build(climate W8): a route can close under snow and open over ice — the ford's seam, twice`

### W9 — The maple opens on a freeze-thaw

**Goal.** `TapWindowSpec` has a `freeze-thaw` kind and the maple uses it.
**Decisions.** D10.
**Files.** `platform/idea/species/Species.ts` (the union arm);
`lib/husbandry/Producing.ts` (the arm; `tapRefusal` reuses `cold`/`warm`);
`WeatherLogic.dailyRangeAt` (W0) consumed; `acer/saccharum.yaml`
(window + header); `trade-forestry/src/__tests__/sugaring.test.ts`
(re-pointed); `SapStandard.test.ts` (a freeze-thaw day opens, a frozen
day and a mild day close); `docs/subsystems/taps.md` (the kind).
**Acceptance.** Unit: the Rejection high sugarbush's site opens on day
0; the hanging-wood site (450 m) does not on day 0 and does on a
synthetic winter day.
**Commit.** `build(climate W9): the maple runs on freeze and thaw`

### W10 — The places

**Goal.** AC 20: the content of D13 exists, lit, pinned, reachable, with
the kind rows, the meres, the sugarbush and the zone elevations.
**Decisions.** D13, D9 (rows), D-L (zone rows).
**Files** (`packages/content/world-seed/content/`): zone rows
`world/north.yaml`, `world/north/snowfield.yaml`, `world/north/plateau.yaml`,
`world/circle.yaml`, `world/circle/bare.yaml`, `world/south.yaml`,
`world/pair/wet.yaml`, `world/pair/arid.yaml` (`CartesianZone`,
`latitude`/`continentality`/`climateOffsetK`/`elevation`/`address`);
rooms under each (the moor rooms as the template: `_address`,
`_biomePath: /stuff/idea/biome/outdoor/baseline`, `ambientIntensity`,
`coords`, `exits`, braziers as `adornments:`); Locality rows
`stuff/idea/Locality/{north,north-snowfield,north-plateau,circle,circle-bare,south,pair-wet,pair-arid}.yaml`
(pins, leans, intensities, `_reach`/`_catchmentKm2` for the meres);
`stuff/idea/Watercourse/{blackmere,circlemere,clearmere,northwater}.yaml`
(`site`, one-node, width/depth); `world/north/exits/{snowbound-pass,ice-crossing}.yaml`
(`closesAboveM: 0.5`), `world/circle/exits/{circle-pass,circle-crossing}.yaml`
(`closesAboveM: 0.2`), `world/moor/exits/mere-crossing.yaml` +
`world/moor/far-shore.yaml`; Shore props; `world/circle/thing/brine-cask.yaml`
(D17) with the Circle camp's `props:` naming it and
`/trade/quarrying/thing/salt-pan`; `pack.yaml` `boot:` entries mirroring
the moor's, and `requires:` the `trade-quarrying` pack for the pan.
**R1 (D18):** `packages/content/generic-objects/content/stuff/thing/clothes/greatcoat.yaml`
+ the `props:` entry on
`packages/content/eternal-university/content/world/terminus/eternal/duncan-hall/location/dormroom.yaml`
(`in:` the footlocker) + the footlocker's prose; a sizing test beside
`Slotted.covering.test.ts` recording `bodyInsulation()` for the arrival
outfit with and without the coat; the DormRoom born-with seed test
extended.
`packages/content/rejection/content/world/terminus/rejection.yaml`
(`elevation: 450`), `kestrel-road.yaml` (`elevation: 1500`),
`kestrel-road/upper-climb.yaml` (`props:` the high sugarbush panel),
`kestrel-road/thing/high-sugarbush.yaml` + two maple rows (the
hanging-wood rows as the template). Pack tests: each pack's row-shape
test; `lint:locations`, `lint:location-graph`, `lint:reachability`,
`lint:untitled`, `lint:light-sources`, `lint:census`, `lint:biome`.
**Acceptance.** A cold boot installs every row; `goto` reaches each
place; `look` at the south station on day 3 renders (lit); nothing on
the Terminus/Rejection/moor drive paths reads below 268 K on day 0; a
freshly admitted dorm unit's footlocker holds the greatcoat and the
outfit + coat sizing test records ≥ 2.0 clo (or the honest figure and
the filed residue, D18).
**Commit.** `build(climate W10): the north, the south, the wet coast and the dry basin — the places the drive stands in`

### W11 — The drive, the docs, the MR

**Goal.** The requirements' fifteen steps run against an owned world and
the record lands in this plan; subsystem docs state the new truth.
**Files.** `packages/wire/tests/climate-and-water.dirty.wire.test.ts`
(`DIRTY_REASON`: clock jumps); docs: `weather.md` (the expression, the
site, phase, intensity, `snowCoverAt`; the solar-term section rewritten),
`time.md` (latitude is a resolved zone field; `CAMPUS_LATITUDE` is the
default; `seasonFor` takes a latitude), `watershed.md` (the table gone;
one snowpack), `biome.md` (the `'climate'` source; the gate; the water
row), `ground.md` (snow), `thermal.md` (the freeze driver; the puddle
read), `boundary.md`/`logistics.md` (the two exits), `taps.md`
(`freeze-thaw`), `fishing.md` (ice on the Shore), `soil.md` (frozen still
discarded, why), `lint-family.md` (`lint:biome`). ⚠ `CLAUDE.md`,
`roadmap.md`, slates' README are **sweep** files — leave their index
lines to `/finalize`.
**Then:** `pnpm test` once; push; open the MR.
**Commit.** `drive(climate): what driving found` + `docs(climate): …`.

---

## Reachability wiring

For each new capability — **verb · affordance · data · boot · arg gate** —
and the link that would fail closed and silent:

| capability | verb | affordance | data (row) | boot / warm | arg gate |
|---|---|---|---|---|---|
| derived sky temperature | `measure temperature` / `feel` / `trace atmosphere` (existing) | `Avatar.self` (existing) | zone `latitude…` (optional) | the `WeatherLogic` singleton exists (boot's first `nextBoundaryAfter`), **or** the read is the root constant — the shipped activation; ⚠ the site memo: unresolved reads the default and heals; the ASYNC readers await the resolve | none |
| local season / polar night | `analyze sky` (existing) | existing | — | the `sky` Reading row (existing) | none |
| precipitation phase + amount | `analyze weather` (existing) | existing | `Locality._precipitationIntensity`, pins | `Locality` rows must be in the pack `boot:` list (the registry only sees live rows — the moor precedent) ⚠ **a Locality nothing boots is weatherless and intensity-less, silently** | none |
| ground snow | `look` / `analyze weather` | the floor's augmenter | — | the floor is minted at `onCreate`; the memo resolves lazily | none |
| vessel freeze | `look` / `feel` (the ice block appears) | — | `/stuff/thing/ice-block` (existing `castTemplate`) | `reconcileThermal` on read | none |
| ice on a reach | `analyze water` (existing channel) | existing | `Watercourse` rows (`site`, width/depth) | the catalogue is lazy (never warmed by design) | `requires: any` (existing) |
| the main agrees | `analyze water <intake>` (existing) | existing | conduit rows (existing) | `resolveHead` at construction ⚠ `extentSite` must resolve in the same act or `frozen` reads the intake only — pinned by a test | existing |
| snowbound / ice crossing | `go <dir>` (existing) | the room's `exits:` | kind rows with `kind:` on both rooms' entries + `conditional: true` ⚠ an entry that forgets `kind:` clones a plain `passage` and is **never blocked**, silently — the drive asserts the refusal, not the absence of one | `applyExits` clones the kind at hydrate; the class resolves at `/system/transport/idea/<Name>` (transport must be installed; `declareFile` names it) | none |
| the maple | `tap <tree> with <auger>` (existing) | `SapStandard.peers` + `StandMixin.inventory` (existing) | the species row's `window` | the panel is a `props:` of the room; `growthStage: mature` | existing (`requires:` on the tap view) |
| `lint:biome` | `pnpm lint:biome` | — | — | `lint:family` derives the roster from `package.json` | — |
| the water biome | (none — a stub) | — | the row | `BiomeCatalogue` warms by infix | — |
| the places | `goto` / `startLocation` | — | rows | `pack.yaml` `boot:` ⚠ every new room, Locality and Watercourse row must be listed or the drive's `goto` fails on *Template not found* | — |
| the frozen pan (D17) | `pour` / `look` (existing) | the camp's `props:` | `salt-pan` (quarrying) + `brine-cask` | the `trade-quarrying` pack installed (`requires:` + `declareFile`) ⚠ an absent pack leaves the pan a *Template not found* at hydrate — loud | `mustHaveBulkSlot` (existing) |
| the greatcoat (D18) | `open footlocker` / `get` / `wear` (existing) | the dorm room's `props:` with `in:` | the row | `seedBornWith` on first admit ⚠ seed-once: only units admitted after the change | existing |

---

## Acceptance-criteria coverage

| AC | wave(s) | how it is proved |
|---|---|---|
| 1 one expression; sky = catchment | W0, W1, W4 | W4's agreement test; drive 1 |
| 2 derives from geometry, lag, damping | W0 | calibration pins; drive 1 |
| 3 latitude resolved, inherited, readers unchanged at 42 | W0, W1 | D1; the celestial tests stay green; drive 2 |
| 4 season + hemisphere | W0, W1 | `seasonAt` inversion; drive 4 |
| 5 polar case reachable, sky says so | W1, W10 | `SkyReading` polar-night word; drive 3 |
| 6 altitude lowers temperature | W0 | the lapse term; drive 2 |
| 7 phase from local temperature | W3 | phase tests; drive 7 |
| 8 snow accumulates, reconciled after absence | W5 | stateless derivation with the D15 walk-back; drive 6 at the Circle (growing) |
| 9 ground snow = catchment snowpack | W4, W5 | one function; drive 6 vs `analyze water` |
| 10 standing water + vessels freeze; main agrees | W6, W4 | freeze test; conduit both-ends test; drive 5, 10 |
| 11 maple opens on freeze-thaw | W9 | `SapStandard.test`; drive 9 |
| 12 biome agrees; resolve-gate | W1, W2 | root-replacement test; `lint:biome`; drive 11 |
| 13 dormant cold mechanisms engage | W1, W6, W10 | the three 273 K evaporative stalls fire at a cold site (`Maturing` test); drive 8 — the frozen salt pan at the Circle (D17) |
| 14 ice grows, quality, readable | W7 | `Ice.test`; drive 12 at the Circle (growing) + the north (standing) |
| 15 routes report passability | W8, W10 | exit tests; drive 13, 14 — the Circle pass shuts and the Circle crossing opens live |
| 16 amount per place | W3, W10 | intensity tests; drive 15 |
| 17 four levers; continentality case | W0, W10 | calibration pin; drive 15 at `pair/wet` vs `pair/arid` |
| 18 prose and climate never contradict | W5, W10 | new rooms author no weather prose (reviewed); the overlay composes |
| 19 closure physical only | W8, W11 | drive 13 sends `tell` from behind the shut pass |
| 20 test content; no lethal drive path | W10, W0 | the content; the lethality pins; the arrival greatcoat (D18) |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (every wave):** the arithmetic — calibration, phase, snow,
  ice, the freeze, the exits, the maple — each pinned at literal sites
  and literal times (D14 ii). The water pack's and transport's own
  vitest. `pnpm test:near` per wave.
- **Only the drive can prove:** that a real room resolves a real zone's
  latitude through the memo and the async await; that a Locality row the
  pack boots is actually weathered; that a kind row's `conditional`
  survives projection and `go` refuses with the right prose; that the
  south station is lit at polar night; that the maple's panel is reached
  by the affordance walk at the new place; that `tell` works from
  behind the pass.
- **The drive** (`.dirty.`, owned world, `WIRE_BOOT=1`, a free
  `WIRE_PORT`): 1 — `goto` the north station and a Terminus street on
  day 0, `measure temperature` both, assert north < Terminus by > 15 K
  and `trace atmosphere` says *climate* at both; 2 — Terminus (35 m) vs
  the kestrel-road pass (1500 m), same Locality seed is NOT required
  (different Localities), assert colder by ≥ 8 K; 3 — advance three
  one-day steps (actor at Terminus), `goto` the south station, `analyze
  sky` says *polar night*, `look` renders a lit room; 4 — `analyze sky`
  at the south station says *autumn* while Terminus says *spring*; 5 —
  at the north station `pour` water into a mug from a carried flask,
  wait one real minute, `look`: an ice block appears (W6's unit twin
  covers the latent timing; the drive asserts the state change within
  the mug's `τ` — if `τ` exceeds the budget, assert the plateau via
  `measure temperature mug` = 273 K and record it); 6 — **at the Circle
  camp** (D16): `analyze weather` on day 0 records the depth, then after
  each of three one-day jumps (actor parked at Terminus) the depth
  **strictly increases** and the band climbs (dusting → ankle → knee by
  day 3 at ≈ 8 cm/day); `look` at Terminus and at the wet coast reads
  no snow; the north snowfield reads *deep* throughout (D15 exact, not
  sliding); the thaw half is the W5 unit test (R6); 7 — the snowfield
  (snow) vs the wet coast (rain) under their pins, `analyze weather`
  descriptors; 8 — **at the Circle camp** (D17): `pour cask into pan`
  moves litres (`query` the pan's bulk before/after), then `look pan`
  matches `/sits frozen over/` — the evaporative profile refusing in
  its own words; 9 — `tap maple-north with auger` at the high
  sugarbush, state change (the vessel fills); 10 — `analyze water the
  city intake` and `measure temperature` at the Wharfside bank in the
  same minute: `frozen` iff the bank ≤ 273.15; 11 — `measure
  temperature` + `trace atmosphere` at the pass: the trace's value
  equals the measure and names the climate; 12 — **at the Circle**:
  `analyze water` at `circlemere`'s shore on day 0, 1, 2 (the ice
  thickness strictly increases: ≈ 4.8 → 7.0 → 8.9 cm at the expert band,
  the actor's `physics` band raised by the founder's `reserve override`
  if the read needs it, else the band word changes), and `clearmere`
  (bare, `{clear, frozen}`) vs `circlemere` on day 2: *black ice* vs
  *snow-ice*, the bare one thicker; the north `blackmere` reads a thick
  sheet (constant — a sheet since autumn); 13 — **the Circle pass**: `go`
  succeeds on day 0, is `controller-rejected` with the snow prose on
  day 3 and `here` is unchanged — a path shut live; the north snowfield
  pass is shut throughout and the plateau pass open; from behind the
  shut pass `tell founder …` succeeds (AC 19); 14 — **the Circle
  crossing**: `go across` on day 0 refused *would not bear* (`bearsKg`
  58 < 80), on day 1 or later succeeds (`here` = far-bank) — a crossing
  that opens live; at the moor mere: refused *open water*; at
  `northwater`: refused *running*; at `blackmere`: open (thick); 15 —
  `analyze weather` at `pair/wet` vs `pair/arid` (the thirty-day line)
  and `look` at the snowfield camp vs the plateau flat (deep vs a
  dusting). **R1/D18:** a fresh handle opened with no `startLocation`
  (the real arrival path) `look`s in its footlocker and finds the
  greatcoat (`query` the footlocker's contents matches /greatcoat/); if
  the harness's provisioning does not admit a dorm, the build grounds
  `TestHooks.provisionCharacter`'s rehome and asserts on a freshly
  admitted unit instead, saying so in the record. Every step asserts the
  verb was understood AND a state/reading changed; skip-if-not-owned on
  the clock steps. ⚠ Every place the drive reads snow or ice at is
  classified: **growing** (the Circle, days old) or **standing** (the
  north, since autumn — exact and constant by D15); no step asserts
  growth at a standing place.
- **Gates:** the family, with `lint:biome` added; `lint:test-bootstrap`
  for every new test touching the wired runtime.
- **The full suite** once before the MR; `/finalize` again.

---

## Risks & opens

- **R1 — The default world gets a real winter (surfaced requirements
  tension, D1).** At 42°/sea level the coldest clear dawn ≈ 268 K and a
  storm night ≈ 261 K effective. With the shipped thermal dials a naked
  body dies in ~16 h and a 1-clo body is hypothermic — every outdoor
  drive that walks a winter (none does today; the taps drive walks ~40
  days from the equinox) must dress its actor or stand indoors.
  **Decided (the user, 2026-10-10): option b — accept the honest default
  winter AND put a warm coat where new players wake.** The physics and
  the lethality pins (D13) stand; the greatcoat is D18 (a row in the
  dorm footlocker, offered not force-equipped, sized by the derived
  `clo`). The alternative — an `offsetK` on `/world/terminus` to keep
  its old warmth — was rejected as making Terminus the one dishonest
  place in the realm.
- **R2 — AC 3 cannot be literally true for temperature.** D1. If the
  user reads AC 3 as *the numbers at 42 are unchanged*, the requirements
  are wrong, not the plan: AC 1 forbids it.
- **R3 — Snow is stateless, not stamped (D6).** A deviation from the
  requirements' mechanism wording with the same product outcome and
  stronger AC 9. If the user wants the stamped form anyway, W5 becomes
  the soil pattern (≈ 150 more lines, a tri-state, and AC 9 by shared
  inputs rather than identity).
- **R4 — `WaterState` is closed (D8).** Ice is its own record. If the
  user insists on a `WaterState` word, it is a kernel vocabulary edit
  and the fish-tank tolerances must learn to ignore it.
- **R5 — The maple loses its daylength band (D10).** Grain; the sugar
  build may re-add it. Without it the drive cannot reach the window at
  the equinox.
- **R6 — The drive cannot walk a season** (one-day jumps only; no
  runtime weather seam). The Circle (D16) makes *deepens*, *thickens*,
  *shuts* and *opens* live within three one-day steps because its cold
  is days old on day 0. What stays half-live: 6's **thaw** (unit — the
  Circle only gets colder), 13's *open in autumn* (live: the Circle pass
  open on day 0, shut on day 3 — the same exit; the north pass is the
  standing case), 14's *summer flow denied it* (live: the Circle
  crossing refuses on day 0 and bears from day 1; the running reach and
  the moor's open water refuse). The drive record must say so per step.
  ⚠ The Circle's day-0 numbers (D16) are the plan's arithmetic at the
  starting dials; if W0's tuning moves them, the thresholds
  (`closesAboveM 0.2`, the 80 kg body) move with them, not the site.
- **R7 — `Watercourse.site` is authored, not derived (D-L).** A river's
  latitude can disagree with the zones beside it. The drive's AC 1
  check (step 10 at Wharfside, step 1 at the north mere) catches the
  shipped basins; a future Locality→zone link retires the field.
- **R8 — The site memo's first sync read is the default.** The async
  readers await; the sync getters (`airFor`, the floor's snow, the
  vision walk's sky factor) may answer one read at 42° after a cold
  clone. Documented like `weatherLocality()`; the drive's reads are
  verbs (async).
- **R9 — Rejection's elevation changes** (35 → 450 m town, 1500 m
  road): pressure, the taps drive's birch (still open on day 0: ≈ 282 K),
  Rejection's own tests. Re-run the taps and forestry drives attached
  after W10.
- **R10 — Polar summers run warm** (no albedo term). Accepted; stated in
  weather.md. If the user wants a colder arctic summer,
  `climate.poleMeanK` and a `climate.insolationGain` ceiling are the
  dials, not a new term.
- **R11 — `lint:instanceable` 12 and `lint:lib-statics` are full.** Any
  slip (an undeclared row key, a public static on an exported pack
  class) fails CI; the plan names every key. A rise is not an option
  without a caller audit.
- **R12 — The biome gate may find existing debt** (two Rejection rooms
  cite no biome — not a failure; any room citing a path with no row
  IS). Fix the rows, not the gate.
- **R13 — The greatcoat may not reach 2.0 clo honestly.** The shipped
  derivation (`t = mass/(ρ·A)`, wool ρ 1310) gives a 1.1 kg tweed jacket
  well under half a clo on the torso; whole-body 2.0 may need an
  implausible mass. D18 names the fallback (ship the heaviest honest
  coat, record the derived figures, file the under-read against
  textiles) so the build does not stop on it.
- **R14 — `interiorAmount` is `runtimeState` in `Bulkable.fieldMeta`**
  (:534). Rows author it today (`jar-of-barm`, the sugarbush panel), so
  the brine cask relies on the same hydration path; if a `runtimeState`
  key is ever skipped at hydrate the cask arrives empty and drive step 8
  fails loudly at the pour — the Rejection salt flat's spring/hearth is
  the fallback source (`bail`/`boil` are the drilling drive's steps).
- **Open (user's call, not decided here):** none that block the build.
  Two worth a word at review: whether `continentality` should be named
  `damping` to match the requirements' prose (the plan chose the
  physical word; the doc explains both), and whether the `'climate'`
  trace should name the zone or the latitude.

---

## Deferred seams

Each leaves as a slate line, never as a plan section:

- **Shovelled / trodden snow** — `getSnowDepthM()` minus a persisted
  `snowRemovedMm` with a stamp → `locomotion-on-snow` (the slate the
  requirements name).
- **Meltwater into soil / the floor puddle** — soil still discards
  `frozen`; the floor's melt is dropped → `field-substrate-slate` (the
  coverings seam).
- **The thin place over the current; pressure ridges; the harvest** →
  `ice-trade-slate` (now unblocked: ice exists and reads).
- **A Locality that knows its zone** (retires `Watercourse.site`) →
  `biome-normalization-slate` § one latitude, one climate.
- **Polar-night civic lighting at the Locality's own dusk** (the lamp
  schedule arms at the default latitude) → `energy` tail.
- **Rain-on-snow melt** (climate-slate open question 6) — the segment
  walk has both terms in hand; a `climate.rainOnSnowMmPerMm` dial is one
  line → stays on `climate-slate`.
- **A runtime weather-pin seam for drives** (`/auth/test-weather`) →
  testing.md's seams list; not this build.
- **The ice-albedo term** → `climate-slate`.
- **Firn, névé and glaciers** — the D15 perennial cap is the attach
  point (a `perennial` sheet or pack is where a glacier model begins) →
  `climate-slate` § the glacier.
- **The `clo` derivation's under-read of real garments** (R13) →
  `textiles` tail.
- **A clothes press as a real store surface** (the footlocker is the
  seam; the dorm's "wardrobe" is the holodeck door) → `residence` tail.
- **A `frozen` puddle that conducts differently / a frozen `Bulkable`
  surface slot** → `thermal-slate`.

---

## Critical files

Read first, in this order:

1. `docs/requirements/climate-and-water-requirements.md`
2. `packages/server/src/mud/platform/idea/api/WeatherLogic.ts` (:96-290
   the grammar, :365-503 the integral, :789-870 the solar term,
   :1128-1151 the fold)
3. `packages/server/src/mud/platform/idea/api/BiomeLogic.ts` (:259-321,
   :583-687, :843-925 the pressure precedent, :941-982 `outsideKFor`,
   :1072-1120, :1197-1345)
4. `packages/server/src/mud/platform/idea/api/CelestialLogic.ts`
   (:60, :104-220, :624-801)
5. `packages/server/src/mud/lib/biome/Atmospheric.ts:1479-1558` (the
   memo trio to copy)
6. `packages/server/src/mud/lib/zone/Zone.ts` +
   `platform/idea/api/ZoneLogic.ts:139-158`
7. `packages/content/water/src/idea/WatercourseCatalogue.ts` (:123-156,
   :454-598, :802-826, :1183-1205, :1275-1430)
8. `packages/content/water/src/thing/Conduit.ts:300-420`,
   `src/thing/Shore.ts`, `src/idea/reading/WaterReading.ts`
9. `packages/server/src/mud/lib/ground/Floor.ts`,
   `lib/husbandry/Soil.ts:445-635` (the pattern NOT copied, and why)
10. `packages/server/src/mud/lib/thermal/Thermal.ts:889-1000, 1214-1382`
11. `packages/content/transport/src/idea/FordExit.ts`,
    `packages/content/terminus/content/world/terminus/delight-road/exits/delight-ford.yaml`
12. `packages/server/src/mud/lib/husbandry/Producing.ts:300-420, 1010-1053`,
    `platform/idea/species/Species.ts:440-540`
12a. `packages/server/src/mud/lib/maturation/Maturing.ts:295-360, 1185-1235`,
    `lib/maturation/MaturationProfile.ts:30-50`,
    `packages/content/trade-quarrying/content/trade/quarrying/{idea/maturation/brine,thing/salt-pan}.yaml`
12b. `packages/server/src/mud/lib/slot/Wearable.ts:380-450`,
    `lib/slot/Attired.ts:630-700`,
    `packages/content/generic-objects/content/stuff/thing/clothes/tweed-jacket.yaml`,
    `packages/content/eternal-university/content/world/terminus/eternal/duncan-hall/location/dormroom.yaml`
    + `thing/footlocker.yaml`, `packages/server/src/backend/TestHooks.ts:290-375`
13. `packages/content/world-seed/content/world/moor/*.yaml`,
    `stuff/idea/Locality/moor.yaml`, `world-seed/pack.yaml`
14. `packages/wire/tests/taps.dirty.wire.test.ts`,
    `drilling.dirty.wire.test.ts` (the state-change idiom),
    `packages/wire/src/harness/index.ts`
15. `packages/server/scripts/check-ground.ts` (the gate shape for
    `check-biome.ts`), `check-location-graph.ts:328-365`
16. `docs/subsystems/weather.md`, `biome.md`, `watershed.md`,
    `ground.md`, `thermal.md`, `taps.md`, `time.md`, `testing.md`

---

## Drive record

*(appended at build time, not at plan time — the output of
`packages/wire/tests/climate-and-water.dirty.wire.test.ts` against an
owned world: the count, each step's outcome, and what each failure was.
Precedent: `farming-plan.md § Checkpoint A`.)*
