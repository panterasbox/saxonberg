# Row composition slate — what `extends:` is actually doing, and why the next step is a measurement

> **Status: MEASURED, NOT READY — and the measurement says wait.**
> `extends:` shipped 2026-09-25 (legibility slate Parts A+B) and is in
> production on **68 of 1,972 rows**. ⭐⭐ Measured 2026-10-01: it is
> inheriting **one field** (`costume`), on **47 children of one parent**,
> and the repetition it was built to kill — `hydratorClass` on 1,528 rows
> — is **engine boilerplate the hydration build deletes at the source**.
> **Left:** ⭐⭐ fix `/stuff/agent/costume/student`, a modelling error that
> is cheap now and entrenches with every child (a wave, not gated on
> anything) · decide whether a row may be **abstract** (owed since
> 2026-09-24, deferred to a build that has since shipped) · ⏸ **a
> composition primitive — named value snippets a row includes — is
> PREMATURE and the data says so: three duplicated prose strings in the
> whole tree** · the three missing `inherit:` members (removal, deep
> object merge, and the prose case that is probably not an inheritance
> problem)
> **Size:** a wave now (the content fix + abstract rows) · a build later
> (composition), **gated on content volume, not on design readiness**

**Captured 2026-10-01**, in conversation after the Avatar family build,
when the question *"did we invent syntax that lets you override an
inherited value but reference the parent — `super.foo`?"* turned into a
measurement nobody had run.

**Provenance:**

> **User: "template inheritance is doing nothing for us right now. and
> yeah we probably do need some multiple inheritance or composition model
> for pulling in common snippets and composing them in a single template.
> but I dunno we have to look at the data. remember when we ran our eotl
> survey we found that compared to gnomelands our content is really
> underdescribed. that means the payoff of inheritance is gonna be
> limited."**

> **User, on the one abstract parent in the tree: "that costume/student
> thing is probably the agent doing a survey of what should use
> inheritance and doing a really really poor job of encapsulating and
> typing the abstractions. when we did the subclass narrowing refactor it
> took me like three tries to get the agent to mint the class specificity
> I actually wanted."**

**Sits on:** [legibility-slate](./legibility-slate.md) (owns `extends:`;
Parts A+B shipped, its own open questions on merge semantics stay there)
· [templates.md § Inheritance](../../subsystems/templates.md) ·
[eotl-census.md](../../eotl-census.md) (the ancestor's density, and the
inverse-correlation finding pointed at us) ·
[base-class-narrowing-slate](./base-class-narrowing-slate.md) (the
class-side version of the same failure, shipped MR !303) ·
`docs/slates/builds/hydration-framework-slate.md` (deletes 1,528 of the
repeated lines `extends:` was built to absorb).

---

## What shipped, stated exactly

`FieldMetaEntry.inherit`, four values, declared by the field's **owner**
and never by the child row:

| rule | what it does | declared by |
|---|---|---|
| `replace` (default) | child's value wins whole; a stated `null` **is** null | everything not below |
| `by-key` | object merged key by key, child winning per key — ⚠ **one level**, it is `{...parent, ...child}` | `Detailed.details` |
| `by-entry` | list merged by entry identity (`as`, else `template`, else the bare string): parent's entries in order, a child's named entry substituted in place, new entries appended | `props` · `cast` · `costume` · `adornments` |
| `never` | the parent's value is not copied at all | `exits` · `routes` · all 11 `Biome` fields |

**Eighteen fields across six owners** declare anything but the default.
`extends:` is single-parent. The chain resolves at read, never flattened.

> ⭐ **There is no `super`, and the reason is structural, not an
> oversight.** Every rule is a merge the engine computes from the two
> values. The child can replace a value, union with it, or refuse it. It
> cannot **transform** it, because the child never names it.

---

## ⭐⭐⭐ The measurement — what inheritance is actually buying

Measured on the tree at `59465f95d`, 2026-10-01.

| | |
|---|---|
| template rows | **1,972** |
| rows using `extends:` | **68** (3.4%) |
| …of which children of ONE parent, `/stuff/agent/costume/student` | **47** |
| rows under a `costume/` namespace | **1** — the parent is the only member |
| fields that parent states | **4** (`shortDescription` · `register` · `keywords` · `costume`) |
| fields its children override | **3 of the 4**, essentially universally |
| ⭐ fields genuinely inherited in production | **1** — `costume` |

**And the prose it could deduplicate does not exist:**

| | ours | EotL |
|---|---|---|
| locations | **74** | **19,703** |
| rows with an examinable `details:` map | **118** | **8,000** |
| rows with a `longDescription` | 847 of 1,972 | ~every room (`day_long`, 16,609) |
| ⭐⭐ **prose strings appearing more than once** | **3** | — |

> ⛔⛔ **Three duplicated description strings in the entire content tree.**
> A mechanism for sharing authored prose has three strings to share. That
> is the finding, and it is the whole argument for waiting.

