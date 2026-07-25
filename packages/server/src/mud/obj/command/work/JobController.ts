/**
 * JobController — the board-afforded `job`/`jobs` verb (the `work`
 * category), dispatch-on-subcommand (the `office`/`party` shape):
 *
 *   - bare / `jobs` — browse the live gigs on this board;
 *   - `post <item> to <destination> for <reward>` [--bounty] [--business]
 *     [--expires <h>] — post a delivery gig, reward escrowed;
 *   - `claim <id>` — lock an exclusive gig;
 *   - `complete [id]` — the redeem beat (payday at the board);
 *   - `abandon [id]` — walk away (breach).
 *
 * Thin: map model → the `ContractApi` call, render Scene + `ctx.note`.
 * Every actor is context-derived inside the gated logic — the controller
 * passes no principal. The board resolves via `JobBoard.resolveIn`
 * (affordance fast-path, else reachable peers); gig ids accept a unique
 * prefix of the full contract id (the browse shows the short form).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { MqlApi } from "../../../api/mql";
import { Mml } from "../../../api/mml";
import { ContractApi } from "../../../api/contract";
import type { ConditionData } from "../../../lib/employment/Condition";
import type { ContractRecord } from "../../../lib/employment/ContractRecord";
import JobBoard from "../../../lib/employment/JobBoard";

const TOPIC = "world.narration.action";

/** The browse's short id — enough to be unique on one board. */
const SHORT_ID_LEN = 8;

interface JobModel extends CommandModel {
  /** `post`: the item exemplar (reachable). */
  item?: MqlOneResult;
  /** `post`: the destination (name reachable-first, else a path). */
  destination?: string;
  /** `post`: the reward, minor units (a string arg; coerced here). */
  reward?: string;
  bounty?: boolean;
  business?: boolean;
  expires?: number;
  /** `claim`/`complete`/`abandon`: a gig id (or unique prefix). */
  id?: string;
}

