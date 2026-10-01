# #63 · The Lens of Feedback

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-fb]

## The lens

To check the loop at every instant: **what do players *need* to know at
this moment? What do they *want* to know? What do you want them to
*feel*, and what feedback creates that feeling? What do *they* want to
feel — and can they create a situation that produces it? What is their
goal, and what feedback moves them toward it?**

> **From the book.** The definition first, because it is a list and the
> list is the finding:
>
> *"The feedback a player gets from the game is many things: **judgment,
> reward, instruction, encouragement, and challenge.**"*
>
> ⭐⭐⭐ And the example is a mop. He walks the Swiffer's design problems,
> and the sixth is the one nobody would have written down:
>
> *"**Problem #6: The user gets little feedback about how well they have
> cleaned the floor.** Unless a floor is really dirty, it is hard to see
> whether your sweeping is making any difference just by looking at the
> floor. You might say, 'Who cares? All that matters is how well it
> cleans, right?' But this lack of feedback can make the entire task feel
> somewhat futile, which means that the user enjoys it less and **will
> clean their floor less often. In other words, less feedback = dirtier
> floor.**"*
>
> *"**Solution #6: The dirt you have removed from the floor is clearly
> visible on the cleaning cloth when you are done.** … This triggers all
> kinds of pleasures — satisfaction of having done something useful, the
> pleasure of purification… And though this feedback doesn't come until
> the end of the task, **the user comes to anticipate it** and looks
> forward to seeing this concrete evidence of a job well done."*

## Which of our seven it sharpens

