# Git workflow / in-runtime VCS slate (working doc)

> **Status: Wave 1 SHIPPED** (`feature/git-workflow`, MR !132) →
> [../../subsystems/git-workflow.md](../../subsystems/git-workflow.md) is
> the live reference. The `GitApi`/`GitLogic` pair + `git` verb + CMS git
> panel + the snapshot-and-push model + the permission-scoping spine +
> the identity model all landed. This slate is **kept** for the
> build-sized remainder (content/document→git via a Mongo→file export
> bridge, finer-than-branch review, per-user `/home` submodules). The
> design below is retained for those waves.
>
> **Original framing — model set, four decisions locked; the security
> spine is the hard part.** The **in-runtime VCS** brick the
> [provenance-slate](./provenance-slate.md) reserved — a `GitApi` that
> commits runtime-authored source to GitLab so version history, review,
> and rollback exist, and so a redeploy's fresh checkout carries every
> previously-published edit. **Source-only v1.** The load-bearing
> decision: **git operations are gated by the same per-path `can('write')`
> predicate as a direct source write** — git is never a permission bypass.

Working slate for the **git workflow over runtime authoring**. Today the
CMS and the `write` verb edit source files on disk (via `SourceTreeApi`
→ plain `fs.writeFile`) and hot-reload them live — but nothing captures
those edits into version control. There is **no git anywhere in the repo**
(no `simple-git`/`nodegit`, no `child_process`); an edit hits disk and is
durable only until the box is re-provisioned. This slate closes that: a
gated `GitApi` that turns runtime edits into commits, pushes them to
GitLab, and does so **without violating the authoring permission model**.

The four things the workflow must deliver (the author's stated goals):

1. **Version history** — a durable, inspectable record of every change.
2. **Review** — changes flow through review before they reach the stable
   line (whole-branch MR v1; finer-grained review is a named Wave 2).
3. **Rollback** — undo a change safely (`revert`), or (privileged)
   rewrite history.
4. **Durability across redeploy** — runtime edits land in GitLab, so a
   redeploy / fresh checkout of the branch reconstitutes them. Nothing is
   trapped on the box.

The load-bearing decisions:

1. **Two planes; git covers *source* only (v1).** The CMS writes three
   backends, but only one is files: **source** (`packages/server/src/mud`,
   git-native). **Content** (templates, `domain` collection) and
   **documents** (scripts, `documents` collection) are **Mongo rows** —
   git can't see them without a DB→file export. That export is the
   [content-packs](../tails/content-packs-slate.md) round-trip direction
   and is **deferred**; content is *not lost* on redeploy (Atlas persists
   independently of the box) — it's just **unversioned**. Source-only this
   cycle.

2. **The working tree *is* the live server → snapshot-and-push, not
   branch-and-isolate.** The mutable box runs `tsx` directly from its
   checkout, so a `git checkout <branch>` would swap **every author's**
   running engine. You therefore **cannot** use working-tree branches as
   the isolation mechanism. Instead the box lives on **one long-lived
   authoring branch**; edits accumulate as working-tree changes; a
   **publish** commits and pushes them; **isolation and review move up to
   the MR layer.**

3. **One push credential, per-avatar authorship.** Git separates *pusher*
   / *committer* / *author*. Use **one shared machine token** to push and
   **`--author` every commit to the acting avatar** (from
   `getActingAuthor` — context-derived, never a call argument). The git
   author field is a **convenience mirror** of the authoritative
   `AuthoringEvent` ledger; honest by construction because `GitLogic` sets
   it. Use a **synthetic email** (the repo is public — never leak a real
   Google address into commit metadata).

4. **Permission-scoped git ops — the security spine (default-deny).**
   Every git operation resolves to an **affected-path set**, and must pass
   the **same `can(actor, 'write', resolveSourceFolderZone(path))`
   predicate** the direct source-write path (`_writeSource`) already uses.
   A git commit can never touch a file a direct `write` couldn't. Ops that
   can't be path-scoped (whole-tree history rewrites) are gated by
   **privilege** instead.

See also:

- [provenance-slate](./provenance-slate.md) — the **parent**: this is its
  reserved *in-runtime VCS* remainder. The shipped `AuthoringEvent` ledger
  ([provenance.md](../../subsystems/provenance.md)) is both the per-avatar
  authorship mirror and the **path→author** key that later powers
  author-scoped review.
- [cms-slate](./cms-slate.md) — the surface that produces the edits; its
  deferred **law==code forums-review gate** is where finer-than-branch
  review lands (Wave 2 here). Its *Forward constraint (decision A)*:
  the review/versioning model stays **storage-agnostic**.
- [docs/subsystems/cms.md](../../subsystems/cms.md) — the `CmsLogic` write
  chokepoint + the `_writeSource` gate this slate reuses verbatim.
- [docs/subsystems/access.md](../../subsystems/access.md) /
  [parcel.md](../../subsystems/parcel.md) — `AccessApi.can` /
  `isWizard` / the parcel-title ownership the path-scoping rides.
- [docs/deployment.md](../../deployment.md) — the **dev (mutable) vs prod
  (immutable)** box split; the doc already reserves "the future `GitApi`
  operates on that [writable checkout] tree." `deploy-dev` (git pull +
  restart) is the redeploy step that reconstitutes published edits.
