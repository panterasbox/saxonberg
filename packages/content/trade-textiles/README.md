# `@saxonberg/content-trade-textiles`

Straw into cloth. Four stages, three verbs, and one lesson.

```
prepare ──▶ spin ──▶ fabricate ──▶ finish
   ▲                                  ▲
 retting is FLAX's instance      bleaching is LINEN's;
 of this stage, never its name   fulling is wool's
```

## ⭐ The chain begins at *fibre-exists-as-a-material*

`spin` takes a **fibre material**. Where that material came from — a
retting pit, a scouring vat, a gin, a retort — is upstream and none of
this pack's business. That one decision is what lets wool, cotton and
one day a synthetic plug into the same chain without a line changing
here. If the pit were the entry point, only flax would ever work.

The same rule for dyestuff: `dye` takes a dyestuff **material**, never a
crop. ⭐ That is the seam Perkin walks through — mauveine (1856) destroyed
madder and indigo agriculture in a generation, and for that ever to plug
in, the entry point has to be the material.

## ⚠ The stage is `prepare`, and retting is not its name

No controller, recipe id, category, doc heading or test name in this
pack treats "retting" as the name of a stage. Wool **scours**, cotton
**gins**, silk **reels**; each arrives later as its own `FermentProfile`
over its own material. Likewise the finishing stage: bleaching is
linen's instance, fulling is wool's, and **`full` does not ship** —
fulling works because wool scales interlock, linen cannot be fulled, and
the same scales are why plant fibres do not felt at all.

The `felted` fabric row ships **unreachable** (the `chalcopyrite`
precedent) so the vocabulary is honest rather than a promise in prose.

## ⭐⭐ Spinning is the bottleneck — and the wheel does not fix it

The bench (`src/idea/cmd/textiles/__tests__/mill-throughput.bench.test.ts`)
reads the shipped dials and measures one bolt:

| | by hand | with the wheel |
|---|---|---|
| scutch | 0.33 h | 0.33 h |
| **spin** | **3 h** | **1 h** |
| weave | 0.5 h | 0.5 h |
| spin:weave | **6×** | **2×** |

Six is dead centre of the historical band — it took five to ten spinners
to keep one hand-loom weaver supplied. ⚠⚠ **The wheel therefore closes
the gap threefold and does NOT flip it**, and the bench says so rather
than the durations being fitted until it does. That is the history: the
wheel did not solve the spinning shortage. The machine that did was the
**jenny**, at eight spindles — and eight is the first thing that clears
a gap of six.

⚠ Retting is reported separately: ~14 game-days **elapsed**, zero
attended. A wait is not labour.

## Zero verbs where the world does the work

Preparation and finishing both ship with **no verb at all**.
`FermentingMixin` runs the pit's clock; the bleaching green is the same
shape applied to weather. What you do is judge the moment — and the pit
has a four-day grace before the rot goes into the cellulose and the
fibre is ruined for good.

## What the trade's three verbs decide

| verb | the decision |
|---|---|
| `scutch` | how hard to work it — purity against staple length |
| `spin` | the **yarn count**: how fine, and overreaching wastes stock |
| `weave` | weave density — yield against windproofing and wear |

⭐⭐ `spin` holds `hands` and leaves **`voice` free**. Spinning is the
step players repeat most, and a verb repeated thirty times is tedium —
but spinning was historically the *social* act, done in company,
talking. One slot decision turns the build's largest tedium risk into
its best social surface.

## ⭐ The pack ships its own construction forms

`sackcloth` and `fine-woven` are `/trade/textiles/idea/fabric/` rows.
`FabricCatalogue` harvests them by path infix across every root and the
kernel never learned they exist — **no kernel list edit anywhere**. And
they change nothing about combat: every textile form shares one kernel
resist profile, so content chooses the weave and the kernel decides that
cloth resists poorly.

## ⭐⭐ Cloth is a Glob, and dye lots fall out of the merge predicate

`ClothBolt.canMergeWith` narrows to also require a matching grade, form
and **dye application stack**.

> **Two bolts from different dye lots do not merge.**

**A master dyer's batches merge. A novice's do not.** Competence becomes
visible *in the inventory* — no gauge, no number, no readout — and
nobody designed it: it is what the predicate does when it meets an
application stack.

## The mill

At Wharfside, downstream of the bank, because retting stinks and a green
wants sun. ⭐ It does not retail — it produces and **consigns** through
the shipped `consigns` brain, so cloth reaches players in the general
store where they already shop.

⚠⚠ **Read the wage column: spinner 3, weaver 5.** The bottleneck job is
the worst-paid one. That is the uncomfortable historical fact and
precisely why mechanising spinning was so profitable and so disruptive.
**Do not "fix" it upward** — the wage table teaches the same lesson as
the bench, from a second direction.
