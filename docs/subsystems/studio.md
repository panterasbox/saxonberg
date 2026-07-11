# Studio — the mixin-aware composition surface

The **Studio** is the model-aware half of the CMS: where [cms.md](./cms.md)
is the dumb file/tree/save surface (three backends, one node-ref API), the
Studio *understands the content model* — it reads a backing class's
**effective mixin set** and renders a schema-driven form of exactly the
authorable fields, browses/names a catalogue of composition **blueprints**,
and scaffolds new backing classes. It is the first build of
[cms-slate.md](../slates/builds/cms-slate.md) § *Composition & the blueprint
catalog* + [authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md)'s
two catalogs (mixin particles + named blueprints).

The governing property: **the form is a projection over the same
`template.data` the raw-JSON editor already writes** (same save, same
go-live, same gates), and **authoring is free while only *publish* is
gated** — so composition is open to everyone without opening a
code-execution surface.

## Field-schema derivation — the `@authorable` classification

A form needs, per field, its *type shape* and whether it is author-facing.
The engine had neither as machine-readable data (a mixin declares fields as
a bare `static persistentFields: string[]` — names only). The Studio derives
both without a hand-authored parallel schema:

- **Classification** (`@authorable` vs `@runtimeState`) is an **inline TSDoc
  block tag** on every persistent/instruction field. Every mixin in the
  `Mixins` registry is audited — each field carries **exactly one** of the
  two tags (the `authorable-coverage.test.ts` guard is the tripwire; a
  new-but-unclassified field fails it). `@authorable` = authored initial
  configuration (names, descriptions, capacities, geometry, materials,
  behavior specs, initial states); `@runtimeState` = engine-written
  live/derived/session state (clock-stamps, caches, live vitals, per-player
  accumulators, the craft maker's-mark). A ref field carries
  `@authorable ref:<Type>` (the reference-picker signal).

- **The classification is read by a source-scan, not TypeDoc.** TypeDoc does
  **not** reflect a mixin factory's instance-field declarations — a mixin is
  an anonymous class-expression returned from a factory; only its companion
  *interface*'s methods reflect. So the emitted `authorable-fields.json` is
  *sparse*, and the authoritative classification is a fast regex scan of the
  `@authorable`/`@runtimeState`/`ref:` tags over the mud source tree
  (`StudioLogic.scanClassification`, cached on the singleton; the source is
  present in the deployed server). Instruction-only fields (no instance
  declaration — `container`, `exits`, `adornments`, `populates`, `warren`)
  are classified on their **`applyX` applier** (the scan maps
  `applyWarren → warren`).

- **Type shape** comes from the TypeDoc `authorable-fields.json` artifact
  *where present* (the projector renders property field types, or the
  `applyX` **parameter** type for instruction fields — the data-payload
  shape, not the runtime field type; plus `enumValues` for string unions and
  `refShape`/`refType` for `ref:` tags). Because the artifact is sparse, the
  effective fallback is **runtime sample-value inference** (`typeof`,
  `instanceof Quantity`, array), then the raw-JSON widget. The projector
  (`scripts/project-author-surface.ts`, the `@hook` precedent) and its
  artifact are gitignored/regenerated — the Studio degrades gracefully when
  absent.

## `StudioApi` / `StudioLogic`

The gated Api + logic-singleton pair at `/obj/api/studio` (the
`CmsApi`/`CmsLogic` twin): a thin `StudioApi` forwarding shell
(`SecurityApi.decorateApiClass`), every `StudioLogic` public method
`@CallSecurity(FromModule('/api/studio#StudioApi'))`. The acting principal
is always resolved from `ExecutionContextApi.getActingAuthor` — **never a
caller-supplied argument** (the anti-spoof rule); a null actor fails the
gate closed.

| Op | Gate | Purpose |
|---|---|---|
| `describeClass(classPath, contextPath?)` | `isAuthor` | effective mixin set + authorable field list joined to type shape + effective value/source |
| `createTemplate(input)` | `isAuthor` (+ the code-field gate on the `class` set) | **act #1** — save a NEW content template at a fresh path (CREATE-only; updates go through `CmsApi.write`) |
| `listBlueprints()` / `getBlueprint(id)` | `isAuthor` | browse the catalogue (ungated reads over the singleton) |
| `publishBlueprint(input)` | `isAuthor` | **act #2** — name/publish a composition of approved classes |
| `listMixins()` | `isAuthor` | the palette vocabulary — `{ mixins, bases }`: the flat pickable list (each mixin carrying a one-line `summary` — the first sentence of its concept doc comment, from the source scan; always available, degrades to absent when undocumented) + each base class with its implied (`_mixinName`) mixin set for composition pre-seeding |
| `scaffoldClass(input)` | `isAuthor` | **inert source string** composing mixins over a base (open to all authors) |
| `commitClass(input)` | `isWizard` + `can('write', zone)` | **act #3** — write the new class source + reload |

`createTemplate` is the server side of act #1 (the CMS content-write path only
*updates* an existing template — "creating templates is out of scope"). It is
author-tier to call; the wizard-lockdown code-field gate inside
`TemplateApi.saveTemplate` still applies to the `class` value being set and, on
refusal, is surfaced as a graceful `denied` disposition (never a 500). An
existing path is likewise a `denied`, not an overwrite. REST:
`POST /api/studio/template` (CSRF, `requireAuth`).

