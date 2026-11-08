/**
 * FightBreakController — `fight break`: offer a mutual stand-down (cover up
 * + post the offer); a reciprocated fresh offer ends the fight with no
 * victor and no defeat — the way to back down without losing (over {@link
 * FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightBreakController extends FightControllerBase {
  async execute(_model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const result = ((giver) as unknown as Stuff & Combatant).offerBreak();
    if (!result.ok) {
      return this.fail(
        context,
        "You're not in a fight.",
        result.reason ?? "ineligible",
      );
    }
    const line = result.broke
      ? Mml.fromMarkup("You lower your fists — and so do they. It's over.")
      : Mml.fromMarkup("You step back, hands raised, and offer to end it.");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(line)
      .toPeers(Mml.compose`${Mml.actor(giver)} steps back, hands raised.`)
      .send();
  }
}
