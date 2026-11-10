/**
 * FlattenController — `flatten <cylinder> [at <furnace>]`: open a scored
 * cylinder flat into a window pane, softening it at the furnace. The
 * medieval broad-glass finish. A durative step; the cylinder must be
 * scribed and the furnace hot enough to soften the glass.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult, MqlOneResult } from "@saxonberg/server/mud/api/mql";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Sheet, { type FlattenRefusal } from "../../../thing/Sheet";

interface FlattenModel extends CommandModel {
  cylinder?: MqlOneResult;
  furnace?: MqlManyResult;
}

export default class FlattenController extends ManualBuildController<FlattenModel> {
  async execute(model: FlattenModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const cyl = model.cylinder?.stuff ?? null;
    if (!(cyl instanceof Sheet)) {
      this.declineStep(context, FlattenController.refusalWords({ ok: false, reason: "not-a-cylinder" }), "no-cylinder");
      return;
    }
    const plan = cyl.flattenPlanAt(model.furnace?.stuff ?? [], giver);
    if (!plan.ok) {
      this.declineStep(context, FlattenController.refusalWords(plan), plan.reason === "not-a-cylinder" ? "no-cylinder" : plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You soften ${Mml.thing(cyl)} at the furnace and open it out flat.`,
      onRefused: (r) => FlattenController.refusalWords(r),
      onDone: () => ({ self: Mml.compose`The cylinder opens out into a flat pane of glass.` }),
    });
  }

  protected static refusalWords(r: FlattenRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case "not-a-cylinder":
        return Mml.compose`Flatten what? You need a scored glass cylinder.`;
      case "unscribed":
        return Mml.compose`Scribe the cylinder down its length first, so it can open out.`;
      case "no-furnace":
        return Mml.compose`You need a lit furnace hot enough to soften the glass before it will open flat.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }
}
