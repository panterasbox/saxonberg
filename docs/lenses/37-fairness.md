# #37 · The Lens of Fairness

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-fr]
>
> ⚠ **Opened to record a negative finding** — what the deck's
> "fairness" turns out to mean, and therefore what it has no lens for
> at all. **Amended 2026-09-29:** that finding was too quick. There is
> one contest here, it is the genre's oldest complaint, and its answer
> is the Compact.

## The lens

Think about the game from each player's point of view and, taking their
skill levels into account, give each a chance of winning that each will
consider fair. **Should the game be symmetrical, or asymmetrical, and
why? Which matters more — that the game is a reliable measure of who
has the most skill, or that it is an interesting challenge to
everyone? If players of unequal skill are to play together, by what
means?**

> **From the book.** The worked material is **circular balance** —
> rock breaks scissors, scissors cut paper, paper covers rock — *"a
> simple way to ensure that every game element has both strengths and
> weaknesses."* And the caveat is the interesting part: *Alien vs.
> Predator* is widely agreed to give Predators a significant advantage
> in multiplayer, and *"players do not consider it to be unfair,
> however, because it is in keeping with the story world."*

## Which of our seven it sharpens

**[Lens 7 · Governance](../design-lenses.md)** — by not being it.
Secondarily lens 3b, where contests actually happen.

## ⭐⭐⭐ The negative finding

This entry was opened expecting distributive justice — the lens named
*Fairness*, in a deck of 116, ought to be the one that asks whether a
game treats people justly. **It is not.** It is competitive balance:
symmetry, win probability, handicapping, rock-paper-scissors.

> ⭐⭐ **Across all 116 lens names and every card read, "fair" only ever
> means "even contest."**

⚠ **Re-checked 2026-09-29** against the three lenses an earlier count had
missed. **#111 Responsibility** (*"does my game help people? How?"*) and
**#112 the Raven** (*"is making this game worth my time?"*) are the
**designer's** obligations, not the player's treatment, and **#∞** asks
why *you* are doing this. The finding survives: nothing in the deck asks
whether a game treats a person justly outside a contest.

