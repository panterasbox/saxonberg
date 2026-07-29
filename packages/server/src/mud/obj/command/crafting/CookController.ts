/**
 * CookController — `cook <dish>`.
 *
 * The cooking one-shot: the earned shorthand over the same craft-resolve
 * the by-hand path performs. Maker = the giver (`makerMode: 'self'`);
 * **deed-gated** on the `RecipeKnowledge` can-make deed (the MakeController
 * gate — the book/menu gives the claim, the hands earn the shorthand;
 * `order` stays ungated).
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { RecipeKnowledge } from '../../../lib/script/RecipeKnowledge';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

interface CookModel extends CommandModel {
  dish: string;
}

export default class CookController extends CraftController<CookModel> {
  async execute(model: CookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const view = await CraftingApi.lookupRecipe(model.dish);
    if (view && !(await RecipeKnowledge.canMake(giver, view.recipeId))) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You've heard of ${view.name}, but you haven't learned to cook it — work it by hand first.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-learned',
        detail: model.dish,
      });
      return;
    }

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
      .toSelf(Mml.compose`You cook ${Mml.item(output)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} cooks ${Mml.item(output)}.`)
      .send();
  }
}
