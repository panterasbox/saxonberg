/**
 * TravelCredentialMixin — the fast-travel credential: a registered-node
 * set plus the register/authorize surface, composed by BOTH a carryable
 * travel card (`/domain/common/tpa/TravelCard`) and a cranial-slot travel implant
 * (`/domain/common/tpa/TravelImplant`). State lives on the credential Stuff, which
 * is what makes the card transferable — lend the card, lend its routes.
 *
 * A node's network identity is its own singleton template path; the
 * registered set is a set of those paths. `register` writes one; the
 * `teleport` TPA fork checks membership before travelling.
 *
 * Born-with floor: every credential is born with the University Avenue node
 * registered (the lounge → campus hop), the single documented exception to
 * "reach a node before you can travel to it". The floor is preserved across
 * hydration (the setter unions saved entries on top, never clearing it).
 *
 * Persistence is **session-durable** in v1: `Avatar.save()` persists only the
 * avatar's own fields (no inventory persist-back; the implant is re-cloned
 * each session), so the registered set does not survive a restart yet.
 * Cross-restart durability rides future persistence work (aug-state
 * colocation; inventory persist-back; long-term storage) — not built here.
 */

import type { MixinConstructor } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { MixinApi } from "../../api/mixin";

/** The born-with node every fresh credential is registered for. */
export const UNIVERSITY_AVENUE_NODE =
  "/domain/eternal/university-avenue-terminal";

/** Public shape provided by TravelCredentialMixin. */
export interface TravelCredential {
  /** Record a node (by its singleton path) as an allowed destination. */
  register(ref: string): void;
  /** Remove a node from the allowed set. Returns whether it was present. */
  unregister(ref: string): boolean;
  /** Is this node an allowed destination? */
  isRegistered(ref: string): boolean;
  /** Readability alias for {@link isRegistered}. */
  authorize(ref: string): boolean;
  /** A copy of the allowed-node set. */
  getRegistered(): ReadonlySet<string>;
}

export function TravelCredentialMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class TravelCredentialMixin extends Base implements TravelCredential {
    static _mixinName = "TravelCredentialMixin";

    /**
     * Persistent — the allowed-node set. Hydrated through the `registered`
     * accessor (Phase 1 setter / Phase 2 bracket-assign).
     */
    static persistentFields = ["registered"];

    /**
     * The allowed-node set, seeded with the born-with floor. Not `#`-private
     * — mixin instance state on a proxy-wrapped Stuff host must be a
     * TypeScript `private`, not a hard-private slot.
     */
    private _registered: Set<string> = new Set([UNIVERSITY_AVENUE_NODE]);

    /**
     * Persistence accessor. The getter yields an array (storable); the
     * setter unions saved entries on top of the born-with floor, so the
     * floor is never cleared by a round-trip.
     */
    get registered(): string[] {
      return [...this._registered];
    }
    set registered(refs: string[]) {
      this._registered = new Set([UNIVERSITY_AVENUE_NODE, ...refs]);
    }

    register(ref: string): void {
      this._registered.add(ref);
    }

    unregister(ref: string): boolean {
      return this._registered.delete(ref);
    }

    isRegistered(ref: string): boolean {
      return this._registered.has(ref);
    }

    authorize(ref: string): boolean {
      return this._registered.has(ref);
    }

    getRegistered(): ReadonlySet<string> {
      return new Set(this._registered);
    }
  };
}

/**
 * Find the actor's active travel credential — implant-first (a credential in
 * the cranial slot), then a carried card (a credential in inventory). Returns
 * null when the actor controls none. No global index: scans only the actor.
 */
export function findActiveCredential(
  actor: Stuff,
): (Stuff & TravelCredential) | null {
  // Implant: cranial slot occupant.
  if (MixinApi.isSlotted(actor)) {
    try {
      for (const occ of actor.getOccupants("cranial")) {
        if (MixinApi.isTravelCredential(occ)) return occ;
      }
    } catch {
      // No cranial slot on this body plan — fall through to inventory.
    }
  }
  // Card: inventory item.
  if (MixinApi.isContainer(actor)) {
    for (const item of actor.getContents()) {
      if (MixinApi.isTravelCredential(item)) return item;
    }
  }
  return null;
}
