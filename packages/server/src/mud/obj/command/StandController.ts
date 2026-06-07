/**
 * StandController — slot-less posture flip per § 12 asymmetry.
 * Vacates any current posture-bearing slot and sets posture to Stand.
 * With an argument (`stand <X>`), occupies a slot on X accepting the
 * Stand posture (e.g., standing on a chair or table) via
 * `PostureApi.transferPosture`.
 *
 * Validation surface (from `cmd/stand.yaml`):
 *   - requiresAnimate, requiresPosed (verb-level)
 *   - mustBeVisible, mustBePostured (target-level — only with arg)
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { Postures } from '../../lib/slot/Postured';
import { PostureApi } from '../../api/posture';

interface StandModel extends CommandModel {
  target?: MqlOneResult;
}

export class StandController extends CommandController<StandModel> {
  execute(model: StandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `StandController: requiresPosed validator should have caught ${giver.stuffId}`
      );
    }

    // With-arg form: stand ON something (chair, table, …).
    const target = model.target?.stuff;
    if (target) {
      if (!MixinApi.isPostured(target)) {
        throw new Error(
          `StandController: mustBePostured validator should have caught ${target.stuffId}`
        );
      }
      if (!MixinApi.isSlottable(giver)) {
        throw new Error(
          `StandController: requiresSlottable expected — actor cannot occupy a slot`
        );
      }
      const result = PostureApi.transferPosture(
        giver,
        target,
        Postures.Stand,
        'stand'
      );
      if (!result.ok) {
        MessageApi.scene(giver)
          .topic('world.narration.action')
          .toSelf(Mml.compose`${result.summary}`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: result.reason,
          detail: result.summary,
        });
        return;
      }
      const name = DescribeApi.getDisplayName(target);
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You stand on ${Mml.item(target)}.`)
        .toPeers(
          Mml.compose`${Mml.name(giver)} stands on ${Mml.item(target)}.`
        )
        .send();
      return;
    }

    // Slot-less form: just vacate any current posture-bearing slot.
    PostureApi.vacatePostureBearingSlots(giver);
    giver.setPosture(Postures.Stand);
    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(Mml.compose`You stand up.`)
      .toPeers(Mml.compose`${Mml.name(giver)} stands up.`)
      .send();
    return;
  }
}
