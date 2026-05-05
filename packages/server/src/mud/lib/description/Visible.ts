/**
 * VisibleMixin - Adds description properties for visible objects
 *
 * Provides:
 * - shortDescription: string (brief description)
 * - longDescription: string (detailed description)
 * - getShort(): string
 * - getLong(): string
 * - look command for examining objects
 *
 * Usage:
 * ```typescript
 * class MyClass extends VisibleMixin(BaseClass) {
 *   // ...
 * }
 * ```
 */

import type { MixinConstructor } from '../mixin';

/**
 * Mixin that adds description properties for visible objects.
 *
 * Provides the "look" command for examining this visible object:
 * - When in someone's environment (they can look at it in the room)
 * - When in someone's inventory (they can look at what they're carrying)
 * - When the looker is one of this object's peers (same environment)
 * - On self (you can look at yourself)
 */
/**
 * Public shape provided by VisibleMixin.
 */
export interface Visible {
  shortDescription: string;
  longDescription: string;
  getShort(): string;
  getLong(): string;
}

export function VisibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VisibleMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'VisibleMixin';

    /**
     * Command provider for visibility-related commands
     *
     * When an object is visible, others can "look" at it.
     */
    static commandProvider = {
      self: ['look.yaml'],        // Can look at yourself
      environment: ['look.yaml'], // Others can look at you in their environment
      inventory: ['look.yaml'],   // Others can look at you in their inventory
      peers: ['look.yaml'],       // Peers in the same environment can look at you
    };

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['shortDescription', 'longDescription'];

    shortDescription: string = '';
    longDescription: string = '';

    /**
     * Get the short description.
     */
    getShort(): string {
      return this.shortDescription || 'You see nothing special.';
    }

    /**
     * Get the long description.
     */
    getLong(): string {
      return this.longDescription || this.shortDescription || 'You see nothing special.';
    }
  };
}
