/**
 * JobAbandonController — `job abandon [id]`: walk away (breach) — the escrow reverts, and the issuer remembers.
 */

import type { CommandContext } from "../../../../api/command";
import { ContractApi } from "../../../../api/contract";
import { Mml } from "../../../../api/mml";
import { JobControllerBase, type JobModel } from "./JobControllerBase";

export default class JobAbandonController extends JobControllerBase {
  async execute(model: JobModel, context: CommandContext): Promise<void> {
    const board = this.boardOf(model.board, context);
    if (!board) return;
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
}
