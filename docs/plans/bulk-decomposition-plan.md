# Bulk decomposition — `Bulkable` is continuous volume, and nothing else (plan)

> Opened 2026-09-03 inside MR !231, from the user's position: *"bulkable
> is really just for continuous volumes. all these other traits we're
> giving it for different subsystems to interoperate, those seem to be
> separate concerns which depend on bulkable but are separate from it and
> would be composed according to the content author's specific needs."*
> Landing in this MR.

## The diagnosis

`lib/bulk/Bulkable.ts` imports `../metabolism/Metabolic`. That one line is
the whole problem in miniature: the continuous-volume substrate reaching
into a consumption subsystem. It happens because two things accreted on
`Bulkable` that are not volume.

**1. `category` on the mixin** — the vessel KIND (`coupe`, `vat`, `keg`,
`sack`). A par/product-identity concern: it ties an empty vessel to the
product that is that vessel filled. Nothing about it is volume, and it is
why the cutlery is broken (below).

**2. `BulkPayload` is seven subsystems' vocabulary in one type:**

| field | subsystem that actually owns it |
|---|---|
| `name` `appearance` `keywords` | perception / description |
| `nutrients` `nutrientAmounts` `edible` | metabolism |
| `toxicity` | harm |
| `tags` | materials |
| `parts` `tastes` | crafting + the palate |
| `discipline` | advancement |
| `freshness` | spoilage |

## The pattern this is measured against

The tree already answers this at three scales — **the substrate declares a
thin seam; each subsystem contributes its own piece from its own folder; a
fold collects them:**

| seam | contributors |
|---|---|
| `fieldMeta` | 253 |
| `commandContributions` | 83 |
| `markupAugmenters` | 15 |

Nobody puts every field on one class; each mixin declares its own.
`WetMixin` does not live on `Tangible` though it needs a material.
`FreshnessMixin` does not live on `Thermal` though it reads temperature.
Each is its own mixin, in the `lib/<subsystem>/` folder that owns the
concern, and hosts compose what they need.

⚠ **`Bulkable` broke the rule for a structural reason, not a lazy one:** a
`BulkPayload` is a VALUE OBJECT, and you cannot compose a mixin onto a
data blob. So the fields went where the type was. The plan's real content
is the payload-shaped answer to "what is a mixin, for a value object".

## ⭐⭐ The split: carry the composition, derive everything else

The answer is not "distribute the twelve fields to seven folders". It is
that **eleven of the twelve are functions of one thing the payload should
carry properly.**

- `tastes` is the union of the ingredients' basic tastes.
- `tags` is the union of the ingredients' material tags.
- `nutrients` / `nutrientAmounts` / `edible` / `toxicity` are the
  ingredients' nutrition and toxins, per litre.
- `name` / `appearance` / `keywords` are the blend Material's
  presentation.

All of them derive from **what went in**. And the payload already carries
that — as `parts`, which is *"the ingredients, by their Materials' display
names"*. ⚠ **Display names, which is why nothing can derive from it.** A
name is not a handle; you cannot ask it for a taste, a toxin or a tag.

**So: `parts` becomes the composition — Material PATHS with their shares —
and it is the only thing the payload carries about what it is made of.**
Every subsystem then computes its own facts, on read, in its own folder,
from a handle it can actually resolve. `lib/bulk` imports nothing but
quantities and materials, and the seven vocabularies go home.

⭐ This is the codebase's dominant doctrine arriving somewhere it had not
reached yet: Competence bands, `TraitPosition`, `RenownStanding` and
wounds all derive on read. `Palatable`'s own doc block already states the
principle — *"nothing authors what a dish tastes like"* — and then reads a
cached `tastes` array, which is the same fact written down twice.

### What genuinely cannot derive, and is carried

Two, and each for a different reason:

- **`discipline`** — the Discipline whose recipe MADE this. A historical
  fact about an event, not a property of the ingredients: the same inputs
  worked by a cook and by a bartender are different makings.
- **`freshness`** — live state, advanced by a clock. There is nothing to
  derive it from.

These get **declaration merging**: `lib/bulk` declares the minimal
payload; `lib/advancement` and `lib/material/Freshness` each augment it
from their own folder. Typing is kept in full, each field is declared
where its subsystem lives, and `lib/bulk` still imports nothing.

## `category` → its own mixin, composed alongside

`category` is the vessel kind and the par key: what a venue claims,
counts and restocks by. It **depends on** being a vessel and is not part
of being one. It becomes its own mixin in the subsystem that owns the
venue's kit, composed next to `BulkableMixin` rather than inside it.

⭐ **The cutlery fix falls out for free.** A horn spoon is currently a
`CraftVessel` — with an interior slot it never fills, an ice charge, and a
`wash()` that throws on part of its own host set — for one reason: the
utensil kind is stored in `category`, and `category` lives on `Bulkable`,
so *"this is a spoon"* required *"this is a bulk vessel"*. Once the kind
is its own mixin, cutlery composes the kit mixins and never touches
`Bulkable`.

⚠⚠ **And it dodges the wall that stopped the first attempt.** Extracting
`soiled`/`technique`/`wash` out of `CraftVessel`'s own body produced **222
type errors, every one inside a capability pack and none in the server
tree** — packs importing `CraftVessel` through the `exports` map saw a
class no longer assignable to `Stuff`. Three fixes failed (the
`MixinConstructor<Stuff>` constraint, the inline `return class` form, the
declaration merge `Provision.ts` uses). Approaching from this end,
**`CraftVessel`'s shape never changes**, so the wall is never hit. See
[crafting.md](../subsystems/crafting.md) § the serviceware tier.

