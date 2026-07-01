# Weather substrate (Wave 1)

The atmospheric **dynamics** driver: a procedural, lazy-compute-on-read
weather field that makes biome's static atmospheric *state* vary over
time, coherently, per locality. Weather is to biome what metabolism /
thermal are to vitals — biome is the state, weather is the thin driver
that deviates its reads
([weather-slate](../slates/tails/weather-slate.md)).

The defining property: **weather stores no state.**
`WeatherApi.weatherAt(time, locality)` is a pure deterministic function —
no simulation, no tick, no stored weather state. The same `(time,
locality)` always yields the same weather; tomorrow is computable today.
The only timer is the D4 cache-invalidation restamp, and it advances
nothing.

Source: `lib/weather/WeatherType.ts` (the one value-object),
`obj/api/WeatherLogic.ts` (the stateless logic singleton holding the
grammar as module-private functions), `api/weather.ts` (`WeatherApi`).
The grammar's segment model mirrors `BiomeLogic`'s chain walk beat-for-
beat; read [biome.md](./biome.md) and [address.md](./address.md)
alongside this.

## Wave 1 vs Wave 2

This is **Wave 1**: the procedural field + the thermal coupling (the
forcing consumer already wired to read wind/humidity/temp/pressure
statically) + the `analyze weather` read surface. The "weather with
teeth" consumers — precipitation→wetness, fog→visibility, cloud→light
dimming, snow depth, hazards — are **Wave 2** (the type *carries* cloud /
precipitation as descriptors today, but they drive nothing).

## Module placement

| File | Category | Holds |
|---|---|---|
| `lib/weather/WeatherType.ts` | value-object / vocabulary | the `WeatherType` union + `WEATHER_TYPES`, `WEATHER_PROFILES`, `TRANSITIONS`, `SEASON_BIAS`, `ANCHOR_CANDIDATES`, `WEATHER_DEFAULTS` dials, and the `WeatherSample`/`WeatherForecast` I/O shapes — **consts + types only** |
| `obj/api/WeatherLogic.ts` | Api logic singleton (`/obj/api/weather`) | **stateless** (`extends Idea`, no `PostRegistrationMixin`); the gated compute methods + the grammar as **module-private** functions + a bounded pure-function season memo |
| `api/weather.ts` | Api | `WeatherApi` — thin gated forwarding shell |

The grammar **functions** (`segmentIndexAt`, `typeForSegment`,
`nextTypeFrom`, the hash, the seed, the interpolation) are module-private
inside `WeatherLogic` — the `BiomeLogic`/`AddressLogic` free-function
shape, **not** an exported `lib/` module (the export-discipline rule
forbids that). The dials/data live in the value-object; the behavior
lives on the singleton. There is **no** `WeatherRegistry` and **no**
stored handle — weather holds nothing.

## The grammar

### Vocabulary + profiles

Six coherent types: `clear`, `overcast`, `rain`, `storm`, `fog`, `snow`.
Each maps to a `WeatherTypeProfile` carrying a per-field
`WeatherDeviation` (signed Δ from the biome base) plus the Wave-2
`cloud` (0..1) and `precipitation` descriptors. Direction dials are
playtest, not plan decisions — only the **pressure sign** is load-
bearing: storm/rain deviations are **negative** (a storm reads low on
the Barometer). `clear` is zero everywhere, so a clear segment is
biome-identical.

### The segment model (D3)

Game-time is quantized into **segments** of `SEGMENT_LENGTH_S` (a few
game-hours) — a *piecewise-constant ambient*, exactly what thermal's
closed-form cooling assumes, and the natural restamp boundary (D4).

- **Segment index:** `segmentIndexAt(now) = floor(now / SEGMENT_LENGTH_S)`
  — integer, deterministic, process-independent.
- **Type for a segment** (`typeForSegment`, D-C **bounded warmup-anchor**):
  anchor at `floor(idx / GRAMMAR_WARMUP) * GRAMMAR_WARMUP` to a
  deterministic **calm** absolute type (`ANCHOR_CANDIDATES` — never
  rain/storm/snow), then iterate `nextTypeFrom` forward `idx mod
  GRAMMAR_WARMUP` steps. O(WARMUP), pure, process-stable — so a future
  segment computed now equals the segment after advancing the clock (the
  forecast property).
- **`nextTypeFrom(prev, season, roll)`** indexes `TRANSITIONS[prev]` (a
  weighted row, season-biased by `SEASON_BIAS[season]`) and picks by a
  deterministic roll. The transition table forbids implausible jumps —
  `clear` has no `storm` candidate, so it must pass through
  `overcast`/`rain`; `snow` is reachable only from `overcast`/`snow`
  (the coherence criterion).
