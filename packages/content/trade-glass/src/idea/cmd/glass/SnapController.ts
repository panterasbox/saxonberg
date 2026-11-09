/**
 * SnapController — `snap <sheet>`: part a scribed sheet in two. Refuses an
 * unscribed sheet (nothing to part along). Yields two panes at half the
 * mass each, carrying the same glass (and so the same color). The snap
 * itself costs nothing — a clean score snaps clean (the loss chance is a
 * dial pinned at 0, a competence-priced failure rung is a follow-on).
 *
 * ⭐ I/O over the sheet's own cut (`Sheet.snapPlan` — a host
 * method, one host; controller-liquidity D14): the panes are the sheet's to make, the words
 * this controller's.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import Sheet, { type GlassCutRefusal } from "../../../thing/Sheet";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { Mml } from "@saxonberg/server/mud/api/mml";

interface SnapModel extends CommandModel {
  sheet?: MqlOneResult;
}

export default class SnapController extends ManualBuildController<SnapModel> {
  async execute(model: SnapModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const sheet = model.sheet?.stuff ?? null;
    if (!(sheet instanceof Sheet)) {
      this.declineStep(context, Mml.compose`Snap what? You need a sheet of glass.`, "no-sheet");
      return;
    }
    const out = sheet.snapPlan(giver);
    const refused = (r: GlassCutRefusal): ReturnType<typeof Mml.compose> => SnapController.refusalWords(r, sheet);
    if (!out.ok) {
      this.declineStep(context, refused(out), out.reason);
      return;
    }
    // ⚠ Awaited: the panes are LANDED (custody + capture), so the act
    // finishes when they are recorded, not a microtask later.
    await this.engagePlan(context, out, {
      // An instant act (`durationMs: 0`): nothing begins, it is done.
      beginSelf: () => Mml.compose``,
      onRefused: refused,
      onDone: (f) => ({
        self: Mml.compose`You tap along the score and ${f.sheetName} parts clean into two.`,
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
