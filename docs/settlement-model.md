# The settlement model — what every town needs, and where they diverge

> **Captured 2026-09-03**, out of the towns design sessions.
> **Status: design synthesis. Not requirements.**
>
> A meta-doc **over** the locality family, the way
> [stewardship-doctrine.md](./stewardship-doctrine.md) sits over the
> stewardship family. It is deliberately **not a slate**: nothing here is
> a backlog item, it is the model every settlement is authored against.
>
> ⭐ The governing reason it exists: shipped content is roughly **a tenth**
> of what will exist at launch, so an enumerated venue list is worthless.
> What survives is a **generator** — a needs template, a type taxonomy, a
> density rule, and a growth mechanism. The actual venues live per-locality
> in `docs/staging/`; the machinery lives in
> [venue-and-supply-slate](./slates/builds/venue-and-supply-slate.md).

**Sources.** The colony sims, because they are literally *about* the
question: **Banished** · **Farthest Frontier** · **Manor Lords** ·
**Foundation** · (**Cities: Skylines** for zoning only).

Related: [zoning-slate](./slates/builds/zoning-slate.md) (⭐ **the type
taxonomy is its, not this doc's**) ·
[venue-and-supply-slate](./slates/builds/venue-and-supply-slate.md) ·
[towns-slate](./slates/builds/towns-slate.md) ·
[stewardship-slate](./slates/builds/stewardship-slate.md) ·
[vocations.md](./vocations.md) ·
[parcel.md](./subsystems/parcel.md) · [holding.md](./subsystems/holding.md) ·
[residence.md](./subsystems/residence.md) ·
[address.md](./subsystems/address.md) ·
[freight-slate](./slates/builds/freight-slate.md)

---

## 1. ⭐⭐⭐ The sixteen needs

> **In a colony sim these needs are the player's problem. Here every one
> of them is a market.**

A settlement that cannot meet a need either **imports** it or has an
**unfilled vocation** — which is exactly [vocations.md](./vocations.md)'s
own test, *a vocation exists iff unmet demand*. So the needs list and the
archetype list are the same list.

| tier | need | the venue | state |
|---|---|---|---|
| **survive** | food, raw | farm · market garden | `trade-farming` |
| | food, prepared | cookhouse · eatery | `trade-hearth-cooking` |
| | food, retail | general store | ✅ ships |
| | water | well · standpipe · tank | `water` |
| | fuel | fuel yard · woodlot | `trade-fuel` |
| | clothing | weaver · tailor | ⚠ textiles, planned |
| | health | infirmary | ⚠ medic designed, **nothing built** |
| **work** | tools | smithy | `trade-smithing` |
| | repair & sharpening | ⭐ *the same smithy, a different act* | verbs ship |
| | storage & exchange | depot · market | ✅ ships |
| | transport | carrier · rig | ⚠ freight designed |
| **hold together** | housing | lodging · lease · lot | `residence` |
| | drink & assembly | public house | `trade-hospitality` |
| | education | school · institute · library | ⚠ nothing outside campus |
| | ceremony | chapel · hall · **burial ground** | ⚠⚠ **nothing at all** |
| | law | register · constable · court | ⚠ policing designed |

⭐⭐ **Score a settlement against the sixteen and you get its portrait, not
a to-do list.** The *gaps are the character*: Rejection has fuel, tools and
exchange and nothing else; Hinkley has housing and nothing else.

### The four universals

Every settlement, whatever its type, meets these locally: **water · food
retail · exchange · housing.** ⭐ A place that cannot do those four is not
a settlement — it is a **facility**.

---

## 2. The types — ⭐ site-driven vs exit-driven

**The taxonomy is [zoning-slate](./slates/builds/zoning-slate.md)'s**, and
it is better than sorting by size: it sorts by *why the place is there*.

**Site-driven** — the thing is there, you go to it:

- **resource town** — the mine, the quarry, the mill at the falls. ⚠ *They
  die when the seam runs out.*
- **node town** — the junction, the crossroads inn, the depot. ⭐⭐ *The
  transport network creates these* — which makes the freight build a
  **town generator**: site a depot and a settlement wants to exist round it.

**Exit-driven** — a separate locality with its own government, zoning and
tax base, pointed away from something:

- **the suburb** — exits to escape **nuisance**
- **the industry town** — exits to escape **regulation** (Chicago's Union
  Stock Yards sat in a separate municipality on purpose)
- **the LULU town** — exits to escape a **prohibition** (Roman law forbade
  burial inside the walls; San Francisco evicted its cemeteries in 1900,
  which is why **Colma** exists)

**And the city** is the thing everyone is exiting *from*.

| | ships | is | its failure |
|---|---|---|---|
| **Rejection** | ✅ | resource town | ⚠ **depletion** — it dies when the seam runs out |
| **Hinkley Hills** | ✅ | suburb (nuisance-exit) | isolation |
| **Heart's Delight** | ✗ | node town + a village | being bypassed |
| **the necropolis** | ✗ | LULU town | it is somebody else's prohibition |
| **Terminus** | ✅ | the city | congestion |

⭐ Two towns can meet the same number of needs for opposite reasons: a
**camp** because it is too new and remote to have acquired them, a
**suburb** because it is close enough to import them. Rejection and
Hinkley both score 4 of 16, and need completely different lists.

---

## 3. ⭐⭐⭐ Specialization — a city is where the general store fragments

The difference between a village and a city is not *more*. It is Adam
Smith: **the division of labour is limited by the extent of the market.**

> **In a village one shop meets many needs. In a city many shops each meet
> one.**

A general store exists precisely where demand for any single good is too
thin to keep a specialist busy. When the market deepens, the general store
**decomposes**, and each fragment is a vocation that could not exist at
village scale.

| | retail shape | the rule |
|---|---|---|
| **camp** | the company store | you buy what the employer stocks |
| **village** | one general store | no single good supports a specialist |
| **market town** | general store **+ 1–2 specialists** | ⭐ the hinterland aggregates enough for one |
| **city** | specialists only; the general store survives at the **edges** | every need supports a full-time trade |

⭐⭐ **So a city's shop list is read off [vocations.md](./vocations.md)** —
it is the set of vocations whose demand test passes at city scale — rather
than invented. Each village venue shatters: the general store into
greengrocer/butcher/baker/fishmonger; the smith into
ironmonger/cutler/farrier/locksmith/cooper; the infirmary into
physician/apothecary/surgeon/midwife; the hall into temples/**undertaker**/
**monumental mason**.

---

## 4. ⭐⭐⭐ Zoning exists because of density, not because of order

> **At 3 m cells everyone smells your forge. At 200 m nobody does.**

This is the honest reason, it is teachable, and Saxonberg can *demonstrate*
it because it has settlements at four cell sizes (city 3 m · suburb 6 m ·
pithead 10 m · valley 200 m).

It also lands exactly on the shipped stewardship test — *does this activity
consume shared capacity, or **spill** onto people who did not consent?* A
forge is smoke and noise. The separation is the spillover rule applied at
density.

### The same question, three answers — and that is the Tiebout axis

**May you keep a workshop in your own yard?** (Manor Lords' **burgage
plot**: a house *plus its backyard*, and the backyard takes an extension —
garden, animals, or **a workshop**. The residential parcel is the
production unit, which is how pre-industrial artisans actually worked.)

| | home workshop? | why |
|---|---|---|
| **Rejection** | ⭐ no zoning at all — work anywhere | frontier; nobody has authority to say otherwise |
| **the village / valley** | **yes** — the burgage plot | density too low for anyone to be bothered |
| **Terminus** | **no** — trade goes to the workshop district | your forge is everyone's forge |

⭐⭐ **A real player decision with a real trade-off**: be a smith in the
city and pay for industrial premises, or be a smith in the valley and work
from your yard. Different cost structures, different markets, neither
answer is right.

⚠ And the boundary case is **home occupation**, which real zoning solves
and which resolves Hinkley's death-man tension: *you may work from home,
but not with employees, signage, customer traffic or noise.* **The
nuisance is regulated, not the work.** Prentice is actionable not because
he produces, but because customers come to the house.

### What land use actually needs is not more uses

Six is right — `residential · agricultural · commercial · industrial ·
civic · wild` — and a seventh should be resisted. What is missing is
**intensity**: *how much* of a use is permitted here.

> ⭐⭐ That is the **allowance cascade**, which is designed, documented, and
> currently an inert field. It is the dial that lets `residential` mean *a
> bed and a workbench* in one polity and *a bed only* in another —
> without touching the vocabulary, and **with the locality setting it.**

---

## 5. Singleton vs warren

> ⭐⭐⭐ **A warren is right when the room count is a function of player
> activity. Singletons are right when it is a fact about the ground.**

Not *how big* — **what determines the size.**

| | what sets the size | internal network | shape |
|---|---|---|---|
| **Rejection** | the terrain — a shelf | one street + one yard | **all singletons** |
| **Hinkley** | how many lots have sold | a lane that grows | ⭐ `PlatWarren` (ships) |
| **Heart's Delight** | fixed crossroads + bought ground | singleton hub, generative hinterland | **both** |
| **Terminus** | how many venues need an address | several streets | **both** |
| **necropolis** | how many are buried | rows of plots | **warren** |

⭐ Rejection's one warren is the **`MineWarren` underground** — right for
the rule inverted: the surface is a fact, but *how much mine exists* is
what you cut.

### ⚠ The failure mode: empty connector rooms

Cities: Skylines can afford a hundred road tiles because you look down at
them. In a MUD, three rooms containing nothing are **worse** than one — 
three `look`s that return nothing.

> **A street exists to hold frontage. A room with no door onto it is not
> worth walking.**

Sizing rule: **as many street rooms as you have things worth standing in
front of, plus the minimum to connect them.** A district with six venues
is two or three street rooms, not twelve. Where you want the *sense* of
more, Hinkley's lane already shows how — the unbuilt lots are `details:`
prose, not nine empty rooms. ⭐ *Prose is bulk, Stuff is few.*

---

## 6. ⭐⭐⭐ One `PlatBook`, four land uses

`PlatBook` is already fully parameterized — `parentExtent`, `lotBranch`,
`lotPrefix`, `priceMinor`, `areaM2`, **`landUse`**, `holderPath`. So every
growth case in the realm is one shipped mechanism:

| plat | `landUse` | `areaM2` | sells |
|---|---|---|---|
| Hinkley Hills | `residential` | 1 000 (¼ acre) | house lots |
| Heart's Delight | `agricultural` | 40 000 – 400 000 | farm ground |
| Terminus — West Bank | `commercial` | 200 – 2 000 | working frontage, **cheap** |
| Terminus — East Bank | `commercial` | 200 – 2 000 | prestige frontage, **dear** |
| Terminus — Wharfside | `industrial` | ≥ 100 | workshop premises |
| the necropolis | `civic` | ⭐ ~4 | **plots** |

⭐ A cemetery *is* a subdivision — numbered plots, sold, in rows. Colma is
a plat book.

### A street is authored when it is full and generative when it is not

⭐⭐ **The street does not decide; the parcel does.** "Both, on different
streets" is one mechanism at two stages: some plats have capacity left and
some do not. And it is diegetically obvious, because you can see empty
lots.

⚠ Two axes that correlate but are **not** the same:

- **frontage availability** — can you buy in? *(a fact about the plat)*
- **venue kind** — bespoke or archetype? *(a fact about the business)*

⭐ And **availability is not cheapness.** *Why* the ground is new decides
the price: reclaimed fill is cheap (it is mud), a burned block is cheap
(it is ash), **new money is dear** — it is new because it became
fashionable, not because it was created.

### The lifecycle, needing no new systems

> **new ground → frontage for sale → built out → secondary market → high
> street.**

A generative street *matures into* an authored one. When the plat is
exhausted the only way in is buying from a holder, at whatever the market
has reached — the going-concern model — and whoever got in early holds an
appreciating asset. That is `PlatBook` capacity plus title transfer, both
shipped.

### Three land markets

| | mechanism | where |
|---|---|---|
| **stake** | first come, enforced against a register | ⭐ Rejection — the frontier condition, and it **ships** (`stake`) |
| **sell** | a plat with capacity and a price | Hinkley · the valley · Terminus's banks · the necropolis |
| **transfer** | secondary, whatever the holder will take | everywhere, once built out |

---

## 7. The ladder — ⭐ and rung 0.5 already ships

| rung | you buy | what is different |
|---|---|---|
| 0 | a **tool** | you can do the work; you have no premises |
| ⭐ **0.5** | **a market stall** — a pitch by the day | rented, cheap, **no title**. `market/stalls.yaml` ships |
| 1 | **premises** | a titled parcel; nothing on it |
| 2 | a **one-person operation** | feeds one household, sells a surplus |
| 3 | **a business with a roster** | employees, an account, a place in the market |
| 4 | ⭐ **a position others depend on** | scarce for a reason that is **not price** |

The stall is the missing step between a tool and premises — historically
exactly how trade starts (a barrow, then a shop) — and **it is already
authored content.** The market is the on-ramp to the generative street.

Rung 4 is never purchasable: in the valley it is *water seniority*
(first-in-time), in Rejection the orebody, in a node town the **position**.

---

## 8. Connective tissue — ⭐ there is not one network, there are six

Different topologies over the same places, and **the misalignments are
where every story lives**:

| network | shape | state |
|---|---|---|
| the **watershed** | a tree, flowing one way | ✅ ships |
| the **address tree** | political containment | ✅ ships |
| **TPA** | a star — hub and spoke | ✅ ships |
| **banking** | a star — all → goodkin | ✅ ships |
| the **aether** | ⭐ a **complete graph** — reaches everywhere | ✅ ships |
| the **press** | broadcast, one → many | ✅ ships |
| **roads** | a graph, walkable, costly | ⚠ three rooms |
| **freight** | — | designed |

> ⭐⭐⭐ **Information is a complete graph. Goods are a star.
> Perfect information, imperfect delivery.**

You always know the price in the city; getting your ore there is the whole
problem. That is true *by construction* already, and it is the design space
freight sits in.

### ⭐⭐ The cadences are the character

Four roads, four rhythms — how to make them feel different without
changing the geometry:

| edge | cadence | feels like |
|---|---|---|
| suburb ↔ city | **twice daily** | a tide |
| resource town → city | **by the load** | irregular, heavy, an event |
| farm valley → city | ⭐ **seasonal** — nothing, then everything for six weeks | a dead road, then a river |
| city → necropolis | **as needed** | never scheduled, no return traffic |

### The two pieces that make it a network

**The depot** — one per settlement, and it is the *interface*: where the
star (TPA) touches the graph (roads) and the goods network touches the
local economy. `consign` already works there, so **no new verb**. Each one
looks completely different — a weighbridge at an adit, a rail platform
with a noticeboard, a loading dock stacked with empty trays.

**The carrier** — freight (bulk, business to business) and delivery
(small addressed items) split by **capacity**. Teamster/drover and carrier
are *designed*; wainwright is a **gap**.

⚠ **Transport must cost something before a road is more than scenery.**
TPA is free and instant today. Authoring roads early still buys the
*walk* — the fouled water you pass, the ore going by — but the economics
do not bite until moving things is expensive. Build the road; let it be a
place first and a cost later.

---

## 9. What the colony sims contributed

| game | the lesson |
|---|---|
| **Banished** | ⭐ **no tools = everyone works at 25 %.** Tools are a multiplier on *all* labour, which makes the smithy the most load-bearing building in a settlement. And there is no money at all — the economy is **time**. |
| **Farthest Frontier** | **food variety** — a monotonous diet sickens. That single rule is why a settlement needs more than one farm type, and it is an argument for the six farm shapes that is not "realism". Also per-field soil and rotation. |
| **Manor Lords** | ⭐⭐ **the burgage plot** — the residential parcel *is* the production unit. And **housing tiers gate on reachable services**, which is a far better residence ladder than square footage: the support venues are what upgrade your home. |
| **Foundation** | ⭐ **paint a zone, let individuals build in it** — the only one of the five whose model matches our doctrine. Plus the **monument builder** (freeform authored construction as *expression* inside a sim — our version is facades + furnishing + studio) and the **three estates** (development as a *political* choice: which power the settlement serves). |
| **Cities: Skylines** | zoning as the core verb, and **demand derived from the simulation** rather than declared. |

> ⭐⭐⭐ **The thing none of them do: in all five the individuals are AI.
> Here they are players — so zoning is not a placement tool, it is a LAW.**
> A rule about what you may do on your own ground is a genuine political
> constraint on a person, not a UI mode.

---

## 10. Open

- **Ceremony is a realm-wide hole.** No burial ground, no chapel, no hall
  in use, anywhere outside Terminus — for a game with a mortality
  subsystem and a corpse-as-forensic-object. ⭐ *The burial ground is what
  turns a camp into a town: you can leave a camp, you cannot leave your
  dead.*
- **Health is the second hole.** The medic vertical is designed and there
  is not one infirmary in the realm.
- **The allowance cascade is inert.** It is the dial §4 needs.
- **Does a locality set its own zoning, and who decides?** The answer
  should be *the polity*, which makes it civics rather than authoring —
  and makes Hinkley's never-used District the obvious first test.
- **What is a business worth?** Unmodelled; `appraisal` is a shipped
  Discipline with nothing to appraise.
