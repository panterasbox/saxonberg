/**
 * PartyMemberMixin — "I can belong to a party" (the `Employed` sparse-
 * field precedent). Composed on **`Avatar`** (players) and on the
 * hireable {@link Mercenary} NPC — deliberately NOT the base `Character`,
 * so a plain townsperson / beast carries no party machinery and resolves
 * `solo` for free in `PartyApi.sideOf`.
 *
 * The mixin is a dumb store of two durable pointers:
 *   - `activePartyId` — the single active party (one-active-party rule);
 *     `''` when partyless. Combat's `sideOf` reads this to resolve the
 *     member's alignment key.
 *   - `pendingInvitePartyId` — an outstanding invite awaiting `accept`
 *     (the introductions offer+accept model); `''` when none.
 *
 * A member may sit on *many* parties' rosters (their id in each party's
 * `memberIds`) but has exactly one `activePartyId` at a time. Mutations
 * are `ApiOnly`-gated — only `PartyApi`/`PartyLogic` set them, never a
 * caller (the gated-writer discipline).
 */

import type { MixinConstructor } from "../mixin";
import type { CommandContributions } from "../../api/command";
import {
  CallSecurity,
  Final,
  Unshadowable,
} from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";

/** Public read surface for PartyMemberMixin. */
export interface PartyMember {
  getActivePartyId(): string;
  getPendingInvitePartyId(): string;
  /** ApiOnly — set the active party (or `''` to stand down). */
  _setActivePartyId(id: string): void;
  /** ApiOnly — set/clear an outstanding invite. */
  _setPendingInvitePartyId(id: string): void;
}

export function PartyMemberMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PartyMemberMixin extends Base implements PartyMember {
    static _mixinName = "PartyMemberMixin";
    static persistentFields = ["activePartyId"];

    /** The `party` verb — a party-capable actor's whole party surface. */
    static commandContributions: CommandContributions = {
      self: ["social/party.yaml"],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * The single active party's `_id`, or `''` when partyless. Persisted:
     * a player rejoins their active party across sessions.
     *
     * @runtimeState
     */
    public activePartyId: string = "";

    /**
     * An outstanding invite's party `_id`, or `''`. Transient by nature
     * (an invite that outlives a restart is stale), so not persisted.
     *
     * @runtimeState
     */
    public pendingInvitePartyId: string = "";

    public getActivePartyId(): string {
      return this.activePartyId;
    }

    public getPendingInvitePartyId(): string {
      return this.pendingInvitePartyId;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setActivePartyId(id: string): void {
      this.activePartyId = id;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setPendingInvitePartyId(id: string): void {
      this.pendingInvitePartyId = id;
    }
  }
  return PartyMemberMixin;
}
