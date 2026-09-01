# Field substrate slate — negative space, and the world that is there before you look

> **Captured 2026-08-31**, out of the metal-chain design session, when the
> user noticed the mine was *"modelling content on negative space — the
> space in between rooms actually has properties, and those properties
> reveal themselves when you carve new positive space."*
>
> **Status: pattern recognition, not a build.** Nothing here is new
> mechanism. It names a shape the codebase has already built **twice**,
> adds the one case that genuinely inverts it, and sets the guidelines so
> the next four instances stop re-deriving it.
>
> ⚠ **This slate deliberately does NOT restate
> [discovery-slate](./discovery-slate.md).** That slate derived most of
> this first, for foraging — *"authors write the TABLE, the world computes
> the STOCK"*, the three layers, *"author the biome, override the
> exception"*, derive-on-read with unvisited places costing nothing. Read
> it first; this generalizes it and says what it does not cover.

Substrate: [weather](../../subsystems/weather.md) ·
[biome](../../subsystems/biome.md) · [zone](../../subsystems/zone.md) ·
[address](../../subsystems/address.md) ·
[uncertainty](../../uncertainty.md) ·
[mining-slate](./mining-slate.md) § *The mine's machinery* ·
[discovery-slate](./discovery-slate.md) ·
[spawn-distribution-slate](./spawn-distribution-slate.md) (the contrast).

---

## The shape, already shipped twice

**Weather** ([weather.md](../../subsystems/weather.md)) —

> *"weather stores no state. `weatherAt(time, locality)` is a pure
> deterministic function — no simulation, no tick, no stored weather
> state. The same `(time, locality)` always yields the same weather;
> **tomorrow is computable today.**"*

**Foraging stock** ([discovery-slate](./discovery-slate.md)) —

> *"Nothing spawns. Nothing ticks. The world does not populate itself — it
> **computes what is there when you arrive** — so an unexplored continent
> costs exactly nothing to have."*

