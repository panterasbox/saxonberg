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
import type { MixinConstructor } from '../mixin-types';

/**
 * Mixin that adds pronoun properties.
 */
/**
 * Public shape provided by GenderedMixin.
 */
export interface Gendered {
  pronouns: Pronouns;
}

export function GenderedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class GenderedMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'GenderedMixin';

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static persistentFields = ['pronouns'];

    pronouns: Pronouns = Pronouns.They;
  };
}
