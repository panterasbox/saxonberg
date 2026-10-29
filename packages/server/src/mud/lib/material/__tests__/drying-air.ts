/**
 * The root biome a drying solid's water reads its air off — the test-side
 * stand-in for `base-library`'s `universe.yaml`.
 *
 * ⭐ Anything that composes `MoistureMixin` and has been dried (a board
 * minted seasoned, a cured ham) reads the air of wherever it is, and with
 * no authored air on the room that read reaches the root biome. Unit
 * fixtures that put such a thing in a bare `Location` install this first.
 */

import Biome from '../../biome/Biome';
import { BiomeApi } from '../../../api/biome';
import { Quantity } from '../../quantity';
import { makeStuffAtPath } from '../../security/__tests__/test-setup';

/** A mild, middling-damp universe — 50 % humidity, no wind, 295 K. */
export function installDryingAir(humidityPct = 50): Biome {
  BiomeApi.invalidateRootBiomeCache();
  return makeStuffAtPath(() => {
    const b = new Biome();
    b.setDefaultTemperature(Quantity.of(295, 'K'));
    b.setDefaultPressure(Quantity.of(101325, 'Pa'));
    b.setDefaultHumidity(Quantity.of(humidityPct, '%'));
    b.setDefaultGravity(Quantity.of(9.81, 'm/s²'));
    b.setDefaultWind(Quantity.of(0, 'm/s'));
    b.setDefaultAtmosphere('air');
    return b;
  }, '/stuff/idea/biome/universe');
}
