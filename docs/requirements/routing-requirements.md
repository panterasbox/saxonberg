# Routing — requirements

**Kind:** infra (refactor/sweep in character)
**Leads from:** kernel — first consumers are the **nine graph walks
already in the tree** (`transport`'s `planRoute`, four kernel perception
walks, `trade-apiculture`'s forage radius, `trade-mining`'s air reach,
`energy`'s feeder reachability, and `lib/location`'s invariant walk),
plus the two verbs that ride the first of them: `journey` (transport)
and the `hauls` brain (trade-haulage).

**One traversal primitive, and nothing else searches a graph.** Nine
independent walks over location adjacency ship today, each with its own
frontier, its own `visited` set, its own hop cap and its own notion of
admission. One of them — `LaneCatalogue.planRoute` — is the realm's only
pathfinder, and it is a placeholder: single-lane, legs-only, omniscient,
and it never consults the admission gate. This build replaces all nine
with one parameterized traversal on `NavigationApi`, of which *routing*
is a single accumulator, and holds the count at one with a ratchet.

⚠ **The justification is consolidation, not capability.** The realm has
three corridors (5 rooms, 3 rooms, 5 rooms) and
[logistics.md](../subsystems/logistics.md) is right that *"a discipline
needs somewhere to get lost, and a realm with two corridors has no
wayfinding in it."* Nothing here is blocked on a router. What is real is
that **a fragmented primitive makes the codebase lie to the next
reader** — the seeding slate's own census said *three* searches and
miscategorised one of them, because the population was scattered past
the point anyone could hold it. That cost is paid by every author and
every agent that arrives next, and it compounds.

Seeded by [pathfinding-slate](../slates/builds/pathfinding-slate.md) and
governed by [location-graph-slate § 18](../slates/tails/location-graph-slate.md),
which wrote this build's mandate when the graph shipped.

---

## What already exists

**The graph, and it is new.** `location_graph` — one node per place,
derived from content rows, rebuilt on demand, 124 places and 199 edges
today. Reads for the node, a zone's nodes, an extent's nodes, the
reverse edges, the cross-zone skeleton, and the edges into unpublished
ground. `published` is denormalised onto the node so the far-side gate
reads synchronously. Shipped last cycle (MR !335).

