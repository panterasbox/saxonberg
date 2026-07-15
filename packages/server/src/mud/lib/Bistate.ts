/**
 * BistateMixin — the shared guarded-boolean substrate under the toggle
 * mixins (`Sealable` open/closed, `Switchable` on/off, `Foldable`
 * folded/unfolded).
 *
 * Those three are the same shape: one persisted boolean, a predicate
 * getter, a noun setter that rejects non-booleans loudly, and two
 * idempotent action verbs. They differ *only* by name. This base owns
 * the one piece that is genuinely shared — the guarded boolean — so the
 * per-axis mixins reduce to a thin naming layer over `getState()` /
 * `setState()`.
 *
 * A cross-cutting substrate (top-level `lib/`, the `lib/reserve.ts`
 * precedent): the concept spans spatial / boundary / slot with no single
 * subsystem home, so it lives at the `lib/` root rather than colonizing
 * one consumer's folder.
 *
 * **Deliberately NOT a queryable capability.** `BistateMixin` carries
 * **no `_mixinName`** and is **not registered in `lib/mixin.ts`'s
 * `Mixins`**. It is shared *implementation*, not a contract surface:
 * consumers narrow on `isSealable` / `isSwitchable` / `isFoldable` (the
 * concrete axis they care about), never on an `isBistate`. Registering
 * it would invent a capability nobody queries and leak the base into the
 * author-facing mixin roster.
 *
 * Composes cleanly as an inner base — the codebase already wraps mixins
 * in mixins (`Door = LockableMixin(SealableMixin(Boundary))`); here each
 * toggle mixin is `class extends BistateMixin(Base)`.
 */

import type { MixinConstructor } from './mixin';

/**
 * The internal state surface a consuming toggle mixin reaches on `this`.
 * TypeScript does not surface an anonymous mixin base's `protected`
 * members on a subclass composed through the generic factory, so the
 * naming layer casts `this` to this shape for its internal state calls
 * (the `CraftedMixin extends GradedMixin` cast precedent). It is **not**
 * a contract surface — external callers never see `getState`/`setState`.
 */
export interface BistateInternal {
  getState(): boolean;
  setState(value: boolean, label: string): void;
}

export function BistateMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class BistateMixin extends Base {
    /**
     * The single guarded boolean. `private` (domain-code default) with a
     * neutral name because the noun (`open` / `on` / `folded`) lives on
     * the naming layer above; access via `getState()` / `setState()`.
     */
    private _state = false;

    /** Read the guarded boolean. */
    protected getState(): boolean {
      return this._state;
    }

    /**
     * Write the guarded boolean. Rejects non-boolean assignments with
     * `TypeError` — a malformed template (`open: 1`) crashes loudly at
     * hydrate time rather than being silently coerced. `label` names the
     * offending field for the message (`<Type>.<field>`).
     */
    protected setState(value: boolean, label: string): void {
      if (typeof value !== 'boolean') {
        throw new TypeError(
          `${label} must be a boolean, got ${typeof value}`
        );
      }
      this._state = value;
    }
  };
}
