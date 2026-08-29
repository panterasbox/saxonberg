/**
 * GarnishController — `garnish <glass> with <x>` (the finishing step).
 *
 * An engaged finishing step that, at completion, moves the garnish INTO
 * the glass — a `CraftedDrink` is a `Container`, so the olive is a thing
 * in the martini and leaves with it (the same act the resolve path does
 * for a recipe's `garnish:`). A glass that can't hold things (a Dish)
 * keeps the flourish only.
 */

import { ManualBuildController } from "@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController";
import type { CommandContext, CommandModel } from "@saxonberg/server/mud/api/command";
import type { MqlOneResult } from "@saxonberg/server/mud/api/mql";
import { Mml } from "@saxonberg/server/mud/api/mml";
import { MessageApi } from "@saxonberg/server/mud/api/message";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";

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
        if (MixinApi.isContainer(glass) && MixinApi.isContainable(garnish)) {
          ContainmentApi.move(garnish, glass);
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You garnish ${Mml.thing(glass)} with ${Mml.thing(garnish)}.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} garnishes ${Mml.thing(glass)} with ${Mml.thing(garnish)}.`)
          .send();
      },
    });
  }
}
