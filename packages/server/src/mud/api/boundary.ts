/**
 * BoundaryApi — wiring a boundary to the ways it stands in.
 *
 * ⭐ A `Boundary` (a door, a window, a curtain) is ONE object; each place's
 * exit is a SIDE of it. Attaching is the one two-object act — the boundary
 * takes the exit as a side and the exit records its boundary — so it is
 * orchestration and lives here; everything a boundary does after that is a
 * method on it (`door.lock()`, `boundary.transmissivity(…)`).
 *
 *   - `attach(boundary, ...sides)` — take each exit as a side. Refuses a
 *     third side, an exit already on another boundary, and the same exit
 *     twice. Idempotent for a side already attached.
 *   - `detach(...sides)` — let each exit go; the boundary keeps its other
 *     side. `detach(...boundary.getSides())` frees both.
 *   - `mintKeyway()` — a fresh keyway for a lock.
 *
 * The anchor pair this Api used to install (`attachExistingBoundary`,
 * `create`) retired with the boundary build (2026-11): a side IS the
 * place's presence of the boundary, so nothing needs a fixture.
 *
 * Thin, security-gated forwarding shell over the hot-reloadable
 * {@link BoundaryLogic} singleton at `/platform/idea/api/boundary`.
 */

import type { Boundary } from '../lib/boundary/Boundary';
import type Exit from '../lib/boundary/Exit';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { BoundaryLogic } from '../platform/idea/api/BoundaryLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/boundary';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/BoundaryLogic', import.meta.url)
);

function logic(): BoundaryLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'BoundaryLogic'
      ) as typeof BoundaryLogic | null) ?? BoundaryLogic)()
  );
}

export class BoundaryApi {
  /** Take each exit as a side of `boundary`. See the file header. */
  public static attach<T extends Boundary>(boundary: T, ...sides: Exit[]): T {
    return logic().attach(boundary, sides);
  }

  /** Let each exit go from whatever boundary it is a side of. */
  public static detach(...sides: Exit[]): void {
    logic().detach(sides);
  }

  public static mintKeyway(): string {
    return logic().mintKeyway();
  }
}

SecurityApi.decorateApiClass(BoundaryApi);
