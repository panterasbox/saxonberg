# Crew slate — a set of NPCs that acts as one, and the rule that says who acts

> **Status: UNBUILT, RESCOPED 2026-09-25** — nothing coordinates a set of
> NPCs outside combat, and a census that day found the reason is deeper
> than the missing rule: see § *The census* and § *The capability
> correction*. ⭐⭐ **The concept was renamed by the pass: a crew is a
> ROUTING RULE, not a coordinator** — *given a request, a set, and a
> required answer-size, name who is told to act, and say honestly when
> the answer is nobody.* It does not move anybody, sequence work, decide
> what the set does once fighting, or remember anything.
> **First build carved out (requirements written):** the
> capability-and-routing half —
> [crew-requirements](../../requirements/crew-requirements.md).
> **Left after it:** the whole push-at-range column (dispatch, the
> turnout, the hue and cry) and the brain-fact eligibility it needs · the
> mob's rule, if it turns out to need one (§ *the mob is an employer*) ·
> `actsAsOne`.
>
> What exists and is NOT this: `GroupApi` + its four
> `GroupProvider`s answer *membership* →
> [grouping.md](../../subsystems/grouping.md); `Party` answers *who is
> on my side in a fight*, players-and-mercenaries shaped →
> [party.md](../../subsystems/party.md); `CombatFormation` answers
> *what does my side DO*, over the threat graph →
> [combat-formations.md](../../subsystems/combat-formations.md);
> `AttendantMixin` queues the **customers** at a counter →
> [attendant.md](../../subsystems/attendant.md).
> **Size:** a build, now two — see the carve above.

---

## The question, in one line

> **Given a request, a set, and a required answer-size — name who is
> told to act, and say honestly when the answer is nobody.**

⚠ This line used to read *"a set of agents with a shared purpose, that can
answer who acts for us, for THIS — and can act as one when the answer is
'all of us.'"* The 2026-09-25 pass replaced it: **"acts as one" was
importing a coordinator, and a coordinator is four subsystems that already
exist** (§ *What a crew is NOT*). What is unowned is the routing.

Two consumers, one question, two arbitration rules:

| | the set | the request | the rule wanted |
|---|---|---|---|
| **the workplace** | everybody on shift who serves this trade | `order stew` | a queue, or first-free |
| **the mob** | a pack, a patrol, a gang | a greeting, an insult, a drawn blade | who speaks; and when does the whole set turn |

## ⭐ Where this came from

MR !280 (trades & the labor market) shipped `Position.fulfills` — the
list of disciplines a seat serves an `order` in — and the user's
review question was the right one: *does that satisfy all the different
kinds of businesses we might need it for? multiple people, or no one, or
it rotates?*

Three cases, and the answers were not the same:

- **no one** — handled. `covers` puts the proprietor on a fulfilling
  seat; failing that the refusal is honest.
- **it rotates** — handled, by the roster. Rotation over TIME is
  `rosterSlots` + shift windows; `fulfills` is time-blind and the
  on-shift read makes it rotate.
- ⚠ **multiple people** — *not* handled, and the MR is what made it
  reachable. `resolveMaker` returned the first match in **container
  order** — insertion order, which means nothing. Invisible while one
  venue had one fulfilling seat; wrong the moment the Hearthworks had
  three over one business.

That MR closed the half that is genuinely *eligibility* (a smith does
not cook, so `fulfills` names disciplines and `resolveMaker` matches
them). What it could not close is *arbitration*, and it left two
placeholders that this build retires:

1. `CraftingLogic.resolveMaker` breaks ties on **lowest identity path**.
   Predictable beats arbitrary, and neither is right: it means Odo
   always serves and his kitchen-hand never does.
2. `Organization.beginCover` covers **the first fulfilling seat** in
   authored order.

## ⭐⭐ The shape, and why `Warren` is the precedent

The user's framing: *we already have a general solution for this, but
for locations — `Warren`.*

**Where the analogy holds.** A `Warren`'s real content is not
containment, it is **elastic membership plus a compiler that refuses to
let you skip the hard question**: `occupantsOf` is declared *abstract*,
so a warren cannot be written without choosing inner or outer. Same
machinery at two cardinalities, members joining and leaving live. That
is exactly the shape a crew wants — and the reason the residence ladder
is one doc and one code path rather than three
([holding.md](../../subsystems/holding.md)).

