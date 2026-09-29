# #86 · The Lens of Character Function

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-cf]
>
> ⚠ **Third draft, 2026-09-29.** The first pointed this lens at the
> **labor market** — a category error. The second pointed it at
> **casting** but described *allocation*: binding slots to whoever
> satisfies a capability. That is the lazy pairing Schell's tip exists
> to warn against. This one is about what he is actually asking.

## The lens

**What are the roles I need the characters to fill? What characters
have I already imagined? Which map well to which roles? Can any
character fill more than one role? Do I need to change the characters
to fit the roles better — or do I need new characters?**

It is **Character Tip #1**, and its problem is specific: when you write
a story you invent characters as the plot demands them, and when you
build a game **the game demands them too** — but you do not notice,
because you are busy loving the ones you already imagined.

> **From the book.** His function list for an action platformer: *Hero
> (the character who plays the game) · Mentor (gives advice and useful
> items) · Assistant (gives occasional tips) · Tutor (explains how to
> play the game) · Final boss · Minions · Three bosses · Hostage
> (someone to rescue)*. Against imagined characters — Princess Mouse,
> *"beautiful, but tough and no nonsense"*; Wise Old Owl, wise but
> forgetful; Silver Hawk, angry and vengeful. Then the instruction that
> is the actual lens: *"This is an opportunity to really get creative.
> **The traditional thing would be to make Princess Mouse the hostage.
> But why not do something different; make her the mentor? Or the hero?
> Or even the final boss!**"* Maybe the Rat Army have evil red eyes
> because *she* hypnotized them, and they are the hostages. Eight roles,
> five characters — invent more, or fold: the mentor turns out to be the
> final boss, *"an ironic twist **and save you on the cost of developing
> a new character**."*

⭐⭐ **Two things are easy to read past.** First, his functions are
**service roles to the player's experience**, not work the world needs
done: *tutor* is onboarding with a face, *assistant* is a hint system
with a face, *hostage* is motivation, the bosses are the difficulty
curve. Second — and this is the lens — **the payoff is not coverage, it
is the mismatch.** Princess Mouse *reads* hostage. Casting her as the
final boss is interesting **because** it defies what her traits
telegraph. The gap between who someone is and what they do in the story
is where character comes from.

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** — the cast
surface is an authoring model and the lens's payoff is about what an
author can compose. Secondarily **lens 3b**, which supplies the
population.

## ⭐⭐⭐ Casting happens three times

The organizing device, taken from Murch's claim that a film is made
three times — written, shot, edited — and written up in full in
[quest-modeling-slate § Framing](../slates/builds/quest-modeling-slate.md):

| | Murch | ours | what gets cast |
|---|---|---|---|
| **1** | the script | the **code** | *which roles can exist* — the grammar. Nobody is cast. |
| **2** | the shoot | the **content** | *who is nominated.* The only pass a human performs deliberately — **and the only pass Schell is talking about.** |
| **3** | the edit | **runtime state** | *who is actually in the chair*, and what it means to **you**. |

⚠ **Both of this entry's earlier drafts failed by filing the lens under
the wrong pass** — first pass 3 (who holds the seat), then pass 1
(what capability they compose). Schell's tip lives entirely at **pass
2**, which is why neither reading could find the craft in it.

## What the design answers

At **pass 2**, the [quest slate](../slates/builds/quest-modeling-slate.md)
has real machinery, and more of it than he has:

| | his version | ours |
|---|---|---|
| the function list | characters only | **typed slots over any Stuff** — «captive»:Character, «prison»:Location, «secret»:Fact |
| matching | a creative exercise in the designer's head | *"casting = binding typed slots to authored Stuff"*, and the CMS save-gate **type-checks the cast** |
| separating function from character | a technique you remember | ⭐ **a permissions tier** — template-authors write structures; content-authors cast |
| a taxonomy of story shapes | none | **19 primitives in 5 families keyed to the ledgers**, compounds nesting them |

⭐ And it names the right ancestor: **Propp** — *fixed functions,
castable roles* — the folklorist Schell is doing a lighter version of.

## The verdict

### ⭐⭐ Push back — his one piece of tactical advice does not apply

He folds two roles into one character **to save the cost of developing
another character**. That advice exists because in a branching
narrative, **the branch you do not take is content nobody sees.**

Our world does not fork. So the unvisited cast is not a counterfactual
— **it is the town.** They are out there doing their thing, other
players meet them, and your not visiting costs nothing, because they
were not built for you.

> ⭐⭐⭐ **We do not commission a cast. We cast from a population that
> exists anyway.**

So the fold has **no saving to weigh against it**, and the cost model
inverts: the expensive thing is not the unvisited NPC but the
**specific** one — *Morgan Vigosen the town smith* is a carve; *the town
smith, practising his craft* is nearly free, because the trade already
ships him.

### ⭐⭐⭐ Concede — we built the machinery and skipped the craft

This is the finding, and it is not comfortable. Everything in the table
above is **validation**: typed slots, a save-gate that type-checks, a
tier that decides who may write what.

> **Our cast surface can tell an author that a binding is *legal*. It
> has nothing whatever to say about whether it is any *good*.**

