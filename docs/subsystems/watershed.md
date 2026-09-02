# Watershed

> **Skeleton (W0).** Each wave fills in its own section as it lands; the
> doc is complete at W10. Built from
> [water-requirements.md](../requirements/water-requirements.md) and
> [water-plan.md](../plans/water-plan.md).

The subsystem that makes water **get somewhere**. Water already had
physics everywhere and weather nowhere: it is bulk matter you can fill,
pour and drink, the body has a `hydration` reserve, soil holds moisture
in litres. What was missing was every connection between them.

One relation supplies all of it: **every place has a position on a
watershed.** Flow, rights, diversion, storage, pollution and hydro power
are readings of that single fact, and the organising primitive
underneath is **gravity** — `mgh`.

## The spine

One edge, repeated at two scales: **precipitation integrates into a
place.** Once for soil (a bed fills from the sky) and once for a
watershed (a reach fills from its catchment).

## The precipitation integral (W1)

`WeatherApi.precipitationBetween(t0, t1, locality)` sums precipitation
over a half-open window and returns **two** figures plus a coverage
report:

| | |
|---|---|
| `liquid` | mm of water that reached the ground over the window |
| `frozen` | mm water-equivalent that fell as snow — banked, not run off |
| `coveredS` | game-seconds actually walked (`< t1 − t0` iff the cap bit) |

It is **exact**, not sampled. `weatherAt` is a pure function of
`(time, locality)` — no tick, no stored weather — so every six-hour
segment between two instants is computable now, and each contributes its
own rate times its own overlap with the window. Integrating the same
window twice gives the same answer; splitting it anywhere and summing
gives the same answer as integrating it whole. That is what lets a place
integrate an absence of arbitrary length on its first read back.

**One walk, two consumers** (plan § P2). Soil multiplies `liquid` by a
bed's land area for litres into the ground (W1); a watershed multiplies
it by a catchment's area for inflow to a reach (W4). Designing it around
one and generalising later is the trap the requirements exist to avoid,
so the walk knows about neither.

### The rate table has to be authored

`WeatherTypeProfile.precipitation` is a **descriptor** — `none` / `rain`
/ `snow`. It says *what* falls, never *how much*, and there is no honest
way to derive one from the other. So
`PRECIPITATION_RATES_MM_PER_HOUR` is the build's one new number, keyed
on the weather **type** rather than the descriptor — a storm and a
shower share the descriptor `rain` and differ by a factor of four.

The figures are **six-hour segment averages**, not instantaneous
intensities: our weather is piecewise-constant, so a `rain` segment
rains for six hours straight. Real moderate rain falls at ~2.5 mm/h but
never for six hours together, so the authored values are the averages
that reproduce a plausible annual total under the shipped transition
grammar. `Precipitation.test.ts` asserts that total as a **climate**
claim, so a dial change that would make the realm a desert or a
rainforest fails rather than passing quietly. Operators override through
`water.rate.{rain,storm,snow}`; the table is the fallback, so the kernel
rains correctly with the `water` pack absent.

### The cap

`WEATHER_DEFAULTS.PRECIPITATION_MAX_SEGMENTS` (120 segments = thirty
game-days) bounds one walk. It is part of the integral rather than a
later optimisation: "arbitrary absence" includes a place nobody has
touched since the epoch, and uncapped, the first read after a long
dormancy replays every segment since `t = 0`. The cap keeps the **tail**
of the window — you come back to recent weather, not ancient weather —
and thirty days is far longer than any bounded sink in the build takes
to saturate, so it costs no observable water.

### What it does not see

A **scope-tier** weather pin (one room overriding within an otherwise
modelled locality) is invisible to the integral, which is keyed by
locality. A **locality**-tier pin is honoured — every segment in the
walk is the pinned type, so a weeping valley rains through the year and
a pinned drought never rains at all. This is a deliberate boundary: a
per-scope walk would need a per-scope caller.

## Rain reaches soil (W1)

`CultivableMixin` gained the sky edge. `mm × m² = litres`, with the
millimetres from the integral and the square metres from the bed's
authored `landRequirementM2` — the footprint land use already charges it
for. **Drought becomes possible for the first time:** before this,
soil moisture only ever went down (drain) or up by hand (`water`).

⭐ A **pot catches nothing**, and that is correct. A pot draws zero land
because a houseplant is furniture rather than production — so it is
watered by hand, exactly as it ships. Ground that *is* production is
ground the sky can find.

Snow does not water the soil. The pack releases later, and elsewhere —
that is the watershed's integral, not the bed's.

### ⚠⚠ The unresolved ref, and why it has its own checkpoint

The covering `Locality` resolves **asynchronously** (an address walk);
the soil reconcile is **synchronous**. So there is a window — sometimes
across a restart — in which the ground genuinely does not know where it
is. This is the build's highest-risk item, and this codebase has been
bitten three times by a cache nothing warms reading null forever while
hand-constructed tests stayed green.

The discipline, in three parts:

