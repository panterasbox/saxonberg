import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import { Vessel } from '../../lib/stuff/Vessel';
import Biome from '../../lib/biome/Biome';
import { SkyExposedBiome } from '../../lib/biome/SkyExposedBiome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import { ContainmentApi } from '../containment';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestLocation extends Location {}
class TestVessel extends Vessel {}

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
  }, '/lib/biome/universe');
}

describe('BiomeApi.isSkyExposed', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('returns true for a room whose biome composes SkyExposedMixin', () => {
    const biome = makeStuffAtPath(
      () => new SkyExposedBiome(),
      '/lib/biome/outdoor/temperate/quad',
    );
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    expect(BiomeApi.isSkyExposed(room)).toBe(true);
  });

  it('returns false for an indoor biome (plain Biome)', () => {
    const biome = makeStuffAtPath(
      () => new Biome(),
      '/lib/biome/indoor/academic/classroom',
    );
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    expect(BiomeApi.isSkyExposed(room)).toBe(false);
  });

  it('returns false when no biome is set anywhere in the chain', () => {
    const room = makeStuff(() => new TestLocation());
    expect(BiomeApi.isSkyExposed(room)).toBe(false);
  });

  it('walks outward through a vessel to the outer Location biome', () => {
    const biome = makeStuffAtPath(
      () => new SkyExposedBiome(),
      '/lib/biome/outdoor/temperate/quad',
    );
    const room = makeStuff(() => new TestLocation());
    room.setBiome(biome);
    const vessel = makeStuff(() => new TestVessel());
    ContainmentApi.move(vessel, room);
    // Vessel has no biome — chain walks to outer room which has the
    // sky-exposed biome.
    expect(BiomeApi.isSkyExposed(vessel)).toBe(true);
  });

  it('nearest atmospheric ancestor wins — vessel biome trumps outer room', () => {
    const indoor = makeStuffAtPath(
      () => new Biome(),
      '/lib/biome/special/vehicle-cabin',
    );
    const outdoor = makeStuffAtPath(
      () => new SkyExposedBiome(),
      '/lib/biome/outdoor/temperate/quad',
    );
    const room = makeStuff(() => new TestLocation());
    room.setBiome(outdoor);
    const cabin = makeStuff(() => new TestVessel());
    cabin.setBiome(indoor);
    ContainmentApi.move(cabin, room);
    // Cabin's plain biome stops the walk; the room's sky-exposed
    // biome is never consulted.
    expect(BiomeApi.isSkyExposed(cabin)).toBe(false);
  });
});
