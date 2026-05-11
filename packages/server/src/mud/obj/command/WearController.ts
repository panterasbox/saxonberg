/**
 * WearController — claim a Wearable's body-plan slots on the actor.
 *
 * Multi-slot claims are atomic via `SlotApi.occupyAll`.
 *
 * Validation surface (from `cmd/wear.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory, mustBeWearable (target-level)
 *
 * The TypeScript narrows below throw if reached — meaning a validator
 * failed to do its job. They're not user-facing failure paths.
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
import { SpeciesApi } from '../../api/species';

interface WearModel extends CommandModel {
  target: MqlOneResult;
}

export class WearController extends CommandController<WearModel> {
  execute(model: WearModel, context: CommandContext): CommandResult {
    const target = model.target.stuff;
    if (!target) {
      return {
        success: false,
        summary: `you don't have any '${model.target.raw}'`,
      };
    }
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `WearController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `WearController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      return { success: false, summary: `you have no body plan` };
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) {
      return {
        success: false,
        summary:
          `${DescribeApi.getDisplayName(target, 'that')} doesn't fit your body`,
      };
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        return { success: false, summary: `your ${slot} is occupied` };
      }
    }
    try {
      SlotApi.occupyAll(giver, target, [...slots]);
    } catch (err) {
      return { success: false, summary: (err as Error).message };
    }
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You put on ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} puts on ${Mml.item(target)}.`
      )
      .send();
    return { success: true };
  }
}
