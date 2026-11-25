---
name: merge
description: Merge the current build's MR — the owner runs /merge when they believe the build is ready. Re-checks every pre-merge gate fresh (pushed, master current, the full suite green on this exact source, the drive and walk recorded, the MR mergeable), merges through the GitLab tool only if every check passes, and otherwise lists what is not verified and asks. Never merges on memory of an earlier "ready".
---

# Merge

The owner runs this when they think the build is ready to merge.
**Running it means *merge if it is verified*. It does not mean *merge
regardless*.** Nothing said earlier in the conversation counts as evidence
here: every check below is run fresh, now, against the code that would
land.

Why this skill exists: on 2026-11-21 MR !644 was merged with its final
full suite still queued. The agent had written that the MR would be
"ready once it passes", the owner said "merge it", and the agent merged.
The owner: *"if I see the words 'merge' and 'ready' in a conversation
where the whole point is finishing the build and merging, it's not a
stretch what I'm going to conclude."*

## Inputs

- The MR: an argument (`/merge 648`), else the open MR whose source branch
  is the branch checked out in this worktree. If there is neither, or the
  MR's source branch is not this worktree's branch, stop and say so. This
  skill verifies the worktree it runs in.

## 1. Run every check, in order, each as its own step

Never batch the merge call with any of these: the result of each check
decides whether the next step happens at all.

| # | check | how | passes when |
|---|---|---|---|
| 1 | **worktree** | `./tools/wt-status` | on the MR's branch, nobody else holds it, clean |
| 2 | **pushed** | `git fetch origin <branch>`; compare `HEAD` with `refs/remotes/origin/<branch>` | identical (⚠ not `@{u}`: a branch made from master tracks master) |
| 3 | **master** | `git fetch origin master`; `git rev-list --left-right --count origin/master...HEAD` | left = 0. If left > 0 **and** `git diff --stat HEAD...origin/master` touches source (anything but `docs/` and `*.md`), it fails: master must be merged in and re-verified first. A docs-only lead passes, and say so |
| 4 | **full suite** | `tools/source-fingerprint` against the first field of `.suite/green` | equal. Quote the line (sha, time). Absent or different fails, with no exceptions: a `test:near` run, a narrowed run or a run from before the last source commit is **not** the suite |
| 5 | **lint family** | there is no record. Find the last `lint:family` run in this session and the last source commit | the run came after the last source commit. If you cannot show that, it is **unverified**, which is not a pass |
| 6 | **drive** | `.suite/drive-green` (written by `/finalize` § 2: `<fingerprint> <sha> <time> drive <n>/<m> walk <n>/<m>`) | its fingerprint equals `tools/source-fingerprint` **and** both counts are full (or a red step is explicitly waived by the owner — quote it). If the fingerprint differs, apply **§ 1b** — never fail it on timestamps alone |
| 7 | **walk** | the same line's `walk` count | as 6 — the walk is recorded with the drive and judged with it |
| 8 | **soak drive** | the MR description | names the soak drive file for the soak lane |
| 9 | **MR** | `mcp__gitlab__get_merge_request` | open, not draft, no conflicts, `detailed_merge_status` mergeable; note the pipeline state |

## 1b. When the drive record's fingerprint is behind

A drive and a walk cost the better part of an hour, and master moves
several times a day while four builds land — so a rule of *"any source
commit since the drive stales it"* is a rule that never lets a build merge
(2026-11-24: three `/merge` runs in a row found nothing mergeable). Judge
the gap instead, and show your working in the table:

1. `git log --format='%h %s' <record sha>..HEAD -- . ':(exclude)docs' ':(exclude)*.md'`
   — every source commit since the recorded run.
2. **A commit of this branch's own** (not a merge of master) **stales the
   record.** The build changed what it drove: ✗, re-drive.
3. **A merge of master** stales it only if what it brought touches what
   the drive or walk exercises: `git diff --stat <merge>^1 <merge>` —
   name the files, and say for each whether the drive's flows go through
   it (its verbs, the subsystems its steps read, the harness). Untouched
   → ✔, quote the reasoning in one line. Touched → ✗, re-drive.
4. Unsure is **?**, which counts as ✗ — say what you would check.

The suite (check 4) is NOT judged this way: it is recorded mechanically,
and a fingerprint change always re-runs it. Only the drive and the walk,
which are too slow to re-run on every merge of somebody else's code, get
this judgement — and it is a judgement you must show, never assume.

## 2. Report — one table, then one of two endings

Show the owner the table: each check marked **✔ passed**, **✗ failed** or
**? unverified**, with the evidence in one line each (a sha, a count, a
quoted record line). Unverified counts as failed for the decision below.

⛔ The words *ready* and *merge* appear in this report only in these two
endings:

- **Every check ✔.** Say *"All nine checks pass — merging."* Then call
  `mcp__gitlab__merge_merge_request` with the MR's current `sha` (so a
  push that lands between the check and the call refuses the merge rather
  than merging untested code).
- **Anything ✗ or ?** Say **"Not ready — I have not merged."** List what
  failed or is unverified and what it would take to fix each one, with a
  time. Then ask: wait for the fix, or merge without it? Merge only on an
  explicit answer to *that* question, naming the gaps. The original
  `/merge` is not that answer.

`tools/hooks/guard-merge` prompts the owner again at the merge call if
`.suite/green` does not match. That prompt is a backstop for this skill.
It never replaces the table.

## 3. After the merge

- Confirm on GitLab: the state is merged, and quote the merge commit sha.
- Set `.build-phase` back to `build` (or delete it) if the worktree is
  done.
- Tell the sibling build sessions it landed (names they should grep for
  if anything was renamed or removed), and tell the soak lane the soak
  drive's file. Use SendMessage, by name.
- Update the build's memory file to MERGED with the sha and the lessons.

## Never

- Merge with the git CLI (CLAUDE.md § Worktrees rule 8).
- Treat a check as passed because it passed earlier, because a sibling's
  run passed, or because "only docs changed" without running check 3's
  diff.
- Start the full suite from this skill to make check 4 pass. Report it
  failed and give the time a run takes. Starting it is the owner's call,
  and it is never the moment to start it in the background.
