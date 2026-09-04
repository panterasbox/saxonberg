# Logistics — requirements

**Goods move over real ground, by somebody, on paper.**

Today the realm's supply chain works and is a lie. The shipped
`consigns` and `restocks` brains carry a producer's stock to a
distributor's counter and a venue's shortfall back to its shelf, every
act a literal verb through `forceCommand` — and both brains say in their
own headers that *"movement between the floor and the counter is a
`teleport`."* Distance is free. It is the same magic as the bar's
`populates:` bottles, one level up the chain and still standing.

⚠ And there is nowhere to walk instead. Every `destination:` in every
shipped locality was checked during the seeding conversation: **zero
exits cross a locality boundary.** Terminus, Hinkley Hills, Rejection and
newbie-wilds are islands stitched together only by TPA terminals. The
freight slate's premise — *"you do not author roads, you author which
exits admit `wheeled`, and the road network is the induced subgraph"* —
has no graph to induce from.

> **The realm has teleportation and no roads. This build delivers both
> halves: real ground between the settlements, and an industry that
> moves goods across it for money.**

The forcing function is the last deliverable, not the first:
`consigns` and `restocks` stop teleporting. Everything else exists to
make that possible without breaking the economy that depends on them.

⭐⭐ **And there is a second purpose, which is arguably the larger one.
Hauling is the first labor market that can be transferred from NPCs to
players.** It has no skill floor — anyone can carry a crate, which is
exactly what a brand-new player brings; demand for it is universal
rather than one trade's; and a haul is perfectly parcelable, which is
what the shipped gig substrate already models. Once the brains walk
instead of teleporting, **every NPC-performed haul is visibly a job a
player could have taken.** The pattern this build establishes —
*post the work, let players take it, let the NPC cover the residual* —
is the one every NPC-run sector will need.

Seeded by [logistics-slate](../slates/builds/logistics-slate.md) (the
parent design; eleven decisions taken in conversation 2026-09-03) with
[freight-slate](../slates/builds/freight-slate.md) as the detail sibling
for the Journey, the depot and the antitrust arc. Rides the shipped
[conveyance](../subsystems/conveyance.md) /
[locomotion](../subsystems/locomotion.md) haulage substrate,
[spatial](../subsystems/spatial.md)'s `Vessel` / `ExitableVessel`,
[boundary](../subsystems/boundary.md)'s mode-gated exits,
[address](../subsystems/address.md)'s coverage walk,
[watershed](../subsystems/watershed.md)'s reaches and derived
navigability, [encumbrance](../subsystems/encumbrance.md),
[activity](../subsystems/activity.md),
[contract](../subsystems/contract.md),
[chattel](../subsystems/chattel.md),
[document-store](../subsystems/document-store.md),
[retail](../subsystems/retail.md) and
[employment](../subsystems/employment.md).

---

## Goals

- **G1 — The realm is contiguous.** A player can walk from Terminus to
  Rejection using ordinary movement only: no TPA, no wizard flag, no
  gap. The corridor follows the water, because rivers cut the only
  gradeable path.
- **G2 — A transport mode is a lane over the shared node graph.**
  Locations and containers stay the atomic unit of travel; a mode is an
  edge set over them, and a `Route` is an ordered node sequence plus a
  **stop set**. Express versus local is one lane with two stop sets.
- **G3 — A journey is durative and observable.** Issuing the order is a
  command; advancing the journey is the scheduler. The vehicle is
  physically present in each node it passes, so a busy road is visibly
  busy and an interception is possible without an interception system.
- **G4 — The player-operable rungs of the cost surface exist.** Back
  and handcart ship; this build adds **wagon + team** and **barge**, and
  the load model that lets them carry crates and grain.
- **G5 — Goods travel without their owner.** Consigning to a carrier
  produces a **bill of lading**; the goods are then in a real container,
  in a real place, genuinely at risk, and the shipper is elsewhere.
- **G6 — Haulage is a business.** A carrier publishes a **rate card**,
  takes work through the shipped gig board, employs drivers, and is paid
  into its own account.