- [docs/subsystems/shell-author.md](../../subsystems/shell-author.md) —
  the wizard shell where the `git` verb is afforded (AuthorMixin).

---

## Principle

1. **Snapshot-and-push** (the working tree is the live server; isolation
   is an MR-layer concern, not a working-tree-branch concern).
2. **Source-only v1** (content/document → git waits on a Mongo→file
   export bridge).
3. **Per-avatar authorship over one shared push credential** (author ≠
   pusher; git author mirrors the `AuthoringEvent` ledger).
4. **Permission-scoped ops, default-deny** (affected-path-set →
   `can('write')`; git is never a permission bypass).
5. **Privilege-gate the un-scopable** (history rewrites are whole-tree →
   an admin tier, not a zone author).

---

## The branch model — box-on-`authoring`

The mutable box's working tree sits on a long-lived branch (`authoring`),
**not** `master`. This makes the git mechanics plain:

- Runtime edits leave the tree **dirty on `authoring`**.
- **`git publish -m "…"`** ≈ `git add <permitted> && git commit && git
  push origin authoring`. A commit changes no file on disk (it records
  what's already there), so HEAD advances **along the branch the box
  already tracks** — no checkout, no swap, no live-server hiccup.
- `master` is the reviewed, stable line below. **`authoring → master` via
  MR** on approval. Immutable-prod images are cut from `master`; the live
  bleeding-edge box runs `authoring`.
- **Redeploy** = `deploy/dev/update.sh`'s `git pull --ff-only` (or fresh
  clone) → the working tree returns with **every published edit**.
  **Verified:** `update.sh` does *not* hard-code a branch — it pulls
  whatever the box has checked out, so tracking `authoring` needs **no
  script change**, just `git checkout authoring` once at standup. And the
  script **already anticipates `GitApi`** — its `--ff-only` is commented
  "once authoring edits the tree live (GitApi), this refuses to clobber
  local work and surfaces the conflict instead." After a `publish` pushes
  to `origin/authoring`, local == remote, so the pull is a clean
  fast-forward. **The one change needed is the CI trigger**, not the pull:
  `deploy-dev`'s rule fires on `$CI_DEFAULT_BRANCH` (master), so it must
  change to fire on `authoring` pushes — else the trigger (master) and the
  pulled branch (`origin/authoring`) mismatch.
- **Backflow:** when `master` gains commits from elsewhere, `authoring`
  absorbs them (`git merge master`) — a maintenance op, not part of the
  hot loop.

**One branch, not many.** Multiple authoring branches only earn their keep
with multiple dev instances each running a different branch — overkill
until those instances exist. Single `authoring` is the v1.

### Goal → mechanism

| Goal | How it's delivered |
|---|---|
| Version history | every `publish` is a commit on `authoring`; full log / blame / diff |
| Durability across redeploy | `publish` pushes immediately; redeploy pulls `authoring` → edits reconstituted |
| Rollback | `revert <sha>` (additive, per-actor, scoped); `reset`/force-push (privileged, whole-tree) |
| Review | MR `authoring → master` (whole-branch v1; author/slice-scoped = Wave 2) |

---

## The identity model

Three git identities, only one shared:

- **Pusher** — one **machine/project access token** (`write_repository`
  scope), in the box `.env` via SSM, read only inside `GitLogic`, never
  caller-supplied. The box is one machine; it authenticates as one bot.
- **Author** — `--author="<Avatar Name> <playerid@saxonberg.local>"`,
  resolved from `getActingAuthor` (the anti-spoof rule). **Synthetic
  email** — the repo is public; real addresses must not enter history, and
  synthetic ones won't accidentally link commits to unrelated GitLab
  accounts.
