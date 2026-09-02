# Water — the watershed

The build that makes water **get somewhere**. Water already has physics
everywhere and weather nowhere: it is bulk matter you can fill, pour and
drink; the body has a `hydration` reserve and dehydration is a death
path; soil holds moisture in litres inside a shipped Liebig `min()`;
`douse` and ice→water→steam ride one phase-change model. What is missing
is every connection between them — nothing joins the sky to the soil, no
source depends on another source, and no place is upstream of anywhere.

This build supplies the missing relation, and it is one relation:
**every place has a position on a watershed.** Flow, rights, diversion,
storage, pollution and hydro power are all readings of that single fact.
The organising principle underneath is **gravity** — `mgh` is the
primitive, and water's behaviour is derived from it rather than
authored.

Seeded by [water-design-pack](../slates/builds/water-design-pack.md),
[supply-design-pack](../slates/builds/supply-design-pack.md),
[grid-slate](../slates/builds/grid-slate.md),
[power-utility-slate](../slates/builds/power-utility-slate.md) and
[delivery-slate](../slates/builds/delivery-slate.md), with
[fishing-slate](../slates/builds/fishing-slate.md) adjacent.

## Goals

- **Every place has an elevation**, and water's direction of travel is
  derived from it rather than declared.
- **A watercourse exists as an addressable thing** with an ordering, so
  "upstream of" is answerable between any two places in the realm.
- **Flow is a quantity that can be taken**, so a diversion upstream is
  felt downstream.
- **Precipitation reaches the ground it falls on** — soil moisture and
  streamflow both integrate rainfall exactly over any absence.
- **Water banked as snow at altitude releases on melt**, producing a
  seasonal hydrograph with a spring rise and a late-summer low.
- **Water can be conveyed** by gravity, by pump, or on your back, and
  which of the three a place gets is a consequence of its terrain.
- **Water can be stored**, and storage buys both head and buffer.
- **Water can be dirtied**, and the dirt travels downstream and decays
  or does not decay according to its kind.
- **A claim on water is recordable, senior-datable and transferable**,
  supporting riparian and prior-appropriation doctrine from one
  mechanism.
- **The works can be owned** — by an office, a concession, or the users
  themselves.
- A source's failure is legible through **one closed vocabulary** shared
  with every other utility.
- **A locality declares its position on the water**, so the watershed is
  a second, orthogonal hierarchy to the address tree.
- **A reach knows whether it is navigable**, and navigation competes for
  flow with every other use.

## Non-goals

- **Domestic metering.** The mains stay effectively unlimited at the
  household tap. The [water pack](../slates/builds/water-design-pack.md)
  argued this and it stands: household draw is trivial, the accounting
  would be noise, and metering it converts a habit into an errand.
  Rivalry lives at agricultural and industrial scale.
- **Mass conservation at watershed scale.** The sky supplies and the sea
  absorbs. Bulk water *in a vessel* stays conserved exactly as it ships;
  the boundary is the moment you draw from a source.
- **Pipe segments and within-district networks.** `grid-slate`'s rule
  holds — *build the METER, never the RULE*, and there is no `Street.ts`.
  A conduit has two ends.
- **The power utility's institutions.** Hydro generation and pump draw
  are in as physics; the municipal fork, billing, and utility labour
  stay [power-utility-slate](../slates/builds/power-utility-slate.md)'s
  own build.
- **Fishing, hunting and foraging.** No verbs, no catch model. This
  build ships the contaminant field a future fishing build reads.
- **Disease.** Contaminated water routes through metabolism's shipped
  toxin path. [disease-slate](../slates/builds/disease-slate.md) deepens
  it later.
- **A new civics jurisdiction tier.** A river authority is a *firm*.
- **Treatment as a modelled process.** It is an attribute of a conduit,
  not a plant with stages.
- **Water as a navigable space.** Boats, swimming, diving and on-water
  rooms are fishing's Regimes 2 and 3 (D25); river freight is
  [freight-slate](../slates/builds/freight-slate.md)'s.
