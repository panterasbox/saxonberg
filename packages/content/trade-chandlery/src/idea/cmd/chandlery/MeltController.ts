/**
 * MeltController — `melt <solid>`, and it is the step that fills the pot.
 *
 * ⭐ **The pot is where the two fats meet, and getting them there is each
 * supplier's problem rather than the candle recipe's.** Tallow arrives
 * already liquid in a crock and is simply `pour`ed in — a shipped
 * platform verb, no recipe, no code. Beeswax arrives as a *cake*, which
 * is an item, so it has to be melted; `melt-wax` is that one recipe and
 * this is its verb.
 *
 * ⚠ So the asymmetry in the chain is **real rather than modelled**: the
 * beekeeper's product needs a step the renderer's does not, because one
 * of them sets solid and the other is sold hot. That is why there are two
 * verbs here and not one.
 *
 * ⭐ Ungated, like the dip: melting wax in a pot over a fire is not a
 * skill and there is no Discipline in this pack to credit it to.
 */

import { CraftController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/CraftController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

const TOPIC = 'act.deed';
const RECIPE = 'melt-wax';

interface MeltModel extends CommandModel {
  solid?: MqlOneResult;
}

export default class MeltController extends CraftController<MeltModel> {
  async execute(model: MeltModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.solid?.stuff ?? null;

    if (model.solid && !named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.solid.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'solid',
        query: model.solid.raw,
      });
      return;
    }

    const outcome = await CraftingApi.craft({
      recipeRef: RECIPE,
      makerMode: 'self',
      // ⭐ The named cake is PREFERRED for the slot it satisfies, so
      // `melt the dark cake` reaches that cake rather than whichever one
      // was nearest — the same reason `dry the cut I just salted` has to.
      ...(named ? { target: named } : {}),
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`It softens, slumps and goes clear, and you have a pot of it.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} melts something down in a pot.`)
      .send();
  }
}
