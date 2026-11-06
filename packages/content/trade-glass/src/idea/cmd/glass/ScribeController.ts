/**
 * ScribeController — `scribe <sheet> [with <wheel>]`: run a score line in
 * flat glass so it can be snapped or opened flat. An easy cold-shop act.
 *
 * ⭐ I/O over the sheet's own cut (`CuttableMixin.cutPlan`, verb `scribe` —
 * controllers-are-io D8c): the wheel is this verb's to find, what the score
 * does to the glass is the sheet's, and the words are this controller's.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult, MqlManyResult } from "@saxonberg/server/mud/api/mql";
import type { GlassCutRefusal } from "@saxonberg/server/mud/lib/craft/Cuttable";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { Mml } from "@saxonberg/server/mud/api/mml";

interface ScribeModel extends CommandModel {
  sheet?: MqlOneResult;
  wheel?: MqlManyResult;
}

export default class ScribeController extends ManualBuildController<ScribeModel> {
  async execute(model: ScribeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!sheet || !MixinApi.isCuttable(sheet)) {
      this.declineStep(context, Mml.compose`Scribe what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const wheel = this.bestInstrument(model.wheel, "scribing");
    if (!wheel) {
      this.declineStep(context, Mml.compose`You need a scribing wheel to score the glass.`, "no-wheel");
      return;
    }
    const out = await sheet.cutPlan({ verb: "scribe", actor: giver, tools: [wheel], raw: null, length: null, options: {} });
    if (out.verb !== "scribe") throw new Error(`ScribeController: asked 'scribe', answered '${out.verb}'`);
    const refused = (r: GlassCutRefusal): ReturnType<typeof Mml.compose> => ScribeController.refusalWords(r, sheet);
    if (!out.ok) {
      this.declineStep(context, refused(out), out.reason);
      return;
    }
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
      case "not-cuttable":
        return Mml.compose`Scribe what? You need a sheet of glass.`;
      case "unscribed":
        return Mml.compose`There is no score line on ${Mml.thing(sheet)} to snap along. Scribe it first.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}
