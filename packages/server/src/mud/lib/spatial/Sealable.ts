/**
 * SealableMixin — binary open/closed state for things that can be sealed.
 *
 * Doors are the canonical sealable, but the concept generalizes: chests,
 * boxes, trapdoors, windows, envelopes. Open/close controllers target any
 * Sealable rather than Door specifically — the surface is the same.
 *
 * Scope is intentionally narrow: `setOpen()` / `isOpen()` (the
 * predicate/setter pair), plus `open()` / `close()` (the action verbs).
 * Locks, keys, and unlock commands are future phases.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`open`); the predicate getter uses
 * the `is` prefix (`isOpen()`). Reads naturally at every site:
 * `door.setOpen(true)`, `door.isOpen()`, `data: { open: true }`.
 *
 * Note: no `get open() / set open()` accessor pair is declared — the
 * accessor name would collide with the `open()` action method. With
 * the new two-phase Hydrator dispatch (`PersistentHydrator` Phase 1
 * tries `setOpen` first, falls back to bracket-assign only when no
 * setter exists), the bracket-assign-fallback path is never reached
 * for `open` because `setOpen` is defined; the runtime-shape
 * validation lives in `setOpen` directly.
 *
 * The guarded-boolean storage is delegated to `BistateMixin` (the
 * shared substrate under Sealable/Switchable/Foldable); this mixin is
 * the open/closed naming layer over `getState()` / `setState()`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { BistateMixin, type BistateInternal } from '../Bistate';

/**
 * Public shape added by SealableMixin. `isOpen()` (predicate getter) /
 * `setOpen()` (noun setter) is the inter-Stuff contract surface;
 * `open()` / `close()` are the action-shaped mutators most callers
 * want.
 */
export interface Sealable {
  isOpen(): boolean;
  setOpen(value: boolean): void;
  open(): void;
  close(): void;
}

export function SealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SealableMixin extends BistateMixin(Base) {
    static _mixinName = 'SealableMixin';

    static fieldMeta: FieldMeta = {
      open: { persistent: true },
    };

    /** Predicate getter. */
    isOpen(): boolean {
      return (this as unknown as BistateInternal).getState();
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`open: 1`) crashes loudly at hydrate
     * time rather than being silently coerced.
     */
    setOpen(value: boolean): void {
      (this as unknown as BistateInternal).setState(value, 'Sealable.open');
    }

    /** Open the sealable. Idempotent — opening an already-open one is a no-op. */
    open(): void {
      (this as unknown as BistateInternal).setState(true, 'Sealable.open');
    }

    /** Close the sealable. Idempotent — closing an already-closed one is a no-op. */
    close(): void {
      (this as unknown as BistateInternal).setState(false, 'Sealable.open');
    }
  };
}
