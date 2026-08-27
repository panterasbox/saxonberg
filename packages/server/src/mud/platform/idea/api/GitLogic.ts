// GitLogic — the hot-reloadable logic singleton behind GitApi. (Doc
// comment lives on the class declaration below so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import * as path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { SourceTreeApi } from '../../../api/source-tree';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import { GitError } from '../../../api/git';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type {
  GitStatusResult,
  GitDiffResult,
  GitLogEntry,
  GitPublishResult,
  GitRevertResult,
} from '@saxonberg/types';

const GitApiCallers = SecurityPolicies.FromModule('/api/git#GitApi');

/** Default `log` depth when the caller doesn't cap it. */
const DEFAULT_LOG_LIMIT = 50;

/**
 * The machine committer identity every commit carries (distinct from the
 * per-avatar `--author`, which mirrors the `AuthoringEvent` ledger). The
 * box is one machine; a fresh checkout may have no git identity, so we set
 * it per-command rather than relying on repo config. Not the token.
 */
const COMMITTER_CONFIG = [
  'user.name=Saxonberg',
  'user.email=box@saxonberg.local',
];

/**
 * Cached repo root (the git working tree, where `.git` lives). Computed
 * once per process as the parent of the `SourceTreeApi` sandbox root
 * (which is the `packages/` dir itself). Module-private (process-wide
 * memo, not instance state) so the stateless singleton stays stateless
 * across `dest` reloads. The `_setRepoRootForTesting` seam overrides it.
 */
let rootCache: string | null = null;
let repoRootOverride: string | null = null;

/**
 * The absolute path to the git working tree. `repoRoot` is otherwise
 * computed from the module's own file location (via `SourceTreeApi`), so
 * tests must inject a fixture repo through {@link _setRepoRootForTesting}.
 */
function repoRoot(): string {
  if (repoRootOverride !== null) return repoRootOverride;
  if (rootCache !== null) return rootCache;
  rootCache = path.dirname(SourceTreeApi.getSandboxRoot());
  return rootCache;
}

/**
 * A `SimpleGit` bound to the repo root. Built fresh per call (cheap; a
 * thin spawn wrapper) so a `_setRepoRootForTesting` switch takes effect.
 * Author/committer/token are never baked into the base config here —
 * `--author` is passed per commit, the token per push.
 */
function git(): SimpleGit {
  return simpleGit({ baseDir: repoRoot() });
}

/**
 * The shared push credential (`GITLAB_PUSH_TOKEN`). Read **only** here.
 * Never returned, never logged, never placed in an error string.
 */
function pushToken(): string | undefined {
  const t = process.env.GITLAB_PUSH_TOKEN;
  return t && t.length > 0 ? t : undefined;
}

/** Strip the push token from any string before it can surface. */
function sanitize(message: string): string {
  const t = pushToken();
  if (!t) return message;
  return message.split(t).join('***');
}

/**
 * repo-relative → source-logical: `packages/server/src/mud/obj/Foo.ts` →
 * `/server/src/mud/obj/Foo.ts` (the packages-stripped, leading-`/` form
 * `AccessApi.resolveSourceFolderZone` walks against the template tree). A
 * path outside `packages/` (`docs/`, `deploy/`, root config) has **no**
 * source-logical form → `null` → the gate fails closed (untitled is nobody's
 * owner default → only a core/state writer passes. That safe default is
 * intentional: git is never a permission bypass.
 */
function toSourceLogical(repoRel: string): string | null {
  const prefix = 'packages/';
  if (!repoRel.startsWith(prefix)) return null;
  return '/' + repoRel.slice(prefix.length);
}

/**
 * Normalize a user- or panel-supplied path arg to repo-relative (the
 * space `git status`/`diff` porcelain speaks). The verb speaks
 * source-logical cwd paths (`/server/src/mud/...`), the panel speaks
 * repo-relative (`packages/...`); accept either, convert to repo-relative.
 * A leading `/` marks a source-logical path (`packages` re-prefixed);
 * anything else is already repo-relative.
 */
function repoRelOf(input: string): string {
  const p = input.trim();
  if (p.startsWith('/')) return 'packages' + p;
  return p;
}

/**
 * The acting principal — resolved from the execution context
 * (`getActingAuthor`), **NEVER a caller-supplied argument** (the CMS /
 * provenance anti-spoof property). A context with no derivable actor
 * yields `null` → every gate fails closed. Verbatim from `CmsLogic`.
 */
function actingActor(): Stuff | null {
  return (ExecutionContextApi.getActingAuthor() as Stuff | null) ?? null;
}

/**
 * Source-tree write gate — verbatim from `CmsLogic.gateSourceWrite` /
 * `WriteController._gateSourceWrite` (per D1: mirror, don't share). Two
 * checks: `isWizard(actor)` AND `can(actor, 'write',
 * resolveSourceFolderZone(sourceLogical))`. Returns null on allow, a
 * human-readable reason on deny.
 */
