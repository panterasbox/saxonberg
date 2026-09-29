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
which read the full Table of Lenses — 113 lenses plus the unnumbered
*Lens of Your Secret Purpose* — and 19 cards in their own words.
✅ **Written: `46` · `55` · `91` · `25` · `37` · `86` · `31` · `79` ·
`93`** (2026-09-29). Pending: `92`.

| Sharpens | Entry | What it is for |
|---|---|---|
| **4 · Values** | ✅ [`46-reward.md`](./46-reward.md) | ⭐ The refusal of variable-ratio reward, stated as a cost we have not paid: XP arrives **unbidden**, the mirror only on **pull**. |
| **4 · Values** | ✅ [`55-visible-progress.md`](./55-visible-progress.md) | It is a *puzzle* lens, and we do not ban it — the mirror answers it. `measurement.md` forbids **ambient** progress, not visible progress. |
| **4 · Values** | ✅ [`91-character-transformation.md`](./91-character-transformation.md) | The gap: we have an asset-accumulation story, not a character-change one. *"ARE"* is the ledger that is not online. |
| **7 · Governance** | ✅ [`25-judgment.md`](./25-judgment.md) | Lens 7's only antecedent in the deck — and it stops at *do players feel it is fair*. |
| **7 · Governance** | ✅ [`37-fairness.md`](./37-fairness.md) | Across 113 lenses **"fair" only ever means "even contest"** — the evidence lens 7 is unprecedented. ⚠ And the one contest we *do* have: wizards and players share a world, and the answer is constitutional, not technical. |
| **2 · Expression · 3b** | ✅ [`86-character-function.md`](./86-character-function.md) | ⭐ Casting, not staffing — and **casting happens three times** (code · content · runtime). We built the pass-2 machinery and skipped the craft: the save gate knows *legal*, never *good*. The prize is **dramatic predicates** — his against-type casting made declarative, and per-player. |
| **2 · Expression** | ✅ [`31-action.md`](./31-action.md) | The sharpest attack in the book on our medium — text adventures died because *for every hundred verbs there were thousands they did not have.* ⭐ **His parser's vocabulary was hidden; ours is data** — affordance, refusal, prompting, the collision ladder, an LLM front-end. Adopts the **basic:strategic ratio** question. |
| **2 · Expression · 3a** | ✅ [`79-freedom.md`](./79-freedom.md) | ⭐ **Freedom here is a political question in a design question's clothes.** Two regimes — a sandbox that is maximal and a shared world the polity grants — and exactly one platform-level class, the wizard flag. |
| **3a · Immersion** | ✅ [`93-the-nameless-quality.md`](./93-the-nameless-quality.md) | Alexander's *not-separateness* as the positive form of *the fiction cannot betray itself*; *roughness* as the open charm question. |
| **all seven** | `92-inner-contradiction.md` | The nine ledgers with only the rendering refused, against the warning not to get used to a contradiction or make excuses for it. |

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
3. **Why our design prompts it** — the specific tension that makes
   *this* lens worth pointing at *this* game.
4. **What the design answers** — with citations to the rubric and the
   subsystem docs.
5. **Tensions & risks** — where the lens exposes a soft spot.
6. **The verdict** — ⭐⭐ **required.** Schell is confronting a real
   design with real problems, so say which of three this is:
   **adopt** (he is right and we are not doing it), **push back** (the
   lens's demand is already met, or met better, and here is how), or
   **an alternative** (the problem is real, his answer is not ours,
   here is what is). ⚠ A doc's prohibition *can* be lifted — "it
   contradicts a rule we wrote" is not an argument on its own.
7. **Implications** — the decisions or work it generates. The payoff.
   If a lens surfaces nothing to *do*, it does not belong.

⚠ **If an entry only admires the design, it failed.**
