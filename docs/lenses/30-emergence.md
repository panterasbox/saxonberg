# #30 · The Lens of Emergence

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-em]

## The lens

To check that a game has interesting qualities of emergence: **how many
verbs do the players have? How many objects can each verb act on? How
many ways can a goal be achieved? How many subjects do the players
control? And how do side effects change constraints?**

> **From the book.** Strategic actions *"are mostly not part of the
> rules, per se, but rather actions and strategies that **emerge
> naturally** as the game is played. Most game designers agree that
> interesting emergent actions are the hallmark of a good game."*
>
> The metaphor is the heart of it:
>
> *"Trying to create 'emergent gameplay'… has been likened to **tending a
> garden**, since what emerges has a life of its own, but at the same
> time, **it is fragile and easily destroyed.** When you notice some
> interesting strategic actions showing up in your game, you must be able
> to **recognize** them and then do what you can to nurture them and give
> them a chance to flourish."*
>
> Then five *"tips for preparing the soil of your game"*:
>
> | # | tip | his note on it |
> |---|---|---|
> | 1 | **Add more verbs** | more basic actions, more interaction surface — ⚠ but *"adding too many basic actions, especially ones that don't interact with each other well, can lead to a game that is bloated, confusing, and inelegant… it is usually better to add one good basic action than a slew of mediocre ones"* |
> | 2 | ⭐ **Verbs that can act on many objects** | *"possibly the single most powerful thing you can do to make an elegant, interesting game."* A gun that only shoots bad guys is a simple game; one that also shoots a lock off a door, breaks a window, hunts food, pops a tire and writes on the wall is *"a world of many possibilities"* — still **one** basic action. What grew was *"the number of things you can **usefully** shoot at"* |
> | 3 | **Goals achievable more than one way** | otherwise *"players have no reason to look for unusual interactions and interesting strategies"* |
> | 4 | **Many subjects** | checkers with one piece a side would be dull. *"The number of strategic actions seems to have roughly a magnitude of **subjects times verbs times objects**"* |
> | 5 | **Side effects that change constraints** | every checkers move changes what you threaten *and* where either side may move — *"every move changes the very nature of the game space, whether or not you intended it to"* |
>
> And the balance warning: where one option is significantly easier than
> the others it is a **dominant strategy**, and players will always take
> it.

