# The Schell deck — applied

> ⚠ **Not the rubric.** The seven lenses every high-level design is
> interrogated with — **pedagogy · creative expression · immersion &
> roleplay · values · continuity · economy · governance** — live at
> [../design-lenses.md](../design-lenses.md), and that is the only home
> they get. *That* is the decision rule; **this directory is a box of
> instruments pointed at it.**

Each entry takes one lens from Jesse Schell's *The Art of Game Design:
A Book of Lenses* (3rd ed., CRC Press, 2020) — the small bundles of
questions that examine a design from one fixed angle — and asks it of
this game.

## ⚠ Restarted 2026-09-29

The previous 29 entries were **deleted, not revised.** They were not
wrong; they were written against *content*, and the content moved —
eleven of them landed in one sitting on 2026-07-28 and were never
touched again, and the tree has since taken over 1,100 commits to
`docs/subsystems` and `docs/slates`.

**What survives is in [../lens-deck-salvage.md](../lens-deck-salvage.md)**
— the two ratified essence sentences, the slate checklist (which
existed nowhere whole), the NetHack accretion thesis, and the open asks
they recorded. The originals are in git history.

⭐⭐ **The rule that comes out of that, and it is binding on new
entries:** anchor to **which of the seven lenses this sharpens and what
it demands of any design** — not to this month's content. Cite the
rubric and the subsystem doctrine; reach for a specific piece of
content only as an illustration that could be swapped without changing
the argument. An entry that reads as a tour of what shipped in
September will be unreadable in December.

## One lens, one file

⭐⭐ **Entries are 1:1 with Schell's lenses, and the filename carries the
lens number** — `46-reward.md`, `93-the-nameless-quality.md`. Half-lenses
take an `h`: `67h-metaphor.md`, `95h-cheatability.md`.

So the directory **sorts and reads like the book**, and anyone holding a
lens number can find its entry without knowing how we think about it.
⚠ **Do not group several of his lenses into one file**, however much
they feel like one argument — the book is stable, and which of his
lenses feel related is a fact about whoever is writing this month. That
is the rot this restart exists to fix. **Grouping belongs in the index
below**, where a row may name several entries.

## The roster, indexed by our lens

