import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach , vi } from 'vitest';
import { withRow } from './row';
import { driveMeasure, instrumentWith } from './drive';
import ShadowReading from '../ShadowReading';
import Location from '../../../../lib/stuff/Location';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { WorldClockApi } from '../../../../api/worldclock';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
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
    `verbs: [measure]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(avatar: FakeAvatar, location: TestLocation): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'measure shadow',
    executionId: 't',
    commandId: 'c',
    verb: 'measure',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'shadow' };
}

describe('ShadowReading', () => {
  beforeEach(() => {
    WorldClockApi._resetForTesting();
    WorldClockApi.restore({
      elapsedGameTimeS: 43_200, // noon
      scale: 1,
      lastShutdownRealMs: 0,
    });
  });

  afterEach(() => {
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
  });

  it('reports solar elevation and azimuth with a sundial in hand', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new ShadowReading()), 'shadow');
    await driveMeasure(reading, makeContext(avatar, room), { tools: [await instrumentWith('dialling')] });

    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('sun elevation:');
    expect(frame.body).toContain('unit="degrees"');
    expect(frame.body).toContain('marks the sun');
  });

  it('refuses without a sundial', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new ShadowReading()), 'shadow');
    const ctx = makeContext(avatar, room);
    await driveMeasure(reading, ctx);

    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('sundial');
  });
});