- **G7 — The shipped brains stop teleporting.** `consigns` and
  `restocks` complete their loops over the road, at real cost, without
  regressing the venues that depend on them.
- **G8 — Carrier-side trade data is queryable.** No reporting
  subsystem: the bill of lading *is* the datum and MQL is the query
  language.
- **G9 — The teleport-ripple defect is fixed.** Teleporting while
  mounted or hitched must not silently leave the animal or the cart
  behind.
- **G10 — Hauling is a trade you can get better at.** A discipline
  measures it, competence buys **information and bigger rigs** (never a
  faster wagon), and the career ladder from porter to operator runs on
  the shipped business ladder rather than on a stat.
- **G11 — Hauling is the first player labor market.** Supply work is
  **posted before it is performed**; a player may take it; the NPC
  covers what nobody takes, so the economy stays DAU-independent while
  the labor market stays legible.
- **G12 — The empty return is visible.** A hauler standing at the far
  end can see what wants moving back, so the collective waste of a
  deadhead run is something players can see and fix.

## ⭐⭐⭐ The four lenses

The standing design method, recorded because running it is what caught
the largest gap in this doc's first draft.

| lens | what this build delivers | |
|---|---|---|
| **Pedagogy** | transport cost → land use; **capacity vs reach** — why technologies coexist rather than replace; the private record precedes the public one; custody, bailment and documents of title; rate discrimination as a table rather than an accusation; **why intermediaries exist** | ✅ |
| **Creative expression** | a carrier business with a name, a mark and a published rate card; routes and schedules; a depot and what it holds | ⚠ thin — **you cannot make a wagon** (the wainwright gap, a non-goal) |
| **Immersion / RP** | the road as a place you pass through; the carriage as a social space; the driver's hands full, so an escort is mechanically necessary | ⚠ **conditional on the corridor rooms earning their length** |
| **Gamification / self-improvement** | ⭐ three layers — **personal** (D15 teamstering), **economic** (porter → carter → carrier → operator, a career not a stat), and **collective** (D17 backhaul; reliability as scoped renown) | ✅ *after* D15–D17 |

⚠ **The first draft of this doc scored zero on the fourth lens** — no
disciplines, no ladder, no labor market. D15, D16 and D17 exist because
the lens pass found that, and they are the reason this build is worth
more than a road.

---

## Non-goals

Each names where it lands instead.

- **Customs, tariffs, checkpoints, registration, free movement, public
  returns.** ⚠ **Blocked, not deferred by preference**:
  [civics.md](../subsystems/civics.md) states there is *"no legal
  machinery — no statute engine"*, and the seeding decision was that
  customs powers are **enacted, never defaulted**. There is nothing to
  enact them with. → **the border build**, downstream of
  [legal-code-slate](../slates/builds/legal-code-slate.md).
- **Inspection** — the power to search everyone who crosses. → the
  enforcement build, which owns the search machinery.
