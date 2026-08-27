# Content packs, wave 4a — the path surgery — implementation plan

**Feature branch:** `design/content-pack-wave-4a` (build on it directly; it carries the requirements and this plan; push every step).
**Requirements:** `docs/requirements/content-pack-wave-4a-requirements.md` (closed scope; D1–D5, the constraints and the eleven acceptance criteria are the contract).
**Subsystem baseline:** `docs/subsystems/content-packs.md` (the wave-3 installer: `requires`, the boot union, `TITLE_ROOTS`), `parcel.md` (`grant` + its migration branches), `templates.md`, `document-store.md`, `crafting.md`, `command-spec.md`, `docs/deployment.md` (§ The Mongo environment policy).
**Precedent:** the retired wave-3 plan (`git show 0061961cc~1:docs/plans/content-pack-wave-3-plan.md`) — this plan matches its shape.

This plan is self-contained: a fresh build agent who has read CLAUDE.md, the requirements and the docs above can execute it top to bottom. Every step leaves the tree green (`pnpm build` type-clean, `pnpm test:near`, the lint family), is one or more commits, and is a legitimate stopping point (see **Stop protocol**). The requirements decide WHAT; where this plan decides HOW it says **planner's choice** so the reviewer can see the seam.

Conventions that bind every step:

- **This is a rename.** No behaviour changes, no new Apis, no new module categories, no new `*Logic` methods except the boot guard (step 5). `PackApi` / `ParcelApi` surfaces are unchanged except for the deleted `migrated` outcome.
- **Three move commits, each holding ONE tree move and nothing else** (CLAUDE.md § Worktrees; `git mv` stages immediately): the content move (step 2), the source move (step 3), the hearthworks split (step 4). Do each move as the last action before its commit. Everything that must change *with* the move to keep `pnpm build` + `test:near` green rides the same commit (a rename that leaves the tree red at a boundary is a half-step — the stop protocol forbids it).
- Stage by name (`git add <path>`), never `add -A`. **ONE MR** for the whole build; push after every commit. `SAXONBERG_ALLOW=1` is NOT needed — no commit deletes more than ten files (moves are renames to git).
- Commit shape: `refactor(paths): …` for the renames, `feat(pack): …` for `/trade/` and the two packs, `chore(parcel): …` for the branch deletions, `feat(bootstrap): …` for the guard, `test(e2e): …`, `docs(pack): …`.
- Per step: `pnpm build`, `pnpm test:near`, and the lint family — `lint:gates`, `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:pm`, `lint:test-bootstrap`, `lint:arg-kinds`, `lint:topics`, `lint:test-content`, `lint:core-gone`, `lint:untitled`. The full `pnpm test` runs **once**, at step 7.
- **The rename rule, stated once and applied mechanically** (D1): `/domain/` → `/world/` in every string that is a template path, a view key, a document path, a content directory or a source directory; the bare word `domain` in prose, identifiers (`DomainHook`, `domain kind`, `domainDir`) and the `domain` content KIND name is **not** renamed — the kind is still called `domain` (the template kind, `content-packs.md` § The kinds); only the PATH ROOT moves. Grep discipline: `git grep -n '/domain' -- packages e2e` and `git grep -n "'domain/\|\"domain/" -- packages` must both return nothing at the end of step 3 except the two `PackLogic`/`CommandLogic` comment lines that describe the kind (rewrite those to say `world/`).
- **No compatibility shim** anywhere: no alias of `/domain/`, no `startsWith('/domain/')` branch kept "for safety" (D4 — the guard is the only place the old root is spelled).
- The dev DB is `saxonberg_build1`, **dropped before the drive** (D4). ⚠ The drop is a permitted-command problem: the previous session's `dropDatabase()` script was refused by the permission classifier. Ask the user to run `! cd packages/server && node -e "…dropDatabase…"` (the `!` prefix runs it in-session) or drop it in Atlas by hand — do not spend turns retrying a blocked command.

Three cross-cutting facts the plan relies on, verified against the tree:

- **View keys are path-shaped.** A locality's verb view is keyed `domain/<sphere>/<locality>/cmd/<verb>.yaml` in `commandContributions` (`Katie.ts:48`, `Whistle.ts:37`, `CrossingLog.ts:42`, `Desk.ts:29`) and the installer maps `domain/…` → `/domain/…` (`PackLogic.ts:173 commandViewPathOf`, `:663–676`, `:2953 viewKeyOfDocPath`; `CommandLogic.ts:173 offlineFileFor`, `:195 offlineViewKeys`). Every one of those `'domain/'` literals becomes `'world/'` in step 3 — and **generalises**: the walk that today opens `join(contentRoot, 'domain')` opens every top-level content dir that is not a kind dir, so `/trade/<industry>/cmd/<verb>` (reserved by D2) is served by the same rule with no second branch. **Planner's choice**: one rule — a view key is `<rel>` when its first segment is not `cmd`, `cmd/<rel>` otherwise; the doc path is `/<key>` or `/cmd/<key>`.
- **Document paths derive from the pack `root`** (`PackLogic.ts:705 root + key`, `:1279`, `:3117`); `RecipeCatalogue` rebuilds from `documents {kind: 'recipe'}` with no path filter (`RecipeCatalogue.ts:87`). So a pack with `root: /trade/smithing` shipping `content/recipes/belt-knife.yaml` installs the document at `/trade/smithing/recipes/belt-knife` and the catalogue serves it — no new machinery (D2). The recipe files carry no station paths (only `outputTemplate` under `/obj/…` and, for `daiquiri`/`martini`, `/domain/lounge/cocktail-glass` → `/world/lounge/cocktail-glass`).
- **`TITLE_ROOTS` exists twice** (`PackLogic.ts:2672` and `scripts/check-untitled-paths.ts:30`, asserted equal by `scripts/__tests__/check-untitled-paths.test.ts:23`). `lib/paths.ts` has **no imports** (a pure vocabulary module — `TemplatePaths`), so it is the one home: the installer imports it (inside `src/mud`, allowed) and the script imports it (scripts are outside `lint:imports`' scope, and the module pulls nothing heavy).

---

## Step 1 — the `/trade/` root, one `TITLE_ROOTS`, the lint gates know it (D2)

Commit: `feat(pack): the /trade/ title root — one TITLE_ROOTS in lib/paths.ts; lint:untitled + lint:instanceable recognise it`.

### 1.1 `mud/lib/paths.ts`

```ts
/** The title-bearing namespace roots — every shipped template path under
 *  one of these must lie under some pack's `requires.title` claim
 *  (lint:untitled; the installer's covered-extent rule). */
export const TITLE_ROOTS: readonly string[] = [
  '/obj', '/domain', '/cmd', '/compact', '/studio', '/wiki', '/home', '/corpo', '/trade',
];
```
(`/domain` becomes `/world` in step 3 — this step adds the ninth root only.) Doc comment names the four-namespaces doctrine roots in one line each: `/obj` the commons · `/trade` the industries · `/domain`→`/world` the places · `/compact` the state · `/corpo` the marks.

### 1.2 `obj/api/PackLogic.ts` ~L2672

Delete the local `TITLE_ROOTS`; `import { TITLE_ROOTS } from '../../lib/paths'`. `underTitleRoot` (~L2677) unchanged.

### 1.3 `scripts/check-untitled-paths.ts` ~L30

Delete the local constant; `import { TITLE_ROOTS } from '../src/mud/lib/paths'` (verify with `pnpm lint:untitled` that tsx resolves it; the module has no side effects). Keep the re-export so `scripts/__tests__/check-untitled-paths.test.ts:9` still imports it from the script; update the test at `:23–24` to the nine roots.

### 1.4 `mud/api/stuff.ts` ~L179

`allowedPrefixes = ['/obj/', '/lib/', '/domain/', '/trade/']` (the clone-namespace check; `/domain/` → `/world/` in step 3). Fix the comment at `:176–178`.

### 1.5 `scripts/check-instanceable-placement.ts`

Today's invariants (`:38` class under `/lib/`, `:42` path under `/lib/`, `:46` class resolves) are already root-agnostic — a `/trade/smithing/thing/anvil` file is walked like any other. Add **invariant 7** (planner's choice — D2's "the `obj/` segment rule recursed"): under `/trade/<industry>/`, a template whose `class:` names a concrete engine class must sit under `/trade/<industry>/obj/…` or `/trade/<industry>/command/…` — i.e. the instanceable convention inside the subtree; the `recipes/` dir is a document kind and is skipped by the existing `nonTemplateDirs` mirror (`check-untitled-paths.ts:32 NON_TEMPLATE_DIRS`, which `check-instanceable` must share — hoist that set next to `TITLE_ROOTS` in `lib/paths.ts` as `NON_TEMPLATE_DIRS` if it does not already read one; **check** the script's own skip list first).

### Tests (step 1)

