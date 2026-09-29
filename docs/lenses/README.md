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

## The roster, indexed by our lens

Chosen from the 2026-09-28 audit
([../design-lenses-revision-proposal.md](../design-lenses-revision-proposal.md)),
which read the full Table of Lenses — 113 lenses plus the unnumbered
*Lens of Your Secret Purpose* — and 19 cards in their own words.

| Sharpens | Entry | What it is for |
|---|---|---|
| 1 Pedagogy · 4 Values | **Progression** — #46 Reward · #55 Visible Progress · #91 Character Transformation | The refusal of variable-ratio reward and its unpaid price; push vs. pull; the character-change gap. ⭐ The levelling conversation's preparation. |
| 4 Values · 7 Governance | **Judgment** — #25 Judgment, with #37 Fairness as the negative | Lens 7's only antecedent — and the evidence that *being wronged outside a contest* has no lens in 113. |
| 3b Participation | **Character Function** — #86 | Positions as a runtime casting call; NPC/player interchangeability; the standing vacancy. |
| 2 Expression | **Action** — #31, with #79 Freedom | The text-adventure critique aimed straight at our medium, the command-palette rebuttal, *the refusal is the progression UI*, the door model. |
| 3a Immersion | **The Nameless Quality** — #93 | Not-separateness as the positive form of betrayal; roughness as the charm problem; the authored-vs-procedural question. |
| all | **Inner Contradiction** — #92 | The nine ledgers, and the warning against getting used to one. |

**Second rank — real, not urgent:** #34 Skill and #48
Simplicity/Complexity (much of both is now inside lens 1); #66 Channels
and Dimensions with #94 Atmosphere (lenses 2 and 3a just claimed that
ground); #90 Status — Keith Johnstone's improv status, genuinely unused
and squarely relevant to the NPC and LLM work.

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
6. **Implications** — the decisions or work it generates. The payoff.
   If a lens surfaces nothing to *do*, it does not belong.

⚠ **If an entry only admires the design, it failed.**
