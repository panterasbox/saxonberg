# Logistics slate — the realm as one connected place

> **Status: PARTIAL** — the logistics build shipped (2026-09): real
> corridors between localities, the induced `Lane` graph, `Route`, the
> Journey engagement on a game-minute metronome, the bill of lading +
> rate card, the depot, wagon/team/barge/coach, the haulage labor market,
> `teamstering`, and the teleport-ripple fix →
> [logistics.md](../../subsystems/logistics.md). Four of § 12's open
> questions were answered there.
> **Left:** piracy + turmoil (a road is safe if help arrives) · live cargo
> and drovers (the steer walks, the carcass rides) · infrastructure politics
> — tollgate, turnpike trust, the barricade on a lane edge, banditry,
> congestion, road wear · rail and the ore train (a data addition on the
> lane substrate; the train robbery is its integration test; ship with
> trains or arrive as a shock) · the operator rung — scheduled lines over
> `ServiceRoute` rows (nothing runs them yet) and a passenger market ·
> customs and tariffs — the placed checkpoint, registration + tariff,
> forfeiture, the smuggling rate (⚠ blocked on a statute engine, not
> deferred; inspection → the enforcement build) · D9 + the entrenchment
> tier for free movement · trade reporting — customs returns, the O-D
> matrix, rival indices, returns public by default, the operator view +
> the coverage ratio · standards (D11) — a slot dimension, weights and
> measures, the weighbridge · warehousing as a business (record vs
> reality; mass as the metric) · Heart's Delight the town (a farm and a
> mill ship; the crossroads depot, packing house and co-op do not) · the
> demo-content purge (Moor · Practicum · Substation · Hearthworks) · the
> Delight/Kestrel inconsistency
> **Size:** a build

**Captured 2026-09-03**, out of *"I wanna start designing and building
our logistics trade… cooking and tailoring and ranching/farming are
building now and they all need logistics for the supply chain to be
complete."*

## Relationship to the two existing slates

This slate is the **parent**, not a third sibling. It settles what
neither of the others could settle alone — that the realm is one
contiguous place, how a mode manifests to a player, where the border
is, and what any of it can be counted with.

- [freight-slate](./freight-slate.md) — **still the detail doc** for the
  Journey engagement, the barricade, the tollgate, the turnpike trust,
  the depot-as-business and the antitrust arc. ⚠ Its § *TPA question*
  framing (*"freight cannot teleport"*) is **generalized** here: the TPA
  is one of two incumbent networks, not a special case, and the rule that
  excludes it excludes rail from the player's hands as well. Its § *The
  road network is emergent* presumed a road graph that **does not
  exist** — § 2 below is what creates one.
- [delivery-slate](./delivery-slate.md) — unchanged. Small addressed
  items to fixed addresses; splits from freight by **capacity**, which is
  the same line that sorts every row of the cost surface in § 3.

Substrate: [conveyance](../../subsystems/conveyance.md) ·
[locomotion](../../subsystems/locomotion.md) ·
[spatial](../../subsystems/spatial.md) ·
[boundary](../../subsystems/boundary.md) ·
[address](../../subsystems/address.md) ·
[civics](../../subsystems/civics.md) ·
[watershed](../../subsystems/watershed.md) ·
[encumbrance](../../subsystems/encumbrance.md) ·
[activity](../../subsystems/activity.md) ·
[contract](../../subsystems/contract.md) ·
[chattel](../../subsystems/chattel.md) ·
[document-store](../../subsystems/document-store.md) ·
[banking](../../subsystems/banking.md) ·
[slot](../../subsystems/slot.md) ·
[quantities](../../subsystems/quantities.md)

Doctrine this build is bound by: [measurement.md](../../measurement.md)
(the three layers; *the mirror is never a gauge*) ·
[settlement-model.md](../../settlement-model.md) § 8 (the six networks) ·
[gazette-slate](./gazette-slate.md) (*the state aggregates, never
reports*) · [balance-slate](./balance-slate.md) (*the denominator is
where the design is*).

Localities: [hearts-delight](../../staging/hearts-delight.md) ·
[rejection](../../staging/rejection.md) ·
[newbie-wilds](../../staging/newbie-wilds/README.md) ·
[terminus-city](../../staging/terminus-city.md).

---

# Part 0 — ⭐⭐⭐ The finding: the supply chain already runs on teleport

> Shipped → [logistics.md](../../subsystems/logistics.md) (the intro; § The forcing function): the mainland is contiguous, `consigns` walks the road and `restocks` posts and receives — neither teleports.

---

# Part 1 — What this slate decides

Eleven decisions, all taken in conversation. Detail follows.

