/**
 * Party — an ownable, named roster of combatants that **owns its own
 * membership**, modelled as a first-class **Idea** (a live Stuff in the
 * object graph).
 *
 * A party is the operational unit that feeds combat friend-from-foe: its
 * `combatSide` is the alignment key every member resolves to (see
 * `PartyApi.sideOf`). It is deliberately **not** a managed `Group`: chat,
 * the grouping facade, and combat all read the party's own roster through
 * a dedicated `party:<path>` {@link PartyGroupProvider}, so there is
 * exactly one membership store — the party itself.
 *
 * Being an Idea (not a bare Document) means the party's state is
 * **encapsulated on the object**, it is **MQL-visible** (queryable by
 * member / side / captain), and it is discovered through the Stuff graph
 * (`StuffApi.findByTemplatePath`) — there is **no central registry map**
 * duplicating that index. Its *durable* state is mirrored into a
 * {@link PartyRecord} document (the `parties` collection); ad-hoc parties
 * are Ideas that simply never persist.
 *
 * Two lifetimes over one primitive (the party-slate "one primitive, two
 * lifetimes"):
 *   - **ad-hoc** (`durable = false`) — a live Idea only, gone on restart,
 *     `StuffApi.destruct`ed when it empties.
 *   - **durable** (`durable = true`) — mirrored into a `PartyRecord` so
 *     name + roster + captain survive a restart (re-materialized into an
 *     Idea by `PartyLogic.boot()`), and **not** destroyed on empty (it
 *     goes dormant; `muster` re-activates it, `standdown` sends it
 *     dormant).
 *
 * Membership ids are durable member references: a player's `playerId` for
 * an Avatar, a `templatePath` for a hireable {@link Mercenary} NPC. The
 * captain is tracked by `captainId` (the single source of leadership
 * authority; succession repoints it).
 */

import { Idea } from "../stuff/Idea";
import type { Stuff } from "../stuff/Stuff";
import type { VetoResult } from "../errors";
import type { SubscribableFieldDescriptor } from "../../api/mql-subscription";
import { CallSecurity } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import { PartyRecord } from "./PartyRecord";
import type { PartyMember } from "./PartyMember";
import type { FieldMeta } from "../mixin";

/**
 * The party's own mutation surface: the party acting on itself (its
 * transition methods drive the roster primitives through the proxy) or
 * the party subsystem's logic singleton orchestrating a lifecycle step.
 * Reads stay Public.
 */
const PartySurface = SecurityPolicies.AnyOf(
  SecurityPolicies.SelfOnly,
  SecurityPolicies.FromTemplate("/obj/api/party"),
);

/**
 * The bottom rung of the **total formation-resolution chain**
 * (`PartyApi.formationPathOf`: active party's formation, else this) — a
 * path string, never null/`''`, so the exchange loop has no null branch
 * and "solo" is not a concept (the `sideOf` solo-rung / locomotion
 * universe-`walk` mirror). A plain string constant: the party side speaks
 * formation **paths** only (a ref-shapes identity ref) and never imports
 * `lib/combat`.
 */
export const DEFAULT_FORMATION_PATH = "/lib/combat/CombatFormation/default";

