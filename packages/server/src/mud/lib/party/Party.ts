/**
 * Party — an ownable, named roster of combatants that **owns its own
 * membership** (the `Group` Document precedent, plus combat/leadership).
 *
 * A party is the operational unit that feeds combat friend-from-foe: its
 * `combatSide` is the alignment key every member resolves to (see
 * `PartyApi.sideOf`). It is deliberately **not** a managed `Group`: chat,
 * the grouping facade, and combat all read the party's own roster through
 * a dedicated `party:<id>` {@link PartyGroupProvider}, so there is exactly
 * one membership store (no group↔party two-store sync). That is the whole
 * point of the cycle-2 party decision — membership lives here.
 *
 * Two lifetimes over one primitive (the party-slate "one primitive, two
 * lifetimes"):
 *   - **ad-hoc** (`durable = false`) — held only in the `PartyRegistry`
 *     in-memory map, never `.save()`d, gone on restart, auto-disbands
 *     when it empties.
 *   - **durable** (`durable = true`) — persisted as a row in the
 *     `parties` collection so name + roster + captain survive a restart,
 *     re-materialized into the registry at boot, and **not** destroyed on
 *     empty (it goes dormant; `muster` re-activates it).
 *
 * Membership ids are durable member references: a player's `playerId` for
 * an Avatar, a `templatePath` for a hireable {@link Mercenary} NPC. The
 * captain is tracked by `captainId` (the single source of leadership
 * authority; succession repoints it). Per-member tactic roles are
 * deferred to combat-tactics-slate — v1 has captain vs member only.
 */

import { Document } from "../persistence/Document";

export const PARTIES_COLLECTION = "parties";

export class Party extends Document {
  static collectionName = PARTIES_COLLECTION;
  static persistentFields = [
    "name",
    "founderId",
    "captainId",
    "memberIds",
    "combatSide",
    "durable",
    "channelRef",
  ];

  /** Human-readable party name. Unique-indexed at the collection level. */
  name: string = "";

  /** Durable member ref of the founder (record of origin; never changes). */
  founderId: string = "";

  /** Durable member ref of the current captain (leadership authority). */
  captainId: string = "";

  /**
   * Durable member references. Avatar `playerId` or Mercenary
   * `templatePath`. Mutations go through `addMember` / `removeMember`.
   */
  memberIds: string[] = [];

  /**
   * The per-fight alignment key this party's members resolve to. Empty =
   * the party's own identity (`party:<id>`), the default. Captain-settable
   * so two parties can later point at one side to ally (the seam is
   * reachable without reshaping `PartyApi.sideOf`).
   */
  combatSide: string = "";

  /** True = persisted, survives restart, dormant-not-destroyed on empty. */
  durable: boolean = false;

  /** The `party:<id>` chat channel's name (resolvable via ChannelCatalogue),
   * or '' when no channel was minted. */
  channelRef: string = "";

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

  /* ───────────────── identity + side ───────────────── */

  getName(): string {
    return this.name;
  }

  isDurable(): boolean {
    return this.durable;
  }

  getChannelRef(): string {
    return this.channelRef;
  }

  /** The party's id as the grouping/party ref token (`party:<_id>`). */
  partyRef(): string {
    return `party:${this._id ?? ""}`;
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
}
