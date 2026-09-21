# Slate-compaction pass — git-workflow batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Insert-only into
`docs/subsystems/git-workflow.md` and `docs/subsystems/provenance.md`.
Code verified in `packages/server/src/mud/api/git.ts`,
`packages/server/src/mud/platform/idea/api/GitLogic.ts`,
`packages/server/src/backend/GitRoutes.ts`,
`packages/server/src/mud/platform/idea/cmd/system/GitController.ts`,
`packages/client/src/components/cms/{gitClient.ts,CmsGitPanel.tsx}`,
`packages/server/src/mud/api/parcel.ts` +
`platform/idea/api/ParcelLogic.ts`,
`packages/server/src/mud/lib/standing/{AuthoringEvent,CreditRouting}.ts`,
`packages/server/src/mud/api/provenance.ts` +
`platform/idea/api/ProvenanceLogic.ts`, and `docs/deployment.md` (the
box-on-`authoring` migration lives there, outside my write list, but its
existence is what let me cut the git-workflow-slate's branch-model
section instead of re-graduating it).

---

## docs/slates/builds/git-workflow-slate.md — 360 → 93 · Status PARTIAL → PARTIAL

Wave 1 (the entire source VCS spine — `GitApi`/`GitLogic`, the `git` verb,
the CMS panel, the identity model, the permission-scoped security spine,
the box-on-`authoring` branch model, redeploy durability) shipped and is
fully documented across `git-workflow.md` and `deployment.md` § *In-runtime
VCS*. Nearly the whole slate was restating a now-shipped, now-documented
design; what's left is the genuinely-open admin-tier question plus the
three later waves the slate always deferred.

### Cut (SHIPPED · DOCUMENTED)
- Second/older status block (`> **Status: Wave 1 SHIPPED**…`, 17 lines) —
  one-status-block rule; content folded into the canonical block already
  at the top.
- `The four things the workflow must deliver` list (10 lines) — restates
  `git-workflow.md`'s own opening paragraph ("giving version history,
  review, rollback, and durability across redeploy").
- `The load-bearing decisions` 1–4 (38 lines) — code: `GitLogic.ts`,
  `git.ts`; doc: `git-workflow.md § The governing constraint`, `§ The
  security spine`, `§ The identity model`, `§ Deferrals` (source-only v1).
- `## Principle` (13 lines) — a 5-point restatement of the same four
  decisions; same doc sections.
- `## The branch model — box-on-authoring` (43 lines, incl. the Goal→
  mechanism table) — code/ops: the migration steps, CI-rule flip, and
  `update.sh`'s `--ff-only` rationale are documented verbatim in
  `deployment.md § In-runtime VCS (GitApi) — the box-on-authoring
  migration`. Not re-graduated into `git-workflow.md` (already covered
  there via a cross-link) or into `deployment.md` (outside my write list;
  nothing to add — it already has this).
- `## The identity model` (20 lines) — doc: `git-workflow.md § The
  identity model — one credential, per-avatar authorship` (near-verbatim
  match: pusher/author/committer split, synthetic email, mirror-not-
  authority framing).
- `## The security spine — permission-scoped operations` (25 lines) —
  doc: `git-workflow.md § The security spine`, including the "per-owner
  slicing falls out for free" convergence note.
- `## Module shape` (24 lines) — code: `git.ts`, `GitLogic.ts`; doc:
  `git-workflow.md § Shape at a glance`, `§ The two surfaces`. The one
  item genuinely undocumented (the CI-validate "free property") was
  **graduated**, see below.
- `## The environment guarantee` (15 lines) — doc: `deployment.md`'s
  mutable/immutable-box table (Live authoring row) +
  `git-workflow.md`'s `GitError('not-a-repo')` code table.
- `## Build order` Wave 1 paragraph (12 lines) — code: tests exist at
  `GitLogic.test.ts`, `GitController.test.ts`, `GitRoutes.test.ts`; doc:
  `git-workflow.md § History`. One scope note: the slate's Wave-1 list
  included "`reset`/force-push behind the admin tier" — that part was
  **not** shipped (no `reset` method exists in `GitLogic.ts` or `GitApi`);
  it survives as the kept admin-tier open question, not as a false
  "shipped" claim.
