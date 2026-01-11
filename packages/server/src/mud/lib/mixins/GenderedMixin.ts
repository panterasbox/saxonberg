/**
 * GenderedMixin - Adds pronoun properties to a class
 *
 * Provides:
 * - pronouns: Pronouns (he/she/they/it/ze)
 *
 * Usage:
 * ```typescript
 * class MyClass extends GenderedMixin(BaseClass) {
 *   // ...
 * }
 * ```
 */

import { Pronouns } from '@saxonberg/types';
import type { MixinConstructor } from './types.js';

/**
 * Mixin that adds pronoun properties.
 */
export function GenderedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class GenderedMixin extends Base {
    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['pronouns'];

    pronouns: Pronouns = Pronouns.They;
  };
}
