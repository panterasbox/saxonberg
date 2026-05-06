/**
 * PersistentHydrator — standard `Hydrator` implementation that copies every
 * `data` key matching a persistent field on the backing's constructor.
 *
 * For every field in the union of `static persistentFields` declarations
 * across the backing's mixin and class chain (collected via
 * `MixinApi.getAllPersistentFields`), if `data` carries a value for that
 * field, copy it onto the backing via `target[field] = data[field]`.
 * Bracket-assign invokes setters when present, so field-shape invariants
 * (declared on setters in the relevant mixin) fire automatically — see
 * `Hydrator.ts` for the contract.
 *
 * Templates opt in by naming `'/lib/persistence/PersistentHydrator'` as
 * their `hydratorClass`. Templates that omit `hydratorClass` skip
 * hydration entirely.
 *
 * Subclasses override `hydrate()` for cross-field or async logic; call
 * `super.hydrate()` first if the default field-copy should still run.
 */

import { MixinApi } from '../../api/mixin';
import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Hydrator } from '../stuff/Hydrator';

type Indexable = Record<string, unknown>;

/**
 * Extends `Idea` so the clone pipeline can produce a hydrator the
 * same way it produces every other templated Stuff. `clone()`
 * resolves `template.hydratorClass` via `StuffApi.singleton` — one
 * instance per hydrator class, reused across every backing it
 * hydrates (hydrators are stateless by contract; see `Hydrator.ts`).
 * No special-case `#resolveHydrator` path; HMR comes for free via
 * the standard clone integration.
 */
export class PersistentHydrator extends Idea implements Hydrator {
  /**
   * Canonical template path for templates that want generic mixin-field
   * copy. Use this constant at call sites (e.g.,
   * `TemplateApi.saveTemplate(path, cls, data, PersistentHydrator.templatePath)`)
   * instead of duplicating the string literal — this is the single source
   * of truth for "the standard hydrator's template path".
   */
  public static readonly templatePath = '/lib/persistence/PersistentHydrator';

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
