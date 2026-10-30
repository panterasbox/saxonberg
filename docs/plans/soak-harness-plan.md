# Soak harness — implementation plan

Executes [soak-harness-requirements.md](../requirements/soak-harness-requirements.md)
(closed scope, 2026-10-30; § *Staging* added by the owner the same day).
**Kind:** infra. **Leads from:** the kernel — the wire package, the test
clock's test-only route, `tools/`, and (the staging scope) the `eval`
sandbox, the test-login seam and one platform verb. No pack, no namespace
root, no new Stuff class, no mixin. One new Api + logic singleton
(`TestHarnessApi`), one new controller + view (`testharness`), one new validator.

What lands: the `*.soak.wire.test.ts` convention and `pnpm wire:soak`; a
server-side refusal of any test clock jump past one game day outside soak
mode; a machine-readable result beside the run log; `tools/soak`, the
headroom-gated runner that soaks merges and files `soak` issues; the
canary; the census of the 25 clock-jumping wire files, each moved to
soak or shown within a day; **and the staging tools** — an `eval` that
binds every self-decorating Api instead of a list of four, with a real
timeout, an output cap and every refusal returned as an error; test
login granting a test runner title to named parcels; and the `testharness`
command (`testharness clock …`, `testharness weather …`), installed only in test
worlds, sharing one implementation with the harness routes. The build
follows its own rule: its blocking drive has no `span` step, and its
soak drive is `canary.soak.wire.test.ts`, which the MR names.

## Grounding

Verified 2026-10-30 on `build/soak-harness` at `9550937c6` (origin/master).

### The wire package — `packages/wire/`

- `package.json` scripts: `wire: vitest run`, `wire:clean: vitest run
  --exclude '**/*.dirty.wire.test.ts'`, `wire:dirty: vitest run
  tests/*.dirty.wire.test.ts`. No `test` script, deliberately. ⚠ The
  `wire:dirty` shell glob also matches a future `x.soak.dirty.wire.test.ts`
  — the exclusion must live in the config, not the script.
- `vitest.config.ts`: `include: ['tests/**/*.wire.test.ts']`, `globalSetup:
  ['./src/runner/global-setup.ts']`, serial (`fileParallelism: false`,
  `singleFork`), `reporters: ['verbose']`, `retry: 0`, and
  `DirtyLastSequencer` ordering clean before dirty by the filename regex
  `/\.dirty\.wire\.test\.ts$/` — which already matches `.soak.dirty.`.
- Installed vitest is **2.1.9**. Its `Reporter` interface
  (`node_modules/vitest/dist/chunks/reporters.nr4dxCkA.d.ts` l.65–69)
  has `onInit(ctx)` and `onFinished(files?: File[], errors?)`;
  `@vitest/runner`'s `TaskResult` (`dist/tasks-3ZnPj1LR.d.ts` l.125) carries
  `state`, `errors?: ErrorWithDiff[]`, `duration?`, `startTime?`. `File
  extends Suite extends TaskBase` with `tasks[]`. A custom reporter is a
  module path in `reporters: [...]`.
- `src/runner/global-setup.ts`: sets `WIRE_RUN_REPORT` to
  `os.tmpdir()/saxonberg-wire-run-<pid>.json`, `rmSync`s it at setup and
  again at teardown after printing the prose census + dirty list. Owned
  mode (`WIRE_BOOT=1` or `CI=true`) boots via `boot.ts` and sets
  `WIRE_TEST_WORLD=1` for the workers (env set in `setup()` propagates
  because globalSetup runs before workers spawn). Attach mode probes
  `WIRE_SERVER_URL` (default `localhost:2010`) and never spawns or kills.
- `src/runner/boot.ts`: `WIRE_PORT = Number(process.env.WIRE_PORT ??
  2012)`; log at `packages/wire/.wire/server.log` (`WIRE_LOG`, exported as
  `WIRE_SERVER_LOG` to the workers); uses the database
  `packages/server/.env` names; `bootOwnedWorld()` runs
  `dev-preflight.mjs <port>` first (reaps only its own port), spawns `pnpm
  exec tsx src/preload.js` with `AUTH_MODE=test`, `SAXONBERG_TEST_WORLD=1`,
  `VITEST*`/`NODE_OPTIONS` scrubbed; `stopOwnedWorld()` SIGTERM → SIGKILL
  at 15 s. `packages/wire/.gitignore` ignores `.wire/`; CI's `wire` job
  collects `packages/wire/.wire/` on failure.
- `src/harness/registry.ts`: `declareFile({file, packs, dirtyReason?})`
  (enforces `.dirty` naming ⇔ reason), `countProseRead`, `readRunReport`;
  every mutation rewrites `WIRE_RUN_REPORT` (`{files: FileRecord[]}`) from
  the worker. **No pass/fail, no messages, deleted at teardown.**
- `src/harness/world.ts`: `advanceWorldClock(duration)` POSTs
  `{advance}` to `${SERVER_URL()}/auth/test-clock` and throws the server's
  `error` message on non-OK; `worldClockNow()` POSTs `{}`;
  `isOwnedTestWorld()` reads `WIRE_TEST_WORLD`. All re-exported from
  `src/harness/index.ts`. ⚠ `advanceLiving` does not exist anywhere — the
  soak-lane slate's header is stale on that point.
- `tests/`: 71 files; 25 jump the clock, all of them `.dirty.`;
  `typecheck.wire.test.ts` checks a probe file through the game's own
  `typecheck`/`reload` verbs — it is not a tsc pass over the package.
  `tsconfig.json` is `noEmit`, `include: **/*.ts`. Nothing named `canary`
  exists in `tests/` or `src/` (a `feed canary` step in
  `reachability.dirty` is a bird).

### The clock seam — `packages/server/`

