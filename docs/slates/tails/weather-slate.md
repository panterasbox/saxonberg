# Weather slate (tail — Waves 1 + 2 shipped; the family coupling deferred)

> **Header corrected 2026-07-31.** This slate said "Wave 2 teeth deferred."
> **Wave 2 shipped** (MR !141, storms-and-wetness) — weather.md is titled
> *"Weather substrate (Wave 2)"* and lands the coexistence resolve, the
> cross-cutting **wetness** substrate, thermal wet-collapse, Floor puddles,
> storm lightning, cloud light-dimming, and derived cloud forms. What is
> genuinely still deferred is thinner than this doc claims: **fog→visibility,
> snow depth, vector wind, moving fronts** — plus the whole *economic* coupling
> below, which nobody had written down.

**Status: Wave 1 SHIPPED 2026-06** → [weather.md](../../subsystems/weather.md).
The procedural field (the grammar + segment model + per-locality seed), the
biome-deviation seam (SkyExposed-gated, zero-when-absent), the thermal coupling
(presence-gated segment-boundary restamp), and the `analyze weather` read
surface are live. The four open design questions below are **resolved for Wave
1** (see annotations). What remains here is the deferred **Wave 2 "teeth"** +
far-economy surface — this slate is now a tail holding that.

Surfaced while folding wind + humidity into the thermal pass: those atmospheric
properties only matter if something makes them *vary*, and that "something" is
weather. This is a **full build** (new substrate, no shipped subsystem) but a
deferred one — it earns its keep as atmosphere and as thermal's dynamic source,
and the honest plan is to build only the felt layer if/when thermal wants a
dynamic input.

> Already anticipated by the substrate: **`biome.md` plans a `getWeather()`
> method** and has **`SkyExposedMixin`** (the outdoor / indoor weather gate);
> [time.md](../../subsystems/time.md) lists weather as deferred. The seam is
> pre-cut.

---

## The split: atmospheric STATE (biome) vs atmospheric DYNAMICS (weather)

- **Biome / atmosphere (exists)** — the *resolved atmospheric state* at a
  location: temperature, humidity, pressure, medium, light, and (to add) wind.
  The outward-walking resolver gives any room its readings. Static / authored
  per-location today (a jungle authored humid, a peak authored windy).
- **Weather (does not exist)** — the *driver that makes that state dynamic over
  time, coherent across a locality*: storms, fronts, rain / snow, gusts. Weather
  doesn't store the state; it **modulates biome's `getWeather()` reads** over
  time.

Same pattern as the rest of the survival work: **biome is the state, weather is
the driver** — as vitals is the state and metabolism / thermal the drivers, and
biome-medium is the state respiration drives.

## How weather is produced — procedural, NEVER simulated

The foundational decision (settled): weather is a **deterministic procedural
field computed lazily on read from `(game-time, locality, seed)`, layered on the
celestial baseline, with authored overrides** — the store-and-compute pattern of
the watch / vitals / thermal cooling / celestial. **Not a simulation.**

Why never a simulation: weather is **chaotic**. A real atmospheric sim (a)
consumes enormous compute and (b) — the deeper reason — **buys nothing
observable.** A chaotic system's true trajectory diverges (butterfly effect) and
is unknowable in advance, so a perfect sim's output is, to any player,
indistinguishable from a tuned noise field. Infinite cost for an answer no more
"correct" than the fake. So procedural is the *right* answer, not a compromise —
honest abstraction: deliver the *experience* of weather, not a derivation.

Two consequences:

