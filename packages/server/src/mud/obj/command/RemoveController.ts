/**
 * RemoveController — vacate the slots a Wearable currently claims.
 *
 * Validation surface (from `cmd/remove.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory, mustBeWearable (target-level)
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
import { SpeciesApi } from '../../api/species';

interface RemoveModel extends CommandModel {
  target: MqlOneResult;
}

export class RemoveController extends CommandController<RemoveModel> {
  execute(model: RemoveModel, context: CommandContext): CommandResult {
    const target = model.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't have any '${model.target.raw}'`,
      };
    }
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `RemoveController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `RemoveController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      return { success: false, summary: `you have no body plan` };
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    let any = false;
    for (const slot of slots) {
      if (giver.vacate(slot, target)) any = true;
    }
    if (!any) {
      return {
        success: false,
        summary: `you aren't wearing ${DescribeApi.getDisplayName(target, 'that')}`,
      };
    }
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You take off ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} takes off ${Mml.item(target)}.`
      )
      .send();
    return { success: true };
  }
}
