# Freight & transport slate — moving goods as an industry

**Captured 2026-07-31**, out of the build-2 stewardship/farming thread.
As husbandry, farming and the other production systems scale, goods
have to *get somewhere*: a rancher's steer to the slaughterhouse, then
refrigerated to butchers and markets. Same for every producer.

> **Status: direction set, nothing built.** Much of the substrate
> already ships; this slate names the industry, resolves the
> vehicle-in-a-room and TPA questions, and records the two live
> defects the conversation surfaced.

**Sibling, not overlap:** [delivery-slate](./delivery-slate.md) owns
**small addressed items to fixed addresses** (mail, parcels, utilities,
the aether line) and contributes one `delivers` brain. This slate owns
**bulk goods between businesses** — vehicles, operators, routes, and the
market that pays for them. The two are separated by **capacity**, which
is the same line that answers the TPA question below.

Related: [conveyance.md](../../subsystems/conveyance.md),
[locomotion.md](../../subsystems/locomotion.md),
[locomotion-as-activity-slate](../tails/locomotion-as-activity-slate.md)
(deferred — **this slate is what pulls it**),
[fasttravel.md](../../subsystems/fasttravel.md),
[address.md](../../subsystems/address.md),
[encumbrance.md](../../subsystems/encumbrance.md),
[thermal.md](../../subsystems/thermal.md),
[contract.md](../../subsystems/contract.md),
[chattel.md](../../subsystems/chattel.md),
[ranching-slate](./ranching-slate.md),
[farming-slate](./farming-slate.md),
[policing-slate](./policing-slate.md),
[map-slate](./map-slate.md).

## Why the industry exists at all

**Transport exists because production and consumption happen in
different places.** So the industry's size is a direct function of how
much **spatial specialization** the production builds create. If
everything is made where it is used, there is no freight.

Which makes the payoff one of the great pedagogical objects:

> ⭐ **von Thünen's rings.** Land use organizes around a market by the
> ratio of **transport cost to land rent** — perishable, heavy, bulky
> goods locate near the market; durable, light, valuable goods locate
> far.

That is 1826 economics, and a world with honest geography and honest
transport cost will **generate** it rather than teach it. The closed
land-use vocabulary on `ParcelRecord` is what it expresses itself
through. **Nobody has to author the rings.**

## Live cargo walks; dead cargo rides

The steer is the marquee case, and it is historically exact.

| Stage | Regime | Costs |
|---|---|---|
| **live steer** | **self-transporting** — it walks | droving labor, feed, water, **shrinkage** (weight lost en route) |
| **carcass / meat** | **carried** | vehicle capacity, and **it spoils** |

So the same good has **two transport regimes depending on where it is
in the chain**, and that alone generates the industry's structure —
drovers and teamsters as two distinct vocations, and a cattle drive as
real content.

> **Where the slaughterhouse *lands* is a zoning fight, not just an
> economic one** — see [zoning-slate](./zoning-slate.md) § *The
> stockyard is the first zoning fight*: the same problem has two
> playable solutions, one technological (refrigeration moves it) and
> one political (the city zones it out).

### ⭐ The marquee: refrigeration relocates an industry

Slaughter happens **as close to the consumer as preservation technology
allows**. That is precisely why Chicago existed, and why Swift's
refrigerated car **moved the slaughterhouse** off the butcher's block
and into the central packing house.

Introduce refrigerated transport into a world that models thermal decay
honestly and **an industry relocates itself.** `ThermalMixin` already
does Newton cooling and the thermos exists; spoilage is designed in the
preservation thread. **A refrigerated wagon is a thermal container on
wheels**, and the market shift is emergent — players feel it as prices
and jobs moving, not as an announcement.

## The vehicle-in-a-room question

### Pedestrians stay synchronous; vehicles become durative

> **Pedestrian movement stays synchronous. Vehicular movement becomes a
> durable activity.**

This is **the home the locomotion-as-activity slate has been waiting
for.** It was deferred because *"game responsiveness is a selling
point"* and nothing pulled hard enough — but the trigger it names for
itself is *"long-corridor traversal with mid-traversal
observability,"* which is a freight journey exactly. **Walking one room
is a step; driving a wagon to the next town is a journey.**

So they **do not share a cadence**, which dissolves the tension:

- the **command bus** issues the *order* — `drive to
  Terminus/Market/Butcher's Row`;
- the **scheduler** advances the journey **room by room**, at a rate set
  by mode speed + exit cost + load;
- the driver stays **interactive** throughout — the engagement occupies
  a *slot*, not the player.

And it buys **observability**: the wagon is physically present in each
room as it passes, so a busy trade road is *visibly* busy — which is
what makes interception possible **without an interception system**.

#### ⭐⭐⭐⭐ The invariant this actually protects: no economic rate may be wall-clock

**Added 2026-08-05.**

> **User: "nothing in this economy can be based on how fast you're able to
> get commands processed over the wire and inside the event loop… encumbrance
> is one constraint we already have, but time is a different beast."**

Stated as the rule:

> ⭐⭐⭐⭐ **NO ECONOMIC ENTITLEMENT MAY DEPEND ON THE RATE AT WHICH A
> MEMBER'S COMMANDS ARE PROCESSED.** Latency may cost convenience. It may
> never cost output.

## ⭐⭐ Audited: every production system already complies — except movement