- **The Wharfside district.** The build authors the water's edge, not
  the dockers' hall, the chophouse or the west bank's industry (D24).
- **Authoring Rejection or Heart's Delight.** Neither exists as content;
  both belong to their own locality builds (D20). This build records the
  basin geography and asks one declared field of them.

## Surface decisions

### D1 — A river is an `Idea` plus an ordering; a reach is an object only when content needs one

**Q:** What kind of Stuff is a river?

A watercourse is an authored data **`Idea`** in a catalogue,
resolve-on-read — the `Biome` / `Government` / `Corpo` / `Material`
shape. It carries its nodes, their connections, and its catchment.

A **reach** is a node identity on that river (`kestrel:4`), not an
object, and a place cites its reach the way rows already cite
`_biomePath` and `_address`. Upstream/downstream between any two places
is then an ordinal comparison, realm-wide, with no graph walk.

A reach becomes a **real object only where content puts a structure on
it** — a dam, an intake, a weir. Rights and contamination still key on
the ordinal.

**Rejected: river-as-Location.** Most of a watercourse runs through
country nobody will ever stand in, and Hinkley Lane already settled the
principle — *the unbuilt lots are prose, not nine empty rooms; prose is
bulk, Stuff is few*. It is also the wrong containment: a mill *beside*
the river is not *in* it, and a diversion right attaches to a position
that may never have a room at all.

### D2 — Facts derive, claims persist: this build adds **zero** collections

**Q:** What is persistent, and where does it live?

| State | Home |
|---|---|
| the watercourse — nodes, connections, catchment | authored content, a template row |
| flow at a reach | **derived, never stored** |
| composition — temperature, clarity | **derived** through shipped physics |
| contamination level · storage level · conduit state | state + stamp on the object, via the self-persistence spine |
| **a water right** | a **`water-right` document kind** in the path-addressed tree, gated by `canAtPath` |

A new collection is justified on exactly three grounds: the document
tree's own gate depends on it (`parcels`, which `canAtPath` resolves
through — it cannot live in the tree it gates); it is a high-volume
append-only ledger wanting its own indexes; or it sits behind a sealed
chokepoint. **A water right is none of the three**, and `release` is
already precedent for a runtime-written, path-addressed document kind.

Pollution blame likewise needs no ledger — upstream discharge harming a
downstream party is what `accountability_events` is for.

### D3 — Potential energy is the primitive

**Q:** What is the organising physical quantity?

`mgh`. Gravity already ships as a chain-resolved, authorable
`AtmosphericTrace<Quantity<'m/s²'>>`, and every water behaviour is a
reading of potential energy:

| Behaviour | Derivation |
|---|---|
| direction of flow | toward lower `h` |
| a lake or basin | a local minimum |
| the sea | the global minimum — downstream of everything |
| snowpack | water banked at high `h`, released by thermal |
| hydro output | `ρ·g·Δh·Q` |
| a gravity conduit | Δh in your favour; free to run |
| a pump | Δh against you; costs energy forever |

The last two are the join: **water falling makes power, water rising
costs power.** Water and power meet at one equation read in two
directions.

### D4 — Elevation is a **zone** field

**Q:** Which tier owns elevation?

The **zone**. It already owns spatial geometry (`cellSize` drives
volume, light-scale and extent) and already does field inheritance with
an ancestor walk and a `lookupAncestorField` override hook. Biome owns
properties of the *air*; elevation is a property of the *ground*.

⭐ **The decisive reason is a circularity.** `measure altitude` computes
`(P_sea − P_local) / (ρ·g)` from the biome chain's authored `_pressure`
— so altitude is currently back-computed from a number an author typed,
and putting elevation on the biome too would give one physical fact two
sources of truth. Elevation on the zone makes pressure the *consequence*
and the altimeter an honest instrument.

Therefore **`_pressure` gains a derive-from-elevation fallback**, with
an authored value still winning.

