import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach , vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze, instrumentWith } from './drive';
import SkyReading from '../SkyReading';
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
import type { MqlOneResult } from '../../../../api/mql';
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
    commandText: 'analyze sky',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'sky' };
}

const here = (room: TestLocation): MqlOneResult =>
  ({ stuff: room, raw: 'here' }) as unknown as MqlOneResult;

describe('SkyReading', () => {
  afterEach(() => {
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
  });

  function setNoon(): void {
    WorldClockApi._resetForTesting();
    WorldClockApi.restore({
      elapsedGameTimeS: 43_200, // noon, day 1 (equinox)
      scale: 1,
      lastShutdownRealMs: 0,
    });
  }

  function setMidnight(): void {
    WorldClockApi._resetForTesting();
    WorldClockApi.restore({ elapsedGameTimeS: 0, scale: 1, lastShutdownRealMs: 0 });
  }

  it('reports daylight, season, sun angles, and moon phase at noon', async () => {
    setNoon();
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new SkyReading()), 'sky');
    await driveAnalyze(reading, makeContext(avatar, room), { subject: here(room) });

    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('Daylight');
    expect(frame.body).toContain('spring');
    expect(frame.body).toContain('sun altitude:');
    expect(frame.body).toContain('unit="degrees"');
    expect(frame.body).toContain('next full moon:');
  });

  it('reports night at midnight', async () => {
    setMidnight();
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new SkyReading()), 'sky');
    await driveAnalyze(reading, makeContext(avatar, room), { subject: here(room) });

    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('Night');
  });

  it('rejects a non-place target', async () => {
    setNoon();
    const room = makeStuff(() => new TestLocation());
    const thing = makeStuff(() => new Idea());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const reading = withRow(await StuffApi.create(() => new SkyReading()), 'sky');
    const ctx = makeContext(avatar, room);
    await driveAnalyze(reading, ctx, { subject: { stuff: thing, raw: 'thing' } });
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
  });
});
