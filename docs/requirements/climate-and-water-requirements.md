# Climate and weather — requirements

**Kind:** platform (kernel-led; first consumers are the maple tap, the
biome chain, and the shipped cold mechanisms)
**Leads from:** [climate-slate](../slates/builds/climate-slate.md) ·
[navigable-water-slate](../slates/builds/navigable-water-slate.md)
(biome chain only) · [biome-normalization-slate](../slates/builds/biome-normalization-slate.md)
(the resolve-gate half)
**First consumer, in this build:** a realm that has a winter *where it
should be cold*, with snow lying on the ground in the arctic and on the
peaks; a sugar maple whose run finally opens on a real freeze-and-thaw; a
biome that agrees with the temperature instead of contradicting it; a
water main that freezes for the same reason the street above it is cold;
and ice thickening on a still reach that a player can *read* — the
substrate a future ice trade will one day harvest.

> ⚠ **Filename kept as `climate-and-water` to preserve the slates'
> inbound links; the build is climate-and-*weather*-led, and the water
> features the first draft bundled in (pump, tide, reach, return-flow)
> are OUT — see Non-goals, each with its own home.**

⭐⭐⭐ **The thesis: this realm has TWO climates and they disagree by nine
Kelvin — and a THIRD, the biome, that knows nothing about either.**

The **sky** says the coldest it ever gets, anywhere, in any season, is
about 276 K. The **catchment** says the winter is 272 K at sea level and
colder with altitude — and the catchment is the one that banks snow,
melts a freshet and freezes a water main. Both are shipped. Both are
read. **A main can freeze today while the street above it is at 285 K.**
And underneath both, a **biome** hands every sky-exposed room a flat
authored 295 K that neither of them ever consulted.

> ⭐⭐ **So this is a UNIFICATION, not a feature** — and the model to
> unify onto is the one with the term the others lack: **where and when
> you are.** The celestial model already computes it for any latitude and
> any day, including the poles. Nothing in the realm currently asks it.

⭐⭐⭐ **And the unification has a destination, not just a tidiness
motive.** This is the root of a dependency *fork* — climate is the shared
prerequisite for **ice** and **whaling** (siblings, not a chain: there is
no "whaling needs ice" edge), and for the cold cases that farming,
husbandry, forestry and textiles already shipped and cannot exercise. The
one thing the flagship trade is blocked on is **latitude** — "the ice
edge is where the whales are, and the ice edge moves." Altitude-only cold
could freeze a high tarn (enough for a future ice harvest) but can never
reach a cold *sea* at a cold *latitude*. **Latitude is therefore
load-bearing, not a nicety.**

---

## What already exists

Verified against the code this cycle, because the draft's premises were
half wrong (three were false).

- **A sky temperature** (`WeatherLogic.solarTemperatureDeviationK`) — a
  continuous cosine on a 295 K base, ±10 K annual / ±4 K diurnal, a 3-hour
  lag so the cold hour is near dawn. Floor anywhere ≈ **276 K**. Keyed on
  one hardcoded `CAMPUS_LATITUDE = 42` for the whole realm.
- **A catchment temperature** (`WatercourseCatalogue.airTemperatureK`) — a
  discrete seasonal mean (winter 272 K at sea level) plus a **lapse rate**
  (6.5 K/km). A genuinely separate code path; its own comment says "not
  the same question as how warm is the room by the river."
- ⭐ **The celestial model is already latitude-general** and already
  answers the **polar** limits honestly (a whole rotation of day, or
  none). `CelestialProfile` carries the axial tilt; every call site passes
  the hardcoded 42. Latitude is a parameter waiting for a caller.
- **Elevation** is a `Zone` field with an ancestor walk (`ZoneApi.elevationFor`).
- **Season** is global day-of-year arithmetic (`seasonFor`) feeding the
  catchment's table and the weather grammar's `SEASON_BIAS`. No latitude
  sign — the whole realm shares one calendar winter.
- **Precipitation is per-place by *occurrence*, global by *intensity*.** A
  Locality's weather `lean` already biases how often each weather type
  falls (wet vs arid — live today), and a Locality *pin* can force one; the
  mm/hr **rate** table is realm-wide. Latitude touches no precipitation.
  So wet-vs-arid by frequency is free; a tunable amount is the one small
  addition.
