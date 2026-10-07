/**
 * ShapeController — `shape <bottle|cylinder> [with <pipe>]`: blow and jack
 * the gather into a form, in one durative step. The blow and the tools are
 * folded into the act (`blow` is a whistle's verb; `shape` is the
 * glassmaker's whole forming move).
 *
 * ⭐ The hot-work window bites HERE: `onComplete` re-validates the gather
 * at the commit point (the framework's lazy-revalidation doctrine applied
 * to a precondition that decays continuously). Dawdle so the gather goes
 * past working during the step and the piece is lost.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlManyResult } from "@saxonberg/server/mud/api/mql";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { Mml } from "@saxonberg/server/mud/api/mml";
import Gather, { type GatherForm, GLASSWORK_TOPIC } from "../../../thing/Gather";

const SHAPE_MS = 10_000;
const SHAPE_W = 250;
const FORMS: readonly GatherForm[] = ["bottle", "cylinder"];

interface ShapeModel extends CommandModel {
  form?: string;
  pipe?: MqlManyResult;
}

/** The gather on the first bound pipe that is carrying one. */
function gatherOn(bound: MqlManyResult | undefined): Gather | null {
  for (const p of bound?.stuff ?? []) {
    if (!MixinApi.isContainer(p)) continue;
    const g = p.getContents().find((c) => c instanceof Gather);
    if (g) return g as Gather;
  }
  return null;
}

export default class ShapeController extends ManualBuildController<ShapeModel> {
  execute(model: ShapeModel, context: CommandContext): void {
    const form = (model.form ?? "").toLowerCase();
    if (!FORMS.includes(form as GatherForm)) {
      this.declineStep(
        context,
        Mml.compose`Shape it into what? A bottle, or a cylinder for a pane.`,
        "no-form",
      );
      return;
    }
    const gather = gatherOn(model.pipe);
    if (!gather) {
      this.declineStep(
        context,
        Mml.compose`You have no gather on the pipe to shape.`,
        "no-gather",
      );
      return;
    }
    if (!gather.isWorkable()) {
      void gather.loseToCullet(context.commandGiver, "It has already set hard.");
      return;
    }

    this.engageStep(context, {
      durationMs: SHAPE_MS,
      effortW: SHAPE_W,
      beginSelf: Mml.compose`You put the pipe to your lips and your tools to the glass, working it toward a ${Mml.fromMarkup(form)}.`,
      beginPeers: Mml.compose`${Mml.actor(context.commandGiver)} works a gather of hot glass.`,
      onComplete: () => {
        if (gather.isDestroyed()) return;
        // ⭐ Re-validate at the commit point: if it cooled past working
        // during the step, the piece is lost.
        if (!gather.isWorkable()) {
          void gather.loseToCullet(context.commandGiver, "It set before you were done.");
          return;
        }
        gather.setForm(form as GatherForm);
        MessageApi.scene(context.commandGiver)
          .topic(GLASSWORK_TOPIC)
          .toSelf(Mml.compose`The glass takes the form of a ${Mml.fromMarkup(form)}. Crack it off while it holds.`)
          .send();
      },
    });
  }
}
