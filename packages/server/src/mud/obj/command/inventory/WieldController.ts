/**
 * WieldController — claim a Wieldable's body-plan held slots on the actor.
 *
 * Validation surface (from `cmd/wield.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory, mustBeWieldable (target-level)
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { SlotApi } from '../../../api/slot';
import { SpeciesApi } from '../../../api/species';

interface WieldModel extends CommandModel {
  target: MqlOneResult;
}

export default class WieldController extends CommandController<WieldModel> {
  execute(model: WieldModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    if (!target) {
      MessageApi.scene(giver)
        .topic('sense.survey')
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
        `WieldController: mustBeWieldable validator should have caught ${target.stuffId}`
      );
    }
    // Hands-occupied while hauling: you can't wield while gripping a cart's
    // handle. Keyed on the giver being the hauler — a mounted rider whose
    // horse hauls is NOT the hauler, so their hands stay free.
    if (MixinApi.isHauling(giver) && giver.isHitched()) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`Your hands are full — you're pulling ${Mml.thing(giver.getHauledCart()!)}.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'hands-hauling',
        detail: 'cannot wield while hauling a cart',
      });
      return;
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `WieldController: requiresSlotted validator should have caught ${giver.stuffId}`
      );
    }
    const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(giver);
    if (!bodyPlanPath) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You have no body plan.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'BodyPlanMixin' });
      return;
    }
    const slots = target.getSlotClaim(bodyPlanPath);
    if (slots.length === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(target)} doesn't fit your hands.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-fit',
        detail: `${target.getPresentation()} doesn't fit your hands`,
      });
      return;
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`Your hands are full.`)
          .send();
        context.note({
          kind: 'slot-occupied',
          host: MessageApi.refOf(giver),
          slot,
        });
        return;
      }
    }
    // SlotApi.occupyAll may throw on race or shape violations;
    // dispatcher's outer catch emits controller-error uniformly.
    SlotApi.occupyAll(giver, target, [...slots]);
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You wield ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} wields ${Mml.thing(target)}.`
      )
      .send();
    return;
  }
}
