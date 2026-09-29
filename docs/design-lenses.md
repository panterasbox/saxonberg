# The seven design lenses

**The rubric every high-level design is interrogated with.** Seven
questions, asked in order, of any feature, slate, subsystem, or fork.
They are the project's own — not borrowed, not a checklist someone
should have to be handed at the start of each session.

> ⚠ **Not to be confused with [docs/lenses/](./lenses/README.md)** —
> that directory is Jesse Schell's lens deck (fantasy, curiosity,
> cheatability…), a borrowed *analysis toolkit* used mostly for the
> education-video track. This doc is the *decision rubric*. Where a
> Schell lens sharpens one of the seven, it is named as an instrument
> below.

---

## How the seven are used

**A scorecard, not a gate.** Score a design against all seven; lenses 1
and 2 pick the winner.

> ⭐⭐ **The standing rule, stated as permanent:** *"What solution is
> the richest pedagogically and teaches real science? Secondarily, what
> affords the most expressiveness and creative control by our content
> authors?"*

Lenses 3, 4, 6 and 7 are axes a design **must not badly fail**, but
they do not decide forks. ⭐ **Lens 5 is different and used to be
mis-filed as the lesser one:** continuity is lens 2's *time axis*, so
when a capability cannot cross an epoch what actually breaks is lens 2's
promise — it needs no veto of its own because **it inherits lens 2's**.
Lens 6 is the one that was being run informally in
[vocations.md](./vocations.md) all along — the demand test — and never
asked of a feature that was not a vocation. Lens 7 was carved out of
lens 6 on 2026-09-28: the two had been one heading since 2026-09-18, and
the lending gate that occasioned the governance limb had **passed every
economic question**, because it was not an economics defect.

**When the pass is run:** at the **slate** (before a design is
considered ready) and at **requirements** (over the agreed scope).
Between those, during a build, the lenses are not a ceremony — they are
the thing that **decides forks without asking**. Only stop at a fork
where two options are equally strong on 1 and 2, or where the question
is really about sequencing and scope. That is still a human call.

⚠ The tell that the rule should have been applied instead of a question
asked: *the option that models the real mechanism is always the one that
keeps working when content authors extend it.* When both limbs point the
same way, there was never a fork.

---

## 1 · Pedagogy — what does it teach about the world?

*How academically rich is it, and what does it teach about the world?*

**Skill is the unit, and [Discipline](./subsystems/advancement.md) is
how skill is modelled.** Most pedagogy implies a skill; a skill that no
Discipline names is a fact sheet, not a curriculum. So the first
question of any design is not *"is this educational?"* but *"which
Disciplines does doing this exercise, and what does getting better at
them actually mean?"*

⭐⭐ **Ask which Discipline is *dominant*, not just which are exercised.**
The two come apart, and fake pedagogy lives in the gap: a craft can
honestly exercise three Disciplines while the skill that actually
decides the outcome is menu-memorisation. This is the failure mode's
sharpest form, and it is **self-deception, not a defect you would
spot** — a designer believes the game is about judgment long after it
has become about recall.

The second half is fidelity. The world has to be **derivable** — a
player who has internalized the principles should be able to predict
what happens, and be right, without looking anything up. That is the
[Andy Weir](./design-philosophy.md) property, and it is why *model
honestly* is the governing principle of the engine: no fudge anywhere,
because lying about the physics anywhere weakens the pedagogical claim
everywhere.

⭐⭐ **Derivability, stated as an engineering move.** Complexity comes in
two kinds — the kind written into the rules ("unless", "except", "but")
and the kind that *arises* from simple rules interacting. So:

> **What is written into the rules is what you have to look up. What
> arises from them is what you can derive.**

The design question is therefore always *can this be moved from the
first kind to the second*. ⚠ And the tempting move has a name worth
keeping, because nobody ever writes *"I am fudging"* — they write *"I
added a clamp so the numbers come out right."* **Adding rules until the
behaviour comes out right is artificial balance**; letting the effect
fall out of the interactions is natural balance, and only the second one
teaches anything.

