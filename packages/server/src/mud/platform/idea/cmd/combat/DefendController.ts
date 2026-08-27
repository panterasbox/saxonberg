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
 * `intervene`/`stay` and `fight defend` remain as aliases for their
 * respective cardinalities; `defend` is the canonical surface.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";

const TOPIC = "act.deed";

interface DefendModel extends CommandModel {
  target?: MqlOneResult;
}

export default class DefendController extends CommandController<DefendModel> {
  async execute(model: DefendModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;

    // No target → cover up (the self-defensive gambit).
    if (!model.target?.stuff) {
      if (model.target?.raw) {
        return this.fail(
          context,
          `You don't see any '${model.target.raw}' to defend.`,
          "empty-result",
        );
      }
      const elig = CombatApi.queueGambit(giver, "defend");
      if (!elig.ok) {
        return this.fail(
          context,
          elig.reason === "not-in-combat"
            ? "You're not in a fight."
            : "You can't cover up right now.",
          elig.reason ?? "ineligible",
        );
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup("You cover up, ready to weather the next blow."))
        .send();
      return;
    }

    const target = model.target.stuff;

    // A killing stroke poised over (or by) the target → stay it.
    if (CombatApi.intervene(giver, target)) return;

    // Otherwise interpose for a pressed ally.
    const res = CombatApi.defendAlly(giver, target);
    if (!res.ok) {
      return this.fail(context, this.reasonText(res.reason ?? ""), res.reason ?? "failed");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You step between ${Mml.actor(target)} and their attacker.`)
      .toTarget(
        target,
        Mml.compose`${Mml.actor(giver)} steps in to shield you!`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} interposes to shield ${Mml.actor(target)}.`,
      )
      .send();
  }

  private reasonText(reason: string): string {
    switch (reason) {
      case "ally-not-fighting":
        return "They're not in a fight.";
      case "ally-not-pressed":
        return "No one is pressing them right now.";
      case "busy-elsewhere":
        return "You're already fighting elsewhere.";
      default:
        return "You can't step in for them.";
    }
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
