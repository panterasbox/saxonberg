# Seed and propagation slate — what next season is grown from

> **Status: PARTIAL** — opened 2026-10-31 with the owner during the cover
> build's review (MR !480). Built there: **threshed grain is seed** (wheat
> and barley are `PlantableCrop`, as cut cane already was), **yield comes
> from area and condition, not from seed** (the seed-to-yield ratio is
> derived), and **the seed drill** (a `Tool` row: half the seed, a wider
> pass). See husbandry.md § the area crop.
> **Left:** volunteers and shed grain (weeds of the last crop) · seed set
> by a crop left standing (roots and biennials) · fiber-or-seed timing
> (flax, hemp) · vegetative stock (corms, root division) · seed
> viability in store · seed-borne disease and dressing · varieties and
> selection · hybrids · a seed merchant
> **Size:** a medium build

## 1. The four ways a crop is grown again

The owner's question: *do all crops behave the same way with regard to
seed for the next season?* No, and the difference is the design.

| | what next season is grown from | examples | built? |
|---|---|---|---|
| 1 | **the harvest itself**: part of the threshed crop is kept back | wheat, barley, oats, rye | ✅ `PlantableCrop` |
| 2 | **a different part, often a different year**: seed the crop sets only if left to flower | carrot, turnip, woad (biennials: the root in year one, seed in year two); flax and hemp (pulled early for fiber, left late for seed) | ⛔ |
| 3 | **vegetative stock**: a piece of the plant, cloned | cane (setts — ✅ `PlantableCrop`), saffron (corms), madder (root division), potatoes | partly |
| 4 | **perennial**: not replanted each year | orchards, coppice, the sward, cane between replantings | ✅ (shipped as ratoon / perennial) |

## 2. What is left, and its lens

- **Volunteers and shed grain** (owner, 2026-10-31: *"2 is just about
  weeds? … we can wait"*). A crop left standing past ripe, or cut badly,
  sheds grain that comes up as a weed in the next crop. Lens 1: it makes a
  clean harvest and rotation matter. Shares a home with the field
  population slate's weed/thin (`Patch` is where a weed reserve lives).
- **Seed set by a crop left standing** (rows 2 and 3). `Growing` already
  carries flowering and seed set, and `Seed` says it may be *set by a
  flowering plant*; whether a FIELD crop left standing can set seed today
  is the first thing to check. Lens 1: a biennial teaches a life cycle a
  player can only learn by waiting a year.
- **Fiber or seed.** Flax and hemp give both from one plant at different
  moments: pulled green for the best fiber, the seed is unripe; left for
  seed, the fiber coarsens. A decision with a derivable right answer
  (lens 1), and the cordage trade's (cordage merged hemp and flax).
- **Viability in store.** Old or damp seed germinates worse. Rides on the
  moisture state spoilage already has. Lens 1.
- **Seed-borne disease and dressing.** Smut and bunt; the bought seed's
  own text says it is *dressed against the smut*. Copper-sulfate dressing
  is an 18th–19th century advance. Lens 1, 5.
- **Varieties and selection; hybrids.** Selecting the best ears is how
  landraces improved; semi-dwarf wheat (Norin 10, Borlaug) is the 20th
  century's. ⭐ Lens 5's case: an F1 hybrid does not breed true, so in a
  modern epoch the SAME verbs gain a new dynamic — seed bought every year
  again. Genetics is its own slate's (the `Seed` class names it).
- **A seed merchant.** Lens 6: the demand is there (a hectare wants
  150 kg broadcast; the general store keeps 100). Until then a farm's
  shelf selling its own grain is the honest at-scale seller.

## 3. The history behind the numbers

Wheat's harvest-to-seed ratio in Europe, and what moved it — the reason
yield is derived rather than authored:

| period | ratio | what changed it |
|---|---|---|
| Rome | ~4:1 (8–10 best land) | Columella's fourfold |
| medieval England | 3.5–4:1 | two- and three-field fallow, little manure |
| 1500s–1600s | 5–7:1 | manure, legumes in rotation (Low Countries first) |
| 1700s | ~10:1 | Norfolk four-course (clover, turnips), enclosure, Tull's drill |
| 1800s | ~15:1 | guano, nitrate, superphosphate, tile drainage, liming |
| 1900s– | 40–50:1 | synthetic nitrogen, semi-dwarf varieties, machines |

The levers the sim models: nitrogen and rotation (soil.md), drainage and
lime (ground character), and seed rate (the drill). The rest are this
slate's.
