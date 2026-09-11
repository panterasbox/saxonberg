/**
 * SlottableMixin — marker mixin for "this Stuff can occupy slots."
 *
 * Bare marker. Specialized capabilities (`Wearable`, `Wieldable`)
 * compose `Slottable` and add their own claim shape; sitter / rider
 * Stuff (avatars) compose `Slottable` directly so they can be slotted
 * into a `sit:1` / `mount:1` / `ground:1`.
 *
 * Lifecycle (R2.4): the framework cleanup `cleanupOnDestruct` walks
 * every host the candidate is currently slotted into and vacates
 * from each slot. Static dispatch — subclass `onDestruct` overrides
 * cannot bypass it. Guarantees no host holds a stale reference to a
 * destructed Stuff.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from './Slotted';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

/**
 * The participant contract on the back-reference: the `Slotted` host
 * that is the other party to the occupancy, writing itself in. Compares
 * by `stuffId` — the caller may surface as the raw target while the
 * argument is the proxy, or the other way round.
 */
const BySlottedHost = SecurityPolicies.FromMixin('SlottedMixin', {
  where: (caller, _target, _method, args) =>
    (caller as { stuffId?: string }).stuffId !== undefined &&
    (caller as { stuffId?: string }).stuffId ===
      (args[0] as { stuffId?: string } | undefined)?.stuffId,
});

/**
 * Public shape provided by SlottableMixin.
 *
 * `fitsSlot` is the candidate-side per-slot acceptance test consulted
 * by `Slotted.canOccupy` after the slot-side mixin check passes.
 * Bare Slottables (avatars sitting in chairs, riders mounting horses)
 * default to "always fits" — `WearableMixin` and `WieldableMixin`
 * override it to consult their per-body-plan claim records.
 *
 * Hoisted here (rather than living on a separate `SlotFittable`
 * optional shape) so `canOccupy` is a virtual call against a known
 * method, not a runtime "does this Stuff happen to have a fitsSlot
 * field" duck-type check.
 */
export interface Slottable {
  occupiedSlots(): ReadonlyMap<Stuff & Slotted, readonly string[]>;
  transferOccupancy(
    from: { host: Stuff & Slotted; slot: string } | null,
    to: { host: Stuff & Slotted; slot: string },
  ): void;
  /**
   * Inverse lookup convenience: "what host am I currently in a slot
   * of?" Returns the single host or null. Throws if the Slottable is
   * in slots on multiple hosts simultaneously (which only matters for
   * Wearable's multi-claim case — a gauntlet on each hand of the
   * same wearer is one host; cross-host is the violation).
   */
  getOccupiedHost(): (Stuff & Slotted) | null;

  /**
   * Per-slot acceptance test. Default impl always returns true.
   * `WearableMixin` / `WieldableMixin` override to walk their
   * per-body-plan slot claims.
   */
  fitsSlot(host: Stuff & Slotted, slot: string): boolean;

  /**
   * Optional witness fired by `Slotted.vacate(slot, candidate)` and
   * `Slotted.vacateSole(slot)` immediately after the candidate is
   * removed from the host's occupant set. Synchronous, in the same
   * transaction as the vacate. v1's `Mobile.onSlotReleased` clears
   * `engagedMode` for passthrough modes (ride / drive) so a
   * dismounting rider's engagement clears automatically. Future
   * witnesses (polymorph revert, status-clear, etc.) compose on the
   * same shape.
   */
  onSlotReleased?(host: Stuff & Slotted, slotName: string): void;
  /**
   * Optional synchronous witness — this candidate has just been placed in
   * `host`'s `slotName`. The symmetric twin of {@link onSlotReleased},
   * firing from the same `Slotted.occupy` chokepoint (so every arming path
   * reaches it: the host's `occupyAll`, combat's grip swap, persistence
   * restore). v1 consumer: `PosedMixin` records which host's posture slot a
   * body occupies, so an avatar wakes where it slept.
   *
   * @hook
   */
  onSlotOccupied?(host: Stuff & Slotted, slotName: string): void;

  /**
   * Participant-gated: the host recording that it has just put this
   * candidate in `slotName`. Written by the `Slotted` host that is the
   * other party to the relationship, and by nobody else.
   */
  _noteOccupied(host: Stuff & Slotted, slotName: string): void;
  /** Participant-gated: the host recording the release. */
  _noteReleased(host: Stuff & Slotted, slotName: string): void;
}

