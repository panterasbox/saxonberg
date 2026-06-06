# Document refactor — implementation plan

> Graduates [docs/requirements/document-refactor-requirements.md](../requirements/document-refactor-requirements.md)
> (seeded by [docs/slates/persistence-architecture-slate.md](../slates/persistence-architecture-slate.md)).
> Scope: **Waves 1–2 only.** Introduce a plain `Document` base, lift the
> CRUD/serialization surface off `Persistable` onto it, reassign `User` /
> `GoogleProfile` / `Template` (+ `LeafTemplate` / `ZoneTemplate`), and
> **delete `Persistable`**. Marshallers, hooks, and `PersistentHydrator` stay
> Idea-rooted Stuff, reached through an injected resolver seam. Stored MongoDB
> shapes are invariant (zero migration). **Wave 3 (un-Stuffing
> marshallers/hooks/Hydrator) is OUT.**

## Audit verification (confirmed against current code)

All re-verified by grep/read; ground truth:

- **3 subclasses.** `User` (`lib/identity/User.ts:17`, `collectionName='users'`),
  `GoogleProfile` (`lib/identity/GoogleProfile.ts:16`, `'google_profiles'`),
  abstract `Template` (`lib/stuff/Template.ts:40`, `'domain'`) with
  `LeafTemplate` (`LeafTemplate.ts:11`) / `ZoneTemplate` (`ZoneTemplate.ts:17`),
  both empty `extends Template`.
- **`Persistable` class + branch registration:** `Persistable.ts:65`
  (`extends Stuff`) and `Persistable.ts:332`
  (`Stuff._registerTopLevelBranch(Persistable)`). Branch allowlist entry at
  `Stuff.ts:562`; seven-branch error strings at `Stuff.ts:591-602,634`.
- **No `instanceof Persistable` and no `Persistable` in production unions.**
  Only `: Persistable` annotations are inside `Persistable.ts` itself (the
  `PersistableConstructor` interface `:55-60`, the `findById`/`find`
  `this`-bindings `:267-289`) and a cast in `Template.ts:95`. Nothing narrows
  on it.
- **CRUD surface to lift:** `toDocument` (`Persistable.ts:128-161`),
  `fromDocument` (`:170-200`), `save` (`:211-218`), `preloadFieldMarshallers`
  (`:230-238`), `delete` (`:249-258`), `findById` (`:267-283`), `find`
  (`:288-309`), `toString` (`:311-313`), `getCollectionName` (`:96-104`),
  `getAllFields` (`:109-117`), exported `preloadFieldMarshallersFor`
  (`:324-330`).
- **`MixinApi` walks are constructor-static, neutral:** `getAllPersistentFields`
  (`mixin.ts:243`), `getAllInstructionFields` (`mixin.ts:581`),
  `getAllFieldMarshallers` (same region). Constructor-generic; `Document` calls
  them unchanged.
- **`PersistenceManager` already decoupled** — plain docs + collection names +
  closure hook registry. Untouched.
- **`StuffApi.create(() => new X())` sites:** exactly **one** for `User` —
  `Application.ts:575`. `User.findById` at `:149`, `User.find` at `:567`
  already call statics (no change needed beyond the static returning a plain
  instance). **No** such construction in the connection/`ConnectionManager`
  path — `ConnectionManager.ts:17`, `player.ts:12`, `Avatar.ts:38`,
  `Interactive.ts:28` are `import type` (type-only). *The audit's "connection
  path" construction site does not exist.*
- **GoogleProfile** production write path is raw `PersistenceManager`
  (`Application.ts:529,545,554`); read via `GoogleProfile.findByGoogleId` →
  `find` (`GoogleProfile.ts:74-79`). No `StuffApi.create`.
- **`Template._materialize`** constructs via
  `StuffApi.create(() => new ZoneTemplate())` / `new LeafTemplate()`
  (`Template.ts:82,85`), then `preloadFieldMarshallersFor` (`:94`), then
  `fromDocument` (`:99`).
