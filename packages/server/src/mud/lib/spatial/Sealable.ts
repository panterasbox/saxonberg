/**
 * SealableMixin — binary open/closed state for things that can be sealed.
 *
 * Doors are the canonical sealable, but the concept generalizes: chests,
 * boxes, trapdoors, windows, envelopes. Open/close controllers target any
 * Sealable rather than Door specifically — the surface is the same.
 *
 * Scope is intentionally narrow: `isOpen` + `open()` + `close()`. Locks,
 * keys, and unlock commands are future phases.
 */

import type { MixinConstructor } from '../mixin';

/**
 * Public shape added by SealableMixin.
 *
 * The accessor pair `isOpen` is host-internal (Pattern D) so the
 * hydrator's bracket-assign still fires the boolean-validating setter.
 * Public read uses `getIsOpen()` rather than `isOpen()` because the
 * latter would collide with the accessor's prototype slot — the
 * persistent-field name `isOpen` is locked by § 5 of the migration
 * doc, so we accept the awkward `getIsOpen()` to keep the schema and
 * the invariant.
 */
export interface Sealable {
  getIsOpen(): boolean;
  setOpen(value: boolean): void;
  open(): void;
  close(): void;
}

export function SealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SealableMixin extends Base {
    static _mixinName = 'SealableMixin';

    static persistentFields = ['isOpen'];

    /** Backing storage; access via the `isOpen` accessor pair below. */
    private _isOpen: boolean = false;

    /**
     * Host-internal accessor pair (Pattern D). External callers go
     * through `getIsOpen()` / `setOpen()`. The setter rejects
     * non-boolean assignments with `TypeError`. Hydrator's
     * bracket-assign `target['isOpen'] = data.isOpen` fires this
     * setter, so a malformed template (`isOpen: 1`) crashes loudly at
     * hydrate time rather than being silently coerced at runtime.
     */
    protected get isOpen(): boolean {
      return this._isOpen;
    }

    protected set isOpen(value: boolean) {
      if (typeof value !== 'boolean') {
        throw new TypeError(
          `Sealable.isOpen must be a boolean, got ${typeof value}`
        );
      }
      this._isOpen = value;
    }

    getIsOpen(): boolean { return this.isOpen; }
    setOpen(value: boolean): void { this.isOpen = value; }

    /** Open the sealable. Idempotent — opening an already-open one is a no-op. */
    open(): void {
      this._isOpen = true;
    }

    /** Close the sealable. Idempotent — closing an already-closed one is a no-op. */
    close(): void {
      this._isOpen = false;
    }
  };
}
