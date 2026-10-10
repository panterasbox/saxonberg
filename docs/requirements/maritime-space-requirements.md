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
  wrong**, including **`bought`** — *"a transaction \| yes, and that is
  the seller's reputation"* — which is **vocabulary with no writer** ·
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
4. ⚠ **There is no navigation Discipline.** Seventy-two exist and none
   of them is navigation, pilotage or seamanship; `teamstering` is the
   land-haulage one. A `Reading` row must declare a `discipline:`, so
   the rows force the question.

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
- ⭐⭐⭐ **The expanse has EDGES, and an edge confers cost and character,
  never connectivity.** A current, a trade wind, a reach with a
  reputation. Any two nodes are always reachable by setting a course
  between them; an edge only says what a crossing is *like*, and whether
  to follow one is the player's. ⛔ **An edge is never the only way
  across** — *"disconnection on an expanse is never topological"* — and
  the moment it is, we have rebuilt the exit graph on water.
- ⭐⭐ **And the edges are what finally price horizontal passage.** The
  slate's deepest open item: *"the vertical axis priced its passage
  (breath, cold, ballast) and the horizontal one got flow × width and a
  boolean."* A cost and a risk on an edge is that model — westing dear
  and easting cheap, a route a judgment rather than a line, and a chart
  worth buying.
- ⭐⭐⭐ **The graph does not reveal itself.** Unlike the containment
  graph, an expanse's nodes and edges are not visible for standing
  there. What you know of a sea is **claims** you made, were told, or
  **bought** — so a chart is a thing you procure, it can be wrong, and
  it stays wrong because claims append and nothing is corrected.
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

### A node is a POINT

Areas are content — several nodes, or an edge. ⚠ **The first thing that
argues with this is a fishery**, which is an area and not a point; if a
node needs a radius then *being at* a node becomes a test rather than an
identity, and the shore↔expanse boundary goes soft. Recorded as a
decision rather than a certainty.

---

## The command surface

⭐⭐ **The client is command-line first, comprehensive, and the rich
surface is built on top of it later — the same approach as combat.** So
the verb set *is* the UX, and it is the deliverable. Checked against all
466 shipped views.

### Two new verbs

| verb | shape |
|---|---|
| **`course`** | `course` reads your current course and your reckoned position **with its uncertainty**; `course <bearing>` / `course <node>` sets one and begins the crossing. Zero-arg-reads / arg-sets is the shipped shape (`cockpit <mode>`, `house par`) |
| **`hail`** | a directed act at a sighted contact. ⛔ Not `shout`, which is the acoustic-range verb — a hail at twelve miles is flags, a light or a gun, which is the **second sighting channel** getting a real consumer instead of staying hypothetical |

