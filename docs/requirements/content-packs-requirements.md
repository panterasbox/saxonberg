# Content packs (v1: base-library) — requirements

The first build of the **content-pack** substrate: lift the foundational
content trees out of `packages/server` into a standalone, git-versioned
**pack**, make the pack files the **source of truth**, and stand up a
single **installer** that reconciles the pack into MongoDB — replacing
`SeederManager` *for the migrated trees* while it keeps serving the rest.
This build migrates **all of base-library** (materials, biomes,
quantity-units) into one pack and ships the **full iteration loop**:
boot-time install plus a runtime `pack sync` that pushes file edits live
without a restart. It is the proving ground for the whole approach;
later builds extend it to species+names, emotes, and world content, and
eventually retire the seeders entirely.

Content packs ship **zero TypeScript** — they are the *content-only*
corner of the DLC taxonomy, distinct from the mod/expansion (new-code)
track. See [content-packs-slate.md](../slates/builds/content-packs-slate.md)
for the full design and the D1–D7 spine this build implements.

## Goals

- **base-library is a standalone monorepo package.** Materials, biomes,
  and quantity-units live in `packages/content/base-library/` as pure
  data, removed from `packages/server/src/mud/seeds/` and
  `mud/config/quantity-tags.yaml`. `server` declares a dependency on it.
- **The pack file is the source of truth.** The database is a *derived
  install* of the pack: a fresh DB can be built entirely by installing
  the pack, and re-installing makes the DB match the files.
- **One installer reconciles packs into the DB**, dispatching by
  content-kind to the right backend, and replaces the seeding of the
  migrated trees. It coexists with `SeederManager` (which still loads
  every not-yet-migrated tree) with no conflict.
- **Two content-kinds are proven**: `domain` templates (materials,
  biomes → reconciled, stamped, adopted) and the quantity tag table
  (quantity-units → loaded from the pack into the in-memory table).
- **Reconcile is ownership-scoped and non-destructive.** Each installed
  `domain` row carries a `sourcePack` stamp; reconcile touches only this
  pack's stamped rows; unstamped rows and other content are never
  altered. Existing unstamped rows from prior seeding are **adopted**
  (stamped + matched to file) on first install — migration without
  wiping the DB.
- **A pack declares its needs; unmet needs fail loudly.** The installer
  resolves every content file's backing `class:` and aborts the install
  with a clear, pack-and-class-naming error if one is missing
  (`requires-kernel`, derived — not a hand-maintained list).
- **The full iteration loop works.** Editing a pack file and running
  `pack sync` reconciles the change and **re-hydrates the affected live
  singletons** so the new values are live with no restart; editing and
  restarting achieves the same via the boot path.
- **A pack is described by a tiny manifest.** `pack.yaml`
  (`id` / `version` / `dependsOn`) plus a workspace `package.json`. The
  installer reads the manifest; `server`'s dependencies enumerate the
  packs the build ships with.

## Non-goals

- **Other packs.** species+names, emotes, recipes, channels — their
  trees stay with their current seeders this build (species/emotes in a
  later content-pack build; see slate D3). The **document/side-collection
  content-kind** is therefore *not* exercised in v1 (base-library has no
  side-collection content).
- **Retiring `SeederManager` or the five per-collection seeders.** They
  remain and keep serving all non-migrated content. Deletion is the
  end-state of the strangler-fig migration, a later build (slate D6).
- **The `seed-missing` reconcile policy.** v1 is `replace`-only
  (base-library is all file-is-truth). app-settings keeps its own seeder;
  `seed-missing` lands when it migrates (slate D5).
- **World packs and cloned-instance re-hydration.** Runtime sync covers
  singleton/table content only (which is all base-library is); pushing
  edits to many cloned instances is the harder, later wave.
- **A file-watcher.** Sync is command-triggered (`pack sync`). An
  auto-watcher is deferred (and unreliable under WSL2 per the live-dev
  notes).
- **Manifest `version` machinery.** The field exists and is set to
  `0.x`; nothing reads or enforces it. Compatibility/version-range checks
  arrive with the repo split / independent pack timelines (slate D7).
