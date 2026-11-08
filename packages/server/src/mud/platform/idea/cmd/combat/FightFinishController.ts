/**
 * FightFinishController — `fight finish`: the captain's execution directive
 * — release a coup held under a `coupCall: captain` formation (the directive
 * is a recorded fact; command responsibility rides the death row) (over
 * {@link FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightFinishController extends FightControllerBase {
  async execute(_model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const result = ((giver) as unknown as Stuff & Combatant).orderCoup();
    if (!result.ok) {
      const detail =
        result.reason === "not-the-captain"
          ? "The call is not yours to give."
          : result.reason === "moment-passed"
            ? "The moment has passed."
            : "No one awaits your word.";
      return this.fail(context, detail, result.reason ?? "no-held-coup");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You give the word."))
      .toPeers(Mml.compose`${Mml.actor(giver)} gives the word.`)
      .send();
  }
}
