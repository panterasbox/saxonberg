# Testing — what the suite costs, and why

There are two server suites:

| | command | size | when |
|---|---|---|---|
| **default** | `pnpm test` | 964 files / 8906 tests, ~15 min | before opening an MR |
| **gym** | `pnpm test:gym` | 2 files / 31 tests, ~6 min | before touching combat / materials |

Both run in CI, as **parallel jobs**. This doc exists so the next
regression gets **noticed** rather than absorbed, and so nobody re-runs
a 15-minute suite to rediscover a decision already made and measured.

Process lives in [workflow.md](./workflow.md); this is the cost model.

## ⭐⭐ A green suite means self-consistent, not working

Wave 6 shipped four defects that the whole suite was green over. Three
share one shape: **a test compared the client's output to the client's
own assumption.**

- A reaction command carried a `;` sigil that the *parser* splits on, so
  reacting from the GUI had never worked. Every test asserted the
  composed string against the string the test expected — never against
  the thing that reads it.
- The inbound WS handler kept a second literal copy of a scope
  vocabulary and dropped the new kind **silently**. The rail rendered its
  honest empty state over data that existed. ⭐ *An honest empty state is
  indistinguishable from a dropped message.*
- Mongo returns an explicit `null` for an omitted optional field; every
  fixture had used `undefined`. The test data was not the shape the
  database holds.

Three checks follow from this, and they are cheap:

1. **Assert a composed command against the parser**, not against a
   literal. If the surface builds a command string, something in the
   suite should hand that string to the thing that executes it.
2. **Derive a shared vocabulary; never list it twice.** When a check is
   a hardcoded list of a type's members, the test to write is *"every
   member the type declares is admitted"*, not *"these four are"*.
3. **Fixture the shape storage yields**, not the shape the declaration
   suggests. An optional field that round-trips through Mongo comes back
   `null`.

None of this replaces driving. It narrows what driving has to catch.

⚠ This sits beside the Wave 4 lesson, and they compose: **a component
test proves rendering, never wiring; a client-side test proves neither
the wire nor the parser.**

## How often to run it

A build cycle was running the full suite three or four times — about an
hour of waiting per build. Only one of those runs needs to be the full
suite:

| moment | question | what to run |
|---|---|---|
| mid-build | "did my change work?" | `pnpm test:near`, or a path: `pnpm -C packages/server test src/mud/lib/combat` |
| before opening the MR | "is everything green?" | **`pnpm test`** — the one full run |
| after review fixes | "did the fixes break anything?" | `pnpm test:near`, then let CI's gate job do the rest |
| pre-merge sweep | "still green?" | **only if the sweep touched code** — a docs-only sweep rides CI |

The post-review and sweep runs are where the duplication is.
`.gitlab-ci.yml` holds validate behind a manual `gate` job precisely so
the full lint/test/build runs once before merge; re-running it locally
for a docs-only change is doing CI's job by hand.

### ⚠⚠ A full run stays valid until SOURCE changes — check, don't re-run

The most common waste is not a second run someone decided to do; it is
a second run nobody thought about, because "am I about to commit?" felt
like reason enough. It is not. **A green full run remains the answer
until a source file changes.**

Before starting `pnpm test`, answer one question mechanically:

```bash
# Has anything but docs changed since the last full run?
git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'
```

(`packages/content/` is excluded too: a content pack is data the
installer reconciles, not source the suite compiles — a pack-file edit
is proven by the installer's own tests and the drive, not by a 15-minute
run.)

Empty output means **the last run still stands — do not re-run it.**
Say so, cite the number it gave, and move on. The same check applies to
committed work: `git diff <last-full-run-sha>..HEAD --name-only` with
the same filter.

⚠ This is a rule about the FULL suite only. `pnpm test:near` is cheap
and should stay reflexive — the cost being managed here is ~15 minutes
of wall-clock, not the habit of checking your work.

⚠ It cuts the other way too: **a run whose scope you narrowed is not a
full run.** Do not report `test:near` green as though the suite passed.

⚠ A sweep that edits code is not docs-only, and *does* want the full
run — the sweep is the last place a mechanical cleanup can quietly
break something. Judge by what the sweep commit actually changed, not
by the phase's name.

**This is not "checking less."** Every commit still faces a full suite
plus CI before merge. What goes away is running the *same* full suite
four times to answer questions that three of them did not need.

### `pnpm test:near` — proximity, not a dependency graph

`scripts/test-near.ts` asks git what changed since a ref (default
`origin/master`, and always including uncommitted work), then runs the
`__tests__` directories that sit **next to** those files, plus any
changed test files themselves.

⚠ **It is a heuristic and it is not a gate.** It will miss a test that
covers your change from another subsystem, and — this codebase being
data-driven — it will miss tests broken by a change to a seed YAML or a
content pack, because nothing imports those. Use it for the fast loop;
use `pnpm test` before the MR. The name is `near`, not `affected`,
because it cannot promise the second thing.

⚠ **`vitest --changed` does not work in this repo — measured, not
assumed.** It returns every file in the suite in every case, including with *no
changes at all*:

| change | files selected |
|---|---|
| one leaf source file | all of them |
| one leaf test file | all of them |
| a docs file nothing imports | all of them |
| **nothing** | all of them |

The likely cause is the worktree layout — `.git` here is a *file*
pointing into `../.bare`, not a directory, and vitest's changed-file
detection appears to fail open and select everything. Failing *open* is
the right direction for a test runner to fail, but it means the flag
buys nothing. Don't reach for it without re-running the control above.

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

## The gym suite

`combat-gym` and `waster-spar` are balance regression guards: they
drive complete fights through the real engine to assert the fight stays
fair (the parry seam stays dead, the feint stays non-degenerate,
NPC ≈ PC, matchups stay deterministic) and that the blunted delivery
form resolves correctly through the tissue fold. They are benchmarks
shaped like tests, and they were **25% of the whole suite's test CPU
(~880s) in two files and 31 tests**.

⚠ **Splitting them out bought almost no local wall clock — 885s → 880s,
inside the noise floor.** That is worth understanding, because the
naive arithmetic ("880s of CPU removed") is wrong by two orders of
magnitude. With 8 workers, `combat-gym` was **hiding inside the
parallelism**: it occupied one core for 810s of an 882s run, alongside
961 other files sharing the rest. It cost a *core*, not *time*.

So the split is worth having for three reasons, none of them "the local
suite got faster":

1. **CI wall clock genuinely drops** — `test` and `test-gym` are
   separate jobs on separate runners, so validate finishes in
   `max(a, b)` instead of `a + b`.
2. **It becomes the critical path as everything else improves.** At
   today's 880s it is free; if the rest of the suite ever reaches 400s,
   an 810s file is the whole wall clock.
3. A benchmark is not a unit test, and the default loop should not wait
   on one.

They are **not skipped**: CI runs them every MR. Taking a balance guard
off the local loop is a speed decision; letting it stop running is a
different decision, and nobody made it. Run `pnpm test:gym` before
touching `lib/combat`, `lib/material`, or the materials-response grids.

The file list is `GYM_TESTS` in `vitest.config.ts`, used as that
config's `exclude` and as `vitest.gym.config.ts`'s `include`, so the
two suites are complementary **by construction**: no file can land in
both, and none can land in neither and silently stop running.

⚠ Compose the gym config by spreading `sharedTest`, never via vitest's
`mergeConfig` — merge *concatenates* arrays, so a merged config
inherits the base `exclude` (which names the gym files) and selects
nothing.

⚠ The measurement history has a **discontinuity at this split**: rows
before it measure 966 files, rows after measure 964. The `files` and
`tests` columns are how you tell.

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
entry, so all 966 test files paid for its ~30-deep import graph,
re-evaluated per file because vitest isolates. Measured at 5.79s of the
6.38s it took to run a file that needed none of it.

It is now `src/test-bootstrap.ts`, imported explicitly by the 808 files
that touch the wired runtime:

```ts
import "../../../test-bootstrap";
```

154 files that need none of it stop paying. Setup CPU went from ~3172s
to zero; wall clock fell 25%, and the two after-runs agree within 0.7%
where the baseline pair differed by 6% — less memory pressure means
less variance too.

`pnpm lint:test-bootstrap` (CI-gating) keeps the set honest. It fails
only in the direction where being wrong is cheap — a file that needs
wiring and lacks the import — because a redundant import costs one line
and the bootstrap is once-guarded. The reverse finding stays
**advisory**: the heuristic can prove a file needs wiring, never that
it doesn't. Only the suite can. Its file discovery is checked against
`vitest list` across BOTH configs by `--verify` (966 = 966), so no test
file is invisible to it.

### `lint:test-content` — kernel tests that name shipped content

Content is moving out of the kernel into packs, and a **kernel** test
that names a `/domain/<locality>` path is a test that breaks — or
silently passes over nothing — the day that locality is a pack the
kernel does not ship. `pnpm lint:test-content`
(`scripts/check-test-content.ts`, CI-gating, **warn-only on the
listed**) scans the server source, the scripts' tests and the client
for test files matching `/\/domain\/[a-z]/`, skipping
`src/mud/domain/**` (a test that lives with its content is exactly
where a content test belongs), `packages/content/**` and `e2e/**`.
`scripts/test-content-allowlist.txt` lists today's offenders (104 at
wave 2), and **the list only shrinks**: a listed offender warns; a NEW
offender fails; a listed path that no longer offends (or no longer
exists) is *stale* and fails too — the fix is deleting the line, which
is the direction we want. A kernel test proves the kernel over
synthetic fixtures under `/test/**` ("ugly on purpose"); the four
eternal-tree kernel tests were shrunk that way (`crossing-ritual` over
duck-typed synthetic gear; the Whistle smoke, the dorm-bed archetype
cases and the domain-local `provision` case moved beside their content
under `src/mud/domain/eternal/**/__tests__/`).

### `lint:untitled` — every shipped path is under a claim

