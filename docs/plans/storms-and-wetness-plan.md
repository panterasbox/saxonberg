# Storms & wetness — phased implementation plan

Weather Wave 2: the coexistence resolve (authored ⊕ procgen), a cross-cutting
**wetness** substrate, and the storm-frontier consequences (electricity
activation, thermal, puddles, lightning, light dimming). Traces to
[storms-and-wetness-requirements.md](../requirements/storms-and-wetness-requirements.md)
(authoritative) and the [slate](../slates/builds/storms-and-wetness-slate.md);
verified against the build-3 code.

## 1. Grounding facts established from the code

Real seams, with the places the code diverges from the requirements'
assumptions called out.

**Weather is a stateless pure field, exactly as the docs say.**
- `lib/weather/WeatherType.ts` — the value-object. `WEATHER_PROFILES` already
  carries `cloud: number` and `precipitation: 'none'|'rain'|'snow'` per type,
  **but they drive nothing** (Wave-1 descriptors). `SEASON_BIAS: Record<Season,
  Partial<Record<WeatherType, number>>>` is the exact shape a climate-lean
  multiplier should mirror. `WeatherSample` has `{ type, segmentIndex,
  deviation, cloud, precipitation, season }` — **no provenance field.**
- `obj/api/WeatherLogic.ts` — the module-private grammar. `computeSample(nowS,
  locality)` is the one compute; `typeForSegment(seg, seed)` →
  `pickWeighted(row, season, roll)` is where a per-locality lean multiplier
  threads in; `localitySeed(locality)` reads only `locality.getAddress()`.
  `deviationFor` / `weatherAt` are sync; `forecastFor` / `sampleFor` async
  (they do the `AddressApi.resolveLocalityFor` walk). `runBoundaryFanout()` is
  the **presence-gated, sky-gated restamp fan-out** (walks
  `ConnectionApi.getAllInteractives()` → avatar room → dedupe →
  `BiomeApi.isSkyExposed` → `restampThermalContentsOf`) reached via a
  **dynamic** `import('../../api/biome')` to keep weather's static graph
  biome-free. This is the model for the puddle/strike cadence.
- `api/weather.ts` — thin facade forwarding to the singleton.
- The segment-boundary schedule is registered in
  `obj/WorldClockRegistry.ts registerSystemSchedules()` via
  `this.every(SEGMENT_LENGTH_S, () => WeatherApi.onBoundary(), { startAt:
  nextBoundary, tag: 'weather:boundary' })` — **the scheduler owns the handle;
  weather stores nothing.** This is the home for any new storm/puddle cadence.

**The biome fold has no pin hook, and it is the only weather→biome edge.**
- `obj/api/BiomeLogic.ts resolveQuantityFor<U>` (line ~568): after
  `runChainWalk` returns `base`, it folds `WeatherApi.deviationFor` iff
  `WEATHER_DEVIATED_FIELDS.has(field) && WeatherApi.isActive() &&
  skyExposedWalk(scope)`, resolving the Locality via
  `AddressApi.resolveLocalityFor`. **There is no authored-pin branch** — the
  fold only ever sees raw procgen. `skyExposedWalk(scope)` (line ~446) is the
  reusable sky gate. The `_atmosphere` per-scope override is authored on
  `AtmosphericMixin` (`lib/biome/`), resolved by the innermost-container-
  outward walk in `runChainWalk`.

**DIVERGENCE 1 — there is no resolved "is it raining here" read, and the one
existing consumer violates the invariant.** `ElectricityLogic.isRainWet(room)`
(line ~339) reads **the raw global procgen field directly**:
`WeatherApi.weatherAt(WorldClockApi.getNow(), null)` — `null` locality (not
per-locality), never through any resolve, and blind to authored pins. This is
precisely the "consumers must read the ONE resolve, never procgen directly"
invariant, currently broken. The build must both **create** the resolve and
**repoint** this consumer onto it.

**Wetness has no home today; the gauge pattern is Reserve, but Reserve is
Creature-only.**
- `lib/reserve.ts` — `ReservedMixin` + `ReserveStored` decomposed-scalar
  persistence (`{capacityValue, currentValue, unit, theme, floorEffect}` in a
  `Record<key, ReserveStored>`, no per-element marshaller). But `ReservedMixin`
  is composed **only on `Creature`** (`lib/creature/Creature.ts:103`) and
  `installBiologicalReserves()` fires in the Creature constructor. It is not
  cleanly composable onto arbitrary objects.
- `lib/material/Tangible.ts` `TangibleMixin` is the "physical object" seam,
  composed onto `Thing`, `Location`, `Vessel`, `Agent`
  (`lib/stuff/Thing.ts:39`, etc.). That is the natural host set for "any object
  can be wet."

**DIVERGENCE 2 — wetness on "any object" wants a dedicated `WetMixin`, not
`ReservedMixin` reuse.** Reserve's Creature-coupling (biological keys,
constructor install, the vitals band feed) does not want to ride onto a cloak.
Borrow the *persistence shape*, not the mixin.

