import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalyzeLightController } from '../AnalyzeLightController';
import { CartesianZone } from '../../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
import { AmbientLitMixin } from '../../../lib/perception/AmbientLit';
import { LightSourceMixin } from '../../../lib/perception/LightSource';
import { Thing } from '../../../lib/stuff/Thing';
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
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../api/command';
import type { Interactive } from '../../Interactive';
import { installV1QuantityTagTables } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class AmbientLoc extends AmbientLitMixin(CartesianLocation) {}
class Lamp extends LightSourceMixin(NamedMixin(Thing)) {}

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea)))))
);
class FakeAvatar extends FakeAvatarBase {
  received: unknown[] = [];
  protected override handleMessage(msg: unknown): void {
    this.received.push(msg);
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>'
  );
}

function makeContext(avatar: FakeAvatar, location: AmbientLoc): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze light here',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand('analyze'),
  });
}

function makeModel(fields: ModelData, subcommand: string): CommandModel {
  return { ...fields, subcommand };
}

describe('AnalyzeLightController', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('renders aggregate + per-source breakdown', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(20);
    room.setAmbientColorTemperature('warm');

    const lamp = makeStuff(() => new Lamp());
    lamp.setName('brass lamp');
    lamp.setEmittedFlux(50);
    lamp.setEmittedColorTemperature('cool');
    ContainmentApi.move(lamp, room);

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeLightController());
    await ctrl.execute(
      makeModel({ location: { stuff: room, raw: 'here' } }, 'light'),
      makeContext(avatar, room)
    );
    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    // Aggregate lux + color appear as canonical quantity markup.
    expect(frame.body).toContain('Light analysis at');
    expect(frame.body).toContain('total:');
    expect(frame.body).toContain('color temperature:');
    expect(frame.body).toContain('contributing sources:');
    // Lamp's per-source contribution.
    expect(frame.body).toContain('50 lumen');
    expect(frame.body).toContain('5000 K');
  });

  it('reports "none" when there are no sources', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new AnalyzeLightController());
    await ctrl.execute(
      makeModel({ location: { stuff: room, raw: 'here' } }, 'light'),
      makeContext(avatar, room)
    );
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('contributing sources: none');
  });
});
