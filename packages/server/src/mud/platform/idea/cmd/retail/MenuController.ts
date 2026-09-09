/**
 * MenuController — `menu`.
 *
 * Lists what the present house offers — the `Menu`'s recipes, the
 * `Tariff`'s services, or **both**. The menu is a thing in the room (it
 * afforded this verb, so it's usually `context.commandSource`); we fall
 * back to scanning the room. Discovery, not crafting — feasibility is
 * decided later, at `order`/`serve`/`mix` resolve.
 *
 * ⚠ Both slates read in one act, deliberately: a smithy that forges
 * knives and also mends them is the ordinary case, and the drive caught
 * the tariff shadowing the recipe menu when the tariff read returned.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { CraftingApi } from '../../../../api/crafting';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { RecipeKnowledge } from '../../../../lib/script/RecipeKnowledge';
import Menu from '../../../../lib/commerce/Menu';
import Tariff from '../../../thing/Tariff';
import { Money } from '../../../../lib/banking/Money';
import { Currency } from '../../../../lib/banking/Currency';

const TOPIC = 'act.deed';

interface MenuModel extends CommandModel {
  target?: MqlOneResult;
}

export default class MenuController extends CommandController<MenuModel> {
  async execute(model: MenuModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐⭐ A venue may sell BOTH, and `menu` is one act that reads both
    // slates. ⚠ The drive found this: the smithy's mending tariff HID
    // its forging menu, because reading the tariff returned. A house
    // that makes things and also mends them is the ordinary case (it is
    // the whole of W15's second-instance test), so the two blocks
    // compose rather than one shadowing the other.
    const blocks: string[] = [];

    const tariff = Tariff.resolveIn(context);
    const serviceKeys = tariff?.serviceKeys() ?? [];
    if (tariff && serviceKeys.length > 0) {
      const rows = serviceKeys
        .sort()
        .map((k) => {
          const price = tariff.priceFor(k);
          const money =
            price != null && price > 0
              ? Money.of(price, Currency.compact()).render()
              : 'no charge';
          return `  ${k} — ${money}`;
        })
        .join('\n');
      blocks.push(
        `${Mml.strong('The house does:').toString()}\n${Mml.escape(rows)}`,
      );
    }

    const menu = resolveMenu(model, context);
    if (menu) {
      const offered = await CraftingApi.offeredRecipes(menu);
      if (offered.length === 0) {
        blocks.push(Mml.escape('The menu is blank.'));
      } else {
        // Reading a recipe source marks it *known-of* — a chronicle claim
        // (idempotent: re-reading the menu doesn't duplicate). Known-of
        // lets you attempt the manual build; making it is the deed (the
        // ladder).
        for (const recipe of offered) {
          await RecipeKnowledge.noteKnown(giver, recipe.recipeId, recipe.name);
        }
        const lines = offered.map((r) => `  ${r.name}`).join('\n');
        blocks.push(
          `${Mml.strong('On the menu:').toString()}\n${Mml.escape(lines)}`,
        );
      }
    }

    if (blocks.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no menu here to read.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: 'menu' });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(blocks.join('\n\n')))
      .send();
  }
}

/** The named target (already MQL-bound), else the affording / reachable menu. */
function resolveMenu(model: MenuModel, context: CommandContext): Menu | null {
  const named = model.target?.stuff;
  if (named instanceof Menu) return named;
  return Menu.resolveIn(context);
}
