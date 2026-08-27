/**
 * GarnishController — `garnish <glass> with <x>` (the finishing flourish).
 *
 * An engaged finishing step: it narrates adding the garnish to the drink.
 * v1 keeps it a flourish — the garnish-as-physically-attached item (a
 * twist resting on the rim, an olive in the glass) is a refinement once
 * the glass carries a surface/holder for it; the verb + the engaged time
 * are real now.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { Mml } from "../../../../api/mml";
import { MessageApi } from "../../../../api/message";

const TOPIC = "act.deed";
const GARNISH_MS = 1500;

interface GarnishModel extends CommandModel {
  glass: MqlOneResult;
  garnish: MqlOneResult;
}

export default class GarnishController extends ManualBuildController<GarnishModel> {
  execute(model: GarnishModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const glass = model.glass?.stuff ?? null;
    const garnish = model.garnish?.stuff ?? null;
    if (!glass) {
      this.declineStep(context, Mml.compose`Garnish what?`, "no-glass");
      return;
    }
    if (!garnish) {
      this.declineStep(
        context,
        Mml.compose`Garnish it with what?`,
        "no-garnish",
      );
      return;
    }

    this.engageStep(context, {
      durationMs: GARNISH_MS,
      beginSelf: Mml.compose`You reach for ${Mml.thing(garnish)} to finish ${Mml.thing(glass)}.`,
      onComplete: () => {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You garnish ${Mml.thing(glass)} with ${Mml.thing(garnish)}.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} garnishes ${Mml.thing(glass)} with ${Mml.thing(garnish)}.`)
          .send();
      },
    });
  }
}
