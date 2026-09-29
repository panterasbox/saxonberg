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

### ⭐⭐⭐ Every answer has an altitude — invariant · grain · title

*Graduated from [lenses/](./lenses/README.md) 2026-09-29, where it was
found by writing entries that kept mis-levelling.*

This is a **platform**, and a platform makes most people reach for
neutrality. Do not. Each of the seven can be answered at three heights,
and **which one an answer is pitched at changes what it obliges:**

| | binds | may be ignored by |
|---|---|---|
| **invariant** | every game built here | ⛔ nobody |
| ⭐⭐ **the grain** | nothing — but the substrate is *for* this | any author, at a cost |
| **this title** | one game | anyone else, freely |

> ⭐⭐⭐ **The middle one is where most of this design's values live, and
> a pass that omits it is worse than one that mis-levels.**

**There is a kind of game this platform wants you to make**, and the
recommendations are real ones: how much duration to spend, whether
habituation is the outcome, whether the world should judge people at
all. ⭐ They are recommendations **because they are ignorable**, not
because they are timid.

⚠⚠ **Neutrality is not the safe answer, it is the adversary's answer.**
*"We give you the controls; we impose nothing"* is what every attention
company says, and [measurement.md](./measurement.md) refuses it in its
opening pages — this platform *does* impose conservation, the
good-floor, consent gates and a code-trust lockdown, and anyone who
looks will find them. **A lens pass should answer as if building the
game the platform is for**, and then say which of its answers are the
grain rather than the law.

⭐⭐ **The mechanism that holds a preference honestly is a default an
author can change** — the recommendation ships, and departing from it is
a decision somebody makes on purpose rather than a hole they fall
through. These are [measurement.md](./measurement.md)'s **Tier B** in
another voice: *"choices about what kind of thing this is,"* amendable
by whoever ships the code and checked by the right to fork.

