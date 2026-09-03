/**
 * HeatController — `heat [<workpiece|pot>]` (a manual-build step, both
 * branches).
 *
 * An engaged step that works the build at the fire: requires reachable
 * heat > 0 (a cold forge / no fire declines diegetically) and, at
 * completion, **latches the reached heat** onto the build buffer
 * (`noteHeat` — max-latching), which the terminal mint's reverse-match
 * reads against each recipe's `requiresHeatK`. Works on any `Builds`
 * host: the smithing workpiece (the ingot in the tongs) or the cook pot.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
const HEAT_MS = 4000;

interface HeatModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HeatController extends ManualBuildController<HeatModel> {
  execute(model: HeatModel, context: CommandContext): void {
    const giver = context.commandGiver;

    const target: Stuff | null =
      model.target?.stuff ?? this.findBuildVessel(giver);
    if (!target || !MixinApi.isBuildVessel(target)) {
      this.declineStep(
        context,
        Mml.compose`Heat what? You need a workpiece or a pot to work.`,
        'no-vessel',
      );
      return;
    }

    const reachableK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
    if (reachableK <= 0) {
      this.declineStep(
        context,
        Mml.compose`There's no fire here hot enough to work with.`,
        'insufficient-heat',
      );
      return;
    }

    const build = target;
    const commandText = context.commandText;
    this.engageStep(context, {
      durationMs: this.paceMs(HEAT_MS, target, ["pot"]),
      beginSelf: Mml.compose`You bring ${Mml.thing(target)} to the fire and let it take the heat.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} brings ${Mml.thing(target)} to the fire.`,
      onComplete: () => {
        // Re-read at completion — the fire may have died mid-step; you
        // latch the heat you actually finished at.
        const finalK = (MixinApi.isThermal(giver) ? giver.reachableHeatK() : 0);
        if (finalK > 0) build.noteHeat(finalK);
        build.recordCommand(commandText);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${Mml.thing(target)} takes the heat, glowing with it.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} works ${Mml.thing(target)} in the heat.`)
          .send();
      },
    });
  }
}
