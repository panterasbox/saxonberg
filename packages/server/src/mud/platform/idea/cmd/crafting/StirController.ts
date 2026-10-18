/**
 * StirController — `stir` / `shake` / `churn` (record how the build was
 * worked).
 *
 * An engaged step that, at completion, records the build method on the
 * vessel (`stir` → stirred, `shake` → shaken, `churn` → churned). No
 * matter moves — it's the working of what's already banked. The verb
 * picks the method.
 *
 * ⭐ A vessel that is not a build but answers {@link HandWorked} — a butter
 * churn (dairy D5) — is worked the same way, and says itself what came of
 * it. The view's arg is `requires: any` for that reason; the controller
 * narrows to the two arms.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type {
  Builds,
  BuildMethod,
  HandWorked,
} from "../../../../lib/craft/ManualBuild";
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
  execute(model: StirModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const verb = context.verb;
    const method: BuildMethod =
      verb === "shake" ? "shaken" : verb === "churn" ? "churned" : "stirred";

    const vessel: Stuff | null =
      model.vessel?.stuff ?? null;
    if (vessel && !MixinApi.isBuildVessel(vessel) && isHandWorked(vessel)) {
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
        const line = vessel.workByHand(method);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            line === null
              ? Mml.compose`You ${verb} ${Mml.thing(vessel)}, but there is nothing in it to work.`
              : Mml.compose`You ${verb} ${Mml.thing(vessel)} hard. ${line}`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} ${verb}s ${Mml.thing(vessel)}.`)
          .send();
      },
    });
  }
}

/** Does this vessel answer {@link HandWorked}? Duck-probed. */
function isHandWorked(s: Stuff): s is Stuff & HandWorked {
  return typeof (s as unknown as Partial<HandWorked>).workByHand === "function";
}