**The player's map, and its firewall.** One document per `(player,
locality)` under that player's own home, holding *claims* in four
channels — `walked` · `seen` · `searched` · `published`. Claims append;
nothing is ever corrected; where two claims disagree **both** render
with their dates. ⛔ Nothing joins the map to the graph, and the join is
refused on purpose: *"a relational view would be silently always-correct
and you could never be wrong… join on read and you have deleted being
lost from the game."*

**The `map` verb** (perception) — the index of localities you hold a map
of, and one locality's places grouped as the content declares them, each
line saying *how* you know it. Renders to self; no card. It is the map's
**only** reader today.

**The travel verbs.** `journey to <stop> via <lane>` (transport) is the
one that plans; `ship <goods> to <place>` (haulage) hands goods to a
carrier; `job post deliver` (work) is the spot market; `teleport`
(platform) has four forks including reading a departures board;
`register` and `procure card` (tpa) manage the travel credential.
Fifteen movement verbs ship — `go` · `walk` · `run` · `sneak` · `climb`
· `swim` · `fly` · `mount` · `dismount` · `ride` · `drive` · `hitch` ·
`unhitch` · `teleport` · `journey`. **There is no `route`, `travel`,
`navigate` or `explore` verb.**

**The exit, and what it already declares.** A direction, a destination,
`blocked`, `media[]` (which locomotion modes the opening admits),
`edgeMinutes` (how long the leg takes), and a single admission gate
taking the **whole mover** and answering with one of fourteen named
reasons — `blocked` · `locked` · `door` · `exitMode` · `bodyPlan` ·
`posture` · `enablement` · `capability` · `noConveyance` ·
`encumbrance` · `terrain` · `breakaway` · `unpublished` · `unbuilt`.

**The cost surface, deliberately opt-in.** Ordinary movement is
instantaneous and free; `edgeMinutes` is spent only by a Journey,
*because "moving around must not feel like netlag."* A player who walks
eleven rooms by hand crosses the same ground in zero game time.

**The Disciplines.** 76 ship. `teamstering` buys *"passage judgement and
load fit, **before you commit**"* with ⚠⚠ *"no conferral makes the same
act better"*; `awareness` grades perception and active search. **There is
no navigation, wayfinding or cartography Discipline, and its absence is
a recorded decision.**

**The nine walks.** `planRoute` (lanes, legs, single-lane); four
near-identical attenuating walks in the kernel (vision, sound, smell,
and the audience gather) each with its own `MAX_HOPS`, `visited`,
blocked-predicate and falloff accumulator; a bee's forage radius; a
mine's air reach; a power grid's feeder reachability; and the location
graph's own invariant walk.

**Therefore what is genuinely new here is** one traversal primitive and
its three accumulators; `media` denormalised onto the stored edge so a
lane is derivable from the index; planning against a traveller's
knowledge rather than the world; a stated search budget; all-pairs cost
over a stop set; and nine call sites collapsed into one with a ratchet
holding it there. **Everything else named above already ships.**

---

## Goals

- **One traversal is the only graph search over location adjacency in
  the tree**, parameterized on the edge set, the admission rule, the
  bound, the accumulator and the knowledge source — and a gate holds the
  count at one.
- **A traveller can plan a way somewhere without naming the lane.** The
  plan may cross any number of lanes of the same mode.
- **A plan can be made against what a traveller knows** rather than
  against the world, with no read-time join between the two.
- **A plan says what it assumed**, derived from the planner's own
  evidence rather than from anything they have not earned.
- **The map-planning path cannot reach the index.** It takes its graph
  as data and has no access to the world's, so the evidence firewall
  holds by construction rather than by the planner's good manners.
- **A plan is a hypothesis and the traverse is the verdict** — the live
  admission gate remains the final word, and a leg that fails halts
  where it failed.
- **Every search spends a caller-declared budget**, and exhausting it
  produces a refusal that says so — distinguishable from *no way
  exists*.
- **All-pairs cost over a set of stops is a read**, so a tour or an
  allocation can be computed above it without a second search.
- **A lane is derivable from the index** — the mode an opening admits is
  a fact on the stored edge.
- **Where several routes are genuinely incomparable, the traveller is
  offered them** rather than handed one answer computed from weights
  nobody chose.
- **The six outward walks behave exactly as they do today**, observably:
  sound carries as far, a colony forages the same radius, a mine's air
  reaches the same depth.

---

## Non-goals

- **Cargo and goods movement** → [logistics-slate](../slates/builds/logistics-slate.md),
  [freight-slate](../slates/builds/freight-slate.md),
  [supply-chain-slate](../slates/tails/supply-chain-slate.md). Gated by
  the user on the RGO roster closing, which is three builds out
  (foraging · hunting · subsurface fluid) plus two unwired halves
  (*nothing sows a field*, *nothing grazes*).
- **A tour optimizer for players, and the instrument that would run it**
  → cargo. ⭐ Players get the matrix and decide; see *Surface decisions*.
- **An edge capacity ceiling** (a footbridge no loaded dray may cross) →
  cargo. It does not exist anywhere today: `encumbrance` is in the gate
  vocabulary but is raised once, as a mover-side burden read.
- **The land-derived compute allowance** → the parcel/governance
  conversation, with two questions named and unresolved in *Surface
  decisions*. The per-search ceiling ships; the allowance does not.
- **Epoch gating of routes** (a medieval zone having directions rather
  than routes) → a later call; the authored-signs half is
  [onboarding-slate](../slates/builds/onboarding-slate.md)'s and unbuilt.
- **Wayfinding as a Discipline** → [trade-roster-slate](../slates/tails/trade-roster-slate.md),
  when the geography earns one. `logistics.md`'s refusal stands.
- **The map's renderer, its card and the annotation surface** →
  [map-slate](../slates/builds/map-slate.md), unblocked but not ours.
- **Client-side planning over a cached map** →
  [map-slate](../slates/builds/map-slate.md) or a tail beside it.
  Nothing here forecloses it, and ⭐ it is the **stronger form of this
  build's own firewall guarantee** rather than a performance idea: a
  server router *declines* to read the world, a client router *cannot*.
  See *Surface decisions* for the one thing this build does to keep it
  cheap.
- **The containment-graph walks** → a named later wave. The primitive
  takes the edge set as a parameter so containment *can* ride it; this
  build migrates location adjacency only, because "one solution" must
  not become a graph library with eleven callers and no contract.
- **Time-varying and scheduled edges** → refused here by decision (see
  *Surface decisions*); the disruption and rerouting half is
  [fast-travel-slate](../slates/tails/fast-travel-slate.md)'s.
- **Durative pedestrian execution** (a multi-zone walk that costs game
  time) → [locomotion-as-activity-slate](../slates/tails/locomotion-as-activity-slate.md).
  `journey` requires a vehicle; intra-zone walking executes as ordinary
  moves, which is the shipped semantics.
- **Auto-replan** → nowhere, deliberately. A blocked way must cost
  something.
- **The delivery overlay** → [delivery-slate](../slates/builds/delivery-slate.md),
  which sidesteps pathfinding on purpose and should keep doing so.
- **The pets `homes` brain and the fire spread** → nowhere. Neither is a
  graph search: one is memory, and the other is a one-hop spread whose
  `visited` set dedupes occupied scopes.
- **Rings of land use emerging from transport cost** → needs wholesale
  purchase and more than one market, neither of which exists;
  [supply-chain-slate](../slates/tails/supply-chain-slate.md).

---

## Placement

**The kernel**, under the existing navigation surface — the same place
the graph, the map reads and the direction table already live, and the
same logic singleton that already hot-reloads behind them.

Kernel rather than a pack `lib/` by the standing test: **substrate goes
to the kernel when its composers have no common pack ancestor.** The
consumers are `transport`, `trade-haulage`, `trade-apiculture`,
`trade-mining`, `energy` and the kernel's own perception layer. No pack
could own it without five others depending on that pack.

⭐ **Does a second instance need code? No.** A new pack with a graph
question calls the Api. A new edge set is an argument, not a subclass. A
new admission rule is a declared requirement on an edge compared against
a declared traveller profile — content, not code. A conditional edge
already plugs in by shape through the refresh protocol the lane compile
calls on *any* exit that has one, which is why a seasonal pass or a
tidal causeway needs no routing change.

⚠ **The compiles stay with their owners.** Transport keeps compiling its
lanes and energy keeps compiling its feeders; what they stop owning is
the *search*.

---

## Collisions

- **`LaneCatalogue`** (transport) owns the compiled lane graph and the
  realm's only pathfinder. The compile stays; `planRoute` retires. Its
  three callers are `journey`, the `hauls` brain, and `consigns` —
  which duck-types the shape rather than importing it.
- **`consigns`** (trade-shopkeeping) walks two doors down its own street
  and should keep walking its authored `ways:` list. It is the worked
  example of *ask how far the consumer is going* and must not become a
  router caller again. ⚠ **Two subsystem docs are wrong about it** —
  `retail.md` and `behavior.md` both say the hand *teleports* to the
  counter; the code says otherwise. Corrected in this pass, since we are
  in its caller already.
- **The four perception walks** are hosted by perception and will keep
  perception's semantics exactly. The attenuation, the atmosphere
  refusal and the per-room emission are theirs; only the frontier is
  ours. ⚠ Any observable change in how far a sound carries is a defect,
  not a consequence.
- **`GridCatalogue`** (energy) and **`Hive`** (apiculture) and
  **`Working`** (mining) each own a bound that is a balance decision —
  a feeder's reach, a forage radius, an air reach. Those numbers are
  theirs and move to being passed in, not redefined.
- **The `map` verb and the evidence firewall.** The router may read the
  graph; a map read may not join to it. Planning on a map must traverse
  the map's own claims. ⛔ The one thing this build must not do is give
  a player a sentence they could not have earned.
- **`Exit.canTraverse`** keeps its job and gains a reader at execution
  time, not at plan time.
- **The TPA network.** A terminal is a node in the graph and its routes
  stay a block on that node — ⚠ *"there is no `tpa` lane"* holds, and
  *"you must not need the Teleport Authority to teleport"* holds.
- **The three corridors** (the Delight road, the estuary, the Kestrel
  road) and the two TPA-only places that never join the road — the
  Lounge and Saxonberg — are the whole geography. Any drive step that
  needs a fourth corridor is a step that cannot run.

---

## Surface decisions

### One primitive, five parameters

**The question:** should a shared graph search exist at all, given the
seeding slate's warning that *"the wrong answer is a shared abstraction
nobody's consumer actually fits"*?

**The answer:** yes, and the slate's pessimism rested on a miscount. The
duplicated thing is not the pathfinder — it is the **outward walk**, and
there are six of them written out longhand. The primitive takes the
**edge set**, the **admission rule**, the **bound**, the
**accumulator**, and the **knowledge source**; the flavours are
accumulators rather than implementations. A *path* keeps its
predecessors and halts at a target; a *reach* collects everything
admitted; an *attenuating* walk carries a falloff and emits per node.

⛔ **And no policy lives in the primitive.** Whether a route refuses at
a mode break, whether a zone's epoch offers routes at all, whether a
traveller knows the far valley — all caller-side. A substrate opinion
nobody can opt out of is the failure the design lenses name explicitly.

### Planning and execution are different objects

**The answer:** a plan is inert information — nodes, costs, and what it
assumed. Execution is a sequence of ordinary traverses over game time,
each of which can fail. They are scored by different lenses and they are
not one object.

⭐ This is also what resolves the teleport question: **a plan may contain
a leg that says "take the service"**, executed by issuing the fork a
player would, while the graph still stores no teleport edge. An earlier
ruling conflated the graph's storage with the plan's contents.

### Admission is read as data; the gate is consulted at the traverse

**The question:** the placeholder never consults the admission gate, but
calling it per edge means resolving live objects per edge, which defeats
the index.

**The answer:** three ways, and the index carries the first.

| | where it lives |
|---|---|
| **edge-side facts** (`minutes`, `media`, `published`, dropped-if-blocked) | **denormalised into the index**, read as plain data in the search |
| **traveller-side facts** (body plan, posture, burden, capability) | a **declared profile** compared against the edge's declared requirements — still no live objects |
| **the live gate itself** | the authority at the **traverse**, never at the plan |

⭐⭐ So a plan is a hypothesis and the traverse is the verdict — which is
*why* no-auto-replan is right rather than merely preferred. The plan was
always provisional; a leg failing is the world answering.

And conditions reach the router by **graph recompilation**, never by
in-search checks. An unweighted search over a *current* graph is
correct; a condition-checking search is the wrong shape.

### `media` on the stored edge — required, not deferred

**The question:** the stored edge carries the **cost** already but not
the **mode** an opening admits. Can that wait for cargo?

**The answer:** no. A lane *is* the subgraph induced by media — *"you do
not draw a road: you author which exits admit `wheeled`, and the road is
the induced subgraph."* Without it the index can cost a wagon's route
and cannot say whether a wagon may take it, and **`planRoute` cannot be
retired** — which is this build's whole point. It was filed as a cargo
need and that was wrong; cargo is three builds out and this is needed
now.

### No auto-replan

**The answer:** a plan whose next leg fails halts at the place it
reached and reports why. The traveller re-plans deliberately.

**The reasoning:** a blocked way must cost something, or the geography
is decorative — and *a critical route must never be a single road* is a
lesson the player has to be able to learn. It also preserves the
barricade and train-robbery designs, which depend on halting at the node
*before*. The alternative (re-plan on arrival) was floated by the
governing slate and is rejected here.

### Scheduled edges are refused, not solved

**The answer:** a route will not be planned *through* an edge that opens
and closes on a timetable. The traveller routes to the terminal and
reads the board.

**The reasoning:** time-dependent shortest path is materially harder
than the static problem, and the governing slate's own lean is the
honest one — *it is what a traveller actually does.* Buying a harder
algorithm to replace an act a person already performs is a bad trade.

### Knowledge is the author's; budget is the caller's

**The question:** how much of the world does a travelling NPC know?

**The answer:** ⭐ **whatever its author says.** Nothing about an NPC's
knowledge is the engine's to assume — a shepherd who has never left the
valley, a courier who knows every road and a stranger with a bought map
are all legitimate and all authored. The knowledge source is a
parameter; scoping to an extent is a thing an author may *choose*.

The performance concern that tempted a default is answered separately
and explicitly: **every search spends a caller-declared budget** in
nodes expanded, and exhausting it is a **stated refusal** — *I could not
work out a way that far* — never a silent truncation and never a hang.
That also retires four per-caller magic numbers in favour of four
callers passing their own.

### The compute allowance is designed and deferred

**The question:** should pathfinding cost be a scarce resource owned by
the agent's owner — which for a player means the player?

**The answer:** the per-search ceiling ships; the **allowance** is
designed here and deferred. And when it lands it applies to
**unattended** search only.

**The reasoning.** Owner-pays is right, and the substrate for it already
exists: a parcel may be owned by a player, the doc comment calls that
case *a self-home owner*, and it resolves to the player's own home
subtree — the very place their map already lives. But charging a
**person** for a route they asked for with their own hands is an energy
meter: it taxes curiosity hardest, it is regressive against new players
who need routing most, it has no diegetic sentence, and it prices the
wrong thing. The expensive operation was never a human reading a map —
it is a brain searching **every beat**, which is what the economic
bootstrap did when it ran a breadth-first search over an inter-city
freight network to walk two doors.

⭐⭐ So the line is **attended vs unattended**, not player vs NPC:

| | cost shape | what it needs |
|---|---|---|
| **attended** — a human asked | bounded by hands | a **per-search ceiling** |
| **unattended** — a brain, a round, a script | recurring, unbounded | an **allowance**, charged to the owner |

A player who automates crosses that line and is billed, which is the
principled version of the same instinct. ⚠ Two questions remain open and
belong to parcel/governance, not here: whether the metering is
**structural** (graph size, checked where the projection is built, no
ledger) or **runtime** (searches metered, which is a currency); and
whether the land derivation is acreage or node count.

### A route states its assumptions from its own evidence

**The question:** the governing slate says the assumption list is *"the
diff between the two plans"* — the map's plan against the world's.

**The answer:** ⛔ **not that way.** That diff is live intel the
traveller never earned, handed over as a side effect of asking for
directions — the precise thing the evidence firewall was built to
prevent, one layer down.

The honest version derives the caveats from **the planner's own claims**:
their age, and the channel that recorded them. *This assumes the ford is
passable — you walked it forty days ago* is the same useful sentence,
leaks nothing, and makes better intel produce better routes, which is
what makes map annotation mechanically load-bearing at all.

### The map-planning path cannot reach the index

**The question:** the decision above says the planner must not consult
the world. Is honouring that enough?

**The answer:** no. ⭐⭐ **It must be unable to.** The map-planning path
takes its graph as data and has no reach into the index at all — the
same move the map *writer* already makes, applied to the reader.

**The reasoning, and it is the most important sentence in this
document:** ⚠ **nobody decided the placeholder should be omniscient.**
*"It plans against the world's current conditions"* is simply what you
get when a router has the world in reach and nothing prevents it. A
firewall that depends on every future edit choosing not to *"improve"* a
route by peeking at the graph is the failure we are replacing,
reintroduced with better manners. The location-graph build already drew
this conclusion for the writer — *"the evidence firewall is structural,
not policed… the map writer does not import `PlaceNode`"* — and the
reader needs it for exactly the same reason.

⭐ **This is also why client-side planning is the eventual stronger
form.** A server-side router declines to read the world; a client-side
one *cannot*, and every seam opened over the wire is an explicit,
enumerable, reviewable decision rather than ambient access. So the
boundary drawn here is not a stopgap — it is the same guarantee in the
softer of its two available forms, and keeping the primitive's core free
of server-only dependencies is what lets the harder form arrive later
without a second router.

⚠ **The server path never goes away**, which is precisely why this
matters: an author may legitimately grant an NPC every road, and a
freight optimizer needs the real network. Knowledge is already a
parameter; the isolation is what keeps the *attended* case honest while
the unattended one reads the world by design.

⭐⭐ And note where the line fell: **attended** search is a person's own,
over their own claims, structurally unable to cheat; **unattended**
search is authored, reads the world, and carries the budget. That is the
same seam the compute allowance landed on, reached from entirely
different reasoning — which is usually the sign of a real joint rather
than a convenience.

⛔ *How* the isolation is enforced is the plan's, not this doc's.

### Several routes, not one answer

**The question:** cost is a parameter — but a hauler cares about minutes
*and* risk *and* toll *and* wear.

**The answer:** where routes are genuinely incomparable, return the
non-dominated set with their costs on each axis. *Fast versus safe
versus cheap* is a decision a traveller should make, not a weight they
tune — and a single scalar collapses it into a number nobody chose.

### No new Discipline

**The answer:** none. `logistics.md` already decided it and the reason
holds — *a discipline needs somewhere to get lost.* The
competence-tightened estimate has a home already in `teamstering`, which
buys judgement *before you commit* and never a better outcome. Minting a
navigational Discipline now would ship declared capability nothing
reads, which is a failure this repo has paid for repeatedly.

### The cost-bounded reach is first-class

**The answer:** *everything within N minutes of here* is an accumulator,
not a later feature — it is the query a producer asks (*who can I reach,
and what is it worth delivered*) and the query a forager, a colony and a
power grid already ask in longhand. ⚠ It cannot produce land-use rings
today: that needs wholesale purchase and more than one market. The
primitive is right; the economy is not ready, and saying so is cheaper
than discovering it later.

---

## Lens pass

**1 · Pedagogy.** Strong, and the strength is in what we *refuse* to
compute. A route planned on your own map teaches the difference between
the map and the territory, and planning in time rather than hops teaches
that distance is duration. ⭐⭐ And the tour is the real lesson: handing
a player the optimal order deletes the activity, so the engine supplies
the **matrix** and the ordering stays a judgment. *The abstraction is
legitimate while it still costs somebody the activity.* ⚠ The gap: with
three corridors there is nothing yet to get lost in, so most of this
pedagogy is latent rather than live.

**2 · Creative expression.** An author adds an opening that admits
wheels and the road grows; adds a refresh behaviour and a tidal causeway
routes correctly with no engine change; declares what an NPC knows and
its routing follows. **The ordinary case needs no code and the bespoke
case breaks nothing**, because the policy is all caller-side and the
admission rule is declared data. The ratchet is what protects this —
the tenth hand-written walk is the thing that would make the substrate
unextendable.

**3a · Immersion.** The fiction does not betray itself: you are refused
a route you could not know, a leg that fails stops you where it failed,
and a timetable is read rather than solved. ⛔ The one way to betray it
is leaking the world's plan into the assumption list, which is why that
decision went the other way.

**3b · Participation.** Thin, honestly. The polity can do little new
here. The nearest thing is that better intel makes better routes, so
map-sharing and map-selling acquire a mechanical point they did not
have — but the market for them is `map-slate`'s and not built. **Recorded
as a gap.**

**4 · Values.** The forced choice is *fast versus safe versus cheap*,
and the design refuses to make it for you. The deferred allowance is
where the real values question sits, and it is deferred precisely
because *attended* and *unattended* turned out to be the morally
relevant axis rather than player-and-NPC.

**5 · Continuity.** The mechanism is epoch-independent — a graph with
costs and admission rules is as true of a towpath as of a rail network,
and the governing slate's own epoch rungs (*a medieval zone has
directions instead of routes*) sit **above** the primitive as caller
policy. Scheduled services and rail are data additions. ⚠ The epoch
gating itself is a non-goal here, so the ladder is designed and
unbuilt.

**6 · Economy.** It consumes authored openings and produces plans and
costs. ⚠⚠ **The demand is not there yet and this is the lens that says
so**: one distributor, no wholesale purchase, and producer stock arriving
by a spawn faucet rather than from anywhere. Routing makes goods movement
*cheaper*, never *possible* — freight is the optimization, not the
prerequisite. **This build is justified on lens 2 and the maintenance
cost, not on lens 6**, and pretending otherwise would be the circular
reasoning the rubber slate got caught by.

**7 · Governance.** Nothing judges a person here. The deferred allowance
*would* — it is a grant, so it needs a criterion, an appeal and an
entrenchment tier — and that is a second reason it belongs with
parcel/governance rather than in a routing build.

---

## The drive

Run in the live game, by hand, before the MR opens.

1. **Stand on the Delight road and plan without naming a lane.**
   `journey to <a stop two lanes away, same mode>` with **no `via`**.
   It plans and departs. *Today this is impossible: the lane argument is
   required, so you must already know the answer to ask the question.*
2. **Watch the legs run.** The journey advances leg by leg and arrives;
   the trip reads back while in progress.
3. **Ask for somewhere you have never been.** Route to a place absent
   from your map. **Refused, and the refusal says you do not know a way
   there** — not that no way exists.
4. **Earn it and ask again.** Walk the corridor, then repeat step 3's
   request. **It now plans.** ⭐ This is the whole thesis in two
   commands: better intel, better route.
5. **Read the assumptions.** A plan over ground you learned a while ago
   states what it rests on and how you know it — *assumes the ford is
   passable; you walked it N days ago.* Confirm the sentence cites
   **your claim**, and that nothing in it could only be known from the
   world.
6. **Hit a mode break.** Plan a route whose far end needs a different
   mode. It **stops at the break and names it**, rather than returning
   nothing. Breaking bulk stays the lesson; it becomes legible.
7. **Exhaust a budget.** With a deliberately tiny ceiling, ask for a far
   route. **The refusal says the search gave up** — and it reads
   differently from step 3's and from *no way exists*.
8. **Block a leg mid-journey**, then let the journey reach it. It
   **halts at the place before** and says why. Nothing re-plans.
9. **Confirm the firewall.** `map <locality>` still shows only your own
   claims, with disagreements rendered rather than merged, and nothing
   that appeared only because you asked for a route.
10. **Confirm the perception walks are unchanged.** Speak in a room and
    confirm it is heard the same number of rooms away as before, through
    the same doors, with the same attenuation; walk into an unlit place
    and confirm the sight walk behaves as it did. ⚠ Any observable
    change here is a defect.
11. **Confirm the pack walks are unchanged.** A colony forages the same
    radius and reports the same forage; a mine's air reaches the same
    depth and the damps read the same.
12. **Confirm the terminal still works.** `teleport` at a TPA terminal
    reads the departures board for everyone, and riding a route still
    arrives. No route was planned *through* it.
13. **Multi-stop cost.** Ask for the cost between several stops and get
    a figure per pair. Confirm **nothing orders them for you**.

⚠ Steps needing a fourth corridor cannot run; the realm has three. Any
step that silently degrades into *not refused* rather than *succeeded*
is a failed step — `refusedFor` alone is blind to a verb that was never
understood.

---

## Acceptance criteria

Observable from outside the code.

1. A player reaches a stop two lanes away by typing a destination and
   **no lane name**.
2. A player is refused a route to a place they have never been, in a
   sentence that says *you do not know the way* — and the same request
   succeeds after they walk there.
3. A plan over old ground **names what it assumes and how the planner
   knows it**, and contains nothing the planner could not have earned.
4. ⭐ **Changing what a traveller knows changes their route** — the same
   request, on a fuller map, plans differently. If it does not, the map
   is not being read, and the firewall claim is unproven rather than
   satisfied. (Drive steps 3–4 are this check in the form a player can
   see it.)
5. A route that needs a mode change **tells the traveller where the
   change is**, instead of failing silently.
6. A search that exhausts its budget says so, in words distinguishable
   from *no way exists*.
7. A journey whose next leg is blocked **stops at the previous place**
   and explains; the traveller re-plans by choosing to.
8. `map` shows exactly what it showed before — the player's own claims,
   disagreements intact — and asking for routes adds nothing to it.
9. **Nothing a player can perceive about sound, sight, smell, a
   colony's forage or a mine's air changes.**
10. A traveller asking the cost between several stops gets the costs and
   **is not given an order**.
11. Where two routes are incomparable, the traveller sees both with
    their costs.
12. A departures board still renders for everyone, and no route is
    planned through a timetable.
13. An author can make an opening admit a new mode, or declare what an
    NPC knows, **without writing code**.

---

## Cross-references

**Seeding slates**
- [pathfinding-slate](../slates/builds/pathfinding-slate.md) — the
  census, the three provenance captures, and the acceptance test
- [location-graph-slate § 18](../slates/tails/location-graph-slate.md) —
  **the governing mandate**: what survives the rewrite, and the
  requirement to plan from the player's map

**Subsystem docs**
- [location-graph.md](../subsystems/location-graph.md) — the projection,
  the player's map, the evidence firewall
- [logistics.md](../subsystems/logistics.md) — the standing routing
  decision this build overturns, the opt-in cost surface, and the
  refusal of a navigation Discipline
- [boundary.md](../subsystems/boundary.md) — the exit, `media`,
  `edgeMinutes`, the admission gate and its fourteen reasons
- [locomotion.md](../subsystems/locomotion.md) — modes, and the
  mode × speed × duration authority a cost model must not redefine
- [fasttravel.md](../subsystems/fasttravel.md) — the network, the board,
  and why a terminal is not a corridor
- [behavior.md](../subsystems/behavior.md) — the observability boundary,
  the deliberation beat, and diegetic failure
- [instrumentation.md](../subsystems/instrumentation.md) — competence
  resolves detail, never access

**Named onward**
- [map-slate](../slates/builds/map-slate.md) — the renderer and the
  annotation surface this build makes load-bearing
- [logistics-slate](../slates/builds/logistics-slate.md) ·
  [freight-slate](../slates/builds/freight-slate.md) ·
  [supply-chain-slate](../slates/tails/supply-chain-slate.md) — cargo
- [rgo-unification-slate](../slates/builds/rgo-unification-slate.md) —
  the roster cargo waits on
