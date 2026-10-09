# Navigable water — bodies of water as content

> **Status: UNBUILT.** The hydrology ships
> ([watershed.md](../../subsystems/watershed.md)); **nowhere on, in or
> under the water is a place you can be**, and there is no water biome at
> all.
> **Left:** the place/passage distinction on a water node · the
> `LocationZoneMixin` decomposition that lets an **`Expanse`** exist ·
> a **water biome branch** (surface + submerged) · ⭐⭐⭐ **a reach's own
> character** (gradient, bed, obstruction — the Deliverance gap) · craft
> as something that occupies a passage · position-within-a-passage
> (linear vs areal) · the horizon as co-presence · seeded traffic · the
> two-tier ocean/venue title · the holder's duty · and the first water
> anybody can stand in.
> ⭐⭐ **Added 2026-10-09:** the **coast** closes the model — a beach is a
> land `Location` holding a `Shore` that **cites** a water node, so
> nothing is ever *in* the water's zone (§ 5a) · the ownership model
> **corrected** — the frame-holder holds the water and **no land**;
> adjacent, not nested (§ 5) · *"a place that can be underwater"* was
> **never a gap** — [underwater-slate](./underwater-slate.md) already
> derives the medium from `level − elevation` (§ 4) · and the **trade
> audit** across all 27 shipped trades, with the unbuilt-trade list kept
> (§ 5b).
> **Size:** a build, and probably two — the **estuary** is reachable on
> its own and the **areal** half is most of the cost.

*Opened 2026-10-08, out of "we definitely need one or more seas." The
conversation started at whaling and never got there, deliberately: ⭐ the
goal is that **every body of water gives the player a consistent,
immersive experience and gives creators a rich surface for bespoke
content of their own design.** Whaling and the other maritime industries
come after that is settled.*

---

## 0. ⚠⚠ Where it stands today

`watershed.md` is excellent hydrology and law and offers an author
**nothing to stand in.**

| ships | missing |
|---|---|
| `Watercourse` — topology authored, direction derived | **anywhere to be** on, in or under water |
| flow, snowpack, **navigability derived** | a **water biome** (surface / submerged) |
| rights: prior appropriation recorded, riparian derived | craft |
| contamination as a concentration | a reach's own **character** |
| `SphericalZone` / `SphericalLocation` — ⭐ *"no implicit adjacency"* | position within a passage |
| `fishing.md`'s derived fishery + the **`Shore`** read | — |

⭐ And the doc names its own missing consumer:

> **Navigability is derived, never authored.** Flow *and* channel width…
> *"**When the boat wave lands** it reads a river that already knows where
> it is navigable and knows that changes with the season."*

Two dials shipped (`water.navigable.minFlowM3S`,
`water.navigable.minWidthM`). **Not an inert reference — a planned seam
awaiting this build.**

⚠ The biome vocabulary is `indoor` · `outdoor{baseline, meadow,
woodland}` · `underground{upper-workings}` · `universe`. **No water.**

---

## 1. ⭐⭐⭐ The one model: every node is a PLACE or a PASSAGE

This slate first contained **two** models that contradicted each other —
an *Expanse* in which open water is never a place, and a widened
*Watercourse* in which open water becomes a place wherever an author
wants one. ⚠ Each failed exactly where the other worked: the first cannot
make *Deliverance*, the second cannot make an ocean without a thousand
rooms.

**They are one model approached from two ends.** The reconciliation:

| | what it is | you are |
|---|---|---|
| **place** | a `Location` — details, props, cast, exits, a biome | **in it** |
| **passage** | cited, not inhabited; position within it is real, no room | **aboard something crossing it** |

⭐⭐ Both sit on **one graph with one node identity** —
`kestrel:gorge-mouth`, `atlantic:georges-bank`. The only difference is a
single authored fact: **is there a room here?**

⭐ And it is not a new rule. It is `Watercourse`'s own rule — *"a reach
becomes a real object only where content puts a **structure** on it"* —
with **"structure" widened to "anything an author wants to put there"**;
and it is simultaneously the Expanse's rule, *venues are Locations and
open water is cited*.

### ⭐⭐⭐ And a passage is LINEAR or AREAL

That is what "adjacency" was tracking the whole time:

- **linear** — one dimension. Position is **a fraction along it**. **Two
  neighbours.** A river stretch, a canal, a strait.
- **areal** — two dimensions. Position is **a coordinate**. **No
  neighbours.** The open sea, the middle of Superior.

⭐⭐ **So the horizon, co-presence and traffic only exist on AREAL
passages.** Rivers and canals need none of that machinery — they get
traversal duration and nothing else. **The expensive half of this design
is confined to the one case that needs it.**

### Three authored facts per node

**place or passage · if a passage, linear or areal · then ordinary
content.**

⭐⭐ **Which dissolves the empty-rooms objection that opened the
conversation:** you pay for a room exactly where you want a scene. A
thousand rooms of empty Atlantic is a choice nobody has to make; **five
rooms of gorge is a choice somebody wants to make.**

| content | nodes |
|---|---|
| the open Atlantic | one **areal passage** |
| Superior | mostly areal passages, with **places** at the ports, the shoals, a wreck |
| ⭐ a bay with whales | a **place** on the ocean graph — swimmable, *and* the migration comes from the passage next door |
| *Deliverance* | a chain of **places**, each a gorge reach, authored because the content deserves it |
| a river crossing nobody cares about | a **linear passage** |
| the millrace | a **structure** on a reach — neither |

### ⚠ The size scale is extent, never water-type

A pond you can see across is a **place**. **Superior is a passage 350
miles wide** with lanes, wrecks and storms that sink freighters. *"Lake"
is not a category.* The test is only ever: **can you see across it.**

---

## 2. The `Expanse` — and ⛔ it must not be called Ocean

An areal passage's frame. Strip the water out and the model is: a large
extent with no implicit adjacency · fields varying across it · sparse
venues that are genuinely places · real positions without neighbours ·
traversal as a durative act by a vehicle · co-presence by radius · and
**the resource in the extent rather than at the venues.**

⭐⭐⭐ **That is not an ocean.** It is **an extent you cross rather than a
place you are**, and the instances are **sea · desert · ice · space** —
and `universe` is already a shipped biome, so a craft crossing a void to
sparse stations is this model exactly.

⭐ So `name-the-substrate-not-one-consumer` binds: **name it `Expanse`
now**, implement it for water, let the desert be the second consumer and
ice or space promote it. **The rename is the expensive part.**

### ⭐⭐ The `LocationZoneMixin` decomposition

`SpatialZone` *"carries the location-aware surface (`addLocation`,
`getLocations`, `removeLocation`, `contains`, `canDestruct`). Stamps
`Stuff.zone`."* ⚠ **The Location narrowing is one consumer's constraint
on a coordinate frame** — and `mixin-on-the-wrong-host`'s tell is exactly
*guards that re-narrow the host set.*

| | |
|---|---|
| **`SpatialZone`** | the frame + a registry of **positioned Stuff**, stamping `Stuff.zone`. Keeps `stocks`/`favours`/`blessingOdds` — ⭐ already justified as *"only a region in space can stock goods"*, which is **where an expanse's resource field belongs** |
| **`LocationZoneMixin`** | the room-specific surface and invariants — the cardinal-only-intra-zone exit rule, the Location narrowing |
| **`CartesianZone`** | composes both, unchanged |
| **`Expanse`** | the frame **without** the Location mixin |