There is no lens anywhere in the deck for **being wronged outside a
contest** — no lens for being refused, excluded, denied credit, passed
over, or permanently barred. [#25 Judgment](./25-judgment.md) comes
closest and stops at *do players feel the judgment is fair*.

**Why the deck lacks it, and the reason is not an oversight.** A game
with one designer, one shipped artifact and no polity has almost no
mechanism that decides something *about a person* outside a contest.
There is nothing to have a lens about. The moment you add an economy
that hires and lends and lets rooms, and a polity that admits and
confers, you generate an entire category of decision **the deck has no
vocabulary for.**

⭐ That is the strongest available argument that
[lens 7](../design-lenses.md) had to be invented rather than borrowed —
and a caution about how far the deck can be trusted as a checklist for
this particular design.

## ⚠⚠ But there is one contest, and it is the genre's oldest complaint

⚠ **Correction to the finding above, which was too quick.** *Even
contest* looked like a category we mostly do not have. We have the most
notorious instance of it in the history of the form.

**MUDs were criticized as unfair because wizards and players inhabit
the same world, and wizards can cheat.** Not metaphorically — a wizard
writes arbitrary code, so anything they can imagine they can make true:
a friend's wealth, a rival's loss, a verdict, a band. That is an
asymmetry in a shared world, which is exactly what this lens is for.

**And the platform does not close it.** Call security and the sandbox
mitigate; they do not prevent. ⭐ The posture is already stated
elsewhere in its honest form — **TypeScript access *is* root, so guards
constrain good faith, not malice**; their job is friction and daylight,
and what they detect is *evasion* rather than intent. Nothing in the
code stops a wizard cheating up their buddy, because the wizard is
downstream of the code.

### ⭐⭐⭐ Which is why the answer is constitutional, not technical

A power that can rewrite the enforcement cannot be bounded by the
enforcement. So the remedy sits one layer up, and the Compact is the
only layer that can act on a being with root:

| the wizard problem | what answers it |
|---|---|
| a wizard can falsify the record of what they did | ⭐⭐ `draft-constitution.md` §6 — records shall be **tamper-evident and universally verifiable**, *"so that no operator — **not even the branch that runs it** — can falsify it undetectably."* You cannot prevent the act; you can make it **detectable** |
| a wizard can make an arbitrary judgment | §7 — human enforcement is reserved for matters of judgment and is **always subject to review** |
| a wizard may act in bad faith | **B6** — the roster stays small and its holders owe a **fiduciary duty**; the duty is the constraint that code cannot be |
| the whole arrangement may be captured | **B7** — AGPL-3 and the right to run your own. The exit is the final check, and it is the founder's only constraint |

> ⭐⭐ **The Compact is the answer to the wizard problem**, and the
> arrangement is revisable: what the legislature tolerates today it may
> **entrench** tomorrow, and a constraint on wizards is exactly the kind
> a polity would vote for — because it binds the house
> ([measurement.md](../measurement.md) open question 5).

### ⚠ And the *Alien vs. Predator* test does **not** license it

His observation was that players accept a significant asymmetry when it
fits the story world. Wizards are diegetic here — the executive branch,
the people running the game — so the asymmetry is in-fiction and
disclosed, and it is tempting to file it under that rule.

**It does not qualify, and the difference is worth stating as a general
authoring rule:**

> **Fictional coherence licenses a *bounded* asymmetry. An unbounded
> one needs a constitution.** A Predator is stronger by a known amount;
> a wizard is stronger by an amount with no ceiling, and no amount of
> narrative fit makes an unbounded advantage acceptable.

## The verdict

⭐ **Push back on the lens as a whole; adopt its third question, which
we have already answered silently.**

> *Which is more important: that my game is a reliable measure of who
> has the most skill, or that it provides an interesting challenge to
> all players?*

⚠ Note this question has a second edge given the section above: a
reliable measure of skill is *only* reliable if nobody can reach behind
it. **The wizard problem is therefore not only a fairness question but
a measurement-integrity one** — the same act corrupts both.

**We chose reliable measure, comprehensively, and never wrote it down
as a choice.** Competence derives from evidence; *the preview is the
outcome* (A10); there is no rubber-banding, no difficulty scaling, no
hidden adjustment anywhere. Every one of those is this question
answered the same way, by different builds, without anyone noticing
they were answering it.

It has a cost, and Schell names it: a reliable measure is **not
automatically an interesting challenge** to someone outranked. His
answer would be to handicap.

⭐⭐ **Ours is different and better, and it is worth stating as the
house position:** we solve skill mismatch by **consent and terms**, not
by handicapping. A contest is entered on agreed terms by people who
chose it, which preserves the reliable-measure property *and* lets
unequal players meet — where a handicap would have purchased the
interesting challenge by corrupting the measurement. Same problem, and
the fix does not cost us A10.

⚠ **Where he still lands a hit:** consent solves mismatch only for
people who *have* someone to consent with. It does nothing for a player
with no peer in range, which is the cold-start problem again, and
handicapping is precisely the tool that would have papered over it.

## What is worth keeping

**The *Alien vs. Predator* observation is a live authoring rule for
us.** An asymmetry players accept *because it fits the fiction* is
exactly what species, clades and body plans are — a plan that flies is
not balanced against one that does not, and nobody expects it to be.

> **The acceptance test for an asymmetry is fictional coherence, not
> parity** — which is also why *strangeness is a finish, never a
> function*: an asymmetry that the fiction does not explain is the one
> that reads as unfair.

## Implications

1. ⭐⭐ **Write down that we chose reliable measure over challenge
   parity.** It is one of the most consequential unstated decisions in
   the design — it forecloses dynamic difficulty, rubber-banding and
   handicapping permanently — and it currently exists only as the
   accumulated shape of several builds.
2. ⭐ **State consent-and-terms as the house answer to skill
   mismatch**, and note what it does not cover: a player with no peer
   in range.
3. **Use fictional coherence as the asymmetry test** in content review,
   rather than parity.
4. ⚠ **Do not read the deck as a checklist for governance.** This entry
   is the evidence: the lens that ought to have covered it covers
   something else entirely, and a designer trusting the deck's coverage
   would conclude the question does not exist.
5. ⭐⭐ **Write the wizard asymmetry down as a fairness problem, not
   only a security one.** It is currently discussed in the resilience
   and wizard-duty material, where it reads as a threat model. Read
   through this lens it is the genre's oldest player-facing complaint,
   and **the honest pitch is that we answer it with a constitution
   rather than a claim that it cannot happen** — which is both true and
   more convincing than the claim would be.
6. ⭐ **Make the bounded/unbounded distinction an authoring rule.**
   Fictional coherence is the acceptance test for an asymmetry with a
   ceiling; anything without one is a governance question.

[^aogd-fr]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #37, the Lens of Fairness**
    (≈ p. 217), from the game-balance chapter, in the section on
    symmetry and circular balance. The four questions, the
    rock-paper-scissors treatment and the *Alien vs. Predator*
    observation are Schell's; the negative finding and all analysis are
    ours. Read from the author's Google Play edition, 2026-09. Lens
    numbers are stable across editions.
