/**
 * AnalyzeWeaponController — handler for `analyze weapon <target>`.
 *
 * The combat-owned **playstyle legibility preview** (the sibling of
 * `analyze response`, which reads the materials-response delivery/protection
 * half): point at a weapon and read its derived {@link WeaponProfile} — reach,
 * balance, guard, handedness — as bands/pips, plus the delivered channel it
 * presents. Pure server projection over `CombatApi.weaponProfileOf` (the
 * config-injected authoritative read), so the previewed bands match the
 * couplings a real fight applies. Playstyle is combat-domain, so this lives in
 * the combat command tree and reads the combat Api — it does NOT extend the
 * materials-response `analyze response` surface (clean layering over a
 * downward dependency).
 *
 * A target that isn't a weapon (no delivery form) falls through to a polite
 * "nothing to read".
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { MqlOneResult } from "../../../api/mql";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { CombatApi } from "../../../api/combat";
import { MaterialApi } from "../../../api/material";
import { MixinApi } from "../../../api/mixin";
import { Gambit } from "../../../lib/combat/Gambit";

interface AnalyzeWeaponModel extends CommandModel {
  target?: MqlOneResult;
}

const TOPIC = "world.perception.measurement.analyze-weapon";

/** A 4-cell filled/empty pip bar over a 0..maxRank scale. */
function pipBar(rank: number, maxRank: number): string {
  const n = Math.max(0, Math.min(4, Math.round((rank / maxRank) * 4)));
  return "●".repeat(n) + "○".repeat(4 - n);
}

export default class AnalyzeWeaponController extends CommandController<AnalyzeWeaponModel> {
  execute(model: AnalyzeWeaponModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? "";
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: "empty-result", field: "target", query: raw });
      return;
    }

    const stuff = target.stuff as Stuff;
    const profile = CombatApi.weaponProfileOf(stuff);
    if (!profile || profile.isInert()) {
      const detail = `${stuff.getPresentation()} isn't a weapon you can read for a playstyle.`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-a-weapon",
        detail,
      });
      return;
    }

    const construction = MixinApi.isConstructed(stuff)
      ? stuff.getConstruction()
      : null;
    const channels = construction
      ? construction.deliveredChannels()
      : [];
    const delivery = channels.length ? channels.join(", ") : "—";

    const lines: string[] = [];
    lines.push(`Playstyle of ${stuff.getPresentation()}:`);
    lines.push(
      `  reach ${profile.reach()} ${pipBar(profile.reachRank(), 2)}`,
    );
    lines.push(
      `  guard ${profile.guard()} ${pipBar(profile.guardRank(), 4)}`,
    );
    lines.push(`  balance ${profile.balance()}`);
    lines.push(`  ${profile.handedness()}`);
    lines.push(`  delivers ${delivery}`);
    // "The weapon edits the menu": the extra gambits this form affords.
    const afforded = Gambit.affordedByForm(profile.delivery());
    if (afforded.length) lines.push(`  affords ${afforded.join(", ")}`);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(lines.join("\n"))))
      .send();
  }
}
