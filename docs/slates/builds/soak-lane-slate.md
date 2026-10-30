# Soak lane slate — no merge waits on the clock

> **Status: UNBUILT** — decided 2026-10-30 with the owner. What ships: the wire tier and its drives
> ([testing.md](../../testing.md)); the test-only clock jump (`/auth/test-clock` →
> `TestHooks.advanceClock`), which drains every schedule in the skipped interval and holds the clock
> until persistence is quiet (up to 240 s); `advanceLiving` (≤ 4 game hours a step while a drive body
> is logged in, everyone fed between steps); the drive as the build's exit criterion
> ([workflow.md](../../workflow.md)).
> **Left:** the pace tag on every drive step (instant · short · staged · span) · a staged twin for every span step · span never blocks · the
> harness refusing an untagged long jump · a blocking drive and a soak drive in every requirements
> doc · the soak harness (`*.soak.wire.test.ts`, `pnpm wire:soak`, the jump refusal) · `tools/soak`, the headroom-gated runner filing `soak` issues · logging drive bodies out across long jumps
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"We have build-3 running finalize now. I kicked it off last night and expected it to be done this
morning. Then I found out it still has like nine hours, because it's tests waiting on time to pass in
the game. … It's not just finalize — agents were doing this all through the MR review process too.
It's everywhere. … When I have a branch waiting to merge that's blocking other builds or plans from
running, that's a big problem. Usually I'm out of weekly tokens by Friday, but this week I'm still at
50%, because we've just been sitting here all week waiting for tests, doing nothing. … We need a rule
or test segmentation or tagging so that anything that depends on the game clock running more than a
few minutes, we do not block on those tests. We'll need to come up with some other process to make
sure they get run, but we can create a new 'test runner' session/window in tmux and have that guy
just dispatch subagents to test master after things have merged and catch any bugs in these kinds of
time-based processes. … My main concern is expediting these builds so we make better use of our
time."*

## 1. Where the hours go — the finding

Read from build-3's ceramics drives and build-1's cover drive, 2026-10-30. **Both already jump the
clock**; the cost is in how they must:

1. **A jump replays the interval it skips.** `advanceClock` drains every schedule the interval
   contains, then holds the clock until persistence is quiet (up to four minutes); ceramics then
   probes up to ten more. A jump costs about what it skipped. (Jumping again before the backlog lands
   once stacked ~21,000 queries and took the box down.)
2. **The drive's own characters live through it.** Ceramics' hand bled to death of scurvy at the
   weathering ground (run 20); the cover hand died of dehydration cutting wheat (drives 6–11) and froze
   in a field through a winter month (drive 8). So steps are capped at **4 game hours** while a body is
   logged in, every body is fed between steps, and the cover hand is parked indoors and walked to the
   standpipe.
3. **The drives verify seasons end to end** — a year of farming in ten-day jumps; clay weathered
   through a 30-day winter, bricks dried for weeks, clamps and kilns fired for days. A 30-day winter
   at 4-hour steps is ~180 jumps, each with its drain, settle, probe and feeding round.

## 2. ⭐⭐⭐ The rule **[DECIDED — the owner]**

**Every drive step declares its pace, and only instant and short steps may block a merge.**

| tag | means | blocks a merge? |
|---|---|---|
| **instant** | no clock involved | yes |
| **short** | a jump of hours, up to about a game day | yes |
| ⭐ **staged** | a span's *outcome*, reached by setting the state directly with wizard tools, then checked through player verbs | yes |
| **span** | weeks or seasons — a winter's weathering, a year of farming, a lining worn through | ⛔ **never** — the soak lane |

- **Span is set by the span skipped**, not by whether a jump is used: a jump's cost grows with the
  interval and with the bodies living through it.
- **Review and finalize never run span steps.** Neither does `/build`'s exit drive.
- ⭐ **A budget, not a judgment** **[LEAN]** — a blocking drive completes in well under half an hour
  of wall time. The rules that asked agents to judge (*isolate, don't drive*; *never make the user
  wait on verification*; *review rounds stay tight*) did not hold, because a step does not say how
  long it is. The tag does.

### ⭐⭐⭐ Every span step has a staged twin **[DECIDED — the owner]**

*"The note I've been giving to my agents, at least for the build and review phases, is to make use
of the whole palette of wizard tools to basically stage the state they need to verify what they're
trying to verify. You don't get to test that the clock actually produces that state, but you can test
everything around it. Most of the time that's probably good enough. For a finalize step, where you're
trying to do a comprehensive sweep to make sure you didn't break anything anywhere, you may or may not
want to use wizard tools that a player doesn't actually have, but it really depends on what's being
tested."*

A span step checks two things, and only one needs the clock:

| what is checked | how | when |
|---|---|---|
| **given the state, everything around it works** — the weathered heap kneads leaner, the frozen brick reads burst, the starved herd thins and none dies | **staged**: set the state with wizard tools, verify with player verbs | **blocks** — build and review |
| **the clock actually produces that state** — a winter really weathers the heap | the span itself | the soak lane, after merge |

- **The blocking drive carries a staged twin for every span step**, so nothing around a seasonal
  outcome goes unchecked before the merge; soak is left only the clock's part.
- ⚠ **A state that cannot be staged is tooling the build owes** — the in-world `eval` admits a short
  list of Apis, so some states may have no way to be set. The gap becomes visible work, never a
  nine-hour wait.
