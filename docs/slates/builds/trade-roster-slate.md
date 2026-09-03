# Trade roster slate — the gallery's generative vocabulary

> **Status: content design, buildable.** The closed vocabulary the
> [lineage](./lineage-slate.md) gallery generates households from. Written
> 2026-08-11 to unblock building the gallery, which needs real data before
> it needs more design.
>
> **The join rule that makes the grid generatable:**
>
> > ⭐ **Trade is not free text. Each trade names its Disciplines,
> > its plausible localities, its `Means` type and its hook shapes.**
>
> Without it the generator produces ward nurses who know smithing. With
> it, `Knows` falls out of `Trade`, and **the Discipline gaps fall out
> too** — they are exactly the Disciplines some trade needs and nothing
> provides (§ the gap report, which is the most actionable part of this
> doc).

See also: [lineage-slate](./lineage-slate.md) (the gallery, the card
schema, the incomparability doctrine) · [vocations.md](../../vocations.md)
(the demand test — *a vocation exists iff there is unmet demand*; this
roster is **upbringing**, which is a weaker test: a trade needs only to
have plausibly raised somebody) ·
[advancement.md](../../subsystems/advancement.md) (`Discipline`,
`iscedf`) · [char-gen.md](../../subsystems/char-gen.md).

⚠ **This is content-pack material, not platform.** Nothing here belongs
in the engine; it is a pack's seed set.

---

## What this closes

Four vocabularies, all small on purpose — the grid only works if every
cell is comparable in *format* and incomparable in *value*.

