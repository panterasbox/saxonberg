/**
 * ScribeController — `scribe <sheet> [with <wheel>]`: run a score line in
 * flat glass so it can be snapped or opened flat. An easy cold-shop act.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Sheet from "../../../thing/Sheet";
import { GLASSWORK_TOPIC } from "../../../thing/Gather";

interface ScribeModel extends CommandModel {
  sheet?: MqlOneResult;
  wheel?: MqlManyResult;
}

export default class ScribeController extends ManualBuildController<ScribeModel> {
  execute(model: ScribeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!sheet || !(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Scribe what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const wheel = this.bestInstrument(model.wheel, "scribing");
    if (!wheel) {
      this.declineStep(context, Mml.compose`You need a scribing wheel to score the glass.`, "no-wheel");
      return;
    }
    sheet.setScribed(true);
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`You run the wheel across ${Mml.thing(sheet)}, scoring a clean line. It will part along it now.`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      void giver.creditDeed({ discipline: "glasswork", difficulty: "easy", outcome: "success" });
    }
  }
}
