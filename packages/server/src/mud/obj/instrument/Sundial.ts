/**
 * Sundial — handheld instrument exposing the `measure shadow`
 * subcommand. Reads solar elevation / azimuth at the immediate scope
 * via `CelestialApi`, the way a real shadow-caster encodes the sun's
 * position.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class Sundial extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['perception/measure.yaml'],
    peers: ['perception/measure.yaml'],
  };
}