⚠ **`coords.z` is not elevation.** `z` is local and measured in zone
cells — which floor of a building. A place's height is
`zone elevation + z × cellSize`; hydrology reads the **zone**, so a
third-floor flat and the lobby are the same point on the watershed.
Terrain variation within a district is obtained by zoning finer.

### D5 — Topology is authored; direction is derived; monotonicity is guaranteed

**Q:** How is a watercourse's ordering established?

The watercourse declares its nodes and connections. **Elevation directs
every edge** — an author never writes an arrow.

Elevation is authored at **control points** (source, falls, confluence,
mouth) and **interpolated between them**, so an uphill reach is
*unrepresentable* rather than caught by a lint. The remaining check is
one assertion: source above mouth. Where elevation ties — a flat reach —
the ordering falls back to the authored connectivity, which is honest,
because a canal across a flat *is* directed by how it was dug.

Distributaries come free: with direction derived, one `branchesFrom`
structure covers a tributary joining and a delta splitting.

The ordinal is **identity** (recomputed when content changes); flow is
**state**. Runtime comparison stays an integer compare.

### D6 — Flow is a takeable volume

**Q:** Is flow a scalar you read, or a quantity you can remove?

A rate, and every intake subtracts it from downstream. Capacity and
seniority are meaningless otherwise.

Flow at a node is the integral of precipitation over its upstream
catchment, less upstream draw, plus snowmelt release. Catchment is
**declared per locality** in v1, not derived per-place.

### D7 — Conveyance is a ladder, not a network

**Q:** How does water get from a source to a place?

Not a topology — a question terrain asks of every place:

| Mode | Requires | Costs | Status |
|---|---|---|---|
| **haul** | nothing | labour + encumbrance | ships today |
| **gravity conduit** | source above destination | capital only | new |
| **pumped conduit** | power | capital **and** energy | same object + a draw |

A **conduit** is one object with an **intake** (a reach), a **delivery**
(an extent), a **capacity**, an **owner** and a **state**. Nothing
inside the delivered extent is modelled — *coverage is legal, connection
is physical.*

Delivery is to an **extent**, resolved longest-prefix, so "am I on the
main?" is the mechanism `ParcelRegistry` already uses for title.

**Capacity is a number**, because an over-subscribed main in a dry
August is what gives the rights layer something to bind.

### D8 — Excludability decides law versus business

**Q:** Why is water law public and water service commercial?

Because a river is **non-excludable** and a conduit is **excludable**.
You cannot keep someone off a river; you can close a valve on your
aqueduct. So the river gets **rights** and the conduit gets a
**business**, and the split is a consequence of physics rather than a
declaration — the metal chain's *toll the hoist to fund the pump*.

### D9 — Effluent is the same conduit, reversed

**Q:** Is wastewater in scope, and does it need its own machinery?

In scope, and no. A sewer is a conduit with its endpoints reversed —
intake at a place, outfall into a reach. Storm drains likewise. One
primitive serves supply and disposal.

### D10 — The axis is **controlled**, not man-made

**Q:** Do canals, reservoirs and other built waters need their own
types?

No. What actually distinguishes them is whether someone can choose how
much water passes, and that is a **control structure** — a dam,
headgate, weir or sluice: a Thing on a reach with a setting that
redistributes flow **in time** (store the freshet, release in August) or
**in space** (divert into a canal).

- a **canal** is a watercourse with a control at its head, and its
  monotone gradient is the surveying problem, not a limitation;
- a **reservoir** is a node with volume and a control at its outlet;
- an **irrigation ditch** is a small canal.

The control structure is what converts flow *variability* into flow
*reliability* — the most consequential fact about water infrastructure
in history — and what makes the watershed political, since whoever holds
the dam holds everyone below. It also makes hydro dispatchable.

What origin changes is legal, not physical: a natural course is a
commons allocated by **law**; a built work is sunk capital allocated by
its **builder**; and the middle case, where the users collectively own
the works, is an **irrigation district**.

### D11 — Storage is a reservoir at built elevation

**Q:** Are there water towers, and what are they for?