Chosen from the 2026-09-28 audit
([../design-lenses-revision-proposal.md](../design-lenses-revision-proposal.md)),
which read the full Table of Lenses — ⚠ **116 lenses**: #1–#112, the
three half-lenses (#67½ Metaphor, #93½ Presence, #95½ Cheatability), and
the unnumbered **#∞ Lens of Your Secret Purpose**. *(Corrected
2026-09-29: an earlier count of 113 stopped one page short of the table's
end and missed **#111 Responsibility** — "does my game help people,
how?" — and **#112 the Raven** — "is making this game worth my time?")*
✅ **Twenty-three written**: `2` · `7` · `13` · `17` · `25` · `27` ·
`28` · `30` · `31` · `33` · `62` · `63` · `64` · `65` · `66` · `37` · `46` · `55` · `79` · `86` · `91` · `93` · `110`. ⛔ **`92` was written and then deleted** —
see below.

| Sharpens | Entry | What it is for |
|---|---|---|
| **all seven** | ✅ [`2-essential-experience.md`](./2-essential-experience.md) | ⭐⭐⭐ The lens that asks what the seven are *for*. Two challenges — he assumes one game **and one kind of participant** (*player* where he means *consumer*; we have consumers, labour and capital). The seven reduce to **the world does not lie · what you do persists**, which the ratified head already says. And the engine/transmission split: *without the Compact, a world you can live in; with it, a world you can change.* |
| **4 · Values · 7** | ✅ [`110-transformation.md`](./110-transformation.md) | ⭐⭐⭐ Paired with **#111 Responsibility** (*Kipling's iron ring — "it doesn't come off"*). We are not holding the dial: **the incentives are pencil, not ink.** So **Tier A is the responsibility statement**, and the hedge is values *instantiated in content*. ⚠⚠ Carries the premise — *the game believes people are basically good* — and the case that defeats its filter: **the unfilterable harm is the one that motivated the project.** |
| **1 · Pedagogy · 2** | ✅ [`17-the-toy.md`](./17-the-toy.md) | ⭐⭐⭐ *GTA "was designed as a medium… a living, breathing city"* — the deck's own words for this project, and **we have already taken his braver way**. Q2 is the **enterability gap verbatim** (third sighting). And *GTA came from Pac-Man*: deriving the world may not oblige deriving the game. |
| **6 · Economy · 2** | ✅ [`64-juiciness.md`](./64-juiciness.md) | ⭐⭐⭐ Not a polish lens — **second-order motion is amplification, not decoration, and ours is the simulation.** One verb moves derived state in a dozen places, which is deeper juice than any effect layer. ⚠⚠ **And almost none of it is rendered**: derive-on-read means the cascade has no moment, so **we are mechanically juicy and presentationally dry** — Schell's own *“inner contradictions… a dry interface on a fun game”* from the opposite side. ⭐⭐⭐ Why it is lens 6's: *“the feedback it gives is so powerful that it changes work into play”*, and **our economy IS work** — **a dry interface over an economy of labour is a job.** ⭐⭐⭐ Plus the constraint he never faces: **juice is parallel in graphics and serial in text**, so the budget is *time*, and `reactions`' aggregate-and-flush is the only known way through. |
| **6 · Economy · 2** | ✅ [`30-emergence.md`](./30-emergence.md) | ⭐⭐⭐ Why the trade backlog is a **roadmap** rather than a content queue. His most powerful tip — *verbs that act on many objects*, **"possibly the single most powerful thing you can do"** — is a content budget in a hand-built game and **architecture** here, so **emergence has a supply chain**: a pack author's row raises the strategic-action count of verbs written months earlier. ⭐⭐⭐ And the **chain walk is his method run backwards** — he adds verbs and watches; **we add a consumer and derive the producers.** Carries the synthesis rule: **borrow to the depth the combination needs, not the depth the source went** — and the finding that the RGO credits nobody. |
| **6 · Economy · 4** | ✅ [`7-endogenous-value.md`](./7-endogenous-value.md) | ⭐⭐ **The roulette test**: *if the game needs the credential to be worth playing, it is roulette.* His Q2 is one our doctrine forbids us answering. ⭐⭐⭐ And the Goodhart shape: **our best-instrumented value is the one we least want optimised, and the value we promise — understanding — is the least instrumented thing in the design.** |
| **6 · Economy · 3a** | ✅ [`27-time.md`](./27-time.md) | ⭐ **His chapter is about escaping time; ours about being subject to it** — rewind and speed-up refused, but ⭐ **the pause exists and is better than his**: *you cannot pause the world; the world agrees not to charge you for your absence.* Q1 unanswered — and untestable except **relatively**, which is a third ask for the gym pattern. |
| **4 · Values · 1** | ✅ [`63-feedback.md`](./63-feedback.md) | ⭐⭐⭐ **The Swiffer settles the argument `55` had with itself.** *“Less feedback = dirtier floor”* — withholding evidence of progress does not purify the player, **it makes them do the thing less often**, which is the owner's workout objection proved by somebody selling mops. ⭐⭐⭐ And the form is the lesson: **the Swiffer does not gauge you, it shows you the dirt** — the no-gauge rule's *positive* form. ⛔ Of his five jobs (judgment · reward · instruction · encouragement · challenge) **encouragement is the one with no doctrine in the platform docs** — and the finding is worse than an absence, it is a **misfiling**: *the reward is chosen capability, not a carrot* and the **anti-pointsification test** are written, in a slate and two vertical pitch docs, while every prohibition sits in `measurement.md`. ⛔ Plus a dangling citation twice over (`advancement.md:800-802`, in a 610-line file that never says it). **Proof in the type system:** 16 of the 29 `Note` kinds are typed failures carrying a reason; `engagement-completed` carries an id and nothing else. ⭐⭐⭐ And the buildable answer already ships — *“quick wins” → “deep learning”* is `Quantity.tag(scale)` over one competency band: **same value, two renderings, never “you suck at this one.”** |
| **4 · Values** | ✅ [`46-reward.md`](./46-reward.md) | ⭐ The refusal of variable-ratio reward, stated as a cost we have not paid: XP arrives **unbidden**, the mirror only on **pull**. |
| **4 · Values** | ✅ [`55-visible-progress.md`](./55-visible-progress.md) | It is a *puzzle* lens, and we do not ban it — the mirror answers it. `measurement.md` forbids **ambient** progress, not visible progress. |
| **4 · Values** | ✅ [`91-character-transformation.md`](./91-character-transformation.md) | The gap: we have an asset-accumulation story, not a character-change one. *"ARE"* is the ledger that is not online. |
| **7 · Governance · 1 · 2** | ✅ [`33-rules.md`](./33-rules.md) | ⭐⭐⭐ *"A game is not just defined by its rules; a game **is** its rules."* Brings **Parlett's taxonomy** — and the finding that his **house rule → law → official → written** feedback arrow, which every other game leaves outside the artifact, **is what the Compact promoted to a mechanic**. ⭐⭐⭐ Separates the two axes the docs conflated — *who may amend* (the tiers) vs *who enforces* (`wall · camera · witness · norm`) — and names the failure: **implementing a law must not entrench it.** ⭐⭐ The sandbox suspends every rule but the ones that make suspension affordable, and **those are Tier A**; ⚠⚠ but the foundational rules have **no legislature** — the ratifying act is a merge request. And the hole in Schell: his own definition names *the consequences of the actions* and his questions never ask, which yields **a rule with no stated damage is advisory.** |
| **7 · Governance** | ✅ [`25-judgment.md`](./25-judgment.md) | Lens 7's only antecedent in the deck — and it stops at *do players feel it is fair*. |
| **7 · Governance** | ✅ [`37-fairness.md`](./37-fairness.md) | Across 116 lenses **"fair" only ever means "even contest"** — the evidence lens 7 is unprecedented. ⚠ And the one contest we *do* have: wizards and players share a world, and the answer is constitutional, not technical. |
| **2 · Expression · 1 · Pedagogy** | ✅ [`13-infinite-inspiration.md`](./13-infinite-inspiration.md) | ⭐⭐⭐ **Restored at the owner's request** — his favourite lens, and the only instrument in the deck pointed at **the designer** rather than the artifact; its questions are first-person singular and cannot be delegated. ⭐⭐⭐ **Carries the genre reframe**: *we are not building an MMO, we are building a **multiplayer life sim** — and when you build a life sim, life is your inspiration, so everything is.* **The lens collapses into the genre**, which is why it reads as the favourite — ⚠⚠ and the counterweight, because a lens that is automatically satisfied has no teeth: *if everything is inspiration, nothing is*, and the questions are **singular** on purpose. **The genre makes the library infinite; it does not make the selection automatic, and selection is the whole act.** ⭐⭐⭐ Plus **gamification inverted**: gamification applies game *mechanics* to life, Schell's thesis is that game *design* IS life design — **we refuse the first and are built on the second** — and the proof is our own rubric, which is **civics, not game design** (education · art · belonging · ethics · history · work · law). With [`37`](./37-fairness.md)'s measurement as the confirmation from the other side: **the book that argues game design is life design has no lens for governance.** ⭐⭐⭐ The distinction that earns it a slot: **lens 2 asks whether an author CAN express themselves; this asks whether they have anything to express** — and a perfect substrate handed to someone with no inspiration produces **convergence**. ⚠⚠ It conflicts with our stated method (*"we basically explicitly ripped off EU5's RGOs… most of our systems are inspired by other games"*) and the resolution is finer than *synthesis is fine*: **borrowing a MODEL is borrowing somebody else's reading of the world** (an RGO's referent is agriculture; the game you took it from did the looking), so **borrow models, not shapes — a model has a referent you can go check.** ⭐⭐⭐ Keeps the salvaged line (**reality-as-taught is the inspiration library**) and names the half it omitted: *"an experience **I have had in my life**"* — **a curriculum is not an experience anyone had**, so subject matter arrives for free and **feels like** inspiration. The textbook-shaped failure, finally named. ⭐⭐⭐ And the thesis is **measured, not asserted**, against a 45,000-file corpus: every memorable thing came from outside games, every forgettable thing from inside, and the seven-institution checklist city (81%→62%, then a cliff) **is the juggler with the ponytail — "it just looked dumb."** ⚠ Implicates its own method: the craft doc is the *"you can learn a lot that way"* half and cannot be anything else. |
| **2 · Expression · 3b** | ✅ [`86-character-function.md`](./86-character-function.md) | ⭐ Casting, not staffing — and **casting happens three times** (code · content · runtime). We built the pass-2 machinery and skipped the craft: the save gate knows *legal*, never *good*. The prize is **dramatic predicates** — his against-type casting made declarative, and per-player. |
| **2 · Expression** | ✅ [`31-action.md`](./31-action.md) | The sharpest attack in the book on our medium — text adventures died because *for every hundred verbs there were thousands they did not have.* ⭐ **His parser's vocabulary was hidden; ours is data** — affordance, refusal, prompting, the collision ladder, an LLM front-end. Adopts the **basic:strategic ratio** question. |
| **2 · Expression · 3a** | ✅ [`79-freedom.md`](./79-freedom.md) | ⭐ **Freedom here is a political question in a design question's clothes.** Two regimes — a sandbox that is maximal and a shared world the polity grants — and exactly one platform-level class, the wizard flag. |
| **2 · Expression · 3a** | ✅ [`62-transparency.md`](./62-transparency.md) | ⭐⭐⭐ His transparency test is *linguistic* — the player says *“I ran up the hill”*, never *“I pressed the red button”* — and **in a text game the player's sentence and the game's sentence are the same sentence.** We do not earn projection; the input is already first-person. ⚠⚠ With a measurable boundary: **the verb is diegetic, the syntax is not**, so every flag and sigil is transparency spent. ⭐⭐⭐ Answers Tufte by splitting what he conflates — **chrome should vanish, vocabulary should become fluent** — and the chrome half is enforced *in the protocol*: **no interface appears that you did not ask for**, guaranteed by a missing wire field. ⚠⚠ Q5 is the real exposure: combat's tempo is emergent, so the clock runs while you type; the answer is **move the input out of the pressure window** (gambits, terms, formations). ⭐⭐⭐ And the verdict generalises past the interface: **his transparency is opacity you stop noticing; ours is the absence of opacity** — interface, model, measurements, content, code, spoilers and roles are seven layers of one property, and **the Compact is why** (*a constitution over people who cannot see what they govern is theatre*). ⚠⚠ With one deliberate exception: **the schema is public, the token is private** — A15's evidence firewall and honest fog keep the *fiction's* secrets. |
| **2 · Expression · 1** | ✅ [`66-channels-and-dimensions.md`](./66-channels-and-dimensions.md) | ⭐⭐⭐ *"Choosing how to map game information to channels and dimensions is **the heart of designing your game interface**."* The first instrument aimed at **rendering** rather than authoring — and **we are the inverse of his assumption**: he has many channels with few dimensions each, we have one medium, so almost every interface decision is a **dimension** decision. ⭐⭐⭐ **The article carries the ontology** (the two identity rungs are *defined* by `the` vs `a`, hand-encoded 611 times before it was a field); **scales are rendering choices, not type distinctions** — *the engine refuses to fork the type system on vocabulary preference*; and the rule the docs lacked: **a real unit is a falsifiable precision claim, a point is not.** ⚠ His too-many-dimensions warning is our standing condition. |
| **1 · Pedagogy** | ✅ [`65-primality.md`](./65-primality.md) | ⭐⭐⭐ The only lens in the deck that argues **against** what lens 1 is for. By his test — *is it something an animal could do* — **reading scores zero**, and he is right. But **primality is the enemy of pedagogy**: he wants the neocortex out of the loop and we exist to exercise it. ⭐⭐⭐ The alternative, in his own vocabulary and already in our docs: **the simulation is foundational, primality is decorational** — we shipped the *least* primal client first and a primal one is a **port**, which is what A8 buys. ⚠ *The model ports; the interaction does not.* And it is the third argument for the `SaxonbergClient` split. |
| **2 · Expression · 1 · Pedagogy** | ✅ [`28-the-state-machine.md`](./28-the-state-machine.md) | ⭐⭐⭐ **His lens is a designer's private instrument; here it is a player-facing surface** — the inspection card renders the object's mixin composition as chips and the source calls it *a teaching surface*, so *is the world derivable* has a literal implementation. ⭐⭐⭐ **The vocabulary is public, an instance's composition is perceptual, and the withholding is invisible** (filtering means deletion; a concealed mixin is absent, never flagged) — and the composition is **itself derived per viewer**, so his frame has neither a time nor an observer dimension. The **structural** half of `93` — not *can an author make something with the quality* but **is the substrate telling the truth about what its objects are.** ⚠⚠ Carries the one piece of advice in the deck that is wrong for this artifact: *"the right way to think about something is whichever way is most useful **at the moment**"* — which has no time dimension, and **the god class is that rule iterated.** ⭐⭐⭐ Names the vocabulary A3 needs and Schell lacks: an attribute has a **provenance** (authored · stamped · derived), so *what are its possible states* presumes a stored state a derived attribute does not have, and *what triggers the change* is **that you looked.** ⭐⭐⭐ And it writes the **`bands-not-theta`** warrant [`55`](./55-visible-progress.md) asked for. |
| **2 · Expression · 3a** | ✅ [`93-the-nameless-quality.md`](./93-the-nameless-quality.md) | ⭐ Not *does the world feel alive* — **can an author make something that does, or does the substrate prevent them?** The aesthetic half of the narrowing argument; *not-separateness* as 3a's positive form; charm as a budget denominated in carves. |

⛔ **`92-inner-contradiction.md` — written 2026-09-29, deleted the same
day.** It earned its roster slot on one finding (*nine ledgers, only the
rendering refused*), and that finding was **resolved by the
`measurement.md` amendment before the entry was written** — so the entry
backfilled a general audit to justify the slot. ⭐ By this directory's
own bar — *something concrete to say **today*** — that is a fail, and
keeping it because the writing was decent is exactly the drift the
restart was for. Recoverable from git; the reasoning is in
[design-lenses-revision-proposal.md](../design-lenses-revision-proposal.md)
§ Q1.

⭐ **Write `46` · `55` · `91` together even though they are three
files** — they are one argument seen three ways, and the levelling
conversation is what they are for. Same for `25` + `37`, and `31` +
`79`, which share one answer.

**Second rank — real, not urgent:** `95h-cheatability.md` (⭐ promoted 2026-09-29 — [`33`](./33-rules.md) asks to pair with it, and its claim that *the belief a game is cheatable destroys endogenous value even when false* is the general form of the wizard-asymmetry problem [`37`](./37-fairness.md) answered constitutionally; it also sits in the same section of the book as `33`) · `26-functional-space.md` and `32-goals.md` (the two remaining mechanics lenses; `26` wants a claim that our six spatial representations are one model, which nobody has checked) · `90-status.md` (Keith Johnstone's
improv status — the one genuinely unused lens with real pull on the NPC
and LLM work) · `34-skill.md` and `48-simplicity-complexity.md` (much of
both is now inside lens 1) · `66-channels-and-dimensions.md` with
`94-atmosphere.md` (lenses 2 and 3a just claimed that ground).

⛔ **Judged not worth entries:** #104 Technology (it is the
*developer's* technology choices, not the fiction's), #106 Utopia, #96
Friendship, #8 Problem Solving (its value was the transfer warrant,
which now lives in lens 1 where it belongs), #84 The World (a
*transmedia* lens — the retired entry cited it for worldbuilding
coherence, which is not what it says).

