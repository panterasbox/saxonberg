/**
 * Scenario C — cafeteria atrium showcase. The cafeteria parent
 * biome `/lib/biome/indoor/cafeteria` is a plain `Biome`; its
 * child `/lib/biome/indoor/cafeteria/atrium` extends
 * `SkyExposedBiome`. A Location pointing at the atrium reads
 * sky-exposed while a sibling Location pointing at the parent
 * biome does not.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Location } from '../../stuff/Location';
import { Biome } from '../Biome';
import { SkyExposedBiome } from '../SkyExposedBiome';
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
    b.setDefaultAtmosphere('air');
    return b;
  }, '/lib/biome');
}

describe('Biome scenario C — atrium child biome', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    makeStuffAtPath(() => new Biome(), '/lib/biome/indoor/cafeteria');
    makeStuffAtPath(
      () => new SkyExposedBiome(),
      '/lib/biome/indoor/cafeteria/atrium',
    );
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('atrium room reads sky-exposed = true', () => {
    const atriumBiome = BiomeApi.findByPath(
      '/lib/biome/indoor/cafeteria/atrium',
    );
    expect(atriumBiome).not.toBeNull();
    const room = makeStuff(() => new TestLocation());
    room.setBiome(atriumBiome!);
    expect(BiomeApi.isSkyExposed(room)).toBe(true);
  });

  it('sibling cafeteria room is NOT sky-exposed', () => {
    const cafBiome = BiomeApi.findByPath('/lib/biome/indoor/cafeteria');
    const sibling = makeStuff(() => new TestLocation());
    sibling.setBiome(cafBiome!);
    expect(BiomeApi.isSkyExposed(sibling)).toBe(false);
  });
});
