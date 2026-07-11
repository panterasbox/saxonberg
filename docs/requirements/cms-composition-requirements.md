# CMS composition surface — requirements

The CMS ships today as a code editor plus a **raw-JSON-over-`template.data`**
form for content templates. This build makes the CMS **aware of the mixin
architecture**: an author picks (or composes) a backing class, and the CMS
reads that class's *effective mixin set* to render a schema-driven form of
exactly the authorable fields — replacing hand-edited JSON with a real
composition workflow. It delivers the two halves the authoring slates
describe: the **generic object composer** (data-tier: instantiate a class,
fill its fields) and the **blueprint catalog** (the browsable, durable-id-keyed
commons of named compositions, plus the wizard-gated path to author a *new*
backing class). It is seeded by
[cms-slate.md](../slates/builds/cms-slate.md) (§ *Composition & the blueprint
catalog*; § *Content editors — the room & zone*) and
[authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md)
(the two catalogs: mixin particles + named blueprints), and it consumes the
existing CMS substrate documented in [cms.md](../subsystems/cms.md).

The governing property that keeps the build small and safe: **the form is a
projection over the same `template.data` artifact the raw-JSON editor
already writes** — same save, same go-live, same gates — and **authoring is
free while only *publish* is gated**, so composition can be open to everyone
without opening a code-execution surface.

## Goals

- **A field schema is derivable for any backing class without a new
  hand-authored schema.** The authorable fields of a class's effective
  mixin set, each with its type/shape and description, are readable by the
  CMS — sourced by *extending the existing TypeDoc author-surface
  projection*, joined to runtime field/default knowledge, never by a
  parallel schema hand-maintained per mixin.
- **The data-tier composer renders a schema-driven form** over that field
  schema for a chosen class, and its save produces byte-compatible
  `template.data` — so the existing save / re-hydrate-live-clones go-live
  path is reused unchanged, and raw-JSON remains available as an advanced /
  fallback editing mode.
- **A blueprint catalog is browsable and durable-id-keyed.** Every existing
  backing class appears as a structural entry (derived from its mixin-set
  signature); a curated overlay adds human names, hierarchy, and blessing;
  the picker in the composer browses it; nothing keys off a mutable name.
- **A new backing class can be authored by anyone and committed only by a
  wizard.** The mixin-palette → scaffold-source-class → reload →
  dedup/name-it write path exists; composing and editing the scaffold is
  open to all authors; the source commit is `isWizard`-gated; non-wizards
  are warned *before* save, not only rejected at it.
- **Save reports a disposition, not a boolean.** The save contract
  distinguishes `committed` / `denied` (and reserves room for a future
  `proposed`) so the deferred git + propose-review workflow is an added
  disposition, not a rewritten contract.
- **Authorship is attributed on every catalog and code write** via the
  execution-context-derived author (the provenance ledger), never a
  caller-supplied principal.
- **The catalog is seeded** from the automatic derived skeleton plus a
  hand-curated naming pass over the reusable pure-composition blueprints.

## Non-goals