Yes, and not primarily for volume. A tower supplies **head** (so taps
below it have pressure without a pump running) and **buffer** (it
decouples a steady supply from a peaky demand). It needs no new type: it
is a reservoir whose elevation was built rather than found. Filling it
costs energy; emptying it provides Δh — which is how a **flat city gets
a gravity conduit**, and Terminus is flat by construction.

⭐ A tower is why water still runs during a power cut, for a few hours.
**The buffer size is the outage tolerance.**

A cistern is the household-scale version (one already ships at Duncan
Hall), and roof-catchment harvesting falls out as catchment area ×
precipitation.

⚠ **Storage is the first genuinely stateful thing in this build.** A
level is not derivable, because outflow depends on player draw. It is
state + stamp on a `Persistable` host.

### D12 — One substance, a contaminant **level**, and a contaminant **kind**

**Q:** How is dirty water modelled?

One material with a contaminant level — matching fishing's composition
bundle and the closed-material doctrine. But a single level is not
enough, because the important fact about water pollution is
**self-purification**: a river cleans itself of sewage over distance and
never cleans itself of lead.

So contamination carries a **kind**, from a closed set, and the kind
determines decay:

| Kind | Downstream behaviour |
|---|---|
| **organic** | decays with distance — the river recovers below the town |
| **persistent** | does not decay — the river never recovers below the smelter |
| **sediment** | settles; raises turbidity |
| **nutrient** | accumulates where residence time is long |

### D13 — The counterplay ladder is spatial, personal, then capital

**Q:** What can a player do about bad water?

1. **Move the intake** upstream of the outfall — free, and historically
   the first real answer;
2. **Boil** — personal, per-use, the actionable half of the John Snow
   lesson;
3. **Treat** — an attribute of a conduit that reduces contaminant by a
   factor; capital, systemic, the thing a town invests in.

⭐ Whether an intake sits above or below an outfall is **already a fact
about the terrain**, derived from elevation and authored by nobody. The
map is the argument.

### D14 — A right is a volume per window plus a priority date

**Q:** What is a water right, mechanically, and how do two doctrines
share one substrate?

A **volume per window** and a **priority date**. Without a volume it
cannot be over-subscribed; without a date it cannot be senior.

- **Prior appropriation** records the right explicitly — dated,
  transferable, surviving the sale of the land.
- **Riparian** *derives* it from parcel ownership plus the parcel's
  reach citation, granting an equal share among bank-holders with no
  record at all.

So the substrate ships the record form (the superset) and riparian is a
derivation rule over it. A polity's doctrine is a choice, not a second
implementation.

The **quota rides the right, not the source** — a per-window counter on
the holder's own record — so enforcement needs no cross-drawer view and
no leaderboard can exist. *Aggregate, never report.*

### D15 — Rivalry ships through conduit capacity

**Q:** Does this build ship a shared well?

No. An irrigation ditch that cannot serve every share in a dry August
*is* the village-well problem, at the scale where rivalry belongs. A
discrete shared well is content, addable at any time.

### D16 — Power is in at the equation, out at the org chart

**Q:** How much of the power utility does this build absorb?

Two physics edges only: hydro output derives from `ρ·g·Δh·Q`, and a pump
consumes power. Governance, billing and utility labour remain
`power-utility-slate`'s. Water and power meet at the physics, not the
institution.

### D17 — Snowpack is in

**Q:** Is seasonality in scope?

Yes — it is the mechanism. Precipitation falling at a locality below
freezing accumulates as pack instead of running off, and releases on
melt, producing the spring rise and the late-summer low. **That low is
why senior rights matter**; without it, seniority never binds.

It is derivable, since weather is a pure function of time, and `snow`
already exists as a weather type — the water pack credited it zero
*pending exactly this*.

### D18 — The works can be held three ways; a river authority is a firm

**Q:** Who owns the infrastructure, and is a watershed authority a new
kind of government?

