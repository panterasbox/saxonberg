# Lens: Motivation

> Part of the [design lenses](./README.md) set. Lens named from Jesse
> Schell's *A Book of Lenses*; questions paraphrased, analysis our own.
>
> **Layers interrogated: both**, and this is the edtech crux. The
> platform is structurally an extrinsic-reward machine; the game has to
> bootstrap intrinsic motivation out of it.

## The lens

What makes a player *want* to play — and keep playing — when nothing
forces them? Schell splits motivation into **intrinsic** (the activity
is its own reward; you do it because it's fun) and **extrinsic** (you do
it for a reward outside the activity — points, grades, a prize), and
points at Maslow's hierarchy as a map of human needs a game can meet.
The craft move is almost always toward intrinsic: extrinsic rewards are
easy to add and famously brittle, because they can *crowd out* the
intrinsic motivation that was already there. The questions: what need
does this meet? Is the player doing this for itself, or for a carrot?
And if for a carrot, what happens when the carrot stops?

> **From the book.** Schell maps motivation onto **Maslow's hierarchy**
> — the **Lens of Needs** asks "on which levels of Maslow's hierarchy is
> my game operating?" — and, crucial for this entry, he folds **Self-
> Determination Theory straight in**: that same lens asks whether the
> game "fill[s] the needs of competence, autonomy, and relatedness," and
> he promises "lenses that individually address competence, autonomy,
> and relatedness" later on. He also splits motivation intrinsic vs.
> extrinsic (the **Lens of Motivation**), warning that external pressure
> turns a "wanna" into a "hafta" — his name for the crowding-out this
> entry calls overjustification — and that you "ignore [motivation's]
> complexity at your peril." The durable motivators are the higher-order
> needs, not the carrots.[^aogd-mo]

## Why our design prompts it

Because this is the question gamified education lives or dies on. The
hope is that the game makes students *want* to learn (intrinsic); the
failure mode — well-documented as the **overjustification effect** — is
that dangling rewards for learning converts genuine interest into
reward-dependence, so the moment the points stop, so does the learning.
And [vision.md](../vision.md) reaches *straight* for the extrinsic
lever: it designs "desirable in-game rewards" specifically to pull
students toward "learning materials the student may be struggling with
or avoiding." That's a legitimate tool and a live hazard, named in the
same sentence. The lens is how we tell which one we're holding.

## What the design answers

### The intrinsic core is unusually strong — and already structured

Read against Self-Determination Theory — the standard account of
intrinsic motivation (people are intrinsically driven by **autonomy**,
**competence**, and **relatedness**), and the same triad Schell names
directly in his Lens of Needs — the design hits all three, almost as if
it were built to:

- **Autonomy** — the no-hard-rails stance, soft diegetic limits,
  meaningful choices, "you author your own space." The player acts; the
  game rarely shoves.
- **Competence** — "depth is earned, not chosen"
  ([char-gen](../subsystems/char-gen.md)); you visibly grow into
  capability through doing. This is the platform essence ("what you
  become is earned") restated as an intrinsic need met.
- **Relatedness** — "text-first is social-first"; the lounge seats you
  with your people before anything else; NPCs *remember* you
  ([recognition](../slates/builds/recognition-slate.md)). "Among others who
  remember you" is the relatedness need, named in the ratified platform
  essence.

The onboarding arc reads as a Maslow climb in miniature: **belonging**
(welcomed, seated with your people) → **esteem** (recognized, earned
depth) → **self-actualization** (authoring your own space). The design
is meeting intrinsic needs by its very shape, not by bolting on
rewards.

### The standalone principle is secretly an intrinsic-motivation
### guarantee

"The game must be fully playable with zero vertical inputs" looks like a
business requirement; it's also an intrinsic-motivation guarantee. If
the game is fun *without* the learning, then the learning rides on
intrinsic game-enjoyment rather than on extrinsic reward alone. The
[Lens of the Toy](./the-toy.md) is the operational test of exactly this.

## Tensions & risks

- **Overjustification is the headline risk, and `vision.md` walks
  toward it.** Offering "desirable rewards" for avoided topics can
  convert "I find this interesting" into "I do this for the reward,"
  then extinguish the behavior when the reward stops. The design needs
  to *know* when it's deploying extrinsic scaffolding versus building
  intrinsic motivation — and scaffolding needs a fade plan, not a
  permanent place.
- **The first sensor is already extrinsically loaded.** Coursework and
  grades — the education vertical's signal — are themselves an extrinsic
  system the student didn't choose. Gamifying an already-extrinsic task
  is the hardest case for bootstrapping intrinsic motivation. (The
  platform's cleaner candidate signals — "did you brush?", "did you
  run?" — may actually bootstrap intrinsic motivation *better*, because
  they're less pre-loaded with externally-mandated pressure.)
- **The standard gamification layer pulls the other way.** Badges and
  leaderboards ([vision.md](../vision.md)) are pure extrinsic, and they
  sit in tension with the SDT-aligned intrinsic core. Not fatal, but
  every extrinsic layer added is a little crowding-out pressure on the
  intrinsic one.
- **Relatedness via NPCs is the double-edged one.** "An NPC who
  remembers you and wants you to succeed" is a powerful intrinsic
  (relatedness) motivator — and the exact mechanism that, aimed wrong,
  becomes manipulative attachment. Shared blade with
  [Indirect Control](./indirect-control.md) and
  [Transformation](./transformation.md).

## Implications

1. **Adopt SDT (autonomy / competence / relatedness) as the named
   motivation framework.** The design already aligns with it by
   instinct; naming it turns instinct into a checklist — every new
   feature can be asked which intrinsic need it serves, and whether it
   adds extrinsic crowding.
2. **Treat extrinsic rewards as scaffolding with a fade plan.**
   `vision.md`'s "targeted motivation" should carry an explicit "...and
   then we remove the carrot once intrinsic interest takes" story.
   Permanent carrots are the overjustification trap.
3. **Use the standalone/Toy test as the intrinsic-motivation test.** If
   it's fun with the goals and the lesson stripped out, the lesson is
   riding intrinsic enjoyment. If it isn't, no reward will save it for
   long.
4. **Prefer meeting needs over granting rewards.** The strongest
   motivators in the design (authorship, recognition, earned
   competence, belonging) are *needs met*, not *rewards given* — and
   needs-met doesn't crowd out intrinsic motivation the way rewards do.
   Bias new design toward the former.
5. **This lens and [Transformation](./transformation.md) share an axis.**
   Intrinsic-vs-extrinsic *is* the healthy-motivation-vs-manipulation
   axis once the player is a student or a child. Read the two together.

---

[^aogd-mo]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #23, the Lens of Motivation**
    (p. 160), from the chapter on the player's motivation (sections
    "Intrinsic vs. Extrinsic Motivation" and "Wanna vs. Hafta"). The
    closely related **Lens #22, the Lens of Needs** (p. 156) is where
    Schell maps Maslow and names the Self-Determination Theory triad
    (autonomy / competence / relatedness) — *not* an external framing, as
    an earlier version of this note wrongly claimed. 3rd-edition print
    pagination; lens numbers stable across editions.
