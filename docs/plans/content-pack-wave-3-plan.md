# Content packs, wave 3 — pack zero, and the end of `core` — implementation plan

**Feature branch:** `design/content-pack-wave-3` (build on it directly; it carries the requirements and this plan; push every step).
**Requirements:** `docs/requirements/content-pack-wave-3-requirements.md` (closed scope; D1–D10 + D2b/D2c/D2d and the thirteen acceptance criteria are the contract).
**Subsystem baseline:** `docs/subsystems/content-packs.md` (the wave-2 installer), `parcel.md`, `access.md`, `governance.md`, `civics.md`, `document-store.md`, `emotes.md`, `command-routing.md`, `diagnostics.md`, `record-layer.md`, `testing.md`.
**Precedent:** the retired wave-2 plan (`git show 84085ab42^:docs/plans/content-pack-wave-2-plan.md`) — this plan matches its shape.

This plan is self-contained: a fresh build agent who has read CLAUDE.md, the requirements and the docs above can execute it top to bottom. Every step leaves the tree green (`pnpm build` type-clean, `pnpm test:near`, the lint family), is one or more commits, and is a legitimate stopping point (see **Stop protocol**). The requirements decide WHAT; where this plan decides HOW it says **planner's choice** so the reviewer can see the seam.

Conventions that bind every step:

- Installer logic stays module-private in `packages/server/src/mud/obj/api/PackLogic.ts`; public `PackLogic` methods carry `@CallSecurity(SecurityPolicies.FromModule('/api/pack#PackApi'))`; `PackApi` (`mud/api/pack.ts`) stays a thin decorated shell + call-shape types. **No new Api classes** — `ParcelApi`, `AccessApi`, `GroupApi`, `SoulApi`, `PackApi`, `DiagnosticApi` grow methods; `PackApi` grows `bootManifest`, `provision`, `staff`, `maintainersOf`, `orphans`, `reprovision`. No new module categories; the two new lint scripts live under `packages/server/scripts/` on the `check-test-content.ts` shape (walk + exported pure `classify` + `--lint` mode + a `scripts/__tests__/` test).
- Every DB write rides `PersistApi` or a `Document.save()` reached through an Api (`lint:pm`). Groups are written through `GroupApi`, parcels through `ParcelApi` — never a `new ParcelRecord().save()` in `PackLogic`.
- Every test touching the wired runtime imports `test-bootstrap` first (`lint:test-bootstrap`). Installer tests use ugly fixture packs through `mud/obj/api/__tests__/pack-harness.ts`, never the real packs.
- Stage by name (`git add <path>`), never `add -A`. **`git mv` stages immediately — do a move only immediately before the commit meant to hold it**, and never leave a moved file in the index across an unrelated commit. **ONE MR** for the whole build; push after every commit.
- Commit shape: `feat(pack): …` / `feat(parcel): …` / `feat(access): …` / `refactor(bootstrap): …` / `feat(social): …` / `chore(lint): …` / `docs(pack): …`. A seeder retirement is **one commit** that deletes the seeder, its `AppBootstrap.run` call, its config file / seed dir, and adds the pack files — revertable as a unit.
- Per step: `pnpm build`, `pnpm test:near`, and the lint family — `lint:gates`, `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:pm`, `lint:test-bootstrap`, `lint:arg-kinds`, `lint:topics`, `lint:test-content`, plus `lint:core-gone` and `lint:untitled` once they exist (step 10 onward). The full `pnpm test` runs **once**, at step 12.
- The strangler rule that orders steps 4–7: `SeederManager`, `GroupSeeder`, `ParcelSeeder` keep running insert-only on whatever is still in `seeds/`, `groups.yaml`, `parcels.yaml`; each pack landing removes its rows/entries from those; the three seeders are deleted in the commit that empties the last file (step 7). The installer and the seeders touch disjoint sets at every commit, exactly as wave 2 left them.
- The dev DB is `saxonberg_build1`; adoption is the migration (D9) — no migration script anywhere in this build.

Three cross-cutting mechanics the plan relies on, stated once:

- **The covered-extent rule** (planner's choice, the reading of Part 4b that makes the corpo and library packs work without twenty path-branch claims): a pack's row is *covered* if its path lies under an extent claimed by **this pack** or by a pack in its **transitive `dependsOn`** (the annex-knows-the-host rule). The static check runs at `gatePack` against the manifests (a `requires-kernel`-step failure named `coverage`); the bounded-reconcile check (CPS:308) compares the covering parcel's *current* holder against the same set of holders (this pack's maintainers + its claims' holders + its hosts') and skips-and-counts a row whose extent was sold. Bootstrap is exempt from the *precondition* (who may claim), never from the coverage check. Every shipped pack that ships template rows and depends on nothing gains `dependsOn: [platform]` this wave (base-library, species-and-names, arcane-descriptors, newbie-wilds) — the platform claims `/obj` and `/domain`, so their rows are covered by the host.
- **There is no implicit root claim.** Every claim is an explicit `requires.title` entry (D3's "the platform's own `root`" is the entry `- extent: /platform`). A document-only pack whose `root` sits under a host's claim needs no claim of its own (`wiki-starter` under `/wiki`). This is what lets `world-seed` and `saxonberg-lounge` both name `/domain/lounge` with the same holder (`kept`) instead of colliding on a root.
- **The registry-at-boot ordering.** `ParcelRegistry` and `GroupRegistry` are manifest singletons cloned by `BootstrapManager.run` *after* `PackApi.install`. The requires phase therefore runs **after** a pack's rows are written (so the platform's own `/obj/ParcelRegistry` row exists) and reaches the registries through `StuffApi.singleton(...)` (mint-if-absent — the wave-2 wiki-registry precedent; `BootstrapManager` already reuses a resident singleton). `ParcelLogic`'s graceful no-registry degradation stays for reads; the grant path mints.

---

## Step 1 — `ParcelOwner.office` + the group's owner holds what the group holds (D2)

Commits: `feat(parcel): the office-held title kind (ParcelOwner.office)` · `feat(access): a group's owner holds what the group holds`.

### 1.1 `lib/parcel/ParcelRecord.ts`

```ts
export type ParcelOwner =
  | { kind: "group"; name?: string; ref?: GroupRef }
  | { kind: "player"; templatePath: string }
  | { kind: "office"; office: string };
```
Doc comment: an office-held title resolves through `CompactApi.holdsOffice` on read (founder default included), mirroring `GroupOwner.office`. No fieldMeta change (the field is already persistent).

### 1.2 `obj/AccessRegistry.ts`

- `subjectIsOwnerMember(subject, memberKey, owner)`: add `case 'office'` → `CompactApi.holdsOffice(subject, owner.office)`. For `group`: `GroupApi.isMember(memberKey, ref) || GroupApi.ownsGroup(subject, group)` — **planner's choice, required by D3** ("the founder, PM by default, resolves as the group's owner and so holds the title"): the group's owner (an office holder, or a player owner) holds every title the group holds. Load the `Group` by ref through `GroupApi` (add `GroupApi.groupOf(ref): Promise<Group | null>` → `GroupLogic` → the managed provider, if no equivalent exists; check `ManagedGroupProvider` first).
- `subjectHasOwnerRole` (the `canMutateZone` dispatch): the same two additions — an office holder, or the group's owner, counts as `'owner'`.
- `ParcelRegistry.resolveOwnerRef` / `resolveRefImpl`: an `office` owner returns `null` (no group). `groupOwnerRefs` skips it.
- `CompactLogic.committeeOfImpl`: `CommitteeView` becomes a discriminated union — `{ kind: 'group'; name; groupRef } | { kind: 'office'; name: <office>; office }` (**planner's choice**: D2's "resolves to the seat"). `isCommitteeMember` for the office arm → `holdsOffice`; `committeeMembersOf` → the holder (one Stuff, if online) or `[]`; `committeeChannelOf`/`ensureCommitteeChannel` → null for the office arm (no committee channel for a seat). Grep every consumer of `committeeOf` (`EmploymentLogic` `holdsAuthority`, `PressLogic`, the `government`/`office` verbs) and switch on `kind`.
- `ParcelLogic` (`STATE_OWNER` degraded path) and `PersistableLogic.ownerString` gain the office case: `office:<key>` as the record-owner sentinel.
- `EvalController.holdsParcel` (~L247) gains the office arm (`holdsOffice`).

### Tests (step 1)

- `mud/obj/__tests__/AccessRegistry.office-owner.test.ts` (stub `ParcelApi.ownerOf`, `CompactApi.holdsOffice`, `GroupApi.isMember`/`ownsGroup`): office-held path admits the seat holder and refuses a non-holder; an **empty seat fails closed** (holdsOffice false); a group-held path admits the group's owner; `canMutateZone` on an office-held zone admits the holder.
- `CompactLogic.test.ts`: `committeeOf` over an office-held parcel returns the office arm; `isCommitteeMember` uses `holdsOffice`.
- `ParcelRegistry.test.ts`: `resolveOwnerRef({kind:'office'})` is null.

*Exit: the seat can hold title; nothing holds one yet.*

---

## Step 2 — `ParcelApi.grant` + `GroupApi.ensureGroup` (the two registry seams the installer will call)

Commit: `feat(parcel): ParcelApi.grant — the installer's title seam; GroupApi.ensureGroup`.

