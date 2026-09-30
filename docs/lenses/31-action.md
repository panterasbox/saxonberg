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

### ⭐⭐⭐ And the discovery half has more answers than he has problems

> ⭐⭐⭐ **His parser's vocabulary was hidden. Ours is data.** Commands
> are **command-view documents** with controllers — introspectable,
> harvested into `help`, and **attributed to the thing that affords
> them**. `getAffordances()` and the shipped `affordances` verb answer
> *where did this verb come from* in the game, at runtime.

That is the structural difference, and everything below follows from it.
A finite list is only cruel when it is **secret**.

| the problem | the answer | state |
|---|---|---|
| *is there a verb for this?* | the object affords it and will say so — affordance attribution + the `affordances` verb | shipped |
| *what is the verb called?* | the palette is data: harvested `help`, and **clickables preview their command** | shipped |
| *I typed it and it refused* | ⭐ **the refusal is the progression UI** — conferral was retired so a command must **exist** in order to decline, and the decline names what would lift it | shipped |
| *which of these did you mean?* | interactive **prompting** (`PromptApi`), already load-bearing for MQL selection | shipped |
| *two systems want the same verb* | ⭐⭐ see the ladder below | mostly shipped |
| *I don't know how to say it at all* | an **LLM front-end** translating to command sequences | proposed |

> **Schell's text adventure answered an unknown verb with "I don't
> understand." Ours answers with what would lift the refusal — and can
> be asked, in advance, what it affords.**

### ⭐⭐ The collision ladder — and the doctrine is *don't disambiguate*

He has no analogue for this, because a gamepad has twelve buttons. A
palette that grows by affordance eventually has two systems wanting
`wash`, and the house position is unusually strong:

> ⭐⭐⭐ **A verb collision is evidence that one of the two is on the
> wrong side of the line. Resolve it by working out which one, not by
> prefixing both.** ⚠ *"Do NOT pre-emptively subcommand to reserve a
> name."*
> — [command-spec.md](../subsystems/command-spec.md)

Only when both claimants are genuinely correct does the ladder start:
**unify behind an interface** (`Workable` ships this) · **re-afford** so
the right object carries it · **synonym** · **subcommands**, never
pre-emptively · and the slated **source-scoped invocation** —
`me::wash hands` versus `bowl::wash dishes` — where the player names
*which affordance they mean*.

⭐ That last is worth noticing as design: **it surfaces the architecture
in the syntax**, and it is learnable precisely because it mirrors how
affordance actually works. The player is not memorising a disambiguator;
they are saying which thing they are using.

### ⭐⭐ The palette is *more* expressive, for what players actually express

The intuition runs the other way — natural language feels freer — but it
does not survive contact with what a player spends their input on:

- **Precision of reference.** *Which* sword, *which* stack, *which* of
  four dockworkers. A pure NL system is at its weakest exactly where MUD
  players spend most of their keystrokes; **options and unix-like flags
  carry it natively.**
- **Selection.** `MQL` expresses *the set of things matching this* in a
  way no sentence does, and selection is most of what a player is doing
  before they act.
- ⭐⭐ **Composition.** A command can be aliased, scripted, put in a
  `def`, replayed. **Natural language does not compose** — you cannot
  build a macro out of a sentence. That is lens 2's own rule (variety
  from combination, not enumeration) applied to the *interface*.

⚠ **What NL is genuinely better at is discovery and the long tail** —
saying what you want without knowing the word for it. Which is exactly
what an LLM front-end buys, and why it is a *layer* rather than a
replacement:

> **The failure mode Schell describes was never natural language. It was
> natural language over a hidden finite list.** An LLM over a published,
> data-defined palette cannot have the *"thousands it did not"* problem,
> because it can read the list — and either map your phrasing onto the
> verb that exists or tell you plainly that none does.

⚠ It costs tokens, which makes it a capital question, which makes it the
polity's — noted rather than solved.

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

⚠ **A visible boundary is honest and still a wall.** A palette's
promise is keepable precisely because it is finite — but the edge of the
possible is **legible**, where a graphical game hides its edge behind
art. We trade *I couldn't find the verb* for *I can see there is no
verb.* Better, and not free. ⭐ Prompting and an NL layer soften it into
something **negotiable** — you ask, and it answers — which is the one
move a printed parser could never make.

⚠⚠ **The collision doctrine is expensive in the right way.** *Work out
which one is wrong* is correct and demands a design judgment every time,
where prefixing is free. It will be under pressure exactly when a build
is late — and `source::verb` shipping would make the cheap escape
available, which is precisely when the doctrine has to be re-stated.

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
5. ⭐ **Say the NL argument out loud somewhere public.** *The parser
   failed because its vocabulary was hidden; ours is data, and an LLM
   over a published palette gets NL's discovery with the palette's
   precision* is the strongest available answer to "why would anyone
   play a text game in 2026," and it currently exists nowhere.

[^aogd-ac]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #31, the Lens of Action**
    (≈ pp. 184–185), from the game-mechanics chapter, in the
    emergent-gameplay section immediately after **#30 Emergence**. The
    five questions, the sentence-without-verbs line, and the text
    adventure *"spin the fish"* passage are Schell's; all analysis ours.
    Read from the author's Google Play edition, 2026-09.
