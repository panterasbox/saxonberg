# #110 · The Lens of Transformation

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-tf]
>
> ⭐ **Read as a pair with #111 Responsibility**, because #110's card
> ends by deferring to it: *"Is it really your business, though, to worry
> about how your game changes players? This is the subject of our next
> chapter."*

## The lens

**How can my game change players for the better? How can my game change
players for the worse?** Two questions, and that is the whole card.

> **From the book.** The setup is a complaint letter. A *Toontown
> Online* player wrote in **annoyed**: he normally played *Dark Ages of
> Camelot*, started Toontown on the side, and drifted into playing it
> more — because *"he found that he tended not to trash-talk anymore and
> was inclined to thank everyone who helped. He was **embarrassed (but
> also grudgingly grateful)** that a simple game for children had
> manipulated his thought patterns so easily."*
>
> Then Schell pushes, expecting you to think a speech habit is trivial:
> *"In the real world, violence is seldom a means toward an end; instead,
> **it is a form of communication** — one that people resort to when all
> else fails. It is a desperate way of saying 'I'm going to show you how
> much you are hurting me!'"*
>
> **And #111 answers the deferred question with one of its own —
> *"Does my game help people? How?"*** — set up by Kipling's 1922 iron
> ring for graduating engineers, worn on the pinky *"because your pinky
> guides your hand."* Schell hands you an invisible one: *"Your
> obligation begins today… Think about it carefully before you put it
> on, though, **because it doesn't come off.**"*

## Which of our seven it sharpens

**[Lens 4 · Values](../design-lenses.md)** and
**[lens 7 · Governance](../design-lenses.md)** — and it is the only lens
in the deck that asks what the *rubric itself* is for.

## ⚠⚠ The inversion: we are not holding the dial

Schell's ring assumes the **designer** controls the direction of change.
Here they do not. The values are **incentives**, and:

> ⭐⭐⭐ **The incentives are written in pencil, not ink.** The polity can
> change them, and could in principle invert the dispositions the game
> historically embodied. **That is why this is an experiment, and it is
> not without risk.**

So the promise cannot be *we will change you for the better.* It can
only be about the **arrangement** by which the direction gets chosen.

## ⚠⚠ Which is exactly what every platform says to dodge the question

*We're just the pipes. We don't decide what's in the feed — users do.*
The pencil answer is **structurally identical to the excuse**, and it
does not become honest by being sincere. What separates them has to be
named:

> *"We're just the pipes"* is a lie when the pipe-owner secretly shapes
> the flow. It is honest when the shaping is **published**, **recorded
> tamper-evidently**, and **amendable by the people affected**.
> ⭐⭐ **The difference is verifiability, not modesty.**

All three exist: published weights, `draft-constitution.md` §6 —
*no operator, **not even the branch that runs it**, can falsify
undetectably* — and lens 7's contestable criterion. The answer is
available; it has to be stated as a **distinction** rather than offered
as a disclaimer.

## ⭐⭐⭐ Tier A is the responsibility statement

If the polity can invert the values, then **#111 cannot be answered by
intentions**, because intentions are pencil. It can only be answered by
**what survives a vote**:

> **A1–A16 *is* the answer to "does my game help people?"** Not a
> mission, not a values doc — **the enumerated list of things nobody can
> vote away.** Everything else is pencil, deliberately.

That is checkable, which is this project's own standard
([measurement.md](../measurement.md): *promises do not survive scrutiny;
properties do*), and it is a far better answer to Kipling's ring than a
pledge. ⚠ It also means **the contents of Tier A are a moral document**,
and should be read as one rather than as an integrity checklist.

## ⭐⭐⭐ And the third mechanism: values instantiated in content

Ink and pencil are not the only options, and this is the design's actual
hedge:

> **Bake the values into every nook and cranny.** Policy can change and
> algorithms can change — but if the personalities, the settings and the
> lore are all set up to promote a certain disposition, **big swings by
> the polity are not frictionless.** The game hedges against them.

⭐ It works because **content is voluminous and distributed.** Inverting
policy is one vote; inverting disposition means rewriting every NPC,
every room, every piece of lore — thousands of authored edits, each of
which a reader can notice as discordant. **That is how real cultures
resist**: not by prohibition, but because the accumulated artifacts all
lean one way.

