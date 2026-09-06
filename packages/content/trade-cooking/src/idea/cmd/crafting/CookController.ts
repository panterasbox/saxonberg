/**
 * CookController — `cook <dish>`.
 *
 * The cooking one-shot: the earned shorthand over the same craft-resolve
 * the by-hand path performs. Maker = the giver (`makerMode: 'self'`);
 * **deed-gated** on the `RecipeKnowledge` can-make deed (the MakeController
 * gate — the book/menu gives the claim, the hands earn the shorthand;
 * `order` stays ungated).
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface CookModel extends CommandModel {
  dish: string;
}

export default class CookController extends CraftController<CookModel> {
  async execute(model: CookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The knowledge gate: the book/menu gives the claim, the hands earn
    // the shorthand (the shared `requireDeed` gate).
    if (!(await this.requireDeed(context, model.dish, 'cook'))) return;

    const outcome = await CraftingApi.craft({
      recipeRef: model.dish,
      makerMode: 'self',
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const output = outcome.output;
    if (MixinApi.isContainable(output) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(output, giver);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You cook ${Mml.thing(output)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} cooks ${Mml.thing(output)}.`)
      .send();
  }
}
