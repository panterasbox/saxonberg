# Git workflow / in-runtime VCS — implementation plan

Self-contained build spec for the **in-runtime VCS** build. Requirements
(authoritative on scope): `docs/requirements/git-workflow-requirements.md`.
Seeding slate: `docs/slates/builds/git-workflow-slate.md`. Conform to
`CLAUDE.md` (Module Categories, "Go Through the API Layer", member
privacy, the `callable==visible==cared-about` invariant).

## Two decisions to confirm before/at build start

- **D1 — gate reuse shape.** The source-write gate is *duplicated, not
  shared* today: `CmsLogic.gateSourceWrite` (`CmsLogic.ts:184-196`) and
  `WriteController._gateSourceWrite` (`WriteController.ts:249-261`) are
  byte-identical (`isWizard` then `can('write', resolveSourceFolderZone)`).
  **Default for this plan: mirror it verbatim a third time in `GitLogic`**
  (lowest blast radius, exactly what `CmsLogic` did). The DRY alternative
  — extract a shared `AccessApi.canWriteSource(path)` static all three call
  — is cleaner but is net-new shared surface + a refactor of two shipped
  files; recommended as a **follow-up**, not this build. *Confirm.*
- **Push-token env var name** — this plan uses `GITLAB_PUSH_TOKEN` as a
  placeholder. Set to match the `deployment.md` / SSM naming convention
  before the docs phase. *Confirm.*

## Orienting facts the plan is built on

**Three path-spaces `GitLogic` must translate between** (the load-bearing
detail the requirements gloss):

| Space | Shape | Who speaks it |
|---|---|---|
| repo-relative | `packages/server/src/mud/obj/Foo.ts`, `docs/…` | `git status`/`diff` porcelain — simple-git's native output |
| source-logical | `/server/src/mud/obj/Foo.ts` (packages-stripped, leading `/`) | `AccessApi.resolveSourceFolderZone` walks this against the **template tree** (`obj/AccessRegistry.ts:266`) |
| absolute fs | `<repoRoot>/packages/server/…` | simple-git `cwd`, `SourceTreeApi` |

`SourceTreeApi.getSandboxRoot()` returns the **`packages` dir itself**
(`SourceTreeLogic.ts:234-249` walks up to `basename === 'packages'`). So:
- **repo root** (git working tree, where `.git` lives) =
  `path.dirname(SourceTreeApi.getSandboxRoot())`.
- **repo-relative → source-logical**: strip a leading `packages/`, prefix
  `/`. A dirty path *outside* `packages/` (e.g. `docs/`, `deploy/`, root
  config) has **no source-logical form** → `resolveSourceFolderZone`
  returns `null` → `can('write', null)` falls through to the `'core'` owner
  default → only a core/state writer passes. That safe default is an
  **explicit, tested case**, not an accident. (Consequence: a wizard
  editing `docs/` via the tree cannot `publish` it — a real constraint,
  documented in the subsystem doc.)

**The gate is not a shared helper today.** "Don't fork the gate" means
composing the **same two `AccessApi` calls** in a module-private free
function inside `GitLogic`, mirroring `CmsLogic` verbatim (per D1).

**Actor derivation** is `ExecutionContextApi.getActingAuthor()`
(`execution-context.ts:387`), wrapped exactly as `CmsLogic.actingActor()`
(`CmsLogic.ts:212`) / `DiagnosticLogic` (`DiagnosticLogic.ts:50`):
`(ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null`. Never a
parameter. Null → every gate fails closed.

---

## Phase 1 — `simple-git` dependency + shared call-shape types

**Files modified:**
- `packages/server/package.json` — add `"simple-git"` under
  `dependencies`. `pnpm install` regenerates root `pnpm-lock.yaml`. New
  runtime dep + shell-exec surface (pre-approved in requirements); call it
  out in the MR description.