- **The biome** is a leaf data row (`lib/biome/Biome`), an **OPEN**
  vocabulary (a pack ships one with zero kernel edits), warmed by a
  structural selector not a boot allowlist. It carries a flat
  `_defaultTemperature` and **no latitude, season, or geographic term**;
  sky-exposed temperature today is the biome constant *plus* a weather
  deviation bolted on. Sky-exposure is `BiomeApi.isSkyExposed`, already
  answerable from the floor and the soil.
- **The ground** is a `Floor` fixture minted on every `Location`, with a
  derived ten-word kind and a transient **surface overlay** (the puddle,
  in its `surface` bulk slot). The floor already knows if it is
  sky-exposed. ⭐ `ground.md` already names the open seam: *"coverings — a
  rug, snow over paving — a floor concern, not an envelope one."*
- **Soil** reconciles moisture **on read** against the exact precipitation
  integral `WeatherApi.precipitationBetween(t0, t1, locality)`, which
  returns `{ liquid, frozen }` — and **soil deliberately discards
  `frozen`** ("that is the watershed's integral, not the soil's"). ⭐ That
  one discarded line is the plug-in point for snow on the ground.
- **The watercourse** ships flow, a **snowpack** (degree-day, derived
  per-reach on read) and the melt freshet, seasonal navigability, dated
  rights, storage, contamination by kind, and a `frozen` supply state that
  already fires from the catchment's sub-freezing air.
- **No ice sheet exists on any water today** — only the catchment
  snowpack, the `frozen` pipe state, and an ice *block* cast from a frozen
  pool. But the snowpack's degree-day segment-walk (`snowpackOf`) is the
  exact machinery an ice-thickness reading copies, and *still vs flowing*
  is already derived (`currentMps`; a Shore already says whether the water
  "runs or lies still").
- **A climate-dependent route already ships** — `FordExit` reads the water
  pack by shape and sets an exit's `blocked` bit from seasonal flow,
  refreshing on the weather segment. ⚠ The watercourse's `navigable`
  figure, by contrast, gates **nothing** — it is prose-only. `FordExit` is
  the pattern a snow/ice route copies, and `conditional:true` already
  lives on the base `Exit`.
- **Cold storage already shipped** (2026-10-01: Coolbox, ClimateControl,
  ColdStore/ColdRoom); **phase-change gained an ambient driver for
  meltables** (2026-09-28). These are *built*; they have simply never had
  a cold *world* to act in.

### ⚠ What is broken or absent

1. ⛔ **The two climates — and the biome — disagree in a shipped read**,
   and nobody noticed because nobody stood beside a frozen main in
   shirtsleeves and said so. Fixing climate without folding in the biome
   would just make the biome the surviving third truth.
2. ⛔ **The sky never gets cold enough to freeze anything above ground.**
   The catchment freezes (snowpack, `frozen` conduits); the weather floor
   (~276 K) means standing water, room-held objects and bodies **never
   freeze from weather.** The cold mechanisms that shipped have no world
   to fire in.
3. ⚠ **Precipitation phase is decided by the weather grammar, not the
   temperature** — so it can "snow" at 290 K, and the same storm cannot
   snow on the peak while it rains in the valley.
4. ⛔ **Snow does not lie on the ground.** The only snow state in the
   engine is the catchment's derived figure; no floor, location or soil
   carries snow. The arctic does not look arctic.
5. ⚠ **Season is one global calendar** with no latitude sign — a
   far-south place and a far-north place share a winter, which an
   author-set latitude is supposed to make impossible.
6. ⚠ **Precipitation intensity is realm-uniform** — a desert and a
   rainforest get the same mm/hr when it rains; only *how often* varies.
   Per-place temperature over realm-uniform rain would be a fresh
   disagreeing truth.

---

## Goals

- ⭐⭐⭐ **One temperature, derived from where and when you are.** Solar
  geometry at *this* latitude on *this* day sets the heat arriving; a lag
  and a **per-place damping** set how much the ground still holds — the
  damping is the one number that makes a coast mild and an interior
  brutal, and a **per-place offset** carries the anomaly a current brings
  (warm for your latitude — the Gulf-Stream story) that no local term can
  derive. The sky's flat cosine and the catchment's discrete table both
  become *consequences* of this one expression — four author levers:
  **latitude · elevation · damping · offset.**
