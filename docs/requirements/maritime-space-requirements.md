# Maritime space — requirements

**Kind:** feature
**Leads from:** [navigable-water-slate](../slates/builds/navigable-water-slate.md)
§§ 1–3c, 5a, 7a · [structures-slate](../slates/builds/structures-slate.md)
**First consumer, in this build:** one water a person can see across, one
water they cannot, a headland that overlooks both, a building whose
outside is visible from three zones away — and **one craft that crosses
an expanse between two nodes**, which is what makes the course, the
reckoning and the chart reachable rather than shipped-and-dead.

⭐⭐⭐ **The thesis: this realm has one spatial model and needs three.**

Every place in the game is a room on a grid with cardinal exits. That
model is correct, shipped, and it cannot express water — because the
thing a person does on water is **cross it**, and the thing they do in a
room is **be in it**. We thought the spatial question was settled months
ago and it was, for land. Maritime content is the case nobody checked.

> | register | a position is | what it needs to look like |
> |---|---|---|
> | **the grid** | a room, with cardinal exits | a **map** — everything shipped |
> | ⭐ **a passage** | **a fraction along one dimension**, two neighbours | a **line with you on it** |
> | ⭐⭐ **a field** | **a coordinate with NO neighbours** | a **bearing and a distance** |

**The whole build is the second and third registers, and the one authored
fact that chooses between them.**

### ⭐⭐⭐ And the expanse is TWO LAYERS, not one node with a flag

The register table says what a position *is*. This says what the content
*is*, and it is the decision the first draft of this document got wrong:

| layer | what it is | what lives there |
|---|---|---|
| **the expanse** | a geographic graph of **Ideas** — points of interest and the edges between them | position, course, reckoning, co-presence, traffic, the resource in the extent |
| **the node's content** | ⭐ **ordinary Cartesian Locations, like any other content** | rooms, details, props, cast, exits, a biome |

⭐ So arriving somewhere is not *becoming* a room — it is reaching a node
and then taking an ordinary exit into ordinary content. **Nothing is ever
inside the expanse's frame**, and a venue on a sea is authored by exactly
the same means as a venue on a street. `Watercourse` is the shipped
precedent one dimension down: topology authored, direction derived, a
compiled reachability set, and *"a reach becomes a real object only where
content puts something on it."*

---

## What already exists

- **Zones** carry a coordinate frame, field inheritance and the
  cardinal-only-intra-zone exit rule, and they already stamp the frame
  onto everything positioned in them. ⚠ But the frame's surface is
  **narrowed to rooms** — one consumer's constraint on a general
  mechanism, and the narrowing is what makes a water impossible to
  express.
- ⚠⚠ **And the shipped frame is a LATTICE.** `coords` on
  `CartesianLocation` is a grid cell, with the cardinal-exit rule
  attached. Inheriting it would force every node on a sea onto a fixed
  grid, which is the one constraint a sea must not have.
- **Elevation** is a zone field with an ancestor walk, and pressure
  already derives from it. ⭐ So *height above a datum* is solved, and
  an eye height is derivable today.
- **The watercourse** ships with reaches, derived navigability that
  changes with the season, flow as a takeable volume, and a shore
  feature that **cites** a water rather than containing anything. ⭐ The
  citation pattern is the one this build generalises.
- **Weather** is a stateless procedural field that is a pure
  deterministic function of time and place, with an exact precipitation
  integral. ⭐ Which is what makes a *seeded* field legal and a drawn one
  unnecessary.