`describeClass` reads effective values through a live representative
instance (`findByTemplatePath(contextPath)` else the first
`findAllByTemplatePath(classPath)`), exercising the engine's own
`Zone.lookupField`→biome resolution (never reimplemented); absent an
instance it reads class defaults off a guarded throwaway
`StuffApi.create`. `valueSource` records `instance` / `resolution-chain` /
`class-default`. Field ownership uses **own statics only**
(`hasOwnProperty`) so an inherited `static instructionFields` isn't
mis-attributed to a subclass mixin.

REST: `GET /api/studio/describe|blueprints|blueprint|mixins`,
`POST /api/studio/blueprint|scaffold|commit|template` — `requireAuth`, the CMS
`X-CMS-CSRF` double-submit on POSTs, each through
`CmsSession.runAsSessionPlayer` (the same attribution bridge as the CMS).

## The blueprint catalogue

A **blueprint** is a named, canonical *kind* you instantiate from — the
reusable molecule over the mixin particles. `Blueprint` is a reference-data
`Document` (`blueprints` collection, the `Recipe` precedent — never cloned),
keyed on two durable ids: a **`blueprintId`** (the record key, stable across
rename) and a **`signature`** (`<baseClass>|<sorted mixin _mixinNames>` —
the structural dedup key). `name` is a mutable display label, **never a
key**. `kind` is `composition` (a bare recomposable mixin stack) or
`concrete` (a logic-bearing class pointing at its `classPath`).

- **`BlueprintCatalogue`** (`/obj/BlueprintCatalogue`) is the boot-warmed
  singleton (the `RecipeCatalogue` shape): `cache` by id + `bySignature`
  index, `canEvict`/`canDestruct` refusals.
- **`BlueprintSeeder`** is two-layer and idempotent: a **derived skeleton**
  (every distinct `class` in the `domain` collection → `signatureOf` →
  a `concrete` entry, deduped on signature — *migration is the derive
  step*), plus a **curated overlay** (`config/blueprints.yaml` — named,
  `blessed` pure-composition blueprints and hierarchy, matched onto the
  derived rows by signature so a name *attaches* rather than duplicates).

`publishBlueprint` dedups on signature (reusing the existing `blueprintId`
on collision) and records an `AuthoringEvent` against a synthetic
`/obj/BlueprintCatalogue/<id>` path — the naming act is attributed to its
author while the record stays commons-owned (the catalogue is a global
commons with no per-owner namespace).

## The trust model — three creation acts, save-as-disposition

Authoring (composing, scaffolding, editing a class in Monaco) is **inert
client text and open to everyone**; authorization gates **publish**. There
are three creation acts, and only one needs a wizard:

1. **Instantiate** a template (`class:` → an approved kind, own `data`) —
   author-tier, no wizard. The common "my own X". (Ordinary CMS template
   authoring; the Studio form is its friendly projection.)
2. **Publish a composition of approved classes** to the catalogue
   (`publishBlueprint`) — author-tier (a pointer to trusted code is not
   untrusted code).
3. **A new code module / novel composition** (`scaffoldClass` →
   `commitClass`) — **wizard-gated source write**, because a new backing
   class *is* a new `class` value and naming a class confers code-trust (the
   shipped wizard-lockdown, [access.md](./access.md)). This build is the
   sanctioned bridge across that content→code boundary, not a relaxation of
   it.

The composer's **base can be any approved class**, not only the 8 fundamental
roots: "Author a new kind from this →" on a concrete blueprint makes that
class the *superclass* (`class New extends <added>(Coin) {}`), with the
selected class's mixins shown as a read-only inherited segment and the added
stack starting empty (the scaffolder resolves the base by NAME — the last
segment of its `classPath` — via the export-source scan, which already
captures default-exported concrete classes like `Coin`/`PaymentCard`). The
structural signature still keys on the fundamental *root*, so a bare subclass
over `Coin` is correctly flagged as an exact match to `Coin` ("use it?").

