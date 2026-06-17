# Implementation Spec — Weather (Wave 1)

**Subsystem:** `lib/weather/` + `api/weather.ts` + the biome-deviation seam + the thermal segment-boundary coupling + the `analyze weather` verb.
**Authoritative scope:** `docs/requirements/weather-requirements.md` (D1–D6). No Wave-2 items.
**Style precedents this build mirrors:** time (`api/worldclock.ts` ↔ `WorldClockLogic` ↔ `WorldClockRegistry`), address (`api/address.ts` ↔ `AddressLogic` ↔ `AddressRegistry`), biome (`api/biome.ts` ↔ `BiomeLogic`).

The defining shape of this build: **weather stores no state.** `weatherAt(time, locality)` is a pure function. There is exactly one piece of protection-needing runtime state — the re-armed boundary `ClockHandle` — and that is a single ref, not a durable index. This drives the central recommendation below (no new Registry; the handle lives on the existing Logic singleton).

---

## 1. File-by-file manifest

### New — `lib/weather/` (one value-object / vocabulary module)

| File | Category | Contents |
|---|---|---|
| `lib/weather/WeatherType.ts` | Named value-object / vocabulary | The module's **one concept** — the weather-grammar vocabulary + data + I/O shapes, **consts and types only, no functions**: the `WeatherType` union (`'clear' \| 'overcast' \| 'rain' \| 'storm' \| 'fog' \| 'snow'`) + `WEATHER_TYPES` validation array; `WeatherTypeProfile` + the `WEATHER_PROFILES` table (per-type deviation targets + cloud/precip descriptors); `WeatherDeviation` (the `{temperature, humidity, wind, pressure}` Quantity bundle); the grammar data tables `TRANSITIONS` + `SEASON_BIAS`; the `WEATHER_DEFAULTS` dials (`SEGMENT_LENGTH_S`, `GLOBAL_BASE_SEED`, `FORECAST_SEGMENTS`, `GRAMMAR_WARMUP`, the interpolation band); and the `WeatherSample` / `WeatherForecast` output shapes. Parallel to `lib/quantity.ts` (Unit union + tag tables) and `THERMAL_DEFAULTS` living inside `lib/thermal/Thermal.ts` — the dials/data live in the subsystem's value-object file, **never a standalone `defaults.ts`** (no such file exists in the codebase). |

**No `WeatherGrammar.ts` / `WeatherField.ts` / `defaults.ts`.** The grammar *functions* (`segmentIndexAt`, `typeForSegment`, `nextTypeFrom`, `hash`, `localitySeed`, `lerpDeviation`) are **module-private non-exported functions inside `WeatherLogic`** — exactly the shape of `BiomeLogic`'s `runChainWalk`/`stepOutward` and `AddressLogic`'s `resolveAddressString`/`stepOutward`. A `lib/` module of *exported* pure functions is forbidden by the export-discipline ESLint rule (`no-restricted-syntax` on `lib/**`) — the only sanctioned exported-function categories are mixin factories, decorators, and sealed-subdir pipeline internals. This is the same call the celestial review made when it folded `solar.ts` onto `CelestialApi`. The output shapes and the vocabulary/data live in the value-object (`WeatherType.ts`); the behavior lives on the logic singleton.

### New — `api/weather.ts` + logic singleton

| File | Category | Contents |
|---|---|---|
| `api/weather.ts` | Api | `WeatherApi` — thin gated forwarding shell ending in `SecurityApi.decorateApiClass(WeatherApi)`. Re-exports the `WeatherSample`/`WeatherForecast` call-shape types from `lib/weather/WeatherType`. |
| `obj/api/WeatherLogic.ts` | Api logic singleton (`/obj/api/weather`) | **Stateless** — mirrors `BiomeLogic` exactly (`extends Idea`, **no** `PostRegistrationMixin`, `dest` is the reload invalidator). Holds the compute as gated methods (`weatherAt`, `deviationFor`, `forecastFor`, `sampleFor`, `onBoundary`, `isActive`) plus the grammar as **module-private** functions. Gated `AnyOf(FromModule('mud/api/weather#WeatherApi'), SelfOnly)`. Holds **no** runtime state — no handle, no index. |

