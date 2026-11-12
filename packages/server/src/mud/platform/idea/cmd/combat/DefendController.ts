/**
 * DefendController — the `defend` family, one verb over three
 * cardinalities:
 *
 *   - `defend` (no target) — cover up: queue the self-defensive gambit
 *     (recover poise instead of attacking; the same beat `fight defend`
 *     throws).
 *   - `defend <fallen>` — stay a killing stroke: if a coup is poised over
 *     (or by) the target, cancel it (the old `intervene`/`stay`).
 *   - `defend <ally>` — interpose: pull a foe's pressure off a pressed
 *     ally onto yourself (join the fight if needed, then redirect the
 *     foe's threat edge onto you).
 *
 * One act (controller-liquidity W7c): the fighter decides which
 * (`Combatant.defend`) and this words it. `fight defend` names this
 * controller in `fight.yaml` (controllers-are-io W7 — the one same-act
 * subcommand), binding no target, so it is the cover-up.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Combatant, DefendRefusal } from '../../../../lib/combat/Combatant';

const TOPIC = "act.deed";

interface DefendModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DefendController extends CommandController<DefendModel> {
  async execute(model: DefendModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;
    if (model.target?.raw && !model.target.stuff) {
      return this.refuse(context, TOPIC, `You don't see any '${model.target.raw}' to defend.`, "empty-result");
    }
    // ⭐ The fighter decides what defending is (`Combatant.defend`): cover
    // up, stay a coup, or interpose. The controller words it.
    const target = model.target?.stuff ?? null;
    const out = (giver as unknown as Stuff & Combatant).defend(target);
    if (!out.ok) {
      return this.refuse(context, TOPIC, DefendController.refusal(out), out.facts?.why ?? out.reason);
    }
    const done = out.facts;
    if (done.kind === "cover") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You cover up, ready to weather the next blow.`)
        .send();
      return;
    }
    // A stayed stroke is told by the coup's own abort (`combat-intervened`).
    if (done.kind === "stayed") return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You step between ${Mml.actor(done.target)} and their attacker.`)
      .toTarget(done.target, Mml.compose`${Mml.actor(giver)} steps in to shield you!`)
      .toPeers(Mml.compose`${Mml.actor(giver)} interposes to shield ${Mml.actor(done.target)}.`)
      .send();
  }

  /** Why the fighter could not defend, in words. */
  protected static refusal(r: DefendRefusal): string {
    switch (r.reason) {
      case "not-in-combat":
        return "You're not in a fight.";
      case "cannot-cover":
        return "You can't cover up right now.";
      case "ally-not-fighting":
        return "They're not in a fight.";
      case "ally-not-pressed":
        return "No one is pressing them right now.";
      case "busy-elsewhere":
        return "You're already fighting elsewhere.";
      case "cannot-interpose":
        return "You can't step in for them.";
      default: {
        const unworded: never = r;
        throw new Error(`DefendController: no words for ${String(unworded)}`);
      }
    }
  }
}
