# The senses that are not vision — smell, taste, touch, hearing

> **Status: PARTIAL** — the three senses are modelled three different
> ways and nobody decided that: vision is a physical field, taste is
> DERIVED from composition, and smell was absent until the
> whiskey-styles build invented `AROMAS` to have somewhere to put it.
> **Left:** `Material.smells` (the substance half, which does not exist) ·
> the aroma vocabulary moved to **rows** · the reading moved onto
> `instrumentation.md`'s ladder · whether smell TRAVELS · and a plain
> answer for touch and hearing, even if it is *nothing yet*.
> **Size:** a build — kernel-led. **Seeds:** the review of MR !336.

---

## Why this exists

The whiskey-styles build needed matter to smell of something, found
nothing to hang it on, and **invented a vocabulary** — `AROMAS`, eleven
words with odour thresholds, closed, in the kernel. It works, it ships,
and its own site note concedes that a pack wanting `tar` needs a kernel
MR.

⭐ The user's objection was not the list. It was the precedent:

> *"my concern is less about game breaking because we're not in prod yet,
> more about poisoning the well where agents see this stuff and adapt it
> to suit their own needs… which is pretty much what an agent does with
> everything it finds unless there's an opposing force."*

The opposing force shipped first (`lint:closed-vocabularies`, ceiling 5).
**This slate is the design question that force is holding the door open
for.**

---

## ⭐⭐ Grounding — VERIFIED by opening files, 2026-10-06

### The three senses are modelled three different ways, and nobody decided that

| sense | how it works today | where |
|---|---|---|
| **vision** | a **physical field**. A `Light` value object, `signalAt`, ambient vs source, per-viewer resolution, concealment bands, an illustration pipeline | `light.md`, `perception.md`, `concealment.md`, `media.md` |
| **taste** | **DERIVED from composition.** `tastesOf()` unions the ingredients' `BASIC_TASTES`; ⭐ *nothing authors what a dish tastes like* | `lib/metabolism/Palatable.ts`, `Material.tastes` |
| **smell** | a **per-litre concentration** with an authored amount and a closed kernel word list (whiskey-styles, 2026-10-05) | `lib/metabolism/DissolvedAromatics.ts` |
| **touch** | `TOUCH_BANDS` (6 words) + a `feel` verb | `lib/perception/Touch.ts` |
| **hearing** | `Audible` push, no substance-level model at all | `perception.md`, `messaging.md` |

⚠ **Before this build, the only `smell`-channel augmenter in the entire
game was the still's `fractionAugmenter`.** Smell was not under-modelled;
it was absent, and the first trade that needed it got to define it.

### What the codebase already decided, and is worth not re-deciding

- ⭐⭐ **`PalatableMixin` composes on `ServingVessel` and NOWHERE else**,
  and it took two wrong hosts to get there (`BulkableMixin` put a taste
  palate on floors, garden beds and air tanks; `CraftVessel` put one on a
  mash tun). Its own file records the reasoning. **Any sense work inherits
  this answer rather than relitigating it.**
- ⭐ `look` reads none of it. The augmenters are filter-gated per channel,
  and `maturationAugmenter` once read a cellar line out over a field of
  linen for want of that gate.
- ⭐⭐ **Competence resolves DETAIL, never ACCESS** (`instrumentation.md`).
  Everyone smells the matter; what differs is how much of it you can
  name. A sub-threshold compound is invisible to an expert too — physics,
  not permission.
- ⚠ **No digit may render.** The amounts are mg/L; the reading is words.
  `measurement.md`'s no-gauge reading rules.

### ⛔ The three facts that decide the design

1. **`Material` carries `tastes` and NOTHING for smell.** So what a
   *substance* smells of cannot be authored at all — only what a *process*
   `imparts`. That asymmetry is the actual hole, and it is why peat
   smelling of smoke is **declared by a recipe** rather than derivable
   from the material.
