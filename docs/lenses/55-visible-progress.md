# #55 · The Lens of Visible Progress

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-vp]

## The lens

Players need to see that they are making progress on a difficult
problem. What does it mean to make progress here? Is there enough of
it, and could there be more interim steps of progressive success?
**What progress is visible, what progress is hidden — and can the
hidden be revealed?**

> **From the book.** ⭐ **This is a *puzzle* lens**, not a progression
> one: it sits in the puzzles chapter as *Puzzle Principle #3: Give a
> Sense of Progress*, and its immediate neighbour is *Puzzle Principle
> #4: Give a Sense of Solvability* — *"If players begin to suspect that
> your puzzle is not solvable, they will become afraid that they are
> hopelessly wasting their time and give up in disgust. You need to
> convince them that it is solvable."* His example is Rubik's Cube,
> which ships **already solved** in the box, so the player has seen the
> answer state with their own eyes before they ever scramble it.

## Which of our seven it sharpens

**[Lens 4 · Values](../design-lenses.md)** — specifically, it corrects
a misreading of lens 4's instrument. It also lends lens 2 an argument
it did not know it had (the refusal, below).

## Why our design prompts it

Because at a glance we appear to refuse this lens outright, and we do
not. [measurement.md](../measurement.md)'s no-gauge rule — *no fidelity
meter, no sin counter, no progress bar, no streak, no leaderboard* —
reads like a direct answer of "none, and we will not reveal it" to the
lens's third question.

⭐⭐ **That reading is wrong, and the distinction it misses is the whole
levelling conversation.** The rule bans **ambient** progress, not
**visible** progress. The Mara/Aletheia property states it exactly: *the
feed hides the measurement; the mirror shows you.* We answer #55 with a
**pull** where most games answer it with a **push**.

## What the design answers

**Question three has a real answer.** Progress is hidden from the feed
and revealed on request. Nothing is unknowable; everything is
unsolicited-free. That is a defensible design position, and stating it
this way makes the no-gauge rule a claim about *delivery* rather than a
claim about *secrecy* — which is much easier to defend and much harder
to accidentally violate.

⭐⭐ **And the solvability half has an answer we built for other
reasons: the refusal.** In a derivable world, tractability is
guaranteed in principle and invisible in practice — the player cannot
see that the wall in front of them is passable. *The refusal is the
progression UI* exists precisely so the world can say **this is
reachable, and here is what lifts it.**

> **A refusal that names what lifts it is our Rubik's-cube-in-the-box.**
> It shows the player the solved state before they have solved
> anything.

That is a stronger reading of the refusal doctrine than the one it was
adopted under, and it is why a verb must **exist** in order to decline.

## Tensions & risks

⚠⚠ **A pull nobody knows to pull is not an answer.** Push has one
enormous advantage: it requires no knowledge of itself. If the mirror
is the whole reply to #55, then the mirror's **discoverability** is
load-bearing, and "it's there if you look" is how a design fails this
lens while believing it passed.

⚠ **Interim steps are exactly what we have chosen not to have.** Bands
are coarse by design. Coarse bands mean long stretches in which a
player is genuinely progressing and nothing can honestly say so — which
is the lens's second question answered *no* on purpose. The honest
options are (a) accept it, (b) supply interim signal **perceptually**
rather than numerically, in the way expertise-as-discrimination does.
Not (c) finer bands, which is a gauge with extra steps.

⚠ **Hidden and absent are indistinguishable from the outside.** This is
the sharpest risk the lens exposes. A player cannot tell "the system is
tracking this and will show me if I ask" from "nothing is tracked."
Both feel identical until the first pull, and a player who never
believes there is anything to pull never pulls.

## Implications

1. ⭐⭐ **The mirror's discoverability is a design obligation, not
   polish.** If progress is pull-only, something must make a first-time
   player aware there is a thing to pull — once, cheaply, without
   becoming ambient. This is the single highest-value open item this
   lens produces.
2. ⭐ **Recognize the refusal as our solvability device and hold it.**
   Every refusal names what lifts it; that is not only fairness
   (see [#25](./25-judgment.md)), it is the mechanism that tells a
   player the wall is a door. A refusal that names no remedy fails two
   lenses at once.
3. **Decide the interim-signal question deliberately.** Either coarse
   bands with nothing between them is the design — say so — or interim
   progress is delivered perceptually, never numerically.
4. ⭐ **Add "hidden vs. absent" to design review.** For any measured
   thing: can a player who has never pulled distinguish this from
   nothing being measured? If not, that is the finding.
5. **Stop citing the no-gauge rule as a ban on visible progress.** It
   bans ambient progress. The distinction is the difference between a
   defensible position and an indefensible one, and the doc should say
   the defensible thing.

[^aogd-vp]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #55, the Lens of Visible
    Progress** (≈ pp. 258–259), from the puzzles chapter, section
    *Puzzle Principle #3: Give a Sense of Progress*. The three
    questions, the pay-raise aside, and the neighbouring *Puzzle
    Principle #4: Give a Sense of Solvability* with its Rubik's Cube
    example are Schell's; all analysis ours. Read from the author's
    Google Play edition, 2026-09. Lens numbers are stable across
    editions.
