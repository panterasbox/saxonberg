# Content packs (v1: base-library) — implementation plan

## Framing

This build lifts base-library content (materials, biomes, quantity-units) out of `packages/server` into a standalone, git-versioned **content pack** at `packages/content/base-library/`, makes the pack files the source of truth, and stands up a single **installer** that reconciles the pack into MongoDB. The installer replaces seeding *for the migrated trees only*; `SeederManager` and the five doc-seeders keep serving everything else. The build ships the full iteration loop: boot-time install plus a runtime `pack sync` author/dev verb that pushes file edits live without a restart.

The reconcile logic has **two callers** — the boot path (`AppBootstrap`) and the runtime `pack sync` verb — so per CLAUDE.md *Module Categories* and the slate's "where the install/reconcile logic lives" section it goes on the **Api + `*Logic` singleton** pattern: a single implementation in `PackLogic` reached by a thin `PackApi` shell. The content package itself holds **zero TypeScript**.

### Execution order

1. **Phase 1 — the pack on disk** (`git mv` content out of `server`, manifest, workspace wiring). Nothing reads it yet.
2. **Phase 2 — pack discovery + manifest read** (a discovery helper on `PackLogic`).
3. **Phase 3 — the installer/reconcile core** on `PackApi`/`PackLogic` (content-kind dispatch, sourcePack stamp, adoption, delete, requires-kernel abort).
4. **Phase 4 — boot integration** in `AppBootstrap` (pre-`loadHooks` pass; fold in `QuantityApi.loadTagTables`; coexist with `SeederManager`).
5. **Phase 5 — the `pack sync` verb** (Controller + YAML, re-hydrate affected singletons).
6. **Phase 6 — tests.**
7. **Phase 7 — subsystem doc** (at sweep).

