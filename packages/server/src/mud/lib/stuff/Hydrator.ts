/**
 * Hydrator — stateless hydration strategy for `domain` templates.
 *
 * Domain docs are `{ path, class, hydratorClass?, data }`. `class` names the
 * runtime backing. `hydratorClass` names the strategy used to translate
 * the raw `data` blob into live state on a freshly-constructed backing
 * instance. If absent, this base `Hydrator` is used — its default
 * `hydrate()` copies every `data` key that matches a persistent field on
 * the backing's constructor (the union across every mixin and concrete
 * class in the chain, via `MixinApi.getAllPersistentFields`).
 *
 * Hydrators are STATELESS. One instance can (and should) hydrate many
 * backings. They don't mirror-compose the backing's mixins; instead they
 * introspect the backing directly. That lets a single hydrator class serve
 * multiple backing classes (e.g. a `CreatureHydrator` usable by both a
 * `Guard` and a `GuardDog`), and lets `hydrate()` branch on the backing's
 * runtime class when needed.
 *
 * Subclasses override `hydrate()` for class-specific logic — async joins
 * (`AvatarHydrator` loading Player + CharacterSheet), field normalization,
 * or runtime-class dispatch. The `Promise<void>` return type is mandatory
 * for subclasses so the clone pipeline can `await` uniformly.
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
