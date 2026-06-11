/**
 * GasAnalyzer — handheld instrument exposing the `measure
 * atmosphere` subcommand. Reads the atmosphere medium tag
 * (`'air'`, `'water'`, `'vacuum'`, …) at the immediate scope
 * through `BiomeApi.resolveAtmosphereFor`.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class GasAnalyzer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['perception/measure.yaml'],
    environment: [],
    peers: [],
  };
}