- **Finalize decides per step, and the step says which.** Setup may be staged freely. Where the thing
  checked is **the player's experience** — can a player do this, with what a player has — the
  assertion goes through player verbs and player-held tools, never wizard ones. Where it checks that
  nothing else broke, staging is fine. Each step carries, beside its pace, **`player`** or
  **`staged`** for how its assertion is made.

### Enforcement — structural, so it cannot be talked around **[LEAN]**

- **The harness refuses an untagged long jump** — `advanceWorldClock` past a game day outside soak
  mode fails as a defect *in the drive*; span steps run only with soak mode on.
- **Each requirements doc writes two drives** — a **blocking drive** (the exit criterion) and a
  **soak drive** (handed to the lane) — so the split is decided before code exists, not discovered at
  finalize.
- **The MR names its soak drive**, so the lane knows what to run after merge.

## 3. ⭐⭐⭐ The soak lane **[DECIDED — the owner's design; the details LEAN]**

A **standing session** — its own tmux window — watches master. After each merge it dispatches
subagents to run that build's soak drive against a fresh master world, and **files an issue** for
each failure. **It never blocks a merge.**

- **Its own worktree, detached at `origin/master`**, never committing code; **its own wire port and
  its own database** (one database per worktree; ports per worktree, so its preflight kills no
  sibling's server).
- ⚠ **One soak world at a time.** A drive world is ~3 GB and sibling servers starve it; the lane runs
  its queue serially rather than racing the build worlds.
- **A failure is an issue or a fix branch**, assigned like any other, with the drive's record
  attached.
- ⚠ **The risk, stated:** time-based defects land on master and are found after. **Before launch it
  is cheap** — no users, no data, drop-the-database doctrine. Revisit at launch, when a broken master
  costs real players.

## 3a. ⭐⭐ The lane, as set up 2026-10-30 **[DECIDED — the owner]**

*"I don't want to do it on GitLab servers because it costs compute, but I've basically always got
these Claude agents running on this workstation, so we can do it here."* And: *"for test failures I
think we'll probably wanna start using GitLab issues to track that."*

- **A script runs the drives; an agent handles only the failures.** Running a test and reading its
  result needs no judgment and should spend no tokens. `tools/soak` finds merges to master not yet
  soaked (the last SHA in a state file), checks each out, drops the soak database, runs the
  `*.soak.wire.test.ts` files that merge added or changed, and **files a GitLab issue labeled
  `soak`** with the record on failure (`glab`, local — no GitLab compute).
- **The triage session** — the `soak` tmux window's Claude, under the `/soak` skill — wakes on a
  `soak` issue, dispatches subagents to diagnose, and writes the diagnosis on the issue. The fix goes
  to a build worktree like any other work.
- **Soak drives are separate files**, `<feature>.soak.wire.test.ts`: the default wire run excludes
  `*.soak.*`, `pnpm wire:soak` runs only those, and *the MR names its soak drive* means it names the
  file.
- **Headroom-gated, overnight as the fallback.** The box has 15 GB shared with four build worlds and a
  drive world is ~3 GB, so the runner boots only with enough free memory and few enough worlds up, and
  otherwise waits for the night.

### Done

- ✅ the `soak` worktree, detached at master, never committing; database `saxonberg_soak`; wire port
  2020; the commit hook path set;
- ✅ `saxo` gains the `soak` window with `WIRE_PORT=2020` (and adds it to a live session from before);
- ✅ the `/soak` skill;
- ✅ the GitLab label `soak`.

### Owed — a small infra build in a build worktree

- the `*.soak.wire.test.ts` convention: excluded from the default wire run, `pnpm wire:soak`;
- `advanceWorldClock` refusing a jump past a game day outside soak mode;
- a machine-readable result the runner can read;
- `tools/soak`, the runner, with the headroom gate and the issue filing.

Until it lands the lane has nothing to run; its first consumers are build-1's cover and build-3's
ceramics span checks, once split out.

## 4. The quick fix — log drive bodies out across long jumps **[LEAN]**

A logged-out body is frozen (metabolism stops offline — shipped), so it needs no feeding and no
4-hour cap; and *a clock jump runs no brain*, so nobody needs to be present during one. Closing the
drive's sessions across a long jump removes the cap and the feeding rounds. Verify on one drive
before trusting the saving.

## 5. The two builds that remove the cost at the root **[LEAN]**

1. **Session-pace body needs** ([pace-slate](./pace-slate.md)) — hunger and thirst in played time,
   so a calendar jump cannot starve a logged-in body. The hands die because body needs are still on
   the calendar.
2. **Reconcile, don't replay** — a jump derives what the interval did rather than firing every
   scheduled event in it (the *unobserved simulation reconciles on read* doctrine), so a jump's cost
   stops growing with its span.

## 6. Open

1. **The short/span line** — a game day, or a wall-clock budget per step.
2. ✅ **Who triages** — the `soak` window's session, under `/soak`; fixes to a build worktree.
3. ✅ **The skills and workflow.md** — `/requirements`, `/plan`, `/build`, `/finalize` and
   `workflow.md` § *No merge waits on the clock* carry the rule (2026-10-30, the owner's request).
4. **The existing drives** — re-tagging build-1's and build-3's in flight, or from the next build on.
