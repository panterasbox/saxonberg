/**
 * MakeController — `make <recipe> [with <brand>]`.
 *
 * Invokes a named recipe-script (a session `def`, or — once the
 * path-addressed store lands in P7 — authored recipe-script content),
 * binding its first param from `with <brand>`. The script runs paced by
 * the coroutine (its engaged steps trickle out); this controller just
 * dispatches it and declines diegetically when the recipe is unknown.
 *
 * The knowledge/deed gate (`make` declines a recipe you haven't learned)
 * lands in P9; v1 gates only on "is there a script of that name".
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { ScriptApi } from "../../../api/script";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface MakeModel extends CommandModel {
  recipe: string;
  brand?: string;
}

export default class MakeController extends CommandController<MakeModel> {
  async execute(model: MakeModel, context: CommandContext): Promise<void> {
    const args = model.brand ? [model.brand] : [];
    const invoked = await ScriptApi.invoke(model.recipe, args);
    if (!invoked) {
      MessageApi.scene(context.commandGiver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't know how to make '${model.recipe}'.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "unknown-recipe",
        detail: model.recipe,
      });
    }
    // On success the recipe-script runs detached/paced; its own steps
    // narrate. Pre-detach notes ride this command's envelope.
  }
}
