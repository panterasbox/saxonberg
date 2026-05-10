/**
 * Balance — handheld balance/scale instrument that grants the
 * `weigh <target>` verb to its carrier.
 *
 * v1 reports exact mass — calibration / accuracy is deferred per
 * requirements §15.
 */

import { Thing } from '../../lib/stuff/Thing';
import type { CommandContributions } from '../../api/command';

export class Balance extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['weigh.yaml'],
    environment: [],
    peers: [],
  };
}