- **Cross-pack dependency *validation*.** `dependsOn` is read and the
  install order respects it, but with one pack this is trivial; full
  multi-pack ordering + missing-dependency validation is deferred.
- **Round-trip / export (edit-in-game → file), migrations, runtime
  pack-install/uninstall/marketplace, third-party namespacing,
  referential-integrity guards on file-delete.** All deferred (slate
  *Open questions*). A deleted file drops its row; a dangling reference
  is the author's to fix — documented, not guarded.
- **The repo split.** base-library stays a package in the monorepo.
- **isolated-vm / Capability / Full mods.** Out of the content-only
  corner entirely.

## Surface decisions

### Pack scope: all of base-library, one pack

Materials + biomes + quantity-units ship together in `base-library`.
One pack means `dependsOn: []` and trivial ordering, while two
content-kinds (templates + the quantity table) validate the installer's
content-kind dispatch — the architecturally novel claim — up front.

### Iteration: boot install **and** runtime `pack sync`

v1 ships the full loop, not just boot. This is tractable precisely
because base-library is **singleton/table content**: a material/biome is
one singleton resolved by path (`Tangible.getMaterial()` re-resolves
lazily), so sync = reconcile the row + re-hydrate one singleton, and
everything downstream sees it. Quantity-units are an in-memory table:
sync = reload it. No cloned-instance fan-out exists here.

### Sync trigger: an explicit `pack sync` command, not a watcher

Author/developer-gated. File-watching is unreliable under WSL2 (the
live-dev environment), so the reliable trigger is an explicit command;
a watcher is a deferred convenience.

### Ownership & migration: per-row `sourcePack` stamp + adoption

A `domain` row gains a row-level `sourcePack` field (metadata alongside
`path`/`class`/`data`, **not** inside `data` — it must not hydrate into
the instance). Reconcile = "for rows stamped `base-library`: upsert each
file, delete any stamped row whose file vanished; touch nothing else."
On first install, an existing **unstamped** row at a pack path is
**adopted** (stamped + overwritten to match the file) rather than
colliding — this is how a live DB migrates without a wipe. The
quantity table needs no stamp (it is rebuilt wholesale from the pack
file each load).

### requires-kernel: a derived install-time check

The installer resolves each content file's `class:` via the normal
module-resolution path and aborts the whole install if any class is
unresolvable, naming the pack and the missing class. No
hand-maintained requires list in the manifest. This check *is* the
enforced content-pack ↔ mod boundary (a pack assumes classes; a mod
brings them).

### Manifest & layout

`packages/content/base-library/` contains `pack.yaml`
(`id: base-library`, `version: 0.1.0`, `dependsOn: []`), a workspace
`package.json` (`@saxonberg/content-base-library`, private, no code),
and a `content/` root that **mirrors the template-path namespace**
(`content/lib/material/spirit/gin.yaml` → `/lib/material/spirit/gin`),
so migrating each tree is a `git mv` and the YAML is byte-for-byte
unchanged. Content-kind is recognized by subdir convention
(`content/lib/…` → `domain`; the quantity table by its known config
location within the pack).

### Where the install/reconcile logic lives

Unlike `SeederManager` (boot-only, `backend/`), this logic has a
**runtime surface** (the `pack sync` verb) as well as a boot caller, so
it must be invocable from both. It belongs on the gated **Api + logic
singleton** pattern (the boot path calls the Api as `AppBootstrap`
already calls `QuantityApi`/`CommandApi`; the verb calls the same Api).
Exact naming/placement is the planner's call; the constraint is
**single reconcile implementation, two callers (boot + gated verb)** —
no duplicated logic, no free-floating module.

## Constraints

- **No new module category.** Reconcile/install logic goes on the
  Api + `*Logic` singleton pattern; the `pack` verb is a standard
  Controller + YAML view (author/dev-gated, mirroring `AuthorMixin`
  verbs). The content package itself holds no `.ts`. See
  CLAUDE.md *Module Categories*.
- **Boot ordering pins preserved.** Migrated content is all pre-`loadHooks`
  (domain templates currently seed at `AppBootstrap` line 104, quantity
  at 111, both before `loadHooks` at 120). The installer's boot pass runs
  in that same pre-hooks region and the standalone `QuantityApi.loadTagTables`
  call folds into it. `SeederManager`, the doc-seeders, and
  `BootstrapManager` (which clones singletons *after* install) keep their
  positions. Boot **writes rows only** — no re-hydrate at boot (nothing
  is live yet).