**No `WeatherRegistry`, and no stored handle (Decision D-B, corrected).** Weather stores literally nothing. The segment boundary is a **WorldClock system schedule**, not weather-owned state: `WorldClockApi.every(SEGMENT_LENGTH_S, () => WeatherApi.onBoundary(), { startAt: nextBoundary })`, registered once in `WorldClockRegistry.registerSystemSchedules()`. The **scheduler** owns the `ClockHandle`; `WorldClockApi.every` already re-arms against pause/scale internally; the callback targets the stable `WeatherApi.onBoundary` facade so it survives `WeatherLogic` HMR. This is strictly cleaner than the original "handle on the logic singleton" (which contradicted the stateless-logic-singleton rule) — weather needs no `PostRegistrationMixin`, no registry, and persists nothing, fully honoring the "no stored state" dealbreaker.

### Edited — the biome-deviation seam (D2)

| File | Edit |
|---|---|
| `obj/api/BiomeLogic.ts` | After `runChainWalk` resolves the base value in `resolveQuantityFor` (the four weather-deviated fields: temperature, humidity, wind, pressure — **not** gravity/atmosphere), add the weather deviation for SkyExposed scopes. See §4. Add the soft import seam. |
| `api/biome.ts` | No signature change — the deviation is internal to `BiomeLogic`. |

### New — the verb

| File | Category |
|---|---|
| `obj/command/perception/AnalyzeWeatherController.ts` | Controller (mirror `AnalyzeAddressController`) |
| `cmd/perception/analyze.yaml` | Edit — add the `weather` subcommand block (copy the `address` block) |
| `seeds/lib/messaging/Topic/world.perception.measurement.analyze-weather.yaml` | Topic seed (copy `analyze-address.yaml`) |

### New — boot wiring

| File | Edit |
|---|---|
| `obj/WorldClockRegistry.ts` | In `registerSystemSchedules()` (the empty-in-v1 system-schedule seam, run after the clock is live + the manifest is cloned), register the recurring segment boundary: `WorldClockApi.every(SEGMENT_LENGTH_S, () => WeatherApi.onBoundary(), { startAt: nextBoundaryS })`. The handle is owned by the scheduler (a system schedule, like festival/market resets); weather holds nothing. |

### New — tests (one file per concern; see §8)

```
api/__tests__/weather.determinism.test.ts   (grammar via WeatherApi.weatherAt — pure, pass timeS directly)
api/__tests__/weather.coherence.test.ts      (transition plausibility + season bias, observed through weatherAt)
api/__tests__/weather.locality.test.ts
obj/api/__tests__/BiomeLogic.weather-deviation.test.ts      (+ weather-absent regression guard)
lib/thermal/__tests__/Thermal.weather-coupling.test.ts
obj/command/perception/__tests__/AnalyzeWeather.test.ts
```
(The grammar is exercised through `WeatherApi.weatherAt(timeS, locality)` — a pure function taking `timeS` explicitly, so determinism/coherence tests need no clock and no standalone grammar export.)

### New — docs

```
docs/subsystems/weather.md                         (new)
docs/subsystems/biome.md                           (reconcile getWeather() seam note)
docs/slates/builds/weather-slate.md → docs/slates/tails/weather-slate.md   (move + mark Wave 1 shipped)
```

---

## 2. The weather-type grammar

**Placement:** the **data** below (the `WeatherType` union, `WEATHER_PROFILES`, `TRANSITIONS`, `SEASON_BIAS`, `WEATHER_DEFAULTS`, the `WeatherSample`/`WeatherForecast` shapes) lives in the `lib/weather/WeatherType.ts` value-object. The **functions** below (`segmentIndexAt`, `typeForSegment`, `nextTypeFrom`, `hash`, `localitySeed`, `lerpDeviation`) are **module-private inside `obj/api/WeatherLogic.ts`** (the `BiomeLogic` free-function shape) — never exported from `lib/`.

### Vocabulary (`WeatherType`)
Six types: `clear`, `overcast`, `rain`, `storm`, `fog`, `snow`. Each maps to a `WeatherTypeProfile`:

```ts
interface WeatherTypeProfile {
  type: WeatherType;
  deviation: {
    temperature: Quantity<'K'>;   // signed Δ from biome base
    humidity:    Quantity<'%'>;
    wind:        Quantity<'m/s'>;
    pressure:    Quantity<'Pa'>;
  };
  cloud: number;          // 0..1 descriptor — Wave-2 light seam, drives nothing in Wave 1
  precipitation: 'none' | 'rain' | 'snow';  // descriptor — Wave-2 wetness seam
}
```

Indicative deviation directions (in `WEATHER_PROFILES`/`WEATHER_DEFAULTS` in `WeatherType.ts`, playtest-tuned, **not** a plan decision): `clear` ≈ zero everywhere; `overcast` small −temp, +humidity, near-zero pressure; `rain` −temp, ++humidity, +wind, −pressure; `storm` −−temp, ++humidity, ++wind, −−pressure (a storm reads low on the Barometer — the acceptance criterion); `fog` slight −temp, ++humidity, −wind, ~zero pressure; `snow` −−temp, +humidity, +wind, slight −pressure. Wind stays scalar `Quantity<'m/s'>` (D5).

**Pressure sign is the load-bearing one** (the Barometer acceptance criterion): storm/rain pressure deviations must be negative.

### The segment model (D3)

- **`SEGMENT_LENGTH_S`** — a `WEATHER_DEFAULTS` constant (a few game-hours). A segment is a *piecewise-constant ambient*, which is exactly what thermal's closed-form cooling assumes.
- **Segment index:** `segmentIndexAt(nowS) = Math.floor(nowS / SEGMENT_LENGTH_S)`, where `nowS = WorldClockApi.getNow().rawValue()`. Integer, deterministic, process-independent.
- **Locality seed (D1):** `localitySeed(locality) = locality === null ? GLOBAL_BASE_SEED : hash(locality.getAddress()) ^ GLOBAL_BASE_SEED`. `getAddress()` is the Locality's claimed prefix string. **No field added to `Locality`; `lib/address` untouched.** Different Localities / Region roots get different deterministic weather; `null` → global.
- **Type for a segment:** `typeForSegment(segmentIndex, localitySeed, season)`:
  1. Compute the type from a deterministic anchor at `floor(segmentIndex / GRAMMAR_WARMUP) * GRAMMAR_WARMUP` (an absolute, season-evaluated starting type), then iterate `nextTypeFrom` forward `segmentIndex mod GRAMMAR_WARMUP` steps. O(WARMUP), pure, process-stable (Decision D-C — bounded warmup-anchor).
  2. `roll = hash(segmentIndex, localitySeed)` normalized to [0,1).
  3. `nextTypeFrom(prev, season, roll)` indexes `TRANSITIONS[prev]` (a row of `{type, weight}` weighted by `SEASON_BIAS[season]`) and picks by `roll`. The transition table forbids implausible jumps (`clear → storm` weight 0, must pass through `overcast`/`rain`) — the coherence acceptance criterion.
