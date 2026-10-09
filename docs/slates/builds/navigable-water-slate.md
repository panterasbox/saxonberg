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
