# Content packs, wave 2 (2a + 2b) — requirements

The second build of the content-pack program, cut **big**: everything
addendum 24 assigns to waves 2a and 2b, in one branch, one MR. The
installer substrate shipped in MR !198 (the `content` collection, the
`pack_installs` record, the three-way reconcile, the `pack` verb, four
packs). This wave gives the installer its **plain and dispatch-adjacent
contribution kinds** — documents, settings, subjects, command views,
wiki pages — collapses the one-off collections into the document
store, repoints the document store's write gate onto the parcel
registry, and **retires seven seeders** as their kinds land. Six packs
are cut out of `packages/server`: `platform` (the seed of pack zero),
`expression`, `arcane-library`, `corpo`, `wiki-starter`,
`generic-objects` (recipes only this wave), plus an early
`saxonberg-lounge` holding its scripts.

Seeding slates: `docs/slates/builds/content-packs-slate.md` (Part 9;
addenda 2, 8, 10, 14, 16, 18, 22, 24, 26, 27) and
`docs/slates/builds/content-pack-units.md` (Parts A–C). Baseline:
`docs/subsystems/content-packs.md` as merged at `e1509dfd`.

> **The one-context constraint.** The build runs in a single fresh
> context with no compaction. The **Build sequence** section is
> therefore normative, not advisory: every step leaves the tree green
> (`tsc`, the near tests, the lint family), every step is a commit, and
> a build agent may stop at any boundary and hand the MR over with the
> remaining steps listed as not-done. Steps are ordered so the
> highest-value, lowest-risk work lands first and each seeder
> retirement is independently revertable (strangler, never big-bang).

## Goals

- **The `document` contribution kind** exists on the `KindStrategy`
  slot: a pack ships path-keyed JSON/YAML artifacts (one file = one
  reviewable artifact) that reconcile three-way into the `documents`
  collection, with a **closed, platform-declared kind vocabulary**
  whose per-kind index specs the persistence layer creates.
- **The doc-store collapse.** `emotes`, `recipes`, `name_banks`, and
  the *curated* half of `blueprints` become document kinds; their
  collections are migrated once at boot and **dropped**; their
  catalogues read `documents` by kind. The derived blueprint skeleton
  stays a rebuildable cache in `blueprints`.
- **Emote aliases are dead** as dispatchable verbs; alias words survive
  as catalogue search terms.
- **The document store's write gate resolves through `ParcelApi`**, a
  path-shaped sibling of `AccessApi.can`; the zone/`core` fallback is
  deleted from its third and last place.
- **The `subject` kind**: one file → a Subject plus its board and/or
  channel, à la carte; social surfaces are content; organizers whose
  file vanishes are archived, never reaped.
- **The `settings` kind**: a pack ships settings defaults; the kind's
  policy is merge-missing and a pack cannot strengthen it.
- **The `command-view` kind on the strangler**: verb views become
  installable, title-governed content; `CommandLogic` reads the store
  first and falls back to disk, reporting the fallback count every
  boot.
- **The `wiki` kind**: pages ship as markdown; the installer *submits
  an edit* with the base rev held in the install record; a mismatch is
  a three-body pack conflict, never a merge.
- **Seven seeders retire**, each as its kind lands, each deletion its
  own commit: Emote, Recipe, Blueprint (dissolves into catalogue
  rebuild + curated pack files), Script, Channel, AppSettings, Wiki.
  Their `config/*.yaml` aggregates and the seed dirs they read are
  deleted — the file-per-artifact breakup rides the migration.
- **Six packs** exist under `packages/content/`, cut as `git mv`s
  wherever the rows already exist as files, with the installer's
  adopt-in-place bridge covering every existing dev DB.
- **`lint:test-content`** exists, warn-only, with a shrinking allowlist
  and its first four shrinks done; `packages/content/**` is not
  "source" for the full-suite rule.

## Non-goals

- **Pack zero via bootstrap, the boot manifest, `requires:`
  (groups / title / offices / kinds), staffing-at-install, the Group
  and Parcel seeders, deleting `SeederManager`** — wave 3. The
  `platform` pack this wave is installed by the ordinary installer and
  is *not yet* pack zero; the remaining ~216 controller templates and
  ~37 registries stay in `mud/seeds/` and `mud/bootstrap.ts`.
- **Pack-declared document kinds** (`requires.kinds:`) — wave 3. Kinds
  are declared in code this wave (decided below).