- `## Once shaped into formal requirements` (23 lines) — a full rehash of
  the (now cut) decisions + build order; redundant with the restamped
  status block and the kept `Build order` waves 2/3.
- Open question 2 (MR base) — resolved & documented:
  `deployment.md § In-runtime VCS`.
- Open question 3 (`simple-git` vs `child_process`) — resolved & shipped:
  `package.json` (`simple-git: ^3.27.0`), `GitLogic.ts:6`; documented in
  `git-workflow.md`'s Shape-at-a-glance diagram.
- Open question 4 (does `publish` filter by author beyond permission) —
  resolved: `git-workflow.md § History` ("`publish` scoped by permission
  (not additionally by author)").
- Build order Wave 2's "CMS diff/commit panel" clause — shipped:
  `CmsGitPanel.tsx`, `gitClient.ts`, `GitRoutes.ts`; doc: `git-workflow.md
  § The two surfaces`. Kept the rest of the Wave-2 paragraph (still-open
  author-scoped review + auto-open-MR) rather than split below paragraph
  granularity — added one sentence noting the panel already shipped
  in place of deleting the clause outright (see the paragraph in the
  slate body).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- Open question 5 (divergence warning) — code:
  `GitLogic.ts:238-258` (`diverged`/`warnings` on `status`) — not stated
  anywhere in `git-workflow.md`. → inserted at `git-workflow.md § Shape at
  a glance` (2 sentences).
- `## Module shape`'s "Free property" bullet (the pushed branch trips the
  existing `.gitlab-ci.yml` validate pipeline) — code-level fact, true of
  any push, never stated in the subsystem doc. → inserted at the same
  spot, same 2-sentence addition (both graduated together, ~6 lines
  total).

### Kept (UNBUILT)
- Open question 1 (the admin tier for `reset`/force-push — archwizard vs
  a new repo-admin capability) — genuinely undelivered: no `reset` method
  exists anywhere in `GitApi`/`GitLogic`, and `git-workflow.md §
  Deferrals` lists "History rewrites (`reset` / force-push) and their
  admin-tier gating" as still open. Kept verbatim, renumbered to `1.` as
  the sole remaining item in `## Open questions / forks`.
- `## Build order` Wave 2 (author-scoped/slice-scoped review,
  auto-open-MR) — matches `git-workflow.md § Deferrals`.
- `## Build order` Wave 3+ (Mongo→file export bridge; per-user `/home`
  submodules) — matches `git-workflow.md § Deferrals`.
- `## What this slate does NOT cover` — kept whole; still an accurate
  scope boundary (content/document versioning, finer review, home
  submodules, auto-MR, branch-checkout/merge-conflict UI, commit signing,
  the immutable-prod pipeline all remain either deferred or permanently
  out of scope).
