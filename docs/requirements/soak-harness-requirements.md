# Soak harness — requirements

**Kind:** infra
**Leads from:** kernel (the wire package, the test clock, the tools). **First consumers:** build-1's
cover and build-3's ceramics span checks, split out of their blocking drives; and this build's own
canary.

No merge waits on the clock ([workflow.md](../workflow.md) § *No merge waits on the clock*): every
drive step is `instant`, `short`, `staged` or `span`, and only span steps — weeks or seasons of game
time — are kept out of review, finalize and a build's exit drive. They run in the **soak lane** after
merge. The lane's worktree, tmux window, triage skill and GitLab label already exist; what it lacks is
anything to run and anything to run it. This build supplies both. Seeding slate:
[soak-lane-slate](../slates/builds/soak-lane-slate.md) § 2–3a. The owner (2026-10-30): *"my main
concern is expediting these builds so we make better use of our time."*

## What already exists

- **The wire tier** — 71 flow files run over the real socket against a booted world, serial by
  construction (one world per worktree). `pnpm wire` runs them all, `wire:clean` excludes the dirty
  ones, `wire:dirty` runs only those. ⭐ **The dirty convention is the precedent**: the flag is the
  *filename* (`*.dirty.wire.test.ts`), so ordering needs no import and `ls` is the census.
- **The test clock jump** — test-only, reached through the harness; it replays every schedule in the
  skipped interval and holds the clock until the world is quiet. 25 wire files use it today.
- **`tools/suite`** — the full suite, bounded: it sizes its pool from free memory with a reserve, and
  takes **one cross-worktree lock** beside the bare repo so two suites never starve each other.
- **The soak lane, set up** — the `soak` worktree (detached at master, never committing; its own
  database; wire port 2020), the `soak` tmux window, the `/soak` triage skill, the GitLab label `soak`.
- **`glab`** on the workstation, authenticated, running locally (no GitLab compute).

- **The wizard's `eval`** — runs code in a parcel the wizard holds; quarantined (writes discarded)
  in their own `/home` by default, real inside a parcel they hold with `--parcel`. It sees **four**
  Apis (`StuffApi`, `MqlApi`, `ContainmentApi`, `MixinApi`) from a hand-kept list. It has **no
  timeout** (the docs claim one), **no output cap**, and a refused clone inside it **takes the server
  down** (an unhandled rejection — found by the taps and sugar builds).
- **Test login** can make a character a wizard (every managed group); nothing in the test seams sets
  the weather.

**Therefore what is genuinely new here is:** a soak file convention and its run command, a refusal
that keeps long jumps out of blocking drives, a result a script can read, and the runner — finding
unsoaked merges, waiting for headroom, running, recording, filing issues — plus a canary so the lane
always has something true to run. ⭐ And — added by the owner 2026-10-30 — **the staging tools the
staged twins depend on**: an `eval` that can reach what an author may call, that cannot crash the
world, and a test-only command for the few operations that only make sense in a test world.

## Goals

- **A soak drive is a file anyone can see is one** — `<feature>.soak.wire.test.ts` — and the
  ordinary wire runs never execute it.
- **A long jump cannot hide in a blocking drive** — a jump past a game day outside soak mode fails,
  saying why and where it belongs.
- **The lane runs itself** — every merge to master that adds or changes a soak file is soaked on the
  workstation, unattended, without starving the build worlds.
- **A failure becomes a GitLab issue** labeled `soak`, carrying what the triage session needs.
- **The lane proves itself** — a canary soak file it can always run.
- **An agent can stage the state a check needs** — the staged twin of every span step is writable:
  `eval` reaches every Api an author may call, in any parcel the test runner holds, and a refusal or
  a runaway script comes back as an error, never a dead server.
- **Moving time and the weather is a named test command**, not code: `test clock …`, `test weather
  …`, in test worlds only.

## Non-goals

- **Reconcile instead of replay** for clock jumps → [soak-lane-slate](../slates/builds/soak-lane-slate.md)
  § 5, its own build.
- **Session-pace body needs** → [pace-slate](../slates/builds/pace-slate.md), its own build.
- **Splitting build-1's and build-3's drives** → those builds, when they merge master (the refusal
  makes them).
- **GitLab CI** → nowhere, deliberately: it costs compute; the workstation is always running.
- **Phone or push notifications for a soak failure** → nowhere for now; the issue is the record and
  a soak failure never blocks anyone.
- **The triage session's diagnosis** → already the `/soak` skill; this build only makes it something
  to triage.

- **Lifting `eval`'s parcel boundary** (test or live) → nowhere, deliberately: the access model
  already answers it — a test runner is given title to what it tests.
- **Test-privileged Api statics callable from `eval`** (an annotation that opens statics to test
  runners) → nowhere, deliberately: the test-only operations are one named command instead.