- **Forecasting is free** — computed-from-time means you can compute *tomorrow*:
  barometers, weather-sense, "storm's coming" NPCs all work (a sim couldn't).
- **The craft is coherence** — the one thing procedural must earn that a sim
  gives free: a believable *arc* (a front approaches, clouds, rains, clears). So
  the model is a small **weather-type library** (clear / overcast / rain / storm
  / fog / snow), each a coherent bundle of (temp / humidity / wind / precip /
  cloud), evolving through **plausible transitions** biased by season +
  locality. A weather *grammar*, not a sim.

## Locality — the addressing namespace, NOT zones

The hard structural question — *what scale does weather attach to?* — and the
answer is **not the zone hierarchy.** Weather is a **macro phenomenon**: a
closet is one room; its weather is whatever's happening *outside*, at a larger
locality. So weather can't localize to a `SpatialZone` (geometric ground-truth —
coords, pathfinding), and the zone *hierarchy* is **taxonomic +
field-inheritance, not spatial containment** ("east wing under castle" is a
template nesting, not "east wing is spatially inside castle"). Wrong tree.

The right structure already exists in design: the **delivery / addressing
substrate** (the post-office / utilities work). Its whole thesis is *model
locality, divorced from geometry, as a named nesting tree* — its own rooted path
namespace (`narnia/castle/east-wing/closet`), **diverging from zones**, resolved
by an **upward prefix-walk**, with proposed tiers **Region / Locality / Block /
Spot** and a **field topology** (broadcast over a range). That is exactly
weather:

- **Weather is a field over the addressing locality tree.** A closet (a Spot)
  walks *up* the address tree to the nearest weather-bearing Locality / Region
  and reads its weather; `SkyExposedMixin` then gates indoor (sheltered).
- **Siblings share or differ by their locality node.** East + west wings (same
  castle Locality) → same weather, for free. narnia vs middle_earth (different
  Region roots) → different weather — and "why they differ" is structural: they
  are different roots in the locality tree (different climate sources — planets,
  dimensions, or just authored difference; the tree doesn't care).
- **Weather forgets geometry**, exactly like delivery (a logical overlay,
  sibling of permissions), touching the geometric zone world only via the
  locality it covers. Geometry = the zone; **locality = the address; weather = a
  field over the address, `SkyExposed`-gated.**

So weather invents **no new spatial model of its own** — it's a deferred
consumer of the addressing substrate's Locality tier. **This is the load-bearing
dependency.**

> **NOT the planetary / geometric version.** Geographic variation across
> *distance* (fronts physically moving across lat/long, a globe field) is a
> *separate*, more-ambitious concern needing per-zone latitude/longitude — which
> doesn't exist (celestial uses a single global `CAMPUS_LATITUDE = 42`;
> per-region lat/long is its own deferred feature). The locality question
> doesn't need geometry and shouldn't wait on it; if geographic fronts are ever
> wanted, they ride celestial's deferred planetary anchor, not a
> weather-specific frame.
>
> *(Model notes corrected here: `SpatialZone` IS the geometric frame; intra-zone
> exits must be cardinal while inter-zone exits may be cardinal **or** semantic
> — so directional adjacency can cross a zone boundary but isn't guaranteed;
> neither gives an inter-zone geographic embedding.)*

Until the addressing substrate exists, the world is geographically a single
point (global sun), so **weather is honestly just global** — one state, season-
modulated. When addressing lands, weather upgrades to per-Locality by walking
the same tree, no weather-specific structure added.

## What's on the menu

**Felt directly (rides designed substrate):** temperature swings (cold snaps /
heat spells → thermoregulation, the headline); wind → wind chill + fire-fanning;
humidity → heat index / wet-bulb (a muggy day = an outdoor steam room); cloud →
dimmer light; rain / snow → **wetness** (wets clothing = the thermal
wet-collapse loop, wets firewood = can't light a fire in the rain, fills rain
barrels).

**Weather with teeth (new consumers):** fog → reduced visibility (senses); snow
depth; hazards (lightning / flood / blizzard / heat wave); **forecasting**
(barometer / "storm's coming" NPCs — free from determinism).

**Ambiance & far economy:** petrichor / falling snow / sun-after-rain → scene
flavor + NPC mood; farming (rain + sun), sailing (wind), travel (a storm gates a
pass — the conveyance / path-constraint family).

