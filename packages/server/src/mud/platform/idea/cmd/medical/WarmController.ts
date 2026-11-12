/**
 * WarmController — ⭐ **warm a frozen part (or a body gone cold).**
 *
 * Frostbite is NOT a burn: what it wants is warmth, not fluid. Warming a
 * frozen part applies its treatment (`resolve` → the part reads
 * *rewarmed*), so it knits at the treated rate; it also relieves a
 * `by: warmth` affliction — a body gone too cold (hypothermia, torpor).
 *
 * ⚠ Its own verb, afforded by the `BurnerMixin`'s `peers` bucket (a
 * hearth, a campfire, a furnace) — you learn it standing by a fire. The
 * fire must actually be BURNING; a cold hearth warms nothing.
 */

import { ElementTreatmentControllerBase, type ElementTreatmentModel } from './ElementTreatmentControllerBase';
import type { CommandContext } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface WarmModel extends ElementTreatmentModel {
  source?: MqlManyResult;
}

export default class WarmController extends ElementTreatmentControllerBase<WarmModel> {
  async execute(model: WarmModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const patient = this.patientOf(model, context, 'There is nothing there to warm.');
    if (!patient) return;
    const { target, self } = patient;

    // A NARROWING over what the binder bound: a fire that is burning.
    const fire = (model.source?.stuff ?? []).some((c) => MixinApi.isCombustible(c) && c.isBurning());
    if (!fire) {
      return this.fail(context, 'There is no fire burning here to warm it by.', 'no-fire');
    }

    await this.treatWith(context, target, 'warmth', `${self ? 'You have' : 'They have'} nothing that warmth would help.`, {
      self: self
        ? Mml.compose`You warm yourself by the fire until the numbness lifts and the feeling comes back.`
        : Mml.compose`You warm ${Mml.thing(target)} by the fire until the numbness lifts.`,
      peers: self
        ? Mml.compose`${Mml.actor(giver)} warms themselves by the fire.`
        : Mml.compose`${Mml.actor(giver)} warms ${Mml.thing(target)} by the fire.`,
    });
  }
}
