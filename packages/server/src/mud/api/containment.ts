/**
 * ContainmentApi - Manages containment relationships and object movement
 *
 * Responsibilities:
 * - move() - Mid-level function for moving ANY containable object between containers
 * - Hook execution for movement events (future)
 * - Proper cleanup of containment relationships
 *
 * This is the correct abstraction layer for object movement. Higher-level travel()
 * is in MobileMixin for creatures/vehicles. Lower-level setEnvironment()/addToInventory()
 * should ONLY be called from this API.
 *
 * Usage:
 * ```typescript
 * // Move any object to a container
 * // Automatically removes from current location (determined from item's environment)
 * ContainmentApi.move(sword, avatar);
 * ContainmentApi.move(player, newRoom);
 * ```
 */

import type { Stuff } from '../lib/stuff/Stuff';
import { MixinApi, Mixins } from './mixin';

/**
 * Static API for containment and movement operations
 */
export class ContainmentApi {
  /**
   * Move an object from one container to another.
   *
   * This is the ONLY correct way to move objects between containers.
   * Handles all containment logic:
   * - Removes from current container (determined from item's environment)
   * - Adds to destination container
   * - Updates item's environment reference
   * - Executes movement hooks (future: beforeMove, afterMove)
   *
   * Lower-level methods (setEnvironment, addToInventory) should NEVER
   * be called directly - always use this method.
   *
   * @param item - Object to move (must have ContainableMixin)
   * @param to - Destination container (must have ContainerMixin)
   * @returns true if successful, false if mixin checks fail
   */
  public static move(item: Stuff, to: Stuff): boolean {
    if (!item || !to) return false;

    // Verify item has ContainableMixin
    if (!MixinApi.hasMixin(item.constructor, Mixins.Containable)) {
      console.warn('ContainmentApi.move: item does not have ContainableMixin');
      return false;
    }

    // Verify destination has ContainerMixin
    if (!MixinApi.hasMixin(to.constructor, Mixins.Container)) {
      console.warn('ContainmentApi.move: destination does not have ContainerMixin');
      return false;
    }

    // Future: Execute beforeMove hooks

    // Get current container from item's environment
    const from = (item as any).getEnvironment?.();

    // Remove from source container (if present)
    if (from) {
      if (MixinApi.hasMixin(from.constructor, Mixins.Container)) {
        (from as any).removeFromInventory(item);
      }
    }

    // Add to destination container
    (to as any).addToInventory(item);

    // Update item's environment reference
    (item as any).setEnvironment(to);

    // Future: Execute afterMove hooks

    return true;
  }

  /**
   * Check if an object is contained in a specific container
   *
   * @param item - Object to check
   * @param container - Container to check in
   * @returns true if item is in container
   */
  public static isContainedIn(item: Stuff, container: Stuff): boolean {
    if (!item || !container) return false;

    if (!MixinApi.hasMixin(container.constructor, Mixins.Container)) {
      return false;
    }

    const contents = (container as any).getContents();
    return contents.some((obj: Stuff) => obj.stuffId === item.stuffId);
  }

  /**
   * Get the container that holds an item
   *
   * @param item - Object to check
   * @returns Container holding the item, or null
   */
  public static getContainer(item: Stuff): Stuff | null {
    if (!item) return null;

    if (!MixinApi.hasMixin(item.constructor, Mixins.Containable)) {
      return null;
    }

    return (item as any).getEnvironment();
  }

  /**
   * Get contents from a container object (if it has ContainerMixin)
   *
   * Convenience helper that checks for ContainerMixin and returns contents,
   * or an empty array if the object is not a container.
   *
   * Usage:
   * ```typescript
   * const inventory = ContainmentApi.getContents(avatar);
   * const roomContents = ContainmentApi.getContents(location);
   * ```
   *
   * @param container - Object to get contents from
   * @returns Array of contained objects, or empty array
   */
  public static getContents(container: Stuff): Stuff[] {
    if (!container) return [];

    if (!MixinApi.hasMixin(container.constructor, Mixins.Container)) {
      return [];
    }

    return (container as any).getContents();
  }
}
