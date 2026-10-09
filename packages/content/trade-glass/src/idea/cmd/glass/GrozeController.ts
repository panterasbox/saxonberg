/**
 * GrozeController — `groze <sheet> [with <pliers>]`: nibble an edge of flat
 * glass to a line with the grozing pliers. Takes a little glass off as
 * dust (lost below the Scrap floor — not recoverable), and marks the sheet
 * grozed. An easy cold-shop act.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { AppApi } from "@saxonberg/server/mud/api/app";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import Sheet from "../../../thing/Sheet";
import { GLASSWORK_TOPIC } from "../../../thing/Gather";

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === "" || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

interface GrozeModel extends CommandModel {
  sheet?: MqlOneResult;
  pliers?: MqlManyResult;
}

export default class GrozeController extends ManualBuildController<GrozeModel> {
  execute(model: GrozeModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!sheet || !(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Groze what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const pliers = this.bestInstrument(model.pliers, "grozing");
    if (!pliers) {
      this.declineStep(context, Mml.compose`You need grozing pliers to nibble the edge.`, "no-pliers");
      return;
    }
    const off = dial("glass.cold.grozeKg", 0.02);
    const left = Math.max(0, sheet.getMass().rawValue() - off);
    sheet.setMass(Quantity.of(left, "kg"));
    sheet.setGrozed(true);
    MessageApi.scene(giver)
      .topic(GLASSWORK_TOPIC)
      .toSelf(Mml.compose`You nibble along the edge of ${Mml.thing(sheet)} with the pliers, the glass coming away as dust until the line is clean.`)
      .send();
    if (MixinApi.isAdvancing(giver)) {
      void giver.creditDeed({ discipline: "glasswork", difficulty: "easy", outcome: "success" });
    }
  }
}