⚠ **Twin of [#31 Action](./31-action.md)** — same section of the book,
and `31` already owns the **basic:strategic ratio** and the verb-surface
audit. This entry is the other half: not *what can players do* but
**what produces strategies nobody designed.**

## Which of our seven it sharpens

**[Lens 6 · Economy](../design-lenses.md)** primarily — it is the lens
that explains why the trade backlog *is* the roadmap rather than a
content queue. And **lens 2 · Creative expression**, whose ban on
enumeration turns out to be tip 2 stated as a prohibition.

## At what altitude

| answer | altitude |
|---|---|
| the object count per verb grows by **composition**, never by enumeration | **invariant** — `lint:*` holds it |
| simulate where a side effect changes **somebody else's** constraint | **invariant** — the positive form of the abstraction law |
| one body per player; plurality comes from **institutions** | **invariant** |
| the world runs on depleting stocks and constraint-changing side effects | ⭐⭐ **the grain** — a static authored world is buildable here, and the substrate is not for it |
| a goal has many routes | ⭐⭐ **the grain**, with a lens 1 exception: **one-way where the goal is understanding** |

## Why our design prompts it

Because the project's actual method is **synthesis rather than
invention**, and this is the only lens in 116 that asks what synthesis
is supposed to produce. Very little here was invented: the RGO is
Europa Universalis' concept applied to an MMO, the settlement model
credits the colony sims by name, logistics credits Transport Fever and
Manor Lords, crafting credits Dwarf Fortress and EVE. **The bet is not
that any one of those is better here. It is that combining them yields a
kind of play none of them has**, and that bet is exactly a claim about
emergence.

## ⭐⭐⭐ Tip 2 is architecture here, and it has a supply chain

Schell's most powerful tip is, in a hand-built game, a **content
budget**: *how many objects can this verb act on* is a number somebody
pays for, object by object, and the gun that can shoot a lock off a door
is a door somebody authored a lock-shooting response for.

Here it is a property of the substrate. A verb over a mixin interface
acts on **every composer — including composers its author never saw**:
`pour` over anything `Bulkable`; `fell` on a standard, a bole or a
planted tree; `harvest` told its tool by the plant; `measure <channel>`
over a `Reading` row any pack ships, so a trade adds an instrument
reading with **no platform file changed and no new verb.**

> ⭐⭐⭐ **So the object count per verb grows when somebody else ships
> content.** Emergence has a **supply chain**: a pack author adding a row
> increases the strategic-action count of verbs written months earlier by
> people who never heard of that trade. That is the same mechanism as
> *personalization is a derivative of supply-chain depth* — lens 2's
> rule, showing up as the engine of emergence rather than as a
> constraint on content.

⭐ **And Schell's own adjective settles the obvious objection.** He does
not say *the number of things you can shoot at*, he says *the number of
things you can **usefully** shoot at.* A god class inflates the raw count
and shrinks the useful one — `Thing` carrying a spoilage gauge to serve
four rows that belonged on `Provision` is precisely a verb that
technically acts on everything and usefully acts on four things.
**Narrowing raises the number this lens is asking about**, which is the
emergence argument for the narrowing work and it is nowhere in the
narrowing case.

## ⭐⭐⭐ The chain walk is tip 2 run backwards — and it is our emergence generator

Schell's method is additive: put more verbs and more objects in, tend
what appears. Ours is the inverse and it is already written down as
[vocations.md](../vocations.md)'s **first and best-ranked gap-finding
method**:

> **The chain walk.** For each good: *extract → process → move → store →
> sell → use → maintain → dispose.* **Unstaffed links are gaps.**
>
> — and the record of what it produced: *"walking a steer from pasture to
> butcher generated freight, the depot, the salvage yard and the
> second-hand market."*

⭐⭐⭐ **A single venue is a demand-side census, and the trades are its
output.** Put one bar in the world, ask honestly what it needs to
function, and the answer is distilling, hospitality, cooking, the
glassware, the fuel, the transport, and eventually the apiary for the
mead — none of which was designed as content. **The consumer implies the
producers.** *(The bar is an illustration and any venue would do; the
claim is the census.)*

This is a strictly more reliable generator than tending a garden,
because it never invents an interaction and hopes:

| | Schell | here |
|---|---|---|
| direction | add verbs + objects, **watch** for strategies | add a **consumer**, **derive** the producers |
| what is uncertain | whether anything interesting appears | whether the derived work is *interesting*, not whether it is *needed* |
| the guard | *"be careful… bloated, confusing, inelegant"* | the five criteria for a real vocation — ⚠ especially **never invent a need to create a market** |

⚠ And note the exact hazard our version has that his does not: the chain
walk will generate a link that is *real* and *dull*. Criterion 2 (**a
gated capability** — *if anyone can do it, it is a chore, not a job*) and
`31`'s finding that a basic action is a step and not a choice are the two
brakes, and they are brakes on **the same thing**: a chain walk with no
decision in it produces procedure, not emergence.

## ⭐⭐⭐ Synthesis over invention — and the permission it grants

If the combination is the product, one rule follows and it is worth
stating plainly because it licenses a lot of abstraction that would
otherwise read as a corner cut:

> ⭐⭐⭐ **Borrow to the depth the combination needs, not to the depth the
> source went.** Europa Universalis simulates an RGO to grand-strategy
> depth because RGOs are its main loop. Here an RGO is **one input to a
> labour market**, so the honest depth is shallower — and that is
> **correct scoping, not a compromise.** We do not need EU-grade RGOs; we
> need RGOs interesting enough that *hiring somebody to work one* is a
> decision.

That is the companion *expression is inelastic* has been missing. That
rule says abstract to what a player can act on; it says nothing about the
case where you are importing a system whose original game went ten times
deeper because that system **was** its game.

⭐⭐ **And it is why the claim is not competitive.** Europa Universalis'
RGOs have no labour market with people in them. Transport Fever's network
has no polity deciding where the road goes. A MUD has rooms and verbs and
nothing underneath them. Each is deeper in its own game than it will ever
be here — **and none of them has ever had to coexist with the others in
one world people live in.** The synthesis is the moat: a competitor has
to copy a combination, not a feature.
[positioning.md](../positioning.md) makes the neighbouring argument about
Unity (*outputs never coexist*) and does not make this one.

⚠⚠ **But the provenance is undocumented, and that is a design defect
rather than a citation lapse.** Checked 2026-09-29: the games are named
in scattered places — `settlement-model.md` (Banished, Farthest Frontier,
Manor Lords, Foundation, Cities: Skylines), `logistics-slate` (Transport
Fever, Manor Lords, Foundation), `crafting-slate` (Dwarf Fortress, EVE),
`farming-slate`, `mind-slate` (CK3) — the explicit `**Sources.**`
convention exists in exactly **two** docs of the tree, and **Europa
Universalis is named nowhere at all**, though the RGO is the single most
load-bearing borrowed concept in the design.

> ⭐⭐ **Knowing what a mechanism was FOR in its source is how you know
> how deep to take it here.** That makes provenance load-bearing
> documentation, not trivia — it is the input to the borrow-to-the-depth
> rule above. A reader today cannot reconstruct the synthesis from the
> docs, which means they cannot check the depth decisions either.

## ⭐⭐ Tip 5 gives us the positive test for when to simulate

We have two doctrines that say when **not** to simulate — *expression is
inelastic* (abstract a lifecycle to what a player can act on) and the
**abstraction law** (*an abstraction is legitimate while it still costs
somebody the activity*). **Nothing says when to**, which is why the
question keeps being re-argued per build.

Tip 5 answers it:

> ⭐⭐ **Simulate where the side effect changes somebody else's
> constraint.** Soil reserves drawn down, the coppice rotation, the
> fishery's `drawn` against its recharge, spoilage clocks, `exert`'s five
> slow stocks, the ledger, chain of title, participation decay, induced
> lanes — every one of those is a **constraint change**, which is why each
> earns its complexity and an individually-modelled raindrop would not.

⭐ **And the RGO law is tip 5 in its purest form** — *a reservoir with a
recharge law, drawn by an act* is literally *"every move changes the very
nature of the game space."* Depletion being *recharge = 0* means the
space can be changed **permanently**, by somebody else, before you got
there. Schell's checkers example is per-move and reversible; ours is
cumulative and shared, which is the strongest version of the tip
available and nobody has said so.

## ⭐⭐ Tip 4 — one body, and plurality through institutions

We sit at **subjects = 1**: one body, and the Compact stays players-only
by arithmetic. On Schell's formula that forfeits a whole multiplicative
term that checkers has for free.

> ⭐⭐⭐ **We get it back through institutions rather than pieces.** A
> roster you hired, the NPC labour pool, the parents as backstop,
> delegation, agency, a firm, a committee you chair. **You do not control
> multiple subjects — you direct them, and they can refuse.**

That is a more interesting answer than checkers', and it is the reason
the **labour market is load-bearing for emergence** and not only for the
economy: every hire is a subject added to the formula, with its own
schedule, competence and willingness.

⚠ **With a risk that is testable and unaddressed.** Delegation *steers,
never transfers*, and code-trust never flows through agency — both
correct, both friction. **If directing three NPCs costs more keystrokes
than doing the work yourself, subjects = 1 in practice** and the
multiplier never arrives. The tell would be players with staff doing
their staff's jobs.

## Tip 3 — and the one place lens 1 wants a one-way goal

Economic goals here have many routes by construction: any trade can make
money, and *which* chain you finance is the decision. But the **epoch
on-ramp** is deliberately one-way — a recipe **exists and refuses**,
naming the law you lack — and tip 3 says a single-route goal removes the
incentive to look for unusual interactions.

⭐ **That is a real tension between lens 1 and this lens, and the
resolution is a split rather than a winner:**

> **One-way where the goal is understanding; many-way where the goal is
> achievement.** The knowledge gate is singular *because* lens 1 wants
> that specific law learned. Everything around it — how you finance it,
> who supplies you, which order you climb in — stays open.

## The verdict

**Adopt tip 2 as the only growth lever, an alternative on tips 1 and 4,
and push back on nothing.**

⭐⭐⭐ **Tip 2 is the entry's payload**, and it is already our
architecture — it simply has never been named as *the* mechanism by which
this design gets interesting. Every argument for mixin narrowing, for
`measure <channel>` over a verb per trade, for `Workable`, and for the
ban on enumeration is the same argument, and this lens is the one that
says why it matters to a player rather than to a maintainer.

⚠ **An alternative on tip 1** — *add more verbs* is the wrong lever here
and `31` proves it: we ship an enormous verb surface with a possibly
terrible ratio. **Grow objects per verb, never verbs.**

⭐⭐ **An alternative on tip 4** — not more pieces, but **subjects that
can refuse you**, which is a different and better game than commanding a
side of checkers.

## Tensions & risks

⚠⚠ **You cannot write a test that says "an interesting strategic action
appeared."** Schell's gardener has to *recognize* emergence, which means
watching people play, and we have no instrument for it. ⭐ **Fourth ask
for the agent-swarm pattern** — [#27](./27-time.md) asked for it on
activity length, `31`'s ratio audit needs it, and the
[live-drive slate](../slates/builds/live-drive-slate.md)'s *"the agent is
a participant, not a feed"* is the closest thing we have, aimed at
defect-finding rather than at emergence-spotting.

⚠⚠ **The synthesis bet is unfalsifiable until people play, and its
failure mode is specific:** several systems each shallower than their
source, and no new gameplay between them. *Borrow to the depth the
combination needs* is the right rule and it is only safe **if the
combination actually produces something** — otherwise it reads, in
retrospect, as having under-built every system on purpose.

⚠ **A synthesis has no genre, so nobody knows what it is.** This is
[positioning.md](../positioning.md)'s Part 0 gap from the other side: a
reader's honest takeaway is *"a well-designed MUD."* **The thing that
makes the design interesting is the thing that makes it hard to
describe.**

⚠ **The seams are the product, and our doctrine files them as debt.**
*Promote at the third consumer* and *sequence by what forces platform
support* are the right instincts, and the unification passes they
schedule are recorded as **tech debt**. ⭐ If the combination is the
product, the unification passes are **where the game is** — debt is
always deferrable and a product is not. *(Flagged as a reframe; the
sequencing call is not this entry's.)*

⚠ **Dominant strategy is the balance half and it has an owner** —
[balance-slate](../slates/builds/balance-slate.md) — but tip 2 makes it
worse in a specific way: **a verb that acts on more objects has more
chances to have one dominant target.** The more emergence the substrate
affords, the more surface for a single best answer to hide in.

## Implications

1. ⭐⭐⭐ **Make "how many objects can this verb usefully act on?" a slate
   question.** It is the single highest-leverage design question in this
   lens and nothing in the pass asks it. For a proposed verb: name the
   interface it rides and the composers that exist today — a verb whose
   answer is *one class* should be an affordance on that class or should
   not exist.
2. ⭐⭐⭐ **Record the chain walk as the emergence generator, not only as
   a gap-finder.** It sits in `vocations.md` as a way to find missing
   jobs. It is also the reason the trade backlog is a roadmap rather than
   a content queue, and lens 6 should say so.
3. ⭐⭐⭐ **Adopt the `Sources.` convention tree-wide, and credit the
   RGO.** Two docs have it; every doc that borrows a system should name
   the source **and what that source used it for**, because that is the
   input to the depth decision. Europa Universalis is currently
   uncredited for the most load-bearing borrowed concept in the design.
4. ⭐⭐ **Write the depth rule down.** *Borrow to the depth the
   combination needs, not the depth the source went* belongs beside
   *expression is inelastic*, which only covers the other direction.
5. ⭐⭐ **Add tip 5 as the positive simulation test.** *Does this side
   effect change somebody else's constraint?* — a yes earns the
   simulation, a no is texture and should be derived or dropped.
6. ⭐ **Watch the delegation keystroke cost.** If directing staff is
   dearer than doing the work, tip 4's multiplier never arrives. It is a
   playtest observation, not a design review one.
7. **Pair with [#31](./31-action.md)** permanently. `31` audits the verb
   surface; this one audits **what each verb reaches.** Neither question
   is answerable without the other, and the ratio `31` worries about is
   improved almost entirely by tip 2 rather than by cutting verbs.

[^aogd-em]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #30, the Lens of Emergence**
    (≈ pp. 181–182), from *Mechanic 4: Actions* in the game-mechanics
    chapter, immediately before **#31 Action**. The five questions, the
    five tips, the garden metaphor, the *"usefully shoot at"* gun
    example and the *subjects × verbs × objects* formula are Schell's;
    all analysis ours. Read from the author's Google Play edition,
    2026-09. Lens numbers are stable across editions.