- **Rail lanes, timetables, the ore train.** The lane substrate must be
  general enough that rail is a **data addition**, but no rail ships. →
  content, landing with [Heart's Delight](../staging/hearts-delight.md).
- **Tollgate, turnpike trust, barricade, banditry, piracy, the train
  robbery.** One coherent later build. → **the contested road build**.
  (This is also why the barricade-on-exits-vs-lane-edges question is not
  answered here.)
- **A `navigation` discipline, wayfinding, cartography, maps as goods.**
  ⭐ **A discipline needs somewhere to get lost**, and a realm with two
  corridors and one road has no wayfinding in it. It arrives when the
  graph does. → a later build, once the road network branches.
- **Congestion.** A road is non-rival until it isn't, but with two
  corridors and a handful of haulers there is no traffic to congest. →
  the contested road build, alongside road wear and maintenance.
- **The wainwright / wheelwright.** ⚠ A named gap in
  [vocations.md](../vocations.md) and a real hole in the creative-
  expression lens — you cannot *make* a wagon in this build, only own
  one. → a crafting-branch question, not this build's.
- **Standards, slot dimensions, weights and measures, the weighbridge.**
  → its own small build; a general mechanism, not a freight one.
- **Live cargo and drovers** — the steer walks, the carcass rides. →
  with **ranching**, in flight in a sibling worktree.
- **Price indices, rival baskets, the coverage ratio.** → the returns
  build; they want trade data to exist first.
- **Heart's Delight the town.** This build authors the **road** through
  the valley and a **crossroads node with a depot site**; the packing
  house, the co-op, the tower and the cast belong to its own build.
- **Saxonberg and the Lounge joining the map.** Excluded by design —
  Saxonberg is the diegetic seat of the Compact, meant to be built by
  decree of the pact.
- **Auto-replan around a blocked route.** Blocked means blocked; the
  driver re-issues. Auto-routing hides the geography this build exists
  to make real.
- **Runaway draft teams** when the reins drop; **multi-actor crews**
  (driver + guard + loader); **driver-external vehicles** (a teamster
  walking beside the team). All named gaps in
  [conveyance.md](../subsystems/conveyance.md) § *What v1 doesn't
  cover*; all stay gaps.
- **Refrigerated transport and spoilage in transit.** → the
  preservation thread.
- ⚠ **The Delight/Kestrel inconsistency.**
  [hearts-delight](../staging/hearts-delight.md) says Rejection's fouling
  reaches the valley; the hydrology has the two tributaries meeting only
  at Terminus. Recorded here so it is not discovered late — **it is the
  locality build's to fix**, and it changes who has standing to sue whom.

---

## Surface decisions

### D1 — The corridors that ship, and how they terminate

Two, plus the one already shipped.

| corridor | mode | note |
|---|---|---|
| Terminus ↔ the valley crossroads ↔ **Rejection** | road; `wheeled` for its whole length except the pass | the spine; ore down, capital and manufactures up |
| Terminus ↔ **the estuary** | water | the export road; Wharfside's reason to exist |
| ✅ Terminus ↔ Hinkley Hills | road | five rooms, already shipped |

The valley crossroads is authored as a **node with a depot site** — the
road, the ditch and an empty yard — and nothing else. Heart's Delight's
own build fills in the town around it. This is that doc's own *"author
the site and no building"* trick applied one level up.

⚠ The Kestrel is navigable **below the confluence only**. The authored
hydrology already says why: the gorge is *"steep enough that no boat has
ever been up it."* Nothing new decides this; the water build did.

**newbie-wilds attaches past Rejection**, at the uncounted end. It gets
an exit onto the corridor; its interior is not this build's.

### D2 — A lane is an edge set; a `Route` is nodes plus a stop set

Locations and containers remain the **quantum layer** — every leg is a
real `traverse` between real containers, and nothing goes off the map.

A lane's two independent numbers are **stop density** (where you may
board or alight) and **duration** (game time per edge). The traveller's
experience falls out of them, and teleportation stops being a special
treatment: **the TPA is the limit case — a lane with no intermediate
stops and no duration.**

An edge may **pass through** nodes it does not stop at, which is what
lets people at the crossroads watch traffic go by without boarding it,
and what means the region never has to be carpeted in rooms.

⚠ **The substrate must not assume the operator is a player.** Rail and
the TPA are incumbent networks in the design; nothing in the lane or
`Route` shape may make a corpo-run or authority-run lane
unrepresentable.

### D3 — A vehicle is a `Mobile` vessel; openness governs what you see

Boarding is `move(you, carriage)`. The occupant does not move again
until they alight; the *vehicle* is genuinely in each node. The shipped
conveyance ripple already carries occupants when the host moves.

A vehicle with a navigable interior is an `ExitableVessel`; a flat-bed
wagon is a plain `Vessel`.

⭐ **Perception out of a moving vehicle needs no new seam.**
[perception.md](../subsystems/perception.md) makes
`MixinApi.isOpenContainer` the single rule that `canReach`, the MQL
`peers` walk, `mustBeInLocation` and `VisionModality` all ask, and *"a
shut `Sealable` is opaque."* So **you see out of an open wagon and not
out of a sealed van** — a content decision per vehicle, not an engine
one.

### D4 — The Journey is a sustained engagement whose beat is one leg

