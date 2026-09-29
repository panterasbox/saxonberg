# #46 · The Lens of Reward

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-rw]

## The lens

Everyone likes to be told they are doing a good job. What rewards does
the game give out now, and could it give others? Are players excited by
them or bored? **Do players understand the rewards they are getting** —
because a reward you do not understand is no reward at all. Are the
rewards too regular; could they be more variable? How are they related
to one another, and how are they building — too fast, too slow, or just
right?

> **From the book.** Schell states the technique without euphemism:
> *"if every monster you defeat gives you ten points, that gets
> predictable and boring pretty quickly—but if every monster you defeat
> has a 2/3 chance of giving you zero points, but a 1/3 chance of
> giving you thirty points, this stays rewarding for a much longer
> time, **even though you are receiving the same number of points on
> average**."* And on escalating reward value as the player progresses:
> *"In a way, this is a cheesy trick, but it works—even when you know
> the designer is doing it and why."* He also names the acclimation
> problem it solves: people habituate to rewards, and what was
> rewarding an hour ago is no big deal now.

## Which of our seven it sharpens

**[Lens 4 · Values](../design-lenses.md).** It sharpens the *cost* side
— what the no-gauge rule and `uncertainty.md` are paying for — rather
than the test. Secondarily **lens 1**, because the mechanism this lens
recommends is the one lens 1 forbids.

## Why our design prompts it

Because we do not decline the central technique. **We have made it
unbuildable.**

[uncertainty.md](../uncertainty.md) bans resolutional randomness —
*roll to decide what the world IS, never to decide what your action
DID*. A variable reward for defeating a monster is exactly a roll
deciding what your action did. So the most reliable engagement
mechanism in the book is not a dial we have turned down; there is no
dial, and adding one would require breaking lens 1.

That is a position worth being able to defend on purpose, because it is
expensive.

## What the design answers

**The reward surface is the economy, and it is an honest trade rather
than an engineered drip.** Wages, prices, tips, yields and title are
paid for work delivered; the thing that makes them rewards is that they
buy something, not that they arrive on a schedule tuned for retention.
[Lens 6](../design-lenses.md) already requires every one of them to name
its source and sink, which incidentally forecloses the drip: a reward
with no source is a conservation break.

**"How are my rewards related to one another?"** has an unusually
strong answer. Goods, capacity, information and standing are the four
things a feature may produce, and they are deliberately *not*
interconvertible — money may buy goods and services and may never buy
standing ([measurement.md](../measurement.md)). Schell asks the question
to prevent rewards feeling arbitrary; our answer is a stated
non-convertibility, which is stronger than coherence.

**"Do players understand the rewards they are getting?"** is the
question with real teeth for us, and it lands on derive-on-read. A band
that reconciles from evidence is only a reward if the player can trace
it to what they did. **A derived number nobody can account for is not a
reward you gave; it is a number that appeared.**

## The verdict

⭐⭐⭐ **Push back on variance — we already have his mechanism, honestly —
and adopt his legibility question wholesale.**

**Why the pushback.** [uncertainty.md](../uncertainty.md) bans exactly
one of four provenances: **resolutional**. Environmental, epistemic and
generative randomness are all legal. And a seeded ore grade you must
assay to learn **is a variable payout** — you genuinely do not know what
this vein will give you.

> ⭐⭐ **Schell's 2/3-zero, 1/3-thirty is a machine that *simulates* not
> knowing. Ours is a world you *actually* do not know.** Same
> psychological effect, opposite epistemic status — and ours pays a
> second dividend his cannot, because the uncertainty is *reducible by
> skill*: a better prospector narrows the distribution. His never
> narrows, because there is nothing under it.

So the lens's demand is met, and met better, **in every domain with
real epistemic depth**: prospecting, the bite, the assay, the harvest
grade, what the ground turns out to hold.

⚠ **Where the pushback stops.** His variance is **dense** — every
monster, forever. Ours is **sparse**, confined to domains that have
genuine unknowns. A wage is a wage; a known recipe with known inputs
pays what it pays. Those domains cannot honestly acquire variance, and
pretending otherwise is the resolutional roll under a new name.

