# Content packs

The **content-pack** substrate: foundational game content lives in
standalone, git-versioned packages of **pure data** (zero TypeScript),
and a single **installer** reconciles them into MongoDB at boot and on
demand. The pack files are the **source of truth**; the database is a
*derived install* of them. This is the long-term replacement for
`SeederManager` — it gives content real version control (git, on the
files) and a clean deliverable boundary, decoupled from the kernel's
release cycle.

Four packs ship today: **base-library** (materials, biomes,
quantity-units), **species-and-names** (the `Species`/`Clade` taxonomy
tree + the char-gen name banks), **arcane-descriptors** (the
unidentified-appearance pools), and **newbie-wilds** (the first
*locality* shipped as a pack — the crossroads, the delve, the cast),
plus the full iteration loop (boot install + the `pack` operator verb).
They coexist with `SeederManager` and the remaining per-collection
seeders, which keep serving every not-yet-migrated tree.

**The DB is a cache of the packs.** Since the pack-installer build
(2026-08) the templates collection is named **`content`** (it was
`domain`; a pre-rename deployment is migrated once at boot by
`PersistenceManager.#migrateDomainToContent`, strictly before index
creation — never renaming over a live `content`, never auto-dropping),
and every install is **three-way** against a per-deployment install
record (`pack_installs`): a row the pack changed is updated, a row the
database changed is kept, a row both changed is a **conflict** —
reported, never merged. The `pack` verb is gated on membership of the
**`pack-installers`** committee, an office-owned group, never on the
wizard axis.

> **Scope.** This is the *content-only* corner of the downloadable-content
> taxonomy (roadmap Framework 13: Content / Capability / Full). A content
> pack ships **no code**; it assumes the kernel already provides the
> classes its data names. That assumption — enforced by the
> `requires-kernel` check — *is* the content-pack ↔ mod boundary: a pack
> assumes classes, a mod brings them.

## The shape of a pack

A pack is a monorepo package (`packages/content/<pack>/`, its own repo
once the monorepo is broken up) named `@saxonberg/content-<id>`:

```
packages/content/base-library/
├── package.json          # workspace member: name, version, private — no code
├── pack.yaml             # the manifest the installer reads
└── content/              # content root; MIRRORS the template-path namespace
    └── lib/
        ├── material/spirit/gin.yaml   →  template path /obj/material/spirit/gin
        └── biome/…
```

The `content/` root mirrors the template-path namespace: a file's path
relative to `content/`, minus `.yaml`, prefixed with `/`, **is** its
template path (`content/obj/material/spirit/gin.yaml` →
`/obj/material/spirit/gin`; `content/domain/newbie-wilds/crossroads/hub.yaml`
→ `/domain/newbie-wilds/crossroads/hub`) — the same rule `SeederManager`
uses. So the path is a pure namespace identifier, decoupled from where
the file physically sits, and migrating a tree out of `seeds/` is a
`git mv` (newbie-wilds was exactly that: 21 files, bytes and paths
unchanged, the seed-tree entry deleted by the move so the seeder can
never re-insert what the installer owns).

The same rule names every row in the install record — the **record
key**: the content-root-relative path with a leading slash and no
`.yaml`. For the template kind that *is* the template path; for a bank it
is `/name-banks/<key>` or `/descriptor-banks/<key>`. One uniform
address for every kind (`pack diff <id> <path>`).

### The manifest — `pack.yaml`

```yaml
id: base-library          # the sourcePack stamp value; stable
version: 0.1.0            # reserved release label — nothing reads/enforces it in v1
description: …
dependsOn: []             # ids of packs that must install first
```

Deliberately minimal: the pack's two real requirements are **derived**,
not declared. *Requires-kernel* is the install-time class-resolve check
(below). *Owned paths* are recorded by the `sourcePack` stamp at install
time. The manifest never enumerates paths.

`server`'s `package.json` `@saxonberg/content-*` dependencies are the
**single source of truth** for which packs a build ships — adding a pack
to a build is adding a dependency line.