**Save returns a disposition, not a boolean.** `commitClass` /
`publishBlueprint` return `committed` / `denied` (with `proposed` **reserved**
for the future review workflow). A non-wizard `commitClass` is a graceful
`denied` (the client's `auth.isWizard` **warning banner** warned before
save; the server gate is the authority). A wizard write that fails to
compile is `committed` + `reloaded: false` (persisted-but-not-live, the
shipped CMS behavior — never a 500). **Class-then-template ordering** is
client-enforced: the follow-on template step is disabled until a commit
returns `reloaded: true`.

There is **no runtime dynamic compose** — a backing class is always a static
TS module; `scaffoldClass` emits a source string (imports resolved by the
same source-scan that finds `_mixinName`/`export class`), and `commitClass`
writes it via `SourceTreeApi` + `HotReloadApi.reload` (the `_writeSource`
shape).

## Client surface

The **Studio** is a mode of the CMS surface (`?surface=cms`), REST-only:

- **The form** (`StudioForm` + `widgets/`) — a schema-driven generator over
  `describeClass`, one widget per field via a registry (lookup order
  `refShape → enumValues → typeShape prefix/exact → raw-JSON`): text /
  number / boolean / enum / `Quantity<…>` / the reference-picker (browses
  in-scope content templates via `cmsClient.listTree`, degrading to a text
  input for catalogue-data ref types). A header toggle drops to the raw-JSON
  Monaco editor over the same `data`.
- **The data-integrity overlay** (the load-bearing correctness rule): the
  slice holds the full parsed `template.data` as `baseData` plus an `edits`
  overlay and a `cleared` set. `serializeStudioData` = `{...baseData,
  ...edits}` minus cleared, `JSON.stringify(…, null, 2)` — **byte-identical
  to the raw editor for an unedited round-trip**, and non-authorable /
  unsurfaced keys ride through verbatim (never dropped, inherited defaults
  never materialized). Save reuses the existing content-write/go-live path.
- **`StudioPanel`** mounts the `ClassPicker` (browse blueprints, grouped by
  hierarchy, blessed-first → `describeClass`), the `MixinPalette` (base +
  mixin set → `scaffoldClass` → the scaffold editor), and the
  `WarningBanner`.

## Deferred seams (do not assume built)

- **Non-wizard draft persistence** — v1 keeps a scaffolded draft client-only;
  `scaffoldClass` reserves the `/home/<self>/drafts/<Name>.ts` path and a
  documented no-op `_persistDraft`. The future review workflow's `proposed`
  disposition writes into that seam ([document-store.md](./document-store.md)).
- **The git layer, then the non-wizard-proposes → wizard-rubber-stamps →
  catalogue review workflow** (the slate's law==code gate) — the `proposed`
  disposition, the stable scaffold path, and catalog-write-separate-from-
  source-commit are the accommodations; neither is built.
- **The alias auto-approve** (a non-wizard self-committing a trust-empty
  empty-subclass via a static no-new-code check) — deferred; template-clone
  covers the common owned-instance case.
- **Composition-rule metadata** (`@requires`/`@conflicts` per mixin) — not
  authored; v1 leans on the TS-compile/reload gate as the backstop.
- **Per-type content editors** (the bespoke room editor + its custom
  widgets) and the **zone editor / map canvas** →
  [map-slate.md](../slates/builds/map-slate.md) + cms-slate Wave 3. This
  build ships the *generic* composer + the reusable reference-picker only.
- **Engine-typed IntelliSense / LSP / host isolation** →
  [authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md).

## See also

- [cms.md](./cms.md) — the file/tree/save surface the Studio extends (the
  CmsApi/CmsLogic node-ref contract, the attribution bridge, save go-live).
- [templates.md](./templates.md) — the Hydrator two-phase `setX`/`applyX`
  dispatch (property vs instruction fields).
- [mixins.md](./mixins.md) — the `Mixins` registry, `_mixinName`, `MixinApi`.
- [access.md](./access.md) — the wizard-lockdown (`class`/`hydratorClass`/
  `behaviors[].brain` code-naming gate), `isWizard`/`isAuthor`.
- [provenance.md](./provenance.md) — the authoring ledger, `getActingAuthor`,
  the `recordAuthoring` gate (broadened to accept the studio transport).
