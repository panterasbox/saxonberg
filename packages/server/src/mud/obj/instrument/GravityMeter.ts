/**
 * GravityMeter — handheld instrument exposing the `measure gravity`
 * subcommand. Reads gravitational acceleration (m/s²) at the
 * immediate scope through `BiomeApi.resolveGravityFor`.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class GravityMeter extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['measure.yaml'],
    environment: [],
    peers: [],
  };
}
