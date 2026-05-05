/**
 * CartesianZone — grid-indexed zone that derives cardinal exits from adjacency.
 *
 * Cells are the same size within a single zone (`cellSize`). Locations are
 * positioned by integer grid coordinates `(x, y, z)`. Exits in cardinal
 * directions are NOT authored by hand; they are *derived* from grid
 * neighborship on demand and cached.
 *
 * - `addLocation(location, x, y, z)` — place a location at a grid cell;
 *   stamps the location's `coordinates` and `zone`, invalidates the
 *   derived-exit cache.
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
import { Mixins } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { SingletonMixin } from '../stuff/Singleton';

/** Compose a grid key from integer cell coordinates. */
function gridKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Minimal shape required of locations added to a CartesianZone: they must
 * compose `CartesianCoordinatesMixin`. Checked at runtime in
 * `addLocation()` via the method surface.
 */
interface HasCartesianCoordinates {
  getCoordinates(): [number, number, number];
  setCoordinates(value: [number, number, number]): void;
}

export class CartesianZone extends SingletonMixin(Zone) {
  /** Informational scale — meters/units per cell. Unused by code in Phase 7. */
  protected cellSize: number = 1.0;

  public getCellSize(): number { return this.cellSize; }
  public setCellSize(value: number): void { this.cellSize = value; }

  /** Locations indexed by `"x,y,z"` key. Host-internal. */
  protected readonly grid: Map<string, Location> = new Map();

  public getGrid(): ReadonlyMap<string, Location> { return this.grid; }

  /**
   * Lazy cache of derived exits keyed by `"<fromStuffId>:<direction>"`.
   * Invalidated wholesale when the grid changes — cheap to rebuild.
   */
  private derivedCache: Map<string, Exit> = new Map();

  static persistentFields = ['name', 'cellSize'];

  /**
   * Place a location at a grid cell.
   *
   * Stamps the location's `coordinates` (via the CartesianCoordinatesMixin
   * it is required to have) and back-references this zone via
   * `location.zone`. Invalidates the derived-exit cache.
   */
  public addLocation(
    location: Location,
    x: number = 0,
    y: number = 0,
    z: number = 0
  ): void {
    const coordHolder = location as unknown as HasCartesianCoordinates;
    if (typeof coordHolder.getCoordinates !== 'function') {
      throw new Error(
        'CartesianZone.addLocation: location must compose CartesianCoordinatesMixin (no getCoordinates method found).'
      );
    }
    coordHolder.setCoordinates([x, y, z]);
    this.grid.set(gridKey(x, y, z), location);
    this.derivedCache.clear();
    super.addLocation(location);
  }

  /**
   * Remove a location from the grid. Also clears the zone back-reference
   * and invalidates the derived cache.
   */
  public override removeLocation(location: Location): boolean {
    const holder = location as unknown as Partial<HasCartesianCoordinates>;
    if (typeof holder.getCoordinates === 'function') {
      const coords = holder.getCoordinates();
      const key = gridKey(coords[0], coords[1], coords[2]);
      if (this.grid.get(key) === location) {
        this.grid.delete(key);
      }
    }
    this.derivedCache.clear();
    return super.removeLocation(location);
  }

  /**
   * Grid-neighbor lookup: the location at `from + offset(direction)`, or
   * `undefined` if that cell is empty / the direction isn't cardinal.
   */
  public getNeighbor(from: Location, direction: string): Location | undefined {
    const offset = NavigationApi.directionOffset(direction);
    if (!offset) return undefined;
    const holder = from as unknown as Partial<HasCartesianCoordinates>;
    if (typeof holder.getCoordinates !== 'function') return undefined;
    const coords = holder.getCoordinates();
    const [dx, dy, dz] = offset;
    return this.grid.get(gridKey(coords[0] + dx, coords[1] + dy, coords[2] + dz));
  }

  /**
   * Belt-and-braces: `removeLocation` already invalidates `derivedCache`
   * each time a location leaves, but if the Zone is destructed while
   * empty we still want the cache empty (and the `super.prepareDestroy()`
   * non-empty guard fires above otherwise).
   */
  public override prepareDestroy(): void {
    super.prepareDestroy();
    this.derivedCache.clear();
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
    if (!this.getLocations().has(from)) return undefined;

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
