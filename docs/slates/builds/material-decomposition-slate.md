# Material decomposition slate — a material composes the capabilities it has (and the Idea-tree audit)

> **Status: UNBUILT** — designed at high level 2026-10-30 with the owner; census run the same day.
> What ships: one `Material` class (`lib/material/Material.ts`, 2,209 lines) carrying ~72 authored
> properties, of which a row authors what it needs and leaves the rest at sentinels; the
> capability-mixin pattern already proven by `RadioactiveMaterial` and `Muscle`, and `PotionMaterial`
> in the arcana pack; `ConsumableMaterial` as a no-field taxonomy subclass; the fixed-vocabulary rule —
> *"a curated, closed vocabulary an author selects from"* ([race.md](../../subsystems/race.md) §
> Material substrate).
> **Left:** the base keeps only what every material has · chemical identity as the class axis
> (element · compound · mixture) · capability mixins by the process that reads them · family backing
> classes · sentinel rows removed · `nutrients` split in two · electrical conductivity made universal ·
> material-side mixin names that cannot collide with the thing-side ones · wiki pages per mixin ·
> species split into person, kept and aquatic · maturation split by mechanism · the dead fields
> removed (condition `contagion`, discipline `conferrals`, sentinel `lifespanMin`)
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"I feel like over the process of many builds we've just been putting more and more properties on the
Material class, and not all of them apply to every kind of material. I think we want to start pulling
out material state into mixins and have a new taxonomy of Material backing classes that just compose
the mixins they care about — something like ElementMaterialMixin for the periodic table. … There's
gotta be some organizing principle we could break this stuff up with. And when we do that, the wiki
question becomes easier, because you can just make pages for the mixins, not each material."*

## 1. ⭐⭐⭐ Mixins, because materials are primitives **[DECIDED — the owner]**

*"I like mixins here. Who cares about expression — these are like primitive building blocks. The
content authors don't produce them, they consume them."* The fixed-vocabulary rule already says it:
growing the library is a vocabulary decision, not a content decision. So the expression lens does not
apply, and a new combination of capabilities is a kernel change — a backing class — by design.

## 2. ⭐⭐ The organizing principle **[LEAN]**

- **The base keeps only what every material has** — density, specific heat, thermal conductivity,
  appearance, keywords, tags. **The test: does every material have a real value?** A property that
  needs a zero or a `false` to mean *does not apply* belongs to a capability.
- **Chemical identity is the class axis** — **element** (symbol, atomic number, molar mass),
  **compound** (formula, molar mass), **mixture** (composition). Mutually exclusive, so a class, not a
  mixin. The owner's `ElementMaterial` instinct.
- **Capabilities are mixins, grouped by the process that reads them** — a property belongs to the
  mixin whose machinery consumes it.

## 3. ⭐⭐⭐ The census **[EVIDENCE — 2026-10-30]**

All **347** material rows, `extends:` resolved; a value counts as *authored* only if it is not a
sentinel (`0`, `false`, `null`, `[]`, `{}`, a zero-amount toxicity).

### Classes today

| class | rows |
|---|---|
| `Material` | 211 |
| `ConsumableMaterial` | 105 |
| (inherits via `extends:`) | 16 |
| `Muscle` | 11 |
| `PotionMaterial` (arcana) | 3 |
| `RadioactiveMaterial` | 1 |

### The capability groups the properties fall into

