# Crew slate — a set of NPCs that acts as one, and the rule that says who acts

> **Status: UNBUILT, RESCOPED 2026-09-25** — nothing coordinates a set of
> NPCs outside combat, and a census that day found the reason is deeper
> than the missing rule: see § *The census* and § *The capability
> correction*. ⭐⭐ **The concept was renamed by the pass: a crew is a
> ROUTING RULE, not a coordinator** — *given a request, a set, and a
> required answer-size, name who is told to act, and say honestly when
> the answer is nobody.* It does not move anybody, sequence work, decide
> what the set does once fighting, or remember anything.
> **The build (requirements written 2026-09-30):**
> [agent-coordination-requirements](../../requirements/agent-coordination-requirements.md)
> — the arbiter, the call and the capability gate as ONE build. ⭐ They were
> three until the *no cheap paths* rule was applied: same code path, same
> drive venues, same verification bill, so splitting paid it three times.
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
[agent-coordination-slate](agent-coordination-slate.md)**, which was opened the
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
  ([agent-coordination-requirements](../../requirements/agent-coordination-requirements.md)).

## ⭐⭐⭐ The casting pass (master, 2026-09-29/30) collapses the tie-break

[quest-modeling-slate](quest-modeling-slate.md) § *casting happens three
times* names the failure this slate's proposed rule was committing:

> **Reaching for pass-1 vocabulary to make a pass-2 decision.** A
> capability predicate used as a casting criterion **selects for competence
> and therefore produces the obvious pairing every time. That is allocation
> wearing casting's clothes.**

**Two consequences, and the second is a real simplification:**

1. ⭐ **Name it allocation.** The rail is not a story, and *"the better
   specialist gets the cocktail"* is the honest answer for work. But it must
   never be sold as characterful — character enters through the archetype
   (pass 2) and the switch-prose, never through the comparison.
2. ⭐⭐⭐ **`junior-first` dissolves.** It was an authored third leg
   justified by fiction (*the senior is counting stock*). Under
   [agent-coordination-slate](agent-coordination-slate.md)'s urgency bands the
   senior's *serve-this-order* candidate simply reports a **lower band**
   because they are mid-count — so the junior serves as a **consequence,
   not a rule**. The three-legged chain
   (`first-free → specialist → junior`) becomes one derived comparison, and
   the crew stops authoring a preference it cannot justify.

**And arbitration is a pass-3 question**, which retrospectively explains
this slate's census confusion: *"arbitration is live nowhere"* was measuring
pass 2 (authored rosters, all singletons) and concluding something about
pass 3. ⭐ Pass 3 cannot be authored — which is why a **player** is the only
actor who makes it fire, and why the fairness stakes are what they are.

⭐ **The understudy is one seam, not three.** Quest's open n+1 (*"Dave dies;
the understudy steps in"*), the shipped `covers` brain (the proprietor
filling a gap), and a crew whose rostered member is absent are the same
pass-2→3 override. Three slates were holding it separately.

## ⭐⭐⭐ Crews and quests — what unifies, and what must not

Asked 2026-09-30: the casting pass came out of a conversation about
**quests** — small narratives inside larger ones, roles defined by a plot —
while this slate is about **business units assembled by function**. Do they
unify?

### The criteria must stay apart

[quest-modeling-slate](quest-modeling-slate.md) already drew the line and it
is the valuable part:

> A capability predicate used as a casting criterion **selects for
> competence and therefore produces the obvious pairing every time. That is
> allocation wearing casting's clothes.**

**Allocation selects FOR fitness. Casting selects AGAINST type.** Same
mechanism, opposite objective functions; unifying them reintroduces the
exact error that section exists to name.

⚠⚠ **And the hard boundary: a crew must never serve a plot.** If the rail
routes your drink to advance a story, the simulation stops being honest and
the GTA property — *roleplay emerges from an honest sim, it is never
designed for* — dies with it (lens 3).

### But the SHAPE is one shape

> **A binding is a slot, a predicate, and a lifetime.**

| | slot | the predicate reads | lifetime |
|---|---|---|---|
| **crew** | who serves this | availability, capability | **one request** |
| **quest** | «informant» | drama — regard, history, what telling would cost | **one plot** |
| **employment** | `head-bartender` | the seat's `requires` criterion | **one employment** |

⭐ **It earns its keep by predicting something true:** the understudy exists
at all three lifetimes — the shipped `covers` brain is the *one-request*
substitute, quest's open n+1 is the *one-plot* substitute, and a vacancy is
the *one-employment* substitute. **Three slates were holding one seam**, and
`covers` was the instance nobody had recognized as one.