- **A place can say where on the world it is** — a resolved `latitude`,
  inherited the way elevation already is. An author writes **one number
  and gets a winter**: snow, a short season, a dark December, husbandry
  limits, a frozen main, a snow-capped peak — with nothing else to
  declare. Every current reader is unchanged at the default 42.
- ⭐⭐ **Seasons and the hemisphere fall out of the same expression.** The
  seasonal swing is solar declination × latitude; the hemisphere is the
  *sign* of the latitude. A place across the equator has the opposite
  season at the same moment. This is what gives a future **ice trade** a
  real winter that arrives and departs on a schedule — and it is why
  seasons are IN, not deferred.
- ⭐⭐ **And the polar case becomes reachable** — a place where the sun
  does not rise for weeks, where the sky stops being a clock. ⚠ A
  polar-night place must stay **playable** — it runs on authored light,
  never on pitch darkness (a dark room breaks `get`, targeting and the
  scene).
- **Altitude still bites**, on top of latitude and in the same
  expression.
- ⭐⭐ **The biome agrees.** For sky-exposed scopes the derived temperature
  *is* the biome chain's answer — outdoor biomes stop asserting a flat
  constant the climate never consulted. No third truth.
- ⭐ **Precipitation falls as the right phase for where it falls.** Rain
  or snow is decided by the local derived temperature, not the grammar —
  so it snows in the arctic and on the peaks *because they are cold*, the
  same storm snows above and rains below, and it cannot snow at 290 K. The
  weather grammar still decides *whether and when* it precipitates.
- ⭐⭐ **Precipitation has an amount, and it is per-place too.** A region
  can be wet or arid — a rainy coast, a dry interior, a high cold desert —
  set by the Locality's weather *lean* (already live: it biases how often
  rain falls) plus a per-place **intensity** knob (new, small), with a
  light latitude default so an unset place is plausible. Because snowfall
  is amount × cold phase, a **wet** cold peak lies deep in snow and a
  **dry** cold plateau stays nearly bare — this is what makes the snow
  honest, not just present. Rain-shadow is hand-authored, not derived.
- ⭐⭐⭐ **Snow lies on the ground.** Snowfall accumulates on sky-exposed
  ground as a reconcile-on-read depth (the soil pattern, consuming the
  `frozen` integral soil throws away), deepens through a cold spell, and
  melts in a thaw — persistently and honestly whether or not anyone is
  watching. A cold high or far-north place reads snow-covered; the warm
  valley under the same storm does not.
- ⭐⭐ **A cold place reads cold in everything that already measures
  temperature** — the three 273 K drying stalls can fire, an unheated room
  goes cold, the maple's run opens on the freeze-and-thaw it needs,
  husbandry's cold limit turns from theoretical to real, wool's `clo`
  ladder gets its first load case, and the cold store earns its keep.
- ⭐ **Water is liquid, solid, or on its way between** — standing water and
  room-held objects freeze when the local ambient crosses freezing, so a
  main freezes for the same reason the puddle outside it did, and the two
  agree.
