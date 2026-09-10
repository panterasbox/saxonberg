# Intervention slate — breaking up a fight

> **Status: UNBUILT** — the threat graph, `redirect`, `defend <ally>`,
> `intervene`, the control gambits and per-edge terms all ship as its
> substrate; the *ambient* half (onlookers pressing morale) shipped in
> the consequence build.
> **Left:** the sideless participant · a relation whose object is a
> **pair** · restraint terms (force authorized to stop force) · the
> interposition act and what it costs · going-through-a-peacemaker as a
> distinct act on the ledger · who has standing · the bouncer /
> constable / regulars content
> **Size:** a build

> **Status: design surface, unbuilt, no phase gate passed.** Spun out of
> the consequence build's MR review (MR!254, 2026-09-10), where
> `fight parley` was cut and the question *"so how does a fight actually
> stop?"* got a better answer than the one that shipped.

---

## The gap

**You usually cannot talk your way out of a fight that has started.**
Fights are broken up — by a bouncer, by the regulars, by whoever is
willing to get between two people and eat what that costs. That is the
mechanism, and it is a social one that requires no measurement of
language: it is bodies in a room and somebody deciding to spend theirs.

The consequence build shipped the **ambient half** of this. `Morale` now
counts onlookers — live sentients present who are not in the fight — and
being watched pushes both ends toward wanting out. A fight in front of
people is a fight somebody is about to stop, and both sides know it.

⭐ **But nobody can actually be that somebody.** The act half — a person
wading in — has no representation in the model, and the reason is
structural rather than a missing verb. This slate is that structure.

⚠⚠ **The lesson that produced this slate, kept at the top so it is not
re-learned.** `fight parley` was a verb for talking a fight down. It was
cut because *the engine cannot measure natural language*: the player
typed a word, the engine consulted a number, and whatever they actually
said was never read. It was a persuasion check with the check hidden.
**Any design that arrives here answers "what does the engine honestly
measure?" first.** For this build the answer is good — presence, force,
position and risk are all things the engine already counts.

---

## What already exists

Verified against the tree at slate time.

| what | where |
|---|---|
| the directed threat graph; `ThreatEdge {attacker, defender, terms, range}` | `lib/combat/CombatGraph.ts` |
| `redirect(attacker, from, to)` — move an edge onto somebody else | `CombatGraph.redirect` |
| **`defend <ally>`** — partisan interposition | `CombatLogic.defendAllyImpl`, `cmd/combat/defend.yaml` |
| **`intervene <target>` / `stay`** — cancel a coup de grâce | `CombatLogic.interveneImpl` + `findCoupInRoom`, `cmd/combat/intervene.yaml` |
| the control gambits — `subdue` (non-lethal takedown), `shove`, `entangle`, `sweep`, `bash` | `cmd/combat/fight.yaml` |
| entry into somebody else's fight | `CombatLogic.joinImpl` |
| **terms per EDGE**, not per session — the blame foundation | `ThreatEdge.terms` |
| the interposition narration, already written | `CombatNarration.narrateInterception` |
| **onlookers → morale** (the ambient half) | `Morale.onlookers`, `CombatLogic.onlookersOf` |
| sides; allies iff `side` strings are equal | `CombatantState.side`, `PartyApi.sideOf` |
| per-side policies over the threat graph | `docs/subsystems/combat-formations.md` |
| the harm ledger with witnesses | `accountability_events` |

⭐ **Therefore what is genuinely new here is** *a participant who is
against the fight rather than against a fighter* — and the three things
below that the model cannot currently say about one.

---

## ⭐⭐⭐ The three things the model cannot say

### 1. A participant with no side

`CombatantState.side` is a string, and *"two participants are allies iff
their `side` strings are equal."* Every participant has one. A
peacemaker belongs to neither side, and there is no way to be present in
a session without picking.

⚠ **And the obvious sentinel is already taken.** `side` is `''` until
sides are wired — so "" already means *unset*, and worse, `'' === ''`
makes every unsided participant everybody's ally. Sidelessness needs a
real representation, not an empty string.

This is the deepest of the three, because it is the one that makes this a
build. It is not a verb; it is **a second kind of participation.**

### 2. A relation whose object is a pair

