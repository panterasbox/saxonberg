# Document refactor — requirements

Today `Persistable extends Idea`, so **every persisted record is a full
Stuff** — call-security proxy, instance-registry membership, security gate,
create/destroy lifecycle. But most of what the platform persists is **plain
document data with no game-entity behavior** (auth records, and soon dialogue
trees, loot tables, quest defs, lesson content, logs). This build splits
persistence into two honest concepts — **`Document`** (persisted JSON: CRUD,
none of the Stuff overhead) and **`Stuff`** (a live world entity, *hydrated
from* a Document) — lifts the CRUD surface off `Persistable` onto `Document`,
and **deletes `Persistable`**. It is a pure **in-memory object-model**
refactor: the stored MongoDB document shapes are unchanged, so there is **zero
data migration.**

Seeded by [docs/slates/persistence-architecture-slate.md](../slates/persistence-architecture-slate.md),
which supersedes the `Persistable`-as-Stuff decision in
[docs/subsystems/persistence.md](../subsystems/persistence.md). Grounded by a
read-only audit of the current code (findings cited inline below).

## Goals

### The `Document` base

- A new **`Document`** base class at
  `packages/server/src/mud/lib/persistence/Document.ts` that **does NOT
  extend `Idea`/`Stuff`** — no proxy wrap, no `StuffApi` registry membership,
  no security gate, no create/destroy lifecycle. A loaded `Document` is a
  plain object you read and drop.
- It carries the CRUD + serialization surface **lifted from `Persistable`**
  (minus the Stuff-ness):
  - `static collectionName: string` (required; throws if missing).
  - `static persistentFields?: string[]` (class-local; mixin-contributed
    fields still picked up via `MixinApi.getAllPersistentFields`).
  - `save()` — sets `updatedAt`, builds the doc via `toDocument()`, delegates
    to `PersistenceManager.save(collection, doc)`, sets `_id` on first save.
  - `static findById(id)` / `static find(query)` — query MongoDB, construct a
    **fresh plain instance** via `new this()` + `fromDocument`. Return
    `null` / `[]` on no match.
  - `delete()` — deletes via `PersistenceManager`. **No `StuffApi.destruct`
    cascade** (there's no registry membership to clean up).
  - `toDocument()` / `fromDocument()` — copy persistent fields plus
    `createdAt` / `updatedAt`; `_id` included on `toDocument` only when
    present.
  - `createdAt` / `updatedAt` — auto-managed.
- **Value-like semantics, by design.** No registry, no identity dedup — two
  `findById(sameId)` calls return two distinct plain instances. (This already
  matches current `Persistable` behavior — the audit confirmed `User.findById`
  never dedupes against the registry, so registry membership is unused today.)

### Reassignments (delete `Persistable`)

- `User` (`lib/identity/User.ts`) → extends `Document`. Construction sites
  change `StuffApi.create(() => new User())` → `new User()` (audit:
  `Application.ts:149` and the connection path).
- `GoogleProfile` (`lib/identity/GoogleProfile.ts`) → extends `Document`.
  (Audit: production already reads/writes it via raw `PersistenceManager`
  calls in `Application.ts:528,545,554`, so the class is nearly dead on the
  write path — straightforward.)
- `Template` (+ `LeafTemplate`, `ZoneTemplate`) → extends `Document`.
  `Template._materialize` uses `new this()` + `fromDocument(doc)` instead of
  routing through `StuffApi.create` (audit: `Template.ts:73-103`). This also
  **removes the registry-accumulation leak** — today every materialized
  Template registers as Stuff and is never looked up there.
- **Delete `Persistable.ts`** and its top-level branch registration
  (`Persistable.ts:65,332`). Update the substrate-flavored test
  (`__tests__/Persistable.test.ts` — e.g. the `stuffId` assertion at `:101`)
  to target `Document` instead, or retire it.

### What stays untouched

- **The clone *target* stays Stuff.** Only the `Template` *descriptor*
  un-Stuffs. The Hydrator's `backing` argument (the live game object being
  cloned) is unaffected (audit: `PersistentHydrator.ts:62`).
- **`PersistenceManager` is unchanged** — it already operates on plain docs +
  collection names and a decoupled around-hook closure registry (audit:
  `PersistenceManager.ts:103-104,410-459`).
