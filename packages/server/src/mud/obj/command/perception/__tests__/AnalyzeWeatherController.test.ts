/**
 * AnalyzeWeatherController — `analyze weather [<location>]` renders the
 * current weather type + descriptors, the four per-field deviations, the
 * covering Locality, and a short forecast. No instrument required. The
 * Barometer separately reads the weather-deviated pressure (a storm reads
 * low). Mirrors the AnalyzeAddressController harness; additionally sets
 * up a SkyExposed biome + activates weather with a forced type.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AnalyzeWeatherController from '../AnalyzeWeatherController';
import Location from '../../../../lib/stuff/Location';
import Locality from '../../../Locality';
import AddressRegistry from '../../../AddressRegistry';
import Biome from '../../../../lib/biome/Biome';
import { SkyExposedBiome } from '../../../SkyExposedBiome';
import { CommandGiverMixin } from '../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../lib/message/Sensor';
import { ContainableMixin } from '../../../../lib/spatial/Containable';
import { ContainerMixin } from '../../../../lib/spatial/Container';
import { NamedMixin } from '../../../../lib/description/Named';
import { MobileMixin } from '../../../../lib/spatial/Mobile';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Idea } from '../../../../lib/stuff/Idea';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';
import { AddressApi } from '../../../../api/address';
import { BiomeApi } from '../../../../api/biome';
import { WeatherApi } from '../../../../api/weather';
import { WorldClockApi } from '../../../../api/worldclock';
import { ContainmentApi } from '../../../../api/containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
  type ModelData,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
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

function makeContext(avatar: FakeAvatar, location: TestLocation): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: avatar as unknown as CommandContext['commandGiver'],
    interactive: {} as Interactive,
    location,
    commandText: 'analyze weather',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: stubCommand(),
  });
}

function makeModel(fields: ModelData): CommandModel {
  return { ...fields, subcommand: 'weather' };
}

const here = (room: TestLocation): MqlOneResult =>
  ({ stuff: room, raw: 'here' }) as unknown as MqlOneResult;

function installRootBiome(): void {
  makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(290, 'K'));
    b.setDefaultPressure(Quantity.of(101_325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/obj/biome/universe');
}

function skyRoom(): TestLocation {
  const biome = makeStuffAtPath(() => {
    const b = new SkyExposedBiome();
    b._extendsBiomePath = '/obj/biome/universe';
    return b;
  }, '/obj/biome/outdoor/field');
  const room = makeStuff(() => new TestLocation());
  room.setBiome(biome);
  return room;
}

function installRoster(): void {
  makeStuffAtPath(() => new AddressRegistry(), '/obj/AddressRegistry');
  const loc = makeStuffAtPath(() => {
    const l = new Locality();
    l.setName('Cair Paravel');
    l.setAddress('narnia/castle');
    return l;
  }, '/obj/Locality/cair-paravel');
  AddressApi.registerLocality(loc);
}

async function runVerb(
  room: TestLocation,
): Promise<{ body: string; avatar: FakeAvatar; ctx: CommandContext }> {
  const avatar = makeStuff(() => new FakeAvatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, room);
  const ctrl = await StuffApi.create(() => new AnalyzeWeatherController());
  const ctx = makeContext(avatar, room);
  await ctrl.execute(makeModel({ location: here(room) }), ctx);
  const body = (avatar.received[0] as { body: string }).body;
  return { body, avatar, ctx };
}

describe('AnalyzeWeatherController', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    WorldClockApi._resetForTesting(); // pin now = 0
    AddressApi._resetRegistryRefForReload();
    installRoster();
  });

  afterEach(() => {
    WeatherApi._resetForTesting();
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
    AddressApi._resetRegistryRefForReload();
    WorldClockApi._resetForTesting();
  });

  it('reports type, deviations, covering Locality, and forecast (no instrument)', async () => {
    const room = skyRoom();
    room.setAddress('narnia/castle');
    WeatherApi._forceTypeForTesting('storm');

    const { body } = await runVerb(room);
    expect(body).toContain('type: storm');
    expect(body).toContain('temperature: -5 K');
    expect(body).toContain('wind: +12 m/s');
    expect(body).toContain('Cair Paravel');
    expect(body).toContain('forecast: storm');
  });

  it('reports the global / off-grid case when no Locality covers', async () => {
    const room = skyRoom(); // no declared address
    WeatherApi._forceTypeForTesting('clear');

    const { body } = await runVerb(room);
    expect(body).toContain('global / off-grid');
    expect(body).toContain('type: clear');
  });

  it('the Barometer reads below base pressure in a storm', async () => {
    const room = skyRoom();
    WeatherApi._forceTypeForTesting('storm');
    const p = await BiomeApi.resolvePressureFor(room);
    expect(p.rawValue()).toBeLessThan(101_325);
  });

  it('shows provenance + the cloud form for a procgen scope', async () => {
    const room = skyRoom();
    room.setAddress('narnia/castle');
    WeatherApi._forceTypeForTesting('storm');

    const { body } = await runVerb(room);
    expect(body).toContain('provenance: modelled');
    expect(body).toContain('rain precipitation here'); // storm precip
    expect(body).toContain('cumulonimbus'); // the storm cloud form
  });

  it('shows an authored provenance for a pinned scope', async () => {
    const room = skyRoom();
    room.setAddress('narnia/castle');
    (room as unknown as { setWeatherPin(p: unknown): void }).setWeatherPin({
      type: 'rain',
      mode: 'frozen',
    });
    // Procgen forced clear; the pin must win, and be labelled authored.
    WeatherApi._forceTypeForTesting('clear');

    const { body } = await runVerb(room);
    expect(body).toContain('type: rain');
    expect(body).toContain('provenance: authored');
    expect(body).toContain('nimbostratus'); // rain cloud form
  });

  it('rejects a non-place target', async () => {
    const room = skyRoom();
    const thing = makeStuff(() => new Idea());
    const avatar = makeStuff(() => new FakeAvatar());
    avatar.setName('Alice');
    ContainmentApi.move(avatar, room);
    const ctrl = await StuffApi.create(() => new AnalyzeWeatherController());
    const ctx = makeContext(avatar, room);
    await ctrl.execute(
      makeModel({
        location: { stuff: thing, raw: 'thing' } as unknown as MqlOneResult,
      }),
      ctx,
    );
    expect(ctx.getNotes().some((n) => n.kind === 'controller-rejected')).toBe(
      true,
    );
  });
});
