/**
 * SalvageController — `salvage <item>` (the generic lossy melt-down).
 *
 * `CraftingApi.salvage` breaks the form into a lossy fraction of its
 * constituent materials (metal → re-meltable castings, the rest → scrap
 * stacks); provenance, grade, and the chattel stamp die with the form.
 * The recovered forms land in the actor's location — the Api lands them.
 * ⭐ An assembly comes apart BY ITS JOINTS first (assembly D6): whole
 * members back at the joint's recovery × the hand's, the rest melted.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { CraftingApi } from '../../../../api/crafting';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

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

    // The raw forms were landed where the work happened by the Api.
    if (outcome.outputs.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You break ${itemName} down, but nothing worth keeping survives it.`,
        )
        .send();
      return;
    }
    // ⭐ An assembly comes apart by its joints: say what came back WHOLE —
    // fewer than went in, and how many fewer depends on the joint and on
    // the hand (assembly D6). Counts in words, never digits.
    if (outcome.recoveredParts && outcome.recoveredParts.some((p) => p.count > 0)) {
      const back = outcome.recoveredParts
        .filter((p) => p.count > 0)
        .map((p) =>
          p.of === 1
            ? `the ${p.part}`
            : `${GrammarApi.inWords(p.count)} of the ${GrammarApi.inWords(p.of)} ${p.part}s`,
        );
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You take ${itemName} apart. ${GrammarApi.cap(GrammarApi.joinList(back))} come away whole; the rest is scrap.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} takes ${itemName} apart.`)
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
