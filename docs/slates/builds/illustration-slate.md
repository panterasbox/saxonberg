# Illustration slate — the image is a render of the model, and the style is a row

> **Status: the PIPELINE SHIPS and the AESTHETIC is rejected.**
> `packages/server/src/tools/illustrate.ts` (260 lines) boots the engine
> against a scratch DB, builds a prompt from live composed state,
> generates with `gpt-image-1`, uploads to the content's own key and
> upserts `MediaAsset`. **19 assets exist** — 16 species, 3 locations.
> ⛔ **User verdict on the output: *"they're exactly what I asked for but
> I don't really like em. not enough color."***
> **Left:** ⭐⭐ **style as a ROW** + `StyleCatalogue` + the chain resolve
> (the gallery) · ⭐⭐ **a declared shape per row** (wide · tall · square)
> that the generator honors and the card never crops · the
> `props:`/`cast:` stable read (a defect fix) · a **`thing`** prompt
> builder (the missing job with the best economics) · per-detail plates
> (later pass, § 1) · **generator directives** on the row (§ 2) · the **monochrome-SVG tint channel** · thumbnails
> as crops · species pictures as the KIND, for players · media **ingest**
> (the named M3 gap) · the prompt-craft loop and its fixed evaluation set
> · an npm script + an MQL batch mode · regenerating the 19 under the new
> shapes and style
> **Size:** **a build.** The style row is the spine; everything else is a
> builder or a crop.

**Captured 2026-10-02. Extended 2026-10-30** in the client-surface design
session, against `panterasbox/saxonberg@9550937c6`: the declared shape
(§ 1a), the people and containers rules (§ 2), the per-shape card rules
(§ 4) and what the style must cover (§ 8a). The card comps that use these
rules are the `Inspect-*` frames in
[`docs/design/client-surface/`](../../design/client-surface/README.md).
Related: [client-surface-slate.md](client-surface-slate.md).

## What is true today (2026-10-30)

- **Any Visible can carry one image key** (`Visible.illustration` →
  `mediaUrl()`). **19 rows use it**: 3 locations, 16 species.
- **`illustrate.ts`** builds a prompt per kind: locations from
  description + `getContents()` + exits at 1536×1024, species from
  description + body plan at 1024×1536. It writes a `MediaAsset` with
  `styleVersion: potter-v1`.
- **People show their species' portrait.** Every human player, and Dave,
  gets the same one.
- **The client center-crops room images** into a strip
  (`CardIllustration`: `max-height: 6.5rem; object-fit: cover`).
- **potter-v1 contradicts the content**, not just the user's taste:
  Dave's Bar is lit by two neon signs and is "dim" at every hour by the
  light model, and the style's avoid list says "no neon". Night,
  artificial light, industry, injury and death are all outside what it
  allows (§ 5, § 8a).

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

✅ **Decided 2026-10-30 (user): details CAN carry an image — but not in
the first pass.** *"Just getting one image per obj is a lot, details can
wait for a later pass."* The mechanism allows a plate per detail; the
first pass authors one image per object and no detail plates. (The
client-surface session had listed "a detail, which is prose" as
unillustrable; that is withdrawn. Its `Inspect-detail` comp, with no
plate, is simply the first-pass state.)

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

## 1a. ⭐⭐ The row declares its shape (2026-10-30)

Three shapes, a closed vocabulary, **chosen for where images are shown
and what they show**, not for what a model happens to output:

| shape | ratio | for | why |
|---|---|---|---|
| **wide** | 16:9 | places; long things | A scene you stand in. At unit width (400px) 16:9 is 225px tall, about a third of a card; 3:2 (267px) and 4:3 (300px) take it over. 16:9 also matches the medium card / terminal column (~704×396), the stage and the phone. |
| **tall** | 4:5 | people and creatures at three-quarter length; tall things; vertical places | Readable small: the face survives at 120–160px wide beside the description. A full figure at 2:3 puts a face at ~10px at unit width. It shows the costume, and NPC costume is authored. |
| **square** | 1:1 | most things, vignetted on bare paper | Neutral: the empty paper absorbs the object's proportions. Also the source for thumbnails. |

