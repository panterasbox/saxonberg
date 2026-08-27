/**
 * TuneController — the `tune` verb wiring, driven as the dispatcher would:
 * a real controller Stuff whose `execute` forwards to a mocked `StreamApi`
 * (the controller under test is the MVC dispatch + reject-and-point copy,
 * not the relay). Proves tune-in / post / list / who / history / off and
 * the parse + resolve rejections. The relay + resolver themselves are
 * tested in StreamRelay.test.ts / StreamLogic.test.ts.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TuneController from '../TuneController';
import Avatar from '../../../../agent/Avatar';
import { StreamApi } from '../../../../../api/stream';
import { MessageApi } from '../../../../../api/message';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Location from '../../../../../lib/stuff/Location';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { StreamerTarget } from '../../../../../lib/streaming/StreamerTarget';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    'verbs: [tune]\ncontroller: NoopController\ndescription: stub\n',
    '<test>',
  );
}

function makeContext(giver: Avatar): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: 'tune',
    executionId: 'test',
    commandId: 'test',
    verb: 'tune',
    command: stubCommand(),
  });
}

async function run(
  giver: Avatar,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, 'tune.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new TuneController()).execute(model as never, ctx);
  });
}

function rejected(ctx: CommandContext, reason: string): boolean {
  return ctx
    .getNotes()
    .some(
      (n) => n.kind === 'controller-rejected' && (n as { reason: string }).reason === reason,
    );
}

function noRejection(ctx: CommandContext): boolean {
  return !ctx.getNotes().some((n) => n.kind === 'controller-rejected');
}

describe('TuneController', () => {
  beforeEach(() => {
    vi.spyOn(MessageApi, 'scene').mockReturnValue({
      topic: () => ({ toSelf: () => ({ send: () => undefined }) }),
    } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tune <handle> --twitch resolves + tunes, no rejection', async () => {
    const target = new StreamerTarget('twitch', 'b1', 'shroud');
    vi.spyOn(StreamApi, 'resolveTarget').mockResolvedValue({ ok: true, target });
    const tune = vi
      .spyOn(StreamApi, 'tune')
      .mockResolvedValue({ ok: true, service: 'twitch', handle: 'shroud' });

    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, { target: 'shroud', twitch: true } as CommandModel, ctx);

    expect(tune).toHaveBeenCalledWith(giver, target);
    expect(noRejection(ctx)).toBe(true);
  });

  it('tune <handle> --twitch <message> posts', async () => {
    const post = vi.spyOn(StreamApi, 'post').mockResolvedValue({ ok: true });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'shroud', twitch: true, message: 'hello there' } as CommandModel,
      ctx,
    );
    expect(post).toHaveBeenCalledWith(giver, 'twitch', 'shroud', 'hello there');
    expect(noRejection(ctx)).toBe(true);
  });

  it('post to youtube reject-and-points read-only', async () => {
    vi.spyOn(StreamApi, 'post').mockResolvedValue({
      ok: false,
      reason: 'read-only',
    });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'mkbhd', youtube: true, message: 'hi' } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'read-only')).toBe(true);
  });

  it('post while not tuned reject-and-points no-channel', async () => {
    vi.spyOn(StreamApi, 'post').mockResolvedValue({
      ok: false,
      reason: 'no-channel',
    });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'shroud', twitch: true, message: 'hi' } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'no-channel')).toBe(true);
  });

  it('bare tune lists', async () => {
    const list = vi.spyOn(StreamApi, 'tunedTargetsFor').mockResolvedValue([
      { service: 'twitch', key: 'b1', handle: 'shroud' },
    ]);
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, {} as CommandModel, ctx);
    expect(list).toHaveBeenCalled();
    expect(noRejection(ctx)).toBe(true);
  });

  it('tune who <handle> --twitch queries whoTuned', async () => {
    const who = vi.spyOn(StreamApi, 'whoTuned').mockResolvedValue([]);
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { subcommand: 'who', target: 'shroud', twitch: true } as CommandModel,
      ctx,
    );
    expect(who).toHaveBeenCalledWith('twitch', 'shroud');
    expect(noRejection(ctx)).toBe(true);
  });

  it('tune history <handle> --twitch queries historyFor', async () => {
    const hist = vi.spyOn(StreamApi, 'historyFor').mockResolvedValue([]);
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { subcommand: 'history', target: 'shroud', twitch: true } as CommandModel,
      ctx,
    );
    expect(hist).toHaveBeenCalledWith('twitch', 'shroud');
  });

  it('tune off <handle> --twitch untunes', async () => {
    const untune = vi
      .spyOn(StreamApi, 'untune')
      .mockResolvedValue({ ok: true, service: 'twitch', handle: 'shroud' });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { subcommand: 'off', target: 'shroud', twitch: true } as CommandModel,
      ctx,
    );
    expect(untune).toHaveBeenCalledWith(giver, 'twitch', 'shroud');
    expect(noRejection(ctx)).toBe(true);
  });

  it('ambiguous bare handle reject-and-points', async () => {
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    // Both opts → parse yields ambiguous-handle (no StreamApi call).
    await run(
      giver,
      { target: 'shroud', twitch: true, youtube: true } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'ambiguous-handle')).toBe(true);
  });

  it('URL + conflicting opt reject-and-points url-opt-conflict', async () => {
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'twitch.tv/shroud', youtube: true } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'url-opt-conflict')).toBe(true);
  });

  it('--youtube on a character seed reject-and-points character-youtube', async () => {
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, { target: '@alice', youtube: true } as CommandModel, ctx);
    expect(rejected(ctx, 'character-youtube')).toBe(true);
  });

  it('resolve failure (no-relay) reject-and-points', async () => {
    vi.spyOn(StreamApi, 'resolveTarget').mockResolvedValue({
      ok: false,
      reason: 'no-relay',
    });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, { target: 'shroud', twitch: true } as CommandModel, ctx);
    expect(rejected(ctx, 'no-relay')).toBe(true);
  });

  it('tune <handle> --kick resolves + tunes, no rejection', async () => {
    const target = new StreamerTarget('kick', '123', 'xqc');
    vi.spyOn(StreamApi, 'resolveTarget').mockResolvedValue({ ok: true, target });
    const tune = vi
      .spyOn(StreamApi, 'tune')
      .mockResolvedValue({ ok: true, service: 'kick', handle: 'xqc' });

    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, { target: 'xqc', kick: true } as CommandModel, ctx);

    expect(tune).toHaveBeenCalledWith(giver, target);
    expect(noRejection(ctx)).toBe(true);
  });

  it('post to kick reject-and-points read-only', async () => {
    vi.spyOn(StreamApi, 'post').mockResolvedValue({
      ok: false,
      reason: 'read-only',
    });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'xqc', kick: true, message: 'hi' } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'read-only')).toBe(true);
  });

  it('--kick with --twitch reject-and-points ambiguous-handle', async () => {
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(
      giver,
      { target: 'xqc', kick: true, twitch: true } as CommandModel,
      ctx,
    );
    expect(rejected(ctx, 'ambiguous-handle')).toBe(true);
  });

  it('kick resolve failure (no-relay) reject-and-points', async () => {
    vi.spyOn(StreamApi, 'resolveTarget').mockResolvedValue({
      ok: false,
      reason: 'no-relay',
    });
    const giver = makeAvatar('p1');
    const ctx = makeContext(giver);
    await run(giver, { target: 'xqc', kick: true } as CommandModel, ctx);
    expect(rejected(ctx, 'no-relay')).toBe(true);
  });
});