## Dealbreakers

1. **No simulation, no tick, no stored state.** Procedural, computed-on-read.
   The moment we store-and-tick weather, we've rebuilt the sim we rejected — the
   lazy-compute discipline IS the guardrail.
2. **Nothing may depend on weather.** Enrichment, never a gate or required
   input; every subsystem must work with weather flat or absent (thermal already
   does, on static biome authoring). No "wait for rain to proceed." The most
   important one.
3. **Stay a thin driver.** Weather doesn't own atmospheric *state* (biome) or
   seasons / day-night (celestial) — it only *deviates* biome's reads.
4. **No global-coordinate dependency, and no inter-zone geographic embedding.**
   Coherence rides the addressing locality tree (logical), never zone geometry.
5. *(Softer)* **game-time, not the in-session clock** (it rains whether you're
   logged in); **ambient, not a chore.**

## Consumers (why it'll get built)

- **Thermal / thermoregulation** — the first forcing consumer (wind chill, heat
  index + wet-bulb read wind + humidity). ✅ **shipped.**
- **Precipitation → wetness** — rain wets clothing → the thermal wet-collapse
  loop. ✅ **shipped Wave 2**, along with puddles, lightning and light-dimming.
- **Spoilage / perishability** → now designed in
  [preservation-slate](../builds/preservation-slate.md) · **farming**,
  **ranching**, **fishing** → designed, unbuilt. See below.

---

## The family coupling — weather as the shared exogenous driver **[2026-07-31]**

Weather is **fully built as physics** — Waves 1 and 2 both shipped — and its
remaining problem is not a shortage of effects. It is sharper than that:

> ### Weather is very nearly imperceptible.
> There is **no front-arrival event, no warning, no scene message when the
> weather changes**, and no `look up` surface. The only ways a player learns it
> is raining are to type `analyze weather` or to notice a barometer. A world
> whose sky is a *query* is not a world with weather in it yet.

[fishing-slate](../builds/fishing-slate.md) claims the title of *"the first real
gameplay consumer of weather-as-a-system"*, and it is right to — everything
downstream today is physical (temperature, wetness, puddles, light, shock
conductivity), never a decision.

### Why weather is the coupling, and nothing else is

| Property | Consequence |
|---|---|
| **Exogenous** | no player action changes it — unlike soil, herds, stock, or price. (Literally: **there is no weather write Api at all.**) |
| **Shared** | a pure function of `(time, locality)` — everyone reads the identical value |
| **Forecastable** | segment types are computed by a bounded forward walk, so tomorrow really is computable today |
| **Correlated** | one bad season hits **every surface system at once** |

> **Weather is the only thing in the world that fails everyone simultaneously.**
> Every other scarcity is individual — your field, your herd, your stock. That
> is what makes it the *synchronising* force, and much of what will make a
> shared world feel shared rather than parallel.

### Correlated risk — and where the hedges are

A bad season means farming, ranching and fishing fail *together*, which is what
gives storage, trade and mutual aid a reason to exist.

But **season is global and cannot currently be otherwise.** `seasonAtSegment` is
a pure function of time; latitude never enters, and `CelestialApi.currentSeason`
takes a location only to pick a celestial profile. So there is **no geographic
diversification** — no unaffected region to import from. The hedges are:

- **Temporal — [preservation](../builds/preservation-slate.md).** Store across
  the season you cannot grow in. *The* hedge, and why preservation is
  load-bearing rather than flavour.
- **Sectoral — [mining](../builds/mining-slate.md).** That slate already states
  it: *"**Underground = not `SkyExposed`** — no weather; the surface adit is the
  boundary where weather ends."* **The mine is the counter-cyclical industry.**

