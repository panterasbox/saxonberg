/**
 * FightRushController — `fight rush <direction>`: the bum's rush — throw a
 * grappled foe out through an exit (a control-win outcome) (over {@link
 * FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightRushController extends FightControllerBase {
  async execute(model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const dir = model.direction;
    if (!dir) {
      return this.fail(
        context,
        "Which way? Try `fight rush <direction>`.",
        "no-direction",
      );
    }
    const result = await ((giver) as unknown as Stuff & Combatant).bumRush(dir);
    if (!result.ok) {
      const detail =
        result.reason === "no-hold"
          ? "You've no one locked up to throw — subdue them first."
          : result.reason === "no-exit"
            ? `There's no way ${dir} to throw them.`
            : "You can't do that right now.";
      return this.fail(context, detail, result.reason ?? "ineligible");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You haul your foe to the ${dir} and hurl them out.`)
      .send();
  }
}