⚠ **Not `Container`. Not `Location`. Not `Adornable`.** A "list of
contents" is wanted for *finding who is nearby*, which is **an index, not
a containment** — and `zone.md` already draws that line (*"coordination
keys on Warren identity, never on zone"*). Six shipped precedents:
`GridCatalogue`, `ParcelRegistry`, `OfficeRegistry`, `ReadingCatalogue`,
`MaterialCatalogue`, `ChannelCatalogue`.

### ⛔ Two things ruled out in drafting

- ⛔ **Restamping a craft's `Zone` as it moves.** Zones are the template
  tree; the stamp is **provenance**, not whereabouts. Shoehorning a
  definitional structure into a positional one.
- ⛔ **The ocean as a `Container`.** `Watercourse` settled it first and
  better: *"a mill **beside** the river is not **in** it."* **Water is
  cited, not inhabited.**

---

## 3. Co-presence on an areal passage is the HORIZON

On land a traverse is instantaneous, so *"on an exit"* is never a state
anyone occupies and co-presence is an exact graph fact. ⭐ On an areal
passage you spend nearly all your time mid-edge, so the question becomes
**what makes two craft mutually present.**

⭐⭐⭐ **The horizon.** `1.17 × √(height in feet)` nautical miles — about
**12 nm from a masthead a hundred feet up, 2 from a dory.** Unlike a room
it is **different for every observer**: a ship can see you before you see
it.

⭐⭐ **And it produces content rather than needing it.** The masthead
watch is a job whose whole function is extending the radius; the crow's
nest is an **instrument**, and `instrumentation.md`'s rule applies
unchanged — *competence resolves detail and never access.* A good lookout
does not see further; he knows what he is looking at sooner.

### ⭐⭐ The graph becomes the broad-phase filter

Craft are not uniformly distributed — they are on lanes, in harbours, on
grounds — so you only ever compare craft **on the same passage or at the
same place.** ⭐ **The node graph stops being the geography and becomes
the index**: on land the graph *is* the geography, on an areal passage the
graph is how we know who might see you.

### ⚠⚠ CORRECTED 2026-10-08 — the horizon is ONE CHANNEL, not the rule

The submarine stress test (§ 3c) found this section's one real defect, and
it is cheap now and expensive later.

**A submerged boat has no horizon at all.** At periscope depth it has
about **two nautical miles**, and only if somebody is looking. But it
**hears** vastly further than it sees.

⭐⭐⭐ So `1.17·√h` was never *the* co-presence rule — **it is one
channel's rule in a per-channel model.** Visual takes the horizon
formula; **acoustic takes a different and much larger radius**; and the
asymmetry stops being *"a ship can see you before you see it"* and
becomes the sharper thing: **you can hear someone who cannot see you,
and that is the whole tactical situation.**

⭐⭐ **And the substrate already ships** — `senses.md`'s `SenseChannel`
vocabulary and `Modality` singletons, `perception.md`'s viewer-aware
queries and Audible push, `messaging.md`'s capability split. This is
**applying the shipped sense model to the expanse rather than inventing a
second radius for it**, so it is a narrowing of scope, not a widening.

⚠ Read the next heading as **one perception model, N channels** — which
protects the not-sortable property *better*, because every channel is
then the same machinery for players and for seeded traffic alike.

### ⭐⭐⭐ One sighting channel, two sources of sail

⚠ **If a player's craft and an NPC trader arrive by different mechanisms,
players will learn to sort them — and the moment they can, the water is
divided into "real" and "content."** That is the deepest form of the
immersion lens: the fiction betraying itself not by being wrong but by
being **sortable**.

⭐⭐ And the NPC traffic is what makes player traffic *plausible*. If the
only thing you ever meet is another player, meeting one is a coincidence;
if the water has shipping, meeting one is **just traffic** — which also
means **you do not need many players afloat if the water has craft in
it.**

### ⭐⭐⭐ Traffic is a SEEDED field, not a die roll

A sighting is a fact about the **environment**, so it is legal
provenance under [uncertainty.md](../../uncertainty.md) — but **seeded,
not drawn**, exactly as `weather.md` is *"the stateless procedural weather
field."* A lane at this hour on this day carries these craft,
deterministically.

Which buys three things a roll cannot: ⭐ **two players an hour apart see
the same trader** (the water is consistent between witnesses) · **a
pilot's knowledge becomes real** (you can learn the traffic) · and **it
cannot be farmed by re-entering.**

⭐ And the clustering needs no knob: **traffic is a field value and lanes
are where the field is high.** *"You might see people out there"* is a
readable property of where you chose to sail.

### ⭐⭐⭐ And the economics fall out with no dial

The lane has traffic, so it has **help** — and it is where the
privateers are, and because everyone sails it, **it is hunted out.** The
empty water has the stock and nobody within twelve miles.

**Remoteness is simultaneously the reason the resource is there and the
reason you die.** Lens 1 producing a risk/reward curve out of two true
facts, with nobody authoring a tension.

---

## 3b. ⭐⭐⭐ Navigation — what a traverse IS on an areal passage

Designed 2026-10-08. ⭐ **The question that unlocks it:** on a *place* you
are in a room, cardinal exits work, `go north` goes north, and there is
no navigation. On a **linear** passage there are exactly **two
neighbours**, so you cannot get lost in a canal either. Navigation exists
in precisely one place — and it exists there because **an areal passage
has no neighbours at all.**

⭐⭐⭐ **There is no exit to take.** So movement on an expanse cannot be
*choose a destination*; it must be **set a course** — a heading and a
rate, for a duration. **You choose a vector and the world computes where
you end up.**

### ⭐⭐⭐ Two positions, and that is the whole mechanic

The world holds your **true** position. You hold your **reckoned** one —
your own estimate, accumulated from heading × speed × elapsed. They
diverge because of things you cannot directly measure: the **current** (a
field value on the expanse), **leeway** (wind pushing you sideways — wind
already ships as a weather-deviated field), compass error, and the log's
imprecision.

⭐⭐ **The error is EPISTEMIC, not resolutional**, which is why this is
legal. `uncertainty.md` bans rolling to decide what the world *is*, and
**nothing rolls here**: the world knows exactly where you are, *you* do
not, and your error is accumulated ignorance of **seeded** fields. The
ban is not a constraint being worked around — it is what makes the
mechanic honest.

### The decision matrix

Dead reckoning is free and its error grows **monotonically**. A **fix**
collapses it, and the four sources cost genuinely different things.

| fix | cost | available when |
|---|---|---|
| **a landmark** | free | something identifiable is inside your horizon |
| **soundings** (the lead line) | **way** — you must slow or heave to | ⭐ always, *including fog and dark*, which is when you need it |
| **a celestial sight** | a moment, an instrument | ⚠ **clear sky only** — so **weather gates your ability to know where you are**, and `fog` is already a weather type |
| **a pilot** | money | where he lives |

⭐ Soundings being the all-weather fix is what makes them the
**professional** instrument — and depth-plus-bottom-character is a field
the fishery already wants.

⭐⭐ **The epoch ladder is historically exact and nearly free.** Latitude
is easy — the noon sun's altitude, and `solarAltitudeDeg` **ships**.
Longitude needs an accurate clock. So epoch one is **latitude sailing**:
run north or south to your destination's parallel, then run down it —
slower, safer, and the reason historical tracks look absurd on a chart.
Epoch two is the chronometer, which plugs into the Timekeeping seam and
into [climate-slate](./climate-slate.md)'s polar finding that **you must
own a clock**.

### The failure modes, graded

⭐⭐⭐ The governing principle: **being lost is a condition you work out
of, not a punishment.**

- **Doubt.** You have run your distance and the land is not there. Not a
  failure state — a **prompt**, whose recovery is a set of actions: heave
  to, sound, wait for a sight, stand off till dawn. **Most of the
  gameplay lives here.**
- **Landfall in the wrong place.** You arrive, just not where you meant.
  Recoverable, and it *generates* content.
- **Overrunning.** Past your destination into empty water — which § 3
  already says is where remoteness kills you.
- ⭐⭐ **Grounding**, and **the model already expresses it with no new
  mechanism**: § 1 lists *"Superior: mostly areal passages, with
  **places** at the ports, the **shoals**, a wreck."* A shoal is a place
  on the graph, so **running aground is arriving at a place you did not
  choose.**

**Can you get lost? Yes — and the honest answer is that you are ALWAYS
slightly lost, and competence is how slightly.** Which is
`instrumentation.md`'s rule unchanged (competence resolves detail, never
access). ⭐⭐ But the expert's real advantage is not a better position —
it is **knowing how wrong he might be**: a confidence interval rather
than a point, which is that doc's **seeded bracket** doing exactly what
it was built for. **The skill is calibration, not accuracy**, and
calibration is the better thing to teach.

### ⭐⭐⭐ Disconnection on an expanse is never topological

On an areal passage **reachability is not a graph property** — position
is a coordinate, so you can sail anywhere you can survive sailing to.
Therefore disconnection is **epistemic, logistical, or seasonal**:

- **epistemic** — it is on no chart; you do not know it exists
- **logistical** — you cannot survive the crossing (provisions, water,
  `vitamin-c`)
- **seasonal** — the ice closed it, or the pass did

⭐⭐ Which is what makes **discovery** possible: an island that exists in
the coordinate field and on nobody's chart. And
`location-graph.md`'s **per-player map document already does this** —
channels `walked` · `seen` · `searched` · `published`, with the rule that
**claims append and nothing is corrected.** A chart **is** a per-player
map; an uncharted island is one no channel holds.

⭐⭐⭐ **And that append-only rule has a consequence nobody drew out: a
chart can be WRONG, and stay wrong.** A chart you bought with an error
on it, where the error belongs to a **previous surveyor** — authored,
attributable, and not the dice's. ⛔ The evidence firewall (*the index
must never reach a client*) is what makes a chart an **object** rather
than a UI element — which is also what makes it sellable, forgeable and
worth stealing.

