/**
 * OrderController — `order <cocktail> [with <brand>]`.
 *
 * The customer side. Resolves the order off the present `Menu`, then has the
 * fulfilling bartender (a present `MakerMixin` agent, resolved inside
 * `CraftingLogic`) make it — the maker is **never** off the wire (the giver
 * here is the patron). The drink is handed to the patron.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import Menu from '../../Menu';

const TOPIC = 'world.narration.action';

interface OrderModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

export default class OrderController extends CraftController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const menu = resolveMenu(context);
    if (!menu) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nowhere to order from here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'cocktail', query: model.cocktail });
      return;
    }

    const recipeId = await menu.resolveOrder(model.cocktail);
    if (!recipeId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`"${model.cocktail}" isn't on the menu.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-on-menu',
        detail: model.cocktail,
      });
      return;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: recipeId,
      makerMode: 'fulfilling-bartender',
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
      .toSelf(Mml.compose`${Mml.item(drink)} is set down in front of you.`)
      .toPeers(Mml.compose`${Mml.name(giver)} is served ${Mml.item(drink)}.`)
      .send();
  }
}

/** The affording menu, else the first menu in the room. */
function resolveMenu(context: CommandContext): Menu | null {
  if (context.commandSource instanceof Menu) return context.commandSource;
  const loc = context.location;
  if (loc && MixinApi.isContainer(loc)) {
    for (const c of ContainmentApi.getContents(loc)) {
      if (c instanceof Menu) return c;
    }
  }
  return null;
}