⭐ **The alternative to randomizing the wage: don't.** A wage being
predictable is *true*, it is pedagogically honest, and it is how a
player feels the difference between working for somebody and taking a
risk. The design question a boring wage raises is **not** "how do we
make this exciting" but **"how much of a player's time is spent in the
deterministic domains"** — a content-mix question, not a mechanics one.

⭐⭐ **And the acclimation problem has an answer.** His fix is
escalation; ours is that the unbidden channel fires **on surprise
rather than on schedule** — *announce the surprising, not the every*
(see [#55](./55-visible-progress.md) for the mirror's two channels). A
notification conditioned on deviation **cannot habituate**, because the
moment it becomes expected it stops being a deviation. Variable reward
defeats habituation by making the payout unpredictable; we defeat it by
making the *telling* conditional. Both work. Only one of them lies.

**What to adopt outright:** *"Getting a reward you don't understand is
like getting no reward at all."* That is a gate we should be running
and are not.

## Tensions & risks

⚠ **The deterministic domains are genuinely flat and always will be.**
A defensible choice, but a choice — and it means the density of
interesting reward is a **function of content mix**. If most of a
player's hours land in known-input, known-output work, no mechanism
rescues it.

⚠⚠ **Reducible uncertainty must actually reduce.** The pushback above
is only honest if skill narrows the distribution. A system that ships
epistemic uncertainty **no competence can sharpen** is a resolutional
roll wearing environmental clothes, and should be caught in review as
one.

⚠ **The drip is still reachable by accident.** Nothing in the
architecture prevents paying out on a timer; the conservation rules
forbid a reward with no *source*, not a reward with a *cadence*.

⚠⚠ **The drift risk is adoption-by-convenience.** Nine append-only
ledgers exist; every byte a reward schedule would need is already
correct. If the levelling question gets answered by rendering one, we
will have adopted #46 without ever deciding to. See
[#92](./92-inner-contradiction.md).

## Implications

1. ⭐⭐ **Correct the claim that we refuse variable reward.** We refuse
   *resolutional* variance and take the rest from an honest world. The
   levelling conversation should open with that rather than an apology
   — the interesting sentence is *our randomness is reducible by skill
   and his is not.*
2. ⭐⭐ **Treat "can the player trace it?" as a gate on any derived
   reward.** A band, a standing, a competence that a player cannot
   account for has failed this lens however honest its arithmetic. This
   is a reviewable property, not a feeling.
3. ⭐⭐ **Name "announce the surprising, not the every" as the
   anti-habituation mechanism, and generalize it past traits.** It is
   currently specified for one subsystem and is in fact the platform's
   general answer to the problem Schell solves with a slot machine.
4. ⭐⭐ **The levelling question is not "what number goes up."** It is
   *what arrives unbidden, and is it honest?* Framing it the first way
   guarantees a gauge; framing it the second way is the actual problem
   — and the deviation narration is already a partial answer.
5. ⚠ **Audit epistemic uncertainty for reducibility.** Any system whose
   unknowns no competence can narrow has smuggled in a resolutional
   roll. Reviewable property, not a feeling.
6. ⚠ **If a gauge ever ships, it must be because it was chosen.**
   The no-gauge rule is a *rendering* rule, which makes it the exact
   shape [lint-family.md](../lint-family.md)'s census-then-ratchet
   pattern handles: census the surfaces that render a derived number to
   a player, gate today's count as the ceiling.

[^aogd-rw]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #46, the Lens of Reward**
    (≈ p. 234), from the game-balance chapter, section "Balance Type
    #8: Rewards." The six questions, the variable-reward arithmetic,
    the "cheesy trick" remark about escalating rewards, the acclimation
    observation and the bringing-donuts-to-work analogy are Schell's;
    all analysis ours. Read from the author's Google Play edition,
    2026-09. Lens numbers are stable across editions.