- **Clone pipeline reads Template as pure data:** `template.class`
  (`stuff.ts:247,278`), `template.hydratorClass` (`stuff.ts:322-323`),
  `template.data` (`stuff.ts:356`); `Template.findByPath` (`stuff.ts:241`).
  `snapshotToTemplate` reads/writes `tpl.data` + `tpl.save()`
  (`template.ts:292-318`); `restoreFromTemplate` reads `tpl.data`
  (`template.ts:350`).
- **`Template.delete()` callers don't rely on destruct/stuffId:**
  `MvController.ts:55`, `RmController.ts:86,93` — only want the row gone.
- **Marshaller resolution seam today:** `Persistable.toDocument`/`fromDocument`
  call `StuffApi.findByTemplatePath` (`Persistable.ts:143,184`);
  `preloadFieldMarshallers*` call `StuffApi.singleton` (`:237,329`);
  `snapshotToTemplate` calls `StuffApi.singleton` (`template.ts:303`). **Zero
  production marshalled fields** on any Persistable — only the test
  `MoneyBagMarshaller` and `QuantityMarshaller` (on Stuff mixins). Seam is
  test-only.
- **`StuffApi.singleton`** at `stuff.ts:379`; **`findByTemplatePath`** at
  `stuff.ts:746` (sync, throws on >1).
- **Index export:** `index.ts:104` re-exports `Persistable` — must be removed.
- **`packages/types` `Persistable`** (`types/src/index.ts:976-989`) is an
  **unrelated structural DTO interface**. `User`/`GoogleProfile` `implements
  IUser`/`IGoogleProfile`, not this. Leave it (naming-collision verify-point).

## Design: the `Document` base surface

New file `packages/server/src/mud/lib/persistence/Document.ts`. **Does NOT
extend `Stuff`/`Idea`** — a plain class carrying the CRUD/serialization surface
lifted near-verbatim from `Persistable`, minus all Stuff-ness.

**Instance fields:** `_id?: string`, `createdAt: Date`, `updatedAt: Date`.
**Statics:** `static collectionName: string` (throws if missing),
`static persistentFields?: string[]`.

**Methods (lifted from `Persistable`):**
- `protected getCollectionName()` — throw-if-missing (`Persistable.ts:96-104`).
- `protected getAllFields()` — calls `MixinApi.getAllPersistentFields(ctor)`
  with the escape-hatch check (`:109-117`); casts become `AnyConstructor`.
- `protected toDocument()` — body of `:128-161`, marshaller lookup via the
  **injected resolver** (below) instead of `StuffApi.findByTemplatePath`.
- `protected fromDocument(doc)` — `:170-200`, injected resolver.
- `protected async preloadFieldMarshallers()` — `:230-238`, injected async
  resolver.
- `public async save()` — `:211-218`.
- `public async delete()` — `:249-258` **minus** the `StuffApi.destruct(this)`
  line. Keep throw-if-no-`_id` + `PersistenceManager.delete`.
- `public static async findById(this, id)` — `:267-283`, construct via
  **`new this()`** (drop `StuffApi.create`); `preloadFieldMarshallersFor(this)`
  then `instance.fromDocument(doc)`.
- `public static async find(this, query)` — `:288-309` with `new this()`.
- `public toString()` — `:311-313`.
- Module export `preloadFieldMarshallersFor(ctor)` — `:324-330`, injected async
  resolver; signature `(ctor: AnyConstructor)`.
- `export interface DocumentConstructor` replacing `PersistableConstructor`
  (`:55-60`): `{ collectionName; persistentFields?; getAllPersistentFields?();
  new (...args): Document; }`.

**No** `_registerTopLevelBranch`, **no** `extends Stuff`, **no** `StuffApi`
import.

## The injected marshaller-resolver seam

`Document.ts` must not import `StuffApi` (pulls the Stuff/Idea graph into the
persistence core; cycle risk). Two module-level injectable refs:

```ts
export interface MarshallerLike { toStored(v: unknown): unknown; fromStored(v: unknown): unknown; }
type SyncResolver = (path: string) => MarshallerLike | undefined;   // mirrors findByTemplatePath
type AsyncResolver = (path: string) => Promise<MarshallerLike>;     // mirrors singleton

let resolveMarshaller: SyncResolver = () => { throw new Error('Document: marshaller resolver not wired'); };
let preloadMarshaller: AsyncResolver = () => { throw new Error('Document: marshaller resolver not wired'); };

export function setDocumentMarshallerResolver(sync: SyncResolver, async: AsyncResolver): void {
  resolveMarshaller = sync; preloadMarshaller = async;
}
```

- `toDocument`/`fromDocument` call `resolveMarshaller(path)` where `Persistable`
  called `StuffApi.findByTemplatePath(path)`; preserve "not registered → throw"
  (resolver returns `undefined` → same throw text, retargeted to `Document`).
- `preloadFieldMarshallers` / `preloadFieldMarshallersFor` call
  `preloadMarshaller(p)` where `Persistable` called `StuffApi.singleton(p)`.

**Wiring at boot:** in `AppBootstrap.run` (`AppBootstrap.ts:68`), **before**
`SeederManager.run()` / `loadHooks` (anything that could clone+save):

```ts
setDocumentMarshallerResolver(
  (path) => StuffApi.findByTemplatePath<Marshaller<unknown, unknown>>(path),
  (path) => StuffApi.singleton<Marshaller<unknown, unknown>>(path),
);
```

**Tests** wire the same seam in setup (existing `registerMarshaller*` helpers
stay; the marshaller test gains a one-line `setDocumentMarshallerResolver(...)`
in `beforeEach`, or a shared helper in `test-setup.ts`). Zero production
marshalled Documents → the seam is only live-exercised in `Marshaller.test.ts`.

> `snapshotToTemplate` (`template.ts:303`) and `PersistentHydrator.hydrate`
> (`PersistentHydrator.ts:88`) call `StuffApi.singleton` **directly** and stay
> Stuff-side — NOT routed through the seam. The seam is only for the `Document`
> serialization core.

---

## Ordered, dependency-aware steps

Each step keeps the tree compiling; run the relevant test subset after each.

### Step 1 — Add `Document.ts` (additive)
- New file `lib/persistence/Document.ts` with the full surface + seam.
- Imports: `PersistenceManager`, `MixinApi` only. **No** `Stuff`/`StuffApi`/`Idea`.
- `Persistable` still exists, untouched; nothing references `Document` yet.
- **Checkpoint:** `tsc` compiles.

### Step 2 — Reassign `User` and `GoogleProfile`
- `User.ts:14,17` — import + `extends Document` (keep `implements IUser`);
  update class doc-comment (`:7-11`).
- `GoogleProfile.ts:10,16` — same swap. `findByGoogleId` (`:74-79`) unchanged.
- `Application.ts:575` — `await StuffApi.create(() => new User())` → `new User()`.
  `:149`/`:567` need no change. Keep `StuffApi` import (`Login` clone at `:160`
  uses it).
- **Checkpoint:** `tsc` compiles; `Persistable` still exists (Template still on it).

### Step 3 — Reassign `Template` (+ leaf/zone); simplify `_materialize`
- `Template.ts:29` — import `Document` + `preloadFieldMarshallersFor` from
  `'../persistence/Document'`; `:40` `extends Document`.
- `_materialize` (`:73-103`): plain `new ZoneTemplate()` / `new LeafTemplate()`
  (no construction await). Keep the lazy `import('./ZoneTemplate')` /
  `import('./LeafTemplate')`. Keep `preloadFieldMarshallersFor` (`:94`); change
  the `fromDocument` cast type `Persistable` → `Document` (`:95,99`).
- Remove the now-unused `StuffApi` import (`Template.ts:31`) — `_materialize`
  was its only use (`ZoneApi`/`PersistenceManager` imports stay).
- `LeafTemplate.ts`/`ZoneTemplate.ts` — no code change (doc-comments if Stuff
  mentioned). `stuff.ts:238` comment update (Template → Document).
- **Checkpoint:** `tsc` compiles; clone pipeline + `snapshotToTemplate`/
  `restoreFromTemplate` compile unchanged.