| # | decision |
|---|---|
| **D1** | The realm is **one contiguous walkable place**. The Lounge and Saxonberg stay TPA-only; everything else joins the map. |
| **D2** | The freight spine is **Rejection → the pass → Heart's Delight → Terminus**, with Hinkley Hills off Terminus and newbie-wilds past Rejection. |
| **D3** | There is **no tech ladder — there is a cost surface**. Anachronism is deliberate and stratified by economic position. |
| **D4** | **Rail and the TPA are incumbents you buy passage on.** The player-operable rungs are back / cart / wagon / barge, permanently. |
| **D5** | Locations and containers are the **quantum layer**; modes are **lane graphs** over the same nodes; a vehicle is a `Mobile ExitableVessel` — a room that moves. |
| **D6** | **Consign ships first.** Drive, ride and teleport are the same machinery seen from other ends. |
| **D7** | **Duration is priced in vulnerability, not convenience.** |
| **D8** | The border is **derived**; the checkpoint is **placed**. Customs powers are **enacted, never defaulted**. Inspection belongs to the enforcement build. |
| **D9** | The realm ships with **no free-movement rule**, so the polity discovers why one exists. |
| **D10** | **The commercial documents are the statistics.** The bill of lading ships. Returns are public by default. Rival indices, never a blessed one. |
| **D11** | **A standard is an agreement about a slot dimension**, and its benefit is arithmetic, not a rule. |

---

# Part 2 — D1/D2: the realm, contiguous

## The map, and most of it was already drawn

> Shipped → [logistics.md § The corridors](../../subsystems/logistics.md) (the spine end to end; the Lounge and Saxonberg TPA-only by design).

| place | where | note |
|---|---|---|
| **Terminus** | the confluence, 35 m | the city; market, Wharfside, counting-houses, University Ave, the campus |
| ↳ **Hinkley Hills** | 130 m | suburb; ✅ the five-room **valley road already ships** |
| **Heart's Delight** | the Delight valley | designed, unbuilt; the crossroads, the depot, the packing house |
| **Rejection** | headwaters, ~1400 m | ships; over the pass |
| **newbie-wilds** | ⭐ **past Rejection** | *the last counted mile* — where the census stops |
| **the estuary** | 0 m | the sea; Wharfside's reason to exist |
| the Lounge · Saxonberg | — | TPA-only by design |
| ~~Moor · Practicum · Substation · Hearthworks~~ | — | ⚠ demo content; **user will purge or reshape** |

⚠ **Cold Fell is not a place.** It is the high, empty basin the aqueduct
draws from — a catchment with nobody living on it. Nothing travels it
but water in a pipe. An earlier pass in this conversation listed it as a
corridor destination; that was wrong.

## Two corridors carry the whole economy

> Shipped → [logistics.md § Three lanes ship](../../subsystems/logistics.md): `spine` (wheeled, stops at the pass) and `estuary` (sailed, below the confluence — the lane inherits the gorge rather than restating it).

## ⭐ What "enough geography" means — the corridor

> Shipped → [logistics.md § The corridors](../../subsystems/logistics.md) (*length is an event budget, not a distance*; three lanes; one corridor covered and one not — § Addresses, and the jurisdictional gap).

⚠ **One inconsistency to resolve before it hardens.**
[hearts-delight](../../staging/hearts-delight.md) says *"the ore town's
fouling arrives here first"*, but the hydrology has Rejection on the
**Kestrel** and the valley on the **Delight** — two tributaries that
only meet at Terminus. Rejection's tailings never touch the valley. This
is the locality build's to fix, not this one's, but it **changes who has
standing to sue whom** and should be written down now.

---

# Part 3 — D3/D4: there is no tech ladder, there is a cost surface

> Graduated → [logistics.md § The lane](../../subsystems/logistics.md), *Why an incumbent, and why no tech ladder*: the player-operable ladder is the low one, permanently; rail and the TPA are incumbents you buy passage on; *trades ship medieval* is about a practitioner's KIT, never the world's infrastructure. What follows is the cost-surface argument itself, kept as doctrine.

## The cost surface, and why every rung survives

Anachronism is not a conceit. Right now a container ship, a freight
train, a truck, a bike courier and a man with a handcart all exist and
all make money. It only looks anachronistic if you assume technologies
*replace* each other — and they do not, because they do not compete on
one axis.

| mode | capacity | reach | cost | who takes it |
|---|---|---|---|---|
| your back | tiny | **everywhere** | free | everyone, forever |
| handcart | small | any `wheeled` exit | a person's day | a smallholder, a porter |
| wagon + team | medium | the road graph | team, feed, a driver | a business |
| barge | large | the navigable reach | ⭐ cheap **downstream**, dear up | the trunk, where there is water |
| rail | enormous | **the line only** | a tariff you do not set | the corpo, and whoever pays |
| TPA | one person + carry | the star's nodes | mana | anyone with a card |
| a spell | small | ⭐ **arbitrary** | dear | a courier, never a freighter |

