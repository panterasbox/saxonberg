/**
 * Hydrometer — handheld specific-gravity instrument: it grants the
 * `measure density` verb to its carrier (the thermometer's pattern
 * exactly — readings are channels, procedures are verbs; a number
 * costs an instrument, and the first screen is the syllabus).
 *
 * The fermentation instrument (D5): float it in a working batch and
 * the sugar the ferment hasn't eaten yet reads back as gravity — two
 * vats at two temperatures, read over days, recover the profile's
 * authored slopes (D4's experiment). The shipped `gravity-meter` is
 * geophysics kit; this is the cellar's own glass.
 */

import Thing from '../../../lib/stuff/Thing';
import type { CommandContributions } from '../../../api/command';

export default class Hydrometer extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/perception/measure.yaml'],
    peers: ['platform/cmd/perception/measure.yaml'],
  };
}
