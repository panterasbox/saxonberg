# Weather slate (tail — Wave 1 shipped, Wave 2 teeth deferred)

**Status: Wave 1 SHIPPED 2026-06** → [weather.md](../../subsystems/weather.md).
The procedural field (the grammar + segment model + per-locality seed), the
biome-deviation seam (SkyExposed-gated, zero-when-absent), the thermal coupling
(presence-gated segment-boundary restamp), and the `analyze weather` read surface
are live. The four open design questions below are **resolved for Wave 1** (see
annotations). What remains here is the deferred **Wave 2 "teeth"** + far-economy
surface — this slate is now a tail holding that.

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
  cloud), evolving through **plausible transitions** biased by season + locality.
  A weather *grammar*, not a sim.

## Locality — the addressing namespace, NOT zones

The hard structural question — *what scale does weather attach to?* — and the
answer is **not the zone hierarchy.** Weather is a **macro phenomenon**: a closet
is one room; its weather is whatever's happening *outside*, at a larger locality.
So weather can't localize to a `SpatialZone` (geometric ground-truth — coords,
pathfinding), and the zone *hierarchy* is **taxonomic + field-inheritance, not
spatial containment** ("east wing under castle" is a template nesting, not "east
wing is spatially inside castle"). Wrong tree.

The right structure already exists in design: the **delivery / addressing
substrate** (the post-office / utilities work). Its whole thesis is *model
locality, divorced from geometry, as a named nesting tree* — its own rooted path
namespace (`narnia/castle/east-wing/closet`), **diverging from zones**, resolved
by an **upward prefix-walk**, with proposed tiers **Region / Locality / Block /
Spot** and a **field topology** (broadcast over a range). That is exactly weather:

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

So weather invents **no new spatial model of its own** — it's a deferred consumer
of the addressing substrate's Locality tier. **This is the load-bearing
dependency.**

> **NOT the planetary / geometric version.** Geographic variation across
> *distance* (fronts physically moving across lat/long, a globe field) is a
> *separate*, more-ambitious concern needing per-zone latitude/longitude — which
> doesn't exist (celestial uses a single global `CAMPUS_LATITUDE = 42`;
> per-region lat/long is its own deferred feature). The locality question doesn't
> need geometry and shouldn't wait on it; if geographic fronts are ever wanted,
> they ride celestial's deferred planetary anchor, not a weather-specific frame.
>
> *(Model notes corrected here: `SpatialZone` IS the geometric frame; intra-zone
> exits must be cardinal while inter-zone exits may be cardinal **or** semantic —
> so directional adjacency can cross a zone boundary but isn't guaranteed;
> neither gives an inter-zone geographic embedding.)*

Until the addressing substrate exists, the world is geographically a single point
(global sun), so **weather is honestly just global** — one state, season-
modulated. When addressing lands, weather upgrades to per-Locality by walking the
same tree, no weather-specific structure added.

## What's on the menu

**Felt directly (rides designed substrate):** temperature swings (cold snaps /
heat spells → thermoregulation, the headline); wind → wind chill + fire-fanning;
humidity → heat index / wet-bulb (a muggy day = an outdoor steam room); cloud →
dimmer light; rain / snow → **wetness** (wets clothing = the thermal wet-collapse
loop, wets firewood = can't light a fire in the rain, fills rain barrels).

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
2. **Nothing may depend on weather.** Enrichment, never a gate or required input;
   every subsystem must work with weather flat or absent (thermal already does,
   on static biome authoring). No "wait for rain to proceed." The most important
   one.
3. **Stay a thin driver.** Weather doesn't own atmospheric *state* (biome) or
   seasons / day-night (celestial) — it only *deviates* biome's reads.
4. **No global-coordinate dependency, and no inter-zone geographic embedding.**
   Coherence rides the addressing locality tree (logical), never zone geometry.
5. *(Softer)* **game-time, not the in-session clock** (it rains whether you're
   logged in); **ambient, not a chore.**

## Consumers (why it'll get built)

- **Thermal / thermoregulation** — the first forcing consumer (wind chill, heat
  index + wet-bulb read wind + humidity). Thermal is **not blocked** — static
  biome authoring covers it until weather lands.
- **Precipitation → wetness** — rain wets clothing → the thermal wet-collapse
  loop (ties bulkable); the cleanest first effect with teeth.
- **Spoilage / perishability**, **light** (overcast), and downstream
  (travel, NPC mood, farming) — none driving yet.

## Open design questions

**All four resolved for Wave 1** (see [weather.md](../../subsystems/weather.md)):

- **The weather grammar** — ✅ **resolved.** Six-type vocabulary + season-biased
  transition table + warmup-anchor segment model shipped (`lib/weather/WeatherType`
  + `WeatherLogic`). *Deferred (Wave 2):* how **authored** overrides drop into the
  procedural field (the authored climate-bias seam).
- **Wind representation** — ✅ **resolved for Wave 1: scalar** `Quantity<'m/s'>`
  (what thermal's wind-chill consumes). *Deferred:* vector wind + direction
  (sailing, fire spread, scent, precipitation drift).
- **The baseline coupling** — ✅ **resolved: additive per-field deviation** folded
  into biome's SkyExposed reads (D2), zero-when-absent so it perturbs rather than
  overrides the celestial/seasonal baseline.
- **Locality tier** — ✅ **resolved: the seed derives from the covering Locality's
  claimed address** (D1), no field added to `Locality`; weather is felt at whatever
  tier a Locality claims. *Deferred:* the authored climate-bias field on `Locality`.

## Cross-references

- [weather.md](../../subsystems/weather.md) — **the shipped subsystem** (Wave 1).
- [thermal-slate](./thermal-slate.md) — the forcing consumer (the feels-like
  transforms) and where this seam surfaced.
- [biome.md](../../subsystems/biome.md) — the atmospheric state weather drives;
  the `getWeather()` seam (shipped as the `BiomeLogic` deviation seam);
  `SkyExposedMixin` (the weather gate).
- [time.md](../../subsystems/time.md) — the celestial layer (seasons /
  day-night) weather rides on top of.
- [address.md](../../subsystems/address.md) / [delivery-slate](../builds/delivery-slate.md)
  — the **addressing substrate** (the locality namespace weather's coherence rides);
  the addressing foundation shipped, the wider delivery build remains deferred.
