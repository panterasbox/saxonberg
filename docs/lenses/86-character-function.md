# #86 · The Lens of Character Function

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-cf]

## The lens

**What are the roles I need the characters to fill? What characters
have I already imagined? Which map well to which roles? Can any
character fill more than one role? Do I need to change the characters
to fit the roles better — or do I need new characters?**

> **From the book.** The method is the lens: *"list all the functions
> that these characters need to fulfil,"* separately from the
> characters you imagined, and only then match them up. His worked list
> for an action platformer is **hero, mentor, assistant, tutor, final
> boss, minions, three bosses, hostage** — and his clever move is to
> fold roles together: *"What if your mentor, Wise Old Owl, turns out to
> be the final boss? It would be an ironic twist **and save you on the
> cost of developing a new character**."* The payoff he names: *"By
> separating the functions of the characters from your vision of the
> characters, you can think clearly about making sure the game has
> characters doing all the necessary jobs."*

## Which of our seven it sharpens

**[Lens 3b · Participation](../design-lenses.md)** — it is the
mechanism underneath the claim, and the only lens in the deck that
comes near it.

## Why our design prompts it

Because lens 3b asserts something this lens can test. *We are not
asking anyone to roleplay a blacksmith — the economy has a
blacksmith-shaped hole in it and somebody has to be in it.* That is a
claim about **functions existing independently of who fills them**,
which is exactly what #86 is a method for.

## What the design answers

Schell's technique, turned into a running system:

| | his version | ours |
|---|---|---|
| where the function list comes from | authored once, by the designer, at design time | **derived continuously from the economy** — the needs a settlement must meet or import |
| who may hold a function | a character the designer invents | **an NPC or a player, interchangeably** |
| an unfilled function | a bug — invent a character | ⭐ **a job advertisement** |

The machinery is ordinary and already shipped: positions on a Business
with a closed `requires` vocabulary, openings **derived** from headcount
against roster, a help-wanted sign that is itself derived, `apply`,
`clock on`/`off`. Nobody built a casting system; the casting call is
what the economy looks like from outside.

⭐⭐ **Three consequences, and they are the whole of lens 3b:**

1. **The world runs without players.** Functions held by NPCs still get
   done, so there is no cold-start collapse and no empty-server
   problem.
2. **Every NPC-held seat is a standing vacancy** — visible, and
   takeable.
3. **Replacement is legible.** Somebody took that job, and the town can
   notice.

⭐ **And one crisp difference worth keeping.** Schell lists *"hero: the
character who plays the game"* as a **function**, alongside mentor and
hostage. Here the player is not a function at all. **The player is
whoever took one** — which is why the roles have to be real before
anyone arrives.

## The verdict

⭐⭐⭐ **Adopt the method wholesale. Invert his optimization, because for
us it is an anti-pattern.**

The method is right and we already run it: separate the functions from
the people, list the functions first, never let the cast decide what
the world needs. Nothing to argue with.

**But his efficiency move is backwards here.** Folding two roles into
one character saves a designer the cost of developing a second
character. In an economy, folding two jobs into one NPC means **one
fewer job a player could have taken**:

> ⭐⭐ **Every NPC doing two jobs is a vacancy we deleted.**

Which gives a review question with teeth, because the pressure to fold
is exactly as strong here as it is for him — one NPC is cheaper to
author, brief, illustrate and maintain than two:

> **When an NPC holds more than one seat: is that because the economy
> justifies one person doing both, or because it was cheaper to
> author?** The first is a village with a blacksmith who also shoes
> horses. The second is a participation surface quietly shrinking to
> save work.

⭐ **And his sixth question inverts too.** *Do I need any new
characters?* is a cost question for him. For us the equivalent —
**what roles does this economy need that nothing currently fills?** —
is the [vocations demand test](../vocations.md), which lens 6 already
runs. Same question, opposite sign: a new role is not an expense, it is
the product.

## Tensions & risks

⚠⚠ **A vacancy nobody can fill is worse than no vacancy.** If a seat
demands competence nobody can reach or capital nobody can raise, the
help-wanted sign is *a sign that lies* — and the refusal doctrine says
a bar that nothing lifts is a governance failure
([#25](./25-judgment.md)). The casting call has to be honest about
reachability, not just about existence.

⚠⚠ **The NPC's competence is an unset dial, and it decides whether any
of this is real.** A seat-holding NPC has to be good enough that the
world works when nobody is playing, and **not so good that displacing
them is theoretical.** A blacksmith who never sleeps, never errs and
never runs short has a vacancy in name only. Nothing currently states
where that dial sits, and it is the difference between a labor market
and a diorama.

⚠ **Displacement has no stated answer, and the legibility claim depends
on it.** If a player takes the job, where does the NPC go? *Somebody
took that job* is only legible if the person who lost it continues to
exist somewhere — otherwise the town notices a substitution, not a
story. This is the succession question the household material raises,
arriving from a different direction.

⚠ **Derived functions can be derived wrong.** His list was authored, so
it was at least deliberate. Ours falls out of settlement needs and
business data, which means a mis-specified archetype produces phantom
vacancies or silently produces none — and neither announces itself.

## Implications

1. ⭐⭐ **Make "is this fold justified?" a review question** wherever one
   NPC holds multiple seats. The authoring economics push one way and
   the participation surface the other, and only one of those pressures
   is currently felt during a build.
2. ⭐⭐ **Set the NPC competence dial deliberately** — adequate, not
   optimal — and write down which. Until it is set, lens 3b's claim is
   unfalsifiable.
3. ⭐ **Answer displacement**, or stop claiming replacement is legible.
4. ⭐ **Treat the help-wanted surface as the participation UI**, not as
   shop dressing. It is the casting call, it is derived, and it is the
   only place the economy's unfilled roles are visible to a person
   deciding what to be.
5. **Audit for phantom and missing vacancies** — a derived function
   list can fail silently in both directions, and neither failure has a
   test today.

[^aogd-cf]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #86, the Lens of Character
    Function** (≈ pp. 378–379), from the characters chapter, section
    *Character Tip #1: List Character Functions*. The six questions,
    the action-platformer function list, the Princess Mouse / Wise Old
    Owl matching exercise and the fold-to-save-cost move are Schell's;
    all analysis ours. Read from the author's Google Play edition,
    2026-09. Lens numbers are stable across editions.
