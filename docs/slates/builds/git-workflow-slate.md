# Git workflow / in-runtime VCS slate (working doc)

> **Status: PARTIAL** — Wave 1 shipped (MR !132): `GitApi`/`GitLogic`,
> the `git` verb, the CMS panel, snapshot-and-push, the same-gate
> permission spine → [git-workflow.md](../../subsystems/git-workflow.md)
> **Left:** finer-than-branch review + auto-open-MR (Wave 2) · reset/
> force-push history rewrites and their admin-tier gating · the content/
> document → git bridge (a Mongo→file export) · per-user `/home`
> submodules
> **Size:** a wave — each remaining item rides another build
> (content-packs' export bridge, cms-slate's review gate) or is a small,
> opportunistic tail (the admin tier)

Working slate for the **git workflow over runtime authoring**. Today the
CMS and the `write` verb edit source files on disk (via `SourceTreeApi`
→ plain `fs.writeFile`) and hot-reload them live — but nothing captures
those edits into version control. There is **no git anywhere in the repo**
(no `simple-git`/`nodegit`, no `child_process`); an edit hits disk and is
durable only until the box is re-provisioned. This slate closes that: a
gated `GitApi` that turns runtime edits into commits, pushes them to
GitLab, and does so **without violating the authoring permission model**.

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

---

## Open questions / forks

1. **The admin tier for `reset`/force-push** — reuse **archwizard**
   (conferral axis) or a new repo-admin capability? Still open — Wave 1
   shipped `status`/`diff`/`log`/`publish`/`revert` only; history
   rewrites (`reset`/force-push) remain undelivered. *Lean: archwizard
   v1; history rewrites are rare + destructive.*
2. MR base resolved: box-on-`authoring`, `master` as the reviewed line —
   see [deployment.md § In-runtime VCS](../../deployment.md).
3. `simple-git` vs raw `child_process` resolved: `simple-git` shipped —
   see [git-workflow.md § Shape at a glance](../../subsystems/git-workflow.md).
4. "Does `publish` filter by author beyond permission?" resolved:
   permission is the v1 floor, no additional author filter — see
   [git-workflow.md § History](../../subsystems/git-workflow.md).
5. Divergence warning resolved & shipped: `status` warns (non-blocking)
   on ahead/behind or no upstream — see
   [git-workflow.md § Shape at a glance](../../subsystems/git-workflow.md).

---

## Build order

**Wave 2 — finer review + the CMS panel.** The CMS diff/commit panel
shipped with Wave 1 (`CmsGitPanel` / `GitRoutes` — see
[git-workflow.md § The two surfaces](../../subsystems/git-workflow.md)).
Still open: **author-scoped / slice-scoped review** riding the
cms-slate's forums review gate (drives on `AuthoringEvent` path→author +
the permission slice); auto-open-MR via the GitLab API (deferred
credential/logic).

**Wave 3+ — content into git + personal repos.** The **Mongo→file export**
bridge (shared with [content-packs](../builds/content-packs-slate.md)) so
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
