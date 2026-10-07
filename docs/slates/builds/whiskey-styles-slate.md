# Whiskey as a PRODUCT — styles, blending, cask and age

> **Status: ABSORBED** — built by MR !336's second wave
> (→ [fractionation.md](../../subsystems/fractionation.md) ·
> [maturation.md](../../subsystems/maturation.md) ·
> [bulk.md](../../subsystems/bulk.md)): peated malt, grain whisky, the
> vatting recipe, `imparts` on the cask, `productAtFraction` and the age
> statement all shipped, and the drive is green.
> **Left:** nothing in this slate's own scope. Two tails went elsewhere —
> the aroma vocabulary wanting rows → [non-visual-senses-slate](./non-visual-senses-slate.md),
> and a fuel-aware burner (so smoke is DERIVED from the fire rather than
> declared by the recipe) → the fire/energy slate.
> **Size:** a build — done.

---

## Why this exists

MR !336 shipped the whiskey **vertical** — malting → mash → ferment → a
fractionating still with an ordered fraction schedule, a per-litre
`dissolvedToxins` dose, a harm row at the first band crossing, and a cask
that ages new-make at the cut's grade and no better.

⚠⚠ **It makes distillation, not whiskey.** The user's review found it in
one question: *"do we have blends vs single barrel/malt? scotch / irish /
bourbon / canadian?"* Today there is **ONE `whiskey` material, ONE aging
profile, ONE oak cask**. A bottle differentiates by **grade and dose, and
nothing else**. No peat, no grain whisky, no vatting, no cask character,
no age statement.

⭐ And the whiskey vertical's own lens pass (in its requirements doc,
retired at the sweep) had already written the charge down, unanswered —
quoted here because the quotation is the only part that still matters:

> *"with six rungs, which one decides the outcome? …If the cut decides
> everything and the other five are corridors, then five rungs are
> ceremony and the build is a chemistry demo wearing a supply chain."*

**This slate is the answer to that gap.** The user's instruction:
*"build it all… I wanna know all this works before we move on because I
doubt I'll come back to it any time soon."*

---

## ⭐⭐ Grounding — VERIFIED by opening files, 2026-10-05

Every line below was checked against the tree. Use it; do not re-derive.

### Peat ships, complete

- **`/stuff/idea/material/organic/peat`** (base-library,
  `content/stuff/idea/material/organic/peat.yaml`) —
  `tags: [organic, earth, solid, fibrous, fuel]`,
  `autoignitionTemperature: 500`, `heatOfCombustion: 15`,
  `waterAbsorptionCapacity: 300`, `density: 1100`.
  ⭐ Its own comment: *"a turf heats a hearth and a kiln."*
- **`/trade/quarrying/thing/turf`** — a cut brick, `mass: 4`, a 100 %
  `fuel` reserve, `_materialPath` → peat. ⚠ `moisture: 1` by default: an
  as-cut turf **refuses the flame** (*"It's too wet to catch."*) until the
  weather has had it a fortnight. Drying is already modelled.
- A `turf-bank` location ships in world-seed;
  `/trade/quarrying/location/Turbary` is its class.

⭐⭐ **So peated malt is derivable from shipped content**: kiln the green
malt over turf instead of wood, and the smoke is in the barley. Lens 1's
derivable-world test passes on the strongest possible terms — nothing has
to be asserted, the player can work it out from the fuel.

### Cereal grains — only two

| material | path | tags |
|---|---|---|
| barley grain | `/stuff/idea/material/food/barley-grain` (trade-farming) | food, grain, cereal, **barley**, brewing, feed |
| wheat grain | `/stuff/idea/material/food/wheat-grain` (trade-farming) | food, grain, cereal, **wheat**, feed |

⛔ **No rye, no corn/maize, no oats anywhere in the tree.** So bourbon and
rye whiskey are NOT reachable without new crops (a farming content lift —
a crop row, a plant row, a material). ⭐ But barley vs wheat is exactly
the **malt whisky vs grain whisky** distinction, which is the one that
makes blending mean something.

(The `barley` identity tag was added by MR !336; `wheat-grain` already
carried `wheat`, which is the precedent that justified it.)

### Casks and wood

- **Ten wood species** ship under `/stuff/idea/material/wood/`: oak,
  maple, birch, beech, ash, elm, pine, hazel, willow, yew.
- **Both shipped casks are oak**, `category: cask`,
  `closure: liquidTight`, `open: true`:
  `trade-brewing/.../thing/cask.yaml` (50 L) and
  `trade-distilling/.../thing/cask.yaml` (25 L).

### ⭐⭐ The style precedent — unambiguous

Shipped trades differentiate a product into styles as **separate
MATERIALS reached by separate MaturationProfiles, keyed by a different
INPUT**:

- **winemaking** — `red-must` → `red-wine` profile → `red`;
  `white-must` → `white-wine` → `white`; plus `sparkling-conditioning`
  and `mead`. Materials: red, white, sparkling, mead, dry-vermouth,
  sweet-vermouth, wine-lees, wine-vinegar, pomace, the musts.
- **brewing** — `ale` / `lager` materials, `ale` / `lager` profiles, and
  ⭐ distinct `ale-culture` / `lager-culture` **strains**: the yeast is
  the differentiator, which is correct and is the model to copy.