**And now the mine's geology** — hardness, ore grade and feature seeds as
a function of `(seed, x, y, z)`, with only mutation stored
([mining-slate § *The mine's machinery*](./mining-slate.md)).

Three systems, one shape. That is past coincidence, and the third one
inverts something the first two did not.

---

## ⭐⭐⭐ The inversion: rooms as subtractions

Every space in the game before this one is **positive**. Rooms are the
world; the gaps between them are *nothing* — not solid, **absent**.
Terminus's `CartesianZone` is a coordinate frame with buildings at some
coordinates and **vacuum** at the rest, and nobody ever asked what is at
`(14, 9)` because the question has no meaning.

The mine inverts it. The zone is **full**, and rooms are **subtractions
from it**. A drift is a hole in a solid; carving converts negative space
into positive; and the un-carved is not absence but **substance with
properties** — hardness, grade, water, a feature waiting.

> ⭐⭐ **A zone with a field is matter. A zone without one is vacuum.**

This reframes what a Zone *was* all along. **The zone was always the
negative space** — we simply never had anything to put in it, so it read
as a bare coordinate frame. Give it a field and it becomes a material
continuum that happens to have voids in it.

Note what this is *not*: it is not voxels and not a simulation. The room
graph is unchanged. A field is **a total function underneath a sparse
graph** — the graph is where you can be, the field is what everything else
is made of.

---

## ⭐⭐⭐ Two kinds of field, and they are not interchangeable

Both compute rather than store. They differ in **what they are a function
of**, and that difference decides where each is legitimate.

| | **Seeded field** | **Derived field** |
|---|---|---|
| A function of | **position** (+ a seed) | **recorded history** (events) |
| Examples | weather `(time, locality)`; the mine's geology `(seed, x, y, z)` | foraging stock `f(last state, elapsed, inflow) − withdrawals`; wounds; competence bands; renown |
| True before anyone looked? | **yes, necessarily** | yes, but only because the events already happened |
| Cold start | **fine** — a fresh world is fully specified | ⚠ **broken** — discovery-slate's own catch: *"a new world has no traffic history, so everything would be uniformly rich or uniformly empty. Cold start needs an authored answer."* |
| Changes over time? | only if a coordinate is time | continuously, as events land |

⭐ **The mine needs a seeded field and could not use a derived one.** The
lode was emplaced by hot fluids aeons before anybody arrived; there is no
event history to derive it from, and a grade computed from traffic would
be a lie about geology. Conversely **foraging stock could not be
seeded** — its whole thesis is that *"the richest places are where people
died and nobody came back,"* which is a fact about history, not position.

Most of the platform's derive-on-read machinery is the **derived** column.
The seeded column has exactly two members today, which is why it has not
been named.

---

## Where a field lives — three layers, all shipped shapes

The user's question was *"is the thing holding these values a Document, an
Idea, or something else?"* **Not a Document** — it is neither editable
prose nor path-addressed content. Three layers instead:

| Layer | What | Shipped precedent |
|---|---|---|
| **The model** — how this *kind* of ground/sky/place is put together: the lode's strike and dip, the zoning depths, the yield table | a **pure-data `Idea`**, read from `template.data`, never cloned live | `Biome`, `Material`, `Government` |
| **The instantiation** — *this* place's version | the **`Zone`** (or `Locality`) names the model and carries the authored overrides | `Biome`'s outward-walking chain resolve; Zone field inheritance; discovery-slate's *"author the biome, override the exception"* |
| **The values** — what is at this exact point | **computed, never stored** | `weatherAt`; `stock(T)` |

And the vocabulary the values are drawn from is **Materials** — the field
says *"0.55 hematite in slate,"* and hematite and slate are `Material`
Ideas that already exist. **Nothing new enters the taxonomy.**

### ⭐⭐ The seed is DERIVED FROM IDENTITY, not authored

From the shipped implementation (`WeatherLogic.localitySeed`): the
per-locality seed is **the covering Locality's claimed address prefix,
hashed (FNV-1a) and XOR'd with a global base seed**; no covering Locality
falls back to the global seed alone. **No seed field is stored anywhere.**

> **A place's field is a function of what the place *is*.** Name it and it
> has weather; rename it and it has different weather.

That is a better answer than the "zone names the Idea *plus a seed*" this
slate first reached for. Authors do not manage seeds at all — they get
control through the override tiers below, which are legible, and never
through a magic number, which is not.

### The precedence ladder, as shipped

`WeatherLogic` resolves in three tiers, and the ordering is the pattern:

1. **Authored hard pin** — resolved by an **outward containment walk**
   with a depth cap (*"defensive, like biome's"*). *This place is always
   under storm.* Outranks everything.
2. **Authored soft lean** — a `ClimateLean` on the covering Locality that
   **weights the procedural branch** rather than replacing it. The code is
   explicit that *"an authored hard pin always outranks it."*
3. **The procedural value** — seed + position.

⭐ A field wants **both** override tiers. The hard pin says *this specific
place is exceptional*; the soft lean says *this whole region tends
this way*. The mine's analogue is exact: an authored ore pocket is a pin,
and *"this district's ground runs rich in copper"* is a lean.

### ⭐⭐ The invariant that makes overrides safe

Weather's spine invariant, and it generalizes verbatim:

> *"every consumer reads the ONE resolved state
> (`WeatherApi.resolveWeatherFor`), **never the procgen field directly** —
> so authored and modelled rain are indistinguishable downstream."*

**An authored ore pocket must feed the same assay as a computed one.** If
any consumer can tell them apart, the override tier has become a second
system and the field is no longer one thing.

---

## The rules

1. **Total.** Every point has a value whether or not anyone looked. If
   some points legitimately have *no* answer, it is not a field.
2. **Deterministic.** Same inputs, same value, process-independent
   (`WeatherLogic` uses FNV-1a precisely for this). Memoizing a pure
   function is safe and its invalidation is by construction.
3. **Authored structure over derived detail.** The big shape is authored
   — the lode dips 40° NE, tin below −180 m, the climate lean, the biome's
   yield table. Only the fine grain is computed. Authors get real control;
   the engine gets density for free.
4. **Store only mutation.** The sparse record of what play changed — ore
   taken off a face, a cell carved, a patch picked over. Everything
   untouched is derive-on-read. ⭐ This is also what keeps
   **residences D17** satisfied: you never mint a row per point.
5. **One resolved read.** Consumers read the resolved value, never the
   raw procedural branch (above).
6. **It must be able to say no, legibly.** Barren-by-default. A field that
   always rewards sampling is not a field, it is a dispenser — and
   mining-slate's four failure rules (informative · legible in hindsight ·
   cost scales with the bet · negative knowledge still sells) are the
   general form.

---

## ⭐⭐ Field or distribution? The question that decides it

A field is easy to confuse with the thing it most resembles —
[spawn-distribution-slate](./spawn-distribution-slate.md)'s weighted
tables, which also answer *"what is here?"*

> **A field is a total function. A distribution is a draw.**

A distribution rolls **at the moment of instantiation**; a field computes
**from position**. [uncertainty.md](../../uncertainty.md) decides which is
legitimate where: *roll to decide what the world IS* is the banned
**resolutional** provenance, while computing from position **is not a roll
at all** — the value was fixed before the question was asked.

> ⭐ **The test: does the answer have to have been true before anyone
> asked?** If yes, it is a field. If the thing genuinely comes into
> existence at the moment of instantiation — what spawns in a generic
> room, what a create-monster effect produces — a distribution is honest.

Ore grade fails the distribution test outright: a seam you assayed
yesterday cannot re-roll today.

---

## ⭐⭐⭐ The law: the price of a sample decides what the field IS

The two shipped fields differ in exactly one variable, and it explains
everything about how they feel to play:

| | Cost to sample | What it becomes |
|---|---|---|
| **Weather** | free — look up | **atmosphere.** It colours everything and nobody specializes in it. |
| **Geology** | labour, capital, risk, destruction | **a profession.** An entire epistemics grows on it: float, gossan, assay, the seismograph. |

> ⭐⭐ **A field you read for free is scenery. A field you pay to read is a
> career.**

Same substrate, opposite roles. Which is the dial to reach for when a new
field is proposed: **decide what a reading costs, and you have decided
whether you just made weather or just made a trade.**

### The corollary: survey, not map

A room graph can have a map, because rooms *are* the world. A field-backed
space cannot:

> **The map is a record of your sampling, not of the world.** Everyone's
> is different and incomplete, and the gap between the map and the ground
> is what a surveyor is paid to close.

That is not a missing feature. It is why prospecting is epistemics, and it
is the same reason `perception`/`belief` keep per-viewer truth rather than
one shared one.

---

## The register — where this is or will be

| Field | Kind | State |
|---|---|---|
| **Weather** | seeded | **shipped** — the reference implementation |
| **Foraging stock** | derived | **designed** ([discovery-slate](./discovery-slate.md)) |
| **Mine geology** — hardness, grade, features | seeded | **designed** ([mining-slate](./mining-slate.md)) |
| **Soil quality** | seeded (probably) | **deferred** — farming's six-reserve soil "derives from **place**"; their district ground-character seam is the placeholder |
| **The water table** | seeded | **needed** — it is the adit-level boundary that decides where the drainage commons begins, *and* the oxide/sulfide boundary. ⭐ One field, two systems. |
| **Air at depth** | seeded (degenerate — a function of `z` alone) | **designed**, just not called a field |
| **The pre-Fallow aether in the deep** | seeded | **deferred** — the Hush is a *feature seed*, which is why it is discovered by digging rather than placed on a map |

---

## Open

1. **Does this graduate to top-level doctrine?** It reads like
   [uncertainty.md](../../uncertainty.md) and
   [measurement.md](../../measurement.md) — cross-cutting, permanent, not
   a build — rather than like a slate, which retires when it promotes.
   Left as a slate for now because a top-level doc is a permanent claim on
   the repo's structure and a `CLAUDE.md` index line. **User's call.**
2. **Is there a shared implementation, or just a shared shape?**
   `WeatherLogic` is 1015 lines of grammar specific to weather; the mine's
   generator will share the *hash/mix/roll* trio and the pin-walk and
   almost nothing else. ⚠ Resist a premature `FieldApi` — two instances is
   where a pattern is *named*, not where it is factored.
3. **Where does the pin walk live?** Weather's `stepOutwardForPin` is a
   containment walk with a depth cap, and biome has its own. A third
   copy in mining would be the point at which the walk itself wants a
   home.
4. **Do derived and seeded fields ever compose?** Foraging stock over
   seeded terrain is the obvious case — *what* a place yields is seeded
   character, *how much* is derived history. discovery-slate's three
   layers already imply it; nobody has built the seam.

*(Retire when: the mine's geology field ships and the pattern is proven at
two live instances, or this graduates to a top-level doctrine doc.)*