## Discovery

`PackLogic` discovers packs by reading the `@saxonberg/content-*` keys
from `server`'s `package.json` (the names), then resolving each to its
on-disk root via Node module resolution (`require.resolve('<pkg>/package.json')`).
Reading the *names* from `package.json` keeps one source of truth;
resolving *paths* via module resolution is layout-robust across dev
(`tsx`) and dist. Packs are then ordered by `dependsOn` (a stable
topological sort; throws on a cycle). With one pack this is a passthrough,
but the read-and-honor of `dependsOn` is present so multi-pack ordering
is already wired (full missing-dependency validation is deferred).

## The installer — reconcile by `sourcePack` stamp + content-kind

The installer's job each run is *make the DB match the pack files*. It
lives on the **Api + logic-singleton** pattern (not `backend/` like
`SeederManager`) because it has two callers — the boot path and the
runtime `pack sync` verb — and the gated `PackApi` is the shared surface:

- **`PackApi`** (`mud/api/pack.ts`) — the thin forwarding shell:
  `install()` / `sync(packId)` / `discoverPacks()` and the ops surface
  `status()` / `dryRun()` / `diff()` / `resolve()` / `pin()` / `unpin()`,
  plus the call-shape types (`PackManifest`, `PackReconcileResult`,
  `PackInstallRecord`, `PackConflict`, the report shapes).
- **`PackLogic`** (`mud/obj/api/PackLogic.ts`, `/obj/api/pack`,
  `@internal @Unshadowable`) — the reconcile core; every public method
  gated `FromModule('/api/pack#PackApi')`. All work in module-private
  functions (the `CraftingLogic` precedent), so no intra-singleton
  `this.x()` calls trip the gate.

A single private `reconcilePack(pack, {rehydrate})` is the one
implementation; `install` and `sync` differ only in the re-hydrate tail.
Inside it, every shipped kind rides **one strategy interface**
(`KindStrategy<F>`, module-private — the content-pack-units Part C
interface): the target collection, the record key, the db-key query, the
rendered row, the hash preimage, the go-live side effect, and an optional
`flatKeyOf` for kinds whose keys form a flat namespace. One
`computeKindPlan` (pure — reads only) and one `applyKindPlan` (the
writes) drive all three kinds, so the reconcile policy is written once.
**Dry-run is the planner with the apply half never called** — zero
writes by construction, not by a flag threaded through write sites.

### Content-kind dispatch

Content is classified by subdir convention and dispatched to the right
backend — the per-row stamp makes this work identically across backends,
which a path-prefix notion of ownership could not:

| Subdir | Kind | Backend |
|---|---|---|
| `content/obj/**.yaml`, `content/domain/**.yaml` | **domain** (the template kind) | reconciled into the `content` collection (stamped). Two **enumerated** roots — never a catch-all glob, because the sibling subdirs are their own kinds |
| `content/quantity/quantity-tags.yaml` | **quantity** | loaded into the in-memory tag table via `QuantityApi.loadTagTables(path)` |
| `content/name-banks/<key>.yaml` | **name-banks** | reconciled into the `name_banks` collection (stamped), keyed on the file's basename = the bank key |
| `content/descriptor-banks/<key>.yaml` | **descriptor-banks** | reconciled into `descriptor_banks` (stamped), keyed on the basename = the item class; the appearance caches drop on change |

> **The domain subdir was `content/lib/` until the lib/obj taxonomy
> refactor.** It is `content/obj/` now, because a pack ships content and
> content is instanceable — nothing a pack installs may live under
> `/lib/`, which is substrate-only. This is a **breaking format change**
> for any out-of-tree pack: rename `content/lib/` to `content/obj/` and
> repoint every `class:` value. Shipped packs needed no data migration
> because the installer **reconciles** (unlike `SeederManager`, which is
> insert-only) — the old rows are stamped, their files vanished, so
> the reconcile deletes them and inserts the new paths on the next
> boot. `PackLogic.readContent` reads the subdir names.

