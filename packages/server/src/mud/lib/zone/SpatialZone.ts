/**
 * SpatialZone — abstract intermediate layering location-aware behavior on Zone.
 *
 * The bare `Zone` is a scope/folder unit (templates use Zone-class folders to
 * carry policy that descendants inherit). `SpatialZone` adds the topographical
 * surface: a Set of member Locations, the location/zone back-reference dance,
 * and the `deriveExit` polymorphism point used by `ExitableMixin`.
 *
 * `CartesianZone` and `SphericalZone` extend this — not `Zone` directly.
 *
 * Non-spatial Zone subclasses (`Clade`, future permission-grouping zones,
 * future runtime-rule scopes) extend bare `Zone`. They reuse the
 * folder-of-templates contract without inheriting location-aware behavior.
 */
import { Zone } from './Zone';
import type Location from '../stuff/Location';
import type Exit from '../boundary/Exit';
import type { VetoResult } from '../errors';

/**
 * Abstract base for all topographical Zone subtypes.
 *
 * Subclasses implement `deriveExit()` — CartesianZone computes grid-adjacent
 * exits on demand; SphericalZone always returns `undefined` (spherical space
 * has no implicit adjacency, exits are authored by hand).
 */
export abstract class SpatialZone extends Zone {
  /**
   * Locations that live in this zone. Populated by the subclass's
   * `addLocation()`. Host-internal storage; external callers go
   * through `getLocations()` / `contains()`.
   *
   * Membership is maintained by the SpatialZone; `Location.zone` (on the
   * Stuff base) is the back-reference stamped when the location is added.
   */
  protected locations: Set<Location> = new Set();

  public getLocations(): ReadonlySet<Location> { return this.locations; }

  /**
   * Mark a location as belonging to this zone.
   * Subclasses may extend to capture coordinates (CartesianZone stamps grid
   * position, SphericalZone stamps focus tuple).
   */
  public addLocation(location: Location): void {
    this.locations.add(location);
    location.setZone(this);
  }

  /**
   * Remove a location from this zone. Clears the back-reference.
   */
  public removeLocation(location: Location): boolean {
    const removed = this.locations.delete(location);
    if (removed && location.getZone() === this) {
      location.setZone(null);
    }
    return removed;
  }

  /**
   * Does this zone contain the given location?
   */
  public contains(location: Location): boolean {
    return this.locations.has(location);
  }

  /**
   * Zone-derived exit lookup. Called by `ExitableMixin.getExit()` when no
   * explicit exit covers the direction.
   *
   * - CartesianZone: synthesize a grid-adjacent Exit (lazy + cached).
   * - SphericalZone: always `undefined` (spherical space has no implicit
   *   adjacency).
   *
   * @param from - The exitable source location performing the lookup.
   * @param direction - Normalized direction string (see `NavigationApi`).
   */
  public abstract deriveExit(from: Location, direction: string): Exit | undefined;

  /**
   * Does this Zone synthesize cardinal-derived exits from grid
   * adjacency? CartesianZone overrides to return `true`; the
   * default is `false`. `ExitableMixin.getObviousExits` uses this
   * to skip the cardinal-iteration loop on zones that don't have
   * adjacency-derived exits.
   *
   * This is a behavioural query (yes/no about how the zone routes
   * exits), not a Cartesian-specific value extraction. `cellSize`
   * lives on `CartesianZone` because it's meaningless on
   * non-Cartesian zones; the Cartesian-shaped Location reaches
   * into its zone for that value via cast-by-invariant.
   */
  public hasDerivedAdjacency(): boolean {
    return false;
  }

  /**
   * Refuse to destruct a non-empty SpatialZone. Caller must drain the
   * member locations (destruct or relocate) before destructing the
   * zone itself. Refusal is bypassable via `StuffApi.forceDestruct`
   * (admin-gated).
   *
   * Witness shape: `canDestruct` returns `VetoResult` per the
   * destruct hook contract in `StuffApi.destruct`.
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
          `cannot destruct zone '${this.getName()}' with ` +
          `${this.locations.size} live location(s); ` +
          `destruct locations first`,
      };
    }
    return { ok: true };
  }
}
