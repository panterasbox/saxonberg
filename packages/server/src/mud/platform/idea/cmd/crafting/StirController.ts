/**
 * StirController — `stir` / `shake` / `churn` (record how the build was
 * worked).
 *
 * An engaged step that, at completion, records the build method on the
 * vessel (`stir` → stirred, `shake` → shaken, `churn` → churned). No
 * matter moves — it's the working of what's already banked. The verb
 * picks the method.
 *
 * ⭐ A vessel that is not a build but is hand-worked (`HandWorkedMixin`) —
 * a butter churn (dairy D5) — is worked the same way, and says itself what
 * came of it. ⭐ A compounding vessel (ceramics R1) is asked for its knead
 * plan (`KneadVesselMixin`) — `stir` and `knead` are one act named by the
 * state of the matter, and the VESSEL decides how long and how hard it is.
 * The view's arg is `requires: any` for that reason; the controller
 * narrows to the arms.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Builds, BuildMethod } from "../../../../lib/craft/ManualBuild";
import type { HandWorked } from "../../../../lib/craft/HandWorked";
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

export default class StirController extends ManualBuildController<StirModel> {
  async execute(model: StirModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const verb = context.verb;
    const method: BuildMethod =
      verb === "shake" ? "shaken" : verb === "churn" ? "churned" : "stirred";

    const vessel: Stuff | null =
      model.vessel?.stuff ?? null;
    // ⭐ A compounding vessel (ceramics R1): what is in it becomes one
    // product, its makeup the inputs' by mass — the slurry, powder and
    // liquid twin of `knead`, so it is the vessel's KNEAD plan, asked with
    // this verb. No recipe is consulted.
    if (vessel && MixinApi.isCompounding(vessel)) {
      const plan = await vessel.kneadPlanFor({
        actor: giver,
        commandText: context.commandText,
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
      if (!plan.ok) {
        this.declineStep(context, plan.line, plan.reason);
        return;
      }
      await this.engagePlan(context, plan);
      return;
    }
    if (vessel && !MixinApi.isBuildVessel(vessel) && MixinApi.isHandWorked(vessel)) {
      this.workByHand(vessel, method, verb, context);
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
    const commandText = context.commandText;
    this.engageStep(context, {
      durationMs: this.paceMs(STIR_MS, vessel, ["shaker", "mixing-glass", "pot"]),
      effortW: 150,
      beginSelf: Mml.compose`You begin to ${verb} ${Mml.thing(vessel)}.`,
      onComplete: () => {
        built.setBuildMethod(method);
        built.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You ${verb} ${Mml.thing(built)} well.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(built)}.`)
          .send();
      },
    });
  }

  /** The hand-worked arm — the vessel says what came of it. */
  private workByHand(
    vessel: Stuff & HandWorked,
    method: BuildMethod,
    verb: string,
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    this.engageStep(context, {
      durationMs: CHURN_MS,
      effortW: 150,
      beginSelf: Mml.compose`You begin to ${verb} ${Mml.thing(vessel)}.`,
      onComplete: () => {
        const out = vessel.workByHand(method);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            out === null
              ? Mml.compose`You ${verb} ${Mml.thing(vessel)}, but there is nothing in it to work.`
              : Mml.compose`You ${verb} ${Mml.thing(vessel)} hard. ${out.line}`,
          )
          .toPeers(out?.peers ?? Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`)
          .send();
      },
    });
  }
}
