/**
 * VomitController — `vomit`.
 *
 * The voluntary purge: flush the digestion buffer's **un-absorbed**
 * pools (those tags never reach their handlers) and empty both
 * sub-volumes. Whatever already absorbed — reserves already filled,
 * ethanol already in the burden — stays. Inducing it early (pools still
 * un-absorbed) saves you; late doesn't. The involuntary path is NOT
 * this verb: the reconcile calls `MetabolicMixin.vomit()` directly on a
 * gross-overfullness / acute-toxin trigger, so it can fire on an
 * incapacitated body.
 *
 * Takes no target — it always acts on the actor's own stomach.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

export default class VomitController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isMetabolic(giver)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing to bring up.`)
        .send();
      return;
    }

    const label = giver.getLastMealLabel();
    giver.vomit();
    const what = label ? `the ${label}` : "what little is left";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You retch and bring up ${what}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} doubles over and vomits.`)
      .send();
  }
}