- **The celestial model** answers the sun's altitude and the day's
  length for any latitude, including the polar limits — ⚠ from a
  **single campus constant** (*"single-region v1; per-zone latitude is
  future work"*), which the climate build is turning into a resolved
  value.
- ⭐⭐⭐ **A per-player knowledge model ships, and it already has every
  property an unrevealed sea graph needs.** `location-graph.md`: the
  **evidence firewall** (⛔ *the index must never reach a client*, made
  structural by an import gate) · **four channels, three of which can be
  wrong** — `walked` · `seen` · `searched` · `published` ·
  claims **append and nothing is corrected**, *"which is what lets a map
  be wrong"* · **a plan is a hypothesis**, with `assumptions` as a
  first-class field citing `channel` + `lastSeen` · cost on every axis
  with the renderer selecting, including a **`conditional` risk axis**,
  *"the first place in this game where a fast uncertain way can be
  weighed against a slow sure one"* · and ⭐ *"the channels are the words,
  so a new channel needs no edit in the renderer."*
- ⭐⭐ **The instrumentation ladder ships.** `measure`/`analyze`/`readings`
  are flat verbs over a `Reading` ROW any pack ships, declaring
  `channel`, `kind`, `scope`, `discipline`, `instrument`,
  `instrumentNoun`. A trade adds a reading with **no platform file
  changed and no new verb** — and `sky` already exists with *"no
  instrument, and none is missing — looking up IS the instrument."*
- **`journey`** plans with a vehicle's own declared `travelMode`, and
  `travelMode: sailed` already exists on the barge.
- **Employment** ships seats, shifts, wages, the derived help-wanted
  sign and the `call`. ⭐ Which is what a lookout is.
- ⚠ **And nothing says two rooms belong to one building.** Four things
  come close and none claims it: an address prefix, a title, a
  contiguous zone, and a warren of clones of one template.

### ⚠ What is broken or absent, found on the way

1. ⛔ **A water cannot be a place you are.** There is no water a person
   can stand on, no water biome at all, and *"a place that can be
   underwater"* was never the gap — the gap is **a water you cross.**
2. ⛔ **A landmark exists only in the prose of the room next to it.** The
   clock tower on University Avenue can be seen from outside the
   structure and **nowhere else**, and the only way to widen that today
   is to write the sentence into every street room by hand.
3. ⚠ **A prop contributes nothing to its room's prose** — named as a
   defect by the fishing build and still true, which is why a shore, a
   reach's character and a landmark all have nowhere to speak.
4. ⚠ **There is no navigation Discipline.** **Seventy-seven** rows exist
   and **not one** mentions navigation, seamanship, pilotage or sailing;
   `teamstering` is the land-haulage one. A `Reading` row must declare a
   `discipline:`, so the rows force the question — answered under
   *Surface decisions*.

---

## Goals

- **A water node is either a place or a passage, and one authored fact
  decides which.** A pond you can see across is somewhere you *are*. The
  open sea is somewhere you *cross*, cited rather than inhabited, where
  your position is real and no room exists. ⭐ **The test is only ever:
  can you see across it** — "lake" is not a category, and a 350-mile
  lake is a passage.
- **A passage is one-dimensional or two.** On a river or a canal your
  position is a fraction along it and it has exactly two neighbours, so
  it needs a traversal duration and nothing else. On open water your
  position is a coordinate with no neighbours at all.
- ⭐⭐⭐ **A node sits anywhere, so the frame is geographic.** A position
  on an expanse is a geographic coordinate, not a lattice cell —
  otherwise every island, bank and ground is pinned to a grid the sea
  has no reason to have. ⭐ **And the in-fiction plot is a separate
  question with a separate answer**: a course and a distance on a
  tangent plane is ordinary plane sailing, convertible to and from the
  frame by arithmetic, and it is what a player actually works with.
- ⭐⭐⭐ **The expanse has BANDS, and a band confers cost and character,
  never connectivity.** A current, a trade wind, a reach with a
  reputation. Any two nodes are always reachable by setting a course
  between them; an edge only says what a crossing is *like*, and whether
  to follow one is the player's. ⛔ **An edge is never the only way
  across** — *"disconnection on an expanse is never topological"* — and
  the moment it is, we have rebuilt the exit graph on water.
- ⭐⭐⭐ **And an edge is a BAND, not a rail.** It has a direction and a
  **width**, so your course either lies inside it or it does not, and
  **the interesting moment is the boundary.** You cross into calm out of
  chop and *the water tells you*; you then alter course to lie along the
  band, or hold your course and take the chop back. ⭐ Nobody authored a
  decision point — the geometry made one.
- ⭐⭐ **So following an edge is an activity, not a choice made once.** A
  band has width and you drift, so staying in one needs tending — which
  is what navigating along an edge actually costs, and why a lazy
  straight course is a real alternative rather than a worse one. A
  straight course crosses whatever bands lie in its way, in order, so
  ⭐ **a featureless passage is still textured at the boundaries**, with
  nobody placing anything.
- ⭐⭐⭐ **And the sea is itself a navigational instrument.** Veer off and
  the field changes when you were not expecting it — evidence that your
  reckoning is wrong, costing nothing and needing no instrument. You
  know you have left the stream because the stream feels different, which
  is true of the real thing, and it is **evidence you never had to ask
  for** — not a fourth fix, a thing the sea tells you.
- ⭐⭐ **And the edges are what finally price horizontal passage.** The
  slate's deepest open item: *"the vertical axis priced its passage
  (breath, cold, ballast) and the horizontal one got flow × width and a
  boolean."* A cost and a risk on an edge is that model — westing dear
  and easting cheap, a route a judgment rather than a line, and a chart
  worth buying.
- ⭐⭐⭐ **The graph does not reveal itself.** Unlike the containment
  graph, an expanse's nodes and edges are not visible for standing
  there. What you know of a sea is **claims** you made, were told, or
  **read off a chart** — so a chart is a thing you procure, it can be
  wrong, and it stays wrong because claims append and nothing is
  corrected.
- ⭐⭐⭐ **Crossing open water is setting a course, not choosing a
  destination**, because there is no exit to take. You declare a heading
  and a rate; the world tells you where you arrived. **And the world
  knows where you are while you do not** — your reckoned position
  accumulates from heading, speed and elapsed time, and drifts from the
  truth by the current and the wind, which you cannot read directly.
  ⭐ Nothing is rolled: the error is accumulated ignorance of a seeded
  field, and being lost is **a condition you work out of**, never a
  punishment.
- **A person can take a fix, at a cost they choose.** By recognising
  something within sight, free. By sounding the bottom, which costs way.
  By an observation of the sun, which **the weather can deny**. ⭐ Or by
  hiring somebody who knows the water.
- ⭐⭐ **Latitude is cheap and longitude is dear.** A noon sight gives you
  how far north you are and says nothing about how far along — which is
  true, derivable, and hands the design an epoch ladder for free:
  longitude wants a clock that keeps time at sea, and the realm already
  ships a timepiece that **drifts**. *My watch is wrong and therefore I
  do not know where I am* is a mechanism, not a flavour line.
- **The crossing is a durative engagement held by the CRAFT, not by the
  player**, and it is **event-driven** — things happen on a passage that
  somebody has to deal with. ⭐ So an unattended passage **accumulates
  neglect** off a seeded field: the pumps were not manned, so water rose
  at a rate the world already knew. ⛔ Nothing is rolled — the same
  provenance as the reckoned position, which is the second time one rule
  covers both halves of this design.
- **What is around you on open water is what you can see, and that
  differs for every observer.** A masthead sees further than a dory, and
  ⭐⭐ **the advantage is a job somebody is doing** rather than a property
  of the vessel: a ship with nobody aloft is blind by its own choice.
  ⚠ And seeing is **one channel of several** — the model must admit a
  second with a different range, because a hail at twelve miles is not
  sound, and a thing below the surface has no horizon at all.
- ⭐⭐ **Open water is not empty.** What passes a lane at this hour on this
  day is a **seeded fact about the world**, so two people an hour apart
  meet the same traffic, a water can be *learned*, and re-entering gains
  nothing. ⭐ The lanes have the traffic, so they have the help — and
  they are hunted out and policed; the empty water has the stock and
  nobody within sight. **Remoteness is both the reason the resource is
  there and the reason you die**, with nobody authoring a tension.
- **A coast is land that cites a water.** A beach is a place on land,
  holding a feature that points at the water beside it — so a person can
  fish, launch, wade and look out from somewhere that is unambiguously
  ashore.
- ⭐⭐⭐ **An author can say "from here you can see that," and be
  believed.** A headland overlooks a bay. A tower is visible across a
  district. A lighthouse is visible from open water at a range its
  height decides. ⛔ **And the engine never guesses** — on land the claim
  is authored, because what is in the way is not modelled and a computed
  claim would be confidently wrong; at sea the range is computed,
  because nothing is in the way.
- ⭐⭐ **A building's outside is described once and read from anywhere it
  can be seen**, rather than written into every room with a view of it.
  Which requires something that says *these rooms are one building* —
  and that thing coordinates its rooms without containing them, owns
  only what no room can own alone (the roof, the outside, the way in),
  and is **sparse**: almost nothing is in one.
- ⭐ **A thing that is placed, cited or looked at from elsewhere can
  speak in the prose of the room that can see it**, instead of being
  invisible until examined.

---

## Placement

### The three tiers

| | holds | notes |
|---|---|---|
| **the expanse frame** | nodes · edges · position without neighbours · the crossing engagement · co-presence by radius · the field that varies across the extent (traffic, the resource) | ⭐⭐⭐ **Medium-agnostic.** The instances are **sea · desert · ice · void** — and `universe` is already a shipped biome, so a craft crossing a void to sparse stations is this model exactly. `name-the-substrate-not-one-consumer` binds: it is named for the mechanism, never for water |
| **the water tier** | ⭐ **the column** (a surface at a level, and a depth measured from it) · tide · sea state · draught and navigability | ⚠ Named for the **medium**, not for a body of water — it must hold equally for a sea, an ocean, an inland sea or a great lake. ⭐⭐ And the **column is what justifies the tier's existence**: strip it out and almost nothing water-specific remains, at which point `never-invent-the-third-consumer` says do not create the class |
| **the realm's water** | a **ROW**, not a class | `Watercourse` is the precedent and it is settled doctrine: the **mechanism is the pack's** and the **instance is the realm's**, so the realm's own pack can edit its own sea. ⛔ A per-instance class would title the realm's water to the system pack and make them the gatekeeper for content they did not author. **Its name is a word in a row and can be decided whenever** |

### The column, and how much of it is this build

⭐ **The axis exists and is one-valued.** A node has a surface level; a
position has a depth; this build only ever reads depth zero. The
underwater build adds the ascent, breath, pressure and the medium — it
does not have to *introduce the axis*, which is the expensive part and
the only part that would force a retrofit of every position in the
system if it arrived second.

⚠ **This reverses the previous draft's ⛔ "must not add a depth field."**
The prohibition saved one field and bought a retrofit. And it was
unholdable anyway: **a sounding reports a depth**, and a sounding is one
of the four fixes.

### A node is a POINT, because the extent is a FIELD

⭐⭐ A node carries no radius. **Stock is a field over the extent and you
work it where you are** — so a fishery is not a node with an area, it is
a value the field answers at your position. Whaling the same. ⭐ That
keeps *being at a node* an identity rather than a test, keeps the
shore↔expanse boundary hard, and means a sea's resource needs no nodes
at all.

### ⭐⭐⭐ The deck is a SHORE THAT MOVES — nothing is ever minted

**Nodes are where bespoke authored content lives. Everywhere else is
light procgen, and the sea needing almost no features is the point.**

⛔ **But stopping away from a node does not mint a place.** An earlier
draft of this section said it did and that was wrong: a minted place
would put a person **inside the water's frame**, which the model forbids
and `Watercourse` settled first — *"a mill beside the river is not in
it."*

⭐ Instead the craft's deck carries a **`Shore`-shaped feature whose
citation resolves to the expanse at the craft's current position**, and
this is nearly free because `Shore` already ships in exactly that shape:
a **room-fixed feature** that cites a water rather than containing
anything, keeping a refreshed memo — and ⭐⭐ **a verb that wants water
already declares `default: "reachable:[class.Shore]"`.** So `fish` works
from a deck with **no change to the fishing pack at all**, and whaling's
launch has somewhere to stand.

⭐ The light procgen is the **citation's derived description** — *"grey
water, a long swell, nothing in sight"* — read off the field (biome, sea
state, depth, stock) and costing no author anything, ten thousand times
over. The house pattern exists twice: `ground.md` mints every Location's
floor with a **derived ten-word kind, never authored**, and
`forestry.md`'s `Wood` is *"ground with a stand cover, derive-on-read
from its own soil, read by `look` in words."*

