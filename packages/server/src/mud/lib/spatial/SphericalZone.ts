/**
 * SphericalZone — spherical locations positioned by focus, no implicit adjacency.
 *
 * Locations are spheres (see SphericalCoordinatesMixin) positioned by focus
 * in spherical coordinates. Angles between spheres are arbitrary, so exits
 * are **always explicit** — authored by hand as semantic labels like
 * `'office'` or `'plaza'`. `deriveExit()` accordingly always returns
 * `undefined`.
 *
 * A debug index by rounded focus tuple is maintained to help tooling /
 * authoring find nearby locations; it is NOT consulted by the exit-lookup
 * algorithm.
 */

import { Zone } from './Zone';
import type { Location } from '../stuff/Location';
import type { Exit } from './Exit';
import { SingletonMixin } from '../stuff/Singleton';

/**
 * Minimal shape spherical locations are expected to carry.
 */
interface HasSphericalCoordinates {
  coordinates: [number, number, number];
  radius: number;
}

/** Round a focus tuple to 2 decimals — good enough for authoring tooling. */
function focusKey(coords: [number, number, number]): string {
  return `${coords[0].toFixed(2)},${coords[1].toFixed(2)},${coords[2].toFixed(2)}`;
}

export class SphericalZone extends SingletonMixin(Zone) {
  /**
   * Debug / authoring aid: locations indexed by rounded focus tuple.
   * Multiple locations may share a key (nothing prevents overlap); the
   * map stores the most recently added. Not used by exit lookup.
   */
  public readonly focusIndex: Map<string, Location> = new Map();

  static persistentFields = ['name'];

  public override addLocation(location: Location): void {
    super.addLocation(location);
    const holder = location as unknown as Partial<HasSphericalCoordinates>;
    if (Array.isArray(holder.coordinates)) {
      this.focusIndex.set(focusKey(holder.coordinates), location);
    }
  }

  public override removeLocation(location: Location): boolean {
    const holder = location as unknown as Partial<HasSphericalCoordinates>;
    if (Array.isArray(holder.coordinates)) {
      const key = focusKey(holder.coordinates);
      if (this.focusIndex.get(key) === location) {
        this.focusIndex.delete(key);
      }
    }
    return super.removeLocation(location);
  }

  /**
   * Spherical zones have no derivable adjacency — all exits are explicit.
   * Always returns `undefined` by design.
   */
  public deriveExit(_from: Location, _direction: string): Exit | undefined {
    return undefined;
  }
}
