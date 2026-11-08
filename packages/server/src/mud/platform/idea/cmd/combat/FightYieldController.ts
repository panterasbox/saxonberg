/**
 * FightYieldController — `fight yield`: concede the fight (over {@link
 * FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightYieldController extends FightControllerBase {
  async execute(_model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      context.note({
        kind: "controller-rejected",
        reason: "not-in-combat",
        detail: "You're not in a fight.",
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup("You're not in a fight."))
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You yield."))
      .toPeers(Mml.compose`${Mml.actor(giver)} yields.`)
      .send();
    ((giver) as unknown as Stuff & Combatant).yieldFight();
  }
}
