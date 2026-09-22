# Freight & transport slate — moving goods as an industry

> **Status: PARTIAL** — the lane / route / journey substrate, vehicles,
> the depot, the haulage labor market, `teamstering` and the paper shipped
> → [logistics.md](../../subsystems/logistics.md); the teleport ripple
> ships as a SEVER, not a refusal ([conveyance.md](../../subsystems/conveyance.md)).
> **Left:** the barricade (exits vs lane edges · the clearing verb · erect
> via crafting?) · the tollgate + the turnpike trust (the toll schedule as a
> `parameter` clause · the road inspector · the sunset · toll or tax) · the
> depot's antitrust arc (the duty to serve · the strike · the forwarder ·
> the cold store · the impound yard · warehousing rungs — the design is
> logistics-slate § 11.5) · live cargo and drovers + the refrigerated wagon
> · highway robbery, escort, police vehicles, pursuit · navigation as a
> discipline (knowledge-gated routing · cartography · the competence-
> tightened ETA) · the wainwright · the teamsters' guild vs the freight corpo
> · driver-external vehicles + multi-actor crews · the runaway team +
> `team-exhausted` (declared, never fired) · the linkdead driver · internal
> tariffs / the free-movement module (customs proper is logistics-slate's) ·
> scheduler churn on very long routes · shrinkage · NPC haulier density
> **Size:** a build

**Captured 2026-07-31**, out of the build-2 stewardship/farming thread.
As husbandry, farming and the other production systems scale, goods
have to *get somewhere*: a rancher's steer to the slaughterhouse, then
refrigerated to butchers and markets. Same for every producer.

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
[farming-slate](../tails/farming-slate.md),
[policing-slate](./policing-slate.md),
[map-slate](./map-slate.md).

## Why the industry exists at all

*Homed 2026-09-22 → [settlement-model.md § 8 · the realm layout is already von Thünen](../../settlement-model.md).*


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

> Shipped as designed → [logistics.md § The Journey: a sustained engagement whose beat is one leg](../../subsystems/logistics.md) — the order is a command, the advance is the scheduler, the vehicle is really in every room it passes.

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

> Shipped → [logistics.md § The lane: an edge set, induced](../../subsystems/logistics.md) (`allowsMode` + `wheelPassable`; the pass stops the wheeled lane by itself). The per-location `extent` override shipped with the ranged build → [ranged.md](../../subsystems/ranged.md).

## Navigation

- ~~Pathfinding must be mode-parameterized~~ — shipped: one BFS per lane over
  the induced graph → [logistics.md § Routing](../../subsystems/logistics.md).
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

> The argument — utilities are trees from a source; freight is a
> source-less origin-destination matrix and must not be modelled as
> hub-and-spoke; the hub is an emergent economic optimization (N² vs 2N)
> whose switch is CAPACITY; three networks, three costs of distance —
> graduated to [logistics.md § The depot](../../subsystems/logistics.md)
> (*Why point-to-point, and why the hub is emergent*).

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

> Shipped as designed → [logistics.md § The depot](../../subsystems/logistics.md): point-to-point per lane, and the depot is an attendant queue + a shipment desk + a `Business`, standing where two lanes meet.

## The depot as a business

A **different animal** from the turnpike trust in three ways that all
matter.

### It sells two different things

> Shipped → [logistics.md § The depot](../../subsystems/logistics.md): handling is the one priced product; storage is the receipt and the bailee's duty, never a scarce good.

### ⭐⭐ The warehouse receipt — where it stops being a building

> Superseded by the code: the receipt shipped as a RECORD and the bearer `Thing` was cut before merge as proof of nothing; it returns with `withdraw` → [logistics.md § The warehouse receipt](../../subsystems/logistics.md).

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

## The TPA question — RESOLVED

> Superseded by [logistics-slate](./logistics-slate.md) D4 and the code: the TPA is one of two incumbent networks, not a special case, and there is no `tpa` lane → [logistics.md § There is no `tpa` lane](../../subsystems/logistics.md). The two gates stand: `requiresAnimate` on `teleport.yaml`, and clearance in the aether-hosted wallet → [fasttravel.md](../../subsystems/fasttravel.md).

### ⚠ Two live defects this surfaced

> Fixed, in a different shape: a teleport SEVERS a coupling and says so, rather than refusing → [conveyance.md § `teleport` ripples what is on you](../../subsystems/conveyance.md), [logistics.md § The teleport defect, fixed](../../subsystems/logistics.md).

### The line is capacity, not goods

> Graduated to [logistics.md § The teleport defect, fixed](../../subsystems/logistics.md)
> (*Why the line is capacity, not goods*): the TPA moves people and what
> they can carry; encumbrance draws the line; mail fast, freight slow, no
> special rule.

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

> Shipped and derivable today → [logistics.md § Addresses, and the jurisdictional gap](../../subsystems/logistics.md): the Delight road is under no `Locality`; the Kestrel road is Rejection's.

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

## The Journey — the durable activity, designed

> Shipped as designed → [logistics.md § The Journey](../../subsystems/logistics.md): a sustained engagement whose beat is one leg, every beat the same `traverse`, the `hands` slot only, arrival a completion (`SchedulerApi.complete`), no auto-replan, the `hauls` brain on the same object. What follows is only what the build did NOT settle.

### Ownership, cadence, and the transaction boundary

- **The engagement lives on the driver** — `EngagedMixin` is on
  `Character`, and a wagon is not one. **Abort halts the vehicle.**
  ⚠ A draft team that *bolts* when the reins drop is the classic
  **runaway**; deferred explicitly rather than pretended away by the
  halt.

### Abort reasons

Declaration-merged from freight's own `abort-reasons.ts`, per the
established pattern: **`route-blocked`**, **`vehicle-disabled`**,
**`team-exhausted`** (the draft animal's
[reserve](../../subsystems/reserve.md)). **Reuse `combat`** rather than
minting an ambush reason.

### Observability

**Position is free** (the vehicle's container). **ETA is computed** from
the remaining plan. And per the standing rule:

> **Competence tightens the ETA; it never shortens it.** A skilled
> navigator gets a narrow window, a novice gets *"sometime tomorrow."*

Same readout ladder as the gun and `analyze`, applied to a number
instead of a description.

### Two smaller calls

- **A linkdead driver halts the journey where it stands**, leaving the
  cargo on the road as genuine jeopardy. (Open to argument — but it is
  the version with stakes.)

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

> Shipped → [logistics.md § Land use: no seventh entry](../../subsystems/logistics.md) (`civic`/`wild` IS the toll-versus-obstruction distinction) and § Addresses, and the jurisdictional gap.

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
- ~~Check whether a road corridor fits the closed land-use vocabulary~~ —
  answered: no seventh entry; a corridor is its own parcel under `civic` /
  `wild` → [logistics.md § Land use](../../subsystems/logistics.md).

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
3. Q3 resolved: both, on one rig — `HaulageRig` is `Bulkable(Haulable(Vessel))`
   → [logistics.md § The vehicles](../../subsystems/logistics.md).
4. **Shrinkage and the live-cargo regime** — is weight loss a metabolism
   read, or a simpler droving term?
5. **Does the wagon itself spoil-shield?** i.e. is the refrigerated
   wagon a `ThermalMixin` host whose contents inherit, and what powers
   it (ice, a cell, a spell)?
6. Q6 resolved: a published, superseding rate card on a board, and the gig
   board beside it → [logistics.md § The rate card](../../subsystems/logistics.md).
7. **NPC haulier density** — how much background freight, and does it
   respond to real price signals or run fixed circuits?