With `core` gone an untitled path is *untitled*: `ownerOf` answers
`null` and every `can` there fails closed, so a row nobody claims is a
row nobody can edit, broadcast over or teleport within — silently.
`pnpm lint:untitled` (`scripts/check-untitled-paths.ts`, CI-gating)
reads every shipped `pack.yaml`, collects the claims
(`requires.title[].extent`) and every path the packs ship (the
installer's template walk mirrored — every `content/**/*.yaml` outside
the kind dirs, `cmd/` skipped at any depth — plus every document path
and command view), and reports any path under one of the eight title
roots (`/obj /domain /cmd /compact /studio /wiki /home /corpo`) with no
claim as a prefix. Zero is green. It does not import the mudlib, so
the walk rule is duplicated minimally.

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

### `combat-gym` / `waster-spar` — moved to the gym suite.

The single largest file in the suite (782s / 28 tests, ahead of
`CombatLogic`) plus its sibling bench (69s / 3 tests). Neither appeared
in this build's requirements because `find src` misses them: `src/`
holds 956 test files, the suite runs 966.

Now `pnpm test:gym` — see *The gym suite* above, including the
measurement showing the local wall-clock saving was ~0.6%, not the 13
minutes the CPU figure suggests.

### The rest

`Plant` (157s), `GardenBed` (102s), `DormHouseplant` (99s),
`CombatReactive.shadow` (91s), `Metabolic.reconcile` (75s) are all the
same shape: fake-clock simulation loops paying the per-call cost above.
No test-side fix without weakening them.

## The standing flakes — and what they turned out to be

Two tests in `sandbox.guests.test.ts` failed under full-suite load and
**passed in isolation** (verified: 30/30 green in 17.7s). Under heavier
contention the set widened to `landing.integration`, `Consumables`,
`sandbox.crossing`, `sandbox.wardrobe`, `crossing.escape` — all
sandbox/timing tests.

**Never quote a failure count without an isolation run.** The count
tracks machine load, not code health.

### ⭐⭐ The sandbox family was not flaky — it was over budget

Diagnosed during the card-surface sweep (2026-08-17), and the
distinction matters because it changes what you do about it.

Every sandbox test stands up a circle and runs at least one **session
ceremony** — mint a vessel, move the sockets, `Avatar.enter`,
auto-sense. Timed in isolation on an idle box, individual tests cost
**2.4–5.7 s against vitest's 5 s default**. Several were already over
the limit *with no contention at all*; the rest were within one spike
of it. That is not a flake, it is a test budget that had quietly been
outgrown, and it presented as a flake because isolation runs are faster
than the full suite by exactly the margin involved.

⚠ **A build can push a marginal test over without being wrong.** The
card-surface build made arrival open a card, which resolves and
subscribes. Measured by removing `opens_card` from `sense.yaml` and
re-running: `sandbox.crossing.test.ts` went 19.3 s → 17.5 s, about
**10%**, or ~100 ms per arrival. The feature costing what the feature
costs — but enough to turn "passes most of the time" into "fails most
of the time" for tests already at 90% of budget.

⭐ **The fix is a per-FILE `vi.setConfig({ testTimeout: 20_000 })`**, now
on all 18 sandbox test files, with the measurement recorded in
`escape/round-trip.test.ts`. Per-file rather than global on purpose: a
global raise would buy these files' honesty at the price of every
genuine hang in the suite taking four times as long to report.

⚠ **Patching them one at a time as they fail is the wrong shape** —
that was tried first and it was whack-a-mole, because the whole family
shares the cost. When a timing failure has a common cause, fix the
family, not the file that happened to lose the race.

⚠ Not every entry above is explained by this. `landing.integration` and
`Consumables` are outside the sandbox family and still want their own
measurement.

## ⭐⭐ Test the WAKE, not just the read

The seam that makes a derive-on-read surface testable is the same seam
that makes it possible to test it into a false pass.

The phone-chrome build shipped a mobile bar whose figures were **empty
forever**: the bar does not render `Shelf`, which is where the `self`
subscription was opened, so nothing ever asked the server for the data
it displayed. **Eleven tests covered that bar and every one of them
passed** — because each seeded the store directly
(`useStore.setState({ shelfFigures })`), which is exactly the seam that
lets a shelf be tested without a socket, and is therefore structurally
blind to the question *does anything ask?*

The same shape had already bitten the card holds, where eleven green
tests missed an immortal card because all of them hand-refreshed.

So for anything that **derives on read** — a card hold, a standing, a
reconcile-on-read projection, a subscription-fed widget — write the
read test *and* a second test that asserts the thing which is supposed
to wake it actually does:

- a **subscription** — assert the component subscribes (spy the
  transport), not merely that it renders what the store holds;
- a **reconcile** — drive the clock and assert it advanced, rather than
  calling the reconciler yourself;
- a **projection** — seed the *event log* and assert the derived value,
  rather than seeding the derived value.

⚠ The tell is a test that never touches the producer. If every test for
a surface reaches past the wire and writes the answer in, the suite is
describing the renderer and saying nothing about the feature.

Related: a guard that scans source can pass by **matching nothing**.
Assert what it found (`expect(inspected).toBe(N)`), or a rename
silently reduces it to `expect([]).toEqual([])`.

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
