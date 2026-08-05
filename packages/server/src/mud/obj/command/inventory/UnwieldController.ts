/**
 * UnwieldController — vacate the held slots a Wieldable currently claims.
 *
 * Validation surface (from `cmd/unwield.yaml`):
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
import { SpeciesApi } from '../../../api/species';

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
    // **Cursed sticks** — the same gate `remove` runs, because a cursed
    // thing that would not come off your body but slid out of your hand
    // is not a curse, it is a formality. This verb had no gate at all,
    // so the recourse for any cursed *wielded* item was `unwield`.
    const release = giver.tryReleaseFromSlots(target);
    if (!release.released) {
      MessageApi.scene(giver)
        .topic('world.perception.inventory')
        .toSelf(
          release.dumpedKJ > 0
            ? Mml.compose`Your hand will not open around ${Mml.item(target)} — and it is running hot against your palm.`
            : Mml.compose`Your hand will not open around ${Mml.item(target)}. It has no intention of letting go.`,
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
        .topic('world.perception.inventory')
        .toSelf(Mml.compose`You aren't wielding ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-wielding',
        detail: `you aren't wielding ${target.getPresentation()}`,
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
