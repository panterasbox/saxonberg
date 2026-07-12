/**
 * YieldController — `yield` (concede the fight).
 *
 * The yielding actor concedes; the fight resolves on the `yield`
 * terminus in the opponent's favour. A clean, deliberate exit — distinct
 * from the two-stage down/coup (Build 2). Out of combat it's a no-op with
 * a note.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { CombatApi } from "../../../api/combat";

const TOPIC = "world.narration.action";

export default class YieldController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
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
      .toPeers(Mml.compose`${Mml.name(giver)} yields.`)
      .send();
    CombatApi.yieldFight(giver);
  }
}