> ⭐⭐ **Capacity and reach move in opposite directions, monotonically.**
> The bottom rung reaches everywhere and carries nothing; the top rungs
> carry everything and reach almost nowhere. **No rung dominates
> another, so no rung goes extinct** — and that needs no rule, no
> "primitive tech" flag and no era gating. It is the shape of the table.

Which gives the permanent, honest reason a handcart survives a railroad:
**the railroad does not go to your door.** Last mile is a topological
niche, not a nostalgic one.

⭐ **Magic is a point on the surface, not a tier above it** — dear,
small, arbitrary reach. Which makes it the courier's tool and never the
freighter's, on the same capacity line that already sorts mail from
freight.

## The second axis is your economic ladder

The same shipment, made by different people, takes a different row. A
smallholder walks forty crates to the depot and pays the tariff; the
co-op charters a wagon; the packing house has a rail contract at a rate
the smallholder cannot get.

> ⭐ **That is rate discrimination, and it is the antitrust arc arriving
> without anyone authoring it.** *"They charge Furtado less than they
> charge Avila"* becomes a provable fact the moment one route has two
> prices.

## ⚠ The one guard that keeps this from reading as slop

> **Every anachronism must be economically motivated.** A cart beside a
> railroad is right because the cart does what the railroad cannot. A
> cart beside a railroad *doing the same job on the same route* is set
> dressing.

Rail is the trunk; everything else feeds it or reaches where it does
not. Then a player who sees a barrow and a locomotive in one room reads
**stratification**, not confusion — and the world gets to be visibly
unequal in a way that is about **who can afford which row.**

---

# Part 4 — D5: how a mode manifests

> Shipped → [logistics.md](../../subsystems/logistics.md): § The vehicles (`Coach` is the `ExitableVessel` consumer; passengers are contents, so an open rig shows you the road), § The Route (one lane, two stop sets; the TPA as the limit case is stated, not stored — § There is no `tpa` lane), § The labor market (the four verbs; *every service is a payroll*), § Players and NPCs do not travel the same way (`go <vehicle>` / `out`). Consign shipped first, as `ship`.

## What the colony games teach

| | contributes |
|---|---|
| **Banished / Farthest Frontier** | ⭐ **the labourer walks, and that walk is the cost.** The whole optimization is *put the barn nearer the field.* |
| **Manor Lords** | ⭐ **the ox is scarce capital with a queue on it.** Not everyone has a cart. |
| **Foundation** | roads emerge from paths — let use cut the network |
| **Transport Fever** | ⭐ **you configure lines; you never drive.** The verb is scheduling. |

> ⭐⭐⭐ **None of them make you drive.** In all five the player's
> engagement is **siting, routing and capital allocation.**

So the moment-to-moment drive should exist — we are an RPG and the
ambush needs it — but **the industry's gameplay is siting and routing.**

⭐⭐ And it maps onto the shipped business ladder: **driver → operator is
Banished → Transport Fever.** One person with a handcart *is* the
Banished villager; a firm running scheduled lines *is* the Transport
Fever player. Same world, two rungs, both because the world contains
both scales.

---

# Part 5 — D7: duration is priced in vulnerability

> Graduated → [logistics.md § The metronome and the score](../../subsystems/logistics.md), *Why the number is what it is*: a journey takes time so that there is a window in which the cargo is on the road and can be taken, taxed, inspected or lost. ⚠ The paragraph kept below is contradicted by § The cost surface is OPT-IN — a hitched rig follows `go` in zero game time, so encumbrance alone does not kill the incentive to script the walk.

Encumbrance already draws that line, exactly where the industry lives,
so the incentive to script the walk evaporates. And for a bare person,
**walking should win** — historically the coach carried people who could
afford not to walk. **Riding is a purchase of comfort and safety, not of
time**, which is the economic-ladder texture again.

---

# Part 6 — D8/D9: customs and borders

**User: "customs and different localities and the borders between them —
that's maybe the most sensitive part of all this in terms of legal and
economic implications."**

## A border is derived, not authored

> Shipped and derivable → [logistics.md § Addresses, and the jurisdictional gap](../../subsystems/logistics.md), [address.md](../../subsystems/address.md): three kinds of ground — inside a jurisdiction, between two, outside all.

## ⭐⭐ The border is everywhere; the checkpoint is somewhere

A locality cannot seal a line. It can only **put a person or a gate at a
place and watch what goes through** — which is what customs has always
been: not a wall, a funnel. You build the bridge, then you stand on it.

> **So smuggling needs no mechanic at all. You cross where nobody is
> standing.**

