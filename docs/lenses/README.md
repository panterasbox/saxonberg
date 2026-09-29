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
✅ **Fourteen written** (2026-09-29): `2` · `7` · `17` · `25` · `27` ·
`31` · `37` · `46` · `55` · `79` · `86` · `91` · `93` · `110`. ⛔ **`92` was written and then deleted** —
see below.

| Sharpens | Entry | What it is for |
|---|---|---|
| **all seven** | ✅ [`2-essential-experience.md`](./2-essential-experience.md) | ⭐⭐⭐ The lens that asks what the seven are *for*. Two challenges — he assumes one game **and one kind of participant** (*player* where he means *consumer*; we have consumers, labour and capital). The seven reduce to **the world does not lie · what you do persists**, which the ratified head already says. And the engine/transmission split: *without the Compact, a world you can live in; with it, a world you can change.* |
| **4 · Values · 7** | ✅ [`110-transformation.md`](./110-transformation.md) | ⭐⭐⭐ Paired with **#111 Responsibility** (*Kipling's iron ring — "it doesn't come off"*). We are not holding the dial: **the incentives are pencil, not ink.** So **Tier A is the responsibility statement**, and the hedge is values *instantiated in content*. ⚠⚠ Carries the premise — *the game believes people are basically good* — and the case that defeats its filter: **the unfilterable harm is the one that motivated the project.** |
| **1 · Pedagogy · 2** | ✅ [`17-the-toy.md`](./17-the-toy.md) | ⭐⭐⭐ *GTA "was designed as a medium… a living, breathing city"* — the deck's own words for this project, and **we have already taken his braver way**. Q2 is the **enterability gap verbatim** (third sighting). And *GTA came from Pac-Man*: deriving the world may not oblige deriving the game. |
| **6 · Economy · 4** | ✅ [`7-endogenous-value.md`](./7-endogenous-value.md) | ⭐⭐ **The roulette test**: *if the game needs the credential to be worth playing, it is roulette.* His Q2 is one our doctrine forbids us answering. ⭐⭐⭐ And the Goodhart shape: **our best-instrumented value is the one we least want optimised, and the value we promise — understanding — is the least instrumented thing in the design.** |
| **6 · Economy · 3a** | ✅ [`27-time.md`](./27-time.md) | ⭐ **His chapter is about escaping time; ours about being subject to it** — rewind and speed-up refused, but ⭐ **the pause exists and is better than his**: *you cannot pause the world; the world agrees not to charge you for your absence.* Q1 unanswered — and untestable except **relatively**, which is a third ask for the gym pattern. |
| **4 · Values** | ✅ [`46-reward.md`](./46-reward.md) | ⭐ The refusal of variable-ratio reward, stated as a cost we have not paid: XP arrives **unbidden**, the mirror only on **pull**. |
| **4 · Values** | ✅ [`55-visible-progress.md`](./55-visible-progress.md) | It is a *puzzle* lens, and we do not ban it — the mirror answers it. `measurement.md` forbids **ambient** progress, not visible progress. |
| **4 · Values** | ✅ [`91-character-transformation.md`](./91-character-transformation.md) | The gap: we have an asset-accumulation story, not a character-change one. *"ARE"* is the ledger that is not online. |
| **7 · Governance** | ✅ [`25-judgment.md`](./25-judgment.md) | Lens 7's only antecedent in the deck — and it stops at *do players feel it is fair*. |
| **7 · Governance** | ✅ [`37-fairness.md`](./37-fairness.md) | Across 116 lenses **"fair" only ever means "even contest"** — the evidence lens 7 is unprecedented. ⚠ And the one contest we *do* have: wizards and players share a world, and the answer is constitutional, not technical. |
| **2 · Expression · 3b** | ✅ [`86-character-function.md`](./86-character-function.md) | ⭐ Casting, not staffing — and **casting happens three times** (code · content · runtime). We built the pass-2 machinery and skipped the craft: the save gate knows *legal*, never *good*. The prize is **dramatic predicates** — his against-type casting made declarative, and per-player. |
| **2 · Expression** | ✅ [`31-action.md`](./31-action.md) | The sharpest attack in the book on our medium — text adventures died because *for every hundred verbs there were thousands they did not have.* ⭐ **His parser's vocabulary was hidden; ours is data** — affordance, refusal, prompting, the collision ladder, an LLM front-end. Adopts the **basic:strategic ratio** question. |
| **2 · Expression · 3a** | ✅ [`79-freedom.md`](./79-freedom.md) | ⭐ **Freedom here is a political question in a design question's clothes.** Two regimes — a sandbox that is maximal and a shared world the polity grants — and exactly one platform-level class, the wizard flag. |
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

**Second rank — real, not urgent:** `90-status.md` (Keith Johnstone's
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
| the response envelope · messaging | **#63 Feedback**, #64 Juiciness | ⛔ |
| the cockpit · cards · client | **#62 Transparency**, #66 Channels | ⛔ |
| NPCs · behaviour · dialogue | **#90 Status** | ⛔ |
| onboarding · char-gen | **#19 The Player**, #69 Interest Curve | ⛔ — though [`17`](./17-the-toy.md) owns the *first thirty seconds* half of it |
| the simulation itself | **#30 Emergence** | ⛔ |
| moderation | **#99 Griefing** | ⛔ |

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
- **doctrine** — [measurement.md](../measurement.md) (six entries) ·
  [uncertainty.md](../uncertainty.md) ·
  [governance/draft-constitution.md](../governance/draft-constitution.md)
- **subsystems** — `employment` · `command-spec` · `combat` ·
  `exertion` · `mortality`
- **slates** — `quest-modeling` · `base-class-narrowing` · `lineage` ·
  `alignment`

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