### ⭐⭐ So pilotage is TWO TRADES sharing a word

| | you always know | you do not know | failure |
|---|---|---|---|
| **the bar / river pilot** — *linear* | where you are | where the water is deep **this month** | you ground |
| **the deep-sea navigator** — *areal* | the water is deep | where you are | you ground |

The same catastrophe from opposite ignorances. The river pilot's product
is **derived navigability** — a channel that moves with the freshet and
that nobody wrote down; the navigator's is **calibration**. One is local
and unteachable; the other is mathematics and an instrument.

⭐ **They also sit on opposite sides of the epoch**: the navigator is
replaced by better clocks, and **the river pilot never is** — the channel
keeps moving.

⭐ **The durative shape**: a passage is an engaged act with interrupts at
roughly **a watch — twenty real minutes** on § 6's clock, each one a
decision point where a sighting, the weather, or a chance to sound
arrives.

### ⚠⚠ The risk, named

**If pilotage becomes a dexterity-and-attention minigame we have built a
worse Sea of Thieves in text.** We cannot compete on steering and a watch
is twenty real minutes. ⭐⭐⭐ **The submarine-sim conclusion is the
design: the PLOT is the interface.** Not a wheel, not a heading dial — a
running record (reckoned position, last fix, time since, the growing
bracket) that the player reads and acts on, where the decision is **when
to spend time on certainty.** Text-native, watch-shaped, and it makes
expertise an interval rather than a reflex.

### Prior art — by what is transferable

⚠ Our slates cite doctrine heavily and never cite prior art, so every one
of these arguments gets re-derived from scratch next time.

| source | the transferable mechanism |
|---|---|
| ⭐⭐⭐ **Silent Hunter / UBOAT / Cold Waters** | the closest match anywhere: an **estimate maintained on a plotting table** is the shipped, commercial form of reckoned-vs-true — and **the plot is the interface** |
| ⭐⭐⭐ **Elite / Elite Dangerous** | our `Expanse` already built: **fuel/jump range as the boundary** (logistical disconnection) · a **deterministic procedural galaxy so everyone sees the same star** (seeded-not-drawn, at scale) · ⭐ **exploration sells DATA** (the chart and the record as a player economy) |
| ⭐⭐ **Sunless Sea** | crossing to sparse ports where **supplies are the clock**, and the honest treatment of **what darkness does to a crossing** |
| ⭐⭐ **Outer Wilds** | the proof that **knowledge alone can be the whole progression** in a deterministic world |
| ⭐⭐ **Tunic** | the **fallible manual as the progression object** — the best argument that an unreliable document beats a reliable one |
| **Kerbal Space Program** | real physics *is* the game; the loop is **predicted vs actual** |
| ⛔ **Patrician / Port Royale / Anno** | **the anti-pattern**: sea travel as *a route line and a timer*. If the traverse has no decisions in it, we have built Port Royale |
| ⚠ **Sea of Thieves** | proves **navigating by looking is pleasurable** — but it is 1:1 continuous, so its uncertainty lives in the player's head and it **cannot** tell us how to do this over an abstraction |

**Literature** — ⭐⭐⭐ **Twain, *Life on the Mississippi*** is not an
analogy: he held the licence, and the book contains the moving channel,
the unteachable knowledge in both directions and by night, the **Pilots'
Benevolent Association** (an actual licensing monopoly — the lens-7
structure, attested), and ⭐ **the obsolescence**, written by a man who
watched his own trade become worthless. **If we build river pilotage,
that book is the brief.** · **Conrad, *Heart of Darkness*** — a master
mariner on watching for snags and guessing at a channel. ·
**O'Brian / *Master and Commander*** — the watch, the masthead, the log
line, soundings as a running report. · **Sobel, *Longitude*** — the
epoch ladder as history. · **Melville**, two chapters not the book:
⭐ **"The Chart"** (Ahab reasoning about migration from accumulated
logbooks — *the station's record, in 1851*) and **"The Quadrant"** (he
smashes the instrument that tells him where he is).

---

## 3c. ⭐⭐ The submarine — the stress test, and what it proved

Run 2026-10-08 to test whether this session's model holds under a third
dimension. **It holds in three places and broke in one** (§ 3's horizon,
corrected above), which is the whole value of having run it.

**What holds:**

- ✅ **A sub is aboard-something-crossing.** A vessel is a room that
  moves, so you are *in the sub* and the sub is *on* the passage.
  § 1 untouched, and *"water is cited, not inhabited"* survives.
- ✅ ⭐⭐ **Depth is not a graph problem.** `underwater-slate` already
  decided that **medium is derived from `level − elevation`**, so depth is
  a property of where you are **in the medium**, orthogonal to position
  **on** the expanse. No third graph dimension, no neighbours, nothing
  re-modelled. ⭐ And the consequence is right: **the sub and the ship
  above it are at the same node.** They are in the same place and cannot
  find each other.
- ✅ **Crush depth is already derivable** — `response = f(mechanism,
  material, construction)` plus the shipped elevation→pressure
  derivation. And the underwater slate's *"ascent is never gated on
  skill, only on breath and ballast"* **is** the submarine's mechanic: a
  sub is a ballast machine, so this is that model at vessel scale.

**What it adds to § 3b:**

⭐⭐⭐ **Submerged, you have NO fixes** — no landmark, no sight. Dead
reckoning and the depth under your keel. Historically exact (boats
surfaced at night *to get a star fix*). **So you must surface to know
where you are, and knowing where you are is how you get found.** The
cleanest risk/reward in the navigation design, and not one part of it was
invented.

**Three couplings:**

1. ⭐⭐⭐ **The pump is the gate for the whole diving ladder** —
   breath-hold → diving bell → hard-hat suit **with a pump and a hose**
   → submarine. `watershed.md` says the pump **is the turbine read
   backwards** (one equation, two efficiency dials), so it unlocks mine
   dewatering, the quarry pit **and** surface-supplied diving. ⚠ **Third
   appearance in one session, three consumers, nearly free.**
2. **Bulk's inert `sealed` rung gets its consumer** — a sub is a room
   with a finite atmosphere, and respiration ships asphyxiation and the
   crisis drain. **Air becomes the clock.**
3. **Diving is how you reach a wreck**, which gates salvage (§ 5c); and
   pearl/sponge diving was already *"the column's first real consumer."*

⭐ **The honest scoping: diving is the trade and the submarine is its
last rung**, industrial-epoch and far off. Build the breath-hold end.
Designing for the top rung cost nothing and is what caught the channel
defect. · Prior art: **Verne** (and *20,000 Leagues* visits Atlantis,
which `underwater-slate` already put in bounds) · ***Das Boot*** for
atmosphere-as-clock and depth under pressure.

---

## 4. ⭐⭐⭐ Expressiveness — the lens-2 audit, and the Deliverance gap

⚠ Lens 2 is **not** *how cheaply can you make a standard one.* It is
**how much can you customise your individual instance through content and
code — where can you take it.** Audited that way:

> **The hydrology and the law are richly variable. The *experience* is
> nearly constant.**

**Variable today:** the node set · elevations at control points · the
basin · branches · structures on reaches · contamination level and kind ·
rights and quotas · storage and control · and anything a `Location`
*beside* the water does.

⚠⚠ **Not variable: whether you can be in it, on it, or under it.**

### ⭐⭐⭐ And the premise that justified that is false for water

> *"A reach is not an object… **the unbuilt lots are prose, not nine empty
> rooms.**"*

Hinkley's unbuilt lots are prose **because nobody will ever stand in
them.** ⭐⭐ **Somebody will absolutely stand in a river.** The decision
was correct in a build about rights, flow and conduits; **its scope was
never re-examined for a build where people get wet.**

### The test cases

| | makeable today | what it needs |
|---|---|---|
| **Bridge on the River Kwai** | ⭐⭐ mostly — a bridge **is** `boundary.md`'s two-anchor cross-room abstraction, the same object as `Window` and `Door` | ⚠ the climax: men **in the river** at the piers |
| **Anaconda** | ⛔ | reaches as places · a boat you can be in · something in the water that reaches into it |
| **Lake Placid** | ⛔ | a surface to be on, a bottom, something crossing between |
| **Friday the 13th** | ⭐ the camp is land | ⚠ the canoe, the drowning, the hand out of the water |

⭐⭐⭐ **The common missing piece is one thing, not four: water as a place
you can occupy, surface and beneath.**

### ⚠⚠ CORRECTED 2026-10-09 — most of this is already decided

