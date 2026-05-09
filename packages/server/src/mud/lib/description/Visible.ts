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
import type { CommandContributions } from '../../api/command';

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
  getShortDescription(): string;
  setShortDescription(value: string): void;
  getLongDescription(): string;
  setLongDescription(value: string): void;
  getShort(): string;
  getLong(): string;
}

export function VisibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VisibleMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'VisibleMixin';

    /**
     * Command provider for visibility-related commands.
     *
     * Visible is "I can be seen" — so the contributions surface
     * `look` on the buckets that mean "someone else has me in
     * scope" (environment / inventory / peers). The actor-side
     * contribution (`self`) lives on `PerceiverMixin`, which owns
     * the "I can issue perception verbs" role. Splitting the two
     * keeps Visible from claiming behaviour that's really the
     * perceiver's.
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: ['look.yaml'], // Others can look at you in their environment
      inventory: ['look.yaml'],   // Others can look at you in their inventory
      peers: ['look.yaml'],       // Peers in the same environment can look at you
    };

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['shortDescription', 'longDescription'];

    protected shortDescription: string = '';
    protected longDescription: string = '';

    getShortDescription(): string {
      return this.shortDescription;
    }

    setShortDescription(value: string): void {
      this.shortDescription = value;
    }

    getLongDescription(): string {
      return this.longDescription;
    }

    setLongDescription(value: string): void {
      this.longDescription = value;
    }

    /**
     * Get the short description with fallback.
     */
    getShort(): string {
      return this.shortDescription || 'You see nothing special.';
    }

    /**
     * Get the long description with fallback to short, then default.
     */
    getLong(): string {
      return this.longDescription || this.shortDescription || 'You see nothing special.';
    }
  };
}