### 2.1 `ParcelApi.grant(claim)` → `ParcelLogic.grant` → `ParcelRegistry.grant`

```ts
export interface TitleClaim {
  extent: string;
  holder: ParcelOwner;
  parentParcel?: string;
  landUse?: LandUse;
  areaM2?: number;
}
export type TitleGrantOutcome = 'granted' | 'kept' | 'conflict' | 'migrated';
```
`ParcelRegistry.grant(claim): Promise<{ outcome, holder: ParcelOwner }>` (gated `ParcelApiCallers`, `assertFieldMutation`): find by extent (trie handle first, then `findByExtent`); absent → write the row (`ParcelSeeder`'s body moved in: `extent`, `zonePath = extent`, `owner`, `parentParcel`, `setLandUse`, `area`), `appendEvent('grant', extent, null, holder)` (the `ParcelEvent.kind` union grows `'grant'`), `reindex` → `granted`; present with the **same holder** (compare `kind` + `name`/`office`/`templatePath`; a `ref`-only group owner compares by resolved ref) → `kept`; present with a different holder → `conflict` (no write); present and held by `{kind:'group', name:'core'}` → `transfer` to the claim's holder with a `transfer` event and one log line → `migrated`. **Planner's choice, flagged loudly:** the `core`-held case is the one data touch the wave needs — without it the dev DB's `/studio` and `/compact` rows stay `core`-held and criterion 6 cannot hold on `saxonberg_build1`; criterion 3's "grants no new title over an existing one" is read as *over an existing one held by someone real*. The `'core'` literal in this branch carries the `// migration-note:` marker `lint:core-gone` exempts, and the branch is deleted in wave 4. `LandUses.isLandUse` / `areaM2 > 0` validation moves here from `ParcelSeeder.#validate`.

`ParcelApi.grant` is as exposed as `transfer` is today (a public static; authority is the caller's business); its doc comment names the installer as the one caller.

### 2.2 `GroupApi.ensureGroup(name, owner: GroupOwner): Promise<{ ref: GroupRef; created: boolean }>`

→ `GroupLogic.ensureGroup` → `registry.managed()`: find by name; absent → mint (`GroupSeeder`'s body moved in). Never touches members. Also `GroupApi.ensureMember(ref, memberKey, role): Promise<boolean>` (the `addMember` + `save` + `fireChange` shape from `GroupController.executeAdd`), gated to the installer's caller chain (`@CallSecurity(FromModule('/obj/api/PackLogic#PackLogic'))` on the `GroupLogic` method — the wave-2 `installSubject` precedent); `lint:gates` validates the string.

### Tests (step 2)

- `ParcelRegistry.grant.test.ts`: fresh extent → row + `grant` event + trie; same holder → `kept`, no event; foreign holder → `conflict`, row untouched; `core`-held → `migrated`, `transfer` event, holder replaced; malformed `landUse` throws.
- `GroupLogic.test.ts`: `ensureGroup` mints once, finds on the second call; `ensureMember` idempotent; `ensureMember` refused from a non-installer caller.

---

## Step 3 — the manifest grows: `requires:`, `boot:`, `maintainers:`; the requires phase; the boot union; `SAXONBERG_PACKS` (D4, D5, D7, D10)

Commits: `feat(pack): requires.groups / requires.title / maintainers — the registry grants what a pack declares` · `feat(pack): boot: lists; BootstrapManager runs the union` · `feat(pack): SAXONBERG_PACKS install filter`.

### 3.1 `mud/api/pack.ts`

```ts
export interface RequiredGroup { name: string; purpose: string; owner?: { office: string }; members?: { id: string; role?: GroupRole }[] }
export interface RequiredTitle { extent: string; holder?: { group: string } | { office: string }; landUse?: string; areaM2?: number; parentParcel?: string }
export interface PackRequires { groups: RequiredGroup[]; title: RequiredTitle[] }
export interface PackBootEntry { template: string; role: 'sync-read' | 'producer'; reason: string; dependsOn?: string[] }
export interface PackManifest { …; requires: PackRequires; boot: PackBootEntry[]; maintainers: string /* default `${id}-maintainers` */ }
```
`PackReconcileResult` gains `requires: { groupsCreated: string[]; groupsFound: string[]; titlesGranted: string[]; titlesKept: string[]; titlesMigrated: string[]; titleConflicts: string[]; membersAdded: string[]; skippedSold: string[] }`, `boot: Record<'sync-read' | 'producer', number>`, `staffed: boolean`. `PackConflict.reason` gains `'title'`. `PackInstallRecord` gains `requires: PackRequires` and `boot: PackBootEntry[]` (the record is what `bootManifest()` and the nightly `reprovision()` read — a failed pack writes `boot: []`). `PackStatusReport` gains `maintainers: { group: string; staffed: boolean }` and `titleConflicts: string[]`.

### 3.2 `readManifest` (`PackLogic.ts` ~L285)

- **Unknown keys are an error**: the known set is `id, version, description, dependsOn, root, requires, boot, maintainers`; anything else throws `PackApi: manifest at … has an unknown key 'requries' (known: …)`.
- `requires.groups[]`: `name` non-empty; `purpose` required prose; `owner` absent or `{office}`; `members[]` ids strings. `requires.title[]`: `extent` absolute; `holder` absent (→ the maintainers group), `{group}` or `{office}`; `landUse` validated against `LandUses.ALL` at read.
- `boot[]`: `template` absolute; `role` ∈ the closed pair; `reason` non-empty; `dependsOn` string[]. No `awaitInit` key is accepted (an unknown key).
- `maintainers` defaults to `<id>-maintainers`.

### 3.3 The requires phase (module-private `applyRequires(rp, record, principal)`, called from `reconcilePack` **after** `applyKindPlan` and before `saveRecord`)

1. **Groups.** `GroupApi.ensureGroup(maintainers, {kind:'office', office:'prime-minister'})` (**planner's choice**: every maintainers group is PM-owned — D3's "the same shape every other pack's maintainers group takes"); then each `requires.groups` entry with owner `system` or `{office}`. Existing names are found, never re-owned (adopt-by-name).
2. **The NPC-only membership fence** (at `gatePack`, step `requires-kernel`): every `members[].id` must be (a) a template path in this pack's `content.domain` and (b) under one of this pack's own `requires.title` extents; the group must be one of this pack's own `requires.groups`. Otherwise the pack fails pre-write with a message naming the id and the rule. Passing rows → `GroupApi.ensureMember`.
3. **Titles.** For each claim: holder = `{kind:'group', name: maintainers}` unless `{group}` (must be declared by this pack or a `dependsOn` pack — else `requires-kernel`) or `{office}`. **Precondition** (principal ≠ `bootstrap`): `AccessApi.canAtPath(actor, 'write-template', extent)` against the *covering parcel of the claim* — refused → the pack fails at step `requires-kernel` naming the extent. Then `ParcelApi.grant(claim)` → outcome into the result; a `conflict` lands in `record.conflicts` as `{ path: extent, kind: 'title', reason: 'title', … }` plus one diagnostic on channel `pack.<id>` (the existing conflict loop).
4. **Coverage** (at `gatePack`): every domain-row path and every document path of the pack lies under a claim of this pack or of a transitive `dependsOn` pack (manifests only — `discover()` already has them all). Failure step `requires-kernel`, message `row /obj/foo is outside every extent 'x' or its hosts claim`.
5. **Bounded reconcile** (in `computeKindPlan`, domain kind only): if a resident `ParcelRegistry` exists, `coveringParcelOf(path)`'s holder ∉ the pack's holder set → `{ op: 'skip-sold', key }` (new `PackPlannedAction['op']`), counted into `result.requires.skippedSold`, never written. No registry → unbounded.
6. `record.requires = manifest.requires; record.boot = manifest.boot`. Report: `result.boot` counts by role; `result.staffed = (await GroupApi.membersOf(maintainersRef)).length > 0`.

`AppBootstrap`'s boot line grows: `…, requires: N group(s) (M created), T title(s) (G granted, K kept, C conflict), boot: S sync-read + P producer, staffed|UNSTAFFED`.

### 3.4 `PackApi.bootManifest(): Promise<BootstrapEntry[]>` and `BootstrapManager`

- `PackLogic.bootManifest`: every `pack_installs` row with `status: 'applied'` → its `boot[]` mapped to `{ templatePath: e.template, dependsOn: e.dependsOn }`. A template listed by two packs is an error naming both (**planner's choice** — dedupe would hide a real disagreement).
- `BootstrapManager.run(manifest?: BootstrapEntry[])`: `manifest ?? [...bootstrapManifest, ...(await PackApi.bootManifest())]` **during the transition** (steps 3–6 — the code manifest shrinks as packs take entries; a path present in both is the duplicate error, so each move is one atomic edit); at step 7 the code manifest is gone and the default is the pack union alone. The `import { bootstrapManifest } from '../mud/bootstrap'` is removed at step 7. `BootstrapEntry` stays in `BootstrapManager.ts` (`templatePathPrefix`/`awaitInit` stay as code-only shape; no YAML exposes them — D5).
- `AppBootstrap.run` order (D6): `installFrameworkWiring` → marshaller seam → connect → **`PackApi.install()`** → `loadHooks` → `preloadAll` → `installOnlineHoldersProvider` → `BootstrapManager.run()` → the warm/activate list unchanged. `SeederManager.run()` stays *for now* (still before install), `GroupSeeder`/`ParcelSeeder` stay after `loadHooks` — both die at step 7. The class doc-comment is rewritten at step 7.
- `orderByDependsOn`: `platform` sorts first regardless (a stable tiebreak), then the topo order; still no existence validation.

### 3.5 `SAXONBERG_PACKS` (the D10 installer flag — **planner's choice**: an env var, read by `discover()`)

`SAXONBERG_PACKS=platform` (comma-separated ids; unset = all discovered) filters *after* ordering; an id not discovered throws at boot (`PackApi: SAXONBERG_PACKS names 'x', which no shipped pack provides`). Read via `process.env` inside `PackLogic` (obj/api — the importing tier; an ambient global is not an import, per `lint:imports`). Documented in the `pack.yaml`/boot section of content-packs.md at step 12.

### 3.6 `PackApi.provision(packId)` (read-only, D4) and `PackApi.staff(packId, memberPath)`, `PackApi.maintainersOf(packId)`

- `provision` → `{ maintainers: {group, staffed, members}, groups: [{name, members: n}], titles: [{extent, holder, outcome}] }` from the record + live registry reads. `PackController` gains `case 'provision'` printing it; `pack.yaml` (the `author/pack.yaml` view) gains the subcommand.
- `staff(packId, memberPath)` → `GroupApi.ensureMember(maintainersRef, memberPath, 'member')`; `maintainersOf(packId)` → `{ group: GroupRef; staffed: boolean; fallback: GroupRef /* pack-installers */ }`.

### Tests (step 3)

- `PackLogic.requires.test.ts` (harness gains `writeManifest(root, extra)` and in-memory `groups`/`parcels` stores with `GroupApi.ensureGroup`/`ParcelApi.grant` spied through to them): ensure-exists (created once, found on the second install — **adopt-by-name**); a maintainers group per pack, PM-owned, empty after a bootstrap install (`staffed: false`); grant on a fresh store; `kept` on a same-holder claim; `title` conflict on a foreign holder (recorded, diagnosed, no write); `migrated` over a `core`-held row; the NPC fence — an NPC under the pack's claim admitted, a `/obj/Avatar/x` id refused, a foreign group refused, an NPC outside the claim refused; a claim naming an undeclared group refused; coverage — a row outside every claim fails, a row under a `dependsOn` host's claim passes; bounded reconcile — a sold extent's row is `skip-sold`; the non-bootstrap precondition (stub `canAtPath` false → refused); **unknown manifest key fails at `read`**.
- `PackLogic.boot.test.ts`: two fixture packs' `boot:` union with cross-pack `dependsOn` topo-sorts; a failed pack contributes no entries; eager counts by role reported; a template listed twice is an error; `readManifest` rejects a bad `role` / missing `reason` / an `awaitInit` key.
- `backend/__tests__/BootstrapManager.test.ts` (existing): a case for the union default.
- `PackLogic.discover.test.ts`: `SAXONBERG_PACKS` filters; unknown id throws; `platform` sorts first.
- `PackController.test.ts`: `pack provision` prints groups/staffing/titles.

*Exit: the machinery exists; nothing declares anything yet.*

---

## Step 4 — the platform pack becomes pack zero (D3, D5, D8): the `git mv` wave, the claims, the `soul` group, the boot list

Commits (in this order; each green): `refactor(pack): template walk = every content/*.yaml outside the declared kind dirs` · `feat(pack): platform — controller templates, singletons, vocabularies, marshallers, Compact rows, namespace zones (git mv)` · `feat(pack): platform requires: pack-installers, wiki-editors, soul; the platform's claims; its boot list`.

### 4.1 The template walk (`readContent` ~L494) — **planner's choice**

The two enumerated roots (`obj`, `domain`) become *every `.yaml` under `content/` except the declared non-template dirs*: `cmd` (any depth), `settings`, `subjects`, `descriptor-banks`, `quantity`, and every `DOCUMENT_KINDS[k].contentDir` whose `ext` is `yaml` (`emotes`, `recipes`, `blueprints`, `name-banks`, `releases`). `msh/` holds `.msh` and `wiki/` holds `.md`, so `content/wiki/*.yaml` (the namespace *zone* rows) and `content/wiki/<ns>/*.md` (pages) coexist by extension. This is what lets `/corpo/<key>`, `/compact/*`, `/wiki/*`, `/home`, `/studio` ship as `content/corpo/aevex.yaml`, `content/compact/press.yaml`, `content/wiki/main.yaml`, `content/home.yaml`, `content/studio.yaml` with their paths unchanged (own, don't rename). `lint:instanceable` already treats every `content/**/*.yaml` as a template — verify it does not choke on `settings/*.yaml` (it walks by `class:`; a settings file has none — check `check-instanceable-placement.ts`'s parse and skip files without `class`, if it does not already).

### 4.2 The moves (one `git mv` commit; ~530 files)

From `packages/server/src/mud/seeds/` to `packages/content/platform/content/`:
- `obj/command/**` (216) → `obj/command/**`.
- Every top-level `obj/*.yaml` **except** `lounge.yaml` and the twelve loose objects D8 gives generic-objects (`Campfire`, `Forge`, `Kiln`, `Oven`, `CookPot`, `Coin`, `Key`, `Scrap`, `PaymentCard`, `AetherImplant`, `Corpse`, `Casting`) → the singletons (`*Registry`, `*Catalogue`, `CentralBank`, `PressBoard`, `StreamState`, `StreamRelay`, `WikiRenderer`, `EventSubscriptions`, `EventRegistry`, `HelpCatalogue`, …), `FolderZone`, `Locality` (the root row), `*Update`.
- `obj/{persistence,modalities,LocomotionMode,hooks,sandbox,Avatar,Topic,Discipline,Condition,CombatFormation}/` (32+7+11+1+2+1+37+41+15+4).
- `obj/Locality/{terminus,terminus-city}.yaml` + `obj/Government/{terminus-realm,terminus-city}.yaml` (the realm and city — **confirm by reading each row's parent**; the ten remaining Locality rows and two Government rows are per-locality and wait for step 7).
- `compact/{press,executive}.yaml` → `compact/`; `wiki/{main,guide,lore,snippet}.yaml` → `wiki/`; `home.yaml`, `studio.yaml`, `wiki.yaml`, `domain/void.yaml` → the same relative places.

`SeederManager` keeps inserting whatever remains (`obj/lounge.yaml`, the generic clusters, species, corpo, the ten localities, `domain/**`). On the dev DB every moved row is **adopted** (`inserted 0, adopted ~460`) — the domain kind's `dbKeyQuery` by path is the bridge.

Repoint the readers of the moved files in the same commit: `mud/lib/persistence/__tests__/quantity-marshaller-seeds.test.ts` (`SEEDS_DIR` → the platform's `content/obj/persistence/QuantityMarshaller`), `mud/api/__tests__/controller-seeds.integrity.test.ts` (`CMD_ROOT`/seed walk → the platform's `content/obj/command`; the domain-controller half → step 7), `scripts/check-topic-keys.ts` (`TOPIC_SEEDS` → `packages/content/platform/content/obj/Topic`), `scripts/check-boundary-exemptions.ts` (`SEEDS` → the union of every `packages/content/*/content`), `scripts/check-blessed-bands.ts` and `scripts/check-inert-weapon.ts` (`SEEDS` → the union; they inspect item rows, which move at step 5 — repoint now so step 5 is a no-op for them), `mud/seeds/__tests__/compact-organizations.test.ts` → `git mv` to `mud/obj/__tests__/compact-organizations.test.ts` reading the platform pack (ring-2-shaped; flagged with the A32.2 scaffolding comment the wave-2 repoints carry). `Application.ts:743`'s "Did SeederManager run?" → "Did the platform pack install?".

### 4.3 `platform/pack.yaml`

```yaml
id: platform
version: 0.2.0
root: /platform
description: Pack zero — the platform: controller templates, registries and catalogues, marshallers, the closed vocabularies, the Compact's institutions, the namespace roots and the landing shell.
dependsOn: []
maintainers: pack-installers
requires:
  groups:
    - name: pack-installers
      purpose: the executive's content-operations committee; the ops queue
      owner: { office: prime-minister }
    - name: wiki-editors
      purpose: the encyclopedia's editors (members) and moderators (owner role)
    - name: soul
      purpose: the soul committee — holds the emote extent (D2b)
      owner: { office: prime-minister }
  title:
    - { extent: /platform }                         # documents: settings, subjects, blueprints
    - { extent: /obj }                              # pack-installers (default holder)
    - { extent: /cmd }
    - { extent: /blueprints }                       # planner's choice: publishBlueprint's mint branch (see 9.2)
    - { extent: /wiki, holder: { group: wiki-editors } }   # kept — same holder as today's row
    - { extent: /compact, holder: { office: prime-minister } }
    - { extent: /studio,  holder: { office: prime-minister } }
    - { extent: /home,    holder: { office: prime-minister } }
    - { extent: /domain,  holder: { office: prime-minister } }
boot:
  - { template: /obj/EventRegistry, role: sync-read, reason: every EventApi emit resolves it synchronously }
  - { template: /domain/void, role: producer, reason: the evacuation fallback ContainerMixin resolves synchronously on destruct }
  # … every entry of today's mud/bootstrap.ts except the five /corpo/* and the three locality entries;
  # role = sync-read for registries/catalogues/StreamState/CentralBank, producer for /domain/void,
  # /compact/press, /compact/executive, /obj/PressBoard; reason = the existing comment condensed
  # to one line; dependsOn copied verbatim.
```
`mud/bootstrap.ts` shrinks to the eight entries the corpo packs and `world-seed` will take (steps 6–7). `mud/config/groups.yaml` loses `pack-installers`, `wiki-editors`; `mud/config/parcels.yaml` loses `/studio`, `/compact`, `/wiki`. `content/settings/core.yaml` **drops `defaultStartLocation`** (**planner's choice**, required by criterion 2's "the lounge pack's contribution wins": merge-missing means first-merged wins and the platform installs first; the key moves to `saxonberg-lounge` at step 6 and `AppSettings`' code fallback for the key becomes `/domain/void`).

On the dev DB: `pack-installers`/`wiki-editors` found by name; `soul` created; `/wiki` kept; `/studio` and `/compact` **migrated** from `core` (two log lines); `/obj`, `/cmd`, `/platform`, `/blueprints`, `/home`, `/domain` granted. On a fresh DB everything is granted.

### 4.4 `requiresPackInstaller` — the group's owner is a member for this purpose

The validator reads `GroupApi.isMember` only; add the owner arm (`GroupApi.ownsGroup`) so the founder (PM) passes without a `group add` — the same rule step 1 put in `AccessRegistry` (**planner's choice**; without it the platform-only e2e cannot run `pack status`). `e2e/tests/drive-wave2.spec.ts`'s `group add pack-installers founder` line becomes unnecessary; leave it (idempotent) and drop its comment about `core`.

### Tests (step 4)

- `PackLogic.readContent.test.ts`: a fixture with `content/corpo/x.yaml`, `content/home.yaml`, `content/wiki/main.yaml` + `content/wiki/ns/page.md` + `content/settings/s.yaml` → exactly the three templates and one page; `cmd/` skipped at any depth.
- The repointed tests green; `lint:instanceable`, `lint:topics`, `lint:boundary` green against the new roots.
- Drive-lite (not the recorded drive): boot against the dev DB once; confirm `adopted ≈ 460`, the two `migrated` lines, and `BootstrapManager: bootstrapped 41 entries` unchanged.

*Exit: pack zero is installed by the ordinary installer; `core` holds nothing.*

---

## Step 5 — `generic-objects` and `species-and-names` take their rows (D8)

Commit: `feat(pack): generic-objects takes the object clusters + room archetypes; species-and-names takes obj/species (git mv)`.

- `generic-objects`: `git mv seeds/obj/{items,arms,armor,clothes,gear,vessel,fixture,instrument,traps,pot,plant,seed,crop,bed,surface,exits,room}/` (91 files) + the twelve loose objects + `seeds/obj/corpo/{Brand/crowsfoot-gin,demo/*}.yaml` (the wave-2 leftovers — **planner's choice**: the junk drawer is the legal end state D8 names) → `packages/content/generic-objects/content/obj/…`. `pack.yaml`: `maintainers: generic-objects-maintainers` (default), `requires.title`: one `{ extent: /obj/<cluster> }` per cluster it ships (17) — the branches are the pack's, the loose `/obj/Campfire`-style rows ride the platform's `/obj` via `dependsOn: [platform]`. `boot:` empty. Description: "expected to slim as trade packs take their objects".
- `species-and-names`: `git mv seeds/obj/species/**` (4) → `content/obj/species/`; `dependsOn: [platform]` (coverage via `/obj`).
- `base-library`, `arcane-descriptors`, `newbie-wilds`, `arcane-library`: `dependsOn: [platform]` (coverage); `newbie-wilds` additionally `requires.groups: [{name: newbie-wilds, purpose: the frontier's own body}]` + `requires.title: [{extent: /domain/newbie-wilds, holder: {group: newbie-wilds}}]` (**planner's choice**: every locality holds its own extent, so `lint:untitled` reads the same for every locality; the alternative — falling to `/domain` → PM — is also titled and also legal).
- `mud/seeds/__tests__/room-archetypes.test.ts` → `git mv` to `mud/obj/__tests__/room-archetypes.test.ts` (it is synthetic since wave 2 — verify; if it still reads `seeds/obj/room`, repoint to the pack); `mud/domain/lounge/__tests__/bar-content.test.ts`'s `BRAND_DIR` union gains `generic-objects/content/obj/corpo/Brand`.

### Tests (step 5)

- Repointed tests green; `lint:instanceable` green; the domain kind's adoption is already proven — the dev-DB boot shows `adopted 107` for generic-objects and `4` for species.

---

## Step 6 — the corpo packs take the org charts + their boot entries; `saxonberg-lounge` takes `/obj/lounge` + the start-location setting

Commit: `feat(pack): corpo packs own /corpo/<key> orgs, boards and boot entries; saxonberg-lounge owns /obj/lounge + defaultStartLocation`.

- Per corpo: `git mv seeds/corpo/<key>.yaml → packages/content/corpo-<key>/content/corpo/<key>.yaml`; `pack.yaml` gains `maintainers: <key>` (**planner's choice**: the board IS the pack's maintainers — the same trick `saxonberg-lounge`/`lounge` and `expression`/`soul` use, and it keeps `committeeOf('/corpo/<key>')` resolving the board as today), `requires.groups: [{name: <key>, purpose: the <Key> board}]`, `requires.title: [{extent: /corpo/<key>, holder: {group: <key>}}]` (kept on the dev DB), `boot: [{template: /corpo/<key>, role: producer, reason: appoint and the chart reads resolve the organization by templatePath}]`. `groups.yaml` loses the five boards; `parcels.yaml` loses the five `/corpo/*` rows; `mud/bootstrap.ts` loses the five entries.
- `saxonberg-lounge`: `git mv seeds/obj/lounge.yaml → content/obj/lounge.yaml`; `maintainers: lounge`; `requires.groups: [{name: lounge, purpose: the lounge team}]`; `requires.title: [{extent: /obj/lounge, holder: {group: lounge}}, {extent: /domain/lounge, holder: {group: lounge}}]`; `content/settings/lounge.yaml` with `defaultStartLocation: /domain/lounge/warren` (the key the platform dropped at 4.3; merge-missing → on the dev DB the value is already present and `kept`). `parcels.yaml` loses `/obj/lounge` and `/domain/lounge` (world-seed re-declares `/domain/lounge` with the same holder at step 7 → `kept`).
- `mud/seeds/__tests__/corpo-organizations.test.ts` → `git mv` to `mud/obj/corpo/__tests__/corpo-organizations.test.ts`, reading the five packs.

### Tests (step 6)

- Repointed test green; `PackLogic.requires.test.ts` gains the two-packs-same-holder-same-extent case (`kept` both ways, no conflict).

---

## Step 7 — `world-seed`; the seven eternal views; **the three seeders and `mud/bootstrap.ts` die**; disk fallback to zero (D6, D8)

Commits: `feat(pack): world-seed — the locality rows, groups, claims, Katie, the three locality boot entries (git mv)` · `refactor(bootstrap): retire SeederManager, GroupSeeder, ParcelSeeder, config/groups.yaml, config/parcels.yaml, mud/bootstrap.ts, mud/seeds/` · `refactor(command): no disk fallback — every view is store-served`.

### 7.1 `packages/content/world-seed/`

`package.json` (`@saxonberg/content-world-seed`), registered in `server/package.json`; `pnpm install`. `pack.yaml`:
```yaml
id: world-seed
version: 0.1.0
root: /domain
description: >-
  TRANSITIONAL. The locality rows SeederManager used to insert, verbatim, so the
  seeders could be deleted in wave 3 without the localities sitting in the platform
  under a false owner. Deleted piecewise as waves 4–5 home each locality
  (eternal, terminus, lounge, hearthworks, moor, practicum, substation, common).
dependsOn: [platform, saxonberg-lounge, corpo-goodkin, corpo-vionne]
requires:
  groups:
    - { name: duncan-hall,   purpose: the landlord's staff,
        members: [{ id: /domain/eternal/duncan-hall/npc/katie, role: member }] }
    - { name: hinkley-hills, purpose: the Improvement District }
    - { name: terminus,      purpose: the Terminus municipality }
    - { name: lounge,        purpose: the lounge team }
  title:
    - { extent: /domain/lounge, holder: { group: lounge } }
    - { extent: /domain/terminus/terminal,        holder: { group: terminus }, landUse: civic }
    - { extent: /domain/terminus/counting-houses, holder: { group: terminus }, landUse: commercial }
    - { extent: /domain/terminus/general-store,   holder: { group: terminus }, landUse: commercial }
    - { extent: /domain/terminus/registry,        holder: { group: terminus }, landUse: civic }
    - { extent: /domain/terminus/hinkley-hills,   holder: { group: hinkley-hills }, landUse: residential, areaM2: 240000 }
    - { extent: /domain/terminus/hinkley-hills/lots/lot-1, parentParcel: /domain/terminus/hinkley-hills, holder: { group: hinkley-hills }, landUse: residential, areaM2: 1000 }
    - { extent: /domain/eternal/duncan-hall,       holder: { group: duncan-hall } }   # planner's choice: the landlord holds the building — Katie's row must sit under the pack's own claim for the NPC fence
    - { extent: /domain/eternal/duncan-hall/dorms, parentParcel: /domain/eternal/duncan-hall, holder: { group: duncan-hall }, landUse: residential }
boot:
  - { template: /domain/lounge/terminal, role: producer, reason: the TPA network's eager root; nothing else instantiates the cascade }
  - { template: /domain/eternal/duncan-hall/dorm-warren, role: producer, reason: installs the lobby stair and rebuilds the floor cache at postRegister }
  - { template: /domain/terminus/hinkley-hills/plat-book, role: producer, reason: title enumerates live books }
  - { template: /domain/terminus/hinkley-hills/lot-holder, role: producer, reason: the book names it by path and a sale resolves it }
```
(The `parcels.yaml` locality rows are nine, not the fifteen the requirements estimate — copy them all; the count is whatever the file holds.) On the dev DB the four groups are found (Katie's row `ensureMember` is a no-op), the nine claims are `kept`.

`git mv seeds/domain/**` (158 files — void moved at step 4) → `content/domain/**`, including the seven `domain/eternal/**/cmd/*.yaml` views (the command-view reader already walks `content/domain/**/cmd/`) and the eternal `command/*Controller.yaml` templates; `seeds/obj/Locality/*` (10 per-locality) + `seeds/obj/Government/{eternal-university,hinkley-hills}.yaml` → `content/obj/...`. `mud/seeds/__tests__/{hinkley-lot,business-authority}.test.ts` → `git mv` beside their content (`mud/domain/terminus/hinkley-hills/__tests__/`, `mud/domain/lounge/__tests__/` — read the test to place it). `mud/seeds/` is now empty → `git rm -r` (the hook needs `SAXONBERG_ALLOW=1` for the >10-file deletion; the moves are moves, not deletions, so only the `__tests__` residue and the directory itself count).

### 7.2 The retirement commit

Delete `backend/SeederManager.ts`, `GroupSeeder.ts`, `ParcelSeeder.ts`, their tests (`backend/__tests__/{SeederManager,GroupSeeder}.test.ts`), `mud/config/groups.yaml`, `mud/config/parcels.yaml`, `mud/bootstrap.ts`; the three `run()` calls and the `bootstrapManifest` import; `BootstrapManager.run`'s default becomes `await PackApi.bootManifest()` alone. Rewrite `AppBootstrap.run`'s doc comment to the D6 story (connect → install → wiring → warm/activate). `scripts/lib-to-obj-moves.ts`'s seeds mapping row: **planner's choice: delete the row**. Repoint `KatieProvisioning.test.ts` (`GroupSeeder.run()` → a fixture pack with the `duncan-hall` requires block through the harness, or `GroupApi.ensureGroup`+`ensureMember` directly — the test proves conferral-not-self-enrolment, which the requires phase now is); `general-store-content.test.ts` reads `config/parcels.yaml` → read `world-seed/pack.yaml`'s `requires.title`; `registry-authority.test.ts`, `HinkleyHills.test.ts`, `corpo-organizations.test.ts` fixtures "mirroring parcels.yaml" → mirror the pack manifests (comment edits). Comments naming `SeederManager` in `Hydrator.ts`, `Organization.ts`, `quantity.ts`, `PersistenceManager.ts`, `Katie.ts`, `WikiNamespaceZone.ts`, `LandUse.ts`, the two `test-helpers.ts` → reworded to "the platform pack / `PackApi.install`".

### 7.3 Disk fallback to zero (`CommandLogic`, `command.ts`, `PackController`)

Delete `CMD_DIR` and the legacy `mud/cmd` walk, the `DOMAIN_DIR` walk, `diskServed`, `CommandApi.diskFallbacks()`, the `getCommand` disk read on a miss (a miss is a miss), the "served from disk" log line, and `PackController.executeStatus`'s fallback line. ⚠ Verify first (a test) that a store-served `domain/eternal/duncan-hall/cmd/provision.yaml` with `controller: ../command/ProvisionController` resolves relative to `join(MUD_ROOT, viewKey)` exactly as the disk path did — `CommandDefinition.fromView`'s `filePath` anchor is what makes the relative ref work; if it breaks, the fix is in the anchor, never in the view.

### Tests (step 7)

- `CommandLogic.store.test.ts`: a miss no longer reads disk; a stored domain view with a relative controller ref resolves.
- `AppBootstrap` has no unit test; `pnpm build` proves the imports. `KatieProvisioning` green on the requires path.
- Dev-DB boot: `SeederManager` line gone; `world-seed … adopted 158`, groups found, nine titles kept; `BootstrapManager: bootstrapped 41 entries`; `CommandApi: N preloaded` with no disk line.

*Exit: acceptance criterion 1 holds (no seeder, no seeds, no config yaml, no bootstrap.ts). `core` is still minted and still rung 3.*

---

## Step 8 — `broadcast --at` (D2c) and the soul committee (D2b); **`requiresCoreAccess` dies**

Commits: `feat(access): AccessApi.heldExtents + the path-targeted TreeActions` · `feat(social): broadcast --at — forced messaging over an extent you hold` · `feat(social): soul mutations are title-gated; Emote.disabled; soul disable/enable; retire requiresCoreAccess`.

### 8.1 `AccessApi.heldExtents(subject): Promise<string[]>` (**planner's choice** — one seam for broadcast, teleport, errors, find)

`AccessRegistry.heldExtents`: every `ParcelRecord` (add `ParcelApi.allRecords()` or reuse `groupOwnerRefs`' walk) whose owner `subjectIsOwnerMember` admits, plus the subject's own `/home/<key>`. `TreeAction` widens to `'write-document' | 'write-template' | 'write-source' | 'read' | 'broadcast' | 'teleport'` (closed; `canAtPath` treats all alike this wave — the action is a label for the audit and for a later per-action policy).

### 8.2 `broadcast`

`broadcast.yaml`: `--to` removed; `--at <path>` (`type: string`, `field: extent`); validators `requiresAnimate`, `requiresVerbalESP` only. `BroadcastController`: extent = `model.extent` or, when omitted, `ParcelApi.coveringParcelOf(location.getTemplatePath()).extent` iff `canAtPath(giver, 'broadcast', it)`, else refuse listing `heldExtents(giver)` ("you hold: /domain/lounge, /home/<key>" or "you hold nothing"). Authority: `canAtPath(giver, 'broadcast', extent)` — the check is on the extent the speaker names, which they must hold; "holding a parent reaches its children" is implemented on the *audience*. Audience: `MqlApi.resolveMany('online', {scope:'online'})` filtered to Sensors whose `getContainer()` chain's location template path `=== extent || startsWith(extent + '/')` — no `ParcelApi` read per avatar (delivery does not depend on a healthy world). Delivery unchanged (`verbal-esp`, `<chan id="broadcast">`). The `payload` gains `extent`.

### 8.3 `soul`

- `lib/social/Emote.ts`: `disabled: boolean = false` in `fromData`/`toData`. `SoulCatalogue`: `resolve(verb)` returns null for a disabled emote; `all()`/`snapshot()` skip disabled; new `resolveAny(verb)` (disabled included) for `soul show`; `setDisabled(verb, flag)` → `DocumentApi.save(existing.path, 'emote', {...toData(), disabled})` + cache update. `SoulApi.setDisabled`, `SoulLogic.setDisabled`. `EMOTE_MINT_BRANCH` → `/expression/emotes` (**planner's choice**: a soul-minted emote lands under the committee's extent, so the document gate is the title gate and a later pack file adopts it by natural key exactly as wave 2 designed).
- `expression/pack.yaml`: `maintainers: soul`, `requires.title: [{extent: /expression, holder: {group: soul}}]` (the group is declared by the platform, a `dependsOn`).
- `soul.yaml`: `requiresCoreAccess` removed; subcommands `disable`, `enable` added; help rewritten ("the soul committee holds the emote extent"). `SoulController`: drop the `MixinApi.isAuthor` composition check; for `make`/`edit`/`delete`/`disable`/`enable`, pre-check `AccessApi.canAtPath(giver, 'write-document', targetPath)` for a diegetic refusal ("the soul committee holds the emote catalogue") — the real gate is `DocumentLogic.gateMutation`, which already calls `canAtPath`; reads ungated.
- Delete `lib/command/validators/requiresCoreAccess.ts`. `SoulCatalogue.ts`/`soul.ts`/`SoulController.ts` comments naming it or `core` rewritten.

### Tests (step 8)

- `AccessRegistry.heldExtents.test.ts`: group member, group owner (office holder), player, self-home, nothing.
- `BroadcastController.test.ts` (rewrite): a parcel holder reaches only avatars under the parcel; a locality government's member (a `terminus` member) reaches `/domain/terminus/*`; the PM reaches everyone under `/domain` (stub `holdsOffice`); a non-holder is refused with their extents listed; `--at` omitted at a held location defaults; omitted at an unheld location refuses; a player reaches a guest in `/home/<self>`; `--to` is unknown (arg-kinds).
- `SoulCatalogue.test.ts`: disabled emote resolves null, is absent from `all`/`snapshot`, present via `resolveAny`; `setDisabled` writes through `DocumentApi.save` (spy); mint path under `/expression/emotes`.
- `PackLogic.document.test.ts`: a disabled (DB-edited) emote against an unchanged file → `kept`; the same row with a later pack change → `conflict`, never overwritten (the D2b guarantee). A second fixture emote pack with `root: /expression/extra` installed by a non-`soul` principal (stub `canAtPath` false) fails the precondition.
- `SoulController.test.ts`: member edits/disables; non-member refused; `soul list` for anyone.
- `lint:gates` green (the deleted validator string is gone from both views).

*Exit: jobs 3a and 3b of `core` are gone.*

---

## Step 9 — the within-your-extent pattern; **`isAuthor`, `requiresAuthor`, `:admin`, `_mqlPermission` die** (D1 jobs 4–5, D2d)

Commits: `feat(access): retire isAuthor — teleport, CMS, errors, find on held extents` · `refactor(mql): ungate pre-resolution operators; delete :admin and the permission snapshot` · `refactor(studio,employment): the last author-tier gates`.

### 9.1 The five named consumers

- **`TeleportController.canSelfTeleport(giver, from, to)`**: `heldExtents(giver).some(e => under(from, e) && under(to, e))`; the `isWizard` arm removed; the message names the network ("cross the boundary and it is the TPA like everyone else").
- **`CmsLogic.gateRead`** → `source` stays wizard-only; `content`/`document` are per-path: `list(path)` prunes children the actor cannot read; `read(path)` refuses. `canRead(actor, path)` (module-private) = own home ∨ `canAtPath(actor, 'read', path)` ∨ the covering zone's `protection` field is `anyone` (the wiki floor — read through `ZoneApi`/`Zone.lookupField` exactly as `WikiNamespaceZone` does). **Planner's choice** for "what is public".
- **`DiagnosticLogic.list`**: the tier gate goes; the filter adds `path ∈ heldExtents(actor)` (prefix) OR `channel === 'pack.<id>'` for a pack whose maintainers group the actor is in (`PackApi.maintainersOf`); `compile` stays wizard-only. The `errors` verb: `ErrorsController` drops the `isAuthor`/`isWizard` door; `errors.yaml` — grep for `requiresAuthor`; remove if present. `lib/shell/Author.ts:129` comment rewritten.
- **`FindController`**: `showTemplatePath` per row = the object's template path is under one of `heldExtents(giver)` (computed once per call). `MixinApi.isAuthor` (the composition predicate) stays — it is a mixin check, not the tier.
- **MQL**: delete `gateAuthor` and its ten call sites in `resolver.ts`, `MqlContext.permission` and `PermissionTier` in `types.ts`, the `admin` predicate + `tier` field in `predicates.ts`, `MqlPermissionError` if no remaining throw site (grep; keep the export shim if the client imports the name), `CommandContext._mqlPermission` in `command.ts`, the snapshot block in `CommandLogic.resolveModel` (~L1117–1145). Re-target the resolver test that proved `flower:online` throws to prove it resolves.

### 9.2 The consumers the requirements did not list (found by grep — flagged)

- `StudioLogic.gateRead` (composition reads) → ungated (everyone is an author). `StudioLogic.publishBlueprint` → the document gate decides: it writes `/blueprints/<id>` through `DocumentApi.save`, and the platform claims `/blueprints` (step 4) for `pack-installers` — **planner's choice**: publishing a curated blueprint is a platform act. Its `denied` disposition now comes from catching the gate's throw.
- `EmploymentLogic.isProprietorOfImpl`'s operator override → `CompactApi.holdsOffice(subject, 'prime-minister')` (**planner's choice**: the accountable person, per D2d's "the PM may do all of it anywhere"; check offices, never the founder). `lib/employment/Authority.ts`'s doc paragraph rewritten.
- `AccessApi.isAuthor`/`AccessLogic.isAuthor`/`AccessRegistry.isAuthor` + `ensureAuthorGroups` + `cachedAuthorGroups` + `ParcelApi.groupOwnerRefs`'s doc (keep the method — `heldExtents` may use its walk) deleted; `lib/command/validators/requiresAuthor.ts` deleted; `requiresPublisher.ts`'s header paragraph rewritten; the `compact/press.yaml` header comment (now in the platform pack) rewritten ("the committee over `/compact` is the PM seat"). `AccessRegistry.reseedSystemGroups` drops `cachedAuthorGroups`/`cachedCoreRef` (the latter goes at step 10).

### Tests (step 9)

- `TeleportController.test.ts`: same-extent hop admitted; cross-boundary refused for a holder; PM admitted anywhere under `/domain`; a wizard who holds nothing refused.
- `CmsLogic.test.ts`: a non-holder's tree is the public tree (`/wiki` visible, `/obj` pruned); the founder (PM → pack-installers owner) sees `/obj`, `/cmd`; `read` refused/admitted.
- `DiagnosticLogic.test.ts`: `list` for a holder returns only held paths; a maintainer sees `pack.<id>` rows; a nobody gets `[]` with no error.
- `FindController.test.ts`: paths shown only for held objects.
- `resolver.test.ts`: `online:x`, `#id`, `world`, `class:` resolve without a snapshot; `:admin` is an unknown predicate; `attack online:bob` (an existing combat test, or a new one) is refused by reachability.
- `StudioLogic.test.ts`: `publishBlueprint` denial comes from the document gate (stub `canAtPath`).
- `lint:gates`, `lint:arg-kinds` green.

*Exit: jobs 4 and 5 are gone; `core` is now only rung 3, an empty group, and a test convention.*

---

## Step 10 — **`core` dies**: rung 3 → `null`, fail closed, no minting; the test-auth founder; the two lint gates; nightly reprovision (D1 jobs 1–2, D10)

Commits: `feat(parcel): an untitled path is untitled — ownerOf returns null; AccessApi.can fails closed` · `refactor(access): retire seedCoreGroup / resolveCoreRef; the test founder joins no core` · `feat(record): re-grant every pack's requires after the nightly wipe` · `chore(lint): lint:core-gone + lint:untitled (CI-gating)`.

### 10.1 The nullable owner

- `ParcelApi.ownerOf(path): Promise<ParcelOwner | null>`; `ParcelRegistry.ownerOf` returns `covering?.owner ?? selfHome ?? null`; `STATE_GROUP_NAME` deleted; `ParcelLogic.STATE_OWNER` deleted (degraded path → `selfHome ?? null`). Every caller (`AccessRegistry.can`/`canAtPath`/`canMutateZone` → `owner === null ⇒ false`; `CompactLogic.committeeOfImpl` → null; `PersistableLogic.ownerOfScope` → `scope` (the existing catch fallback; the `'core'` default in `ownerString` goes); `EvalController.holdsParcel` → falls to `AccessApi.can` (which is now false for untitled); `ArmController.mayPlaceIn` → `can(...) || (GovernmentApi.governmentAt(address) !== null && owner === null)` where `address` is the room's `AddressableMixin` address (the "ground under a government's jurisdiction with no private title" test — read `ArmController.ts:13` and `ArmController.test.ts` for the address the fixture uses); `ChattelLogic:91` comment).
- `AccessRegistry`: delete `seedCoreGroup`, `resolveCoreRef`, `cachedCoreRef`, the `'core'` entries in the class doc and `reseedSystemGroups`; `postRegister` seeds `wizards`/`streamers`/`archwizards` only. `ResetPolicy.ts`'s `Groups` comment rewritten.
- `Application.provisionTestCharacter`: the list becomes `['wizards', 'lounge', 'streamers', 'archwizards']` (**planner's choice**: `lounge` stays because `/domain/lounge` is a *sub-title* and nearest-parcel wins for `can` — the founder reaches everything else by the seat: `/obj`, `/cmd` as `pack-installers`' owner; `/domain`, `/home`, `/studio`, `/compact` as the PM); the long comment is rewritten around "authority comes from the seat; the test character is the founder, so it needs no grant beyond the groups that hold sub-titles it is tested under".
- `scripts/dev-grant-core.mjs` deleted (its header asks for exactly this).
- `mud/__tests__/access-test-helpers.ts`: `addGroupMember('core', …)` → `grantTestTitle(extent, groupName, playerId, role)` (a fixture parcel `/test/<name>` titled to a fixture group through `ParcelApi.grant` + `GroupApi.ensureMember`). Rewrite the eighteen test files that name `'core'` (the list from `grep -rl "'core'\|\"core\"" packages/server/src`): `ParcelRegistry.test.ts` (rung 3 → `null`), `AccessRegistry.canAtPath.test.ts`, `access.test.ts`, `ChattelRegistry.test.ts`, `CompactLogic.test.ts`, `ManagedGroupProvider.test.ts`, `Publisher.test.ts`, `Authority.test.ts`, `cold-box-walk.test.ts`, `ArmController.test.ts`, `PersistenceManager.migration.test.ts` (the group-owner migration fixture name → any other name), `HinkleyHills.test.ts`, `registry-authority.test.ts`, `startLocation.test.ts`, `landing.integration.test.ts`, the two moved seeds tests. `e2e/tests/drive-wave2.spec.ts` comments.

### 10.2 The nightly reset re-grants structure (**planner's choice, load-bearing — not in the requirements**)

`ResetPolicy` wipes `parcels` and `groups` nightly; today the seeders only ran at boot, so a reset world already lost its titles until the next restart, masked by `core`. With rung 3 gone, a wiped world refuses every `can` until restart — the founder locked out at 04:00. `RecordApi.wipe`'s tail: after `AccessApi.reseedSystemGroups()`, `await PackApi.reprovision()` → `PackLogic.reprovision`: for every applied install record, re-run `applyRequires` from `record.requires` as principal `bootstrap` (idempotent; groups re-minted empty, titles re-granted) and log one line per pack. Test on `RecordLogic`/`record.ts` with a spy. Documented in record-layer.md and content-packs.md.

### 10.3 `scripts/check-core-gone.ts` (`pnpm lint:core-gone`)

Walk `packages/server/src`, `packages/server/scripts`, `packages/content`, `e2e` (`.ts`, `.mjs`, `.yaml`); an offending line matches `/'core'|"core"|\bname:\s*core\b|\bcoreMemberIds\b/` and does not contain the marker `migration-note:`; also: `lib/parcel/ParcelRecord.ts`'s `ParcelOwner` union has exactly the kinds `group`, `player`, `office` (regex over the type text); `lib/command/validators/requiresCoreAccess.ts` and `requiresAuthor.ts` do not exist; no `isAuthor(` on `AccessApi`/`AccessLogic`/`AccessRegistry`. Exported `classify(files)`; `scripts/__tests__/check-core-gone.test.ts`. `package.json` script; `.gitlab-ci.yml` lint job line after `lint:test-content`.

### 10.4 `scripts/check-untitled-paths.ts` (`pnpm lint:untitled`)

Read every `packages/content/*/pack.yaml` (the manifest reader's logic duplicated minimally — a script does not import the mudlib); collect claims = every `requires.title[].extent`; collect paths = every template path the packs ship (the step-4.1 walk rule, mirrored) + every document path (`root + '/' + contentDir + '/' + key`; command views at `/cmd/**` and `domain/**/cmd/**`). A path under one of the eight roots (`/obj`, `/domain`, `/cmd`, `/compact`, `/studio`, `/wiki`, `/home`, `/corpo`) with no claim as a prefix is reported; zero is green. Exported `classify(paths, claims)`; a test with a covered/uncovered pair. CI line beside the other.

### Tests (step 10)

- `ParcelRegistry.test.ts`: untitled → `null`; `AccessRegistry` tests: null owner → `can`/`canAtPath`/`canMutateZone` false; `CompactLogic`: `committeeOf` of an untitled path is null; `PersistableLogic`: untitled scope keys on the scope.
- `ArmController.test.ts`: held ground, government ground with no private title (allowed, crime-marked), private ground refused, nowhere-ground refused.
- `RecordLogic.test.ts`: `wipe({dryRun:false})` calls `PackApi.reprovision` once, not on dry-run.
- `check-core-gone.test.ts`, `check-untitled-paths.test.ts`; both scripts green against the tree (the marker line in `ParcelRegistry.grant` is the only survivor).

*Exit: acceptance criteria 5 and 6 hold; `core` is never minted.*

---

## Step 11 — staffing and orphans on the operator surface (D7, D9)

Commit: `feat(pack): pack status shows staffing + orphans; pack sync prompts the installer to staff; pack diagnostics route to maintainers, ops as the fallback`.

- `PackApi.status`: `maintainers: {group, staffed}` per pack; `PackApi.orphans(): Promise<string[]>` — `content` rows with no `sourcePack` (**planner's choice**: templates only; author-minted *documents* are ordinary rows, not seed inventory) — `pack status` prints `N template row(s) under no pack: …` (listed, never deleted).
- `PackController.executeSync`: after a successful sync whose pack is unstaffed, `PromptApi.text(giver, 'This pack has no maintainers. You, or who? (a name, or enter for you)')` → `PackApi.staff(packId, <path>)`; `pack status` line reads `staffed (3)` / `UNSTAFFED — routes to pack-installers`.
- `DiagnosticLogic.pushToAuthor`: a diagnostic on channel `pack.<id>` pushes to `GroupApi.membersOf(staffed ? group : fallback)` (each online member gets the existing `diagnostic.<channel>` frame); other channels unchanged (the author path). `DiagnosticApi` gains nothing; the routing reads `PackApi.maintainersOf`.

### Tests (step 11)

- `PackController.test.ts`: `status` staffing line + orphan line; `sync` on an unstaffed pack prompts (stub `PromptApi.text`) and staffs; a staffed pack does not prompt.
- `DiagnosticLogic.router.test.ts`: `pack.x` diagnostic → maintainers when staffed, `pack-installers` when not; an author diagnostic → the author.
- `PackLogic.orphans.test.ts`: an unstamped template row is listed; a stamped one is not; a document is not.

---

## Step 12 — the platform-only e2e, docs, the one full suite, the drive, the MR

Commits: `test(e2e): platform-only boot — pack zero lands the founder in the shell room` · `docs(pack): content packs wave 3 — subsystem docs`.

### 12.1 The e2e (D10, criterion 4)

`e2e/playwright.platform.config.ts` (**planner's choice**: a second config, not a project inside the main one — the `webServer` differs): server command `SAXONBERG_PACKS=platform AUTH_MODE=test FOUNDER_GOOGLE_EMAIL=founder@e2e.local MONGODB_DATABASE=saxonberg_e2e_platform PORT=2011 pnpm --filter @saxonberg/server dev`, client on 5174 pointed at 2011, `testDir: tests-platform/`. ⚠ **The four-database rule**: `saxonberg_e2e_platform` is a fifth database name — check what the existing e2e config uses for its database and reuse *that* (the e2e DB is wiped per run); if the existing e2e already has its own name, the platform-only run must share it (sequential, never concurrent). One spec `platform-only.spec.ts`: log in as `founder`, expect the landing room to render (the void — `defaultStartLocation` absent → the code fallback), no line matching `/error|failed/i` in the server log the harness captures, `pack status` lists exactly one pack. Root `package.json`: `"test:e2e:platform"`; `e2e/package.json` `test:platform`; `.gitlab-ci.yml` `e2e` job runs both (a second script line, same Mongo service). ⚠ Risk to drive **first** (as soon as step 3's flag exists): `Application.provisionTestCharacter` may need a species row (`species-and-names`) to mint the founder — if so, the fix is in the test-auth provisioning (a species-less test avatar), never in the platform's contents.

### 12.2 Docs (the shipped shape)

`content-packs.md` (the manifest schema with `requires:`/`boot:`/`maintainers:`, the requires phase and its outcomes, the covered-extent rule, the boot union, staffing + routing, orphans, `SAXONBERG_PACKS`, the platform-only criterion, the pack table — sixteen packs incl. `world-seed`, the install order now that the seeders are gone; Key files), `parcel.md` (the office kind, `grant`, the nullable `ownerOf`, the deleted rung 3 — the core-decomposition slate retires here), `access.md` (the two account axes, `heldExtents`, the within-your-extent pattern, `canAtPath` actions, no `core`, the group-owner-holds rule), `governance.md` (seat-held title), `emotes.md` (the soul committee, `disabled`, the mint branch), `mql.md` + `docs/mql-grammar.md` (`:admin` and the authoring tier removed), `command-routing.md`/`command-spec.md` (no disk fallback), `cms.md` (per-path read), `diagnostics.md` (pack routing), `record-layer.md` (reprovision), `civics.md` (the government-ground test), `testing.md` (the two lint gates). Sweep-time index edits (CLAUDE.md map line, lint family entries, the antipatterns table rows that mention `'core'`/`isAuthor`, the collection list): **written at the sweep**, named in this commit's message.

### 12.3 Gates, the suite, the drive

- `pnpm build`; the whole lint family incl. `lint:core-gone`, `lint:untitled`; **one** full `pnpm test`.
- **Drive** (recorded on the MR, in this order, against `saxonberg_build1` unless stated): (1) first boot — every pack `inserted 0`, `adopted` = its row count (platform ≈460, generic-objects 107, species 4, corpo 1 each, lounge 1, world-seed 158), `/studio` + `/compact` `migrated`, every other title `kept` or `granted`, groups `found`, `BootstrapManager: bootstrapped 41`, no disk line; (2) second boot — all-zero on every pack, no `migrated` line; (3) `pack status` as the founder (no `group add`) lists sixteen packs, `world-seed` and the corpos UNSTAFFED, orphan count; `pack provision platform`; (4) `broadcast --at /domain/lounge hi` as a `lounge` member reaches a second session in the lounge and not one in Terminus; `broadcast` from a non-holder lists their extents; the founder's `broadcast --at /domain` reaches both; (5) `soul disable wave` as the founder (PM → owner of `soul`) → `;wave` does nothing, `soul list` omits it, `soul show wave` says disabled; `soul enable wave`; as a non-member `soul disable nod` refused; (6) `teleport` within `/domain/lounge` as a lounge member admitted, to Terminus refused, as the founder anywhere; (7) the CMS as the founder shows `/obj` and `/cmd`; edit `look.yaml`'s help → `help look` changes (the wave-2 undriven item); as a non-holder the tree is `/wiki`; (8) `errors` as a nobody → empty list, no error; `find` shows paths only under held extents; (9) `flower:online` resolves for a guest; `attack online:<name>` refused by reachability; (10) `office handoff prime-minister <player>` (the `office` verb) → that player can now `broadcast --at /domain` and write under `/compact`; the founder cannot; hand back; (11) `pnpm test:e2e` and `pnpm test:e2e:platform` green locally; (12) a dry-run `world.reset` → the log shows `reprovision` would run (dry) — do not arm enforce on the dev DB.
- Push; open the MR (workflow.md phase 3) with the table below filled in.

---

## Acceptance-criteria mapping

| Criterion | Step | Test / verification |
|---|---|---|
| 1. No seeds, seeders, config yaml, bootstrap.ts; `AppBootstrap.run` calls none | 7 | `git ls-files`; `pnpm build` |
| 2. Fresh DB: platform first, every pack installed, every row stamped, registries resident, founder lands in the lounge | 3, 4–7, 12 | `PackLogic.discover.test` (platform first); drive (1); the main e2e suite (`arrival.spec`) |
| 3. Dev DB: first boot adopts, no new title over an existing one, no duplicate group; second boot all-zero | 4–7, 12 | `PackLogic.requires.test` (adopt-by-name, kept); drive (1)(2) |
| 4. Platform-only e2e | 3, 12 | `platform-only.spec.ts` |
| 5. The two lints in CI, green; `ownerOf` never `core`; `:admin`/authoring tier/`isAuthor`/`requiresAuthor` absent | 9, 10 | `check-core-gone.test`, `check-untitled-paths.test`; `.gitlab-ci.yml` |
| 6. `ParcelOwner.office` exercised: four PM-held roots; self-home still the player; non-founder refused, founder admitted; handoff moves it; empty seat fails closed | 1, 4, 10, 12 | `AccessRegistry.office-owner.test`, `ParcelRegistry.grant.test`; drive (10) |
| 7. `broadcast --at` matrix; `isAuthor` gone; teleport/CMS/errors/find/MQL; soul title-gated + disabled + conflict-not-overwrite; `requiresCoreAccess` gone; founder edits a view via CMS; second emote pack refused | 8, 9, 12 | the step-8/9 tests; drive (4)–(9) |
| 8. `requires.groups`/`title` matrix; unknown manifest keys fail | 3 | `PackLogic.requires.test` |
| 9. `boot:` union, cross-pack deps, eager counts, failed pack contributes nothing; eternal views store-served; no disk line | 3, 7 | `PackLogic.boot.test`, `CommandLogic.store.test`; drive (1) |
| 10. Staffing: prompt on a person's install; bootstrap leaves empty + UNSTAFFED; routing to `pack-installers` | 3, 11 | `PackController.test`, `DiagnosticLogic.router.test`; drive (3) |
| 11. `pack provision <id>` | 3 | `PackController.test` |
| 12. Docs; slate retirement; CLAUDE.md at the sweep | 12 + sweep | doc diff |
| 13. One full suite; lint family; build | 12 | CI + one `pnpm test` |

---

## Risks & ordering constraints

- **The group-owner-holds rule (step 1) is load-bearing for everything after step 4.** Without it the founder is a member of nothing and holds nothing once `core` stops covering the world; the platform's `/obj` claim would lock the founder out of `clone`/`goto`. Land it first and test it in isolation.
- **Claims before rung 3.** Steps 4–7 must all be in before step 10 flips `ownerOf` to `null`; `lint:untitled` at step 10 is the proof that no write-reachable path was left behind. Do not reorder.
- **The `core`-held migration in `grant`** is the one place this build touches existing title data. It fires only for `{group, name: 'core'}` holders, logs, and writes a `transfer` event, so the chain of title records the hand-off. Delete the branch in wave 4.
- **The nightly reset** wipes `parcels`/`groups`; step 10.2's `reprovision` is what keeps an enforcing deployment alive past 04:00. It is not in the requirements text; flagged in the summary.
- **Registry-at-boot ordering.** The requires phase runs after a pack's rows are written and mints `ParcelRegistry`/`GroupRegistry` via `StuffApi.singleton`; `BootstrapManager` reuses them. A regression here shows as "expected singleton, found 2" — the wave-2 drive found exactly that once.
- **merge-missing means first-merged wins.** The platform must not ship `defaultStartLocation`, or the lounge's value never lands on a fresh DB and criterion 2 fails silently (the dev DB would mask it — it already holds the value).
- **Relative controller refs in store-served domain views** (step 7.3): the seven eternal views name `../command/<Name>Controller`; the anchor is `join(MUD_ROOT, viewKey)`. Test before deleting the disk walk.
- **`SAXONBERG_PACKS=platform` may not reach login** if test-auth provisioning needs a species row. Try it the moment step 3 lands; the fix lives in `Application.provisionTestCharacter`, not in the platform pack.
- **`git mv` stages immediately.** Steps 4, 5, 6, 7 each have exactly one move commit; do the move as the last action before that commit and nothing else in between.
- **Eighteen test files name `'core'`.** Mechanical but wide; `lint:core-gone` refuses to go green until every one is rewritten — that is the point.
- **The template-walk widening (4.1)** changes what `lint:instanceable` sees only if the script parses files without `class:`; check it before the move commit.
- **`orderByDependsOn` still ignores unknown ids**; `world-seed`'s `dependsOn` names packs that exist. Do not add validation this wave.

## Context budget

| Step | Files touched (approx.) | Weight |
|---|---|---|
| 1 | ~8: ParcelRecord, AccessRegistry, ParcelRegistry, CompactLogic (+ committeeOf consumers), ParcelLogic, PersistableLogic, EvalController, 3 tests | medium |
| 2 | ~8: ParcelRegistry/ParcelLogic/parcel.ts, GroupLogic/group.ts, ManagedGroupProvider, ParcelEvent, 2 tests | light–medium |
| 3 | ~12: pack.ts, PackLogic (readManifest, applyRequires, coverage, bounded plan, bootManifest, provision/staff/maintainersOf, discover filter), BootstrapManager, AppBootstrap, PackController + pack.yaml, harness, 5 tests | **heaviest** — the machinery |
| 4 | ~530 `git mv` + pack.yaml + groups/parcels yaml edits + bootstrap.ts shrink + ~8 repoints + requiresPackInstaller | heavy (mechanical) — the move is its own commit |
| 5 | ~110 `git mv` + 6 pack.yaml edits + 3 repoints | light |
| 6 | ~7 `git mv` + 6 pack.yaml + settings file + yaml/bootstrap edits + 1 repoint | light |
| 7 | ~175 `git mv` + world-seed scaffold + 3 seeder deletions + AppBootstrap + BootstrapManager + CommandLogic/command.ts/PackController + ~12 repoints/comment edits | heavy |
| 8 | ~12: access.ts/AccessLogic/AccessRegistry (heldExtents), broadcast.yaml + controller, soul.yaml + controller, Emote, SoulCatalogue/SoulLogic/soul.ts, expression pack.yaml, validator (del), 5 tests | heavy |
| 9 | ~18: Teleport/Errors/Find controllers, CmsLogic, DiagnosticLogic, StudioLogic, EmploymentLogic, Authority, resolver/types/predicates/mql.ts, command.ts, CommandLogic, access.ts/AccessLogic/AccessRegistry, requiresAuthor (del), 6 tests | heavy |
| 10 | ~30: parcel.ts/ParcelRegistry/ParcelLogic, AccessRegistry, CompactLogic, PersistableLogic, EvalController, ArmController, Application, ResetPolicy, record.ts/RecordLogic, PackLogic (reprovision), dev-grant-core (del), 2 scripts + 2 tests + package.json + CI, access-test-helpers + 18 test rewrites | **heavy** — the test rewrites dominate |
| 11 | ~7: PackLogic/pack.ts, PackController, DiagnosticLogic, 3 tests | medium |
| 12 | e2e config + spec + 2 package.json + CI; ~13 docs; drive | medium |

Pace: 3, 8, 9, 10 are the heavy ones; a stop after 2, 4, 7 (the seeders are gone), or 9 is a clean handover point.

## Stop protocol

If stopping before step 12, the MR description (or a `docs/plans/content-pack-wave-3-plan.md § Build status` block appended in the last commit — one or the other, not both) states:

1. **Done:** the step numbers completed, each with its exit line, and the commit range.
2. **Not done:** the remaining steps verbatim, with any partially-applied step called out as *reverted* (never leave a half-step in the tree — `git revert` the partial commit(s) or finish to the next green boundary; a half-moved `seeds/` tree is the worst shape to leave).
3. **Seeders retired so far / still running** (three names, two columns), **`mud/bootstrap.ts` entries remaining**, and **packs re-homed so far** (of: platform, generic-objects, species-and-names, corpo ×5, saxonberg-lounge, world-seed).
4. **`core` status:** which of the five jobs are gone (3a broadcast, 3b soul, 4 author, 5 admin, 1–2 rung 3 / fail-closed) and whether `seedCoreGroup` still runs.
5. **Tests:** which `test:near` scopes ran green at the last boundary; whether the full suite ran (it should not have unless step 12 was reached — say so).
6. **Drive:** which of the twelve drive items were exercised, if any; whether the platform-only boot was tried.
7. **Open flags:** which planner's-choice deviations are already in the tree (the group-owner-holds rule, `grant`'s `core` migration branch, the explicit-claims/no-implicit-root rule and the covered-extent rule, the template-walk widening, the maintainers-are-the-board trick, `/expression/emotes` and `/blueprints` as mint branches, `SAXONBERG_PACKS`, the nightly `reprovision`, the PM-seat operator override in employment, the CMS "public" definition, orphans = unstamped templates only).