Every edge is `attacker → defender`. A peacemaker's relation is not to a
combatant — it is to the **A↔B relation itself**. C interposes on a
*pair*. That is an edge whose object is an edge, and the graph has no
vocabulary for it.

⚠ `CombatGraph`'s own docstring says the structure *"scales to N
combatants ganging up, focus-firing, **or interposing**"* — but
interposing there means `redirect`, which only re-points an ordinary
edge. The word is in the doc; the shape is not in the code.

### 3. Terms that authorize force to stop force

Terms are already **per edge**, which is the genuine hook and the reason
this is cheaper than it sounds. What is missing is a terms *kind* that
says *"I am hitting you to make you stop, not to beat you"* — restraint,
distinct from a lethal duel and from a nonlethal one. A bouncer applying
force is doing something a court would treat differently, and the ledger
should too.

---

## ⭐⭐ The two poles that exist, and the hole between them

| | side | needs an edge | cost | what it does |
|---|---|---|---|---|
| `defend <ally>` | **partisan** — joins you to the session | takes the edge **onto you** | real: you are now a target | redirects one attacker |
| `intervene` | none | none — `findCoupInRoom` just looks around | **free** | cancels one scheduled coup |
| **breaking it up** | none | acts on a **pair** | must be real | ends a standing fight |

⭐⭐ **Why `intervene` gets to be free, and this must not be.** A coup is
a **discrete scheduled act** — you interrupt it once and it is gone. An
ongoing fight is a **standing relation** you would have to hold open
against, beat after beat, while both parties can hit you. Free would
make it a *stop-the-fight* button, which is the failure mode below.

⭐ And `defend <ally>` is not this either, however close it looks. It is
partisan by construction: it calls `joinImpl` and moves the attacker's
edge onto you. You do not stop anything — **you become the new target.**

---

## ⭐⭐ The experience

What a person actually does, which is the thing that makes it a build
rather than a substrate wave.

- **Getting between them is physical and costly.** Both fighters can hit
  you — by choice or because you stepped into a swing already thrown.
  Eating that is the bouncer's entire trade, and the reason the job pays.
- **The fighters get a real decision: stop, or go through you.** This is
  the heart of it. It is a choice with a moral weight, made by a person,
  under pressure, and the engine only has to model the position and the
  consequence.
- ⭐⭐ **Going through a peacemaker is a DIFFERENT ACT.** Hitting the
  person who stepped in to stop you is not the same as hitting your
  enemy, and `accountability_events` is exactly the place that
  distinction should land. This is where the build earns its keep — it
  gives the world a category it does not have.
- **Numbers matter, honestly.** One peacemaker against two brawlers is a
  different proposition from six regulars converging, and it should fall
  out of the same arithmetic rather than a special case.
- **It must work unarmed.** The whole point is that somebody with no
  martial skill can end violence. A design where only a fighter can break
  up a fight has missed.

---

## ⭐⭐ Standing — who may do this

The values lens, and the part most likely to be the user's call rather
than the code's.

Candidates: **a bouncer in their own room** (an employment position with
a place attached), **a constable** (an office), **the proprietor**, **a
regular with standing in the room**, **a stranger**.

⭐ **The question to settle first: does standing change what you MAY do,
or only what it COSTS you afterward?**

The slate's instinct is the second. Anybody may step in — physically,
nothing stops you walking between two people — but what it costs differs
enormously by who you are: a bouncer separating drunks is doing their
job, a stranger doing it is brave, and a stranger doing it *badly* has
joined a brawl. Making standing a **permission** would need a gate at the
act, which is the shape this project keeps rejecting; making it a
**price** puts it on the ledger where the rest of the world's judgment
already lives.

⚠ This also decides whether the build touches `governance.md` (offices) or
only `employment.md` (positions). The cheaper answer is positions.

---

## ⚠ What must not happen

- **A "peacemaker wins" button.** If stepping in reliably ends fights,
  every fight ends the moment anyone objects, and violence stops being a
  decision anybody has to price.
- **A persuasion check.** See the top of this slate. If any part of the
  resolution reads the player's words, or a social stat standing in for
  them, the design is wrong.
- **A fighter-only capability.** If it needs a weapon or a martial
  Discipline, it has failed its own premise.
