# Kernel vocabularies to rows: a pack never needs a kernel list edit

> **Status: PARTIAL** · opened 2026-11-06; smell, taste, the palate, aroma
> documents and derived media shipped in !531 (vocabularies-to-rows, 2026-11-07).
> **Left:** `MATURATION_MECHANISMS` (→ material decomposition) · `DISPLAY_KINDS` +
> `DISPLAY_PAIRINGS` (→ display manifestation) · `DirtKind` as a document, not an
> Idea · touch and hearing (the absorbed non-visual-senses design, → senses slate)
> · an aroma library in directories, not one flat list (owner, review of !531).
> **Size:** a tail each; none is a build of its own here.
> **Absorbs:** `non-visual-senses-slate.md` (moved here verbatim below;
> the file is retired).

---

## Where this came from

The owner, 2026-11-06: the next builds are refactors and architectural
improvements, not new features. They must not step on build-2
(`controllers-are-io`: controllers, protocols and five mixin splits) or
the wizard axis that just shipped. The smell/taste design was named as a
candidate.

The smell design (absorbed below) turned out to be one case of a census
the repo already keeps. `lint:closed-vocabularies` counts the kernel word
lists that content must match and cannot add to. Each one breaks the rule
that **a pack never needs a kernel list edit**. `AROMAS` is the worst of
them, and the other four are the same build.

## ⭐ The census, verified 2026-11-06

`pnpm -C packages/server lint:closed-vocabularies --report` on master
(`6c0182abd`): **5 counted (ceiling 5), 8 declared closed by design.**

| vocabulary | words | where | refused in |
|---|---|---|---|
| `AROMAS` | 11 | `lib/metabolism/DissolvedAromatics.ts` | `isAroma` (Recipe `imparts`, Material `combustionImparts`) |
| `MATURATION_MECHANISMS` | 5 | `lib/maturation/MaturationProfile.ts` | `setMechanism` |
| `RECIPE_MEDIA` | 2 | `lib/craft/Recipe.ts` | `Recipe.mediumFrom` |
| `DISPLAY_KINDS` | 4 | `lib/display/Display.ts` | the `shows:` setter |
| `DISPLAY_PAIRINGS` | 4 | `lib/display/Display.ts` | the `pairing:` setter |

The eight declared lists (`BASIC_TASTES`, `DIFFICULTIES`,
`DISCIPLINE_CHANNELS`, `HAZARD_STATES`, `REACH_CLASSES`, `SEASONS`,
`SENSE_CHANNELS`, `TRANSFER_TERMS`) are out of scope. Each carries its
reason in `CLOSED_BY_DESIGN`.

## ⭐⭐ Three outcomes, not one

The gate's own header names two ways down: **rows**, or **declare** the
closure real with a reason. This build adds a third, and it should be
tried first:

| outcome | when | what is left |
|---|---|---|
| **derive** | the answer the word stands for is already a property of the matter | nothing: the list disappears and no row replaces it |
| **rows** | the closure is a convenience: an author could truly need another word | one row per word, any pack's, loaded on use |
| **declare** | each word is a branch of kernel code, so a new word would mean nothing without new code | an entry in `CLOSED_BY_DESIGN`, written as the claim |

⚠ "Declare" is not the cheap way out. It claims that a pack can *never*
legitimately need a word in that list. The `MATURATION_MECHANISMS` receipt
(below) shows how such a claim gets broken.

## Per vocabulary: the grounding and the lean

Each lean is a starting point for requirements. Requirements makes the
decision.

### `AROMAS` → rows — ✅ shipped (!531)

