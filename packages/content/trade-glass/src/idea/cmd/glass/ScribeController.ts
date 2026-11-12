/**
 * ScribeController — `scribe <sheet> [with <wheel>]`: run a score line in
 * flat glass so it can be snapped or opened flat. An easy cold-shop act.
 *
 * ⭐ I/O over the sheet's own cut (`Sheet.scribePlan` — a host
 * method, one host; controller-liquidity D14): the wheel is this verb's to find, what the score
 * does to the glass is the sheet's, and the words are this controller's.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import Sheet, { type GlassCutRefusal } from "../../../thing/Sheet";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { Mml } from "@saxonberg/server/mud/api/mml";

interface ScribeModel extends CommandModel {
  sheet?: MqlOneResult;
  wheel?: MqlManyResult;
}

export default class ScribeController extends ManualBuildController<ScribeModel> {
  async execute(model: ScribeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Scribe what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const wheel = this.bestInstrument(model.wheel, "scribing");
    if (!wheel) {
      this.declineStep(context, Mml.compose`You need a scribing wheel to score the glass.`, "no-wheel");
      return;
    }
    const out = sheet.scribePlan(giver);
    const refused = (r: GlassCutRefusal): ReturnType<typeof Mml.compose> => ScribeController.refusalWords(r, sheet);
    await this.engagePlan(context, out, {
      // An instant act (`durationMs: 0`): nothing begins, it is done.
      beginSelf: () => Mml.compose``,
      onRefused: refused,
      onDone: () => ({
        self: Mml.compose`You run the wheel across ${Mml.thing(sheet)}, scoring a clean line. It will part along it now.`,
      }),
    });
  }

  /** ⭐ Every reason the sheet refuses a cut (D4). */
  private static refusalWords(r: GlassCutRefusal, sheet: Stuff): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case "unscribed":
        return Mml.compose`There is no score line on ${Mml.thing(sheet)} to snap along. Scribe it first.`;
      // ⚠ One reason today, so the switch is exhaustive without a `never`
      // arm (a one-member union does not narrow to `never`); a second
      // reason is a compile error here until it is worded.
    }
  }
}
