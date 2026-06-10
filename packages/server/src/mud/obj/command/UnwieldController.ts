/**
 * UnwieldController — vacate the held slots a Wieldable currently claims.
 *
 * Validation surface (from `cmd/unwield.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory, mustBeWieldable (target-level)
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

interface UnwieldModel extends CommandModel {
  target: MqlOneResult;
}

export default class UnwieldController extends CommandController<UnwieldModel> {
  execute(model: UnwieldModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You don't have any '${model.target.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }
    if (!MixinApi.isWieldable(target)) {
      throw new Error(
        `UnwieldController: mustBeWieldable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `UnwieldController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
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
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You aren't wielding ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-wielding',
        detail: `you aren't wielding ${DescribeApi.getDisplayName(target)}`,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You stop wielding ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} stops wielding ${Mml.item(target)}.`
      )
      .send();
    return;
  }
}
