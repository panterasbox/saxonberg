/**
 * ContractApi — the gated surface for the work-contract (gig) substrate:
 * post / claim / abandon / the two-beat turn-in (`fulfill` captures the
 * engine-sealed proof-of-delivery at the destination, `complete` redeems
 * at the board) / the board browse.
 *
 * The labor-market half of the work system (`lib/employment/` is the one
 * common home — gig and employment are two shapes of one system, the
 * `lib/standing/` precedent). Storage is the chattel precedent: a
 * `contracts` current-state row + an append-only `contract_events` chain,
 * one writer ({@link ContractLogic}); money moves **only** through the
 * sealed banking chokepoint (escrow hold/release/revert), and every actor
 * (poster, claimer, presenter, completer) is execution-context-derived —
 * never a caller-supplied param.
 *
 * No `boot()` — turn-in verification needs no warm state, no
 * subscription, no bootstrap entry; expiry is lazy-on-read at every
 * touchpoint (the withdrawal-quota / residency observe-first posture).
 */

import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { ContractLogic } from "../platform/idea/api/ContractLogic";
import type { ConditionData } from "../lib/employment/Condition";
import type {
  ContractRecord,
  ClaimMode,
} from "../lib/employment/ContractRecord";
import type { ContractEvent } from "../lib/employment/ContractEvent";
import { fileURLToPath } from "url";
import { SecurityApi } from "./security";

const LOGIC_PATH = "/platform/idea/api/contract";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/ContractLogic", import.meta.url),
);

/** What a poster asks for — the verb layer builds this from the model. */
export interface GigSpec {
  /** The board fixture's `templatePath` this gig is posted to. */
  boardPath: string;
  /** The one v1 `achieve` condition (validated; templates only). */
  condition: ConditionData;
  /** The reward, minor units (escrowed — posting fails if unfundable). */
  rewardMinor: number;
  /** The claim discipline. */
  claimMode: ClaimMode;
  /** Post as the actor's Business (escrow from the Business account). */
  asBusiness?: boolean;
  /** Optional posting lifetime (game-hours; 0/absent = the default). */
  expiresGameHours?: number;
  /**
   * ⭐ Where the work STARTS — a durable `templatePath`. Omitted ⇒ derived
   * from the poster's own environment, so an NPC posting from its floor
   * gets it right for free. Read by {@link ContractApi.openGigsFrom} —
   * the backhaul (logistics D17).
   */
  originPath?: string;
}

/** A refusal is a value with a prose-ready reason (the verb renders it). */
export type ContractRefusal = { ok: false; reason: string };

export type PostGigResult = { ok: true; contractId: string } | ContractRefusal;
export type ClaimResult = { ok: true } | ContractRefusal;
export type AbandonResult = { ok: true } | ContractRefusal;
export type FulfillResult = { ok: true } | ContractRefusal;
export type CompleteResult =
  | { ok: true; paidMinor: number }
  | ContractRefusal;

/** Resolve the HMR-able ContractLogic singleton (sync). */
function logic(): ContractLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "ContractLogic",
      ) as typeof ContractLogic | null) ?? ContractLogic)(),
  );
}

export class ContractApi {
  /**
   * Post a gig to a board. The poster is context-derived; the condition
   * must be an engine-verifiable template (free-form intents are refused —
   * the contract boundary). Open-bounty escrows now; exclusive
   * funds-checks now and escrows at claim. Refuses a pre-satisfied
   * condition (a degenerate gig) and an unfundable post.
   */
  public static async post(spec: GigSpec): Promise<PostGigResult> {
    return logic().post(spec);
  }

  /**
   * Claim an exclusive gig (the claimer is context-derived): escrows the
   * reward from the issuer and locks the gig to the claimant, with a
   * game-time claim expiry. Refused on a bounty gig, a non-open state, or
   * an issuer self-claim; an unfundable hold closes the gig (`unfundable`).
   */
  public static async claim(contractId: string): Promise<ClaimResult> {
    return logic().claim(contractId);
  }

  /**
   * Abandon a held claim (claimant-only, context-derived): breach —
   * escrow reverts, the `breached` event names the claimant, the
   * issuer-side regard nudge lands, and the gig reopens.
   */
  public static async abandon(contractId: string): Promise<AbandonResult> {
    return logic().abandon(contractId);
  }

  /**
   * The capture beat (proof-of-delivery), performed **at the
   * destination**: runs the engine verification now (strict possession
   * included) and on success appends the engine-sealed `fulfilled` event
   * — no money moves, no state transition. Exclusive → claimant only;
   * open-bounty → anyone (each row redeems only for its own actor).
   */
  public static async fulfill(contractId: string): Promise<FulfillResult> {
    return logic().fulfill(contractId);
  }

  /**
   * The redeem beat (payday), at the board: settles on **either** live
   * verification **or** a valid post-claim `fulfilled` row whose actor is
   * the completer — so the payout survives later state drift. On
   * verification: escrow releases to the completer's primary account,
   * `settled` records attribution both ways, the escrow account closes.
   */
  public static async complete(contractId: string): Promise<CompleteResult> {
    return logic().complete(contractId);
  }

  /**
   * The acting claimant's live claims (context-derived; lazy expiry
   * applied) — the bare `fulfill`/`complete`/`abandon` single-active-claim
   * resolution, board-independent (the courier is away from any board).
   */
  public static async activeClaims(): Promise<ContractRecord[]> {
    return logic().activeClaims();
  }

  /** The board browse: live gigs on `boardPath` (lazy expiry applied). */
  public static async openGigsOn(boardPath: string): Promise<ContractRecord[]> {
    return logic().openGigsOn(boardPath);
  }

  /**
   * ⭐ **The backhaul read** (logistics D17): live gigs whose work STARTS
   * at `originPath`, wherever they are posted. Lazy expiry applied, same
   * as the board browse.
   *
   * A wagon returning empty has done half the work for all the cost, and
   * *you cannot solve your own backhaul* — you need somebody else's cargo
   * going the other way. That is a coordination problem with visible
   * waste, and all it costs is this read plus a field.
   */
  public static async openGigsFrom(
    originPath: string,
  ): Promise<ContractRecord[]> {
    return logic().openGigsFrom(originPath);
  }

  /** One gig's current-state row (lazy expiry applied), or null. */
  public static async contractById(
    contractId: string,
  ): Promise<ContractRecord | null> {
    return logic().contractById(contractId);
  }

  /** One gig's append-only event chain, oldest-first. */
  public static async eventsFor(contractId: string): Promise<ContractEvent[]> {
    return logic().eventsFor(contractId);
  }
}

SecurityApi.decorateApiClass(ContractApi);