Three forms, all supported: a **governance office**, a **corpo
concession**, and a **cooperative / irrigation district**. This build
supports all three; which one holds Terminus's works is content, and it
is `power-utility-slate`'s open municipal fork.

A **river authority** is a **proprietor-absent public-infrastructure
`Business`** — the shape the Teleport Authority and the municipal city
budget already ship — not a government and not a new jurisdiction tier.
This is also historically exact: TVA was a government-owned corporation.

⭐ It is nonetheless the first institution whose reach is **not** a
locality: it follows the watershed, which cuts across localities by
construction.

### D19 — Ecology gets a seam, not a vertical

**Q:** How much of the water-body model does this build ship?

The **contaminant** field and the mechanism that carries it downstream.
Salinity, turbidity and dissolved oxygen stay fishing's to add. Fishing
then plugs into a river that is already alive.

### D20 — The realm is THREE basins, and the third is over the ridge from Rejection

**Q:** How do the localities sit on water?

Settled against the four criteria (pedagogy decides; expressiveness
breaks ties). **Three basins**, with the four towns at four positions
that their own economies already imply:

| Locality | Position | The water problem it has |
|---|---|---|
| **Rejection** (mining) | headwaters of the home basin — where the ore and the snowpack both are | it **fouls**, with the **persistent** kind that never decays, and it is upstream of everyone |
| **Heart's Delight** (farming) | a tributary valley, alluvial flats | it **diverts volume** — the seniority fight |
| **Terminus** (city) | the confluence, downstream of both | it drinks what is left, after Rejection has been in it |
| **Hinkley Hills** | the slope above the city, basin edge | a **head** problem, not a rights problem — which is why it has a standpipe and not a main |

Each town's industry *determines* which kind of water problem it has.
That is not authored coincidence; it falls out of where an economy has
to sit.

**The second basin** is a neighbouring drainage. **The third** is high,
clean and empty — and it is **over the ridge from Rejection**, so the
city's aqueduct to it must run through or past the territory of the town
the city cut out.

⭐⭐ **That last clause is the decision.** A neutral third basin would
let money simply exit the politics. Routing the pipe past Rejection
means the city's attempt to buy its way out **re-entangles it with the
same neighbours on worse terms** — the Owens Valley story, where the
aqueduct was dynamited by the valley it drained. Capital becomes a move
in the game rather than an escape from it.

**What this teaches that one basin cannot:** the ladder is *live with
it → treat it → move your intake → reach another basin*, and the last
rung is affordable only to the city. **Rejection, Heart's Delight and
Hinkley are still drinking it.** A city solving its own problem and
abandoning the commons is the real political economy of water, and a
harder lesson than "the parties negotiate."

**Scope line.** This build authors the **watercourses**, Terminus's
position on them, and the aqueduct. It does **not** author Rejection or
Heart's Delight — neither exists as content, and both belong to their
own locality builds. What the model asks of them is one declared field
(D21).

### D21 — Two hierarchies, deliberately unaligned; a Locality declares its water

**Q:** How does the watershed relate to the address tree?

They are **orthogonal, and their misalignment is the point.**

- The **address tree** is *political* containment — `terminus` → `city`
  → `campus`, with `_governmentKey` per locality.
- The **watershed** is *hydrological* ordering — Rejection → Heart's
  Delight → Terminus.

Terminus governs its own streets and has no say over what Rejection puts
in the water. That is the real-world condition, and it is why the river
authority is the one institution that follows the **second** hierarchy
while every other institution follows the first.

Mechanically it is one field: **a Locality declares the watercourse it
sits on and drains to.** That declaration is the catchment of D6 and the
connective tissue between localities.

⭐ **The corollary: the river is the road skeleton.** Roads follow
rivers because rivers cut the only gradeable path, so the land route
between two localities in one basin follows the water. That matters
because fast travel is **reach-before-travel** — you walk somewhere once
and `register` it — so the walk up the valley is how a player learns the
watershed. Corridors get a reason instead of being arbitrary.

### D22 — The flagship conduit is an inter-basin gravity aqueduct