**Where it does not.** A `Warren`'s mechanism *is* containment: members
are rooms, occupancy is standing inside one. A crew's members are not
contained by it, they are enlisted in it. So this is a rhyme in
structure, not a reuse of the class — the thing to copy is the
**abstract-arbitration** discipline, not `occupantsOf`.

The concrete proposal to argue with:

```
Crew                      — the substrate. Elastic membership.
  abstract actorFor(request): member | null    ← the forced choice
  abstract actsAsOne(request): boolean         ← does the whole set turn?

WorkCrew   — members are on-shift holders of fulfilling seats
             actorFor = a queue, or first-free
MobCrew    — members are a pack roster
             actorFor = the leader, or the nearest
             actsAsOne = true for a threat, false for a greeting
```

⚠ **`actorFor` must be abstract for the same reason `occupantsOf` is.**
`Warren` shipped with the leaf answer as a concrete default and the
outer tier had to remember to override it — a warren that forgot read
every holding as its own occupant. A crew that forgets its arbitration
rule would silently pick whoever is first, which is precisely the bug
this slate exists to retire.

## The half already recorded

[party.md](../../subsystems/party.md) § Deferred already names *"an
NPC-vs-NPC **crew** standup — a durable-party seeder so two NPCs share a
side without a live player forming the party."* That is the mob case,
written down and waiting. What it does not cover is the workplace case,
because `Party` is combat-shaped (`memberIds` are an Avatar `playerId`
or a Mercenary `templatePath`; the reads are `sideOf` / `areAllied`).

⭐ **The sharpest one-line statement of the gap**: `AttendantMixin`
queues the *customers* at a counter. Nothing queues the *staff*. The
demand side of a storefront has had a substrate since the attendant
build; the supply side has never had one.

## The census — 2026-09-25

Run before the first build was scoped, because the slate's own
justification turned out to describe a world that does not exist.

**How much is there to coordinate.** ⭐ **70 authored NPC rows in the
whole game.** The largest co-located set of cast anywhere is the bar's
**5**; the next is **3** (the mine's drift — a hewer, a canary and a
pit-pony, two of which are not co-actors). Everything else in the realm
is 1 or 2.

⚠⚠ **And arbitration is live NOWHERE.** Across **34 employers**, the
count of workplaces with two simultaneously-on-shift holders of
same-discipline seats is **zero**:

- **Dave's Bar**'s four bartenders are staggered with no overlap at all
  (06–14 · 14–22 · 22–06 · weekends). At no hour are two behind the rail.
- **The Hearthworks** — cited by this slate as the house with three
  fulfilling seats — has its `kitchen-hand` seat **unrostered**. Odo cooks
  alone.

So the tie-break's own comment (*"Odo always serves and his kitchen-hand
never does"*) describes nobody. **Every seat in the realm was authored as
a singleton with staggered hours, because nothing supported anything
else.** The census measures the absence of the mechanism, not the absence
of demand — and the demand is visible in the four places an author
reached for a second pair of hands and got a seat that cannot work:
`headcount` is authored on the tailor's shop (2, one filled), the
university farm (2, none filled), the general store's `hand`, and the
Hearthworks' `kitchen-hand`.

⭐⭐ **The one live consequence is exactly player-shaped.** The tie-break
sorts ascending on identity path. A player's is
`/platform/agent/Avatar/<id>`; Mara's is `/world/lounge/agent/mara`; Odo's
is `/world/terminus/hearthworks/agent/cook`. `p` sorts before `w`:

> **The first player to join any crew takes every order, forever, and the
> NPC staff beside them go silent.** The world stops working the moment
> you participate in it.

Which is also why nothing ever caught it: no NPC crew has ever existed to
expose it, and the only path that reaches it is a player being hired.

## What the engine has already refused, three times

*"A lot of NPCs come in packs"* is a question this project has answered
before, and each time by declining to model the many as agents. **This
bounds the substrate permanently** — the addressable population is the
carved cast, never the crowd:

| the many | how it is modelled | the doctrine |
|---|---|---|
| a herd | a **record** | *"There is no herd-object to `look` at, and there never will be."* The individual animal is the base case |
| a school of fish | a **derived number** on a river reach | nothing is minted until one is landed |
| a crowd | **prose** | ⭐ *"Derive the crowd; simulate the cast. The ambient crowd is PROSE, not objects… prose for bulk, Stuff for few, NPCs for a full session."* |

