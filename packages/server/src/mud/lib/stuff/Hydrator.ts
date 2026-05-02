/**
 * Hydrator — stateless hydration strategy for `domain` templates.
 *
 * Domain docs are `{ path, class, hydratorClass?, data }`. `class` names the
 * runtime backing. `hydratorClass` names the strategy used to translate
 * the raw `data` blob into live state on a freshly-constructed backing
 * instance. When `hydratorClass` is ABSENT, the clone pipeline runs no
 * hydrator at all and `data` is ignored — templates that want generic
 * mixin-field copy must opt in by naming `'/lib/stuff/Hydrator'`.
 *
 * Default `hydrate()` copies every `data` key that matches a persistent
 * field on the backing's constructor (the union across every mixin and
 * concrete class in the chain, via `MixinApi.getAllPersistentFields`).
 *
 * Bracket-assign IS the contract surface. The default copy uses
 * `target[field] = data[field]`, which invokes setters when present. That's
 * the canonical entry point for bulk field population — if a field has a
 * shape invariant ("must be boolean", "must be lowercase / trimmed /
 * deduped"), put the rule on the field's setter and the hydrator path
 * routes through it for free. Don't add `normalize()`-style post-hydrate
 * fixups for per-field shape rules. Cross-field invariants (e.g., "if `A`
 * then `B` must satisfy …") are the legitimate case for a `Hydrator`
 * subclass.
 *
 * Hydrators are STATELESS. One instance can (and should) hydrate many
 * backings. They don't mirror-compose the backing's mixins; instead they
 * introspect the backing directly. That lets a single hydrator class serve
 * multiple backing classes (e.g. a `CreatureHydrator` usable by both a
 * `Guard` and a `GuardDog`), and lets `hydrate()` branch on the backing's
 * runtime class when needed.
 *
 * Subclasses override `hydrate()` for cross-field or async logic; call
 * `super.hydrate()` first if the default field-copy should still run. The
 * `Promise<void>` return type is mandatory for subclasses so the clone
 * pipeline can `await` uniformly.
 */

import { MixinApi } from '../../api/mixin';
import type { Stuff } from './Stuff';

type Indexable = Record<string, unknown>;

export class Hydrator {
  /**
   * Hydrate `backing` from a raw `data` blob.
   *
   * Default: for every persistent field on `backing.constructor`'s chain,
   * if `data` carries a value for that field, copy it onto the backing.
   * Keys in `data` not matching any persistent field are ignored — the
   * backing's mixin set is the source of truth for what gets hydrated.
   *
   * Subclasses override for custom logic; call `super.hydrate()` first if
   * the default field-copy should still run.
   */
  public async hydrate(
    backing: Stuff,
    data: Record<string, unknown>
  ): Promise<void> {
    const fields = MixinApi.getAllPersistentFields(
      backing.constructor as new (...args: unknown[]) => Stuff
    );
    const target = backing as unknown as Indexable;
    for (const field of fields) {
      if (field in data) target[field] = data[field];
    }
  }
}