⚠ **The failure this guards against is narrow and specific:** not having
a preference, but **implementing one as a substrate opinion nobody can
opt out of** — which is
[#93](./lenses/93-the-nameless-quality.md)'s *imposing properties nobody
asked for*, and which the base-class narrowing work is the code-side
version of.

### ⭐⭐ The borrowed instruments — which Schell lens sharpens which

This doc's opening note promises that *"where a Schell lens sharpens one
of the seven, it is named as an instrument"* and for a long time never
did. The [deck](./lenses/README.md) is the applied analysis; each entry
states which of the seven it sharpens and what it demands.

| | sharpened by | what it adds |
|---|---|---|
| **1 Pedagogy** | [#2 Essential Experience](./lenses/2-essential-experience.md) | only via the essence — ⚠ the *derivability* half still has no antecedent in 113 lenses |
| **2 Expression** | [#31 Action](./lenses/31-action.md) · [#79 Freedom](./lenses/79-freedom.md) · [#86 Character Function](./lenses/86-character-function.md) · [#93 Nameless Quality](./lenses/93-the-nameless-quality.md) | the **basic:strategic ratio**; *is the surface enterable*; casting vs. allocation; *does the substrate impose properties nobody asked for* |
| **3a Immersion** | [#93](./lenses/93-the-nameless-quality.md) · [#79](./lenses/79-freedom.md) | **not-separateness** as the positive form the failure list lacks |
| **3b Participation** | [#86](./lenses/86-character-function.md) | the function list, and *every NPC doing two jobs is a vacancy we deleted* |
| **4 Values** | [#46 Reward](./lenses/46-reward.md) · [#55 Visible Progress](./lenses/55-visible-progress.md) · [#91 Character Transformation](./lenses/91-character-transformation.md) | the price of refusing variable reward; *ambient* vs *visible* progress; **the change gap** |
| **5 Continuity** | ⛔ *nothing* | no lens in the deck asks it; see [#37](./lenses/37-fairness.md) on why the deck cannot |
| **6 Economy** | [#7 Endogenous Value](./lenses/7-endogenous-value.md) · [#27 Time](./lenses/27-time.md) | **the roulette test** — *if the game needs the credential to be worth playing, it is roulette*; and *time is the currency every other is priced in* |
| **7 Governance** | [#25 Judgment](./lenses/25-judgment.md) · [#37 Fairness](./lenses/37-fairness.md) | judging people *well* is a product, not only a hazard; and the evidence lens 7 is unprecedented |

⚠ **Three of the seven have no instrument**, which is a fact about the
deck rather than about them — and lens 1's and lens 5's emptiness is
itself a finding ([#37](./lenses/37-fairness.md)).

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

*What can a person make theirs, and does what they make count?*

⭐⭐ **State the promise before the mechanism.** Authoring is continuous
with playing: the sandbox and the world are the same substrate and
differ by a **published flag**, and how somebody earns that flag is a
question the architecture answers, not a policy bolted on afterwards.
Everything below is how that promise gets cashed.

> **The test.** What does this add to what a player can make *theirs* —
> and did it come from a chain that already had to exist, or from a knob
> we invented for the purpose?

⭐ Note that the test carries lens 6's demand question inside it. A knob
invented so that a personalization feature can exist is a fabricated
need wearing a creative costume.

### ⭐⭐⭐ Personalization is a derivative of supply-chain depth

This is the finding the lens is built on, and it is what separates it
from every character-customizer ever shipped:

> The ordinary way to give players expression is to **enumerate
> expression slots** — a dozen playing pieces, a wardrobe screen, a
> colour picker. A designer decides in advance how many knobs there
> are.
>
> We do not build a customizer. The wardrobe is expressive because
> **textiles shipped** — the subtractive dye stack, fit as two numbers
> and a stamp, the covering ladder. The residence because furnishing,
> parcels and the estate slice shipped. Pets because the bond, the
> offer and naming-as-promotion shipped. **Every link in the supply
> chain is a personalization feature**, and the surface is a byproduct
> nobody could have enumerated in advance.

⭐ So the question *"when do we build personalization?"* is malformed.
Personalization is what a finished chain **emits**; the schedule for it
is the schedule for the chains.

### How the promise is cashed — two tiers, and a design has to serve both

1. **The ordinary case, with no code.** An author assembles the basic
   thing out of pre-canned interactions the platform already affords —
   mixins that interoperate, recipes, templates, data files. If making
   the common case requires writing a class, the substrate has failed
   this lens.
2. **The bespoke case, without breaking.** On top of that, an author
   writes something genuinely custom — and the systems still hold up.
   The best outcome is stronger than "hold up": the systems **suggest
   the bespoke idea in the first place**.

The framing that matters: **give the author the most colors to paint
with.** Variety comes from combination and permutation, not from
enumeration. A system whose content is a list is a system that only
grows by someone adding to the list.

⭐⭐ **And the palette includes presentation.** This lens is easy to read
as being only about objects and mechanisms; it is not. An author also
paints with **MML, the six `NounPhrase` forms, font-by-register, the
theme and overlay cascade, `Visible.illustration`, and card layout by
`StuffKind`.** We are not a text game, we are a **hypertext** one — that
does not add a new channel, it adds **dimensions to the text channel**,
and every one of those dimensions is an authored surface. A design that
gives an author a new thing but no new way to *show* it has only half
landed. ⚠ Lens 3a holds the same surface to a different standard: what
is an authoring palette here is a **consistency obligation** there.

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
whose second instance requires a kernel edit; ⭐ **a personalization
knob with no chain behind it** — a wardrobe screen where there is no
cloth trade; a new thing an author cannot make *read* as anything.

---

## 3 · Immersion & roleplay — what experience does it create?

⚠⚠ **This heading is two questions, and they are not the same
difficulty.** Immersion is a *constraint* — cheap for us, well
understood, already instrumented. Participation is the *claim* — the
riskiest and most original thing the project is attempting. They get
separate tests.

### 3a · Immersion — the fiction cannot betray itself

*Does anything here contradict what the world has already said?*

⭐⭐ **Immersion is a consistency property, not a richness one.** A novel
is immersive because it does not contradict itself, not because of
resolution — which is why being made of words costs us nothing here.
Consistency is the imagination budget.

> **The test.** Does the fiction betray itself anywhere — is anything
> asserted in prose that the model does not back?

**Failing looks like:** the fiction asserted in prose that the model
doesn't back; a mechanic that is correct but reads as a spreadsheet.
The sharpest instrument is [measurement.md](./measurement.md)'s
no-gauge rule — *no fidelity meter, no sin counter, no progress bar, no
streak* **over a declared standard** — because a gauge is the fastest
way to convert a lived world back into an interface. ⚠ **Scoped
2026-09-29:** it was never a general ban on numbers, and reading it as
one contradicted the same doc's commitment that any measurement the
platform makes of you is one you can read. Performance is readable;
*character* is not a score. The companion tell:
**unlit interiors are pitch black**, and the giveaway that a design
forgot this is that every object reads "something" while the room prose
still sounds fine. ⭐ The positive form is worth holding too: every
element should be **well connected to its surroundings, as if it were
part of them** — that is what the good version feels like, where the
failure list only says what betrayal looks like.

⚠ **What this test does NOT cover: charm.** A world assembled almost
entirely from honest derivation risks reading as *machined* — but a
machined world betrays nothing, so this is not an immersion failure.
It is a separate value with no lens in the seven, and the working answer
is that **roughness belongs to authorship, never to fudged physics**:
the handmade lives in content (a named NPC, an odd room, Dave's Bar)
while the mechanism stays clean.

⭐ **Worked example — tasting.** In the cooking design, *tasting is the
anti-gauge*: expertise **is** discrimination, the spoon is the iconic
kitchen image, and you advance by perceiving more. One mechanic that
satisfies four lenses at once, and its immersion score comes entirely
from having refused a number.

⭐ **The presentation layer can betray too.** Register, font, theme and
illustration are part of what the world has said, so a formal register
on a character who has none, or an illustration the prose contradicts,
is a betrayal exactly like a fiction the model does not back. Lens 2
hands an author those dimensions; this test is what they owe.

### 3b · Participation — can the polity do something we did not want?

*Are the roles real, and can filling one change how the world runs?*

**Roleplay is not a feature you design.** It is what people do inside a
world coherent enough to be lived in, so the question is never *"does
this support roleplay?"* — it is *"is the simulation honest and dense
enough that the behavior is possible without anyone scripting it?"*
Designing *for* RP directly usually produces the opposite: a stage
instead of a place.

⚠⚠ **But "an honest sim grows an RP scene" is the weak version, and it
is not our claim.** The GTA roleplay scene is the standard citation for
it, and two things about that citation matter:

1. It did not emerge from the simulation alone. It emerged on **servers
   with admin teams, whitelists, character applications and written
   rules.** The honest sim made the behaviour *possible*; a polity made
   it *durable*. ⭐ Which makes governance **a prerequisite for
   immersion**, not a civics feature bolted beside it.
2. It is still **theatre on top of a sim that does not care.** The mayor
   of an RP server is not changing how the game runs. Every institution
   in it is staged by the players, because the game has no opinion about
   whether anyone is mayor.

> ⭐⭐⭐ **Our claim is categorically different. We are not asking anyone
> to roleplay a blacksmith — the economy has a blacksmith-shaped hole in
> it and somebody has to be in it.** The roleplay is a byproduct of the
> job being real.

⭐⭐ **The mechanism is NPC/player interchangeability at the position
level.** A seat is a position the world needs filled and either a person
or a program can hold it. Three consequences, and they are the whole
design: the world **runs without players**, so there is no cold-start
collapse; every NPC-held seat is a **standing vacancy**, visible and
takeable; and replacement is **legible** — somebody took that job, and
the town notices.

> **The test.** Can the polity do something we did not want?

[measurement.md](./measurement.md)'s entrenchment tiers are the
instrument: **the size of tier C is the measure of how real the
participation is.** If C is small, the answer to *do players actually
govern* is no, whatever the fiction says. ⚠ The concrete load test is
**the first serious griefing incident** — either the polity handles it,
or a wizard does and everybody learns the participation was decorative.

**Failing looks like:** a role that exists only for players, so the
world is empty when nobody is on; an institution whose decisions the
engine ignores; a seat with no consequence for leaving it unfilled;
⭐ **a governance surface where every outcome we would dislike is
unreachable** — which is a stage with a ballot box on it.

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
a moral costume; a dial the platform secretly clamps; ⭐⭐ **the engine
consulting a cross-domain composite** to gate something — *how good is
this person* is a question only people and institutions may ask
([measurement.md](./measurement.md) Part 1).

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

A lens pass is short. Seven headings — 3 has two halves — a couple of
sentences each, in the slate and again in the requirements doc. ⭐ Where
an answer is a **recommendation rather than a rule**, say so: *grain*
is a one-word annotation and it is the difference between a default and
an imposition.

```
### Lens pass
1. Pedagogy — <Disciplines exercised; which is DOMINANT; what is derivable>
2. Expression — <what a player can make theirs; which chain it came from>
3a. Immersion — <does the fiction betray itself anywhere>
3b. Participation — <what role this opens; can the polity refuse us>
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
