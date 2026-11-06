/**
 * JobClaimController — `job claim <id>`: lock an exclusive gig to you, escrowing the reward.
 */

import type { CommandContext } from "../../../../api/command";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import { JobControllerBase, type JobModel } from "./JobControllerBase";

export default class JobClaimController extends JobControllerBase {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = this.boardOf(model.board, context);
    if (!board) return;
    const id = await this.resolveGigId(model, context, board, "claim");
    if (!id) return;
    const result = await ContractApi.claim(id);
    if (!result.ok) {
      return this.fail(context, `You can't claim that: ${result.reason}.`, "contract-refused");
    }
    this.send(
      context,
      Mml.compose`\nThe gig is yours — the reward is locked in escrow. Deliver, then \`job fulfill\` at the drop or \`job complete\` here.\n`,
    );
    }
}