The cost of evasion is the detour, the terrain, and what you can carry on
your back instead of in a wagon — all already modelled. And it makes the
checkpoint's *siting* meaningful: a post on the only bridge is powerful,
a post on an open moor is theatre.

## The four powers, and they are separable

**D8: powers are enacted, never defaulted.** A town has no border regime
until it passes one — so **the first tariff in the realm is a bill with a
date on it and somebody's name on it.**

| power | what it is | who it touches |
|---|---|---|
| **registration** | record what crossed and with whom | nobody much — it is the audit trail |
| **tariff** | charge goods for crossing | the wedge: raises the price there, lowers it here |
| **prohibition** | some goods may not cross | quarantine, contraband, weapons |
| ⚠ **inspection** | the power to *look* | **everyone who crosses** |

⚠ **Inspection is deferred to the enforcement build** — user's call. It
is a search of everybody on no suspicion, which is a heavier
civil-liberties object than anything in the policing slate, and the
search machinery (concealment, honest fog, the `witness`/`camera`/`wall`
modes) belongs to that build. **Registration + tariff + the checkpoint
object are this build's.**

## ⭐ The tariff rate sets the smuggling rate, and nobody tunes it

A duty is a wedge between two prices, both of which `PricedOffer`
already shows. The return on evasion is **visible arithmetic**: a 5%
duty gets paid because sneaking is not worth it; a 60% duty gets evaded
because it obviously is. A legislature raising rates and watching revenue
*fall* is the Laffer argument happening to people rather than being
taught.

## D9 — ship it broken, on purpose

Two defensible principles:

- **locality sovereignty** — a town may tax and exclude at its border.
  Revenue, local control, and the quarantine power, which is a
  legitimate thing to want.
- **free movement of goods** — the Compact forbids internal tariffs and
  discriminatory tolls. [amendment-library-slate](./amendment-library-slate.md)
  already has the module.

> ⭐⭐ **The Articles of Confederation lesson only lands if they get it
> wrong first.** Ship with locality sovereignty and no free-movement
> rule. Let Rejection toll the ore road and Terminus toll the produce.
> Trade fragments, prices diverge, everyone notices — and *then* somebody
> tables the amendment.

⚠ **Named risk:** if it fragments hard the economy stalls for players who
did not sign up for a civics lesson. The mitigation is entrenchment tier,
not a mechanic — see § 12 Q7.

## Three things that stay genuinely fraught

1. **Forfeiture.** Chattel chain-of-title says who owned it, so a seizure
   is adjudicable and you can sue to get it back — the right shape. ⚠ If
   we ever model *civil forfeiture where the goods are the defendant*, it
   must be contestable, never a fee.
2. **Discriminatory application.** The same post treating the packing
   house's rail consignment and Avila's handcart differently should be
   **possible and provable** — a matter of record the press can read.
3. **Currency at the border.** If localities ever mint separately, a
   crossing is also an exchange and the money changer is a vocation. The
   ledger rule (*a leg may never cross currencies*) makes this a design
   decision, not an emergent one. Probably out of scope; named so it is
   not discovered later.

---

# Part 7 — D10: reporting, and why it is the same build

**User: "being able to see all the imports and exports in the game could
be really useful for whoever is running the central bank and setting
monetary policy… I feel like logistics and reporting go hand in hand."**

## They go together for a reason, not by coincidence

**Goods that teleport cannot be counted.** A shipment that must move
through space must *pass* somewhere, and a place goods pass through is a
place they can be counted. The first national economic statistics
anywhere were **customs returns** — the ledger of what crossed the
border.

> ⭐⭐ **The checkpoint is the instrument.** The object that taxes is the
> object that counts, and the two were invented together.

## ⭐⭐⭐ The coverage gap is the feature

Because the border is everywhere and the checkpoint is somewhere:

> **The numbers have exactly the coverage the posts have.** Smuggled
> goods are not in them; a locality with no customs house has no trade
> data at all.

Which carries most of the pedagogy on its own:

- the governor's data is **real but incomplete**, exactly like real data;
- improving your statistics is a **policy choice with a cost**;
- the gap between what the mill *shipped* and what the customs house
  *counted* **is** the smuggling estimate;
- ⚠ a governor who trusts the numbers naively gets it wrong.

## You do not build reporting — you build the commercial documents

Every statistic worth having is a **paper a business already needs for
its own reasons.**

| document | exists because | happens to record |
|---|---|---|
| ⭐ **bill of lading** | the carrier must prove what they took, the shipper what they sent | what · how much · from · to · whose · declared value |
| **warehouse receipt** | it is a **document of title** — you trade it instead of the goods | stock on hand, by commodity, by place |
| **customs declaration** | the duty must be assessed on something | imports and exports by locality |
| **consignment / `PricedOffer`** | ✅ already ships | price, by commodity, by place |

