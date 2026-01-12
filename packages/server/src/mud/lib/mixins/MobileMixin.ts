/**
 * MobileMixin - Adds movement capability with hook execution
 *
 * Provides:
 * - move(destination: Location): void - Move to new location with full hook execution
 *
 * Usage:
 * ```typescript
 * class Avatar extends MobileMixin(SomeBase) {
 *   // ...
 * }
 *
 * avatar.move(targetLocation); // Proper movement with hooks
 * ```
 *
 * The move() method handles:
 * - Removing from current location
 * - Adding to new location
 * - Updating environment reference
 * - Future: beforeLeave, beforeEnter, afterLeave, afterEnter events
 *
 * This is preferred over manual setEnvironment() calls because it ensures
 * proper hook execution and maintains consistency.
 */

import type { MixinConstructor } from './types.js';
import type { Location } from '../location/Location.js';
import type { Stuff } from '../stuff/Stuff.js';

/**
 * Mixin that adds movement capability with proper hook execution.
 */
export function MobileMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class MobileMixin extends Base {
    /**
     * Move this object to a new location with full hook execution.
     *
     * This method handles:
     * 1. Removing from current location (if any)
     * 2. Adding to destination location
     * 3. Updating environment reference
     * 4. Future: Event hooks (beforeLeave, beforeEnter, afterLeave, afterEnter)
     *
     * This is the preferred method for movement as it ensures proper
     * hook execution and maintains consistency.
     *
     * @param destination - Target location to move to
     */
    move(destination: Location): void {
      // Get current location (if any)
      // Check if this object has getEnvironment() method (from ContainableMixin)
      const currentLocation =
        'getEnvironment' in this ? (this as any).getEnvironment() : null;

      // Execute departure hooks (future: beforeLeave events)
      if (currentLocation) {
        currentLocation.removeFromInventory(this as unknown as Stuff);
      }

      // Execute arrival hooks (future: beforeEnter events)
      destination.addToInventory(this as unknown as Stuff);

      // Update environment reference (requires setEnvironment from ContainableMixin)
      if ('setEnvironment' in this) {
        (this as any).setEnvironment(destination);
      }

      // Execute post-movement hooks (future: afterEnter/afterLeave events)
    }
  };
}
