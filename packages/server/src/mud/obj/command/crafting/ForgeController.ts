/**
 * ForgeController — `forge <item> [with <metal>]`.
 *
 * The smithing one-shot: the earned shorthand over the same craft-resolve
 * the by-hand path performs. Maker = the giver (`makerMode: 'self'`);
 * **deed-gated** on the `RecipeKnowledge` can-make deed (the MakeController
 * gate — reading the recipe is a claim, only the first faithful hand build
 * earns the shorthand; `order` stays ungated). `with <metal>` steers the
 * stock pick exactly as the bar's `with <brand>`.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'act.deed';

interface ForgeModel extends CommandModel {
  item: string;
  brand?: string;
}

export default class ForgeController extends CraftController<ForgeModel> {
  async execute(model: ForgeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // The knowledge gate: the one-shot is earned by the hands, not the
    // book — a catalogue recipe declines until the can-make deed exists.
    if (!(await this.requireDeed(context, model.item, 'forge'))) return;

    const outcome = await CraftingApi.craft({
      recipeRef: model.item,
      makerMode: 'self',
      brand: model.brand,
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
      .toSelf(Mml.compose`You forge ${Mml.item(output)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} forges ${Mml.item(output)}.`)
      .send();
  }
}
