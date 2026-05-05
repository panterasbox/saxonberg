/**
 * AroundSaveHookMixin — middleware-style save hook for PersistenceManager.
 *
 * Hooks compose this mixin to participate in `PM.save()` dispatch for a
 * specific collection. The chain is invoked with the operation context plus
 * a `next` callback; the hook decides when (or whether) to call `next` and
 * may transform the doc, short-circuit, or wrap the operation.
 *
 * Default `aroundSave` is pass-through — calls `next(doc)` unchanged.
 * Subclasses override to add validation, transformation, or side-effects.
 *
 * Hook implementations are `Idea` subclasses, instantiated as singletons
 * via the existing CMS template pattern (`StuffApi.clone()`), and registered
 * against PM at boot via `PM.loadHooks()`.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * Public shape added by AroundSaveHookMixin.
 */
export interface AroundSaveHook {
  aroundSave(
    collection: string,
    doc: Record<string, unknown>,
    next: (doc: Record<string, unknown>) => Promise<string>
  ): Promise<string>;
}

export function AroundSaveHookMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class AroundSaveHookMixin extends Base {
    static _mixinName = 'AroundSaveHookMixin';

    async aroundSave(
      _collection: string,
      doc: Record<string, unknown>,
      next: (doc: Record<string, unknown>) => Promise<string>
    ): Promise<string> {
      return next(doc);
    }
  };
}