Per [freight-slate](../slates/builds/freight-slate.md) § *The Journey*,
adopted unchanged:

- a **`SustainedEngagement`** with a recurring emission, not a
  `DurativeActivity` — a journey's duration is not trustworthy up front,
  and a fixed timer would lie to the player;
- **each beat issues the same `traverse` a player would**, so mode
  gates, `canTraverse`, the conveyance ripple and the haulage tow all
  run on the shipped path and the journey cannot silently bypass a gate;
- **arrival is a completion, not an abort**;
- the engagement occupies the **`hands`** slot: `body` and `attention`
  stay free, so **a driver cannot fight back** and **a passenger holds no
  engagement at all**, which is what makes an escort mechanically
  necessary rather than merely sensible;
- the engagement lives on the **driver** (`EngagedMixin` is on
  `Character`), so abort halts the vehicle;
- **combat is not in `interruptibleBy`** — being shot at does not stop
  your wagon; stopping is the driver's own cancel;
- **transaction boundary per leg**: re-validate before each step, and
  failure is `preconditions-changed`;
- abort reasons `route-blocked`, `vehicle-disabled`, `team-exhausted`,
  declaration-merged; **reuse `combat`** rather than minting an ambush
  reason.

### D5 — Duration is priced in vulnerability, and the long haul is long

> **A journey takes time so that there is a window in which the cargo is
> on the road and can be taken, taxed, inspected or lost.**

Which makes the number derivable rather than a taste call: **transit
must be long enough that someone who learns a shipment is moving can
reach the road and act on it.**

⚠ **An earlier draft of this doc put the spine at 30–60 real minutes.
That was wrong, and wrong in a specific way worth recording:
`kestrel:headwaters` at 1400 m is the *water's* elevation, and it was
read as *Rejection's*. The town declares no elevation at all** — its
zone file carries `deposit:` and explicitly nothing else. Nothing in
shipped content says Rejection is high, and the realm is one basin a
few hours across, on the San Francisco Bay model (Mt Diablo is 1173 m
and ~30 km from the water).

The clock is **12×** — one game hour is five real minutes
([time.md](../subsystems/time.md)). So:

| leg | game time, loaded | real |
|---|---|---|
| Terminus ↔ Hinkley Hills | ~20 min | ~1.5 min |
| Terminus ↔ the valley crossroads | ~30 min | ~2.5 min |
| crossroads ↔ Rejection (the climb) | ~40 min | ~3.5 min |
| **Terminus ↔ Rejection, end to end** | **~90 min** | **~7.5 min** |
| the same walked, unloaded | ~60 min | ~5 min |

Seven and a half real minutes is the longest haul in the realm — ample
for the vulnerability rule, and short enough that a player-driver can
sit through it.

#### ⭐⭐ And the correction changes the industry's premise

At basin scale **distance is cheap**, so von Thünen cannot carry the
industry on its own:

> **Hauling is a business because of CAPACITY, not distance.** You
> cannot carry 400 kg for ninety minutes. *It is far* was never the
> reason.

That is truer to the cost surface this build is built on — capacity ↔
reach is the axis and distance never was — it matches how most real
freight works (short-haul), and it removes the temptation to inflate
journey times to make them feel important. Von Thünen still runs; the
rings are simply tighter.

Beat interval derives from exit `speed` / `defaultDurationMs`, modulated
by **mode** and **load**, so a heavy wagon is genuinely slower.

⚠ Everything here is **game time**. Per the freight slate's ⭐⭐⭐⭐
invariant, **no economic entitlement may depend on the rate at which a
member's commands are processed.**

### D6 — Load: containers and bulk, both, with no new mechanism

Cargo rides as `Container` contents for discrete goods (crates, tools,
bottles) and in `Bulkable` slots for continuous matter (grain, ore,
water). A vehicle is a `Vessel` — already a Container — that also
composes `Bulkable`. Capacity is mass and volume against the shipped
encumbrance surface, not a cargo-slot count.

### D7 — The bill of lading, and the warehouse receipt beside it

