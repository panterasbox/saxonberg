# Corpos (marks + booze portfolios) — requirements

The world's private sector is owned by a handful of fictional megacorps.
This build delivers the **mark substrate**: corpos and their brands as
authored **reference-identity `Idea` leaves** (the `Material` / `Species` /
`Discipline` shape), a **brand → corpo** ownership resolution, and a
per-product **mark** so every branded thing in the world is *truthfully
owned*. It is driven into existence by Dave's Bar needing its back-bar booze
attributed to real corpos; the substrate is general world-content well beyond
the bar.

This is the **near-term** half of the corpos slate only. The player-facing
faction gameplay — the multipolar approval vector, competition, sponsorship,
benefits/access — is explicitly deferred (see Non-goals).

Seeded by [corpos-slate.md](../slates/builds/corpos-slate.md); first consumer
is [daves-bar-slate.md](../slates/builds/daves-bar-slate.md). Mirrors the
Catalog recipe just shipped in [advancement.md](../subsystems/advancement.md)
(`DisciplineCatalogue` over pure-data leaf `Idea` templates) and the
reference-identity pattern of [Material](../../packages/server/src/mud/lib/material/Material.ts).

## Goals

- **A corpo is an authored reference-identity.** Each of the five corpos is a
  pure-data leaf `Idea` (`Corpo`) authored under a stable template path,
  keyed on a durable `key` (≠ templatePath), carrying its sector-of-origin,
  ethos, aesthetic, and the temperament it magnetizes — read as canon, never
  cloned as live Stuff.
- **A brand is an authored reference-identity that resolves to one corpo (or
  none).** Each booze brand (Volk, Goodkin Reserve, Vionne Noir, Old Hollis,
  aevex zero, Crowsfoot Gin, …) is a pure-data leaf `Idea` (`Brand`) carrying
  its `owner` corpo `key` — **unset = independent** (a named small-batch brand
  with no corpo mark). A corpo's **portfolio** is the forward edge: all brands
  it owns.
- **Every branded product carries a queryable mark.** A `Branded` capability
  mixin stamps a Stuff with a `brand` key; the mark resolves on read through
  the catalogue to its brand and (transitively) its owning corpo. Independent
  brands resolve to *no* corpo — the absence is itself legible.
- **The rivalry map is authored canon.** Each `Corpo` carries a typed `rivals`
  edge (Vionne↔Hollis, Veshko↔Aevex, Goodkin floats apart, Independents-as-
  outsider). Authored and queryable now; no runtime consumer this build (the
  Discipline `requires`/`specializes`/`synergizes` precedent — graph real,
  consumption deferred).
- **A gated query surface.** A `CorpoApi` (thin, typed, gated forwarding
  shell over a `CorpoCatalogueLogic`-style singleton) answers: resolve a
  brand → its corpo, a Stuff's mark → its corpo, a corpo → its portfolio,
  list corpos / brands, read rivalries. The mark is **MQL-visible** so brands
  and corpo ownership are queryable from in-world tooling.
