---
name: build
description: Execute an agreed implementation plan end to end, in a fresh context, and stop only when the MR is open. Use when a plan exists at docs/plans/<feature>-plan.md and the build is ready to start. Runs the wave loop, drives the feature, opens the MR, and reports the number.
---

# Build

Drives Phase 3 of the workflow: an agreed plan → an MR ready for
review.

Read `docs/workflow.md` for the phase rules. Everything this skill
needs is in the plan, the requirements doc, and `CLAUDE.md` — this
phase deliberately starts with **fresh context**, because a good plan
is self-bootstrapping and the design conversation is finished.

## ⭐⭐ The completion contract: the build does not stop

> **Run to the MR. Decide what needs deciding, record it, keep going.**

Not "prefer not to stop" — **do not stop.** Not at a wave boundary, not
to report progress, not to confirm something the plan already decided,
not to ask whether to keep going. The user's instruction is explicit:
*"I don't want the build to ever stop really ever. We have enough
guidance out there that hopefully the agent can make the decisions it
needs."*

**When something is undecided, decide it in this order:**

1. The **requirements doc** — if it settles it, that is the answer.
2. The **plan** — including its decisions (D1, D2…) and Grounding.
3. **`docs/design-lenses.md`** — the five lenses. Lenses 1 (pedagogy)
   and 2 (author expressiveness) decide forks. ⭐ When they decide one,
   decide it; say in one line which limb chose.
4. **`CLAUDE.md` + `docs/antipatterns.md`** — the conventions.
5. **The nearest existing pattern in the code.** Follow it rather than
   inventing; consistency beats cleverness at this altitude.

Then **record it** — a line in the plan's decisions section, and a line
in the MR description. That recording is what makes not-stopping safe:
every decision the build made is in one place when review starts.

### ⚠ The rules that look like "stop and ask" are not

`CLAUDE.md` says to get sign-off before a **new module category**, a
fresh **`eslint-disable no-restricted-syntax`**, a **new Mongo
collection**, or a new **lint exemption**. Read them as what they are:
*don't do that thing.* The doc answers it itself — **"the answer is
almost always 'fold it in,' not 'add an exception.'"** So take the
compliant path (fold the helper into an Api or the owning class;
persist under the document tree; put the mixin on the right host so no
exemption is needed) and keep building. The rule is a constraint, not a
checkpoint.

### The only real stops

A short, closed list. If you are considering stopping and the reason is
not on it, it is not a stop:

1. **The branch is held by another worktree**, or the worktree is
   behind/stale — a data-loss hazard (`CLAUDE.md § Worktrees`). Fix the
   worktree situation or stop; never build through it.
2. **A credential or permission you do not have** and cannot obtain.
3. **An irreversible act outside the plan's scope** — dropping data
   that is not a dev DB, force-pushing a branch you do not own, merging
   (the merge is always the user's).
4. **No compliant path exists** — every route to the plan's goal
   requires one of the sign-off exceptions above. Rare; and it usually
   means a host-placement decision upstream was wrong, so re-plan that
   wave first before concluding it.

If you do stop: **push the branch**, write exactly where and why in the
plan, and say what you would do next. A stop that loses work or leaves
the state unreadable is worse than the thing that caused it.

## What to do

### 0. Orient

```bash
./tools/wt-status
```

Which branch, does anyone else hold it, am I behind, is anything
unpushed. Confirm you are in the worktree the user named and **not** in
`master` (documents only). Create the feature branch if it does not
exist.

⚠ If the pack graph changed on master recently (a pack renamed, added
or removed), run `pnpm install` before trusting any test result — a
stale `node_modules` fails every pack suite at collection with a
`PackLogic` "Cannot find module" that reads like a repo defect.

### 1. Load the inputs

The plan, the requirements doc, `CLAUDE.md` in full, and the subsystem
docs the plan names in **Critical files**. Nothing else up front — the
plan's Grounding section already did the survey.

### 2. The wave loop

For each wave in order:

1. Implement it.
2. Verify: `pnpm test:near`, the touched packs' own vitest, and the
   lint gates the plan named (`pnpm -C packages/server lint:family`
   runs all 25 in ~85s and is cheap enough to run often).
3. **Commit** — `build(<feature> W<n>): <what the wave did>`.
4. **Update the plan**: mark the wave done, and add a one-or-two-line
   note — what changed, what you decided, what surprised you.

⭐ That note is not bookkeeping. MR review usually outlives the context
window; when the session compacts, the plan doc is what the review is
reconstructed from. Write it for the person who has forgotten.

⚠ A wave whose premise turns out to be wrong gets **re-planned in
place** and the build continues (`plan(bulk): W2 done; W3's premise was
wrong` is the precedent). That is not a stop.

### 3. The full suite — once

`pnpm test` (~15 min) runs at exactly two moments in a cycle: **here,
before the MR opens**, and again at `/finalize`. Everything in between
is `test:near` + the lint family. Never start it in the background.

### 4. Drive it — the exit criterion

Run the **drive script** from the requirements doc against the running
game, and append the result to the plan as the **drive record**.

⚠ Expect it to find things: tests build state, they never use it. Every
build that was driven found defects the suite could not — cooking 6,
textiles 3, and metal-chain's drive surfaced five *pre-existing*
boot-breaking defects. **What it finds becomes more waves, not a
stop.** Fix, commit, re-drive.

Then check the four reachability links for each new capability —
**verb · affordance · data · boot** — each of which fails closed and
silent.

### 5. Push and open the MR

Push the branch and open the MR against `master` — neither is gated on
the user; only the merge is. The description carries:

- what shipped, wave by wave;
- ⭐ **every decision the build made** that the plan did not, and what
  decided it;
- what the drive found;
- anything the user should look at first.

### 6. Report the MR number, and stop there

Review is the user's, and it is a conversation — not a comment-thread
loop. Stay in this session for it: the build context is what makes
review cheap.