### ⭐⭐⭐⭐ The transfer worth having — a RELATIONAL leg

The quest slate's complaint applies to this slate verbatim: **if the rail
always routes the cocktail to the best mixologist, the bar is a vending
machine with a skill table.** Its third relation row — *derived: the slot
resolves against **your** ledger, per viewer, **systemic*** — is exactly
what a real bar does:

> **Your regular serves you.**

Per-viewer, derived from history nobody authored, and **computable with
shipped calls today**: `recognizes()` is already read by the `introduces`
brain, and regard already exists ([belief.md](../../subsystems/belief.md),
[trait.md](../../subsystems/trait.md)).

It passes every lens the competence leg strains — derivable (1), a person
rather than a skill table (3), and the criterion is nameable (6): *"because
he knows you"* is a better answer than *"because he is better at
cocktails."*

⭐⭐ **And it gives a PLAYER bartender something nothing else in this design
does: you accumulate regulars.** A reason to take a job and keep it, wholly
emergent, nothing authored. **The strongest player-facing argument this
build has.**

⭐⭐⭐ **DECIDED 2026-09-30 — the relational leg sits ABOVE capability.**

> **User: "above capability, your regular serves you for sure."**

So **your regular serves you even when they are worse at it.** That is the
line between a bar and an optimizer, and it is the decision that makes this
allocation *hospitality* rather than a skill table. ⚠ It also means the
competence leg is a **fallback**, not the primary rule — which inverts the
chain this slate originally proposed, and is the second leg of that chain to
fall (junior-first was the first).

### Three smaller transfers in

- ⭐ **A ritual is a quest with no player in it.**
  [daves-bar-slate](daves-bar-slate.md) calls the shift-change (count →
  total → reconcile → hand off → deposit) *"the next scripting-language rung
  after recipes"* and *"the NPC rituals ARE scripts"* — beats firing on
  conditions, cast from a crew. So the hand-off needs **no bespoke code**,
  it needs quest beats pointed at a roster. A *when-quests-ship* note.
- **The casting collision is shared, and we have the instances.** Quest asks
  what happens when Dave is «informant» in one story and something else in
  another; three shipped people already double-hat — Mara (bartender +
  keeper), the smelter's buyer (buyer + assayer), Odile (registrar +
  magistrate).
- **Specificity is pass 2 in both.** How named a crew member is (Mara versus
  *a* bartender) is the same decision as how specific a quest's cast is.

### ⭐ And one transfer OUT — what quests get from the brain design

> **The urgency band is what stops a quest NPC being a puppet.**

If a quest asks an NPC to act, it is a candidate like any other — so an NPC
mid-shift has a **reason** not to drop everything, and a quest **asks
rather than commands**. That is the difference between a world with people
in it and a world with actors waiting for cues. See
[agent-coordination-slate](agent-coordination-slate.md).

## ⭐⭐ The name — it is a CALL, not a crew and not a troupe

Asked 2026-09-30: the dramatic metaphor (`Staged`, `cast:`, `props:`,
`costume:`, `Offstage`) wants **Troupe** where the fiction wants **Crew** —
*"but it depends on what we're building exactly… which layer are we in?"*

**The layer question answers it.** Look at how the metaphor is actually
used: `props:`, `cast:` and `costume:` are **row keys an author writes**;
`StagedMixin` is engine substrate; `Offstage` is a room whose *purpose* is a
staging purpose. In the fiction, props are objects and cast are people —
nobody in Terminus says "prop."

> ⭐⭐ **The theatre metaphor names the AUTHORING and STAGING layer. The
> fiction gets plain words.**

So **Troupe** would be right for a company an author assembles, and **Crew**
would be right for the group as the fiction sees it — and this design needs
**neither**, because the redesign decided the set **derives** from the
roster and is not modelled as a thing. What a house authors is a **rule**.
⚠ Which means this slate is named after an object it decided not to build;
the nouns actually shipped are a *policy*, a *resolver*, a *candidate* and
an *arbiter*.

### ⭐ And the metaphor already supplied the right word

[balance-slate](balance-slate.md), the same week, reaching for exactly this:

> *"**A stage manager**, by contrast, can tell you exactly **who is called
> tonight**."* · *"a show has a **company** and a **tonight's cast list**,
> and they are different sizes."* · *"the primary axis is **ON NIGHTLY
> versus CALLED**."*

| this design's concept | the word | layer |
|---|---|---|
| every seat-holder | the **company** | derived, never authored |
| who is on right now | **called** — tonight's cast list | pass 3 |
| how the house decides | the **call** | the authored rule |

