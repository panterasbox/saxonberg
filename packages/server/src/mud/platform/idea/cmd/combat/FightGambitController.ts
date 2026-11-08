/**
 * FightGambitController — the gambit words (`strike`, `feint`, `close`,
 * `advance`, `withdraw`, `disarm`, `subdue`, `shove`, `bash`, `sweep`,
 * `entangle`) are ONE act: queue the word as a gambit for the next beat,
 * attempt-time cross-gated by `queueGambit` (injury edits the menu). `fight
 * defend` is `DefendController`'s (over {@link FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi, type GambitEligibility } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightGambitController extends FightControllerBase {
  async execute(model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const verb = model.subcommand;
    if (!verb) return this.fail(context, "Which gambit?", "no-gambit");
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const result = ((giver) as unknown as Stuff & Combatant).queueGambit(verb);
    if (!result.ok) {
      return this.fail(
        context,
        this.reasonMessage(verb, result),
        result.reason ?? "ineligible",
      );
    }
    const ready =
      verb === "close"
        ? Mml.fromMarkup("You move to close the distance.")
        : Mml.compose`You ready a ${verb}.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(ready).send();
  }

  /** Turn an eligibility reason into a player-facing sentence. */
  private reasonMessage(verb: string, elig: GambitEligibility): string {
    switch (elig.reason) {
      case "not-in-combat":
        return "You're not in a fight.";
      case "downed":
        return "You're down — you can't act.";
      case "no-instrument":
        return `You've nothing to ${verb} with.`;
      case "target-unarmed":
        return "Your opponent has no weapon to take.";
      case "wrong-band":
        return "You're not skilled enough for that yet.";
      case "wrong-weapon":
        return `Your weapon can't ${verb} — you need the right kind.`;
      case "no-shield":
        return "You need a shield in hand for that.";
      default:
        return `You can't ${verb} right now.`;
    }
  }
}
