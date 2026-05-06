/**
 * SingletonMixin — class-level marker enforcing one-instance-per-templatePath.
 *
 * Composing this mixin declares: "every templatePath that resolves to this
 * class produces at most one live instance at a time." Enforcement fires in
 * `StuffApi.clone()` as a pre-flight check: if a live instance already exists
 * for the requested templatePath and the resolved class composes
 * `SingletonMixin`, the second clone throws before construction starts.
 *
 * Independent of `StuffApi.singleton(path)`. The Api method is the
 * cache-or-clone tool (works on any class); this mixin is the safety net
 * that prevents direct `clone()` from producing duplicates for classes that
 * shouldn't have any.
 *
 * Use cases:
 *   - Zones (each zone template is a unique world entity).
 *   - Content-author leaves that should be unique-by-path (e.g., a singleton
 *     `TownSquare extends CartesianLocation`).
 *
 * Pure marker: no fields, no methods, no `persistentFields`. The
 * `_mixinName` is what `MixinApi.hasMixin` matches against.
 */

import type { MixinConstructor } from '../mixin';

export interface Singleton {
  // Marker interface — no surface. Composition is detected via
  // `MixinApi.isSingleton` / `MixinApi.hasMixin(cls, Mixins.Singleton)`.
}

export function SingletonMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SingletonMixin extends Base {
    static _mixinName = 'SingletonMixin';
  };
}
