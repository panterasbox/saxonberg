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

## Tensions & risks

⚠⚠ **The cost is real and unpaid.** Schell's technique works because it
arrives **unbidden** and keeps arriving. Our replacement — the mirror —
arrives only on **pull** (see [#55](./55-visible-progress.md)). Whether
pull alone sustains anyone is an empirical question about players, not
one doctrine can settle, and it is the live content of the levelling
conversation.

⚠ **Our rewards are maximally regular — which is the failure mode he
names.** Derived, deterministic, proportional to work: the opposite of
variable. The only variance we permit is epistemic (you did not know
what the ore held), which is variance in the *world*, not in the
payout. It may be enough. Nobody knows, and it has not been tested.

⚠ **We have no acclimation answer.** His fix for habituation is to
escalate reward value as the player advances. Our economy resists that
structurally — a wage is a wage, and inflating it to feel generous is
exactly a dishonest nerf in reverse. Progression here is capability and
standing, not bigger numbers, which means **the habituation problem is
real and unaddressed** rather than solved.

⚠⚠ **The drift risk is adoption-by-convenience.** Nine append-only
ledgers exist; every byte a reward schedule would need is already
correct. If the levelling question gets answered by rendering one, we
will have adopted #46 without ever deciding to. See
[#92](./92-inner-contradiction.md).

## Implications

1. ⭐ **Claim the refusal in writing.** "We refuse variable and
   escalating reward, and here is what it costs us" belongs in the
   levelling conversation as its opening position, not as something
   discovered halfway through.
2. ⭐⭐ **Treat "can the player trace it?" as a gate on any derived
   reward.** A band, a standing, a competence that a player cannot
   account for has failed this lens however honest its arithmetic. This
   is a reviewable property, not a feeling.
3. **Decide the acclimation answer or record that we do not have one.**
   The honest candidates are all non-numeric: new *kinds* of thing to
   want, new refusals lifted, new people who defer to you. If that is
   the answer, say so; it is a design commitment, not an absence.
4. ⭐⭐ **The levelling question is not "what number goes up."** It is
   *what arrives unbidden, and is it honest?* Framing it the first way
   guarantees a gauge; framing it the second way is the actual problem.
5. ⚠ **If a gauge ever ships, it must be because it was chosen.**
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