A pack is therefore either **carved cast** (few, nameable, a crew's
business) or **prose** (many, not agents). There is no third case, and a
crew that reaches for one is importing an agent model the design has
refused in writing.

## The matrix — the axes the police example produced

The sharpest probe put to this design was *the city watch acts together,
and since the age of radio so does the station and dispatch.* It broke an
assumption nobody had noticed: the shipped resolver reaches into
`loc.getContents()`, so **"same room" is not the rule — it is a hardcoded
acoustic reach of one room.**

[policing-slate](policing-slate.md) already contains the epoch ladder,
written as skins of one capability:

> **summon** — brass whistle · signal horn · **aether alert** · flare · a
> rune that flashes

⭐ **Radio did not change the mechanism. It changed the reach.** The same
wall-socket property lens 5 prizes. The whistle itself is *already
shipped* (an Audible push with distance-honest falloff), the slate's
thesis is *"response time is geography"*, and its open question 9 is
literally *"how many constables answer, from how far, how fast."*

Two more axes fall out. The watch does not want **one** member — a
whistle wants everyone who can hear it, a formation wants each member in
a role. And who does the choosing is a third:

| | **pick one** | **pick some** | **all who can** |
|---|---|---|---|
| **in reach · push** | the rail · the counter | three constables on one brawler | the hue and cry · the turnout |
| **out of reach · push** | **dispatch** | *"send two more"* | all units respond |
| **out of reach · pull** | **the job board** ✅ | — | the open bounty ✅ |

**Shipped: the bottom row** (`job post` / `job claim` / escrow), plus the
summon itself, plus what a side does once fighting (formations). **Missing:
the entire push column.**

⭐⭐ **And the bottom row is the best justification this build has.** Look
at haulage: it rosters a **dispatcher** ("keeping the book") and a
**carter** ("on the road") — and the coordination between them is *the job
board*. The carter **claims**. This engine already built dispatch, and
built it as a market.

> **The engine has the worker-chooses answer and no boss-chooses answer.**
> A crew is assignment where there is currently only claiming — a
> labor-relations statement, not a defect fix.

⚠ **Do not ship `reach` and `cardinality` as parameters with one live
value each.** The honest form: **the selector does not compute the set, it
is handed one.** Then "in reach" is the *caller's* question — the rail
hands it the room's on-shift fulfillers, a station hands it a roster, a
whistle hands it everyone who heard. Nothing unused ships and the watch
build supplies a different set instead of rewriting a parameter. The one
thing to refuse is what the code does today: resolving the candidate set
*inside* the resolver, which is what silently made one room the law.

## ⭐⭐⭐ The capability correction — the gap under everything

The pass proposed a split between requests that *carry an act* (a drink
order: the engine crafts as the chosen maker) and requests that *carry an
intent* (a callout: the member must go and act). **The user rejected it,
correctly:**

> **"I would think requests should always be about intent.
> response/fulfillment is about acts. if the current staff of dave bar
> doesn't actually know how to mix drinks to satisfy orders thats a gap in
> my opinion, not a feature."**

The split was a rationalization of one verb's exemption, and the
measurement is worse than the argument. [crafting.md](../../subsystems/crafting.md)
says it plainly — every craft verb shares one knowledge gate
(*"the can-make deed gate … the one gate `forge`/`cook`/`make` share"*),
and then:

> **`order <item>` … Never knowledge-gated.**

…alongside the already-flagged consequence that *"a recipe's discipline is
credited, never gated — so a wrongly-picked maker crafts successfully and
is credited with a trade they do not practise."*

⚠⚠ **And the reason `order` is exempt:** across all 70 NPC rows, 47
author a competence band, 63 author behaviours, 44 author a costume, and
**zero author any recipe knowledge whatsoever.** Gating `order` today
would close every bar, kitchen and smithy in the realm. The output's grade
derives from the inputs, the recipe's base and the *tools'* control bands
(*"skill embedded in the capital raises the floor"*) — the maker's own
competence never enters. **A maker earns a Transcript deed from work their
competence did not affect.**

So eligibility has three parts, collapsed into one:

| | asks | consulted today |
|---|---|---|
| **the seat** | who **may** — on shift, `fulfills`, present | ✅ only this |
| **the person** | who **can** — do they know it, how well | ❌ |
| **the brain** | will they **carry it out**, when it is not instantaneous | ❌ |

