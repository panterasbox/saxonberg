/**
 * GitController — the `git` verb maps the bound model onto GitApi
 * status/diff/log/publish/revert, defaults a bare invocation to status,
 * enforces the required message (publish) / sha (revert) with rejection
 * notes, and translates a thrown `GitError` into a `controller-rejected`
 * note. Output is captured by spying Mml.escape + a no-op scene chainable
 * (the ErrorsController.test harness); GitApi is stubbed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GitController from '../GitController';
import { GitApi, GitError } from '../../../../api/git';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { GitStatusResult } from '@saxonberg/types';

interface GitModel extends CommandModel {
  subcommand?: string;
  path?: string;
  sha?: string;
  message?: string;
  limit?: number;
}

function status(over: Partial<GitStatusResult> = {}): GitStatusResult {
  return {
    branch: 'authoring',
    tracking: 'origin/authoring',
    ahead: 0,
    behind: 0,
    diverged: false,
    files: [],
    warnings: [],
    ...over,
  };
}

describe('GitController', () => {
  let ctrl: GitController;
  let ctx: CommandContext;
  let output: string[];
  let note: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(GitApi, 'status').mockResolvedValue(status());
    vi.spyOn(GitApi, 'diff').mockResolvedValue({ patch: '' });
    vi.spyOn(GitApi, 'log').mockResolvedValue([]);
    vi.spyOn(GitApi, 'publish').mockResolvedValue({
      committed: true,
      sha: 'abcdef1234',
      committedPaths: ['packages/server/src/mud/lib/lounge/Bar.ts'],
      skippedPaths: [],
      pushed: true,
      branch: 'authoring',
      detail: 'ok',
    });
    vi.spyOn(GitApi, 'revert').mockResolvedValue({
      reverted: true,
      sha: 'fedcba9876',
      detail: 'reverted',
    });

    ctrl = makeStuff(() => new GitController());

    output = [];
    const realEscape = Mml.escape.bind(Mml);
    vi.spyOn(Mml, 'escape').mockImplementation((s: string) => {
      output.push(s);
      return realEscape(s);
    });
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.send = () => {};
      return b as never;
    });

    note = vi.fn();
    ctx = {
      commandGiver: { getTemplatePath: () => '/obj/Avatar/alice' } as never,
      note,
    } as unknown as CommandContext;
  });

  afterEach(() => vi.restoreAllMocks());

  const run = (m: GitModel) => ctrl.execute(m as never, ctx);

  it('defaults a bare invocation to status', async () => {
    await run({});
    expect(GitApi.status).toHaveBeenCalled();
    expect(output.join('\n')).toContain('On branch authoring');
  });

  it('renders the dirty set + divergence warning', async () => {
    vi.mocked(GitApi.status).mockResolvedValue(
      status({
        diverged: true,
        behind: 1,
        warnings: ['local branch diverges from origin/authoring'],
        files: [
          {
            path: 'packages/server/src/mud/lib/lounge/Bar.ts',
            index: ' ',
            workingDir: 'M',
          },
        ],
      })
    );
    await run({ subcommand: 'status' });
    const text = output.join('\n');
    expect(text).toContain('diverges');
    expect(text).toContain('lib/lounge/Bar.ts');
  });

  it('diff maps the path arg', async () => {
    vi.mocked(GitApi.diff).mockResolvedValue({ path: 'x', patch: 'PATCH' });
    await run({ subcommand: 'diff', path: 'packages/server/x.ts' });
    expect(GitApi.diff).toHaveBeenCalledWith('packages/server/x.ts');
    expect(output.join('\n')).toContain('PATCH');
  });

  it('log maps limit + path', async () => {
    await run({ subcommand: 'log', limit: 5, path: 'docs' });
    expect(GitApi.log).toHaveBeenCalledWith({ limit: 5, pathArg: 'docs' });
  });

  it('publish requires a message', async () => {
    await run({ subcommand: 'publish' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'missing-message',
      })
    );
    expect(GitApi.publish).not.toHaveBeenCalled();
  });

  it('publish forwards the message and reports the result', async () => {
    await run({ subcommand: 'publish', message: 'fix bar' });
    expect(GitApi.publish).toHaveBeenCalledWith('fix bar');
    expect(output.join('\n')).toContain('Committed 1 file');
  });

  it('revert requires a sha', async () => {
    await run({ subcommand: 'revert' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'missing-sha' })
    );
    expect(GitApi.revert).not.toHaveBeenCalled();
  });

  it('revert forwards the sha', async () => {
    await run({ subcommand: 'revert', sha: '1a2b3c4' });
    expect(GitApi.revert).toHaveBeenCalledWith('1a2b3c4');
    expect(output.join('\n')).toContain('Reverted');
  });

  it('translates a GitError into a controller-rejected note', async () => {
    vi.mocked(GitApi.status).mockRejectedValue(
      new GitError('not-a-repo', 'not a git working tree')
    );
    await run({ subcommand: 'status' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'not-a-repo',
      })
    );
  });
});
