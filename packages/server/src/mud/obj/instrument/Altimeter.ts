/**
 * Altimeter — handheld instrument exposing the `measure altitude`
 * subcommand. Derives altitude from the barometric delta between
 * local pressure and the root biome's sea-level reference:
 *
 *   altitude = (P_sea - P_local) / (ρ · g)
 *
 * where ρ comes from `BiomeApi.densityOf(atmosphere)` and g from
 * `BiomeApi.resolveGravityFor`. In vacuum (ρ = 0) the verb refuses
 * — there's no medium to define a barometric altitude against.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class Altimeter extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['perception/measure.yaml'],
    peers: [],
  };
}
