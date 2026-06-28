# Content packs — content as a versioned, shippable deliverable

> **Status: exploratory — the long-term answer to `SeederManager`.**
> Today the game's foundational content trees (materials, biomes,
> species, name banks, emotes, recipes, channels, app-settings) are
> seeded into MongoDB at boot by `SeederManager` + five per-collection
> seeders, walking YAML that lives *inside* `packages/server`. The
> canonical content is therefore trapped in two places at once — files
> git can see but the seeder won't re-apply (insert-only), and DB rows
> git can't see at all. This slate makes **content a first-class
> deliverable**: each content tree is lifted out of the server into its
> own **pack** (a monorepo package now, its own repo later), the file
> becomes the **source of truth**, and one **dependency-ordered
> installer** reconciles packs into the DB — replacing all six seeders.
> Content gets real version control (git, for free) and the boundary
> that lets it ship, branch, and roll back independently of the kernel.

This is the **content-only** corner of the broader downloadable-content
taxonomy. It deliberately ships **zero TypeScript**. It is *not* the
mod / expansion track (new code / capabilities) — see *Scope & the
content-pack ↔ mod line* below.

## See also

- [persistence.md](../../subsystems/persistence.md),
  [templates.md](../../subsystems/templates.md) — the `Template` →
  `domain` collection model packs install into; `Document` base for the
  side collections; the Hydrator that turns a row into a live object.
  **A pack file is a template/document on disk** — packs change *where
  the canonical copy lives*, not *what a template is*.
- [bootstrap.md](../../subsystems/bootstrap.md),
  [hot-reload.md](../../subsystems/hot-reload.md) — the boot sequence
  the installer slots into (replacing the seeders, preserving the
  before-`BootstrapManager` invariant) and the `restoreFromTemplate` /
  HMR machinery the runtime re-hydrate step reuses.
- [app-settings.md](../../subsystems/app-settings.md) — the
  `seed-missing` reconcile exception: operator-tunable config where the
  DB wins after first seed, the counter-case to file-is-truth.
- [provenance-slate.md](./provenance-slate.md) — the **sibling
  substrate**, not a duplicate. Provenance owns *authorship* (who wrote
  a thing → producer credit) and the in-runtime VCS for *live* content.
  Content packs own the *build-time* delivery of *bundled, kernel-shipped*
  content. The `sourcePack` stamp here is a thin precursor to provenance's
  attribution; the deferred *round-trip* lane (edit-in-game → export to
  pack) is where the two meet. Content packs do **not** wait on provenance.
- [cms-slate.md](./cms-slate.md) — the authoring surfaces over the
  `source` / `template` backends and the "git is a thin VC overlay on
  **one** repo — **mods maybe the lone future exception**" position.
  Content-packs-as-separate-repos **is** that flagged exception, now
  designed. The three-trees content store (source / template /
  **document**) is the storage model packs serialize to.
- [roadmap.md](../../roadmap.md) § *Templates, mods, and isolated-vm
  sandboxing (Framework 13)* — names the **Content / Capability / Full**
  mod split. This slate builds the **Content** corner; Capability / Full
  need `isolated-vm` and are out of scope.

## The problem, concretely

`SeederManager` walks `packages/server/src/mud/seeds/` (≈429 YAML) into
the `domain` collection, **insert-only / idempotent**: an existing row
is never clobbered. Five per-collection seeders (`Emote`, `Recipe`,
`Channel`, `NameBank`, `AppSettings`) do the same from a single
`mud/config/*.yaml` each, into their own collections. `QuantityApi`
loads `quantity-tags.yaml` into an in-memory table.

Two consequences fall out, and both are the motivation:

1. **Iteration is broken.** Edit `gin.yaml`, restart → *nothing
   happens*; the row exists, the seeder skips it. The actual current
   workflow is "delete the row by hand in Mongo, restart." Content
   can't be iterated like content.
