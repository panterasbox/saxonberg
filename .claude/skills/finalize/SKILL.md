---
name: finalize
description: Pre-merge sweep of a feature branch. Use after MR comments are resolved and before merging, to run the final code+docs audit, confirm the build was driven, graduate knowledge into docs/subsystems/, retire ephemeral plan and requirements docs, decide slate retention, and produce the sweep commit. Stops at a commit ready for merge; does not merge.
---

# Finalize

Drives Phase 5 of the workflow: the pre-merge sweep.

Read `docs/workflow.md` for the artifact taxonomy and retirement
rules. This skill walks the full sweep — code audit, doc sweep,
retirement decisions, the commit — and stops at a clean commit
ready for the user to merge.

## Inputs

- The current feature branch (already checked out).
- The target branch (typically `main` or `master` — confirm).
- The requirements doc, plan doc, and seeding slate(s) for this
  build — the requirements doc carries the **drive script**, the plan
  carries the **drive record** (under `docs/requirements/`,
  `docs/plans/`, and
  `docs/slates/{builds,tails,deferred-rpg}/` — see
  `docs/slates/README.md` for which folder a slate lives in).

## What to do

### 0. Take stock

- `git diff <target>...HEAD --stat` — see the full branch
  changeset.
- `git log --oneline <target>..HEAD` — see the commit story.
- Locate the requirements doc, plan doc, and seeding slate(s).
  Confirm with the user if any are ambiguous.

### 1. Code audit pass

Diff the whole branch (`<target>...HEAD`) and review *as if you
are a fresh reviewer who has not seen the build*. Look for:

- **Bad smells that crept in during MR iteration.** Casts (`as any`,
  `as unknown as X`), commented-out code, stub comments
  ("Idempotent in spirit"), TODOs without owners, dead helpers
  left over from a removed approach.
- **Antipattern violations.** Cross-reference
  `docs/antipatterns.md` — 84 sections, so consult it **for the areas
  the diff touches** rather than walking all of it. The judgment-greps
  below are the recurring few; ⭐ when one keeps recurring, the fix is
  to give it a census and a ratchet (`docs/lint-family.md`), not to add
  another paragraph here. Direct calls into mechanism where an Api
  method exists. Field-shaped inter-Stuff access. `obj.destroy()`
  instead of `StuffApi.destruct`. Two-word verbs. Etc.

  Part of this is mechanized — run the **whole** lint family and treat
  any failure as a blocker:

  ```bash
  pnpm -C packages/server lint:family
  ```

  ⚠ Do not name a subset here. The roster is derived from
  `package.json`, so this one command always runs every gate; the
  three-gate list this skill used to carry named 3 of 25. Per-gate
  rationale: `docs/lint-family.md`.

  The rest is judgment-grep — the lints can't catch these, so eyeball
  the branch diff for them:

  - **`ApiOnly` on an object mutator.** `git diff <target>...HEAD |
    grep -n 'SecurityPolicies.ApiOnly'` — any NEW `@CallSecurity(
    SecurityPolicies.ApiOnly)` on a *Stuff/mixin* method (not an Api
    static) is the "gate says nothing about who" antipattern. It wants
    a participant contract (`FromClass`/`FromMixin` + relational
    `where`). See `docs/antipatterns.md § ApiOnly as a Substitute for
    a Real Security Contract`.
  - **New `create()` sites.** `git diff <target>...HEAD | grep -nE
    'StuffApi\.(create|createSync)\('` — each new call must fit one of
    the four recognized categories (live-ref relational, minted
    unique, transient vessel, framework fallback). A
    statically-describable fixture/item/NPC/room wants a template +
    seed instead. See `docs/antipatterns.md § StuffApi.create()
    Instead of a Template`.
  - **A `*Logic` tier that holds no logic.** A new `platform/idea/api/<X>Logic.ts`
    whose every method is a verbatim forward to a registry/state
    singleton — collapse it (facade → registry direct). See
    `docs/antipatterns.md § A *Logic Tier That Holds No Logic`.
  - **`findReachable`-shaped manual walks.** A hand-rolled multi-leg
    containment/reachability walk with a predicate — should be an MQL
    seed (`person`/`reachable`) + local narrowing, or system mode for
    engine bookkeeping.
