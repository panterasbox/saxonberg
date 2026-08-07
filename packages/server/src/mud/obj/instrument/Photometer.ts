/**
 * Photometer — handheld instrument that exposes the `measure light`
 * subcommand on its inventory bucket. Carrying a Photometer grants
 * the player access to read out canonical lux at their location.
 *
 * The instrument is a plain `Thing` for v1; it composes
 * `Wieldable` once the embodiment slate ships.
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class Photometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['perception/measure.yaml'],
    peers: ['perception/measure.yaml'],
  };
}
