import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import WeighController from '../WeighController';
import { TangibleMixin } from '../../../../lib/material/Tangible';
import { Quantity } from '../../../../lib/quantity';
import Thing from '../../../../lib/stuff/Thing';
import CartesianZone from '../../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
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
import '../../../../api/material';

class TangibleThing extends TangibleMixin(NamedMixin(Thing)) {}

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

function makeContext(
  avatar: FakeAvatar,
  location: CartesianLocation
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'weigh sword',
    executionId: 't',
    commandId: 'c',
    verb: 'weigh',
    command: stubCommand('weigh'),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields };
}

describe('WeighController', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('emits canonical kg for a Tangible target', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    const sword = makeStuff(() => new TangibleThing());
    sword.setName('rusty sword');
    sword.setMass(Quantity.of(3, 'kg'));
    ContainmentApi.move(sword, room);

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(() => new WeighController());
    await ctrl.execute(
      makeModel({ target: { stuff: sword, raw: 'sword' } }),
      makeContext(avatar, room)
    );
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('<quantity channel="mass" unit="kg"');
    expect(frame.body).toContain('value="3"');
    expect(frame.body).toContain('>3 kg</quantity>');
  });
});
