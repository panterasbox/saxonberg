import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalyzeAtmosphereController from '../AnalyzeAtmosphereController';
import Location from '../../../../../lib/stuff/Location';
import Biome from '../../../../../lib/biome/Biome';
import { BiomeApi } from '../../../../../api/biome';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../../lib/description/Named';
import { MobileMixin } from '../../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../../api/command';
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
    `verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(
  avatar: FakeAvatar,
  location: TestLocation,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze atmosphere',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'atmosphere' };
}

function installRootBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}

describe('AnalyzeAtmosphereController', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('renders the resolved state with provenance', async () => {
    const biome = makeStuffAtPath(
      () => {
        const b = new Biome();
        b._extendsBiomePath = '/stuff/idea/biome/universe';
        b.setDefaultTemperature(Quantity.of(285, 'K'));
        return b;
      },
      '/stuff/idea/biome/outdoor/temperate/quad',
    );
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(
      () => new AnalyzeAtmosphereController(),
    );
    await ctrl.execute(makeModel({}), makeContext(avatar, room));

    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('/stuff/idea/biome/outdoor/temperate/quad');
    expect(frame.body).toContain('temperature:');
    expect(frame.body).toContain('value="285"');
    expect(frame.body).toContain('biome default');
    expect(frame.body).toContain('atmosphere:');
    expect(frame.body).toContain('air');
    // Fields the leaf doesn't override resolve via biome-ancestor walk
    // (follows _extendsBiomePath) up to the root universe biome at
    // /stuff/idea/biome/universe.
    expect(frame.body).toContain('biome ancestor (/stuff/idea/biome/universe)');
  });

  it('detail key reads the hearth override with detail provenance', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(
      () => new AnalyzeAtmosphereController(),
    );
    await ctrl.execute(
      makeModel({ detail: 'hearth' }),
      makeContext(avatar, room),
    );

    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('value="800"');
    expect(frame.body).toContain('detail override');
  });
});
