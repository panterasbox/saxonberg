/**
 * PetController — `pet <animal>`, ⭐ **the smallest act of attention
 * there is, and the one that cannot be delegated.**
 *
 * It does two things at once, deliberately: the animal gets a little
 * easier to handle (contact is what handling *is*), and it thinks a
 * little better of you. Handling and regard are the two factors of the
 * bond, so this one act moves both — which is why it is the ordinary
 * way a stray becomes yours, and why no amount of filling a bowl
 * substitutes for it.
 *
 * ⚠ **It refuses on the animal's terms, not yours.** Below the touch
 * band a hand is simply not permitted — you cannot pet a wild thing into
 * tameness, you have to earn the reach first — and below a floor of
 * affection it declines to be touched by *you* specifically. Both
 * refusals render as the same behaviour: *it moves off.* The animal is
 * not explaining itself.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { HANDLING_BANDS } from '../../../../lib/husbandry/Handling';
import { PET_REGARD, TOUCH_BAND } from '../../../../lib/husbandry/Bonded';

/** Diegetic world-action topic — an act, not speech. */
const TOPIC = 'act.deed';

/** Bond below which an animal will not be touched by THIS person. */
const TOUCH_BOND = 0.15;

interface PetModel extends CommandModel {
  target?: MqlOneResult;
}

export default class PetController extends CommandController<PetModel> {
  async execute(model: PetModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const animal = model.target?.stuff;
    if (!animal || !MixinApi.isBonded(animal) || !MixinApi.isHandling(animal)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`That isn't an animal you can keep.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-bondable',
        detail: animal?.stuffId ?? '',
      });
      return;
    }

    // ⚠ ONE refusal sentence for both gates. A player learns what to do
    // by watching the animal, not by being told which threshold they
    // missed — and an animal has no way to explain itself.
    const bandIndex = HANDLING_BANDS.indexOf(animal.handlingBand());
    const touchIndex = HANDLING_BANDS.indexOf(TOUCH_BAND);
    const tooWild = bandIndex < touchIndex;
    const tooCold = animal.bondWith(actor) < TOUCH_BOND;
    if (tooWild || tooCold) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.actor(animal)} moves off before you reach it.`)
        .toPeers(Mml.compose`${Mml.actor(animal)} moves off as ${Mml.actor(actor)} reaches for it.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: tooWild ? 'too-wild-to-touch' : 'not-your-animal',
        detail: animal.stuffId,
      });
      return;
    }

    animal.handle(0.5);
    if (MixinApi.isBeliefStore(animal)) animal.adjustRegard(actor, PET_REGARD);
    // ⭐ Being told to stay is released by being greeted: you came back,
    // so it is off duty. Nobody should have to remember a release verb.
    animal.setWaiting(false);

    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You run a hand over ${Mml.actor(animal)}. It leans into it.`)
      .toPeers(Mml.compose`${Mml.actor(actor)} runs a hand over ${Mml.actor(animal)}.`)
      .send();
  }
}
