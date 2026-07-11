# CMS composition surface — implementation plan

**Status:** active build plan. Realizes `docs/requirements/cms-composition-requirements.md` (closed scope — read it first). This plan says HOW; the requirements own the WHAT/WHY. Where the requirements left a planner seam, this plan makes the call inline and flags it **[CALL]**.

**Substrate docs a build agent must read before starting:** `docs/subsystems/cms.md`, `docs/subsystems/mixins.md`, `docs/subsystems/templates.md`, `docs/subsystems/access.md` (§ code-trust lockdown), `docs/subsystems/provenance.md`, `docs/subsystems/document-store.md`, `docs/ref-shapes.md` (Pattern A/B), and `CLAUDE.md` (Module Categories + Export discipline).

## Grounding facts established from the code (do not re-derive)

- **The write/go-live path is shipped and reused unchanged.** `CmsApi.write('content', path, body)` → `CmsLogic._writeContent` → `TemplateApi.saveTemplate(path, class, data, hydratorClass)` → re-hydrate every `StuffApi.findAllByTemplatePath(path)` via `TemplateApi.restoreFromTemplate`. The form is a *projection over `template.data`* that produces the same `body` string this path already consumes. `packages/server/src/mud/obj/api/CmsLogic.ts:542`.
- **The wizard-lockdown chokepoint is `TemplateLogic.enforceCodeFieldGate`** inside `TemplateApi.saveTemplate`. `class`/`hydratorClass`/`behaviors[].brain` (`CodeNamingFields.FIELDS`) are wizard-only-writable via a delta rule (`docs/subsystems/access.md:223`). Source writes (`CmsLogic._writeSource`) are `isWizard`-gated at `gateSourceWrite` + `HotReloadApi.reload`.
- **Attribution is automatic** through `saveTemplate` (`ProvenanceApi.recordAuthoring`, author from `ExecutionContextApi.getActingAuthor`, never a parameter). The REST bridge `CmsSession.runAsSessionPlayer` already calls `tagActingAuthor(actor)` (`packages/server/src/backend/CmsSession.ts:68`). New gated ops get attribution for free by funnelling their persistence through `saveTemplate`, and must call `ProvenanceApi.recordAuthoring`-equivalent for the catalog/source writes that do NOT go through `saveTemplate`.
- **The projection is a pure `scripts/` edit.** `packages/server/scripts/project-author-surface.ts` walks TypeDoc `api-model.json`; `renderType(TdType)` (line 234) renders type-JSON to a readable string (handles `reference`+`typeArguments` → `Quantity<Mass>`, `union` → `"a" | "b"`, `array`, `tuple`, `literal`). The `@hook` blockTag precedent is registered in `typedoc.json:22` and matched by `hookContract()` (line 180). Test lives at `packages/server/scripts/__tests__/project-author-surface.test.ts`.
- **Runtime field sources:** `MixinApi.getAllPersistentFields(ctor)` ∪ `MixinApi.getAllInstructionFields(ctor)` give the field list; `MixinApi.queryMixins(ctor)` gives the effective mixin set (each layer's `_mixinName`); `MixinApi.pascalCase(field)` derives `set<X>`/`apply<X>`. `packages/server/src/mud/api/mixin.ts`.
- **Reference-data precedent:** `Recipe extends Document` (`lib/craft/Recipe.ts`, `recipes` collection, `persistentFields`), `RecipeCatalogue` singleton (`obj/RecipeCatalogue.ts`, boot-warmed via `PostRegistrationMixin.postRegister`→`warm()`, `canEvict`/`canDestruct` refusals), `RecipeSeeder` (`backend/RecipeSeeder.ts`, insert-only, reads `mud/config/recipes.yaml` out of the seeds tree), boot manifest entry in `mud/bootstrap.ts:43`, seeder call in `AppBootstrap.ts:146`.
- **The instruction-field shape example:** `Detailed.applyDetails(data: Record<string, unknown>)` (`lib/description/Detailed.ts:449`) is `@hook`-tagged; its **parameter** type `Record<string,unknown>` is the data-payload shape, distinct from the runtime `details: Map<DetailId, Detail>` property type. `static instructionFields = ['details']`.
- **The runtime-state-not-authorable example:** `Campfire.fuelClockStamp` is a `persistentField` but pure runtime state (`obj/Campfire.ts:50`). It must NOT carry `@authorable`.
- **Wire types** live in `packages/types/src/index.ts` (CMS block at ~line 1911). **Client** is a React SPA route, Zustand `cms` slice (`packages/client/src/store/cmsSlice.ts`), REST-only via `cmsClient` (`packages/client/src/components/cms/cmsClient.ts`); surface component `CmsSurface.tsx`.

---

## Planner's-call decisions (made here, with justification)

1. **[CALL] describeClass + catalog + scaffold live in a NEW gated Api/Logic pair `StudioApi` → `StudioLogic` at `/obj/api/studio`, NOT a `CmsApi` extension.** `CmsApi` is deliberately a thin node-ref surface — four ops (`listTree/read/stat/write`) discriminated by `{backend, path}`, a structural twin of `source-tree.ts` (`docs/subsystems/cms.md` § CmsApi/CmsLogic). `describeClass`, catalog read/write, `scaffoldClass`, and `commitClass` are not node-ref-shaped and would pollute that contract. A dedicated `StudioApi`/`StudioLogic` pair (the composition surface) is the in-taxonomy home: gated `*Api` + `obj/api/*Logic` singleton, `SecurityApi.decorateApiClass`, `@CallSecurity(FromModule('/api/studio#StudioApi'))` on every `StudioLogic` public method — exactly the `CmsApi`/`CmsLogic` pattern. Content-template *saves* still route through the existing `CmsApi.write` unchanged (the form just produces the `body`); `StudioApi` never re-implements the template write.

2. **[CALL] Non-wizard drafts are client-only in v1; the persistence seam is the returned stable path + a dormant `_persistDraft` branch.** The requirements leave persist-vs-client-only to the planner but require the seam. Persisting a draft `.ts` to `/home/<self>/` would either need a new document `kind` or misuse the `script` kind (whose write funnels through `ScriptApi.saveScript`'s AST go-live — wrong: we must NOT execute an uncommitted draft). So v1 keeps the draft in the client Monaco buffer. The seam: `StudioLogic.scaffoldClass` computes and returns the **stable target path** (`/obj/<Name>.ts` for the eventual wizard commit; `/home/<self>/drafts/<Name>.ts` as the reserved non-wizard draft path) and contains a private `_persistDraft(path, source)` that is a documented no-op in v1. The future review workflow fills it in against the `/home/<self>/` document-store branch (`docs/subsystems/document-store.md` § self-home ownership). This keeps v1 free of a new kind + non-executable-draft go-live semantics while reserving the exact path convention and disposition contract the review workflow writes into.

3. **[CALL] Ref-shaped fields are declared explicitly on the `@authorable` tag, with a type-shape heuristic as fallback.** TypeDoc type-JSON cannot distinguish a Pattern A ref (`container: string`) from a plain string. The `@authorable` tag therefore carries an optional ref target: `@authorable ref:Template` or `@authorable ref:Material`. The projector reads the tag content → emits `refShape: 'path'` + `refType`. Pattern B live-ref fields (`Stuff & X`-typed) are auto-detected by the projector when the rendered type names a known Stuff subtype. Fallback (risks §b) covers unannotated refs.

4. **[CALL] Save disposition is a NEW return type on the `StudioApi` commit/catalog ops, not a change to `CmsWriteResult`.** `CmsWriteResult` (`reloaded: boolean` + `reloadDetail`) is correct for content/source template saves and stays. The `committed | denied` (reserve `proposed`) disposition attaches to `StudioApi.commitClass` and `StudioApi.publishBlueprint` — the writes the future review workflow re-dispositions.

---

## Phase breakdown

Each phase is independently reviewable and lists concrete files, module category, and commit shape.

### P0 — `@authorable` projector + field-schema artifact

**Goal (req Acceptance #1):** the TypeDoc pipeline emits an authorable-fields artifact keyed by mixin; `@authorable` fields appear with type/shape, unmarked and runtime-state fields do not.

**Module category:** projection change = `scripts/` edit + `typedoc.json` config + mixin-source annotations + one wire type in `@saxonberg/types`. No new module.

**Files:**
- **Modify** `packages/server/typedoc.json` — add `"@authorable"` **and `"@runtimeState"`** to `blockTags` (exactly the `@hook` precedent at line 22). `@runtimeState` is the inline "persistent-but-not-authorable" marker (see the full-registry audit below).
- **Modify** `packages/server/scripts/project-author-surface.ts` — add a new pure exported function `projectAuthorableFields(project: Refl): AuthorableFieldsArtifact` and emit `authorable-fields.json` from `main()` (a second `writeFileSync` next to `author-surface.json`, i.e. `packages/server/docs/api/authorable-fields.json`). Reuse `renderType`, `joinText`, and the module/class-walk scaffolding already in the file. The new pass:
  - Walk every module → class/interface reflection. For each class, read its static `persistentFields` and `instructionFields` array-literal members (from the reflection's static Property children's `type`/`defaultValue`) to classify fields; read `_mixinName`'s literal default to key the output by mixin name (fall back to the class `name`).
  - For each member (Property/Accessor kind) carrying `@authorable` in its comment (reuse a `hookContract`-shaped helper `authorableTag(refl)` returning the tag content or `null`):
    - **property field** → `typeShape = renderType(member.type)`.
    - **instruction field** (name ∈ the class's `instructionFields` literal) → find the sibling method `apply<Pascal(field)>`, `typeShape = renderType(sig.parameters[0].type)` (the payload shape, per `docs/subsystems/templates.md` two-phase dispatch — the `Detailed.applyDetails` param, not the `details` Map property).
    - **union of string literals** → also emit `enumValues: string[]` (walk `member.type.types` for `literal` kinds).
    - **ref tag** (`@authorable ref:<Type>`) → emit `refShape: 'path'`, `refType: '<Type>'`.
  - Emit `{ mixin, field, kind: 'property'|'instruction', typeShape, description, enumValues?, refShape?, refType? }[]`, grouped `Record<mixinName, AuthorableFieldDescriptor[]>`.
- **Modify** `packages/types/src/index.ts` — add wire types `AuthorableFieldDescriptor`, `AuthorableFieldsArtifact` (mirror the *shape discipline* of `SettingsSchemaEntry` in `lib/shell/Environment.ts:64` — `key/type/default/description/enumValues` — but the `type` slot here is the projected `typeShape` string, NOT a hand-authored enum, per the "no second source of truth" constraint).
- **Modify — full-registry audit, every mixin in the current catalog (not a starter set).** Walk **all** entries in `lib/mixin.ts`'s `Mixins` registry; for **each** mixin, classify **every** one of its `persistentFields` + `instructionFields` as either author-facing (`@authorable`, with `ref:<Type>` where it points at other Stuff) or runtime-state (deliberately left unannotated). Full current-catalog coverage is the P0 deliverable — the tightened scope. Behavior-only mixins (no persistent/instruction fields) contribute nothing. The author↔state judgment is made **explicitly per field** — e.g. `Detailed.details` → `@authorable` (instruction, `applyDetails`-param-shaped); `Named.name`/`surname`, `Visible` short/long description, `LightSource.emittedIntensity`/`emittedColorTemperature`, any string-union field, a Pattern-A ref field (`@authorable ref:...`) → `@authorable`; `Campfire.fuelClockStamp` and its peers → left as runtime state. Every non-authorable persistent/instruction field carries an **inline `@runtimeState` TSDoc marker** (the second new blockTag) at its declaration — so each field is classified *where it lives*, "consciously runtime state" is distinguishable from "unclassified / forgotten", and the audit is **parallelizable by file** (no shared exclusion list to conflict on). The invariant: every current registry mixin's persistent + instruction fields carry **exactly one** of `@authorable` / `@runtimeState`. Unannotated *future* fields still degrade to raw-JSON at runtime (the Constraints rule), but no **current** registry field may be left unclassified (the coverage-guard test enforces this).

**Tests** (`packages/server/scripts/__tests__/project-author-surface.test.ts`, extend):
- Fixture model with a property field, an instruction field (assert `typeShape` = the `applyX` param type, not the runtime field type), a union-typed field (assert `enumValues`), a `@authorable`-absent persistent field (assert excluded), and a runtime-state field named like `fuelClockStamp` (assert excluded). Maps req Acceptance #1.
- **Full-coverage guard (the tightened-scope deliverable):** a test enumerates every `Mixins` registry entry and asserts each of its `persistentFields` + `instructionFields` carries **exactly one** of `@authorable` (present in `authorable-fields.json`) / `@runtimeState` (the inline marker) — so no current mixin field is silently unclassified, and none is double-classified. A new mixin field added later without a classification fails this test (the tripwire that keeps coverage complete). The test's failure message lists the offending `mixin.field`s — which doubles as the audit worklist. Maps req Acceptance #1 (full-registry coverage).

**Commit:** `feat(studio): @authorable projector + authorable-fields artifact`

---

### P1 — `describeClass` gated read (`StudioApi`/`StudioLogic`)

**Goal (req Acceptance #2):** a gated op returns, for a class path, its effective authorable field list joined to shapes + effective-value+source.

**Module category:** gated `*Api` + `obj/api/*Logic` singleton pair (the `CmsApi`/`CmsLogic` precedent). REST route mirroring `CmsRoutes`.

**Files:**
- **New** `packages/server/src/mud/api/studio.ts` — `StudioApi`, thin forwarding shell resolving `StudioLogic` at `/obj/api/studio` via `StuffApi.singletonSync` + `HotReloadApi.getCurrentExport` (copy the `logic()` helper from `cms.ts:76`). `SecurityApi.decorateApiClass(StudioApi)` at file end. Homes the surface's error class `StudioError` (`code: 'denied'|'not-found'|'invalid'`, the `CmsError` precedent). Re-exports its wire types from `@saxonberg/types`.
  - `static describeClass(classPath: string, contextPath?: string): Promise<ClassDescription>`
- **New** `packages/server/src/mud/obj/api/StudioLogic.ts` — `@Unshadowable class StudioLogic extends ApiLogic`. `const StudioApiCallers = SecurityPolicies.FromModule('/api/studio#StudioApi')`; every public method `@CallSecurity(StudioApiCallers)`. `describeClass`:
  1. `gateRead()` — author-tier via `AccessApi.isAuthor(actingActor())`, actor from `ExecutionContextApi.getActingAuthor` (copy `actingActor()` + the gate helper verbatim from `CmsLogic.ts:212`, `221`). Null → `StudioError('denied')` fails closed.
  2. `ctor = await StuffApi.loadClassByPath(classPath)` (`stuff.ts:1111`).
  3. Effective mixin set = `MixinApi.queryMixins(ctor)`; field list = `getAllPersistentFields(ctor)` ∪ `getAllInstructionFields(ctor)`.
  4. Load the `authorable-fields.json` artifact (bundled at build; read once + cache on the singleton). **Join by field name** to the artifact descriptors filtered to the effective `_mixinName` set — a field present in the runtime list but absent from the artifact degrades to `{ typeShape: 'json' }` (the raw-JSON fallback, per Constraints).
  5. Effective value + source: prefer a live representative instance (`StuffApi.findByTemplatePath(contextPath)` when given, else `findAllByTemplatePath(classPath)[0]` if any) and read each field through its accessor (`get<X>()` / bracket) — this exercises the engine's own `Zone.lookupField` → biome resolution chain via the instance (never reimplemented; see risk §c). Absent an instance, fall back to a guarded `new Ctor()` to read the class-default field initializer; `source: 'class-default'`. For `EnvironmentMixin`-declared settings, resolve via `ShellApi.resolveSetting`.
  6. Return `ClassDescription { classPath, mixins: string[], fields: StudioFieldDescriptor[] }` where each field = `{ name, mixin, kind, typeShape, description, enumValues?, refShape?, refType?, defaultValue, valueSource }`.
- **New** `packages/server/src/backend/StudioRoutes.ts` — `StudioRoutes.setup(app)` mirroring `CmsRoutes` (`GET /api/studio/describe?class=&context=`), each route `requireAuth` + wrapped in `CmsSession.runAsSessionPlayer(req, 'compose.describeClass', () => StudioApi.describeClass(...))` (reuse the existing bridge — it already stamps `tagActingAuthor`). Map `StudioError.code`→HTTP via a `sendStudioError` copy of `sendCmsError`. Mount from `Server.setupRoutes()` next to `CmsRoutes.setup(app)`.
- **Modify** `packages/types/src/index.ts` — `ClassDescription`, `StudioFieldDescriptor`, `StudioErrorBody`.

**Tests** (`packages/server/src/mud/obj/api/__tests__/StudioLogic.test.ts`):
- Multi-mixin class join: assert every effective-mixin authorable field appears with its projected `typeShape`; a non-authorable persistent field is absent. Maps req Acceptance #2.
- A field whose default comes from the resolution chain: describe a class in a `contextPath` Zone that supplies a `lookupField` default; assert `valueSource` reflects the chain, not the bare class default.
- Anti-spoof: `describeClass` with a null-actor context → `denied` (no `actor` param exists to pass).

**Commit:** `feat(studio): gated describeClass over the effective mixin set`

---

### P2 — schema-driven form generator + widget registry (client)

**Goal (req Acceptance #3):** the composer renders a form from the P1 schema; save writes `template.data` byte-compatible with the raw-JSON editor and goes live via the existing re-hydrate path; raw-JSON is retained as an advanced mode.

**Module category:** client React + Zustand slice. No server change (save reuses `CmsApi.write('content', …)`).

**Files:**
- **New** `packages/client/src/store/studioSlice.ts` — Zustand slice (compose into the store next to `cmsSlice`). State: `description: ClassDescription | null`, `formValues: Record<string, unknown>`, `advanced: boolean` (raw-JSON toggle), `rawDraft: string`. Actions: `studioDescribe(classPath, contextPath?)`, `studioSetField(name, value)`, `studioToggleAdvanced()`. **Round-trip invariant:** the slice owns one canonical `data` object; the form widgets read/write `formValues`, and `serializeData(formValues)` MUST produce a JSON string byte-identical to what the raw-JSON editor would produce for the same values (same key set, same `JSON.stringify(data, null, 2)` formatting as `CmsLogic.read` at line 390). Save calls the existing `cmsSave`/`cmsClient.write('content', path, serialized, csrf)` — no new save path.
- **New** `packages/client/src/components/cms/studioClient.ts` — thin `fetch` client for `/api/studio/describe` (the `cmsClient.ts` shape, `credentials:'include'`, `unwrap` on `StudioErrorBody`).
- **New** `packages/client/src/components/cms/studio/StudioForm.tsx` — reads `description.fields`, renders each via the widget registry; a header toggle switches to the raw-JSON Monaco editor (advanced/fallback mode) editing the same `data`.
- **New** `packages/client/src/components/cms/studio/widgets/` — a `widgetRegistry` mapping a field descriptor to a component. **Default widgets (v1):** `TextWidget` (typeShape `string`), `NumberWidget` (`number`), `BooleanWidget` (`boolean`), `EnumWidget` (descriptor has `enumValues`), `QuantityWidget` (typeShape startsWith `Quantity<`), and `ReferencePickerWidget` (descriptor has `refShape` — stub in P2, wired to the catalog/template scope in P3). Unmatched typeShape → falls back to a per-field raw-JSON textarea (never a hand-authored schema; the Constraints "degrades to raw-JSON" rule). Registry lookup order: `refShape` → `enumValues` → `typeShape` prefix/exact.
- **Modify** `packages/client/src/components/cms/CmsSurface.tsx` / `CmsEditor.tsx` — when the open content leaf has a `templateMeta.class`, offer a "Studio" tab alongside raw-JSON; the composer calls `studioDescribe(templateMeta.class, path)`.

**Tests** (`packages/client/src/store/__tests__/studioSlice.test.ts` + a widget-registry test):
- **Form round-trip (req Acceptance #3):** given a `ClassDescription` + values, `serializeData` output parsed → re-fed to `describe`+form → re-serialized is identical; and equals the raw-JSON editor's `JSON.stringify(data, null, 2)`. This is the load-bearing byte-compat test.
- Widget selection: each typeShape/refShape/enum routes to the expected widget; unknown → raw-JSON fallback.

**Commit:** `feat(studio): schema-driven composer form + widget registry`

---

### P3 — blueprint catalogue (Document + singleton + seeder) + catalog read/write ops + class picker

**Goal (req Acceptance #4, #7):** every backing class derives a structural catalog entry; a curated overlay adds names/hierarchy/blessing; the picker browses derived+curated; dedup collides identical mixin-sets to one structural blueprint keyed on durable id; the overlay is seeded idempotently.

**Module category:** reference-data `Document` + boot-warmed catalogue singleton (the `Recipe`/`RecipeCatalogue`/`RecipeSeeder` precedent) + catalog read/write ops on `StudioApi`/`StudioLogic` + client picker.

**Files:**
- **New** `packages/server/src/mud/lib/studio/Blueprint.ts` — `Blueprint extends Document` (`Recipe.ts` precedent). `static collectionName = 'blueprints'`. `persistentFields`: `blueprintId` (durable id, unique-indexed), `signature` (structural signature, unique-indexed — the dedup key), `name` (mutable display label — never a key), `baseClass`, `mixinNames: string[]`, `kind: 'composition' | 'concrete'`, `classPath` (concrete kinds), `parent` (hierarchy blueprintId/category), `blessed: boolean`, `description`. Getters mirror `Recipe`. `lib/studio/` is a legitimate new subsystem folder (concern = composition catalog; NOT `lib/mixins/`).
  - **Structural signature helper** (module-private, also used by the seeder + scaffold dedup): `signatureOf(ctor)` = `baseClassName + '|' + queryMixins(ctor).map(_mixinName).sort().join(',')`. The dedup key. Two authors composing the same particles collide to one signature.
- **New** `packages/server/src/mud/obj/BlueprintCatalogue.ts` — singleton at `/obj/BlueprintCatalogue`, `PostRegistrationMixin(Idea)`, boot-warmed `warm()` from the `blueprints` collection (copy `RecipeCatalogue.ts` verbatim in shape: `cache: Map<blueprintId, Blueprint>`, `bySignature: Map<signature, blueprintId>`, `getBlueprint`, `findBySignature`, `allBlueprints`, `canEvict`/`canDestruct` refusals).
- **New** `packages/server/src/backend/BlueprintSeeder.ts` — insert-only/idempotent (`RecipeSeeder` precedent). Two layers:
  1. **Derived skeleton:** enumerate the distinct `class` paths across the `domain` collection (`Template.find({})` → unique `.class`) — the honest "every existing backing class." For each, `StuffApi.loadClassByPath` → `signatureOf(ctor)`; insert a `{ kind: 'concrete', signature, baseClass, mixinNames, classPath, blessed: false, name: <derived> }` blueprint if no blueprint with that `signature` exists (dedup on signature). Migration is the derive step, not a task.
  2. **Curated overlay:** read `packages/server/src/mud/config/blueprints.yaml` (out of the seeds tree, `recipes.yaml` rationale). Each entry names/blesses a pure-composition blueprint or a concrete kind: `{ blueprintId, name, kind, baseClass, mixinNames | classPath, parent?, blessed: true, description }`. Match/dedup by `signature` (computed from `baseClass`+`mixinNames`) so a curated name attaches to the derived skeleton entry rather than duplicating it.
- **New** `packages/server/src/mud/config/blueprints.yaml` — the seed pass (see § Seed pass below).
- **New** seed template `packages/server/src/mud/seeds/obj/BlueprintCatalogue/seed.yaml` — `{ class: /obj/BlueprintCatalogue, data: {} }`.
- **Modify** `packages/server/src/mud/bootstrap.ts` — add `{ templatePath: '/obj/BlueprintCatalogue' }` to `bootstrapManifest` after `/obj/RecipeCatalogue`.
- **Modify** `packages/server/src/backend/AppBootstrap.ts` — call `await BlueprintSeeder.run();` in the per-collection seeder block next to `RecipeSeeder.run()` (line 146).
- **Modify** `packages/server/src/mud/api/studio.ts` + `StudioLogic.ts` — add catalog ops:
  - `listBlueprints(): Promise<BlueprintSummary[]>` and `getBlueprint(blueprintId): Promise<BlueprintDetail>` — author-gated reads that read the ungated `BlueprintCatalogue` singleton (`StuffApi.singletonSync`/`findByTemplatePath('/obj/BlueprintCatalogue')`), the gating-at-the-Api, reference-read-on-the-catalogue split (`CmsLogic` gates; `RecipeCatalogue` is ungated).
  - `publishBlueprint(input): Promise<BlueprintWriteResult>` — **act #2** (name/publish a composition of already-approved classes → author-tier, no wizard). Gate `isAuthor`. Persist a `Blueprint` via `Blueprint.save()`; **dedup on `signature`** (reuse existing blueprintId on collision — durable id stable across rename). Record an `AuthoringEvent` for the blueprint (see § Attribution below). Returns `{ disposition: 'committed', blueprintId }` or `denied`.
- **Modify** `packages/types/src/index.ts` — `BlueprintSummary`, `BlueprintDetail`, `BlueprintWriteResult`, `StudioDisposition = 'committed' | 'denied'` (with a `// 'proposed' reserved` comment).
- **New client** `packages/client/src/components/cms/studio/ClassPicker.tsx` — browses `listBlueprints` (derived + curated, grouped by `parent` hierarchy, blessed surfaced first); selecting a blueprint drives `studioDescribe(blueprint.classPath)`. Wire `ReferencePickerWidget` (from P2) to browse in-scope templates of the ref target type (via `CmsApi.listTree('content', …)` filtered by `templateMeta.class`).

**Tests** (`packages/server/src/mud/obj/__tests__/BlueprintCatalogue.test.ts`, `BlueprintSeeder.test.ts`, `StudioLogic.test.ts`):
- **Signature dedup:** two class paths with identical `baseClass`+sorted-mixin-set collide to one blueprint; a `publishBlueprint` of an existing signature returns the existing `blueprintId`. Maps req Acceptance #4.
- **Durable-id stability across rename:** `publishBlueprint` renaming a blueprint keeps `blueprintId` and `signature` constant; nothing keys off `name`. Maps req Acceptance #4.
- **Skeleton coverage:** the seeder derives a structural entry for every distinct template `class`. Maps req Acceptance #4/#7.
- **Idempotent seed:** running `BlueprintSeeder.run()` twice inserts zero the second time. Maps req Acceptance #7.

**Commit:** `feat(studio): blueprint catalogue + curated overlay seed`

---

### P4 — new-class scaffold + wizard-gated commit (disposition + class-then-template ordering) + warning banner

**Goal (req Acceptance #5, #6):** a non-wizard authoring a new backing class sees the banner and gets `denied` on save; a wizard gets `committed`, the class is written+reloaded, and a template can then reference it; catalog and source writes record an `AuthoringEvent`.

**Module category:** `StudioApi`/`StudioLogic` gated ops (source write reuses `CmsLogic._writeSource`-equivalent gating) + client scaffold flow + banner.

**Files:**
- **Modify** `packages/server/src/mud/api/studio.ts` + `StudioLogic.ts`:
  - `scaffoldClass(input: { name, baseClass, mixinNames }): Promise<ScaffoldResult>` — **author-tier, open to all** (composing/scaffolding is inert client text). Generates a static TS source module (`class <Name> extends <MixinA>(<MixinB>(<Base>)) {}` — the mixin-palette composition, the `Character`/`Coin` compose idiom in `docs/subsystems/mixins.md`). Returns `{ source, targetPath }` where `targetPath = '/obj/<Name>.ts'` (wizard commit target) and, for non-wizards, also `draftPath = '/home/<self>/drafts/<Name>.ts'` (the reserved seam). **v1 does NOT persist** (private `_persistDraft` is a documented no-op — the **[CALL] #2** seam). No runtime dynamic compose — this emits a source file only.
  - `commitClass(input: { targetPath, source }): Promise<ClassCommitResult>` — **act #3, wizard-gated.** Gate `isWizard(actingActor())` (mirror `gateSourceWrite` from `CmsLogic.ts:184` — `isWizard` AND `can('write', resolveSourceFolderZone(path))`). **Non-wizard → return `{ disposition: 'denied', message }`** (a disposition, not a throw — the banner is warned *before*, denial is graceful). Wizard path, **class-then-template ordering (Constraint):**
    1. Write the source via `SourceTreeApi.write(sourceAbs(targetPath))` then `HotReloadApi.reload(abs)` (reuse the exact `_writeSource` sequence). A compile failure → `{ disposition: 'committed', reloaded: false, reloadDetail: err }` (persisted-but-not-live, the shipped CMS behavior — surfaces the failure, does not 500).
    2. Only on `reloaded: true` may a caller then `CmsApi.write('content', templatePath, …)` referencing the new `class:` — enforced by ordering, not a new gate (the `class` field still trips `TemplateLogic.enforceCodeFieldGate`, which the wizard passes).
    - Record an `AuthoringEvent` for the source path (see § Attribution). Return `{ disposition: 'committed', classPath: targetPath, reloaded, reloadDetail }`.
- **Modify** `packages/types/src/index.ts` — `ScaffoldResult`, `ClassCommitResult { disposition, classPath, reloaded, reloadDetail?, message? }`.
- **Modify** `packages/server/src/backend/StudioRoutes.ts` — routes `POST /api/studio/scaffold`, `POST /api/studio/commit`, `POST /api/studio/catalog` (all CSRF-protected via the `X-CMS-CSRF` double-submit already in `CmsRoutes`; reuse `req.session.cmsCsrf`), each through `CmsSession.runAsSessionPlayer`.
- **New client** `packages/client/src/components/cms/studio/MixinPalette.tsx` — pick a base + mixin set → `scaffoldClass` → opens the generated source in Monaco (the existing `source` backend editor path).
- **New client** `packages/client/src/components/cms/studio/WarningBanner.tsx` — reads the client `auth.isWizard` hint (already carried on `/auth/status`, `AuthRoutes.ts:118`) and, for non-wizards on the scaffold/commit flow, shows the **warning before save** ("You can compose and edit this class, but only a wizard can publish it"). Non-authoritative UX; the REST `commitClass` gate remains authority.
- **Modify** `studioSlice.ts` — `studioScaffold`, `studioCommit`, `studioPublish` actions; surface the `disposition` (`committed`/`denied`) inline, not a boolean.

**Tests** (`StudioLogic.test.ts` + client slice test):
- **Both dispositions + ordering (req Acceptance #5):** non-wizard `commitClass` → `denied`, no file written; wizard `commitClass` → `committed`, file written + `reloaded: true`; then a `CmsApi.write('content', …)` referencing the new class succeeds — and asserting the reverse order (template before class) fails to resolve the class. Compile-failure branch → `committed`+`reloaded: false`.
- **Attribution (req Acceptance #6):** `commitClass` and `publishBlueprint` record an `AuthoringEvent` attributed to the context-derived author; assert no `actor` parameter exists on any op (the anti-spoof invariant) and a null-actor context records no row.

**Commit(s):** `feat(studio): new-class scaffold + wizard-gated commit`, then `feat(studio): composer client — palette, picker, warning banner`.

---

### P5 — subsystem doc section

**Goal (req Acceptance #8):** document the composer, field-schema derivation, catalog model, trust/disposition model.

**Files:** **Modify** `docs/subsystems/cms.md` (add a "Composition surface" section) — or a new sibling `docs/subsystems/studio.md` if the section outgrows cms.md. Cover: the `@authorable` projector + `authorable-fields.json` join; `StudioApi`/`StudioLogic` describeClass; the `Blueprint`/`BlueprintCatalogue`/`BlueprintSeeder` derived-skeleton + curated-overlay model keyed on durable id + signature dedup; the three creation acts + `committed`/`denied` disposition + the deferred `proposed` seam. (This is the acceptance-criterion deliverable; the finalize skill's doc sweep graduates it.)

**Commit:** folded into the pre-merge sweep, or `docs(compose): composition surface section`.

---

## The seed pass (blueprints.yaml)

Derive is automatic (P3 skeleton); the hand-curated pass names and blesses the reusable **pure-composition** blueprints and lists the **logic-bearing** classes as concrete kinds:
- **Pure-composition blueprints** (named + `blessed: true`, `kind: 'composition'`): compositions with no custom methods/fields — e.g. the requirements' `class Coin extends GlobbableMixin(Idea)`. These are recomposable: a named blueprint and a hand-composed equivalent render identically because the generator reads the effective mixin set. Enumerate the shipped `/obj` leaf classes that are bare compositions.
- **Logic-bearing kinds** (`kind: 'concrete'`, `classPath` set, may be `blessed`): `Campfire` (owns `fuelClockStamp` + `getTemperature` override + behavior) is a concrete catalog *kind*, **not** a recomposable blueprint — behavior lives in the class, not in particles. List it (and peers) as concrete entries pointing at their `classPath`.
- Hierarchy via `parent` (category grouping). Names are mutable display labels; `blueprintId`/`signature` are the keys.

The seed is checked in (`blueprints.yaml`) and idempotent (P3 seeder dedups on signature/blueprintId).

---

## Risks / sharp edges

**(a) Scaffold-new-source-file + `HotReloadApi.reload` ordering and failure surfacing.** A new `/obj/<Name>.ts` must be written *and reloaded* before any template's `class:` can resolve it; a compile error leaves the file persisted but not live.
- **Recommended:** `commitClass` sequences write → `reload` inside the existing `_writeSource` try/catch shape (`CmsLogic.ts:619`); on reload failure return `{ disposition: 'committed', reloaded: false, reloadDetail }` (persisted-not-live, the shipped behavior) and the client blocks the follow-on template save until `reloaded: true`. The template save is a *separate* client step, so ordering is explicit, not implicit.
- **Fallback:** if a two-step client flow proves fragile, make `commitClass` accept an optional `thenTemplate` and perform class-then-template server-side atomically, rolling nothing back but reporting a combined disposition. Keep the two-op contract as the default.

**(b) Ref-shaped field detection (Pattern A path-string vs Pattern B live-ref).** From TypeDoc alone `container: string` is indistinguishable from a plain string.
- **Recommended:** explicit `@authorable ref:<Type>` tag content (the **[CALL] #3** decision) — the author declares ref-ness; the projector emits `refShape:'path'`+`refType`, and the client auto-selects `ReferencePickerWidget`. Pattern B (`Stuff & X`-typed) fields are auto-detected when `renderType` names a known Stuff subtype.
- **Fallback:** a name/type heuristic in the projector — a `string`-typed persistent field whose name matches the known reference-field set (`container`, `destination`, `door`, `material`, `warren`, `startLocation`, …, from `docs/subsystems/access.md` transitive-set list + `docs/ref-shapes.md`) is inferred as a path ref. Unresolved → the field degrades to a text widget (still editable; never wrong-typed).

**(c) TypeDoc resolution of complex generics (`Quantity<Mass>`).** `renderType` already renders `reference`+`typeArguments` as `Quantity<Mass>` (line 239), so the string is stable; the widget keys off the `Quantity<` prefix.
- **Recommended:** the `QuantityWidget` matches `typeShape.startsWith('Quantity<')` and parses the inner unit dimension for validation/labelling; the describeClass `defaultValue` is read from a live instance's `getX()` (which returns a real `Quantity`), serialized the same way the raw-JSON editor does.
- **Fallback:** if TypeDoc collapses a generic to a bare `Quantity` (no args) for some declarations, the widget still matches the prefix and treats the unit as free-text; unmatched exotic generics degrade to the raw-JSON field. No throw.

**(d) Curated-overlay global-commons ownership vs the gated-write actor model.** The overlay is a *global durable-id commons* (kinds), but every gated write derives an actor from context and records provenance — a commons has no single owner.
- **Recommended:** `publishBlueprint` gates `isAuthor` (author-tier, act #2 — "a pointer to trusted code is not untrusted code") and records the `AuthoringEvent` against the **blueprint's blueprintId path** (a synthetic `/obj/BlueprintCatalogue/<blueprintId>`-shaped provenance path), attributing the *naming act* to its author while the blueprint record itself is commons-owned (like `Recipe`/reference data — never cloned, no per-owner namespace). The `Blueprint.save()` goes through `Document.save` (not `saveTemplate`), so the `AuthoringEvent` is recorded explicitly by `StudioLogic`, not the `saveTemplate` chokepoint. Actor from `getActingAuthor`, never a parameter.
- **Fallback:** if per-blueprint provenance paths prove awkward, record the authoring act against the author's body-of-work only (the `author`-indexed side of the ledger) with `kind: 'catalog'`, leaving the blueprint itself unattributed-in-place — still no caller-supplied principal, still auditable.

---

## Out of scope (do not build) — mirrors the requirements' Non-goals

- **The map/zone editor and its 2D/3D canvas** → `map-slate.md`. This build is class/object composition; spatial layout is out.
- **Per-type content editors** (bespoke room editor, detail-tree/exit/contents custom widgets) → cms-slate Wave 3. Ship the *generic* composer + the reusable *reference-picker* only; the room-specific widgets are not in scope.
- **The alias auto-approve exception** (non-wizard self-commit of a trust-empty empty-subclass via a no-new-code AST check) → deferred. The template-clone path already covers the common "owned instance of an approved kind" case.
- **The git layer and the propose → wizard-rubber-stamps → catalog-review workflow** → future builds. Accommodate them (the `proposed` disposition slot; the stable scaffold path; catalog-write separate from source-commit) but ship neither.
- **Composition-rule metadata** (`@requires`/`@conflicts` per mixin for pre-emptive palette validation) → not authored here; v1 leans on the TS-compile/reload gate as the backstop.
- **Runtime dynamic composition** → a backing class is always a static TS module; the scaffolder emits source. Nothing assembles a class from mixin names at runtime.
- **Engine-typed IntelliSense / LSP / host isolation for untrusted code** → the authoring-intelligence slate. Monaco keeps stock language support; untrusted code is gated at publish, not sandboxed at execution.
- **The review/versioning/changeset/draft-staging model, cross-tab live sync, anon read** → remain deferred exactly as `docs/subsystems/cms.md` § Deferral boundary states. This build adds no new WebSocket frame; the composer is REST-only over the existing `?surface=cms` route.

---

## Critical files for implementation
- `packages/server/scripts/project-author-surface.ts` (+ `packages/server/typedoc.json`) — the `@authorable` projector, P0.
- `packages/server/src/mud/obj/api/CmsLogic.ts` — the reused write/go-live + gating pattern that `StudioLogic` mirrors (`_writeSource`, `actingActor`, gate helpers).
- `packages/server/src/mud/api/mixin.ts` — `getAllPersistentFields`/`getAllInstructionFields`/`queryMixins`/`pascalCase`, the runtime field/mixin source for describeClass + the signature.
- `packages/server/src/mud/obj/RecipeCatalogue.ts` + `packages/server/src/mud/lib/craft/Recipe.ts` + `packages/server/src/backend/RecipeSeeder.ts` — the exact Document + catalogue-singleton + seeder precedent for `Blueprint`/`BlueprintCatalogue`/`BlueprintSeeder`.
- `packages/client/src/store/cmsSlice.ts` (+ `packages/client/src/components/cms/cmsClient.ts`, `CmsSurface.tsx`) — the client slice/client/surface shape the composer extends.