export class Party extends Idea {
  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    founderId: { persistent: true, authorable: true },
    captainId: { persistent: true, authorable: true },
    memberIds: { persistent: true, authorable: true },
    combatSide: { persistent: true, authorable: true },
    durable: { persistent: true, runtimeState: true },
    channelRef: { persistent: true, authorable: true },
    formationPath: { persistent: true, authorable: true },
    roleAssignments: { persistent: true, authorable: true },
  };

  /** Party fields are MQL-projectable — a party is queryable by member,
   * side, captain, and name like any other Stuff. */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    { name: "name", read: (s) => (s as Party).getName() },
    { name: "memberIds", read: (s) => [...(s as Party).getMemberIds()] },
    { name: "captainId", read: (s) => (s as Party).getCaptainId() },
    { name: "combatSide", read: (s) => (s as Party).getCombatSide() },
    { name: "durable", read: (s) => (s as Party).isDurable() },
    { name: "formationPath", read: (s) => (s as Party).getFormationPath() },
  ];

  /** */ public name: string = "";
  /** */ public founderId: string = "";
  /** */ public captainId: string = "";
  /** */ public memberIds: string[] = [];
  /** */ public combatSide: string = "";
  /** */ public durable: boolean = false;
  /** */ public channelRef: string = "";
  /** */ public formationPath: string = "";
  /** */ public roleAssignments: Record<string, string> = {};

  /** A managed object, never residency-culled while it lives (a durable
   * dormant crew stays resident so `muster` can find it). */
  public canEvict(): VetoResult {
    return { ok: false, reason: "a party is a managed object, not clutter" };
  }

  /* ───────── membership transitions (the party acts on its member) ─────────
   *
   * Each transition owns BOTH sides of the change — this roster and the
   * member's own pointer — so the two stores can never disagree about a
   * step. The member's `_set*PartyPath` writers are participant-gated on
   * `FromClass(() => Party)` with a relational `where`, which is exactly
   * the contract these methods exercise: the party is the calling
   * participant, acting on a member it rosters (or is releasing).
   */

  /** Admit a member: roster them, point their active pointer here, and
   * consume a pending invite that pointed here. Roster-first, so the
   * member-side contract ("only a party that rosters me may claim me")
   * holds at write time. */
  @CallSecurity(PartySurface)
  admit(member: Stuff & PartyMember): void {
    const myPath = this.getTemplatePath() ?? "";
    this.addMember(member.partyMemberId());
    member._setActivePartyPath(myPath);
    if (member.getPendingInvitePartyPath() === myPath) {
      member._setPendingInvitePartyPath("");
    }
  }

  /** Offer membership: set the member's pending-invite pointer here. */
  @CallSecurity(PartySurface)
  extendInvite(member: Stuff & PartyMember): void {
    member._setPendingInvitePartyPath(this.getTemplatePath() ?? "");
  }

  /** Release a member: roster removal + captain succession + clearing the
   * member's pointer when it points here. `member` may be null/absent for
   * an offline member — the roster side still settles. The empty-party
   * terminus (dormancy / destruct) is the logic's concern, not the
   * party's. */
  @CallSecurity(PartySurface)
  release(memberId: string, member?: (Stuff & PartyMember) | null): void {
    this.removeMember(memberId);
    delete this.roleAssignments[memberId];
    if (this.isCaptain(memberId)) {
      const heir = this.memberIds[0];
      if (heir) this.setCaptainId(heir);
    }
    if (member && member.getActivePartyPath() === this.getTemplatePath()) {
      member._setActivePartyPath("");
    }
  }

  /** Re-point an existing roster member's active pointer here (muster —
   * the durable-crew reactivation; overwrites any prior active party). */
  @CallSecurity(PartySurface)
  recall(member: Stuff & PartyMember): void {
    member._setActivePartyPath(this.getTemplatePath() ?? "");
  }

  /** Stand a member down without touching the roster (durable dormancy /
   * disband teardown): clear their pointer if it points here. */
  @CallSecurity(PartySurface)
  dismiss(member: Stuff & PartyMember): void {
    if (member.getActivePartyPath() === this.getTemplatePath()) {
      member._setActivePartyPath("");
    }
  }

  /* ───────────────── roster primitives ───────────────── */

  @CallSecurity(PartySurface)
  addMember(id: string): boolean {
    if (this.memberIds.includes(id)) return false;
    this.memberIds.push(id);
    return true;
  }

  @CallSecurity(PartySurface)
  removeMember(id: string): boolean {
    const idx = this.memberIds.indexOf(id);
    if (idx < 0) return false;
    this.memberIds.splice(idx, 1);
    return true;
  }

  isMember(id: string): boolean {
    return this.memberIds.includes(id);
  }

  getMemberIds(): readonly string[] {
    return this.memberIds;
  }

  size(): number {
    return this.memberIds.length;
  }

  /* ───────────────── leadership ───────────────── */

  getCaptainId(): string {
    return this.captainId;
  }

  @CallSecurity(PartySurface)
  setCaptainId(id: string): void {
    this.captainId = id;
  }

  isCaptain(id: string): boolean {
    return this.captainId === id;
  }

  getFounderId(): string {
    return this.founderId;
  }

  @CallSecurity(PartySurface)
  setFounderId(id: string): void {
    this.founderId = id;
  }

  /* ───────────────── identity + side ───────────────── */

  getName(): string {
    return this.name;
  }

  @CallSecurity(PartySurface)
  setName(name: string): void {
    this.name = name;
  }

  isDurable(): boolean {
    return this.durable;
  }

  @CallSecurity(PartySurface)
  setDurable(durable: boolean): void {
    this.durable = durable;
  }

  getChannelRef(): string {
    return this.channelRef;
  }

  @CallSecurity(PartySurface)
  setChannelRef(ref: string): void {
    this.channelRef = ref;
  }

  /* ───────────────── formation + roles ───────────────── */

  /** The active formation's templatePath, `''` when never chosen (the
   * resolution chain's caller falls through to the default preset —
   * `PartyApi.formationPathOf` owns the totality, not this read). */
  getFormationPath(): string {
    return this.formationPath;
  }

  @CallSecurity(PartySurface)
  setFormationPath(path: string): void {
    this.formationPath = path;
  }

  /** A member's assigned role, `''` when unassigned (vacant is inert,
   * never an error). Roles are sets, not seats — any number of members
   * may hold the same role; an assignment a formation switch orphans
   * simply stops matching any policy clause. */
  roleOfMember(memberId: string): string {
    return this.roleAssignments[memberId] ?? "";
  }

  getRoleAssignments(): Readonly<Record<string, string>> {
    return this.roleAssignments;
  }

  @CallSecurity(PartySurface)
  assignRole(memberId: string, role: string): void {
    this.roleAssignments[memberId] = role;
  }

  /** The party's grouping/party ref token (`party:<templatePath>`). */
  partyRef(): string {
    return `party:${this.getTemplatePath() ?? ""}`;
  }

  /**
   * The alignment key this party's members share. Explicit `combatSide`
   * when set (the ally-two-parties seam), else the party's own ref — so a
   * fresh party is its own side.
   */
  getCombatSide(): string {
    return this.combatSide || this.partyRef();
  }

  @CallSecurity(PartySurface)
  setCombatSide(side: string): void {
    this.combatSide = side;
  }

  /* ───────────────── durable persistence (the record) ───────────────── */

  /** Snapshot this party's durable state into a {@link PartyRecord}. */
  toRecord(existing?: PartyRecord): PartyRecord {
    const record = existing ?? new PartyRecord();
    record.path = this.getTemplatePath() ?? "";
    record.name = this.name;
    record.founderId = this.founderId;
    record.captainId = this.captainId;
    record.memberIds = [...this.memberIds];
    record.combatSide = this.combatSide;
    record.channelRef = this.channelRef;
    record.formationPath = this.formationPath;
    record.roleAssignments = { ...this.roleAssignments };
    return record;
  }

  /** Hydrate this Idea's fields from a durable {@link PartyRecord}. */
  @CallSecurity(PartySurface)
  applyRecord(record: PartyRecord): void {
    this.name = record.name;
    this.founderId = record.founderId;
    this.captainId = record.captainId;
    this.memberIds = [...record.memberIds];
    this.combatSide = record.combatSide;
    this.channelRef = record.channelRef;
    this.formationPath = record.formationPath;
    this.roleAssignments = { ...record.roleAssignments };
    this.durable = true;
  }
}

export default Party;
