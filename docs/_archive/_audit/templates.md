# Audit: CMS_TEMPLATE_PATTERN.md

**Verdict: heavy rewrite with salvage.** Template shape, constructor contract,
hydration model, and lifecycle hook have all changed; salvageable scaffolding
is real but small.

## 1. Accurate

- High-level pitch: "objects cloned from `domain` collection templates by path"
- Class-path security validation (`/`, no `..`, must be under `/obj/` or
  `/lib/`)
- Avatar template path convention (`/avatar/player/<playerId>`,
  `Avatar.getTemplatePath()`)
- `Collections.Domain` exists, `DomainTemplate` interface exists
- Dynamic-import strategy (no manual class registration)

## 2. Drifted

- **Template shape**: Doc shows `{ path, class, data }`. Real shape is
  `{ _id?, path, class, hydratorClass?, data }` — `hydratorClass` is a
  first-class field documented at length in `stuff.ts`/`Hydrator.ts` and
  entirely absent from the doc.
- **Constructor contract**: Doc shows `new Avatar(templateData)` with the
  class accepting a data object. Reality (`StuffApi.clone`,
  `StuffConstructor = new () => T`): clone constructs with **no args**
  (`new ClassConstructor()`); hydration is a separate step. The
  "Implementing Cloneable Classes / Constructor Pattern" example is wrong.
- **Hydration**: Doc has no concept of a Hydrator. Real pipeline resolves
  `hydratorClass` and runs `hydrator.hydrate(backing, data)`; absent
  `hydratorClass` means **no hydrator runs and `data` is ignored** —
  opposite of the doc's implied "data is always applied via constructor."
- **`StuffApi.create()` signature**: Doc shows
  `StuffApi.create(() => new Avatar(...))` returning sync, then "must call
  initialize manually." Reality: returns `Promise<T>`, is awaited, and itself
  runs the register + `postRegister` tail.
- **Pipeline steps**: Doc's 7-step list is missing zone resolution/stamping,
  Proxy wrapping (`ProxyApi.wrap`), construction sentinel
  (`Stuff._beginConstruction`), `templatePath` stamping, ExecutionContext
  frame, and the unregister-on-throw rollback.

## 3. Gone

- **`async initialize()` method** — replaced by
  `PostRegistrationMixin.postRegister(context)`. The "Async Initialization"
  section, the "auto-calls initialize()" claim, and the example
  `public async initialize()` are gone. Docstring on `PostRegistration.ts`
  even calls out: "Replaces the previous
  `'initialize' in obj && typeof init === 'function'` duck-typing check."
- **Direct creation pattern shown** (`StuffApi.create(() => new Avatar(...))`
  with sync return + manual init) — no longer matches any real signature.
- **Per-template "no manual class registration" framing** is now incomplete:
  `ModuleApi.stamp()` *does* register classes by URL at load time for the
  call-security framework (orthogonal to clone, but worth knowing).

## 4. Missing from doc

- `hydratorClass` field, the `Hydrator` interface, and `PersistentHydrator`
  (with its `templatePath` constant)
- `PostRegistrationMixin` + `postRegister(context)` +
  `MixinApi.isPostRegistration` predicate
- `clone(path, context)` — second `context` arg threaded to `postRegister`
  (the canonical Avatar use case: `{ user }`)
- `TemplateApi.saveTemplate()` and folder/leaf invariant (`DomainHook`,
  Zone vs. leaf, `validateFolderLeafSave/Delete`)
- Zone resolution at clone time via `ZoneApi.resolveZoneForPath()`
  (stamped before hydrate)
- Proxy wrapping + register-before-hydrate ordering (so self-referential
  resolvers see the in-flight object) + unregister-on-throw
- `StuffApi.createSync()` and its `PostRegistrationMixin` guardrail
- `templatePath` stamped onto the instance for identity-keyed policies
- `Stuff._beginConstruction()/_endConstruction()` sentinel
- Setter-based field-shape invariants (the `Hydrator` bracket-assign contract)

## 5. Salvage

- Overview paragraph and "Domain Collection Structure" intro (after adding
  `hydratorClass`)
- Class-path security rules section
- Avatar template path convention section
- "Presentation Defaults" pointer to `DescribeApi`/ANTIPATTERNS
- "Benefits" list (mostly still true)

## 6. Relevant files

- `packages/server/src/mud/api/template.ts`
- `packages/server/src/mud/api/module.ts`
- `packages/server/src/mud/api/stuff.ts` (clone path)
- `packages/server/src/mud/lib/stuff/Hydrator.ts`
- `packages/server/src/mud/lib/persistence/PersistentHydrator.ts`
- `packages/server/src/mud/lib/stuff/PostRegistration.ts`
- `packages/server/src/mud/api/zone.ts`
- `packages/server/src/mud/obj/hooks/DomainHook.ts`
