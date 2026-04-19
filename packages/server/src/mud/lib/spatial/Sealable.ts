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

import type { MixinConstructor } from '../mixin-types';

/**
 * Public shape added by SealableMixin.
 */
export interface Sealable {
  isOpen: boolean;
  open(): void;
  close(): void;
}

export function SealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SealableMixin extends Base {
    static _mixinName = 'SealableMixin';

    static persistentFields = ['isOpen'];

    /** Current state. `false` = closed. Default closed. */
    isOpen: boolean = false;

    /** Open the sealable. Idempotent — opening an already-open one is a no-op. */
    open(): void {
      this.isOpen = true;
    }

    /** Close the sealable. Idempotent — closing an already-closed one is a no-op. */
    close(): void {
      this.isOpen = false;
    }
  };
}
