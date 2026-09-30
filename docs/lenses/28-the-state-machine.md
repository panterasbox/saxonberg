# #28 · The Lens of the State Machine

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-sm]

## The lens

To think about what information changes during your game: **what are the
objects? What are their attributes? What are the possible states for each
attribute? And what triggers the state changes?**

> **From the book.** The caption he gives it, and reuses for
> [#29 Secrets](./README.md), is the premise the whole chapter rests on:
>
> *"**Gameplaying is decision making. Decisions are made based on
> information.** Deciding the different attributes, their states, and
> what changes them is core to the mechanics of your game."*
>
> ⚠⚠ And the passage that matters more than the card, because it is the
> sentence a narrowing refactor exists to answer:
>
> *"In a game of poker… you could define a player's hand as an area of
> the game space that has five card objects in it, or you could decide
> you don't want to think of cards as objects and just call the player's
> hand an object that has five different card attributes. **As with
> everything in game design, the "right" way to think about something is
> whichever way is most useful at the moment.**"*
>
> Followed immediately by the cost:
>
> *"Games that force the players to be aware of too many states (too many
> game pieces, too many statistics about each character) to play can
> confuse and overwhelm."* — deferred to his balance chapter, *"techniques
> for optimizing the amount of state the players have to deal with."*

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** and
**[lens 1 · Pedagogy](../design-lenses.md)**, co-primary.

