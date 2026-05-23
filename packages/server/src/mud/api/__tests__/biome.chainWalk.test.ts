import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Location } from '../../lib/stuff/Location';
import { Biome } from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}

function installRootBiome(): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(50, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/lib/biome');
}

function installBiome(
  path: string,
  data: {
    temperature?: number;
    pressure?: number;
    humidity?: number;
    gravity?: number;
    atmosphere?: string;
  },
): Biome {
  return makeStuffAtPath(() => {
    const b = new Biome();
    if (data.temperature !== undefined)
      b.setDefaultTemperature(Quantity.of(data.temperature, 'K'));
    if (data.pressure !== undefined)
      b.setDefaultPressure(Quantity.of(data.pressure, 'Pa'));
    if (data.humidity !== undefined)
      b.setDefaultHumidity(Quantity.of(data.humidity, '%'));
    if (data.gravity !== undefined)
      b.setDefaultGravity(Quantity.of(data.gravity, 'm/s²'));
    if (data.atmosphere !== undefined)
      b.setDefaultAtmosphere(data.atmosphere);
    return b;
  }, path);
}

describe('BiomeApi resolve* — chain walk', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('returns universe defaults when nothing overrides', async () => {
    const room = makeStuff(() => new TestLocation());
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(295);
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(101325);
    expect((await BiomeApi.resolveHumidityFor(room)).rawValue()).toBe(50);
    expect(
      (await BiomeApi.resolveGravityFor(room)).rawValue(),
    ).toBeCloseTo(9.81);
    expect(await BiomeApi.resolveAtmosphereFor(room)).toBe('air');
  });

  it("reads the room's biome default when set", async () => {
    const biome = installBiome('/lib/biome/outdoor/temperate/quad', {
      temperature: 285,
    });
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(285);
  });

  it('walks biome templatePath ancestry when leaf has no value', async () => {
    installBiome('/lib/biome/outdoor', { humidity: 60 });
    const leaf = installBiome('/lib/biome/outdoor/temperate/quad', {});
    const room = makeStuff(() => new TestLocation());
    room.setBiome(leaf);
    expect((await BiomeApi.resolveHumidityFor(room)).rawValue()).toBe(60);
  });

  it('room override beats biome default', async () => {
    const biome = installBiome('/lib/biome/outdoor/temperate/quad', {
      temperature: 285,
    });
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    room.setTemperature(Quantity.of(310, 'K'));
    expect((await BiomeApi.resolveTemperatureFor(room)).rawValue()).toBe(310);
  });

  it('detail override beats room override', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(295, 'K'));
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    expect(
      (await BiomeApi.resolveTemperatureFor(room, 'hearth')).rawValue(),
    ).toBe(800);
  });
});

describe('BiomeApi.traceResolveTemperatureFor — provenance', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('source=universe when nothing overrides', async () => {
    const room = makeStuff(() => new TestLocation());
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('universe');
    expect(trace.sourcePath).toBe('/lib/biome');
  });

  it('source=biome when biome leaf has the value', async () => {
    const biome = installBiome('/lib/biome/outdoor/temperate/quad', {
      temperature: 285,
    });
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('biome');
    expect(trace.sourcePath).toBe('/lib/biome/outdoor/temperate/quad');
  });

  it('source=biome-ancestor when leaf falls through to parent', async () => {
    installBiome('/lib/biome/outdoor/temperate', { temperature: 285 });
    const leaf = installBiome('/lib/biome/outdoor/temperate/quad', {});
    const room = makeStuff(() => new TestLocation());
    room.setBiome(leaf);
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('biome-ancestor');
    expect(trace.sourcePath).toBe('/lib/biome/outdoor/temperate');
  });

  it('source=room when room overrides', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(310, 'K'));
    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.source).toBe('room');
  });

  it('source=detail when detail key matches exactly', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    const trace = await BiomeApi.traceResolveTemperatureFor(room, 'hearth');
    expect(trace.source).toBe('detail');
  });

  it('source=detail-prefix when detail key inherits via prefix', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');
    const trace = await BiomeApi.traceResolveTemperatureFor(
      room,
      'hearth.embers',
    );
    expect(trace.source).toBe('detail-prefix');
  });
});

describe('BiomeApi resolve* — boot-time invariant', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
  });
  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('throws when root biome is missing a default for the field', async () => {
    // Root biome with no temperature default — chain step 6 must throw.
    makeStuffAtPath(() => {
      const b = new Biome();
      b.setDefaultPressure(Quantity.of(101325, 'Pa'));
      // _defaultTemperature deliberately unset.
      return b;
    }, '/lib/biome');

    const room = makeStuff(() => new TestLocation());
    await expect(BiomeApi.resolveTemperatureFor(room)).rejects.toThrow(
      /missing the 'temperature' default/,
    );
  });
});
