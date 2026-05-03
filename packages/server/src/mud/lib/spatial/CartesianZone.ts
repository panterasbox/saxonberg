/**
 * CartesianZone — grid-indexed zone that derives cardinal exits from adjacency.
 *
 * Cells are the same size within a single zone (`cellSize`). Rooms are
 * positioned by integer grid coordinates `(x, y, z)`. Exits in cardinal
 * directions are NOT authored by hand; they are *derived* from grid
 * neighborship on demand and cached.
 *
 * - `addRoom(room, x, y, z)` — place a room at a grid cell; stamps the
 *   room's `coordinates` and `zone`, invalidates the derived-exit cache.
 * - `deriveExit(from, direction)` — looks up the neighbor cell; if present,
 *   synthesizes a one-way `Exit` (cached) from `from` to the neighbor. If
 *   no neighbor, returns `undefined`.
 *
 * Derived exits are NEVER persisted — recomputed each boot.
 */

import { Zone } from './Zone';
import { Exit } from './Exit';
import { NavigationApi } from '../../api/navigation';
import type { Location } from '../stuff/Location';
import type { Container } from './Container';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../mixin-types';
import { StuffApi } from '../../api/stuff';

/** Compose a grid key from integer cell coordinates. */
function gridKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Minimal shape required of rooms added to a CartesianZone: they must carry
 * a `coordinates` triple (from `CartesianCoordinatesMixin`). Checked at
 * runtime in `addRoom()`.
 */
interface HasCartesianCoordinates {
  coordinates: [number, number, number];
}

export class CartesianZone extends Zone {
  /** Informational scale — meters/units per cell. Unused by code in Phase 7. */
  public cellSize: number = 1.0;

  /** Rooms indexed by `"x,y,z"` key. */
  public readonly grid: Map<string, Location> = new Map();

  /**
   * Lazy cache of derived exits keyed by `"<fromStuffId>:<direction>"`.
   * Invalidated wholesale when the grid changes — cheap to rebuild.
   */
  private derivedCache: Map<string, Exit> = new Map();

  static persistentFields = ['name', 'cellSize'];

  /**
   * Place a room at a grid cell.
   *
   * Stamps the room's `coordinates` (via the CartesianCoordinatesMixin it is
   * required to have) and back-references this zone via `room.zone`.
   * Invalidates the derived-exit cache.
   */
  public addRoom(room: Location, x: number = 0, y: number = 0, z: number = 0): void {
    const coordHolder = room as unknown as HasCartesianCoordinates;
    if (!Array.isArray(coordHolder.coordinates)) {
      throw new Error(
        'CartesianZone.addRoom: room must compose CartesianCoordinatesMixin (no coordinates field found).'
      );
    }
    coordHolder.coordinates = [x, y, z];
    this.grid.set(gridKey(x, y, z), room);
    this.derivedCache.clear();
    super.addRoom(room);
  }

  /**
   * Remove a room from the grid. Also clears the zone back-reference and
   * invalidates the derived cache.
   */
  public override removeRoom(room: Location): boolean {
    const coords = (room as unknown as HasCartesianCoordinates).coordinates;
    if (Array.isArray(coords)) {
      const key = gridKey(coords[0], coords[1], coords[2]);
      if (this.grid.get(key) === room) {
        this.grid.delete(key);
      }
    }
    this.derivedCache.clear();
    return super.removeRoom(room);
  }

  /**
   * Grid-neighbor lookup: the room at `from + offset(direction)`, or
   * `undefined` if that cell is empty / the direction isn't cardinal.
   */
  public getNeighbor(from: Location, direction: string): Location | undefined {
    const offset = NavigationApi.directionOffset(direction);
    if (!offset) return undefined;
    const coords = (from as unknown as HasCartesianCoordinates).coordinates;
    if (!Array.isArray(coords)) return undefined;
    const [dx, dy, dz] = offset;
    return this.grid.get(gridKey(coords[0] + dx, coords[1] + dy, coords[2] + dz));
  }

  /**
   * Zone-derived exit: synthesize a one-way `Exit` from `from` to its
   * grid neighbor in `direction`. Cached per-source per-direction.
   *
   * Returns `undefined` when `direction` isn't cardinal, `from` isn't in
   * this zone, or the neighbor cell is empty.
   */
  public deriveExit(from: Location, direction: string): Exit | undefined {
    const canonical = NavigationApi.normalizeDirection(direction);
    if (!canonical) return undefined;
    if (!this.rooms.has(from)) return undefined;

    const cacheKey = `${(from as unknown as Stuff).stuffId}:${canonical}`;
    const cached = this.derivedCache.get(cacheKey);
    if (cached) return cached;

    const neighbor = this.getNeighbor(from, canonical);
    if (!neighbor) return undefined;

    if (!MixinApi.hasMixin(from.constructor as never, Mixins.Container)) return undefined;
    if (!MixinApi.hasMixin(neighbor.constructor as never, Mixins.Container)) return undefined;

    const exit = StuffApi.createSync(() => new Exit({
      direction: canonical,
      source: from as unknown as Stuff & Container,
      destination: neighbor as unknown as Stuff & Container,
    }));
    this.derivedCache.set(cacheKey, exit);
    return exit;
  }
}
