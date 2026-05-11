/**
 * SlotApi — cross-cutting helpers for the slot substrate.
 *
 * The `Slotted.occupy` / `vacate` mixin methods are the underlying
 * surface; SlotApi is the security-gated entry point and the home of
 * multi-slot transactional logic, host-side scans, and the slot-
 * resolution algorithm consumed by every slot-bearing verb.
 *
 * Inverse-lookup helpers (`findOccupiedHost`, `findOccupiedSlots`)
 * walk the global Stuff registry. Slot occupancy is runtime-only
 * (per slot.md), so the walk is O(N) — acceptable for v1's world
 * sizes; an inverse index can land later if profiling demands.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Slotted, SlotSpec } from '../lib/slot/Slotted';
import type { Slottable } from '../lib/slot/Slottable';
import { MixinApi } from './mixin';
import { Mixins } from '../lib/mixin';
import { StuffApi } from './stuff';
import { SecurityApi } from './security';

/**
 * Discriminated input to `SlotApi.resolveSlot`.
 *
 * - `{ detail: 'back' }` — find the slot whose `userFacingDetail`
 *   matches the keyword.
 * - `{ accepts: 'WearableMixin' }` — find the first slot whose
 *   `accepts` matches the mixin name.
 */
export type SlotResolutionQuery =
  | { detail: string }
  | { accepts: string };

export class SlotApi {
  /**
   * Multi-slot claim (transactional). Either every slot is claimed
   * or none — no partial occupancy. Throws on validation failure
   * identifying which slot blocked it. The thrown error rolls back
   * any partial occupancies before propagating.
   */
  public static occupyAll(
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

  /**
   * Vacate the candidate from every named slot on the host. Returns
   * the array of vacated candidates (same length as `slots`; entries
   * are null for slots the candidate wasn't in).
   */
  public static vacateAll(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable,
    slots: readonly string[]
  ): readonly ((Stuff & Slottable) | null)[] {
    return slots.map(s => host.vacate(s, candidate));
  }

  /**
   * Find an empty slot on the host that the candidate fits. Returns
   * null if no slot works. Single-slot only — multi-slot Wearable/
   * Wieldable claims consult `getSlotClaim()` and call `occupyAll`.
   */
  public static findOpenSlotFor(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable
  ): string | null {
    for (const name of host.getSlotNames()) {
      if (host.isSlotFull(name)) continue;
      if (host.canOccupy(candidate, name)) return name;
    }
    return null;
  }

  /**
   * Find every host-slot a candidate is currently occupying. O(N)
   * over the global Stuff registry. Returns a Map keyed by host with
   * arrays of slot names. Used by `Slottable.onDestruct` cleanup and
   * the conveyance ripple's recursion.
   */
  public static findOccupiedSlots(
    candidate: Stuff & Slottable
  ): ReadonlyMap<Stuff & Slotted, readonly string[]> {
    const out = new Map<Stuff & Slotted, string[]>();
    for (const obj of StuffApi.getAllObjects()) {
      if (!MixinApi.isSlotted(obj)) continue;
      const host = obj as Stuff & Slotted;
      const slotNames: string[] = [];
      for (const [name, occupants] of host.getAllOccupants().entries()) {
        if (occupants.has(candidate)) slotNames.push(name);
      }
      if (slotNames.length > 0) out.set(host, slotNames);
    }
    return out;
  }

  /**
   * Common-case inverse lookup: "what single host is this candidate
   * slotted into?" Returns the single host or null. Throws if the
   * candidate occupies slots on multiple hosts (a Wearable claiming
   * two slots on ONE host is fine — same host counts once;
   * cross-host occupancy is the violation).
   */
  public static findOccupiedHost(
    candidate: Stuff & Slottable
  ): (Stuff & Slotted) | null {
    const occupied = SlotApi.findOccupiedSlots(candidate);
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

  /**
   * Slot resolution by Detail keyword OR by accepted-mixin. Used by
   * every slot-bearing verb (mount, sit X, wield X, …) to map an MQL
   * resolution to a slot.
   */
  public static resolveSlot(
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

  /**
   * Walk the slot map on `root` and recurse into any Slotted occupant.
   * Visitor fires **once per unique occupant** — even if the same
   * occupant claims multiple slots on the same host (e.g. boots on
   * foot:left + foot:right), it's visited once. Used by Mobile.traverse
   * for the conveyance ripple, where double-moving the same Stuff is a
   * bug. Visit order is depth-first.
   *
   * Cycle guard: an internal Set tracks visited hosts; a host already
   * walked won't be re-recursed.
   */
  public static walkOccupants(
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

  /**
   * Atomic vacate-then-occupy with rollback. Used by every posture
   * verb (sit/lie/kneel/stand-on/mount) to swap the actor's
   * posture-bearing slot atomically.
   *
   * If `from` is null, just occupies `to`. If the occupy step fails,
   * re-occupies `from` to restore prior state, then rethrows.
   *
   * Special case: when `from` and `to` reference the same (host, slot)
   * pair, this is a no-op.
   */
  public static transferOccupancy(
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

  /**
   * Export of the SlotSpec type for callers that need to manipulate
   * spec arrays before handing them to a Slotted host. Re-export
   * convenience — the canonical declaration lives in lib/slot/Slotted.
   */
  public static get SlotSpec(): symbol {
    // Marker; TypeScript types don't have runtime values. This getter
    // exists so the import surface is symmetric. Callers should
    // import the type via `import type { SlotSpec } from '../lib/slot/Slotted'`.
    return Symbol.for('SlotApi.SlotSpec');
  }
}

// Reference Mixins to keep the import non-elided and to make the
// validateSlotSpecs runtime check against the registry aware of new
// entries added in this file's siblings (this is a no-op at runtime
// but documents the dependency).
void Mixins;
void ({} as SlotSpec);

SecurityApi.decorateApiClass(SlotApi);