The **name-banks** kind is the first *side-collection* kind — a flat
`Document` (`{key, given, surname, style?}`) rather than a path-addressed
template, so its strategy keys on the bank `key` and writes to
`name_banks`. It skips the
`requires-kernel` check (a name bank names no backing class). Because
banks are immutable reference data the char-gen suggester caches by key,
a `sync` that changes any bank calls `NameBank.clearCache()` so the edit
goes live (banks aren't held by live instances, so there is nothing to
re-hydrate). Descriptor banks are the same shape one kind over. The
general document/side-collection vein (emotes, recipes, channels) is a
new `KindStrategy` each.

### The `sourcePack` stamp

Each installed row carries a **top-level `sourcePack` field** (a `content`
template, a `name_banks` bank — every stamped backend). On a template row
it is a sibling of `data` (`{path, class, hydratorClass, data, sourcePack}`).
It is **not** inside `data`, and the clone pipeline passes only
`template.data` to the Hydrator — so the stamp is structurally
unreachable by the instance (a `Material`/`Biome` never sees it). It is a
pure DB-row provenance marker, written directly by the installer through
the `PersistApi` chokepoint (`save` = `$set`-by-`_id` for update/adopt,
or insert), never via `TemplateApi.saveTemplate` (which has no slot for
it).

### The install record — `pack_installs`

One row per pack per deployment, written only by `PackLogic` through the
`PersistApi` chokepoint; policy `refuse` (a circle never writes installer
state), `keep` on the nightly reset, unique on `packId`. Its own
collection so no contribution kind can ever reach it (the
`parcels`-not-in-`content` reasoning, slate A17.1). Schema —
`PackInstallRecord` in `mud/api/pack.ts`:

- `packId`, `version` (the manifest's), `appliedAt`, `principal` (the
  context-derived acting author's templatePath, or `bootstrap` at boot —
  never a parameter), `status` (`applied` | `failed`; `staged` reserved),
  `failure` (`{step, error, file?}` — `read` / `flat-key` /
  `requires-kernel` / `topics` / `reconcile`), `parameters` (`{}`),
  `pins`, `conflicts`, `sideEffects.kinds` (`['quantity']` when the
  RAM-only kind ran — noted, never baselined).
- **`rows[recordKey] = {kind, hash, body}`** — the per-row **baseline**
  as installed. `hash` is `sha256:` over the canonical body; **`body`
  is the hash's preimage, stored beside it** (a planner's-choice
  extension over A17.1's minimum): `pack diff` must render three bodies,
  and in the one cell where diff matters most — both changed — the
  baseline content is recoverable from nowhere else (not the file, not
  the DB, not a git ref the DB is not pinned to). Size is bounded by the
  `content` collection itself.
- **`conflicts`** — the open conflicts, **recomputed every reconcile**
  (never accumulated, so it cannot rot into a stored to-do).

**Canonical hashing.** The preimage is the rendered content only —
`{class, hydratorClass, data}` for the template kind, the bank body for a
bank — key-sorted, cycle-safe, `undefined`-normalized (`JSON.stringify`
drops it, so absent-vs-undefined hashes identically on the file side and
the BSON-round-trip side); never `_id`, `path`, `sourcePack`, timestamps,
nothing random. A future field on a row shape is decided at the
strategy's `canonicalBody` site: content (in) or bookkeeping (out).

### The three-way reconcile

For every file and every stamped row of a kind, with the record's
baseline for that key (slate A10.4):

| file vs baseline | DB vs baseline | action |
|---|---|---|
| same | same | nothing |
| changed | same | **update** the row (baseline := file), silently — reported in `updated` |
| same | changed | **keep** the DB — reported in `kept` |
| changed | changed, file == DB | **converged** — baseline := the shared hash, any conflict cleared, no write (this is what closes an `--export` round-trip) |
| changed | changed, file ≠ DB | **conflict** — the row is untouched, a `PackConflict` (`both-changed`) lands in the record, one diagnostic fires, the reconcile continues. Never merge, never block. |

