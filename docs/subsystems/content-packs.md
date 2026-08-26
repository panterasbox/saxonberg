# Content packs

The **content-pack** substrate: foundational game content lives in
standalone, git-versioned packages of **pure data** (zero TypeScript),
and a single **installer** reconciles them into MongoDB at boot and on
demand. The pack files are the **source of truth**; the database is a
*derived install* of them. This is the long-term replacement for
`SeederManager` — it gives content real version control (git, on the
files) and a clean deliverable boundary, decoupled from the kernel's
release cycle.

**Fourteen packs ship today** (wave 2 of the content-pack program,
2026-08): **base-library** (materials, biomes, quantity-units),
**species-and-names** (the `Species`/`Clade` taxonomy tree + the
char-gen name banks), **arcane-descriptors** (the unidentified-appearance
pools), **newbie-wilds** (the first *locality* shipped as a pack — the
crossroads, the delve, the cast), **platform** (the seed of pack zero:
the application settings, the standing subjects Help/Global/Chat, the
curated blueprints, and every engine verb's command view),
**expression** (the emote roster), **generic-objects** (the crafting
recipes), **saxonberg-lounge** (this wave only its three `msh` world
scripts), **arcane-library** (the twelve spells + the two first magic
items), **wiki-starter** (the starter articles), and the five
**corpo-{aevex,goodkin,hollis,veshko,vionne}** (each corpo's mark + its
brands) — plus the full iteration loop (boot install + the `pack`
operator verb). **Seven per-collection seeders retired** into them
(`EmoteSeeder`, `RecipeSeeder`, `BlueprintSeeder`, `ScriptSeeder`,
`ChannelSeeder`, `AppSettingsSeeder`, `WikiSeeder`); `SeederManager`
still walks the shrunken `seeds/` tree for every not-yet-migrated
template, and `GroupSeeder` / `ParcelSeeder` stay (D12 — platform-seeded
until the core decomposition).

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
extension. For the template kind that *is* the template path; for a
descriptor bank it is `/descriptor-banks/<key>`; for a document kind
`/<contentDir>/<name>` (`/emotes/grin`, `/msh/martini`,
`/name-banks/common`); for a settings section `/settings/<section>`; for
a subject `/subjects/<name>`; for a wiki page `/wiki/<ns>/<slug>`; for a
command view its document path (`/cmd/perception/look`). One uniform
address for every kind (`pack diff <id> <path>`).

### The manifest — `pack.yaml`

```yaml
id: base-library          # the sourcePack stamp value; stable
version: 0.1.0            # reserved release label — nothing reads/enforces it in v1
description: …
dependsOn: []             # ids of packs that must install first
root: /base-library       # the DOCUMENT root (optional; defaults to /<id>; must start with /)
```

`root:` is where the pack's **document-kind** rows land — every
`documents` row a pack ships has `path = root + recordKey` and `owner =
root` (`/expression/emotes/grin`, owned by `/expression`). It is the
pack's branch in the document tree; the template kind ignores it
(template paths are their own namespace). `saxonberg-lounge` declares
`root: /domain/lounge` so its scripts land where the retired
`ScriptSeeder` put them and every dev DB adopts them in place.

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
| `content/obj/**.yaml`, `content/domain/**.yaml` | **domain** (the template kind) | reconciled into the `content` collection (stamped). Two **enumerated** roots — never a catch-all glob, because the sibling subdirs are their own kinds. A `cmd/` segment under `content/domain/` is skipped (it is the command-view kind) |
| `content/quantity/quantity-tags.yaml` | **quantity** | loaded into the in-memory tag table via `QuantityApi.loadTagTables(path)` |
| `content/descriptor-banks/<key>.yaml` | **descriptor-banks** | reconciled into `descriptor_banks` (stamped), keyed on the basename = the item class; the appearance caches drop on change |
| `content/<contentDir>/<name>.<ext>` per **`DOCUMENT_KINDS`** — `emotes/*.yaml`, `recipes/*.yaml`, `name-banks/*.yaml`, `blueprints/*.yaml`, `msh/*.msh`, `cmd/**/*.yaml` (+ `domain/**/cmd/*.yaml`) | **document** (one strategy per declared kind) | reconciled into `documents` (stamped) at `root + key` — the closed vocabulary in `lib/document/DocumentKinds.ts`; a `.yaml` file's object is `data`, an `.msh` file is `data: { source }`; a flat-key kind gets its natural key from the basename (a disagreeing file fails at `read`); per-kind read validation (what the retired seeders validated) |
| `content/settings/<section>.yaml` | **settings** | merged into the `app_settings` singleton (**merge-missing**, below) |
| `content/subjects/<name>.yaml` | **subject** | `forum_subjects` + its channel/board surfaces (**archive-never-reap**, below) |
| `content/wiki/<ns>/<slug>.md` | **wiki** | submitted through `WikiRegistry` AS the pack (**CAS**, below) — never rows |

#### `DocumentKinds` — the closed vocabulary

`lib/document/DocumentKinds.ts` declares every pack-installable document
kind: its `kind` string, its natural key (`verb`, `recipeId`, `key`,
`blueprintId` — or null for a path-keyed kind), the pack subdir, the
file extension, and its vanish policy. **Editing it is a platform act**
(slate A11.5): a pack cannot declare a new kind, because the kind's
consumer (a catalogue, an engine) is code and the installer needs its
go-live hook. `PersistenceManager` builds one **unique partial index**
`{kind, data.<naturalKey>}` per flat-key kind (partial on the kind, so
path-keyed kinds never collide), and the nightly reset keeps every
declared kind beside releases — without that the world would lose its
emotes at 04:00. `wiki` is deliberately absent (a page is not a
document: it has a revision log and a CAS edit path); `settings` and
`subject` are contribution kinds with their own targets.

The **document strategy** is one factory (`documentStrategy(spec, root)`)
per kind: `dbKeyQuery` `{kind, path}`, an **`adoptQuery`** `{kind,
'data.<naturalKey>'}` for flat-key kinds (so a migrated legacy row at a
provisional path is adopted in place by natural key), and a
**`stampedQuery`** `{kind}` — ⚠ load-bearing: `{sourcePack}` alone over
`documents` returns every kind the pack ships, and each kind would reap
the others' rows as its own vanished files. Baselines and conflicts
carry the label `document:<kind>` so `pack diff` output names it. The
preimage is `{ data }` only — `path`/`owner`/`kind`/`sourcePack` are
bookkeeping, and a migrated row still at its provisional path is
re-pathed as bookkeeping on the converged / normalized / kept cell (no
content write).

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

**Descriptor banks** are the one remaining *side-collection* kind — a
flat `Document` keyed on the item class in `descriptor_banks`; the
appearance caches drop on change. Name banks were the first such kind
and now ride the `name-bank` document kind (the same
`content/name-banks/<key>.yaml` files, read as `data: {key, given,
surname, style?}`; the species-and-names pack needed no file change).

#### The per-kind reconcile policy

| Policy | Kinds | What it does |
|---|---|---|
| **three-way** (default) | domain, descriptor-banks, every document kind, subject | the A10.4 matrix below; a vanished file deletes a clean row (subjects: archives it) |
| **merge-missing** | settings | a key the `app_settings` singleton lacks is merged in (`merged`); a key the operator tuned with `config` is **kept — never a conflict**; a vanished file keeps every value and drops its baseline. The baseline is the file body, so `pack diff` shows the pack's default against the operator's value |
| **cas** (compare-and-swap) | wiki | a page is created or edited **through `WikiRegistry` as the pack** (`asInstaller: <packId>` — the revision author is `pack:<id>`, the namespace protection walk is skipped); an edit carries the baseline's page `rev` as the CAS token, and a page somebody edited since is a **`wiki-cas` conflict** the registry throws — recorded with the baseline / live / pack hashes, one diagnostic; `pack diff` renders the live page; `resolve --take-pack` edits over the CURRENT rev (the history keeps both); a vanished file **keeps** the page. A page that pre-dates its record (a seeder-made one) adopts with the live `rev` in the baseline — no edit submitted |

**Vanish policies** (`onVanish`): `delete` (the default), `keep`
(settings, wiki — the baseline drops, the row stays), `archive`
(subjects — `Subject.state = 'archived'`, `Channel.archived` /
`Board.archived = true`; the catalogues and the board listing skip
archived rows, the entries stay; a returning file re-activates the row
in place; never a delete).

**Subjects** (D6) are the one kind written *through the seeder's own
shape*: a Subject row (owned by `pack:<id>`) plus its `open-chat`
channel and/or `open-forum` board, with optional name overrides and an
audience group resolved **by name** at the pre-write gate (a missing
group fails the pack). Both sides render to one preimage
(`{name, description, audience, board, channel, channelName,
boardName}`) so the three-way compares like-for-like; the retired
`ChannelSeeder`'s rows adopt **by title** with their `_id` and channel
preserved. ⚠ No `SubjectCatalogue.installSubject`: at boot the installer
runs *before* `BootstrapManager` clones the catalogues, so the rows are
written as Documents through `PersistApi` and the resident catalogues
are invalidated only on a live sync.

**Command views** (D8) are the `command-view` document kind at the view
key's document path — `content/cmd/perception/look.yaml` →
`/cmd/perception/look`, a locality's `content/domain/<…>/cmd/<verb>.yaml`
→ `/domain/<…>/cmd/<verb>` (no `root` join: the dispatcher's key is the
same string, so `CommandApi.reload(path)` finds it). Every view is
validated against the command schema at `read`. `CommandApi.preloadAll`
serves the **store first**, then the on-disk command trees for whatever
the store did not serve, **counting each disk read** — the migration
residue `pack status` prints (*N command view(s) still served from disk*;
the seven domain-local views of eternal today). A CMS save of a view
that changes its `controller:` or its validator set is **wizard code
trust** (`DocumentLogic`); a cosmetic edit goes live through
`CommandApi.reload` without a restart.

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
  extension over A17.1's minimum; a CAS kind adds **`rev`**, the page
  revision the baseline was taken at): `pack diff` must render three bodies,
  and in the one cell where diff matters most — both changed — the
  baseline content is recoverable from nowhere else (not the file, not
  the DB, not a git ref the DB is not pinned to). Size is bounded by the
  `content` collection itself.
