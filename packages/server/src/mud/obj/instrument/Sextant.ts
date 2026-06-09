/**
 * Sextant — handheld instrument exposing `measure altitude <sun|moon>`
 * (the angular branch of the `altitude` subcommand). Takes a real
 * angular measurement of the sun or moon at the immediate scope via
 * `CelestialApi`.
 */

import { Thing } from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export class Sextant extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['measure.yaml'],
    environment: [],
    peers: [],
  };
}