Plus: a **vanished file** deletes a clean row (DB == baseline) and
conflicts (`deleted-vs-edited`) on an edited one — an operator-edited row
is never silently deleted. **Pinned** keys (`record.pins`) are skipped
before any comparison and counted; every reconcile result, boot line,
and `pack status` reports `N rows pinned, skipped` — pins are loud,
every time. A stamped row with **no baseline** (a partial older record)
is normalized from what is written, counted, and logged. A **file at a
key with a pre-existing unstamped row** is **adopted** (stamped and
matched, `$set`-by-`_id`, never an insert); a row stamped by a
*different* pack is refused — packs never clobber each other. A file at
a key with no row is inserted.

**The adoption bridge.** With **no record** (a pre-record DB — the dev
DB the day this shipped, or a fresh one), the reconcile runs two-way
(what it just wrote wins), then mints the record with every row's
baseline taken from what was written, and emits **one unmissable
`console.warn`** — *ONE-TIME adoption baseline normalized over N rows;
pre-existing divergence was overwritten; future reconciles are
three-way*. The second boot is a no-op: zero changes, record hashes
unchanged, no line. Two-boot idempotence is tested at three layers
(migration, record, newbie-wilds).

**Conflict surfacing.** Each *newly detected* conflict (deduped against
the prior record's set — a persisting one is not re-fired) lands one
`DiagnosticApi.record` — severity `warning`, explicit channel
`pack.<packId>` (the `sandbox.boundary` precedent), the message carrying
the copy-pasteable `pack diff` / `pack resolve` commands. `pack status`
lists every open conflict with the same next-command line. No new
notification machinery.

### Per-pack failure isolation

`install()` (boot) reads every pack first, runs the flat-key check over
the whole install set, then reconciles each pack inside its own
try/catch: a failure records `status: 'failed'` + `failure` on that
pack's row (keeping any prior baselines), logs loudly, and **continues
with the remaining packs** — a failed pack boots *without* the pack; it
never bricks the boot (A17.1 / A10.10). `sync` (one pack, an operator at
the keyboard) throws instead.

### requires-kernel

Before any write, the installer resolves every distinct `class:` (and
`hydratorClass:`) the pack's content names, via the standard
`StuffApi.loadClassByPath`. A missing class fails the pack (before any
of its writes) with a message naming the pack, the class, and the
offending file. This is the enforced content-pack ↔ mod boundary. The
topic gate (leaves under a core root only) runs in the same pre-write
position.

### The flat-key uniqueness check

Kinds whose keys form a **flat namespace across the install set** (the
banks today; later kinds — emote verbs, recipe ids — plug in by giving
their strategy a `flatKeyOf`) must see each key claimed once. The check
runs after discovery + content read and **before any pack's writes**: a
second claimant — cross-pack, or two files in one pack — marks the
*claiming* pack failed (`failure.step: 'flat-key'`) with an error naming
the kind, the key, and **both** `(packId, relFile)` pairs; earlier packs
in the topo order still install. Never first-wins, never silent (A17.2).
The different-pack-stamp refusal in the reconcile stays as the belt to
this check's suspenders.

## The two entry points

### Boot — `PackApi.install()`

`AppBootstrap.run` calls `PackApi.install()` in the pre-`loadHooks`
region (it replaces the migrated trees' seeding and folds in the former
standalone `QuantityApi.loadTagTables` call). It **writes rows only** —
`BootstrapManager` clones singletons *afterwards*, so nothing is live yet
and there is no re-hydrate at boot.

Ordering and coexistence: the install pass runs after `SeederManager`
(which still walks the shrunken `seeds/` tree) and before `loadHooks`
(the migrated content — domain templates + the quantity table — is all
pre-hooks content the marshaller/`tag()` consumers and the DomainHook
clone depend on). The installer and `SeederManager` touch **disjoint
sets**: the installer only ever touches `sourcePack`-stamped (or
adopts-then-stamps) rows for paths its packs ship; `SeederManager` is
insert-only on the paths still in `seeds/`. Conflict-free by construction.

### Runtime — the `pack` verb

`obj/command/author/PackController.ts` + `cmd/author/pack.yaml`
(declarative `subcommands:` + `options:`; afforded on `AuthorMixin`'s
operator surface, **authorized by `requiresPackInstaller`** — membership
of the `pack-installers` committee, never the wizard axis; see below):

- `pack status [<packId>]` — joins the discovered manifests with the
  records: status, version, applied-at/by, failure, every open conflict
  with its next command, and the pin line — always, even at zero.
- `pack install <packId> --dry-run` — the exact change set a sync would
  apply, zero writes. `install` **without** `--dry-run` is rejected:
  boot installs; a live apply is `sync`'s job (staging is a non-goal).
- `pack sync [<packId>]` — the **same** reconcile, then re-hydrate: for
  each changed path it calls `TemplateApi.restoreFromTemplate` on every
  live instance at that path (the `CmsLogic._writeContent` go-live
  pattern); for each deleted path it destructs the orphaned instance.
  The quantity kind uses `reloadTagTables` (diff-apply); a changed bank
  drops its cache.
- `pack diff <packId> [<path>]` — the wiki three-body shape, three
  labeled sections: *baseline (as installed)* / *yours (database)* /
  *theirs (pack file)*, each with its hash. No machine merge. With no
  path, every open conflict.
- `pack resolve <packId> <path>` with **exactly one** mode:
  `--take-pack` (write the file's row, rebaseline, clear, re-hydrate);
  `--keep --pin` (keep the DB row AND claim it — pinned rows never
  compare again; **`--keep` without `--pin` does not exist** — keeping
  means claiming); `--export` (serialize the DB row back to the pack's
  **workspace** source file; the conflict stays open until the next
  `sync` observes file == DB, the converged cell, and clears it — the
  git round-trip). `--export` writes are workspace-only by construction;
  in a dist deployment the write fails loudly.
- `pack pin` / `pack unpin <packId> <path>` — direct pin management. A
  pin outside a conflict is a legitimate proactive claim; an unpin
  re-compares on the next reconcile and may immediately surface the
  conflict the pin was hiding, which is correct.

This is the iteration loop: edit a pack file → `pack sync` → live, no
restart. It is tractable for base-library because materials/biomes are
**singletons by path** (one instance per path; `Tangible.getMaterial()`
re-resolves the material singleton lazily on each read, so every object
made of it sees the new values immediately). Cloned (non-singleton)
content — newbie-wilds' rooms and NPCs — re-hydrates through the same
`findAllByTemplatePath` walk, but live players standing in a re-hydrated
room is lightly-trodden ground: **restart remains the universal go-live**
(A10.9).

### Who may run it — the `pack-installers` committee

`config/groups.yaml` seeds **`pack-installers`** with
`owner: { office: prime-minister }` and zero members: the executive's
content-operations committee (offices are heads, committees are hands —
slate A25). Ownership resolves on read through `GroupApi.ownsGroup` →
`CompactApi.holdsOffice` (founder default included), so handing the PM
seat hands the committee with **no data migration**; the seat-holder
appoints with the ordinary `group add pack-installers <player>`. The
typed `GroupOwner` is documented in
[grouping.md](./grouping.md#the-owner--a-typed-principal).

`requiresPackInstaller` (`lib/command/validators/`) gates the verb on
membership per se: no `isWizard` anywhere in the pack path (the
code-trust axis is the wrong axis — installing content is a content
operation), and not `AccessApi.can` (that path resolves *parcel title*,
and this committee holds no parcel). A non-member gets a diegetic
decline; a **wizard who is not a member is refused**; a missing group
fails closed.

## Reconcile policy

The policy is **three-way** (above). It subsumes both of v1's designed
shapes: `replace` (file is truth) is the *changed / same* cell, and the
deferred `seed-missing` (the DB wins thereafter) is the *same / changed*
cell — an operator's in-DB edit survives until the pack changes that
row too, at which point it is a conflict to settle rather than a policy
to pick. The opt-in answer to "content I *do* want to edit live in the
DB" is a **pin**.

## Versioning

A pack is files in a repo, so **git is the versioning** — history, diff,
branch, rollback, PRs, all on the content, all free. The manifest
`version` is a coarser release label and **inert in v1** (nothing reads
it). It becomes load-bearing only when packs evolve on independent
timelines (separate repos / third-party packs / a marketplace) — the
same boundary as the repo split — at which point it tracks the pack's
**public surface** (the paths and tags other content references), not its
values: editing gin's density breaks nothing (it re-hydrates); renaming
`/obj/material/spirit/gin` breaks every pointer.

## Deferred

The slate (`docs/slates/builds/content-packs-slate.md`) holds the full
design surface and remaining build waves: the remaining packs (emotes,
recipes, channels — each a new `KindStrategy`); retiring `SeederManager`
and the per-collection seeders (the strangler-fig end-state); the
`/domain/` path surgery that makes the template kind fractal under any
root (wave 4); manifest version machinery + cross-pack dependency
validation; the `staged` record status + runtime install / uninstall /
marketplace; third-party namespacing; and the repo split.

## Key files

- `packages/content/base-library/` — the substrate pack (materials,
  biomes, quantity-units).
- `packages/content/species-and-names/` — the species/clade tree
  (`content/obj/species/**`) + the name banks (`content/name-banks/**`).
- `packages/content/arcane-descriptors/` — the descriptor banks.
- `packages/content/newbie-wilds/` — the frontier onboarding locality
  (`content/domain/newbie-wilds/**`).
- `mud/api/pack.ts` — `PackApi` + the manifest / result / record /
  conflict / report types.
- `mud/obj/api/PackLogic.ts` — discovery, the per-kind `KindStrategy`
  table, the pure planner + the applier, the record, the three-way
  machine, the flat-key check, `requires-kernel`, the ops surface, the
  re-hydrate tail.
- `mud/obj/command/author/PackController.ts` + `cmd/author/pack.yaml` —
  the `pack` verb suite; `lib/command/validators/requiresPackInstaller.ts`
  — its gate; `config/groups.yaml` — the committee row.
- `backend/PersistenceManager.ts` — the `domain` → `content` migration
  (`planDomainRename` + `#migrateDomainToContent`), the `pack_installs`
  policy + index; `lib/persistence/Collections.ts` — the names.
- `backend/AppBootstrap.ts` — the boot install pass.
- `mud/obj/api/QuantityLogic.ts` — the quantity-kind loader; its no-arg
  default lazily resolves the pack copy (test-only fallback; production
  always passes the path).

## History

Built on `feature/content-packs-build` (the content-packs v1 slice).
First substrate where canonical game content lives outside `packages/server`
as a versioned deliverable.

`feature/species-and-names-pack` (2026-06-29) added the second pack,
**species-and-names** — the `Species`/`Clade` tree + the char-gen name
banks migrated out of the kernel seed tree / `NameBankSeeder` — and with
it the third content kind, **name-banks** (the first side-collection
kind). The migration rode the adopt-don't-wipe path: a live DB's existing
unstamped species + `name_banks` rows are adopted in place on first
install, no wipe, no data migration (no class moved).

`design/pack-installer` (2026-08-25) — the **pack-installer substrate**
(waves 0+1 of the content-pack program; requirements in
`docs/requirements/pack-installer-substrate-requirements.md`): the
`domain` → `content` rename with its idempotent boot migration; the
`pack_installs` record with body-beside-hash baselines; the three-way
reconcile with conflicts, pins, and the adoption bridge; per-pack failure
isolation; the flat-key check; the plan/apply split behind dry-run; the
`pack` verb suite; office-owned groups + the `pack-installers` committee
(`requiresWizard` left `pack`); and **newbie-wilds** as the fourth pack —
the first locality shipped as content.