- **The mark is observable in the world.** A branded product's perception
  surface reveals its brand and corpo (so a bottle on the shelf reads as "a
  product of Veshko"), and the resolution is provable end-to-end on real
  authored content.

## Non-goals

- **The player ↔ corpo approval vector.** Signed per-corpo standing,
  conduct-driven affiliation, the "factional identity = pattern across
  corpos," the independent path as a region of approval-space — all deferred
  to the cross-cutting-axis build (corpos-slate § Deferred). This build
  authors *no* standing, regard, or renown scoped to corpos.
- **Competition, territory, and sponsorship mechanics.** Market-share
  contest, corpos sponsoring guild branches / venues / shops, approval →
  benefit/access conversion. Deferred.
- **Portfolios beyond booze.** Augments, food, tools, media product lines.
  Authored later as consumers need them; this build authors the booze slice
  only (corpos-slate § Open).
- **The price ≠ quality economics.** A brand may carry an authored
  *positioning* label as data, but the price→quality→verdict economics
  (appraisal skill, NPC-floor vs microdistiller pricing) belong to the bar /
  economy / crafting builds (daves-bar-slate § Ingredients).
- **The full back-bar fit-out.** Booze-as-bulk (`Bulkable` working bottles on
  the back-bar surface), tap handles / neon as mark-bearing `Adornment`s,
  `serve … with <brand>` — the bar build's job. This build authors only a
  couple of branded bottle templates as a *proof demo* that the mark resolves.
- **Built on the `AuthoringEvent` provenance ledger.** The corpo mark is
  **diegetic brand-ownership** (in-fiction "made by [Corpo]"), a data
  reference-identity. It is **orthogonal** to the `AuthoringEvent` ledger
  ([provenance.md](../subsystems/provenance.md)), which records real-world
  authorship of a template. The slate's "riding the provenance/maker's-mark
  layer" is thematic framing; this build does not read or write
  `authoring_events`.

## Surface decisions

### Two leaf tiers: `Corpo` and `Brand`

A corpo and a brand are **distinct reference-identities**. `Corpo` is the
organization (Veshko); `Brand` is a product line it owns (Volk vodka). Both
are pure-data leaf `Idea`s authored as templates and read by a catalogue from
`template.data` — never cloned as live Stuff (the `Discipline` / `Topic`
recipe). Rejected: collapsing brand into the product template (loses the
queryable portfolio edge and forces brand metadata onto every product
instance) and a single merged node type (a corpo and a brand are different
concepts with different fields and a real edge between them).

### `Brand.owner` is a corpo `key`, unset = independent

A brand points at its owning corpo by durable `key`. An **unset `owner`** is
the independent: a named, real brand identity (Crowsfoot Gin) that resolves to
*no* corpo mark. This makes "the independents" fall out of the model as the
absence of an owner edge rather than a special-cased second mechanism — the
slate's "Independents carry no corpo mark," made concrete without an
`Independent` pseudo-corpo.

### Durable `key`, not templatePath, is the join

Marks, the `owner` edge, and `rivals` edges all reference corpos/brands by a
durable `key` (`'veshko'`, `'volk'`), distinct from templatePath — so
re-pathing / re-parenting the authored canon (additive evolution) never
invalidates a stamped product or an authored edge. Mirrors `Discipline.key`,
`Topic.topic`, `Emote.verb`.

### The mark is a capability mixin (`Branded`), not a field on an existing one

A new `Branded` mixin (in a new `lib/corpo/` subsystem folder) carries the
`brand` key and the resolve-on-read accessor surface. Only Stuff that *is*
branded composes it — a bottle, later a venue or an adornment. General by
construction; the demo exercises it on bottles. The mixin stores the brand
**key** (the durable join), resolving brand → corpo through `CorpoApi` /
catalogue at read time (HMR-safe, no cached instance — the `Material`
path-ref precedent).

### One catalogue, one Api

A `CorpoCatalogue` singleton (the `TopicCatalogue` / `DisciplineCatalogue`
recipe) scans the authored `Corpo` and `Brand` leaf templates at boot and
caches descriptors. A single `CorpoApi` is the gated forwarding shell over its
logic singleton — corpo-resolution, brand-resolution, portfolio, rivalries,
listing. (Fits the eventual `Identity.*`-style Api barrel sweep; standalone
`CorpoApi` for now.)

### Rivalries authored now, inert

`Corpo.rivals` is a typed list of corpo `key`s, authored to encode the
fault-line map, queryable through `CorpoApi`, with **no runtime consumer**
this build. The faction gameplay that reads it is deferred. Precedent:
`Discipline` ships its edges authored-but-unconsumed.

### Proof demo, not fit-out

The build authors the five corpos, their booze brands (incl. ≥1 independent
brand), and **a couple of real branded bottle templates** stamped via
`Branded`. The demo proves end-to-end resolution: a bottle in the world reads
as a product of its corpo and is queryable. It does **not** model booze-as-
bulk or wire Dave's full back-bar (bar build).

## Constraints

- **No new module categories; mirror the advancement three-part split.**
  `Corpo` / `Brand` are leaf `Idea`s (`lib/corpo/`); `Branded` is a mixin
  (`lib/corpo/`, no `Mixin` suffix in the filename, `_mixinName` marker,
  registered in `lib/mixin.ts` `Mixins`). The runtime surface is the same
  three singletons advancement ships: **`CorpoCatalogue`** (`obj/`) — the
  read-only **data-cache** singleton owning the descriptor cache (a
  *Catalogue*, not a Registry: it holds authored data, per the
  [grouping.md](../subsystems/grouping.md) convention — registries hold code,
  catalogues hold data); **`CorpoLogic`** (`obj/api/CorpoLogic.ts`) — the
  **logic singleton** with the gated internals, named for the feature/Api
  (NOT `CorpoCatalogueLogic`); **`CorpoApi`** (`api/corpo.ts`) — the gated
  forwarding shell ending in `SecurityApi.decorateApiClass`. Authored canon is
  template YAML under the chosen `lib/corpo/` path. No free-floating helpers.
- **No new Mongo collection.** `Corpo` / `Brand` are templates in the existing
  `domain` collection (read from `template.data` by the catalogue, never
  cloned). The mark is an ordinary persistent field on a product template.
  Nothing in this build adds a collection.
- **Pure-data leaves are not cloned.** The catalogue reads descriptors from
  the template docs directly — do not register `Corpo` / `Brand` as live
  Stuff (the `DisciplineCatalogue` discipline).
- **Inter-Stuff contract: methods only.** The mark is reached via
  `obj.getBrand()` / `CorpoApi.corpoOf(obj)`, never field access. MQL
  visibility rides the method/projection surface.
- **Gated Api over a logic singleton.** Catalogue mutation surface (if any)
  and internals are gated to `CorpoApi`; `CorpoApi` is the only legitimate
  caller of the logic singleton (the `AccessApi`/registry precedent).
- **Fictional, no trademark risk.** All corpo and brand names are invented
  (vision: separate from any real-world entity). Real product *categories*
  (gin, vodka, whiskey), fictional brands.

## Acceptance criteria

- The five corpos (Veshko, Goodkin, Vionne, Hollis, Aevex) are authored as
  `Corpo` leaf templates with sector / ethos / aesthetic / temperament /
  `rivals`, each with a durable `key`.
- The booze brands are authored as `Brand` leaf templates with `owner` set to
  the right corpo `key`, **including at least one independent brand** with no
  `owner` (Crowsfoot Gin).
- `CorpoApi` resolves: brand `key` → corpo, a `Branded` Stuff → its brand and
  corpo, a corpo `key` → its brand portfolio, and the rivalry edges; listing
  corpos and brands works. Independent brands resolve to a null corpo.
- A `Branded` product's mark is **MQL-queryable** and surfaced in the
  product's in-world perception (a branded bottle reads as a product of its
  corpo).
