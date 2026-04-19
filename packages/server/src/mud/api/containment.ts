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
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

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
   */
  public static move(item: ContainableStuff, to: ContainerStuff): void {
    // Future: Execute beforeMove hooks

    const from = item.getEnvironment();
    if (from) {
      from.removeFromInventory(item);
    }

    to.addToInventory(item);
    item.setEnvironment(to);

    // Future: Execute afterMove hooks
  }

  /**
   * Check if an object is contained in a specific container
   */
  public static isContainedIn(item: Stuff, container: ContainerStuff): boolean {
    return container.getContents().some((obj) => obj.stuffId === item.stuffId);
  }

  /**
   * Get the container that holds an item
   */
  public static getContainer(item: ContainableStuff): ContainerStuff | null {
    return item.getEnvironment();
  }

  /**
   * Get contents from a container object
   *
   * Usage:
   * ```typescript
   * const inventory = ContainmentApi.getContents(avatar);
   * const roomContents = ContainmentApi.getContents(location);
   * ```
   */
  public static getContents(container: ContainerStuff): ContainableStuff[] {
    return container.getContents();
  }
}