[underwater-slate.md](./underwater-slate.md) (designed 2026-09-18,
**DECIDED** on five of seven sections) already holds it, and in a better
general form than the drafts above:

> **Every water node cites its reach, and the reach's level is the
> surface.** Medium is **derived** from `level − elevation`, not
> authored: *a shallow node goes dry on the ebb, a shore node goes under
> on the flood, and nobody re-authors anything.*

⭐⭐⭐ **So *"a place that can be underwater"* was never a gap** — it is
one comparison, and it unifies **the reef · the wreck · the drowned
village · the flooded workings · the tide pool · the flood.** The drowned
village needs nothing but a reservoir whose level rose, and
`StorageNode`'s level is *"the build's ONE piece of state."*

Also already decided there: **implicit up** unless a node declares
`ceiling: true`, with a gate proving a ceiling reaches air · **`depth` on
the node and `up`/`down` derived** (*"never an arrow"* — the watershed's
move) · light, temperature and pressure **derived from depth and the
reach's clarity**, *"never a per-room `ambientIntensity`"* · buoyancy as
a **read** · and ⭐⭐ **"ascent is never gated on skill — only on breath
and ballast."** Plus *"Atlantis is in bounds"*, and ⚠ the ground-build
retrofit that **a band is not standable, its bed is** (`noDefaultFloor`).

⭐ So of the four films, the missing piece is **already designed** and the
remaining cost is the build, not the thinking.

### ⭐⭐⭐ The Deliverance gap — a reach has no character

Still inexpressible after all of the above:

- a river that flows **uphill or in a circle** — ⭐ correctly forbidden
- a **tidal bore or reversing flow** — ⚠ a genuine loss (the Severn, the
  Amazon's pororoca)
- **local relief** between control points — ⭐ fixable by authoring more
  control points
- ⭐⭐⭐ **a cataract.** Navigability is **flow × width**, so a steep
  rocky reach is navigable *by the formula.* **Rapids are about gradient
  and rock, and gradient is interpolated away between control points.**

⚠⚠ **So *Deliverance* is unmakeable, and it is *the* river film.** Fast,
shallow, full of stone, in a gorge, with no way back up — every one of
those facts is either derived to something else or smoothed out.

⭐ **This is the deepest item in the slate**, because *"a reach has a
character of its own"* — gradient, bed, width, obstruction — is a claim
about **what water is** rather than about how water is organised, and it
changes what is authored on every node in both halves.

#### ⭐⭐⭐ And the underwater slate states it sharply, by contrast

Look at what the **column** has that a **reach** does not:

> *depth ÷ ascent rate = the breath you need; the water's cold is the
> second clock (`conductivityOf(water)` is ~25× air). **The deep is
> legitimately deadly, as the mine's bottom is.***

⭐⭐⭐ **The vertical axis priced its passage. The horizontal one never
did.** Breath, cold, ballast and a derivable survivable path going
*down*; **flow × width and a boolean** going *along*.

**That is the gap in its real form** — not *a reach has no character*,
but **one axis got a cost model and the other got a predicate** — and the
underwater slate is the proof it is buildable, because it did the harder
of the two. ⭐ The likely shape is `exertion.md`: `exert({durationS,
powerW})`, the five slow stocks, *reach as a body read*, and **every
limit soft.** A reach that declares what it costs to pass, derived from
**gradient and obstruction**, so a surveyor could have warned them.

### ⭐⭐ Constant versus variable, stated properly

**Constant, rightly:** direction · flow · navigability's arithmetic ·
contamination as a concentration · the rights doctrines. **The physics and
the law.**

**Variable, necessarily:** which nodes are places · what those places are
like · what is in them · what is built on them · what lives there · what
it is like at night. **The content.**

⭐⭐⭐ **The engine keeps the hydrology; the author gets the scene.** Which
is [content-craft § 8c](../../content-craft.md) working: an *Anaconda*
built on this engine has a river that genuinely flows downhill and
genuinely drops in August, and the expedition's trouble is real rather
than scripted.

---

## 5. Ownership — the frame-holder holds the water, and nothing else

**An independent concern holds each water body** — one committee per
ocean/expanse, managing the frame. ⭐ The shape has a long history: **the
frame-holder owns the *way*, and somebody else owns the *destinations***
(a port authority, a turnpike company).

### ⚠⚠ CORRECTED 2026-10-09 — they are ADJACENT, not nested

A draft of this section put ports *under* the ocean's template path —
`/world/<realm>/<ocean>/<port>/` — with `parcel.md`'s longest-prefix
resolution settling the two tiers. **That is wrong, and `wharfside`
proves it.**

Terminus's waterfront is at **`/world/terminus/wharfside/`** — a district
of the *city*. It cannot simultaneously sit under an ocean's path,
because **a template path is singular and a town cannot be inside an
ocean.**

⭐⭐⭐ **So the frame-holder holds the water and NOTHING ELSE. Every place
is on somebody's land.** There is no nesting to resolve — the water and
the shore are **adjacent**, joined by a citation (§ 5a) rather than by
containment.

⭐ Which is more honest anyway: **a port authority does not own the
town.** It owns the channel, the moorings and the pilotage; the quay
belongs to whoever's land it is on.

⭐⭐ And it *sharpens* the design rather than weakening it. A
water-holder's only assets are **passage** and **stock**, so its only
revenue instruments are **a toll** and **a licence** — which is exactly
why § 5's fishery case and the canal's chokepoint case came out as the
only two shapes available. **It has no berths to let, because it has no
land.**

⭐⭐⭐ **And the subdivision answer gets sharper too: a hostile water
committee cannot stop you building a port. It can only stop you leaving
it.** You may build the whole harbour and then find the charter will not
license your transit — a far more specific and more interesting power
than a landlord's veto.

### ⭐⭐⭐ The conflict of interest is smaller than it looks

The frame-holder may also own standard content inside. The serious
version of that conflict would be **holding the resource field** — siting
the stock next to your own station. ⭐⭐⭐ **It does not exist**, because
`fishing.md`'s fishery is *"a **DERIVED** record on a reach — capacity =
Liebig habitat fit × abundance × length, **only `drawn` is state**."*

⭐ The holder *can* author the water's physics — temperature, depth,
current — but those are **physical, cascading and `measure`-able**, so
favouring your own ground means making the water genuinely different
there where anyone can check. **Gaming it is possible and legible**,
which is the right place for it to land. *Derive, don't track* defused
this on its way past.

| what remains | how serious |
|---|---|
| the **self-levy** — they set the duty and pay it | ⭐ ordinary; disclosure is the usual answer |
| **siting** — their station took the best spot first | ⭐ first-mover advantage, which is how every port was sited |
| ⭐⭐⭐ **subdivision** — who gets a parcel in this water at all | **the real power**, and a landlord's |

### ⭐⭐ Subdivision is the committee's, and the charter decides — ✅ ANSWERED 2026-10-09

A draft of this section asked whether `subdivide` requires the parent
holder's consent, and framed it as *steward versus monopolist*. ⚠ **That
dichotomy is wrong, because it assumed the answer was a platform rule.**

⭐⭐⭐ **Subdivision is managed by the committee, and it sets whatever
rules it wants about consent within its charter.** So there is no engine
answer and no default to argue about — a water body's committee may be a
gatekeeper or a rubber stamp, and **which one it is, is content.**

⭐ Two consequences worth keeping:

- **The charter is the instrument**, so the rule is *legible*: anybody can
  read what this ocean's committee will and will not grant, and a
  committee that changes it has changed a published document.
- ⭐⭐ And it folds the lens-7 question below into the same place: *may
  water be held by somebody who works it* is **the charter's question
  too.** The criterion is the charter, the appeal is whatever the charter
  provides (and the courts behind it — `courts-slate`'s *a clerk, not a
  judge*), and the entrenchment is **Tier C**: the polity decides what a
  charter may contain, not what any one committee puts in its own.

### ⭐⭐⭐ The holder's compensation, and why it fixes the incentive

**Standing for holding it, and zorkmids if they choose to impose a tax or
duty.**

⭐ Which inverts the perverse incentive rather than patching it: **it is
not a subsidy for abundance, it is a tax on extraction, and a tax on
extraction only pays while extraction continues.** A holder who levies on
the catch has a direct interest in **there being a catch next year.**
Ostrom rather than Hardin — *the tragedy is of **unowned** commons; a
taxed commons has a landlord with skin in the game.*

⭐⭐ And the two-economy firewall holds exactly: a **worldcrafting** cost
(capacity) compensated in the **worldcrafting** currency (standing); a
**fiction** instrument (the duty) levied on **fiction** activity and paid
in **fiction** money. **Two parallel compensations, neither converting.**

⚠ The failure it permits is the good kind — **extract rent and let the
ground go** — and the check is that **the revenue dies with the stock.**
Self-punishing on a delay, which is a *story* rather than a rule.

⚑ **The lens-7 question that remains: can the water be held by somebody
who works it?** A whaling outfit that acquires title to its own ground
pays the stock's capacity, levies a duty on itself (a wash) and then sets
the season and the licence for every competitor. **Regulatory capture
arriving as a lawful land acquisition, with no rule broken.**

⭐ Per the subsection above, **the criterion lives in the charter** — so
the open part is narrower than it looks: not *what is the rule*, but
**whether the polity constrains what a charter may say about it** (a
conflict rule, a disclosure rule, or nothing). ⭐⭐ My lean is **nothing,
with the holding and the duty public**, because a conflict rule is a
prohibition the Compact would enforce from outside the fiction, and *the
polity dealing with it* is what this whole structure exists to make
possible.

---

## 5a. ⭐⭐⭐ The coast is the `Shore`, and it closes the model

The seam between this model and the land model — and **it already
ships.**

> **`/system/water/thing/Shore`** — a **room-fixed feature**
> (`fixedInPlace`) **citing a `reachRef`**, the water pack's, by the
> `/system/` test: *a riverbank is there whether or not anyone fishes.*

⭐⭐⭐ **So a beach is neither a node on the expanse nor a node on the
land graph: it is a LAND `Location` holding a `Shore` feature that CITES
a water node.** Water is cited, never contained and never containing —
the same relation a room already has to `_biomePath` and `_address`.

| the coast must | and it does, because |
|---|---|
| be reachable on foot | it is an ordinary land `Location` |
| have its own content | it is an ordinary land `Location` |
| let you act on water without being in it | ⭐ **that is what a `Shore` is** |
| be sited and titled by whoever owns the ground | it is on the land graph, held by the town |
| be where a craft makes landfall | ⭐⭐ **an exit** — `location.md` permits non-cardinal labels *"when the destination's templatePath resolves to a different zone"*, and a beach and an ocean are different zones, so `ashore` / `aboard` are already legal |

⭐⭐ **Two rows already ship** — the wharfside `river-edge` citing
`kestrel:confluence`, and the moor's `heath-mere` citing `holloway:head`.
**Terminus's waterfront is already citing a reach.**

⭐ And there is a three-rung fallback: a verb takes a Shore as a declared
argument (`default: "reachable:[class.Shore]"`) and **falls back to the
Locality's reach when none is bound** — *"how Heart's Delight's millsite
fishes the Delight's flats with no row and no code."*

### ⭐⭐ Three faces on one citation

- **`Shore`** — *act on* water you are not in (fish, haul, sound, draw)
- **a dive entrance** — *enter* water you are not in (⭐ the mine's adit,
  one element over: you descend where somebody knows there is something)
- **a mooring or launch** — *put a craft on* water

All three are room-fixed features citing a reach, and ⭐ a craft with
interior geography has rooms, so a **boat's rail is a `Shore`** and a
**boat dive** is the same feature aboard.

⭐ **An island** is then a land `Location` with a `Shore` and **no land
exit.** Same object, nothing new. Likewise a fishing village, a saltern,
a dyehouse, a whaling station.

### ⚠⚠ One defect, at the busiest seam in the system

From the same section of [fishing.md](../../subsystems/fishing.md):

> *"The room's own `look` does not carry the read — **a prop contributes
> nothing to its room's prose** (only the floor puddle has a kernel
> hook). A room-level contribution hook is a finding for the sweep."*