### ⭐⭐⭐ Blending already works — it is a RECIPE

`trade-winemaking/content/recipes/dry-vermouth.yaml` takes **two bulk
inputs plus an item slot** and emits one bulk output:

```yaml
inputSlots:
- { slot: wine,      category: white,          measureL: 0.6 }
- { slot: spirit,    category: neutral-spirit, measureL: 0.12 }
- { slot: botanical, kind: item, category: juniper, count: 1 }
outputApplication: bulk
outputMaterial: /trade/winemaking/idea/material/dry-vermouth
```

So vatting malt + grain into a blend needs **no new mechanism**.

⚠⚠ **And it MUST be a recipe, not a pour.** `BulkableApi.transfer`
declines cross-material pours, so two different whisky materials can
never be combined by pouring. That constraint is what decides the whole
shape: styles are materials, and blending is a craft act.

### ⚠ The one piece that may not be pure content

`MaturationProfile` keys on the **liquid** (`inputCategory`) and has **no
field for the vessel's wood or char state**. So "an oak cask behaves
differently from a charred one" has nowhere to live today. Options for the
planner: a new profile field that requires/reads the host vessel's
`_materialPath` or `category`; or cask-as-input-category; or something
better. **Decide it and say whether it is a kernel change.**

### Other facts worth having

- `lib/fractionation/FractionSchedule` matches a schedule to a charge by
  the charge material's **TAGS** via `inputCategory`. ⭐ So a new wash
  material with its own tag gets its own schedule for free — a grain wash
  or a peated wash needs no code.
- `trade-fuel` ships a `char` verb, but it makes **charcoal from wood**
  (`recipes/charcoal.yaml`, an item-slot charge of 8 wood). It is not a
  vessel-toasting mechanism and should not be confused for one.
- `dissolvedToxins` (MR !336) is a per-litre concentration on
  `BulkPayload` that blends by volume on every pour and scales with litres
  at ingest. ⭐ **Peat phenols are really measured in ppm and really do
  blend when whiskies are vatted** — the same SHAPE. Today dissolved
  toxins has ONE consumer; the repo rule is *promote at the third
  consumer*. Worth deciding whether phenols generalise that field or get a
  sibling.

---

## Scope to plan

1. **Peated malt** — kiln green malt over peat rather than wood; the
   smoke survives into the spirit.
2. **Grain whisky** — wheat as the second cereal, so malt and grain
   whisky are different products.
3. **Blending** — a vatting recipe on the vermouth shape; the blend's
   grade and character derive from what went in.
4. **Cask character** — a second wood or a charred cask, and the
   mechanism that lets the cask matter at all.
5. **Age** — whether an age statement is expressible, given the cask
   profile already runs on a clock.
6. **The seven lenses over whiskey AS A PRODUCT**, and an answer to the
   recorded gap above.

### Out, and why

⛔ **Bourbon / rye / Canadian** — they need corn, rye and oats, which do
not exist as crops. That is a farming content build, not this one. Say so
rather than faking it with a renamed barley.

---

## Hard constraints for the plan

- ⛔ No new Mongo collections. No migrations. Materials are a closed,
  curated vocabulary — adding one is fine; inventing a mechanism to avoid
  adding one is not.
- Prefer ROWS to code; state per wave whether it is content-only.
- `lint:menu-staff`: any board line a venue offers must be makeable by
  somebody seated there.
- Every new Thing row authors `mass`. Every new material a recipe slot
  targets must carry the tag that slot names, or the slot **fails closed
  and silent**.

---

## ⚠ The planner brief — SPENT, and cut at the sweep

This slate carried a verbatim brief for the Fable planner. The plan it
asked for was written, built to a green drive, and retired at this sweep,
so the brief is a set of instructions for work that is finished. ⭐ It is
cut rather than kept: a slate's job after absorption is to record what was
decided and why, and a stale instruction reads as outstanding work.

What the brief asked to be resolved, and where the answers live now:

| it asked | answer |
|---|---|
| how cask character is expressed, and whether it is kernel | [maturation.md § `imparts`](../../subsystems/maturation.md) — a kernel field on the VESSEL, not the profile and not the wood |
| whether peat phenols generalise `dissolvedToxins` | [metabolism.md § Aroma](../../subsystems/metabolism.md) — a sibling field; the *arithmetic* was promoted, not the field |
| what a blend's grade and character derive from | [bulk.md § History](../../subsystems/bulk.md) — weakest-link grade, volume-weighted character, **min**-folded age |
| whether an age statement is expressible | ✅ built, at the user's direction over the plan's recommendation to defer |

## Cross-references

- [fractionation.md](../../subsystems/fractionation.md) — the cut's
  substrate, and where the predecessor's build record graduated to
- ⚠ the vertical's requirements doc is retired; its unanswered lens gap is
  quoted in full above, and the answer is `aromaticCarry`
  ([fractionation.md](../../subsystems/fractionation.md))
- `docs/subsystems/fractionation.md` — the cut's substrate
- `docs/subsystems/maturation.md` — profiles, the input-band cap
- `libations-slate.md` — holds the grappa/pomace finding from !336