⭐⭐ **And nothing persists because nothing exists**: residency never
arises, there is no place to evict, and the frame invariant stays
*literally* true rather than nearly true.

### ⭐⭐ Sea state is DERIVED, and nobody ever authors "rough"

| | |
|---|---|
| wind **direction** | ⭐ the **band's lean.** A trade wind is named for being constant — direction is a band fact, not a weather one |
| wind **strength** | the **weather field**, read and never edited |
| **fetch** | ⚠ **authored on the band** — one number |
| **depth** | the column, at this position |
| **sea state** | ⛔ **always derived. Never authored, at any tier.** |

⭐ An author writes *"the wind here sets westerly, hard, in winter, over
a long fetch"* and roughness **follows** — which clears the derivability
bar the slate set with `Watercourse` (*an uphill reach is
unrepresentable, not validated*). And the bar pilot's danger falls out
for free: **short steep seas over a shoal** are what a long fetch at a
shallow depth *is*, with nobody authoring *"the bar is dangerous."*

⚠⚠ **Why direction comes from the band and not from the weather.**
`weather.md` lists *"vector wind, moving fronts"* as an explicit **wave-2
tail**, so shipped wind is **scalar** — and this build reads the weather
and edits neither. The split is the escape: **direction from the band,
magnitude from the field.** No weather edit is needed, and vector wind
arriving later only refines it.

⚠ **Why fetch is declared rather than derived.** True fetch is the
distance of open water upwind, which requires knowing where land is — the
terrain model this build refuses for line of sight. So it is a
declaration, under the standing rule: *ask whether the predicate exists
before promising to derive it; often it does not, and then it is a
declaration plus a ratchet.*

### ⭐⭐ You are always inside something

> **At a node you may step out of a craft into authored content. Between
> nodes you may only move BETWEEN CRAFT — and the position belongs to
> the OUTERMOST one.**

⭐ Launching a boat from a ship is the case that makes this precise: the
boat is a `Mobile ExitableVessel`, a Thing you are *in*, so nobody is
ever in the water — and the boat, now the outermost thing crossing for
its occupants, **holds a position of its own.** The outward walk decides
whose position applies, which is the same resolver the biome chain
already uses.

⚠ **One forward-compat constraint, and it is the only part of this that
matters now:** the position field must be able to live on **a boat as
well as a ship**, because retrofitting *whose* position it is would
reach every reader of it. ⛔ What a towed boat *means* — carried
somewhere you did not navigate to, with your ship over the horizon — is
a design this build does not settle. → `navigable-water-slate` § 7c.

---

## What an author writes

⭐ Two tables, and they are the whole authoring surface of an expanse.
Everything else about a sea is derived, seeded or consumed from another
build.

### A node

| | |
|---|---|
| position | lat/long. ⭐ **Anywhere** — this is why the frame is geographic |
| identity and character | a name, and prose for what being here is like. ⭐ The `a reach has no character` fix |
| `place \| passage`, `linear \| areal` | the three authored facts |
| the content behind it | a destination — ordinary locations in a zone — or **nothing.** ⭐ Most nodes have nothing |
| surface level | the column's zero |
| what can be seen from here, and at what height | the vantage and landmark half |
| stock | ⭐ the resource. `SpatialZone` already keeps `stocks`/`favours`, already justified as *"only a region in space can stock goods"* |
| ⛔ biome | **not authored here** — consumed from the climate build |

### A band (an *edge* is the special case that has endpoints)

| | |
|---|---|
| ⭐ an **extent** | the region it occupies. A **corridor** (two points and a width) or a **belt** (a span that connects nothing) — a small closed vocabulary, extensible, because ⭐⭐ **the engine only ever asks "is this position inside this band?"** |
| a **direction** | ⚠ Load-bearing: a current helps one way and hinders the other, so an undirected band makes a trade wind unmodellable |
| ⭐ **endpoints — OPTIONAL** | two nodes, or none. See *Surface decisions*: they are a **planning affordance**, not a geometry |
| a name | *the Westerlies*, *the Narrows* |
| cost per axis | time and way — plus the **`conditional` risk axis**, which already ships |
| ⭐⭐ a **wind lean** | a direction and a strength — its **own** small shape. ⚠ `weather.md`'s `ClimateLean` is a per-weather-type multiplier with no direction, so it cannot be reused. ⭐ **This is the band's mechanical character** — not prose |
| ⚠ a **fetch** | one number: how much open water the wind has had. **Declared, not computed** — see *Sea state* |
| prose | what the crossing is like, for flavour. ⭐ The lens-2 answer the slate said water did not have, but it is the lean that does the work |
| a reputation | ⭐ what people *say* — a `told` claim, **and may be false** |
| a season or window | a trade wind blows when it blows. Climate build again |
| a traffic weighting | busy lane, or empty water |
| hazard rows placed in it | a shoal, ice, a reef — `hazard.md`'s self-resolving hazards |
| a stock | what is here to be taken |

⭐⭐⭐ **A band MODULATES SHIPPED MECHANISMS; it is not a script host.**
*"This crossing has a character"* and *"things happen on this crossing"*
are one fact wearing two hats — a node is where you **arrive**, a band is
what the voyage is **made of** — and an author expresses both by saying
**what is TRUE here**, never by writing a sequence.

| what happens on a passage | the shipped mechanism that does it | what the band authors |
|---|---|---|
| the sea changes | the crossing itself | the lean, the fetch |
| the weather turns | `weather.md`, **read** | the lean |
| a sail, a contact | **seeded traffic** | a weighting |
| a leak, gear failing | the neglect model + `Durable` | how hard it is on gear |
| ⭐ a shoal, ice, a reef | **`hazard.md`** — self-resolving, with a `HazardDelivery` | a hazard row |
| something ashore comes in sight | the landmark + a computed range | nothing — geometry |
| fish, whales | the **stock field** | the stock |

⭐ So the Bermuda Triangle is a traffic weighting, a hazard set and a
reputation, and no engine knows it is special. ⛔ **The moment a band
carries a script hook it stops being geography**, and *"a second venue
needs zero pack code"* is gone with it.

⚠ **What genuinely needs code goes somewhere else:** a bespoke one-off —
a derelict with a story, the ghost ship of the Narrows — is a
`candidate`/brain or ordinary content **at a node.**

---

## The command surface

⭐⭐ **The client is command-line first, comprehensive, and the rich
surface is built on top of it later — the same approach as combat.** So
the verb set *is* the UX, and it is the deliverable. Checked against all
466 shipped views.

### Three new verbs