⭐⭐⭐ **So a beach does not mention the sea** unless the author writes it
twice — once in the room's `longDescription` and again on the Shore — and
the two then drift. ⚠ That is the *two copies of one sentence* failure at
the single most-visited join in the whole design, and **every coastal
room in the realm will hit it.** Worth promoting out of the sweep.

## 5b. ⭐⭐⭐ The trades — what water touches, and what it unlocks

Audited against all 27 shipped trades, 2026-10-09. ⭐ **Water touches far
more than fishing**, and the useful grouping is *how* it touches.

### Water as POWER

**Milling** is already **fully water-powered and shipped** —
`ρ·g·Δh·Q·η`, the weir, the race, an overshot wheel, *"in August it turns
slower."* ⭐ Nobody calls it a water trade and it is the deepest one we
have.

**Smelting · smithing · fuel** — ⭐⭐ water-powered bellows and trip
hammers are why every ironworks sat on a stream. A finery forge is a
waterwheel with a hammer on it.

### ⭐⭐⭐ Water as an ENTITLEMENT — and the rights system has no consumer

**Farming · ranching · milling** do not consume water, they consume **a
right to water** — and `watershed.md` ships the `water-right` document
kind, allocation, quotas, prior appropriation recorded, riparian derived,
and *"the parcel's reach citation."*

⚠⚠ **And the millsite has a weir across the whole river and no water
right.** Its own prose says *"it passes everything it takes — nothing is
diverted away, nothing is lost downstream."* ⭐⭐⭐ **That is a claim
about a diversion right, written as reassurance, with no record behind
it** — the oldest water dispute there is, in our best room, undocumented.

### ⭐⭐⭐ Water as an INGREDIENT whose chemistry is already readable

**Brewing · distilling · malting** — and the `Shore` read already reports
**soft / hard** as a physical fact about the water.

⭐⭐⭐ **Terroir-by-water is already readable and nothing consumes it.**
Burton's gypsum made pale ale, Dublin's hard water made stout, Pilsen's
soft water made lager — **three beer styles that exist because of three
rivers**, and we ship the read and the trades and no connection between
them.

### ⭐⭐⭐ Water as a medium you FOUL — the biggest unwired collision

**Dyeing · tanning · textiles.** All three ship. All three are sited on
water in life for the same reason. And `watershed.md` ships
**contamination as a concentration by kind**, so *a dry month is a dirty
month.*

⭐ `textiles.md` already knows the politics and has nowhere to put it:

> *"**Retting ponds stank badly enough to be banned upstream of
> towns.**"*

⚠⚠ **An authored prohibition with no river to prohibit it on** — plus
`MaturingMixin` already running *"the retting pit's clock"* and
`rotted-flax` as the over-ret, the trade's one visible failure, all
waiting on still water.

⭐⭐ **Tanning is the worse one and the better story**: lime pits, dung,
urine, bark liquor, downstream of everything and outside the walls. **A
LULU with a contamination output on a river** — `settlement-model`'s LULU
taxonomy meeting `watershed.md`'s contamination at a trade that already
ships.

⭐⭐⭐ **And the lake's accumulation property makes siting derivable: the
river carries your filth away and the lake keeps it.** The same tannery
is viable on one and ruinous on the other, and nobody authors a rule —
[content-craft § 8c](../../content-craft.md), located rather than
invented.

### ⭐⭐⭐ Water as TRANSPORT — and forestry's hardest problem is a water problem

**Haulage** — water freight was 10–20× cheaper than land, which is the
whole Erie finding.

⭐⭐⭐ But the sharp one is **forestry's bole**: *"the first Thing whose
product exceeds a body,"* tonnes, dropped on the floor and cross-cut in
place **because you cannot lift it.**

**Water is how a pre-industrial economy moved what exceeded a body.** Log
driving. ⭐⭐ The bole's entire design constraint is *answered* by a
river, which is why every sawmill in history was on one. **A bole you
cannot lift, you can float.**

### Water as a HAZARD — and three documents defer one pump

**Mining · quarrying.** Quarry-hill's water table at −12 is the explicit
scope boundary (*"a pit that fills, and a pump"*), `mining-slate` defers
*"everything below the water table — shaft, hoist, pump,"* and § 0 above
defers flooded workings. ⚠ **Three slates, one pump, nobody's.**

### Water as the RESOURCE

**Fishing** (ships) and **whaling** (§ 7).

### ⭐ Genuinely untouched

apiculture · baking · cooking · hearth-cooking · chandlery (candles, two
fats — *not* ship chandlery) · medicine · shopkeeping · winemaking ·
hospitality · bottling (wants water as an ingredient, not as a place).

### ⭐⭐ The three collisions to wire first

1. ⭐⭐⭐ **tanning + dyeing + retting → contamination.** Three trades
   ship, the mechanism ships, the prohibition is already written in a
   doc, and the lake/river distinction makes siting a real decision.
2. ⭐⭐⭐ **the bole → log driving.** It *resolves* a shipped design
   constraint rather than adding one.
