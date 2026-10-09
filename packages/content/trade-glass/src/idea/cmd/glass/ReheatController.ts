/**
 * ReheatController — `reheat [at <furnace>] [with <pipe>]`: put the gather
 * back in the glory hole to re-open the window. A short step whose
 * completion sets the gather to the furnace's held heat — the one move
 * that buys more time, at the cost of fuel and a trip to the furnace.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult } from "@saxonberg/server/mud/api/mql";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import type { Burner } from "@saxonberg/server/mud/lib/fire/Burner";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Gather, { GLASSWORK_TOPIC } from "../../../thing/Gather";

const REHEAT_MS = 3_000;
const REHEAT_W = 120;
const CEILING_K = 1450;

interface ReheatModel extends CommandModel {
  furnace?: MqlManyResult;
  pipe?: MqlManyResult;
}

function gatherOn(bound: MqlManyResult | undefined): Gather | null {
  for (const p of bound?.stuff ?? []) {
    if (!MixinApi.isContainer(p)) continue;
    const g = p.getContents().find((c) => c instanceof Gather);
    if (g) return g as Gather;
  }
  return null;
}

function litFurnace(bound: MqlManyResult | undefined): (Stuff & Burner) | null {
  for (const f of bound?.stuff ?? []) {
    if (MixinApi.isBurner(f) && f.isLit() && f.getHeldTemperatureK() > 0) {
      return f as Stuff & Burner;
    }
  }
  return null;
}

export default class ReheatController extends ManualBuildController<ReheatModel> {
  execute(model: ReheatModel, context: CommandContext): void {
    const gather = gatherOn(model.pipe);
    if (!gather) {
      this.declineStep(
        context,
        Mml.compose`You have no gather on the pipe to reheat.`,
        "no-gather",
      );
      return;
    }
    const furnace = litFurnace(model.furnace);
    if (!furnace) {
      this.declineStep(
        context,
        Mml.compose`You need a lit, fuelled furnace — a glory hole — to reheat the glass in.`,
        "no-furnace",
      );
      return;
    }
    const held = furnace.getHeldTemperatureK();

    this.engageStep(context, {
      durationMs: REHEAT_MS,
      effortW: REHEAT_W,
      beginSelf: Mml.compose`You hold the gather back into ${Mml.thing(furnace as unknown as Stuff)} to take up the heat again.`,
      onComplete: () => {
        if (gather.isDestroyed()) return;
        gather.setContentsTemperature(Math.min(held, CEILING_K));
        MessageApi.scene(context.commandGiver)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`The glass glows up again, soft and workable. The window is open once more.`)
          .send();
      },
    });
  }
}