- **Season:** `CelestialApi.currentSeason(location, time?)`. Season biases `SEASON_BIAS` (snow-leaning weights in winter, zero in summer).
- **Boundary interpolation:** within a segment, the deviation is `lerp(profile(prevSeg).deviation, profile(curSeg).deviation, fracIntoSegment)` over a configurable lead-in band near the boundary (Decision D-D); the *type* is piecewise-constant (the type `analyze weather` reports is the current segment's).

---

## 3. `WeatherApi` surface (exact static signatures)

```ts
export class WeatherApi {
  // ---- pure compute (the core; sync, no I/O) ----
  /** Deterministic weather sample for an instant + locality. Pure. */
  static weatherAt(timeS: Quantity<'s'>, locality: Locality | null): WeatherSample;

  // ---- the biome seam (cheap, SYNC) ----
  /**
   * Per-field additive deviation for an already-resolved locality at a
   * game-time. Returns ZERO (a zero-Quantity in the field's unit) when
   * weather is unconfigured/absent. SYNC: takes a `Locality | null` (the
   * caller resolved the address) — keeps biome's per-read cost to a hash.
   */
  static deviationFor(
    locality: Locality | null,
    field: 'temperature' | 'humidity' | 'wind' | 'pressure',
    timeS: Quantity<'s'>,
  ): Quantity<WeatherFieldUnit>;

  // ---- forecast / sample reads (async; used by the verb) ----
  static forecastFor(scope: Stuff & Container, segments?: number): Promise<WeatherForecast>;
  static sampleFor(scope: Stuff & Container): Promise<WeatherSample>;

  // ---- the seam-active gate (sync, cheap) ----
  /** True iff the WeatherLogic singleton is present (weather configured).
   *  The biome seam checks this BEFORE any address walk. */
  static isActive(): boolean;

  // ---- the segment-boundary callback (called by the WorldClock system schedule) ----
  static onBoundary(): void;

  // ---- test seam ----
  static _resetForTesting(): void;
}
SecurityApi.decorateApiClass(WeatherApi);
```

**Sync vs async rationale:**
- `weatherAt` / `deviationFor` / `isActive` are **sync** — pure deterministic hashing / a presence check. `deviationFor` takes a pre-resolved `Locality | null` so the hash step never does I/O.
- `forecastFor` / `sampleFor` are **async** — full `AddressApi.resolveLocalityFor` walk; only the verb calls them.
- `onBoundary` is the callback the WorldClock system schedule fires; weather arms nothing itself.

**Gating:** every static forwards to `WeatherLogic` (gated `AnyOf(FromModule('mud/api/weather#WeatherApi'), SelfOnly)`). `_resetForTesting` gated by `SecurityApi.assertTestOnly` (the worldclock precedent).

---

## 4. The biome-deviation seam (D2) — exact wiring

**Application point:** in `BiomeLogic`, inside `resolveQuantityFor<U>` (the shared walker used by temperature/pressure/humidity/wind), **after** `runChainWalk` returns `trace.value` and **before** returning. Gravity/atmosphere do not route a deviation (D5). Sketch:

```ts
const base = trace.value;                 // existing
if (WEATHER_DEVIATED_FIELDS.has(fieldBare) && isSkyExposed(scope) && WeatherApi.isActive()) {
  const locality = await AddressApi.resolveLocalityFor(scope);   // see D-E
  const dev = WeatherApi.deviationFor(locality, fieldBare as WeatherField, WorldClockApi.getNow());
  return base.plus(dev);                  // Quantity add; same unit
}
return base;
```

**SkyExposed gating:** reuse the existing sync `isSkyExposed(scope)` in `BiomeLogic` (returns `false` when no biome resolves). Indoor scopes get no deviation.

**Zero-when-absent / byte-identical guarantee:** the weather block is reached only when `isSkyExposed && weather active` (both cheap), so weather-absent does zero extra work. `WeatherApi.deviationFor` returns `Quantity.of(0, unit)` for a clear/zero profile; `base.plus(zero)` must equal `base` bit-for-bit. The **regression guard** (acceptance criterion) asserts: with weather present but clear/disabled, `resolve{Temperature,Humidity,Wind,Pressure}For` returns values byte-identical to a pre-weather snapshot. Provide a clear-profile/disable test path.

**Dependency direction (Decision D-A):** `BiomeLogic` soft-imports `WeatherApi` and calls `deviationFor` (zero when absent). Recommended over a registered deviation-provider hook because it matches the codebase's leaf→Api convention, creates no cycle (`api/weather.ts` → `WeatherLogic` → `lib/weather` + `AddressApi`/`CelestialApi`/`WorldClockApi`; none import `BiomeLogic` — **the build must verify no cycle**), and zero-when-absent keeps it enrichment, not a gate.

---

## 5. The thermal coupling (D4) — cache invalidation, not a tick

No weather state is stored or advanced; the boundary timer tells thermal's stale `lastAmbientK` to refresh by re-resolving the now-weathered ambient.

1. **Boundary schedule (scheduler-owned, weather holds nothing).** Registered once at boot in `WorldClockRegistry.registerSystemSchedules()`: `WorldClockApi.every(SEGMENT_LENGTH_S, () => WeatherApi.onBoundary(), { startAt: nextBoundaryS })` where `nextBoundaryS = (segmentIndexAt(now) + 1) * SEGMENT_LENGTH_S`. It rides game-time (pause/scale propagate, the `every` re-arms internally); the `ClockHandle` lives on the scheduler, not weather. The callback targets the stable `WeatherApi.onBoundary` facade, so it survives `WeatherLogic` HMR.
2. **On fire (`onBoundary`):** run the **presence-gated restamp fan-out** (no self-re-arm — `every` handles cadence):
   ```
   const visited = new Set<string>();
   for (const interactive of ConnectionApi.getAllInteractives()):
     room = interactive's avatar's container
     if (!room || visited.has(room.stuffId)) continue
     visited.add(room.stuffId)
     if (!BiomeApi.isSkyExposed(room)) continue          // sky-gated
     BiomeApi.restampThermalContentsOf(room)             // D-F: gated wrapper over the private fan-out
   ```
   `restampThermalContents()` fans `restamp()` over the room's Thermal contents; `restamp()` calls `BiomeApi.resolveTemperatureFor(container)` which **already** folds the weather deviation (D2), so `lastAmbientK` refreshes. **No weather call is added to thermal's sync read path** — `getTemperature()` stays sync off the refreshed cache.
3. **Presence-gating:** enumerate only `ConnectionApi.getAllInteractives()` (D-G). With no one connected, the loop never runs — zero restamp work (the metabolism/thermal presence-freeze discipline).
4. **Boot:** the system schedule is registered from `WorldClockRegistry.registerSystemSchedules()` after the clock is live. The boundary is **computed from game-time, never persisted**. On crash recovery the clock rewinds slightly and `registerSystemSchedules` re-registers from the recomputed boundary. On HMR of weather files the schedule keeps firing (it's WorldClock-owned) and dispatches through the stable `WeatherApi.onBoundary` facade to the current `WeatherLogic`.
5. **Linkdead / far-past:** inherited from thermal's own guards — `restamp()` re-anchors and thermal's far-past gap guard (`MAX_REASONABLE_GAP_SEC`) drops stale intervals. `getAllInteractives()` returns only live connections, so linkdead rooms are naturally skipped.

---

## 6. Determinism + no-stored-state

- **`weatherAt` is pure:** inputs `(timeS, locality)` only; reads `SEGMENT_LENGTH_S`, the seed constants, the profile/transition tables, and `CelestialApi.currentSeason` (deterministic from time + global latitude). No `Date.now`, no mutable module state. Same inputs ⇒ same output across processes. Tests pin reproducibility and forecastability.
- **No stored weather state — none at all.** `WeatherLogic` is stateless; it holds no handle and no index. The segment-boundary `ClockHandle` lives on the WorldClock scheduler (a system schedule), and even that is re-derived from `getNow()` at boot, never persisted. Weather reconstructs everything from game-time.

---

## 7. `analyze weather` verb (D6)

**YAML** (`cmd/perception/analyze.yaml`, append, copy the `address` block):
```yaml
  weather:
    description: "Report the current weather type, per-field deviations, the covering Locality, and a short forecast"
    controller: perception/AnalyzeWeatherController
    args:
      - name: location
        type: object
        required: false
        default: "here"
        scope: ["reachable"]
        validators:
          - /lib/command/validators/mustBeContainer
```

**Topic seed** (copy `analyze-address.yaml`): `topic: world.perception.measurement.analyze-weather`, `family: world.perception.measurement`, `label: Analyze Weather`.

**Controller** (mirror `AnalyzeAddressController` — same `model.location`/`stuff===null`/`isContainer` guards, same `MessageApi.scene(giver).topic(TOPIC).toSelf(body).send()`). Renders: the current weather **type** + cloud/precip descriptors; the four **per-field deviations** (`q.formatMml()` + friendly tag); the **covering Locality** (`AddressApi.resolveLocalityFor(scope)` → name + claimed address, or "(global / off-grid)"); a short **forecast** (`WeatherApi.forecastFor(scope, FORECAST_SEGMENTS)`). No instrument.

The Barometer needs **no new code** — it already reads `BiomeApi.resolvePressureFor`, now weather-deviated for SkyExposed scopes (a storm reads low). A test asserts this.

---

## 8. Test plan (mapped to acceptance criteria)

| Acceptance criterion | Test file | Assertions |
|---|---|---|
| **Determinism / forecast** | `WeatherGrammar.determinism.test.ts` | `weatherAt(t, loc)` identical on repeated calls; a future segment's type computed now equals the type after advancing the clock; two instances agree. |
| **Coherence / season-bias** | `WeatherGrammar.coherence.test.ts` | Walk N consecutive segments; every transition allowed by `TRANSITIONS` (no `clear→storm` without a step); snow-leaning frequency in winter seed, ~zero in summer. |
| **Per-locality (via AddressApi)** | `weather.locality.test.ts` | Reuse the address roster (`narnia/castle` vs `narnia/wild`); different Localities → different weather; same Locality → same; no covering Locality → global (`null` seed). Driven through `AddressApi.resolveLocalityFor`. |
| **SkyExposed-gated deviation** | `BiomeLogic.weather-deviation.test.ts` | A SkyExposed scope's four resolves reflect the deviation (force a non-clear segment); an indoor scope does not; gravity/atmosphere unaffected. |
| **Weather-absent regression guard** | same file | Weather forced clear/zero (or `_resetForTesting`) ⇒ the four resolves byte-identical to a pre-weather baseline. |
| **Thermal coupling + presence-gating** | `Thermal.weather-coupling.test.ts` | Thermal body in an occupied SkyExposed room; `_advanceForTesting` across a boundary; `lastAmbientK`/`getTemperature` tracked the new weather. Unoccupied room → `restamp` call count 0 (spy). |
| **The verb** | `AnalyzeWeather.test.ts` | `analyze weather` runs with no instrument; output has type + four deviations + covering Locality + forecast; Barometer in a storm reads below biome base pressure. |
| **No-dependency** | regression guard + existing suites | Weather disabled/unconfigured ⇒ full existing suite passes. |

**Test seams:** `WeatherApi._resetForTesting()`; a force-a-segment-type seam (inject a fixed seed or `_setProfileForTesting`) so the deviation/coupling tests are deterministic; reuse `WorldClockApi._advanceForTesting` / `_setNowProviderForTesting`.

---

## 9. Docs

**`docs/subsystems/weather.md`** (new) — intro (biome state vs weather driver; the address dependency); the grammar (vocabulary, profiles, segment model, season bias, interpolation; "no sim, no stored state"); locality binding D1 (seed from `getAddress()`, `null`→global, no field on `Locality`, the reserved authored-climate seam for Wave 2); the biome-deviation seam D2 (where in `BiomeLogic`, the gate, zero-when-absent, soft import, byte-identical guarantee); the thermal coupling D4 (cache-invalidation framing, presence-gated fan-out, boot re-arm, no-weather-call-on-sync-path); the read surface D6; `WeatherApi` + module-placement tables; **Wave-2 seams** (cloud/precip→light/wetness, authored climate field, vector wind, fog→visibility, hazards); cross-refs.

**`docs/subsystems/biome.md`** — reconcile the planned `getWeather()` note: SkyExposedMixin's "Future `getWeather()`" line ships not as a mixin method but as the `BiomeLogic` deviation seam folding `WeatherApi.deviationFor` into `resolve*For`. Update the `SkyExposedMixin` paragraph + the resolve-chain section.

**Slate move:** `weather-slate.md` → `tails/`, "Wave 1 shipped; Wave 2 (teeth) deferred"; open questions annotated resolved-for-Wave-1 (grammar, scalar wind, additive-deviation coupling, Locality tier). (The `finalize` skill performs the slate move at merge; the plan records intent.)

---

## 10. Build sequencing (ordered, each commit independently sound)

1. **`lib/weather/WeatherType.ts` (vocabulary/data) + `WeatherLogic` (compute, stateless) + `api/weather.ts`.** The value-object (types, profiles, transition/season tables, dials, I/O shapes) + the compute (`weatherAt`, `deviationFor`, `forecastFor`/`sampleFor`, `isActive`, `_resetForTesting`) with the grammar as module-private functions + the gated Api shell. `onBoundary` present but not yet wired to a schedule. Ships `weather.determinism.test.ts` + `weather.coherence.test.ts` + `weather.locality.test.ts` (all via `WeatherApi`). No integration into biome/thermal yet. (Folded — the grammar isn't independently exported, so it can't be a separate pre-`WeatherLogic` commit.)
2. **Biome-deviation seam (D2).** Edit `BiomeLogic.resolveQuantityFor`; soft import; verify no cycle. Ships `BiomeLogic.weather-deviation.test.ts` + byte-identical guard.
3. **Thermal coupling (D4).** The `BiomeApi.restampThermalContentsOf(room)` seam (D-F), `WeatherLogic.onBoundary` presence-gated fan-out, the `WorldClockApi.every` system schedule wired into `WorldClockRegistry.registerSystemSchedules()`. Ships `Thermal.weather-coupling.test.ts`.
4. **The verb.** Controller, YAML block, topic seed. Ships `AnalyzeWeather.test.ts`.
5. **Docs.** `weather.md`, biome.md reconciliation, slate move.

Commit 1 has zero integration risk; commit 2 carries the byte-identical guard; commit 3 is the only one touching the boot path.

---

## Locked decisions (build to these)

All seven are decided. No closed scope reopened; these are implementation-level.

- **D-A — biome dependency direction → soft import.** `BiomeLogic` imports `WeatherApi` and calls `deviationFor` (zero-when-absent). The build MUST verify no import cycle (`api/weather.ts` and its transitive deps must not import `api/biome.ts` — the deviation path never reads biome).
- **D-B — no `WeatherRegistry`, no stored handle, stateless `WeatherLogic` (corrected).** Weather holds no runtime state. The segment boundary is a WorldClock **system schedule** (`WorldClockApi.every(...)` registered in `registerSystemSchedules()`); the scheduler owns the handle and re-arms it against pause/scale; the callback targets the stable `WeatherApi.onBoundary` facade for HMR safety. `WeatherLogic` is a stateless logic singleton (`extends Idea`, no `PostRegistrationMixin`), mirroring `BiomeLogic`. (Corrects the planner's "ClockHandle on the logic singleton + re-arm in postRegister," which contradicted the stateless-logic-singleton rule.)
- **D-C — grammar back-walk bound → warmup-anchor.** `typeForSegment` computes from a deterministic seed-anchored base type at `floor(idx / GRAMMAR_WARMUP) * GRAMMAR_WARMUP`, then iterates `nextTypeFrom` forward `idx mod GRAMMAR_WARMUP` steps. O(WARMUP), pure, process-stable. `GRAMMAR_WARMUP` is a `WEATHER_DEFAULTS` dial.
- **D-D — interpolation → configurable lead-in band** (a `WEATHER_DEFAULTS` dial) so the deviation is effectively piecewise-constant within thermal's tolerance between boundaries; the restamp fires at the boundary.
- **D-E — per-locality deviation IS felt through biome's reads (refined from the planner's "global-only-through-biome").** Biome's `resolve*For` is already async, so it resolves the covering Locality and feels per-locality weather. **Gate the order so it costs nothing when off:** the sync checks `WEATHER_DEVIATED_FIELDS.has(fieldBare) && isSkyExposed(scope) && WeatherApi.isActive()` come **first**; only when all pass does it `await AddressApi.resolveLocalityFor(scope)` then `deviationFor`. So weather-absent or indoor = zero extra cost; weather-active + SkyExposed = one address walk (null-fast today, since no Localities are authored). Rationale: faithful to the requirement that per-locality weather is *felt* (not just reported by the verb), forward-clean (authoring a Locality with distinct weather is felt by thermal/instruments with no follow-up), and byte-identical today. Thermal's **sync** read path is untouched — it only ever reads cached `lastAmbientK`; the address walk happens inside the async restamp, never inside `getTemperature`. (§4 already reflects this gated form.)
- **D-F — restamp fan-out seam → gated `BiomeApi.restampThermalContentsOf(room)`** wrapping the existing private `AtmosphericMixin.restampThermalContents` (go through the API layer; do not make the mixin method public).
- **D-G — presence enumeration → `ConnectionApi.getAllInteractives()`** (walk each to its avatar's container, dedupe by stuffId, filter `isSkyExposed`). Zero work when none connected. The build verifies the exact `ConnectionApi` surface for enumerating live interactives + reaching the occupied container.
