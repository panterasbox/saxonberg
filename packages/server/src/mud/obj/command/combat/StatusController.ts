/**
 * StatusController — `status` (the combat at-a-glance, terminal edition).
 *
 * The full-fidelity read of your *own* fight state — poise band, combat
 * flags, condition band, and open wounds — plus the **banded,
 * perception-gated** read of your opponent (their poise band + flags,
 * never a scalar; server-authoritative). This is the terminal stand-in
 * for the deferred client `CombatPane`. Out of combat it says so.
 *
 * Everything surfaces as a band (the condition-band doctrine): poise is
 * already banded, flags are boolean, and vitals read through
 * `getConditionBand`. No raw poise/vitals number ever reaches the player.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { CombatApi } from "../../../api/combat";
import type { CombatantState } from "../../../lib/combat/CombatSession";

const TOPIC = "world.narration.action";

function conditionBand(combatant: Stuff): string {
  return MixinApi.isVitals(combatant) ? combatant.getConditionBand() : "—";
}

function woundCount(combatant: Stuff): number {
  if (!MixinApi.isVitals(combatant)) return 0;
  return combatant.getConditions().filter((c) => c.kind === "trauma").length;
}

function flagsWord(state: CombatantState): string {
  const list = state.flags.list();
  return list.length ? list.join(", ") : "none";
}

export default class StatusController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const session = CombatApi.sessionFor(giver);
    if (!session) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup("You're not in a fight."))
        .send();
      return;
    }
    const me = session.getState(giver);
    const opp = session.opponentState(giver);
    if (!me) return;

    const lines: string[] = [];
    lines.push(`Poise: ${me.poise.band()}`);
    lines.push(`Flags: ${flagsWord(me)}`);
    lines.push(`Condition: ${conditionBand(giver)}`);
    const wounds = woundCount(giver);
    lines.push(`Wounds: ${wounds === 0 ? "none" : String(wounds)}`);
    if (me.down) lines.push("You are down.");

    if (opp) {
      const name = opp.combatant.getPresentation();
      lines.push("");
      lines.push(`Opponent — ${name}`);
      lines.push(`  Poise: ${opp.poise.band()}`);
      lines.push(`  Bearing: ${conditionBand(opp.combatant)}`);
      lines.push(`  Flags: ${flagsWord(opp)}`);
      if (opp.down) lines.push("  They are down.");
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(lines.join("\n"))))
      .send();
  }
}
