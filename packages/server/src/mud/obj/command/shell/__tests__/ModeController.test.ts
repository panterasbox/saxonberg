/**
 * ModeController tests — the server-authoritative per-bar input mode.
 *
 * `mode <prefix>` / `mode off`, issued from a bar (`context.barId`),
 * set/clear that bar's entry in `cockpit.inputModes`. Mirrors the
 * StyleController harness; the push wire is spied.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ModeController from '../ModeController';
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
import { ShadowApi } from '../../../../api/shadow';
import { ContainmentApi } from '../../../../api/containment';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';

class TestActor extends HasInteractiveMixin(
  SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(Idea)))),
) {
  static _mixinName = 'TestActor';
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [mode]\ncontroller: ModeController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(
  actor: TestActor,
  location: Location,
  barId: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: location as never,
    commandText: 'mode',
    executionId: 'test',
    commandId: 'test',
    verb: 'mode',
    command: stubCommand(),
    barId,
  });
}

interface ModeModel extends ModelData {
  prefix?: string;
  bar?: string;
}

function makeModel(args: Partial<ModeModel> = {}): ModeModel {
  return args as ModeModel;
}

function modes(actor: TestActor): Record<string, string> {
  return actor.getClientState<Record<string, string>>('cockpit.inputModes');
}

describe('ModeController', () => {
  let actor: TestActor;
  let location: Location;
  let pushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    location = makeStuff(() => new Location());
    actor = makeStuff(() => new TestActor());
    ContainmentApi.move(actor, location);
    pushSpy = vi
      .spyOn(actor, 'pushClientStateUpdate')
      .mockImplementation(() => {});
  });

  it('sets a bar prefix and pushes the whole map', async () => {
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'main');
    await controller.execute(makeModel({ prefix: 'chat gossip' }), ctx as never);
    expect(modes(actor)).toEqual({ main: 'chat gossip' });
    expect(pushSpy).toHaveBeenCalledWith('cockpit.inputModes', {
      main: 'chat gossip',
    });
  });

  it('modes are per-bar — a different bar is untouched', async () => {
    actor.setClientState('cockpit.inputModes', { main: 'chat gossip' });
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'chat');
    await controller.execute(makeModel({ prefix: 'tell bob' }), ctx as never);
    expect(modes(actor)).toEqual({ main: 'chat gossip', chat: 'tell bob' });
  });

  it('mode off clears only the submitting bar', async () => {
    actor.setClientState('cockpit.inputModes', {
      main: 'chat gossip',
      chat: 'tell bob',
    });
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'main');
    await controller.execute(makeModel({ prefix: 'off' }), ctx as never);
    expect(modes(actor)).toEqual({ chat: 'tell bob' });
  });

  it('bare mode clears the submitting bar', async () => {
    actor.setClientState('cockpit.inputModes', { main: 'chat gossip' });
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'main');
    await controller.execute(makeModel({}), ctx as never);
    expect(modes(actor)).toEqual({});
  });

  it('--bar names the target bar, ignoring the submitting barId', async () => {
    // An un-moded affordance dispatches with no context.barId but names its
    // target. Here the line is submitted from 'main' yet targets stream-chat.
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'main');
    await controller.execute(
      makeModel({ prefix: 'chat', bar: 'stream-chat' }),
      ctx as never,
    );
    expect(modes(actor)).toEqual({ 'stream-chat': 'chat' });
  });

  it('--bar clears a named bar with `off`, leaving others', async () => {
    actor.setClientState('cockpit.inputModes', {
      main: 'chat gossip',
      'stream-chat': 'twitch',
    });
    const controller = makeStuff(() => new ModeController());
    const ctx = makeContext(actor, location, 'main');
    await controller.execute(
      makeModel({ prefix: 'off', bar: 'stream-chat' }),
      ctx as never,
    );
    expect(modes(actor)).toEqual({ main: 'chat gossip' });
  });

  it('defaults to the main bar when no barId is on the context', async () => {
    const controller = makeStuff(() => new ModeController());
    const ctx = CommandApi.createCommandContext({
      commandGiver: actor as never,
      location: location as never,
      commandText: 'mode',
      executionId: 'test',
      commandId: 'test',
      verb: 'mode',
      command: stubCommand(),
    });
    await controller.execute(makeModel({ prefix: 'chat' }), ctx as never);
    expect(modes(actor)).toEqual({ main: 'chat' });
  });
});
