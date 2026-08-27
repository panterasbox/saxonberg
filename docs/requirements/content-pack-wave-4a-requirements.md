# Content packs wave 4a — the path surgery: requirements

Wave 4a is the one path-rename window the content-packs slate reserves
("renames are the only scary operation; twice = twice the fear" —
[content-packs-slate.md](../slates/builds/content-packs-slate.md)
Addendum 24). Everything in it is mechanical and lands together so the
namespace is stable before the first trades are written on it: the
`/domain/` → `/world/` root rename (Addendum 17), the `/trade/` root
(Addendum 6), the hearthworks re-cut into two industry packs and one
venue (A16.1 + A16.3), the deletion of wave 3's two `grant` migration
branches, and the ground rule that existing databases are **dropped, not
migrated**. The first trades themselves (smithing/hearth-cooking as
*industries with archetypes*, hospitality, the A23 extractions, the
authorable-composition bridge) are wave 4b.

Load-bearing subsystem docs: [content-packs.md](../subsystems/content-packs.md)
(the installer, `requires`, the boot union, `TITLE_ROOTS`),
[parcel.md](../subsystems/parcel.md) (`grant`, the migration branches),
[templates.md](../subsystems/templates.md) (the clone namespace),
[document-store.md](../subsystems/document-store.md) (recipe documents
under a pack root), [crafting.md](../subsystems/crafting.md)
(RecipeCatalogue, stations), [command-spec.md](../subsystems/command-spec.md)
(domain-local verbs).

## Goals

