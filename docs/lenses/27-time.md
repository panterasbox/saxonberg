# #27 · The Lens of Time

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-tm]

## The lens

*"Timing is everything."* Experiences are spoiled by being **too short
or too long, too fast or too slow.**

**What determines the length of my gameplay activities? Are players
frustrated because it ends too early? Bored because it runs too long?
Would clocks or races make it more exciting? Time limits irritate
players — would I be better off without them? And would a hierarchy of
time structures help: several short rounds that together comprise a
larger round?**

> **From the book.** Three ideas carry it.
>
> **Clocks and races.** A **clock** limits play by absolute measure —
> the Boggle sand timer, the football game clock, *"even the duration of
> Mario's jump in Donkey Kong."* A **race** sets no fixed limit but
> pressure *"to be faster than another player"* — obvious in an auto
> race, subtle in *Space Invaders*, where you are racing the aliens to
> the ground.
>
> ⭐ **Nested time.** *"Just as there can be nested spaces, sometimes
> time is nested, as well."* Basketball has a game clock to bound the
> whole **and a much shorter shot clock inside it** — *"to help ensure
> players take more risks, keeping the gameplay interesting."*
>
> **Time that matters without limiting.** *"In baseball, innings are
> not timed, but if the game goes on too long, it can exhaust the
> pitcher, making time an important part of the game."*
>
> And the section that gives the lens its shape — **Controlling Time**:
> *"Games give us the chance to do something we can never do in the real
> world: control time."* **Stop** it (a time-out, the pause button).
> **Speed it up** (*Civilization*, years in seconds). *"But most often,
> we **rewind** time, which is what happens every time you die in a
> videogame and return to a previous checkpoint"* — Braid making the
> manipulation itself the mechanic. He closes on the vaudevillian
> adage: ***"leave 'em wanting more."***

## Which of our seven it sharpens

**[Lens 6 · Economy](../design-lenses.md)**, which already holds that
**time is the currency every other one is priced in** and until now had
no instrument at all. Secondarily **lens 3a**, because subjection to
time is a large part of what makes a place read as a world.

⭐ It is also **Mechanic 2** of the book's most systematic chapter —
*space · time · objects · actions · rules* — of which we had taken only
[#31 Action](./31-action.md).

## ⭐⭐⭐ The inversion: his chapter is about escaping time

Every power in *Controlling Time* is forbidden here, and **each by a
named invariant that was adopted for an unrelated reason:**

| his power | ours | forbidden by |
|---|---|---|
| **rewind** — the checkpoint | ⛔ | **A2**: ledgers are append-only. *You cannot edit your past* |
| **stop** — the pause | ⛔ | the absent-body doctrine — the dying clock explicitly **does not freeze** when you go linkdead |
| **speed up** | ⛔ | one world clock, running for everybody at once |

> **Schell's chapter is about the player escaping time. Ours is about
> the player being subject to it.**

That is not an accident of three separate decisions; it is the same
decision three times — **a shared, honest, recorded world cannot offer
any of them**, because each would have to be offered to one person
while everyone else kept living.

## ⭐⭐ And we spend the player's time on purpose

The other half, and it is the part a CLI makes visible: **a command
line is naturally request-and-response.** Nothing in the technology
requires an act to take time. Durative activities span command
interpretation anyway — **a time budget imposed by the design, not by
the machine** — to buy an experience larger than one
command-and-response.

His word for the structure is the right one: **nested time.** The shot
clock inside the game clock is, here:

> **a command · inside an engagement · inside a shift or a contract ·
> inside a quest's horizon.**

And his non-limiting case is one we already ship and had not connected
to him: **the pitcher.** Innings are not timed; a long game exhausts
him. That is [exertion](../subsystems/exertion.md) exactly — nothing
caps your day, and a long one costs you. ⭐ *Time as a cost rather than
a limit* is the honest form, and it is the form a simulation reaches
naturally.

## Tensions & risks

⚠⚠ **His first question is unanswered here, and it is the important
one.** *What determines the length of my gameplay activities?* Today:
**the fiction's own physics** — a smelt takes as long as a smelt takes.
That is honest, and it is **not the same as chosen.** Nobody has asked
whether a step's duration is the right amount of a player's evening,
and *"the model says so"* is an answer about the world that declines to
be an answer about the person.

⚠⚠ **No pause plus no rewind is unusually unforgiving of ordinary
life.** A checkpoint exists so a mistake is not permanent; a pause
exists so a doorbell is not a death. We have neither, by invariant —
and our stated audience includes **students with forty minutes**. This
is the sharpest cost of the inversion and it has never been priced.

⚠ **We have almost no races.** Nearly every temporal pressure here is a
**clock** — the dying clock, maturation, spoilage, growth, the shift —
which is pressure from *the world*. A race is pressure from *another
person*. The market supplies some emergently (first to a market, a land
rush), but **no race has ever been designed**, and it is a whole
category of excitement we have not chosen for or against.

⚠ **Q5's warning lands on exactly one part of the design.** *Time limits
irritate players.* Most of our clocks are **world** clocks — the crop
grows whether you watch or not, which irritates nobody. The durative
acts are the exception: they hold your input, and that is the irritating
kind. The distinction is worth keeping explicit, because they get
discussed as though they were one thing.

⚠⚠ **"Leave 'em wanting more" has no mechanism in a persistent world.**
The adage assumes the designer controls the curtain. We do not: a
session ends when the player stops, and with no designed end **the only
curtain-caller is fatigue**, which is the worst one available. ⭐ Note
this is the same shape as [#55](./55-visible-progress.md)'s pull
problem — the design is good at letting things continue and has no
opinion about stopping.

## Implications

1. ⭐⭐⭐ **Answer Q1 deliberately for at least one chain.** Pick a trade
   and ask what its step durations cost a player's session — not
   whether they are true. *True* is settled; *right* has never been
   asked, and the two are independent.
2. ⭐⭐ **Price the no-pause/no-rewind cost against the audience.** The
   invariants are Tier A and should stay; what is missing is an honest
   account of who they exclude and what softens it — the durative acts
   are where a safe interruption could live without touching A2.
3. ⭐ **Decide about races.** A designed race — pressure from another
   person under a deadline — is a category we have never shipped and
   never rejected. The land rush and the market already hint at it.
4. ⭐ **Separate world clocks from input-holding clocks** in design
   talk. Q5's irritation applies only to the second, and conflating them
   makes the warning unusable.
5. **Ask what ends a session.** Not to impose an end, but because
   *nothing* currently proposes one, and fatigue is the default answer
   by omission.

[^aogd-tm]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #27, the Lens of Time**
    (≈ pp. 173–174), from the game-mechanics chapter, **Mechanic 2:
    Time**, sections *Clocks and Races* and *Controlling Time*. The six
    questions, the Boggle / football / Donkey Kong clocks, the
    basketball shot-clock nesting, the *Space Invaders* race, the
    baseball pitcher, the stop / speed-up / rewind trio with
    *Civilization* and *Braid*, and *"leave 'em wanting more"* are
    Schell's; all analysis ours. Read from the author's Google Play
    edition, 2026-09.