> ⚠ **Correction to a common assumption (including an earlier draft of this
> section): the per-locality climate bias is BUILT, not deferred.**
> `ClimateLean` ships, `Locality._climateLean` is a persisted field with
> accessors, and it is wired through `leanOf` → `pickWeighted`. **What is
> missing is the *authoring*** — no seed sets a lean, so the `climate-leaned`
> provenance is unreachable in shipped content and that branch is dead in
> practice.
>
> But note what a lean *is*: a **weather-type distribution bias only.** It
> cannot shift temperature and **does not affect season.** So authoring leans
> buys flavour (a rainy moor, a foggy coast) — it does **not** buy the
> geographic hedge above. Real geographic diversification needs per-region
> latitude, which is parked on celestial's deferred planetary anchor.

### Seasonal labour — the untouched loop

Farming and ranching have violently **seasonal** labour demand (the harvest
spike); winter is when that labour is idle; **mining absorbs it**, being the one
production system weather cannot touch. A real migration cycle riding entirely
shipped substrate — contracts, employment, the gig board — and the
least-explored consequence of having built weather at all.

---

## The push/pull fault line **[the architectural finding]**

The most useful thing to know before adding any consumer:

> **Deviations are PULL and always correct. Consequences are PUSH and
> presence-gated.**

The biome field-fold (`resolveQuantityFor`) is a pure pull, so **an instrument
or NPC reading temperature in an empty room still gets the correct weathered
value.** Deviations are right everywhere, always.

But every *consequence* rides `runBoundaryFanout`, which walks **live
Interactives → their rooms**, deduped. In an unoccupied room, per the code:

| Effect | What happens with nobody there |
|---|---|
| **Puddles** | ⚠ **nothing at all — and there is no reconcile-on-read for bulk.** A full puddle left in a downpour is *exactly as full* a game-week later in blazing sun. **The sharpest hole:** the one weather consequence with no lazy catch-up |
| **Cloud dim** | ⚠ a **stale stamp persists** — a room dimmed to `0.4` and abandoned stays dim forever until someone returns at a segment boundary |
| **Wetness** | correct by construction — the gauge's *drain* is reconcile-on-read, so an absent object dries but never soaks (and "being logged out in a hurricane dries you off") |
| **Thermal restamp** | latency only — it re-resolves on the next thermal read |
| **Lightning** | never fires |

> ⚠ **Doc/code mismatch found 2026-07-31.** weather.md says an empty scope gets
> "a harmless-but-heard flash." **It does not** — `runStormFanout` is seeded
> from live Interactives, so an unoccupied scope is never iterated and **no
> strike is ever minted there.** The "heard regardless" property only covers
> others *in an occupied room*.

**Design consequence for the family:** any new consumer should prefer the
**pull** side. Wetness is the model to copy; puddles are the cautionary tale.

---

## ⚠ The blocking gap — no time-parameterised resolve

The single finding that most affects the husbandry family. weather.md's
governing invariant:

> every consumer reads the ONE resolved state (`WeatherApi.resolveWeatherFor`),
> **never the procgen field directly**

But the three available reads are:

| Call | Time | Authored pins? |
|---|---|---|
| `weatherAt(timeS, locality)` | **any time** | ❌ procgen only |
| `resolveWeatherFor(scope)` | **now only** | ✅ resolved |
| `forecastFor(scope, segments)` | **forward** | ✅ resolved (types only) |

> **Nothing answers "what was the *resolved* weather over the past N days."**