- `packages/types/src/index.ts` — add git call-shape interfaces beside the
  CMS block (~line 1911); they are the I/O closure of `GitApi`, consumed by
  client + server + REST (like `CmsReadResult`):
  - `GitFileStatus { path: string; index: string; workingDir: string }` (repo-relative + porcelain XY codes)
  - `GitStatusResult { branch: string; tracking: string | null; ahead: number; behind: number; diverged: boolean; files: GitFileStatus[]; warnings: string[] }`
  - `GitLogEntry { sha: string; author: string; date: string; message: string }`
  - `GitDiffResult { path?: string; patch: string }`
  - `GitPublishResult { committed: boolean; sha?: string; committedPaths: string[]; skippedPaths: string[]; pushed: boolean; branch: string; detail: string }`
  - `GitRevertResult { reverted: boolean; sha?: string; detail: string }`
  - `GitError` code union: `'not-a-repo' | 'denied' | 'nothing-to-do' | 'push-rejected' | 'conflict' | 'bad-ref'` (REST status mapping).

**Reviewable:** lockfile resolves, `pnpm --filter @saxonberg/types build`
passes, nothing wired.

---

## Phase 2 — `GitApi` + `GitLogic` (the gated core; the whole security spine)

The phase the acceptance criteria mostly test. Everything else is a thin
surface over it.

### `packages/server/src/mud/api/git.ts` — `GitApi`
Structural clone of `api/source-tree.ts` / `api/diagnostics.ts`:
- `const LOGIC_PATH = '/obj/api/git';`
- `const LOGIC_CLASS_FILE = fileURLToPath(new URL('../obj/api/GitLogic', import.meta.url));`
- `function logic(): GitLogic { return StuffApi.singletonSync(LOGIC_PATH, () => new ((HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE,'GitLogic') as typeof GitLogic | null) ?? GitLogic)()); }`
- `class GitApi` static forwarders — **no `actor` parameter on any**:
  - `static status(): Promise<GitStatusResult>`
  - `static diff(pathArg?: string): Promise<GitDiffResult>`
  - `static log(opts?: { limit?: number; pathArg?: string }): Promise<GitLogEntry[]>`
  - `static publish(message: string): Promise<GitPublishResult>`
  - `static revert(sha: string): Promise<GitRevertResult>`
- Re-export `GitError` (so `GitRoutes` can `instanceof`-narrow without importing the logic).
- Ends with `SecurityApi.decorateApiClass(GitApi);`.

### `packages/server/src/mud/obj/api/GitLogic.ts` — `GitLogic extends ApiLogic`
Clone `CmsLogic.ts`: `@Unshadowable` + `@internal` class, per-method
`@CallSecurity(GitApiCallers)` where
`const GitApiCallers = SecurityPolicies.FromModule('/api/git#GitApi');`.
All non-gate logic in **module-private free functions** (no intra-singleton
`this.` self-calls the gate would deny — the `SourceTreeLogic.sandboxRoot()`
/ `CmsLogic.gateSourceWrite` pattern).

Module-private free functions:
- `repoRoot(): string` — `path.dirname(SourceTreeApi.getSandboxRoot())`, memoised (the `rootCache` pattern, `SourceTreeLogic.ts:24`). **Test-injection seam: a module-private `let repoRootOverride` + a white-box `_setRepoRootForTesting` (sanctioned test-only export).**
- `git(): SimpleGit` — `simpleGit({ baseDir: repoRoot(), config: [...] })`, lazily built. Author/committer/token never baked here.
- `toSourceLogical(repoRel: string): string | null` — strip leading `packages/` → prefix `/`; `null` for non-`packages/` paths.
- `actingActor(): Stuff | null` — verbatim `CmsLogic.ts:212`.
- `gateSourceWrite(actor, sourceLogical): Promise<string|null>` — verbatim copy of `CmsLogic.ts:184-196` (per D1). Returns a denial reason or `null` (allowed).
- `assertRepo(): Promise<void>` — `if (!(await git().checkIsRepo())) throw new GitError('not-a-repo', 'not a git working tree');` (fail-loud guard).
- `syntheticAuthor(avatar): string` — `` `${avatar.getName()} <${avatar.getPlayerId()}@saxonberg.local>` `` (accessors: `Avatar.ts:235` / `getName`). Hard-derived, never caller-supplied.
- `pushToken(): string | undefined` — `process.env.GITLAB_PUSH_TOKEN` (read only here).

