import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach , vi } from 'vitest';
import { withRow } from './row';
import { driveAnalyze, instrumentWith } from './drive';
import LightReading from '../LightReading';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import { AmbientLitMixin } from '../../../../lib/perception/AmbientLit';
import { LightSourceMixin } from '../../../../lib/perception/LightSource';
import Thing from '../../../../lib/stuff/Thing';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { AdvancementMixin } from '../../../../lib/advancement/Advancement';
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
import type Interactive from '../../Interactive';
import { installV1QuantityTagTables } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { buildAllModalities } from '../../../../lib/perception/modalities/__tests__/test-helpers';

class AmbientLoc extends AmbientLitMixin(CartesianLocation) {}
class Lamp extends LightSourceMixin(NamedMixin(Thing)) {}

// ⚠ `AdvancementMixin` is not decoration: `bandOf` narrows with
// `MixinApi.isAdvancing`, so a fixture without it reads at the floor no
// matter what its `competenceBandFor` says — and a ladder test would
// have passed its untrained case and quietly asserted nothing about the
// other two.
const FakeAvatarBase = CommandGiverMixin(
  AdvancementMixin(
    NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
  )
);
class FakeAvatar extends FakeAvatarBase {
  /**
   * ⭐ The band this reader holds in `awareness`. The eye rung is
   * GRADUATED — what a person can tell about light depends on how much
   * they have looked at it — so a test of the prose has to say who is
   * looking. Default `untrained`: the shipped floor.
   */
  public band = 'untrained';
  public override async competenceBandFor(): Promise<never> {
    return this.band as never;
  }
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

describe('LightReading', () => {
  beforeEach(() => {
    installV1QuantityTagTables();
    buildAllModalities();
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

    avatar.band = 'proficient';
    const reading = withRow(await StuffApi.create(() => new LightReading()), 'light');
    await driveAnalyze(reading, makeContext(avatar, room), { subject: { stuff: room, raw: 'here' } });
    expect(avatar.received).toHaveLength(1);
    const frame = avatar.received[0] as { body: string };
    // Aggregate lux + color appear as canonical quantity markup.
    // ⭐⭐ At `proficient` the eye gives the WORKING: what the light is
    // good for, how many things are making it, its colour, and which
    // source is carrying the room.
    expect(frame.body).toContain('Light at');
    expect(frame.body).toContain('what is carrying it:');
    expect(frame.body).toContain('brass lamp');
    // ⚠ And NOT a figure. The per-source lumen attribution used to be
    // handed to everybody for free — a photometer's readout wearing an
    // eye's clothes, which left the instrument with nothing to sell.
    // Shares are words here; the numbers are `measure light`'s.
    expect(frame.body).not.toContain('lumen');
  });

  it('reports "none" when there are no sources', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);

    avatar.band = 'competent';
    const reading = withRow(await StuffApi.create(() => new LightReading()), 'light');
    await driveAnalyze(reading, makeContext(avatar, room), { subject: { stuff: room, raw: 'here' } });
    const frame = avatar.received[0] as { body: string };
    expect(frame.body).toContain('Nothing here is making any of it.');
  });

  it('⭐⭐ the eye rung is a LADDER — and every rung is true', async () => {
    const zone = makeStuff(() => new CartesianZone());
    zone.setCellSize(1);
    const room = makeStuff(() => new AmbientLoc());
    zone.addLocation(room, 0, 0, 0);
    room.setAmbientFlux(60);
    const lamp = makeStuff(() => new Lamp());
    lamp.setName('brass lamp');
    lamp.setEmittedFlux(50);
    ContainmentApi.move(lamp, room);

    const said: Record<string, string> = {};
    for (const band of ['untrained', 'competent', 'proficient']) {
      const avatar = makeStuff(() => new FakeAvatar());
      avatar.setName('Alice');
      avatar.band = band;
      ContainmentApi.move(avatar, room);
      const reading = withRow(await StuffApi.create(() => new LightReading()), 'light');
      await driveAnalyze(reading, makeContext(avatar, room), {
        subject: { stuff: room, raw: 'here' },
      });
      said[band] = (avatar.received[0] as { body: string }).body;
    }

    // ⭐ Everybody gets the same first sentence: what the light is FOR.
    // Nobody is refused, and nobody is told nothing.
    for (const band of ['untrained', 'competent', 'proficient']) {
      expect(said[band]).toContain('Light at');
    }
    // What is added is DETAIL, monotonically.
    expect(said['untrained']).not.toContain('making it');
    expect(said['competent']).toContain('making it');
    expect(said['competent']).not.toContain('what is carrying it:');
    expect(said['proficient']).toContain('what is carrying it:');
    expect(said['proficient']!.length).toBeGreaterThan(said['untrained']!.length);
  });
});
