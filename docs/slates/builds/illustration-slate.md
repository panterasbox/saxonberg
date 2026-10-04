# Illustration slate — the image is a render of the model, and the style is a row

> **Status: the PIPELINE SHIPS and the AESTHETIC is rejected.**
> `packages/server/src/tools/illustrate.ts` (260 lines) boots the engine
> against a scratch DB, builds a prompt from live composed state,
> generates with `gpt-image-1`, uploads to the content's own key and
> upserts `MediaAsset`. **19 assets exist** — 16 species, 3 locations.
> ⛔ **User verdict on the output: *"they're exactly what I asked for but
> I don't really like em. not enough color."***
> **Left:** ⭐⭐ **style as a ROW** + `StyleCatalogue` + the chain resolve
> (the gallery) · the `props:`/`cast:` stable read (a defect fix) · a
> **`thing`** prompt builder (the missing job with the best economics) ·
> per-detail plates · the **monochrome-SVG tint channel** · thumbnails as
> crops · media **ingest** (the named M3 gap) · the prompt-craft loop and
> its fixed evaluation set · an npm script + an MQL batch mode
> **Size:** **a build.** The style row is the spine; everything else is a
> builder or a crop.

**Captured 2026-10-02.**

> **User: "before we can talk about any of that we need to know how we
> actually want to use images in the client… the prompt should know
> everything we know about the object without being able to predict its
> actual runtime state when the image is served."**

---

# Part 1 — the client

## 1. One image per object is NOT all: two multipliers, two refusals

### ⭐⭐ Multiplier one — the DETAIL

`details:` is a keyword-map to prose and the crossing has **seven**;
`look lamps` is a different subject with its own sentences. The
machinery is already there: **`Detailed.ts:279` ships `perDetailRead`**,
which projects one detail's slice for focus.

> **So the crossing is not one plate. It is one establishing shot and
> seven close-ups** — the illustrated-field-guide form exactly: the
> plate, plus plates of the parts. A per-detail illustration is a *field
> addition*, not new machinery.

### ⭐⭐ Multiplier two — the KIND (which divides instead)

Keys are **shared**: `sensitivus` → `species/sapiens.png`. And the wiki
component's own example key is **`materials/oak.png`**, so a material
tier was always anticipated. One tankard image serves every tankard row.

> **Details multiply the library; kinds divide it.** Those two together
> are the whole economics, and they are why an asset library can be
> **sublinear in content**.

### ⛔ Refusal one — INSTANCES. ⛔ Refusal two — STATES.

Open/closed · lit/dark · full/empty · clean/soiled · four growth stages
is N images and a selector.

> ⭐⭐⭐ **The illustration is identity. The overlay is state.**
>
> The same split [iconography-slate](./iconography-slate.md) reached for
> icons (*shape is identity, colour is state*), arriving independently
> here. The plate shows the lamp; the state overlay says it is lit. One
> asset, N states, and the state channel costs nothing.

### ⚠ The derived-appearance boundary — and § 3 reopens it

Textiles computes colour through a subtractive dye stack **with fade**;
`magic-items` has derived appearance + descriptor banks + the
defective-copy loop; crafting has grade. A raster cannot show a
dyed-green-then-faded tunic without being generated per instance, which
is unaffordable *and* violates § 2.

**So for a raster: where appearance is derived, the image is of the
undyed archetype and the derived part stays prose.** ⭐ For an SVG, § 3
makes that restriction go away.

## 2. ⭐⭐⭐ The stable-read rule — and `props:` is the fix

> **The prompt may read anything STABLE FOR THE LIFETIME OF THE ASSET,
> and nothing else.**
>
> **In**, including derived: a material's properties, the ground's
> derived kind, the biome, `clo`, slot claims, declared lighting, epoch.
> **Out**: contents, open/closed, lit/unlit, dyed, worn, soiled,
> per-instance grade.
>
> The test is one question: *will this be the same when the image is
> served?*

⭐ The reason is mechanical, not aesthetic. **`sourceContentHash` is a
sha of the derived prompt**, so it must change when *the content*
changes and not when *the world* does. ⚠⚠ `locationPrompt` currently
reads **`getContents()`**, so **a dropped sandwich invalidates the
staleness check** — a drift detector that fires when somebody puts down
a cup is one nobody will ever read.

### The fix is `StagedMixin`