⭐⭐⭐ **Why derivability produces transfer** — the warrant this lens has
always assumed and never argued. A mind meeting a simulation builds a
*miniature reality* out of it and reasons inside that; when the
miniature is faithful, conclusions drawn in it are valid outside it.
That transfer is a **native faculty, not something the design supplies**
— which flips the design question entirely:

> The question is not *how do we teach*. It is **do not corrupt the
> miniature, because the player's inference engine will run on it
> either way.**

A die roll standing in for a mechanism does not merely fail to teach. It
teaches something false, efficiently. ⭐ This is also the strongest
argument available for the no-fudge rule, and **lens 4 depends on it**
(see 4's divergence test).

> **The test.** Which Disciplines does this exercise, **which one is
> dominant**, and can a player derive its outcomes from principles
> rather than look them up?

**Failing looks like:** a lookup table dressed as chemistry; a die roll
standing in for a mechanism; a number that goes up with no referent; a
clamp added so the numbers come out right; ⭐ **a design whose named
Discipline is not the skill that actually decides the outcome.**
The sharpest instrument here is [uncertainty.md](./uncertainty.md) —
*roll to decide what the world IS, never to decide what your action
DID*, and its corollary that **luck is not a stat**. A resolution roll
is pedagogy's exact opposite: it makes the world un-derivable on
purpose.

⭐ **Worked example — the smelt.** The metal chain could have shipped
`smelt` as a recipe (fixed input → fixed output). Pedagogy killed it:

> *"If the smelt flattens grade, then prospecting — the one genuinely
> new primitive the mining slate commits to, the reason the trade is
> interesting — is theatre: a deduction game whose answer doesn't
> matter."*

The yield derives from the lump's actual composition, so grade stays
load-bearing for eight steps — **lean ore honestly makes a worse
sword**. Nothing about the recipe version was cheaper to *play*; it was
just cheaper to *build*, which is not a tiebreaker.

⭐ **Read it again through dominance.** The recipe version would have
*claimed* metallurgy and *exercised* recall — the two Disciplines come
apart exactly as the test predicts, and the slate caught it by noticing
that the deduction game's answer would not matter. That is what the
dominance question is for.

---

## 2 · Creative expression — what can an author make with it?

Two tiers, and a design has to serve **both**:

1. **The ordinary case, with no code.** An author assembles the basic
   thing out of pre-canned interactions the platform already affords —
   mixins that interoperate, recipes, templates, data files. If making
   the common case requires writing a class, the substrate has failed
   this lens.
2. **The bespoke case, without breaking.** On top of that, an author
   writes something genuinely custom — and the systems still hold up.
   The best outcome is stronger than "hold up": the systems **suggest
   the bespoke idea in the first place**.

> **The test.** Can an author build the ordinary case out of
> interoperating mixins with no code — and does the system still hold,
> or better, inspire, when they write something bespoke on top?

The framing that matters: **give the author the most colors to paint
with.** Variety comes from combination and permutation, not from
enumeration. A system whose content is a list is a system that only
grows by someone adding to the list.

⭐ **Worked example — recipes.** From the metal-chain slate: *"recipes
are the single most **expressive** thing for content authors — the whole
known-of → can-make ladder rides them, and a recipe is a data file."*
Same lens, structural version: a **venue archetype states the needs and
a locality binds them**, so a second bar, distillery or mine needs
**zero new pack code** — `trade-hospitality` ships a venue pack with no
`src/` at all. That is the operational test for whether mechanism and
expression got separated correctly.

**Failing looks like:** content that is enumerated instead of composed;
a mixin that only works on the one host it was written for; a feature
whose second instance requires a kernel edit.

---

## 3 · Immersion & roleplay — what experience does it create?

*How do players use it in ways that go beyond the mechanics?*

**Immersion leads; roleplay follows from it.** The two need each other,
but they are not equal partners here, and the ordering is the whole
insight:

> ⭐⭐ **Nothing about GTA is optimized for roleplay.** The RP scene
> emerged out of the simulation they built. Roleplay is not a feature
> you design; it is what people do inside a world that is coherent
> enough to be lived in.

So the question is never *"does this support roleplay?"* — it is *"is
the simulation honest and dense enough that the behavior is possible
without anyone scripting it?"* Between the simulation and the
governance model, the RP space is a **consequence**. Designing *for* RP
directly usually produces the opposite: a stage instead of a place.

> **The test.** Does the simulation make the behavior possible without
> anyone scripting it — and does the result read as a world rather than
> as an interface?

**Failing looks like:** the fiction asserted in prose that the model
doesn't back; a mechanic that is correct but reads as a spreadsheet.
The sharpest instrument is [measurement.md](./measurement.md)'s
no-gauge rule — *no fidelity meter, no sin counter, no progress bar, no
streak, no leaderboard* — because a gauge is the fastest way to convert
a lived world back into an interface. The companion tell:
**unlit interiors are pitch black**, and the giveaway that a design
forgot this is that every object reads "something" while the room prose
still sounds fine.

⭐ **Worked example — tasting.** In the cooking design, *tasting is the
anti-gauge*: expertise **is** discrimination, the spoon is the iconic
kitchen image, and you advance by perceiving more. One mechanic that
satisfies all four of the main lenses at once, and its immersion score
comes entirely from having refused a number.

---

## 4 · Gamification & self-improvement — better choices

*How does it help the player make better choices — for themselves, and
as a member of the community?*

Lens 1 is about **knowledge**. Lens 4 is about **values**. True, but it
generates nothing on its own, so state the line as **decidability**:

> ⭐⭐⭐ **Lens 1 governs what has a derivable right answer. Lens 4
> governs what has no right answer and must be decided anyway.**

⭐ That immediately explains why each lens has the instrument it has.
[uncertainty.md](./uncertainty.md) protects lens 1 because a resolution
roll destroys derivability. [measurement.md](./measurement.md) protects
lens 4 because **a gauge converts an undecidable choice into a
calculable one** — which is the real reason for the no-gauge rule, and a
better one than *gauges break immersion*: a sin counter does not merely
look bad, **it deletes the decision**. Same rule in the religion
doctrine's voice: *you can't farm a god* — **farming is the attempt to
make an undecidable thing calculable.**

The simulation **forces certain choices** — and the question this lens
asks is what making them teaches you about yourself and about your role
in the community. Both halves count:

- **Personal development** — the in-game competence is a real
  competence; the hours are applied hours.
- **Being a good citizen** — what the feature lets you do *for* others,
  and what the polity can see you having done.

This lens is also **where standing gets conferred**. Every design should
be able to answer: what does excellence at this look like, and **who
says so?** The three-layer answer is already written down —
[measurement.md](./measurement.md): *the engine measures · the subject
values · the polity imposes.* A design that measures something without
naming who values it has skipped the interesting half.

⭐⭐ **The divergence diagnostic.** The sharpest question this lens can
ask of a shipped feature is not about the feature at all:

> **What does it say if the choices you make in the game are not the
> ones you would make in real life?**

That inverts the usual gamification move. Normally the game exists to
*change* behaviour; here **the gap is the signal**, and the job is to
make it legible rather than to close it.

⚠⚠ **It only works if lens 1 holds.** The transfer warrant runs both
ways: if conclusions drawn inside a faithful miniature are valid
outside it, then choices made inside are evidence about choices outside
**by the same faculty**. So —

> **In a dishonest simulation, divergence tells you the model is wrong,
> not that you are.**

⭐⭐ Lens 4's whole diagnostic value is therefore *derived from* lens 1.
That is the real argument for pedagogy topping the rubric: not that
learning outranks values, but that **fidelity is what makes the values
reading admissible at all.** A fudged economy that makes you hoard tells
you nothing about whether you hoard.

⭐⭐ **Incentives are neutral, and the dials belong to two parties — but
they do not have the same reach.** Incentives produce bad behaviour as
readily as good, so the platform ships the *mechanism* and is not
opinionated about the direction. The dials are set by (1) **the player**,
for what they want to work on, and (2) **the polity**, for what it wants
at scale. Both are moral questions, which is why only players can answer
them, individually or in aggregate. ⚠⚠ But the symmetry stops at the
fiction's edge:

> **The polity's dial stops at the fiction's edge. Only the subject's
> own dial is licensed to cross it.**

A polity incentivising behaviour **in the world** is the product
working. A reading of your real life that interrupts you — *"normally
you'd do this, are you sure?"* — is licensed **only by a goal you set
for yourself**; the same interruption driven by what a majority wants
from your behaviour is not governance, it is coercion by people who are
not you, and no vote makes it otherwise. Such an interrupt inherits
lens 7's requirements pointed **inward**: the criterion must be readable
by the person it is about and revocable by them, because they are the
only one who authored it.

⚠ **Unopinionated has a price:** the platform must be able to
incentivise something its authors disapprove of. If it cannot — if there
is a quiet clamp — the dials are decorative. Either players can answer
the moral question wrong, or they are not answering it.

> **The test.** What choice does this force — one with **no calculable
> right answer** — and what does making it tell you about yourself and
> your place in the community?

**Failing looks like:** no real choice (a dominant option, or a single
path dressed as a decision); a reward for time rather than for judgment;
standing that accrues from throughput; ⭐ **a choice the design has
quietly made calculable**, so that the "decision" is arithmetic wearing
a moral costume; a dial the platform secretly clamps.

⭐⭐ **Worked example — stewardship.** This is the least-explored lens,
but that is a *doc* gap, not a content gap: a residence, pets with a
bond the animal decides, parcels held by title, a business roster, NPC
household parents. A caretaking cluster, already built, never claimed
by the lens.

> Lens 4 asks *what choice does this force*. Stewardship's answer is
> that the choice is forced by **something with a stake in it that is
> not you** — a pet you did not feed, a tenant, a roster that does not
> get paid.

⭐ That is the difference between a choice with **stakes** and a choice
with a **score**, and it produces lens 4 outcomes **while measuring
nothing** — which is why it sits comfortably beside the no-gauge rule
instead of fighting it.

---

## 5 · Continuity — does the capability survive the epoch?

⭐⭐ **Not "technology & magic".** The lens is a *property*, not a
subject: magic is one epoch's fiction and belongs here as an **example**,
never as a limb. Naming it after its examples is why it read as a genre
note and got skipped.

Run the design against **prehistory · medieval · industrial · modern ·
future** and check what has to change.

> ⭐ **Physics in ancient Rome is the same as in New York City.** The
> *dynamics* change with time period and technology; the **mechanics
> must not.**

⭐⭐⭐ **This is lens 2's time axis.** The point is not epochs, it is that
what an author already learned keeps paying:

> *If I have already learned how to build Excalibur, I do not have to
> learn a new thing to build a lightsaber. The common functions are one
> interface; the epoch changes efficiency and adds specific mechanics.*

So continuity is the mechanism by which lens 2's promise **compounds**
instead of resetting every time the world changes epoch — which is why
it inherits lens 2's fork-deciding power rather than needing its own.

**Future tech and magic are the same axis seen from two sides.** Both
function identically in narrative once they are sufficiently advanced,
which is exactly why the magic model is built as *invented content
confined to one postulate* sitting on real thermodynamics — conservation
holds globally, and a working is priced like a heat pump. Magic that
obeys laws and technology that obeys laws are the same design problem.

⭐⭐ **The interface is visible to the command interpreter**, which makes
the test concrete rather than a thought experiment:

> **The test.** Does the new epoch's object answer the same commands?

A lightsaber you `sharpen` is a failure — a `Grade`/`Durable` assumption
leaking onto the shared surface. A lightsaber you `wield` and `strike`,
whose delivery profile and channel differ, is a pass.

⭐ **Worked example — the wall socket.** `ChargedMixin` is one charge
economy; `ManaPowered` is its second consumer. A wand and a wall socket
are the same mechanism with different fiction attached. The same
property holds in [electricity.md](./subsystems/electricity.md), where
one honest Ohm's-law model covers a hand tool and, scaled up, the grid.
`Workable` is the same move on the verb side: one interface, many
trades.

**Failing looks like:** ⭐ **a verb that only makes sense in one epoch
appearing on the common interface** — that is the tell. Structurally, a
mechanic that would have to be *rewritten* rather than
*re-parameterized* for another epoch, usually a sign it was modelled at
the level of the technology instead of the level of the physics. This is
also the discipline behind *trades ship medieval and advance by
exercised disciplines*: the ladder is a parameter, not a different
machine.

---

## 6 · Economy — what does it produce, what does it consume, who pays?

*What does this feature put into the economy, what does it take out, who
pays for it, and did the demand exist before the feature did?*

Every feature is a producer or a consumer or both, whether or not it
was designed as one. A gym consumes an hour a person could have sold; a
fitter body sells a longer shift; a body that trains eats differently,
and the butcher notices. The lens asks for those flows to be **named**,
so a feature never quietly creates a sink with no source, a source with
no sink, or a need that had to be invented for the market to exist.

The four questions, each with its doctrine already written:

- **What does it produce, and for whom?** Goods, capacity, information,
  standing. ⭐ *A vocation exists iff there is unmet demand*
  ([vocations.md](./vocations.md) — the demand test).
- **What does it consume?** Time, goods, money, reserves. ⭐ *An
  abstraction is legitimate while it still costs somebody the activity*
  ([uncertainty.md](./uncertainty.md) — the abstraction law). Time is
  the currency every other one is priced in.
- **Who pays, and with what?** Time or money, and whether they are
  substitutes here (delegation is first-class, and itself a lesson).
  ⚠ *Money may buy goods and services; it may never buy standing*
  ([measurement.md](./measurement.md)) — a feature where money reaches
  the standing mint has failed this lens whatever else it does.
- **Did the demand exist first?** ⭐⭐ *Never invent a need to create a
  market* ([vocations.md](./vocations.md)) — if the feature requires a
  new player obligation in order to be wanted, the demand was
  fabricated. The honest justification is always a want that was
  already there, or a producer that is already producing into nothing
  (the wire suite's dirty reasons are a list of those).

> **The test.** Name the flows: what goes in, what comes out, who pays,
> and was anyone asking before we built it?

**Failing looks like:** a manufactured need (an inn justified by a sleep
*requirement*); a sink with no source (a fee nobody's income can meet);
a source with no sink (a byre producing milk nothing takes); a vocation
nobody would pay; standing that money can reach; a reward for time
rather than for judgment wearing an economic costume (a wage for
existing).

⭐ **Worked example — the gym.** Work produces goods *and* a body; a gym
produces only the body. So the gym's price is the wage foregone, the
miner never needs one, and the clerk buys with time what the miner gets
as a byproduct — fitness as production vs fitness as consumption, and
the game tells that story with no narration. The demand exists wherever
sedentary vocations do; a gym-keeper passes the test there and fails it
in a mining camp. And the trained body eats differently, which is where
a flat food basket becomes demand for the butcher — a source the dairy
and the butcher were waiting on.

---

## 7 · Governance — on what criterion, and what is the appeal?

*When this feature decides something **about a person**, on what basis —
and can they see it, argue with it, and get it changed?*

⭐⭐ **Split out of lens 6 on 2026-09-28.** It had ridden as that lens's
fifth question since 2026-09-18, and the arrangement hid exactly the
failure it was written for: the lending gate **passed every economic
question**, because the money came from somewhere, went somewhere, and
somebody paid. It was not an economics defect. Filing the judgment
question inside the economics lens is why the reviewer's attention was
on money.

**Who can be wronged by it, on what basis, and can they answer?** A
great many mechanisms decide something **about a person** — who is
hired, who is lent to, who is let a room, who is admitted to a
committee. Every such decision has a **criterion**, whether or not
anybody wrote it down, and ⭐⭐ **an unwritten criterion is still a
policy; it is just one nobody can read, argue with or amend.** Name it,
make the refusal say it, and say what lifts it.

⭐ **Say which tier it sits in.** Where the criterion ought to be the
polity's rather than the code's, name the entrenchment tier
([measurement.md](./measurement.md) § layer 3) — A is amendable by
nobody, B by whoever ships the code, C by the polity. **The size of
tier C is the measure of how real the participation is.**

> **The test.** When it judges a person: **name the criterion, and name
> the appeal.** Then say which tier the criterion sits in, and who may
> amend it.

**Failing looks like:** a criterion nobody can read; a refusal that names
no number; a bar that nothing lifts; a rule the polity cannot amend that
was never entrenched on purpose; ⭐ **a bare count used as a permanent
gate** over an append-only record, which can only ever rise.

⚠ **Not only the economy judges people.** Hiring, lending, letting a
room and admission to a committee are the obvious cases, but so are
publication, moderation, canon, conferral and any refusal a player meets
— which is why this is its own lens and not an economic footnote.

⭐⭐ **Worked example — the default that could not be cured.** The
economic bootstrap shipped a lending gate that counted a borrower's
defaults and refused anyone above zero. The count read an append-only
record, so it never fell: **one default ended a business's access to
credit permanently, with no way to pay its way back.** Every flow in
that feature was sound — the money came from somewhere, went somewhere,
and somebody paid — so the economic limb passed it, and the four
questions as they then stood had nothing to ask. It was caught by a
human reading the merge request. **This lens exists because that is not
a reliable way to catch it:** a decision was being made about a
person, on a criterion nobody had written down, with no appeal and
nothing that lifted it. See
[antipatterns.md § A bare COUNT as a permanent gate](./antipatterns.md)
and [credit.md](./subsystems/credit.md).

---

## Running the pass

A lens pass is short. Seven headings, a couple of sentences each, in the
slate and again in the requirements doc:

```
### Lens pass
1. Pedagogy — <Disciplines exercised; which is DOMINANT; what is derivable>
2. Expression — <what an author composes with no code; what bespoke buys>
3. Immersion — <what the sim affords without scripting>
4. Values — <the undecidable choice forced; who confers standing>
5. Continuity — <does it answer the same commands in another epoch>
6. Economy — <what it produces and consumes; who pays; was the demand there>
7. Governance — <when it judges a person: the criterion, the appeal, the tier>
```

If a heading is hard to fill, that is the finding — write the gap down
rather than writing something that sounds fine. The most common
outcome of an honest pass is not a rejected design; it is a design that
gets **one level more real** in the place the pass was thin.

## Related

- [design-philosophy.md](./design-philosophy.md) — the fidelity /
  honesty axis lens 1 rests on.
- [vision.md](./vision.md) — the pedagogical premise the whole rubric
  serves.
- [uncertainty.md](./uncertainty.md) — where randomness may enter
  (lens 1's sharpest instrument).
- [measurement.md](./measurement.md) — what may be counted, who says
  what it is worth (lenses 3, 4 and 7).
- [vocations.md](./vocations.md) — the demand test and the
  never-invent-a-need rule (lens 6's instruments).
- [arcane-science.md](./arcane-science.md) — one postulate, real
  thermodynamics (lens 5).
- [subsystems/advancement.md](./subsystems/advancement.md) — Discipline,
  the unit lens 1 measures in.
- [lenses/](./lenses/README.md) — the Schell deck, a different thing.
