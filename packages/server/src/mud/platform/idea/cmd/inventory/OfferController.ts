/**
 * OfferController — `offer <food> to <animal>`, ⭐ **the give that can be
 * refused.**
 *
 * `give` ships and it force-moves: the recipient has no say. That is
 * right for handing a ledger to a clerk and wrong for everything an
 * animal does, so offering is its own verb — *you hold it out, and it
 * decides.*
 *
 * ⭐⭐ **Food from the hand is the strongest ordinary act in the build.**
 * It is worth more regard than petting, and it is the one thing filling
 * a bowl can never substitute for, because the animal knows the
 * difference between food and *you*.
 *
 * ⚠ Below the touch band it will not take from a hand at all. The food
 * is set down instead and left as a pending offer for the next beat —
 * *it waits until you step back* — which is exactly how you feed
 * something that does not trust you yet, and is the first rung of the
 * ladder that ends in it following you home.
 *
 * ⚠⚠ **Every refusal is the same shape on purpose.** Not hungry, turned,
 * or something only its nose can find — the animal sniffs and declines,
 * and never tells you which. A player who could read "it senses
 * contamination" would have a free contamination detector; what they
 * have instead is an animal that sometimes won't eat, which is what a
 * real one gives you.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';
import { TOUCH_BAND } from '../../../../lib/husbandry/Bonded';

const TOPIC = 'act.deed';

interface OfferModel extends CommandModel {
  food?: MqlOneResult;
  recipient?: MqlOneResult;
}

export default class OfferController extends CommandController<OfferModel> {
  async execute(model: OfferModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const food = model.food?.stuff;
    const animal = model.recipient?.stuff;

    if (!animal || !MixinApi.isBonded(animal)) {
      this.say(context, actor, `That isn't an animal you can offer food to.`, 'not-bondable');
      return;
    }
    if (!food) {
      this.say(context, actor, `Offer what?`, 'no-food');
      return;
    }

    const refusal = animal.wouldEat(food);
    if (refusal === 'not-edible') {
      this.say(context, actor, `It won't eat that.`, 'not-edible');
      return;
    }

    // ⚠⚠ **Two different reasons a hand does not work**, and they are
    // not the same thing at all.
    //
    // `tooWild` is about THIS animal and it lifts: feed it where it can
    // reach after you step back, and it climbs. ⭐ `noHandRung` is about
    // the SPECIES and never lifts — a canary will not take food from a
    // hand however devoted it is, which is why the feeding-style axis
    // exists. Both set the food down rather than refusing, because an
    // animal that cannot be hand-fed can still be fed.
    const tooWild =
      !MixinApi.isHandling(animal) || !animal.handlingAtLeast(TOUCH_BAND);
    const noHandRung = !animal.feedsBy('hand');
    if (tooWild || noHandRung) {
      const room = MixinApi.isContainable(animal) ? animal.getContainer() : null;
      if (room && MixinApi.isContainable(food) && MixinApi.isContainer(room)) {
        await ContainmentApi.move(food, room);
      }
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You set ${Mml.thing(food)} down. It waits until you step back.`)
        .toPeers(Mml.compose`${Mml.actor(actor)} sets ${Mml.thing(food)} down near ${Mml.actor(animal)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: noHandRung ? 'no-hand-rung' : 'too-wild-for-a-hand',
        detail: animal.stuffId,
      });
      return;
    }

    // ⭐ ONE sentence for every remaining refusal. See the class doc.
    if (refusal) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} sniffs at it and turns away.`)
        .toPeers(Mml.compose`${Mml.actor(animal)} sniffs at what ${Mml.actor(actor)} offers and turns away.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: refusal, detail: '' });
      return;
    }

    const ate = await animal.eatFood(food, actor);
    if (!ate) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} sniffs at it and turns away.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-hungry', detail: '' });
      return;
    }

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.actor(animal)} takes it from your hand.`)
      .toPeers(Mml.compose`${Mml.actor(animal)} takes food from ${Mml.actor(actor)}'s hand.`)
      .send();
  }

  private say(
    context: CommandContext,
    actor: Parameters<typeof MessageApi.scene>[0],
    line: string,
    reason: string,
  ): void {
    MessageApi.scene(actor).topic(TOPIC).toSelf(Mml.compose`${line}`).send();
    context.note({ kind: 'controller-rejected', reason, detail: '' });
  }
}
