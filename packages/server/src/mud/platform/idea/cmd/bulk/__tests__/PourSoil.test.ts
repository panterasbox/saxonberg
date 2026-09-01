/**
 * `pour sack into pot` — SOLID bulk (potting soil) into an empty pot.
 *
 * The first-ever proof of the soil pour's OUTCOME (the hinkley e2e
 * asserts its dispatch only): a store sack's 3 L of potting soil lands
 * in an empty large pot's interior, adopting the material — the step
 * every fresh bed/pot needs before `plant` (checkpoint-A drive finding:
 * a fresh yard's bed ships with capacity but no soil).
 */
import '../../../../../../test-bootstrap';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PourController from '../PourController';
import PlantPot from '../../../../thing/PlantPot';
import Receptacle from '../../../../thing/Receptacle';
import Material from '../../../../../lib/material/Material';
import { Quantity } from '../../../../../lib/quantity';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { NamedMixin } from '../../../../../lib/description/Named';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { ContainmentApi } from '../../../../../api/containment';
import { StuffApi } from '../../../../../api/stuff';
import { CommandApi, type CommandContext } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers, installV1QuantityTagTables } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestGiver extends SensorMixin(CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea))))) {
  static _mixinName = 'TestGiverPour';
}

function ctx(giver: TestGiver, loc: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: 'pour sack into pot',
    executionId: 't', commandId: 't', verb: 'pour',
    command: CommandDefinition.fromYaml('verbs: [pour]\ncontroller: N\ndescription: s\n', '<t>'),
  });
}

describe('pour sack into pot (the drive repro)', () => {
  beforeEach(() => { installV1QuantityMarshallers(); installV1QuantityTagTables(); });
  afterEach(() => vi.restoreAllMocks());

  it('moves the soil into the empty pot', async () => {
    const soilMat = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('potting soil');
      m.setKeywords(['soil']);
      m.setTags(['solid', 'soil']);
      m.setDensity(Quantity.of(600, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/bulk/potting-soil') as unknown as Material;
    void soilMat;

    const room = makeStuff(() => new Location());
    const giver = makeStuff(() => {
      const g = new TestGiver();
      g.setName('Probe');
      return g;
    });
    ContainmentApi.move(giver as never, room as never);

    const pot = makeStuffAtPath(() => {
      const p = new PlantPot();
      p.setShortDescription('a large clay pot');
      p.setKeywords(['pot', 'planter']);
      (p as unknown as { interiorBulk: boolean }).interiorBulk = true;
      p.setInteriorCapacity(Quantity.of(3, 'L'));
      return p;
    }, '/trade/farming/thing/pot/large');
    ContainmentApi.move(pot as never, room as never);

    const sack = makeStuff(() => {
      const s = new Receptacle();
      s.setShortDescription('a sack of potting soil');
      s.setKeywords(['sack', 'soil']);
      (s as unknown as { interiorBulk: boolean }).interiorBulk = true;
      s.setInteriorCapacity(Quantity.of(3, 'L'));
      (s as unknown as { interiorMaterial: string }).interiorMaterial = '/stuff/idea/material/bulk/potting-soil';
      s.setInteriorAmount(Quantity.of(3, 'L'));
      return s;
    });
    ContainmentApi.move(sack as never, giver as never);

    const c = ctx(giver, room);
    const ctrl = makeStuff(() => new PourController());
    await ctrl.execute(
      {
        source: { stuff: sack, raw: 'sack' },
        target: { stuff: pot, raw: 'pot' },
      } as never,
      c,
    );
    console.log('NOTES:', JSON.stringify(c.getNotes()));
    expect(pot.getSoilVolume()).toBeGreaterThan(0);
    expect(pot.hasSoil()).toBe(true);
  });
});