⭐⭐ **Capability comes before arbitration, and mostly dissolves it.** Two
bartenders and a Negroni is not a tie once knowledge is consulted — Sloane
does not know that one and Remy does, and the refusal can *say so*, which
is the refusal-as-progression-UI shape rather than a coin flip. Arbitration
is the small residual for when both genuinely can.

**The seeding answer, derived not authored:** the dossier already expands
a band into the Transcript rows a lived history would have written; it
expands the same band into **can-make deeds** — the recipes in that
discipline at or below what the band supports, against each recipe's own
authored `difficulty`. One mechanism for players and NPCs both, no
authored tables, and `mixology: proficient` vs `competent` immediately
becomes a difference in *what each can make* instead of a decorative
label. **The gate applies to players symmetrically** (decided
2026-09-25).

## ⭐ The mob is an employer

[policing-slate](policing-slate.md) models the gang as *"a Business that
commits crimes"* — street level, corner boss, top, as a roster with
positions. The watch ships as an `Organization` with one `picket` seat.

**So the mob rides the same employer substrate as the workplace, and
`MobCrew` as a separate subclass may be a fiction to delete before it is
written.** What is genuinely the mob's and nobody else's is `actsAsOne`;
its distinctive other half — who is deliberately *not* named — is the
accountability ledger's, not a coordination question.

## What a crew is NOT

Eight questions a set of agents can be asked. Only one is unowned and real:

| # | the question | verdict |
|---|---|---|
| 1 | who is **in** the set | ✅ shipped — the grouping facade; a crew **consumes** a provider (the contract is members + a coarse `owner\|admin\|member` role, with no room for behaviour) |
| 2 | who **acts** on this request | ⭐ **this slate.** Per-request lifetime |
| 3 | who **speaks** for us | same mechanism, standing lifetime. No consumer yet |
| 4 | do we **all turn** at once | combat's inside a party, and it works; three constables are already routed to the shipped `vanguard`. The mob's pre-fight version is unowned and thin |
| 5 | do we **stay together** spatially | ⚠ **does not exist anywhere in this game.** No patrol of more than one, no convoy, no caravan; herds move as a record. Building it would be invention, not generalization |
| 6 | divide a **standing task queue** | ⚠ not a distinct question — it is the arbitration rule renamed. ⚠ But a **pipeline** (prep → cook → plate: one order, several actors in sequence) genuinely is one, and no parameterizing of a selector produces it. Unowned, unbuilt, named here so nobody tries |
| 7 | **succession** | partly shipped (party captain FIFO, `reportsTo`); belongs with employment |
| 8 | **collective memory** | belief is per-viewer **by design**; not this |

Two more cases tested and placed: **triage** (the request carries priority
and reorders the queue) is the demand side's, and `AttendantMixin` already
has a `reception` recognized-priority discipline; **a jury** is sortition —
governance is explicit that *"a jury is a selection from a pool, not a
seat"* — and belongs to civics.

## ⭐ How brain-fact eligibility would be expressed

Already precedented, so the out-of-reach column needs no new concept when
it lands. A brain declares statics the framework reads without
instantiating — `label`, `claims` (engagement slots it occupies while
acting), `requiresFree` (slots that must be free), and:

> `open?()` — **the responder-open seam**, implemented only by dialogue
> brains. `talk` resolves the host's dialogue spec by path and calls it to
> begin a conversation; distinct from `act`.

⭐ **That is routing to a brain, shipped.** `talk` asks *does this host
have a brain that declares it can receive a conversation*, and gets back
`ok` or `no-tree` / `busy` / `no-viewer`. An assignment is the same seam
with a different verb. The statics are **brain-declared, not author-set**
— deliberately, *"so the spec stays `{brain, trigger, config}` and the
contention wiring comes along with the brain"* — so a pack ships a brain
and its NPCs become routable with **no kernel list edit and no row
change**.

Two things come free: `requiresFree` already answers *is this member
busy*, so first-free needs nothing new; and `busy` is already a modelled
refusal reason, so *nobody is available* is already sayable.

⚠ **But of 24 kernel brains and 11 pack brains, none declares it can
receive an assignment**, and there is no constable brain and no watch
department. The push-at-range column costs brain work *and* has no
consumer until the content that needs it ships. That is the line the first
build stops at.

