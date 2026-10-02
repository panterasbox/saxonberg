/**
 * MixController — `mix <cocktail> [with <brand>]`.
 *
 * A maker verb (maker = the giver, via `makerMode: 'self'`). Makes the
 * cocktail from reachable matter and keeps it. General to any agent.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface MixModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

export default class MixController extends CraftController<MixModel> {
  async execute(model: MixModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐ The knowledge gate, same as `make`/`cook`/`forge`/`bake`: you
    // cannot mix what you have never made. Reading the menu is a
    // claim; the first faithful hand build is the deed. ⚠ `mix` shipped
    // UNGATED — so a player who had read the board could mix a Negroni
    // they had never made, while `make` refused them the same drink.
    if (!(await this.requireDeed(context, model.cocktail, 'mix'))) return;

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
