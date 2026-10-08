# Drilling — requirements

**Kind:** feature
**Leads from:** content — the new acts, the wellhead and the rows are the
build; the one kernel-side touch is the ground column learning to hold a
**fluid** body and a **pressure** that falls as it is drawn.

Drilling is the realm's first extraction that **does not expand the map**.
Every act shipped so far makes place — a working, a heading, a quarry
floor, a carved cell you stand in — and the void *is* the product's
address. A borehole is too narrow to enter and what comes out comes up a
pipe. That single difference carries the build: the survey becomes the
game (you cannot walk to the thing and look at it), the dry hole becomes
honest (the world decided before you asked), and the cost becomes a
**payroll** paid before anybody knows anything.

It ships in three stages against three products, because the hole is one
technique and only the containment and the failure differ: **brine**
(the medieval rung, feeding a saltern that already stands), **gas** (no
lift, no pump — a sealed vessel is the whole capital story), and **oil**
(the barrel, and the reason the vertical exists: a lamp with no
producer).

Seeded by [drilling-slate](../slates/builds/drilling-slate.md) (designed
2026-10-08), the [RGO spine](../slates/tails/field-substrate-slate.md),
and [pump-slate](../slates/builds/pump-slate.md) — which is **not** a
prerequisite.

## What already exists

**Verbs a player already has.** The mining five (`hew` · `drive`/`drift` ·
`sink` · `raise` · `shore`) plus `stake` (*"Stake a mining claim on the
ground you are standing over"*) and `assay`. ⭐⭐ And `drain` — *"Draw the
gas out of a working into a sealed vessel"* — which is **already the gas
wellhead act**. For reading ground: `survey`, `measure`, `analyze`,
`readings`, `sample`. For fluid: `fill`, `pour`, `spill`, `boil`. For
moving product: `ship`, `journey`, `hitch`/`unhitch`. For drawing a yield
off a reservoir into a vessel: `tap`.
⛔ **Absent:** `bore`, `drill`, `bail`, `spud`, `plug`, `cap`.

**Trades holding the ground.** Quarrying ⭐ **already owns salt** — a
solar salt pan (weeks, and rain sets it back), a brine hearth that boils
it down in an afternoon on bought fuel, the evaporative profile, and the
line that matters: *salt's three sources are three genuinely different
cost structures.* The base library ships `salt-water` and **`halite` —
described in its own row as "rock salt, the third of salt's three
sources."** Fuel ships lamp oil, the retort, the condenser, the
gasometer, coke, the tars and **coal gas**. Haulage ships the carrier,
the depot, the bill of lading and the teamster's wage. Mining ships the
claim register, the survey instruments and four reading channels.

**Disciplines.** ⭐⭐ **No new one is needed.** `geology` already reads
*"Reading ground… improves by measuring and by cutting; it changes what
you can work out, never what the rock holds."* `physics` already owns
*"**pressure**, density, weight, current, the head on a water course."*
`chemistry` already owns *"the salts in a water."* `teamstering` hauls
it, `leatherwork` makes the seal and the foot valve.

**The place.** Rejection is the realm's mining town: inland, high, with
the only deposit row in the world, a claim register, the instruments, a
smelter, a fuel yard and a labour pool to hire from.

> **Therefore what is genuinely new here is the borehole itself — a POINT
> that yields without becoming a place.** An extraction that adds no room
> to the world's shape, whose stock is a seeded deep body with an
> **unreadable** second factor, whose product must be lifted up a pipe
> into containment at a wellhead, and whose act is **bought rather than
> performed**. Everything else it needs — the salt chain, the ground
> reading, the sealed gas draw, the gas goods, fractionation, haulage,
> the leather seal — already ships.

## Goals

- A person can **find** likely ground without being able to walk to it:
  free surface evidence (a spring, a seep) plus a paid, instrumented
  structural read whose confidence **narrows with skill and widens with
  depth**.
- A person can **sink a bore** as a durative work programme — raise a
  derrick, cut, clear the hole, line it — that accumulates **depth** and
  takes **weeks of wages**, and can fail in ways that cost the hole.
- A **dry hole is possible, survivable and informative.** It costs the
  payroll, it is never a coin flip, and it leaves a record worth having.
- A person can **lift brine** from an inland bore, boil it at a hearth
  that already stands, and sell **salt where there is no sea** — a
  complete trade before anything petroleum exists.
- A person can **take gas off a bore into a sealed vessel** and burn it
  under their own brine hearth, so the hearth leaves the fuel contest it
  currently competes in.
- A person can **produce oil**, watch the well's pressure fall, decide
  when to stop paying for it, and get the product into casks and onto a
  carrier.
- A refiner can **split a barrel** and discover that most of it has no
  buyer — and must **store, dump or burn** the remainder, each with a
  consequence somebody else can notice.
- An **owner who hires a crew still learns something**: the siting is
  their act and the dry hole is their answer, so judgment under
  uncertainty is credited to them while the labour is credited to the
  crew.
- A **second well needs no new code** — one more bore is a row and a
  place.

## Non-goals

- **The pump.** → [pump-slate](../slates/builds/pump-slate.md), its own
  build. The rung below it — **bailing** — is in scope and is what makes
  a well produce here; the pump arrives later as a throughput upgrade.
- **The pipeline, and the teamster trade it would obsolete.** → the
  logistics/freight slates and a later pass. Barrels on wagons is the
  shipped answer, and *an investment that destroys a vocation whose
  practitioners have standing* deserves its own pricing rather than a
  footnote here.
- **Vehicles and anything that burns gasoline.** → nowhere in this
  build, deliberately: gasoline having **no** buyer is the lesson, not a
  gap.
- **Lubricants and paved roads.** → their own builds (machine wear;
  logistics). Two more fractions with no consumer, and authoring demand
  ahead of supply is the circularity we have refused elsewhere.
- **Secondary recovery** (water or gas injection to lift a tired field).
  → the drilling slate's own tail. Primary recovery is a fraction of a
  reservoir and that is honest.
- **The discovery loop** — understanding *why* a lift has a ceiling.
  → [inquiry-slate](../slates/builds/inquiry-slate.md), where the suction
  limit is recorded as a candidate first case.
- **A new Discipline.** → nowhere, deliberately: `geology`, `physics`,
  `chemistry` and `leatherwork` already cover every skill exercised.
- **A second salt venue.** → whoever wants one; it must need zero code.

## Placement

**A trade pack of its own, holding the TECHNIQUE — and the products stay
with the trades that already own them.**

| what | whose |
|---|---|
| the bore, the derrick, the lift, the wellhead, the log, the deep body | **drilling**, a new trade pack with its own namespace root |
| **salt** and the saltern it feeds | **quarrying**, which already owns all three of salt's sources |
| **gas** and **oil**, the casks, the fractions, the disposal | **fuel**, which already owns lamp oil, the retort and the gasometer |
| the column learning to hold a fluid body and a falling pressure | the **ground** system |
| hauling the product | **haulage**, unchanged |

⭐ That split is the metal chain's own precedent (mining · fuel ·
smelting) and it follows *trade = mechanism*: drilling ships **the hole**,
and a hole is not a product. ⭐ The second-instance test passes — a second
well, or a second well town, is rows and a place.