- ⚠⚠ **Double-counting with the ambient read.** A bystander who wades in
  currently still counts as an onlooker in `onlookersOf` right up until
  they join the session. Whatever this build does, somebody must decide
  whether an intervener is still part of the audience — and the honest
  answer is probably *no*, because they have stopped watching and started
  doing.
- **Reusing `side` for "no side."** `''` already means unset and compares
  equal to itself. See above.

---

## Open questions

1. **Is the pair-relation an edge in the graph, or a state on the
   session?** An `InterposedOn {who, pair}` record is the smaller change;
   a third edge kind is the more expressive one. The graph is a
   value-object with its own unit suite, so either is testable — but the
   edge kind changes every reader of `allEdges()`.
2. **What ends an interposition?** Beats elapsed, the interposer going
   down, the interposer choosing to stop, or the fight resolving. Almost
   certainly an engagement (`SustainedEngagement`, slots) rather than a
   flag — which would make it the tree's **first** pure-occupancy
   engagement. ⚠ A second one nearly shipped (`WatchEngagement`, for
   standing a guard's post) and was cut, for a reason this build should
   weigh: an engagement needs a VERB to start it, and *"I am now
   interposing"* may be no more an act than *"I am now keeping watch"*
   was. If the answer is presence, the precedent is
   `ContractLogic.reconcileWatches` — the engine looks.
3. **Does interposition reduce the fight, or only hold it open?** Does
   getting between two people *dissolve* their edge, or merely make every
   exchange pass through you? The second is more honest and more
   frightening.
4. **What do the existing control gambits become?** `subdue`, `shove` and
   `entangle` are already the physical vocabulary of stopping somebody.
   Does breaking up a fight compose out of them, or sit above them?
5. **Does `intervene` widen, or does a new verb appear?** The verb
   already means *step in to stop something*. Widening it is the honest
   reading and avoids a synonym; the risk is one verb doing four things
   (`defend` already does three).
6. ⭐ **Do NPCs do this?** `combat-slate` already names a **`guards`
   intervention brain** in its Left. That brain is content riding
   substrate that does not exist — it is this substrate, and it is
   probably the build's first consumer.
7. **What does a fight broken up resolve AS?** Not `victory`, not
   `yield`, not `draw`. ⭐ Possibly **`disengage`** — which the
   consequence build left declared and unconsumed after cutting parley,
   and which is currently pencilled in for fleeing. Two claimants; the
   build should settle it.

---

## What this slate does NOT cover

- **De-escalation by the fighters themselves** — settled and closed.
  `yield`, `break`, walking out, and the foe's own nerve going. The
  talking-it-down verb was tried and cut → `combat-experience-slate.md`
  T12, which carries the stop-block.
- **Group morale, rout and rally** — the contagion of one side breaking.
  → `combat-experience-slate.md` T13.
- **Pursuit and the chase** — what happens when somebody breaks away.
  → `combat-slate.md`.
- **The law after the fact** — arrest, charges, a hearing. Intervention
  produces the events; adjudicating them is → `legal-code-slate.md`.
  ⚠ There is no courts/judiciary slate in the tree, and this build will
  hand one a reason to exist.
- **Crowd behaviour as a simulation** — a room that riots, a mob. Nothing
  here models the onlookers as agents; they are a count. → nowhere,
  deliberately.
- **The bar's own staffing** — a bouncer as an employment position with a
  shift and a wage is `employment.md` substrate that already exists; the
  content is a venue's, not this build's.

---

## Cross-references

- `docs/subsystems/combat.md` — the threat graph, morale, the onlooker
  read, and *"why there is no verb for talking a fight down"*
- `docs/subsystems/combat-formations.md` — per-side policies over the
  same graph; the nearest thing in altitude
- `docs/subsystems/accountability.md` — where going-through-a-peacemaker
  has to land
- `docs/subsystems/activity.md` — engagements and slots, for open
  question 2
- `docs/slates/builds/combat-slate.md` — the `guards` intervention brain
- `docs/slates/builds/combat-experience-slate.md` — T12 de-escalation
  (closed, with the parley stop-block), T13 morale & surrender
- [combat.md § Onlookers](../../subsystems/combat.md) — the ambient half
  this build's act half sits beside, and *why there is no verb for
  talking a fight down* (⚠ the consequence plan that decided it is
  retired; combat.md is the durable record)
