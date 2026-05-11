/**
 * UnwieldController — vacate the held slots a Wieldable currently claims.
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
import { SpeciesApi } from '../../api/species';

interface UnwieldModel extends CommandModel {
  target: MqlOneResult;
}

export class UnwieldController extends CommandController<UnwieldModel> {
  execute(model: UnwieldModel, context: CommandContext): CommandResult {
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
        summary: `${DescribeApi.getDisplayName(target, 'that')} isn't wieldable`,
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
    let any = false;
    for (const slot of slots) {
      if (giver.vacate(slot, target)) any = true;
    }
    if (!any) {
      return {
        success: false,
        summary: `you aren't wielding ${DescribeApi.getDisplayName(target, 'that')}`,
      };
    }
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You stop wielding ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} stops wielding ${Mml.item(target)}.`
      )
      .send();
    return { success: true };
  }
}
