import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Location from '../../lib/stuff/Location';
import Biome from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import CartesianZone from '../../lib/location/CartesianZone';
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
  }, '/lib/biome/universe');
}

describe('BiomeApi resolve* — spatial zone step', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it("zone default beats universe default when set via 'atmosphere.<field>'", async () => {
    const zone = makeStuff(() => new CartesianZone());
    // Zone.lookupField does bracket access for keys without a
    // matching get<PascalCase>; set the field directly so the chain
    // walker step 5 finds it.
    (zone as unknown as Record<string, unknown>)['atmosphere.temperature'] =
      Quantity.of(310, 'K');

    const room = makeStuff(() => new TestLocation());
    Stuff._stampZone(room, zone);

    const trace = await BiomeApi.traceResolveTemperatureFor(room);
    expect(trace.value.rawValue()).toBe(310);
    expect(trace.source).toBe('zone');
  });

  it('zone-side field does not affect unrelated fields', async () => {
    const zone = makeStuff(() => new CartesianZone());
    (zone as unknown as Record<string, unknown>)['atmosphere.temperature'] =
      Quantity.of(310, 'K');

    const room = makeStuff(() => new TestLocation());
    Stuff._stampZone(room, zone);

    // Pressure has no zone override → falls to universe default.
    expect((await BiomeApi.resolvePressureFor(room)).rawValue()).toBe(101325);
  });
});
