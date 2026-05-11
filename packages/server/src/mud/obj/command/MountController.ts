/**
 * MountController — occupy the target's mount slot, set posture to
 * Mounted. Atomic vacate-then-occupy via SlotApi.transferOccupancy.
 *
 * Detail-keyword targeting (`mount back`) routes via MQL → Detail →
 * SlotApi.resolveSlot pathway when the target is a Stuff with a
 * detail-decorated slot. The MQL resolver hands us the host (e.g.,
 * the horse); we resolve the matching slot here.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Slottable } from '../../lib/slot/Slottable';
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
      return {
        success: false,
        summary:
          `you can't mount ${DescribeApi.getDisplayName(target, 'that')}`,
      };
    }
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver) || !MixinApi.isSlottable(giver)) {
      return { success: false, summary: `you can't mount` };
    }

    const mountSlot = target.getMountSlot();
    if (target.isSlotFull(mountSlot)) {
      return {
        success: false,
        summary:
          `${DescribeApi.getDisplayName(target, 'that')} is already mounted`,
      };
    }
    if (!target.canOccupy(giver as Stuff & Slottable, mountSlot)) {
      return { success: false, summary: `you can't fit on it` };
    }

    // Find any current posture-bearing slot to vacate atomically.
    const from = PostureApi.findCurrentPostureBearingSlot(
      giver as Stuff & Slottable
    );

    try {
      SlotApi.transferOccupancy(
        giver as Stuff & Slottable,
        from,
        { host: target, slot: mountSlot }
      );
    } catch (err) {
      return { success: false, summary: (err as Error).message };
    }
    (giver as unknown as { setPosture(p: string): void }).setPosture(
      Postures.Mounted
    );
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
