# Test overhead — requirements

The server suite takes **~23 minutes** wall-clock (1358s on 8 cores) for
955 files / 8933 tests. A build cycle runs it three or four times, so
roughly **an hour per build is spent waiting**. This build reduces that.

It is a performance build, so its governing rule is unusual and
load-bearing: **measure before changing, and measure after.** A test
suite is the one thing that must not get faster by testing less.

## Goals

- **Cut wall-clock time on the full server suite**, verified by
  before/after measurement on the same machine.
- **Make the cost legible** — a standing way to see which files and
  which phase (setup / transform / tests) dominate, so the next
  regression is noticed rather than absorbed.
- **Zero loss of coverage.** Same test count, same assertions, same
  isolation guarantees.

## Non-goals

- **`isolate: false`.** See *Surface decisions § 1* — declined on
  evidence, not preference.
- **Deleting, skipping or `.todo`-ing slow tests** to move the number.
  A faster suite that checks less is a worse suite that lies.
- **Rewriting the slow subsystems' logic.** If a test is slow because
  the code under it is slow, that is a finding to report, not to fix
  inside a test-performance build.
- **The client suite** (392 tests, ~25s). Not a problem.
- **CI runner configuration.** Local developer wall-clock is the target.

## Surface decisions

### 1. ⚠⚠ `isolate: false` is declined

It is the single biggest available lever — vitest re-evaluates the whole
module graph per test file, and sharing it across a worker would
reclaim most of the setup cost. **Do not do it.**

This codebase has global mutable registries (`StuffApi`'s indexes, the
catalogues), and its tests rely on `StuffApi.clearAll()` in teardown to
get a clean world. Turning off isolation makes every one of those a
cross-file leak waiting to happen.

The evidence is recent and specific: the weather flake fixed in MR !175
was **exactly this failure mode** — one test's pending work landing
inside another's assertion window — and it survived months precisely
because that class of bug is so hard to attribute. Trading a slow suite
for an untrustworthy one is a bad trade at any speed.

### 2. The measured facts, and the one that resets expectations

Measured on the same file, only the setup file differing:

| | Duration | setup | transform |
|---|---|---|---|
| With `setupFiles` | **6.38s** | 5.79s | 4.05s |
| Without | **1.43s** | 0ms | 683ms |

Across the suite: **setup = 3651s of CPU**, tests = 5059s, transform =
63s. On 8 cores, setup is roughly **a third of the wall clock**.

`test-setup-registries.ts` calls
`BootstrapManager.installFrameworkWiring()`, whose ~30 imports pull in
most of the mudlib — re-evaluated once per file because vitest isolates.

⚠ **But the naive extrapolation is wrong, and the plan must not assume
it.** 750 of 955 files touch `StuffApi` / `makeStuff` and would load
much of that graph *anyway*; for them the setup's marginal cost is far
below 5s. The clean, certain win is the **205 files that touch none of
it** and pay full freight for nothing (~1000s CPU, ~125s wall).

**So the first wave is measurement, not a change.** Anything promising
"a third off" before that measurement exists is guessing.

### 3. How the setup gets scoped

**The wiring moves from a global `setupFiles` to an explicit import**,
so a test that needs a wired world says so.

⚠ It cannot simply ride the existing `test-setup` helper: **640 files
import it, 750 touch the runtime — 110 touch it without importing the
helper.** Those 110 are the failure set for any "just hang it off the
helper" approach, and they must be enumerated and fixed, not discovered
by a red suite.

The change is one import line per file and mechanically applicable, but
it is ~750 files, so it lands as its own MR with no other content.

### 4. Slow files are investigated, not assumed

The top eight files are ~1800s of the 5059s test total:

| File | Time | Tests |
|---|---|---|
| `CombatLogic.test.ts` | 705s | 72 |
| `Plant.test.ts` | 222s | 13 |
| `Metabolic.cascade.test.ts` | 187s | **5** |
| `GardenBed.test.ts` | 173s | 33 |
| `CombatLogic.range.test.ts` | 137s | 33 |

`Metabolic.cascade` at **37s per test** was checked: it is **not**
real-time waiting — no `setTimeout`, no sleeps. It is CPU, from
`advance(c, gameSec, chunkSec = 3000)` looping a full reconcile 30×
for a 90000-second advance.

⚠ Whether the chunk size is *load-bearing* — whether the cascade needs
intermediate passes to fire correctly — is unknown and must be
established before it is touched. A test that gets faster by skipping
the intermediate states it was written to exercise has been broken, not
optimised.

### 5. `pool: 'threads'`

Vitest defaults to `forks`. Threads start faster and share more. It is a
one-line change with a real chance of a double-digit percentage win and
a real chance of none — **so it is measured, and adopted only if it is
both faster and green.** Some native/module-scope behaviour differs
between pools; a passing suite is the acceptance bar, not a hunch.

## Constraints

- **No coverage loss**: the test count after must equal the test count
  before, asserted by comparing run summaries.
- Measurements are taken **on a quiet machine** — no dev server, no
  second vitest. Contention already produced phantom failures this cycle
  and would produce phantom *improvements* just as easily.
- Each lever is measured **independently**; landing two at once makes
  neither attributable.
- The `callSecPlugin` transform must keep running over `mud/**` — it is
  what makes `FromModule` gates real. Not a candidate for removal.

## Acceptance criteria

1. A **baseline** is recorded before any change: wall-clock, per-phase
   totals, and the ten slowest files, on a quiet machine.
2. The same measurement is recorded after each lever, independently.
3. Test count after == test count before, on every measurement.
4. Global `setupFiles` is removed; every file needing a wired world
   imports it explicitly. The **110 files that touch the runtime
   without importing the helper are enumerated** and handled.
5. A test asserts the wiring is idempotent under repeated import.
6. `pool: 'threads'` is measured and either adopted with its number
   recorded, or rejected with its number recorded. **Both outcomes are
   results**; neither is a failure.
7. `isolate: false` is **not** adopted, and the reason is recorded where
   the next person will look — in the vitest config, next to the setting
   they will be tempted by.
8. `Metabolic.cascade`'s chunk size is established as load-bearing or
   not, with evidence, before any change to it.
9. Any slow file left slow is **reported with its reason**, not silently
   accepted.
10. A short `docs/testing.md` records the baseline, what each lever
    bought, and how to re-measure. **The point is the next regression
    being noticed.**
11. Full suite green; lint family green.

## Cross-references

- The flake this build's § 1 decision rests on: MR !175, and
  [unawaited-promise-flake] in project memory.
- [docs/workflow.md](../workflow.md) — this build's output feeds every
  future cycle's Phase 4.
