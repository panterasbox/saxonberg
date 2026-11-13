/**
 * GrozeController — `groze <sheet> [with <pliers>]`: nibble an edge of flat
 * glass to a line with the grozing pliers. Takes a little glass off as
 * dust (lost below the Scrap floor — not recoverable), and marks the sheet
 * grozed. An easy cold-shop act.
 *
 * ⭐ I/O over the sheet's own cut (`Sheet.grozePlan` — a host
 * method, one host; controller-liquidity D14): the pliers are this verb's to find; how much
 * glass comes off (`glass.cold.grozeKg`) is the sheet's.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import Sheet, { type GlassCutRefusal } from "../../../thing/Sheet";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { Mml } from "@saxonberg/server/mud/api/mml";

interface GrozeModel extends CommandModel {
  sheet?: MqlOneResult;
  pliers?: MqlManyResult;
}

export default class GrozeController extends ManualBuildController<GrozeModel> {
  async execute(model: GrozeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Groze what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const pliers = this.bestInstrument(model.pliers, "grozing");
    if (!pliers) {
      this.declineStep(context, Mml.compose`You need grozing pliers to nibble the edge.`, "no-pliers");
      return;
    }
    const out = sheet.grozePlan(giver);
    const refused = (r: GlassCutRefusal): ReturnType<typeof Mml.compose> => GrozeController.refusalWords(r, sheet);
    await this.engagePlan(context, out, {
      // An instant act (`durationMs: 0`): nothing begins, it is done.
      beginSelf: () => Mml.compose``,
      onRefused: refused,
      onDone: () => ({
        self: Mml.compose`You nibble along the edge of ${Mml.thing(sheet)} with the pliers, the glass coming away as dust until the line is clean.`,
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
