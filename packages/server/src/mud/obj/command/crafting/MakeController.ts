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
import { CraftingApi } from "../../../api/crafting";
import { RecipeKnowledge } from "../../../lib/script/RecipeKnowledge";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface MakeModel extends CommandModel {
  recipe: string;
  brand?: string;
}

export default class MakeController extends CommandController<MakeModel> {
  async execute(model: MakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The knowledge gate: a **catalogue** recipe can only be made once
    // you've *learned* it (the can-make deed — the first faithful hand
    // build). A player's own non-catalogue `def` resolves to no recipe
    // view, so it's ungated (you wrote it). The book isn't enough.
    const view = await CraftingApi.lookupRecipe(model.recipe);
    if (view && !(await RecipeKnowledge.canMake(giver, view.recipeId))) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You've heard of ${view.name}, but you haven't learned to make it — try building it by hand first.`,
        )
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-learned",
        detail: model.recipe,
      });
      return;
    }

    const args = model.brand ? [model.brand] : [];
    const invoked = await ScriptApi.invoke(model.recipe, args);
    if (!invoked) {
      MessageApi.scene(giver)
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
