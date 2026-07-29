/**
 * WatchController — the `watch` verb writes the per-viewer `cockpit.watch`
 * embed target (transient clientState) and pushes it. Mirrors the
 * ModeController harness (a HasInteractive TestActor, spied push). Covers
 * embed-shape resolution across platforms, `watch off`, the bare-YouTube-
 * handle deferral, and the parse rejections. The implied chat-tune is a
 * no-op here (the TestActor isn't an Avatar), keeping the embed logic
 * isolated.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import WatchController from '../WatchController';
import { HasInteractiveMixin } from '../../../../lib/connection/HasInteractive';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { Idea } from '../../../../lib/stuff/Idea';
import Location from '../../../../lib/stuff/Location';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../api/command';
import { StuffApi } from '../../../../api/stuff';
import { MessageApi } from '../../../../api/message';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { WatchTarget } from '@saxonberg/types';

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    'verbs: [watch]\ncontroller: WatchController\ndescription: stub\n',
    '<test>',
  );
}

function makeContext(actor: TestActor, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'watch',
    executionId: 'test',
    commandId: 'test',
    verb: 'watch',
    command: stubCommand(),
  });
}

interface WatchModel extends ModelData {
  subcommand?: string;
  target?: string;
  twitch?: boolean;
  youtube?: boolean;
  kick?: boolean;
}

function watched(actor: TestActor): WatchTarget | null {
  return actor.getClientState<WatchTarget | null>('cockpit.watch') ?? null;
}

describe('WatchController', () => {
  let actor: TestActor;
  let location: Location;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    location = makeStuff(() => new Location());
    actor = makeStuff(() => new TestActor());
    pushSpy = vi
      .spyOn(actor, 'pushClientStateUpdate')
      .mockImplementation(() => {});
    vi.spyOn(MessageApi, 'scene').mockReturnValue({
      topic: () => ({ toSelf: () => ({ send: () => undefined }) }),
    } as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function run(model: WatchModel): Promise<CommandContext> {
    const ctx = makeContext(actor, location);
    await makeStuff(() => new WatchController()).execute(model as never, ctx);
    return ctx;
  }

  it('watch <handle> --twitch sets the twitch embed + pushes', async () => {
    await run({ target: 'shroud', twitch: true });
    expect(watched(actor)).toEqual({ platform: 'twitch', channel: 'shroud' });
    expect(pushSpy).toHaveBeenCalledWith('cockpit.watch', {
      platform: 'twitch',
      channel: 'shroud',
    });
  });

  it('watch <twitch URL> sets the twitch embed', async () => {
    await run({ target: 'https://twitch.tv/shroud' });
    expect(watched(actor)).toEqual({ platform: 'twitch', channel: 'shroud' });
  });

  it('watch <youtube watch URL> sets a videoId embed', async () => {
    await run({ target: 'https://youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(watched(actor)).toEqual({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
    });
  });

  it('watch <UC… channelId URL> sets a channelId embed', async () => {
    const uc = 'UC' + 'x'.repeat(22);
    await run({ target: `youtube.com/channel/${uc}` });
    expect(watched(actor)).toEqual({ platform: 'youtube', channelId: uc });
  });

  it('watch <handle> --kick sets the kick embed + pushes (no resolve)', async () => {
    await run({ target: 'XQC', kick: true });
    expect(watched(actor)).toEqual({ platform: 'kick', channel: 'xqc' });
    expect(pushSpy).toHaveBeenCalledWith('cockpit.watch', {
      platform: 'kick',
      channel: 'xqc',
    });
  });

  it('watch <kick URL> sets the kick embed', async () => {
    await run({ target: 'https://kick.com/xqc' });
    expect(watched(actor)).toEqual({ platform: 'kick', channel: 'xqc' });
  });

  it('watch off clears the embed', async () => {
    await run({ target: 'shroud', twitch: true });
    const ctx = await run({ subcommand: 'off' });
    expect(watched(actor)).toBeNull();
    expect(pushSpy).toHaveBeenLastCalledWith('cockpit.watch', null);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
  });

  it('bare YouTube @handle points at a URL when the reader is unconfigured', async () => {
    // No YOUTUBE_READER_* env in tests → the @handle resolve reports
    // no-relay and the controller reject-and-points at a URL.
    const ctx = await run({ target: 'mkbhd', youtube: true });
    expect(watched(actor)).toBeNull();
    expect(
      ctx
        .getNotes()
        .some(
          (n) =>
            n.kind === 'controller-rejected' &&
            (n as { reason: string }).reason === 'no-relay',
        ),
    ).toBe(true);
  });

  it('ambiguous bare handle reject-and-points, no embed', async () => {
    const ctx = await run({ target: 'shroud', twitch: true, youtube: true });
    expect(watched(actor)).toBeNull();
    expect(
      ctx
        .getNotes()
        .some(
          (n) =>
            n.kind === 'controller-rejected' &&
            (n as { reason: string }).reason === 'ambiguous-handle',
        ),
    ).toBe(true);
  });
});
