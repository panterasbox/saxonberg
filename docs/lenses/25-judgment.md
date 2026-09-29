# #25 · The Lens of Judgment

> One of the [Schell deck](./README.md). Lens named from *A Book of
> Lenses*; questions paraphrased, analysis our own.[^aogd-ju]

## The lens

To decide whether your game is a good judge of its players: **what does
it judge about them? How does it communicate that judgment? Do they
feel it is fair? Do they care about it? And does the judgment make them
want to improve?**

> **From the book.** The passage that sets it up is the part worth
> carrying, because it cuts against the instinct most designers bring
> to this subject:
>
> *"…hate being judged? They don't—they only hate being judged
> **unfairly**. We have a deep inner need to know how we stack up. And
> when we aren't happy with how we are judged, we work hard until we are
> judged favorably. **The fact that games are excellent systems for
> objective judgment is one of their most appealing qualities.**"*
>
> The reading he recommends immediately afterwards is *Glued to Games*
> (self-determination theory) and Alfie Kohn's *Punished by Rewards* on
> the downsides of extrinsic reward — so the endorsement of judgment is
> not naïve about its misuse.

## Which of our seven it sharpens

**[Lens 7 · Governance](../design-lenses.md)** — of which it is the
**only antecedent in 113 lenses.** Secondarily lens 4, where standing
is conferred.

## Why our design prompts it

Because lens 7 exists at all. A great many mechanisms here decide
something *about a person* — who is hired, who is lent to, who is let a
room, who is admitted to a committee, whose content is published, who
is believed. Lens 7 was carved out of the economy lens precisely
because that class of decision kept being reviewed as though it were an
accounting question.

## ⭐⭐⭐ The Compact answers question one before the engine does

Schell asks *what does your game judge about the players*. Most games
answer with a list of mechanics. **Ours answers with a constitutional
allocation**, and it is the load-bearing fact of this entry:

> **What can be enforced by code, shall be enforced by code. The rest
> needs a person to judge.**

[draft-constitution.md](../governance/draft-constitution.md) §7 states
it as a principle of enforcement: *"Where the law is mechanically
applicable it shall be enforced by code — uniformly, automatically, and
without selective discretion. **Human enforcement is reserved for
matters of judgment and is always subject to review.** No power of
enforcement is arbitrary."* And Art. V §9 draws the far edge:
**administration — the judgment of how to run the polity — is never
automated.**

⭐⭐ **That is the third independent derivation of the same line.**
[Lens 4](../design-lenses.md) separates the decidable from the
undecidable; `measurement.md` separates measurement from valuation; the
constitution separates rule from standard. *Mechanically applicable* and
*decidable* are the same predicate, and the
[legal-code slate](../slates/builds/legal-code-slate.md) names the
jurisprudence it lands in — **rules versus standards**, where a clause
is self-executing and rigid and prose needs a judge. When three
different arguments reach one boundary, the boundary is probably real.

⭐ **And it answers the appeal at the right altitude.** Lens 7 asks each
feature to name its appeal, which is correct but incomplete: the general
appeal is **institutional**, not per-mechanism. Courts and executive
bodies exist because the constitution assumes *machines fail*, and the
recourse for a bad automatic judgment is a human one that is itself
subject to review.

## What the design answers

**Question one — *what does it judge?*** — has an unusually precise
answer, and it is a closed one. `measurement.md` separates the engine's
**measurement** from anybody's **valuation**, and B8 forbids the engine
from reading a valuation at all: it may ask *can you smith at this
level*, never *how good is this person*. So what the platform judges is
**domain-scoped and descriptive**, by construction.

**Question two — *how is it communicated?*** — is the refusal. A
criterion that never surfaces is a policy nobody can read; lens 7
requires the refusal to name the criterion and say what lifts it.

**Question five — *does it make them want to improve?*** — is where
lens 7 and this lens agree most exactly. *A bar that nothing lifts* is
already lens 7's named failure, and
[employment.md](../subsystems/employment.md)'s closed hiring vocabulary
is the strongest instance in the tree: `{ gigs, discipline, band }`,
every one of them **something a player can go and do.**

⭐ **The credit-default failure fails this lens on the fifth question
specifically.** A lending gate that counted defaults and refused anyone
above zero, over an append-only record, communicated its judgment
plainly and was in that narrow sense honest. What it could not do was
be *improved upon*: nothing a borrower did would ever move it. The
judgment was legible, fair-looking, and made improvement impossible —
which #25 catches and a purely procedural reading of lens 7 might not.