async function gateSourceWrite(
  actor: Stuff | null,
  sourceLogical: string
): Promise<string | null> {
  if (!(await AccessApi.isWizard(actor))) {
    return "you don't have permission to write source";
  }
  const resource = await AccessApi.resolveSourceFolderZone(sourceLogical);
  if (!(await AccessApi.can(actor, 'write', resource))) {
    return "you don't have permission to write to that source slice";
  }
  return null;
}

/** The avatar-scoped commit author: `<Name> <playerId@saxonberg.local>`.
 * Hard-derived from the acting avatar, never caller-supplied; the synthetic
 * email keeps real (Google) addresses out of the public repo history. */
interface AuthorLike {
  getName(): string;
  getPlayerId(): string;
}
function syntheticAuthor(actor: Stuff): string {
  const a = actor as unknown as AuthorLike;
  return `${a.getName()} <${a.getPlayerId()}@saxonberg.local>`;
}

/** Fail loud off a git working tree (never a silent no-op). */
async function assertRepo(): Promise<void> {
  if (!(await git().checkIsRepo())) {
    throw new GitError('not-a-repo', 'not a git working tree');
  }
}

/** A commit sha or a safe ref: hex, or the git ref charset (no shell
 * metacharacters). Defense-in-depth — simple-git spawns without a shell. */
function isSafeRef(sha: string): boolean {
  return /^[0-9a-zA-Z_./~^-]{1,100}$/.test(sha);
}

/**
 * Push the current branch to `origin`, authenticating with the shared
 * token via a per-command `http.extraHeader` bearer (so the token never
 * enters a remote URL / `git remote -v`). A rejection (protected branch /
 * non-fast-forward) is **not** an error: the local commit is durable and
 * re-pushable — return `pushed:false` with a sanitized reason. Any git
 * output is token-sanitized before it surfaces.
 */
async function pushCurrentBranch(branch: string): Promise<{
  pushed: boolean;
  detail: string;
}> {
  const token = pushToken();
  const args: string[] = [];
  if (token) {
    args.push('-c', `http.extraHeader=AUTHORIZATION: bearer ${token}`);
  }
  args.push('push', 'origin', `HEAD:${branch}`);
  try {
    await git().raw(args);
    return { pushed: true, detail: `pushed ${branch}` };
  } catch (err) {
    const reason = sanitize((err as Error).message ?? 'push failed');
    return {
      pushed: false,
      detail: `push to ${branch} rejected (commit retained locally): ${reason}`,
    };
  }
}

/**
 * GitLogic — the hot-reloadable logic singleton behind {@link GitApi}.
 *
 * Lives at `/platform/idea/api/git` (a stateless `Stuff` singleton, no backing
 * `Template`); `GitApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and calls
 * a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): the repo root is
 * memoised in the module-private `rootCache`, and all non-gate logic lives
 * in module-private free functions (the token read, the path-space
 * translations, the verbatim source-write gate, the push) so there are no
 * intra-singleton `this.x()` self-calls the gate would deny — the
 * `SourceTreeLogic` / `CmsLogic` pattern.
 *
 * The whole security spine: reads are `isWizard`-gated; `publish` /
 * `revert` additionally run the per-affected-path source-write gate. The
 * push token and the synthetic author email are hard-derived here, never
 * caller-supplied.
 *
 * The `FromModule` gate is applied **per public method**, not at the class
 * level.
 *
 * @internal
 */
@Unshadowable
export class GitLogic extends ApiLogic {
  /** See {@link GitApi.status}. */
  @CallSecurity(GitApiCallers)
  public async status(): Promise<GitStatusResult> {
    const actor = actingActor();
    if (!(await AccessApi.isWizard(actor))) {
      throw new GitError('denied', 'you must be a wizard to read git status');
    }
    await assertRepo();
    const s = await git().status();
    const diverged = s.ahead > 0 || s.behind > 0 || s.tracking == null;
    const warnings: string[] = [];
    if (diverged) {
      warnings.push(
        s.tracking == null
          ? `branch '${s.current ?? '(detached)'}' has no upstream tracking branch`
          : `local branch diverges from ${s.tracking} (ahead ${s.ahead}, behind ${s.behind})`
      );
    }
    return {
      branch: s.current ?? '(detached)',
      tracking: s.tracking,
      ahead: s.ahead,
      behind: s.behind,
      diverged,
      files: s.files.map((f) => ({
        path: f.path,
        index: f.index,
        workingDir: f.working_dir,
      })),
      warnings,
    };
  }

  /** See {@link GitApi.diff}. */
  @CallSecurity(GitApiCallers)
  public async diff(pathArg?: string): Promise<GitDiffResult> {
    const actor = actingActor();
    if (!(await AccessApi.isWizard(actor))) {
      throw new GitError('denied', 'you must be a wizard to read git diffs');
    }
    await assertRepo();
    const rel = pathArg ? repoRelOf(pathArg) : undefined;
    // Pathspec after `--`, never interpolated into a command string.
    const patch = rel
      ? await git().diff(['--', rel])
      : await git().diff();
    return rel ? { path: rel, patch } : { patch };
  }

