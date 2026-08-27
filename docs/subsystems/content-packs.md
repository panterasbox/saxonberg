# Content packs

The **content-pack** substrate: foundational game content lives in
standalone, git-versioned packages of **pure data** (zero TypeScript),
and a single **installer** reconciles them into MongoDB at boot and on
demand. The pack files are the **source of truth**; the database is a
*derived install* of them. It replaced `SeederManager` outright (wave
3) — it gives content real version control (git, on the files) and a
clean deliverable boundary, decoupled from the kernel's release cycle.

**Sixteen packs ship today** (wave 3 of the content-pack program,
2026-08 — *pack zero, and the end of `core`*), and **every template row
in the world comes from one of them**: there is no seeder, no code
manifest, no `seeds/` tree. The table is in *§ The shipped packs*. The
short version: **platform** is pack zero — the controller templates, the
registries and catalogues, the marshallers, the closed vocabularies, the
Compact's institutions (`/compact/executive`, `/compact/press`), the
namespace roots and the landing shell (`/platform/location/void`), plus the
settings, the standing subjects, the curated blueprints and every engine
verb's command view — and **it alone is a bootable world** (the
platform-only e2e proves it every pipeline). Everything else `dependsOn`
it: the substrate packs (**base-library**, **species-and-names**,
**arcane-descriptors**, **arcane-library**, **generic-objects**), the
social packs (**expression**, **wiki-starter**), the five
**corpo-{aevex,goodkin,hollis,veshko,vionne}** (each now an
*organization* with its own chart), two localities
(**newbie-wilds**, **saxonberg-lounge**), and **world-seed** — the
TRANSITIONAL pack holding every locality row the retired `SeederManager`
used to insert, deleted piecewise as waves 4–5 home each locality.