## Collisions

- ⚠⚠ **`casing` is already sausage casing** (a material, a thing and a
  recipe in cooking). Well casing needs a different word; product-level
  it is *the pipe that holds the hole open*, and **`liner`** is the
  proposal.
- ⚠ **`sink` cannot be reused.** It means *mint the next room downward in
  this warren, climbable* — it takes no arguments, binds on the room you
  stand in and requires a live mine working. A borehole mints nothing.
  ⭐ **`bore`** is free, with **`drill`** as its alias — the shipped
  pattern (`drive`/`drift`) exists precisely because one verb across two
  mechanisms cost somebody a build.
- ⚠ **`pump` is taken by the forge bellows.** Out of scope here (no pump
  in this build) but it is the pump build's first problem, and the lean
  is to unify rather than coin a word: air is a fluid.
- **Rejection** is where this lands, and it is somebody's town already —
  a claim register, four businesses, a fuel yard, a smelter, the Hanging
  Wood above it. A bore goes **on staked ground**, through the register
  that already exists, and the crew is hired out of the pool that is
  already there.
- **The salt house at the Estuary** keeps its trade: it is coastal, it
  boils sea brine, and its own row says *salt ships as a GOOD in this
  build, not as a trade.* An inland well **competes** with it over
  cartage rather than replacing it, which is the point.
- **The brine hearth** gains a second fuel (gas) and keeps the first
  (cordwood), so the wood contest it names is relieved, not deleted.
- **The lamp** finally gets a producer; the **candle** gains a third wax.
  Neither changes shape.

## Surface decisions

### The survey has two factors and only one is readable
**Structure** — is there a trap — reads off the surface with a confidence
that **widens with depth** and narrows with skill. **Charge** — is the
trap full — has **no channel at all**: nothing but the hole answers it.
So a better instrument, a better surveyor and a better theory all sharpen
the structure and never touch the charge, and **the dry hole survives any
amount of improvement.** The free counter-signal is a **seep** (or, for
brine, a **salt spring**): visible to anybody, non-quantitative, evidence
that there is something in this country — and no guide to where. You need
both and neither is sufficient.

### Nothing rolls, ever
Both factors were fixed before anyone looked. A player's ignorance is
**what they have not measured**, never what the world has not decided.

