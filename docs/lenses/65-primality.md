# #65 · The Lens of Primality

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-pr]

## The lens

To find the parts of a game that need no learning at all: **which parts
of my interface and my gameplay are primal — and which require higher
brain function?** His test is wonderfully blunt: **is it something an
animal could do?**

> **From the book.** The argument is evolutionary, and it is the reason
> he thinks touch screens changed gaming:
>
> *"Until the advent of touch computing, every computer interface took
> the form of **tool use**… But tool use is not primal, by which I mean,
> prehuman. Humans started using tools about three million years ago…
> **But still animals have been touching things, intuitively, for much
> longer: probably something like 300 or 400 million years.**"*
>
> *"…the lowest-level 'reptilian' section of the brain is able to process
> touch, but tool use probably requires help from the neocortex, the
> highest level of the brain."*
>
> *"It seems certain that **the more you can engage and involve the
> primal parts of the brain, the more intuitive and powerful your
> gameplay will feel**… To make an educated guess about whether your
> interface and game activity has low-level primality, just think about
> whether **it is something that animals can do**."*

## Which of our seven it sharpens

**[Lens 1 · Pedagogy](../design-lenses.md)** — head-on, and in
opposition. It is the only lens in the deck that argues *against* what
lens 1 is for.

## At what altitude

| answer | altitude |
|---|---|
| the simulation is **foundational**; the interface is **decorational** | **invariant** — server-authoritative everything (A8) |
| text is the first client, not the only possible one | **invariant** |
| a primal client is a **port**, and the model is what ports | **the grain** |
| that *this* game's client is a terminal | ⭐ **this title's** — and it is the most swappable decision in the design |

## ⭐⭐⭐ Why our design prompts it — by his test we score zero

Reading and writing is the **least primal interface humans have**.
Literacy is roughly five thousand years old, has never been universal,
requires the neocortex entirely, and has to be *taught for years*. By
*"is it something animals can do"*, a text game scores nothing at all —
and a blinking cursor is arguably the least primal object in computing.

[interaction-philosophy.md](../interaction-philosophy.md) already owns
the honest version: *"**Literacy itself excludes.** The 'anyone literate'
floor is still a floor: pre-literate players, some dyslexic players, and
non-native speakers are served worse by a wall of text than by a
picture."*

So the lens lands. The question is what follows from it.

## ⭐⭐⭐ Push back — primality is the enemy of what we sell

Schell wants the neocortex **out** of the loop, so that play feels
effortless and the interface disappears. That is correct for the games
he is describing and it is the opposite of this product's purpose.

> ⭐⭐⭐ **Lens 1 is pedagogy. Our whole claim is *knowing how the universe
> works and navigating it with good decision-making*. A primal interface
> would bypass precisely the faculty we exist to exercise.**

An interface that engages the reptilian brain is an interface that
teaches nothing, because nothing was learned — it was recognised. ⚠ That
is not a general argument against primality; it is an argument that
**primality is the wrong target for the thing being learned**, and
nothing more.

## ⭐⭐⭐ An alternative — primality is decorational, a boundary we already drew

The better answer is in Schell's own vocabulary, already quoted in
[interaction-philosophy.md](../interaction-philosophy.md):

> *"Foundational technologies are the ones that make a new kind of
> experience possible."* — and our doc's own gloss: **"Text is
> foundational here; everything layered over it … is decorational."**

> ⭐⭐⭐ **So: the simulation is foundational and primality is
> decorational.** We did not choose a non-primal game. We shipped the
> **least primal client first**, because it is the cheapest to build,
> reaches any device, has a ceiling set by imagination rather than an art
> budget — and happens to be the exact channel a language model already
> speaks. **A primal client is a renderer, and server authority (A8) is
> what makes it possible.**

And that is already the public claim.
[positioning.md](../positioning.md): *"the server is authoritative; the
client renders MML. **A different client is a different renderer, nothing
more**"* — with **Minecraft and Roblox named by name** in the ✅ Say
list: *"The same Compact would hold behind a 3D client, or inside
Minecraft or Roblox."*

⚠⚠ **With the caveat that keeps the claim checkable, and it is the real
work.** The same doc: *"what does not travel cleanly is the **interaction**
model. Verbs, the command bus, MQL, the shell — a 3D or voxel client
needs **its own affordance layer**, and porting that is real work."*

