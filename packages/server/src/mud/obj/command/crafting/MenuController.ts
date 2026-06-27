/**
 * MenuController — `menu`.
 *
 * Lists the cocktails the present `Menu` offers. The menu is a thing in the
 * room (it afforded this verb, so it's usually `context.commandSource`); we
 * fall back to scanning the room. Discovery, not crafting — feasibility is
 * decided later, at `order`/`serve`/`mix` resolve.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { CraftingApi } from '../../../api/crafting';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import Menu from '../../Menu';

const TOPIC = 'world.narration.action';

interface MenuModel extends CommandModel {
  target?: MqlOneResult;
}

export default class MenuController extends CommandController<MenuModel> {
  async execute(model: MenuModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const menu = resolveMenu(model, context);
    if (!menu) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no menu here to read.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: 'menu' });
      return;
    }

    const offered = await CraftingApi.offeredRecipes(menu);
    if (offered.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The menu is blank.`)
        .send();
      return;
    }

    const lines = offered.map((r) => `  ${r.name}`).join('\n');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`On the menu:\n${lines}`)
      .send();
  }
}

/** The named target, else the affording menu, else the first menu in the room. */
function resolveMenu(model: MenuModel, context: CommandContext): Menu | null {
  const named = model.target?.stuff;
  if (named instanceof Menu) return named;
  if (context.commandSource instanceof Menu) return context.commandSource;
  const loc = context.location;
  if (loc && MixinApi.isContainer(loc)) {
    for (const c of ContainmentApi.getContents(loc)) {
      if (c instanceof Menu) return c;
    }
  }
  return null;
}
