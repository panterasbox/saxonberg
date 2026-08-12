/**
 * WearController — claim a Wearable's body-plan slots on the actor.
 *
 * Multi-slot claims are atomic via `SlotApi.occupyAll`.
 *
 * Validation surface (from `cmd/wear.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory (target-level) + `requires: WearableMixin`
 *
 * The TypeScript narrows below throw if reached — meaning a validator
 * failed to do its job. They're not user-facing failure paths.
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

interface WearModel extends CommandModel {
  target: MqlOneResult;
}

export default class WearController extends CommandController<WearModel> {
  execute(model: WearModel, context: CommandContext): void {
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
    if (!MixinApi.isWearable(target)) {
      throw new Error(
        `WearController: mustBeWearable validator should have caught ${target.stuffId}`
      );
    }
    if (!MixinApi.isSlotted(giver)) {
      throw new Error(
        `WearController: requiresSlotted validator should have caught ${giver.stuffId}`
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
          Mml.compose`${Mml.thing(target)} doesn't fit your body.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'wrong-fit',
        detail: `${target.getPresentation()} doesn't fit your body`,
      });
      return;
    }
    for (const slot of slots) {
      if (giver.isSlotFull(slot)) {
        MessageApi.scene(giver)
          .topic('sense.survey')
          .toSelf(Mml.compose`Your ${slot} is occupied.`)
          .send();
        context.note({
          kind: 'slot-occupied',
          host: MessageApi.refOf(giver),
          slot,
        });
        return;
      }
    }
    // SlotApi.occupyAll may throw on race conditions or shape
    // violations; the dispatcher's outer catch emits
    // controller-error uniformly — no try/catch here per plan.
    SlotApi.occupyAll(giver, target, [...slots]);
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You put on ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} puts on ${Mml.thing(target)}.`
      )
      .send();
    return;
  }
}
