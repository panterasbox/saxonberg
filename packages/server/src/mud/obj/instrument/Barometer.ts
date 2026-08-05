/**
 * Barometer — handheld instrument exposing the `measure pressure`
 * subcommand. Reads atmospheric pressure (Pa) at the immediate
 * scope through `BiomeApi.resolvePressureFor`.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class Barometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['perception/measure.yaml'],
    peers: [],
  };
}
