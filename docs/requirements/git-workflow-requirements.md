# Git workflow / in-runtime VCS — requirements

The CMS and the `write` verb edit engine source on disk (via
`SourceTreeApi` → `fs.writeFile`) and hot-reload it live, but **nothing
captures those edits into version control** — there is no git anywhere in
the repo, so a runtime edit is durable only until the box is
re-provisioned. This build closes that gap: a gated **`GitApi`** that turns
runtime source edits into commits pushed to GitLab, giving **version
history, review, rollback, and durability across redeploy** — and does so
**without violating the source-authoring permission model** (git is never a
permission bypass). It is the **in-runtime VCS** brick the
[provenance-slate](../slates/builds/provenance-slate.md) reserved, seeded
by [git-workflow-slate](../slates/builds/git-workflow-slate.md). **Source
plane only**; template/document (Mongo) content → git waits on a future
export bridge.

## Goals

- **Runtime source edits become durable, versioned commits.** A wizard's
  live source edit can be captured as a git commit, pushed to GitLab, and
  reconstituted by a fresh checkout on redeploy — nothing is trapped on the
  box.
- **Every git operation respects the source-write permission model.** An
  operation can only affect files the actor could write directly; git
  reuses the same per-path `can('write')` gate as `_writeSource`, so it
  opens no new authorization surface.
- **Commits are attributed per-avatar over one shared push credential.**
  Authorship is derived from execution context (never a call argument) and
  mirrors the authoritative `AuthoringEvent` ledger; the box pushes as one
  machine identity.
- **Additive rollback exists.** A wizard can `revert` a commit (scoped to
  files they may write), keeping full history.
- **Review flows through an MR.** Published edits accumulate on a long-lived
  authoring branch that is merged to the reviewed line (`master`) via an
  ordinary merge request (whole-branch review this cycle).
- **Two surfaces over one gated core.** A `git` shell verb and a CMS
  git panel both drive the same `GitApi`; neither reimplements the
  mechanism or the gate.

## Non-goals

- **Content / document versioning (templates + scripts → git).** These live
  in Mongo; git can't see them without a DB→file export. Deferred to the
  [content-packs](../slates/tails/content-packs-slate.md) round-trip; content
  is *unversioned*, not lost (Atlas persists independently of the box).
- **History rewrites — `reset` / force-push / rebase.** Rollback is
  additive (`revert`) only this cycle. The destructive, un-path-scopable
  ops and their admin-tier gating are deferred.
- **Finer-than-branch review** (slice / commit / author-scoped MRs). Rides
  the [cms-slate](../slates/builds/cms-slate.md) law==code forums-review
  gate; Wave 2. The permission-floor `publish` already produces per-owner
  commits as the substrate for it.
