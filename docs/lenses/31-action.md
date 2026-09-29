# #31 · The Lens of Action

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-ac]

## The lens

Think about what your players can do, what they cannot, and why.
**What are the basic actions? What are the strategic actions? What
strategic actions would you like to see, and how would you change the
game to make them possible? Are you happy with the ratio of strategic
to basic? What do players wish they could do and cannot — can you
enable it?**

> **From the book.** *"A game without actions is like a sentence without
> verbs—nothing happens. Deciding the actions in your game will be the
> most fundamental decision you can make as a game designer."*
>
> ⚠ And the passage that introduces it is the sharpest thing in the deck
> aimed at our medium. On text adventures: *"the solution to a tricky
> puzzle was thinking to type an unusual verb, like 'spin the fish' or
> 'tickle the monkey.' While this was all very creative, it was also
> often frustrating—**for every one of the hundreds of verbs a game
> supported, there were thousands it did not.** As a result, players did
> not really have the 'complete freedom' that text adventure interfaces
> pretended to give them. **It is possible that this frustration, more
> than anything else, caused text adventures to fall from favor.**"*

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** — it is the
lens that asks whether the expressive surface is real. Its answer is
shared with [#79 Freedom](./79-freedom.md).

## Why our design prompts it

Because he has written the obituary of our medium, and the cause of
death he names is **a promise the interface could not keep.**

## The verdict

### ⭐⭐ Push back — a command line never made that promise

Schell's critique targets a **parser**: a thing that accepts free text
and thereby implies it might understand anything. *Spin the fish* is a
guess at a hidden vocabulary.

We are not building a parser. The architecture is **web MVC applied to
the command line** — a **command palette**, which has never pretended to
be exhaustive. `git` does not promise every verb in the dictionary and
nobody resents it. A palette's promise is different and keepable: *here
is what is available.*

⚠ **But the critique does not vanish; it splits.** His complaint is
really about the gap between promised and actual affordance, and a CLI
closes only half of it:

| half | what it is | closed? |
|---|---|---|
| **guessing** | is there a verb here, and what is it called? | ⭐ **closed.** No hidden vocabulary to divine |
| **discovery** | how do I learn the palette exists and what is in it? | ⚠ **inherited, in full** |

### ⭐⭐⭐ And our answer to discovery is better than his

**The refusal is the progression UI.** Verb conferral was retired
precisely so that a command must **exist** in order to tell you why you
cannot use it yet. You do not guess whether the verb is there; you type
it, and the world tells you what is missing.

> **Schell's text adventure answered an unknown verb with "I don't
> understand." Ours answers with what would lift the refusal.**

He has no equivalent, because his frame has no mechanism for a game
explaining its own boundary in the boundary's own voice. ⭐ Hypertext
compounds it: **clickables preview their command**, so the palette
partly reveals itself in use rather than requiring study.

### ⭐⭐ Adopt — the ratio question, which we have never asked

*"Am I happy with the ratio of strategic to basic actions?"* is the
question this entry exists for, and it is uncomfortable.

We ship an enormous verb surface — `hew` `drive` `sink` `raise` `shore`
`stake` `char` `smelt` `muddle` `strain` `garnish` `quench` `sharpen`
`plate` `cure` `smoke` `fell`. **How many of those are strategic?**

> **A basic action is what you type to advance a process. A strategic
> action is one that has an alternative.** The test: *name the other
> thing the player could have done instead, and why they might.*

⚠ **A simulation-heavy game is structurally at risk of a terrible
ratio** — many verbs, few decisions — because each honest step of a real
process wants its own verb, and a step is not a choice. ⭐ The smelt is
the shape of the good answer: `smelt` itself is **basic**; the strategic
action is *which ore you chose to smelt*, and it is strategic only
because grade survives the smelt. **The verb is the procedure; the
decision is upstream of it.**

Which gives a reviewable property per trade: *where in this chain is the
choice, and is the player making it or just executing?*

## Tensions & risks

⚠⚠ **A visible boundary is honest and still a wall.** A palette's
promise is keepable precisely because it is finite — but that means the
edge of the possible is **legible**, where a graphical game hides its
edge behind art. We trade *I couldn't find the verb* for *I can see
there is no verb.* Better, and not free.

⚠ **A flat palette of 200 commands is enumeration, which lens 2
forbids.** The escape is that an instrument affords the command and a
pack ships a row — `measure <channel>` rather than a verb per trade — so
the surface grows by **composition**. That escape has to keep holding;
the lints are what hold it.

⚠ **His third question has no home.** *What strategic actions would I
like to see, and how would I change the game to make them possible?* is
a design-generating question, and nothing in our process asks it. Our
verbs arrive from **what a trade does**, never from *what decision we
wish a player faced.*

## Implications

1. ⭐⭐⭐ **Run the ratio audit on the shipped verb surface.** For every
   verb: is it basic or strategic, and if strategic, what is the
   alternative? A trade whose verbs are all basic is a **procedure**,
   and that is a lens 1 and lens 4 finding arriving through lens 2's
   door.
2. ⭐⭐ **Write the refusal answer down as the medium's defence.** *A
   parser says "I don't understand"; a palette says what would lift the
   refusal* is the one-line reply to the best argument against text
   games, and it currently exists only as an implementation detail of
   conferral's retirement.
3. ⭐ **Ask the third question at slate time.** *What decision do we wish
   a player faced here?* — before asking what the trade does. It is the
   only route to a strategic verb that is not an accident.
4. **Keep composition auditable.** The palette must grow by instrument
   and row, never by enumeration; `lint:*` is the guard.

[^aogd-ac]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #31, the Lens of Action**
    (≈ pp. 184–185), from the game-mechanics chapter, in the
    emergent-gameplay section immediately after **#30 Emergence**. The
    five questions, the sentence-without-verbs line, and the text
    adventure *"spin the fish"* passage are Schell's; all analysis ours.
    Read from the author's Google Play edition, 2026-09.
