# Content packs wave 3 — pack zero, and the end of `core` — requirements

Wave 3 is the hinge the content-packs slate names: **the platform
becomes a pack**. Every template row the engine ships is installed by
the same reconcile installer third-party content uses; `SeederManager`,
`GroupSeeder` and `ParcelSeeder` are deleted; the boot manifest leaves
`bootstrap.ts` for the packs that own the rows it clones; a pack
declares the structure it needs (`requires:` — groups that exist, title
it claims) and the registry grants it; and the `core` group — five jobs
wearing one name — is decomposed into seats, an office-owned group, and
nothing. After this wave the acceptance criterion the slate has carried
since Part 7 is falsifiable: *a Saxonberg with zero packs besides pack
zero boots, accepts a login, and lands in an honestly empty shell room
without erroring.*

Seeding slates: [content-packs-slate.md](../slates/builds/content-packs-slate.md)
(A22, A24, A25, A26.1, A27.2, Addendum 15), [core-decomposition-slate.md](../slates/builds/core-decomposition-slate.md),
[content-pack-units.md](../slates/builds/content-pack-units.md).
Load-bearing subsystem docs: [content-packs.md](../subsystems/content-packs.md),
[parcel.md](../subsystems/parcel.md), [access.md](../subsystems/access.md),
[governance.md](../subsystems/governance.md), [civics.md](../subsystems/civics.md).

## Goals

- **Every template row the platform ships is pack content.**
  `packages/server/src/mud/seeds/` is empty and deleted; every former
  seed row lives in a pack's `content/` tree, is installed by
  `PackApi.install`, and carries `sourcePack`. `SeederManager` is
  deleted.
- **Pack zero is installed by bootstrap through the ordinary installer.**
  The `platform` pack grows from the wave-2 seed into the platform: the
  controller templates, the registries and catalogues, the marshallers,
  the closed vocabularies, the Compact's institutions, the landing
  shell. Same reconcile path, same record, `principal: 'bootstrap'`.
- **The boot manifest is per-pack data.** What is cloned at boot is
  declared by the pack that ships the row, in a single reviewable
  `boot:` list with a role and a reason; `BootstrapManager` runs the
  union. `mud/bootstrap.ts` is gone.
- **A pack declares structure; the registry grants it.** `requires:`
  gains `groups:` (ensure-exists, empty) and `title:` (claims the
  registry grants at install). `GroupSeeder` and `ParcelSeeder` are
  deleted along with `config/groups.yaml` and `config/parcels.yaml`.
- **Every pack is staffed.** A maintainers group per pack, filled at
  install; pack diagnostics route to it, falling back to the ops queue
  only when unstaffed.
- **`core` is gone.** The group is never minted, `ownerOf` never returns
  it, no literal `'core'` survives outside a migration note, and the
  count of untitled paths reachable by a write verb is zero.
- **`AppBootstrap.run` reaches its seeding end-state:** connect →
  install → framework wiring → the warm/activate list. No seeder file
  exists.

## Non-goals

- **Renaming `/obj/`, `/domain/` → `/world/`, the `/trade/` branch, the
  hearthworks re-cut.** Wave 4's single path-surgery window (A24). This
  wave *owns* every `/obj/` row; it does not rename the namespace.
- **The locality packs** (eternal, terminus, lounge beyond its scripts,
  hearthworks, moor, practicum, substation). Waves 4–5. Their rows get
  a stamped transitional home this wave (D8) — not their real packs.
- **`requires.offices:` and `requires.kinds:`.** No pack this wave needs
  to declare an office (the five seats are code) or a document kind
  (no third-party pack exists). Both fit the `requires:` block later
  without redesign.
- **The lifecycle sequencer** (A11.5 — warm/activate as `dependsOn`
  data). Pure kernel refactor; any later build. The warm list stays
  hand-ordered.
