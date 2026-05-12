/**
 * SitController — set actor.posture to Sit on a posture-bearing slot
 * of the target host. Atomicity (vacate any current posture-bearing
 * slot before occupying the new one) is centralized in
 * `PostureApi.transferPosture`; controller owns the narration.
 *
 * Validation surface (from `cmd/sit.yaml`):
 *   - requiresAnimate, requiresPosed, requiresSlottable (verb-level)
 *   - mustBeVisible, mustBePostured (target-level)
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface SitModel extends CommandModel {
  target: MqlOneResult;
}

export class SitController extends CommandController<SitModel> {
  execute(model: SitModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.narration.action)
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
        `SitController: mustBePostured validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      throw new Error(
        `SitController: requiresPosed/Slottable validators should have caught ${giver.stuffId}`
      );
    }

    const result = PostureApi.transferPosture(
      giver,
      target,
      Postures.Sit,
      'sit'
    );
    if (!result.ok) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.narration.action)
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
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You sit down.`)
      .toPeers(Mml.compose`${Mml.name(giver)} sits down.`)
      .send();
    return;
  }
}
