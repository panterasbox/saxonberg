/**
 * FightDrawController — `fight draw`: fast-draw a sidearm (the disarm
 * answer) (over {@link FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightDrawController extends FightControllerBase {
  async execute(_model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const result = ((giver) as unknown as Stuff & Combatant).drawSidearm();
    if (!result.ok) {
      return this.fail(
        context,
        "You've no sidearm to draw.",
        result.reason ?? "no-sidearm",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You snatch for a sidearm."))
      .toPeers(Mml.compose`${Mml.actor(giver)} draws a sidearm.`)
      .send();
  }
}
