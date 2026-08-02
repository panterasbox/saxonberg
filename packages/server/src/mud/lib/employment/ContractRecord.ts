/**
 * ContractRecord — the current-state row of one gig (the five-state
 * lifecycle record), in the `contracts` collection. The chattel/parcel
 * storage precedent: current-state row + append-only event chain
 * ({@link ContractEvent}), one writer (`ContractLogic`), keyed on durable
 * ids (`templatePath` for parties). Money legs live **only** in
 * `bank_ledger`; the record carries the escrow account id and the events
 * carry the linking `txId`s.
 *
 * Unlike chattel/parcel there is **no registry Stuff**: those registries
 * exist because title is consulted synchronously by `AccessApi`; contract
 * state has one writer and all reads are async record finders — with
 * turn-in verification there is no watch index and no warm cache at all.
 *
 * States: `open → claimed → settled | breached | expired` — the three
 * terminals; a failed *claim* (abandon / claim expiry) breaches the
 * claimant and **reopens** the gig, it does not terminate it.
 */

import { Document } from "../persistence/Document";
import { Collections } from "../persistence/Collections";
import type { ClauseData } from "./Clause";
import type { FieldMeta } from "../mixin";

/** The lifecycle vocabulary. */
export const CONTRACT_STATES = [
  "open",
  "claimed",
  "settled",
  "breached",
  "expired",
] as const;

export type ContractState = (typeof CONTRACT_STATES)[number];

/** Per-gig claim discipline — see the requirements' two claim modes. */
export const CLAIM_MODES = ["exclusive", "open-bounty"] as const;

export type ClaimMode = (typeof CLAIM_MODES)[number];

/**
 * A party to a contract — the `ChattelOwner` shape widened: a player (an
 * Avatar's durable `templatePath`) or a Business (its Idea's path).
 */
export interface ContractParty {
  kind: "player" | "business";
  templatePath: string;
}

export class ContractRecord extends Document {
  static collectionName = Collections.Contracts;
  static fieldMeta: FieldMeta = {
    contractId: { persistent: true },
    state: { persistent: true },
    boardPath: { persistent: true },
    issuer: { persistent: true },
    issuerAccountId: { persistent: true },
    claimMode: { persistent: true },
    claimant: { persistent: true },
    clause: { persistent: true },
    rewardMinor: { persistent: true },
    escrowAccountId: { persistent: true },
    postedAt: { persistent: true },
    postingExpiresAt: { persistent: true },
    claimedAt: { persistent: true },
    claimExpiresAt: { persistent: true },
    settledBy: { persistent: true },
    closedAt: { persistent: true },
    realAt: { persistent: true },
  };

  /** Durable gig id (server-minted uuid) — the escrow account keys on it. */
  contractId = "";
  /** The lifecycle state. */
  state: ContractState = "open";
  /** The board this gig is posted to (its fixture's `templatePath`). */
  boardPath = "";
  /** Who posted (and funds) the gig. */
  issuer: ContractParty = { kind: "player", templatePath: "" };
  /** The issuer-side funding account (where a revert returns the stake). */
  issuerAccountId = "";
  /** The claim discipline. */
  claimMode: ClaimMode = "exclusive";
  /** The current claimant's durable key (exclusive mode), or "". */
  claimant = "";
  /** The one v1 `achieve` clause. */
  clause: ClauseData | null = null;
  /** The reward, minor units — escrowed, never a worth on a good (Law 1). */
  rewardMinor = 0;
  /** The per-contract escrow account id (`escrow:contract:<id>`). */
  escrowAccountId = "";
  /** Game-time SECONDS of posting. */
  postedAt = 0;
  /** Game-time SECONDS the posting lapses (0 = never). */
  postingExpiresAt = 0;
  /** Game-time SECONDS of the live claim (exclusive), or 0. */
  claimedAt = 0;
  /** Game-time SECONDS the live claim lapses back to open, or 0. */
  claimExpiresAt = 0;
  /** The completer's durable key once settled, or "". */
  settledBy = "";
  /** Game-time SECONDS of the terminal transition, or 0. */
  closedAt = 0;
  /** Real-time epoch MILLISECONDS of the last write (auditing). */
  realAt = 0;

  /** The current-state row for `contractId`, or null. */
  static async findByContractId(
    contractId: string,
  ): Promise<ContractRecord | null> {
    const rows = await ContractRecord.find<ContractRecord>({ contractId });
    return rows[0] ?? null;
  }

  /** The live (open or claimed) gigs posted to `boardPath`, oldest-first. */
  static async findLiveByBoard(boardPath: string): Promise<ContractRecord[]> {
    const open = await ContractRecord.find<ContractRecord>({
      boardPath,
      state: "open",
    });
    const claimed = await ContractRecord.find<ContractRecord>({
      boardPath,
      state: "claimed",
    });
    return [...open, ...claimed].sort((a, b) => a.postedAt - b.postedAt);
  }

  /**
   * Every live gig `claimant` currently holds — the bare
   * `complete`/`abandon`/`fulfill` single-active-claim resolution.
   */
  static async findActiveByClaimant(
    claimant: string,
  ): Promise<ContractRecord[]> {
    return ContractRecord.find<ContractRecord>({ claimant, state: "claimed" });
  }
}