⭐⭐ **And it is the same posture the project already takes toward wizard
power** — *TypeScript access is root, so guards buy friction and
daylight* ([#37](./37-fairness.md)). **You cannot prevent the swing; you
make it expensive and visible.** The rogue polity and the rogue wizard
have one answer.

Which gives the [altitude table](../design-lenses.md) a column it was
missing:

| | how it resists change |
|---|---|
| **invariant** | code refuses |
| **grain**, stated | a default — cheap to depart from |
| ⭐ **grain, instantiated in content** | expensive — you must redo the corpus |

⭐ It also answers the good-floor question sideways. **B2** — *players are
never evil; feeding evil is drift, redeemable* — is formally **Tier B**
and amendable by whoever ships the code. The position is that it does
not need promoting to A **because the corpus carries it.** ⚠ Worth
knowing that this means the hedge is doing work the tier table does not
show.

## Tensions & risks

⚠⚠ **The hedge is proportional to a corpus we do not have.**
Content-borne values are friction only if the content is large *and
loved*. Thin corpus, cheap rewrite. **So this mechanism is weakest now**
and strengthens with exactly the thing [#17](./17-the-toy.md) says we
have not got: people who care.

⚠ **It resists good corrections too.** Values in content make a *needed*
change expensive as well as an unwanted one. That is what tradition is,
and it cuts both ways — the price of the hedge, not a flaw in it.

⚠⚠ **Generation collapses the friction, and nothing currently guards
this.** The hedge depends on the corpus being expensive to rewrite. If
LLMs author the bulk of it, the disposition lives in the **generator** —
and a generator is *one* thing to change, not thousands.

> **Hand-authored content is a thousand small votes for a disposition.
> Generated content is one vote, cast by whoever holds the prompt.**

⭐ Which relocates where the ink is needed: **not on the values, but on
who may change the generator** — a code-trust question, and therefore
A9's neighbourhood rather than a policy one. The content-generation track
and the values hedge are in direct tension, and the tension is invisible
today only because the corpus is still hand-made.

⚠ **The Toontown case cuts against us specifically.** Schell's player
was changed *without consenting and without noticing* — and was
**grudgingly grateful**, which is the most uncomfortable data point in
the chapter. It is precisely the outcome our doctrine forbids
engineering deliberately (*the polity's dial stops at the fiction's
edge*, [#79](./79-freedom.md)) and it is also the outcome anyone would
call success. **We have no account of what to do when the good change is
the unconsented one.**

⚠ **And the engagement-vs-outcome tiebreaker is still open** — *commit
that outcomes win, or admit honestly that they don't*
([lens-deck-salvage.md](../lens-deck-salvage.md)). ⭐ Under the pencil
framing, an open question is the **consistent** state rather than an
evasion: values are the polity's, so a permanent designer-side answer
would be the anomaly.

## Implications

1. ⭐⭐⭐ **Read Tier A as the responsibility statement and publish it as
   one.** It is the only answer to *does my game help people* that
   survives the polity, and it is already written, enumerated and dated.
2. ⭐⭐⭐ **State the pencil honestly, with the distinction attached.**
   *We cannot promise the direction of change; we can promise it is
   chosen in public, by the people affected, within limits nobody can
   remove — and here are the limits.* ⚠ Without *verifiability, not
   modesty*, that sentence is the attention industry's.
3. ⭐⭐ **Put the ink on the generator, not on the values.** Who may
   change what authors the corpus is the question the hedge actually
   depends on, and it is a code-trust question already.
4. ⭐ **Give the altitude table its resistance column.** *Instantiated
   in content* is a real third mechanism and it is currently invisible in
   the rubric.
5. ⚠ **Decide what to do about the unconsented good change.** The
   Toontown case is the hardest thing in this lens and we have no
   position on it.
6. ⭐ Schell's *don't replace the instructor* is answered better here
   than in his own chapter — **instructors hold standing in-fiction,
   wizards hold engine power** — and that answer belongs in the
   education material, not only in a lens entry.

[^aogd-tf]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #110, the Lens of
    Transformation** (≈ p. 564) and **Lens #111, the Lens of
    Responsibility** (≈ p. 572), from the chapters on how games change
    players and on designers' responsibilities. The two questions, the
    *Toontown* trash-talk letter, the violence-as-communication reframe,
    #111's single question and Kipling's 1922 iron-ring ritual are
    Schell's; all analysis ours. ⭐ The truly final **#∞ Lens of Your
    Secret Purpose** (*"why am I doing this?"*) and **#112 the Raven**
    (*"is making this game worth my time?"*) close the book after these.
    Read from the author's Google Play edition, 2026-09.
