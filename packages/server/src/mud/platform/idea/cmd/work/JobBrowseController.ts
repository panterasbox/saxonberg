/**
 * JobBrowseController — bare `job` (and `job --origin here`, the backhaul read): the live gigs on this board, or what wants moving OUT of where you stand.
 */

import type { CommandContext } from "../../../../api/command";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import type { ContractRecord } from "../../../../lib/employment/ContractRecord";
import { SHORT_ID_LEN } from "./JobControllerBase";
import { JobControllerBase, type JobModel } from "./JobControllerBase";

export default class JobBrowseController extends JobControllerBase {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = this.boardOf(model.board, context);
    if (!board) return;
    const giver = context.commandGiver;
    const giverKey = giver.getIdentityPath() ?? "";

    // ⭐ `jobs --origin here` is the BACKHAUL read (D17): a hauler at the
    // far end of a corridor asking what wants moving back. It is a
    // different question from "what hangs on this board" — the return
    // load is posted wherever the shipper is, not where you are standing
    // — so it reads by origin rather than by board.
    const originRaw = (model.origin ?? "").trim();
    if (originRaw) {
      const originPath = await this.place(originRaw, context);
      const back = await ContractApi.openGigsFrom(originPath);
      if (back.length === 0) {
        this.send(
          context,
          Mml.compose`\nNothing wants moving out of ${this.leafOf(originPath)} right now — you would go back empty.\n`,
        );
        return;
      }
      this.send(
        context,
        Mml.compose`\nWanting carriage out of ${this.leafOf(originPath)}:\n${back
          .map((gig) => this.describeGig(gig, giverKey))
          .join("\n")}\n`,
      );
      return;
    }

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
        : condition?.item.kind === "identity"
          ? this.leafOf(condition.item.identityPath)
          : this.leafOf(condition?.item.kind === "template" ? condition.item.path : "");
    const where = this.leafOf(condition?.destinationPath ?? "");
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
    if (condition?.template === "watch") {
      // ⭐⭐ The watch read-out, and it is what REPLACED the `watch` verb.
      // Standing a post has no command — the engine looks — so the hours
      // have to be legible somewhere or a guard cannot tell whether they
      // are earning. This line is that somewhere.
      return (
        `  [${short}] watch ${where} — ${this.watchProgress(gig)} ` +
        `— ${gig.rewardMinor} credits (${mode}${expiry})`
      );
    }
    if (condition?.template === "clean") {
      const subject =
        condition.item.kind === "template" &&
        condition.item.path === condition.destinationPath
          ? where
          : `${what} at ${where}`;
      return `  [${short}] clean ${subject} — ${gig.rewardMinor} credits (${mode}${expiry})`;
    }
    return `  [${short}] deliver ${what} to ${where} — ${gig.rewardMinor} credits (${mode}${expiry})`;
  }

  /** `3 of 8 hours stood` — game-hours served against the term. */
  private watchProgress(gig: ContractRecord): string {
    const asked = Math.max(0, gig.clause?.condition?.gameHours ?? 0);
    const served = Math.floor((gig.watchedSec ?? 0) / 3600);
    return `${served} of ${asked} hours stood`;
  }
}
