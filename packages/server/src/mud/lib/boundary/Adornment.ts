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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Adornable } from './Adornable';
import { SlottableMixin } from '../slot/Slottable';

/** Public shape added by AdornmentMixin. */
export interface Adornment {
  getAdornedTo(): (Stuff & Adornable) | null;
  setAdornedTo(host: (Stuff & Adornable) | null): void;
  getMountSlot(): string | null;
}

export function AdornmentMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class AdornmentMixin extends SlottableMixin(Base) {
    static _mixinName = 'AdornmentMixin';

    /**
     * A fixture in your hands affords `hang` — the `wield`/`throw`
     * precedent: OUTWARD to whoever holds it. Taking one back DOWN
     * needs no affordance of its own; that is `get`, which the room
     * already affords, and the fixture is in the `peers` scope it binds.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [],
      environment: ['platform/cmd/inventory/hang.yaml'],
    };

    /**
     * Back-reference to the Adornable host. Maintained by
     * `Adornable.addFixture` / `removeFixture`. Not persistent —
     * Stuff references go through custom persistenceHandlers (see
     * `Containable.environment` for the precedent).
     */
    static fieldMeta: FieldMeta = {
      // `weak`, NOT the symmetric pair `ref-shapes.md` claimed.
      // `Adornable.fixtureSlots` is already `owned` (W6), and a field
      // carries ONE lifetime — declaring this side symmetric as well is
      // not expressible under the schema or the validator. The holder
      // owns its fixtures and destructs them; this back-ref only needs
      // to stop dangling when a fixture is destroyed standalone, which
      // is exactly what `weak` says. The doc's exemplar table is
      // corrected rather than the code bent to match it.
      adornedTo: { ref: 'instance', lifetime: 'weak' },
    };

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

    /**
     * The fixture slot this adornment currently occupies on its host, or
     * null when it is unattached. The good's own answer to "where am I
     * hung" — asked by the persistence spine, which records it on an
     * owned good's estate entry so a bought lamp comes back on the wall
     * (residences D11) rather than on the floor.
     */
    getMountSlot(): string | null {
      const host = this.adornedTo;
      if (!host) return null;
      return host.slotOfFixture(this as unknown as Stuff & Adornment);
    }

    /**
     * Residency veto: a fixture of a live host stays resident — else the
     * sweep would cull the sconce off a lit wall, the anchor out of a
     * standing boundary, or (since the ground build) the floor out from
     * under a room somebody is sitting on. The `Exit.canEvict` shape
     * (`lib/boundary/Exit.ts`) in the `WarrenMemberMixin` mixin form.
     *
     * ⚠ Presence cannot do this job: `ResidencyLogic.presenceWalkImpl`
     * walks the room's `getDeepContents()`, and fixtures are not
     * contents (`Adornable.addFixture` keeps its own collection). A
     * warm room therefore says nothing about its floor, which is why
     * the veto is the mechanism and `residency.md` has always said so.
     *
     * A detached fixture (`adornedTo` null — never hung, or taken back
     * into inventory) is ordinary cullable clutter; an owned one is
     * owner-persisted anyway and comes back on the wall. A fixture of a
     * destroyed host falls through to `super` and culls with it.
     */
    public canEvict(context: EvictionContext): VetoResult {
      const host = this.adornedTo;
      if (host && !host.isDestroyed()) {
        return { ok: false, reason: 'fixture of a live host' };
      }
      return super.canEvict(context);
    }
  };
}