- **Committer** — the bot (irrelevant to attribution).

The git author is a **best-effort mirror** of the un-spoofable
`AuthoringEvent` ledger — honest because `GitLogic` derives it from
context, forgeable-in-general but not through this pipeline. No commit
signing (would bind the bot key, not the avatar; the ledger is the real
provenance).

---

## The security spine — permission-scoped operations

Every op resolves to an **affected-path set**; the actor must pass
`can(actor, 'write', resolveSourceFolderZone(path))` — the **exact
predicate `_writeSource` uses today** — for every path in it. Same gate,
same spine, so **git cannot touch a file a direct write couldn't.**

| Op | Affected-path set | Rule |
|---|---|---|
| `status` / `diff` / `log` | (read) | `isWizard` (source-read tier), no path gate |
| **`publish`** | the **dirty files** | stage **only the writable ones**; commit those; leave the rest dirty for their owner. → naturally **per-owner scoped** (Alice's publish commits Alice's files; Bob's stay pending) |
| **`revert <sha>`** | paths in that commit's diff | require `can('write')` on **all** of them; else **reject** with a clear message. (Partial/scoped revert = a refinement, not v1.) |
| `reset` / force-push / rebase | **whole tree** — un-scopable | gated by **privilege** (archwizard / a repo-admin tier), not by path |

The convergence worth noting: **the permission filter on `publish` *is*
the per-author slicing** — you commit only what you own, so multi-author
edits to one live tree split into per-owner commits for free. That's the
same key (`AuthoringEvent` path→author, and the parcel-title `can`) that
Wave-2 author-scoped review will drive on.

The honest cost: computing the affected-path set for `revert` means
diffing commits and mapping every touched path through
`resolveSourceFolderZone` → `can`. More work than wrapping git — but it's
exactly what keeps `GitApi` from being a hole in the access model, so it's
non-negotiable.

---

## Module shape

Standard Api + logic-singleton pair (no new module category):

- **`api/git.ts` — `GitApi`** — thin gated forwarding shell; statics
  `status` / `diff` / `log` / `publish` / `revert` (+ privileged `reset`),
  ends with `SecurityApi.decorateApiClass`.
- **`obj/api/GitLogic.ts` — `GitLogic extends ApiLogic`** — the mechanism;
  every method `@CallSecurity(FromModule('/api/git#GitApi'))`; owns the
  affected-path-set computation + the `can('write')` loop + the
  credential read. HMR-able at `/obj/api/git`.
- **New dependency:** `simple-git` (thin wrapper over the `git` binary) —
  a **shell-exec surface**; flag it for review. (Alternative:
  `child_process` directly — fewer deps, more plumbing.)
- **Gating:** `isWizard` (git touches code = the **code-trust axis**, same
  as `_writeSource`), further narrowed per-path by `can('write')`.
- **Surfaces:** a **`git` shell verb** (`system` category, AuthorMixin-
  afforded, wizard-gated, subcommands `status`/`diff`/`log`/`publish`/
  `revert`) + a **CMS diff/commit panel** — both thin over the one gated
  `GitApi`.
- **Free property:** a pushed feature branch (or `authoring`) trips the
  existing `.gitlab-ci.yml` **validate** pipeline (lint/test/build), so
  runtime-authored code goes through the same CI gate as any hand-written
  MR. Authoring live doesn't skip validation.

---

## The environment guarantee

The premise "prod isn't a git repo" resolves under the two-box split:

- **Mutable box** (today's live instance) *is* a checkout — the only place
  `GitApi` operates. Standup must guarantee the `git clone`
  ([deployment.md](../../deployment.md) step 3 already specifies it); if a
  box was set up without it, that's the one prerequisite. `git status`
  **fails loud** ("not a git working tree") rather than silently
  no-op'ing.
- **Immutable prod** (Docker image from a tag; deferred) is *deliberately*
  not a repo and is **never authored on** — so `GitApi` simply isn't
  active there. No contradiction: author on the box with a tree; ship
  images from tags for the one without.

---

## Open questions / forks

1. **MR base** — `authoring → master`, the box tracks `authoring`,
   `master` is the reviewed line. *Verified:* `update.sh` pulls the box's
   checked-out branch (no hard-coded branch, no script change — just
   `git checkout authoring` at standup) and its `--ff-only` already
   anticipates GitApi. The **`deploy-dev` CI rule** must move from
   `$CI_DEFAULT_BRANCH` to `authoring`. *Lean: box-on-`authoring`,
   confirmed viable.*
2. **The admin tier for `reset`/force-push** — reuse **archwizard**
   (conferral axis) or a new repo-admin capability? *Lean: archwizard v1;
   history rewrites are rare + destructive.*
3. **`simple-git` vs raw `child_process`** — a dep vs hand-rolled exec.
   *Lean: `simple-git` (typed, less footgun) — flag the new dep.*
4. **Does `publish` further filter by *author* beyond *permission*?**
   Permission-scoping may capture another author's in-progress edits
   inside a zone you own. *Lean: permission is the v1 floor; author-level
   filtering is a Wave-2 nicety.*
5. **Divergence warning** — `git status` should warn when the tree carries
   un-merged/un-pushed divergence (the "second snapshot before the first
   MR merges stacks changes" edge). *Lean: warn, don't block.*

---

## Build order

**Wave 1 — the source VCS spine.** `GitApi`/`GitLogic`; the
box-on-`authoring` model + `deploy-dev` pull-target change; `git`
verb (`status`/`diff`/`log`/`publish`/`revert`); the **identity model**
(shared token + per-avatar `--author` + synthetic email); the **security
spine** (affected-path-set → `can('write')`; `publish` stages only
writable; `revert` rejects on out-of-scope paths); `reset`/force-push
behind the admin tier; the "not a git working tree" guard. Tests: a wizard
publishes an owned-zone edit (commit lands, pushed, `--author` = them); a
`revert` of a commit touching an unowned path is rejected; `publish`
leaves an unowned dirty file uncommitted; a redeploy reconstitutes a
published edit.

**Wave 2 — finer review + the CMS panel.** The CMS diff/commit panel;
**author-scoped / slice-scoped review** riding the cms-slate's forums
review gate (drives on `AuthoringEvent` path→author + the permission
slice); auto-open-MR via the GitLab API (deferred credential/logic).

**Wave 3+ — content into git + personal repos.** The **Mongo→file export**
bridge (shared with [content-packs](../tails/content-packs-slate.md)) so
template/document content becomes git-trackable; **per-user `/home/<id>/`
subrepos** (git submodules / personal remotes) so a player branches/merges
their sandbox freely — *blocked on home code being file-backed* (today
it's Mongo `documents`, and git needs files; the export bridge is the
unlock).

---

## What this slate does NOT cover

- **Content / document versioning** (templates + scripts → git) — needs
  the Mongo→file **export** direction; deferred to the content-packs
  round-trip. Content is unversioned, not lost.
- **Finer-than-branch review** (slice/commit/author-scoped) — the
  cms-slate's forums-review gate; Wave 2.
- **Per-user `/home/<id>/` submodules** — blocked on file-backed home
  code; Wave 3.
- **Auto-open-MR / GitLab API integration** — Wave 2 convenience.
- **Working-tree branch checkout, multi-instance branch topologies,
  in-CMS merge-conflict resolution** — out of scope by the
  snapshot-and-push model.
- **Commit signing / verified commits** — the `AuthoringEvent` ledger is
  the authoritative provenance; the git author field suffices.
- **The immutable-prod image/tag pipeline** — [deployment.md](../../deployment.md)'s
  concern, not authoring.

---

## Once shaped into formal requirements

This slate boils down to:

- A gated **`GitApi`/`GitLogic`** pair (new `simple-git` dep) + a **`git`
  verb** + a **CMS panel**, over the **box-on-`authoring`** snapshot-and-
  push model.
- The **identity model**: one shared push token; per-avatar `--author`
  from `getActingAuthor`; synthetic public-safe email; git author as a
  mirror of the `AuthoringEvent` ledger.
- The **security spine**: every op → an affected-path set → the existing
  `can('write', resolveSourceFolderZone(path))` gate; `publish` stages
  only writable dirty files (per-owner scoping falls out); `revert`
  rejects on any out-of-scope path; `reset`/force-push behind an admin
  tier; default-deny throughout.
- The **redeploy durability** property: `publish` pushes to GitLab;
  redeploy pulls `authoring`; edits reconstitute.
- Tests: publish an owned edit (attributed + pushed + CI-triggered);
  revert-out-of-scope rejected; unowned dirty file left uncommitted;
  redeploy reconstitutes; "not a git working tree" fails loud.

Content→git export, finer-grained review, auto-MR, and per-user subrepos
wait for their own waves.
