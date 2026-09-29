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

## ⭐⭐⭐ The optimism, and where it actually fails

The pencil framing rests on a premise, and it should be stated as one:

> **The game believes people are basically good.** It asserts that
> communities, gathered, want good things for themselves. ⚠⚠ **And if
> that is wrong, we have built one of the most dangerous social
> engineering projects of the modern era.**

⚠ **That is not hyperbole and this entry will not soften it.** Every
component is present — instrumented behaviour, conferred standing, and a
polity empowered to set incentives. What makes it safe is *only* the bet.

### ⭐⭐ But the structure carries more of the load than the premise does

`draft-constitution.md` Art. IV: **three co-equal chambers — Producer,
Capital, Consumer** — and a bill becomes law on a **majority of houses
(two of three).** So a harmful bill needs **two classes' interests
aligned.** That is not a bet on goodness; it is factions checking each
other.

> ⭐ **The stated philosophy is Rousseauian — *people are basically
> good.* The implemented structure is Madisonian — *factions check each
> other.* The structure is the more defensible bet, and it is the one
> that actually runs.** The project is better protected than its
> philosophy implies.

### ⚠⚠ And the case that defeats it is the one that motivated the project

The reassuring example is tobacco: *no online community would pass a law
encouraging smoking — you would need consumers and labour with a vested
interest, and capital would struggle to raise for it.* True of America
now. ⚠ **Run it at 1955 instead:** consumers (smokers) want them,
producers (tobacco workers) need the jobs, capital sees a bull market.
**All three houses align. Two of three, trivially.**

So the filter works when harm falls **outside** the classes and fails
when **a class chooses its own harm and the others profit from it.**

> ⭐⭐⭐ **That is not an edge case. It is the exact shape of the industry
> this project defines itself against** — the Feed's harm is consumers
> *wanting* it. **The one harm the three-house structure cannot filter is
> the one that motivated the design.**

### ⚠ The subversive case has a partial answer, and it is not prevention

Extreme bills are self-limiting because they are **legible**. Diffuse,
delayed or benefit-framed harm is not, and no threshold catches it,
because the harm is not articulable at vote time.

The available mechanism is the **append-only record**: harm becomes
visible **retrospectively** even when it was not visible prospectively,
and §6 means nobody can quietly tidy it afterwards. ⭐ Friction and
daylight for the third time in this entry — not *we will stop it* but
**you will be able to prove it.**

⭐ **And the real backstop is B7** — AGPL and the right to fork. It
prevents nothing; it makes the experiment **observable and portable**, so
a wrong bet produces public evidence rather than a private disaster.
Weak comfort, and real.

### ⭐ Where the good-floor actually sits

⚠ **B2 is not a second statement of the optimism**, and reading it that
way is a mistake worth recording. *Players are never evil* is a claim
about **alignment** — which poles a player may occupy on one axis of the
two-axis system ([alignment-slate](../slates/builds/alignment-slate.md):
Good─Neutral─Evil as *Mitra─Pan─Moloch*, against
Lawful─Neutral─Chaotic). The constitutional bet is about **collective
choice.** Different objects.

⭐⭐ **They sit on opposite sides of this lens.** A game that lets you
practise being a piece of shit is a plausible mechanism for changing
players *for the worse* — and this design declines it, and *actively
works against it*. **B2 is #110's answer; the constitutional optimism is
#110's risk.**

⭐ **And the locked axis is the right one to lock.** Good/evil is closed
for players; **Lawful/Chaotic is fully expressible** — and how you relate
to law and order is *precisely* the Compact's subject matter. **The free
axis is the one the game is actually about.**

⚠ Two notes on it. It is **friction, not prohibition** — *actively work
against* is not *you cannot* — so `measurement.md`'s *the platform
records; it rarely forbids* survives: no evil terminus to arrive at,
plenty of bad behaviour available, all of it recorded, drift redeemable.
And by the altitude check it is **the grain**: B2 is Tier B, so a game on
this substrate that wants playable villains is buildable, against the
grain, at a cost. *Players are never evil* is this platform's
**recommendation**, not its law.

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
5. ⭐⭐⭐ **Publish the premise and the risk together.** *The game
   believes people are basically good; if that is wrong this is one of
   the most dangerous social engineering projects of the modern era* is
   the most honest sentence available about this project, and it is
   strengthened rather than weakened by the Madisonian structure sitting
   under it.
6. ⚠⚠ **Name the unfilterable harm.** Two-of-three cannot stop a class
   choosing its own harm while the others profit — which is the Feed's
   exact shape. **Nothing in the design currently addresses it**, and it
   is the failure mode the project is most exposed to precisely because
   it is the one it was built against.
7. ⚠ **Decide what to do about the unconsented good change.** The
   Toontown case is the hardest thing in this lens and we have no
   position on it.
8. ⭐ Schell's *don't replace the instructor* is answered better here
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