- `src/services/auth/TestAuthRoutes.ts` l.109: `POST /auth/test-clock`,
  mounted only under `AUTH_MODE=test`, optional `x-test-auth` token. Body
  `{advance?: unknown}`: absent → `{now}`; non-string → 400; string →
  `TestHooks.advanceClock(advance)`, errors → 500 `{error: message}`.
- `src/backend/TestHooks.ts` l.262: `advanceClock(duration: string)`:
  `#assertTestMode` (l.61, `AUTH_MODE === 'test'`), `runRoot` →
  `WorldClockApi.advance(duration)`, then pauses the clock and awaits
  `PersistenceManager.whenQuiet(500, 240_000)`, resumes, returns
  `{before, after}`. It already imports `WorldClockApi`. Tests:
  `src/backend/__tests__/TestHooks.clock.test.ts` (uses
  `WorldClockApi._resetForTesting()`, `AUTH_MODE='test'`, asserts the
  parse refusal and the paused refusal by message);
  `src/services/auth/__tests__/TestAuthRoutes.test.ts` (route tests over
  supertest-style requests; no test-clock case yet).
- The duration grammar lives in ONE place:
  `src/mud/platform/idea/WorldClockRegistry.ts` l.730
  `private parseDelayToSeconds(d: Quantity<'s'> | string): number` —
  regex `^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$` over
  `DURATION_UNITS`, throwing `WorldClockApi: cannot parse duration '…'`.
  `advance(by)` (l.460, `@CallSecurity(WorldClockApiCallers)`) calls it,
  refuses negative, no-ops zero, refuses while paused. `WorldClockLogic`
  (`src/mud/platform/idea/api/WorldClockLogic.ts`) forwards each Api
  static to `resolveRegistry()` with the same `@CallSecurity`;
  `src/mud/api/worldclock.ts` is the facade (`advance` is `@TestOnly`,
  l.194–205). There is no public parse surface today.

### `tools/suite` (POSIX sh)

`WORKTREE` = parent of `tools/`, `ROOT` = parent of the worktree
(`/home/bobalu/play/saxonberg`). `LOCK="$ROOT/.suite.lock"` — a `mkdir`
lock whose `owner` file holds `pid\nworktree`; a stale lock (pid gone) is
taken; `--no-wait` exits 3; otherwise polls every 20 s. `drop_lock` only
if owned; `trap` on INT/TERM/EXIT. `avail_mb()` reads `MemAvailable`;
`RESERVE_GB=4`, `PER_WORKER_MB=700`, `MAX_WORKERS=6`. Logs under
`$WORKTREE/.suite/` (root `.gitignore` l.47 ignores `.suite/`). No
`tools/lib/` exists; `tools/` holds `docs-mirror imagegen panic
slate-index suite wt-status`.

### The lane, as set up

- Worktree `/home/bobalu/play/saxonberg/soak`, detached at `7e6cda7d3`,
  clean, `node_modules` present, `packages/server/.env` has
  `MONGODB_DATABASE=saxonberg_soak`, `core.hooksPath=.githooks`. The
  `saxo` script (`~/.local/bin/saxo`) gives the `soak` tmux window
  `WIRE_PORT=2020` and cwd `$ROOT/soak`.
- `glab` 1.36.0 at `/usr/bin/glab`, host gitlab.com, project
  `panterasbox/saxonberg`; `glab issue list --label soak` answers (none
  open). Flags verified: `issue create -t -d -l -y`; `issue list -l
  --search --in title -F ids`; `issue note <iid> -m`; `issue close`.
- Merge commits on master carry `See merge request
  panterasbox/saxonberg!NNN` in the body (`9550937c6` → `!500`).
  `git log --first-parent --merges` lists them; `git diff --name-status
  <merge>^1 <merge>` gives what a merge brought in.
- `pnpm -C packages/server reset:db` drops the `.env` database (refuses
  `saxonberg_demo`). `@saxonberg/types` `main` is `./src/index.ts`, so a
  fresh checkout needs no types build to run wire files.
- The box: 15.9 GB, **2.9 GB available at plan time** with build worlds
  up — below `reserve (4) + world (3)`. See D7 and Risks.

### The census — what the 25 files actually do (read this cycle)

Two things govern every verdict: (1) **the dirty files share one world
and run in alphabetical order after the clean ones**, so each starts
wherever the previous left the clock; (2) **a fresh world's day 0 is early
winter** (`storage-and-ice` l.6–8: the mere's ice holds by day 2, open
again before day 280; `underwater` l.169: the confluence ice on day 0 "is
already rotten"; the river season walk was added by `8e2a9c117` because
"the third pass swam in iced pools and steamed in low water"). The
per-file table is D10.

### The `eval` sandbox — `packages/server/src/mud/platform/idea/EvalScript.ts`

- `SANDBOX_NAMES` (l.83–89): `StuffApi`, `MqlApi`, `ContainmentApi`,
  `MixinApi`, `console`; `buildSandbox(receiver)` (l.98) binds the four
  **class objects** whole (every static on them, `_`-prefixed and
  `@internal` ones included — `StuffApi.singletonSync` is reachable
  today) plus `self`/`target`. `run()` (l.165) wraps the body as a
  **sync** function — `(function(){ ${code} }).call(self)` — compiles
  once via `ScriptApi.compileSandboxed`, and returns
  `ScriptApi.runSandboxed(compiled, sandbox)`. Both statics are gated
  `FromModule('/platform/idea/EvalScript')` (`api/script.ts` l.190, l.203).
- `platform/idea/api/ScriptLogic.ts` l.553–572: `new VmScript(code)` and
  `compiled.runInContext(createContext(sandbox))` — **no `timeout`, no
  `microtaskMode`**. `node:vm` is imported at l.4 and nowhere else in
  the mudlib.
