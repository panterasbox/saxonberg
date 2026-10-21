/**
 * SitController — set actor.posture to Sit on a posture-bearing slot
 * of the target host. Atomicity (vacate any current posture-bearing
 * slot before occupying the new one) is centralized in
 * the actor's own `transferPosture` (the OO sweep). controller owns the narration.
 *
 * Validation surface (from `cmd/sit.yaml`):
 *   - requiresAnimate, requiresPosed, requiresSlottable (verb-level)
 *   - `requires: [VisibleMixin, PosturedMixin]` (target-level)
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
import { Postures } from '../../../../lib/slot/Postured';
import Place from '../../../../lib/stuff/Place';

interface SitModel extends CommandModel {
  target: MqlOneResult;
}

export default class SitController extends CommandController<SitModel> {
  execute(model: SitModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      // ⭐ No ground here at all (mid-water): the place says why.
      const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
      const why = room instanceof Place ? room.groundRefusal(model.target.raw) : null;
      if (why !== null) return this.refuse(context, 'act.deed', why, 'no-ground');
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
        `SitController: requires: PosturedMixin should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      throw new Error(
        `SitController: requiresPosed/Slottable validators should have caught ${giver.stuffId}`
      );
    }

    const result = giver.transferPosture(target,
      Postures.Sit,
      'sit'
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
      .toSelf(Mml.compose`You sit down.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} sits down.`)
      .send();
    return;
  }
}
