/**
 * Zone - Abstract first-class subdivision of the MUD domain.
 *
 * A Zone is a continuous region containing locations. Two concrete subtypes
 * today: `CartesianZone` (same-size grid cells with derived cardinal exits)
 * and `SphericalZone` (spheres-with-radius, explicit semantic exits only).
 * Future subtypes can layer in new coordinate semantics without changing the
 * containment or messaging layers.
 *
 * Zones are stored as CMS templates in the `domain` collection. Every Stuff
 * carries a `zone: Zone | null` reference (on the Stuff base class) — see
 * the Phase 7 plan for how zones are derived from template paths and
 * stamped on first placement.
 */

import { Idea } from '../stuff/Idea';
import type { Location } from '../stuff/Location';
import type { Exit } from '../boundary/Exit';

/**
 * Abstract base for all Zone subtypes.
 *
 * Subclasses implement `deriveExit()` — CartesianZone computes grid-adjacent
 * exits on demand; SphericalZone always returns `undefined` (spherical space
 * has no implicit adjacency, exits are authored by hand).
 */
export abstract class Zone extends Idea {
  /**
   * Human-readable zone name ("Narnia Castle", "The Caves", …).
   */
  protected name: string = '';

  public getName(): string { return this.name; }
  public setName(value: string): void { this.name = value; }

  /**
   * Locations that live in this zone. Populated by the subclass's
   * `addLocation()`. Host-internal storage; external callers go
   * through `getLocations()` / `contains()`.
   *
   * Membership is maintained by the Zone; `Location.zone` (on Stuff base)
   * is the back-reference stamped when the location is added.
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
   * Refuse to destruct a non-empty Zone. Caller must drain the member
   * locations (destruct or relocate) before destructing the Zone itself.
   * Subclasses may extend (e.g. `CartesianZone` clears its derived-exit
   * cache on top of this).
   */
  protected override prepareDestroy(): void {
    if (this.locations.size > 0) {
      throw new Error(
        `Zone.prepareDestroy: cannot destruct zone '${this.name}' with ` +
          `${this.locations.size} live location(s); destruct locations first.`
      );
    }
  }
}