- **Missed requirements.** Walk the requirements doc's acceptance
  criteria — which are **observable from outside the code**, so
  satisfy them by *observing*, not by pointing at a test. Pointing at
  a test proves the test exists; the drives kept finding features
  whose tests passed and which no player could reach. The plan's
  wave acceptance and gate list is the place where tests count.
- **Stale doc references.** Comments or docstrings pointing at
  retired plan or requirements docs (`(see plan Q15)` style),
  retired Api names, renamed methods.
- **Privacy & contract.** `#`-private slots reachable through
  legitimate paths (proxy interaction). `public` fields where
  inter-Stuff readers should use a getter. Mixin internal state
  exposed by accident.

Fix issues in place. Don't open a separate branch.

### 2. The drive — prove it runs

⭐⭐ **Tests build state; they never use it.** Every build that was
driven found defects the suite could not: cooking 6, textiles 3, and
metal-chain's drive surfaced `five pre-existing boot-breaking defects`
that predated the build entirely.

The drive script lives in the requirements doc; the drive **record**
is appended to the plan (`farming-plan.md § Checkpoint A` is the
precedent). By this phase it should already have been run — it is the
exit criterion for the build phase, before the MR opens.

- **Record present.** Read it. Confirm every step of the script was
  actually run, and that anything it found was fixed rather than
  noted.
- **Record absent.** The build skipped its exit criterion. **Run the
  drive now**, before the sweep commit — and expect it to find things,
  because it always has.

Then check the **reachability chain** for each capability the build
added — the four links, each of which fails closed and *silent*:

| link | the failure it prevents |
|---|---|
| **verb** | a capability with no way to invoke it |
| **affordance** | a verb nothing confers (⚠ an affordance is a static on a class; a row's `commandContributions:` is dead silently) |
| **data** | the enabling rows absent — `feel`/`taste` shipped and had never run |
| **boot** | nothing warms the roster — the reference-Idea trap, three times now |

### 3. Doc sweep pass

For each subsystem the build touched:

- **Read `docs/subsystems/<name>.md`** and identify any claims that
  the build changed the truth of. Update them.
- **History note.** If the build's design→implementation shift was
  load-bearing (e.g. moved an Api method onto a class), add a
  brief history note at the bottom of the subsystem doc with a
  commit-range pointer. See the activity-subsystem and
  zone-subsystem precedents.
- **Surface naming changes.** If the build renamed public surface,
  search the whole `docs/` tree for the old name and update.

Then walk the meta-docs:

- **`CLAUDE.md`** — the Documentation Map at the top references
  every subsystem doc with a **one-line** blurb. If the build added
  a new subsystem doc, add a one-line map entry. NEVER expand an
  existing blurb into a summary — the doc owns all detail, and
  CLAUDE.md loads into every session's context (this map once grew
  to 128 KB of duplicated abstracts and had to be re-compressed).
  Same rule for the MongoDB Collections list: one line, pointing at
  the owning subsystem doc.
- **`docs/architecture.md`** — module taxonomy, mixin tables. New
  mixins, new Stuff classes, new Api classes go here.
- **`docs/antipatterns.md`** — if the build introduced a new
  pattern that should be preferred over a now-deprecated one, add
  a row.
- **`docs/ref-shapes.md`** — if the build added new reference-shape
  call sites (Pattern A / B / C / R2.1–R2.4), surface them.
- **`docs/roadmap.md`** — strike completed items.

### 4. Retirement decisions

Per `docs/workflow.md`:

- **Requirements doc** — *always retired*. `git rm
  docs/requirements/<feature>-requirements.md`.
