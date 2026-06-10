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

import { SpatialZone } from '../zone/SpatialZone';
import Exit from '../boundary/Exit';
import { NavigationApi } from '../../api/navigation';
import type Location from '../stuff/Location';
import type { Container } from './Container';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { SingletonMixin } from '../stuff/Singleton';

/** Compose a grid key from integer cell coordinates. */
function gridKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export default class CartesianZone extends SingletonMixin(SpatialZone) {
  /**
   * Linear cell extent, in **meters**. A cube-cell zone with
   * `cellSize: 3` carries `3m × 3m × 3m` cells — 9 m² floor area,
   * 27 m³ volume, 3 m ceiling. Drives:
   *
   *   - `CartesianLocation.getVolume()` → `cellSize³`
   *   - `CartesianLocation.getCeilingHeight()` → `cellSize`
   *   - `CartesianLocation.getSizeScale()` → `cellSize²` (the light
   *     substrate's receiving-surface area divisor — derived by
   *     squaring the linear extent rather than authored separately).
   *
   * Default 3.0 m is a typical room. Author larger values for
   * outdoor cells — see `docs/subsystems/light.md` and
   * `docs/subsystems/biome.md` for calibration guidance.
   */
  protected cellSize: number = 3.0;

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
   * True iff the supplied coordinates currently host a room in this
   * zone's grid. When `room` is provided, the check tightens to "is
   * THIS specific room at those coordinates?" — used by
   * `CartesianLocation.setCoords` for idempotency (a re-set with the
   * same coords on the same room is a no-op).
   *
   * Per declarative-content-slate § coords on CartesianLocation.
   */
  public hasRoomAt(x: number, y: number, z: number, room?: Location): boolean {
    const here = this.grid.get(gridKey(x, y, z));
    if (!here) return false;
    return room ? here === room : true;
  }

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
