# Weather slate (tail — Waves 1 + 2 shipped; the family coupling deferred)

> **Status: PARTIAL** — waves 1 + 2 shipped (the field, storms, wetness,
> the forecast) → [weather.md](../../subsystems/weather.md)
> **Left:** fog → visibility · snow depth · vector wind · moving fronts ·
> a weather-pin write Api (it blocks the `storm` magic Discipline — all
> four tracked in weather.md's own Still-deferred seams) · the
> legibility gap (no front-arrival event / scene message / `look up`
> surface — weather is "very nearly imperceptible") · forecasting's
> missing stakes (nothing consumes a forecast; no skill differentiation;
> no inferential bridge) · the economic family coupling (correlated
> risk + its hedges, seasonal labour)
> **Size:** a wave

---

## What's on the menu

**Weather with teeth (new consumers):** fog → reduced visibility (senses); snow
depth; hazards (lightning / flood / blizzard / heat wave); **forecasting**
(barometer / "storm's coming" NPCs — free from determinism).

**Ambiance & far economy:** petrichor / falling snow / sun-after-rain → scene
flavor + NPC mood; farming (rain + sun), sailing (wind), travel (a storm gates a
pass — the conveyance / path-constraint family).

## Dealbreakers

*Graduated (doctrine-homing pass, 2026-09-21) → [weather.md § Why the
dealbreakers bind every consumer](../../subsystems/weather.md). The
operational restatement for the family consumers stays below (§ The rule
every family consumer must honour).*

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

- **Temporal — [preservation](./preservation-slate.md).** Store across
  the season you cannot grow in. *The* hedge, and why preservation is
  load-bearing rather than flavour.
- **Sectoral — [mining](../builds/mining-slate.md).** That slate already states
  it: *"**Underground = not `SkyExposed`** — no weather; the surface adit is the
  boundary where weather ends."* **The mine is the counter-cyclical industry.**

> The per-locality climate bias (`ClimateLean` / `Locality._climateLean` /
> `leanOf` → `pickWeighted`) is BUILT, not deferred — see weather.md's
> Wave-2 precedence section. What remains missing is the *authoring* (no
> seed sets a lean) — and note a lean is a weather-**type** distribution
> bias only: it does not shift temperature or season, so it buys flavour
> (a rainy moor) but not the geographic hedge below, which needs
> per-region latitude (celestial's deferred planetary anchor).

### Seasonal labour — the untouched loop

Farming and ranching have violently **seasonal** labour demand (the harvest
spike); winter is when that labour is idle; **mining absorbs it**, being the one
production system weather cannot touch. A real migration cycle riding entirely
shipped substrate — contracts, employment, the gig board — and the
least-explored consequence of having built weather at all.

---

## ⚠ The blocking gap — no time-parameterised resolve

**Resolved (shipped).** `WeatherApi.precipitationBetween(t0, t1, locality)` /
`segmentsBetween(...)` are exactly this design: one async locality+pin
resolve by the caller, then a pure, exact, cap-bounded segment walk —
see [weather.md § the precipitation integral](../../subsystems/weather.md).

---

## Forecasting — shipped further than expected, and still inert

`analyze weather` and the Barometer already forecast / read weather
(shipped — see [weather.md § Read surface](../../subsystems/weather.md)).

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
[farming](./farming-slate.md) (∫weather, GDD) ·
[ranching](../builds/ranching-slate.md) (pasture, thermoregulation, winter feed)
· [fishing](../builds/fishing-slate.md) (the catch distribution — claims first)
· [preservation](./preservation-slate.md) (the spoilage rate) · travel /
crafting / combat (**genuinely zero coupling today** — confirmed by grep, and
`LocomotionMode.costMultiplier` has no production reader at all).

---

*(The "smaller findings" formerly kept here — the altitude/storm skew,
the dead `storm.attractorBias` dial, the conductive lightning attractor,
the shipped wet-firewood coupling, and the missing weather-pin write
Api — now all live in [weather.md](../../subsystems/weather.md), under
*Known quirks*, *Wave-2 consequences*, and *Still-deferred seams*
respectively; the write Api is also carried in this slate's header
`Left`.)*

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