> *Reports are queries over instruments that had to exist anyway* shipped → [logistics.md § Reporting is a query over the paper](../../subsystems/logistics.md) (`WaybillRegistry.freightOf` / `trafficOf`, `house freight`). ⚠ The bearer/registered split did NOT ship: the receipt is a RECORD only and the bearer `Thing` was cut before merge → § The warehouse receipt. The customs declaration is Part 6's.

## What falls out

| report | from | why it matters |
|---|---|---|
| **O-D matrix** by commodity and period | bills of lading | the multi-commodity flow, observable |
| **carrier market share** | same | ⭐ the antitrust evidence as a query, not an accusation |
| **rates paid per carrier per route** | same | ⭐⭐ rate discrimination becomes **a table** |
| **duty revenue by post** | declarations | feeds the fiscal cycle (Art. VIII §4) |
| **trade balance per locality** | declarations | what localities will argue about |
| ⭐ **price spread, one good, two places** | `PricedOffer` | transport cost made visible — **von Thünen readable off a table** |
| **price dispersion over time** | same | market integration: the most important fact in economic history, watchable |

## ⭐⭐ Freight is the denominator

Banking already gives the realm an **exact money stock** — conservation
through a chokepoint, so M is known to the coin. The goods side has been
missing.

> **You cannot have a price level, or velocity, or any monetary policy
> worth the name, without both.** Logistics is what supplies the other
> half.

That is [balance-slate](./balance-slate.md)'s own rule — *every global
ledger is a currency; the denominator is where the design is* — arriving
with a body.

## ⚠ Two doctrine constraints, from measurement.md

**1. The engine may publish quantities. Never a verdict, never a gauge.**
No "economic health: 78%." An *index* is a weighted basket, therefore a
**valuation**, therefore layer 2. Per the corrected rule (*the engine
measures and may publish; it must never be the only rater*) the engine
may publish an aggregate **provided the weights are published and it is
not the only rater.**

**2. The gazette publishes; the state aggregates.** Returns are a record
*in a place*; turning them into news is **a person holding a seat**,
which is where significance legitimately enters.

## Rival indices

An index is a **published Document** naming its basket, its weights and
its sampling rule. Anyone may publish one; the engine evaluates any
published methodology honestly and blesses none.

> ⭐ **The fight is never about the number — it is about the basket.** A
> player who works out that the bank's index leaves out the thing they
> actually buy has learned something no lecture delivers.

⭐⭐ And this is **cheaper than the alternative**, not a trade: a single
blessed basket forces us to decide what is canonical, which is a design
argument with no right answer. The engine work is identical either way
(a basket document plus an evaluator); per-publisher instead of singleton
is nearly free.

**Guard:** the central bank ships with one published index so there is
always at least one number. Rivals are content, not a dependency.

## D10 — returns are public by default

The user's call. Low-entrenched, so a polity **can** close them and
discover what that costs.

## The operator half, and the one metric

Two explicitly separate views:

- **the diegetic view** — what a governor sees: the returns, partial,
  queryable;
- **the operator view** — the true totals, including everything smuggled
  past every post.

> ⭐⭐ **The coverage ratio — measured trade ÷ actual trade — is the
> build's single best health number**, and only computable at the
> operator layer. Near 95% and customs is trivial, so smuggling is dead
> content. Near 40% and the state is blind and the economy is lawless.

⭐ And a discipline worth adopting: **balance by reading what a governor
reads.** Tuning against numbers no player can see builds a game that is
only balanced from outside it. The operator view is for checking the
*gap*, not for routine balancing.

---

# Part 8 — D11: standards

**User: "logistics is one area where there's a lot of standards…
shipping containers, pallets. Are there actual organizations that dictate
those, or are they just emergent?"**

**Both, in sequence, and the sequence is the lesson.**

| | how it went |
|---|---|
| **track gauge** | Stephenson's 4′8½″ won by being first-and-most, not best. Break-of-gauge was an economic disaster in Australia, Spain and the American South. |
| **the pallet** | emerged from the forklift → **the US military standardized it in WWII** → ISO decades later → ⚠ *still schismatic* (1200×800 vs 48×40), and it costs real money today |
| **the container** | ⭐ McLean patented it in 1956 and then **released the patent royalty-free** — a container nobody else can handle is just a steel box |

> ⭐ **A standard's entire value is that others adopted it**, so the
> winning move is often to give your invention away. The same
> network-effect logic as the depot monopoly, pointed in the generous
> direction.

## The mechanism is already in the vocabulary

`Slotted` / `Slottable`, `accepts` + `fitsSlot`, capacity.

