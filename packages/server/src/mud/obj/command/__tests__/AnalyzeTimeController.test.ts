import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalyzeTimeController from '../AnalyzeTimeController';
import Location from '../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../lib/message/Sensor';
import { ContainableMixin } from '../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../lib/spatial/Container';
import { NamedMixin } from '../../../lib/description/Named';
import { MobileMixin } from '../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../lib/command/CommandDefinition';
import { Idea } from '../../../lib/stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { WorldClockApi } from '../../../api/worldclock';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../api/command';
import type Interactive from '../../Interactive';

class TestLocation extends Location {}

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(avatar: FakeAvatar, location: TestLocation): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze time',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'time' };
}

describe('AnalyzeTimeController', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    // Noon on day 1 (Arienle 1), scale 1.
    WorldClockApi.restore({
      elapsedGameTimeS: 43_200,
      scale: 1,
      lastShutdownRealMs: 0,
    });
  });

  afterEach(() => {
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
  });

  it('reports the calendar date, game-time, and scale', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeTimeController());
    await ctrl.execute(makeModel({}), makeContext(avatar, room));

    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('Oneday, 1 Arienle 1 12:00');
    expect(frame.body).toContain('game-time: 43200s');
    expect(frame.body).toContain('scale: 1x');
  });
});
