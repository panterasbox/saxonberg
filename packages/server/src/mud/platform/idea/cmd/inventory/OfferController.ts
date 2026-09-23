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
 * ⭐⭐ **The animal answers on one of three rungs** (`Bonded.offerRung`),
 * deterministic from how it is with people and how it is with YOU:
 *
 * - `hand` — it takes it, now.
 * - `approach` — you hold still for `APPROACH_MS` (an engagement on your
 *   hands, `OfferEngagement`) and it comes to you. Move, and it doesn't.
 *   ⭐ This is the taming scene; before it existed the offer resolved in
 *   zero time and there was no moment in which the animal decided.
 * - `after-you-go` — the food is set down and it eats once nobody it
 *   distrusts is standing over it (`feeds`' step-back rule, which is a
 *   mechanism now and not a sentence).
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
import { SchedulerApi } from '../../../../api/scheduler';
import { OfferEngagement } from '../../../../lib/husbandry/OfferEngagement';

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

    const rung = animal.offerRung(actor);

    if (rung === 'after-you-go') {
      // Set down rather than refused — an animal that will not take from
      // a hand can still be fed, and for a wild one this is the bottom
      // rung of the whole ladder. ⚠ Two reasons land here and only one
      // lifts: THIS animal not trusting you (feed it, and it climbs), or
      // its SPECIES having no `hand` rung (a canary never will).
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
        reason: animal.takesFromHand() ? 'too-wild-for-a-hand' : 'no-hand-rung',
        detail: animal.stuffId,
      });
      return;
    }

    // ⭐ ONE sentence for every refusal of the FOOD, and only from an
    // animal close enough to sniff it — a wild one is not, so its food
    // went on the floor above and the brain decides later. See the class
    // doc.
    if (refusal) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} sniffs at it and turns away.`)
        .toPeers(Mml.compose`${Mml.actor(animal)} sniffs at what ${Mml.actor(actor)} offers and turns away.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: refusal, detail: '' });
      return;
    }

    if (rung === 'approach') {
      // ⭐⭐ The taming scene. Your hands are busy for `APPROACH_MS`; keep
      // still and it comes. What happens at the end is the engagement's.
      if (!MixinApi.isEngaged(actor)) {
        this.say(context, actor, `You cannot hold anything out.`, 'not-engaged');
        return;
      }
      const result = SchedulerApi.start(
        new OfferEngagement({ actor, animal, food }),
      );
      if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
        context.note(result.note);
        MessageApi.scene(actor)
          .topic(TOPIC)
          .toSelf(Mml.compose`You hold ${Mml.thing(food)} out and keep still. ${Mml.actor(animal)} watches your hand.`)
          .toPeers(Mml.compose`${Mml.actor(actor)} holds ${Mml.thing(food)} out toward ${Mml.actor(animal)} and keeps still.`)
          .send();
        return;
      }
      if (result.ok && result.status === 'completed-sync') return;
      if (!result.ok && result.reason === 'engagement-conflict') {
        this.say(context, actor, `Your hands are busy with something else.`, 'engagement-conflict');
        return;
      }
      this.say(
        context,
        actor,
        `You can't hold it out just now.`,
        'start-rejected',
      );
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
