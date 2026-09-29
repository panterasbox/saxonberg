# #86 · The Lens of Character Function

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-cf]
>
> ⚠ **Rewritten 2026-09-29.** The first draft pointed this lens at the
> **labor market** — positions, seats, the help-wanted sign. That was a
> category error: a blacksmith is a job *the world* needs done, and
> Schell's functions are jobs *the player's experience* needs done. The
> lens is about **casting**. The world-jobs reading survives as a note
> at the end.

## The lens

**What are the roles I need the characters to fill? What characters
have I already imagined? Which map well to which roles? Can any
character fill more than one role? Do I need to change the characters
to fit the roles better — or do I need new characters?**

It is **Character Tip #1**, and the problem it names is specific: when
you write a story you invent characters as the plot demands them, and
when you build a game **the game demands them too** — but you do not
notice, because you are busy loving the ones you already imagined.

> **From the book.** His worked list for an action platformer: *Hero
> (the character who plays the game) · Mentor (gives advice and useful
> items) · Assistant (gives occasional tips) · Tutor (explains how to
> play the game) · Final boss · Minions · Three bosses · Hostage
> (someone to rescue)*. Against imagined characters — Princess Mouse,
> tough and no nonsense; Wise Old Owl, wise but forgetful; Silver Hawk,
> angry and vengeful. Then match them **against the obvious**: Princess
> Mouse is the natural hostage, so make her the mentor, or the final
> boss; maybe the Rat Army have red eyes because *she* hypnotized them
> and they are the hostages. Eight roles, five characters — invent
> more, or fold: *"What if your mentor, Wise Old Owl, turns out to be
> the final boss? It would be an ironic twist **and save you on the
> cost of developing a new character**."* The payoff: *"By separating
> the functions of the characters from your vision of the characters,
> you can think clearly about making sure the game has characters doing
> all the necessary jobs."*

⭐⭐ **Read his list again.** Tutor *explains how to play* — that is
onboarding with a face. Assistant *gives occasional tips* — a hint
system with a face. Mentor gives *advice and useful items* — onboarding
plus an item faucet. Hostage is motivation; minions and bosses are the
difficulty curve. **These are service roles to the player's experience,
not work the world needs done.** Only *Hero* is arguably a world-role,
and it is really *the slot the player occupies*.

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** — the cast
surface is an authoring model, and the lens's whole payoff is about what
an author can compose. Secondarily **lens 3b**, which supplies the
population being cast from.

## What the design answers

[quest-modeling-slate](../slates/builds/quest-modeling-slate.md) has
this lens, built further than Schell takes it:

| | his version | ours |
|---|---|---|
| the function list | characters only | **typed slots over any Stuff** — «captive»:Character, «prison»:Location, «secret»:Fact, «reward»:Quantity |
| matching | a creative exercise in the designer's head | **"casting = binding typed slots to authored Stuff"**, and the CMS save-gate **type-checks the cast** |
| separating function from character | a technique you remember to apply | ⭐ **a permissions tier** — *template-authors* write structures and conditions; *content-authors* cast |
| a taxonomy of story shapes | none | **19 primitives in 5 families keyed to the ledgers** — Knowledge/belief, Bond/regard, Property/inventory, Conflict/vitals, Self/traits — with compounds nesting them |

⭐ And it names the right ancestor: **Propp** — *fixed functions,
castable roles* — who is the folklorist Schell is doing a lighter
version of.

⭐⭐ **The genre library is better grounded than the folk taxonomy.**
*Fetch quest* and *companion quest* are categories players noticed;
these are derived from **what the ledgers can record**, which is why
Fetch falls out under Property and companion quests under Bond.

## The verdict

⭐⭐⭐ **We built past him on four axes — and his one piece of tactical
advice does not apply here at all, for a reason worth stating.**

### The inversion: unvisited cast is not waste

Schell folds two roles into one character **to save the cost of
developing another character**. That advice exists because in a
branching narrative, **the branch you do not take is content nobody
sees** — paid for, unwatched.

Our world does not fork; the slate's spine forbids it. So the
unvisited cast is not a counterfactual. **It is the town.** They are
out there doing their thing, other players meet them, and your not
visiting costs nothing, because they were not built for you.

> ⭐⭐⭐ **We do not commission a cast. We cast from a population that
> exists anyway.**

Two consequences:

1. **The fold move has no cost argument here** — which independently
   confirms the rule the first draft of this entry found from the
   economic side: *every NPC doing two jobs is a vacancy we deleted.*
   There was never a saving to weigh against it.
