import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalyzeResponseController from '../AnalyzeResponseController';
import Armor from '../../../equipment/Armor';
import Weapon from '../../../equipment/Weapon';
import Material from '../../../../lib/material/Material';
import Thing from '../../../../lib/stuff/Thing';
import { Construction } from '../../../../lib/material/Construction';
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
import { Quantity } from '../../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import type Interactive from '../../../Interactive';
import '../../../../api/material';

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
    commandText: 'analyze response dagger',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand('analyze'),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'response' };
}

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setName('steel');
  m.setHardness(Quantity.of(600, 'MPa'));
  m.setToughness(Quantity.of(200, 'MJ/m³'));
  stampTemplatePathForTest(m, '/obj/material/alloy/steel');
  return m;
}

describe('AnalyzeResponseController', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  async function room(): Promise<{ loc: CartesianLocation; me: FakeAvatar }> {
    const zone = makeStuff(() => new CartesianZone());
    const loc = makeStuff(() => new CartesianLocation());
    zone.addLocation(loc, 0, 0, 0);
    const me = makeStuff(() => new FakeAvatar());
    me.setName('Alice');
    ContainmentApi.move(me, loc);
    return { loc, me };
  }

  it('previews a weapon — delivered channels, and none for what it cannot', async () => {
    const { loc, me } = await room();
    const dagger = makeStuff(() => new Weapon());
    dagger.setMaterial(steel());
    dagger.setConstruction(Construction.of('bladed'));
    ContainmentApi.move(dagger, loc);

    const ctrl = await StuffApi.create(() => new AnalyzeResponseController());
    await ctrl.execute(
      makeModel({ target: { stuff: dagger, raw: 'dagger' } }),
      makeContext(me, loc)
    );
    const frame = me.received[0] as { body: string };
    expect(frame.body).toContain('Response of');
    expect(frame.body).toContain('delivers'); // a weapon delivers
    expect(frame.body).toContain('edge:');
    expect(frame.body).toContain('blunt: — (not delivered)'); // a blade
  });

  it('previews an armor piece — how it turns each channel', async () => {
    const { loc, me } = await room();
    const plate = makeStuff(() => new Armor());
    plate.setMaterial(steel());
    plate.setConstruction(Construction.of('plate'));
    ContainmentApi.move(plate, loc);

    const ctrl = await StuffApi.create(() => new AnalyzeResponseController());
    await ctrl.execute(
      makeModel({ target: { stuff: plate, raw: 'breastplate' } }),
      makeContext(me, loc)
    );
    const frame = me.received[0] as { body: string };
    expect(frame.body).toContain('turns'); // armor turns
    expect(frame.body).toContain('edge: turned'); // plate deflects an edge
  });

  it('rejects a target with no construction', async () => {
    const { loc, me } = await room();
    const rock = makeStuff(() => new Thing());
    ContainmentApi.move(rock, loc);

    const ctrl = await StuffApi.create(() => new AnalyzeResponseController());
    await ctrl.execute(
      makeModel({ target: { stuff: rock, raw: 'rock' } }),
      makeContext(me, loc)
    );
    const frame = me.received[0] as { body: string };
    expect(frame.body).toContain("isn't a made thing");
  });
});
