# Proposal — revising the six lenses after a Schell audit

> **Status: ✅ ALL RUBRIC CHANGES APPLIED** 2026-09-28 — **C1 · C2 · C3 ·
> C4 · C5 · C6** are in [design-lenses.md](./design-lenses.md), which is
> now **seven lenses**. Their `Cn → proposed` wording is kept below as
> the record of *why*, not as pending work.
> **Still open: R1 · R2 · R3** — the [lenses/](./lenses/README.md)
> repairs, which touch a different tree.
> ⚠ **Deliberately not chased:** `CLAUDE.md` and
> [workflow.md](./workflow.md) still say *six lenses*. Both are
> index files the worktree rules reserve for the **sweep**, not for a
> design branch to race. ⭐ **Slate lens passes were not retro-edited** —
> a recorded pass is dated evidence of a pass run under the rubric *as
> it stood*.
> **Retires** when applied — this is an ephemeral doc in the
> [workflow.md](./workflow.md) sense, not a subsystem reference.
> **Opened** 2026-09-28, out of a read of Jesse Schell's *The Art of
> Game Design* (3rd ed., CRC Press 2020) against our own rubric.

The question asked was narrow: **are our six lenses duplicating lenses
in the book?** The answer is no. But answering it properly meant
restating each of the six out loud, and five of them came back
different. That is the actual content of this proposal; the
duplication audit is Part 1 and is the least interesting part.

---

## Part 0 · What was read

The 3rd edition's **Table of Lenses** (pp. xxvii–xxxi) lists **113
lenses** — #1–#110 plus the half-lenses #67½ Metaphor, #93½ Presence,
#95½ Cheatability — and the book closes with an unnumbered #∞ Lens of
Your Secret Purpose. The roster was read in full; **nineteen lens cards
were read in their own words**, chosen because our design summons them:
#8, #25, #30, #31, #34, #37, #39, #46, #48, #52, #55, #66, #67½, #73,
#79, #84, #86, #90, #91, #92, #93, #93½, #94, #96, #97, #104, #106,
#110. The transformational-games chapter was read as well, because the
education vertical lives in its blast radius.

⚠ **Not everything was read.** Roughly ninety lens cards were not, and
any claim below of the form *"the deck has nothing for X"* is a claim
about the roster (all 113 names) plus the cards actually read. Where
that distinction matters it is stated.

---

## Part 1 · The duplication verdict

**No duplication anywhere.** The structural reason is worth stating
once, because it explains every row of the table below:

> ⭐⭐ **Schell's deck is written for a designer designing one game.**
> Five of our six are about a *platform other people author content
> into*, and a *polity that judges people*. Those are different
> objects, so the lenses can't collide.

| Ours | Nearest in the deck | Relation |
|---|---|---|
| 1 Pedagogy | #34 Skill · #48 Simplicity/Complexity · #8 Problem Solving | **Decomposes.** No lens for derivability; three sharp instruments available (Part 3, C6). |
| 2 Creative expression | #30 Emergence · #97 Expression · #73 Story Machine | **Anticipated in form, not in object.** #30 is "variety by combination" aimed at players; #73 contains the published-flag question verbatim. |
| 3 Immersion & roleplay | #93 Nameless Quality · #94 Atmosphere · #93½ Presence | **Core claim original.** #84 The World is *transmedia*, not simulation coherence — a live citation risk (Part 4). |
| 4 Values | #25 Judgment · #39 Meaningful Choices | **#39 is not the antecedent** — it is a *balance* lens about dominant strategies. #25 is, and stops at *do players feel it's fair*. |
| 5 Technology & magic | *(nothing)* | #104 Technology is the **developer's** tech choices. #67½ Metaphor is a distant cousin. |
| 6 Economy & governance | #52 Economy | #52 is five questions about **currency balance**. The demand test and the judging limb have no antecedent at all. |

⭐ **The README's cut of "Meaningful Choices" was correct**, and for a
better reason than the one recorded: #39 lives in the Balance chapter
next to Triangularity and asks about dominant strategies. Lens 4's
failure mode *"a dominant option dressed as a decision"* **is** #39 —
but that is one line of lens 4, not lens 4.

---

## Part 2 · Three findings that outrank the verdict

### F1 ⭐⭐⭐ We instantiate at runtime what Schell asks a designer to do on paper

Three independent cases, and once seen it is a property of the project
rather than a coincidence:

| Schell asks the designer to… | We made it a runtime object |
|---|---|
| **#34 Skill** — enumerate the skills your game demands, and notice which dominate | **Discipline** + Transcript + derive-on-read competence bands |
| **#86 Character Function** — list the functions the game needs, then cast characters into them | **Positions** on a Business, derived from the economy, fillable by NPC *or* player |
| **#67½ Metaphor** — make the interface resemble something already familiar | A **capability mixin**: the lightsaber is familiar because it *is* the sword's interface |

The #86 case is the sharpest. His worked example is a list — hero,
mentor, tutor, final boss, hostage — authored once, by the designer, at
design time, and his clever move is folding two functions into one
character *to save development cost*. Ours is derived continuously from
the economy and the casting call is open to the players.

⭐ This is the honest one-line answer to "are we copying the book":
**we are not duplicating his lenses, we are implementing several of
them.**

### F2 ⭐⭐ We refuse #46 Reward on purpose, and it costs us

**#46 The Lens of Reward** states variable-ratio reinforcement without
euphemism — a 1/3 chance of thirty points *"stays rewarding for a much
longer time, even though you are receiving the same number of points on
average"* — and calls escalating rewards *"a cheesy trick, but it
works—even when you know the designer is doing it and why."*

[uncertainty.md](./uncertainty.md) forbids this **by construction**:
resolutional randomness is banned, so we cannot pay a variable reward
for what an action *did*. We have not declined to use the slot machine;
we have made it unbuildable.

⚠ **The cost is real and unpaid.** XP works because it answers #91's
question — *how am I communicating those changes to the player* —
cheaply and **unbidden**. The mirror answers it on *pull*. Whether pull
alone is enough is an empirical question about players, not a question
doctrine can settle, and it is the same open question as "how do you
level up in this game."

⭐ The book assembles the contradiction and never resolves it: #46 says
variable reward works; the further reading behind #25 recommends
*Punished by Rewards* on the downsides of extrinsic reward; **#92 Inner
Contradiction** says *"A good designer must carefully remove inner
contradictions, and not get used to them, or make excuses for them."*
Our position — refuse #46, accept the cost — is the coherent one.

### F3 ⭐⭐⭐ "Being wronged outside a contest" has no word in the deck

**#37 Fairness** was read expecting distributive justice. It is
competitive balance: symmetry vs. asymmetry, rock-paper-scissors,
*"give each player a chance of winning that each will consider to be
fair."*

> ⭐⭐ Across all 113 lens **names** and every card read, **"fair" only
> ever means "even contest."** There is no lens about a game treating a
> person unjustly outside a contest — no lens for being refused,
> excluded, denied credit, or permanently barred.

So the credit-default finding — a criterion nobody wrote down, no
appeal, nothing that lifted it — is not a harder version of one of his
lenses. It is **a category the book does not have**, which is a stronger
claim for that limb than anything currently written about it.

---

## Part 3 · Proposed changes to `design-lenses.md`

### C1 ✅ APPLIED — Lens 5 renamed to **Continuity**, no longer "lesser"

**Now:** *"5 · Technology & magic — does the mechanism hold across every
epoch?"*, described as *"the lesser lens, and the most often
skipped,"* which *"never vetoes on its own."*

**Proposed:** **5 · Continuity — does the capability survive the
epoch?** Magic demoted from a limb to an example: it is one epoch's
fiction, and the sentence *"magic and future tech are one axis"* is a
claim about **narrative function**, not about the lens's job — it is
almost certainly why the lens reads as a genre note and gets skipped.

**Why the standing changes.** The lens is not about epochs; it is about
what an author already learned continuing to pay:

> If I have already learned how to build Excalibur, I do not have to
> learn a new thing to build a lightsaber. The common functions are one
> interface; the epoch changes efficiency and adds specific mechanics.

That makes lens 5 **lens 2's time axis** — the mechanism by which
lens 2's promise *compounds* instead of resetting every time the world
changes epoch. It does not need veto power of its own; **it inherits
lens 2's**, because what breaks when a capability cannot cross is
lens 2's promise. "The lesser lens, most often skipped" is the symptom
you would predict for a lens described by its examples instead of its
function.

⭐ **And it gains an operational test, which it does not have today.**
The current test is a thought experiment (*run it against five epochs*)
and the current failure mode is abstract (*rewritten rather than
re-parameterized*). The interface is visible to the **command
interpreter**, so:

