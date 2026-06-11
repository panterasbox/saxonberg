/**
 * MeasureAltitudeController celestial branch — `measure altitude
 * sun|moon` routes to the angular (sextant) reading rather than the
 * barometric estimate (plan §4.4). The barometric path keeps its own
 * coverage; this file exercises only the sun/moon routing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MeasureAltitudeController from '../MeasureAltitudeController';
import Sextant from '../../../instrument/Sextant';
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
import type Interactive from '../../../Interactive';

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
    commandText: 'measure altitude sun',
    executionId: 't',
    commandId: 'c',
    verb: 'measure',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'altitude' };
}

describe('MeasureAltitudeController (celestial branch)', () => {
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

  it('reads the sun altitude / azimuth with a sextant', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
    const sextant = makeStuff(() => new Sextant());
    ContainmentApi.move(sextant, avatar);

    const ctrl = await StuffApi.create(() => new MeasureAltitudeController());
    await ctrl.execute(makeModel({ body: 'sun' }), makeContext(avatar, room));

    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('sun altitude:');
    expect(frame.body).toContain('unit="degrees"');
  });

  it('reads the moon altitude / azimuth with a sextant', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
    const sextant = makeStuff(() => new Sextant());
    ContainmentApi.move(sextant, avatar);

    const ctrl = await StuffApi.create(() => new MeasureAltitudeController());
    await ctrl.execute(makeModel({ body: 'moon' }), makeContext(avatar, room));

    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('moon altitude:');
    expect(frame.body).toContain('unit="degrees"');
  });

  it('refuses the sun/moon reading without a sextant', async () => {
    const room = makeStuff(() => new TestLocation());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new MeasureAltitudeController());
    const ctx = makeContext(avatar, room);
    await ctrl.execute(makeModel({ body: 'sun' }), ctx);

    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(true);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('sextant');
  });
});
