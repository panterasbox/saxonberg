/**
 * ContainmentApi - Manages containment relationships and object movement
 *
 * Responsibilities:
 * - move() - Mid-level function for moving ANY containable object between containers
 * - Hook execution for movement events (future)
 * - Proper cleanup of containment relationships
 *
 * This is the correct abstraction layer for object movement. Higher-level traverse()
 * and teleport() live in MobileMixin for creatures/vehicles. Lower-level
 * setEnvironment()/addToInventory()
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
import { MixinApi } from './mixin';

type ContainerStuff = Stuff & Container;
type ContainableStuff = Stuff & Containable;

/**
 * Programmatic-contract violation thrown by `ContainmentApi.move()`.
 *
 * These are NOT user-input failures — user-facing commands (`go`, `get`,
 * `drop`) should validate and produce friendly messages before calling
 * `move()`. `ContainmentError` exists to catch seeder/test/scripted bugs.
 */
export class ContainmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainmentError';
  }
}

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
   * Invariants enforced (Phase 7):
   *   1. Exitables may only be contained by Exitables (closes the "pick up
   *      a chest with someone inside" exploit — Avatars aren't Exitable).
   *   2. Exitables cannot cross zones via containment — the only legitimate
   *      cross-zone traversal is an explicit inter-zone Exit.
   *   3. Runtime-fallback zone stamp — `item.zone` is set to `to.zone` on
   *      first placement when both sides agree (harmless when already
   *      stamped at clone-time).
   *
   * Lower-level methods (setEnvironment, addToInventory) should NEVER
   * be called directly - always use this method.
   *
   * @throws ContainmentError on invariant violations.
   */
  public static move(item: ContainableStuff, to: ContainerStuff): void {
    // PRE-FLIGHT (1): Exitables may only land in Exitables.
    if (MixinApi.isExitable(item) && !MixinApi.isExitable(to)) {
      throw new ContainmentError(
        'Exitables can only be placed inside other exitables.'
      );
    }

    // PRE-FLIGHT (2): Exitables cannot cross zones via containment. An
    // Exitable whose zone has not yet been stamped (null) is allowed — first
    // placement will stamp it below.
    if (MixinApi.isExitable(item) && item.zone && item.zone !== to.zone) {
      throw new ContainmentError(
        'Cannot move an exitable into a different zone.'
      );
    }

    // Future: Execute beforeMove hooks

    const from = item.getEnvironment();
    if (from) {
      from.removeFromInventory(item);
    }

    to.addToInventory(item);
    item.setEnvironment(to);

    // POST-WRITE (3): Runtime-fallback zone stamp. Idempotent; applies to
    // any Stuff, not just Exitables (crafted items, admin spawns, etc.).
    if (item.zone === null && to.zone !== null) {
      item.zone = to.zone;
    }

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