Gated methods:

**`status()`** — read tier. `isWizard(actingActor())` else `GitError('denied')`. `assertRepo()`. `const s = await git().status()`; map `s.files` → `GitFileStatus[]`; `diverged = s.ahead > 0 || s.behind > 0 || s.tracking == null`; push a human warning string when diverged (**warn, don't block**).

**`diff(pathArg?)`** — read tier. `git().diff(pathArg ? ['--', repoRelOf(pathArg)] : [])`. Pathspec after `--`, never interpolated.

**`log(opts?)`** — read tier. `git().log({ maxCount: opts?.limit ?? 50, file: … })`.

**`publish(message)`** — write tier; the affected-path spine:
1. `isWizard` pre-check (fail fast) + `assertRepo()`.
2. `const s = await git().status()`. Dirty set = `s.files` (staged ∪ unstaged ∪ untracked `!!` — untracked new files a wizard authored must publish).
3. Per dirty repo-relative path: `logical = toSourceLogical(p)`; `denial = await gateSourceWrite(actor, logical ?? p)` (a `null` logical still flows in → core default → denied for a normal wizard). Partition into `committedPaths` (denial===null) / `skippedPaths`.
4. `committedPaths` empty → `GitPublishResult{ committed:false, detail:'nothing you may write is dirty', … }` (not an error).
5. `await git().add(['--', ...committedPaths])` — explicit `--` + **array** args (simple-git spawns without a shell → no injection).
6. `await git().raw(['commit', '--author', syntheticAuthor(actor), '-m', message])`.
7. `const sha = await git().revparse(['HEAD'])`.
8. `await pushCurrentBranch()` (below). Catch protected-branch / non-fast-forward rejection → `pushed:false` + `push-rejected` semantics with branch in `detail`; **do not roll back the local commit** (durable, re-pushable).
9. Return with `committedPaths`/`skippedPaths` (per-owner slice falls out for free).

**`revert(sha)`** — write tier:
1. `isWizard` + `assertRepo()`. Validate `sha` shape (`/^[0-9a-fA-F]{4,40}$/` or a safe ref) → else `GitError('bad-ref')` (defense-in-depth).
2. Affected set = `await git().raw(['diff-tree','--no-commit-id','--name-only','-r', sha])` → repo-relative paths.
3. Per **every** path: `gateSourceWrite(actor, toSourceLogical(p) ?? p)`. **Any** denial → **reject** `GitError('denied', 'revert touches a path you may not write: <p>')`. No partial revert.
4. `await git().raw(['revert','--no-commit', sha])` then `git().raw(['commit','--author', syntheticAuthor(actor), '-m', `Revert ${sha}`])` (`git revert` has no `--author`; two-step so the revert commit carries the actor). A conflict on `revert --no-commit` → `git revert --abort`/reset and `GitError('conflict')`.

**Push credential (`pushCurrentBranch`):** ephemeral authenticated push;
`GITLAB_PUSH_TOKEN` must **never** reach `git remote -v`, a returned
`detail`, or an error string. Prefer per-command
`-c http.extraHeader="AUTHORIZATION: bearer <token>"` (simple-git per-command
`config`) over an authenticated remote URL; sanitize any `err.message` before
surfacing. Pushes **the current branch** (`status().current`) — topology-agnostic,
branch name never hard-coded. **Needs one manual check against the real GitLab remote.**

**Tests:** `packages/server/src/mud/obj/api/__tests__/GitLogic.test.ts` —
drive through `GitApi`; spy `ExecutionContextApi.getActingAuthor` +
`AccessApi.isWizard`/`can`/`resolveSourceFolderZone` (the
`DiagnosticLogic.test.ts` harness style). Fixture = throwaway repo + local
bare remote (Phase 6). Full map in Test Plan.

**Reviewable:** the entire security spine, zero UI/REST/DB.

---

## Phase 3 — the `git` shell verb (`system` category)

**Files created:**
- `packages/server/src/mud/cmd/system/git.yaml` — clone `cmd/system/errors.yaml`. `verbs: [git]`, `controller: system/GitController`, `fallthrough: true`, subcommands `status`/`diff`/`log`/`publish`/`revert`, options `--limit` (log), `-m/--message` (publish, required), positional `path` (diff/log), positional `sha` (revert). Gate: `validators: [/lib/command/validators/requiresWizard]` (whole surface wizard-tier — the per-path `can('write')` refinement stays in `GitLogic`; double-gating reads with `isWizard` is fine, defense in depth).
- `packages/server/src/mud/obj/command/system/GitController.ts` — clone `ErrorsController.ts`: dispatch on `model.subcommand ?? 'status'`; each sub calls the matching `GitApi` static, renders via `MessageApi.scene(actor).topic(...).toSelf(Mml.escape(text)).send()`; failures via `context.note({ kind:'controller-rejected', … })`. Passes **no actor** (GitApi derives from context); holds **no authz beyond the YAML validator**.
- `packages/server/src/mud/seeds/obj/command/system/GitController.yaml` — affordance seed, shape of `seeds/obj/command/system/ErrorsController.yaml` (`class: /obj/command/system/GitController`, `data: {}`).

**Files modified:**
- `packages/server/src/mud/lib/shell/Author.ts` — add `'system/git.yaml'` to `commandContributions.self` (list ends ~line 123), commented AuthorMixin-**afforded** / wizard-**authorized** (the `stream.yaml`/`wizard.yaml` split precedent, lines 92-105).

**Tests:** `GitController.test.ts` (clone `ErrorsController.test.ts`) —
subcommand dispatch + rejection notes, `GitApi` mocked.

**Reviewable:** `msh git status` etc. drives the Phase-2 core in-world.

---

## Phase 4 — CMS git panel + REST routes

**Decision:** add a **sibling router `GitRoutes`**, not an extension of
`CmsRoutes` (the git ops don't fit `CmsRoutes`'s `backend/path/body`
shape). It reuses the same bridge (`CmsSession.runAsSessionPlayer`) + CSRF,
owns its own path namespace. The client panel plugs into the existing CMS
surface as a new mode tab.

**Files created:**
- `packages/server/src/backend/GitRoutes.ts` — clone `CmsRoutes.ts`. Each route `requireAuth`, 1:1 to a `GitApi` op via `CmsSession.runAsSessionPlayer(req, 'git.<op>', () => GitApi.<op>(…))` (the `req`→session Avatar→`tagActingAuthor`→`getActingAuthor` bridge, `CmsSession.ts:50`):
  - `GET  /api/git/status` → `GitApi.status`
  - `GET  /api/git/diff?path=` → `GitApi.diff`
  - `GET  /api/git/log?limit=` → `GitApi.log`
  - `GET  /api/git/csrf` → mint (reuse `req.session.cmsCsrf`)
  - `POST /api/git/publish` → `GitApi.publish` (CSRF-checked)
  - `POST /api/git/revert` → `GitApi.revert` (CSRF-checked)
  - **No authz in the route layer** (mirrors `CmsRoutes` lines 13-24). `sendGitError(res, e)` maps `GitError` codes → 403/400/409/404, unknown → 500 (the `sendCmsError` shape).
- `packages/client/src/components/cms/gitClient.ts` — clone `cmsClient.ts` (`credentials:'include'`, CSRF header on writes, `unwrap<T>` → throws `GitClientError`).
- `packages/client/src/components/cms/CmsGitPanel.tsx` — clone `CmsDiagnosticsPane.tsx`: poll `status`, dirty-file list + diff view, commit-message field + Publish, `log` list, Revert action. Server-authoritative dumb renderer.

**Files modified:**
- `packages/server/src/backend/Server.ts` (where `CmsRoutes.setup(app)` is called — after session/passport, before the SPA catch-all) — add `GitRoutes.setup(app)`.
- `packages/client/src/components/cms/CmsSurface.tsx` — add `"git"` to the `mode` union (~line 76) + a `ModeTab` + a render branch (mirror the `"diagnostics"` tab wiring, ~lines 117-138).
- `packages/client/src/store/cmsSlice.ts` — only if the panel needs shared store state; the diagnostics pane is self-contained with local `useState`, so **prefer self-contained** (likely no change).

**Tests:** `GitRoutes.test.ts` (supertest; mock `GitApi` + `CmsSession`) —
CSRF enforced on writes, error-code→status mapping, no authz added.
Optional `gitClient` unit test.

**Reviewable:** panel drives the same gated core over REST.

---

## Phase 5 — docs

**Files modified/created:**
- `docs/deployment.md` — document the **box-on-`authoring`** model + the coordinated migration, explicitly *not performed by this merge*:
  1. `git checkout authoring` on the box (one-time at standup).
  2. `.gitlab-ci.yml` `deploy-dev` rule: `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` (line 220) → `== 'authoring'`. State *why* the merge must not include this edit: flipping while the box is still on `master` breaks live deploy (trigger/pulled-branch mismatch).
  3. SSM provisioning of `GITLAB_PUSH_TOKEN` (`write_repository` PAT) into the box `.env` via `materialize-env.sh` (`.gitlab-ci.yml:208`).
  4. Note `deploy/dev/update.sh`'s `git pull --ff-only` needs **no change** (already anticipates GitApi — `update.sh:9-12`).
- `docs/subsystems/git-workflow.md` (**at finalize**) — the `GitApi`/`GitLogic` pair, snapshot-and-push model, identity model (one push token + per-avatar `--author` + synthetic email as an `AuthoringEvent`-ledger mirror), the permission-scoping spine (three path-spaces + `gateSourceWrite` reuse), and the `docs/`-not-publishable constraint.
- `docs/slates/builds/git-workflow-slate.md` — retire/annotate per `/finalize` (Wave-1 graduated; content-export / finer-review / per-user-subrepo waves remain).

**Reviewable:** docs-only.

---

## Phase 6 — test fixture harness (authored inside Phase 2's test file)

DB-free / no-network seam every acceptance test rides. Mirrors the
`mkdtemp` precedent (`api/__tests__/hot-reload.test.ts:15-18`,
`mkdtempSync(join(tmpdir(),'…'))` + `rmSync` teardown):
- `beforeEach`: `mkdtempSync` a **bare** remote (`git init --bare`) + a **work** repo (`git init`), `git remote add origin <bareDir>`, seed a `packages/server/src/mud/…` tree + a `docs/…` file, initial commit, `git push origin <branch>`. Keep an initial commit as the revert target. Set fixture `user.email`/`user.name` so commits succeed.
- Point `GitLogic.repoRoot()` at the work repo via the module-private `_setRepoRootForTesting` seam (the sanctioned test-only export — `repoRoot` is otherwise computed from the module's own file location).
- Spies: `getActingAuthor` → fake Avatar (`getName`/`getPlayerId`); `AccessApi.isWizard`/`can`/`resolveSourceFolderZone` → controllable per path.

---

## Test plan — 1:1 with acceptance criteria

All in `GitLogic.test.ts` unless noted; fixture-repo + local-bare-remote,
DB-free, no network.

| Acceptance criterion | Test |
|---|---|
| `publish` stages **only** writable dirty files; unowned dirty file left uncommitted | Dirty A (writable) + B (`can` false). `publish` → `committedPaths=[A]`, `skippedPaths=[B]`; `git status` still shows B; commit tree has A only. |
| `publish` commit carries `--author` = avatar + synthetic email | `git log -1 --format='%an <%ae>'` === `"<Name> <playerId@saxonberg.local>"`. |
| `revert` in-scope succeeds | all touched paths writable → revert commit exists, files reverted, `--author`=actor. |
| `revert` out-of-scope **rejected** | commit touches a `can`-false path → throws `GitError('denied', …touches a path you may not write…)`; no new commit. |
| reads denied to non-wizard | `isWizard` false → `status`/`diff`/`log` each throw `GitError('denied')`. |
| writes denied when `can('write')` fails on affected path | `publish` all-unwritable → `committed:false`, no commit; `revert` any-unwritable → denied. |
| non-git dir → `status` **fails loud** | fixture at a non-repo temp dir → `status` throws `GitError('not-a-repo','not a git working tree')`. |
| `status` divergence warning | advance bare remote ahead of local → `diverged:true` + a `warnings[]` entry; op still returns. |
| push happens | `publish` → bare remote's branch ref advances to the new sha (`git ls-remote <bare>`), no network. |
| `GitApi` decorated / `FromModule` resolves | `lint:gates` + assert a direct `new GitLogic().status()` (off-Api caller) throws `SecurityError`. |
| verb + affordance | `GitController.test.ts` dispatch; `Author.ts` list includes `system/git.yaml`. |
| REST 1:1 + CSRF + no-authz | `GitRoutes.test.ts`: write without CSRF → 403; error-code→status mapping; `runAsSessionPlayer` used. |

---

## Risks / implementer notes

- **D1** (above) — verbatim gate copy vs shared `AccessApi.canWriteSource`.
- **Token handling** — never let `GITLAB_PUSH_TOKEN` reach `git remote -v`, a returned `detail`, or an error string; per-command `http.extraHeader` bearer injection; sanitize `err.message`. One manual check against the real remote (not CI-verifiable).
- **Injection** — simple-git spawns `git` without a shell, **array** args; always `['--', ...paths]`, discrete `message`/`sha` elements; `sha` shape-validator as defense-in-depth.
- **`git revert` has no `--author`** — `revert --no-commit` then `commit --author=<actor>`; handle conflict/abort.
- **Verb gating tier** — `errors.yaml` gates author-tier in-controller; git is uniformly wizard-tier → gate at YAML `validators: [requiresWizard]`; per-path `can('write')` refinement stays in `GitLogic`.
- **`publish` affected-set** = staged ∪ unstaged ∪ untracked (`!!`).
- **Paths outside `packages/`** (docs/deploy/root configs) → `null` source-logical → core-owned → denied for a normal wizard. Correct (git isn't a bypass); document it.
- **Non-fast-forward / protected-branch push rejection** (box still on `master`) — `publish` commits locally, push rejects → `pushed:false` + `push-rejected` + branch in `detail`; retain the commit, **no auto-reset**.
- **`authoring`-branch assumption** — `GitApi` is topology-agnostic (`publish` pushes `status().current`); works on `master` today, `authoring` post-migration, zero code change.

## Ambiguities flagged (not invented)

1. **Push-token env var name** — `GITLAB_PUSH_TOKEN` placeholder; match SSM naming; confirm the key.
2. **CSRF slot** — reuse `req.session.cmsCsrf` (recommended) vs a `gitCsrf` slot.
3. **`diff`/`log` path arg space** — verb speaks source-tree cwd paths, panel speaks repo-relative; normalize both to repo-relative inside `GitLogic` (accept either, convert). State the convention.
4. **Divergence-warning wording/severity** — a `warnings: string[]` field is the low-commitment shape.
5. **`log` scope** — whole-branch vs path-filtered default; `log` is a read (`isWizard`, no path gate per spec) → no redaction; confirm acceptable.

## Critical files to mirror
- `packages/server/src/mud/obj/api/CmsLogic.ts` — the gate + `actingActor` + `_writeSource`.
- `packages/server/src/mud/api/source-tree.ts` — `logic()` singleton-resolve + `decorateApiClass`; `getSandboxRoot` = repo-root seam.
- `packages/server/src/backend/CmsSession.ts` + `CmsRoutes.ts` — the REST attribution bridge.
- `packages/server/src/mud/obj/command/system/ErrorsController.ts` + `cmd/system/errors.yaml` + `lib/shell/Author.ts` — the `system` verb + affordance precedent.
- `packages/server/src/mud/obj/AccessRegistry.ts` — `resolveSourceFolderZone` (the template-tree path-space).
- `packages/client/src/components/cms/CmsDiagnosticsPane.tsx` + `CmsSurface.tsx` + `cmsClient.ts` — the CMS panel/client precedent.