⭐⭐ **The repetition `extends:` was actually built against was engine
boilerplate, not content.** The legibility slate's Part A motivation was
`hydratorClass` appearing on 1,214 rows — *"the single most repeated line
in the content tree by a factor of three."* It is 1,528 now, with
**exactly one distinct value**, and the hydration build deletes the line
from every row by making the default layer implicit. **After that lands,
`extends:`'s measured value is one field on 47 rows.**

---

## ⚠⚠ The mirror, since we are measuring

[eotl-census.md](../../eotl-census.md) § *Detail density* ends on a
finding it explicitly aims at projects like this one:

> *"In this corpus, process volume and content density are inversely
> correlated. Not necessarily causal — both are symptoms of where
> attention went — but it is a pointed finding for any project with a
> high documentation-to-content ratio."*

Ours, measured the same day: **316,988 lines of design documentation ·
153 subsystem docs · 262 slates · 1,972 content rows · 74 locations.**
Roughly **160 lines of design doc per content row.** Nargolia had the
best design document in the corpus and 8% populated rooms; gnomelands'
README opens *"I knew nothing about programming then, so from a software
point of view most of it was awful"* — and it is 89%.

⭐ The census's other affordance lesson applies directly to any sharing
primitive we ship: **`night_long` is set on 1,851 rooms against
`day_long`'s 16,609.** *Give authors a field and most leave it; the ones
who fill it are making a point.* A composition primitive is a field.

---

## ⭐⭐ The content defect — and why the substrate caused it

`packages/content/generic-objects/content/stuff/agent/costume/student.yaml`
is the tree's first and only abstract parent. It makes **three
contradictory claims about what it is**:

- its path puts it in the **`agent` branch**;
- its name says it is a **costume**;
- its `class:` says it is an **`Extra`** — a person rung.

It is an outfit. An outfit is not an agent, so two of the three are
wrong. Clone it directly and a nameless, bodiless person stands in the
room wearing a student outfit — which **the row's own comment admits**,
deferring the fix to *"an abstract-row concept or a narrower base class"*
and to the base-class build, *"rather than having it pre-decided by one
cohort."*

⚠ **That build shipped on 2026-09-30 (MR !303) and did not touch this.**
There is still no abstract-row concept in `templates.md`. The deferral
has a decision owed, not an idea waiting.

⭐ **The measurable signature of the bad abstraction**: the parent states
four fields and its children override three. **When every child overrides
three of four fields, the parent is three fields too wide.** That is the
same test the base-class narrowing eventually ran on classes — whose own
slate records that its premise *"the classes are wide"* was measured and
falsified the next day, with the narrower evidence-led carve shipping
instead. This is that failure one layer down, in content, where no census
was run at all.

### ⭐⭐⭐ But the substrate offered no honest alternative

**`extends:` can only share a value by making a row of its HOLDER.**
There is no `include:`, no fragment, no data-mixin — those keys do not
exist — and `extends:` takes a single parent. So to share three garments
you must invent something that **wears** them. The agent reached for a
person because a person was the only noun available.

> **It used inheritance because the substrate has no composition.** Three
> garments are not a kind of person; they are a thing with a name that
> several people reference. That is `has-a`, and rows only speak `is-a`.

This is the real reason the modelling went wrong, and it is why fixing
the row and designing the primitive are **related but separable**: the
row can be fixed with the class system we have, and the primitive should
wait for volume.

### The agent failure mode, named

The row's comment is the confession, start to finish:

> *"Forty-five dressed people in the realm wear some variation of these
> three garments, and until template inheritance each of them spelled the
> whole list out. Six distinct outfits, forty-five copies of the base."*

**That is a deduplication argument.** Nobody asked *what is the shared
thing, and is it a person?* ⭐⭐ **A dedup survey finds the widest common
prefix, and the widest common prefix is almost never the right
abstraction** — the right one is usually narrower and needs a name that
does not exist yet. Minting a name is the expensive part, so a survey
reuses one lying nearby. That is also why the class narrowing took three
passes: the ask was specificity, the search was optimising coverage.

⚠⚠ **CLAUDE.md has this rule, and it is written for classes only.**
*"Name a class for what it IS, and check the prose you already wrote"* —
with `Movable` as the worked example, where every docstring said *"a
good"* and none said *"a movable."* The costume row is the identical
error in content: **its own comment calls it an outfit nine times and
never once calls it a student.** The rule should be stated for rows.

---

## What a composition primitive would have to be (design, not a commitment)

Recorded so the thinking is not re-derived when volume justifies it.

**The shape:** a **named value** a row includes — not a second parent. A
row names one or more fragments; each fragment supplies data keys; the
merge is the existing `inherit:` algebra, with the row's own statement
winning last. `extends:` stays single-parent and keeps meaning *"I am a
kind of that"*; inclusion means *"I am composed with that."*