| group | rows | properties |
|---|---|---|
| **edible** | 163 | edibility, nutrient amounts, tastes, serving size |
| **solid** | 152 | hardness, toughness, elasticity, cleavability, broken template |
| **perishable** | 104 | water activity, spoilage activation energy |
| **combustible** | 59 | heat of combustion, autoignition, flammable limit, what burning imparts and produces, ash fraction, alkali share, smoke point |
| **fusible** | 60 | melting point, latent heat of fusion, cast template, chill arrows, drain setting, ruined by freezing |
| **volatile** | 52 | boiling point, latent heat of vaporization, vapour |
| **aqueous** | ~60 | solubility, crystallization, boiling-point elevation, concentration, purification by boiling, dissolved solids, pH, leaching, filtering |
| **tissue** | 48 | biological source, muscle work |
| **kinetic** | 32 | kinetics — change over time at a temperature-set rate (firing, staling, calcining): cross-cutting |
| **cleansing** | 25 | cleanser, coats a glaze lays, corrosive to |
| **seasonable** | 17 | seasoning days, green shrinkage (wood) |
| **element · compound · mixture** | 8 · 5 · 33 | symbol + atomic number · formula · composition |
| **optical** · **radioactive** · **potion** | 3 · 1 · 3 | light absorption · half-life, decay mode · dose, route, delivery |

### ⚠⚠ The combinations — the finding that shapes the build

- **77 distinct combinations** of capability groups across 347 rows.
- **34 of them belong to one row each.**
- **The 15 commonest cover 229 rows**; the other 118 rows spread over 62 combinations.

| rows | combination |
|---|---|
| 35 | edible + perishable |
| 32 | solid |
| 26 | edible |
| 17 | edible + perishable + solid |
| 16 | aqueous + edible |
| 15 | combustible + kinetic + seasonable + solid + tissue — **wood** |
| 12 | base only |
| 12 | combustible + edible — fats and oils |
| 11 | solid + tissue |
| 11 | edible + mixture + perishable + solid + tissue — meat |

**So one backing class per combination would be ~77 classes**, half of them for a single row. That is
what the existing doctrine (*"one subclass per composed combination"*) produces at this scale.

### Three more findings

1. ⚠ **Sentinel rows** — properties authored only to say *not*: `composition: []` on 297 rows,
   a zero toxicity on 254, `biologicalSource: null` on 245, `edibility: false` on 182,
   `nutrients: []` on 149, `chemistry: null` on 35. The split removes them: a material without the
   capability simply does not have the field.
2. ⚠ **`nutrients` means two things.** On food it is dietary nutrients; on ~40 non-food rows it is
   **constituents** — cellulose in wood, potassium in potash, iron in iron and its ores — which
   overlaps `composition`. Two concepts in one field.
