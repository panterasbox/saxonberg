/**
 * MakeController — `make <recipe> [with <brand>]`.
 *
 * Invokes a named recipe-script (a session `def`, or — once the
 * path-addressed store lands in P7 — authored recipe-script content),
 * binding its first param from `with <brand>`. The script runs paced by
 * the coroutine (its engaged steps trickle out); this controller just
 * dispatches it and declines diegetically when the recipe is unknown.
 *
 * Deed-gated via the shared `CraftController.requireDeed` (a catalogue
 * recipe declines until the can-make deed exists; a player's own `def`
 * passes ungated).
 */

import { CraftController } from "./CraftController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { ScriptApi } from "../../../api/script";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "act.deed";

interface MakeModel extends CommandModel {
  recipe: string;
  brand?: string;
}

export default class MakeController extends CraftController<MakeModel> {
  async execute(model: MakeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The knowledge gate: a **catalogue** recipe can only be made once
    // you've *learned* it (the can-make deed — the first faithful hand
    // build). A player's own non-catalogue `def` resolves to no recipe
    // view, so it's ungated (you wrote it). The book isn't enough.
    if (!(await this.requireDeed(context, model.recipe, "make"))) return;

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