- See-also list, trimmed to the two links that still bear on remaining
  work (provenance-slate as parent, cms-slate as the Wave-2 review-gate
  source) — the other four links (cms.md, access.md/parcel.md,
  deployment.md, shell-author.md) pointed at mechanism that's now fully
  described inside `git-workflow.md` itself; cut as vestigial, not as
  design loss (nothing they said isn't in the subsystem doc).

### Uncertain
None.

### Handoff
None — every graduation belonged in `git-workflow.md`, which is on my
write list.

### Status block
- Status: PARTIAL → PARTIAL (unchanged — real work remains).
- Left: `content/document → git bridge · finer-than-branch review ·
  per-user /home submodules` → `finer-than-branch review + auto-open-MR
  (Wave 2) · reset/force-push history rewrites and their admin-tier
  gating (newly surfaced — it was undelivered but wasn't in the old Left
  list) · the content/document → git bridge (Mongo→file export) ·
  per-user /home submodules`.
- Size: `a build` → `a wave` — every remaining item now rides another
  build (content-packs' export bridge, cms-slate's review gate) or is a
  small opportunistic tail (the admin tier); nothing left is its own
  build-sized cycle.

---

## docs/slates/builds/provenance-slate.md — 290 → 293 · Status PARTIAL → PARTIAL

Most of this slate is still-open forward design (Layer A generalized
ownership, Layer C dependency-DAG, the team/contributor split, versioned
law) — it grew slightly net, not shrank, because several build-order and
principle items needed a resolved-with-pointer note rather than a clean
delete (mixed shipped/unbuilt content within single list items), and the
canonical status block needed real content added (Layer A was undelivered
but wasn't named in the old `Left`). Code checked: `AuthoringEvent.ts`,
`ProvenanceLogic.ts`, `CreditRouting.ts`, `parcel.ts` + `ParcelLogic.ts`
(no leaf-template/module ownership resolver exists — `ParcelApi.ownerOf`
resolves land/extent title via the parcel registry, a different concept
from the slate's Layer A), `GitLogic.ts` (no dependency-DAG, no
diff-sourced authorship — `getActingAuthor` is execution-context-derived,
independent of git).

### Cut (SHIPPED · DOCUMENTED)
- Second/older status block ("Status: exploratory — the structural gap
  between Build 5 … Build 9 …", 16 lines) — one-status-block rule; its
  claims ("no authorship attribution", "no versioning") are also now
  false (Layer B + Layer D shipped since it was written), so it would
  actively mislead a reader if kept.
- Principle 5 ("Git-in-runtime is the authoring spine", the sandbox/
  branch-per-author model) — superseded by the code: the shipped VCS
  model is snapshot-and-push on one long-lived branch, the opposite of
  sandbox/branch-per-author, and `git-workflow.md § The governing
  constraint` states the mechanical reason (the working tree is the live
  server, so per-author branches can't isolate). Cut with a 6-line
  pointer replacing the 9-line original — kept the "released-content gate
  did ship" / "law + content-VCS unbuilt" facts rather than losing them.
- Rough-build-order item 2 (authorship attribution / Layer B) — code:
  `AuthoringEvent.ts`, `ProvenanceLogic.authorOf`; doc: `provenance.md`.
- Rough-build-order item 3 (sandbox → release gate) — code:
  `CreditRouting.isReleased`; doc: `provenance.md § CreditRouting`. Noted
  the richer version (explicit `release` action, team sandbox) is still
  open and folds into the kept contributor-set/team-split item.
- Rough-build-order item 4 (the in-runtime VCS, Layer D) — code +
  doc: `git-workflow.md` in full. Noted explicitly that it did **not**
  resolve unify-vs-bridge for content (source-only v1) — the open
  question below stays open, not silently closed by this cut.
- See-also `cms-slate.md` bullet's "this slate elevates that GitApi…"
  clause — the elevation happened; replaced with a pointer to
  `git-workflow.md`, kept the still-owed Layer A/C clause.
- "Once shaped into requirements" — one clause corrected in place (not a
  cut): the recommended "start with Layer A + B" first slice is half
  overtaken by events (B shipped, D shipped as its own build exactly as
  forecast) — appended 3 sentences naming what shipped and that Layer A
  is what remains of the "start here" recommendation, rather than
  deleting a five-year-old-reading forecast that was otherwise accurate.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
None this slate — everything that shipped was already stated in
`provenance.md` or `git-workflow.md`; the cuts above are pointers, not
graduations.

### Superseded — cut
- (folded into Principle 5's cut above — see Cut list; recorded here
  too because it's the clearest SUPERSEDED-by-code case in this batch)
  the sandbox/branch-per-author VCS model → the shipped snapshot-and-push
  model, `git-workflow.md § The governing constraint`.

### Kept (UNBUILT)
- "Current state (grounded)" bullets *Seed → DB*, *Template ↔ class*,
  *Ownership*, *Dependency graph* — still accurate; unrelated to what
  shipped in this slate's own scope.
- Principles 1 (doctrine), 2, 3, 4, 6 — Layer A/C and the team-split
  constraints remain unbuilt.
- The whole *Model — four layers* section (Layer A, B, C, D
  descriptions) — kept as the standing model reference even where a
  layer partly shipped (B, D), because the paragraphs describe the full
  target shape, not just the remaining slice; contradictions logged
  below rather than silently cut.
- *Worked scenarios* — all four (solo sword, team zone, infrastructure
  author, versioned law) describe capability that hasn't shipped
  (declared team splits, dependency-DAG credit, versioned law).
- *Open questions* — all six kept; the first (real-git vs git-like /
  unify vs bridge) is only **partially** answered by the shipped
  source-only v1, so it stays open rather than being cut (see Uncertain).
- *Rough build order* items 1, 5, 6 (Layer A, Layer C, versioned-law
  convergence) — unbuilt.
- *What this slate does NOT cover* — unchanged, still accurate.

### Uncertain — kept
- Principle 3 ("An in-runtime VCS gives the first [authorship] for
  free") — contradicted by the actual shipped mechanism: `authorOf` is
  populated by `AuthoringEvent` rows written from execution-context
  (`getActingAuthor`) at `TemplateApi.saveTemplate` time, **not** derived
  from a git diff stream — content authorship has nothing to do with
  `GitApi` at all (content isn't even under git yet). Kept verbatim per
  the "kept-but-contradicted → Uncertain" rule; a future requirements
  pass should decide whether Layer B ever moves onto the VCS or stays a
  parallel ledger permanently.
- Layer B's model paragraph ("sourced from the VCS diff stream (Layer
  D)") — same contradiction as above, same evidence
  (`ProvenanceLogic.ts`, `GitLogic.ts`).
- *Current state* bullet "Authoring" ("no `createdBy`/`authoredBy` on
  anything") — contradicted by the shipped `AuthoringEvent` ledger
  (`provenance.md`). Kept verbatim (mixed paragraph — the "no runtime
  TS-class authoring" clause in the same bullet is still true, and
  splitting below paragraph granularity isn't allowed).
- *Current state* bullet "Versioning" ("No commits, branches, diffs,
  history, review, rollback, or merge… `GitApi`… designed, not built")
  — contradicted for **source** by the shipped `GitApi` (commits,
  branches, diffs, history, revert all exist); still true for
  **content** (no VCS at all over Mongo `domain`/`documents`). Kept
  verbatim, same paragraph-granularity reason.
- Open question 1 ("Real git vs git-like; unify vs bridge") — v1
  partially resolved it toward "bridge, deferred" for content
  (`git-workflow.md § Deferrals`: Mongo→file export bridge, not built)
  while source went "real git." The deep architecture question (should
  content ever unify) is still genuinely open. Kept verbatim rather than
  cut, since only a stopgap was decided, not the question itself.

### Doctrine
- Principle 1 ("Provenance is one first-class substrate, not a
  side-effect") — a thesis about why authorship/ownership/lineage/history
  are one layer, not a backlog item. Kept, flagged for the coordinator's
  eventual home decision (a subsystem-doc "Why", or stays here).

### Handoff (belongs in a doc outside my list)
None — every graduation candidate belonged in `provenance.md` or
`git-workflow.md`, both on my write list. (`access.md`/`zone.md`,
`parcel.md`, `influence.md`, `cms-slate.md`, `deployment.md` are named in
the *See also* list but nothing new needed graduating into them — the
facts they'd want are already stated there per my code checks, e.g.
`parcel.md` already documents `ParcelApi.ownerOf`.)

### Status block
- Left: `the dependency DAG · the contributor-set/team split · versioned
  law` → `the generalized path-ownership resolver over both namespaces
  (Layer A, newly surfaced — it was undelivered but wasn't named in the
  old Left) · the dependency DAG (Layer C) · the contributor-set / team
  split (+ the richer explicit release action) · versioned law · the
  content unify-vs-bridge architecture question`.
- Size: `a build` → `a build — likely several requirements cycles; Layer
  A is the next, highest-leverage slice` (re-derived from the "Once
  shaped into requirements" section's own forecast, which the body still
  supports).