export function SlottableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  // Declared-then-returned (the Meltable shape) so method decorators
  // are legal — a class EXPRESSION cannot carry them.
  class SlottableMixin extends Base {
    static _mixinName = 'SlottableMixin';

    /**
     * R2.4 framework cleanup. Walks every host the candidate is
     * currently in a slot of, vacates each slot via the canonical
     * `Slotted.vacate(slot, candidate)` chokepoint so witnesses
     * (`onSlotReleased`, etc.) fire on the held side. Static
     * dispatch — a subclass `onDestruct` that omits
     * `super.onDestruct()` cannot bypass this.
     *
     * `findOccupiedSlots` returns a freshly-built Map each call;
     * the inner Set of slot names is a snapshot view. Safe to
     * mutate the host's live slot map during iteration.
     */
    static cleanupOnDestruct(stuff: Stuff): void {
      const candidate = stuff as Stuff & Slottable;
      const occupied = candidate.occupiedSlots();
      for (const [host, slotNames] of occupied.entries()) {
        for (const slotName of slotNames) {
          try {
            host.vacate(slotName, candidate);
          } catch (err) {
            console.error(
              `SlottableMixin.cleanupOnDestruct: failed to vacate ` +
                `${candidate.stuffId} from ${host.stuffId}.${slotName}`,
              err
            );
          }
        }
      }
    }

    public getOccupiedHost(): (Stuff & Slotted) | null {
      const occupied = this.occupiedSlots();
      if (occupied.size === 0) return null;
      if (occupied.size > 1) {
        throw new Error(
          `Slottable.getOccupiedHost: candidate occupies slots on ` +
            `${occupied.size} distinct hosts; use occupiedSlots() ` +
            `for the full breakdown`,
        );
      }
      return occupied.keys().next().value as Stuff & Slotted;
    }

    public fitsSlot(_host: Stuff & Slotted, _slot: string): boolean {
      void _host;
      void _slot;
      return true;
    }
    /**
     * ⭐⭐ **The back-reference.** Runtime only — the forward map on the
     * host is the persisted side, and this is rebuilt from it by the
     * same `occupy` calls that restore it.
     *
     * It exists because the question *which host holds me?* used to be
     * answered by reading every object in the world and looking inside
     * each one's slots. That is a reverse-relational read MQL has no
     * predicate for, so the cost was the whole registry — and it ran on
     * the metabolism path, once per creature per tick, where a live
     * drive found it pinning a CPU core.
     *
     * ⚠ **Deliberately not declared in `fieldMeta`**, exactly as its
     * forward twin `Slotted.slots` is not: neither side persists, so
     * neither is a live-ref field the R2.1–R2.4 rules govern. Both sides
     * are already cleared by destruct — `Slottable.cleanupOnDestruct`
     * vacates the candidate from every host, `Slotted.cleanupOnDestruct`
     * vacates every occupant from the host — and both routes go through
     * `vacate`, which is what drops this entry. See ref-shapes.md §
     * Declaring it.
     */
    private _occupancy: Map<Stuff & Slotted, Set<string>> = new Map();

    /**
     * The host's own record of the claim it just made. Gated to the
     * `Slotted` party to the relationship writing **itself** in — a
     * participant contract, not `ApiOnly`.
     */
    @CallSecurity(BySlottedHost)
    @Final
    @Unshadowable
    public _noteOccupied(host: Stuff & Slotted, slotName: string): void {
      const slots = this._occupancy.get(host);
      if (slots) slots.add(slotName);
      else this._occupancy.set(host, new Set([slotName]));
    }

    /** The symmetric release. An empty host entry is dropped. */
    @CallSecurity(BySlottedHost)
    @Final
    @Unshadowable
    public _noteReleased(host: Stuff & Slotted, slotName: string): void {
      const slots = this._occupancy.get(host);
      if (!slots) return;
      slots.delete(slotName);
      if (slots.size === 0) this._occupancy.delete(host);
    }

    /**
     * Every host-slot this candidate currently occupies (was
     * `SlotApi.findOccupiedSlots` — the OO sweep). A read of the
     * candidate's own back-reference, maintained by `Slotted.occupy` /
     * `vacate`, which are the only two places occupancy changes.
     *
     * A fresh Map each call, with a copied slot list: `cleanupOnDestruct`
     * iterates this while vacating, which mutates the live map.
     */
    public occupiedSlots(): ReadonlyMap<Stuff & Slotted, readonly string[]> {
      const out = new Map<Stuff & Slotted, string[]>();
      for (const [host, slots] of this._occupancy.entries()) {
        if (slots.size > 0) out.set(host, [...slots]);
      }
      return out;
    }

    /**
     * Atomic vacate-then-occupy with rollback (was
     * `SlotApi.transferOccupancy`). Used by every posture verb to swap
     * the actor's posture-bearing slot atomically. If `from` is null,
     * just occupies `to`; a same-(host,slot) transfer is a no-op.
     * Sealed — owns the atomicity invariant.
     */
    @Final
    @Unshadowable
    public transferOccupancy(
      from: { host: Stuff & Slotted; slot: string } | null,
      to: { host: Stuff & Slotted; slot: string },
    ): void {
      const candidate = this as unknown as Stuff & Slottable;
      if (from && from.host === to.host && from.slot === to.slot) {
        return;
      }
      const vacated = from ? from.host.vacate(from.slot, candidate) : null;
      try {
        to.host.occupy(candidate, to.slot);
      } catch (err) {
        // Rollback — re-occupy `from`.
        if (from && vacated) {
          try {
            from.host.occupy(candidate, from.slot);
          } catch {
            // Rollback failure — surface the original error.
          }
        }
        throw err;
      }
    }

  }
  return SlottableMixin;
}
