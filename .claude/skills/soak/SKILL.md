---
name: soak
description: Run the soak lane's triage session in the `soak` tmux window. Use when a GitLab issue labeled `soak` is filed (a span check failed after merge), or to check the lane's state. Diagnoses failures by dispatching subagents and writes the diagnosis on the issue; never commits code and never blocks a merge.
---

# Soak

The soak lane runs every merged build's **span** checks — weeks or
seasons of game time — after the merge, so that **no merge waits on the
clock** (`docs/workflow.md § No merge waits on the clock`,
`docs/slates/tails/soak-lane-slate.md`).

Two parts, and only one of them is you:

| part | is | spends tokens |
|---|---|---|
| **the runner** — `tools/soak` | a script: finds unsoaked merges, runs their `*.soak.wire.test.ts` files, files a GitLab issue labeled `soak` on failure | no |
| **you** — this session | triage: read a failure, diagnose it, write the diagnosis on the issue | only when something broke |

## Where you live

- **Worktree:** `/home/bobalu/play/saxonberg/soak`, **detached** at a
  master commit. ⛔ **Never commit here, never branch here.** The runner
  moves `HEAD` to the commit it is soaking; fixes go to a build worktree.
- **Your world:** database `saxonberg_soak` (yours to drop), wire port
  **2020** (`WIRE_PORT` is set on this tmux window). Never use another
  worktree's port or database.
- ⚠ **One world at a time, and only with headroom.** A drive world is
  ~3 GB and the box has 15 GB shared with four build worlds. Never boot a
  world while free memory is low or two or more build worlds are up; wait,
  or leave it for the overnight run. Tear your server down by PID when
  done.

## When an issue labeled `soak` arrives

1. **Read the issue and its attached record** — the soak file, the merge
   commit, the failing step and its output.
2. **Reproduce cheaply first.** Stage the state with wizard tools and
   check everything around it before re-running the span — the same rule
   the builds follow. Re-run the span only to confirm a fix's premise.
3. **Dispatch subagents for the diagnosis** when it needs reading across
   files; keep the conclusion, not the dumps.
4. **Write the diagnosis on the issue**: what failed, the cause if found,
   the smallest reproduction, the files involved, and which build or
   slate owns it. ⚠ Distinguish a **real defect** from a **broken drive**
   (a step that cannot fail, a wrong world, a port collision — a world
   missing a whole feature is a wrong-world collision, not a bug).
5. **Do not fix it here.** The fix is a branch in a build worktree, by
   whoever the owner assigns.

## Checking the lane's state

- `glab issue list --label soak` — open soak failures.
- `.soak/state` in the soak worktree holds the last SHA soaked; anything
  newer on `origin/master` is still queued. `tools/soak --dry-run` lists
  it — each first-parent commit and the soak files it would run.
- `.soak/log` — one line per file per run (`<time> <sha> <file>
  pass|fail|skipped <reason>`); `.soak/results/<sha>.json` — that run's
  `result.json` (per file, per test: state, ms, errors — the drive
  record); `.soak/server-<sha>.log` — the world's log, kept on failure;
  `.soak/run-<sha>.out` — the runner's own output for that run.
- **The runner itself runs in this window's second pane**:
  `tools/soak --watch`. It waits for the suite lock (the one
  `tools/suite` takes) and for memory (a 4 GB reserve plus a 3 GB
  world; the world alone 02:00–06:00), and says which it is waiting on.
  If it is not running, nothing soaks — start it.

## What an issue carries

Title `soak: <file> failed at <short sha>`: the file, the merge (SHA,
subject, MR), the run (time, wall, port, database), every failing step
with its message and stack, the whole drive record, and the server
log's last 120 lines. A repeat failure of the same file comments on the
open issue rather than filing another. An issue titled `soak: no result
for <sha>` means **the lane broke, not a build** — the run left no
readable `result.json`; read `.soak/run-<sha>.out`.

⚠ `glab` 1.36.0's `issue note` and `issue close` fail every call
(`rate: Wait(n=1) exceeds limiter's burst 0`). Comment and close
through the API: `glab api -X POST "projects/:id/issues/<iid>/notes" -f
body=…` and `glab api -X PUT "projects/:id/issues/<iid>" -f
state_event=close`.

## What you never do

- Commit, branch, push or merge from the soak worktree.
- Run a soak drive in a build worktree, or on a build's port.
- Re-run a whole span "to see if it passes now" — that is the waiting
  this lane exists to remove from everyone else.