> **The model ports. The interaction does not.** A voxel client is not a
> skin; it is a second interaction design. That is the honest version of
> *"and from there it's one step to VR"* — the step is a step for the
> renderer and a project for the affordances.

## ⭐⭐⭐ And it is the product argument for a refactor already proposed

[avatar-family-slate](../slates/builds/avatar-family-slate.md) argues for
splitting `HasInteractiveMixin` into the connection set plus a
`SaxonbergClient` mixin, on two grounds: that the mixin is three concerns,
and that it would make `positioning.md`'s claim true in code rather than
only of the protocol. This lens supplies the third and it is the one that
says what the split is *for*:

> ⭐⭐ **Cockpit modes, arrangements, layouts and portrait live inside the
> mixin that models *having a driver*. So a Minecraft renderer would
> inherit our arrangement model.** Split them and the primal client
> becomes buildable by somebody who is not us. **The split is the
> precondition for ever having a primal client at all.**

⭐ Three independent arguments reaching one boundary is this tree's own
test for a boundary being real.

## ⭐⭐ The on-ramp we already ship and never named

A click is touch. Touch is primal. And the client's standing rule is that
**clickables preview their command**:

> ⭐⭐⭐ **A clickable is a primal on-ramp to a deliberately non-primal
> interface — and it *teaches the text* by showing what it would have
> typed.** That reframes it from a UI convenience into the design's answer
> to this lens, and it pairs exactly with
> [#31](./31-action.md)'s *his parser's vocabulary was hidden; ours is
> data.*

## Tensions & risks

⚠⚠ **The first thirty seconds is where this actually bites.** Primality
is what makes an opening work without instruction, and we have none of
it. [#17 The Toy](./17-the-toy.md) owns the enterability question; **this
lens names the mechanism it is missing.** A new player meets a prompt,
and the prompt is the single least primal object available.

⚠ **The mitigations are listed as obligations and are unbuilt.**
`interaction-philosophy.md` names text-to-speech, AI narration and AI
translation and says they are *"worth treating as obligations, not
afterthoughts."* Narration in particular is a **primality** feature —
hearing is far older than reading — and nothing tracks it.

⚠ **A primal client would change what the game teaches, not just how it
looks.** If the affordance layer is a 3D one, *typing a command* stops
being the act, and `31`'s whole argument — the palette is more expressive
because it **composes** — is about typed composition. A voxel client that
kept the Compact and lost the command line would be a different product
wearing the same constitution. **Worth knowing before anybody ports it.**

## Implications

1. ⭐⭐⭐ **State the foundational/decorational split as the answer to
   "why text".** It is already in `interaction-philosophy.md` as a Schell
   quotation and not as our position. *The simulation is foundational;
   primality is decorational* is the sentence, and it is more durable than
   the reasons currently given.
2. ⭐⭐ **Record the `SaxonbergClient` split's product rationale** in the
   [avatar-family slate](../slates/builds/avatar-family-slate.md) — it is
   the precondition for a primal client, which is a stronger reason than
   the two already there.
3. ⭐⭐ **Name clickables-preview-their-command as the primal on-ramp.**
   It is shipped, it is the right answer, and it reads as a convenience.
4. ⭐ **Treat AI narration as a primality feature and track it.** Hearing
   predates reading by a very long way; it is the cheapest primality we
   could add without touching the interaction model at all.
5. ⚠ **Do not reach for primality inside the game's teaching loop.** Where
   a decision is the thing being learned, making it effortless defeats it.
   The place for primality is the **on-ramp and the rendering**, never the
   judgment.
6. **Pair with [#66](./66-channels-and-dimensions.md)** — `65` says why
   this medium is hard, `66` says what can be done inside it.

[^aogd-pr]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #65, the Lens of Primality**
    (≈ pp. 281–282), from the interface chapter, immediately before
    **#66 Channels and Dimensions**. The tool-use/touch chronology, the
    three-layer-brain argument and the *"something that animals can do"*
    test are Schell's; all analysis ours. ⚠ Read with the author's
    specialism in mind — he works in VR, and the chapter is about
    physical interfaces. Read from the author's Google Play edition,
    2026-09.