- **Review-tier declaration and enforcement** (A10.8's third check),
  version machinery, cross-pack `dependsOn` validation, the `staged`
  record status, runtime uninstall, the media kind, signing. Later
  waves, as the slate lists them.
- **Lazifying the six content manifest entries into nothing.** This
  wave moves them out of the kernel manifest into their packs' `boot:`
  lists (D5). Each one's lazification is its own driven change, on the
  worklist, not a wave-3 deliverable.

## Surface decisions

### D1 — `core` decomposes into seats, an office-owned group, and nothing

The core-decomposition slate's audit stands: `core` does five jobs. Each
gets a different successor, and none of them is a group named anything.

| Job | Successor |
|---|---|
| 1. Default title holder (`ownerOf` → `{group: core}`) | **Nothing.** An untitled path is untitled: `ownerOf` returns `null`. |
| 2. Implicit owner of everything unparcelled (the ~20 write/clone/destruct/goto fall-throughs) | **Fail closed.** `AccessApi.can` denies on an untitled resource. The drain: every path a write verb can reach carries a real title by the end of the wave, and a script counts the ones that don't (D10). |
| 3a. `broadcast` authority | **The Prime Minister seat**, checked through `CompactApi.holdsOffice`. Authority and delivery stay separate: the delivery path must not depend on a healthy world. Never `isWizard`. An empty seat fails closed and says so. |
| 3b. `soul` authority | **The soul committee** — a `soul` group owned by `{office: prime-minister}`, holding **title to the emote extent** (D2b). `soul`'s mutating subcommands are gated by that title through `canAtPath`, like every other document write; read subcommands are ungated. `requiresCoreAccess` is deleted with its last two consumers. |
| 4. Author scope (`ensureAuthorGroups` = parcel-owner groups **+ core**) | Drop the `+ core`. `isAuthor` = *holds any title anywhere*. |
| 5. `:admin` / `coreMemberIds` | **Deleted** — the predicate, the per-dispatch precompute in `CommandLogic`, the `MqlContext` field, the mql.md/access.md lines. Its only consumer was a test. |

Residue: `AccessRegistry.seedCoreGroup` and `resolveCoreRef` deleted;
`Application.ts` test-character provisioning stops joining `core`; the
well-known-group name lists lose the entry; `ArmController`'s "public
ground" test becomes *ground under a government's jurisdiction with no
private title* (`governmentAt(address)` non-null, `ownerOf` null).

**Why not a state principal.** A `{kind: 'state'}` owner says the public
holds a thing and says nothing about who answers for it. The slate's
own test decides: *office when the answer must be one accountable
person; group when it is ongoing parallel work.* Seats already exist
with founder-default occupancy, public attribution and a logged
hand-off; that is the accountability model, and it applies to land
without inventing anything. The slate's Q1 worry — that `null` invites
every caller to invent a fallback — is answered by D10's count, not by
a principal.

### D2 — Title can be held by a seat

`ParcelOwner` gains a third kind, mirroring `GroupOwner`'s:

```
| { kind: "office"; office: string }
```

An office-held title resolves through `CompactApi.holdsOffice` on read
(founder default included), exactly as an office-owned group does.
`AccessApi.can` on an office-held resource admits the seat's holder;
`committeeOf` over an office-held parcel resolves to the seat.

The two parcels `core` holds today move to the seat:

- **`/compact`** → `prime-minister`. The state's publications namespace
  has one accountable speaker — the same holder `broadcast` checks.
- **`/studio`** → `prime-minister`. The sandbox namespace is
  governance-gated, not stewarded.

### D2b — The soul committee holds the emote extent

Emote packs are a starting point, not the catalogue. The in-game
authority over emotes is the **soul committee**: a managed group named
`soul`, owned by `{office: prime-minister}` (the `pack-installers`
shape), declared by the platform's `requires.groups`, holding title to
the emote document extent (the `expression` pack's root, `/expression`,
and any other emote-kind root a pack claims beneath it). That title is
the whole of its power, and it is enough for all three things the
committee does:

- **Which emote packs install.** Part 4b's precondition — a person
  installing must hold title to the covering parcel of every claim —
  means an emote pack's `requires.title` under `/expression` is
  grantable only by a soul-committee member (or bootstrap, for the
  shipped `expression` pack).
- **Modify an installed emote.** `soul set` writes the document; the
  three-way reconcile keeps the edit (`kept`) and raises a conflict if
  the pack later changes the same row — the committee's edit is never
  silently overwritten by a pack update.
- **Disable an emote.** `Emote` gains a `disabled` flag (the
  subject/board `archived` shape): a disabled emote is not dispatched
  and not listed, but the row stays so the reconcile sees a kept edit,
  not a vanished row. `soul disable <verb>` / `soul enable <verb>`.

`soul` keeps its full subcommand set; the only change is its gate —
title, not `core` membership. `SoulCatalogue` invalidates on a `soul`
write as it does on `pack sync` today.

### D3 — Pack zero's title is held by `pack-installers`

The platform pack declares `requires.title` for the extents it ships
under, and the holder is the **`pack-installers`** group — already
owned by `{office: prime-minister}`. That is the same shape every other
pack's maintainers group takes (D7): stewardship is group work, with an
accountable owner one hop up. The founder, PM by default, resolves as
the group's owner, holds the title, and is an author — which also
closes the wave-2 gap where the test-auth founder could not reach the
CMS.

Pack zero's claimed extents are the path-branch titles the platform
ships rows under: `/obj`, `/cmd`, `/home`, `/wiki` (the namespace
roots — `wiki-editors` keeps `/wiki`'s page-edit title as today; the
platform holds the zone rows), `/compact` and `/studio` via D2, and the
platform's own `root`. The planner enumerates them from the rows the
pack ships; a row under an extent the pack has not claimed is an
install error (the write-refused-outside-extent rule, Part 4b).

### D4 — `requires:` — groups-exist and title claims, and the registry grants

`pack.yaml` gains:

```yaml
requires:
  groups:
    - name: duncan-hall
      purpose: the landlord's staff
  title:
    - extent: /domain/eternal/duncan-hall/dorms
      landUse: residential
```

- **`groups:`** — ensure-exists, **empty**, owner `system` unless the
  entry names `{office: <key>}`. Membership is never declared here.
  The one exception the A22 split carves out: a membership row is
  legal iff the member is a **pack-shipped NPC under the pack's own
  extent** and the group is **pack-declared** (Katie in `duncan-hall`).
  A human id or a foreign group is refused structurally, at the
  requires-kernel gate.
- **`title:`** — a claim. The pack never writes a `parcels` row; the
  installer calls the gated `ParcelApi` path to grant it, with
  `landUse` / `areaM2` / `parentParcel` carried as today's
  `parcels.yaml` carries them. Holder = the pack's maintainers group
  (D7) unless the entry names `{office: <key>}` (D2).
- **Precondition.** A person installing holds title to the covering
  parcel of every claim (Part 4b). **Bootstrap is exempt**: it is the
  installing principal for shipped packs, and on a fresh database a
  shipped claim is granted outright. On an existing database a claim
  whose extent is already titled to *someone else* is a **`title`
  conflict** in the install record — reported by `pack status`, never
  a silent transfer. A claim already held by the same holder is
  `kept`.
- **Reconcile is bounded by current title** (CPS:308): a row whose
  nearest parcel is no longer held by the pack's holder is skipped and
  counted. Selling part of a district partially uninstalls the pack
  from it.
- **Unfilled is a legal state.** Install creates the structure and
  never blocks on it. The checklist derives on read; `pack provision
  <id>` walks it (this wave: a read-only listing of empty groups and
  unstaffed packs — the prompt-driven walk is D7's install ceremony).
- **Unknown manifest keys are an error.** `readManifest` stops
  silently ignoring keys it does not parse — a misspelled `requires`
  today installs nothing and says nothing.

`GroupSeeder`, `ParcelSeeder`, `config/groups.yaml`, `config/parcels.yaml`
are deleted. Their contents become `requires:` entries on the packs
that ship the rows (D8 for the localities; the corpo packs for the five
boards; the platform for `pack-installers`, `wiki-editors`, and its own
claims). Existing group and parcel rows on a deployed database are
**adopted** by the claims that name them (same holder → `kept`; same
name → the group is found, not minted), so a running deployment loses
nothing.

### D5 — The boot manifest is a per-pack `boot:` list

```yaml
boot:
  - template: /obj/AccessRegistry
    role: sync-read
    reason: every gated call reads it synchronously
    dependsOn: [/obj/GroupRegistry]
```

- One list per pack, in `pack.yaml`; never a per-row flag (the friction
  is the manifest itself, argued as one artifact — Addendum 15).
- `role` is closed at **`sync-read` | `producer`** this wave; `reason`
  is required prose. `dependsOn` is a list of template paths and may
  cross packs; `awaitInit` does not exist in YAML — a row that needs
  one is kernel-coupled and stays in code, and today **no entry needs
  one**, so `mud/bootstrap.ts` is deleted rather than shrunk. If the
  planner finds a genuine `awaitInit` residue, it stays in
  `BootstrapManager` as a code-declared entry, not in a YAML file.
- `BootstrapManager.run` reads the union of installed packs' `boot:`
  lists (from the install records, so a pack that failed to install
  contributes nothing), topo-sorts across packs as it does today, and
  keeps the wave-2 reuse-a-resident-singleton rule.
- The installer **reports** each pack's eager count by role at install;
  visibility, not a gate.
- The six content groupings in today's manifest (`/compact/press` +
  `/compact/executive`, the five corpos, `PressBoard`, the lounge
  terminal, dorm-warren, the Hinkley pair) move to the `boot:` list of
  whichever pack owns the row (the platform for the Compact rows and
  the PressBoard per A27.2; the corpo packs; D8's transitional pack for
  the three locality entries). Lazifying them off the list is the
  worklist, one at a time, driven — not this wave.

### D6 — Bootstrap installs the platform first, then every shipped pack

`AppBootstrap.run` becomes: framework wiring → connect (migrations
inside) → **`PackApi.install`** (platform first, then the shipped packs
in dependency order — `dependsOn: [platform]` is now honoured for
ordering, still not validated for existence) → `loadHooks` →
`CommandApi.preloadAll` → `BootstrapManager.run` → the warm/activate
list unchanged. No seeder call remains. The class doc-comment's
five-step story is rewritten to this one.

The disk fallback for command views goes to **zero**: the seven
`domain/eternal/**/cmd/` views are shipped by D8's pack, so the
"served from disk" line disappears and the legacy `mud/cmd` path in
`diskFallbacks()` is deleted.

### D7 — Staffing at install: a maintainers group per pack, ops as the fallback

Every pack has a maintainers group named `<id>-maintainers`, declared
implicitly (the installer ensures it; a pack may name a different
group in `maintainers:` — the platform names `pack-installers`).

- **A person installing** is prompted once — *you, or who?* — through
  `PromptApi` and becomes the first member unless they name someone.
- **Bootstrap installing** a shipped pack fills nothing; the group
  exists empty, and the pack is *unstaffed*.
- **Routing is the enforcement.** Pack diagnostics and reconcile
  conflicts route to the maintainers group; an unstaffed pack's route
  to the ops queue — the `pack-installers` committee, PM-owned, per
  A25 ("ops chief" is whoever holds the seat that owns the committee).
  `pack status` shows staffing. No gate, no tombstone.
- Ops owns *that* every pack is staffed, never *who* governs its
  content; after first fill, membership rides the group's own
  procedures (`group add`).
- **Wizardness gates TypeScript and nothing else** (A22.1). Install
  authority is office + title (`requiresPackInstaller` as today);
  staffing and membership never consult `isWizard`.

### D8 — Where every seed row goes

Own, don't rename: every row keeps its template path this wave.

| Rows (`seeds/`) | Home |
|---|---|
| `obj/command/**` (216 controller templates) | **platform** |
| `obj/*Registry`, `*Catalogue`, `CentralBank`, `PressBoard`, `StreamState`, `StreamRelay`, `WikiRenderer`, `EventSubscriptions`, `EventRegistry`, `HelpCatalogue`… (the singletons) | **platform** — and they are its `boot:` list |
| `obj/persistence/` (marshallers), `modalities/`, `LocomotionMode/`, `hooks/`, `sandbox/`, `Avatar/`, `FolderZone`, `Locality` root, `*Update` rows | **platform** |
| `obj/Topic/`, `obj/Discipline/`, `obj/Condition/`, `obj/CombatFormation/` | **platform** (closed / amendment-tier vocabularies) |
| `obj/Locality/` + `obj/Government/` realm and city rows | **platform** (A27.2: the Compact is the constitution) |
| `obj/Locality/` + `obj/Government/` per-locality rows | **world-seed** (below) |
| `obj/{items,arms,armor,clothes,gear,vessel,fixture,instrument,traps,pot,plant,seed,crop,bed,surface,exits}/` + the loose objects (`Campfire`, `Forge`, `Kiln`, `Oven`, `CookPot`, `Coin`, `Key`, `Scrap`, `PaymentCard`, `AetherImplant`, `Corpse`, `Casting`) | **generic-objects** (`root` widens from `/generic-objects` to admit `/obj/**` rows — the pack's `root:` is where its *documents* live; template rows are path-addressed and title-bounded, so generic-objects claims title to the `/obj/<cluster>` branches it ships) |
| `obj/room/` archetypes | **generic-objects** |
| `obj/species/` (4) | **species-and-names** |
| `obj/corpo/` (3 marks) + `seeds/corpo/` (5 org charts) | the five **corpo packs** |
| `obj/lounge.yaml` | **saxonberg-lounge** |
| `seeds/compact/`, `seeds/wiki/` (namespace zones), `home.yaml`, `studio.yaml`, `wiki.yaml`, `domain/void.yaml` | **platform** |
| `seeds/domain/**` (eternal, terminus, lounge, hearthworks, moor, practicum, substation, common — 158 rows) + `domain/eternal/**/cmd/` (7 views) | **world-seed** |

**`world-seed`** is a transitional, bootstrap-installed pack the slate
did not name. It exists so `SeederManager` can die this wave without
the locality content sitting in the platform under a false owner. It
holds the locality rows verbatim, the `requires.groups` for
`duncan-hall`, `hinkley-hills`, `terminus`, `lounge`, the fifteen
locality title claims from today's `parcels.yaml`, Katie's NPC
membership row, and the three locality `boot:` entries. Its manifest
says in its description that it is deleted piecewise as waves 4–5 home
each locality. `base-library` is untouched.

Title holders for the claims that move out of `parcels.yaml`:
`/corpo/<key>` → `<key>` (the board, as today); the locality extents →
their groups as today, held under `world-seed`'s maintainership until
their packs land; `/wiki` → `wiki-editors`.

### D9 — Adoption is the migration

No data migration is written. The domain kind adopts an unstamped row
at the same `path` (the wave-2 bridge), so the first boot on a deployed
database adopts every former seed row into its pack and stamps it —
`inserted 0, adopted N`; the second boot is all-zero. Groups and
parcels adopt by name / extent (D4). A row that exists in the database
under no pack's tree after install is an **orphan**, reported by `pack
status` per the slate's inventory rule (*the migration is also the
inventory*) — kept, never deleted, listed.

### D10 — The acceptance test for "core is gone" and "the platform ships clean"

Two scripts, both CI-gating:

- **`lint:core-gone`** — no literal `'core'` in `packages/server/src`
  or `packages/content` outside a line carrying a migration-note
  marker; `ParcelOwner`'s kinds are `group | player | office`; no
  `requiresCoreAccess` module; no `coreMemberIds`.
- **`lint:untitled`** — walks every template path a write-capable verb
  can reach (the trees under the parcel registry's coverage: `/obj`,
  `/domain`, `/cmd`, `/compact`, `/studio`, `/wiki`, `/home`, `/corpo`)
  against the shipped packs' `requires.title` claims and reports the
  paths no claim covers. Zero is green.

And the criterion itself, as a ring-3 (e2e) test, not a kernel test:
install **only** the platform pack (an env/flag the installer honours),
boot, log in with the test founder, and observe the landing shell room
— the void/world shell that pack zero ships with the `startLocation`
settings default (A26.1). No error in the boot log; `pack status` lists
one pack.

## Constraints

- **A pack may claim; only the gated registry grants.** No pack file
  ever becomes a `parcels` or `groups` row by copy. The installer is
  the one caller; the supply-chain-spoof reasoning in parcel.md is the
  reason.
- **Check offices, never the founder.** Every new authority check is
  `holdsOffice` / group-owner resolution; the founder is the default
  holder, never a name in code.
- **Nothing a pack installs lives under `/lib/`** (`lint:instanceable`
  unchanged).
- **Own, don't rename.** No template path changes this wave; the
  module-id ↔ template-path mirror and every `findByTemplatePath`
  literal stay valid.
- **Never half-grown.** An empty group, an unstaffed pack, an untitled
  orphan row are all legal, reported states — never boot failures.
  The only boot failures are the ones today's installer already
  raises (a class that does not resolve, a malformed manifest).
- **Player homes are never touched by reconcile.** The dorm rows move
  packs; the `holder_snapshots` / per-instance state under them is
  not pack content and no reconcile or vanish policy may reach it.
- The four-Mongo-database rule and the one-branch-one-worktree rules
  hold for the drive as in wave 2.
- **Go through the Api layer**, antipatterns.md as the sieve; no new
  module category; the `XApi`↔`XLogic` split preserved for any new
  surface (`ParcelApi` grows a grant seam, `PackApi` grows
  `provision`).

## Acceptance criteria

1. `packages/server/src/mud/seeds/`, `mud/bootstrap.ts`,
   `backend/SeederManager.ts`, `GroupSeeder.ts`, `ParcelSeeder.ts`,
   `mud/config/groups.yaml`, `mud/config/parcels.yaml` do not exist.
   `AppBootstrap.run` calls none of them.
2. Fresh database: bootstrap installs the platform then every shipped
   pack; every former seed row is present in `content` with
   `sourcePack`; every registry the old manifest cloned is resident;
   the founder logs in and lands in the lounge (the lounge pack's
   `startLocation` contribution wins over the platform's shell).
3. Existing dev database (`saxonberg_build1`): first boot adopts
   (`inserted 0`, `adopted` = the row count per pack), grants no new
   title over an existing one, mints no duplicate group; second boot
   is all-zero on every pack. Driven, with the boot lines recorded in
   the MR.
4. `pnpm test:e2e` platform-only boot (D10) passes: login lands in the
   shell room, no boot error, `pack status` lists one pack.
5. `lint:core-gone` and `lint:untitled` exist, run in CI, and are green.
   `ownerOf` never returns a group named `core`; `:admin` is absent
   from the MQL grammar and docs.
6. `ParcelOwner.office` is exercised: `/compact` and `/studio` are
   PM-held; a non-founder cannot write under them; the founder can;
   handing the seat off (`office` verb) moves the capability with it.
   Tests cover the resolve path and the fail-closed empty seat.
7. `broadcast` is PM-gated; `soul` mutations are title-gated (a soul
   member edits and disables an emote, a non-member is refused, a
   disabled emote neither dispatches nor lists, a later pack change to
   an edited emote is a conflict not an overwrite); `requiresCoreAccess`
   is gone; the test-auth founder can reach the CMS and edit a command
   view (the wave-2 undriven item), driven. Installing a second emote
   pack as a non-member of `soul` is refused at the title precondition.
8. `requires.groups` / `requires.title`: tests cover ensure-exists,
   adopt-by-name, the NPC-only membership fence (Katie admitted; a
   human id refused; a foreign group refused), grant on a fresh
   database, `kept` on a same-holder claim, `title` conflict on a
   foreign holder, and reconcile skipping a sold extent. Unknown
   manifest keys fail the manifest read.
9. `boot:` lists: tests cover the union across packs, cross-pack
   `dependsOn`, the reported eager counts, and that a failed pack
   contributes no entries. The seven eternal views are store-served;
   the disk-fallback line no longer prints.
10. Staffing: a person's `pack install` prompts and fills the
    maintainers group; a bootstrap install leaves it empty and `pack
    status` shows *unstaffed*; a diagnostic on an unstaffed pack
    routes to `pack-installers`.
11. `pack provision <id>` lists empty required groups and staffing.
12. Docs: content-packs.md (the manifest schema, `requires:`, `boot:`,
    staffing, the platform-only criterion, the pack table), parcel.md
    (the office owner kind), access.md (author scope, the deleted
    axis, no `core`), governance.md (seat-held title), mql.md (`:admin`
    removed), the CLAUDE.md map line and collection list at the sweep;
    the core-decomposition slate retires into parcel.md/access.md; the
    content-packs slate stays (waves 4–5).
13. One full `pnpm test` green after the last source change; the lint
    family green; `pnpm build` type-clean.

## Cross-references

- Seeding slates: content-packs-slate.md (A22.1–A22.3, A24, A25, A26.1,
  A27.2, Addendum 15 boot manifest, Part 4b, Part 7, Part 9),
  core-decomposition-slate.md, content-pack-units.md, pack-seams-slate.md
  (the annex-knows-the-host rule, unchanged).
- Subsystem docs: content-packs.md, parcel.md, access.md, governance.md,
  civics.md, document-store.md, command-routing.md, persistence.md.
- Prior requirements: content-pack-wave-2 (retired; D6, D12, D15 are
  the precedents this wave builds on).
