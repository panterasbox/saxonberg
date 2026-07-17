/**
 * PartyMemberMixin — "I can belong to a party" (the `Employed` sparse-
 * field precedent). Composed on **`Avatar`** (players) and on the
 * hireable {@link Mercenary} NPC — deliberately NOT the base `Character`,
 * so a plain townsperson / beast carries no party machinery and resolves
 * `solo` for free in `PartyApi.sideOf`.
 *
 * The mixin is a dumb store of two durable pointers:
 *   - `activePartyPath` — the single active party (one-active-party rule);
 *     `''` when partyless. Combat's `sideOf` reads this to resolve the
 *     member's alignment key.
 *   - `pendingInvitePartyPath` — an outstanding invite awaiting `accept`
 *     (the introductions offer+accept model); `''` when none.
 *
 * A member may sit on *many* parties' rosters (their id in each party's
 * `memberIds`) but has exactly one `activePartyPath` at a time. Mutations
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
  getActivePartyPath(): string;
  getPendingInvitePartyPath(): string;
  /** ApiOnly — set the active party's templatePath (or `''` to stand down). */
  _setActivePartyPath(path: string): void;
  /** ApiOnly — set/clear an outstanding invite. */
  _setPendingInvitePartyPath(path: string): void;
}

export function PartyMemberMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PartyMemberMixin extends Base implements PartyMember {
    static _mixinName = "PartyMemberMixin";
    static persistentFields = ["activePartyPath"];

    /** The `party` verb — a party-capable actor's whole party surface. */
    static commandContributions: CommandContributions = {
      self: ["social/party.yaml"],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * The active party Idea's `templatePath`, or `''` when partyless.
     * Persisted: a player rejoins their active party across sessions.
     * Combat's `sideOf` resolves this through the Stuff graph.
     *
     * @runtimeState
     */
    public activePartyPath: string = "";

    /**
     * An outstanding invite's party `templatePath`, or `''`. Transient by
     * nature (an invite that outlives a restart is stale), not persisted.
     *
     * @runtimeState
     */
    public pendingInvitePartyPath: string = "";

    public getActivePartyPath(): string {
      return this.activePartyPath;
    }

    public getPendingInvitePartyPath(): string {
      return this.pendingInvitePartyPath;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setActivePartyPath(path: string): void {
      this.activePartyPath = path;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setPendingInvitePartyPath(path: string): void {
      this.pendingInvitePartyPath = path;
    }
  }
  return PartyMemberMixin;
}
