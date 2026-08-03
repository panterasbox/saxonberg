/**
 * Scenario E from the biome slate — gas-law honesty.
 *
 * A 3 m × 3 m × 3 m cafeteria cell at standard conditions: 27 m³
 * of air at 295 K, 101325 Pa. Ideal-gas law:
 *
 *   n = PV / RT  with R = 8.314 J/(mol·K)
 *     = 101325 · 27 / (8.314 · 295)
 *     ≈ 1116 mol
 *
 * The substrate must produce numbers a chemistry / physics
 * curriculum could compute honestly against.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import CartesianLocation from '../../lib/location/CartesianLocation';
import CartesianZone from '../../obj/location/CartesianZone';
import Biome from '../../lib/biome/Biome';
import { BiomeApi } from '../biome';
import { Quantity } from '../../lib/quantity';
import { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

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

describe('Biome scenario E — cafeteria gas-law', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    BiomeApi.invalidateRootBiomeCache();
    installRootBiome();
  });

  afterEach(() => {
    StuffApi.clearAll();
    BiomeApi.invalidateRootBiomeCache();
  });

  it('27 m³ of air at standard conditions yields ≈ 1116 mol via PV = nRT', async () => {
    const zone = makeStuff(() => new CartesianZone());
    const room = makeStuff(() => new CartesianLocation());
    Stuff._stampZone(room, zone);

    // 3 m linear cellSize is the new default; derived volume is 27 m³.
    // `getVolume()` lives on AtmosphericMixin (composed by Location);
    // CartesianLocation overrides per its cube topology.
    const volume = room.getVolume();
    expect(volume).not.toBeNull();
    expect(volume!.rawValue()).toBe(27);

    // No room or biome overrides → universe defaults: 101325 Pa @ 295 K.
    const T = await BiomeApi.resolveTemperatureFor(room);
    const P = await BiomeApi.resolvePressureFor(room);
    const atmosphere = await BiomeApi.resolveAtmosphereFor(room);
    expect(atmosphere).toBe('air');

    // Ideal-gas: n = PV / RT. R = 8.314 J/(mol·K).
    const R = 8.314;
    const n = (P.rawValue() * volume!.rawValue()) / (R * T.rawValue());
    expect(n).toBeCloseTo(1115, 0);
    // Sanity: well within +/-2 mol of the textbook 1115.4.
    expect(n).toBeGreaterThan(1113);
    expect(n).toBeLessThan(1118);
  });
});
