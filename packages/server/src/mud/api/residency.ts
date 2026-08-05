// ResidencyApi — the thin, gated forwarding shell over ResidencyLogic,
// the home for scheduled object self-maintenance (the real-time eviction
// sweep now; the deferred game-time reset sweep later — same shape).
// See docs/subsystems/residency.md.

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ResidencyLogic } from '../obj/api/ResidencyLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import type { SpawnSweepReport } from '../obj/api/ResidencyLogic';
import type { WorldCensus } from '../lib/residency/Census';

export type { SpawnSweepReport, WorldCensus };

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
   * Boot seam (idempotent): install the residency sweeps — the real-time
   * cold-tail eviction sweep, the game-time reset (repop) sweep, and the
   * game-time **spawn** sweep. Activation = the `ResidencyLogic`
   * singleton's presence. All three ship in observe mode
   * (`residency.eviction.mode` / `residency.reset.mode` /
   * `residency.spawn.mode`), so booting culls, repops and places nothing
   * until an operator flips one to `enforce`.
   */
  public static boot(): void {
    logic().installEvictionSweep();
    logic().installResetSweep();
    logic().installSpawnSweep();
  }

  /**
   * Run one eviction sweep now (test / manual seam). Returns a promise
   * that resolves once the sweep — including any persistable host's durable
   * capture before its cull — has completed.
   */
  public static evictNow(): Promise<void> {
    return logic().evictNow();
  }

  /**
   * Run one reset (repop) sweep now (test / manual seam). Resolves once
   * every enforced `ResettableMixin` object has restored itself.
   */
  public static resetNow(): Promise<void> {
    return logic().resetNow();
  }

  /**
   * Run one spawn sweep now (test / manual seam). Returns what it did —
   * including how many regions **declined** because they were already at
   * target, which is the observable half of authored placement
   * suppressing random spawning.
   */
  public static spawnNow(): Promise<SpawnSweepReport> {
    return logic().spawnNow();
  }

  /**
   * **How much circulating stock exists, by region and census key.**
   *
   * *Circulation = what is reachable in the world now* — a wand in a
   * logged-off player's pack is a withdrawal until they log in. That is
   * the discovery slate's own stock model, and the right quantity for
   * the decision being made: both injection channels place into LIVE
   * regions, so live regional stock is what they must not over-fill.
   *
   * Computed once per sweep and shared, never per candidate.
   */
  public static takeCensus(): Promise<WorldCensus> {
    return logic().takeCensus();
  }
}

SecurityApi.decorateApiClass(ResidencyApi);