export default class JobController extends CommandController<JobModel> {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = JobBoard.resolveIn(context);
    if (!board) {
      return this.fail(context, "There's no job board here.", "no-board");
    }
    switch (model.subcommand ?? "browse") {
      case "post":
        return this.executePost(model, context, board);
      case "claim":
        return this.executeClaim(model, context, board);
      case "complete":
        return this.executeComplete(model, context, board);
      case "abandon":
        return this.executeAbandon(model, context, board);
      case "browse":
        return this.executeBrowse(context, board);
      default:
        return this.fail(
          context,
          `Unknown job subcommand: ${model.subcommand}`,
          "unknown-subcommand",
        );
    }
  }

  /* ─────────────────────────── browse ─────────────────────────── */

  private async executeBrowse(
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const giver = context.commandGiver;
    const giverKey = giver.getTemplatePath() ?? "";
    const gigs = await ContractApi.openGigsOn(board.getTemplatePath() ?? "");
    if (gigs.length === 0) {
      this.send(
        context,
        Mml.compose`\nThe board is bare — nothing posted right now.\n`,
      );
      return;
    }
    const lines = gigs.map((gig) => this.describeGig(gig, giverKey));
    this.send(
      context,
      Mml.compose`\nPosted work:\n${lines.join("\n")}\n`,
    );
  }

  private describeGig(gig: ContractRecord, giverKey: string): string {
    const short = gig.contractId.slice(0, SHORT_ID_LEN);
    const condition = gig.clause?.condition;
    const what =
      condition?.item.kind === "chattel"
        ? `a marked item (${condition.item.chattelId.slice(0, 6)}…)`
        : leafOf(condition?.item.kind === "template" ? condition.item.path : "");
    const where = leafOf(condition?.destinationPath ?? "");
    const mode =
      gig.claimMode === "open-bounty"
        ? "open bounty — reward held in escrow"
        : gig.claimant
          ? gig.claimant === giverKey
            ? "claimed by you — reward held in escrow"
            : "claimed"
          : "exclusive, unclaimed";
    const expiry =
      gig.postingExpiresAt > 0 ? `, lapses at ${gig.postingExpiresAt}` : "";
    return `  [${short}] deliver ${what} to ${where} — ${gig.rewardMinor} credits (${mode}${expiry})`;
  }

  /* ──────────────────────────── post ──────────────────────────── */

  private async executePost(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const item = model.item?.stuff ?? null;
    if (!item) {
      return this.fail(
        context,
        `There's no '${model.item?.raw ?? "item"}' here to post about.`,
        "no-item",
      );
    }
    const reward = Number(model.reward);

    // Instance-bound when the exemplar carries a chattel id (deliver THIS
    // crate); else kind-bound on its template.
    const chattelId =
      MixinApi.isChattel(item) ? item.getChattelId() : "";
    const itemRef: ConditionData["item"] = chattelId
      ? { kind: "chattel", chattelId }
      : { kind: "template", path: item.getTemplatePath() ?? "" };

    // Destination: a reachable thing by name first, else treat the string
    // as a template path — ContractApi re-validates either way.
    const raw = (model.destination ?? "").trim();
    const reachable = MqlApi.resolveMany(raw, {
      commandGiver: context.commandGiver,
      scope: "reachable",
    }).stuff[0];
    const destinationPath = reachable?.getTemplatePath() ?? raw;

    const result = await ContractApi.post({
      boardPath: board.getTemplatePath() ?? "",
      condition: { template: "delivery", item: itemRef, destinationPath },
      rewardMinor: reward,
      claimMode: model.bounty ? "open-bounty" : "exclusive",
      asBusiness: model.business === true,
      ...(model.expires ? { expiresGameHours: Number(model.expires) } : {}),
    });
    if (!result.ok) {
      return this.fail(context, `The posting is refused: ${result.reason}.`, "contract-refused");
    }
    const short = result.contractId.slice(0, SHORT_ID_LEN);
    const escrowNote = model.bounty
      ? " The reward is already held in escrow."
      : " The reward locks into escrow when it's claimed.";
    this.send(
      context,
      Mml.compose`\nYou pin the job to the board — [${short}], ${reward} credits on completion.${escrowNote}\n`,
    );
  }

  /* ──────────────── claim / complete / abandon ─────────────────── */

  /** Resolve a gig id (or unique prefix) against this board's live gigs;
   * a bare id falls back to the giver's single active claim here. */
  private async resolveGigId(
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
    const giverKey = context.commandGiver.getTemplatePath() ?? "";
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

  private async executeClaim(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "claim");
    if (!id) return;
    const result = await ContractApi.claim(id);
    if (!result.ok) {
      return this.fail(context, `You can't claim that: ${result.reason}.`, "contract-refused");
    }
    this.send(
      context,
      Mml.compose`\nThe gig is yours — the reward is locked in escrow. Deliver, then \`fulfill\` at the drop or \`job complete\` here.\n`,
    );
  }

  private async executeComplete(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "complete");
    if (!id) return;
    const result = await ContractApi.complete(id);
    if (!result.ok) {
      return this.fail(
        context,
        `Nothing pays out: ${result.reason}.`,
        "contract-refused",
      );
    }
    // The payoff Scene — the world noticing the work.
    const giver = context.commandGiver;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The board verifies the work and pays out — ${result.paidMinor} credits, released from escrow to your account.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} turns a job in at the board and gets paid.`,
      )
      .send();
  }

  private async executeAbandon(
    model: JobModel,
    context: CommandContext,
    board: JobBoard,
  ): Promise<void> {
    const id = await this.resolveGigId(model, context, board, "abandon");
    if (!id) return;
    const result = await ContractApi.abandon(id);
    if (!result.ok) {
      return this.fail(context, `You can't abandon that: ${result.reason}.`, "contract-refused");
    }
    this.send(
      context,
      Mml.compose`\nYou strike your name off the gig. The escrow reverts — and the issuer will remember.\n`,
    );
  }

  /* ─────────────────────────── helpers ────────────────────────── */

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, message: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${message}`)
      .send();
    context.note({ kind: "controller-rejected", reason, detail: message });
  }
}

/** The last path segment, for prose ("/domain/lounge/bar" → "bar"). */
function leafOf(path: string): string {
  const leaf = path.split("/").filter(Boolean).pop();
  return leaf ?? "somewhere";
}
