# Weather (Wave 1) — requirements

The atmospheric **dynamics** driver: a procedural, lazy-compute-on-read
weather field that makes biome's static atmospheric *state* vary over
time, coherently, per locality. Weather is to biome what metabolism /
thermal are to vitals — biome is the state, weather is the thin driver
that deviates its reads ([weather-slate](../slates/builds/weather-slate.md)).
Its load-bearing dependency — the addressing/locality tree — shipped as
the [addressing foundation](../subsystems/address.md), so weather can
now attach to `Locality` nodes; until Localities are authored, weather
is honestly global, and upgrades per-Locality by reading the same
resolve-walk with no weather-specific structure.

This is **Wave 1**: the procedural field + the thermal coupling (the
forcing consumer that's already wired to read wind/humidity statically)
+ the `analyze weather` read surface. The "weather with teeth"
consumers (wetness, visibility, light dimming, hazards) are Wave 2.

## Goals

- A **deterministic procedural weather field** exists, computed lazily
  on read from `(game-time, locality, seed)` — **no simulation, no
  tick, no stored weather state**. The same `(time, locality)` always
  yields the same weather; tomorrow is computable today.
- Weather is **coherent**: it presents a believable arc (clear →
  overcast → rain → clearing), not independent per-field noise. A small
  **weather-type vocabulary** (clear / overcast / rain / storm / fog /
  snow), each a bundle of per-field deviations, evolving through
  **plausible, season-biased transitions** — a grammar, not a sim.
- Weather is **per-locality**: a scope resolves its covering `Locality`
  (via `AddressApi.resolveLocalityFor`) and reads that locality's
  weather; `null` (no covering Locality) yields the single **global**
  field. Sibling scopes under one Locality share weather; different
  Region roots diverge — for free, off the address tree.
- Weather is **felt through biome's existing reads**: for **SkyExposed**
  scopes only, the resolved temperature / humidity / wind / pressure are
  **deviated** by the active weather. Indoor (non-SkyExposed) scopes are
  unaffected (sheltered). Existing consumers — thermal, the
  Thermometer / Hygrometer / Barometer instruments — see weathered
  values **without changing their call sites**.
- **Thermal is driven dynamically**: a cold snap or heat spell now moves
  thermoregulation. The coupling rides thermal's existing
  cached-ambient + restamp machinery — a **segment-boundary restamp
  fan-out** refreshes thermal's `lastAmbientK` when weather changes,
  **presence-gated** (zero work when no one is around).
- A **read surface**: `analyze weather [<location>]` reports the current
  weather type, its per-field deviations, the covering Locality, and a
  short **forecast** (the next segments' types — free from determinism).
  The existing Barometer reads weather-deviated pressure (a storm reads
  low).
- **Weather absent / flat is correct everywhere.** Every consumer works
  with weather disabled or unconfigured exactly as it does today
  (deviation = zero). Nothing gates on weather.

## Non-goals

Deferred to **Wave 2** (the "teeth"):

- **Precipitation → wetness** — rain wetting clothing (the thermal
  wet-collapse loop), wetting firewood, filling rain barrels. A whole
  new substrate; cleanest first Wave-2 effect.
- **Fog → reduced visibility** (senses), **cloud → dimmer light**
  (light substrate), **snow depth**, **hazards** (lightning / flood /
  blizzard / heat wave). In Wave 1 the weather type *carries* cloud /
  precipitation as descriptors (reported by `analyze weather`) but they
  drive nothing beyond the temp/humidity/wind/pressure deviations.

Deferred **further** (later waves / other builds):

- **Authored per-Locality climate** — making a specific Locality polar /
  arid / stormy. Wave 1's per-locality variation is *procedural* (seed
  derived from the Locality's address); the authored climate-bias field
  lands on `Locality` (the reserved tier-field home) when a content team
  needs it.
- **Vector wind** (direction) — for sailing, scent drift, fire spread,
  precipitation drift. Wave 1 wind stays a scalar `Quantity<'m/s'>`.
- **Far economy** — farming (rain + sun), sailing (wind), travel-gating
  (a storm closes a pass). The conveyance / path-constraint family.
- **Per-region latitude/longitude** and geographic fronts moving across
  distance — rides celestial's deferred planetary anchor, not weather.
  Wave 1 season is global (single `CAMPUS_LATITUDE`).
- The **concrete Saxonberg climate roster** — content authored later.

## Surface decisions

### D1 — The seed derives from the covering Locality's address (no `Locality` field in Wave 1)

**Question:** where does per-locality weather variation come from — an
authored field on `Locality`, a separate weather-config doc, or a
derived seed?

**Decision:** Wave 1 derives the procedural **seed from the covering
Locality's claimed address** (e.g. `hash('narnia/castle')`), plus a
global base seed. No weather field is added to `Locality` and `lib/address`
is untouched. Different Localities / Region roots get different
deterministic weather automatically; `null` (no covering Locality) uses
the global seed.

**Reasoning:** keeps the layering clean (weather depends on address, not
the reverse) and honors "the concrete climate roster is deferred." The
address build explicitly reserved `Locality` as the home for tier-level
fields — so **authored** climate-bias (Narnia is polar) lands there in a
later wave; Wave 1 just needs *variation*, which the address prefix
supplies. (This refines the initial "field on Locality" lean toward the
lighter derived-seed form.)

### D2 — Deviation enters through biome's SkyExposed resolve, flat when absent

**Question:** where is the weather deviation applied so consumers see
weathered values?

**Decision:** weather contributes a **per-field additive deviation**
that the biome resolve (`BiomeApi.resolve{Temperature,Humidity,Wind,Pressure}For`)
folds in **for SkyExposed scopes only** (`BiomeApi.isSkyExposed`). The
deviation is **zero when weather is unconfigured/absent**, so biome
remains exactly correct with no weather. Existing call sites (thermal,
instruments) are unchanged — they read weathered values transparently.

**Reasoning:** this is the seam that makes the thermal coupling free.
`ThermalMixin.restamp` already resolves ambient via
`BiomeApi.resolveTemperatureFor` into its cached `lastAmbientK`; folding
weather into that resolve means a restamp automatically picks up
weather. (The alternative — weather "above" biome, consumers calling a
weather-aware Api — would bypass thermal's restamp and force every
consumer to change call sites.) The dependency direction (biome's
resolve consults a weather seam that returns zero-when-absent) satisfies
the "nothing depends on weather as a gate/required input" dealbreaker —
a soft, flat-by-default seam is enrichment, not a gate. The exact wiring
(biome imports `WeatherApi` vs a registered deviation hook) is the
planner's call; the **contract** is: SkyExposed reads are weathered,
weather-absent ⇒ identical to today.

### D3 — Coherence via a weather-type segment grammar

**Question:** how does a stateless lazy field produce a coherent arc
without storing a Markov chain?

**Decision:** **quantize game-time into weather segments.** For a given
`(segment-index, locality-seed)`, deterministically pick a **weather
type** from the vocabulary, biased by the previous segment's type (which
is itself deterministic from the prior index) and the current
**season** (`CelestialApi.currentSeason`). Each type carries a bundle of
per-field deviation targets; values interpolate across segment
boundaries for smoothness. This yields coherent arcs, free forecasting
(compute future segments), and zero stored state.

**Reasoning:** it's the one mechanism that satisfies coherence *and* the
thermal coupling at once — a segment is a **piecewise-constant ambient**,
which is exactly what thermal's closed-form cooling assumes, and segment
boundaries are the natural restamp points (D4). The weather-type
vocabulary + transition table + per-type deviations are a value-object /
vocabulary in `lib/weather` (the dial-tuning is playtest, not a plan
decision).

### D4 — Thermal coupling: a presence-gated segment-boundary restamp

**Question:** weather changes ambient without a setter call; thermal
reads a cached `lastAmbientK` and won't see the change on its sync read
path. How does thermal track weather?

**Decision:** at each segment boundary, weather fires a **restamp
fan-out** over occupied SkyExposed rooms (reusing
`AtmosphericMixin.restampThermalContents` → `ThermalMixin.restamp`,
which re-resolves the now-weathered ambient into `lastAmbientK`). The
boundary is scheduled via `WorldClockApi.at(nextBoundary, …)`. It is
**presence-gated** — only rooms with a connected occupant are
restamped; zero connection work when no one is around (the
metabolism/thermal presence-freeze discipline).

**Reasoning:** this is **cache invalidation, not a simulation tick** —
no weather state is stored or advanced; the value stays
computed-on-read, and the timer only tells stale downstream caches to
refresh. It is the single point that bends the slate's "no tick"
dealbreaker, and it does so in the narrowest possible way (the thermal
slate already anticipated "biome/weather change → fan-out re-stamp").

### D5 — Scalar wind; weather deviates the four existing biome fields

**Decision:** Wave 1 deviates **temperature, humidity, wind, pressure** —
the biome fields that already exist and already have consumers (thermal
reads wind/temp/humidity; Barometer/Altimeter read pressure). **Wind is
a scalar** `Quantity<'m/s'>` (what thermal's wind-chill consumes);
vector wind is deferred. Cloud / precipitation are **descriptors on the
weather type** (shown by `analyze weather`) that drive nothing in Wave 1.

**Reasoning:** deviating only the already-consumed scalar fields keeps
weather a thin driver over biome's existing surface and lights up the
shipped instruments/thermal for free; the type's cloud/precip
descriptors are the forward seam Wave 2's light/wetness consumers read.

### D6 — Read surface: `analyze weather` + the existing Barometer

**Decision:** a new **`analyze weather [<location>]`** subcommand on the
`analyze` family (no instrument, parallel to `analyze sky` /
`analyze atmosphere` / `analyze address`): reports the current weather
type, the per-field deviations, the covering Locality, and a short
forecast (next-N segment types). The existing **Barometer** reads
weather-deviated pressure (a storm reads low) with no new code — it
already reads `resolvePressureFor`. A dedicated forecast instrument and
"storm's coming" NPC hooks are deferred.

**Reasoning:** the read surface is near-free given determinism;
reusing the `analyze` family + the shipped Barometer matches how biome
and addressing shipped their pedagogical surfaces.

## Constraints

- **Dealbreakers (from the slate), non-negotiable:**
  1. **No simulation, no tick, no stored weather state.** Procedural,
     computed-on-read. The only timer is the D4 cache-invalidation
     restamp (no state advanced).
  2. **Nothing depends on weather.** Enrichment only; every consumer
     correct with weather flat/absent. No gate, no required input.
  3. **Thin driver.** Weather owns no atmospheric *state* (biome) and no
     season/day-night (celestial) — it only *deviates* biome's reads.
  4. **No global-coordinate dependency.** Coherence rides the address
     locality tree (logical), never zone geometry.
  5. **Game-time, not the in-session clock** (it weathers whether you're
     logged in); ambient, not a chore.
- **Compute is lazy + cheap on the read path.** Weather resolution must
  not force biome's (already async) resolve to do heavy work per read;
  the segment compute is a small deterministic function. Thermal's read
  path stays **sync** — weather only enters via the async restamp, never
  thermal's sync `getTemperature`.
- **Module taxonomy.** New `lib/weather/` subsystem (the weather-type
  vocabulary / grammar value-objects) + `api/weather.ts` (`WeatherApi`,
  thin gated forwarding shell ending in
  `SecurityApi.decorateApiClass`); protection-needing state (the
  scheduled boundary timers, cached refs) is `Stuff`-shaped if needed
  (a logic singleton / registry). **No free-floating helper modules.**
  (CLAUDE.md §Module Categories.)
- **Reuse, don't reinvent:** `AddressApi.resolveLocalityFor` /
  `coveringLocalityOf` for locality; `BiomeApi.isSkyExposed` for the
  gate; `CelestialApi.currentSeason` for season bias; `WorldClockApi`
  for game-time + the boundary timer; `AtmosphericMixin.restampThermalContents`
  for the thermal fan-out. (CLAUDE.md §Go Through the API Layer.)
- **Determinism is a property to test**, not just an aspiration:
  `weatherAt(t, locality)` is a pure function of its inputs (game-time,
  locality, seeds) — same inputs ⇒ same output, across processes.

## Acceptance criteria

- **Determinism**: `weatherAt(t, locality)` returns identical results
  for identical inputs; a future time is computable from the present
  (forecast). Tests pin reproducibility and forecastability.
- **Coherence**: tests assert plausible segment-to-segment transitions
  (e.g. clear does not jump straight to storm without an intervening
  step where the grammar forbids it) and season biasing (snow-leaning in
  winter, not summer).
- **Per-locality**: two scopes under different Localities (or Region
  roots) resolve different weather; two scopes under the *same* Locality
  resolve the same weather; a scope with no covering Locality resolves
  the global field. Driven through `AddressApi`.
- **Deviation, SkyExposed-gated**: a SkyExposed scope's
  `resolve{Temperature,Humidity,Wind,Pressure}For` reflects the active
  weather deviation; a non-SkyExposed (indoor) scope does not.
  **Weather-absent ⇒ byte-identical to pre-weather resolution** (a
  regression guard).
- **Thermal coupling**: across a segment boundary, a Thermal object in
  an occupied SkyExposed room sees its `lastAmbientK` / `getTemperature`
  track the new weather (via the restamp fan-out); an unoccupied room
  does no restamp work (presence-gating asserted).
- **Read surface**: `analyze weather [<location>]` runs without an
  instrument and reports type + deviations + covering Locality +
  forecast; the Barometer reads weather-deviated pressure.
- **No-dependency**: with weather disabled/unconfigured, the full
  existing suite (thermal, biome, instruments) passes unchanged.
- **Docs**: a subsystem doc `docs/subsystems/weather.md` exists
  (the grammar, the locality binding, the biome-deviation seam, the
  thermal coupling, the read surface, the Wave-2 seams); the
  weather-slate is updated to mark Wave 1 shipped and moved to `tails/`;
  biome.md's planned `getWeather()` seam note is reconciled with what
  shipped.

## Cross-references

- [weather-slate](../slates/builds/weather-slate.md) — the seeding
  slate; this build is its Wave 1. Its open questions (the grammar,
  wind representation, baseline coupling, locality tier) are resolved
  here for Wave 1.
- [address.md](../subsystems/address.md) — the shipped locality
  substrate weather binds to (`resolveLocalityFor` → `Locality`/`null`;
  `coveringLocalityOf` sync fast-path; `Locality` as the home for the
  deferred authored-climate field).
- [thermal.md](../subsystems/thermal.md) — the forcing consumer; the
  cached-ambient + `restamp` machinery the coupling rides; the wet /
  per-region tail that Wave 2 weather feeds.
- [biome.md](../subsystems/biome.md) — the atmospheric state weather
  deviates; the `resolve*For` chain, `isSkyExposed`, the planned
  `getWeather()` seam; `SkyExposedMixin`.
- [time.md](../subsystems/time.md) — `WorldClockApi` (game-time + the
  boundary timer) and `CelestialApi.currentSeason` (season bias).