Lens 2, because this is the **structural** half of the question
[#93](./93-the-nameless-quality.md) asks aesthetically: *does the
substrate impose properties nobody asked for?* `93` argues charm is a
budget denominated in carves; this entry asks what a carve **is**.

⭐⭐⭐ And lens 1, because *is the world derivable* turns out to have a
**literal** implementation here: **the machine is shown to the player.**
The client's inspection card renders the object's mixin composition as
chips, and its own source calls the card **a teaching surface**. A player
can derive what is possible by *reading the model*, not only by
experiment — which is the strongest available form of the derivability
claim, and it is shipped rather than aspirational.

⚠ **Written 2026-09-29 against `build/narrowing` (MR !303, unmerged).**
The plan decisions and the census tool it cites are on that branch and
have not landed; the citations are to artifacts that exist and are stable
rather than to shipped behaviour. **Nothing here prescribes what the
Idea, Agent or Location passes should decide** — the lens's business is
the question each of them should be able to answer.

## At what altitude

| answer | altitude |
|---|---|
| an attribute has a **provenance** — authored, stamped, or derived — and the three are not interchangeable | **invariant** (A3) |
| a derived attribute has no stored state; *what triggers the change* is **that you looked** | **invariant** (A3, A16) |
| "whichever framing is most useful" is evaluated against **every row that exists**, never the moment | **invariant** — `lint:mass` is it as a ratchet |
| the composition vocabulary is **public**; an instance's composition is **perceptual** | **invariant** — the honest-fog rule |
| presentation may **compress and reorder**; it may never **subtract** | **invariant** — two independent instances, below |
| a state is read in **words and bands**, not decimals | ⭐⭐ **the grain** — another game here may want a decimal, and [#55](./55-visible-progress.md) says so |
| how much state a player is made aware of | **this title's** |

## Why our design prompts it

Because his four questions have been asked of this design **mechanically,
across the whole tree**, which is not a thing the lens anticipates being
possible. `check-composition-census.ts` walks **683 classes and 1922
content rows** and reports, per prototype-chain layer, *which attributes
that layer declares and how many rows of that class author any of them.*

That is Q1–Q3 as a measurement. And taking the measurement turned up a
problem the lens has no vocabulary for.

⚠ **But the more important difference is the one the census does not
show**, and it inverts what the lens is *for*.

## ⭐⭐⭐ His lens is a designer's instrument. Here it is a player-facing surface

Schell's four questions are a thinking tool — something a designer asks
privately about a model the player will only ever experience through play.
**We publish the answers.**

The client's inspection card renders the subject's mixin composition as a
row of chips, and the affordance envelope carries
`composition: string[]` so the menu can label and group without a second
round trip. Three decisions inside that are worth more than the feature:

- ⭐⭐ **The suffix is stripped.** `chipLabel()` turns `ExitableMixin` into
  **`Exitable`** — *“the suffix is an implementation technique, not part of
  the name”*, and the codebase's own convention already agrees (the marker
  says `PropertiedMixin` while the file, the concept and every doc say
  `Propertied`). So there is a deliberate **register translation** between
  the engineering identifier and the word a player learns, and it costs one
  line.
- ⭐⭐⭐ **A curated palette, and the curation was found by driving.** A
  `PLUMBING` set demotes `PostRegistration · Propertied · Persistable ·
  Forkable · Shadowable · ClientState`, because *“the lounge's chip row
  read `PostRegistrationMixin · ExitableMixin · DetailedMixin`, so two of
  the three visible slots on a **teaching surface** were spent on
  machinery. **The chips exist to show a player the composition palette
  they would author with**; a lifecycle hook is not part of that
  palette.”* ⭐ **That set is a curriculum decision encoded as a client
  constant**, and it is the real answer to Schell's *too many states
  confuse and overwhelm* — not compression this time but **curation of
  which states are worth naming.**
- ⭐⭐⭐ **And the rule it was fixed under is the one to carry:** *“Sorted
  **LAST rather than removed**. The resolver's answer is the ACTIVE
  composition and it is true — **hiding part of it would be the client
  editing a server fact.** Demoting it is a presentation decision, which
  is the client's; the overflow count still includes them.”*

> ⭐⭐⭐ **Presentation may compress and reorder. It may never subtract.**
> That is the same rule as the banding argument below — the model keeps
> every state, the reading does not — arriving independently, once for
> numbers and once for composition. Two sightings make it doctrine rather
> than a habit.

⭐ **And the learning has a mechanism, which is the part that makes this
more than a debug panel.** `MixinMissingNote` is a refusal whose payload
is *the name of the mixin you lack*. So the engine **declines in the
vocabulary of its own type system**, and a player accumulates the palette
from refusals as much as from inspection — which is
*the refusal is the progression UI* ([#31](./31-action.md)) and this lens
meeting at a single wire note. The ambient half is the status bar, the
shelf and the tooltips, over `subscribableFields` descriptors
**contributed by the mixin that owns the gate**.

## ⭐⭐⭐ And the composition is itself derived, per viewer

Which is where his frame breaks in the second place. The wire is explicit
that what ships is the **active** composition, *“not declared: augments,
implants, species innates and on-shift conferral all change it at
runtime”* — `MixinApi.getActiveMixins` is a read, not a lookup.

> ⭐⭐⭐ **So the thing that tells you which attributes exist is itself a
> derived attribute.** Schell's lens assumes the object / attribute /
> state structure is the designer's fixed frame, outside the machine.
> Here the frame is **inside** the machine, changes at runtime, and
> **differs by observer.**

And the observer half is done with unusual discipline. From the affordance
envelope: *“Both lists are filtered, and **filtering means DELETION**. A
verb the viewer is not entitled to know about is absent — never present
and flagged — because a response that admits a hidden verb exists leaks
the fact that it exists. **Same for a concealed mixin.**”* The centre
chip's kind is viewer-aware the same way, and *“a third ‘unknown’ value
would announce **that** something is being withheld.”*

> ⭐⭐⭐ **So the precise statement is: the vocabulary is public, an
> instance's composition is perceptual, and the withholding is invisible.**
> You may learn the entire palette — that is the curriculum. What you may
> not learn is which of it *this* thing has right now, and you are not told
> that you were not told.

⭐ That is [#29 Secrets](./README.md) answered with more precision than the
lens asks for: his category **C** (private to one player) is implemented
as **absence** rather than as a marked gap, and his category **D** —
state the game knows and players do not — is given up at the level of the
*schema*, not only of the values B3 already publishes.

## ⭐⭐⭐ His rule has no time dimension, and the god class is the rule iterated

*"Whichever way is most useful at the moment"* is correct advice for one
designer sketching one artifact, and it is **how a substrate rots.**

Every step that produced a class which *is and does everything* was a
local application of it. The example is in the house docs: `Thing` was
called `Prop` until 2026-09-03, a name that **"named nothing… and read as
*generic object nobody cares about*, so nobody defended it, and a
spoilage gauge got hung on it to serve four rows that belonged on
`Provision`.**" Hanging the gauge there *was* the most useful framing at
that moment. It was still wrong, and it was wrong for a reason the moment
could not see.

> ⭐⭐⭐ **Schell's rule is a statement about one designer's convenience.
> In a persistent, multi-author platform the right framing is the one
> that is most useful *across every row that exists and every author who
> will ever compose it* — which is exactly the question the census asks:
> for every template, does it need every mixin its class composes?**

⚠⚠ **And because the machine is a teaching surface, this is not
hygiene — it is accuracy.** If a player learns that `Chattel` means
*ownable*, a class composing it dishonestly **teaches them something false
through the interface.** The god class stops being a maintenance smell and
becomes **misinformation**, which is why the narrowing plan's own framing
line is the strongest argument in the whole pass: *“the first thing a
player can feel is that a shop counter, a floor and a hearth **stop
claiming they can be owned like a knife and hidden like a knife**.”*

⭐ And the honest reply to *"but you cannot evaluate against rows that do
not exist yet"* is `lint:mass`: a **ratchet** does not need to know the
future. It pins today's count as a ceiling that may fall and never rise,
which converts an unanswerable design question into an affordable
operational one. That is the general shape — *census, then ratchet* — and
this lens is a good argument for why it is not mere hygiene: **the thing
being ratcheted is how honestly an object describes itself.**

## ⭐⭐⭐ An attribute has a provenance, and his lens cannot express it

The census header is binding on how its own numbers are read, and it is
an epistemology of attributes:

> *"A layer no row authors is one of three different things and the number
> cannot tell them apart:*
>
> 1. *a **misrepresentation** — the thing is not that, and the mixin
>    should come off (a seed is not chattel);*
> 2. *a **content gap** — the thing IS that and somebody owes rows (the
>    mine's unauthored air);*
> 3. ***behaviour with no authored surface** — `ChattelMixin`'s
>    `_chattelId` is STAMPED, not authored; `WetMixin` is derived. Both
>    would read zero here and both are load-bearing."*

Reading 3 names the gap in the lens. Schell's attributes are all of one
kind — values somebody sets. Ours come in three:

| provenance | what it is | example |
|---|---|---|
| **authored** | written in a row's `data:` block by a person | `mass`, `longDescription` |
| **stamped** | minted at runtime and never authored | `_chattelId`, the template path, the identity path |
| **derived** | computed on read from a ledger; no stored value exists | competence, traits, renown, standing, culpability, wounds, wetness |

> ⭐⭐⭐ **A3 — *derive, don't track* — is a doctrine about attribute
> provenance, and Schell's lens has no slot for it.** *"What are the
> possible states for each attribute"* presumes the attribute **has** a
> stored state. For a derived one there is no state at all: there is a
> function, its inputs, and the moment you asked.

⚠ **And that is why the measurement cannot be a verdict.** A count of
zero looks identical in all three cases, so *"no row authors this"* is
evidence of nothing on its own. The plan's **D1** is the standard that
closes it, and it is the reusable artifact of the whole pass — a zero is
narrowing only when **no runtime writer targets a host of that class**,
**no reader needs it there** (controller narrowing, view `requires:`, Api
narrowing, a row naming the mixin in a non-`requires:` field), *and*
**the concept is false of what the class IS — argued from the class
docstring, not from the count.**

⭐⭐ **Generalized, that is the lens's missing question:** for every
attribute a class declares, *which provenance is it, and who would ever
write it?* An attribute whose answer is *nobody, ever* is either stamped,
derived, or a lie — and only the third one is a defect.

## ⭐⭐⭐ Q4 is the one our architecture answers strangely

*"What triggers the state changes for each attribute?"*

For an authored attribute: a setter, and the accessor pair is where the
invariant fires. For a stamped one: a mint path, gated. For a **derived**
one:

> ⭐⭐⭐ **Nothing triggers it. The state changes because you looked.**
> Reconcile-on-read means the attribute's value is a function of *when
> the question was asked*, and **A16** exists precisely because of it —
> *every reconcile-on-read consumer tolerates a backward clock, re-stamp,
> integrate nothing* — since **game time is not monotonic.**

That is a genuinely unusual answer to his question and it has a cost
worth naming: **a derived attribute cannot be watched.** You cannot hook
its change, because there is no change event; there is only the next
read. Every push-shaped feature over a derived value — a notification
that your band went up, a card that refreshes when standing moves — has
to manufacture the trigger somewhere else, and that is a recurring design
tax nobody has written down as one.

## ⭐⭐⭐ And here is the `bands-not-theta` warrant

[#55](./55-visible-progress.md) recorded that **`bands-not-theta` lost
its justification** when `measurement.md` Part 6.3 was scoped to declared
standards, named what the replacement would have to be — **false
precision** — and stated plainly: *"that argument has not been written."*

This is where it lives, and it has three legs, of which the third is the
strongest and comes straight out of the provenance table above.

**1 · Epistemic.** A derived value's precision is a property of the
**formula**, not of the **evidence**. `theta` computed from six transcript
rows will print to as many decimal places as you like, and not one of
them is warranted by six rows. A band is the honest width of the
estimate.

**2 · Cognitive — and this leg is Schell's, which makes it independent of
our doctrine.** *"Games that force the players to be aware of too many
states… can confuse and overwhelm."* Bands are **state compression at the
presentation layer**: the simulation keeps every state, the reading does
not. Which is exactly the shape the tree already uses elsewhere — `look`
renders the body in words, `exertion` makes reach *a body read, never a
number*, the `Shore` read is banded by competence, the survey ladder
gives you detail as you earn it. ⭐ **Our answer to "too many states" was
never fewer states. It was fewer numbers.**

**3 · Structural, and it inverts the framing.**

> ⭐⭐⭐ **A band is not a rounding of theta. `theta` is the estimator and
> the band is the attribute.** If competence is derived, Q3 — *what are
> the possible states for this attribute* — is answered by the **band
> vocabulary**, because that is the state space the design actually
> declares. `theta` is an implementation detail of deciding which band you
> are in. What is *real* is the evidence in the transcript; theta and band
> are both derived from it, and only one of them is a claim you can
> defend.

⚠ That does not make theta secret — B3 stands, and
`advancement.md` says theta *"has a referent and may be read."* The claim
is narrower and survives the amendment: **the band is the modelled state
and theta is a computation over evidence**, so presenting the band first
is honesty about the model rather than a restriction on the reader.

## The verdict

⭐⭐⭐ **Push back on the framing, adopt the cost.**

*Whichever way is most useful at the moment* is the one piece of advice in
the deck that is straightforwardly **wrong for this kind of artifact**,
and worth recording as such: a substrate many people compose over years
cannot take design decisions at the altitude of a moment. **The
narrowing pass is the repair, and the census plus D1 is the replacement
rule.**

⭐⭐ **Adopt the second passage without reservation.** *Too many states
confuse and overwhelm* is the missing warrant for banding, and it is
better than the one we lost because it owes nothing to the no-gauge
doctrine — it would hold in a game that printed every number it had.

## Tensions & risks

⚠ **A derived attribute cannot be watched, so every push over one
manufactures its trigger.** ⭐ The seam for this is better than I first
read it: `subscribableFields` puts the descriptor **on the mixin that owns
the gate**, so the trigger has an owner by convention rather than
case-by-case. ⚠ What is untested is whether that pattern reaches
**ledger-derived** values — a band that moved, standing that shifted —
where the inputs are an append-only stream and there is no field to hang a
descriptor on. The shipped descriptors are over composition and contents,
not over derivations of a ledger.

⚠⚠ **D1's third clause is the expensive one and it does not mechanize.**
*The concept is false of what the class IS, argued from the class
docstring* is a judgment, per class, that no lint can take. That is
correct — it is the clause that stops a census becoming a verdict — but
it means the Idea, Agent and Location passes each cost a human read of
every class, and the temptation under schedule pressure will be to let
clauses 1 and 2 stand alone. **Passing 1 and 2 while the concept is true
is reading 2, a content gap, and narrowing it deletes real behaviour's
future.**

⚠ **The census measures authoring, and authoring is not use.** Its own
header says so. A class whose rows all author a field proves the field is
authored, never that anything *reads* it — so the instrument is strong
against misrepresentation and silent about dead weight. The mirror
measurement (*which declared attributes does nothing ever read?*) does not
exist.

⚠⚠ **A mixin name is now a word we teach, which makes the naming
doctrine pedagogy rather than style.** *Name the substrate, not its first
consumer* and *shared substrate must not ship one consumer's prose* are
**curriculum rules** on this reading, and W9's `FurnaceMixin` →
`BurnerMixin` and `ToolItem` → `Tool` are **vocabulary corrections in a
language players are being taught.** ⭐ The `PLUMBING` set absorbs most of
the programmer-nouns already — `Propertied`, `Persistable`, `Forkable`,
`Shadowable` are all demoted — so the curriculum is in better shape than
the identifier list suggests. ⚠ But nothing gates it: a new mixin whose
name means nothing to a player will appear on a teaching surface, and no
lint or review question asks whether the word teaches.

⚠ **`93`'s carve budget and this entry can disagree.** Narrowing is good
for honesty and each carve is a class an author must learn. There is a
number of rungs past which the ladder is worse than the god class it
replaced, and neither entry knows what it is.

## Implications

1. ⭐⭐⭐ **Write the `bands-not-theta` argument down**, closing
   [#55](./55-visible-progress.md)'s implication 1. The three legs above
   are it; the structural one is the load-bearing one and belongs in
   `advancement.md` beside the `{theta, band}` derivation.
2. ⭐⭐⭐ **Promote D1 out of the plan.** *No writer · no reader · the
   concept is false, argued from the docstring* is a general standard for
   *is this attribute a lie*, and plans are retired at sweep time.
   Wherever it lands, the three readings of a zero go with it — they are
   what make the standard necessary.
3. ⭐⭐ **Record attribute provenance as vocabulary.** *Authored ·
   stamped · derived* is used everywhere and named nowhere; `ref-shapes.md`
   declares how a field points at other Stuff and has no companion for
   where a field's **value** comes from.
4. ⭐⭐ **Add the mirror census: which declared attributes does nothing
   read?** Composition honesty is half the question; the other half is
   dead weight, and the current instrument cannot see it.
5. ⭐ **Name the derived-attribute push tax.** A design rule for *how a
   push-shaped feature over a derived value gets its trigger* would settle
   case-by-case argument that recurs in every build touching a ledger.
6. ⭐ **Ask Q4 by provenance at slate time.** *Is this authored, stamped,
   or derived — and if derived, what does the read cost and who reads it?*
   A slate that cannot answer it is describing a stat it has not decided
   how to compute.
7. ⚠⚠ **Fix `card-surface.md`'s stale v1 note.** It says template path
   and **mixin composition** *“belong in a future admin surface”* and that
   *“the substrate doesn't project those fields today”*. Both shipped:
   `AffordanceResultEnvelope.composition` carries the active set and the
   client renders chips. ⭐ The correction matters beyond tidiness — the
   doc frames the surface as **admin**, and on this entry's reading it is a
   **learning** surface, which is a different thing with a different
   audience and different design rules. *(Corrected in that doc
   2026-09-29.)*
8. ⭐⭐ **Graduate disclosure by extent, not by tier.** Wizards and parcel
   owners should see more of the machine than a passer-by — and the shape
   for that is `heldExtents` and parcel title, **never an `isAdmin` flag**,
   because [access.md](../subsystems/access.md) has no author tier and the
   whole point of the chips is that the palette belongs to everybody.
9. ⭐ **Ask whether a new mixin's name teaches.** It appears on a teaching
   surface with its suffix stripped; if the bare word means nothing to a
   player, either the name or the `PLUMBING` set is wrong. Cheap as a
   review question, currently asked nowhere.
10. **Pair with [#93](./93-the-nameless-quality.md).** Same refactor, two
   halves: `93` asks whether the substrate lets an author make something
   with the quality; this one asks whether the substrate is telling the
   truth about what its objects are.

[^aogd-sm]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #28, the Lens of the State
    Machine** (≈ p. 176), closing *Mechanic 3: Objects* in the
    game-mechanics chapter and leading directly into the *Secrets*
    section and **#29**. The four questions, the *"gameplaying is
    decision making"* caption, the poker-hand framing with *"whichever
    way is most useful at the moment"*, and the *"too many states"*
    passage are Schell's; all analysis ours. Read from the author's
    Google Play edition, 2026-09. Lens numbers are stable across
    editions.