**Q:** What is the build's most ambitious piece of infrastructure?

Not a municipal main. **A long aqueduct reaching past your own watershed
into a higher, cleaner one** — gravity-fed the whole way, because that
is why such a route is chosen, and generating power on the descent from
the surplus head (`ρ·g·Δh·Q`, D3).

This is the distinction the build turns on, and it is not the same as a
tap: **the body you form around is not the source you drink from.** A
settlement rings a water body for transport and flat land while drinking
from somewhere else entirely. In this model that is exactly *your reach*
(geography you did not choose) versus *your conduit's intake* (capital
you did).

⭐ It is also the first thing in the game a single player almost
certainly cannot build alone. It wants a polity or a company — a
cooperation gate that emerges from physics rather than from a lock.

### D23 — The build ships ONE road: the valley route to Hinkley Hills

**Q:** Does this build make the corridors D21 talks about?

One of them, and only because its endpoints both exist.

⚠ **It also fixes a live gap.** Nothing in shipped content has an exit
*into* Hinkley Hills except the TPA route on
`departure-terminal-a`; the arrival room's only exit runs further in;
and nothing grants Hinkley's travel node. Since fast travel is
**reach-before-travel** and Hinkley is not among the born-with three, a
player must walk there to register it — and there is nowhere to walk
from. The e2e reaches it with `wizard: true`, which is the tell: **a
wizard stand-in is a missing player path.**

So the build ships the **Terminus → Hinkley valley road**: up the slope,
following the water, with the standpipe at the end explaining itself.
It is the working demonstration of D21 — the route exists *because* the
river cut a gradeable path — and the altimeter survey along it is the
first thing that makes elevation legible to a player.

**Roads to Rejection and Heart's Delight are out**, because there is
nothing to connect to. They ship with their localities (D20).

### D24 — Wharfside: the city finally meets its river

**Q:** Where does Terminus touch the water it is built on?

Nowhere, today. **Wharfside appears in ten design documents and zero
content files**, and no authored Terminus room mentions a river at all.
A city whose entire geographic premise is a confluence has never had a
place to stand beside the water.

The build authors **the riverfront itself** — the bank at the
confluence, the city's **intake**, and its **outfall** — because those
are the objects the watershed needs made visible. Standing at Wharfside
and seeing where the city drinks and where it discharges is what makes
D13's *the map is the argument* something a player can look at rather
than infer.

**Out of scope: the district.** The dockers' hall, the chophouse and
the proto-industrial west bank are already characterized by the city
track, [zoning](../slates/builds/zoning-slate.md) and
[freight](../slates/builds/freight-slate.md), and they belong to those
builds. This build lays the water's edge; the neighbourhood grows on it.

### D25 — Navigation is a claimable use; boats are not this build

**Q:** Does water transport belong here?

The **claim** does; the **vessel** does not.

**In:** navigability **derived** from a reach's flow and channel, and
**navigation as a claimable use** carrying a minimum-flow requirement —
so an upstream diversion can strand it.

⭐ The reason is not boats. **Navigation is a competing claim on the
same flow**, and navigation-versus-irrigation is the classic water
fight — the Missouri, the Colorado. It gives the seniority system a
claimant who is not a farmer, for the cost of one entry in the use
vocabulary, out of quantities the build already computes.

**Out:** boats, the liquid warren, on-water rooms. [The fishing
slate](../slates/builds/fishing-slate.md) already owns that ground — its
Regime 2 is explicitly *"the boat wave"* and it names the river as *"the
one plausible Warren."* River freight belongs to
[freight](../slates/builds/freight-slate.md).

The payoff of leaving it this way: when the boat wave lands it reads a
river that **already knows where it is navigable, and knows that changes
with the season.** Nobody authors navigable stretches — a dry August
closes them, and curtailing a junior right reopens them.

## Constraints

