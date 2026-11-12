/**
 * FightAssessController — `fight assess <target>`: the costed combat read
 * of your opponent (over {@link FightControllerBase}). It spends your next
 * exchange, mints a combat signature, and reveals the opponent's banded
 * tactical state (poise / flags / armed) at a fidelity the passive `fight`
 * read hedges. Bands only, never a number.
 *
 * ⭐ Its own word (controller-liquidity W7b): it used to be the mid-fight
 * arm of `assess`, so the same words examined a body or spent an exchange
 * depending on who you were fighting. `assess` is the examination now,
 * always; reading your foe is a thing you do inside the fight.
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { CombatApi, type CombatAssessResult } from "../../../../api/combat";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Combatant } from "../../../../lib/combat/Combatant";
import {
  CONDITION_BAND_PHRASE,
  type ConditionBand,
} from "../../../../lib/vitals/Vitals";
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";

export default class FightAssessController extends FightControllerBase {
  async execute(model: FightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const session = CombatApi.sessionFor(giver);
    if (!session) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const target = model.target?.stuff ?? null;
    if (target === null) {
      return this.fail(
        context,
        `You don't see any '${model.target?.raw ?? ""}' to assess.`,
        "empty-result",
      );
    }
    // Only against the actual opponent (1v1) — a bystander is examined
    // with `assess`, which reads a body, not a guard.
    const opp = session.opponentState(giver)?.combatant;
    if (!opp || (opp as Stuff) !== target) {
      return this.fail(
        context,
        `You are not fighting ${target.getPresentation()} — \`assess\` examines a body.`,
        "not-opponent",
      );
    }
    const read = (giver as unknown as Stuff & Combatant).assessCombat(target);
    if (!read.ok) {
      return this.fail(context, "You can't read them right now.", read.reason ?? "no-read");
    }
    FightAssessController.renderCombatAssess(giver, target, read);
  }

  /** The mid-fight tactical read — bands only, never a number. */
  protected static renderCombatAssess(
    giver: Stuff,
    target: Stuff,
    read: CombatAssessResult,
  ): void {
    const label = target.getPresentation();
    const guard = read.poiseBand ?? "steady";
    const arms = read.armed ? "armed" : "unarmed";
    const lines: string[] = [
      Mml.fromMarkup(
        `You read ${Mml.strong(Mml.escape(label)).toString()} — guard ${Mml.escape(
          guard,
        )}, ${Mml.escape(arms)}.`,
      ).toString(),
    ];
    if (read.conditionBand) {
      // The label as the subject, so the singular band verbs agree —
      // "…looks unhurt", never "They looks…".
      lines.push(
        Mml.fromMarkup(
          `${Mml.strong(Mml.escape(label)).toString()} ${Mml.escape(
            CONDITION_BAND_PHRASE[read.conditionBand as ConditionBand] ?? "looks hurt",
          )}.`,
        ).toString(),
      );
    }
    if (read.flags && read.flags.length > 0) {
      lines.push(Mml.escape(`Off balance: ${read.flags.join(", ")}.`));
    }
    const body = Mml.fromMarkup(lines.join("\n\n"));
    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
