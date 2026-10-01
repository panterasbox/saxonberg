# #66 · The Lens of Channels and Dimensions

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-cd]

## The lens

To map game information onto the means of carrying it: **what data need
to travel to and from the player? Which data are most important? What
channels do I have available? Which channels suit which data, and why?
Which dimensions are available on the different channels — and how
should I use them?**

A **channel** is a route information travels. A **dimension** is an axis
of variation *within* that channel.

> **From the book.** He rates it unusually highly:
>
> *"Choosing how to map game information to channels and dimensions is
> **the heart of designing your game interface**. Use this lens to make
> sure you do it thoughtfully and well."*
>
> And the sentence immediately before the card is the warning, which
> matters more to us than to him:
>
> *"…different dimensions on one channel of information represent, which
> might be **difficult for some players to understand or remember**.
> **Good use of channels and dimensions is what makes for an elegant,
> well laid out interface.**"*

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** — and it is the
first instrument in the deck aimed at **rendering** rather than
authoring. Secondarily **lens 1**, because *layered presentation* is a
pedagogical mechanism here, not a cosmetic one.

## At what altitude

| answer | altitude |
|---|---|
| the number is the truth; the word is a rendering, and rendering may not fork the type | **invariant** |
| a real unit is a **falsifiable precision claim** — don't denominate in litres what you modelled in vibes | **invariant** |
| the article agrees with the identity rung | **invariant** — `lint:identity` rule 2 |
| which form serves which venue | ⭐⭐ **the grain** — the mapping is this substrate's opinion and an author may route differently |
| how many dimensions to overload before a player loses the thread | **this title's** |

## ⭐⭐⭐ Why our design prompts it — we are the inverse of his assumption

Schell assumes **many channels, each with a few dimensions**. Visuals,
audio, haptics, a HUD, colour, animation — so his design problem is
*which channel carries what*, and his examples are about moving data off
a crowded screen onto a sound.

We have **one medium.** Not one channel — the prose stream, the card
feed, the status bar, the shelf, tooltips and the prompt are genuinely
separate surfaces in his sense — but all of them are made of the same
stuff.

> ⭐⭐⭐ **So almost every interface decision we make is a dimension
> decision, not a channel decision.** That is a narrower and more
> disciplined version of his problem, and it is why the answers below are
> unusually precise: when you cannot move data to another medium, you
> have to be exact about which axis of the one you have is carrying it.

## The dimension inventory

### ⭐⭐⭐ The article carries the ontology

[presentation.md](../subsystems/presentation.md)'s **register** is three
values — and it is not decoration:

| register | reads as | who |
|---|---|---|
| `proper` | `Odile` | somebody, with a name |
| `definite` | `the collier` | somebody, without one |
| `indefinite` | `a sentry` | a role, one of many |

> ⭐⭐⭐ **The two identity rungs are *defined* by a grammatical
> dimension.** `Cast`'s own documentation leads with *"**The** collier"*
> and `Extra`'s with *"**A** sentry"* — so the difference between *a
> somebody* and *a role somebody fills* is carried by an English article,
> and `lint:identity` rule 2 enforces the agreement.

⚠ **And the field lives on `VisibleMixin`, not on the rungs** — because
**480 of the 611 hand-articled rows are things and locations, which have
no identity rung at all.** So the same dimension carries **ontology** for
agents and **pure presentation** for everything else, and the rungs
enforce agreement rather than owning the field. That is a genuinely
subtle answer to *which dimension carries which data*, reached without
the vocabulary.

⭐ It was also **discovered rather than designed**: the content had
encoded it by hand **611 times** before anybody named it a field.

### ⭐⭐ The form table is already a dimension→surface map

Six **forms**, each with its venue stated:

| form | what it adds | the surface it serves |
|---|---|---|
| `bare` | the name alone | chat, anonymity off |
| `handle` | article + short handle | chat, anonymity on |
| `concise` | the ordinary identity | act lines, emotes — most prose |
| `presence` | + what they are doing | the room survey |
| `distinguishing` | + what they are wearing | targeting, disambiguation |
| `formal` | full name, honorific, suffix | profiles, documents |

That right-hand column **is** Schell's *"which channels are most
appropriate for which data?"*, answered for naming and never filed as an
interface decision.

⭐ And `bare`/`handle` **consult no perception gate** — *"disguise is
perceptual, anonymity declarative."* The dimension and the gate are
deliberately decoupled, which is the kind of thing this lens exists to
make visible.

### ⭐⭐⭐ Quantities — the number is the truth, the word is a rendering

[quantities.md](../subsystems/quantities.md) is the strongest answer in
the tree, and it is a dimension system with a doctrine:

> *"**Scales are RENDERING choices, not type distinctions.** `Quantity<'K'>`
> carries no semantic — the same instance can render with EITHER scale at
> the call site."*
>
> ```ts
> q.tag('color');   // → 'warm'
> q.tag('thermal'); // → 'boiling'
> ```
>
> *"The pedagogical principle: science students playing the game know **'a
> unit is a unit is a unit.'** … **the engine refuses to fork the type
> system on what is, fundamentally, vocabulary preference.**"*

⭐⭐⭐ **That is this lens's central rule, already written:** the canonical
value is held once, the vocabulary is chosen at the point of rendering,
and **a rendering may never fork the model.** Tag tables are
content-authorable YAML (`mud/config/quantity-tags.yaml`), double-keyed
by `(unit, scaleName)` — so a new vocabulary is a row.

⚠ **Correction to an earlier claim of mine.** I had said `bands-not-theta`
was *the only place* the letters doctrine and the numbers doctrine touch.
That is wrong: **`Quantity.tag()` plus scales plus `<quantity>` markup is
the general bridge**, and bands-not-theta is one application of it. The
two doctrines meet systematically.

