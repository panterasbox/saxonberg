/**
 * CartesianZone — grid-indexed zone: the coordinate grid + its invariants.
 *
 * Cells are the same size within a single zone (`cellSize`). Locations are
 * positioned by integer grid coordinates `(x, y, z)`. Exits are authored
 * explicitly on every room — the zone never *synthesizes* them from adjacency
 * (a room connects to exactly what its template declares). The zone's job is
 * the coordinate grid + its invariants (unique cell occupancy; the
 * cardinal-only-intra-zone exit rule on `CartesianLocation`).
 *
 * - `addLocation(location, x, y, z)` — place a location at a grid cell;
 *   stamps the location's `coordinates` and `zone`.
 * - `getNeighbor(from, direction)` — the room at `from + offset(direction)`,
 *   or `undefined` (a geometry query for tooling; not an exit source).
 */

import { SpatialZone } from '../../../lib/zone/SpatialZone';
import { NavigationApi } from '../../../api/navigation';
import type Location from '../../../lib/stuff/Location';
import { MixinApi } from '../../../api/mixin';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import type { FieldMeta } from '../../../lib/mixin';

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

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    cellSize: { persistent: true },
  };

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
    super.addLocation(location);
  }

  /**
   * Remove a location from the grid. Also clears the zone back-reference
   * and invalidates the derived cache.
   */
  public override removeLocation(location: Location): boolean {
    // A member with no coordinates was never ON the grid — a keyed
    // holding room lives under a cartesian zone for its ancestry (the
    // lots zone, residences P8) without being a grid cell. Its destruct
    // cleanup must not throw; there is simply no grid entry to clear.
    if (!MixinApi.isCartesianCoordinates(location)) {
      return super.removeLocation(location);
    }
    const coords = location.getCoordinates();
    const key = gridKey(coords[0], coords[1], coords[2]);
    if (this.grid.get(key) === location) {
      this.grid.delete(key);
    }
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

}
