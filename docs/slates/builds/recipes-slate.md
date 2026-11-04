# Recipes slate — declared intent, your own recipe, and the recipe that crosses into real kitchens

> **Status: UNBUILT** — designed at high level 2026-11-04 with the owner, out
> of the paper build's review (the `teaches` field on editions had no design
> behind it). Supersedes parts of
> [crafting-slate § 3](crafting-slate.md) (*spread*) and the knowledge ladder's
> "work it by hand first" gate.
> **Left:** the honesty audit of cooking and baking (first, and gating) ·
> declared intent on every cook · your own recipe written into your book ·
> nearest-recipe distance and the deviation each kind expresses · recognition
> through known-of · originality against prior art (canonical + published) ·
> publishing a recipe off the game (the public page, real units) · the
> exhibition surface (players' real-kitchen photos and video) and judgment by
> people · the food-safety invariant on publication · the recipe book as
> documents (paper) · retiring paper's `teaches`
> **Size:** a build — kernel-led (crafting's reverse-match, the recipe
> document, publication); **first consumer: cooking and baking**, preceded by
> an honesty audit of the cooking sim that is a build-sized piece of its own.
> **Out of scope, its own design pass:** **memory** — how a recipe gets into
> your head, how it fades, what you hold without a book (the owner: *"memory is
> a whole other thing to do a design pass on — we actually have real
> records"*). This slate assumes a recipe can be in your head or in your
> book and does not decide how it got into your head.

---

## 0. What already exists (verified 2026-11-04)

| piece | where | what it does today |
|---|---|---|
| the recipe as a document | `recipe` document kind, `RecipeCatalogue` | open canon: every recipe readable by anyone, resolved by id or keyword |
| the knowledge ladder | `lib/script/RecipeKnowledge.ts`, `CraftController.requireDeed` | two chronicle entries: **known-of** (reading a menu; since the paper build, reading a printed recipe or a notebook page that names one) and **made** (your first faithful hand build). `make` requires *made* ("work it by hand first"); *known-of* gates nothing |
| the manual build + reverse-match | `ManualBuildMixin`, `CraftingLogic.mintFromBuild` | a hand build is banked into a buffer (shaker, pot, trough, workpiece) and **reverse-matched** against every recipe: the right inputs in the right amounts → the real product and the *made* deed; the right inputs in the wrong **proportions** → still matched, with the error lowering the **grade**; anything else → a generic blend base (`cooked fare`, `mixed drink`) with no recipe (`recipeId === ''`) |
| grade | `lib/craft/Grade.ts`, weakest-link | the one quality scale the deviation already lands on |
| a spell's specification | `lib/magic/Memorized.ts`, `study` | the model memory will likely generalize: a **specification** held in the mind (fades, interferes, can be a defective copy) separate from **competence** (never fades). Out of scope here (memory pass) |
| paper | the paper build (MR !521) | a recipe can be printed, hand-copied (with the copyist's slips), written into a notebook (a `book` document under the writer's home), read by whoever holds it; editions carry a `teaches` field that writes *known-of* on read — **this slate replaces that** (§ 7) |
| authorship | `authoring_events` ledger, `ProvenanceApi` | who wrote a document, and when — the prior-art clock (§ 4) |
| media | `MediaAsset` provenance, the image pipeline | an uploaded picture with a provenance record — the exhibition's raw material (§ 6) |
| reaction + renown | `reactions`, `renown` subsystems | players reacting to a thing and standing earned from reception — the judgment channel (§ 6) |
| taste | the wellbeing design's taste profile | a dish's taste derived from what is in it — the in-game "exhibition" of food (§ 8) |
| food safety | `spoilage.md`: pathogen load, the kill as a rate held for a time | what decides whether a recipe as written is safe (§ 5) |

**Therefore what is genuinely new here:** declared intent; a player's own
recipe as a first-class document; distance to the *nearest* recipe (today only
an exact-set match is measured); per-kind expression of deviation; originality
against prior art; publication **out of the game** in real units; the
exhibition and judgment loop around a published recipe; the safety gate on
publication; and the audit that makes all of it honest enough to cook from.

## 1. Declared intent (decided)

**The cook says what they are making before they start** — *"beef
wellington"*, or *"something new, called X"* — whether or not they know the
recipe. The engine judges the result against the declaration:

- **a known dish declared** → the distance from that dish's canonical recipe
  becomes faults the result carries (§ 3);
- **an original declared** → the engine checks it against prior art (§ 4), and
  if it is too near an existing recipe says so: *"you've reinvented beef
  wellington."*

`make <recipe>` already names its intent; what changes is that the **hand
build** declares too, at its start. The declaration is also how a dish gets a
name the cook did not know: declaring "a pastry-wrapped beef thing" and
landing on the canonical recipe is how you find out what it is called — if you
know of it (§ 4).

## 2. Your own recipe, in your book (decided)

A hand build that is not the declared dish, or that was declared original, is
**not pot-luck**: it records **your recipe** — the inputs, the amounts, the
method (heat, time, order) — as a document in your recipe book. A recipe book
is just documents (the paper build's medium): some printed or copied, some
your own. From then on:

- you can **`make` your own recipe** repeatably — players author recipes with
  no code (lens 2);
- you can **publish** it (§ 5), **sell** copies on paper, or **keep it secret**
  (paper's possession rule: whoever holds your book holds your recipes; a
  house's secret is safest unwritten — the memory pass decides "unwritten").

⚠ **Open (O1):** "your recipe book" — a held notebook, a document tree under
your home with no object, or both (the book as one *view* of the tree, the
ledger's shape)? The paper build makes a notebook's pages a `book` document,
which leans to *both*.

## 3. Nearest, not exact — and how wrongness shows (decided, details open)

Today a build either matches a recipe exactly (proportions may vary) or falls
through. The new rule measures the **distance to the declared recipe** (or,
for an original, to the nearest one) on a few axes:

| axis | example |
|---|---|
| ingredients | missing one, an extra one, a substitute of the same category |
| proportions | already measured today (the grade) |
| method | heat reached, time held, order of steps |

**Tolerance is authored per recipe** — the **grain**: a soup forgives a lot,
bread very little. Distance zero is the real thing; within tolerance it is a
flawed version of the real thing; beyond it, your own dish.

**How wrongness shows belongs to the output's own kind**, never a central
table (lens 2): the deviation says *which* axis was off and *by how much*, and
each kind of output expresses that in its own terms.

- **food** → faults you can taste and see: *salty*, *underbaked*, *split*,
  *tough* — derived from which axis was off, read by `taste`/`look`;
- **a tool** → edge, durability, balance — mostly through the grade that
  exists;
- **a garment** → fit and finish.

⚠ **Open (O2):** the distance metric itself (weights per axis, how a
substitute counts), and whether method is measured from the build buffer
alone (`heatedToK` exists; time and order do not yet).

## 4. Recognition and originality (decided)

- **You recognize a dish only if you know of it.** Landing exactly on the
  canonical beef wellington while knowing of it names your entry *beef
  wellington* and merges it with the real recipe. Not knowing of it, you have
  made *a pastry-wrapped beef dish* nobody has named for you yet; someone who
  knows the dish recognizes it for you, or reading of it names it after the
  fact. This is where **known-of** earns its keep (lens 3a: the fiction cannot
  hand you a name you never learned).
- **Originality is judged against prior art: the canonical index AND
  published player recipes.** The authorship ledger already records who wrote
  what, when — **first to publish gets the credit**; a near-copy is told whose
  recipe it resembles. The game can then adjudicate originality, which it
  otherwise cannot.
- **The *made* deed moves** (recommended, O3): `make` needs the recipe *in
  reach* (head or book); how well you do it is skill. Making the real thing
  exactly is what merges your entry and earns the deed. "Work it by hand
  first" stops being the gate on `make` and stays the discovery path.

## 5. The recipe crosses into real kitchens (decided)

Food cannot cross the wire. **A recipe can.** Sharing a recipe scales;
shipping perishables does not.

1. A chef **publishes** a recipe from the game — a document, printable, with a
   **public page** a non-player can read.
2. Players **cook it in their own kitchens**, and post **photos or video**
   against it.
3. They judge the **recipe** directly, and the **chef through the recipe** —
   each with their own result as a personal point of reference for the chef's.

**The export is real cookery:** grams and millilitres, oven temperature, real
times, the steps in order. Wherever the game abstracts (time compression, a
single `stir`), the export says what to **really** do, not the game's
shortcut — the abstraction law, turned outward.

**⛔ The food-safety invariant (recommended, O4):** a recipe the pathogen model
judges unsafe *as written* (an undercooked hold, a cold chain broken) **does
not publish**, and says why in words. People will cook these. This is a
lens-4 decision with real stakes and reads as an **invariant**, not a grain.

⚠ **Open (O5):** which outputs export at all. Food and drink, certainly. A
tool's recipe (smithing) is an in-game recipe; whether it publishes as real
instructions is a separate question with its own safety surface.

## 6. Exhibition and judgment — the art line (decided)

- **Craft is measured against a reference** — the machine does that (§ 3).
- **Art has no reference** — the machine does not judge it. **The platform
  provides the exhibition surface; players judge; the result is
  crowdsourced.**

The exhibition for a recipe: its public page, **media attached to it**
(players' real-kitchen photos and video; the media pipeline's provenance
records who made what), and **reactions and renown** on both the recipe and
the media. A chef's standing as a cook comes through the recipes they offer
and how other people's attempts at them turn out.

⚠ **Open (O6):** inside the game client too, or only the website? Recommended:
the public page and uploads on the website, the same page readable in-game on
paper or a screen.

## 7. The paper build's `teaches`, retired

The paper build (MR !521) ships `teaches` on editions and pages: reading a
printed recipe, or a notebook page that names one, writes *known-of*. Under
this slate:

- **holding a recipe is access** — the book in reach is where `make` finds it
  (§ 4);
- **known-of** comes from what you read **about** a dish (a menu, a page, a
  conversation), and its job is recognition (§ 4);
- the `teaches` field stays until this build lands, then is replaced by the
  recipe book's lookup.

## 8. The honesty audit (FIRST — everything above depends on it)

If people cook from these recipes, the cooking sim stops being *plausible* and
must be **true enough to cook from**:

- **ingredient rows** — composition, density, water, fat, protein, starch —
  checked against real values;
- **process rules** — set points (Maillard, gelatinization, emulsion breaking,
  gluten), held times, order — checked against real cookery;
- **the export** — a sample of canonical recipes rendered to real units and
  read by a cook: would they recognize it and could they make it?
- **the verdict predicts the kitchen** — where the engine says a ratio splits a
  sauce, it really does;
- **the canonical recipes** are written by us from real cookery, never copied
  text.

Lens 1 is not a scorecard here; it is the requirement.

## 9. Lens pass

1. **Pedagogy** — cookery is derivable chemistry; the distance and the faults
   teach *why* a dish went wrong. The audit is what makes this true.
2. **Creative expression** — the ordinary case is cooking a known dish with no
   code; the bespoke case is your own recipe, published and credited.
3a. **Immersion** — you recognize only what you know of; the faults are tasted
   and seen, not told as numbers.
3b. **Participation** — the real-kitchen loop makes the cook's reputation a
   thing other players build, not the engine.
4. **Values** — the safety invariant; first-to-publish credit; secret recipes
   are allowed (paper's possession rule).
5. **Continuity** — a recipe in a book reads the same on paper or a phone;
   the epoch changes the medium, not the recipe.
6. **Economy** — cookbooks, a printed manual from the Gazette, a kitchen's
   recipe board, a chef's secret: demand for paper and for recipes as goods.
7. **Governance** — judging a person (a chef's standing) is crowdsourced
   through renown; the criterion is reception, the appeal is publishing again.

## 10. Opens

| # | question | recommendation |
|---|---|---|
| O1 | the recipe book: a held notebook, a document tree, or both | both — the notebook is one view of the tree |
| O2 | the distance metric; measuring method (time, order) | weights per axis on the recipe row; extend the build buffer for time and order |
| O3 | does `make` stop requiring the *made* deed | yes — recipe in reach gates `make`; the deed marks the real thing achieved |
| O4 | unsafe recipes: block or warn | block, with the reason in words |
| O5 | which outputs export to real kitchens | food and drink only, for now |
| O6 | the exhibition in the client or only the website | the website, readable in-game |
| O7 | prior art: canonical only, or published player recipes too | both; publication order decides credit |

## 11. Reuse ledger

| need | reuses |
|---|---|
| the recipe | the `recipe` document kind + `RecipeCatalogue` |
| reverse-match + proportion error | `CraftingLogic.mintFromBuild` |
| quality | `Grade` |
| your recipe book | paper's `book` document + `Book`; the ledger's view-of-a-tree shape (`RegisterBook`) |
| recognition | the *known-of* chronicle claim |
| prior art + credit | `authoring_events` / `ProvenanceApi` |
| exhibition | `MediaAsset` provenance; reactions; renown |
| safety | spoilage's pathogen load and kill rate |
| taste in-game | the wellbeing taste profile |
| *genuinely new* | declared intent on the build; the nearest-recipe distance; per-kind deviation expression; publication off the game in real units; the safety gate |

## Cross-references

- [crafting-slate](crafting-slate.md) § 3 (spread) — superseded in part
- [cooking-slate](cooking-slate.md) — the trade this lands in first
- [food-safety-slate](food-safety-slate.md), [spoilage.md](../../subsystems/spoilage.md)
- [paper-and-printing-slate](paper-and-printing-slate.md), [paper.md](../../subsystems/paper.md) (on `reqs/paper`)
- [crafting.md](../../subsystems/crafting.md) — the knowledge ladder, the by-hand paths
- [magic-items.md](../../subsystems/magic-items.md) — `Memorized`, the model the memory pass starts from