Phases 1–4 deliver the boot-only must-have (the slate's "first build" slice); Phase 5 adds the runtime loop. Build in this order so each phase is independently verifiable.

---

## Phase 1 — The `base-library` package on disk

Satisfies the goal *"base-library is a standalone monorepo package"* and the acceptance criterion that the tree be removed from `server`.

### 1.1 — Workspace glob

**Change** `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "packages/content/*"
  - "e2e"
```

The current `packages/*` glob does **not** match the nested `packages/content/base-library` dir (single-level glob), so the explicit nested entry is required (slate constraint).

### 1.2 — Package manifest (workspace boilerplate, no code)

**Create** `packages/content/base-library/package.json`:

```json
{
  "name": "@saxonberg/content-base-library",
  "version": "0.1.0",
  "private": true,
  "description": "Foundational substrate content — materials, biomes, units.",
  "type": "module"
}
```

No `dependencies`, no build script, no `.ts`. This is the boundary that makes the content "a deliverable" (D1).

### 1.3 — Pack manifest

**Create** `packages/content/base-library/pack.yaml`:

```yaml
id: base-library
version: 0.1.0          # reserved; nothing reads/enforces it (non-goal: version machinery)
description: Foundational substrate — materials, biomes, units.
dependsOn: []
```

### 1.4 — Content tree (git mv, byte-for-byte unchanged)

The `content/` root **mirrors the template-path namespace** so the path mapping (`content/lib/material/spirit/gin.yaml` → `/lib/material/spirit/gin`) is the same rule `SeederManager` uses today, and the move is a pure rename.

**`git mv`** these (commands; do not hand-edit the YAML):

- `packages/server/src/mud/seeds/lib/material/` → `packages/content/base-library/content/lib/material/` (27 files)
- `packages/server/src/mud/seeds/lib/biome/` → `packages/content/base-library/content/lib/biome/` (8 files)
- `packages/server/src/mud/seeds/lib/biome.yaml` → `packages/content/base-library/content/lib/biome.yaml` (the root `/lib/biome` leaf alongside the `biome/` subtree — confirm both move; `SeederManager` treats both `biome.yaml` and `biome/*.yaml` as siblings)
- `packages/server/src/mud/config/quantity-tags.yaml` → `packages/content/base-library/content/quantity/quantity-tags.yaml`
- `packages/server/src/mud/config/quantity-tags.schema.json` → `packages/content/base-library/content/quantity/quantity-tags.schema.json` (it sits beside its YAML; `QuantityLogic` resolves the schema relative to its YAML path)

> **Planner's-discretion call to confirm:** `material/` and `biome/` move out, but the rest of `seeds/lib/` (address, advancement, augmentation, banking, body-plans, comms, corpo, fasttravel, locomotion, messaging, metabolism, perception, respiration, species, thermal, zone) **stays** with `SeederManager` (non-goal: other packs). I am moving `seeds/lib/material/` and `seeds/lib/biome/` plus the top-level `seeds/lib/biome.yaml` leaf. I am **not** moving `seeds/lib/address.yaml` or anything else. Please confirm `biome.yaml` (the root leaf) is in-scope for base-library — it is the parent of the `biome/` subtree so it logically belongs to the pack.

### 1.5 — Server dependency edge

**Change** `packages/server/package.json` — add to `dependencies`:

```json
"@saxonberg/content-base-library": "workspace:*"
```

This is how *"server's dependencies enumerate the packs the build ships with"* (D4). After this, `pnpm install` must succeed and `pnpm build` must pass.

### 1.6 — Update the two affected default-path resolvers

`QuantityLogic`'s `DEFAULT_YAML_PATH` (`mud/obj/api/QuantityLogic.ts` line 24) currently points at `../../config/quantity-tags.yaml`, which is being moved. The installer will pass the pack's resolved path explicitly (Phase 3), so the default is now only a fallback for tests. **Decision:** leave `QuantityLogic`'s default as-is (it becomes an unused-in-prod fallback that test fixtures may still pass explicitly), and have the installer always pass the resolved pack path. Confirm no other code reads `mud/config/quantity-tags.yaml` by literal path (grep shows only `QuantityLogic` + tests).

---

## Phase 2 — Pack discovery + manifest read

Satisfies *"A pack is described by a tiny manifest; the installer reads the manifest; server's dependencies enumerate the packs."*

### 2.1 — Discovery model (decided)

Packs are discovered from `server`'s declared `@saxonberg/content-*` dependencies — the **single source of truth** for "what content this build ships" (requirement D4). `PackLogic.discoverPacks()`:

1. **Reads the pack *names*** by parsing `server`'s `package.json` `dependencies` and selecting keys matching `@saxonberg/content-*`. This is the one place the pack list lives — no second hard-coded array to drift against the deps.
2. **Resolves each name to its on-disk root** via Node module resolution (`require.resolve('<pkg>/package.json')` → dirname), which is layout-robust across dev (`tsx`) and dist. (Reading the *names* from `package.json` is not fragile; only resolving *paths* from it would be — so paths come from module resolution.)
3. **Orders** by `dependsOn` (trivial with one pack; deterministic). Full multi-pack topo-sort + missing-dependency validation lands when a second pack exists (non-goal this build, but `dependsOn` is read and honored — see 3.6).

### 2.2 — Manifest + content-file shapes

Add these types to `mud/api/pack.ts` (the Api file — call-shape types live with the Api per export discipline):

```ts
export interface PackManifest {
  id: string;
  version: string;
  description?: string;
  dependsOn: string[];
}

/** What an install/sync run touched, for boot logs + verb feedback. */
export interface PackReconcileResult {
  packId: string;
  inserted: string[];   // template paths newly written
  updated: string[];    // template paths overwritten
  adopted: string[];    // unstamped legacy rows stamped + matched
  deleted: string[];    // stamped rows whose file vanished
  quantityTables: number; // (unit,scale) pairs (re)loaded, 0 if no quantity kind
}
```

`PackLogic` reads `pack.yaml` with the `yaml` package (already a dep) and validates `id`/`version`/`dependsOn` shape, failing loudly on a malformed manifest (mirrors `SeederManager`'s malformed-YAML throw).

### 2.3 — Content-kind recognition (subdir convention)

`PackLogic` walks the pack's `content/` root and classifies each file by subdir prefix:

- `content/lib/**.yaml` → **`domain`** kind (reconciled into `Collections.Domain`).
- `content/quantity/quantity-tags.yaml` → **`quantity`** kind (loaded via `QuantityApi.loadTagTables(<that path>)`).

No manifest-declared kind needed for v1 (subdir convention covers both). The `domain` template path is derived exactly as `SeederManager.#fileToTemplatePath` does: path relative to `content/`, strip `.yaml`, prefix `/` (`content/lib/material/spirit/gin.yaml` → `/lib/material/spirit/gin`). Reuse that mapping rule (re-implement the small pure transform on `PackLogic` — do **not** export a free-floating helper from `SeederManager`).

---

## Phase 3 — The installer / reconcile core (Api + Logic)

This is the architectural heart. Satisfies *"One installer reconciles packs into the DB, dispatching by content-kind"*, *"Reconcile is ownership-scoped and non-destructive"*, *"unmet needs fail loudly"*, and the *"single reconcile implementation, two callers"* constraint.

### 3.1 — Module placement (CLAUDE.md justification)

- **`packages/server/src/mud/api/pack.ts`** — `PackApi`, a thin static forwarding shell ending in `SecurityApi.decorateApiClass(PackApi)`. Exports the class + the call-shape types from 2.2. Models `mud/api/crafting.ts` / `mud/api/quantity.ts` exactly: a `logic()` helper resolving the singleton via `StuffApi.singletonSync` with the `HotReloadApi.getCurrentExport` warm pattern.
- **`packages/server/src/mud/obj/api/PackLogic.ts`** — `PackLogic extends Idea`, `@internal` + `@Unshadowable`, HMR-able at `/obj/api/pack`. Holds all reconcile logic; every public method gated `@CallSecurity(SecurityPolicies.FromModule('mud/api/pack#PackApi'))` (mirrors `CraftingLogic`'s `CraftingApiCallers`). The `PackApi` statics forward here.

This respects *no new module category* (the slate names "PackInstaller in backend/" as provisional; the Api+Logic split is mandated because of the runtime caller). It is **not** in `backend/` like `SeederManager`, precisely because `SeederManager` is boot-only and `PackLogic` has a runtime verb surface — the requirements explicitly call this out.

> **Naming:** the slate flags `PackInstaller`, `PackApi`, `sourcePack` as provisional. I am using `PackApi` / `PackLogic` / `sourcePack` / `pack.yaml` / `@saxonberg/content-base-library`. Confirm or rename.

### 3.2 — Where `sourcePack` lives (key design decision)

`sourcePack` is a **row-level sibling field of `data`**, not a field inside `data`. A domain row is shaped:

```
{ _id, path, class, hydratorClass, data: {...}, sourcePack: "base-library" }
```

The clone pipeline (`StuffApi.#cloneInner`) only ever passes `template.data` to the hydrator (confirmed: `PersistentHydrator.hydrate(backing, doc.data)` receives `data` alone; `path`/`class`/`hydratorClass` are read off the `Template` doc, never hydrated). Therefore a top-level `sourcePack` column **cannot** hydrate into the instance — it is invisible to `Material`/`Biome`. This is exactly the "metadata alongside path/class/data, not inside data" requirement.

`PackLogic` reads/writes `sourcePack` by going **straight to the collection** via `PersistenceManager.get().getCollection(Collections.Domain)` (the same chokepoint `SeederManager` uses) — it is not a persistent field on any Stuff class, so `TemplateApi.saveTemplate` (which round-trips `path`/`class`/`data`/`hydratorClass` only) is **not** the writer for the stamp. The installer writes the whole row (data + stamp) directly. This keeps the stamp purely a DB-row provenance marker (slate: "the sourcePack stamp is its provenance marker").

> **Decision:** the installer's row writes go through `PersistenceManager.getCollection(...).updateOne/insertOne/deleteOne` directly (the `SeederManager` precedent — "row writes use the persistence chokepoint as the seeders do"), **not** through `TemplateApi.saveTemplate`, because `saveTemplate` has no slot for the `sourcePack` sibling column and would also fire the folder/leaf save hook (an `updateOne {$set}` by `_id` avoids re-triggering insert-time validation on every reconcile). The folder/leaf invariant was already satisfied when these rows were first seeded; reconcile only changes `data`/`sourcePack`.

### 3.3 — The reconcile algorithm (domain kind)

`PackLogic.reconcileDomain(packId, files)` where `files: {path, data, class, hydratorClass}[]` parsed from the pack:

1. **Enumerate this pack's rows.** Query `collection.find({ sourcePack: packId })` → `stampedRows` keyed by `path`. This is how reconcile "enumerates this pack's rows" — by the stamp, **not** by path-prefix (the slate's reason: a per-row stamp works identically across collections and is collision-proof).
2. **For each file:**
   - **(a) Stamped row exists at this path** → **update**: `updateOne({_id}, {$set: {data, class, hydratorClass, sourcePack: packId}})`. Record in `updated` only if the stored doc actually differs (cheap deep-equal on `data`), so a no-op reconcile reports zero changes (acceptance: second boot is a no-op).
   - **(b) No stamped row, but an *unstamped* row exists at this path** (`collection.findOne({path, sourcePack: {$exists: false}})`) → **adopt**: `updateOne({_id}, {$set: {data, class, hydratorClass, sourcePack: packId}})`. Record in `adopted`. This is the migration bridge — stamp + overwrite-to-match-file, no duplicate insert.
   - **(c) No row at this path at all** → **insert**: `insertOne({path, class, hydratorClass, data, sourcePack: packId})`. Record in `inserted`.
3. **Delete vanished rows.** For every `stampedRows` path **not** present in `files`: `deleteOne({_id})`. Record in `deleted`. (Dangling references are the author's to fix — documented, not guarded; non-goal.)

**Adoption avoids duplicate-key collisions** because step (b) does an **update of the existing row by `_id`**, never an insert — the `domain` unique index on `path` is never violated. The order matters: check stamped (a) → check unstamped-at-path (b) → insert (c). On a fresh DB only (c) fires; on a legacy DB only (b) fires the first time, then (a) thereafter.

### 3.4 — Quantity kind

`PackLogic.reconcileQuantity(packPath)` calls `QuantityApi.loadTagTables(<resolved pack quantity-tags.yaml path>)`. No stamp, no adoption, no delete — the in-memory tag table is rebuilt wholesale from the file each load (requirement: "the quantity table needs no stamp"). Returns the count of `(unit,scale)` pairs for the result summary. The runtime-sync path uses `QuantityApi.reloadTagTables(<path>)` instead (which diffs against the live registry, removing vanished units) — see Phase 5.

### 3.5 — requires-kernel check (derived, fail-loud)

Before writing any `domain` row, `PackLogic` resolves **every** distinct `class:` named across the pack's `domain` files via `StuffApi.loadClassByPath(classPath)`. If any throws (no module at that path / export missing), **abort the entire install** with a message naming the pack and the missing class:

```
PackApi: pack 'base-library' requires class '/lib/material/Nonexistent'
which does not resolve (content file: content/lib/material/.../x.yaml).
Install aborted — a content pack assumes its classes exist (see content-packs.md).
```

`loadClassByPath` is the *standard module-resolution path* (CLAUDE.md "go through the existing seams"), and the classes (`Material`, `Biome`, `PersistentHydrator`) stay in `packages/server/src/mud/lib/...` — only the YAML moved — so resolution is `/lib/material/Material` → `<server>/src/mud/lib/material/Material.ts`, unchanged. This check **is** the enforced content-pack ↔ mod boundary. No hand-maintained requires list. Do the resolution check **before** the first write so an abort leaves the DB untouched (never-wipe / all-or-nothing per pack).

### 3.6 — Public surface of `PackLogic` / `PackApi`

```
PackApi.install(): Promise<PackReconcileResult[]>      // boot: discover → topo-sort by dependsOn → per-pack reconcile (writes only, no re-hydrate)
PackApi.sync(packId: string): Promise<PackReconcileResult>  // runtime: reconcile one pack + re-hydrate affected singletons
PackApi.discoverPacks(): Promise<PackManifest[]>       // read + order (dependsOn honored)
```

`install()` and `sync()` both call the **same** private `reconcilePack(manifest)` on `PackLogic` (the single implementation). The only difference: `sync()` additionally re-hydrates live singletons (Phase 5); `install()` does not (boot writes rows only — nothing is live yet, per the boot-ordering constraint). `dependsOn` is read in `discoverPacks` and the install order respects it (trivially with one pack; deterministic).

---

## Phase 4 — Boot integration in `AppBootstrap`

Satisfies *"boot installs base-library"* + *"Boot ordering pins preserved"* + *"Coexistence is conflict-free."*

### 4.1 — Insert the install pass pre-`loadHooks`

In `AppBootstrap.run` (`backend/AppBootstrap.ts`), the current region is:

```
104  await SeederManager.run();                 // domain templates (unstamped, non-migrated trees)
111  QuantityApi.loadTagTables();               // quantity (standalone)
120  await PersistenceManager.get().loadHooks();
```

**Change to:**

```
104  await SeederManager.run();                 // UNCHANGED — still walks the shrunken seeds/ tree
     // Pack install: reconcile every shipped content pack into the DB.
     // Replaces the migrated trees' seeding (materials/biomes) AND the
     // standalone QuantityApi.loadTagTables call — both fold in here.
     // Writes rows only (nothing is live yet — BootstrapManager clones later).
     const packResults = await PackApi.install();
     // (log inserted/updated/adopted/deleted/quantity counts per pack)
120  await PersistenceManager.get().loadHooks();   // UNCHANGED position
```

The standalone `QuantityApi.loadTagTables()` block (old lines 106–118) is **deleted** — folded into the install pass (the quantity kind of base-library). The boot log that summarized tag tables moves into the per-pack result summary.

**Ordering rationale (all pins preserved):**
- `SeederManager.run()` keeps line 104 and its insert-only-on-unstamped behavior. It and `PackApi.install()` touch **disjoint sets**: the installer only ever reads/writes `sourcePack`-stamped (or adopts-then-stamps) rows for paths the pack ships; `SeederManager` is insert-only and skips any path that already has a row (which after install includes every base-library path). Conflict-free by construction.
- The install pass runs **before** `loadHooks` (the migrated content is all pre-hooks content: domain templates + quantity). The marshaller/`tag()` consumers and the DomainHook clone that `loadHooks` performs all see the rows already present.
- `BootstrapManager.run()` (line 143) keeps its position — it clones singletons *after* install, so no re-hydrate is needed at boot.
- Run `SeederManager.run()` **then** `PackApi.install()`: SeederManager skips base-library paths if they already exist (legacy DB) — harmless — and the installer then adopts/updates them. On a fresh DB, SeederManager no longer has the material/biome files (they moved out), so it inserts nothing for them and the installer inserts them stamped. Either order is safe given disjoint sets; SeederManager-first matches the existing line-104 pin.

### 4.2 — Imports

Add `import { PackApi } from '../mud/api/pack';` to `AppBootstrap.ts`. Remove the now-unused `QuantityApi` import **only if** nothing else in `AppBootstrap` uses it (it does not after the fold — confirm and drop the import).

---

## Phase 5 — The `pack sync` author/dev-gated verb

Satisfies *"the full iteration loop works"* — runtime sync re-hydrating live singletons with no restart.

### 5.1 — Controller

**Create** `packages/server/src/mud/obj/command/author/PackController.ts`, modeled on `ReloadController`:

```ts
export default class PackController extends CommandController<PackModel> {
  async execute(model, context) {
    // requiresDeveloper handled declaratively in pack.yaml (like reload)
    const sub = model.subcommand;     // "sync"
    const packId = model.packId ?? "base-library";
    if (sub !== "sync") return this.fail(context, "usage: pack sync <packId>");
    try {
      const result = await PackApi.sync(packId);   // reconcile + re-hydrate
      this.tell(context, formatResult(result));    // inserted/updated/adopted/deleted/rehydrated counts
    } catch (err) {
      return this.fail(context, (err as Error).message);  // requires-kernel abort surfaces here
    }
  }
}
```

`tell`/`fail` copy `ReloadController`'s `MessageApi.scene(...).topic('system.shell.author')` shape and the `controller-rejected` note discipline (controllers return `void`).

### 5.2 — YAML view

**Create** `packages/server/src/mud/cmd/author/pack.yaml`, modeled on `reload.yaml`:

```yaml
verbs: [pack]
controller: author/PackController
description: "Reconcile a content pack into the world and push edits live"
help: |
  Reconcile a content pack's files into the database and re-hydrate the
  affected live singletons, with no restart. Developer access required.
  Usage: pack sync <packId>
validators:
  - /lib/command/validators/requiresDeveloper
args:
  - name: subcommand
    type: string
    required: true
  - name: packId
    type: string
    required: false
```

This mirrors the `AuthorMixin`/developer-gated verb shape (`reload`, `clone`). It is a **standard Controller + YAML view** — no new module category.

### 5.3 — Re-hydrate affected singletons (the one addition over boot)

`PackApi.sync(packId)` → `PackLogic`:

1. Run the same `reconcilePack` as boot (insert/update/adopt/delete + requires-kernel) — collect the set of `domain` paths whose `data` actually changed (`inserted ∪ updated ∪ adopted`; deleted handled separately).
2. For each changed path, re-hydrate the live singleton **through the existing seam** (CLAUDE.md: "re-hydration uses `restoreFromTemplate`"):

   ```ts
   for (const instance of StuffApi.findAllByTemplatePath(path)) {
     await TemplateApi.restoreFromTemplate(instance);
   }
   ```

   This is the **exact** pattern `CmsLogic._writeContent` uses for content go-live (re-hydrate every live clone at the path). Materials/biomes are singletons-by-path (one instance per path), so this re-hydrates one object; everything downstream re-resolves lazily (`Tangible.getMaterial()` re-resolves via `findByTemplatePath` on each read — no cached instance, confirmed Material.ts header + Tangible.ts line 230), so the new density is live immediately.
3. For **deleted** paths: destruct the orphaned singleton if present (`StuffApi.destruct`) so a dropped material file removes the live singleton too. (Dangling references that still point at the path are the author's to fix — documented.)
4. For the **quantity** kind, sync calls `QuantityApi.reloadTagTables(<pack path>)` (the diff-apply variant), not `loadTagTables` — existing `Quantity` instances see new tags on their next `tag()` call (no cache to invalidate, per QuantityApi docs).

`install()` (boot) does **none** of steps 2–4's re-hydration — it shares only step 1. This is the "single reconcile impl, two callers" realized: `reconcilePack` is the shared core; re-hydrate is a sync-only tail.

---

## Phase 6 — Tests

Colocated `__tests__/` per house style; Vitest. Tests bypass Mongo where they can or use the existing PM test harness. Cover every acceptance-criteria case:

### 6.1 — `packages/server/src/mud/obj/api/__tests__/PackLogic.test.ts` (the reconcile core)

- **insert** over a fresh (empty) `domain`: pack files become stamped rows; `inserted` lists them; each row carries `sourcePack`.
- **update** over already-stamped rows: edited file overwrites `data`; `updated` lists it; **second run is a no-op** (empty `updated`).
- **delete**: a stamped row whose file vanished is removed; `deleted` lists it; non-pack rows untouched.
- **adoption**: pre-seed an **unstamped** row at a pack path (simulating legacy `SeederManager` output) → first reconcile stamps + matches it to the file (`adopted` lists it), **no duplicate** at that path, no data loss; second run is a no-op via the now-stamped path.
- **coexistence**: pre-seed an unstamped row at a path the pack does **not** ship → reconcile leaves it completely untouched (not in any result list).
- **requires-kernel abort**: a pack file naming `class: /lib/material/DoesNotExist` → `reconcilePack` throws naming the pack + the missing class, and **no rows are written** (DB unchanged — assert the all-or-nothing).
- **content-kind dispatch**: a pack with both `content/lib/**` and `content/quantity/quantity-tags.yaml` → domain rows reconciled **and** the quantity result count > 0.

### 6.2 — `packages/server/src/mud/api/__tests__/pack.test.ts` (the Api + sync re-hydrate)

- **runtime sync re-hydrates a singleton**: clone a `Material` singleton, change its template `data` on disk (fixture), call `PackApi.sync` → assert the live singleton's `getDensity()` reflects the new value (the `CmsLogic` re-hydrate test is the model — see `cms.test.ts`).
- **gating**: `PackLogic` methods reject a non-`PackApi` caller (the `FromModule` gate).
- **dependsOn honored / deterministic order** in `discoverPacks` (trivial with one pack; assert order is stable).

### 6.3 — `packages/server/src/mud/obj/command/author/__tests__/PackController.test.ts`

- `pack sync base-library` happy path renders a result summary; bad subcommand fails cleanly via the `controller-rejected` note; `requiresDeveloper` rejection (mirror the `ReloadController` test patterns in the sibling `__tests__/`).

### 6.4 — Boot smoke (extend existing boot/bootstrap test if present)

- Assert `AppBootstrap.run` calls `PackApi.install()` in the pre-`loadHooks` region and that `SeederManager.run` still runs (coexistence). If a full boot test is impractical, assert the install pass writes stamped material/biome rows and the quantity table is loaded.

---

## Phase 7 — Subsystem doc (at sweep)

**Create** `docs/subsystems/content-packs.md` documenting: the pack format (`pack.yaml`, `package.json`, `content/` namespace mirror), the installer/reconcile/stamp/adoption model, content-kind dispatch (domain vs quantity), the boot path + the `pack sync` runtime path, the requires-kernel check, the re-hydrate seam, and the `replace`-only reconcile-policy seam (with `seed-missing` flagged as the deferred counter-case). Add `content-packs.md` to the CLAUDE.md Documentation Map at sweep. Per workflow, the plan + requirements docs retire and the slate's retention is decided at sweep — out of scope for the build itself.

---

## Key design decisions / risks

- **Where `sourcePack` lives & how it's read/written without hydrating.** It is a **top-level row column** sibling to `data` (`{path, class, hydratorClass, data, sourcePack}`), written by `PackLogic` directly through `PersistenceManager.getCollection(Collections.Domain)` with `insertOne`/`updateOne {$set}`. The clone pipeline passes only `template.data` to the hydrator, so `sourcePack` is structurally unreachable by `Material`/`Biome` instances. It is **not** a persistent field on any Stuff class and is **not** written via `TemplateApi.saveTemplate` (which has no slot for it and would re-fire the folder/leaf hook).

- **How reconcile enumerates "this pack's rows."** By querying `find({ sourcePack: packId })` — never by path-prefix. A per-row stamp is collision-proof and works identically across collections (the slate's reason for choosing it over path ownership).

- **How adoption avoids duplicate-key collisions on first install.** Adoption is an `updateOne` of the **existing** unstamped row **by `_id`** (stamp + overwrite), never an insert. The `domain` unique index on `path` is therefore never challenged. The lookup order is stamped-at-path → unstamped-at-path (adopt) → no row (insert), so on a legacy DB the first reconcile adopts and subsequent ones update.

- **Boot-ordering constraint.** The install pass occupies the pre-`loadHooks` region (replacing old lines 104–118's quantity call and the migrated trees' seeding), `SeederManager` keeps line 104, `loadHooks` keeps line 120, `BootstrapManager` keeps line 143. Boot **writes rows only** — no re-hydrate, because nothing is live until `BootstrapManager` clones after the install.

- **Single reconcile impl, two callers.** `PackLogic.reconcilePack` is the one implementation. `PackApi.install()` (boot) calls it and stops. `PackApi.sync()` (verb) calls it and then runs the `restoreFromTemplate` re-hydrate tail + `reloadTagTables`. No duplicated logic; no free-floating module.

- **Module placement & CLAUDE.md justification.** The logic is **not** in `backend/` (where `SeederManager` sits) because it has a runtime verb caller as well as a boot caller; per *Module Categories* and the *Api ↔ logic-singleton split*, dual-caller protected logic goes on `mud/api/pack.ts` (`PackApi` shell) + `mud/obj/api/PackLogic.ts` (gated `*Logic` singleton). The verb is a standard Controller (`obj/command/author/PackController.ts`) + YAML view (`cmd/author/pack.yaml`). The content package holds zero `.ts`. No new module category invented; no exported free-floating helper.

- **Risk: `git mv` completeness.** All path references to the moved trees must be updated: `pnpm-workspace.yaml`, `server/package.json`, `AppBootstrap` (drop standalone quantity call), and confirm no literal-path readers of `mud/config/quantity-tags.yaml` remain besides `QuantityLogic`'s fallback + tests. The `quantity-tags.schema.json` must move beside its YAML (QuantityLogic resolves the schema relative to the YAML).

- **Risk: writing the row directly vs. the folder/leaf hook.** Reconcile updates via `updateOne {$set}` by `_id`, sidestepping the insert-time folder/leaf validation that `loadHooks` registers on `Collections.Domain`. This is intentional (the invariant held at first seed; reconcile only changes `data`/`sourcePack`) and matches `SeederManager`'s direct-collection approach. The risk is a *new* pack path that creates a folder/leaf violation — out of scope for v1 (base-library's tree is already valid), but worth a note in the subsystem doc.

## Confirmed decisions (resolved with the user before build)

1. **`biome.yaml` root leaf** (Phase 1.4) — **in scope**; moves to the pack alongside the `biome/` subtree.
2. **Discovery mechanism** (Phase 2.1) — **decided:** read pack *names* from `server`'s `package.json` deps (single source of truth), resolve *paths* via module resolution.
3. **Naming** (Phase 3.1) — **approved:** `PackApi` / `PackLogic` / `sourcePack` / `pack.yaml` / `@saxonberg/content-base-library` / `/obj/api/pack` / verb `pack sync`.
4. **`QuantityLogic` default path** (Phase 1.6) — **approved:** leave the now-moved default as a test-only fallback; the installer always passes the resolved pack path.

### Critical files for implementation

- `packages/server/src/backend/AppBootstrap.ts` — boot sequencer; the install pass slots into the pre-`loadHooks` region (lines 104–120) and folds in the quantity load.
- `packages/server/src/mud/obj/api/PackLogic.ts` (new) — the reconcile core: content-kind dispatch, sourcePack stamp/adopt/delete, requires-kernel check, re-hydrate tail.
- `packages/server/src/mud/api/pack.ts` (new) — `PackApi` forwarding shell + the manifest/result call-shape types; models `mud/api/crafting.ts`.
- `packages/server/src/backend/SeederManager.ts` — the superseded pattern + the `#fileToTemplatePath` path-mapping rule the pack walk re-implements; the disjoint-set coexistence partner.
- `packages/server/src/mud/obj/api/CmsLogic.ts` — the `restoreFromTemplate` re-hydrate-live-clones pattern (`_writeContent`) that `pack sync` reuses verbatim.
