# Soak harness — implementation plan

Executes [soak-harness-requirements.md](../requirements/soak-harness-requirements.md)
(closed scope, 2026-10-30). **Kind:** infra. **Leads from:** the kernel —
the wire package, the test clock's test-only route, `tools/`. No pack, no
content, no namespace root, no new Stuff class, no mixin.

What lands: the `*.soak.wire.test.ts` convention and `pnpm wire:soak`; a
server-side refusal of any test clock jump past one game day outside soak
mode; a machine-readable result beside the run log; `tools/soak`, the
headroom-gated runner that soaks merges and files `soak` issues; the
canary; and the census of the 25 clock-jumping wire files, each moved to
soak or shown within a day. The build follows its own rule: its blocking
drive has no `span` step, and its soak drive is `canary.soak.wire.test.ts`,
which the MR names.

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

**D3 — Soak mode is a body field, honored by `TestHooks`, parsed by the
clock's own grammar.** The harness sends `{advance, soak: true}` when
`process.env.WIRE_SOAK === '1'`. The route passes `body.soak === true`
through as `{soak}`. `TestHooks.advanceClock(duration, opts?: {soak?:
boolean})` computes `WorldClockApi.durationSeconds(duration)` and, if it
exceeds `TestHooks.BLOCKING_JUMP_CAP_S = 86_400` and `!opts?.soak`,
throws **before** `runRoot`/the jump:

```
TestHooks.advanceClock: a jump of '30 days' (30.0 game days) is a SPAN
step and cannot run in a blocking drive — the line is one game day
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
`24 hours` / `1440 minutes` pass (the cap is `>`). The harness does no
pre-check: one place refuses, the harness relays the message as it
already does.

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

## Host placement

No Stuff class, mixin or persisted field is introduced. The three
additions, and what each claims:

| addition | host | claims |
|---|---|---|
| `durationSeconds(d)` | `WorldClockRegistry` (public, gated `WorldClockApiCallers`) → `WorldClockLogic` → `WorldClockApi` static | the grammar `after()`/`advance()` take is a readable surface; nothing about the clock changes. Not `@TestOnly`. |
| `advanceClock(duration, {soak})` + `BLOCKING_JUMP_CAP_S` | `TestHooks` (backend) | the cap is a TEST-process rule; it lives beside the three existing gates and never in the clock, so no game code can meet it. |
| `soak` field on the test-clock request | the route body | an opt-in only the harness sets; a world someone plays in never sees the route at all. |

The wire package's `ResultReporter` is a runner-side class in
`src/runner/`; nothing in the harness barrel changes shape (soak mode is
read from the env inside `advanceWorldClock`).

## Convention conformance

- **Module categories.** New mudlib surface is one static on an existing
  Api, one method on an existing logic singleton, one made-public method
  on the registry — no new file under `src/mud`. `src/runner/result-
  reporter.ts` is a wire-package runner module beside `boot.ts` and
  `global-setup.ts`. `tools/lib/suite-lock.sh` is shell (D2).
- **Module scope.** `worldclock.ts` keeps its trailing
  `SecurityApi.decorateApiClass`; nothing executable at module scope is
  added. `vitest.config.ts` reads `process.env.WIRE_SOAK` at config
  load — it is not under `src/mud`.
- **Import boundary.** `TestHooks.ts` is `backend/`, already importing
  `WorldClockApi`; the route stays in `services/`. No mudlib file imports
  outside `src/mud`.
- **Privacy.** Backend defaults to `#`: `#assertTestMode` stays; the cap
  is `static readonly` (read by the message and the tests).
- **No `.js` in imports; American English** in every new name and
  message.
- **Lints this build must pass:** `pnpm -C packages/server lint:family`
  in full, and in particular `lint:imports`, `lint:module-scope`,
  `lint:object-verbs` / `lint:lib-statics` (the new static takes a string,
  not a world object), `lint:test-bootstrap` (new server tests import
  `test-bootstrap`), `lint:drive-scripts` (no `scripts/drive-*`), plus
  `pnpm -C packages/wire exec tsc --noEmit` and ESLint over the wire
  package.

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

### W1 — the refusal

Goal: a jump past a game day outside soak mode fails before jumping, in
words that name the rule and the fix. Implements D3.

