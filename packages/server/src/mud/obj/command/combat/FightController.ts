/**
 * FightController — the `fight` verb: dispatch-on-subcommand over your
 * current fight (the `bank` / `chat` subcommand precedent, not a
 * verb-per-action). `attack <target>` opens a fight; everything you do
 * *inside* one lives here:
 *
 *   - bare `fight` (or `fight status`) — the at-a-glance read: your own
 *     poise / condition / flags / wounds at full fidelity, plus the
 *     banded, perception-gated opponent read.
 *   - `fight strike | disarm | subdue | shove` — the gambits, queued
 *     intent that resolves on the next beat, attempt-time cross-gated by
 *     `CombatApi.queueGambit` (injury edits the menu).
 *   - `fight defend` — cover up and recover poise instead of attacking
 *     (the autocombat default, handed to the player as a deliberate choice
 *     so they can play the patient defender).
 *   - `fight yield` — concede.
 *
 * Consolidated so combat contributes two verbs (`attack` + `fight`)
 * rather than seven, and so `status` isn't a generic top-level verb (it
 * collided with the social `status`).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { MixinApi } from "../../../api/mixin";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { CombatApi, type GambitEligibility } from "../../../api/combat";
import type { CombatantState } from "../../../lib/combat/CombatSession";
import type { MqlOneResult } from "../../../api/mql";

const TOPIC = "world.narration.action";
const GAMBITS = new Set([
  "strike",
  "feint",
  "disarm",
  "subdue",
  "shove",
  "defend",
  "close",
  "bash",
  "sweep",
  "entangle",
]);

interface FightModel extends CommandModel {
  subcommand?: string;
  target?: MqlOneResult;
}

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
    case "wrong-weapon":
      return `Your weapon can't ${verb} — you need the right kind.`;
    case "no-shield":
      return "You need a shield in hand for that.";
    default:
      return `You can't ${verb} right now.`;
  }
}

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

export default class FightController extends CommandController<FightModel> {
  execute(model: FightModel, context: CommandContext): void {
    const sub = model.subcommand;
    if (sub === "yield") return this.doYield(context);
    if (sub === "switch") return this.doSwitch(model, context);
    if (sub === "draw") return this.doDraw(context);
    if (sub && GAMBITS.has(sub)) return this.doGambit(sub, context);
    // Bare `fight` or `fight status` → the read.
    return this.doStatus(context);
  }

  /** `fight switch <weapon>` — a vulnerable armament change. */
  private doSwitch(model: FightModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(
        context,
        `You don't have any '${target?.raw ?? ""}' to switch to.`,
        "no-target",
      );
    }
    const result = CombatApi.beginSwitch(giver, target.stuff as Stuff);
    if (!result.ok) {
      return this.fail(
        context,
        result.reason === "already-switching"
          ? "You're already changing weapons."
          : "You can't switch right now.",
        result.reason ?? "ineligible",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You start to change weapons — your guard drops."))
      .toPeers(Mml.compose`${Mml.name(giver)} moves to change weapons.`)
      .send();
  }

  /** `fight draw` — fast-draw a sidearm (the disarm answer). */
  private doDraw(context: CommandContext): void {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const result = CombatApi.drawSidearm(giver);
    if (!result.ok) {
      return this.fail(
        context,
        "You've no sidearm to draw.",
        result.reason ?? "no-sidearm",
      );
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You snatch for a sidearm."))
      .toPeers(Mml.compose`${Mml.name(giver)} draws a sidearm.`)
      .send();
  }

  /** `fight strike|disarm|subdue|shove` — queue a gambit for the next beat. */
  private doGambit(verb: string, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      return this.fail(context, "You're not in a fight.", "not-in-combat");
    }
    const result = CombatApi.queueGambit(giver, verb);
    if (!result.ok) {
      return this.fail(
        context,
        reasonMessage(verb, result),
        result.reason ?? "ineligible",
      );
    }
    const ready =
      verb === "defend"
        ? Mml.fromMarkup("You settle into a guard, covering up.")
        : verb === "close"
          ? Mml.fromMarkup("You move to close the distance.")
          : Mml.compose`You ready a ${verb}.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(ready).send();
  }

  /** `fight yield` — concede the fight. */
  private doYield(context: CommandContext): void {
    const giver = context.commandGiver;
    if (!CombatApi.sessionFor(giver)) {
      context.note({
        kind: "controller-rejected",
        reason: "not-in-combat",
        detail: "You're not in a fight.",
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup("You're not in a fight."))
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup("You yield."))
      .toPeers(Mml.compose`${Mml.name(giver)} yields.`)
      .send();
    CombatApi.yieldFight(giver);
  }

  /** bare `fight` / `fight status` — the at-a-glance read (bands only). */
  private doStatus(context: CommandContext): void {
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
      // The opponent's poise is a FOGGED read — hedged by your own sharpness
      // (a dull reader under-reads it and can be shown a feint as an
      // opening; a sharp reader sees the tell). Free (unlike `assess`).
      const read = CombatApi.perceive(giver);
      const oppBand = read.ok && read.poiseBand ? read.poiseBand : opp.poise.band();
      lines.push("");
      lines.push(`Opponent — ${name}`);
      lines.push(
        `  Poise: ${oppBand}${read.read === "feint" ? " (a feint?)" : ""}`,
      );
      lines.push(`  Bearing: ${conditionBand(opp.combatant)}`);
      lines.push(`  Flags: ${flagsWord(opp)}`);
      const rs = CombatApi.rangeStanding(giver);
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

  private fail(context: CommandContext, detail: string, reason: string): void {
    context.note({ kind: "controller-rejected", reason, detail });
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(detail)))
      .send();
  }
}