> **The test.** Does the new epoch's object answer the same commands?

A lightsaber you `sharpen` is a failure — a `Grade`/`Durable`
assumption leaking onto the shared surface. A lightsaber you `wield`
and `strike`, whose delivery profile and channel differ, is a pass.
**The tell of a continuity break is a verb that only makes sense in one
epoch appearing on the common interface.** `Workable` shipping the
unification behind one interface is the exemplar already in the tree.

### C2 ✅ APPLIED — Lens 2 restated at product altitude

**Now:** *"Can an author build the ordinary case out of interoperating
mixins with no code — and does the system still hold, or better,
inspire, when they write something bespoke on top?"*

⚠ That sentence names mixins. By the project's own line — **requirements
= what the PRODUCT needs, plan = what the CODE needs** — it is in the
wrong doc. The mechanism has been promoted into the place where the
promise should be, and the failure modes are all engine smells (a mixin
that only works on one host; a second instance needing a kernel edit),
which are how you *detect* the failure, not what it costs a player.

**Proposed — three additions:**

**C2a. The promise, stated as one.** Authoring is continuous with
playing: the sandbox and the world differ by a **published flag**, and
how that flag is earned is an architectural answer, not a policy one.
⭐ #73 Story Machine asks our question verbatim — *"A story is only good
if you can tell it. Who can your players tell the story to that will
actually care?"*

**C2b. ⭐⭐⭐ Personalization is a derivative of supply-chain depth.**
This is the finding, and it is a better test than the mixin sentence:

> Schell's #97 Expression works by **enumerating expression slots** —
> Monopoly's twelve playing pieces, colouring dirt onto a character
> card, *"a clothes shopping interface in the Sims."* A designer decides
> how many knobs the player gets.
>
> We do not build a customizer. The wardrobe is expressive because
> **textiles shipped** — the subtractive dye stack, fit as two numbers
> and a stamp, the covering ladder. The residence because furnishing,
> parcels and the estate slice shipped. Pets because the bond, the offer
> and naming-as-promotion shipped. **Every link in the supply chain is a
> personalization feature**, and the surface is a byproduct nobody could
> have enumerated in advance.

> **The test (proposed).** What does this add to what a player can make
> *theirs* — and did it come from a chain that already had to exist, or
> from a knob we invented for the purpose?

⭐ Note that test has the demand test built into it, and would catch the
same class of thing lens 6's *never invent a need* catches.

**C2c. Presentation is an expressive surface and lens 2 never says so.**
Lens 2 is entirely about objects and mechanisms. Authors also paint with
MML, the six `NounPhrase` forms, font-by-register, the theme/overlay
cascade, `Visible.illustration`, and card layout by `StuffKind`.
⭐ **#66 Channels and Dimensions** is the lens that names it — hypertext
does not give us a new channel, it gives the text channel more
**dimensions**. (Lens 3 independently points at the same gap; see C3.)

### C3 ✅ APPLIED — Lens 3 split into 3a Immersion and 3b Participation