- The branch may supply a **default** (wide for places, tall for agents,
  square for things); the row overrides it freely (a tall clock, a long
  gallery).
- The shape rides the wire with the image key. **The client never crops
  or stretches** (§ 4 has its one rule per shape per card size).
- `MediaAsset` records the shape (it records only the pixel size today).
- **The generator honors the declaration.** gpt-image-1 outputs only
  1024², 1536×1024 and 1024×1536, so either the pipeline crops once at
  generation to 16:9 / 4:5 with the prompt composing inside that safe
  area, or it moves to a model that supports these ratios. Either way
  the crop is decided when the image is created, never at display.
- ⭐ This is the same conclusion as § 4's thumbnails from the other end:
  **every crop is decided once, at creation**, never by the renderer.
- **No image is a valid answer**, and some things can't have one: a
  corpse, whose look depends on whose body it is (runtime); a Material,
  which isn't Visible (the `materials/oak.png` key in § 1 would need a
  Visible to hang on). A detail can have one, later (§ 1).

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

### ✅ Decided 2026-10-30 (user): the AUTHOR answers it, with directives for the generator

The client-surface session wrote *"no people, including staged cast (they
come and go on shifts)"*, against this section's *"Gus is as permanent
as the lamppost"*. Neither rule is right for every row, and the engine
cannot tell which applies: a staged prop that never moves belongs in the
picture; a cast member on a shift roster does not; and an NPC who never
moves can still be murdered.

> **User: "I think we might need to start putting some directives on the
> objects that are purely for the image generator… content authors would
> be able to answer the question for themselves."**

So:

- ⭐⭐ **A row may carry directives read by the generator and nothing
  else.** They change the picture and never the world. Their first job
  is **inclusion**: which of the row's staged props and cast the picture
  shows.
- **The default**, when the row says nothing, is this section's rule
  minus the people: staged props fixed in place are in; cast, loose
  things and things placed on a host are out.
- **An author opts a staged entry in or out.** Gus goes in because his
  author says he is part of the crossing; Dave's shift staff stay out.
- ⚠ **Opting a person in accepts the risk** that the picture outlives
  them — the guard can be murdered at his post. The picture is "what this
  looks like in general" as the author wrote it, and `sourceContentHash`
  tracks the content, not the world (§ 2), so a death does not mark it
  stale. That is the author's call to make, and theirs to regenerate.
- Lens 2 (creative expression) chose: the author is the only one who
  knows whether a staged thing is part of the place.
- **Open** (§ 11 q6): the shape of the directive block, and what else
  lives in it (a composition note? an explicit omission of something the
  prose names?).

### The rest of the rule, by kind (2026-10-30)

The builder's inputs, as the 2026-10-30 session listed them: the
description, `Staged` props, `fixedInPlace`, adornments, costume rows, and
the row's own authored fields (brand, label, material) — plus § 9's
derived-but-stable facts. **Never live containment.**

- **Places**: the authored description plus what the row stages as
  fixed — fixtures, adornments, props fixed in place. **No loose
  things**, and nothing placed on a host.
