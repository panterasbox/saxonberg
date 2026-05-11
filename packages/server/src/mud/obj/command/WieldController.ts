/**
 * WieldController — claim a Wieldable's body-plan held slots on the actor.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import { SlotApi } from '../../api/slot';
import { SpeciesApi } from '../../api/species';

interface WieldModel extends CommandModel {
  target: MqlOneResult;
}

export class WieldController extends CommandController<WieldModel> {
  execute(model: WieldModel, context: CommandContext): CommandResult {
    const target = model.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't have any '${model.target.raw}'`,
      };
    }
    if (!MixinApi.isWieldable(target)) {
      return {
        success: false,
        summary: `${DescribeApi.getDisplayName(target, 'that')} can't be wielded`,
      };
    }
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver)) {
      return { success: false, summary: `you have no body slots` };
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver as Stuff);
    if (!bodyPlanPath) {
      return { success: false, summary: `you have no body plan` };
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) {
      return {
        success: false,
        summary:
          `${DescribeApi.getDisplayName(target, 'that')} doesn't fit your hands`,
      };
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        return { success: false, summary: `your hands are full` };
      }
    }
    try {
      SlotApi.occupyAll(giver, target, [...slots]);
    } catch (err) {
      return { success: false, summary: (err as Error).message };
    }
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You wield ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} wields ${Mml.item(target)}.`
      )
      .send();
    return { success: true };
  }
}