**Reconcile-on-read idiom is well-established and copyable.**
- `lib/metabolism/Metabolic.ts reconcileMetabolism()` (line ~418):
  `metabolicClockStamp === 0` first-touch seed → return;
  `MixinApi.isHasInteractive(self) && self.isLinkdead()` freeze → re-stamp;
  `elapsed <= 0` guard; `elapsed > MAX_REASONABLE_GAP_SEC` far-past drop; else
  sub-step `integrateSlice` in `STEP_SEC` slices under a `MAX_STEPS` cap;
  `_reconciling` reentry guard. `metabolicNowSeconds()` returns `null` when no
  clock (pre-boot/unit tests) → idle. The wetness drying/accrual reconcile
  copies this verbatim.

**Bulk surface pool is ready for puddles.**
- `lib/bulk/Bulkable.ts` — the `surface` affordance:
  `surfaceBulk`/`surfaceMaterial`/`surfaceAmount`/`surfaceCapacity` fields,
  `getBulkAmount('surface')`/`setBulkAmount('surface', Q<'L'>)`/
  `getBulkMaterial('surface')`. `obj/Floor.ts` composes Bulkable+Adornment;
  `seeds/domain/substation/flooded-floor.yaml` authors `surfaceBulk: true,
  surfaceMaterial: /lib/material/bulk/salt-water, surfaceAmount: 40`.
  `ElectricityLogic.conductivePoolOf(floor)` already reads this pool as the
  conductive ground medium — so **rain filling the pool electrifies the ground
  with zero new electricity glue.**

**Thermal has the wet-collapse slot.**
- `lib/thermal/ThermalRegulation.ts effectiveAmbient()` (line ~329, async,
  runs only at re-stamp) resolves ambient/humidity/wind/medium, then applies
  cold-side wind-chill + immersion amplification (`ambientK -=
  WIND_CHILL_PER_MS * windMs * sqrt(immersion)`). A wet-body heat-loss
  amplifier slots here. `restamp()` (line ~400) is the re-anchor.

**DIVERGENCE 3 — light is a SYNC walk; the resolved weather read is async.**
`lib/perception/modalities/VisionModality.ts walkFluxAt()` (line ~268) section
(a) reads `loc.getAmbientFlux()` synchronously; `AmbientLit`
(`lib/perception/AmbientLit.ts`) is the ambient store. Cloud dimming cannot do
an async `resolveLocalityFor` walk on the sync path — it must read a
**cached/restamped cloud factor** (the thermal `lastAmbientK` precedent),
stamped by the boundary fan-out.

**Dials + the count test.**
- `lib/config/AppSettings.ts` `AppSettingKeys` + `config/app-settings.yaml`
  hold the `electricity.*` dials (16 of them). **Weather has no AppSettings
  today** — its dials live in `WEATHER_DEFAULTS`.
  `backend/__tests__/AppSettingsSeeder.test.ts:44` asserts `expect(added).toBe(123)`
  — **any new seeded dial must bump this literal.**

**Declarative demonstrator precedent.** `domain/substation/` — a self-contained
`CartesianZone` (`seeds/domain/substation.yaml`), a `CartesianLocation`
subclass with coords + one bespoke `onEntered` hook, fixtures placed via
`adornments:` (the pooled Floor) and `populates:` (the LiveWire/StunBaton), no
inbound exit (reachable by teleport), an `*.integration.test.ts`. No
`StuffApi.create` in hooks.

## 2. Ambiguities / hard spots flagged up front (with recommended resolutions)

**H1 — Where does the single resolve live, and what is its shape?** Recommend a
new async `WeatherApi.resolveWeatherFor(scope): Promise<ResolvedWeather>` where
`ResolvedWeather = { sample: WeatherSample; provenance: 'pin-frozen' |
'pin-alive' | 'climate-leaned' | 'procgen' | 'biome'; precipitationHere:
'none'|'rain'|'snow' }` (add the interface + provenance union to
`WeatherType.ts`). It resolves the covering Locality once, walks containment
for a scope pin, applies precedence, and pre-applies the sky-gate to
`precipitationHere` (pin branch ungated; procgen branch sky-gated) so the
"precipitation-not-sky-gated-for-pins vs field-deviation-sky-gated" split lives
in **one** place. Every Wave-2 consumer reads this; nobody calls
`weatherAt`/`deviationFor` directly except this resolver and the biome fold.

**H2 — How does the authored pin thread the weather-sample resolve vs the
biome-field fold?** Two readers need pin-awareness: (a) `resolveWeatherFor`
(type/precip/cloud), (b) `BiomeLogic.resolveQuantityFor` (the four deviated
fields). Recommend a **shared sync pin-resolution helper** — a module-private
`resolveWeatherPin(scope, locality)` returning `{type, mode} | null` by the
innermost-container-outward walk (reading a new `_weatherPin` field on
`AtmosphericMixin` hosts) then the Locality tier (`locality.getWeatherPin()`).
`resolveWeatherFor` uses it to pick the branch; `resolveQuantityFor` consults
it so that when a pin applies, the deviation folded is the **pinned type's**
deviation (frozen → static profile deviation; alive → procgen-animated
deviation of the pinned type), not the procgen type's. Keep the fold's cheap
gate ordering (field-in-set → isActive → skyExposed) and insert the pin lookup
only after those pass, so weather-absent/indoor reads stay byte-identical.

