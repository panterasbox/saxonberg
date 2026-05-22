/**
 * PersistentHydrator — standard `Hydrator` implementation with two-phase
 * method-first dispatch.
 *
 * **Phase 1 — property fields.** For each entry in
 * `MixinApi.getAllPersistentFields(backing.constructor)`, if `data`
 * carries a value, prefer `await target.set<PascalCase(field)>(value)`
 * when that method exists, otherwise fall back to
 * `target[field] = value`. Bracket-assign invokes the accessor pair
 * when one is defined on the prototype, so field-shape invariants
 * declared on setters still fire on the fallback path.
 *
 * **Phase 2 — instruction fields.** For each entry in
 * `MixinApi.getAllInstructionFields(backing.constructor)`, if `data`
 * carries a value, call `await target.apply<PascalCase(field)>(value)`.
 * The applier is **required** — absence of `applyX` is a configuration
 * bug, not a silent skip. The two phases run sequentially so all
 * property fields settle before any instruction is applied.
 *
 * Marshalled fields keep their existing path: the marshaller produces
 * the runtime value first, then the same method-first/bracket-fallback
 * dispatch applies.
 *
 * Templates opt in by naming `'/lib/persistence/PersistentHydrator'` as
 * their `hydratorClass`. Templates that omit `hydratorClass` skip
 * hydration entirely.
 *
 * Subclasses override `hydrate()` for cross-field or async logic; call
 * `super.hydrate()` first if the default two-phase dispatch should
 * still run.
 */

import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { Idea } from '../stuff/Idea';
import type { Stuff } from '../stuff/Stuff';
import type { Hydrator } from '../stuff/Hydrator';
import type { Marshaller } from './Marshaller';

type Indexable = Record<string, unknown>;

function pascalCase(field: string): string {
  return field.length === 0
    ? field
    : field[0]!.toUpperCase() + field.slice(1);
}

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
    const constructor = backing.constructor as new (...args: unknown[]) => Stuff;
    const persistentFields = MixinApi.getAllPersistentFields(constructor);
    const instructionFields = MixinApi.getAllInstructionFields(constructor);
    const marshallerPaths = MixinApi.getAllFieldMarshallers(constructor);
    const target = backing as unknown as Indexable;

    // Phase 1 — property fields. Method-first dispatch with bracket-
    // assign fallback. All property fields settle before any
    // instruction is applied.
    for (const field of persistentFields) {
      if (!(field in data)) continue;
      const raw = data[field];
      const path = marshallerPaths[field];
      let value: unknown;
      if (path) {
        // Lazy resolution: `singleton(path)` returns the cached
        // marshaller if one exists, else clones from the seeded
        // template. Mirrors how `StuffApi.clone` resolves
        // `hydratorClass`. Tests bypass Mongo so they pre-register
        // marshallers up-front (see
        // `__tests__/quantity-marshaller-test-helpers.ts`); in
        // production the seeder put the template doc in `domain`
        // at boot, and singleton clones on first need.
        const marshaller = await StuffApi.singleton<
          Marshaller<unknown, unknown>
        >(path);
        value = marshaller.fromStored(raw);
      } else {
        value = raw;
      }
      const setterName = 'set' + pascalCase(field);
      const setter = target[setterName];
      if (typeof setter === 'function') {
        // Async-safe: `await` of a non-Promise resolves to the value,
        // so synchronous setters behave identically to the previous
        // bracket-assign path. Asynchronous setters that touch other
        // Stuff via `StuffApi.singleton` (e.g., `setAttachedHosts`)
        // now complete their side effects before the next field is
        // processed.
        await (setter as (v: unknown) => unknown | Promise<unknown>).call(
          target,
          value
        );
      } else {
        // Fallback: dumb bracket-assign. An accessor pair on the
        // prototype still fires (Pattern D); a plain public field
        // just receives the value.
        target[field] = value;
      }
    }

    // Phase 2 — instruction fields. Required applier dispatch. Absence
    // of `applyX` for a declared instruction field is a configuration
    // bug — surface it loudly.
    for (const field of instructionFields) {
      if (!(field in data)) continue;
      const value = data[field];
      const applierName = 'apply' + pascalCase(field);
      const applier = target[applierName];
      if (typeof applier !== 'function') {
        throw new Error(
          `PersistentHydrator: instruction field '${field}' on ` +
            `${constructor.name} declares no '${applierName}' method. ` +
            `Instruction fields must provide an applier; either add ` +
            `'${applierName}' or move the field to 'persistentFields'.`
        );
      }
      await (applier as (v: unknown) => unknown | Promise<unknown>).call(
        target,
        value
      );
    }
  }
}
