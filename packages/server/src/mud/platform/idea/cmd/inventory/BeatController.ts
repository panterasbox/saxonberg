/**
 * BeatController — `beat <rug>` (cleanliness D15): the debris knocked out
 * of a rug by time and effort alone. Not a wash — no water, no cleanser;
 * only what is loose comes out.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';
const BEAT_MS = 10000;
/** What beating loosens: the kinds that are debris, not stain. */
const LOOSE = ['crumbs', 'mud', 'ash', 'flour', 'dust'];

interface BeatModel extends CommandModel {
  target?: MqlOneResult;
}

export default class BeatController extends ManualBuildController<BeatModel> {
  execute(model: BeatModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const rug = model.target?.stuff ?? null;
    if (!rug || !MixinApi.isSoilable(rug)) {
      this.declineStep(context, Mml.compose`Beat what?`, 'no-target');
      return;
    }
    this.engageStep(context, {
      durationMs: BEAT_MS,
      effortW: 400,
      beginSelf: Mml.compose`You hang ${Mml.thing(rug)} over something and set about it.`,
      onComplete: () => {
        let any = false;
        for (const kind of rug.soilKinds('')) {
          if (!LOOSE.includes(kind)) continue;
          if (rug.removeSoil(kind, 0.8, '') > 0) any = true;
        }
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            any
              ? Mml.compose`A cloud comes out of ${Mml.thing(rug)}, and then less, and then hardly any.`
              : Mml.compose`You beat ${Mml.thing(rug)}, and nothing much comes out of it.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} beats ${Mml.thing(rug)}.`)
          .send();
      },
    });
  }
}