| system | what meters it | wall-clock? |
|---|---|---|
| foraging / consumables / ore | ⭐ a **stock with an inflow**, derive-on-read | ✅ no — hammering the verb gets nothing |
| growing · fermenting · aging | the **game clock** | ✅ no |
| crafting | **inputs** — you can only craft what you hold | ✅ effectively no |
| metabolism · thermal · husbandry | reconcile-on-read on game-time | ✅ no |
| ⚠ **carrying things** | **encumbrance — a CAPACITY, not a RATE** | ⚠ **yes** |

> ⭐⭐⭐ **Encumbrance meters WHAT you can carry. Nothing meters HOW OFTEN.**
> That is the entire hole, and it is why logistics is the one that stands
> out — movement produces nothing, so there is no stock to deplete and time
> is the only cost.

## Why the design already closes it, and closes it exactly far enough

The two halves compose:

- **The durative journey removes wall-clock from the bulk path entirely** —
  the command bus issues the *order*, the scheduler advances the legs at
  *mode speed + exit cost + **load***. Typing faster does not arrive sooner.
- ⭐⭐ **Encumbrance caps the synchronous path's advantage.** Pedestrian
  movement stays real-time deliberately (*"game responsiveness is a selling
  point"*), but a back is ~20 kg and a wagon is ~500 kg — **so a fast typer
  shuttling packs can never reach commercial scale.**

> ⭐⭐⭐ **Capacity bounds the leak; duration removes it at scale.** The
> economy is never throughput-priced where it matters, and the residue is
> physics rather than an oversight.

## ⚠⚠ The legal implication: this one CANNOT be a statute

[balance-slate](./balance-slate.md)'s doctrine is *a statute is a constraint
on a **meter***. Here there is no meter:

> **The polity cannot legislate ping.** It can constrain what it can
> measure, and it can never measure a member's connection.

> ⭐⭐⭐⭐ **So the corollary to the meter doctrine is: WHAT THE POLITY CANNOT
> MEASURE, THE KERNEL MUST FORECLOSE.** This belongs in the floor, not in the
> Schedule — it is not a dial and no community may turn it off.

⭐ **The commercial half is already forbidden and needs nothing new**: selling
priority is **money buying advantage**, which is Art. I §2 — an *eternity*
clause. **An operator may not sell latency.**

⚠ **The non-commercial half is what needs the kernel rule.** A member with a
better connection was sold nothing, so the firewall does not reach them —
and no law can. **That is precisely why the engine has to hold the line the
law structurally cannot**, and why the invariant is worth stating as a rule
rather than leaving as an emergent property of good design.

⚠ **This is a rule about FORMULAS, not about telemetry** — measuring latency
is fine and already ships. What may be *published*, and in what form, is
[connection-quality-slate](../tails/connection-quality-slate.md); it
cross-cuts, so it lives with connection rather than here.

## ⭐ The road network is emergent, not authored

**You do not author roads.** You author **which exits admit `wheeled`
traffic**, and the road network is the induced subgraph. `passageMode`
already exists on the haulage side and exits already mode-gate.

Routes therefore exist because **not every exit takes a wagon** — which
is exactly how freight works in life (bridge weights, low clearances,
truck routes). **Costs nothing new.**

### The one real dependency

**Per-location extent override.** A 3 m default cell cannot hold an 8 m
truck *and* pedestrians. This is the **same dependency the
[ranged slate](./ranged-slate.md) already named** for its distance
bands — and [zoning-slate](./zoning-slate.md) needs it a third time for
**outdoor parcel acreage** (one room *is* a field of N acres).

> ⭐ **Three unrelated threads converging on one small field is as
> strong a build signal as exists.** Size and build it **once, early.**

## Navigation

- **Pathfinding must be mode-parameterized** — the graph is
  per-vehicle-class, which falls out of the emergent road network above.
- **Routing is knowledge-gated**, per the
  [instrumentation slate](./instrumentation-slate.md)'s thesis (*you are
  as good as your toolkit*): **routing to somewhere you know or that is
  on your map works; routing through unknown territory does not.** Which
  makes **cartography a discipline and maps a tradeable good** — both
  historically true, both good content, and it gives
  [map-slate](./map-slate.md)'s data a diegetic gate.
- **Competence buys information, not outcomes** — the standing rule. A
  skilled navigator sees better **ETAs, spoilage margins, and capacity
  fits**; they do not drive faster. Same readout ladder as the gun and
  `analyze`.

## Topology — freight is NOT hub-and-spoke (but it becomes it)

