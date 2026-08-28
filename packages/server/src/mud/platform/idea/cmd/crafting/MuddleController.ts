/**
 * MuddleController — `muddle` (press the build's solids in the vessel).
 *
 * An engaged step like `stir` / `shake` that records the build method
 * `muddled` on the vessel. It needs a reachable **muddler** (the tool
 * capability) — a mojito is not made with a spoon. No matter moves; it's
 * the working of what's already banked (the mint reads the method for
 * the technique's chill / dilution — none for muddling; the leaves are
 * the point).
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Builds } from "../../../../lib/craft/ManualBuild";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";
const MUDDLE_MS = 5000;
const MUDDLER = "muddler";

interface MuddleModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class MuddleController extends ManualBuildController<MuddleModel> {
  execute(model: MuddleModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const vessel: Stuff | null =
      model.vessel?.stuff ?? this.findBuildVessel(giver);
    if (!vessel || !MixinApi.isBuildVessel(vessel)) {
      this.declineStep(context, Mml.compose`There's nothing here to muddle.`, "no-vessel");
      return;
    }
    if (vessel.isBuildEmpty()) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(vessel)} is empty — there's nothing to muddle yet.`,
        "empty-build",
      );
      return;
    }
    const muddler = this.findCapability(giver, MUDDLER);
    if (!muddler) {
      this.declineStep(
        context,
        Mml.compose`You have nothing to muddle with.`,
        "missing-tool",
      );
      return;
    }

    const built: Stuff & Builds = vessel;
    const commandText = context.commandText;
    this.engageStep(context, {
      durationMs: this.paceMs(MUDDLE_MS, muddler, [MUDDLER]),
      beginSelf: Mml.compose`You set ${Mml.thing(muddler)} to ${Mml.thing(vessel)} and press.`,
      onComplete: () => {
        built.setBuildMethod("muddled");
        built.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`You muddle ${Mml.thing(built)} until the oils come up.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} muddles ${Mml.thing(built)}.`)
          .send();
      },
    });
  }
}