Consigning to a carrier produces a **bill of lading**: what, how much,
from where, to where, whose, and at what declared value.

> **It is not a reporting feature. It is the paper a carrier needs to
> prove what they took and a shipper needs to prove what they sent** —
> and it happens to be the datum every statistic in the design reads
> from.

Its sibling the **warehouse receipt** ships with it, because a depot
that holds goods is a bailee and owes a duty of care. The receipt is a
**document of title**: you transfer the receipt instead of moving
anything. It takes the bearer/registered split already made for
credentials — **a bearer receipt is a Thing you can steal; a registered
receipt is a record you cannot.**

Both are **Documents**, not a new collection (see Constraints).

### D8 — The depot ships, as a business

A depot is the **interface** — where a lane touches the local economy —
and every piece of it is a shipped shape: an **attendant queue** (the
counter), a **warehouse** (storage), and a **`Business`** with positions
and an account. `consign` already works there, so **no new verb**.

It sells two things that fail independently: **handling** (a transaction
service — consolidation) and **storage** (a time service). Only the
second carries the bailee's duty.

Two ship: one at Terminus and the **site** at the valley crossroads.

### D9 — Rates are a published card, and gigs may take it or negotiate

A carrier publishes a **rate card** — a Document naming its charges by
route, weight and commodity. A haulage job is a shipped
[contract](../subsystems/contract.md) gig with a custody clause and
escrow, which either takes the card rate or negotiates a different one.

> **Rates must be visible and settable.** Visible, because rate
> discrimination is the antitrust arc's evidence and must be a table
> rather than an accusation. Settable, because a carrier that cannot
> choose its prices cannot be the villain of that arc.

### D10 — No ghost logistics: every service is a payroll

`EngagedMixin` is on `Character`, so every moving vehicle has somebody
driving it — an NPC if not a player. Background freight runs on a
**`hauls` brain** using **the same Journey object**, on the `delivers`
and `consigns` precedent; there is no second implementation.

Consequence, and it is wanted: freight is a **job**, wages are a real
cost line, and industrial action against a carrier stops something.

⭐ **Amended by D16:** the brain is the *fallback* supplier, not the
first one. Work is posted before it is performed.

### D11 — The brains come off teleport

`consigns` and `restocks` are rewritten to move goods over the road.
This is the build's forcing function and its highest-risk change: the
venues that depend on them are shipped, live content.

⚠ The loops must still **close** — a bar that cannot restock because the
road is slower than the drinking is a regression, not a lesson. Par
levels, batch sizes and cadence are retuned as part of this decision,
not left to discovery.

⭐ **Amended by D16:** the rewritten loops **post a gig first** and only
haul it themselves when the window expires unclaimed.

### D12 — Reporting is MQL over the paper, and there is no aggregate yet

No reporting subsystem, no new store, no dashboard. Bills of lading and
rate cards are Documents; the questions the design wants answered —
*what moved from X to Y this season*, *what did carrier C charge on
route R*, *what is the spread on this good between two markets* — are
**queries**.

⭐ And the honest consequence of shipping without customs: **private
books do not aggregate.** Nobody sees the realm's trade, only their own.
The first institution that can see across is not the state — it is the
**depot**, whose records cover everything it handled, so **its coverage
is its market share**. The state's rival instrument arrives with the
border build, and the gap between the two is the point.

### D13 — Namespace: the ways are a system, the hauling is a trade

Per the five namespace axes, split on *"a system is true whether or not
anyone is participating in it"*:

- **the lane, the `Route`, the Journey and the vehicle substrate** are a
  **system** — roads and rivers exist with nobody employed by them;
- **the carrier, the rate card, the depot business and the `hauls`
  brain** are a **trade** — practised by somebody, and quittable;
- **the corridor rooms are locality content**, owned by the places they
  run between, per *TRADE = mechanism, LOCALITY = expression*.

The exact roots and pack boundaries are the planner's; the **axis
assignment is not**.

### D14 — The teleport ripple is a defect, and this build fixes it

> **Teleport ripples what is *on* you and refuses what you are
> *attached to* — and says why.**

