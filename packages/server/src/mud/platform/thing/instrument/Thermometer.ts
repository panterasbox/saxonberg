/**
 * Thermometer — handheld instrument exposing the `measure
 * temperature` subcommand on its inventory bucket. Carrying a
 * Thermometer grants the player access to read the atmospheric
 * temperature at their immediate scope (the room or vessel that
 * contains them).
 *
 * Mechanically a plain `Thing` like its instrument siblings; the
 * verb itself reads through `BiomeApi.resolveTemperatureFor`.
 */

import Thing from '../../../lib/stuff/Thing';
import type { CommandContributions } from '../../../api/command';

export default class Thermometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/perception/measure.yaml'],
    peers: ['platform/cmd/perception/measure.yaml'],
  };
}