- ⭐⭐ **Ice grows on still water, to a real thickness, and you can read
  it.** Freezing-degree-days thicken a sheet on a still reach (the
  snowpack's own machinery, run for ice); **quality falls out of the
  snow-on-ice coupling** — a snow-free cold spell reads as clear "black
  ice," snow lying on it reads as cloudy "snow-ice" — and the whole thing
  is **readable through the instrumentation we already have.** This is the
  substrate the ice *trade* will one day harvest: this build grows the ice
  and lets you read it, and sells none.
- ⭐ **Winter opens and closes the roads.** A route can report a
  climate-dependent passability — deep snow shuts a path, and a reach
  frozen hard enough to bear a load opens a land crossing its summer flow
  denied — as the same `blocked`-bit seam the ford already uses, laid as
  substrate without the snowshoe economy on top.
- **The biome substrate is sound enough to carry a later content pass** —
  a resolve-gate that makes a cited-but-unresolved or malformed biome
  fail **loud** instead of silently null (the "reference-Idea inert at
  boot" class, now on its fourth occurrence).
- **A water declares what it is made of atmospherically** — this build
  hands the maritime build a **water biome** (a data row,
  `_defaultAtmosphere: water`), and no more.

---

## Non-goals

Each names its home.

- ⛔ **No pump.** → its own build. The equation and cost already ship
  (`Conduit.requiresPump`/`pumpWattsFor`); surfacing a player-facing
  device and a dewatering consumer is a general lift-water design with
  nothing to do with weather.
- ⛔ **No tide.** → the **maritime** build. The tide moves the water's
  *edge*, and the edge is the frame; the moon ships, the tide stays
  deferred where the frame lives.
- ⛔ **No reach character** (bed, obstruction, gradient). → its own water
  slate. Reaches already differ by elevation and width.
- ⛔ **No return flow / consumptive fraction / conduit irrigation.** →
  its own water build (the lens-4 ditch-externality: *lining your ditch
  injures the person below you*). Worth a build; not this one.
- ⛔ **No *derived* rain-shadow, no vector wind.** → a later weather build.
  Deriving windward-wet / leeward-dry needs a wind direction and per-zone
  geometry the weather field deliberately does not embed; the two sides
  are **hand-authored** with the wet/arid knobs here.
- ⛔ **No ice *trade*.** No harvest verbs (clear / score / saw / float /
  haul), no ice house, no retail, no melt-economy. → the
  [ice-trade-slate](../slates/builds/ice-trade-slate.md), downstream. ⭐
  Ice **thickness and quality are IN** as readable physics (see Goals) —
  this build grows a real frozen pond and lets you read it; it sells none.
- ⛔ **No biome structural normalization** (sky-exposure as a field vs a
  subclass; the granularity doctrine; the closed medium-tag map). → the
  [biome-normalization-slate](../slates/builds/biome-normalization-slate.md)
  and the later content pass. We harden *soundness*, not shape.
- ⛔ **No metabolic rebalance.** → deferred. An unfed body already dies of
  cold; this build must not make any **drive-path** lethally cold. The
  cold goes where content wants it, not everywhere.
- ⛔ **No locomotion economy on snow** — no snowshoes, trail-breaking,
  exhaustion, or wind-drift; no avalanche. → downstream
  (locomotion-on-snow). The traversability **seam** (a route shut by deep
  snow or opened by a frozen reach) **is IN**; the economy that rides it
  is not.
- ⛔ **No standing on the ice as a place / no water you occupy.** → the
  **maritime** build owns the standable water surface, and it is unbuilt.
  Our "frozen river" is a **land-edge crossing that opens when the ice
  bears**, not a place you stand on the ice.
- ⛔ **No hemisphere *content* beyond the drive's needs.** The *model*
  supports hemispheres; this build authors only the places the drive
  stands in (below).

---

## Placement

- **Latitude** is a new `Zone` field, resolved by the existing ancestor
  walk like elevation. Kernel.
- **The temperature expression** unifies the weather fold and the
  catchment model onto the latitude-general celestial geometry. Kernel
  (weather/celestial) + the water pack's `airTemperatureK` re-sourced to
  it; both must read the same expression. Damping and offset are
  per-place author levers beside latitude and elevation.
- **Precipitation amount** — the per-Locality `lean` already exists; add a
  per-Locality **intensity** multiplier at the one `precipitationRateOf`
  chokepoint (kernel weather) and a light latitude default. Every consumer
  already routes through the integral.
- **Biome coupling + the resolve-gate** — kernel (`BiomeLogic`,
  `BiomeCatalogue`, a `lint:biome`-shaped gate).
- **Snow on the ground** — the surface cover is a **kernel floor**
  concern (mirroring the puddle), the accumulate/melt driver rides the
  **weather** layer (the `frozen` integral + a presence-independent
  reconcile-on-read), dials alongside the water pack's snow dials.
- **The water biome** — a data row handed to maritime. ⭐ The test: a
  second cold place, a second hemisphere, a second water needs **zero**
  new code — an author pins a latitude and a biome row and the winter,
  the season and the snow all follow.

---

## Collisions

| | |
|---|---|
| ⚠⚠ **the maritime build** | owns the frame, the zone surface, the **standable water surface**, and the moving ice-edge `Expanse`. This build owns the **biome chain**, the **unified temperature**, **latitude**, and **ice as a *reading* on a reach**, and hands maritime a **water-biome stub**. ⭐ Ice-as-a-number is ours and free; *standing on* the ice (a water you occupy) is maritime's and unbuilt — so our frozen-crossing is a **land edge** that opens with ice, not a place on the ice. Neither edits the other's. |
| ⚠ **the boundary / exit layer** | route passability is the kernel `Exit`'s, via the shipped **`FordExit`** pattern (`applyTraversal` + the `blocked` bit, reading the subject by shape). This build adds exit subclasses that read snow depth / ice thickness by shape; `conditional:true` already lives on base `Exit` and the router/Cartographer already consume it, so **no kernel change**. |
| ⚠ **the celestial model** | latitude becomes a **resolved value** rather than the `CAMPUS_LATITUDE` constant. Every current reader must keep working unchanged at 42 (the default). |
| ⚠⚠ **the biome** | the integration crux. The derived temperature must *become* the biome chain's answer for sky-exposed scopes, or biome is the surviving third truth and AC 1 / AC 10 fail. |
| ⚠⚠ **ground snow vs the catchment snowpack** | two snow truths. Aggregating ground snow up to a catchment is **infeasible** (most catchment area has no rooms). They stay two readers of the **same** `frozen`/segment integral and the **same** degree-day + lapse dials — consistent by shared inputs, not by one deriving the other. Bar: they must not *visibly* disagree. |
| ⚠ **the sugar build** | independent — sugar authors its crops against what ships; climate only makes siting honest later. The **evaporator** both might want is already shipped and owned by **trade-forestry** (the saltern/brine mechanism). Non-issue. |
| ⚠ **husbandry / weather grammar / tap openers** | making season latitude-derived re-sources husbandry's growing windows, the weather `SEASON_BIAS`, and any photoperiod tap opener onto the local season. In-scope touch points, not deferrals. |
| ⚠⚠ **the shipped suite** | absolute outdoor temperatures are **un-pinnable** once temperature derives; re-derive assertions as deltas rather than re-pinning constants. Expect many. |

---

## Surface decisions

**Unify onto the geometry, not either table.** `T_here = solar(latitude,
day) → arriving heat, minus lapse × altitude, damped per place with a
lag, plus a per-place offset.` The sky's cosine and the catchment's
seasonal table both become outputs of this. *The four levers:* latitude
sets the mean and how much swing the sun offers; elevation lowers the
mean; **damping** (continentality) attenuates the swing — it *is* the
"real seasons vs. not" dial, and why Seattle (47.6°N) is milder than
Minneapolis (45°N); **offset** carries a mean anomaly no local term can
derive. All four are grain; the derivation is the law. The model already exists for any latitude in the
celestial code; this build gives it callers.

**Latitude is a resolved zone field, default 42.** Inherited like
elevation; every reader unchanged at the default, so nothing that passes
`CAMPUS_LATITUDE` today changes behaviour until a place authors otherwise.

**Seasons and hemisphere are derived, and IN.** Season = declination ×
latitude; hemisphere = the sign. The global day-of-year `seasonFor` and
the catchment's discrete mean table collapse into the one expression.
*Reasoning:* a genuine seasonal winter that arrives and departs at the
right places is precisely what the downstream ice trade stands on, and a
latitude-driven climate with a globally-uniform season would be only
half-unified.

**Biome agrees via the chain, not a new field.** For sky-exposed scopes
the derived temperature becomes the biome chain's resolved answer; outdoor
biomes stop authoring a flat base. *Reasoning:* anything less leaves the
biome as a third disagreeing truth.

**Snow depth is reconcile-on-read on the ground, not surface-bulk push.**
A per-location snow depth on sky-exposed floors, soil-pattern: gains from
`precipitationBetween().frozen`, loses to a degree-day melt on the unified
temperature, reconciled on read with persisted stamps and the
unresolved≠zero discipline. *Reasoning:* the puddle's push/tick model has
a known hole — *"no reconcile-on-read for surface bulk at all"* — so it
only changes while someone is present; snow must be honest on an unvisited
peak. Presentation (an overlay sentence + a depth band; masking the
derived ground kind only when deep) is the plan's to settle.

**Two snow truths share inputs.** Ground snow (local, visible) and the
catchment snowpack (hydrological, drives the freshet) read the same
integral and the same dials; neither derives from the other, because
catchment aggregation over roomless terrain is infeasible.

**Precipitation amount is per-place, cheaply.** The Locality's weather
*lean* already biases type frequency (wet vs arid by occurrence — free);
this build adds a per-Locality **intensity** multiplier at the single
`precipitationRateOf` chokepoint (neutral default — soil, the freshet and
snow already route through the integral, so no consumer changes) and a
**light latitude default**. *Reasoning:* precipitation is half of climate,
and per-place temperature over realm-uniform rain would be a fresh
disagreeing truth. The latitude default stays light because precipitation
bands are Earth-trivia more than learnable physics; the author knob is the
real lever.

**Climate surfaces as an overlay; absolute-weather prose is the
antipattern.** Derived snow and cold compose *over* authored scene prose
("snow lies over the meadow"); a room that hard-authors "the sun beats
down" is the defect. Same lesson as the un-pinnable test temperatures: do
not author what now derives.

**Reading credits an existing Discipline.** Climate and ice reading has a
competence axis (a novice reads a band word, an expert the figure — the
instrumentation doctrine), credited to an existing natural-science /
husbandry-adjacent Discipline rather than a new one. The ice trade earns
its own skill later; this is its seed. The plan pins which one against the
catalogue.

**A polar night runs on light.** The polar case is reachable, but a place
dark for weeks must stay playable: authored light, never pitch darkness.
The drive's polar place is a lit one.

**Ice is a reading on the reach, reusing the snowpack's machinery.** Ice
thickness + quality is a derived-on-read field on the reach's `WaterState`
(sibling to snowpack and current), copying `snowpackOf`'s segment-walk +
degree-day + per-segment memo verbatim, and reading `airTemperatureKAt` —
the method this build is itself re-sourcing to the unified expression, so
it depends on the *method*, not the seasonal table. *Still enough to
freeze* is already derivable (`currentMps`; a Shore already says whether a
water "runs or lies still"). Quality falls out of a **snow-on-ice** term
(a third reader of the `frozen` integral — consistent by shared inputs,
same discipline as the two snow truths): clear "black ice" from a
snow-free freeze, cloudy "snow-ice" under cover. Shore already renders
`waterStateAt`, so the ice surfaces with no new seam. ⭐ *Standable* ice
waits for maritime; this build delivers ice **as a number you read.**

**Traversability is the `FordExit` pattern, not the locomotion economy.** A
route's passability is a `blocked`-bit predicate on an `Exit` subclass
that reads snow depth / ice thickness **by shape** and refreshes on the
weather segment — exactly as the shipped `FordExit` reads flow (and note
`navigable` gates *nothing* today; it is prose-only). `conditional:true`
lives on base `Exit`; the router and Cartographer already consume it; no
kernel change. Snowshoes, trail-breaking, exhaustion and drift are the
later locomotion build. ⭐ The closure is **physical only** — it blocks
movement, never the social fabric. Comms, teleport and the peer graph
survive winter; a closed pass must never cut a player off from people.

**The resolve-gate, not the normalization.** A `lint:biome`-shaped gate
asserts every cited biome resolves and authors its mandatory fields, and
silent-null is made loud/countable. The sky-exposure-as-field, granularity
and medium-map questions are the content pass's.

---

## Lens pass

Seven lenses ([design-lenses.md](../design-lenses.md)).

1. **Pedagogy** — earth science, highly derivable: solar geometry and
   declination, the lapse rate, thermal damping (the maritime effect),
   phase change, degree-day accumulation. The world is derivable from a
   latitude and a day. Read through the existing `analyze`/`measure`
   instrumentation, and the readings *are* the lesson (ice thickening
   teaches Stefan's law; snow-free ice reading clearer teaches
   insulation). The competence axis credits an **existing** Discipline —
   the seed the ice trade's skill later grows from.
2. **Creative expression** — the headline: **one number (a latitude) →
   a whole winter.** Snow, a short season, a dark December, husbandry
   limits, a frozen main, a snow-capped peak, all from one authored field.
   Enormous expressiveness-per-input. The grain an author changes is
   *where the cold is*; the law is *that temperature derives.*
3. **Immersion & participation** — immersion: the frozen-main-in-
   shirtsleeves betrayal is *fixed*; snow lies where it is cold; the world
   stops contradicting itself. ⚠ Two *new* betrayals to avoid: authored
   weather prose under derived snow (→ overlay) and a pitch-dark polar
   night (→ authored light). Participation: the realm gains a genuine
   winter the ice and whaling economies can stand in — economy-shaped
   holes, not scripted trades — and seasonal route closure is emergent
   (stockpile before the pass shuts; the frozen river as a shortcut past a
   toll road), but it is **physical only and never severs peers.**
4. **Values** — ⚠ **thin, and honestly so.** The real lens-4 case here
   (the ditch externality) is OUT with return-flow. This build is mostly
   lens-1 derivable truth with few undecidables. The one value it *does*
   decide is the **lethality gate**: the world is harsh but not a
   death-trap on a required path. Its altitude: the **invariant** is "no
   drive-path becomes lethally cold"; the **grain** is how brutal an
   *optional* place may get. A chosen value, not an accepted limitation.
   ⭐ **Decided at planning:** unifying onto the honest catchment numbers
   gives even the default 42° coast a real winter (coldest dawn ≈ 268 K;
   the starter outfit is under 1 clo). We **keep the honest winter** —
   it is what makes wool and clothing pay — and the room a new player
   wakes in **offers a warm coat**. Warming the starter region with an
   offset was rejected: it would be the one dishonest climate in the
   realm.
5. **Continuity** — strong: the sun's geometry is the sun's geometry in
   any epoch. The derivation survives; only the content built on it
   changes. A medieval winter and an industrial winter are the same
   expression. ⭐ And the ice trade this feeds is a trade the epoch
   *deliberately kills* — refrigeration obsoletes the harvest — so the
   cold is permanent and the trade is epochal: one players live, then
   watch end.
6. **Economy** — unblocks the ice and whaling RGOs; winter becomes free
   refrigeration (preservation earns); wool's `clo` finds a load case; the
   maple's syrup run opens. The demand was there first — the icebox
   already consumes an ice nothing produces; the cold store shipped
   unused. And climate injects **seasonality** into every existing loop —
   cheap winter preservation, a husbandry dead season, spring-flood and
   summer-low water — a time-varying cost structure, for free.
7. **Governance** — n/a this build (the water-rights / curtailment
   governance travels with return-flow, which is out). Recorded as a gap.

---

## The drive

The spine of the first draft (steps 1–7) survives; the water bolt-ons
(pump, tide, reach, divert, line-the-ditch) are gone with their features.

1. **Stand somewhere cold and somewhere warm on the same day**, read
   both, and have the reading come from one expression (not a sky number
   here and a river number there).
2. **Climb**, and get colder, with nothing else changing.
3. **Go far enough toward a pole** that the sun does not rise, and be told
   so by the sky.
4. ⭐ **Stand at two places in opposite hemispheres** and find their
   seasons inverted — summer here, winter there, at the same moment.
5. **Watch a vessel of water freeze** in the cold, and thaw.
6. ⭐ **See snow lying on the ground** in a cold / high / far-north place,
   watch it deepen through a cold spell and clear in a thaw — and find
   **none** on the warm valley floor the same day. Leave and come back
   after a long absence and find the depth correctly reconciled.
7. ⭐ **Stand under one storm at a peak and a valley** — snow above, rain
   below — and confirm it cannot snow where it is warm.
8. **Try to dry something in a frozen place** and be refused in the
   process's own words.
9. ⭐ **Open a maple** on a freeze-and-thaw window, which has never been
   possible.
10. **Read a water main as frozen**, read the street it is under, and have
    the two **agree**.
11. ⭐ **Read a sky-exposed room's temperature and its biome** and find
    them the same answer — no flat 295 K constant peeking through.
12. ⭐ **Read a still reach through a hard freeze** and watch its ice
    thicken; read a snow-covered reach beside a snow-free one and find the
    snow-free one's ice **clearer** — the snow spoiled the other.
13. **Find a path shut by deep snow** that was open in autumn.
14. ⭐ **Cross a reach in deep winter** that its summer flow denied — the
    ice bears your weight (a land edge that opens, not a place on the ice).
15. ⭐ **Stand in a wet region and an arid one** in the same season and
    find one soaked, the other parched — and a wet cold peak deep in snow
    beside a dry cold plateau nearly bare.

*(Whaling is not drivable here — it is unbuilt. The drive proves the
capability it waits on: a cold place at a cold latitude, and a sky that
goes polar.)*

---

## Acceptance criteria

Observable from outside the code.

1. **One expression answers "how warm is it here,"** and the catchment and
   the sky give the **same answer** for the same place and time.
2. Temperature **derives** from solar geometry at a place's latitude and
   day, with a lag and a **per-place damping** (a coast and an interior
   differ at the same latitude).
3. **Latitude is resolved per place** and inherited, and every existing
   reader is unchanged at the default (42).
4. ⭐ **Season and hemisphere derive from the same geometry:** a place's
   season follows its latitude, and two places across the equator show
   **opposite seasons** at the same moment.
5. **The polar case is reachable** and the sky says so.
6. **Altitude still lowers temperature**, in the same expression.
7. **Precipitation phase derives from local temperature:** it cannot snow
   at 290 K, and under one storm a cold place shows snow while a warm place
   shows rain, simultaneously.
8. ⭐ **Snow accumulates on sky-exposed ground**, reconciled on read
   (correct after an unobserved absence), deepening in cold and melting in
   thaw; a warm place shows none under the same weather.
9. **Ground snow and the catchment snowpack do not visibly disagree**
   (shared integral and dials).
10. **Standing water and room-held objects freeze** when the local ambient
    crosses freezing; a **frozen** supply state and the **ambient** at the
    same place **agree.**
11. **The maple opens** on a freeze-and-thaw window.
12. ⭐ **Biome and the derived temperature agree** for sky-exposed scopes
    (no flat constant), and a **cited-but-unresolved or malformed biome
    fails loud** (the resolve-gate), not silently null.
13. **Formerly-dormant cold mechanisms now engage** — stated honestly as
    *engage/earn*, not *"never fired"*: the three 273 K drying stalls can
    fire, husbandry's cold limit becomes real, wool's `clo` ladder gets a
    load case, and the shipped cold store earns its keep.
14. ⭐ **Ice grows on still water by freezing-degree-days** (thicker after a
    longer, colder freeze), its **quality reflects snow cover** (clear from
    a snow-free freeze, cloudy under snow), and it is **readable** through
    instrumentation. No harvest, no standable surface.
15. ⭐ **A route reports climate-dependent passability** — deep snow shuts a
    path that was open, and a reach frozen hard enough opens a land-edge
    crossing — via the exit `blocked` seam, without the locomotion economy.
16. ⭐ **Precipitation amount is per-place** — a wet region and an arid one
    diverge in the same season, and a wet cold place snows deep where a dry
    cold place stays near bare. No derived rain-shadow.
17. **A place's climate is set by four levers** — latitude, elevation,
    damping and offset — and two places at the same latitude with
    different damping show different seasonal ranges (the Seattle /
    Minneapolis case).
18. **Authored scene prose and derived climate never contradict** — snow
    and cold read as an overlay on the scene.
19. **Winter route closure is physical only** — a player behind a closed
    pass still reaches people by every non-physical channel.
20. **Test content exists** — a genuinely cold northern place, a **lit**
    polar place (never pitch-dark), an opposite-hemisphere place, and a
    wet/arid pair — and ⛔ **no place a drive must survive became lethally
    cold.**
21. **A new player can dress for the winter** — the room they wake in
    offers (does not force on them) a coat warm enough for the default
    world's coldest night.

---

## Cross-references

- **Seeding slates:** [climate-slate](../slates/builds/climate-slate.md),
  [navigable-water-slate](../slates/builds/navigable-water-slate.md)
  (biome chain, water biome),
  [biome-normalization-slate](../slates/builds/biome-normalization-slate.md)
  (resolve-gate; the rest deferred to the content pass).
- **Downstream (the fork this unblocks):**
  [ice-trade-slate](../slates/builds/ice-trade-slate.md),
  whaling (`navigable-water-slate` §§ 7–7h).
- **Subsystem docs:** [time.md](../subsystems/time.md) (celestial,
  latitude, season), [weather.md](../subsystems/weather.md) (the grammar,
  the precipitation integral, puddles),
  [watershed.md](../subsystems/watershed.md) (snowpack, freshet, the
  shared integral), [biome.md](../subsystems/biome.md) (the chain,
  SkyExposed, the catalogue), [ground.md](../subsystems/ground.md) (the
  floor, the surface overlay, the named snow seam),
  [soil.md](../subsystems/soil.md) (reconcile-on-read, the discarded
  `frozen`), [thermal.md](../subsystems/thermal.md) (phase change; the
  ice-block cast), [boundary.md](../subsystems/boundary.md) (the `Exit` /
  `FordExit` traversability seam), [taps.md](../subsystems/taps.md) (the
  maple window).
- **Sibling lanes (independent):** maritime-space (owns the frame, tide,
  water edge; takes our water biome), sugar (owns the evaporator).