Worn gear and pack come along, or teleport strips you. Being **mounted
or hitched refuses the ride** with an honest message naming what
blocked it. Silent failure is the thing being killed.

### D15 — `teamstering` is the discipline, and band 0 must be able to earn

⚠ **An earlier draft of this doc had no disciplines at all**, which said
hauling is unskilled labour forever with no ladder. That was the
gamification lens failing, and it is corrected here.

**`teamstering` ships with this build** — hitching, load balance,
passage judgement, and handling a team. ⚠ **Draft animals ride it**,
because there is no husbandry discipline: all 46 shipped Disciplines
were checked and animal handling is not among them.
[freight-slate](../slates/builds/freight-slate.md) lists *"husbandry
(existing)"* for draft beasts and **that is an error in the slate.**

Conferrals split along the standing rule — *competence buys
information, not outcomes*:

| band buys | what | why it is legitimate |
|---|---|---|
| **information** | passage judgement (*will my rig make that turn*) and load-fit readouts **before you commit** | the same readout ladder as the gun and `analyze` — it never changes the outcome, only what you knew going in |
| **capability** | **bigger rigs** — a novice handles a single-horse cart, a competent teamster a four-horse team | a *different act*, not the same act done better: the known-of→can-make ladder, never the odometer failure |

⚠ **Per the instrumentation doctrine the readouts are stanzas on the
shipped `measure` / `analyze` views, not new verbs.**

> ⭐ **Band 0 must be able to earn.** If teamstering gates entry it stops
> being the labor market that takes a brand-new player, which is the
> entire point of D16.

⭐ And the growth that matters most here is **not a stat**: the career
ladder is **porter → carter → carrier → operator**, which runs on the
shipped business ladder, and a carrier's reliability is **renown, scoped
to the places they serve** — *"the quality signal is TRUST, not
measurement."*

### D16 — ⭐⭐⭐ The work is posted before it is done; the NPC is the fallback

**The build's second purpose, and the pattern every NPC-run sector will
reuse.** A business's supply need becomes a **gig on the board** with a
window. A player may take it. **If nobody does before the window
expires, the NPC hauler covers it.**

Three things this buys at once:

1. the economy stays **DAU-independent** — the standing commitment
   holds, because the NPC always covers;
2. every NPC-performed haul is **visibly a job a player could have taken
   and didn't** — the labor market is legible even when nobody is in it;
3. ⭐⭐ **the NPC is the reserve supply, so it sets the wage.** A player
   cannot charge more than the NPC costs and need not accept less. The
   reservation wage, doing real work.

> ⭐⭐ **The NPC is the market-maker of last resort.**

Two risks, named rather than discovered:

- ⚠ **A taken-and-failed gig starves a venue.** The window must expire
  back to the NPC, and the shipped contract substrate's escrow +
  custody clause handles the loss.
- ⚠ **The NPC's rate is a load-bearing tuning dial** — it sets the wage
  level for the whole first labor market. It ships as **authored data
  with a comment saying so**, never a constant somebody picked.

### D17 — The empty return is visible on the board

⭐ **Backhaul is the collective lesson, and it is nearly free.** A wagon
returning empty has done half the work for all the cost, and **you
cannot solve your own backhaul** — you need someone else's cargo going
the other way. That is a coordination problem with visible waste, which
is what makes logistics the cleanest domain for one.

The gig board ships, so a return load is just **a gig posted in the
other direction**. All this decision requires is that gigs carry
**origin and destination**, so a hauler standing in Rejection can see
what wants moving to Terminus.

Which teaches the genuinely non-obvious thing: **why intermediaries
exist.** A forwarder who matches loads produces real value while
touching nothing — the opposite of what most people assume about
middlemen.

⚠ Consolidation, congestion and road wear are the *other* three
collective structures and are **out** (see Non-goals). Backhaul is in
because it costs a field.

---

## Constraints

- ⚠⚠ **No new Mongo collections.** The bill of lading, the warehouse
  receipt and the rate card are **Documents in the path-addressed tree**
  under the owning parcel; `AccessApi.canAtPath` is the authority. Any
  new document kind joins the closed `DocumentKinds` vocabulary.
