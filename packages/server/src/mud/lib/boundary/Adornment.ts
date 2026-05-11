/**
 * AdornmentMixin — host-side back-reference for a fixture attached to
 * an `Adornable` Container.
 *
 * A fixture is a non-portable Stuff that sits in `getFixtures()`
 * rather than `getContents()` of its host Container. Wall sconces,
 * ceiling lamps, and BoundaryAnchors are the canonical users.
 *
 * Composing AdornmentMixin adds the `adornedTo` back-reference (which
 * Adornable updates as part of `addFixture` / `removeFixture`) and
 * enforces the not-portable invariant: an Adornment with a non-null
 * `adornedTo` cannot be moved into a Container's `contents` via
 * `ContainmentApi.move`. To relocate an attached Adornment as
 * inventory, the owner detaches it first (sets `adornedTo` to
 * `null`) — the same shape `Door.detach()` uses for broken doors.
 *
 * `adornedTo` is **not** in `persistentFields` (Stuff cross-references
 * follow the `Containable.environment` pattern — composing classes
 * that need the attachment to survive restart own the persistence
 * via a custom `persistenceHandler`). Today's Boundary subsystem
 * is hydrate-only: anchors are reconstructed by the seed code that
 * calls `BoundaryApi.attachExistingBoundary` after clone time.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Adornable } from './Adornable';
import { SlottableMixin } from '../slot/Slottable';

/** Public shape added by AdornmentMixin. */
export interface Adornment {
  getAdornedTo(): (Stuff & Adornable) | null;
  setAdornedTo(host: (Stuff & Adornable) | null): void;
}

export function AdornmentMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class AdornmentMixin extends SlottableMixin(Base) {
    static _mixinName = 'AdornmentMixin';

    /**
     * Back-reference to the Adornable host. Maintained by
     * `Adornable.addFixture` / `removeFixture`. Not persistent —
     * Stuff references go through custom persistenceHandlers (see
     * `Containable.environment` for the precedent).
     */
    protected adornedTo: (Stuff & Adornable) | null = null;

    getAdornedTo(): (Stuff & Adornable) | null {
      return this.adornedTo;
    }

    /**
     * Update the back-reference. Callers should normally let
     * `Adornable.addFixture` / `removeFixture` drive this — direct
     * use is reserved for the Adornable side wiring its own
     * collection update atomically with the back-reference.
     */
    setAdornedTo(host: (Stuff & Adornable) | null): void {
      this.adornedTo = host;
    }
  };
}