### Step 4 — Delete `Persistable` + branch registration
- **Delete** `lib/persistence/Persistable.ts`.
- `index.ts:104` — remove the `export { Persistable }`.
- `Stuff.ts` — remove the `Persistable` regex from `#branchRegistrationAllowlist`
  (`:562`); update the branch-list comment (`:548-549`) and error strings
  (`:591-602`, `:634`) to "six branches" (Thing, Location, Idea, Agent, Vessel,
  Shadow).
- `Idea.ts:5` comment — drop `Persistable` from the branch list.
- Cosmetic comment retargets: `Marshaller.ts:38-39,57,65`, `mixin.ts:243`,
  `template.ts:5,48`, `Template.ts:10,89,98`, `api/stuff.ts:806`,
  `EventRegistry.ts:9`, `TopicCatalogue.ts:29`, `Avatar.ts:87`.
- **Checkpoint:** `grep -rn "Persistable" packages/server/src --include="*.ts"`
  returns only `packages/types`-sourced hits + intentional renames. `tsc` clean.

### Step 5 — Tests: retire/convert the substrate test
- **`__tests__/Persistable.test.ts` → `Document.test.ts`** (new): `Widget`/
  `NamelessWidget extends Document`; construct via `new Widget()`. **Remove**
  the "registered Stuff with stuffId" test (`:101-105`) → replace with a
  **value-semantics + no-registry** test (two `findById(sameId)` → distinct
  instances; instance is a plain `Widget`, not proxy-wrapped, absent from
  `StuffApi`). `delete()` test (`:176-182`): drop `isDestroyed()`; keep the
  `PersistenceManager.delete` assertion. `findById` test (`:208`): drop the
  `stuffId` assertion. Keep `save`/`find`/`toDocument`-shape/`collectionName`-
  throws verbatim.
- **Stored-shape parity test (new):** load a hand-built fixture through
  `fromDocument`, re-`toDocument`, assert byte-equal field mapping.
- **Checkpoint:** green.

### Step 6 — Update reassigned-class tests + marshaller test
- **`identity/__tests__/User.test.ts`** — `makeStuff(() => new User())` →
  `new User()` (`:38,43,49,55,61,67`); **remove** the "is a Stuff (stuffId)"
  test (`:54-58`); drop unused `makeStuff`/`Idea` imports (`:12-13`); header
  (`:2,7`).
- **`persistence/__tests__/Marshaller.test.ts`** — `:4` import `Document`;
  `:108` `TestDocumentWallet extends WalletMixin(Document)`; round-trip cases
  (`:185-224`) construct via `new TestDocumentWallet()`; in `beforeEach`, after
  `registerMarshaller`, call `setDocumentMarshallerResolver(...)`. The
  `TestWallet extends WalletMixin(Idea)` + `PersistentHydrator` cases
  (`:106,143-183`) stay Stuff-side, unchanged.
- **Checkpoint:** green; `QuantityMarshaller` round-trips both Stuff and
  Document paths.

### Step 7 — Pipeline regression pass + docs
- Run clone/template/Avatar suites (`CloneController.test.ts`,
  `spawnSubstrate.integration.test.ts`, `Avatar.test.ts`,
  `BootstrapManager.test.ts`, `Application.test.ts`, template tests). Expect no
  changes. Add a **regression guard**: after materializing a Template, assert
  it's **not** in the `StuffApi` registry (leak gone) and `DomainHook`
  around-save/delete still fires on `domain` writes.
- **Docs:** rewrite `docs/subsystems/persistence.md` (`:1-105,437-491`) for the
  `Document`/`Stuff` split, value-vs-identity, dropped destruct cascade +
  registry, the injected seam, `domain` = Template documents. Touch
  `docs/subsystems/templates.md` where it calls Template a `Persistable`.
- **Checkpoint:** full `pnpm test` green; `tsc` clean.

---

## Import-cycle / layering risks

- **`Document` must not import `StuffApi`/`Stuff`/`Idea`** — the point of the
  seam. Imports only `PersistenceManager` + `MixinApi`. *Verify* neither
  imports `Document` back.