- **`MixinApi.getAllPersistentFields` / `getAllInstructionFields` /
  `getAllFieldMarshallers` are unchanged** — already constructor-static
  prototype walks with zero instance/Stuff coupling (audit:
  `mixin.ts:249,309,581`). `Document` calls them exactly as `Persistable`
  did.
- **Marshallers, hooks, and `PersistentHydrator` stay Idea-rooted Stuff** —
  see Non-goals. The `Document` serialization path resolves marshallers via an
  **injected resolver seam** (a function reference) into the Stuff world,
  rather than calling `StuffApi.findByTemplatePath`/`singleton` directly from
  the persistence core. (Audit: zero production marshalled fields exist on any
  Persistable today, so this seam is exercised only by tests — keep it thin.)

### Documentation

- Update **`docs/subsystems/persistence.md`** to describe the `Document` /
  `Stuff` split: `Document` = persisted JSON (CRUD, no Stuff overhead);
  `Stuff` = live entity hydrated from a Document; `Persistable` removed; the
  two-relationship model; `domain` = Template documents that clone into Stuff.

## Non-goals

- **Un-Stuffing marshallers, hooks, or `PersistentHydrator`.** They remain
  Idea-rooted Stuff (cloned-from-template for HMR). The audit confirmed this
  is the **only** load-bearing Stuff-coupling and it's purely for hot-reload,
  not game semantics — re-homing them as path-resolved code modules (the
  "brain" pattern) is a **separate, deferred wave** (medium–high effort) and
  is **not** a prerequisite for deleting `Persistable`. This build keeps them
  as-is and reaches them through the injected resolver seam.
- **No new document kinds.** Dialogue trees, loot tables, etc. land with their
  own features; this build delivers the substrate + the three reassignments
  only.
- **No CMS / authoring-pipeline work.** Whether the CMS authoring +
  audit/drafts-staging pipeline serves arbitrary `Document` collections (vs
  only the `domain`/Template track) is a real open question, but it is **out
  of scope** here — flagged for a later content/CMS build.
- **No stored-shape changes / no data migration.** `toDocument`/`fromDocument`
  preserve the existing field mapping; the `users`, `google_profiles`, and
  `domain` documents on disk are byte-for-byte the same. Existing Mongo data
  loads unchanged.
- **No MongoDB index changes** beyond what `createIndexes` already does
  (orthogonal to Stuff-ness).

## Surface decisions

### `Document` is not in the Stuff hierarchy

The whole point. `Document` is a standalone base in `lib/persistence/`. It is
**not** an `Idea`, gets **no** call-security proxy, is **not** registered in
`StuffApi`, and has **no** lifecycle hooks. This is what sheds the per-record
proxy + registry + GC residency cost for the common (document) case.

### Documents are value-like; Stuff is identity-like

A `Document` is persisted state — copies are fine (read, use, drop). A live
entity that needs one canonical instance is a `Stuff` (registry-deduped),
hydrated *from* a Document. `Persistable` forced value-shaped data (`User`)
into an identity-shaped object it never needed; the split aligns each type
with its semantics. This is the structural justification, not just perf.

### Access control lives at the Api/collection layer, not per-object

`Document` loses the per-object security gate/shadows — correct, because
document access control (who may read/write the `users` collection) belongs at
the Api/collection/lease layer (per the access slate's "bind at the core").
The audit confirmed **no** current per-object security is applied to `User` /
`GoogleProfile` / `Template`, so nothing is lost.

### `Document` uses per-collection `_id`; no global `stuffId`

Documents are looked up via their own `findById`/`find` (Mongo queries), not
the Stuff registry. They get Mongo's `_id`; no global registry id. The audit
found nothing reads these classes' `stuffId`.

### Marshaller resolution is an injected seam, not a direct Stuff call

To keep the `Document` serialization path free of a hard dependency on
`StuffApi`, marshaller resolution is provided as an injected function (wired
once at boot) rather than called inline. Low stakes today (zero production
marshalled fields); keeps the persistence core honestly Stuff-independent and
makes the deferred Wave-3 un-Stuffing a localized change.

### `Persistable` is deleted, not aliased

No back-compat shim. There are three subclasses and no external consumers
relying on the `Persistable` name; a clean deletion is simpler than a
deprecation alias and avoids a lingering "is it Stuff or not" ambiguity.

## Constraints

- **TypeScript strict**, `noUncheckedIndexedAccess` on. No unjustified `any`.
- **Module taxonomy** — `Document` is a base class in the existing
  `lib/persistence/` subsystem dir; do **not** invent a new module category or
  a `lib/mixins/`-style folder. Persistence machinery that needs a home goes
  in `lib/persistence/` or onto `MixinApi` where the walks already live.
- **Don't break the clone pipeline or Avatar persist-back.**
  `StuffApi.clone` / `Template._materialize` / `snapshotToTemplate` /
  `restoreFromTemplate` must behave identically from the caller's view; only
  Template's *internal* construction changes (`new` instead of
  `StuffApi.create`).
