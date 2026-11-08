/**
 * StirController — `stir` (record how the build was worked).
 *
 * An engaged step that, at completion, records the build method on the
 * vessel. No matter moves — it's the working of what's already banked.
 * ⭐ The VESSEL names the method (the tool is what knows — `Technique`): a
 * shaker shakes, a mixing glass stirs, and one with no working of its own
 * is stirred (D16: `shake` and `churn` are no longer words).
 *
 * ⭐ A vessel that is not a build but is hand-worked (`HandWorkedMixin`) —
 * a butter churn (dairy D5) — is worked the same way, and says itself what
 * came of it. ⭐ A compounding vessel (ceramics R1) is asked for its knead
 * plan (`KneadVesselMixin`) — `stir` and `knead` are one act named by the
 * state of the matter, and the VESSEL decides how long and how hard it is.
 * The view's arg is `requires: any` for that reason; the controller
 * narrows to the arms.
 */

import KneadController from "./KneadController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Builds, BuildMethod } from "../../../../lib/craft/ManualBuild";
import type { TechniqueSpec } from "../../../../lib/craft/Technique";
import type { HandWorked, HandWorkFacts } from "../../../../lib/craft/HandWorked";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";
const STIR_MS = 4000;
/** Working a charge by hand — a churn takes a while to come. */
const CHURN_MS = 8000;

interface StirModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class StirController extends KneadController<StirModel> {
  async execute(model: StirModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const vessel: Stuff | null =
      model.vessel?.stuff ?? null;
    // ⭐ One word, and the tool is what knows (D16, Technique.ts): the vessel
    // names the working, so a shaker shakes and a mixing glass stirs.
    const method = this.workingOf(vessel);
    const verb = method === "stirred" ? "stir" : "work";
    // ⭐ A compounding vessel (ceramics R1): what is in it becomes one
    // product, its makeup the inputs' by mass — the slurry, powder and
    // liquid twin of `knead`, so it is the vessel's KNEAD plan, asked with
    // this verb. No recipe is consulted.
    if (vessel && MixinApi.isCompounding(vessel)) {
      const plan = await vessel.kneadPlanFor({
        actor: giver,
        verb,
      });
      if (plan === null) {
        this.declineStep(
          context,
          Mml.compose`There is nothing in ${Mml.thing(vessel)} to ${verb}.`,
          "no-vessel",
        );
        return;
      }
      // ⭐ The same act as `knead`, so the same words (D4).
      const words = this.kneadWords(vessel, giver);
      if (!plan.ok) {
        this.declineStep(context, words.onRefused(plan), plan.reason);
        return;
      }
      await this.engagePlan(context, plan, words);
      return;
    }
    if (vessel && !MixinApi.isBuildVessel(vessel) && MixinApi.isHandWorked(vessel)) {
      this.workByHand(vessel, context);
      return;
    }
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(
        context,
        Mml.compose`There's nothing here to ${verb}.`,
        "no-vessel",
      );
      return;
    }
    if (vessel.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(vessel)} is empty — there's nothing to ${verb} yet.`,
        "empty-build",
      );
      return;
    }

    const built: Stuff & Builds = vessel;
    this.engageStep(context, {
      durationMs: this.paceMs(STIR_MS, vessel, ["shaker", "mixing-glass", "pot"]),
      effortW: 150,
      beginSelf: Mml.compose`You begin to ${verb} ${Mml.thing(vessel)}.`,
      onComplete: () => {
        built.setBuildMethod(method);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You ${verb} ${Mml.thing(built)} well.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(built)}.`)
          .send();
      },
    });
  }

  /** The working a vessel names — its finishing technique, else stirring. */
  private workingOf(vessel: Stuff | null): BuildMethod {
    if (vessel === null || !MixinApi.isTool(vessel)) return "stirred";
    let best: TechniqueSpec | null = null;
    for (const { technique } of vessel.capabilityTechniques()) {
      if (best === null || (technique.priority ?? 0) > (best.priority ?? 0)) {
        best = technique;
      }
    }
    return best?.name ?? "stirred";
  }

  /** The hand-worked arm — the vessel answers what came of it; this words it. */
  private workByHand(
    vessel: Stuff & HandWorked,
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    const verb = "work";
    this.engageStep(context, {
      durationMs: CHURN_MS,
      effortW: 150,
      beginSelf: Mml.compose`You begin to ${verb} ${Mml.thing(vessel)}.`,
      onComplete: () => {
        const out = vessel.workByHand();
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            out === null
              ? Mml.compose`You ${verb} ${Mml.thing(vessel)}, but there is nothing in it to work.`
              : Mml.compose`You ${verb} ${Mml.thing(vessel)} hard. ${StirController.handWorkWords(out.facts)}`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`)
          .send();
      },
    });
  }

  /** ⭐ What working a charge by hand came to, in words (D4) — exhaustively. */
  private static handWorkWords(facts: HandWorkFacts): string {
    switch (facts.result) {
      case "came":
        return "The sound changes: it thumps instead of sloshing. The butter has come.";
      case "came-greasy":
        return "It comes all at once, soft and greasy — too warm. It is butter, but not good butter.";
      case "too-cold":
        return "It slops and thickens and will not come. It is too cold to break.";
      case "not-cream":
        return "It sloshes about, and nothing comes of it. Only cream will churn.";
      case "already-come":
        return "It has already come — there is butter in there, waiting for the buttermilk to be drawn off.";
      default: {
        const never: never = facts.result;
        return never;
      }
    }
  }
}
