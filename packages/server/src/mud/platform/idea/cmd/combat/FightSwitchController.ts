/**
 * FightSwitchController — `fight switch <weapon>`: a vulnerable armament
 * change (over {@link FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightSwitchController extends FightControllerBase {
  async execute(model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(
        context,
        `You don't have any '${target?.raw ?? ""}' to switch to.`,
        "no-target",
      );
    }
    const result = ((giver) as unknown as Stuff & Combatant).beginWeaponSwitch(target.stuff as Stuff);
    if (!result.ok) {
      return this.fail(
        context,
        result.reason === "already-switching"
          ? "You're already changing weapons."
          : "You can't switch right now.",
        result.reason ?? "ineligible",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You start to change weapons — your guard drops."))
      .toPeers(Mml.compose`${Mml.actor(giver)} moves to change weapons.`)
      .send();
  }
}