**[Lens 4 · Values](../design-lenses.md)** and **lens 1**. It pairs
permanently with [#55 Visible Progress](./55-visible-progress.md) and
[#46 Reward](./46-reward.md) — and it is the entry that supplies the
*external* argument those two had to reason their way to.

## At what altitude

| answer | altitude |
|---|---|
| **A10** — the preview is the outcome; no hidden adjustment between what you were shown and what happened | **invariant** |
| feedback is **evidence of what changed**, never a verdict on the person | **invariant** — the no-gauge rule's positive form |
| a refusal names what would lift it | **invariant** ([#31](./31-action.md)) |
| the player may assemble their own feedback surface | ⭐⭐ **the grain** |
| how much affirmation a game offers | **this title's** |

## ⭐⭐⭐ The Swiffer settles an argument we had with ourselves

[#55](./55-visible-progress.md) is the entry where this design refused
ambient progress and answered with the mirror — and the objection that
forced `measurement.md`'s Part 6 amendment was the owner's own: *if you
work out every day you absolutely want to measure progress, even though
the act is completely routine.*

> ⭐⭐⭐ **The Swiffer cloth is that objection, proved in the physical
> world, by somebody selling mops. *Less feedback = dirtier floor.***
> Withholding evidence of progress does not purify the player. **It makes
> them do the thing less often.**

That is a far stronger argument than *players like numbers*, and it is
the one Part 6 rule 4 (*performance is readable, numerically and
routinely*) deserved and did not have. ⭐ It also explains the shape the
amendment took: the complaint was never about gauges, it was about
**futility**.

### ⭐⭐⭐ And the form is the whole lesson

Look at what the Swiffer actually shows you. **Not a cleanliness score.
Not a star rating. The dirt.** The thing you removed, made visible,
with no verdict attached.

> ⭐⭐⭐ **The Swiffer does not gauge you. It shows you the dirt.** That is
> the no-gauge rule's **positive form**, and Schell found it in a mop:
> feedback may be as rich and as routine as you like, as long as it is
> **evidence of what changed** rather than **a judgment of who you are.**

Which is exactly what the tree already does in its best places and has
never generalised: `look`'s body line in
[exertion.md](../subsystems/exertion.md) (*reach as a body read, never a
number*), the mirror's routine-qualitative mode, bands rather than
decimals, a deed written to the chronicle. **All Swiffer-shaped.** None
of them described as feedback.

## ⭐⭐⭐ Of his five jobs, we have doctrine for four

*Judgment, reward, instruction, encouragement, and challenge.*

| job | ours |
|---|---|
| **judgment** | [#25](./25-judgment.md), lens 7 — criterion, appeal, entrenchment tier |
| **reward** | [#46](./46-reward.md), **B5** — no variable-ratio reinforcement |
| **instruction** | [#31](./31-action.md) — *the refusal is the progression UI*; a decline names what lifts it |
| **challenge** | combat, the Disciplines, lens 1 |
| **encouragement** | ⚠ **doctrine exists — in three docs, none of which is the one a feature author reads.** See below |

> ⭐⭐⭐ **Encouragement is the one of the five with no doctrine in the
> platform docs — and it is the one the Swiffer is actually about.**

And the reason is traceable rather than careless: **every rule we wrote
about affirmation was written to kill a manipulation.** B5 kills variable
reward. The no-gauge rule kills the score. The refusal of ambient
progress kills the drip. Each is right. **Together they read as though
they removed the category along with the abuse.**

### ⭐⭐⭐ Except the positive doctrine DOES exist — in the wrong three docs

Corrected 2026-09-30 after the owner pointed at the study.com papers. The
principle is written, three times, and **never in `measurement.md`**:

- [advancement-slate](../slates/builds/advancement-slate.md) names the
  psychology: *“it defuses the headline edtech risk the motivation lens
  names — **overjustification** — because the reward is **capability you
  chose to build**, not a carrot dangled for studying.”*
- [adaptive-feed.md](../study-com/adaptive-feed.md) carries it as a
  standing guard: *“keep verifying the reward is **chosen capability, not
  a carrot**… the feed reports what happened; **it never asks the learner
  to play in order to be diagnosed**.”*
- [engagement-and-positioning.md](../study-com/engagement-and-positioning.md)
  has the diagnosis of the whole category, and it is the best sentence in
  the tree on this subject: *“Gamification didn't fail because the idea
  was wrong. It failed because **everyone shipped the scoreboard and
  skipped the game** — and nobody hired a game designer.”*

> ⭐⭐⭐ **So the hole is not an absence, it is a MISFILING** — and a
> worse one. `measurement.md` holds every prohibition; the permission
> lives in a **slate** (retired at sweep time) and in **vertical pitch
> documents** that no feature author opens. A rule that only exists where
> nobody looks is the same as a rule that does not exist, and it is
> *harder* to notice.

⚠ It also traces to a casualty of the restart. The slate credits *“the
motivation lens's standing warning”* — **#23 Motivation, one of the 29
entries deleted in the 2026-09-29 restart.** The positive doctrine's home
was a lens entry, and the restart removed it without rehoming the
content. ([lens-deck-salvage.md](../lens-deck-salvage.md) kept the slate
checklist and the essence sentences; it did not keep this.)

### ⛔ And a dangling citation, twice

Both [adaptive-feed.md](../study-com/adaptive-feed.md) and
[integration.md](../study-com/integration.md) cite the guard as
**`advancement.md:800-802`**. `advancement.md` is **610 lines** and the
word *overjustification* appears in it **nowhere**. The guard is in the
*slate*, not the subsystem doc.

⚠ Same defect class as the stale note [#28](./28-the-state-machine.md)
found in `card-surface.md`: **a confident citation to a line range that
does not exist**, which reads as authority and sends the reader nowhere.

## ⭐⭐⭐ Two permitted shapes, from a product that already does this

The owner's answer to the gap is **StudyWorld**, and the two mechanisms
worth borrowing are observations of the live study.com product rather
than anything in the papers. ⚠ Noted because no deal is inked — the
mechanisms are worth having whether or not that relationship happens.

**1 · Confetti on course completion.** Terminal, earned, tied to a real
finish. It is **not** variable-ratio (B5 is untouched), not a gauge, and
not a drip — and it is exactly the **anticipation** shape this entry
flagged as missing: the Swiffer's payoff *arrives at the end* and the
user learns to look forward to it.

**2 · “Quick wins” → “deep learning.”** Test prep groups your topics by
how much competency you have already demonstrated — and **it is never
“you suck at this one.”** The *measurement does not change*; the **label
faces forward.**

> ⭐⭐⭐ **That is the Swiffer rule applied to a deficit, and the mechanism
> for it already ships.** It is
> [#66](./66-channels-and-dimensions.md)'s `Quantity.tag()` with a second
> **scale**: *“scales are RENDERING choices, not type distinctions — the
> same instance can render with EITHER scale at the call site.”* A
> competency band could carry a **descriptive** vocabulary (*novice*) and
> a **path** vocabulary (*a quick win*), one value, two renderings, and
> the engine refusing to fork the type.
>
> It violates nothing: same band (not a gauge), deterministic (not
> variable-ratio), and it **names the next step** — which is
> [#31](./31-action.md)'s *a refusal says what would lift it* and
> [#25](./25-judgment.md)'s fifth question (*does the judgment make them
> want to improve*) answered in the same move.

### ⭐⭐ And the project's own falsifiable test is already written

[engagement-and-positioning.md](../study-com/engagement-and-positioning.md)'s
**anti-pointsification test**:

> *“A scoreboard can't support a livelihood; a badge can't feed you. **If
> a player can sustain themselves financially by teaching in an honest
> in-game economy, that is falsifiable proof the motivation is intrinsic
> and the knowledge has real value**.”*

⭐ That is the strongest answer available to *“isn't encouragement just
gamification?”*, and it belongs beside B5 rather than in a pitch deck.

### ⚠ Why the Wikipedia counterfactual matters here

The same paper's skeptic question is *“couldn't you build a learning world
for free on top of Wikipedia?”* and the answer names the layers that make
feedback possible at all: **Study's taxonomy is DBpedia-derived — the raw
information layer really is close to Wikipedia** — and what sits on top is
*curriculum, assessment, **mastery models**, credentials, and the
organization that maintains them.*

> ⭐⭐ **You cannot give good feedback about learning without a model of
> what the learner knows.** *“StudyWorld knows education, not just
> information.”* Which is why this entry's hole and lens 1's hole
> (*nothing measures understanding*) are the same hole seen from two
> sides: **encouragement needs something true to encourage about.**

### ⛔ The proof is in the type system

`packages/types`' `Note` union is **29 members**, and they sort like
this:

- **16 typed failures** — `controller-rejected`, `validator-failed`,
  `target-declined`, `mixin-missing`, `locomotion-gate-failed`,
  `slot-occupied`, `pace-broken`, `quantity-clamped`, `empty-result`,
  `match-ambiguous`, `candidates-filtered`, `mql-error`,
  `command-rejected`, `wiki-edit-conflict`,
  `quantity-clamped-rejected`, `controller-error` — **each carrying a
  `reason` or a `detail`**, because [#31](./31-action.md)'s doctrine
  demanded that a refusal say what would lift it.
- **9 prompt kinds**, 3 engagement-lifecycle kinds, 1 registry scan.

> ⛔⛔ **And `EngagementCompletedNote` — the one note in the vocabulary
> that says *a thing you were doing has finished* — is
> `{ kind, engagementId }`. An identifier and nothing else. No outcome,
> no result, no evidence.**
>
> ⭐⭐⭐ **We type our bad news richly and our good news not at all.**
> Nothing ever demanded of success what `31` demanded of refusal.

That is the concrete, mechanical form of the encouragement hole, and the
Swiffer says exactly what belongs in the gap: **not a verdict — the
dirt.** `engagement-completed` should be able to carry *what changed*.

## Q4 · The player can build their own loop

*"What do the players want to feel at this moment? Is there an
opportunity for them to **create a situation** where they will feel
that?"* is asked as a design question, and we have an unusual structural
answer: **the player assembles their own feedback surface.** The cockpit
and its arrangements, pinned cards, live MQL subscriptions,
[notify](../subsystems/social-graph.md) policy, `watch`.

⭐ So *what do players want to know at this moment* is not a question we
have to answer once, globally. It is a question the player answers,
repeatedly, and the design's job is to make the materials available —
which is [#66](./66-channels-and-dimensions.md)'s dimension inventory
read as a feedback kit.

## ⭐⭐ A10 is feedback honesty at the top tier

*"**The preview is the outcome.** No hidden adjustment, no fudge, no
thumb on the scale."* Schell's loop assumes the designer controls the
mapping between what the player is shown and what the game then does; A10
**forbids a gap there at all**, as an eternity clause, and `analyze`
preview-parity is the enforcement.

⭐ Worth noticing how rare that is. Most games tune the gap deliberately
— the near-miss, the generous hitbox, the last-hit-point mercy. **We
cannot**, and this lens is the place that cost gets recorded: *we give up
the entire craft of flattering feedback.*

## The verdict

⭐⭐⭐ **Adopt, and adopt the five-job list as a checklist.**

The list is the lens's real gift: it catches a gap that no amount of
internal reasoning found, because every internal argument was about
whether a *particular* affirmation mechanism was manipulative, and the
answer was usually yes. **Nobody asked whether the category had survived.**

⭐⭐ And the Swiffer gives the rule that lets us re-enter it without
re-opening the door B5 closed: **evidence, not praise. Show the dirt,
never the score.**

## Tensions & risks

⚠⚠ **A game with judgment, instruction and challenge and no
encouragement is an exam.** That is an uncomfortable description of this
design's feedback posture as currently built, and it is the honest
reading of the table above. For a platform whose product is *learning*,
being mistakable for an exam is a specific and serious risk.

⚠⚠ **"Less feedback = dirtier floor" generalises to the economy.** If
evidence of progress drives how often somebody does the thing, then the
trades with the thinnest feedback will be the least practised — and
nothing measures which those are. ⭐ The gym pattern would see it, which
is the **sixth** ask for it.

⚠ **A10 forecloses the standard repertoire.** Every softening a
designer normally reaches for is a thumb on the scale. The compensation
has to come from *richer honest evidence* rather than from kindness, and
that is harder.

⚠ **Anticipation is a mechanism we do not have.** Schell notes the
Swiffer's feedback *arrives at the end* and the user **learns to look
forward to it.** Deferred, reliable, earned payoff is a legitimate
encouragement shape that is not variable-ratio and not a gauge — and
nothing in the design uses it deliberately.

## Implications

1. ⭐⭐⭐ **Rehome the encouragement doctrine into `measurement.md`.** It
   exists — *the reward is **chosen capability**, not a carrot*, plus the
   **overjustification guard** and the **anti-pointsification test** — and
   it lives in a slate and two vertical pitch docs. Every prohibition is
   in `measurement.md`; the one permission is not. ⛔ **And fix the
   dangling citation**: two docs point at `advancement.md:800-802` for a
   guard that is in `advancement-slate.md`, in a 610-line file that never
   mentions it.
2. ⭐⭐⭐ **Build the second scale.** *“Quick wins” → “deep learning”* is
   a **path** vocabulary over the same competency band, and
   `Quantity.tag(scale)` already does exactly this
   ([#66](./66-channels-and-dimensions.md)). Same value, two renderings,
   no new concept, and **never “you suck at this one.”**
3. ⭐⭐⭐ **Give `engagement-completed` a payload.** It is the one note
   that can carry evidence of work done, and it carries an id. The
   Swiffer rule says what goes in it: *what changed*, not *how you did*.
4. ⭐⭐ **Write the Swiffer rule into the rubric** — **evidence, not praise;
   show the dirt, never the score** — in `measurement.md` beside the
   no-gauge rules, as the thing those rules permit rather than a fifth
   thing they forbid.
5. ⭐⭐ **Run the five-job checklist over the response envelope.**
   Judgment, reward, instruction, encouragement, challenge: the envelope
   serves instruction superbly and encouragement not at all.
6. ⭐ **Name the Swiffer-shaped feedback we already ship** — the body
   line, the mirror's routine mode, bands, the chronicle deed — as
   instances of one principle. They read as four unrelated features.
7. ✅ **Deferred-and-reliable is a permitted shape, and confetti is the
   proof.** Terminal, earned, tied to a real completion — not
   variable-ratio, not a gauge, and it is the Swiffer's actual
   psychology. [#46](./46-reward.md) ruled out the manipulation; **this
   is not it**, and nothing in the design has to change to allow it.
8. **Pair permanently with [#55](./55-visible-progress.md) and
   [#46](./46-reward.md).** `46` says what we refuse, `55` says what we
   answer with, and `63` says **what the refusal costs when it takes the
   category with it.**

[^aogd-fb]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #63, the Lens of Feedback**
    (≈ pp. 277–278), from the interface chapter, in the
    loop-of-interaction section. The five-job definition, the Swiffer
    walkthrough including *"less feedback = dirtier floor"*, and the
    five questions are Schell's; all analysis ours. Read from the
    author's Google Play edition, 2026-09.
