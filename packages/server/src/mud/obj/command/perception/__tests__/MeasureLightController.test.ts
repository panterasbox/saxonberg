import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MeasureLightController from '../MeasureLightController';
import CartesianZone from '../../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
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
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import type Interactive from '../../../Interactive';
// Vision modality singleton + perception cache live behind PerceptionApi.
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';

class AmbientLoc extends AmbientLitMixin(CartesianLocation) {}

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
    commandText: 'measure light here',
    executionId: 't',
    commandId: 'c',
    verb: 'measure',
    command: stubCommand('measure'),
  });
}

function makeModel(fields: ModelData, subcommand: string): CommandModel {
  return { ...fields, subcommand };
}

describe('MeasureLightController', () => {
  beforeEach(() => {
    buildAllModalities();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('emits canonical lux when called with a location', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(40);

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new MeasureLightController());
    await ctrl.execute(
      makeModel({ location: { stuff: room, raw: 'here' } }, 'light'),
      makeContext(avatar, room)
    );
    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('<quantity channel="light" unit="lux"');
    expect(frame.body).toContain('value="40"');
    expect(frame.body).toContain('>40 lux</quantity>');
  });

  it('returns a failure when no location is bound', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1); // pre-biome light calibration: 1m² scale
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new MeasureLightController());
    await ctrl.execute(
      makeModel({ location: { stuff: null, raw: 'foo' } }, 'light'),
      makeContext(avatar, room)
    );
  });
});
