/**
 * ErrorsController — the `errors` verb maps the bound model onto
 * DiagnosticApi.list / rawTail / clear and gates raw (wizard-only) + clear
 * (author-of-path, via the -1 sentinel). Output is captured by spying
 * Mml.fromMarkup + a no-op scene chainable (the BulletinController.test
 * harness); DiagnosticApi / AccessApi are stubbed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ErrorsController from '../ErrorsController';
import { DiagnosticApi } from '../../../../api/diagnostics';
import { AccessApi } from '../../../../api/access';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { DiagnosticDoc } from '@saxonberg/types';

interface ErrorsModel extends CommandModel {
  subcommand?: string;
  path?: string;
  channel?: string;
  severity?: string;
  source?: string;
  mine?: boolean;
  limit?: number;
  grep?: string;
}

function row(over: Partial<DiagnosticDoc>): DiagnosticDoc {
  return {
    source: 'runtime',
    severity: 'error',
    channel: 'zone.lounge',
    path: '/lib/lounge/Bar',
    author: null,
    versionId: null,
    code: null,
    line: 12,
    col: null,
    message: 'brain threw',
    stack: null,
    ts: 1,
    expiresAt: new Date(),
    ...over,
  };
}

describe('ErrorsController', () => {
  let ctrl: ErrorsController;
  let ctx: CommandContext;
  let output: string[];
  let note: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(DiagnosticApi, 'list').mockResolvedValue([]);
    vi.spyOn(DiagnosticApi, 'rawTail').mockReturnValue([]);
    vi.spyOn(DiagnosticApi, 'clear').mockResolvedValue(0);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(true);

    ctrl = makeStuff(() => new ErrorsController());

    output = [];
    const realFromMarkup = Mml.fromMarkup.bind(Mml);
    vi.spyOn(Mml, 'fromMarkup').mockImplementation((s: string) => {
      output.push(s);
      return realFromMarkup(s);
    });
    // The simple-text branches (empty list / clear / raw-empty) render via
    // Mml.escape → toSelf, so capture those too.
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

  const run = (m: ErrorsModel) => ctrl.execute(m as never, ctx);

  it('rejects a non-author non-wizard with a note', async () => {
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    await run({});
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'not-authorised' })
    );
    expect(DiagnosticApi.list).not.toHaveBeenCalled();
  });

  it('admits a wizard who is not an author', async () => {
    vi.spyOn(AccessApi, 'isAuthor').mockResolvedValue(false);
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    await run({});
    expect(DiagnosticApi.list).toHaveBeenCalled();
  });

  it('list (default) maps filters onto DiagnosticApi.list', async () => {
    vi.mocked(DiagnosticApi.list).mockResolvedValue([row({})]);
    await run({ channel: 'zone.lounge', severity: 'error', limit: 5 });
    expect(DiagnosticApi.list).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: ['zone.lounge'],
        severity: 'error',
        limit: 5,
      })
    );
    expect(output.join('\n')).toContain('brain threw');
  });

  it('--mine scopes to the actor templatePath', async () => {
    await run({ mine: true });
    expect(DiagnosticApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ author: '/obj/Avatar/alice' })
    );
  });

  it('list with no results notes nothing and says so', async () => {
    await run({});
    expect(note).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('No diagnostics match');
  });

  it('raw is wizard-gated (rejects a non-wizard)', async () => {
    await run({ subcommand: 'raw' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'controller-rejected', reason: 'wizard-only' })
    );
    expect(DiagnosticApi.rawTail).not.toHaveBeenCalled();
  });

  it('raw tails the ring for a wizard', async () => {
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    vi.mocked(DiagnosticApi.rawTail).mockReturnValue([
      { level: 'error', text: 'boom', ts: 1 },
    ]);
    await run({ subcommand: 'raw', grep: 'boo' });
    expect(DiagnosticApi.rawTail).toHaveBeenCalledWith({
      grep: 'boo',
      limit: 30, // default short tail
    });
    expect(output.join('\n')).toContain('boom');
  });

  it('clear requires a path', async () => {
    await run({ subcommand: 'clear' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'missing-path' })
    );
  });

  it('clear surfaces a denied note on the -1 sentinel', async () => {
    vi.mocked(DiagnosticApi.clear).mockResolvedValue(-1);
    await run({ subcommand: 'clear', path: '/lib/lounge/Bar' });
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'denied' })
    );
  });

  it('clear reports the count on success', async () => {
    vi.mocked(DiagnosticApi.clear).mockResolvedValue(3);
    await run({ subcommand: 'clear', path: '/lib/lounge/Bar' });
    expect(DiagnosticApi.clear).toHaveBeenCalledWith('/lib/lounge/Bar');
    expect(output.join('\n')).toContain('Cleared 3');
  });
});
