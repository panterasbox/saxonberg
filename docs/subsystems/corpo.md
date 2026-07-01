# Corpos: the mark and the fault line

A handful of fictional megacorps own most of the private sector. This
subsystem is the **mark substrate**: the corpos and their product brands as
authored reference-identities, a **brand → corpo** ownership resolution, and
a per-product **mark** so every branded thing in the world is *truthfully
owned* ("a product of Veshko"). Driven into existence by Dave's Bar needing
its back-bar booze attributed to real corpos; general world-content well
beyond it.

This is the **near-term** half of the corpos slate. The player-facing
faction gameplay — the multipolar approval vector, competition, sponsorship —
is deferred (see [Deferred](#deferred)). Seeded by
[corpos-slate.md](../slates/builds/corpos-slate.md); first consumer is
[daves-bar-slate.md](../slates/builds/daves-bar-slate.md).

The recipe mirrors the advancement **Catalog**
([advancement.md](./advancement.md)): a singleton catalogue over pure-data
leaf `Idea` templates, keyed on a durable `key`, queried by a thin gated
Api, referenced cross-Stuff by a key string resolved on read (the
`Material` / `Species` reference-identity pattern).

## The mark is diegetic, not the provenance ledger

The corpo mark is **in-fiction brand-ownership** — "this bottle is a product
of Veshko." It is **orthogonal** to the `AuthoringEvent` provenance ledger
([provenance.md](./provenance.md)), which records the *real-world* author of
a template. The slate's "riding the provenance/maker's-mark layer" is
thematic framing; this subsystem does not read or write `authoring_events`.
A corpo is a content reference-identity; an author is an account.

## Two leaf tiers

Both are pure-data leaf `Idea`s authored as templates and read by the
catalogue from `template.data` — **never cloned as live Stuff** (the
`Discipline` / `Topic` discipline).

- **`Corpo`** (`lib/corpo/Corpo.ts`, templates under `/lib/corpo/Corpo/`) —
  one megacorp. Fields: `key` (durable join), `label`, `sector`, `ethos`
  (the load-bearing culture slot), `aesthetic`, `temperament` (the player
  temperament it magnetizes), `description`, and **`rivals`** (a list of
  corpo `key`s — the fault-line edge). A corpo is distinguished by
  *sector + ethos + aesthetic*, **not** Good/Evil — the fault line is
  tribal, not moralistic.
- **`Brand`** (`lib/corpo/Brand.ts`, templates under `/lib/corpo/Brand/`) —
  one product line. Fields: `key`, `name`, **`owner`** (the owning corpo
  `key`, or `''` = independent), `category` (the honest product category —
  `gin`, `vodka`, `whiskey`), `positioning` (an authored label, **data
  only** — the price→quality economics belong to the bar / economy builds),
  and `descriptor`.

### `owner === ''` is the independent

A brand with an empty `owner` is a real, named brand carried by **no** corpo
— the microdistiller / family operation (Crowsfoot Gin). The independent
path falls out of the model as the *absence of an owner edge*, not a
special-cased second mechanism (no `Independent` pseudo-corpo). The `''`
sentinel mirrors `Discipline.iscedf: ''` ("no anchor") and round-trips
cleanly through the descriptor coercer. An independent brand resolves to a
**null corpo** — the absence is itself legible.

### `key`, not templatePath, is the join

Marks, the `owner` edge, and `rivals` edges all reference corpos/brands by
durable `key` (`'veshko'`, `'volk'`), distinct from templatePath — so
re-pathing / re-parenting the canon (additive evolution) never invalidates a
stamped product or an authored edge. The `Discipline.key` / `Topic.topic`
precedent.

## The catalogue, logic, and Api (the three-part split)

The advancement-precedent three singletons:

- **`CorpoCatalogue`** (`obj/CorpoCatalogue.ts`, `/obj/CorpoCatalogue`) — the
  read-only **data-cache** singleton (`PostRegistrationMixin(Idea)`). At boot
  `postRegister` scans the `Corpo` and `Brand` leaf templates from the
  `domain` collection into two descriptor maps keyed by `key`, then builds a
  derived **portfolio index** (corpo key → owned brand keys) — the "portfolio
  is the forward edge" projection as a cheap precomputed inverted index. A
  *Catalogue* (holds authored data), not a Registry (holds code) — per the
  [grouping.md](./grouping.md) convention. Warmed by an entry in
  `bootstrap.ts`'s `bootstrapManifest`. Singleton-destruct refusal.
- **`CorpoLogic`** (`obj/api/CorpoLogic.ts`, `/obj/api/corpo`) — the gated
  logic singleton. Reads only the in-memory catalogue (no per-owner Mongo →
  **no connection guard**, unlike `AdvancementLogic`). Internals are
  module-private free functions so there are no intra-singleton `this.x()`
  calls to trip the gate; each public method carries
  `FromModule('api/corpo#CorpoApi')`.
- **`CorpoApi`** (`api/corpo.ts`) — the thin forwarding shell, resolving the
  HMR-able logic via `StuffApi.singletonSync`; ends in
  `SecurityApi.decorateApiClass`.

### `CorpoApi` method surface

| method | role |
|---|---|
| `corpoOfBrand(brandKey)` | brand key → owning corpo; **independent / unknown → `null`** |
| `corpoOf(obj)` | a `Branded` Stuff → its corpo (reads the mark via the method contract) |
| `brandOf(obj)` | a `Branded` Stuff → its brand descriptor |
| `getBrand(brandKey)` / `getCorpo(corpoKey)` | key → descriptor |
| `portfolioOf(corpoKey)` | a corpo's brand portfolio (the forward edge), resolved to descriptors |
| `rivalsOf(corpoKey)` | a corpo's rivals, resolved to descriptors (unknown keys dropped) |
| `listCorpos()` / `listBrands()` | the full rosters |

## The mark: `BrandedMixin`

`lib/corpo/Branded.ts` is the per-product mark. A branded Stuff carries the
durable `_brandKey` of one `Brand`; `getBrand()` / `getCorpo()` resolve on
**each call** through `CorpoApi` (HMR-safe — no cached instance, the
`Material` cross-ref precedent). An empty `_brandKey` is unbranded; a brand
whose `owner` is empty resolves to a `null` corpo.

Two surfaces beyond the accessors:

- **MQL visibility** — `static subscribableFields` projects two flat fields,
  `brand` and `corpo` (the corpo key is `null` for an independent), keyed on
  `_brandKey`. The method-derived live-query projection seam `Tangible` uses
  for `bulkMaterial` — **not** a redundant `PropertiedMixin` prop (the
  inter-Stuff method-only contract).
- **In-world perception** — `static markupAugmenters` appends a *derived*
  corpo line to the host's long description at render time ("`Volk` — a
  product of Veshko."; independents read "an independent label, carried by
  no corpo"). Derived, so it stays truthful even if the brand is re-pathed —
  the same augmenter slot `Visible` / `Detailed` contribute through, folded
  by `Mml.augment`.

`Branded` is general (any Stuff can be marked — a bottle, later a venue or an
`Adornment`). **`BrandedBottle`** (`lib/corpo/BrandedBottle.ts`,
`BrandedMixin(Thing)`) is the minimal composed class the proof-demo bottles
use — a branded object **only**: it deliberately does **not** model
booze-as-bulk (`Bulkable`); working bottles and the back-bar surface are the
bar build's job.

## Authored content (v1, the booze slice)

- Five corpos: **Veshko** (Ruthless Optimizer), **Goodkin** (Paternalist,
  floats apart — empty `rivals`), **Vionne** (Prestige House, rivals Hollis),
  **Hollis** (Populist, rivals Vionne), **Aevex** (Disruptor, rivals
  Veshko). The two mutual rivalry pairs (Vionne↔Hollis, Veshko↔Aevex) encode
  the fault-line map; "Independents vs all" is structural (the absence of an
  owner), not an edge.
- Six booze brands: Volk (Veshko), Goodkin Reserve (Goodkin), Vionne Noir
  (Vionne), Old Hollis (Hollis), aevex zero (Aevex), and **Crowsfoot Gin**
  (independent — empty `owner`).
- Two proof-demo bottle templates under `/lib/corpo/demo/` — a Volk bottle
  (resolves to Veshko) and a Crowsfoot bottle (resolves to a null corpo) —
  proving end-to-end mark resolution + the derived perception line.

The `rivals` edges are **authored canon with no runtime consumer this build**
— the fault-line map is real and queryable, but nothing reads it yet (the
`Discipline`-edge precedent: graph real, consumption deferred).

## Deferred

The player-facing cross-cutting-axis build (corpos-slate § Deferred): the
**multipolar approval vector** (signed per-corpo standing, conduct-driven
affiliation, the independent path as a region of approval-space),
competition / territory, sponsorship (corpos sponsoring guild branches /
venues / shops), and approval → benefit/access conversion. Portfolios beyond
booze (augments, food, tools, media) are authored as consumers need them.
The price ≠ quality economics belong to the bar / economy / crafting builds.

## Cross-references

- [corpos-slate.md](../slates/builds/corpos-slate.md) — the model + the
  authored roster (canonical home)
- [daves-bar-slate.md](../slates/builds/daves-bar-slate.md) — the first
  consumer (back-bar booze attribution)
- [advancement.md](./advancement.md) — the Catalog recipe this mirrors
  (`DisciplineCatalogue` over pure-data leaf `Idea`s)
- [provenance.md](./provenance.md) — the `AuthoringEvent` ledger (orthogonal:
  real-world authorship, **not** the diegetic corpo mark)
- [grouping.md](./grouping.md) — the catalogue (data) vs registry (code)
  naming convention
- [collections.md](./collections.md) — the method-only mixin surface
