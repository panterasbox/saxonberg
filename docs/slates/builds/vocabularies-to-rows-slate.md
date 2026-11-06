# Kernel vocabularies to rows: a pack never needs a kernel list edit

> **Status: UNBUILT** · opened 2026-11-06 (owner, the refactor season,
> after the wizard-axis cleanup merged as !525).
> **Left:** `AROMAS` to rows, plus `Material.smells` and the smell reading
> on the instrumentation ladder · `MATURATION_MECHANISMS` split (the word
> becomes a row, the reconcile stays closed) · `RECIPE_MEDIA` derived from
> the material · `DISPLAY_KINDS` and `DISPLAY_PAIRINGS` read and declared ·
> how an aroma word loads on use · whether smell travels · what touch and
> hearing get · the gate's ceiling to 0.
> **Size:** a build. Kind: refactor/sweep. Leads from: kernel. **First
> consumers:** the whiskey styles' peat, cask and kiln rows (7 rows author
> aromas today), the 53 maturation profiles, the 8 recipes that name a
> cooking medium, and the cleanliness dirt odours.
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

### `AROMAS` → rows

- **Shape:** eleven `{ type, thresholdMgL }` pairs (smoke 0.02, vanilla
  0.1, oak 0.07, char 0.3, fruit 0.05, floral 0.5, grain 1.0, honey 0.2,
  spice 0.03, solvent 5.0, sulphur 0.01).
- **Readers:** `DissolvedAromatics.isAroma` / `thresholdFor` / `render`.
  - `Recipe.fromData` validates `imparts` (`Recipe.ts:434`).
  - `Material` validates `combustionImparts` (`Material.ts:2324`).
  - `Palatable` renders the aroma line ahead of taste.
- **Authored use:** 7 rows (smoke ×3, oak ×3, vanilla ×3, char ×1).
- ⚠ **`Material.combustionImparts` already exists.** It says what a
  *fuel* gives off when burned, so peat smoke reaches the malt. It still
  says nothing about what the *substance* smells of, so the
  `Material.smells` hole in the absorbed design below stands. Requirements
  should say how the two relate. They are two layers, and one should not
  be widened to serve as the other.
- ⚠ **A second list is forming.** `DirtKind.odour` is free text on the
  platform's dirt rows (grease, blood, manure…). When aromas become rows,
  those words join them.
- **The lean:** one row per aroma, each carrying its own threshold.
- **American English.** `sulphur` becomes `sulfur` when it becomes a row.
  Migrating the words *is* the deliberate sweep the rule asks for.
  `odour` (a field name) is a requirements call.

### `MATURATION_MECHANISMS` → split: the word becomes a row, the reconcile stays closed

- **Shape:** `microbial · photochemical · chemical · evaporative ·
  enzymatic`, across 53 rows (microbial 25, chemical 9, the other three
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

### `RECIPE_MEDIA` → derive

- **Shape:** `water | fat`, across 8 rows.
- **Reader:** `CraftingLogic.mediumCapK`. A medium's heat ceiling is the
  smoke point if `fat`, otherwise the boiling point. The medium is found
  among the inputs by material tag.
- **The lean:** derive it.
  - The ceiling is the carrying material's own first phase limit:
    whichever of smoke point or boiling point it tabulates, the lower if
    both.
  - The recipe still names which input carries the heat, by any tag.
  - A brine boil, a salt bake and a sand roast then become rows.
- ⚠ **Open:** a material with both limits (butter's water boils before
  its fat smokes). The physics says the lower limit wins. Verify against
  the shipped rows before trusting it.

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

## Collisions: siblings in flight (2026-11-06)

- **build-2 `controllers-are-io`** splits `MetabolicMixin`
  (`lib/metabolism/Metabolic.ts`) into Digesting + Eating. This build
  does not touch `Metabolic.ts`. `DissolvedAromatics.ts` and
  `Palatable.ts` are separate files.
- **build-1 `water-supply`**:
  - edits `Material.acidAttack` (10 lines);
  - adds water reading rows and checks the `ReadingCatalogue` infix.

  Small. Whichever merges second reconciles.
- **build-3 `client-surface`** rewrites `look`. A smell reading must not
  land on `look`'s augmenters (each augmenter is filtered per channel;
  see the hard constraints below).
- **The senses slate** keeps NPCs reacting to smell and smell trails
  (behavior, not vocabulary). See Non-goals.

## Non-goals, each with its destination

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

## What a drive would touch (for requirements to write properly)

- Smell and taste the peated malt and a cask whiskey: the same words as
  today, from rows.
- A test pack adds an aroma (`tar`) and a mechanism word. A player
  smells the tar, and no kernel file changed.
- A recipe cooks in a medium no kernel source names.
- `analyze` reaches the smell reading, and an instrument raises its
  ceiling.
- A dirty room smells of its dirt in the aroma rows' words.
- `lint:closed-vocabularies` reads 0 and holds there.

---

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
