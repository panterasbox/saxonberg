/**
 * ScriptController — the `script <body>` verb. A thin shell over
 * `ScriptApi.run`: it hands the body to the interpreter (the async
 * detach, if any, is the framework's — this controller is unaware of
 * it). Empty body → a usage refusal, no run.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ScriptController from '../ScriptController';
import { ScriptApi } from '../../../../api/script';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';

let captured: Mml | null;

function captureBody(): void {
  captured = null;
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body;
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(actor: Idea): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: actor as never,
    note: vi.fn(),
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  captureBody();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('ScriptController.execute', () => {
  it('hands a non-empty body to ScriptApi.run', async () => {
    const run = vi.spyOn(ScriptApi, 'run').mockResolvedValue(undefined);
    const actor = makeStuff(() => new Idea());
    const ctrl = makeStuff(() => new ScriptController());

    await ctrl.execute(
      { body: 'look; say hi' } as unknown as CommandModel,
      ctxFor(actor)
    );

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('look; say hi');
  });

  it('trims the body before running', async () => {
    const run = vi.spyOn(ScriptApi, 'run').mockResolvedValue(undefined);
    const actor = makeStuff(() => new Idea());
    const ctrl = makeStuff(() => new ScriptController());

    await ctrl.execute(
      { body: '   wait 1   ' } as unknown as CommandModel,
      ctxFor(actor)
    );

    expect(run).toHaveBeenCalledWith('wait 1');
  });

  it('refuses an empty body — a rejection note and no run', async () => {
    const run = vi.spyOn(ScriptApi, 'run').mockResolvedValue(undefined);
    const actor = makeStuff(() => new Idea());
    const ctrl = makeStuff(() => new ScriptController());
    const ctx = ctxFor(actor);

    await ctrl.execute({ body: '   ' } as unknown as CommandModel, ctx);

    expect(run).not.toHaveBeenCalled();
    expect(ctx.note).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'empty-script',
      })
    );
    expect(captured).not.toBeNull();
  });
});
