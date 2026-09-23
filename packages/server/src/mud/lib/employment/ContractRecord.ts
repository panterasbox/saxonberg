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
import type { CreditTermsData, ContractKind } from "./CreditTerms";
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
 * Avatar's durable IDENTITY path, despite the field's name), a Business
 * (its Idea's path), or an Organization (the Treasury — economic
 * bootstrap D1).
 */
export interface ContractParty {
  kind: "player" | "business" | "organization";
  templatePath: string;
}

/**
 * @internal every caller of this class sits in the `contract` subsystem
 * — it is that subsystem's private collaborator, not author surface.
 */
export class ContractRecord extends Document {
  static collectionName = Collections.Contracts;
  static fieldMeta: FieldMeta = {
    contractId: { persistent: true },
    state: { persistent: true },
    boardPath: { persistent: true },
    origin: { persistent: true },
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
    watchedSec: { persistent: true },
    watchSeenSec: { persistent: true },
    kind: { persistent: true },
    holder: { persistent: true },
    terms: { persistent: true },
    owedMinor: { persistent: true },
    owedStampS: { persistent: true },
  };

  /**
   * ⭐ What this row IS (economic bootstrap D1): the gig it always was, or
   * a `loan` (a creditor funded a borrower), a `note` (the Arrival Note —
   * a member's note to the Treasury) or an `unclaimed` claim (the
   * treasury holds an absentee's balance for them). `gig` by default so
   * every existing finder and row is unchanged.
   */
  kind: ContractKind = "gig";
  /**
   * The CREDITOR — who holds the paper. Null for a gig (`claimant` keeps
   * its role there). For a loan the lender; for a note the Treasury; for
   * an unclaimed claim the absentee (the treasury is the issuer: it owes).
   */
  holder: ContractParty | null = null;
  /** The instrument's terms (rate, share, security, discharge, rung); null for a gig. */
  terms: CreditTermsData | null = null;
  /**
   * The running balance owed, minor units — principal plus accrued
   * interest, stamped forward on every touch (the `watchedSec` shape: a
   * materialized accrual on the record, never a scheduler).
   */
  owedMinor = 0;
  /** The game-second `owedMinor` was last accrued to. */
  owedStampS = 0;

  /**
   * ⭐ Game-seconds of watch the claimant has accrued on this contract
   * (`watch` clauses only). Accrued on the CONTRACT rather than on the
   * worker because a guard's watch is *for* a contract: two overlapping
   * posts are two separate accruals, and a worker-side counter could not
   * tell them apart.
   */
  watchedSec = 0;

  /**
   * ⭐⭐ The last game-second the claimant was **observed at the post** —
   * the reconcile's high-water mark, not a start time.
   *
   * Watch accrues from PRESENCE, never from a verb. The sweep credits
   * `now - watchSeenSec` when it finds the claimant standing at the
   * place with their hands free, and re-stamps either way; so a guard
   * who wanders off simply stops earning at the last moment anybody
   * looked, and one who comes back starts earning again.
   *
   * ⚠ The gap between samples is capped (`MAX_WATCH_SAMPLE_SEC`) — the
   * far-past guard the condition reconciles use. A world that was down
   * for a week must not pay a week's wages to somebody who happened to
   * log out standing in the right doorway.
   */
  watchSeenSec = 0;

  /** Durable gig id (server-minted uuid) — the escrow account keys on it. */
  contractId = "";
  /** The lifecycle state. */
  state: ContractState = "open";
  /** The board this gig is posted to (its fixture's `templatePath`). */
  boardPath = "";
  /**
   * ⭐ Where the work STARTS — the durable `templatePath` of the place the
   * goods are collected from. `""` when the posting names none.
   *
   * A gig already carried a destination (in its condition) and nothing
   * said where it began, which made **the empty return invisible**: a
   * hauler standing at the far end of a corridor could not ask *what
   * wants moving back*. That is the one collective structure logistics
   * D17 ships, and *you cannot solve your own backhaul* — you need
   * somebody else's cargo going the other way, so the board has to be
   * askable by origin.
   *
   * Set from the poster's own environment when the post omits it, so an
   * NPC posting from its floor gets the right answer for free.
   */
  origin = "";
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
   * The live gigs whose **origin** is `origin`, oldest-first — the
   * backhaul read (D17). A hauler standing in Rejection asks this to see
   * what wants moving to Terminus.
   */
  static async findLiveByOrigin(origin: string): Promise<ContractRecord[]> {
    const open = await ContractRecord.find<ContractRecord>({
      origin,
      state: "open",
    });
    const claimed = await ContractRecord.find<ContractRecord>({
      origin,
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

  /** The open instruments of `kind` whose ISSUER (the debtor) is `key`, oldest first. */
  static async findOpenByIssuer(key: string, kind: ContractKind): Promise<ContractRecord[]> {
    const rows = await ContractRecord.find<ContractRecord>({ kind, state: "open" });
    return rows.filter((r) => r.issuer.templatePath === key).sort((a, b) => a.postedAt - b.postedAt);
  }

  /** The open instruments of `kind` whose HOLDER (the creditor) is `key`, oldest first. */
  static async findOpenByHolder(key: string, kind: ContractKind): Promise<ContractRecord[]> {
    const rows = await ContractRecord.find<ContractRecord>({ kind, state: "open" });
    return rows.filter((r) => r.holder?.templatePath === key).sort((a, b) => a.postedAt - b.postedAt);
  }

  /**
   * ⭐ How many gigs `key` has COMPLETED — the one criterion a newcomer
   * can satisfy on their first afternoon, and therefore the entry rung of
   * the labor market. `settledBy` is stamped at settlement and never
   * cleared, so this counts finished work and nothing else: a claimed gig
   * in flight does not count, and neither does a breached one.
   */
  static async findSettledBy(key: string): Promise<ContractRecord[]> {
    if (!key) return [];
    return ContractRecord.find<ContractRecord>({
      kind: 'gig',
      state: 'settled',
      settledBy: key,
    });
  }

  /** Every row of `kind` in `state`. */
  static async findByKind(kind: ContractKind, state: ContractState): Promise<ContractRecord[]> {
    return ContractRecord.find<ContractRecord>({ kind, state });
  }

  /**
   * ⭐ Every claimed gig in the world, for the watch reconcile — which is
   * claimant-agnostic by nature (nobody asked it a question; it is a
   * sweep). Narrowed to `watch` clauses by the caller, because the
   * clause template lives inside the `clause` payload rather than in a
   * queryable column.
   */
  static async findAllClaimed(): Promise<ContractRecord[]> {
    return ContractRecord.find<ContractRecord>({ state: "claimed" });
  }
}
