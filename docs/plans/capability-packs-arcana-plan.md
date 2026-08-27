# Capability packs, arcana first — implementation plan

Plan for the capability-packs build (requirements D1–D9). Phase 2 of the
workflow: *how*, given the requirements' *what* and *why*. Written for a
fresh-context build agent; read the requirements doc and the subsystem docs
it lists first (content-packs.md, magic-items.md, magic.md, hot-reload.md,
templates.md, slot.md, embodiment.md, metabolism.md, advancement.md).

The build runs in worktree `build-1` on branch `design/capability-packs-arcana`
(rename to a build slug or keep — one branch, one worktree). Stage by name,
never `git add -A`; `git mv` stages immediately. Push every turn.

The DB is dropped, not migrated: **anything that reads "legacy", "adopt",
"fallback for the old path" is junk on sight.** A fresh boot is the only
boot this plan cares about.

## What the code survey changed

Nine findings from reading the shipped seams. Each moves work or shrinks it.

**1. Prod runs `tsx` from source, not built JS.** `deployment.md § Runtime
shape`: *"The server runs from TypeScript source via `tsx`, not a compiled
`dist`... `pnpm build` (tsc) is a typecheck gate, not the runtime."* The
server `start` script is `tsx src/preload.js`; the Dockerfile runs tsx.
There is **no built-JS path to plan for.** The whole of hard problem (a)
reduces to: tsx must transpile pack `.ts` with the right tsconfig, the
call-security loader hook must stamp pack modules, and `tsc` must typecheck
pack source. The hot-reload doc's "prod `dist/` concern" paragraph is
already moot and the plan does not reintroduce it.