- **Coexistence is conflict-free by construction.** The installer only
  touches `base-library`-stamped rows; `SeederManager` is insert-only on
  unstamped rows for paths the pack no longer ships. Disjoint sets.
- **Never wipe.** Migration of a live DB must be idempotent and
  non-destructive via adoption; running the installer against an
  already-correct DB is a no-op.
- **Go through the existing seams.** Class resolution uses the standard
  module-resolution path; re-hydration uses `restoreFromTemplate` / the
  HMR machinery (see hot-reload.md), not a bespoke refresh. Row writes
  use the persistence chokepoint as the seeders do.
- **`pnpm-workspace.yaml` needs `packages/content/*`** added (current
  glob `packages/*` does not match the nested pack dir); `server`'s
  `package.json` gains the `workspace:*` dependency.
- **Strict TS** (`noUncheckedIndexedAccess`, no unjustified `any`),
  house style.

## Acceptance criteria

- `packages/content/base-library/` exists (`pack.yaml`, `package.json`,
  `content/lib/material/**`, `content/lib/biome/**`, the quantity-units
  content); `server/src/mud/seeds/lib/material/`,
  `seeds/lib/biome/`, and `mud/config/quantity-tags.yaml` are gone from
  `server`. `pnpm-workspace.yaml` and `server`'s deps updated; the
  monorepo installs and builds.
- **Fresh DB:** boot installs `base-library`; materials and biomes are
  present in `domain`, each stamped `sourcePack: base-library`; the
  quantity tag table is loaded; observed game behavior is identical to
  pre-change.
- **Existing DB (unstamped legacy rows):** boot **adopts** the material/
  biome rows (stamps + matches them to the files) with no duplicates and
  no data loss; a second boot is a no-op.
- **Runtime sync:** edit a material file (e.g. gin's density), run
  `pack sync base-library` with the game running, and the live material
  singleton reflects the new value with **no restart** (observable, e.g.
  via a thing made of that material).
- **Boot sync:** the same edit picked up via reconcile on restart.
- **Delete:** removing a content file and syncing/rebooting drops its
  `domain` row (dangling-reference caveat documented).
- **requires-kernel:** a content file naming a nonexistent `class:`
  causes the install to abort with a message naming the pack and the
  missing class.
- **Coexistence:** `SeederManager` still loads all non-migrated seeds and
  the five doc-seeders are unchanged and functional.
- **`dependsOn`** is read and honored in install ordering (trivially, one
  pack); ordering is deterministic.
- **Tests** cover: reconcile insert/update/delete over stamped rows;
  adoption of an unstamped row; `requires-kernel` abort; content-kind
  dispatch (domain + quantity); runtime sync re-hydrating a singleton;
  coexistence (a non-pack row is untouched by reconcile).
- **Subsystem doc** `docs/subsystems/content-packs.md` lands at sweep,
  documenting the pack format, the installer/reconcile/stamp/adoption
  model, content-kind dispatch, the boot + sync paths, and the
  reconcile-policy seam.

## Cross-references

- [content-packs-slate.md](../slates/builds/content-packs-slate.md) — the
  design and D1–D7 spine this build implements; *Open questions* enumerate
  the deferred lanes.
- [persistence.md](../subsystems/persistence.md),
  [templates.md](../subsystems/templates.md) — the `Template` → `domain`
  model and Hydrator the installer feeds; the persistence chokepoint.
- [bootstrap.md](../subsystems/bootstrap.md) — the boot sequence the
  installer slots into (the `AppBootstrap.run` ordering region).
- [hot-reload.md](../subsystems/hot-reload.md) — `restoreFromTemplate` /
  HMR, reused for the runtime re-hydrate.
- [app-settings.md](../subsystems/app-settings.md) — the `seed-missing`
  counter-case (deferred this build).
- [provenance-slate.md](../slates/builds/provenance-slate.md) — sibling
  substrate; the `sourcePack` stamp is a thin precursor to its authorship
  attribution; the deferred round-trip lane is where they meet.