- At least two real branded bottle templates exist and demonstrably resolve to
  their corpos end-to-end (the proof demo).
- Tests cover: brand→corpo resolution, the independent (null-owner) case,
  portfolio (forward edge), rivalry reads, the `Branded` mark accessor, and
  catalogue boot over the authored templates.
- A subsystem doc `docs/subsystems/corpo.md` exists and is the source of
  truth for the substrate; the CLAUDE.md doc-map references it.
- `pnpm build`, `pnpm test`, `pnpm lint` (incl. `lint:gates`) pass.

## Cross-references

- **Seeding slate:** [corpos-slate.md](../slates/builds/corpos-slate.md)
- **First consumer:** [daves-bar-slate.md](../slates/builds/daves-bar-slate.md)
  (back-bar booze attribution; the integrating vertical)
- **Recipe precedent:** [advancement.md](../subsystems/advancement.md)
  (`DisciplineCatalogue` over pure-data leaf `Idea`s) ·
  [topics.md](../subsystems/topics.md) (`TopicCatalogue`)
- **Reference-identity pattern:** `Material` / `Species` (`lib/material/`,
  `lib/species/`) · [ref-shapes.md](../ref-shapes.md) (path-string singleton
  refs, Pattern A)
- **Orthogonal, not a dependency:** [provenance.md](../subsystems/provenance.md)
  (the `AuthoringEvent` ledger — real-world authorship, distinct from the
  diegetic corpo mark)
- **Deferred follow-on:** corpos-slate § Deferred (the approval vector /
  faction gameplay) · [advancement-slate.md](../slates/builds/advancement-slate.md)
  (corp = the cross-cutting third social axis, guild/party/corp)