- **Season** is global in Wave 1 (single `CAMPUS_LATITUDE`), computed by
  the pure `CelestialApi.seasonFor(EARTH_LIKE, t)`, memoized per
  year-relative segment. `SEASON_BIAS` leans snow heavy in winter and
  **zeroes it in summer**.
- **Interpolation** (D-D): within a segment the deviation lerps from the
  previous segment's targets to the current's over a configurable
  lead-in band (`INTERP_BAND`) measured from the start boundary; outside
  the band it is the current segment's targets. This keeps the deviation
  **continuous across boundaries** (no jump) while the *type* stays
  piecewise-constant (the type `analyze weather` reports is the current
  segment's).

## Locality binding (D1)

The procedural **seed derives from the covering Locality's claimed
address** — `localitySeed(locality) = hash(locality.getAddress()) ^
GLOBAL_BASE_SEED`; `null` (no covering Locality) uses the global seed
alone. **No field is added to `Locality`; `lib/address` is untouched.**
Different Localities / Region roots get different deterministic weather
automatically; sibling scopes under one Locality share it. The covering
Locality is resolved through `AddressApi.resolveLocalityFor` (the seam
the address build reserved) — so with no addressing authored every place
resolves `null` → global, and weather upgrades to per-Locality for free
as Localities land.

The **authored** climate-bias field (Narnia is polar) is the reserved
`Locality` tier-field home for a later wave; Wave 1 needs only
*variation*, which the address prefix supplies.

## The biome-deviation seam (D2)

Weather is **felt through biome's existing reads**. In `BiomeLogic`,
`resolveQuantityFor` folds the weather deviation in **after**
`runChainWalk` returns the base value, for the four weather-deviated
fields (temperature / humidity / wind / pressure) and **SkyExposed scopes
only**. Gravity / atmosphere never route here; the trace variants are
left un-weathered (they report biome-chain provenance — weather is a
separate additive surfaced by `analyze weather`).

```ts
const base = trace.value;
if (
  WEATHER_DEVIATED_FIELDS.has(fieldBare) &&   // cheap
  WeatherApi.isActive() &&                    // cheap (presence check)
  skyExposedWalk(scope)                        // cheap (containment walk)
) {
  const locality = await AddressApi.resolveLocalityFor(scope);  // one walk
  const dev = WeatherApi.deviationFor(locality, fieldBare, WorldClockApi.getNow());
  return base.add(dev);
}
return base;
```

- **Gate ordering (D-E)** — the cheap sync checks come **first**, so
  weather-absent or indoor scopes do zero extra work; only when all
  three pass does it resolve the covering Locality and add the deviation.
  Per-locality weather is *felt* (not just reported) — authoring a
  Locality with distinct weather is picked up by thermal/instruments with
  no follow-up.
- **Zero-when-absent / byte-identical** — `clear` is zero in every field
  and `base.add(zero)` equals `base`; and when weather is unconfigured
  the block is never entered at all (`isActive()` false), so the read is
  the very same instance. The regression guard asserts a SkyExposed
  scope's four resolves are byte-identical to a pre-weather baseline.
- **Soft import (D-A)** — `BiomeLogic` statically imports `WeatherApi`
  and calls `deviationFor` (zero when absent). `api/weather`'s **static**
  import graph never reaches `api/biome` (the lone weather→biome edge,
  `onBoundary`→`BiomeApi`, is a **dynamic** import), so there is no
  static init cycle. Enrichment, not a gate.

### Activation — the singleton's presence is the signal

There is no enable flag. Weather is "configured" **iff the `WeatherLogic`
singleton exists**. `WeatherApi.isActive()` is a non-creating
`findByTemplatePath` check, so a process that never touched weather (most
unit tests) reads zero deviation and biome-identical values — the
no-dependency guarantee. **Boot** forces the singleton into existence
when it computes the first boundary in `registerSystemSchedules`
(`WeatherApi.nextBoundaryAfter`), activating weather.

## The thermal coupling (D4) — cache invalidation, not a tick

No weather state is stored or advanced; the segment-boundary timer tells
thermal's stale cached `lastAmbientK` to refresh by re-resolving the
now-weathered ambient.

1. **Boundary schedule (scheduler-owned).** Registered once at boot in
   `WorldClockRegistry.registerSystemSchedules()`:
   `WorldClockApi.every(SEGMENT_LENGTH_S, () => WeatherApi.onBoundary(),
   { startAt: nextBoundary })`. It rides game-time (pause/scale
   propagate; `every` re-arms internally); the `ClockHandle` lives on the
   **scheduler**, not weather. The callback targets the stable
   `WeatherApi.onBoundary` facade, so it survives `WeatherLogic` HMR. The
   boundary is recomputed from `getNow()` every boot, never persisted.
2. **On fire (`onBoundary`)** — the **presence-gated** restamp fan-out
   (D-G): walk each `ConnectionApi.getAllInteractives()` to its avatar's
   room, dedupe by `stuffId`, sky-gate (`BiomeApi.isSkyExposed`), and
   call `BiomeApi.restampThermalContentsOf(room)` (D-F — the gated
   wrapper over the same fan-out `AtmosphericMixin` runs on an ambient
   shift; the mixin method stays private). `restamp` re-resolves
   `BiomeApi.resolveTemperatureFor`, which **already** folds the weather
   deviation (D2) — so `lastAmbientK` refreshes. `BiomeApi` is reached by
   a **dynamic import** inside `onBoundary` to keep weather's static
   graph biome-free (D-A).
3. **Presence-gating.** With no one connected the loop never runs — zero
   restamp work (the metabolism/thermal presence-freeze discipline).
4. **No weather call on thermal's sync path.** `getTemperature()` stays
   sync off the refreshed `lastAmbientK`; the address walk happens inside
   the async restamp, never inside a sync read.

## Read surface (D6)

`analyze weather [<location>]` — no instrument (parallel to `analyze sky`
/ `analyze atmosphere` / `analyze address`). Reports the current weather
**type** + cloud/precip descriptors, the four **per-field deviations**,
the **covering Locality** (or global / off-grid), and a short
**forecast** (the next `FORECAST_SEGMENTS` segment types — free from
determinism). The existing **Barometer** reads weather-deviated pressure
with no new code (a storm reads low — it already calls
`resolvePressureFor`).

## `WeatherApi` surface

```ts
// pure compute (sync, no I/O)
weatherAt(timeS, locality): WeatherSample

// the biome seam (cheap, SYNC — caller pre-resolved the Locality)
deviationFor(locality, field, timeS): Quantity<WeatherFieldUnit>

// forecast / sample reads (async — full AddressApi walk; the verb)
forecastFor(scope, segments?): Promise<WeatherForecast>
sampleFor(scope): Promise<WeatherSample>

// activation / boundary
isActive(): boolean                       // non-creating presence check
nextBoundaryAfter(timeS): Quantity<'s'>   // boot arms the schedule with this
onBoundary(): void                        // the WorldClock system-schedule callback
```

The three-tier shape mirrors biome/address: `WeatherApi` (thin) →
`WeatherLogic` (`/obj/api/weather`, stateless, gated
`AnyOf(FromModule('api/weather#WeatherApi'), SelfOnly)`). There is no
registry tier — weather is stateless, so the singleton itself is the
whole backend.

## Determinism + no-stored-state

- **`weatherAt` is pure** — inputs `(timeS, locality)` only; reads the
  dials, the profile/transition tables, and the deterministic season. No
  `Date.now`, no mutable module state (the season memo is a pure-function
  cache; the forced-type slot exists only for tests). Same inputs ⇒ same
  output across processes.
- **No stored weather state — none at all.** `WeatherLogic` holds no
  handle and no index. The boundary `ClockHandle` lives on the WorldClock
  scheduler and is re-derived from `getNow()` at boot. Weather
  reconstructs everything from game-time.

## Wave-2 seams

- **cloud / precipitation descriptors** → the light-dimming and wetness
  consumers (rain wetting clothing — the thermal wet-collapse loop — is
  the cleanest first Wave-2 effect).
- **authored per-Locality climate** — the reserved `Locality` tier-field
  home (making a specific Locality polar / arid / stormy).
- **vector wind** (direction) — Wave 1 wind stays a scalar
  `Quantity<'m/s'>` (D5); direction feeds sailing / scent / fire spread.
- **fog → visibility** (senses), **snow depth**, **hazards** (lightning /
  flood / blizzard / heat wave).
- **per-region latitude/longitude + moving fronts** — rides celestial's
  deferred planetary anchor, not weather (Wave 1 season is global).

## Cross-references

- [weather-slate](../slates/tails/weather-slate.md) — the seeding slate;
  this build is its Wave 1. Its open questions (the grammar, scalar wind,
  additive-deviation coupling, the Locality tier) are resolved here for
  Wave 1.
- [address.md](./address.md) — the locality substrate weather binds to
  (`resolveLocalityFor` → `Locality`/`null`; `Locality` as the home for
  the deferred authored-climate field).
- [biome.md](./biome.md) — the atmospheric state weather deviates; the
  `resolve*For` chain, `isSkyExposed` (the indoor gate),
  `restampThermalContentsOf` (the D-F seam).
- [thermal.md](./thermal.md) — the forcing consumer; the cached-ambient +
  `restamp` machinery the coupling rides; the wet / per-region tail Wave 2
  weather feeds.
- [time.md](./time.md) — `WorldClockApi` (game-time + the boundary
  schedule) and `CelestialApi.seasonFor` (season bias).
