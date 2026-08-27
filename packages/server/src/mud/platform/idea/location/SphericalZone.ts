/**
 * SphericalZone — spherical locations positioned by focus, no implicit adjacency.
 *
 * Locations are spheres (see SphericalCoordinatesMixin) positioned by focus
 * in spherical coordinates. Angles between spheres are arbitrary, so exits
 * are **always explicit** — authored by hand as semantic labels like
 * `'office'` or `'plaza'`. The zone never synthesizes an exit.
 *
 * A debug index by rounded focus tuple is maintained to help tooling /
 * authoring find nearby locations; it is NOT consulted by the exit-lookup
 * algorithm.
 */

import { SpatialZone } from '../../../lib/zone/SpatialZone';
import type Location from '../../../lib/stuff/Location';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import { MixinApi } from '../../../api/mixin';
import type { FieldMeta } from '../../../lib/mixin';

/** Round a focus tuple to 2 decimals — good enough for authoring tooling. */
function focusKey(coords: [number, number, number]): string {
  return `${coords[0].toFixed(2)},${coords[1].toFixed(2)},${coords[2].toFixed(2)}`;
}

export default class SphericalZone extends SingletonMixin(SpatialZone) {
  /**
   * Debug / authoring aid: locations indexed by rounded focus tuple.
   * Multiple locations may share a key (nothing prevents overlap); the
   * map stores the most recently added. Not used by exit lookup.
   * Host-internal storage; external callers go through `getFocusIndex()`.
   */
  protected readonly focusIndex: Map<string, Location> = new Map();

  public getFocusIndex(): ReadonlyMap<string, Location> { return this.focusIndex; }

  /**
   * Parallel of `CartesianZone.hasRoomAt` — true iff the location at
   * the focus key in this zone matches (and, when supplied, is the
   * specific `SphericalLocation` reference). Used by
   * `SphericalLocation.setFocus` for idempotency.
   *
   * NOTE: the `focusIndex` is intentionally lossy (rounded keys); this
   * predicate suffices for setter idempotency but is not a substitute
   * for exact focus-membership queries elsewhere.
   */
  public hasLocationAtFocus(
    focus: [number, number, number],
    location?: Location
  ): boolean {
    const here = this.focusIndex.get(focusKey(focus));
    if (!here) return false;
    return location ? here === location : true;
  }

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
  };

  public override addLocation(location: Location): void {
    if (!MixinApi.isSphericalCoordinates(location)) {
      throw new Error(
        'SphericalZone.addLocation: location must compose SphericalCoordinatesMixin.'
      );
    }
    super.addLocation(location);
    this.focusIndex.set(focusKey(location.getCoordinates()), location);
  }

  public override removeLocation(location: Location): boolean {
    if (!MixinApi.isSphericalCoordinates(location)) {
      throw new Error(
        'SphericalZone.removeLocation: location must compose SphericalCoordinatesMixin.'
      );
    }
    const key = focusKey(location.getCoordinates());
    if (this.focusIndex.get(key) === location) {
      this.focusIndex.delete(key);
    }
    return super.removeLocation(location);
  }
}