- **`Template extends Document`** removes the `Template → Persistable → Idea →
  Stuff → StuffApi` chain (`stuff.ts:238` comment) — *reduces* cycle pressure.
  Keep the lazy `import('./Template')` in `StuffApi.#cloneInner`
  (`stuff.ts:240`).
- **`_materialize`'s lazy imports of `ZoneTemplate`/`LeafTemplate`
  (`Template.ts:81,84`) must stay** — an init-order constraint independent of
  the base.
- **No `instanceof Persistable` / union narrowing exists** — no type breakage.
- **`packages/types` `Persistable` interface** is independent; confirm
  `User`/`GoogleProfile` still satisfy `IUser`/`IGoogleProfile` after losing
  the Stuff base (they only add `_id`/`save`/`delete`/fields — all on
  `Document`).

## Risk list & mitigations

| Risk | Mitigation / verify |
|---|---|
| Audit's "connection-path `new User`" doesn't exist. | Only `Application.ts:575`. Re-grep `StuffApi.create.*User` / `new User(` before Step 2; treat any second site identically. |
| Hidden Stuff-coupling (events/shadows/`stuffId`/`RAW_TARGET`). | Grep `\.stuffId`, `StuffApi.findById`, `instanceof` vs the 3 classes before deleting `Persistable`. Audit found none; verify, esp. `tpl.stuffId` in the clone path. |
| `Template.delete()` expected the destruct cascade. | Verified `MvController.ts:55`, `RmController.ts:86,93` only want the row gone. Low risk. |
| Seam not wired before first save/hydrate → throw. | Wire `setDocumentMarshallerResolver` as the **first** statement in `AppBootstrap.run`; in tests, `beforeEach`. Mis-wire only surfaces in the marshaller test — loud, localized. |
| Stored-shape drift (the acceptance bar). | `toDocument`/`fromDocument` lifted character-for-character (only marshaller lookup indirected). Step-5 fixture round-trip pins byte-equality. `persistentFields` unchanged. |
| `getAllFields`/walk casts reference `Stuff` (out of scope in `Document.ts`). | Use a neutral `AnyConstructor` cast; walks accept any constructor (`mixin.ts:581`). |
| `StuffApi` import becomes dead → lint error. | `Application.ts` keeps it (`:160`); `Template.ts` loses its only use → remove. Verify each file. |
| Branch-allowlist edit breaks a test pinning the seven-branch error text. | Grep tests for `"Persistable"` / `_registerTopLevelBranch` / branch-error assertions; update any (none found outside the substrate test). |

## Out of scope / do NOT touch

- **Un-Stuffing marshallers, hooks, or `PersistentHydrator`** (Wave 3).
  `PersistentHydrator.hydrate` (`:88`) and `snapshotToTemplate`
  (`template.ts:303`) keep calling `StuffApi.singleton` **directly**.
- **`PersistenceManager`** — no edits.
- **`MixinApi` walk implementations** — no edits.
- **CMS / authoring / drafts-staging pipeline** — untouched (deferred).
- **New document kinds** — not built.
- **Stored MongoDB shapes / data migration / indexes** — invariant.
- **The clone *target*** (live Stuff from `StuffApi.clone`) — stays Stuff;
  `PersistentHydrator.backing` unaffected. Only the Template *descriptor*
  un-Stuffs.
- **`packages/types` `Persistable` DTO interface** — leave as-is (rename is a
  separate cosmetic call).

## Critical files

- `packages/server/src/mud/lib/persistence/Persistable.ts` (lift from + delete)
- `packages/server/src/mud/lib/persistence/Document.ts` (new base + seam)
- `packages/server/src/mud/lib/stuff/Template.ts` (reassign + `_materialize`)
- `packages/server/src/mud/lib/stuff/Stuff.ts` (branch allowlist + error strings)
- `packages/server/src/backend/AppBootstrap.ts` (wire `setDocumentMarshallerResolver`)
- Supporting: `lib/identity/User.ts`, `lib/identity/GoogleProfile.ts`,
  `backend/Application.ts:575`, `index.ts:104`, and tests
  `__tests__/Persistable.test.ts`→`Document.test.ts`,
  `identity/__tests__/User.test.ts`, `persistence/__tests__/Marshaller.test.ts`.
