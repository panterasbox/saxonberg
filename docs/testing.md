# Testing — what the suite costs, and why

The server suite is 964 files / 8937 tests and takes ~15 minutes on a
quiet 8-core machine. This doc exists so the next regression gets
**noticed** rather than absorbed, and so nobody re-runs a 20-minute
suite to rediscover a decision that was already made and measured.

Process lives in [workflow.md](./workflow.md); this is the cost model.

## Re-measuring

```bash
pnpm bench                          # one run, appends a dated row
pnpm bench -- --label foo --runs 3  # three runs, settling between
pnpm bench -- --summary             # the history as a table
pnpm bench -- --only Metabolic      # one file, NOT recorded
```

`packages/server/scripts/bench-suite.ts` runs the suite, parses
vitest's summary, and appends to
[testing-bench.jsonl](./testing-bench.jsonl) — wall clock, per-phase
CPU, file/test counts, the ten slowest files, and the **names** of any
failures. The history is the regression detector; append, never
overwrite.

Two things it does on purpose:

- **It refuses to run on a busy machine.** A dev server or a second
  vitest holding the same cores makes the number meaningless. `--force`
  records anyway but stamps the row `quiet: false`, so a contaminated
  number stays labelled rather than being quietly quoted later.
- **Every row carries its test count.** A lever that makes the suite
  faster by running *less* shows up in the same table as the win. This
  is not theoretical — see *The 49 missing tests* below.

⚠ **Do not touch the tree while a multi-run measurement is going.**
Editing a test file mid-baseline changes what the later runs measure.

## The noise floor

This machine's honest floor is **±6%, with occasional 50% excursions.**

| run | wall | note |
|---|---|---|
| baseline-1 | 1238.6s | |
| baseline-2 | **1804.4s** | no code change from either neighbour |
| baseline-3 | 1165.5s | |

**Nothing under ~10% is attributable to a change.** Run 2 is not a
mystery: the suite is **memory-bound as well as CPU-bound**. Eight
forks at ~700 MB each on a 15 GB box means a second consecutive run
starts with swap already dirty and pays for it. Rows therefore record
free RAM and swap-in-use at start, and multi-run measurements settle
90s between runs.

The same pressure moves the **flake count** — 4 / 13 / 7 failures
across those three identical runs. A failure count is not a signal
unless it survives an isolation run.

## What each lever bought

| lever | before | after | verdict |
|---|---|---|---|
| Scope the framework wiring | 1238.6 / 1165.5s | **891.5 / 885.1s** | **adopted, −25%** |
| `pool: 'threads'` | 1238.6 / 1165.5s | 1183.6 / 1063.0s | rejected, ~7% |
| `isolate: false` | — | — | **declined, not measured** |

### Adopted — the wiring is an import, not a setup file

`BootstrapManager.installFrameworkWiring()` was a global `setupFiles`
entry, so all 964 test files paid for its ~30-deep import graph,
re-evaluated per file because vitest isolates. Measured at 5.79s of the
6.38s it took to run a file that needed none of it.

It is now `src/test-bootstrap.ts`, imported explicitly by the 808 files
that touch the wired runtime:

```ts
import "../../../test-bootstrap";
```

152 files that need none of it stop paying. Setup CPU went from ~3172s
to zero; wall clock fell 25%, and the two after-runs agree within 0.7%
where the baseline pair differed by 6% — less memory pressure means
less variance too.

`pnpm lint:test-bootstrap` (CI-gating) keeps the set honest. It fails
only in the direction where being wrong is cheap — a file that needs
wiring and lacks the import — because a redundant import costs one line
and the bootstrap is once-guarded. The reverse finding stays
**advisory**: the heuristic can prove a file needs wiring, never that
it doesn't. Only the suite can. Its file discovery is checked against
`vitest list` (964 = 964), so no test file is invisible to it.

### Rejected — `pool: 'threads'`, ~7%

Recorded so nobody spends another 20 minutes on it. ~7% is inside the
noise floor, and the mechanism says why it can't be more: **with
`isolate: true`, vitest re-evaluates the module graph per test *file*
whatever the pool.** Threads share nothing that matters here — setup
CPU fell only 6%. They buy process-spawn overhead and nothing else.

It also flaked two sandbox files that three forks runs did not
(`sandbox.wardrobe`, `crossing.escape`). Those are the
security-boundary tests, which is exactly where fork/thread
module-scope semantics diverge. The bar was "faster **and** green".

### Declined — `isolate: false`

The single biggest lever left, and **it stays declined.** It would let
a worker share the module graph across files and reclaim most of what
remains. It is also the one change that would make this suite
untrustworthy.

The codebase has global mutable registries — `StuffApi`'s indexes, the
catalogues — and tests depend on `StuffApi.clearAll()` in teardown for
a clean world. Without isolation every one of those is a cross-file
leak. The precedent is specific: the weather flake fixed in MR !175 was
exactly this failure mode — one test's pending work landing inside
another's assertion window — and it survived months because that class
of bug is so hard to attribute. This suite already flakes 4-13 tests
per run under load; the fix is not to remove the last barrier between
files.

