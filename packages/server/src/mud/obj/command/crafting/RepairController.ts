/**
 * RepairController — `repair <item>` (the smith's service act).
 *
 * The deficit-priced reverse-craft: `CraftingApi.repair` resolves the
 * domain gate (forge heat for metal, a `mending` tool for soft goods),
 * prices the material cost off the condition deficit (doubled broken),
 * draws the stock from the same gather walk a craft uses, and restores
 * the condition to full — ceiling-free. Declines render diegetically via
 * the shared CraftController base.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { CraftingApi } from '../../../api/crafting';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

interface RepairModel extends CommandModel {
  item?: MqlOneResult;
}

export default class RepairController extends CraftController<RepairModel> {
  async execute(model: RepairModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item: Stuff | null = model.item?.stuff ?? null;
    if (!item) {
      const raw = model.item?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here to repair.`)
        .send();
      context.note({ kind: 'empty-result', field: 'item', query: raw });
      return;
    }

    const outcome = await CraftingApi.repair({ item });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You work ${Mml.item(item)} back into true — sound as the day it was made.`,
      )
      .toPeers(Mml.compose`${Mml.name(giver)} repairs ${Mml.item(item)}.`)
      .send();
  }
}
