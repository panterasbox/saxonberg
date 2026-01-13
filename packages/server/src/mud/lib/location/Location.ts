/**
 * Location - Represents a room or spatial area in the game world
 *
 * Composition: ContainerMixin(VisibleMixin(Stuff))
 *
 * Provides:
 * - name: string - Location name (e.g., "The Void")
 * - description: string - Full room description
 * - inventory: Set<Stuff> - Objects in this location (from ContainerMixin)
 * - shortDescription, longDescription - Visual descriptions (from VisibleMixin)
 *
 * Methods:
 * - getContents(): Stuff[] - Returns all objects in location
 * - addToInventory(item) - Add object to location
 * - removeFromInventory(item) - Remove object from location
 *
 * Usage:
 * ```typescript
 * const room = new Location();
 * room.name = "The Void";
 * room.description = "You find yourself in a featureless void.";
 *
 * // Add avatar to room (low-level)
 * room.addToInventory(avatar);
 * avatar.setEnvironment(room);
 *
 * // OR use MobileMixin (preferred - handles hooks)
 * avatar.move(room);
 * ```
 *
 * Note: Object filtering and querying should be handled by API layer utilities,
 * not Location methods.
 */

import { Stuff } from '../stuff/Stuff';
import { VisibleMixin } from '../mixins/VisibleMixin';
import { ContainerMixin } from '../mixins/ContainerMixin';

// Compose Location base class with mixins
const LocationBase = ContainerMixin(VisibleMixin(Stuff));

/**
 * Location class - represents a room or spatial area.
 */
export class Location extends LocationBase {
  /**
   * Persistent fields for this class.
   * Combined with mixin persistentFields for full field list.
   */
  static persistentFields = ['name', 'description'];

  /**
   * Location name (e.g., "The Void", "Grand Hall")
   */
  name: string = '';

  /**
   * Full room description shown when player looks.
   */
  description: string = '';

  /**
   * Get all objects currently in this location.
   * Convenience method that wraps getInventoryContents().
   *
   * @returns Array of Stuff objects in this location
   */
  getContents(): Stuff[] {
    return this.getInventoryContents();
  }
}