3. **Electrical conductivity is missing on 142 rows**, yet every material physically has one
   (an insulator's is tiny). It belongs on the base with real values, not on a capability.

## 4. ⭐⭐ Family backing classes **[LEAN]**

Rather than a class per combination, a class per **family** — named for what it is (*name a class for
its composition*) — composing the capability mixins its family needs:

| family | composes | e.g. |
|---|---|---|
| **Wood** | solid · combustible · seasonable · kinetic · tissue | oak, pine |
| **Metal** (element or alloy) | solid · fusible · volatile | iron, bronze |
| **Stone and earth** | solid · kinetic | limestone, clay |
| **Food** | edible · perishable (± solid) | bread, cheese |
| **Fat** | edible · combustible · fusible | lard, oil |
| **Meat** (`Muscle`) | edible · perishable · solid · tissue | beef |
| **Solution** | aqueous (± edible, volatile) | brine, wort, lye |
| **Fuel** | combustible (± volatile) | coal, charcoal, lamp oil |
| **Glass and glaze** | solid · fusible · optical · cleansing | crown glass, lead glaze |
| … | | |

A family may compose a capability a few members leave unauthored. That residue is small and
contained, where today it is the whole table. A row that fits no family is the signal for a new family
or a split, decided against the census. ⚠ The family list above is a sketch; the build derives it from
the 15 commonest combinations and the singletons' nearest homes.

## 5. ⚠ Naming — material mixins must not collide with thing mixins **[OPEN]**

The thing side already has `CombustibleMixin` (fire), and others will collide (a *fusible* material
against a meltable good). The material-side mixins need names that say they describe a **substance's
properties**, not a thing's behavior — a convention to settle before any are written (the *name a
class for its composition, never a mixin's word* rule applies).

## 6. The wiki **[DECIDED — the owner]**

Pages go to **the capability mixins** (combustible materials: what heat of combustion means in the
game, its Wikipedia anchor), **the three chemical kinds** and **the families**, then only to materials
interesting in their own right (rubber, lye, glass). The rest are listed on their mixins' pages
([wiki-content-slate](./wiki-content-slate.md), [real-world-anchors-slate](./real-world-anchors-slate.md)).

## 7. ⭐⭐ The rest of the audit — the other Idea trees **[EVIDENCE — 2026-10-30]**

The same census over every Idea tree large enough to matter (`extends:` resolved, sentinels not
counted as authored). The question for each: **do sparse properties pile up on one class the way they
did on `Material`?**

| tree | rows | classes | distinct field-sets | verdict |
|---|---|---|---|---|
| **material** | 347 | 6 | 77 capability combinations | ⚠⚠ decompose — §§ 2–4 |
| **species** | 96 | 3 (`Species` 84, `BodyPlan` 8, `Clade` 4) | 9 capability combinations | ⚠ decompose — below |
| **maturation** | 33 | 1 | 21 | ⚠ split by mechanism — below |
| **locality** | 24 | 1 | 12 | ○ sparse, small — each sparse field is a different system attaching (water's catchment and reach, weather's pin, civics' government, energy's lighting); revisit when it grows |
| **condition** | 39 | 1 | 9 | ✅ already uses the facet shape — `toxinBehavior` / `pathogenBehavior` records on the rows that need them |
| **discipline** | 92 | 1 | 9 | ✅ healthy |
| **reading** | 50 | 50 (one class per reading) | 9 | ✅ healthy — each reading's logic is its own code; the fields are uniform |
| **biome** | 13 | 3 | 5 | ✅ healthy — its planet facts move per the [worlds slate](./worlds-slate.md) |

### Species — four capabilities, nine combinations **[LEAN]**

Universal on a species: binomial, common names, parent clade, body plan, default material, diet,
lifespan, reproductive mode, sex determination, lifecycle states, circadian band. Then:

| capability | rows | properties |
|---|---|---|
| **person** (playable) | 17 | sentient, name banks, blood groups, faculty profile, innate mixins |
| **kept** (husbandry) | 21 | butchery yield, taps (production), breeding, handling range, biddability, age curve |
| **aquatic** | 12 | breathing, respiration, habitat and its stages, feeding style |

**Only nine combinations** — 50 base only · person 17 · kept 11 · aquatic + kept 9 · and a handful
more — so a backing class per combination works here as the doctrine wrote it: *Person species*,
*kept species*, *fish*, the plain species. ⚠ Natural attacks first looked like a beast capability; the
census shows the playable species carry them too (fists), so they belong to the base for animals.
Perception and vital profiles are physically universal with defaults, so they stay on the base.

### Maturation — split by mechanism **[LEAN]**

33 profiles, 21 field-sets, one class. The universal fields (key, mechanism, input, the temperature
band) hold; the rest follow the `mechanism`: lees and strain for fermentation, the turn for souring,
the scald for dairy. **`mechanism` is already the discriminator**, so a class per mechanism (the
exclusive axis, like chemical identity) is the natural split.

### Dead and sentinel fields the audit found

| tree | field | finding |
|---|---|---|
| condition | `contagion` | authored as empty on all 39 rows, real on none — the disease slate's unbuilt field |
| discipline | `conferrals` | empty on 12, real on none — verb conferral is **retired** (MR !285); the field should go |
| species | `lifespanMin` | zero on 81 rows — and lifespans do not bite for persons (race.md) |
| species | `nameBankKeys` | empty on 24 |
| material | the sentinel rows | § 3 |

## 8. Open

1. **The family list** — derived from the census by the build.
2. **The naming convention** for material-side mixins.
3. **`nutrients`** — split into dietary nutrients (edible) and constituents (folded into composition?).
4. **The no-migration doctrine** — a class change for existing rows is a drop-the-database change,
   which the doctrine already allows.