- **`conflicts`** — the open conflicts, **recomputed every reconcile**
  (never accumulated, so it cannot rot into a stored to-do).

**Canonical hashing.** The preimage is the rendered content only —
`{class, hydratorClass, data}` for the template kind, the bank body for a
bank, `{data}` for a document, `{front, body}` for a wiki page, the
rendered subject shape for a subject — key-sorted, cycle-safe,
`undefined`-normalized (`JSON.stringify`
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

**Adoption by natural key.** A flat-key document kind adopts an
unstamped row by `{kind, 'data.<naturalKey>'}` rather than by path —
which is how the **collapse migration** hands over: a legacy
`emotes` / `recipes` / `name_banks` row becomes a `documents` row at a
provisional path (`/emotes/grin`) on the first boot, and the pack's
first install re-paths, re-owns and stamps it in place (`adopted`, same
`_id`). A row another pack stamped is refused.

**The collapse migration.** `PersistenceManager.COLLAPSES` (a table,
not code) turns each legacy per-kind collection into `documents` rows of
one kind — `_id` **preserved**, `sourcePack` carried, null fields and
the retired `aliases` dropped, the collection **dropped** — inside
`connect()` before `createIndexes()` (a duplicate natural key is a
logged re-insert under a fresh id, never a boot failure); idempotent by
construction (the second boot finds no collection and prints nothing).
The `script` document kind was renamed **`msh`** (the language's name)
in the same place, with the lounge exemplars moved from
`/domain/lounge/scripts/` to `/domain/lounge/msh/`.

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
  with its next command, and the pin line — always, even at zero; plus
  the command-view migration residue (*N command view(s) still served
  from disk: …*) when there is one.
- `pack install <packId> --dry-run` — the exact change set a sync would
  apply, zero writes. `install` **without** `--dry-run` is rejected:
  boot installs; a live apply is `sync`'s job (staging is a non-goal).
- `pack sync [<packId>]` — the **same** reconcile, then re-hydrate: for
  each changed path it calls `TemplateApi.restoreFromTemplate` on every
  live instance at that path (the `CmsLogic._writeContent` go-live
  pattern); for each deleted path it destructs the orphaned instance.
  The quantity kind uses `reloadTagTables` (diff-apply); a changed bank
  drops its cache. The document kinds' go-live is one module-private
  switch (`invalidateDocumentKind`): `emote` drops a resident
  `SoulCatalogue`'s cache, `recipe` re-warms a resident
  `RecipeCatalogue` (its reads are sync), `name-bank` clears
  `NameBank`'s cache, `blueprint` re-warms the `BlueprintCatalogue`,
  `command-view` reloads each changed view (`CommandApi.reload`) and
  invalidates each deleted one, `msh` needs nothing (scripts resolve by
  path per call). Settings re-warm `AppSettings`; subjects drop the
  resident subject/channel catalogues; the wiki needs nothing.
- `pack diff <packId> [<path>]` — the wiki three-body shape, three
  labeled sections: *baseline (as installed)* / *yours (database)* /
  *theirs (pack file)*, each with its hash. No machine merge. With no
  path, every open conflict. For a settings file *yours* renders the
  singleton's values for the file's keys; for a wiki page the live page.
- `pack resolve <packId> <path>` with **exactly one** mode:
  `--take-pack` (write the file's row, rebaseline, clear, re-hydrate);
  `--keep --pin` (keep the DB row AND claim it — pinned rows never
  compare again; **`--keep` without `--pin` does not exist** — keeping
  means claiming); `--export` (serialize the DB row back to the pack's
  **workspace** source file; the conflict stays open until the next
  `sync` observes file == DB, the converged cell, and clears it — the
  git round-trip). `--export` writes are workspace-only by construction;
  in a dist deployment the write fails loudly. A text kind exports its
  text verbatim — an `.msh` its source, a `.md` its frontmatter + body —
  not YAML.
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
design surface and remaining build waves: retiring `SeederManager`,
`GroupSeeder` and `ParcelSeeder` (the core decomposition — the
strangler-fig end-state); the `/domain/` path surgery that makes the
template kind fractal under any root and moves the localities (eternal,
terminus, the rest of the lounge) into packs (wave 4 — with it the
seven domain-local command views leave the disk fallback); `requires.kinds:`
(a pack declaring the document kinds it needs — wave 3); manifest
version machinery + cross-pack dependency validation (`dependsOn` on an
unknown id is ignored today, deliberately); the `staged` record status +
runtime install / uninstall / marketplace; third-party namespacing; and
the repo split. The one independent brand (`crowsfoot-gin`, carried by
no corpo) and the two demo bottles stay in `seeds/` until a later pass
decides their home.

## Key files

- `packages/content/base-library/` — the substrate pack (materials,
  biomes, quantity-units).
- `packages/content/species-and-names/` — the species/clade tree
  (`content/obj/species/**`) + the name banks (`content/name-banks/**`).
- `packages/content/arcane-descriptors/` — the descriptor banks.
- `packages/content/newbie-wilds/` — the frontier onboarding locality
  (`content/domain/newbie-wilds/**`).
- `packages/content/platform/` — pack zero's seed: `content/settings/`
  (43 sections by key prefix), `content/subjects/` (Help/Global/Chat),
  `content/blueprints/` (the curated overlay), `content/cmd/` (every
  engine verb's view, 24 categories).
- `packages/content/expression/` — the emote roster (`content/emotes/`).
- `packages/content/generic-objects/` — the recipe roster
  (`content/recipes/`).
- `packages/content/saxonberg-lounge/` — `content/msh/` (`root:
  /domain/lounge`).
- `packages/content/arcane-library/` — `content/obj/magic/**` (the
  spells + GlowlightOrb + SparkSource).
- `packages/content/wiki-starter/` — `content/wiki/<ns>/<slug>.md`.
- `packages/content/corpo-<key>/` × 5 — `content/obj/corpo/Corpo/<key>`
  + the corpo's `Brand/` rows.
- `mud/lib/document/DocumentKinds.ts` — the closed document-kind
  vocabulary (kind, natural key, dir, extension, vanish policy).
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
  (`planDomainRename` + `#migrateDomainToContent`), the collapse
  migration (`COLLAPSES` + `planCollapses` + `#collapseLegacyCollections`),
  the `script` → `msh` kind rename, the kind-scoped `documents` indexes,
  the `pack_installs` policy + index; `lib/persistence/Collections.ts` —
  the names; `lib/persistence/ResetPolicy.ts` — the declared kinds
  survive the night.
- `packages/server/scripts/check-test-content.ts` +
  `test-content-allowlist.txt` — `lint:test-content`, the shrinking
  allowlist of kernel tests that still name shipped content.
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
(waves 0+1 of the content-pack program — slate addenda A10/A17/A24/A25
in `docs/slates/builds/content-packs-slate.md`; the requirements and
plan retired at the sweep): the
`domain` → `content` rename with its idempotent boot migration; the
`pack_installs` record with body-beside-hash baselines; the three-way
reconcile with conflicts, pins, and the adoption bridge; per-pack failure
isolation; the flat-key check; the plan/apply split behind dry-run; the
`pack` verb suite; office-owned groups + the `pack-installers` committee
(`requiresWizard` left `pack`); and **newbie-wilds** as the fourth pack —
the first locality shipped as content.

`design/content-pack-wave-2` (2026-08-25) — **wave 2** (the requirements
and plan retired at the sweep): the `document` contribution kind over the
closed `DocumentKinds` vocabulary; the three legacy collections
(`emotes`, `recipes`, `name_banks`) collapsed into `documents` by a
one-time boot migration and adopted by natural key; the `settings`
(merge-missing), `subject` (archive-never-reap), `wiki` (CAS submit as
the pack) and `command-view` (store-first with a counted disk fallback
and the wizard code-naming gate) kinds; `BlueprintCatalogue.rebuild()`
with the curated overlay as documents; `AccessApi.canAtPath` as the
document store's gate; `lint:test-content`; `mud/cmd` moved into the
platform pack; ten new packs and seven seeders retired.