- `EvalController.ts` (`platform/idea/cmd/author/`): the jurisdiction
  (`--parcel`, default `/home/<key>`), `holdsAuthority` (l.234–278: self-
  home, then `ParcelApi.ownerOf` → player identity match / organization
  `canAtPath` / group `isMember`, then `AccessApi.can(giver,'eval',…)`),
  wire → `SandboxApi.runScoped`, field → `runGoverned`; `evalStuff.run`
  is awaited inside `try/catch` and a rejection becomes `error: …` in
  the result (l.171–177); `_formatResult` (l.297) `JSON.stringify`s with
  **no cap**. The view `content/platform/cmd/author/eval.yaml` carries
  `validators: [/lib/command/validators/requiresWizard]`.
- `lib/shell/Author.ts` l.42–61 declares the session settings
  `eval.timeoutMs` (default 1000) and `eval.maxDepth` (32) as schema,
  *"consumed when the sandbox honors them"*. Nothing reads either.
- Tests: `platform/__tests__/EvalScript.test.ts` (accessors + `run()`);
  no controller test. Drives use `eval --parcel` through a founder
  session (`dairy.dirty` l.293–300) and note at l.264 that *"a clone
  inside the eval sandbox dies at the boundary (`fromStored` denied) and
  the dispatch never answers."*
- ⭐⭐ **Why a refused clone takes the server down.**
  `services/Server.ts` l.326 installs `process.on('unhandledRejection',
  …) → process.exit(1)`. The denial itself is honest — `fromStored` is a
  marshaller method (`TemplateApplier.ts` l.185, `Document.ts` l.237) on
  a field-resident singleton, refused from circle scope by the proxy
  gate (`security.ts` l.1376, receipted through an async IIFE that
  catches its own errors) — and it propagates out of `#registerAndInit`'s
  `try` (`stuff.ts` l.1105–1128) so `StuffApi.clone` **rejects**. A
  rejection nobody holds then ends the process. The eval body is sync,
  so `StuffApi.clone(...)` written as a statement (not `return`ed) is a
  promise nobody holds; `ensureConstituent` (l.881) additionally returns
  *without awaiting* a pending singleton, though that pending promise is
  held by whoever started it. The build reproduces before fixing (D20).

### Test-only seams at runtime — `api/security.ts`

- `SecurityApi.isTestEnvironment()` (l.702): `VITEST` or `NODE_ENV=test`
  or **`SAXONBERG_TEST_WORLD=1`** — the last set only by the wire runner
  (`boot.ts` l.78, beside `AUTH_MODE=test`). ⭐ This is the mudlib's
  "test world" predicate; `AUTH_MODE` is read only in `backend/` and
  `services/` (`TestHooks` l.62, `Server.ts` l.141, `index.ts` l.57).
- `@TestOnly(guidance)` (`lib/security/decorators.ts` l.275) records
  `(class, member, guidance)` via `SecurityApi._markTestOnly` (l.715);
  `#withholdTestOnlyMembers` runs from `decorateApiClass` (l.614–620)
  and, outside a test environment, replaces the static with a throwing
  stub (l.794) naming the seam, the three signals and the guidance.
  **In a test world the member is live.** `getTestOnlyMembers(cls)`
  (l.735) is the runtime read of the marked names. Marked today: only
  `WorldClockApi.advance` (`api/worldclock.ts` l.194–205, also
  `@internal`). `lint:test-seams` (`scripts/check-test-seams.ts`) gates:
  every `@TestOnly` sits on a static in a file with a
  `decorateApiClass(` tail.