- ⚠⚠ **No migrations, no legacy, no compat shims.** There are no users
  and no data. A rename means dropping the dev database, not writing an
  adapter.
- ⚠⚠ **Verbs go on objects.** `lint:object-verbs` census stays at zero —
  no `XApi.verb(host, …)` where the verb belongs to the host. An Api
  orchestrates; a read or mutation belonging to one object lives on that
  object.
- ⚠⚠ **`requiresWizard` is TypeScript-only.** A depot's warehouseman, a
  carrier's dispatcher and any official act are **seats**, never wizard
  checks. If a stand-in seems needed, that is a **missing seat** and it
  gets filed as a finding.
- ⚠ **Every location plots.** Corridor rooms carry coordinates —
  coordinates are grid *membership*, and a room without them is in no
  grid and inherits nothing.
- ⚠ **Unlit is pitch black.** Outdoor corridor rooms need their light
  resolved; a covered wagon interior needs a source, or every object in
  it reads as *"something."*
- **Apis are per-subsystem, never per-feature or per-concept.** No new
  Api may be minted for a concept that belongs on an existing face, and
  the `XApi` ↔ `XLogic` split is mandatory for any that is.
- **A pack must never need a kernel list edit** — groups, roots and
  title claims derive.
- **Nothing instances `/lib/`**, and a pack's own `lib/` holds only
  substrate that is inherited.
- **Content is copied, not shared.** A second corridor, a second depot
  or a second carrier must need **zero new pack code**.
- **The wall-clock invariant.** No rate, duration or entitlement may be
  denominated in real time or in command throughput.
- **Competence surfaces as bands only.** The Competence scalar never
  crosses the Api boundary; a conferral is a band × Catalogue lookup.
  No teamstering number is ever shown or stored.
- **No conferral may make the same act better.** A discipline may buy
  information or unlock a different act; it may never make a wagon
  faster on the same road.
- **The full suite runs at exactly two moments** — before the MR opens
  and at `/finalize`. Everything between is `test:near` plus the touched
  packs plus the lint family.

---

## Acceptance criteria

**The realm**

1. A player walks from Terminus's market square to Rejection's pithead
   yard using ordinary movement only — no `teleport`, no wizard flag —
   and back.
2. The corridor's `wheeled`-admitting subgraph is authored, and at least
   one segment (the pass) **refuses** wheeled traffic, with an honest
   message.
3. A barge runs the Kestrel below the confluence and **cannot** ascend
   past the gorge.
4. newbie-wilds is reachable on foot from Rejection.

**Movement and the journey**

5. A journey issues exactly one `traverse` per leg through the shipped
   movement path; no second movement implementation exists.
6. A journey aborting mid-route leaves the vehicle in the node it
   reached, with `route-blocked` / `vehicle-disabled` / `team-exhausted`
   distinguishable in the envelope.
7. A driver on a journey cannot wield; a passenger on the same vehicle
   can, and holds no engagement.
8. A passenger in an **open** conveyance perceives the room the
   conveyance is in; a passenger in a **sealed** one does not.
9. A loaded wagon's end-to-end spine transit measures 6–12 game hours,
   and scales with load.

**The trade**

10. Consigning goods to a carrier produces a bill of lading naming what,
    how much, from, to, whose and declared value; the goods are in the
    carrier's vehicle and the shipper is not.
11. A depot issues a warehouse receipt; a **bearer** receipt can be
    taken from its holder and a **registered** one cannot.
12. A carrier's published rate card is readable by a non-employee, and
    two different rates on one route are distinguishable in the record.
13. A haulage gig with a custody clause completes, pays escrow, and
    leaves chain-of-title correct at both ends.
14. An NPC carrier moves goods on the `hauls` brain with no player
    present, using the same Journey object.

**The forcing function**

15. ⭐ `consigns` and `restocks` complete their loops with **zero
    `teleport` calls**, and Dave's Bar and the distributor's counter are
    still stocked after a long unattended run.

**The trade you can get better at**

15a. A character with **no transcript at all** can take a haulage gig,
    complete it, and be paid — band 0 earns.
