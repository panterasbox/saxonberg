// SlotLogic — the hot-reloadable logic singleton behind SlotApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Slotted } from '../../../lib/slot/Slotted';
import type { Slottable } from '../../../lib/slot/Slottable';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';
import type { SlotResolutionQuery } from '../../../api/slot';

// `AnyOf(FromModule, SelfOnly)`: `FromModule` admits the `SlotApi`
// facade forwarders; `SelfOnly` admits the intra-singleton self-call
// inside `findOccupiedHost` (which calls `this.findOccupiedSlots`).
const SlotApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/slot#SlotApi'),
  SecurityPolicies.SelfOnly
);

/**
 * SlotLogic — the hot-reloadable logic singleton behind {@link SlotApi}.
 *
 * Lives at `/platform/idea/api/slot` (a stateless `Stuff` singleton, no backing
 * `Template`); `SlotApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Guts-variant gate (`AnyOf(FromModule, SelfOnly)`): `findOccupiedHost`
 * makes an intra-singleton `this.findOccupiedSlots()` self-call, so
 * every method carries `AnyOf` (the facade forwarders supply the
 * `FromModule` half; `SelfOnly` admits the self-call). The
 * `walkOccupants` recursion is a local inner closure, not a method
 * self-call.
 *
 * The gate is applied **per public method**, not at the class level —
 * see {@link MaterialLogic} for why.
 *
 * @internal
 */
@Unshadowable
export class SlotLogic extends ApiLogic {
  /** See {@link SlotApi.occupyAll}. */
  @CallSecurity(SlotApiCallers)
  public occupyAll(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable,
    slots: readonly string[]
  ): void {
    const claimed: string[] = [];
    try {
      for (const slot of slots) {
        host.occupy(candidate, slot);
        claimed.push(slot);
      }
    } catch (err) {
      // Rollback in reverse order.
      for (let i = claimed.length - 1; i >= 0; i--) {
        try {
          const s = claimed[i];
          if (s) host.vacate(s, candidate);
        } catch {
          // Swallow rollback failures — the original error is the one
          // the caller cares about.
        }
      }
      throw err;
    }
  }

  /** See {@link SlotApi.findOpenSlotFor}. */
  @CallSecurity(SlotApiCallers)
  public findOpenSlotFor(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable
  ): string | null {
    for (const name of host.getSlotNames()) {
      if (host.isSlotFull(name)) continue;
      if (host.canOccupy(candidate, name)) return name;
    }
    return null;
  }

  /** See {@link SlotApi.findOccupiedSlots}. */
  @CallSecurity(SlotApiCallers)
  public findOccupiedSlots(
    candidate: Stuff & Slottable
  ): ReadonlyMap<Stuff & Slotted, readonly string[]> {
    // The candidate pool is an MQL system enumeration (null giver —
    // slot bookkeeping must see every host regardless of any viewer's
    // fog); the inner occupancy test is a reverse-relational read MQL
    // has no predicate for, so it stays local. O(N) over the pool —
    // fine for v1's world sizes; promote to an inverse index if
    // profiling demands.
    const hosts = MqlApi.resolveMany('world:[mixin.SlottedMixin]', {
      commandGiver: null,
      scope: 'world',
    });
    const out = new Map<Stuff & Slotted, string[]>();
    for (const obj of hosts.stuff) {
      if (!MixinApi.isSlotted(obj)) continue;
      const slotNames: string[] = [];
      for (const [name, occupants] of obj.getAllOccupants().entries()) {
        if (occupants.has(candidate)) slotNames.push(name);
      }
      if (slotNames.length > 0) out.set(obj, slotNames);
    }
    return out;
  }

  /** See {@link SlotApi.findOccupiedHost}. */
  @CallSecurity(SlotApiCallers)
  public findOccupiedHost(
    candidate: Stuff & Slottable
  ): (Stuff & Slotted) | null {
    const occupied = this.findOccupiedSlots(candidate);
    if (occupied.size === 0) return null;
    if (occupied.size > 1) {
      throw new Error(
        `SlotApi.findOccupiedHost: candidate occupies slots on ` +
        `${occupied.size} distinct hosts; use findOccupiedSlots() ` +
        `for the full breakdown`
      );
    }
    return occupied.keys().next().value as Stuff & Slotted;
  }

  /** See {@link SlotApi.resolveSlot}. */
  @CallSecurity(SlotApiCallers)
  public resolveSlot(
    host: Stuff & Slotted,
    by: SlotResolutionQuery
  ): string | null {
    if ('detail' in by) {
      const detail = by.detail;
      for (const name of host.getSlotNames()) {
        const spec = host.getSlotSpec(name);
        if (spec?.userFacingDetail === detail) return name;
      }
      return null;
    }
    const accepts = by.accepts;
    for (const name of host.getSlotNames()) {
      const spec = host.getSlotSpec(name);
      if (spec?.accepts === accepts) return name;
    }
    return null;
  }

  /** See {@link SlotApi.walkOccupants}. */
  @CallSecurity(SlotApiCallers)
  public walkOccupants(
    root: Stuff & Slotted,
    visit: (
      host: Stuff & Slotted,
      slot: string,
      occupant: Stuff & Slottable
    ) => void
  ): void {
    const visitedHosts = new Set<Stuff & Slotted>();
    const visitedOccupants = new Set<Stuff & Slottable>();
    function walk(host: Stuff & Slotted): void {
      if (visitedHosts.has(host)) return;
      visitedHosts.add(host);
      for (const [slotName, occupants] of host.getAllOccupants().entries()) {
        for (const occupant of occupants) {
          if (visitedOccupants.has(occupant)) continue;
          visitedOccupants.add(occupant);
          visit(host, slotName, occupant);
          if (MixinApi.isSlotted(occupant)) {
            walk(occupant);
          }
        }
      }
    }
    walk(root);
  }

  /** See {@link SlotApi.transferOccupancy}. */
  @CallSecurity(SlotApiCallers)
  public transferOccupancy(
    candidate: Stuff & Slottable,
    from: { host: Stuff & Slotted; slot: string } | null,
    to: { host: Stuff & Slotted; slot: string }
  ): void {
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