- **The `/domain/` → `/world/` and `/trade/` renames, the hearthworks
  re-cut, trade packs, archetypes, position defs, the remaining
  `generic-objects` templates, the full `saxonberg-lounge` and
  `eternal-university` packs** — wave 4. Consequently the command-view
  disk fallback does **not** reach zero this wave (eternal's and
  terminus's domain-local verbs stay on disk until their packs exist);
  reaching zero is wave 4's exit criterion, reported here.
- **The authorable-composition bridge** — its own short design after
  this wave (decided: out; mechanics unsettled).
- **The media kind, the source-tree write-path consult, the repo
  split, third-party namespacing, uninstall, staging, the dev-loop
  pack watcher** — waves 5+ / standalone.
- **Per-subject topic narrowing; document search beyond prefix +
  declared indexes** — deferred, named in the slate.
- **Git-side title enforcement for content paths** (A22.3) — deferred.

## Surface decisions

### D1 — The document kind vocabulary is closed and lives in code

`lib/document/DocumentKinds.ts` (the named-vocabulary module category)
declares every kind the platform knows, each with its **natural key
field** and index spec:

| kind | natural key | unique index | notes |
|---|---|---|---|
| `script` | `path` | — (path-keyed) | source text verbatim in `data.source` |
| `release` | `path` | — | unchanged; press-owned (document-store.md) |
| `emote` | `data.verb` | `{kind, data.verb}` | flat-key kind |
| `recipe` | `data.recipeId` | `{kind, data.recipeId}` | flat-key kind |
| `name-bank` | `data.key` | `{kind, data.key}` | flat-key kind |
| `blueprint` | `data.blueprintId` | `{kind, data.blueprintId}` | the CURATED layer only |
| `command-view` | `path` | — | path-keyed; code-naming gate (D8) |
| `wiki` | — | — | NOT a document kind — see D9; listed here only to say so |

`PersistenceManager.createIndexes()` creates the kind-scoped indexes
from this table (a `{kind:1, 'data.<key>':1}` unique, partial on
`kind`). Any other `kind` string is **free-form**: path-keyed, no
indexes, admitted by `DocumentApi.save` exactly as today. A kind
graduates from free-form to declared by editing this file — a platform
act, which is the point (A11.5: *the closed kind vocabulary IS the
allowlist*). `requires.kinds:` for pack-declared kinds is wave 3.

### D2 — One `document` strategy, parameterized by kind

`PackLogic` gains **one** `KindStrategy` for the document kind,
instantiated once per declared kind from the same table (D1) —
`documentStrategy(kind)` — not one hand-written strategy per kind. It
answers the Part C slots identically for every kind: TARGET
`documents`; KEY = the record key (file path, content-root-relative,
leading slash, no extension) with **COLLISION CLASS = the natural key**
for flat-key kinds (the existing `flatKeyOf` slot, so the install-set
uniqueness check covers recipes/emotes/name-banks/blueprints for free);
APPLY = the existing three-way machine; DELETE = delete the row on
vanish (documents are pack-shipped rows, not player writing — the
subject kind is the exception, D6); GO-LIVE = the kind's catalogue
invalidation (D3); GATES = requires-kernel on code-naming fields where
the kind has them (D8).

**Pack layout** (file-per-artifact, A16.2), all under `content/`:
`emotes/<verb>.yaml` · `recipes/<recipeId>.yaml` ·
`name-banks/<key>.yaml` · `blueprints/<blueprintId>.yaml` ·
`scripts/<name>.script` · `cmd/**/<verb>.yaml` · `subjects/<name>.yaml`
· `settings/<file>.yaml` · `wiki/<namespace>/<slug>.md`. The template
roots stay `obj/` and `domain/`; `quantity/` and `descriptor-banks/`
stay their own kinds.

**Document path.** A document row's `path` is the pack's declared
`root:` (new manifest field, `pack.yaml`) joined to the record key:
`root: /expression` + `/emotes/grin` → `/expression/emotes/grin`;
`root: /domain/lounge` + `/scripts/daiquiri` → `/domain/lounge/scripts/daiquiri`
(unchanged from today's ScriptSeeder path — adopt-in-place covers it).
`root` defaults to `/<packId>`. Command views are the one exception —
their path is the **view key** (D8). The root is where wave 3's title
claim will attach; this wave the installer writes documents directly
through `PersistApi` (as every kind does) and the `root` is a path
convention, not yet a title.

**Owner.** Installer-written documents carry `owner: <root>` (the
pack's branch), never a person — the same shape ScriptSeeder writes
today (`owner: /domain/lounge`).

### D3 — The collapse, and what the readers do

- `emotes` → `documents {kind: emote}`; `recipes` → `{kind: recipe}`;
  `name_banks` → `{kind: name-bank}`; the curated blueprint overlay →
  `{kind: blueprint}`. **`descriptor_banks` stays its own collection**
  (its own lint, its own kind — already reconciled).
- **One-time boot migration** in `PersistenceManager.connect()` after
  the group-owner migration: for each of `emotes`, `recipes`,
  `name_banks`, copy every row into `documents` as the kind's shape
  (path = `/<legacy>/<naturalKey>` — a **provisional** path the first
  pack install then adopts to the pack's real path by natural key, see
  below), then **drop the legacy collection**, one loud line each.
  Idempotent: a missing legacy collection is a no-op. `Collections.Emotes`,
  `.Recipes`, `.NameBanks` are **removed from the enum** (with their
  policy + reset rows); `Collections.Blueprints` stays (the derived
  cache).
- **Adoption by natural key.** The document strategy's adopt step
  matches an unstamped existing row by `{kind, naturalKey}` (not by
  path) for flat-key kinds, so a migrated legacy row at a provisional
  path is adopted **in place** (`$set` path/owner/sourcePack by `_id`,
  no wipe) by the pack that ships that key. Path-keyed kinds adopt by
  path as today.
- **Readers** re-point to `DocumentApi.listOfKind(kind)` /
  `DocumentApi.read`: `SoulCatalogue` (emotes), `RecipeCatalogue`
  (recipes), `NameBank` (name banks), `BlueprintCatalogue` (curated
  layer). Each keeps its in-memory projection and gains (or keeps) an
  `invalidateCache()` the document strategy's go-live calls after a
  `sync` touches that kind. `RecipeCatalogue` and `BlueprintCatalogue`
  gain the hook they lack today.
- **`Emote`, `Recipe`, `NameBank`, `Blueprint` (curated) stop being
  `Document` subclasses with their own `collectionName`**; they become
  value shapes read off `StoredDocument.data` (a `fromDocument` static
  on each). The runtime-mint surfaces (`SoulLogic.mint/edit/delete`,
  `StudioLogic` publish) write through `DocumentApi.save` under the
  declared kind — the same chokepoint, gate, and provenance as any
  document.

### D4 — Emote aliases die; search terms live

`Emote.aliases` is removed. The 34 emotes' alias words move to a
`searchTerms: string[]` field on the emote document (content, per
file), which `SoulCatalogue` indexes for **lookup by the catalogue
only** (`soul search`, the choice wheel, help) — never for dispatch.
The verb-namespace claim is the canonical `verb` alone. Personal
shortcuts are `AliasMixin` (shell-alias.md). No per-row promotion in
this build (decided: drop all; a later content pass may promote).

### D5 — Reconcile policy is a property of the kind

Recorded once, in `DocumentKinds` / the strategy table, checked by the
installer (A10.5): `document` kinds → three-way; `settings` →
**merge-missing** (a pack seeds; the operator owns after; a pack update
never stomps a tuned value; removing a key from the pack leaves the
value); `subject` → three-way with **archive-never-reap** delete; `wiki`
→ **CAS submit**. A pack may not declare a policy at all this wave
(the gentler-only opt-down is wave 3+ with the manifest tier).

### D6 — The `subject` kind

`content/subjects/<name>.yaml`:

```yaml
name: maintainers            # the Subject title; the flat key (effective)
description: …
audience: { group: <name> }  # optional; absent = open. Resolves to a managed
                             # groupRef by NAME at install; the group must exist
                             # (wave 3 makes it a requires: entry; this wave the
                             # platform groups exist by seeder)
board: true                  # optional organizers, à la carte
channel: true                # names derive from `name` unless overridden:
channelName: …               #   optional
boardName: …                 #   optional
```

APPLY writes the three runtime collections the seeder writes today
(`forum_subjects`, `forum_boards`, `channels`) through their catalogues'
existing mint paths, stamped `sourcePack`; the install record baselines
the *file's* rendered body. Flat-key check on **effective names**
(subject title, derived channel name, derived board name) across the
install set. DELETE: an organizer whose file vanished is **closed/
archived** (`Channel.status`, the board's archive flag — whatever each
already has; if none, the row gains an `archived: true` the catalogues
respect), never deleted; entries stay. Help / Global / Chat become
three subject files in the `platform` pack; `ChannelSeeder` dies with
nothing left behind. No topic field.

### D7 — The `settings` kind

`content/settings/<any>.yaml`, the exact `settings: - key/value` shape
`app-settings.yaml` has today, merged missing-only into the
`app_settings` singleton at install and at `sync`. The 302 defaults
move to `packages/content/platform/content/settings/` **split by
section** (the file's existing `# —` headings become files:
`banking.yaml`, `fasttravel.yaml`, …). `AppSettingsSeeder` dies;
`AppSettings.warm()` is unchanged. The record baselines the file (so
`pack diff` can show what a pack's default *is* versus what the
operator set), but `kept` is the normal outcome for a tuned key and is
**not** a conflict.

### D8 — The `command-view` kind on the strangler

- `content/cmd/**/<verb>.yaml` (core) and
  `content/domain/<sphere>/<locality>/cmd/<verb>.yaml` (locality-local)
  reconcile as `documents {kind: command-view}` with **path = the view
  key** the dispatcher already uses (`/cmd/perception/look`,
  `/domain/eternal/duncan-hall/cmd/provision`) — no `root` join.
  `data` is the parsed YAML view.
- **Store-first, disk fallback.** `CommandLogic.getCommand` consults the
  document store for the key before `readFileSync`; a disk hit is
  counted and the count is logged at `preloadAll` (*"N command views
  served from disk — not yet content"*) and surfaced by `pack status`.
  `preloadAll` walks the store's `command-view` set first, then disk for
  what is missing. Zero is wave 4's exit criterion.
- **Cache invalidation is a real hook**: `DocumentApi.save` of a
  `command-view` and the document strategy's go-live both call
  `CommandApi.invalidate(viewKey)`. A CMS edit of a verb goes live
  without a restart — that is the whole point (A18.2).
- **The code-naming gate.** `controller:` and `validators:` join the
  `class:`/`hydratorClass:`/`brain:` wizard code-trust set: a runtime
  `DocumentApi.save` of a `command-view` whose `controller`/`validators`
  differ from the stored row requires `AccessApi.isWizard` — the
  `TemplateLogic` code-field gate's shape, applied to this kind (the
  same-gate spine). Install-time writes are bootstrap and exempt, as
  templates are. Miss this and "title governs verbs" becomes "title
  governs dispatch".
- **Controller templates stay `content`** (the ~216 seed rows); only the
  view half moves. The ~200 core views move to the `platform` pack;
  newbie-wilds has none; eternal's and terminus's domain-local views
  stay on disk (their packs are wave 4).
- The command-view `Document` shape is validated at install by the
  existing `CommandApi.validateCommandView` fold — a malformed view
  fails the pack at `read`, never reaches the store.

### D9 — The `wiki` kind (CAS submit)

- `content/wiki/<namespace>/<slug>.md`: YAML frontmatter (`title`,
  `subject?`, `tags?`, `related?`, `spoilerLevel?`, `aliases?`) + the
  markdown body. Target: `wiki` + `wiki_revisions` through
  `WikiRegistry`'s own mutators (`createPage` / `editPage`), acting as
  the `system` author — the seeder's bypass ends.
- APPLY: page absent → `createPage` (rev 1); present and the file's
  body ≠ the record's baseline body → `editPage` with `baseRev` = the
  rev recorded at last install. `WikiConflict` → a `PackConflict`
  (`reason: 'wiki-cas'`) in the record + the pack diagnostic; the page
  is untouched. Resolution is the ordinary `pack resolve`: `--take-pack`
  re-submits over the current rev (an edit, not a stomp — the history
  keeps both), `--keep --pin` pins, `--export` writes the current page
  body back to the `.md`. The record's row baseline for a wiki page
  carries `{hash, body, rev}`.
- DELETE: a vanished page file **never deletes the page** (player
  writing accumulates on wiki pages by design); it drops the baseline
  and reports `kept`.
- `wiki-starter` pack: the 7 seeded pages. `WikiSeeder` dies.

### D10 — The blueprint split

`BlueprintSeeder` dissolves into two things it was hiding: the
**derived skeleton rebuild** (`distinct('class')` + `loadClassByPath` →
`Blueprint` rows + orphan reaping) becomes `BlueprintCatalogue.rebuild()`
run from its `postRegister` (a cache rebuild wearing no seeder
costume), and the **curated overlay** (10 rows) becomes 10 files in the
`platform` pack under the `blueprint` document kind. A curated document
"blesses" the derived row it names by `classPath` exactly as today's
attach-in-place does, at warm time.

### D11 — `DocumentLogic.gateMutation` → `ParcelApi`

`AccessApi` gains the path-shaped sibling of `can`:
`AccessApi.canAtPath(actor, action: 'write-document', path)` — resolve
the owner by `ParcelApi.ownerOf(path)` (the covering trie, longest
prefix; rung 2 is `selfHomeOwnerOf`), dispatch on owner kind exactly as
`can` does, **no zone step, no `core` fallback**. `gateMutation` becomes
`isOwnHomePath || canAtPath(…)`. The tree-qualified action name is the
A22.1 vocabulary; `write-template`/`write-source` are not wired this
wave (the source consult is wave 5) but the action vocabulary is
declared as a closed set so they slot in. A `.policy` narrowing by tree
dimension is **out** (nothing narrows yet).

### D12 — The packs

| pack | id / root | contents (this wave) | how |
|---|---|---|---|
| **platform** | `platform` / `/platform` | settings defaults (split by section) · Help/Global/Chat subjects · 10 curated blueprints · ~200 core command views | new files from `config/*.yaml` + `git mv mud/cmd → content/cmd` |
| **expression** | `expression` / `/expression` | 34 emotes, one file each, aliases → `searchTerms` | new files from `config/emotes.yaml` |
| **arcane-library** | `arcane-library` / `/arcane-library` | the Spell templates + GlowlightOrb + SparkSource (~14 template rows) | `git mv` from `mud/seeds/obj/…` (domain kind, template paths unchanged) |
| **corpo** | `corpo` / `/corpo` | the 5 Corpo + Brand data Ideas (`/obj/corpo/**`) | `git mv`; the `mud/bootstrap.ts` boot entries stay (manifest is wave 3) |
| **wiki-starter** | `wiki-starter` / `/wiki` | the 7 pages as markdown | new files from `config/wiki-pages.yaml` |
| **generic-objects** | `generic-objects` / `/generic-objects` | the 11 recipes only | new files from `config/recipes.yaml`; its templates are wave 3 |
| **saxonberg-lounge** | `saxonberg-lounge` / `/domain/lounge` | the 3 `.script` files only | `git mv mud/domain/lounge/scripts/` ; the rest of the lounge is wave 4 |

`dependsOn` per the readers: `platform` first (settings/subjects are
read by everything), `corpo` before `saxonberg-lounge` (neon/goodkin
refs are data pointers, not install-order — declare only what
`requires-kernel` would catch). Every pack is registered in
`server/package.json`; `lint:instanceable` covers the template ones
automatically.

### D13 — `lint:test-content`

`scripts/check-test-content.ts` + `lint:test-content`: **no test file
outside `packages/content/**` or `e2e/` may name a `/domain/**` path**.
Ships **warn-only** (exit 0, a count) with an allowlist
(`scripts/test-content-allowlist.txt`) that the lint verifies only
ever **shrinks** (a new offender not in the list is an error even in
warn-only mode). First four shrinks are in scope: the four kernel-tree
`eternal` tests get synthetic `/test/**` fixtures ("ugly on purpose").
`CLAUDE.md`'s full-suite `git status | grep` rule gains a
`packages/content/` exclusion: **pack YAML is not source** (A26.2).

### D14 — Migration doctrine for this wave

Every move is **adopt-in-place** on an existing dev DB (the !198
bridge): rows keep their `_id`, get stamped and baselined once, one
loud line. Legacy collections are copied then **dropped** by the boot
migration — nothing is left for old code to find (`warn-both`-style
coexistence is not offered; the collections are gone). The migration
lives in `PersistenceManager.connect()` (the only place guaranteed to
run before any reader), ordered after the group-owner migration.

## Constraints

- **Layering (unchanged from !198).** All installer logic in
  `PackLogic` module-private functions; `PackApi` stays a thin decorated
  shell; every write through `PersistApi` (`lint:pm`); no new Api per
  kind — `DocumentApi`, `SoulApi`, `CommandApi`, `AccessApi` grow
  methods, `PackApi` grows nothing but report fields. No new module
  categories; `DocumentKinds.ts` is a named-vocabulary module.
- **Mudlib imports nothing** (`lint:imports`); the `.md` wiki files and
  `.script` files are read by `PackLogic` (the importing tier) — no
  reader in `lib/`.
- **The closed kind vocabulary is the allowlist.** There is no
  contribution kind for `bank_ledger`, `users`, `groups`, `parcels`,
  `office_holders`, `holder_snapshots`, any `*_events` — the installer
  physically cannot say them (A11.5). Adding a kind = editing
  `DocumentKinds` + a `KindStrategy`, never a policy row.
- **Wizardness gates TypeScript only** (A22.1): `controller:` /
  `validators:` are the only new wizard-gated fields; installer writes
  are bootstrap and exempt like templates.
- **Archive-never-reap** for subjects and wiki pages; delete-on-vanish
  for every other document kind — stated per kind in `DocumentKinds`.
- **No `Date.now()` in any preimage**; wiki baselines carry `rev` beside
  the hash.
- **Every seeder retirement is one commit that deletes the seeder, its
  `AppBootstrap` call, its config/seed source, and adds the pack files
  — revertable as a unit.** The `AppBootstrap.run` block shrinks in
  place; order among survivors (`SeederManager` → `PackApi.install` →
  `loadHooks` → `GroupSeeder` → `ParcelSeeder` → `preloadAll` →
  `BootstrapManager`) is unchanged.
- **Catalogue warm order**: `PackApi.install` runs before `loadHooks`
  and before every catalogue's `postRegister`, as today — the document
  kinds are therefore visible to every warm. The command-view store
  read in `preloadAll` also runs after install.
- **Test bootstrap**: every test touching the wired runtime imports
  `test-bootstrap` (`lint:test-bootstrap`); installer tests use ugly
  fixture packs under the harness from !198 (`pack-harness.ts`), never
  the real packs (the newbie-wilds real-root test is the sanctioned
  exception and does not multiply).
- **One full `pnpm test` per build**, at the end; `test:near` per
  step.
- **Docs are index-file-swept**: CLAUDE.md's collection list and map
  lines are edited at the sweep, not per step.

## Build sequence (normative)

Each step: green tree, one or more commits, pushed. A step's "exit"
line is what a build agent reports if it stops after it.

1. **`document` kind + `DocumentKinds` + indexes + the strategy factory**
   (D1, D2, D5). Scripts are the first kind through it: the
   `saxonberg-lounge` pack (scripts only), **ScriptSeeder dies**.
   *Exit: one seeder retired; the document kind proven.*
2. **The collapse, part 1 — emotes** (D3, D4): migration + drop
   `emotes`, `SoulCatalogue` reads documents, aliases → `searchTerms`,
   the `expression` pack, **EmoteSeeder dies**. *Exit: the flat-key
   exemplar ships.*
3. **The collapse, part 2 — recipes + name banks**: migration + drop
   `recipes` and `name_banks`; `RecipeCatalogue`/`NameBank` re-point;
   the `species-and-names` pack's name banks move from the old kind to
   the document kind (same files, new strategy — adopt by natural key);
   `generic-objects` pack with the 11 recipes; **RecipeSeeder dies**.
   *Exit: three seeders retired; one-off collections gone.*
4. **The `platform` pack, part 1 — settings + subjects** (D6, D7):
   settings split into files; Help/Global/Chat subject files;
   **AppSettingsSeeder and ChannelSeeder die**. *Exit: five seeders
   retired; the proto-pack-zero exists.*
5. **The blueprint split** (D10): `BlueprintCatalogue.rebuild()`; 10
   curated files into `platform`; **BlueprintSeeder dies**. *Exit: six
   seeders retired; 2a's seeder list is done.*
6. **`arcane-library` and `corpo` packs** (template `git mv`s, the cheap
   step — placed here so a stop after it still ships two packs).
7. **The `DocumentLogic` → `ParcelApi` repoint** (D11) — kernel-only, no
   content moves; independently revertable.
8. **`lint:test-content`** + the four eternal fixture shrinks + the
   CLAUDE.md exclusion (D13). *Exit: 2a complete.*
9. **The `command-view` kind on the strangler** (D8): store-first read,
   the invalidation hook, the code-naming gate, `git mv mud/cmd →
   platform/content/cmd`, the fallback counter. *Exit: verbs are
   content; fallback count = the domain-local residue.*
10. **The `wiki` kind** (D9) + `wiki-starter`; **WikiSeeder dies**.
    *Exit: 2b complete; seven seeders retired.*
11. **Docs** (content-packs.md, document-store.md, emotes.md,
    crafting.md, command-spec.md/command-routing.md, wiki.md,
    app-settings.md, chat.md/forums.md, access.md/parcel.md,
    studio.md, testing.md), the one full suite, the drive (below), the
    MR.

## Acceptance criteria

- **Fresh DB**: boot installs ten packs (the four shipped + the six
  new), `pack status` lists ten applied records; `documents` holds
  every emote/recipe/name-bank/blueprint/script/command-view row with
  the right `kind`, `sourcePack`, and `path`; the `emotes`, `recipes`,
  `name_banks` collections do not exist.
- **Existing dev DB**: one boot migrates the three legacy collections
  into `documents` (rows adopted by natural key, `_id`s preserved) and
  **drops them**, with one loud line each; a second boot is a no-op
  (no migration line, all packs all-zero) — tested at the migration,
  record, and per-kind layers.
- **Per-kind three-way coverage**: the matrix test from !198 runs over
  the `document` strategy for at least `emote` (flat-key) and `script`
  (path-keyed); `settings` proves merge-missing (a tuned key survives a
  changed default, reported `kept`, no conflict); `subject` proves
  archive-never-reap; `wiki` proves CAS (a changed file over an
  unchanged page edits with a new rev; over a player-edited page
  raises a `wiki-cas` conflict, the page untouched, all three bodies in
  `pack diff`).
- **Emotes**: no `aliases` field anywhere in server source or content;
  `;grin` (a former alias) does not dispatch; `soul search grin` finds
  the emote; `AliasMixin` still works. `SoulLogic.mint` writes a
  `documents` row under `kind: emote`.
- **Command views**: after install, `preloadAll` serves every
  `/cmd/**` view from the store (fallback count = the domain-local
  residue, listed by key); editing `look.yaml`'s help text through the
  CMS changes `help look` without a restart (driven); a non-wizard's
  CMS save that changes `controller:` is refused, a wizard's is
  admitted (tested).
- **Document gate**: `DocumentLogic.gateMutation` contains no
  `resolveZoneForPath`, `canMutateZone`, or `can(…, null)`; a write
  under a parcel the actor holds title to is admitted, one under
  another's parcel refused, one under `/home/<self>` admitted —
  tested through `AccessApi.canAtPath`.
- **Seeders**: `EmoteSeeder.ts`, `RecipeSeeder.ts`, `BlueprintSeeder.ts`,
  `ScriptSeeder.ts`, `ChannelSeeder.ts`, `AppSettingsSeeder.ts`,
  `WikiSeeder.ts` are deleted; `mud/config/{emotes,recipes,blueprints,
  channels,app-settings,wiki-pages}.yaml` and `mud/domain/lounge/scripts/`
  are deleted; `AppBootstrap.run` calls none of them; `mud/cmd/` is
  gone (moved).
- **`lint:test-content`** runs in CI warn-only; the allowlist file
  exists; four eternal kernel tests no longer name `/domain/**`; the
  allowlist-only-shrinks check is tested.
- **Lint family + one full suite green**; `pnpm build` type-clean.
- **Docs**: the subsystem docs listed in step 11 updated; CLAUDE.md
  lines at the sweep.
- **Drive** (recorded on the MR): boot 1 migrates + adopts, boot 2 is a
  no-op; `pack status` as a committee member lists ten packs; an emote
  from `expression` fires; a recipe from `generic-objects` resolves in
  crafting; `help look` is served from the store; a CMS edit of a verb
  goes live; a wiki page from `wiki-starter` renders.

## Cross-references

- `docs/slates/builds/content-packs-slate.md` — Part 9, addenda 2, 8,
  10, 14, 16, 18, 22, 24, 26, 27
- `docs/slates/builds/content-pack-units.md` — Parts A–C
- `docs/subsystems/content-packs.md` (!198 baseline),
  `document-store.md`, `emotes.md`, `crafting.md`, `studio.md`,
  `command-routing.md`, `command-spec.md`, `wiki.md`, `app-settings.md`,
  `chat.md`, `forums.md`, `access.md`, `parcel.md`, `shell-alias.md`,
  `testing.md`
- Memory: nothing-is-legacy-model-it-right (the collapse drops the
  collections rather than keeping them "for compatibility")