**H3 — `frozen` vs `alive` semantics, concretely.** `frozen` → `sample =
staticSampleOf(pin.type)`: the type's `WEATHER_PROFILES[type]` deviation
verbatim, no interpolation, no season animation; provenance `pin-frozen`.
`alive` → compute the procgen `computeSample(now, locality)` for its
**intensity/deviation animation**, then **override `type`/`cloud`/`precipitation`**
to the pinned type's profile while keeping the season/time-of-day-animated
deviation magnitudes scaled toward the pinned type; provenance `pin-alive`.
Simplest defensible v1: `alive` = pinned type's profile deviation scaled by the
procgen segment's interpolation fraction / a season factor, so intensity
visibly varies but the type never leaves `rain`. This is a playtest detail —
keep the exact animation formula a dial, the type-forcing the invariant.

**H4 — Climate lean representation.** Recommend a `_climateLean:
Partial<Record<WeatherType, number>> | null` authored field on `Locality` (the
reserved tier-field), a direct `SEASON_BIAS` sibling. Thread it into
`pickWeighted` by multiplying `SEASON_BIAS[season][type]` by `lean[type]` — so
`computeSample(nowS, locality)` reads `locality.getClimateLean()`.
Deterministic, stateless, cheap (procgen already samples a distribution).
Author-wins is preserved because the lean only shapes the **procgen branch**,
which a pin outranks.