Words are `aroma` documents in a tree: [senses.md § One smell](../../subsystems/senses.md#one-smell-source-air-nose).

### `MATURATION_MECHANISMS` → split: the word becomes a row, the reconcile stays closed

- **Shape:** `microbial · photochemical · chemical · evaporative ·
  enzymatic`, across 37 rows (microbial 25, chemical 9, the other three
  with one row each).
- ⭐ **One word is doing two jobs.** What the code reads:
  - **default lines per mechanism** (`MATURATION_LINES[...]`,
    `Maturing.ts:317`). This is data.
  - **the microbial off-gas default** (CO₂, `MaturationProfile.ts:535`).
    This is data.
  - **`evaporative` has its own reconcile**
    (`reconcileEvaporativeWindow`, `Maturing.ts:685`). This is code.
    Every other mechanism shares the standard reconcile.
- ⚠ **The receipt.** The whiskey build added `enzymatic` because malting
  needed a *true word*: `microbial` and `chemical` both assert something
  false. Nothing in its behavior was new. That is a content need that
  paid a kernel edit.
- **The lean:**
  - the mechanism becomes a row carrying its word, its default lines and
    its default off-gas;
  - what the kernel branches on (standard vs evaporative) becomes a
    separate small key, declared closed because a reconcile is code.

### `RECIPE_MEDIA` → derive — ✅ shipped (!531)

A medium is any tag and the carrying material sets the ceiling: [crafting.md](../../subsystems/crafting.md) § medium.

### `DISPLAY_KINDS` and `DISPLAY_PAIRINGS` → read, probably declare

- **Pairings:** `remote · held · staff · open`. Each is a `case` in
  `mayDrive` (`Display.ts:271`), the rule for *who may drive this
  screen*, so each is access-policy code.
  - `display.md` says a display confers no money authority, which makes
    the pairing a security question, not content.
- **Kinds:** `video · card · prose · document`. Each is an arm of the
  `DisplaySource` union, rendered by its own client code.
- **The lean:** declare both closed by design, with those reasons. A
  fifth pairing is new access code, and a fifth kind is a new client
  renderer.
- ⚠ Build-3 (client-surface) is the area most likely to want a new kind,
  so ask that branch before declaring.

## ⚠⚠ The load rule: rows must load on use, not at boot

The pattern this replaces `AROMAS` with is `ReadingCatalogue`, and that
catalogue **warms its whole roster on the first miss**. That is a scan,
and the scan-sweep slate is burning those down
(`scan-sweep-slate.md` § the fourteen sync-read catalogues). Copying its
shape for aromas would add a fifteenth.

What load-on-use needs is an **authored reference that names a path**.
Today rows author a bare word (`type: smoke`). Either:

- **(a)** the word resolves to exactly one path by rule (for example
  `/stuff/idea/aroma/<word>`, which any pack may ship a commons row
  under), so a lookup is a path load and never a search; or
- **(b)** rows author the path.

(a) keeps the authored word, which is what an author types and what a
player reads, so lens 2 leans (a). Requirements decides. Whichever wins,
**no new boot entry** (`lint:boot-entries`), and the same rule governs
mechanism rows.

## Open: the aroma library in directories (owner, review of !531)

The owner would rather the aroma documents sat in several directories than one flat
list of 132. The catch is that a word is its path: a material names `peat-smoke`, and
the nose loads `/aromas/peat-smoke` with no search. Two shapes keep that:

- **Directories by family, decoration only.** `content/aromas/smoke/peat-smoke.yaml`,
  with the installer keeping `/aromas/peat-smoke` as the path and `parent:` still the
  tree. Needs the kind to strip a directory, a small installer change, and a rule that
  two families can't ship the same leaf.
- **Directories as the tree.** The directory is the parent, so `parent:` goes away, but
  every row naming a word would have to name its path (`smoke/peat-smoke`), and moving
  a word in the tree would rewrite every material that names it.

The first is the cheaper and keeps authoring a word as it is. Owner: *"I can live
with it"*, so it is a tail, not a defect.

## Non-goals, each with its destination

- ⚠ **`DirtKind` is an Idea that should be a Document** (owner, review of !531,
  2026-11-07). The aroma words moved to the `aroma` document kind for this reason:
  authored metadata nothing writes, nothing acts on, and MQL should not find. `DirtKind`
  is the shape they copied, with the same problem, and other row-shaped vocabularies
  may share it. → a follow-up sweep, deliberately not inside a content build.

- **NPCs reacting to smell, smell trails, scent-tracking** →
  `senses-slate.md` § NPCs reacting to smell. They consume this build's
  rows. This build does not decide them.
- **The eight declared vocabularies** → nowhere, deliberately. Each one's
  reason is on record in `CLOSED_BY_DESIGN`.
- **`TOUCH_BANDS`** (not in the census) → the absorbed design's "plain
  answer for touch and hearing", below.
- **A `SmellProfile` / `TasteProfile` class** → nowhere. See the absorbed
  recommendation.

## Lens pass (beyond smell's, which is absorbed below)

- **2 creative expression decides every fork here.** Each outcome is
  judged by one test: *can a pack author add the word with no kernel
  file changed?* Rows pass. Derive passes better, because there is
  nothing to add. Declare passes only if no author could ever need the
  word.
- **1 pedagogy.**
  - A medium's ceiling derived from its own phase limit is something a
    player can work out ("fat gets hotter than water").
  - A list of two media teaches nothing.
  - A mechanism row whose word must be true (`enzymatic`) keeps the
    platform honest.
- **5 continuity.** Rows and derivation survive the epoch. A pressure
  cooker raises water's ceiling through the material's boiling point,
  where a list would need a third word.
- **6 economy.** Rows are what let a perfumer, a salt-baker or a
  sand-roaster trade without waiting on us.
- **7 governance.** Does not bite. Nothing here judges a person.

## ⭐⭐⭐ Decided at requirements (2026-11-07): this overrides the leans above

The scope grew past the census, on the owner's word: *"I don't want you cutting
scope to make it more like a refactor. If we do nothing else we're going to do
this and get it right."* The product decisions are in the requirements doc. What
stays here is what they don't carry.

| vocabulary | outcome | where |
|---|---|---|
| `AROMAS` | rows, in a tree | this build |
| `RECIPE_MEDIA` | derived from the carrying material; a medium is any tag | this build |
| `MATURATION_MECHANISMS` | waits; a mechanism becomes a class | material-decomposition-slate |
| `DISPLAY_KINDS`, `DISPLAY_PAIRINGS` | wait for the screens conversation | display-manifestation-slate |

The check ends at **3, not 0**. None of the three is recorded as closed by nature.

⚠ **The absorbed sections below are stale in two places.** They say nothing makes
smell travel and that it would be a per-tick cost. Smell already walks through
doors and exits, and only when someone reads it, with no tick. They also keep
`PalatableMixin` on `ServingVessel` as a hard constraint and "smell cask reports
nothing" as settled. The owner chose otherwise: an open cask smells, and anything
edible can be tasted.

## Absorbed from non-visual-senses — Why this exists

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
## Absorbed from non-visual-senses — ⭐⭐ Grounding — VERIFIED by opening files, 2026-10-06

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

## Absorbed from non-visual-senses — ⛔ The question, stated so it can be answered

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

## Absorbed from non-visual-senses — The lens pass

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

## Absorbed from non-visual-senses — Scope to plan, when it is planned

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

## Absorbed from non-visual-senses — Hard constraints

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

## Absorbed from non-visual-senses — Cross-references

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

## Absorbed from non-visual-senses — ⬅ From the fire build (2026-10)

Left as a line here rather than in a retired plan.

- **`Material` has nothing for smell, and `tar` is not an aroma word.** The fire build reports tar reek by material NAME in the air reading rather than as an aroma tag, which is honest and is not a smell model.

## Absorbed from non-visual-senses — ⬅ From the cleanliness build (2026-10-18, !380)

Dirt smells now (`DirtKind.odour`, B57): an INSTANCE-layer emission derived
from soil loads, read by `SmellModality`'s contents leg. ⚠ Its identities
(*stale sweat*, *dung*, *sour milk*, *old blood*, *rancid fat*) are free
text on the dirt rows — when the aroma vocabulary becomes rows (above),
they join it rather than becoming a second list. NPCs reacting to it:
[senses-slate § NPCs reacting to smell](./senses-slate.md).
