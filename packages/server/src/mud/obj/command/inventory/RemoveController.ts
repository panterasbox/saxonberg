/**
 * RemoveController — vacate the slots a Wearable currently claims.
 *
 * Validation surface (from `cmd/remove.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory, mustBeWearable (target-level)
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
import { SpeciesApi } from '../../../api/species';

interface RemoveModel extends CommandModel {
  target: MqlOneResult;
}

export default class RemoveController extends CommandController<RemoveModel> {
  execute(model: RemoveModel, context: CommandContext): void {
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
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You have no body plan.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'BodyPlanMixin' });
      return;
    }
    // ── The cursed release gate (magic-items D11) ──
    //
    // A cursed item will not come off. For a CHARGED one it is worse
    // than that: it is stuck on you AND discharging into you — which is
    // one fact from the wearer's side, so the gate and the discharge are
    // one call rather than two features that happen to co-occur.
    //
    // Note the ordering: this fires only for something actually WORN
    // (the vacate loop below would have reported "you aren't wearing
    // that" otherwise), so a cursed item in your pack refuses nothing.
    if (MixinApi.isBlessable(target) && target.refusesRelease()) {
      const worn = target
        .getSlotClaim(bodyPlanPath)
        .some((slot) => giver.getOccupants(slot).has(target));
      if (worn) {
        const dumped = target.dischargeIntoHolder(giver);
        MessageApi.scene(giver)
          .topic('world.perception.inventory')
          .toSelf(
            dumped > 0
              ? Mml.compose`${Mml.item(target)} will not come away — and it is running hot against your skin.`
              : Mml.compose`${Mml.item(target)} will not come away. It has no intention of letting go.`,
          )
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'cursed-will-not-release',
          detail: `${target.getPresentation()} refuses release`,
        });
        return;
      }
    }

    const slots = target.getSlotClaim(bodyPlanPath);
    let any = false;
    for (const slot of slots) {
      if (giver.vacate(slot, target)) any = true;
    }
    if (!any) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You aren't wearing ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-wearing',
        detail: `you aren't wearing ${target.getPresentation()}`,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic('world.perception.inventory')
      .toSelf(Mml.compose`You take off ${Mml.item(target)}.`)
      .toPeers(
        Mml.compose`${Mml.name(giver)} takes off ${Mml.item(target)}.`
      )
      .send();
    return;
  }
}