## ⚠⚠ Coverage — the holes this roster has

The roster was chosen by **what the audit happened to surface**. Once
the entries are cross-referenced from the docs an agent actually reads,
the better question is **what will someone need when they are working
here** — and by that measure the coverage is uneven.

**By rubric lens** ([design-lenses.md](../design-lenses.md) § The
borrowed instruments has the full table): **lenses 1, 5 and 6 have no
instrument at all**, and 3b has one. Lens 5's emptiness is a fact about
the deck — nothing in 116 lenses asks whether a mechanism survives an
epoch. Lens 1's and lens 6's are holes we could fill.

**By design area** — where an agent is actually working when they need
one:

| working on… | candidate | have it? |
|---|---|---|
| activities · scheduler · contracts · quests | **#27 Time** | ✅ |
| the economy | **#7 Endogenous Value** ✅ · #52 Economy | ✅ |
| combat · trade difficulty | **#21 Flow**, #38 Challenge | ⛔ |
| the response envelope · messaging | **#63 Feedback** ✅ · **#64 Juiciness** ✅ | ✅ — [`63`](./63-feedback.md) finds the envelope serves *instruction* superbly and *encouragement* not at all; [`64`](./64-juiciness.md) finds the simulation has plenty of good news and **no voice** |
| the cockpit · cards · client | **#66 Channels and Dimensions** ✅ · **#62 Transparency** ✅ | ✅ — [`66`](./66-channels-and-dimensions.md) is what the interface carries, [`62`](./62-transparency.md) is how much of it a player should have to notice |
| NPCs · behaviour · dialogue | **#90 Status** | ⛔ |
| onboarding · char-gen | **#19 The Player**, #69 Interest Curve | ⛔ — though [`17`](./17-the-toy.md) owns the *first thirty seconds* half of it |
| backing classes · mixins · what an object IS | **#28 The State Machine** | ✅ — [`28`](./28-the-state-machine.md); pairs with [`93`](./93-the-nameless-quality.md) |
| the simulation itself | **#30 Emergence** | ✅ — [`30`](./30-emergence.md), which also carries the **positive** test for when to simulate at all |
| moderation · law · the tiers | **#33 Rules** ✅ · #99 Griefing ⛔ | ✅ — [`33`](./33-rules.md) covers enforcement, remedy and the advisory test; #99 still owns griefing itself |

