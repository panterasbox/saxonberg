/**
 * GambitController — `strike` / `disarm` / `subdue` / `shove`.
 *
 * The demonstrative gambit set, all routed through one controller (the
 * invoked verb *is* the gambit key, read from `context.verb`). A gambit
 * is **queued intent**: it sets what the actor will attempt on the next
 * emergent-tempo beat; the exchange resolves — and narrates — when the
 * fight ticks. The opponent is implicit (the session binds exactly two
 * combatants), so gambits take no target.
 *
 * Attempt-time cross-gating lives in `CombatApi.queueGambit`
 * (`eligibilityFor`): a gambit needing an instrument is refused when the
 * actor is disarmed or the wielding limb is fractured (injury edits the
 * menu), and `disarm` is refused when the opponent is unarmed. The
 * terminal build needs only this reject; the visible "menu greys itself"
 * defers with the client pane.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { CombatApi, type GambitEligibility } from "../../../api/combat";

const TOPIC = "world.narration.action";

/** Turn an eligibility reason into a player-facing sentence. */
function reasonMessage(verb: string, elig: GambitEligibility): string {
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
    default:
      return `You can't ${verb} right now.`;
  }
}

export default class GambitController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const verb = context.verb;

    const session = CombatApi.sessionFor(giver);
    if (!session) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }

    const result = CombatApi.queueGambit(giver, verb);
    if (!result.ok) {
      return this.fail(context, reasonMessage(verb, result), result.reason ?? "ineligible");
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You ready a ${verb}.`)
      .send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