- **Stored document shape is invariant.** Round-trip equality:
  `fromDocument(toDocument(x))` and the on-disk shape must match the current
  `Persistable` output for `User` / `GoogleProfile` / `Template`.
- **Tests colocated** under `__tests__/`, Vitest.
- New/Apis (if any) end with `SecurityApi.decorateApiClass(...)` per the house
  rule — though this build likely adds **no** new Api (`Document` is a base
  class, not an Api; `PersistenceManager` is unchanged).

## Acceptance criteria

### Object model

- `Document` instances are **not** registered in `StuffApi` and are **not**
  proxy-wrapped (assert: a freshly `findById`'d `User` is not present in the
  Stuff registry and has no proxy/`RAW_TARGET` seam).
- `Persistable` no longer exists in the codebase; no file imports it.
- `User`, `GoogleProfile`, `Template`, `LeafTemplate`, `ZoneTemplate` all
  extend `Document` and compile under strict mode.

### Behavior parity

- `User.findById` / `find` / `save` / `delete` round-trip a record with the
  **same stored shape** as before (a fixture document saved pre-refactor loads
  identically).
- Two `User.findById(sameId)` calls return two distinct instances (value
  semantics preserved).
- `Template.findByPath` / `loadById` / `_materialize` produce a Template whose
  `class` / `hydratorClass` / `data` reads are identical to before.
- The full clone path (`StuffApi.clone(path)`) hydrates a live game Stuff from
  a Template-Document with no behavioral change.
- `Avatar.save()` (`snapshotToTemplate` → `Template.save()`) persists and
  `restoreFromTemplate` restores, unchanged.

### Regression guards

- No `Template` instances accumulate in the `StuffApi` registry after
  materialization (the leak is gone).
- The around-save/around-delete hook chain (`DomainHook` folder/leaf
  validation) still fires on `domain` saves/deletes.
- The injected marshaller-resolver seam round-trips the test
  `QuantityMarshaller` field (the existing marshaller test still passes).

### Tests

- Unit: `Document` CRUD surface (save/find/delete/round-trip; no-registry;
  value semantics; missing-`collectionName` throws).
- The reassigned classes: `User` / `GoogleProfile` / `Template` behave as
  `Document`s; a pre-refactor stored fixture loads unchanged.
- Pipeline: clone-from-Template and Avatar persist-back integration tests
  pass unchanged.
- Retire/convert the `Persistable`-substrate test.

## Cross-references

- [docs/slates/persistence-architecture-slate.md](../slates/persistence-architecture-slate.md)
  — the slate this graduates; the Document/Stuff model, value-vs-identity
  framing, and the deferred Wave-3 marshaller/hook un-Stuffing.
- [docs/subsystems/persistence.md](../subsystems/persistence.md) — the current
  design being revised (updated as part of this build).
- [docs/subsystems/templates.md](../subsystems/templates.md) — the clone /
  hydrate pipeline; Template becomes a Document, the clone target stays Stuff.
- [docs/slates/npc-behavior-slate.md](../slates/npc-behavior-slate.md) — a
  downstream consumer (shared dialogue trees as `Document`s in their own
  collection); not built here.
- [docs/slates/access-slate.md](../slates/access-slate.md) — document access
  control binds at the Api/collection layer.