3. ⭐⭐ **the millsite's weir → a water right.** One row, and it turns a
   sentence of reassurance into a record somebody can dispute.

### ⚑ Trades not built or discussed — the list, kept

⭐ The governing observation: **every settlement of a certain size sits on
water**, so this list is long and most of it is cheap.

**Movement and passage** — pilotage · ferrying · lightering · bridge and
ford tolls · watermen and wherries · ⭐ towpath haulage (the Erie's mules)
· dredging.

**Taking from the water** — ⭐⭐ **the ice trades** (§ below / own
drill-down) · salt by evaporation (⭐ `trade-quarrying` already ships a
**salt pan** and a **brine hearth**) · reed and withy cutting · eel and
oyster culture · wildfowling · pearl and sponge diving (the column's
first real consumer) · wrecking and salvage.

**Using the water** — ⭐ laundry (⭐⭐ `textiles.md` already floats *"a
laundry vocation — water is a precondition, not a consumable"*) · bathing
and spas · ⭐ **tourism and watersports** · milling (ships) · fulling ·
ropewalks and sailmaking · boatbuilding.

**Changing the water** — drowned-land reclamation and drainage ·
embanking · irrigation works · ⭐ the pump (above, and overdue).

⚠ **Not a build list.** Recorded so it is not lost, and because several
are a row or two on machinery that already ships.

## 5c. ⭐⭐ The trades examined — drill-down on § 5b's kept list

Worked 2026-10-08, from the ⛑ list above. ⚠ **Not a build order** — the
six with real content in them, plus the cuts.

### ⭐⭐⭐ Submersion — moved to [underwater-slate](./underwater-slate.md) § 8

⛔ **And it is not a trade.** Drafted here as a third RGO family beside
ice and whaling; that was wrong. **Submersion is an ACCESS MODE** — a tax
every underwater trade pays (gathering, mining, salvage, construction,
cable-laying) — and belongs on `rgo-unification-slate`'s **axis 2**, not
in the family roster. See § 8 there for the medium affordance table, the
edges (tidepools, the trench, under ice), drowning, and the poison-pill
audit of this slate's own DECIDED items.

### ⭐⭐⭐ Pilotage — see § 3b

The richest entry, and it got its own section because it answers *what a
traverse is*. Two trades sharing a word; the gate is knowledge that
**spoils**; the register's criterion 2 is satisfied by something unusual —
⭐ **the pilot and the laundress are both paid for an absence** (a
grounding that did not happen, a garment that was not ruined).

### ⚠ The oyster bed — DEMOTED 2026-10-08, and the finding survives

> ⛔ **Cut as a trade.** User: *"I don't have a lot of opinion on
> oystering, to me it's fancy fishing."* **Correct** — the act is *take a
> thing from the water*, the fishery is already derived on a reach, and
> cultivation would be husbandry's reconcile-on-read pointed at water. It
> was a shipped mechanism in a costume.
>
> ⭐ **The contamination finding below does NOT need the trade** — it
> works on any shellfish the shipped fishery already produces, so it
> stays here as a note on the contamination collision. And the
> *reservoir* half moved to
> [underwater-slate](./underwater-slate.md) § 8b, where it belongs: the
> bed is **ground with a cover**, not a fishery.

#### The finding, kept

Oysters are **filter feeders**: they clean the water, and in cleaning it
they **concentrate** what is in it. `spoilage.md`'s doctrine is that
**spoilage is a clock and contamination is an EVENT** — event-seeded, own
kill curve, spore floor, and **no sense that reports it**.

⭐⭐⭐ So: a bed downstream of a tannery. **The water runs clear. The
oyster looks, smells and tastes like an oyster. It kills you.** That is
`ContaminableMixin`'s silent second population with the most honest
vector it will ever have, and the lesson is real — **shellfish are an
integrating instrument for water quality, and the integration is
invisible.**

Then the politics writes itself and nobody invented it: whose tannery,
whose bed, how far is far enough, and **the harm is undetectable at the
moment of sale.** ⭐ Plus § 5b's lake-versus-river rule — *the river
carries your filth away and the lake keeps it* — so the same bed below
the same tannery is fine on one and lethal on the other.

⭐⭐ **And it is the first FARMED water resource**: an RGO whose recharge
you control. With ice (recharge 1.0, no conservation question) and
whaling (no recharge), **the trade programme gets its full control set —
three RGOs, three recharge regimes.**

### ⛔ The drainage board — CUT 2026-10-08

> ⛔ User: *"I don't really care about polders. Land is cheap in this
> game unless the content author needs it to be expensive — this seems
> like just a tool to do that."*
>
> ⭐⭐⭐ **And that is a sharper test than "is it interesting": the
> polder's entire value depends on land being EXPENSIVE, which is an
> authoring choice rather than a platform fact.** A mechanism whose
> premise is a content decision can never justify platform work — it can
> only ride an author who already wanted scarce land. **Recorded as a
> reusable refusal.**
>
> ⚠ One piece survives as a *pattern*, not a build: the dike is the third
> member of **exact cost against catastrophic, delayed, unmeasurable
> loss**, beside the fuel ration and the station's record
> ([climate-slate](./climate-slate.md) § *What it is FOR*).

#### The argument, kept for the pattern only

⭐⭐ **A polder is land that exists because a collective keeps a dike up,
and if the maintenance lapses the land ceases to exist.** There is no
other object like that in the design.

Which is why the Dutch water boards are the **oldest continuously
functioning democratic institutions in Europe** — they predate the states
around them, because the dike did not care who was king. A **government
whose entire charter is maintenance**, with taxing power, over land it
manufactured, where the franchise belongs to the people whose fields
drown. `civics.md` is seats-as-positions with Locality-declared
jurisdiction; ⭐ **this is a jurisdiction defined by who gets wet.**

⭐⭐⭐ **And it completes a family: EXACT COST against CATASTROPHIC,
DELAYED, UNMEASURABLE loss** — the fuel ration, the station's record, and
the dike. In all three the ledger says stop paying and **the ledger is
wrong.** (See [climate-slate](./climate-slate.md) § *What it is FOR*.)

⭐ Prior art: ***Jean de Florette* / *Manon des Sources*** — not laundry
and not dikes, but **water rights as the entire plot**: a blocked spring,
a ruined farm, two generations. The dramatic register for the August
crisis.

### ⭐⭐ Wrecking and salvage — where the law is the content

The richest lens-4 object on the list, because **the law is genuinely
unsettled and always has been**: who owns a wreck, what a rescuer may
claim, whether a cargo saved is a cargo bought, whether the owner's
absence is consent.

⭐⭐ And the dark version is historically real: **a town whose economy is
wrecks.** Not pirates — ordinary people for whom a bad night is a good
year, who are not *causing* wrecks and are also not praying very hard
against them. A community you can write with complete sympathy and no
villain, which is `content-craft.md` § 8c exactly. The hard edge — **the
false light**, luring a ship onto rocks — is the one unambiguous crime,
and is better for being the single line nobody admits is near.

Mechanically close to free: the salvage doctrine, chattel chain-of-title
and the accountability ledger all ship. **What it needs is a CLAIM and
somebody to hear it.** ⭐ And a wreck is a **place that appears without
an author and disappears on a tide** — gated by the diving ladder
(§ 3c).

### ⭐⭐ Salt — ice's twin, and the climate work created the pair

`trade-quarrying` **already ships a salt pan and a brine hearth.** Solar
evaporation needs sun and dryness; ice needs cold. **Same mechanism,
opposite climate, counter-sited.**

⭐⭐⭐ And the climate pass gave it teeth: `stallBelowK: 273` means the
cold half of the realm **cannot preserve by drying**, so it preserves by
**freezing** — while the warm half **salts**. **Two preservation
technologies split by latitude, with a trade route between them**, each
unable to do the other's job. The north buys salt it cannot make for the
fish it catches; the south buys ice it cannot make for the summer it has.
⭐ **Neither trade was designed to need the other and both now do** — the
best argument yet that the climate unification pays for itself.

### ⭐⭐ The ferryman and the bridge — and this is now a PATTERN

The crossing survives; the ferryman is finished, with no warning except
watching the piers go in. ⭐ And the ice road replaces him for five
months **free**, so his year already has a hole in it before the bridge
arrives.

⭐⭐⭐ **The reason to record it is that it is the third instance in two
sessions:**

| capability | survives as | the economy that dies |
|---|---|---|
| keeping things cold | `ClimateControl` | the ice trade |
| lighting a room | kerosene — *already in whale oil's own `keywords:`* | whaling |
| crossing a river | the bridge | ferrying |

⭐⭐⭐ **Three is a pattern, and it belongs to lens 5 rather than to any
slate** — promoted to
[design-lenses.md](../../design-lenses.md). The lens as written asks *does
the new object answer the same commands*, which the platform passes
trivially and **a person fails completely.** The content is always on the
person.

### ⭐⭐ Irrigation — what the WATER side owes it

Worked 2026-10-09. ⚠ **Most of irrigation is farming's**
([farming-slate](./farming-slate.md) § *Irrigation, and the one commons
inside private farming*) and the delivery half already ships. Recorded
here only for the three things the water model owes it — and the epoch
ladder, which went to
[rgo-unification-slate](./rgo-unification-slate.md) because **groundwater
is a different RGO class from surface water** and that is a roster fact.

**What already exists**, and it is more than expected: the `Conduit`
ladder (**haul · gravity · pumped**, where *"which one you have is the
sign of `headM`, and nobody declares it"*); both redistribution axes —
`passFraction` in **time** (*"hold the freshet in May, let it down in
August"*) and `divertsTo` in **space**, with *"a canal is a watercourse
with a control at its head"*; and the institution already named:
*"where the users collectively own the works that is an **irrigation
district**. None is a different object."*

#### 1. ⚠ The bed↔conduit join does not exist

Rain already waters a bed — *"a bed multiplies the millimetres by its
land area to get litres of soil moisture; a reach multiplies the same
millimetres by its catchment area to get cubic metres of river. One walk,
two scales."* **Irrigation is that same number arriving by pipe instead
of by sky**, and nothing wires a `Conduit`'s delivery into a bed's
moisture. Soil's input becomes `rain + delivered`. No new mechanism —
the join, which is farming's to build and water's to expose.

#### 2. ⭐⭐⭐ Return flow — the real gap, and the best content in it

The `draws` ledger subtracts a withdrawal **in full** (*"a draw at or
upstream of the reach being read is subtracted; one below it is not"*).
But irrigation does not consume what it diverts: crops transpire part,
and the rest percolates back below. **A draw needs a consumptive
fraction**, with the remainder returning at a downstream reach — one
field, and the ledger already has the topology to put it back.

Then the consequence, which is why it is worth building:

> ⭐⭐⭐ **If the upstream user LINES HIS DITCH to stop it leaking, the
> downstream user is INJURED** — because the leakage was his supply.
> **Efficiency upstream is an injury downstream.**

Real doctrine (the *no-injury* rule is why conservation improvements get
scrutinised in western US water law), completely counterintuitive, and a
perfect lens-4 object: **the engine computes both sides exactly,
*"improve your efficiency"* turns out not to be obviously good, and
nobody is wrong.** Same shape as climate-slate's mild-winter catastrophe
— a sensible, sympathetic act with a victim nobody looked for.

⭐ It also sharpens the August crisis: a senior downstream right may have
been living on junior upstream waste for twenty years with nobody aware.

#### 3. ⭐⭐ Irrigation is what puts FARMING into the water fight

Why it belongs to the water design at all:

> **A rain-fed farm suffers weather. An irrigated farm suffers law.**

Irrigation converts a passive farmer into a **rights holder** — a
priority date, a headgate, an assessment, and a ditch rider who can walk
up and close it. Without it a drought is something you endure; with it, a
drought is somebody **curtailing you, by name, in person.** That is § 5c's
whole August-crisis content arriving at the farm, and irrigation is the
only thing that delivers it there.

⭐ Two smaller couplings: irrigation is **`passFraction`'s customer**
(crops want water in July, the river delivers in May — the timing
mismatch *is* why storage exists), and it is **the pump's fourth
consumer** (mine · quarry · diver · field).

#### ⭐ And it passes the test the polder failed

Worth recording because it shows that cut had teeth. The polder died
because **its premise — expensive land — is an authoring choice.** The
irrigation district's premise is **water scarcity, which is DERIVED**:
the late-summer low falls out of the snowpack walk whether anyone
authored it or not. ⭐⭐ Same institutional shape, opposite verdict — and
**irrigation is the mechanism that makes land expensive derivably**,
which is also lens 6's answer (it produces nothing; its product is **land
value**).

#### The lens pass, briefly

- **1 Pedagogy** — `soil-science` + `agriculture` ship. Four derivables:
  ⭐⭐ **return flow** · **rights are timing and priority, not volume** ·
  ⭐ **gravity means geography decides** (read the elevation before you
  buy the land) · **salinization** as a decades-long cost.
- **2 Expression** — ordinary: a `Conduit` with an intake and a delivery,
  no code. ⭐ Bespoke: a **qanat is an underground conduit**, i.e. *a mine
  that carries water* — the mining warren and the conduit meeting, a
  genuinely strange object neither system anticipated. Named-work test:
  **Nile flood-recession farming passes today**, because the freshet is
  computable and the act is *planting*.
- **3a Immersion** — ⭐ **a ditch is visible infrastructure.** It crosses
  roads, it has bridges, it is running or dry — and **whether it runs
  tells you the season and the politics from the roadside.** A dry ditch
  in July is a story read without talking to anybody. The headgate is a
  physical object and it can have a lock on it.
- **3b Participation** — ⭐⭐⭐ **the polity can choose ROTATION instead
  of PRIORITY.** Prior appropriation says the senior takes all; a district
  can run **the turn**, everybody a short slot in order. Both work, the
  allocation layer supports both, and **they produce different
  societies** — a property regime versus a sharing regime. The lens's
  actual test, for free.
- **4 Values** — efficiency-as-injury · rotation-versus-priority (the
  seniors fight it, because **a priority date is an asset**) · and
  ⭐ **salinization is intergenerational**: farm well for thirty years and
  hand on ruined ground, where the engine measures the yield now and the
  salt later and **nobody alive is punished.**
- **6 Economy** — above. ⭐⭐ Who pays: **the assessment, by ACREAGE
  rather than by use** — how ditch companies actually worked, and itself a
  values choice: *you pay your share whether you take it or not.*
- **7 Governance** — the headgate, the rider, the assessment, the turn.
  Criterion: a curtailment order by priority date; appeal: the district.
  ⭐⭐ **Entrenchment: whether a district may switch from priority to
  rotation is a tier-C question whose losers' asset is a DATE**, which is a
  better tier-C exhibit than most.
- **Schell** — ⭐⭐ [`27-time`](../../lenses/27-time.md): irrigation is a
  **seasonal commitment with no undo** (you choose what to plant in April
  on a forecast and cannot revise in July), a long-lag irreversible
  decision that entry notes we are short of. ⭐
  [`7-endogenous-value`](../../lenses/7-endogenous-value.md): **a priority
  date is pure endogenous value** — worthless outside the game, enormous
  inside it, and **created by law rather than by labour.**
  [`33-rules`](../../lenses/33-rules.md): a district writing and amending
  its own rotation is the house-rule-to-written arrow at farm scale.

### The rest, briefly

- **Dredging** — the ditch rider's sibling: a maintenance trade nobody
  funds, failing gradually and then suddenly, coupled to siltation behind
  the mill's weir and to derived navigability. ⭐ Its live question is
  **where the spoil goes**, which is a LULU.
- ⭐⭐ **The pump** — three slates defer it; `watershed.md` already says
  water and power meet at **one equation read in two directions**. ⚠
  **The third instance of the ice slate's standing check** (*when a
  bidirectional mechanism ships, one direction gets its driver and the
  other waits for a consumer*) — turbine shipped, pump did not. **Now
  three consumers deep (mine, quarry, diver) and the cheapest unblock on
  the board.**
- ⭐⭐ **Laundry** — own slate: [laundry-slate](./laundry-slate.md).
- **Tourism** — the one trade whose product is *the place*, so the first
  that can be destroyed by succeeding. ⛔ **Must not become a gauge on
  description** (decor is never a gauge); the honest wiring is **renown at
  place scope** — famous because people went and talked, not because an
  author typed well.
- **Boatbuilding / ropewalks / sailmaking** — the capital-goods tier under
  everything maritime including whaling. ⭐ A ropewalk is a quarter-mile
  shed: **a building shaped like its product.**
- **Reed and withy cutting** — basket and thatch feedstock, a genuine
  coppice-shaped RGO on wet ground, cheap. · **Wildfowling** — fishing's
  mechanism over a different animal. · **Pearl and sponge diving** —
  belongs with underwater and the diving ladder, not here.

### ⛔ Cut

- **Lightering** — a sub-step of haulage **with no decision in it**, and
  `vocations.md`'s chain-walk rule says a link with no decision produces
  **procedure, not emergence.**
- **Bathing and spas** — folds into tourism.
- **Watermen and wherries** — ferrying at smaller scale; does not earn a
  second entry.
- **Embanking** — collapses into the drainage board, where the interesting
  part was.

---

## 6. The 12× clock decides the content scale

| game | real |
|---|---|
| a 4-hour **watch** | **20 min** |
| a 12 nm sighting at 4 kn — 3 h to contact | ⭐⭐⭐ **15 min** |
| ⭐ a **tow home** at 2 kn over 12 nm | **30 min** |
| **rendering**, 2–3 days continuous | **5 h** |
| a 2-week passage | ~28 h |
| ⛔ a three-year deep-sea voyage | **91 days** |

⭐⭐⭐ **The sighting fuse lands at fifteen real minutes** — long enough
that closing, running, hailing or hiding is a real decision, short enough
to stay at the keyboard. **A watch is twenty real minutes.** And ⭐ **the
return is longer than the outbound because you succeeded** — out fast in
an empty boat, home slow behind a carcass.

⚠ The three-year voyage is unplayable. ⭐ But not by compressing the
fiction (`uncertainty.md`'s abstraction law forbids it): **a voyage was
three years because the ship sailed to the far side of a planet, and we
have a realm with a few basins.** The *content* was always days long.

---

## 7. Whaling, in brief — its own slate comes later

Recorded here only so it is not lost; ⭐ **water first, industries
after.**

- ⭐⭐⭐ **The demand already ships and is fed by nothing.**
  `trade-fuel`'s **lamp-oil** (43 MJ/kg, casks, bought by public-works,
  burned by `FuelStore`) has **no recipe** — the Oil Works *"makes lamp
  oil (spawned floor stock)"*. ⚠ And its keywords are
  `[lamp-oil, oil, lamp, **kerosene**, paraffin]`: **the shipped
  illuminant is named for the thing that destroyed whaling.** That makes
  the kerosene transition the best epoch arc available —
  **the capability survives and the economy does not.**
- ⭐⭐ **The first RGO whose reservoir nobody owns.** Every other sits on
  held ground; `apiculture.md` was *"the first whose reservoir is somebody
  **else's** land."* **The water is nobody's**, which is why § 5 matters.
- ⭐⭐ **The first RGO whose credit is a share.** Nobody owns a whale — a
  boat crew takes it, a company renders it, the *voyage* owns the
  commodity. And the **lay** must be a **contract, not a job**, because
  `employment.md`'s hiring vocabulary is closed (`{gigs, discipline,
  band}`) — ⭐ which is historically exact: whalemen signed **shipping
  articles.**
- ⭐⭐ **The act is a pipeline with no partial credit** — sight → chase →
  fasten → kill → tow → cut in → try out. Every shipped RGO is one verb.
  ⚠ A sperm whale that sinks is a total loss *after* the chase.
- ⭐⭐⭐ **The harpoon is a tether, not a weapon.** You *fasten* to the
  animal and it tows you. `ranged.md` assumes the projectile's job ends on
  arrival.
- ⭐ **Remoteness costs grade.** `spoilage.md` runs during the tow, so the
  further out you went the worse the oil — a *second* honest cost of going
  where the stock is.
- ⭐ **The minimum viable water is a bay**, not an ocean — Basque shore
  whaling was a headland lookout, a beach launch and try-works on the
  sand. ⭐⭐ Which makes the open-water fishery **whaling's second epoch**,
  reached because the bay is hunted out: **the first ground is the one you
  can see from the cliff.**
- Products: **oil** (demand exists) · **spermaceti** (the finest candle
  wax and a cold-stable precision lubricant — ⭐ the unit of luminous
  intensity was defined as one spermaceti candle) · **baleen** (the 19th
  century's plastic; a `textiles.md` consumer) · **ambergris** (⚠ needs
  perfume, which does not exist).
- ⚠ **Lens 4 wants the moral question decided out loud**, early, rather
  than settled by drift in a content pass.

---

## 8. Lens pass

1. **Pedagogy** ⭐⭐⭐ — almost everything derivable: the horizon is
   `1.17√h`, the fishery is Liebig, direction is elevation, navigability
   is flow × width. ⭐ And `Watercourse` sets the bar: **an uphill reach is
   *unrepresentable*** — not validated, **inexpressible**.
2. **Creative expression** ⭐ — the point of § 4, and currently the
   **weakest** lens here. ⭐⭐ The class/rows split is the strongest half
   (*"a row under `/system/water` would be titled to the water group, and
   world-seed could not touch the river it authored"*).
3a. **Immersion** ⭐⭐⭐ — **one sighting channel**, or the water becomes
   sortable. Plus *"the map is the argument"* and contamination as a
   concentration so *a dry month is a dirty month.*
3b. **Participation** ⭐⭐⭐ — ⭐ *"navigation is a claimant who is not a
   farmer"*: **navigation is already a water right**, so the polity can
   fight about the water. And the holder can close a ground, set a season,
   license, or refuse to.
4. **Values** ⭐⭐⭐ — **whether to regulate** is the purest lens-4
   question in the project: *the model will tell you the stock is falling
   and will never tell you to stop.* Also: who may hold water they work ·
   the duty · whether salvage overrides title.
5. **Continuity** ⭐⭐ — *"a sewer is the same object reversed"*, and ⭐
   **excludability is why this is a business and a river is a law** — the
   epoch axis stated as a property.
6. **Economy** ⭐⭐ — flow is a **takeable volume**; the millsite already
   consumes `ρ·g·Δh·Q·η`; and § 7's demand-first finding.
7. **Governance** ⭐⭐⭐ — a Locality declares its water; `water-right` as
   a document kind; allocation; quotas; and § 5's subdivision question.

---

## 9. Open questions

1. ⚑⚑ **A price on horizontal passage** (§ 4) — gradient, bed, width,
   obstruction. **The deepest item.** ⭐ Restated 2026-10-09 by contrast
   with [underwater-slate](./underwater-slate.md): **the vertical axis
   priced its passage (breath, cold, ballast) and the horizontal one got
   flow × width and a boolean.** One axis has a cost model and the other
   has a predicate — and the column is the proof it is buildable.
1a. ⚑ **A room-level contribution hook** (§ 5a) — so a `Shore` can speak
   in its room's prose. ⚠ Currently **a waterfront does not mention
   water** unless it is written twice. Already a sweep finding in
   `fishing.md`; worth promoting, because every coastal room hits it.
1b. ⚑ **The place↔bulk line.** Nothing says where water stops being a
   place and starts being a container's contents — a puddle, a bath, a
   trough, a cistern, a pond, a tarn, a lake. ⭐ The likely test is the
   same one as everywhere else (*can you be in it*), ⚠ but a bath breaks
   it cleanly, so it needs the real answer.
2. ✅ **Subdivision — ANSWERED (§ 5).** The committee manages it and its
   **charter** sets the consent rules. No engine answer, no default; a
   water body's committee may be a gatekeeper or a rubber stamp, and
   **which it is, is content.**
3. ⚑ **Can water be held by somebody who works it?** (§ 5) — lens 7. ⭐
   Narrowed by #2: the criterion is the charter, so the open part is only
   **whether the polity constrains what a charter may say.**
4. ⚑ **Reversing flow** — tidal bores are a real expressive loss and may
   be worth a term rather than a refusal.
5. ⚑ **Where position-in-a-passage lives.** A fraction for linear, a
   coordinate for areal — but on what, and read by whom.
6. ⚑ **The tide.** ⭐ An estuary is a `Watercourse` whose navigability has
   a tidal term, and `CelestialApi` already derives the periodicity — so
   it needs **less** than an ocean. ⭐⭐ And *a tide is a deadline that is
   not yours*, which makes it the best possible onramp: it teaches time
   pressure, pilotage and consequence in one room. ⚠ Terminus already has
   an `estuary` district and a `wharfside`.
7. ⚑ **Lens 4's moral question on whaling**, decided rather than drifted.

---

**See also:** [underwater-slate](./underwater-slate.md) (⭐ the column,
the medium derived from `level − elevation`, and the ascent Journey —
**DECIDED**, and it priced the vertical passage this slate still owes the
horizontal one) · [watershed.md](../../subsystems/watershed.md) (what ships) ·
[zone.md](../../subsystems/zone.md) (the decomposition § 2 asks for) ·
[fishing.md](../../subsystems/fishing.md) (the derived fishery and the
`Shore`) · [land-compute-and-license](./land-compute-and-license.md) (who
is charged for a craft that crosses boundaries) ·
[content-craft § 8c](../../content-craft.md) (locating conflict rather than
inventing it) · [rejection-slate](./rejection-slate.md) (the other RGO
whose reservoir is a commons problem).