- **`/domain/` is gone; `/world/` is the places root.** Every template
  path, source mirror (`src/mud/domain/` → `src/mud/world/`), pack
  content directory, manifest claim and boot entry, lint allowlist,
  test fixture, e2e spec, client literal and doc says `/world/`. The
  word "domain" survives only in prose about title ("the smithing
  pack's domain").
- **`/trade/` exists as a title root.** `/trade/<industry>/**` is an
  industry pack's whole world; its claim is exactly its root. The
  clone namespace, `lint:untitled`, `lint:instanceable` (the `obj/`
  segment rule recursed), the covered-extent rule and the document
  tree all know the root.
- **Hearthworks is three packs.** `trade-smithing` (`/trade/smithing`)
  and `trade-hearth-cooking` (`/trade/hearth-cooking`) ship what each
  industry *introduces*; the venue (`/world/hearthworks`) stays in
  `world-seed` with its rooms, Business, cast and menus. Commons goods
  and fire stations stay `/obj/`.
- **Wave 3's migration branches are deleted.** `ParcelRegistry.grant`
  has no `core`-held or retired-board branch; `lint:core-gone`'s
  `migration-note` exemption has zero sites.
- **A pre-rename database cannot boot into a half-world.** Boot refuses,
  loudly and early, when the store still holds `/domain/` content, and
  says what to do.
- **Nothing else changes.** Same packs, same rows, same behaviour at
  every verb — this is a rename, provable by the suite and the drive
  coming back identical.

## Non-goals

- **No data migration.** Existing databases (`saxonberg_build1/2/3`,
  `saxonberg_demo`) are dropped and re-provisioned by the packs; player
  snapshots on the demo box are lost (it wipes nightly regardless).
  No one-shot path rewrite across `content` / `parcels` /
  `holder_snapshots` / `documents` / `chattel` / `pack_installs`.
- **No archetypes, no aggregator, no test-venue generator, no industry
  position defs** (Addendum 18, A16.1's "archetype" and "position def"
  columns) — wave 4b. Positions stay on the venue Business as today.
- **No A23 extractions** (`Offstage` → employment, `TipJar` →
  `/trade/hospitality`, `MechanicalMovement` → lib, the residue deletes)
  — wave 4b, with the venue packs they serve.
- **No hospitality pack, no saxonberg-lounge venue re-cut, no
  hearthworks inbound exit** — wave 4b.
- **No authorable-composition bridge** — it has not landed
  (studio.md § Deferred seams: composition-rule metadata is "not
  authored"); it gates wave 4b's "hospitality ships pure data", not
  this wave.
- **No new trade code** — smithing and hearth-cooking need no
  controllers; `src/mud/trade/` is created only if a class moves there
  (none does in this wave).
- **No change to the `/obj/`, `/cmd/`, `/compact/`, `/studio/`,
  `/wiki/`, `/home/`, `/corpo/` roots**, nor to the address namespace
  (`AddressableMixin` addresses are not paths).

## Surface decisions

### D1 — `/domain/` → `/world/`, everywhere, by the same rule

Decided in Addendum 17; this wave executes it. The rename is
**mechanical and total**: `s|/domain/|/world/|` over template paths,
`s|domain/|world/|` over pack content directories, `src/mud/domain/`
→ `src/mud/world/`, the `paths.ts` constants in each locality, the
`allowedPrefixes` of `StuffApi.clone`'s namespace check, `TITLE_ROOTS`
(both copies — `PackLogic` and `check-untitled-paths.ts` — collapse
into one exported constant), `AppSettingFallbacks.defaultStartLocation`
(`/world/void`), `StoredDocument`'s path scheme, the wave-2 msh path
migration in `PersistenceManager` (deleted, not renamed — see D4),
`scripts/test-content-allowlist.txt`, e2e specs, client literals, and
every subsystem doc (at the sweep). The `domain/<sphere>/<locality>/cmd/`
view-key convention becomes `world/<sphere>/<locality>/cmd/`; the
`commandContributions` strings follow. The `/domain` claim in the
platform manifest becomes `/world`.

*Why total:* a partial rename (paths but not source dirs, or content
but not the view keys) leaves two vocabularies for one thing, which is
the state the slate calls stale. Mirror-path convention (CLAUDE.md
§ Backing-class path mirrors template path) makes the source move
non-optional.

### D2 — `/trade/` is a path root, not a class branch

The slate's "sixth top-level branch file" was a misreading:
`Stuff._registerTopLevelBranch` registers **class-lineage** roots
(`Thing` / `Location` / `Agent` / `Idea` / `Shadow`), which `/trade/`
is not. `/trade/` is a **path** root exactly like `/corpo/`: added to
`TITLE_ROOTS` (ninth), to `StuffApi.clone`'s `allowedPrefixes`, and
recognised by `lint:instanceable`, whose `obj/` rule recurses — inside
`/trade/<industry>/`, `obj/` holds the instanceables and nothing names
a `/lib/` class. No module-scope exception grows.

*Layout:* `/trade/<industry>/obj/<Thing>` (stations, stock),
`/trade/<industry>/recipes/<recipeId>` (recipe documents — the pack's
`root` is `/trade/<industry>`, so the existing `document` kind derives
the path with no new machinery), `/trade/<industry>/cmd/` +
`/trade/<industry>/command/` reserved (the domain-local precedent),
`/trade/<industry>/archetypes/` reserved for wave 4b.

### D3 — the hearthworks re-cut: introduces-vs-commons, applied

Per A16.1 corrected by A16.3 (*an industry ships only what it
introduces; goods that pre-exist any industry are commons*):

| Row today (`world-seed`, `/domain/hearthworks/…`) | Lands |
|---|---|
| `anvil`, `whetstone`, `workbench` | `trade-smithing` → `/trade/smithing/obj/…` (stations smithing introduces) |
| `iron-ingot`, `spare-ingot` | `trade-smithing` → `/trade/smithing/obj/…` (stock smithing introduces) |
| recipes `fire-poker`, `smiths-hammer`, `belt-knife`, `cook-pot`, `leather-jerkin` (today `generic-objects`) | `trade-smithing` → `/trade/smithing/recipes/…` |
| recipes `toasted-ration`, `root-mash` (today `generic-objects`) | `trade-hearth-cooking` → `/trade/hearth-cooking/recipes/…` |
| `prime-cut`, `stew-meat`, `ration-stock`, `root-vegetables`, `hide-stock` | **commons** → `generic-objects` `/obj/…` (A16.3: pre-exist any industry) |
| `dry-log`, `wet-log` | **commons** → `generic-objects` `/obj/…` (firewood burns in campfires with no fuel trade) |
| `pantry-chest`, `kitchen-menu`, `smithy-menu`, rooms (`smithy`, `cookhouse`, `cellar`, `woodshed`, `forge-floor`), `business`, `npc/cook`, `npc/smith`, `hearthworks.yaml` | venue — stay in `world-seed` at `/world/hearthworks/…` |
| recipes `daiquiri`, `martini`, `fine-roast`, `hearty-stew` (today `generic-objects`) | **stay** in `generic-objects` — no industry pack claims them this wave (hospitality / hearth-cooking's second pass are 4b) |

Fire stations (`Forge` / `Oven` / `Kiln` / `CookPot`) are fire-substrate
commons and are not touched. The `hearthworks` venue's `populates:`
compositions and the recipes' station references are repointed to the
new paths — the "one populates list + recipe station refs" blast
radius A16.1 predicted. `KitchenMenu` / `SmithyMenu` / `SealedCellar`
are venue classes and move with the source mirror to
`src/mud/world/hearthworks/`.

*Pack shape:* two new packages `packages/content/trade-smithing` and
`packages/content/trade-hearth-cooking`, each `root: /trade/<industry>`,
`requires.title: [{ extent: /trade/<industry>, holder: { group:
<industry> } }]` with the group declared in the same manifest (PM-owned,
the wave-3 default), `maintainers` defaulting, `dependsOn: [platform,
generic-objects]`. The venue claims nothing new: hearthworks has never
held its own title and stays under the platform's `/world` claim as
today (a venue group arrives with the venue pack in 4b).

*Resolved open (A16.1 #4):* the venue keeps the proper name
"Hearthworks"; the industries take generic names.

### D4 — no migration: drop and reboot, and a boot guard

The user's call: existing databases are dropped. Consequences made
explicit so nobody is surprised:

- `saxonberg_build1/2/3` are dropped by their owners on first checkout
  of the merged master; `saxonberg_demo` is reprovisioned by the
  nightly wipe or by hand at deploy.
- **The boot guard**: `AppBootstrap.run` (before `PackApi.install`)
  counts `content` rows whose `path` starts with `/domain/`; if any,
  it logs one error naming the count, the database and the
  instruction (*drop this database; wave 4a renamed `/domain/` →
  `/world/` without a migration*) and **exits non-zero**. A half-world
  — old `/domain/` rooms adopted by nothing, new `/world/` rooms
  granted beside them, avatars whose snapshots point at rooms no pack
  claims — is worse than a refused boot.
- The wave-2 msh path migration (`/domain/lounge/scripts/` →
  `/domain/lounge/msh/`) in `PersistenceManager` is **deleted**: no
  database it could apply to survives the guard.
- The `grant` migration branches (`core`-held, the five retired boards)
  are **deleted**; on a fresh database every claim is `granted`.
  `lint:core-gone` keeps the `migration-note` mechanism, with zero
  sites.
- `PackApi.orphans` stays; the orphan-row cleanup A16.1 asked for is
  subsumed (a fresh database has no orphans).

### D5 — the drive proves "nothing else changed"

Because the wave is a rename, the acceptance drive is the wave-3 drive
re-run and compared: first boot on a fresh database installs the same
packs plus two (`trade-smithing`, `trade-hearth-cooking`), every claim
`granted`, `pack status` lists eighteen packs, the founder lands in the
lounge at `/world/lounge/…`, `look` / `go` / `craft` at the Hearthworks
behave as before, `lint:untitled` reports zero, `PackApi.orphans` zero.
The platform-only e2e still lands the founder in `/world/void`.

## Constraints

- **One `git mv` commit per tree move**, nothing else in between
  (CLAUDE.md § Worktrees; the wave-3 lesson). The content move
  (`content/domain/` → `content/world/` in every pack), the source move
  (`src/mud/domain/` → `src/mud/world/`), and the hearthworks split are
  three separate move commits.
- **Stage by name, never `add -A`**; push every step; one MR.
- **The mirror convention holds**: a class's source path mirrors its
  template path, so `src/mud/world/<locality>/` is where the moved
  classes live and `FromModule('/world/...')` strings follow.
- **`lint:test-content`** keeps gating: the allowlist is rewritten from
  `/domain/<locality>` to `/world/<locality>` (same entries); a kernel
  test naming `/trade/` shipped content is a NEW offender.
- **`lint:gates`** must stay green through the `FromModule` string
  renames — it is the tripwire for a missed one.
- **No new module categories, no new Apis** — this wave adds packages
  and renames; `PackApi` / `ParcelApi` surfaces are unchanged except
  for the branch deletions.
- **Antipatterns to keep out**: no compatibility aliasing of `/domain/`
  (a second name for the same thing is the state being retired); no
  per-path "if it starts with `/domain/` then…" shims.
- **`docs/deployment.md`** gains the drop instruction for the four
  databases in the same MR (the doc sweep may land the rest).

## Acceptance criteria

1. `git grep '/domain/'` over `packages/`, `e2e/`, `scripts/` returns
   nothing but historical prose in docs (history notes, retired-slate
   quotes). `src/mud/domain/` does not exist; `src/mud/world/` does.
2. `TITLE_ROOTS` is one exported constant with nine roots; `lint:untitled`
   reports zero; `lint:instanceable` accepts `/trade/smithing/obj/anvil`
   and rejects a `/trade/**` template naming a `/lib/` class (test).
3. Two new packs discover, order after `generic-objects`, install on a
   fresh database with every row `inserted` and every claim `granted`;
   `pack status` lists eighteen packs; `PackApi.orphans` is empty.
4. `RecipeCatalogue` serves the seven moved recipes from their `/trade/`
   documents; `craft` at the Hearthworks forge and kitchen produces
   the same outputs as before (crafting tests + drive).
5. The `hearthworks` venue rows resolve every `populates:` and station
   reference to the new paths (a boot with no "template not found"
   line; the venue's existing tests pass at the new paths).
6. `ParcelRegistry.grant` has no migration branch; `lint:core-gone` is
   green with zero `migration-note` sites; the wave-3 tests that
   exercised `migrated` are deleted or rewritten to `conflict`.
7. The boot guard: a database holding one `/domain/` content row makes
   `AppBootstrap.run` exit non-zero with the instruction (test over the
   harness store); a clean database boots.
8. `PersistenceManager`'s msh path migration is gone.
9. Both e2e configs green; the platform-only spec lands in `/world/void`
   (asserted by name now that the CI database is fresh).
10. Full suite, lint family, build green; the drive (D5) recorded on
    the MR with the wave-3 numbers beside the wave-4a ones.
11. Docs: content-packs.md (roots, the two packs, eighteen), parcel.md
    (branches gone), templates.md / document-store.md / command-spec.md
    (`/world/`, `/trade/`), crafting.md (recipes live in the trade
    packs), deployment.md (the drop); CLAUDE.md map + the file-naming
    section's `domain/` paths at the sweep.

## Cross-references

- Seeding slate: [content-packs-slate.md](../slates/builds/content-packs-slate.md)
  — Addenda 6 (`/trade/`), 17 (`/world/`), 24 (wave ordering), A16.1 /
  A16.3 (the re-cut, introduces-vs-commons), A23 (deferred to 4b).
- [content-pack-units.md](../slates/builds/content-pack-units.md) — the
  wave ordering restated; the bridge as a 4b gate.
- Subsystem docs: content-packs.md, parcel.md, templates.md,
  document-store.md, crafting.md, command-spec.md, deployment.md.
- Related: wave 3 (merged, MR !202) — the branches this wave deletes.