- **Plan doc** — retire unless it preserves deferred-wave reference.
  Check the plan: does it have sections that explicitly describe
  work *not* in this build (e.g. "Wave 2 — deferred")? If yes,
  keep the plan; otherwise `git rm`.
- **Slate(s)** — kept by default. Retire *only* when the slate's
  design surface is fully absorbed. Signs the slate can retire:
  no open questions remain, no deferred design space, and a
  subsystem doc now covers everything the slate covered. Before
  retiring, salvage any remaining open questions into the
  consuming subsystem doc (the "graduate slate to subsystem doc"
  pattern — see the activity sweep and the globbable-slate
  retirement).

Surface the retirement decisions to the user before deleting.

When a slate retires, is added, or graduates from a `tails/`
near-absorbed candidate to fully-retired, update the index at
`docs/slates/README.md` so its build groupings stay accurate. A slate
that moves from new-substrate to shipped-with-a-tail moves from
`builds/` to `tails/` (and its row in the index moves with it).

### 5. Validation

⚠⚠ **The full suite costs ~15 minutes, and a green run stays valid
until a SOURCE file changes.** Read `docs/testing.md` § *A full run
stays valid until SOURCE changes*. Before starting one, check
mechanically — "I am about to commit" is not a reason:

```bash
git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$)'
```

- **Empty output** — the last full run still stands. **Do not re-run
  it.** Cite the number it gave in the sweep commit and move on. A
  docs-only sweep rides CI's gate job; re-running locally is doing CI's
  work by hand.
- **Non-empty** — the sweep touched code, so `pnpm test` once.

Either way:

- `pnpm build` — type-clean (cheap; always run).
- `pnpm lint` + the eight lint gates — clean (cheap; always run).

If anything fails, fix before committing. Don't ship a sweep commit
that breaks the suite — but don't buy that assurance twice.

### 6. The sweep commit

Two acceptable shapes (both have precedent in this repo):

**Combined.** One commit:
```
docs: pre-merge sweep for the <feature> build

<bulleted summary of code changes, doc changes, retirements>
```

**Split.** Two commits:
```
refactor(<area>): self-review cleanup + post-merge docs sweep
<bullets>

docs: retire <feature> plan and requirements
<one-line rationale>
```

Use *split* when the code cleanup and the retirement are
substantive enough to read separately. Use *combined* when they're
tightly coupled (the spawn-substrate sweep is the recent canonical
example).

Commit message rules:
- Lead with the build name.
- Bullet list of substantive changes (code: file → what; docs:
  file → what; retired: which files).
- End with a one-line status note: "All N tests pass; build is
  type-clean."
- Include the `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
  trailer.

### 7. Stop

Push the sweep commit when it's ready — no need to ask. The one
thing you never do on your own is merge: surface what you did and
hand back to the user for the merge.

> ⚠ **When a merge IS requested, do it on origin through the GitLab
> tool — never the git CLI.** A CLI merge joins in a *worktree* (the
> machinery CLAUDE.md § Worktrees exists to keep away from) and
> bypasses the MR, so the merge carries no review record. Catching the
> branch up first (`git merge origin/master` into the branch, verify,
> push) is a different act and is the right prep — it is what makes
> the MR's green tick mean anything.

## Posture notes

- **The code pass is independent of the requirements doc.** Smell
  checking finds things the requirements doc never spoke to.
  Don't treat the requirements as the *only* lens.
- **Don't be precious.** Plans and requirements docs are *meant*
  to be retired. The reluctance to delete a 100-page plan is
  natural — but the subsystem docs are the live reference, and
  leaving stale plans around encourages divergence.
- **Be conservative about slate retirement.** Slates often
  describe more than one build's worth of design surface. Default
  to keeping them; retire only when fully absorbed.
- **Tests are non-negotiable.** A failing suite means the sweep
  isn't finished. Fix the suite, even if the failure looks
  unrelated to the sweep changes.
