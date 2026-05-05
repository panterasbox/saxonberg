/**
 * PostRegistrationMixin — opt-in lifecycle hook fired after `StuffApi`
 * registration.
 *
 * Spring `@PostConstruct` semantics: `postRegister(context?)` runs after
 * `StuffApi.register()` has slotted the instance into the registry, so any
 * resolver that walks the registry (e.g., a peer's exit referencing this
 * object) sees the in-flight instance. The clone pipeline awaits this
 * after the optional hydrate step; `StuffApi.create()` awaits it after
 * registration.
 *
 * The hook receives the caller-supplied `context` from
 * `StuffApi.clone(path, context)` / `StuffApi.create(factory, context)`.
 * Subclasses narrow `context` locally to their concrete type — see
 * `Avatar.AvatarInitContext` — rather than threading a generic through.
 *
 * Default `postRegister` is a no-op so subclasses can compose the mixin
 * without overriding when they don't need it (the mixin's role is then
 * just to mark the object as "supports the hook" for the runtime predicate
 * `MixinApi.isPostRegistration`).
 *
 * Replaces the previous `'initialize' in obj && typeof init === 'function'`
 * duck-typing check in StuffApi.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from './Stuff';

/**
 * Public shape added by PostRegistrationMixin.
 */
export interface PostRegistration {
  postRegister(context?: unknown): Promise<void> | void;
}

export function PostRegistrationMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PostRegistrationMixin extends Base {
    static _mixinName = 'PostRegistrationMixin';

    async postRegister(_context?: unknown): Promise<void> {
      // Default: no-op. Subclasses override with class-specific setup.
    }
  };
}
