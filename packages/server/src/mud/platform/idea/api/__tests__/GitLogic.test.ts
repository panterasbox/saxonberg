/**
 * GitLogic (via GitApi) — the whole in-runtime-VCS security spine.
 *
 * Driven through the gated `GitApi` (the FromModule gate resolves the Api
 * as caller). The mechanism runs against a real throwaway git repo with a
 * **local bare remote** (Phase 6 fixture) — DB-free, no network, no real
 * GitLab. `GitLogic.repoRoot()` is pointed at the fixture work tree via the
 * sanctioned `_setRepoRootForTesting` seam.
 *
 * The acting principal is spied onto the execution context
 * (`getActingAuthor` → a fake avatar); the access predicates
 * (`isWizard` / `can` / `resolveSourceFolderZone`) are spied so the
 * per-path write gate is controllable without an AccessRegistry bootstrap.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { GitApi } from '../../../../api/git';
import { GitLogic, _setRepoRootForTesting } from '../GitLogic';
import { AccessApi } from '../../../../api/access';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { StuffApi } from '../../../../api/stuff';
import { SecurityError } from '../../../../lib/security/errors';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../../lib/stuff/Stuff';

/** A fake acting avatar: getName/getPlayerId feed the synthetic --author. */
const ACTOR = {
  getName: () => 'Alice',
  getPlayerId: () => 'alice',
  getTemplatePath: () => '/platform/agent/Avatar/alice',
} as unknown as Stuff;

// The two source paths under test (repo-relative), and their
// source-logical forms (the space gateSourceWrite / resolveSourceFolderZone
// speak). One writable, one not.
const BAR_REL = 'packages/server/src/mud/lib/lounge/Bar.ts';
const OTHER_REL = 'packages/server/src/mud/obj/Other.ts';
const DOCS_REL = 'docs/foo.md';
const BAR_LOGICAL = '/server/src/mud/lib/lounge/Bar.ts';

/** Set of source-logical paths the spied `can('write')` allows. */
let writable: Set<string>;