⚠ **The ordering problem is the whole design.** Two fragments that supply
the same key need a deterministic winner, and `by-entry` makes it worse
(two fragments each contributing a `shoes` entry). The honest options are
declaration order with the last winning, or refusing the collision at
install time. **Refusing is probably right** — a silent collision in a
designation list is the doubled-jacket / barefoot-sentry failure the
`as:` key was introduced to prevent, and it must not come back through a
new door.

**Why not multiple `extends:`:** `is-a` with two parents inherits two
class statements and two hydrator statements, and the merge rule for
*those* has no honest answer. Composition carries data only, which is
what the use case actually needs.

### ⛔ What it must NOT be: an expression language

Rejected on sight, with reasoning, so it is not re-proposed:

`class`, `hydratorClass` and `behaviors[].brain` are **the only row
fields that may name code**, and the entire wizard-gate / code-trust
model rests on that line being crisp
([access.md](../../subsystems/access.md)). `weight: "{{ super * 2 }}"`
makes every row evaluate something, and the gate would have to grow to
cover arithmetic it cannot reason about. It also breaks
[ref-shapes.md](../../ref-shapes.md)'s **authored · stamped · derived**
provenance rule — a value that is half-authored, half-computed has no
clean provenance, and that doc is explicit that *"whichever framing is
most useful at the moment"* is how a substrate rots.

> ⭐⭐ **`inherit:` already IS the vocabulary for "how do I combine with my
> parent."** Every gap below is a missing MEMBER of it, declared by the
> field's owner where an author cannot get it wrong per-row — not syntax
> in the child.

---

## The three missing `inherit:` members

**1. Removal, at both levels — the one that bites first.** A child cannot
unset an inherited field, and cannot drop a single entry from a
`by-entry` list. The costume case states it exactly: **you can swap shoes
for boots, you cannot be barefoot.** The legibility slate records the
field-level half as open; the entry-level half is recorded here for the
first time. ⚠ `null` is already taken — *"a stated `null` IS null"* — so
removal needs a **distinct tombstone**, and conflating the two would be a
silent bug of precisely the class `by-entry` exists to prevent. A
tombstone is a **value**, not an expression, so rows stay data.

**2. `by-key` is one level deep.** It is `{...parent, ...child}`. A child
changing one key inside a nested detail object must restate the whole
object. Wants a `by-key-deep`, and the recursion depth should be bounded
and stated.

**3. Prose composition — and it is probably not an inheritance problem.**
*"The parent's description, but weathered"* has no expression today, so an
author copies the parent's sentences and they go stale silently when the
parent is edited — the exact duplication `extends:` was built to kill,
reappearing one level up. ⭐ But `ProseApi` Liquid templating already
composes text at **render** time: a child stating its clause and the
renderer composing it is the **derived** answer; merging the parent's
sentence into the child at clone time is the **authored** answer, and it
is the one that goes stale. Putting this in the merge algebra solves a
rendering problem in the wrong layer. **Decide it against
[prose.md](../../subsystems/prose.md) before touching `inherit:`.**

---

## Sequencing

1. ⭐⭐ **Fix the costume row** — model the outfit as what it is, re-point
   47 children, and decide whether a row may be abstract (the owed
   decision). Cheap now: one parent, one namespace of one, 47 children.
   Entrenches with every dressed person added. **Not gated on anything.**
2. **State the naming rule for rows**, beside CLAUDE.md's rule for
   classes. One line; it is the check that would have caught this.
3. **Add removal** (the tombstone) if and when a child needs to drop an
   inherited entry. The costume fix may well surface the first real
   consumer.
4. ⏸ **The composition primitive waits for content volume.** The trigger
   is not design readiness — the design is above. It is **authored
   repetition that actually exists**: revisit when the tree carries
   duplicated *content* (prose, detail maps, designation lists) on the
   order of hundreds of rows rather than three strings.

⚠ **Do not fold any of this into the hydration framework build.** That
build already touches the clone pipeline and the login path, and it
changes `hydratorClass` to a plural list — which is a change to the same
row shape, so the two must not be in flight together.

---

## What is NOT in scope

- **`extends:`'s own open questions** — per-field merge semantics, whether
  descriptive fields should inherit at all, cross-pack dangling parents,
  and ⚠ the **go-live fan-out** (*"one parent edit silently fails to reach
  N descendants and nothing shows you which"*). Those are
  [legibility-slate](./legibility-slate.md)'s and stay there.
- **Growing the content tree.** The measurement says our corpus is thin;
  that is an argument about *this* mechanism's payoff, not a content
  plan. Whether to invest in place density, examinable detail and bespoke
  verbs — which is what [eotl-census.md](../../eotl-census.md) § *What
  this settles* says the ancestor's authoring effort went into — is a
  product question and belongs to a content slate.