2. ⭐ **The cost model inverts.** The expensive thing is not the
   unvisited NPC; it is the **specific** one. *Morgan Vigosen the town
   smith* costs because he is a singleton with lines and a dossier;
   *the town smith, practising his craft* is nearly free, because the
   trade already ships him. Which is *derive the crowd, simulate the
   cast*, arriving from narrative instead of from content-packs.

## ⭐⭐⭐ What the lens produced: the specificity axis

The slate says slots carry *"constraints."* What it does not carry is
**how tight the binding is** — and that single missing field is three
things at once.

| the author means | the slot declares | understudy | cost |
|---|---|---|---|
| *must be Morgan Vigosen* | an **identity** | ⛔ authored, or the beat breaks | a carve |
| *must be a smith* | a **predicate** — holds the seat, composes the mixin | ⭐ free: re-bind | crowd |
| *don't care* | the loosest predicate | free; may degrade to an `Extra` | crowd |

> ⭐⭐ **specificity = cost = fragility.** Tighter binding buys a
> particular experience, costs a carve, and needs an understudy. The
> author is choosing all three whether or not they know it, and nothing
> tells them.

⭐ **"Don't care" is a declaration, not an absence** — which is what
lets the save gate distinguish an author who chose loosely from one who
forgot.

## Tensions & risks

⚠⚠ **The n+1 problem, and where it lives.** `Cast` is a singleton — *a
second live clone throws*; `Extra` is not — *two sentries are the
point*. So **a slot bound to an `Extra` can never have this problem, and
a slot bound to a `Cast` always can** — and `Cast` is precisely who
quests want. The understudy is only needed for identity-bound slots,
which is a far smaller set than "every Cast in every quest".

⚠ **His fifth question inverts, and that is the deep one.** *Do I need
to change the characters to fit the roles?* — **you cannot change
Dave.** Dave has ledgers, regard, a history, and can die. The constraint
runs backwards: **the slot must accept whoever is actually there.**

> ⭐ **A cast list is a set of claims about the world, and the world can
> falsify them.** Schell never meets this, because his world holds
> still.

⚠ **The collision.** Dave as «informant» in one quest and «captive» in
another: a person with a life, or a scheduling conflict? Same shape as
one NPC holding two economic seats, which suggests one rule covers both
— and neither has it.

⚠ **Predicate-bound slots need somebody to bind to.** In a thin town
there may be nobody satisfying *anyone running the smith seat*. The
[lineage backstop](../slates/builds/lineage-slate.md) is where those
bindings would resolve, which makes an apparently unrelated char-gen
decision load-bearing for narrative.

## Implications

1. ⭐⭐⭐ **Add the specificity axis to the slot definition** — identity ·
   predicate · don't-care. It subsumes the understudy question rather
   than adding a second concept beside it.
2. ⭐⭐ **Have the save gate flag an identity-bound slot with no
   understudy.** It already type-checks the cast; this is one more
   predicate on a validation that exists.
3. ⭐ **Decide the collision rule** for one character cast into several
   roles, narrative and economic together.
4. ⭐ **Note that predicate-bound casting got much cheaper after the
   slate was written.** In June it was a promise; the trades now ship a
   crowd that actually satisfies predicates. That probably shifts the
   slate's own build lean toward the cheap tier.
5. **Do not fold to save authoring cost.** The saving is imaginary here,
   and the fold costs a role somebody could have been.

## ⚠ Appendix — the other sense of "role"

The first draft of this entry read Schell's functions as **world-jobs**
and produced one rule worth keeping, which belongs to lens 3b and 6
rather than here:

> **Every NPC doing two jobs is a vacancy we deleted.** When one NPC
> holds more than one seat: is that because the economy justifies one
> person doing both, or because it was cheaper to author? A village
> blacksmith who also shoes horses is the first; a participation surface
> quietly shrinking to save work is the second.

Two tensions from that reading also survive, and neither is a casting
question: **an NPC seat-holder's competence is an unset dial** — good
enough that the world works, not so good that displacing them is
theoretical — and **displacement has no stated answer**, which the
*somebody took that job* claim depends on.

[^aogd-cf]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #86, the Lens of Character
    Function** (≈ pp. 378–379), from the characters chapter, section
    *Character Tip #1: List Character Functions*. The six questions,
    the action-platformer function list, the Princess Mouse / Wise Old
    Owl matching exercise and the fold-to-save-cost move are Schell's;
    all analysis ours. Read from the author's Google Play edition,
    2026-09. Lens numbers are stable across editions.
