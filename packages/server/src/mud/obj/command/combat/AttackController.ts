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

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { ShellApi } from "../../../api/shell";
import { PromptApi, PromptCancelledError } from "../../../api/prompt";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Engaged } from "../../../lib/activity/Engaged";
import { CombatApi } from "../../../api/combat";
import {
  CombatTerms,
  DEFAULT_TERMS,
  type TermsProposal,
  type Lethality,
  type StopCondition,
  STOP_CONDITIONS,
} from "../../../lib/combat/CombatTerms";

const TOPIC = "world.narration.action";

interface AttackModel extends CommandModel {
  target?: MqlOneResult;
  lethal?: boolean;
  to?: string;
}

/** Read a combatant's standing combat terms (defaults are frictionless). */
function standingTerms(combatant: Stuff, lethalOverride?: boolean, stopOverride?: string): TermsProposal {
  const lethSetting = ShellApi.resolveSetting<string>(combatant, "combat.lethality");
  const stopSetting = ShellApi.resolveSetting<string>(combatant, "combat.stopCondition");
  const lethality: Lethality =
    lethalOverride === true
      ? "lethal"
      : lethSetting === "lethal"
        ? "lethal"
        : DEFAULT_TERMS.lethality;
  const stopCondition: StopCondition =
    stopOverride && (STOP_CONDITIONS as readonly string[]).includes(stopOverride)
      ? (stopOverride as StopCondition)
      : stopSetting && (STOP_CONDITIONS as readonly string[]).includes(stopSetting)
        ? (stopSetting as StopCondition)
        : DEFAULT_TERMS.stopCondition;
  return { lethality, stopCondition, stakes: "" };
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
        `You can't attack ${Mml.item(target).toString()}.`,
        "not-a-combatant",
      );
    }
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, "You can't fight.", "not-a-combatant");
    }
    if (CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're already fighting.", "busy");
    }

    const mine = standingTerms(giver, model.lethal, model.to);
    const theirs = standingTerms(target);
    const reconciliation = CombatTerms.reconcile(mine, theirs);

    let resolved: TermsProposal;
    let consented: boolean;
    if (reconciliation.status === "agreed") {
      resolved = reconciliation.terms;
      consented = true;
    } else {
      const accepted = await this.resolveConflict(target, mine);
      if (accepted === "cancelled") {
        return this.fail(context, "The challenge goes unanswered.", "cancelled");
      }
      if (accepted) {
        resolved = mine;
        consented = true;
      } else if (accepted === false) {
        // Defender declined the escalation → fold to their terms.
        resolved = theirs;
        consented = true;
      } else {
        // No live defender to consent → the initiator's terms are imposed.
        resolved = mine;
        consented = false;
      }
    }

    const terms = CombatTerms.agreed(
      giver.getTemplatePath() ?? "",
      resolved,
      consented,
    );

    const opened = CombatApi.openSession(
      giver as Stuff & Engaged,
      target as Stuff & Engaged,
      terms,
    );
    if (!opened.ok) {
      return this.fail(context, "You can't start that fight.", opened.reason);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You square off against ${Mml.name(target)}.`)
      .toTarget(target, Mml.compose`${Mml.name(giver)} squares off against you!`)
      .toPeers(Mml.compose`${Mml.name(giver)} squares off against ${Mml.name(target)}.`)
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
      const picked = await PromptApi.choice(
        interactive,
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
