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

import { SpatialZone } from './SpatialZone';
import { Exit } from '../boundary/Exit';
import { NavigationApi } from '../../api/navigation';
import type { Location } from '../stuff/Location';
import type { Container } from './Container';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { SingletonMixin } from '../stuff/Singleton';

/** Compose a grid key from integer cell coordinates. */
function gridKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export class CartesianZone extends SingletonMixin(SpatialZone) {
  /**
   * Effective receiving-surface area per cell, in m². Drives
   * `CartesianLocation.getSizeScale()` directly (NOT squared) — the
   * value is interpreted as area, not linear extent. Wave 2 made
   * this commitment explicit: `LightApi.lightAt` divides accumulated
   * lumens by this scalar to produce illuminance in lux.
   *
   * Default 1.0 m² is a small alcove. Author larger values for
   * rooms — see `docs/subsystems/light.md` for calibration guidance
   * (a typical 5m × 5m room is `cellSize: 25`, an outdoor plaza
   * `cellSize: 100`).
   */
  protected cellSize: number = 1.0;

  public getCellSize(): number { return this.cellSize; }
  public setCellSize(value: number): void { this.cellSize = value; }

  /**
   * CartesianZone synthesizes cardinal-derived exits from grid
   * adjacency. Overrides the Zone base's `false` default.
   */
  public override hasDerivedAdjacency(): boolean { return true; }

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
    if (!MixinApi.isCartesianCoordinates(location)) {
      throw new Error(
        'CartesianZone.addLocation: location must compose CartesianCoordinatesMixin.'
      );
    }
    location.setCoordinates([x, y, z]);
    this.grid.set(gridKey(x, y, z), location);
    this.derivedCache.clear();
    super.addLocation(location);
  }

  /**
   * Remove a location from the grid. Also clears the zone back-reference
   * and invalidates the derived cache.
   */
  public override removeLocation(location: Location): boolean {
    if (!MixinApi.isCartesianCoordinates(location)) {
      throw new Error(
        'CartesianZone.removeLocation: location must compose CartesianCoordinatesMixin.'
      );
    }
    const coords = location.getCoordinates();
    const key = gridKey(coords[0], coords[1], coords[2]);
    if (this.grid.get(key) === location) {
      this.grid.delete(key);
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
    if (!MixinApi.isCartesianCoordinates(from)) {
      throw new Error(
        'CartesianZone.getNeighbor: from location must compose CartesianCoordinatesMixin.'
      );
    }
    const coords = from.getCoordinates();
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
    if (!this.getLocations().has(from)) return undefined;

    const cacheKey = `${(from as unknown as Stuff).stuffId}:${canonical}`;
    const cached = this.derivedCache.get(cacheKey);
    if (cached) return cached;

    const neighbor = this.getNeighbor(from, canonical);
    if (!neighbor) return undefined;

    // Use the type-predicate form so the narrowing flows through to
    // the Exit constructor — `MixinApi.isContainer` narrows
    // `Location` to `Location & Container`, which IS `Stuff & Container`,
    // so no cast is needed at the call site.
    if (!MixinApi.isContainer(from)) return undefined;
    if (!MixinApi.isContainer(neighbor)) return undefined;

    const exit = StuffApi.createSync(() => new Exit({
      direction: canonical,
      source: from,
      destination: neighbor,
    }));
    this.derivedCache.set(cacheKey, exit);
    return exit;
  }
}