⚠ That wall is still unexplained and is worth understanding on its own —
it means any future member move off a pack-imported class is booby
trapped. Not this plan's job; named so it is not forgotten.

## Waves

- **W0 — the composition. ✅ DONE.** `parts: string[]` (display names)
  became `composition: BlendPart[]` (`materialPath` + `servings`, summed
  per material, first-seen order kept). Smaller than feared: the craft
  ALREADY held `{ material: Material; servings: number }` and flattened it
  to names at the last step, so the fix was to stop flattening. One type,
  one writer (`deriveBlendPayload`), one reader (`PalatableMixin`, which
  now resolves paths back to names for the competent band).
  ⭐ The test got more honest as a side effect: asserting *"you pick out
  lime"* now requires a lime Material to exist, where before it asserted a
  string the payload had been handed.
  ⚠ Nothing derives yet, by design — and note the live drive canNOT prove
  this wave: the ingredient line only shows at `competent`+ and the
  drive's patron is untrained. The unit suite proves the new path; the
  drive proves nothing regressed. Do not conflate them.
- **W1 — derive the palate. ✅ DONE.** `tastes` off the payload;
  `PalatableMixin` unions the ingredients' own tastes. Live proof: the
  drive's `taste stew` still reads *"It tastes sweet and umami."* — the
  identical sentence, now a fact about what went in.
  ⭐ The suite is where the shape shows: the tastes moved onto the
  ingredient Materials in the fixture, so *"sweet and umami"* is now
  root-vegetable + stew-meat rather than a two-string array the payload
  was handed. Change an ingredient and the reading changes with nothing
  else edited — which is what `Palatable`'s doc block always claimed and
  the cached array quietly contradicted.
- **W2 — derive the label. ✅ DONE.** `nutrients`, `nutrientAmounts`,
  `edible`, `toxicity` off the payload; `BlendLabel` computes them.
  ⚠⚠ The `labileAtK` care needed a carried field to survive: the
  heat-labile kill used to be applied at blend time and thrown away,
  which was only safe while the answer was frozen with it. **`cookedAtK`
  is now on the payload** — history, not composition. So is
  **`formedToxins`** (the ptomaine a spoiled batch grew: nothing in the
  composition implies it, and it rides past the heat filter because heat
  stops growth without un-poisoning what growth produced).
  ⭐ `Freshness.materialShadow` collapsed to one field, and
  `NutritionLabel`'s face and `mustBeEdible` each lost an arm — the
  fallback is inside the derivation now. Live: `Nutrition: carb 34000mg,
  protein 26000mg`, byte-identical.
- **W3 — the presentation. ⚠⚠ THE PLAN'S PREMISE WAS WRONG; needs a
  decision.** This wave assumed `name` / `appearance` / `keywords` are
  *"the blend Material's presentation"* and would derive from it. **They
  are not.** The craft sets the output slot's material to
  `GENERIC_MIXED_MATERIAL` — a generic base — and passes the name,
  appearance and keywords in from the **RECIPE**
  (`recipe.getName()`, `getOutputAppearance()`, `getKeywords()`). You
  cannot derive "hearty stew" from root-vegetable + stew-meat, and the
  material does not know it either. **A blend has no Material of its
  own.** (That also answers open question 2.)
  ⭐ Which suggests a better wave than the one planned: the payload
  carries **`recipeId`** — a canonical, unique-indexed key, and
  `RecipeCatalogue.getRecipe(id)` is SYNCHRONOUS off a warmed catalogue,
  so the sync augmenters can use it. Then `name`, `appearance`,
  `keywords` **and `discipline`** all derive from the recipe: four
  carried fields become one, and `discipline` leaves W4 early. `tags`
  stays a composition derivation (the union of the ingredients'), which
  is what the plan said.
  ⇒ **Decision wanted before building.**
- **W4 — merge what is carried.** `discipline` and `freshness` move to
  declaration merging in their own folders. `lib/bulk`'s
  `../metabolism/Metabolic` import goes; `pnpm lint:imports` is the proof.
- **W5 — `category` out.** Its own mixin, composed alongside `Bulkable`.
- **W6 — the serviceware tier.** `ServiceableMixin` + `CutleryMixin` +
  `platform/thing/Cutlery`, and `EatController` narrows on `isCutlery`
  instead of `isBulkable`. The four-step shape is already written down in
  [crafting.md](../subsystems/crafting.md).

Each wave is separately provable and separately revertible. W0 is the only
one that touches every writer; W1–W3 are one subsystem each.

## What proves it

- `pnpm lint:imports` — `lib/bulk` importing no subsystem is the
  structural end state, and the gate already exists.
- The live drive: `order stew` → `taste stew` → the label → `eat` must
  read identically before and after every wave. The palate and the label
  are exactly what a derivation would silently flatten.
- ⚠ A derived value that reads *plausibly but wrongly* is the risk here —
  an empty taste list and a wrong taste list look the same in a diff.
  Every wave asserts the SPECIFIC reading, not that a reading exists.

## Open

1. ~~Does the composition carry shares?~~ **Answered 2026-09-03: SHARES —
   "we need honest per-litre nutrition."** Carried as `servings`, which is
   the craft's own unit and the same number the label already multiplies
   by, so a per-litre reading is a division rather than a guess.
2. Does a blend Material still exist after W3, or is the blend only ever
   its composition?
3. Which subsystem owns the vessel-kind mixin — retail (the par) or
   crafting (the claim)?