**`Means`** — what the household can give you. A **type, never an
amount** (the slate's rule):

`coin` · `land-share` · `tools` · `stock` · `a name` · `credential` ·
`nothing`

**`Hook`** — typed, because [prose cannot be acted
on](./lineage-slate.md#-the-hook-must-be-typed-or-it-is-decoration).
Each maps to existing machinery:

| hook | what it becomes |
|---|---|
| `debt` | a contract row |
| `feud` | a relationship edge between two person records |
| `holding` | a parcel claim |
| `favour` | a person-record edge, unsettled |
| `apprenticeship` | an employment position held open |
| `missing` | an unresolved person record |

**`Standing`** — one word: `respected` · `steady` · `rough` · `reduced` ·
`notorious`.

**`Status`** — `living` · `one gone` · `both gone`.

---

## The roster

**Legend:** ⭐ = a Discipline that does not exist yet (§ gap report).
Localities are real seeds except where marked ⏳ (designed, unbuilt).

### Land and growing

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **smallholder** | hinkley-hills, moor | agriculture, horticulture | land-share | holding, debt | the Turning |
| **herdsman** | moor, hinkley-hills | ⭐animal-husbandry, agriculture | tools | debt, feud | the Turning, Cernunnos |
| **forager** | moor, newbie-wilds | ⭐foraging, awareness | nothing | missing, favour | Cernunnos |
| **groundskeeper** | eternal-campus | horticulture, services | a name | apprenticeship | Vesta |

### Extraction and material

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **delver** | newbie-wilds/delve, ferrow ⏳ | ⭐extraction, appraisal | tools | debt, missing | Cernunnos |
| **collier** | hearthworks, moor | ⭐fuelcraft | tools | debt | the Turning |
| **smith** | hearthworks, terminus | smithing, recipe-knowledge | tools | apprenticeship, holding | Goibniu |
| **founder** | hearthworks | ⭐metallurgy, smithing | tools | debt, feud | Goibniu |
| **lineman** | substation, terminus | ⭐electrical-work | credential | favour, apprenticeship | Aletheia |

### Making

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **carpenter** | terminus, hinkley-hills | ⭐carpentry | tools | holding, apprenticeship | Goibniu |
| **mason** | terminus, eternal-campus | ⭐masonry | tools | debt, holding | Goibniu |
| **tailor** | terminus | ⭐textiles — **SHIPPED 2026-09-03** | stock | favour, debt | Vesta |
| **tanner** | terminus, moor | ⭐leatherwork | stock | feud, debt | — |
| **potter** | hinkley-hills, terminus | ⭐ceramics | stock | apprenticeship | Vesta |
| **glazier** | terminus, hearthworks | ⭐glasswork | tools | favour | Goibniu |

### Food and drink

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **cook** | the-lounge, eternal-campus | cooking, recipe-knowledge, hospitality-catering | a name | apprenticeship, favour | Vesta |
| **baker** | terminus, hinkley-hills | ⭐baking, recipe-knowledge | stock | holding, debt | Vesta |
| **brewer** | the-lounge, hinkley-hills | ⭐brewing, alcohol-tolerance | stock | debt, holding | the Turning |
| **barkeep** | the-lounge | bartending, mixology, alcohol-tolerance | a name | favour, feud | Vesta, Aletheia |
| **butcher** | terminus, moor | ⭐butchery, appraisal | stock | debt, feud | — |

### Trade and money

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **shopkeeper** | terminus/general-store | retail-sales, appraisal, business-administration | stock | holding, debt | — |
| **factor** | terminus, counting-houses | appraisal, business-administration | coin | favour, feud | — |
| **clerk** | counting-houses | ⭐bookkeeping, business-admin-law | credential | favour | Aletheia |
| **carter** | terminus/terminal, last-counted-mile | ⭐haulage | tools | debt, missing | the Turning |
| **pedlar** | last-counted-mile, moor | retail-sales, appraisal | stock | debt, missing | Cernunnos |

### Care and letters

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **ward nurse** | terminus, eternal-campus | medicine, services | a name | favour, apprenticeship | Eir |
| **apothecary** | terminus, eternal-campus | ⭐apothecary, medicine | stock | debt, favour | Eir |
| **midwife** | hinkley-hills, terminus | medicine, ⭐midwifery | a name | favour, feud | Eir |
| **tutor** | eternal-campus, university-avenue | ⭐letters, business-admin-law | credential | favour, apprenticeship | Aletheia |

### Order and risk

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **watchman** | terminus, eternal-campus | melee-combat, awareness, command | credential | feud, favour | — |
| **courier** | last-counted-mile, terminus | ⭐wayfinding, awareness | credential | missing, debt | Cernunnos |
| **tout** | the-lounge, terminus | darts, sports, appraisal | coin | debt, feud | — |

### Aether and arcane

| Trade | Places | Knows | Means | Hooks | Faith lean |
|---|---|---|---|---|---|
| **practicum hand** | practicum, eternal-campus | magic-arcana, magic-sense | credential | apprenticeship, favour | Aletheia |
| **wright** | substation, hearthworks | ⭐mechanisms, ⭐electrical-work | tools | apprenticeship, holding | Goibniu |

**34 trades**, every one filling every column.

---

## ⭐⭐ The gap report — 21 Disciplines the roster needs and the catalogue lacks

The catalogue has **41 rows, but 18 are `magic-*`** — so the entire
non-magical world runs on 23. That is why the roster keeps hitting
nothing. Each row below is `key · channel · iscedf · note`, ready to seed
on the `obj/Discipline` pattern.

| key | channel | iscedf | note |
|---|---|---|---|
| `animal-husbandry` | skill | 0811 | Crop and livestock production |
| `foraging` | skill | 0821 | Forestry; pairs with `awareness` |
| `extraction` | skill | 0724 | Mining and extraction |
| `fuelcraft` | skill | 0722 | charcoal, coke — feeds `hearthworks` |
| `metallurgy` | knowledge | 0715 | the know-*what* under `smithing`'s know-how |
| `electrical-work` | skill | 0713 | Electricity and energy |
| `carpentry` | skill | 0722 | Materials — wood |
| `masonry` | skill | 0732 | Building and civil engineering |
| `textiles` | skill | 0723 | clothes and footwear — ⭐ **SHIPPED**; `dyeing` (0711) and `tailoring` (0723) ship beside it |
| `leatherwork` | skill | 0723 | shares the code with `textiles` |
| `ceramics` | skill | 0214 | Handicrafts |
| `glasswork` | skill | 0722 | Materials — glass |
| `baking` | skill | 0721 | Food processing; `specializes: cooking` |
| `brewing` | skill | 0721 | Food processing |
| `butchery` | skill | 0721 | Food processing |
| `bookkeeping` | knowledge | 0411 | Accounting and taxation |
| `haulage` | skill | 1041 | Transport services |
| `apothecary` | knowledge | 0916 | Pharmacy |
| `midwifery` | skill | 0913 | `specializes: medicine` |
| `letters` | knowledge | 0021 | Literacy and numeracy — the read/write/scribe floor |
| `wayfinding` | skill | 1015 | Travel and leisure |
| `mechanisms` | skill | 0715 | millwright / device work |

⚠ **Verify the ISCED-F codes before seeding.** They are given from
knowledge of the 2013 taxonomy, not read from a source, and the existing
seeds set a precedent of accuracy that a wrong code would quietly break.

⭐ Note what the gap report *is*: not a wishlist, but **the exact set a
generatable gallery requires**. Every row is demanded by a trade above.
Nothing here was minted because it sounded good.

⚠ **Deliberately not minted:** `negotiation` (folds into
`business-administration`), `cleaning` (folds into `services`),
`fishing` (no locality supports it yet — add with the fishing slate).

---

## ⚠ Faith lean is a WEIGHT, never a rule

The `Faith lean` column biases generation and must never determine it.

> **If a player can conclude "delvers are Cernunnos," we have built
> essentialism** — the exact failure
> [species-slate](./species-slate.md) fights and
> [mind-slate](./mind-slate.md) bans on a different axis.

Three constraints:

1. **Every trade can produce every faith**, including `unchurched`. The
   lean shifts odds, nothing more.
2. **A meaningful share of households are off-lean** — enough that the
   pattern reads as *tendency*, not *law*.
3. ⭐ **Mixed-faith households are rare and are the memorable cards.**
   `Eir — tend the hurt / the Turning — keep the season's pace` seeds an
   equilibrium from two standards that do not agree, which is a genuinely
   good starting position.

And the one that makes the column worth having at all, from the gallery
discussion: **faith must be able to disagree with disposition.** A
household that professes *tend the hurt* and raised you `guarded, proud`
is the card that teaches the mirror before a player has met a believer.
If the generator always matches them, cut the column.

---

## Generation constraints

- ⚠ **The pair must read as a plausible household.** Two parents must
  share a locality, or have a stated reason not to. This is the real
  procgen difficulty and it is harder than generating either parent.
- **Trade × locality is the primary filter.** A delver in
  `counting-houses` is a bug; the `Places` column is the whitelist.
- **`Knows` band comes from the household, not the trade** — the same
  trade yields `novice` or `competent` parents, which is part of what
  makes two smallholder cards different.
- **Hooks are drawn from the trade's list**, never invented, so every
  hook has machinery waiting.
- **Cards are not consumed on selection** (the slate's rule) — sibling
  collisions are a generative-space problem, not a claiming mechanic.

---

## Open questions

1. **Does `Trade` need its own catalogue object**, or is it a pack-level
   YAML the generator reads? It has the shape of a data Idea
   (`obj/Trade` + `TradeCatalogue`, the `Discipline` pattern), but it may
   only ever be read at char-gen — in which case a pack resource is
   cheaper. **Lean: pack resource until something in-world needs to ask
   "what trades exist?"** — the general-store and employment surfaces
   plausibly will.
2. **Is 34 enough breadth** that two players rarely share a household?
   34 trades × ~12 localities × faith × disposition × hook is a large
   space, but the *plausible* combinations are far fewer than the
   cartesian product.
3. **Second-generation trades.** Nothing here covers a household whose
   trade is *no longer practised* — a reduced family, a closed shop.
   `Standing: reduced` implies it; the roster does not model it.
4. **Do the 18 `magic-*` Disciplines want trades at all?** Only
   `practicum hand` touches them. Either arcane households are genuinely
   rare (defensible — the Practicum is small) or the roster is
   under-serving a whole sector.