- **The map / zone editor and its 2D/3D canvas** → [map-slate.md](../slates/builds/map-slate.md)
  (Wave 1 unblocks the zone editor's visual mode) and the cms-slate's zone
  editor. This build is class/object composition; spatial layout is out.
- **Per-type content editors** (the bespoke room editor, its
  detail-tree/exit/contents widgets) → cms-slate Wave 3. This build ships
  the *generic* composer + the *reference-picker* widget those editors will
  later reuse; the room-specific custom widgets are not in scope.
- **The alias auto-approve exception** (letting a non-wizard self-commit a
  trust-empty empty-subclass of an approved class, via a static
  "no-new-code" AST check) → deferred. The template-clone path already
  delivers an owned, namespaced, custom-data instance of an approved kind
  with no new module and no wizard, covering the common case.
- **The git layer, and the non-wizard-proposes → wizard-rubber-stamps →
  catalog review workflow** (the slate's law==code review gate) → future
  builds. This build must *accommodate* them (see Constraints) but ships
  neither.
- **Composition-rule metadata** (`@requires` / `@conflicts` per mixin for
  pre-emptive palette validation). Not authored here; v1 leans on the
  TS-compile/reload gate as the backstop for incoherent compositions.
- **Runtime dynamic composition.** A backing class is always a static TS
  module; there is no "assemble a class from a list of mixin names at
  runtime" primitive, and this build does not add one.
- **Engine-typed IntelliSense / the LSP / host isolation for untrusted
  code** → [authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md)
  and the access slate. Monaco keeps stock language support; untrusted code
  is gated at publish, not sandboxed at execution.

## Surface decisions

### Field schema is derived from TypeDoc, not hand-authored

**Question:** where does the per-field schema a form needs (type, shape,
description) come from? **Decision:** extend the existing TypeDoc pipeline.
The shipped `author-surface.json` projection deliberately drops fields; add
a new **authorable-fields projector** to `project-author-surface.ts` that
emits, per mixin, its author-facing fields with the type/shape TypeDoc
already parses in `api-model.json`. A single new **`@authorable` TSDoc block
tag** (registered in `typedoc.json`'s `blockTags`, exactly the `@hook`
precedent already present) marks which persistent/instruction fields are
author-facing versus runtime-state (`persistentFields` conflates the two —
e.g. `Campfire.fuelClockStamp` is persistent state, not authorable). This
avoids a second source of truth for field types and preserves the
`callable == visible == cared-about` invariant by extending the same doc
pipeline that governs method visibility.

### Runtime supplies fields + defaults; the projection supplies shape

**Question:** the field *list* and *effective values* aren't cleanly in
TypeDoc — where do they come from? **Decision:** a runtime read (a gated Api
op) computes, for a chosen class path, its effective mixin set and the
authorable field list (`MixinApi.getAllPersistentFields` ∪
`getAllInstructionFields`, filtered to `@authorable`), plus each field's
**effective value + source** through the engine's own resolution chain
(backing-class default → `Zone.lookupField` → biome), never reimplemented.
This runtime read is **joined by field name** to the projected type shapes.
For **property fields** the shape is the field's declared type; for
**instruction fields** the shape is the `applyX` **parameter** type (the
data-payload shape, which differs from the runtime field type and is already
captured as a `@hook` in the projection).

### The form is a projection over `template.data`

**Question:** does the form need a new persistence / save path? **Decision:**
no. The form reads and writes the same `template.data` JSON the raw-JSON
editor produces; save routes through the existing `CmsApi.write` →
`saveTemplate` → re-hydrate-live-clones go-live. **Raw-JSON is retained as
an advanced/fallback mode**, so un-annotated or exotic fields stay editable
and coverage can grow incrementally. The form is a *friendly projection*,
the slate's "two modes over one canonical artifact."

### The composer's form is a schema-driven generator + widget registry

**Question:** one hand-built editor per class, or a unified generator?
**Decision:** one **schema-driven form generator** plus a **widget
registry**. A field renders with a default widget for its type unless a
richer one is registered. v1 default widgets: text, number, boolean,
enum-dropdown (free from TS union types), Quantity/measure, and the
reusable **reference-picker** (find an in-scope template of type X).
Instruction-field custom widgets (detail-tree, exit-picker) are out of scope
(later, per-type editors). Because the generator reads the *effective mixin
set*, a named blueprint and a hand-composed equivalent render identically.

### The blueprint catalog: derived skeleton + curated overlay, keyed on durable id

**Question:** how is the catalog stored and keyed? **Decision:** two layers.
The **derived structural skeleton** is computed from every backing class's
mixin-set signature (the sorted `_mixinName` set + base) — automatic, a
build/boot artifact, no authoring. The **curated overlay** is authored
reference data: a **durable-id-keyed** record carrying a *name* (a mutable
display label, never a key), hierarchy placement, and a pointer to the
composition. **Dedup keys on the structural signature**, not the name — two
authors composing the same particles collide to one structural blueprint. The
overlay persists as a **reference-data `Document` collection managed by a
catalogue singleton** (the `Recipe` / `RecipeCatalogue` precedent — durable
id, never cloned, boot-warmed), behind a gated Api/logic pair.

### Trust model: author freely, gate publish, three creation acts

**Question:** who may create what? **Decision:** authoring (composing,
scaffolding, editing a class in Monaco) is **inert client text and open to
everyone**; authorization gates **publish**. Three distinct acts:

1. **Instantiate** a template (`class:` points at an approved kind, own
   `data`) → author-tier, no wizard. The common "my own X" case.
2. **Name/publish a composition of already-approved classes** to the catalog
   → author-tier (a pointer to trusted code is not untrusted code).
3. **A new code module / novel composition** (a mixin combination no
   approved class provides, or new logic) → **wizard-gated source write.**

Any user may author a new backing class; **only a wizard may save/commit
it.** Non-wizards see a **warning banner** driven by the client's
`auth.isWizard` hint (non-authoritative UX; the REST source-write gate stays
the authority). This is the sanctioned bridge across the content→code
boundary the shipped wizard-lockdown seals at the code-naming fields.

### Save is a disposition, not a boolean

**Question:** how does save avoid being rewritten when the review workflow
lands? **Decision:** `write` returns a **disposition** — `committed` or
`denied` in v1, with `proposed` reserved. The authored class is an artifact
with a **stable path from scaffold time** (not anonymous editor text) so a
future changeset/proposal can reference it; **cataloging is a separate write
from the source commit** so a future proposal can be cataloged-as-pending.

### Namespaces

**Question:** where do authored kinds and instances live? **Decision:**
a **global durable-id catalog commons** holds *kinds*; **per-author / parcel
namespaces** hold *instances* (templates referencing catalog kinds by id);
**new code modules land in a reviewed home** (the mirror-convention `/obj` /
`/lib/<subsystem>`), promoted from a non-wizard's `/home/<self>/`
document-store **draft** on wizard approval. v1 implements the commons +
instance namespaces + the wizard-committed reviewed home; the draft-in-home
promotion path is the seam the future review workflow writes into (a
non-wizard's uncommitted draft may persist to their document-store branch,
or stay client-only — planner's call, but the seam must exist).

### Seeding

**Question:** how does the catalog get populated? **Decision:** the derived
skeleton covers *all* existing classes automatically (migration is the
derive step, not a task). A **hand-curated naming pass** names and blesses
the reusable **pure-composition** blueprints (e.g. `class Coin extends
GlobbableMixin(Idea)` — no custom methods/fields). **Logic-bearing classes**
(Campfire, with its own field + behavior) are listed as concrete catalog
*kinds* but are **not recomposable blueprints** — behavior lives in the class,
not in particles.

## Constraints

- **No new source of truth for field types.** The `@authorable` projection
  extends the existing pipeline; it does not fork TypeDoc's type model. A
  field absent from the projection degrades to raw-JSON, never to a
  hand-authored fallback schema.
- **Actor from context, never from a parameter.** Every gated op (catalog
  write, `describeClass`, source scaffold) derives the acting author from
  `ExecutionContextApi.getActingAuthor` / the `tagActingAuthor` REST bridge
  — never a caller-supplied principal (the anti-spoof rule; see
  [gated-api-actor-from-context] memory and [provenance.md](../subsystems/provenance.md)).
- **Module taxonomy.** New surfaces fit existing categories: a gated
  `*Api` + `*Logic` singleton pair for the catalog and the class-describe
  read; a reference-data `Document` + catalogue singleton for the overlay
  (the RecipeCatalogue precedent); a projection change is a `scripts/`
  edit. No free-floating helpers, no new module category, no `lib/mixins/`
  folder.
- **The wizard-lockdown holds.** Committing a new backing class *is* setting
  a `class` code-naming field; it stays `isWizard`-gated at the source-write
  chokepoint. This build does not relax the lockdown — the future review
  workflow is its sanctioned relaxation valve, not this one.
- **Go-live ordering for new classes.** A new backing class must be written
  and reloaded (surfacing `reloaded: false` on compile failure, as the CMS
  already does) *before* a template can reference it as `class:`. The
  scaffold path sequences class-then-template.
- **No runtime dynamic compose.** Composition is static TS; the scaffolder
  generates a source module. Nothing assembles a class from mixin names at
  runtime.
- **Provenance-clean drafts.** The cross-worktree CMS attribution contract
  (`tagActingAuthor` in the REST boundary) governs how a non-wizard draft
  is attributed; drafts are attributed to the authoring session Avatar,
  fail-closed on none.

## Acceptance criteria

- The TypeDoc projection emits an authorable-fields artifact; a field marked
  `@authorable` appears with its type/shape, one not marked (or a
  runtime-state field like `Campfire.fuelClockStamp`) does not. Tests cover
  the projector over a fixture including a property field, an instruction
  field (shape = the `applyX` param), and a union-typed field.
- **Full current-catalog coverage:** every mixin in the `Mixins` registry is
  audited — each of its persistent/instruction fields carries exactly one of
  an `@authorable` annotation or an inline `@runtimeState` marker, and a
  coverage-guard test asserts no current mixin field is left unclassified (a
  later-added field with no classification fails the test).
- A gated Api op returns, for a class path, its effective authorable field
  list joined to shapes and effective-value+source. Tests cover a
  multi-mixin class and a field whose default comes from the resolution
  chain.
- The composer renders a form from that schema; a save writes
  `template.data` byte-compatible with the raw-JSON editor's output and goes
  live via the existing re-hydrate path. A round-trip test (form-save →
  raw-read) shows identical `data`.
- The catalog derives a structural entry for every backing class; the picker
  browses the derived + curated catalog; dedup collides two identical
  mixin-set compositions to one structural blueprint regardless of name. Tests
  cover the signature dedup and durable-id stability across a rename.
- A non-wizard authoring a new backing class sees the warning banner and
  receives a `denied` disposition on save; a wizard receives `committed`,
  the class file is written and reloaded, and a template can then reference
  it. Tests cover both dispositions and the class-then-template ordering.
- Catalog and source writes record an `AuthoringEvent` attributed to the
  context-derived author. Test covers attribution and the no-caller-supplied
  invariant.
- The curated overlay is seeded: the reusable pure-composition blueprints are
  named/blessed; logic-bearing classes appear as concrete kinds. A seed pass
  is checked in and idempotent.
- A subsystem doc section (extending [cms.md](../subsystems/cms.md), or a new
  sibling) documents the composer, the field-schema derivation, the catalog
  model, and the trust/disposition model.

## Cross-references

- **Seeding slates:** [cms-slate.md](../slates/builds/cms-slate.md)
  (§ Composition & the blueprint catalog; § Content editors),
  [authoring-intelligence-slate.md](../slates/builds/authoring-intelligence-slate.md)
  (the two catalogs).
- **Consumed substrate:** [cms.md](../subsystems/cms.md) (the shipped CMS —
  `CmsApi`/`CmsLogic`, the unified-tree projection, the attribution bridge,
  save go-live), [templates.md](../subsystems/templates.md) (the Hydrator
  two-phase `setX`/`applyX` dispatch), [mixins.md](../subsystems/mixins.md)
  (`Mixins` registry, `_mixinName`, `MixinApi`),
  [access.md](../subsystems/access.md) (the wizard-lockdown, `isWizard`),
  [provenance.md](../subsystems/provenance.md) (the authoring ledger,
  `getActingAuthor`), [document-store.md](../subsystems/document-store.md)
  (the `/home/<self>/` draft home).
- **Deferred to:** [map-slate.md](../slates/builds/map-slate.md) (zone
  editor canvas), cms-slate Wave 3 (per-type content editors), the access
  slate (leases, holodeck, the review gate, host isolation).
- **Precedent:** `Recipe` / `RecipeCatalogue` (reference-data Document +
  boot-warmed catalogue singleton, durable id, never cloned).
