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
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import Menu from '../../../../lib/commerce/Menu';
import { Money } from '../../../../lib/banking/Money';
import { BankingApi } from '../../../../api/banking';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { PricedOffer } from '../../../../lib/commerce/PricedOffer';

const TOPIC = 'act.deed';

interface MenuModel extends CommandModel {
  /** The tariff board — bound by the view, `from`-addressable. */
  counter?: MqlOneResult;
  /** The recipe menu — bound by the view, `off`-addressable. */
  menu?: MqlOneResult;
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

    // ⭐ Bound by the view, not hunted for here; what each board offers
    // is the board's (`PricedOffer.offerings`) — this words it.
    const tariff = (model.counter?.stuff ?? null) as (Stuff & PricedOffer) | null;
    const services = tariff
      ? (await tariff.offerings(giver)).filter((o) => o.kind === 'service')
      : [];
    if (services.length > 0) {
      const rows = services
        .map((o) => {
          const money =
            o.price != null && o.price > 0
              ? Money.of(o.price, BankingApi.compactCurrency()).render()
              : 'no charge';
          return `  ${o.key} — ${money}`;
        })
        .join('\n');
      blocks.push(
        `${Mml.strong('The house does:').toString()}\n${Mml.escape(rows)}`,
      );
    }

    const menu = MenuController.menuOf(model);
    if (menu) {
      const recipes = (await menu.offerings(giver)).filter((o) => o.kind === 'recipe');
      if (recipes.length === 0) {
        blocks.push(Mml.escape('The menu is blank.'));
      } else {
        const lines = recipes.map((r) => `  ${r.name}`).join('\n');
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

  /** The named menu (already MQL-bound), else the affording / reachable one. */
  protected static menuOf(model: MenuModel): Menu | null {
    const named = model.target?.stuff;
    if (named instanceof Menu) return named;
    return (model.menu?.stuff ?? null) as Menu | null;
  }
}