| verb | shape |
|---|---|
| **`anchor`** | ⭐ **stop the craft** — leave the voyage engagement without arriving anywhere. ⛔ It mints no place: the deck's citation simply reads the field where you stopped (see *Placement*), which is what makes fishing and whaling work on open water. `course` takes you back out |
| **`course`** | `course` reads your current course and your reckoned position **with its uncertainty**; `course <bearing>` / `course <node>` sets one and begins the crossing. Zero-arg-reads / arg-sets is the shipped shape (`cockpit <mode>`, `house par`) |
| **`hail`** | a directed act at a sighted contact. ⛔ Not `shout`, which is the acoustic-range verb — a hail at twelve miles is flags, a light or a gun, which is the **second sighting channel** getting a real consumer instead of staying hypothetical |

⛔ **Not `plot`** — taken by farming (*"break a new field out of ground
you already hold"*). Nothing unifies breaking a field with laying off a
course, so one of them needs a different word, and `course` is the better
word regardless. ⛔ Not `set course`: `set` is the settings verb.

### Two new `Reading` rows, and no verbs at all

| channel | the act | instrument | discipline | notes |
|---|---|---|---|---|
| **`depth`** | `measure depth` | a lead line | `navigation` | ⚠ Free — `dip` is mining's seam angle and `elevation` is the land's. This is the sounding, and it is why the column cannot be deferred |
| **`latitude`** | `measure latitude` | a sextant | `navigation` | ⭐ The noon sight. `altitude` already exists and means *your own height, by altimeter* — a different question |

⭐ **The weather denial is free.** `sky` already ships with no instrument
and an `expert` eye ceiling, so overcast refuses the sight in the sky's
own terms with nothing added.

### Five honest extensions

| verb | today | on an expanse |
|---|---|---|
| **`locate`** | *"report the location chain of an object"* | ⭐ There is no chain, so it answers with **your reckoning**, and says that is what it is. It is a **perception** verb, so reporting what you perceive rather than the truth is already its contract |
| **`read`** | *"take in the marks on a written thing and decode them"* | ⭐⭐ **That is the chart.** `read <chart>` writes **`charted`** claims into your map |
| **`map`** | renders your claims | renders the charted ones too, with **no renderer edit**, because the channels are the words |
| **`journey`** / **`route`** | plan over the exit graph | ⭐ They **refuse honestly and name `course`**. The precedent is exact: *"a map cannot answer `by wagon`, and says so… names the verb that knows"* |
| **`appoint`** | an employment seat | ⭐ **A lookout is a seat, not a verb** — and a hired watchman is *"a wage and a seat, not a second player."* A player going aloft is `go` to a station |

### ⛔ Deliberately no `fix` verb

The four fixes are four different acts that already have verbs. What they
share is *collapsing the uncertainty*, which is an effect, not an act —
and a verb for a category is what the collision ladder's first rung
refuses. ⭐ **The category is taught by the readout instead**: `course`
says *your position is reckoned, about forty miles' uncertainty; a sight,
a sounding or a landmark would tighten it.* The refusal is the
progression UI, and the player learns the three ways without a verb that
does nothing.

⛔ Also refused as taken, none worth contesting: `watch` (livestreaming),
`sink` and `shore` (mining), `study` (arcana), `survey` (soil).

---

## Voyage structure

### ⭐⭐ It is a SUSTAINED engagement, not a durative one

The shipped framework splits engagements on whether a timer completes
them: a `DurativeActivity` carries a `duration` and an `onComplete`, a
`SustainedEngagement` ends only when an explicit verb aborts it.

⭐⭐⭐ **A course has neither, because a course is a heading and not a
destination.** You sail until you stop. **Arrival at a node is an event
the beat detects, not the engagement finishing** — which makes *"setting
a course, not choosing a destination"* true at the engine level instead
of only in the prose.

### ⚠ The craft holds it, and that is a real departure

`Engagement.actor` is a `Stuff & Engaged`, and today the shipped journey
is the **driver's**: the coach says it outright — *"a passenger holds no
engagement at all — the journey is the driver's `hands`."* ⛔ A voyage
held in a driver's hands means they can do nothing else for the length of
a passage and logging out ends it. So **the craft composes `Engaged` and
holds its own engagement**, which is a host-placement change rather than
something inherited.

### ⛔ No phases

Departure, passage and landfall are **reads** off the position and the
horizon, not stored states — the house pattern everywhere else (wounds,
competence bands, trait position, renown and residency all reconcile on
read). ⚠ Phases as objects would be the third instance of the thing the
slate already caught twice: **adding an object where a field would do.**

### ⭐⭐ The watch is the beat

The mechanism ships: `emissions: ScheduledEmission[]` — *"the declarative
cadenced-side-effect channel; authors describe what fires on what
cadence, the scheduler owns the timers."*

**One emission, one watch.** Four game hours is twenty real minutes on
the 12× clock, and ⭐ the watch is already the unit of three separate
things — the beat, the **manning** (who is on deck for it), and the
crew's deliberation, since `behavior.md` already gives each agent **one
beat**. A long passage is scores of watches and almost all of them are
empty.

⚠ **And nothing about a voyage may live only in the engagement**, because
the engagement does not survive a restart. Persisted: the position, the
course, and when the course was set. **The engagement is re-established
at boot** from those three and the elapsed time — maturation's pattern,
and it is what actually makes *"the craft moved while I was logged off"*
true.

### ⭐⭐⭐ Two sources of activity, and the player chooses the mix

| | what it is | determined by |
|---|---|---|
| **boundary crossings** | the **texture** — most of what happens on a passage | ⭐ **deterministic.** Your course and the authored bands. Computable the moment a course is set, which is why **a chart can preview it** |
| **encounters** | the **punctuation** — a sail, a contact, trouble | **seeded.** The same for everyone at that place and that hour. ⭐ A lookout converts a surprise into a **fifteen-minute window** |

⭐⭐ **So the passive/active ratio is authored nowhere.** A straight course
across a busy sea is eventful; a tended course along a quiet band is
calm; and both are the player's doing. *How passive is a voyage* is a
question about the water you chose and the watch you kept.

⭐⭐⭐ **And the lookout's value states itself: a lookout does not give you
more information, it gives you more time.** A contact at twelve miles
closing at four knots is fifteen real minutes away. Manned, it arrives
announced and closing, running, hailing or hiding is a real decision.
Unmanned, it arrives *at* you. Same seeded fact; the watch converts a
surprise into a window — which is *"a ship with nobody aloft is blind by
its own choice"* as a mechanic rather than a sentiment. ⭐ The fuse length
is **grain.**

### Flow control is three things

1. **Arrival detection**, on the beat.
2. **A boundary crossing**, which reports and asks nothing.
3. **A sighting opening a fuse.**

⚠ And one problem to solve rather than inherit: `interruptibleBy` must be
nearly empty, and **`cancelable` defaults to `true`**, so as shipped
anybody's `cancel` would end a voyage. Striking a course wants to be its
own act.

---

## Non-goals

- ⛔ **No vessel CONTENT.** In: the thing that says *these rooms are one
  building*, **its position as a variable**, and a two-space hull that
  exercises both. Out: stations and the `Chamber`, davits, the berth,
  the complement, draught-derived-from-load, and every other vessel
  mechanism. ⭐ The decision is already made and is not reopened here —
  *"a boat is a THING, a ship is a STRUCTURE whose position is a
  variable"*, and *"the whole difference between a building and a ship is
  ONE FIELD."* This build ships the Structure and that field, nothing
  more.
- ⛔ **No line of sight between arbitrary places, ever.** The authored
  claim is the whole mechanism on land. The moment it is computed, every
  author owes a terrain model and every look becomes a graph walk.
- ⛔ **No underwater.** The ascent, breath, pressure, the medium and the
  column's second value are the underwater build's. ⭐ This build ships
  **the axis and reads zero** — see *Placement*. → `underwater-slate`.
- ⛔ **No weather or climate change of any kind.** This build *reads* the
  weather and the sun and edits neither. → the climate and water build.
- ⛔ **No ownership model for water.** Who holds a water and what they
  owe is designed and deferred. → `navigable-water-slate` § 5.
- ⛔ **No second register for a room's interior.** Positions *within* one
  space are a different question with a different answer. →
  `navigable-water-slate` § 7a, the stations.
- ⛔ **No standing instructions.** An unattended passage degrades; what a
  hired crew does while you are away is **not this build's question**. →
  `standing-instructions-slate`, which is unopened and where *"may a
  player automate labour at all"* has to be answered on its own.
- ⛔ **No scripted multi-beat sequences on a band.** A storm that builds,
  breaks and passes wants an authored arc, and `scripting.md`'s
  **game-time Coroutine** is the right host for one. ⚠ It stays out
  because the moment it is available on a band, everything becomes a
  script instead of geography. → `navigable-water-slate` § 3b.
- ⛔ **No combat at sea.** Two ships in sight of each other is a real
  case and it is not this one. → `navigable-water-slate` § 7c, whose
  tether graph is the nearest designed thing.
- ⛔ **No pilot as an employed position.** Hiring somebody who knows the
  water is in as a **fix**; a pilotage trade with seats, a licence and a
  rota is not. → `navigable-water-slate` § 3b, *"pilotage is two trades
  sharing a word."*

---

## Collisions

| | |
|---|---|
| ⚠⚠ **the climate & water build** | **It owns the biome chain and the water pack's temperature.** This build *consumes* a biome for a water's surface and **must not edit the chain**. If this build needs a water biome to exist, it takes a stub and that build replaces it |
| ⚠⚠ **latitude** | ⭐ **The climate build owns it; this build consumes it.** It is turning a single campus constant into a resolved value, and an expanse node's latitude is the same number. **A gift, not a cost** — a node's position then gives it a climate for free, so a northern ground is cold *because of where it is* and nobody authors a temperature |
| ⚠ **the assembly build** | owns the compartment-with-its-own-air. **This build must not touch it** — automatic, given no stations and no `Chamber` |
| ⚠ **the underwater build** | ⭐ **The axis is ours and the second value is theirs.** This build declares that a position has a depth and only ever reads zero; they add everything that makes a depth mean something. Nothing they need gets retrofitted |
| ⚠⚠ **`standing-instructions-slate`** | **An event-driven passage that degrades unattended depends on a question nobody has opened.** This build ships the neglect model and does **not** decide whether a crew may act on standing orders — the taps build decided exactly that inside a trade build and it was cut before the MR merged |
| ⚠⚠ **vector wind** | ⭐ **sea state needs a direction and shipped wind is scalar** — `weather.md` has *"vector wind, moving fronts"* as a wave-2 tail. This build takes direction from the **band's lean** and touches no weather code; when the climate build vectors the wind, the lean becomes a deviation rather than the only source |
| ⚠⚠ **the shipped claim store** | ⛔ **`told` and `bought` were CUT**, and the shipped vocabulary is `walked` · `seen` · `searched` · `published`. This build **adds two channels, each with its writer in the same change** — see *Surface decisions*. ⚠ `location-graph.md` still carries a **stale** four-channel section describing the cut vocabulary as live; fix it at the sweep |
| ⚠ **the word "structure"** | ⭐ the drilling build shipped a `structure` **reading channel** — *"the shape of the rock under this ground"*. Unrelated to the building coordinator this build ships, and the two must not be conflated in prose: `measure structure` is geology |
| ⭐ **four documents cite the vessel decision by section letter** | do not renumber it |

---

## Surface decisions

### The expanse is an Idea graph, and a node's content is ordinary Locations

**The question.** Is a water node *itself* a room where content wants one,
or is it always an Idea with content behind it?

**The answer.** Always an Idea; the content behind it is ordinary. ⭐ The
reason is expressiveness: if a node can *become* a room, then authoring a
venue on a sea is a special case of authoring a venue, and every
subsystem that works on a street has to be taught about water. With two
layers, a harbour is authored exactly like a market and the sea knows
nothing about it. ⛔ And it keeps *"the ocean as a Container"* ruled out,
which `Watercourse` settled first and better: *"a mill beside the river
is not in it."*

### The frame is geographic; the plot is plane sailing

**The question.** Reuse the shipped lattice, or a geographic frame?

**The answer.** Geographic. ⚠ The shipped `coords` frame is a **grid
cell** with the cardinal-exit rule attached, so reusing it pins every
island and bank to a lattice the sea has no reason to have. ⭐ And the
two are not alternatives for the same job: the **frame** is geographic so
a node sits anywhere, and the **plot** is a course and a distance on a
tangent plane because that is what a navigator works with. The conversion
is arithmetic, and real navigation makes the same split.

### A band carries cost and character, never connectivity

**The question.** If there are edges, do they define what is reachable?

**The answer.** No. Any two nodes are always reachable by setting a
course; an edge says what a crossing is *like*. ⭐ The whole value of the
expanse is that disconnection on it is never topological — the moment an
edge gates reachability, this is the exit graph again with a different
renderer, and every reason to build it is gone.

### ⭐⭐⭐ A band is a REGION, and the boundary is the activity

**The question.** Is an edge a route you travel along, or a region you
are inside?

**The answer.** **A region** — a corridor with a direction and a width.
A rail would make an edge a thing you *choose once*, which is a menu;
a band makes it a thing you are *in or out of*, which is a position, and
every question about edges then answers itself: following one needs
tending, veering out of one is detectable, ignoring them all still
crosses them, and a wrong chart is a band drawn in the wrong place —
⭐ discovered by **not feeling a change you expected.**

### ⭐⭐ A band needs no endpoints — a free-standing belt is legal

**The question.** Must every band run between two nodes?

**The answer.** No. A current runs between places; a **belt** — the
doldrums, a latitude of fog — connects nothing and simply lies across
everything, and both are legal.

⭐⭐⭐ **And this is a simplification rather than a loosening.** Because a
band confers **no connectivity**, a band with endpoints was never
*structurally* different from one without — so allowing belts does not
relax the model, it reveals that **endpoints were always decoration.**
What endpoints buy is that a band becomes **nameable in a plan** (*via
the Westerlies*) and documentable on a chart as joining two places.
Nothing else changes.

⚠ So **"edge" is the wrong word for the general case** and *band* is the
authored concept; an edge is the special case that happens to have
endpoints. ⭐ **The graph is the NODES; the bands are the field's
structure.**

### ⚠⚠ Overlapping bands — forced by belts, so decided here

Corridors between nodes rarely overlapped. **Belts overlap by nature** —
a current crossing a fog belt is the ordinary case — so a composition
rule is now mandatory rather than optional:

| | rule | why |
|---|---|---|
| **field values** — the wind lean, the fetch | ⭐ **the narrowest band wins** | the shipped pattern twice over: `zone.md`'s innermost-ancestor field walk and `address.md`'s longest-prefix resolve. ⭐ And it hands authors the obvious tool — **to override a belt locally, author a narrower band** |
| **placed things** — hazards, stock | **union** | a hazard is a thing *placed*, not a value competing for a slot, so it was never in contention |

⭐⭐ **And it is what makes the chart mechanical rather than decorative:
the chart shows the bands.** Without one you learn a sea by crossing it
and feeling the changes. With one you plan — and the plan is already a
hypothesis that states its evidence. The chart, the reckoning, the
uncertainty and the edges turn out to be one mechanism, and none of it
needed inventing.

### ⭐⭐⭐ `navigation` is a Discipline; the river pilot is NOT

**The question.** The two reading rows must each declare a
`discipline:` and there is no navigational one. What gets added?

**The test**, from the catalogue's own rule: *"A Discipline is a FIELD OF
STUDY, not a JOB TITLE. If you cannot anchor it to a real ISCED-F code,
it is not a Discipline — it is a position, and positions live on a
Business roster."*

**The answer.** Run it over the slate's two halves and they land on **two
different mechanisms**:

| | | |
|---|---|---|
| **the deep-sea navigator** | *"mathematics and an instrument"* | ⭐ **a Discipline.** A real field of study — arithmetic, tables, an observation. Teachable and transferable, and *replaced by better clocks*, which is what a field of study does |
| **the bar or river pilot** | *"local and unteachable — a channel that moves with the freshet and that nobody wrote down"* | ⭐⭐⭐ **not a Discipline — CLAIMS.** A Discipline is a field of *study*, and this explicitly is not studied. It is knowledge of one water, which the claim store already models |

⭐⭐ **And that pays for itself twice.** *Hiring somebody who knows the
water* needs no employment system, because **you are buying claims** —
which is also why they can be sold, and why they can be **wrong.** And
the pilot's progression is **their map growing**, which is better than a
band because it is specific: they know the Kestrel, not rivers.
⭐ It makes the unteachability mechanical rather than asserted — you
cannot study your way to knowing a channel, you have to go there, which
is `uncertainty.md`'s abstraction law holding (*an abstraction is
legitimate while it still costs somebody the activity*).