**(Out of the utilities pass: *"utilities are built on a hub-and-spoke
system — is freight the same?"*)** No, and being precise about why
changes what gets built.

### Utilities are trees rooted at a source

Not really hub-and-spoke: water runs plant → trunk mains →
distribution → service lines; **sewer is the *inverted* tree** (many
sources converging on one outfall); power is a hybrid, **meshed at
transmission, radial at distribution.** What they share:

> **A utility network has a source, and the substance flows one way.**
> Direction is *intrinsic* — water does not run backwards up a main.

### Freight is a categorically different object

- **No source** — every node is both origin and destination; a farm
  ships grain *and* receives tools.
- **Bidirectional on every edge** — wagons go both ways on one road.
- **Many-to-many** — utilities are one-to-many (distribution) or
  many-to-one (sewer); freight is a full **origin-destination matrix**.

Mathematically these are not the same shape: a **single-source flow**
versus a **multi-commodity flow**. **So do not model freight as
hub-and-spoke.**

### ⭐⭐ But freight *organizes itself* into hub-and-spoke

An **economic** result, not a topological one:

> **N origins and N destinations need N² direct routes, or 2N through a
> hub.** The hub costs a **detour** and buys **load factor** — full
> wagons instead of half-empty ones.

That is the whole history of logistics — the sorting office, the
classification yard, the container port. **Hub-and-spoke is an emergent
optimization, never a requirement.**

**⭐ And the switch is CAPACITY — the same line that already separated
mail from freight for the TPA.** A full wagonload of grain goes
**direct**, farm to mill; a crate of nails goes to the depot,
consolidates, and rides with everything else. Which is why
[delivery-slate](./delivery-slate.md)'s mail design **is** already
hub-and-spoke (post office → trunk → post office → carrier) while
freight should not be: **mail is small and fragmented, so it always
consolidates.**

### Three networks, three costs of distance

| Network | Shape | Distance costs | Source? |
|---|---|---|---|
| **utility** | tree from a source, meshed core | pressure / loss | **yes** |
| **freight** | O-D matrix over the road graph | **time and money** | no |
| **TPA** | authored directed graph | **nothing** | no |

Why they do not merge — and a decent sanity check on future designs: if
something fits none of the three, it wants its own answer.

### ⭐⭐ The consequence that matters most: the monopoly is at the HUB, not the LINK

Control the consolidation point and you control the market **without
owning a single road.** Historically exact — the fight was over
terminals and elevators, not track.

> **The precedent is perfect: *Munn v. Illinois* (1877) — the case that
> established rate regulation of "businesses affected with a public
> interest" — was about GRAIN ELEVATORS.** A storage hub at a transport
> chokepoint. **Not the railroad.**

Which suggests **the antitrust arc's first target should be a depot,
not a road**: smaller, cheaper to build, and the more honest villain.

### Two things that fall out free

- ⭐ **Express vs. standard is just direct-vs-consolidated.** The hub
  trades **cost for time** — break bulk, sort, reload, with labor and
  handling risk at each step. **No new mechanic.**
- **Hubs site themselves at convergence points in the road graph** —
  precisely the **node town** from [zoning-slate](./zoning-slate.md).
  The depot does not need placing; the emergent road network already
  says where it goes.

### The recommendation

> **Build point-to-point over the road graph, and let depots emerge as
> businesses.**

Consolidation is a decision a hauler makes **because it pays**, not a
topology the engine imposes — and a depot is already expressible as
**an attendant queue + a warehouse + a Business**, all shipped shapes.

## The depot as a business

A **different animal** from the turnpike trust in three ways that all
matter.

### It sells two different things

**Handling** is a *transaction* service (consolidation — the value is
transport saved). **Storage** is a *time* service (holding goods until
wanted). Historically two trades sharing a building: **the forwarder**
and **the warehouseman.** Worth keeping separate, because **only the
second carries a legal duty.**

### ⭐⭐ The warehouse receipt — where it stops being a building

A warehouseman is a **bailee**: holds your goods, owes a **duty of
care**, and **issues a receipt.** A warehouse receipt is a **document of
title** — it *represents* the goods, so you transfer the receipt instead
of moving anything.

> **The goods sit still while ownership moves at the speed of paper.**

That is the origin of **commodity exchanges**, and — more importantly —
the origin of **collateral**: you can **borrow against a warehouse
receipt**, the classic secured loan. The turnpike's debt story one level
up. And it is *why* **Munn** was about elevators: they were a physical
chokepoint **and** the issuers of the paper the whole grain trade ran
on.

**Mechanically already expressible** — a **Document** naming a chattel
or a bulk quantity, using **the bearer/registered split the credential
design already made**
([credential.md](../../subsystems/credential.md),
[fasttravel.md](../../subsystems/fasttravel.md) § *the card is an
instrument, not a passport*):

> **A bearer receipt is a Thing you can steal; a registered receipt is a
> record you cannot.**

### ⭐⭐ The monopoly is a different KIND

| | Source of power | Can a rival break it? |
|---|---|---|
| **turnpike** | **geography** — there is one pass | **yes** — build another road |
| **depot** | **network effects** — everyone consolidates where everyone else does | **no** — a rival depot with no traffic is useless |

That is **the modern monopoly**, and why the depot is the better
antitrust villain: **you cannot compete your way out of it.** The value
*is* the other users.

#### ⭐⭐ Which demands a different remedy — the clean teaching pair

> **The turnpike gets a RATE CAP. The depot gets a DUTY TO SERVE ALL
> COMERS ON EQUAL TERMS.**

**Non-discrimination rather than price control** — the **common
carrier** obligation, which is exactly what the elevator cases and then
the ICC produced. **Same principle as the *Free movement of goods*
module** in
[amendment-library-slate](./amendment-library-slate.md), pointed at a
**facility** instead of a **border**.

### ⭐⭐ It is where labor has maximum leverage

A depot is **labor-intensive** — loaders, sorters, clerks, a
weighmaster; **break bulk is work.** And because everything passes
through one point:

> **You do not blockade a road. You strike a depot.**

More effective *and* more legitimate than the barricade — and why ports
and rail yards were the historic union strongholds. It gives the
**teamsters'-guild vs. freight-corpo** fight somewhere to actually
**be**, and **Wharfside already has a dockers' hall.**

### The smaller pieces

- **The bailee's duty makes loss and damage adjudicable.** Goods handled
  get broken; goods stored get stolen or spoil. **Chattel chain-of-title
  says who owned it, the receipt says who held it, the duty of care says
  who answers.** All shipped machinery.
- **Two capacities, not one** — **storage** and **handling** fail
  independently (full but staffed; empty and understaffed). The
  attendant queue covers the second.
- **Siting: a depot exists where transport MODES CHANGE** — port to
  road, valley road to city street. So **the Gate is already a depot
  site**: TPA terminal + port + city gate, where everything changes
  mode.
- ⭐ **The quality signal is TRUST, not measurement.** A turnpike's
  quality is a number you read off the road; a depot's is *"will my
  goods actually be there?"* — which makes **renown genuinely
  load-bearing for a business** in a way tolls never are. **A new
  warehouseman has a credibility problem a new road does not.**

### Three rungs, and the second variant

**Rungs:** the independent **warehouseman** (one building) → the
**forwarder** (*no building at all* — buys consolidation, sells
shipping; a pure broker) → the **corpo network** that owns the nodes,
where the network effect bites.

**Second variant** (the standing probe): the general warehouse, the
**cold store** (thermal — and the refrigeration thread lands here), the
**grain elevator**, the **container yard** — all **instance data**
(what it holds, at what temperature, at what capacity). **No new
class.**

> **⭐ And a fifth variant with a different intake rule: the IMPOUND
> YARD** — see [sanitation-slate](./sanitation-slate.md). Same storage,
> same receipt, same bailee's duty, same reclaim fee; what differs is
> that goods arrive by **collection** rather than by consignment. It is
> the depot design doing municipal work, and it is what turns *"is this
> junk?"* — an unanswerable question — into *"has anyone claimed it?"*,
> a **waiting** problem.

## What is already free (check before building)

| Want | Probably already is |
|---|---|
| a haulage job | **a gig with a custody clause** — [contract.md](../../subsystems/contract.md) has clauses over verifiable conditions, escrow, a board, and **the custodian rule** |
| custody of cargo in transit | **chattel chain-of-title**; loss or theft becomes a real dispute, adjudicable by the courts |
| background freight when nobody is playing a teamster | **a `hauls` brain**, on the `delivers` precedent — which keeps the **core economy DAU-independent**, a standing commitment |

## The TPA question — RESOLVED

> *"Does freight ride the TPA network, or is that passenger service
> only? They're both `Mobile`, right?"*

**Both are `Mobile` — but `Mobile` is the capability to move, not the
authorization to use a network.** Two independent gates already exclude
vehicles, and **neither was written for this purpose**:

1. **`teleport` is verb-gated `requiresAnimate`.** A wagon cannot invoke
   it.
2. **Clearance lives in the aether-hosted wallet**, never a carried
   card — deliberately, so authorization is a property of *identity*. A
   wagon has no attunement, therefore **no credential holder, therefore
   it can never be cleared.** The identity-bound design answers the
   question **structurally**.

### ⚠ Two live defects this surfaced

**The conveyance ripple and the haulage tow live in `Mobile.traverse`
only.** `Mobile.teleport` is a bare `ContainmentApi.move` plus
narration. So today:

- **teleport while mounted → the horse stays behind**;
- **teleport while hitched → the cart stays behind**, silently.

**That is an oversight, not a policy.** Recorded in
[conveyance.md](../../subsystems/conveyance.md). The rule to write:

> **Teleport ripples what is *on* you and refuses what you are
> *attached to* — and says why.**

Worn gear and pack come along (otherwise teleport strips you). Being
**mounted or hitched refuses the ride** with an honest message, per the
[enforcement slate](./enforcement-slate.md)'s **wall-mode-honesty**
rail: *"the turnstile will not admit a hitched cart."* **Silent failure
is the thing to kill.**

### The line is capacity, not goods

Goods-versus-no-goods is unenforceable anyway — you are carrying things
right now. So:

> **The TPA moves people and what they can carry. Encumbrance already
> draws the line.**

Which sorts the two industries cleanly and historically: a courier with
a satchel of letters rides the network, so **mail is fast**; a steer
does not fit in a satchel, so **freight is slow**. Airmail and container
ships, with **no special rule** — and the delivery slate's carrier may
legitimately use the TPA while freight cannot. The two systems **serve
different goods rather than competing.**

### ⭐ For vehicles: don't write an exclusion — site terminals where wheels can't go

A TPA terminal is a **room fixture you walk to**. If its room does not
admit `wheeled` traffic, no wagon reaches it. **Same trick as the
emergent road network** — the exclusion becomes **geographic rather
than legislative**, which means it is **authorable**.

And that is the good part:

> **A freight depot becomes possible, expensive, and rare.**

If someone builds a TPA terminal with cart access, that is a
**world-changing economic event** — distance collapses for goods on that
route, land values move, and **von Thünen's rings redraw themselves
around a new node.** The railroad story, a second time.

So *"can freight teleport?"* stops being an engine decision and becomes
**something the world can decide** — a thing to fund, charter, site, and
fight about. **Costs nothing to leave open.**

## Crime, police, and jurisdiction

### ⭐ The coverage walk already answers "who polices the road"

Jurisdiction resolves by **longest-prefix coverage walk**, so a road
between two localities may resolve to **no locality**, or to a **higher
tier**.

> **Banditry lives in jurisdictional gaps** — which is why highway
> robbery was historically a *special* crime against the King's peace
> rather than an ordinary one.

A real constitutional question with an **already-mechanized answer**.

- **Highway robbery is the industry's native crime**, and it makes
  **escort an economically motivated job** — the oldest RPG vocation,
  finally with a reason to exist that isn't a quest hook.
- **Police vehicles: the mechanic is response time, not chases.**
  Policing already models the whistle as **a clock, not a stat check**,
  so vehicles change *response time as a function of geography*. Mounted
  patrols cover more ground; **the patrol wagon is the
  [prison slate](./prison-slate.md)'s custody book on wheels.**
- **Pursuit is a scheduling question, not a driving minigame.** Under
  durable activities, both parties are on journeys and the question is
  whether **the interceptor's path closes on the target's before they
  reach sanctuary** — which composes with the *interception-closes* work
  already in combat formations.

## Disciplines

Two new, and lean on existing branches for the rest:

| Discipline | Covers |
|---|---|
| **driving / teamstering** | handling a team, load balance, hitching, passage judgment |
| **navigation** | wayfinding and **cartography** |
| *husbandry* (existing) | draft animals |
| *crafting* (existing) | the **wainwright / wheelwright** branch |
| *preservation* (existing) | spoilage, from the disease thread |

⚠ **Deliberately NOT a discipline: "logistics."** A stat that makes
routes cheaper is exactly the **odometer failure**. Logistics should be
**information**, surfaced through competence.

## Economy and lore

- **Transport cost is a spread** — the same good is worth more at
  destination. That is arbitrage, and it is the merchant's whole
  business; [retail](../../subsystems/retail.md) already has
  `PricedOffer` and consignment.
- **Both a guild and a corpo, because the fault line is the point.** A
  **teamsters' guild** against a **freight corpo** is labor versus
  capital with both substrates shipped — and historically on the nose.

### ⭐ The freight monopoly is the legislature's first natural antitrust case

**(User: "I like the railroad parallel — that'd be a neat thing for the
legislature to explore.")** Transport monopoly is the **literal
historical origin of antitrust** — railroads, rate discrimination, the
Interstate Commerce Act.

We now have a working legislature, a **docket**, and **courts**. An
industry that **everyone depends on and everyone resents**, whose owner
can **set rates**, is the best available first real political fight —
one that generates **genuine politics instead of costumed politics**.

The arc writes itself and every piece of it is already modelled:

1. a freight corpo consolidates routes (a **mark** + approval);
2. **rate discrimination** — charging the small rancher more than the
   big one — is visible in `PricedOffer` and reportable by
   [the press](./press-slate.md) reading the record;
3. a **bill** is tabled; conviction accumulates; the **countdown** is
   watchable;
4. the corpo **lobbies** — as a caucus publishing a platform, with
   followers whose weight is borrowed and revocable;
5. **enactment**, or a **veto that raises the bar**;
6. and the **freight depot** question above is the same fight in its
   land-use form.

**Nothing here is scripted.** It is what the shipped substrates do when
an industry everyone needs gets an owner.

## Named gaps in the shipped substrate

From [conveyance.md](../../subsystems/conveyance.md) § *What v1 doesn't
cover* — **both are squarely in freight's path**:

- **driver-external vehicles** — a teamster walking beside the team
  (rickshaw / palanquin / dog sled); "needs a different mixin";
- **multi-actor coordination** — driver + guard + loader; "activity-slate
  territory."

Plus, from this pass: the **teleport ripple defect** (above), and the
**per-location extent override** (shared with ranged).

## The Journey — the durable activity, designed

Designed against the shipped
[activity framework](../../subsystems/activity.md). Almost all of it
lands on existing pieces; **one slot choice carries the whole feel.**

### Shape: a `SustainedEngagement`, not a `DurativeActivity`

[Respiration](../../subsystems/respiration.md) is the shipped exemplar —
a sustained engagement with a **recurring `ScheduledEmission`
delegating back to the host.** A `DurativeActivity` needs a completion
timer known **up front**, and a journey's duration is *not* trustworthy
in advance: gates close, bridges wash out, routes change. **A fixed
timer would be lying to the player.**

So **each leg is the beat**, and:

> **Arrival is a completion, not an abort.**

That distinction matters — the framework fires aborts **before** any
state change **by design**, and arrival is emphatically *after*.

⚠ **The one possible framework touch:** a sustained engagement that
**ends cleanly on its own terms**. Small, but name it rather than
discover it mid-build.

### ⭐ The journey never moves anything itself

> **Every beat issues the same `traverse` a player would.**

The shipped path then does the rest — mode gates, `canTraverse`, the
conveyance ripple, the haulage tow. Which makes the journey **a thin
scheduler over existing movement**: cheap, and — more importantly —
structurally unable to **silently bypass a gate** or **drift into a
second movement path.**

### ⭐ Slot: `hands` — and this is the choice that makes it work

| Slot | State | Consequence |
|---|---|---|
| `body` | **free** | shift posture, be attacked, defend yourself |
| `attention` | **free** | look around, talk, watch the treeline — **a journey must not blind you** |
| `hands` | **engaged** | wielding needs hands, so **a driver cannot shoot back** |

> **You cannot drive and fight. Ambushed on the road, you choose
> between the reins and the weapon.**

And a **passenger holds no engagement at all** — they are a slot
occupant being rippled, so they fight freely. Therefore:

> **The escort job becomes mechanically necessary, not merely
> sensible.** Caravans hire guards because the driver genuinely cannot
> defend the load.

Falls straight out of the existing four-slot vocabulary. **Nothing new
invented.**

### Ownership, cadence, and the transaction boundary

- **The engagement lives on the driver** — `EngagedMixin` is on
  `Character`, and a wagon is not one. **Abort halts the vehicle.**
  ⚠ A draft team that *bolts* when the reins drop is the classic
  **runaway**; deferred explicitly rather than pretended away by the
  halt.
- **Beat interval comes from shipped data** — exit `speed` /
  `defaultDurationMs`, modulated by **mode** and **load**, so a heavy
  wagon is genuinely slower.
- **On game-time**, like respiration's emissions — a long haul is
  minutes of real time, not hours.
- **The transaction boundary applies per leg**: re-validate before each
  step (exit still passable? vehicle still exists? driver still
  driving?). Failure is **`preconditions-changed`**, which the framework
  already owns.

### Abort reasons

Declaration-merged from freight's own `abort-reasons.ts`, per the
established pattern: **`route-blocked`**, **`vehicle-disabled`**,
**`team-exhausted`** (the draft animal's
[reserve](../../subsystems/reserve.md)). **Reuse `combat`** rather than
minting an ambush reason.

### ⭐ Combat is NOT in `interruptibleBy`

> **Being shot at does not stop your wagon. Running the ambush is a
> playable decision** — stopping is the driver's own `cancel`.

Which forces the good consequence:

> **Bandits have to physically block the road.**

A barricade is a placeable object in the authored-obstacle family the
[ranged slate](./ranged-slate.md) already discusses for cover — and it
is exactly how highway robbery worked: **block first, demand second.**

### Observability

**Position is free** (the vehicle's container). **ETA is computed** from
the remaining plan. And per the standing rule:

> **Competence tightens the ETA; it never shortens it.** A skilled
> navigator gets a narrow window, a novice gets *"sometime tomorrow."*

Same readout ladder as the gun and `analyze`, applied to a number
instead of a description.

### No auto-replan in v1

A blocked route **aborts with `route-blocked` and reports**; the driver
re-issues. **Auto-routing around obstacles hides the geography** this
whole slate exists to make real — **blocked should mean blocked.**

### Two smaller calls

- **A linkdead driver halts the journey where it stands**, leaving the
  cargo on the road as genuine jeopardy. (Open to argument — but it is
  the version with stakes.)
- **The NPC `hauls` brain uses the same Journey object.** Behavior
  brains already ride the scheduler, so there is **no second
  implementation** for background freight.

## The barricade

The Journey's `combat`-exclusion forces bandits to **physically block
the road**. The object that does it needs almost no new mechanism — it
is mostly a way of pointing shipped gates at each other.

### What it is

**An object that raises an exit's mode requirement.** Not a door (no
hinge, no lock, not architecture) — a thing piled in the way that names
**the exits it obstructs** and **which locomotion modes it denies.**
The exit's existing **mode gate is the enforcement**, so there is no
second gate to write.

### ⭐ It stops the vehicle, not the people

A felled tree denies `wheeled` and leaves feet alone. So the wagon
halts, the driver cannot drive away, and people *can* flee —

> **which makes the cargo the target, not the passengers.**

Honest banditry: they want the goods. A wall of stakes that denies
*everything* is the far end of the same dial, **not the default.**

### ⭐ Clearing is durative, on `hands`

The driver must **drop the reins and work with both hands, in the open,
while the people who put it there watch.**

> **The ambush needs no threat mechanic at all** — the vulnerability
> falls out of slot arithmetic. You are at your weakest exactly when
> clearing the road.

**And the barricade is also cover** — it composes the covering stack, so
the bandits shoot from behind the thing they built. Free, and
thematically exact.

### Three honest removals

| Path | Cost |
|---|---|
| **clear it** | time, scaling with grade and mass |
| **destroy it** | the `response = f(mechanism, material, construction)` grid already differentiates axe / rope / fire — **free** |
| **go around** | under **no auto-replan**, the driver re-routes deliberately, so a blocked road actually costs something |

### ⭐ Lawfulness is already answered

`ParcelApi.ownerOf` + `AccessApi.can` + the jurisdiction coverage walk:

- **a gate on your own land** — legitimate;
- **a barricade on the public highway** — **obstruction**, a
  prosecutable crime;
- **in a jurisdictional gap** — nobody to prosecute.

> **Which is precisely why banditry lives there** — closing the loop
> with § *Crime, police, and jurisdiction* above.

### ⭐ A barricade is evidence

It is a placed object with a **chattel stamp** and an **authoring
event**, so an amateur leaves their crate on the road with their
fingerprints on it. **The professional fells a tree** — unowned
material, no trace.

Exactly the [enforcement slate](./enforcement-slate.md)'s *"physical
traces the world already keeps,"* and it produces a real gap between
careless and careful criminals **without a stat.**

### ⭐ Wall-mode enforcement is a barricade with a condition

The enforcement slate's **`wall`** mode — *"the checkpoint refuses the
weapon"* — has been an abstraction with **no physical form.** This is
it: a barricade that denies passage **unless a condition is met** (a
credential, a toll, an inspection). The **wall-mode-honesty** rail comes
with it: **it must always say why it will not admit you.**

### ⭐⭐ The blockade is the strike

A **teamsters' guild blocking a freight corpo's route** is a labor
action with a **physical mechanic** — historically exact, genuinely
dangerous, and exactly what a legislature ends up arguing about. It
gives the labor-versus-capital fault line something to *do* besides
negotiate.

Alongside it, the same object serves: **quarantine** (block a road to
stop contagion — politically explosive, pedagogically rich), the
**turnpike** (a private toll road, a real historical fight), **siege**,
and mundane **closure for works**.

### Grief — the real risk, and the guards

Three, in order:

1. **erecting costs materials and time**, so it cannot be spammed;
2. **nothing is permanent** — every barricade can be cleared or
   destroyed;
3. **inside a jurisdiction the law removes obstructions as a matter of
   course**; outside one you are on the frontier, and that is the deal.

⚠ **The chokepoint case is genuinely dangerous, and it is an AUTHORING
rail, not an engine one:**

> **A critical route must never be a single road.** If there is one way
> into a town, blocking it is catastrophic and no mechanic saves you.

### The second variant

Per the standing design probe: **the tollgate.** Felled tree at one end,
engineered gate at the other — and the difference is **instance data**
(grade, material, construction). Crude and fast versus durable and
owned, **with no new class.**

### Open questions

- Does **erecting ride crafting** (a recipe whose product is *sited on
  an exit*) rather than minting a verb? (Instinct: yes — siting is the
  unusual part.)
- **Which verb clears?** `dismantle` does not exist; `clear` is vague.
- Does the obstruction reference **exits** or **directions**? Exits are
  more precise but need a live ref (Pattern B).

## The tollgate — where the barricade becomes an industry

Mechanically it is **the object we already have: a barricade with a
condition** — deny `wheeled` unless a fee is paid or a credential
presented. Credential wallet + banking, **no new machinery.**

### ⭐ The difference between a tollgate and a robbery is TITLE

Same object, same act, same money changing hands. **The only thing
distinguishing them is whether you own the ground** — and `ownerOf`
already answers it.

Not a stretched analogy either:

> **"Robber baron" comes from exactly this.** The *Raubritter* on the
> Rhine were lords with castles charging tolls, and the dispute was
> never *"is he taking money"* — it was **"does he have the right."**

### ⭐⭐ A road is a capital improvement; the toll is its return

**Exit `speed` is already a field.** So a cleared, bridged, maintained
road is genuinely faster than a track — which means **improving a route
is something you can buy**, and every hauler using it saves time worth
real money. That is the **turnpike trust**: build or improve, charge,
maintain, recoup. Historically these built infrastructure the state
would not.

Which turns freight routes from authored terrain into **player-built
infrastructure** — and because improvement changes the *transport-cost*
side of the ratio:

> **Investing in a road moves the von Thünen rings.** A private business
> decision redraws the economic geography.

**And the business closes honestly.** Improvements **decay with use**,
so maintenance cost scales with traffic *and so does toll revenue*.
**Weight-based tolling is cost recovery, not extraction** — heavy
freight genuinely does more damage, which is why historical tolls were
per-axle and per-beast rather than flat.

> **⭐ The corridor has a second product: the easement.** Utilities
> follow roads because of rights-of-way — see
> [delivery-slate § Distribution](./delivery-slate.md). So a road owner
> sells passage *and* leases the ground beneath it, "digging up the
> road" becomes a real conflict between two businesses (**measurable**,
> since road quality is a number), and **the turnpike trust and the
> utility turn out to be the same business** — a **natural monopoly**,
> which is why both are rate-regulated and why the toll schedule as a
> `parameter` clause generalizes straight to the tariff.

### Geography sets the rate, not greed

The natural ceiling on a toll is **the value of the time it saves**,
because above that people go around. So a road with a parallel track is
**competitive**, and **a pass with no alternative is a monopoly** — the
antitrust arc at small scale, and **rate caps on turnpikes were a real
legislative response.**

### ⭐ The gatekeeper is an attendant

The [attendant substrate](../../subsystems/attendant.md) — queue + lease
with idle eviction — **is a tollbooth almost exactly.** Which gives
**congestion for free**: a busy gate has a queue, queuing is a real
freight cost, and that creates pressure to improve capacity. Shipped,
and it fits without adaptation.

### ⭐⭐ The two gate variants are the enforcement modes made physical

| Variant | Mode | Character |
|---|---|---|
| **manned booth** | **`witness`** | judgment, discretion, mercy — **and corruptibility** |
| **automated gate** | **`camera`** | credential only: no judgment, no bribery, **no mercy** |

Same politics attach as in the
[enforcement slate](./enforcement-slate.md): **the automated gate is
resented precisely because it cannot make an exception** — and that
resentment is now something players feel *at a specific location*
rather than an abstraction.

### ⭐ Exemptions are legislation

Historically: the crown, the military, **the post**, funerals,
parishioners walking to church. *"The post and the constabulary pass
free"* is a **real bill** with real lobbying behind it — and small
enough to be a legislature's **first** law rather than its hardest.

### ⭐⭐ Internal tariffs are the Commerce Clause's origin story

If every locality can toll goods crossing its border, **trade
fragments** — which is precisely the failure the Articles of
Confederation had, and precisely why the Commerce Clause exists.

> **Amendment-library module: free movement of goods / no
> discriminatory tolls**, adopted at the Compact tier. A polity that
> does *not* adopt it **gets to discover why it exists** — the library's
> whole thesis, with a genuinely important lesson attached.

### Evasion — three paths, all interesting

1. **clear or destroy the gate** — now it is criminal damage *and* the
   owner notices, because it is their property;
2. **go around** — back to geography, and why the chokepoint commands a
   premium;
3. **bribe the keeper** — which **only works on a manned gate**, and
   that is exactly the point of the manned/automated split.

## The turnpike trust as a business

Three shipped substrates carry it: a **`Business` Idea**
([employment.md](../../subsystems/employment.md) — proprietor,
positions, roster, account keyed on its own path), a **parcel** (the
road corridor), and a **charter**. Everything interesting comes from
how they meet the legal system.

### ⭐ Financed by debt secured on the tolls, not equity

Historically exact: English turnpike trusts **mortgaged the toll
revenue**; they did not issue shares. Which is convenient, because the
trust then needs **nothing from the deferred capital-markets work.**

A toll-secured loan is **a contract with clauses over verifiable
conditions** — which [contract.md](../../subsystems/contract.md)
already does, with escrow. And default has a clean, story-shaped
consequence:

> **The security *is* the revenue stream, so the creditor takes the
> gate.** Foreclosure via parcel / chattel transfer.

It also makes the world's **first real credit relationship a productive
one** — borrowing to build infrastructure, not to consume.

### ⭐ The gate is what makes a road excludable — that is the point, not the greed

A road is otherwise a **public good**: non-excludable, non-rival until
congested, and therefore **nobody privately builds one.** The tollgate
converts it into a **club good.** Public-goods theory made physical —
and *why turnpikes existed at all.*

### ⭐⭐ Which sets up the real legislative fork: toll or tax

| Model | Paid by | Free at |
|---|---|---|
| **toll roads** | users, at the gate | — |
| **public roads** | general revenue | the point of use |

Both honest, both with real tradeoffs, and **a live argument today**
(congestion pricing). Note that the tax branch **pulls the fiscal
cycle** — Art. VIII §4's *tax → budget → appropriate → disburse* loop,
one of the four named government gaps. **This industry is what makes
that gap urgent.**

### ⭐⭐ The toll schedule is a `parameter` clause in the locality's law

Historically each trust was created by a **named act with a fixed rate
schedule.** So:

> **Raising your rates requires passing a bill.**

The business lives **inside** the legal system rather than beside it —
the most direct connection yet between the government build and a
concrete enterprise. And it makes the trust **a lobbyist by necessity**:
a caucus publishing a platform, which is **step 4 of the antitrust
arc**, arrived at honestly.

### ⭐ The maintenance obligation is a `directive` — the taxonomy earns its keep

By the instrument taxonomy a **directive requires implementation**; it
does not self-execute. So *"the trust shall keep the road in good
repair"* needs a mechanism, and that mechanism is **inspection.**

**The road inspector becomes a real job and a real executive function**:
the legislature sets the requirement, the executive implements it, the
judiciary verifies conformance — Art. V §6 with a wagon on it.

And the claim is **checkable rather than vibes-based**, because **road
quality is observable**: exit `speed` is a number, so *"they toll but
do not maintain"* is a **provable claim**, not a complaint.

### ⭐ The trust dissolves when its debt is repaid — a sunset clause

That is what the charters actually said. **And the honest scandal is
what happened next: trusts kept getting renewed.** Purpose served,
charter due to lapse — and they lobbied to continue.

A concrete instance of § *Sunsets* running in the direction that
actually bites:

> **A concentrated beneficiary fights for renewal while the diffuse
> beneficiaries do not show up.**

*"The trust that won't die"* is a whole political arc that needs **no
authoring.**

### The P&L, and the positions

**Revenue:** tolls. **Costs:** wages + materials. Small enough to reason
about, and every role maps onto the employment engine:

| Position | Notes |
|---|---|
| **gatekeeper** | the attendant — a genuinely good **entry-level job**: fixed location, low skill, honest wages |
| **roadmender** | outdoor labor; `Position.confers` grants the repair capability **on shift** |
| **surveyor** | planning and improvement |
| **trustee** | answers to the charter |

### The scale ladder — no new substrates at any rung

> **one person with one gate → a chartered trust with a few miles → a
> corpo consolidating a network (the antitrust target).**

The same industry read three ways — the guild / corpo / trust fault
line, with a rung for each.

### Two smaller notes

- **Congestion pricing has a natural home** (raise the toll to manage
  demand at capacity) — but leave it a lever a legislature *can* reach
  rather than modelling it up front.
- ⚠ **Check whether a road corridor fits the closed land-use vocabulary
  on `ParcelRecord`**, or whether roads want an additional entry.
  **Cheap now, annoying later** — resolve before the parcel work
  hardens.

## Open questions (for requirements)

1. ~~Journey granularity~~ · ~~what interrupts a journey~~ — **both
   RESOLVED above** (§ *The Journey*): per-room beats via a
   `SustainedEngagement` + `ScheduledEmission`, each leg issuing a
   normal `traverse`; the abort set is `route-blocked` /
   `vehicle-disabled` / `team-exhausted` + the framework-intrinsic
   five, with **`combat` deliberately excluded** so running an ambush
   stays a decision. What remains is **scheduler churn on very long
   routes** — measure before optimizing, and if it bites, batch beats
   through rooms with no observers rather than coarsening the model.
3. **Load model** — does cargo ride as `Container` contents, `Bulkable`
   slots, or both? (Both, probably: crates vs. grain.)
4. **Shrinkage and the live-cargo regime** — is weight loss a metabolism
   read, or a simpler droving term?
5. **Does the wagon itself spoil-shield?** i.e. is the refrigerated
   wagon a `ThermalMixin` host whose contents inherit, and what powers
   it (ice, a cell, a spell)?
6. **Rates** — is freight priced per weight×distance, per journey, or
   negotiated per contract? (The antitrust arc wants rates to be
   *visible* and *settable*, whatever the form.)
7. **NPC haulier density** — how much background freight, and does it
   respond to real price signals or run fixed circuits?
