/**
 * RemoveController — vacate the slots a Wearable currently claims.
 *
 * Validation surface (from `cmd/remove.yaml`):
 *   - requiresAnimate, requiresSlotted (verb-level)
 *   - mustBeInInventory (target-level) + `requires: WearableMixin`
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SpeciesApi } from '../../../../api/species';

interface RemoveModel extends CommandModel {
  target: MqlOneResult;
}

export default class RemoveController extends CommandController<RemoveModel> {
  execute(model: RemoveModel, context: CommandContext): void {
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
        .topic('sense.survey')
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
    // Note the ordering: `tryReleaseFromSlots` refuses only for
    // something actually WORN, so a cursed item in your pack refuses
    // nothing — the curse is a fact about wearing it, not owning it.
    const release = giver.tryReleaseFromSlots(target);
    if (!release.released) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          release.dumpedKJ > 0
            ? Mml.compose`${Mml.thing(target)} will not come away — and it is running hot against your skin.`
            : Mml.compose`${Mml.thing(target)} will not come away. It has no intention of letting go.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'cursed-will-not-release',
        detail: `${target.getPresentation()} refuses release`,
      });
      return;
    }
    if (release.vacated === 0) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You aren't wearing ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-wearing',
        detail: `you aren't wearing ${target.getPresentation()}`,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You take off ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} takes off ${Mml.thing(target)}.`
      )
      .send();
    return;
  }
}
