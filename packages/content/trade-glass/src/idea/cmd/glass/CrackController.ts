/**
 * CrackController — `crack [with <pipe>]`: crack the piece off the pipe.
 *
 * The gather plans it (`Gather.crackPlan`): a formed, still-workable
 * gather becomes its product with the moil beside it; anything else comes
 * off as cullet. This controller finds the gather on the bound pipe and
 * says it. The hot-work watch self-completes once the gather is gone.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult } from "@saxonberg/server/mud/api/mql";
import { Mml } from "@saxonberg/server/mud/api/mml";
import type Gather from "../../../thing/Gather";
import Blowpipe from "../../../thing/Blowpipe";

interface CrackModel extends CommandModel {
  pipe?: MqlManyResult;
}

export default class CrackController extends ManualBuildController<CrackModel> {
  async execute(model: CrackModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const gather = CrackController.gatherOn(model.pipe);
    if (!gather) {
      this.declineStep(context, Mml.compose`You have no gather on the pipe to crack off.`, "no-gather");
      return;
    }
    await this.engagePlan(context, gather.crackPlan(giver), {
      beginSelf: () => Mml.compose`You wet a line at the neck and crack the piece off the pipe.`,
      onRefused: () => Mml.compose`There is nothing left on the pipe to crack off.`,
      onDone: (f) =>
        f.kind === "piece"
          ? {
              self: Mml.compose`The piece cracks free: ${Mml.thing(f.product)} is yours, and a scrap of moil beside it.`,
              peers: Mml.compose`${Mml.actor(giver)} cracks a finished piece of glass off the pipe.`,
            }
          : null,
    });
  }

  /** The gather on a bound pipe. */
  protected static gatherOn(bound: MqlManyResult | undefined): Gather | null {
    for (const p of bound?.stuff ?? []) {
      if (p instanceof Blowpipe) {
        const g = p.getGather();
        if (g) return g;
      }
    }
    return null;
  }
}
