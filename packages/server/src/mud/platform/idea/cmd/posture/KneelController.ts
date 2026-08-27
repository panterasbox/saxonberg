/**
 * KneelController — `sit`'s `Postures.Kneel` sibling. See SitController
 * for the validation + workflow shape.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PostureApi } from '../../../../api/posture';
import { Postures } from '../../../../lib/slot/Postured';

interface KneelModel extends CommandModel {
  target: MqlOneResult;
}

export default class KneelController extends CommandController<KneelModel> {
  execute(model: KneelModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isPostured(target)) {
      throw new Error(
        `KneelController: requires: PosturedMixin should have caught ${target.stuffId}`
      );
    }
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
    if (!result.ok) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`${result.summary}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: result.reason,
        detail: result.summary,
      });
      return;
    }

    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You kneel down.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} kneels down.`)
      .send();
    return;
  }
}
