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
 * own logic (`FromTemplate('/platform/idea/api/party')`) covering stale-pointer
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
import { Party } from "../../platform/idea/Party";
import { StuffApi } from "../../api/stuff";
import type { PartyOpResult, PartySimpleResult } from "../../api/party";
// eslint-disable-next-line no-restricted-imports -- the F3 member face: a member's party verbs forward into the party logic singleton exactly as the api/party facade does (the Combustible/Energized precedent)
import { PartyLogic } from "../../platform/idea/api/PartyLogic";
import type { Stuff } from "../stuff/Stuff";

/** Public read surface for PartyMemberMixin. */
export interface PartyMember {
  // The party verbs (F3) — forward into PartyLogic.
  formParty(name: string, durable?: boolean): Promise<PartyOpResult>;
  inviteToParty(invitee: Stuff): Promise<PartyOpResult>;
  acceptPartyInvite(): Promise<PartyOpResult>;
  enlist(hiree: Stuff): Promise<PartySimpleResult>;
  leaveParty(): Promise<PartySimpleResult>;
  kickFromParty(targetId: string): Promise<PartySimpleResult>;
  disbandParty(): Promise<PartySimpleResult>;
  transferCaptaincy(newCaptainId: string): Promise<PartySimpleResult>;
  setPartySide(side: string): Promise<PartySimpleResult>;
  setPartyFormation(name: string): Promise<PartySimpleResult>;
  assignPartyRole(role: string, targetId: string): Promise<PartySimpleResult>;
  muster(name: string): Promise<PartyOpResult>;
  standDown(): Promise<PartySimpleResult>;
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
  SecurityPolicies.FromTemplate("/platform/idea/api/party"),
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
  SecurityPolicies.FromTemplate("/platform/idea/api/party"),
);

export function PartyMemberMixin<TBase extends MixinConstructor>(Base: TBase) {
  class PartyMemberMixin extends Base implements PartyMember {
    static _mixinName = "PartyMemberMixin";
    static fieldMeta: FieldMeta = {
      activePartyPath: { persistent: true, runtimeState: true },
    };

    /** The `party` verb — a party-capable actor's whole party surface. */
    static commandContributions: CommandContributions = {
      self: ["platform/cmd/social/party.yaml"],
      peers: [],
      environment: [],
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

    // ------- the party verbs (F3) — forward into PartyLogic -------

    /** Found a new party (ad-hoc unless `durable`), captained by this. */
    public formParty(name: string, durable = false): Promise<PartyOpResult> {
      return partyLogic().form(this as unknown as Stuff, name, durable);
    }

    /** Offer `invitee` a place in this member's party (offer+accept). */
    public inviteToParty(invitee: Stuff): Promise<PartyOpResult> {
      return partyLogic().invite(this as unknown as Stuff, invitee);
    }

    /** Accept an outstanding party invite. */
    public acceptPartyInvite(): Promise<PartyOpResult> {
      return partyLogic().accept(this as unknown as Stuff);
    }

    /** Directly enlist `hiree` (the merc-hire path, no handshake). */
    public enlist(hiree: Stuff): Promise<PartySimpleResult> {
      return partyLogic().enlist(this as unknown as Stuff, hiree);
    }

    /** Leave the active party (a leaving captain auto-promotes an heir). */
    public leaveParty(): Promise<PartySimpleResult> {
      return partyLogic().leave(this as unknown as Stuff);
    }

    /** Captain removes a member by ref. */
    public kickFromParty(targetId: string): Promise<PartySimpleResult> {
      return partyLogic().kick(this as unknown as Stuff, targetId);
    }

    /** Captain dissolves the party (+ its chat channel). */
    public disbandParty(): Promise<PartySimpleResult> {
      return partyLogic().disband(this as unknown as Stuff);
    }

    /** Captain hands leadership to another member. */
    public transferCaptaincy(newCaptainId: string): Promise<PartySimpleResult> {
      return partyLogic().transfer(this as unknown as Stuff, newCaptainId);
    }

    /** Captain sets the party's shared combat side (the ally seam). */
    public setPartySide(side: string): Promise<PartySimpleResult> {
      return partyLogic().setSide(this as unknown as Stuff, side);
    }

    /** Captain adopts a formation by short name. */
    public setPartyFormation(name: string): Promise<PartySimpleResult> {
      return partyLogic().setFormation(this as unknown as Stuff, name);
    }

    /** Captain assigns a member a role from the formation's vocabulary. */
    public assignPartyRole(
      role: string,
      targetId: string,
    ): Promise<PartySimpleResult> {
      return partyLogic().assignRole(this as unknown as Stuff, role, targetId);
    }

    /** Re-activate a dormant durable crew by name (one-active). */
    public muster(name: string): Promise<PartyOpResult> {
      return partyLogic().muster(this as unknown as Stuff, name);
    }

    /** Go dormant: clear the active pointer. */
    public standDown(): Promise<PartySimpleResult> {
      return partyLogic().standDown(this as unknown as Stuff);
    }
  }
  return PartyMemberMixin;
}

/** Resolve the HMR-able PartyLogic singleton (the party choreography). */
function partyLogic(): PartyLogic {
  return StuffApi.singletonSync(
    "/platform/idea/api/party",
    () => new PartyLogic(),
  );
}