### The act is bought, not performed
A bore cannot be sunk alone, and modelling that as *collaboration* would
gate the content on who is online. It is a **payroll**: the crew may be
hired NPCs, and the capital shape the slate names — *the whole cost paid
before you know anything* — **is** the wages.

### A bought act has two acts, so credit splits
The **owner** earns the ground-reading competence: siting the bore is an
act, and eating the dry hole is its answer. The **crew** earns the labour
credit for the beam, the bailer and the liner. ⭐ The owner earns the skill
they **used**, never the skill they **bought** — so capital is not a route
to competence, and an investor is neither learning nothing nor being
handed the crew's craft.

### A well declines along a curve; nothing announces it
No depletion notice ever fires. Pressure is a reading that falls, and the
decision is **when to stop paying** — flowing, then bailed, then barely
worth the wage, then abandoned. An abandoned bore is a **liability**: it
does not stop leaking because you stopped caring.

### The barrel is mostly waste, and that is the content
Two fractions have buyers (kerosene → lamps; paraffin → candles) and
three do not (lubricant, asphalt, gasoline). **You cannot choose to make
only the saleable one** — draw a crude and the light ends come out
regardless. So the refinery's margin is *the fraction it can sell minus
the cost of getting rid of the rest*, and the remainder must be stored
(it burns), dumped (it poisons a reach, with no sensory tell) or flared.

### Who owns a body that spans two holdings
Not decided in code. The world ships **one reservoir under two
holdings** and the fact that draining is competitive; what the polity
does about that is the polity's, and it has courts.

### Brine first, and why a mountain
The first bore is for **salt**, not oil: it sells into demand that
already exists (curing, hide-salting) from ground that has none, so the
first driller is not betting a fortune on a substance nobody can use.
⭐ And mountain salt is the canonical case, not an oddity — the great
European salt towns are *named* for it, on uplifted evaporite beds at
altitude.

## Lens pass

Seven, per `docs/design-lenses.md`.

**1 · Pedagogy.** `geology` (the structural read, improving by measuring),
`physics` (pressure, and the head on a column), `chemistry` (the salts in
a water). ⭐ What is **derivable**: that a trap can be read and a charge
cannot, that a reservoir with no recharge declines under withdrawal, and
that **joint production is not a menu** — the fractions arrive together
whether you want them or not. The lesson nobody authors: *the same fluid
is one well's product and another's poison*, since the brine that is
money at a salt bore is a disposal cost at an oil one.

**2 · Creative expression.** Ordinary case with no code: a bore is a row
and a place. Bespoke without breaking: the column's authored structure
takes a **pin over a lean over the procedural value**, so an author
places an exact body where a quest needs one and gets the whole field
free everywhere else. ⭐ Supply-chain depth is here in quantity — one hole
feeds salt, gas, lamps, candles and a disposal problem.

**3a · Immersion.** The hole is not a room, and nothing pretends it is.
A seep is visible, a derrick is a structure you raise from timber, a
bailer comes up wet. ⚠ The one thing that must not betray itself: the
survey's confidence has to **read** as a bracket, not as a number with a
lie in it.

**3b · Participation.** ⭐⭐ The first RGO whose act is **somebody else's**
— it needs a payroll, so it needs a firm, a partnership, or a crew with
a wage to argue about. *Can the polity do something we did not want?*
Yes: tax the bore, licence it, condition a claim on capping it, or refuse
a neighbour the right to drain the body under both their holdings.

**4 · Values.** Two questions with no derivable answer, both decided
here: **who earns the competence** when the work is bought (answered:
the act each party actually performed), and **what is owed for an
abandoned hole** (left to the polity, deliberately). The gauge that
converts the undecidable into the calculable is the **pressure reading**
— it makes depletion arguable in numbers.

**5 · Continuity.** The technique survives every epoch: percussion on a
cable, then rotary, then whatever comes after; muscle, then animal, then
water, then steam. ⭐ The test passes — the new object answers the same
commands, and only the depth, the rate and the attendance change.

