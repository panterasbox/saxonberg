# Implementation Plan — Corpos (marks + booze portfolios)

Drives the build against [corpos-requirements.md](../requirements/corpos-requirements.md).
Seeding slate: [corpos-slate.md](../slates/builds/corpos-slate.md).

## Orientation: what the precedent dictates

The advancement build ships the exact three-part recipe this build mirrors
name-for-name:

- **Leaf `Idea` (pure data, never cloned):** `lib/advancement/Discipline.ts`
  — durable `key` ≠ templatePath, typed edge fields (`requires`/`specializes`/
  `synergizes` as `string[]` of keys), a `DisciplineDescriptor` projection read
  from `template.data`, `persistentFields` list, validating get/set accessors.
- **Data-cache Catalogue singleton (`obj/`):** `obj/DisciplineCatalogue.ts` —
  `PostRegistrationMixin(Idea)`, a `Map<key, Descriptor>` cache warmed in
  `postRegister` from `Template.findDescendants(PREFIX)`, sync read surface,
  `invalidateCache`, `canDestruct` refusal, defensive descriptor copies, a
  module-private `buildDescriptor(data)` coercer.
- **Gated logic singleton (`obj/api/XLogic.ts`) + forwarding-shell Api
  (`api/x.ts`):** `obj/api/AdvancementLogic.ts` (`@Unshadowable`,
  `@CallSecurity(FromModule('mud/api/corpo#CorpoApi'))` on each public method,
  internals as module-private free functions to avoid intra-singleton
  self-calls tripping the gate) + `api/advancement.ts` (resolves the HMR-able
  logic via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport`, ends in
  `SecurityApi.decorateApiClass`).
- **Reference-identity cross-ref resolved on read:** `Material` /
  `Radioactive._decayProductPath` — store a path/key string, resolve via lookup
  on each call, never cache an instance (HMR-safe).

Seeds are authored as YAML under `seeds/<class-path>/<key>.yaml` with `class:`
naming the leaf class; `StuffApi.loadClassByPath` maps `class: /lib/corpo/Corpo`
to the TS file at that path (no manifest registration — placing the file at the
conventional path *is* the registration). The catalogue is warmed at boot by an
entry in `bootstrap.ts`'s `bootstrapManifest`.

## Module-category mapping (CLAUDE.md fixed taxonomy — no new categories)

| File | Category | Path |
|---|---|---|
| `Corpo` leaf `Idea` | lib (data leaf) | `packages/server/src/mud/lib/corpo/Corpo.ts` |
| `Brand` leaf `Idea` | lib | `packages/server/src/mud/lib/corpo/Brand.ts` |
| `Branded` mixin | lib (mixin, no `Mixin` suffix in filename) | `packages/server/src/mud/lib/corpo/Branded.ts` |
| `BrandedBottle` demo class | lib | `packages/server/src/mud/lib/corpo/BrandedBottle.ts` |
| `CorpoCatalogue` data-cache singleton | obj | `packages/server/src/mud/obj/CorpoCatalogue.ts` |
| `CorpoLogic` gated logic singleton | obj/api | `packages/server/src/mud/obj/api/CorpoLogic.ts` |
| `CorpoApi` forwarding shell | api | `packages/server/src/mud/api/corpo.ts` |
| Corpo/Brand/bottle seeds | seeds (YAML) | `packages/server/src/mud/seeds/lib/corpo/...` |
| Catalogue seed | seeds (YAML) | `packages/server/src/mud/seeds/obj/CorpoCatalogue.yaml` |
| Subsystem doc | docs | `docs/subsystems/corpo.md` |

## Ordered work

### Step 1 — Path constants (`lib/paths.ts`)

Add to the existing objects (do not invent a new structure):
- `TemplatePaths.corpoCatalogue = "/obj/CorpoCatalogue"` (mirrors
  `disciplineCatalogue`).
- `TemplatePathPrefixes.corpo = "/lib/corpo/Corpo/"` and
  `TemplatePathPrefixes.brand = "/lib/corpo/Brand/"` (mirrors
  `TemplatePathPrefixes.discipline`).

The leaf-class files live at `/lib/corpo/Corpo.ts` and `/lib/corpo/Brand.ts`;
the *templates* are authored under `/lib/corpo/Corpo/<key>` and
`/lib/corpo/Brand/<key>` — exactly the Discipline split (class at
`/lib/advancement/Discipline`, templates under `/lib/advancement/Discipline/
<key>`). The prefix has a trailing segment matching the class basename.

### Step 2 — `Corpo` leaf Idea (`lib/corpo/Corpo.ts`)

Mirror `Discipline.ts`. `export default class Corpo extends Idea`. Fields:
- `key: string` — durable join (`'veshko'`). Non-empty; validating setter.
- `label: string` — display name (`'Veshko'`); descriptor falls back to `key`.
- `sector: string` — sector-of-origin.
- `ethos: string` — the load-bearing culture slot.
- `aesthetic: string`.
- `temperament: string` — the player temperament it magnetizes.
- `description: string` — authored prose.
- `rivals: string[]` — typed edge: a list of corpo `key`s (the Discipline-edge
  precedent — authored, queryable, **no runtime consumer this build**).

`static persistentFields = ['key','label','sector','ethos','aesthetic',
'temperament','description','rivals']`. Validating `getKey/setKey`,
`getLabel/setLabel`, plain string getters, `getRivals()` returns a defensive
copy. Export interface `CorpoDescriptor` (the catalogue's cached projection).

### Step 3 — `Brand` leaf Idea (`lib/corpo/Brand.ts`)

Same recipe. `export default class Brand extends Idea`. Fields:
- `key: string` — durable join (`'volk'`). Non-empty.
- `name: string` — display name (`'Volk'`). Non-empty.
- `owner: string` — owning corpo `key`, or `''` = independent (the
  unset/independent sentinel; `''` matches the `Discipline.iscedf: ''`
  "no anchor" precedent and round-trips cleanly).
- `category: string` — real product category (`'vodka'`,`'gin'`,`'whiskey'`).
- `positioning: string` — authored positioning label as **data only**
  (price→quality economics are a non-goal — this is a label, not a number).
- `descriptor: string` — authored flavor line.

`static persistentFields = ['key','name','owner','category','positioning',
'descriptor']`. `getOwner/setOwner` allow `''`. Export interface
`BrandDescriptor` (`owner === ''` is the independent marker).

### Step 4 — `CorpoCatalogue` data-cache singleton (`obj/CorpoCatalogue.ts`)

Mirror `DisciplineCatalogue.ts`, caching **two** descriptor maps plus a derived
forward-edge index:
- `corpoCache: Map<string, CorpoDescriptor> | null`
- `brandCache: Map<string, BrandDescriptor> | null`
- `portfolioIndex: Map<string, string[]> | null` — corpo key → owned brand keys,
  built once during warm (each brand with non-empty `owner` appends its key).
  The "portfolio is the forward edge" Goal as a cheap precomputed inverted index.

`extends PostRegistrationMixin(Idea)`. Sync surface after warm: `getCorpo(key)`,
`getBrand(key)`, `hasCorpo/hasBrand`, `allCorpos()/allBrands()` (defensive
copies), `portfolioOf(corpoKey)` (forward edge, `[]` for unknown/independent-
only), `rivalsOf(corpoKey)`. `postRegister` → two `Template.findDescendants`
calls, `buildCorpoDescriptor`/`buildBrandDescriptor` module-private coercers
(drop malformed; require non-empty `key`/`name`), then build `portfolioIndex`.
`invalidateCache()` nulls all three. `canDestruct()` refusal + `ensureCache()`
cold-state guard copied from DisciplineCatalogue.

### Step 5 — `CorpoLogic` gated logic singleton (`obj/api/CorpoLogic.ts`)

Mirror `AdvancementLogic.ts`. `@Unshadowable export class CorpoLogic extends
Idea`. Gate `const CorpoApiCallers = SecurityPolicies.FromModule(
"mud/api/corpo#CorpoApi");` + `@CallSecurity(CorpoApiCallers)` per public method.
Module-private `catalogue()` resolves the singleton via
`StuffApi.findByTemplatePath(TemplatePaths.corpoCatalogue)`. All real logic in
module-private free functions; methods forward (no intra-singleton `this.x()`).

Public surface (= the CorpoApi method surface):

| method | role |
|---|---|
| `corpoOfBrand(brandKey): CorpoDescriptor \| null` | brand key → owning corpo; **independent (`owner===''`) → `null`**; unknown key → `null` |
| `corpoOf(obj: Stuff): CorpoDescriptor \| null` | a `Branded` Stuff → its corpo (reads the mark via `obj.getBrandKey()`, then `corpoOfBrand`); narrows via `MixinApi.hasMixin(obj, Mixins.Branded)` |
| `brandOf(obj: Stuff): BrandDescriptor \| null` | a `Branded` Stuff → its brand |
| `getBrand(brandKey): BrandDescriptor \| null` | brand key → descriptor |
| `getCorpo(corpoKey): CorpoDescriptor \| null` | corpo key → descriptor |
| `portfolioOf(corpoKey): BrandDescriptor[]` | corpo → brand portfolio (forward edge resolved to descriptors) |
| `rivalsOf(corpoKey): CorpoDescriptor[]` | rivalry reads (resolve each rival key; drop unknowns) |
| `listCorpos(): CorpoDescriptor[]` / `listBrands(): BrandDescriptor[]` | list all |

The independent null-corpo case is centralized here. **No `PersistApi` /
connection gate** — this reads only the in-memory catalogue (no per-character
Mongo); do not copy Advancement's `active()` guard reflexively. `corpoOf(obj)`
touches a Stuff only via the method-only contract (`obj.getBrandKey()`), never
field access.

### Step 6 — `CorpoApi` forwarding shell (`api/corpo.ts`)

Mirror `advancement.ts` in structure: `LOGIC_PATH = "/obj/api/corpo"`,
`LOGIC_CLASS_FILE` via `fileURLToPath(new URL("../obj/api/CorpoLogic",
import.meta.url))`, a `logic()` resolver using `StuffApi.singletonSync` +
`HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, "CorpoLogic")`. `export class
CorpoApi` with a static per CorpoLogic method forwarding `return logic().X(...)`.
Re-export the descriptor types. End with `SecurityApi.decorateApiClass(CorpoApi)`.
The only legitimate caller of `CorpoLogic`; `lint:gates` validates the gate
string resolves to `api/corpo.ts` exporting `CorpoApi`.

### Step 7 — `Branded` mixin (`lib/corpo/Branded.ts`)

Mirror `Radioactive.ts` (capability-mixin-storing-a-reference) + the `Tangible`
`subscribableFields` MQL seam. `export function BrandedMixin<TBase extends
MixinConstructor>(Base: TBase)`:
- `static _mixinName = 'BrandedMixin';`
- `static persistentFields = ['_brandKey'];`
- `public _brandKey: string = '';` — the durable join (brand **key**, not a
  path; resolved through `CorpoApi` at read time, HMR-safe — the `Material`
  path-ref precedent).
- `getBrandKey()/setBrandKey(v)`.
- `getBrand(): BrandDescriptor | null` — `this._brandKey ?
  CorpoApi.getBrand(this._brandKey) : null` (re-resolve each call, no cache).
- `getCorpo(): CorpoDescriptor | null` — `CorpoApi.corpoOfBrand(this._brandKey)`;
  independent → `null`.

Define the surface interface `Branded`. **MQL visibility:** add `static
subscribableFields` projecting two flat fields — `brand`
(`(stuff) => (stuff as Branded).getBrand()?.key ?? null`) and `corpo`
(`(stuff) => (stuff as Branded).getCorpo()?.key ?? null`; null = independent,
legible), `dependsOnFields: ['_brandKey']`. The method-derived projection seam
`Tangible` uses for `bulkMaterial` (satisfies "MQL visibility rides the
method/projection surface" without a redundant `PropertiedMixin` prop surface).

**In-world perception** ("a product of Veshko"): a `static markupAugmenters`
contribution appending a "Made by <corpo label>" / "a product of Veshko" line
to the host's long description (independent brands: no corpo line / "a
small-batch independent"), reading `getCorpo()`/`getBrand()` at render time — so
the mark is *derived* (truthful under re-pathing), not hand-copied prose. The
same `markupAugmenters` slot `Visible`/`Detailed` use.

**Demo class** (`lib/corpo/BrandedBottle.ts`): `export class BrandedBottle
extends BrandedMixin(<bottle base>)` — the `RadioactiveMaterial extends
RadioactiveMixin(Material)` precedent. **Verify the existing back-bar/lounge
item base class** (`Visible`+`Tangible`) during implementation and compose over
it; do not invent a new ad-hoc base. Demo bottles use `class:
/lib/corpo/BrandedBottle`.

### Step 8 — Register the mixin (`lib/mixin.ts`)

Add `Branded: 'BrandedMixin'` to the `Mixins` registry (used by
`MixinApi.hasMixin(obj, Mixins.Branded)`). No further wiring.

### Step 9 — Authored content (seeds)

**5 Corpo leaf templates** (`seeds/lib/corpo/Corpo/<key>.yaml`,
`class: /lib/corpo/Corpo`), encoding rivalries as mutual pairs:
- `veshko` — heavy industry/materials/logistics; Ruthless Optimizer; brutalist
  grey wordmark; pragmatists/min-maxers; `rivals: [aevex]`.
- `goodkin` — consumer staples/food/household; Paternalist; warm sunrise +
  mascot; belonging-seekers; `rivals: []` ("floats apart" = the empty edge).
- `vionne` — luxury/fashion/media; Prestige House; gold-on-black serif;
  status-seekers/aesthetes; `rivals: [hollis]`.
- `hollis` — mass retail/fast food/cheap goods; Populist; red-and-yellow
  jingles mascot; the everyman/anti-snob; `rivals: [vionne]`.
- `aevex` — tech/augments/synthetics; Disruptor; white-and-neon lowercase
  glassy; early adopters/futurists; `rivals: [veshko]`.

"Independents vs all" is structural (no Independent corpo; independents = the
absence of an `owner`), not an edge.

**Booze Brand leaf templates** (`seeds/lib/corpo/Brand/<key>.yaml`,
`class: /lib/corpo/Brand`):
- `volk` — owner `veshko`, vodka, "well-rail default", "industrially perfect,
  soulless, fine".
- `goodkin-reserve` — owner `goodkin`, whiskey, "nostalgic blend", "the one your
  dad drank".
- `vionne-noir` — owner `vionne`, gin, "overpriced-premium", "ordered to be seen
  ordering".
- `old-hollis` — owner `hollis`, whiskey, "cheap and proud of it", "the
  anti-Vionne".
- `aevex-zero` — owner `aevex`, synthetic spirit, "lab-engineered",
  "uncanny-perfect, divisive".
- `crowsfoot-gin` — **owner `''` (the required independent — no corpo mark)**,
  gin, "small-batch premium", "out of a little place across town".

**≥2 branded bottle Stuff templates** (`class: /lib/corpo/BrandedBottle`): a
Volk bottle (`_brandKey: volk` → Veshko) and a Crowsfoot Gin bottle
(`_brandKey: crowsfoot-gin` → **null corpo**, proving the independent case
end-to-end). **Just branded objects** — `Visible`/`Tangible` + the mark; **no
`Bulkable`** (booze-as-bulk is the bar build, Non-goals). Verify the lounge/
back-bar seed directory and place them consistently (or under
`seeds/lib/corpo/demo/`).

**Catalogue seed** (`seeds/obj/CorpoCatalogue.yaml`): `class:
/obj/CorpoCatalogue` / `data: {}` (copy of `DisciplineCatalogue.yaml`).

### Step 10 — Boot wiring (`bootstrap.ts`)

Add `{ templatePath: '/obj/CorpoCatalogue' }` to `bootstrapManifest`, mirroring
the `/obj/DisciplineCatalogue` entry, so `postRegister` warms the caches at
start. No `dependsOn`.

### Step 11 — Tests (Vitest, colocated in `__tests__/`)

- `lib/corpo/__tests__/Corpo.test.ts` — field round-trip, `setKey` empty
  rejection, `getRivals` defensive copy.
- `lib/corpo/__tests__/Brand.test.ts` — field round-trip, `owner: ''`
  independent default.
- `lib/corpo/__tests__/Branded.test.ts` — the **Branded accessor**: compose
  `BrandedMixin` on a test base, assert `getBrand()`/`getCorpo()` resolve
  through `CorpoApi`; the **independent null-owner case** (`crowsfoot-gin` →
  `getCorpo()` null); empty `_brandKey` → both null.
- `obj/__tests__/CorpoCatalogue.test.ts` — **catalogue boot over authored
  templates**: warm, assert 5 corpos + 6 brands, `portfolioOf('veshko')` →
  `['volk']` (**forward edge**), `rivalsOf('vionne')` includes `hollis`
  (**rivalry read**), malformed rows dropped.
- `obj/api/__tests__/CorpoLogic.test.ts` (or folded) — **brand→corpo**
  (`corpoOfBrand('volk')` → Veshko), **independent** (`crowsfoot-gin` → null;
  unknown → null), `portfolioOf` returns descriptors, `corpoOf(brandedStuff)`
  end-to-end on a cloned demo bottle, `listCorpos`/`listBrands` counts.

### Step 12 — Docs

- **`docs/subsystems/corpo.md`** — source of truth. Structure like
  `advancement.md`: two leaf tiers + one catalogue + one Api + the mark mixin;
  `key`-not-templatePath; `Brand.owner` unset = independent; `Branded`
  resolve-on-read + MQL projection seam; the `CorpoApi` method table;
  rivalries authored-but-inert; the proof-demo bottles; a Deferred section
  (approval vector / faction gameplay — corpos-slate § Deferred; portfolios
  beyond booze). Cross-reference `advancement.md`, `Material`/`Species`,
  `provenance.md` (orthogonal — not a dependency), `daves-bar-slate.md`.
- **CLAUDE.md doc-map** — add one `- [corpo.md](...) — …` bullet, adjacent to
  advancement/provenance, in the house style.

### Step 13 — Verification

`pnpm build`, `pnpm test`, `pnpm lint`, `pnpm lint:gates` (validates
`FromModule('mud/api/corpo#CorpoApi')` → `api/corpo.ts` exporting `CorpoApi`).
`lint:pm` should be a no-op (no new collection, no per-instance persistence) —
confirm.

## Critical / ambiguous spots and trade-offs

1. **MQL surface choice (the one real design call).** The `subscribableFields`
   live-query/inspection projection (reading `getBrand()`/`getCorpo()`) is the
   method-derived, minimal, precedent-matching choice the requirements invite.
   The alternative `[prop.brand=volk]` *filter* predicate would require
   publishing `brand`/`corpo` as redundant `PropertiedMixin` props (a field-ish
   second surface the method-only Constraint discourages). **Recommend the
   projection seam**; flag the predicate-filter interpretation for the reviewer.
2. **"A product of Veshko" via augmenter vs. authored prose.** The plan picks a
   derived `markupAugmenters` line (truthful under re-pathing). If the augmenter
   pipeline is heavier than warranted for two demo bottles, authoring the line
   into the seeds is an acceptable fallback that still satisfies acceptance.
3. **`owner` sentinel `''` vs `null`.** Chose `''` to match the
   `Discipline.iscedf: ''` "no anchor" precedent and avoid nullable-string
   churn through the coercer. The requirements only say "unset = independent".
4. **`rivals` mutuality + Goodkin's empty edge.** Vionne↔Hollis and Veshko↔Aevex
   as the only two mutual pairs, Goodkin empty, independents = absence of owner
   (no `Independent` pseudo-corpo — the requirements' Surface decision). Follows
   the slate's fault-line map directly.
5. **Bottle base class.** Must verify the existing back-bar/lounge item base
   (`Visible`+`Tangible`) and compose `BrandedMixin` over it (the
   `RadioactiveMaterial` precedent) rather than inventing a base. The one spot
   needing a codebase confirmation before coding.
6. **No `PersistApi` gate in `CorpoLogic`.** It reads only the in-memory
   catalogue; omitting the `active()`/connection guard is correct here — do not
   copy it from `AdvancementLogic`.

Nothing expands beyond the requirements: no approval vector, no competition/
sponsorship, no booze-as-bulk, no `AuthoringEvent` read/write, no new
collection, no new module category.
