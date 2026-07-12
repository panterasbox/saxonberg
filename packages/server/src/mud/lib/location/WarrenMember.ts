/**
 * WarrenMemberMixin — the optional member-side back-ref carrier for the
 * Warren elastic-graph substrate.
 *
 * A `Warren` (see `Warren.ts`) coordinates a set of live `Location`
 * instances. Membership truth lives in the Warren's own set; a Location
 * is a member by virtue of being in that set, NOT by composing this
 * mixin. Compose `WarrenMemberMixin` only when the location-side needs a
 * back-ref to its Warren — for the single-warren guard, for "which
 * Warren am I in" reads, and for the durable-recall capture hook (the
 * persistence spine's `PersistableLogic.capturePlacement` consults
 * `getWarren()`).
 *
 * What this mixin is NOT for: it is not a "this is a lounge room" marker
 * (that is `LoungeMixin`), it does not make the host a container of or
 * contained-by the Warren (the Warren is a coordinator, not a containment
 * tier — member Locations stay roots), and it does not own the
 * relationship. The Warren owns it: `Warren.addMember` / `removeMember`
 * are the SOLE writers of the back-ref. `setWarren` is public only so the
 * Warren-side helpers can reach it; normal callers never invoke it.
 *
 * Reference shape: Pattern B live ref with R2.3 self-heal (a destructed
 * Warren reads back as `null`) and R2.4 cleanup (`cleanupOnDestruct`
 * unhooks from the Warren's set via `removeMember`). Models the
 * Spawner/Spawned precedent (`lib/stuff/Spawned.ts`). NOT persisted — the
 * graph reconstitutes lazily; durable recall rides the save-delegation
 * hook, not a persisted instance ref.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff, EvictionContext } from '../stuff/Stuff';
import type { VetoResult } from '../errors';
import type { Container } from '../spatial/Container';
import type { Warren } from './Warren';

/**
 * Public shape provided by WarrenMemberMixin.
 */
export interface WarrenMember {
  /**
   * The Warren that owns this member, or `null` when unaffiliated OR
   * when the previous Warren has destructed (R2.3 self-heal). Reads
   * always go through here — never a declared seed path.
   */
  getWarren(): (Stuff & Warren) | null;

  /**
   * Back-ref setter. Normal callers don't invoke this directly — it is
   * wired by `Warren.addMember` / `removeMember` (the relationship's
   * sole owners). Public so the symmetric Warren-side helpers can reach
   * it.
   */
  setWarren(value: (Stuff & Warren) | null): void;
}

export function WarrenMemberMixin<TBase extends MixinConstructor<Stuff & Container>>(
  Base: TBase,
) {
  return class WarrenMemberMixin extends Base {
    static _mixinName = 'WarrenMemberMixin';

    /**
     * Residency veto: a live Warren member stays resident — culling a
     * satellite out from under the elastic graph (host designation, hub
     * exits, migration) is the Warren's call, not residency's. An
     * unaffiliated / detached member (`getWarren()` null, incl. the R2.3
     * self-heal of a destructed Warren) falls through to `super` and
     * culls like any other room.
     */
    public canEvict(context: EvictionContext): VetoResult {
      if (this.getWarren() !== null) {
        return { ok: false, reason: 'active warren member' };
      }
      return super.canEvict(context);
    }

    /**
     * R2.4 framework cleanup. Unhook from the owning Warren's set on
     * destruct via the canonical `removeMember` chokepoint (which
     * clears this back-ref too and, when this member was the host,
     * triggers host migration). We read `getWarren()` before the call
     * so the lookup doesn't depend on the back-ref staying intact.
     *
     * Single-op handler: no internal try/catch. The dispatcher's outer
     * per-handler try/catch in `StuffApi.#destructCore` logs-and-
     * continues if `removeMember` throws. Same shape as
     * `Spawned.cleanupOnDestruct`.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const self = stuff as Stuff & WarrenMember;
      const warren = self.getWarren();
      if (warren) {
        warren.removeMember(self as unknown as Stuff & Container);
      }
    }

    /**
     * Live ref back-pointer. Transient — not in `persistentFields`.
     * TypeScript `private` (not `#`) per the domain-code default — the
     * mixin proxy receiver can't reach `#`-private slots.
     */
    private _warren: (Stuff & Warren) | null = null;

    public getWarren(): (Stuff & Warren) | null {
      if (this._warren === null) return null;
      if ((this._warren as unknown as Stuff).isDestroyed()) {
        this._warren = null;
        return null;
      }
      return this._warren;
    }

    public setWarren(value: (Stuff & Warren) | null): void {
      this._warren = value;
    }
  };
}
