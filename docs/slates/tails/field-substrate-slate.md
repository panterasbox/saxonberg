# Field substrate slate — negative space, and the world that is there before you look

> **Status: PARTIAL** — three seeded fields ship: weather (the reference)
> → [weather.md](../../subsystems/weather.md), `Deposit` (metal chain,
> 2026-09-02) → [mining.md](../../subsystems/mining.md), and
> `GroundCharacter` (farmstead W2) → [soil.md](../../subsystems/soil.md).
> **Left:** the water table (adit boundary + oxide/sulfide, one field two
> systems) · foraging stock as the first DERIVED field · the seeded ×
> derived composition seam · a home for the pin walk (`stepOutwardForPin`,
> now copied three times) · the pre-Fallow aether feature seed · the
> graduate-to-top-level-doctrine call (user's) · ⭐⭐⭐ **the RGO law**
> — *an RGO is a reservoir with a recharge law, drawn by an act,
> crediting a Discipline; depletion is recharge = 0* — stated in
> [tapping-slate](../builds/tapping-slate.md), which is the first
> build required to land ON it rather than beside it
> ⭐⭐⭐ **The RGO SPINE is designed (2026-10-08, § end)** — an RGO is a
> `(capacity field, recharge law)` pair, so **seeded/derived describes the
> CAPACITY, not the RGO**; capacity is a **call** (which is the whole
> content of the held interface, and needs foraging *designed* not
> *built*); recharge has four forms, ice supplying **window-gated**; and
> the author contract is the shipped **pin over lean over procedural** —
> expect **nothing**, allow a lean and a pin.
> **Size:** a wave


> **Captured 2026-08-31**, out of the metal-chain design session, when the
> user noticed the mine was *"modelling content on negative space — the
> space in between rooms actually has properties, and those properties
> reveal themselves when you carve new positive space."*
>
> ⭐⭐ **Why the RGO law is worth graduating** (added 2026-09-29 from
> [lens #30 · Emergence](../../lenses/30-emergence.md)): Schell's fifth
> generator of emergent gameplay is *side effects that change
> constraints* — *"every move changes the very nature of the game space,
> whether or not you intended it to."* **A reservoir with a recharge law,
> drawn by an act, is that in its purest form**, and stronger than his own
> example: checkers' constraint changes are per-move and reversible, while
> *depletion is recharge = 0* means the space can be changed
> **permanently, by somebody else, before you got there.** That entry also
> takes tip 5 as the **positive** test for when to simulate at all — *does
> this side effect change somebody else's constraint?* — which the tree
> has never had, only the two rules for when NOT to.
>
> **Status: pattern recognition, not a build.** Nothing here is new
> mechanism. It names a shape the codebase has already built **twice**,
> adds the one case that genuinely inverts it, and sets the guidelines so
> the next four instances stop re-deriving it.
>
> ⚠ **This slate deliberately does NOT restate
> [discovery-slate](../builds/discovery-slate.md).** That slate derived most of
> this first, for foraging — *"authors write the TABLE, the world computes
> the STOCK"*, the three layers, *"author the biome, override the
> exception"*, derive-on-read with unvisited places costing nothing. Read
> it first; this generalizes it and says what it does not cover.

Substrate: [weather](../../subsystems/weather.md) ·
[biome](../../subsystems/biome.md) · [zone](../../subsystems/zone.md) ·
[address](../../subsystems/address.md) ·
[uncertainty](../../uncertainty.md) ·
[mining-slate](../builds/mining-slate.md) § *The mine's machinery* ·
[discovery-slate](../builds/discovery-slate.md) ·
[spawn-distribution-slate](../builds/spawn-distribution-slate.md) (the contrast).

---

*(The three shipped instances → [weather.md](../../subsystems/weather.md),
[mining.md](../../subsystems/mining.md) § *The geology field*,
[soil.md](../../subsystems/soil.md) § *Ground character*.)*

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

*(SHIPPED → mining.md § *The geology field*: the three layers, the
address-derived seed, pin over lean over procedural, one resolved read;
weather.md for the reference.)*

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
[spawn-distribution-slate](../builds/spawn-distribution-slate.md)'s weighted
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
| **Foraging stock** | derived | **designed** ([discovery-slate](../builds/discovery-slate.md)) |
| **Mine geology** — hardness, grade, features | seeded | ⭐ **SHIPPED** ([mining](../../subsystems/mining.md)) — the `Deposit` Idea, one resolved read, seed derived from the covering Locality's address |
| **Soil quality** | seeded | ⭐ **SHIPPED** (farmstead W2) — `trade-farming`'s `GroundCharacter`, the third seeded field. It also answers this slate's own open question: **seeded and derived compose, by multiplication** — character sets the curve, the reserves are the position on it. ⚠ Two things it does that `Deposit` does not, both because dirt is not rock: the model is OPTIONAL (a total function under a sparse graph — an orebody is a claim somebody makes, dirt is just there), and the properties are CORRELATED and SMOOTH (six independent draws would give free-draining clay on a flat bottom). And the hash-and-mix was re-implemented a fourth time, same ruling. |
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
2. ~~**Is there a shared implementation, or just a shared shape?**~~ —
   **ANSWERED by the metal chain: a shared SHAPE, not shared code, and
   the duplication was resisted on purpose.**
   `Deposit` re-implements the *hash/mix/roll* trio and the
   address-derived seed rather than importing weather's, and the total is
   about thirty lines. What it does NOT share is everything that matters:
   weather's grammar is 1015 lines of segments, seasons and fronts;
   `Deposit`'s is a plane, three bands and a pin table. A `FieldApi`
   factoring the thirty lines would have bought nothing and coupled a
   trade pack to the weather spine.
   ⭐ The thing that DID transfer is the **invariant**, not the code: one
   resolved read, folding pin over lean over procedural, so an authored
   pocket and a computed cell are indistinguishable downstream. That is
   worth restating in every instance; the arithmetic is not worth
   sharing. *Two instances is where a pattern is named, not where it is
   factored* — and the third instance is where to look again.
3. **Where does the pin walk live?** ⚠ *Still open, and mining did not
   settle it*: `Deposit`'s pins are a flat `Record<cellKey, …>` lookup
   rather than a containment walk, because a coordinate IS the key. A
   third copy of weather's `stepOutwardForPin` remains the trigger.
   Original note follows.
   **Where does the pin walk live?** Weather's `stepOutwardForPin` is a
   containment walk with a depth cap, and biome has its own. A third
   copy in mining would be the point at which the walk itself wants a
   home.
4. **Do derived and seeded fields ever compose?** Foraging stock over
   seeded terrain is the obvious case — *what* a place yields is seeded
   character, *how much* is derived history. discovery-slate's three
   layers already imply it; nobody has built the seam.

*(Retire when: the mine's geology field ships and the pattern is proven at
two live instances, or this graduates to a top-level doctrine doc.)*

---

## ⭐ 2026-09-25 — the pin walk is READY, and bees should ship the first derived field

From the apiculture design conversation, and recorded here because both items
are this slate's:

**⚠⚠ The pin walk is ONE copy, not three — corrected 2026-09-25.** An earlier
version of this note said `stepOutwardForPin` was copied three times and was
therefore a ready promotion. It has **exactly one** copy: module-private in
`platform/idea/api/WeatherLogic.ts`, four lines, walking containment,
depth-capped at 32.

⭐ What is true is more interesting. The **pattern** — climb containment,
`isContainer`-guarded, depth-capped, first hit wins — appears three times with
**three different caps and three different termination rules**: the weather pin
walk (cap 32), `Growing.sampleLux` (cap 8), `Growing.resolveWarmth` (cap 8),
with the biome chain resolver as a fourth relative. So the question is **not
"where should this helper live"** but **"should these three walks agree?"** —
and that is design, not a hoist. A hive's forage range would be a second
consumer of whatever answer we reach.

⚠ **Open, and it wants deciding properly:** the forage **metric**. Graph hops
with a per-edge cost, or real distance where a zone has coordinates? Bees fly
a radius; the world is a graph with Cartesian patches. Lean is hops with a
per-edge cost, so it degrades honestly in both kinds of space.

**⭐⭐ Whoever ships first defines the derived-field interface.** Every field
shipped so far is **seeded** (weather, `Deposit`, `GroundCharacter`); the
first **derived** one was slated to be foraging's stock. Bees now arrive
first, and a hive's nectar availability is derived in exactly the same sense.
So the sequencing should be **deliberate rather than accidental**: apiculture
ships the nectar read *as* the first derived field, with foraging named as
its declared second consumer — the way this pattern was validated before
(weather, then `Deposit`, then `GroundCharacter`). The alternative is bees
rolling a private nectar read that a later pass has to merge.

⚠ **And the interface itself stays HELD until foraging.** Foraging is the
case that completes it, and `lint-family.md`'s warning applies —
*"driving it lower would mean unifying mechanisms that really are
distinct."* Promote the tap and the pin walk now; hold the field interface.

⭐ **A second shared shape surfaced in the same conversation, and it is not a
field:** the **tap** (a recurring non-lethal draw on a living thing's
surplus). Milk, eggs, wool, maple sap, rubber latex and honey are all taps.
It belongs to [rgo-unification-slate](../builds/rgo-unification-slate.md),
noted here only so a reader of this slate does not conclude the field is the
only thing the RGOs share.

---

# ⭐⭐⭐ The RGO spine (2026-10-08)

The design pass taken before drilling, ice and foraging, so that build
order between them stops mattering. It lands here rather than in a new
slate because this one already owns the ground: the seeded × derived
composition seam, foraging-stock-as-the-first-derived-field, the RGO law,
and the graduate-to-top-level-doctrine call.

## ⭐⭐⭐ The thesis: seeded vs derived describes the CAPACITY, not the RGO

The two-kinds-of-field table above is right and is **filed under the wrong
noun**. Run the whole shipped roster through it and the split stops being
a taxonomy of RGOs and becomes one slot of two:

> **An RGO is a `(capacity field, recharge law)` pair.** *Seeded* and
> *derived* describe the **capacity field**. They say nothing about the
> RGO, which is why no RGO ever sat cleanly in one column.

| RGO | capacity comes from | recharge law |
|---|---|---|
| mining `Deposit` | position + seed | **zero** — a lode is emplaced once |
| fishery | Liebig habitat fit × abundance × length | half-life |
| stand (forestry) | its own soil, derive-on-read | rate, stamped by the axe |
| soil reserves | position, then what you grew | rate |
| taps (milk · sap · honey) | the animal or plant | rate, **window-gated** |
| drilling | position + seed | **zero** |
| foraging | ⭐ **recorded history** — traffic, remoteness | rate |
| ice | ⭐⭐ **another field** (weather) | ⭐⭐ **a field read, zero for half the year** |

### Slot 1 · capacity is a CALL, not a number

That is the whole content of the ⏸ held *derived-field interface*. What
foraging contributes is not a new field **shape** — it is a capacity
function whose inputs are **events rather than coordinates**. A signature
question, not a structural one:

> ⭐⭐ **Make `capacity` a call and both columns satisfy the same
> interface.** A seeded field's call reads `(position, seed)`; a derived
> field's reads the event record. No consumer can tell.

⭐ **And that is what frees build order.** The interface needs foraging
**DESIGNED**, not **BUILT** — which this section is. The promotion can
land on schedule with foraging's stock as its declared second consumer.

### Slot 2 · the recharge law has FOUR forms, and ice supplies the fourth

| form | members | shape |
|---|---|---|
| **zero** | a lode, a well | depletion — the RGO law's own zero case |
| **rate** | soil, a stand, foraging | per-tick inflow toward capacity |
| **half-life** | a fishery | proportional recovery of the drawn share |
| ⭐⭐ **window-gated** | taps; **ice** | a rate that is OFF outside a declared window |

Every shipped recharge is a **scalar**. Ice's is **a read of another
field** that goes to zero for half the year, so fixing this interface
without ice present would bake in *recharge is a number*.

⭐ **It needs no new substrate.** `TapWindowSpec` already ships the window
kinds (`always · event · photoperiod · biome · weather`, with `rising`
splitting spring from autumn) — the fourth form was built for maple syrup.
Ice's window is a `weather` predicate; its capacity is the pool's volume.
⚠ So **ice is the RGO whose absence would get this wrong, and drilling is
not** — which is why drilling may be built before the unification lands
and ice may not.

## ⭐⭐⭐ The author-facing contract — three rungs, already shipped twice

The question that decides everything downstream is **not** what an RGO is
made of; it is *what do we **expect** and what do we **allow** a
worldcrafter to author, so their content is compatible?* (user,
2026-10-08). The answer already exists, in `mining.md` § *The geology
field*:

> `sampleAt(at, seed)` folds authored **pin** over authored **lean** over
> the **procedural** value and returns one shape, **so an authored pocket
> and a computed cell are indistinguishable to every consumer.** Nothing
> may reach past it.

| rung | what the author writes | when |
|---|---|---|
| **procedural** | ⭐ **nothing** | always — the default |
| **lean** | a declared bias over a region | the *character* of a place |
| **pin** | an exact value at a point | the bespoke case |

- ⭐⭐ **Expect: nothing.** A locality that authors no forage data still
  forages, off its biome. That is lens 2's *ordinary case with no code*,
  and the **indistinguishability clause** is what stops unauthored content
  being visibly poorer. It is also the only answer that scales: expecting
  a table per locality would silently break every shipped pack, and ⛔ a
  ratchet over a content-scaling figure refuses an author for doing it
  right.
- **Allow: a lean and a pin.** The lean is where the worldcrafter's intent
  actually lives — *this wood is rich in mushrooms, poor in berries* —
  and it is the same affordance `GroundCharacter` gives soil. ⭐ Copy its
  rule too: **character prices IMPROVEMENT, never yield.**
- ⚠ **A lean must be authored-and-STABLE.** A bias that shifts under the
  player's feet destroys the learnability the next section rests on.
  Seasonality rides the **window**, which is declared and therefore
  learnable; it never rides the lean.

### ⭐⭐ Predictable vs RNG is a fact about the VIEWER, not the engine

The player's experience and the engine's determinism genuinely differ
here, and the difference is the design rather than a compromise:

> **Foraging feels like RNG to a stranger and like a routine to a local —
> and nothing in the engine changed between those two experiences.**

The procedural layer is seeded off the locality's address, so a new wood
is opaque — legitimately, as **epistemic** uncertainty
([uncertainty.md](../../uncertainty.md) provenance 1, legal). But the same
place gives the same answer, so **the opacity resolves into knowledge with
repetition**: your own patch is perfectly predictable; a stranger's valley
is not. Three consequences:

1. ⭐ **It is the almanac's job description.** The almanac is the written
   form of learned predictability — which is why it is publishable,
   teachable and sellable, and why foraging's career ladder is there
   rather than in the picking.
2. **"No" stays legible** (rule 6 — *a field that always rewards sampling
   is a dispenser*). A barren wood is information, not a failed roll.
3. **Nothing rolls at the act.** The yield was true before anybody asked,
   which keeps the resolutional provenance banned the way it should be.

### Therefore: a forage patch is a FIELD READ, not a Stuff

Settled as a **consequence** of the contract rather than on its own
merits, which is the right order (user: *"it kinda depends on what
foraging/hunting are to the content developers"*). The contract forbids a
row per point — `mining.md` says exactly this of procedurally-discovered
chambers, *"the rowless mint D17 forbids"* — so:

- the **patch** survives as how a field read is **described**, the way
  forestry's stand is derive-on-read and reported by `look` in words;
- a row is minted **only where play changed something** (rule 4, store only
  mutation): a patch somebody picked over;
- ⭐ **the discoverability cost is paid by the PIN.** A field has nothing
  to click, and that matters more at the bottom of the economy than in a
  wood — so an author who wants a findable, targetable, card-able patch
  **authors one**. The engine never mints them; authors do, where they
  mean it.

## ⭐⭐⭐ The sample-price law generalised — the career sits where the COST is

This slate's own law (*a field you read for free is scenery; a field you
pay to read is a career*) extends past surveying once three RGOs are laid
beside each other:

| RGO | what is expensive | therefore the profession is |
|---|---|---|
| **drilling** | the **survey** — you cannot look at the reservoir | the surveyor; float, assay, the seismograph |
| **ice** | the **storage** — the lake is visibly frozen for free, holding it to July is not | ⭐ the **ice house**, which is what the real trade was |
| **foraging** | **knowing where and when** | the almanac, and identification that publishes |

> ⭐⭐ **None of the three professions is "the person who performs the
> act."** Decide what is expensive and you have decided what the trade is.

### ⛔ The sharp prediction: foraging cannot be a vocation

Foraging's *reading* is free — you walk and you look — so by this slate's
own law it is scenery, not a trade. **That is the feature.** Nobody in a
developed economy forages for a living, and a model that predicts it
without being told is the model working. Foraging is the **participation
floor**, not the eleventh trade — which makes its build *smaller* and the
weight land in the almanac.

## ⭐⭐ Foraging's economic job: a price ceiling on necessities

User, 2026-10-08, and it replaces the framing this slate's
[discovery](../builds/discovery-slate.md) half carried:

> *"you can't cultivate everything, this game forces you to specialize.
> so foraging isn't a backstop against **capability**, it's a backstop
> against the **market**. when I can't afford carrots can I find them in
> the wild?"*

> **Foraging is a price ceiling on staples.** If carrots cost more than
> the walk, people walk — which caps what a grocer can charge, permanently,
> with no authored price control. ⭐ So the foraging build is pedagogy
> about the **grocer**, not about the forager. And it is *measurable*: the
> ceiling works when a forageable staple's price sits below the cost of
> the walk and does not stay above it.

### The knife-edge, and the single lever

Two failure modes, both named by the user, and they are one variable from
opposite ends:

| failure | shape |
|---|---|
| **never foraged** | it is always cheaper to buy, so the backstop is dead content |
| **the lottery** | the market prices wild procurement as the most lucrative route, the reservoir is camped, and it is a lottery between the few who engage |

> **The lever is: can wild yield be aggregated into LOTS?** A market
> trades in lots — a predictable quantity of a uniform good on a schedule.
> Subsistence trades in **singles** — one person, one meal, now.

Five properties, every one an already-shipped mechanism, make wild yield
structurally unlot-able: **sparse + dispersed** (rule 6), **seasonal**
(the window), **non-excludable** (*excludability is physics*),
**perishable** (`FreshnessMixin` + a high `a_w` on fresh greens), and
**variable grade** (weakest-link harvest grade; `minGrade` on a recipe
slot). ⚠ Any one alone is a nerf and reads as one. All five together is a
**shape** — the real shape of a common-pool resource, which is why the
arithmetic comes out right with nobody tuning it.

### ⭐⭐⭐ Both failure modes are DEMAND-side

The inversion worth building on:

> **Foraging's only honest customer is your own metabolism.** The moment
> it has a **wholesale** customer it becomes the lottery; while its
> customer is the body of the person who picked it, it is a backstop.

- **Never-foraged** is fixed by making the body a real buyer — the five
  slow stocks are what it pays in — not by buffing yields. One wild carrot
  in season is exactly subsistence-shaped.
- **The lottery** needs a *bidder*. No bidder, nothing to camp. So the
  build's constraint is concrete and checkable rather than a balance dial:
  **no retail `par` line names a forageable · `consign` has no route for
  wild singles · no recipe slot absorbs them at scale.** ⭐ Three greps,
  and a candidate census-and-ratchet with a ceiling of zero.
- ⭐ **And if it is lucrative anyway, that is the content.** A valuable
  commons gets **enclosed** — game law, close seasons, licences, poaching
  — which [hunting-slate](../builds/hunting-slate.md) already owns. So the
  lottery is not prevented, it is **answered**, and the answer is the
  polity noticing. A non-excludable reservoir with a recharge law *is* the
  commons problem; lens 1 pays rent for free.

## ⚠⚠ Where foraging may happen — and the conflation to refuse

⛔ **Corrected in conversation, having been got wrong twice.** Parcel title
and in-fiction land ownership are **unconnected axes**:

| axis | answers | mechanism |
|---|---|---|
| **code / content** | who may **edit, broadcast over, teleport within, CMS** an extent — the committee of authors who maintain the code | `parcels` → `ownerOf` → `can` / `canAtPath` / `heldExtents`; a pack's `requires.title[]` |
| **the fiction** | who holds the **deed in the story** — trespass, rent, consent | a different question, satisfiable by **any agent: a player, an NPC, or an in-world organization** |

⚠ `pnpm lint:untitled` proving every shipped path sits under a claim proves
**maintenance coverage**. Its own header gives the axis away — an untitled
row is one *"nobody can edit, broadcast over, or teleport within."* It is
**not** *"every acre has a landlord"*, and reading it that way produced an
invented inalienable gathering right for a problem that does not exist.

> **The rule: foraging happens on land no fictional party claims, or with
> that party's consent.** The committee's consent is needed for **all** of
> it — they write the code the content runs on — which makes it a
> **constant, not a design variable**: it never discriminates between two
> in-fiction designs.

⭐ Refusing *without* consent is where game law, close seasons and poaching
attach, so the hunting slate's material needs no second mechanism.

## Open

1. ⚠ **Is every in-fiction holder representable?** A code check, not a
   design question: `ParcelOwner`'s `player` / `organization` kinds appear
   to make the two axes coincide deliberately for player-held property
   (*ownership unlocks authoring*), while tenure (`grants[]`, the lease)
   may carry some of it. Verify before the foraging requirements.
2. **Ice's climate fork** — a colder winter realm-wide (touches every
   thermal consumer at once) vs ⭐ **a cold PLACE** whose climate lean
   crosses 273 while Terminus does not. The second is recommended: small
   blast radius, it rides the shipped lean, and it gives the ice trade a
   **cartage** problem, which is the trade. →
   [cold-chain-slate](../builds/cold-chain-slate.md).
3. **Does the capacity call want the event record, or a projection of
   it?** Foraging's inputs (traffic, remoteness) are a read over history;
   whether that is a live walk or a maintained projection is the one
   performance question in this spine.
4. The **graduate-to-doctrine** call on the RGO law is still the user's,
   and this section is the strongest argument yet for taking it — the law
   now has a second slot and an author contract hanging off it.