- **NPCs**: three-quarter length (tall, § 1a) in their authored costume
  (Dave's comes from the costume row he extends).
- **Players**: no per-character image. They show their **species'
  picture**, which must therefore show **the kind in neutral dress**,
  not an individual. The card's "Wearing" list carries what they
  actually wear.
- **Containers and vessels**: the container as authored, without
  contents — an empty pint, a bare back-bar. Rows that author initial
  contents (the gin bottle's 0.75 L) show their label and seal with the
  fill left unreadable. **Never paint a level the thing will drift
  from.**
- ⭐ **Prose bugs become image bugs.** A description that claims runtime
  state ("ranked with bottles" on the back-bar) will be painted. Fix the
  prose — the client-surface slate lists the ones its trace found.

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

### One rule per shape per card size (2026-10-30)

The client reads the declared shape (§ 1a) and never crops. Card sizes
are the client-surface slate's width classes:

| shape | unit (~352–450) | medium (~704) |
|---|---|---|
| wide | full card width | a block |
| tall | a column beside the description | the same, larger |
| square | beside the description | the same, larger |

- ⚠ Today's `CardIllustration` center-crop (`max-height: 6.5rem;
  object-fit: cover`) retires.
- The character-creation species slot (`CharGenStage`, 3:4 today) moves
  to **4:5**, so one species image serves char-gen and the card.
- Open: whether the image starts collapsed at unit size when the card is
  short on room (client-surface slate q4).

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

## 8a. ⭐⭐ What the style must cover (2026-10-30)

The client-surface session found potter-v1 failing on **coverage**, not
only on color: whatever row ships as the default must be able to draw

- **night**, and **artificial light** — lamps, gaslight (§ 9's 2200 K),
  **neon**, mana light;
- **industry** — the brickfield, the smelter, the glasshouse;
- **injury and death**;
- **a genre-plural world** — the realm is not one epoch or one region.

And it must sit inside the design system's civic frame, which confines
storybook warmth to **plates in a paper mount** (the 2026-08 handoff's
art direction). Open: one house style, or a base with regional or epoch
inflections — which § 6's chain resolve already makes expressible. ⭐ The
style guide is the **user's** to write; the row is the mechanism that
holds it. Work it as prompt blocks (STYLE, AVOID, per-shape composition,
§ 11 q3) judged on § 10's contact sheet; the session proposed **Dave's
Bar, Dave and the Crowsfoot gin bottle** as the first three subjects —
one of each shape.

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
2. ✅ ~~Does a detail get a plate?~~ Yes, later: the mechanism allows
   it; the first pass is one image per object (§ 1, decided 2026-10-30).
3. **Does a style row carry per-job composition, or one block?** Per-job
   is what makes a style survive its weakest job; one block is what keeps
   a custom style authorable by somebody who is not a prompt engineer.
4. ⚠ **Where does ingest live** (M3), given three producers and an import
   boundary that keeps the mudlib away from S3?
5. **How much metadata is too much** — § 10's dilution risk is measured
   for text and *assumed* for images. The contact sheet is how it gets
   measured.
6. **The generator-directive block** — decided that the author answers
   inclusion (§ 2); open: where the block sits on the row, how it names a
   staged entry, and what else belongs in it.
7. **Disguise** — the picture should follow the disguise, the way the
   name does. An unidentified thing is fine if its picture is drawn from
   its appearance row, like its prose.
8. **Who may generate** — § 2a keeps generation central. Whether a player
   may *upload* an image for their own row is a separate question: cost,
   moderation, and attribution through the provenance ledger.
9. **Thumbnails** for glance chips and headers — § 4's deterministic
   crop, taken from the square shape or from a declared focal point, or
   none.

## Lens pass (2026-10-30)

1. **Pedagogy** — neutral.
2. **Creative expression** ⭐ — the author decides what gets a picture
   and its shape, and picks the style row; nothing is forced by kind.
3. **Immersion** ⭐ — drawing only authored, stable state is what keeps a
   picture from ever contradicting the world's live words.
4. **Values** — no player is pictured as an individual they didn't
   author.
5. **Continuity** — a picture is of the row; it survives every runtime
   change by not depicting it.
6. **Economy** — generation costs money per row; regenerating the
   library is one-time; § 2a keeps the forever cost (storage) off private
   money.
7. **Governance** — moderation, if players ever upload.

## Cross-refs

- [client-surface-slate.md](client-surface-slate.md) — the card sizes
  § 4's per-shape rules are written against, and the prose bugs § 2 says
  become image bugs. Comps: [`docs/design/client-surface/`](../../design/client-surface/README.md).

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
