/**
 * FightStatusController — bare `fight` / `fight status`: the at-a-glance
 * read (bands only) — your own poise / condition / flags / wounds at full
 * fidelity, plus the banded, perception-gated opponent read (over {@link
 * FightControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { CombatApi } from "../../../../api/combat";
import type { Combatant } from '../../../../lib/combat/Combatant';
import { FightControllerBase, TOPIC, type FightModel } from "./FightControllerBase";
import { MixinApi } from "../../../../api/mixin";
import type { CombatantState } from "../../../../lib/combat/CombatSession";

export default class FightStatusController extends FightControllerBase {
  async execute(_model: FightModel, context: CommandContext): Promise<void> {
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
    // Your OWN side's formation + role (total — a solo fighter reads the
    // default). The enemy's formation stays unread (the fog non-goal).
    const standing = ((giver) as unknown as Stuff & Combatant).formationStanding();
    lines.push(`Formation: ${standing.formation}`);
    if (standing.role) lines.push(`Role: ${standing.role}`);
    lines.push(`Flags: ${this.flagsWord(me)}`);
    lines.push(`Condition: ${this.conditionBand(giver)}`);
    const wounds = this.woundCount(giver);
    lines.push(`Wounds: ${wounds === 0 ? "none" : String(wounds)}`);
    if (me.down) lines.push("You are down.");

    if (opp) {
      const name = opp.combatant.getPresentation();
      // The opponent's poise is a FOGGED read — hedged by your own sharpness
      // (a dull reader under-reads it and can be shown a feint as an
      // opening; a sharp reader sees the tell). Free (unlike `assess`).
      const read = ((giver) as unknown as Stuff & Combatant).perceiveCombat();
      const oppBand = read.ok && read.poiseBand ? read.poiseBand : opp.poise.band();
      lines.push("");
      lines.push(`Opponent — ${name}`);
      lines.push(
        `  Poise: ${oppBand}${read.read === "feint" ? " (a feint?)" : ""}`,
      );
      lines.push(`  Bearing: ${this.conditionBand(opp.combatant)}`);
      lines.push(`  Flags: ${this.flagsWord(opp)}`);
      const rs = ((giver) as unknown as Stuff & Combatant).rangeStanding();
      if (rs) {
        const reachWord =
          rs.reachDelta > 0
            ? " — you out-reach them"
            : rs.reachDelta < 0
              ? " — they out-reach you"
              : "";
        lines.push(`  Range: ${rs.range}${reachWord}`);
      }
      if (opp.down) lines.push("  They are down.");
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(lines.join("\n"))))
      .send();
  }

  private conditionBand(combatant: Stuff): string {
    return MixinApi.isVitals(combatant) ? combatant.getConditionBand() : "—";
  }

  private woundCount(combatant: Stuff): number {
    if (!MixinApi.isVitals(combatant)) return 0;
    return combatant.getConditions().filter((c) => c.kind === "trauma").length;
  }

  private flagsWord(state: CombatantState): string {
    const list = state.flags.list();
    return list.length ? list.join(", ") : "none";
  }
}
