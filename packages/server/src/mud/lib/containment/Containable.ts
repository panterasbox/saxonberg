/**
 * ContainableMixin - Adds environment reference (what contains this object)
 *
 * Provides:
 * - environment: any | null (reference to containing object/room)
 * - setEnvironment(container): void
 * - getEnvironment(): any | null
 *
 * Usage:
 * ```typescript
 * class MyClass extends ContainableMixin(BaseClass) {
 *   // ...
 * }
 * ```
 *
 * Persistence:
 * - NOT auto-persisted (complex type - reference)
 * - Must declare custom persistenceHandler in class
 */

import type { MixinConstructor } from '../mixin-types';

/**
 * Mixin that adds environment/containment properties and methods.
 */
export function ContainableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ContainableMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainableMixin';

    /**
     * Note: environment is a complex type (reference to another object).
     * It is NOT included in persistentFields - instead, classes using
     * this mixin must declare a custom persistenceHandler.
     */
    environment: any | null = null;

    /**
     * Set the environment (what contains this object).
     * @param container - The containing object, or null for no environment
     */
    setEnvironment(container: any | null): void {
      this.environment = container;
    }

    /**
     * Get the current environment.
     */
    getEnvironment(): any | null {
      return this.environment;
    }
  };
}