Files: `packages/server/src/mud/platform/idea/WorldClockRegistry.ts`
(`durationSeconds` public), `…/api/WorldClockLogic.ts` (forward),
`packages/server/src/mud/api/worldclock.ts` (static),
`packages/server/src/backend/TestHooks.ts` (opts, cap, message),
`packages/server/src/services/auth/TestAuthRoutes.ts` (`soak` through).
Tests: `src/backend/__tests__/TestHooks.clock.test.ts` (+ `'2 days'`
rejects matching `/span step/i` and `/\.soak\./`; `'2 days', {soak:
true}` moves; `'20 hours'` and `'1 day'` move; the refusal leaves the
clock where it was — assert `clockNow()` unchanged);
`src/services/auth/__tests__/TestAuthRoutes.test.ts` (+ `{advance: '2
days'}` → 500 with the message; `{advance: '2 days', soak: true}` → 200;
`{advance: '1 day'}` → 200); a registry/Api parse test (`'90 minutes'`
→ 5400, `'1.5 days'` → 129,600, `'next tuesday'` throws the existing
message) beside the registry's existing `__tests__`.

Acceptance: `pnpm -C packages/server test:near` green on the touched
files; `lint:family` green; `WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C
packages/wire wire:soak canary` still passes (soak mode on); the same
canary body run through `pnpm wire` is impossible by W0, so the
blocking-side proof is drive step 2 (a scratch non-soak file, not
committed).

Commit: `clock(test-hooks): refuse a jump past a game day outside soak mode`.

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
step 8); (c) three targeted single-file runs against the build world,
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

### W4 — docs

Goal: a fresh reader finds the convention, the command, the refusal, the
result and the runner where they would look.

Files: `docs/testing.md` (a `## The soak lane` section: the file
convention, `wire:soak`, the refusal's message, `result.json`'s schema,
`tools/soak`'s flags and env, the quiet-hours rule, the state file;
update the "25 wire files use it today" sentence in the wire section);
`.claude/skills/soak/SKILL.md` (drop the "until the harness build lands"
paragraph; name `.soak/state`, `.soak/results/`, `tools/soak --watch` in
the window's second pane, and what an issue carries);
`docs/slates/builds/soak-lane-slate.md` (§ 3a *Owed* → shipped, pointing
at testing.md; the stale `advanceLiving` claim in the header struck);
this plan's drive record. ⚠ `workflow.md`, `CLAUDE.md`, `roadmap.md` are
swept, not raced — leave their index lines to `/finalize`.

Commit: `docs(soak): the lane's harness, runner and result, documented`.

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
| the runner runs at all | the `soak` window's second pane runs `tools/soak --watch` (W4 documents; the owner starts it) | nothing soaks — the triage skill says "check the lane's state" |

## Acceptance-criteria coverage

| AC | wave | proof |
|---|---|---|
| No ordinary wire run executes a soak file | W0 | drive 1 |
| A blocking drive cannot jump past a game day; the failure tells its author what to do | W1 | drive 2; unit tests |
| After a merge that adds or changes a soak file, the lane soaks it unattended — never while memory is short or the lock is held, and no later than the next night | W3 (D7, D9, D12) | drive 4, 5, 7; the night rule is by construction — see Risks |
| A soak failure is a `soak` issue with enough to triage; a repeat comments | W3 (D13) | drive 6 |
| The canary is green on master after this merges, soaked by the lane | W0, W3 | the soak drive (after merge) |
| Master's wire suite is green when this merges | W2 | drive 8 (`wire:clean`) + the static census; CI's `wire` job on the MR |

Nothing in the requirements is unmapped.

## Test & gate strategy

- **Unit (server):** the refusal (both sides of the line, soak on/off,
  clock unmoved on refusal), the route's `soak` pass-through, the parse
  surface. `pnpm test:near` after W1; `lint:family` after every wave.
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
| 8 | instant | the census result is in the MR — each of the 25 moved to soak or shown within a day — and `pnpm wire:clean` is green on the branch | D10's table + the static census; `WIRE_BOOT=1 WIRE_PORT=2019 pnpm -C packages/wire wire:clean` |

Afterwards: the soak worktree is left `git checkout --detach
origin/master`, clean; the build's own worlds only ever on 2019 /
`saxonberg_build4`.

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
   `soak` window's second pane (W4 documents it). A later `saxo` edit
   could launch it; not this build.

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

## Drive record

*(appended at build time)* — the blocking drive's eight steps and what
they found; the soak drive's name for the lane:
`packages/wire/tests/canary.soak.wire.test.ts`.