`lib/stuff/Staged.ts` declares the **authored born-with content** in
theatre vocabulary — *"staging a scene means dressing the set
(`props:`), filling it with the troupe (`cast:`), and putting them in
costume (`costume:`)"* — and `_propsStaged` / `_castStaged` are
**persistent fields.**

> **Read `props:` — what the author staged — not `getContents()`, what
> happens to be lying there.** Stable, exactly the author's intent, and
> immune to the churn.

### ⭐⭐ And `cast:` reopens *no people* — the crossing proves it

`locationPrompt`'s composition says **"no people."** But `cast:` is
*who the author staged*, and Gus is as permanent as the lamppost. The
crossing's own prose:

> *"In all the churn, one thing holds still: **the crossing guard at his
> post**, watching a road that no cart ever comes down."*

> ⛔ **The current rule makes the crossing's image contradict the
> crossing's description.** The honest rule is **no TRANSIENT people**:
> staged cast may appear because they are authored; players and
> wanderers never do. `CostumedMixin` means a cast member's appearance is
> partly authored too.

⚠ Per cast member, not a blanket flip — an NPC can die or be moved, and
per-instance portraits are deferred to recognition
([media.md § Deferred](../../subsystems/media.md)).

## 2a. ⭐⭐⭐ The reins stay central — generation is NOT bring-your-own

**Added 2026-10-04.**

> **User: "image generation is a separate thing. I wanna be able to
> control the reigns there and I dont think BYO actually does you much
> good as an author for that sorta thing."**

⭐⭐⭐ **And it was already decided.** `media.md`'s deferred list, verbatim:

> *"**in-CMS on-demand generation + a quota system** (per-author credit
> pool — **the only place generation cost needs metering**; offline
> generation is one-time and self-controlled)."*

**Four reasons it differs from the CMS's text agent**, which *is*
bring-your-own ([llm-economy-slate § 5a](./llm-economy-slate.md)):

1. ⭐⭐ **The style is a shared asset.** A style row declares a prompt
   block, a palette, an avoid list, a model floor and its supported
   channels — and **a different provider cannot honour it.** The tuning is
   against one model's behaviour; another produces something else from the
   same words. **BYO breaks the gallery's one mechanism.**
2. The output is a **durable shared artifact** — our bucket, every
   player, part of the world's look.
3. ⭐⭐⭐ **BYO would convert private money into COMMONS STORAGE
   PRESSURE** — every image is a permanent byte liability on the assets
   appropriation, so an author could spend unlimited private money to
   consume a commons ceiling faster. **Capital buying a bigger slice**,
   paying the cheap one-time part while the commons pays the forever part.
4. ⭐ Generation is **bursty and episodic** — a handful at publish, then
   never — so central funding is easy to plan and BYO solves nothing.

### ⭐⭐⭐ And why it does an author little good anyway

The author's bottleneck is not generation *throughput* — it is **style
conformance and acceptance.** Five hundred variants on your own dime do
not help if 499 miss the style row.

> **BYO buys volume where the scarce thing is FIT.**

⭐⭐⭐ And § 0's doctrine already settles what the author's lever *is* —
the prompt is **derived from the model**, so:

> **Making your room better is how you get a better picture.**

⚠ **A money lever would COMPETE with that**, adding a second path to a
better image that bypasses improving the content — which would quietly
undo the best property this pipeline has: that it is **an instrument on
content density** rather than an art budget.

### ⭐⭐ No new quota needed

Generating an image spends two things already on the grant
([attribution-slate § 7](./attribution-slate.md)): **bytes** — the
`assets` ceiling — and **dollars** — the **production** line. So the only
new mechanism is **a rate limit**, so one author cannot drain production
in an afternoon.

## 3. ⭐⭐⭐ Two render channels — raster, and monochrome SVG painted at render

> **User: "for dynamic color sometimes we want to generate a monochrome
> svg and 'paint it' on the render… so sometimes we want pngs and
> sometimes svgs."**

A flat monochrome SVG plus a **computed** colour applied as `fill` is a
**per-instance dyed tunic from one asset at zero marginal cost** — which
is a better answer than § 1's raster restriction, and it retires it.

It composes with the rule [iconography-slate § 0](./iconography-slate.md)
already established: **colour through a CSS rule on a class, never an SVG
`fill=` presentation attribute** (a `var()` in an attribute silently
paints nothing — the `Seal` pattern, four token-coloured classes on one
drawing).

**What the channel unlocks beyond dye:**