### ⭐ Typography is a dimension, and it has a name collision

[message-rendering.md](../subsystems/message-rendering.md) renders
**font-by-register** — *"world/social prose in a proportional literary
serif, the command/code register in monospace"* — over
`Theme.registers: Record<string, FontRole>`.

⚠ **So "register" means two different dimensions**: the grammatical one
(`proper`/`definite`/`indefinite`) and the typographic one
(`narrative`/`chrome`/mono). Both are real, neither is wrong, and a
reader meeting them a day apart will conflate them.

## ⭐⭐⭐ What the lens adds that the docs do not have

**The unit is a promise about the fidelity of the experience.**

`design-philosophy.md` Principle 2 says *"what we do model uses real units
and real math… **no fudge anywhere. Lying about the physics anywhere
weakens the pedagogical claim everywhere**"* — which is a *modelling*
rule. Read as a dimension decision it is sharper and it cuts the other
way too:

> ⭐⭐⭐ **A real unit is a falsifiable precision claim. A point is not.**
> Nobody expects hitpoints to feel like injury. **Everybody expects
> losing a pint of blood to feel like blood loss.** Choosing litres
> writes a cheque the simulation must honour; choosing points asks for no
> belief and promises none.

⚠⚠ **Which yields a warning the tree does not carry: a real unit on a
shallow model is *worse* than a point**, because a player can catch it.
*"50 points"* cannot be wrong. *"0.4 litres"* can. `blood.md` pays its
cheque — ABO typing, the drawn unit's freshness, transfusion reactions,
the marrow reserve — and that is the bar the unit sets.

⭐⭐ **And it completes the numbers doctrine.** `measurement.md`'s
no-gauge rule says *do not number the undecidable*. This says *if you do
use a real unit, the unit obligates you.* Two halves of one subject, held
in two different docs, and neither names the other.

⭐ **Corollary 3 was the answer all along.** `design-philosophy.md`:
*"**Layered presentation.** Players see prose; students see physics;
instruments and `analyze` verbs reveal canonical units. Same engine,
different rendering paths."* Three dimensions on one channel, selected by
reader and instrument — **Schell's question, answered, and filed under
modelling.**

## The verdict

⭐⭐⭐ **Adopt, and adopt the vocabulary itself.** *Channel* and
*dimension* are the missing words for a thing this design does
constantly and well, in four separate subsystem docs that do not know
they are discussing one subject. The lens's value here is not a new
answer; it is a **name for the question** that `presentation`,
`message-rendering`, `quantities` and `design-philosophy` are each
answering a piece of.

## Tensions & risks

⚠⚠ **His warning is our standing condition, not an edge case.** *"Too
many dimensions on one channel… difficult for some players to understand
or remember."* A graphical game spreads cognitive load across channels;
**we cannot, so we overload dimensions** — the article means one thing,
the font another, the surface a third, a tag a fourth. Every dimension we
add is load on the same reader.
[interaction-philosophy.md](../interaction-philosophy.md) already owns the
honest version of this (*"text is slow for at-a-glance and spatial
information"*) and names the escape valve: **the decorational layer
exists for parallel information.**

⚠⚠ **The richest dimension we have is declared and unrendered.**
`<quantity unit value tag>` markup ships on the server, and
[quantities.md](../subsystems/quantities.md) says *"v1 ships only the
server side; the client renderer is the v1 punch-list item."* So the one
mechanism that would let a player choose whether to read a number or a
word — **per player, per reading** — exists on the wire and arrives as
text. That is the single highest-leverage unbuilt thing this lens finds.

⚠ **Nothing enforces the precision claim.** `Quantity<U>` makes a real
unit *cheap to express*, which is correct, and therefore makes an
unearned one cheap too. The rule above is prose; there is no review
question asking *does the model behind this unit deserve it.*

⚠ **Two meanings of "register"**, above. Cheap to fix in docs, impossible
to fix in code without churn.

## Implications

1. ⭐⭐⭐ **Write the precision-claim rule down where units are minted** —
   `quantities.md`, beside the `Unit` catalog. *A real unit is a
   falsifiable claim; do not denominate in litres what you modelled in
   vibes.* It is the complement `measurement.md`'s no-gauge rule has been
   missing.
2. ⭐⭐⭐ **Ship the `<quantity>` client renderer.** It is the only
   dimension in the design that lets the *reader* choose the rendering,
   and prose-vs-number is exactly the axis this game should hand over.
   Currently punch-listed.
3. ⭐⭐ **Say that `presentation` · `message-rendering` · `quantities` ·
   `design-philosophy` § corollary 3 are one subject**, and that the
   subject is *channels and dimensions*. Four docs, one question, no
   cross-reference.
4. ⭐⭐ **Add the dimension question to the pass.** For a feature that
   surfaces anything: *what travels, to which surface, on which
   dimension — and what else is already using that dimension?* The last
   clause is the overload check and nothing asks it.
5. ⭐ **Rename one of the two "registers" in the docs.** The grammatical
   one has the stronger claim to the word.
6. **Pair with [#65 Primality](./65-primality.md)** — adjacent in the
   book and complementary: `65` says why this medium is hard, `66` says
   what can be done inside it.

[^aogd-cd]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #66, the Lens of Channels and
    Dimensions** (≈ p. 287), from the interface chapter, between
    **#65 Primality** and **#67 Modes**. The six questions, the *"heart
    of designing your game interface"* line and the
    too-many-dimensions warning are Schell's; all analysis ours. Read
    from the author's Google Play edition, 2026-09.