- **⚠⚠ An unresolved supply ref must read UNKNOWN, never ZERO.** The
  supply pack names this its highest-risk item, and this codebase has
  been bitten three times by a cache nothing warms reading null forever
  while hand-constructed tests stay green. "Not yet resolved" and
  "resolved to nothing" must be different values, and the supply ref
  gets **its own checkpoint** so the first successful resolve integrates
  the full backlog.
- **Cache the source's IDENTITY (async, once); derive its STATE (sync,
  live).** Consumers reconcile on read and must not await a walk.
- **The recurring-charge call**: meter on **use** only — never on
  connection, never on ownership — and any charge must be dischargeable
  without attendance.
- **Anything that runs over absence takes an explicit Law-2 check.**
- **One closed failure vocabulary** shared with every utility: dry ·
  cut · frozen · fouled · off · overdrawn. A seventh is a design
  conversation.
- **Enumerate, don't infer.** Where a roster is the safety property, it
  is a listed set with a CI gate, per `lint:locations` / `lint:census`.
- **No migrations.** Drop the DB.
- **`coords.z` is not elevation** (D4).
- Zone field reads go through `zone.lookupField<T>`, never
  `ZoneApi.resolveZoneField`.
- ⚠ **A locality may legitimately resolve NO government**, and the
  build must not assume otherwise. `GovernmentApi` returns
  `[]`/`null`/`false` off-grid by design — *"no government is a normal
  state of the world"* — and **The Last Counted Mile is deliberately
  off-grid** (frontier wilderness until somebody charters it; its row
  says so, so nobody "fixes" it).

### D26 — University Avenue and the Counting-Houses are the city; the frontier is not

**Q:** Three localities claimed root address prefixes and resolved no
government. Which belong to Terminus?

Two of them, and they are now re-homed:

| Locality | was | now |
|---|---|---|
| University Avenue | `university-avenue` | `terminus/city/university-avenue` |
| The Counting-Houses | `counting-houses` | `terminus/city/counting-houses` |
| The Last Counted Mile | `last-counted-mile` | **unchanged — wilderness** |

Neither of the two declares a `_governmentKey`: jurisdiction derives as
**a chain over the address coverage walk**, so being at
`terminus/city/…` makes them subject to the city and the realm without
restating either. That is the model working as designed.

⚠ **Six room addresses moved with the two localities** — the crossing,
the market square, Goodkin's hall and parlor, the avenue row, and the
general store's floor. A Locality claims a prefix; changing it without
moving the rooms underneath would have orphaned every one of them from
its weather node and its jurisdiction, silently.

### D27 — Hinkley is reached by the road, and the works are the District's

**Q:** Two forks left open by D18 and D23.

**The travel node is NOT granted at `title buy`.** The valley road
(D23) is the whole fix: you walk there, you `register` it, and
reach-before-travel means what it says. Granting the node on purchase
would let a player own a place they have never been, which is a worse
fiction than buying sight-unseen is a good one.

**The works are held by the Hinkley Hills Improvement District** — the
cooperative form of D18. It is the right answer for a reason the content
already set up: the District ships as a shell (charter `""`, treasury
`""`, no departments, no seats) described as having *"never once been
asked to do anything else."* An improvement district is historically the
vehicle for exactly this, and water scarcity giving a paper institution
its first real job is a better story than chartering a new authority.

⭐ It also keeps D22's inter-basin aqueduct genuinely out of reach: a
district of smallholders cannot fund one. The aqueduct stays the city's
move, and the District stays the counterparty that cannot follow.

## Acceptance criteria

1. A place resolves an **elevation** through the zone chain, with an
   authored override winning, and `_pressure` derives from it when
   unauthored.
2. `measure altitude` returns a value consistent with the zone's
   elevation — the instrument reads a cause, not its own input.
3. Given two places on one watercourse, **upstream/downstream is
   answerable** and agrees with their elevations.
4. A watercourse authored with a mouth above its source **fails at
   parse**, naming the offending control points.
5. Rainfall integrates **exactly** over an arbitrary absence gap —
   including one spanning many weather segments — into both soil
   moisture and reach flow, with a replay over the same interval giving
   the same answer.