⭐ It also explains the epoch asymmetry the slate noticed with no rule
added: the navigator is replaced by better instruments **because a field
of study can be**; the pilot never is, because the channel keeps moving
and no instrument records it.

### The `navigation` row

```yaml
class: /platform/idea/Discipline
data:
  key: navigation
  channel: skill
  label: Navigation
  iscedf: "1041"  # ISCED-F 2013: transport services
  description: >-
    Reckoning a position from heading, speed and time; the sight, the
    sounding and the landfall that correct it. Knowing how wrong you
    probably are, and what it would cost to be sure.
  requires: []
```

⭐ **A sibling of `teamstering`, sharing the code**, which is explicitly
blessed: *"sharing an ISCED-F code does not argue against a split. A
shared code means the same field; it does not mean the same practice"* —
and `guarding`/`stealth` at 1032 is the shipped pair, *"the same field
studied from opposite ends."*

⛔ **Not `pilotage`** — by the slate's own analysis that is the ambiguous
word two trades share. ⛔ **Not `seamanship`**, which is ship-handling
and too broad. And a *navigator* is a **position on a roster**, which is
the job-title half of the test falling on the right side.

### What competence buys, and what it must never buy

`teamstering`'s rule is the standing one and it is blunt: ⭐ ***competence
buys information, not outcomes***, with ⚠⚠ *"no conferral makes the same
act better — asserted in the suite, because it is the one thing that
would quietly turn a discipline into a stat."*