## Open questions — what the 2026-09-25 pass closed, and what is left

**Closed:**

1. ~~**Is a crew a `GroupProvider`?**~~ **It consumes one.** The provider
   contract is members plus a coarse `owner | admin | member` role and has
   no room for behaviour; bolting routing onto it would violate its
   designed leanness. The party provider (stateless, reading straight
   through its own object graph) is the shape to copy if a crew ever also
   wants to answer membership.
3. ~~**Does `actsAsOne` belong here or in the formation layer?**~~
   **Neither owns it.** Formations resolve *inside* an already-open fight
   and presuppose a party; nothing computes whether a set turns hostile.
   It stays open but it is **not blocking**, and it has no consumer until
   a pack exists.
5. ~~**Nothing fires anybody.**~~ Still true, and now placed: it is the
   *bar-economics* build's, not the routing build's — a crew reads a
   roster and does not care how a name leaves it. Sits with
   [livelihood-slate](livelihood-slate.md) §5.4.

**Still open:**

2. **Does the workplace crew derive or persist?** Unchanged, and the pass
   narrowed it: the on-shift holders derive every tick, so **a queue
   position across a relog is the only reason to persist**, and it may be
   the only one. If the authored rule is first-free rather than a queue,
   nothing needs persisting at all.
4. **What does a player crew member do to the arbitration?** ⚠ Sharpened
   into the build's central fairness question by the census — a player is
   the *only* actor who can make arbitration fire (they `clock on`
   voluntarily, unbound by a roster window), and the current tie-break
   hands them **every** order. Whatever the rule is, it decides about a
   person who can tell.
6. ⭐ **Does the answer-size ever exceed one, in-reach?** The turnout and
   the hue and cry say yes; nothing in the realm needs it yet. Deciding it
   early risks an enum with one live value; deciding it late risks the
   watch build rewriting the resolver.
7. ⭐ **Does the substrate own the notification?** *"The actor is told"* is
   either ours or the caller's. If ours, we own a push channel — the piece
   with the most epoch surface (a shout · a whistle · an aether alert).
8. **Is `MobCrew` real at all**, given policing models the gang as a
   Business? § *The mob is an employer*.

## ⚠⚠ Blocked on the brain substrate (2026-09-25)

The routing half of this slate is **downstream of
[brain-substrate-slate](brain-substrate-slate.md)**, which was opened the
same day after the crew design turned out to be a layer of dynamism
balanced on an undesigned one. What that pass changes here:

- **`first-free` is unimplementable today.** 17 of 38 brains declare no
  engagement slot, so a farmer working a field reads as idle. The crew's
  simplest possible rule cannot be evaluated against the current roster.
- **Routing without importance is meaningless.** Nothing preempts an idle
  timer; `BehaviorBeat` declares `interruptibleBy` **empty**, so an NPC
  greeting you cannot be interrupted by anything the framework can say.
- ⭐⭐ **The selector may not survive.** The brain pass lands on *a posted
  job is a candidate for every eligible agent, and assignment is a job
  posted to a named agent* — which makes **a crew a policy over claim
  order** rather than a separate mechanism, over a board that already
  ships. The `actorFor` selector this slate proposes is the push-shaped
  answer to a question the pull side may already own.
- ⭐ **`actorFor`'s replacement, if so:** a candidate's **urgency band plus
  its reason** — which gives the crew *"Mara is restocking; Remy is free"*
  for free, instead of a boolean free/busy.
- **What is NOT blocked:** the capability half — `order` consulting whether
  the maker knows the recipe — is a **seat and person** fact and needs
  nothing from brains. It stays shippable on its own
  ([crew-requirements](../../requirements/crew-requirements.md)).

## Cross-references

- [party.md](../../subsystems/party.md) — the crew standup, already deferred there
- [grouping.md](../../subsystems/grouping.md) — the membership facade and its four providers
- [attendant.md](../../subsystems/attendant.md) — the demand-side queue this is the twin of
- [combat-formations.md](../../subsystems/combat-formations.md) — collective action, combat-side
- [holding.md](../../subsystems/holding.md) — the `Warren` two-tier precedent
- [employment.md](../../subsystems/employment.md) — `Position.fulfills`, the eligibility half
- [livelihood-slate](livelihood-slate.md) §5.4 — firing, the trust ramp, the NPC offer
