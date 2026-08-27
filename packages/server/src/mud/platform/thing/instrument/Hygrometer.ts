/**
 * Hygrometer — handheld instrument exposing the `measure humidity`
 * subcommand. Reads relative humidity (%) at the immediate scope
 * through `BiomeApi.resolveHumidityFor`.
 */

import Thing from '../../../lib/stuff/Thing';
import type { CommandContributions } from '../../../api/command';

export default class Hygrometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/perception/measure.yaml'],
    peers: ['platform/cmd/perception/measure.yaml'],
  };
}