2. **Content has no version control where it counts.** The canonical
   runtime value lives in the DB, which git can't see. We want git's
   rollback / branching / PRs *on the content* — but only the files
   (which aren't canonical) are in git.

The fix is one move with cascading payoff: **make the file canonical
and the DB a derived install of it.**

## The decisions (the spine)

These were settled in the design conversation; they are the slate's
load-bearing commitments.

### D1 — Content is a deliverable; the boundary is a package

Each content tree is lifted out of `packages/server` into a **content
package** alongside `server` / `client` / `types` / `e2e`. **Monorepo
package now; its own repo when the monorepo is broken up — all at
once.** What makes content "a deliverable" is the *boundary* (a
`package.json`, a version, a declared dependency edge `server → pack`),
not the repo. With the boundary in place, the eventual repo split is
mechanical — you move a directory that already stands alone.

### D2 — The file is the source of truth; the DB is a derived install

You can blow the database away and rebuild the whole world by
re-installing packs. Your edits are commits in the pack. **This is what
gives you the git rollback / branching you wanted — because the
canonical thing is the file, and files are what git versions.**
Honest cost: you iterate by **editing the file, not hand-editing the
live DB** (the in-game-edit-and-round-trip-back lane is deferred — see
Open questions).

### D3 — Pack taxonomy follows independent-growth axes, not trees

A tree deserves its own pack when it **grows / is maintained on its own
schedule** — which is just "deserves its own deliverable" applied tree
by tree. The working map (cheap to revise; it's only which folders hold
which files):

| Pack | Contents | Why its own pack |
|---|---|---|
| **base-library** | material, biome, quantity-units | the slow-moving physical substrate vocabulary |
| **species-and-names** | species + name banks | big growth (many species incoming); names are *keyed to* species, so coupling them keeps the dependency internal |
| **emotes** | the emote catalog | social-expression catalog with its own life |
| *world packs* | Eternal City, Eternal U, Dave's Bar | specific authored places/casts, **built from** the packs above |

The sorting rule: **referenced by other content → building-block pack;
the final thing players walk around in → world pack.** A design goal
riding the species-and-names pack: names distinctive enough that the
name alone reads as the species ("oh yeah, that's a troll") — almost
entirely **authoring craft** (char-gen already ties species → name
bank), on-brand with the recognition substrate and the persona-casting
of species.

### D4 — A pack is a folder + a tiny manifest; its requirements are derivable

```
packages/content/base-library/
├── package.json          # workspace member: name, version, private
├── pack.yaml             # the manifest the installer reads
└── content/              # content root; MIRRORS the template-path namespace
    └── lib/
        ├── material/spirit/gin.yaml     →  /lib/material/spirit/gin
        ├── material/element/iron.yaml   →  /lib/material/element/iron
        └── biome/…
```

Lifting materials out is **literally `git mv`** of
`server/src/mud/seeds/lib/material/` → `content/base-library/content/lib/material/`;
`gin.yaml` is byte-for-byte unchanged. The template path stays
`/lib/material/spirit/gin` but the file now lives in a different
package — so the path becomes a **pure namespace identifier, decoupled
from where the file sits** (healthier anyway). The `content/` root
preserves the existing path-from-location mapping so the move is
mechanical; a per-file `path:` field is the escape hatch if layout ever
needs to diverge from namespace.

`pack.yaml`:

```yaml
id: base-library
version: 0.1.0          # reserved; inert until packs decouple (git is the real version)
description: Foundational substrate — materials, biomes, units.
dependsOn: []           # other packs that must install first
```

Deliberately tiny, because the two requirements we kept circling are
**derivable, not hand-listed**:

- **Requires-kernel** → the installer reads each file's `class:` field
  (`/lib/material/Material`) and checks it resolves; missing → install
  aborts with a clear message. An **install-time check**, no maintained
  list, no drift. *This check is the content-pack ↔ mod line, made
  enforceable* (a pack assumes classes; a mod brings them).
- **Owned paths** → the `sourcePack` stamp (D5) records ownership at
  install time, so the manifest needn't enumerate paths.

`package.json` is workspace boilerplate only (no code, no build, no
deps). Payoff: **`server`'s deps enumerate the packs the build ships
with** — "what content is in this build?" has one honest answer.

```json
{ "dependencies": { "@saxonberg/content-base-library": "workspace:*" } }
```

### D5 — The installer is a reconcile, keyed on a `sourcePack` stamp + content-kind dispatch

"File is truth" turns the seeder into an **installer** whose job each
run is *make the DB match the pack files*. Per pack, three cases:

- file the DB lacks → **insert** (+ stamp);
- file that changed → **overwrite**;
- stamped row whose file vanished → **delete**.

Each installed row carries a **`sourcePack` stamp** (`base-library`).
Reconcile operates only over rows bearing *this pack's* stamp;
**anything unstamped or stamped by another pack is invisible** — player
creations, live world state, other packs are untouched, guaranteed.

The stamp also **unifies the two seeding shapes**: a path-prefix notion
of ownership chokes on the fact that materials are `domain` templates
but emotes/recipes/names live in *their own collections*. A per-row
stamp works **identically across every collection**, so one installer
dispatches all packs by **content-kind** (recognized by subdir
convention; manifest-declared kind is the rare fallback): `content/lib/…`
→ `domain`; `content/quantity/…` → the tag loader; an emotes pack's
`content/emotes/…` → the emotes collection.

**Two reconcile policies, declared per pack / content-kind:**

- **`replace`** — file is truth, overwrite. Materials, biomes, species
  (the D2 default).
- **`seed-missing`** — install if absent, DB wins thereafter.
  App-settings (operator edits are durable). This is also the opt-in
  answer to "content I *do* want to edit live."

### D6 — Boot integration: strangler-fig replacement of all six seeders

Current content-loading region of `AppBootstrap.run`:

```
101  connect to Mongo
104  SeederManager.run()           → domain templates
111  QuantityApi.loadTagTables()   → quantity units (in-memory)
120  loadHooks()                   → persistence hooks (need their templates)
128  Emote/Recipe/Channel/NameBank/AppSettings seeders → side collections (via Document.save → after hooks)
143  BootstrapManager.run()        → clones singletons; catalogues warm from the above
```

The installer (lives in `backend/`, same role as `SeederManager`,
writes to Mongo directly, no in-world gate — the `sourcePack` stamp is
its provenance marker) becomes the single mechanism over spots
104 / 111 / 128–132. At boot it: **discovers** packs (the
`@saxonberg/content-*` deps) → **topo-sorts** by `dependsOn` →
**reconciles** each by content-kind → **checks** referenced classes.

- **Boot writes rows only.** `BootstrapManager` (143) clones *after*
  install, so nothing is live yet — the re-hydrate step is unnecessary
  at boot.
- **One ordering pin preserved:** template/quantity content before
  `loadHooks` (120); side-collection docs (via `Document.save`) after.
  So the installer runs in two phases around line 120 — same pins,
  one mechanism instead of six.

**Migration — no big-bang:**

1. Stand the installer up *next to* the seeders, owning one pack
   (`base-library`, materials only — `git mv`'d out of `seeds/`).
   `SeederManager` still walks the rest; the five doc-seeders still run.
2. **They can't fight** — the installer touches only `sourcePack`-stamped
   rows; the old seeders are insert-only on unstamped ones. Disjoint.
3. **The bridge: adoption.** Materials rows already exist (unstamped,
   from past seeding). On first run the installer **adopts** an existing
   unstamped row at a pack path (stamps it, overwrites with the file)
   instead of erroring. This migrates **without wiping the DB**.
4. Move trees out one at a time (biomes → species+names → emotes), each
   adopted into a pack; `SeederManager`'s input shrinks each step.
5. **Delete the seeders last** — when `seeds/` is empty and every config
   migrated, `SeederManager` + the five seeders have nothing to do.

### D7 — Versioning: git is real and free; the version *number* waits for the repo split

A pack is files in a repo, so **git is the versioning** — history,
diff, branch, rollback, PRs, all automatic, all on the content. That is
the versioning that matters for authoring, and there is nothing to
build.

The manifest `version` is a *different, coarser* thing — a release
label — and **today it does almost nothing**, because nothing reads it.
It becomes load-bearing **only when packs evolve on independent
timelines** (separate repos, third-party packs, a marketplace), at
which point the installer must check a dependency's version before a
broken install. **That is the same boundary as the repo split** — so
reserve the field (`0.x`), don't build machinery around it yet.

When it *does* matter, it versions the pack's **public surface — the
paths and tags other content references — not its values.** Editing
gin's density breaks nothing (re-hydrates). Renaming
`/lib/material/spirit/gin`, or changing a tag a recipe matches on,
breaks every pointer — semver's breaking-change idea applied to
paths-and-tags.

## The iteration loop (the payoff)

Because a material lives in **exactly one runtime place** — the gin
singleton, which every bottle resolves by path on each read
(`Tangible.getMaterial()` re-resolves lazily) — pushing an edit touches
one object and everything downstream sees it for free. No
instance migration. The dev loop:

1. Edit `gin.yaml`.
2. **Sync** — the *same installer* invoked at runtime reconciles the
   changed rows.
3. **Re-hydrate** the affected live singletons (`restoreFromTemplate` /
   HMR) — the one addition over the boot path, since objects are now
   alive.
4. Done — gin's values are live; no world restart.

A `pack sync` dev command or a file-watcher. **Build it after the boot
path is solid** — boot is the must-have, sync is the quality-of-life
follow-on. (Materials/biomes/species dodge the hard case entirely
because they're singletons-by-path; *cloned* content — many copies of a
chair — would need per-instance re-hydration, which is why world packs
are a later, harder wave.)

## Scope & the content-pack ↔ mod line

In scope: **content-only packs** — pure data (YAML), zero TypeScript,
installed by reconcile, depending on a kernel that already provides the
classes its content names. The deliverable taxonomy this corner sits in
(roadmap Framework 13 — Content / Capability / Full):

- **Content pack** *(this slate)* — no code; assumes classes exist;
  declares its needs via the derivable requires-kernel check.
- **Capability / Full mods** *(out of scope)* — bring new TypeScript
  (classes, mixins, brains, Apis); need `isolated-vm` sandboxing,
  bridged whitelisted Apis, resource limits. A different, later build.

The clean line: **a content pack assumes classes; a mod brings them.**
The requires-kernel install check *is* that line, enforced.

## Open questions / deferred

- **Round-trip (edit-in-game → export to pack).** The deferred lane
  where someone edits *world/player* content live and wants it to flow
  *back* into the pack file. A DB→file export problem, genuinely
  different from install; this is where content packs meet provenance's
  in-runtime VCS. Substrate packs don't need it.
- **Migrations.** When a breaking surface change (renamed path) meets
  *existing durable content* pointing at the old path, an upgrade may
  need to *transform* data, not clobber — and *that* is the deeper
  reason version numbers eventually carry weight. Only exists once
  durable content outlives the pack edit (the world/round-trip lane).
- **Runtime install / marketplace.** Pulling a pack into a *running*
  game (vs deploy-time bundling via `server` deps). Needed for any
  future community-content story; also where pack *uninstall* and the
  referential-integrity-on-delete question (a dropped path that live
  objects still point at) get real.
- **Cross-pack / third-party namespacing.** Global template paths are
  fine for first-party packs developed in lockstep; independent
  third-party packs need a namespacing + collision story (and is where
  the `dependsOn` version ranges from D7 light up).
- **World-pack re-hydration.** Cloned (non-singleton) content needs
  per-instance re-hydration on sync — the hard wave the singleton-based
  substrate packs defer.
- **app-settings disposition.** Migrate last with
  `reconcile: seed-missing`, or leave it as its own seeder. Either works.
- **Naming.** `@saxonberg/content-*`, `packages/content/<pack>/`,
  `pack.yaml`, `sourcePack`, `PackInstaller` — all provisional.

## First build (suggested slice)

The pilot that proves the whole pattern end-to-end with the smallest
blast radius:

1. `PackInstaller` in `backend/`: discover (one pack) → reconcile by
   `sourcePack` stamp → content-kind dispatch for `domain` templates →
   requires-kernel check → **adoption** of existing unstamped rows.
2. The `base-library` package with **materials only**; `git mv` the
   tree out of `seeds/`.
3. Wire it into `AppBootstrap` *beside* `SeederManager` (which keeps
   handling everything still in `seeds/`).
4. Boot path only (no runtime sync yet); `replace` policy only.

Then iterate: biomes → species+names → emotes → retire `SeederManager`
and the five seeders → add the runtime `pack sync` + re-hydrate loop.
