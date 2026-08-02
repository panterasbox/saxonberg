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
 * `memberIds`) but has exactly one `activePartyPath` at a time.
 *
 * The pointers are written under **participant contracts**, not a module
 * allowlist: the legitimate writer is *the Party acting on this member*
 * (`FromClass(() => Party)` + a relational `where` validating the path
 * being written), with a narrow janitorial arm for the party subsystem's
 * own logic (`FromTemplate('/obj/api/party')`) covering stale-pointer
 * cleanup when no live Party Idea exists to act.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { CommandContributions } from "../../api/command";
import {
  CallSecurity,
  Final,
  Unshadowable,
} from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import { Party } from "./Party";

/** Public read surface for PartyMemberMixin. */
export interface PartyMember {
  getActivePartyPath(): string;
  getPendingInvitePartyPath(): string;
  /** The member's durable party ref: an Avatar's playerId, else the
   * instance templatePath (a Mercenary NPC). */
  partyMemberId(): string;
  /** Participant-gated — written by the admitting/releasing {@link Party}
   * (or the party logic's janitorial arm). */
  _setActivePartyPath(path: string): void;
  /** Participant-gated — written by the inviting {@link Party}
   * (or the party logic's janitorial arm). */
  _setPendingInvitePartyPath(path: string): void;
}

/**
 * The active-pointer contract: the calling Party may clear my pointer
 * (`''` — release / stand-down), or point it at **itself** provided I am
 * already on its roster (admit runs roster-first, so the relation holds
 * at write time). A Party can never point me at some *other* party.
 */
const ByRosteringParty = SecurityPolicies.AnyOf(
  SecurityPolicies.FromClass(() => Party, {
    where: (caller, target, _method, args) => {
      const party = caller as Party;
      const path = typeof args[0] === "string" ? args[0] : "";
      if (path === "") return true;
      const member = target as PartyMember;
      return (
        path === party.getTemplatePath() &&
        party.isMember(member.partyMemberId())
      );
    },
  }),
  SecurityPolicies.FromTemplate("/obj/api/party"),
);

/**
 * The invite-pointer contract: the calling Party may clear my invite or
 * set it to **itself** — an invite precedes roster membership, so there
 * is no roster clause here.
 */
const ByInvitingParty = SecurityPolicies.AnyOf(
  SecurityPolicies.FromClass(() => Party, {
    where: (caller, _target, _method, args) => {
      const party = caller as Party;
      const path = typeof args[0] === "string" ? args[0] : "";
      return path === "" || path === party.getTemplatePath();
    },
  }),
  SecurityPolicies.FromTemplate("/obj/api/party"),
);

export function PartyMemberMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PartyMemberMixin extends Base implements PartyMember {
    static _mixinName = "PartyMemberMixin";
    static fieldMeta: FieldMeta = {
      activePartyPath: { persistent: true, runtimeState: true },
    };

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
     */
    public activePartyPath: string = "";

    /**
     * An outstanding invite's party `templatePath`, or `''`. Transient by
     * nature (an invite that outlives a restart is stale), not persisted.
     */
    public pendingInvitePartyPath: string = "";

    public getActivePartyPath(): string {
      return this.activePartyPath;
    }

    public getPendingInvitePartyPath(): string {
      return this.pendingInvitePartyPath;
    }

    public partyMemberId(): string {
      const host = this as {
        getPlayerId?: () => string | null;
        getTemplatePath?: () => string | null;
      };
      return host.getPlayerId?.() || host.getTemplatePath?.() || "";
    }

    @CallSecurity(ByRosteringParty)
    @Final
    @Unshadowable
    public _setActivePartyPath(path: string): void {
      this.activePartyPath = path;
    }

    @CallSecurity(ByInvitingParty)
    @Final
    @Unshadowable
    public _setPendingInvitePartyPath(path: string): void {
      this.pendingInvitePartyPath = path;
    }
  }
  return PartyMemberMixin;
}
