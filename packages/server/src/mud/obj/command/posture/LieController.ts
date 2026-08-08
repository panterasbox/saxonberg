/**
 * LieController — `sit`'s `Postures.Lie` sibling. See SitController
 * for the validation + workflow shape.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { PostureApi } from '../../../api/posture';
import { Postures } from '../../../lib/slot/Postured';

interface LieModel extends CommandModel {
  target: MqlOneResult;
}

export default class LieController extends CommandController<LieModel> {
  execute(model: LieModel, context: CommandContext): void {
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
        `LieController: mustBePostured validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      throw new Error(
        `LieController: requiresPosed/Slottable validators should have caught ${giver.stuffId}`
      );
    }

    const result = PostureApi.transferPosture(
      giver,
      target,
      Postures.Lie,
      'lie'
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
      .toSelf(Mml.compose`You lie down.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lies down.`)
      .send();
    return;
  }
}
