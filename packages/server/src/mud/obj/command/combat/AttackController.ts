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
import { PerceptionApi } from "../../../api/perception";
import { ShellApi } from "../../../api/shell";
import { PromptApi, PromptCancelledError } from "../../../api/prompt";
import { Mml } from "../../../api/mml";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Engaged } from "../../../lib/activity/Engaged";
import { CombatApi, type CombatOpenOptions } from "../../../api/combat";
import { AdvancementApi } from "../../../api/advancement";
import type { CompetenceBandName } from "../../../lib/advancement/CompetenceBand";
import {
  CombatTerms,
  DEFAULT_TERMS,
  type TermsProposal,
  type Lethality,
  type StopCondition,
  STOP_CONDITIONS,
} from "../../../lib/combat/CombatTerms";

const TOPIC = "world.narration.action";

/** The discipline whose competence band drives combat sharpness (fog +
 * poise recovery). Mirrors `CombatLogic`'s `MELEE_DISCIPLINE`. */
const MELEE_COMBAT_DISCIPLINE = "melee-combat";

interface AttackModel extends CommandModel {
  target?: MqlOneResult;
  lethal?: boolean;
  to?: string;
}

/**
 * Read a combatant's standing combat terms (defaults are frictionless).
 * Posture comes from two surfaces: the player-side `combat.lethality` /
 * `combat.stopCondition` **settings** (which only resolve for `Environment`
 * hosts — i.e. players), and the **authored `CombatantMixin` fields**
 * (`standingLethality` / `standingStopCondition`) an NPC seeds (an NPC
 * isn't an Environment, so it can't carry settings). Either surface
 * declaring `lethal` makes this combatant bring lethal terms.
 */
function standingTerms(combatant: Stuff, lethalOverride?: boolean, stopOverride?: string): TermsProposal {
  const lethSetting = ShellApi.resolveSetting<string>(combatant, "combat.lethality");
  const stopSetting = ShellApi.resolveSetting<string>(combatant, "combat.stopCondition");
  const lethField = MixinApi.isCombatant(combatant)
    ? combatant.getStandingLethality()
    : "";
  const stopField = MixinApi.isCombatant(combatant)
    ? combatant.getStandingStopCondition()
    : "";
  const lethality: Lethality =
    lethalOverride === true || lethSetting === "lethal" || lethField === "lethal"
      ? "lethal"
      : DEFAULT_TERMS.lethality;
  const authoredStop = (val: string | undefined): StopCondition | null =>
    val && (STOP_CONDITIONS as readonly string[]).includes(val)
      ? (val as StopCondition)
      : null;
  const stopCondition: StopCondition =
    authoredStop(stopOverride) ??
    authoredStop(stopSetting) ??
    authoredStop(stopField) ??
    DEFAULT_TERMS.stopCondition;
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

    // Snapshot both fighters' melee competence *before* opening — the
    // read-fog + poise-recovery need it, and `AdvancementApi.bandFor` is
    // async so it can't be read mid-beat (a single session must stay
    // deterministic). Absent/unresolved bands default to `untrained`.
    const opts = await this.snapshotBands([giver, target]);

    // Ambush: opening from concealment the defender doesn't perceive denies
    // their opening poise contest (consumed only by a *fresh* openSession).
    // Read the attacker's hidden state FIRST, then reveal them — striking
    // gives you away, ambush or not.
    opts.ambush = await this.resolveAmbush(giver, target);

    // The handshake: attacking someone already fighting *joins* their
    // melee; attacking from mid-fight *draws the target in*; two separate
    // fights colliding *merge*; otherwise a fresh session opens.
    const giverSession = CombatApi.sessionFor(giver);
    const targetSession = CombatApi.sessionFor(target);
    let result: { ok: boolean; reason?: string };
    if (giverSession && targetSession && giverSession !== targetSession) {
      CombatApi.merge(giverSession, targetSession);
      result = { ok: true };
    } else if (targetSession) {
      result = CombatApi.join(
        giver as Stuff & Engaged,
        target as Stuff & Engaged,
        terms,
        opts,
      );
    } else if (giverSession) {
      result = CombatApi.join(
        target as Stuff & Engaged,
        giver as Stuff & Engaged,
        terms,
        opts,
      );
    } else {
      const opened = CombatApi.openSession(
        giver as Stuff & Engaged,
        target as Stuff & Engaged,
        terms,
        opts,
      );
      result = opened.ok ? { ok: true } : { ok: false, reason: opened.reason };
    }
    if (!result.ok) {
      return this.fail(
        context,
        "You can't start that fight.",
        result.reason ?? "failed",
      );
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

  /** Resolve each combatant's melee competence band into the open-options
   * map (keyed by durable `templatePath`), best-effort — a failed read just
   * leaves the fighter at the `untrained` default. */
  /**
   * Ambush read — is the attacker striking from concealment the defender
   * does not perceive? Reads the attacker's hidden state FIRST (warming the
   * defender's `awareness` so `perceives` uses their real capacity), then
   * clears the attacker's hide (striking reveals you, ambush or not).
   * Returns whether a fresh session should deny the defender's poise
   * contest.
   */
  private async resolveAmbush(
    attacker: Stuff,
    defender: Stuff,
  ): Promise<boolean> {
    if (!MixinApi.isHiding(attacker) || !attacker.isHiding()) return false;
    await PerceptionApi.preloadForSenseGate(defender);
    const unseen = !PerceptionApi.perceives(defender, attacker);
    attacker.breakHide();
    return unseen;
  }

  private async snapshotBands(
    combatants: Stuff[],
  ): Promise<CombatOpenOptions> {
    const competenceBands = new Map<string, CompetenceBandName>();
    for (const c of combatants) {
      const key = c.getTemplatePath();
      if (!key) continue;
      try {
        competenceBands.set(
          key,
          await AdvancementApi.bandFor(c, MELEE_COMBAT_DISCIPLINE),
        );
      } catch {
        // Unresolved → the combatant defaults to `untrained` sharpness.
      }
    }
    return { competenceBands };
  }
}
