# Discovery slate — what the world gives you for looking

> **Status: PARTIAL** — the FORAGING half is unbuilt (no forage verb, no
> patch, no biome table; `trade-farming`'s `Sward.ts` records that D61's
> forage was cut). The CONSUMABLE half's distribution shipped with the
> magic-items build in a different shape than Part 2 drew: rarity
> derived from stored labour, material tags × a zone's `favours` for
> place affinity, a per-region live census the sweep tops toward a
> declared `stocks:` target — [magic-items.md](../../subsystems/magic-items.md)
> § *Distribution*, [residency.md](../../subsystems/residency.md) § *Zone
> fields the spawn sweep reads*. *(Compacted 2026-09-19; ledger:
> `docs/plans/slate-compaction/unlinked-1.md`.)*
> **Left:** the forage verb + the patch Stuff · harvest-method depletion
> (take the leaves / pull the root) · the method ladder + field drying ·
> biome-authored tables with derived, depleting stock (character authored,
> quantity measured) · the table IS the description · traffic / remoteness
> as the deposition rate · the astrological (lunar) inflow term + the
> behaviour-mediated correlation · the almanac (survey · calendar ·
> register) · communal identification that publishes · the creature as a
> container + loot that walks · authored place-KINDS (a vault, a hoard) ·
> the tail / breadth author knobs, parcel-scoped · concealment by default
> for spawned things · `kind` / `bulk` / `fragility` as weights
> **Size:** a build

**Captured 2026-08-02** as `foraging-slate`; **renamed and widened the
same day** when the user pointed out there are **two systems here, and
they overlap**:

1. **Natural foraging** — the anthropological sense: gathering what occurs
   naturally in the wild. *Stardew, Skyrim, Witcher.*
2. **The consumable table** — potions, scrolls, rings, amulets, wands
   **procedurally distributed into locations, creatures and vessels**.
   *The NetHack model.*

> ⚠ **User correction, recorded:** an earlier pass framed (2) as
> **archaeology** — gear with an implied history. **Wrong target.** The
> model is NetHack consumables, which *"don't really have a history and
> don't need one… in this sense it actually is more like a slot machine,
> and I'm fine with that."* Place-history may bias a table where it is
> cheap to author; **it is not the premise.**