- `decorateApiClass(cls)` (l.529) sets a class-default policy and wraps
  every own static (`#wrapStaticDescriptor` l.579 — `original.apply(this,
  args)`, so a **bound** copy keeps `this === cls` and `#`-statics work).
  Only Api module tails call it (`decorators.ts`'s mention is prose);
  the class-form `@CallSecurity` uses `_wrapStaticMethods` instead. The
  four bootstrap-special Apis (`ExecutionContextApi`, `ModuleApi`,
  `SecurityApi`, `ProxyApi`) never call it (call-security.md § *Why Some
  Api Files Don't Self-Decorate*). There is **no runtime registry of the
  decorated classes** today — `#classDefaultPolicies` is keyed by class
  but also holds class-form policies, so it is not that registry.
- 94 files under `api/`; 90 export a `*Api` class and 90 self-decorate.
  **No Api facade carries a class-level `@internal`.** Member-level
  `@internal` statics on decorated Apis: `_`-prefixed (`persist.ts`
  `_resetEncryptionKeyForTest`, `compact.ts` `_resetOfficeRegistryRefForReload`,
  `stuff.ts` `_reindexTemplatePath`/`_validateClassPath`, `containment.ts`
  `_registerMergeOnArrivalHook`) and un-prefixed (`stuff.ts`
  `singletonSync`, `schedule.ts`/`worldclock.ts` `cancelAllForScope`,
  `sandbox.ts` `discardScope`/`openSession`/`closeSession`/
  `handleWireLinkdead`/`handleWireQuit`/`entryRoomForScope`). TSDoc is
  not available at runtime; `project-author-surface.ts` reads it only
  from TypeDoc's `api-model.json` (minutes to build, gitignored).
- Frames: `ExecutionContextApi.getCallStack()` returns `CallFrame[]`
  (`{caller, target, method, kind?}`, `execution-context.ts` l.92);
  every proxied Stuff method call pushes a frame whose `target` is the
  receiver, and the ALS store survives `await`. `_boundaryContext()`
  (l.685) reads `{circleScope, jurisdictionBound}`; `SandboxApi.runScoped`
  / `runGoverned` plant a **fresh root** carrying one of them, and
  `EvalController` calls `evalStuff.run(target)` *inside* that root. So
  inside an eval body the stack is `[root, EvalScript.run, ScriptApi.
  runSandboxed, ScriptLogic.runSandboxed, …]` — an `EvalScript` target
  is on the stack, in every mode, before and after any `await`.
  `SecurityPolicies` (`lib/security/SecurityPolicies.ts`): `Public`,
  `SystemRoot`, `SelfOnly`, `ApiOnly`, `FromModule`, `FromTemplate`,
  `FromTemplateMethod`, `FromClass`, `FromMixin`, `AnyOf`, and a
  predicate form (l.584). `SecurityApi.assertFieldMutation(holder,
  method)` (l.1432) is the shipped one-line guard shape.
- The Api-static → logic gate, verified: `WorldClockApi.advance` →
  `logic().advance` → `WorldClockRegistry.advance`
  (`@CallSecurity(WorldClockApiCallers)` = `FromModule('/api/worldclock#
  WorldClockApi')`); the registry's caller frame is the Api static's own
  frame, so the forward passes **from any caller the static admits** —
  the Api statics themselves default to `PUBLIC_FALLBACK`. From inside an
  eval body the caller of an Api static is the eval frame; the static
  admits it; the logic admits the static. ⭐ So binding an Api in the
  sandbox exposes exactly what its own per-static gates allow, which is
  the requirement's rule. A **direct** call on a logic singleton from
  eval (`StuffApi.findByTemplatePath('/platform/idea/api/worldclock').
  advance(…)`) is denied by that singleton's `FromModule` gate — the
  back door is closed by the shipped gate, with the generic denial.

### Title and the test runner — `backend/TestHooks.ts`, `api/parcel.ts`, `api/access.ts`

- `TestHooks.provisionCharacter(userId, name, startLocation, wizard)`
  (l.151–187): with `wizard`, adds `Avatar.getTemplatePath(playerId)`
  (= the identity path) to **every** managed group. `TestAuthRoutes`
  l.57–77 reads `handle`/`withCharacter`/`startLocation`/`wizard` from
  the body. The wire `Session.open(handle, {startLocation, wizard})`
  (`harness/session.ts` l.259) is the client of that body.
- `/world/terminus` and every district under it are titled to **group
  `terminus`** (`packages/content/terminus/pack.yaml` l.42–60);
  `mayfield-row/seznick-house` to group `mayfield-holdings`. A wizard
  test character is in every managed group, so **a group-held parcel is
  already held**: `holdsAuthority`'s group branch and `AccessApi.
  heldExtents` (`AccessRegistry.ts` l.233) both admit it. What a wizard
  does *not* hold: a `player`-titled parcel (a bought lot, somebody's
  `/home/<key>`) or an `organization`-titled one where it holds no
  position. The drive's "unheld parcel" (step 8) is one of those.
- `ParcelApi.transfer(extent, newOwner)` (`parcel.ts` l.317 →
  `ParcelRegistry.transfer` l.349): `assertFieldMutation`, appends a
  `transfer` event, re-points the owner, **re-indexes the owner index**
  (so `heldExtents` sees it), saves; `null` when no parcel claims the
  **exact** extent. `ParcelOwner` for a player is `{kind: 'player',
  templatePath}` (`lib/parcel/ParcelRecord.ts` l.60–63); `AccessRegistry.
  subjectOwnsAsPlayer` (l.543) and `EvalController.holdsAuthority`
  (l.255–259) both match it against `getIdentityPath()` or `/home/<key>`.
  `ParcelApi.grant(claim)` is the installer's seam: an existing row
  under a different holder is `conflict` — untouched, and the pack's
  rows under it reconcile `skip-sold` (parcel.md § grant). `grantUse`
  (a lease) is read by `heldUnitsOf`, **not** by `can`/`heldExtents`.
- `ParcelApi.coveringParcelOfSync(path)` (l.100) is longest-prefix;
  `heldExtents(subject)` (l.150) returns sorted extents incl. the
  self-home.

### The weather pin — `lib/biome/Atmospheric.ts`, `platform/idea/Locality.ts`, `api/weather.ts`

- `WeatherPin = {type: WeatherType, mode: 'frozen' | 'alive'}`
  (`lib/weather/WeatherType.ts` l.512–525). Two hosts carry
  `_weatherPin` (`persistent: true`): `AtmosphericMixin` (l.299, l.479
  `authorable: true`, accessors l.1117–1121) — the scope tier — and
  `Locality` (l.158, l.259, accessors l.532–536) — the locality tier.
  `WeatherLogic.resolveWeatherPin(scope, locality)` (l.405) walks the
  scope's containment for an Atmospheric pin, then the Locality's.
  ⚠ `precipitationBetween` and the snow walk are keyed by Locality and
  see only the **Locality-tier** pin (weather.md l.368–373, l.208–210).
- `WeatherApi` has **no pin write**; its statics are reads plus
  `onBoundary()` (l.417 — the presence-gated thermal restamp fan-out),
  `forgetScope(stuffId)` (l.360), and three `_*ForTesting` seams
  (`_forceTypeForTesting` l.460 is process-global and `assertTestOnly`-
  gated to in-process test frames — useless across a socket).
  weather.md l.692 and testing.md § *Open: test seams a drive would want*
  both name `/auth/test-weather` as the missing seam.
- `AddressApi.resolveLocalityFor(scope: Stuff): Promise<Locality | null>`
  (`api/address.ts` l.86) — the shipped scope → Locality read.
  `MixinApi.isAtmospheric` exists (`api/mixin.ts` l.1991).

### The command-view store — `platform/idea/api/CommandLogic.ts`, `lib/command/CommandDefinition.ts`

- `preloadAll()` (l.631–684): with a store, every `command-view`
  document (`DocumentApi.listOfKind('command-view')`) is parsed by
  `CommandDefinition.fromView`, validators resolved, and set in the
  `commands` map by key; a parse failure is a `failed` entry, never a
  throw. Offline (no store) the packs' files are read the same way.
  `reload(docPath)` (l.620) re-reads one. The dispatcher knows a verb
  only through `commands` — a view never set there is an **unknown
  verb**, and `allDefinitions()` (what `help`/`affordances` read) never
  lists it.
- `CommandDefinition`'s constructor (l.155–180) copies the view's keys
  (`fallthrough`, `async`, `opens_card`, `validators`, …); `fromYaml`
  validates against `lib/command/command.schema.json`, whose top level
  is **`additionalProperties: false`** (l.11) — a new view key needs a
  schema entry. `category` (l.140–153) derives from the path segment
  after `cmd`. A `fallthrough: true` view needs both `args` and
  `subcommands` (l.253–264); `GitController` reads `model.subcommand`
  (l.35, l.44) and defaults it.
- Validators are files at `lib/command/validators/<name>.ts` exporting a
  default `CommandValidator` (`requiresWizard.ts`: `preload` →
  `AccessApi.isWizard`, body returns the refusal string); resolved by
  `resolveCommandValidators` (CommandLogic l.3186). 36 exist.
- Controller rows: `content/platform/idea/cmd/system/<Name>Controller.yaml`
  (16 in `system/`); `lint:controller-rows` refuses a `controller:` with
  no row.
- The `system` category holds the operator/meta verbs (`ping`, `trace`,
  `config`, `errors`, `committee`, `git`); `author` holds the code doors
  (`eval`, `reload`, `clone`, `typecheck`, `wizard`).

### Import tiers and the backend — `scripts/check-mud-imports.ts`

Mudlib code may import only inside `src/mud`; the **api** tier
(`mud/api/**`) and the **objapi** tier (`mud/platform/idea/api/**`) may
additionally reach `backend/` — `SandboxLogic.ts` l.12 imports
`PersistenceManager` (`whenQuiet(quietMs, timeoutMs)` is at
`backend/PersistenceManager.ts` l.510). A **controller** is mudlib and
cannot import `backend/TestHooks`; a **route** (`services/`) can. So
anything the `testharness` command and the harness route must share lives in
the Api tier.

## Plan-level decisions

**D1 — Chunking is not a conversion** (the coordinator, from the slate §2:
*span is set by the span skipped*). A step whose skipped span exceeds a
game day in total moves to a `.soak.` file; rewriting a 5-day jump as five
1-day calls to pass the per-call refusal is forbidden. A jump stays only
when the drive genuinely needs ≤ 1 day — judged per site by what the step
asserts (D10). The refusal is per call (`> 86,400` game seconds); the
rule is per step, enforced by review and by the census, not by the
server. A retry loop that jumps "if refused" is a span step in disguise
and is removed, not kept as a fallback (taps l.625).

**D2 — The lock and the reserve are extracted, not copied.**
`tools/lib/suite-lock.sh`, sourced by `tools/suite` and `tools/soak`.
It defines `LOCK=${SUITE_LOCK:-$ROOT/.suite.lock}`,
`RESERVE_GB=${SUITE_RESERVE_GB:-4}`, `avail_mb`, `lock_holder` (prints
`pid worktree` or nothing; clears a stale lock), `take_lock` (honoring the
caller's `WAIT`), `drop_lock`, and a `TAG` the messages are prefixed with
(`suite:` / `soak:`). The caller sets `WORKTREE`, `ROOT`, `WAIT`, `TAG`
before sourcing. `tools/suite` loses its inline copies and behaves
identically. `tools/` is shell; the mudlib module-category rule does not
apply, and this is the first `tools/lib/` — sanctioned by the coordinator.

**D3 — Soak mode is a body field, enforced ONCE in the shared test hook,
parsed by the clock's own grammar.** *(Amended 2026-10-30 for the
staging scope: the cap lives in `TestHarnessLogic`, not `TestHooks`, so the
`testharness clock advance` door meets it too — D22.)* The harness sends
`{advance, soak: true}` when `process.env.WIRE_SOAK === '1'`. The route
passes `body.soak === true` through as `{soak}` to
`TestHooks.advanceClock(duration, {soak})`, which is now a thin
test-mode-gated `runRoot` around **`TestHarnessApi.advanceClock(duration,
{soak})`**. `TestHarnessLogic.advanceClock` computes
`WorldClockApi.durationSeconds(duration)` and, if it exceeds
`TestHarnessLogic.BLOCKING_JUMP_CAP_S = 86_400` and `!opts?.soak`, throws
**before** the jump:

```
test clock: a jump of '30 days' (30.0 game days) is a SPAN step and
cannot run in a blocking drive — the line is one game day
(docs/workflow.md § No merge waits on the clock). Move the step to a
.soak. file (<feature>.soak.wire.test.ts, run by `pnpm wire:soak`), or
shorten it to a day or less.
```

The parser is not duplicated: `WorldClockRegistry.parseDelayToSeconds`
becomes public `durationSeconds(d)` (same body, `@CallSecurity(
WorldClockApiCallers)`), `WorldClockLogic.durationSeconds` forwards,
`WorldClockApi.durationSeconds(d: Quantity<'s'> | string): number` is the
facade static — a pure parse, **not** `@TestOnly` (nothing about it is a
test seam; the parse error message is unchanged). Exactly `1 day` /
`24 hours` / `1440 minutes` pass (the cap is `>`). Neither door
pre-checks: one place refuses, and each door relays the message as it
already does (the route as `500 {error}`, the command as the refusal
line + a `controller-rejected` note).

**D4 — The result is one JSON beside the log, written by a vitest
reporter.** Two files under `packages/wire/.wire/` (already gitignored,
already a CI artifact):

- `.wire/declarations.json` — the registry's report, moved from
  `os.tmpdir()`; `rmSync` at setup, **kept** after teardown.
- `.wire/result.json` — written once by `src/runner/result-reporter.ts`
  at `onFinished(files)`, merging `declarations.json` by file name:

```jsonc
{
  "schema": 1,
  "mode": "soak" | "blocking",          // WIRE_SOAK
  "owned": true,                        // WIRE_TEST_WORLD
  "serverUrl": "http://localhost:2020",
  "serverLog": "/abs/packages/wire/.wire/server.log" | null,
  "startedAt": "2026-10-30T22:11:04.120Z", "finishedAt": "…", "wallMs": 0,
  "files": [{
    "file": "canary.soak.wire.test.ts",  // basename, as declareFile names it
    "state": "pass" | "fail" | "skip",
    "durationMs": 0,
    "dirtyReason": null, "proseReads": 0, "packs": ["platform"],
    "tests": [{                          // in file order — THIS is the drive record
      "name": "the lane proves itself > jumps two game days and the world answers",
      "state": "pass" | "fail" | "skip",
      "durationMs": 0,
      "errors": [{ "message": "…", "stack": "…" }]
    }]
  }],
  "errors": ["…"]                        // run-level errors (a boot that died)
}
```

`onFinished` runs in the main process before the global teardown, so
`declarations.json` is present; the reporter tolerates its absence (empty
annotations, never a throw — the result is a courtesy to the runner, not
a gate on the run). The teardown's printed report gains one line listing
the soak files it excluded (`soak files (run by pnpm wire:soak): …`,
read with `readdirSync('tests')`) so drive step 1 has something to assert.

**D5 — `wire:soak` is an env switch in the config, and the subset is
vitest's own positional filter.** `"wire:soak": "WIRE_SOAK=1 vitest run"`.
In `vitest.config.ts`, `include` is `['tests/**/*.soak.wire.test.ts',
'tests/**/*.soak.dirty.wire.test.ts']` when `WIRE_SOAK === '1'`, else
`['tests/**/*.wire.test.ts']` with `exclude: [...configDefaults.exclude,
'**/*.soak.*']`. `pnpm wire:soak canary` appends `canary` to the command,
which vitest treats as a filename filter. `wire`, `wire:clean` and
`wire:dirty` are untouched and inherit the exclusion (vitest applies
`exclude` to CLI-named files too — the build verifies with `vitest list`
in W0). `WIRE_SOAK` reaches the workers by inheritance (same route as
`WIRE_BOOT`), and the harness reads it per call.

**D6 — The state file is one line in the soak worktree.**
`$SOAK_WORKTREE/.soak/state` holds the last soaked SHA (full). Beside it:
`.soak/log` (append-only: `<iso-time> <sha> <file> pass|fail|skipped
<reason>`), `.soak/results/<sha>.json` (a copy of that run's
`result.json`), `.soak/server-<sha>.log` (a copy of the server log on
failure). Root `.gitignore` gains `.soak/`. The runner refuses to start
with no state file and says how to seed it (`echo <sha> >
.soak/state`); the build seeds it at the merge that lands this build.

**D7 — The runner's gate: lock free AND headroom, with the night as the
fallback.** `tools/soak` boots only when `avail_mb ≥ RESERVE_GB·1024 +
SOAK_WORLD_MB` (`SOAK_WORLD_MB=3072`) and `lock_holder` is empty; it
prints which it is waiting on (`soak: waiting for memory (2.9 GB free,
need 7.0 GB)` / `soak: waiting for the lock (build-2, pid 4121)`) and
polls every `SOAK_POLL_S` (60). During **quiet hours**
(`SOAK_QUIET_HOURS=2-6`, local) the reserve term drops and only the
world's own 3 GB is required — the builds are idle, which is the
requirement's "soaked by the end of the next night". The world term never
drops: a world cannot boot in less. ⚠ At plan time the box shows 2.9 GB
available with build worlds up, so the daytime gate will rarely pass; the
night rule is what makes the promise true, and only if the idle worlds
give memory back (see Risks — needs the owner's eye).

**D8 — Every threshold, path and external is an env override, so the
drive stages contention without creating it.** `SOAK_WORKTREE`
(`$ROOT/soak`), `SOAK_REF` (`origin/master`), `SOAK_STATE`
(`$SOAK_WORKTREE/.soak/state`), `SOAK_PORT` (2020), `SOAK_WORLD_MB`,
`SUITE_RESERVE_GB`, `SUITE_LOCK`, `SOAK_GLAB` (`glab`), `SOAK_POLL_S`,
`SOAK_QUIET_HOURS`, and `SOAK_RUN_CMD` — the command that runs the soak
files (default `WIRE_BOOT=1 WIRE_PORT=$SOAK_PORT pnpm -C packages/wire
wire:soak`), which the drive replaces with a stub that writes a canned
failing `result.json` and exits 1, so steps 5–6 boot no world. Step 5
sets `SOAK_WORLD_MB=999999` (waits on memory) and plants a fake lock
(`mkdir $SUITE_LOCK; printf '%s\n%s\n' <live sleep pid> fake >
$SUITE_LOCK/owner`) for the lock wait.

**D9 — What a merge "adds or changes".** For each first-parent commit on
`SOAK_REF` after the state SHA (`git log --first-parent --reverse
--format=%H state..ref`), the runner takes `git diff --name-status
<c>^1 <c> -- 'packages/wire/tests/*.soak.*'` with status `A`, `M` or
`R…`. ⭐ **The canary is added whenever the merge touches the tooling** —
`packages/wire/src/`, `packages/wire/vitest.config.ts`, `tools/soak`,
`tools/lib/`, `packages/server/src/backend/TestHooks.ts`,
`packages/server/src/services/auth/TestAuthRoutes.ts` — which is the
requirement's "the lane soaks it on every merge that touches the soak
tooling". A commit with nothing to run is advanced past with a
`skipped nothing-to-soak` log line. A merge commit's MR is read from its
body (`See merge request …!NNN`); a non-merge first-parent commit is
recorded as `(no MR)` — master is MR-only, so this is the drive's case,
not a real one. Every first-parent commit is a unit; the runner does not
filter on `--merges`, so the build's own branch can be soaked by pointing
`SOAK_REF` at `HEAD`.

**D10 — The census outcome.** Applying D1 to what each site asserts (the
grounding's per-file reading). *stays* = the file keeps the step within a
day; *→ soak* = the step or chain moves to `<f>.soak.dirty.wire.test.ts`;
*whole* = the file is renamed, nothing blocking remains.

| file | over-a-day sites | outcome | reason |
|---|---|---|---|
| sugar | `toWorkMorning(4)` ≈ 4–5 d (the 4-day cure), `toSundayMorning` ≤ 7 d, `2·DAY`/`2.5·DAY` (drain set, across a restart), `11·DAY` (clay), `toMonday9` ≤ 7 d | **whole** | Stage A chain 2→6→7→9→8→10 hangs off the cure, the set and the clay; Stage B sleeps real hours on top. Nothing blocking survives honestly. Keep `suite.skipIf(!isOwnedTestWorld())`. |
| cleanliness | `'48 hours'` l.601 | **stays**: `'24 hours'` | the byre reads `/manure\|dung\|filthy\|soiled/`; `MANURE_PER_HEAD_DAY 0.15 × 6` = 0.9/day → soiled (0.4) after one day. Retitle "a day of cows". |
| whiskey | `'2 days'` l.319; `'6 days'` l.440; `'60 days'` l.503 | l.319 **stays** `'1 day'` (bound adjusted); ferment + suite 5 **→ soak** | l.319 only proves the route moves. The ferment's blocking assertion (`look vat` length > 20) needs no days; keep the still-charge step with no jump. `whiskey.soak.dirty` redoes the stoke/charge setup, ferments 6 days, casks 60 days, asserts "whiskey". |
| taps | `'3 days'` l.331; `'20 days'` retry loop l.625 | l.331 **stays** `'1 day'` (bounds adjusted); the retry jump is **deleted** | the sap window is open at t≈0; a jump-if-refused is a span fallback (D1). If the window is ever shut at the world's clock the step fails honestly, and the twin belongs in a taps soak file then. |
| dairy | `'3 days'`×7 ripening l.746; `'15 days'`×≤20 ewe season l.831; `'4 days'` dry-cow rest l.872 | three steps **→ soak** | each is a genuine span (3 weeks / up to a year / 4 days). The split-and-consign test after l.746 needs the wheel, not its ripeness — stays with no jump. `dairy.soak.dirty` carries its own setup for all three (wheel on the rack; a ewe; a cow dried off) — copy the helpers. |
| rubber | `'26 hours'` l.338 and l.516 | **stays**: `'24 hours'` | `latex.yaml drainSetting.days: 1`, `Mould.ts` l.340 rate `(1+ratio)/days` → `setProgress` reaches 1 at exactly one day from the stamp, and the real seconds between the pour and the jump add margin. ⚠ Build verifies the pan reads `set`; if it does not, the step **moves to soak** — never `'1 day' + '2 hours'`. |
| assembly | `'40 days'` suite beforeAll l.388; `'10 days'` cask dry-out l.457 | the forty-days suite + the restart test **→ soak**; the dry-out step **→ soak** | oak warps at ~36.5 days (a constant), the cask slackens at `cask.dryOutDays: 7` (a content dial, not changed for a test). Drives 17/22/11 keep the cask without its dryness — stay. ⚠ Build verifies the proficient-cooper suite's `untilRestocked(cooper,'stave',30)` still restocks without the 40-day sweep; if not, that suite moves too. |
| storage-and-ice | `nextDays(3)` l.310, `nextDays(8)` l.494, `nextDays(280)` l.517 | tests **3–20 → soak**; 1, 2, 11 and the road check **stay** | the ice chain (3–10), the thickening (5) and the summer (12–20) are one span. 1–2 are day-0 only and self-skip in a moved world; 11 (sawmill, `'2 hours'`) and the road need no earlier state. |
| river-a | `openWater` ≤ 18×10 d; `morning` season walk ≤ 40×10 d | **whole** | every test swims or drifts the Kestrel; a fresh world is iced. |
| river-b | `morning` ×4 | **whole** | 7/11–13/14 need open water (a winter world is iced); 8 needs snowmelt flow. Open water is the file's premise, not a step's. |
| river-c | `morning` ×4 | **whole** | 19/20 need open water; 21/22 need spring flow. |
| river-d | `morning` l.139; `steam`'s let-the-season-turn ×2 | **whole** | one voyage of one ship that must float; `steam` waits for the water to rise. |
| river-e | `morning` l.123 | **whole** | 32–34 cross the Kestrel at Nesbit (ice unverified), 36 is the ferryman's own shift; 35 at sea alone is not worth a second file. |
| underwater | `openWater` in `beforeAll` l.214 | the dive chain **→ soak** (1, 2, 3, 8a/12, 10, 10a, 15b, 15c, the wet almanac, magic 20); **15d, 16, 18, 19 stay** | the chain needs the column with no ice ceiling; the four that stay are the quay almanac, the tidepool, the estuary tide and the mere's frog — daylight only. |
| drilling · whiskey-styles · pump · carcass-chain · potash · silk · maritime-space · repair · climate-and-water · glass · scan-sweep | every call ≤ 1 day | **stay unchanged** | within the line. |

Naming: every moved file is `<feature>.soak.dirty.wire.test.ts`; the
`declareFile` `file:` matches, `dirtyReason` is kept. The blocking
remainder keeps its old name. Drive bodies across a soak jump keep the
files' own current handling (feeding, parking); logging them out across
long jumps is the slate's § 4, not this build.

**D11 — The runner is one `main()` that is parsed before it runs.** The
runner moves the HEAD of the worktree it is invoked from (the `soak`
window's cwd is the soak worktree). A shell reads a script as it executes,
so the whole body lives in `main() { … }` with `main "$@"` as the last
line, and `tools/lib/suite-lock.sh` is sourced before any checkout — the
script that is running is then immune to the checkout replacing it.

**D12 — The run, step by step** (`--once` = one pass; `--watch` = loop
with `SOAK_POLL_S`; `--dry-run` = list and file nothing). Per commit with
work: (1) gate (D7); (2) `take_lock`; (3) `git -C $SOAK_WORKTREE fetch
origin && git -C $SOAK_WORKTREE checkout --detach <sha>` — refuses if the
worktree is dirty or on a branch; (4) `pnpm install --frozen-lockfile
--prefer-offline` in the worktree; (5) `pnpm -C packages/server reset:db`;
(6) `$SOAK_RUN_CMD <files…>` with `cwd=$SOAK_WORKTREE` — owned boot
boots and tears the world down itself; the runner additionally kills any
process still listening on `$SOAK_PORT` afterward (by pid from `ss -ltnp`,
never by pattern); (7) read `packages/wire/.wire/result.json`, copy it
and the server log into `.soak/`, append the log line; (8) file (D13);
(9) advance the state file to this SHA — **pass or fail**; (10)
`drop_lock`. On exit the worktree is returned to detached
`origin/master` (`git checkout --detach origin/master`), so the triage
session always finds master.

**D13 — Issue filing.** Per failing file: title `soak: <file> failed at
<short sha>`; dedupe by `glab issue list -l soak --search "<file>" --in
title -F ids` → an open issue exists → `glab issue note <iid> -m <body>`;
else `glab issue create -y -l soak -t … -d …`. Body (Markdown):

```
**File:** `packages/wire/tests/<file>`
**Merge:** `<sha>` — <subject> — <MR: !NNN | (no MR)>
**Run:** <finishedAt>, wall <mm:ss>, world on :<port>, db <name>

### Failing steps
- ✖ `<test name>` (<ms>)
  ```
  <error message, then the first 20 stack lines>
  ```

### Drive record

The blocking drive is a committed wire file, `packages/wire/tests/soak-harness.dirty.wire.test.ts`
(steps 2, 8, 9, 10). Its first four runs found five defects; the fifth run was green, 13/13, on
2019 / `saxonberg_build4` (2026-10-30).

| # | pace | result | how |
|---|---|---|---|
| 1 | instant | ✅ | `vitest list`: 71 ordinary files, no `.soak.`; the teardown prints `soak files (run by pnpm wire:soak): …` |
| 2 | short | ✅ | `advanceWorldClock('2 days')` → `test clock: … is a SPAN step … .soak. …`, clock unmoved; `'20 hours'` passes |
| 3 | short | ✅ | `WIRE_BOOT=1 WIRE_PORT=2019 wire:soak canary` → pass; `result.json` `mode: soak`, the test `pass` |
| 4 | instant | ✅ | `tools/soak --dry-run` (`SOAK_REF=build/soak-harness`) lists each commit and its soak files |
| 5 | staged | ✅ | `SOAK_WORLD_MB=999999` → `waiting for memory (3.2 GB free, need 980.6 GB)`; a live fake lock → `waiting for the lock (fake-worktree, pid N)` |
| 6 | staged | ✅ | stub failing run → issue #102 filed; re-run → commented on #102, no duplicate; #102 closed |
| 7 | instant | ✅ | stub passing run → state advanced to the commit; `--dry-run` → `nothing to soak` |
| 8 | staged | ✅ | `ConditionApi.inflict` (unbindable before W4) from `eval --parcel /world/terminus` scalds a patient; `assess` reads the burn. `/trade/distribution` (organization-held) refuses, then is granted at login and `eval --parcel` answers `2`. A non-parcel path fails the login naming `/world/terminus/market`. `ping` after each |
| 9 | short | ✅ | `eval while (true) 0` → `error: eval: timed out after 5000 ms (eval.timeoutMs)`, the next command answers; a 1 MB result is cut at 16,384 chars with its length; a dropped clone of a field row → the line carries it, the server is up, no `Unhandled rejection` in the log |
| 10 | short | ✅ | `testharness clock` reads; `clock advance 2h` moves 7,200 s; `clock advance 3d` → the span rule's words, clock unmoved; `weather pin rain` → `analyze weather` rain, `testharness weather` shows the pin, `unpin` releases it; `pin sideways` names the model's kinds; `eval WorldClockApi.advance` → the stub naming `testharness clock advance`; eval `setWeatherPin` refused. **Dev-world half:** the same DB booted on 2018 without `SAXONBERG_TEST_WORLD` logs `1 test-only view(s) withheld … testharness.yaml`; `testharness clock` → `unknown-verb`; `help testharness` empty; killed by PID |
| 11 | instant | see below | the census + `wire:clean` |

**What the drive found (all fixed in this MR):**
1. `testharness` was an unknown verb even in a test world: nothing afforded it → AuthorMixin `self`, beside `git`.
2. The weather pin threw `Receiver must be an instance of class _TestHarnessLogic`: `#` members on a proxied logic singleton → TS `private`.
3. `testharness clock advance` from a command frame: the drain inherited the giver's context. Now every jump runs on a fresh root (in `TestHarnessApi`, the framework tier that may open one).
4. The verb's weather pin found no Locality from the avatar, nor from the room Stuff in the controller → it hands the room's PATH to the route's resolve.
5. The drive scalded its own runner, whose dying window ran out across the next jumps; it died mid-command and the reply went to the destroyed body. ⚠ **A pre-existing defect, not fixed here:** a command whose giver is replaced mid-flight (death, reembody, a sandbox crossing) loses its dispatch-response — `emitDispatchResponse` sends through `ctx.commandGiver`. Recorded in the MR for a later build.

Observed, not asserted: under ONE pinned rain applied at once, a clothed runner still reads dry (clothes take rain first).

**The soak drive** (for the lane, after merge): `packages/wire/tests/canary.soak.wire.test.ts`.
