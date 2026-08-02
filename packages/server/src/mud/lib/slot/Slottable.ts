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
import { SlotApi } from '../../api/slot';

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
   * reaches it: `SlotApi.occupyAll`, combat's grip swap, persistence
   * restore). v1 consumer: `PosedMixin` records which host's posture slot a
   * body occupies, so an avatar wakes where it slept.
   *
   * @hook
   */
  onSlotOccupied?(host: Stuff & Slotted, slotName: string): void;
}

export function SlottableMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class SlottableMixin extends Base {
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
      const occupied = SlotApi.findOccupiedSlots(candidate);
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
      return SlotApi.findOccupiedHost(this as unknown as Stuff & Slottable);
    }

    public fitsSlot(_host: Stuff & Slotted, _slot: string): boolean {
      void _host;
      void _slot;
      return true;
    }
  };
}