| | |
|---|---|
| **materials** | one chair shape, tinted oak · ash · iron |
| **grade / wear** | a desaturation or a stroke weight, not a new asset |
| **species** | skin and hair as tint layers over one bodyplan silhouette |
| **brands / liveries** | `BrandedMixin` resolves a mark on read; a tinted region *is* the mark |
| **the map** | already SVG by decision ([map-slate](./map-slate.md)) |

### Who decides raster vs vector

Nobody arbitrates; each party answers only what it can know:

- ⭐ **the author** declares whether appearance is **derived** — they are
  the only one who knows the dye stack applies;
- ⭐⭐ **the style row** declares **which channels it supports** (§ 6 —
  this is most of the decision);
- **the client committee** owns the render capability
  ([client-parcel-slate](./client-parcel-slate.md)).

## 4. Where images render

| surface | state |
|---|---|
| the inspection card header | ✅ ships (`CardBodies:647`, hidden on a broken key) |
| char-gen race plate · character-select portrait | ✅ ships |
| ⭐ **the wiki** — `<image key="…">`, reusing `Visible.illustration`'s key shape and the client's `mediaUrl` | ✅ **ships — a second consumer already** |
| an **image-first body** (the field-guide plate) | → [client-vocabulary-slate](./client-vocabulary-slate.md) |
| a **list-of-images body** — contents thumbnails, a species roster, a detail index | → same |
| a **lightbox** | ⭐ the one honest modal: *"I am stepping out to look"* |
| ⛔ **the transcript** | never — `registers.ts` keeps `chrome`/`display` unmapped to any transcript topic |

### Thumbnails: a crop, not a generation

> **User: "second render for thumbnails is fine we dont need tokens for
> that."**

Deterministic resize, **zero tokens** — a 1536×1024 establishing shot
simply does not read at 48px (the same failure as a 512px game icon at
16px). ⚠ It belongs wherever ingest lands, which is a **named gap**: the
wiki component records that *"three producers want to put bytes in one
bucket — the wiki, the CMS, and the offline `illustrate.ts`"*, that the
wiki *"consumes a shared media-ingest surface and does not define it
(M3),"* and that the import boundary forbids the mudlib from reaching S3
at all. **Ingest is backend-tier and unbuilt.**

---

# Part 2 — the style, and the prompt

## 5. Why the 19 are desaturated — the style is correctly implemented and wrong

Not a prompt failure. **Three independent instructions** push the same
way:

1. the style block's palette, verbatim: *"earthy palette: sage and moss
   green, dusty brown, ochre, faded slate-blue, warm grey, soft
   terracotta, cream paper white"*;
2. the `AVOID` block: **"no neon or saturated color"**;
3. the references themselves — **Potter and Shepard are both deliberately
   muted**, Shepard especially being pen-and-ink with thin washes.

> ⭐⭐ **The output is exactly the specification, and the specification is
> the thing that is wrong.** Which is itself the argument for § 6: a
> style that can be correctly implemented and still rejected must be a
> swappable row, not a constant in a tool.

## 6. ⭐⭐⭐ Style is a ROW — the biome analogy, made literal

> **User: "picking an aesthetic is sorta like picking a biome or
> something except its figuratively atmospheric instead of literally."**

Taken literally, the whole thing falls out of shipped machinery:

- a **style row** — the style block, the palette, the `AVOID` list, the
  per-job composition rules, and ⭐ **which render channels it supports**;
- **`StyleCatalogue`** warming the roster, exactly like `BiomeCatalogue`
  / `ReadingCatalogue` / `MaterialCatalogue` — ⚠ *self-warming, never an
  `Api.boot()`*;
- resolved by the **outward-walking chain**, like `getBiome()` — declared
  on a zone or locality, inherited outward, overridable per content;
- ⭐⭐ **`MediaAsset.styleVersion` stops being a scalar for a global bump
  and becomes a row reference** — *which style was this rendered in* — so
  a locality can restyle its own library and the sweep is scoped;
- ⭐ **the gallery IS the catalogue.** An author picks by naming a row;
- **a custom style is an authored row**, which needs no new feature —
  only the title to write one.

> **Row-extensible vocabulary, catalogue-warmed, chain-resolved,
> author-selectable.** The pattern this codebase reaches for every time,
> and the analogy picked it out before the mechanism was named.

⭐ It also lands lens 2 correctly: a style is **the grain** (a default an
author may change), never the law.

## 7. ⭐⭐ The coupling: the style row decides which channel you get

The sharpest consequence, and the reason §§ 3 and 6 are one decision:

> **A painterly watercolour cannot be tinted. A flat, shape-based style
> can.**
>
> Choosing Potter **forecloses the SVG channel** for that content;
> choosing a flat line-and-colour style opens it. So raster-vs-vector is
> not mainly a per-asset choice — **it is largely decided by the style
> row, which is why the row must declare its supported channels.**

## 8. Candidate directions — and the test that matters

⚠ **Evaluate a style on the WEAKEST job it must do**, never the best: it
has to carry an establishing shot, an object plate, a portrait **and** a
48px thumbnail.

| direction | colour | SVG-able | weakest job |
|---|---|---|---|
| Arthur Rackham | more, moodier | no | thumbnails — too sinuous |
| Dulac / Kay Nielsen | ⭐ jewel palettes, gold | partly | objects — too decorative |
| ⭐⭐ **illuminated manuscript / herbal** | flat jewel colours, gold | **yes** | portraits — stylised faces. *On-theme for a medieval epoch* |
| ⭐⭐ **hand-tinted engraving / botanical plate** | saturated washes over line | **yes** | atmosphere — plates are object-first. ***Literally the field-guide form*** |
| ligne claire (Hergé) | flat, bright | **yes** | atmosphere — weak at mood |
| Mary Blair / mid-century | very saturated, flat | **yes** | identification — shape over detail |
| Ghibli backgrounds | lush, naturalistic | no | objects and thumbnails |

⭐ **Reading:** a **hand-tinted plate** style is the strongest single
candidate — storybook rather than photoreal (the standing position), far
more saturated than Potter, flat enough for the SVG channel, and *it is
the illustrated-field-guide form the card surface already resembles.*
The manuscript direction fits the fiction better and portraits worse.

**And the gallery means this stops being one irreversible choice**, which
is the actual answer to the rejected output.

## 9. What the prompt may read

Today it reads **four fields** — `short · long · contents · exits` — out
of a model that can supply twenty.

### A Thing

- the row, plus ⭐ its **`extends:`** parent (resolved at read)
- ⭐⭐ **material** → the `Material` row (**175** of them) → *and what
  material links to*: `materials-response`'s resist/deliver channel
  grids, thermal properties, the five-rung ladder. **"If it's glass, give
  it everything about glass" is a template walk to
  `/stuff/idea/material/…`** — and `materials/oak.png` says the material
  tier was always meant to be visible
- **construction** — `response = f(mechanism, material, construction)`
- ⭐ **the mixin composition** (`getActiveMixins`), because each mixin is
  a *visual* fact: a `LightSource` glows, a `Sealable` has a lid, a
  `Vessel` has a mouth, a `Foldable` has hinges
- **quantities** — weight, bulk, capacity. A two-litre vessel and a 50 ml
  one are different pictures