**Information:**

- the **bracket on a sight** is narrower — never refused, because
  *competence resolves DETAIL and never ACCESS*;
- ⭐ a **sounding reports what the bottom is**, not only how deep. The
  armed lead brought up sand or shell, and that is how you knew where you
  were — real technique, and information *before* you commit;
- the **reckoning carries a better allowance for the set of the
  current**. ⚠ Precisely: competence does not reduce the world's drift,
  only your estimate of it. The water does what the water does.

⛔ **No capability rung, deliberately.** Teamstering's second half is
*bigger rigs* — a different act, not the same act done better — and the
honest analogue here is handling a larger vessel, which is the vessel
build's. So `navigation` **grades and gates nothing**, like `stealth`
(*"no conferrals: competence only grades"*). ⭐ Which satisfies *"band 0
must be able to earn"* in the strongest available way: a novice sets any
course anywhere, crosses badly, and the only way to get better is to go.

**What earns it:** taking sights, taking soundings, and ⭐ **arriving
where you said you would** — a deed with a verifiable condition.

### The knowledge layer is the shipped claim store, with TWO new channels

**The question.** Does an unrevealed sea graph need its own knowledge
model?

**The answer.** No, and this is the build's biggest de-risk. The shipped
store already has the firewall, append-never-correct, plan-as-hypothesis
and a risk axis; and *"the channels are the words, so a new channel needs
no edit in the renderer."* A chart that can be wrong and stays wrong is
not a feature to build; it is the store's existing growth rule.

⚠⚠ **What it does NOT have is the channels this build needs**, and an
earlier draft of this document said otherwise. It cited
`location-graph.md`'s four-channel table — `perception` · `publication` ·
`told` · `bought`, *"vocabulary with no writer"* — and called the chart
its first writer. ⛔ **That vocabulary was CUT.** The shipped channels are
`walked` · `seen` · `searched` · `published` (`lib/location/MapClaim.ts`),
and the cut's own reason was that *"an axis with two live values and two
imaginary ones teaches a reader the wrong shape."* The subsystem doc kept
the stale table beside the newer one, and that is what was read.

⭐⭐ **But the same sentence authorises this build to add them back:**
*"the retrofit argument is cheaper to make again later than a wrong
vocabulary is to unlearn."* This build is that later, and the condition
the cut implied is that a channel arrives **with its writer.** So two
channels are added, each with its writer in the same change:

| channel | how you came to know it | its writer, in this build |
|---|---|---|
| ⭐ **`charted`** | you read it off a chart | `read <chart>` |
| ⭐ **`told`** | somebody who knows the water told you | **hiring a pilot** — the pilot's knowledge is claims (see the `navigation` decision), and this is how they reach you |

⭐ **`charted`, not `bought`.** Every shipped channel names *how you know*
— walked, seen, searched, published. A transaction is not a way of
knowing; reading a chart is. That `bought` never fitted the axis's own
shape is plausibly part of why it read as speculative.

⚠ **And `told` gets the attribution question it was cut for.** The cut
noted that *somebody lied to you, and the record should say who* belongs
with the accountability ledger. A pilot's `told` claim carries who told
you — the minimum that lets a lie be traced — and the ledger link stays
the accountability build's.

### Where you log back on

**The question.** You went to sleep on a ship. Where are you?

**The answer.** **On the ship**, and nothing about player persistence
changes. ⛔ **You cannot die while logged out.** You log on where you
logged off, addressed by a durable handle — a singleton template path or
a warren key, always something that can be re-cloned — with the **lounge
as the resolve-failure backstop** for the case where somebody broke the
place you left. ⚠ **This build adds that backstop; it does not inherit
it.** An earlier draft said `Avatar.startLocation` already was the
fallback. It is not: today a login whose captured place cannot be
resolved leaves the avatar with no container, and `Avatar.enter` throws.
The fix lands the avatar on the `defaultStartLocation` app setting
(the lounge) instead.

⭐ Two consequences for a ship, and both are shipped shapes: its rooms are
**ordinary singleton locations in a zone** — their identity is the row,
so you always log back in on the deck — and its **position is one
persistent field on the Structure**. ⚠ An earlier draft said the rooms
were keyed by the persistence spine like a leased `DormRoom`. They are
not: the only Location class that persists is `FurnishableRoom`, so
**anything left in the hold does not survive a restart.** That is the
vessel build's problem to solve.

