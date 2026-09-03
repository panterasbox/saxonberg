/**
 * AttackController — `attack <target> [--lethal] [--to <stop>]`.
 *
 * Opens a fight. Terms are consented like introductions: each side's
 * *standing* combat settings pre-answer the handshake, and an explicit
 * prompt surfaces **only when terms conflict** (someone brings lethal to
 * a non-lethal fight). A frictionless bar scuffle — both non-lethal —
 * opens silently.
 *
 * Reconciliation is the pure {@link CombatTerms.reconcile}. On a conflict:
 * if the defender is a live player, we prompt their Interactive to accept
 * the escalation (accept → consented lethal; decline → the fight folds to
 * the defender's non-lethal terms); if the defender has no session (an
 * NPC / beast), the initiator's terms are **imposed** unconsented — the
 * fight still happens (you *can* attack the unwilling), and the missing
 * consent is what Build 2's blame ledger will read.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { PromptCancelledError } from "../../../../api/prompt";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { TermsProposal } from "../../../../lib/combat/CombatTerms";
import type { Combatant } from '../../../../lib/combat/Combatant';

const TOPIC = "act.deed";

interface AttackModel extends CommandModel {
  target?: MqlOneResult;
  lethal?: boolean;
  to?: string;
}


export default class AttackController extends CommandController<AttackModel> {
  async execute(model: AttackModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    if (!model.target?.stuff) {
      const raw = model.target?.raw;
      return this.fail(
        context,
        raw ? `You don't see any '${raw}' to attack.` : "Attack whom?",
        "empty-result",
      );
    }
    const target = model.target.stuff;

    if (target === (giver as Stuff)) {
      return this.fail(context, "You can't attack yourself.", "self-target");
    }
    if (!MixinApi.isVitals(target) || !MixinApi.isEngaged(target)) {
      return this.fail(
        context,
        `You can't attack ${Mml.thing(target).toString()}.`,
        "not-a-combatant",
      );
    }
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, "You can't fight.", "not-a-combatant");
    }

    // The initiation handshake lives on CombatApi so that every verb
    // that starts a fight runs the SAME sequence — see
    // `CombatApi.initiate`. Prompting stays here, because asking a
    // player a question is the controller's job, not the engine's.
    const result = await (giver as unknown as Stuff & Combatant).initiateCombat(
      target,
      { lethal: model.lethal, to: model.to },
      (t, mine) => this.resolveConflict(t, mine),
    );
    if (!result.ok) {
      if (result.reason === "cancelled") {
        return this.fail(context, "The challenge goes unanswered.", "cancelled");
      }
      // A sanctuary refusal carries its own house prose (the lounge:
      // "Not in here. The lounge is for talk — take it next door.").
      if (result.reason === "sanctuary") {
        return this.fail(
          context,
          result.refusal ?? "Not here — this is no place for a fight.",
          "sanctuary",
        );
      }
      return this.fail(
        context,
        "You can't start that fight.",
        result.reason ?? "failed",
      );
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You square off against ${Mml.actor(target)}.`)
      .toTarget(target, Mml.compose`${Mml.actor(giver)} squares off against you!`)
      .toPeers(Mml.compose`${Mml.actor(giver)} squares off against ${Mml.actor(target)}.`)
      .send();
  }

  /**
   * Prompt a live defender to accept a lethal escalation. Returns true
   * (accept), false (decline), null (no live defender to ask), or
   * 'cancelled' (disconnect / cancel).
   */
  private async resolveConflict(
    target: Stuff,
    mine: TermsProposal,
  ): Promise<boolean | null | "cancelled"> {
    if (!MixinApi.isHasInteractive(target)) return null;
    const interactive = [...target.getInteractives()][0];
    if (!interactive) return null;
    try {
      const picked = await interactive.promptChoice(
        `You are challenged to a ${mine.lethality} fight (to ${mine.stopCondition}). Accept?`,
        [
          { label: "Accept", response: "accept" },
          { label: "Refuse the terms", response: "decline" },
        ],
      );
      return picked === "accept";
    } catch (err) {
      if (err instanceof PromptCancelledError) return "cancelled";
      throw err;
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