## The verdict

⭐⭐⭐ **Adopt the positive frame. Our governance writing is defensive,
and the thing it is defending against is one of the main attractions.**

Lens 7 is written entirely as damage control: *who can be wronged, on
what basis, can they answer.* Every failure mode is a harm. Read it
end to end and judgment is a hazard to be mitigated.

Schell says the opposite, and he is closer to right:

> **People do not resent being judged. They resent being judged badly.
> Being judged well — by something that actually knows — is one of the
> reasons to play.**

That is also the product — and ⭐ **the grain**: a game that judges
nobody is buildable here, but the standing architecture exists because
this platform is *for* games that judge people well, and that is a
preference worth stating rather than hiding behind neutrality.
Standing, conferral, a band
you earned, a
guild that vouches for you, a reputation that means something because
it was measured honestly — **the entire advancement and standing
architecture is a machine for judging people well**, and nowhere does
the rubric say so. Lens 4 asks *who confers standing* as a design
constraint; nothing says conferral is a thing players **want**.

⭐ **And question four — *do they care?* — is the monopoly question in
disguise**, which is a better framing than the one in `measurement.md`.
A judgment nobody cares about is inert and wasted. A judgment everybody
*must* care about is a monopoly, which is what B8 exists to prevent.
**The healthy zone is a judgment people care about because they chose
to trust its author** — which is exactly what plural raters produce and
a house score cannot.

## Tensions & risks

⚠⚠ **"Do players feel the judgment is fair" is not checkable, and ours
deliberately replaces it.** Lens 7 asks for a criterion and an appeal
because feelings cannot be reviewed and a criterion can. That is the
right trade for a design review — but it is a *substitution*, and it
means **nothing in our process ever asks whether a judgment lands as
fair.** A perfectly documented criterion with a working appeal can
still feel arbitrary to the person it refuses, and we would not find
out.

⚠ **Domain-scoped judgment is harder to care about.** B8's benefit is
that the engine never asks *how good is this person*; the cost is that
the engine therefore never says anything about you **as a person**, and
that is the judgment people actually want. The design pushes that job
onto institutions — which is right, and which means **the polity's
raters are not a nice-to-have, they are the thing that makes the
judgment mean anything.** Until they exist, question four's answer is
probably *no*.

⚠ **The fifth question has no enforcement.** *Can a player act on
this?* is true of the hiring vocabulary because someone wrote a closed
list and a lint. Everywhere else it is a review habit.

## Implications

1. ⭐⭐⭐ **State the positive frame in the rubric.** Lens 7 should say
   that judging people well is a product, not only that judging them
   badly is a harm. The defensive framing is why the credit default
   read as a compliance miss rather than as the platform being bad at
   the thing it sells.
2. ⭐⭐ **Add "can the person act on this?" as a lint-shaped question
   wherever a criterion gates.** `lint:openings` demonstrates it is
   mechanisable for one vocabulary; the pattern is census-then-ratchet.
3. ⭐⭐ **Treat third-party raters as load-bearing, not ornamental.**
   Question four is answered by *whose* judgment it is. With no
   institutions, domain-scoped measurement is honest and cold.
4. ⚠ **Find a way to ask whether judgments land as fair.** It cannot be
   a design-review question, so it has to be a playtest one — the only
   place feeling is observable.
5. ⭐ **Cite the constitutional allocation wherever a feature is
   accused of over-automating.** *What can be enforced by code shall
   be; the rest needs a person* is the answer to "why is this
   mechanical" **and** to "why is this not" — and it is currently known
   to the manifesto and the constitution while being absent from the
   design rubric that reviews features.
6. **Pair permanently with [#37](./37-fairness.md)**, which is the
   negative half: what Schell's deck calls *fairness* is not this at
   all, and the gap is why lens 7 had to be invented — and which holds
   the one judgment problem no code can reach.

[^aogd-ju]: Jesse Schell, *The Art of Game Design: A Book of Lenses*,
    3rd ed. (CRC Press, 2020) — **Lens #25, the Lens of Judgment**
    (≈ p. 162), closing the chapter on the player's mind and its
    treatment of motivation. The five questions and the
    "judged unfairly / deep inner need to know how we stack up"
    passage are Schell's; all analysis ours. Read from the author's
    Google Play edition, 2026-09. Lens numbers are stable across
    editions.
