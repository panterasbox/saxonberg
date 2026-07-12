// ResidencyApi — the thin, gated forwarding shell over ResidencyLogic,
// the home for scheduled object self-maintenance (the real-time eviction
// sweep now; the deferred game-time reset sweep later — same shape).
// See docs/subsystems/residency.md.

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
   * Boot seam (idempotent): install the residency sweeps. Today that's
   * the real-time cold-tail eviction sweep; the deferred reset sweep will
   * be installed here too. Activation = the `ResidencyLogic` singleton's
   * presence. Eviction ships in observe mode (`residency.eviction.mode`),
   * so booting culls nothing until an operator flips it to `enforce`.
   */
  public static boot(): void {
    logic().installEvictionSweep();
  }

  /**
   * Run one eviction sweep now (test / manual seam). Returns a promise
   * that resolves once the sweep — including any persistable host's durable
   * capture before its cull — has completed.
   */
  public static evictNow(): Promise<void> {
    return logic().evictNow();
  }
}

SecurityApi.decorateApiClass(ResidencyApi);