**6 · Economy.** **Produces** salt, gas, oil, and three fractions nobody
buys. **Consumes** timber (the derrick), leather (the bailer's valve),
wages, and the fuel the hearth burns. **Who pays:** the bore's owner,
in advance, before the answer is known. **Was the demand there first?**
⭐⭐ Yes, three times without anything authored for it: a lamp with no
producer, a candle generalised over its wax, and a saltern standing on the
wrong side of the realm from the food that needs salt.

**7 · Governance.** It judges nobody. It creates **duties**: the
uncapped hole, and the body under two holdings. **Criterion** is
dependence and damage; **appeal** is the courts, which ship;
**entrenchment** is the polity's tier, not the code's.

## The drive

What a person does, in order, in the live game. Rejection unless said
otherwise.

**Stage A — brine**

1. Stand in Rejection and `survey`. See the place reported, including
   that there is a **salt spring** on it.
2. `analyze ground`. See a bracketed read of the column, **including a
   salt band at depth**, with the bracket visibly wider the deeper it
   reports.
3. `measure strike` and `measure dip` with the surveyor's instrument.
   See two numbers tighter than the eye's, and the bracket narrow.
4. `stake` a claim over the ground. See it in the register that already
   exists.
5. Raise a **derrick** on the claim from timber. See it standing.
6. Hire a **crew** — see wages owed, and a shift running.
7. `bore`. See a durative programme start, depth accumulate, and the
   work continue across sessions while the crew is paid.
8. `bail`. See cuttings and water come out, the hole deepen on the next
   cut, and **the log gain a line**.
9. Line the hole. See water stop coming in from above.
10. Reach the salt band. See **brine**, not salt.
11. `bail` brine and `fill` a vessel with it.
12. Carry it to the **brine hearth** and `boil`. Get **salt**, and see the
    hearth consume fuel to do it.
13. Sell the salt, or `salt-cure` with it. See a buyer who is not at the
    estuary.

**Stage B — gas**

14. `bore` a second hole, deeper. Reach gas instead of brine.
15. `drain` the gas into a **sealed vessel**. See it refuse an unsealed
    one, in words that name the reason.
16. Feed the **brine hearth** from the gas rather than from cordwood. See
    the hearth run, and the cordwood untouched.

**Stage C — oil**

17. Find a **seep** elsewhere. `bore` there, on the structure the survey
    picked.
18. **Hit nothing.** See a dry hole: the payroll spent, the hole
    abandoned, and **the log still worth keeping**.
19. `bore` on a second structure. Hit **oil**. See it flow without a
    lift.
20. `fill` casks. `ship` them to Terminus with a bill of lading.
21. `measure pressure` at the wellhead across several visits. See it
    **fall**, with nothing announcing anything.
22. When flow stops, `bail` to keep producing. See a worse rate for the
    same wage, and decide whether to keep paying.
23. Split a barrel. See **kerosene**, **paraffin wax**, and three
    fractions with **no buyer named anywhere**.
24. Put kerosene in a **street lamp** and light it.
25. Dip a **candle** in the paraffin. See a candle that is not tallow and
    not beeswax.
26. Try to sell the gasoline. See that nobody is buying.
27. Store it — see a fire risk. Or dump it in the reach — see the water
    carry it downstream with **no sensory tell**. Or flare it — see it
    burn for nothing, brightly.
28. Walk away from the abandoned hole. See that it is still a liability
    somebody can name.

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player standing on likely ground can tell there is **something in
   this country** from free evidence alone, and cannot tell **where to
   bore** from it.
2. A player with a better instrument, or more practice, gets a
   **narrower** structural bracket on the same ground — and never any
   read at all on whether the body is charged.
3. A player can sink a bore to depth, and the work takes **wages over
   time**, not a single act.
4. A player who bores a dry hole loses the payroll, is told something
   informative, and **keeps a record** that is worth something later.
5. A player can carry brine from an inland bore to a hearth and come away
   with salt, and sell it to somebody who is not next to the sea.
6. A player can run a brine hearth on gas from their own bore, and the
   cordwood they used to buy stays unbought.
7. A player can produce oil, see the pressure fall over repeated visits,
   and **choose** when to stop paying the crew — with nothing having told
   them to.
8. A player can get kerosene into a lamp and paraffin into a candle, by
   their own hand, starting from a hole in the ground.
9. A player who splits a barrel is **left holding something nobody will
   buy**, and every way of getting rid of it is visible to somebody else.
10. An owner who never touches the beam still advances their ground
    reading; a hired hand who never chose the site still advances their
    labour.
11. A second bore, anywhere, requires **no new code** — and a second well
    town requires no new pack.
12. Nothing in any of the above changes if the same bore is sunk twice in
    two different worlds from the same seed: the ground gave the same
    answer before anybody asked.

## Cross-references

- **Seeding slates:** [drilling](../slates/builds/drilling-slate.md) ·
  [pump](../slates/builds/pump-slate.md) (not a prerequisite) ·
  [rgo-unification](../slates/builds/rgo-unification-slate.md) ·
  [field-substrate](../slates/tails/field-substrate-slate.md) (the RGO
  spine, and the act/credit legs) ·
  [mining](../slates/builds/mining-slate.md) ·
  [destructive-distillation](../slates/builds/destructive-distillation-slate.md)
  (Stage A shipped; the gas economy this inherits)
- **Subsystem docs:** ground · mining · bulk · fractionation · taps (the
  RGO law) · fire · thermal · watershed · logistics · energy ·
  instrumentation · location-graph (⭐ a point must add no node) ·
  quantities (a pressure channel) · activity (the durative programme) ·
  employment (the crew) · provenance
- **Related requirements in flight:** none.
