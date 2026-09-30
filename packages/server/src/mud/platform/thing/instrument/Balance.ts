/**
 * Balance — handheld balance/scale instrument that grants the
 * `weigh <target>` verb to its carrier.
 *
 * v1 reports exact mass — per-instrument calibration / accuracy
 * is a future axis (deferred until content motivates it).
 */

import Good from '../../../lib/stuff/Good';
import type { CommandContributions } from '../../../api/command';

export default class Balance extends Good {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['platform/cmd/perception/weigh.yaml'],
    peers: ['platform/cmd/perception/weigh.yaml'],
  };
}