⚠⚠ **Not a warren, and the distinction is load-bearing.** A `Warren` is
an incorporeal `Idea` that coordinates member rooms or member warrens,
with tiers, holdings and circulation machinery. A ship's rooms need none
of that; what coordinates them is the **Structure**, which does a
different job — a warren is an *elastic graph* that mints members and
runs circulation, a Structure is a *unit of shared facts* (the outside,
the roof, the way in, the position). ⭐ Same for a node's content: it is
locations in a zone, and it becomes a warren only if something there
actually needs coordinating.

⚠ What a sinking costs: **the ship and the cargo, never the body.** The
remoteness axis supplies the fiction without an author — on a lane there
was help, in the empty water there was not, and the wreck is somebody's
salvage either way.

### The crossing engagement belongs to the craft

**The question.** Who holds it?

**The answer.** The craft. ⭐ That is what makes *"you wake up on the
ship"* true across a restart, and the precedent is good: the dying clock
*"does NOT freeze on linkdead"*, so durative state already runs while you
are gone. ⚠ The residue is residency — a ship under way with nobody
aboard and online is the pets build's *"residency pin: what loads a
pet"*, and something must keep it resident.

### Solo is worse, not impossible

**The question.** Can one person cross?

**The answer.** Yes, badly. ⭐ *"Two players and four hired hands is a
complete boat. One player and five NPCs is a WORSE boat, not an
impossible one"* — the penalty legible (**NPCs do what they are told and
nothing else**, so a hireling crew means you issue every order yourself),
⛔ **no hidden competence modifier**, and priced, because hired hands take
a lay and so a good player crewmate is *worth* a bigger share than a
hireling. **The labour market prices competence against a known
alternative**, which is the cleanest available answer to *why bring other
players.*

---

## Lens pass

⭐ Altitude, stated up front: the **invariants** here are the two-layer
model, edges-without-connectivity, nothing-rolled, and the engine never
quoting a true position. Everything else — how far a sight is denied, how
fast neglect accumulates, how many nodes a sea has — is **grain**, an
author's to change.

**1. Pedagogy ⭐⭐⭐ — the strongest lens on this build.** Nearly
everything is derivable and nearly all of it is real: dead reckoning is
heading × speed × time, the horizon is `1.17√h`, a noon sight gives
latitude and withholds longitude, and longitude needs a clock that keeps
time at sea. ⭐⭐ The **dominant** Discipline is `navigation`, added by this build —
and ⭐ its *other* half deliberately is not a Discipline at all, because
a channel nobody wrote down is not a field of study. See *Surface
decisions*.

**2. Creative expression ⭐⭐ — and the edges are what lifted it.** The
ordinary case needs no code: a sea is a row, with nodes and edges as
content. The **named-work test**: the Doldrums is an edge whose cost is
time; a triangle with a reputation is an edge with a risk and a rumour; a
gorge chain is places, authored because the content deserves them.
⭐ Before edges existed this lens was the weakest in the slate — *"a reach
has no character"* — and an authored edge is precisely a place to put
character.

**3a. Immersion ⭐⭐⭐ — the fiction must not betray itself, and here it
could.** The single failure to guard: **the engine quoting a true
position.** Your reckoning is yours, it is wrong, and no surface may
leak the truth — which is why `locate` answers with the reckoning and
says so. ⭐ And a chart that is wrong *stays* wrong, because
correcting it in the reader would be the reader overriding the writer.

**3b. Participation ⭐⭐⭐ — measured by whether the polity can do
something we did not want, and it can.** A chart is a **purchased
claim** whose channel records that you read it off paper somebody sold
you, so a market in bad charts is possible and nobody authored it. A lookout is a seat, so keeping a watch
is an employer's rota problem. Pilotage becomes a thing to sell.

**4. Values ⭐⭐⭐ — the undecidable choice is the route.** The short edge
with the current and the reputation, or the long sure one. ⭐ The engine
measures every axis, returns **incomparable plans both**, and does not
pick — *"choosing is the activity."* **Stakes, not a score**: nothing
converts the risk into a number that tells you what to do.

**5. Continuity ⭐⭐ — the capability survives the epoch.** A chronometer,
then a direction finder, then something that simply tells you: all of
them answer `locate` and `measure latitude`, and all that changes is how
large the uncertainty is. ⭐ The mechanism is the uncertainty itself, so
no epoch deletes it — it shrinks.

**6. Economy ⭐⭐ — produces passage and access to remote stock; consumes
time, stores, a crew's lay and charts.** Who pays: whoever owns the
craft. ⭐ Was the demand there first — yes, and visibly: the resource is
over the horizon, and *"remoteness is both the reason the resource is
there and the reason you die."*

**7. Governance ⭐ — thinnest here, deliberately.** Who may hold a water
is deferred whole. What this build does add is a **seller who can be
wrong about a chart**, which is an accountability surface rather than a
governance one. ⚠ Recorded as a gap rather than filled.

---

## The drive

Against the running game, before the MR opens.

1. **Stand on a shore** that is unambiguously land, and look at the water
   beside it. The water is described, and you are not in it.
2. **Wade in**, and be refused or admitted for a stated reason.
3. **Cross a water you can see across** — arriving at a place, by an
   ordinary exit, because a small water is a place.
4. **Board a craft and `course` out onto an expanse.** Read your position
   before you start and note it. ⭐ Your reckoned position and where you
   actually are are **not the same**, and the difference is visible to
   you.
5. **`locate` yourself mid-crossing** and get **the reckoning, labelled
   as a reckoning** — never a true position.
6. **Be told you are not where you thought**, and recover from it —
   `measure depth`, wait for a sight, or recognise something — and watch
   the uncertainty collapse.
7. ⭐ **`measure latitude` and get a latitude and nothing else**, then
   **have the weather deny the sight** and say so in the sky's own terms.
8. ⭐ **Take the same sight as a novice and as a practised hand**, and
   get the **same answer with a different bracket** — never a refusal.
   Then **`competence`** and see `navigation` on the transcript.
9. **Cross into a band mid-passage** and have the water change without
   anybody announcing it. ⭐ Then **alter course to lie along it**, hold
   it for a watch, and **drift out** — and be able to tell that you did.
10. **Hold a straight course across the same water instead**, crossing
    the band and out the other side, and have the two passages differ in
    a way the band explains.
11. ⭐ **Veer off course without taking a fix**, and learn it from the
    field alone — the water is not what it should be here.
12. **`anchor` away from any node** and **`fish` from the deck** — the
    water described by nobody, and ⛔ **without ever being in it.**
13. ⭐ **Sail into a belt that joins nothing** — a latitude of fog — and
    have it behave exactly as a band between two nodes does. Then
    **cross a narrow band laid over it** and have the narrow one's
    weather win.
14. ⭐ **Cross from a long fetch onto a shoal** and have the sea get
    worse, with nothing anywhere authoring *rough*.
15. **Launch a boat mid-passage**, be *in* it rather than in the water,
    and have **its** position be the one that answers.
16. **`journey` to a node and be refused honestly**, with the refusal
    naming `course`.
17. **`read` a chart you were given, then `map`**, and see the charted
    claims appear alongside what you walked and saw — **marked as
    charted.**
18. **`read` a chart that is wrong**, act on it, and find the water does
    not agree. ⭐ The claim is **still there afterwards.**
19. **See another craft at a distance**, and have a second observer at a
    different height **not** see it. Then **`hail` it**.
20. ⭐ **`appoint` somebody lookout** and see further than you did a
    moment ago, with nothing about the craft having changed.
21. **Pass the same lane twice at the same hour on different days** and
    meet the same traffic. **Re-enter and gain nothing.**
22. **Log out mid-crossing and log back in.** You are on the craft, the
    craft has moved, and the course is still set.
23. **Stand on a headland** and see the whole of the bay it overlooks.
24. ⭐⭐ **Read a landmark from three different zones**, described once,
    and from a fourth place see nothing because an author said so.