**H5 — Where does wetness live (mixin home + host set)?** Recommend a dedicated
`lib/wetness/Wet.ts WetMixin` (decomposed-scalar persistence à la Reserve: a
`_saturation` scalar + a `wetnessClockStamp`, marshalled directly, no keyed map
needed). Host set = **`Thing` and the creature body** — compose it where
portable objects + bodies live (add it alongside `TangibleMixin` on `Thing`,
and onto `Creature`/`Agent`). **Do not** put it on `Location`/room (a room
isn't "wet" — its floor puddle is bulk state). `MixinApi.isWet(x)` narrows it.
This keeps "a cloak, firewood, a body can be wet" true while rooms stay dry.
Flag for confirmation: composing on `Thing`+`Agent` vs directly on
`TangibleMixin` (the latter would also make Locations wet — reject).

**H6 — Strike cadence without weather state (the no-tick dealbreaker).** A
strike is an **event**, and its cadence must come from the scheduler, not
stored weather. Recommend a dedicated presence-gated recurring **WorldClock
system schedule** registered in `registerSystemSchedules()` (sibling of the
weather boundary schedule, tag `weather:strike`), firing on a sub-segment
interval. Its stateless callback walks occupied SkyExposed scopes, and for each
whose `resolveWeatherFor` type is `storm`, rolls `storm.strikeRate`
(deterministic-or-random — random is fine, a strike need not be reproducible),
and on a hit mints a **transient `EnergizedMixin` source** in the scope (or on
the attractor), fires `ElectricityApi.conduct`, emits an `Audible`
thunderclap, and removes the node. **No weather state stored** — the schedule
handle lives on the scheduler; the callback recomputes everything from
`getNow()`. This mirrors the shipped `onBoundary` fan-out exactly.

**H7 — Puddle accumulation cadence.** Same seam. Recommend the existing
`WeatherApi.onBoundary` presence-gated fan-out **also** drives puddle
accrual/evaporation for occupied scopes, but with the gate widened from
`isSkyExposed` to "**resolved precipitation here is rain**" (so authored indoor
rain accumulates too — source-indifferent). The puddle level is **Floor/bulk
object state** (allowed — not weather state), integrated per boundary from
`resolvePrecipitationHere` (accrue) minus an evaporation term reading resolved
temperature/humidity. Alternative considered: reconcile-on-read on the Floor —
rejected for v1 because floors are read rarely and the boundary fan-out already
exists and is presence-gated. Keep accrual/evaporation magnitudes as
`storm.puddle.*` dials.

**H8 — Cloud dimming on the sync light path (Divergence 3).** Recommend the
boundary fan-out **stamp a cached cloud-dimming factor** onto SkyExposed
AmbientLit scopes (a new sync-readable field or a multiplier applied to the
resolved ambient at restamp), exactly like the weather→thermal `lastAmbientK`
cache-invalidation coupling. `VisionModality.walkFluxAt` then reads the cached
factor sync — no async weather call on the perception hot path.

**H9 — Wetness feed timing.** Wetness has no tick either. Recommend both **fill
and drain integrate lazily in the same `reconcileWetness()`**: on read, over
the elapsed presence-frozen window, accrue if the current environment is wet
(holder's scope precipitation is rain via `resolveWeatherFor`, or co-immersed
in a liquid/conductive pool) and drain otherwise, with drying accelerated by
shelter (not-raining) + warmth (thermal ambient). Reads resolved state, never
procgen.

## 3. Phases (dependency-ordered, each independently testable)

### Phase A — The coexistence resolve + authored pin + climate lean (the spine)
**Outcome.** One resolved atmospheric state folding authored pin →
procgen(climate-lean-biased) → biome, with a provenance tag and a resolved
precipitation read; the biome field-deviation fold made pin-aware while staying
SkyExposed-gated and byte-identical where no pin applies. No consequences yet —
just the resolve every later phase reads. Maps to AC "precedence resolves
correctly," "field deviations stay SkyExposed-gated + byte-identical," and
Constraints "author always wins," "consumers read the ONE resolved state."

**Files to change.**
- `lib/weather/WeatherType.ts` — add `WeatherPin = { type: WeatherType; mode:
  'frozen'|'alive' }`, `WeatherProvenance` union, `ResolvedWeather` interface;
  add a `staticSampleOf(type)` helper's data needs (profiles already present).
- `lib/address/Locality.ts` — add authored `_weatherPin: WeatherPin | null` and
  `_climateLean: Partial<Record<WeatherType,number>> | null` fields +
  getters/setters + `persistentFields`/marshalling (plain-object fields, no
  Quantity).
- `lib/biome/Atmospheric.ts` (`AtmosphericMixin`) — add scope-tier
  `_weatherPin` field + accessor pair (sparse, `null` default; sits beside the
  existing `_temperature`/`_atmosphere` overrides).
- `obj/api/WeatherLogic.ts` — add module-private `resolveWeatherPin(scope,
  locality)` (innermost-outward walk + Locality tier), `staticSampleOf(type)`,
  thread `locality.getClimateLean()` into `pickWeighted`/`computeSample`; add
  gated `resolveWeatherFor(scope)` + `precipitationHere` logic (sky-gate the
  procgen branch, ungate the pin branch).
- `api/weather.ts` — forward `resolveWeatherFor`; keep `weatherAt`/`deviationFor`
  (internal to the resolve + the biome fold only).
- `obj/api/BiomeLogic.ts resolveQuantityFor` — after the existing three-gate
  check, consult `resolveWeatherPin`; when a pin applies, fold the pinned type's
  deviation instead of the procgen `deviationFor`; when none, unchanged.
- `obj/api/AddressLogic.ts` — no change if the covering-Locality lookup
  suffices; confirm the Locality tier pin/lean read is reachable via the
  already-resolved `Locality`.

**Tests.** `api/__tests__/weather.resolve.test.ts` (new — pin frozen never
varies; pin alive forces type, animates intensity; Locality pin covers subtree;
scope pin overrides within a modelled Locality; climate-leaned distribution
shifts snow/storm without a pin; author-wins precedence). Extend
`obj/api/__tests__/BiomeLogic.weather-deviation.test.ts` (pinned scope folds
pinned deviation; **regression: no-pin SkyExposed scope byte-identical to
baseline**; indoor still zero). `api/__tests__/weather.determinism.test.ts`
unaffected (procgen stays pure).

**Risk/decision.** The pin lookup adds an address/containment walk to the biome
fold's hot path. Mitigate by keeping the cheap sync gate ordering first
(field-in-set → isActive → skyExposed) and only doing the pin walk when they
pass — the pin walk reuses the `resolveLocalityFor` result the fold already
computes. Byte-identical regression test is the guard.

### Phase B — The wetness gauge substrate
**Outcome.** Any Thing/body carries a stored, decaying wetness saturation,
reconciled-on-read presence-frozen, surfaced as a band. No consumers yet. Maps
to AC "Wetness: accrues/dries/presence-freeze, surfaced as a band."

**Files to change.**
- `lib/wetness/Wet.ts` (new) — `WetMixin` + `Wet` interface: `_saturation`
  scalar (0..1) + `wetnessClockStamp`, decomposed-scalar persistence (marshalled
  scalars, no keyed map), `getWetness()`/`getWetnessBand()`
  (`dry|damp|wet|soaked`), `wet(delta)`/`reconcileWetness()`; the reconcile
  copies Metabolic's first-touch/linkdead/far-past/`_reconciling` machinery.
  `wetnessNowSeconds()` returns `null` off-clock. Drying rate reads shelter
  (holder scope not raining via `resolveWeatherFor`) + warmth (thermal
  ambient); accrual reads current exposure over the elapsed window.
- `lib/mixin.ts` — register `WetMixin`; `MixinApi.isWet` predicate in
  `api/mixin.ts`.
- `lib/stuff/Thing.ts` — compose `WetMixin` into `Thing` (H5).
- `lib/creature/Creature.ts` — compose `WetMixin` onto the body (alongside
  Reserved).
- `lib/config/AppSettings.ts` + `config/app-settings.yaml` —
  `wetness.dryRatePerHour`, `wetness.shelterFactor`, `wetness.warmthFactor`,
  `wetness.rainAccrualPerHour`, `wetness.immersionSaturation`, band thresholds.
  **Bump `AppSettingsSeeder.test.ts` `added` count.**

**Tests.** `lib/wetness/__tests__/Wet.test.ts` (accrual under exposure; drying
over game-time; shelter/warmth dry faster; first-touch integrates nothing;
linkdead freeze; far-past drop; band mapping). Extend `AppSettingsSeeder.test.ts`
count.

**Risk/decision.** Composing a new mixin onto `Thing` touches every physical
object's field set + persistence. Keep storage sparse (dry = two scalar fields
at defaults, like AtmosphericMixin's `null` slots). Confirm `WetMixin`'s
reconcile is only invoked on read (getter-hooked), never on a tick.

### Phase C — Wetness → electricity + thermal reads
**Outcome.** A wet body reads ~100× lower resistance → deadlier shock, driven
through the shipped `conduct`; a wet body loses heat faster. The dormant
`isRainWet` stopgap is **replaced** and the direct-procgen read (Divergence 1)
is deleted. Maps to AC "Electricity activation," "Thermal."

**Files to change.**
- `obj/api/ElectricityLogic.ts` — rewrite `isWet(body, graph)` to read
  `MixinApi.isWet(body) && body.getWetnessBand() >= wet` (plus the existing pool
  co-immersion path, which now **also accrues** wetness via `body.wet(...)`);
  **delete `isRainWet` and its `WeatherApi.weatherAt(now, null)` global read.**
  `divideCurrent`'s `bodyResistance(mat, wet)` call unchanged.
- `lib/thermal/ThermalRegulation.ts effectiveAmbient()` — after the cold-side
  wind-chill block, if `MixinApi.isWet(host) && host.getWetness()` above a
  threshold, amplify heat loss (scale the wind-chill/immersion term or reduce
  effective insulation) by a `thermal.wetHeatLossFactor` dial; runs at re-stamp
  only (sync per-slice read stays off it).
- `config/app-settings.yaml` — `thermal.wetHeatLossFactor` (bump count).

**Tests.** Extend `obj/api/__tests__/ElectricityLogic.test.ts` (wet body via the
gauge takes markedly more current than dry, end-to-end through `conduct`; **no
procgen read remains**). Extend `lib/thermal/__tests__/ThermalRegulation.test.ts`
(wet body drifts colder faster). `api/__tests__/material-electricity.test.ts`
unaffected (bodyResistance wet-factor unchanged).

**Risk/decision.** Removing `isRainWet` drops the "SkyExposed + procgen rain
wets skin" behavior — but that is the point: rain now wets via the gauge (Phase
D feeds it / Phase B accrues under exposure), and the read is source-
indifferent. Ensure a body standing in procgen rain accrues wetness (via
`reconcileWetness` reading `resolveWeatherFor`) so the electricity path still
lights up under rain — this is the cross-phase invariant test.

