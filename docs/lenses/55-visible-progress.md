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
**visible** progress.

### ⭐⭐⭐ What "the mirror" actually is

Because this entry and its two siblings lean on the term, state it
once. **The mirror is not a screen. It is a property**, from
[measurement.md](../measurement.md) — the platform defined against the
Feed by the same measurement pointed the other way:

> **The feed measures you and hides the measurement. The mirror
> measures you and shows you.**

Which yields the commitment: **any measurement the platform makes of
you is one you can read.** A derived quantity whose evidence you cannot
inspect is the Feed's shape regardless of intent — which is *why* the
ledgers are append-only and readable and why competence derives from a
transcript rather than being stamped.

⭐⭐ **It has two channels, and the second one is easy to miss:**

| | what it delivers | when |
|---|---|---|
| **Pull** | your **record** — acts, transcript, evidence, the band that derives from them | whenever you ask |
| **Push** | the **deviation narration** — *"You'd not have done that a year ago"* | only when a write pushes `expressed` away from `equilibrium` |

And two standing limits: a self-view may show **your recent acts, never
your position** (bands, not the number under them), and *"announce the
surprising, not the every"* — because narrating every write is both a
nag and a tutorial in farming.

## What the design answers

**Question three has a real answer.** Progress is hidden from the feed
and revealed on request — and *additionally* pushed, unbidden, at the
moments it is surprising. Nothing is unknowable; almost nothing is
ambient. That makes the no-gauge rule a claim about **delivery** rather
than about **secrecy** — much easier to defend, and much harder to
violate by accident.

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

## The verdict

⭐ **Schell wins on solvability; we answer progress better than he
asks.** His third question we satisfy twice over — pull for the record,
push for the surprise — and the *ban* is narrower than it looks. But
his neighbouring principle exposes something we have only by accident:
nothing in a derivable world tells a player that the wall in front of
them is passable, except a refusal that happens to name its remedy.
**Adopt solvability as a first-class obligation**, not a side effect.

## Tensions & risks

⚠⚠ **The pull channel still has to be discovered.** Push requires no
knowledge of itself; pull does. The deviation narration partly rescues
this — a player who has been told *"you'd not have done that a year
ago"* now knows there is something keeping count — but that is an
accident of the trait mechanism rather than a designed on-ramp, and it
only fires for people whose behaviour has actually shifted. **"It's
there if you look" is how a design fails this lens while believing it
passed.**

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

1. ⭐⭐ **The pull channel needs a first-time on-ramp.** Something must
   make a new player aware there is a record to read — once, cheaply,
   without becoming ambient. The deviation narration does this by
   accident for players who change; it does nothing for a player whose
   behaviour is steady, which is most of them early on.
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
