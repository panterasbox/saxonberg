import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalyzeChemistryController } from '../AnalyzeChemistryController';
import { TangibleMixin } from '../../../lib/material/Tangible';
import { Material } from '../../../lib/material/Material';
import { Thing } from '../../../lib/stuff/Thing';
import { CartesianZone } from '../../../lib/spatial/CartesianZone';
import { CartesianLocation } from '../../../lib/spatial/CartesianLocation';
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
import { Quantity } from '../../../lib/quantity';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  createCommandContext,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../api/command';
import type { Interactive } from '../../Interactive';
import '../../../api/material';

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
  return createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze chemistry of sword',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand('analyze'),
  });
}

function makeModel(fields: ModelData, subcommand: string): CommandModel {
  return { ...fields, subcommand };
}

describe('AnalyzeChemistryController', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('emits chemistry data with canonical Quantity markup', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);

    // Build a synthetic iron Material via clone-by-template would
    // require seeding through SeederManager; instead construct one
    // directly and stamp its templatePath via the Stuff API surface.
    const iron = makeStuff(() => new Material());
    iron.setName('iron');
    iron.setDensity(Quantity.of(7874, 'kg/m³'));
    iron.setChemistry({
      symbol: 'Fe',
      atomicNumber: 26,
      molarMass: Quantity.of(55.845, 'g/mol'),
    });
    // Re-register under a templatePath so Tangible.getMaterial's
    // findByTemplatePath lookup resolves.
    stampTemplatePathForTest(iron, '/lib/material/element/iron');

    const sword = makeStuff(() => new TangibleThing());
    sword.setName('iron sword');
    sword.setMaterial(iron);
    ContainmentApi.move(sword, room);

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(
      () => new AnalyzeChemistryController()
    );
    const result = await ctrl.execute(
      makeModel({ target: { stuff: sword, raw: 'sword' } }, 'chemistry'),
      makeContext(avatar, room)
    );
    expect(result.success).toBe(true);
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('Chemistry of');
    expect(frame.body).toContain('material: iron');
    // Density quantity markup.
    expect(frame.body).toContain('unit="kg/m³"');
    expect(frame.body).toContain('value="7874"');
    // molarMass quantity markup (g/mol).
    expect(frame.body).toContain('unit="g/mol"');
    expect(frame.body).toContain('value="55.845"');
  });

  it('rejects a non-Tangible target', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    // Plain Idea isn't Tangible.
    const idea = makeStuff(() => new Idea());

    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    const ctrl = await StuffApi.create(
      () => new AnalyzeChemistryController()
    );
    const result = await ctrl.execute(
      makeModel({ target: { stuff: idea, raw: 'thought' } }, 'chemistry'),
      makeContext(avatar, room)
    );
    expect(result.success).toBe(false);
  });

  it('accepts a Quantity<g/mol> on the strict setter path', async () => {
    const m = makeStuff(() => new Material());
    m.setChemistry({ molarMass: Quantity.of(55.845, 'g/mol') });
    const chem = m.getChemistry();
    expect(chem!.molarMass).toBeInstanceOf(Quantity);
    expect(chem!.molarMass!.unit).toBe('g/mol');
    expect(chem!.molarMass!.rawValue()).toBe(55.845);
  });
});
