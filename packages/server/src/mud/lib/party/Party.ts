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
import type { VetoResult } from "../errors";
import type { SubscribableFieldDescriptor } from "../../api/mql-subscription";
import { PartyRecord } from "./PartyRecord";

export class Party extends Idea {
  static persistentFields = [
    "name",
    "founderId",
    "captainId",
    "memberIds",
    "combatSide",
    "durable",
    "channelRef",
  ];

  /** Party fields are MQL-projectable — a party is queryable by member,
   * side, captain, and name like any other Stuff. */
  static subscribableFields: SubscribableFieldDescriptor[] = [
    { name: "name", read: (s) => (s as Party).getName() },
    { name: "memberIds", read: (s) => [...(s as Party).getMemberIds()] },
    { name: "captainId", read: (s) => (s as Party).getCaptainId() },
    { name: "combatSide", read: (s) => (s as Party).getCombatSide() },
    { name: "durable", read: (s) => (s as Party).isDurable() },
  ];

  /** @authorable */ public name: string = "";
  /** @authorable */ public founderId: string = "";
  /** @authorable */ public captainId: string = "";
  /** @authorable */ public memberIds: string[] = [];
  /** @authorable */ public combatSide: string = "";
  /** @runtimeState */ public durable: boolean = false;
  /** @authorable */ public channelRef: string = "";

  /** A managed object, never residency-culled while it lives (a durable
   * dormant crew stays resident so `muster` can find it). */
  public canEvict(): VetoResult {
    return { ok: false, reason: "a party is a managed object, not clutter" };
  }

  /* ───────────────── membership ───────────────── */

  addMember(id: string): boolean {
    if (this.memberIds.includes(id)) return false;
    this.memberIds.push(id);
    return true;
  }

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

  setCaptainId(id: string): void {
    this.captainId = id;
  }

  isCaptain(id: string): boolean {
    return this.captainId === id;
  }

  getFounderId(): string {
    return this.founderId;
  }

  setFounderId(id: string): void {
    this.founderId = id;
  }

  /* ───────────────── identity + side ───────────────── */

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }

  isDurable(): boolean {
    return this.durable;
  }

  setDurable(durable: boolean): void {
    this.durable = durable;
  }

  getChannelRef(): string {
    return this.channelRef;
  }

  setChannelRef(ref: string): void {
    this.channelRef = ref;
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
    return record;
  }

  /** Hydrate this Idea's fields from a durable {@link PartyRecord}. */
  applyRecord(record: PartyRecord): void {
    this.name = record.name;
    this.founderId = record.founderId;
    this.captainId = record.captainId;
    this.memberIds = [...record.memberIds];
    this.combatSide = record.combatSide;
    this.channelRef = record.channelRef;
    this.durable = true;
  }
}

export default Party;