- `scripts/__tests__/check-untitled-paths.test.ts`: nine roots; a `/trade/x/obj/y` path with no claim is reported; with a `/trade/x` claim it passes.
- `scripts/__tests__/check-instanceable-placement.test.ts` (exists? — `ls scripts/__tests__`; if not, add one on the `check-test-content` test's shape): a fixture `/trade/x/obj/thing.yaml` with `class: /obj/Prop` passes; `/trade/x/thing.yaml` with a concrete class is reported (invariant 7); `/trade/x/obj/thing.yaml` with `class: /lib/stuff/Thing` is reported (invariant 1, unchanged).

*Exit: `/trade/` is a root nine places agree on; nothing lives under it yet.*

---

## Step 2 — the content move: `content/domain/` → `content/world/` in every pack, and every path string in content (D1)

Commit: `refactor(paths): /domain/ → /world/ — pack content (one move commit)`.

⚠ This commit is green only because the **installer, the source tree and the tests still say `/domain/` until step 3** — no: the installer reads paths off the files, so after this commit `pnpm build` is green (no TS touched) but every test that clones `/domain/lounge/…` from pack files would miss. Therefore **steps 2 and 3 are ONE green boundary**: commit 2 (content), then commit 3 (source + tests) **immediately after, before running anything but `pnpm build`**. The two commits are separate only so the move is reviewable as a pure rename. Do not push between them; push after 3.

### 2.1 The moves (three packs)

```
git mv packages/content/world-seed/content/domain    packages/content/world-seed/content/world
git mv packages/content/newbie-wilds/content/domain  packages/content/newbie-wilds/content/world
git mv packages/content/platform/content/domain      packages/content/platform/content/world
```
(`saxonberg-lounge` has no `content/domain/` — its `root` is the only thing that changes.) 187 files.

### 2.2 The path strings inside content

`grep -rl '/domain' packages/content | xargs sed -i 's|/domain/|/world/|g; s|/domain\b|/world|g'` then **read the diff** — every hit is a template path (`class:`, `container:`, `populates:`, `assignee:`, `path:`, `controller:`, `outputTemplate:`, `startLocation`), a manifest `root:` / `extent:` / `template:` / `parentParcel:` / member `id:`, a `cmd:` example in `committee.yaml:27` / `transfer.yaml:19`, or prose. Manifests after: `platform` claims `/world` and boots `/world/void`; `world-seed` `root: /world`, its nine claims, four boot entries and Katie's id; `saxonberg-lounge` `root: /world/lounge` + claim; `newbie-wilds` claim + the `dependsOn` comment. The `dorm-themes.yaml` under `src/mud/domain` is source, step 3.

*Exit (with step 3): the content tree says `/world/`.*

---

## Step 3 — the source move: `src/mud/domain/` → `src/mud/world/`, every code literal, every test, the e2e specs (D1)

Commits: `refactor(paths): /domain/ → /world/ — src/mud/world, the view-key rule, the fallbacks, the lint allowlist, tests, e2e (one move commit)` — one commit holding the `git mv` plus every edit that keeps the tree green; if the reviewer wants the mechanical string sweep separate, split the **non-moved** files' sed into a second commit made in the same turn.

### 3.1 The move

```
git mv packages/server/src/mud/domain packages/server/src/mud/world
```
82 files (56 source + tests). Module ids follow the file (`ModuleApi` derives ids from the path under `src/mud/` — `module.ts:82`), so every `class: /world/lounge/Menu` in content (step 2) resolves once this lands; `lint:gates` is the tripwire (no `FromModule('/domain/…')` strings exist — verified).

### 3.2 Non-moved source, by file (the 39, minus prose-only)

| File | Change |
|---|---|
| `mud/api/stuff.ts:179` | `'/domain/'` → `'/world/'` in `allowedPrefixes`; comment `:176–178` |
| `mud/lib/paths.ts` | `TITLE_ROOTS`: `/domain` → `/world` |
| `mud/lib/config/AppSettings.ts:39` | `AppSettingFallbacks.defaultStartLocation: "/world/void"`; comment `:220` |
| `mud/lib/credential/Credential.ts:49–51` | the three terminal paths → `/world/…` |
| `mud/obj/command/civics/TitleController.ts:75` | `REGISTRY_ROOM = '/world/terminus/registry/office'` |
| `mud/obj/Gus.ts:37` | `ROOT = '/world/eternal/university-avenue'` |
| `mud/obj/command/tpa/ProcureCardController.ts:19`, `employment/TipController.ts:21`, `employment/CollectController.ts:20` | relative imports `../../../domain/…` → `../../../world/…` |
| `mud/obj/api/PackLogic.ts:173–176, 663–676, 2953` | the view-key rule generalised (see the cross-cutting fact): `commandViewPathOf` → `relKey.startsWith('cmd/') ? …`; the command-view walk iterates every top-level dir of `contentRoot` that is not in `nonTemplateDirs()` and not `cmd`, collecting files with a `cmd` segment; `viewKeyOfDocPath` unchanged in logic, comment says `/world/x/cmd/y` |
| `mud/obj/api/CommandLogic.ts:126, 173, 195` | the same generalisation for offline reads: `offlineFileFor` joins `root, key` when the first segment is not `cmd`; `offlineViewKeys` walks every non-kind top dir (needs the kind set — `PackApi.contentRoots()` already exists; **planner's choice**: add nothing to `PackApi`, hard-code the walk to skip `nonTemplateDirs` by importing the same set from `lib/paths.ts` once step 1 hoisted it) |
| `mud/obj/api/ScriptLogic.ts:121` | `authorPath.startsWith("/world/")` |
| `backend/PersistenceManager.ts:1175–1192` | **delete** the msh path migration block (D4) — read the enclosing method first; if it is the only body, delete the method and its call site |
| `mud/obj/VoidLocation.ts:4,23`, `mud/obj/LotGateExit.ts:14`, `mud/obj/FolderZone.ts:4`, `mud/obj/Business.ts:26,127`, `mud/obj/command/work/JobController.ts:288`, `mud/obj/command/author/TeleportController.ts:61`, `mud/lib/document/StoredDocument.ts:14`, `mud/lib/security/SecurityPolicies.ts:139,171`, `mud/lib/spatial/Container.ts:199,236`, `mud/api/pack.ts:222`, `mud/lib/standing/CreditRouting.ts:14,40`, `mud/api/security.ts:718–772`, `mud/api/provenance.ts:79`, `backend/Application.ts:815,818`, `mud/lib/persistence/Collections.ts:28`, `tools/illustrate.ts:14` | comment / doc-string / example text → `/world/` (`Collections.ts:28` is history — reword to "the former `/domain/`") |
| moved files' own literals | `world/terminus/paths.ts` (8), `world/lounge/paths.ts`, `world/lounge/LoungeWarren.ts:39–43`, `world/eternal/duncan-hall/DormWarren.ts:47–55`, `DormRoom.ts:57`, `world/common/tpa/paths.ts:9`, the four `commandContributions` keys (`Katie.ts:48–49`, `Whistle.ts:37`, `CrossingLog.ts:42–43`, `Desk.ts:29` → `world/eternal/…`), comments |

### 3.3 Lint scripts

- `scripts/check-test-content.ts:53` skip prefix `packages/server/src/mud/world/`; `:62 OFFENDER_RE = /\/world\/[a-z]/`; messages `:140–142`.
- `scripts/test-content-allowlist.txt`: 102 listed kernel tests keep their paths (they live outside `src/mud/domain`); the header comment says `/world/<locality>`. Run `pnpm lint:test-content` — a listed path that "no longer offends" is stale and fails; none should, since the tests' literals are renamed in 3.4.
- `scripts/check-untitled-paths.ts:13, 106` comments; the walk's `'domain'` special-case (if any at `:106`) becomes the generalised rule.
- `scripts/check-core-gone.ts` — unchanged.

### 3.4 Tests (128 `*.test.ts` name `/domain/`; 102 outside the moved tree)

`grep -rl '/domain' packages/server/src --include='*.ts' | xargs sed -i 's|/domain/|/world/|g'` then `git grep -n '/domain' packages/server` — read every remaining hit (should be only the `Collections.ts` history line and the boot guard's own literal, step 5). Move-tree tests (`src/mud/world/**/__tests__`) are covered by the same sed. `lounge-fixtures.ts` and `seed-repoint.test.ts` read pack files by path — check they build the path from the pack root, not a hard-coded `content/domain`.

### 3.5 e2e

`e2e/tests/{mortality,commands,work-drive,sandbox,hinkley,drive-wave2,drive-crafting,chargen,smoke,multiplayer}.spec.ts` (20 lines) — sed the same; `drive-crafting.spec.ts:47,115` become `/world/hearthworks/smithy` / `cookhouse` (still venue rooms after step 4). No client file names `/domain/` (verified: zero hits under `packages/client/src`).

### 3.6 Validation at the boundary

`pnpm build`; `pnpm test:near` (touches ~180 files — expect the near set to be large; run it in the background with a watcher, cap 10 min); the full lint family; `git grep -n '/domain' -- packages e2e` → only `Collections.ts:28` (history) and nothing else.

*Exit: `/world/` everywhere; `/domain/` survives as one history comment.*

---

## Step 4 — the hearthworks re-cut: two industry packs, the commons rows home, the venue stays (D3)

Commits: `feat(pack): trade-smithing + trade-hearth-cooking — hearthworks re-cut, introduces-vs-commons (one move commit)`.

### 4.1 The two packages

`packages/content/trade-smithing/` and `packages/content/trade-hearth-cooking/`, each with `package.json` (`@saxonberg/content-trade-smithing` / `-trade-hearth-cooking`, `private`, `type: module`, on `world-seed/package.json`'s shape) and `pack.yaml`:

```yaml
id: trade-smithing
version: 0.1.0
root: /trade/smithing
description: >-
  The smithing trade — what smithing introduces: its stations (anvil,
  whetstone, workbench), its stock (iron ingots) and its recipes. Fire
  stations (Forge, Oven, Kiln, CookPot) are fire-substrate commons under
  /obj; the Hearthworks smithy is the venue that hosts this trade.
dependsOn: [platform, generic-objects]
requires:
  groups:
    - name: smithing
      purpose: the smithing trade's own body
      owner: { office: prime-minister }
  title:
    - { extent: /trade/smithing, holder: { group: smithing } }
```
`trade-hearth-cooking` the same with `hearth-cooking` / `/trade/hearth-cooking` and "its recipes (toasted-ration, root-mash); its stock is commons (A16.3)". No `boot:` (nothing eager). `maintainers` defaults (`<id>-maintainers`, PM-owned — the wave-3 default). Add both to `packages/server/package.json` `dependencies` (alphabetical, `workspace:*`) and `pnpm install` (lockfile change rides the commit).

### 4.2 The moves (from `packages/content/world-seed/content/world/hearthworks/`)

```
# smithing — stations + stock
git mv …/hearthworks/anvil.yaml       packages/content/trade-smithing/content/obj/anvil.yaml
git mv …/hearthworks/whetstone.yaml   packages/content/trade-smithing/content/obj/whetstone.yaml
git mv …/hearthworks/workbench.yaml   packages/content/trade-smithing/content/obj/workbench.yaml
git mv …/hearthworks/iron-ingot.yaml  packages/content/trade-smithing/content/obj/iron-ingot.yaml
git mv …/hearthworks/spare-ingot.yaml packages/content/trade-smithing/content/obj/spare-ingot.yaml
# smithing — recipes (from generic-objects)
git mv packages/content/generic-objects/content/recipes/{fire-poker,smiths-hammer,belt-knife,cook-pot,leather-jerkin}.yaml packages/content/trade-smithing/content/recipes/
# hearth-cooking — recipes
git mv packages/content/generic-objects/content/recipes/{toasted-ration,root-mash}.yaml packages/content/trade-hearth-cooking/content/recipes/
# commons — into generic-objects under its /obj/items claim
git mv …/hearthworks/{prime-cut,stew-meat,ration-stock,root-vegetables,hide-stock,dry-log,wet-log}.yaml packages/content/generic-objects/content/obj/items/
```
Stays in `world-seed` at `/world/hearthworks/…`: `hearthworks.yaml`, `smithy`, `cookhouse`, `cellar`, `woodshed`, `forge-floor`, `business`, `npc/smith`, `npc/cook`, `kitchen-menu`, `smithy-menu`, `pantry-chest`. Resulting paths: `/trade/smithing/thing/anvil` etc., `/trade/smithing/recipes/belt-knife` etc., `/obj/items/prime-cut` etc.

**Planner's choice — `/obj/items/` for the commons** (generic-objects already claims `/obj/items`; a Provision/Prop/Firewood is an item). The alternative (`/obj/<Name>` loose rows under the platform's `/obj`) would put shipped goods under the executive's title; the items branch is the pack's own.

### 4.3 The references that repoint (all inside `world-seed/content/world/hearthworks/`)

- `smithy.yaml:23–31` `populates:` → `/trade/smithing/thing/iron-ingot`, `/trade/smithing/thing/spare-ingot`, `/trade/smithing/thing/anvil`, `/trade/smithing/thing/workbench`, `/obj/items/hide-stock`, `/trade/smithing/thing/whetstone` (the menu + npc stay `/world/hearthworks/…`; `/obj/Forge`, `/obj/gear/smiths-hammer` unchanged).
- `cookhouse.yaml:20–32` → `/world/hearthworks/kitchen-menu`, `/world/hearthworks/pantry-chest`, `/obj/items/root-vegetables` ×2, `/obj/items/stew-meat`.
- `pantry-chest.yaml:17–18` → `/obj/items/prime-cut`, `/obj/items/ration-stock`.
- `cellar.yaml:24`, `woodshed.yaml:17–19` → `/obj/items/dry-log` / `wet-log`.
- `business.yaml:13,25,29,34,35` — venue paths, already `/world/hearthworks/…` after step 3; unchanged here.
- No recipe references a station path (verified — recipes carry `toolCapabilities`, not paths).

### 4.4 Coverage and the tests

- The covered-extent rule: `trade-smithing`'s rows are under its own claim; the commons rows under generic-objects' `/obj/items`. `lint:untitled` proves it.
- `PackLogic.discover.test.ts`: the two packs order after `generic-objects` (dependsOn); `pack status` lists eighteen.
- `src/mud/world/hearthworks/__tests__/hearthworks*.integration.test.ts` and `src/mud/world/__tests__/business-authority.test.ts`: repoint the literals (`/world/hearthworks/anvil` → `/trade/smithing/thing/anvil`, …). `RecipeCatalogue` tests (`grep -rl RecipeCatalogue src --include='*.test.ts'`) that read recipe fixtures from `generic-objects/content/recipes` must find the seven moved files at their new roots — if a test enumerates the directory, point it at all three packs' `recipes/` dirs via `PackApi.contentRoots()`.
- `e2e/tests/drive-crafting.spec.ts` — unchanged (venue rooms).

### 4.5 `lint:instanceable` + `lint:untitled` green; `pnpm build`; `test:near`.

*Exit: hearthworks is three packs; the trades own what they introduce.*

---

## Step 5 — the migration branches die; the boot guard (D4)

Commits: `chore(parcel): delete wave 3's grant migration branches (core-held, retired boards)` · `feat(bootstrap): refuse to boot a pre-rename database (/domain/ content rows)`.

### 5.1 `obj/ParcelRegistry.ts`

Delete `RETIRED_BOARDS` (`:62–70`) and the `migrated` arm of `grant` (`:339–356`) — an existing row under a different holder is `conflict`. `lib/parcel/ParcelRecord.ts:84` `TitleGrantOutcome = "granted" | "kept" | "conflict"`; `api/parcel.ts:196` doc; `PackLogic.ts:2889` drop the `migrated` case and the `titlesMigrated` field of `PackRequiresResult` (`api/pack.ts` — grep `titlesMigrated`; the report line in `PackController` and `AppBootstrap`'s boot line drop the "N migrated" segment). `PackLogic.ts:2942` delete the `core` line in `soldPredicateFor` and the `migration-note` sentence at `:2930`.

### 5.2 Tests

`obj/__tests__/ParcelRegistry.grant.test.ts:156–180` — the two `migrated` cases become one: a row held by a different group → `conflict`, no write, no event. `obj/api/__tests__/PackLogic.requires.test.ts:242–252` — the `core`-held row is now a `title` conflict; assert the conflict is recorded and the template row is still written (the sold predicate no longer exempts anything — a `core`-held covering parcel would now count as sold; the fixture should use a holder in the pack's set or assert `skip-sold`). `grep -rn migrated packages/server/src --include='*.test.ts'` — the other ten files use the word in unrelated senses (`Application.test`, `Currency.test`, …); leave them.

`pnpm lint:core-gone` — zero `migration-note` sites; the marker mechanism stays in the script.

### 5.3 The guard (`backend/AppBootstrap.ts`, before `PackApi.install()` ~L144)

**Planner's choice**: the check is a `PackApi.assertNoLegacyPaths()` static → `PackLogic.assertNoLegacyPathsImpl()` (module-private + one public gated method, the wave-3 shape), so it is testable through `pack-harness`'s `stubPersist` store (`rows` with `__col ?? 'content'`). Body: `PersistApi.find(Collections.Content, { path: { $regex: '^/domain/' } })` (or count) → if `> 0`, `console.error` one line — *`PackApi: this database holds N content row(s) under the retired /domain/ root (content-packs wave 4a renamed it /world/ with NO migration). Drop database '<dbName>' and boot again; see docs/deployment.md § The Mongo environment policy.`* — and `throw` an `Error` the boot does not catch. `AppBootstrap.run` calls it after `connect`, before `install`, with no try/catch; `index.ts`'s existing top-level handler exits non-zero (verify — `src/index.ts` wraps `main()`; if it swallows, add `process.exitCode = 1` + rethrow). The `'/domain/'` literal here is the **only** one left in source; comment it as such.

### 5.4 Tests

`obj/api/__tests__/PackLogic.guard.test.ts`: one `/domain/x` row → throws with the message naming the count; no rows / only `/world/` rows → resolves. `AppBootstrap` itself is not unit-tested today; the drive (step 7) covers the wiring.

### 5.5 `docs/deployment.md` § The Mongo environment policy (`:130–143`): add the drop instruction — *after wave 4a every build DB and the demo DB must be dropped once; the boot refuses otherwise*.

*Exit: no migration code remains; a stale database cannot boot.*

---

## Step 6 — the platform e2e lands in `/world/void` by name; the main e2e specs (D5)

Commit: `test(e2e): the platform-only spec asserts the void by name; /world/ in the specs`.

- `e2e/tests-platform/platform-only.spec.ts`: after entering, `look` and assert the void renders — **check** what `look` prints for `VoidLocation` (a plain `Location`, no `Named`; the `Mml.location` header is what appears — drive it once against the platform stack and assert on that text). The spec's header comment loses the "meaningful only on a fresh database" caveat: CI's database is always fresh, and locally the guard has already forced a drop.
- The main specs were sed'd in 3.5; nothing else.

*Exit: both e2e configs describe `/world/`.*

---

## Step 7 — docs, the one full suite, the drive, the MR

Commits: `docs(pack): content packs wave 4a — subsystem docs`.

### 7.1 Docs (locate by grep; the counts are today's `/domain` hits)

- `content-packs.md` (26): the roots paragraph at `:644–645` (nine roots, `/trade`), the pack table `:807–822` (eighteen rows; `trade-smithing`, `trade-hearth-cooking`; `world-seed` minus hearthworks' trade rows), the view-key rule (`:299`, the generalised rule), `/world/void` at `:776`, Deferred `:856–860` (wave 4b: archetypes, hospitality, the venue packs), Key files `:872–895`, History.
- `parcel.md` (9): the `grant` outcomes (three, not four), the migration-branch paragraph at `:267` deleted, `/world/` in examples, history note.
- `document-store.md` (2), `crafting.md` (2: recipes live in the trade packs; the catalogue is path-agnostic), `command-spec.md` (7: `world/<sphere>/<locality>/cmd/`, the generalised key rule, `/trade/<industry>/cmd/` reserved), `templates.md` (0 hits — add one sentence on the nine roots if it lists them), `deployment.md` (5.5).
- `docs/mql-grammar.md` / `docs/subsystems/*.md` sweep of `/domain/` examples: **at the pre-merge sweep**, not here (the wave-3 precedent: 37 docs, one fork); this commit does the seven above. CLAUDE.md's file-naming paragraph (`domain/<sphere>/<locality>/cmd/`) and Module Categories table: **sweep**.

### 7.2 Validation

`pnpm build`; the full lint family; **one** `pnpm test` (background, watcher on `EXIT:`); `pnpm test:e2e:platform`; `pnpm e2e` if the stack can be brought up (both against the dropped `saxonberg_build1`).

### 7.3 The drive (recorded on the MR beside the wave-3 numbers)

1. **Drop `saxonberg_build1`** (user-run — see the conventions). Boot: eighteen packs, every pack `inserted` = its row count (platform ≈ 417, world-seed 165 − 12 moved, generic-objects +7 −7, trade-smithing 5 + 5 recipes, trade-hearth-cooking 2 recipes), every claim `granted`, zero `migrated` (the word no longer exists), `BootstrapManager: bootstrapped 40`, no "template not found".
2. Second boot: all-zero.
3. `pack status`: eighteen; `PackApi.orphans` empty (`pack status` prints the orphan line as 0).
4. As the founder: land in the lounge at `/world/lounge/…` (`look`); `goto /world/hearthworks/smithy`; `look` shows the anvil, whetstone, workbench, ingots; `craft belt-knife` (or the drive-crafting spec's sequence) produces the knife; `goto /world/hearthworks/cookhouse`; `craft root-mash`.
5. `lint:untitled` → 0; `git grep '/domain'` → the guard + history only.
6. **The guard**: with the dev server stopped, insert one `content` row `{ path: '/domain/x', class: '/obj/Prop' }` by hand (the same permitted-command caveat), boot → refused with the message; delete the row, boot → fine. If inserting is blocked, the unit test stands in and the MR says so.
7. Platform-only e2e green; main e2e green (or: which specs ran).

### 7.4 The MR

`create_merge_request` via the GitLab MCP, source `design/content-pack-wave-4a` → `master`, description on the wave-3 MR's shape: what lands · the acceptance-criteria table (below) filled in · the drive · planner's choices (the generalised view-key rule; `TITLE_ROOTS` + `NON_TEMPLATE_DIRS` in `lib/paths.ts`; invariant 7; `/obj/items/` for the commons; the guard as a `PackApi` static; `conflict` replacing `migrated` in the sold predicate's semantics) · known gaps.

---

## Acceptance-criteria mapping

| Criterion | Step | Test / verification |
|---|---|---|
| 1. `git grep '/domain/'` → history only; `src/mud/world/` exists | 2, 3 | the grep in 3.6; `git ls-files` |
| 2. One `TITLE_ROOTS`, nine roots; `lint:untitled` zero; `lint:instanceable` `/trade/` cases | 1 | `check-untitled-paths.test`, `check-instanceable-placement.test` |
| 3. Two packs discover after `generic-objects`; fresh install all `inserted`/`granted`; eighteen; orphans empty | 4, 7 | `PackLogic.discover.test`; drive (1)(3) |
| 4. `RecipeCatalogue` serves the seven moved recipes; `craft` unchanged | 4, 7 | crafting tests; drive (4); `drive-crafting.spec` |
| 5. Venue `populates:` + station refs resolve at the new paths | 4, 7 | hearthworks integration tests; drive (1) "no template not found" |
| 6. No migration branch; `lint:core-gone` zero sites; `migrated` tests rewritten | 5 | `ParcelRegistry.grant.test`, `PackLogic.requires.test`, `lint:core-gone` |
| 7. The boot guard refuses one `/domain/` row; clean DB boots | 5, 7 | `PackLogic.guard.test`; drive (6) |
| 8. The msh path migration is gone | 3 | `git grep scripts/ backend/PersistenceManager.ts` |
| 9. Both e2e configs green; the void asserted by name | 6, 7 | `platform-only.spec`; `pnpm e2e` |
| 10. Full suite, lint family, build; the drive recorded | 7 | CI + one `pnpm test` |
| 11. Docs | 7 + sweep | doc diff |

---

## Risks & ordering constraints

- **Steps 2 and 3 are one boundary.** After the content move alone every path-naming test fails; commit 3 must follow in the same turn, and nothing is pushed between them. If the session dies between, the tree is red at HEAD — the stop protocol's "revert the partial" applies to commit 2.
- **The view-key generalisation is the one real code change in the rename**, and it has four consumers (`PackLogic` read + `viewKeyOfDocPath`, `CommandLogic` offline read + key enumeration). `CommandLogic.store.test` + the controller-seeds integrity test (`grep -rl 'controller-seeds' src`) are the proof; a miss shows as the seven eternal verbs vanishing from `help`.
- **`test:near` after step 3 is huge** (~180 touched files); run it in the background with an `until grep EXIT` watcher. The three `mql-subscription.*` tests time out under load — they pass alone; note it, do not chase it.
- **`lint:test-content`'s allowlist is path-keyed**: moving `src/mud/domain` does not touch it (those tests were exempt, not listed), but a sed that renames a listed kernel test's *literal* from `/domain/` to `/world/` keeps it an offender under the new regex — the list is stable. Verify by running the lint, not by reasoning.
- **The commons rows' new paths change their `templatePath`** — nothing persisted references them (fresh DB), but `lounge-fixtures`-style tests that clone `/domain/hearthworks/prime-cut` by literal must be repointed (grep in 4.4).
- **`RecipeCatalogue` rebuild on `pack sync`** (`RecipeCatalogue.ts:9`): a live `pack sync trade-smithing` must re-index; the wave-2 hook already keys on the `recipe` kind regardless of pack — verify once in the drive.
- **The guard's regex** must be anchored (`^/domain/`) — `/home/x/domain-notes` is not a hit.
- **The DB drop is user-run.** Do not retry a blocked drop command; ask once, continue with everything that does not need the fresh database, and record what was not driven.
- **`pnpm install` after adding the two packages** changes `pnpm-lock.yaml`; stage it by name in step 4's commit.

---

## Context budget

| Step | Files touched (approx.) | Weight |
|---|---|---|
| 1 | ~6: paths.ts, PackLogic, stuff.ts, 2 scripts, 2 tests | light |
| 2 | 187 `git mv` + ~40 content edits + 4 manifests | medium (mechanical) |
| 3 | 82 `git mv` + ~40 source edits + ~130 test seds + 10 e2e + 3 scripts | **heaviest** — one boundary with 2 |
| 4 | 2 packages + 19 `git mv` + 5 venue yaml edits + package.json/lockfile + ~4 test repoints | medium |
| 5 | ~8: ParcelRegistry, ParcelRecord, parcel.ts, pack.ts, PackLogic, PackController, AppBootstrap, PersistenceManager + 3 tests + deployment.md | medium |
| 6 | 1 spec | light |
| 7 | ~7 docs; drive; MR | medium |

Pace: 1 → (2+3 together) → 4 → 5 → 6 → 7. Clean handover points: after 1, after 3, after 4, after 5.

## Stop protocol

If stopping before step 7, the MR description (or a `docs/plans/content-pack-wave-4a-plan.md § Build status` block appended in the last commit — one or the other, not both) states:

1. **Done:** the step numbers completed, each with its exit line, and the commit range.
2. **Not done:** the remaining steps verbatim, with any partially-applied step called out as *reverted* — ⚠ a content move without its source move (commit 2 without 3) is the worst shape to leave; `git revert` it or finish 3.
3. **The grep count:** `git grep -c '/domain' -- packages e2e` at HEAD, and which hits are intentional (the guard, `Collections.ts` history).
4. **Packs:** eighteen shipped? which of `trade-smithing` / `trade-hearth-cooking` exist; whether the commons rows moved.
5. **Tests:** which `test:near` scopes ran green at the last boundary; whether the full suite ran (it should not have unless step 7 was reached — say so).
6. **Drive:** which of the seven drive items were exercised; whether the database was dropped (and by whom).
7. **Open flags:** which planner's-choice deviations are in the tree (the generalised view-key rule, `TITLE_ROOTS`/`NON_TEMPLATE_DIRS` in `lib/paths.ts`, invariant 7, `/obj/items/` for the commons, the guard as a `PackApi` static, the sold predicate without the `core` exemption).
