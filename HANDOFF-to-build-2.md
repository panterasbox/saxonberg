# HANDOFF → build-2 — you are on a poisoned branch (2026-08-02)

**Urgent, and it is not your fault.** Stop before your next commit.

## What is wrong

`git worktree list` showed **`build-2` and `master` both checked out on
`[master]`**. Two worktrees sharing one branch ref have **separate
working trees** — so a commit from either one moves the other's `HEAD`
while leaving its files untouched. The other worktree is then **a stale
tree with a current HEAD**, and `git add -A` from it records **everything
it is missing as a deletion.**

This produced **three commits in one day** with mass deletions and
innocent-looking messages. One of them is yours.

## Your commit `fd017f0f` is unpushed and mostly a reversion

> `docs(wiki): the subject is a template path — withdraw DocumentedMixin`

Its real shape:

- **deletes 29 docs** — `discovery-slate`, `physiology-slate`,
  `mind-slate`, `pharma-slate`, `species-slate`, `vocations.md`, the
  apartment requirements+plan pair, and more;
- **reverts commit `aaf20abf`** — `education-videos.md` (−223),
  `cooperative-slate.md` (−603), the seven manifesto files,
  `locomotion-as-activity-slate.md`;
- ⭐ **the only genuine work in it is
  `docs/requirements/wiki-requirements.md` (+67 / −34).**

**`origin/master` is intact** (`b82e0bad`, zero deletions). Nothing is
lost as long as `fd017f0f` is never pushed or merged.

> ⚠ **Do not force-push, and do not merge `fd017f0f` into master.** A
> merge carries the deletions; a rebase replays them.

## Recovery

```bash
cd /home/bobalu/play/saxonberg/build-2
git status                     # commit or stash anything genuinely in progress first

# 1. save the only real content
git show fd017f0f:docs/requirements/wiki-requirements.md > /tmp/wiki-req.md

# 2. get off the shared branch, onto the good state
git fetch origin
git switch -C wip/wiki-requirements origin/master

# 3. re-apply your work, stage BY NAME
cp /tmp/wiki-req.md docs/requirements/wiki-requirements.md
git add docs/requirements/wiki-requirements.md
git commit -m "docs(wiki): the subject is a template path — withdraw DocumentedMixin"
git push -u origin wip/wiki-requirements
```

Then, once **no** worktree has `master` checked out, someone should
discard the poisoned tip:

```bash
git branch -f master origin/master
```

## The rules now (CLAUDE.md § Worktrees)

1. ⭐ **Never `git add -A` / `git commit -a`. Stage by name.** This alone
   makes the failure impossible — you cannot delete what you did not
   name.
2. **One branch, one worktree.** `build-N` stays on its own branch; the
   `master` worktree sits **detached** at `origin/master`.
3. `git rev-list --left-right --count origin/master...HEAD` — a non-zero
   **left** number means you are behind.

## A hook is now live and will stop you

`.bare/hooks/pre-commit` is installed and **already active in your
worktree.** It hard-blocks:

- committing on a branch another worktree also holds;
- deleting files while behind upstream (**the exact signature**);
- deleting more than ten files.

Deliberate bulk deletion only: `SAXONBERG_ALLOW=1 git commit …`

The tracked copy plus docs are on **`chore/worktree-guards`** — merge it
so fresh clones inherit the guard via `core.hooksPath`.

## ⚠ If you are recovering files yourself

- **On a stale tree an "addition" is a REVERSION, not work.** Do not
  salvage anything under `packages/`.
- **Net direction is a heuristic, not a rule** — one file at +17/−2 was
  real; another at +139 was pure staleness. **Read the hunks.**
