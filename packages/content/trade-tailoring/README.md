# `@saxonberg/content-trade-tailoring`

Cloth into clothes that fit a body.

## ⭐ `cut` is optimisation under waste

> **A pattern is a 2D solution to a 3D problem, and cloth is
> expensive.**

| | cloth | later |
|---|---|---|
| `--tight` | least | **no seam allowance** — it can never be let out |
| ordinary | middling | a little room |
| `--generous` | most | room to let out twice |

A bolt is **capital** (~480 minor, ~20 unskilled days), which is what
makes that bite: cutting generous on a coat costs real money against a
future you cannot see. **Offcuts** are the byproduct — patchwork,
quilting stock, rags — because a trade whose off-cuts vanish has stopped
being an economy.

## ⭐⭐ The retention loop, for free

`Creature.getMass()` moves with metabolism and girth is
`√(mass / stature)`, so **your clothes stop fitting when your body
changes** — with zero new mechanism. That turns tailoring from a
one-time purchase into a **recurring service**: letting out, taking in,
coming back. It is the retention loop the way recolouring is for dyeing,
and neither is a subscription bolted on: both are what the physics
already said.

⚠⚠ **`alter`'s ceiling is the seam allowance, because matter is
conserved.** Letting a coat out needs more cloth and there is none —
only what `cut` folded into the seams. ⭐ **Magic hits the identical
wall**: a spell cannot conjure matter, so a working might alter *faster*
and never *further*. The cleanest magic/craft interaction in the build,
and it needed no code.

## ⭐ The fitting is a scene

Being measured is an interaction with another character, and it is
*mechanically necessary* because a `cutTo` stamp needs a subject.
Neither of the other two trades has a beat like it.

⭐⭐ **The attendant lease IS the consent.** Being measured is another
person handling your body, so it needs agreement — and queueing and
being served *is* the agreement. No new consent mechanism.

`measure figure` is a **stanza** on the platform's shipped `measure`
view (the `measure strike` precedent), so the trade adds **zero verbs**
for it. And it is **free**: the loss-leader that fills the book.

## ⭐⭐ The book is a business asset

It sits on the counter and transfers with the shop. A tailor who quits
does not take the town's measurements; one who buys the shop inherits a
book of everyone who ever came in — which is how the trade really works
and what makes the shop worth more than its fixtures.

⚠ **Staleness is body-change, never a clock**, so the book carries no
timestamp at all:

```
staleness = |girth_now − girth_book| / girth_book
```

A stable body keeps a good entry forever; a changed one wants
re-measuring, which is a reason to come in — and a gift cut from an old
entry is a slightly-off gift rather than a broken one. **The craft's
value is in the upkeep, not the one-time act.**

⚠ It ships as an **object** rather than a document under the shop's
parcel, because `DOCUMENT_KINDS` is a closed kernel vocabulary a pack
may not extend. The object is the better fit anyway: "it transfers with
the shop" is more literally true of a ledger on the counter.

## The price ladder — derived from wages, not picked

`measure` free · alteration 20 · shirt 50 · trousers 60 · coat 200 ·
bespoke shirt 120 · bespoke coat 500.

A spinner on 3/hr earns 24 a day, so a stock coat is **~8 days of her
own labour** and a bespoke one is a month; a tailor on 6 clears it in
half that. Clothing is a serious purchase for the person who makes the
yarn — stratified, but not absurd. ⚠⚠ **The numbers move together or
not at all**; pulling one without the others breaks the consistency that
makes them teach anything.

## ⚠ The jerkin moved here, and it is still unmakeable

`leather-jerkin` left `trade-smithing`, where it never belonged: cutting
and sewing hide is the same act as cutting and sewing cloth. ⚠⚠ Its
`{category: hide}` input still has **no producer**, and that is
leatherwork's gap, not this build's. **Do not invent a hide faucet.**

## ⚠ No engine gauge from dress to regard

*Engine measures; subject values.* NPC reaction to dress lives in **one
demonstrator brain**, in this pack, where an author can disagree with
it — and what Vasca notices is **fit**, because fit is her trade.
