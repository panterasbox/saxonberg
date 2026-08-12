/**
 * Scenario C — cafeteria atrium showcase. The cafeteria biome at
 * `/obj/biome/indoor/social/cafeteria` is a plain `Biome`; a sibling
 * leaf `cafeteria-atrium` extends `SkyExposedBiome` and explicitly
 * `_extendsBiomePath`-refs the cafeteria. A Location pointing at
 * the atrium reads sky-exposed while a sibling Location pointing at
 * the cafeteria does not.
 *
 * Demonstrates the post-refactor model's clean separation:
 * inheritance is decoupled from templatePath, so an atrium can sit
 * next to its parent in the path tree (same admin team, same folder)
 * while still inheriting all the cafeteria's atmospheric profile.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../stuff/Location';
import Biome from '../Biome';
import { SkyExposedBiome } from '../../../obj/SkyExposedBiome';
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

describe('Biome scenario C — atrium sibling biome', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
    // Plain Biome at the cafeteria slot.
    makeStuffAtPath(() => {
      const b = new Biome();
      b._extendsBiomePath = '/obj/biome/universe';
      return b;
    }, '/obj/biome/indoor/social/cafeteria');
    // SkyExposedBiome sibling that explicitly extends the cafeteria.
    makeStuffAtPath(() => {
      const b = new SkyExposedBiome();
      b._extendsBiomePath = '/obj/biome/indoor/social/cafeteria';
      return b;
    }, '/obj/biome/indoor/social/cafeteria-atrium');
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('atrium room reads sky-exposed = true', () => {
    const atriumBiome = BiomeApi.findByPath(
      '/obj/biome/indoor/social/cafeteria-atrium',
    );
    expect(atriumBiome).not.toBeNull();
    const room = makeStuff(() => new TestLocation());
    room.setBiome(atriumBiome!);
    expect(BiomeApi.isSkyExposed(room)).toBe(true);
  });

  it('sibling cafeteria room is NOT sky-exposed', () => {
    const cafBiome = BiomeApi.findByPath(
      '/obj/biome/indoor/social/cafeteria',
    );
    const sibling = makeStuff(() => new TestLocation());
    sibling.setBiome(cafBiome!);
    expect(BiomeApi.isSkyExposed(sibling)).toBe(false);
  });
});
