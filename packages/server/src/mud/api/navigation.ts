/**
 * NavigationApi — canonical direction table, aliases, and cartesian offsets.
 *
 * Cartesian zones use a 10-way direction set: the 8 compass cardinals plus
 * `up` and `down`. Each direction has a `[dx, dy, dz]` offset (used by
 * `CartesianZone.getNeighbor()` and coordinate geometry) and a canonical
 * inverse used by arrival-message formatting + authoring reciprocal exits.
 *
 * Spherical zones and vessels use arbitrary semantic labels (`'office'`,
 * `'kitchen'`, `'out'`) that live outside this table — callers treat an
 * `undefined` result from `normalizeDirection()` / `invertDirection()` as
 * "not cardinal".
 *
 * Thin, security-gated forwarding shell: the direction table and lookups
 * live in the hot-reloadable {@link NavigationLogic} singleton at
 * `/obj/api/navigation`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /obj/api/navigation` reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { NavigationLogic } from '../obj/api/NavigationLogic';
import { fileURLToPath } from 'url';

/** Canonical direction names (long form). */
export type CardinalDirection =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'up'
  | 'down';

const LOGIC_PATH = '/obj/api/navigation';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/NavigationLogic', import.meta.url)
);

/** Resolve the HMR-able NavigationLogic singleton (sync). */
function logic(): NavigationLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'NavigationLogic'
      ) as typeof NavigationLogic | null) ?? NavigationLogic)()
  );
}

export class NavigationApi {
  /**
   * Normalize a direction string (or alias) to its canonical long-form name.
   *
   * Returns `undefined` when the input doesn't name a cardinal direction —
   * callers should treat that as "not a direction, try it as a vessel keyword
   * / semantic label" (see GoController).
   */
  public static normalizeDirection(
    input: string
  ): CardinalDirection | undefined {
    return logic().normalizeDirection(input);
  }

  /**
   * Return the cardinal inverse of a direction.
   *
   * Returns `undefined` for non-cardinals (semantic labels like `'office'` or
   * vessel-synthesized `'out'` have no structural inverse; arrival messages
   * degrade to "Alice arrives." for those cases).
   */
  public static invertDirection(
    direction: string
  ): CardinalDirection | undefined {
    return logic().invertDirection(direction);
  }

  /**
   * Grid offset triple for a direction (canonical or alias).
   *
   * Returns `undefined` for non-cardinals.
   */
  public static directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    return logic().directionOffset(direction);
  }

  /** Is `direction` (or its alias) one of the 10 canonical cardinals? */
  public static isCardinalDirection(direction: string): boolean {
    return logic().isCardinalDirection(direction);
  }

  /** List of canonical cardinal directions (useful for tests / iteration). */
  public static cardinalDirections(): readonly CardinalDirection[] {
    return logic().cardinalDirections();
  }
}

SecurityApi.decorateApiClass(NavigationApi);
