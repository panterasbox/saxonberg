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
  execute(model: RemoveModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You don't have any '${model.target.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `RemoveController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `RemoveController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You have no body plan.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'BodyPlanMixin' });
      return;
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    let any = false;
    for (const slot of slots) {
      if (giver.vacate(slot, target)) any = true;
    }
    if (!any) {
      MessageApi.scene(giver)
        .topic(MessageApi.Topics.world.perception.inventory)
        .toSelf(Mml.compose`You aren't wearing ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-wearing',
        detail: `you aren't wearing ${DescribeApi.getDisplayName(target, 'that')}`,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You take off ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} takes off ${Mml.item(target)}.`
      )
      .send();
    return;
  }
}
