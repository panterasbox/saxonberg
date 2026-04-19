/**
 * ContainableMixin - Adds environment reference (what contains this object)
 *
 * Provides:
 * - environment: (Stuff & Container) | null (containing object/room)
 * - setEnvironment(container): void
 * - getEnvironment(): (Stuff & Container) | null
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
import type { Stuff } from '../stuff/Stuff';
import type { Container } from './Container';

/**
 * Mixin that adds environment/containment properties and methods.
 */
/**
 * Public shape provided by ContainableMixin.
 */
export interface Containable {
  environment: (Stuff & Container) | null;
  setEnvironment(container: (Stuff & Container) | null): void;
  getEnvironment(): (Stuff & Container) | null;
}

export function ContainableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ContainableMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'ContainableMixin';

    /**
     * Note: environment is a complex type (reference to another object).
     * It is NOT included in persistentFields - instead, classes using
     * this mixin must declare a custom persistenceHandler.
     */
    environment: (Stuff & Container) | null = null;

    /**
     * Set the environment (what contains this object).
     * @param container - The containing object, or null for no environment
     */
    setEnvironment(container: (Stuff & Container) | null): void {
      this.environment = container;
    }

    /**
     * Get the current environment.
     */
    getEnvironment(): (Stuff & Container) | null {
      return this.environment;
    }
  };
}
