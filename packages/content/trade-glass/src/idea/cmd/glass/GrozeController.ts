/**
 * GrozeController — `groze <sheet> [with <pliers>]`: nibble an edge of flat
 * glass to a line with the grozing pliers. Takes a little glass off as
 * dust (lost below the Scrap floor — not recoverable), and marks the sheet
 * grozed. An easy cold-shop act.
 *
 * ⭐ I/O over the sheet's own cut (`CuttableMixin.cutPlan`, verb `groze` —
 * controllers-are-io D8c): the pliers are this verb's to find; how much
 * glass comes off (`glass.cold.grozeKg`) is the sheet's.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import type { GlassCutRefusal } from "@saxonberg/server/mud/lib/craft/Cuttable";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mml } from "@saxonberg/server/mud/api/mml";

interface GrozeModel extends CommandModel {
  sheet?: MqlOneResult;
  pliers?: MqlManyResult;
}

export default class GrozeController extends ManualBuildController<GrozeModel> {
  async execute(model: GrozeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!sheet || !MixinApi.isCuttable(sheet)) {
      this.declineStep(context, Mml.compose`Groze what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const pliers = this.bestInstrument(model.pliers, "grozing");
    if (!pliers) {
      this.declineStep(context, Mml.compose`You need grozing pliers to nibble the edge.`, "no-pliers");
      return;
    }
    const out = await sheet.cutPlan({ verb: "groze", actor: giver, tools: [pliers], raw: null, length: null, options: {} });
    if (out.verb !== "groze") throw new Error(`GrozeController: asked 'groze', answered '${out.verb}'`);
    const refused = (r: GlassCutRefusal): ReturnType<typeof Mml.compose> => GrozeController.refusalWords(r, sheet);
    if (!out.ok) {
      this.declineStep(context, refused(out), out.reason);
      return;
    }
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
      case "not-cuttable":
        return Mml.compose`Groze what? You need a sheet of glass.`;
      case "unscribed":
        return Mml.compose`There is no score line on ${Mml.thing(sheet)} to snap along. Scribe it first.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}