- **slot claims** — what body part it covers, which is shape
- **grade** (crude vs masterwork), **brand** (a maker's mark)
- ⭐⭐⭐ **`Epoch`** — the closed five-word tuple on `ToolMixin`, ~10 rows,
  **and no readers at all.** *What period does this look like* is exactly
  what it is for. **The image prompt would be its first consumer**, which
  is evidence the model was right.

### A Location

Three of the richest are already derived, already stable, and **already
unread**:

1. ⭐⭐ **the ground** — every Location's floor is minted at
   `postRegister` with a **derived ten-word kind** over a five-rung
   material ladder. *The floor is a visual fact, for free, in words.*
2. ⭐⭐ **the biome** — the outward-walking chain, plus `SkyExposed`.
3. ⭐⭐⭐ **`publicLighting`.** The crossing declares
   `flux: 400, colorTemperature: 2200`. **2200 K is a painting
   instruction** — it is the colour of gaslight, sitting in the row
   unused.

Plus the seven **details** (each its own subject), **adornments** (the
crossing's paving row), `_address` → Locality → settlement type,
elevation, structure/construction for interiors.

## 10. ⭐⭐ The prompt is authored content, and it needs a review loop

> **User: "how do we actually tell the agent to apply that stuff… that's
> probably gonna be an iterative process refining the prompt and
> reviewing the result and back etc."**

### The slot structure

**Subject · Constraints · Style**, and the ordering rule is the whole
discipline:

> ⭐⭐ **The author's prose is the SUBJECT. The derived facts are the
> lighting, the material, the period and the palette.**
> **Facts constrain *how* it is rendered. Prose decides *what* is
> rendered.**

⚠ **The failure mode to design against: forty derived facts will drown
three authored sentences**, and the image will match the data instead of
the writing — which inverts lens 2, making the author's expressive
surface a footnote to the model's. So facts may **never add objects to
the scene**; they may only specify the ones the prose named.

⭐ **A cheap, checkable test for whether a prompt is well-built:** remove
every derived fact and the image should still be *the same thing, just
worse.* **If it becomes a different scene, the facts are competing rather
than constraining.**

### ⭐⭐ The precedent we have already measured

[llm-content-slate § Distinctness](./llm-content-slate.md) found the
sibling of this for text:

> *"**Distinctness is a property of the context, not of the prompt.**
> Persona prose ('you are a gruff blacksmith') is a costume over one
> distribution and **wears off within a few hundred tokens**."*
> …and *"the context block is a **perception query, never a state
> dump**."*

Both transfer exactly: ⭐⭐⭐ **an image's distinctness is a property of
the CONTENT, not of the style block** — and the Potter block is precisely
*a costume over one distribution*, which is why 19 images look like one
mood regardless of subject. **The prompt is a stable projection, never a
state dump** is § 2 arriving from a second direction.

### ⭐⭐⭐ The loop needs a CONTROL

An iterative refine-and-review loop with a changing subject set compares
nothing. So:

> **A fixed evaluation set** — the same N subjects regenerated on every
> style or prompt change, rendered as **one contact sheet.** It is how
> you see a style rather than a picture, and it is the only way to tell
> *the prompt improved* from *that subject was easier.*

The set must span the **weakest-job** axes of § 8: an interior, an
exterior, a dense room and a thin one, an object, a portrait, and every
one of them at thumbnail size.

⚠ **And it has no pass/fail.** Image judgement is taste, so the contact
sheet is **a mirror, not a gauge** — consistent with
[measurement.md](../../measurement.md) B4. The repo already thinks in
benches (`pnpm bench`, the ±6% noise floor, `test:gym`); this is the one
that reports and never grades.

⭐ The machinery it needs is small and mostly exists: `MediaAsset` already
stores `prompt`/`model`/`size`/`quality` for a **deterministic
regenerate**, and `ILLUSTRATE_SKIP_IMAGE=1` already does a dry run — so
*"show me the prompt this content would produce"* is nearly free and
should be the loop's inner step, costing nothing per iteration.

## 11. Open questions

1. ⭐⭐⭐ **Which style ships as the default row?** § 8 argues the
   hand-tinted plate; it is a taste call and the gallery makes it
   reversible.
2. ⭐ **Are per-detail plates in the demo?** Seven close-ups of one
   crossing demonstrates the field-guide idea far better than seven rooms
   at one plate each, and costs about the same.
3. **Does a style row carry per-job composition, or one block?** Per-job
   is what makes a style survive its weakest job; one block is what keeps
   a custom style authorable by somebody who is not a prompt engineer.
4. ⚠ **Where does ingest live** (M3), given three producers and an import
   boundary that keeps the mudlib away from S3?
5. **How much metadata is too much** — § 10's dilution risk is measured
   for text and *assumed* for images. The contact sheet is how it gets
   measured.

## Cross-refs

- [media.md](../../subsystems/media.md) — the shipped subsystem:
  `Visible.illustration`, `mediaUrl()`, `MediaAsset`, the generation
  doctrine (*"the image is a render of the standard-model"*), and the
  deferred list this slate inherits.
- [client-vocabulary-slate.md](./client-vocabulary-slate.md) — the card
  bodies an image-first or list-of-images layout needs; the five image
  jobs; *renderers before assets*.
- [iconography-slate.md](./iconography-slate.md) — ⭐ *shape is identity,
  colour is state*, which § 1 generalises; and the `fill:` not `fill=`
  rule § 3 depends on.
- [llm-content-slate.md](./llm-content-slate.md) § Distinctness + § Cost
  shape — the measured dilution precedent, and the token appropriation.
- [scarcity-slate.md](./scarcity-slate.md) — every generated image is a
  **permanent storage ratchet** plus a **one-time token spend**.
- [eotl-craft.md](../../eotl-craft.md) + [eotl-census.md](../../eotl-census.md)
  — ⭐⭐ why the demo images will read thin: **0.8 details/room against
  Gnomelands' 8.9.** The prompt is derived from the model, so **the
  picture's quality is a function of the content's density** — the
  pipeline is an *instrument* on it.
- [biome.md](../../subsystems/biome.md) — the chain resolver and
  catalogue shape § 6 copies.
