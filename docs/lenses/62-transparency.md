# #62 · The Lens of Transparency

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-tr]

## The lens

To check that the interface has got out of the way: **what do players
want, and does the interface let them do it? Is it simple enough that
with practice they use it without thinking? Do new players find it
intuitive — and would letting them customise the controls help or hurt?
Does it work in all situations, or are there cases where it confuses?
Can players keep using it well under stress, or do they start fumbling?
Does anything confuse them, and where? And do they feel immersed?**

> **From the book.** The epigraph is Tufte and it is the part that
> argues with us:
>
> *"No matter how beautiful your interface is, **it would be better if
> there were less of it**."* — Edward Tufte
>
> *"**The ideal interface becomes invisible to the player**, letting the
> player's imagination be completely immersed in the game world."*
>
> ⭐⭐⭐ And the passage that sets it up is the one that matters most here,
> because it is a *linguistic* test:
>
> *"A player generally won't say, 'I controlled my avatar, so she ran to
> the castle, and then I pressed the red button to make her throw a
> grappling hook.' No, a player describes the gameplay this way: **'I ran
> up the hill, threw my grappling hook, and started climbing the castle
> wall.'** Players project themselves into games and on some level
> disregard that the interface is there at all, unless it suddenly
> becomes confusing."*

## Which of our seven it sharpens

**[Lens 2 · Creative expression](../design-lenses.md)** — with
**[3a · Immersion](../design-lenses.md)** on the last question and
**lens 1** on the second, because *"with practice, without thinking"* is
a learning curve and not a property of a layout.

## At what altitude

| answer | altitude |
|---|---|
| no chrome appears that a command did not ask for | **invariant** — enforced in the protocol |
| the verb is diegetic; the syntax is not | **invariant**, and it is the measurable boundary |
| chrome should vanish; **vocabulary should become fluent** | **invariant** — two disciplines, two tests |
| the player may rename the controls | ⭐⭐ **the grain** |
| input is moved **out of** the pressure window rather than made faster | ⭐⭐ **the grain** — this substrate's answer to stress |

## ⭐⭐⭐ Why our design prompts it — his gold standard is our input format

Schell's transparency test is that the player narrates **the action**
rather than **the control**: *"I ran up the hill"*, not *"I pressed the
red button."* He treats reaching that as an achievement, earned by
making the interface second nature.

> ⭐⭐⭐ **In a text game the player's sentence and the game's sentence are
> the same sentence.** You type `climb wall`; the world answers *"You
> climb the wall."* There is no translation layer between what you
> pressed and what happened, because **the command *is* the description.**
> A command line is the only interface where the control vocabulary and
> the narration vocabulary are the same language.

So we do not have to *earn* projection by making the interface vanish.
The input is already in the first person and already in the world's own
words. ⭐ That is the strongest thing this lens gives us and it is a
property of the medium rather than a thing we built.

⚠⚠ **With a boundary, and it is measurable.** That is true of **verbs**
and false of **syntax**. `--flags`, `me:wash hands`, MQL seeds and chain
operators, `--into` — none of that is anything a character would say.

