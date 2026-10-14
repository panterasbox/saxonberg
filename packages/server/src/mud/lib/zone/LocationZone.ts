/**
 * LocationZoneMixin — the half of a spatial zone that HOLDS ROOMS.
 *
 * Until the maritime build this surface lived on `SpatialZone` itself,
 * which made "a region in space" and "a set of member Locations" one
 * claim. They are two. A grid of rooms (`CartesianZone`) and a cluster of
 * spheres (`SphericalZone`) hold Locations; an `Expanse` — a sea, a
 * desert, a void — is a region in space whose points of interest are
 * Ideas, and nothing is ever inside its frame. Composing this mixin is
 * what says *Locations live here*; a frame that does not compose it
 * inherits nothing to guard against.
 *
 * The zone back-reference is still written only by a `SpatialZone`:
 * `Stuff.setZone` is gated `FromSpatialZone` with `includeSubclasses`,
 * and the caller that policy reads is this zone instance, so the move of
 * the method body into a mixin changes nothing about who may write it.
 */

import type Location from '../stuff/Location';
import type { VetoResult } from '../errors';
import type { MixinConstructor } from '../mixin';
import type { SpatialZone } from './SpatialZone';

export interface LocationZone {
  getLocations(): ReadonlySet<Location>;
  addLocation(location: Location): void;
  removeLocation(location: Location): boolean;
  contains(location: Location): boolean;
  canDestruct(): VetoResult;
}

export function LocationZoneMixin<TBase extends MixinConstructor<SpatialZone>>(
  Base: TBase
) {
  return class LocationZoneMixin extends Base implements LocationZone {
    static _mixinName: string = 'LocationZoneMixin';

    /**
     * Locations that live in this zone. Populated by `addLocation()`.
     * Host-internal storage; external callers go through
     * `getLocations()` / `contains()`.
     *
     * `Location.zone` (on the Stuff base) is the back-reference stamped
     * when the location is added.
     */
    protected locations: Set<Location> = new Set();

    public getLocations(): ReadonlySet<Location> { return this.locations; }

    /**
     * Mark a location as belonging to this zone. Subclasses extend to
     * capture coordinates (CartesianZone stamps grid position,
     * SphericalZone stamps the focus tuple).
     */
    public addLocation(location: Location): void {
      this.locations.add(location);
      location.setZone(this as unknown as SpatialZone);
    }

    /** Remove a location from this zone. Clears the back-reference. */
    public removeLocation(location: Location): boolean {
      const removed = this.locations.delete(location);
      if (removed && location.getZone() === (this as unknown as SpatialZone)) {
        location.setZone(null);
      }
      return removed;
    }

    /** Does this zone contain the given location? */
    public contains(location: Location): boolean {
      return this.locations.has(location);
    }

    /**
     * Refuse to destruct a zone that still holds rooms. The caller must
     * drain the member locations (destruct or relocate) first. Refusal is
     * bypassable via `StuffApi.forceDestruct` (admin-gated).
     *
     * @hook Invoked by `StuffApi.destruct` first, before `onDestruct`.
     *   **Veto** — return `{ ok: false, reason }` to refuse destruction
     *   (raises `DestructError`) or `{ ok: true }` to allow.
     *   `forceDestruct` still fires it (so observers run) but ignores the
     *   veto. There is no base declaration on `Stuff`; implement on any
     *   subclass that guards its own destruction — this declaration is
     *   the canonical contract for the optional hook.
     */
    public canDestruct(): VetoResult {
      if (this.locations.size > 0) {
        return {
          ok: false,
          reason:
            `cannot destruct zone '${(this as unknown as SpatialZone).getName()}' with ` +
            `${this.locations.size} live location(s); ` +
            `destruct locations first`,
        };
      }
      return { ok: true };
    }
  };
}