- **Per-user `/home/<id>/` submodules / personal remotes.** Blocked on home
  code being file-backed (today it's Mongo `documents`); unlocked by the same
  export bridge. Wave 3.
- **Auto-open-MR / GitLab API integration.** `publish` pushes a branch; the
  human opens the MR in the GitLab UI. Deferred.
- **Working-tree branch checkout, multi-instance branch topologies, in-CMS
  merge-conflict resolution.** Ruled out by the snapshot-and-push model.
- **Commit signing / verified commits.** The `AuthoringEvent` ledger is the
  authoritative provenance; the git author field suffices.
- **Executing the live-box topology migration.** The box's `git checkout
  authoring` and the SSM push-token provisioning are manual ops steps
  (they touch live infrastructure, unverifiable in CI). This build
  *documents* the migration in `deployment.md`; it does not perform it, and
  the feature merge does not flip the live box.

## Surface decisions

### Branch topology — box-on-`authoring`, snapshot-and-push

The working tree **is** the live server (the box runs `tsx` from its
checkout), so working-tree branch switching is forbidden — it would swap
every author's running engine. The box instead tracks one long-lived
`authoring` branch; edits accumulate as working-tree changes; `publish`
commits and pushes them; **isolation and review move up to the MR layer**
(`authoring → master`, whole-branch). `master` is the reviewed line;
immutable-prod images are cut from it.

**Verified against the deploy path:** `deploy/dev/update.sh` does
`git pull --ff-only` on the box's *checked-out* branch (no hard-coded
branch), and its `--ff-only` was **already chosen to anticipate `GitApi`**
("refuses to clobber local work and surfaces the conflict"). So adopting
`authoring` needs **no `update.sh` change**. The one real change is the
`deploy-dev` **CI rule**, which fires on `$CI_DEFAULT_BRANCH` (master) and
must fire on `authoring` pushes instead — otherwise the trigger and the
pulled branch mismatch. That CI-rule edit + the box checkout + token
provisioning are a **coordinated migration documented in `deployment.md`**,
executed deliberately (not landed in the feature merge, which would break
live deploy while the box is still on `master`).

### Rollback — `revert`-only

Ship additive `revert` (per-actor, permission-scoped, history-preserving).
Force-push / `reset` / history rewrite — the whole-tree, un-path-scopable,
admin-gated ops — are **out of scope** this cycle. Prod rollback stays a
separate image/tag concern.

### Client surface — shell verb **and** CMS panel

Both land in v1: a `git` shell verb (`status` / `diff` / `log` / `publish`
/ `revert`) and a CMS git panel (dirty-file/diff view, commit message,
publish; log; revert). Both are thin over the one gated `GitApi`; the panel
is REST-only and reuses the CMS attribution bridge.

### `publish` scope — permission-floor

`publish` stages **all dirty files in zones the actor can write**
(`can('write', resolveSourceFolderZone(path))`), commits those, and leaves
the rest dirty for their owner. It does **not** additionally filter to files
the actor personally authored — a zone owner may publish another author's
in-progress edits within their own zone, which is acceptable (they own the
zone). This matches the existing `_writeSource` gate exactly. Per-owner
commit slicing falls out of the permission filter for free; finer
author-level filtering is a Wave-2 nicety.

### Identity — one push credential, per-avatar authorship

One shared **GitLab project access token** (`write_repository` scope) in
the box env via SSM, read only inside `GitLogic`, never caller-supplied —
the transport/pusher identity (the box is one machine). Every commit is
`--author`'d to the **acting avatar**, resolved from
`ExecutionContextApi.getActingAuthor` (context-derived, anti-spoof), with a
**synthetic public-safe email** (`<playerid>@saxonberg.local` or similar —
the repo is public; real addresses must not enter history). The git author
is a best-effort mirror of the authoritative `AuthoringEvent` ledger.

### Gating — reuse the `_writeSource` predicate verbatim

- **`status` / `diff` / `log`** (reads): `isWizard` (the source-read tier).
- **`publish` / `revert`** (writes): `isWizard` **and**, per affected path,
  `can(actor, 'write', resolveSourceFolderZone(path))` — the exact gate
  `CmsLogic._writeSource` / `WriteController._gateSourceWrite` use today,
  not a fork of it.
- **`revert`** whose commit touches **any** path outside the actor's write
  permission is **rejected** with a clear message (partial/scoped revert is
  a deferred refinement, not v1).

### Divergence — warn, don't block

`git status` **warns** when the box's local branch diverges from its remote
(the "second snapshot before the first MR merges stacks changes" edge), but
does not block the operation.

### Dependency — `simple-git` approved

`GitLogic` uses **`simple-git`** (typed wrapper over the `git` binary),
added to `packages/server`. Approved as a new runtime dependency (a
shell-exec surface, flagged); avoids hand-rolled arg-escaping / output
parsing.

## Constraints

- **Module categories, no new kind.** `api/git.ts` (`GitApi`, gated
  forwarding shell, ends with `SecurityApi.decorateApiClass`) +
  `obj/api/GitLogic.ts` (`GitLogic extends ApiLogic`, methods
  `@CallSecurity(FromModule('/api/git#GitApi'))`, HMR-able at
  `/obj/api/git`) + `mud/cmd/system/git.yaml` +
  `obj/command/system/GitController.ts` (the `errors`/diagnostics `system`
  precedent; AuthorMixin-afforded). `simple-git` is a dependency only, not a
  module. No free-floating helpers — `GitLogic` owns the mechanism.
- **Actor from context, never a parameter.** No `actor` argument on any
  `GitApi` method; the acting principal is derived inside `GitLogic` from
  `getActingAuthor`. (Project rule: gated APIs derive the principal from
  execution context — a passed principal is spoofable.)
- **Reuse the source-write gate, don't reimplement it.** The affected-path →
  `can('write', resolveSourceFolderZone(path))` check must call the same
  predicate the source-write path uses; forking the gate logic would let the
  two drift.
- **Push credential + author email never caller-supplied.** Token from
  env/SSM; synthetic email hard-derived from the avatar's playerId. No real
  Google address may reach commit metadata (public repo).
- **CMS panel adds no new authorization surface.** Its REST routes reuse
  `CmsSession.runAsSessionPlayer` (the session→`runRoot` attribution
  bridge), bind 1:1 to gated `GitApi` ops, carry **no authz in the route
  layer**, and CSRF-protect writes — mirroring `CmsRoutes` verbatim. A
  `null` (unattributable) actor fails every gate closed.
- **The feature merge must not touch live state.** `GitApi` is
  topology-agnostic (it operates on whatever branch the box tracks); the
  box-on-`authoring` flip + the `deploy-dev` CI-rule change are a separate,
  documented migration, not part of the mergeable code.
- **Don't change `update.sh`'s pull command.** Its `--ff-only` already
  anticipates GitApi; the branch is set by the box's checkout, not the
  script.
- **Tests are DB-free and touch no live remote.** Exercise `GitLogic`
  against a throwaway git repo fixture with a **local bare remote** (the
  hot-reload `.gitignore` fixture precedent); no network, no real GitLab, no
  real box.
- **Wizard-tier throughout.** The whole surface is code-trust (`isWizard`);
  there is no anonymous or author-tier path (source is engine TS).

## Acceptance criteria

- `GitApi` / `GitLogic` pair exists, gated as specified, `GitApi` ends with
  `SecurityApi.decorateApiClass`; `lint:gates` resolves the `FromModule`
  string.
- A `git` shell verb (`system` category, AuthorMixin-afforded, wizard-gated)
  exposes `status` / `diff` / `log` / `publish` / `revert`.
- A CMS git panel exists over new REST routes bound 1:1 to `GitApi` through
  `CmsSession.runAsSessionPlayer`, CSRF-protected on writes, with no authz
  in the route layer.
- `simple-git` is added to `packages/server` dependencies.
- Tests (fixture repo + local bare remote, DB-free, no network) cover:
  - `publish` stages **only** writable dirty files; an unowned dirty file is
    left uncommitted.
  - a `publish` commit carries `--author` = the acting avatar with the
    synthetic email.
  - `revert` of an in-scope commit succeeds; `revert` of a commit touching
    an out-of-scope path is **rejected** with a clear error.
  - `status` / `diff` / `log` are denied to a non-wizard; `publish` /
    `revert` are denied when `can('write')` fails on an affected path.
  - a non-git working directory makes `status` **fail loud** ("not a git
    working tree"), never a silent no-op.
  - `status` surfaces a **divergence warning** when local ≠ remote.
- `deployment.md` documents the **box-on-`authoring` model** + the exact
  **migration** (box `git checkout authoring`, the `deploy-dev` CI-rule
  change, the push-token SSM provisioning).
- A subsystem doc (`docs/subsystems/git-workflow.md`) exists at finalize,
  covering the `GitApi`/`GitLogic` pair, the snapshot-and-push model, the
  identity model, and the permission-scoping spine.
- The seeding slate is retired/updated per the sweep rules (its Wave-1
  surface graduated to the subsystem doc; content-export, finer review, and
  per-user-subrepo waves remain).

## Cross-references

- **Seeding slates:** [git-workflow-slate](../slates/builds/git-workflow-slate.md)
  (this build), [provenance-slate](../slates/builds/provenance-slate.md)
  (parent — the in-runtime VCS remainder),
  [cms-slate](../slates/builds/cms-slate.md) (the review gate; the
  storage-agnostic versioning constraint).
- **Subsystem docs:** [cms.md](../subsystems/cms.md) (the `_writeSource`
  chokepoint + the attribution bridge this reuses),
  [provenance.md](../subsystems/provenance.md) (the `AuthoringEvent` ledger
  the git author mirrors), [access.md](../subsystems/access.md) /
  [parcel.md](../subsystems/parcel.md) (`can` / `isWizard` / the
  parcel-title ownership the path-scoping rides),
  [shell-author.md](../subsystems/shell-author.md) (AuthorMixin, the
  code-trust verb tier).
- **Infra:** [deployment.md](../deployment.md) (the dev/prod box split; the
  documented migration target).
- **Antipatterns:** gated-API actor-from-context (never a parameter); go
  through the Api layer; no free-floating helpers.
