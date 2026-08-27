/**
 * Hydrator — minimal contract for translating a `domain` template's `data`
 * blob into live state on a freshly-constructed backing.
 *
 * Domain docs are `{ path, class, hydratorClass?, data }`. `class` names the
 * runtime backing. `hydratorClass` names a class implementing this interface
 * that knows how to apply `data` to a backing. When `hydratorClass` is
 * ABSENT, the clone pipeline runs no hydrator at all and `data` is ignored —
 * templates that want generic mixin-field copy must opt in by naming
 * `'/obj/persistence/PersistentHydrator'` (the standard implementation).
 *
 * Hydrators are STATELESS by contract — one instance per hydrator
 * class, reused across every backing it hydrates. The clone pipeline
 * resolves them via `StuffApi.singleton(hydratorClass)`, which lazily
 * clones the first time a backing needs one and caches via the
 * `byTemplatePath` index. Implementations don't mirror-compose the
 * backing's mixins; instead they introspect the backing directly.
 * That lets a single hydrator class serve multiple backing classes
 * (e.g. a `CreatureHydrator` usable by both a `Guard` and a
 * `GuardDog`), and lets `hydrate()` branch on the backing's runtime
 * class when needed.
 *
 * Concrete implementations extend `Idea` (and therefore `Stuff`) so
 * `StuffApi.clone` can produce them — see `PersistentHydrator` for
 * the standard implementation. Each hydrator class needs a Template
 * doc in `content` (the platform pack's `content/obj/persistence/`). A
 * hydrator's own Template names no `hydratorClass` of its own — that
 * terminates `clone()`'s hydrator-resolution recursion. Cycles
 * (a hydrator naming itself or another hydrator) are caught by the
 * cycle guard in `clone()` and surfaced as
 * `circular template dependency`.
 *
 * Bracket-assign IS the contract surface for the standard `PersistentHydrator`.
 * Its default copy uses `target[field] = data[field]`, which invokes setters
 * when present. That's the canonical entry point for bulk field population —
 * if a field has a shape invariant ("must be boolean", "lowercase / trim /
 * deduped"), put the rule on the field's setter and the hydrator path routes
 * through it for free. Don't add `normalize()`-style post-hydrate fixups for
 * per-field shape rules. Cross-field invariants ("if `A` then `B` must
 * satisfy …") are the legitimate case for a custom Hydrator implementation.
 *
 * The `Promise<void>` return type is mandatory so the clone pipeline can
 * `await` uniformly even when an implementation is synchronous.
 */

import type { Stuff } from './Stuff';

export interface Hydrator {
  hydrate(backing: Stuff, data: Record<string, unknown>): Promise<void>;
}