**Now:** one heading, one test (*"does the simulation make the behavior
possible without anyone scripting it — and does the result read as a
world rather than as an interface?"*), and the GTA exemplar.

**Proposed:** keep one heading if you like, but **two tests**, because
the halves have different difficulty, different evidence and different
risk.

**C3a. Immersion → the betrayal test.** *"Reads as a world rather than
as an interface"* is the **richness** framing, and it is the one that
makes text feel like a handicap. The better statement is a
**consistency** claim:

> **The fiction cannot betray itself.**

A novel is immersive by not contradicting itself, not by resolution.
This is already doctrine one level down —
[imagination.md](./lens-deck-salvage.md)'s *consistency is the
imagination budget* — and it never made it up into the rubric.

⚠ It also **resolves a worry this audit raised and then withdrew.**
Alexander's *roughness* (#93: *"When a game is too perfect, it has no
character"*) looked like a conflict with lens 1's honesty requirement,
given how much of this world is derived — weather as a stateless field,
ground minted at `postRegister`, competence bands, soil, husbandry,
spoilage. Under the betrayal test it is **not an immersion problem at
all**: a machined world betrays nothing. It is a **charm** problem, and
charm has no lens in our six. Left as an open question (Part 5).

**C3b. Participation → the tier-C test, and retire the GTA exemplar.**

⚠ **The GTA exemplar undersells the design and teaches the wrong
lesson.** The mayor of an RP server is not changing how GTA Online runs.
GTA's roleplay is **theatre on top of a sim that does not care**; every
institution in it is staged by players because the game has no opinion
about whether anyone is mayor. Two corrections follow:

1. Even on its own terms the argument is half told. The GTA RP scene did
   not emerge from the simulation alone — it emerged on **servers with
   admin teams, whitelists, character applications and written rules.**
   The honest sim made the behaviour *possible*; a polity made it
   *durable*. ⭐ That is a better argument for the Compact than any in
   the governance docs, because it makes governance **a prerequisite for
   immersion** rather than a civics feature.
2. Our claim is categorically different and stronger:

> ⭐⭐⭐ **We are not asking anyone to roleplay a blacksmith. The economy
> has a blacksmith-shaped hole in it and somebody has to be in it.**
> The roleplay is a byproduct of the job being real.

The mechanism is **NPC/player interchangeability at the position
level** (F1, #86): the world runs without players, every NPC-held seat
is a standing vacancy, and replacement is legible.

> **The test (proposed).** Can the polity do something we did not want?

[measurement.md](./measurement.md)'s entrenchment tiers supply the
instrument: **the size of tier C is the measure of how real the
participation is.** If C is small, the answer to *do players actually
govern* is no, whatever the fiction says. ⚠ The concrete load test is
**the first serious griefing incident** — either the polity handles it,
or a wizard does and everybody learns the participation was decorative.

### C4 ✅ APPLIED — Lens 4, four additions

**Now:** knowledge vs. values; what choice does this force; who confers
standing.

**C4a. ⭐⭐⭐ Restate the line between 1 and 4 as decidability.** The doc
says lens 1 is knowledge and lens 4 is values. True, but it generates
nothing. This does:

> **Lens 1 governs what has a derivable right answer. Lens 4 governs
> what has no right answer and must be decided anyway.**

⭐ It immediately explains why each lens has the instrument it has:
`uncertainty.md` protects lens 1 because a resolution roll destroys
derivability; `measurement.md` protects lens 4 because **a gauge
converts an undecidable choice into a calculable one.** That is the real
reason the no-gauge rule exists, and a better one than *gauges break
immersion*: a sin counter does not merely look bad, **it deletes the
decision**. Same rule in another voice: *you can't farm a god* —
**farming is the attempt to make an undecidable thing calculable.**

⚠ It also places #39 precisely. Schell's whole treatment of choice is
*optimization-shaped*: a choice is meaningful when no option dominates.
**A choice with no computable right answer is not in his vocabulary.**

**C4b. ⭐⭐ The divergence diagnostic, and its dependency on lens 1.**

> **What does it say if the choices you make in the game are not the
> ones you would make in real life?**

That inverts the standard gamification move: normally the game exists to
*change* behaviour; here the **gap is the signal**, and the game's job is
to make it legible rather than to close it.

⚠⚠ **It only works if lens 1 holds.** #8's argument is that the mind
builds *microrealities* whose conclusions are *"valid and meaningful in
the real world."* If that is the warrant, then choices made inside are
evidence about choices outside **by the same faculty** — so:

> **In a dishonest simulation, divergence tells you the model is wrong,
> not that you are.**

⭐⭐ Lens 4's entire diagnostic value is *derived from* lens 1's honesty
requirement. That is the strongest argument yet for why pedagogy tops
the rubric: not that learning outranks values, but that **fidelity is
what makes the values reading admissible at all.** A fudged economy that
makes you hoard tells you nothing about whether you hoard.

**C4c. ⭐⭐ Incentives are neutral; the dials belong to two parties; the
two dials do not have the same reach.** The platform should not be
opinionated about which behaviours are good. The dials are set by
(1) the player, for what they want to work on, and (2) the legislature,
for what it wants at scale. Both are moral questions, so only players
can answer them — individually or in aggregate. This is
[measurement.md](./measurement.md)'s three layers arrived at
independently, which is evidence the doctrine is right.

⚠⚠ **But the two dials are only parallel inside the fiction.**

> The polity's dial **stops at the fiction's edge.** Only the subject's
> own dial is licensed to cross it.

A legislature incentivising behaviour **in the world** is the product
working. A sensor reading your real life and interrupting — *"normally
you'd do this, are you sure?"* — is licensed **only by a goal you set
for yourself**; the same interruption driven by what a majority wants
from your behaviour is not governance, it is coercion by people who are
not you, and no vote makes it otherwise. The interrupt therefore
inherits the judging-a-person requirements pointed **inward**: the
criterion must be readable by the person it is about and revocable by
them, because they are the only one who authored it.

⚠ **And non-opinionated has a price:** the platform must be able to
incentivise something its authors disapprove of. If it cannot — if
there is a quiet clamp — the dials are decorative and tier C is
theatre. Either players can answer the moral question wrong, or they are
not answering it.

**C4d. ⭐⭐ Stewardship is lens 4's worked example, and it already
shipped.** Lens 4 is the least-explored lens, but that is a **doc** gap,
not a content gap: a residence, pets with a bond the animal decides,
parcels held by title, a business roster, NPC household parents. A
caretaking cluster, built, never claimed by the lens.

The deck has nothing for it: **#7 Endogenous Value** is worth you *own*;
**#96 Friendship** is peer mechanics (breaking the ice, having enough to
talk about); **#85 The Avatar** is identity. None is *a thing in your
care that can be let down.*

> ⭐ Lens 4 asks *what choice does this force*. Stewardship's answer is
> that the choice is forced by **something with a stake in it that is
> not you** — a pet you did not feed, a tenant, a roster that does not
> get paid. That is the difference between a choice with stakes and a
> choice with a score, and it produces lens 4 outcomes **without
> measuring anything**, which is why it is compatible with refusing #46.

### C5 ✅ APPLIED — lens 6 split into **6 · Economy** and **7 · Governance**

**Now:** one lens, five questions, the fifth (*when it judges a person
— the criterion and the appeal*) bolted on after the credit-default
incident.

**Proposed:** two coequal lenses.

- **6 · Economy** — what it produces, what it consumes, who pays, and
  was the demand there first.
- **7 · Governance** — who decides, on what criterion, and can the
  person it is decided about read it, argue with it and amend it.

⭐ **Why, stated as the failure it was invented for:** the lending gate
passed every economic question because it **was** economically sound —
money came from somewhere, went somewhere, somebody paid. It was not an
economics defect. Putting the judgment question inside the economics
lens is exactly why nothing caught it but a human reading the MR: the
questions around it were about money, so attention was on money.

⚠ **An earlier draft of this proposal argued governance was a *floor*
the other five stand on, and that is withdrawn.** The evidence was three
questions in one conversation that ran downhill into governance — a
selection effect from the questions being asked, not asymmetry. **All
seven lenses overlap in different directions; none is special.** Seven
coequal headings.

### C6 ✅ APPLIED — Lens 1, three imports

**C6a. Ask which Discipline is *dominant*, not just which are
exercised.** #34's lead-in states lens 1's failure mode better than
lens 1 does: *"It is easy to fool yourself into thinking your game is
about one skill, when other skills are actually more important"* — a
game you thought was about quick decisions turns out to be about
memorising which enemies appear when. ⭐ **That is the smelt**: the
recipe version would have *claimed* metallurgy and *exercised* recall.
The doc frames this as a flaw you would spot; Schell frames it as
self-deception you will not, and supplies the diagnostic. A craft can
honestly exercise three Disciplines while the dominant skill is
menu-memorisation.

**C6b. Restate derivability in #48's vocabulary.** *Innate complexity*
(rules with "unless," "except," "but") vs. *emergent complexity*. Then:

> **Innate complexity is what you have to look up. Emergent complexity
> is what you can derive.**

And his neighbouring pair is the better prize: **"artificial balancing"**
(adding rules until the behaviour comes out right) vs. **"natural
balancing"** (the effect arises from the interactions). That is *model
honestly, no fudge anywhere*, except it names the **tempting technique**
rather than the bad outcome — useful in review, because nobody writes
"I am fudging"; they write "I added a clamp so the numbers come out
right."

**C6c. Add the transfer warrant, which lens 1 asserts but never
argues.** From #8's surrounding argument: minds build *"miniature
realities based on the real world… so effectively distilled that
manipulations of this internal world, and conclusions drawn from it, are
valid and meaningful in the real world."* ⭐ So the design question is
not *how do we teach* — it is **do not corrupt the microreality, because
the player's inference engine will run on it either way.** A die roll
standing in for a mechanism does not merely fail to teach; it teaches
something false, efficiently. This is also the strongest available
argument for the no-fudge rule, and C4b now depends on it.

---

## Part 4 · Repairs to `docs/lenses/`

### R1 ⚠ The README roster is stale, and wrong about a cut

Eleven entries exist on disk and are **not linked from the roster**:
`cheatability` · `economy` · `emergence` · `fantasy` · `griefing` ·
`infinite-inspiration` · `moments` · `resonance` · `skill-vs-chance` ·
`story-machine` · `the-pitch`.

⚠ Including **`griefing.md`, which the README states was "drafted and
then cut"** — it is 179 lines and sitting in the directory. The roster
should be regenerated from disk, and the cut claim corrected to name
only what was actually cut.

### R2 ⚠ `the-world.md` is probably citing the wrong lens

**#84 The Lens of the World is about *transmedia* worlds** — multiple
gateways, franchise coherence, *"How is my world better than the real
world? …Is my world centred on a single story, or could many stories
happen here?"* If the entry is about worldbuilding coherence (which is
what the README's blurb says), its footnote cites a lens that does not
say what the entry needs. **Read before building anything on it.**

### R3 New entries the design now demonstrably summons

| Lens | Why it earns an entry today |
|---|---|
| **#25 Judgment** | The true antecedent of lens 4's standing question and of lens 7's judging limb. *"What does your game judge about the players? …Do players feel the judgment is fair?"* |
| **#46 Reward** | We refuse it on purpose (F2). The entry is the refusal and its price. |
| **#93 The Nameless Quality** | *Not-separateness* is the **positive** form of lens 3's failure mode — lens 3 currently only knows how to say what betrayal looks like. *Roughness* is the charm question. |
| **#86 Character Function** | The position model, inverted (F1). |
| **#31 Action** | The passage introducing it argues text adventures died because *"for every one of the hundreds of verbs a game supported, there were thousands it did not"* — the sharpest attack in the deck on our medium. See below. |
| **#90 Status** | Keith Johnstone improv status — posture, eye contact, territory, who defers. Directly relevant to the LLM-NPC work; unrelated to renown, despite the name. |

⭐ **The #31 entry writes itself, and it is a rebuttal.** Schell's
critique targets a *parser* pretending to accept anything; a **command
palette** never made that promise, and this architecture has always been
web-MVC applied to the command line, not a parser. That dissolves the
**guessing** half and inherits the **discovery** half — and our answer to
discovery already exists and has never been framed as an answer to this:
**the refusal is the progression UI.** Verb conferral was retired
precisely so a command must *exist* in order to tell you why you cannot
use it yet. ⭐⭐ Same answer serves **#79 Freedom** (*"Are there any
places where they are overwhelmed by too much freedom?"*), where the
call-security model is the door and an honest door says what it is.
**#31 and #79 have one answer in this design.**

⚠ The burden does not vanish, it relocates: a palette of 200 flat
commands **is** enumeration, the thing lens 2 forbids. The escape is
that an instrument affords the command and a pack ships a row —
`measure <channel>` rather than a verb per trade. So lens 2's test on
the command surface is **does the palette grow by composition or by
addition**, which the lint family already gates.

---

## Part 5 · Open questions — decided by nobody yet

**Q1 ⚠⚠ Is "nine ledgers, almost none rendered" a resolved tension or an
inner contradiction?** Count them: chronicle, participation,
advancement, renown, trait, disposition, influence, provenance,
accountability. **Every byte of state a progress bar needs exists; only
the rendering is refused.** When *how do I level up* is asked in anger,
the cheapest credible answer will be *render a ledger* — plausible, one
MR wide, and the data already correct.

⭐ The reframe that makes this tractable: **#55 Visible Progress is a
puzzle lens** (it sits under *Puzzle Principle #3: Give a Sense of
Progress*), and its real question is *"What progress is visible, and
what progress is hidden? Can I find a way to reveal what is hidden?"*
**We do not refuse it — the mirror is our answer to it.** So
`measurement.md` does not ban visible progress; it bans **ambient**
progress. Push vs. pull. That distinction is the whole levelling
conversation in one line.

⚠ And #92's warning applies to us, not just to Schell: *do not get used
to an inner contradiction, or make excuses for it.* This project gates
`isWizard` checks, object-verbs, module scope, schema literals and mixin
names with lints, and gates its **most reversible design commitment**
with a paragraph. The no-gauge rule is a **rendering** rule, which makes
it exactly the shape [lint-family.md](./lint-family.md)'s
**census-then-ratchet** pattern handles: census the surfaces that render
a derived number to a player, gate today's count as the ceiling.

**Q2 Charm has no lens.** Alexander's *roughness* — *"the handmade
feeling of 'house rules' often makes a game seem more alive"* — is a
real risk for a world assembled almost entirely from honest derivation.
The probable answer is that **roughness belongs to authorship, never to
fudged physics**: the handmade lives in content (a named NPC, an odd
room, Dave's Bar), the mechanism stays clean. That sentence does not
exist anywhere, and without it the default answer to *should this be
derived* is always yes, forever.

**Q3 ⚠ Lens 2's tail and lens 3's tail terminate on the same unbuilt
thing.** The published flag needs somewhere for work to go; *"build your
own and show it off to your friends"* needs someone to show it to. #73
asks it verbatim; [community.md](./lens-deck-salvage.md) already flags
cold-start emptiness as the live risk. ⭐ Note the "human-blessed"
requirement does **not** need a review queue — it needs **provenance**.
`authoring_events` + CreditRouting already record who made what, so LLM
bulk and human work can coexist without a gate: the blessing is legible
attribution, not approval.

**Q4 The education vertical has an unmade decision.** Schell's
*Transformational Tip #3*: *"designers of transformational and
educational games set out to create an experience that replaces the need
for a skilled instructor… why not think about making the instructor a
kind of 'dungeon master'?"*

⭐ **Our answer is better than his and is not written down.** He
collapses two roles; this design separates them — **instructors** are
in-fiction, hold standing, no engine power, and prepare you to go
off-campus into the economy; **DMs** are the executive branch and the
wizards, holding engine power. Schell's version requires an instructor
to be *technical* in order to be powerful. Ours requires them only to be
*respected inside the fiction*, which is what an instructor actually is
— and it means a real instructor could hold the role without writing a
line of JavaScript. ⚠ Also his: there are **two kinds of expert** —
those who have the facts and those who know how to teach them. Our
content-authoring model currently assumes the first kind.

**Q5 The campus tonal load.** Real classes and real labs inside a frame
with snarks, grumpkins and a poise-based combat system is a #11
Unification / #12 Resonance question, and both entries already exist.
Offered as a hypothesis only: **on a campus the fantasy is not wizardry,
it is competence** — being someone who knows how to do a thing — which
is the same fantasy the real university sells, which is why the two
frames may carry each other rather than fight.

---

## Part 6 · If this is accepted, the order of work

1. ~~**C5** (split 6 → 6 + 7)~~ ✅ done 2026-09-28.
2. ~~**C1** (rename 5 → Continuity)~~ ✅ done 2026-09-28. Live
   cross-references fixed at the same time: `employment.md`'s hiring
   criterion now cites lens 7, and `lenses/README.md`'s warning block
   names all seven. ⚠ `CLAUDE.md` + `workflow.md` left for the sweep.
3. ~~**C6** (lens 1: dominance · innate→emergent · the transfer
   warrant)~~ ✅ done 2026-09-28. ⭐ The transfer warrant is now stated
   in lens 1 **because lens 4 depends on it** — the two are wired.
4. ~~**C4** (lens 4: decidability · divergence · the two dials ·
   stewardship)~~ ✅ done 2026-09-28.
5. ~~**C2, C3**~~ ✅ done 2026-09-28, together, because both land on the
   rendering layer. ⭐ The duplication was avoided by **splitting the
   claim rather than the text**: lens 2 owns the rendering layer as an
   *authoring palette*, lens 3a owns it as a *consistency obligation*,
   and each points at the other. Lens 3 now carries `###` subheadings
   (3a · 3b) — the only lens that does — and the pass template lists
   them separately.
6. **R1** — regenerate the `docs/lenses/` roster from disk; fix the
   griefing claim. ⚠ Index-file discipline applies: this is a sweep
   edit, not a race.
7. **R2** — read `the-world.md` against #84 before anything else is
   built on it.
8. **R3** — new entries, in the order the builds summon them. #25 and
   #46 are the two the levelling conversation will want first.

Part 5 is **not** work; it is a list of things to decide in conversation
before they get decided by default.

## Related

- [design-lenses.md](./design-lenses.md) — the rubric this proposes to revise.
- [lenses/README.md](./lenses/README.md) — the borrowed Schell deck (Part 4).
- [uncertainty.md](./uncertainty.md) · [measurement.md](./measurement.md)
  — the two instruments C4a re-anchors.
- [workflow.md](./workflow.md) — the artifact taxonomy that retires this doc.