25. **Approach a coast from open water** and take a fix off a tall thing
    ashore, at a range its height decides.
26. **Look at a building from the street** and get a sentence nobody
    wrote into that street.

---

## Acceptance criteria

1. A water node declares **place or passage**, and if a passage,
   **linear or areal** — three authored facts, and ordinary content
   after that.
2. ⭐ A node's content is **authored by the same means as any other
   content**, and nothing is ever inside the expanse's frame.
3. A node's position is **geographic** — an author can site one anywhere,
   with no lattice and no cell.
4. **Edges exist, are authored, and carry cost and character.** ⛔ No
   edge is ever required to get between two nodes, and removing every
   edge from a sea leaves it fully crossable.
5. ⭐ **An edge is a band with a width**, and a course is inside one or
   it is not. **Crossing a boundary is reported** without anybody
   announcing it; **drifting out of a band is detectable**; and a course
   that ignores every band still crosses them in order.
6. ⭐⭐ **The field alone is evidence.** A navigator who has veered off
   can tell from the water, with no fix and no instrument.
7. ⭐ **Away from a node there is still a place.** It is derived, not
   authored, described from the field, discarded on leaving — and
   **fishing works in it.**
8. A person can stand on a **shore** and act on the water it cites,
   while never being inside the water's frame.
9. Crossing an areal passage is **setting a course**, and the arrival is
   computed rather than chosen.
10. A **reckoned** position exists, differs from the true one, and the
    difference is **readable by the player** and not by a number nobody
    sees. ⛔ **No surface reports the true position to its occupant.**
11. **Four fixes** work and cost differently, and at least one of them
    can be **refused by the weather**.
12. ⭐ A **sight yields latitude only.** Longitude is not obtainable by
    any means this build ships, and the refusal says what would be
    needed.
13. ⭐ **Sea state is derived at every tier** — from the band's wind
    lean, the weather field's strength, the band's declared fetch and the
    local depth. ⛔ **No row anywhere authors a sea state**, and no
    weather code is edited.
14. ⭐⭐ **Stopping away from a node mints nothing.** The deck's citation
    reads the field where you stopped, water-wanting verbs resolve
    through it, and ⛔ nobody is ever inside the water's frame.
15. **A band authors only what is TRUE in it** — a lean, a fetch, a
    traffic weighting, hazard rows, a stock, a reputation. ⛔ **No band
    carries a script hook.**
16. ⭐ The expanse position can be held by **a boat as well as a ship**,
    and the **outward walk** decides whose applies.
17. ⭐ **A band needs no endpoints.** A free-standing belt is authorable
    and behaves identically; endpoints only make a band **nameable in a
    plan**.
18. ⚠ **Overlapping bands compose by rule, not by accident:** field
    values resolve to **the narrowest band**, and placed things
    **union**. ⭐ A narrower band authored over a belt overrides it.
19. A **`navigation` Discipline exists**, anchored to a named ISCED-F
    code with its meaning written beside it, and both reading rows
    declare it.
20. ⛔ **Competence gates nothing and improves no outcome.** A band-0
    navigator can set any course anywhere; no competence makes the same
    craft faster or the world's drift smaller. What it changes is the
    **bracket on a sight**, **what a sounding reports about the bottom**,
    and **the allowance carried in the reckoning**.
21. ⭐ **The pilot's knowledge is CLAIMS, not competence.** Hiring
    somebody who knows the water yields **`told`** claims about that
    water — purchasable, specific to it, attributed to who told you,
    and able to be **wrong**.
22. Being lost **always has a way out** that is an action, not a wait.
23. ⭐ The crossing is a **sustained** engagement with no completion
    time: arrival is detected, never scheduled, and a course with no
    node ahead of it is legal.
24. ⭐ The voyage's state is **the position, the course and when it was
    set** — nothing else — and the engagement is **re-established at
    boot** from those.
25. The beat is the **watch**, and the manning of a watch is what the
    degradation reads.
26. The crossing is held by the **craft**: logging out does not abort it,
    the craft's position **survives a restart**, and the player is on it
    when they return. ⛔ **Nobody dies while logged out.**
27. An **unattended** passage degrades, and the degradation is
    **derivable from a seeded field** — ⛔ nothing is rolled.
28. Mutual presence on open water is decided by **sight distance from eye
    height**, per observer, and **a second channel with a different range
    is expressible** without reopening the model — demonstrated by
    `hail`.
29. A **lookout is a seat somebody occupies**, and the sight advantage
    follows the occupancy, not the craft.
30. Traffic on open water is **seeded**: the same at the same place and
    time for every observer, and unfarmable by re-entry.
31. A **chart is procured and read**, writes **`charted`** claims, and
    ⭐ a chart that is wrong **stays** wrong — the claim is never
    corrected or removed.
32. ⛔ **No expanse topology ever reaches a client** except as the
    player's own claims.
33. A **vantage** is authored, names what it overlooks, and is believed.
34. A **landmark** is described once on the thing itself and read from
    every place an author says can see it — ⭐ including, at sea, from a
    range its **height** decides.
35. Something says **these rooms are one building**, coordinates them
    without containing them, owns the outside description and the way
    in, and is **sparse** — and **its position is a field that can
    change.**
36. A cited or placed thing can **contribute to its room's prose.**
37. ⛔ Every land claim about what can be seen is **authored**. The
    engine computes a sight range **only** where nothing can be in the
    way.
38. A position carries a **depth**, every reader of it works at depth
    zero, and ⛔ **no mechanism in this build gives depth a second
    value.**

---

## Open questions

1. ⚑ **The logbook.** § 7h: *"the logbook is what proves the
   depletion."* A durable record rather than verb surface, and
   `chronicle` is append-only and already exists — but it is the one
   piece of the UX with no home yet.
2. ⚑ **The place↔bulk line.** Nothing says where water stops being a
   place and starts being a container's contents — a puddle, a bath, a
   trough, a cistern, a pond, a lake. ⚠ The *"can you be in it"* test
   **breaks cleanly on a bath.**
3. ⚑ **Reversing flow / the tidal bore.** A real expressive loss, and in
   neither this build's nor the climate build's collision table.

---

## Cross-references

- [navigable-water-slate](../slates/builds/navigable-water-slate.md) — §§ 1–2 the one model and the frame · § 3 the horizon, the vantage and the landmark · § 3b navigation and the two positions · § 5a the shore · § 7a the vessel decision · § 7d the crew · § 9 the open questions, of which Q1 (the price of horizontal passage) is **closed by the edges**
- [structures-slate](../slates/builds/structures-slate.md) — the thing that says these rooms are one building, its case against, and its open forks
- [underwater-slate](../slates/builds/underwater-slate.md) — the column, the medium, the ascent
- [standing-instructions-slate](../slates/builds/standing-instructions-slate.md) — ⛔ unopened, and the unattended passage depends on it
- [location-graph.md](../subsystems/location-graph.md) — the claim store, the four channels, the firewall, the plan-as-hypothesis and the risk axis
- [instrumentation.md](../subsystems/instrumentation.md) — the `Reading` row, and why `depth` and `latitude` are rows rather than verbs
- [watershed.md](../subsystems/watershed.md) · [zone.md](../subsystems/zone.md) · [location.md](../subsystems/location.md) · [residence.md](../subsystems/residence.md) · [mortality.md](../subsystems/mortality.md) · [employment.md](../subsystems/employment.md) · [activity.md](../subsystems/activity.md)
- `docs/requirements/climate-and-water-requirements.md` — owns latitude, the biome chain and the tide
- `docs/requirements/assembly-requirements.md` — owns the compartment