**Original capture note:** Named as a gap by the user (*"we need to design
foraging too, we never did that"*) while working the pharma supply chain —
and confirmed by a grep: **there is no foraging or gathering anywhere in
the codebase.** Fishing has a slate, mining has a slate; the third
gathering vertical was never written.

*(Sits above [spawn-distribution-slate](./spawn-distribution-slate.md) and beside [magic-items-slate](./magic-items-slate.md), [identification-slate](./identification-slate.md), [pharma-slate](./pharma-slate.md).)*

Related: [fishing-slate](./fishing-slate.md) (**the sibling — and the
contrast**), [mining-slate](./mining-slate.md),
[pharma-slate](./pharma-slate.md) (**the demanding consumer**),
[farming-slate](../tails/farming-slate.md) (where foraging goes when demand
outgrows the wild), [sanitation-slate](./sanitation-slate.md) (**the
boundary — scavenging is not foraging**),
[biome.md](../../subsystems/biome.md) (where things grow),
[weather.md](../../subsystems/weather.md) /
[time.md](../../subsystems/time.md) (season and conditions),
[husbandry.md](../../subsystems/husbandry.md) (**plant growth already
ships**), [perception.md](../../subsystems/perception.md) /
[advancement.md](../../subsystems/advancement.md) (**competence buys
information**).

---

> **⭐ Two consumers arrived 2026-09-03 (the farmstead design pass), and this
> slate is unchanged by either — they consume it, they do not restate it.**
>
> - farmstead plan *(retired artifact)* **D61**
>   — forage is the income that pays for *reclamation*: newly claimed ground is
>   wilderness, and **the forage declines as you clear it.** Converting a
>   foraging commons into a farm is the neolithic transition expressed as a
>   cashflow decision — *can I afford to stop gathering long enough to start
>   growing?* It also gives a reverted, derelict holding (D58) a second life,
>   because it has gone back to being forageable.
> - [hunting-slate](./hunting-slate.md) — the sibling, and the contrast that
>   sharpens this slate's best call. **Depletion is a choice, not a tragedy**
>   holds for forage precisely because a patch stays put. Game *moves*, so your
>   neighbour's hunting depletes your deer, restraint is a gift to everyone
>   else, and the commons turns tragic. **Forage teaches that depletion is a
>   decision; game teaches that some depletion decisions are not yours alone.**

---

## ⭐⭐⭐ The niche — and it is not "fishing on land"

| | Fishing | Foraging |
|---|---|---|
| **the act** | you **wait** | you **search** |
| **the skill** | doing | ⭐ **KNOWING** |
| **failure** | you catch nothing | ⭐⭐ **you are poisoned** |
| **character** | patience | **recognition** |

> **Fishing is a patience vertical. Foraging is a KNOWLEDGE vertical.**

> ⭐ **You can fish badly and still catch something. You cannot forage
> badly — you either recognise it or you do not.**

## ⭐⭐⭐⭐⭐ Where competence-buys-information becomes LETHAL

The shipped rule (`assess`: *"competence buys information, not
outcomes"*) has never had stakes attached. Here it does.

> **A novice sees "a mushroom." A competent forager sees a mushroom, and
> WHICH.**

**Misidentification is the failure mode**, and the toxin machinery already
expresses it exactly (`ToxinTag`, banded Conditions, `ToxinBehavior`).
Nothing new is needed to make a mistake real.

### ⭐⭐ And it is the same plant

> **The drug and the poison are frequently the SAME PLANT at different
> doses — and telling them apart IS the skill.**

The therapeutic window ([physiology-slate](./physiology-slate.md) § Part
7b) pushed all the way back **into the field**, before anything is even
picked. **The forager who cannot tell is the person who dies.**

---

## Where and when — all shipped

| Axis | Substrate |
|---|---|
| **where** | **biome** — what grows where is a Biome property |
| **when** | **season + weather** — ⭐ the anti-farm mechanism: *you cannot forage everything year-round* |
| **regrowth** | ⭐⭐⭐ **the houseplant build shipped plant growth** — a wild patch is a plant with a growth cycle |

**Zero new machinery for any of the three.** The third is the one that
matters most: **depletion and regrowth already have a home.**

## ⭐⭐⭐⭐ Depletion is a CHOICE, not a tragedy

The obvious model is a patch that depletes and regrows. The better one
uses the **harvest method**:

> **Take the leaves and the plant survives. Pull the root and it does
> not.**

> ⭐⭐⭐⭐ **Harvest method determines whether the patch survives** — which
> makes the commons a **visible choice** rather than a tragedy by
> default.

You can be a good steward or a bad one, **and other people can tell**,
because the patch is still there or it is not. That is the anti-grief
doctrine's **common-pool → quota** with a diegetic face, and it feeds the
wild→cultivated transition in [pharma-slate](./pharma-slate.md): **the
patch you exhausted is the reason somebody starts a farm.**

---

## What you find — and the boundary

Not only herbs: **food, fibres, dyes, fuel, fungi, resins**, and things
that were never alive — a fallen branch, a good stone.

> ⭐ **Scavenging takes what people DISCARDED. Foraging takes what the
> world GREW.**

A clean line against [sanitation-slate](./sanitation-slate.md)'s
scavenger, and the two verticals stay distinct: **one is a city vocation,
the other a wilderness one.**

## ⭐⭐⭐ The forager's real asset

> **It is not the basket. It is the map in their head.**

Knowing where a good patch is, and when it comes in, is **valuable
information you can keep, sell, or lie about.** That makes foraging a
**knowing** vocation (the *peppers* family from the lounge palette), and
it hands the [inquiry substrate](./inquiry-slate.md) a very concrete first
consumer that has nothing to do with magic.

⭐ It also means **a forager's knowledge is inheritable and teachable** —
which is a real apprenticeship and a real thing to be paid for.

## The method ladder

Sibling to fishing's *hand · rod · trap · net · spear*:

| Method | Character |
|---|---|
| **by hand** | leaves, berries — always available, sustainable |
| **knife** | cuttings, bark — skill decides whether the plant lives |
| **trowel** | roots — ⭐ **the destructive harvest**, and the valuable one |
| **basket / pack** | capacity, and **crush damage** if you overfill |
| **drying / pressing** | ⭐ the field-preservation step — the bridge to shelf life |

⭐ That last row is the one that turns foraging into a *supply chain*
rather than a gathering verb: **what you do in the first hour decides what
it is worth a week later.**

---

---

# Part 2 — the consumable table

## ⭐⭐⭐⭐ The function IS the design

**(User: *"the motivation behind the function here is that I want magic
capability to be available to people who don't have that discipline
trained for it… we also want something a little more egalitarian. some
randomness to level the playing field."*)**

> **Items are how magic reaches people who did not spend the hours.**

Not a loot system — an **access** system. Everyone can cast, competence
comes from practice, and **Tarn's Rule** caps you at your weaker leg, so
in principle magic is open and in practice it is a club. **Items are what
keep that from being true.**

> **Competence gates what you can DO. An item gates nothing.**

The wand does not make you a caster. **You are not casting at all — you
are using a thing.**

### ⭐⭐⭐⭐ Which resolves against the arcane science with no second exemption

*Shipped — [magic-items.md](../../subsystems/magic-items.md): "an item is not a new physics, it is stored labour — a maker paid earlier, and the user spends it."*

> ⭐⭐⭐⭐⭐ **Potions and scrolls are [pharma](./pharma-slate.md)'s product
> line** — made by the skilled, used by anyone, unidentifiable until
> tested. **The credence-good thesis covers the whole consumable
> category**, not just medicine. **One industry, not two.**

## Variance as an equity mechanism

The slot machine is the point, not a concession — but the reason is worth
stating:

> ⭐⭐⭐ **In a game where competence is hours practised, randomness is the
> only thing that produces UPSETS.**

**A found wand is the only way a newcomer does something a veteran
cannot** — brief inversions of a hierarchy that is otherwise strictly
monotonic in time spent.

⚠ **Guard:** if items are the only untrained access, **wealth becomes the
new gate.** The **found** channel must stay meaningful beside the
**bought** one — which random distribution plus unidentifiability handles
by itself, since **you cannot buy what nobody has and cannot price what
nobody can assess.**

## ⭐⭐⭐⭐⭐ Astrology — a subject we have never taught, and should

**(User: *"that's what was implied by 'astrology', which is a 'science'
we've never talked about pedagogically. we have full moons, I see no
reason not to use it. nethack does."*)**

> **Astrology got the sky right and the meaning wrong.**

Babylonian astronomers predicted eclipses accurately for centuries while
believing they portended the deaths of kings. **The observation was
rigorous; the inference was wrong** — a distinction most people never
learn to make.

### And here the correlation can be TRUE

Which makes it the perfect companion to the pharma lesson:

| | Pharma | Astrology |
|---|---|---|
| the belief | *this remedy works* | *the moon governs what you find* |
| the truth **here** | **false** | **true** |
| how you would tell | **records, correlation, prediction** | **the same** |

> ⭐⭐⭐⭐⭐ **Same method, opposite answer — which is exactly what teaches
> that THE METHOD is the thing that matters.**

And it stays honest: **we are not teaching that astrology works in
reality. We are teaching how you would establish whether it did.**

### ⭐⭐⭐ The mechanism guard — no second exemption

`arcane-science.md` is strict: *the postulate breaks locality, and the
moment it seems to need to break anything else, the model is wrong.* So
**the moon must not be causal.** It does not need to be:

> **Creatures active at the full moon leave things at the full moon.**

The correlation is real and **mediated by BEHAVIOUR, not physics** —
ecology, not astrology. Which yields a **better** lesson than the causal
version:

> ⭐⭐⭐⭐ **A CORRECT PREDICTION DOES NOT VALIDATE THE EXPLANATION.**

The astrologer's forecasts work; their account of *why* is wrong. **The
actual history of astrology**, arguably the most important single idea in
scientific literacy — **and it costs nothing from the impossible-thing
budget.**

⭐ **Predictability is what separates a science from a superstition**, and
a stable correlation is something you can write down and sell:

> **The almanac is where astrology becomes a product.** Observe →
> correlate → predict → publish → sell: **the scientific method as an
> economy.**

---

# Part 3 — ⭐⭐⭐⭐⭐ Where they converge: ONE EQUATION

Both halves answer the same question with the same arithmetic:

> **What is here = what has ACCUMULATED − what has been TAKEN.**

**A stock with an inflow and an outflow.** Only the inflow differs:

| | Inflow | Outflow |
|---|---|---|
| **natural** | **growth** — biome × season × weather | harvest |
| **consumables** | **deposition** — things left, over time | collection |
| **ore** | ⭐ **ZERO** — geology does not regrow | extraction |

⭐ **Mining is the limiting case** — a finite stock with no inflow, needing
no special handling. *That* is why the unification looks real rather than
merely tidy.

## ⭐⭐⭐ And it is DERIVE-ON-READ

`stock(T) = f(last known state, elapsed, inflow) − withdrawals`. Same
pattern as the body, same pattern as everything else.

> ⭐⭐⭐⭐ **Unvisited places accumulate at ZERO COST, because nothing is
> stored until someone looks.**

**Nothing spawns. Nothing ticks.** The world does not populate itself — it
**computes what is there when you arrive** — so **an unexplored continent
costs exactly nothing to have.**

## ⭐⭐⭐⭐ What the deposition rate is based on

**Traffic** and **danger**, pulling against each other: things are lost
where people go, but they are **also taken** where people go. So the peak
sits somewhere specific:

> **The richest places are where people DIED and nobody CAME BACK for
> it.**

Danger high, traffic low — computable from two derivable numbers, and
**where treasure is in every story ever told**, with no hoard authored.

### Remoteness replaces dungeon depth

> ⭐⭐⭐ **Richness is inverse to traffic. The reward for going further is
> that nobody else has been there.**

**No level gate, no tiers, no scaling** — depletion and distance do the
work. The patch near town is picked over; the wand in the deep place is
there because nobody walked that far. **One rule, both halves.**

## ⭐⭐⭐⭐ The hard constraint

> **The distribution reads the WORLD, never the PLAYER.**

Even accepting the slot machine: **a slot machine that reads you is a
RIGGED slot machine, and players detect it.** Level-scaled loot is the
fastest way to make a world stop feeling like a place — **the moment the
world reflects you, it stops existing independently.**

⭐ **Legitimate exception — SITUATION, not person.** A besieged town short
of medicine is **economics**, a property of the world. *"You are
low-level, here is a low-level wand"* is not.

## Astrology needs no special case

It is a **time-varying inflow term**. Same equation, **periodic
coefficient**, predictable — which is what makes it saleable as an
almanac.

## ⭐⭐⭐ Identification converges too

Both halves produce **unidentified things** — an unknown mushroom, an
unknown potion. **Same problem, same three answers**: *competence reads
it · testing reveals it · the published record already says.*

> **A herbalist and an alchemist are reading the same skill from opposite
> sides.**

⭐⭐⭐⭐⭐ **And the multiplayer answer NetHack cannot have**: in NetHack you
re-learn identification every run; here **the first person to identify a
thing can PUBLISH it.** Identification becomes **a communal body of
knowledge, not a per-character puzzle** — the [inquiry
substrate](./inquiry-slate.md)'s best consumer, and it turns the tedious
part of NetHack into the interesting part.

## ⭐⭐⭐⭐ Authored vs measured — and what an almanac can read

**(User: *"should that be entirely based on measurement or is any of it
authored? we could give content developers some control over the algo,
expressed how is the question. both in code and in the world. is it
readable by our almanac publisher."*)**

### Authors write the TABLE. The world computes the STOCK.

> **CHARACTER is authored. QUANTITY is measured.**

The author says *what*: **this bog yields marsh-root and old iron.** The
measurement says *how much*: **and there is a lot, because nobody comes
here.**

A far better authoring experience than tuning weights, because **an author
never has to think about balance or scarcity.** And pure measurement
cannot work anyway — **a new world has no traffic history**, so everything
would be uniformly rich or uniformly empty. **Cold start needs an authored
answer.**

### Three layers, three questions — they do not fight

| Layer | Answers | Authored? |
|---|---|---|
| **placement** | *this specific thing is here* | **fully** — the quest reward, deterministic |
| **character** | *this kind of place yields these kinds of things* | **fully** — the table |
| **stock** | *how much has accumulated* | **measured** |

**Placement is CERTAIN, character is POSSIBLE, stock is HOW MUCH.** None
is trying to answer another's question, so they compose cleanly.

### ⭐⭐⭐ The authoring unit: BIOME, with overrides

Per-room tables mean ten thousand hand-tagged rooms. **The answer already
ships twice** — `Biome`'s **outward-walking chain resolution** and Zone's
**field inheritance**:

> **Author the biome. Override the exception.**

**Ten biome tables, not ten thousand room tables** — and an override means
*this place is unusual*, which is exactly when the effort is worth
spending.

### ⭐⭐⭐⭐⭐ In the world: THE TABLE *IS* THE DESCRIPTION

> **A distribution table that is not visible in the prose is a LIE ABOUT
> THE ROOM.**

If the author says the bog yields marsh-root, **the bog must read like a
place with marsh-root in it** — otherwise you get the standard MMO failure
where the loot has nothing to do with the scenery, and **the world stops
being a world.**

Which makes the authoring **self-checking**: *you cannot write a table
without writing the place, because the description IS the interface.* And
the character layer becomes **readable by players directly** — you look,
and you can tell. **Not a spoiler: competence plus observation, which is
how foraging actually works.**

⭐⭐ **The in-world face of a deliberate BIAS** — a spot an author wants to
be good without hardcoding it — **is somebody who knows about it.** *A
person you have to meet, not a marker on a map.*

### ⭐⭐⭐⭐ The almanac: OBSERVABLE, never QUERYABLE

The answer decides whether the vocation exists at all.

> **The publisher can read the world — but only the way a player can. One
> place at a time, by going there.**

**If the stock were queryable the almanac would be a wiki dump** and the
vocation worthless. Because it is not, **an almanac is AGGREGATED
OBSERVATION**, and what you buy is somebody else's **legwork**, not
privileged access.

> ⭐⭐⭐⭐⭐ **The almanac goes STALE. That is why you buy this year's.**

A survey ages as places get picked over and traffic shifts — **a recurring
product rather than a one-time dump**, exactly as real almanacs worked.

#### The readability ladder

| Layer | How it is known |
|---|---|
| **placement** | **not knowable** — authored content, found by playing |
| **character** | **public** — it is the room description |
| **stock** | ⭐ **observable only** — go and look |
| **timing** (the astrological correlation) | ⭐ **inferable** — from many observations over time |

**Four rungs, four kinds of knowledge**: content · common knowledge ·
current observation · inferred law.

> ⭐⭐⭐ **The almanac sells the bottom two — THE SURVEY and THE LAW.**

Precisely what real almanacs sold: **tide tables** (observed) and
**planting dates** (inferred). **The vocation is not invented to fill a
gap; it is the natural shape of that information.**

### ⚠ The consumable half is DIFFERENT — the preceding section answered the foraging one

*Superseded by the code (the magic-items build, D31): the consumable table is neither authored nor global — candidates are every `Circulating` template row + live circulating thing, weighted by derived rarity × place affinity, drawn per REGION against a live census until the region is at its target, with a zone's `stocks:` / `favours:` inheriting down the zone walk exactly like a biome field. [magic-items.md](../../subsystems/magic-items.md) § *Distribution*, [residency.md](../../subsystems/residency.md) § *The sweep is a faucet*, [zone.md](../../subsystems/zone.md) § *Declared spawn fields*. Authored place-KINDS (a vault, a hoard) and the creature as a container are still open — below.*

#### ⚠ Creatures are ONE container, not the answer

**(User: *"you seemed to basically make npcs the solution to everything
which only begs the question… we don't want to only spawn on npcs, we
want to spawn in chests and on the floor and wherever else someone might
go looking."*)** **Correct — "creatures carry tables" only relocates the
question.** Kept below because a creature IS a good container; the
*algorithm* is § *The knobs*.

#### ⭐⭐⭐ The creature as a container

The user's *"locations, creatures, vessels"* — and **creatures carry their
own tables**, authored on the creature rather than on the world.

> **A thing that eats metal has metal in it.**

**Not history and needing none** — it is **behaviour**: authorable,
legible, and **still standing there.** It answers *"who was here"* with no
archaeology, because **the who IS here.**

So the consumable distribution is substantially **the distribution of
CREATURES** — and creature spawn is already in scope. **One system feeds
the other.**

#### ⭐⭐⭐ Which fixes the inflow problem

**Wands do not grow.** So what replenishes a cleared place?

> **The consumable table is not replenished by the world. It is
> replenished by things walking around with pockets.**

**Creature traffic, plus player failure** (the body nobody recovered).
Nothing else — so **a cleared ruin stays cleared until something moves
back in**, and *moving back in* is creature spawn, which the same stock
equation already covers.

And it produces a pressure nobody has to design:

> ⭐⭐⭐ **OVER-HUNTING DEPLETES LOOT, BECAUSE LOOT WALKS.**

Clear the caves and they go quiet in both senses — **an ecological
consequence with no ecology system**, giving both halves a shared
conservation logic.

#### ⭐⭐⭐⭐ So the magic almanac is a HUNTING CALENDAR

Not a loot map — *"there is a wand in that cave"* is **stock**: observable
only, and it **walks away.** What is genuinely predictable:

> **When the moon is full, the X are abroad, and the X carry Y.**

**The astrological channel with a concrete product**, and exactly what
real almanacs did for game animals.

> **The forager's almanac maps PLACES. The hunter's almanac maps TIMES.**

#### ⭐⭐ Three almanac products, aging differently

| Product | Sells | How it ages |
|---|---|---|
| **the survey** | which places yield what, how picked-over | **goes stale** |
| **the calendar** | when things are abroad | **periodic — stays true** |
| **the register** | ⭐ *the blue potion is healing* | **IMPROVES** |

> ⭐⭐⭐ **The register is the only one that gets better with age** — the
> publisher's real asset, **a back catalogue.**

**Where communal identification lands commercially**: the first person to
identify a thing publishes it, and **the register is where published
identifications accumulate.** Three revenue lines with genuinely different
economics, and **the identification game gets a business attached instead
of being a private puzzle.**

## ⭐⭐⭐⭐⭐ The knobs — what the algorithm is actually tuned on

**(User: *"when I said 'authored' and 'expressed how' it was a question
about the algorithm… different items have different properties that we may
want to weigh on."*)**

### ⭐⭐⭐ Weigh on PROPERTIES, not on items

*Shipped — weights derive from properties (the grid cell; material tags), never per item, so a new row spawns correctly the day it is authored: [magic-items.md](../../subsystems/magic-items.md) § *Distribution*. The rows below that are NOT weighed yet: `kind` · `bulk` · `fragility`.*

| Property | Effect |
|---|---|
| ⭐ **power** | the primary axis — *high-powered cannot be as common as low* |
| **kind** | potion / scroll / wand / ring / amulet class frequencies |
| **bulk** | a scroll fits in a crevice; an amulet does not |
| **fragility** | delicate things do not survive being left |
| ⚠ **value** | **do not** — value is emergent from scarcity, so weighting on it is **circular** |

### ⭐⭐⭐⭐⭐ The author's dial is the TAIL, not the mean

*(User: "try to give an ignored zone in my parcel a little more flash" —
and **"the variance is also the point"**, as an incentive to re-explore
places whose curiosity has worn off.)*

> **The tuning dial is not HOW MUCH. It is HOW SURPRISING.**

Raise the **mean** and you have made a **farm** — people come for expected
value and grind it. Raise the **tail** and you have made a **lottery**,
which is what brings someone back to a place they already know cold.

> **You return not for what is probably there, but because something might
> be.**

### ⭐⭐⭐⭐ Which splits the knobs by owner

| Knob | Owner |
|---|---|
| **rate** — is anything here at all | **the world** (traffic, depletion) |
| **mean** — typical quality | **the world** |
| ⭐ **tail** — chance of something exceptional | **the author** |
| ⭐ **breadth** — how many kinds | **the author** |

> **Authors tune the TAIL. The world owns the RATE.**

**An author literally cannot flood their zone** — the balance-sensitive
parameters are not exposed — **but they can make it worth a look**, which
is the thing they wanted.

### ⭐⭐⭐⭐ Two costs: ACCESS and CONCEALMENT

**(User correction: *"how concealed something is a vector on all three
other ones"* — and *"we probably actually want most of these things hidden
just to exercise the whole search system we built."*)**

**Concealment is a VECTOR, not a fourth container.** Two independent
costs:

| Axis | Question | Values |
|---|---|---|
| **access** | *can I get it* | floor (free) · chest (a lock) · creature (a fight) · vessel |
| ⭐ **concealment** | *do I know it is there* | the shipped `ConcealableMixin` bands |

> ⭐⭐⭐⭐ **DEFAULT TO CONCEALED. If nothing is hidden, exploration is just
> walking.**

Hiding most things is what makes exploring **an activity rather than a
traversal** — and it is why `search` exists. It also makes **perception
competence the exploration skill**, a real progression axis that is not
combat.

⭐ **Fifth instance of this session's recurring finding**: concealment is
**built and underused** (`ConcealableMixin`, `search`, the awareness
Discipline, honest-fog seams).

> **The container is the price. So the good stuff is not gated by your
> LEVEL — it is gated by EFFORT YOU CHOOSE TO SPEND.**

### ⭐⭐⭐⭐ Thematic continuity: the tag library IS the magic grid

*Superseded by § *The overlap splits cleanly — TWO tag sets* (below, shipped): place affinity rides `materialTags` (`paper`, `vellum`, `stone`, `wood`…) matched against a zone's `favours`, not the grid's thirteen nouns; the grid cell weighs rarity instead. [residency.md](../../subsystems/residency.md) § *Zone fields the spawn sweep reads*.*

#### ⭐⭐⭐⭐⭐ And it works BECAUSE it is unexplained

*Superseded by § *Which refines the continuity answer* below and by the code: the shipped place affinity is MATERIAL-based and causal (a mine stocks metal), so no unexplained affinity exists to defend. The celestial half of the argument lives on in § *Astrology*.*

#### ⭐⭐⭐⭐ Tag with the VERB too — the grid cell is the power estimate

*Shipped — spawn weight is the inverse of stored labour read off the grid cell; there is no authored rarity table anywhere: [magic-items.md](../../subsystems/magic-items.md) § *Distribution* (*"Rarity derives; there is no authored rarity table"*).*

#### The overlap splits cleanly — TWO tag sets

*Shipped exactly so — effect cells weigh RARITY (`PriceList.spawnWeightFor`, the most expensive cell for multi-effect items), `Circulating.materialTags` weigh PLACE AFFINITY against a zone's `favours`: [magic-items.md](../../subsystems/magic-items.md) § *Distribution*, [residency.md](../../subsystems/residency.md) § *Zone fields the spawn sweep reads*, `lib/residency/SpawnTable.ts`.*

#### ⭐⭐⭐ Which refines the continuity answer — in a good direction

Material affinity turns out to be **causally motivated**: a potion made
from local herbs is common locally **because that is where it is made.**
So there are now **two regularities of different kinds**:

| Regularity | Mechanism |
|---|---|
| **material affinity** | ⭐ **real and knowable** — local production |
| **celestial timing** | **real and unexplained** — behaviour, misattributed |

> **One regularity has a cause. One does not. LEARNING WHICH IS WHICH IS
> THE SCIENCE.**

**Better pedagogy than "everything is mysterious"**, and exactly the
discrimination a real researcher must make. It also means the affinity is
**not hand-waved**: for anything with a botanical or mineral source, **the
tag is simply telling the truth about the supply chain.**

⭐ **Residual work is annotation, not authoring** — two small closed
vocabularies (a grid cell, a material list), both of which an item
**already has to declare for other reasons.**

### ⭐⭐⭐⭐ Author vs world — ONE rule covers all of it

> **AUTHORS DESCRIBE. THE WORLD WEIGHS.**

| | Author | World |
|---|---|---|
| the tag library | — | **closed — it is the grid** |
| **item tags** | ⭐ **yes** — it is what the thing *is* | — |
| **place tags** | ⭐ **yes** — inherits from biome | — |
| **affinity strength** | — | ⭐ **global constant** |
| **the tail / breadth** | ⭐ **yes**, on land you hold title to | — |
| **rate / mean** | — | traffic and depletion |
| **placement** | ⭐ **yes** — the quest reward | — |

⚠ **The critical row is affinity strength**: if authors set it they would
crank it and **their zone becomes deterministic.** *Authors say what things
ARE; the world decides how much that matters.* Same shape as **authors
write the table, the world computes the stock** and **authors tune the
tail, the world owns the rate.**

⭐ **And tuning is parcel-scoped**: `ParcelApi.ownerOf` + `AccessApi.can`,
no new permission model — **self-limiting by construction.** *You can tune
your own corner; nobody can tune the world.*

### ⭐⭐⭐⭐ Which dissolves the continuity worry properly

An earlier pass here reached for **archaeology**. Wrong instinct:

> **Continuity does not require HISTORY. It requires RULES THE WORLD
> OBEYS.**

A wand in a locked chest, far from town, in a `fire`-tagged place at the
full moon **is not arbitrary — it is what the rules say should be there.**
A player who learns *"good things sit behind locks, far out, on certain
nights, and match the country"* has learned **something true about the
world.**

> **What I wanted was not narrative. It was LEGIBILITY.** The world feels
> real when its distribution is **learnable**, not when it is
> **explained.**

## How far it extends

| In scope | Why |
|---|---|
| **natural foraging** | growth inflow |
| **consumables / loot** | deposition inflow |
| **creature spawn** | already [spawn-distribution](./spawn-distribution-slate.md)'s consumer |
| **ore & minerals** | the **zero-inflow limiting case** |

| Out of scope | Why |
|---|---|
| **crafted goods** | **the economy makes those** |
| **NPC minting** | the labour market does that |
| **weather** | already a stateless procedural field |

> **The substrate covers what the WORLD provides. The economy covers what
> PEOPLE make.**

---

## Open questions (for requirements)

1. **Is a patch a Stuff or a room property?** *Leans Stuff* — the
   houseplant substrate already models a growing plant, and a patch you
   can look at, damage and return to is worth more than a room flag.
2. **How is misidentification surfaced?** ⚠ The honest version is that
   **you are not told** — you pick it, and you find out. That is accurate
   and it is also the cruellest option in the slate. *Leans: the
   competence read is offered before the act, and ignoring it is on you.*
3. **Does the world remember who exhausted a patch?** The stewardship
   payoff needs it; the surveillance implication needs care. *Leans: the
   patch's state is public, the culprit is not — unless somebody saw.*
4. **Season length at 12×.** Same tuning family as everything else on the
   clock; a season nobody experiences twice is not a season.
5. **Does foraging want its own verb**, or is it `search` (shipped, from
   the concealment build) pointed at flora? *Leans a distinct verb* — the
   act is diegetic and the confusion with hidden-object search would be
   real.
6. **What actually measures TRAFFIC?** The whole remoteness model rests on
   it. Visit counts are the obvious answer and also a surveillance
   surface; distance-from-settlement is cheaper and coarser. *Leans
   distance first, traffic later.*
7. **Is the stock stored per-place, or purely derived?** Purely derived is
   cheaper and matches the doctrine, but **withdrawals have to be recorded
   somewhere** — probably a last-harvested stamp per site.
8. **Do consumables deplete a shared world stock, or a per-site one?**
   Per-site is simpler; a shared stock would let the world genuinely run
   short of something, which is more interesting and much harder.
9. **How is the astrological correlation surfaced to players at all?**
   ⭐ *Leans: it isn't* — you observe it, or you buy an almanac from
   somebody who did. **The pedagogy dies the moment the game tells you.**
10. **Can an author pin a floor on stock** (*"there is always at least
    one here"*), or only place specific objects? *Leans: placement only* —
    a floor is a balance dial, and balance is what the measured layer
    exists to avoid.
11. **Does the biome table inherit ADDITIVELY or by override?** Zone field
    inheritance is override-shaped; a bog inside a marsh probably wants
    *both* tables. **Worth deciding before authoring starts.**

## ⭐ A first forage act, designed and withdrawn (fishing, 2026-09-21)

The fishing build shipped `dig [<ground>] [with <trowel>]` — two game
minutes on your hands, then a worm, and the ground has a little less in
it — and withdrew it in review: digging something out of the ground for
food or use is not a fishing concern, it is this slate's. What it settled
is worth keeping:

- **The ground's own ledger is the cooldown.** The yield drew on the
  soil's `organicMatter` reserve (`Soil.drawOrganicMatter`, the twin of
  `drawNutrient`); a bed dug over every morning gives less, a worked-out
  one gives nothing and says so. No new state — the *decline as you take*
  rule this slate already wants, on a ledger the soil already keeps.
- **The instrument affords the verb** (`digging` — the farming spade and
  the mining shovel already claim it); **the ground is the argument**
  (`requires: [CultivableMixin]`); **what comes up is the ground's to
  say** — and that last part is the missing piece: the yield was
  hard-coded to a fishing worm, which is why it could not stay. The
  biome-authored distribution table (§ open 11) is what makes `dig` a
  forage verb rather than a fishing one.

The controller and view are in the branch history at MR !268
(`packages/content/trade-fishing/…/DigController.ts`, cut in review) if
the shape is wanted back.