⛔ **Not `plot`** — taken by farming (*"break a new field out of ground
you already hold"*). Nothing unifies breaking a field with laying off a
course, so one of them needs a different word, and `course` is the better
word regardless. ⛔ Not `set course`: `set` is the settings verb.

### Two new `Reading` rows, and no verbs at all

| channel | the act | instrument | notes |
|---|---|---|---|
| **`depth`** | `measure depth` | a lead line | ⚠ Free — `dip` is mining's seam angle and `elevation` is the land's. This is the sounding, and it is why the column cannot be deferred |
| **`latitude`** | `measure latitude` | a sextant | ⭐ The noon sight. `altitude` already exists and means *your own height, by altimeter* — a different question |

⭐ **The weather denial is free.** `sky` already ships with no instrument
and an `expert` eye ceiling, so overcast refuses the sight in the sky's
own terms with nothing added.

### Five honest extensions

| verb | today | on an expanse |
|---|---|---|
| **`locate`** | *"report the location chain of an object"* | ⭐ There is no chain, so it answers with **your reckoning**, and says that is what it is. It is a **perception** verb, so reporting what you perceive rather than the truth is already its contract |
| **`read`** | *"take in the marks on a written thing and decode them"* | ⭐⭐ **That is the chart.** `read <chart>` writes **`bought`** claims into your map — the first writer the channel has ever had |
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
| ⚠ **the shipped claim store** | this build is the **first writer of the `bought` channel**. The vocabulary was put in the shape from the start precisely so this would need no retrofit; confirm that holds |
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

### An edge carries cost and character, never connectivity

**The question.** If there are edges, do they define what is reachable?

**The answer.** No. Any two nodes are always reachable by setting a
course; an edge says what a crossing is *like*. ⭐ The whole value of the
expanse is that disconnection on it is never topological — the moment an
edge gates reachability, this is the exit graph again with a different
renderer, and every reason to build it is gone.

### The knowledge layer is the shipped claim store, with one new channel

**The question.** Does an unrevealed sea graph need its own knowledge
model?

**The answer.** No, and this is the build's biggest de-risk. The shipped
store already has the firewall, the four channels, append-never-correct,
plan-as-hypothesis and a risk axis. ⭐ A nautical chart is **the first
writer of `bought`**, and *"the channels are the words, so a new channel
needs no edit in the renderer."* A chart that can be wrong and stays
wrong is not a feature to build; it is the store's existing growth rule.

### Where you log back on

**The question.** You went to sleep on a ship. Where are you?

**The answer.** **On the ship**, and nothing about player persistence
changes. ⛔ **You cannot die while logged out.** You log on where you
logged off, addressed by a durable handle — a singleton template path or
a warren key, always something that can be re-cloned — with the **lounge
as the resolve-failure backstop** for the case where somebody broke the
place you left. `Avatar.startLocation` already *is* that field and
already defaults to the lounge.

⭐ Two consequences for a ship, and both are shipped shapes: its rooms are
**a warren with durable keys** (`(scope = templatePath, key)`, the leased
`DormRoom`'s model), and its **position is one persistent field on the
Structure** — the pair is the whole persistence story, and neither is new.

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
time at sea. ⭐⭐ The **dominant** Discipline would be navigation — and
there isn't one. See *Open questions*.

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
says so. ⭐ And a bought chart that is wrong *stays* wrong, because
correcting it in the reader would be the reader overriding the writer.

**3b. Participation ⭐⭐⭐ — measured by whether the polity can do
something we did not want, and it can.** A chart is a **bought** claim
carrying *"the seller's reputation"*, so a market in bad charts is
possible and nobody authored it. A lookout is a seat, so keeping a watch
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
8. **Follow an edge and then cross the same gap ignoring it**, and have
   the two crossings differ in a way the edge explains.
9. **`journey` to a node and be refused honestly**, with the refusal
   naming `course`.
10. **`read` a chart you were given, then `map`**, and see the charted
    claims appear alongside what you walked and saw — **marked as
    bought.**
11. **`read` a chart that is wrong**, act on it, and find the water does
    not agree. ⭐ The claim is **still there afterwards.**
12. **See another craft at a distance**, and have a second observer at a
    different height **not** see it. Then **`hail` it**.
13. ⭐ **`appoint` somebody lookout** and see further than you did a
    moment ago, with nothing about the craft having changed.
14. **Pass the same lane twice at the same hour on different days** and
    meet the same traffic. **Re-enter and gain nothing.**
15. **Log out mid-crossing and log back in.** You are on the craft, the
    craft has moved, and the course is still set.
16. **Stand on a headland** and see the whole of the bay it overlooks.
17. ⭐⭐ **Read a landmark from three different zones**, described once,
    and from a fourth place see nothing because an author said so.
18. **Approach a coast from open water** and take a fix off a tall thing
    ashore, at a range its height decides.
19. **Look at a building from the street** and get a sentence nobody
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
5. A person can stand on a **shore** and act on the water it cites,
   while never being inside the water's frame.
6. Crossing an areal passage is **setting a course**, and the arrival is
   computed rather than chosen.
7. A **reckoned** position exists, differs from the true one, and the
   difference is **readable by the player** and not by a number nobody
   sees. ⛔ **No surface reports the true position to its occupant.**
8. **Four fixes** work and cost differently, and at least one of them
   can be **refused by the weather**.
9. ⭐ A **sight yields latitude only.** Longitude is not obtainable by
   any means this build ships, and the refusal says what would be
   needed.
10. Being lost **always has a way out** that is an action, not a wait.
11. The crossing is held by the **craft**: logging out does not abort it,
    the craft's position **survives a restart**, and the player is on it
    when they return. ⛔ **Nobody dies while logged out.**
12. An **unattended** passage degrades, and the degradation is
    **derivable from a seeded field** — ⛔ nothing is rolled.
13. Mutual presence on open water is decided by **sight distance from eye
    height**, per observer, and **a second channel with a different range
    is expressible** without reopening the model — demonstrated by
    `hail`.
14. A **lookout is a seat somebody occupies**, and the sight advantage
    follows the occupancy, not the craft.
15. Traffic on open water is **seeded**: the same at the same place and
    time for every observer, and unfarmable by re-entry.
16. A **chart is procured and read**, writes **`bought`** claims, and
    ⭐ a chart that is wrong **stays** wrong — the claim is never
    corrected or removed.
17. ⛔ **No expanse topology ever reaches a client** except as the
    player's own claims.
18. A **vantage** is authored, names what it overlooks, and is believed.
19. A **landmark** is described once on the thing itself and read from
    every place an author says can see it — ⭐ including, at sea, from a
    range its **height** decides.
20. Something says **these rooms are one building**, coordinates them
    without containing them, owns the outside description and the way
    in, and is **sparse** — and **its position is a field that can
    change.**
21. A cited or placed thing can **contribute to its room's prose.**
22. ⛔ Every land claim about what can be seen is **authored**. The
    engine computes a sight range **only** where nothing can be in the
    way.
23. A position carries a **depth**, every reader of it works at depth
    zero, and ⛔ **no mechanism in this build gives depth a second
    value.**

---

## Open questions

1. ⚑⚑ **The navigation Discipline.** Seventy-two exist and none is
   navigation, pilotage or seamanship. A `Reading` row must declare a
   `discipline:`, so `depth` and `latitude` force it: either they hang on
   `awareness` (as `altitude` does) or this build adds one. ⚠ And the
   instrumentation law constrains the answer either way — **competence
   resolves DETAIL and never ACCESS**, so a novice's fix is vaguer and
   never refused.
2. ⚑⚑ **Sea state.** What makes an edge dangerous, and the boundary of
   *"this build reads the weather and edits neither."* Derived from wind,
   almost certainly in scope, and currently unwritten.
3. ⚑ **Does a node need an extent?** A fishery is an area. See
   *Placement*; recorded as a point, with the fishery as the standing
   objection.
4. ⚑ **`anchor`.** Holding position away from a node — wanted only if a
   crossing can be paused somewhere that is not a place.
5. ⚑ **The logbook.** § 7h: *"the logbook is what proves the
   depletion."* A durable record rather than verb surface, and
   `chronicle` is append-only and already exists — but it is the one
   piece of the UX with no home yet.
6. ⚑ **The place↔bulk line.** Nothing says where water stops being a
   place and starts being a container's contents — a puddle, a bath, a
   trough, a cistern, a pond, a lake. ⚠ The *"can you be in it"* test
   **breaks cleanly on a bath.**
7. ⚑ **Reversing flow / the tidal bore.** A real expressive loss, and in
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