- **A sandbox stronger than Node `vm`** (`isolated-vm`) → the existing deferral in the code-trust
  docs; unchanged.

## Placement

Kernel tooling: the wire package (the convention, the run command, the refusal, the result), the test
clock's test-only route (the refusal's enforcement point), and `tools/` (the runner, beside
`tools/suite`). No pack, no content, no namespace root. ⭐ **A second consumer needs no code** — a new
soak drive is one more file.

## Collisions

- ⚠ **The 25 wire files that jump the clock today.** Any that jumps past a game day outside soak mode
  starts failing the moment the refusal lands. The build **censuses them** and, for each, either moves
  the long-jump steps into a `.soak.` file or shows the jump is within a day. Master's wire suite is
  green when the build merges.
- ⚠ **build-1 and build-3**, whose in-flight drives jump weeks: they meet the refusal when they next
  merge master. That is intended — it is the rule arriving — and their agents split their drives then.
- **`tools/suite`'s lock.** The runner takes the **same** cross-worktree lock, so a soak world and a
  full suite never run at once, and respects the same memory reserve.
- **The soak worktree and its window.** The runner moves the worktree's `HEAD` to the merge it is
  soaking; nothing else may use that worktree.
- **The dirty convention.** A soak file may also be dirty (`*.soak.dirty.wire.test.ts`); the names
  compose, and the soak run orders clean before dirty as the default run does.

## Surface decisions

### The file convention — **[DECIDED — the owner]**

`<feature>.soak.wire.test.ts`. `pnpm wire`, `wire:clean` and `wire:dirty` exclude `*.soak.*`;
**`pnpm wire:soak`** runs only soak files, optionally a named subset. The MR names its soak drive by
filename.

### The refusal — **[DECIDED — the owner, soak-lane slate § 2]**

A test clock jump longer than **one game day**, outside soak mode, fails the step with a message that
names the rule and the fix — *"a jump of 30 days is a span step: move it to a `.soak.` file."* Soak
mode is on only under `wire:soak`. One game day is the short/span line until the owner moves it.

### The result — **[LEAN]**

Every wire run writes a machine-readable result beside its log: each file, each test, pass or fail,
the failure's message and the drive's own record, wall time. The runner reads it; a human can too.

### The runner — **[DECIDED — the owner; details LEAN]**

`tools/soak`, run continuously as `tools/soak --watch` in its own pane of the `soak` window.

1. **Find work** — fetch; list merges to master after the last soaked commit (a state file in the soak
   worktree); for each, the soak files that merge added or changed.
2. **Wait for headroom** — boot only when free memory clears the reserve with room for a world (~3
   GB) and the cross-worktree lock is free. Otherwise wait and say why. **A queued merge is soaked by
   the end of the next night at the latest** — overnight, the builds are idle.
3. **Run** — move the soak worktree to that merge, drop the soak database, boot on port 2020, run
   those soak files, tear the world down by PID, release the lock.
4. **Record** — append the result and advance the state file, pass or fail.
5. **File** — for each failing file, a GitLab issue labeled `soak`: the file, the merge, the MR that
   introduced it, each failing step with its output, the drive record. One issue per file per merge;
   a re-failure of an already-open issue comments on it rather than opening another.
6. `--once` runs one pass and exits; `--dry-run` lists what it would do and files nothing.

### The triage session wakes on issues — **[LEAN]**

The `soak` window's Claude checks for new `soak` issues on a long interval (an hour), under `/soak`.
A soak failure never blocks anyone, so latency is fine; the tokens are spent only when one exists.

### The canary — **[LEAN]**

`canary.soak.wire.test.ts` — boots, jumps the clock **two game days**, asserts the world moved and
answers. The lane soaks it on every merge that touches the soak tooling, and it is the lane's own
self-test: a red canary means the lane is broken, not a build.

### Staging — **[DECIDED — the owner, 2026-10-30]**

*"eval shouldn't need anything special. you can always run eval in whatever parcel you have access
to. if it's a matter of giving a test runner access to parcels it needs to test then just do that."*
And of the test-only operations: a controller with its own command view, *"and it's the controller
that's privileged and does its own access checks."*

1. **`eval` sees what an author may call.** The hand-kept list of four is replaced by the rule the
   codebase already states — *callable == visible*: every **consumer-tier** Api static (public, not
   `@internal`) is in scope, each still carrying its own call-security gate. Internal framework Apis
   (security, proxy, module, execution context) stay out. Nothing becomes callable that its gates do
   not allow.
2. **The jurisdiction is unchanged** — `eval` runs in a parcel the wizard holds. **Test login can
   grant a test runner title to the parcels it needs** (beside the wizard grant it already has), so a
   drive's character can stage inside, say, `/world/terminus` with `eval --parcel`.
