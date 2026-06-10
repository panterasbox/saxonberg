/**
 * Balance — handheld balance/scale instrument that grants the
 * `weigh <target>` verb to its carrier.
 *
 * v1 reports exact mass — per-instrument calibration / accuracy
 * is a future axis (deferred until content motivates it).
 */

import Thing from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export default class Balance extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['perception/weigh.yaml'],
    environment: [],
    peers: [],
  };
}
