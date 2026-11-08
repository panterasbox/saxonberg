/**
 * JobCompleteController — `job complete [id]`: the redeem beat — payday at the board.
 */

import type { CommandContext } from "../../../../api/command";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import { MessageApi } from "../../../../api/message";
import { TOPIC } from "./JobControllerBase";
import { JobControllerBase, type JobModel } from "./JobControllerBase";

export default class JobCompleteController extends JobControllerBase {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = this.boardOf(model.board, context);
    if (!board) return;
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
        Mml.compose`${Mml.actor(giver)} turns a job in at the board and gets paid.`,
      )
      .send();
    }
}
