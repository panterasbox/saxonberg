# Base-class narrowing slate — what a row composes, and what it uses

> **Status: UNBUILT** — nothing here exists. Template inheritance
> shipped 2026-09-25 and made this an order of magnitude cheaper, but
> did not touch it: a cohort's class is still stated on every child
> row, and the classes themselves are still wide.
> **Left:** name the 42 measured cohorts and give each a parent row ·
> narrow the base classes those parents name so a row composes only
> what it uses · decide the abstract-parent question (an abstract-row
> concept, or a narrower class to hang a bundle on) · retire the
> cross-class parents the costume cohort ships as a deliberate
> compromise
> **Size:** a build

> Written 2026-09-26 at the template-inheritance sweep, because the
> build's non-goals named "the next build" as this work's destination
> and there was no slate for it to land in. The measurements below are
> the build's, taken against the tree at `a5e7f4b87`.

See also:

- [templates.md § Inheritance](../../subsystems/templates.md) — the
  built mechanism this slate stands on.
- [legibility-slate](./legibility-slate.md) — Parts A and B, shipped;
  this is the work Part A's census pointed at and deliberately did not
  do.
- [architecture.md](../../architecture.md) — the `lib/` substrate rule
  and the concrete-twin splits, which is where a narrower base class
  has to fit.

---

## The two problems, and why they are one

**1. A cohort states its class on every row.** 42 cohorts of ≥3 sibling
rows share ≥3 identical fields, covering 210 rows. Since the
template-inheritance build a cohort *can* state its class once, on a
parent — but nothing has been migrated, because naming the parent and
naming the class are the same act and the second one was out of scope.

**2. The classes are wide.** A row composes whatever its class composes,
used or not. The question *what should this cohort's parent be called*
is not answerable without also asking *what class should this cohort
have*, which is why the build deferred both together rather than doing
the cheap half.

⭐ **The leverage is that the parent row is a place to put the answer.**
Before `extends:`, narrowing a class meant editing every row that named
it. Now a cohort has one row that names it.

## ⚠ The abstract-parent question, inherited from the build

The template-inheritance build shipped the tree's **first abstract
parent**, `/stuff/agent/costume/student`, and flagged it at its own row
as a known rough edge:

> Clone this row and a nameless, bodiless `Extra` stands in the room
> wearing a student outfit.

The slate that designed inheritance decided *a parent is an ordinary
row* on the strength of two exemplars that were objects a player can
hold — an empty can, an empty crate. A costume bundle is not one. The
build accepted it deliberately rather than pre-deciding the fix from
one cohort's evidence, and named this build as the decider. The two
candidate answers:

- **an abstract-row concept** — a row that may be extended and may not
  be cloned; or
- **a narrower base class** to hang a bundle on, so the parent is an
  ordinary row of an honest class.

⭐ The second is the one this slate's other half is already building
toward, which is the argument for deciding it here rather than
separately.

## ⚠ Cross-class parents are legal, and the gate is what makes them safe

D16 of the template-inheritance build kept cross-class parenting (every
dressed `Cast` row extends a row whose class is `Extra`) and gated the
harm instead: `check-instanceable-placement` invariant 12 refuses a data
key the effective class does not declare, on a census-then-ratchet
ceiling of **436**. That ceiling is the meter for this slate — narrowing
a class *raises* the orphan count if the narrowing is wrong, and every
cohort migrated correctly should let it fall.

## Consumers

Every authored row in the tree; the CMS and Studio field surfaces (a
narrower class is a shorter form); `lint:instanceable`'s placement
rules; the ground, costume and fixture cohorts first, because they are
the ones with parents already.
