/**
 * MountController — occupy the target's mount slot, set posture to
 * Mounted. Atomic vacate-then-occupy via SlotApi.transferOccupancy.
 *
 * Detail-keyword targeting (`mount back`) routes via MQL → Detail →
 * SlotApi.resolveSlot pathway when the target is a Stuff with a
 * detail-decorated slot. The MQL resolver hands us the host (e.g.,
 * the horse); we resolve the matching slot here.
 *
 * Validation surface (from `cmd/mount.yaml`):
 *   - requiresAnimate, requiresPosed, requiresSlottable (verb-level)
 *   - mustBeVisible, mustBeMountable (target-level)
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
import { SlotApi } from '../../api/slot';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface MountModel extends CommandModel {
  target: MqlOneResult;
}

export default class MountController extends CommandController<MountModel> {
  execute(model: MountModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isMountable(target)) {
      throw new Error(
        `MountController: mustBeMountable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `MountController: requiresPosed validator should have caught ${giver.stuffId}`
      );
    }
    if (!MixinApi.isSlottable(giver)) {
      throw new Error(
        `MountController: requiresSlottable validator should have caught ${giver.stuffId}`
      );
    }

    const mountSlot = target.getMountSlot();
    if (target.isSlotFull(mountSlot)) {
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`${Mml.item(target)} is already mounted.`)
        .send();
      context.note({
        kind: 'slot-occupied',
        host: MessageApi.refOf(target),
        slot: mountSlot,
      });
      return;
    }
    if (!target.canOccupy(giver, mountSlot)) {
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You can't fit on it.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-size',
        detail: 'target.canOccupy returned false',
      });
      return;
    }

    const from = PostureApi.findCurrentPostureBearingSlot(giver);

    // SlotApi.transferOccupancy may throw on race or shape
    // violations; dispatcher's outer catch emits controller-error
    // uniformly.
    SlotApi.transferOccupancy(
      giver,
      from,
      { host: target, slot: mountSlot }
    );
    giver.setPosture(Postures.Mounted);
    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(Mml.compose`You mount ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} mounts ${Mml.item(target)}.`
      )
      .send();
    return;
  }
}