⚠ **Several of those were entries, and were deleted in the restart.**
That was right — they had rotted against content — but it left a hole
this framing makes visible. Rewriting one against the rubric is a
different act from having kept the stale one.

⭐ **And the seam worth mining:** the **game-mechanics chapter** is the
most systematic thing in the book — *space · time · objects · actions ·
rules*, each with its own lens — and we have taken exactly one of them
([#31](./31-action.md)). It decomposes by what an engine actually has,
which is why its lenses land where agents work.

### Where the entries are cross-referenced from

⭐ **An entry nobody links to is dead weight**, so the back-pointers are
part of the deck rather than a nicety. **Fourteen docs** now point in,
placed only where an entry makes a *substantive claim* about that doc:

- **the rubric** — [design-lenses.md](../design-lenses.md) § *The
  borrowed instruments*, which is the index an agent running a pass hits
- **doctrine** — [measurement.md](../measurement.md) (seven entries) ·
  [uncertainty.md](../uncertainty.md) ·
  [governance/draft-constitution.md](../governance/draft-constitution.md) ·
  [subsystems/sandbox.md](../subsystems/sandbox.md)
- **subsystems** — `employment` · `command-spec` · `combat` ·
  `exertion` · `mortality`
- **advancement** — [subsystems/advancement.md](../subsystems/advancement.md),
  which gains the `bands-not-theta` argument
- **the register** — [vocations.md](../vocations.md), whose **chain walk**
  turns out to be the emergence generator
- **messaging** — [positioning.md](../positioning.md), for the synthesis
  claim
- **slates** — `quest-modeling` · `base-class-narrowing` · `lineage` ·
  `alignment` · `prison` · `enforcement` · `field-substrate`

⚠ The list is short **because the entries are anchored to the rubric
rather than to content**, which is the rule this restart adopted. The
consequence is recorded in the coverage table above: an agent working on
messaging, the cockpit, NPCs or moderation still has no lens pointing at
their area.

## On the book and the citations

His lens cards and his prose are his own and are not reproduced here.
What an entry does:

- **Name** the lens and **paraphrase its questions** in our own words.
- Where the book offers something beyond the bare question — a reframe,
  a principle, a worked example — carry it in a short **"From the
  book"** callout that quotes Schell's actual words and attributes the
  rest. Most people have not read it; the callouts are how its wisdom
  travels.
- **Footnote** the lens by number and name, with its 3rd-edition page
  and chapter. Where an entry's title groups several of his lenses, the
  footnote says so.

None of this substitutes for the book.

## How to read an entry

1. **The lens** — named, its questions paraphrased.
2. **Which of our seven it sharpens** — and whether it sharpens the
   test, the failure list, or the worked example. ⭐ New requirement;
   an entry that cannot answer it does not belong here.
3. ⚠⚠ **At what altitude** — and there are **three**, not two.
   Schell's deck assumes one designer, one artifact, one set of values,
   so **every one of his questions arrives pitched at a title** and has
   to be re-aimed before a platform can answer it.

   | | binds | may be ignored by |
   |---|---|---|
   | **invariant** | every game built here | nobody |
   | ⭐⭐ **the grain** | nothing — but the substrate is *for* this | any author, at a cost |
   | **this title** | one game | anyone else, freely |

   ⭐⭐⭐ **The middle one is where most of the design's values live, and
   an entry that omits it is worse than one that mis-levels.** ⚠ Do not
   retreat into neutrality to avoid the question — answer **as if
   building the game the platform is for**, then say which answers are
   the grain rather than the law.

   ⭐ **Graduated 2026-09-29 to
   [design-lenses.md § Every answer has an altitude](../design-lenses.md)**,
   which is now the statement of record; it was found here, by writing
   entries that kept getting it wrong.
4. **Why our design prompts it** — the specific tension that makes
   *this* lens worth pointing at *this* game.
5. **What the design answers** — with citations to the rubric and the
   subsystem docs.
6. **Tensions & risks** — where the lens exposes a soft spot.
7. **The verdict** — ⭐⭐ **required.** Schell is confronting a real
   design with real problems, so say which of three this is:
   **adopt** (he is right and we are not doing it), **push back** (the
   lens's demand is already met, or met better, and here is how), or
   **an alternative** (the problem is real, his answer is not ours,
   here is what is). ⚠ A doc's prohibition *can* be lifted — "it
   contradicts a rule we wrote" is not an argument on its own.
8. **Implications** — the decisions or work it generates. The payoff.
   If a lens surfaces nothing to *do*, it does not belong.

⚠ **If an entry only admires the design, it failed.**
