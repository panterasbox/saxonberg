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
| step | state | ms |
|---|---|---|
… every test in file order …

### Server log (last 120 lines)
```
…
```
```

`--dry-run` prints the same body to stdout instead. A missing or
unparsable `result.json` after a run is itself a failure of the lane:
one issue titled `soak: no result for <sha>` carrying the runner's
stdout — the canary case where the lane, not a build, is broken.

**D14 — The canary.** `tests/canary.soak.wire.test.ts`: `declareFile({file,
packs: ['platform']})`, one session, `worldClockNow()`, `advanceWorldClock('2
days')`, asserts `after − before ≥ 2·86,400 − 60`, then `look` is
`expectOk`. Clean (a jump consumes nothing the world does not regenerate).
It is the lane's self-test and the first real soak.

### The staging scope (D15–D25)

**D15 — `eval` binds every Api that self-decorates; the roster is the
runtime's, not a list.** `SecurityApi.decorateApiClass` gains one line —
it appends `cls` to a new `#apiClasses: ClassKey[]` — and a new read
`SecurityApi.decoratedApiClasses(): readonly object[]` (load order).
`EvalScript.buildSandbox` binds, under each class's own `name`
(`StuffApi`, `WeatherApi`, …), a **facade** for every class in that
list (D17), plus `console`, `self`, `target`. `SANDBOX_NAMES` is
deleted, and its ⛔⛔⛔ paragraph about `WorldClockApi` is rewritten to
say what is now true: the seam IS bound, as a stub that names the
`testharness` command (D25), and the containment is the `@TestOnly` mark plus
the test-world predicate, not the absence of a name. The four
bootstrap-special Apis are out **by construction** — they never call
`decorateApiClass` — which is the same line call-security.md already
draws for "internal framework"; nothing enumerates them in
`EvalScript`. A fifth that one day needed the same treatment would
declare it the same way: by not self-decorating. ⭐ **The drift gate is a
test, not a list**: `EvalScript.test.ts` gains *"the sandbox surface is
every `api/*.ts` `*Api` class but the four"* — it `import.meta.glob`s
`../../api/*.ts`, collects every exported `*Api` class, subtracts
`{ExecutionContextApi, ModuleApi, SecurityApi, ProxyApi}` (named in the
test, with the call-security.md § reference beside them), and asserts
set-equality with the facade names. A new Api that forgets its tail, or
a new bootstrap-special Api nobody wrote down, fails it. No author-
surface build, no second hand-kept list, no `@internal` parsing at
runtime.

**D16 — Per-static: `@TestOnly` members are bound as pointer stubs;
`@internal` statics are left to their gates, and a lint keeps that
honest.** TSDoc is not a runtime fact. What IS a runtime fact is
`SecurityApi.getTestOnlyMembers(cls)`. So the facade (D17) binds every
own static of the class **except** that it replaces each `@TestOnly`
member with a function that throws

```
WorldClockApi.advance is a test seam (@TestOnly) and eval does not bind
it. In a test world, reach it through the `testharness` command: testharness clock
advance <duration>. <the member's own @TestOnly guidance>
```

— the pointer is the first sentence of the member's `@TestOnly`
guidance string, so each seam names its own door (D25 rewrites
`WorldClockApi.advance`'s guidance to lead with `testharness clock advance
<duration>`; `TestHarnessApi`'s members lead with theirs). `@internal`
statics stay bound exactly as `StuffApi.singletonSync` is bound today;
every one of them keeps its call-security gate, which is the
requirement's rule ("nothing becomes callable that its gates do not
allow"). What must not drift is an `@internal` static with **no gate
at all** on a bound Api: `lint:eval-surface`
(`scripts/check-eval-surface.ts`, `--lint`) parses `api/*.ts` the way
`check-object-verbs.ts` does, lists every public static whose TSDoc
carries `@internal` and whose declaration carries neither
`@CallSecurity(` nor `@TestOnly(` nor a `_` prefix (the `assertTestOnly`
convention), and **ratchets today's count as the ceiling** (census,
then ratchet — the build prints the list into the MR). `lint:family`
picks it up by derivation.

**D17 — The facade: bound, observed, frozen.** Per Api, built once on
first use (Api classes are non-HMR; `@TestOnly` withholding has already
run at the module tail) and cached in a module-level `WeakMap<cls,
facade>` initialized lazily (no module-scope statement):
`Object.freeze(Object.fromEntries(ownStaticFunctions(cls).map(([name,
fn]) => [name, observed(fn.bind(cls))])))`. `bind(cls)` keeps `this ===
cls` through the security wrapper (`original.apply(this, args)`), so
`#`-static fields on Apis keep working. `observed(fn)` is the promise
net of D20: it calls `fn`, and if the result is thenable attaches a
rejection handler that records `{api, name, message}` on the **current
`EvalRun`** and returns the *original* promise (so a caller who awaits
still sees the rejection; a caller who drops it no longer leaves it
unhandled). `self`/`target` are bound through the same net: a `Proxy`
over the receiver whose `get` trap returns, for function-valued
members, `observed(value.bind(receiver))`, and the raw value otherwise
(`has`/`ownKeys` pass through; `set` writes through). The receiver is
already the call-security proxy, so every gate still runs on the real
object. The facade is the whole sandbox surface; `process`, `require`,
`globalThis` stay unreachable as before.

**D18 — The timeout is real: one budget, two phases.** `eval.timeoutMs`
(the shipped session setting, read through `resolveSetting(giver,
'eval.timeoutMs')` in `EvalController`, default **5000** — raised from
the never-enforced 1000 because a staging eval awaits a clone and its
record reads; ⚠ the owner's eye) is the wall-clock budget for one
invocation. `EvalScript.run(receiver, {timeoutMs})` →
`ScriptApi.runSandboxed(compiled, sandbox, {timeoutMs})` →
`ScriptLogic.runSandboxed`: `createContext(sandbox, {microtaskMode:
'afterEvaluate'})` and `runInContext(ctx, {timeout: timeoutMs})`. The
body is now wrapped as an **async** function — `(async function(){
${code} }).call(self)` — so `await` is legal in an eval and the body's
returned promise is what `run` awaits; V8's `timeout` terminates a
synchronous loop and (with `afterEvaluate`) a microtask loop, surfacing
as `ERR_SCRIPT_EXECUTION_TIMEOUT`, which `run` rewraps as
`eval: timed out after <n> ms (eval.timeoutMs)`. The awaited tail gets
the **remaining** budget: `run` races the body's promise against a
timer and rejects with `eval: timed out after <n> ms (eval.timeoutMs) —
the work in flight was not cancelled; its result, if any, is reported
late` when it wins. Node `vm` cannot cancel a host-side `await` (a DB
read in a clone); that is the `isolated-vm` deferral, named honestly in
the message and in shell-author.md. `eval.maxDepth` is **retired** from
`Author.ts`'s settings schema: V8 enforces its own stack limit, the
`RangeError` comes back as an ordinary error through D20, and a number
nothing can honor is the "declared-now, consumed-never" shape the owner
has refused elsewhere (⚠ the owner's eye — it is a key deletion).

**D19 — The output cap.** `EvalController.OUTPUT_CAP_CHARS = 16_384`.
`_formatResult` renders as today, then if the string exceeds the cap it
keeps the first `OUTPUT_CAP_CHARS` and appends ` … [cut at 16,384 of
1,203,112 chars — eval output cap]`. One cap, one place, applied to
every per-target result line including `error:` lines (a huge error is
still huge). The sandbox's `console` is unchanged (it writes to the
server's stdout, not the socket) — noted under Deferred seams.

**D20 — Every refusal is an error in the result; nothing an eval births
is left unhandled; the process policy stays.** Three parts, in order:

1. **Reproduce first.** A unit test in `EvalScript.test.ts` registers a
   `process.on('unhandledRejection')` spy, runs — inside
   `ExecutionContextApi.runRootGuarded(null, 'sandbox.runScoped', …,
   'rethrow', {circleScope: '/home/t'})`, the shape
   `TestHooks.clock.test.ts` l.77 uses — an eval body that calls
   `StuffApi.clone(<a field row with a Quantity field>)` as a **statement**
   and one that `return`s it, and asserts the pre-fix behavior (the
   statement form fires the spy). If the `return` form ALSO fires it,
   there is an internal tail (the suspect is a `.then` without a
   partner inside the clone pipeline; `ensureConstituent`'s no-await
   branch is the first place to look) and that tail is fixed at source
   in the same wave — the test then pins both.
2. **The net (D17's `observed`)** turns every eval-born promise into a
   held one. `EvalRun` is a per-invocation record `{lateErrors:
   Array<{api, name, message}>, settled: boolean}` held by
   `EvalScript.run` for the span of the body and the awaited tail.
   `EvalController` reports late errors that landed before the result
   (`late: StuffApi.clone — sandbox boundary denied fromStored() …`) on
   the result line; one that lands after the report goes to
   `MudlogApi.warn('sandbox.eval.late', …, {to: giver})` and the server
   log, so it is never silent and never fatal.
3. **`Server.ts` l.326 is not changed.** An unhandled rejection
   anywhere else still ends the process, loudly — that is the repo's
   break-loudly rule, and softening it to protect `eval` would hide
   the next defect class. The regression test is the one in (1), now
   asserting the spy never fires and the error reaches the result.

**D21 — Test login grants title by TRANSFER, to the parcels named, when
the runner does not already hold them.** `POST /auth/test-login` body
gains `parcels?: string[]` (strings, `/`-rooted; anything else → 400).
`TestHooks.authenticate(…, parcels)` → `provisionCharacter(userId, name,
startLocation, wizard, parcels)`. For each path, inside the existing
`runRoot`:

- the path must be an **exact** parcel extent —
  `ParcelApi.coveringParcelOfSync(p)?.extent === p` — else throw
  `TestHooks: '/world/terminus/dock' is not a parcel; the covering parcel
  is '/world/terminus' — name that` (a wrong path fails the login, not
  the first `eval` an hour later);
- if a held extent (`AccessApi.heldExtents(avatar)`) is a prefix of it →
  `kept` (a wizard already holds every group-titled parcel; a second
  login is idempotent);
- else `ParcelApi.transfer(p, {kind: 'player', templatePath:
  Avatar.getTemplatePath(playerId)})` → `granted`, one `console.info`
  line per parcel naming the prior holder.

Transfer is the shipped move that makes a player the holder a
`player`-kind title admits (`subjectOwnsAsPlayer`, `holdsAuthority`'s
player branch); a lease (`grantUse`) is not read by `can`. ⚠ The known
consequence: the pack that claimed the parcel finds `conflict` at the
next reconcile (a restart inside a drive, the nightly reprovision) and
its rows under that extent reconcile `skip-sold` — correct behavior for
a sold parcel, and a test world is reset per run. Documented in
testing.md with the grant. `Session.open(handle, {parcels: [...]})`
passes it through. Nothing in `AccessApi` learns about test mode
(`TestHooks`' standing rule).

**D22 — `TestHarnessApi` is the one implementation behind both doors.** New
`api/test-harness.ts` (`TestHarnessApi`, `decorateApiClass` tail) and
`platform/idea/api/TestHarnessLogic.ts` (`@internal`, `extends ApiLogic`,
template `/platform/idea/api/testing`, methods gated
`FromModule('/api/test-harness#TestHarnessApi')`). Every static is `@TestOnly`
with a guidance string that **leads with its `testharness` subcommand**:

| static | does |
|---|---|
| `advanceClock(duration: string, opts?: {soak?: boolean}): Promise<{before, after, settledMs, quiet}>` | the D3 cap; `WorldClockApi.advance`; pause → `PersistenceManager.get().whenQuiet(500, 240_000)` → resume (moved verbatim from `TestHooks`, with its comments); the `console.info` lines |
| `clockNow(): number` | `WorldClockApi.getNow().rawValue()` |
| `pinWeather(localityPath: string, type: WeatherType, mode: WeatherPinMode = 'frozen'): Promise<{locality, type, mode}>` | D23 |
| `unpinWeather(localityPath: string): Promise<{locality}>` | D23 |
| `BLOCKING_JUMP_CAP_S` | `86_400`, `static readonly` |

`TestHooks.advanceClock(duration, opts)` becomes `#assertTestMode` +
`ExecutionContextApi.runRoot(TestHooks, 'advanceClock', () =>
TestHarnessApi.advanceClock(duration, opts))` — the route door keeps its
root frame (no scope, no jurisdiction) and its `AUTH_MODE` gate; the
quiet-wait and the cap move down. `TestHooks.clockNow`,
`pinWeather(scopePath, type, mode)`, `unpinWeather(scopePath)` are the
same shape (the weather ones resolve `scopePath` → Stuff → Locality
through `AddressApi.resolveLocalityFor`, then call `TestHarnessApi` with
the Locality's template path). The `testharness` command's controller calls
`TestHarnessApi` **directly from its command frame** — a wizard's field
command frame carries no circle scope and no jurisdiction, which is
all the clock needs (the drain re-roots under `OMNI_SCOPE` itself —
`TestHooks.ts` l.13–23's history); a `testharness clock advance` issued from
inside a sandbox circle meets `assertNotQuarantined` and is refused in
the clock's own words, which is right. `TestHarnessLogic` imports
`PersistenceManager` from `backend/` under the objapi tier's allowance
(the `SandboxLogic` precedent). ⭐ One body, two frames, zero copies.

**D23 — The weather pin is a Locality-tier pin, set at runtime, and the
thermal cache is told.** `TestHarnessLogic.pinWeather(localityPath, type,
mode)`: `StuffApi.findByTemplatePath<Locality>(localityPath)` (must be a
`Locality` — else `testharness weather: '/world/terminus/market' is not a
Locality; the covering Locality is …`), `locality.setWeatherPin({type,
mode})`, then `WeatherApi.onBoundary()` so every connected viewer's room
restamps its `lastAmbientK` now rather than at the next segment
boundary, and `console.info`. `unpinWeather` sets `null` and restamps.
Locality-tier only, deliberately: the precipitation integral and the
snow walk read only that tier (weather.md l.368), so a drive that pins
`snow` gets snow on the ground and ice on the mere, not just a word in
`analyze weather`. The pin is `persistent: true` on `Locality`, so in a
test world it survives a restart until unpinned — a drive that pins
unpins (the harness helper pair). `WeatherType` validation is the
shipped `WEATHER_TYPES` array (a bad kind is refused naming the six).
Route: `POST /auth/test-weather` `{scope: string, type?: string, mode?:
'frozen' | 'alive'}` — `type` present → pin; `type` absent or `null` →
unpin; `scope` is a template path (`/world/terminus`) resolved to its
Locality in `TestHooks`; errors → `500 {error}` as the clock route
does. Harness: `pinWeather(type, scope, mode?)` / `unpinWeather(scope)`
in `src/harness/world.ts`, re-exported from `index.ts`.

**D24 — The `testharness` verb: a platform view flagged `testOnly`, admitted
by the store loader only in a test world, and double-gated by a
validator.** View `content/platform/cmd/system/testharness.yaml`:

```yaml
verbs: [test]
controller: /platform/idea/cmd/system/TestHarnessController
testOnly: true
description: "Test-world staging: move the clock, pin the weather"
validators:
  - /lib/command/validators/requiresWizard
  - /lib/command/validators/requiresTestWorld
subcommands:
  clock:
    description: "Read the clock, or `clock advance <duration>`"
    args:
      - { name: op, type: string, required: false }        # advance
      - { name: duration, type: string, required: false, greedy: true }
  weather:
    description: "`weather pin <kind>` holds the weather here; `weather unpin` releases it"
    args:
      - { name: op, type: string, required: true }         # pin | unpin
      - { name: kind, type: string, required: false }
    options:
      alive: { type: boolean, description: "pin alive (the grammar still varies the deviation) rather than frozen" }
```

- `testOnly: true` is a new boolean key: added to
  `lib/command/command.schema.json`, to `CommandView`, and copied onto
  `CommandDefinition.testOnly`. **One helper in `CommandLogic`,
  `admitsView(cmd)`** — `!cmd.testOnly || SecurityApi.isTestEnvironment()`
  — is consulted at the three places a definition enters the `commands`
  map (`preloadAll`'s store loop, its offline loop, `reload`); a view it
  refuses is counted as `withheld` in `preloadAll`'s return (logged once
  at boot: `CommandApi: 1 test-only view withheld (not a test world)`),
  never as `failed`. In a non-test world the dispatcher has no
  definition for `testharness` → **unknown verb**, `help` and `affordances`
  never list it, and a CMS `reload` of the view cannot sneak it in.
- `lib/command/validators/requiresTestWorld.ts` (the `requiresWizard`
  shape; `preload` → `SecurityApi.isTestEnvironment()`; refusal: `` `testharness`
  is a test-world verb and this world is not one (SAXONBERG_TEST_WORLD) ``)
  is the belt to the braces — the gate the view carries in its own data,
  so a world where the store filter were ever bypassed still refuses.
  `requiresWizard` is the owner's "a wizard".
- Why `system` and not `author`: `author` is the code doors (`eval`,
  `reload`, `clone`); `system` is the operator/meta verbs (`ping`,
  `trace`, `config`, `committee`); `testharness` is scaffolding an operator
  uses in a test world. No new category.
- Why a flag and not a pack: a view is a document in whichever database
  the boot installed it into, so a `test-seams` pack would need the
  installer to **uninstall** it on a non-test boot of the same database
  to make the verb unknown — a reconcile rule for one view. A flag the
  loader reads is one line and keeps the platform pack the sole owner
  of platform verbs; the document exists everywhere, the *verb* exists
  only in a test world, which is what the requirement asks of the verb.
- `TestHarnessController` (`platform/idea/cmd/system/TestHarnessController.ts`, row
  `content/platform/idea/cmd/system/TestHarnessController.yaml`) dispatches on
  `model.subcommand`: `clock` with no `op` prints game-seconds and the
  calendar line (`WorldClockApi.getNow()` through the same formatter
  `analyze sky`/time.md uses, else seconds); `clock advance <duration>`
  → `TestHarnessApi.advanceClock(duration)` and prints `before → after
  (settled in N ms)`; a refusal (the cap, a parse error, a paused clock)
  is `this.fail(context, message, 'test-refused')` — the message
  verbatim; `weather pin <kind>` resolves `AddressApi.resolveLocalityFor
  (giver)` (null → fail: *no Locality covers here*) and calls
  `TestHarnessApi.pinWeather(locality.getTemplatePath(), kind, alive ?
  'alive' : 'frozen')`; `weather unpin` likewise. No `--at` in v1: the
  route pins any scope by path; the command pins where you stand.
- Reachability for a verb (verb · affordance · data · boot · arg gate)
  is in the wiring table below; the data link is the controller row,
  the boot link is the store loader's admit.

**D25 — `eval` points at the command.** Two layers, one message:

1. The facade stubs of D16 — `WorldClockApi.advance` and every
   `TestHarnessApi` static are `@TestOnly`, so from eval they throw the
   pointer message; `advance`'s guidance string is rewritten to lead
   with `` `testharness clock advance <dur>` `` (the rest of its text
   stays). This is where the requirement's message comes from.
2. **The back doors close with the same words.** An eval can reach a
   mechanism without its Api — a Locality's `setWeatherPin` through
   `self`/MQL, the clock registry through `findByTemplatePath`. One new
   guard, `SecurityApi.assertNotFromEval(op: string, pointer: string)`,
   walks `ExecutionContextApi.getCallStack()` for a frame whose
   `target`'s class resolves (`ModuleApi.lookup`) to
   `/platform/idea/EvalScript` and throws `` `setWeatherPin` is not
   callable from eval (jurisdiction /world/terminus): use `testharness weather
   pin <kind>` `` when it finds one. Call sites: `Locality.setWeatherPin`,
   `AtmosphericMixin.setWeatherPin`, and `WorldClockRegistry.advance`
   (beside `assertNotQuarantined`). The `TemplateApplier` calling the
   setter during an ordinary clone is **not** under an eval frame and
   passes; a Locality cloned *from an eval* with an authored pin is
   refused, which is the rule stated once. The registry's `FromModule`
   gate already denies the direct call; the guard just makes the
   refusal say where to go.

## Host placement

No mixin and no persisted field is introduced. One instanceable class
(`TestHarnessController`, an `Idea` at `/platform/idea/cmd/system/
TestHarnessController`) and one logic singleton (`TestHarnessLogic`). The
additions, and what each claims:

| addition | host | claims |
|---|---|---|
| `durationSeconds(d)` | `WorldClockRegistry` (public, gated `WorldClockApiCallers`) → `WorldClockLogic` → `WorldClockApi` static | the grammar `after()`/`advance()` take is a readable surface; nothing about the clock changes. Not `@TestOnly`. |
| `advanceClock(duration, {soak})`, `clockNow`, `pinWeather`, `unpinWeather`, `BLOCKING_JUMP_CAP_S` | **`TestHarnessApi` / `TestHarnessLogic`** (new; every static `@TestOnly`) | scaffolding has one Api, withheld outside a test environment by construction; the cap is a TEST-process rule that never enters the clock, so no game code can meet it; the weather-pin WRITE lives here and not on `WeatherApi`, because nothing in the game pins the weather at runtime (weather.md l.697: the write Api was never shipped) — composing it onto `WeatherApi` would claim the fiction can. |
| `TestHooks.advanceClock` / `clockNow` / `pinWeather` / `unpinWeather` | `TestHooks` (backend) — thin: `#assertTestMode` + `runRoot` + forward | the route door keeps the root frame and the `AUTH_MODE` gate; it holds no logic of its own any more. |
| `soak` field on the test-clock request; `parcels` on test-login; the `test-weather` route | the route bodies | opt-ins only the harness sets; a world someone plays in never sees the routes. |
| `#apiClasses` + `decoratedApiClasses()` | `SecurityApi` | the registry of self-decorating Apis is a fact `decorateApiClass` already owns; recording it there claims nothing new. |
| `assertNotFromEval(op, pointer)` | `SecurityApi` (beside `assertFieldMutation`) | a one-line guard shape the sandbox already uses; its call sites are the two weather setters and the clock's `advance` — three, named, not a base class. |
| the facade + `observed` net + `EvalRun` | `EvalScript` (module-private functions beside `buildSandbox`, as `buildSandbox` is today) | the sandbox surface stays the one file's; no new module. |
| `OUTPUT_CAP_CHARS`, the `eval.timeoutMs` read | `EvalController` | rendering and settings are the controller's. |
| `runSandboxed(compiled, sandbox, {timeoutMs})` | `ScriptApi` → `ScriptLogic` (the one `node:vm` holder) | the capability keeps its one home. |
| `testOnly` view key + `admitsView` | `CommandView` / `CommandDefinition` / `CommandLogic` | a view property and the loader that reads it — the store, not the controller, decides whether a verb exists. |
| `requiresTestWorld` | `lib/command/validators/` (the 37th) | a verb-level precondition in the shape of the other 36. |
| `parcels` grant | `TestHooks.provisionCharacter` | title is written through `ParcelApi.transfer`, the shipped primitive; `AccessApi` learns nothing. |
| `pinWeather(type, scope)` / `unpinWeather(scope)` | `packages/wire/src/harness/world.ts` | the `advanceWorldClock` sibling testing.md asked for. |

The wire package's `ResultReporter` is a runner-side class in
`src/runner/`. ⭐ The narrowing test: no guard in this plan re-narrows a
host set — `assertNotFromEval` narrows a CALLER, which is what a guard
is for.

## Convention conformance

- **Module categories.** Every new file is an existing category: an
  Api (`api/test-harness.ts`, lowercase, `decorateApiClass` tail), its logic
  singleton (`platform/idea/api/TestHarnessLogic.ts`, `@internal`, `extends
  ApiLogic`, `FromModule('/api/test-harness#TestHarnessApi')` gates — the
  mandatory `XApi`↔`XLogic` split), a controller
  (`platform/idea/cmd/system/TestHarnessController.ts`) with its view
  (`content/platform/cmd/system/testharness.yaml`) and row
  (`content/platform/idea/cmd/system/TestHarnessController.yaml`), a validator
  (`lib/command/validators/requiresTestWorld.ts`, default-export const,
  the shipped shape), and a lint script (`scripts/check-eval-surface.ts`).
  No free helper, no `lib/mixins/`, no new category. `EvalScript`'s
  facade and net are module-private functions in the file that already
  holds `buildSandbox`. `src/runner/result-reporter.ts` is a wire-package
  runner module beside `boot.ts`; `tools/lib/suite-lock.sh` is shell (D2).
- **Module scope.** Every Api keeps/gets its trailing
  `SecurityApi.decorateApiClass`; the facade cache is a lazily
  initialized `WeakMap` inside a function, not a module-scope statement;
  `vitest.config.ts` reads `process.env.WIRE_SOAK` at config load — not
  under `src/mud`.
- **Import boundary (`lint:imports`).** `TestHooks.ts` (backend) imports
  `TestHarnessApi`, `AddressApi`, `ParcelApi`, `AccessApi` — backend may.
  `TestHarnessLogic` imports `PersistenceManager` from `backend/` — the
  objapi tier may (SandboxLogic precedent). `TestHarnessController` imports
  only `api/*` and `lib/*`. `node:vm` stays in `ScriptLogic` alone.
  `EvalScript.test.ts` reads `api/*.ts` with `import.meta.glob` — tests
  are unrestricted.
- **Verbs on objects (`lint:object-verbs`).** No new Api static takes a
  world object first: `advanceClock(duration: string, …)`,
  `pinWeather(localityPath: string, …)`, `durationSeconds(d)`,
  `assertNotFromEval(op: string, pointer: string)`. The census stays 0.
- **`lint:lib-statics`.** No static on a `lib/` class is added; the
  ceiling does not move.
- **`lint:gates`.** New gate strings resolve: `FromModule('/api/test-harness#
  TestHarnessApi')`, `FromModule('/platform/idea/EvalScript')` (existing).
- **`lint:test-seams`.** Every `@TestOnly` added (`TestHarnessApi`'s four)
  sits on a static in a file with a `decorateApiClass(` tail. ⭐ The
  gate's "unmarked seams" worklist does not grow: nothing new is named
  `*ForTesting` without the mark.
- **`lint:thin-forwarder`.** `TestHarnessApi` statics forward to `logic()`
  (a call, not a parameter) — not flagged. `TestHooks` is backend, out
  of scope.
- **`lint:controller-rows` / `lint:instanceable`.** The `TestHarnessController`
  row exists; `/lib/command/validators/requiresTestWorld` is a validator
  ref, the same string shape as `requiresWizard`, not a template path.
- **`lint:binder-models`.** The `TestHarnessController` test hand-builds its
  model with `subcommand` and the string args the view declares — no
  object-typed arg exists on the view, so nothing is skipped.
- **`lint:schema`.** No collection is added or renamed; the parcel
  transfer writes the existing `parcels` + `parcel_events`.
- **`lint:test-bootstrap`.** Every new server test imports
  `test-bootstrap`.
- **`lint:eval-surface`** (new, D16) joins the derived roster; its
  ceiling is today's count and may only fall.
- **Privacy.** Backend defaults to `#`: `#assertTestMode` stays. The
  cap is `static readonly` on `TestHarnessLogic` (read by the message and
  the tests). `SecurityApi.#apiClasses` is `#` (Api-static slot, no
  proxy receiver).
- **Call security of what eval reaches.** Nothing is widened: no gate
  is loosened, no `ApiOnly` setter is opened, no test-mode branch enters
  `AccessApi`. The surface grows only by binding Apis whose statics
  already carried their gates.
- **No `.js` in imports; American English** in every new name and
  message (`unpin`, `behavior`, `canceled`).
- **Lints this build must pass:** `pnpm -C packages/server lint:family`
  in full (the derived roster — including `lint:eval-surface` once it
  exists), plus `pnpm -C packages/wire exec tsc --noEmit` and ESLint
  over the wire package, and `pnpm -C packages/server lint:test-seams`
  specifically after W1 and W6 (it is in the family; named here
  because the staging scope adds four marks).

## Waves

Each wave lands at one commit; messages from a file (never `-m` with
backticks); stage by name.

### W0 — the convention, the run command, the result, the canary

Goal: a soak file exists, nothing ordinary runs it, `wire:soak` runs it,
and every run leaves `result.json`. Implements D4, D5, D14 and the
harness half of D3.

Files: `packages/wire/package.json` (+`wire:soak`),
`packages/wire/vitest.config.ts` (include/exclude switch, reporter
registered), `packages/wire/src/runner/result-reporter.ts` (new),
`packages/wire/src/runner/global-setup.ts` (`declarations.json` path;
no teardown delete; the excluded-soak-files line; `startedAt` stamp for
the reporter via env), `packages/wire/src/harness/registry.ts`
(`FileRecord` unchanged; `readRunReport` reused by the reporter),
`packages/wire/src/harness/world.ts` (`soak: true` when
`WIRE_SOAK==='1'`), `packages/wire/tests/canary.soak.wire.test.ts` (new).

Acceptance: `pnpm -C packages/wire exec vitest list` shows no `.soak.`
file; `WIRE_SOAK=1 … vitest list` shows only the canary; `vitest list
tests/*.dirty.wire.test.ts` (the `wire:dirty` glob) shows no `.soak.`;
`WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C packages/wire wire:soak canary`
passes against this worktree's own database (`saxonberg_build4`) and
`.wire/result.json` has the canary's test with `state: "pass"`, a
`durationMs`, and `mode: "soak"`. (The refusal is not in yet, so the
canary's 2-day jump passes regardless — W1 makes the mode matter.)

Commit: `wire(soak): the .soak. convention, wire:soak, result.json and the canary`.

### W1 — the refusal, in the shared hook

Goal: a jump past a game day outside soak mode fails before jumping, in
words that name the rule and the fix — enforced in `TestHarnessApi`, the
one implementation both doors will call (the `testharness` command arrives in
W6 and finds the hook already there). Implements D3, and the clock
half of D22.

Files: `packages/server/src/mud/platform/idea/WorldClockRegistry.ts`
(`durationSeconds` public), `…/api/WorldClockLogic.ts` (forward),
`packages/server/src/mud/api/worldclock.ts` (static);
**new** `packages/server/src/mud/api/test-harness.ts` (`TestHarnessApi`:
`advanceClock`, `clockNow`, `BLOCKING_JUMP_CAP_S`; the weather pair
comes in W6) and `packages/server/src/mud/platform/idea/api/
TestHarnessLogic.ts` (the cap check, the jump, the pause/`whenQuiet`/resume
moved from `TestHooks` with their comments);
`packages/server/src/backend/TestHooks.ts` (`advanceClock(duration,
opts)` → thin forward under `runRoot`; `clockNow` → forward; the
module header's clock paragraph now points at `TestHarnessApi`);
`packages/server/src/services/auth/TestAuthRoutes.ts` (`soak` through).
Tests: `src/backend/__tests__/TestHooks.clock.test.ts` (+ `'2 days'`
rejects matching `/span step/i` and `/\.soak\./`; `'2 days', {soak:
true}` moves; `'20 hours'` and `'1 day'` move; the refusal leaves the
clock where it was — assert `clockNow()` unchanged; the two "sheds
scope" cases still pass through the forward);
**new** `src/mud/api/__tests__/test-harness.test.ts` (the cap at the Api,
both sides of the line, soak on/off; `clockNow`; and ⭐ *"every static
on `TestHarnessApi` is `@TestOnly`"* — `SecurityApi.getTestOnlyMembers
(TestHarnessApi)` covers every own static function, so a future seam added
here cannot forget the mark);
`src/services/auth/__tests__/TestAuthRoutes.test.ts` (+ `{advance: '2
days'}` → 500 with the message; `{advance: '2 days', soak: true}` → 200;
`{advance: '1 day'}` → 200); a registry/Api parse test (`'90 minutes'`
→ 5400, `'1.5 days'` → 129,600, `'next tuesday'` throws the existing
message) beside the registry's existing `__tests__`.

Acceptance: `pnpm -C packages/server test:near` green on the touched
files; `lint:family` green (`lint:test-seams` now counts three marks,
`lint:gates` resolves `/api/test-harness#TestHarnessApi`); `WIRE_BOOT=1
WIRE_PORT=2019 pnpm -C packages/wire wire:soak canary` still passes
(soak mode on); the same canary body run through `pnpm wire` is
impossible by W0, so the blocking-side proof is drive step 2 (a scratch
non-soak file, not committed).

Commit: `clock(testing): TestHarnessApi — refuse a jump past a game day outside soak mode, in the one hook both doors call`.

### W2 — the census moves

Goal: no non-soak wire file carries a call the refusal would hit, and no
step was chunked. Implements D1, D10.

Files: per D10 — rename (`git mv`) `sugar`, `river-a…e` to
`<f>.soak.dirty.wire.test.ts` (and their `declareFile` `file:`); create
`whiskey.soak.dirty`, `dairy.soak.dirty`, `assembly.soak.dirty`,
`storage-and-ice.soak.dirty`, `underwater.soak.dirty` carrying the moved
steps **with their own setup** (sessions, helpers, the dirty reason),
and cut those steps from the blocking files; edit `cleanliness` (`'24
hours'`), `whiskey` (`'1 day'` + bound), `taps` (`'1 day'` + bounds;
delete the retry jump), `rubber` (`'24 hours'` ×2). Each moved file's
header says which blocking file it was split from and why (the span).

Verification the build owes (not a full dirty run — hours): (a) a static
census — `grep -n "advanceWorldClock\|advance(" packages/wire/tests/*.wire.test.ts`
over non-soak files, every literal ≤ 1 day, every helper's loop bounded
to ≤ 1 day in total; (b) `pnpm wire:clean` green on the branch (drive
step 11); (c) three targeted single-file runs against the build world,
each `WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C packages/wire wire <file>`:
`rubber.dirty` (the `'24 hours'` set — D10's flagged check),
`assembly.dirty` (the cooper's stave restock without the 40-day sweep),
`cleanliness.dirty` (the byre at a day). A finding on any of these moves
the step to its soak file in the same wave; it never chunks. (d) `tsc
--noEmit` over the wire package, since cut helpers may leave unused
imports.

Acceptance: the census table in this plan is updated with the verified
outcome per file (it becomes the MR's census section); `pnpm wire:clean`
green; `lint:family` green.

Commit: `wire(census): the 25 clock-jumping files — span steps to .soak., the rest within a day`.

### W3 — `tools/lib/suite-lock.sh`, `tools/suite`, `tools/soak`

Goal: the runner. Implements D2, D6–D9, D11–D13.

Files: `tools/lib/suite-lock.sh` (new), `tools/suite` (source it; delete
the inline lock/reserve), `tools/soak` (new, `#!/bin/sh`, `set -u`, the
header in `tools/suite`'s voice: why it exists, the three bounds it
inherits, the flags, the env table), root `.gitignore` (+`.soak/`).

Acceptance: `sh -n` both scripts; `tools/suite --help` unchanged;
`tools/suite --only wire --no-wait` still takes and drops the lock (watch
`$ROOT/.suite.lock` appear and go); `tools/soak --help` prints the env
table; drive steps 4–7 (below) pass with `SOAK_STATE`, `SOAK_REF=HEAD`,
`SOAK_RUN_CMD` staged per D8. Step 6 files **one** real issue, comments
once on the re-run, and the build closes it with `glab issue close`.

Commit: `tools(soak): the runner — lock and reserve shared with tools/suite, headroom-gated, files soak issues`.

### W4 — `eval`: the surface, the timeout, the cap, the net

Goal: `eval` binds every self-decorating Api, cannot run past its
budget, cannot flood the socket, and no eval — however wrong — ends
the process. Implements D15–D20 and the stub half of D25.

Files: `packages/server/src/mud/api/security.ts` (`#apiClasses`,
`decoratedApiClasses()`, `assertNotFromEval(op, pointer)`);
`packages/server/src/mud/platform/idea/EvalScript.ts` (delete
`SANDBOX_NAMES`; the facade builder + `observed` + `EvalRun`; the async
wrapper; `run(receiver, {timeoutMs})` with the race; the header's
`WorldClockApi` paragraph rewritten per D15);
`packages/server/src/mud/api/script.ts` + `platform/idea/api/
ScriptLogic.ts` (`runSandboxed(compiled, sandbox, {timeoutMs})`:
`microtaskMode: 'afterEvaluate'`, `timeout`);
`packages/server/src/mud/platform/idea/cmd/author/EvalController.ts`
(`eval.timeoutMs` read, `OUTPUT_CAP_CHARS`, late-error rendering,
`MudlogApi.warn('sandbox.eval.late')`);
`packages/server/src/mud/lib/shell/Author.ts` (`eval.timeoutMs`
description made true, default 5000; `eval.maxDepth` removed);
`packages/server/src/mud/api/worldclock.ts` (`advance`'s guidance leads
with `testharness clock advance <dur>`);
`packages/server/src/mud/platform/idea/WorldClockRegistry.ts`
(`assertNotFromEval('advance', 'testharness clock advance <dur>')` beside
`assertNotQuarantined`);
**new** `packages/server/scripts/check-eval-surface.ts` + the
`lint:eval-surface` script line in `packages/server/package.json`.
Tests: `platform/__tests__/EvalScript.test.ts` (+ the D15 set-equality
test over `import.meta.glob('../../api/*.ts')`; `@TestOnly` members
bind as stubs whose message matches `/testharness clock advance/`; the facade
is frozen and `StuffApi` binds `singletonSync` as today; `this` survives
binding — a call through the facade that touches a `#`-static works;
the D20 reproduce-then-pin test with the `unhandledRejection` spy, both
body shapes; a sync infinite loop rejects with `/timed out/` within
`timeoutMs + 500` ms; `while (true) await null` likewise; an awaited
tail that outlives the budget rejects with the "not cancelled" message
and the late result lands in `EvalRun.lateErrors` or is logged); a new
`cmd/author/__tests__/EvalController.test.ts` (a 1 MB result is cut at
the cap with the tail; a late error renders on the result line);
`api/__tests__/security.assertNotFromEval.test.ts` (fires under an
`EvalScript.run` frame, before and after an `await`; silent outside
one, including under a bare `runScoped` root with no eval);
`scripts/__tests__/check-eval-surface.test.ts` if the sibling lints have
one (match the `check-object-verbs` test shape; else the script's own
`--lint` run is the proof).

Acceptance: `test:near` green; `lint:family` green with
`lint:eval-surface` listed by `--list` and its ceiling printed; a wire
attach session against the build world: `eval 1 + 1` → `2`;
`eval Object.keys(this).length` works through the receiver proxy;
`eval while(true){}` → `error: eval: timed out after 5000 ms
(eval.timeoutMs)` and the next command answers; `eval
WorldClockApi.advance('1 day')` → the stub message naming `testharness clock
advance`; `eval --parcel /world/terminus StuffApi.clone('/trade/sugar/
thing/pan')` (the dairy drive's crash shape, as a statement) → the
result line carries `late: StuffApi.clone — …` or the value, and the
server is up.

Commit: `eval(sandbox): bind every self-decorating Api; a real timeout, an output cap, and no eval-born rejection left unhandled`.

### W5 — test login grants title

Goal: a drive's character can stage inside any parcel it names.
Implements D21.

Files: `packages/server/src/services/auth/TestAuthRoutes.ts` (`parcels`
in the body, 400 on a non-string-array), `packages/server/src/backend/
TestHooks.ts` (`authenticate(…, parcels)`, `provisionCharacter(…,
parcels)`, `#grantParcels(avatar, playerId, parcels)`),
`packages/wire/src/harness/session.ts` (`Session.open(handle, {parcels})`
passes it; the `SessionOptions` type).
Tests: `src/backend/__tests__/TestHooks.parcels.test.ts` (a parcel the
wizard's groups already hold → `kept`, no event; a `player`-held parcel
→ `granted`, `ParcelApi.ownerOf` now the identity path,
`AccessApi.heldExtents` includes it, a `transfer` event appended; a
non-parcel path → the login throws naming the covering parcel; second
login → `kept`); `TestAuthRoutes.test.ts` (+ `parcels: 'x'` → 400;
`parcels: ['/home/other']` → 200 and the character holds it).

Acceptance: `test:near` green; `lint:family` green; against the build
world, `Session.open('runner', {wizard: true, parcels: ['/world/
terminus/mayfield-row/seznick-house']})` (a `mayfield-holdings` parcel
— held already through the group, so `kept`) and a scratch
player-titled parcel (subdivide one in the drive, or transfer one to a
second test character first) → `eval --parcel <it> 1` runs; the same
`eval --parcel` from a character without the grant → `you hold no
authority over <it>`.

Commit: `test-login(parcels): a test runner is granted title to the parcels it names`.

### W6 — the `testharness` command and the weather pin

Goal: `testharness clock …` and `testharness weather …` exist in test worlds only,
share `TestHarnessApi` with the harness, and `/auth/test-weather` is the
harness's door to the pin. Implements D22 (weather half), D23, D24,
and the guard half of D25.

⭐ **The grammar (owner, 2026-10-30): subcommands and options, never phrases; not NL.**
The name is `testharness` / `TestHarnessApi` — *test*, *testing* and *assessment* belong to the
educational institutions.

```
testharness clock                         read: game time now, day, hour, season
testharness clock advance <dur>           dur = 30m | 2h | 1d — one token, ≤ 1d (over → the soak refusal)
testharness weather                       read: the pin (if any) and the weather here
testharness weather pin <kind> [--at <locality>]    kind = the six weather types; default: the locality you stand in
testharness weather unpin [--at <locality>]
```

Single-token durations map onto the clock's own parser (D3) so both doors agree on a day; no
`--soak` option on the command (soak-mode jumps are the wire harness's alone); a bare subcommand
reads, so state can be checked before and after.

Files: `packages/server/src/mud/api/test-harness.ts` + `TestHarnessLogic.ts`
(`pinWeather`, `unpinWeather`); `packages/server/src/mud/platform/idea/
Locality.ts` + `lib/biome/Atmospheric.ts` (`assertNotFromEval
('setWeatherPin', 'testharness weather pin <kind>')` in the setters);
`lib/command/command.schema.json` + `lib/command/CommandDefinition.ts`
(`testOnly`); `platform/idea/api/CommandLogic.ts` (`admitsView`, the
`withheld` count + boot line); **new** `lib/command/validators/
requiresTestWorld.ts`; **new** `platform/idea/cmd/system/
TestHarnessController.ts`; **new** `packages/content/platform/content/platform/
cmd/system/testharness.yaml` + `…/idea/cmd/system/TestHarnessController.yaml`;
`backend/TestHooks.ts` (`pinWeather`/`unpinWeather` forwards with the
scope → Locality resolve); `services/auth/TestAuthRoutes.ts`
(`/auth/test-weather`; the mount banner names three routes);
`packages/wire/src/harness/world.ts` + `index.ts` (`pinWeather`,
`unpinWeather`).
Tests: `api/__tests__/test-harness.test.ts` (+ pin on a Locality fixture sets
the pin and `WeatherApi.resolveWeatherFor` of a scope under it reads
the type; unpin clears; a non-Locality path refuses naming the
covering Locality; a bad kind refuses naming the six; the `@TestOnly`
coverage test now sees four); `platform/idea/api/__tests__/
CommandLogic.store.test.ts` (+ a `testOnly: true` view is withheld
when `isTestEnvironment()` is false — stub the env — and admitted when
true; `reload` honors the same gate); `lib/command/validators/
__tests__/requiresTestWorld.test.ts`; `platform/idea/cmd/system/
__tests__/TestHarnessController.test.ts` (`clock` prints; `clock advance 2h` moves; `clock advance '3 days'` → `controller-rejected` with
the soak message; `weather pin rain` pins the giver's Locality;
`weather pin sideways` refuses; `weather unpin`); `TestAuthRoutes.
test.ts` (+ `test-weather` pin/unpin/400); `security.assertNotFromEval.
test.ts` (+ `setWeatherPin` from an eval frame throws the pointer; the
`TemplateApplier` path outside an eval still sets it — clone a Locality
fixture with `weatherPin:` in its data).

Acceptance: `test:near` green; `lint:family` green (`lint:test-seams` at
four marks, `lint:controller-rows` sees the row, `lint:gates` green);
against the build world (a test world): `testharness clock` prints; `test
clock advance 2 hours` moves; `testharness clock advance 3d` is refused
with the soak message; `testharness weather pin rain` → `analyze weather`
reports rain, `testharness weather unpin` releases it; `eval WorldClockApi.
advance('1 hour')` → the stub naming `testharness clock`; `eval (await
MqlApi.resolveOne('…locality…')).setWeatherPin({type:'snow',mode:
'frozen'})` → the guard naming `testharness weather pin`. Then **a dev-mode
boot of the same database** (`pnpm dev:server`, no `SAXONBERG_TEST_
WORLD`) on a scratch port: `testharness clock` → the dispatcher's unknown-verb
answer, `help test` finds nothing, and the boot line says one test-only
view was withheld. Tear it down by PID.

Commit: `test(verb): the test command — clock and weather, test worlds only, one implementation with the harness routes`.

### W7 — docs

Goal: a fresh reader finds the convention, the command, the refusal, the
result, the runner, the staging tools and the `testharness` verb where they
would look.

Files: `docs/testing.md` (a `## The soak lane` section: the file
convention, `wire:soak`, the refusal's message, `result.json`'s schema,
`tools/soak`'s flags and env, the quiet-hours rule, the state file;
update the "25 wire files use it today" sentence in the wire section;
⭐ rewrite § *three mint shapes* — the `eval --parcel` row no longer
takes the server down — and close § *Open: test seams a drive would
want*'s weather item with `pinWeather`; a `### Staging` subsection:
`Session.open({parcels})`, `pinWeather`, the `testharness` verb, and the
`skip-sold` consequence of a transferred title);
`docs/subsystems/shell-author.md` (the sandbox paragraph: every
self-decorating Api, the facade, `@TestOnly` stubs; `eval.timeoutMs`
real at 5000, `eval.maxDepth` retired; the output cap; the late-error
line; the `isolated-vm` deferral restated as "the awaited tail cannot
be cancelled"); `docs/subsystems/call-security.md` (§ Test Seams:
`decoratedApiClasses`, `assertNotFromEval`, and that the eval sandbox
now binds by the registry — the sentence *"the eval sandbox binds Api
classes and nothing else"* at `security.ts` l.676 stays true);
`docs/subsystems/weather.md` (the runtime pin seam: `TestHarnessApi.
pinWeather`, Locality-tier, `/auth/test-weather`; strike the l.692
"deferred" item); `docs/subsystems/command-spec.md` (`testOnly: true`
and the `withheld` count); `docs/subsystems/access.md` or `parcel.md`
(one paragraph: a test runner's title is a transfer, and what the pack
sees afterward); `.claude/skills/soak/SKILL.md` (drop the "until the
harness build lands" paragraph; name `.soak/state`, `.soak/results/`,
`tools/soak --watch` in the window's second pane, and what an issue
carries); `docs/slates/builds/soak-lane-slate.md` (§ 3a *Owed* →
shipped, pointing at testing.md; the stale `advanceLiving` claim in the
header struck); this plan's drive record. ⚠ `workflow.md`, `CLAUDE.md`,
`roadmap.md` are swept, not raced — leave their index lines to
`/finalize` (CLAUDE.md's controller-category list gains `testharness` under
`system` at the sweep).

Commit: `docs(soak): the lane's harness, runner, result and staging tools, documented`.

Then: the blocking drive (below), the drive record appended here, the
MR opened READY naming `canary.soak.wire.test.ts` as the soak drive and
carrying the D10 table as its census section.

## Reachability wiring

Infra has the same failure class as a verb nothing affords: each link
fails closed and silent.

| link | wired by | fails as |
|---|---|---|
| a `.soak.` file is excluded from `wire`/`wire:clean`/`wire:dirty` | `vitest.config.ts` `exclude: '**/*.soak.*'` (W0) | a soak file runs in CI and hits the refusal there |
| `wire:soak` runs only soak files, and a named subset | the env-switched `include` + vitest's positional filter (W0) | `pnpm wire:soak` runs nothing, or everything |
| soak mode reaches the server | `WIRE_SOAK=1` in the script → inherited by the worker → `advanceWorldClock` sends `soak: true` → route passes it → `TestHooks` honors it (W0 + W1) | the canary is refused under `wire:soak` — drive step 3 catches it |
| the refusal is before the jump | the cap check precedes `runRoot` in `advanceClock` (W1) | a refused jump already moved the clock — the unit test asserts `clockNow()` unchanged |
| the result exists for the runner | the reporter is registered in `reporters: [...]`, writes to the path `tools/soak` reads (`packages/wire/.wire/result.json`) (W0, W3) | the runner files "no result" issues for every merge — D13's lane-broken case |
| the canary runs when only tooling changed | D9's tooling-path list (W3) | the lane never re-proves itself |
| an issue reaches GitLab | `glab` authenticated on the workstation; `SOAK_GLAB` override (W3) | a failure is logged in `.soak/log` and nobody wakes — the runner's stdout says `glab failed` and the state file still advances |
| the runner runs at all | the `soak` window's second pane runs `tools/soak --watch` (W7 documents; the owner starts it) | nothing soaks — the triage skill says "check the lane's state" |

The staging tools' links — the `testharness` verb's five, the eval surface, the
grant and the pin:

| link | wired by | fails as |
|---|---|---|
| **verb** — `testharness` parses | `content/platform/cmd/system/testharness.yaml` installed as a `command-view` document by the platform pack (W6) | unknown verb everywhere, including test worlds — step 10's first assertion |
| **affordance** — the verb reaches the giver | a platform view in the `system` category is afforded like `ping`/`trace` (no `commandContributions` needed; the view is global) | n/a — but a view with a typo'd `verbs:` is a silent unknown verb |
| **data** — the controller resolves | the row `content/platform/idea/cmd/system/TestHarnessController.yaml` (W6); `lint:controller-rows` | `controller-error` on every dispatch, forever, invisible to every unit test |
| **boot** — the view is admitted | `CommandLogic.admitsView` reads `SecurityApi.isTestEnvironment()`, which reads `SAXONBERG_TEST_WORLD=1`, which `boot.ts` l.78 sets (W6) | in a test world the verb is unknown (the env var not set — a dev server with only `AUTH_MODE=test` is NOT a test world, by design); in a dev world the verb exists — step 10's dev-boot assertion |
| **arg gate** — a bad subcommand/arg fails in words | `subcommands:` with typed string args; `op`/`kind` validated in the controller against `advance` / `pin|unpin` / `WEATHER_TYPES` (W6) | a greedy duration with no `op` silently reads as the op (`testharness clock 3 days` → "unknown op '3'") — the controller's message names the forms |
| the harness reaches the pin | `/auth/test-weather` mounted beside `/auth/test-clock` (W6) → `TestHooks.pinWeather` → `TestHarnessApi.pinWeather` | `pinWeather()` in a drive throws the route's 404 text — loud |
| both doors meet the cap | the cap is inside `TestHarnessLogic.advanceClock`, below both `TestHooks` and `TestHarnessController` (W1) — nothing above it can jump | a door that bypassed `TestHarnessApi` (calling `WorldClockApi.advance` itself) would skip it; `test-harness.test.ts` asserts the cap at the Api and `TestHarnessController.test.ts` at the verb |
| `eval` sees an Api | the class's module tail `decorateApiClass` (every Api has one) → `#apiClasses` → the facade (W4) | an Api without a tail is invisible to eval AND to `@TestOnly` withholding — `lint:test-seams` catches the second, the D15 set-equality test the first |
| `eval` refuses a seam by name | `@TestOnly` recorded at the tail → `getTestOnlyMembers` → the stub (W4) | a seam without the mark is live in eval in a test world — `test-harness.test.ts`'s coverage assertion |
| a refusal returns | `observed` on every facade function and receiver member (W4) | a dropped promise ends the process (`Server.ts` l.326) — the D20 regression test |
| the title grant takes | `ParcelApi.transfer` re-indexes the owner index (`ParcelRegistry.ts` l.370) → `heldExtents` → `holdsAuthority` (W5) | `heldExtents` would still answer the old holder — `TestHooks.parcels.test.ts` asserts through `heldExtents`, not the record |
| the pin is felt, not just reported | `WeatherApi.onBoundary()` after the set (W6) restamps every connected viewer's room | thermal keeps the pre-pin ambient until the next segment boundary (hours) — `test-harness.test.ts` asserts `resolveWeatherFor` AND the drive reads `analyze weather` + a thermometer |

## Acceptance-criteria coverage

| AC | wave | proof |
|---|---|---|
| No ordinary wire run executes a soak file | W0 | drive 1 |
| A blocking drive cannot jump past a game day; the failure tells its author what to do | W1 | drive 2; unit tests |
| After a merge that adds or changes a soak file, the lane soaks it unattended — never while memory is short or the lock is held, and no later than the next night | W3 (D7, D9, D12) | drive 4, 5, 7; the night rule is by construction — see Risks |
| A soak failure is a `soak` issue with enough to triage; a repeat comments | W3 (D13) | drive 6 |
| The canary is green on master after this merges, soaked by the lane | W0, W3 | the soak drive (after merge) |
| Master's wire suite is green when this merges | W2 | drive 11 (`wire:clean`) + the static census; CI's `wire` job on the MR |
| A test runner can stage, with `eval` in a parcel it holds, anything a consumer Api can do; no `eval` — however wrong — stops the server | W4 (D15–D20), W5 (D21) | drive 8, 9; the D15 set-equality test; the D20 regression test; the timeout and cap tests |
| Time and weather move only through the `testharness` command (or the harness's route), only in test worlds, and the soak rule is enforced in one place for both | W1 (D3, D22), W4 (D25 stubs), W6 (D23, D24, D25 guard) | drive 10 (both doors, the dev-boot unknown-verb check, the eval pointers); `test-harness.test.ts` + `TestHarnessController.test.ts` both hitting the one cap |

Nothing in the requirements is unmapped. ⚠ One reading the plan does
NOT make: "only through the `testharness` command" is read as *the only
in-world door* — `WorldClockApi.advance` stays `@TestOnly` and live in
a test world for the harness route and for unit tests, which is the
requirement's own "or the harness's route".

## Test & gate strategy

- **Unit (server):** the refusal (both sides of the line, soak on/off,
  clock unmoved on refusal, **at the Api and at the verb** — one cap,
  two doors), the route's `soak` pass-through, the parse surface; the
  eval surface's set-equality test, the `@TestOnly` stub, the timeout
  (sync, microtask, awaited tail), the cap, the D20 reproduce-then-pin
  test with the `unhandledRejection` spy; the parcel grant through
  `heldExtents`; the pin through `resolveWeatherFor`; the `testOnly`
  view withheld/admitted; `assertNotFromEval` before and after an
  `await`. `pnpm test:near` after W1, W4, W5, W6; `lint:family` after
  every wave.
- **Unit (wire package):** none today and none added — the reporter is
  proved by the drive's `result.json` assertions. (`packages/wire` has no
  unit runner; adding one is out of scope.)
- **The full suite** runs at exactly two moments: before the MR opens and
  at `/finalize`. Use `tools/suite`.
- **The blocking drive** — every step from the requirements, with pace:

| # | pace | step | how |
|---|---|---|---|
| 1 | instant | `pnpm wire` on the branch runs no `.soak.` file; the canary is listed as excluded | `vitest list` + the teardown's excluded line (an attach run against the build world on 2019 is fine for the listing; the full run is not needed for this step) |
| 2 | short | a non-soak file that jumps two game days fails with the rule and the `.soak.` fix; twenty hours passes | a scratch `tests/zz-refusal.wire.test.ts` (not committed) run with `WIRE_BOOT=1 WIRE_PORT=2019`; assert the thrown message contains `span step` and `.soak.`; then `'20 hours'` passes |
| 3 | short | `pnpm wire:soak canary` runs only the canary in soak mode, passes, and `result.json` records it | `WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C packages/wire wire:soak canary`; `jq` the result: one file, `mode: soak`, test `pass` |
| 4 | instant | `tools/soak --dry-run` lists merges after the state file's commit and the soak files each would run, filing nothing | `SOAK_STATE=/tmp/soak-state SOAK_REF=HEAD`, state seeded at the merge base `9550937c6`; expect the W0 and W2 commits listed with their soak files |
| 5 | staged | with the threshold above free memory, `--once` does not boot and says it waits for memory; with a fake lock holder, it says it waits for the lock | `SOAK_WORLD_MB=999999 SOAK_POLL_S=1 timeout 5 tools/soak --once` → "waiting for memory"; plant the fake lock per D8 → "waiting for the lock (fake, pid N)"; remove it |
| 6 | staged | with a soak file forced to fail, `--once` files ONE `soak` issue carrying file, merge, MR, failing step and output; run again → it comments; close it | `SOAK_RUN_CMD` = a stub writing a canned failing `result.json` for the canary; `SOAK_WORKTREE=$ROOT/soak` (the only touch of the soak worktree and port 2020; the stub boots nothing); verify with `glab issue view`; re-run with the state reset → `glab issue view` shows one note; `glab issue close` |
| 7 | instant | after a pass, the state file has advanced; `--dry-run` lists nothing new | stub exits 0 with a passing result; `cat $SOAK_STATE` = HEAD; `--dry-run` prints "nothing to soak" |
| 8 | staged | as a test runner granted title to `/world/terminus`: `eval --parcel /world/terminus` calls a consumer Api that was out of reach before and the effect is real; the same call in an unheld parcel is refused with a message; the server is up | `Session.open('runner', {wizard: true, parcels: ['/world/terminus']})` (→ `kept`: the group holds it — so the drive ALSO stages one unheld parcel: `subdivide` a scratch lot under `/world/terminus` as the founder and `transfer` it to a second test character, then grant it to the runner with `parcels:` on a re-login → `granted`); in each: `eval --parcel <p> ConditionApi.inflict(await MqlApi.resolveOne('<an NPC there>'), {...})` → the NPC's `look` shows the condition (ConditionApi was unbindable before W4); a third character with no grant → `you hold no authority over <p>`; `ping` answers after each |
| 9 | short | `eval` with an infinite loop returns a timeout error; a huge result is cut at the cap; a clone refused by the boundary returns an error; the server is up after each | `eval while(true){}` → `/timed out after/`; `eval 'x'.repeat(1_000_000)` → the line ends `… [cut at 16,384 of … chars — eval output cap]`; in the runner's own `/home` circle: `eval StuffApi.clone('/trade/sugar/thing/pan')` (the dairy crash shape — a statement, no `return`) → `late: StuffApi.clone — sandbox boundary denied …` on the result line or in the mudlog; `ping` answers after each; the server log has no `Unhandled rejection` line |
| 10 | short | `testharness clock advance 2h` moves the clock; `testharness clock advance 3d` is refused with the soak rule's message; `testharness weather pin rain` holds rain until `testharness weather unpin`; in a world that is not a test world, `testharness` is an unknown verb; `eval` touching the clock is refused, naming `testharness clock` | wizard session on the build world: `testharness clock` → read; `testharness clock advance 2h` → `before → after`, `worldClockNow()` agrees; `testharness clock advance 3d` → `/span step/` and `/\.soak\./`; `testharness weather pin rain` → `analyze weather` says rain and a thermometer in the room moved; `testharness weather unpin` → the procgen type returns; `eval WorldClockApi.advance('1 day')` → `/test clock advance/`; `eval (await MqlApi.resolveOne('…'))` on the Locality `.setWeatherPin(...)` → `/test weather pin/`; then the dev-mode boot of W6's acceptance on a scratch port (`PORT=2018 AUTH_MODE=test npx tsx src/preload.js` — ⚠ deliberately without `SAXONBERG_TEST_WORLD`, and never the npm script, which reaps siblings) → `testharness clock` is the unknown-verb answer; kill it by PID |
| 11 | instant | the census result is in the MR — each of the 25 moved to soak or shown within a day — and `pnpm wire:clean` is green on the branch | D10's table + the static census; `WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C packages/wire wire:clean` |

Steps 8–10 are run through the wire harness as a scratch
`tests/zz-staging.wire.test.ts` (not committed; the `zz-refusal` of
step 2 can be the same file) so the assertions are code, not eyes —
and then **once more in a browser** for step 10's `testharness` command
(`probe-world-fast-loop`: a standing world, `.wire/server.log` grepped
for `[dispatch]`), because a verb that answers over the wire and
renders nothing on the card has happened before.

Afterwards: the soak worktree is left `git checkout --detach
origin/master`, clean; the build's own worlds only ever on 2019 /
`saxonberg_build4` (the step-10 dev boot on 2018 is the one exception,
and it is killed by PID before the drive record is written).

- **The soak drive** — one step, `span`: `canary.soak.wire.test.ts`, run
  by the lane after this merges. Its staged twin is drive step 3 (the
  canary under `wire:soak` on the build world, which is the same file
  with the same jump — the lane adds only "unattended, on master, from
  the runner").

## Risks & opens

1. **The dirty conversions are judged, not run.** The full dirty wire
   run is hours; the build runs three targeted files (W2c) and
   `wire:clean`. A blocking remainder with a hidden season dependence
   (river-e's ferry if kept, dairy's wheel without ripeness) would show
   on master's next full `pnpm wire` or in CI. Mitigated by D10 taking
   whole files to soak wherever open water is the premise.
2. **`rubber` at `'24 hours'`** sits exactly on the set boundary;
   W2c verifies, and the fallback is soak, not a 26-hour chunk.
3. **The headroom gate may never pass by day** (2.9 GB available at plan
   time). The night rule drops the reserve, not the world; if the build
   worlds hold their memory overnight, the promise "by the end of the
   next night" needs the owner to stop idle dev servers or accept a
   lower `SOAK_WORLD_MB`. ⚠ The owner's eye.
4. **Issue dedupe is by title search** (`--search "<file>" --in title`);
   a file name that is a substring of another's (`river-a` in nothing
   today) would be confused. Acceptable; the title includes the full
   filename.
5. ~~`vitest list`~~ — verified: 2.1.9 has `vitest list --filesOnly`.
6. **Reporter vs teardown order.** `onFinished` precedes
   `globalSetup` teardown in vitest 2.1; if it ever does not, the result
   loses `dirtyReason`/`proseReads` annotations, never the tests —
   step 3 asserts the tests.
7. **`taps`' deleted retry** turns a silent fallback into a visible
   failure if the sap window is ever shut when the file runs. That is
   the rule arriving; a taps soak twin is the answer then.
8. **The soak worktree's `pnpm install`** needs the store populated for
   `--prefer-offline`; a merge adding a dependency pulls from the
   network, which the workstation has.
9. **Nothing starts `tools/soak --watch`.** The owner runs it in the
   `soak` window's second pane (W7 documents it). A later `saxo` edit
   could launch it; not this build.
10. **`eval.timeoutMs` default 5000, not the documented 1000** (D18).
    The 1000 was never enforced; a staging eval that awaits a clone
    with record reads needs more than a second on a loaded box. ⚠ The
    owner's eye — if 1000 is the number, the drive's clone step will
    show whether it fits.
11. **`eval.maxDepth` is deleted** (D18) — a declared key nothing can
    honor under `node:vm`. ⚠ The owner's eye: it is a settings-schema
    key deletion, visible to `settings get`.
12. **A transferred title is a sold parcel to its pack** (D21): the
    next reconcile records `conflict` and skips the pack's rows under
    it. In a per-run test world that is invisible; in a drive that
    restarts mid-run after granting a pack-held parcel it is not — the
    rows already installed stay, new ones from a merge would not land
    under it. The grant is per login and the drive names only what it
    needs. ⚠ The owner's eye, because "give the runner title" has this
    one shadow and the alternative (a test-mode branch in `AccessApi`)
    is the thing `TestHooks` refuses on principle.
13. **The awaited tail cannot be cancelled** (D18). `vm` kills a
    synchronous or microtask loop; a body awaiting a host promise that
    never settles returns a timeout error while the work continues.
    Honest in the message; the real fix is `isolated-vm`, the standing
    deferral.
14. **The facade freezes a snapshot of each Api's statics.** A static
    added by hot-reload to an Api would not appear — Apis are non-HMR
    by rule, so this is theoretical; noted so nobody "fixes" the cache.
15. **`help`/`affordances` in a dev world never show `testharness`**, by
    design — but a wizard in a dev world who types `testharness clock` gets
    the plain unknown-verb line, not "this is a test-world verb". The
    `withheld` boot line is the only tell. Accepted: a dev world is a
    world somebody plays in.
16. **Drive step 10's dev boot shares the build's database** for one
    boot on a scratch port, without `reset:db` — it reads the same
    `command-view` store (that is the point) and must not be booted
    while the build world is up on 2019 with a drive in flight (two
    servers on one DB). Sequence it after step 9.

## Deferred seams

- **Logging drive bodies out across a soak jump** — the slate's § 4; the
  moved files keep their own feeding/parking. Attach point: the soak
  files' own helpers.
- **Reconcile instead of replay** — slate § 5; nothing here presumes it.
- **Session-pace body needs** — `pace-slate`.
- **Notifications on a soak failure** — none; the issue is the record.
- **Launching the watcher from `saxo`** — a one-line addition to the
  window setup when the owner wants it.
- **A wire-package unit runner** (for the reporter) — if a second runner
  module needs one.
- **`isolated-vm`** — the standing sandbox deferral; what would make
  the awaited tail cancellable (D18) and the moat a real boundary.
- **The sandbox's `console`** — still the server's stdout; routing it
  to the giver as `shell.result` lines (capped like the result) is a
  one-file change in `buildSandbox` when a drive wants it.
- **`testharness weather pin --at <place>`** — the command pins where you
  stand; the route pins any scope. If a browser drive needs a distant
  pin, add the option (type `object`, scope `[reachable, locations]`)
  to the view and resolve its Locality the same way.
- **Further `testharness` subcommands** — the requirement's "added here as
  staging twins need them". Each is one `TestHarnessApi` static
  (`@TestOnly`, guidance leading with its subcommand), one stanza in
  the view, one branch in the controller; the coverage test in
  `test-harness.test.ts` refuses an unmarked one.
- **`EvalController.holdsAuthority` → `AccessApi.heldExtents`** — the
  controller carries its own owner-kind walk; `heldExtents` is the
  shipped predicate and now the one `TestHooks` uses. Folding the walk
  into one call is a cleanup, not this build.
- **The `lint:eval-surface` ceiling → 0** — the ratchet's second step:
  gate or mark the un-prefixed `@internal` statics it lists.

## Critical files

Read first, in this order:

- `/home/bobalu/play/saxonberg/build-4/docs/requirements/soak-harness-requirements.md`
- `/home/bobalu/play/saxonberg/build-4/docs/slates/builds/soak-lane-slate.md` (§ 2–3a)
- `/home/bobalu/play/saxonberg/build-4/packages/wire/vitest.config.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/src/runner/global-setup.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/src/runner/boot.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/src/harness/registry.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/src/harness/world.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/backend/TestHooks.ts` (l.230–320)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/services/auth/TestAuthRoutes.ts` (l.105–150)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/WorldClockRegistry.ts` (l.455–480, l.730–745)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/api/worldclock.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/backend/__tests__/TestHooks.clock.test.ts`
- `/home/bobalu/play/saxonberg/build-4/tools/suite`
- `/home/bobalu/play/saxonberg/build-4/.claude/skills/soak/SKILL.md`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/tests/platform-smoke.wire.test.ts` (the canary's shape)
- the census files named in D10

For the staging scope (W4–W6), in this order:

- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/EvalScript.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/cmd/author/EvalController.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/api/script.ts` (l.170–225) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/api/ScriptLogic.ts` (l.550–575)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/api/security.ts` (l.520–620 the wrapping; l.614–875 `@TestOnly` + `assertTestOnly`; l.1425–1445 `assertFieldMutation`)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/lib/security/decorators.ts` (l.215–312 `@TestOnly`)
- `/home/bobalu/play/saxonberg/build-4/docs/subsystems/call-security.md` (§ Test Seams, § Why Some Api Files Don't Self-Decorate, § ExecutionContextApi)
- `/home/bobalu/play/saxonberg/build-4/docs/subsystems/sandbox.md` (§ the jurisdiction host, § Decision K)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/services/Server.ts` (l.300–331)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/__tests__/EvalScript.test.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/api/parcel.ts` (l.296–330) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/ParcelRegistry.ts` (l.349–374)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/AccessRegistry.ts` (l.136–150, l.233–249, l.440–470)
- `/home/bobalu/play/saxonberg/build-4/docs/subsystems/parcel.md` (§ grant) + `/home/bobalu/play/saxonberg/build-4/docs/subsystems/access.md` (§ Ownership: the parcel layer)
- `/home/bobalu/play/saxonberg/build-4/packages/content/terminus/pack.yaml` (l.26–62)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/lib/biome/Atmospheric.ts` (l.1110–1125) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/Locality.ts` (l.150–160, l.530–537)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/api/WeatherLogic.ts` (l.400–420 `resolveWeatherPin`) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/api/weather.ts` (l.410–440 `onBoundary`)
- `/home/bobalu/play/saxonberg/build-4/docs/subsystems/weather.md` (§ The coexistence resolve, l.360–375, l.690–700)
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/api/CommandLogic.ts` (l.600–700) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/lib/command/CommandDefinition.ts` (l.140–270) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/lib/command/command.schema.json`
- `/home/bobalu/play/saxonberg/build-4/packages/content/platform/content/platform/cmd/system/git.yaml` (the subcommand view shape) + `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/platform/idea/cmd/system/GitController.ts`
- `/home/bobalu/play/saxonberg/build-4/packages/server/src/mud/lib/command/validators/requiresWizard.ts`
- `/home/bobalu/play/saxonberg/build-4/docs/subsystems/command-spec.md`
- `/home/bobalu/play/saxonberg/build-4/packages/wire/src/harness/session.ts` (l.218–330) + `/home/bobalu/play/saxonberg/build-4/packages/wire/tests/dairy.dirty.wire.test.ts` (l.260–300, the eval-in-a-drive shape)
- `/home/bobalu/play/saxonberg/build-4/packages/server/scripts/check-object-verbs.ts` (the Api-static parsing to copy for `check-eval-surface`)

## Drive record

*(appended at build time)* — the blocking drive's eleven steps and what
they found; the soak drive's name for the lane:
`packages/wire/tests/canary.soak.wire.test.ts`.
