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
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link SlotLogic} singleton at `/platform/idea/api/slot`,
 * reached synchronously via `StuffApi.singletonSync`.
 * `dest /platform/idea/api/slot` reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Slotted } from '../lib/slot/Slotted';
import type { Slottable } from '../lib/slot/Slottable';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SlotLogic } from '../platform/idea/api/SlotLogic';
import { fileURLToPath } from 'url';
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

const LOGIC_PATH = '/platform/idea/api/slot';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/SlotLogic', import.meta.url)
);

/** Resolve the HMR-able SlotLogic singleton (sync). */
function logic(): SlotLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'SlotLogic'
      ) as typeof SlotLogic | null) ?? SlotLogic)()
  );
}

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
    logic().occupyAll(host, candidate, slots);
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
    return logic().vacateAll(host, candidate, slots);
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
    return logic().findOpenSlotFor(host, candidate);
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
    return logic().findOccupiedSlots(candidate);
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
    return logic().findOccupiedHost(candidate);
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
    return logic().resolveSlot(host, by);
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
    logic().walkOccupants(root, visit);
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
    logic().transferOccupancy(candidate, from, to);
  }
}

SecurityApi.decorateApiClass(SlotApi);