2. ⭐⭐ **Taste physiology is genuinely closed; smell is not.** Five
   receptor classes versus ~400 olfactory receptor types with no agreed
   basis set — "primary odors" is a research programme that failed. So
   `BASIC_TASTES` may be a closed kernel list for a reason `AROMAS` cannot
   borrow, and the analogy that licensed `AROMAS` does not hold.
3. ⭐⭐⭐ **The mechanism `AROMAS` wants already shipped, in another
   subsystem.** `instrumentation.md`'s reading channels:
   `<root>/idea/reading/<channel>.yaml`, warmed by `ReadingCatalogue` on
   template-path infix, *"no kernel list, no stanza in a platform view,
   no boot-sequencer line"* — **31 channels across the platform and seven
   packs today.** And `Placement` has already made this exact journey from
   enum to row. The replacement is not a new design; it is an existing one
   this build failed to notice.

---

## ⛔ The question, stated so it can be answered

**Do we want a `SmellProfile` / `TasteProfile`?**

⭐ **The recommendation is NO, and the noun is the tell.** A "Profile" in
this codebase is a **process** row keyed on a material tag —
`MaturationProfile`, `FractionSchedule`, both with an `inputCategory` and a
clock. Senses are not processes, so the name would be a false friend and
the next agent would reasonably expect a clock on it.

⭐⭐ What the three patterns above are *actually* groping toward is **one
split in three layers**, which the existing code already half-expresses:

| layer | question it answers | today | wants to be |
|---|---|---|---|
| **substance** | what is this stuff *like*? | `Material.tastes` ✅ · smell ⛔ absent | a field on `Material` per sense, over a **row** vocabulary |
| **instance** | how much does *this* carry? | `dissolvedAromatics` ✅ (whiskey-styles) | unchanged — this part is right |
| **reading** | what does *this viewer* resolve? | `AROMAS` + `render()` ⛔ reinvented | a **`Reading`** channel, banded by competence, with an instrument ceiling |

**So the deliverable is not a Profile. It is:** a `smells` field on
`Material` (closing hole 1), the aroma vocabulary moved to rows (closing
hole 2 and the `lint:closed-vocabularies` entry), and the reading moved
onto the instrumentation ladder (closing hole 3).

---

## The lens pass

**1 pedagogy.** ⚠ The current smell model is **not derivable** — nothing
lets a player work out that peat smells of smoke; the recipe declares it
(`Recipe.imparts`). ⭐ With a substance-level `smells` field it becomes
derivable: peat's material says what it smells of, a process that moves
matter moves the smell, and *"turf smoke in the malt"* is a conclusion
rather than an assertion. **This lens is why hole 1 is the important
one.** Discipline: none new — the nose reads through the trade that made
the thing (`CraftingApi.blendDiscipline`), which is the existing answer.

**2 creative expression.** ⛔ **The current design fails this outright.** A
pack wanting `tar` needs a kernel MR, which is the one rule
`content-packs.md` states as absolute. Rows pass it. ⭐ And the *ordinary*
case must stay free: a material that smells of nothing authors nothing,
which is every material in the game today.

**3a immersion.** A nose that reports a number betrays the fiction (kept
out). A nose that cannot smell tar in a world that has tar betrays it
too. ⚠ Also: smell should probably **travel** — a room smells of what is
in it — and today nothing does that. A bakery that does not smell of
bread is the kind of hole players notice before designers do.

**3b participation.** ⭐ Rows make a **perfumer** possible with no kernel
work, and give the cooper's charring and the blender's vatting something
to trade on. A kernel list makes all three wait on us.

**4 values.** ⭐ A detection threshold is a **gauge**: it converts an
undecidable (*how strong is "strong"?*) into a calculable. Who sets it?
With rows, an author; with a kernel list, us — a `measurement.md` layer-B
decision (whoever ships the code) that should be layer C or an author's.
⚠ The band WORDS are the same question and are currently ours by default.

