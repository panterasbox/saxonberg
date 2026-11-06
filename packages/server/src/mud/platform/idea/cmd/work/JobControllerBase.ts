/**
 * JobControllerBase — what the `job` subcommands share (controllers-are-io
 * W7, D9: one controller per subcommand over a base per noun; *a
 * transaction with an institution's book is a subcommand of its noun*).
 *
 * The job board's book and the applicant's side of a house's roster are
 * one noun: bare `job` browses (`JobBrowseController`), `post` / `claim` /
 * `complete` / `abandon` work the board, `apply` / `quit` are the
 * applicant's half of the roster `house appoint` / `house dismiss` write,
 * and `fulfill` logs a delivery at the drop.
 *
 * ⭐ The board is an ARGUMENT (`board`, `on <board>`, defaulting to the one
 * in reach), bound by the view and never hunted for here —
 * {@link JobControllerBase.boardOf} reads it and refuses when it is not a
 * job board. Every actor is context-derived inside the gated logic; the
 * controllers pass no principal. Gig ids accept a unique prefix of the
 * full contract id (the browse shows the short form).
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { AddressApi } from "../../../../api/address";
import type { MqlOneResult } from "../../../../api/mql";
import { Mml } from "../../../../api/mml";
import { ContractApi } from "../../../../api/contract";
import JobBoard from "../../../thing/JobBoard";

export const TOPIC = "act.deed";

/** The browse's short id — enough to be unique on one board. */
export const SHORT_ID_LEN = 8;

export interface JobModel extends CommandModel {
  /**
   * `post`: the condition PHRASE — `deliver <thing> to <place>` or
   * `supply <n> <kind> to <place>`. Greedy up to `for`, parsed here
   * against the closed template vocabulary.
   */
  condition?: string;
  /** `post`: the reward, minor units (a string arg; coerced here). */
  reward?: string;
  /** `post`: where the work STARTS (name reachable-first, else a path). */
  from?: string;
  bounty?: boolean;
  business?: boolean;
  expires?: number;
  /**
   * ⭐ browse: list gigs whose ORIGIN is here rather than what hangs on
   * this board — the backhaul (D17). `here` is the only value that means
   * anything today; anything else is read as a place name.
   */
  origin?: string;
  /** `claim`/`complete`/`abandon`: a gig id (or unique prefix). */
  id?: string;
  /** The board the gig hangs on — bound by the view (`on <board>`). */
  board?: MqlOneResult;
}

export abstract class JobControllerBase<
  T extends CommandModel = JobModel,
> extends CommandController<T> {
  /**
   * The bound board, or a `no-board` refusal. ⚠ The arg is `requires:
   * any` — a `type: object` arg must name a capability mixin and the
   * board has none — so the KIND is checked here, the one place it can be.
   */
  protected boardOf(
    board: MqlOneResult | undefined,
    context: CommandContext,
  ): JobBoard | null {
    const stuff = board?.stuff ?? null;
    if (stuff instanceof JobBoard) return stuff;
    this.fail(context, "There's no job board here.", "no-board");
    return null;
  }

  /** Resolve a gig id (or unique prefix) against this board's live gigs;
   * a bare id falls back to the giver's single active claim here. */
  protected async resolveGigId(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
    verb: string,
  ): Promise<string | null> {
    const gigs = await ContractApi.openGigsOn(board.getTemplatePath() ?? "");
    const raw = (model.id ?? "").trim();
    if (raw) {
      const matches = gigs.filter((g) => g.contractId.startsWith(raw));
      if (matches.length === 1) return matches[0]?.contractId ?? null;
      if (matches.length > 1) {
        this.fail(context, `'${raw}' matches several gigs — more letters.`, "ambiguous-id");
        return null;
      }
      // Not on this board's live list — let the Api speak to it (a
      // settled/expired id gets its real refusal, not "no such").
      return raw;
    }
    const giverKey = context.commandGiver.getIdentityPath() ?? "";
    const mine = gigs.filter((g) => g.claimant === giverKey);
    if (mine.length === 1) return mine[0]?.contractId ?? null;
    this.fail(
      context,
      mine.length === 0
        ? `You hold no claim here — name the gig to ${verb}.`
        : `You hold several claims here — name the gig to ${verb}.`,
      mine.length === 0 ? "no-claim" : "ambiguous-claim",
    );
    return null;
  }

  /**
   * A place the player named, as a durable path — ⭐ the ONE ladder, on
   * `AddressApi`. It used to be a private copy here that knew only
   * `here`, reachable and a path; `ship` grew a second, different copy,
   * and the two drifted until one of them could not name a remote
   * destination at all.
   */
  protected place(raw: string, context: CommandContext): string {
    return AddressApi.resolvePlace(
      raw,
      context.commandGiver,
      context.location?.getTemplatePath() ?? "",
    );
  }

  /** The last path segment, for prose ("/world/lounge/location/bar" → "bar"). */
  protected leafOf(path: string): string {
    const leaf = path.split("/").filter(Boolean).pop();
    return leaf ?? "somewhere";
  }

  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  protected fail(context: CommandContext, message: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}