1. **Cache the source's IDENTITY, derive its STATE.** The resolve stores
   the locality's *template path* and the sky-exposure flag; how much
   rain fell is derived live on every read.
2. **A checkpoint of its own.** `rainClockStamp` is separate from
   `soilClockStamp`. It opens at first touch — *before* the resolved
   check, so there is a backlog to back-fill — and then does **not
   advance** while the ref is unresolved. The first successful resolve
   therefore integrates the entire absence.
3. **Three states, not two.** `unresolved` reads `null` from
   `rainfallAbsorbedLitres()`. `resolved-to-sheltered` reads `0`. Those
   are different statements, and only the second one means "no rain".

The resolve is triggered on placement (`onMoved`, the shape
`ThermalMixin.restamp` established for `lastAmbientK`) and **kicked
lazily** from the reconcile whenever the ref is still unresolved, so a
bed restored from a snapshot into a room it never "moved" into heals
itself on the next read rather than staying blind forever. Concurrent
callers *coalesce* onto the in-flight promise — holding the promise
rather than a boolean is what makes `await restampWatershed()` mean the
ref is resolved when it returns.

`RainToSoil.test.ts` is written **unresolved-path first**, deliberately:
a test that hand-constructs the resolved value never exercises the path
that fails.

## Elevation (W2)

**`Zone.elevation`** — metres above sea level, inherited through the
ordinary `lookupField` ancestor walk, an authored value anywhere in the
chain winning over anything above it. `ZoneApi.elevationFor(scope)`
resolves it for a place.

### Why the zone, and not the biome

The zone already owns spatial geometry (`cellSize` drives volume,
light-scale and extent) and already does field inheritance. Biome owns
properties of the **air**; elevation is a property of the **ground**.

⭐ But the decisive reason is a **circularity**. `measure altitude`
computes `(P_sea − P_local) / (ρ·g)` from the biome chain's authored
`_pressure` — so altitude was back-computed from a number an author
typed, and putting elevation on the biome too would have given one
physical fact two sources of truth.

So **`_pressure` gained a derive-from-elevation fallback**:

```
P_local = P_sea − ρ · g · h
```

the linear hydrostatic form, chosen precisely because it is the
altimeter's own expression solved the other way. The instrument now
reads back the zone's height exactly. Pressure is the *consequence*, the
altimeter is honest, and `analyze atmosphere` reports the new
provenance `derived from elevation (<zone>)`.

**An authored value still wins.** The derivation fires only when the
chain walk fell all the way through to the **root universe biome** —
`sourcePath === /stuff/idea/biome/universe`, reached as `biome`,
`biome-ancestor` or the terminal `universe` step. That is exactly the
case where the 101 325 Pa in hand is the sea-level *reference* rather
than anything an author said about this place. A detail, room, biome,
biome ancestor or zone that names a pressure short-circuits first.

The weather deviation still rides on top, so a storm reads low over
whatever base the elevation step settled — which is also why a real
barometric altimeter is fooled by weather.

It returns to the reference untouched when there is no elevation, when
the elevation is zero (sea level *is* the reference), or when the medium
has no tabulated density — a vacuum has no barometric anything.

### ⚠ `coords.z` is not elevation

`z` is local and measured in zone **cells** — which floor of a building
you are on. A place's height is `zone elevation + z × cellSize`;
**hydrology reads the zone**, so a third-floor flat and the lobby are
the same point on the watershed, to the pascal. A stairwell is not a
waterfall. Terrain variation *within* a district comes from zoning
finer, which is what zones are for.

### Elevation is a COLD-PATH input (plan § P0)

`lookupField` is async, and nothing in this build reads elevation on a
hot path. It is *compiled* into two artifacts in contexts that are
already asynchronous — **reach ordinals** (at content load) and
**per-structure Δh constants** (at construction) — and every runtime
read is an integer compare or a scalar multiply. There is no
`lookupFieldSync`, no materialization stamp, and **no boot warming** —
the pattern that has failed in this codebase three times, where nothing
warms the roster and it reads null forever, silently.

## Contents

- Elevation — the zone field, and why `coords.z` is not it
- `Watercourse` — topology authored, direction derived
- Flow, snowpack and navigability
- `Conduit` — the conveyance ladder
- Storage and control structures
- Rights
- Contamination and the counterplay ladder
- The three basins

## Where the code lives

| | |
|---|---|
| **kernel — the physics** | zone elevation (`lib/zone/Zone.ts`), the precipitation integral (`api/weather.ts` + `platform/idea/api/WeatherLogic.ts`), the pressure fallback (`platform/idea/api/BiomeLogic.ts`), the rain→soil edge (`lib/husbandry/Cultivable.ts`), the `water-right` document kind (`lib/document/DocumentKinds.ts`) |
| **`water` pack — the works** | `packages/content/water/src/` |
| **content** | the basins and Terminus's works — `world-seed`, `terminus`, `hinkley-hills` |

The split follows arcana's membership test: **a capability pack holds
what other packs' content names.**
