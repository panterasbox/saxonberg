/**
 * AtmosphereReading — the medium, and what is in it.
 *
 * ⭐⭐ **No number at any band.** The rung used to print a density digit
 * off a per-tag table, which told a player the one thing about the air
 * that never varies and nothing about the thing that does. The medium's
 * identity is a word and its contents are a level; the instrument's worth
 * is that it NAMES substances a person cannot, not that it prints them.
 *
 * ⭐ And the free `analyze` rung existed nowhere before this build: the
 * channel shipped `measure`-only with an `eyeCeiling: competent` row,
 * which is a row promising a trained eye a rung the class never
 * implemented.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withRow } from './row';
import { driveMeasure, driveAnalyze, instrumentWith } from './drive';
import AtmosphereReading from '../AtmosphereReading';
import CartesianZone from '../../location/CartesianZone';
import CartesianLocation from '../../../../lib/location/CartesianLocation';
import Biome from '../../../../lib/biome/Biome';
import { BiomeApi } from '../../../../api/biome';
import Material from '../../../../lib/material/Material';
import { Quantity } from '../../../../lib/quantity';
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
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import {
  installV1QuantityMarshallers,
  installV1QuantityTagTables,
} from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
} from '../../../../api/command';
import type Interactive from '../../Interactive';

const SMOKE = '/stuff/idea/material/gas/smoke';

const FakeAvatarBase = CommandGiverMixin(
  NamedMixin(MobileMixin(ContainerMixin(SensorMixin(ContainableMixin(Idea))))),
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
    '<test>',
  );
}

function makeContext(
  avatar: FakeAvatar,
  location: CartesianLocation,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: `${verb} atmosphere`,
    executionId: 't',
    commandId: 'c',
    verb,
    command: stubCommand(verb),
  });
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

/** The smoke row, as content ships it — the reading names it by NAME. */
function installSmoke(): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('smoke');
    m.setDensity(Quantity.of(1.1, 'kg/m³'));
    m.setBoilingPoint(Quantity.of(100, 'K'));
    return m;
  }, SMOKE);
}

function body(avatar: FakeAvatar): string {
  return (avatar.received[0] as { body: string }).body;
}

describe('AtmosphereReading', () => {
  let zone: CartesianZone;
  let room: CartesianLocation;
  let avatar: FakeAvatar;

  beforeEach(() => {
    installV1QuantityMarshallers();
    installV1QuantityTagTables();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    installSmoke();
    zone = makeStuff(() => new CartesianZone());
    room = makeStuff(() => new CartesianLocation());
    zone.addLocation(room, 0, 0, 0);
    avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  async function reading(): Promise<AtmosphereReading> {
    return withRow(
      await StuffApi.create(() => new AtmosphereReading()),
      'atmosphere',
    );
  }

  it('⭐⭐ measure names the medium and carries NO digit', async () => {
    room.addAtmosphereContent(SMOKE, 2700); // 10 % of 27 000 L
    await driveMeasure(await reading(), makeContext(avatar, room, 'measure'), {
      tools: [await instrumentWith('gas-analysis')],
    });
    const text = body(avatar);
    expect(text).toContain('Atmosphere: air');
    expect(text).toContain('smoke');
    // ⭐ Untrained, so the LEVEL is coarse ("a lot of") where a competent
    // reader gets "a great deal of". The band resolves DETAIL and never
    // ACCESS: the substance is named either way, which is the whole
    // instrumentation doctrine in one assertion.
    expect(text).toMatch(/a lot of smoke/);
    // ⚠ The whole claim: not one figure anywhere, at any band.
    expect(text).not.toMatch(/\d/);
  });

  it('measure says so when there is nothing to find', async () => {
    await driveMeasure(await reading(), makeContext(avatar, room, 'measure'), {
      tools: [await instrumentWith('gas-analysis')],
    });
    expect(body(avatar)).toContain('nothing else it can find');
    expect(body(avatar)).not.toMatch(/\d/);
  });

  it('measure refuses with no analyser', async () => {
    const ctx = makeContext(avatar, room, 'measure');
    await driveMeasure(await reading(), ctx);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });

  it('⭐ analyze is free, and reads in sentences', async () => {
    room.addAtmosphereContent(SMOKE, 2700);
    await driveAnalyze(await reading(), makeContext(avatar, room, 'analyze'));
    const text = body(avatar);
    expect(text).toMatch(/air|smoke|something/);
    expect(text).not.toMatch(/\d/);
  });

  it('⭐⭐ a trace is below an untrained nose — which is why the lamp exists', async () => {
    // 2 % of the room: an analyser finds it, a labourer does not. This is
    // the firedamp case exactly, and the reason a canary and a safety
    // lamp are COMPLEMENTARY rather than redundant.
    room.addAtmosphereContent(SMOKE, 540);
    await driveAnalyze(await reading(), makeContext(avatar, room, 'analyze'));
    expect(body(avatar)).not.toContain('smoke');

    avatar.received.length = 0;
    await driveMeasure(await reading(), makeContext(avatar, room, 'measure'), {
      tools: [await instrumentWith('gas-analysis')],
    });
    expect(body(avatar)).toContain('smoke');
  });

  it('⭐ two readers of the same air read the same thing', async () => {
    room.addAtmosphereContent(SMOKE, 2700);
    const other = makeStuff(() => new FakeAvatar());
    other.setName('Bob');
    ContainmentApi.move(other, room);

    await driveAnalyze(await reading(), makeContext(avatar, room, 'analyze'));
    await driveAnalyze(await reading(), makeContext(other, room, 'analyze'));
    expect(body(other)).toBe(body(avatar));
  });

  it('declines when the actor is nowhere', async () => {
    const nowhere = makeStuff(() => new FakeAvatar());
    nowhere.setName('Nobody');
    const ctx = CommandApi.createCommandContext({
      commandGiver: nowhere as unknown as CommandContext['commandGiver'],
      interactive: {} as Interactive,
      location: null as unknown as CartesianLocation,
      commandText: 'analyze atmosphere',
      executionId: 't',
      commandId: 'c',
      verb: 'analyze',
      command: stubCommand('analyze'),
    });
    await driveAnalyze(await reading(), ctx);
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });
});