And *"is this casting interesting"* is the entire content of his tip.
Worse, the machinery actively pulls the wrong way: a slot that validates
by **capability** selects for competence, which produces the obvious
pairing every time. **A type-checked cast is Princess Mouse as the
hostage, reliably, forever.**

### ⭐⭐⭐ The prize — his craft, made declarative

The fix is not to abandon predicates. It is to stop binding on the wrong
dimension. A **capability** predicate is a pass-1 grammar constraint
misused for casting. A **dramatic** predicate is his instruction,
written down:

> «betrayer» = *the person whose regard for you is highest.*
> «informant» = *someone whose telling would cost them most.*
> «captive» = *whoever you would most inconvenience yourself to reach.*

He performs the against-type casting **by hand, once, for one story.** A
relational predicate expresses the **rule he is following** — *pick the
one where it hurts.*

⭐⭐ And because regard, belief, recognition and history are all
**per-viewer**, this does something no authored cast list can: **cast
against type for each player specifically.** The author does not know
whose bar you drink in. Pass 3 does.

## How relation survives being authored

The obvious objection: casting is authored, so it is a constant; a
dramatic relation is per-player and moves. The slate already resolves
it — spine point 4, *the NPC is the membrane, **shared in substance,
personal in relationship***.

> **Authored casting binds substance. Relation is never cast**, because
> relation was never the shared half.

Which leaves three ways a relation arises, sorted by pass:

| | arises | pass | prose | craft |
|---|---|---|---|---|
| **established** | the quest *builds* it — beat 1 makes you owe Dave, beat 4 cashes it | 2 | specific | ⭐ full author control |
| **inherited** | you already had it — fifty hours in his bar | 3 | specific | none; the depth is luck |
| **derived** | the slot resolves against *your* ledger | 3 | parametric only | ⭐⭐ systemic |

**Inherited is the Kuleshov effect** — the same shot reads as hunger or
grief depending on what it is cut against. Dave is cast at pass 2;
whether being Dave lands as betrayal or transaction is made at pass 3,
out of material nobody authored. **The relation is not shot. It is cut.**

## Tensions & risks

⚠⚠ **Nothing tells an author their casting is dull.** The save gate is
the only feedback in the loop and it only knows legality. This is the
lens's central complaint and we have no answer to it — not a lint, not
a review question, not a prompt.

⚠⚠ **n+1 lives at the 2→3 seam.** `Cast` is a singleton (*a second live
clone throws*); `Extra` is not (*two sentries are the point*). So an
`Extra`-bound slot can never have the problem and a `Cast`-bound slot
always can — and `Cast` is precisely who quests want. The understudy is
needed only for identity-bound slots.

⚠ **His fifth question inverts.** *Do I need to change the characters to
fit the roles?* — **you cannot change Dave.** Dave has ledgers, regard,
a history, and can die. **A cast list is a set of claims about the
world, and the world can falsify them.** Schell never meets this,
because his world holds still.

⚠ **The collision.** Dave as «informant» here and «captive» there — a
person with a life, or a scheduling conflict? The same shape as one NPC
holding two economic seats, and neither has a rule.

⚠ **No final cut.** Pass 3 never closes, so the same casting decision
reads differently at hour 5 and hour 500 with nobody touching it. A
quest cannot be *finished* the way a film is, which means **"did this
casting work" is not answerable at ship.**

## Implications

1. ⭐⭐⭐ **Let slots bind on dramatic relation, not only capability.**
   The substrate exists and is per-viewer; what is missing is the
   predicate vocabulary. *(Quest slate Q10.)*
2. ⭐⭐ **Find feedback on casting quality — and it must not be a gate.**
   A save gate that says *legal* and stops is how a tool teaches its
   users to be boring. ⚠ But **a gate that judged quality would be worse
   than silence**: the platform measures what people make, and a
   measurement of work that was not allowed to be bad has no content
   ([#79](./79-freedom.md)). The permitted shape is **feedback without
   prevention** — *what does this binding defy?* as a prompt you may
   ignore, never a refusal.
3. ⭐ **Specificity is a cost control, not the craft.** Identity ·
   predicate · don't-care governs carve cost and fragility at pass 2 and
   says nothing about whether the casting is interesting. Earlier drafts
   of this entry treated it as the finding; it is plumbing.
4. **Do not fold to save authoring cost.** The saving is imaginary here,
   and the fold costs a role somebody could have been.

## ⚠ Appendix — the other sense of "role"

The first draft read his functions as **world-jobs**. Wrong for this
lens, but it produced one rule worth keeping, belonging to lenses 3b
and 6:

> **Every NPC doing two jobs is a vacancy we deleted.** When one NPC
> holds more than one seat: does the economy justify one person doing
> both, or was it cheaper to author?

Two tensions from that reading also survive, neither of them casting
questions: **an NPC seat-holder's competence is an unset dial** — good
enough that the world works, not so good that displacing them is
theoretical — and **displacement has no stated answer**, which the
*somebody took that job* claim depends on.

[^aogd-cf]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #86, the Lens of Character
    Function** (≈ pp. 378–379), from the characters chapter, section
    *Character Tip #1: List Character Functions*. The six questions, the
    function list, the Princess Mouse matching exercise and the
    fold-to-save-cost move are Schell's; all analysis ours. The
    three-passes framing adapts Walter Murch's claim that a film is made
    three times. Read from the author's Google Play edition, 2026-09.
