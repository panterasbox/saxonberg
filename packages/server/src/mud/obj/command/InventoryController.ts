/**
 * InventoryController — list items the giver is carrying.
 *
 * Fires a Scene at `world.perception.inventory` with a single self
 * frame. Prose comes from the central Phrasebook.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { ContainmentApi } from '../../api/containment';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { Phrasebook } from '../../lib/Phrasebook';

export interface InventoryInput {}

export class InventoryController extends CommandController<InventoryInput> {
  execute(_input: InventoryInput, context: CommandContext): CommandResult {
    const actor = context.commandGiver;
    if (!MixinApi.isContainer(actor)) {
      return { success: false, summary: 'no inventory' };
    }
    const contents = ContainmentApi.getContents(actor);

    const body =
      contents.length === 0
        ? Phrasebook.inventory.listEmpty()
        : Phrasebook.inventory.listSome(contents.map((item) => Mml.item(item)));

    MessageApi.scene(actor)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `carrying ${contents.length} items`,
    };
  }
}