That is exactly what **farming's ∫weather integral**, **ranching's pasture
growth**, and **preservation's spoilage rate** each require — every
reconcile-on-read consumer integrating across a window nobody was present for.
Today such a consumer must either call `weatherAt` (**silently ignoring authored
pins** — a storyteller's storm would not touch the harvest) or accept
present-tense weather only.

**The likely answer is `resolveWeatherFor(scope, atTime)`.** Authored pins are
themselves time-bounded, so the concept is well-defined and only the
implementation is missing. **Settle it before the first husbandry consumer
builds** — all three want it, and each would otherwise invent its own
workaround.

*(Softening note: the invariant is **nearly unexercised** — `resolveWeatherFor`
has exactly one production caller, `analyze weather`. The fan-outs call the
module-private `computeResolved`, and the biome fold calls `deviatedFieldFor`.
So "one resolved state" is architecturally real but not yet load-bearing.)*

---

## Forecasting — shipped further than expected, and still inert

`analyze weather` **already forecasts**: current sample plus the next four
segments (24 game-hours), *types only*. `WeatherApi.forecastFor(scope,
segments)` backs it. And the **Barometer** already reads weather-deviated
pressure, so a storm genuinely reads −2500 Pa.

So anticipation is not missing — **its stakes are.** Three things are absent:

1. **A reason to care.** Nothing downstream consumes a forecast, so knowing
   tomorrow's weather changes no decision.
2. **Skill differentiation.** No proficiency gates or improves weather reading;
   `presageFront` is binary and free. The family's instrument tier wants a
   novice reading the sky in bands and an expert reading further with error
   bars.
3. **The inferential bridge.** Nothing tells a player that falling pressure
   means a storm — it is a real inference, and a genuinely teachable one, but
   nobody ever says so.

> **The missing layer is stakes, not capability.** Weather already tells you
> what is coming. Nothing yet makes you *act* on it.

Forecasts are also an **information good** — the honest intersection with the
aether, which is how you would learn one you did not derive yourself.

---

## The rule every family consumer must honour

Restating **Dealbreaker 2** operationally, because five systems are about to
consume weather:

> ### Weather modulates. It never gates.
> Every consumer must degrade gracefully to *"weather is flat."* No mechanic may
> require a weather state to proceed; a flat-weather world must stay fully
> playable. That is what lets weather be added to any system without that system
> depending on it.

**Status of the designed consumers: all designed, none built.**
[farming](../builds/farming-slate.md) (∫weather, GDD) ·
[ranching](../builds/ranching-slate.md) (pasture, thermoregulation, winter feed)
· [fishing](../builds/fishing-slate.md) (the catch distribution — claims first)
· [preservation](../builds/preservation-slate.md) (the spoilage rate) · travel /
crafting / combat (**genuinely zero coupling today** — confirmed by grep, and
`LocomotionMode.costMultiplier` has no production reader at all).

---

## Smaller findings worth keeping

- **`measure altitude` is silently skewed by storms** — it back-computes
  altitude from pressure, and a storm is −2500 Pa. Arguably a lovely emergent
  truth (altimeters really do this) rather than a bug, but it should be a
  *decision*.
- **Lightning already picks a conductive attractor** — `pickAttractor` takes the
  highest-conductivity object in the room, so **a drawn steel sword is a
  lightning rod.** The closest thing to a weather/combat interaction, and it is
  emergent from material conductivity rather than authored.
- **`storm.attractorBias` is a dead dial** — declared in AppSettings, read by
  nothing.
- **"Wet firewood / the fire coupling" is stale in this slate's deferred list**
  — it shipped as `Combustible.wetPenaltyK`.
- **No weather write Api exists**, which is what blocks the `storm` magic
  Discipline (it has a Grid leaf but no v1 spell, pending "a weather-pin write
  Api").

---

## Cross-references

- [weather.md](../../subsystems/weather.md) — **the shipped subsystem** (Wave
  1).
- [thermal-slate](./thermal-slate.md) — the forcing consumer (the feels-like
  transforms) and where this seam surfaced.
- [biome.md](../../subsystems/biome.md) — the atmospheric state weather drives;
  the `getWeather()` seam (shipped as the `BiomeLogic` deviation seam);
  `SkyExposedMixin` (the weather gate).
- [time.md](../../subsystems/time.md) — the celestial layer (seasons /
  day-night) weather rides on top of.
- [address.md](../../subsystems/address.md) /
  [delivery-slate](../builds/delivery-slate.md) — the **addressing substrate**
  (the locality namespace weather's coherence rides); the addressing foundation
  shipped, the wider delivery build remains deferred.