> ⭐⭐ **The verb is diegetic. The syntax is not.** Every piece of syntax
> is a place the interface becomes visible again, which makes this lens's
> real contribution a **budget**: each operator added is transparency
> spent. It is the test the slated `source::verb` work
> ([#31](./31-action.md)'s collision ladder) should be held to — it buys
> disambiguation and it costs exactly this.

## ⭐⭐⭐ Tufte, and the distinction his sentence hides

*"It would be better if there were less of it"* would, taken literally,
have us delete the product. We ship 200-plus verbs, MQL, unix-style
options, a cockpit, a card feed and a shelf. By surface area we are
maximal.

> ⭐⭐⭐ **Chrome should vanish. Vocabulary should become fluent.** Tufte's
> sentence conflates **surface area** with **expressive range**. Less
> chrome is always better. Less vocabulary is less expression — which is
> [#31](./31-action.md)'s basic:strategic ratio and
> [#30](./30-emergence.md)'s objects-per-verb. **Two disciplines, two
> success tests, and #62 only knows about the first.**

And fluency is the honest model for the second. Nobody claims `git` has a
transparent interface; an expert simply stops thinking about it. ⭐ So
*"simple enough to use without thinking"* becomes **consistent enough to
become fluent** — which is why
[command-spec.md](../subsystems/command-spec.md)'s collision doctrine is
a transparency rule and not just a tidiness one: *a verb collision is
evidence one of the two is on the wrong side of the line*, and
inconsistency is precisely what blocks fluency.

## ⭐⭐⭐ And the chrome half is enforced in the protocol

This is the part of the design that answers Tufte properly, and it is
stronger than a layout convention.
[card-surface.md](../subsystems/card-surface.md) § *One birth path*:

> *"**A card exists because a COMMAND caused the server to push it.** The
> client no longer infers a card from a changed query result, and **it
> cannot ask for one either**."*
>
> Enforced three ways, strongest first: **the protocol** —
> `MqlSubscribeMessage` *"carries no field that could name a card… **a
> source scan can be defeated by a clever call site; a missing protocol
> field cannot be used at all**"*; **the gate** — a view declares
> `opens_card:` and `CardApi.open` throws otherwise, validated at load;
> and a **test asserting every mint site by name.**

> ⭐⭐⭐ **No interface appears that you did not ask for, and the strongest
> guarantee of it is the absence of a wire field.** Schell's chrome is a
> layout decision; ours is a protocol one. That is Tufte made
> unviolatable rather than aspirational — and `cockpit` being **one verb**
> for the entire layout system is the same instinct at the command layer.

## Q3 · Customisation — we answered *help*, three times over

*"Would allowing players to customise the controls help or hurt?"* is
asked as an open question. We shipped it as doctrine:
**per-character verb aliases** (`AliasMixin` — verb-position
substitution with positional interpolation, so a player may genuinely
rename the controls), **settings and vars**
([shell-environment.md](../subsystems/shell-environment.md)), and
**cockpit arrangements**.

⚠⚠ **And the cost he does not anticipate is social.** If my `k` means
something different from yours, **we cannot talk about the game.** A
customised interface is unteachable by another player, and in a game
whose onboarding is substantially other people, that is a real price.
⭐ The mitigation already exists and is not framed this way:
**clickables preview their command**, and a preview shows the *canonical*
verb — so the shared vocabulary stays visible underneath whatever
somebody aliased.

## ⚠⚠ Q5 · Stress — this is the real exposure, and I checked

Typing under time pressure is fumbling by construction: a gamepad player
mis-presses, a typist mis-**spells**. I expected to find that combat had
removed the clock. It has not —
[combat.md](../subsystems/combat.md)'s **tempo is emergent**: *"each
combatant accrues tempo at a derived rate and acts when the accumulator
crosses a whole exchange… a faster fighter simply acts more often."* **The
fight proceeds whether or not you have finished typing.**

So the question lands. The answer the design actually gives is good, and
it is not *make the interface faster*:

> ⭐⭐⭐ **Move the input out of the pressure window.** A **gambit** is a
> standing instruction; **terms** are agreed in advance; a
> [formation](../subsystems/combat-formations.md) is a *policy over the
> threat graph*, picked from presets. All three are *decide now, execute
> later* — which is how a typed interface survives a live clock. **The
> interface is not made faster; the decision is moved earlier.**

⚠ **The residual exposure is the unanticipated moment.** A gambit covers
what you planned for. When something surprising happens mid-fight you are
typing against a tempo accumulator, and that is where this medium is
weakest. It is also the one place where
[#65](./65-primality.md)'s primality argument has real force against us:
under stress, *recognising* beats *composing*, and we have chosen
composing everywhere.

## Q6 · Where is the confusion — and we can ask instead of guessing

Schell asks *"on which of the six interface arrows"* the confusion is
happening, which presumes a designer inferring it. We have two surfaces
that answer it directly: the **`affordances` verb** (*where did this verb
come from, and what does this object offer*) and **`errors`** /
[diagnostics](../subsystems/diagnostics.md).

⭐ **A player can interrogate the interface about itself.** That is not
transparency in Schell's sense — it is the opposite, an interface that
can be *looked at* — and it is the better property for a game whose
subject is how things work.

## The verdict

⭐⭐⭐ **An alternative, and the word means the opposite of what he means
by it.**

Schell's transparency is **opacity you stop noticing** — the interface is
still there, you have simply been trained past it. Ours is **the absence
of opacity**, and it is not a style preference:

> ⭐⭐⭐ **This game is inspectable all the way down, and the Compact is
> why.** A constitution over people who cannot see what they govern is
> theatre. **You cannot amend Tier C if you cannot read Tier C** — so
> inspectability is a *precondition of self-government*, which is **B3
> (*any measurement the platform makes of you is one you can read*)
> generalised from measurements to the whole machine.**

The stack, and every layer of it is shipped or doctrinal:

| layer | how it is inspectable |
|---|---|
| **the interface** | `affordances` · `errors` · harvested `help` — ask the game where the confusion is |
| **the model** | the card's mixin chips; the source calls it *a teaching surface* ([#28](./28-the-state-machine.md)) |
| **the measurements** | **B3** — any measurement of you is one you can read |
| **the content** | anyone authors; *"an author tier is a category error"*; **authoring is free and only publish is gated** |
| **the code** | **B7**, AGPL — and the fork right is Tier B's own check on itself |
| **the spoilers** | ⭐⭐ **capability DELETES, appetite TAGS** ([wiki.md](../subsystems/wiki.md)) — *"does this reader **want** to be spoiled?"* is **a preference, and one click** |
| **the roles** | wizard **by approval**, not by employment |

⭐⭐ **And the two-axis reveal model is the whole doctrine in miniature.**
Capability is *deleted server-side, never serialised, never on the wire*;
appetite is *kept and tagged* for the client to collapse. **The mechanisms
differ because the failures differ** — a capability leak is a security
failure, and an appetite "leak" is you deciding to look. That is the same
rule as [#28](./28-the-state-machine.md)'s affordance filtering (*filtering
means deletion*), applied to prose.

### ⚠⚠ With one deliberate exception, which is what makes it a design

**The fiction keeps its secrets.** `measurement.md`'s **A15** — *kernel
omniscience never becomes diegetic evidence*, because *"a crime genuinely
unseen is genuinely unproven, and that is a feature"* — and
[concealment.md](../subsystems/concealment.md)'s honest fog, and
[#29 Secrets](./README.md)' private-to-one-player category.

> ⭐⭐⭐ **The schema is public; the token is private.** The *machine* is
> shared between the people who build it and the people who live in it.
> The *world* still has fog. Confusing the two would either break the
> game's secrets or make the constitution unexercisable, and the design
> refuses both.

### ⭐ And the honest version of "nobody else does this"

The parts all exist separately, and saying so is what keeps the claim
checkable:

- **MUDs shared the world** — and [#37](./37-fairness.md) records that
  this is exactly what got them criticised, wizards being able to cheat.
  **Our answer was constitutional rather than technical**, which is the
  difference, not the sharing.
- **NetHack shared its source** and made spoilers a culture — the
  accretion thesis in
  [lens-deck-salvage.md](../lens-deck-salvage.md).
- **DAOs have governance** with no world worth governing
  ([positioning.md](../positioning.md)).
- **Roblox and Minecraft** give creators economics and *"never
  authority."*

> ⭐⭐ **Nobody has the combination**, and the combination is the claim —
> which is [#30](./30-emergence.md)'s synthesis argument arriving in a
> second domain. *Developers and players inhabit the same environment and
> abide by the same constraints* is true here and it is true **because the
> Compact needs it to be**, not because open source is a virtue.

⭐⭐⭐ **And the one-birth-path rule is the deck's best example of a lens
answered in a protocol rather than a layout.** Worth citing whenever
somebody proposes a surface that appears on its own.

## Tensions & risks

⚠⚠ **Syntax is an unbudgeted cost.** The verb/syntax boundary above is a
real test and nothing applies it. Each operator, flag and sigil is
transparency spent, and the collision ladder's cheapest rungs are the
ones that spend it.

⚠⚠ **Fluency has no measurement.** *"With practice, without thinking"* is
a claim about a curve, and nothing observes whether the curve happens —
the same hole [#27](./27-time.md) and [#30](./30-emergence.md) found, and
the **fifth** ask for the agent-swarm pattern.

⚠ **Aliases trade teachability for comfort**, and nobody has priced it.

⚠ **An interface that can be interrogated is an interface that must be
read.** `affordances` and `errors` are strictly better than guessing and
strictly more text, which is [#66](./66-channels-and-dimensions.md)'s
overload warning arriving from a different door.

## Implications

1. ⭐⭐⭐ **Adopt the verb/syntax budget as a review question.** *Is this
   diegetic — would a character say it?* If not, it is transparency
   spent, and the proposal should say what it buys. The slated
   `source::verb` work is the first thing to hold to it.
2. ⭐⭐⭐ **Write down "chrome vanishes, vocabulary becomes fluent."** It
   is the answer to *"isn't a command line a terrible interface"* and to
   Tufte at the same time, and it exists nowhere.
3. ⭐⭐ **Cite the one-birth-path rule as doctrine, not as card
   machinery.** *No interface appears that you did not ask for* is a
   general principle that happens to be implemented in the card
   protocol.
4. ⭐⭐ **Name "move the input out of the pressure window"** as the
   substrate's answer to real-time stress — gambits, terms and formations
   are three instances of one idea and are documented as three features.
5. ⭐ **Price the alias trade.** A per-character rename is good; an
   unteachable interface is not. Clickables showing the canonical verb is
   the existing mitigation and should be stated as one.
6. ⭐⭐⭐ **Write the inspectability stack down as one claim.** Interface
   · model · measurements · content · code · spoilers · roles are seven
   layers of one property, documented in seven places, and the reason they
   are all true is **the Compact needs them to be.** *A constitution over
   people who cannot see what they govern is theatre* belongs in
   [positioning.md](../positioning.md) next to the substrate claim — it
   is a better answer to *“why is the engine open source”* than the licence
   is.
7. ⭐ **Keep the “nobody else does this” claim in its checkable form.**
   MUDs shared the world; NetHack shared the source; DAOs have
   governance. **The combination is the claim**, and guardrail 3 in
   `positioning.md` requires it be stated that way.
8. **Pair with [#66](./66-channels-and-dimensions.md)** — `66` is what
   the interface carries, `62` is how much of it the player should have
   to notice.

[^aogd-tr]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #62, the Lens of Transparency**
    (≈ pp. 274–275), from the interface chapter. The Tufte epigraph, the
    *"ideal interface becomes invisible"* claim, the grappling-hook
    projection passage and the seven questions are Schell's; all
    analysis ours. Read from the author's Google Play edition, 2026-09.