### Phase D — Precipitation → Floor puddle accumulation
**Outcome.** Rain (procgen or authored-indoor) fills an occupied scope's Floor
surface-bulk pool; it evaporates over game-time; a source in the pool shocks
bridged bodies with no new electricity glue. Maps to AC "Puddle accumulation,"
"consequence layer is source-indifferent."

**Files to change.**
- `obj/api/WeatherLogic.ts runBoundaryFanout` — widen the per-scope gate from
  `isSkyExposed` to "`resolveWeatherFor(room).precipitationHere === 'rain'`";
  for each such occupied scope, find the room's `Floor` adornment and
  `setBulkAmount('surface', current + accrual)` up to `surfaceCapacity`, with
  fresh-water material if the pool is empty; apply an evaporation decrement
  reading resolved temperature/humidity. Reuse the dynamic `BiomeApi` import.
- `api/bulk.ts` / `lib/bulk/Bulkable.ts` — no new API expected
  (`getBulkAmount`/`setBulkAmount('surface')` exist); confirm capacity clamping.
- `config/app-settings.yaml` — `storm.puddle.accrualLitersPerSegment`,
  `storm.puddle.evaporationFactor`, `storm.puddle.freshWaterMaterialPath` (bump
  count).

**Tests.** `obj/api/__tests__/WeatherLogic.puddle.test.ts` (new — rain accrues a
Floor pool; evaporates over segments; authored-indoor rain accrues too; a
`LiveWire`/strike in the fresh pool shocks a bridged body — the
weather→bulk→electricity loop, reusing `ElectricityLogic` conduct). Extend
`lib/bulk/__tests__/Bulkable.test.ts` only if capacity behavior changes.

