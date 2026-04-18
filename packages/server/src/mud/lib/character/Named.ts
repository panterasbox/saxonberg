/**
 * NamedMixin - Adds name properties to a class
 *
 * Provides:
 * - firstName: string
 * - lastName: string
 * - fullName: string (computed getter)
 *
 * Usage:
 * ```typescript
 * class MyClass extends NamedMixin(BaseClass) {
 *   // ...
 * }
 * ```
 */

import type { MixinConstructor } from '../mixin-types';

/**
 * Mixin that adds name properties.
 */
/**
 * Public shape provided by NamedMixin.
 */
export interface Named {
  firstName: string;
  lastName: string;
  fullName: string;
}

export function NamedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class NamedMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'NamedMixin';

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['firstName', 'lastName'];

    firstName: string = '';
    lastName: string = '';

    /**
     * Get full name (computed from firstName and lastName).
     */
    get fullName(): string {
      if (this.firstName && this.lastName) {
        return `${this.firstName} ${this.lastName}`;
      } else if (this.firstName) {
        return this.firstName;
      } else if (this.lastName) {
        return this.lastName;
      } else {
        return 'Unnamed';
      }
    }
  };
}