15b. Practising haulage appends Transcript rows against `teamstering`,
    and crossing a band confers the larger-rig capability; the
    Competence scalar is never surfaced.
15c. A competent teamster's passage and load-fit readouts are **richer
    than a novice's for the same rig on the same road**, and the
    journey takes the **same** time for both.

**The labor market**

15d. A venue's supply need appears as a **gig on the board before** any
    NPC acts on it, carrying origin, destination and a window.
15e. A player who takes that gig and delivers is paid, and the NPC does
    **not** also perform it.
15f. A gig whose window expires unclaimed is performed by the NPC, and
    the venue is stocked either way.
15g. A hauler at the far end of a corridor can list gigs whose
    **origin** is where they stand — the backhaul is findable.

**Reporting**

16. MQL over bills of lading answers *what moved from X to Y in a given
    period* and *what a named carrier charged on a named route*.
17. A depot's own records cover every consignment it handled and no
    others.

**The defect**

18. `teleport` while **hitched** refuses, naming the cart. `teleport`
    while **mounted** either brings the mount or refuses honestly —
    never silently separates.

**Housekeeping**

19. A subsystem doc exists at `docs/subsystems/logistics.md` and is
    linked from CLAUDE.md's documentation map (added at sweep).
20. `pnpm lint` and the lint family are green, including `lint:schema`,
    `lint:instanceable`, `lint:untitled`, `lint:census`,
    `lint:locations`, `lint:object-verbs` and `lint:imports`.
21. No new Mongo collection was added.
22. A live drive — not only the suite — exercises the spine end to end:
    consign at Terminus, haul to Rejection, deliver, read the paper.

---

## Cross-references

**Seeding slates** — [logistics-slate](../slates/builds/logistics-slate.md)
(parent) · [freight-slate](../slates/builds/freight-slate.md) (detail:
Journey, depot, antitrust) ·
[delivery-slate](../slates/builds/delivery-slate.md) (sibling: addressed
items) · [supply-chain-slate](../slates/builds/supply-chain-slate.md)
(the magic this build removes)

**Subsystem docs** — [conveyance](../subsystems/conveyance.md) ·
[locomotion](../subsystems/locomotion.md) ·
[spatial](../subsystems/spatial.md) · [boundary](../subsystems/boundary.md) ·
[location](../subsystems/location.md) · [address](../subsystems/address.md) ·
[watershed](../subsystems/watershed.md) ·
[encumbrance](../subsystems/encumbrance.md) ·
[activity](../subsystems/activity.md) ·
[perception](../subsystems/perception.md) ·
[contract](../subsystems/contract.md) · [chattel](../subsystems/chattel.md) ·
[credential](../subsystems/credential.md) ·
[document-store](../subsystems/document-store.md) ·
[retail](../subsystems/retail.md) · [employment](../subsystems/employment.md) ·
[attendant](../subsystems/attendant.md) · [behavior](../subsystems/behavior.md) ·
[time](../subsystems/time.md) · [mql](../subsystems/mql.md) ·
[advancement](../subsystems/advancement.md) (Discipline, Transcript,
bands, conferrals) · [renown](../subsystems/renown.md) ·
[participation](../subsystems/participation.md) ·
[vocations](../vocations.md) (the wainwright gap)

**Doctrine** — [measurement.md](../measurement.md) (the three layers;
the engine may publish quantities, never a verdict) ·
[settlement-model.md](../settlement-model.md) § 8 (the six networks) ·
[antipatterns.md](../antipatterns.md)

**Staging** — [hearts-delight](../staging/hearts-delight.md) ·
[rejection](../staging/rejection.md) ·
[newbie-wilds](../staging/newbie-wilds/README.md) ·
[terminus-city](../staging/terminus-city.md)

**Downstream builds this defers to** — the border build (customs;
blocked on [legal-code](../slates/builds/legal-code-slate.md)) · the
contested road build (tollgate, barricade, banditry) · the returns build
(indices, coverage ratio) · Heart's Delight · ranching (live cargo) ·
the enforcement build (inspection)
