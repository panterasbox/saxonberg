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
you can occupy, surface and beneath.** A **water biome branch** (light
attenuating by depth, pressure, `breathableMedia` empty so
`respiration.md`'s asphyxiation crisis runs) plus **permission for a reach
to be a `Location`.** `fishing.md` already built the half where you act on
water you are *not* in — the `Shore`. This is the other half.

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

## 5. Ownership — two tiers, and the conflict is subdivision

**An independent concern holds each water body** — one committee per
ocean/expanse, managing the frame. **The individual cartesian locations
within it can be held by one or more other committees.**

⭐⭐ **This needs no new mechanism.** `parcel.md`'s **longest-prefix**
resolution is exactly how two tiers of title coexist: the frame-holder
holds `/world/<realm>/<ocean>/`, a port committee holds the longer
prefix, and `ownerOf` resolves to the port. ⭐ The shape has a long
history — **the frame-holder owns the *way*, the tenants own the
*destinations*** (a port authority, a turnpike company).

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

1. ⚑⚑ **A reach's own character** (§ 4) — gradient, bed, width,
   obstruction. **The deepest item**, and the one both halves of the model
   have been designed around twice rather than faced.
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

**See also:** [watershed.md](../../subsystems/watershed.md) (what ships) ·
[zone.md](../../subsystems/zone.md) (the decomposition § 2 asks for) ·
[fishing.md](../../subsystems/fishing.md) (the derived fishery and the
`Shore`) · [land-compute-and-license](./land-compute-and-license.md) (who
is charged for a craft that crosses boundaries) ·
[content-craft § 8c](../../content-craft.md) (locating conflict rather than
inventing it) · [rejection-slate](./rejection-slate.md) (the other RGO
whose reservoir is a commons problem).
