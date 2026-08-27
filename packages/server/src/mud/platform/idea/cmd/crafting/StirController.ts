/**
 * StirController — `stir` / `shake` (record how the build was worked).
 *
 * An engaged step that, at completion, records the build method on the
 * vessel (`stir` → stirred, `shake` → shaken). No matter moves — it's the
 * working of what's already banked. The verb (`stir` vs `shake`) picks
 * the method.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Builds, BuildMethod } from "../../../../lib/craft/ManualBuild";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";
const STIR_MS = 4000;

interface StirModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class StirController extends ManualBuildController<StirModel> {
  execute(model: StirModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const verb = context.verb;
    const method: BuildMethod = verb === "shake" ? "shaken" : "stirred";

    const vessel: Stuff | null =
      model.vessel?.stuff ?? this.findBuildVessel(giver);
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
}