> ⭐⭐ **A standard is an agreement about a slot dimension.** A pallet is
> a `Slottable` with a footprint; a wagon bed, a rack, a hold are
> `Slotted` with `accepts` predicates.

And the benefit is **arithmetic, not a rule**: conforming cargo loads
fast and fills the space; non-conforming cargo stacks badly, wastes
volume, and is hand-handled at every break of bulk. Nobody enforces
anything — you just pay more. **Adoption is a decision, not a
requirement.**

## Three sources, all already supported

| source | mechanism |
|---|---|
| **de facto** | whoever is biggest sets it; others fit in order to trade with them |
| **a body publishes a spec** | ⭐ a Document with a spec + renown in the publisher — **the rival-index shape exactly** |
| **law** | a statute mandates it, usually after a disaster or to break a monopoly |

> ⭐ **A standard is an index for objects.** Same object, same politics,
> same *anyone may publish, adoption is voluntary, the value is who else
> adopted.*

## ⭐ Weights and measures is the load-bearing one

`Quantity<U>` and the Unit catalog already ship. A locality's **official
measure** is a standard with legal force, and fraud in measures is the
oldest commercial crime there is.

> **The weighbridge is where standards, customs and reporting meet in one
> object** — the instrument the duty is assessed on, the statistic is
> recorded from, and the standard is enforced by.

---

# Part 9 — contested ways, turmoil, piracy

## Turmoil does not want a variable

Jurisdiction is already a coverage walk that can return nothing, and
policing already models the whistle as **a clock, not a stat check**.

> ⭐⭐ **A road is safe if help arrives. That is the whole model, and it
> is measurable.**

Turmoil is the gap between *declared* jurisdiction and *effective*
control, and the observable is simply **nobody came**. A strike, a war, a
plague or plain understaffing produce the same reading — which is right,
because to the person on the road they *are* the same thing.

## ⭐ A waterway is a harder monopoly than a road

**You can cut a new road; you cannot cut a new river.** So a navigable
reach sits at the *geography* end of the monopoly spectrum and the depot
at the *network-effect* end — one industry, two kinds of power, and
therefore two different remedies (rate cap vs. duty to serve all comers).

The toll/blockade distinction stays **title**, per the freight slate —
except that in turmoil nobody enforces the distinction, **which is
precisely what law is for and precisely what its absence feels like.**

## Piracy — banditry on water, differing in three ways

1. ⭐ **You cannot walk away.** A road barricade stops the wagon and
   lets people flee (*"the cargo is the target, not the passengers"*).
   On water the vessel is the only ground. Higher stakes, worse
   outcomes — not a mechanic we add, a consequence of the vessel being a
   place.
2. ⭐⭐ **The vessel is the prize.** A wagon is worth little; a ship is
   capital, historically worth more than its cargo. Our vessel is a Stuff
   with chattel title, so seizing the *vehicle* is expressible.
3. ⭐⭐⭐ **Jurisdiction fails over water.** Who covers midstream? If
   localities declare *ground*, the water between two banks may be
   nobody's, so the coverage walk returns null. **That is literally why
   admiralty is a separate body of law, and why piracy is the original
   universal-jurisdiction crime** — *hostis humani generis*, prosecutable
   by anyone, anywhere, precisely because nobody has jurisdiction.

> **The one crime everyone may prosecute, because nobody owns the place
> it happened.** Free from the coverage walk; superb civics.

---

# Part 10 — ⭐⭐⭐ The train robbery is the integration test

Worked against the abstractions, beat by beat:

| beat | our machinery | new? |
|---|---|---|
| **know what is on it** | ⭐ **the bill of lading is the intel object** — a manifest, a bribable clerk, depot paperwork | ✅ shipping it anyway |
| **stop it** | a **barricade** raising the mode requirement on a rail lane edge → the Route's next leg fails `route-blocked` → the train halts **at the node before**. ⭐ The robbers choose where it stops by choosing where they build. | ⚠ needs the barricade to sit on a **lane edge** |
| **or board legitimately** | ⭐ the stop set is a **timetable**, and a timetable is public — the schedule is an attack surface | ✅ falls out |
| **get in** | it is an `ExitableVessel` — `go carriage` | ✅ |
| **the confrontation** | ⭐ the driver's **hands are engaged**; passengers hold no engagement and fight freely. The crew is the weak point, the passengers are the risk. | ✅ |
| **the express car** | a `Sealable`/`Lockable` vessel inside a vessel; `response = f(mechanism, material, construction)` already decides whether the charge opens the strongbox | ✅ |
| **the getaway** | ⭐⭐ **the cost surface bites back** — the enormous capacity that made rail worth robbing is exactly what cannot be carried away | ✅ emergent |
| **the aftermath** | stolen goods carry chain-of-title so fencing is a real problem; the barricade is **evidence** unless you felled a tree; blame derives from `accountability_events`; and it happened where coverage may return nothing | ✅ |

