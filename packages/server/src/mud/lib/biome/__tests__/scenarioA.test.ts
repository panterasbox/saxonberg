/**
 * Scenario A — cafeteria with a hot hearth Detail. The cafeteria
 * inherits its indoor defaults from the biome tree; the hearth is
 * a Location-scope detail override at 800 K.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../stuff/Location';
import Biome from '../Biome';
import { BiomeApi } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}

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
  }, '/obj/biome/universe');
}

describe('Biome scenario A — cafeteria hearth detail override', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    // Indoor baseline + cafeteria leaf — explicit _extendsBiomePath
    // chain instead of templatePath-driven inheritance.
    makeStuffAtPath(() => {
      const b = new Biome();
      b._extendsBiomePath = '/obj/biome/universe';
      b.setDefaultTemperature(Quantity.of(294, 'K'));
      b.setDefaultHumidity(Quantity.of(45, '%'));
      return b;
    }, '/obj/biome/indoor/baseline');
    makeStuffAtPath(() => {
      const b = new Biome();
      b._extendsBiomePath = '/obj/biome/indoor/baseline';
      return b;
    }, '/obj/biome/indoor/social/cafeteria');
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('bulk temperature reads the indoor ancestor default (294 K)', async () => {
    const room = makeStuff(() => new TestLocation());
    const cafeteriaBiome = BiomeApi.findByPath(
      '/obj/biome/indoor/social/cafeteria',
    );
    expect(cafeteriaBiome).not.toBeNull();
    room.setBiome(cafeteriaBiome!);

    const t = await BiomeApi.resolveTemperatureFor(room);
    expect(t.rawValue()).toBe(294);
  });

  it('hearth Detail override reads 800 K with detail provenance', async () => {
    const room = makeStuff(() => new TestLocation());
    const cafeteriaBiome = BiomeApi.findByPath(
      '/obj/biome/indoor/social/cafeteria',
    );
    room.setBiome(cafeteriaBiome!);
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');

    const trace = await BiomeApi.traceResolveTemperatureFor(room, 'hearth');
    expect(trace.value.rawValue()).toBe(800);
    expect(trace.source).toBe('detail');
  });

  it('hearth.embers inherits 800 K via the prefix walk', async () => {
    const room = makeStuff(() => new TestLocation());
    room.setBiome(BiomeApi.findByPath('/obj/biome/indoor/social/cafeteria')!);
    room.setTemperature(Quantity.of(800, 'K'), 'hearth');

    const trace = await BiomeApi.traceResolveTemperatureFor(
      room,
      'hearth.embers',
    );
    expect(trace.value.rawValue()).toBe(800);
    expect(trace.source).toBe('detail-prefix');
  });
});
