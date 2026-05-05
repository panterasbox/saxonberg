/**
 * AroundDeleteHookMixin — middleware-style delete hook for PersistenceManager.
 *
 * Symmetric counterpart to `AroundSaveHookMixin`. Hooks compose this mixin
 * to participate in `PM.delete()` dispatch for a specific collection. The
 * chain receives the doc id plus a `next` callback; the hook decides when
 * (or whether) to call `next` and may short-circuit or wrap the operation.
 *
 * Default `aroundDelete` is pass-through — calls `next(id)` unchanged.
 * Subclasses override to add validation (e.g., reject deletes that would
 * orphan child records) or side-effects.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * Public shape added by AroundDeleteHookMixin.
 */
export interface AroundDeleteHook {
  aroundDelete(
    collection: string,
    id: string,
    next: (id: string) => Promise<void>
  ): Promise<void>;
}

export function AroundDeleteHookMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class AroundDeleteHookMixin extends Base {
    static _mixinName = 'AroundDeleteHookMixin';

    async aroundDelete(
      _collection: string,
      id: string,
      next: (id: string) => Promise<void>
    ): Promise<void> {
      return next(id);
    }
  };
}
