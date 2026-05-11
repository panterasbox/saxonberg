/**
 * KneelController — `sit`'s `Postures.Kneel` sibling. See SitController
 * for the validation + workflow shape.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface KneelModel extends CommandModel {
  target: MqlOneResult;
}

export class KneelController extends CommandController<KneelModel> {
  execute(model: KneelModel, context: CommandContext): CommandResult {
    const target = model.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't see any '${model.target.raw}' here`,
      };
    }
    if (!MixinApi.isPostured(target)) {
      throw new Error(
        `KneelController: mustBePostured validator should have caught ${target.stuffId}`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      throw new Error(
        `KneelController: requiresPosed/Slottable validators should have caught ${giver.stuffId}`
      );
    }

    const result = PostureApi.transferPosture(
      giver,
      target,
      Postures.Kneel,
      'kneel'
    );
    if (!result.ok) return { success: false, summary: result.summary };

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You kneel down.`)
      .toPeers(Mml.compose`${Mml.name(giver)} kneels down.`)
      .send();
    return { success: true };
  }
}