> **A train robbery is already fully expressible. It needs exactly one
> thing we were not already building: a barricade that can sit on a lane
> edge.**

Two consequences nobody authored, which are the sign the abstractions are
right:

⭐⭐ **The binding constraint is the getaway's capacity** — which is *why
real robbers took money and registered mail rather than freight.* It
falls out of the capacity↔reach inversion applied from the criminal's
side. **The robbers face the same cost surface as the shipper.**

⭐⭐ **The sanctuary is already sited.** Pursuit is a scheduling question
— does the posse's path close before the robbers reach ground where
nobody answers? That ground is *past Rejection, at the last counted
mile*, which is exactly where newbie-wilds was placed. **The outlaw
geography and the newbie area are the same place, for the same reason,
and neither decision was made with the other in mind.**

---

# Part 11.5 — Warehousing: the other half of logistics

**Captured 2026-09-03**, out of *"what about the other side of logistics
which is warehousing… what is a warehouse. It's just a really really big
container. But that bigness gives it certain properties and needs."*

> **Status: design captured, deliberately DEFERRED.** The logistics build
> ships the receipt and the bailee's duty and nothing else of this. → the
> **warehouse build**.

## ⭐⭐ A small container is a thing; a big one is a PLACE

Bigness is not a container property. It is **the point at which you stop
holding a thing and start standing in it** — and the engine already has
that ladder: `Vessel` → `ExitableVessel` (*"anything with navigable
interior is a Vessel"*) → `Location`.

Which means "warehouse" is **three things fused into one word**:

| | what it is | ships? |
|---|---|---|
| **the space** | a room you walk into, with weather, light and a door | ✅ |
| **the stock** | fungible goods as `Stackable` stacks / a `Stock` counter — never 10,000 objects | ✅ |
| **the institution** | ⭐ the **bailee** — the business that keeps the room and answers for what is in it | D8 |

⭐ So the warehouse *object* is not the building. It is the business that
keeps it — the same split as the bar being a room and Dave's Bar being a
`Business`.

## What bigness actually changes

| property | why it follows from size |
|---|---|
| ⭐⭐⭐ **contents stop being perceived and become RECORDED** | you cannot `look in` a warehouse; you consult its ledger |
| **finding takes time** | a pile with no addressing is not storage — bins, aisles, racks |
| **the bottom does not come out** | stacking order; FIFO vs LIFO; rotation, which perishables punish |
| **capacity binds in several dimensions** | floor, height, mass, and **segregation** — fuel not beside grain |
| **conditions apply to everything inside** | it is a space, so contents inherit temperature, damp, vermin |
| **it needs labor** | break bulk is work; *"you do not blockade a road, you strike a depot"* |
| **it is pilfered, not robbed** | small amounts over time, invisible **except against the record** |

## ⭐⭐⭐ The spine: record versus reality

> **The gap between the ledger and the goods is the entire discipline** —
> cycle counts, shrinkage, the annual stocktake.

And it is the same shape as [measurement.md](../../measurement.md)'s
layer 1: **the record is a claim about the world, not the world.**

⚠ **Which is exactly why it cannot ship in the logistics build.** A
record-versus-reality mechanic needs something to *cause* divergence, and
in that build's scope spoilage is a non-goal, theft-at-scale is not
modelled, and counting is not fallible. **A stocktake that always
balances is inert content.** The divergence and the gap ship together or
not at all.

## ⚠ The capacity finding

**Capacity in this engine is a property of a BEARER'S BODY**
(`bodyMass × CAPACITY_FRACTION × …`), and a warehouse has no bearer — so
*full* is unrepresentable for discrete goods. Three capacity mechanisms
ship and none of them covers this:

| mechanism | meters |
|---|---|
| `Bulkable.interiorCapacity` | continuous matter, nullable litres — ⭐ already correct for grain, ore and liquid |
| `SlotSpec.capacity` | fitted items per slot, a count |
| encumbrance | what a **body** can bear |

⭐ **The seam for the missing one already exists**: `ContainmentApi.placeOn`
consults **`surface.canRest(item)`** — a predicate on the host, which is
the OO-correct shape. And CLAUDE.md already settles the failure mode: a
full warehouse is a **legitimate world state**, not a contract violation,
so it is a **validator** concern and `ContainmentApi.move` is never
touched.

### ⭐⭐ The metric is MASS, and the evidence decides it

| metric | verdict |
|---|---|
| **volume** | ❌ **`volume:` is authored in exactly ONE content file; `mass:` in 126.** Volume would need authoring on every shipped item — the "missing enabling data fails closed and silent" trap. |
| **count of top-level contents** | tempting — free, and ⭐ it makes D11's standards benefit arithmetic by rewarding crating. But ⚠ **gameable by nesting**: put everything in one crate and capacity is 1. |
| ⭐ **mass** | ships, authored 126×, the summing walk exists (`getDraftLoad`), and **cannot be gamed** — mass sums through nesting. Its weakness (a barn fills with straw before it is heavy) is real but minor for this realm's dense goods. |

**Decided: mass, in the warehouse build.** The count-rewards-crating story
is genuinely good and belongs to the **standards build**, where its payoff
lives.

## The lenses

| lens | warehousing |
|---|---|
| **Pedagogy** | ⭐⭐⭐ record vs reality; ⭐ **inventory is money you cannot spend** (carrying cost, and why just-in-time exists); rotation; segregation; the bailee's duty |
| **Creative expression** | ⭐⭐ **how you arrange it IS the skill** — aisles, what is near the door, what is up high — expressed **in the world** rather than in a transcript, on the shipped furnishing substrate |
| **Immersion / RP** | the place: dim, dusty, echoing. The night watchman; the clerk with the ledger. ⭐ **The stocktake as an event** — close for a day and count. |
| **Gamification** | ⚠ ⭐ **warehousing may not want a discipline at all.** Teamstering is a personal craft; warehousing's real variance is **layout**, which is authored rather than learned. A `storekeeping` discipline buying count/locate *information* is defensible later — but the primary skill should stay in the world. |

⭐ And "what does bigness **need**" is literally the archetype question —
so much of this lands in D19's `depot` archetype for the cost of a file:
a roof, dryness, `lightLux`, a door big enough, a `surface` to break bulk
on, a scale, and `coldStorage` with no default.

---

# Part 11 — inventory: what ships, what is new

> History: the pre-build audit and the build inventory. Everything in both tables shipped (retired `logistics-plan.md`, W0–W9 all ✅) except the **checkpoint**, whose design is Part 6's → [logistics.md](../../subsystems/logistics.md).

---

# Part 12 — Open questions

> ⭐ **Four of these were answered by the logistics build** (2026-09) and
> are marked ✅ with a pointer. The slate is KEPT rather than retired
> because the rest — piracy, live cargo and drovers, infrastructure
> politics, the railway, the entrenchment tier — is design surface the
> build never touched, and § 8–11 above go with them.

1. Q1 resolved: a published, superseding rate card on a board →
   [logistics.md § The rate card](../../subsystems/logistics.md).
2. Q2 resolved: both, on one rig — `HaulageRig` is `Bulkable(Haulable(Vessel))`
   → § The vehicles.
3. **Live cargo / drovers** — the steer walks and the carcass rides, the
   marquee case. Deferred in conversation because ranching is in flight;
   **not formally ruled out.**
4. **How much infrastructure politics** — the depot-as-business and the
   warehouse receipt come nearly free with the bill of lading. The
   tollgate, the turnpike trust and the barricade/banditry cluster are a
   bigger bite. Where is the line?
5. Q5 resolved: GAME minutes, `edgeMinutes × modeFactor × loadFactor` on a
   one-game-minute metronome → § The metronome and the score.
6. **Does the rail ship with trains, or arrive as a shock?** User wants
   as much built or designed as possible. Building the road economy first
   and *then* landing the railroad on it is the nineteenth century
   compressed — but it means shipping Heart's Delight with a depot and no
   trains for a while.
7. **Entrenchment tier for free movement.** D9 ships without the rule; if
   fragmentation stalls the economy, is the mitigation a Compact-tier
   default the polity may repeal, or a C-tier the polity must enact?
8. Q8 resolved: an open rig is an open container, and `MixinApi.isOpenContainer`
   is the one rule → § The vehicles.
9. **Does the barricade reference exits or lane edges?** § 10 needs the
   latter; the freight slate left exits-vs-directions open.
10. ⚠ **The Delight/Kestrel inconsistency** (§ 2) — the locality build's
    to fix, but it must be written down before it hardens.

---

# Appendix — the six networks, updated

> Superseded by the build: roads and freight ship (`logistics.md`); rail is designed only, as the `edges[]` authored-lane hatch the Ferrow tramway proves. ⚠ [settlement-model.md § 8](../../settlement-model.md) still reads *roads: three rooms · freight: designed* — the corrected rows are in the compaction ledger's Handoff.

> ⭐⭐⭐ **Information is a complete graph. Goods are a star.** Perfect
> information, imperfect delivery. You always know the price in the city;
> getting your ore there is the whole problem.

That was true by construction before this build. **After it, the second
half stops being an assertion and becomes something a player does.**
