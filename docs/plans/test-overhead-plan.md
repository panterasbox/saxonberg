# Test overhead — plan

Implements
[test-overhead-requirements.md](../requirements/test-overhead-requirements.md).

**Six waves, three MRs.** Each lever lands separately with its number,
because two levers in one MR means neither is attributable.

| MR | Waves | What |
|---|---|---|
| **A — measure** | 1 | The baseline + the harness that produces it |
| **B — the setup tax** | 2–4 | `pool`, then the setup scoping |
| **C — the slow files** | 5–6 | Investigate, fix what is safe, report the rest |

⚠ **A must land before B.** Not procedurally — practically: without a
recorded baseline on a quiet machine, every later number is unreadable.
This cycle already produced phantom *failures* from contention; it would
produce phantom *wins* just as readily.

---

## Wave 1 — the baseline and the harness

`scripts/bench-suite.ts` — runs the suite, parses vitest's summary, and
writes a dated row: wall-clock, per-phase totals (setup / transform /
collect / tests), test count, and the ten slowest files.

Requirements:

- **Refuses to run on a busy machine.** Check for a live dev server and
  another vitest before starting, and abort with what it found. This is
  the guard that makes every subsequent number mean something.
- Records **test count** every time — criterion 3's coverage check is
  free if the harness always captures it.
- Appends rather than overwrites, so the history is the regression
  detector.

**Deliverable: the baseline.** Three runs, quiet machine, so the noise
floor is known before anything is attributed to a change.

⚠ Do not skip the three runs. A single baseline against a single
after-measurement cannot distinguish a 10% win from ordinary variance —
and this cycle's full-suite failure counts already varied 5 → 4 → 7 on
identical commits.

---

## Wave 2 — `pool: 'threads'` (cheapest lever first)

One line. Measure. Adopt or reject **with the number recorded either
way**.

⚠ Threads and forks differ in how module-scope and native bindings
behave. The bar is a **fully green suite**, not a faster one — if
threads are faster but flake anything, that is a rejection.

Do this first precisely because it is one line: if it wins, Waves 3–4
are measured against an already-improved floor, and if it loses it costs
almost nothing to have tried.

---

## Wave 3 — enumerate the 110

The mechanical prerequisite to Wave 4, and the thing that turns a scary
750-file change into a safe one.

640 files import `__tests__/test-setup`; **750 touch
`StuffApi` / `makeStuff`**. The 110-file difference is every file that
would break the moment global `setupFiles` is removed.

1. A script that lists them (the same comm-style set difference used to
   find the number — make it repeatable, not a one-off shell line).
2. Check the inverse too: files that import the helper but touch
   nothing, which are candidates to stop paying.
3. **Land the list, not the change.** Wave 3 is a report; Wave 4 acts on
   it.

⚠ Expect the set to be imperfect. `StuffApi` / `makeStuff` is a
heuristic for "needs a wired world" — some files touch neither and still
need wiring (a catalogue read, a mixin registry). Wave 4's suite run is
the real oracle; the list only makes the diff reviewable in advance.

---

## Wave 4 — move the wiring to an explicit import

1. New `src/test-bootstrap.ts`: calls
   `BootstrapManager.installFrameworkWiring()` behind a **once-guard**,
   so repeated import is free (criterion 5).
2. Remove `setupFiles` from `vitest.config.ts`. In its place leave a
   comment naming `isolate: false` and **why it is declined** —
   criterion 7 puts it where the next person will be tempted.
3. Add `import './test-bootstrap'` (path-relative) to every file from
   Wave 3's list.
4. Run the full suite. **Failures are the oracle** — each one is a file
   the heuristic missed. Add the import; do not weaken the change.

⚠ Codemod the import, but **review the diff by eye before committing**.
750 mechanical edits is exactly the shape of change that hides one
non-mechanical mistake — and this repo's worktree doctrine exists
because a bulk edit went wrong once already.

⚠ Stage by name. Never `git add -A` on a 750-file diff.

---

## Wave 5 — the slow files, investigated

Top eight ≈ 1800s of 5059s. Start with the two most diagnostic:

**`Metabolic.cascade.test.ts` — 187s / 5 tests.** Confirmed CPU, not
waiting: `advance(c, gameSec, chunkSec = 3000)` runs a full reconcile
30× for a 90000s advance.

- **First establish whether the chunking is load-bearing.** Does the
  cascade need intermediate passes to fire, or is reconcile
  derive-on-read and therefore chunk-independent? Read
  [metabolism.md](../subsystems/metabolism.md) before touching it.
- If chunk-independent: raise `chunkSec`, assert identical outcomes.
- If load-bearing: **leave it and say so.** A test that gets faster by
  skipping the states it exists to exercise has been broken.

**`CombatLogic.test.ts` — 705s / 72 tests** (~10s per test). The single
largest file. Likely one shared expensive fixture per test rather than
72 slow tests; look for per-test world construction that could be
per-describe.

⚠ Any fixture sharing must not reintroduce cross-test coupling — the
thing § 1 of the requirements refuses to trade away. Shared *setup* is
fine; shared *mutable world* is not.

---

## Wave 6 — record it

`docs/testing.md`: the baseline, what each lever bought (including the
rejected ones and their numbers), how to re-measure, and the standing
`isolate: false` decision with its reasoning.

`CLAUDE.md` — **one line** pointing at it, in the Development Commands
area rather than the subsystem map, since it is process not subsystem.

---

## Risks

| Risk | Handling |
|---|---|
| **A measured "win" that is machine noise.** The likeliest way to waste this whole build. | Wave 1's three-run baseline + the busy-machine guard. Every lever measured independently. |
| **The 750-file import edit hides one bad change.** | Wave 3 lands the list first, so the diff is reviewable before it exists; eyeball the diff; stage by name. |
| **A slow test gets "fixed" into a weaker test.** | Criterion 8 — chunk size established as load-bearing or not, *with evidence*, before any change. Criterion 9 — a file left slow is reported, not hidden. |
| **The win is smaller than hoped.** 750 of 955 files load much of that graph anyway. | Said out loud in requirements § 2. The certain win is the 205 files that pay for nothing; anything beyond that is measured, not assumed. |
| **Scope creep into optimising the mudlib.** | Explicit non-goal. Slow *code* is a finding to report, not to fix here. |

## Out of scope

`isolate: false`. Deleting or skipping tests. Rewriting the subsystems
under the slow tests. The client suite. CI runner config.
