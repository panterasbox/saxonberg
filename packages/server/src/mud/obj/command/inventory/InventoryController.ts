/**
 * InventoryController — list items the giver is carrying.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

export default class InventoryController extends CommandController {
  execute(_model: CommandModel, context: CommandContext): void {
    const actor = context.commandGiver;
    if (!MixinApi.isContainer(actor)) {
      MessageApi.scene(actor)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You have no inventory.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'ContainerMixin' });
      return;
    }
    const contents = actor.getContents();

    let body: Mml;
    if (contents.length === 0) {
      body = Mml.compose`\nYou are not carrying anything.\n`;
    } else {
      const items = contents.map((item) => Mml.item(item));
      const list = Mml.list(items);
      body = Mml.compose`\nYou are carrying: ${list}.\n`;
    }

    MessageApi.scene(actor)
      .topic('world.perception.inventory')
      .toSelf(body)
      .send();

    return;
  }
}
