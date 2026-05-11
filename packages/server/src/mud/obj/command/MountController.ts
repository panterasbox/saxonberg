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
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { SlotApi } from '../../api/slot';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface MountModel extends CommandModel {
  target: MqlOneResult;
}

export class MountController extends CommandController<MountModel> {
  execute(model: MountModel, context: CommandContext): CommandResult {
    const target = model.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't see any '${model.target.raw}' here`,
      };
    }
    if (!MixinApi.isMountable(target)) {
      throw new Error(
        `MountController: mustBeMountable validator should have caught ${target.stuffId}`
      );
    }
    const giver = context.commandGiver;
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
      return {
        success: false,
        summary:
          `${DescribeApi.getDisplayName(target, 'that')} is already mounted`,
      };
    }
    if (!target.canOccupy(giver, mountSlot)) {
      return { success: false, summary: `you can't fit on it` };
    }

    const from = PostureApi.findCurrentPostureBearingSlot(giver);

    try {
      SlotApi.transferOccupancy(
        giver,
        from,
        { host: target, slot: mountSlot }
      );
    } catch (err) {
      return { success: false, summary: (err as Error).message };
    }
    giver.setPosture(Postures.Mounted);
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You mount ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} mounts ${Mml.item(target)}.`
      )
      .send();
    return { success: true };
  }
}
