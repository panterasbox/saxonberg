// ResidencyApi — the thin, gated forwarding shell over ResidencyLogic
// (the cold-tail self-eviction sweep). See docs/subsystems/residency.md.

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ResidencyLogic } from '../obj/api/ResidencyLogic';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/residency';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ResidencyLogic', import.meta.url),
);

/** Resolve the HMR-able ResidencyLogic singleton (sync). */
function logic(): ResidencyLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ResidencyLogic',
      ) as typeof ResidencyLogic | null) ?? ResidencyLogic)(),
  );
}

export class ResidencyApi {
  /**
   * Boot seam (idempotent): install the real-time cold-tail sweep.
   * Activation = the `ResidencyLogic` singleton's presence. Ships in
   * observe mode (`residency.mode`), so booting culls nothing until an
   * operator flips it to `enforce`.
   */
  public static boot(): void {
    logic().installSweep();
  }

  /** Run one sweep now (test / manual seam). */
  public static sweepNow(): void {
    logic().sweepNow();
  }
}

SecurityApi.decorateApiClass(ResidencyApi);