let work: string;
let bare: string;

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/** Write a file (creating parent dirs) under the work tree. */
function put(rel: string, content: string): void {
  const abs = path.join(work, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
}

/** Stage + commit everything and return the new HEAD sha. */
function commitAll(message: string): string {
  git(work, ['add', '-A']);
  git(work, ['commit', '-m', message]);
  return git(work, ['rev-parse', 'HEAD']).trim();
}

beforeEach(() => {
  bare = mkdtempSync(path.join(tmpdir(), 'gitlogic-bare-'));
  work = mkdtempSync(path.join(tmpdir(), 'gitlogic-work-'));
  git(bare, ['-c', 'init.defaultBranch=main', 'init', '--bare']);
  git(work, ['-c', 'init.defaultBranch=main', 'init']);
  git(work, ['config', 'user.email', 'fixture@saxonberg.local']);
  git(work, ['config', 'user.name', 'Fixture']);
  git(work, ['remote', 'add', 'origin', bare]);

  put(BAR_REL, 'export const bar = 0;\n');
  put(OTHER_REL, 'export const other = 0;\n');
  put(DOCS_REL, '# docs\n');
  commitAll('initial');
  git(work, ['push', '-u', 'origin', 'main']);

  _setRepoRootForTesting(work);

  writable = new Set<string>([BAR_LOGICAL]);
  vi.spyOn(ExecutionContextApi, 'getActingAuthor').mockReturnValue(ACTOR);
  vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
  // Echo the source-logical path as the "zone" so `can` can key on it.
  vi.spyOn(AccessApi, 'resolveSourceFolderZone').mockImplementation(
    async (p: string) => ({ logical: p }) as unknown as Stuff
  );
  vi.spyOn(AccessApi, 'can').mockImplementation(
    async (_actor: unknown, _action: string, resource: unknown) =>
      writable.has((resource as { logical?: string })?.logical ?? '__none__')
  );
});

afterEach(() => {
  _setRepoRootForTesting(null);
  vi.restoreAllMocks();
  rmSync(bare, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
});

describe('GitApi.status', () => {
  it('reports the dirty set (repo-relative + porcelain codes)', async () => {
    put(BAR_REL, 'export const bar = 1;\n');
    const s = await GitApi.status();
    expect(s.branch).toBe('main');
    const bar = s.files.find((f) => f.path === BAR_REL);
    expect(bar).toBeDefined();
    expect(bar?.workingDir).toBe('M');
  });

  it('is denied to a non-wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(GitApi.status()).rejects.toMatchObject({ code: 'denied' });
  });

  it('fails loud off a git working tree', async () => {
    const notRepo = mkdtempSync(path.join(tmpdir(), 'gitlogic-norepo-'));
    _setRepoRootForTesting(notRepo);
    try {
      await expect(GitApi.status()).rejects.toMatchObject({
        code: 'not-a-repo',
      });
    } finally {
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  it('warns (does not block) when local diverges from remote', async () => {
    // Advance the bare remote ahead of local via a throwaway clone, then
    // fetch so local knows it is behind.
    const other = mkdtempSync(path.join(tmpdir(), 'gitlogic-adv-'));
    try {
      git(other, ['clone', bare, '.']);
      git(other, ['config', 'user.email', 'adv@saxonberg.local']);
      git(other, ['config', 'user.name', 'Adv']);
      writeFileSync(path.join(other, 'advance.txt'), 'x\n', 'utf8');
      git(other, ['add', '-A']);
      git(other, ['commit', '-m', 'advance remote']);
      git(other, ['push', 'origin', 'main']);
      git(work, ['fetch', 'origin']);

      const s = await GitApi.status();
      expect(s.diverged).toBe(true);
      expect(s.behind).toBeGreaterThan(0);
      expect(s.warnings.length).toBeGreaterThan(0);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });
});

describe('GitApi.diff / log', () => {
  it('diff is denied to a non-wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(GitApi.diff()).rejects.toMatchObject({ code: 'denied' });
  });

  it('log is denied to a non-wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(GitApi.log()).rejects.toMatchObject({ code: 'denied' });
  });

  it('log returns the commit history', async () => {
    const rows = await GitApi.log({ limit: 10 });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.message).toContain('initial');
  });

  it('diff scoped to a path returns a patch', async () => {
    put(BAR_REL, 'export const bar = 2;\n');
    const d = await GitApi.diff(BAR_REL);
    expect(d.path).toBe(BAR_REL);
    expect(d.patch).toContain('bar = 2');
  });
});

describe('GitApi.publish', () => {
  it('stages only writable dirty files; leaves the rest dirty', async () => {
    put(BAR_REL, 'export const bar = 1;\n'); // writable
    put(OTHER_REL, 'export const other = 1;\n'); // not writable

    const r = await GitApi.publish('edit bar and other');
    expect(r.committed).toBe(true);
    expect(r.committedPaths).toEqual([BAR_REL]);
    expect(r.skippedPaths).toContain(OTHER_REL);

    // Other.ts is still dirty in the working tree.
    const st = git(work, ['status', '--porcelain']);
    expect(st).toContain(OTHER_REL);
    // The commit tree contains only Bar.ts.
    const changed = git(work, [
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      'HEAD',
    ]);
    expect(changed).toContain('lib/lounge/Bar.ts');
    expect(changed).not.toContain('obj/Other.ts');
  });

  it('commit carries --author = avatar + synthetic email', async () => {
    put(BAR_REL, 'export const bar = 1;\n');
    await GitApi.publish('edit bar');
    const authored = git(work, [
      'log',
      '-1',
      '--format=%an <%ae>',
    ]).trim();
    expect(authored).toBe('Alice <alice@saxonberg.local>');
  });

  it('pushes the current branch to the (bare) remote', async () => {
    put(BAR_REL, 'export const bar = 1;\n');
    const r = await GitApi.publish('edit bar');
    expect(r.pushed).toBe(true);
    const localSha = git(work, ['rev-parse', 'HEAD']).trim();
    const remote = git(work, ['ls-remote', bare, 'refs/heads/main']).trim();
    expect(remote.startsWith(localSha)).toBe(true);
  });

  it('publishes an untracked file the wizard authored', async () => {
    put('packages/server/src/mud/lib/lounge/New.ts', 'export const n = 1;\n');
    writable.add('/server/src/mud/lib/lounge/New.ts');
    const r = await GitApi.publish('add new');
    expect(r.committed).toBe(true);
    expect(r.committedPaths).toContain(
      'packages/server/src/mud/lib/lounge/New.ts'
    );
  });

  it('commits nothing when no writable file is dirty', async () => {
    put(OTHER_REL, 'export const other = 1;\n'); // not writable
    const r = await GitApi.publish('try');
    expect(r.committed).toBe(false);
    expect(r.committedPaths).toEqual([]);
    expect(r.detail).toContain('nothing you may write');
  });

  it('treats a docs/ path (outside packages/) as un-publishable', async () => {
    put(DOCS_REL, '# docs edited\n');
    const r = await GitApi.publish('edit docs');
    // docs/ has no source-logical form → core-owned → denied for a wizard.
    expect(r.committed).toBe(false);
    expect(r.skippedPaths).toContain(DOCS_REL);
  });

  it('is denied to a non-wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(GitApi.publish('x')).rejects.toMatchObject({
      code: 'denied',
    });
  });
});

describe('GitApi.revert', () => {
  it('reverts an in-scope commit, authored to the actor', async () => {
    put(BAR_REL, 'export const bar = 9;\n');
    const sha = commitAll('change bar');
    const r = await GitApi.revert(sha);
    expect(r.reverted).toBe(true);
    // The revert commit exists and is authored to the actor.
    const authored = git(work, ['log', '-1', '--format=%an <%ae>']).trim();
    expect(authored).toBe('Alice <alice@saxonberg.local>');
    // Bar.ts is back to its pre-change content.
    const head = git(work, ['show', 'HEAD:' + BAR_REL]);
    expect(head).toContain('bar = 0');
  });

  it('rejects a commit touching an out-of-scope path', async () => {
    put(OTHER_REL, 'export const other = 9;\n');
    const sha = commitAll('change other');
    const before = git(work, ['rev-parse', 'HEAD']).trim();
    await expect(GitApi.revert(sha)).rejects.toMatchObject({ code: 'denied' });
    // No new commit was created.
    expect(git(work, ['rev-parse', 'HEAD']).trim()).toBe(before);
  });

  it('rejects a malformed ref (defense in depth)', async () => {
    await expect(GitApi.revert('bad ref; rm -rf')).rejects.toMatchObject({
      code: 'bad-ref',
    });
  });

  it('is denied to a non-wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    await expect(GitApi.revert('HEAD')).rejects.toMatchObject({
      code: 'denied',
    });
  });
});

describe('GitLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-GitApi caller', () => {
    const logic = makeStuffAtPath(() => new GitLogic(), '/platform/idea/api/git');
    expect(StuffApi.findByTemplatePath('/platform/idea/api/git')).toBe(logic);
    // The test module is not mud/api/git#GitApi; the FromModule gate on
    // the logic's own methods denies synchronously.
    expect(() => logic.status()).toThrow(SecurityError);
  });
});
