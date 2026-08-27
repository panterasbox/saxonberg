/**
 * SalvageController — `salvage <item>` (the generic lossy melt-down).
 *
 * `CraftingApi.salvage` breaks the form into a lossy fraction of its
 * constituent materials (metal → re-meltable castings, the rest → scrap
 * stacks); provenance, grade, and the chattel stamp die with the form.
 * The recovered raw forms land in the actor's location (this
 * controller's job — the Api returns them unplaced).
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { CraftingApi } from '../../../../api/crafting';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface SalvageModel extends CommandModel {
  item?: MqlOneResult;
}

export default class SalvageController extends CraftController<SalvageModel> {
  async execute(model: SalvageModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item: Stuff | null = model.item?.stuff ?? null;
    if (!item) {
      const raw = model.item?.raw ?? '';
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here to salvage.`)
        .send();
      context.note({ kind: 'empty-result', field: 'item', query: raw });
      return;
    }

    const itemName = item.getPresentation();
    const outcome = await CraftingApi.salvage({ item });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    // Land the raw forms where the work happened.
    const loc = context.location;
    if (loc && MixinApi.isContainer(loc)) {
      for (const out of outcome.outputs) {
        if (MixinApi.isContainable(out)) {
          ContainmentApi.move(out, loc as Stuff & Container);
        }
      }
    }
    if (outcome.outputs.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You break ${itemName} down, but nothing worth keeping survives it.`,
        )
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You break ${itemName} down for its matter — what the work put in, the wrecking mostly loses.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} breaks ${itemName} down for salvage.`)
      .send();
  }
}
