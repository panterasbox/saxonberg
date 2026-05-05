/**
 * Zone - Abstract first-class subdivision of the MUD domain.
 *
 * A Zone is a continuous region containing rooms. Two concrete subtypes
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
import type { Exit } from './Exit';

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
  public name: string = '';

  /**
   * Rooms that live in this zone. Populated by the subclass's `addRoom()`.
   *
   * Membership is maintained by the Zone; `Location.zone` (on Stuff base)
   * is the back-reference stamped when the room is added.
   */
  public rooms: Set<Location> = new Set();

  /**
   * Mark a room as belonging to this zone.
   * Subclasses may extend to capture coordinates (CartesianZone stamps grid
   * position, SphericalZone stamps focus tuple).
   */
  public addRoom(room: Location): void {
    this.rooms.add(room);
    room.zone = this;
  }

  /**
   * Remove a room from this zone. Clears the back-reference.
   */
  public removeRoom(room: Location): boolean {
    const removed = this.rooms.delete(room);
    if (removed && room.zone === this) {
      room.zone = null;
    }
    return removed;
  }

  /**
   * Does this zone contain the given room?
   */
  public contains(room: Location): boolean {
    return this.rooms.has(room);
  }

  /**
   * Zone-derived exit lookup. Called by `ExitableMixin.getExit()` when no
   * explicit exit covers the direction.
   *
   * - CartesianZone: synthesize a grid-adjacent Exit (lazy + cached).
   * - SphericalZone: always `undefined` (spherical space has no implicit
   *   adjacency).
   *
   * @param from - The exitable source room performing the lookup.
   * @param direction - Normalized direction string (see `NavigationApi`).
   */
  public abstract deriveExit(from: Location, direction: string): Exit | undefined;

  /**
   * Refuse to destruct a non-empty Zone. Caller must drain the rooms
   * (destruct or relocate) before destructing the Zone itself.
   * Subclasses may extend (e.g. `CartesianZone` clears its derived-exit
   * cache on top of this).
   */
  public prepareDestroy(): void {
    if (this.rooms.size > 0) {
      throw new Error(
        `Zone.prepareDestroy: cannot destruct zone '${this.name}' with ` +
          `${this.rooms.size} live room(s); destruct rooms first.`
      );
    }
  }
}
