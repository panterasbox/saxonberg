/**
 * Hydrator — minimal contract for translating a `domain` template's `data`
 * blob into live state on a freshly-constructed backing.
 *
 * Domain docs are `{ path, class, hydratorClass?, data }`. `class` names the
 * runtime backing. `hydratorClass` names a class implementing this interface
 * that knows how to apply `data` to a backing. When `hydratorClass` is
 * ABSENT, the clone pipeline runs no hydrator at all and `data` is ignored —
 * templates that want generic mixin-field copy must opt in by naming
 * `'/lib/persistence/PersistentHydrator'` (the standard implementation).
 *
 * Hydrators are STATELESS by convention. One instance can (and should)
 * hydrate many backings. They don't mirror-compose the backing's mixins;
 * instead they introspect the backing directly. That lets a single hydrator
 * class serve multiple backing classes (e.g. a `CreatureHydrator` usable by
 * both a `Guard` and a `GuardDog`), and lets `hydrate()` branch on the
 * backing's runtime class when needed.
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
