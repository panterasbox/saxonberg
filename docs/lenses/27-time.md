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

| his power | ours | why |
|---|---|---|
| **rewind** — the checkpoint | ⛔ | **A2**: ledgers are append-only. *You cannot edit your past* |
| **speed up** | ⛔ | one world clock, running for everybody at once |
| **stop** — the pause | ⭐ **we have one, and it is better than his** | see below |

> **Schell's chapter is about the player escaping time. Ours is about
> the player being subject to it** — with one exception the design got
> right and which is easy to miss.

Rewind and speed-up are refused for the same reason twice: **a shared,
honest, recorded world cannot offer either to one person while everyone
else keeps living.**

### ⭐⭐⭐ But the pause exists, and it is selective

Schell's pause stops **the world**. Ours cannot. What the design does
instead is stop **the bill**:

> **You cannot pause the world. The world agrees not to charge you for
> your absence.**

Go linkdead and the body lingers in-world while metabolism *"re-stamps
and integrates nothing"* and *"reconnect resumes as left"*; every other
arm of `reconcileConditions` freezes too, with a far-past guard
dropping implausible gaps. The stated principle is **absence should
never cost a living player anything** — so you cannot starve while
disconnected.

⭐ **And there are exactly two carve-outs, both principled rather than
incidental:**

| exception | why | recorded at |
|---|---|---|
| **the dying clock** | the same kindness applied here *"makes Alt-F4 a cure for death"* | [mortality.md](../subsystems/mortality.md) — and pinned by a test built so that a well-meaning *"fix"* fails only the dying assertions, naming the reason |
| **combat** | the beat loop has no presence-freeze; a fight ticks on to `maxBeats` and a draw — *"you can't rage-quit a fight"* | [combat.md](../subsystems/combat.md) |

⚠ **This entry's first draft said the pause was forbidden, citing the
absent-body doctrine.** Exactly backwards: that doctrine **is** the
pause. The dying clock is its one advertised exception, and mistaking
the exception for the rule is easy because it is the part that got
written up.

### ⭐⭐⭐ And it is not a linkdead rule — it is a relief principle

The freeze is an instance of something more general, which is worth
stating at its own altitude because it governs far more than absence:

> **If you are unable to meet an obligation — for any reason, absence
> or not — you may be relieved of it.**

And *how* you are relieved depends on what kind of obligation it is:

| the obligation is… | relief | example |
|---|---|---|
| **property** | ⭐ remove the **property** | you cannot carry the room, so you lose the room |
| **intrinsic / biological** | remove the **obligation** | you cannot eat, so you do not get hungry — *the linkdead freeze* |
| **either** | ⭐⭐ **automate the discharge** | your body eats from your own pack |

⭐⭐ **The third option is the interesting one and it is not built.** It
is the same shape as *disengage or flee from combat*, generalised: your
character **acts on standing instructions** rather than the world
suspending itself around them.

And it may be the better model for the biological case, for a reason
that belongs to lens 1:

> **Suspending metabolism makes the world lie a little.** A body that
> does not burn while its player is away is not a body. **Automating it
> keeps the model honest and moves the cost from the person to their
> preparation** — you are not punished for being absent, you are
> rewarded for having provisioned.

⭐ Which turns absence from a **freeze** into a **design surface**:
*what does my character do when I am not here?* That is a question with
interesting answers, where *nothing* is not.

⭐⭐ **And the machinery already exists.** Standing instructions are a
**brain**, and the engine already runs brains on bodies; the
[lineage backstop](../slates/builds/lineage-slate.md) already has NPCs
holding positions a player might hold. **A netdead body running a brain
is the same object the design already contemplates**, pointed at
yourself.

⚠⚠ **With one bound, and it falls straight out of existing doctrine:**

> **Automation may *preserve* you. It may never *earn* for you.**

Flee, eat, bank the fire, set the tool down, come off shift — yes. Keep
smelting and collecting wages — no, because that is precisely the **AFK
wage** [employment.md](../subsystems/employment.md) already names as a
lens 6 failure. *Survive, do not produce* is the line.

⚠ **The honest costs of automating.** It spends your resources without
your consent in the moment — if the food in your pack was precious, an
autonomous meal may be worse than a freeze. It needs the automation to
be **good enough not to be stupid**, which is the same unset competence
dial [#86](./86-character-function.md) found for seat-holding NPCs. And
which of the three reliefs is right for which obligation is **a
playtest question**, not a doctrinal one.

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

⚠ **What the pause does not yet cover is the interesting remainder.**
Metabolism and conditions are handled; the doorbell is not a death by
starvation. What still runs is **combat** and **the dying clock**, both
on purpose — and **durative activities**, which nobody has ruled on.

⭐⭐ **The candidate answer is player-authored disconnect behaviour**, and
it is a better answer than a blanket freeze: *what should my character
do if my connection drops?* **Disengage or flee** is the obvious one for
combat, and it preserves *you can't rage-quit a fight* while removing
*you can't answer the door* — the character acts, at a cost, rather than
the world stopping. Other activities want their own reactions (bank the
fire, set down the tool, come off shift). Unbuilt, and squarely doable.

⚠ Until it exists, the residue lands on the stated audience — **students
with forty minutes** — and it lands on exactly two systems rather than
on the whole game, which is a much smaller bill than the first draft of
this entry implied.

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

   ⚠ **And it cannot be unit-tested**, which is why it has never been
   asked: there is no assertion that says a smelt should take ninety
   seconds. It is a playtest question. ⭐⭐ But **the absolute is
   untestable and the *relative* is not** — *this agent spent 60% of its
   session waiting and that one spent 12%* is measurable, comparable,
   and enough to find the outliers without anyone deciding the right
   number. A **swarm of agents playing and reporting their time
   signatures** would not beat real humans; it would **scale**, which
   nothing else here does.

   ⭐⭐⭐ **That is the third ask for one pattern.** The combat gym
   shipped; an *economy gym* was asked for and never built
   ([lens-deck-salvage.md](../lens-deck-salvage.md)); this is a pacing
   gym. Three consumers is the project's own threshold for promoting a
   mechanism — **headless agent benches may be a platform capability
   rather than three separate builds.**
2. ⭐⭐ **Build player-authored disconnect behaviour.** The freeze
   already covers metabolism and conditions; what remains is combat,
   dying and the durative acts, and the answer is not a blanket pause
   but **the character acting on standing instructions** — disengage,
   flee, bank the fire, come off shift. It preserves both carve-outs'
   reasons and removes most of their cost.
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