A pack no longer only ships rows. Its manifest **declares what the rows
need** (*§ The requires phase*): the groups it needs to exist, the
**title** it claims over the extents it ships into (a pack's paths must
lie under a claim — its own or a host's — or the install refuses), who
**maintains** it (a group, or an organization — the executive holds the
platform; a corpo holds its own branch), and which of its rows are
**eager at boot** and why (*§ The boot union*). The seeders'
`config/groups.yaml` and `config/parcels.yaml` are gone: a group or a
title is declared by the pack whose content needs it.

**The DB is a cache of the packs.** Since the pack-installer build
(2026-08) the templates collection is named **`content`**,
and every install is **three-way** against a per-deployment install
record (`pack_installs`): a row the pack changed is updated, a row the
database changed is kept, a row both changed is a **conflict** —
reported, never merged. The `pack` verb is
gated on **title over `/compact/executive`** — the executive's own
staff (the Prime Minister and whoever the office appoints), never the
wizard axis; the wave-2 `pack-installers` committee folded into the
executive.

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
        ├── material/spirit/gin.yaml   →  template path /stuff/idea/material/spirit/gin
        └── biome/…
```

The `content/` root mirrors the template-path namespace: a file's path
relative to `content/`, minus `.yaml`, prefixed with `/`, **is** its
template path (`content/stuff/idea/material/spirit/gin.yaml` →
`/stuff/idea/material/spirit/gin`; `content/world/newbie-wilds/crossroads/hub.yaml`
→ `/world/newbie-wilds/crossroads/hub`; `content/corpo/aevex.yaml` →
`/corpo/aevex`; `content/home.yaml` → `/home`) — the rule the retired
`SeederManager` used. So the path is a pure namespace identifier,
decoupled from where the file physically sits, and moving a tree between
packs is a `git mv` (newbie-wilds out of `seeds/` was exactly that: 21
files, bytes and paths unchanged; wave 3's 439-file move of the engine's
own rows into the platform pack was the same act at scale).

The same rule names every row in the install record — the **record
key**: the content-root-relative path with a leading slash and no
extension. For the template kind that *is* the template path; for a
descriptor bank it is `/descriptor-banks/<key>`; for a document kind
`/<contentDir>/<name>` (`/emotes/grin`, `/msh/martini`,
`/name-banks/common`); for a settings section `/settings/<section>`; for
a subject `/subjects/<name>`; for a wiki page `/wiki/<ns>/<slug>`; for a
command view its document path (`/platform/cmd/perception/look`). One uniform
address for every kind (`pack diff <id> <path>`).

### The manifest — `pack.yaml`

```yaml
id: saxonberg-lounge      # the sourcePack stamp value; stable
version: 0.2.0            # reserved release label — nothing reads/enforces it
description: …
dependsOn: [platform, corpo-goodkin, corpo-vionne]   # ids that must install first; the HOSTS
root: /world/lounge      # the DOCUMENT root (optional; defaults to /<id>; must start with /)
maintainers: lounge       # a group name, { group: <name> } or { organization: </path> };
                          # default `<id>-maintainers`
requires:                 # what the rows need — see § The requires phase
  groups:
    - { name: lounge, purpose: the lounge team }
  title:
    - { extent: /stuff/idea/lounge,    holder: { group: lounge } }
    - { extent: /world/lounge, holder: { group: lounge } }
boot:                     # which rows are eager, and why — see § The boot union
  - { template: /world/lounge/terminal, role: producer, reason: "…" }
```

**The key set is closed** (`MANIFEST_KEYS` in `PackLogic`): `id`,
`version`, `description`, `dependsOn`, `root`, `requires`, `boot`,
`maintainers`. Any other key — a typo, a field from a future wave — is an
**error at read**, and so is an unknown key inside `requires`
(`groups` / `title` only) or inside a boot entry (`template` / `role` /
`reason` / `dependsOn`). A manifest that parses is a manifest the
installer understands in full.

`root:` is where the pack's **document-kind** rows land — every
`documents` row a pack ships has `path = root + recordKey` and `owner =
root` (`/expression/emotes/grin`, owned by `/expression`). It is the
pack's branch in the document tree; the template kind ignores it
(template paths are their own namespace). `saxonberg-lounge` declares
`root: /world/lounge` so its scripts land under the lounge's branch.

Still deliberately minimal about *rows*: the pack's kernel requirement
is **derived**, not declared (*requires-kernel* is the install-time
class-resolve check, below), and *owned paths* are recorded by the
`sourcePack` stamp at install time — the manifest never enumerates
paths. What it does enumerate is **extents** (`requires.title`), which
is a different thing: a claim is a title, and title is declared, never
inferred from a file tree.

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
is already wired (full missing-dependency validation is deferred;
`dependsOn` on an unknown id is ignored).

**`SAXONBERG_PACKS`** (D10) filters the discovered set: a comma-separated
list of ids (`SAXONBERG_PACKS=platform`), applied *after* ordering. A
pack it names that no shipped pack provides **throws at boot**; a pack
it omits is **ignored** — not installed, and (because `bootManifest`
reads the same filter) not booted, even when an earlier unfiltered boot
left its record behind. Unset or empty means every discovered pack.
`platform` always sorts first: every other pack `dependsOn` it.

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
- **`PackLogic`** (`mud/platform/idea/api/PackLogic.ts`, `/platform/idea/api/pack`,
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
| every `content/**/*.yaml` **outside the kind dirs below** | **domain** (the template kind) | reconciled into the `content` collection (stamped). Wave 3 widened the walk from the two enumerated roots (`obj/`, `domain/`) to *everything that is not another kind's directory*: a pack ships a row at the path its file mirrors, wherever in the tree that path lives — `content/corpo/aevex.yaml` → `/corpo/aevex`, `content/home.yaml` → `/home`, `content/wiki/main.yaml` → `/wiki/main` (the namespace ZONE rows; the wiki *pages* beside them are `.md`, a different extension, read by the wiki kind). The non-template dirs are **enumerated by kind** (`nonTemplateDirs()`: `settings`, `subjects`, `descriptor-banks`, `quantity`, and every yaml `DOCUMENT_KINDS` `contentDir`), never guessed. `cmd/` is skipped at **any** depth — a command view has no `class:` and is the command-view document kind |
| `content/quantity/quantity-tags.yaml` | **quantity** | loaded into the in-memory tag table via `QuantityApi.loadTagTables(path)` |
| `content/descriptor-banks/<key>.yaml` | **descriptor-banks** | reconciled into `descriptor_banks` (stamped), keyed on the basename = the item class; the appearance caches drop on change |
| `content/<contentDir>/<name>.<ext>` per **`DOCUMENT_KINDS`** — `emotes/*.yaml`, `recipes/*.yaml`, `name-banks/*.yaml`, `blueprints/*.yaml`, `msh/*.msh`, `cmd/**/*.yaml` (+ every template tree's own `<tree>/**/cmd/*.yaml` — `world/…/cmd/`, `trade/…/cmd/`) | **document** (one strategy per declared kind) | reconciled into `documents` (stamped) at `root + key` — the closed vocabulary in `lib/document/DocumentKinds.ts`; a `.yaml` file's object is `data`, an `.msh` file is `data: { source }`; a flat-key kind gets its natural key from the basename (a disagreeing file fails at `read`); per-kind read validation (what the retired seeders validated) |
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
per kind: `dbKeyQuery` — `{kind, path}`, or `{kind, 'data.<naturalKey>'}`
for a flat-key kind (its identity IS its natural key: a row with that key
at *any* path is this row, and one this pack did not stamp is refused) —
and a
**`stampedQuery`** `{kind}` — ⚠ load-bearing: `{sourcePack}` alone over
`documents` returns every kind the pack ships, and each kind would reap
the others' rows as its own vanished files. Baselines and conflicts
carry the label `document:<kind>` so `pack diff` output names it. The
preimage is `{ data }` only — `path`/`owner`/`kind`/`sourcePack` are
bookkeeping.

> **The template trees are `content/<root>/<branch>/…`** — `platform/`
> for the platform pack, `stuff/` for every other pack, `trade/<industry>/`
> for an industry — because a pack ships content and
> content is instanceable — nothing a pack installs may live under
> `/lib/`, which is substrate-only. This is a **breaking format change**
> the second segment is the Stuff branch the row's class descends from.
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
boardName}`) so the three-way compares like-for-like. ⚠ No `SubjectCatalogue.installSubject`: at boot the installer
runs *before* `BootstrapManager` clones the catalogues, so the rows are
written as Documents through `PersistApi` and the resident catalogues
are invalidated only on a live sync.

**Command views** (D8) are the `command-view` document kind at the view
key's document path — `content/platform/cmd/perception/look.yaml` →
`/platform/cmd/perception/look`, and a **content tree's own** views — a
locality's `content/world/<…>/cmd/<verb>.yaml` → `/world/<…>/cmd/<verb>`,
an industry's `content/trade/<industry>/cmd/<verb>.yaml` →
`/trade/<industry>/cmd/<verb>` — by **one rule** (wave 4a): a view key
whose first segment is not `cmd` and that carries a `cmd` segment is a
content-tree key at `/<key>`; `cmd/<rel>` is an engine key at
`/platform/cmd/<rel>`. The installer walks every top-level `content/` dir that is
not a kind dir for `cmd/` at any depth; no tree is special-cased (no
`root` join: the dispatcher's key is the same string, so
`CommandApi.reload(path)` finds it). Every view is
validated against the command schema at `read`. **There is no disk
fallback** (wave 3): once `CommandApi.preloadAll` has served the views
from a document store, the store is the *only* source and a miss is a
miss (`getCommand` returns null and says so). The wave-2 counted residue
(*N command view(s) still served from disk*) is gone with the last seven
domain-local views, which moved into `world-seed`. **Offline** — a unit
test, a stripped boot, anything with no store ever preloaded — the views
are read straight from the packs' own files (`PackApi.contentRoots()`,
cached; `cmd/<key>` for an engine key, `<key>` for a content-tree key —
the same rule: the same files the installer reads), so the kernel tests
keep working with zero seeding. The module-level `servedFromStore` flag
is what tells the two apart; `clearCache` resets it. A CMS save of a
view that changes its `controller:` or its validator set is **wizard
code trust** (`DocumentLogic`); a cosmetic edit goes live through
`CommandApi.reload` without a restart.

### The `sourcePack` stamp

Each installed row carries a **top-level `sourcePack` field** (a `content`
template, a `name_banks` bank — every stamped backend). On a template row
it is a sibling of `data` (`{path, class, hydratorClass, data, sourcePack}`).
It is **not** inside `data`, and the clone pipeline passes only
`template.data` to the Hydrator — so the stamp is structurally
unreachable by the instance (a `Material`/`Biome` never sees it). It is a
pure DB-row provenance marker, written directly by the installer through
the `PersistApi` chokepoint (`save` = `$set`-by-`_id` for update, or
insert), never via `TemplateApi.saveTemplate` (which has no slot for
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
  (never accumulated, so it cannot rot into a stored to-do). A `title`
  conflict (the claim's extent is held by somebody else) sits beside the
  row conflicts, its `dbHash`/`packHash` the two holders' descriptions.
- **`requires`**, **`boot`**, **`maintainers`** (wave 3) — the manifest's
  three declarations **as applied**: what the nightly `reprovision`
  re-grants, what `bootManifest` reads (`[]` on a failed pack — a pack
  that did not install boots nothing), and who a `pack.<id>` diagnostic
  routes to. The record is the deployment's memory of the manifest, so a
  pack that is no longer in the build (its record still here) still
  boots its rows and still has maintainers.

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
every time. A stamped row with **no baseline** (the requires phase's
own pre-written registries — see *The grants*) is normalized from what is
written, counted, and logged. A **file at a key with a row this pack did
not stamp** — another pack's, or nobody's — **fails the pack at
`reconcile`**: the packs are the only writer of these rows, so there is
nothing to adopt and nothing to clobber. A file at a key with no row is
inserted. With **no record** (a fresh database) every row is inserted and
its baseline is what was written; the second boot is a no-op — zero
changes, record hashes unchanged, no line.

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
static half of the requires phase (`gateRequires`, *§ The requires
phase*) runs under the same step name, and the topic gate (leaves under
a core root only; the platform pack is exempt because it *authors* the
root descriptors) runs next, in the same pre-write position.

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
region. It **writes rows only** —
`BootstrapManager` clones singletons *afterwards*, so nothing is live yet
and there is no re-hydrate at boot.

Ordering: `PersistenceManager.connect` (the indexes) →
`PackApi.install()` → `loadHooks` → `CommandApi.preloadAll` →
`BootstrapManager.run()` (the boot union, below) → the Api boots. The
install runs before `loadHooks` because everything — the DomainHook
template, the marshallers, the quantity table, the registries the
catalogues warm from — *is* the packs' content now; there is nothing
else that writes a row at boot. The boot line per pack reads
`PackApi: '<id>' installed — N inserted, … , requires: G group(s) (C
created), T title(s) (granted, kept, conflict)[, S row(s)
skipped (extent sold)], boot: A sync-read + B producer, staffed|UNSTAFFED`
— the second boot of a settled deployment is all zeros on every pack.

### Runtime — the `pack` verb

`platform/idea/cmd/author/PackController.ts` + the platform pack's
`content/platform/cmd/author/pack.yaml` (declarative `subcommands:` + `options:`;
afforded on `AuthorMixin`'s operator surface, **authorized by
`requiresPackInstaller`** — `AccessApi.canAtPath(giver, 'install',
'/compact/executive')`, title over the executive, never the wizard axis;
see below):

- `pack status [<packId>]` — joins the discovered manifests with the
  records: status, version, applied-at/by, failure, **the maintainers
  line** (`maintainers: <group|organization> — staffed` /
  `UNSTAFFED — routes to the executive`), any **title conflict** (an
  extent the pack claims that somebody else holds), every open conflict
  with its next command, and the pin line — always, even at zero. A pack
  with a record but not in this build is headed `(NOT in this build)`.
  After the packs, one line for the **orphans** (D9): `N template row(s)
  under no pack: …` — every `content` row with no `sourcePack` stamp,
  listed, never deleted (`PackApi.orphans`).
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
- `pack provision <packId>` — the pack's requirements **as the
  registries hold them now**: the maintainers and their members, each
  declared group's member count, and each claimed extent with its
  current holder and an outcome — `held` (the claim's holder), `unheld`
  (no parcel at exactly that extent, or nobody holds it), `conflict`
  (somebody else). The read-side twin of the requires phase.
- `pack resolve <packId> <path>` with **exactly one** mode:
  `--take-pack` (write the file's row, rebaseline, clear, re-hydrate);
  `--keep --pin` (keep the DB row AND claim it — pinned rows never
  compare again; **`--keep` without `--pin` does not exist** — keeping
  means claiming); `--export` (serialize the DB row back to the pack's
  **workspace** source file; the conflict stays open until the next
  `sync` observes file == DB, the converged cell, and clears it — the
  git round-trip). A `sync` of an **unstaffed** pack ends with the
  staffing prompt (D7): *This pack has no maintainers. You, or who?* —
  `PromptApi.text`, enter for yourself, a name for somebody else, decline
  and it stays unstaffed (and `status` says so). `PackApi.staff` adds the
  member to the maintainers **group**; an organization-maintained pack
  refuses (*appoint through the organization, not the pack*). `--export` writes are workspace-only by construction;
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

### Who may run it — the executive

Installing content is the executive's work. The platform pack is
maintained by the **organization** `/compact/executive` (its own row,
booted as a `producer`), and `requiresPackInstaller`
(`lib/command/validators/`) gates the verb on
`AccessApi.canAtPath(giver, 'install', '/compact/executive')` — the
ordinary title walk: an organization-held extent admits whoever holds a
position in the organization (`EmploymentApi.holdsPosition`) or heads it
(`holdsAuthority` — the Prime Minister, founder default included; see
[access.md](./access.md)). So the founder installs as head of the
executive with **no group membership at all**, and the PM staffs the
office with the ordinary `appoint`; handing the seat hands the platform
with no data migration. No `isWizard` anywhere in the pack path (the
code-trust axis is the wrong axis — a **wizard who holds no position in
the executive is refused**); a non-holder gets a diegetic decline; a
non-resident organization fails closed with one diagnostic.

**A live `sync` also checks the claims.** Bootstrap is exempt from the
*precondition* (who may claim), never from the checks; a person syncing
a pack must hold `write-template` title over every extent the pack
claims (`canAtPath`), or the sync fails at `requires-kernel` naming the
extent.

## The requires phase

A pack's rows need three things the rows themselves cannot say: the
**groups** its content names, **title** over the extents it ships into
(so somebody can edit, broadcast over, teleport within, and clone under
them — with `core` gone an untitled path is a path *nobody* can act on:
`ParcelApi.ownerOf` answers `null` and every `can` there fails closed),
and a **maintainer** to route its diagnostics to. The manifest declares
them; the installer provisions them, adopt-by-name throughout.

### The declarations

- **`requires.groups[]`** — `{ name, purpose, owner?: { office },
  members?: [{ id, role? }] }`. `purpose` is mandatory prose (the group's
  reason to exist, shown nowhere yet, refused when blank). `owner`
  names the office whose holder owns the group (the platform's `soul`
  committee is `{ office: prime-minister }`); absent, the group is
  system-owned. `members` may **only enrol NPC rows the pack itself
  ships**, under an extent the pack itself claims, in a group the pack
  itself declares — the NPC-only membership fence (a pack can never
  enrol a player, nor reach into another pack's staff). `world-seed`
  enrols Katie in `duncan-hall`.
- **`requires.title[]`** — `{ extent, holder?, landUse?, areaM2?,
  parentParcel? }` — a `TitleClaim`. `holder` is `{ group: <name> }` or
  `{ organization: </path> }`; **absent, the maintainers hold it** (the
  corpo packs claim `/corpo/<key>` for the corpo organization by
  default). `landUse` must be one of the closed land uses; `areaM2`
  positive; `parentParcel` an absolute path (the Hinkley Hills lot under
  its estate). **There is no implicit root claim**: every claim is an
  explicit entry — the platform's own extents are nine explicit lines
  (`/platform`, `/stuff`, `/blueprints`, `/compact`, `/studio`,
  `/home`, `/world`, and `/wiki` for `wiki-editors`), and two packs may
  name the same extent for the same holder (`world-seed` and
  `saxonberg-lounge` both claim `/world/lounge` for `lounge`: the
  second is `kept`).
- **`maintainers`** — a group name, `{ group }` or `{ organization }`;
  default **`<id>-maintainers`**, a group the installer mints
  **PM-owned** (`{ office: prime-minister }`) with zero members —
  UNSTAFFED until somebody staffs it.

### The gate (static, before any write)

`gateRequires` runs at `gatePack` under the `requires-kernel` step, over
the whole install set:

1. a `{ group }` holder is declared under `requires.groups` by this pack
   **or a host** (a transitive `dependsOn` pack); `expression` claims
   `/expression` for `soul`, which the platform declares;
2. an `{ organization }` holder or maintainer is a **row this pack or a
   host ships** (`/compact/executive` is the platform's row;
   `/corpo/aevex` is corpo-aevex's own);
3. the NPC-only membership fence (above);
4. **coverage** — every path the pack ships under one of the **nine
   title roots** (`TITLE_ROOTS` in `lib/paths.ts` — ONE list, read by
   the installer and by `lint:untitled`: `/obj`, `/world`, `/cmd`,
   `/compact`, `/studio`, `/wiki`, `/home`, `/corpo`, `/trade` —
   template paths, document paths and wiki pages alike) lies under a
   claim of the pack **or a host**. `/trade/<industry>` (wave 4a) is an
   industry pack's root: what the trade **introduces** — its stations
   and stock under `/trade/<industry>/<branch>/`, its controllers under
   `…/command/`, its recipes at `/trade/<industry>/recipes/<id>` (the
   document root is the pack root), its verbs at `/trade/<industry>/cmd/`
   (reserved; none ship yet); `lint:instanceable`'s invariant 7 keeps
   an instanceable row under the industry's `obj/` or `command/`
   segment. What a trade merely *uses* (fire stations, a cut of meat) is
   commons under `/obj`; where it is *practised* (the smithy) is a venue
   under `/world/`. `base-library`'s rows under `/obj` ride the platform's `/obj`
   claim; `generic-objects` claims its seventeen `/stuff/<branch>/<cluster>`
   branches itself; `wiki-starter`'s pages ride `/wiki`. A pack's own
   document root *outside* the title roots (`/expression`,
   `/generic-objects`) is the pack's to claim or not. A pack whose whole
   host chain claims **nothing** is pre-wave-3 shaped and passes
   **vacuously** — `pnpm lint:untitled` is the static gate that keeps
   the shipped set at zero untitled paths.

### The grants (before planning)

`applyRequires` runs **first** in `reconcilePack` — before the planner —
so a title this claim grants is in place before the bounded
reconcile asks who holds each row's extent:

1. **Groups** — the maintainers group first (PM-owned), then each
   declared group, through `GroupApi.ensureGroup(name, owner)`:
   **adopt-by-name** — an existing group is found and **never
   re-owned**; a missing one is created (`groupsFound` / `groupsCreated`).
2. **Memberships** — `GroupApi.ensureMember(ref, id, role)` (gated to
   `PackLogic`; idempotent; `membersAdded`).
3. **Titles** — `ParcelApi.grant(claim)` (`ParcelRegistry.grant`, the
   installer's title seam), one of three outcomes: **`granted`** (absent
   → the row + a `grant` event), **`kept`** (present under the same
   holder — no write, no event), or **`conflict`** (present under a
   different holder — *whoever* that is — no write; a `title` conflict
   on the record and a `title conflict:` line in `status`). There is no
   migration outcome and no migration code anywhere in the boot: a
   database that predates a rename is **dropped**
   ([deployment.md § The Mongo environment policy](../deployment.md)).

Then the rows are planned and written, and `finishRequires` runs after
them: the organizations the manifest names are **stood up resident**
(`StuffApi.singleton` mints-if-absent — the requires phase runs after
the rows are written and before `BootstrapManager` clones the boot
union, so `/compact/executive` is a row but not yet a Stuff, and an
organization-held title needs a resident organization to answer
`holdsPosition`); the record takes `requires` / `boot` / `maintainers`;
the boot line takes the role counts and the **staffed** bit.

**Staffed** means somebody actually holds the maintainer: a group with
at least one member, or an organization with at least one filled
*position* — **the head alone does not count**; an office with no staff
is unstaffed (the platform boots `UNSTAFFED` on a fresh world until the
PM appoints someone).

### The bounded reconcile — `skip-sold`

Title can move after a pack installs — the executive sells a branch, a
locality changes hands. The three-way reconcile is **bounded by title**
(CPS:308): `soldPredicateFor(pack)` computes the pack's **holder set**
(its maintainers, its own claims' holders, and its hosts' — the whole
`dependsOn` chain), and a domain row whose covering parcel is held by
nobody in that set was *sold out from under the pack*: the planner
emits **`skip-sold`** for it — skipped and counted (`skippedSold`, the
boot line's `N row(s) skipped (extent sold)`), **never written**, never
deleted. No resident registry → unbounded (a unit test).

### Staffing and routing

- **`pack.<id>` diagnostics** (a conflict, a sale, a failure) route to
  the pack's maintainers: a staffed group's members (`GroupApi.membersOf`),
  or a staffed organization's committee — else, unstaffed, to **the
  executive's committee** (`CompactApi.committeeMembersOf('/compact/executive')`).
  `DiagnosticLogic.packRecipients` reads `PackApi.maintainersOf`, which
  answers from the record (or the manifest, pre-install) with the
  `staffed` bit and the executive as the declared `fallback`. The
  `errors` list shows a pack's channel to whoever maintains that pack —
  no author tier.
- **`pack status`** prints the staffing line per pack; **`pack sync`**
  prompts to staff (above); `PackApi.staff` is the one write.

### Orphans

`PackApi.orphans()` — every `content` row **with no `sourcePack`
stamp**, sorted: seed inventory nobody claims, a CMS-authored template,
a row from a pack no longer in the build whose record was lost. Listed
by `pack status` (D9), **never deleted** — a row is somebody's until
somebody says otherwise.

### The nightly reprovision

`RecordApi.wipe` (the nightly reset, [record-layer.md](./record-layer.md))
takes `groups` and `parcels` with the rest; what re-seeds them is
**`PackApi.reprovision()`** — for every `applied` record, the same
`applyRequiresFor` over the record's stored `requires` + `maintainers`
as `bootstrap` (groups re-minted, titles re-granted or kept, one line
each). The seeders' boot-only mint is gone; the record is the memory.

## The boot union

What is eager at boot is declared by **the pack that ships the row**.
Each manifest's **`boot[]`** entry is `{ template, role, reason,
dependsOn? }`: `template` an absolute template path the pack ships;
`role` **`sync-read`** (a registry or catalogue some Api reads
synchronously — it must be resident before the first read) or
**`producer`** (a row whose `postRegister` *produces* something — warms
a cache, installs a stair, rebuilds a floor — or that nothing else would
ever instantiate: `/platform/location/void`, the TPA network's eager root);
`reason` mandatory prose (refused when blank — the manifest is where the
*why* lives, next to the row, readable in `git blame`); `dependsOn`
other boot templates that must clone first (`/platform/idea/ChannelCatalogue`
after `/platform/idea/SubjectCatalogue`, `/platform/idea/PressBoard` after both
organizations).

`BootstrapManager.run()` with no argument reads **`PackApi.bootManifest()`**:
the union of every **applied** record's `boot[]`, in install order
(shipped packs in topo order; under `SAXONBERG_PACKS` only the filtered
packs — a filtered-out pack's record is ignored, not carried forward;
unfiltered, a recorded-but-no-longer-shipped pack boots last, sorted).
A template two packs both list is an **error naming both** — one row,
one declarer. The code manifest (`mud/bootstrap.ts`) is **gone**; the
manager owns only the `BootstrapEntry` shape (`templatePathPrefix` /
`awaitInit` stay code-only and no YAML exposes them). A singleton
already resident when the union runs (a lazy `StuffApi.singleton` mint
earlier in the boot — the installer standing an organization up) is
**reused**, never cloned twice.

The platform declares the registries and catalogues (`/platform/idea/EventRegistry`
first — every emit resolves it; `/platform/idea/AccessRegistry`,
`/platform/idea/ParcelRegistry` after `/platform/idea/GroupRegistry`; the scheduler chain
under `/platform/idea/WorldClockRegistry`), the two organizations
(`/compact/executive`, `/compact/press`), `/platform/idea/PressBoard` and
`/platform/location/void`; each corpo pack its own organization; `world-seed` the
four locality producers (`/world/lounge/terminal`, the Duncan Hall
dorm-warren, the Hinkley Hills plat-book and lot-holder). `pnpm
lint:instanceable` checks each entry names a real row.

## Pack zero — the platform-only boot

**`SAXONBERG_PACKS=platform` is a bootable world**, and it is checked
every pipeline: `e2e/playwright.platform.config.ts` boots the server
with that filter on its own ports (2011 / 5174, stdout captured to a
log), and `tests-platform/platform-only.spec.ts` proves the founder — as
head of the executive, a member of no group — logs in and lands in the
shell room (`/platform/location/void`, the code fallback when no pack contributed
`defaultStartLocation`: that setting moved out of the platform into
`saxonberg-lounge`), that `pack status` knows exactly one pack **in this
build**, and that the boot logged no `error` / `failed` line. The config
mints its own founder handle (`e2e-platform-founder`, purged by
teardown) because a character minted under the full-pack world carries
a species the platform does not ship. CI runs it **first** against the
fresh `saxonberg_e2e`, then the main suite — same database, sequential
(the four-database rule, [deployment.md](../deployment.md)). Root
`pnpm test:e2e:platform`; `e2e` `pnpm test:platform`.

One more CI gate keeps the wave's invariant: **`pnpm lint:untitled`**
(every path the packs ship under a title root has a claim as a prefix —
the installer's walk mirrored in a script; zero is green).

## The shipped packs

| Pack | `dependsOn` | Maintainers | Claims (`requires.title`) | Groups | `boot` |
|---|---|---|---|---|---|
| **platform** | — | organization `/compact/executive` | `/platform`, `/stuff`, `/blueprints`, `/compact`, `/studio`, `/home`, `/world`; `/wiki` → group `wiki-editors` | `wiki-editors`; `soul` (PM-owned — the soul committee) | 31 entries: the registries + catalogues (sync-read), the two organizations, `/platform/idea/PressBoard`, `/platform/location/void`, `/platform/idea/BlueprintCatalogue`, `/platform/idea/HelpCatalogue`, `/platform/idea/AddressRegistry` (producer) |
| **base-library** | platform | `base-library-maintainers` (default) | — (rides `/obj`) | — | — |
| **species-and-names** | platform | default | — (rides `/obj`) | — | — |
| **arcane-descriptors** | platform | default | — | — | — |
| **arcane-library** | platform | default | — (rides `/obj`) | — | — |
| **generic-objects** | platform | default | seventeen `/stuff/<branch>/<cluster>` branches: `items`, `arms`, `armor`, `clothes`, `gear`, `vessel`, `fixture`, `instrument`, `traps`, `pot`, `plant`, `seed`, `crop`, `bed`, `surface`, `exits`, `room` (wave 4a: the hearthworks commons — cuts, roots, rations, hide, logs — moved into `/stuff/thing/items`; the recipes no trade claims stay) | — | — |
| **trade-smithing** | platform, generic-objects | default | `/trade/smithing` → group `smithing` (PM-owned) | `smithing` | — |
| **trade-hearth-cooking** | platform, generic-objects | default | `/trade/hearth-cooking` → group `hearth-cooking` (PM-owned) | `hearth-cooking` | — |
| **expression** | platform | group `soul` | `/expression` → group `soul` | — | — |
| **wiki-starter** | platform | default | — (rides `/wiki`) | — | — |
| **corpo-{aevex,goodkin,hollis,veshko,vionne}** | platform | organization `/corpo/<key>` | `/corpo/<key>` (holder = maintainers) | — | `/corpo/<key>` (producer) |
| **newbie-wilds** | platform | default | `/world/newbie-wilds` → group `newbie-wilds` | `newbie-wilds` | — |
| **saxonberg-lounge** | platform, corpo-goodkin, corpo-vionne | group `lounge` | `/stuff/idea/lounge`, `/world/lounge` → group `lounge` | `lounge` | `/world/lounge/terminal` is world-seed's for now |
| **world-seed** (TRANSITIONAL — the hearthworks VENUE only since wave 4a; its trade rows are the two trade packs') | platform, saxonberg-lounge, corpo-goodkin, corpo-vionne | default | `/world/lounge` → `lounge` (kept); the four Terminus parcels → `terminus` (`terminal`, `counting-houses`, `general-store`, `registry`, with land uses); `/world/terminus/hinkley-hills` + `lots/lot-1` → `hinkley-hills`; `/world/eternal/duncan-hall` + `dorms` → `duncan-hall` | `duncan-hall` (enrols Katie), `hinkley-hills`, `terminus`, `lounge` | `/world/lounge/terminal`, the dorm-warren, the plat-book, the lot-holder (producer) |

Eighteen. The corpo packs became **organizations** in wave 3: each ships
`content/corpo/<key>.yaml` (its chart — authority the PM office, because
a chart whose authority is *the committee over `/corpo/<key>`* recurses
once the organization holds that very title) beside its mark and
brands, and the wave-2 board *groups* are the retired holders `grant`
migrates from. `world-seed` exists so the seeders could be deleted
without the localities sitting in the platform under a false owner; it
is deleted piecewise as waves 4–5 home eternal, terminus, the rest of
the lounge, hearthworks, moor, practicum, substation and common.

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
`/stuff/idea/material/spirit/gin` breaks every pointer.

## Deferred

The slate (`docs/slates/builds/content-packs-slate.md`) holds the full
design surface and remaining build waves: wave 4b — the room archetypes,
hospitality, and the **venue packs** (homing the localities out of
`world-seed`: eternal, terminus, the rest of the lounge, the hearthworks
venue, moor, practicum, substation, common), hearth-cooking's second pass
(`fine-roast`, `hearty-stew`), and the
`AppSettingFallbacks` code default for `defaultStartLocation`;
`requires.kinds:` (a pack declaring the document kinds it needs);
manifest version machinery + cross-pack dependency validation
(`dependsOn` on an unknown id is ignored today, deliberately); the
`staged` record status + runtime install / uninstall / marketplace;
third-party namespacing; and the repo split. `generic-objects` is the
junk drawer — expected to slim as trade packs take their objects.

## Key files

- `packages/content/platform/` — pack zero: `content/platform/<branch>/` (the
  controllers, registries, catalogues, marshallers, vocabularies, the
  Avatar seed), `content/compact/` (the executive, the press),
  `content/platform/location/void.yaml`, the namespace roots (`home.yaml`,
  `studio.yaml`, `wiki.yaml`, `content/wiki/*.yaml`), `content/settings/`,
  `content/subjects/`, `content/blueprints/`, `content/platform/cmd/` (every
  engine verb's view).
- `packages/content/base-library/` — materials, biomes, quantity-units.
- `packages/content/species-and-names/` — the species/clade tree
  (`content/stuff/idea/species/**`) + the name banks (`content/name-banks/**`).
- `packages/content/arcane-descriptors/` — the descriptor banks.
- `packages/content/arcane-library/` — `content/stuff/idea/magic/**`.
- `packages/content/generic-objects/` — the object clusters under
  `content/stuff/<branch>/<cluster>/`, the loose objects, the recipes no trade
  claims (`daiquiri`, `martini`, `fine-roast`, `hearty-stew`).
- `packages/content/trade-smithing/` — `root: /trade/smithing`:
  `content/trade/smithing/thing/` (anvil, whetstone, workbench, the ingots — a template row sits at the path its FILE mirrors; only documents derive from `root`) +
  `content/recipes/` (fire-poker, smiths-hammer, belt-knife, cook-pot,
  leather-jerkin).
- `packages/content/trade-hearth-cooking/` — `root: /trade/hearth-cooking`:
  `content/recipes/` (toasted-ration, root-mash).
- `packages/content/expression/` — the emote roster (`content/emotes/`).
- `packages/content/wiki-starter/` — `content/wiki/<ns>/<slug>.md`.
- `packages/content/corpo-<key>/` × 5 — `content/corpo/<key>.yaml` (the
  organization) + `content/stuff/idea/corpo/**` (mark + brands).
- `packages/content/newbie-wilds/` — `content/world/newbie-wilds/**`.
- `packages/content/saxonberg-lounge/` — `content/stuff/{thing,idea}/lounge/**`,
  `content/msh/`, `content/settings/lounge.yaml` (`root: /world/lounge`).
- `packages/content/world-seed/` — every remaining locality row under
  `content/world/**` (the hearthworks VENUE — rooms, business, NPCs,
  menus, the pantry — whose `populates:` name the trade packs' and
  commons rows), including the seven domain-local command views
  (`content/world/<…>/cmd/`) and their controllers.
- `mud/lib/paths.ts` — `TITLE_ROOTS` (the nine) + `NON_TEMPLATE_DIRS`
  (enumerated from `DOCUMENT_KINDS`), the one list the installer,
  `CommandLogic`'s offline reader, `lint:untitled` and
  `lint:instanceable` share.
- `mud/lib/document/DocumentKinds.ts` — the closed document-kind
  vocabulary (kind, natural key, dir, extension, vanish policy).
- `mud/api/pack.ts` — `PackApi` + the manifest / result / record /
  conflict / report types.
- `mud/platform/idea/api/PackLogic.ts` — discovery, the per-kind `KindStrategy`
  table, the pure planner + the applier, the record, the three-way
  machine, the flat-key check, `requires-kernel`, the ops surface, the
  re-hydrate tail.
- `mud/platform/idea/cmd/author/PackController.ts` + the platform pack's
  `content/platform/cmd/author/pack.yaml` — the `pack` verb suite;
  `lib/command/validators/requiresPackInstaller.ts` — its gate (title
  over `/compact/executive`).
- `mud/platform/idea/ParcelRegistry.ts` — `grant` (the three outcomes);
  `mud/api/group.ts` — `ensureGroup` /
  `ensureMember`.
- `backend/BootstrapManager.ts` — `run()` over `PackApi.bootManifest()`.
- `mud/platform/idea/api/CommandLogic.ts` — the store-only rule (`servedFromStore`)
  + the offline read over `PackApi.contentRoots()`.
- `mud/platform/idea/api/DiagnosticLogic.ts` — `packRecipients`, the maintainer
  routing.
- `packages/server/scripts/check-untitled-paths.ts` — `lint:untitled`.
- `e2e/playwright.platform.config.ts` +
  `e2e/tests-platform/platform-only.spec.ts` — the platform-only boot.
- `backend/PersistenceManager.ts` — the kind-scoped `documents` indexes,
  the `pack_installs` policy + index; `lib/persistence/Collections.ts` —
  the names; `lib/persistence/ResetPolicy.ts` — the declared kinds
  survive the night.
- `packages/server/scripts/check-test-content.ts` +
  `test-content-allowlist.txt` — `lint:test-content`, the shrinking
  allowlist of kernel tests that still name shipped content.
- `backend/AppBootstrap.ts` — the boot install pass + the per-pack boot
  line.
- `mud/platform/idea/api/QuantityLogic.ts` — the quantity-kind loader; its no-arg
  default lazily resolves the pack copy (test-only fallback; production
  always passes the path).

## History

Built on `feature/content-packs-build` (the content-packs v1 slice).
First substrate where canonical game content lives outside `packages/server`
as a versioned deliverable.

`feature/species-and-names-pack` (2026-06-29) added the second pack,
**species-and-names** — the `Species`/`Clade` tree + the char-gen name
banks moved out of the kernel seed tree / `NameBankSeeder` — and with
it the third content kind, **name-banks** (the first side-collection
kind).

`design/pack-installer` (2026-08-25) — the **pack-installer substrate**
(waves 0+1 of the content-pack program — slate addenda A10/A17/A24/A25
in `docs/slates/builds/content-packs-slate.md`; the requirements and
plan retired at the sweep): the
`domain` → `content` rename; the
`pack_installs` record with body-beside-hash baselines; the three-way
reconcile with conflicts and pins; per-pack failure
isolation; the flat-key check; the plan/apply split behind dry-run; the
`pack` verb suite; office-owned groups + the `pack-installers` committee
(`requiresWizard` left `pack`); and **newbie-wilds** as the fourth pack —
the first locality shipped as content.

`design/content-pack-wave-2` (2026-08-25) — **wave 2** (the requirements
and plan retired at the sweep): the `document` contribution kind over the
closed `DocumentKinds` vocabulary; the three per-kind collections
(`emotes`, `recipes`, `name_banks`) folded into `documents`; the `settings`
(merge-missing), `subject` (archive-never-reap), `wiki` (CAS submit as
the pack) and `command-view` (store-first with a counted disk fallback
and the wizard code-naming gate) kinds; `BlueprintCatalogue.rebuild()`
with the curated overlay as documents; `AccessApi.canAtPath` as the
document store's gate; `lint:test-content`; `mud/cmd` moved into the
platform pack; ten new packs and seven seeders retired.

`design/content-pack-wave-3` (2026-08-26) — **wave 3: pack zero, and the
end of `core`** (the requirements and plan retire at the sweep): the
manifest's `requires:` / `boot:` / `maintainers:`; the requires phase
(`GroupApi.ensureGroup` / `ensureMember`, `ParcelApi.grant` with its
four outcomes, the covered-extent rule, the bounded `skip-sold`
reconcile, staffing + maintainer routing, orphans, the nightly
`reprovision`); the boot union over every applied pack's `boot[]` (the
code manifest deleted); the `organization` parcel-owner kind (an
organization-held title admits its staff and its head); `core` deleted
— `ownerOf` nullable, every `can` fails closed on untitled, the author
tier / `:admin` / `requiresCoreAccess` / `pack-installers` gone, title
over `/compact/executive` gating `pack`; the template walk widened to
every non-kind `content/**/*.yaml`; `SeederManager` / `GroupSeeder` /
`ParcelSeeder` / `config/groups.yaml` / `config/parcels.yaml` / `seeds/`
deleted, 439 engine rows moved into the platform pack and the locality
rows into `world-seed`; no disk fallback for command views;
`SAXONBERG_PACKS`; the platform-only e2e; `lint:core-gone` +
`lint:untitled`.

**Wave 4a (2026-08-27) — the path surgery.** `/world/` → `/world/`
everywhere (content, `src/mud/world/`, tests, e2e, docs) with **no
migration** — the database is dropped; the `/trade/`
title root (nine; ONE `TITLE_ROOTS` in `lib/paths.ts`) and the
industry-pack shape (`/trade/<industry>/{obj,command,recipes,cmd}`,
`lint:instanceable` invariant 7); the hearthworks re-cut into
`trade-smithing` + `trade-hearth-cooking` (the trades own what they
introduce, the commons into `/stuff/thing/items`, the venue stays in
`world-seed`) — eighteen packs; the view-key rule generalised to every
template tree; wave 3's `migrated` grant outcome and both migration
branches deleted. **And the junk sweep:** every one-time boot migration
(`domain`→`content`, group owners, `script`→`msh`, the collection
collapse), the `developers`→`wizards` rename, the `adopt` reconcile cell +
`adoptQuery` + the adoption bridge, the migration scripts, `lint:core-gone`
— deleted. This game has never held data a boot of the same checkout did
not write; nothing is migrated, ever.

**The path pattern (2026-08-28, on the wave-4a branch).** `/platform/… + /stuff/` is
gone. Every template path and every engine source file follows
`<root>/<branch>/…`: the root is the pack's (`/platform` for the
platform pack, `/stuff` — the commons — for every other pack,
`/trade/<industry>` for an industry), the branch is the Stuff branch the
class descends from (`thing` · `idea` · `agent` · `location`). Source
mirrors it: `src/mud/platform/` → `src/mud/platform/<branch>/`. `command` is
`cmd` everywhere: a controller is `<root>/idea/cmd/<category>/<Name>Controller`,
its view the document `<root>/cmd/<category>/<verb>` (`/cmd` is no longer a
root; the engine's 195 views live at `/platform/cmd/…` and their keys are
their paths, `platform/cmd/perception/look.yaml`). ONE walk rule: a `cmd`
dir holds views unless its parent is `idea`. `TITLE_ROOTS` is
`/platform /stuff /world /compact /studio /wiki /home /corpo /trade`;
`lint:instanceable` invariant 7 checks the branch segment under every
rooted tree. Rosters that ship from two roots (Locality, Government)
scan `TemplatePathRosters`. Not applied inside `/world/<locality>` rows
(a place's rooms stay `/world/<locality>/<room>`) — only their
controllers moved to `<locality>/idea/cmd/`.
