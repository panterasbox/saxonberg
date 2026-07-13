/**
 * FoldableMixin — binary folded/unfolded state for collapsible things.
 *
 * A folding camp chair, a card table, a cot. Composed onto a
 * posture-bearing host (a `Chair`), a folded host refuses its
 * posture-bearing slots — you can't sit on a folded chair. That gate
 * lives in `Slotted.canOccupy` (mirroring the fracture-impairs-slot
 * check), so no verb needs to know about folding.
 *
 * Scope is intentionally narrow: `isFolded()` / `setFolded()` (the
 * predicate/setter pair), plus `fold()` / `unfold()` (the action verbs).
 * Mirrors `SealableMixin` on the folded axis. Home is beside
 * `lib/slot/Postured.ts` — folding is a slot-affordance concern, not a
 * subsystem of its own.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`folded`); the predicate getter uses
 * the `is` prefix (`isFolded()`). Reads naturally at every site:
 * `chair.setFolded(true)`, `chair.isFolded()`, `data: { folded: true }`.
 */

import type { MixinConstructor } from '../mixin';

/**
 * Public shape added by FoldableMixin. `isFolded()` (predicate getter) /
 * `setFolded()` (noun setter) is the inter-Stuff contract surface;
 * `fold()` / `unfold()` are the action-shaped mutators.
 */
export interface Foldable {
  isFolded(): boolean;
  setFolded(value: boolean): void;
  fold(): void;
  unfold(): void;
}

export function FoldableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class FoldableMixin extends Base {
    static _mixinName = 'FoldableMixin';

    static persistentFields = ['folded'];

    /**
     * Backing storage; access via `isFolded()` / `setFolded()`.
     *
     * @authorable
     */
    private _folded: boolean = false;

    /** Predicate getter. */
    isFolded(): boolean {
      return this._folded;
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`folded: 1`) crashes loudly at hydrate
     * time rather than being silently coerced.
     */
    setFolded(value: boolean): void {
      if (typeof value !== 'boolean') {
        throw new TypeError(
          `Foldable.folded must be a boolean, got ${typeof value}`
        );
      }
      this._folded = value;
    }

    /** Fold it up. Idempotent — folding an already-folded one is a no-op. */
    fold(): void {
      this._folded = true;
    }

    /** Unfold it. Idempotent — unfolding an already-unfolded one is a no-op. */
    unfold(): void {
      this._folded = false;
    }
  };
}
