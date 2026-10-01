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
| **encouragement** | ⛔ **nothing.** The word appears nowhere in `measurement.md`, `response-envelope.md`, `advancement.md` or the rubric |

> ⭐⭐⭐ **Encouragement is the one of the five we have no doctrine for —
> and it is the one the Swiffer is actually about.**

And the reason is traceable rather than careless: **every rule we wrote
about affirmation was written to kill a manipulation.** B5 kills variable
reward. The no-gauge rule kills the score. The refusal of ambient
progress kills the drip. Each is right. **Together they removed the
category along with the abuse.**

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

1. ⭐⭐⭐ **Give `engagement-completed` a payload.** It is the one note
   that can carry evidence of work done, and it carries an id. The
   Swiffer rule says what goes in it: *what changed*, not *how you did*.
2. ⭐⭐⭐ **Write the encouragement rule down** — **evidence, not praise;
   show the dirt, never the score** — in `measurement.md` beside the
   no-gauge rules, as the thing those rules permit rather than a fifth
   thing they forbid.
3. ⭐⭐ **Run the five-job checklist over the response envelope.**
   Judgment, reward, instruction, encouragement, challenge: the envelope
   serves instruction superbly and encouragement not at all.
4. ⭐⭐ **Name the Swiffer-shaped feedback we already ship** — the body
   line, the mirror's routine mode, bands, the chronicle deed — as
   instances of one principle. They read as four unrelated features.
5. ⭐ **Consider deferred-and-reliable as a permitted shape.** It is not
   variable-ratio, not a gauge, and it is the Swiffer's actual
   psychology. [#46](./46-reward.md) ruled out the manipulation; this is
   not it.
6. **Pair permanently with [#55](./55-visible-progress.md) and
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