**Risk/decision.** The boundary fan-out is per-segment (6 game-hours) — coarse
for a visible puddle. Acceptable for v1 (the pool is a slow sink); note a finer
puddle cadence as a follow-up. Fresh-water pool is weakly conductive (matches
electricity's model: a lethal shock still wants a real source), so the loop
stays honest.

### Phase E — Storm lightning strikes via `conduct`
**Outcome.** A `storm` SkyExposed scope occasionally takes an ambient strike
routed through `ElectricityApi.conduct`; tall/conductive attractors bias it; an
empty scope gets a perceivable thunderclap (harm no-op). The mundane proof of
`Create·Lightning`. Maps to AC "Storm lightning."

**Files to change.**
- `obj/WorldClockRegistry.ts registerSystemSchedules()` — register a second
  `this.every(...)` (tag `weather:strike`, `storm.strikeIntervalS`) targeting a
  stable `WeatherApi.onStormTick()` facade.
- `obj/api/WeatherLogic.ts` — add gated `onStormTick()` + a module-private
  presence-gated fan-out: occupied SkyExposed scopes whose `resolveWeatherFor`
  type is `storm`, roll `storm.strikeRate`; on a hit pick the strike node
  (attractor = tallest/most-conductive occupant, else the scope/floor), mint a
  **transient `EnergizedMixin` source** at high potential,
  `ElectricityApi.conduct(source)`, emit an `Audible` thunderclap (the
  `AudibleMixin.emit` seam), remove the source. Reached via dynamic imports
  (`ElectricityApi`, `BiomeApi`) to keep weather's static graph clean.
- `lib/electricity/` — reuse `EnergizedMixin`; the transient source can be a
  lightweight `Thing + Energized`. **Flag:** mint-and-destruct in the callback
  is imperative, but it is engine-event content (the `conduct`/`SustainedShock`
  precedent), not authored room content, so it is acceptable — the
  declarative-content rule governs *placed* content. Confirm.
- `config/app-settings.yaml` — `storm.strikeRate`, `storm.strikeIntervalS`,
  `storm.strikeVoltage`, `storm.attractorBias` (bump count).

**Tests.** `obj/api/__tests__/WeatherLogic.strike.test.ts` (new — strike fires
`conduct` at a struck storm scope gated by strikeRate with
`_forceTypeForTesting('storm')`; attractor biases the node; empty scope = no
harm but a thunderclap `Audible`; **no weather state stored** — the schedule
handle lives on the scheduler).

**Risk/decision.** The transient-source mint is the one non-authored
construction; justified as engine-event content (the `conduct`/`SustainedShock`
precedent), not authored room content. Presence-gate so an unwatched world does
zero strike work.

### Phase F — Cloud → light dimming
**Outcome.** Overcast/storm dims a SkyExposed scope's light on the sync
perception path. Maps to AC "Light."

**Files to change.**
- `obj/api/WeatherLogic.ts runBoundaryFanout` — for occupied SkyExposed
  AmbientLit scopes, stamp a cached cloud-dimming factor (from
  `resolveWeatherFor(room).sample.cloud`) — a new sync-readable field on the
  scope or a multiplier folded into a cached ambient (H8, the `lastAmbientK`
  precedent).
- `lib/perception/AmbientLit.ts` and/or
  `lib/perception/modalities/VisionModality.ts walkFluxAt` — read the cached
  factor sync and scale the ambient flux contribution.
- `config/app-settings.yaml` — `weather.cloudDimFactor` (max dimming at
  cloud=1) (bump count).

**Tests.** Extend `lib/perception/modalities/__tests__/VisionModality.test.ts`
(a stormed/overcast SkyExposed scope reads dimmer; a clear/indoor scope
unchanged — byte-identical when weather absent).

**Risk/decision.** Stamping a cached factor adds a field to AmbientLit hosts;
keep it a sparse default (1.0 = no dimming), invalidated by the boundary restamp
only, so the perception path stays sync and weather-call-free.

### Phase G — Legibility + doc + demonstrator
**Outcome.** `analyze weather` shows the resolved state **and provenance**;
wetness is inspectable as a band; a reachable demonstrator proves the spine;
weather.md updated to Wave 2 with a wetness section. Maps to AC "Legibility,"
"Doc," and the source-indifference spine invariant end-to-end.

**Files to change.**
- `obj/command/perception/AnalyzeWeatherController.ts` +
  `seeds/.../AnalyzeWeatherController.yaml` — call
  `WeatherApi.resolveWeatherFor`; render provenance
  (`pin-frozen`/`pin-alive`/`climate-leaned`/`procgen`/`biome`); keep the
  deviation/forecast/Locality lines.
- Wetness inspection — surface `getWetnessBand()` on an existing `analyze`/`look`
  seam (extend the analyze family or the object description); band only for
  players, raw value on analyze.
- `domain/moor/` (new content, declarative) — a pinned always-stormy `Locality`
  (Locality-tier `_weatherPin` frozen or alive) + a self-contained
  `CartesianZone`/`CartesianLocation` reachable demonstrator (the substation
  precedent: coords, no inbound exit, integration test) **and** an indoor
  authored-rain "weeping chamber" scope (scope-tier `_weatherPin` +
  `AtmosphericMixin` humidity override) to prove indoor rain accrues wetness +
  a puddle. Fixtures via `adornments:`/`populates:`, no `StuffApi.create`.
- `docs/subsystems/weather.md` — Wave 2 section (coexistence resolve, pins/lean,
  provenance) + a wetness section (or a dedicated `docs/subsystems/wetness.md` if
  it earns one).

**Tests.** Extend `obj/command/perception/__tests__/AnalyzeWeatherController.test.ts`
(provenance shown for pinned vs procgen vs leaned). New
`domain/moor/__tests__/*.integration.test.ts` — **the spine invariant
end-to-end: an authored always-rainy scope and a procgen-rain scope produce the
same wetness accrual and the same puddle/shock.** Content-reachability test (the
substation precedent).

**Risk/decision.** The demonstrator must not wire a cross-area inbound exit
(keeps content standup clean, the treeline/substation precedent) — reachable by
teleport + the integration test.

### Phase H — Cloud forms (descriptive read + the forecast tell)
**Outcome.** The resolved weather gains a **visible cloud form** — a small
`CloudForm` genus vocabulary (`clear` / `cirrus` / `cirrostratus` / `cumulus` /
`stratus` / `nimbostratus` / `cumulonimbus`) **derived** from the resolved type
+ the near-term forecast trend, surfaced through `analyze weather` and a
`look up` sky read, and usable as a **true forecast tell** (our weather is
deterministic → cirrus genuinely presages a front, the observe→predict→verify
inquiry loop). Pure presentation + a pure derivation — **no new weather state,
no vertical-dynamics sim.** The honest line: clouds are *described from* the
resolved type, not *grown from* convection/advection (that stays deferred with
the vector-wind / spatial work). The Wave-1 `cloud: number` scalar becomes the
sky's *coverage*; the genus is its *form*. Maps to AC "Cloud forms" +
"Legibility" (extended).

**Files to change.**
- `lib/weather/WeatherType.ts` — add `CLOUD_FORMS` vocabulary + `CloudForm`
  type + a **pure** `cloudFormFor(sample, forecastTrend)`: form =
  f(current type/tier, and whether the near-term forecast leans toward
  rain/storm over a currently clear/overcast sky → cirrus/cirrostratus
  thickening). `storm → cumulonimbus`, `overcast → stratus`, `rain →
  nimbostratus`, `clear-convective → cumulus`, `clear-before-a-front → cirrus`.
  Altitude tier + heaped/layered fall out of the genus.
- `obj/api/WeatherLogic.ts` — add `cloudForm` to `ResolvedWeather`; a thin
  `skyReadFor(scope)` that reads the near-term `forecastFor` trend (a bounded
  look-ahead over the segment grammar — forecasting is free from determinism)
  to pick a presaging form. Deterministic; no state.
- `obj/command/perception/AnalyzeWeatherController.ts` — render the cloud form
  + the **honestly-hedged** tell ("high wisps — a front *may* be moving in").
- A **`look up` / sky prose detail** — a dynamic room detail (the
  Timekeeping clock-tower-is-prose precedent, `time.md`) reading
  `resolveWeatherFor(here).cloudForm` for SkyExposed scopes; **no new Stuff.**
- `config/app-settings.yaml` — `weather.skyForecastSegments` (the presage
  look-ahead window) if tuned (bump count if seeded).

**Tests.** `lib/weather/__tests__/CloudForm.test.ts` (pure — genus derivation:
storm→cumulonimbus, overcast→stratus, rain→nimbostratus,
clear-trending-rain→cirrus/cirrostratus, clear-staying-clear→clear/cumulus;
deterministic). Extend `AnalyzeWeatherController.test.ts` (the form + hedged
tell render). A sky-detail read test (SkyExposed shows the form; indoor/no-sky
shows nothing).

**Risk/decision.** The tell must stay **honestly hedged** in prose — our
in-game tell is *certain* (deterministic), the real sky's is *probabilistic*;
the prose says "may," teaching the correlation without implying real-world
forecastability (the same honesty caveat as the barometer). **Presentation-only
invariant:** no consequence (light / wetness / electricity) reads the cloud
*form* — those read the resolved *type / cloud-coverage* (the one-resolve
invariant). Cloud forms are a legibility + inquiry surface, never a physics
input.

## 4. Cross-cutting constraints honored (checklist)

- **Weather stays stateless / no-tick / no stored weather state** — no field
  added to `WeatherLogic`; the resolve is pure over `(now, locality, authored
  pins/lean)`; the strike + puddle cadences are **WorldClock scheduler-owned**
  callbacks recomputing from `getNow()`, holding nothing (Phase A/D/E). ✔
- **Wetness is per-object state** — `WetMixin` on Thing/body only,
  decomposed-scalar persistence, never conflated with weather (Phase B). ✔
- **Nothing depends on weather** — `WeatherApi.isActive()` gates every consumer;
  wetness/light/puddle read zero when weather absent; byte-identical regression
  guards (Phase A/F). ✔
- **Consumers read the ONE resolve, never procgen** — `resolveWeatherFor` is the
  sole read; the direct-procgen `isRainWet` stopgap is **deleted** (Phase C);
  the biome fold and the strike/puddle/light consumers all route through the
  resolve. ✔
- **Author always wins** — precedence `pin > procgen(lean-shaped) > biome`; the
  lean only shapes the procgen branch a pin outranks (Phase A). ✔
- **Weather = sky dynamics; authored atmosphere = anywhere** — field-deviation
  fold stays SkyExposed-gated (byte-identical); `precipitationHere` sky-gates
  only the procgen branch, pins ungated (Phase A). ✔
- **Strike routes through shipped `conduct`** — a transient `EnergizedMixin`
  source, no parallel shock path (Phase E). ✔
- **Reconcile-on-read, presence-frozen, no tick** — wetness drying/accrual
  copies the Metabolic idiom (Phase B). ✔
- **Real units under a banded surface** — wetness stores a real saturation;
  players see `damp/wet/soaked`, raw only on `analyze` (Phase B/G). ✔
- **No new module categories** — `WetMixin` is a `lib/wetness/` mixin; pins/lean
  are authored fields + the weather resolve; the strike is an `EnergizedMixin`
  source; all through the Api layer; declarative content only. ✔
- **Content authored + placed declaratively** — pinned Locality/weeping chamber
  via authored fields + `adornments:`/`populates:`, no imperative construction
  (Phase G). ✔

## 5. Decisions (recommended — confirm before coding)

1. **The resolve is `WeatherApi.resolveWeatherFor(scope): Promise<ResolvedWeather>`**
   with `{ sample, provenance, precipitationHere }`; provenance union +
   `ResolvedWeather` added to `WeatherType.ts`. It is the only Wave-2 read;
   `weatherAt`/`deviationFor` stay internal to it + the biome fold. (H1)
2. **Pins are a `_weatherPin: {type, mode}` field on both `AtmosphericMixin`
   (scope tier) and `Locality` (Locality tier)**, resolved by one shared sync
   `resolveWeatherPin` helper; the biome field-fold consults the same helper so
   pinned scopes fold the pinned type's deviation. (H2)
3. **`frozen` = static profile deviation; `alive` = pinned type forced,
   procgen-animated intensity** via a dialed scale — the animation formula is
   playtest, the type-forcing is the invariant. (H3)
4. **Climate lean = `_climateLean: Partial<Record<WeatherType,number>>` on
   `Locality`**, a `SEASON_BIAS` sibling multiplied into `pickWeighted`; shapes
   only the procgen branch. (H4)
5. **Wetness is a dedicated `lib/wetness/Wet.ts WetMixin` (not `ReservedMixin`
   reuse), composed on `Thing` + the creature body**, sparse decomposed-scalar
   persistence, `MixinApi.isWet` narrowing. (H5, Divergence 2)
6. **Electricity's `isRainWet` stopgap is deleted; `isWet` reads the gauge**
   (plus the pool co-immersion path, which also accrues). Rain wets via the
   gauge (source-indifferent), not a direct procgen read. (H9, Divergence 1,
   Phase C)
7. **Strike + puddle cadences are WorldClock scheduler-owned callbacks** (a new
   `weather:strike` schedule; puddle folded into `weather:boundary`),
   presence-gated, stateless — the no-weather-state dealbreaker holds. Puddle
   gate is "resolved rain here" (source-indifferent), not sky-exposure. (H6, H7)
8. **Cloud dimming reads a boundary-restamped cached factor** on AmbientLit
   scopes (the thermal `lastAmbientK` precedent), keeping the sync perception
   path weather-call-free. (H8, Divergence 3)
9. **Every new dial is an `*.*` AppSetting** (`wetness.*`, `storm.*`,
   `weather.cloudDimFactor`, `thermal.wetHeatLossFactor`), and
   **`AppSettingsSeeder.test.ts`'s `added` literal (123) is bumped** each phase
   that adds dials.
10. **The demonstrator is a self-contained pinned moor + an indoor weeping
    chamber**, declaratively authored, reachable-by-teleport with an integration
    test (the substation/treeline precedent), carrying the spine invariant test
    (authored rain ≡ procgen rain downstream).
11. **Cloud forms are a derived descriptive + forecast-tell legibility layer**
    (a `CloudForm` vocabulary + a pure `cloudFormFor` over the resolved type +
    the free deterministic forecast trend), surfaced via `analyze weather` + a
    `look up` sky prose detail — **presentation-only** (no consequence reads the
    form) and **honestly hedged** (our tell is certain, the real sky's is not).
    Clouds *grown from* vertical convection/advection stay deferred with the
    vector-wind / spatial work. (Phase H)

## Cross-references

- Requirements: [storms-and-wetness-requirements.md](../requirements/storms-and-wetness-requirements.md)
- Slate: [storms-and-wetness-slate.md](../slates/builds/storms-and-wetness-slate.md)
- Subsystems: weather, biome, address, electricity, thermal, bulk, reserve,
  metabolism (the reconcile idiom), perception/light.
