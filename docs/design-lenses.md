# The five design lenses

**The rubric every high-level design is interrogated with.** Five
questions, asked in order, of any feature, slate, subsystem, or fork.
They are the project's own — not borrowed, not a checklist someone
should have to be handed at the start of each session.

> ⚠ **Not to be confused with [docs/lenses/](./lenses/README.md)** —
> that directory is Jesse Schell's lens deck (fantasy, curiosity,
> cheatability…), a borrowed *analysis toolkit* used mostly for the
> education-video track. This doc is the *decision rubric*. Where a
> Schell lens sharpens one of the five, it is named as an instrument
> below.

---

## How the five are used

**A scorecard, not a gate.** Score a design against all five; lenses 1
and 2 pick the winner.

> ⭐⭐ **The standing rule, stated as permanent:** *"What solution is
> the richest pedagogically and teaches real science? Secondarily, what
> affords the most expressiveness and creative control by our content
> authors?"*

Lenses 3–5 are axes a design **must not badly fail**, but they do not
decide forks. Lens 5 is the lesser one — it never vetoes on its own; a
mechanism that only works in one epoch is a flag that the physics is
probably modelled at the wrong altitude, not an automatic rejection.

**When the pass is run:** at the **slate** (before a design is
considered ready) and at **requirements** (over the agreed scope).
Between those, during a build, the lenses are not a ceremony — they are
the thing that **decides forks without asking**. Only stop at a fork
where two options are equally strong on 1 and 2, or where the question
is really about sequencing and scope. That is still a human call.

⚠ The tell that the rule should have been applied instead of a question
asked: *the option that models the real mechanism is always the one that
keeps working when content authors extend it.* When both limbs point the
same way, there was never a fork.

---

## 1 · Pedagogy — what does it teach about the world?

*How academically rich is it, and what does it teach about the world?*

**Skill is the unit, and [Discipline](./subsystems/advancement.md) is
how skill is modelled.** Most pedagogy implies a skill; a skill that no
Discipline names is a fact sheet, not a curriculum. So the first
question of any design is not *"is this educational?"* but *"which
Disciplines does doing this exercise, and what does getting better at
them actually mean?"*

The second half is fidelity. The world has to be **derivable** — a
player who has internalized the principles should be able to predict
what happens, and be right, without looking anything up. That is the
[Andy Weir](./design-philosophy.md) property, and it is why *model
honestly* is the governing principle of the engine: no fudge anywhere,
because lying about the physics anywhere weakens the pedagogical claim
everywhere.

> **The test.** What Discipline does this exercise, and can a player
> derive its outcomes from principles rather than look them up?

**Failing looks like:** a lookup table dressed as chemistry; a die roll
standing in for a mechanism; a number that goes up with no referent.
The sharpest instrument here is [uncertainty.md](./uncertainty.md) —
*roll to decide what the world IS, never to decide what your action
DID*, and its corollary that **luck is not a stat**. A resolution roll
is pedagogy's exact opposite: it makes the world un-derivable on
purpose.

⭐ **Worked example — the smelt.** The metal chain could have shipped
`smelt` as a recipe (fixed input → fixed output). Pedagogy killed it:

> *"If the smelt flattens grade, then prospecting — the one genuinely
> new primitive the mining slate commits to, the reason the trade is
> interesting — is theatre: a deduction game whose answer doesn't
> matter."*

The yield derives from the lump's actual composition, so grade stays
load-bearing for eight steps — **lean ore honestly makes a worse
sword**. Nothing about the recipe version was cheaper to *play*; it was
just cheaper to *build*, which is not a tiebreaker.

---

## 2 · Creative expression — what can an author make with it?

Two tiers, and a design has to serve **both**:

1. **The ordinary case, with no code.** An author assembles the basic
   thing out of pre-canned interactions the platform already affords —
   mixins that interoperate, recipes, templates, data files. If making
   the common case requires writing a class, the substrate has failed
   this lens.
2. **The bespoke case, without breaking.** On top of that, an author
   writes something genuinely custom — and the systems still hold up.
   The best outcome is stronger than "hold up": the systems **suggest
   the bespoke idea in the first place**.

> **The test.** Can an author build the ordinary case out of
> interoperating mixins with no code — and does the system still hold,
> or better, inspire, when they write something bespoke on top?

The framing that matters: **give the author the most colors to paint
with.** Variety comes from combination and permutation, not from
enumeration. A system whose content is a list is a system that only
grows by someone adding to the list.

⭐ **Worked example — recipes.** From the metal-chain slate: *"recipes
are the single most **expressive** thing for content authors — the whole
known-of → can-make ladder rides them, and a recipe is a data file."*
Same lens, structural version: a **venue archetype states the needs and
a locality binds them**, so a second bar, distillery or mine needs
**zero new pack code** — `trade-hospitality` ships a venue pack with no
`src/` at all. That is the operational test for whether mechanism and
expression got separated correctly.

**Failing looks like:** content that is enumerated instead of composed;
a mixin that only works on the one host it was written for; a feature
whose second instance requires a kernel edit.

---

## 3 · Immersion & roleplay — what experience does it create?

*How do players use it in ways that go beyond the mechanics?*

**Immersion leads; roleplay follows from it.** The two need each other,
but they are not equal partners here, and the ordering is the whole
insight:

> ⭐⭐ **Nothing about GTA is optimized for roleplay.** The RP scene
> emerged out of the simulation they built. Roleplay is not a feature
> you design; it is what people do inside a world that is coherent
> enough to be lived in.

So the question is never *"does this support roleplay?"* — it is *"is
the simulation honest and dense enough that the behavior is possible
without anyone scripting it?"* Between the simulation and the
governance model, the RP space is a **consequence**. Designing *for* RP
directly usually produces the opposite: a stage instead of a place.

> **The test.** Does the simulation make the behavior possible without
> anyone scripting it — and does the result read as a world rather than
> as an interface?

**Failing looks like:** the fiction asserted in prose that the model
doesn't back; a mechanic that is correct but reads as a spreadsheet.
The sharpest instrument is [measurement.md](./measurement.md)'s
no-gauge rule — *no fidelity meter, no sin counter, no progress bar, no
streak, no leaderboard* — because a gauge is the fastest way to convert
a lived world back into an interface. The companion tell:
**unlit interiors are pitch black**, and the giveaway that a design
forgot this is that every object reads "something" while the room prose
still sounds fine.

⭐ **Worked example — tasting.** In the cooking design, *tasting is the
anti-gauge*: expertise **is** discrimination, the spoon is the iconic
kitchen image, and you advance by perceiving more. One mechanic that
satisfies all four of the main lenses at once, and its immersion score
comes entirely from having refused a number.

---

## 4 · Gamification & self-improvement — better choices

*How does it help the player make better choices — for themselves, and
as a member of the community?*

Lens 1 is about **knowledge**. Lens 4 is about **values**. That is the
line between them, and it is why they are not redundant.

The simulation **forces certain choices** — and the question this lens
asks is what making them teaches you about yourself and about your role
in the community. Both halves count:

- **Personal development** — the in-game competence is a real
  competence; the hours are applied hours.
- **Being a good citizen** — what the feature lets you do *for* others,
  and what the polity can see you having done.

This lens is also **where standing gets conferred**. Every design should
be able to answer: what does excellence at this look like, and **who
says so?** The three-layer answer is already written down —
[measurement.md](./measurement.md): *the engine measures · the subject
values · the polity imposes.* A design that measures something without
naming who values it has skipped the interesting half.

> **The test.** What choice does this force, and what does making it
> tell you about yourself and your place in the community?

**Failing looks like:** no real choice (a dominant option, or a single
path dressed as a decision); a reward for time rather than for judgment;
standing that accrues from throughput. *You can't farm a god* is the
same rule in the religion doctrine's voice.

---

## 5 · Technology & magic — does the mechanism hold across every epoch?

The lesser lens, and the most often skipped. Run the design against
**prehistory · medieval · industrial · modern · future**, and check
what has to change.

> ⭐ **Physics in ancient Rome is the same as in New York City.** The
> *dynamics* change with time period and technology; the **mechanics
> must not.**

**Future tech and magic are the same axis seen from two sides.** Both
function identically in narrative once they are sufficiently advanced,
which is exactly why the magic model is built as *invented content
confined to one postulate* sitting on real thermodynamics — conservation
holds globally, and a working is priced like a heat pump. Magic that
obeys laws and technology that obeys laws are the same design problem.

> **The test.** Does the mechanism hold from ancient Rome to New York,
> with only the dynamics changing?

⭐ **Worked example — the wall socket.** `ChargedMixin` is one charge
economy; `ManaPowered` is its second consumer. A wand and a wall socket
are the same mechanism with different fiction attached. The same
property holds in [electricity.md](./subsystems/electricity.md), where
one honest Ohm's-law model covers a hand tool and, scaled up, the grid.

**Failing looks like:** a mechanic that would have to be *rewritten*
rather than *re-parameterized* for another epoch — usually a sign it was
modelled at the level of the technology instead of the level of the
physics. This is also the discipline behind *trades ship medieval and
advance by exercised disciplines*: the ladder is a parameter, not a
different machine.

---

## Running the pass

A lens pass is short. Five headings, a couple of sentences each, in the
slate and again in the requirements doc:

```
### Lens pass
1. Pedagogy — <Disciplines exercised; what is derivable>
2. Expression — <what an author composes with no code; what bespoke buys>
3. Immersion — <what the sim affords without scripting>
4. Values — <the choice forced; who confers standing>
5. Epochs — <what changes across the five; what must not>
```

If a heading is hard to fill, that is the finding — write the gap down
rather than writing something that sounds fine. The most common
outcome of an honest pass is not a rejected design; it is a design that
gets **one level more real** in the place the pass was thin.

## Related

- [design-philosophy.md](./design-philosophy.md) — the fidelity /
  honesty axis lens 1 rests on.
- [vision.md](./vision.md) — the pedagogical premise the whole rubric
  serves.
- [uncertainty.md](./uncertainty.md) — where randomness may enter
  (lens 1's sharpest instrument).
- [measurement.md](./measurement.md) — what may be counted, who says
  what it is worth (lenses 3 and 4).
- [arcane-science.md](./arcane-science.md) — one postulate, real
  thermodynamics (lens 5).
- [subsystems/advancement.md](./subsystems/advancement.md) — Discipline,
  the unit lens 1 measures in.
- [lenses/](./lenses/README.md) — the Schell deck, a different thing.