  /** See {@link GitApi.log}. */
  @CallSecurity(GitApiCallers)
  public async log(opts?: {
    limit?: number;
    pathArg?: string;
  }): Promise<GitLogEntry[]> {
    const actor = actingActor();
    if (!(await AccessApi.isWizard(actor))) {
      throw new GitError('denied', 'you must be a wizard to read git log');
    }
    await assertRepo();
    const rel = opts?.pathArg ? repoRelOf(opts.pathArg) : undefined;
    const result = await git().log({
      maxCount: opts?.limit ?? DEFAULT_LOG_LIMIT,
      ...(rel ? { file: rel } : {}),
    });
    return result.all.map((c) => ({
      sha: c.hash,
      author: `${c.author_name} <${c.author_email}>`,
      date: c.date,
      message: c.message,
    }));
  }

  /** See {@link GitApi.publish}. */
  @CallSecurity(GitApiCallers)
  public async publish(message: string): Promise<GitPublishResult> {
    const actor = actingActor();
    if (!actor || !(await AccessApi.isWizard(actor))) {
      throw new GitError('denied', 'you must be a wizard to publish');
    }
    await assertRepo();
    const s = await git().status();
    const branch = s.current ?? '(detached)';

    // The dirty set is staged ∪ unstaged ∪ untracked — a wizard's new
    // (untracked) file must be publishable, not just tracked edits.
    const committedPaths: string[] = [];
    const skippedPaths: string[] = [];
    for (const f of s.files) {
      const logical = toSourceLogical(f.path);
      // A `null` logical (path outside packages/) still flows in → the
      // gate resolves it to core-owned → denied for a normal wizard.
      const denial = await gateSourceWrite(actor, logical ?? f.path);
      if (denial === null) committedPaths.push(f.path);
      else skippedPaths.push(f.path);
    }

    if (committedPaths.length === 0) {
      return {
        committed: false,
        committedPaths,
        skippedPaths,
        pushed: false,
        branch,
        detail: 'nothing you may write is dirty',
      };
    }

    // Explicit `--` + array args: simple-git spawns without a shell, so
    // no path can be interpreted as an option or injected.
    await git().add(['--', ...committedPaths]);
    await git().raw([
        ...COMMITTER_CONFIG.flatMap((c) => ['-c', c]),
        'commit',
        '--author',
        syntheticAuthor(actor),
        '-m',
        message,
      ]);
    const sha = (await git().revparse(['HEAD'])).trim();

    const push = await pushCurrentBranch(branch);
    return {
      committed: true,
      sha,
      committedPaths,
      skippedPaths,
      pushed: push.pushed,
      branch,
      detail:
        `committed ${committedPaths.length} file(s)` +
        (skippedPaths.length > 0
          ? `, left ${skippedPaths.length} you may not write`
          : '') +
        `; ${push.detail}`,
    };
  }

  /** See {@link GitApi.revert}. */
  @CallSecurity(GitApiCallers)
  public async revert(sha: string): Promise<GitRevertResult> {
    const actor = actingActor();
    if (!actor || !(await AccessApi.isWizard(actor))) {
      throw new GitError('denied', 'you must be a wizard to revert');
    }
    await assertRepo();
    if (!isSafeRef(sha)) {
      throw new GitError('bad-ref', `not a valid commit ref: ${sha}`);
    }

    // Every path the commit touched must be writable by the actor — any
    // out-of-scope path rejects the whole revert (no partial revert).
    const raw = await git().raw([
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      sha,
    ]);
    const touched = raw
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    for (const p of touched) {
      const denial = await gateSourceWrite(actor, toSourceLogical(p) ?? p);
      if (denial !== null) {
        throw new GitError(
          'denied',
          `revert touches a path you may not write: ${p}`
        );
      }
    }

    // `git revert` has no `--author`, so revert (no-commit) then commit
    // with the actor as author. A conflict aborts and surfaces cleanly.
    try {
      await git().raw(['revert', '--no-commit', sha]);
    } catch (err) {
      try {
        await git().raw(['revert', '--abort']);
      } catch {
        // best-effort abort; the reset below is the safety net
      }
      throw new GitError(
        'conflict',
        `revert of ${sha} conflicts and was aborted: ${sanitize(
          (err as Error).message ?? 'conflict'
        )}`
      );
    }
    await git().raw([
        ...COMMITTER_CONFIG.flatMap((c) => ['-c', c]),
        'commit',
        '--author',
        syntheticAuthor(actor),
        '-m',
        `Revert ${sha}`,
      ]);
    const newSha = (await git().revparse(['HEAD'])).trim();
    return {
      reverted: true,
      sha: newSha,
      detail: `reverted ${sha} in ${touched.length} file(s)`,
    };
  }
}

/**
 * Test-only seam: point `repoRoot()` at a fixture repo. `repoRoot` is
 * otherwise computed from this module's own file location, which is the
 * live source tree — no acceptance test may touch that. Pass `null` to
 * restore the computed root.
 */
// eslint-disable-next-line no-restricted-syntax -- test-only white-box seam: inject a fixture repo root (the module otherwise computes it from its own file location); mirrors SourceTreeLogic's rootCache pattern.
export function _setRepoRootForTesting(root: string | null): void {
  repoRootOverride = root;
  rootCache = null;
}