**2. tsx 4.21 applies a tsconfig only to files that tsconfig `include`s.**
Verified in `node_modules/tsx/dist/register-*.cjs`: `fileMatcher =
createFilesMatcher(tsconfig)` and the transform passes `tsconfigRaw:
fileMatcher?.(filePath)`. tsx loads ONE tsconfig (the cwd's,
`packages/server/tsconfig.json`, whose `include` is `src/**/*`). A file under
`packages/content/arcana/src/` would therefore be compiled with esbuild
defaults — **no `experimentalDecorators`** — and every `@CallSecurity`
controller decorator in a pack would silently compile as a TC39 decorator
and break. So the server's `tsconfig.json` `include` must cover pack `src/`
(Phase 1), and `rootDir: ./src` must go (tsc refuses files outside rootDir).
Vitest (vite's esbuild) uses the *nearest* `tsconfig.json` per file
instead, so each capability pack also carries its own `tsconfig.json`.
Both are small; both are load-bearing.

**3. The loader transform gates on the literal `/mud/` path segment.**
`services/loader/transform.js`: `shouldTransform` returns false unless the
path contains `/mud/`; `computeRegistryImportPath` locates `mud/api/module`
by slicing the path at `/mud/`; `resolveRelativeModuleGates` derives the
module's own id the same way. `ModuleApi.#normaliseUrl` strips
`SOURCE_ROOT_HINTS` (`packages/server/src/mud/` …) to make the module-id.
None of these know about `packages/content/<pkg>/src/`. Pack classes would
load **unstamped**, so `FromModule('/arcana/idea/cmd/magic/CastController')`
would deny. Phase 1 teaches all four sites the pack layout.

**4. The literal rung check would fail two shipped packs.** `saxonberg-lounge`
(root + claim `/world/lounge`) names `class: /world/lounge/thing/LoungeTerminal`
etc.; `hearthworks` names `/world/hearthworks/SealedCellar`. Both resolve
from the **kernel** tree (`mud/world/`) — the parked code the requirements'
non-goals keep there. A rule "a `src/`-less pack whose `class:` lies under
its own namespace fails" would flag both. D4's own wording is the way out:
`requires-kernel` *records where each class resolved*. The rung check keys
on **resolution origin**, not on path prefix (see § The rung check). Recorded
under Blockers / deviations as an interpretation, not a change of decision.

**5. Two kernel mixins name the views D8 moves.** `lib/magic/Caster.ts`
(`CASTING_VERB_YAMLS = ['platform/cmd/magic/cast.yaml', 'platform/cmd/magic/spells.yaml']`)
and `lib/magic/Charged.ts` (`commandContributions` → `zap.yaml`,
`recharge.yaml`). A `commandContributions` string *is* the view's document
path (`CommandLogic`: "the key is the path"), so after D8 these kernel
modules must say `arcana/cmd/magic/cast.yaml` — a kernel module naming a
pack's row, against D3's rule. `Caster` rides `Avatar`/`NPC` (kernel
agents), so there is no pack class to move the affordance to. This is a
genuine tension between D3 and D8; the plan takes the minimal path (the
mixin that declares the verb names the verb's view, wherever the view lives)
and records it as a deviation for the user to confirm. `Spellbook`'s
`study.yaml` contribution moves *with* Spellbook into arcana, so it is fine.

**6. `sustainedBy` is a template path, and `discharge` reads the actor from
the execution context.** `sustainedRecord` sets `sustainedBy =
durableIdOf(ctx.source)` = `getTemplatePath()` when the source is `Charged`;
`Vitals.renewSustained` looks it up with `StuffApi.findByTemplatePath`, and
`dischargeImpl` takes `actor` from `ExecutionContextApi.getCurrentCommandGiver()`.
Consequences for D5: the wear wiring calls `MagicApi.discharge(ring,
wearer)` from inside the `wear` command (the wearer IS the command giver);
on **persistence restore** there is no command giver *and* the wearer's
sustained Condition is itself persisted, so the witness must not re-fire —
it skips when `drawActive` is already true. Two rings of one template on one
wearer are indistinguishable by `sustainedBy`; documented, not fixed.

**7. `veil` and `glowlight` author no band variation.** `lint:blessed-bands`
requires that any template whose class composes `BlessableMixin` carry a
working with an authored band field (a 2–3 element list or a `bands:`-scoped
effect). Ring and Amulet compose `Blessable` (D5, the Wand composition), so
the exemplar rows fail the lint unless the two spells gain band authoring.
`MagicEffects.forBand` band-resolves **any** field authored as a 2–3 list, so
`disguise: [...]` on veil and a `bands: [cursed]` `afflict` of the shipped
`dread` Condition on glowlight are each a few honest lines (Phase 5).

**8. `lint:test-content` is not touched by pack tests.** Its `OFFENDER_RE`
is `/\/world\/[a-z]/` — `/stuff/thing/magic/*` is not an offender at all —
and its `SCAN_ROOTS` do not include `packages/content/` (which is also in
`EXEMPT_PREFIXES`). Hard problem (j) needs no scope change; a test asserting
the exemption is the only addition.

**9. `PackLogic.discover(packRoots?)` already accepts explicit roots**, and
the test harness (`pack-harness.ts` `writePack`) writes fixture packs to a
tmp dir. The mis-rung fixture test rides this. Because D4 retires manifest
`dependsOn` in favour of `package.json` dependencies, `writePack` must
write a `package.json` (`{ name: '@saxonberg/content-<id>', dependencies:
{ '@saxonberg/content-<dep>': 'workspace:*' } }`) instead of a `dependsOn`
key — one harness change, every PackLogic test keeps its `dependsOn` option.

**10. (Amendment, 2026-08-27.) The packs are headed for their own repos.**
The first draft had packs import the kernel by relative path
(`../../../../server/src/mud/…`), which encodes this monorepo's layout into
every pack file and dies at the split. § (a) and § (d) now use a package
specifier over an `exports` map, and the pack list moves from the server's
`package.json` to the deployment's — the two edits that make a pack
repo-portable with no other change.

## The hard problems, decided

### (a) How a pack's TS is resolved and compiled

- **Runtime (dev and prod, both tsx):** `StuffApi` imports a pack class by
  **absolute file URL** (`import(pathToFileURL(file).href)`), exactly the
  shape `HotReloadApi.#doReload` already uses. tsx transpiles any `.ts` it
  loads (the realpath is outside `node_modules`, since `require.resolve`
  follows pnpm's symlinks). Server `tsconfig.json`: `include` gains
  `"../content/*/src/**/*"`, `rootDir` is removed (tsc's emit is a typecheck
  artefact nobody runs; `dist/` stays gitignored). That is what makes
  `experimentalDecorators` reach pack files under tsx (finding 2).
- **Pack → kernel imports are package specifiers, through an export map**
  (amended 2026-08-27 — the packs are headed for their own repos, and a
  relative path encodes this monorepo's layout into every pack file).
  A pack imports `@saxonberg/server/mud/lib/stuff/Thing`; the pack's
  `package.json` depends on `"@saxonberg/server": "workspace:*"`; the
  server's `package.json` gains an **`exports` map** enumerating the
  subpaths a pack may reach (`"./mud/lib/*": "./src/mud/lib/*.ts"`,
  `"./mud/api/*": "./src/mud/api/*.ts"` (single level — never `api/mql/**`
  or `api/mml/**`), `"./mud/platform/thing/*"`, `"./mud/platform/idea/*"`
  with `platform/idea/api/**` and `platform/idea/hooks/**` **not** listed,
  `"./mud/platform/agent/*"`, `"./mud/platform/location/*"`,
  `"./test-bootstrap"`, `"./services/loader/vite-plugin"`). Nothing else
  is exported — not `backend/`, not `world/**`, not `platform/idea/api/**`.
  tsx, vitest and tsc (`moduleResolution: bundler`) all honour `exports`;
  the resolved file is the same physical `.ts`, so a pack's `Thing` is the
  kernel's `Thing` and the loader hook stamps it as a kernel module. The
  former cycle (server → packs → server) is broken on the *server's* side:
  the server never depends on a pack (below). Rejected: relative paths
  (die at the repo split); a tsconfig `paths` alias (three declarations;
  tsx applies `paths` only to included files).
- **Typecheck:** each capability pack gets `tsconfig.json` (extends
  `../../../tsconfig.base.json`, `include: ["src/**/*"]`, `noEmit: true`)
  and `"build": "tsc"` in `package.json`, so `pnpm -r build` typechecks it.
  Vitest also finds this tsconfig as the nearest one for pack test files.
- **Tests:** each capability pack gets `vitest.config.ts` re-exporting the
  server's plugin + `sharedTest` (`import { callSecPlugin } from
  '@saxonberg/server/services/loader/vite-plugin'`) and `"test": "vitest run"`.
  The root `pnpm test` is already `pnpm -r test`, so pack suites join it with
  no root edit. `test-near.ts` grows: a changed file under
  `packages/content/<pack>/src/` selects that pack's sibling `__tests__`
  and runs `pnpm --filter @saxonberg/content-<pack> exec vitest run <sel>`.
  `check-test-bootstrap.ts`'s `TEST_ROOTS` and `IMPORT_RE` widen to pack
  `src/**` (the import is `'@saxonberg/server/test-bootstrap'`).
- **The one dependency line lives in the DEPLOYMENT, not the server.**
  The workspace root `package.json` is the deployment manifest: it gains
  `"dependencies": { "@saxonberg/content-platform": "workspace:*", … all
  nineteen }` and `packages/server/package.json` **loses every
  `@saxonberg/content-*` line**. A33's `pnpm add @saxonberg/content-<id>`
  is then literally the act of installing a pack, and when the packs are
  their own repos the root manifest is the only file that changes.
  Discovery (`packNamesFromServerDeps` → `packNamesFromDeployment`) reads
  the root manifest — the server is told the deployment root
  (`SAXONBERG_DEPLOYMENT_ROOT`, default: the nearest ancestor
  `package.json` above the server with `@saxonberg/content-*`
  dependencies) and `createRequire`s from there. The `SAXONBERG_PACKS`
  filter is unchanged.

### (b) `HotReloadApi` keyed on absolute paths

Unchanged. The registry is path-agnostic. The one place that turns a class
path into a file (`StuffApi.#resolveAbsoluteClassPath`) becomes
table-aware and is exposed as `StuffApi.resolveClassFile(classPath):
ClassResolution` (`{ file, origin: 'kernel' | { packId } }`). `loadClassByPath`,
`#cloneInner`, `resolveExport(Sync)` call it — so a pack brain module rides
the table too. `ReloadController` resolves a target that begins with a
class-namespace root (kernel `/platform|/lib|/world|/trade`, or any pack
namespace in the table) through `StuffApi.resolveClassFile` before falling
back to the workspace-logical join, so `reload /arcana/thing/Wand` works.
`pack sync <id>` gains a code tail: for every `.ts` under the pack's `src/`
whose sha256 differs from the record's `codeVersions` map, `HotReloadApi.reload(file)`;
the record stores the map (a new `codeVersions?: Record<string,string>` on
`PackInstallRecord`, a new "record" key is not a manifest key). `pack
status` prints `capability` / `data` and `code: current | stale — restart owed`
by comparing the map against disk.

### (c) The module-id root list

`ModuleApi` gains `registerPackSource(absSrcDir, namespaceRoot)` and a
`#packRoots` list consulted **before** `SOURCE_ROOT_HINTS` in `#normaliseUrl`
(longest absolute dir wins): `…/packages/content/arcana/src/thing/Wand.ts` →
`/arcana/thing/Wand`. `PackLogic` discovery registers every pack that has a
`src/` (root + each title claim → the same `src/`), before `requires-kernel`
imports anything. A test that imports a pack class without discovery
(e.g. a pack unit test) registers through `test-bootstrap`, which calls
`PackApi.registerSources()` (discovery's registration half, no install).
`transform.js`: `shouldTransform` accepts `/packages/content/<x>/src/`;
`computeRegistryImportPath` locates the repo root at `/packages/content/`
and points at `packages/server/src/mud/api/module`; `resolveRelativeModuleGates`
leaves relative gates in pack files untouched — **pack code writes absolute
`FromModule` strings** (a documented rule; `lint:gates` enforces
resolvability). `resolveModuleId` and `FromModule` are unchanged.

### (d) The pack import profile — the server's `exports` map IS the boundary

The author surface a pack may import is the **`exports` map in
`packages/server/package.json`** (§ a): `mud/lib/**` (mixin factories,
value objects, abstract roots — `CommandController`, `SpellKnowledge`,
`Fade`, `MagicGrid` live here and the moved controllers import them),
`mud/api/*` (the facades, single level), and
`mud/platform/{thing,idea,agent,location}/**` **minus**
`platform/idea/api/**` (logic singletons) and `platform/idea/hooks/**`.
`Potion extends Receptacle` and `PotionMaterial extends ConsumableMaterial`
are why `platform/<branch>/` is exported; the omissions are what keep it
"author surface" rather than "everything". Not exported, therefore
physically unreachable: `backend/`, `services/` (bar the vite plugin),
`config/`, `world/**` (parked venue code — a pack that needs a venue's
class waits for that venue's pack), `platform/idea/api/**`.

Node, tsx, vitest and tsc all refuse a subpath the map does not list, so
the boundary is enforced by the package, not by a script's opinion — and
a pack that needs something un-exported has found a kernel MR (the *mod*
rung). Widening the map is a deliberate, reviewable edit to one file.

`lint:imports` still grows a `pack` tier (files under
`packages/content/*/src/`, tests unrestricted), because the map cannot
see three things: a **relative escape** (`../../../server/src/…` — the
form this amendment retires; any relative import leaving the pack's own
`src/` fails), a **pack-to-pack** import (`@saxonberg/content-<x>/src/…`
allowed only when `<x>` is in the importer's `package.json`
`dependencies`), and **any other package** (only `@saxonberg/server/*`,
`@saxonberg/types`, declared pack deps; no Node built-ins). The script
reads the export map to verify a `@saxonberg/server/*` specifier is
exported, so the two never drift. `lint:imports`' kernel tier is
unchanged.

### (e) Catalogues warm by class

`Template` gains `findByClass(classPath)` (`{ class: classPath }` query —
the same `PersistApi.find` shape as `findDescendants`). `DisciplineCatalogue.loadCacheFromTemplates`
→ `Template.findByClass('/platform/idea/Discipline')`; `SpellCatalogue` →
`findByClass('/platform/idea/magic/Spell')`. `TemplatePathPrefixes.discipline`
and `.spell` are deleted with their `TEMPLATE_PATH_PREFIX` statics
(`Spellbook.setTeachesSpellPath`'s hint string is prose and stays).
`check-blessed-bands.ts` keys spells by path from the file's own location
(it already does).

### (f) `locus:` on `emit-field` and shock `inject-channel`

`EmitFieldEffect` gains `readonly locus: string`; `InjectChannelEffect` gains
`readonly locus?: string`, **required when `channel === 'shock'`**.
`MagicEffects.validate` throws `emit-field: needs a locus template path`
/ `inject-channel(shock): needs a locus` — and because `SpellCatalogue`
drops a spell whose effects fail validation, a row lacking `locus:` fails
catalogue validation (the acceptance criterion). `execEmitField` clones
`effect.locus`; `execInjectChannel`'s shock branch clones `e.locus`
(`await StuffApi.clone(e.locus)` replaces `StuffApi.createSync(() => new
SparkSource())` — the branch becomes async; `deliverAt`'s callback already
returns a promise-or-value shape, verify and widen if needed), sets voltage,
conducts, destructs. `GLOWLIGHT_ORB_PATH` and the `SparkSource` import are
deleted. `MixinApi.isLightSource` / `isEnergized` guard the clone (a locus
that is not the right shape is an authoring error, reported as a refusal).

### (g) The mana `adjust-reserve` coupling guard

In `executeEffect`'s `adjust-reserve` case, alongside the charge branch:
`if (effect.delta > 0 && effect.reserveKey === MANA_RESERVE_KEY) return
'Nothing can pour mana in — it is recovered, never given.'` and, so it is
refused at **authoring** and not only at cast: `MagicEffects.validate`
rejects `adjust-reserve` with a positive delta on `mana` (`adjust-reserve:
a positive delta on 'mana' is a mana generator — arcane-science forbids
it; feed satiation instead`). Both, because charge's guard is only at
execution and the requirement says "refused the way one on `charge` is"
plus "a spell authoring … is refused" — the catalogue drop is the authored
refusal. Charge's authored refusal is added symmetrically (tiny; keeps the
two reserves alike).

### (h) `MaterialLogic.boot`'s filter

Replace `tpl.class.startsWith('/platform/idea/material/')` with
`isMaterialClass(tpl.class)`: `const cls = await StuffApi.loadClassByPath(tpl.class)`
and `cls.prototype instanceof Material` (the `ZoneApi.isFolderClass`
precedent; `Material` from `lib/material/Material` is already imported as a
type — make it a value import, MaterialLogic is Api tier). Memoise per class
path for the boot loop. Test: a fixture class under a tmp pack namespace
extending `Material` is stood up; a `FolderZone` row under `/stuff/idea/material/`
is not.

### (i) `dependsOn` from `package.json`

`resolvePack(root)` reads `<root>/package.json`; `dependsOn = Object.keys(dependencies)
.filter(startsWith('@saxonberg/content-')).map(strip prefix)` (the
`@saxonberg/server` and `@saxonberg/types` lines are not packs and are
ignored). `MANIFEST_KEYS`
loses `dependsOn` (a manifest that still has it fails at read — the closed
key set already does this). All 20 `pack.yaml` files lose the key; 19
`package.json` files gain `"dependencies": { "@saxonberg/content-platform":
"workspace:*", … }` mirroring today's lists exactly (lounge: goodkin, vionne,
aevex, veshko; hearthworks: trade-smithing, trade-hearth-cooking, goodkin;
world-seed: saxonberg-lounge, goodkin, vionne; the trades: generic-objects
(+ base-library for hospitality)). `pnpm install` relinks. The topo sort,
hosts (`packsWithHosts`), and `bootManifest` read the derived field
unchanged.

**The rung check** (`assertClassesResolve` → returns a `ClassOrigin` map):
for each class, `StuffApi.resolveClassFile` reports origin. Rules, in the
`requires-kernel` step:

1. A class path whose first segment is a **pack namespace root** in the
   table resolves only from that pack's `src/`; if that pack has no `src/`
   → fail: `pack '<id>' claims data but ships code: '<class>' lies in its
   own namespace '<root>' and the pack has no src/`. (The mis-rung fixture:
   `writePack('mis', [{ rel: 'mis/thing/x.yaml', class: '/mis/thing/X' }])`
   with no `src/`.)
2. A class resolving into pack P's `src/` from pack Q ≠ P requires P in Q's
   derived `dependsOn` → else fail naming both.
3. A pack with `src/` is a **capability pack**; the record stores
   `rung: 'capability' | 'data'` (derived; `pack status` prints it). After
   install, every exported class under `src/**` (excluding `__tests__`)
   that no row of any pack and no other pack's module names is **reported**
   (console + `DiagnosticApi.record`, not a failure).

Kernel-root paths (`/platform`, `/lib`, `/world`, `/trade`) resolve from
the kernel tree exactly as today (finding 4).

### (j) `lint:test-content`

No scope change (finding 8). Add one case to `check-test-content.test.ts`
proving a `packages/content/arcana/src/__tests__/x.test.ts` path is exempt
even when its text names `/world/…`, and a comment in the script's header
saying pack tests are content tests beside content.

## Namespace and file map (the target state)

```
packages/content/arcana/
├── package.json     @saxonberg/content-arcana; deps: server, types, content-platform; scripts build/test
├── pack.yaml        id: arcana, root: /arcana, requires.title [/arcana → group arcana (PM-owned)],
│                    requires.groups [arcana]; NO dependsOn key
├── tsconfig.json    extends base; include src/**; noEmit
├── vitest.config.ts
├── src/
│   ├── thing/{Wand,Scroll,Spellbook,Conduit,Ring,Amulet,Potion}.ts
│   ├── idea/material/PotionMaterial.ts
│   ├── idea/cmd/magic/{Cast,Spells,Study,Zap,Recharge}Controller.ts (+ __tests__ moved with them)
│   └── __tests__/ (pack-level: Ring/Amulet wear wiring, Potion presets, mana potion)
└── content/
    ├── arcana/idea/Discipline/magic-*.yaml (18)
    ├── arcana/idea/cmd/magic/*Controller.yaml (5)   class: /arcana/idea/cmd/magic/<Name>Controller
    ├── arcana/cmd/magic/{cast,spells,study,zap,recharge}.yaml   controller: /arcana/idea/cmd/magic/…
    ├── settings/magic.yaml
    └── descriptor-banks/{amulet,potion,ring,scroll,spellbook,wand}.yaml

packages/content/arcane-library/
├── package.json     deps: server, types, content-platform, content-arcana
├── pack.yaml        root: /arcane-library (unchanged), no dependsOn
├── tsconfig.json, vitest.config.ts
├── src/thing/{GlowlightMote,SparkLocus}.ts          class paths /arcane-library/thing/…
└── content/stuff/
    ├── idea/magic/Spell/*.yaml (12; glowlight + spark gain locus:, veil + glowlight gain bands)
    ├── idea/material/potion/{blistering,veiling,mana}-draught.yaml   class: /arcana/idea/material/PotionMaterial
    └── thing/magic/{glowlight-mote,spark-locus,primer-of-glowlight,manual-of-transfer,
                     scroll-of-identify,scroll-of-remove-curse,wand-of-firebolt,
                     wand-of-firebolt-cursed,brass-conduit,charging-bench,
                     potion-of-blistering,potion-of-veiling,potion-of-mana,
                     ring-of-veil,amulet-of-glowlight}.yaml
```

Class-path rule: a pack's namespace root is its manifest `root` (plus its
title claims); `packages/content/<pkg>/src/<rel>.ts` backs `<root>/<rel>`.
`arcane-library`'s two loci are `/arcane-library/thing/GlowlightMote` and
`/arcane-library/thing/SparkLocus` while their *rows* sit in the commons at
`/stuff/thing/magic/glowlight-mote` / `spark-locus` — the same shape the
platform pack already has (rows at `/stuff/…`, classes at `/platform/…`).
`lint:untitled` reads template paths, not class paths, so the commons rows
ride the platform's `/stuff` claim as today; the `/stuff/thing/magic`
branch needs no claim of its own (it sits under `/stuff`, and
generic-objects' `items` claim does not cover it).

`StuffApi.#validateClassPath`'s allowed-prefix list becomes: the four kernel
roots + every registered pack root (`ModuleApi`/table); the
`lint:instanceable` invariant-7 regex likewise admits `/arcana/`.

## Phase 0 — orient and freeze the baseline (½ h)

`./tools/wt-status`; `pnpm install`; `pnpm build`; note the last green
`pnpm test` number. `git grep` the eleven relative-path tests and the
`GlowlightOrb|SparkSource|thing/items/(wand|scroll|flask|primer|manual|brass|charging)`
consumers (finding list in *§ Reference*); they are the regression map.

## Phase 1 — the loader mechanism (a pack can ship classes) (~2 days)

Nothing content-facing changes in this phase; every existing pack stays a
data pack and the suite stays green with zero packs shipping `src/`.

1. **Discovery builds the table.** `PackLogic`: `ResolvedPack` gains
   `srcRoot: string | null` (`join(root, 'src')` if it exists). `discover()`
   registers `ModuleApi.registerPackSource(srcRoot, ns)` for `ns ∈ {manifest.root,
   …requires.title[].extent}` of every pack with `srcRoot`, and publishes
   the same table to `StuffApi` via a new `StuffApi._setPackSources(table)`
   (Api-tier seam; `#`-private static map). Add `PackApi.registerSources()`
   (discovery's registration half) for `test-bootstrap` / `AppBootstrap`
   ordering: registration happens at the top of `PackApi.install()` before
   `requires-kernel`.
2. **`StuffApi.resolveClassFile`** (public static; replaces
   `#resolveAbsoluteClassPath`): longest-prefix table match → `<srcRoot>/<rel>.ts`
   (error naming the pack if the file is missing — no fallback to kernel);
   else the kernel tree as today. `loadClassByPath`, `#cloneInner`,
   `resolveExport(Sync)` import by `pathToFileURL(file).href` (keeps Node's
   cache; HotReload's `?hmr=` override path is unchanged). Delete the
   `..${classPath}.js` relative-import form.
3. **`ModuleApi`** `#packRoots` + `registerPackSource` (module-scope-clean:
   a static method, a static field). `#normaliseUrl` consults it first.
4. **`transform.js`** — the three functions per § (c). Add
   `services/loader/__tests__/transform.pack.test.js` cases: a
   `packages/content/x/src/thing/Y.ts` URL is transformed, its registry
   import resolves to `…/packages/server/src/mud/api/module`, a relative
   `FromModule` in it is left alone.
5. **The export map + the deployment manifest** per § (a) and § (d):
   `packages/server/package.json` gains `exports` and loses every
   `@saxonberg/content-*` dependency; the root `package.json` gains all
   twenty as `dependencies`; `packNamesFromServerDeps` becomes
   `packNamesFromDeployment` (root manifest, `SAXONBERG_DEPLOYMENT_ROOT`);
   `pack-harness.writePack`'s fixture root is passed explicitly as today.
   **`dependsOn` derivation + the rung check** per § (i); `MANIFEST_KEYS`
   shrinks; `writePack` writes `package.json`; all twenty
   manifests lose the key; nineteen `package.json`s gain dependencies;
   `pnpm install`. `PackInstallRecord` gains `rung` and `codeVersions`.
   `PackStatusReport` gains `rung`, `code: 'current' | 'stale' | null`;
   `PackController` prints them.
6. **`pack sync` code tail + `reload` on a class path** per § (b).
7. **Server tsconfig** `include` + drop `rootDir`; **`test-bootstrap`**
   calls `PackApi.registerSources()` (idempotent, no DB).
8. **Lints (mechanism half):** `check-mud-imports.ts` pack tier + walk of
   `packages/content/*/src`; `check-gate-strings.ts` resolves `/<packRoot>/…`
   strings via the table and walks pack `src/`; `check-instanceable-placement.ts`
   `classResolves` via the table, invariant 7 regex admits pack roots, and
   a new invariant 8: a pack `src/` has no `lib/` dir and no `.ts` outside
   `{thing,idea,agent,location}/` (+ `__tests__`); `check-module-scope.ts`,
   `check-field-meta.ts`, `check-blessed-bands.ts` (`walkTs` over pack src +
   table-aware class→file), `check-arg-kinds.ts` (`content/<any>/cmd`, not
   only `content/platform/cmd`), `check-test-bootstrap.ts` widen their walks.
   Put the shared "which packs have src, root → dir" reader in
   `scripts/pack-roots.ts` (scripts already duplicate the installer's walk
   "minimally"; this is the same license). `lint:untitled`: `TITLE_ROOTS`
   gains `/arcana` (the tenth root) — do it here so Phase 2's rows are
   covered the moment they land.
9. **Tests (Phase 1):** `PackLogic.rung.test.ts` — the mis-rung fixture
   fails with the rung message; a fixture pack with `src/thing/X.ts` +
   a row naming `/<id>/thing/X` installs, `status` says `capability`, the
   class resolved into the tmp `src/`; cross-pack class without the
   dependency line fails; `dependsOn` derives from `package.json` (order
   test rewritten on the harness). `StuffApi.resolveClassFile.test.ts` —
   kernel root, pack root, missing file in pack. `ModuleApi` — a class
   stamped from a registered pack dir normalises to `/<root>/<rel>`;
   `FromModule('/<root>/…')` admits it. Lint tests: each widened script's
   pure decision function gets a fixture case that *fails* on a pack
   violation (`check-mud-imports`: a pack file importing `fs` and one
   importing `platform/idea/api/MagicLogic`; `check-instanceable`: a pack
   `src/lib/`; `check-gate-strings`: an unresolvable `/arcana/…` gate).

Green gate: `pnpm build`, `pnpm test:near`, every lint. No content moved.

## Phase 2 — the arcana pack (~1½ days)

1. `mkdir` the pack skeleton (package.json, pack.yaml, tsconfig, vitest
   config, README; `dependencies`: `@saxonberg/server`, `@saxonberg/types`,
   `@saxonberg/content-platform`). Root `package.json`: add arcana, remove
   arcane-descriptors. `pnpm install`.
2. `git mv` the six-minus-two classes and the five controllers:
   `packages/server/src/mud/platform/thing/magic/{Wand,Scroll,Spellbook,Conduit}.ts`
   → `packages/content/arcana/src/thing/`; `platform/idea/material/PotionMaterial.ts`
   → `arcana/src/idea/material/`; `platform/idea/cmd/magic/*.ts` (+ its
   `__tests__/`) → `arcana/src/idea/cmd/magic/`. Rewrite their imports to
   the relative kernel form; `Spellbook.commandContributions` →
   `arcana/cmd/magic/study.yaml`; `Caster.CASTING_VERB_YAMLS` and
   `Charged.commandContributions` → `arcana/cmd/magic/…` (deviation 2).
   `StudyController`'s `import type Spellbook` becomes `'../../../thing/Spellbook'`.
3. `git mv` content: the 18 disciplines → `arcana/content/arcana/idea/Discipline/`;
   `platform/cmd/magic/*.yaml` → `arcana/content/arcana/cmd/magic/`
   (rewrite `controller:` to `/arcana/idea/cmd/magic/<Name>Controller`);
   `platform/idea/cmd/magic/*Controller.yaml` → `arcana/content/arcana/idea/cmd/magic/`
   (rewrite `class:`); `settings/magic.yaml` → `arcana/content/settings/`;
   `arcane-descriptors/content/descriptor-banks/` → `arcana/content/descriptor-banks/`;
   `git rm -r packages/content/arcane-descriptors`.
4. Repoint every `class: /platform/thing/magic/{Wand,Scroll,Spellbook,Conduit}`
   and `/platform/idea/material/PotionMaterial` across `packages/content/**`
   to `/arcana/…` (the 8 items + 2 flasks + 2 potion materials + the
   practicum/world-seed rows that name them — `git grep` to enumerate).
5. Catalogues warm by class (§ e); `MaterialLogic.boot` by `instanceof` (§ h);
   delete `TemplatePathPrefixes.discipline/spell`.
6. Fix the kernel tests that read pack YAML by relative path:
   `Appearance.test.ts`, `UnidentifiedLong.test.ts` (banks → arcana),
   `SpellCatalogue.test.ts` (Discipline dir → arcana). The spell and potion
   dirs do not move. Fix `platform/idea/cmd/magic/__tests__` imports in
   their new home (they import `test-bootstrap` and the kernel relatively).
7. Docs touch nothing yet; the platform pack README's descriptor consumer
   note goes (D9).

Green gate: fresh DB boots (`SAXONBERG_PACKS` unset), `pack status` lists
arcana as `capability`; `pnpm test:near`; every lint; the platform-only e2e
still boots (`SAXONBERG_PACKS=platform` never loads arcana — `Caster`'s
contribution names a view the store lacks, which `CommandLogic` already
tolerates for a filtered pack; verify, and if it does not, a data pack
without the verbs is the pre-existing shape).

## Phase 3 — Ring, Amulet, Potion, and the wear wiring (~1½ days)

1. **`Ring` / `Amulet`** in `arcana/src/thing/`: the `Wand` composition with
   `WieldableMixin` → `WearableMixin`. Two files, both `export default class`.
2. **`Potion extends Receptacle`** (`platform/thing/Receptacle` via relative
   kernel import) with constructor-set defaults: `material: glass`,
   `interiorBulk: true`, `interiorCapacity: 0.25`, keywords
   `[flask, vial, potion, draught]`, primary keyword `potion`, and the
   `potion` descriptor class if `Receptacle`'s composition exposes it (it
   does not compose `Identifiable` — identity rides the material — so
   the descriptor class stays on the material; the requirement's "descriptor
   class" default is satisfied by the material rows, note it in the class
   header). A row overrides any field through the ordinary hydrator.
3. **The wear wiring on `Charged` (kernel, keyed on `alwaysOn`):**
   - `onSlotOccupied(host, slot)`: if `!alwaysOn || drawActive` return
     (idempotent across multi-slot claims and persistence restore); if
     `ExecutionContextApi.getCurrentCommandGiver()` is null return (restore
     path — the Condition persisted with the wearer); `await MagicApi.discharge(this,
     host)` — the witness is synchronous, so call `void MagicApi.discharge(...)
     .then(out => { if (out.ok) this.setDrawActive(true); else narrate refusal })`;
     a flat ring narrates the dry click and stays `drawActive: false`.
     `discharge` already sets `sustainedBy = durableIdOf(this)` because
     `ctx.source` is the charged item.
   - `onSlotReleased(host, slot)`: `releaseHeld(host)` — for each
     `host.getConditions()` entry with `kind === 'sustained' && sustainedBy
     === durableIdOf(this)` call `host.releaseSustained(s)`; `setDrawActive(false)`.
     Only when no other slot of the same host still holds this item
     (`SlotApi.findOccupiedSlots`).
   - **Run flat:** in `reconcileCharge`, after the standby draw lands, if
     `drawActive` and the pool is at zero, `releaseHeld(getOccupiedHost())`.
     `Vitals.renewSustained` already refuses a depleted host at expiry; this
     makes the release immediate on the next read.
   - `durableIdOf` lives in `EffectContexts.durableIdOf` (lib) — use it.
   - A cursed ring: nothing new — `Slotted.tryReleaseFromSlots` refuses via
     `Blessable.tryRelease`; the witness never fires; the draw continues.
   `Charged`'s `commandContributions` unchanged apart from the path.
4. **Mana guard** (§ g) in `MagicLogic` + `Effect.ts`.
5. **Tests** (`arcana/src/__tests__/` and kernel `lib/magic/__tests__/`):
   - Ring worn → wearer has a `sustained` Condition with `sustainedBy` the
     ring's template path, `realizes: 'cloak'`, second viewer sees the
     disguise (`RecognitionApi.describe` — the `Consumables.test.ts` veil
     assertions are the template); `drawActive` true.
   - Removed → Condition gone, disguise null, `drawActive` false.
   - Standby draw runs it flat (advance the world clock past
     `capacityKJ / STANDBY_WATTS`) → released.
   - Cursed ring: `tryReleaseFromSlots` refuses, Condition persists, charge
     keeps falling.
   - `alwaysOn: false` ring: wearing does nothing; `zap` fires it.
   - Restore path: a wearer with a persisted sustained Condition and a
     ring with `drawActive: true` re-slotted → exactly one Condition.
   - `adjust-reserve` `mana` positive: `MagicEffects.validate` throws;
     execution returns the refusal; `charge` symmetry.
   - Potion presets: a three-line row clones with glass/0.25 L/keywords;
     an override wins.

Green gate as before; `lint:blessed-bands` will pass because no row names
Ring/Amulet yet.

## Phase 4 — arcane-library consolidation and exemplars (~1 day)

1. `git mv packages/server/src/mud/platform/thing/magic/GlowlightOrb.ts
   packages/content/arcane-library/src/thing/GlowlightMote.ts` and
   `SparkSource.ts → SparkLocus.ts` (rename the classes; `git rm` the
   now-empty `platform/thing/magic/`). Rows: `git mv GlowlightOrb.yaml
   glowlight-mote.yaml`, `SparkSource.yaml → spark-locus.yaml`, `class:` →
   `/arcane-library/thing/…`; spark-locus needs a row for the first time
   (`EnergizedMixin` fields, minimal).
2. `locus:` (§ f): glowlight → `locus: /stuff/thing/magic/glowlight-mote`;
   spark → `locus: /stuff/thing/magic/spark-locus`. `MagicLogic` loses the
   import and the constant. `magic-vocabulary.test.ts`, `MagicLogic.test.ts`,
   `CastController.test.ts`, `practicum.integration.test.ts` repoint;
   `Effect.ts`/`Condition.ts` comments updated.
3. `git mv` the eight items from `generic-objects/content/stuff/thing/items/`
   to `arcane-library/content/stuff/thing/magic/`; the two flasks become
   `potion-of-blistering.yaml` / `potion-of-veiling.yaml` on `class:
   /arcana/thing/Potion` shrunk to description + `interiorMaterial` +
   `interiorAmount`; the two draughts `git mv` from base-library to
   `arcane-library/content/stuff/idea/material/potion/` (path unchanged).
   `Distribution.test.ts`'s potion dir repoints.
4. **Exemplars:** `ring-of-veil.yaml` (`class: /arcana/thing/Ring`, carries
   `/stuff/idea/magic/Spell/veil`, `alwaysOn: true`, `capacityKJ`, `slotClaims:
   { biped: ['finger:left'] }`, `censusKey: ring`, `descriptorClass: ring`,
   `blessingOdds`, `details`); `amulet-of-glowlight.yaml` (Amulet, glowlight,
   `neck`); `potion-of-mana.yaml` on `Potion` with `mana-draught.yaml`
   (`class: /arcana/idea/material/PotionMaterial`, **no `carriedSpellPath`**,
   `nutrients: [water, sugar, carb]`, `tags: [liquid, drinkable]`, dose
   block, `descriptorClass: potion`, `identifiedName: a mana draught`,
   `selfIdentifying: false`). `Potable.dischargeInto` already returns `[]`
   for a spell-less potion, so drinking only ingests.
5. **Band authoring** (finding 7): veil `disguise: ["a figure every eye is
   drawn to", "a veiled, indistinct figure", "a face no memory keeps"]`;
   glowlight gains a `bands: [cursed]` `afflict` of
   `/platform/idea/Condition/magic/dread` (a cursed light that gnaws at its
   wearer — the working's own identity, not a global rule). `cast` is the
   uncursed branch and is unchanged.
6. **Tests:** mana potion — a depleted caster who drinks recovers nothing on
   the tick, and across the recovery window reaches more mana than a
   control who did not (drive `reconcileMetabolism` + the faculty read);
   half a dose recovers about half; a non-caster's satiation rises and
   nothing else. `cast glowlight` conjures a `GlowlightMote` at the scene
   and `cast spark` conducts through a `SparkLocus`; a glowlight row without
   `locus:` is dropped by `SpellCatalogue` with the validation error.
   `arcane-library/src/__tests__/library.test.ts`: every row installs
   (fixture install over the real pack root — ring 2, the pack's own
   installability), the two loci resolve into the pack's `src/`.

Green gate + `lint:blessed-bands`, `lint:descriptors`, `lint:untitled`.

## Phase 5 — lints, full suite, live drive (~1 day)

1. `pnpm lint` and the whole family with pack trees in scope; fix stragglers.
2. Update `scripts/test-content-allowlist.txt` only if a listed kernel test
   stopped offending (moves may retire an entry — a stale entry fails).
3. `pnpm test` once (the ~15 min run); cite the number.
4. The live-drive checklist below.

## Phase 6 — docs (~½ day)

- `docs/subsystems/content-packs.md`: the "pure data (zero TypeScript)" and
  "content pack ships no code" framing rewritten; the shape section gains
  `src/`; discovery gains the namespace table and registration; the
  manifest section drops `dependsOn` (derived from `package.json`); a new
  *§ The capability rung* (the loader, `resolveClassFile`, the rung check,
  `pack status` rung/code, `pack sync`'s code tail, the pack import profile
  as the path set above, the discipline ownership rule, "pack code writes
  absolute gates"); the shipped-packs table: `arcana` row, `arcane-library`
  depends on arcana, `arcane-descriptors` removed, `generic-objects` and
  `base-library` rows lose the magic rows; "Nineteen"; `Key files` gains the
  two pack `src/` trees and `scripts/pack-roots.ts`; a History line.
- `docs/subsystems/magic-items.md`: Ring/Amulet under the three item
  classes, the wear wiring (witnesses, run-flat release, restore
  idempotence, the `sustainedBy`-is-a-template-path caveat), `Potion` the
  preset Receptacle, the mana potion as metabolic, the mana guard, the
  `locus:` field; the files list.
- `docs/subsystems/magic.md`: disciplines live in arcana; catalogues warm
  by class; `locus:` in the roster section.
- `docs/subsystems/hot-reload.md`: the `dist/` paragraph replaced by "prod is
  tsx too"; `reload` accepts class paths through the table.
- `CLAUDE.md`: pack count → nineteen; Module Categories preamble: "the
  taxonomy applies inside a pack's `src/` (branches, `idea/cmd/<category>/`
  controllers; no `lib/`, no Api)"; the lint-family entries that grew.
- `docs/roadmap.md` line 814: "pure-data, no-code" → "data or capability
  (code-shipping) deliverables".
- `packages/content/arcane-library/README.md` rewritten (spells, items,
  the two loci, `src/`); `packages/content/arcana/README.md` new.
- `docs/architecture.md § The import boundary`: the pack tier row.

## Live-drive checklist (observed in a running server, fresh DB)

1. Boot log: nineteen `PackApi: '<id>' installed` lines; no `error`/`failed`;
   `requires-kernel` resolves every arcana class into
   `packages/content/arcana/src/` and both loci into
   `packages/content/arcane-library/src/` (add the origin to the boot line
   for capability packs).
2. `pack status`: arcana and arcane-library `capability`, arcane-library
   depends on arcana, `code: current`.
3. `clone /stuff/thing/magic/wand-of-firebolt`; `zap wand at <target>`;
   `cast glowlight` (a mote appears in the room, `look` shows it lit);
   `cast spark at <target>` in a wet room; `spells`; `study <primer>`;
   `recharge` at the charging bench — each dispatches through the
   pack-shipped controller (`affordances` lists them; a `FromModule` denial
   would surface as a security error).
4. `clone /stuff/thing/magic/ring-of-veil`; `wear ring` → a second character
   `look`s and sees the veiled figure; `remove ring` → the disguise drops.
5. Edit `packages/content/arcana/src/thing/Wand.ts` (add a harmless method),
   `reload /arcana/thing/Wand` → `reloaded …/arcana/src/thing/Wand.ts`;
   `clone` a new wand and observe the method; `pack sync arcana` reports
   the code tail.
6. `SAXONBERG_PACKS=platform` boot still lands the founder in the void.

## Rough size

Phase 1 ≈ 2 days (the mechanism, the lints' first half, the harness);
Phase 2 ≈ 1½; Phase 3 ≈ 1½; Phase 4 ≈ 1; Phase 5 ≈ 1; Phase 6 ≈ ½. About
seven working days, dominated by Phase 1 and the test rewrites.

## Reference — files touched by move (for `git mv`, stage by name)

Kernel out: `packages/server/src/mud/platform/thing/magic/{Wand,Scroll,Spellbook,Conduit,GlowlightOrb,SparkSource}.ts`,
`packages/server/src/mud/platform/idea/material/PotionMaterial.ts`,
`packages/server/src/mud/platform/idea/cmd/magic/{Cast,Spells,Study,Zap,Recharge}Controller.ts` + `__tests__/`.
Content: the 18 `platform/content/platform/idea/Discipline/magic-*.yaml`; the
5 views + 5 controller templates; `platform/content/settings/magic.yaml`;
`arcane-descriptors/content/descriptor-banks/*` (6); the 10
`generic-objects/content/stuff/thing/items/{wand-of-firebolt,wand-of-firebolt-cursed,scroll-of-identify,scroll-of-remove-curse,primer-of-glowlight,manual-of-transfer,brass-conduit,charging-bench,flask-of-blistering,flask-of-veiling}.yaml`;
`base-library/content/stuff/idea/material/potion/{blistering,veiling}-draught.yaml`;
`arcane-library/content/stuff/thing/magic/{GlowlightOrb,SparkSource}.yaml`.
Kernel tests reading pack YAML by relative path (eleven): `lib/identification/__tests__/{Appearance,UnidentifiedLong}.test.ts`,
`lib/magic/__tests__/{Caster.coupled,Consumables,EffectContext,Misidentify,RemoveCurse}.test.ts`,
`lib/residency/__tests__/Distribution.test.ts`, `platform/__tests__/SpellCatalogue.test.ts`,
`platform/idea/api/__tests__/MagicLogic.test.ts`, `world/practicum/__tests__/practicum.integration.test.ts`
(plus `CastController.test.ts`, which moves with its controller).

## Blockers / deviations

**Rulings 2026-08-27:** 1 and 3 nodded; 2 takes the minimal path as
planned (the declaring mixin names its verb's view). The requirements
doc records all three. 4 stands as documented.

1. **The rung check is keyed on resolution origin, not path prefix.** D4 as
   literally worded ("a pack with no `src/` whose classes resolve into its
   own namespace fails") would fail `saxonberg-lounge` and `hearthworks`,
   whose rows name parked kernel classes under their own `/world/<x>`
   claims — code the non-goals keep in `mud/world/` this cycle. The plan
   applies the check to pack-namespace roots that only the table can serve
   (finding 4). The acceptance criterion's mis-rung test passes as written.
2. **`Caster` and `Charged` (kernel `lib/magic`) name arcana's command
   views.** D3's "a kernel module never names a pack's row" and D8's "the
   five views move" cannot both hold for `cast`/`spells`/`zap`/`recharge`:
   a `commandContributions` key is the view's document path, and `Caster`
   rides kernel agents. The plan keeps the affordances where the capability
   is declared (D23) and points them at `arcana/cmd/magic/*.yaml`. The
   alternative — a root-agnostic `cmd/<category>/<verb>` key resolved by
   `CommandLogic` over every root — is a new resolution rule and a
   flat-key uniqueness question; not planned unless the user prefers it.
3. **`veil` and `glowlight` gain band authoring.** Not a new spell, but a
   content edit outside the requirements' enumerated rows, forced by the
   binding `lint:blessed-bands` constraint on the exemplars (finding 7).
4. **`sustainedBy` is a template path** (shipped shape). Two rings of one
   template on one wearer release together. Documented in magic-items.md,
   not fixed here.