The reasoning is repeated in `vitest.config.ts`, next to the setting
someone will be tempted by.

## The 49 missing tests

The wiring change's first full run came back 25% faster **and 49 tests
short**. Four files had collapsed to zero tests.

Not a wiring problem. Each composes a mixin at module scope whose
module sits in an **import cycle**, and the global setup had been
resolving that cycle incidentally for every file in the suite. They
fail at *collection* — `MobileMixin is not a function` — which is
exactly why nobody knew:

- `src/mud/lib/behavior/__tests__/brains.test.ts`
- `src/mud/lib/behavior/__tests__/combatant.test.ts`
- `src/mud/lib/security/__tests__/FromClassFromMixin.test.ts`
- `src/mud/lib/spatial/__tests__/Mobile.aliases.test.ts`

Each now imports the bootstrap with the reason recorded at the site.
**The cycles themselves are real and are not fixed** — they are latent
in `Mobile`/`Containable`/`Container` and the behavior brains, and a
non-test consumer importing those modules in the wrong order would hit
the same wall. Worth a look on its own terms; it is not a test problem.

A 25% win with 49 tests quietly missing would have looked exactly like
a clean 25% win. That is what the test-count column is for.

## What is left, and why it is left

The top ten files are **63% of remaining test CPU** (2194s of 3475s).
They were investigated, and mostly they are not test problems.

**The root cause is per-call engine cost, not test structure.**
Measured on `Creature`:

| call | cost |
|---|---|
| `getReserve()` through the proxy | 3.66ms |
| `getReserve()` on the raw object | 3.03ms |
| `isAlive()` through the proxy | 0.31ms |
| `isAlive()` on the raw object | ~0ms |

So call-security/proxy dispatch costs ~0.3ms per method call — real,
but **not** the main story. `getReserve` costs ~3ms of its own work
even when no game-time has elapsed. Every slow file in the list is a
simulation-loop test driving thousands of such calls. Making the engine
faster is a real opportunity and an explicit non-goal of this build.

### `Metabolic.cascade` — 153s / 5 tests. Leave it.

37s per test, and it is CPU, not waiting. The chunk size **was**
established as load-bearing, in both directions:

- `reconcileMetabolism` already sub-steps internally at
  `STEP_SEC` = 60s, so the number of integration slices is
  `gameSec / 60` **regardless** of the test's outer chunk. Raising the
  chunk 3000 → 14400 changed the runtime by 0.1% (74.11s → 74.04s).
- It also **broke the test**: gaps beyond
  `MAX_REASONABLE_GAP_SEC` (4 game-hours) hit the far-past absence
  guard and integrate *nothing*, so the body never starved
  (`expected null to be 'starvation'`).

One 60-second slice costs ~24ms. The test must cross a 24-game-hour
starvation threshold, which is 1440 slices minimum — forced by the
model's own integration granularity. It cannot be made faster without
skipping the states it exists to exercise.

### `CombatLogic` — 560s / 72 tests. One test, not seventy-two.

The median test is **851ms**; hooks are 10% of the file. A single test —
*"a party of 1 runs every preset clean (vacant roles inert)"* — is
**148.7s**, 60% of the file. It is a totality test: it runs a complete
fight per formation preset. Cutting it means testing fewer presets,
which is the thing a totality test exists to prevent.

### `scripts/__tests__/combat-gym` — 782s / 28 tests. The biggest, and unlisted.

The single largest file in the suite, ahead of `CombatLogic`. It never
appeared in this build's requirements because `find src` misses it:
`src/` holds 955 test files, the suite runs 964. It is a **balance
regression guard** — it drives real `CombatApi` sessions to assert the
fight stays fair.

That makes it a benchmark shaped like a test, and it is the obvious
candidate for a separate `pnpm test:balance` outside the default run.
**That is a scope decision, not a performance one** — moving it would
cut ~13 minutes of CPU off the default suite by not running it, which
is the trade this build refused to make on its own authority.

### The rest

`Plant` (157s), `GardenBed` (102s), `DormHouseplant` (99s),
`CombatReactive.shadow` (91s), `Metabolic.reconcile` (75s) are all the
same shape: fake-clock simulation loops paying the per-call cost above.
No test-side fix without weakening them.

## The standing flakes

Two tests in `sandbox.guests.test.ts` fail under full-suite load and
**pass in isolation** (verified: 30/30 green in 17.7s). They are
load-sensitive, pre-existing, and not caused by any change here. Under
heavier contention the set widens to `landing.integration`,
`Consumables`, `sandbox.crossing`, `sandbox.wardrobe`,
`crossing.escape` — all sandbox/timing tests.

**Never quote a failure count without an isolation run.** The count
tracks machine load, not code health.

## Adding a test

Nothing to do, unless your test touches the wired runtime — the Stuff
registry, the scheduler, world clock, events, MQL subscriptions,
shadows, the glob ripple. Then it needs:

```ts
import "../../../test-bootstrap";
```

`pnpm lint:test-bootstrap` will tell you, and `--fix` will insert it.
If you get `X is not a function` at collection time with no obvious
cause, you have found another import cycle — the same import fixes it,
and it is worth saying so at the site.
