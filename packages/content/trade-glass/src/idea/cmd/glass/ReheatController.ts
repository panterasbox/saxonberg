/**
 * ReheatController — `reheat [at <furnace>] [with <pipe>]`: put the gather
 * back in the glory hole to re-open the window — the one move that buys
 * more time, at the cost of fuel and a trip to the furnace.
 *
 * The gather plans it (`Gather.reheatPlanAt`); this says it.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult } from "@saxonberg/server/mud/api/mql";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Blowpipe from "../../../thing/Blowpipe";
import type { ReheatRefusal } from "../../../thing/Gather";

interface ReheatModel extends CommandModel {
  furnace?: MqlManyResult;
  pipe?: MqlManyResult;
}

export default class ReheatController extends ManualBuildController<ReheatModel> {
  async execute(model: ReheatModel, context: CommandContext): Promise<void> {
    const pipe = (model.pipe?.stuff ?? []).find((p) => p instanceof Blowpipe && p.getGather() !== null) as Blowpipe | undefined;
    const gather = pipe?.getGather() ?? null;
    if (!gather) {
      this.declineStep(context, Mml.compose`You have no gather on the pipe to reheat.`, "no-gather");
      return;
    }
    const plan = gather.reheatPlanAt(model.furnace?.stuff ?? []);
    if (!plan.ok) {
      this.declineStep(context, ReheatController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b) => Mml.compose`You hold the gather back into ${Mml.thing(b.furnace)} to take up the heat again.`,
      onRefused: (r) => ReheatController.refusalWords(r),
      onDone: () => ({ self: Mml.compose`The glass glows up again, soft and workable. The window is open once more.` }),
    });
  }

  protected static refusalWords(r: ReheatRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case "no-furnace":
        return Mml.compose`You need a lit, fuelled furnace — a glory hole — to reheat the glass in.`;
      case "gone":
        return Mml.compose`There is no gather left on the pipe.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
