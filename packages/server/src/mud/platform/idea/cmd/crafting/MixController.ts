/**
 * MixController — `mix <cocktail> [with <brand>]`.
 *
 * A maker verb (maker = the giver, via `makerMode: 'self'`). Makes the
 * cocktail from reachable matter and keeps it. General to any agent.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CraftingApi } from '../../../../api/crafting';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface MixModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

export default class MixController extends CraftController<MixModel> {
  async execute(model: MixModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    const outcome = await CraftingApi.craft({
      recipeRef: model.cocktail,
      makerMode: 'self',
      brand: model.brand,
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const drink = outcome.output;
    if (MixinApi.isContainable(drink) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(drink, giver);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You mix ${Mml.thing(drink)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} mixes ${Mml.thing(drink)}.`)
      .send();
  }
}
