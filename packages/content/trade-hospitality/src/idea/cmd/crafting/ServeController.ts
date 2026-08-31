/**
 * ServeController — `serve <patron> <cocktail> [with <brand>]`.
 *
 * A maker verb (maker = the giver, via `makerMode: 'self'`). Makes the
 * cocktail from reachable matter and hands it to the patron. General to any
 * agent — only the economic gating (charging for the stock) is deferred.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';

interface ServeModel extends CommandModel {
  patron: MqlOneResult;
  cocktail: string;
  brand?: string;
}

export default class ServeController extends CraftController<ServeModel> {
  async execute(model: ServeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const patron = model.patron.stuff;
    if (!patron) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.patron.raw}' to serve.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patron', query: model.patron.raw });
      return;
    }

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
    if (MixinApi.isContainable(drink) && MixinApi.isContainer(patron)) {
      ContainmentApi.move(drink, patron);
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You make ${Mml.thing(drink)} and hand it to ${Mml.actor(patron)}.`)
      .toTarget(patron, Mml.compose`${Mml.actor(giver)} makes you ${Mml.thing(drink)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} serves ${Mml.actor(patron)} ${Mml.thing(drink)}.`)
      .send();
  }
}