**5 continuity.** ⭐⭐⭐ **The sharpest lens, and it settles the split.** A
gas chromatograph in the industrial epoch should read **the same
`dissolvedAromatics` field** and hand back a **number** where a nose hands
back a word. So the concentration **survives the epoch** and the word list
is only *the medieval reading of it* — which is exactly the
instrument-ceiling ladder `instrumentation.md` already models. The test
(*does the new object answer the same commands*) passes for the field and
fails for the vocabulary.

**6 economy.** Produces: perfumers, coopers, maltsters, blenders,
smokehouses. Consumes: aromatic materials. ⭐ The demand is already there
— this build created it and then could not serve it.

**7 governance.** Does not bite. Nothing here judges a person.

⚠ **The gap this pass leaves:** hearing and touch get no answer above.
Touch has `TOUCH_BANDS` and a `feel` verb; hearing has `Audible` push and
no substance model. Whether they want the same three-layer split or
genuinely nothing is **undecided**, and saying so is better than inventing
a symmetry. ⭐ Note that `feel`/`taste` is this repo's canonical
shipped-and-never-ran pair — so the honest prior is that an unexercised
sense substrate stays unexercised until a trade needs it, exactly as
smell did.

---

## Scope to plan, when it is planned

1. **`Material.smells`** — the substance-level half, symmetric with
   `tastes`, over a row vocabulary. Closes the derivability hole.
2. **The aroma vocabulary becomes ROWS** — `<root>/idea/reading/` or a
   sibling `idea/aroma/`, each word carrying its own threshold, warmed by
   a catalogue on template-path infix. ⭐ `lint:closed-vocabularies`
   **falls by one** when this lands, which is the gate working as
   intended.
3. **The reading joins the instrumentation ladder** — so `analyze`/
   `measure` reach it, an instrument raises the ceiling, and the epoch
   question answers itself.
4. **Does smell travel?** A room that smells of its contents. ⚠ Decide
   deliberately; it is a per-tick cost and a scope trap.
5. **State plainly what touch and hearing get**, even if the answer is
   nothing yet.

### Out, and why

⛔ **A `SmellProfile` / `TasteProfile` class.** The noun is a process row
in this codebase and senses are not processes — see the recommendation
above. ⛔ **Retrofitting vision.** It is the one sense that is modelled
properly; the others should move toward it, not it toward them.

---

## Hard constraints

- ⛔ A pack must never need a kernel list edit. That rule is what this
  slate exists to honour.
- ⚠ No digit may render in a sense reading, at any competence band.
- ⚠ Competence resolves DETAIL, never ACCESS — a sub-threshold compound
  is invisible to an expert too.
- ⭐ `PalatableMixin` stays on `ServingVessel`. Two wrong hosts already
  paid for that answer.
- ⚠ Every augmenter is filter-gated per channel; an ungated one lands on
  `look` and reads a cellar line over a field of linen.
- ⛔ No new Mongo collections. No migrations.

---

## Cross-references

- `docs/subsystems/metabolism.md` — the aroma vocabulary as shipped
- `docs/subsystems/instrumentation.md` — ⭐ the row-per-channel shape that
  should replace it, and the competence/instrument ladder
- `docs/subsystems/senses.md` · `perception.md` — the channel vocabulary
- `docs/subsystems/light.md` — what a properly modelled sense looks like
- `docs/lint-family.md` § `lint:closed-vocabularies` — the opposing force
  holding this question open
- [metabolism.md § Aroma — the second closed vocabulary](../../subsystems/metabolism.md)
  — where `AROMAS` landed, including ⚠ why the `BASIC_TASTES` analogy that
  licensed it does not hold

## ⬅ From the fire build (2026-10)

Left as a line here rather than in a retired plan.

- **`Material` has nothing for smell, and `tar` is not an aroma word.** The fire build reports tar reek by material NAME in the air reading rather than as an aroma tag, which is honest and is not a smell model.