⭐⭐⭐ **"Calling" beats both crew and troupe because it names the ACT OF
SELECTING**, which is the only thing this design builds — and it settles the
layer exactly as `props:` does: Equity's vocabulary at the engine and
authoring layer, plain words in the fiction.

### The resolution

- **"Crew" stays in prose** for the fiction. The bar has a crew; nothing
  models it.
- **The authored thing is a call policy** — *how this house calls*. Not a
  group noun.
- ⭐ **`Troupe` stays unspent.** If the mob, or a watch turning out, ever
  needs a *group* noun at the authoring layer, the question bites then and
  the word will still be there.
- **The rename rides the requirements rewrite** (decided 2026-09-30) rather
  than landing on its own: this slate is cross-referenced from
  [agent-coordination-slate](agent-coordination-slate.md),
  [agent-coordination-requirements](../../requirements/agent-coordination-requirements.md),
  [party-slate](../tails/party-slate.md), [policing-slate](policing-slate.md)
  and [employment.md](../../subsystems/employment.md), so it is a small sweep
  and it is cheapest bundled with the rewrite that is coming anyway.

## ⛔ The board unification — CUT from the build, kept as the grain

Cut at plan grounding, 2026-09-30, after the code survey priced it. The
direction stands; the field does not ship.

**What grounding found.** `GigSpec` is
`{boardPath, condition, rewardMinor, claimMode, asBusiness?, expiresGameHours?, originPath?}`
— **no assignee** — and `ContractRecord.claimant` fills only when somebody
calls `claim()`. ⚠ That is an **invariant, not an omission**: *every actor
(poster, claimer, presenter, completer) is context-derived, never
caller-supplied*, for attribution.

**Why it was cut** — the seven-lens pass, run on the question alone:

| lens | verdict |
|---|---|
| **2** Expression | ⛔ **against** — [#93](../../lenses/93-the-nameless-quality.md): *does the substrate impose properties nobody asked for?* An addressee on **every** contract record, for one unbuilt consumer |
| **6** Economy | ⛔ **against** — [#30](../../lenses/30-emergence.md)'s *add a consumer, derive the producers*: there is no consumer, and the demand test fails |
| ⭐⭐ **7** Governance | ⛔ **decisive** — an addressed assignment decides *you specifically must do this*, and **nothing anywhere can refuse one**. A criterion with no appeal, which is the exact failure lens 7 was carved out of lens 6 to catch |
| **5** Continuity | ○ mildly **for** — dispatch from a whistle to an aether alert wants one mechanism. ⚠ But lens 5 *inherits lens 2's* verdict, and lens 2 is against |
| **1** Pedagogy | ○ neutral |

**And the cost was not only a field.** `ContractRecord` carries escrow and an
append-only `contract_events` chain — money-adjacent code, in a behaviour
build.

### ⭐ Kept as the grain, with the attach point named

Per [design-lenses](../../design-lenses.md) § *every answer has an altitude*:
**the grain binds nothing, but the substrate is *for* this.** So it is
recorded rather than built:

- **The substrate IS for boss-chooses assignment.** The engine has the
  worker-chooses answer (`job post` / `job claim` / escrow; haulage's
  dispatcher and carter already coordinate by claiming) and no
  boss-chooses one. ⭐ *Push versus pull collapses when the claimer is an
  AI, because the claim happens in the same tick as the posting.*
- **The attach point, so nothing has to be re-derived:** `claimMode`
  (today `exclusive | open-bounty`) gains an **addressed** member — a
  vocabulary extension, not a new concept — and the resolver already takes
  a **handed-in candidate set**, so an addressed posting needs no change
  there at all.
- ⚠⚠ **And whoever builds it owes lens 7 an answer first:** *can the
  addressee refuse, on what criterion, and what is the appeal?* That
  question is the reason this is not in the coordination build, and it is
  not a detail — it is the difference between an assignment and an order.
- ⚠ **The divergence risk to watch:** the call policy must not grow its own
  private assignment notion that later has to be reconciled with the board.
  If a second routing mechanism appears, that is the tell.

## Cross-references

- [party.md](../../subsystems/party.md) — the crew standup, already deferred there
- [grouping.md](../../subsystems/grouping.md) — the membership facade and its four providers
- [attendant.md](../../subsystems/attendant.md) — the demand-side queue this is the twin of
- [combat-formations.md](../../subsystems/combat-formations.md) — collective action, combat-side
- [holding.md](../../subsystems/holding.md) — the `Warren` two-tier precedent
- [employment.md](../../subsystems/employment.md) — `Position.fulfills`, the eligibility half
- [livelihood-slate](livelihood-slate.md) §5.4 — firing, the trust ramp, the NPC offer
