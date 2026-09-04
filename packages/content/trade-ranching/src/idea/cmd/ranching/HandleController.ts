/**
 * HandleController — `handle <animal>`, and ⭐⭐ **precision costs an
 * act** (D24).
 *
 * Two things happen, and the design is that they are the same act:
 *
 *  1. **You work the animal**, which raises its handling — earned by
 *     contact, lost by neglect, with a diminishing return so the first
 *     session is cheap and the twentieth is not.
 *  2. **You get a precise body-condition score**, because real body
 *     condition scoring *is* palpation of spine and ribs. By eye you get
 *     a band; with your hands you get a number.
 *
 * ⭐ That the two are one act is the whole point: the person who handles
 * their stock is the person who knows what condition they are in, and
 * neither is bought separately. Nobody has to be told to handle their
 * animals.
 *
 * ⚠ **And it is where the risk is** (D46). A flighty animal is dangerous
 * to work, which is why quiet stock handling exists in the real world.
 * The hazard wave reads `handlingRisk()`; this act is where it will
 * bite, and the refusal here already names it.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { RANCHING_TOPIC } from './DraftController';
import type Livestock from '../../../agent/Livestock';

/** The Discipline handling stock credits. */
export const STOCKMANSHIP = 'stockmanship';

interface HandleModel extends CommandModel {
  target?: MqlOneResult;
}

export default class HandleController extends CommandController<HandleModel> {
  async execute(model: HandleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff as Livestock | undefined;
    if (!target || typeof target.getHandling !== 'function') {
      this.decline(context, Mml.compose`That is not an animal you can work with.`, 'not-handleable');
      return;
    }

    const before = target.getHandling();
    const flesh = target.getReserve('flesh');
    const after = target.handle(1);

    // ⭐ The precise score — the thing you paid an act for. Everything
    // else about this animal is a band.
    const score = flesh
      ? `${Math.round(flesh.current.rawValue())} out of 100`
      : 'nothing you can feel through the coat';

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        before < 0.25
          ? Mml.compose`You get a hand on it, barely, and it is away again before you have finished. What you did feel: ${score}. ${target.handlingPhrase()}.`
          : Mml.compose`You run a hand down the spine and over the ribs and hips. ${score}. ${target.handlingPhrase()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} works quietly around one of the animals, hands on it.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: STOCKMANSHIP,
        // ⚠ Difficulty is the ANIMAL's, read at the moment of the act: a
        // wild one is a hard check and a quiet one is trivial, so the
        // estimator's own anti-grind property does the work.
        difficulty: before < 0.25 ? 'hard' : before < 0.6 ? 'standard' : 'trivial',
        outcome: 'success',
      });
    }
    void after;
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