6. Snow accumulates below freezing and releases on melt; a full year
   produces a **spring rise and a late-summer low** in reach flow.
7. An upstream intake **reduces** measured flow downstream of it.
8. A conduit whose intake is below its delivery **requires a pump**, and
   that pump draws power; one whose intake is above does not.
9. A conduit at capacity refuses further draw with **`overdrawn`**, and
   every one of the six failure states is reachable and legible.
10. Delivery resolves by **longest-prefix extent**, and a parcel under a
    served extent reads as on the main.
11. A tower fills against Δh at an energy cost, supplies head to its
    extent, and its **level survives a restart**.
12. An outfall raises contamination at its reach; an **organic** load
    decays downstream while a **persistent** load does not.
13. Drinking contaminated water delivers a **toxin dose** through the
    shipped metabolism path; boiling prevents it; a treated conduit
    reduces it.
14. A prior-appropriation right is **recorded, dated and transferable**;
    a riparian right over the same reach is **derived from parcel
    ownership with no record**; both answer the same allocation query.
15. Two rights on one over-subscribed reach are served **in seniority
    order**, and a junior right is the one that goes short.
16. A per-window quota refuses an over-draw **without exposing any other
    holder's draw**.
17. Hydro output at a control derives from `ρ·g·Δh·Q` and **rises and
    falls with flow**.
18. A **Locality declares its watercourse**, and two localities in the
    same basin resolve an upstream/downstream relation while two in
    different basins resolve **none**.
19. An **inter-basin aqueduct** delivers from a reach in one basin to an
    extent in another, gravity-fed end to end, and its surplus head
    drives a generator.
20. A player can **walk from Terminus to Hinkley Hills** and `register`
    its terminal, with no wizard powers anywhere in the path.
21. A reach reports **navigable or not**, derived from flow; an upstream
    diversion that drops flow below a navigation claim's minimum
    **strands it**, and curtailing the junior right restores it.
22. **`pnpm lint:schema` reports no new collection.**
23. A subsystem doc exists at `docs/subsystems/watershed.md` and is
    reachable from CLAUDE.md's map by a one-line entry.
24. Every new topic key resolves under an existing root
    (`pnpm lint:topics`).

## Cross-references

**Seeding slates** —
[water-design-pack](../slates/builds/water-design-pack.md) ·
[supply-design-pack](../slates/builds/supply-design-pack.md) ·
[grid-slate](../slates/builds/grid-slate.md) ·
[power-utility-slate](../slates/builds/power-utility-slate.md) ·
[delivery-slate](../slates/builds/delivery-slate.md) ·
[fishing-slate](../slates/builds/fishing-slate.md) (adjacent) ·
[zoning-slate](../slates/builds/zoning-slate.md) (the outfall is a LULU)

**Subsystem docs the build reads or changes** —
[zone](../subsystems/zone.md) (elevation) ·
[biome](../subsystems/biome.md) (gravity, pressure) ·
[weather](../subsystems/weather.md) (the precipitation integral) ·
[bulk](../subsystems/bulk.md) (water as matter) ·
[husbandry](../subsystems/husbandry.md) +
[smallholding](../subsystems/smallholding.md) (soil moisture) ·
[metabolism](../subsystems/metabolism.md) (the toxin path) ·
[thermal](../subsystems/thermal.md) (freeze, melt) ·
[persistence](../subsystems/persistence.md) (the spine) ·
[document-store](../subsystems/document-store.md) (the right as a kind) ·
[parcel](../subsystems/parcel.md) (extents, longest-prefix) ·
[accountability](../subsystems/accountability.md) (pollution blame) ·
[employment](../subsystems/employment.md) (the authority as a Business) ·
[electricity](../subsystems/electricity.md) (the pump draw)

**Doctrine** —
[stewardship-doctrine § the recurring-charge call](../stewardship-doctrine.md) ·
[antipatterns](../antipatterns.md) ·
[vocations](../vocations.md) (water / sewer worker is a listed GAP)