3. **`eval` cannot take the world down**: a **timeout** (the documented one, made real), an **output
   cap**, and every refusal — a boundary denial, a refused clone's hydrate — **returned as an
   error**, never an unhandled rejection.
4. **A `test` command, in test worlds only** — its view is installed only where the clock route is
   mounted. It is the privileged surface: its own access check (a test world, a wizard), one place to
   audit. **`test clock advance <duration>`** (and the read), and **`test weather pin <kind>` /
   `unpin`**, which hold the weather where a drive needs it. Further test-only operations are added
   here as staging twins need them.
5. **One implementation, two front doors** — the `test` command and the wire harness's clock route
   call the same test hooks, so a browser agent and a wire drive do the identical thing, and **the
   soak refusal (no jump past a game day outside soak mode) is enforced once**, in that shared hook.
6. **`eval` points to the command** — code in `eval` that tries to move the clock or pin the weather
   is refused with a message naming `test clock …` / `test weather …`.

## Lens pass

1. **Pedagogy** — none; tooling.
2. **Expression** — a new soak drive is a file; nothing to register.
3. **Immersion** — none. **Participation** — none.
4. **Values** — the owner's time and tokens: nothing waits on the clock.
5. **Continuity** — the dirty convention's shape, reused.
6. **Economy** — no GitLab compute; the workstation's idle hours do the soaking.
7. **Governance** — none.

## The drive

Each step tagged by pace. The blocking drive is all of this build's exit criterion; it should take
minutes.

### Blocking drive

1. `instant` — `pnpm wire` on master: no `.soak.` file runs; the canary is listed as excluded.
2. `short` — a non-soak wire file that jumps **two** game days fails, and the message names the rule
   and the `.soak.` fix; the same jump of **twenty hours** passes.
3. `short` — `pnpm wire:soak canary` runs only the canary, in soak mode; it passes; the result file
   records it.
4. `instant` — `tools/soak --dry-run` lists the merges after the state file's commit and the soak
   files each would run, and files nothing.
5. `staged` — with the headroom threshold set above free memory, `tools/soak --once` does not boot,
   and says it is waiting for memory; with the cross-worktree lock held by a fake holder, it says it
   is waiting for the lock.
6. `staged` — with a soak file forced to fail, `tools/soak --once` files **one** GitLab issue labeled
   `soak` carrying the file, merge, MR, failing step and output; run again, it **comments** on that
   issue rather than opening another. Close the issue.
7. `instant` — after a pass, the state file has advanced; `--dry-run` lists nothing new.
8. `staged` — as a test runner granted title to `/world/terminus`: `eval --parcel /world/terminus`
   calls a consumer Api that was out of reach before (e.g. inflicts a condition on an NPC there) and
   the effect is real; the same call in an unheld parcel is refused **with a message**; the server is
   up.
9. `short` — `eval` with an infinite loop returns a timeout error; a huge result is cut at the cap; a
   clone refused by the boundary returns an error; the server is up after each.
10. `short` — `test clock advance 2 hours` moves the clock; `test clock advance 3 days` is refused
    with the soak rule's message; `test weather pin rain` holds rain until `test weather unpin`; in a
    world that is not a test world, `test` is an unknown verb; `eval` touching the clock is refused,
    naming `test clock`.
11. `instant` — the 25 clock-jumping wire files: the census result in the MR — each moved to soak or
   shown within a day — and `pnpm wire:clean` green on the branch.

### Soak drive

1. `span` — `canary.soak.wire.test.ts`, run by the lane itself after this build merges: the first real
   soak, and the proof the lane works end to end.

## Acceptance criteria

- No ordinary wire run executes a soak file.
- A blocking drive cannot jump past a game day; the failure tells its author what to do.
- After a merge that adds or changes a soak file, the lane soaks it unattended — never while memory
  is short or another suite holds the lock, and no later than the next night.
- A soak failure appears as a GitLab issue labeled `soak` with enough in it to triage without
  re-running; a repeat failure comments rather than duplicating.
- The canary is green on master after this build merges, soaked by the lane.
- Master's wire suite is green when this merges.
- A test runner can stage, with `eval` in a parcel it holds, anything a consumer Api can do; no
  `eval` — however wrong — stops the server.
- Time and weather move only through the `test` command (or the harness's route), only in test
  worlds, and the soak rule is enforced in one place for both.

## Cross-references

- [soak-lane-slate](../slates/builds/soak-lane-slate.md) — the finding, the rule, the lane
- [workflow.md](../workflow.md) § *No merge waits on the clock*
- [testing.md](../testing.md) — the two tiers, `tools/suite`, the dirty convention
- `.claude/skills/soak/SKILL.md` — the triage session
