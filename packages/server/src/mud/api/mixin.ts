/**
 * MixinApi - Static utility class for mixin management
 *
 * Responsibilities:
 * - Query mixins applied to a class
 * - Collect persistent fields from all mixins
 * - Mixin registration and introspection
 *
 * This enables the Persistence Framework to automatically collect
 * persistent fields from all mixins in a class hierarchy.
 *
 * Usage:
 * ```typescript
 * import { Mixins } from '../lib/mixin-types';
 *
 * if (MixinApi.hasMixin(Player, Mixins.Named)) {
 *   // Player has NamedMixin
 * }
 * ```
 */

import type { MixinConstructor, MixinName } from '../lib/mixin-types';
import type { Stuff } from '../lib/stuff/Stuff';

// Re-export Mixins constants for convenience
export { Mixins } from '../lib/mixin-types';

/**
 * Static API for mixin management and introspection.
 */
export class MixinApi {
  /**
   * Get all mixins applied to a class by walking the prototype chain.
   * Returns an array of constructor functions.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of mixin constructors
   */
  public static queryMixins(constructor: any): any[] {
    const mixins: any[] = [];
    let current = constructor;

    // Walk up the prototype chain
    while (current && current !== Object && current.prototype) {
      // Check if this level is a mixin (has _mixinName marker)
      if (current.hasOwnProperty('_mixinName') && typeof current._mixinName === 'string') {
        mixins.push(current);
      }

      current = Object.getPrototypeOf(current);
    }

    return mixins;
  }

  /**
   * Get all persistent fields from mixins applied to a class.
   * Walks the prototype chain collecting fields from all mixins.
   *
   * This is used by PersistApi to automatically sync fields without
   * requiring manual field lists in every class.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of persistent field names
   */
  public static getMixinFields(constructor: any): string[] {
    const mixins = this.queryMixins(constructor);
    const fields: string[] = [];

    for (const mixin of mixins) {
      if (mixin.persistentFields && Array.isArray(mixin.persistentFields)) {
        fields.push(...mixin.persistentFields);
      }
    }

    // Remove duplicates
    return Array.from(new Set(fields));
  }

  /**
   * Check if a class uses a specific mixin.
   *
   * Usage:
   * ```typescript
   * import { Mixins } from './mixin';
   *
   * if (MixinApi.hasMixin(Player, Mixins.Named)) {
   *   // Player has NamedMixin
   * }
   * ```
   *
   * @param constructor - The class constructor to check
   * @param mixinName - The name of the mixin to look for (use Mixins constants)
   * @returns True if the mixin is applied
   */
  public static hasMixin(constructor: any, mixinName: MixinName): boolean {
    const mixins = this.queryMixins(constructor);
    return mixins.some((mixin) => {
      // Check _mixinName property first (preferred), then fall back to name property
      const name = mixin._mixinName || mixin.name;
      return name === mixinName;
    });
  }

  /**
   * Get all persistent fields (both from mixins and class itself).
   * Combines mixin fields with class-declared fields.
   *
   * @param constructor - The class constructor to inspect
   * @returns Array of all persistent field names
   */
  public static getAllPersistentFields(constructor: any): string[] {
    // Get fields from mixins
    const mixinFields = this.getMixinFields(constructor);

    // Get fields from the class itself
    const ownFields =
      constructor.persistentFields && Array.isArray(constructor.persistentFields)
        ? constructor.persistentFields
        : [];

    // Combine and remove duplicates
    return Array.from(new Set([...mixinFields, ...ownFields]));
  }

}

